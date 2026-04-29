export type TorDetectorOptions = {
	refreshIntervalMs?: number
	onRefresh?: (count: number) => void
	onError?: (error: unknown) => void
}

// Placeholder implementation so the package can compile.
// Real implementation will follow the contracts in AGENTS.md.
export class TorDetector {
	private readonly options: TorDetectorOptions
	private readonly store = new Set<string>()

	constructor(options: TorDetectorOptions = {}) {
		this.options = options
	}

	async start(): Promise<void> {
		// Placeholder to keep behavior non-empty until the real refresh loop is implemented.
		this.options.onRefresh?.(this.store.size)
	}

	destroy(): void {
		// Placeholder no-op cleanup.
		this.store.clear()
	}

	isTor(_ip: string): boolean {
		return false
	}

	get nodeCount(): number {
		return this.store.size
	}
}
