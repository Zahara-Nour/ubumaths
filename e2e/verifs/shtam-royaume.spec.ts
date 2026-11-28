import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { textInkBoxes } from './helpers/encre-texte';

/**
 * Le Shtam en journal (#1991) et les cartes du Royaume (#2138)
 * =============================================================
 *
 * Pages publiques, sans compte : ce fichier peut tourner contre la prod
 * (`VERIFS_URL=https://chiph.re`), il n'écrit rien. Captures à l'œil de la session :
 * `.captures/verifs/shtam-royaume/`.
 */

// ============================================================================
// CONSTANTES
// ============================================================================

const SHOTS_DIR = '.captures/verifs/shtam-royaume';

// ============================================================================
// FUNCTIONS
// ============================================================================

async function open(page: Page, address: string): Promise<void> {
	await page.goto(address);
	await page.waitForLoadState('networkidle');
}

async function shoot(page: Page, name: string, projectName: string): Promise<void> {
	await mkdir(SHOTS_DIR, { recursive: true });
	await page.screenshot({ path: `${SHOTS_DIR}/${name}-${projectName}.png`, fullPage: true });
}

/** Aucun défilement horizontal de la page */
async function expectNoHorizontalScroll(page: Page): Promise<void> {
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow).toBeLessThanOrEqual(1);
}

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** Tolérance, en pixels, de chaque côté d'une boîte d'encre (cases de caractères un peu larges) */
const INSET = 1;

function overlaps(a: Box, b: Box): boolean {
	return (
		a.x + INSET < b.x + b.width - INSET &&
		b.x + INSET < a.x + a.width - INSET &&
		a.y + INSET < b.y + b.height - INSET &&
		b.y + INSET < a.y + a.height - INSET
	);
}

// ============================================================================
// TESTS
// ============================================================================

test('#1991 — le Shtam en journal : bandeau, une, pages de deux articles', async ({
	page
}, testInfo) => {
	await open(page, '/shtam');
	const main = page.locator('main');
	const front = (await main.innerText()).replace(/\s+/g, ' ');
	expect(front).toMatch(/N° \d+/);
	expect(front.toLowerCase()).toContain('prix : 1 gidouille');
	await expect(main.getByRole('link', { name: /Lire la suite, page 2/ })).toBeVisible();
	// Les titres de la une renvoient à leur page
	const titles = main.locator('a[href*="/shtam?page="][href*="#"]');
	expect(await titles.count()).toBeGreaterThanOrEqual(4);
	await expectNoHorizontalScroll(page);
	for (const scheme of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme: scheme });
		await shoot(page, `1991-une-${scheme}`, testInfo.project.name);
	}
	await page.emulateMedia({ colorScheme: 'light' });

	// Un clic sur un titre mène à l'article, dans sa page
	const firstTitle = titles.first();
	const target = (await firstTitle.getAttribute('href')) ?? '';
	const anchor = target.split('#')[1] ?? '';
	expect(anchor).not.toBe('');
	await firstTitle.click();
	await page.waitForURL((url) => url.hash === `#${anchor}`);
	await expect(page.locator(`[id="${anchor}"]`)).toBeVisible();

	// De page en page jusqu'à la dernière : au plus deux articles, chacun avec son vrai du faux
	await open(page, '/shtam?page=2');
	let pages = 0;
	for (;;) {
		pages++;
		const articles = page.locator('main article').locator('visible=true');
		const count = await articles.count();
		expect(count, page.url()).toBeGreaterThanOrEqual(1);
		expect(count, page.url()).toBeLessThanOrEqual(2);
		for (let index = 0; index < count; index++) {
			expect((await articles.nth(index).innerText()).toLowerCase(), page.url()).toContain(
				'vrai du faux'
			);
		}
		await expectNoHorizontalScroll(page);
		const next = page.getByRole('link', { name: /Page \d+ →/ }).locator('visible=true');
		if ((await next.count()) === 0) break;
		expect(pages, 'la boucle de pages ne finit pas : lien « Page n → » sans fin').toBeLessThan(30);
		// Par son adresse : le lien est redessiné pendant le clic (« element not stable »)
		const href = await next.first().getAttribute('href');
		expect(href).not.toBeNull();
		await page.goto(href ?? '');
		await page.waitForLoadState('networkidle');
	}
	expect(pages).toBeGreaterThanOrEqual(2);
});

test('#1991 — au téléphone : une seule colonne', async ({ page }, testInfo) => {
	test.skip(testInfo.project.use.isMobile !== true, 'Au téléphone seulement');
	await open(page, '/shtam?page=2');
	const article = page.locator('main article').first();
	const columns = await article.evaluate((element) => {
		const styles = [element, ...element.querySelectorAll('*')].map(
			(node) => getComputedStyle(node).columnCount
		);
		return styles.filter((value) => value !== 'auto' && value !== '1');
	});
	expect(columns).toEqual([]);
	await expectNoHorizontalScroll(page);
	await shoot(page, '1991-page2', testInfo.project.name);
});

test('#2138 — carte du Royaume : noms lisibles, sans chevauchement ni débord', async ({
	page
}, testInfo) => {
	await open(page, '/royaume');
	const names = page.locator('main svg text');
	expect(await names.count()).toBeGreaterThan(10);
	// Boîte de l'encre, pas `getBoundingClientRect()` : celle-ci est gonflée sous le Firefox de
	// Playwright et y faisait se chevaucher « BEDONSTAN » et « Sandomir » (nuit du 2026-11-27),
	// qui ne se touchent pas à l'écran
	const boxes = (await names.evaluateAll(textInkBoxes)).filter(
		(box) => box.width > 0 && box.text.trim() !== ''
	);
	const collisions: string[] = [];
	for (let i = 0; i < boxes.length; i++) {
		for (let j = i + 1; j < boxes.length; j++) {
			if (overlaps(boxes[i], boxes[j])) collisions.push(`${boxes[i].text} / ${boxes[j].text}`);
		}
	}
	expect(collisions).toEqual([]);
	await expectNoHorizontalScroll(page);
	await shoot(page, '2138-carte', testInfo.project.name);
});

test('#2138 — une ville : un lieu touché amène sa fiche', async ({ page }, testInfo) => {
	await open(page, '/royaume/sandomir');
	// La carte est décorative pour les lecteurs d'écran (`aria-hidden`) : on vise le lieu
	// par son `data-place`, comme le doigt
	const map = page.getByTestId('city-map');
	const place = map.locator('text[data-place]').filter({ hasText: 'Le Grand Marché' }).first();
	await expect(place).toBeVisible();
	if (testInfo.project.use.hasTouch === true) await place.tap();
	else await place.click();
	// Le lieu s'entoure, sa fiche vient
	await expect(map.locator('g.place.selected')).toHaveCount(1);
	await expect(map.locator('g.place.selected')).toContainText('Le Grand Marché');
	// Sa fiche (la liste à côté de la carte) est celle du lieu choisi : titre « Le Grand Marché » et description écrite
	const sheet = page.getByTestId('city-places').locator('li[aria-current="true"]');
	await expect(sheet).toHaveCount(1);
	await expect(sheet.getByRole('heading', { name: 'Le Grand Marché' })).toBeVisible();
	await expect(sheet.locator('p.description')).not.toBeEmpty();
	await expectNoHorizontalScroll(page);
	await shoot(page, '2138-ville', testInfo.project.name);
});
