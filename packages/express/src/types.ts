import type {TorDetectorOptions} from '@raycas/torshield-core'
import type {NextFunction, Request, Response} from 'express'

export type TorExitNodeMiddlewareOptions = {
	statusCode?: number
	message?: string
	onTorDetected?: (request: Request, response: Response, next: NextFunction) => void | Promise<void>
} & TorDetectorOptions
