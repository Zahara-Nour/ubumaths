/**
 * Sens de `AB` dans l'ÉCRITURE d'une question (lot 5)
 * ===================================================
 *
 * Le lot 3 a fait descendre le sens résolu de l'instance jusqu'à la correction des
 * réponses. Ici : tout ce que le serveur ÉCRIT à partir de la syntaxe maison suit le même
 * sens — formules `$…$` de l'énoncé et de la correction (relues en syntaxe maison),
 * `expectedAnswerLatex` (affichée au verso et dans la correction), étapes de la correction
 * rédigée (`generateCorrection`).
 *
 * En longueur : `AB` s'écrit `AB` (et non `A B`), `ABC` reste `ABC`. En produit (thème
 * `Graphes et matrices`) : l'écriture d'avant, à l'identique.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { generateCorrection } from '../generator/correction-generator';
import { convertToLatex } from '../generator/content-resolver';
import type { QuestionInstance, QuestionTemplate } from '../types';
import { templateMarkdown } from '$lib/ubumark';

// ============================================================================
// HELPERS
// ============================================================================

function template(
	expectedAnswer: string,
	{ theme = 'Géométrie', statement = 'Calcule : $?$' }: { theme?: string; statement?: string } = {}
): QuestionTemplate {
	return {
		id: 'test-capital-pairs-affichage',
		title: 'Longueur d’un segment',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown(statement),
				blanks: [{ expectedAnswer }],
				correction: {
					steps: [templateMarkdown('On sait que $AB^2=AC^2+BC^2$, donc ~2AB=10~.')]
				}
			}
		],
		grades: ['4'],
		theme,
		domain: 'Théorème de Pythagore',
		level: 1
	};
}

function instanceOf(source: QuestionTemplate): QuestionInstance {
	const result = generateInstance(source, 1);
	if (!result.success) throw new Error(result.errors.join('; '));
	return result.instance;
}

// ============================================================================
// RÉPONSE ATTENDUE AFFICHÉE
// ============================================================================

describe('expectedAnswerLatex suit le sens de l’instance', () => {
	it('longueur : AB^2 s’écrit AB^2, sans espace entre les points', () => {
		const instance = instanceOf(template('2AB^2'));
		expect(instance.capitalPairs).toBe('length');
		expect(instance.blanks?.[0]?.expectedAnswerLatex).toBe('2 AB^2');
	});

	it('produit (Graphes et matrices) : l’écriture d’avant', () => {
		const instance = instanceOf(template('2AB^2', { theme: 'Graphes et matrices' }));
		expect(instance.capitalPairs).toBe('product');
		expect(instance.blanks?.[0]?.expectedAnswerLatex).toBe(convertToLatex('2AB^2'));
		expect(convertToLatex('2AB^2')).toContain('A B');
	});

	it('convertToLatex sans sens : produit, comme avant', () => {
		expect(convertToLatex('AB')).toBe('A B');
		expect(convertToLatex('AB', undefined, false, 'length')).toBe('AB');
		expect(convertToLatex('ABC', undefined, false, 'length')).toBe('ABC');
	});
});

// ============================================================================
// ÉNONCÉ ET CORRECTION (formules `$…$` relues en syntaxe maison)
// ============================================================================

describe('formules de l’énoncé et de la correction', () => {
	it('longueur : $AB=5$ s’écrit AB=5', () => {
		const instance = instanceOf(template('5', { statement: 'Si $AB=5$, combien vaut $?$' }));
		expect(String(instance.statement)).toContain('$AB = 5$');
	});

	it('produit : l’énoncé garde l’écriture d’avant', () => {
		const instance = instanceOf(
			template('5', { statement: 'Si $AB=5$, combien vaut $?$', theme: 'Graphes et matrices' })
		);
		expect(String(instance.statement)).toContain('$A B = 5$');
	});

	it('longueur : les étapes de correction écrivent Pythagore avec des longueurs', () => {
		const instance = instanceOf(template('5'));
		const step = String(instance.correction?.steps?.[0]);
		expect(step).toContain('$AB^2 = AC^2 + BC^2$');
		// `~…~` reste en syntaxe maison : écrit au client, avec le sens de l'instance
		expect(step).toContain('~2AB=10~');
	});
});

// ============================================================================
// CORRECTION RÉDIGÉE (generateCorrection)
// ============================================================================

describe('correction rédigée', () => {
	function withSteps(capitalPairs: 'length' | 'product' | undefined): QuestionInstance {
		const base = instanceOf(template('5AB'));
		return {
			...base,
			capitalPairs,
			correction: { generatedSteps: { kind: 'simplify', expression: '3AB+2AB', intent: 'reduire' } }
		};
	}

	function stepsLatex(instance: QuestionInstance): string {
		return JSON.stringify(generateCorrection(instance).correction?._renderedSteps ?? null);
	}

	it('longueur : les étapes écrivent la longueur AB', () => {
		const latex = stepsLatex(withSteps('length'));
		expect(latex).toContain('AB');
		expect(latex).not.toContain('A B');
	});

	it('instance d’avant (sans sens) : produit, comme avant (Q-L)', () => {
		expect(stepsLatex(withSteps(undefined))).toBe(stepsLatex(withSteps('product')));
	});
});
