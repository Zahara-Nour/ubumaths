import { expect, test, type Locator, type Page, type Route } from '@playwright/test';
import { formatSeriesDuration, seriesTotalSeconds } from '../../src/lib/questions/series-summary';
import { assertLocalServerEnv, sql } from './helpers/carnet';
import { expectNoHorizontalOverflow, shoot } from './helpers/pages';

/**
 * `/automaths` — vue « Programme », « Ma série », questions différentes — paquet 9 du tri
 * ========================================================================================
 *
 * Reprend les lignes #2866 (vue « Programme »), #2875 (« Ma série » : colonne, bouton rond, barre),
 * #2954 / #2955 (répétitions au-delà des questions différentes) de
 * `docs/wip/verifications-manuelles.md`.
 *
 * Page publique, sans compte : jouable contre la prod (`VERIFS_URL=https://chiph.re`), sauf #2954 /
 * #2955 (modèles posés en base locale). « Ma série » vit dans le `localStorage` du navigateur du test.
 *
 * Mots changés par une décision écrite : le panier s'appelle « Ma série » (`921719ffa3`, 2026-11-19).
 * #2954 : pour un modèle à UNE seule question, la tuile dit « Ce modèle n'a qu'une question. » (et non
 * « n'a que 1 questions différentes ») : c'est le texte de `CartQuestionCard.svelte` depuis la PR #2954.
 *
 * Le décor (largeur) se fixe par `test.use` : le même test vaut sur tous les projets.
 */

// Types

interface Catalogue {
	templates: { id: string; title: string }[];
}

// Constantes

const LOCAL = process.env.VERIFS_URL === undefined;
const CART_KEY = 'chiphre_question_cart';
const PHONE = { width: 390, height: 844 };
const TABLET = { width: 800, height: 900 };
const DESKTOP = { width: 1100, height: 900 };
const WIDE = { width: 1400, height: 900 };
const SHOTS = 'automaths9';

test.beforeEach(() => test.setTimeout(300_000));

// Fonctions

const projectName = (): string => test.info().project.name;

/** Ouvre une adresse du catalogue ; rend une fois la liste des modèles reçue et la page calme */
async function openCatalogue(page: Page, url = '/automaths'): Promise<Catalogue> {
	let received: Catalogue | null = null;
	const handler = async (route: Route) => {
		const response = await route.fetch();
		const body = await response.text();
		received = JSON.parse(body) as Catalogue;
		await route.fulfill({ response, body });
	};
	await page.route('**/api/questions/templates/all', handler);
	try {
		await page.goto(url);
		await expect.poll(() => received !== null, { timeout: 120_000 }).toBe(true);
		await page.waitForLoadState('networkidle');
	} finally {
		await page.unroute('**/api/questions/templates/all', handler);
	}
	return received as unknown as Catalogue;
}

async function cartItems(
	page: Page
): Promise<{ templateId: string; quantity: number; delay: number }[]> {
	return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]'), CART_KEY);
}

const cardButtons = (page: Page): Locator =>
	page.getByRole('button', { name: /^(Ajouter à ma série|Dans ma série : retirer)$/ });

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const viewGroup = (page: Page): Locator => page.getByRole('group', { name: 'Parcourir par' });
const viewButton = (page: Page, name: 'Programme' | 'Notions'): Locator =>
	viewGroup(page).getByRole('button', { name, exact: true });

/** Le bouton « Chapitre : … · n » (tablette, téléphone), absent sur grand écran */
const chapterButton = (page: Page): Locator => page.getByRole('button', { name: /^Chapitre : / });

/** La liste des chapitres du moment : colonne (grand écran) ou panneau ouvert (téléphone) */
async function chapterList(page: Page): Promise<Locator> {
	if (await chapterButton(page).isVisible()) {
		await chapterButton(page).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		return dialog.getByRole('navigation', { name: 'Chapitres', exact: true });
	}
	return page.getByRole('navigation', { name: 'Chapitres', exact: true });
}

/** Ouvre tous les groupes de la liste (parties) pour voir tous les chapitres */
async function expandAll(nav: Locator): Promise<void> {
	for (let guard = 0; guard < 30; guard++) {
		const closed = nav.locator('button[aria-expanded="false"]');
		if ((await closed.count()) === 0) return;
		await closed.first().evaluate((button) => (button as HTMLElement).click());
	}
}

/** Les chapitres de la liste : nom et compteur lus dans le nom accessible */
async function chapters(page: Page): Promise<{ name: string; count: number }[]> {
	const nav = await chapterList(page);
	await expandAll(nav);
	const items = await nav
		.locator('ul ul button, :scope > ul > li > button:not([aria-expanded])')
		.evaluateAll((buttons) =>
			buttons.map((button) => ({
				name: button.querySelector('span.flex-1')?.textContent?.trim() ?? '',
				count: Number(button.querySelector('span[aria-hidden="true"]')?.textContent?.trim())
			}))
		);
	if (await chapterButton(page).isVisible()) await page.keyboard.press('Escape');
	return items;
}

/** Choisit un chapitre par son nom (ouvre le panneau au téléphone) */
async function chooseChapter(page: Page, name: string): Promise<void> {
	const nav = await chapterList(page);
	await expandAll(nav);
	await nav
		.getByRole('button', { name: new RegExp(`^${escapeRegExp(name)}\\s*,`) })
		.first()
		.evaluate((button) => (button as HTMLElement).click());
	await expect(page.locator('#catalogue-titre')).toHaveText(name);
}

/** Titres des sections du chapitre affiché (un par point du BO) */
const pointTitles = (page: Page): Locator =>
	page.locator('section[aria-labelledby^="point-"] > h3');

async function titleTexts(page: Page): Promise<string[]> {
	const raw = await pointTitles(page).allInnerTexts();
	// Le compteur « · n questions » ne fait pas partie de l'intitulé du point
	return raw.map((text) => text.replace(/\s*·\s*\d+ questions?\s*$/, '').trim());
}

// ============================================================================
// #2866 — vue « Programme »
// ============================================================================

for (const [label, viewport] of [
	['téléphone', PHONE],
	['ordinateur', DESKTOP]
] as const) {
	test.describe(`#2866 — vue « Programme » de /automaths?niveau=5, ${label}`, () => {
		test.use({ viewport });

		test('#2866 — un niveau choisi : bascule « Programme | Notions », Programme d’abord ; parties → chapitres à compteurs', async ({
			page
		}) => {
			await openCatalogue(page, '/automaths?niveau=5');
			await expect(viewButton(page, 'Programme')).toHaveAttribute('aria-pressed', 'true');
			await expect(viewButton(page, 'Notions')).toHaveAttribute('aria-pressed', 'false');
			// Programme d'abord : Programme est le premier de la bascule
			const labels = await viewGroup(page).getByRole('button').allInnerTexts();
			expect(labels.map((text) => text.trim())).toEqual(['Programme', 'Notions']);
			// Colonne (ou panneau « Chapitre : … ») : parties → chapitres à compteurs
			if (label === 'téléphone') {
				await expect(chapterButton(page)).toBeVisible();
				await expect(chapterButton(page)).toHaveText(/^Chapitre : .+ · \d+\s*$/);
			}
			const nav = await chapterList(page);
			const parts = nav.locator(':scope > ul > li > button[aria-expanded]');
			expect(await parts.count(), 'parties du programme').toBeGreaterThan(0);
			// Le panneau du téléphone se referme avant de relire la liste
			if (label === 'téléphone') {
				await page.keyboard.press('Escape');
				await expect(page.getByRole('dialog')).toHaveCount(0);
			}
			const list = await chapters(page);
			expect(list.length, 'chapitres').toBeGreaterThan(1);
			for (const chapter of list) {
				expect(chapter.name.length).toBeGreaterThan(0);
				expect(Number.isFinite(chapter.count), `compteur de « ${chapter.name} »`).toBe(true);
			}
			await shoot(page, `${SHOTS}-2866-programme-${label}`, projectName());
		});

		test('#2866 — un chapitre = une section par point du BO ; questions dessous (« Questions de « … » » quand elles viennent de la notion), « Pas encore de question » sinon', async ({
			page
		}) => {
			test.setTimeout(600_000);
			await openCatalogue(page, '/automaths?niveau=5');
			const list = await chapters(page);
			let withFallback: string | null = null;
			let withoutQuestion: string | null = null;
			let withCards: string | null = null;
			for (const chapter of list) {
				await chooseChapter(page, chapter.name);
				const titles = await titleTexts(page);
				expect(titles.length, `sections de « ${chapter.name} »`).toBeGreaterThan(0);
				// Chaque section a une rubrique de questions ou la ligne grise
				const sections = page.locator('section[aria-labelledby^="point-"]');
				const sectionCount = await sections.count();
				for (let index = 0; index < sectionCount; index++) {
					const text = await sections.nth(index).innerText();
					const hasEmpty = text.includes('Pas encore de question');
					const hasCounter = /·\s*\d+ questions?/.test(text);
					expect(hasEmpty !== hasCounter, `section « ${titles[index]} » : vide XOR compteur`).toBe(
						true
					);
					if (hasEmpty) withoutQuestion ??= `${chapter.name} > ${titles[index]}`;
					if (/Questions de «.+»/.test(text)) withFallback ??= `${chapter.name} > ${titles[index]}`;
					if (hasCounter) withCards ??= `${chapter.name} > ${titles[index]}`;
				}
				// Le compteur du chapitre = somme des compteurs de ses sections (questions distinctes)
				if (withFallback && withoutQuestion && withCards) break;
			}
			expect(withCards, 'un point avec ses questions dessous').not.toBeNull();
			expect(withFallback, 'un point dont les questions viennent de la notion').not.toBeNull();
			expect(withoutQuestion, 'un point « Pas encore de question »').not.toBeNull();
			test.info().annotations.push({
				type: 'sections',
				description: `questions : ${withCards} ; notion : ${withFallback} ; vide : ${withoutQuestion}`
			});
		});

		test('#2866 — « et niveaux inférieurs » ajoute des questions sans changer le programme ; « Tous les niveaux » → vue Notions seule', async ({
			page
		}) => {
			test.setTimeout(600_000);
			await openCatalogue(page, '/automaths?niveau=5');
			const before = await chapters(page);
			const first = before[0].name;
			await chooseChapter(page, first);
			const titlesBefore = await titleTexts(page);

			await page.getByRole('checkbox', { name: 'et niveaux inférieurs' }).click();
			await expect(page.getByRole('checkbox', { name: 'et niveaux inférieurs' })).toBeChecked();
			await expect(viewButton(page, 'Programme')).toHaveAttribute('aria-pressed', 'true');
			const after = await chapters(page);
			// Même programme : mêmes chapitres, dans le même ordre ; mêmes sections dans le premier
			expect(after.map((chapter) => chapter.name)).toEqual(before.map((chapter) => chapter.name));
			await chooseChapter(page, first);
			expect(await titleTexts(page)).toEqual(titlesBefore);
			// Des questions en plus : aucun compteur ne baisse, au moins un monte
			for (let index = 0; index < before.length; index++) {
				expect(after[index].count, `compteur de « ${before[index].name} »`).toBeGreaterThanOrEqual(
					before[index].count
				);
			}
			expect(
				after.some((chapter, index) => chapter.count > before[index].count),
				'au moins un chapitre gagne des questions'
			).toBe(true);

			// « Tous les niveaux » : plus de bascule, vue Notions seule
			await page.getByRole('combobox', { name: /^Niveau/ }).click();
			await page.getByRole('option', { name: 'Tous les niveaux', exact: true }).click();
			await expect(page.getByRole('combobox', { name: 'Niveau : tous les niveaux' })).toBeVisible();
			await expect(viewGroup(page)).toHaveCount(0);
			await expect(page.getByRole('navigation', { name: 'Chapitres', exact: true })).toHaveCount(0);
			if (label === 'téléphone') {
				await expect(page.getByRole('button', { name: /^Notion : / })).toBeVisible();
			} else {
				await expect(page.getByRole('navigation', { name: 'Notions', exact: true })).toBeVisible();
			}
		});

		test('#2866 — la recherche remplace les deux vues ; recharger garde la vue et le chapitre', async ({
			page
		}) => {
			test.setTimeout(600_000);
			await openCatalogue(page, '/automaths?niveau=5');
			const list = await chapters(page);
			const second = list[1].name;
			await chooseChapter(page, second);
			const params = new URL(page.url()).searchParams;
			expect(params.get('vue'), 'vue dans l’adresse').toBe('programme');
			expect(params.get('chapitre'), 'chapitre dans l’adresse').not.toBeNull();

			// Recharger : même vue, même chapitre
			await page.reload();
			await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
			await expect(viewButton(page, 'Programme')).toHaveAttribute('aria-pressed', 'true', {
				timeout: 60_000
			});
			await expect(page.locator('#catalogue-titre')).toHaveText(second, { timeout: 60_000 });
			expect(new URL(page.url()).searchParams.get('chapitre')).toBe(params.get('chapitre'));

			// Vue Notions choisie : elle aussi survit au rechargement
			await viewButton(page, 'Notions').click();
			await expect(viewButton(page, 'Notions')).toHaveAttribute('aria-pressed', 'true');
			await expect(page.getByRole('navigation', { name: /^Chapitres$/ })).toHaveCount(0);
			await page.reload();
			await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
			await expect(viewButton(page, 'Notions')).toHaveAttribute('aria-pressed', 'true', {
				timeout: 60_000
			});
			await viewButton(page, 'Programme').click();
			await expect(viewButton(page, 'Programme')).toHaveAttribute('aria-pressed', 'true');
			await expect(page.locator('#catalogue-titre')).toBeVisible();

			// La recherche remplace les deux vues : plus de bascule ni de liste de chapitres
			await page.getByRole('searchbox', { name: 'Chercher une question' }).fill('fraction');
			await expect(page.getByText(/^\d+ questions?$/)).toBeVisible({ timeout: 60_000 });
			await expect(viewGroup(page)).toHaveCount(0);
			await expect(page.locator('#catalogue-titre')).toHaveCount(0);
			await expect(page.getByRole('navigation', { name: 'Chapitres', exact: true })).toHaveCount(0);
			await expectNoHorizontalOverflow(page, 'recherche');
		});
	});
}

// ============================================================================
// #2875 — « Ma série » dans le catalogue
// ============================================================================

/** Durée attendue d'une série, d'après ce que le navigateur a vraiment enregistré */
async function expectedSummary(page: Page): Promise<string> {
	const items = await cartItems(page);
	const count = items.length;
	return `${count} question${count > 1 ? 's' : ''} · environ ${formatSeriesDuration(
		seriesTotalSeconds(items as Parameters<typeof seriesTotalSeconds>[0])
	)}`;
}

test.describe('#2875 — « Ma série », grand écran (≥ 1 280 px)', { tag: '@bureau' }, () => {
	test.use({ viewport: WIDE });

	test('#2875 — colonne à droite qui reste visible en descendant : résumé, ×répétitions, croix qui retire, « Ouvrir ma série »', async ({
		page
	}) => {
		await openCatalogue(page);
		const aside = page.getByRole('complementary', { name: 'Ma série' });
		await expect(aside).toBeVisible();
		await expect(aside.getByText('Ta série est vide')).toBeVisible();
		await cardButtons(page).locator('visible=true').nth(0).click();
		await cardButtons(page).locator('visible=true').nth(1).click();
		await expect.poll(async () => (await cartItems(page)).length).toBe(2);
		const summary = await expectedSummary(page);
		await expect(aside.getByText(summary, { exact: true })).toBeVisible();
		await expect(aside.getByText(summary)).toHaveText(/^2 questions · environ \d+ (s|min)/);
		// Une ligne par modèle, avec ×répétitions et une croix
		const lines = aside.getByRole('listitem');
		await expect(lines).toHaveCount(2);
		await expect(lines.nth(0).getByText(/^×\d+$/)).toBeVisible();
		await expect(aside.getByRole('button', { name: /^Retirer / })).toHaveCount(2);

		// La colonne reste visible quand on descend dans la page
		// La colonne elle-même est la boîte collante (`data-series-sticky`)
		const sticky = page.locator('[data-series-sticky]');
		const topBefore = (await sticky.boundingBox())!.y;
		await page.evaluate(() => {
			const main = document.querySelector('main')!;
			main.scrollTo(0, 1500);
			window.scrollTo(0, 1500);
		});
		await page.waitForTimeout(500);
		const scrolled = await page.evaluate(() => {
			const main = document.querySelector('main')!;
			return Math.max(main.scrollTop, window.scrollY);
		});
		expect(scrolled, 'la page a bien défilé').toBeGreaterThan(500);
		const box = (await sticky.boundingBox())!;
		expect(box.y, 'colonne toujours dans la fenêtre après avoir descendu').toBeGreaterThanOrEqual(
			0
		);
		expect(box.y, 'haut de la colonne dans la fenêtre').toBeLessThan(WIDE.height / 2);
		expect(
			Math.abs(box.y - topBefore),
			'colonne collante : son haut ne bouge presque pas'
		).toBeLessThan(100);
		await shoot(page, `${SHOTS}-2875-colonne`, projectName());

		// La croix retire la ligne
		await aside
			.getByRole('button', { name: /^Retirer / })
			.first()
			.click();
		await expect.poll(async () => (await cartItems(page)).length).toBe(1);
		await expect(aside.getByText(await expectedSummary(page), { exact: true })).toBeVisible();

		// « Ouvrir ma série » : la page détaillée, titrée « Ma série »
		await aside.getByRole('link', { name: 'Ouvrir ma série' }).click();
		await expect(page).toHaveURL(/\/automaths\/panier$/);
		await expect(page.getByRole('heading', { level: 1, name: 'Ma série' })).toBeVisible();
	});
});

test.describe('#2875 — « Ma série », tablette', () => {
	test.use({ viewport: TABLET });

	test('#2875 — bouton rond → panneau à droite (pas de colonne)', async ({ page }) => {
		await openCatalogue(page);
		await expect(page.getByRole('complementary', { name: 'Ma série' })).toBeHidden();
		const round = page.getByRole('button', { name: 'Voir ma série' });
		await expect(round).toBeVisible();
		await cardButtons(page).locator('visible=true').first().click();
		await round.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Ma série' })).toBeVisible();
		await expect(dialog.getByText(await expectedSummary(page), { exact: true })).toBeVisible();
		await expect(dialog.getByRole('link', { name: 'Ouvrir ma série' })).toBeVisible();
		await page.waitForTimeout(600);
		const box = (await dialog.boundingBox())!;
		expect(
			box.x + box.width,
			'bord droit du panneau = bord droit de la fenêtre'
		).toBeGreaterThanOrEqual(TABLET.width - 2);
		expect(box.x, 'le panneau est à droite, pas pleine largeur').toBeGreaterThan(TABLET.width / 3);
		expect(box.height, 'pleine hauteur').toBeGreaterThanOrEqual(TABLET.height - 2);
		await shoot(page, `${SHOTS}-2875-tablette`, projectName());
	});
});

test.describe('#2875 — « Ma série », téléphone', () => {
	test.use({ viewport: PHONE });

	test('#2875 — pas de barre si vide ; une question → barre en bas → panneau du bas ; la barre ne masque pas le dernier « Ajouter »', async ({
		page
	}) => {
		test.setTimeout(300_000);
		await openCatalogue(page);
		const bar = page.getByRole('button', { name: /^Ma série · / });
		await expect(bar).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Voir ma série' })).toBeHidden();

		await cardButtons(page).locator('visible=true').first().click();
		await expect(bar).toBeVisible();
		await expect(bar).toHaveText(
			new RegExp(
				`^Ma série · ${escapeRegExp(await expectedSummary(page).then((text) => text.replace('environ ', '')))}`
			)
		);
		const barBox = (await bar.boundingBox())!;
		expect(barBox.y + barBox.height, 'barre collée au bas de la fenêtre').toBeGreaterThanOrEqual(
			PHONE.height - 2
		);

		// Le dernier « Ajouter » remonte au-dessus de la barre : mesure des boîtes en bas de page
		let previous = -1;
		for (let attempt = 0; attempt < 40; attempt++) {
			const height = await page.evaluate(() => {
				const main = document.querySelector('main')!;
				main.scrollTo(0, main.scrollHeight);
				return main.scrollHeight;
			});
			await page.waitForTimeout(400);
			const atBottom = await page.evaluate(() => {
				const main = document.querySelector('main')!;
				return main.clientHeight + main.scrollTop >= main.scrollHeight - 1;
			});
			if (atBottom && height === previous) break;
			previous = height;
		}
		const last = cardButtons(page).last();
		const lastBox = (await last.boundingBox())!;
		expect(
			lastBox.y + lastBox.height,
			'bas du dernier « Ajouter » ≤ haut de la barre'
		).toBeLessThanOrEqual(barBox.y);

		// Panneau du bas
		await bar.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('heading', { name: 'Ma série' })).toBeVisible();
		await page.waitForTimeout(600);
		const box = (await dialog.boundingBox())!;
		expect(box.y + box.height, 'panneau collé au bas').toBeGreaterThanOrEqual(PHONE.height - 2);
		expect(box.width, 'pleine largeur').toBeGreaterThanOrEqual(PHONE.width - 2);
		expect(box.height, 'au plus 80 % de la hauteur').toBeLessThanOrEqual(PHONE.height * 0.8 + 2);
		// Retirer la dernière question : plus de barre une fois le panneau fermé
		await dialog.getByRole('button', { name: /^Retirer / }).click();
		await page.keyboard.press('Escape');
		await expect(bar).toHaveCount(0);
		expect(await cartItems(page)).toHaveLength(0);
	});
});

test.describe('#2875 — tuiles « Ajouter » / « Dans ma série » et page détaillée', () => {
	test.use({ viewport: DESKTOP });

	test('#2875 — la tuile passe de « Ajouter à ma série » à « Dans ma série : retirer » et revient', async ({
		page
	}) => {
		await openCatalogue(page);
		const add = page.getByRole('button', { name: 'Ajouter à ma série' }).locator('visible=true');
		const inside = page
			.getByRole('button', { name: 'Dans ma série : retirer' })
			.locator('visible=true');
		await expect(inside).toHaveCount(0);
		await add.first().click();
		await expect(inside).toHaveCount(1);
		await inside.first().click();
		await expect(inside).toHaveCount(0);
		expect(await cartItems(page)).toHaveLength(0);
	});

	test('#2875 — page détaillée titrée « Ma série » ; en fin de série (forme Saisie), « Retour à ma série » y ramène', async ({
		page
	}) => {
		await openCatalogue(page);
		await cardButtons(page).locator('visible=true').first().click();
		await expect.poll(async () => (await cartItems(page)).length).toBe(1);
		await page.goto('/automaths/panier');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { level: 1, name: 'Ma série' })).toBeVisible();
		await expect(page).toHaveTitle(/Ma série/);
		await page.getByRole('button', { name: /Commencer un test/ }).click();
		await page.getByRole('dialog').getByText('Saisie', { exact: true }).click();
		const card = page.getByTestId('typing-card');
		await card.locator('.flip-card-front').waitFor({ timeout: 60_000 });
		// Une seule question : on la valide telle quelle, puis on termine
		await card.getByRole('button', { name: 'Valider' }).click();
		await page.locator('[data-typing-next]').click();
		const back = page.getByRole('button', { name: 'Retour à ma série' });
		await expect(back).toBeVisible({ timeout: 30_000 });
		await shoot(page, `${SHOTS}-2875-fin-de-serie`, projectName());
		await back.click();
		await expect(page).toHaveURL(/\/automaths\/panier/);
		await expect(page.getByRole('heading', { level: 1, name: 'Ma série' })).toBeVisible();
	});
});

// ============================================================================
// #2954 / #2955 — questions différentes
// ============================================================================

const variation = (statement: string, answer: string, variables: unknown[] = []) => ({
	statement,
	variables,
	blanks: [{ expectedAnswer: answer }]
});

test.describe('#2954 #2955 — « Ce modèle n’a que N questions différentes »', () => {
	test.skip(!LOCAL, 'modèles posés en base locale');
	test.describe.configure({ mode: 'serial' });
	test.use({ viewport: DESKTOP });

	let titles = { unique: '', cinq: '', beaucoup: '' };
	const ids: string[] = [];

	async function sweep(): Promise<void> {
		await sql(`delete from question_templates where title like $1`, [
			`Verifs9 auto ${projectName()} %`
		]);
	}

	test.beforeAll(async () => {
		assertLocalServerEnv();
		await sweep();
		titles = {
			unique: `Verifs9 auto ${projectName()} unique`,
			cinq: `Verifs9 auto ${projectName()} cinq`,
			beaucoup: `Verifs9 auto ${projectName()} beaucoup`
		};
		const rows: [string, unknown][] = [
			[titles.unique, [variation('Verifs9 : combien font 2 + 3 ?\n\n$?$', '5')]],
			[
				titles.cinq,
				[
					variation('Verifs9 : calcule ${{a}} + 1$ ?\n\n$?$', '{{eval:{{a}}+1}}', [
						{ name: 'a', expression: '{{random:1..5}}' }
					])
				]
			],
			[
				titles.beaucoup,
				[
					variation('Verifs9 : calcule ${{a}} + 1$ ?\n\n$?$', '{{eval:{{a}}+1}}', [
						{ name: 'a', expression: '{{random:1..500}}' }
					])
				]
			]
		];
		for (const [title, variations] of rows) {
			const [row] = await sql<{ id: string }>(
				`insert into question_templates (type, grades, level, variations, status, title, delay)
				 values ('fill_in_blanks', array['6'], 1, $1::jsonb, 'published', $2, 20) returning id`,
				[JSON.stringify(variations), title]
			);
			ids.push(row.id);
		}
	});
	test.afterAll(async () => {
		await sweep();
	});

	/** Cherche le modèle par son titre dans le catalogue et l'ajoute à « Ma série » */
	async function addFromCatalogue(page: Page, title: string): Promise<void> {
		await page.getByRole('searchbox', { name: 'Chercher une question' }).fill(title);
		await expect(page.getByText(/^\d+ questions?$/)).toBeVisible({ timeout: 60_000 });
		const group = page.getByRole('button', {
			name: new RegExp(`${escapeRegExp(title)}|Non classé`)
		});
		if (await group.first().isVisible()) {
			const expanded = await group.first().getAttribute('aria-expanded');
			if (expanded === 'false') await group.first().click();
		}
		await page
			.getByRole('button', { name: 'Ajouter à ma série' })
			.locator('visible=true')
			.first()
			.click();
	}

	const warning = (page: Page): Locator => page.locator('[data-trop-de-repetitions]');
	const plus = (page: Page): Locator =>
		page.getByRole('button', { name: 'Augmenter le nombre de répétitions' });

	test('#2954 — un modèle à une seule question, répétitions montées → « Ce modèle n’a qu’une question. » et « Passer à 1 » ramène à 1', async ({
		page
	}) => {
		await openCatalogue(page);
		await addFromCatalogue(page, titles.unique);
		const items = await cartItems(page);
		expect(items.map((item) => item.templateId)).toEqual([ids[0]]);
		await page.goto('/automaths/panier');
		await page.waitForLoadState('networkidle');
		await expect(warning(page)).toHaveCount(0);
		await plus(page).click();
		await expect(warning(page)).toBeVisible();
		await expect(warning(page)).toContainText("Ce modèle n'a qu'une question.");
		await page.getByRole('button', { name: 'Passer à 1 répétition' }).click();
		await expect(warning(page)).toHaveCount(0);
		expect((await cartItems(page))[0].quantity).toBe(1);
		await shoot(page, `${SHOTS}-2954-unique`, projectName());
	});

	test('#2955 — « Calcule a + 1 » (a de 1 à 5), répétitions au-dessus de 5 → « n’a que 5 questions différentes. », « Passer à 5 » ramène à 5 ; lancer la série : aucune question répétée', async ({
		page
	}) => {
		await openCatalogue(page);
		await addFromCatalogue(page, titles.cinq);
		expect((await cartItems(page)).map((item) => item.templateId)).toEqual([ids[1]]);
		await page.goto('/automaths/panier');
		await page.waitForLoadState('networkidle');
		// Jusqu'à 5 répétitions : rien
		for (let n = 2; n <= 5; n++) {
			await plus(page).click();
			await expect.poll(async () => (await cartItems(page))[0].quantity).toBe(n);
		}
		await expect(warning(page)).toHaveCount(0);
		// 6 répétitions : l'avertissement
		await plus(page).click();
		await expect(warning(page)).toBeVisible();
		await expect(warning(page)).toContainText("Ce modèle n'a que 5 questions différentes.");
		await page.getByRole('button', { name: 'Passer à 5 répétitions' }).click();
		await expect(warning(page)).toHaveCount(0);
		expect((await cartItems(page))[0].quantity).toBe(5);
		await shoot(page, `${SHOTS}-2955-cinq`, projectName());

		// Lancer la série (forme Saisie) : les 5 questions sont différentes
		await page.getByRole('button', { name: /Commencer un test/ }).click();
		await page.getByRole('dialog').getByText('Saisie', { exact: true }).click();
		const card = page.getByTestId('typing-card');
		const seen: string[] = [];
		for (let position = 0; position < 5; position++) {
			await card.locator('.flip-card-front').waitFor({ timeout: 60_000 });
			await expect(card.getByRole('button', { name: 'Valider' })).toBeVisible();
			// `textContent` : la formule dessinée garde sa source (« 3 + 1 ») dans l'élément, que `innerText` ne lit pas
			const shown = ((await card.locator('.flip-card-front').textContent()) ?? '')
				.replace(/\s+/g, ' ')
				.trim();
			seen.push(shown);
			await card.getByRole('button', { name: 'Valider' }).click();
			await page.locator('[data-typing-next]').click();
		}
		expect(seen, '5 énoncés').toHaveLength(5);
		expect(new Set(seen).size, `énoncés tous différents : ${JSON.stringify(seen)}`).toBe(5);
	});

	test('#2954 — un modèle à beaucoup de questions : rien sous la tuile, même avec beaucoup de répétitions', async ({
		page
	}) => {
		await openCatalogue(page);
		await addFromCatalogue(page, titles.beaucoup);
		await page.goto('/automaths/panier');
		await page.waitForLoadState('networkidle');
		for (let n = 2; n <= 8; n++) {
			await plus(page).click();
			await expect.poll(async () => (await cartItems(page))[0].quantity).toBe(n);
		}
		await expect(warning(page)).toHaveCount(0);
		await expect(page.getByText(/questions différentes/)).toHaveCount(0);
	});
});
