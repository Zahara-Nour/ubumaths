/**
 * Sens de deux majuscules collées dans une question (`AB`) — lot 3
 * ================================================================
 *
 * Le sens se résout UNE fois, à la génération de l'instance (Q-K), dans l'ordre :
 * déclaration du modèle (`shared.capitalPairs`) → contexte (thème `Graphes et
 * matrices`, thème de physique) → longueur par défaut. L'instance le garde (Q-L) ;
 * une instance déjà servie, sans le champ, garde le sens d'avant : le produit.
 * La réponse de l'élève et la réponse attendue sont toujours lues dans le même sens.
 * Cf. docs/archive/wip/longueurs-segments-progress.md.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { questionTemplateSchema } from '../template-schema';
import { toPublicQuestion, toDisplayInstance } from '../public-question';
import {
	capitalPairsChoiceItems,
	capitalPairsChoiceOf,
	capitalPairsSchema,
	declaredCapitalPairs,
	describeCapitalPairs,
	resolveCapitalPairs,
	withoutCapitalPairShortcuts
} from '../capital-pairs';
import { figureNameWarnings } from '../figure-name-check';
import { requiredFormVerdict } from '../required-form-validator';
import { evaluateRule } from '../validation-rule-evaluator';
import { validateAnswer } from '$lib/utils/answer-validator';
import { createQuestionTemplateSchema } from '$lib/server/validation/questions';
import type { QuestionInstance, QuestionTemplate } from '../types';
import { templateMarkdown } from '$lib/ubumark';

// ============================================================================
// HELPERS
// ============================================================================

/** Une case, réponse attendue `expectedAnswer`, thème et déclaration au choix */
function lengthTemplate(
	expectedAnswer: string,
	{ theme = 'Géométrie', capitalPairs }: { theme?: string; capitalPairs?: unknown } = {}
): QuestionTemplate {
	return {
		id: 'test-capital-pairs',
		title: 'Longueur d’un segment',
		status: 'draft',
		// `unknown` : une valeur écrite hors de l'éditeur (jsonb) doit être filtrée
		shared:
			capitalPairs === undefined
				? undefined
				: ({ capitalPairs } as unknown as QuestionTemplate['shared']),
		variations: [
			{
				statement: templateMarkdown('Écris la réponse : $?$'),
				blanks: [{ expectedAnswer }]
			}
		],
		grades: ['4'],
		theme,
		domain: 'Théorème de Pythagore',
		level: 1
	};
}

function instanceOf(template: QuestionTemplate): QuestionInstance {
	const result = generateInstance(template, 1);
	if (!result.success) throw new Error(result.errors.join('; '));
	return result.instance;
}

/** Verdict d'une réponse tapée (même chaîne en texte et en LaTeX, comme MathLive) */
function verdict(instance: QuestionInstance, answer: string) {
	return validateAnswer([answer], instance, [answer]);
}

// ============================================================================
// RÉSOLUTION
// ============================================================================

describe('resolveCapitalPairs — déclaration → contexte → longueur', () => {
	it('aucune déclaration, aucun contexte « produit » : longueur, par défaut', () => {
		expect(resolveCapitalPairs({ theme: 'Géométrie' })).toEqual({
			capitalPairs: 'length',
			source: 'default'
		});
		expect(resolveCapitalPairs({ theme: 'Grandeurs' }).capitalPairs).toBe('length');
		expect(resolveCapitalPairs({ theme: '' }).capitalPairs).toBe('length');
		expect(resolveCapitalPairs({}).capitalPairs).toBe('length');
	});

	it('thème « Graphes et matrices » sans déclaration : produit, par le contexte', () => {
		expect(resolveCapitalPairs({ theme: 'Graphes et matrices' })).toEqual({
			capitalPairs: 'product',
			source: 'context',
			theme: 'Graphes et matrices'
		});
	});

	it('thème de physique sans déclaration : produit (U = RI)', () => {
		expect(resolveCapitalPairs({ theme: 'Physique-chimie' }).capitalPairs).toBe('product');
		expect(resolveCapitalPairs({ theme: 'Sciences physiques' }).capitalPairs).toBe('product');
	});

	it('la déclaration l’emporte sur le contexte, dans les deux sens', () => {
		expect(resolveCapitalPairs({ declaration: 'length', theme: 'Graphes et matrices' })).toEqual({
			capitalPairs: 'length',
			source: 'declaration'
		});
		expect(resolveCapitalPairs({ declaration: 'product', theme: 'Géométrie' })).toEqual({
			capitalPairs: 'product',
			source: 'declaration'
		});
	});

	it('une déclaration invalide (jsonb écrit à la main) est ignorée', () => {
		expect(declaredCapitalPairs('longueur')).toBeUndefined();
		expect(declaredCapitalPairs(null)).toBeUndefined();
		expect(declaredCapitalPairs(['length'])).toBeUndefined();
		expect(
			resolveCapitalPairs({ declaration: 'matrix', theme: 'Graphes et matrices' }).source
		).toBe('context');
	});

	it('libellé de la valeur résolue, pour l’éditeur', () => {
		expect(describeCapitalPairs(resolveCapitalPairs({ theme: 'Géométrie' }))).toBe(
			'une longueur, par défaut'
		);
		expect(describeCapitalPairs(resolveCapitalPairs({ theme: 'Graphes et matrices' }))).toBe(
			'un produit, contexte Graphes et matrices'
		);
		expect(describeCapitalPairs(resolveCapitalPairs({ declaration: 'product' }))).toBe(
			'un produit, déclaré dans le modèle'
		);
	});
});

describe('Éditeur — « Deux majuscules collées (AB) désignent : »', () => {
	it('rien de déclaré : la première option dit ce que donne le contexte', () => {
		expect(capitalPairsChoiceItems('Géométrie')[0]).toEqual({
			value: 'auto',
			label: 'Selon le contexte : une longueur, par défaut'
		});
		expect(capitalPairsChoiceItems('Graphes et matrices')[0].label).toBe(
			'Selon le contexte : un produit, contexte Graphes et matrices'
		);
		expect(capitalPairsChoiceItems('Géométrie').map((item) => item.value)).toEqual([
			'auto',
			'length',
			'product'
		]);
	});

	it('choix relu depuis la base : déclaration valide, sinon « selon le contexte »', () => {
		expect(capitalPairsChoiceOf('product')).toBe('product');
		expect(capitalPairsChoiceOf(undefined)).toBe('auto');
		expect(capitalPairsChoiceOf('matrice')).toBe('auto');
	});
});

// ============================================================================
// SCHÉMAS ZOD
// ============================================================================

describe('Schémas : shared.capitalPairs', () => {
	it('valeurs reçues : « length » ou « product », rien d’autre', () => {
		expect(capitalPairsSchema.safeParse('length').success).toBe(true);
		expect(capitalPairsSchema.safeParse('product').success).toBe(true);
		expect(capitalPairsSchema.safeParse('longueur').success).toBe(false);
		expect(capitalPairsSchema.safeParse(true).success).toBe(false);
	});

	it('schéma strict du modèle (JsonEditor) : accepté, valeur inconnue refusée', () => {
		const { id: _id, ...ok } = lengthTemplate('AB', { capitalPairs: 'product' });
		expect(questionTemplateSchema.safeParse(ok).success).toBe(true);
		const { id: _id2, ...bad } = lengthTemplate('AB', { capitalPairs: 'matrice' });
		expect(questionTemplateSchema.safeParse(bad).success).toBe(false);
	});

	it('route de création : valeur inconnue refusée avec un message français', () => {
		const { id: _id, ...bad } = lengthTemplate('AB', { capitalPairs: 'matrice' });
		const result = createQuestionTemplateSchema.safeParse(bad);
		expect(result.success).toBe(false);
		if (!result.success) {
			const issue = result.error.issues.find((i) => i.path.join('.') === 'shared.capitalPairs');
			expect(issue?.message).toMatch(/longueur|produit/);
		}
		const { id: _id2, ...ok } = lengthTemplate('AB', { capitalPairs: 'length' });
		expect(createQuestionTemplateSchema.safeParse(ok).success).toBe(true);
	});
});

// ============================================================================
// GÉNÉRATION : LE SENS EST COPIÉ SUR L'INSTANCE (Q-K)
// ============================================================================

describe('Génération — le sens résolu est porté par l’instance', () => {
	it('sans contexte : longueur', () => {
		expect(instanceOf(lengthTemplate('AB=5')).capitalPairs).toBe('length');
	});

	it('Graphes et matrices : produit', () => {
		expect(instanceOf(lengthTemplate('AB', { theme: 'Graphes et matrices' })).capitalPairs).toBe(
			'product'
		);
	});

	it('Graphes et matrices déclaré « longueur » : longueur', () => {
		const template = lengthTemplate('AB', { theme: 'Graphes et matrices', capitalPairs: 'length' });
		expect(instanceOf(template).capitalPairs).toBe('length');
	});

	it('version publique (évaluation notée) : le sens voyage, aucune réponse', () => {
		const instance = instanceOf(lengthTemplate('AB=5'));
		const question = toPublicQuestion(instance, { position: 0, delaySeconds: 30 });
		expect(question.capitalPairs).toBe('length');
		expect(JSON.stringify(question)).not.toContain('AB=5');
		expect(toDisplayInstance(question).capitalPairs).toBe('length');
	});
});

// ============================================================================
// CORRECTION : LE SENS DESCEND JUSQU'AU PARSEUR
// ============================================================================

describe('Correction — réponse et attendu lus dans le sens de l’instance', () => {
	it('sans contexte : « BA = 5 » est juste pour « AB = 5 », sans faute de forme', () => {
		const result = verdict(instanceOf(lengthTemplate('AB=5')), 'BA=5');
		expect(result.isCorrect).toBe(true);
		expect(result.status ?? 'correct').toBe('correct');
	});

	it('sans contexte : « BA^2 » est juste pour « AB^2 » (carré de la longueur)', () => {
		expect(verdict(instanceOf(lengthTemplate('AB^2')), 'BA^2').isCorrect).toBe(true);
	});

	it('sans contexte : « A×B » n’est pas la longueur AB', () => {
		expect(verdict(instanceOf(lengthTemplate('AB')), 'A\\times B').isCorrect).toBe(false);
	});

	it('Graphes et matrices : « AB » est le produit, « A×B » est juste', () => {
		const instance = instanceOf(lengthTemplate('AB', { theme: 'Graphes et matrices' }));
		expect(verdict(instance, 'A\\times B').isCorrect).toBe(true);
	});

	it('Graphes et matrices : « BA^2 » n’est pas « AB^2 » (A·B² ≠ B·A²)', () => {
		const instance = instanceOf(lengthTemplate('AB^2', { theme: 'Graphes et matrices' }));
		expect(verdict(instance, 'BA^2').isCorrect).toBe(false);
	});

	it('Graphes et matrices déclaré « longueur » : « BA^2 » est juste', () => {
		const template = lengthTemplate('AB^2', {
			theme: 'Graphes et matrices',
			capitalPairs: 'length'
		});
		expect(verdict(instanceOf(template), 'BA^2').isCorrect).toBe(true);
	});

	it('instance déjà servie, sans le champ : le produit d’avant (Q-L)', () => {
		const { capitalPairs: _sens, ...served } = instanceOf(lengthTemplate('AB^2'));
		expect(verdict(served, 'BA^2').isCorrect).toBe(false);
		const { capitalPairs: _sens2, ...servedProduct } = instanceOf(lengthTemplate('AB'));
		expect(verdict(servedProduct, 'A\\times B').isCorrect).toBe(true);
	});

	it('règle « equivalent » : lue dans le sens de l’instance', () => {
		const rule = { type: 'equivalent' as const, expression: 'AB^2' };
		const ctx = { variables: {}, answer: 'BA^2' };
		expect(evaluateRule(rule, { ...ctx, capitalPairs: 'length' }).valid).toBe(true);
		expect(evaluateRule(rule, ctx).valid).toBe(false);
	});

	it('forme exigée : « AB » n’est pas un produit en mode longueur', () => {
		expect(requiredFormVerdict('AB', 'product', { capitalPairs: 'length' })).toBe('violated');
		expect(requiredFormVerdict('AB', 'product', {})).not.toBe('violated');
	});
});

// ============================================================================
// GARDE AUTEUR (Q-A) : NOM DE FIGURE DANS UNE RÉPONSE ATTENDUE
// ============================================================================

describe('figureNameWarnings — un nom de figure attendu est signalé à l’auteur', () => {
	it('mode longueur : « ABC » attendu est signalé, avec la variation et la case', () => {
		const warnings = figureNameWarnings(lengthTemplate('ABC'));
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toMatch(/Variation 1, case 1/);
		expect(warnings[0]).toMatch(/ABC/);
		expect(warnings[0]).toMatch(/aucune réponse/i);
	});

	it('gabarit `{{…}}` et longueurs à deux points : rien à signaler', () => {
		expect(figureNameWarnings(lengthTemplate('{{a}}AB'))).toEqual([]);
		expect(figureNameWarnings(lengthTemplate('AB^2+BC^2'))).toEqual([]);
		expect(figureNameWarnings(lengthTemplate('12'))).toEqual([]);
	});

	it('case texte `[_]` : « ABC » y est comparé comme une chaîne, rien à signaler', () => {
		const template = lengthTemplate('ABC');
		template.variations[0].statement = templateMarkdown('Quel triangle est rectangle ? [_]');
		expect(figureNameWarnings(template)).toEqual([]);
	});

	it('case texte puis case math : seule la case math est signalée', () => {
		const template = lengthTemplate('ABC');
		template.variations[0].statement = templateMarkdown('Le triangle [_] a pour côté $?$');
		template.variations[0].blanks = [{ expectedAnswer: 'ABC' }, { expectedAnswer: 'ABC' }];
		const warnings = figureNameWarnings(template);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toMatch(/Variation 1, case 2/);
	});

	it('énoncé partagé : le type des cases se lit dans `shared.statement`', () => {
		const template = lengthTemplate('ABC');
		template.shared = { statement: templateMarkdown('Quel triangle ? [_]') };
		template.variations[0].statement = undefined;
		expect(figureNameWarnings(template)).toEqual([]);
	});

	it('mode produit (contexte ou déclaration) : rien à signaler', () => {
		expect(figureNameWarnings(lengthTemplate('ABC', { theme: 'Graphes et matrices' }))).toEqual([]);
		expect(figureNameWarnings(lengthTemplate('ABC', { capitalPairs: 'product' }))).toEqual([]);
	});
});

// ============================================================================
// RACCOURCIS MATHLIVE (Q-N)
// ============================================================================

describe('withoutCapitalPairShortcuts — AA ne devient plus ∀ en mode longueur', () => {
	/** Extrait réel des raccourcis par défaut de MathLive 0.111.1 */
	const defaults = {
		AA: '\\forall',
		EE: '\\exists',
		'!EE': '\\nexists',
		NN: '\\mathbb{N}',
		ZZ: '\\mathbb{Z}',
		QQ: '\\mathbb{Q}',
		RR: '\\mathbb{R}',
		CC: '\\mathbb{C}',
		TT: '\\top',
		xx: '\\times',
		'+-': '\\pm',
		in: { after: 'nothing+letter+closefence', value: '\\in' },
		alpha: '\\alpha',
		'¬': '\\neg'
	};

	it('retire les raccourcis qui transforment deux majuscules collées', () => {
		const filtered = withoutCapitalPairShortcuts(defaults);
		for (const key of ['AA', 'EE', '!EE', 'NN', 'ZZ', 'QQ', 'RR', 'CC', 'TT']) {
			expect(filtered).not.toHaveProperty(key);
		}
	});

	it('garde tous les autres, sans modifier la table d’origine', () => {
		const filtered = withoutCapitalPairShortcuts(defaults);
		expect(filtered).toEqual({
			xx: '\\times',
			'+-': '\\pm',
			in: { after: 'nothing+letter+closefence', value: '\\in' },
			alpha: '\\alpha',
			'¬': '\\neg'
		});
		expect(defaults).toHaveProperty('AA');
	});
});

describe('figureNameWarnings — bloc ```operation omis de blanks[] (revue #1726)', () => {
	it('case texte après le bloc : comparée comme une chaîne, rien à signaler, numéro juste', () => {
		const template = lengthTemplate('ABC');
		template.variations[0].statement = templateMarkdown(
			['```operation', 'calcul: 45 + 37', '```', '', 'Quel triangle ? [_]'].join('\n')
		);
		expect(figureNameWarnings(template)).toEqual([]);
		template.variations[0].statement = templateMarkdown(
			['```operation', 'calcul: 45 + 37', '```', '', '$?$'].join('\n')
		);
		expect(figureNameWarnings(template)[0]).toMatch(/case 2/);
	});
});
