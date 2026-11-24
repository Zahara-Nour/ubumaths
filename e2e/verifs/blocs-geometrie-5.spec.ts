import { expect, test, type Locator, type Page } from '@playwright/test';
import { figureACompleterEntry } from '../../src/lib/block-catalog/figure-a-completer';
import { templateMarkdown } from '../../src/lib/ubumark/index';
import { ADMIN, assertLocalServerEnv, login } from './helpers/carnet';
import { brouillons, isTouch, projectName, type Win } from './helpers/modele-brouillon';

/**
 * Blocs `figure-a-completer` à instruments de construction (tri des vérifications manuelles, paquet 5)
 * =====================================================================================================
 *
 * Reprend les lignes #2348, #2359, #2305, #2327, #2301, #2288, #2268 et #2271 de
 * `docs/wip/verifications-manuelles.md`. Décor et gestes : `helpers/modele-brouillon.ts`
 * (modèle brouillon « Verifs5 … » créé par l'API en admin, joué dans l'aperçu admin).
 *
 * Les blocs de départ sont les exemples de `/aide-ecriture/blocs/figure-a-completer`, lus dans
 * `src/lib/block-catalog/figure-a-completer.ts` (jamais recopiés).
 *
 * Ce que ces tests ne voient pas : la sensation au doigt (viser un repère « confortable »,
 * l'aimantation parmi les intersections), la lisibilité des graduations de 10 px au doigt.
 *
 * Captures à l'œil : `.captures/verifs/blocs-geometrie-5/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());

// Constantes

const SHOTS = '.captures/verifs/blocs-geometrie-5';
const decor = brouillons('Verifs5', SHOTS);
const { openPreview, figureZone, fig, tapFigure, validate, previewText, shootThemes } = decor;

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

/** Rayon du rapporteur : 0,35 du plus petit côté de la fenêtre (`protractorRadiusOf`) */
const rayonDe = (win: Win): number => 0.35 * Math.min(win.xMax - win.xMin, win.yMax - win.yMin);

async function press(page: Page, locator: Locator): Promise<void> {
	await locator.scrollIntoViewIfNeeded();
	if (isTouch()) await locator.tap();
	else await locator.click();
	void page;
}

/** Touche un repère : au toucher s'il est dans la figure, sinon au clavier (le bouton « Repère n ») */
async function toucherRepere(page: Page, zone: Locator, win: Win, at: Pt): Promise<void> {
	const dedans = at.x >= win.xMin && at.x <= win.xMax && at.y >= win.yMin && at.y <= win.yMax;
	if (dedans) {
		await tapFigure(zone, win, at.x, at.y);
		return;
	}
	const repere = page.getByRole('button', { name: /^Repère \d+$/ }).last();
	await repere.focus();
	await page.keyboard.press('Enter');
}

async function selectTool(page: Page, name: string): Promise<void> {
	const button = page.getByRole('button', { name, exact: true });
	await press(page, button);
	await expect(button).toHaveAttribute('aria-pressed', 'true');
}

/** Rapporteur : le centre, puis un point de la base ; `sens` -1 = après « Retourner » */
async function poserRapporteur(
	page: Page,
	zone: Locator,
	win: Win,
	centre: Pt,
	base: Pt
): Promise<void> {
	await selectTool(page, 'Rapporteur');
	await tapFigure(zone, win, centre.x, centre.y);
	await tapFigure(zone, win, base.x, base.y);
	await expect(page.getByTestId('rapporteur')).toHaveCount(1);
}

/** Pose le repère à `deg` (toucher au bord, puis ‹ › jusqu'à la graduation) ; rend le point du repère */
async function reperer(
	page: Page,
	zone: Locator,
	win: Win,
	centre: Pt,
	base: Pt,
	sens: 1 | -1,
	deg: number,
	auClavier = false
): Promise<Pt> {
	const radius = rayonDe(win);
	const angle = Math.atan2(base.y - centre.y, base.x - centre.x) + (sens * deg * Math.PI) / 180;
	const at = { x: centre.x + radius * Math.cos(angle), y: centre.y + radius * Math.sin(angle) };
	// Au clavier : le rapporteur a le focus, Maj + flèche = 10°, flèche = 1° (utile hors de la figure)
	if (auClavier) {
		await page.getByTestId('rapporteur').focus();
		for (let tens = 0; tens < Math.floor(deg / 10); tens++)
			await page.keyboard.press('Shift+ArrowRight');
		for (let ones = 0; ones < deg % 10; ones++) await page.keyboard.press('ArrowRight');
	} else {
		await tapFigure(zone, win, at.x, at.y);
	}
	const slider = page.getByTestId('rapporteur');
	for (let step = 0; step < 40; step++) {
		const now = Number(await slider.getAttribute('aria-valuenow'));
		if (now === deg) return at;
		await press(page, page.getByTestId(now < deg ? 'rapporteur-plus' : 'rapporteur-moins'));
	}
	expect(Number(await slider.getAttribute('aria-valuenow'))).toBe(deg);
	return at;
}

const cosSin = (deg: number): Pt => ({
	x: Math.cos((deg * Math.PI) / 180),
	y: Math.sin((deg * Math.PI) / 180)
});

/** Le rapporteur posé tient-il entier dans la boîte de la figure (et la page, sans défilement horizontal) ? */
async function rapporteurDansLaFigure(page: Page, label: string): Promise<void> {
	// Le rapporteur tourne en 300 ms quand on le retourne : mesurer une fois immobile
	let box = await page.getByTestId('rapporteur').boundingBox();
	for (let essai = 0; essai < 20; essai++) {
		await page.waitForTimeout(120);
		const suivante = await page.getByTestId('rapporteur').boundingBox();
		const stable =
			box !== null &&
			suivante !== null &&
			Math.abs(box.x - suivante.x) + Math.abs(box.y - suivante.y) < 0.5 &&
			Math.abs(box.width - suivante.width) < 0.5;
		box = suivante;
		if (stable) break;
	}
	const area = await fig(page).locator('svg').first().boundingBox();
	expect(box, `${label} : boîte du rapporteur`).not.toBeNull();
	expect(area, `${label} : boîte de la figure`).not.toBeNull();
	// Le rayon posé (0,35 de la fenêtre) est celui des graduations : le liseré du plastique, au-delà,
	// peut dépasser de quelques pour cent (mesuré : 4 % de la hauteur, jamais une graduation)
	const slack = 0.06 * Math.min(area!.width, area!.height);
	expect(box!.x, `${label} : bord gauche`).toBeGreaterThanOrEqual(area!.x - slack);
	expect(box!.y, `${label} : bord haut`).toBeGreaterThanOrEqual(area!.y - slack);
	expect(box!.x + box!.width, `${label} : bord droit`).toBeLessThanOrEqual(
		area!.x + area!.width + slack
	);
	expect(box!.y + box!.height, `${label} : bord bas`).toBeLessThanOrEqual(
		area!.y + area!.height + slack
	);
}

/** La figure corrigée dit « réponse juste » (texte pour lecteur d'écran de la figure) */
async function estJuste(page: Page): Promise<void> {
	await expect(fig(page).locator('p[role="status"]')).toContainText('réponse juste');
}

/** Figure sans zone de toucher (rapporteur déjà posé) : marque la carte jouée */
async function figureSansZone(page: Page): Promise<void> {
	const pose = page.locator('[data-testid="rapporteur-pose"]').locator('visible=true').first();
	await expect(pose).toBeAttached({ timeout: 30_000 });
	await pose.evaluate((el) =>
		el.closest('.figure-a-completer')?.setAttribute('data-verifs', 'carte')
	);
	await expect(fig(page)).toHaveCount(1);
	await pose.scrollIntoViewIfNeeded();
}

/** Pas de défilement horizontal de la page, et des boutons de 24 px au moins */
async function boutonsTiennent(page: Page, ids: string[]): Promise<void> {
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow, 'défilement horizontal de la page').toBeLessThanOrEqual(1);
	const viewport = page.viewportSize();
	for (const id of ids) {
		const box = await page.getByTestId(id).boundingBox();
		expect(box, id).not.toBeNull();
		expect(box!.width, `${id} : largeur`).toBeGreaterThanOrEqual(24);
		expect(box!.height, `${id} : hauteur`).toBeGreaterThanOrEqual(24);
		if (viewport) {
			expect(box!.x, `${id} : dans l'écran (gauche)`).toBeGreaterThanOrEqual(0);
			expect(box!.x + box!.width, `${id} : dans l'écran (droite)`).toBeLessThanOrEqual(
				viewport.width + 1
			);
		}
	}
}

// ============================================================================
// #2348 — Triangle par un côté et deux angles, au rapporteur
// ============================================================================

const TRI_BLOCK = exemple('Construire un triangle par un côté et deux angles (rapporteur)');
const TRI_WIN = fenetreDe(TRI_BLOCK);
const TRI_A: Pt = { x: 3, y: 2 };
const TRI_B: Pt = { x: 9, y: 2 };
const TRI_STATEMENT = `Construis le triangle $ABC$ tel que $\\widehat{CAB} = 40°$ et $\\widehat{ABC} = 65°$.\n\n${TRI_BLOCK}`;
/** C : AB = 6, angles 40° en A et 65° en B */
const TRI_C: Pt = (() => {
	const ac = (6 * Math.sin((65 * Math.PI) / 180)) / Math.sin((75 * Math.PI) / 180);
	const u = cosSin(40);
	return { x: TRI_A.x + ac * u.x, y: TRI_A.y + ac * u.y };
})();

/** Les deux droites tracées au rapporteur : en A (angle `degA`) puis en B (angle `degB`, retourné) */
async function deuxDroites(
	page: Page,
	zone: Locator,
	degA: number,
	degB: number,
	sensB: 1 | -1,
	reperesAuClavier = false
): Promise<{ reperes: [Pt, Pt] }> {
	await poserRapporteur(page, zone, TRI_WIN, TRI_A, TRI_B);
	const repereA = await reperer(page, zone, TRI_WIN, TRI_A, TRI_B, 1, degA);
	await selectTool(page, 'Règle');
	await tapFigure(zone, TRI_WIN, TRI_A.x, TRI_A.y);
	await tapFigure(zone, TRI_WIN, repereA.x, repereA.y);
	await expect(fig(page).getByTestId('droite-eleve')).toHaveCount(1);
	// En B : le rapporteur se repose, la base vers A, retourné pour passer au-dessus
	await selectTool(page, 'Rapporteur');
	await poserRapporteur(page, zone, TRI_WIN, TRI_B, TRI_A);
	if (sensB === -1) await press(page, page.getByTestId('rapporteur-retourner'));
	const repereB = await reperer(page, zone, TRI_WIN, TRI_B, TRI_A, sensB, degB, reperesAuClavier);
	// Le rapporteur n'est dessiné que pendant l'outil Rapporteur : c'est maintenant qu'il se mesure
	// (posé du côté « en dessous », il sort de la figure : seule la pose du bon côté est mesurée)
	if (sensB === -1) await rapporteurDansLaFigure(page, 'rapporteur en B');
	await boutonsTiennent(page, ['rapporteur-moins', 'rapporteur-plus', 'rapporteur-retourner']);
	await selectTool(page, 'Règle');
	await tapFigure(zone, TRI_WIN, TRI_B.x, TRI_B.y);
	await toucherRepere(page, zone, TRI_WIN, repereB);
	await expect(fig(page).getByTestId('droite-eleve')).toHaveCount(2);
	return { reperes: [repereA, repereB] };
}

test.describe('#2348 — triangle par un côté et deux angles', () => {
	test.describe.configure({ mode: 'serial' });

	test('#2348 — 40° en A, 65° en B (retourné), côtés au Segment, C au croisement → juste ; à 390 px le rapporteur et les boutons tiennent', async ({
		page
	}) => {
		await openPreview(page, '2348 juste', TRI_STATEMENT);
		const zone = await figureZone(page);
		const labels: string[] = [];
		for (const id of ['outil-rapporteur', 'outil-droite', 'outil-segment'])
			labels.push(((await page.getByTestId(id).textContent()) ?? '').trim());
		expect(labels).toEqual(['Rapporteur', 'Règle', 'Segment']);

		// Les deux droites, puis [AC] et [BC] jusqu'au croisement
		await deuxDroites(page, zone, 40, 65, -1);
		await selectTool(page, 'Segment');
		await tapFigure(zone, TRI_WIN, TRI_A.x, TRI_A.y);
		await tapFigure(zone, TRI_WIN, TRI_C.x, TRI_C.y);
		await tapFigure(zone, TRI_WIN, TRI_B.x, TRI_B.y);
		await tapFigure(zone, TRI_WIN, TRI_C.x, TRI_C.y);
		await expect(fig(page).getByTestId('segment-eleve')).toHaveCount(2);
		await validate(page);
		await estJuste(page);
		expect(await previewText(page)).not.toContain('placé à l’œil');
		await shootThemes(page, fig(page).first(), '2348-juste');
	});
	test('#2348 — côtés tracés sans repère, même pile sur C : « placé à l’œil : trace ses côtés avec le rapporteur »', async ({
		page
	}) => {
		await openPreview(page, '2348 oeil', TRI_STATEMENT);
		const zone = await figureZone(page);
		await selectTool(page, 'Segment');
		await tapFigure(zone, TRI_WIN, TRI_A.x, TRI_A.y);
		await tapFigure(zone, TRI_WIN, TRI_C.x, TRI_C.y);
		await tapFigure(zone, TRI_WIN, TRI_B.x, TRI_B.y);
		await tapFigure(zone, TRI_WIN, TRI_C.x, TRI_C.y);
		await validate(page);
		const text = await previewText(page);
		expect(text).toContain('placé à l’œil');
		expect(text).toContain('trace ses côtés avec le rapporteur');
	});

	test('#2348 — un angle de chaque côté de [AB] : « de part et d’autre »', async ({ page }) => {
		await openPreview(page, '2348 part et autre', TRI_STATEMENT);
		const zone = await figureZone(page);
		// 40° au-dessus en A ; 10° en B SANS retourner : en dessous, les deux droites se croisent
		// à gauche, vers (1,40 ; 0,66), dans la figure : [AC] et [BC] y sont tracés
		await deuxDroites(page, zone, 40, 10, 1);
		const c = { x: 1.403, y: 0.66 };
		await selectTool(page, 'Segment');
		await tapFigure(zone, TRI_WIN, TRI_A.x, TRI_A.y);
		await tapFigure(zone, TRI_WIN, c.x, c.y);
		await tapFigure(zone, TRI_WIN, TRI_B.x, TRI_B.y);
		await tapFigure(zone, TRI_WIN, c.x, c.y);
		await validate(page);
		expect(await previewText(page)).toContain('de part et d’autre');
	});

	test('#2348 — 115° au lieu de 65° : « mauvaise graduation », même quand les deux côtés ne se croisent pas dans la figure ; la correction : côtés en pointillés, angles codés 40° et 65°', async ({
		page
	}) => {
		await openPreview(page, '2348 graduation', TRI_STATEMENT);
		const zone = await figureZone(page);
		// 115° lu en B (retourné) : la droite coupe celle de A en (12,85 ; 10,3), hors de la fenêtre
		// 12 × 8 : on trace les côtés jusqu'aux repères, faute de croisement touchable
		const { reperes } = await deuxDroites(page, zone, 40, 115, -1);
		await selectTool(page, 'Segment');
		await tapFigure(zone, TRI_WIN, TRI_A.x, TRI_A.y);
		await tapFigure(zone, TRI_WIN, reperes[0].x, reperes[0].y);
		await tapFigure(zone, TRI_WIN, TRI_B.x, TRI_B.y);
		await tapFigure(zone, TRI_WIN, reperes[1].x, reperes[1].y);
		await validate(page);
		// La correction d'une réponse fausse : côtés en pointillés, angles codés
		const triangle = fig(page).getByTestId('bon-triangle');
		await expect(triangle).toHaveCount(1);
		const dashes = await fig(page)
			.getByTestId('bon-segment')
			.evaluateAll((els) => els.map((el) => getComputedStyle(el).strokeDasharray));
		expect(dashes.length, 'les côtés [AC] et [BC] justes').toBe(2);
		expect(
			dashes.every((d) => d !== 'none' && d !== ''),
			`pointillés : ${dashes}`
		).toBe(true);
		const angles = (await fig(page).getByTestId('bon-triangle-angle').allTextContents()).join(' ');
		expect(angles).toContain('40°');
		expect(angles).toContain('65°');
		await shootThemes(page, triangle, '2348-correction');
		// Attendu de la ligne : « mauvaise graduation », lue sur la direction du côté [BC] tracé,
		// sans C (C est hors figure) : écart E50 corrigé
		expect(await previewText(page)).toContain('mauvaise graduation');
	});
});

// ============================================================================
// #2348 (suite) — deux côtés et l'angle compris
// ============================================================================

const COMPRIS_BLOCK = exemple('Construire un triangle par deux côtés et l’angle compris');
const COMPRIS_WIN = fenetreDe(COMPRIS_BLOCK);

test.describe('#2348 — deux côtés et l’angle compris', () => {
	test('#2348 — repère à 50° en A, Règle, Report de u piqué en A, côtés → juste', async ({
		page
	}) => {
		await openPreview(
			page,
			'2348 compris',
			`Construis le triangle $ABC$ tel que $AC = 4$ cm et $\\widehat{CAB} = 50°$.\n\n${COMPRIS_BLOCK}`
		);
		const zone = await figureZone(page);
		await poserRapporteur(page, zone, COMPRIS_WIN, TRI_A, TRI_B);
		const repere = await reperer(page, zone, COMPRIS_WIN, TRI_A, TRI_B, 1, 50);
		await selectTool(page, 'Règle');
		await tapFigure(zone, COMPRIS_WIN, TRI_A.x, TRI_A.y);
		await tapFigure(zone, COMPRIS_WIN, repere.x, repere.y);
		// Report : les deux bouts de u, puis piquer en A
		await selectTool(page, 'Report');
		await tapFigure(zone, COMPRIS_WIN, 0.5, 7.5);
		await tapFigure(zone, COMPRIS_WIN, 4.5, 7.5);
		await tapFigure(zone, COMPRIS_WIN, TRI_A.x, TRI_A.y);
		await expect(fig(page).getByTestId('report-eleve')).toHaveCount(1);
		const u = cosSin(50);
		const c = { x: TRI_A.x + 4 * u.x, y: TRI_A.y + 4 * u.y };
		await selectTool(page, 'Segment');
		await tapFigure(zone, COMPRIS_WIN, TRI_A.x, TRI_A.y);
		await tapFigure(zone, COMPRIS_WIN, c.x, c.y);
		await tapFigure(zone, COMPRIS_WIN, TRI_B.x, TRI_B.y);
		await tapFigure(zone, COMPRIS_WIN, c.x, c.y);
		await validate(page);
		await estJuste(page);
		expect(await previewText(page)).not.toContain('placé à l’œil');
	});
});

// ============================================================================
// Outils communs aux angles à mesurer ou à construire
// ============================================================================

const O: Pt = { x: 4, y: 3 };
const A_DROITE: Pt = { x: 9, y: 3 };
/** Le A de l'exemple « Construire un angle de mesure donnée » (le côté [OA) n'est pas horizontal) */
const A_ANGLE: Pt = { x: 9, y: 4 };
const ANGLE_WIN = fenetreDe(exemple('Construire un angle de mesure donnée (rapporteur)'));

/** Les chiffres tapés dans la case « Mesure de l'angle » (au clavier : un caractère à la fois) */
async function taperMesure(page: Page, texte: string): Promise<Locator> {
	const input = page.getByTestId('mesure-angle').first();
	await input.scrollIntoViewIfNeeded();
	await input.fill('');
	await input.pressSequentially(texte);
	return input;
}

// ============================================================================
// #2327 — Mesurer un angle au rapporteur
// ============================================================================

const MESURE_BLOCK = exemple('Mesurer un angle (rapporteur)');
const MESURE_STATEMENT = `Mesure l’angle $\\widehat{AOB}$ au rapporteur.\n\n${MESURE_BLOCK}`;

test.describe('#2327 — mesurer un angle au rapporteur', () => {
	test('#2327 — rapporteur posé en O sur [OA), mesure lue et tapée : 50 → juste ; chiffres seulement, 3 au plus ; « 50,5 » garde 50 et dit « Au degré près »', async ({
		page
	}) => {
		await openPreview(page, '2327 juste', MESURE_STATEMENT);
		const zone = await figureZone(page);
		// Un seul outil : le rapporteur, déjà choisi
		await expect(fig(page).getByTestId('outil-rapporteur')).toHaveCount(0);
		await tapFigure(zone, ANGLE_WIN, O.x, O.y);
		await tapFigure(zone, ANGLE_WIN, A_DROITE.x, A_DROITE.y);
		await expect(page.getByTestId('rapporteur')).toHaveCount(1);
		await rapporteurDansLaFigure(page, 'rapporteur posé en O');
		// Lire : les repères du rapporteur ne sont pas notés ; la mesure se tape sous la figure
		const input = await taperMesure(page, 'a1b2c3d4');
		await expect(input).toHaveValue('123');
		// « 50,5 » collé d'un coup : les chiffres d'avant la virgule
		await input.fill('50,5');
		await expect(input).toHaveValue('50');
		await expect(page.getByTestId('mesure-consigne')).toHaveText(
			'Au degré près : tape un nombre entier.'
		);
		// Une ligne : l'étiquette, la case et le « ° » à la même hauteur
		const rows = await page
			.locator('.figure-a-completer-mesure')
			.first()
			.evaluate((label) =>
				[...label.children].map((child) => {
					const box = child.getBoundingClientRect();
					return Math.round(box.top + box.height / 2);
				})
			);
		expect(Math.max(...rows) - Math.min(...rows), `centres verticaux ${rows}`).toBeLessThanOrEqual(
			6
		);
		await validate(page);
		await expect(page.locator('input[data-testid="mesure-angle"]').first()).toBeDisabled();
		expect(await previewText(page)).not.toContain('Au degré près : tape');
		await estJuste(page);
		await shootThemes(page, fig(page).first(), '2327-juste');
	});

	test('#2327 — 130 au lieu de 50 : « mauvaise graduation », puis l’arc codé 50° à la correction ; case désactivée', async ({
		page
	}) => {
		await openPreview(page, '2327 faux', MESURE_STATEMENT);
		const zone = await figureZone(page);
		await tapFigure(zone, ANGLE_WIN, O.x, O.y);
		await tapFigure(zone, ANGLE_WIN, A_DROITE.x, A_DROITE.y);
		await taperMesure(page, '130');
		await validate(page);
		expect(await previewText(page)).toContain('mauvaise graduation');
		await expect(fig(page).getByTestId('bon-angle')).toHaveCount(1);
		await expect(fig(page).getByTestId('bon-angle')).toContainText('50°');
		await expect(page.locator('input[data-testid="mesure-angle"]').first()).toBeDisabled();
		await shootThemes(page, fig(page).getByTestId('bon-angle'), '2327-correction');
	});
});

// ============================================================================
// #2359 — Mesurer un angle, rapporteur déjà posé
// ============================================================================

const POSE_BLOCK = exemple('Lire un angle sur un rapporteur déjà posé');
const POSE_STATEMENT = `Lis la mesure de l’angle $\\widehat{AOB}$.\n\n${POSE_BLOCK}`;

test.describe('#2359 — rapporteur déjà posé', () => {
	test('#2359 — posé dès l’ouverture, du côté de B, entier dans la figure ; ni palette ni Effacer ; toucher ne fait rien ; 50 → juste', async ({
		page
	}) => {
		await openPreview(page, '2359 pose', POSE_STATEMENT);
		await figureSansZone(page);
		const pose = fig(page).getByTestId('rapporteur-pose');
		await expect(pose).toHaveCount(1);
		// Corps du côté de B (au-dessus de [OA)) : son centre est plus haut que O
		const box = (await pose.boundingBox())!;
		const area = (await fig(page).locator('svg').first().boundingBox())!;
		expect(box.x).toBeGreaterThanOrEqual(area.x - 1.5);
		expect(box.x + box.width).toBeLessThanOrEqual(area.x + area.width + 1.5);
		expect(box.y).toBeGreaterThanOrEqual(area.y - 1.5);
		expect(box.y + box.height).toBeLessThanOrEqual(area.y + area.height + 1.5);
		const oY = area.y + (area.height * (ANGLE_WIN.yMax - O.y)) / (ANGLE_WIN.yMax - ANGLE_WIN.yMin);
		expect(box.y + box.height / 2, 'le corps est au-dessus de [OA) (côté de B)').toBeLessThan(oY);
		// Ni palette, ni Effacer, ni consigne d'outil autre que « Lis la mesure… »
		await expect(page.getByRole('button', { name: 'Effacer', exact: true })).toHaveCount(0);
		await expect(fig(page).locator('[data-testid^="outil-"]')).toHaveCount(0);
		await expect(page.getByTestId('consigne-outil')).toContainText('Lis la mesure');
		// Toucher la figure ne trace rien
		for (const [x, y] of [
			[6, 5],
			[7, 2]
		]) {
			const px = area.x + ((x - ANGLE_WIN.xMin) / (ANGLE_WIN.xMax - ANGLE_WIN.xMin)) * area.width;
			const py = area.y + ((ANGLE_WIN.yMax - y) / (ANGLE_WIN.yMax - ANGLE_WIN.yMin)) * area.height;
			if (isTouch()) await page.touchscreen.tap(px, py);
			else await page.mouse.click(px, py);
		}
		// Un toucher qui ne trace rien n'a pas d'effet à attendre : on laisse deux images au navigateur
		// pour traiter les touchers (sinon « 0 tracé » serait vrai avant même qu'ils soient pris en compte)
		await page.evaluate(
			() =>
				new Promise<void>((fin) => requestAnimationFrame(() => requestAnimationFrame(() => fin())))
		);
		await expect(pose, 'le rapporteur posé reste en place').toHaveCount(1);
		await expect(fig(page).getByTestId('point-eleve')).toHaveCount(0);
		await expect(fig(page).getByTestId('segment-eleve')).toHaveCount(0);
		await expect(fig(page).getByTestId('droite-eleve')).toHaveCount(0);
		// À 390 px : le rapporteur reste lisible (au moins la moitié de la largeur de la figure)
		expect(box.width, 'largeur du rapporteur posé').toBeGreaterThan(area.width * 0.45);
		await taperMesure(page, '50');
		await validate(page);
		await estJuste(page);
		await shootThemes(page, fig(page).first(), '2359-juste');
	});

	test('#2359 — 130 au lieu de 50 : « mauvaise graduation » ; à la correction l’arc codé 50° et le rapporteur toujours posé', async ({
		page
	}) => {
		await openPreview(page, '2359 faux', POSE_STATEMENT);
		await figureSansZone(page);
		await taperMesure(page, '130');
		await validate(page);
		expect(await previewText(page)).toContain('mauvaise graduation');
		await expect(fig(page).getByTestId('bon-angle')).toContainText('50°');
		await expect(fig(page).getByTestId('rapporteur-pose')).toHaveCount(1);
		await shootThemes(page, fig(page).getByTestId('bon-angle'), '2359-correction');
	});

	test('#2359 — `mesure BOA, rapporteur posé` : la base passe sur [OB) (autre pose que AOB), toujours entier dans la figure', async ({
		page
	}) => {
		await openPreview(page, '2359 BOA', POSE_STATEMENT);
		await figureSansZone(page);
		const area = (await fig(page).locator('svg').first().boundingBox())!;
		const aob = (await fig(page).getByTestId('rapporteur-pose').boundingBox())!;
		await openPreview(
			page,
			'2359 BOA bis',
			POSE_STATEMENT.replace('mesure AOB, rapporteur posé', 'mesure BOA, rapporteur posé'),
			{},
			true
		);
		await figureSansZone(page);
		const pose = fig(page).getByTestId('rapporteur-pose');
		await expect(pose).toHaveCount(1);
		const boa = (await pose.boundingBox())!;
		expect(
			Math.abs(boa.y - aob.y) + Math.abs(boa.height - aob.height),
			'pose différente de AOB'
		).toBeGreaterThan(8);
		expect(boa.x).toBeGreaterThanOrEqual(area.x - 1.5);
		expect(boa.x + boa.width).toBeLessThanOrEqual(area.x + area.width + 1.5);
		expect(boa.y).toBeGreaterThanOrEqual(area.y - 1.5);
		await taperMesure(page, '50');
		await validate(page);
		await estJuste(page);
	});
});

// ============================================================================
// #2301 — Angle au rapporteur (construire un angle de mesure donnée)
// ============================================================================

const ANGLE_BLOCK = exemple('Construire un angle de mesure donnée (rapporteur)');
const ANGLE_STATEMENT = `Construis l’angle $\\widehat{AOy}$ de mesure $50°$.\n\n${ANGLE_BLOCK}`;

test.describe('#2301 — angle au rapporteur', () => {
	test.describe.configure({ mode: 'serial' });

	test('#2301 — palette Rapporteur · Segment ; repère à 50, Segment de O au repère → juste ; boutons de 24 px au moins', async ({
		page
	}) => {
		await openPreview(page, '2301 juste', ANGLE_STATEMENT);
		const zone = await figureZone(page);
		const labels: string[] = [];
		for (const id of ['outil-rapporteur', 'outil-segment'])
			labels.push(((await page.getByTestId(id).textContent()) ?? '').trim());
		expect(labels).toEqual(['Rapporteur', 'Segment']);
		await expect(fig(page).locator('[data-testid^="outil-"]')).toHaveCount(2);
		await poserRapporteur(page, zone, ANGLE_WIN, O, A_ANGLE);
		const repere = await reperer(page, zone, ANGLE_WIN, O, A_ANGLE, 1, 50);
		await rapporteurDansLaFigure(page, 'rapporteur posé');
		await boutonsTiennent(page, ['rapporteur-moins', 'rapporteur-plus', 'rapporteur-retourner']);
		await selectTool(page, 'Segment');
		await tapFigure(zone, ANGLE_WIN, O.x, O.y);
		await tapFigure(zone, ANGLE_WIN, repere.x, repere.y);
		await validate(page);
		await estJuste(page);
		await shootThemes(page, fig(page).first(), '2301-juste');
	});

	test('#2301 — repère à 130 : « mauvaise graduation », puis [Oy) en pointillés et l’arc codé « 50° »', async ({
		page
	}) => {
		await openPreview(page, '2301 130', ANGLE_STATEMENT);
		const zone = await figureZone(page);
		await poserRapporteur(page, zone, ANGLE_WIN, O, A_ANGLE);
		const repere = await reperer(page, zone, ANGLE_WIN, O, A_ANGLE, 1, 130);
		await selectTool(page, 'Segment');
		await tapFigure(zone, ANGLE_WIN, O.x, O.y);
		await tapFigure(zone, ANGLE_WIN, repere.x, repere.y);
		await validate(page);
		expect(await previewText(page)).toContain('mauvaise graduation');
		await expect(fig(page).getByTestId('bon-angle')).toContainText('50°');
		const dashes = await fig(page)
			.getByTestId('bon-segment')
			.evaluateAll((els) => els.map((el) => getComputedStyle(el).strokeDasharray));
		expect(dashes.length, '[Oy) tracé à la correction').toBeGreaterThan(0);
		expect(
			dashes.every((d) => d !== 'none' && d !== ''),
			`pointillés : ${dashes}`
		).toBe(true);
		await shootThemes(page, fig(page).getByTestId('bon-angle'), '2301-correction');
	});

	test('#2301 — Retourner, repère à 50 sous [OA), Segment → juste aussi', async ({ page }) => {
		await openPreview(page, '2301 retourne', ANGLE_STATEMENT);
		const zone = await figureZone(page);
		await poserRapporteur(page, zone, ANGLE_WIN, O, A_ANGLE);
		await press(page, page.getByTestId('rapporteur-retourner'));
		const repere = await reperer(page, zone, ANGLE_WIN, O, A_ANGLE, -1, 50);
		expect(repere.y, 'le repère est sous [OA)').toBeLessThan(O.y);
		await selectTool(page, 'Segment');
		await tapFigure(zone, ANGLE_WIN, O.x, O.y);
		await tapFigure(zone, ANGLE_WIN, repere.x, repere.y);
		await validate(page);
		await estJuste(page);
	});

	test(
		'#2301 — au clavier : le rapporteur prend le focus, flèches ±1°, Maj + flèches ±10°',
		{ tag: '@bureau' },
		async ({ page }) => {
			await openPreview(page, '2301 clavier', ANGLE_STATEMENT);
			const zone = await figureZone(page);
			await poserRapporteur(page, zone, ANGLE_WIN, O, A_ANGLE);
			const slider = page.getByTestId('rapporteur');
			await slider.focus();
			await expect(slider).toBeFocused();
			const valeur = async (): Promise<number> =>
				Number(await slider.getAttribute('aria-valuenow'));
			await page.keyboard.press('ArrowRight');
			await expect.poll(valeur).toBe(1);
			await page.keyboard.press('ArrowUp');
			await expect.poll(valeur).toBe(2);
			await page.keyboard.press('Shift+ArrowRight');
			await expect.poll(valeur).toBe(12);
			await page.keyboard.press('Shift+ArrowRight');
			await page.keyboard.press('Shift+ArrowRight');
			await expect.poll(valeur).toBe(32);
			await page.keyboard.press('ArrowLeft');
			await expect.poll(valeur).toBe(31);
			await page.keyboard.press('Shift+ArrowLeft');
			await expect.poll(valeur).toBe(21);
			await page.keyboard.press('Shift+ArrowDown');
			await expect.poll(valeur).toBe(11);
		}
	);
});

// ============================================================================
// #2305 — Rapporteur près du bord
// ============================================================================

test.describe('#2305 — rapporteur près du bord', () => {
	test('#2305 — O (4 ; 3) : le rapporteur tient entier dans la figure, retourné ou non, et garde la même taille relative', async ({
		page
	}) => {
		await openPreview(page, '2305 bord', ANGLE_STATEMENT);
		const zone = await figureZone(page);
		await poserRapporteur(page, zone, ANGLE_WIN, O, A_ANGLE);
		await rapporteurDansLaFigure(page, 'non retourné');
		const area = (await fig(page).locator('svg').first().boundingBox())!;
		const box = (await page.getByTestId('rapporteur').boundingBox())!;
		// Même taille d'un écran à l'autre : 2 × 0,35 × 8 = 5,6 unités sur 10 de large
		const ratio = box.width / area.width;
		expect(
			ratio,
			`largeur du rapporteur / largeur de la figure = ${ratio.toFixed(2)}`
		).toBeGreaterThan(0.45);
		expect(ratio).toBeLessThan(0.65);
		await press(page, page.getByTestId('rapporteur-retourner'));
		await rapporteurDansLaFigure(page, 'retourné');
		const retourne = (await page.getByTestId('rapporteur').boundingBox())!;
		expect(retourne.width / area.width).toBeCloseTo(ratio, 1);
		await shootThemes(page, page.getByTestId('rapporteur'), '2305-retourne');
	});

	test('#2305 — O près du bord (0,5 ; 3) : refus à la publication « le rapporteur posé en O sort de la figure… » ; O (4 ; 1), un côté tient : publiable', async ({
		page
	}) => {
		await login(page, ADMIN.email, ADMIN.password);
		// La bonne réponse pour O (4 ; 1), A (9 ; 1) : repère à 50° (rayon 2,8) et le côté jusqu'à lui
		const bout = {
			x: 4 + 2.8 * Math.cos((Math.PI * 50) / 180),
			y: 1 + 2.8 * Math.sin((Math.PI * 50) / 180)
		};
		const reponse50 = `repere(4;1;9;1;2.8;50;1)|segment(4;1;${bout.x};${bout.y})`;
		const publier = async (o: string, a: string, nom: string) => {
			const bloc = ANGLE_BLOCK.replace('O = point(4, 3)', `O = point(${o})`).replace(
				'A = point(9, 4)',
				`A = point(${a})`
			);
			const reponse = await page.request.post('/api/questions/templates', {
				data: {
					type: 'fill_in_blanks',
					title: `Verifs5 ${projectName()} 2305 ${nom}`,
					grades: ['T_SPE'],
					level: 2,
					status: 'published',
					delay: 60,
					variations: [{ statement: templateMarkdown(`Construis l’angle.\n\n${bloc}`) }],
					testSpecs: [
						{
							description: 'angle juste',
							variables: {},
							answers: [reponse50],
							expected: { status: 'correct' }
						}
					]
				}
			});
			const corps = (await reponse.json()) as { template?: { id: string }; errors?: string[] };
			if (corps.template?.id) decor.track(corps.template.id);
			return { status: reponse.status(), corps };
		};
		const refus = await publier('0.5, 3', '5.5, 3', 'refus');
		expect(refus.status, JSON.stringify(refus.corps)).toBe(400);
		expect(JSON.stringify(refus.corps)).toContain('le rapporteur posé en O sort de la figure');
		const ok = await publier('4, 1', '9, 1', 'un-cote');
		expect(ok.status, JSON.stringify(ok.corps)).toBe(201);
	});
});

// ============================================================================
// Outils communs aux constructions de proche en proche
// ============================================================================

/** Les deux points d'intersection de deux cercles (centre, rayon) */
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

const dist = (p: Pt, q: Pt): number => Math.hypot(p.x - q.x, p.y - q.y);

/** Une suite de touchers, chacun un point (x ; y) de la fenêtre */
async function toucher(zone: Locator, win: Win, ...points: Pt[]): Promise<void> {
	for (const point of points) await tapFigure(zone, win, point.x, point.y);
}

// ============================================================================
// #2288 — Point construit de proche en proche
// ============================================================================

const SYM_BLOCK = exemple('Construire le symétrique d’un point sur papier uni');
const SYM_WIN = fenetreDe(SYM_BLOCK);
const MED_BLOCK = exemple('Construire la médiatrice d’un segment');
const MED_WIN = fenetreDe(MED_BLOCK);
const PARA_BLOCK = exemple('Placer le 4e sommet d’un parallélogramme');
const PARA_WIN = fenetreDe(PARA_BLOCK);

test.describe('#2288 — point construit de proche en proche', () => {
	test('#2288 — symétrique : deux compas piqués n’importe où sur l’axe, ouverts jusqu’à A, puis le point à l’autre intersection → juste', async ({
		page
	}) => {
		await openPreview(page, '2288 symetrique', `Construis le symétrique de $A$.\n\n${SYM_BLOCK}`);
		const zone = await figureZone(page);
		const a: Pt = { x: 2, y: 5 };
		await selectTool(page, 'Compas');
		// Piqués en (2 ; 2) puis (6 ; 6), deux points quelconques de l'axe y = x
		await toucher(zone, SYM_WIN, { x: 2, y: 2 }, a, { x: 6, y: 6 }, a);
		await expect(fig(page).getByTestId('cercle-eleve')).toHaveCount(2);
		await selectTool(page, 'Point');
		await toucher(zone, SYM_WIN, { x: 5, y: 2 });
		await validate(page);
		await expect(fig(page).locator('.point-juste')).toHaveCount(1);
	});

	test('#2288 — médiatrice : le même Report, à un écartement quelconque, piqué en A puis en B, puis la règle par les intersections → juste', async ({
		page
	}) => {
		await openPreview(
			page,
			'2288 mediatrice',
			`Construis la médiatrice de $[AB]$.\n\n${MED_BLOCK}`
		);
		const zone = await figureZone(page);
		const a: Pt = { x: 3, y: 4 };
		const b: Pt = { x: 6, y: 5 };
		await selectTool(page, 'Report');
		// Écartement pris sur du papier uni : 3 unités, plus que la moitié de [AB]
		await toucher(zone, MED_WIN, { x: 1, y: 1 }, { x: 4, y: 1 }, a, b);
		await expect(fig(page).getByTestId('report-eleve')).toHaveCount(2);
		const [p, q] = croisement(a, 3, b, 3);
		await selectTool(page, 'Règle');
		await toucher(zone, MED_WIN, p, q);
		await validate(page);
		await estJuste(page);
		expect(await previewText(page)).not.toContain('à l’œil');
	});

	test('#2288 — 4e sommet « à la 6e » : deux parallèles à l’équerre (par C, par A), D à leur croisement → juste', async ({
		page
	}) => {
		await openPreview(page, '2288 parallèles', `Place le 4e sommet $D$.\n\n${PARA_BLOCK}`);
		const zone = await figureZone(page);
		const a: Pt = { x: 2, y: 2 };
		const b: Pt = { x: 7, y: 2 };
		const c: Pt = { x: 8, y: 6 };
		// (AB), une perpendiculaire en un point quelconque, puis la parallèle par C
		await selectTool(page, 'Règle');
		await toucher(zone, PARA_WIN, a, b);
		await selectTool(page, 'Équerre');
		await toucher(zone, PARA_WIN, { x: 4.5, y: 2 }, { x: 5.5, y: 2 });
		await expect(fig(page).getByTestId('droite-eleve')).toHaveCount(2);
		await toucher(zone, PARA_WIN, { x: 5.5, y: 4 }, c);
		await expect(fig(page).getByTestId('droite-eleve')).toHaveCount(3);
		// (BC), une perpendiculaire en un point quelconque, puis la parallèle par A
		await selectTool(page, 'Règle');
		await toucher(zone, PARA_WIN, b, c);
		await selectTool(page, 'Équerre');
		await toucher(zone, PARA_WIN, { x: 7.5, y: 4 }, { x: 7.25, y: 3 });
		await expect(fig(page).getByTestId('droite-eleve')).toHaveCount(5);
		await toucher(zone, PARA_WIN, { x: 5.65, y: 3.4 }, a);
		await expect(fig(page).getByTestId('droite-eleve')).toHaveCount(6);
		await selectTool(page, 'Point');
		await toucher(zone, PARA_WIN, { x: 3, y: 6 });
		await validate(page);
		await expect(fig(page).locator('.point-juste')).toHaveCount(1);
		await shootThemes(page, fig(page).first(), '2288-parallelogramme');
	});

	test('#2288 — D au croisement de deux droites tracées à l’œil : « Ton point est placé à l’œil… »', async ({
		page
	}) => {
		await openPreview(page, '2288 oeil', `Place le 4e sommet $D$.\n\n${PARA_BLOCK}`);
		const zone = await figureZone(page);
		await selectTool(page, 'Règle');
		// y = 6 par C, et la droite par A qui passe pile par (3 ; 6) : deux droites sans construction
		await toucher(zone, PARA_WIN, { x: 8, y: 6 }, { x: 5, y: 6 }, { x: 2, y: 2 }, { x: 2.5, y: 4 });
		await expect(fig(page).getByTestId('droite-eleve')).toHaveCount(2);
		await selectTool(page, 'Point');
		await toucher(zone, PARA_WIN, { x: 3, y: 6 });
		await validate(page);
		expect(await previewText(page)).toContain('Ton point est placé à l’œil');
	});
});

// ============================================================================
// #2268 — Cercle circonscrit à construire
// ============================================================================

const CIRC_BLOCK = exemple('Construire le cercle circonscrit à un triangle');
const CIRC_WIN = fenetreDe(CIRC_BLOCK);
const CA: Pt = { x: 3, y: 4 };
const CB: Pt = { x: 7, y: 4 };
const CC: Pt = { x: 4, y: 7 };
/** Le centre du cercle circonscrit à ABC : (5 ; 5) */
const CENTRE: Pt = { x: 5, y: 5 };
const CIRC_STATEMENT = `Construis le cercle circonscrit au triangle $ABC$.\n\n${CIRC_BLOCK}`;

/** Les quatre compas, puis la règle par chaque paire d'intersections : deux médiatrices construites */
async function construireMediatrices(page: Page, zone: Locator): Promise<void> {
	await selectTool(page, 'Compas');
	await toucher(zone, CIRC_WIN, CA, CB, CB, CA, CA, CC, CC, CA);
	await expect(fig(page).getByTestId('cercle-eleve')).toHaveCount(4);
	const [p1, p2] = croisement(CA, dist(CA, CB), CB, dist(CA, CB));
	const [q1, q2] = croisement(CA, dist(CA, CC), CC, dist(CA, CC));
	await selectTool(page, 'Règle');
	await toucher(zone, CIRC_WIN, p1, p2, q1, q2);
	await expect(fig(page).getByTestId('droite-eleve')).toHaveCount(2);
}

test.describe('#2268 — cercle circonscrit à construire', () => {
	test('#2268 — palette Règle · Équerre · Compas ; quatre compas, deux règles, compas piqué au croisement ouvert jusqu’à A → juste', async ({
		page
	}) => {
		await openPreview(page, '2268 juste', CIRC_STATEMENT);
		const zone = await figureZone(page);
		const labels: string[] = [];
		for (const id of ['outil-droite', 'outil-equerre', 'outil-compas'])
			labels.push(((await page.getByTestId(id).textContent()) ?? '').trim());
		expect(labels).toEqual(['Règle', 'Équerre', 'Compas']);
		await construireMediatrices(page, zone);
		await selectTool(page, 'Compas');
		await toucher(zone, CIRC_WIN, CENTRE, CA);
		await expect(fig(page).getByTestId('cercle-eleve')).toHaveCount(5);
		await validate(page);
		await estJuste(page);
		expect(await previewText(page)).not.toContain('à l’œil');
		await shootThemes(page, fig(page).first(), '2268-juste');
	});

	test('#2268 — cercle centré à l’œil : « Ton cercle est tracé à l’œil… », puis le cercle et son centre en pointillés et deux médiatrices en traits fins', async ({
		page
	}) => {
		await openPreview(page, '2268 oeil', CIRC_STATEMENT);
		const zone = await figureZone(page);
		await selectTool(page, 'Compas');
		// Centre (5,3 ; 5,2) posé sur du papier nu, ouvert jusqu'à A
		await toucher(zone, CIRC_WIN, { x: 5.3, y: 5.2 }, CA);
		await validate(page);
		expect(await previewText(page)).toContain('Ton cercle est tracé à l’œil');
		await expect(fig(page).getByTestId('bon-cercle')).toHaveCount(1);
		await expect(fig(page).getByTestId('bon-cercle-mediatrice')).toHaveCount(2);
		const dashes = await fig(page)
			.getByTestId('bon-cercle')
			.locator('circle')
			.evaluateAll((els) => els.map((el) => getComputedStyle(el).strokeDasharray));
		expect(
			dashes.some((d) => d !== 'none' && d !== ''),
			`pointillés : ${dashes}`
		).toBe(true);
		await shootThemes(page, fig(page).getByTestId('bon-cercle'), '2268-correction');
	});

	test('#2268 — bon centre, compas ouvert à la main : « Ton cercle a le bon centre… »', async ({
		page
	}) => {
		await openPreview(page, '2268 bon centre', CIRC_STATEMENT);
		const zone = await figureZone(page);
		await construireMediatrices(page, zone);
		await selectTool(page, 'Compas');
		// Piqué au croisement des deux médiatrices, ouvert sur du papier nu (rayon 2,3 au lieu de √5)
		await toucher(zone, CIRC_WIN, CENTRE, { x: 7.3, y: 5.4 });
		await validate(page);
		expect(await previewText(page)).toContain('Ton cercle a le bon centre');
	});

	test(
		'#2268 — au clavier : le compas piqué au croisement (bouton « Intersection »), ouvert jusqu’à A (bouton « Point A ») → juste',
		{ tag: '@bureau' },
		async ({ page }) => {
			await openPreview(page, '2268 clavier', CIRC_STATEMENT);
			const zone = await figureZone(page);
			await construireMediatrices(page, zone);
			await selectTool(page, 'Compas');
			// Les intersections sont des boutons : celui qui est au centre (5 ; 5)
			const box = (await zone.boundingBox())!;
			const voulu = {
				x: box.x + ((CENTRE.x - CIRC_WIN.xMin) / (CIRC_WIN.xMax - CIRC_WIN.xMin)) * box.width,
				y: box.y + ((CIRC_WIN.yMax - CENTRE.y) / (CIRC_WIN.yMax - CIRC_WIN.yMin)) * box.height
			};
			const cibles = page.getByRole('button', { name: /^Intersection \d+$/ });
			const total = await cibles.count();
			expect(total, 'les intersections sont proposées au clavier').toBeGreaterThan(4);
			let meilleur = -1;
			let ecart = Infinity;
			for (let index = 0; index < total; index++) {
				const at = await cibles.nth(index).boundingBox();
				if (!at) continue;
				const d = Math.hypot(at.x + at.width / 2 - voulu.x, at.y + at.height / 2 - voulu.y);
				if (d < ecart) {
					ecart = d;
					meilleur = index;
				}
			}
			expect(ecart, 'une intersection à moins de 6 px du centre').toBeLessThan(6);
			await cibles.nth(meilleur).focus();
			await page.keyboard.press('Enter');
			await page.getByRole('button', { name: 'Point A', exact: true }).focus();
			await page.keyboard.press('Enter');
			await expect(fig(page).getByTestId('cercle-eleve')).toHaveCount(5);
			await validate(page);
			await estJuste(page);
		}
	);
});

// ============================================================================
// #2271 — Triangle de trois longueurs et 4e sommet
// ============================================================================

const TROIS_BLOCK = exemple('Construire un triangle de trois longueurs données');
const TROIS_WIN = fenetreDe(TROIS_BLOCK);
const T_A: Pt = { x: 2, y: 2 };
const T_B: Pt = { x: 8, y: 2 };
const U_BOUTS: [Pt, Pt] = [
	{ x: 1, y: 8 },
	{ x: 5, y: 8 }
];
const V_BOUTS: [Pt, Pt] = [
	{ x: 7, y: 8 },
	{ x: 10, y: 8 }
];
/** C : AC = 4, BC = 3, AB = 6 (l'un des deux triangles) */
const T_C: Pt = croisement(T_A, 4, T_B, 3)[1];
const TROIS_STATEMENT = `Construis le triangle $ABC$ tel que $AC = 4$ cm et $BC = 3$ cm.\n\n${TROIS_BLOCK}`;

test.describe('#2271 — triangle de trois longueurs', () => {
	test('#2271 — Report : les deux bouts de u, piqué en A ; retoucher Report, bouts de v, piqué en B ; côtés jusqu’à l’intersection → juste', async ({
		page
	}) => {
		await openPreview(page, '2271 juste', TROIS_STATEMENT);
		const zone = await figureZone(page);
		const labels: string[] = [];
		for (const id of ['outil-segment', 'outil-compas', 'outil-report', 'outil-droite'])
			labels.push(((await page.getByTestId(id).textContent()) ?? '').trim());
		expect(labels).toEqual(['Segment', 'Compas', 'Report', 'Règle']);
		await selectTool(page, 'Report');
		// La consigne dit de toucher les deux bouts de la longueur
		await expect(page.getByTestId('consigne-outil').first()).toContainText('deux bouts');
		await toucher(zone, TROIS_WIN, ...U_BOUTS, T_A);
		await expect(page.getByTestId('consigne-outil').first()).toContainText(
			'Pour une autre longueur, touche Report'
		);
		await selectTool(page, 'Report');
		await toucher(zone, TROIS_WIN, ...V_BOUTS, T_B);
		await expect(fig(page).getByTestId('report-eleve')).toHaveCount(2);
		await selectTool(page, 'Segment');
		await toucher(zone, TROIS_WIN, T_A, T_C, T_B, T_C);
		await expect(fig(page).getByTestId('segment-eleve')).toHaveCount(2);
		await validate(page);
		await estJuste(page);
		await shootThemes(page, fig(page).first(), '2271-juste');
	});

	test('#2271 — sommet posé à l’œil : « Ton sommet C est placé à l’œil… », puis côtés en pointillés, arcs fins et longueurs codées', async ({
		page
	}) => {
		await openPreview(page, '2271 oeil', TROIS_STATEMENT);
		const zone = await figureZone(page);
		await selectTool(page, 'Segment');
		await toucher(zone, TROIS_WIN, T_A, T_C, T_B, T_C);
		await validate(page);
		expect(await previewText(page)).toContain('Ton sommet C est placé à l’œil');
		const triangle = fig(page).getByTestId('bon-triangle');
		await expect(triangle).toHaveCount(1);
		const dashes = await fig(page)
			.getByTestId('bon-segment')
			.evaluateAll((els) => els.map((el) => getComputedStyle(el).strokeDasharray));
		expect(dashes.length, 'les deux côtés justes').toBe(2);
		expect(
			dashes.every((d) => d !== 'none' && d !== ''),
			`pointillés : ${dashes}`
		).toBe(true);
		expect(
			await fig(page).getByTestId('bon-triangle-arc').count(),
			'arcs fins du report'
		).toBeGreaterThanOrEqual(2);
		expect(
			await fig(page).getByTestId('bon-triangle-marque').count(),
			'longueurs codées'
		).toBeGreaterThan(0);
		await shootThemes(page, triangle, '2271-correction');
	});

	test(
		'#2271 — au clavier : les bouts de u sont des boutons « Extrémité », puis « Point A » pour piquer',
		{ tag: '@bureau' },
		async ({ page }) => {
			await openPreview(page, '2271 clavier', TROIS_STATEMENT);
			await figureZone(page);
			await selectTool(page, 'Report');
			for (const nom of ['Extrémité 1', 'Extrémité 2', 'Point A']) {
				await page.getByRole('button', { name: nom, exact: true }).focus();
				await page.keyboard.press('Enter');
			}
			await expect(fig(page).getByTestId('report-eleve')).toHaveCount(1);
		}
	);

	const PARALLELO_BLOCK = PARA_BLOCK;
	const [PA, PB, PC]: Pt[] = [
		{ x: 2, y: 2 },
		{ x: 7, y: 2 },
		{ x: 8, y: 6 }
	];
	const PD: Pt = { x: PA.x + PC.x - PB.x, y: PA.y + PC.y - PB.y };

	test('#2271 — 4e sommet : report de BC en A, de AB en C, point à l’intersection → juste ; correction de l’autre intersection : « ABCD est croisé »', async ({
		page
	}) => {
		await openPreview(
			page,
			'2271 parallelogramme',
			`Place le 4e sommet $D$.\n\n${PARALLELO_BLOCK}`
		);
		const zone = await figureZone(page);
		await selectTool(page, 'Report');
		await toucher(zone, PARA_WIN, PB, PC, PA);
		await selectTool(page, 'Report');
		await toucher(zone, PARA_WIN, PA, PB, PC);
		await expect(fig(page).getByTestId('report-eleve')).toHaveCount(2);
		await selectTool(page, 'Point');
		await toucher(zone, PARA_WIN, PD);
		await validate(page);
		await expect(fig(page).locator('.point-juste')).toHaveCount(1);
		await shootThemes(page, fig(page).first(), '2271-parallelogramme-juste');
	});

	test('#2271 — l’autre intersection des reports : « ABCD est croisé » ; correction : D, [CD], [DA] en pointillés, côtés opposés codés', async ({
		page
	}) => {
		await openPreview(page, '2271 croise', `Place le 4e sommet $D$.\n\n${PARALLELO_BLOCK}`);
		const zone = await figureZone(page);
		await selectTool(page, 'Report');
		await toucher(zone, PARA_WIN, PB, PC, PA);
		await selectTool(page, 'Report');
		await toucher(zone, PARA_WIN, PA, PB, PC);
		await selectTool(page, 'Point');
		// L'autre intersection est la symétrique de D par (AC) : ici (6,08 ; 1,38), DANS la fenêtre, donc touchée
		// directement ; si une figure la sortait de la fenêtre, seul le clavier pourrait la poser (branche ci-dessous)
		const autre = croisement(PA, dist(PB, PC), PC, dist(PA, PB)).find((q) => dist(q, PD) > 0.5)!;
		const box = (await zone.boundingBox())!;
		const voulu = {
			x: box.x + ((autre.x - PARA_WIN.xMin) / (PARA_WIN.xMax - PARA_WIN.xMin)) * box.width,
			y: box.y + ((PARA_WIN.yMax - autre.y) / (PARA_WIN.yMax - PARA_WIN.yMin)) * box.height
		};
		const intersections = page.getByRole('button', { name: /^Intersection \d+$/ });
		const total = await intersections.count();
		let meilleur = -1;
		let ecart = Infinity;
		for (let index = 0; index < total; index++) {
			const at = await intersections.nth(index).boundingBox();
			if (!at) continue;
			const d = Math.hypot(at.x + at.width / 2 - voulu.x, at.y + at.height / 2 - voulu.y);
			if (d < ecart) {
				ecart = d;
				meilleur = index;
			}
		}
		expect(total, 'intersections proposées').toBeGreaterThan(0);
		if (autre.y >= PARA_WIN.yMin) await toucher(zone, PARA_WIN, autre);
		else {
			// ÉCART : l'autre intersection est hors de la figure et le clavier ne la propose pas
			test.fail();
			expect(
				ecart,
				`l’autre intersection (${autre.x.toFixed(2)} ; ${autre.y.toFixed(2)}) est hors de la figure : le bouton « Intersection » le plus proche en est à (px)`
			).toBeLessThan(6);
			await intersections.nth(meilleur).focus();
			await page.keyboard.press('Enter');
		}
		await validate(page);
		expect(await previewText(page)).toContain('ABCD est croisé');
		await expect(fig(page).getByTestId('bon-point-cote')).toHaveCount(2);
		await shootThemes(page, fig(page).getByTestId('bon-point').first(), '2271-croise-correction');
	});
});
