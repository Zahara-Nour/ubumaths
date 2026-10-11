/**
 * Aperçu admin, onglet « Entraînement » : mêmes touches d'unités qu'une série
 * d'entraînement (Q61). Une série (`buildSeriesItems`) ne fournit pas de
 * `unitKeys` : `FillBlanksInput` les déduit de l'instance. L'aperçu doit
 * proposer exactement le même onglet « Unités » que `TestInteractive`.
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QuestionPreviewTabs from '../QuestionPreviewTabs.svelte';
import TestInteractive from '$lib/components/test/TestInteractive.svelte';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import { UNITS_LAYOUT_ID } from '$lib/questions/units/keyboard-units';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { MathfieldElement, VirtualKeyboardKeycap, VirtualKeyboardLayout } from 'mathlive';

const statement =
	'Distance : $\\placeholder[0]{}$, masse : $\\placeholder[1]{}$' as ResolvedMarkdown;
// Deux cases à unité imposée : l'ordre des touches dépend du calcul employé
const blanks: InstanceBlank[] = [
	{ type: 'math', expectedAnswer: '5\\unit{km}', unit: { expected: true, required: 'km' } },
	{ type: 'math', expectedAnswer: '3\\unit{kg}', unit: { expected: true, required: 'kg' } }
];

function unitInstance(): QuestionInstance {
	return {
		templateId: 'tpl-unites',
		statement,
		blanks,
		grades: ['6'],
		theme: 'Grandeurs',
		domain: 'Grandeurs et mesures',
		level: 1,
		generatedAt: new Date().toISOString()
	} as QuestionInstance;
}

/** Onglets déclarés au clavier (dernière affectation de `layouts`) */
let recordedLayouts: readonly (string | VirtualKeyboardLayout)[] = ['default'];

/**
 * Vitest navigateur tourne dans une iframe : le proxy de clavier de MathLive n'a
 * qu'un setter pour `layouts`. On le mémorise (même procédé que
 * FillBlanksInput-intervals-keyboard).
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

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
	recordedLayouts = ['default'];
});

/** Touches de l'onglet « Unités » déclaré au focus du premier champ de `root` */
async function unitKeysOffered(root: HTMLElement): Promise<string[]> {
	await expect.poll(() => root.querySelector('math-field')).toBeTruthy();
	const field = root.querySelector('math-field') as MathfieldElement;
	await expect
		.poll(() => {
			field.focus();
			return document.activeElement === field;
		})
		.toBe(true);
	const unitsLayout = () =>
		recordedLayouts.find(
			(layout): layout is VirtualKeyboardLayout =>
				typeof layout !== 'string' && 'id' in layout && layout.id === UNITS_LAYOUT_ID
		);
	await expect.poll(unitsLayout).toBeDefined();
	const layout = unitsLayout();
	// Le clavier des unités est déclaré par `rows` (une seule couche) : on l'affirme
	// au lieu de retomber sur une liste vide qui ferait passer « aucune touche »
	if (layout === undefined || !('rows' in layout)) {
		throw new Error('clavier des unités attendu, déclaré par `rows`');
	}
	const rows = layout.rows;
	const keys = rows
		.flat()
		.filter(
			(key): key is Partial<VirtualKeyboardKeycap> => typeof key !== 'string' && !!key.tooltip
		)
		.map((key) => key.tooltip ?? '');
	field.blur();
	return keys;
}

describe('QuestionPreviewTabs — touches d’unités (Entraînement)', () => {
	it('mêmes touches qu’une série d’entraînement (TestInteractive)', async () => {
		const serie = await render(TestInteractive, {
			target: mainElement(),
			props: {
				// Item tel que buildSeriesItems le construit : sans unitKeys
				items: [{ instance: unitInstance(), delaySeconds: 600, categoryKey: 'x' }],
				isLoggedIn: true,
				onComplete: vi.fn(),
				onRestart: vi.fn(),
				onBack: vi.fn()
			}
		});
		const serieKeys = await unitKeysOffered(serie.container);
		await serie.unmount();

		const apercu = await render(QuestionPreviewTabs, {
			target: mainElement(),
			props: { instance: unitInstance() }
		});
		const apercuKeys = await unitKeysOffered(apercu.container);

		expect(serieKeys.slice(0, 2)).toEqual(['km', 'kg']);
		expect(apercuKeys).toEqual(serieKeys);
	});
});
