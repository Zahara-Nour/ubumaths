/** @type {import('lint-staged').Config} */
export default {
	// Run type-check once (not per file) when TS/Svelte files are staged
	'*.{ts,svelte}': () => 'pnpm check:fast',

	// Lint and format JS/TS/Svelte files (runs per file)
	'*.{js,ts,svelte}': ['eslint --cache --fix', 'prettier --write'],

	// Format other files (runs per file)
	'*.{json,md,css,html}': 'prettier --write'
};
