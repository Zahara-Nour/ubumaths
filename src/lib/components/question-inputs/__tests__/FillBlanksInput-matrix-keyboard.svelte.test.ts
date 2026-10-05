/**
 * FillBlanksInput — case « matrice » : onglet « Matrice » du clavier virtuel et
 * saisie RÉELLE dans MathLive (gabarit puis frappes, flèche droite d'un
 * coefficient au suivant, ajout d'une ligne) relue par la correction.
 * L'onglet n'apparaît QUE pour une case « matrice ».
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { VirtualKeyboardKeycap, VirtualKeyboardLayout, MathfieldElement } from 'mathlive';

const statement = 'Calcule $AB$ : $\\placeholder[0]{}$' as ResolvedMarkdown;
const M = '\\begin{pmatrix}2&-1\\\\0&3\\end{pmatrix}';
const matrixBlank: InstanceBlank = { type: 'math', expectedAnswer: M, answerKind: 'matrice' };

/** Onglets déclarés au clavier par le composant (dernière affectation de `layouts`) */
let recordedLayouts: readonly (string | VirtualKeyboardLayout)[] = ['default'];

/** Même enveloppe du proxy de clavier que FillBlanksInput-vector-keyboard */
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

function layoutLabelled(label: string): VirtualKeyboardLayout | undefined {
	return window.mathVirtualKeyboard.layouts.find(
		(layout): layout is VirtualKeyboardLayout =>
			typeof layout !== 'string' && layout.label === label
	);
}

function keycap(tooltip: string): Partial<VirtualKeyboardKeycap> {
	const layout = layoutLabelled('Matrice');
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

function instanceFor(blank: InstanceBlank): QuestionInstance {
	return {
		templateId: 'test-matrix-keyboard',
		statement,
		blanks: [blank],
		grades: ['T_EXP'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

function statusOf(value: string, blank: InstanceBlank = matrixBlank): string | undefined {
	const result = validateAnswer([value], instanceFor(blank), [value]);
	return result.status ?? (result.isCorrect ? 'correct' : 'incorrect');
}

describe('FillBlanksInput — case « matrice »', () => {
	it('focus : onglet « Matrice » en plus des onglets par défaut, pas d’onglet « Vecteur »', async () => {
		await render(FillBlanksInput, { props: { statement, blanks: [matrixBlank] } });
		await focusedMathField();
		await expect.poll(() => layoutLabelled('Matrice')).toBeDefined();
		expect(window.mathVirtualKeyboard.layouts[0]).toBe('default');
		expect(layoutLabelled('Vecteur')).toBeUndefined();
	});

	it('gabarit 2 × 2, frappes et flèche droite : relu juste', async () => {
		await render(FillBlanksInput, { props: { statement, blanks: [matrixBlank] } });
		const mathField = await focusedMathField();
		await expect.poll(() => layoutLabelled('Matrice')).toBeDefined();

		mathField.executeCommand(['insert', keycap('Matrice 2 × 2').insert!]);
		await userEvent.keyboard('2{ArrowRight}-1{ArrowRight}0{ArrowRight}3');

		const value = mathField.getPromptValue('0');
		expect(value).toMatch(/^\\begin\{pmatrix\}2\s*&\s*-1\s*\\\\\s*0\s*&\s*3\s*\\end\{pmatrix\}$/);
		expect(statusOf(value)).toBe('correct');
	});

	it('coefficient non simplifié tapé au clavier : juste avec avertissement', async () => {
		await render(FillBlanksInput, { props: { statement, blanks: [matrixBlank] } });
		const mathField = await focusedMathField();
		await expect.poll(() => layoutLabelled('Matrice')).toBeDefined();

		mathField.executeCommand(['insert', keycap('Matrice 2 × 2').insert!]);
		await userEvent.keyboard('4/2{ArrowRight}{ArrowRight}-1{ArrowRight}0{ArrowRight}3');

		const value = mathField.getPromptValue('0');
		expect(statusOf(value)).toBe('unoptimal_form');
	});

	it('gabarit 3 × 3 puis « + ligne » : matrice 4 × 3 relue', async () => {
		const expected = '\\begin{pmatrix}1&2&3\\\\4&5&6\\\\7&8&9\\\\0&0&1\\end{pmatrix}';
		const blank: InstanceBlank = { type: 'math', expectedAnswer: expected, answerKind: 'matrice' };
		await render(FillBlanksInput, { props: { statement, blanks: [blank] } });
		const mathField = await focusedMathField();
		await expect.poll(() => layoutLabelled('Matrice')).toBeDefined();

		mathField.executeCommand(['insert', keycap('Matrice 3 × 3').insert!]);
		await userEvent.keyboard(
			'1{ArrowRight}2{ArrowRight}3{ArrowRight}4{ArrowRight}5{ArrowRight}6{ArrowRight}7{ArrowRight}8{ArrowRight}9'
		);
		mathField.executeCommand(keycap('Ajouter une ligne sous le curseur').command as never);
		await userEvent.keyboard('0{ArrowRight}0{ArrowRight}1');

		const value = mathField.getPromptValue('0');
		expect(statusOf(value, blank)).toBe('correct');
	});

	it('case ordinaire ou « vecteur » : pas d’onglet « Matrice »', async () => {
		await render(FillBlanksInput, {
			props: {
				statement,
				blanks: [{ type: 'math', expectedAnswer: '(2;-3)', answerKind: 'vecteur' }]
			}
		});
		await focusedMathField();
		await expect.poll(() => layoutLabelled('Vecteur')).toBeDefined();
		expect(layoutLabelled('Matrice')).toBeUndefined();
	});
});
