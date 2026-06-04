/**
 * CheckpointCell — component-level tests
 *
 * Smoke tests on the 3 modes' rendering + status badge + verify button.
 * Heavy lifting (Pyodide + validation pipeline) lives in
 * `shared/python/execution/checkpoint-validation-real.svelte.test.ts`.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import CheckpointCell from './CheckpointCell.svelte';
import type { CheckpointCell as CheckpointCellType } from '$lib/types/notebook';

function makeAssertCell(overrides: Partial<CheckpointCellType> = {}): CheckpointCellType {
	return {
		id: 'cell-1',
		type: 'checkpoint',
		source: 'assert x == 6',
		execution_count: null,
		outputs: [],
		state: 'idle',
		checkpoint: { mode: 'assert', code: 'assert x == 6' },
		...overrides
	} as CheckpointCellType;
}

function makeUnitTestCell(): CheckpointCellType {
	return {
		id: 'cell-2',
		type: 'checkpoint',
		source: '',
		execution_count: null,
		outputs: [],
		state: 'idle',
		checkpoint: {
			mode: 'unit_test',
			function_name: 'moyenne',
			test_cases: [{ args: [[1, 2, 3]], expected: 2 }]
		}
	} as CheckpointCellType;
}

function makeVarCheckCell(): CheckpointCellType {
	return {
		id: 'cell-3',
		type: 'checkpoint',
		source: '',
		execution_count: null,
		outputs: [],
		state: 'idle',
		checkpoint: {
			mode: 'variable_check',
			expected_vars: { x: 6, y: 7 }
		}
	} as CheckpointCellType;
}

// Minimal mock store — only what CheckpointCell reads.
function makeMockStore(opts: {
	status?: 'passed' | 'failed';
	error?: string | null;
	running?: boolean;
	isReady?: boolean;
	isExecutingAny?: boolean;
	failedAttempts?: number;
	onRun?: (id: string) => void;
}) {
	const cellId = 'cell-1';
	return {
		isReady: opts.isReady ?? true,
		isExecutingAny: opts.isExecutingAny ?? false,
		getCheckpointStatus: (id: string) => (id === cellId ? opts.status : undefined),
		checkpointError: opts.error !== undefined ? { [cellId]: opts.error } : {},
		checkpointRunning: opts.running !== undefined ? { [cellId]: opts.running } : {},
		checkpointFailedAttempts:
			opts.failedAttempts !== undefined ? { [cellId]: opts.failedAttempts } : {},
		runCheckpoint: vi.fn((id: string) => {
			opts.onRun?.(id);
			return Promise.resolve();
		})
	};
}

describe('CheckpointCell — rendering', () => {
	it('renders the assert code in a <pre> block', async () => {
		const cell = makeAssertCell({
			checkpoint: { mode: 'assert', code: 'assert moyenne([1, 2, 3]) == 2' }
		});
		const store = makeMockStore({});
		render(CheckpointCell, { cell, notebook: store as never });
		await expect.element(page.getByText('assert moyenne([1, 2, 3]) == 2')).toBeVisible();
	});

	it('renders the unit_test function name in the description', async () => {
		const cell = makeUnitTestCell();
		const store = makeMockStore({});
		render(CheckpointCell, { cell, notebook: store as never });
		await expect.element(page.getByText(/moyenne/).first()).toBeVisible();
	});

	it('renders the variable_check expected vars by name', async () => {
		const cell = makeVarCheckCell();
		const store = makeMockStore({});
		render(CheckpointCell, { cell, notebook: store as never });
		await expect.element(page.getByText('x').first()).toBeVisible();
		await expect.element(page.getByText('y').first()).toBeVisible();
	});

	it('renders the title when provided', async () => {
		const cell = makeAssertCell({ title: 'Étape 1 : moyenne' });
		const store = makeMockStore({});
		render(CheckpointCell, { cell, notebook: store as never });
		await expect.element(page.getByText('Étape 1 : moyenne')).toBeVisible();
	});

	it('falls back to "Vérification" when no title is set', async () => {
		const cell = makeAssertCell();
		const store = makeMockStore({});
		render(CheckpointCell, { cell, notebook: store as never });
		await expect.element(page.getByText('Vérification')).toBeVisible();
	});
});

describe('CheckpointCell — status badge', () => {
	it('shows "Non vérifié" by default', async () => {
		const cell = makeAssertCell();
		const store = makeMockStore({});
		render(CheckpointCell, { cell, notebook: store as never });
		await expect.element(page.getByText('Non vérifié')).toBeVisible();
	});

	it('shows "Réussi" when status is passed', async () => {
		const cell = makeAssertCell();
		const store = makeMockStore({ status: 'passed' });
		render(CheckpointCell, { cell, notebook: store as never });
		await expect.element(page.getByText('Réussi')).toBeVisible();
	});

	it('shows "Échec" + the error message when status is failed', async () => {
		const cell = makeAssertCell();
		const store = makeMockStore({ status: 'failed', error: 'AssertionError: 5 != 6' });
		render(CheckpointCell, { cell, notebook: store as never });
		await expect.element(page.getByText('Échec')).toBeVisible();
		await expect.element(page.getByText('AssertionError: 5 != 6')).toBeVisible();
	});

	it('does not surface an alert role when status is passed', async () => {
		const cell = makeAssertCell();
		const store = makeMockStore({ status: 'passed' });
		render(CheckpointCell, { cell, notebook: store as never });
		const alerts = page.getByRole('alert');
		expect(await alerts.elements()).toHaveLength(0);
	});
});

describe('CheckpointCell — verify button', () => {
	it('calls runCheckpoint(cell.id) when clicked', async () => {
		const cell = makeAssertCell();
		const onRun = vi.fn();
		const store = makeMockStore({ onRun });
		render(CheckpointCell, { cell, notebook: store as never });

		const button = page.getByLabelText('Vérifier ce checkpoint');
		await button.click();

		expect(store.runCheckpoint).toHaveBeenCalledWith('cell-1');
	});

	it('is disabled when isReady is false', async () => {
		const cell = makeAssertCell();
		const store = makeMockStore({ isReady: false });
		render(CheckpointCell, { cell, notebook: store as never });
		await expect.element(page.getByLabelText('Vérifier ce checkpoint')).toBeDisabled();
	});

	it('is disabled when running', async () => {
		const cell = makeAssertCell();
		const store = makeMockStore({ running: true });
		render(CheckpointCell, { cell, notebook: store as never });
		await expect.element(page.getByLabelText('Vérifier ce checkpoint')).toBeDisabled();
	});

	it('shows the spinner label when running', async () => {
		const cell = makeAssertCell();
		const store = makeMockStore({ running: true });
		render(CheckpointCell, { cell, notebook: store as never });
		await expect.element(page.getByText('Vérification…')).toBeVisible();
	});

	it('hides the button entirely in readonly mode', async () => {
		const cell = makeAssertCell();
		const store = makeMockStore({});
		render(CheckpointCell, { cell, notebook: store as never, isReadonly: true });
		const buttons = page.getByLabelText('Vérifier ce checkpoint');
		expect(await buttons.elements()).toHaveLength(0);
	});

	it('is disabled while another cell is executing in the notebook', async () => {
		const cell = makeAssertCell();
		const store = makeMockStore({ isExecutingAny: true });
		render(CheckpointCell, { cell, notebook: store as never });
		await expect.element(page.getByLabelText('Vérifier ce checkpoint')).toBeDisabled();
	});
});

describe('CheckpointCell — hint reveal', () => {
	it('does not show the hint button when the cell has no hint', async () => {
		const cell = makeAssertCell();
		const store = makeMockStore({ status: 'failed', failedAttempts: 5 });
		render(CheckpointCell, { cell, notebook: store as never });
		const buttons = page.getByLabelText("Afficher l'indice du professeur");
		expect(await buttons.elements()).toHaveLength(0);
	});

	it('does not show the hint button before the threshold is reached', async () => {
		const cell = makeAssertCell({ hint: 'Pense à la formule moyenne = somme / nombre.' });
		const store = makeMockStore({ status: 'failed', failedAttempts: 1 });
		render(CheckpointCell, { cell, notebook: store as never });
		const buttons = page.getByLabelText("Afficher l'indice du professeur");
		expect(await buttons.elements()).toHaveLength(0);
	});

	it('shows the hint button once the threshold is reached', async () => {
		const cell = makeAssertCell({ hint: 'Pense à la formule moyenne = somme / nombre.' });
		const store = makeMockStore({ status: 'failed', failedAttempts: 2 });
		render(CheckpointCell, { cell, notebook: store as never });
		await expect.element(page.getByLabelText("Afficher l'indice du professeur")).toBeVisible();
	});

	it('reveals the hint text when the button is clicked', async () => {
		const cell = makeAssertCell({ hint: 'Pense à la formule moyenne = somme / nombre.' });
		const store = makeMockStore({ status: 'failed', failedAttempts: 2 });
		render(CheckpointCell, { cell, notebook: store as never });

		const button = page.getByLabelText("Afficher l'indice du professeur");
		await button.click();

		await expect
			.element(page.getByText('Pense à la formule moyenne = somme / nombre.'))
			.toBeVisible();
	});

	it('ignores a hint made only of whitespace', async () => {
		const cell = makeAssertCell({ hint: '   \n  ' });
		const store = makeMockStore({ status: 'failed', failedAttempts: 5 });
		render(CheckpointCell, { cell, notebook: store as never });
		const buttons = page.getByLabelText("Afficher l'indice du professeur");
		expect(await buttons.elements()).toHaveLength(0);
	});
});
