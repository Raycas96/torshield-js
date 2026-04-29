import {isIP} from 'node:net'

export function parseLines(lines: string[]): Set<string> {
	const ips = new Set<string>()

	for (const line of lines) {
		const trimmed = line.trim()

		// Skip blank/whitespace-only lines and source comments.
		if (!trimmed || trimmed.startsWith('#')) {
			continue
		}

		const version = isIP(trimmed)
		if (version === 4 || version === 6) {
			ips.add(trimmed)
		}
	}

	return ips
}
