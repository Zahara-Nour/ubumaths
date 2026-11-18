/**
 * Bac à sable public des programmes de calcul (chantier `docs/archive/wip/blockly-progress.md`, section
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
import { texteVersEtatCalcul } from '#lib/shared/blockly/calcul/notation.ts';

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

describe('Programmes de calcul : blocs de 4e et de 3e (sélecteur)', () => {
	const niveau = (n: string) => page.getByRole('button', { name: n, exact: true });

	it('5e par défaut ; 4e : variables et conditions, plus de résultat ; 3e : et / ou', async () => {
		const screen = await render(Page, { target: mainElement() });
		await attendreBlocs(screen.container);
		await expect.element(niveau('5e')).toHaveAttribute('aria-pressed', 'true');
		await expect.element(page.getByText('Résultat', { exact: true })).toBeVisible();
		await niveau('4e').click();
		await expect.element(niveau('4e')).toHaveAttribute('aria-pressed', 'true');
		await expect.element(page.getByText('Variables', { exact: true })).toBeVisible();
		await expect.element(page.getByText('Conditions', { exact: true })).toBeVisible();
		await expect.element(page.getByText('Résultat', { exact: true })).not.toBeInTheDocument();
	});

	it('nominal 4e : mettre x à nombre × 2, si x > 10… ; 7 → 4, 3 → 6', async () => {
		const screen = await render(Page, { target: mainElement() });
		await attendreBlocs(screen.container);
		await niveau('4e').click();
		poser('mettre x à nombre × 2 ; si x > 10 alors [ afficher x − 10 ] sinon [ afficher x ]');
		await essayerAvec('7');
		await expect.poll(() => sortie(screen.container)).toContain('Avec 7, le programme affiche : 4');
		await essayerAvec('3');
		await expect.poll(() => sortie(screen.container)).toContain('Avec 3, le programme affiche : 6');
	});

	it('3e : « répéter jusqu’à » exécuté', async () => {
		const screen = await render(Page, { target: mainElement() });
		await attendreBlocs(screen.container);
		await niveau('3e').click();
		poser('mettre x à nombre ; répéter jusqu’à x > 100 [ mettre x à x × 2 ] ; afficher x');
		await essayerAvec('7');
		await expect
			.poll(() => sortie(screen.container))
			.toContain('Avec 7, le programme affiche : 112');
	});

	it('bloc au-dessus du niveau choisi : refusé au lancer', async () => {
		const screen = await render(Page, { target: mainElement() });
		await attendreBlocs(screen.container);
		await niveau('4e').click();
		poser('mettre x à nombre ; afficher x');
		await niveau('5e').click();
		await essayerAvec('2');
		await expect
			.poll(() => screen.container.querySelector('.calcul-sortie .text-destructive')?.textContent)
			.toContain('pas pris en charge');
	});

	it('nom de variable qui ne diffère d’une autre que par les accents : refusé, message', async () => {
		const screen = await render(Page, { target: mainElement() });
		await attendreBlocs(screen.container);
		await niveau('4e').click();
		const variables = Blockly.getMainWorkspace().getVariableMap();
		variables.createVariable('cote');
		variables.createVariable('Côté');
		await expect
			.poll(() => screen.container.querySelector('.calcul-nom-refuse')?.textContent)
			.toContain('ressemble trop à la variable « cote »');
		expect(variables.getAllVariables().map((v) => v.getName())).toEqual(['cote']);
	});
});
