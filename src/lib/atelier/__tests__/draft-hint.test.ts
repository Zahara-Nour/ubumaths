/**
 * Le modèle « sur [a;b] » sous le champ de la console, pour une définition de
 * fonction (phase 0 `docs/wip/modele-definition-progress.md`, validée le
 * 2026-11-14).
 */

import { describe, it, expect } from 'vitest';
import { definitionHint, INTERVAL_MODEL } from '../draft-hint';
import { draftTextOf } from '../natural-input';

describe('le modèle d’une définition de fonction', () => {
	it('montre « sur [0;3] » avec le nom et la variable tapés', () => {
		expect(definitionHint('f(x) = x^2 - 3', 'text')).toEqual({
			model: 'f(x) = x² sur [0;3]',
			note: 'pour choisir l’ensemble'
		});
		expect(definitionHint('g(t)=3t+1', 'text')?.model).toBe('g(t) = t² sur [0;3]');
		expect(definitionHint('f_1(x) = ', 'text')?.model).toBe('f_1(x) = x² sur [0;3]');
	});

	it('apparaît dès le signe égal, avant le corps', () => {
		expect(definitionHint('h(x) =', 'text')?.model).toBe('h(x) = x² sur [0;3]');
		expect(definitionHint('h(x)', 'text')).toBeNull();
	});

	it('« sur » tapé : le modèle de l’intervalle', () => {
		for (const draft of [
			'f(x) = x^2 sur',
			'f(x) = x^2 sur ',
			'f(x) = x^2 sur [0;',
			'f(x) = 1/x sur ]0;+∞['
		]) {
			expect(definitionHint(draft, 'text'), draft).toEqual({ model: INTERVAL_MODEL });
		}
		expect(INTERVAL_MODEL).toBe('[a;b], ]a;b[, [0;+∞[');
	});

	it('« sur » au milieu d’un mot n’est pas le mot de l’intervalle', () => {
		expect(definitionHint('f(x) = surface', 'text')?.model).toBe('f(x) = x² sur [0;3]');
		expect(definitionHint('f(x) = 3 sur 4', 'text')?.model).toBe('f(x) = x² sur [0;3]');
	});

	it('rien pour un calcul, une valeur, une commande', () => {
		for (const draft of [
			'',
			'3+4',
			'a = 3',
			'f(2)',
			'.dériver f',
			'résoudre f(x) = 0',
			'f = x^2'
		]) {
			expect(definitionHint(draft, 'text'), draft).toBeNull();
		}
	});

	describe('dans le champ mathématique (la ligne relue en texte)', () => {
		const draft = (latex: string) => draftTextOf(latex, []);

		it('même modèle pour une définition', () => {
			expect(definitionHint(draft(String.raw`f\left(x\right)=x^2-3`), 'math')?.model).toBe(
				'f(x) = x² sur [0;3]'
			);
			expect(definitionHint(draft(String.raw`g(t)=3t`), 'math')?.model).toBe('g(t) = t² sur [0;3]');
		});

		// MathLive colle « sur » à ce qui précède (`x+1sur…`, mesuré dans
		// `intervalle-champ.svelte.test.ts`), même après une lettre
		it('« sur » collé à la définition : le modèle de l’intervalle', () => {
			for (const latex of [
				'f(x)=x^2sur',
				'f(x)=xsur',
				String.raw`f(x)=xsur\left\lbrack0;`,
				String.raw`f(x)=x\text{ sur }[0;+\infty[`
			]) {
				expect(definitionHint(draft(latex), 'math'), latex).toEqual({ model: INTERVAL_MODEL });
			}
		});

		it('rien pour un calcul', () => {
			expect(definitionHint(draft('3+4'), 'math')).toBeNull();
		});
	});
});
