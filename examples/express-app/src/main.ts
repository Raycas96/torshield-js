import process from 'node:process'
import express from 'express'
import {blockTorExitNodesMiddleware, initializeDetector} from '@raycas/torshield-express'
import loggatron from 'loggatron'

const debugEnv = process.env.TORSHIELD_DEBUG?.trim().toLowerCase()
const isDebugEnabled =
	debugEnv === '1' || debugEnv === 'true' || debugEnv === 'yes' || debugEnv === 'on'

if (isDebugEnabled) {
	loggatron.init()
	console.info('[express-example] Debug logging enabled via TORSHIELD_DEBUG')
}

initializeDetector({
	statusCode: 403,
	message: 'Access denied: Tor exit node traffic is not allowed.',
})
const port = 3001
const app = express()
app.set('trust proxy', true)
app.use(blockTorExitNodesMiddleware())

app.get('/health', (_request, response) => {
	response.json({ok: true, adapter: 'express'})
})

app.get('/protected', (_request, response) => {
	response.json({ok: true, route: 'protected', adapter: 'express'})
})

app.listen(port, () => {
	console.log(`[express-example] listening on http://localhost:${port}`)
})
