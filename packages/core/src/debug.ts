import process from 'node:process'

export const isDebugEnabled = (): boolean => {
	const raw = process.env.TORSHIELD_DEBUG?.trim().toLowerCase()
	return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}
