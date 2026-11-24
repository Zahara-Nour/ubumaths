import { expect, test, type Locator, type Page } from '@playwright/test';
import { assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import { acquireLock, LOCK_WAIT_MAX_MS, releaseLock } from './helpers/verrou';
import { buildSeriesLink } from '../../src/lib/validation/series';

/**
 * Opérations posées (addition, multiplication, division), horloge, collection — base LOCALE
 * ==========================================================================================
 *
 * Reprend les lignes #1716, #1726, #1738, #1740, #1745, #1748, #1754, #1758 (blocs
 * ```operation), #1707 (bloc ```horloge) et #1766 (bloc ```collection) de
 * `docs/wip/verifications-manuelles.md`.
 *
 * Décor : des modèles de question « Verifs3 … » (publiés, créés pour le test, supprimés en
 * fin de passage) jouées par le lien de série `/automaths/test?…&mode=typing`, au vrai clavier.
 * Le PDF d'une fiche n'est pas rejoué ici : `operation-typst-compilation.test.ts` et
 * `worksheet-generator.test.ts` le compilent.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

// Constantes

const SHOTS = '.captures/verifs/operations';
const STUDENT = { email: 'eleve21@local.test', password: 'local-eleve' };
const created: string[] = [];

let lockHeld = false;

test.beforeAll(async () => {
	test.setTimeout(LOCK_WAIT_MAX_MS + 60_000);
	assertLocalServerEnv();
	await acquireLock('eleves-21-25');
	lockHeld = true;
});

test.afterAll(async () => {
	try {
		await cleanup();
	} finally {
		if (lockHeld) releaseLock('eleves-21-25');
	}
});

async function cleanup(): Promise<void> {
	if (created.length > 0) {
		// Les tentatives de l'élève sur ces modèles (clé étrangère SET NULL refusée par chk_attempt_regime)
		await sql(`delete from skill_attempts where template_id = any($1::uuid[])`, [created]);
		await sql(`delete from question_templates where id = any($1::uuid[])`, [created]);
	}
}

// Functions

interface Variation {
	statement: string;
	blanks?: { expectedAnswer: string }[];
}

async function makeTemplate(title: string, variation: Variation): Promise<string> {
	const rows = await sql<{ id: string }>(
		`insert into question_templates (type, grades, level, variations, status, title, created_by)
		 values ('fill_in_blanks', array['CE1'], 1, $1::jsonb, 'published', $2,
		   (select id from profiles where email = $3))
		 returning id`,
		[JSON.stringify([variation]), `Verifs3 ${title}`, TEACHER.email]
	);
	created.push(rows[0].id);
	return rows[0].id;
}

/** Un bloc ```operation seul (case créée d'office) ; `cases: aucune` demande un mot en plus (une question doit avoir une case) */
function op(...lines: string[]): Variation {
	const statement = ['Pose.', '', '```operation', ...lines, '```'].join('\n');
	return lines.includes('cases: aucune')
		? { statement: `${statement}\n\nMot : [_]`, blanks: [{ expectedAnswer: 'x' }] }
		: { statement };
}

async function open(page: Page, templateId: string, quantity = 1): Promise<void> {
	await page.goto(
		buildSeriesLink('', [{ templateId, quantity, delay: 0 }], { mode: 'typing', seed: 1 })
	);
	await page.waitForLoadState('networkidle');
	await page.getByTestId('typing-card').waitFor();
}

async function show(page: Page, title: string, variation: Variation): Promise<string> {
	const id = await makeTemplate(title, variation);
	await open(page, id);
	return id;
}

const cells = (page: Page, kind: string): Locator =>
	page.locator(`input[data-operation-cell="${kind}"]`);

async function values(locator: Locator): Promise<string[]> {
	return locator.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
}

/** Clique dans une case puis tape au vrai clavier */
async function typeIn(page: Page, kind: string, index: number, keys: string): Promise<void> {
	await cells(page, kind).nth(index).click();
	await page.keyboard.type(keys, { delay: 60 });
}

async function validate(page: Page): Promise<string> {
	await page.getByRole('button', { name: 'Valider' }).click();
	await expect(page.getByText(/^(Juste|Faux)$/).first()).toBeVisible();
	return (await page.getByTestId('typing-card').innerText()).replace(/\s+/g, ' ');
}

/** Libellés lus des cases marquées fausses (`aria-invalid`) */
async function invalidCells(page: Page): Promise<string[]> {
	return page
		.locator('[aria-invalid="true"]')
		.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
}

/** Capture, une fois les animations (retournement de la carte) finies */
async function shot(page: Page, name: string): Promise<void> {
	await page.waitForFunction(() => document.getAnimations().length === 0);
	await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

const isPhone = (page: Page): boolean => (page.viewportSize()?.width ?? 1280) < 600;

/** Le texte de la grille posée, sans blancs superflus */
async function gridText(page: Page): Promise<string> {
	return ((await page.locator('.operation-grille').first().innerText()) ?? '')
		.replace(/\s+/g, ' ')
		.trim();
}

// ============================================================================
// Addition posée
// ============================================================================

test('#1716 — addition posée affichée : 45 + 37 (cases à remplir, retenues), décimaux alignés, soustractions, cassage', async ({
	page
}) => {
	test.setTimeout(180_000);
	await login(page, TEACHER.email, TEACHER.password);

	// 45 + 37 : trois cases de résultat, deux cases de retenue (aide)
	await show(page, '1716 a', op('calcul: 45 + 37'));
	expect(await gridText(page)).toBe('4 5 + 3 7');
	await expect(cells(page, 'résultat')).toHaveCount(3);
	await expect(cells(page, 'aide')).toHaveCount(2);
	await shot(page, '1716-addition');

	// 56,75 + 234 + 0,8, carreaux vides : virgules alignées, 291,55
	await show(page, '1716 b', op('calcul: 56,75 + 234 + 0,8', 'cases: aucune'));
	await expect(cells(page, 'résultat')).toHaveCount(0);
	const decimals = page.locator('.operation-grille').first();
	expect(await gridText(page)).toContain('2 9 1 , 5 5');
	// une virgule par nombre décimal (56,75 ; 0,8 ; 291,55), toutes sur la même verticale
	const commas = decimals.locator('.operation-virgule');
	await expect(commas).toHaveCount(3);
	const lefts = await commas.evaluateAll((els) =>
		els.map((e) => Math.round(e.getBoundingClientRect().left))
	);
	expect(new Set(lefts).size).toBe(1);
	await shot(page, '1716-decimaux');

	// 302 − 7 par compensation : le résultat 295 et les petits 1
	await show(page, '1716 c', op('calcul: 302 - 7', 'cases: aucune'));
	expect(await gridText(page)).toContain('2 9 5');
	expect(await decimalsOf(page, '.operation-petit, .operation-retenue')).toBeGreaterThan(0);
	await shot(page, '1716-compensation');

	// 413 − 159 par cassage : trois chiffres barrés, 254
	await show(page, '1716 d', op('calcul: 413 - 159', 'méthode: cassage', 'cases: aucune'));
	expect(await gridText(page)).toContain('2 5 4');
	const struck = await page
		.locator('.operation-grille .operation-carreau')
		.evaluateAll(
			(els) =>
				els.filter(
					(e) =>
						getComputedStyle(e).textDecorationLine.includes('line-through') ||
						e.querySelector('s, del, .operation-barre') !== null
				).length
		);
	expect(struck).toBeGreaterThan(0);
	await shot(page, '1716-cassage');

	// Clair puis sombre : le chiffre est plus clair que le fond en sombre, plus foncé en clair
	const contrast = async (): Promise<{ text: number; ground: number }> =>
		page.evaluate(() => {
			const luminance = (css: string): number => {
				const rgb = css
					.match(/[\d.]+/g)
					?.slice(0, 3)
					.map(Number) ?? [0, 0, 0];
				return (rgb[0] + rgb[1] + rgb[2]) / 3;
			};
			const grid = document.querySelector('.operation-grille') as HTMLElement;
			return {
				text: luminance(getComputedStyle(grid).color),
				ground: luminance(getComputedStyle(document.body).backgroundColor)
			};
		});
	const light = await contrast();
	expect(light.text).toBeLessThan(light.ground);
	await page.emulateMedia({ colorScheme: 'dark' });
	await expect.poll(async () => (await contrast()).text).toBeGreaterThan(128);
	const dark = await contrast();
	expect(dark.text).toBeGreaterThan(dark.ground);
	await shot(page, '1716-sombre');
});

/** Nombre d'éléments `selector` dans la grille posée */
async function decimalsOf(page: Page, selector: string): Promise<number> {
	return page.locator(`.operation-grille ${selector}`).count();
}

test('#1726 — addition à trous : saisie de droite à gauche, Retour arrière, Entrée ; faux → chiffres rouges + Correction ; cases ≥ 40 px au téléphone', async ({
	page
}) => {
	test.setTimeout(180_000);
	await login(page, TEACHER.email, TEACHER.password);
	await show(page, '1726', op('calcul: 45 + 37'));
	const result = cells(page, 'résultat');

	// De droite à gauche : le premier chiffre tombe aux unités, le curseur passe à gauche
	await typeIn(page, 'résultat', 2, '28');
	expect(await values(result)).toEqual(['', '8', '2']);
	// Retour arrière : efface le chiffre sous le curseur puis recule
	await page.keyboard.press('Backspace');
	expect(await values(result)).toEqual(['', '', '2']);
	await page.keyboard.type('8', { delay: 60 });
	expect(await values(result)).toEqual(['', '8', '2']);

	if (isPhone(page)) {
		// Téléphone : clavier numérique, cases d'au moins 40 px, la grille défile dans son cadre
		expect(await result.first().getAttribute('inputmode')).toMatch(/numeric|decimal/);
		// Le carreau (la case du cahier qui porte le champ) fait 40 px ou plus
		for (const box of await result.evaluateAll((els) =>
			els.map((e) => (e.closest('.operation-carreau') as HTMLElement).getBoundingClientRect())
		)) {
			expect(box.width).toBeGreaterThanOrEqual(40);
			expect(box.height).toBeGreaterThanOrEqual(40);
		}
		expect(
			await page
				.locator('.operation-defile')
				.first()
				.evaluate((e) => getComputedStyle(e).overflowX)
		).toMatch(/auto|scroll/);
	}

	// Entrée valide la question
	await page.keyboard.press('Enter');
	await expect(page.getByText(/^Juste$/).first()).toBeVisible();

	// Réponse fausse (83) : seul le chiffre des unités est rouge, « Correction » à côté
	await show(page, '1726 faux', op('calcul: 45 + 37'));
	await typeIn(page, 'résultat', 2, '38');
	const text = await validate(page);
	expect(text).toContain('Faux');
	expect(text).toContain('Correction');
	expect(await invalidCells(page)).toEqual(['Chiffre des unités']);
	await shot(page, '1726-faux');
});

test('#1726 — soustraction par compensation à trous : le petit 1 du bas suit la saisie', async ({
	page
}) => {
	await login(page, TEACHER.email, TEACHER.password);
	await show(page, '1726 compensation', op('calcul: 302 - 7'));
	const small = cells(page, 'aide');
	await expect(small.first()).toBeVisible();
	const before = await values(small);
	// la compensation : le chiffre du bas reçoit un petit 1 sous le chiffre suivant
	await typeIn(page, 'résultat', 2, '5');
	await shot(page, '1726-compensation');
	expect(await small.count()).toBeGreaterThan(0);
	expect(before.every((v) => v === '')).toBe(true);
});

test('#1738 — 0,5 + 0,5 : « 1 » aux unités, dixièmes vides → juste ; « 2 » → faux, seule la case des unités rouge ; retour sur la question : la saisie reste', async ({
	page
}) => {
	test.setTimeout(180_000);
	await login(page, TEACHER.email, TEACHER.password);
	const id = await makeTemplate('1738', op('calcul: 0,5 + 0,5'));
	await open(page, id, 2);
	await typeIn(page, 'résultat', 1, '1');
	expect(await values(cells(page, 'résultat'))).toEqual(['', '1', '']);
	expect(await validate(page)).toContain('Juste');
	// Retour sur la question (retour de la carte)
	await page.locator('.flip-card-back button[aria-label="Retour à la question"]').click();
	await expect(cells(page, 'résultat').first()).toBeVisible();
	await page.waitForFunction(() => document.getAnimations().length === 0);
	// Le retour garde la saisie : le « 1 » des unités y est toujours. La remise de « 1 » en « 1,0 » (cases remontées)
	// n'est prouvée que par `digitsFromAnswer` (operation-answer.test.ts) : ce geste-ci ne remonte pas la grille.
	expect((await values(cells(page, 'résultat')))[1]).toBe('1');
	await shot(page, '1738-retour');

	await show(page, '1738 faux', op('calcul: 0,5 + 0,5'));
	await typeIn(page, 'résultat', 1, '2');
	expect(await validate(page)).toContain('Faux');
	expect(await invalidCells(page)).toEqual(['Chiffre des unités']);
});

// ============================================================================
// Multiplication posée
// ============================================================================

test('#1740 — multiplication posée affichée : 548 × 16, 876 × 208, 7 × 46,55, 46 × 7', async ({
	page
}) => {
	test.setTimeout(180_000);
	await login(page, TEACHER.email, TEACHER.password);

	// 548 × 16 : deux lignes de produits partiels saisissables, résultat à 5 cases sans virgule
	await show(page, '1740 a', op('calcul: 548 × 16'));
	await expect(cells(page, 'résultat')).toHaveCount(5);
	await expect(cells(page, 'produit')).toHaveCount(9);
	await expect(page.locator('.operation-grille .operation-virgule')).toHaveCount(0);
	await shot(page, '1740-548x16');

	// 876 × 208 : la ligne du 0 est sautée, 175200 avec ses deux zéros
	await show(page, '1740 b', op('calcul: 876 × 208', 'cases: aucune'));
	const grid = await gridText(page);
	expect(grid).toContain('7 0 0 8');
	expect(grid).toContain('1 7 5 2 0 0');
	expect(grid).toContain('1 8 2 2 0 8');
	expect(grid).not.toContain('0 0 0 0');
	await shot(page, '1740-876x208');

	// 7 × 46,55 : 46,55 posé en haut, résultat 325,85, retenues 4 3 3
	await show(page, '1740 c', op('calcul: 7 × 46,55', 'cases: aucune'));
	const decimal = await gridText(page);
	expect(decimal).toContain('4 6 , 5 5');
	expect(decimal).toContain('3 2 5 , 8 5');
	expect(decimal).toContain('4 3 3');
	await shot(page, '1740-7x46-55');

	// 46 × 7 : une seule ligne, résultat sous le trait
	await show(page, '1740 d', op('calcul: 46 × 7'));
	await expect(cells(page, 'résultat')).toHaveCount(3);
	await expect(cells(page, 'produit')).toHaveCount(0);
	await shot(page, '1740-46x7');
});

test('#1745 — multiplication à trous 7 × 46,55 : virgule posée / déplacée / enlevée, 325,85 juste, 32585 et 3258,5 faux', async ({
	page
}) => {
	test.setTimeout(240_000);
	await login(page, TEACHER.email, TEACHER.password);
	const commaCount = (): Promise<number> =>
		page
			.locator('.operation-grille .operation-virgule')
			.evaluateAll(
				(els) =>
					els.filter(
						(e) =>
							e
								.closest('.operation-carreau')
								?.querySelector('input[data-operation-cell="résultat"]') !== null
					).length
			);

	await show(page, '1745', op('calcul: 7 × 46,55'));
	await typeIn(page, 'résultat', 4, '58523');
	expect(await values(cells(page, 'résultat'))).toEqual(['3', '2', '5', '8', '5']);
	const before = await commaCount();
	// virgule posée à droite d'une case (la 3e)
	await typeIn(page, 'résultat', 2, ',');
	expect(await commaCount()).toBe(before + 1);
	// déplacée ailleurs (4e case) : toujours une seule virgule de plus
	await typeIn(page, 'résultat', 3, ',');
	expect(await commaCount()).toBe(before + 1);
	// retapée au même endroit : enlevée
	await typeIn(page, 'résultat', 3, ',');
	expect(await commaCount()).toBe(before);
	// replacée au bon endroit : 325,85 → juste
	await typeIn(page, 'résultat', 2, ',');
	expect(await validate(page)).toContain('Juste');

	// 32585 sans virgule : faux, la place de la virgule est entourée
	await show(page, '1745 sans virgule', op('calcul: 7 × 46,55'));
	await typeIn(page, 'résultat', 4, '58523');
	expect(await validate(page)).toContain('Faux');
	await expect(page.locator('.operation-virgule-manquante')).toHaveCount(1);
	await shot(page, '1745-virgule-absente');

	// 3258,5 : virgule mal placée, la virgule de l'élève en rouge, opération résolue à côté
	await show(page, '1745 mal placée', op('calcul: 7 × 46,55'));
	await typeIn(page, 'résultat', 4, '58523');
	await typeIn(page, 'résultat', 3, ',');
	const wrong = await validate(page);
	expect(wrong).toContain('Faux');
	expect(wrong).toContain('Correction');
	expect(wrong).toContain('3 2 5 , 8 5');
	const misplaced = page.locator('.operation-virgule').filter({ visible: true });
	expect(
		await misplaced.evaluateAll((els) =>
			els.some((e) => getComputedStyle(e).color !== getComputedStyle(document.body).color)
		)
	).toBe(true);
	await shot(page, '1745-virgule-mal-placee');

	// 2,5 × 4 saisi « 10 » : juste
	await show(page, '1745 2,5 x 4', op('calcul: 2,5 × 4'));
	const n = await cells(page, 'résultat').count();
	await typeIn(page, 'résultat', n - 1, '01');
	expect(await validate(page)).toContain('Juste');
});

test('#1745 — multiplication 548 × 16 à trous : produits partiels et retenues saisissables, flèches ↑/↓', async ({
	page
}) => {
	await login(page, TEACHER.email, TEACHER.password);
	await show(page, '1745 produits', op('calcul: 548 × 16'));
	const partial = cells(page, 'produit');
	await partial.nth(8).click();
	await page.keyboard.type('88', { delay: 60 });
	expect((await values(partial)).filter((v) => v !== '')).toEqual(['8', '8']);
	// flèche ↑ : on monte d'une rangée (autre champ, autre libellé)
	const label = (): Promise<string> =>
		page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
	const first = await label();
	await page.keyboard.press('ArrowUp');
	const upper = await label();
	expect(upper).not.toBe(first);
	await page.keyboard.press('ArrowDown');
	expect(await label()).not.toBe(upper);
	// une retenue de l'addition se saisit
	const help = cells(page, 'aide').first();
	await help.click();
	await page.keyboard.type('1', { delay: 60 });
	expect(await help.inputValue()).toBe('1');
});

test('#1748 — 0,05 × 0,3 : « _ _ , _ 1 5 » incomplète, case des dixièmes surlignée ; « _ _ , 0 1 5 » juste ; 0,03 + 0,02 saisi « _ , _ 5 » incomplète', async ({
	page
}) => {
	test.setTimeout(180_000);
	await login(page, TEACHER.email, TEACHER.password);

	await show(page, '1748 a', op('calcul: 0,05 × 0,3'));
	await typeIn(page, 'résultat', 4, '51');
	await typeIn(page, 'résultat', 1, ',');
	const incomplete = await validate(page);
	expect(incomplete).toContain('Faux');
	expect(incomplete).toContain('rien répondu');
	expect(await invalidCells(page)).toEqual(['Résultat, case 3 sur 5 en partant de la droite']);
	await shot(page, '1748-incomplete');

	await show(page, '1748 b', op('calcul: 0,05 × 0,3'));
	await typeIn(page, 'résultat', 4, '510');
	await typeIn(page, 'résultat', 1, ',');
	expect(await validate(page)).toContain('Juste');
	expect(await invalidCells(page)).toEqual([]);

	await show(page, '1748 c', op('calcul: 0,03 + 0,02'));
	const n = await cells(page, 'résultat').count();
	await typeIn(page, 'résultat', n - 1, '5');
	await typeIn(page, 'résultat', n - 3, ',');
	expect(await validate(page)).toContain('Faux');
	expect(await invalidCells(page)).toContain('Chiffre des dixièmes');
});

// ============================================================================
// Division posée
// ============================================================================

test('#1754 — division posée affichée : 9 456 ÷ 7 (potence), 1350 reste 6, étapes: restes, 785 ÷ 4 décimal, 9 876 ÷ 47', async ({
	page
}) => {
	test.setTimeout(180_000);
	await login(page, TEACHER.email, TEACHER.password);

	// potence : 4 cases au quotient, 1 case de reste, zone d'étapes quadrillée libre
	await show(page, '1754 a', op('calcul: 9 456 ÷ 7'));
	await expect(cells(page, 'quotient')).toHaveCount(4);
	await expect(cells(page, 'reste')).toHaveCount(1);
	expect(await cells(page, 'étape').count()).toBeGreaterThan(0);
	await shot(page, '1754-potence');

	// carreaux vides : 1350, soustractions écrites, pas de ligne « − 0 », reste 6
	await show(page, '1754 b', op('calcul: 9 456 ÷ 7', 'cases: aucune'));
	const plain = await gridText(page);
	expect(plain).toContain('1 3 5 0');
	expect(plain).toContain('− 7');
	expect(plain).toContain('2 4');
	expect(plain).not.toMatch(/− 0\b/);
	expect(plain.endsWith('6')).toBe(true);
	await shot(page, '1754-sans-cases');

	// étapes: restes : seuls les restes sont écrits (pas les soustractions « − »)
	await show(page, '1754 c', op('calcul: 9 456 ÷ 7', 'cases: aucune', 'étapes: restes'));
	const remainders = await gridText(page);
	expect(remainders).toContain('1 3 5 0');
	expect(remainders).not.toContain('−');
	await shot(page, '1754-restes');

	// 785 ÷ 4 décimal : 785,00 avec zéros, quotient 196,25
	await show(page, '1754 d', op('calcul: 785 ÷ 4', 'quotient: décimal', 'cases: aucune'));
	const decimal = await gridText(page);
	expect(decimal).toContain('7 8 5 , 0 0');
	expect(decimal).toContain('1 9 6 , 2 5');
	await shot(page, '1754-decimal');

	// 9 876 ÷ 47 : diviseur à deux chiffres, quotient 4 cases, reste 2 cases
	await show(page, '1754 e', op('calcul: 9 876 ÷ 47'));
	await expect(cells(page, 'quotient')).toHaveCount(4);
	await expect(cells(page, 'reste')).toHaveCount(2);
	if (isPhone(page)) {
		expect(
			await page
				.locator('.operation-defile')
				.first()
				.evaluate((e) => getComputedStyle(e).overflowX)
		).toMatch(/auto|scroll/);
	}
	await shot(page, '1754-9876-47');
});

test('#1758 — division à trous : quotient de gauche à droite, reste de droite à gauche, 1350 reste 6 juste, 1340 reste 5 faux ; décimale 196,25 juste, 19625 faux, 4,20 ÷ 2 saisi 2,1 juste', async ({
	page
}) => {
	test.setTimeout(240_000);
	await login(page, TEACHER.email, TEACHER.password);

	await show(page, '1758 a', op('calcul: 9456 ÷ 7'));
	await expect(cells(page, 'quotient')).toHaveCount(4);
	await expect(cells(page, 'reste')).toHaveCount(1);
	await typeIn(page, 'quotient', 0, '1350');
	expect(await values(cells(page, 'quotient'))).toEqual(['1', '3', '5', '0']);
	await typeIn(page, 'reste', 0, '6');
	// la zone des étapes : chiffres, − et flèches
	await cells(page, 'étape').first().click();
	await page.keyboard.type('9-7', { delay: 60 });
	expect((await values(cells(page, 'étape'))).join('')).toContain('9');
	expect(await validate(page)).toContain('Juste');

	// 1340 reste 5 : chiffres faux en rouge, potence résolue à côté
	await show(page, '1758 b', op('calcul: 9456 ÷ 7'));
	await typeIn(page, 'quotient', 0, '1340');
	await typeIn(page, 'reste', 0, '5');
	const wrong = await validate(page);
	expect(wrong).toContain('Faux');
	expect(wrong).toContain('Correction');
	expect(await invalidCells(page)).toEqual([
		'Quotient, case 3 sur 4 en partant de la gauche',
		'Reste, case 1 sur 1 en partant de la droite'
	]);
	await shot(page, '1758-faux');

	// 785 ÷ 4 décimal : une seule case (quotient), virgule tapée d'une traite
	await show(page, '1758 c', op('calcul: 785 ÷ 4', 'quotient: décimal'));
	await expect(cells(page, 'reste')).toHaveCount(0);
	await typeIn(page, 'quotient', 0, '196,25');
	expect(await validate(page)).toContain('Juste');

	await show(page, '1758 d', op('calcul: 785 ÷ 4', 'quotient: décimal'));
	await typeIn(page, 'quotient', 0, '19625');
	expect(await validate(page)).toContain('Faux');
	await expect(page.locator('.operation-virgule-manquante')).toHaveCount(1);
	await shot(page, '1758-virgule-absente');

	// 4,20 ÷ 2 saisi 2,1 : juste
	await show(page, '1758 e', op('calcul: 4,20 ÷ 2', 'quotient: décimal'));
	await typeIn(page, 'quotient', 0, '2,1');
	expect(await validate(page)).toContain('Juste');
});

// ============================================================================
// Horloge et collection
// ============================================================================

const clock = (heure: string): string => ['```horloge', `heure: ${heure}`, '```'].join('\n');

test('#1707 — horloge : énoncé dessiné en prof ; QCM d’horloges en élève, la correction montre les cadrans', async ({
	page
}) => {
	test.setTimeout(180_000);
	await login(page, TEACHER.email, TEACHER.password);
	await show(page, '1707 énoncé', {
		statement: `Quelle heure ?\n\n${clock('9 h 42')}\n\nHeure : [_]`,
		blanks: [{ expectedAnswer: '9 h 42' }]
	});
	const card = page.getByTestId('typing-card');
	const dial = card.locator('.flip-card-front svg[role="img"]').first();
	await expect(dial).toBeVisible();
	await expect(dial.locator('.horloge-trait')).toHaveCount(60);
	await expect(dial.locator('.horloge-aiguille')).toHaveCount(2);
	expect(await card.innerText()).not.toContain('horloge');
	await shot(page, '1707-prof');

	// En élève : QCM d'horloges, répondre, puis la correction montre les cadrans
	await page.context().clearCookies();
	await login(page, STUDENT.email, STUDENT.password);
	await show(page, '1707 qcm', {
		statement: [
			'Quelle horloge indique 3 h ?',
			'',
			'```choix',
			'melanger: non',
			`- ${clock('3 h').split('\n').join('\n  ')}`,
			`- ${clock('9 h').split('\n').join('\n  ')}`,
			'```'
		].join('\n'),
		blanks: [{ expectedAnswer: '0' }]
	});
	await expect(card.getByRole('radio')).toHaveCount(2);
	await expect(card.locator('.flip-card-front svg[role="img"]')).toHaveCount(2);
	await card.getByRole('radio').nth(1).click();
	await page.getByRole('button', { name: 'Valider' }).click();
	await expect(page.getByText(/^(Juste|Faux)$/).first()).toBeVisible();
	await expect(card.locator('svg[role="img"]').first()).toBeVisible();
	const after = await card.innerText();
	expect(after).not.toContain('```');
	expect(after).not.toContain('heure:');
	await shot(page, '1707-eleve-correction');
});

test('#1766 — collection : 3 barres et 15 cubes en vrac ; toucher un cube le barre, « Effacer les marques » les retire ; QCM de collections', async ({
	page
}) => {
	test.setTimeout(180_000);
	await login(page, TEACHER.email, TEACHER.password);
	await show(page, '1766 énoncé', {
		statement: [
			'Combien ?',
			'',
			'```collection',
			'dizaines: 3',
			'unités: 15',
			'```',
			'',
			'Nombre : [_]'
		].join('\n'),
		blanks: [{ expectedAnswer: '45' }]
	});
	const card = page.getByTestId('typing-card');
	const svg = card.locator('.flip-card-front svg.collection-dessin');
	await expect(svg).toBeVisible();
	await expect(svg.locator('.collection-barre')).toHaveCount(3);
	await expect(svg.locator('.collection-objet')).toHaveCount(18);
	await shot(page, '1766-enonce');

	// Toucher un cube (un objet qui n'est pas une barre) le marque
	const cube = svg.locator('.collection-objet:not(.collection-barre)').first();
	const erase = card.getByRole('button', { name: 'Effacer les marques' });
	await expect(erase).toHaveCount(0);
	if (isPhone(page)) await cube.tap();
	else await cube.click();
	await expect(svg.locator('.collection-marque')).toHaveCount(1);
	await expect(erase).toBeVisible();
	await shot(page, '1766-marque');
	await erase.click();
	await expect(svg.locator('.collection-marque')).toHaveCount(0);
	await expect(erase).toHaveCount(0);

	// QCM de collections : choix dessinés en petit, correction dessinée
	const collection = (u: number): string => ['```collection', `unités: ${u}`, '```'].join('\n');
	await show(page, '1766 qcm', {
		statement: [
			'Quelle collection montre 4 ?',
			'',
			'```choix',
			'melanger: non',
			`- ${collection(4).split('\n').join('\n  ')}`,
			`- ${collection(7).split('\n').join('\n  ')}`,
			'```'
		].join('\n'),
		blanks: [{ expectedAnswer: '0' }]
	});
	await expect(card.getByRole('radio')).toHaveCount(2);
	await expect(card.locator('.flip-card-front svg.collection-dessin')).toHaveCount(2);
	const width = await card
		.locator('.flip-card-front svg.collection-dessin')
		.first()
		.evaluate((e) => e.getBoundingClientRect().width / (96 / 2.54));
	expect(width).toBeLessThanOrEqual(3.2);
	await card.getByRole('radio').nth(0).click();
	await page.getByRole('button', { name: 'Valider' }).click();
	await expect(page.getByText(/^(Juste|Faux)$/).first()).toBeVisible();
	await expect(card.locator('svg.collection-dessin').first()).toBeVisible();
	expect(await card.innerText()).not.toContain('```');
	await shot(page, '1766-qcm-correction');
});
