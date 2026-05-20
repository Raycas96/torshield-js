import process from 'node:process'
import Fastify from 'fastify'
import {torShieldFastifyPlugin} from '@raycas/torshield-fastify'

const port = Number.parseInt(process.env.PORT ?? '3002', 10)
// eslint-disable-next-line new-cap
const app = Fastify({trustProxy: true})

await app.register(torShieldFastifyPlugin, {
	statusCode: 403,
	message: 'Access denied: Tor exit node traffic is not allowed.',
})

app.get('/health', async () => ({ok: true, adapter: 'fastify'}))
app.get('/protected', async () => ({ok: true, route: 'protected', adapter: 'fastify'}))

await app.listen({port, host: '127.0.0.1'})
console.log(`[fastify-example] listening on http://localhost:${port}`)
