/**
 * Convertisseur de /almanach, dans les deux sens. Le choix « mois ou jour
 * hors-mois » passe par MySelect (bits-ui) : on l'ouvre et on clique l'option,
 * comme un visiteur.
 */
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AlmanachConverter from '../AlmanachConverter.svelte';
import { civilToPataphysical, formatMedium } from '$lib/almanach/calendar';

async function renderConverter() {
	// Aujourd'hui : 13 Lumenal An 130 (22 mai 2026)
	return await render(AlmanachConverter, {
		props: { initial: '2026-05-22', today: civilToPataphysical(2026, 5, 22) }
	});
}

function output(container: HTMLElement): string {
	return container.querySelector('[data-testid="almanach-conversion"]')?.textContent ?? '';
}

async function choosePeriod(name: string) {
	await page.getByRole('button', { name: /^Mois ou jour hors-mois/ }).click();
	await page.getByRole('option', { name }).click();
}

describe('AlmanachConverter', () => {
	it('grégorien → Almanach : rend la valeur de la fonction pure', async () => {
		const screen = await renderConverter();
		await page.getByLabelText('Date grégorienne').fill('2028-03-18');
		await expect
			.poll(() => output(screen.container))
			.toContain(formatMedium(civilToPataphysical(2028, 3, 18)));
	});

	it('Almanach → grégorien : 13 Lumenal An 130 → vendredi 22 mai 2026, puis la Cloche', async () => {
		const screen = await renderConverter();
		await page.getByRole('button', { name: 'Almanach → Grégorien' }).click();
		// Valeurs initiales : la date du jour
		await expect.poll(() => output(screen.container)).toContain('vendredi 22 mai 2026');

		await page.getByLabelText('An de l’Ère du Royaume').fill('132');
		await choosePeriod('Déglaçose');
		await page.getByLabelText(/^Jour/).fill('35');
		await expect.poll(() => output(screen.container)).toContain('mardi 29 février 2028');

		await choosePeriod('La Cloche du Grand Reset');
		await expect.poll(() => output(screen.container)).toContain('mardi 22 août 2028');
		// Un jour hors-mois n'a pas de numéro : le champ Jour disparaît
		expect(screen.container.querySelector('#almanach-day')).toBeNull();
	});

	it('Almanach → grégorien : le Surnuméraire d’un An sans 29 février est un message lisible', async () => {
		const screen = await renderConverter();
		await page.getByRole('button', { name: 'Almanach → Grégorien' }).click();
		await page.getByLabelText('An de l’Ère du Royaume').fill('131');
		await choosePeriod('Le Surnuméraire');
		await expect
			.poll(() => output(screen.container))
			.toContain('L’An 131 n’a pas de Surnuméraire.');

		// Et l'An 132 en a un
		await page.getByLabelText('An de l’Ère du Royaume').fill('132');
		await expect.poll(() => output(screen.container)).toContain('samedi 18 mars 2028');
	});

	it('Almanach → grégorien : jour 53 et An 0 donnent un message, pas une exception', async () => {
		const screen = await renderConverter();
		await page.getByRole('button', { name: 'Almanach → Grégorien' }).click();
		await page.getByLabelText(/^Jour/).fill('53');
		await expect.poll(() => output(screen.container)).toContain('Jour 53 invalide');
		await page.getByLabelText(/^Jour/).fill('1');
		await page.getByLabelText('An de l’Ère du Royaume').fill('0');
		await expect.poll(() => output(screen.container)).toContain('L’An 0 n’existe pas');
	});
});
