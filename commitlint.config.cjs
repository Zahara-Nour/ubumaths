/**
 * Commitlint Configuration (CommonJS)
 * ====================================
 *
 * Note: This file uses .cjs extension because package.json has "type": "module"
 * but commitlint requires CommonJS format.
 *
 * Enforces conventional commit message format on the main branch.
 *
 * Valid commit types:
 * - feat:     A new feature
 * - fix:      A bug fix
 * - docs:     Documentation only changes
 * - style:    Changes that do not affect the meaning of the code
 * - refactor: A code change that neither fixes a bug nor adds a feature
 * - perf:     A code change that improves performance
 * - test:     Adding missing tests or correcting existing tests
 * - build:    Changes that affect the build system or external dependencies
 * - ci:       Changes to CI configuration files and scripts
 * - chore:    Other changes that don't modify src or test files
 * - revert:   Reverts a previous commit
 *
 * Format: <type>(<scope>): <subject>
 * Example: feat(auth): add Google OAuth login
 *
 * For breaking changes, add "!" after type:
 * Example: feat!: redesign user dashboard
 */

module.exports = {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'type-enum': [
			2,
			'always',
			[
				'feat',     // New feature
				'fix',      // Bug fix
				'docs',     // Documentation
				'style',    // Formatting, missing semi colons, etc.
				'refactor', // Code restructuring
				'perf',     // Performance improvements
				'test',     // Adding tests
				'build',    // Build system changes
				'ci',       // CI/CD changes
				'chore',    // Maintenance tasks
				'revert'    // Revert previous commit
			]
		],
		'type-case': [2, 'always', 'lower-case'],
		'type-empty': [2, 'never'],
		'subject-empty': [2, 'never'],
		'subject-full-stop': [2, 'never', '.'],
		'header-max-length': [2, 'always', 100]
	}
};
