/** @type {import('lint-staged').Config} */
export default {
	// Pre-commit is intentionally LIGHT — it must never OOM on this 8 GB machine
	// (the old eslint --fix + `vitest related` steps did, which forced --no-verify).
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
