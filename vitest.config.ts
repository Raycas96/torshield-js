import {defineConfig} from 'vitest/config'

// Root Vitest configuration.
// We keep it generic for the early-stage monorepo; when packages land, each package
// can run its own `vitest` via the turbo task graph.
export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		globals: true,
		environment: 'node',
		include: [
			'packages/**/tests/**/*.test.ts',
			'packages/**/tests/**/*.spec.ts',
			'tests/**/*.test.ts',
			'tests/**/*.spec.ts',
		],
	},
})
