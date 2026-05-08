/**
 * ExerciseValidationResult — Component Tests
 * ===========================================
 *
 * Renders the component in chromium (vitest-browser-svelte) and verifies the
 * 4 main display states: valid (success), invalid with test_results, invalid
 * with ast_issues, and global error. Also checks the loading + null states.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import type { ExerciseValidationResult as Result } from '$lib/shared/python';
import ExerciseValidationResult from './ExerciseValidationResult.svelte';

const validResult: Result = {
	valid: true,
	strategy: 'output',
	test_results: [
		{ passed: true, input: '', expected: 'hello\n', actual: 'hello\n' },
		{ passed: true, input: '', expected: 'world\n', actual: 'world\n' }
	],
	execution_time_ms: 12
};

const invalidResult: Result = {
	valid: false,
	strategy: 'output',
	test_results: [
		{ passed: true, input: '', expected: 'ok\n', actual: 'ok\n' },
		{ passed: false, input: '5', expected: '25\n', actual: '10\n' }
	],
	execution_time_ms: 18
};

const astFailResult: Result = {
	valid: false,
	strategy: 'ast',
	test_results: [],
	ast_issues: ['Tu dois utiliser une boucle', "N'utilise pas print()"],
	execution_time_ms: 5
};

const errorResult: Result = {
	valid: false,
	strategy: 'unit_test',
	test_results: [],
	error: "Délai d'exécution dépassé",
	execution_time_ms: 5000
};

describe('ExerciseValidationResult', () => {
	it('renders nothing when no result and not loading', async () => {
		render(ExerciseValidationResult, { props: { result: null } });
		// No banner, no "Validation"
		const validation = page.getByText('Validation', { exact: false });
		await expect.element(validation).not.toBeInTheDocument();
	});

	it('shows a loading state', async () => {
		render(ExerciseValidationResult, { props: { result: null, loading: true } });
		await expect.element(page.getByText('Validation en cours…')).toBeVisible();
	});

	it('shows the success banner for a valid result', async () => {
		render(ExerciseValidationResult, { props: { result: validResult } });
		await expect.element(page.getByText('Validation réussie')).toBeVisible();
		await expect.element(page.getByText('2/2 tests passent')).toBeVisible();
	});

	it('shows the failure banner with passed/total count for an invalid result', async () => {
		render(ExerciseValidationResult, { props: { result: invalidResult } });
		await expect.element(page.getByText('Validation échouée')).toBeVisible();
		await expect.element(page.getByText('1/2 tests passent')).toBeVisible();
	});

	it('lists ast_issues for AST strategy failures', async () => {
		render(ExerciseValidationResult, { props: { result: astFailResult } });
		await expect.element(page.getByText('Tu dois utiliser une boucle')).toBeVisible();
		await expect.element(page.getByText("N'utilise pas print()")).toBeVisible();
	});

	it('shows the global-error banner for results with .error', async () => {
		render(ExerciseValidationResult, { props: { result: errorResult } });
		await expect.element(page.getByText('Erreur', { exact: true })).toBeVisible();
		await expect.element(page.getByText("Délai d'exécution dépassé")).toBeVisible();
	});
});
