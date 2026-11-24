import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { templateMarkdown } from '../../src/lib/ubumark/index';
import { ADMIN, assertLocalServerEnv, login, TEACHER } from './helpers/carnet';
import {
	brouillons,
	Fingers,
	fence,
	isTouch,
	projectName,
	type Spot,
	type Win
} from './helpers/modele-brouillon';
import { gotoSettled } from './helpers/pages';

/**
 * Blocs à geste de géométrie de `/aide-ecriture/blocs/*` (tri des vérifications manuelles)
 * =========================================================================================
 *
 * Reprend les lignes #2265, #2226, #2233, #2257, #2264, #2096, #1973, « #1846, #1848, #1853,
 * #1854, #1858 » (droite graduée) et #1826 (figure de travail) de `docs/wip/verifications-manuelles.md`.
 *
 * Les fiches `/aide-ecriture/blocs/*` (prof) montrent seulement la figure de DÉPART : les gestes
 * et les corrections se jouent dans une question. Le décor est donc un modèle brouillon « Verifs4 … »
 * (créé par l'API des modèles, en admin), ouvert dans l'aperçu `/dashboard/admin/questions/<id>/preview`
 * (la carte de l'élève : « Valider », remarque, correction). Supprimé en `afterEach` (par identifiant).
 *
 * Gestes : à la souris sur l'ordinateur, `tap()` sur iPhone et Android ; un glisser au doigt
 * n'existe qu'au protocole de Chromium (Android : classe `Fingers`, comme `atelier-tactile`).
 * Ce que ces tests ne voient pas (sensation au doigt, aimantation « confortable », PDF) : voir le rapport.
 *
 * Captures à l'œil : `.captures/verifs/blocs-geometrie/`.
 *
 * Limite connue : un worker tué entre la création du modèle et l'enregistrement de son identifiant
 * peut laisser un brouillon « Verifs4 … » dans la base locale (jamais en prod : serveur et base locaux seulement).
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());

// Constantes

const SHOTS = '.captures/verifs/blocs-geometrie';
/** Largeur et hauteur du cadre d'un repère `courbe` de taille moyenne, marge comprise (`courbe-scene.ts`) */
const COURBE = { pad: 26, width: 400, height: 300 };
/** Marges fixes de la droite graduée (`NL_LAYOUT` de `number-line-render.ts`) */
const NL_MARGIN = 40;

const decor = brouillons('Verifs4', SHOTS);
const { openPreview, figureZone, fig, tapFigure, tapSeries, validate, previewText, shootThemes } =
	decor;

function androidOnly(): void {
	test.skip(projectName() !== 'android', 'Glisser au doigt : protocole de Chromium (Android)');
}

// ============================================================================
// #2233 — Point à placer (symétrique d'un point, axe oblique, quadrillage)
// ============================================================================

const POINT_WIN: Win = { xMin: 0, xMax: 10, yMin: 0, yMax: 8 };
const POINT_BLOCK = fence(
	'figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 8',
	'grille: 1',
	"verifier: point A' = symetrie(A, axe=d)",
	'---',
	'P = point(1, 1, visible=faux)',
	'Q = point(7, 7, visible=faux)',
	'd = droite(P, Q)',
	'A = point(2, 5)'
);
const POINT_STATEMENT = `Place le symétrique de $A$ par rapport à $d$.\n\n${POINT_BLOCK}`;

test.describe('#2233 — point à placer (symétrique, axe oblique)', () => {
	test('#2233 — toucher le nœud (5 ; 2) : une croix, et un double toucher n’en pose qu’une ; juste → croix verte', async ({
		page
	}) => {
		await openPreview(page, '2233 juste', POINT_STATEMENT);
		const zone = await figureZone(page);
		await expect(fig(page).getByTestId('point-eleve')).toHaveCount(0);
		await tapFigure(zone, POINT_WIN, 5, 2);
		await expect(fig(page).getByTestId('point-eleve')).toHaveCount(1);
		// Double toucher sur le même nœud : toujours une seule croix
		await tapFigure(zone, POINT_WIN, 5, 2);
		await expect(fig(page).getByTestId('point-eleve')).toHaveCount(1);
		await validate(page);
		await expect(fig(page).locator('.point-juste')).toHaveCount(1);
		expect(await previewText(page)).not.toContain('perpendiculaire');
		await shootThemes(page, fig(page).locator('.point-juste').first(), '2233-point-juste');
	});

	test('#2233 — (8 ; 5) : « Le segment [AA’] doit être perpendiculaire à l’axe », A’ en pointillés avec son nom, [AA’] codé', async ({
		page
	}) => {
		await openPreview(page, '2233 faux', POINT_STATEMENT);
		const zone = await figureZone(page);
		await tapFigure(zone, POINT_WIN, 8, 5);
		await expect(fig(page).getByTestId('point-eleve')).toHaveCount(1);
		await validate(page);
		await expect(page.locator('#contenu-principal')).toContainText(
			/doit être perpendiculaire à l.axe/
		);
		// A’ juste, en pointillés, avec son nom ; [AA’] codé (angle droit puis marques d'égalité)
		// (l'aperçu rend la carte plusieurs fois : on lit la première)
		const good = fig(page).getByTestId('bon-point');
		await expect(good).toContainText('A’');
		await expect(good.locator('path.bon-point-codage')).toHaveCount(1);
		await expect(good.locator('line.bon-point-codage')).toHaveCount(2);
		await expect(fig(page).locator('.point-juste')).toHaveCount(0);
		await shootThemes(page, good, '2233-point-faux');
	});

	test(
		'#2233 — au clavier : flèches puis Entrée posent la croix sur le bon nœud',
		{ tag: '@bureau' },
		async ({ page }) => {
			await openPreview(page, '2233 clavier', POINT_STATEMENT);
			const zone = await figureZone(page);
			await zone.focus();
			// Le curseur part du centre (5 ; 4) : deux crans vers le bas → (5 ; 2)
			await page.keyboard.press('ArrowDown');
			await page.keyboard.press('ArrowDown');
			await expect(fig(page).getByTestId('curseur')).toHaveCount(1);
			await page.keyboard.press('Enter');
			await expect(fig(page).getByTestId('point-eleve')).toHaveCount(1);
			await validate(page);
			await expect(fig(page).locator('.point-juste')).toHaveCount(1);
		}
	);
});

// ============================================================================
// #2226 — Symétrique à tracer (triangle, symétrie centrale)
// ============================================================================

const SYM_WIN: Win = { xMin: 0, xMax: 12, yMin: 0, yMax: 8 };
const TRIANGLE_BLOCK = fence(
	'figure-a-completer',
	'fenetre: 0 ; 12 ; 0 ; 8',
	'grille: 1',
	'verifier: symetrique par d',
	'---',
	'P = point(6, 0, visible=faux)',
	'Q = point(6, 8, visible=faux)',
	'd = droite(P, Q)',
	'A = point(2, 2)',
	'B = point(4, 2)',
	'C = point(4, 6)',
	'polygone(A, B, C)'
);
const CENTRAL_BLOCK = fence(
	'figure-a-completer',
	'fenetre: 0 ; 12 ; 0 ; 8',
	'grille: 1',
	'verifier: symetrique par O',
	'---',
	'O = point(6, 4)',
	'A = point(2, 2)',
	'B = point(4, 2)',
	'C = point(4, 3)',
	'segment(A, B)',
	'segment(B, C)'
);

test.describe('#2226 — symétrique à tracer', () => {
	test('#2226 — triangle (axe vertical) : l’image tracée aux nœuds → juste, en vert', async ({
		page
	}) => {
		await openPreview(
			page,
			'2226 triangle',
			`Trace le symétrique du triangle.\n\n${TRIANGLE_BLOCK}`
		);
		const zone = await figureZone(page);
		// Images : A'(10 ; 2), B'(8 ; 2), C'(8 ; 6), touchers un peu à côté des nœuds
		await tapSeries(zone, SYM_WIN, [
			[10.15, 1.9],
			[7.9, 2.1],
			[8.1, 2.15],
			[7.9, 5.9],
			[8.2, 6.1],
			[9.9, 2.2]
		]);
		await expect(fig(page).getByTestId('segment-eleve')).toHaveCount(3);
		await validate(page);
		await expect(fig(page).locator('.droite-juste')).toHaveCount(3);
		await expect(fig(page).getByTestId('bon-segment')).toHaveCount(0);
		await shootThemes(page, fig(page).locator('.droite-juste').first(), '2226-triangle-juste');
	});

	test('#2226 — triangle seulement décalé : « Ta figure a glissé… » et l’image en pointillés de l’autre côté de l’axe', async ({
		page
	}) => {
		await openPreview(page, '2226 glissé', `Trace le symétrique du triangle.\n\n${TRIANGLE_BLOCK}`);
		const zone = await figureZone(page);
		await tapSeries(zone, SYM_WIN, [
			[8, 2],
			[10, 2],
			[10, 2],
			[10, 6],
			[10, 6],
			[8, 2]
		]);
		await expect(fig(page).getByTestId('segment-eleve')).toHaveCount(3);
		// Largeur de la zone (unités du dessin), lue avant « Valider » : la zone disparaît ensuite
		const zoneWidth = await zone.evaluate(
			(el) => (el as unknown as SVGRectElement).width.baseVal.value
		);
		await validate(page);
		await expect(page.locator('#contenu-principal')).toContainText('Ta figure a glissé');
		const good = fig(page).getByTestId('bon-segment');
		await expect(good).toHaveCount(3);
		// À droite de l'axe x = 6 (moitié de la zone) : leurs abscisses SVG dépassent la moitié
		const minX = await good.evaluateAll((lines) =>
			Math.min(
				...lines.map((l) =>
					Math.min((l as SVGLineElement).x1.baseVal.value, (l as SVGLineElement).x2.baseVal.value)
				)
			)
		);
		expect(minX).toBeGreaterThan(zoneWidth / 2);
		await shootThemes(page, good.first(), '2226-triangle-glisse');
	});

	test('#2226 — un côté manquant : « Il manque une partie du symétrique. »', async ({ page }) => {
		await openPreview(page, '2226 manque', `Trace le symétrique du triangle.\n\n${TRIANGLE_BLOCK}`);
		const zone = await figureZone(page);
		// Deux côtés sur trois seulement
		await tapSeries(zone, SYM_WIN, [
			[10, 2],
			[8, 2],
			[8, 2],
			[8, 6]
		]);
		await expect(fig(page).getByTestId('segment-eleve')).toHaveCount(2);
		await validate(page);
		await expect(page.locator('#contenu-principal')).toContainText(
			'Il manque une partie du symétrique.'
		);
	});

	test('#2226 — symétrie centrale : l’image par O, tracée aux nœuds → juste', async ({ page }) => {
		await openPreview(
			page,
			'2226 centrale',
			`Trace le symétrique par rapport à $O$.\n\n${CENTRAL_BLOCK}`
		);
		const zone = await figureZone(page);
		// A'(10 ; 6), B'(8 ; 6), C'(8 ; 5)
		await tapSeries(zone, SYM_WIN, [
			[10, 6],
			[8, 6],
			[8, 6],
			[8, 5]
		]);
		await expect(fig(page).getByTestId('segment-eleve')).toHaveCount(2);
		await validate(page);
		await expect(fig(page).locator('.droite-juste')).toHaveCount(2);
		await shootThemes(page, fig(page).locator('.droite-juste').first(), '2226-centrale-juste');
	});
});

// ============================================================================
// #2257 — Instruments sur papier uni (symétrique d'un point)
// ============================================================================

const PAPER_WIN: Win = { xMin: 0, xMax: 10, yMin: 0, yMax: 8 };
const PAPER_BLOCK = fence(
	'figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 8',
	"verifier: point A' = symetrie(A, axe=d)",
	'---',
	'P = point(1, 1, visible=faux)',
	'Q = point(7, 7, visible=faux)',
	'd = droite(P, Q)',
	'A = point(2, 5)'
);
const PAPER_STATEMENT = `Construis le symétrique de $A$ par rapport à $d$.\n\n${PAPER_BLOCK}`;

async function selectTool(page: Page, name: string): Promise<void> {
	const button = page.getByRole('button', { name, exact: true });
	if (isTouch()) await button.tap();
	else await button.click();
	await expect(button).toHaveAttribute('aria-pressed', 'true');
}

test.describe('#2257 — instruments sur papier uni', () => {
	test('#2257 — palette Règle · Équerre · Compas · Point (Point au départ) ; équerre, compas, point à l’autre intersection → croix verte', async ({
		page
	}) => {
		await openPreview(page, '2257 juste', PAPER_STATEMENT);
		const zone = await figureZone(page);
		const palette = ['outil-droite', 'outil-equerre', 'outil-compas', 'outil-point'];
		const labels: string[] = [];
		for (const id of palette)
			labels.push(((await page.getByTestId(id).textContent()) ?? '').trim());
		expect(labels).toEqual(['Règle', 'Équerre', 'Compas', 'Point']);
		await expect(fig(page).getByTestId('outil-point')).toHaveAttribute('aria-pressed', 'true');

		await selectTool(page, 'Équerre');
		// Loin de toute droite : la consigne
		await tapFigure(zone, PAPER_WIN, 8.5, 1);
		await expect(page.locator('#contenu-principal')).toContainText('Touche d’abord une droite.');
		// Sur d : elle est surlignée ; puis par A : la perpendiculaire
		await tapFigure(zone, PAPER_WIN, 6, 6.1);
		await expect(fig(page).getByTestId('droite-choisie')).toHaveCount(1);
		await tapFigure(zone, PAPER_WIN, 2.1, 5);
		await expect(fig(page).getByTestId('droite-eleve')).toHaveCount(1);
		await expect(fig(page).getByTestId('droite-choisie')).toHaveCount(0);
		// Compas : piqué au pied H(3,5 ; 3,5), ouvert jusqu'à A → le cercle
		await selectTool(page, 'Compas');
		await tapSeries(zone, PAPER_WIN, [
			[3.6, 3.4],
			[2, 5.1]
		]);
		await expect(fig(page).getByTestId('cercle-eleve')).toHaveCount(1);
		// Point à l'autre intersection A'(5 ; 2)
		await selectTool(page, 'Point');
		await tapFigure(zone, PAPER_WIN, 5.1, 2.1);
		await expect(fig(page).getByTestId('point-eleve')).toHaveCount(1);
		await validate(page);
		await expect(fig(page).locator('.point-juste')).toHaveCount(1);
		await shootThemes(page, fig(page).locator('.point-juste').first(), '2257-instruments-juste');
	});

	test('#2257 — un point posé à l’œil, même pile sur A’ (5 ; 2) : « Ton point est placé à l’œil… »', async ({
		page
	}) => {
		await openPreview(page, '2257 oeil', PAPER_STATEMENT);
		const zone = await figureZone(page);
		// Rien construit : aucun point, aucune intersection, aucun trait près de (5 ; 2)
		await tapFigure(zone, PAPER_WIN, 5, 2);
		await expect(fig(page).getByTestId('point-eleve')).toHaveCount(1);
		await validate(page);
		await expect(page.locator('#contenu-principal')).toContainText('Ton point est placé à l’œil');
		await expect(fig(page).locator('.point-juste')).toHaveCount(0);
	});

	test(
		'#2257 — au clavier : le point A (Entrée) puis l’intersection A’ (Tab, Entrée) ; les droites ne sont pas touchées',
		{ tag: '@bureau' },
		async ({ page }) => {
			await openPreview(page, '2257 clavier', PAPER_STATEMENT);
			const zone = await figureZone(page);
			await selectTool(page, 'Équerre');
			await tapFigure(zone, PAPER_WIN, 6, 6.1);
			await expect(fig(page).getByTestId('droite-choisie')).toHaveCount(1);
			// Par A, au clavier (le bouton du point nommé)
			const pointA = page.getByRole('button', { name: 'Point A', exact: true });
			await pointA.focus();
			await page.keyboard.press('Enter');
			await expect(fig(page).getByTestId('droite-eleve')).toHaveCount(1);
			await selectTool(page, 'Compas');
			await tapSeries(zone, PAPER_WIN, [
				[3.6, 3.4],
				[2, 5.1]
			]);
			await expect(fig(page).getByTestId('cercle-eleve')).toHaveCount(1);
			await selectTool(page, 'Point');
			// Les intersections sont des boutons au clavier : celui qui est à A'(5 ; 2)
			const targets = page.getByRole('button', { name: /^Intersection \d+$/ });
			const count = await targets.count();
			expect(count).toBeGreaterThan(0);
			const box = (await zone.boundingBox())!;
			const wanted = {
				x: box.x + ((5 - PAPER_WIN.xMin) / (PAPER_WIN.xMax - PAPER_WIN.xMin)) * box.width,
				y: box.y + ((PAPER_WIN.yMax - 2) / (PAPER_WIN.yMax - PAPER_WIN.yMin)) * box.height
			};
			let best = -1;
			let bestDistance = Infinity;
			for (let index = 0; index < count; index++) {
				const at = await targets.nth(index).boundingBox();
				if (!at) continue;
				const distance = Math.hypot(
					at.x + at.width / 2 - wanted.x,
					at.y + at.height / 2 - wanted.y
				);
				if (distance < bestDistance) {
					bestDistance = distance;
					best = index;
				}
			}
			expect(bestDistance, 'une intersection à moins de 6 px de A’').toBeLessThan(6);
			await targets.nth(best).focus();
			await page.keyboard.press('Enter');
			await expect(fig(page).getByTestId('point-eleve')).toHaveCount(1);
			await validate(page);
			await expect(fig(page).locator('.point-juste')).toHaveCount(1);
		}
	);
});

// ============================================================================
// #2264 — Médiatrice à construire
// ============================================================================

const MED_WIN: Win = { xMin: 0, xMax: 10, yMin: 0, yMax: 8 };
const MED_BLOCK = fence(
	'figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 8',
	'verifier: droite m = mediatrice(A, B)',
	'---',
	'A = point(3, 4)',
	'B = point(6, 5)',
	'segment(A, B)'
);
const MED_GRID_BLOCK = fence(
	'figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 8',
	'grille: 1',
	'verifier: droite m = mediatrice(A, B)',
	'---',
	'A = point(3, 4)',
	'B = point(5, 4)',
	'segment(A, B)'
);
// Intersections des cercles (A par B) et (B par A) : milieu (4,5 ; 4,5) ± 0,866 × (-1 ; 3)
const MED_X1: [number, number] = [3.634, 7.098];
const MED_X2: [number, number] = [5.366, 1.902];

test.describe('#2264 — médiatrice à construire', () => {
	test('#2264 — Règle · Équerre · Compas (Règle au départ, pas de Point) ; deux cercles puis la règle par les deux intersections → juste', async ({
		page
	}) => {
		await openPreview(page, '2264 juste', `Construis la médiatrice de $[AB]$.\n\n${MED_BLOCK}`);
		const zone = await figureZone(page);
		await expect(fig(page).getByTestId('outil-droite')).toHaveAttribute('aria-pressed', 'true');
		await expect(fig(page).getByTestId('outil-equerre')).toHaveCount(1);
		await expect(fig(page).getByTestId('outil-compas')).toHaveCount(1);
		await expect(fig(page).getByTestId('outil-point')).toHaveCount(0);
		// Compas en A par B, puis en B par A
		await selectTool(page, 'Compas');
		await tapSeries(zone, MED_WIN, [
			[3, 4.05],
			[6.05, 5],
			[6, 5.05],
			[3.05, 4]
		]);
		await expect(fig(page).getByTestId('cercle-eleve')).toHaveCount(2);
		// Règle par les deux intersections
		await selectTool(page, 'Règle');
		await tapSeries(zone, MED_WIN, [
			[MED_X1[0] + 0.08, MED_X1[1] - 0.06],
			[MED_X2[0] - 0.07, MED_X2[1] + 0.05]
		]);
		await expect(fig(page).getByTestId('droite-eleve')).toHaveCount(1);
		await validate(page);
		// La droite et, avec elle, les deux cercles de la construction passent au vert
		await expect(fig(page).locator('[data-testid="droite-eleve"].droite-juste')).toHaveCount(1);
		await expect(fig(page).locator('.droite-juste')).toHaveCount(3);
		await shootThemes(page, fig(page).locator('.droite-juste').first(), '2264-mediatrice-juste');
	});

	test('#2264 — une droite tracée à l’œil : « Ta droite est tracée à l’œil… », puis la médiatrice en pointillés, angle droit et moitiés codés', async ({
		page
	}) => {
		await openPreview(page, '2264 oeil', `Construis la médiatrice de $[AB]$.\n\n${MED_BLOCK}`);
		const zone = await figureZone(page);
		// Règle (outil de départ) sur deux endroits vides, sans cercle : à l'œil
		await tapSeries(zone, MED_WIN, [
			[3.6, 7.1],
			[5.4, 1.9]
		]);
		await expect(fig(page).getByTestId('droite-eleve')).toHaveCount(1);
		await validate(page);
		await expect(page.locator('#contenu-principal')).toContainText('Ta droite est tracée à l’œil');
		await expect(fig(page).getByTestId('bonne-droite')).toHaveCount(1);
		await expect(fig(page).getByTestId('codage-mediatrice')).toBeAttached();
		await shootThemes(page, fig(page).getByTestId('bonne-droite'), '2264-mediatrice-oeil');
	});

	test('#2264 — grille: 1 : l’équerre choisit d’abord sa droite, puis passe par un nœud → juste', async ({
		page
	}) => {
		await openPreview(
			page,
			'2264 grille',
			`Construis la médiatrice de $[AB]$.\n\n${MED_GRID_BLOCK}`
		);
		const zone = await figureZone(page);
		await selectTool(page, 'Équerre');
		await tapFigure(zone, MED_WIN, 8, 1);
		await expect(page.locator('#contenu-principal')).toContainText('Touche d’abord une droite.');
		await tapFigure(zone, MED_WIN, 3.5, 4.05);
		await expect(fig(page).getByTestId('droite-choisie')).toHaveCount(1);
		await tapFigure(zone, MED_WIN, 4.15, 3.9);
		await expect(fig(page).getByTestId('droite-eleve')).toHaveCount(1);
		await validate(page);
		await expect(fig(page).locator('.droite-juste')).toHaveCount(1);
	});

	test('#2264 — grille: 1 : la règle, touchée près des nœuds (4 ; 1) et (4 ; 7), trace x = 4 → juste', async ({
		page
	}) => {
		await openPreview(
			page,
			'2264 grille règle',
			`Construis la médiatrice de $[AB]$.\n\n${MED_GRID_BLOCK}`
		);
		const zone = await figureZone(page);
		await tapSeries(zone, MED_WIN, [
			[4.2, 0.85],
			[3.85, 7.15]
		]);
		await expect(fig(page).getByTestId('droite-eleve')).toHaveCount(1);
		await validate(page);
		await expect(fig(page).locator('.droite-juste')).toHaveCount(1);
	});
});

// ============================================================================
// Repères `courbe` : #2096 (points à placer), #2265 (droite à tracer)
// ============================================================================

const COURBE_WIN: Win = { xMin: -5, xMax: 5, yMin: -4, yMax: 4 };

/** Le repère à toucher (`role="slider"`), amené à l'écran */
async function courbeZone(page: Page): Promise<{ zone: Locator; svg: Locator }> {
	const zone = page.getByRole('slider').first();
	await expect(zone).toBeVisible();
	const svg = zone.locator('svg').first();
	await svg.scrollIntoViewIfNeeded();
	return { zone, svg };
}

/** Le point (x ; y) du repère, en px dans le <svg> (le cadre de 400 × 300 + marge, mis à l'échelle) */
async function courbeSpot(svg: Locator, win: Win, x: number, y: number): Promise<Spot> {
	const box = await svg.boundingBox();
	if (!box) throw new Error('repère sans boîte');
	const viewBoxWidth = await svg.evaluate(
		(el) => (el as unknown as SVGSVGElement).viewBox.baseVal.width
	);
	const scale = box.width / viewBoxWidth;
	return {
		x: scale * (COURBE.pad + ((x - win.xMin) / (win.xMax - win.xMin)) * COURBE.width),
		y: scale * (COURBE.pad + ((win.yMax - y) / (win.yMax - win.yMin)) * COURBE.height)
	};
}

async function tapCourbe(svg: Locator, win: Win, x: number, y: number): Promise<void> {
	const position = await courbeSpot(svg, win, x, y);
	if (isTouch()) await svg.tap({ position });
	else await svg.click({ position });
}

const posed = (zone: Locator): Locator => zone.locator('circle.courbe-pose');

test.describe('#2096 — repère à placer', () => {
	const PLACER_BLOCK = fence(
		'courbe',
		'x: -5 ; 5',
		'y: -4 ; 4',
		'grille: 1',
		'placer: A=(2 ; 3) ; B=(-1 ; 2) ; C=(0 ; -3)'
	);

	test('#2096 — toucher le repère pose A sur le nœud le plus proche, poser A active B ; flèches = un cran, Début = origine', async ({
		page
	}) => {
		await openPreview(page, '2096 geste', `Place les points.\n\n${PLACER_BLOCK}`);
		const { zone, svg } = await courbeZone(page);
		await expect(posed(zone)).toHaveCount(0);
		const labelA = page.getByRole('button', { name: 'Point A', exact: true });
		const labelB = page.getByRole('button', { name: 'Point B', exact: true });
		await expect(labelA).toHaveAttribute('aria-pressed', 'true');
		// Un toucher à côté du nœud (2 ; 3) : A y est posé
		await tapCourbe(svg, COURBE_WIN, 2.2, 2.85);
		await expect(posed(zone)).toHaveCount(1);
		// Poser A active B ; reprendre A (son étiquette) dit où il est posé
		await labelA.click();
		await expect(zone).toHaveAttribute('aria-valuetext', /point A en \(2 ; 3\)/);
		await labelB.click();
		await expect(labelB).toHaveAttribute('aria-pressed', 'true');
		await tapCourbe(svg, COURBE_WIN, -1.1, 2.1);
		await expect(posed(zone)).toHaveCount(2);
		await expect(page.getByRole('button', { name: 'Point C', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await shootThemes(page, zone, '2096-repere-place');
	});

	test('#2096 — glisser déplace le point posé (souris)', { tag: '@bureau' }, async ({ page }) => {
		await openPreview(page, '2096 glisser', `Place les points.\n\n${PLACER_BLOCK}`);
		const { zone, svg } = await courbeZone(page);
		await tapCourbe(svg, COURBE_WIN, 2, 3);
		await expect(posed(zone)).toHaveCount(1);
		// Poser A a activé B (pas encore posé : un toucher le poserait) : on reprend A par son étiquette,
		// puis on le tire de (2 ; 3) vers (-2 ; -1)
		await page.getByRole('button', { name: 'Point A', exact: true }).click();
		const box = (await svg.boundingBox())!;
		const from = await courbeSpot(svg, COURBE_WIN, 2, 3);
		const to = await courbeSpot(svg, COURBE_WIN, -2, -1);
		await page.mouse.move(box.x + from.x, box.y + from.y);
		await page.mouse.down();
		await page.mouse.move(box.x + (from.x + to.x) / 2, box.y + (from.y + to.y) / 2, { steps: 5 });
		await page.mouse.move(box.x + to.x, box.y + to.y, { steps: 5 });
		await page.mouse.up();
		await expect(posed(zone)).toHaveCount(1);
		await expect(zone).toHaveAttribute('aria-valuetext', /point A en \(-2 ; -1\)/);
	});

	test(
		'#2096 — au clavier : une flèche = un cran de grille, Début = l’origine',
		{ tag: '@bureau' },
		async ({ page }) => {
			await openPreview(page, '2096 clavier', `Place les points.\n\n${PLACER_BLOCK}`);
			const { zone } = await courbeZone(page);
			await zone.focus();
			await page.keyboard.press('Home');
			await expect(posed(zone)).toHaveCount(1);
			const origin = await zone.getAttribute('aria-valuetext');
			await page.keyboard.press('ArrowRight');
			await expect(zone).not.toHaveAttribute('aria-valuetext', origin ?? '');
			const afterRight = await zone.getAttribute('aria-valuetext');
			await page.keyboard.press('ArrowUp');
			await expect(zone).not.toHaveAttribute('aria-valuetext', afterRight ?? '');
			await page.keyboard.press('Home');
			await expect(zone).toHaveAttribute('aria-valuetext', origin ?? '');
		}
	);

	test('#2096 — au doigt (Android) : un glisser vertical parti d’un endroit vide pose le point', async ({
		page
	}) => {
		androidOnly();
		await openPreview(page, '2096 doigt', `Place les points.\n\n${PLACER_BLOCK}`);
		const { zone, svg } = await courbeZone(page);
		const box = (await svg.boundingBox())!;
		const from = await courbeSpot(svg, COURBE_WIN, 1, 2);
		const to = await courbeSpot(svg, COURBE_WIN, 1, -1);
		const scroller = page.locator('#contenu-principal');
		const scrollBefore = await scroller.evaluate((el) => el.scrollTop);
		await new Fingers(page).drag(
			{ x: box.x + from.x, y: box.y + from.y },
			{ x: to.x - from.x, y: to.y - from.y }
		);
		await expect(posed(zone)).toHaveCount(1);
		const scrollAfter = await scroller.evaluate((el) => el.scrollTop);
		console.log(`#2096 Android : défilement ${scrollBefore} → ${scrollAfter} (glisser vertical)`);
	});

	test('#2096 — répondre (3 ; 2) pour A = (2 ; 3) : « tu as échangé l’abscisse et l’ordonnée », repère juste à côté', async ({
		page
	}) => {
		await openPreview(
			page,
			'2096 echange',
			`Place le point $A(2\\,;\\,3)$.\n\n${fence('courbe', 'x: -5 ; 5', 'y: -4 ; 4', 'grille: 1', 'placer: A=(2 ; 3)')}`
		);
		const { svg } = await courbeZone(page);
		await tapCourbe(svg, COURBE_WIN, 3, 2);
		await validate(page);
		await expect(page.locator('#contenu-principal')).toContainText(
			/tu as échangé l.abscisse et l.ordonnée/i
		);
		// Le repère juste, à côté, en vert : un second repère (Correction)
		const correction = page.locator('.placer-correction').first();
		await expect(correction).toBeVisible();
		await shootThemes(page, correction, '2096-echange');
	});
});

test.describe('#2265 — droite à tracer', () => {
	const TRACER_BLOCK = fence(
		'courbe',
		'x: -5 ; 5',
		'y: -4 ; 4',
		'grille: 1',
		'tracer: y = {{m}}x + {{p}}'
	);
	const VARIABLES = {
		variables: [
			{ name: 'm', expression: '1' },
			{ name: 'p', expression: '0' }
		]
	};

	test('#2265 — deux touchers posent les points 1 et 2, la droite se dessine d’un bord à l’autre ; deux points justes quelconques → vert', async ({
		page
	}) => {
		await openPreview(page, '2265 juste', `Trace la droite.\n\n${TRACER_BLOCK}`, VARIABLES);
		const { zone, svg } = await courbeZone(page);
		await expect(page.getByRole('button', { name: 'Point 1', exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Point 2', exact: true })).toBeVisible();
		await tapCourbe(svg, COURBE_WIN, -2.1, -1.9);
		await expect(posed(zone)).toHaveCount(1);
		await expect(zone.locator('line.courbe-trace')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Point 2', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await tapCourbe(svg, COURBE_WIN, 3.1, 2.9);
		await expect(posed(zone)).toHaveCount(2);
		const line = zone.locator('line.courbe-trace');
		await expect(line).toHaveCount(1);
		// D'un bord à l'autre : y = x sort de la fenêtre -5..5 × -4..4 en haut et en bas (marge de 26)
		const [top, bottom] = await line.evaluate((el) => {
			const l = el as unknown as SVGLineElement;
			return [l.y1.baseVal.value, l.y2.baseVal.value].sort((a, b) => a - b);
		});
		expect(top).toBeCloseTo(COURBE.pad, 0);
		expect(bottom).toBeCloseTo(COURBE.pad + COURBE.height, 0);
		await validate(page);
		await expect(zone).toHaveClass(/placer-juste/);
		await shootThemes(page, zone, '2265-droite-juste');
	});

	test('#2265 — droite fausse : « Ta droite n’est pas celle d’équation » + « y = x » (jamais 1x + 0), la droite juste et deux nœuds en vert', async ({
		page
	}) => {
		await openPreview(page, '2265 fausse', `Trace la droite.\n\n${TRACER_BLOCK}`, VARIABLES);
		const { zone, svg } = await courbeZone(page);
		await tapCourbe(svg, COURBE_WIN, 0, 1);
		await tapCourbe(svg, COURBE_WIN, 2, 3);
		await expect(posed(zone)).toHaveCount(2);
		await validate(page);
		expect(await previewText(page)).toMatch(/Ta droite n.est pas celle d.équation/);
		await expect(zone).toHaveClass(/placer-faux/);
		// La formule propre : « y = x », jamais « 1x + 0 » (texte des formules lu dans le DOM)
		const formulas = (await page.locator('math-span, math-div').allTextContents()).join(' | ');
		expect(formulas).toMatch(/y\s*=\s*x(?![\w^])/);
		expect(formulas).not.toMatch(/1\s*x/);
		expect(formulas).not.toMatch(/\+\s*0(?![.,\d])/);
		// La droite juste, dans le repère de correction
		const correction = page.locator('.placer-correction').first();
		await expect(correction).toBeVisible();
		await expect(correction.locator('line.courbe-trace').first()).toBeVisible();
		await shootThemes(page, correction, '2265-droite-fausse');
	});

	test('#2265 — un point seul : « Il faut placer deux points. »', async ({ page }) => {
		await openPreview(page, '2265 un point', `Trace la droite.\n\n${TRACER_BLOCK}`, VARIABLES);
		const { zone, svg } = await courbeZone(page);
		await tapCourbe(svg, COURBE_WIN, 1, 1);
		await expect(posed(zone)).toHaveCount(1);
		await validate(page);
		await expect(page.locator('#contenu-principal')).toContainText('Il faut placer deux points.');
	});
});

// ============================================================================
// #1973 — Figure à manipuler (fiche /aide-ecriture/blocs/figure, prof)
// ============================================================================

test.describe('#1973 — figure à manipuler', () => {
	async function openFigureExample(page: Page): Promise<{ figure: Locator }> {
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, '/aide-ecriture/blocs/figure');
		const example = page.locator('article').filter({ hasText: 'Une figure à manipuler' }).first();
		const figure = example.locator('figure.figure-toile');
		await expect(figure).toBeVisible();
		await figure.scrollIntoViewIfNeeded();
		return { figure };
	}

	const pointAt = async (figure: Locator, index: number): Promise<Spot> => {
		const box = await figure.locator('circle.point.draggable').nth(index).boundingBox();
		if (!box) throw new Error('point introuvable');
		return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
	};
	const lineX = async (figure: Locator): Promise<number> =>
		Number(await figure.locator('line.geo-line').first().getAttribute('x1'));
	/** La médiatrice est à `target` (unités du dessin), à 4 près : le doigt ou la souris attrape le point un peu à côté de son centre */
	const expectLineNear = (figure: Locator, target: number) =>
		expect.poll(async () => Math.abs((await lineX(figure)) - target)).toBeLessThan(4);

	/** Une unité de la fenêtre (-1 ; 7) : en unités du dessin, et en px à l'écran (le dessin suit la largeur) */
	const oneUnit = async (figure: Locator): Promise<{ svg: number; px: number }> => {
		const canvas = figure.locator('svg.geometry-canvas');
		const box = (await canvas.boundingBox())!;
		const viewBoxWidth = await canvas.evaluate(
			(el) => (el as unknown as SVGSVGElement).viewBox.baseVal.width
		);
		return { svg: viewBoxWidth / 8, px: (viewBoxWidth / 8) * (box.width / viewBoxWidth) };
	};

	test(
		'#1973 — la figure est dans une toile ; glisser A déplace la médiatrice, « Remettre la figure » ramène tout (souris)',
		{ tag: '@bureau' },
		async ({ page }) => {
			const { figure } = await openFigureExample(page);
			await expect(figure.locator('svg.geometry-canvas')).toBeVisible();
			await expect(figure.locator('circle.point.draggable')).toHaveCount(3);
			const start = await lineX(figure);
			const unit = await oneUnit(figure);
			// La médiatrice de [AB] (A en 0, B en 5) est au milieu : 2,5 unités du bord gauche (-1)
			expect(start).toBeCloseTo(3.5 * unit.svg, 0);
			const from = await pointAt(figure, 0);
			await page.mouse.move(from.x, from.y);
			await page.mouse.down();
			await page.mouse.move(from.x + unit.px / 2, from.y, { steps: 5 });
			await page.mouse.move(from.x + unit.px, from.y, { steps: 5 });
			await page.mouse.up();
			// A a glissé d'une unité vers la droite : le milieu de [AB] passe de 2,5 à 3 → une demi-unité de plus
			await expectLineNear(figure, start + unit.svg / 2);
			await figure.getByRole('button', { name: 'Remettre la figure' }).click();
			await expectLineNear(figure, start);
			await shootThemes(page, figure, '1973-figure-manipulee');
		}
	);

	test('#1973 — au doigt (Android) : glisser B déplace la médiatrice', async ({ page }) => {
		androidOnly();
		const { figure } = await openFigureExample(page);
		const start = await lineX(figure);
		const unit = await oneUnit(figure);
		const from = await pointAt(figure, 1);
		await new Fingers(page).drag(from, { x: -unit.px, y: 0 });
		// B glisse d'une unité vers la gauche : le milieu de [AB] passe de 2,5 à 2 → une demi-unité de moins
		await expectLineNear(figure, start - unit.svg / 2);
	});

	test(
		'#1973 — la molette fait défiler la page au-dessus de la figure (pas de zoom) ; espace et Ctrl+Z ne font rien',
		{ tag: '@bureau' },
		async ({ page }) => {
			const { figure } = await openFigureExample(page);
			const scroller = page.locator('#contenu-principal');
			const canvas = figure.locator('svg.geometry-canvas');
			const box = (await canvas.boundingBox())!;
			const cxBefore = await figure.locator('circle.point.draggable').first().getAttribute('cx');
			const lineBefore = await lineX(figure);
			const scrollBefore = await scroller.evaluate((el) => el.scrollTop);
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.wheel(0, 150);
			await expect
				.poll(() => scroller.evaluate((el) => el.scrollTop))
				.toBeGreaterThan(scrollBefore);
			expect(await figure.locator('circle.point.draggable').first().getAttribute('cx')).toBe(
				cxBefore
			);
			expect(await lineX(figure)).toBeCloseTo(lineBefore, 0);
			// Espace et Ctrl+Z : rien n'est défait. On déplace A d'une unité, puis on tente d'annuler
			const unit = await oneUnit(figure);
			const from = await pointAt(figure, 0);
			await page.mouse.move(from.x, from.y);
			await page.mouse.down();
			await page.mouse.move(from.x + unit.px, from.y, { steps: 6 });
			await page.mouse.up();
			await expectLineNear(figure, lineBefore + unit.svg / 2);
			const moved = await lineX(figure);
			const movedCx = await figure.locator('circle.point.draggable').first().getAttribute('cx');
			await canvas.focus();
			await page.keyboard.press('Control+z');
			await page.keyboard.press('Space');
			// Laisser le temps à une éventuelle annulation de se produire, sans attente fixe : le dessin se stabilise
			await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => done())));
			expect(Math.abs((await lineX(figure)) - moved)).toBeLessThan(0.5);
			expect(await figure.locator('circle.point.draggable').first().getAttribute('cx')).toBe(
				movedCx
			);
			await expect(figure.locator('circle.point.draggable')).toHaveCount(3);
		}
	);

	test('#1973 — au téléphone (Android) : la page défile en dehors de la figure (glisser vertical)', async ({
		page
	}) => {
		androidOnly();
		const { figure } = await openFigureExample(page);
		const scroller = page.locator('#contenu-principal');
		// Un doigt posé sur le titre de l'exemple, hors de la toile, monte : la page défile
		const title = page
			.locator('article')
			.filter({ hasText: 'Une figure à manipuler' })
			.first()
			.locator('h3');
		await title.scrollIntoViewIfNeeded();
		const box = (await title.boundingBox())!;
		const before = await scroller.evaluate((el) => el.scrollTop);
		await new Fingers(page).drag({ x: box.x + 20, y: box.y + box.height / 2 }, { x: 0, y: -150 });
		await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(before);
		await expect(figure.locator('circle.point.draggable')).toHaveCount(3);
	});
});

// ============================================================================
// « #1846, #1848, #1853, #1854, #1858 » — droite graduée à placer
// ============================================================================

const LINE_BLOCK_ONE = fence(
	'line',
	'start: 0',
	'end: 20',
	'step: 1',
	'labels: 0, 10, 20',
	'placer: 7'
);
const LINE_BLOCK_MANY = fence(
	'line',
	'start: 0',
	'end: 20',
	'step: 1',
	'labels: 0, 10, 20',
	'placer: A=3 ; B=7 ; C=12'
);

/** Toucher la droite à la graduation `value` (droite de 0 à 20) */
async function tapNumberLine(svg: Locator, value: number): Promise<void> {
	const box = await svg.boundingBox();
	if (!box) throw new Error('droite sans boîte');
	const position = {
		x: NL_MARGIN + (value / 20) * (box.width - 2 * NL_MARGIN),
		y: box.height / 2
	};
	if (isTouch()) await svg.tap({ position });
	else await svg.click({ position });
}

test.describe('#1846, #1848, #1853, #1854, #1858 — droite graduée à placer', () => {
	test('#1846 — « Placer un nombre » : un toucher pose le point sur la graduation la plus proche ; ◀ ▶ avancent d’un cran', async ({
		page
	}) => {
		await openPreview(page, '1846 un nombre', `Place le nombre 7.\n\n${LINE_BLOCK_ONE}`);
		const zone = page.getByRole('slider').first();
		const svg = zone.locator('svg').first();
		await svg.scrollIntoViewIfNeeded();
		await expect(zone.locator('circle.nl-point')).toHaveCount(0);
		await tapNumberLine(svg, 12.3);
		await expect(zone.locator('circle.nl-point')).toHaveCount(1);
		await expect(zone).toHaveAttribute('aria-valuetext', 'point sur 12');
		await page.getByRole('button', { name: 'Avancer le point d’une graduation' }).click();
		await expect(zone).toHaveAttribute('aria-valuetext', 'point sur 13');
		await page.getByRole('button', { name: 'Reculer le point d’une graduation' }).click();
		await page.getByRole('button', { name: 'Reculer le point d’une graduation' }).click();
		await expect(zone).toHaveAttribute('aria-valuetext', 'point sur 11');
		// Les chiffres de la droite (formules en lecture seule) : leur taille à l'écran, échelle du dessin comprise
		const labels = svg.locator('math-field');
		await expect(labels.first()).toBeVisible();
		const labelPx = await svg.evaluate((el) => {
			const box = el as unknown as SVGSVGElement;
			const field = box.querySelector('math-field');
			const scale = box.getBoundingClientRect().width / box.viewBox.baseVal.width;
			return field === null ? 0 : parseFloat(getComputedStyle(field).fontSize) * scale;
		});
		console.log(
			`#1846 ${projectName()} : chiffres de la droite à ${labelPx.toFixed(1)} px à l'écran`
		);
		expect(labelPx, 'taille des chiffres de la droite (px)').toBeGreaterThanOrEqual(10);
		await shootThemes(page, zone, '1846-droite-placer');
	});

	test('#1846 — « Placer plusieurs nombres » : un toucher pose le point actif puis passe au suivant ; on reprend un point posé', async ({
		page
	}) => {
		await openPreview(page, '1846 plusieurs', `Place A, B et C.\n\n${LINE_BLOCK_MANY}`);
		const zone = page.getByRole('slider').first();
		const svg = zone.locator('svg').first();
		await svg.scrollIntoViewIfNeeded();
		const label = (name: string) =>
			page.getByRole('button', { name: `Point ${name}`, exact: true });
		await expect(label('A')).toHaveAttribute('aria-pressed', 'true');
		await tapNumberLine(svg, 3);
		await expect(zone.locator('circle.nl-point')).toHaveCount(1);
		await expect(label('B')).toHaveAttribute('aria-pressed', 'true');
		await tapNumberLine(svg, 8);
		await expect(zone.locator('circle.nl-point')).toHaveCount(2);
		await expect(label('C')).toHaveAttribute('aria-pressed', 'true');
		// Reprendre B : on le choisit par son étiquette, ◀ le recule d'un cran
		await label('B').click();
		await expect(label('B')).toHaveAttribute('aria-pressed', 'true');
		await page.getByRole('button', { name: 'Reculer le point d’une graduation' }).click();
		await expect(zone).toHaveAttribute('aria-valuetext', 'point B sur 7');
		await expect(zone.locator('circle.nl-point')).toHaveCount(2);
	});

	test('#1846 — dans une vraie question : « Tu as placé B sur 9. », et la droite juste, entière dans la carte (#1858)', async ({
		page
	}) => {
		await openPreview(page, '1846 correction', `Place A, B et C.\n\n${LINE_BLOCK_MANY}`);
		const zone = page.getByRole('slider').first();
		const svg = zone.locator('svg').first();
		await svg.scrollIntoViewIfNeeded();
		await tapNumberLine(svg, 3);
		await tapNumberLine(svg, 9);
		await tapNumberLine(svg, 12);
		await expect(zone.locator('circle.nl-point')).toHaveCount(3);
		await validate(page);
		await expect(page.locator('#contenu-principal')).toContainText('Tu as placé B sur 9.');
		await expect(zone).toHaveClass(/placer-faux/);
		// La droite juste (Correction) : tout son dessin est lisible, sans être coupé par la carte
		const correction = page.locator('.placer-correction').first();
		await expect(correction).toBeVisible();
		await correction.scrollIntoViewIfNeeded();
		const fits = await page.evaluate(() => {
			const results: Array<{ svgRight: number; limit: number; scrollable: boolean }> = [];
			for (const el of document.querySelectorAll('.placer-correction svg')) {
				const svgBox = el.getBoundingClientRect();
				let parent: Element | null = el.parentElement;
				let scrollable = false;
				let limit = window.innerWidth;
				while (parent && parent !== document.body) {
					const style = getComputedStyle(parent);
					if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
						scrollable = true;
						break;
					}
					limit = Math.min(limit, parent.getBoundingClientRect().right);
					parent = parent.parentElement;
				}
				results.push({ svgRight: svgBox.right, limit, scrollable });
			}
			return results;
		});
		expect(fits.length, 'la droite juste est dessinée dans la correction').toBeGreaterThan(0);
		for (const f of fits) {
			expect(f.scrollable || f.svgRight <= f.limit + 1, JSON.stringify(f)).toBe(true);
		}
		await shootThemes(page, correction, '1858-droite-correction');
	});
});

// ============================================================================
// #1826 — Figure de travail + case choix dans l'éditeur d'un modèle à trous
// ============================================================================

const WORK_BLOCK = fence(
	'figure-de-travail',
	'fenetre: 0 ; 10 ; 0 ; 6',
	'outils: droite',
	'---',
	'A = point(2, 3)',
	'B = point(8, 5)',
	'C = point(5, 4.25)'
);
const OUI_NON = '```choix\nmelanger: non\n- Oui\n- Non\n```';
const WORK_STATEMENT = `Les points $A$, $B$ et $C$ sont-ils alignés ?\n\n${WORK_BLOCK}\n\n${OUI_NON}`;

test.describe('#1826 — figure de travail et case choix', () => {
	const BLANKS = { blanks: [{ expectedAnswer: '' }, { expectedAnswer: '1' }] };
	const WORK_WIN: Win = { xMin: 0, xMax: 10, yMin: 0, yMax: 6 };

	test('#1826 — aperçu : Valider actif sans rien tracer, « Non » juste ; tracé puis Valider → traits gris', async ({
		page
	}) => {
		await openPreview(page, '1826 apercu', WORK_STATEMENT, BLANKS);
		const zone = await figureZone(page);
		await expect(page.getByRole('button', { name: 'Valider' })).toBeDisabled();
		await page.getByRole('radio', { name: /Non/ }).click();
		await expect(page.getByRole('button', { name: 'Valider' })).toBeEnabled();
		// Tracé de la droite (AB) pour vérifier : deux touchers sur A puis B
		await tapSeries(zone, WORK_WIN, [
			[2, 3],
			[8, 5]
		]);
		await expect(fig(page).getByTestId('droite-eleve')).toHaveCount(1);
		await validate(page);
		// Ni vert ni rouge : le trait est gris (classe de travail)
		await expect(fig(page).locator('.droite-travail')).toHaveCount(1);
		await expect(fig(page).locator('.droite-juste')).toHaveCount(0);
		await expect(page.locator('#contenu-principal')).toContainText('Ta figure de travail');
		await shootThemes(page, fig(page).locator('.droite-travail').first(), '1826-travail');
	});

	test('#1826 — Valider reste actif sans tracé, la correction dit « aucun tracé »', async ({
		page
	}) => {
		await openPreview(page, '1826 vide', WORK_STATEMENT, BLANKS);
		await figureZone(page);
		await page.getByRole('radio', { name: /Non/ }).click();
		await validate(page);
		await expect(page.locator('#contenu-principal')).toContainText('Ta figure de travail');
		await expect(page.locator('#contenu-principal')).toContainText('aucun tracé');
	});

	test('#1826 — éditeur : carte « Figure de travail — non notée » (outil), sans champ de réponse', async ({
		page
	}) => {
		const id = await openPreview(page, '1826 editeur', WORK_STATEMENT, BLANKS);
		await page.goto(`/dashboard/admin/questions/${id}/edit`);
		await page.waitForLoadState('networkidle');
		const card = page.getByTestId('carte-figure-de-travail');
		await expect(card).toBeVisible();
		await expect(card).toContainText('Figure de travail — non notée');
		await expect(card).toContainText('Outil : droite');
		expect(await card.locator('input, textarea, math-field').count()).toBe(0);
		await card.scrollIntoViewIfNeeded();
		await mkdir(SHOTS, { recursive: true });
		await page.screenshot({ path: `${SHOTS}/1826-editeur-carte-${projectName()}.png` });
	});

	test('#1826 — éditeur : `verifier:` écrit dans la figure de travail → l’erreur est dite sur la carte', async ({
		page
	}) => {
		const withVerifier = WORK_STATEMENT.replace(
			'outils: droite',
			'outils: droite\nverifier: droite_par A ; B'
		);
		expect(withVerifier).toContain('verifier: droite_par A ; B');
		await login(page, ADMIN.email, ADMIN.password);
		const response = await page.request.post('/api/questions/templates', {
			data: {
				type: 'fill_in_blanks',
				title: `Verifs4 ${projectName()} 1826 verifier`,
				grades: ['T_SPE'],
				level: 2,
				status: 'draft',
				delay: 60,
				variations: [{ statement: templateMarkdown(withVerifier), ...BLANKS }]
			}
		});
		const body = (await response.json()) as { template?: { id: string } };
		expect(response.status(), JSON.stringify(body)).toBe(201);
		const id = body.template?.id ?? '';
		expect(id).not.toBe('');
		decor.track(id);
		await page.goto(`/dashboard/admin/questions/${id}/edit`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('carte-figure-de-travail')).toContainText(
			'une figure de travail n’est pas notée : pas de verifier:'
		);
	});

	test('#1826 — fiche d’aide /aide-ecriture/blocs/figure-de-travail (prof) : exemple dessiné, sans erreur', async ({
		page
	}) => {
		await login(page, TEACHER.email, TEACHER.password);
		await gotoSettled(page, '/aide-ecriture/blocs/figure-de-travail');
		await expect(page.getByRole('heading', { level: 1, name: 'Figure de travail' })).toBeVisible();
		const example = page
			.locator('article')
			.filter({ hasText: 'Vérifier un alignement, puis répondre oui ou non' })
			.first();
		await expect(example.locator('figure svg').first()).toBeVisible();
		await expect(example).not.toContainText(/erreur|invalide/i);
	});
});
