/**
 * SelfAssessButtons : « Pas réussi / Réussi » et raccourcis 1 / 2
 * ===============================================================
 *
 * Les raccourcis ne notent que si on les a demandés, jamais pendant une
 * saisie (champ texte ou MathLive), jamais en touche maintenue.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import SelfAssessButtons from '../SelfAssessButtons.svelte';

function press(key: string, target: EventTarget = window, repeat = false) {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, repeat, bubbles: true }));
}

describe('SelfAssessButtons', () => {
	it('les deux boutons transmettent réussi / pas réussi', async () => {
		const onAssess = vi.fn();
		await render(SelfAssessButtons, { onAssess });
		await page.getByRole('button', { name: 'Pas réussi' }).click();
		await page.getByRole('button', { name: 'Réussi', exact: true }).click();
		expect(onAssess.mock.calls).toEqual([[false], [true]]);
	});

	it('sans `keyboard`, les touches 1 et 2 ne notent rien', async () => {
		const onAssess = vi.fn();
		await render(SelfAssessButtons, { onAssess });
		press('1');
		press('2');
		expect(onAssess).not.toHaveBeenCalled();
	});

	it('avec `keyboard` : 1 = pas réussi, 2 = réussi, touche maintenue ignorée', async () => {
		const onAssess = vi.fn();
		await render(SelfAssessButtons, { onAssess, keyboard: true });
		press('1');
		press('2');
		press('2', window, true);
		expect(onAssess.mock.calls).toEqual([[false], [true]]);
	});

	it('une saisie (champ texte, MathLive) ne note pas', async () => {
		const onAssess = vi.fn();
		await render(SelfAssessButtons, { onAssess, keyboard: true });
		const input = document.body.appendChild(document.createElement('input'));
		const mathField = document.body.appendChild(document.createElement('math-field'));
		const inner = mathField.appendChild(document.createElement('span'));
		press('1', input);
		press('2', inner);
		expect(onAssess).not.toHaveBeenCalled();
		input.remove();
		mathField.remove();
	});

	it('désactivé : ni clic ni touche', async () => {
		const onAssess = vi.fn();
		await render(SelfAssessButtons, { onAssess, keyboard: true, disabled: true });
		press('2');
		expect(onAssess).not.toHaveBeenCalled();
	});
});
