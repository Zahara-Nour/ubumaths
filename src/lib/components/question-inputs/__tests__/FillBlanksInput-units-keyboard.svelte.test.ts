/**
 * FillBlanksInput — onglet « Unités » du clavier virtuel MathLive
 *
 * Quand un trou à unité reçoit le focus, le clavier virtuel (singleton global
 * `window.mathVirtualKeyboard`) gagne un onglet « Unités » en plus des onglets
 * par défaut ; il le perd au blur et au démontage. Une touche insère la forme
 * affichée de l'unité, que la correction relit.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { VirtualKeyboardKeycap, VirtualKeyboardLayout, MathfieldElement } from 'mathlive';

const statement = 'Distance : $\\placeholder[0]{}$' as ResolvedMarkdown;
const unitBlank: InstanceBlank = {
	type: 'math',
	expectedAnswer: '5\\unit{km}',
	unit: { expected: true }
};

/** Onglets déclarés au clavier par le composant (dernière affectation de `layouts`) */
let recordedLayouts: readonly (string | VirtualKeyboardLayout)[] = ['default'];

/**
 * Import dynamique : un `import 'mathlive'` statique casse le mocker de vitest.
 *
 * Vitest (navigateur) exécute les tests dans une IFRAME : MathLive y installe un
 * `VirtualKeyboardProxy` dont `layouts` n'a qu'un setter (il poste un message à
 * `window.top`). En production, page de premier niveau, le vrai clavier relit
 * `layouts`. On enveloppe donc le proxy : `layouts` est mémorisé (comme le vrai
 * getter) PUIS transmis au proxy ; tout le reste passe tel quel.
 */
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

function keyboard() {
	return window.mathVirtualKeyboard;
}

/** L'onglet « Unités » actuellement déclaré au clavier, s'il existe */
function unitsLayout(): VirtualKeyboardLayout | undefined {
	return keyboard().layouts.find(
		(layout): layout is VirtualKeyboardLayout =>
			typeof layout !== 'string' && layout.label === 'Unités'
	);
}

/** Touches d'unité (celles qui insèrent quelque chose) de l'onglet */
function unitKeycaps(layout: VirtualKeyboardLayout): Partial<VirtualKeyboardKeycap>[] {
	const rows = 'rows' in layout ? layout.rows : [];
	return rows
		.flat()
		.filter(
			(key): key is Partial<VirtualKeyboardKeycap> => typeof key !== 'string' && !!key.insert
		);
}

/** Donne le focus au `index`-ième math-field de la page */
async function focusedMathField(index = 0): Promise<MathfieldElement> {
	await expect.poll(() => document.querySelectorAll('math-field')[index]).toBeTruthy();
	const mathField = document.querySelectorAll('math-field')[index] as MathfieldElement;
	// Le math-field ne prend le focus qu'une fois monté : réessayer jusqu'à ce qu'il l'ait
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
		templateId: 'test-units-keyboard',
		statement,
		blanks,
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

describe('FillBlanksInput — onglet « Unités »', () => {
	it('focus dans un trou à unité : onglet « Unités » en plus des onglets par défaut', async () => {
		await render(FillBlanksInput, { props: { statement, blanks: [unitBlank] } });
		await focusedMathField();

		await expect.poll(() => unitsLayout()).toBeDefined();
		// 'default' = numeric, symbols, alphabetic, greek (déplié par MathLive)
		expect(keyboard().layouts[0]).toBe('default');

		const inserts = unitKeycaps(unitsLayout()!).map((key) => key.insert);
		expect(inserts).toEqual(['\\mathrm{mm}', '\\mathrm{cm}', '\\mathrm{m}', '\\mathrm{km}']);
	});

	it('5 puis la touche « km » : la valeur du trou est acceptée par la correction', async () => {
		await render(FillBlanksInput, { props: { statement, blanks: [unitBlank] } });
		const mathField = await focusedMathField();
		await expect.poll(() => unitsLayout()).toBeDefined();

		const kmKey = unitKeycaps(unitsLayout()!).find((key) => key.insert === '\\mathrm{km}');
		expect(kmKey).toBeDefined();

		// Ce que fait une touche `insert` du clavier : insérer au curseur du champ actif
		mathField.executeCommand(['insert', '5']);
		mathField.executeCommand(['insert', kmKey!.insert!]);

		const value = mathField.getPromptValue('0');
		expect(value).toBe('5\\mathrm{km}');
		expect(validateAnswer([value], instanceFor([unitBlank])).isCorrect).toBe(true);
	});

	it('blur puis démontage : le clavier retrouve ses onglets par défaut', async () => {
		const { unmount } = await render(FillBlanksInput, {
			props: { statement, blanks: [unitBlank] }
		});
		const mathField = await focusedMathField();
		await expect.poll(() => unitsLayout()).toBeDefined();

		mathField.blur();
		await expect.poll(() => unitsLayout()).toBeUndefined();

		mathField.focus();
		await expect.poll(() => unitsLayout()).toBeDefined();
		await unmount();
		expect(unitsLayout()).toBeUndefined();
	});

	it('focus qui passe à une question sans trou à unité : l’onglet disparaît', async () => {
		await render(FillBlanksInput, { props: { statement, blanks: [unitBlank] } });
		await render(FillBlanksInput, {
			props: { statement, blanks: [{ type: 'math', expectedAnswer: '3' }] }
		});
		await focusedMathField();
		await expect.poll(() => unitsLayout()).toBeDefined();

		await focusedMathField(1);
		await expect.poll(() => unitsLayout()).toBeUndefined();
	});

	it('touche « ° » dans le vrai MathLive : relue par la correction', async () => {
		const angleBlank: InstanceBlank = {
			type: 'math',
			expectedAnswer: '30\\unit{°}',
			unit: { expected: true }
		};
		await render(FillBlanksInput, { props: { statement, blanks: [angleBlank] } });
		const mathField = await focusedMathField();
		await expect.poll(() => unitsLayout()).toBeDefined();

		const [degreeKey] = unitKeycaps(unitsLayout()!);
		mathField.executeCommand(['insert', '30']);
		mathField.executeCommand(['insert', degreeKey.insert!]);

		const value = mathField.getPromptValue('0');
		expect(validateAnswer([value], instanceFor([angleBlank])).isCorrect, value).toBe(true);
	});
});
