/** @type {import('lint-staged').Config} */
export default {
	// Lint JS/TS/Svelte files (all at once, not per file)
	// Type-checking is done in CI (too slow for pre-commit)
	// Note: Prettier disabled for Svelte due to plugin compatibility issue
	// (getVisitorKeys error with prettier-plugin-svelte 3.4.0 + prettier 3.6.2)
	'*.svelte': (filenames) => [`eslint --cache --fix ${filenames.join(' ')}`],

	'*.{js,ts}': (filenames) => [
		`eslint --cache --fix ${filenames.join(' ')}`,
		`prettier --write ${filenames.join(' ')}`
	],

	// Format other files (all at once)
	'*.{json,md,css,html}': (filenames) => `prettier --write ${filenames.join(' ')}`
};
