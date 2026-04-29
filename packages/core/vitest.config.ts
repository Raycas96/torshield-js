import path from 'node:path'
import {defineConfig} from 'vitest/config'

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
	},
})
