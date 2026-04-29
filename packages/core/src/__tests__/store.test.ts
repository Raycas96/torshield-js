import {describe, expect, it} from 'vitest'
import {IpStore} from '@/store'

describe('IpStore', () => {
	it('swap() updates reference atomically', () => {
		const store = new IpStore()
		const setA = new Set(['1.2.3.4'])
		const setB = new Set<string>()

		store.swap(setA)
		expect(store.size()).toBe(1)
		expect(store.has('1.2.3.4')).toBe(true)

		store.swap(setB)
		expect(store.size()).toBe(0)
		expect(store.has('1.2.3.4')).toBe(false)
	})

	it('has() reflects swapped set', () => {
		const store = new IpStore()
		store.swap(new Set(['5.6.7.8']))

		expect(store.has('5.6.7.8')).toBe(true)
		expect(store.has('1.2.3.4')).toBe(false)
	})

	it('size() returns current entry count', () => {
		const store = new IpStore()
		expect(store.size()).toBe(0)
		store.swap(new Set(['9.9.9.9', '10.0.0.1']))
		expect(store.size()).toBe(2)
	})
})
