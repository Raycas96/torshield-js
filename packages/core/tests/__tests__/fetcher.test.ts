import {afterEach, describe, expect, it, vi} from 'vitest'
import {fetchAllSources} from '../../src/fetcher.js'

afterEach(() => {
	vi.unstubAllGlobals()
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
				text: async () => 'c',
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => 'd\ne',
			})

		vi.stubGlobal('fetch', fetchMock)

		const lines = await fetchAllSources()
		expect(lines).toEqual(['a', 'b', 'c', 'd', 'e'])
		expect(fetchMock).toHaveBeenCalledTimes(3)
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
				text: async () => 'c',
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => 'd\ne',
			})

		vi.stubGlobal('fetch', fetchMock)

		await expect(fetchAllSources()).resolves.toEqual(['c', 'd', 'e'])
		expect(fetchMock).toHaveBeenCalledTimes(3)
	})

	it('all fail returns empty array (no propagated throw)', async () => {
		const fetchMock = vi.fn()
		fetchMock
			.mockRejectedValueOnce(new Error('boom 1'))
			.mockRejectedValueOnce(new Error('boom 2'))
			.mockRejectedValueOnce(new Error('boom 3'))

		vi.stubGlobal('fetch', fetchMock)

		await expect(fetchAllSources()).resolves.toEqual([])
		expect(fetchMock).toHaveBeenCalledTimes(3)
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
		expect(fetchMock).toHaveBeenCalledTimes(3)
		vi.useRealTimers()
	})
})
