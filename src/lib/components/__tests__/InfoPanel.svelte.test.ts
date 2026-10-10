/**
 * InfoPanel — le bouton « Infos et confidentialité » de l'accueil et son panneau
 * (décision de David, 2026-10-06). Il remplace l'ancien pied de page.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import InfoPanel from '../InfoPanel.svelte';

let mains: HTMLElement[] = [];

afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

// Rendu dans <main>, comme en production : `main p` y impose sa taille.
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}

const LIENS: [RegExp, string][] = [
	[/Chiphre, c[’']est quoi ?/, '/a-propos'],
	[/Données personnelles/, '/legal/confidentialite'],
	[/Conditions d’utilisation \(CGU\)/, '/legal/cgu'],
	[/Qui édite Chiphre/, '/legal/mentions-legales']
];

describe('InfoPanel', () => {
	it('affiche le bouton libellé, sans les liens légaux en ligne', async () => {
		await render(InfoPanel, { target: mainElement() });
		await expect
			.element(page.getByRole('button', { name: 'Infos et confidentialité' }))
			.toBeVisible();
		expect(page.getByRole('link').query()).toBeNull();
		expect(page.getByText(/Tous droits/).query()).toBeNull();
	});

	it('un clic ouvre le panneau avec les quatre liens et leurs cibles', async () => {
		await render(InfoPanel, { target: mainElement() });
		await page.getByRole('button', { name: 'Infos et confidentialité' }).click();
		const dialog = page.getByRole('dialog');
		await expect.element(dialog).toBeVisible();
		for (const [nom, cible] of LIENS) {
			await expect.element(dialog.getByRole('link', { name: nom })).toHaveAttribute('href', cible);
		}
		await expect
			.element(dialog.getByText('Ce que Chiphre collecte, pourquoi, et vos droits (RGPD)'))
			.toBeVisible();
		await expect
			.element(dialog.getByText('Ce qui est permis, la modération, les responsabilités'))
			.toBeVisible();
		await expect
			.element(dialog.getByText('L’éditeur, l’hébergeur, les crédits (mentions légales)'))
			.toBeVisible();
		await expect.element(dialog.getByText(`© ${new Date().getFullYear()} Chiphre`)).toBeVisible();
	});

	it('Échap ferme le panneau et rend le focus au bouton', async () => {
		await render(InfoPanel, { target: mainElement() });
		const bouton = page.getByRole('button', { name: 'Infos et confidentialité' });
		await bouton.click();
		await expect.element(page.getByRole('dialog')).toBeVisible();
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => page.getByRole('dialog').query()).toBeNull();
		await expect.element(bouton).toHaveFocus();
	});
});

describe('InfoPanel — lisibilité en mode sombre', () => {
	afterEach(() => {
		document.documentElement.classList.remove('dark');
		document.documentElement.style.colorScheme = '';
	});

	// Retour de David (2026-10-06) : le libellé gris était peu lisible en sombre.
	// Fond de page sombre : #262624 (app.css). Exigence : contraste ≥ 7:1 (AAA).
	it('le libellé du bouton contraste à au moins 7:1 sur le fond sombre', async () => {
		document.documentElement.classList.add('dark');
		document.documentElement.style.colorScheme = 'dark';
		await render(InfoPanel, { target: mainElement() });
		const bouton = page.getByRole('button', { name: 'Infos et confidentialité' }).element();
		const [r, g, b] = getComputedStyle(bouton)
			.color.match(/\d+(\.\d+)?/g)!
			.slice(0, 3)
			.map(Number);
		const hex = '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
		const { contrastRatio } = await import('$lib/theme/author-color');
		expect(contrastRatio(hex, '#262624')).toBeGreaterThanOrEqual(7);
	});
});
