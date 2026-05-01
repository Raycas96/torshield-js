import {ForbiddenException, type CanActivate, type ExecutionContext} from '@nestjs/common'
import type {TorDetector} from '@raycas/torshield-core'
import type {TorNestjsOptions} from './types'

const defaultErrorMessage = 'Access denied: Tor exit node traffic is not allowed.'

type RequestLike = {
	headers: {
		'x-forwarded-for'?: string | string[]
	}
	socket: {
		remoteAddress?: string
	}
}

export class TorGuard implements CanActivate {
	private readonly detector: TorDetector
	private readonly onTorDetected?: TorNestjsOptions['onTorDetected']

	constructor(detector: TorDetector, onTorDetected?: TorNestjsOptions['onTorDetected']) {
		this.detector = detector
		this.onTorDetected = onTorDetected
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<RequestLike>()
		const clientIp = getClientIp(request)
		if (!clientIp || !this.detector.isTorNode(clientIp)) {
			return true
		}

		if (typeof this.onTorDetected === 'function') {
			return this.onTorDetected(context)
		}

		throw new ForbiddenException(defaultErrorMessage)
	}
}

function getClientIp(request: RequestLike): string {
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
