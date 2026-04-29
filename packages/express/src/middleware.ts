import type {NextFunction, Request, Response} from 'express'
import {getDetector} from './detector-init'
import {defaultErrorMessage} from './constants'
import type {TorExitNodeMiddlewareOptions} from './types'

export function blockTorExitNodesMiddleware() {
	const detectorContext = getDetector()
	const {
		statusCode = 403,
		message = defaultErrorMessage,
		onTorDetected,
	}: TorExitNodeMiddlewareOptions = detectorContext.detectorOptions

	return async (request: Request, response: Response, next: NextFunction) => {
		if (!isTorRequest(request)) {
			next()
			return
		}

		if (typeof onTorDetected === 'function') {
			await invokeOnTorDetected(onTorDetected, request, response, next)
			return
		}

		response.status(statusCode).json({error: message})
	}
}

async function invokeOnTorDetected(
	onTorDetected: NonNullable<TorExitNodeMiddlewareOptions['onTorDetected']>,
	request: Request,
	response: Response,
	next: NextFunction,
): Promise<void> {
	await onTorDetected(request, response, next)
}

export const executeCustomActionOnTorNodeDetection = (
	request: Request,
	next: NextFunction,
	action: () => void,
) => {
	if (isTorRequest(request)) {
		action()
		return
	}

	next()
}

const isTorRequest = (request: Request): boolean => {
	const detectorContext = getDetector()
	const clientIp = getClientIp(request)
	return Boolean(clientIp && detectorContext.detector.isTorNode(clientIp))
}

const getClientIp = (request: Request): string => {
	const forwardedFor = request.headers['x-forwarded-for']

	if (typeof forwardedFor === 'string') {
		return getLeftMostIp(forwardedFor)
	}

	if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
		return getLeftMostIp(forwardedFor[0] ?? '')
	}

	return request.socket.remoteAddress?.trim() ?? ''
}

const getLeftMostIp = (headerValue: string): string => {
	const leftMostValue = headerValue.split(',')[0] ?? ''
	return leftMostValue.trim()
}
