import type {TorDetectorOptions} from '@torshield/core'

export type TorFastifyOptions = {
	statusCode?: number
	message?: string
	onTorDetected?: (request: unknown, reply: unknown) => void | Promise<void>
} & TorDetectorOptions
