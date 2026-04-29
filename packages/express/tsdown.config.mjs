const config = {
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	dts: false,
	sourcemap: true,
	clean: true,
	target: 'es2020',
	unbundle: true,
	outDir: 'dist',
}

export default config
