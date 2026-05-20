import process from 'node:process'
import 'reflect-metadata'
import {Controller, Get, Module} from '@nestjs/common'
import {NestFactory} from '@nestjs/core'
import type {NestExpressApplication} from '@nestjs/platform-express'
import {TorModule} from '@raycas/torshield-nestjs'

@Controller()
class AppController {
	@Get('/health')
	health() {
		return {ok: true, adapter: 'nestjs'}
	}

	@Get('/protected')
	protectedRoute() {
		return {ok: true, route: 'protected', adapter: 'nestjs'}
	}
}

@Module({
	imports: [TorModule.forRoot()],
	controllers: [AppController],
})
class AppModule {}

const port = Number.parseInt(process.env.PORT ?? '3003', 10)
const app = await NestFactory.create<NestExpressApplication>(AppModule)
app.set('trust proxy', true)
await app.listen(port)
console.log(`[nestjs-example] listening on http://localhost:${port}`)
