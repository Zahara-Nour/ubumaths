/**
 * Câblage de la page `/python-notebook/[id]` (décision de David, 2026-10-04) :
 * le drapeau serveur `foreignStudentNotebook` doit atteindre la vue — rendu
 * restreint et AUCUN exécuteur — et ne pas déborder sur le carnet suivant
 * (SvelteKit réutilise la page d'un carnet à l'autre).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const created = vi.hoisted(() => [] as Array<{ execute: ReturnType<typeof vi.fn> }>);

// Le module réel de l'exécuteur, pas le baril (qui réexporte d'autres exécuteurs)
vi.mock('$lib/shared/python/execution/notebook-executor.svelte', () => {
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
		cancel = vi.fn();
		resetKernel = vi.fn();
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

const toaster = vi.hoisted(() => ({
	success: vi.fn(),
	error: vi.fn(),
	warning: vi.fn(),
	info: vi.fn()
}));
vi.mock('$lib/stores/toaster.svelte', () => ({ toaster }));

const goto = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('$app/navigation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$app/navigation')>()),
	goto
}));

import Page from '../+page.svelte';

const ID_ELEVE = '00000000-0000-4000-8000-0000000000e1';
const ID_PROF = '00000000-0000-4000-8000-0000000000f1';
const LATEX_HOSTILE = '\\htmlStyle{position:fixed;inset:0;background:red}{x}';

function notebookJson(id: string) {
	return {
		id,
		title: `Carnet ${id.slice(-2)}`,
		description: null,
		updated_at: '2026-10-04T10:00:00Z',
		content: {
			cells: [
				{
					id: `c-${id}`,
					type: 'code',
					source: 'print(1)',
					execution_count: 1,
					// Sortie hostile dans le carnet de l'élève seulement (le carnet du prof
					// rendrait une vraie formule, dont MathLive chargerait les polices)
					outputs:
						id === ID_ELEVE
							? [
									{
										output_type: 'display_data',
										data: { 'text/plain': LATEX_HOSTILE },
										metadata: {}
									}
								]
							: [],
					state: 'idle'
				}
			]
		}
	};
}

function pageData(id: string, foreign: boolean) {
	return {
		notebook: { id, title: `Carnet ${id.slice(-2)}`, description: null },
		canEdit: !foreign,
		readonly: foreign,
		isOwner: !foreign,
		foreignStudentNotebook: foreign,
		userRole: 'teacher'
	};
}

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}

beforeEach(() => {
	created.length = 0;
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('checkpoint-runs')) return new Response(JSON.stringify({ runs: [] }));
			const id = url.includes(ID_ELEVE) ? ID_ELEVE : ID_PROF;
			return new Response(JSON.stringify({ notebook: notebookJson(id) }));
		})
	);
});
afterEach(() => {
	vi.unstubAllGlobals();
	for (const m of mains) m.remove();
	mains = [];
});

const LOCK_MESSAGE = "Lecture seule : ce carnet n'est pas le vôtre";

describe('Page carnet — drapeau foreignStudentNotebook', () => {
	it('carnet d’élève vu par le prof : verrou, aucun exécuteur, pas de formule hostile', async () => {
		const screen = await render(Page, {
			target: mainElement(),
			props: { data: pageData(ID_ELEVE, true) } as never
		});
		const el = screen.container as HTMLElement;
		await expect.poll(() => el.textContent).toContain(LOCK_MESSAGE);
		await expect.poll(() => el.querySelector('pre')?.textContent ?? '').toContain('htmlStyle');
		expect(el.querySelector('math-span')).toBeNull();
		expect(el.textContent).not.toContain('Tout exécuter');
		expect(created).toHaveLength(0);
	});

	it('du carnet d’un élève au carnet du prof : le verrou ne suit pas', async () => {
		const screen = await render(Page, {
			target: mainElement(),
			props: { data: pageData(ID_ELEVE, true) } as never
		});
		const el = screen.container as HTMLElement;
		await expect.poll(() => el.textContent).toContain(LOCK_MESSAGE);

		await screen.rerender({ data: pageData(ID_PROF, false) } as never);

		await expect.poll(() => el.textContent).toContain('Tout exécuter');
		expect(el.textContent).not.toContain(LOCK_MESSAGE);
		await expect.poll(() => created.length).toBe(1);

		const runAll = [...el.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Tout exécuter')
		);
		await expect.poll(() => runAll?.disabled).toBe(false);
		runAll?.click();
		await expect.poll(() => created[0].execute.mock.calls.length).toBe(1);
	});
});
