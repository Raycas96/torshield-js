export class IpStore {
	private set: Set<string> = new Set<string>()

	swap(newSet: Set<string>): void {
		this.set = newSet
	}

	has(ip: string): boolean {
		return this.set.has(ip)
	}

	size(): number {
		return this.set.size
	}
}
