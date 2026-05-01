import fastifyPlugin from 'fastify-plugin'
import type {FastifyPluginAsync} from 'fastify'
import {defaultErrorMessage} from './constants'
import {initializeDetector, releaseDetector} from './detector-init'
import type {TorFastifyOptions} from './types'

const torPlugin: FastifyPluginAsync<TorFastifyOptions> = async (fastify, options) => {
	const detectorContext = initializeDetector(options)
	const {statusCode, message} = options
	await detectorContext.startPromise

	fastify.addHook('onRequest', async (request, reply) => {
		if (!detectorContext.detector.isTorNode(request.ip)) {
			return
		}

		if (hasOnTorDetected(options)) {
			await invokeOnTorDetected(options.onTorDetected, request, reply)
			return
		}

		await reply.code(statusCode ?? 403).send({
			error: message ?? defaultErrorMessage,
		})
	})

	fastify.decorate('torDetector', detectorContext.detector)
	fastify.addHook('onClose', () => {
		releaseDetector()
	})
}

function hasOnTorDetected(
	options: TorFastifyOptions,
): options is TorFastifyOptions & {onTorDetected: NonNullable<TorFastifyOptions['onTorDetected']>} {
	return typeof options.onTorDetected === 'function'
}

async function invokeOnTorDetected(
	onTorDetected: NonNullable<TorFastifyOptions['onTorDetected']>,
	request: unknown,
	reply: unknown,
): Promise<void> {
	await onTorDetected(request, reply)
}

export default fastifyPlugin(torPlugin, {
	name: '@raycas/torshield-fastify',
	fastify: '>=4.0.0',
})
