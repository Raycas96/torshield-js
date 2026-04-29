import type {TorDetectorOptions} from '@torshield/core'

export type TorExitNodeMiddlewareOptions = {
	statusCode?: number
	message?: string
} & TorDetectorOptions
