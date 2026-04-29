import {fetchAllSources} from './fetcher'
import {normalizeIp, parseLines} from './parser'
import {IpStore} from './store'

export type TorDetectorOptions = {
	onRefresh?: (count: number) => void
	onError?: (error: unknown) => void
	verbose?: boolean
}

/**
 * The TorDetector class is used to detect if a given IP address is a Tor exit node.
 * It fetches the IP list from the sources and parses it to a set of IP addresses.
 * It then checks if the given IP address is in the set.
 * It also refreshes the IP list every 24 hours.
 * It also logs the number of Tor exit nodes found.
 * It also logs the error if the refresh fails.
 */
export class TorDetector {
	private readonly options: TorDetectorOptions
	private readonly store = new IpStore()
	private intervalId?: NodeJS.Timeout
	private readonly refreshIntervalMs: number = 3_600_000 * 24

	constructor(options: TorDetectorOptions = {}) {
		this.options = options
	}

	async start(): Promise<void> {
		await this.refresh()
		this.intervalId = setInterval(() => {
			void this.refresh()
		}, this.refreshIntervalMs)

		this.intervalId.unref()
	}

	destroy(): void {
		this.store.swap(new Set())
		clearInterval(this.intervalId)
		this.intervalId = undefined
	}

	async refresh(): Promise<void> {
		try {
			await this.fetchTorExitNodes()
			if (this.options.onRefresh) {
				this.options.onRefresh(this.torExitNodesCount)
			}
		} catch (error) {
			console.error('[TorDetector] Error refreshing Tor exit nodes:', error)
			if (this.options.onError) {
				this.options.onError(error)
			}
		}
	}

	isTorNode(ip: string): boolean {
		return this.store.has(normalizeIp(ip))
	}

	get torExitNodesCount(): number {
		return this.store.size()
	}

	private async fetchTorExitNodes(): Promise<void> {
		const ips = await fetchAllSources()
		const parsedIps = parseLines(ips)
		this.store.swap(new Set(parsedIps))
	}
}
