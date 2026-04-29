import {defineConfig} from 'tsup'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	dts: false,
	sourcemap: true,
	clean: true,
	target: 'es2020',
	bundle: false,
	outDir: 'dist',
})
