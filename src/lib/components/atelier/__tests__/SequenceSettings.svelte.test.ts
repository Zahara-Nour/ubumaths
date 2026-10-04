/**
 * La carte d'une suite — lot 5b du passage de `/grapheur` par l'atelier
 * (phase 0 §5 U1 à U3, décisions S1 à S4).
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import WithAtelier from './harness/WithAtelier.svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { isSequence } from '$lib/atelier/types';

function cardFor(container: HTMLElement, name: string): HTMLElement {
	const card = [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	);
	if (!card) throw new Error(`pas de carte ${name}`);
	return card as HTMLElement;
}

async function openSequence(definition: string, setup?: (a: Atelier) => void) {
	const atelier = new Atelier();
	atelier.create({ kind: 'sequence', name: 'u', definition }, 'text');
	setup?.(atelier);
	const { container } = await render(WithAtelier, { atelier });
	(cardFor(container, 'u').querySelector('.entete') as HTMLButtonElement).click();
	await vi.waitFor(() => expect(cardFor(container, 'u').querySelector('math-field')).toBeTruthy());
	return { atelier, container, card: () => cardFor(container, 'u') };
}

function input(card: HTMLElement, label: string): HTMLInputElement {
	const found = card.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement | null;
	if (!found) throw new Error(`pas de champ « ${label} »`);
	return found;
}

/** Un bouton nuage / escalier, par son texte visible (WCAG 2.5.3). */
function choice(card: HTMLElement, label: string): HTMLButtonElement {
	const found = [...card.querySelectorAll('button.choix')].find(
		(b) => b.textContent?.replace('✓', '').trim() === label
	);
	if (!found) throw new Error(`pas de bouton « ${label} »`);
	return found as HTMLButtonElement;
}

function setInput(field: HTMLInputElement, value: string) {
	field.value = value;
	field.dispatchEvent(new Event('input', { bubbles: true }));
}

function sequence(atelier: Atelier) {
	const u = atelier.get('u');
	if (!u || !isSequence(u)) throw new Error('u');
	return u;
}

describe('la carte d’une suite (U1)', () => {
	it('une récurrence s’écrit u(n+1) =', async () => {
		const { card } = await openSequence('0,5u_n + 3');

		expect(card().querySelector('.prefixe')?.textContent?.replace(/\s+/g, '')).toBe('u(n+1)=');
	});

	it('une suite explicite s’écrit u(n) =', async () => {
		const { card } = await openSequence('2n + 1');

		expect(card().querySelector('.prefixe')?.textContent?.replace(/\s+/g, '')).toBe('u(n)=');
	});

	it('le premier terme se règle, et la suite le suit', async () => {
		const { atelier, card } = await openSequence('2u_n');

		setInput(input(card(), 'u(0) =, premier terme de u'), '3');

		await vi.waitFor(() => expect(sequence(atelier).firstTerm).toBe('3'));
	});

	it('le premier terme peut être une valeur de l’atelier (S1)', async () => {
		const { atelier, card } = await openSequence('2u_n', (a) =>
			a.create({ kind: 'value', name: 'a', definition: '4' }, 'text')
		);

		setInput(input(card(), 'u(0) =, premier terme de u'), 'a');

		await vi.waitFor(() => expect(sequence(atelier).firstTerm).toBe('a'));
	});

	it('le rang de départ se règle', async () => {
		const { atelier, card } = await openSequence('2u_n');

		setInput(input(card(), 'Rang du premier terme de u'), '1');

		await vi.waitFor(() => expect(sequence(atelier).firstIndex).toBe(1));
	});

	it('un réglage refusé se dit en quittant le champ, relié à lui seul', async () => {
		const { card } = await openSequence('2u_n');
		const first = input(card(), 'u(0) =, premier terme de u');

		setInput(first, 'u');
		// Pas pendant la frappe : l'alerte parlerait à chaque touche
		expect(card().querySelector('.refus-suite')?.textContent ?? '').toBe('');
		first.dispatchEvent(new Event('change', { bubbles: true }));

		await vi.waitFor(() =>
			expect(card().querySelector('.refus-suite')?.textContent).toContain('elle-même')
		);
		expect(first.getAttribute('aria-invalid')).toBe('true');
		expect(first.getAttribute('aria-describedby')).toBe('refus-suite-u');
		expect(input(card(), 'Rang du premier terme de u').getAttribute('aria-describedby')).toBeNull();
	});

	it('une suite explicite n’a pas de premier terme à régler', async () => {
		const { card } = await openSequence('2n + 1');

		expect(card().querySelector('input[aria-label="u(0) =, premier terme de u"]')).toBeNull();
		expect(card().querySelector('input[aria-label="Rang du premier terme de u"]')).toBeTruthy();
	});
});

describe('la suite sur le graphique (U2)', () => {
	it('a son 👁', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '2u_n' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		(cardFor(container, 'u').querySelector('.oeil') as HTMLButtonElement).click();

		await vi.waitFor(() => expect(atelier.get('u')?.plotted).toBe(true));
	});

	it('se règle en escalier, avec son nombre de marches', async () => {
		const { atelier, card } = await openSequence('0,5u_n + 3', (a) => a.setPlotted('u', true));

		choice(card(), 'escalier').click();
		await vi.waitFor(() => expect(sequence(atelier).display?.representation).toBe('cobweb'));

		setInput(input(card(), 'marches de u'), '4');
		await vi.waitFor(() => expect(sequence(atelier).display?.cobwebSteps).toBe(4));
	});

	it('l’escalier d’une suite explicite est désactivé, avec sa raison', async () => {
		const { card } = await openSequence('2n + 1', (a) => a.setPlotted('u', true));

		const cobweb = choice(card(), 'escalier');

		expect(cobweb.getAttribute('aria-disabled')).toBe('true');
		expect(card().textContent).toContain('demande une récurrence');
	});
});

describe('premiers termes (U3)', () => {
	it('écrit les termes dans Calcul, sans changer de vue', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '2u_n' }, 'text');
		atelier.setSequence('u', { firstTerm: '1' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		const graphTab = [...container.querySelectorAll('.onglet')].find((t) =>
			t.textContent?.trim().startsWith('Graphe')
		) as HTMLButtonElement;
		graphTab.click();
		(cardFor(container, 'u').querySelector('.entete') as HTMLButtonElement).click();

		const button = await vi.waitFor(() => {
			const found = [...cardFor(container, 'u').querySelectorAll('.action')].find(
				(b) => b.textContent?.trim() === 'Premiers termes'
			) as HTMLButtonElement | undefined;
			expect(found).toBeTruthy();
			return found!;
		});
		button.click();

		await vi.waitFor(() =>
			expect(container.querySelector('.onglet[aria-current="page"]')?.textContent?.trim()).toBe(
				'Graphe'
			)
		);
		await vi.waitFor(() => expect(container.querySelector('.nouveau')).toBeTruthy());
	});
});

describe('revue a11y du lot 5b', () => {
	it('le choix nuage / escalier se nomme par son mot visible et se coche', async () => {
		const { atelier, card } = await openSequence('0,5u_n + 3', (a) => a.setPlotted('u', true));

		expect(choice(card(), 'nuage').getAttribute('aria-label')).toBeNull();
		choice(card(), 'escalier').click();

		await vi.waitFor(() =>
			expect(choice(card(), 'escalier').getAttribute('aria-pressed')).toBe('true')
		);
		expect(atelier.get('u')).toBeTruthy();
	});
});
