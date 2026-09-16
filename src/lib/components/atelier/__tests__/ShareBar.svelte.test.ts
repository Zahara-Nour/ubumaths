/**
 * Le partage et la réception, vus depuis l'écran — lot 5.
 *
 * ⚠️ La garantie du §6 : recevoir un lien **ne doit pas coûter son travail**.
 * L'atelier personnel n'est ni affiché ni modifié, et une bannière le dit.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

async function settle() {
	await tick();
	await new Promise((r) => setTimeout(r, 0));
	await tick();
}

function open(options: Record<string, unknown> = {}) {
	const atelier = (options.atelier as Atelier) ?? new Atelier();
	return { ...render(AtelierContainer, { atelier, ephemeral: true, ...options }), atelier };
}

const buttonNamed = (container: HTMLElement, label: string) =>
	[...container.querySelectorAll('button')].find((b) => b.textContent?.includes(label)) as
		| HTMLButtonElement
		| undefined;

describe('partager', () => {
	it('propose le partage quand on est chez soi', () => {
		const { container } = open();

		expect(buttonNamed(container, 'Partager')).toBeTruthy();
	});

	it('refuse de partager un atelier vide, en disant pourquoi', async () => {
		const { container } = open();

		buttonNamed(container, 'Partager')!.click();
		await settle();

		expect(container.querySelector('.retour-partage')?.textContent).toMatch(/vide/i);
	});

	it('produit un lien quand il y a quelque chose à partager', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = open({ atelier });

		buttonNamed(container, 'Partager')!.click();

		// ⚠️ La compression est asynchrone : attendre la CONDITION, pas un nombre
		// de ticks — celui qui suffit sur cette machine ne suffira pas ailleurs.
		await vi.waitFor(() => expect(container.querySelector('.lien')).toBeTruthy());

		const lien = container.querySelector('.lien') as HTMLInputElement;
		expect(lien.value).toContain('?a=');
	});

	// ⚠️ Le presse-papier peut refuser : le lien doit rester sélectionnable
	it('affiche le lien même si la copie échoue', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = open({ atelier });

		buttonNamed(container, 'Partager')!.click();
		await vi.waitFor(() => expect(container.querySelector('.lien')).toBeTruthy());

		expect((container.querySelector('.lien') as HTMLInputElement).readOnly).toBe(true);
	});
});

describe('recevoir', () => {
	const recu = {
		version: 1,
		objects: [{ name: 'f', kind: 'function' as const, definition: 'x^3' }]
	};

	it('dit que l’atelier personnel n’est pas touché', () => {
		const { container } = open({ received: recu });

		expect(container.querySelector('.bandeau')?.textContent).toMatch(/n’a pas été modifié/);
	});

	it('propose de garder, et non de partager', () => {
		const { container } = open({ received: recu });

		expect(buttonNamed(container, 'Garder dans mon atelier')).toBeTruthy();
		expect(buttonNamed(container, 'Partager')).toBeUndefined();
	});

	it('garde ce qu’on a reçu', async () => {
		const { container, atelier } = open({ received: recu });

		buttonNamed(container, 'Garder dans mon atelier')!.click();
		await settle();

		expect(atelier.names).toContain('f');
	});

	it('dit sous quel nom, quand il a fallu renommer', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = open({ atelier, received: recu });

		buttonNamed(container, 'Garder dans mon atelier')!.click();
		await settle();

		expect(container.querySelector('.retour-partage')?.textContent).toMatch(/gardé sous/);
	});

	it('montre ce que la relecture a eu à dire', () => {
		const { container } = open({ notice: 'Ce lien est incomplet ou abîmé.' });

		expect(container.querySelector('.retour-partage')?.textContent).toContain('abîmé');
	});
});
