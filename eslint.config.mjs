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
		'@stylistic/function-paren-newline': 'off',
		'@stylistic/object-curly-newline': 'off',
	},
}))
