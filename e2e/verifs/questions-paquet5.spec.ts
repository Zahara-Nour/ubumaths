import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { buildSeriesLink } from '../../src/lib/validation/series';
import { ADMIN, assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import { expectNoHorizontalOverflow } from './helpers/pages';

/**
 * Questions, modèles et tableaux de signes — paquet 5 — base LOCALE
 * =================================================================
 *
 * Reprend les lignes #2358 / #2308 / #2353 (2-330 et 2-446 au téléphone, bouton « Fermer le
 * clavier »), #2338 (corrigé sans « 1x »), #2297 / #2287 (tableau de signes à compléter,
 * brouillon « Verifs5 … ») de `docs/wip/verifications-manuelles.md`. #2370, #2346 (droite graduée
 * au corrigé), #2276 (unité du résultat), #2341 et #2349 (démonstrations à ranger) vivent dans
 * `questions-paquet5-suite.spec.ts`.
 *
 * Les modèles de la base locale portent les identifiants de la prod : on les joue par le lien
 * de série public (`/automaths/test?…&mode=typing&graine=…`), ou par l'aperçu admin avec une
 * graine pour les corrigés. Écrit en base : le brouillon « Verifs5 q5 … » (supprimé après chaque
 * test, puis par préfixe en `afterAll`).
 *
 * Captures à l'œil : `.captures/verifs/questions-paquet5/`.
 */

// Base locale seulement
test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());

// Constantes

const SHOTS = '.captures/verifs/questions-paquet5';
const PREFIXE = 'Verifs5 q5';
/** 2-330 « Tableau de signes d'un produit » : variations 0 et 1 = tableau tout à compléter */
const PRODUIT = 'f0163416-0610-49cc-bf2d-83db744dbf43';
/** 2-446 « Tableau de signes d'un quotient » : variations 0 et 1 = tableau tout à compléter */
const QUOTIENT = '9c7ab1c7-d3f3-4c78-96f4-c14e5a657574';

/** (2x+6)(x−1) : racines −3 et 1 cachées, toutes les cases du tableau cachées */
const TABLEAU = [
	'```variation',
	'variable: x',
	'domain: -inf, ?-3, ?1, +inf',
	'',
	'sign: 2x+6',
	'  -inf,-3: ?-',
	'  -3: ?z',
	'  -3,1: ?+',
	'  1,+inf: ?+',
	'  1: ?rien',
	'',
	'sign: x-1',
	'  -inf,-3: ?-',
	'  -3,1: ?-',
	'  1: ?z',
	'  1,+inf: ?+',
	'  -3: ?rien',
	'',
	'sign: A(x)',
	'  -inf,-3: ?+',
	'  -3: ?z',
	'  -3,1: ?-',
	'  1: ?z',
	'  1,+inf: ?+',
	'```'
].join('\n');
const ENONCE_TABLEAU = `Complète le tableau de signes de $A(x)=(2x+6)(x-1)$.\n\n${TABLEAU}`;

// Décor : les brouillons créés, effacés après chaque test

let createdIds: string[] = [];
test.afterEach(async () => {
	if (createdIds.length > 0) {
		await sql(`delete from question_templates where id = any($1::uuid[])`, [createdIds]);
	}
	createdIds = [];
});
test.afterAll(async () => {
	// Seulement les brouillons de CE worker : un autre a les siens en cours
	await sql(`delete from question_templates where title like $1`, [`${ownPrefix()} %`]);
});

// Functions

/** Préfixe des titres de ce worker (navigateur + rang parmi les workers en cours) */
function ownPrefix(): string {
	return `${PREFIXE} ${test.info().project.name} p${test.info().parallelIndex}`;
}

/**
 * Un modèle « Verifs5 q5 … » posé par SQL. Publié : le lien de série public ne joue que ceux-là, et
 * la carte de l'élève laisse « Valider » libre cases vides (l'aperçu admin le grise tant que tout n'est
 * pas rempli, ce qui ferme le chemin « cellule vide »).
 */
async function makeDraft(title: string, variations: object[]): Promise<string> {
	const rows = await sql<{ id: string }>(
		`insert into question_templates (type, grades, level, variations, status, title, created_by)
		 values ('fill_in_blanks', array['2'], 1, $1::jsonb, 'published', $2,
		   (select id from profiles where email = $3))
		 returning id::text`,
		[JSON.stringify(variations), `${ownPrefix()} ${title}`, TEACHER.email]
	);
	createdIds.push(rows[0].id);
	return rows[0].id;
}

async function shot(page: Page, name: string): Promise<void> {
	await mkdir(SHOTS, { recursive: true });
	// La carte se retourne après « Valider » : on attend la fin du mouvement
	await page
		.waitForFunction(() => document.getAnimations().length === 0, undefined, { timeout: 4000 })
		.catch(() => undefined);
	await page.screenshot({ path: `${SHOTS}/${name}-${test.info().project.name}.png` });
}

/** Capture en clair puis en sombre (le thème suit le système) */
async function shotThemes(page: Page, name: string): Promise<void> {
	for (const theme of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme: theme });
		await page.waitForFunction(
			(dark) => document.documentElement.classList.contains('dark') === dark,
			theme === 'dark'
		);
		await shot(page, `${name}-${theme === 'dark' ? 'sombre' : 'clair'}`);
	}
	await page.emulateMedia({ colorScheme: 'light' });
}

/** Un toucher au doigt sur téléphone, un clic à la souris sur ordinateur */
async function press(locator: Locator, hasTouch: boolean): Promise<void> {
	await locator.scrollIntoViewIfNeeded();
	if (hasTouch) await locator.tap();
	else await locator.click();
}

/** Joue une question par le lien de série public ; rend la carte une fois prête. */
async function openSeries(
	page: Page,
	templateId: string,
	seed: number,
	variation: number
): Promise<Locator> {
	const link = buildSeriesLink(
		'',
		[{ templateId, quantity: 1, delay: 0, variations: [variation] }],
		{
			mode: 'typing',
			seed
		}
	);
	await page.goto(link);
	await page.waitForLoadState('networkidle');
	const card = page.getByTestId('typing-card');
	await card.locator('.flip-card-front').waitFor();
	await expect(card.getByRole('button', { name: 'Valider' })).toBeVisible();
	// Le tableau défile et ses ombres se posent après la mise en page
	await page.waitForFunction(() => document.getAnimations().length === 0, undefined, {
		timeout: 5000
	});
	return card;
}

/** Ferme le clavier virtuel s'il est ouvert (il couvre « Valider » sur téléphone) */
async function closeKeyboard(page: Page): Promise<void> {
	const close = page.locator('.math-keyboard-close');
	if ((await close.count()) > 0) {
		await close.click();
		await page.waitForFunction(
			() =>
				!(window as Window & { mathVirtualKeyboard?: { visible: boolean; boundingRect: DOMRect } })
					.mathVirtualKeyboard?.visible
		);
	}
}

/** Choisit un signe ou une marque dans le menu d'une case de signe */
async function pick(page: Page, cell: Locator, label: string, hasTouch: boolean): Promise<void> {
	await press(cell, hasTouch);
	const menu = page.getByRole('group', { name: /choisir/ });
	await expect(menu).toBeVisible();
	const choice = menu.getByRole('button', { name: label, exact: true });
	if (hasTouch) await choice.tap();
	else await choice.click();
	await expect(menu).toHaveCount(0);
}

/** Tape une valeur de x dans la `index`-ième case MathLive du tableau */
async function typeValue(page: Page, index: number, text: string, hasTouch: boolean) {
	const field = page.locator('.variation-table math-field').nth(index);
	await press(field, hasTouch);
	await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('MATH-FIELD');
	await page.waitForTimeout(400);
	await page.keyboard.type(text, { delay: 80 });
}

/** Les phrases lues d'un tableau corrigé (« Case 3, ta réponse : plus, faux, attendu : moins ») */
async function correctedCells(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		// Le tableau de l'élève : celui dont les cases disent « ta réponse » ou « sans réponse »
		const rows = [...document.querySelectorAll<HTMLElement>('.variation-table')].map((table) =>
			[...table.querySelectorAll('.sr-only')]
				.map((node) => (node.textContent ?? '').trim())
				.filter((text) => text.startsWith('Case') && /ta réponse|sans réponse/.test(text))
		);
		return rows.filter((cells) => cells.length > 0).pop() ?? [];
	});
}

/**
 * La bordure d'une case juste et d'une case fausse du tableau corrigé, et les jetons que la feuille de
 * style de `SignCellPicker` leur donne (`--color-success`, `--color-destructive`), en un seul passage
 * dans la page ; les jetons sont lus par une sonde (`color: var(--…)`) pour avoir la même forme calculée
 */
async function couleursDesCases(
	page: Page
): Promise<{ juste: string; fausse: string; success: string; destructive: string }> {
	return page.evaluate(() => {
		const bordure = (etat: string): string => {
			const element = document.querySelector<HTMLElement>(`[data-signe-case][data-etat="${etat}"]`);
			return element ? getComputedStyle(element).borderTopColor : `(aucune case ${etat})`;
		};
		const jeton = (nom: string): string => {
			const sonde = document.createElement('span');
			sonde.style.color = `var(${nom})`;
			document.body.append(sonde);
			const couleur = getComputedStyle(sonde).color;
			sonde.remove();
			return couleur;
		};
		return {
			juste: bordure('juste'),
			fausse: bordure('fausse'),
			success: jeton('--color-success'),
			destructive: jeton('--color-destructive')
		};
	});
}

// ============================================================================
// #2297 — corrigé du tableau de signes à compléter
// ============================================================================

test('#2297 — corrigé du tableau : cellule juste, fausse (bonne valeur dessous), vide, valeur « forme à améliorer » ; lisible en clair et en sombre', async ({
	page,
	hasTouch
}) => {
	test.setTimeout(150_000);
	const id = await makeDraft('2297 corrigé', [{ statement: ENONCE_TABLEAU }]);
	await openSeries(page, id, 5, 0);
	const signs = page.locator('[data-signe-case="signe"]');
	const marks = page.locator('[data-signe-case="marque"]');
	expect(await signs.count()).toBe(9);
	expect(await marks.count()).toBe(6);
	// Tous les signes « + » (certains faux), toutes les marques « 0 » sauf la 2e (vide)
	for (let i = 0; i < 9; i++) await pick(page, signs.nth(i), 'plus', hasTouch);
	for (let i = 0; i < 6; i++) if (i !== 1) await pick(page, marks.nth(i), 'zéro', hasTouch);
	await typeValue(page, 0, '-6/2', hasTouch);
	await typeValue(page, 1, '1', hasTouch);
	await closeKeyboard(page);
	await page.getByRole('button', { name: 'Valider' }).click();
	await expect(page.locator('[id$="-etats"]').first()).toBeAttached();
	await expect.poll(async () => (await correctedCells(page)).length).toBeGreaterThan(10);
	const cells = await correctedCells(page);
	// Valeur −6/2 : juste mais à améliorer, la bonne forme est donnée
	expect(cells[0]).toMatch(/forme à améliorer, attendu : -3/);
	expect(cells[1]).toMatch(/^Case 2, ta réponse : 1, juste$/);
	// Un signe faux dit la bonne valeur ; un signe juste ne la répète pas
	expect(cells.some((c) => /ta réponse : plus, faux, attendu : moins/.test(c))).toBe(true);
	expect(cells.some((c) => c.endsWith('ta réponse : plus, juste'))).toBe(true);
	// La marque laissée vide : la bonne valeur est donnée
	expect(cells.some((c) => /sans réponse, attendu : rien/.test(c))).toBe(true);
	await shot(page, '2297-corrige-clair');
	await shotThemes(page, '2297-corrige');
	await expectNoHorizontalOverflow(page, 'corrigé du tableau');
});

test('#2297 — tableau entièrement vide : « Tu n’as rien rempli dans le tableau. », sans « faux »', async ({
	page
}) => {
	const id = await makeDraft('2297 vide', [{ statement: ENONCE_TABLEAU }]);
	await openSeries(page, id, 5, 0);
	const validate = page.getByRole('button', { name: 'Valider' });
	await expect(validate).toBeEnabled();
	await validate.click();
	// Le corrigé : le tableau juste, aucune case dite « fausse », et la phrase « rien rempli »
	await expect.poll(async () => (await correctedCells(page)).length).toBeGreaterThan(10);
	const cells = await correctedCells(page);
	expect(
		cells.every((c) => /sans réponse, attendu : /.test(c)),
		cells.join(' | ')
	).toBe(true);
	expect(cells.some((c) => /faux/.test(c))).toBe(false);
	await expect(page.getByText("Tu n'as rien rempli dans le tableau.").first()).toBeVisible();
	await shot(page, '2297-tout-vide');
});

// ============================================================================
// #2287 — tableau de signes à compléter, au doigt
// ============================================================================

test('#2287 — au doigt : le menu s’ouvre sous la case (+ / − ; 0 / ‖ / rien), le choix s’écrit et le menu se ferme ; la valeur de x se tape dans la petite case ; rien ne déborde ; Valider : justes en vert, fausses en rouge ; clair et sombre', async ({
	page,
	hasTouch
}) => {
	test.setTimeout(150_000);
	const id = await makeDraft('2287 doigt', [{ statement: ENONCE_TABLEAU }]);
	await openSeries(page, id, 5, 0);
	const signs = page.locator('[data-signe-case="signe"]');
	const marks = page.locator('[data-signe-case="marque"]');

	// Une case de signe : menu « + / − » juste dessous
	const first = signs.first();
	await first.scrollIntoViewIfNeeded();
	const caseBox = await first.boundingBox();
	await press(first, hasTouch);
	const menu = page.getByRole('group', { name: /choisir/ });
	await expect(menu).toBeVisible();
	await expect(menu.getByRole('button')).toHaveText(['+', '−']);
	const menuBox = await menu.boundingBox();
	expect(menuBox!.y, 'le menu s’ouvre au-dessous de la case').toBeGreaterThanOrEqual(
		caseBox!.y + caseBox!.height - 2
	);
	await shot(page, '2287-menu-signe');
	await menu.getByRole('button', { name: 'moins', exact: true }).click();
	await expect(menu).toHaveCount(0);
	await expect(first).toHaveText('−');

	// Une case de marque : 0 / ‖ / rien
	const mark = marks.first();
	await press(mark, hasTouch);
	await expect(menu.getByRole('button')).toHaveText(['0', '‖', 'rien']);
	await menu.getByRole('button', { name: 'double barre', exact: true }).click();
	await expect(menu).toHaveCount(0);
	await expect(mark).toHaveText('‖');

	// Taille des cases : rapportée, jugée par David (« ≈ 35 px, se touchent-elles sans erreur ? »)
	const size = await first.boundingBox();
	test.info().annotations.push({
		type: 'mesure',
		description: `case de signe ${size!.width.toFixed(0)} × ${size!.height.toFixed(0)} px`
	});
	expect(size!.width).toBeGreaterThanOrEqual(28);
	expect(size!.height).toBeGreaterThanOrEqual(28);

	// La valeur de x se tape dans la petite case MathLive de l'en-tête
	await typeValue(page, 0, '-3', hasTouch);
	const typed = await page
		.locator('.variation-table math-field')
		.first()
		.evaluate((element) => (element as HTMLElement & { value: string }).value);
	expect(typed).toContain('-3');
	await closeKeyboard(page);
	await expectNoHorizontalOverflow(page, 'tableau à compléter');
	await shotThemes(page, '2287-rempli');

	// Valider : − juste (vert), ‖ faux (rouge), −3 juste
	await page.getByRole('button', { name: 'Valider' }).click();
	await expect.poll(async () => (await correctedCells(page)).length).toBeGreaterThan(10);
	const cells = await correctedCells(page);
	expect(cells[0]).toMatch(/ta réponse : -3, juste/);
	expect(cells[2]).toMatch(/ta réponse : moins, juste/);
	expect(cells[3]).toMatch(/ta réponse : double barre, faux, attendu : zéro/);
	await expect(page.locator('[data-etat="juste"]').first()).toBeAttached();
	// Justes en vert, fausses en rouge : bordures calculées, dans chaque thème
	for (const theme of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme: theme });
		await page.waitForFunction(
			(dark) => document.documentElement.classList.contains('dark') === dark,
			theme === 'dark'
		);
		const couleurs = await couleursDesCases(page);
		expect(couleurs.juste, `bordure d'une case juste (${theme}) = --color-success`).toBe(
			couleurs.success
		);
		expect(couleurs.fausse, `bordure d'une case fausse (${theme}) = --color-destructive`).toBe(
			couleurs.destructive
		);
		expect(couleurs.juste, `juste ≠ fausse (${theme})`).not.toBe(couleurs.fausse);
	}
	await page.emulateMedia({ colorScheme: 'light' });
	await shotThemes(page, '2287-corrige');
	await expectNoHorizontalOverflow(page, 'corrigé du tableau');
});

test('#2287 — mode Flash-card : le tableau est montré avec ses cellules vides', async ({
	page
}) => {
	const id = await makeDraft('2287 flash', [{ statement: ENONCE_TABLEAU }]);
	await page.goto(
		buildSeriesLink('', [{ templateId: id, quantity: 1, delay: 0 }], { mode: 'flash', seed: 5 })
	);
	await page.waitForLoadState('networkidle');
	const card = page.getByTestId('flash-card');
	await expect(card).toBeVisible();
	await expect(card.locator('.variation-table').first()).toBeVisible();
	// Les cases cachées : vides, en pointillés ; ni menu ni saisie
	expect(await card.locator('.vt-case-vide').count()).toBeGreaterThanOrEqual(15);
	await expect(card.locator('[data-signe-case]')).toHaveCount(0);
	await shotThemes(page, '2287-flash');
});

// ============================================================================
// #2358, #2308, #2353 — 2-330 et 2-446 au téléphone
// ============================================================================

/** Les mesures d'un tableau de signes à l'écran : place, largeur, ombres, bouton clavier */
async function tableMetrics(page: Page) {
	return page.evaluate(() => {
		const table = document.querySelector<HTMLElement>('.variation-table')!;
		const scroller = table.querySelector<HTMLElement>('[data-vt-defilement]')!;
		const grid = table.querySelector<HTMLElement>('.vt-grid')!;
		const field = table.querySelector('math-field') as HTMLElement;
		const toggle = field.shadowRoot?.querySelector<HTMLElement>(
			'.ML__virtual-keyboard-toggle, [part="virtual-keyboard-toggle"]'
		);
		const shadow = (pseudo: '::before' | '::after') => {
			const style = getComputedStyle(table, pseudo);
			return { image: style.backgroundImage, events: style.pointerEvents, width: style.width };
		};
		return {
			place: scroller.clientWidth,
			grid: Math.round(grid.getBoundingClientRect().width),
			remaining: scroller.scrollWidth - scroller.clientWidth,
			right: table.dataset.debordeDroite !== undefined,
			left: table.dataset.debordeGauche !== undefined,
			toggle: toggle ? getComputedStyle(toggle).display : 'absent',
			toggleWidth: toggle ? Math.round(toggle.getBoundingClientRect().width) : 0,
			after: shadow('::after'),
			before: shadow('::before')
		};
	});
}

const TABLEAUX_A_COMPLETER = [
	{ name: '2-330 variation 1', id: PRODUIT, variation: 0 },
	{ name: '2-330 variation 2', id: PRODUIT, variation: 1 },
	{ name: '2-446 variation 1', id: QUOTIENT, variation: 0 },
	{ name: '2-446 variation 2', id: QUOTIENT, variation: 1 }
];

for (const model of TABLEAUX_A_COMPLETER) {
	test(`#2358 #2308 — ${model.name} au téléphone : plus de bouton clavier dans les cases de x, tableau resserré, ombre à droite puis à gauche une fois défilé`, async ({
		page,
		isMobile
	}) => {
		test.skip(!isMobile, 'téléphone seulement');
		const card = await openSeries(page, model.id, 5, model.variation);
		const before = await tableMetrics(page);
		test.info().annotations.push({
			type: 'mesure',
			description: `${model.name} : tableau ${before.grid} px pour ${before.place} px de place, reste ${before.remaining} px à défiler`
		});
		await shot(page, `2358-${model.id.slice(0, 4)}-${model.variation}-depart`);
		// Plus de bouton clavier dans la case de x : toucher la case ouvre le clavier
		expect(before.toggle === 'none' || before.toggle === 'absent', 'bouton clavier').toBe(true);
		// Resserré (la ligne : ≈ 396 px au lieu de 565 pour 2-330) ; le reste à défiler tient en ≈ 88 px
		expect(before.grid).toBeLessThanOrEqual(440);
		expect(before.remaining).toBeGreaterThan(0);
		expect(before.remaining).toBeLessThanOrEqual(120);
		// Ombre au bord droit (reste des cases), pas encore à gauche
		expect(before.right).toBe(true);
		expect(before.left).toBe(false);
		expect(before.after.image).toContain('gradient');
		expect(before.after.events).toBe('none');
		await expectNoHorizontalOverflow(page, model.name);
		// Défilé jusqu'au bout : l'ombre passe à gauche
		await page
			.locator('[data-vt-defilement]')
			.first()
			.evaluate((el) => (el.scrollLeft = el.scrollWidth));
		await expect.poll(async () => (await tableMetrics(page)).left).toBe(true);
		const after = await tableMetrics(page);
		expect(after.right).toBe(false);
		expect(after.before.image).toContain('gradient');
		await shot(page, `2358-${model.id.slice(0, 4)}-${model.variation}-defile`);
		// Toucher la case ouvre le clavier
		await page
			.locator('[data-vt-defilement]')
			.first()
			.evaluate((el) => (el.scrollLeft = 0));
		await card.locator('.variation-table math-field').first().tap();
		await page.waitForFunction(
			() =>
				(window as Window & { mathVirtualKeyboard?: { visible: boolean; boundingRect: DOMRect } })
					.mathVirtualKeyboard?.visible === true
		);
	});
}

test('#2358 — sur ordinateur rien ne change : bouton clavier toujours là, tableau entier, aucune ombre', async ({
	page,
	isMobile
}) => {
	test.skip(isMobile, 'ordinateur seulement');
	await openSeries(page, PRODUIT, 5, 0);
	const metrics = await tableMetrics(page);
	expect(metrics.toggle).not.toBe('none');
	expect(metrics.toggle).not.toBe('absent');
	expect(metrics.toggleWidth).toBeGreaterThan(20);
	expect(metrics.remaining).toBe(0);
	expect(metrics.right || metrics.left).toBe(false);
});

for (const model of [TABLEAUX_A_COMPLETER[0], TABLEAUX_A_COMPLETER[2]]) {
	test(`#2308 — ${model.name} au téléphone : remplir tout le tableau au doigt, Valider, lire le corrigé`, async ({
		page,
		isMobile,
		hasTouch
	}) => {
		test.skip(!isMobile, 'téléphone seulement');
		test.setTimeout(180_000);
		await openSeries(page, model.id, 5, model.variation);
		const signs = page.locator('[data-signe-case="signe"]');
		const marks = page.locator('[data-signe-case="marque"]');
		const nSigns = await signs.count();
		const nMarks = await marks.count();
		expect(nSigns + nMarks).toBeGreaterThanOrEqual(12);
		for (let i = 0; i < nSigns; i++) await pick(page, signs.nth(i), 'plus', hasTouch);
		for (let i = 0; i < nMarks; i++) await pick(page, marks.nth(i), 'zéro', hasTouch);
		const fields = await page.locator('.variation-table math-field').count();
		for (let i = 0; i < fields; i++) await typeValue(page, i, String(i + 1), hasTouch);
		await closeKeyboard(page);
		await page.getByRole('button', { name: 'Valider' }).click();
		await expect.poll(async () => (await correctedCells(page)).length).toBeGreaterThan(10);
		const cells = await correctedCells(page);
		expect(cells.some((c) => /faux, attendu/.test(c))).toBe(true);
		await expectNoHorizontalOverflow(page, `corrigé ${model.name}`);
		await shot(page, `2308-${model.id.slice(0, 4)}-corrige`);
		// Le délai du modèle : 180 s pour remplir un tableau entier
		const [row] = await sql<{ delay: number }>(
			`select delay from question_templates where id = $1`,
			[model.id]
		);
		expect(row.delay).toBe(180);
	});
}

// ============================================================================
// #2353 — « Fermer le clavier » MathLive
// ============================================================================

test('#2353 — portrait : toucher la case de x ouvre le clavier avec « Fermer le clavier » juste au-dessus à droite ; le bouton le ferme (≈ 0,3 s), disparaît sans clignoter, retoucher la case les rouvre', async ({
	page,
	isMobile
}) => {
	test.skip(!isMobile, 'téléphone seulement');
	const card = await openSeries(page, PRODUIT, 5, 0);
	const field = card.locator('.variation-table math-field').first();
	const close = page.getByRole('button', { name: 'Fermer le clavier' });
	await field.tap();
	await expect(close).toBeVisible();
	const geometry = await page.evaluate(() => {
		const keyboard = (
			window as Window & { mathVirtualKeyboard?: { visible: boolean; boundingRect: DOMRect } }
		).mathVirtualKeyboard!.boundingRect;
		const button = document.querySelector('.math-keyboard-close')!.getBoundingClientRect();
		return {
			keyboardTop: keyboard.top,
			buttonBottom: button.bottom,
			buttonRight: button.right,
			width: innerWidth
		};
	});
	expect(geometry.buttonBottom, 'le bouton est au-dessus du clavier').toBeLessThanOrEqual(
		geometry.keyboardTop
	);
	expect(geometry.keyboardTop - geometry.buttonBottom, 'et juste au-dessus').toBeLessThanOrEqual(
		12
	);
	expect(geometry.width - geometry.buttonRight, 'à droite').toBeLessThanOrEqual(16);
	await shot(page, '2353-portrait-ouvert');
	await close.tap();
	await page.waitForFunction(
		() =>
			(window as Window & { mathVirtualKeyboard?: { visible: boolean; boundingRect: DOMRect } })
				.mathVirtualKeyboard?.visible === false,
		undefined,
		{
			timeout: 3000
		}
	);
	// Le bouton disparaît et ne revient pas (sans clignoter)
	await expect(close).toHaveCount(0);
	for (let i = 0; i < 6; i++) {
		await page.waitForTimeout(100);
		expect(await close.count(), 'le bouton clignote').toBe(0);
	}
	await shot(page, '2353-portrait-ferme');
	// Retoucher la case : clavier et bouton reviennent
	await field.tap();
	await expect(close).toBeVisible();
	await page.waitForFunction(
		() =>
			(window as Window & { mathVirtualKeyboard?: { visible: boolean; boundingRect: DOMRect } })
				.mathVirtualKeyboard?.visible === true
	);
});

test('#2353 — paysage : le clavier est plus bas (touches ≈ 32 px), la case qu’on tape reste visible, le bouton ne la cache pas', async ({
	page,
	isMobile
}) => {
	test.skip(!isMobile, 'téléphone seulement');
	const portrait = page.viewportSize()!;
	await page.setViewportSize({
		width: Math.max(portrait.width, portrait.height),
		height: Math.min(portrait.width, portrait.height)
	});
	const card = await openSeries(page, PRODUIT, 5, 0);
	const field = card.locator('.variation-table math-field').first();
	await field.tap();
	const close = page.getByRole('button', { name: 'Fermer le clavier' });
	await expect(close).toBeVisible();
	await page.waitForFunction(
		() =>
			(window as Window & { mathVirtualKeyboard?: { visible: boolean; boundingRect: DOMRect } })
				.mathVirtualKeyboard?.visible === true
	);
	// Laisser le clavier se poser ; la case doit pouvoir être amenée au-dessus de lui
	await page.waitForTimeout(800);
	await field.evaluate((element) => element.scrollIntoView({ block: 'center' }));
	await page.waitForTimeout(300);
	const geometry = await page.evaluate(() => {
		const keyboard = (
			window as Window & { mathVirtualKeyboard?: { visible: boolean; boundingRect: DOMRect } }
		).mathVirtualKeyboard!.boundingRect;
		const active = document.activeElement as HTMLElement;
		const fieldRect = active.getBoundingClientRect();
		const button = document.querySelector('.math-keyboard-close')!.getBoundingClientRect();
		const keys = [
			...document.querySelectorAll<HTMLElement>(
				'.ML__keyboard [class*="MLK__keycap"], .ML__keyboard .MLK__keycap'
			)
		]
			.map((key) => key.getBoundingClientRect().height)
			.filter((h) => h > 0);
		return {
			vh: innerHeight,
			keyboardTop: keyboard.top,
			keyboardHeight: keyboard.height,
			fieldBottom: fieldRect.bottom,
			fieldTop: fieldRect.top,
			buttonTop: button.top,
			buttonBottom: button.bottom,
			buttonLeft: button.left,
			fieldRight: fieldRect.right,
			minKey: keys.length > 0 ? Math.min(...keys) : 0,
			tag: active.tagName
		};
	});
	test.info().annotations.push({
		type: 'mesure',
		description: `paysage ${page.viewportSize()!.width}×${geometry.vh} : clavier ${Math.round(geometry.keyboardHeight)} px, touche la plus basse ${geometry.minKey.toFixed(0)} px, case entre ${Math.round(geometry.fieldTop)} et ${Math.round(geometry.fieldBottom)} px`
	});
	await shot(page, '2353-paysage-ouvert');
	expect(geometry.tag).toBe('MATH-FIELD');
	expect(geometry.minKey, 'touches mesurées').toBeGreaterThan(0);
	expect(geometry.minKey, 'touches de ≈ 32 px').toBeLessThanOrEqual(36);
	// La case qu'on tape est au-dessus du clavier, et le bouton ne la recouvre pas
	// (la case dépasse parfois de quelques px sous le clavier : on exige qu'elle se voie, mesure en annotation)
	expect(geometry.fieldTop + (geometry.fieldBottom - geometry.fieldTop) / 2).toBeLessThan(
		geometry.keyboardTop
	);
	expect(geometry.fieldTop).toBeGreaterThanOrEqual(0);
	const overlap = !(
		geometry.buttonBottom <= geometry.fieldTop ||
		geometry.buttonTop >= geometry.fieldBottom ||
		geometry.buttonLeft >= geometry.fieldRight
	);
	expect(overlap, 'le bouton cache la case').toBe(false);
	await close.tap();
	await page.waitForFunction(
		() =>
			(window as Window & { mathVirtualKeyboard?: { visible: boolean; boundingRect: DOMRect } })
				.mathVirtualKeyboard?.visible === false,
		undefined,
		{
			timeout: 3000
		}
	);
	await expect(close).toHaveCount(0);
});

// ============================================================================
// #2338 — corrigé sans « 1x »
// ============================================================================

async function generate(page: Page, id: string, seed: number) {
	const response = await page.request.post(`/api/questions/generate/${id}`, { data: { seed } });
	expect(response.status()).toBe(200);
	const body = (await response.json()) as {
		instance: {
			selectedVariationIndex: number;
			resolvedVariables: { name: string; value: string }[];
			correction: { steps: string[] };
		};
	};
	const vars = Object.fromEntries(body.instance.resolvedVariables.map((v) => [v.name, v.value]));
	return {
		variation: body.instance.selectedVariationIndex,
		vars,
		steps: body.instance.correction.steps
	};
}

test('#2338 — corrigé de 2-330 : « −x − 3 = 0 ⟺ x = −3 », « x − 3 = 0 », jamais « 1x » ni « −1x » (60 tirages, coefficients ±1 compris)', async ({
	page
}) => {
	test.setTimeout(120_000);
	await login(page, ADMIN.email, ADMIN.password);
	const unit = /(?<![\d.,_^])[-−]?1x/;
	let withMinusOne = 0;
	let withOne = 0;
	for (let seed = 1; seed <= 60; seed++) {
		const { vars, steps } = await generate(page, PRODUIT, seed);
		const corrigé = steps.join('\n');
		expect(corrigé, `seed ${seed}`).not.toMatch(unit);
		// L'étape des racines (« … = 0 ⟺ x = … ») n'existe pas dans toutes les variations
		const roots = steps.find((step) => step.includes('\\iff'));
		if (roots !== undefined && (vars.a === '-1' || vars.c === '-1')) {
			withMinusOne++;
			expect(roots, `seed ${seed}`).toMatch(/\$-x [-+] \d+ = 0\\iff x=/);
		}
		if (vars.a === '1' || vars.c === '1') withOne++;
	}
	expect(withMinusOne, 'tirages avec un coefficient −1').toBeGreaterThan(0);
	expect(withOne, 'tirages avec un coefficient 1').toBeGreaterThan(0);
});

test('#2338 — « Fonction affine : variations, signe et droite » : jamais « 1x » ni « −1x » au corrigé', async ({
	page
}) => {
	test.setTimeout(120_000);
	await login(page, ADMIN.email, ADMIN.password);
	const [affine] = await sql<{ id: string }>(
		`select id::text from question_templates where title = 'Fonction affine : variations, signe et droite'`
	);
	const unit = /(?<![\d.,_^])[-−]?1x/;
	let withUnitCoefficient = 0;
	for (let seed = 1; seed <= 60; seed++) {
		const { vars, steps } = await generate(page, affine.id, seed);
		expect(steps.join('\n'), `seed ${seed} ${JSON.stringify(vars)}`).not.toMatch(unit);
		if (Object.values(vars).some((value) => value === '1' || value === '-1')) withUnitCoefficient++;
	}
	expect(withUnitCoefficient, 'tirages avec un coefficient ±1').toBeGreaterThan(0);
});
