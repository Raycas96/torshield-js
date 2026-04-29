import express from 'express'
import request from 'supertest'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {blockTorExitNodesMiddleware} from '../index'
import {destroyDetector, initializeDetector} from '../detector-init'

const detectorState = vi.hoisted(() => ({
	start: vi.fn<() => Promise<void>>(),
	isTorNode: vi.fn<(ip: string) => boolean>(),
}))

vi.mock('@torshield/core', () => ({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	TorDetector: class {
		start = detectorState.start
		isTorNode = detectorState.isTorNode
	},
}))

describe('blockTorExitNodesMiddleware', () => {
	beforeEach(() => {
		destroyDetector()
		detectorState.start.mockReset()
		detectorState.isTorNode.mockReset()
		detectorState.start.mockResolvedValue(undefined)
		detectorState.isTorNode.mockReturnValue(false)
	})

	afterEach(() => {
		destroyDetector()
		vi.restoreAllMocks()
	})

	it('calls detector.start() non-blocking on creation', () => {
		initializeDetector({})
		expect(detectorState.start).toHaveBeenCalledTimes(1)
	})

	it('reuses the same detector across multiple initializations', () => {
		initializeDetector({})
		initializeDetector({})
		expect(detectorState.start).toHaveBeenCalledTimes(1)
	})

	it('throws when middleware is used before detector initialization', () => {
		expect(() => blockTorExitNodesMiddleware()).toThrow('Detector not initialized')
	})

	it('Tor IP returns expected JSON error and status', async () => {
		detectorState.isTorNode.mockReturnValue(true)
		const serverInstance = buildExpressServer()

		const response = await request(serverInstance)
			.get('/resource')
			.set('x-forwarded-for', '1.2.3.4')

		expect(response.status).toBe(403)
		expect(response.body).toEqual({error: 'Access denied: Tor exit node traffic is not allowed.'})
	})

	it('clean IP passes to downstream route', async () => {
		detectorState.isTorNode.mockReturnValue(false)
		const serverInstance = buildExpressServer()

		const response = await request(serverInstance)
			.get('/resource')
			.set('x-forwarded-for', '5.6.7.8')

		expect(response.status).toBe(200)
		expect(response.body).toEqual({ok: true})
	})

	it('custom status and message are reflected', async () => {
		detectorState.isTorNode.mockReturnValue(true)
		const serverInstance = buildExpressServer({
			statusCode: 451,
			message: 'Blocked by policy',
		})

		const response = await request(serverInstance)
			.get('/resource')
			.set('x-forwarded-for', '1.2.3.4')

		expect(response.status).toBe(451)
		expect(response.body).toEqual({error: 'Blocked by policy'})
	})

	it('executes custom action override when Tor IP is detected', async () => {
		detectorState.isTorNode.mockReturnValue(true)
		const onTorDetected = vi.fn(
			(
				_request: unknown,
				response: {status: (code: number) => {json: (payload: Record<string, unknown>) => void}},
			) => {
				response.status(429).json({error: 'custom-handler'})
			},
		)
		const serverInstance = buildExpressServer({onTorDetected})

		const response = await request(serverInstance)
			.get('/resource')
			.set('x-forwarded-for', '1.2.3.4')

		expect(onTorDetected).toHaveBeenCalledTimes(1)
		expect(response.status).toBe(429)
		expect(response.body).toEqual({error: 'custom-handler'})
	})

	it('uses leftmost value from x-forwarded-for', async () => {
		detectorState.isTorNode.mockImplementation((ip: string) => ip === '1.2.3.4')
		const serverInstance = buildExpressServer()

		const response = await request(serverInstance)
			.get('/resource')
			.set('x-forwarded-for', '1.2.3.4, 9.9.9.9')

		expect(response.status).toBe(403)
		expect(detectorState.isTorNode).toHaveBeenCalledWith('1.2.3.4')
	})
})

function buildExpressServer(initOptions = {}) {
	const serverInstance = express()
	initializeDetector(initOptions)
	serverInstance.use(blockTorExitNodesMiddleware())
	serverInstance.get('/resource', (_request, response) => {
		response.json({ok: true})
	})
	return serverInstance
}
