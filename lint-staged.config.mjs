const quoteFiles = files => files.map(file => `"${file.replaceAll('"', String.raw`\"`)}"`).join(' ')

const isDeclarationFile = file => file.endsWith('.d.ts')

// Keep lint-staged scoped to formatting + static linting.
// Running tests from pre-commit is intentionally disabled.

const config = {
	'*.{js,jsx,mjs,cjs,ts,tsx}'(files) {
		const sourceFiles = files.filter(file => !isDeclarationFile(file))

		if (sourceFiles.length === 0) {
			return []
		}

		const quoted = quoteFiles(sourceFiles)
		return [`eslint --fix --max-warnings=0 ${quoted}`, `prettier --write ${quoted}`]
	},
	'*.d.ts'(files) {
		if (files.length === 0) {
			return []
		}

		return `prettier --write ${quoteFiles(files)}`
	},
	'*.{json,md,css,scss,yml,yaml}'(files) {
		if (files.length === 0) {
			return []
		}

		return `prettier --write ${quoteFiles(files)}`
	},
	'*': () => [],
}

export default config
