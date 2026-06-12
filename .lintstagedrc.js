/** @type {import('lint-staged').Config} */
export default {
	// Lint JS/TS/Svelte files (all at once, not per file)
	// Type-checking is done in CI (too slow for pre-commit)
	'*.{js,ts,svelte}': (filenames) => [
		`eslint --cache --fix ${filenames.join(' ')}`,
		`prettier --write ${filenames.join(' ')}`,
		// Gate léger : ne lance que les tests liés aux fichiers stagés
		`vitest related --run --passWithNoTests ${filenames.join(' ')}`
	],

	// Format other files (all at once)
	'*.{json,md,css,html}': (filenames) => `prettier --write ${filenames.join(' ')}`
};
