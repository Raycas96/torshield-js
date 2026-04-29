import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { TorDetector, type TorDetectorOptions } from '@torshield/core'

export type TorFastifyOptions = {
  statusCode?: number
  message?: string
} & TorDetectorOptions

const torPlugin: FastifyPluginAsync<TorFastifyOptions> = async (_fastify, options) => {
  const detector = new TorDetector(options)
  void detector
}

export default fp(torPlugin, {
  name: '@torshield/fastify',
  fastify: '>=4.0.0',
})
