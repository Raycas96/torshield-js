import type {NextFunction, Request, Response} from 'express'
import {getDetector} from './detector-init'
import {defaultErrorMessage} from './constants'

export function blockTorExitNodesMiddleware() {
	const detectorContext = getDetector()
	const statusCode = detectorContext.detectorOptions.statusCode ?? 403
	const message = detectorContext.detectorOptions.message ?? defaultErrorMessage

	return (request: Request, response: Response, next: NextFunction) => {
		const clientIp = getClientIp(request)
		if (!clientIp || !detectorContext.detector.isTorNode(clientIp)) {
			next()
			return
		}

		response.status(statusCode).json({error: message})
	}
}

export const executeCustomActionOnTorNodeDetection = (
	request: Request,
	next: NextFunction,
	action: () => void,
) => {
	const detectorContext = getDetector()
	const clientIp = getClientIp(request)
	if (!clientIp || !detectorContext.detector.isTorNode(clientIp)) {
		next()
	} else {
		action()
	}
}

function getClientIp(request: Request): string {
	const forwardedFor = request.headers['x-forwarded-for']

	if (typeof forwardedFor === 'string') {
		return getLeftMostIp(forwardedFor)
	}

	if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
		return getLeftMostIp(forwardedFor[0] ?? '')
	}

	return request.socket.remoteAddress?.trim() ?? ''
}

function getLeftMostIp(headerValue: string): string {
	const leftMostValue = headerValue.split(',')[0] ?? ''
	return leftMostValue.trim()
}
