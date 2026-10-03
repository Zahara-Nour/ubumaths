/**
 * FillBlanksInput — case « vecteur » : onglet « Vecteur » du clavier virtuel et
 * saisie RÉELLE dans MathLive (touche colonne puis frappes, coordonnées tapées
 * entre parenthèses) relue par la correction. Mesure du 2026-10-03.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { VirtualKeyboardKeycap, VirtualKeyboardLayout, MathfieldElement } from 'mathlive';

// Case seule dans sa formule : `$\vec{n}=?$` n'affiche PAS de case (le parseur
// mathAST ne connaît pas `\vec`, la formule est rendue statique — mesuré le 2026-10-03)
const statement = 'Un vecteur normal $\\vec{n}$ : $\\placeholder[0]{}$' as ResolvedMarkdown;
const vectorBlank: InstanceBlank = {
	type: 'math',
	expectedAnswer: '(2;-3)',
	answerKind: 'vecteur',
	vectorMode: 'colineaire'
};

/** Onglets déclarés au clavier par le composant (dernière affectation de `layouts`) */
let recordedLayouts: readonly (string | VirtualKeyboardLayout)[] = ['default'];

/** Même enveloppe du proxy de clavier que FillBlanksInput-intervals-keyboard */
beforeAll(async () => {
	await import('mathlive');
	await customElements.whenDefined('math-field');
	const proxy = window.mathVirtualKeyboard;
	const recorder = new Proxy(proxy, {
		get(target, property) {
			if (property === 'layouts') return recordedLayouts;
			const value: unknown = Reflect.get(target, property, target);
			return typeof value === 'function' ? value.bind(target) : value;
		},
		set(target, property, value) {
			if (property === 'layouts') {
				recordedLayouts = Array.isArray(value) ? [...value] : [value];
			}
			return Reflect.set(target, property, value, target);
		}
	});
	Object.defineProperty(window, 'mathVirtualKeyboard', { get: () => recorder, configurable: true });
});

/** L'onglet « Vecteur » actuellement déclaré au clavier, s'il existe */
function vectorLayout(): VirtualKeyboardLayout | undefined {
	return window.mathVirtualKeyboard.layouts.find(
		(layout): layout is VirtualKeyboardLayout =>
			typeof layout !== 'string' && layout.label === 'Vecteur'
	);
}

function keycap(tooltip: string): Partial<VirtualKeyboardKeycap> {
	const layout = vectorLayout();
	const rows = layout && 'rows' in layout ? layout.rows : [];
	const key = rows
		.flat()
		.find(
			(candidate): candidate is Partial<VirtualKeyboardKeycap> =>
				typeof candidate !== 'string' && candidate.tooltip === tooltip
		);
	if (!key) throw new Error(`touche absente : ${tooltip}`);
	return key;
}

async function focusedMathField(): Promise<MathfieldElement> {
	await expect.poll(() => document.querySelector('math-field')).toBeTruthy();
	const mathField = document.querySelector('math-field') as MathfieldElement;
	await expect
		.poll(() => {
			mathField.focus();
			return document.activeElement === mathField;
		})
		.toBe(true);
	return mathField;
}

function instanceFor(blanks: InstanceBlank[]): QuestionInstance {
	return {
		templateId: 'test-vector-keyboard',
		statement,
		blanks,
		grades: ['1_SPE'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

function judged(value: string): boolean {
	return validateAnswer([value], instanceFor([vectorBlank]), [value]).isCorrect;
}

describe('FillBlanksInput — case « vecteur »', () => {
	it('focus : onglet « Vecteur » en plus des onglets par défaut', async () => {
		await render(FillBlanksInput, { props: { statement, blanks: [vectorBlank] } });
		await focusedMathField();
		await expect.poll(() => vectorLayout()).toBeDefined();
		expect(window.mathVirtualKeyboard.layouts[0]).toBe('default');
	});

	// Mesuré : la flèche droite (touche [right] de l'onglet) passe à la case suivante de
	// la colonne ; ni Tab, ni flèche bas, ni `moveToNextPlaceholder` ne le font
	it('touche « colonne », frappes -4, flèche droite, 6 : relu juste', async () => {
		await render(FillBlanksInput, { props: { statement, blanks: [vectorBlank] } });
		const mathField = await focusedMathField();
		await expect.poll(() => vectorLayout()).toBeDefined();

		mathField.executeCommand(['insert', keycap('Vecteur du plan, en colonne').insert!]);
		await userEvent.keyboard('-4');
		await userEvent.keyboard('{ArrowRight}');
		await userEvent.keyboard('6');

		const value = mathField.getPromptValue('0');
		expect(value).toMatch(/^\\begin\{pmatrix\}-4\\\\ ?6\\end\{pmatrix\}$/);
		expect(judged(value)).toBe(true);
	});

	it('coordonnées tapées au clavier physique (smartFence) : relu juste', async () => {
		await render(FillBlanksInput, { props: { statement, blanks: [vectorBlank] } });
		const mathField = await focusedMathField();
		await userEvent.keyboard('(-2;3)');

		const value = mathField.getPromptValue('0');
		expect(judged(value)).toBe(true);
	});

	it('touche « coordonnées en ligne » avec une fraction : relu juste', async () => {
		await render(FillBlanksInput, { props: { statement, blanks: [vectorBlank] } });
		const mathField = await focusedMathField();
		await expect.poll(() => vectorLayout()).toBeDefined();

		mathField.executeCommand(['insert', keycap('Coordonnées en ligne').insert!]);
		await userEvent.keyboard('1');
		await userEvent.keyboard('{ArrowRight}');
		mathField.executeCommand(['insert', '-\\frac{3}{2}']);

		const value = mathField.getPromptValue('0');
		expect(judged(value)).toBe(true);
	});

	it('case ordinaire : pas d’onglet « Vecteur »', async () => {
		await render(FillBlanksInput, {
			props: { statement, blanks: [{ type: 'math', expectedAnswer: '3' }] }
		});
		await focusedMathField();
		expect(vectorLayout()).toBeUndefined();
	});
});
