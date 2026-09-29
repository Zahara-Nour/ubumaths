/** @type {import('lint-staged').Config} */
export default {
	// Pre-commit is intentionally LIGHT — for DURATION, not memory: ~2 s here, while
	// a full eslint takes 530 s (measured 2026-09-29, Mac mini Apple M6 24 GB, swap +0).
	// (On the old 8 GB laptop, the eslint --fix + `vitest related` steps also OOMed,
	// which forced --no-verify.)
	//   - oxlint (Rust, ~0 RAM) gives fast local lint feedback. By default errors
	//     block the commit, warnings don't (oxlint's exit code) — see .oxlintrc.json.
	//   - prettier formats.
	// Heavier gates live in CI: full eslint (eslint-plugin-svelte + the custom
	// require-zod-validation rule, neither of which oxlint can run) and the test
	// suites. Type-checking stays out of pre-commit (too slow) — see
	// scripts/check-incremental.sh.

	// JS/TS: lint + autofix, then format.
	'*.{js,ts}': (filenames) => [
		`oxlint --fix ${filenames.join(' ')}`,
		`prettier --write ${filenames.join(' ')}`
	],

	// Svelte: oxlint reports the <script> block only (NO --fix — avoid rewriting
	// across the .svelte source mapping). Template/a11y rules are eslint's job in CI.
	'*.svelte': (filenames) => [
		`oxlint ${filenames.join(' ')}`,
		`prettier --write ${filenames.join(' ')}`
	],

	// Other files: format only.
	'*.{json,md,css,html}': (filenames) => `prettier --write ${filenames.join(' ')}`
};
