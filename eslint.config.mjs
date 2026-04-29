import eslintConfigXo from 'eslint-config-xo'

// eslint-config-xo exports a factory function.
// It returns an ESLint Flat Config array; export it directly.
export default eslintConfigXo({
  browser: false,
  space: false,
  semicolon: false,
})
