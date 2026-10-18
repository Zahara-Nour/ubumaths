/**
 * Suivi de la revue de #1504 : les champs sous la ligne d'une suite — rang,
 * premier terme, marches — suivent le contrat de la définition (lot 3) :
 * rangés à Entrée ou à la sortie du champ, et Échap RÉTABLIT la valeur rangée,
 * sans que la sortie qui suit range la saisie annulée.
 *
 * Au vrai clavier (`userEvent`) : c'est le geste de l'élève qui rangeait « 05 ».
 *
 * Asserte le RENDU et ce que l'atelier a rangé.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { isSequence, type SequenceObject } from '$lib/atelier/types';
import { cardOf } from './harness/function-card';

// =============================================================================
// Décor
// =============================================================================

function input(root: ParentNode, label: string): HTMLInputElement {
	const found = root.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement | null;
	if (!found) throw new Error(`pas de champ « ${label} »`);
	return found;
}

function sequenceOf(atelier: Atelier): SequenceObject {
	const u = atelier.get('u');
	if (!u || !isSequence(u)) throw new Error('pas de suite u');
	return u;
}

/** Taper au bout du champ, puis Échap, puis quitter le champ (Tab). */
async function typeEscapeThenLeave(field: HTMLInputElement, keys: string) {
	// `focus()` et non un clic : au centre d'un champ numérique étroit, le clic
	// tombe sur la flèche « + » du navigateur (mesuré : 0 devient 1)
	field.focus();
	await vi.waitFor(() => expect(document.activeElement).toBe(field));
	await userEvent.keyboard(`{End}${keys}`);
	await userEvent.keyboard('{Escape}');
	await userEvent.keyboard('{Tab}');
}

/** u(n+1) = 0,5u(n) + 3, tracée en escalier. */
async function cobwebSequence() {
	const atelier = new Atelier();
	atelier.create({ kind: 'sequence', name: 'u', definition: '0,5u_n + 3' }, 'text');
	atelier.setPlotted('u', true);
	atelier.setSequenceDisplay('u', { representation: 'cobweb' });
	const { container } = await render(WithAtelier, { atelier });
	return { atelier, card: cardOf(container, 'u') };
}

// =============================================================================
// Échap rétablit
// =============================================================================

describe('Échap dans les champs d’une suite', () => {
	it('le premier terme : Échap rétablit, et quitter le champ ne range rien', async () => {
		const { atelier, card } = await cobwebSequence();
		const first = input(card, 'u(0) =, premier terme de u');

		await typeEscapeThenLeave(first, '5');

		expect(first.value).toBe('0');
		expect(sequenceOf(atelier).firstTerm).toBe('0');
	});

	it('le rang : Échap rétablit, et quitter le champ ne range rien', async () => {
		const { atelier, card } = await cobwebSequence();
		const rank = input(card, 'Rang du premier terme de u');

		await typeEscapeThenLeave(rank, '7');

		expect(rank.value).toBe('0');
		expect(sequenceOf(atelier).firstIndex).toBe(0);
	});

	it('les marches : Échap rétablit, et quitter le champ ne range rien', async () => {
		const { atelier, card } = await cobwebSequence();
		const steps = input(card, 'marches de u');
		const before = sequenceOf(atelier).display?.cobwebSteps;

		// Une valeur VALABLE (4 marches) : ajoutée au bout, « 109 » serait refusée
		steps.focus();
		steps.select();
		await userEvent.keyboard('4{Escape}{Tab}');

		expect(steps.value).toBe(String(before));
		expect(sequenceOf(atelier).display?.cobwebSteps).toBe(before);
	});

	it('Échap efface le refus affiché sur le champ', async () => {
		const { card } = await cobwebSequence();
		const first = input(card, 'u(0) =, premier terme de u');

		first.focus();
		first.select();
		await userEvent.keyboard('u{Enter}');
		await vi.waitFor(() => expect(first.getAttribute('aria-invalid')).toBe('true'));

		first.focus();
		await userEvent.keyboard('{End}9{Escape}');

		await vi.waitFor(() => expect(first.getAttribute('aria-invalid')).toBe('false'));
		expect(card.querySelector('.refus-suite')?.textContent ?? '').toBe('');
	});

	it('Entrée range toujours la saisie', async () => {
		const { atelier, card } = await cobwebSequence();
		const first = input(card, 'u(0) =, premier terme de u');

		first.focus();
		await userEvent.keyboard('{End}5{Enter}');

		await vi.waitFor(() => expect(sequenceOf(atelier).firstTerm).toBe('05'));
	});
});

// =============================================================================
// Un champ vidé
// =============================================================================

describe('un champ de suite vidé', () => {
	it('reprend la valeur rangée ET efface l’ancien refus', async () => {
		const { card } = await cobwebSequence();
		const first = input(card, 'u(0) =, premier terme de u');

		first.focus();
		first.select();
		await userEvent.keyboard('u{Enter}');
		await vi.waitFor(() => expect(first.getAttribute('aria-invalid')).toBe('true'));

		// `select()` : Ctrl+A ne sélectionne pas tout sous macOS (début de ligne)
		first.focus();
		first.select();
		await userEvent.keyboard('{Backspace}{Enter}');

		await vi.waitFor(() => expect(first.getAttribute('aria-invalid')).toBe('false'));
		expect(first.value).toBe('0');
		expect(card.querySelector('.refus-suite')?.textContent ?? '').toBe('');
	});
});
