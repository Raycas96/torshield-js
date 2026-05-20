import {isIP} from 'node:net'

const decimalTailIpv4Regex = /^\d{1,3}$/v

/**
 Tor dual-stack exits can appear as IPv6 with the IPv4 octets in the last four
 colon-separated groups using decimal notation (e.g. 2001:67c:e60:c0c:192:42:116:108).
 */
export function extractDecimalTailIpv4(ip: string): string | undefined {
	if (isIP(ip) !== 6) {
		return undefined
	}

	const parts = ip.split(':')
	if (parts.length < 4) {
		return undefined
	}

	const tail = parts.slice(-4)
	const octets = []

	for (const part of tail) {
		if (!decimalTailIpv4Regex.test(part)) {
			return undefined
		}

		const value = Number(part)
		if (value > 255) {
			return undefined
		}

		octets.push(String(value))
	}

	return octets.join('.')
}

export function normalizeIp(ip: string): string {
	const trimmedIp = ip.trim()
	const normalized = trimmedIp.startsWith('::ffff:') ? trimmedIp.slice('::ffff:'.length) : trimmedIp
	return normalized.toLowerCase()
}

export function parseLines(lines: string[]): Set<string> {
	const ips = new Set<string>()

	for (const line of lines) {
		const normalized = normalizeIp(line)

		// Skip blank/whitespace-only lines and source comments.
		if (normalized === '' || normalized.startsWith('#')) {
			continue
		}

		const version = isIP(normalized)
		if (version === 4 || version === 6) {
			ips.add(normalized)
		}
	}

	return ips
}
