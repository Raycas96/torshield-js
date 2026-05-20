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
const sharedRules = {
	'import-x/extensions': 'off',
	'@stylistic/function-paren-newline': 'off',
	'@stylistic/object-curly-newline': 'off',
	'@stylistic/operator-linebreak': 'off',
}

const sharedIgnores = [
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
]

const config = [
	...xoConfig.map(config => ({
		...config,
		rules: {
			...config.rules,
			...sharedRules,
		},
		ignores: sharedIgnores,
	})),
	{
		files: ['examples/nestjs-app/**/*.ts'],
		rules: {
			'new-cap': 'off',
			'import-x/no-unassigned-import': 'off',
		},
	},
]

export default config
