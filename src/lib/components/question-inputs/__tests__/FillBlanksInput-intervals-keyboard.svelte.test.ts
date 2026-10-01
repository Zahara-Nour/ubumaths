/**
 * FillBlanksInput — case « intervalles » : onglet « Intervalles » du clavier
 * virtuel et `smartFence` coupé (mesure du 2026-10-01 : avec `smartFence`,
 * taper `[` ouvre une paire refermée d'office et `[2;3[` devient illisible).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { VirtualKeyboardKeycap, VirtualKeyboardLayout, MathfieldElement } from 'mathlive';

const statement = 'Solutions : $S=\\placeholder[0]{}$' as ResolvedMarkdown;
const intervalBlank: InstanceBlank = {
	type: 'math',
	expectedAnswer: ']2;3[\\cup[4;+\\infty[',
	answerKind: 'intervalles'
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

/** L'onglet « Intervalles » actuellement déclaré au clavier, s'il existe */
function intervalsLayout(): VirtualKeyboardLayout | undefined {
	return keyboard().layouts.find(
		(layout): layout is VirtualKeyboardLayout =>
			typeof layout !== 'string' && layout.label === 'Intervalles'
	);
}

/** Touches (celles qui insèrent quelque chose) de l'onglet */
function keycaps(layout: VirtualKeyboardLayout): Partial<VirtualKeyboardKeycap>[] {
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
		templateId: 'test-intervals-keyboard',
		statement,
		blanks,
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

describe('FillBlanksInput — case « intervalles »', () => {
	it('focus : onglet « Intervalles » en plus des onglets par défaut', async () => {
		await render(FillBlanksInput, { props: { statement, blanks: [intervalBlank] } });
		await focusedMathField();

		await expect.poll(() => intervalsLayout()).toBeDefined();
		expect(keyboard().layouts[0]).toBe('default');
		expect(keycaps(intervalsLayout()!).map((key) => key.latex)).toContain('\\cup');
	});

	it('focus : smartFence coupé sur le champ', async () => {
		await render(FillBlanksInput, { props: { statement, blanks: [intervalBlank] } });
		const mathField = await focusedMathField();
		await expect.poll(() => mathField.smartFence).toBe(false);
	});

	it('frappes réelles ]2;3[ puis la réunion : la correction relit la saisie', async () => {
		await render(FillBlanksInput, { props: { statement, blanks: [intervalBlank] } });
		const mathField = await focusedMathField();
		await expect.poll(() => mathField.smartFence).toBe(false);

		// userEvent : « [[ » = la touche « [ » (« [ » seul ouvre un nom de touche)
		await userEvent.keyboard(']2;3[[');
		const cup = keycaps(intervalsLayout()!).find((key) => key.latex === '\\cup');
		mathField.executeCommand(['insert', cup!.insert!]);
		await userEvent.keyboard('[[4;+oo[[');

		const value = mathField.getPromptValue('0');
		expect(value).toBe(']2;3[\\cup[4;+\\infty[');
		expect(validateAnswer([value], instanceFor([intervalBlank]), [value]).isCorrect).toBe(true);
	});

	it('case ordinaire : ni onglet « Intervalles » ni smartFence coupé', async () => {
		await render(FillBlanksInput, {
			props: { statement, blanks: [{ type: 'math', expectedAnswer: '3' }] }
		});
		const mathField = await focusedMathField();
		expect(intervalsLayout()).toBeUndefined();
		expect(mathField.smartFence).toBe(true);
	});

	it('blur puis démontage : le clavier retrouve ses onglets par défaut', async () => {
		const { unmount } = await render(FillBlanksInput, {
			props: { statement, blanks: [intervalBlank] }
		});
		const mathField = await focusedMathField();
		await expect.poll(() => intervalsLayout()).toBeDefined();
		mathField.blur();
		await expect.poll(() => intervalsLayout()).toBeUndefined();
		await unmount();
		expect(intervalsLayout()).toBeUndefined();
	});

	it('champ voisin ordinaire : smartFence intact ; blur : smartFence restauré', async () => {
		const twoFields =
			'Solutions : $S=\\placeholder[0]{}$ et $x=\\placeholder[1]{}$' as ResolvedMarkdown;
		await render(FillBlanksInput, {
			props: {
				statement: twoFields,
				blanks: [intervalBlank, { type: 'math', expectedAnswer: '3' }]
			}
		});
		await expect.poll(() => document.querySelectorAll('math-field').length).toBe(2);

		const ordinary = await focusedMathField(1);
		await expect.poll(() => intervalsLayout()).toBeDefined();
		expect(ordinary.smartFence).toBe(true);

		const intervals = await focusedMathField(0);
		await expect.poll(() => intervals.smartFence).toBe(false);
		expect(ordinary.smartFence).toBe(true);

		intervals.blur();
		await expect.poll(() => intervals.smartFence).toBe(true);
	});
});
