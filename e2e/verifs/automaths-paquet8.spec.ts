import { expect, test, type Locator, type Page, type Route } from '@playwright/test';

/**
 * `/automaths` — recherche, liste des notions, correctifs du catalogue — paquet 8 du tri
 * =======================================================================================
 *
 * Reprend les lignes #2847 (recherche), #2854 (liste des notions) et #2842 (correctifs du
 * catalogue et de « Ma série ») de `docs/wip/verifications-manuelles.md`.
 *
 * Page publique, sans compte : jouable contre la prod (`VERIFS_URL=https://chiph.re`). « Ma série »
 * vit dans le `localStorage` du navigateur du test : aucun état partagé à remettre.
 *
 * Les nombres de la ligne (« 111 questions ») sont ceux de la prod : ici on cherche la plus grosse
 * notion de la base lue, et les attendus se recomptent d'après la liste publique des modèles
 * (`/api/questions/templates/all`) que la page a reçue.
 *
 * Mots de la ligne changés depuis par une décision écrite : le panier s'appelle « Ma série »
 * (`921719ffa3`, 2026-11-19) — « Ajouter au panier » est « Ajouter à ma série », « Dans le panier »
 * est « Dans ma série : retirer » ; sur téléphone le bouton rond est remplacé par une barre en bas
 * (`MySeriesDock`), le bouton rond reste de 640 à 1 279 px.
 *
 * Le décor (largeur) se fixe par `test.use` : le même test vaut sur tous les projets.
 */

// Types

interface Node {
	id: string;
	kind: 'branch' | 'notion' | 'subnotion';
	name: string;
	parent_id: string | null;
}

interface Template {
	id: string;
	title: string;
	description: string | null;
	grades: string[] | null;
	classification_node_id: string | null;
}

interface Point {
	id: string;
	name: string;
}

interface Catalogue {
	templates: Template[];
	nodes: Node[];
	points: Point[];
	templatePoints: Record<string, string[]>;
}

// Constantes

const CART_KEY = 'chiphre_question_cart';
const PHONE = { width: 390, height: 844 };
const TABLET = { width: 800, height: 900 };
const DESKTOP = { width: 1100, height: 900 };

// La liste des modèles (12 Mo) met du temps à venir quand d'autres vérifications chargent le même serveur
test.beforeEach(() => test.setTimeout(240_000));

// Functions

/** Ouvre `/automaths` (ou une adresse) et rend la liste des modèles TELLE QUE LA PAGE L'A REÇUE */
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

/** Minuscules sans accents, tout ce qui n'est ni lettre ni chiffre devient une espace (réécrit ici) */
function plain(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim();
}

/** Texte que la recherche lit pour un modèle : titre, description, notion, sous-notion, points du programme */
function haystack(catalogue: Catalogue, template: Template): string {
	const nodes = new Map(catalogue.nodes.map((node) => [node.id, node]));
	let notion = '';
	let subnotion = '';
	let node = template.classification_node_id ? nodes.get(template.classification_node_id) : null;
	while (node) {
		if (node.kind === 'notion') notion = node.name;
		if (node.kind === 'subnotion') subnotion = node.name;
		node = node.parent_id ? nodes.get(node.parent_id) : undefined;
	}
	const points = new Map(catalogue.points.map((point) => [point.id, point.name]));
	const pointNames = (catalogue.templatePoints[template.id] ?? []).map(
		(id) => points.get(id) ?? ''
	);
	return ` ${plain([template.title, template.description ?? '', notion, subnotion, ...pointNames].join(' '))}`;
}

/** Modèles dont chaque mot de la recherche commence un mot du texte lu (recompté à la main) */
function expectedMatches(
	catalogue: Catalogue,
	query: string,
	grades: readonly string[] | null = null
): Template[] {
	const words = plain(query)
		.split(' ')
		.map((word) => ` ${word}`);
	return catalogue.templates.filter((template) => {
		if (grades && !(template.grades ?? []).some((grade) => grades.includes(grade))) return false;
		const text = haystack(catalogue, template);
		return words.every((word) => text.includes(word));
	});
}

const searchBox = (page: Page): Locator =>
	page.getByRole('searchbox', { name: 'Chercher une question' });

/** Tape dans la recherche et attend le compteur de résultats */
async function search(page: Page, query: string): Promise<void> {
	await searchBox(page).fill(query);
	await expect(page.getByText(/^\d+ questions?$/)).toBeVisible();
}

/** Nombre annoncé au-dessus des résultats (« 12 questions ») */
async function resultTotal(page: Page): Promise<number> {
	const text = await page.getByText(/^\d+ questions?$/).innerText();
	return Number(text.split(' ')[0]);
}

/** Cartes de questions affichées (un bouton « Ajouter à ma série » ou « Dans ma série : retirer » chacune) */
const cardButtons = (page: Page): Locator =>
	page.getByRole('button', { name: /^(Ajouter à ma série|Dans ma série : retirer)$/ });

async function cartItems(page: Page): Promise<unknown[]> {
	return page.evaluate(
		(key) => JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[],
		CART_KEY
	);
}

/** Notions de la liste (ordinateur) ou du panneau du bas (téléphone) : { branche, notion } */
async function chooseGrade(page: Page, displayName: string): Promise<void> {
	await page.getByRole('combobox', { name: /^Niveau/ }).click();
	await page.getByRole('option', { name: displayName, exact: true }).click();
	await expect(page.getByRole('combobox', { name: `Niveau : ${displayName}` })).toBeVisible();
}

/** Le bouton « Notion : … · n » (téléphone, tablette), absent sur grand écran */
const notionButton = (page: Page): Locator => page.getByRole('button', { name: /^Notion : / });

/** La liste des notions du moment : colonne (grand écran) ou panneau ouvert (téléphone) */
async function notionList(page: Page): Promise<Locator> {
	if (await notionButton(page).isVisible()) {
		await notionButton(page).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		return dialog.getByRole('navigation', { name: 'Notions', exact: true });
	}
	return page.getByRole('navigation', { name: 'Notions', exact: true });
}

/**
 * Choisit la dernière notion de la dernière branche (une notion qui n'est pas celle du départ),
 * rend son nom
 */
async function chooseLastNotion(page: Page): Promise<string> {
	const nav = await notionList(page);
	const tops = nav.locator(':scope > ul > li > button[aria-expanded]');
	const lastBranch = tops.last();
	if ((await lastBranch.getAttribute('aria-expanded')) !== 'true') {
		await lastBranch.evaluate((button) => (button as HTMLElement).click());
	}
	await expect(lastBranch).toHaveAttribute('aria-expanded', 'true');
	const notion = nav.locator(':scope > ul > li').last().locator('ul button').last();
	const name = (await notion.locator('span.flex-1').innerText()).trim();
	await notion.evaluate((button) => (button as HTMLElement).click());
	await expect(page.locator('#catalogue-titre')).toHaveText(name);
	return name;
}

// ============================================================================
// #2847 — recherche
// ============================================================================

test.describe('#2847 — recherche Automaths', () => {
	test.use({ viewport: DESKTOP });

	test('#2847 — rien n’a le curseur au chargement (le clavier du téléphone ne s’ouvre pas seul)', async ({
		page
	}) => {
		await openCatalogue(page);
		await expect(searchBox(page)).toBeVisible();
		await expect(searchBox(page)).not.toBeFocused();
		const active = await page.evaluate(() => document.activeElement?.tagName ?? '');
		expect(['BODY', 'HTML']).toContain(active);
	});

	test('#2847 — « / » met le curseur dans « Chercher une question », mais pas quand on tape déjà ailleurs @bureau', async ({
		page
	}) => {
		await openCatalogue(page);
		await page.keyboard.press('/');
		await expect(searchBox(page)).toBeFocused();
		await expect(searchBox(page)).toHaveValue('');
		// Déjà dans le champ : la barre oblique s'écrit
		await page.keyboard.type('a/b');
		await expect(searchBox(page)).toHaveValue('a/b');
	});

	test('#2847 — « double distributivité » trouve les modèles dont seul l’intitulé du programme porte ces mots', async ({
		page
	}) => {
		const catalogue = await openCatalogue(page);
		const found = expectedMatches(catalogue, 'double distributivité');
		// Précondition : un modèle dont ni le titre ni la description ne disent « distributivité »
		const byProgramme = found.filter(
			(template) =>
				!plain(`${template.title} ${template.description ?? ''}`).includes('distributivit')
		);
		expect(byProgramme.length, 'modèles trouvés par l’intitulé du programme seul').toBeGreaterThan(
			0
		);
		await search(page, 'double distributivité');
		expect(await resultTotal(page)).toBe(found.length);
		for (const title of new Set(byProgramme.map((template) => template.title))) {
			await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
		}
	});

	test('#2847 — « aire » ne ramène pas « linéaire » : seuls les modèles où un mot COMMENCE par « aire »', async ({
		page
	}) => {
		const catalogue = await openCatalogue(page);
		const found = expectedMatches(catalogue, 'aire');
		const all = catalogue.templates.filter((template) =>
			haystack(catalogue, template).includes('aire')
		);
		// Précondition : « aire » au milieu d'un mot (« linéaire ») ramènerait plus de modèles
		const lineaireOnly = all.filter((template) => !found.includes(template));
		expect(lineaireOnly.length, 'modèles où « aire » n’est qu’au milieu d’un mot').toBeGreaterThan(
			0
		);
		await search(page, 'aire');
		expect(await resultTotal(page)).toBe(found.length);
		expect(await cardButtons(page).count(), 'cartes affichées').toBeGreaterThan(0);
	});

	test('#2847 — « calcul » : groupes « Branche › Notion › sous-notion · n », les premiers ouverts, un groupe replié s’ouvre AVEC ses cartes', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await openCatalogue(page);
		await search(page, 'calcul');
		const triggers = page.locator('button[aria-expanded]').filter({ hasText: /›.*·\s*\d+/ });
		const count = await triggers.count();
		expect(count, 'groupes de résultats').toBeGreaterThan(3);
		const rows = await triggers.evaluateAll((buttons) =>
			buttons.map((button) => ({
				label: (button.textContent ?? '').replace(/\s+/g, ' ').trim(),
				open: button.getAttribute('aria-expanded') === 'true'
			}))
		);
		for (const row of rows) {
			expect(row.label, 'forme du groupe').toMatch(/^.+ › .+( › .+)? · \d+$/);
		}
		// Les premiers sont ouverts, les suivants repliés : une série d'ouverts, puis de repliés
		expect(rows[0].open, 'le premier groupe est ouvert').toBe(true);
		const firstClosed = rows.findIndex((row) => !row.open);
		expect(firstClosed, 'un groupe replié existe').toBeGreaterThan(0);
		expect(rows.slice(firstClosed).every((row) => !row.open)).toBe(true);
		// Les groupes ouverts d'office tiennent dans 60 cartes (le premier toujours)
		const openedCards = rows
			.slice(0, firstClosed)
			.reduce((sum, row) => sum + Number(row.label.split('·').pop()), 0);
		if (firstClosed > 1) expect(openedCards).toBeLessThanOrEqual(60);

		// Un groupe replié s'ouvre avec ses cartes
		const closed = triggers.nth(firstClosed);
		const expectedCards = Number(rows[firstClosed].label.split('·').pop());
		await closed.scrollIntoViewIfNeeded();
		await closed.evaluate((button) => (button as HTMLElement).click());
		await expect(closed).toHaveAttribute('aria-expanded', 'true');
		const item = closed.locator('xpath=ancestor::*[@data-slot="accordion-item"][1]');
		const cards = item.getByRole('button', { name: 'Ajouter à ma série' });
		await expect(cards.first()).toBeVisible();
		await expect(item.getByText('Chargement…')).toHaveCount(0);
		expect(await cards.count(), 'cartes du groupe ouvert').toBe(expectedCards);
	});

	test('#2847 — niveau 4e + « pythagore » : résultats de 4e seulement', async ({ page }) => {
		const catalogue = await openCatalogue(page);
		const inFourth = expectedMatches(catalogue, 'pythagore', ['4']);
		const everywhere = expectedMatches(catalogue, 'pythagore');
		expect(inFourth.length).toBeGreaterThan(0);
		expect(everywhere.length, 'des résultats d’autres niveaux existent').toBeGreaterThan(
			inFourth.length
		);
		await chooseGrade(page, '4ème');
		await search(page, 'pythagore');
		expect(await resultTotal(page)).toBe(inFourth.length);
		await expect(cardButtons(page)).toHaveCount(inFourth.length);
		const params = new URL(page.url()).searchParams;
		expect(params.get('niveau')).toBe('4');
		expect(params.get('q')).toBe('pythagore');
		// Sans niveau, on retrouve tout : le filtre est bien ce qui restreint
		await chooseGrade(page, 'Tous les niveaux');
		await expect.poll(() => resultTotal(page)).toBe(everywhere.length);
	});

	test('#2847 — la croix ramène à la notion où l’on était', async ({ page }) => {
		await openCatalogue(page);
		const before = (await page.locator('#catalogue-titre').innerText()).trim();
		await search(page, 'pythagore');
		await expect(page.locator('#catalogue-titre')).toHaveCount(0);
		await page.getByRole('button', { name: 'Effacer la recherche' }).click();
		await expect(searchBox(page)).toHaveValue('');
		await expect(page.locator('#catalogue-titre')).toHaveText(before);
		expect(new URL(page.url()).searchParams.has('q')).toBe(false);
	});

	test('#2847 — Échap ramène à la notion où l’on était @bureau', async ({ page }) => {
		await openCatalogue(page);
		const before = (await page.locator('#catalogue-titre').innerText()).trim();
		await search(page, 'pythagore');
		await searchBox(page).press('Escape');
		await expect(searchBox(page)).toHaveValue('');
		await expect(page.locator('#catalogue-titre')).toHaveText(before);
		expect(new URL(page.url()).searchParams.has('q')).toBe(false);
	});

	test('#2847 — aller à « Ma série » puis revenir : la recherche est toujours là', async ({
		page
	}) => {
		await openCatalogue(page);
		await chooseGrade(page, '4ème');
		await search(page, 'pythagore');
		const total = await resultTotal(page);
		await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('pythagore');

		await page.goto('/automaths/panier');
		await page.waitForLoadState('networkidle');
		await page.getByRole('link', { name: /Retour aux automatismes/ }).click();
		await expect(page).toHaveURL(/\/automaths/);
		await expect(searchBox(page)).toHaveValue('pythagore');
		await expect(page.getByText(/^\d+ questions?$/)).toBeVisible();
		expect(await resultTotal(page)).toBe(total);
		await expect(page.getByRole('combobox', { name: 'Niveau : 4ème' })).toBeVisible();
	});
});

// ============================================================================
// #2854 — liste des notions
// ============================================================================

test.describe('#2854 — liste des notions, grand écran', { tag: '@bureau' }, () => {
	test.use({ viewport: { width: 1280, height: 900 } });

	test('#2854 — colonne à gauche avec compteurs, seule la branche de la notion ouverte est dépliée', async ({
		page
	}) => {
		await openCatalogue(page);
		const nav = page.getByRole('navigation', { name: 'Notions', exact: true });
		await expect(nav).toBeVisible();
		// À gauche du contenu
		const navBox = await nav.boundingBox();
		const titleBox = await page.locator('#catalogue-titre').boundingBox();
		expect(navBox && titleBox && navBox.x + navBox.width <= titleBox.x).toBe(true);

		const tops = nav.locator(':scope > ul > li > button[aria-expanded]');
		const branches = await tops.evaluateAll((buttons) =>
			buttons.map((button) => ({
				open: button.getAttribute('aria-expanded') === 'true',
				count: Number(button.querySelector('[aria-hidden="true"]:not(svg)')?.textContent?.trim())
			}))
		);
		expect(branches.length).toBeGreaterThan(3);
		// Compteurs : un nombre par branche
		for (const branch of branches) expect(Number.isInteger(branch.count)).toBe(true);
		// Une seule branche dépliée : celle de la notion affichée
		expect(branches.filter((branch) => branch.open)).toHaveLength(1);
		const selected = nav.locator('button[aria-current="true"]');
		await expect(selected).toHaveCount(1);
		const openBranch = nav.locator(':scope > ul > li:has(button[aria-current="true"])');
		await expect(openBranch.locator(':scope > button')).toHaveAttribute('aria-expanded', 'true');
		// Le compteur de la branche = la somme de ceux de ses notions
		const sum = await openBranch
			.locator('ul button')
			.evaluateAll((buttons) =>
				buttons.reduce(
					(total, button) =>
						total + Number(button.querySelector('[aria-hidden="true"]')?.textContent?.trim()),
					0
				)
			);
		const openCount = branches.find((branch) => branch.open)?.count;
		expect(sum).toBe(openCount);
	});
});

test.describe('#2854 — liste des notions, téléphone', () => {
	test.use({ viewport: PHONE });

	test('#2854 — bouton « Notion : … · n » → panneau du bas ; choisir une notion le referme', async ({
		page
	}) => {
		await openCatalogue(page);
		const button = notionButton(page);
		await expect(button).toBeVisible();
		// Pas de colonne sur téléphone
		await expect(page.locator('aside nav[aria-label="Notions"]')).toBeHidden();
		const label = ((await button.innerText()) ?? '').trim();
		expect(label).toMatch(/^Notion : .+ · \d+$/);
		await button.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		// Panneau du bas : collé en bas de l'écran
		const box = await dialog.boundingBox();
		expect(box && box.y + box.height >= PHONE.height - 2).toBe(true);
		await expect(dialog.getByRole('navigation', { name: 'Notions', exact: true })).toBeVisible();
		await dialog.getByRole('navigation').evaluate((nav) => {
			const top = [...nav.querySelectorAll(':scope > ul > li > button[aria-expanded]')].at(-1);
			(top as HTMLElement).click();
		});
		const notion = dialog
			.getByRole('navigation', { name: 'Notions', exact: true })
			.locator(':scope > ul > li')
			.last()
			.locator('ul button')
			.last();
		const name = (await notion.locator('span.flex-1').innerText()).trim();
		await notion.evaluate((element) => (element as HTMLElement).click());
		await expect(dialog).toBeHidden();
		await expect(page.locator('#catalogue-titre')).toHaveText(name);
		// Le bouton annonce la notion choisie, avec son nombre de questions
		await expect(notionButton(page)).toContainText(`Notion : ${name} · `);
		expect(new URL(page.url()).searchParams.get('notion')).not.toBeNull();
	});
});

/** La plus grosse notion (en questions, ses sous-notions comptées) qui a plusieurs sous-notions */
function biggestNotion(catalogue: Catalogue): { id: string; name: string; count: number } {
	const nodes = new Map(catalogue.nodes.map((node) => [node.id, node]));
	const counts = new Map<string, number>();
	const subnotions = new Map<string, Set<string>>();
	for (const template of catalogue.templates) {
		let node = template.classification_node_id ? nodes.get(template.classification_node_id) : null;
		let subnotion: string | null = null;
		while (node && node.kind !== 'notion') {
			if (node.kind === 'subnotion') subnotion = node.id;
			node = node.parent_id ? nodes.get(node.parent_id) : undefined;
		}
		if (!node) continue;
		counts.set(node.id, (counts.get(node.id) ?? 0) + 1);
		const set = subnotions.get(node.id) ?? new Set<string>();
		set.add(subnotion ?? 'general');
		subnotions.set(node.id, set);
	}
	const [id, count] = [...counts]
		.filter(([notionId]) => (subnotions.get(notionId)?.size ?? 0) > 2)
		.sort((a, b) => b[1] - a[1])[0];
	return { id, name: nodes.get(id)?.name ?? '', count };
}

test.describe('#2854 — pastilles des sous-notions', () => {
	test.use({ viewport: PHONE });

	test('#2854 — les pastilles restent collées en haut ; la dernière pastille d’une grosse notion descend juste dessous sans figer la page', async ({
		page,
		browserName
	}) => {
		test.setTimeout(180_000);
		const catalogue = await openCatalogue(page);
		const big = biggestNotion(catalogue);
		expect(big.count, 'grosse notion de la base lue').toBeGreaterThan(40);
		await openCatalogue(page, `/automaths?vue=notions&notion=${big.id}`);
		await expect(page.locator('#catalogue-titre')).toHaveText(big.name);
		const chips = page.getByRole('navigation', { name: 'Sous-notions' });
		await expect(chips).toBeVisible();
		const chipButtons = chips.getByRole('button');
		const chipCount = await chipButtons.count();
		expect(chipCount).toBeGreaterThan(2);

		// Dernière pastille : mesure des images pendant que la page descend
		await page.evaluate(() => {
			const w = window as unknown as { __frames: { worst: number; count: number; stop: boolean } };
			w.__frames = { worst: 0, count: 0, stop: false };
			let last = performance.now();
			const tick = (now: number) => {
				w.__frames.worst = Math.max(w.__frames.worst, now - last);
				w.__frames.count += 1;
				last = now;
				if (!w.__frames.stop) requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
		});
		// Le haut de la notion se pose (cartes du début calculées) avant le clic sur la dernière pastille
		await page.waitForTimeout(2000);
		const lastChip = chipButtons.last();
		const started = Date.now();
		await lastChip.evaluate((button) => (button as HTMLElement).click());
		// Une section par pastille, dans le même ordre : la dernière
		const sections = page.locator('section[id^="rubrique-"]');
		await expect(sections).toHaveCount(chipCount);
		const section = sections.last();
		await expect(section).toHaveCount(1);
		// Le temps que la page se pose (défilement doux, second calage de la page) : jusqu'à 10 s,
		// on s'arrête dès que la section est juste sous les pastilles
		const measureDrift = async (): Promise<number> => {
			const [sectionNow, chipsNow] = [await section.boundingBox(), await chips.boundingBox()];
			return sectionNow && chipsNow ? sectionNow.y - (chipsNow.y + chipsNow.height) : 99_999;
		};
		await page.waitForTimeout(3000);
		let drift = await measureDrift();
		for (let attempt = 0; attempt < 14 && Math.abs(drift) > 24; attempt++) {
			await page.waitForTimeout(500);
			drift = await measureDrift();
		}
		test.info().annotations.push({
			type: 'mesure',
			description: `section visée − bas des pastilles : ${Math.round(drift)} px`
		});
		const settledMs = Date.now() - started;
		const frames = await page.evaluate(() => {
			const w = window as unknown as { __frames: { worst: number; count: number; stop: boolean } };
			w.__frames.stop = true;
			return { worst: w.__frames.worst, count: w.__frames.count };
		});
		test.info().annotations.push({
			type: 'mesure',
			description: `dernière pastille (${big.name}, ${big.count} questions) : arrivée en ${settledMs} ms, pire image ${Math.round(frames.worst)} ms sur ${frames.count}`
		});
		expect(frames.count, 'images mesurées').toBeGreaterThan(10);
		// Page figée = une image qui met plusieurs secondes ; on tolère la charge du serveur partagé
		expect(frames.worst, 'plus longue image pendant la descente (ms)').toBeLessThan(2000);
		// Collées en haut : après être descendu, le haut de la rangée est en haut de l'écran
		// (la page défile dans `<main>`, sous l'en-tête : « en haut » = en haut de `<main>`)
		await page.evaluate(() => document.querySelector('main')!.scrollBy(0, 300));
		await expect
			.poll(
				async () => {
					const mainTop = (await page.locator('main').boundingBox())?.y ?? 0;
					return Math.round(Math.abs(((await chips.boundingBox())?.y ?? 999) - mainTop));
				},
				{ timeout: 5000 }
			)
			.toBeLessThanOrEqual(2);
		// La page répond encore : elle défile (vers le haut : en Chrome elle est déjà tout en bas)
		const y = await page.evaluate(() => document.querySelector('main')!.scrollTop);
		expect(y, 'la page est assez descendue pour remonter').toBeGreaterThan(400);
		await page.evaluate(() => document.querySelector('main')!.scrollBy(0, -200));
		await expect
			.poll(() => page.evaluate(() => document.querySelector('main')!.scrollTop))
			.toBeLessThan(y);

		// La section visée arrive juste sous les pastilles (à quelques pixels) : mesure prise au repos
		if (browserName === 'chromium') {
			// ÉCART (Chrome, Android) : la page dépasse la section d'environ 1 200 px (elle finit tout en bas
			// de la dernière section, son haut passe au-dessus de l'écran) ; WebKit (iPhone) la pose juste sous les pastilles
			expect(
				drift,
				'symptôme sous Chromium : le haut de la section est passé au-dessus'
			).toBeLessThan(-200);
			test.fail();
		}
		expect(Math.abs(drift), 'la section est juste sous les pastilles (px)').toBeLessThanOrEqual(24);
	});

	test('#2854 — cartes plus basses sur téléphone que sur ordinateur', async ({ page }) => {
		await openCatalogue(page);
		const card = page.locator('.tile').first();
		await expect(card.getByRole('button', { name: /Ajouter à ma série/ })).toBeVisible();
		const heightOf = async (): Promise<number> => {
			// La flash-card est le bloc qui porte la hauteur des tuiles (`--tile-card-height`)
			return card.evaluate((tile) => {
				const wanted = getComputedStyle(tile).getPropertyValue('--tile-card-height').trim();
				const probe = document.createElement('div');
				probe.style.height = wanted;
				tile.appendChild(probe);
				const px = probe.getBoundingClientRect().height;
				probe.remove();
				return px;
			});
		};
		const phone = await heightOf();
		await page.setViewportSize({ width: 1100, height: 900 });
		await expect(card).toBeVisible();
		const desktop = await heightOf();
		expect(phone, 'hauteur de la carte au téléphone (px)').toBeGreaterThan(100);
		expect(phone).toBeLessThan(desktop);
		// La carte affichée suit cette mesure
		const flash = card.locator('[style*="height"]').first();
		const shown = await flash.evaluate((element) => element.getBoundingClientRect().height);
		expect(Math.abs(shown - desktop)).toBeLessThan(2);
	});

	test('#2854 — descendre dans une notion : le titre de section regardé ne bouge pas quand les cartes apparaissent', async ({
		page
	}) => {
		test.setTimeout(180_000);
		const catalogue = await openCatalogue(page);
		const big = biggestNotion(catalogue);
		await openCatalogue(page, `/automaths?vue=notions&notion=${big.id}`);
		await expect(page.locator('#catalogue-titre')).toHaveText(big.name);
		const sections = page.locator('section[id^="rubrique-"]');
		expect(await sections.count()).toBeGreaterThan(2);
		// On descend par paliers d'un demi-écran ; après chaque palier, le titre de section le plus
		// haut visible est relevé, puis relu après que les cartes (calculées à l'approche) sont apparues
		const drifts: number[] = [];
		for (let step = 1; step <= 14; step++) {
			await page.evaluate((y) => document.querySelector('main')!.scrollTo(0, y), step * 420);
			const before = await visibleAnchor(page);
			await page.waitForTimeout(700);
			const after = await visibleAnchor(page, before?.id);
			if (before && after) drifts.push(Math.abs(after.top - before.top));
		}
		expect(drifts.length, 'paliers mesurés').toBeGreaterThan(5);
		test.info().annotations.push({
			type: 'mesure',
			description: `glissement du titre regardé par palier (px) : ${drifts.join(', ')}`
		});
		expect(Math.max(...drifts), 'plus grand glissement (px)').toBeLessThanOrEqual(12);
	});
});

/** Le titre de section le plus haut encore visible (ou celui de `id`), avec sa position à l'écran */
async function visibleAnchor(page: Page, id?: string): Promise<{ id: string; top: number } | null> {
	return page.evaluate((wanted) => {
		const headings = [...document.querySelectorAll<HTMLElement>('section[id^="rubrique-"] > h3')];
		const target = wanted
			? headings.find((heading) => heading.parentElement?.id === wanted)
			: headings.find((heading) => heading.getBoundingClientRect().bottom > 60);
		if (!target) return null;
		return { id: target.parentElement?.id ?? '', top: target.getBoundingClientRect().top };
	}, id);
}

// ============================================================================
// #2842 — correctifs du catalogue
// ============================================================================

test.describe('#2842 — bouton rond de « Ma série » (tablette)', () => {
	test.use({ viewport: TABLET });

	const round = (page: Page): Locator => page.getByRole('button', { name: 'Voir ma série' });

	test('#2842 — le bouton rond ne pulse plus (aucune animation, même série non vide)', async ({
		page
	}) => {
		await openCatalogue(page);
		await expect(round(page)).toBeVisible();
		await cardButtons(page).locator('visible=true').first().click();
		await expect(round(page)).toContainText('1');
		await page.waitForTimeout(1500);
		const state = await round(page).evaluate((button) => ({
			animation: getComputedStyle(button).animationName,
			classes: button.className,
			running: button
				.getAnimations({ subtree: true })
				.map((animation) => animation.constructor.name)
		}));
		expect(state.animation).toBe('none');
		expect(state.classes).not.toMatch(/animate-|pulse/);
		expect(state.running, 'animations en cours sur le bouton').toEqual([]);
	});

	test('#2842 — en bas d’une notion dépliée, le dernier « Ajouter à ma série » remonte au-dessus du bouton rond', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await openCatalogue(page);
		await scrollToBottom(page);
		const last = page.getByRole('button', { name: 'Ajouter à ma série' }).last();
		const lastBox = await last.boundingBox();
		const roundBox = await round(page).boundingBox();
		expect(lastBox && roundBox, 'positions mesurées').toBeTruthy();
		expect(
			lastBox!.y + lastBox!.height,
			'bas du dernier bouton ≤ haut du bouton rond'
		).toBeLessThanOrEqual(roundBox!.y);
	});

	test('#2842 — « Dans ma série » d’une tuile retire la question (le rond perd 1)', async ({
		page
	}) => {
		await openCatalogue(page);
		const adds = page.getByRole('button', { name: 'Ajouter à ma série' }).locator('visible=true');
		await adds.nth(0).click();
		await adds.nth(0).click();
		await expect(round(page)).toContainText('2');
		expect(await cartItems(page)).toHaveLength(2);
		const removes = page
			.getByRole('button', { name: 'Dans ma série : retirer' })
			.locator('visible=true');
		await expect(removes).toHaveCount(2);
		await removes.first().click();
		await expect(round(page)).toContainText('1');
		await expect(round(page)).not.toContainText('2');
		expect(await cartItems(page)).toHaveLength(1);
		await expect(removes).toHaveCount(1);
		await removes.first().click();
		expect(await cartItems(page)).toHaveLength(0);
		// Plus de pastille de nombre
		await expect(round(page).getByText(/^\d+$/)).toHaveCount(0);
	});
});

test.describe('#2842 — bas de page au téléphone (barre de « Ma série »)', () => {
	test.use({ viewport: PHONE });

	test('#2842 — le dernier « Ajouter à ma série » remonte au-dessus de la barre du bas', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await openCatalogue(page);
		await cardButtons(page).locator('visible=true').first().click();
		const bar = page.getByRole('button', { name: /^Ma série · / });
		await expect(bar).toBeVisible();
		await scrollToBottom(page);
		const last = page
			.getByRole('button', { name: /^(Ajouter à ma série|Dans ma série : retirer)$/ })
			.last();
		const lastBox = await last.boundingBox();
		const barBox = await bar.boundingBox();
		expect(lastBox && barBox, 'positions mesurées').toBeTruthy();
		expect(
			lastBox!.y + lastBox!.height,
			'bas du dernier bouton ≤ haut de la barre'
		).toBeLessThanOrEqual(barBox!.y);
	});
});

/** Descend tout en bas de la page, les galeries se montant à l'approche (hauteur stable) */
async function scrollToBottom(page: Page): Promise<void> {
	let previous = -1;
	for (let attempt = 0; attempt < 40; attempt++) {
		const height = await page.evaluate(() => {
			const main = document.querySelector('main')!;
			main.scrollTo(0, main.scrollHeight);
			return main.scrollHeight;
		});
		await page.waitForTimeout(400);
		const bottom = await page.evaluate(() => {
			const main = document.querySelector('main')!;
			return main.clientHeight + main.scrollTop >= main.scrollHeight - 1;
		});
		if (bottom && height === previous) return;
		previous = height;
	}
	throw new Error('le bas de la page n’est jamais atteint (la hauteur ne cesse de changer)');
}

test.describe('#2842 — niveau et notion retenus', () => {
	test.use({ viewport: DESKTOP });

	test('#2842 — niveau et notion choisis, « Ma série », « Retour aux automatismes » → mêmes niveau et notion ; un rechargement aussi', async ({
		page
	}) => {
		test.setTimeout(120_000);
		await openCatalogue(page);
		await chooseGrade(page, '4ème');
		// Un niveau qui a un programme s'ouvre sur « Programme » : on passe à « Notions »
		await page
			.getByRole('group', { name: 'Parcourir par' })
			.getByRole('button', { name: 'Notions', exact: true })
			.click();
		const name = await chooseLastNotion(page);
		const url = new URL(page.url());
		const notionId = url.searchParams.get('notion');
		expect(notionId, 'notion dans l’adresse').not.toBeNull();
		expect(url.searchParams.get('niveau')).toBe('4');

		await page.goto('/automaths/panier');
		await page.waitForLoadState('networkidle');
		await page.getByRole('link', { name: /Retour aux automatismes/ }).click();
		await expect(page).toHaveURL(/\/automaths\?/);
		await expectChoices(page, name, notionId!);

		await page.reload();
		await page.waitForLoadState('networkidle');
		await expectChoices(page, name, notionId!);
	});
});

async function expectChoices(page: Page, notionName: string, notionId: string): Promise<void> {
	await expect(page.getByRole('combobox', { name: 'Niveau : 4ème' })).toBeVisible();
	await expect(page.locator('#catalogue-titre')).toHaveText(notionName);
	const params = new URL(page.url()).searchParams;
	expect(params.get('niveau')).toBe('4');
	expect(params.get('notion')).toBe(notionId);
}
