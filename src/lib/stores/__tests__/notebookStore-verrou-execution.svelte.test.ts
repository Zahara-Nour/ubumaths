/**
 * Verrou d'exécution du NotebookStore (décision de David, 2026-10-04).
 *
 * Le worker Pyodide est de même origine que l'application : le code d'un élève
 * exécuté chez le prof tourne avec la session du prof. Un carnet d'élève lu par
 * quelqu'un d'autre ne doit donc JAMAIS atteindre le worker — et la garde vit
 * dans le store, pas seulement dans les boutons.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PythonNotebook } from '$lib/types/notebook';

const created: Array<{
	execute: ReturnType<typeof vi.fn>;
	initPyodide: ReturnType<typeof vi.fn>;
	validateExercise: ReturnType<typeof vi.fn>;
}> = [];

vi.mock('$lib/shared/python', () => {
	class FakeNotebookExecutor {
		isReady = true;
		isExecuting = false;
		isLoading = false;
		hasError = false;
		loadingProgress = 100;
		loadingStage = '';
		stdout = '';
		stderr = '';
		errorLine = null;
		plotData = null;
		latexOutput = null;
		plotlyData = null;
		execute = vi.fn();
		initPyodide = vi.fn();
		validateExercise = vi.fn(async () => ({ success: true }));
		requestCompletion = vi.fn(async () => []);
		getContextId = () => 'ctx';
		destroy = vi.fn();
		constructor() {
			created.push(this);
		}
	}
	return { NotebookExecutor: FakeNotebookExecutor };
});

const { NotebookStore } = await import('$lib/stores/notebookStore.svelte');

function makeNotebook(): PythonNotebook {
	return {
		id: '00000000-0000-4000-8000-000000000001',
		title: 'Carnet',
		content: {
			cells: [
				{
					id: 'c1',
					type: 'code',
					source: 'print(1)',
					execution_count: null,
					outputs: [],
					state: 'idle'
				},
				{
					id: 'k1',
					type: 'checkpoint',
					source: '',
					execution_count: null,
					outputs: [],
					state: 'idle',
					checkpoint: { mode: 'assert', code: 'assert True' }
				}
			]
		}
	} as unknown as PythonNotebook;
}

beforeEach(() => {
	created.length = 0;
});
afterEach(() => {
	vi.unstubAllGlobals();
});

describe('NotebookStore — verrou d’exécution', () => {
	it('carnet verrouillé : initPyodide ne crée aucun worker', () => {
		const store = new NotebookStore();
		store.notebook = makeNotebook();
		store.lockExecution();
		store.initPyodide();
		expect(created).toHaveLength(0);
		expect(store.executionLocked).toBe(true);
	});

	it('carnet verrouillé : executeCell, executeAllCells et runCheckpoint refusent', async () => {
		const store = new NotebookStore();
		store.notebook = makeNotebook();
		store.initPyodide(); // worker déjà présent : la garde ne dépend pas de son absence
		store.lockExecution();
		await store.executeCell('c1');
		await store.executeAllCells();
		await store.runCheckpoint('k1');
		expect(created).toHaveLength(1);
		expect(created[0].execute).not.toHaveBeenCalled();
		expect(created[0].validateExercise).not.toHaveBeenCalled();
		expect(store.cells[0].state).toBe('idle');
		expect(store.checkpointRunning['k1']).toBeUndefined();
	});

	it('carnet non verrouillé (le sien, ou un carnet assigné) : exécution normale', async () => {
		const store = new NotebookStore();
		store.notebook = makeNotebook();
		store.initPyodide();
		await store.executeCell('c1');
		expect(created[0].execute).toHaveBeenCalledWith('print(1)');
		expect(store.executionLocked).toBe(false);
	});

	it('chemin réel loadNotebook : verrouillé, aucun exécuteur créé ni lancé', async () => {
		const notebook = { ...makeNotebook(), updated_at: '2026-10-04T10:00:00Z' };
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ notebook }), { status: 200 }))
		);
		const store = new NotebookStore();
		store.lockExecution();
		expect(await store.loadNotebook(notebook.id)).not.toBeNull();
		store.initPyodide();
		await store.executeCell('c1');
		await store.runCheckpoint('k1');
		expect(created).toHaveLength(0);
		expect(store.isReady).toBe(false);
	});

	it('chemin réel loadNotebook : non verrouillé, un exécuteur est créé', async () => {
		const notebook = { ...makeNotebook(), updated_at: '2026-10-04T10:00:00Z' };
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ notebook }), { status: 200 }))
		);
		const store = new NotebookStore();
		await store.loadNotebook(notebook.id);
		store.initPyodide();
		expect(created).toHaveLength(1);
		expect(created[0].initPyodide).toHaveBeenCalled();
	});
});
