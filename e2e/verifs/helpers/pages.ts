import { mkdir } from 'node:fs/promises';
import { expect, type JSHandle, type Locator, type Page } from '@playwright/test';

/**
 * Mesures et captures communes aux vérifications des pages (`pages-demo`, `pages-prof-admin`)
 * ===========================================================================================
 *
 * Lisibilité par la mesure plutôt que par un avis : rien ne déborde de la page, le texte
 * courant garde au moins 16 px au téléphone. Captures à l'œil de la session, en clair puis
 * en sombre : `.captures/verifs/pages/`.
 */

// Constantes

export const SHOTS_DIR = '.captures/verifs/pages';
/** Taille minimale du texte courant au téléphone, en px */
export const MIN_PHONE_FONT = 16;

// Fonctions

/** Rien ne dépasse de la largeur de la page (`scrollWidth <= clientWidth`) */
export async function expectNoHorizontalOverflow(page: Page, label: string): Promise<void> {
	const { scroll, client } = await page.evaluate(() => ({
		scroll: document.documentElement.scrollWidth,
		client: document.documentElement.clientWidth
	}));
	expect(
		scroll,
		`${label} : la page déborde (scrollWidth ${scroll} > clientWidth ${client})`
	).toBeLessThanOrEqual(client);
}

/** Taille de police calculée (px) du premier élément du lieu */
export async function fontSizePx(locator: Locator): Promise<number> {
	return locator.first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
}

/** Le texte courant du lieu fait au moins 16 px */
export async function expectReadableFont(locator: Locator, label: string): Promise<void> {
	await expect(locator.first(), label).toBeVisible();
	expect(await fontSizePx(locator), `${label} : taille de police`).toBeGreaterThanOrEqual(
		MIN_PHONE_FONT
	);
}

/** Capture la page en clair puis en sombre : `<nom>-clair|sombre-<projet>.png` */
export async function shootThemes(page: Page, name: string, project: string): Promise<void> {
	await mkdir(SHOTS_DIR, { recursive: true });
	for (const theme of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme: theme });
		// L'appli suit le thème du système : la classe `dark` de <html> le dit
		await page.waitForFunction(
			(dark) => document.documentElement.classList.contains('dark') === dark,
			theme === 'dark'
		);
		await page.screenshot({
			path: `${SHOTS_DIR}/${name}-${theme === 'dark' ? 'sombre' : 'clair'}-${project}.png`
		});
	}
	await page.emulateMedia({ colorScheme: 'light' });
}

/** Capture simple, au nom du projet */
export async function shoot(page: Page, name: string, project: string): Promise<void> {
	await mkdir(SHOTS_DIR, { recursive: true });
	await page.screenshot({ path: `${SHOTS_DIR}/${name}-${project}.png` });
}

/**
 * Une erreur de console née d'une navigation : la page qu'on quitte voit ses requêtes de fond
 * coupées et l'écrit. Firefox le fait à chaque navigation (« NetworkError when attempting to fetch
 * resource. », et son canal temps réel fermé : « Channel "user-notifications" error », ou sa
 * websocket coupée : « The connection to ws://… was interrupted while the page was loading »), WebKit
 * (« Load failed ») et Chromium (« Failed to fetch ») plus rarement. Aucune n'est vue en prod
 * (journal d'erreurs, 30 jours, relevé le 2026-11-26) : bruit des tests, pas de la page.
 */
export function isNavigationAbortNoise(error: string, projectName: string): boolean {
	if (
		/NetworkError when attempting to fetch resource|TypeError: (Load failed|Failed to fetch)/.test(
			error
		)
	) {
		return true;
	}
	return (
		projectName.includes('firefox') &&
		/Channel "user-notifications" error|The connection to ws:\/\/(localhost|127\.0\.0\.1)[^ ]* was interrupted while the page was loading/.test(
			error
		)
	);
}

/** Le texte d'un argument de `console.error` : message d'une erreur, champs d'un objet */
function consoleArgText(arg: JSHandle): Promise<string> {
	return arg.evaluate((value) => {
		const describe = (v: unknown): string =>
			v instanceof Error
				? `${v.name}: ${v.message}`
				: typeof v === 'object' && v !== null
					? JSON.stringify(v, (_key, inner: unknown) =>
							inner instanceof Error ? `${inner.name}: ${inner.message}` : inner
						)
					: String(v);
		return describe(value);
	});
}

/** Page sans erreur de console ni d'exception de page, jusqu'à l'appel de `stop()` */
export function collectErrors(page: Page): { errors: string[] } {
	const bag = { errors: [] as string[] };
	page.on('pageerror', (error) => bag.errors.push(`exception : ${error.message}`));
	page.on('console', (message) => {
		// « Failed to load resource » : la ressource est dite (avec son adresse) par l'écoute des réponses
		if (message.type() !== 'error' || message.text().startsWith('Failed to load resource')) return;
		const line = `console : ${message.text()}`;
		bag.errors.push(line);
		// Firefox écrit un objet passé à `console.error` « JSHandle@object » : on lit son texte.
		// L'erreur est notée tout de suite ; son texte complet remplace la ligne si elle est encore
		// là (un test qui a vidé la liste entre-temps ne la voit pas revenir)
		if (message.text().includes('JSHandle@')) {
			void Promise.all(message.args().map(consoleArgText))
				.then((parts) => {
					const index = bag.errors.indexOf(line);
					if (index !== -1) bag.errors[index] = `console : ${parts.join(' ')}`;
				})
				.catch(() => undefined);
		}
	});
	// Une ressource refusée : on veut son adresse, que la console ne donne pas
	page.on('response', (response) => {
		// Mesure d'audience de Vercel : script de débogage refusé (403) en local, sans rapport avec la page
		if (response.url().includes('vercel-scripts.com')) return;
		if (response.status() >= 400) bag.errors.push(`HTTP ${response.status()} : ${response.url()}`);
	});
	return bag;
}

/**
 * `goto` qui laisse la page finir : sous WebKit, une navigation encore en cours de la page
 * précédente interrompt le `goto` suivant (« interrupted by another navigation ») ; on le rejoue
 * après avoir laissé le réseau se calmer (sans exiger le calme total : certaines pages ne l'ont jamais)
 */
export async function gotoSettled(page: Page, url: string) {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const response = await page.goto(url);
			await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
			return response;
		} catch (error) {
			if (!String(error).includes('interrupted by another navigation')) throw error;
			await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
		}
	}
	throw new Error(`navigation vers ${url} sans cesse interrompue`);
}
