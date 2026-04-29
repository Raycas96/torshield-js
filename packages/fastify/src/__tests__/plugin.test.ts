import createFastify from 'fastify'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import torPlugin from '../index'
import {destroyDetector} from '../detector-init'

const detectorState = vi.hoisted(() => ({
	start: vi.fn<() => Promise<void>>(),
	isTorNode: vi.fn<(ip: string) => boolean>(),
	destroy: vi.fn<() => void>(),
}))

vi.mock('@torshield/core', () => ({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	TorDetector: class {
		start = detectorState.start
		isTorNode = detectorState.isTorNode
		destroy = detectorState.destroy
	},
}))

describe('@torshield/fastify plugin', () => {
	beforeEach(() => {
		destroyDetector()
		detectorState.start.mockReset()
		detectorState.isTorNode.mockReset()
		detectorState.destroy.mockReset()
		detectorState.start.mockResolvedValue(undefined)
		detectorState.isTorNode.mockReturnValue(false)
	})

	afterEach(() => {
		destroyDetector()
		vi.restoreAllMocks()
	})

	it('blocks Tor IP with default response', async () => {
		detectorState.isTorNode.mockReturnValue(true)
		const app = await buildServer()

		const response = await app.inject({
			method: 'GET',
			url: '/resource',
			remoteAddress: '1.2.3.4',
		})

		expect(response.statusCode).toBe(403)
		expect(response.json()).toEqual({error: 'Access denied: Tor exit node traffic is not allowed.'})
	})

	it('allows clean IP to reach route handler', async () => {
		detectorState.isTorNode.mockReturnValue(false)
		const app = await buildServer()

		const response = await app.inject({
			method: 'GET',
			url: '/resource',
			remoteAddress: '5.6.7.8',
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual({ok: true})
	})

	it('honors custom status code and message', async () => {
		detectorState.isTorNode.mockReturnValue(true)
		const app = await buildServer({
			statusCode: 451,
			message: 'Blocked by policy',
		})

		const response = await app.inject({
			method: 'GET',
			url: '/resource',
			remoteAddress: '1.2.3.4',
		})

		expect(response.statusCode).toBe(451)
		expect(response.json()).toEqual({error: 'Blocked by policy'})
	})

	it('executes custom action when Tor IP is detected', async () => {
		detectorState.isTorNode.mockReturnValue(true)
		const onTorDetected = vi.fn(
			async (
				request: {ip: string},
				reply: {code: (status: number) => {send: (payload: Record<string, unknown>) => void}},
			) => {
				reply.code(429).send({error: `custom-${request.ip}`})
			},
		)
		const app = await buildServer({onTorDetected})

		const response = await app.inject({
			method: 'GET',
			url: '/resource',
			remoteAddress: '1.2.3.4',
		})

		expect(onTorDetected).toHaveBeenCalledTimes(1)
		expect(response.statusCode).toBe(429)
		expect(response.json()).toEqual({error: 'custom-1.2.3.4'})
	})

	it('waits for detector.start() before ready resolves', async () => {
		let resolveStart: (() => void) | undefined
		const startDeferred = new Promise<void>(resolve => {
			resolveStart = resolve
		})
		detectorState.start.mockReturnValue(startDeferred)

		const app = createFastify()
		void app.register(torPlugin)
		app.get('/resource', async () => ({ok: true}))

		let readyResolved = false
		const readyPromise = app.ready().then(() => {
			readyResolved = true
		})

		await Promise.resolve()
		expect(readyResolved).toBe(false)

		resolveStart?.()
		await readyPromise
		await app.close()
	})

	it('initializes detector once across multiple fastify instances', async () => {
		const appA = createFastify()
		await appA.register(torPlugin)
		appA.get('/resource', async () => ({ok: true}))
		await appA.ready()

		const appB = createFastify()
		await appB.register(torPlugin)
		appB.get('/resource', async () => ({ok: true}))
		await appB.ready()

		expect(detectorState.start).toHaveBeenCalledTimes(1)
		await appB.close()
		await appA.close()
	})

	it('throws when reinitialized with different lifecycle options', async () => {
		const appA = createFastify()
		await appA.register(torPlugin, {
			statusCode: 403,
			message: 'default',
		})
		appA.get('/resource', async () => ({ok: true}))
		await appA.ready()

		const appB = createFastify()
		void appB.register(torPlugin, {
			statusCode: 451,
			message: 'changed',
		})
		appB.get('/resource', async () => ({ok: true}))

		await expect(appB.ready()).rejects.toThrow(
			'Fastify detector options can only be set during first initialization',
		)
		await appA.close()
	})

	it('decorates fastify instance with torDetector', async () => {
		const app = await buildServer()

		expect(Reflect.get(app, 'torDetector')).toBeDefined()
		await app.close()
	})

	it('destroys detector on close', async () => {
		const app = await buildServer()

		await app.close()
		expect(detectorState.destroy).toHaveBeenCalledTimes(1)
	})
})

async function buildServer(options: Record<string, unknown> = {}) {
	const app = createFastify()
	await app.register(torPlugin, options)
	app.get('/resource', async () => ({ok: true}))
	await app.ready()
	return app
}
