import { expect, test, type Locator, type Page } from '@playwright/test';
import { courbeEntry } from '../../src/lib/block-catalog/courbe';
import { figureACompleterEntry } from '../../src/lib/block-catalog/figure-a-completer';
import { generateInstance } from '../../src/lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '../../src/lib/questions/types';
import { ADMIN, assertLocalServerEnv, login, sql } from './helpers/carnet';
import { brouillons, isTouch, type Spot, type Win } from './helpers/modele-brouillon';

/**
 * Blocs `figure-a-completer` à geste « figure à compléter » (tri des vérifications manuelles, paquet 6)
 * ====================================================================================================
 *
 * Reprend les lignes #2485, #2490, #2494, #2499, #2508, #2475/#2477, #2473, #2463, #2439/#2430,
 * #2467 et #2472 de `docs/wip/verifications-manuelles.md`. Décor et gestes :
 * `helpers/modele-brouillon.ts` (modèle brouillon « Verifs6 geo … » créé par l'API en admin,
 * joué dans l'aperçu admin, effacé en `afterEach` par identifiant).
 *
 * Les blocs de départ sont les exemples de `/aide-ecriture/blocs/figure-a-completer` et
 * `/aide-ecriture/blocs/courbe`, lus dans `src/lib/block-catalog/` (jamais recopiés).
 *
 * Ce que ces tests ne voient pas : la lisibilité des graduations du millimètre, des chiffres
 * retournés et des traits fins à l'œil, la sensation du vrai doigt (viser sans voir sous le doigt).
 *
 * Captures à l'œil : `.captures/verifs/blocs-geometrie-6/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());

// Constantes

const SHOTS = '.captures/verifs/blocs-geometrie-6';
const decor = brouillons('Verifs6 geo', SHOTS);
const { openPreview, figureZone, fig, tapFigure, validate, shootThemes } = decor;

// Types

interface Pt {
	x: number;
	y: number;
}

// Fonctions

/** Le bloc de l'exemple du catalogue (la source de `/aide-ecriture/blocs/figure-a-completer`) */
function exemple(title: string): string {
	const found = figureACompleterEntry.examples.find((example) => example.title === title);
	if (!found) throw new Error(`exemple introuvable dans le catalogue : ${title}`);
	return found.source;
}

/** La fenêtre de la figure, lue sur sa ligne `fenetre:` */
function fenetreDe(source: string): Win {
	const m = source.match(
		/fenetre:\s*(-?[\d.]+)\s*;\s*(-?[\d.]+)\s*;\s*(-?[\d.]+)\s*;\s*(-?[\d.]+)/
	);
	if (!m) throw new Error('pas de ligne fenetre:');
	return { xMin: Number(m[1]), xMax: Number(m[2]), yMin: Number(m[3]), yMax: Number(m[4]) };
}

/** Un point nommé de la figure, lu sur sa ligne `X = point(x, y)` */
function pointDe(source: string, name: string): Pt {
	const m = source.match(new RegExp(`^${name} = point\\((-?[\\d.]+),\\s*(-?[\\d.]+)`, 'm'));
	if (!m) throw new Error(`point ${name} introuvable dans le bloc`);
	return { x: Number(m[1]), y: Number(m[2]) };
}

async function press(locator: Locator): Promise<void> {
	await locator.scrollIntoViewIfNeeded();
	if (isTouch()) await locator.tap();
	else await locator.click();
}

/** Choisit un outil de la palette (`outil-<id>`) et attend qu'il soit actif */
async function outil(page: Page, id: string): Promise<void> {
	const button = fig(page).getByTestId(`outil-${id}`);
	await press(button);
	await expect(button).toHaveAttribute('aria-pressed', 'true');
}

/** Les boutons d'outil de la palette, dans l'ordre : `[testid, libellé]` */
async function palette(page: Page): Promise<string[]> {
	return fig(page)
		.locator('[data-testid^="outil-"]')
		.evaluateAll((els) =>
			els.map(
				(el) =>
					`${el.getAttribute('data-testid')?.replace('outil-', '')}=${(el.textContent ?? '').trim()}`
			)
		);
}

/** Le nombre d'éléments `data-testid` de la figure jouée */
async function compte(page: Page, id: string, n: number): Promise<void> {
	await expect(fig(page).getByTestId(id)).toHaveCount(n);
}

/** La longueur lue sur la règle graduée posée, en millimètres (`aria-valuenow`) */
async function attendreMm(page: Page, mm: number): Promise<void> {
	await expect
		.poll(async () => fig(page).getByTestId('regle').first().getAttribute('aria-valuenow'))
		.toBe(String(mm));
}

/** La figure corrigée dit « réponse juste » (texte pour lecteur d'écran de la figure) */
async function estJuste(page: Page): Promise<void> {
	await expect(fig(page).locator('p[role="status"]')).toContainText('réponse juste');
}

/** Le texte de la remarque de l'aperçu contient `texte` (espaces réduits) */
async function dit(page: Page, texte: string): Promise<void> {
	await expect(page.locator('#contenu-principal')).toContainText(texte);
}

/** Les traits de la correction (`testid`) sont tous en pointillés */
async function enPointilles(page: Page, id: string, n: number): Promise<void> {
	await expect(fig(page).getByTestId(id)).toHaveCount(n);
	const dashes = await fig(page)
		.getByTestId(id)
		.evaluateAll((els) => els.map((el) => getComputedStyle(el).strokeDasharray));
	expect(dashes.length, `${id} : nombre`).toBe(n);
	expect(
		dashes.every((d) => d !== 'none' && d !== ''),
		`${id} en pointillés : ${dashes}`
	).toBe(true);
}

/** Un toucher sur la figure, à `(x ; y)` décalé de 0,05 (viser « à côté » du point, comme un doigt) */
async function toucheA(zone: Locator, win: Win, p: Pt): Promise<void> {
	await tapFigure(zone, win, p.x + 0.05, p.y + 0.05);
}

// ============================================================================
// #2485 — Règle graduée : segment de longueur donnée
// ============================================================================

const SEG_BLOCK = exemple('Tracer un segment de longueur donnée (règle graduée)');
const SEG_WIN = fenetreDe(SEG_BLOCK);
const SEG_A = pointDe(SEG_BLOCK, 'A');
const SEG_STATEMENT = `Trace le segment $[AB]$ de longueur $6$ cm.\n\n${SEG_BLOCK}`;

/** La règle graduée posée en A, vers la droite */
async function poserReglePuisSegment(page: Page, zone: Locator): Promise<void> {
	await toucheA(zone, SEG_WIN, SEG_A);
	await tapFigure(zone, SEG_WIN, 9, SEG_A.y);
	await compte(page, 'regle', 1);
	await outil(page, 'segment');
	// La règle reste posée en changeant d'outil
	await compte(page, 'regle', 1);
}

test.describe('#2485 — règle graduée : segment de longueur donnée', () => {
	test('#2485 — palette Règle graduée · Segment ; règle posée en A, segment jusqu’au bord gradué : le bout s’arrête sur 60 mm → juste', async ({
		page
	}) => {
		await openPreview(page, '2485 juste', SEG_STATEMENT);
		const zone = await figureZone(page);
		expect(await palette(page)).toEqual(['regle=Règle graduée', 'segment=Segment']);
		await expect(fig(page).getByTestId('outil-regle')).toHaveAttribute('aria-pressed', 'true');
		await poserReglePuisSegment(page, zone);
		await toucheA(zone, SEG_WIN, SEG_A);
		await tapFigure(zone, SEG_WIN, 8.02, 4.15);
		await compte(page, 'segment-eleve', 1);
		await attendreMm(page, 60);
		await validate(page);
		await estJuste(page);
		await shootThemes(page, fig(page).first(), '2485-juste');
	});

	test('#2485 — ‹ › décalent d’1 mm : 59 puis 58 ; 5,8 cm → « Ton segment mesure 5,8 cm au lieu de 6 cm. » ; correction : règle posée en A et segment en pointillés', async ({
		page
	}) => {
		await openPreview(page, '2485 cinq huit', SEG_STATEMENT);
		const zone = await figureZone(page);
		await poserReglePuisSegment(page, zone);
		await toucheA(zone, SEG_WIN, SEG_A);
		await tapFigure(zone, SEG_WIN, 8.02, 4.15);
		await attendreMm(page, 60);
		await press(fig(page).getByTestId('regle-moins'));
		await attendreMm(page, 59);
		await press(fig(page).getByTestId('regle-moins'));
		await attendreMm(page, 58);
		await validate(page);
		await dit(page, 'Ton segment mesure 5,8 cm au lieu de 6 cm.');
		await compte(page, 'bonne-regle', 1);
		await enPointilles(page, 'bon-segment', 1);
		await shootThemes(page, fig(page).first(), '2485-correction');
	});

	test('#2485 — Retourner : la règle passe de l’autre côté de A (sens −1), le segment reste juste à 60 mm', async ({
		page
	}) => {
		await openPreview(page, '2485 retourner', SEG_STATEMENT);
		const zone = await figureZone(page);
		await toucheA(zone, SEG_WIN, SEG_A);
		await tapFigure(zone, SEG_WIN, 9, SEG_A.y);
		await compte(page, 'regle', 1);
		const sens = fig(page).getByTestId('regle').first();
		const avant = await sens.getAttribute('data-sens');
		await press(fig(page).getByTestId('regle-retourner'));
		await expect(sens).not.toHaveAttribute('data-sens', avant ?? '');
		await outil(page, 'segment');
		await toucheA(zone, SEG_WIN, SEG_A);
		await tapFigure(zone, SEG_WIN, 8.02, 4.15);
		await attendreMm(page, 60);
		await validate(page);
		await estJuste(page);
		// Les chiffres du nouveau côté : à juger à l'œil (voir la capture)
		await shootThemes(page, fig(page).first(), '2485-retournee');
	});

	test('#2485 — bout à l’œil (sans règle) → « …tracé à l’œil… »', async ({ page }) => {
		await openPreview(page, '2485 oeil', SEG_STATEMENT);
		const zone = await figureZone(page);
		await outil(page, 'segment');
		await toucheA(zone, SEG_WIN, SEG_A);
		await tapFigure(zone, SEG_WIN, 7.37, 5.21);
		await compte(page, 'segment-eleve', 1);
		await validate(page);
		await dit(page, 'tracé à l’œil');
	});

	test('#2485 — deux segments depuis A, dans deux directions → « Trace un seul segment [AB] depuis le point A. »', async ({
		page
	}) => {
		await openPreview(page, '2485 deux', SEG_STATEMENT);
		const zone = await figureZone(page);
		await poserReglePuisSegment(page, zone);
		await toucheA(zone, SEG_WIN, SEG_A);
		await tapFigure(zone, SEG_WIN, 8.02, 4.15);
		await compte(page, 'segment-eleve', 1);
		await toucheA(zone, SEG_WIN, SEG_A);
		await tapFigure(zone, SEG_WIN, 5, 7);
		await compte(page, 'segment-eleve', 2);
		await validate(page);
		await dit(page, 'Trace un seul segment [AB] depuis le point A.');
	});

	test('#2485 — un petit segment (1 cm) se trace au toucher : la règle lit 10 mm', async ({
		page
	}) => {
		await openPreview(page, '2485 petit', SEG_STATEMENT);
		const zone = await figureZone(page);
		await poserReglePuisSegment(page, zone);
		await toucheA(zone, SEG_WIN, SEG_A);
		await tapFigure(zone, SEG_WIN, 3.02, 4.06);
		await compte(page, 'segment-eleve', 1);
		await attendreMm(page, 10);
	});
});

// ============================================================================
// #2490 — Segment sur une demi-droite (règle graduée)
// ============================================================================

const RAYON_BLOCK = exemple(
	'Tracer un segment de longueur donnée sur une demi-droite (règle graduée)'
);
const RAYON_WIN = fenetreDe(RAYON_BLOCK);
const RAYON_A = pointDe(RAYON_BLOCK, 'A');
const RAYON_X = pointDe(RAYON_BLOCK, 'X');
const RAYON_STATEMENT = `Trace le segment $[AB]$ de $6$ cm sur la demi-droite $[Ax)$.\n\n${RAYON_BLOCK}`;
/** Le vecteur unitaire de [Ax) */
const RAYON_U: Pt = (() => {
	const d = Math.hypot(RAYON_X.x - RAYON_A.x, RAYON_X.y - RAYON_A.y);
	return { x: (RAYON_X.x - RAYON_A.x) / d, y: (RAYON_X.y - RAYON_A.y) / d };
})();
/** Le bout du segment de 6 cm le long de [Ax) */
const RAYON_B: Pt = { x: RAYON_A.x + 6 * RAYON_U.x, y: RAYON_A.y + 6 * RAYON_U.y };

test.describe('#2490 — segment de longueur donnée sur une demi-droite', () => {
	test('#2490 — règle posée par un toucher près de [Ax) : elle s’aimante à la demi-droite ; segment jusqu’à 6 cm le long → juste', async ({
		page
	}) => {
		await openPreview(page, '2490 juste', RAYON_STATEMENT);
		const zone = await figureZone(page);
		await toucheA(zone, RAYON_WIN, RAYON_A);
		// Un point de [Ax) à x = 7, touché 0,45 au-dessus : la règle se pose exactement le long de la demi-droite
		const surRayon = RAYON_A.y + ((7 - RAYON_A.x) * RAYON_U.y) / RAYON_U.x;
		await tapFigure(zone, RAYON_WIN, 7, surRayon + 0.45);
		await compte(page, 'regle', 1);
		await outil(page, 'segment');
		await toucheA(zone, RAYON_WIN, RAYON_A);
		await tapFigure(zone, RAYON_WIN, RAYON_B.x + 0.02, RAYON_B.y + 0.03);
		await compte(page, 'segment-eleve', 1);
		await attendreMm(page, 60);
		await validate(page);
		await estJuste(page);
	});

	test('#2490 — règle posée à l’horizontale, 6 cm → « Trace ton segment sur la demi-droite [Ax). » ; correction : règle le long de [Ax) et segment en pointillés', async ({
		page
	}) => {
		await openPreview(page, '2490 ailleurs', RAYON_STATEMENT);
		const zone = await figureZone(page);
		await toucheA(zone, RAYON_WIN, RAYON_A);
		await tapFigure(zone, RAYON_WIN, 9, RAYON_A.y);
		await compte(page, 'regle', 1);
		await outil(page, 'segment');
		await toucheA(zone, RAYON_WIN, RAYON_A);
		await tapFigure(zone, RAYON_WIN, RAYON_A.x + 6.02, RAYON_A.y + 0.05);
		await attendreMm(page, 60);
		await validate(page);
		await dit(page, 'Trace ton segment sur la demi-droite [Ax).');
		await compte(page, 'bonne-regle', 1);
		await enPointilles(page, 'bon-segment', 1);
		// La règle de la correction est posée le long de [Ax) : sa pente est celle de la demi-droite
		const pente = await fig(page)
			.getByTestId('bonne-regle')
			.evaluate((el) => {
				const box = (el as unknown as SVGGraphicsElement).getBoundingClientRect();
				return box.height / box.width;
			});
		expect(pente, 'la règle de la correction est oblique, comme [Ax)').toBeGreaterThan(0.3);
		await shootThemes(page, fig(page).first(), '2490-correction');
	});
});

// ============================================================================
// #2494 — Cercle de rayon donné en cm (règle graduée et compas)
// ============================================================================

const RAYON_CM_BLOCK = exemple('Tracer un cercle de rayon donné en cm (règle graduée et compas)');
const CERCLE_WIN = fenetreDe(RAYON_CM_BLOCK);
const CERCLE_O = pointDe(RAYON_CM_BLOCK, 'O');
const CERCLE_STATEMENT = `Trace le cercle de centre $O$ et de rayon $3$ cm.\n\n${RAYON_CM_BLOCK}`;

/** Règle posée en O vers la droite, compas piqué en O, ouvert près de la graduation 3 */
async function cercleTroisCm(page: Page, zone: Locator): Promise<void> {
	await expect(fig(page).getByTestId('outil-regle')).toHaveAttribute('aria-pressed', 'true');
	await toucheA(zone, CERCLE_WIN, CERCLE_O);
	await tapFigure(zone, CERCLE_WIN, 9, CERCLE_O.y);
	await compte(page, 'regle', 1);
	await outil(page, 'compas');
	await toucheA(zone, CERCLE_WIN, CERCLE_O);
	await tapFigure(zone, CERCLE_WIN, CERCLE_O.x + 3.03, CERCLE_O.y + 0.12);
	await compte(page, 'cercle-eleve', 1);
	await attendreMm(page, 30);
}

test.describe('#2494 — cercle de rayon donné en cm', () => {
	test('#2494 — Règle graduée en départ, puis Compas : l’ouverture s’aimante à la graduation 3 (30 mm) → juste', async ({
		page
	}) => {
		await openPreview(page, '2494 juste', CERCLE_STATEMENT);
		const zone = await figureZone(page);
		expect(await palette(page)).toEqual(['regle=Règle graduée', 'compas=Compas']);
		await cercleTroisCm(page, zone);
		await validate(page);
		await estJuste(page);
		await shootThemes(page, fig(page).first(), '2494-juste');
	});

	test('#2494 — ‹ › décalent l’ouverture d’1 mm : 2,9 cm → « Ton cercle a un rayon de 2,9 cm au lieu de 3 cm. » ; correction : règle posée en O et cercle en pointillés', async ({
		page
	}) => {
		await openPreview(page, '2494 deux neuf', CERCLE_STATEMENT);
		const zone = await figureZone(page);
		await cercleTroisCm(page, zone);
		await press(fig(page).getByTestId('regle-moins'));
		await attendreMm(page, 29);
		await validate(page);
		await dit(page, 'Ton cercle a un rayon de 2,9 cm au lieu de 3 cm.');
		await compte(page, 'bonne-regle', 1);
		await compte(page, 'bon-cercle', 1);
		const trait = await fig(page)
			.locator('.bon-cercle-trait')
			.evaluateAll((els) => els.map((el) => getComputedStyle(el).strokeDasharray));
		expect(trait.length, 'le cercle de la correction').toBe(1);
		expect(trait[0], `cercle en pointillés : ${trait}`).not.toMatch(/^(none|)$/);
		await shootThemes(page, fig(page).first(), '2494-correction');
	});
});

// ============================================================================
// #2499 — Triangle rectangle coté en cm
// ============================================================================

const TRC_BLOCK = exemple('Construire un triangle rectangle coté en cm (règle graduée)');
const TRC_WIN = fenetreDe(TRC_BLOCK);
const TRC_A = pointDe(TRC_BLOCK, 'A');
const TRC_B = pointDe(TRC_BLOCK, 'B');
const TRC_STATEMENT = `Construis le triangle $ABC$ rectangle en $A$ tel que $AC = 4$ cm.\n\n${TRC_BLOCK}`;

/** Équerre le long de (AB) en A, puis règle posée en A (le 2e toucher s'aimante à la perpendiculaire) */
async function equerrePuisRegle(page: Page, zone: Locator): Promise<void> {
	await outil(page, 'equerre');
	await tapFigure(zone, TRC_WIN, (TRC_A.x + TRC_B.x) / 2, TRC_A.y + 0.05);
	await compte(page, 'droite-choisie', 1);
	await toucheA(zone, TRC_WIN, TRC_A);
	await compte(page, 'droite-eleve', 1);
	await outil(page, 'regle');
	await toucheA(zone, TRC_WIN, TRC_A);
	// Un peu à côté de la perpendiculaire : le toucher s'aimante dessus
	await tapFigure(zone, TRC_WIN, TRC_A.x + 0.12, 5);
	await compte(page, 'regle', 1);
	await outil(page, 'segment');
}

test.describe('#2499 — triangle rectangle coté en cm', () => {
	test('#2499 — palette Segment · Équerre · Règle graduée ; [AC] arrêté sur 4 cm (40 mm), puis [BC] → juste', async ({
		page
	}) => {
		await openPreview(page, '2499 juste', TRC_STATEMENT);
		const zone = await figureZone(page);
		await equerrePuisRegle(page, zone);
		expect(await palette(page)).toEqual([
			'segment=Segment',
			'equerre=Équerre',
			'regle=Règle graduée'
		]);
		await toucheA(zone, TRC_WIN, TRC_A);
		await tapFigure(zone, TRC_WIN, TRC_A.x + 0.1, TRC_A.y + 4);
		await attendreMm(page, 40);
		await toucheA(zone, TRC_WIN, TRC_B);
		await tapFigure(zone, TRC_WIN, TRC_A.x + 0.05, TRC_A.y + 4);
		await compte(page, 'segment-eleve', 2);
		await validate(page);
		await estJuste(page);
	});

	test('#2499 — [AC] arrêté sur 3,8 cm → « Ton côté [AC] mesure 3,8 cm au lieu de 4 cm. » ; correction : perpendiculaire, règle posée en A, angle droit codé', async ({
		page
	}) => {
		await openPreview(page, '2499 trois huit', TRC_STATEMENT);
		const zone = await figureZone(page);
		await equerrePuisRegle(page, zone);
		await toucheA(zone, TRC_WIN, TRC_A);
		await tapFigure(zone, TRC_WIN, TRC_A.x + 0.1, TRC_A.y + 3.8);
		await attendreMm(page, 38);
		await toucheA(zone, TRC_WIN, TRC_B);
		await tapFigure(zone, TRC_WIN, TRC_A.x + 0.05, TRC_A.y + 3.8);
		await compte(page, 'segment-eleve', 2);
		await validate(page);
		await dit(page, 'Ton côté [AC] mesure 3,8 cm au lieu de 4 cm.');
		await compte(page, 'bon-triangle-perpendiculaire', 1);
		await compte(page, 'bonne-regle', 1);
		await compte(page, 'bon-triangle-angle-droit', 1);
		await shootThemes(page, fig(page).first(), '2499-correction');
	});

	test('#2499 — [AC] prolongé au-delà de C (jusqu’à 5 cm) : la longueur du trait vu → « Ton côté [AC] mesure 5 cm au lieu de 4 cm. »', async ({
		page
	}) => {
		await openPreview(page, '2499 prolonge', TRC_STATEMENT);
		const zone = await figureZone(page);
		await equerrePuisRegle(page, zone);
		await toucheA(zone, TRC_WIN, TRC_A);
		await tapFigure(zone, TRC_WIN, TRC_A.x + 0.1, TRC_A.y + 5);
		await attendreMm(page, 50);
		// [BC] va de B à l'extrémité du trait vu (le bout de [AC])
		await toucheA(zone, TRC_WIN, TRC_B);
		await tapFigure(zone, TRC_WIN, TRC_A.x + 0.05, TRC_A.y + 5);
		await compte(page, 'segment-eleve', 2);
		await validate(page);
		await dit(page, 'Ton côté [AC] mesure 5 cm au lieu de 4 cm.');
	});

	test('#2499 — deux triangles → « Trace un seul triangle ABC. »', async ({ page }) => {
		await openPreview(page, '2499 deux triangles', TRC_STATEMENT);
		const zone = await figureZone(page);
		await equerrePuisRegle(page, zone);
		await toucheA(zone, TRC_WIN, TRC_A);
		await tapFigure(zone, TRC_WIN, TRC_A.x + 0.1, TRC_A.y + 4);
		await toucheA(zone, TRC_WIN, TRC_B);
		await tapFigure(zone, TRC_WIN, TRC_A.x + 0.05, TRC_A.y + 4);
		await compte(page, 'segment-eleve', 2);
		// Un second sommet, à 3 cm de A sur la même perpendiculaire (la règle est posée dessus)
		await toucheA(zone, TRC_WIN, TRC_A);
		await tapFigure(zone, TRC_WIN, TRC_A.x + 0.1, TRC_A.y + 3);
		await toucheA(zone, TRC_WIN, TRC_B);
		await tapFigure(zone, TRC_WIN, TRC_A.x + 0.05, TRC_A.y + 3);
		await compte(page, 'segment-eleve', 4);
		await validate(page);
		await dit(page, 'Trace un seul triangle ABC.');
	});
});

// ============================================================================
// #2508 — Carré et rectangle cotés en cm, papier uni
// ============================================================================

const CARRE_BLOCK = exemple(
	'Construire un carré coté en cm, papier uni (équerre et règle graduée)'
);
const RECT_BLOCK = CARRE_BLOCK.replace(
	'verifier: carre A ; B ; C ; D',
	'verifier: rectangle A ; B ; C ; D : BC = 3 cm'
);
const CARRE_WIN = fenetreDe(CARRE_BLOCK);
const CARRE_A = pointDe(CARRE_BLOCK, 'A');
const CARRE_B = pointDe(CARRE_BLOCK, 'B');

/** Équerre le long de (AB) en `x`, règle posée en `x` (aimantée à la perpendiculaire), côté jusqu'à `top` */
async function coteDroit(page: Page, zone: Locator, x: number, top: number): Promise<void> {
	const droites = await fig(page).getByTestId('droite-eleve').count();
	const segments = await fig(page).getByTestId('segment-eleve').count();
	await outil(page, 'equerre');
	await tapFigure(zone, CARRE_WIN, (CARRE_A.x + CARRE_B.x) / 2, CARRE_A.y + 0.05);
	await compte(page, 'droite-choisie', 1);
	await tapFigure(zone, CARRE_WIN, x + 0.05, CARRE_A.y + 0.05);
	await compte(page, 'droite-eleve', droites + 1);
	await outil(page, 'regle');
	await tapFigure(zone, CARRE_WIN, x + 0.05, CARRE_A.y + 0.05);
	await tapFigure(zone, CARRE_WIN, x + 0.12, 6);
	await compte(page, 'regle', 1);
	await outil(page, 'segment');
	await tapFigure(zone, CARRE_WIN, x + 0.05, CARRE_A.y + 0.05);
	await tapFigure(zone, CARRE_WIN, x + 0.1, top);
	await compte(page, 'segment-eleve', segments + 1);
}

/** Le carré (ou le rectangle) en entier : côtés [BC] puis [AD] jusqu'à `top`, puis [CD] pile sur C et D */
async function carreComplet(page: Page, zone: Locator, top: number): Promise<void> {
	await coteDroit(page, zone, CARRE_B.x, top);
	await coteDroit(page, zone, CARRE_A.x, top);
	await tapFigure(zone, CARRE_WIN, CARRE_B.x, top);
	await tapFigure(zone, CARRE_WIN, CARRE_A.x, top);
	await compte(page, 'segment-eleve', 3);
}

test.describe('#2508 — carré et rectangle cotés en cm', () => {
	test('#2508 — carré : équerre en B, règle posée en B, [BC] sur 6 cm (60 mm) ; de même en A ; puis [CD] pile sur C et D → juste', async ({
		page
	}) => {
		await openPreview(page, '2508 carre juste', `Construis le carré $ABCD$.\n\n${CARRE_BLOCK}`);
		const zone = await figureZone(page);
		await coteDroit(page, zone, CARRE_B.x, CARRE_A.y + 6);
		await attendreMm(page, 60);
		await coteDroit(page, zone, CARRE_A.x, CARRE_A.y + 6);
		await attendreMm(page, 60);
		await tapFigure(zone, CARRE_WIN, CARRE_B.x, CARRE_A.y + 6);
		await tapFigure(zone, CARRE_WIN, CARRE_A.x, CARRE_A.y + 6);
		await compte(page, 'segment-eleve', 3);
		await validate(page);
		await estJuste(page);
		await shootThemes(page, fig(page).first(), '2508-carre-juste');
	});

	test('#2508 — rectangle BC = 3 cm : mêmes gestes, côtés de 3 cm (30 mm), [CD] → juste', async ({
		page
	}) => {
		await openPreview(
			page,
			'2508 rectangle juste',
			`Construis le rectangle $ABCD$ tel que $BC = 3$ cm.\n\n${RECT_BLOCK}`
		);
		const zone = await figureZone(page);
		await coteDroit(page, zone, CARRE_B.x, CARRE_A.y + 3);
		await attendreMm(page, 30);
		await coteDroit(page, zone, CARRE_A.x, CARRE_A.y + 3);
		await attendreMm(page, 30);
		await tapFigure(zone, CARRE_WIN, CARRE_B.x, CARRE_A.y + 3);
		await tapFigure(zone, CARRE_WIN, CARRE_A.x, CARRE_A.y + 3);
		await compte(page, 'segment-eleve', 3);
		await validate(page);
		await estJuste(page);
	});

	test('#2508 — [BC] sur 5,8 cm → « Ton côté [BC] mesure 5,8 cm au lieu de 6 cm. » ; correction : perpendiculaires, deux règles, angles droits codés', async ({
		page
	}) => {
		await openPreview(page, '2508 cinq huit', `Construis le carré $ABCD$.\n\n${CARRE_BLOCK}`);
		const zone = await figureZone(page);
		await carreComplet(page, zone, CARRE_A.y + 5.8);
		await validate(page);
		await dit(page, 'Ton côté [BC] mesure 5,8 cm au lieu de 6 cm.');
		await compte(page, 'bonne-regle', 2);
		await compte(page, 'bon-triangle-perpendiculaire', 2);
		await compte(page, 'bon-triangle-angle-droit', 2);
		await shootThemes(page, fig(page).first(), '2508-correction');
	});

	test('#2508 — deux carrés (un second côté [BC] plus court) → « Trace un seul carré ABCD. »', async ({
		page
	}) => {
		await openPreview(page, '2508 deux carres', `Construis le carré $ABCD$.\n\n${CARRE_BLOCK}`);
		const zone = await figureZone(page);
		await carreComplet(page, zone, CARRE_A.y + 6);
		// Un second carré, sur le même côté [AB] mais de 3 cm : un autre jeu de côtés
		await coteDroit(page, zone, CARRE_B.x, CARRE_A.y + 3);
		await coteDroit(page, zone, CARRE_A.x, CARRE_A.y + 3);
		await tapFigure(zone, CARRE_WIN, CARRE_B.x, CARRE_A.y + 3);
		await tapFigure(zone, CARRE_WIN, CARRE_A.x, CARRE_A.y + 3);
		await validate(page);
		await dit(page, 'Trace un seul carré ABCD.');
	});

	test('#2508 — D au croisement de la perpendiculaire en A et de la perpendiculaire à (BC) en C (Q20) → juste', async ({
		page
	}) => {
		await openPreview(page, '2508 croisement', `Construis le carré $ABCD$.\n\n${CARRE_BLOCK}`);
		const zone = await figureZone(page);
		// [BC] à 6 cm
		await coteDroit(page, zone, CARRE_B.x, CARRE_A.y + 6);
		await attendreMm(page, 60);
		// La perpendiculaire à [BC] en C : l'équerre choisit la droite (BC) puis passe par C
		await outil(page, 'equerre');
		await tapFigure(zone, CARRE_WIN, CARRE_B.x + 0.05, CARRE_A.y + 3);
		await compte(page, 'droite-choisie', 1);
		await tapFigure(zone, CARRE_WIN, CARRE_B.x, CARRE_A.y + 6);
		await compte(page, 'droite-eleve', 2);
		// La perpendiculaire à (AB) en A, puis [AD] et [CD] jusqu'au croisement D(3 ; 7)
		await outil(page, 'equerre');
		await tapFigure(zone, CARRE_WIN, (CARRE_A.x + CARRE_B.x) / 2, CARRE_A.y + 0.05);
		await compte(page, 'droite-choisie', 1);
		await tapFigure(zone, CARRE_WIN, CARRE_A.x + 0.05, CARRE_A.y + 0.05);
		await compte(page, 'droite-eleve', 3);
		await outil(page, 'segment');
		await tapFigure(zone, CARRE_WIN, CARRE_A.x + 0.05, CARRE_A.y + 0.05);
		await tapFigure(zone, CARRE_WIN, CARRE_A.x, CARRE_A.y + 6);
		await tapFigure(zone, CARRE_WIN, CARRE_B.x, CARRE_A.y + 6);
		await tapFigure(zone, CARRE_WIN, CARRE_A.x, CARRE_A.y + 6);
		await compte(page, 'segment-eleve', 3);
		await validate(page);
		await estJuste(page);
	});
});

// ============================================================================
// #2473 — Triangle rectangle à l'équerre (papier uni) et sur quadrillage
// ============================================================================

const TR_UNI_BLOCK = exemple('Construire un triangle rectangle à l’équerre');
const TR_UNI_WIN = fenetreDe(TR_UNI_BLOCK);
const TR_QUAD_BLOCK = exemple('Construire un triangle rectangle sur quadrillage');
const TR_QUAD_WIN = fenetreDe(TR_QUAD_BLOCK);

test.describe('#2473 — triangle rectangle', () => {
	test('#2473 — papier uni : palette Segment · Équerre · Report ; équerre le long de [AB] en A, report de u piqué en A, côtés jusqu’au croisement → juste', async ({
		page
	}) => {
		await openPreview(
			page,
			'2473 uni juste',
			`Construis le triangle $ABC$ rectangle en $A$ tel que $AC = 4$ cm.\n\n${TR_UNI_BLOCK}`
		);
		const zone = await figureZone(page);
		expect(await palette(page)).toEqual(['segment=Segment', 'equerre=Équerre', 'report=Report']);
		await outil(page, 'equerre');
		await tapFigure(zone, TR_UNI_WIN, 6, 2.05);
		await compte(page, 'droite-choisie', 1);
		await tapFigure(zone, TR_UNI_WIN, 3.05, 2.05);
		await compte(page, 'droite-eleve', 1);
		await outil(page, 'report');
		await tapFigure(zone, TR_UNI_WIN, 6.05, 6.55);
		await tapFigure(zone, TR_UNI_WIN, 9.95, 6.55);
		await compte(page, 'ecartement', 1);
		await tapFigure(zone, TR_UNI_WIN, 3.05, 2.05);
		await compte(page, 'report-eleve', 1);
		await outil(page, 'segment');
		await tapFigure(zone, TR_UNI_WIN, 3.05, 2.05);
		await tapFigure(zone, TR_UNI_WIN, 3.05, 6.05);
		await tapFigure(zone, TR_UNI_WIN, 9.05, 2.05);
		await tapFigure(zone, TR_UNI_WIN, 3.05, 5.95);
		await compte(page, 'segment-eleve', 2);
		await validate(page);
		await estJuste(page);
	});

	test('#2473 — papier uni : côtés à l’œil → « Ton côté [AC] est tracé à l’œil : utilise l’équerre. » ; correction : perpendiculaire en trait fin et petit carré en A', async ({
		page
	}) => {
		await openPreview(
			page,
			'2473 uni oeil',
			`Construis le triangle $ABC$ rectangle en $A$ tel que $AC = 4$ cm.\n\n${TR_UNI_BLOCK}`
		);
		const zone = await figureZone(page);
		await outil(page, 'segment');
		await tapFigure(zone, TR_UNI_WIN, 3.05, 2.05);
		await tapFigure(zone, TR_UNI_WIN, 4, 5);
		await tapFigure(zone, TR_UNI_WIN, 9.05, 2.05);
		await tapFigure(zone, TR_UNI_WIN, 4, 5);
		await compte(page, 'segment-eleve', 2);
		await validate(page);
		await dit(page, 'Ton côté [AC] est tracé à l’œil : utilise l’équerre.');
		await compte(page, 'bon-segment', 2);
		await compte(page, 'bon-triangle-perpendiculaire', 1);
		await compte(page, 'bon-triangle-angle-droit', 1);
		// La perpendiculaire est en trait fin : plus fine que les côtés de la correction
		const traits = await fig(page).evaluate((root) => {
			const largeur = (id: string): number =>
				parseFloat(getComputedStyle(root.querySelector(`[data-testid="${id}"]`)!).strokeWidth);
			return { fin: largeur('bon-triangle-perpendiculaire'), cote: largeur('bon-segment') };
		});
		expect(traits.fin, 'perpendiculaire plus fine que les côtés').toBeLessThan(traits.cote);
		await shootThemes(page, fig(page).first(), '2473-correction');
	});

	test('#2473 — quadrillage : palette réduite au Segment ; C à 4 carreaux de A, côtés de nœud en nœud → juste', async ({
		page
	}) => {
		await openPreview(
			page,
			'2473 quad juste',
			`Construis le triangle $ABC$ rectangle en $A$ tel que $AC = 4$ carreaux.\n\n${TR_QUAD_BLOCK}`
		);
		const zone = await figureZone(page);
		// Ni équerre ni report : le segment seul
		await expect(fig(page).getByTestId('outil-equerre')).toHaveCount(0);
		await expect(fig(page).getByTestId('outil-report')).toHaveCount(0);
		await tapFigure(zone, TR_QUAD_WIN, 2.1, 2.1);
		await tapFigure(zone, TR_QUAD_WIN, 2.1, 6.1);
		await tapFigure(zone, TR_QUAD_WIN, 8.1, 2.1);
		await tapFigure(zone, TR_QUAD_WIN, 1.9, 5.9);
		await compte(page, 'segment-eleve', 2);
		await validate(page);
		await estJuste(page);
	});

	test('#2473 — quadrillage : C à 5 carreaux → « Ton côté [AC] mesure 5 carreaux au lieu de 4. » ; carré codé en A, pas de perpendiculaire', async ({
		page
	}) => {
		await openPreview(
			page,
			'2473 quad cinq',
			`Construis le triangle $ABC$ rectangle en $A$ tel que $AC = 4$ carreaux.\n\n${TR_QUAD_BLOCK}`
		);
		const zone = await figureZone(page);
		await tapFigure(zone, TR_QUAD_WIN, 2.1, 2.1);
		await tapFigure(zone, TR_QUAD_WIN, 2.1, 7.1);
		await tapFigure(zone, TR_QUAD_WIN, 8.1, 2.1);
		await tapFigure(zone, TR_QUAD_WIN, 1.9, 6.9);
		await compte(page, 'segment-eleve', 2);
		await validate(page);
		await dit(page, 'Ton côté [AC] mesure 5 carreaux au lieu de 4.');
		await compte(page, 'bon-triangle-angle-droit', 1);
		await compte(page, 'bon-triangle-perpendiculaire', 0);
	});
});

// ============================================================================
// #2463 — Cercle de centre donné (quadrillage, rayon donné par un segment)
// ============================================================================

const CQ_BLOCK = exemple('Tracer un cercle de centre donné, sur quadrillage');
const CQ_WIN = fenetreDe(CQ_BLOCK);
const CQ_O = pointDe(CQ_BLOCK, 'O');
const CQ_A = pointDe(CQ_BLOCK, 'A');
const CR_BLOCK = exemple('Tracer un cercle de rayon donné par un segment');
const CR_WIN = fenetreDe(CR_BLOCK);
const CR_O = pointDe(CR_BLOCK, 'O');
const CR_D = pointDe(CR_BLOCK, 'D');
const CR_E = pointDe(CR_BLOCK, 'E');

/** Le trait du cercle de la correction est en pointillés */
async function cercleCorrigeEnPointilles(page: Page): Promise<void> {
	await expect(fig(page).locator('.bon-cercle-trait')).toHaveCount(1);
	const trait = await fig(page)
		.locator('.bon-cercle-trait')
		.evaluateAll((els) => els.map((el) => getComputedStyle(el).strokeDasharray));
	expect(trait.length, 'le cercle de la correction').toBe(1);
	expect(trait[0], `cercle en pointillés : ${trait}`).not.toMatch(/^(none|)$/);
}

test.describe('#2463 — cercle de centre donné', () => {
	test('#2463 — quadrillage : aucun bouton d’outil (compas seul) ; compas piqué en O, ouvert jusqu’à A → juste', async ({
		page
	}) => {
		await openPreview(
			page,
			'2463 quad juste',
			`Trace le cercle de centre $O$ qui passe par $A$.\n\n${CQ_BLOCK}`
		);
		const zone = await figureZone(page);
		await expect(fig(page).locator('[data-testid^="outil-"]')).toHaveCount(0);
		await toucheA(zone, CQ_WIN, CQ_O);
		await toucheA(zone, CQ_WIN, CQ_A);
		await compte(page, 'cercle-eleve', 1);
		await validate(page);
		await estJuste(page);
	});

	test('#2463 — quadrillage : ouvert jusqu’à (7 ; 4) → « Ton cercle a le bon centre mais ne passe pas par A. » ; correction en pointillés', async ({
		page
	}) => {
		await openPreview(
			page,
			'2463 quad faux',
			`Trace le cercle de centre $O$ qui passe par $A$.\n\n${CQ_BLOCK}`
		);
		const zone = await figureZone(page);
		await toucheA(zone, CQ_WIN, CQ_O);
		await toucheA(zone, CQ_WIN, { x: 7, y: 4 });
		await compte(page, 'cercle-eleve', 1);
		await validate(page);
		await dit(page, 'Ton cercle a le bon centre mais ne passe pas par A.');
		await cercleCorrigeEnPointilles(page);
		await shootThemes(page, fig(page).first(), '2463-quad-correction');
	});

	test('#2463 — papier uni, rayon : Report de [DE] piqué en O → juste', async ({ page }) => {
		await openPreview(
			page,
			'2463 rayon juste',
			`Trace le cercle de centre $O$ dont le rayon est la longueur $DE$.\n\n${CR_BLOCK}`
		);
		const zone = await figureZone(page);
		expect(await palette(page)).toEqual(['compas=Compas', 'report=Report']);
		await outil(page, 'report');
		await toucheA(zone, CR_WIN, CR_D);
		await toucheA(zone, CR_WIN, CR_E);
		await compte(page, 'ecartement', 1);
		await toucheA(zone, CR_WIN, CR_O);
		await compte(page, 'report-eleve', 1);
		await validate(page);
		await estJuste(page);
	});

	test('#2463 — papier uni : compas ouvert à l’œil au rayon de [DE] (à un pixel près) → « Ton cercle a le bon centre mais pas le bon rayon : reporte la longueur DE. » ; le message « ouvert à l’œil » exige un rayon exact à 1e-9 près (inatteignable au toucher)', async ({
		page
	}) => {
		await openPreview(
			page,
			'2463 rayon oeil',
			`Trace le cercle de centre $O$ dont le rayon est la longueur $DE$.\n\n${CR_BLOCK}`
		);
		const zone = await figureZone(page);
		await outil(page, 'compas');
		const longueur = Math.hypot(CR_E.x - CR_D.x, CR_E.y - CR_D.y);
		await toucheA(zone, CR_WIN, CR_O);
		// Le bon rayon, pris à l'œil sur un endroit vide de la feuille (à droite de O, même ordonnée)
		await tapFigure(zone, CR_WIN, CR_O.x + longueur, CR_O.y + 0.03);
		await compte(page, 'cercle-eleve', 1);
		await validate(page);
		await dit(page, 'Ton cercle a le bon centre mais pas le bon rayon : reporte la longueur DE.');
	});

	test('#2463 — papier uni : une autre longueur reportée en O → « Ton cercle a le bon centre mais pas le bon rayon : reporte la longueur DE. »', async ({
		page
	}) => {
		await openPreview(
			page,
			'2463 rayon faux',
			`Trace le cercle de centre $O$ dont le rayon est la longueur $DE$.\n\n${CR_BLOCK}`
		);
		const zone = await figureZone(page);
		await outil(page, 'report');
		// Un écartement D → (9 ; 2), de 3,2 au lieu de 2
		await toucheA(zone, CR_WIN, CR_D);
		await tapFigure(zone, CR_WIN, 9, 2);
		await compte(page, 'ecartement', 1);
		await toucheA(zone, CR_WIN, CR_O);
		await compte(page, 'report-eleve', 1);
		await validate(page);
		await dit(page, 'Ton cercle a le bon centre mais pas le bon rayon : reporte la longueur DE.');
		await cercleCorrigeEnPointilles(page);
	});
});

// ============================================================================
// #2439 — Bissectrice construite ; #2430 — médiatrice au Report
// ============================================================================

const BISS_BLOCK = exemple('Construire la bissectrice d’un angle');
const BISS_WIN = fenetreDe(BISS_BLOCK);
const BISS_O = pointDe(BISS_BLOCK, 'O');
const BISS_A = pointDe(BISS_BLOCK, 'A');
const BISS_B = pointDe(BISS_BLOCK, 'B');
const BISS_STATEMENT = `Construis la bissectrice de l’angle $\\widehat{AOB}$.\n\n${BISS_BLOCK}`;

const unitaire = (de: Pt, vers: Pt): Pt => {
	const d = Math.hypot(vers.x - de.x, vers.y - de.y);
	return { x: (vers.x - de.x) / d, y: (vers.y - de.y) / d };
};

/** Arc de rayon 3 en O, ses points A' et B' sur [OA) et [OB), et le croisement des arcs de rayon A'B' */
const BISS_R = 3;
const BISS_A1: Pt = (() => {
	const u = unitaire(BISS_O, BISS_A);
	return { x: BISS_O.x + BISS_R * u.x, y: BISS_O.y + BISS_R * u.y };
})();
const BISS_B1: Pt = (() => {
	const u = unitaire(BISS_O, BISS_B);
	return { x: BISS_O.x + BISS_R * u.x, y: BISS_O.y + BISS_R * u.y };
})();
const BISS_P: Pt = (() => {
	const m = { x: (BISS_A1.x + BISS_B1.x) / 2, y: (BISS_A1.y + BISS_B1.y) / 2 };
	const d = Math.hypot(BISS_B1.x - BISS_A1.x, BISS_B1.y - BISS_A1.y);
	const u = unitaire(BISS_O, m);
	const h = (d * Math.sqrt(3)) / 2;
	return { x: m.x + h * u.x, y: m.y + h * u.y };
})();

test.describe('#2439 — bissectrice construite', () => {
	test('#2439 — compas piqué en O ouvert à l’œil, compas de A’ par B’ et de B’ par A’, règle de O au croisement → juste', async ({
		page
	}) => {
		await openPreview(page, '2439 compas', BISS_STATEMENT);
		const zone = await figureZone(page);
		await outil(page, 'compas');
		// L'arc en O, ouvert à l'œil : un toucher sur la feuille, à 3 de O vers la droite
		await toucheA(zone, BISS_WIN, BISS_O);
		await tapFigure(zone, BISS_WIN, BISS_O.x + BISS_R, BISS_O.y - 0.9);
		await compte(page, 'cercle-eleve', 1);
		// A' et B' : les croisements de l'arc et des côtés (le toucher s'y aimante)
		await tapFigure(zone, BISS_WIN, BISS_A1.x, BISS_A1.y);
		await tapFigure(zone, BISS_WIN, BISS_B1.x, BISS_B1.y);
		await tapFigure(zone, BISS_WIN, BISS_B1.x, BISS_B1.y);
		await tapFigure(zone, BISS_WIN, BISS_A1.x, BISS_A1.y);
		await compte(page, 'cercle-eleve', 3);
		await outil(page, 'droite');
		await toucheA(zone, BISS_WIN, BISS_O);
		await tapFigure(zone, BISS_WIN, BISS_P.x, BISS_P.y + 0.04);
		await compte(page, 'droite-eleve', 1);
		await validate(page);
		await estJuste(page);
	});

	test('#2439 — droite de O tracée à l’œil → « Ta bissectrice est tracée à l’œil… » ; correction : bissectrice en pointillés, deux demi-angles codés, l’arc en O et deux arcs en traits fins', async ({
		page
	}) => {
		await openPreview(page, '2439 oeil', BISS_STATEMENT);
		const zone = await figureZone(page);
		await outil(page, 'droite');
		await toucheA(zone, BISS_WIN, BISS_O);
		await tapFigure(zone, BISS_WIN, BISS_P.x + 0.4, BISS_P.y - 0.3);
		await compte(page, 'droite-eleve', 1);
		await validate(page);
		await dit(page, 'Ta bissectrice est tracée à l’œil');
		await enPointilles(page, 'bonne-droite', 1);
		await compte(page, 'bonne-bissectrice-demi-angle', 2);
		await compte(page, 'bonne-bissectrice-arc', 3);
		// Les arcs de la construction sont tracés plus légers que la bissectrice (pointillés serrés, atténués)
		const traits = await fig(page).evaluate((root) => {
			const style = (id: string) => getComputedStyle(root.querySelector(`[data-testid="${id}"]`)!);
			const arc = style('bonne-bissectrice-arc');
			const droite = style('bonne-droite');
			return {
				arcLargeur: parseFloat(arc.strokeWidth),
				droiteLargeur: parseFloat(droite.strokeWidth),
				arcOpacite: parseFloat(arc.opacity)
			};
		});
		expect(traits.arcOpacite, 'arcs atténués').toBeLessThan(1);
		// ÉCART : la ligne dit « arcs en traits fins », le style déclare `.bon-triangle-arc { stroke-width: 1 }`
		// mais `.bon-point circle { stroke-width: 2.5 }` (groupe « bonne-bissectrice ») l'emporte : les arcs
		// sont aussi épais (2,5) que la bissectrice
		test.fail();
		expect(
			traits.arcLargeur,
			`arcs en traits fins (${traits.arcLargeur} contre ${traits.droiteLargeur} pour la bissectrice)`
		).toBeLessThan(traits.droiteLargeur);
		// Lisibles, pas envahissants : à juger à l'œil (voir la capture)
		await shootThemes(page, fig(page).first(), '2439-correction');
	});

	test('#2439 — outils: droite, compas, rapporteur : rapporteur sur [OA), repère à la moitié de la mesure, règle de O au repère → juste (à 1° près)', async ({
		page
	}) => {
		const block = BISS_BLOCK.replace(
			'verifier: droite d = bissectrice(A, O, B)',
			'outils: droite, compas, rapporteur\nverifier: droite d = bissectrice(A, O, B)'
		);
		await openPreview(
			page,
			'2439 rapporteur',
			`Construis la bissectrice de l’angle $\\widehat{AOB}$.\n\n${block}`
		);
		const zone = await figureZone(page);
		expect(await palette(page)).toEqual(['droite=Règle', 'compas=Compas', 'rapporteur=Rapporteur']);
		const angleA = Math.atan2(BISS_A.y - BISS_O.y, BISS_A.x - BISS_O.x);
		const angleB = Math.atan2(BISS_B.y - BISS_O.y, BISS_B.x - BISS_O.x);
		const mesure = ((angleB - angleA) * 180) / Math.PI;
		const moitie = Math.round(mesure / 2);
		await outil(page, 'rapporteur');
		await toucheA(zone, BISS_WIN, BISS_O);
		await tapFigure(zone, BISS_WIN, BISS_A.x, BISS_A.y);
		await expect(page.getByTestId('rapporteur')).toHaveCount(1);
		// Repère à `moitie` degrés : toucher au bord, puis ‹ › jusqu'à la graduation
		const rayon = 0.35 * Math.min(BISS_WIN.xMax - BISS_WIN.xMin, BISS_WIN.yMax - BISS_WIN.yMin);
		const angle = angleA + (moitie * Math.PI) / 180;
		const repere: Pt = {
			x: BISS_O.x + rayon * Math.cos(angle),
			y: BISS_O.y + rayon * Math.sin(angle)
		};
		await tapFigure(zone, BISS_WIN, repere.x, repere.y);
		const curseur = page.getByTestId('rapporteur');
		for (let essai = 0; essai < 40; essai++) {
			const valeur = Number(await curseur.getAttribute('aria-valuenow'));
			if (valeur === moitie) break;
			await press(page.getByTestId(valeur < moitie ? 'rapporteur-plus' : 'rapporteur-moins'));
		}
		expect(Number(await curseur.getAttribute('aria-valuenow'))).toBe(moitie);
		await outil(page, 'droite');
		await toucheA(zone, BISS_WIN, BISS_O);
		await tapFigure(zone, BISS_WIN, repere.x, repere.y);
		await compte(page, 'droite-eleve', 1);
		await validate(page);
		await estJuste(page);
	});
});

const MED_WIN: Win = { xMin: 0, xMax: 12, yMin: 0, yMax: 8 };
const MED_A: Pt = { x: 3, y: 3 };
const MED_B: Pt = { x: 9, y: 5 };
const MED_BLOCK = exemple('Construire la médiatrice d’un segment')
	.replace('fenetre: 0 ; 10 ; 0 ; 8', 'fenetre: 0 ; 12 ; 0 ; 8')
	.replace('A = point(3, 4)', 'A = point(3, 3)')
	.replace('B = point(6, 5)', 'B = point(9, 5)');

test.describe('#2430 — médiatrice au Report', () => {
	test('#2430 — A(3 ; 3), B(9 ; 5) : un écartement pris au Report, piqué en A et en B, la règle par les deux croisements → juste', async ({
		page
	}) => {
		await openPreview(page, '2430 report', `Construis la médiatrice de $[AB]$.\n\n${MED_BLOCK}`);
		const zone = await figureZone(page);
		await outil(page, 'report');
		// Écartement de 4, pris sur la feuille ; piqué en A puis en B (les cercles de rayon 4 se coupent)
		await tapFigure(zone, MED_WIN, 1, 1);
		await tapFigure(zone, MED_WIN, 5, 1);
		await tapFigure(zone, MED_WIN, MED_A.x, MED_A.y + 0.05);
		await tapFigure(zone, MED_WIN, MED_B.x, MED_B.y + 0.05);
		await compte(page, 'report-eleve', 2);
		// Les croisements : milieu (6 ; 4) ± h × la perpendiculaire à [AB]
		const longueur = Math.hypot(MED_B.x - MED_A.x, MED_B.y - MED_A.y);
		const h = Math.sqrt(16 - (longueur / 2) ** 2);
		const perp: Pt = {
			x: -(MED_B.y - MED_A.y) / longueur,
			y: (MED_B.x - MED_A.x) / longueur
		};
		await outil(page, 'droite');
		await tapFigure(zone, MED_WIN, 6 + h * perp.x, 4 + h * perp.y);
		await tapFigure(zone, MED_WIN, 6 - h * perp.x, 4 - h * perp.y);
		await compte(page, 'droite-eleve', 1);
		await validate(page);
		await estJuste(page);
	});
});

// ============================================================================
// #2467 — Somme de vecteurs à tracer (fiche du bloc courbe)
// ============================================================================

const COURBE = { pad: 26, width: 400, height: 300 };
const VEC_BLOCK = (() => {
	const found = courbeEntry.examples.find(
		(example) => example.title === 'Tracer la somme de deux vecteurs (question)'
	);
	if (!found) throw new Error('exemple « somme de deux vecteurs » introuvable');
	return found.source;
})();
const VEC_WIN: Win = { xMin: -6, xMax: 6, yMin: -6, yMax: 6 };

/** Le repère à toucher (`role="slider"`), amené à l'écran */
async function courbeZone(page: Page): Promise<{ zone: Locator; svg: Locator }> {
	const zone = page.getByRole('slider').first();
	await expect(zone).toBeVisible({ timeout: 30_000 });
	const svg = zone.locator('svg').first();
	await svg.scrollIntoViewIfNeeded();
	return { zone, svg };
}

async function tapCourbe(svg: Locator, win: Win, x: number, y: number): Promise<void> {
	const box = await svg.boundingBox();
	if (!box) throw new Error('repère sans boîte');
	const viewBoxWidth = await svg.evaluate(
		(el) => (el as unknown as SVGSVGElement).viewBox.baseVal.width
	);
	const scale = box.width / viewBoxWidth;
	const position: Spot = {
		x: scale * (COURBE.pad + ((x - win.xMin) / (win.xMax - win.xMin)) * COURBE.width),
		y: scale * (COURBE.pad + ((win.yMax - y) / (win.yMax - win.yMin)) * COURBE.height)
	};
	if (isTouch()) await svg.tap({ position });
	else await svg.click({ position });
}

/** La phrase nommée de la remarque : « Ta flèche représente … seul, pas … » ou « … − …, pas … + … » */
async function phraseFleche(page: Page): Promise<string> {
	const phrase = page.locator('p', { hasText: 'Ta flèche représente' }).first();
	await expect(phrase).toBeVisible();
	return ((await phrase.textContent()) ?? '').replace(/\s+/g, ' ');
}

/** La correction : le parallélogramme en pointillés verts (deux côtés) et la flèche juste */
async function parallelogrammeVert(page: Page): Promise<void> {
	const correction = page.locator('.placer-correction').first();
	await expect(correction).toBeVisible();
	const traits = correction.locator('.courbe-trace.pointille');
	await expect(traits).toHaveCount(2);
	const couleurs = await traits.evaluateAll((els) =>
		els.map((el) => {
			const [r, g, b] = (getComputedStyle(el).stroke.match(/[\d.]+/g) ?? []).map(Number);
			return { r, g, b, tirets: getComputedStyle(el).strokeDasharray };
		})
	);
	for (const c of couleurs) {
		expect(c.tirets, 'pointillés').not.toMatch(/^(none|)$/);
		expect(c.g, `trait vert (${JSON.stringify(c)})`).toBeGreaterThan(c.r);
		expect(c.g, `trait vert (${JSON.stringify(c)})`).toBeGreaterThan(c.b);
	}
	await expect(correction.locator('.courbe-fleche:not(.courbe-vecteur-donne)')).toHaveCount(1);
}

test.describe('#2467 — somme de vecteurs à tracer', () => {
	test('#2467 — flèches u et v nommées dans la question ; tracer u seul → « Ta flèche représente u⃗ seul, pas u⃗ + v⃗ » et parallélogramme en pointillés verts', async ({
		page
	}) => {
		await openPreview(
			page,
			'2467 seul',
			`Trace la somme de $\\vec u$ et $\\vec v$.\n\n${VEC_BLOCK}`
		);
		const { svg, zone } = await courbeZone(page);
		await expect(zone.locator('.courbe-vecteur-donne')).toHaveCount(2);
		const noms = await zone.locator('.courbe-vecteur-nom').allTextContents();
		expect(noms).toEqual(['u', 'v']);
		// u seul : de A(−2 ; −1) à B(1 ; 0)
		await tapCourbe(svg, VEC_WIN, 1, 0);
		await validate(page);
		const phrase = await phraseFleche(page);
		expect(phrase).toMatch(/^Ta flèche représente\s+\S.*seul, pas\s+\S/);
		await parallelogrammeVert(page);
		await shootThemes(page, page.locator('.placer-correction').first(), '2467-correction');
	});

	test('#2467 — la somme juste D(2 ; 3) : vert, et la correction est le parallélogramme', async ({
		page
	}) => {
		await openPreview(
			page,
			'2467 juste',
			`Trace la somme de $\\vec u$ et $\\vec v$.\n\n${VEC_BLOCK}`
		);
		const { svg, zone } = await courbeZone(page);
		await tapCourbe(svg, VEC_WIN, 2, 3);
		await validate(page);
		await expect(zone).toHaveClass(/placer-juste/);
	});
});

// ============================================================================
// Modèles de la base locale (lot 12b du CE2 : #2475, #2477 ; somme de vecteurs : #2472)
// ============================================================================

interface ModeleBase {
	id: string;
	template: QuestionTemplate;
}

/** Le modèle publié de la base locale dont l'identifiant commence par `debut` ; absent : null */
async function modeleDeLaBase(debut: string): Promise<ModeleBase | null> {
	const rows = await sql<Record<string, unknown>>(
		`select * from question_templates where id::text like $1`,
		[`${debut}%`]
	);
	if (rows.length === 0) return null;
	const row = rows[0];
	return { id: String(row.id), template: row as unknown as QuestionTemplate };
}

/** La première graine (de 1 à 400) dont l'instance satisfait `convient` */
function graine(
	modele: ModeleBase,
	convient: (instance: QuestionInstance) => boolean
): { seed: number; instance: QuestionInstance } {
	for (let seed = 1; seed <= 400; seed++) {
		const result = generateInstance(modele.template, seed);
		if (result.success && convient(result.instance)) return { seed, instance: result.instance };
	}
	throw new Error(`aucune graine ne convient pour le modèle ${modele.id}`);
}

/** Ouvre l'aperçu admin du modèle publié, avec la graine voulue (même graine = même instance) */
async function ouvrirModele(
	page: Page,
	modele: ModeleBase,
	seed: number,
	dejaConnecte = false
): Promise<void> {
	if (!dejaConnecte) await login(page, ADMIN.email, ADMIN.password);
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			await page.goto(`/dashboard/admin/questions/${modele.id}/preview`);
			break;
		} catch (error) {
			if (!String(error).includes('ERR_ABORTED') || attempt === 2) throw error;
			await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
		}
	}
	await page.waitForLoadState('networkidle');
	// Une navigation tardive (hydratation) peut effacer la saisie : on rejoue jusqu'à voir la graine
	await expect(async () => {
		await page.locator('#seed').fill(String(seed));
		await page.getByRole('button', { name: 'Générer', exact: true }).click();
		await expect(page.locator('dt', { hasText: 'Seed' }).locator('+ dd')).toHaveText(String(seed), {
			timeout: 4000
		});
	}).toPass({ timeout: 40_000 });
	await page.waitForLoadState('networkidle');
}

const variable = (instance: QuestionInstance, name: string): number =>
	Number(instance.resolvedVariables?.find((v) => v.name === name)?.value);

/** Le bloc `figure-a-completer` de l'instance (énoncé résolu) */
const blocDe = (instance: QuestionInstance): string => {
	const m = instance.statement.match(/```figure-a-completer[\s\S]*?```/);
	if (!m) throw new Error('pas de bloc figure-a-completer dans l’énoncé');
	return m[0];
};

const dansLaFenetre = (p: Pt, win: Win): boolean =>
	p.x >= win.xMin + 0.1 && p.x <= win.xMax - 0.1 && p.y >= win.yMin + 0.1 && p.y <= win.yMax - 0.1;

/** Les deux perpendiculaires à [AB] en A, de longueur `longueur` : le bout qui tient dans la fenêtre */
function sommetPerpendiculaire(a: Pt, b: Pt, longueur: number, win: Win): Pt {
	const u = unitaire(a, b);
	const candidats: Pt[] = [
		{ x: a.x - longueur * u.y, y: a.y + longueur * u.x },
		{ x: a.x + longueur * u.y, y: a.y - longueur * u.x }
	];
	const bon = candidats.find((c) => dansLaFenetre(c, win));
	if (!bon) throw new Error('aucun sommet C dans la fenêtre');
	return bon;
}

test.describe('#2475, #2477 — lot 12b du CE2, modèles joués en aperçu admin', () => {
	test('#2475 — 1c0ba52e (cercle de centre donné, quadrillage) : compas piqué en O ouvert jusqu’à A → juste', async ({
		page
	}) => {
		const modele = await modeleDeLaBase('1c0ba52e');
		expect(modele, 'modèle 1c0ba52e absent de la base locale').not.toBeNull();
		const { seed, instance } = graine(modele!, (i) => blocDe(i).includes('grille: 1'));
		const bloc = blocDe(instance);
		const win = fenetreDe(bloc);
		await ouvrirModele(page, modele!, seed);
		const zone = await figureZone(page);
		await toucheA(zone, win, pointDe(bloc, 'O'));
		await toucheA(zone, win, pointDe(bloc, 'A'));
		await compte(page, 'cercle-eleve', 1);
		await validate(page);
		await estJuste(page);
	});

	test('#2475 — 1c0ba52e (papier uni, A hors nœud) : compas piqué en O ouvert jusqu’à A → juste', async ({
		page
	}) => {
		const modele = await modeleDeLaBase('1c0ba52e');
		expect(modele, 'modèle 1c0ba52e absent de la base locale').not.toBeNull();
		const { seed, instance } = graine(modele!, (i) => !blocDe(i).includes('grille'));
		const bloc = blocDe(instance);
		const win = fenetreDe(bloc);
		await ouvrirModele(page, modele!, seed);
		const zone = await figureZone(page);
		await toucheA(zone, win, pointDe(bloc, 'O'));
		await toucheA(zone, win, pointDe(bloc, 'A'));
		await compte(page, 'cercle-eleve', 1);
		await validate(page);
		await estJuste(page);
	});

	test('#2475 — d0f7d7a8 (cercle de centre donné sur quadrillage) : compas piqué en O ouvert jusqu’à A → juste', async ({
		page
	}) => {
		const modele = await modeleDeLaBase('d0f7d7a8');
		expect(modele, 'modèle d0f7d7a8 absent de la base locale').not.toBeNull();
		const { seed, instance } = graine(modele!, () => true);
		const bloc = blocDe(instance);
		const win = fenetreDe(bloc);
		await ouvrirModele(page, modele!, seed);
		const zone = await figureZone(page);
		await toucheA(zone, win, pointDe(bloc, 'O'));
		await toucheA(zone, win, pointDe(bloc, 'A'));
		await compte(page, 'cercle-eleve', 1);
		await validate(page);
		await estJuste(page);
	});

	test('#2475 — d73d429b (rayon donné par un segment) : Report de [MN] piqué en O → juste', async ({
		page
	}) => {
		const modele = await modeleDeLaBase('d73d429b');
		expect(modele, 'modèle d73d429b absent de la base locale').not.toBeNull();
		const { seed, instance } = graine(modele!, () => true);
		const bloc = blocDe(instance);
		const win = fenetreDe(bloc);
		await ouvrirModele(page, modele!, seed);
		const zone = await figureZone(page);
		await outil(page, 'report');
		await toucheA(zone, win, pointDe(bloc, 'M'));
		await toucheA(zone, win, pointDe(bloc, 'N'));
		await compte(page, 'ecartement', 1);
		await toucheA(zone, win, pointDe(bloc, 'O'));
		await compte(page, 'report-eleve', 1);
		await validate(page);
		await estJuste(page);
	});

	for (const [debut, variation, titre] of [
		['e50d512d', 0, 'e50d512d (AC en carreaux, B sur une ligne du quadrillage)'],
		['b8fb32a4', 0, 'b8fb32a4 variation 1 (AC en carreaux)'],
		['b8fb32a4', 1, 'b8fb32a4 variation 2 (AC = AB, [AB] en oblique)']
	] as const) {
		test(`#2475 — ${titre} : C au bon nœud, [AC] et [BC] suivant le quadrillage → juste`, async ({
			page
		}) => {
			const modele = await modeleDeLaBase(debut);
			expect(modele, `modèle ${debut} absent de la base locale`).not.toBeNull();
			// Pour la variation 2 : un [AB] oblique (ni horizontal ni vertical)
			const { seed, instance } = graine(modele!, (i) => {
				if ((i.selectedVariationIndex ?? 0) !== variation) return false;
				if (variation === 0) return true;
				const bloc = blocDe(i);
				const a = pointDe(bloc, 'A');
				const b = pointDe(bloc, 'B');
				return a.x !== b.x && a.y !== b.y;
			});
			const bloc = blocDe(instance);
			const win = fenetreDe(bloc);
			const a = pointDe(bloc, 'A');
			const b = pointDe(bloc, 'B');
			const carreaux = /mesure (\d+) carreaux/.exec(instance.statement);
			const longueur = variation === 0 ? Number(carreaux?.[1]) : Math.hypot(b.x - a.x, b.y - a.y);
			const c = sommetPerpendiculaire(a, b, longueur, win);
			await ouvrirModele(page, modele!, seed);
			const zone = await figureZone(page);
			await toucheA(zone, win, a);
			await toucheA(zone, win, c);
			await toucheA(zone, win, b);
			await toucheA(zone, win, c);
			await compte(page, 'segment-eleve', 2);
			await validate(page);
			await estJuste(page);
		});
	}

	for (const [titre, oblique] of [
		['[AB] sur une ligne du quadrillage', false],
		['[AB] en oblique', true]
	] as const) {
		test(`#2475 — f4b94b4f (triangle rectangle à l’équerre et au compas), ${titre} : équerre en A, report de [MN] piqué en A, côtés → juste`, async ({
			page
		}) => {
			const modele = await modeleDeLaBase('f4b94b4f');
			expect(modele, 'modèle f4b94b4f absent de la base locale').not.toBeNull();
			const { seed, instance } = graine(modele!, (i) => {
				const bloc = blocDe(i);
				const a = pointDe(bloc, 'A');
				const b = pointDe(bloc, 'B');
				const estOblique = a.x !== b.x && a.y !== b.y;
				if (estOblique !== oblique) return false;
				const m = pointDe(bloc, 'M');
				const n = pointDe(bloc, 'N');
				const longueur = Math.hypot(n.x - m.x, n.y - m.y);
				try {
					sommetPerpendiculaire(a, b, longueur, fenetreDe(bloc));
					return true;
				} catch {
					return false;
				}
			});
			const bloc = blocDe(instance);
			const win = fenetreDe(bloc);
			const a = pointDe(bloc, 'A');
			const b = pointDe(bloc, 'B');
			const m = pointDe(bloc, 'M');
			const n = pointDe(bloc, 'N');
			const c = sommetPerpendiculaire(a, b, Math.hypot(n.x - m.x, n.y - m.y), win);
			await ouvrirModele(page, modele!, seed);
			const zone = await figureZone(page);
			// Équerre le long de [AB] (touché en son milieu), puis en A
			await outil(page, 'equerre');
			await tapFigure(zone, win, (a.x + b.x) / 2, (a.y + b.y) / 2);
			await compte(page, 'droite-choisie', 1);
			await toucheA(zone, win, a);
			await compte(page, 'droite-eleve', 1);
			await outil(page, 'report');
			await toucheA(zone, win, m);
			await toucheA(zone, win, n);
			await compte(page, 'ecartement', 1);
			await toucheA(zone, win, a);
			await compte(page, 'report-eleve', 1);
			await outil(page, 'segment');
			await toucheA(zone, win, a);
			await tapFigure(zone, win, c.x, c.y);
			await toucheA(zone, win, b);
			await tapFigure(zone, win, c.x, c.y);
			await compte(page, 'segment-eleve', 2);
			await validate(page);
			await estJuste(page);
		});
	}
});

const NOMS_VECTEURS = ['xa', 'ya', 'a', 'b', 'c', 'd'] as const;

/** Les six variables du modèle : A(xa ; ya), u = (a ; b), v = (c ; d) */
function vecteursDe(instance: QuestionInstance): Record<(typeof NOMS_VECTEURS)[number], number> {
	return {
		xa: variable(instance, 'xa'),
		ya: variable(instance, 'ya'),
		a: variable(instance, 'a'),
		b: variable(instance, 'b'),
		c: variable(instance, 'c'),
		d: variable(instance, 'd')
	};
}

/** Les `n` premiers tirages (graine, instance) aux variables toutes différentes et dont u − v tient dans le repère */
function tiragesDistincts(
	modele: ModeleBase,
	n: number
): Array<{ seed: number; instance: QuestionInstance }> {
	const trouves: Array<{ seed: number; instance: QuestionInstance }> = [];
	const vus = new Set<string>();
	for (let seed = 1; seed <= 400 && trouves.length < n; seed++) {
		const result = generateInstance(modele.template, seed);
		if (!result.success) continue;
		const v = vecteursDe(result.instance);
		const cle = NOMS_VECTEURS.map((nom) => v[nom]).join(',');
		const tient = Math.abs(v.xa + v.a - v.c) <= 5 && Math.abs(v.ya + v.b - v.d) <= 5;
		if (tient && !vus.has(cle)) {
			vus.add(cle);
			trouves.push({ seed, instance: result.instance });
		}
	}
	if (trouves.length < n) throw new Error('pas assez de tirages distincts');
	return trouves;
}

test.describe('#2472 — somme de deux vecteurs (modèle 51192dc4, plusieurs tirages)', () => {
	for (const rang of [0, 1, 2]) {
		test(`#2472 — tirage ${rang + 1} : u⃗ − v⃗ → « Ta flèche représente u⃗ − v⃗, pas u⃗ + v⃗ » et parallélogramme en pointillés ; modèle sans étape « figure » à part`, async ({
			page
		}) => {
			const modele = await modeleDeLaBase('51192dc4');
			expect(modele, 'modèle 51192dc4 absent de la base locale').not.toBeNull();
			const { seed, instance } = tiragesDistincts(modele!, 3)[rang];
			const v = vecteursDe(instance);
			await ouvrirModele(page, modele!, seed);
			const { svg, zone } = await courbeZone(page);
			await expect(zone.locator('.courbe-vecteur-donne')).toHaveCount(2);
			// u − v : l'extrémité (xa + a − c ; ya + b − d)
			await tapCourbe(svg, VEC_WIN, v.xa + v.a - v.c, v.ya + v.b - v.d);
			await validate(page);
			const phrase = await phraseFleche(page);
			expect(phrase, 'phrase u − v').toMatch(/Ta flèche représente\s+\S.*[−-].*,\s*pas\s+\S.*\+/);
			await parallelogrammeVert(page);
			// Plus d'étape « figure » à part dans la correction du modèle
			const etapes = (modele!.template.variations[0].correction?.steps ?? []) as string[];
			expect(etapes.length, 'étapes de correction').toBeGreaterThan(0);
			expect(
				etapes.some((e) => e.includes('```')),
				'une étape porte un bloc figure'
			).toBe(false);
		});
	}

	test('#2472 — u⃗ seul → « … seul … »', async ({ page }) => {
		const modele = await modeleDeLaBase('51192dc4');
		expect(modele, 'modèle 51192dc4 absent de la base locale').not.toBeNull();
		const { seed, instance } = tiragesDistincts(modele!, 1)[0];
		const v = vecteursDe(instance);
		await ouvrirModele(page, modele!, seed);
		const { svg } = await courbeZone(page);
		await tapCourbe(svg, VEC_WIN, v.xa + v.a, v.ya + v.b);
		await validate(page);
		expect(await phraseFleche(page)).toMatch(/seul, pas/);
	});

	test('#2472 — la somme juste (extrémité de u⃗ + v⃗) → vert', async ({ page }) => {
		const modele = await modeleDeLaBase('51192dc4');
		expect(modele, 'modèle 51192dc4 absent de la base locale').not.toBeNull();
		const { seed, instance } = graine(modele!, (i) => {
			const v = vecteursDe(i);
			return Math.abs(v.xa + v.a + v.c) <= 5 && Math.abs(v.ya + v.b + v.d) <= 5;
		});
		const v = vecteursDe(instance);
		await ouvrirModele(page, modele!, seed);
		const { svg, zone } = await courbeZone(page);
		await tapCourbe(svg, VEC_WIN, v.xa + v.a + v.c, v.ya + v.b + v.d);
		await validate(page);
		await expect(zone).toHaveClass(/placer-juste/);
	});
});
