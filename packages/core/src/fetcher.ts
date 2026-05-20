import {isDebugEnabled} from './debug'

type SourceDefinition = {
	url: string
	transform?: (rawLines: string[]) => string[]
}

type FetchAllSourcesOptions = {
	signal?: AbortSignal
}

const extractTorExitAddressLines = (rawLines: string[]): string[] =>
	rawLines
		.map(line => line.trim())
		.filter(line => line.startsWith('ExitAddress '))
		.map(line => {
			const [, ip = ''] = line.trim().split(' ').filter(Boolean)
			return ip
		})
		.filter(Boolean)

const sources: SourceDefinition[] = [
	{url: 'https://check.torproject.org/torbulkexitlist'},
	{
		url: 'https://check.torproject.org/exit-addresses',
		transform: extractTorExitAddressLines,
	},
	{
		url: 'https://raw.githubusercontent.com/SecOps-Institute/Tor-IP-Addresses/master/tor-exit-nodes.lst',
	},
	{url: 'https://www.dan.me.uk/torlist/?exit'},
]

const isFulfilledResults = (
	result: PromiseSettledResult<string[]>,
): result is PromiseFulfilledResult<string[]> => result.status === 'fulfilled'

export const fetchAllSources = async (options: FetchAllSourcesOptions = {}): Promise<string[]> => {
	const promises = []
	for (const source of sources) {
		promises.push(fetchSource(source, options.signal))
	}

	const results = await Promise.allSettled(promises)
	const successfulResults = results.filter(result => isFulfilledResults(result))
	const failedResults = results.length - successfulResults.length
	const mergedLines = successfulResults.flatMap(r => r.value)

	if (isDebugEnabled()) {
		console.info(
			`[TorDetector][debug] fetchAllSources: ${successfulResults.length}/${results.length} sources succeeded, ${failedResults} failed, ${mergedLines.length} raw lines extracted`,
		)
	}

	return mergedLines
}

const fetchSource = async (source: SourceDefinition, signal?: AbortSignal): Promise<string[]> => {
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

		const response = await fetch(source.url, {signal: controller.signal})
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} from ${source.url}`)
		}

		const text = await response.text()
		const lines = text.split('\n')
		return source.transform ? source.transform(lines) : lines
	} finally {
		clearTimeout(timeoutId)
	}
}
