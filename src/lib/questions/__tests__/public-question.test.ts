/**
 * Version PUBLIQUE d'une question d'évaluation (chantier 5, B6 / E19)
 * ===================================================================
 *
 * Pendant une évaluation, le navigateur ne reçoit que ce qu'il faut pour
 * AFFICHER et SAISIR : jamais la réponse attendue, la correction, la bonne
 * réponse d'un QCM, la graine ni le modèle. Construite en LISTE BLANCHE : un
 * champ ajouté demain à `QuestionInstance` n'y passe pas sans qu'on l'y mette.
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { toDisplayInstance, toPublicQuestion } from '../public-question';
import { getQuestionType, type QuestionInstance, type QuestionTemplate } from '../types';

// Constantes
/** Clés qui, présentes n'importe où, laisseraient tricher */
const FORBIDDEN_KEYS = [
	'expectedAnswer',
	'expectedAnswerLatex',
	'correctChoiceIndex',
	'isCorrect',
	'correction',
	'seed',
	'templateId',
	'resolvedVariables',
	'validationRules',
	'requiredForm',
	'precision',
	'originalIndex',
	'selectedVariationIndex',
	'value',
	'testSpecs',
	'variables'
];

// Functions
function template(path: string, id: string): QuestionTemplate {
	const raw = JSON.parse(readFileSync(`docs/relecture/${path}.json`, 'utf-8')).template;
	return { ...raw, id } as QuestionTemplate;
}

function generate(t: QuestionTemplate, seed: number): QuestionInstance {
	const result = generateInstance(t, seed);
	if (!result.success) throw new Error(result.errors.join('; '));
	return result.instance;
}

/** Toutes les clés d'un JSON, à toute profondeur */
function allKeys(value: unknown, keys: Set<string> = new Set()): Set<string> {
	if (Array.isArray(value)) value.forEach((item) => allKeys(item, keys));
	else if (value && typeof value === 'object') {
		for (const [key, child] of Object.entries(value)) {
			keys.add(key);
			allKeys(child, keys);
		}
	}
	return keys;
}

/** Toutes les chaînes d'un JSON, à toute profondeur */
function allStrings(value: unknown, strings: string[] = []): string[] {
	if (typeof value === 'string') strings.push(value);
	else if (Array.isArray(value)) value.forEach((item) => allStrings(item, strings));
	else if (value && typeof value === 'object')
		Object.values(value).forEach((v) => allStrings(v, strings));
	return strings;
}

const TEMPLATES = [
	template('relatifs/314', '00000000-0000-4000-8000-000000000314'), // QCM
	template('grandeurs/437', '00000000-0000-4000-8000-000000000437'), // unités
	template('entiers/142', '00000000-0000-4000-8000-000000000142') // correction
];

describe('toPublicQuestion : liste blanche', () => {
	it.each(TEMPLATES.flatMap((t) => [1, 2, 3, 42, 2 ** 31 - 1].map((seed) => [t, seed] as const)))(
		'%# : aucune clé de réponse, correction, graine ou modèle',
		(t, seed) => {
			const instance = generate(t, seed);
			const pub = toPublicQuestion(instance, { position: 3, delaySeconds: 20 });
			const json = JSON.parse(JSON.stringify(pub));
			const keys = allKeys(json);
			for (const forbidden of FORBIDDEN_KEYS) expect(keys.has(forbidden), forbidden).toBe(false);
			expect(allStrings(json)).not.toContain(t.id);
		}
	);

	it('question à cases : aucune réponse attendue parmi les valeurs (hors pré-remplies)', () => {
		for (const t of TEMPLATES.slice(1)) {
			for (const seed of [1, 7, 99]) {
				const instance = generate(t, seed);
				const pub = toPublicQuestion(instance, { position: 0, delaySeconds: 20 });
				const strings = allStrings(JSON.parse(JSON.stringify(pub)));
				for (const blank of instance.blanks ?? []) {
					if (blank.prefilled) continue;
					expect(strings).not.toContain(blank.expectedAnswer);
					if (blank.expectedAnswerLatex) expect(strings).not.toContain(blank.expectedAnswerLatex);
				}
			}
		}
	});

	it('QCM : les choix dans l’ordre affiché, sans indication de bonne réponse', () => {
		const instance = generate(TEMPLATES[0], 5);
		const pub = toPublicQuestion(instance, { position: 0, delaySeconds: 20 });
		expect(pub.type).toBe('multiple_choice');
		expect(pub.choices?.map((c) => c.content)).toEqual(
			instance.shuffledChoices?.map((c) => c.content)
		);
		expect(Object.keys(pub.choices?.[0] ?? {})).toEqual(['content']);
	});

	it('garde ce qu’il faut pour saisir : énoncé, type des cases, unité, position, durée', () => {
		const instance = generate(TEMPLATES[1], 11);
		const pub = toPublicQuestion(instance, { position: 2, delaySeconds: 45 });
		expect(pub).toMatchObject({ position: 2, delaySeconds: 45, statement: instance.statement });
		expect(pub.blanks?.length).toBe(instance.blanks?.length);
		expect(pub.blanks?.map((b) => b.type)).toEqual(instance.blanks?.map((b) => b.type));
		const unitBlank = pub.blanks?.find((b) => b.unit?.expected);
		if (unitBlank) expect(unitBlank.unitKeys?.length ?? 0).toBeGreaterThan(0);
	});
});

describe('toDisplayInstance : ce que le composant de saisie reçoit', () => {
	it('même type de question que l’instance complète', () => {
		for (const t of TEMPLATES) {
			const instance = generate(t, 3);
			const display = toDisplayInstance(
				toPublicQuestion(instance, { position: 0, delaySeconds: 20 })
			);
			expect(getQuestionType(display)).toBe(getQuestionType(instance));
		}
	});

	it('QCM : aucun choix marqué juste ; positions affichées = indices', () => {
		const instance = generate(TEMPLATES[0], 5);
		const display = toDisplayInstance(
			toPublicQuestion(instance, { position: 0, delaySeconds: 20 })
		);
		expect(display.choices?.every((c) => c.isCorrect === false)).toBe(true);
		expect(display.shuffledChoices?.map((c) => c.originalIndex)).toEqual(
			display.shuffledChoices?.map((_, i) => i)
		);
		expect(display.correctChoiceIndex).toBeUndefined();
	});

	it('question à cases : réponses attendues vides', () => {
		const instance = generate(TEMPLATES[2], 3);
		const display = toDisplayInstance(
			toPublicQuestion(instance, { position: 0, delaySeconds: 20 })
		);
		expect(display.blanks?.every((b) => b.expectedAnswer === '')).toBe(true);
		expect(display.correction).toBeUndefined();
	});
});

describe('niveau de la carte (clavier « n! » des cartes de Terminale)', () => {
	/** Une carte de Terminale à cases : seul son niveau change */
	function terminaleInstance(): QuestionInstance {
		return { ...generate(TEMPLATES[2], 3), grades: ['T_SPE', 'T_COMP'] };
	}

	it('grades exposé tel quel, les champs de réponse restent absents', () => {
		const instance = terminaleInstance();
		const pub = toPublicQuestion(instance, { position: 0, delaySeconds: 20 });
		expect(pub.grades).toEqual(['T_SPE', 'T_COMP']);
		const keys = allKeys(JSON.parse(JSON.stringify(pub)));
		for (const forbidden of FORBIDDEN_KEYS) expect(keys.has(forbidden), forbidden).toBe(false);
		for (const blank of instance.blanks ?? []) {
			expect(allStrings(JSON.parse(JSON.stringify(pub)))).not.toContain(blank.expectedAnswer);
		}
	});

	it('copie, pas référence : modifier la version publique ne touche pas l’instance', () => {
		const instance = terminaleInstance();
		const pub = toPublicQuestion(instance, { position: 0, delaySeconds: 20 });
		pub.grades?.push('6');
		expect(instance.grades).toEqual(['T_SPE', 'T_COMP']);
	});

	it('toDisplayInstance rend le niveau au composant de saisie', () => {
		const display = toDisplayInstance(
			toPublicQuestion(terminaleInstance(), { position: 0, delaySeconds: 20 })
		);
		expect(display.grades).toEqual(['T_SPE', 'T_COMP']);
	});

	it('sans niveau : ni champ grades, ni niveau inventé', () => {
		const instance = { ...terminaleInstance(), grades: [] };
		const pub = toPublicQuestion(instance, { position: 0, delaySeconds: 20 });
		expect('grades' in pub).toBe(false);
		expect(toDisplayInstance(pub).grades).toEqual([]);
	});
});
