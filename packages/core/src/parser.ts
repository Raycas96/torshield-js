import {isIP} from 'node:net'

export function normalizeIp(ip: string): string {
	const trimmedIp = ip.trim()
	return trimmedIp.startsWith('::ffff:') ? trimmedIp.slice('::ffff:'.length) : trimmedIp
}

export function parseLines(lines: string[]): Set<string> {
	const ips = new Set<string>()

	for (const line of lines) {
		const normalized = normalizeIp(line)

		// Skip blank/whitespace-only lines and source comments.
		if (!normalized || normalized.startsWith('#')) {
			continue
		}

		const version = isIP(normalized)
		if (version === 4 || version === 6) {
			ips.add(normalized)
		}
	}

	return ips
}
