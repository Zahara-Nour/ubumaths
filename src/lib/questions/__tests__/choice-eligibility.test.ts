/**
 * Case « en QCM » proposée au prof (chantier `idees-format`, idée 4, PR 4)
 *
 * Le panier et l'éditeur de série montrent la case « en QCM » pour une variation
 * seulement si sa question peut se poser en QCM : une seule case, à erreurs
 * prévues, sans veto de l'auteur (phase 0, Q1 et Q3).
 * `mayBeChoice` : lecture du modèle seul (sans tirage) ; `canBeChoice` : la
 * question tirée (exemple de la variation).
 */
import { describe, it, expect } from 'vitest';
import { canBeChoice, mayBeChoice } from '../choice-from-errors';
import { generateInstance } from '../generator/instance-generator';
import type { QuestionTemplate, QuestionVariation, TemplateBlank } from '../types';

const ERREUR = { answer: '4', message: 'Tu as soustrait.' };

function variation(statement: string, blanks: TemplateBlank[]): QuestionVariation {
	return { statement, blanks, variables: [] } as unknown as QuestionVariation;
}

const UNE_CASE = variation('$8 + 4 = ?$', [{ expectedAnswer: '12', expectedErrors: [ERREUR] }]);
const SANS_ERREUR = variation('$8 + 4 = ?$', [{ expectedAnswer: '12' }]);
const VETO = variation('$8 + 4 = ?$', [
	{ expectedAnswer: '12', expectedErrors: [ERREUR], neverChoice: true }
]);
const DEUX_CASES = variation('$8 + 4 = ?$ et $8 - 4 = ?$', [
	{ expectedAnswer: '12', expectedErrors: [ERREUR] },
	{ expectedAnswer: '4' }
]);

function instanceOf(v: QuestionVariation) {
	const template = {
		id: 't',
		level: 1,
		grades: ['6'],
		title: 't',
		variations: [v]
	} as unknown as QuestionTemplate;
	const result = generateInstance(template, 1);
	if (!result.success) throw new Error('tirage impossible');
	return result.instance;
}

describe('mayBeChoice — lecture du modèle', () => {
	it('une seule case à erreurs prévues : oui', () => {
		expect(mayBeChoice(UNE_CASE)).toBe(true);
	});

	it('sans erreur prévue, veto de l’auteur, ou plusieurs cases : non', () => {
		expect(mayBeChoice(SANS_ERREUR)).toBe(false);
		expect(mayBeChoice(VETO)).toBe(false);
		expect(mayBeChoice(DEUX_CASES)).toBe(false);
	});
});

describe('canBeChoice — question tirée', () => {
	it('une seule case à erreurs prévues : oui', () => {
		expect(canBeChoice(instanceOf(UNE_CASE))).toBe(true);
	});

	it('sans erreur prévue ou veto de l’auteur : non', () => {
		expect(canBeChoice(instanceOf(SANS_ERREUR))).toBe(false);
		expect(canBeChoice(instanceOf(VETO))).toBe(false);
	});
});
