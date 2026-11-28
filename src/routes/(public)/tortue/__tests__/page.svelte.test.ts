/**
 * Bac à sable public de la tortue : sélecteur « Blocs : base · 4e · 3e » (chantier
 * `tortue-variables`, Q6 de la phase 0 validée le 2026-11-16).
 *
 * Base par défaut ; changer de niveau change la boîte à outils, les blocs posés restent ; un bloc
 * au-dessus du niveau est refusé au lancer. Aperçu Python au niveau de base seulement.
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import * as Blockly from 'blockly';
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';
import { texteVersEtatTortue } from '#lib/shared/blockly/tortue/niveaux.ts';

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

async function attendreBlocs(root: Element): Promise<void> {
	await expect
		.poll(() => root.querySelector('[aria-label="Espace de travail Blockly"] svg'), {
			timeout: 15_000
		})
		.not.toBeNull();
}

function poser(texte: string): void {
	const lu = texteVersEtatTortue(texte, '3e');
	if (!lu.ok) throw new Error(lu.message);
	Blockly.serialization.workspaces.load(lu.etat, Blockly.getMainWorkspace());
}

const niveau = (n: string) => page.getByRole('button', { name: n, exact: true });

/**
 * Message sous le quadrillage, une fois le tracé fini (« Tout de suite » saute l'animation ; un
 * programme refusé d'emblée n'en a pas).
 */
async function lancer(root: Element): Promise<string> {
	await page.getByRole('button', { name: 'Lancer' }).click();
	const message = () =>
		root.querySelector('#panneau-tortue [role="status"]')?.textContent?.trim() ?? '';
	await expect
		.poll(() => {
			const toutDeSuite = page.getByRole('button', { name: 'Tout de suite' }).element();
			if (toutDeSuite instanceof HTMLButtonElement && !toutDeSuite.disabled) toutDeSuite.click();
			return message();
		})
		.not.toBe('');
	return message();
}

describe('La Tortue : blocs de 4e et de 3e (sélecteur)', () => {
	it('base par défaut, avec l’aperçu Python ; 4e : calculs et variables, sans Python ; 3e : conditions', async () => {
		const screen = await render(Page, { target: mainElement() });
		await attendreBlocs(screen.container);
		await expect.element(niveau('base')).toHaveAttribute('aria-pressed', 'true');
		await expect.element(page.getByText('Voir en Python')).toBeInTheDocument();
		await expect.element(page.getByText('Variables', { exact: true })).not.toBeInTheDocument();
		await niveau('4e').click();
		await expect.element(niveau('4e')).toHaveAttribute('aria-pressed', 'true');
		await expect.element(page.getByText('Variables', { exact: true })).toBeVisible();
		await expect.element(page.getByText('Calcul', { exact: true })).toBeVisible();
		await expect.element(page.getByText('Conditions', { exact: true })).not.toBeInTheDocument();
		await expect.element(page.getByText('Voir en Python')).not.toBeInTheDocument();
		await niveau('3e').click();
		await expect.element(page.getByText('Conditions', { exact: true })).toBeVisible();
	});

	it('nominal 4e : l’hexagone, 6 segments', async () => {
		const screen = await render(Page, { target: mainElement() });
		await attendreBlocs(screen.container);
		await niveau('4e').click();
		poser('mettre n à 6 ; répéter n [ avancer 3 ; tourner à gauche 360 ÷ n ]');
		expect(await lancer(screen.container)).toBe('Tracé terminé : 6 segments.');
	});

	it('bloc au-dessus du niveau choisi : refusé au lancer', async () => {
		const screen = await render(Page, { target: mainElement() });
		await attendreBlocs(screen.container);
		await niveau('4e').click();
		poser('mettre n à 2 ; avancer n');
		await niveau('base').click();
		expect(await lancer(screen.container)).toContain('pas pris en charge');
	});

	it('nom de variable réservé : refusé, message', async () => {
		const screen = await render(Page, { target: mainElement() });
		await attendreBlocs(screen.container);
		await niveau('4e').click();
		const variables = Blockly.getMainWorkspace().getVariableMap();
		variables.createVariable('répéter');
		await expect
			.poll(() => screen.container.querySelector('.tortue-nom-refuse')?.textContent)
			.toContain('mot du programme');
		expect(variables.getAllVariables()).toEqual([]);
	});
});
