import process from 'node:process'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {fetchAllSources} from '@/fetcher'

afterEach(() => {
	vi.unstubAllGlobals()
	delete process.env.TORSHIELD_DEBUG
})

describe('fetchAllSources', () => {
	it('merges lines from successful sources', async () => {
		const fetchMock = vi.fn()
		fetchMock
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => 'a\nb',
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () =>
					'ExitAddress 2001:db8::1 2025-05-05 00:00:00\nExitAddress 1.1.1.1 2025-05-05 00:00:00',
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => 'c',
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => 'd\ne',
			})

		vi.stubGlobal('fetch', fetchMock)

		const lines = await fetchAllSources()
		expect(lines).toEqual(['a', 'b', '2001:db8::1', '1.1.1.1', 'c', 'd', 'e'])
		expect(fetchMock).toHaveBeenCalledTimes(4)
	})

	it('one source failure does not prevent others from returning', async () => {
		const fetchMock = vi.fn()
		fetchMock
			.mockResolvedValueOnce({
				ok: false,
				status: 500,
				text: async () => 'error',
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => 'ExitAddress 2001:db8::2 2025-05-05 00:00:00',
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => 'c',
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => 'd\ne',
			})

		vi.stubGlobal('fetch', fetchMock)

		await expect(fetchAllSources()).resolves.toEqual(['2001:db8::2', 'c', 'd', 'e'])
		expect(fetchMock).toHaveBeenCalledTimes(4)
	})

	it('all fail returns empty array (no propagated throw)', async () => {
		const fetchMock = vi.fn()
		fetchMock
			.mockRejectedValueOnce(new Error('boom 1'))
			.mockRejectedValueOnce(new Error('boom 2'))
			.mockRejectedValueOnce(new Error('boom 3'))
			.mockRejectedValueOnce(new Error('boom 4'))

		vi.stubGlobal('fetch', fetchMock)

		await expect(fetchAllSources()).resolves.toEqual([])
		expect(fetchMock).toHaveBeenCalledTimes(4)
	})

	it('timeout aborts the request', async () => {
		vi.useFakeTimers()

		const fetchMock = vi.fn(
			async (_url: string, init?: RequestInit) =>
				new Promise((_resolve, reject) => {
					init?.signal?.addEventListener(
						'abort',
						() => {
							reject(new Error('aborted'))
						},
						{once: true},
					)
				}),
		)

		vi.stubGlobal('fetch', fetchMock)

		const promise = fetchAllSources()
		vi.advanceTimersByTime(10_000)
		// Allow aborted fetch promises to settle (microtasks)
		await Promise.resolve()

		await expect(promise).resolves.toEqual([])
		expect(fetchMock).toHaveBeenCalledTimes(4)
		vi.useRealTimers()
	})

	it('logs source summary when debug env is enabled', async () => {
		const fetchMock = vi.fn()
		fetchMock
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => 'a\nb',
			})
			.mockResolvedValueOnce({
				ok: false,
				status: 500,
				text: async () => 'error',
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => 'c',
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => 'd',
			})
		vi.stubGlobal('fetch', fetchMock)
		process.env.TORSHIELD_DEBUG = 'true'

		await expect(fetchAllSources()).resolves.toEqual(['a', 'b', 'c', 'd'])
	})
})
