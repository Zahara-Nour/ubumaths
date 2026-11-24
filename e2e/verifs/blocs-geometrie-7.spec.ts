import { expect, test, type Locator, type Page } from '@playwright/test';
import { figureACompleterEntry } from '../../src/lib/block-catalog/figure-a-completer';
import { assertLocalServerEnv } from './helpers/carnet';
import { brouillons, isTouch, type Win } from './helpers/modele-brouillon';

/**
 * Blocs `figure-a-completer` à instruments (tri des vérifications manuelles, paquet 7)
 * ====================================================================================
 *
 * Reprend les lignes #2606 (mesurer un segment à la règle graduée) et #2658 (triangle
 * quelconque coté en cm) de `docs/wip/verifications-manuelles.md`. Décor et gestes :
 * `helpers/modele-brouillon.ts` (modèle brouillon « Verifs7 geo … » créé par l'API en admin,
 * joué dans l'aperçu admin, effacé en `afterEach`). Les blocs de départ sont les exemples du
 * catalogue (`src/lib/block-catalog/figure-a-completer.ts`), jamais recopiés.
 *
 * Ce que ces tests ne voient pas : la sensation du vrai doigt (viser une graduation sans voir sous
 * le doigt), la lisibilité fine des chiffres retournés. Captures : `.captures/verifs/blocs-geometrie-7/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());

// Constantes

const SHOTS = '.captures/verifs/blocs-geometrie-7';
const decor = brouillons('Verifs7 geo', SHOTS);
const { openPreview, figureZone, fig, tapFigure, validate, shootThemes } = decor;

// Types

interface Pt {
	x: number;
	y: number;
}

// Fonctions

function exemple(title: string): string {
	const found = figureACompleterEntry.examples.find((example) => example.title === title);
	if (!found) throw new Error(`exemple introuvable dans le catalogue : ${title}`);
	return found.source;
}

function fenetreDe(source: string): Win {
	const m = source.match(
		/fenetre:\s*(-?[\d.]+)\s*;\s*(-?[\d.]+)\s*;\s*(-?[\d.]+)\s*;\s*(-?[\d.]+)/
	);
	if (!m) throw new Error('pas de ligne fenetre:');
	return { xMin: Number(m[1]), xMax: Number(m[2]), yMin: Number(m[3]), yMax: Number(m[4]) };
}

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

async function dit(page: Page, texte: string): Promise<void> {
	await expect(page.locator('#contenu-principal')).toContainText(texte);
}

async function estJuste(page: Page): Promise<void> {
	await expect(fig(page).locator('p[role="status"]')).toContainText('réponse juste');
}

async function attendreMm(page: Page, mm: number): Promise<void> {
	await expect
		.poll(async () => fig(page).getByTestId('regle').first().getAttribute('aria-valuenow'))
		.toBe(String(mm));
}

/** Un toucher à `(x ; y)` décalé de 0,05 (viser « à côté » du point, comme un doigt) */
async function toucheA(zone: Locator, win: Win, p: Pt): Promise<void> {
	await tapFigure(zone, win, p.x + 0.05, p.y + 0.05);
}

// ============================================================================
// #2606 — Mesurer un segment à la règle graduée
// ============================================================================

const MES_BLOCK = exemple('Mesurer un segment (règle graduée)');
const MES_WIN = fenetreDe(MES_BLOCK);
const MES_A = pointDe(MES_BLOCK, 'A');
const MES_B = pointDe(MES_BLOCK, 'B');
const MES_STATEMENT = `Mesure le segment $[AB]$.\n\n${MES_BLOCK}`;

test.describe('#2606 — mesurer un segment à la règle graduée', () => {
	test('#2606 — la règle se pose (0 sur A, puis vers B) et se retourne, pas de ‹ › ; la case « Longueur du segment [AB] » prend 6 → juste', async ({
		page
	}) => {
		await openPreview(page, '2606 juste', MES_STATEMENT);
		const zone = await figureZone(page);
		// Une seule case, sous la figure ; aucun outil à choisir
		await expect(fig(page).locator('[data-testid^="outil-"]')).toHaveCount(0);
		await expect(fig(page).getByText('Longueur du segment [AB]')).toBeVisible();
		await toucheA(zone, MES_WIN, MES_A);
		await tapFigure(zone, MES_WIN, 9, MES_A.y);
		await expect(fig(page).getByTestId('regle')).toHaveCount(1);
		// Retourner change le bord de la règle ; ‹ › n'existent pas (on ne trace rien)
		await expect(fig(page).getByTestId('regle-retourner')).toHaveCount(1);
		await expect(fig(page).getByTestId('regle-moins')).toHaveCount(0);
		await expect(fig(page).getByTestId('regle-plus')).toHaveCount(0);
		const regle = fig(page).getByTestId('regle').first();
		const avant = await regle.getAttribute('data-sens');
		await press(fig(page).getByTestId('regle-retourner'));
		await expect(regle).not.toHaveAttribute('data-sens', avant ?? '');
		await press(fig(page).getByTestId('regle-retourner'));
		await expect(regle).toHaveAttribute('data-sens', avant ?? '');
		const input = fig(page).getByTestId('mesure-segment').first();
		await input.scrollIntoViewIfNeeded();
		await input.fill('6');
		await validate(page);
		await estJuste(page);

		await shootThemes(page, fig(page).first(), '2606-juste');
	});

	test('#2606 — règle posée le 0 avant A et 7 tapé → « Le 0 de la règle doit être sur A : le segment [AB] mesure 6 cm, pas 7 cm »', async ({
		page
	}) => {
		await openPreview(page, '2606 faux', MES_STATEMENT);
		const zone = await figureZone(page);
		// Le 0 à 1 cm avant A, la règle dirigée vers B : B se lit sur la graduation 7
		await tapFigure(zone, MES_WIN, MES_A.x - 1, MES_A.y);
		await tapFigure(zone, MES_WIN, 9, MES_A.y);
		await expect(fig(page).getByTestId('regle')).toHaveCount(1);
		const input = fig(page).getByTestId('mesure-segment').first();
		await input.fill('7');
		await validate(page);
		await dit(page, 'Le 0 de la règle doit être sur A');
		await dit(page, 'le segment [AB] mesure 6 cm, pas 7 cm');
		await shootThemes(page, fig(page).first(), '2606-zero-avant-a');
	});

	test('#2606 — règle posée en A et 5 tapé → « Le segment [AB] mesure 6 cm, pas 5 cm » ; correction : règle en A, « 6 cm » du côté opposé au corps de la règle, lisible', async ({
		page
	}) => {
		await openPreview(page, '2606 cinq', MES_STATEMENT);
		const zone = await figureZone(page);
		await toucheA(zone, MES_WIN, MES_A);
		await tapFigure(zone, MES_WIN, 9, MES_A.y);
		await expect(fig(page).getByTestId('regle')).toHaveCount(1);
		const input = fig(page).getByTestId('mesure-segment').first();
		await input.scrollIntoViewIfNeeded();
		await input.fill('5');
		await validate(page);
		await dit(page, 'Le segment [AB] mesure 6 cm, pas 5 cm');
		// Correction : la règle posée en A et « 6 cm » écrit du côté opposé au corps de la règle
		await expect(fig(page).getByTestId('bonne-regle')).toHaveCount(1);
		await expect(fig(page).getByTestId('bonne-longueur')).toHaveText('6 cm');
		const regleBox = await fig(page).getByTestId('bonne-regle').boundingBox();
		const texteBox = await fig(page).getByTestId('bonne-longueur').boundingBox();
		const svgBox = await fig(page).locator('svg').first().boundingBox();
		if (!regleBox || !texteBox || !svgBox) throw new Error('boîtes de la correction manquantes');
		// Le segment [AB] est à y = 3 sur une fenêtre de hauteur 6, tracée en `meet` : au milieu du dessin
		const ligne = svgBox.y + svgBox.height / 2;
		const regleCote = regleBox.y + regleBox.height / 2 - ligne;
		const texteCote = texteBox.y + texteBox.height / 2 - ligne;
		expect(
			regleCote * texteCote,
			`règle à ${regleCote.toFixed(0)} px de la ligne, texte à ${texteCote.toFixed(0)} px : côtés opposés`
		).toBeLessThan(0);
		// Lisible : le texte n'est pas minuscule (≥ 10 px de haut), même au téléphone
		expect(texteBox.height, 'hauteur du texte « 6 cm » en px').toBeGreaterThanOrEqual(10);
		await shootThemes(page, fig(page).first(), '2606-correction');
		expect(MES_B.x - MES_A.x, 'segment de 6 cm dans le bloc').toBe(6);
	});
});

// ============================================================================
// #2658 — Triangle quelconque coté en cm
// ============================================================================

const TRI_BLOCK = exemple(
	'Construire un triangle de trois longueurs en cm (compas et règle graduée)'
);
const TRI_WIN = fenetreDe(TRI_BLOCK);
const TRI_A = pointDe(TRI_BLOCK, 'A');
const TRI_B = pointDe(TRI_BLOCK, 'B');
const TRI_STATEMENT = `Construis le triangle $ABC$ tel que $AC = 4$ cm et $BC = 5$ cm.\n\n${TRI_BLOCK}`;

/** Les deux points d'intersection de deux cercles (centres c1, c2 ; rayons r1, r2) */
function croisement(c1: Pt, r1: number, c2: Pt, r2: number): [Pt, Pt] {
	const d = Math.hypot(c2.x - c1.x, c2.y - c1.y);
	const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
	const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
	const m = { x: c1.x + (a * (c2.x - c1.x)) / d, y: c1.y + (a * (c2.y - c1.y)) / d };
	const ux = (c2.x - c1.x) / d;
	const uy = (c2.y - c1.y) / d;
	return [
		{ x: m.x - h * uy, y: m.y + h * ux },
		{ x: m.x + h * uy, y: m.y - h * ux }
	];
}

/** Le sommet C du haut : AC = 4, BC = 5 */
const TRI_C = croisement(TRI_A, 4, TRI_B, 5).sort((p, q) => q.y - p.y)[0];

async function outil(page: Page, id: string): Promise<void> {
	const button = fig(page).getByTestId(`outil-${id}`);
	await press(button);
	await expect(button).toHaveAttribute('aria-pressed', 'true');
}

async function compte(page: Page, id: string, n: number): Promise<void> {
	await expect(fig(page).getByTestId(id)).toHaveCount(n);
}

const ANG_BLOCK = exemple('Construire un triangle par deux côtés en cm et l’angle compris');
const ANG_WIN = fenetreDe(ANG_BLOCK);
const ANG_A = pointDe(ANG_BLOCK, 'A');
const ANG_B = pointDe(ANG_BLOCK, 'B');
const ANG_STATEMENT = `Construis le triangle $ABC$ tel que $\\widehat{CAB} = 50°$ et $AC = 4$ cm.\n\n${ANG_BLOCK}`;
const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Rapporteur posé en A sur [AB], repère à 50° (toucher au bord, puis ‹ › jusqu'au degré) */
async function rapporteurA(page: Page, zone: Locator, deg: number): Promise<void> {
	await outil(page, 'rapporteur');
	await tapFigure(zone, ANG_WIN, ANG_A.x, ANG_A.y);
	await tapFigure(zone, ANG_WIN, ANG_B.x, ANG_B.y);
	await expect(page.getByTestId('rapporteur')).toHaveCount(1);
	const radius = 0.35 * Math.min(ANG_WIN.xMax - ANG_WIN.xMin, ANG_WIN.yMax - ANG_WIN.yMin);
	await tapFigure(
		zone,
		ANG_WIN,
		ANG_A.x + radius * Math.cos(rad(deg)),
		ANG_A.y + radius * Math.sin(rad(deg))
	);
	const slider = page.getByTestId('rapporteur');
	for (let step = 0; step < 40; step++) {
		const now = Number(await slider.getAttribute('aria-valuenow'));
		if (now === deg) return;
		await press(page.getByTestId(now < deg ? 'rapporteur-plus' : 'rapporteur-moins'));
	}
	expect(Number(await slider.getAttribute('aria-valuenow'))).toBe(deg);
}

/** Règle posée le 0 en `centre`, dirigée vers `vers` ; puis compas piqué en `centre`, ouvert près de `cm` */
async function arc(
	page: Page,
	zone: Locator,
	win: Win,
	centre: Pt,
	vers: Pt,
	cm: number,
	avecRegle = true
): Promise<void> {
	if (avecRegle) {
		await outil(page, 'regle');
		await toucheA(zone, win, centre);
		await tapFigure(zone, win, vers.x, vers.y);
		await compte(page, 'regle', 1);
	}
	await outil(page, 'compas');
	await toucheA(zone, win, centre);
	const dx = vers.x - centre.x;
	const dy = vers.y - centre.y;
	const norme = Math.hypot(dx, dy);
	// Visé un peu à côté de la graduation, perpendiculairement à la règle (le rayon reste à 4 cm)
	await tapFigure(
		zone,
		win,
		centre.x + (dx / norme) * cm - (dy / norme) * 0.12,
		centre.y + (dy / norme) * cm + (dx / norme) * 0.12
	);
}

/** [AC] puis [BC] jusqu'au croisement des deux arcs (le toucher s'aimante dessus) */
async function deuxCotes(page: Page, zone: Locator, c: Pt): Promise<void> {
	await outil(page, 'segment');
	await tapFigure(zone, TRI_WIN, TRI_A.x, TRI_A.y);
	await tapFigure(zone, TRI_WIN, c.x, c.y);
	await tapFigure(zone, TRI_WIN, TRI_B.x, TRI_B.y);
	await tapFigure(zone, TRI_WIN, c.x, c.y);
	await compte(page, 'segment-eleve', 2);
}

test.describe('#2658 — triangle de trois longueurs en cm (compas et règle graduée)', () => {
	test('#2658 — palette Segment · Compas · Règle graduée ; règle en A, compas ouvert sur 4 cm ; idem en B sur 5 cm ; C au croisement, [AC], [BC] → juste', async ({
		page
	}) => {
		await openPreview(page, '2658 juste', TRI_STATEMENT);
		const zone = await figureZone(page);
		const palette = await fig(page)
			.locator('[data-testid^="outil-"]')
			.evaluateAll((els) => els.map((el) => (el.textContent ?? '').trim()));
		expect(palette).toEqual(['Segment', 'Compas', 'Règle graduée']);
		await arc(page, zone, TRI_WIN, TRI_A, { x: TRI_A.x + 6, y: TRI_A.y }, 4);
		await attendreMm(page, 40);
		await compte(page, 'cercle-eleve', 1);
		await arc(page, zone, TRI_WIN, TRI_B, { x: TRI_B.x - 6, y: TRI_B.y }, 5);
		await attendreMm(page, 50);
		await compte(page, 'cercle-eleve', 2);
		await deuxCotes(page, zone, TRI_C);
		await validate(page);
		await estJuste(page);
		await shootThemes(page, fig(page).first(), '2658-trois-longueurs-juste');
	});

	test('#2658 — compas ouvert à l’œil (sans règle) → « Ton compas est ouvert à l’œil… » ; correction : règles posées en A et en B, arcs de 4 cm et 5 cm', async ({
		page
	}) => {
		await openPreview(page, '2658 oeil', TRI_STATEMENT);
		const zone = await figureZone(page);
		// En A : compas sans règle posée, ouvert « à peu près » sur 4 cm
		await arc(page, zone, TRI_WIN, TRI_A, { x: TRI_A.x + 6, y: TRI_A.y }, 4, false);
		await arc(page, zone, TRI_WIN, TRI_B, { x: TRI_B.x - 6, y: TRI_B.y }, 5);
		await deuxCotes(page, zone, TRI_C);
		await validate(page);
		await dit(page, 'Ton compas est ouvert à l’œil : ouvre-le sur une graduation de la règle');
		// La correction : les règles posées en A et en B, les arcs de 4 cm et de 5 cm
		await compte(page, 'bonne-regle', 2);
		await compte(page, 'bon-triangle-arc', 2);
		await compte(page, 'bon-segment', 2);
		await shootThemes(page, fig(page).first(), '2658-oeil-correction');
	});
});

/** Le point à `longueur` cm de A sur le côté d'angle de `deg`° */
const surLeCote = (deg: number, longueur: number): Pt => ({
	x: ANG_A.x + longueur * Math.cos(rad(deg)),
	y: ANG_A.y + longueur * Math.sin(rad(deg))
});

/** Rapporteur à `deg`°, règle posée en A vers le repère, côté d'angle long (6 cm) tracé le long de la règle */
async function coteLong(page: Page, zone: Locator, deg: number): Promise<void> {
	await rapporteurA(page, zone, deg);
	await outil(page, 'regle');
	await tapFigure(zone, ANG_WIN, ANG_A.x, ANG_A.y);
	const repere = surLeCote(deg, 3.15);
	await tapFigure(zone, ANG_WIN, repere.x, repere.y);
	await compte(page, 'regle', 1);
	await outil(page, 'segment');
	await tapFigure(zone, ANG_WIN, ANG_A.x, ANG_A.y);
	const bout = surLeCote(deg, 6);
	await tapFigure(zone, ANG_WIN, bout.x, bout.y);
	await compte(page, 'segment-eleve', 1);
}

test.describe('#2658 — triangle par deux côtés en cm et l’angle compris', () => {
	test('#2658 — palette Segment · Rapporteur · Règle graduée · Compas ; rapporteur 50° en A, règle le long du côté, côté long, [BC] arrêté sur la graduation 4 cm → juste', async ({
		page
	}) => {
		await openPreview(page, '2658 angle graduation', ANG_STATEMENT);
		const zone = await figureZone(page);
		const palette = await fig(page)
			.locator('[data-testid^="outil-"]')
			.evaluateAll((els) => els.map((el) => (el.textContent ?? '').trim()));
		expect(palette).toEqual(['Segment', 'Rapporteur', 'Règle graduée', 'Compas']);
		await coteLong(page, zone, 50);
		const c = surLeCote(50, 4);
		await tapFigure(zone, ANG_WIN, ANG_B.x, ANG_B.y);
		await tapFigure(zone, ANG_WIN, c.x, c.y);
		await compte(page, 'segment-eleve', 2);
		await validate(page);
		await estJuste(page);
		await shootThemes(page, fig(page).first(), '2658-angle-graduation-juste');
	});

	test('#2658 — même triangle, C à l’arc du compas ouvert à 4 cm sur la règle (croisement avec le côté d’angle) → juste', async ({
		page
	}) => {
		await openPreview(page, '2658 angle arc', ANG_STATEMENT);
		const zone = await figureZone(page);
		await rapporteurA(page, zone, 50);
		await arc(page, zone, ANG_WIN, ANG_A, surLeCote(50, 3.15), 4);
		await attendreMm(page, 40);
		await compte(page, 'cercle-eleve', 1);
		await outil(page, 'segment');
		await tapFigure(zone, ANG_WIN, ANG_A.x, ANG_A.y);
		const bout = surLeCote(50, 6);
		await tapFigure(zone, ANG_WIN, bout.x, bout.y);
		const c = surLeCote(50, 4);
		await tapFigure(zone, ANG_WIN, ANG_B.x, ANG_B.y);
		await tapFigure(zone, ANG_WIN, c.x, c.y);
		await compte(page, 'segment-eleve', 2);
		await validate(page);
		await estJuste(page);
		await shootThemes(page, fig(page).first(), '2658-angle-arc-juste');
	});

	test('#2658 — angle de 40° au lieu de 50° → « Ton angle CAB mesure 40° au lieu de 50°. » ; correction : règle posée en A le long du côté et angle codé', async ({
		page
	}) => {
		await openPreview(page, '2658 angle faux', ANG_STATEMENT);
		const zone = await figureZone(page);
		await coteLong(page, zone, 40);
		const c = surLeCote(40, 4);
		await tapFigure(zone, ANG_WIN, ANG_B.x, ANG_B.y);
		await tapFigure(zone, ANG_WIN, c.x, c.y);
		await validate(page);
		await dit(page, 'Ton angle CAB mesure 40° au lieu de 50°');
		await compte(page, 'bonne-regle', 1);
		await compte(page, 'bon-triangle-angle', 1);
		await expect(fig(page).getByTestId('bon-triangle-angle')).toContainText('50°');
		await shootThemes(page, fig(page).first(), '2658-angle-correction');
	});
});
