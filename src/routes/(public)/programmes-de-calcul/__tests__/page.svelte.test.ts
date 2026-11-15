/**
 * Bac à sable public des programmes de calcul (chantier `docs/wip/blockly-progress.md`, section
 * « Bac à sable des programmes de calcul », phase 0 validée le 2026-11-15).
 *
 * Sans connexion, rien d'enregistré, rien de jugé : l'élève assemble un programme, l'essaie sur un
 * nombre et voit ce qu'il affiche. Interpréteur seul (ADR 0039), aucun aperçu Python.
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import * as Blockly from 'blockly';
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';
import { texteVersEtatCalcul } from '$lib/shared/blockly/calcul/notation';

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
	const lu = texteVersEtatCalcul(texte);
	if (!lu.ok) throw new Error(lu.message);
	Blockly.serialization.workspaces.load(lu.etat, Blockly.getMainWorkspace());
}

const sortie = (root: Element) => root.querySelector('.calcul-sortie')?.textContent ?? '';

async function essayerAvec(nombre: string): Promise<void> {
	const champ = page.getByLabelText('Essayer avec');
	await userEvent.clear(champ);
	await userEvent.fill(champ, nombre);
	await page.getByRole('button', { name: 'Lancer' }).click();
}

describe('Programmes de calcul : le bac à sable', () => {
	it('titre, blocs de calcul, renvoi vers La Tortue, pas d’aperçu Python', async () => {
		const screen = await render(Page, { target: mainElement() });
		await expect
			.element(page.getByRole('heading', { level: 1, name: 'Programmes de calcul' }))
			.toBeVisible();
		await attendreBlocs(screen.container);
		await expect.element(page.getByText('Calcul', { exact: true })).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: 'La Tortue' }))
			.toHaveAttribute('href', '/tortue');
		await expect.element(page.getByText('Voir en Python')).not.toBeInTheDocument();
	});

	it('nominal : × 3 puis + 2, essayé avec 4 → 14', async () => {
		const screen = await render(Page, { target: mainElement() });
		await attendreBlocs(screen.container);
		poser('mettre résultat à nombre × 3 ; afficher résultat + 2');
		await essayerAvec('4');
		await expect
			.poll(() => sortie(screen.container))
			.toContain('Avec 4, le programme affiche : 14');
	});

	it('espace vide : « n’affiche rien », sans erreur', async () => {
		const screen = await render(Page, { target: mainElement() });
		await attendreBlocs(screen.container);
		await essayerAvec('5');
		await expect.poll(() => sortie(screen.container)).toContain('le programme n’affiche rien');
	});

	it('programme qui ne dépend pas du nombre : exécuté, rien de jugé', async () => {
		const screen = await render(Page, { target: mainElement() });
		await attendreBlocs(screen.container);
		poser('afficher 7');
		await essayerAvec('2,5');
		await expect
			.poll(() => sortie(screen.container))
			.toContain('Avec 2,5, le programme affiche : 7');
	});

	it('division par zéro : le message de l’interpréteur', async () => {
		const screen = await render(Page, { target: mainElement() });
		await attendreBlocs(screen.container);
		poser('afficher 1 ÷ nombre');
		await essayerAvec('0');
		await expect
			.poll(() => screen.container.querySelector('.calcul-sortie .text-destructive'))
			.not.toBeNull();
	});

	it('nombre illisible : refusé', async () => {
		const screen = await render(Page, { target: mainElement() });
		await attendreBlocs(screen.container);
		await essayerAvec('abc');
		await expect.poll(() => sortie(screen.container)).toContain('Écris un nombre');
	});
});
