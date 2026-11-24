import { expect, test, type Locator, type Page } from '@playwright/test';
import { generateInstance } from '../../src/lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '../../src/lib/questions/types';
import { ADMIN, assertLocalServerEnv, login, sql } from './helpers/carnet';
import { brouillons, isTouch, projectName, type Win } from './helpers/modele-brouillon';

/**
 * Lot 13 du CE2 : règle graduée, équerre, compas sur papier uni (tri des vérifications, paquet 9)
 * =============================================================================================
 *
 * Reprend la ligne #2896 de `docs/wip/verifications-manuelles.md` : les cinq modèles du lot 13 du
 * CE2 (ids dans `scripts/questions/ce2-13/`) jouent chacun une fois « juste » puis au moins une
 * erreur (« tracé à l'œil », mauvaise longueur), au toucher sur iPhone et Android, et à une largeur
 * de tablette (`setViewportSize`).
 *
 * Les modèles sont ceux de la base locale (mêmes identifiants qu'en prod) : jamais recréés, jamais
 * modifiés ; ils doivent exister ET être publiés (sinon le test échoue, la ligne reste pour la
 * prod). Les gestes se jouent dans l'aperçu admin avec une graine (la variation et les nombres sont
 * lus dans l'instance générée, comme `blocs-geometrie-8`). Rien n'est écrit en base.
 *
 * Ce que ces tests ne voient pas : la sensation du vrai doigt (viser une graduation sans voir sous
 * le doigt) — Playwright envoie un toucher exact. Captures : `.captures/verifs/blocs-geometrie-9/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());
// Serveur partagé avec d'autres sessions : les gestes longs se jouent parfois au ralenti
test.beforeEach(() => test.setTimeout(240_000));

// Constantes

const SHOTS = '.captures/verifs/blocs-geometrie-9';
const decor = brouillons('Verifs9 geo', SHOTS);
const { figureZone, fig, tapFigure, validate, shootThemes } = decor;

const SEGMENT_CM = 'c1caa00f-f72a-49fd-9001-8f1551c33714';
const SEGMENT_MM = '68425f1e-0734-476a-995d-627998229963';
const CARRE_RECTANGLE = '7a143d38-4674-4dec-b355-b2d3d00a5321';
const TRIANGLE_RECTANGLE = 'd29a1fac-8c6f-41b6-98a2-bda33b52a823';
const CERCLE = 'b1f51780-5a7a-4aeb-b4ae-8428090cc84a';

/** Largeur d'une tablette (iPad portrait) */
const TABLETTE = { width: 820, height: 1180 };

// Types

interface Pt {
	x: number;
	y: number;
}

interface ModeleBase {
	id: string;
	template: QuestionTemplate;
}

interface Jeu {
	instance: QuestionInstance;
	win: Win;
	zone: Locator;
	a: Pt;
	b?: Pt;
}

// Fonctions : décor

const connectees = new WeakSet<Page>();

/** Le modèle de la base locale ; absent ou non publié : échec (la ligne reste pour la prod) */
async function modeleDeLaBase(id: string): Promise<ModeleBase> {
	const rows = await sql<Record<string, unknown>>(
		`select * from question_templates where id = $1`,
		[id]
	);
	expect(rows.length, `modèle ${id} absent de la base locale`).toBe(1);
	expect(rows[0].status, `modèle ${id} publié`).toBe('published');
	return { id, template: rows[0] as unknown as QuestionTemplate };
}

/** La première graine (de 1 à 600) dont l'instance satisfait `convient` */
function graine(
	modele: ModeleBase,
	convient: (instance: QuestionInstance) => boolean
): { seed: number; instance: QuestionInstance } {
	for (let seed = 1; seed <= 600; seed++) {
		const result = generateInstance(modele.template, seed);
		if (result.success && convient(result.instance)) return { seed, instance: result.instance };
	}
	throw new Error(`aucune graine ne convient pour le modèle ${modele.id}`);
}

/** Ouvre l'aperçu admin du modèle publié, avec la graine voulue (même graine = même instance) */
async function ouvrirModele(page: Page, modele: ModeleBase, seed: number): Promise<void> {
	// Une seule connexion par page : un 2e modèle dans le même test réutilise la session
	if (!connectees.has(page)) {
		await login(page, ADMIN.email, ADMIN.password);
		connectees.add(page);
	}
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
	await expect(async () => {
		await page.locator('#seed').fill(String(seed));
		await page.getByRole('button', { name: 'Générer', exact: true }).click();
		await expect(page.locator('dt', { hasText: 'Seed' }).locator('+ dd')).toHaveText(String(seed), {
			timeout: 4000
		});
	}).toPass({ timeout: 60_000 });
	await page.waitForLoadState('networkidle');
}

const variable = (instance: QuestionInstance, name: string): number =>
	Number(instance.resolvedVariables?.find((v) => v.name === name)?.value);

/** Le bloc `figure-a-completer` de l'instance (énoncé résolu) */
function blocDe(instance: QuestionInstance): string {
	const m = instance.statement.match(/```figure-a-completer[\s\S]*?```/);
	if (!m) throw new Error('pas de bloc figure-a-completer dans l’énoncé');
	return m[0];
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

/** Ouvre le modèle (graine choisie par `convient`) et rend le jeu : instance, fenêtre, zone de toucher, points */
async function ouvrir(
	page: Page,
	id: string,
	convient: (instance: QuestionInstance) => boolean = () => true
): Promise<Jeu> {
	const modele = await modeleDeLaBase(id);
	const { seed, instance } = graine(modele, convient);
	const bloc = blocDe(instance);
	await ouvrirModele(page, modele, seed);
	const zone = await figureZone(page);
	return {
		instance,
		win: fenetreDe(bloc),
		zone,
		a: pointDe(bloc, 'A'),
		b: /^B = point/m.test(bloc) ? pointDe(bloc, 'B') : undefined
	};
}

// Fonctions : gestes

async function press(locator: Locator): Promise<void> {
	await locator.scrollIntoViewIfNeeded();
	if (isTouch()) await locator.tap();
	else await locator.click();
}

async function outil(page: Page, id: string): Promise<void> {
	const button = fig(page).getByTestId(`outil-${id}`);
	await press(button);
	await expect(button).toHaveAttribute('aria-pressed', 'true');
}

async function compte(page: Page, id: string, n: number): Promise<void> {
	await expect(fig(page).getByTestId(id)).toHaveCount(n);
}

async function palette(page: Page): Promise<string[]> {
	return fig(page)
		.locator('[data-testid^="outil-"]')
		.evaluateAll((els) => els.map((el) => (el.textContent ?? '').trim()));
}

async function mmDeLaRegle(page: Page): Promise<number> {
	return Number(await fig(page).getByTestId('regle').first().getAttribute('aria-valuenow'));
}

/**
 * Le toucher d'un doigt n'est pas au dixième de mm : l'ouverture aimantée tombe à ± 1 mm de la
 * graduation visée (écart mesuré ici), puis ‹ › la ramènent, comme l'élève (consigne de la figure)
 */
async function ajusterMm(page: Page, mm: number): Promise<void> {
	await expect.poll(() => mmDeLaRegle(page)).toBeGreaterThan(0);
	const lu = await mmDeLaRegle(page);
	expect(
		Math.abs(lu - mm),
		`ouverture aimantée (${lu} mm) à 1 mm de la graduation visée`
	).toBeLessThanOrEqual(1);
	for (let essai = 0; essai < 3 && (await mmDeLaRegle(page)) !== mm; essai++) {
		await press(
			fig(page).getByTestId((await mmDeLaRegle(page)) < mm ? 'regle-plus' : 'regle-moins')
		);
	}
	await attendreMm(page, mm);
}

async function attendreMm(page: Page, mm: number): Promise<void> {
	await expect.poll(() => mmDeLaRegle(page)).toBe(mm);
}

/** Le texte de la remarque affichée sous la figure après « Valider » */
async function remarque(page: Page): Promise<string> {
	const status = fig(page).locator('p[role="status"]');
	await expect(status).toBeVisible();
	return ((await status.textContent()) ?? '').replace(/\s+/g, ' ').trim();
}

async function estJuste(page: Page): Promise<void> {
	await expect(fig(page).locator('p[role="status"]')).toContainText('réponse juste');
}

/** Faux : jamais « réponse juste » ; rend la remarque (à lire dans le rapport) */
async function estFaux(page: Page): Promise<string> {
	const texte = await remarque(page);
	expect(texte, 'la remarque d’une erreur ne dit pas « réponse juste »').not.toContain(
		'réponse juste'
	);
	test.info().annotations.push({ type: 'remarque', description: texte });
	console.log(`REMARQUE : ${texte}`);
	return texte;
}

/** Un toucher à `(x ; y)` décalé de `d` cm vers le haut et la droite (viser « à côté », comme un doigt) */
async function toucheA(zone: Locator, win: Win, p: Pt, d = 0.05): Promise<void> {
	await tapFigure(zone, win, p.x + d, p.y + d);
}

/** Règle posée : le 0 près de `zero` (touché à côté), la direction vers `vers` */
async function poserRegle(page: Page, jeu: Jeu, zero: Pt, vers: Pt, d = 0.05): Promise<void> {
	await outil(page, 'regle');
	await toucheA(jeu.zone, jeu.win, zero, d);
	await tapFigure(jeu.zone, jeu.win, vers.x, vers.y);
	await compte(page, 'regle', 1);
}

/**
 * Le 0 de la règle posée, mesuré à l'écran, est sur `point` (px d'écart au plus `tolerance`). La zone
 * de toucher porte un liseré de 2 px que le dessin n'a pas : l'écart mesuré vaut 2 px quand le 0 est
 * exactement sur le point, contre ≈ 6 px quand le doigt (0,15 cm à côté) n'est pas aimanté.
 */
async function zeroSurPoint(page: Page, jeu: Jeu, point: Pt, tolerance = 3): Promise<number> {
	const box = await jeu.zone.boundingBox();
	if (!box) throw new Error('zone de toucher sans boîte');
	const ecart = await fig(page)
		.getByTestId('regle')
		.first()
		.evaluate(
			(g, cible) => {
				const instrument = g.querySelector('.ruler-instrument') ?? g;
				const m = (instrument as SVGGraphicsElement).getScreenCTM();
				if (!m) return Number.NaN;
				// Le 0 de la règle est l'origine de son repère (translate(x, y) rotate(…))
				const x = m.e;
				const y = m.f;
				return Math.hypot(x - cible.x, y - cible.y);
			},
			{
				x: box.x + ((point.x - jeu.win.xMin) / (jeu.win.xMax - jeu.win.xMin)) * box.width,
				y: box.y + ((jeu.win.yMax - point.y) / (jeu.win.yMax - jeu.win.yMin)) * box.height
			}
		);
	expect(ecart, `le 0 de la règle est sur le point (écart ${ecart.toFixed(1)} px)`).toBeLessThan(
		tolerance
	);
	return ecart;
}

/** Segment de `depuis` à `vers` (outil Segment) */
async function segment(page: Page, jeu: Jeu, depuis: Pt, vers: Pt): Promise<void> {
	await outil(page, 'segment');
	await tapFigure(jeu.zone, jeu.win, depuis.x, depuis.y);
	await tapFigure(jeu.zone, jeu.win, vers.x, vers.y);
}

/** Équerre posée le long de [AB] (un toucher sur [AB]), puis la perpendiculaire par `par` */
async function equerrePar(page: Page, jeu: Jeu, par: Pt): Promise<void> {
	const { a, b } = jeu;
	if (!b) throw new Error('pas de point B');
	await outil(page, 'equerre');
	await tapFigure(jeu.zone, jeu.win, a.x + (b.x - a.x) / 4, a.y + (b.y - a.y) / 4);
	await compte(page, 'droite-choisie', 1);
	await toucheA(jeu.zone, jeu.win, par);
}

// Une largeur de tablette : le même geste, sur la figure à 820 px (ordinateur Chrome seulement)
async function surTablette(page: Page): Promise<void> {
	await page.setViewportSize(TABLETTE);
}

// ============================================================================
// 01 — « Tracer un segment de longueur donnée en cm » (c1caa00f)
// ============================================================================

const seg01 = (i: QuestionInstance): boolean => variable(i, 'k') === 1 && variable(i, 'l') >= 5;

async function segmentCmJuste(page: Page): Promise<void> {
	const jeu = await ouvrir(page, SEGMENT_CM, seg01);
	const l = variable(jeu.instance, 'l');
	console.log(`PALETTE 01 : ${(await palette(page)).join(' · ')}`);
	// Règle posée à côté de A (0,15 cm ≈ un doigt) : le 0 s'aimante sur A
	await poserRegle(page, jeu, jeu.a, { x: jeu.a.x + 3, y: jeu.a.y }, 0.15);
	await zeroSurPoint(page, jeu, jeu.a);
	// Bout du segment visé à côté de la graduation (0,04 cm) : il s'arrête sur le mm voisin
	await outil(page, 'segment');
	await tapFigure(jeu.zone, jeu.win, jeu.a.x, jeu.a.y);
	await tapFigure(jeu.zone, jeu.win, jeu.a.x + l + 0.04, jeu.a.y);
	await compte(page, 'segment-eleve', 1);
	await attendreMm(page, l * 10);
	await validate(page);
	await estJuste(page);
	await shootThemes(page, fig(page).first(), `2896-01-juste`);
}

test.describe('#2896 — 01 « Tracer un segment de longueur donnée en cm »', () => {
	test('#2896 — 01 : règle posée en A (le 0 s’aimante sur A), segment arrêté sur la graduation → juste', async ({
		page
	}) => {
		await segmentCmJuste(page);
	});

	test('#2896 @bureau — 01 sur tablette (820 px) : même geste → juste', async ({ page }) => {
		await surTablette(page);
		await segmentCmJuste(page);
	});

	test('#2896 — 01 : segment tracé à l’œil (sans règle) → pas « réponse juste » ; segment d’1 cm de moins avec la règle → faux', async ({
		page
	}) => {
		const jeu = await ouvrir(page, SEGMENT_CM, seg01);
		const l = variable(jeu.instance, 'l');
		await segment(page, jeu, jeu.a, { x: jeu.a.x + l, y: jeu.a.y });
		await compte(page, 'segment-eleve', 1);
		await validate(page);
		const oeil = await estFaux(page);
		await shootThemes(page, fig(page).first(), '2896-01-oeil');
		expect(oeil.length, 'une remarque écrite').toBeGreaterThan(0);

		// Avec la règle, mais 1 cm trop court
		const court = await ouvrir(page, SEGMENT_CM, seg01);
		await poserRegle(page, court, court.a, { x: court.a.x + 3, y: court.a.y }, 0.15);
		await segment(page, court, court.a, { x: court.a.x + l - 1, y: court.a.y });
		await attendreMm(page, (l - 1) * 10);
		await validate(page);
		await estFaux(page);
	});
});

test('#2896 — règle graduée : direction donnée à 1 cm puis à 3 cm du 0 (observation du 2e toucher, au toucher comme à la souris)', async ({
	page
}) => {
	const jeu = await ouvrir(page, SEGMENT_CM, seg01);
	const box = await jeu.zone.boundingBox();
	if (!box) throw new Error('zone de toucher sans boîte');
	const pxParCm = box.width / (jeu.win.xMax - jeu.win.xMin);
	await outil(page, 'regle');
	await toucheA(jeu.zone, jeu.win, jeu.a, 0.15);
	await tapFigure(jeu.zone, jeu.win, jeu.a.x + 1, jeu.a.y);
	const posee = await fig(page).getByTestId('regle').count();
	const resume = `1 cm = ${pxParCm.toFixed(1)} px à l'écran : deuxième toucher à 1 cm du 0 → règle ${posee === 1 ? 'posée' : 'NON posée (la consigne « Touche un point dans la direction… » reste)'}`;
	test.info().annotations.push({ type: 'direction-a-1-cm', description: resume });
	console.log(`OBSERVATION ${projectName()} : ${resume}`);
	if (posee === 0) await tapFigure(jeu.zone, jeu.win, jeu.a.x + 3, jeu.a.y);
	await compte(page, 'regle', 1);
});

// ============================================================================
// 02 — « Tracer un segment de longueur donnée en cm et mm » (68425f1e)
// ============================================================================

const cmEtMm = (i: QuestionInstance): boolean =>
	variable(i, 'k') === 1 && /cm et/.test(i.statement);
const enMm = (i: QuestionInstance): boolean => variable(i, 'k') === 2 && !/cm et/.test(i.statement);

async function segmentMmJuste(
	page: Page,
	convient: (i: QuestionInstance) => boolean,
	forme: string
): Promise<void> {
	const jeu = await ouvrir(page, SEGMENT_MM, convient);
	const mm = 10 * variable(jeu.instance, 'a') + variable(jeu.instance, 'b');
	await poserRegle(page, jeu, jeu.a, { x: jeu.a.x + 3, y: jeu.a.y }, 0.15);
	await zeroSurPoint(page, jeu, jeu.a);
	await outil(page, 'segment');
	await tapFigure(jeu.zone, jeu.win, jeu.a.x, jeu.a.y);
	// Visé 0,3 mm trop loin : le bout s'arrête sur la graduation d'1 mm
	await tapFigure(jeu.zone, jeu.win, jeu.a.x + mm / 10 + 0.03, jeu.a.y);
	await attendreMm(page, mm);
	// ‹ › décalent d'1 mm, dans les deux sens
	await press(fig(page).getByTestId('regle-plus'));
	await attendreMm(page, mm + 1);
	await press(fig(page).getByTestId('regle-moins'));
	await press(fig(page).getByTestId('regle-moins'));
	await attendreMm(page, mm - 1);
	await press(fig(page).getByTestId('regle-plus'));
	await attendreMm(page, mm);
	await validate(page);
	await estJuste(page);
	await shootThemes(page, fig(page).first(), `2896-02-${forme}-juste`);
}

test.describe('#2896 — 02 « Tracer un segment de longueur donnée en cm et mm »', () => {
	test('#2896 — 02 « 5 cm et 3 mm » : règle posée en A, bout arrêté sur le mm, ‹ › d’1 mm → juste', async ({
		page
	}) => {
		await segmentMmJuste(page, cmEtMm, 'cm-et-mm');
	});

	test('#2896 — 02 « 72 mm » : mêmes gestes → juste', async ({ page }) => {
		await segmentMmJuste(page, enMm, 'mm');
	});

	test('#2896 @bureau — 02 sur tablette (820 px) : « 5 cm et 3 mm » → juste', async ({ page }) => {
		await surTablette(page);
		await segmentMmJuste(page, cmEtMm, 'tablette');
	});

	test('#2896 — 02 : 1 mm de trop (‹ › jamais corrigé) → faux ; tracé à l’œil sans règle → faux', async ({
		page
	}) => {
		const jeu = await ouvrir(page, SEGMENT_MM, cmEtMm);
		const mm = 10 * variable(jeu.instance, 'a') + variable(jeu.instance, 'b');
		await poserRegle(page, jeu, jeu.a, { x: jeu.a.x + 3, y: jeu.a.y }, 0.15);
		await segment(page, jeu, jeu.a, { x: jeu.a.x + (mm + 1) / 10, y: jeu.a.y });
		await attendreMm(page, mm + 1);
		await validate(page);
		await estFaux(page);
		await shootThemes(page, fig(page).first(), '2896-02-un-mm-de-trop');

		const oeil = await ouvrir(page, SEGMENT_MM, cmEtMm);
		await segment(page, oeil, oeil.a, { x: oeil.a.x + mm / 10, y: oeil.a.y });
		await validate(page);
		await estFaux(page);
	});
});

// ============================================================================
// 03 — « Construire un carré ou un rectangle de dimensions données » (7a143d38)
// ============================================================================

const carre = (i: QuestionInstance): boolean => /carré/.test(i.statement);
const rectangle = (i: QuestionInstance): boolean =>
	/rectangle/.test(i.statement) && variable(i, 'b') >= 3;

/** Longueur du côté [BC] : c (carré) ou b (rectangle) */
const cote = (i: QuestionInstance): number =>
	variable(i, 'c') > 0 && !Number.isNaN(variable(i, 'c')) ? variable(i, 'c') : variable(i, 'b');

/** Équerre en B puis en A, règle posée (0 sur le sommet), côtés [BC] [AD] de `bc` cm, puis [CD] */
async function construireCarreRectangle(page: Page, jeu: Jeu, bc: number): Promise<void> {
	const { a, b } = jeu;
	if (!b) throw new Error('pas de point B');
	for (const sommet of [b, a]) {
		await equerrePar(page, jeu, sommet);
		await compte(page, 'droite-eleve', sommet === b ? 1 : 2);
		await poserRegle(page, jeu, sommet, { x: sommet.x, y: sommet.y + 2 }, 0.15);
		await zeroSurPoint(page, jeu, sommet);
		await segment(page, jeu, sommet, { x: sommet.x, y: sommet.y + bc });
		await compte(page, 'segment-eleve', sommet === b ? 1 : 2);
	}
	await segment(page, jeu, { x: b.x, y: b.y + bc }, { x: a.x, y: a.y + bc });
	await compte(page, 'segment-eleve', 3);
}

async function carreRectangleJuste(
	page: Page,
	convient: (i: QuestionInstance) => boolean,
	nom: string
): Promise<void> {
	const jeu = await ouvrir(page, CARRE_RECTANGLE, convient);
	console.log(`PALETTE 03 ${nom} : ${(await palette(page)).join(' · ')}`);
	await construireCarreRectangle(page, jeu, cote(jeu.instance));
	await validate(page);
	await estJuste(page);
	await shootThemes(page, fig(page).first(), `2896-03-${nom}-juste`);
}

test.describe('#2896 — 03 « Construire un carré ou un rectangle de dimensions données »', () => {
	test('#2896 — 03 carré : équerre en B et en A, règle posée, [BC] [AD] [CD] → juste', async ({
		page
	}) => {
		await carreRectangleJuste(page, carre, 'carre');
	});

	test('#2896 — 03 rectangle (BC donné) : équerre en B et en A, règle posée, [CD] → juste', async ({
		page
	}) => {
		await carreRectangleJuste(page, rectangle, 'rectangle');
	});

	test('#2896 @bureau — 03 carré sur tablette (820 px) → juste', async ({ page }) => {
		await surTablette(page);
		await carreRectangleJuste(page, carre, 'tablette');
	});

	test('#2896 — 03 : côtés trop longs d’1 cm → faux ; côtés tracés à l’œil, sans équerre → faux', async ({
		page
	}) => {
		const jeu = await ouvrir(page, CARRE_RECTANGLE, carre);
		const c = cote(jeu.instance);
		await construireCarreRectangle(page, jeu, c + 1);
		await validate(page);
		await estFaux(page);
		await shootThemes(page, fig(page).first(), '2896-03-un-cm-de-trop');

		// Sans équerre : règle posée à la verticale, segments tracés à l'œil
		const oeil = await ouvrir(page, CARRE_RECTANGLE, carre);
		const { a, b } = oeil;
		if (!b) throw new Error('pas de point B');
		for (const sommet of [b, a]) {
			await poserRegle(page, oeil, sommet, { x: sommet.x, y: sommet.y + 2 }, 0.15);
			await segment(page, oeil, sommet, { x: sommet.x, y: sommet.y + c });
		}
		await segment(page, oeil, { x: b.x, y: b.y + c }, { x: a.x, y: a.y + c });
		await validate(page);
		await estFaux(page);
	});
});

// ============================================================================
// 04 — « Construire un triangle rectangle de dimensions données » (d29a1fac)
// ============================================================================

async function triangleRectangle(page: Page, jeu: Jeu, ac: number): Promise<void> {
	const { a, b } = jeu;
	if (!b) throw new Error('pas de point B');
	await equerrePar(page, jeu, a);
	await compte(page, 'droite-eleve', 1);
	await poserRegle(page, jeu, a, { x: a.x, y: a.y + 2 }, 0.15);
	await zeroSurPoint(page, jeu, a);
	await segment(page, jeu, a, { x: a.x, y: a.y + ac });
	await segment(page, jeu, b, { x: a.x, y: a.y + ac });
	await compte(page, 'segment-eleve', 2);
}

async function triangleRectangleJuste(page: Page, nom: string): Promise<void> {
	const jeu = await ouvrir(page, TRIANGLE_RECTANGLE, (i) => variable(i, 'c') >= 4);
	console.log(`PALETTE 04 : ${(await palette(page)).join(' · ')}`);
	await triangleRectangle(page, jeu, variable(jeu.instance, 'c'));
	await validate(page);
	await estJuste(page);
	await shootThemes(page, fig(page).first(), `2896-04-${nom}-juste`);
}

test.describe('#2896 — 04 « Construire un triangle rectangle de dimensions données »', () => {
	test('#2896 — 04 : équerre en A, règle sur la perpendiculaire, [AC] et [BC] → juste', async ({
		page
	}) => {
		await triangleRectangleJuste(page, 'juste');
	});

	test('#2896 @bureau — 04 sur tablette (820 px) → juste', async ({ page }) => {
		await surTablette(page);
		await triangleRectangleJuste(page, 'tablette');
	});

	test('#2896 — 04 : [AC] d’1 cm trop long → faux ; [AC] tracé à l’œil (sans équerre ni règle) → faux', async ({
		page
	}) => {
		const jeu = await ouvrir(page, TRIANGLE_RECTANGLE, (i) => variable(i, 'c') >= 4);
		const c = variable(jeu.instance, 'c');
		await triangleRectangle(page, jeu, c + 1);
		await validate(page);
		await estFaux(page);
		await shootThemes(page, fig(page).first(), '2896-04-un-cm-de-trop');

		const oeil = await ouvrir(page, TRIANGLE_RECTANGLE, (i) => variable(i, 'c') >= 4);
		const { a, b } = oeil;
		if (!b) throw new Error('pas de point B');
		await segment(page, oeil, a, { x: a.x, y: a.y + c });
		await segment(page, oeil, b, { x: a.x, y: a.y + c });
		await validate(page);
		await estFaux(page);
	});
});

// ============================================================================
// 05 — « Tracer un cercle de rayon donné en cm » (b1f51780)
// ============================================================================

/** Règle posée en O vers la droite, puis compas piqué en O, ouvert près de `cm` (visé à côté) */
async function cercleAuCompas(page: Page, jeu: Jeu, cm: number, avecRegle = true): Promise<void> {
	const o = jeu.a;
	// Le centre s'appelle O dans ce modèle : pointDe(…, 'A') ne le trouve pas, voir `ouvrirCercle`
	if (avecRegle) await poserRegle(page, jeu, o, { x: o.x + 3, y: o.y }, 0.15);
	await outil(page, 'compas');
	await toucheA(jeu.zone, jeu.win, o, 0.15);
	await tapFigure(jeu.zone, jeu.win, o.x + cm + 0.04, o.y + 0.05);
}

/** Le jeu du cercle : le centre est O (pas A) */
async function ouvrirCercle(page: Page): Promise<Jeu> {
	const modele = await modeleDeLaBase(CERCLE);
	const { seed, instance } = graine(modele, (i) => variable(i, 'r') >= 3);
	const bloc = blocDe(instance);
	await ouvrirModele(page, modele, seed);
	const zone = await figureZone(page);
	return { instance, win: fenetreDe(bloc), zone, a: pointDe(bloc, 'O') };
}

async function cercleJuste(page: Page, nom: string): Promise<void> {
	const jeu = await ouvrirCercle(page);
	const r = variable(jeu.instance, 'r');
	console.log(`PALETTE 05 : ${(await palette(page)).join(' · ')}`);
	await cercleAuCompas(page, jeu, r);
	await zeroSurPoint(page, jeu, jeu.a);
	await ajusterMm(page, r * 10);
	await compte(page, 'cercle-eleve', 1);
	await validate(page);
	await estJuste(page);
	await shootThemes(page, fig(page).first(), `2896-05-${nom}-juste`);
}

test.describe('#2896 — 05 « Tracer un cercle de rayon donné en cm »', () => {
	test('#2896 — 05 : règle posée en O (le 0 s’aimante sur O), compas ouvert sur la graduation → juste', async ({
		page
	}) => {
		await cercleJuste(page, 'juste');
	});

	test('#2896 @bureau — 05 sur tablette (820 px) → juste', async ({ page }) => {
		await surTablette(page);
		await cercleJuste(page, 'tablette');
	});

	test('#2896 — 05 : compas ouvert à l’œil (sans règle) → faux ; rayon d’1 mm de trop (‹ ›) → faux', async ({
		page
	}) => {
		const jeu = await ouvrirCercle(page);
		const r = variable(jeu.instance, 'r');
		await cercleAuCompas(page, jeu, r, false);
		await compte(page, 'cercle-eleve', 1);
		await validate(page);
		await estFaux(page);
		await shootThemes(page, fig(page).first(), '2896-05-oeil');

		const trop = await ouvrirCercle(page);
		await cercleAuCompas(page, trop, r);
		await ajusterMm(page, r * 10);
		await press(fig(page).getByTestId('regle-plus'));
		await attendreMm(page, r * 10 + 1);
		await validate(page);
		await estFaux(page);
	});
});
