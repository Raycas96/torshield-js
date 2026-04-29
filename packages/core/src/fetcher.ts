const sourceUrls = [
	'https://check.torproject.org/torbulkexitlist',
	'https://raw.githubusercontent.com/SecOps-Institute/Tor-IP-Addresses/master/tor-exit-nodes.lst',
	'https://www.dan.me.uk/torlist/?exit',
]

const isFulfilledResults = (
	result: PromiseSettledResult<string[]>,
): result is PromiseFulfilledResult<string[]> => result.status === 'fulfilled'

export const fetchAllSources = async (signal?: AbortSignal): Promise<string[]> => {
	const promises = []
	for (const url of sourceUrls) {
		promises.push(fetchSource(url, signal))
	}

	const results = await Promise.allSettled(promises)

	return results.filter(result => isFulfilledResults(result)).flatMap(r => r.value)
}

const fetchSource = async (url: string, signal?: AbortSignal): Promise<string[]> => {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => {
		controller.abort()
	}, 10_000)

	try {
		if (signal) {
			if (signal.aborted) {
				controller.abort()
			} else {
				signal.addEventListener(
					'abort',
					() => {
						controller.abort()
					},
					{once: true},
				)
			}
		}

		const response = await fetch(url, {signal: controller.signal})
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} from ${url}`)
		}

		const text = await response.text()
		return text.split('\n')
	} finally {
		clearTimeout(timeoutId)
	}
}
