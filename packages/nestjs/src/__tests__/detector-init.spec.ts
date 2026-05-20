import {beforeEach, describe, expect, it, vi} from 'vitest'
import {destroyDetector, initializeDetector} from '../detector-init'

const detectorState = vi.hoisted(() => ({
	start: vi.fn<() => Promise<void>>(),
	destroy: vi.fn<() => void>(),
}))

vi.mock('@raycas/torshield-core', () => ({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	TorDetector: class {
		start = detectorState.start
		destroy = detectorState.destroy
	},
}))

describe('nestjs detector-init', () => {
	beforeEach(() => {
		destroyDetector()
		detectorState.start.mockReset()
		detectorState.destroy.mockReset()
		detectorState.start.mockResolvedValue(undefined)
	})

	it('initializes detector only once', () => {
		initializeDetector({})
		initializeDetector({})

		expect(detectorState.start).toHaveBeenCalledTimes(1)
	})

	it('throws when reinitialized with different options', () => {
		const onRefresh = vi.fn<(count: number) => void>()
		initializeDetector({onRefresh})

		expect(() =>
			initializeDetector({
				onRefresh: vi.fn<(count: number) => void>(),
			}),
		).toThrow('NestJS detector options can only be set during first initialization')
	})

	it('throws when reinitialized with different onTorDetected callback', () => {
		initializeDetector({
			onTorDetected: () => true,
		})

		expect(() =>
			initializeDetector({
				onTorDetected: () => true,
			}),
		).toThrow('NestJS detector options can only be set during first initialization')
	})
})
