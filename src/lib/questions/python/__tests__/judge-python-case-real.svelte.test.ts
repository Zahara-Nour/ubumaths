/**
 * Juge d'une case « programme Python » avec le VRAI worker Pyodide (outil 49)
 * ==========================================================================
 *
 * Comme `exercise-validation-real.svelte.test.ts` : le `PlaygroundExecutor` lance le vrai
 * `pyodide.worker.ts` et charge Pyodide dans Chromium. Exclu de la CI ordinaire (motif
 * `*-real.svelte.test.ts`), joué en local et par la tâche de nuit (`RUN_PYODIDE_REAL=1`).
 *
 * Vérifie les messages réels du worker (essai raté, `None`, syntaxe, fonction absente,
 * erreur à l'exécution, boucle sans fin) : le test simulé suppose leur forme.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PlaygroundExecutor } from '#lib/shared/python/index.ts';
import { judgePythonCase, PYTHON_NEVER_STOPS } from '../judge-python-case';
import type { PythonExpected } from '../python-answer';

const PYODIDE_LOAD_TIMEOUT_MS = 90_000;

const SOLUTION = [
	'def seuil(A):',
	'    u = 2',
	'    n = 0',
	'    while u <= A:',
	'        u = 1.5 * u',
	'        n = n + 1',
	'    return n'
].join('\n');

const ATTENDU: PythonExpected = {
	fonction: 'seuil',
	solution: SOLUTION,
	essais: ['seuil(2)', 'seuil(100)', 'seuil(10000)'],
	exiger: ['boucle']
};

let executor: PlaygroundExecutor;

beforeAll(async () => {
	executor = new PlaygroundExecutor();
	executor.initPyodide();
	const start = Date.now();
	while (executor.state !== 'ready') {
		if (executor.state === 'error') throw new Error(`Pyodide : ${executor.stderr}`);
		if (Date.now() - start > PYODIDE_LOAD_TIMEOUT_MS) throw new Error('Pyodide trop long');
		await new Promise((r) => setTimeout(r, 50));
	}
}, PYODIDE_LOAD_TIMEOUT_MS + 5000);

afterAll(() => executor?.destroy());

describe('judgePythonCase — vrai Pyodide', () => {
	it('la solution elle-même, écrite autrement (for + break) : juste', async () => {
		const autre = [
			'def seuil(A):',
			'    u = 2',
			'    for n in range(1000):',
			'        if u > A:',
			'            return n',
			'        u = 1.5 * u'
		].join('\n');
		expect(await judgePythonCase(SOLUTION, ATTENDU, executor)).toEqual({ juste: true });
		expect(await judgePythonCase(autre, ATTENDU, executor)).toEqual({ juste: true });
	}, 30_000);

	it('cas du bord raté : « seuil(2) : ta fonction rend 0, on attendait 1. »', async () => {
		const faux = SOLUTION.replace('while u <= A', 'while u < A');
		expect(await judgePythonCase(faux, ATTENDU, executor)).toEqual({
			juste: false,
			message: 'seuil(2) : ta fonction rend 0, on attendait 1.'
		});
	}, 30_000);

	it('`return` oublié, erreur de syntaxe, fonction absente, sans boucle', async () => {
		const sansReturn = SOLUTION.replace('    return n', '    n = n');
		expect((await judgePythonCase(sansReturn, ATTENDU, executor)).message).toBe(
			'seuil(2) : ta fonction ne rend rien (as-tu écrit return ?), on attendait 1.'
		);
		const syntaxe = SOLUTION.replace('while u <= A:', 'while u <= A');
		expect((await judgePythonCase(syntaxe, ATTENDU, executor)).message).toBe(
			'Erreur de syntaxe ligne 4 : il manque « : ».'
		);
		expect((await judgePythonCase('def rang(A):\n    return 1', ATTENDU, executor)).message).toBe(
			'Il faut écrire la fonction seuil.'
		);
		expect((await judgePythonCase('def seuil(A):\n    return 1', ATTENDU, executor)).message).toBe(
			'Ta fonction doit utiliser une boucle (`while` ou `for`).'
		);
	}, 30_000);

	it('erreur à l’exécution : l’essai, la ligne, l’erreur Python', async () => {
		const erreur = SOLUTION.replace('u = 1.5 * u', 'u = q * u');
		expect((await judgePythonCase(erreur, ATTENDU, executor)).message).toBe(
			"seuil(2) : ton programme s’arrête sur une erreur ligne 5 : NameError: name 'q' is not defined."
		);
	}, 30_000);

	it('boucle sans fin : « ne s’arrête pas », le worker est signalé bloqué', async () => {
		let stuck = false;
		const sansFin = SOLUTION.replace('u = 1.5 * u', 'u = u');
		const verdict = await judgePythonCase(sansFin, ATTENDU, executor, {
			onStuck: () => {
				stuck = true;
			}
		});
		expect(verdict).toEqual({ juste: false, message: PYTHON_NEVER_STOPS });
		expect(stuck).toBe(true);
	}, 30_000);
});
