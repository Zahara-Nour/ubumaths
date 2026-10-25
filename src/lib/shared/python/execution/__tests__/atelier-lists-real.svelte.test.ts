/**
 * « Ouvrir dans l'atelier » — les listes qu'un programme laisse, lues par le
 * vrai Pyodide (phase 0 `docs/archive/wip/python-vers-atelier-phase0.md`).
 *
 * Le worker rapporte, après une exécution réussie, chaque liste AFFECTÉE au
 * niveau du module par le code exécuté : ses valeurs (200 au plus), ou ses
 * effectifs, ou ce qui l'empêche de passer.
 *
 * Importé par le barrel `$lib/shared/python` (TDZ, voir
 * exercise-validation-real.svelte.test.ts).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BasePythonExecutor } from '$lib/shared/python';

// =============================================================================
// Décor
// =============================================================================

class TestExecutor extends BasePythonExecutor {
	getContextId(): string | undefined {
		return undefined;
	}
	isPersistentContext(): boolean {
		return false;
	}
	protected onExecutionComplete(_duration: number): void {
		// rien
	}
	protected onExecutionError(_message: string, _line?: number): void {
		// rien
	}
}

const PYODIDE_LOAD_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 50;
const TEST_TIMEOUT_MS = 30_000;

async function until(condition: () => boolean, timeoutMs: number, what: string): Promise<void> {
	const start = Date.now();
	while (!condition()) {
		if (Date.now() - start > timeoutMs) throw new Error(`délai dépassé : ${what}`);
		await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
	}
}

// =============================================================================
// Tests
// =============================================================================

describe('les listes d’un programme, pour l’atelier (vrai Pyodide)', () => {
	let executor: TestExecutor;

	beforeAll(async () => {
		executor = new TestExecutor();
		executor.initPyodide();
		await until(() => executor.state === 'ready', PYODIDE_LOAD_TIMEOUT_MS, 'Pyodide');
	}, PYODIDE_LOAD_TIMEOUT_MS);

	afterAll(() => {
		executor?.destroy();
	});

	async function run(code: string) {
		executor.execute(code);
		await until(() => executor.state !== 'executing', TEST_TIMEOUT_MS, 'exécution');
		return executor.atelierLists;
	}

	it(
		'une liste remplie par une boucle : ses valeurs',
		async () => {
			const lists = await run('L = []\nfor k in range(4):\n    L.append(k * k)\nprint(L)');
			expect(lists).toEqual([{ name: 'L', length: 4, distinct: 4, items: [0, 1, 4, 9] }]);
		},
		TEST_TIMEOUT_MS
	);

	it(
		'nombres et mots ; ce qui n’est pas une liste est ignoré',
		async () => {
			const lists = await run("a = 3\nt = 'x'\nm = ['P', 'F', 'P']\nf = [0.5, 2]");
			expect(lists).toEqual([
				{ name: 'm', length: 3, distinct: 2, items: ['P', 'F', 'P'] },
				{ name: 'f', length: 2, distinct: 2, items: [0.5, 2] }
			]);
		},
		TEST_TIMEOUT_MS
	);

	it(
		'une liste d’une exécution PRÉCÉDENTE n’est pas proposée',
		async () => {
			await run('ancienne = [1, 2]');
			const lists = await run('nouvelle = [3]');
			expect(lists.map((l) => l.name)).toEqual(['nouvelle']);
		},
		TEST_TIMEOUT_MS
	);

	it(
		'les variables locales d’une fonction et les noms en _ sont ignorés',
		async () => {
			const lists = await run('def g():\n    loc = [1]\n    return loc\n_cache = [2]\nr = g()');
			expect(lists.map((l) => l.name)).toEqual(['r']);
		},
		TEST_TIMEOUT_MS
	);

	it(
		'1 000 lancers : ses effectifs, pas ses valeurs',
		async () => {
			const lists = await run('L = [1, 2, 2, 3] * 250');
			expect(lists).toEqual([
				{
					name: 'L',
					length: 1000,
					distinct: 3,
					counts: [
						[1, 250],
						[2, 500],
						[3, 250]
					]
				}
			]);
		},
		TEST_TIMEOUT_MS
	);

	it(
		'plus de 200 valeurs et plus de 20 différentes : ni valeurs ni effectifs',
		async () => {
			const lists = await run('L = list(range(300))');
			expect(lists).toEqual([{ name: 'L', length: 300, distinct: 300 }]);
		},
		TEST_TIMEOUT_MS
	);

	it(
		'ce qui ne passe pas est nommé : booléen, grand entier, nan, None',
		async () => {
			const lists = await run(
				"b = [True]\ng = [2**60]\nn_ = [float('nan')]\no = [None, [1]]\nok = [2**53]"
			);
			expect(lists).toEqual([
				{ name: 'b', length: 1, distinct: 0, problem: { kind: 'bool' } },
				{ name: 'g', length: 1, distinct: 0, problem: { kind: 'big-int' } },
				{ name: 'n_', length: 1, distinct: 0, problem: { kind: 'not-finite' } },
				{ name: 'o', length: 2, distinct: 0, problem: { kind: 'other', type: 'NoneType' } },
				{ name: 'ok', length: 1, distinct: 1, items: [2 ** 53] }
			]);
		},
		TEST_TIMEOUT_MS
	);

	it(
		'revue : un texte trop long ne fait pas perdre les autres listes',
		async () => {
			const lists = await run("L = [1, 2]\nbig = ['x' * 20000]");
			expect(lists).toEqual([
				{ name: 'L', length: 2, distinct: 2, items: [1, 2] },
				{ name: 'big', length: 1, distinct: 0, problem: { kind: 'long-text' } }
			]);
		},
		TEST_TIMEOUT_MS
	);

	it(
		'revue : match et except* sont parcourus',
		async () => {
			const lists = await run(
				'match 1:\n    case 1:\n        m = [1]\ntry:\n    pass\nexcept* ValueError:\n    e2 = [2]\nelse:\n    t = [3]'
			);
			expect(lists.map((l) => l.name)).toEqual(['m', 't']);
		},
		TEST_TIMEOUT_MS
	);

	it(
		'une exécution en erreur ne propose rien',
		async () => {
			const lists = await run('L = [1]\n1 / 0');
			expect(lists).toEqual([]);
		},
		TEST_TIMEOUT_MS
	);
});
