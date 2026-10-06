/**
 * Pages du Cabinet Noir : on agit comme un visiteur (saisie, onglets, MySelect)
 * et on lit ce qui est AFFICHÉ, comparé aux fonctions pures du module.
 */
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Home from '../+page.svelte';
import Caesar from '../cesar/+page.svelte';
import Substitution from '../substitution/+page.svelte';
import Scytale from '../scytale/+page.svelte';
import Polybius from '../polybe/+page.svelte';
import Atbash from '../atbash/+page.svelte';
import { caesarEncrypt } from '$lib/ciphers/caesar';
import { normalizeText } from '$lib/ciphers/alphabet';

function text(container: HTMLElement, testid: string): string {
	return container.querySelector(`[data-testid="${testid}"]`)?.textContent ?? '';
}

async function chooseOption(buttonName: RegExp, option: string) {
	await page.getByRole('button', { name: buttonName }).click();
	await page.getByRole('option', { name: option, exact: true }).click();
}

describe('accueil du Cabinet Noir', () => {
	it('mène aux cinq chiffres du collège', async () => {
		const screen = await render(Home);
		const links = [...screen.container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
		for (const slug of ['cesar', 'atbash', 'substitution', 'scytale', 'polybe']) {
			expect(links).toContain(`/chiffrement/${slug}`);
		}
	});
});

describe('César', () => {
	it('le résultat suit la saisie et le décalage, sans clic', async () => {
		const screen = await render(Caesar);
		await page.getByLabelText('Message clair').fill('Ubu');
		await expect.poll(() => text(screen.container, 'cipher-encrypted')).toBe('XEX');

		await chooseOption(/^Décalage : 3/, '1');
		await expect.poll(() => text(screen.container, 'cipher-encrypted')).toBe('VCV');
	});

	it('aller-retour : chiffrer, envoyer au déchiffrement, relire le message', async () => {
		const screen = await render(Caesar);
		await page.getByLabelText('Message clair').fill('Merdre, Mère Ubu !');
		await page.getByRole('button', { name: 'Le déchiffrer' }).click();
		await expect
			.poll(() => text(screen.container, 'cipher-decrypted'))
			.toBe(normalizeText('Merdre, Mère Ubu !'));
	});

	it('les étapes montrent le calcul modulo 26', async () => {
		const screen = await render(Caesar);
		await page.getByLabelText('Message clair').fill('Y');
		await page.getByText('Voir les étapes').first().click();
		await expect
			.poll(() => text(screen.container, 'cipher-encrypted-steps'))
			.toContain('24 + 3 = 27 → 27 − 26 = 1');
	});

	it('les étapes s’arrêtent à 50 lettres sur un long texte', async () => {
		const screen = await render(Caesar);
		await page.getByLabelText('Message clair').fill('A'.repeat(80));
		await page.getByText('Voir les étapes').first().click();
		await expect
			.poll(
				() => screen.container.querySelectorAll('[data-testid="cipher-encrypted-steps"] li').length
			)
			.toBe(50);
		expect(screen.container.textContent).toContain('… et 30 lettres de plus');
	});

	it('décrypter : la force brute place le bon décalage en tête', async () => {
		const screen = await render(Caesar);
		await page.getByRole('tab', { name: 'Décrypter' }).click();
		await expect
			.poll(
				() => screen.container.querySelector('[data-testid="brute-force"] li')?.textContent ?? ''
			)
			.toContain('Décalage 11');
	});

	it('le message intercepté peut venir de l’onglet Chiffrer', async () => {
		const screen = await render(Caesar);
		const sentence =
			'La Mere Ubu compte les phynances du royaume tous les soirs avant de souffler la chandelle verte';
		await page.getByLabelText('Message clair').fill(sentence);
		await page.getByRole('button', { name: 'Le décrypter sans la clé' }).click();
		await expect
			.poll(
				() => screen.container.querySelector('[data-testid="brute-force"] li')?.textContent ?? ''
			)
			.toContain(caesarEncrypt(sentence, 0).text.slice(0, 30));
	});
});

describe('Atbash', () => {
	it('déchiffrer = chiffrer', async () => {
		const screen = await render(Atbash);
		await page.getByLabelText('Message clair').fill('UBU');
		await expect.poll(() => text(screen.container, 'cipher-encrypted')).toBe('FYF');
	});
});

describe('substitution', () => {
	it('la clé n’est réglée qu’à un seul endroit, partagé par Chiffrer et Déchiffrer', async () => {
		const screen = await render(Substitution);
		expect(screen.container.querySelectorAll('#substitution-key')).toHaveLength(1);
		await page.getByRole('tab', { name: 'Déchiffrer' }).click();
		await page.getByRole('textbox', { name: 'Mot-clé' }).fill('CORNEGIDOUILLE');
		await page.getByLabelText('Message chiffré').fill('C');
		// C est la 1ʳᵉ lettre de la clé : il cache un A
		await expect.poll(() => text(screen.container, 'cipher-decrypted')).toBe('A');
		await page.getByRole('tab', { name: 'Décrypter' }).click();
		await expect.poll(() => screen.container.querySelectorAll('#substitution-key').length).toBe(0);
	});

	it('une clé complète invalide affiche le problème, en clair', async () => {
		const screen = await render(Substitution);
		await chooseOption(/^Fabriquer la clé/, 'Clé complète (26 lettres)');
		await page.getByLabelText('Clé (26 lettres)').fill('ABCDEFGHIJKLMNOPRSTUVWXYZ');
		await expect
			.poll(() => screen.container.querySelector('[role="status"]')?.textContent ?? '')
			.toContain('Il manque la lettre Q.');
	});

	it('décrypter : une hypothèse révèle ses lettres dans le message', async () => {
		const screen = await render(Substitution);
		await page.getByRole('tab', { name: 'Décrypter' }).click();
		await page.getByLabelText('Message intercepté').fill('XQX');
		await page.getByLabelText('Lettre claire cachée par X').fill('e');
		await expect.poll(() => text(screen.container, 'solver-revealed')).toBe('EQE');
	});
});

describe('scytale', () => {
	it('montre le bâton, une ligne par face', async () => {
		const screen = await render(Scytale);
		await page.getByLabelText('Message clair').fill("Attaque à l'aube");
		await chooseOption(/^Lettres par tour/, '3');
		await expect
			.poll(() =>
				[
					...screen.container.querySelectorAll(
						'[role="tabpanel"][data-state="active"] [data-testid="scytale-rows"] li'
					)
				].map((li) => li.textContent?.replace(/\s/g, ''))
			)
			.toEqual(['ATTAQ', 'UEAL', 'AUBE']);
		expect(text(screen.container, 'cipher-encrypted')).toBe('AUATEUTABALEQ');
	});
});

describe('carré de Polybe', () => {
	it('un code mal formé est signalé avec sa position', async () => {
		const screen = await render(Polybius);
		await page.getByRole('tab', { name: 'Déchiffrer' }).click();
		await page.getByLabelText('Message chiffré').fill('11 17');
		await expect
			.poll(() => screen.container.querySelector('[role="status"]')?.textContent ?? '')
			.toContain('Le chiffre 7 (position 5)');
	});
});
