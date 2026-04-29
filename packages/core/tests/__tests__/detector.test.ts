import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {TorDetector} from '../../src/detector.js'

const {fetchAllSourcesMock} = vi.hoisted(() => ({
	fetchAllSourcesMock: vi.fn<(signal?: AbortSignal) => Promise<string[]>>(),
}))

vi.mock('../../src/fetcher.js', () => ({
	fetchAllSources: fetchAllSourcesMock,
}))

describe('TorDetector', () => {
	beforeEach(() => {
		fetchAllSourcesMock.mockReset()
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	it('mocks fetchAllSources and start() resolves after first refresh completes', async () => {
		fetchAllSourcesMock.mockResolvedValue(['1.2.3.4', '5.6.7.8'])
		const detector = new TorDetector()

		await expect(detector.start()).resolves.toBeUndefined()

		expect(fetchAllSourcesMock).toHaveBeenCalledTimes(1)
		expect(detector.torExitNodesCount).toBe(2)
	})

	it('start() still resolves when the initial refresh fails', async () => {
		const error = new Error('network down')
		const onError = vi.fn<(error: unknown) => void>()
		fetchAllSourcesMock.mockRejectedValue(error)
		const detector = new TorDetector({onError})

		await expect(detector.start()).resolves.toBeUndefined()

		expect(onError).toHaveBeenCalledWith(error)
		expect(detector.torExitNodesCount).toBe(0)
	})

	it('destroy() stops future refreshes', async () => {
		fetchAllSourcesMock.mockResolvedValue(['1.2.3.4'])
		const detector = new TorDetector()

		await detector.start()
		detector.destroy()
		await vi.advanceTimersByTimeAsync(24 * 3_600_000)

		expect(fetchAllSourcesMock).toHaveBeenCalledTimes(1)
		expect(detector.torExitNodesCount).toBe(0)
	})

	it('isTorNode("1.2.3.4") returns true when present', async () => {
		fetchAllSourcesMock.mockResolvedValue(['1.2.3.4'])
		const detector = new TorDetector()

		await detector.start()

		expect(detector.isTorNode('1.2.3.4')).toBe(true)
		expect(detector.isTorNode('5.6.7.8')).toBe(false)
	})

	it('normalizes ::ffff: prefix and whitespace before lookup', async () => {
		fetchAllSourcesMock.mockResolvedValue(['1.2.3.4'])
		const detector = new TorDetector()

		await detector.start()

		expect(detector.isTorNode('::ffff:1.2.3.4')).toBe(true)
		expect(detector.isTorNode(' 1.2.3.4 ')).toBe(true)
		expect(detector.isTorNode('')).toBe(false)
	})

	it('torExitNodesCount reflects successful refresh output', async () => {
		fetchAllSourcesMock.mockResolvedValue(['1.2.3.4', '1.2.3.4', '::ffff:8.8.8.8'])
		const detector = new TorDetector()

		await detector.start()

		expect(detector.torExitNodesCount).toBe(2)
	})

	it('calls onRefresh after successful refresh and on interval refreshes', async () => {
		const onRefresh = vi.fn<(count: number) => void>()
		fetchAllSourcesMock.mockResolvedValue(['1.2.3.4'])
		const detector = new TorDetector({onRefresh})

		await detector.start()
		expect(onRefresh).toHaveBeenCalledWith(1)

		await vi.advanceTimersByTimeAsync(24 * 3_600_000)
		expect(fetchAllSourcesMock).toHaveBeenCalledTimes(2)
		expect(onRefresh).toHaveBeenCalledTimes(2)
	})

	it('calls onError when a later refresh throws', async () => {
		const onError = vi.fn<(error: unknown) => void>()
		const refreshError = new Error('refresh failed')
		fetchAllSourcesMock.mockResolvedValueOnce(['1.2.3.4']).mockRejectedValueOnce(refreshError)
		const detector = new TorDetector({onError})

		await detector.start()
		await vi.advanceTimersByTimeAsync(24 * 3_600_000)

		expect(onError).toHaveBeenCalledWith(refreshError)
		expect(detector.torExitNodesCount).toBe(1)
	})
})
