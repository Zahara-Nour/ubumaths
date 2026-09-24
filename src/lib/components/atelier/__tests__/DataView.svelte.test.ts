/**
 * La vue Données, vue depuis l'écran.
 *
 * Une liste se tape sur une ligne, séparée par des points-virgules. La virgule
 * reste décimale — c'est la décision §4 E2, prise parce que distinguer `1,2` de
 * `1, 2` par une espace est intenable en classe.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

async function settle() {
	await tick();
	await new Promise((r) => setTimeout(r, 0));
	await tick();
}

async function openData(atelier = new Atelier()) {
	const view = await render(AtelierContainer, { atelier, ephemeral: true, view: 'donnees' });
	await settle();
	return { ...view, atelier };
}

const fieldFor = (container: HTMLElement, name: string) =>
	container.querySelector(`#liste-${name}`) as HTMLInputElement | null;

describe('la vue Données', () => {
	it('explique comment commencer quand il n’y a rien', async () => {
		const { container } = await openData();

		expect(container.textContent).toContain('+ Liste');
		expect(container.textContent).toContain('12 ; 15 ; 9');
	});

	it('montre une colonne par liste', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '12 ; 15 ; 9' });
		atelier.create({ kind: 'list', name: 'M', definition: '2 ; 4' });

		const { container } = await openData(atelier);

		expect(container.querySelectorAll('.colonne').length).toBe(2);
		expect(fieldFor(container, 'L')?.value).toBe('12 ; 15 ; 9');
	});

	it('donne un aperçu chiffré sans qu’on clique', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '12 ; 15 ; 9' });

		const { container } = await openData(atelier);

		expect(container.querySelector('.apercu')?.textContent).toContain('n = 3');
		expect(container.querySelector('.apercu')?.textContent).toContain('12');
	});

	it('modifie la liste de l’atelier quand on tape', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1' });
		const { container } = await openData(atelier);

		const field = fieldFor(container, 'L')!;
		field.value = '1 ; 2 ; 3';
		field.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();

		const list = atelier.get('L');
		expect(list && 'values' in list && list.values).toEqual([1, 2, 3]);
	});

	// §4 E1 : ignorée ET signalée
	it('signale une valeur qui n’est pas un nombre', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '12 ; abc ; 9' });

		const { container } = await openData(atelier);

		expect(container.querySelector('.ecarte')?.textContent).toContain('1 valeur ignorée');
	});

	// Q1 : la correction est montrée, pas seulement la règle
	it('montre la correction quand l’élève sépare par des virgules', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '12, 15, 9' });

		const { container } = await openData(atelier);

		expect(container.querySelector('.probleme')?.textContent).toContain('12 ; 15 ; 9');
	});

	it('n’accuse pas un décimal écrit à la virgule', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '3,14 ; 2,5' });

		const { container } = await openData(atelier);

		expect(container.querySelector('.probleme')).toBeNull();
		expect(container.querySelector('.apercu')?.textContent).toContain('n = 2');
	});

	it('rappelle la règle du séparateur', async () => {
		const { container } = await openData();

		expect(container.querySelector('.aide')?.textContent).toContain('points-virgules');
	});
});
