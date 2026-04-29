import {IpStore} from './store.js'

export type TorDetectorOptions = {
	refreshIntervalMs?: number
	onRefresh?: (count: number) => void
	onError?: (error: unknown) => void
}

export class TorDetector {
	private readonly options: TorDetectorOptions
	private readonly store = new IpStore()

	constructor(options: TorDetectorOptions = {}) {
		this.options = options
	}

	async start(): Promise<void> {
		// Placeholder to keep behavior non-empty until the real refresh loop is implemented.
		this.options.onRefresh?.(this.store.size())
	}

	destroy(): void {
		this.store.swap(new Set())
	}

	isTorNode(ip: string): boolean {
		return this.store.has(ip)
	}

	get nodeCount(): number {
		return this.store.size()
	}
}
