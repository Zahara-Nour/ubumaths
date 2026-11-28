/**
 * Juge d'une case « programme Python » (outil 49) : les essais rejoués par le worker Pyodide
 * (`validateExercise`, `reference_solution`), un essai par appel, arrêt au premier raté.
 * Le worker est simulé : ce qu'il rend est la forme réelle de `ExerciseValidationResult`.
 */

import { describe, it, expect, vi } from 'vitest';
import { judgePythonCase, type PythonCaseExecutor } from '../judge-python-case';
import type {
	ExerciseValidationConfig,
	ExerciseValidationResult
} from '#lib/shared/python/types.ts';
import type { PythonExpected } from '../python-answer';

const ATTENDU: PythonExpected = {
	fonction: 'seuil',
	solution: 'def seuil(A):\n    return 1',
	essais: ['seuil(2)', 'seuil(100)', 'seuil(10000)'],
	exiger: ['boucle']
};

const CODE = 'def seuil(A):\n    n = 0\n    while n < 3:\n        n = n + 1\n    return n';

const ok = (): ExerciseValidationResult => ({
	valid: true,
	failed_layer: null,
	behavior_kind: 'reference_solution',
	test_results: [{ passed: true, input: '(1 cas générés, seed=0)' }],
	execution_time_ms: 3
});

const behaviorFailure = (
	result: ExerciseValidationResult['test_results'][number]
): ExerciseValidationResult => ({
	valid: false,
	failed_layer: 'behavior',
	behavior_kind: 'reference_solution',
	test_results: [result],
	execution_time_ms: 3
});

const astFailure = (issues: string[]): ExerciseValidationResult => ({
	valid: false,
	failed_layer: 'ast',
	behavior_kind: 'reference_solution',
	ast_issues: issues,
	test_results: [],
	execution_time_ms: 0
});

function executor(results: Array<ExerciseValidationResult | Error>) {
	const calls: ExerciseValidationConfig[] = [];
	const exec: PythonCaseExecutor = {
		validateExercise: vi.fn(async (_code: string, config: ExerciseValidationConfig) => {
			calls.push(config);
			const next = results[calls.length - 1] ?? ok();
			if (next instanceof Error) throw next;
			return next;
		})
	};
	return { exec, calls };
}

describe('judgePythonCase — nominal', () => {
	it('tous les essais passent : juste ; un appel par essai, exigences au premier seulement', async () => {
		const { exec, calls } = executor([ok(), ok(), ok()]);
		expect(await judgePythonCase(CODE, ATTENDU, exec)).toEqual({ juste: true });
		expect(calls).toHaveLength(3);
		expect(calls[0]).toEqual({
			ast_requirements: [
				{
					type: 'defines_function',
					name: 'seuil',
					message: 'Il faut écrire la fonction seuil.'
				},
				{ type: 'uses_loop', message: 'Ta fonction doit utiliser une boucle (`while` ou `for`).' }
			],
			behavior: {
				kind: 'reference_solution',
				function_name: 'seuil',
				reference_code: ATTENDU.solution,
				generator: { code: '(2,)', count: 1, seed: 0 }
			},
			timeout_ms: 5000
		});
		expect(calls[1].ast_requirements).toBeUndefined();
		expect(calls[2].behavior).toMatchObject({ generator: { code: '(10000,)' } });
	});

	it('plusieurs arguments, aucun argument : le tuple des arguments', async () => {
		const { exec, calls } = executor([]);
		await judgePythonCase(
			'def f(): pass',
			{ ...ATTENDU, fonction: 'f', essais: ['f(1, 2)', 'f()'], exiger: [] },
			exec
		);
		expect(
			calls.map((c) => c.behavior?.kind === 'reference_solution' && c.behavior.generator?.code)
		).toEqual(['(1, 2,)', '()']);
	});
});

describe('judgePythonCase — limite : premier essai raté', () => {
	it('« seuil(2) : ta fonction rend 0, on attendait 1. », sans essayer la suite', async () => {
		const { exec, calls } = executor([
			behaviorFailure({
				passed: false,
				input: 'seuil((2,))',
				expected: '1',
				actual: '0',
				diff: 'La solution de référence et ta fonction divergent sur cette entrée.'
			})
		]);
		expect(await judgePythonCase(CODE, ATTENDU, exec)).toEqual({
			juste: false,
			message: 'seuil(2) : ta fonction rend 0, on attendait 1.'
		});
		expect(calls).toHaveLength(1);
	});

	it('deuxième essai raté : c’est lui qui est cité', async () => {
		const { exec } = executor([
			ok(),
			behaviorFailure({ passed: false, input: 'seuil((100,))', expected: '7', actual: '6' })
		]);
		expect((await judgePythonCase(CODE, ATTENDU, exec)).message).toBe(
			'seuil(100) : ta fonction rend 6, on attendait 7.'
		);
	});

	it('fonction sans `return` : « ne rend rien »', async () => {
		const { exec } = executor([
			behaviorFailure({ passed: false, input: 'seuil((2,))', expected: '1', actual: 'None' })
		]);
		expect((await judgePythonCase(CODE, ATTENDU, exec)).message).toBe(
			'seuil(2) : ta fonction ne rend rien (as-tu écrit return ?), on attendait 1.'
		);
	});
});

describe('judgePythonCase — erreurs', () => {
	it('programme vide : rien n’est lancé', async () => {
		const { exec, calls } = executor([]);
		expect(await judgePythonCase('  \n ', ATTENDU, exec)).toEqual({
			juste: false,
			message: 'Tu n’as écrit aucun programme.'
		});
		expect(calls).toHaveLength(0);
	});

	it('erreur de syntaxe : la ligne, en français pour les cas courants', async () => {
		const { exec } = executor([astFailure(["Erreur de syntaxe Python : ligne 4 : expected ':'"])]);
		expect((await judgePythonCase(CODE, ATTENDU, exec)).message).toBe(
			'Erreur de syntaxe ligne 4 : il manque « : ».'
		);
		const { exec: autre } = executor([
			astFailure(['Erreur de syntaxe Python : ligne 2 : weird thing'])
		]);
		expect((await judgePythonCase(CODE, ATTENDU, autre)).message).toBe(
			'Erreur de syntaxe ligne 2 : weird thing.'
		);
	});

	it('fonction absente, exigence manquée : le message de l’exigence', async () => {
		const { exec } = executor([astFailure(['Il faut écrire la fonction seuil.'])]);
		expect((await judgePythonCase('x = 1', ATTENDU, exec)).message).toBe(
			'Il faut écrire la fonction seuil.'
		);
	});

	it('boucle sans fin (délai du fil principal) : « ne s’arrête pas », le worker est signalé bloqué', async () => {
		const onStuck = vi.fn();
		const { exec } = executor([new Error("Délai d'exécution dépassé")]);
		expect(await judgePythonCase(CODE, ATTENDU, exec, { onStuck })).toEqual({
			juste: false,
			message: 'Ton programme ne s’arrête pas : vérifie la condition de ta boucle.'
		});
		expect(onStuck).toHaveBeenCalledOnce();
	});

	it('délai dépassé rendu par le worker : même message', async () => {
		const { exec } = executor([
			{
				valid: false,
				failed_layer: null,
				behavior_kind: 'reference_solution',
				test_results: [],
				error: "Délai d'exécution dépassé",
				execution_time_ms: 5000
			}
		]);
		expect((await judgePythonCase(CODE, ATTENDU, exec)).message).toMatch(/ne s’arrête pas/);
	});

	it('erreur à l’exécution d’un essai : l’essai, la ligne et l’erreur Python', async () => {
		const trace = [
			'Traceback (most recent call last):',
			'  File "/lib/python312.zip/_pyodide/_base.py", line 573, in eval_code_async',
			'  File "<exec>", line 3, in <module>',
			'  File "<exec>", line 5, in seuil',
			"NameError: name 'q' is not defined"
		].join('\n');
		const { exec } = executor([
			behaviorFailure({ passed: false, input: 'seuil((2,))', error: trace })
		]);
		expect((await judgePythonCase(CODE, ATTENDU, exec)).message).toBe(
			"seuil(2) : ton programme s’arrête sur une erreur ligne 5 : NameError: name 'q' is not defined."
		);
	});

	it('Python ne se charge pas : faux, avec un message', async () => {
		const { exec } = executor([new Error("Pyodide n'est pas prêt")]);
		expect((await judgePythonCase(CODE, ATTENDU, exec)).message).toBe(
			'Python n’a pas pu se lancer : réessaie dans un instant.'
		);
	});

	it('solution de l’auteur en erreur : la question est signalée, l’élève n’est pas accusé', async () => {
		const { exec } = executor([
			behaviorFailure({
				passed: false,
				error: 'Solution de référence ou générateur (seed=0) : ZeroDivisionError'
			})
		]);
		expect((await judgePythonCase(CODE, ATTENDU, exec)).message).toBe(
			'Cette question a un problème (la solution de l’auteur ne marche pas sur seuil(2)) : signale-le à ton professeur.'
		);
	});
});
