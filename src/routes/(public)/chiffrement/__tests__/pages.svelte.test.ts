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
import Affine from '../affine/+page.svelte';
import Vigenere from '../vigenere/+page.svelte';
import Hill from '../hill/+page.svelte';
import { affineEncrypt } from '$lib/ciphers/affine';
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
	it('mène aux chiffres du collège et du lycée', async () => {
		const screen = await render(Home);
		const links = [...screen.container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
		for (const slug of [
			'cesar',
			'atbash',
			'substitution',
			'scytale',
			'polybe',
			'vigenere',
			'affine',
			'hill'
		]) {
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

describe('chiffre affine', () => {
	it('(5, 8) : UBU → ENE, et l’inverse 21 est affiché avec sa vérification', async () => {
		const screen = await render(Affine);
		await page.getByLabelText('Message clair').fill('Ubu');
		await expect.poll(() => text(screen.container, 'cipher-encrypted')).toBe('ENE');
		expect(text(screen.container, 'affine-inverse')).toContain('21, car 5 × 21 = 105 = 4 × 26 + 1');
	});

	it('a = 2 : les collisions sont montrées, et le déchiffrement est refusé', async () => {
		const screen = await render(Affine);
		await chooseOption(/^a : 5/, '2');
		await expect.poll(() => text(screen.container, 'affine-collisions')).toContain('A et N → I');
		await page.getByRole('tab', { name: 'Déchiffrer' }).click();
		await expect
			.poll(
				() =>
					screen.container.querySelector('[role="tabpanel"][data-state="active"] [role="status"]')
						?.textContent ?? ''
			)
			.toContain('a = 2 n’est pas premier avec 26');
	});

	it('décrypter : la force brute retrouve la clé (7, 3) du message intercepté', async () => {
		const screen = await render(Affine);
		await page.getByRole('tab', { name: 'Décrypter' }).click();
		await expect
			.poll(
				() =>
					screen.container.querySelector('[data-testid="affine-brute-force"] li')?.textContent ?? ''
			)
			.toContain('a = 7, b = 3');
	});

	it('décrypter : une hypothèse sans clé valide propose d’essayer une autre lettre', async () => {
		const screen = await render(Affine);
		await page.getByRole('tab', { name: 'Décrypter' }).click();
		// Message par défaut : la seconde lettre la plus fréquente cache T, pas A
		await expect
			.poll(() => text(screen.container, 'affine-attack-steps'))
			.toContain('Aucune clé valide');
		expect(text(screen.container, 'affine-attack-hint')).toContain('A, S, I, N, T et R');
	});

	it('décrypter : l’attaque par deux lettres résout le système et déchiffre', async () => {
		const screen = await render(Affine);
		await page.getByRole('tab', { name: 'Décrypter' }).click();
		await page.getByLabelText('Message intercepté').fill(affineEncrypt('ENE ABA', 5, 8).text);
		// CVC INI : C et I, les plus fréquentes, sont pré-remplies face à E et A
		await expect
			.poll(
				() => page.getByRole('button', { name: /^Première lettre chiffrée/ }).element().textContent
			)
			.toContain('C');
		await expect
			.poll(() => text(screen.container, 'affine-attack-steps'))
			.toContain('Une seule clé valide : a = 5, b = 8.');
		expect(text(screen.container, 'affine-attack-result')).toBe('ENE ABA');
	});
});

describe('Vigenère', () => {
	it('clé UBU : MER → GFL, avec les décalages affichés', async () => {
		const screen = await render(Vigenere);
		await page.getByLabelText('Message clair').fill('Mer');
		await expect.poll(() => text(screen.container, 'cipher-encrypted')).toBe('GFL');
		expect(screen.container.textContent).toContain('U = 20, B = 1, U = 20');
	});

	it('décrypter : longueur 6 proposée, puis la clé MERDRE retrouvée', async () => {
		const screen = await render(Vigenere);
		await page.getByRole('tab', { name: 'Décrypter' }).click();
		await expect.poll(() => text(screen.container, 'suggested-length')).toBe('6');
		expect(text(screen.container, 'cracked-key')).toBe('MERDRE');
	});

	it('Kasiski numérote les positions à partir de 1', async () => {
		const screen = await render(Vigenere);
		await page.getByRole('tab', { name: 'Décrypter' }).click();
		await page.getByLabelText('Message intercepté').fill('ABCXXXABC ABCXXXABC ABCXXXABC ABCXXXABC');
		await expect
			.poll(
				() =>
					screen.container.querySelector('[data-testid="kasiski-repeats"] tbody tr')?.textContent ??
					''
			)
			.toMatch(/^ABC\s*1, 7/);
		// 36 lettres : message court, signalé
		expect(text(screen.container, 'vigenere-short')).toContain('36 lettres');
	});

	it('la longueur se corrige à la main', async () => {
		const screen = await render(Vigenere);
		await page.getByRole('tab', { name: 'Décrypter' }).click();
		await chooseOption(/^Longueur de clé/, '3');
		await expect.poll(() => text(screen.container, 'cracked-key')).toHaveLength(3);
	});
});

describe('chiffre de Hill', () => {
	it('(3 3 ; 2 5) : HE → HI, et les étapes de l’inverse sont affichées', async () => {
		const screen = await render(Hill);
		await page.getByLabelText('Message clair').fill('He');
		await expect.poll(() => text(screen.container, 'cipher-encrypted')).toBe('HI');
		expect(text(screen.container, 'hill-inverse-steps')).toContain('(15 17 ; 20 9)');
	});

	it('longueur impaire : le X ajouté est signalé', async () => {
		const screen = await render(Hill);
		await page.getByLabelText('Message clair').fill('Hel');
		await expect.poll(() => text(screen.container, 'hill-padded')).toContain('un X complète');
	});

	it('matrice non inversible : une collision est montrée, le déchiffrement refusé', async () => {
		const screen = await render(Hill);
		await chooseOption(/^Coefficient a : 3/, '2');
		await chooseOption(/^Coefficient b : 3/, '0');
		await chooseOption(/^Coefficient c : 2/, '0');
		await chooseOption(/^Coefficient d : 5/, '1');
		await expect.poll(() => text(screen.container, 'hill-collision')).toContain('AA et NA');
		await page.getByRole('tab', { name: 'Déchiffrer' }).click();
		await expect
			.poll(
				() =>
					screen.container.querySelector(
						'[role="tabpanel"][data-state="active"] [data-testid="cipher-decrypted"]'
					) === null &&
					(screen.container.querySelector('[role="tabpanel"][data-state="active"] p[role="status"]')
						?.textContent ??
						'')
			)
			.toContain('Le déterminant vaut 2');
	});

	it('mot-clé : HILL donne (7 8 ; 11 11)', async () => {
		const screen = await render(Hill);
		await chooseOption(/^Fabriquer la matrice/, 'Un mot-clé de 4 lettres');
		await expect
			.poll(() => text(screen.container, 'hill-inverse-steps'))
			.toContain('det M = 7 × 11 − 8 × 11 = −11 ≡ 15');
	});

	it('décrypter : clair connu RAPP et attaque ligne par ligne retrouvent (5 17 ; 4 15)', async () => {
		const screen = await render(Hill);
		await page.getByRole('tab', { name: 'Décrypter' }).click();
		await expect
			.poll(() => text(screen.container, 'hill-known-steps'))
			.toContain('≡ (5 17 ; 4 15) (mod 26)');
		expect(text(screen.container, 'hill-known-result')).toMatch(/^RAPPORTDUCABINETNOIR/);
		expect(text(screen.container, 'hill-row-key')).toBe('(5 17 ; 4 15)');
	});
});
