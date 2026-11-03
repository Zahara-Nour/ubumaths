/**
 * VariationTable au téléphone (390 px)
 * ===================================
 *
 * Chantier `docs/wip/tableau-signes-progress.md`, PR « tableau à compléter au téléphone ».
 * À 390 px, le tableau de signes à compléter de 2-330 faisait 565 px pour 308 px de place :
 * +∞ et près de la moitié des cases hors écran, sans aucun signe qu'il en restait.
 * - le bord qui défile porte une ombre (droite au départ, gauche une fois défilé) ;
 * - un tableau à compléter resserre ses cellules sur écran étroit (pas les autres).
 *
 * Ce qu'aucun test ne voit ici : le bouton clavier des cases MathLive retiré sur écran
 * tactile (`pointer: coarse`) — mesuré à Playwright, essai iPhone dans
 * `docs/wip/verifications-manuelles.md`.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import VariationTable from '../VariationTable.svelte';
import { parseVariationTableContent } from '$lib/ubumark/parser/variation-table-parser';
import type { VariationTableNode } from '$lib/ubumark/types/variation-table';

// Variables
let mains: HTMLElement[] = [];

// Constantes
/** x(2x+2) : deux racines, comme la variation de 2-330 mesurée (8 colonnes) */
const PRODUIT = [
	'variable: x',
	'domain: -inf, -1, 0, +inf',
	'',
	'sign: x',
	'  -inf,-1: -',
	'  -1,0: -',
	'  0: z',
	'  0,+inf: +',
	'',
	'sign: 2x+2',
	'  -inf,-1: -',
	'  -1: z',
	'  -1,0: +',
	'  0,+inf: +',
	'',
	'sign: x(2x+2)',
	'  -inf,-1: +',
	'  -1: z',
	'  -1,0: -',
	'  0: z',
	'  0,+inf: +'
];

/** Le même, signes du produit à compléter */
const PRODUIT_A_COMPLETER = PRODUIT.map((ligne) =>
	ligne.startsWith('  ') && PRODUIT.indexOf(ligne) > PRODUIT.indexOf('sign: x(2x+2)')
		? ligne.replace(': ', ': ?')
		: ligne
);

// Functions
function noeud(lignes: string[]): VariationTableNode {
	const { node, errors } = parseVariationTableContent(lignes);
	expect(errors).toEqual([]);
	expect(node).toBeTruthy();
	return node!;
}

async function monter(lignes: string[], largeur: string): Promise<HTMLElement> {
	const main = document.body.appendChild(document.createElement('main'));
	main.style.width = largeur;
	mains.push(main);
	await render(VariationTable, { target: main, props: { node: noeud(lignes) } });
	return main;
}

function tableau(main: HTMLElement): HTMLElement {
	return main.querySelector<HTMLElement>('.variation-table')!;
}

function defilement(main: HTMLElement): HTMLElement {
	return main.querySelector<HTMLElement>('[data-vt-defilement]')!;
}

afterEach(async () => {
	for (const m of mains) m.remove();
	mains = [];
	await page.viewport(1280, 900);
});

describe('VariationTable — ombre du bord qui défile', () => {
	it('tableau plus large que sa place : ombre à droite, pas à gauche', async () => {
		const main = await monter(PRODUIT, '120px');
		await expect.poll(() => tableau(main).dataset.debordeDroite).toBe('');
		expect(tableau(main).dataset.debordeGauche).toBeUndefined();
	});

	it('défilé jusqu’au bout : ombre à gauche, plus à droite', async () => {
		const main = await monter(PRODUIT, '120px');
		await expect.poll(() => tableau(main).dataset.debordeDroite).toBe('');
		const zone = defilement(main);
		zone.scrollLeft = zone.scrollWidth;
		zone.dispatchEvent(new Event('scroll'));
		await expect.poll(() => tableau(main).dataset.debordeGauche).toBe('');
		expect(tableau(main).dataset.debordeDroite).toBeUndefined();
	});

	it('tableau qui tient : aucune ombre', async () => {
		const main = await monter(PRODUIT, '1000px');
		await expect.poll(() => defilement(main)?.clientWidth ?? 0).toBeGreaterThan(0);
		expect(tableau(main).dataset.debordeDroite).toBeUndefined();
		expect(tableau(main).dataset.debordeGauche).toBeUndefined();
	});

	it('l’ombre se dessine (pseudo-élément visible, sans capter le toucher)', async () => {
		const main = await monter(PRODUIT, '120px');
		await expect.poll(() => tableau(main).dataset.debordeDroite).toBe('');
		const ombre = getComputedStyle(tableau(main), '::after');
		expect(ombre.content).not.toBe('none');
		expect(ombre.backgroundImage).toContain('gradient');
		expect(ombre.pointerEvents).toBe('none');
	});
});

describe('VariationTable — cellules resserrées sur écran étroit', () => {
	function margeEnTete(main: HTMLElement): number {
		return parseFloat(getComputedStyle(main.querySelector('.vt-header th')!).paddingLeft);
	}

	it('à 390 px, un tableau à compléter a des marges de moitié', async () => {
		await page.viewport(390, 844);
		const aCompleter = await monter(PRODUIT_A_COMPLETER, '100%');
		const complet = await monter(PRODUIT, '100%');
		expect(aCompleter.querySelector('.vt-case')).toBeTruthy();
		expect(margeEnTete(aCompleter)).toBeCloseTo(margeEnTete(complet) / 2, 1);
	});

	it('sur grand écran, rien ne change', async () => {
		const aCompleter = await monter(PRODUIT_A_COMPLETER, '100%');
		const complet = await monter(PRODUIT, '100%');
		expect(margeEnTete(aCompleter)).toBeCloseTo(margeEnTete(complet), 1);
	});
});
