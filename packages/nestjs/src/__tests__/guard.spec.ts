import {ForbiddenException, type ExecutionContext} from '@nestjs/common'
import {Test, type TestingModule} from '@nestjs/testing'
import {TorDetector} from '@raycas/torshield-core'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {TorGuard} from '../tor.guard'
import {torDetectorToken} from '../tokens'

describe('TorGuard', () => {
	let moduleRef: TestingModule
	let guard: TorGuard
	const detector = new TorDetector()
	const isTorNodeMock = vi.spyOn(detector, 'isTorNode')

	beforeEach(async () => {
		isTorNodeMock.mockReset()
		isTorNodeMock.mockReturnValue(false)

		moduleRef = await Test.createTestingModule({
			providers: [
				{
					provide: torDetectorToken,
					useValue: detector,
				},
				{
					provide: TorGuard,
					useFactory(injectedDetector: TorDetector) {
						return new TorGuard(injectedDetector)
					},
					inject: [torDetectorToken],
				},
			],
		}).compile()

		guard = moduleRef.get(TorGuard)
	})

	it('throws ForbiddenException when isTorNode returns true', async () => {
		isTorNodeMock.mockReturnValue(true)
		const context = createContext({
			headers: {'x-forwarded-for': '1.2.3.4'},
			socket: {remoteAddress: '9.9.9.9'},
		})

		await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
		expect(isTorNodeMock).toHaveBeenCalledWith('1.2.3.4')
	})

	it('allows request when isTorNode returns false', async () => {
		isTorNodeMock.mockReturnValue(false)
		const context = createContext({
			headers: {'x-forwarded-for': '5.6.7.8'},
			socket: {remoteAddress: '9.9.9.9'},
		})

		await expect(guard.canActivate(context)).resolves.toBe(true)
		expect(isTorNodeMock).toHaveBeenCalledWith('5.6.7.8')
	})

	it('uses leftmost x-forwarded-for value before fallback address', async () => {
		isTorNodeMock.mockReturnValue(false)
		const context = createContext({
			headers: {'x-forwarded-for': '1.2.3.4, 8.8.8.8'},
			socket: {remoteAddress: '9.9.9.9'},
		})

		await expect(guard.canActivate(context)).resolves.toBe(true)
		expect(isTorNodeMock).toHaveBeenCalledWith('1.2.3.4')
	})

	it('supports custom override for tor detections', async () => {
		const onTorDetected = vi.fn<(context: ExecutionContext) => boolean>().mockReturnValue(true)
		const guardWithOverride = new TorGuard(detector, onTorDetected)
		isTorNodeMock.mockReturnValue(true)
		const context = createContext({
			headers: {'x-forwarded-for': '1.2.3.4'},
			socket: {remoteAddress: '9.9.9.9'},
		})

		await expect(guardWithOverride.canActivate(context)).resolves.toBe(true)
		expect(onTorDetected).toHaveBeenCalledTimes(1)
		expect(onTorDetected).toHaveBeenCalledWith(context)
	})
})

function createContext(request: {
	headers: {'x-forwarded-for'?: string | string[]}
	socket: {remoteAddress?: string}
}): ExecutionContext {
	// NestJS ExecutionContext is broad; tests only require switchToHttp().getRequest().
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion
	return {
		switchToHttp: () => ({
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
			getRequest: <T>() => request as unknown as T,
		}),
	} as ExecutionContext
}
