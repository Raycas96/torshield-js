import eslintConfigXo from 'eslint-config-xo'

// eslint-config-xo exports a factory function.
// It returns an ESLint Flat Config array; export it directly.
const xoConfig = eslintConfigXo({
	browser: false,
	space: false,
	semicolon: false,
	rules: {
		'import-x/extensions': 'off',
	},
})

// eslint-config-xo may override rules after it applies its own defaults.
// Apply our formatting overrides last so they actually win.
export default xoConfig.map(config => ({
	...config,
	rules: {
		...config.rules,
		'import-x/extensions': 'off',
		'@stylistic/function-paren-newline': 'off',
		'@stylistic/object-curly-newline': 'off',
	},
	ignores: [
		'**/*/dist',
		'**/*/node_modules',
		'package-lock.json',
		'**/*/pnpm-lock.yaml',
		'**/*/pnpm-workspace.yaml',
		'**/*/turbo.json',
		'**/*/tsconfig.json',
		'**/*/tsconfig.base.json',
		'**/*/tsconfig.node.json',
		'**/*/tsconfig.app.json',
	],
}))
