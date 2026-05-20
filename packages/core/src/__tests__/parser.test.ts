import {describe, expect, it} from 'vitest'
import {extractDecimalTailIpv4, normalizeIp, parseLines} from '@/parser'

describe('parseLines', () => {
	it('skips # comment lines', () => {
		const lines = ['# 1.2.3.4', '1.2.3.4']
		const result = parseLines(lines)
		expect(result.has('1.2.3.4')).toBe(true)
		expect(result.size).toBe(1)
	})

	it('skips blank / whitespace-only lines', () => {
		const lines = [' ', '', '\t', '5.6.7.8']
		const result = parseLines(lines)
		expect([...result]).toEqual(['5.6.7.8'])
	})

	it('trims whitespace before validation', () => {
		const lines = ['  9.9.9.9  ', '\n\t10.0.0.1\t']
		const result = parseLines(lines)
		expect(result.has('9.9.9.9')).toBe(true)
		expect(result.has('10.0.0.1')).toBe(true)
	})

	it('deduplicates across input lines', () => {
		const lines = ['11.0.0.1', '11.0.0.1', '11.0.0.1']
		const result = parseLines(lines)
		expect(result.size).toBe(1)
		expect(result.has('11.0.0.1')).toBe(true)
	})

	it('does not throw on invalid lines', () => {
		const lines = ['not-an-ip', 'example.com', '999.999.999.999', ':::::']
		expect(() => parseLines(lines)).not.toThrow()
		const result = parseLines(lines)
		expect(result.size).toBe(0)
	})

	it('parses valid IPv4 and IPv6 candidates', () => {
		const lines = ['1.2.3.4', '::ffff', 'abcd::1234']
		const result = parseLines(lines)
		expect(result.has('1.2.3.4')).toBe(true)
		expect(result.has('abcd::1234')).toBe(true)
	})

	it('parses a realistic multi-line exit list', () => {
		const lines = [
			'# Tor exit nodes (excerpt)',
			' 1.2.3.4',
			'5.6.7.8 ',
			'',
			'::ffff:1.2.3.4',
			'5.6.7.8',
			'not-an-ip',
		]
		const result = parseLines(lines)
		expect(result.has('1.2.3.4')).toBe(true)
		expect(result.has('5.6.7.8')).toBe(true)
		expect(result.has('::ffff:1.2.3.4')).toBe(false)
		expect(result.size).toBe(2)
	})

	it('handles lines with trailing CR (Windows CRLF)', () => {
		const lines = [' 9.9.9.9\r', '::ffff:8.8.8.8\r']
		const result = parseLines(lines)
		expect(result.has('9.9.9.9')).toBe(true)
		expect(result.has('8.8.8.8')).toBe(true)
		expect(result.has('::ffff:8.8.8.8')).toBe(false)
		expect(result.size).toBe(2)
	})

	it('normalizeIp trims and strips ::ffff: prefix', () => {
		expect(normalizeIp(' 1.2.3.4 ')).toBe('1.2.3.4')
		expect(normalizeIp('::ffff:1.2.3.4')).toBe('1.2.3.4')
		expect(normalizeIp('  ::ffff:8.8.8.8\t')).toBe('8.8.8.8')
	})

	it('normalizeIp canonicalizes IPv6 case for stable lookups', () => {
		expect(normalizeIp('2A03:4000:28:1E8::69')).toBe('2a03:4000:28:1e8::69')
		expect(normalizeIp('  2a03:4000:28:1E8::69\t')).toBe('2a03:4000:28:1e8::69')
	})

	it('extractDecimalTailIpv4 reads Tor dual-stack decimal tail notation', () => {
		expect(extractDecimalTailIpv4('2001:67c:e60:c0c:192:42:116:108')).toBe('192.42.116.108')
	})

	it('extractDecimalTailIpv4 ignores native IPv6 without decimal tail', () => {
		expect(extractDecimalTailIpv4('2a03:4000:28:1e8::69')).toBeUndefined()
		expect(extractDecimalTailIpv4('2a0d:bbc7::f816:3eff:fe18:f410')).toBeUndefined()
	})
})
