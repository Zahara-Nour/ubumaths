import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { generateInstance } from '../../src/lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '../../src/lib/questions/types';
import { buildSeriesLink } from '../../src/lib/validation/series';
import { ADMIN, assertLocalServerEnv, login, sql } from './helpers/carnet';
import { brouillons, isTouch, projectName, type Win } from './helpers/modele-brouillon';

/**
 * Médiatrice 6e et « Construire un triangle » (tri des vérifications manuelles, paquet 8)
 * ======================================================================================
 *
 * Reprend les lignes #2829/#2831 (modèles c52b5ea3 « Tracer la médiatrice d'un segment sur
 * quadrillage » et eadf2049 « Calculer avec la médiatrice », puis la série « La médiatrice d'un
 * segment » en Flash-cards) et #2661/#2665 (« Construire un triangle » f06e45e8 : variations en cm
 * v5 et v6, variation à angle sans cm) de `docs/wip/verifications-manuelles.md`.
 *
 * Les modèles sont ceux de la base locale (mêmes identifiants qu'en prod) : jamais recréés, jamais
 * modifiés. Les gestes se jouent dans l'aperçu admin avec une graine (la variation et les nombres
 * sont lus dans l'instance générée, comme `blocs-geometrie-6`) ; les réponses numériques et la
 * série, par le lien de série public. Rien n'est écrit en base. Un modèle absent fait échouer le test.
 *
 * Ce que ces tests ne voient pas : le coup d'œil sur le dessin (esthétique), la sensation du vrai
 * doigt. Captures à regarder : `.captures/verifs/blocs-geometrie-8/` (clair et sombre).
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());
// Serveur partagé avec d'autres sessions : les gestes longs se jouent parfois au ralenti
test.beforeEach(() => test.setTimeout(150_000));

// Constantes

const SHOTS = '.captures/verifs/blocs-geometrie-8';
const decor = brouillons('Verifs8 geo', SHOTS);
const { figureZone, fig, tapFigure, validate, shootThemes } = decor;

const MEDIATRICE_TRACER = 'c52b5ea3';
const MEDIATRICE_CALCULER = 'eadf2049';
const TRIANGLE = 'f06e45e8';
const SERIE_MEDIATRICE = '756deb56-9240-409d-877b-924fbe16fdb9';

// Types

interface Pt {
	x: number;
	y: number;
}

interface ModeleBase {
	id: string;
	template: QuestionTemplate;
}

interface MesureFigure {
	/** Étiquettes écrites dans la figure, avec la hauteur affichée (px) */
	textes: Array<{ texte: string; hauteur: number }>;
	/** Traits en tirets (attribut `stroke-dasharray` calculé non vide) */
	tirets: number;
	/** Chemins (codage d'angle droit) */
	chemins: number;
	/** Éléments qui sortent du cadre du dessin */
	dehors: string[];
	/** Éléments dont le contraste avec le fond est inférieur à 3 */
	pales: string[];
	/** Nombre d'éléments mesurés (garde contre la mesure à vide) */
	mesures: number;
}

// Fonctions : décor

/** Le modèle publié de la base locale dont l'identifiant commence par `debut` ; absent : échec */
async function modeleDeLaBase(debut: string): Promise<ModeleBase> {
	const rows = await sql<Record<string, unknown>>(
		`select * from question_templates where id::text like $1`,
		[`${debut}%`]
	);
	expect(rows.length, `modèle ${debut} absent de la base locale`).toBe(1);
	return { id: String(rows[0].id), template: rows[0] as unknown as QuestionTemplate };
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
	await login(page, ADMIN.email, ADMIN.password);
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
	}).toPass({ timeout: 40_000 });
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
		.evaluateAll((els) =>
			els.map(
				(el) =>
					`${el.getAttribute('data-testid')?.replace('outil-', '')}=${(el.textContent ?? '').trim()}`
			)
		);
}

async function attendreMm(page: Page, mm: number): Promise<void> {
	await expect
		.poll(async () => fig(page).getByTestId('regle').first().getAttribute('aria-valuenow'))
		.toBe(String(mm));
}

async function estJuste(page: Page): Promise<void> {
	await expect(fig(page).locator('p[role="status"]')).toContainText('réponse juste');
}

async function dit(page: Page, texte: string): Promise<void> {
	await expect(page.locator('#contenu-principal')).toContainText(texte);
}

/** Un toucher à `(x ; y)` décalé de 0,05 (viser « à côté » du point, comme un doigt) */
async function toucheA(zone: Locator, win: Win, p: Pt): Promise<void> {
	await tapFigure(zone, win, p.x + 0.05, p.y + 0.05);
}

// ============================================================================
// Mesures du rendu : texte, tirets, cadre, contraste (clair et sombre)
// ============================================================================

/** Lit, dans le dessin `svg`, ce qui se mesure : étiquettes, tirets, chemins, débordements, contraste */
async function mesurerFigure(svg: Locator): Promise<MesureFigure> {
	return svg.evaluate((root): MesureFigure => {
		const cadre = root.getBoundingClientRect();
		const couleur = (valeur: string): [number, number, number, number] | null => {
			const m = valeur.match(/rgba?\(([^)]+)\)/);
			if (!m) return null;
			const [r, g, b, a] = m[1].split(/[ ,/]+/).map(Number);
			return [r, g, b, a === undefined || Number.isNaN(a) ? 1 : a];
		};
		// Fond : le premier ancêtre opaque (la carte), sinon blanc
		let fond: [number, number, number] = [255, 255, 255];
		for (let el: Element | null = root; el; el = el.parentElement) {
			const c = couleur(getComputedStyle(el).backgroundColor);
			if (c && c[3] > 0.9) {
				fond = [c[0], c[1], c[2]];
				break;
			}
		}
		const luminance = ([r, g, b]: number[]): number => {
			const lin = (v: number): number => {
				const s = v / 255;
				return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
			};
			return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
		};
		const contraste = (a: number[], b: number[]): number => {
			const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
			return (hi + 0.05) / (lo + 0.05);
		};
		const nom = (el: Element): string =>
			`${el.tagName}${el.textContent ? ` « ${el.textContent.trim()} »` : ''} ${el.getAttribute('class') ?? ''}`.trim();

		const mesure: MesureFigure = {
			textes: [],
			tirets: 0,
			chemins: 0,
			dehors: [],
			pales: [],
			mesures: 0
		};
		for (const el of root.querySelectorAll('line, path, polygon, circle, text, polyline')) {
			const box = el.getBoundingClientRect();
			if (box.width === 0 && box.height === 0) continue;
			mesure.mesures += 1;
			const style = getComputedStyle(el);
			if (el.tagName === 'text') {
				mesure.textes.push({ texte: (el.textContent ?? '').trim(), hauteur: box.height });
			}
			if (el.tagName === 'path') mesure.chemins += 1;
			if (style.strokeDasharray !== 'none' && style.strokeDasharray !== '') mesure.tirets += 1;
			if (
				box.left < cadre.left - 1 ||
				box.right > cadre.right + 1 ||
				box.top < cadre.top - 1 ||
				box.bottom > cadre.bottom + 1
			) {
				mesure.dehors.push(nom(el));
			}
			// Le contraste de ce qui se voit (le trait, ou le remplissage d'une étiquette)
			const trait = couleur(style.stroke);
			const remplissage = couleur(style.fill);
			const retenu = el.tagName === 'text' ? remplissage : (trait ?? remplissage);
			// Le quadrillage est un fond volontairement pâle : il ne compte pas dans le contraste
			if (retenu && !(el.getAttribute('class') ?? '').includes('figure-grille')) {
				const alpha = retenu[3] * Number(style.opacity);
				const melange = [0, 1, 2].map((i) => alpha * retenu[i] + (1 - alpha) * fond[i]);
				if (contraste(melange, fond) < 3) mesure.pales.push(nom(el));
			}
		}
		return mesure;
	});
}

/**
 * Mesure le dessin en clair puis en sombre, garde une capture de chaque, et rend les deux mesures.
 * `nom` : début du nom du fichier (`<nom>-clair|sombre-<projet>.png`).
 */
async function mesurerEnDeuxThemes(
	page: Page,
	svg: Locator,
	nom: string
): Promise<{ clair: MesureFigure; sombre: MesureFigure }> {
	await mkdir(SHOTS, { recursive: true });
	const rendu = {} as { clair: MesureFigure; sombre: MesureFigure };
	for (const theme of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme: theme });
		await page.waitForFunction(
			(sombre) => document.documentElement.classList.contains('dark') === sombre,
			theme === 'dark'
		);
		await svg.scrollIntoViewIfNeeded();
		const cle = theme === 'dark' ? 'sombre' : 'clair';
		// La mesure attend le rendu stable du thème (les couleurs changent après l'émulation)
		rendu[cle] = await mesurerFigure(svg);
		await page.screenshot({ path: `${SHOTS}/${nom}-${cle}-${projectName()}.png` });
	}
	await page.emulateMedia({ colorScheme: 'light' });
	return rendu;
}

/** Les hauteurs d'étiquettes ≥ 10 px, rien hors cadre, contraste ≥ 3 : sur les deux thèmes */
function figureLisible(
	rendu: { clair: MesureFigure; sombre: MesureFigure },
	attendu: { textes: readonly string[]; tirets: number; chemins: number }
): void {
	for (const [theme, m] of Object.entries(rendu)) {
		expect(m.mesures, `${theme} : éléments mesurés`).toBeGreaterThan(5);
		expect(m.textes.map((t) => t.texte).sort(), `${theme} : étiquettes`).toEqual(
			[...attendu.textes].sort()
		);
		for (const t of m.textes) {
			expect(t.hauteur, `${theme} : hauteur de « ${t.texte} »`).toBeGreaterThanOrEqual(10);
		}
		expect(m.tirets, `${theme} : traits en tirets`).toBe(attendu.tirets);
		expect(m.chemins, `${theme} : codage d'angle droit`).toBe(attendu.chemins);
		expect(m.dehors, `${theme} : éléments hors du cadre`).toEqual([]);
		expect(m.pales, `${theme} : éléments au contraste < 3`).toEqual([]);
	}
}

/** La page ne déborde pas en largeur (téléphone compris) */
async function sansDebordement(page: Page): Promise<void> {
	const largeurs = await page.evaluate(() => ({
		page: document.documentElement.scrollWidth,
		fenetre: window.innerWidth
	}));
	expect(largeurs.page, 'largeur de la page contre celle de la fenêtre').toBeLessThanOrEqual(
		largeurs.fenetre + 1
	);
}

// ============================================================================
// #2829 / #2831 — « Tracer la médiatrice d'un segment sur quadrillage » (c52b5ea3)
// ============================================================================

const CAS = [
	['horizontal', (a: Pt, b: Pt) => a.y === b.y],
	['vertical', (a: Pt, b: Pt) => a.x === b.x],
	['en biais', (a: Pt, b: Pt) => a.x !== b.x && a.y !== b.y]
] as const;

const pgcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : pgcd(b, a % b));

interface Mediatrice {
	win: Win;
	a: Pt;
	b: Pt;
	milieu: Pt;
	/** Deux nœuds de la médiatrice, de part et d'autre du milieu, les plus éloignés possible */
	hautEtBas: [Pt, Pt];
}

function mediatriceDe(instance: QuestionInstance): Mediatrice {
	const bloc = blocDe(instance);
	const win = fenetreDe(bloc);
	const a = pointDe(bloc, 'A');
	const b = pointDe(bloc, 'B');
	const milieu = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
	expect(Number.isInteger(milieu.x) && Number.isInteger(milieu.y), 'le milieu est un nœud').toBe(
		true
	);
	const g = pgcd(b.x - a.x, b.y - a.y);
	const perp = { x: -(b.y - a.y) / g, y: (b.x - a.x) / g };
	const dedans = (p: Pt): boolean =>
		p.x >= 1 && p.x <= win.xMax - 1 && p.y >= 1 && p.y <= win.yMax - 1;
	let t = 1;
	while (
		dedans({ x: milieu.x + (t + 1) * perp.x, y: milieu.y + (t + 1) * perp.y }) &&
		dedans({ x: milieu.x - (t + 1) * perp.x, y: milieu.y - (t + 1) * perp.y })
	)
		t += 1;
	const haut = { x: milieu.x + t * perp.x, y: milieu.y + t * perp.y };
	const bas = { x: milieu.x - t * perp.x, y: milieu.y - t * perp.y };
	expect(dedans(haut) && dedans(bas), 'deux nœuds de la médiatrice dans la fenêtre').toBe(true);
	return { win, a, b, milieu, hautEtBas: [haut, bas] };
}

/** Équerre : un toucher sur [AB] (au quart), puis la perpendiculaire par `par` */
async function equerrePar(page: Page, zone: Locator, m: Mediatrice, par: Pt): Promise<void> {
	await outil(page, 'equerre');
	await tapFigure(zone, m.win, m.a.x + (m.b.x - m.a.x) / 4, m.a.y + (m.b.y - m.a.y) / 4);
	await compte(page, 'droite-choisie', 1);
	await toucheA(zone, m.win, par);
	await compte(page, 'droite-eleve', 1);
}

test.describe('#2829 — médiatrice sur quadrillage : tracer à la règle et à l’équerre (c52b5ea3)', () => {
	for (const [cas, convient] of CAS) {
		const instanceDuCas = (modele: ModeleBase) =>
			graine(modele, (i) => {
				const bloc = blocDe(i);
				return convient(pointDe(bloc, 'A'), pointDe(bloc, 'B'));
			});

		test(`#2829 — cas ${cas} : palette Règle · Équerre ; règle par deux nœuds de la médiatrice (le milieu et un nœud perpendiculaire) → juste`, async ({
			page
		}) => {
			const modele = await modeleDeLaBase(MEDIATRICE_TRACER);
			const { seed, instance } = instanceDuCas(modele);
			const m = mediatriceDe(instance);
			await ouvrirModele(page, modele, seed);
			const zone = await figureZone(page);
			expect(await palette(page)).toEqual(['droite=Règle', 'equerre=Équerre']);
			await outil(page, 'droite');
			await toucheA(zone, m.win, m.hautEtBas[0]);
			await toucheA(zone, m.win, m.hautEtBas[1]);
			await compte(page, 'droite-eleve', 1);
			await validate(page);
			await estJuste(page);
			await shootThemes(page, fig(page).first(), `2829-regle-juste-${cas.replace(' ', '-')}`);
		});

		test(`#2829 — cas ${cas} : équerre le long de [AB], glissée jusqu’au milieu I (un nœud) → juste`, async ({
			page
		}) => {
			const modele = await modeleDeLaBase(MEDIATRICE_TRACER);
			const { seed, instance } = instanceDuCas(modele);
			const m = mediatriceDe(instance);
			await ouvrirModele(page, modele, seed);
			const zone = await figureZone(page);
			await equerrePar(page, zone, m, m.milieu);
			await validate(page);
			await estJuste(page);
			await shootThemes(page, fig(page).first(), `2829-equerre-juste-${cas.replace(' ', '-')}`);
		});

		test(`#2829 — cas ${cas} : perpendiculaire à [AB] par A (et non par le milieu) → « ne passe pas par son milieu »`, async ({
			page
		}) => {
			const modele = await modeleDeLaBase(MEDIATRICE_TRACER);
			const { seed, instance } = instanceDuCas(modele);
			const m = mediatriceDe(instance);
			await ouvrirModele(page, modele, seed);
			const zone = await figureZone(page);
			await equerrePar(page, zone, m, m.a);
			await validate(page);
			await dit(page, 'ne passe pas par son milieu');
			await shootThemes(page, fig(page).first(), `2829-par-a-${cas.replace(' ', '-')}`);
		});
	}
});

// ============================================================================
// #2829 / #2831 — « Calculer avec la médiatrice » (eadf2049) : figures codées, réponses
// ============================================================================

/** Joue une variation du modèle par le lien de série public (mode saisie) ; rend la carte */
async function ouvrirCarte(
	page: Page,
	templateId: string,
	variation: number,
	seed: number
): Promise<Locator> {
	await page.goto(
		buildSeriesLink('', [{ templateId, quantity: 1, delay: 0, variations: [variation] }], {
			mode: 'typing',
			seed
		})
	);
	await page.waitForLoadState('networkidle');
	const card = page.getByTestId('typing-card');
	await card.locator('.flip-card-front').waitFor();
	await expect(card.getByRole('button', { name: 'Valider' })).toBeVisible();
	return card;
}

/** Les mesures en cm affichées dans l'énoncé, en dixièmes : `{ MA: 45, AB: 41 }` (face avant) */
async function mesuresAffichees(card: Locator): Promise<Record<string, number>> {
	const formules = await card
		.locator('.flip-card-front math-span, .flip-card-front math-div')
		.allTextContents();
	const lues: Record<string, number> = {};
	for (const formule of formules) {
		const m = formule.match(/^([A-Z]{2}) = (\d+)\{,\}(\d+)~\\mathrm\{cm\}$/);
		if (m) lues[m[1]] = Number(m[2]) * 10 + Number(m[3]);
	}
	return lues;
}

/** Le périmètre de la variation 2 (« Le triangle MAB a pour périmètre … »), en dixièmes */
async function perimetreAffiche(card: Locator): Promise<number> {
	const formules = await card
		.locator('.flip-card-front math-span, .flip-card-front math-div')
		.allTextContents();
	for (const formule of formules) {
		const m = formule.match(/^(\d+)\{,\}(\d+)~\\mathrm\{cm\}$/);
		if (m) return Number(m[1]) * 10 + Number(m[2]);
	}
	throw new Error('périmètre introuvable dans l’énoncé');
}

/** Un nombre en dixièmes écrit comme un élève (« 13,1 », « 14 ») */
const ecrit = (dixiemes: number): string => (dixiemes / 10).toString().replace('.', ',');

/** Tape la réponse (au vrai clavier) puis « Valider » ; rend le verdict (« Juste » / « Faux ») */
async function repondre(page: Page, card: Locator, reponse: string): Promise<string> {
	const champ = card.locator('math-field').first();
	const box = await champ.boundingBox();
	if (!box) throw new Error('case de réponse introuvable');
	await champ.click({ position: { x: Math.max(5, box.width - 15), y: box.height / 2 } });
	await expect
		.poll(async () => page.evaluate(() => document.activeElement?.tagName))
		.toBe('MATH-FIELD');
	await page.keyboard.type(reponse, { delay: 80 });
	await page.getByRole('button', { name: 'Valider' }).click();
	await expect(page.locator('[id$="-etats"]')).toHaveCount(1);
	return (await page.locator('[id$="-etats"]').innerText()).trim();
}

/** Les trois variations : la figure attendue (étiquettes, tirets, codages) */
const CALCUL = [
	{
		variation: 0,
		titre: 'périmètre du triangle MAB',
		figure: { textes: ['A', 'B', 'M', 'd'], tirets: 2, chemins: 1 }
	},
	{
		variation: 1,
		titre: 'longueur MA depuis le périmètre',
		figure: { textes: ['A', 'B', 'M', 'd'], tirets: 2, chemins: 1 }
	},
	{
		variation: 2,
		titre: 'périmètre du quadrilatère AMBN',
		// AB en pointillés (tirets) + le quadrilatère en tirets : 2 traits de tirets au total
		figure: { textes: ['A', 'B', 'M', 'N', 'd'], tirets: 2, chemins: 1 }
	}
] as const;

test.describe('#2829 — « Calculer avec la médiatrice » (eadf2049) : figures codées et réponses', () => {
	for (const cas of CALCUL) {
		test(`#2829 — variation ${cas.variation + 1} (${cas.titre}) : figure codée lisible en clair et en sombre (d, angle droit, tirets, rien hors du cadre)`, async ({
			page
		}) => {
			await modeleDeLaBase(MEDIATRICE_CALCULER);
			const card = await ouvrirCarte(page, MEDIATRICE_CALCULER_ID(), cas.variation, 11);
			const svg = card.locator('.flip-card-front svg.figure-svg');
			await expect(svg).toHaveCount(1);
			const rendu = await mesurerEnDeuxThemes(page, svg, `2829-calcul-v${cas.variation + 1}`);
			figureLisible(rendu, cas.figure);
		});
	}

	test('#2829 — figure codée : A, B, M et d sont nommés, le milieu I est caché exprès (E75, tranché le 2026-11-24)', async ({
		page
	}) => {
		const card = await ouvrirCarte(page, MEDIATRICE_CALCULER_ID(), 0, 11);
		const svg = card.locator('.flip-card-front svg.figure-svg');
		await expect(svg).toHaveCount(1);
		const etiquettes = await svg.locator('text').allTextContents();
		// Le point I est déclaré `visible=faux` dans le modèle, sans étiquette : David l'a gardé caché
		expect(etiquettes.map((t) => t.trim()).sort()).toEqual(['A', 'B', 'M', 'd']);
	});

	test('#2829 — périmètre MAB : la bonne réponse (2 × MA + AB) → juste ; 9,5 → faux', async ({
		page
	}) => {
		const card = await ouvrirCarte(page, MEDIATRICE_CALCULER_ID(), 0, 11);
		const m = await mesuresAffichees(card);
		expect(Object.keys(m).sort(), 'mesures lues dans l’énoncé').toEqual(['AB', 'MA']);
		expect(await repondre(page, card, ecrit(2 * m.MA + m.AB))).toBe('Case 1 : juste');

		const autre = await ouvrirCarte(page, MEDIATRICE_CALCULER_ID(), 0, 11);
		expect(await repondre(page, autre, '9,5')).toBe('Case 1 : fausse');
		await expect(autre.getByText('Correction', { exact: true }).first()).toBeVisible();
		await page.screenshot({ path: `${SHOTS}/2829-calcul-v1-faux-${projectName()}.png` });
	});

	test('#2829 — MA depuis le périmètre : (périmètre − AB) ÷ 2 → juste ; 9,5 → faux', async ({
		page
	}) => {
		const card = await ouvrirCarte(page, MEDIATRICE_CALCULER_ID(), 1, 11);
		const m = await mesuresAffichees(card);
		expect(Object.keys(m), 'mesures lues dans l’énoncé').toEqual(['AB']);
		const perimetre = await perimetreAffiche(card);
		expect((perimetre - m.AB) % 2, 'MA tombe juste').toBe(0);
		expect(await repondre(page, card, ecrit((perimetre - m.AB) / 2))).toBe('Case 1 : juste');

		const autre = await ouvrirCarte(page, MEDIATRICE_CALCULER_ID(), 1, 11);
		expect(await repondre(page, autre, '9,5')).toBe('Case 1 : fausse');
	});

	test('#2829 — périmètre AMBN : 2 × (MA + NB) → juste ; 9,5 → faux', async ({ page }) => {
		const card = await ouvrirCarte(page, MEDIATRICE_CALCULER_ID(), 2, 11);
		const m = await mesuresAffichees(card);
		expect(Object.keys(m).sort(), 'mesures lues dans l’énoncé').toEqual(['MA', 'NB']);
		expect(await repondre(page, card, ecrit(2 * (m.MA + m.NB)))).toBe('Case 1 : juste');

		const autre = await ouvrirCarte(page, MEDIATRICE_CALCULER_ID(), 2, 11);
		expect(await repondre(page, autre, '9,5')).toBe('Case 1 : fausse');
	});
});

/** L'identifiant complet de « Calculer avec la médiatrice » (lu une fois dans la base, mis en cache) */
let identifiantCalcul = '';
test.beforeAll(async () => {
	identifiantCalcul = (await modeleDeLaBase(MEDIATRICE_CALCULER)).id;
});
function MEDIATRICE_CALCULER_ID(): string {
	return identifiantCalcul;
}

// ============================================================================
// #2831 — la série « La médiatrice d'un segment » en Flash-cards (11 questions)
// ============================================================================

test.describe('#2831 — série « La médiatrice d’un segment » en Flash-cards', () => {
	test('#2831 — 11 cartes, de 1 à 11, chacune se retourne ; « 11 cartes trouvées sur 11 » à la fin ; figures dans le cadre en clair et en sombre', async ({
		page
	}) => {
		test.setTimeout(240_000);
		const lignes = await sql<{
			items: Array<{ templateId: string; quantity: number; delay: number }>;
		}>(`select items from series where id = $1`, [SERIE_MEDIATRICE]);
		expect(lignes.length, 'série « La médiatrice d’un segment » absente de la base locale').toBe(1);
		const items = lignes[0].items;
		expect(
			items.reduce((somme, item) => somme + item.quantity, 0),
			'questions de la série'
		).toBe(11);
		await page.goto(buildSeriesLink('', items, { mode: 'flash', seed: 8829 }));
		await page.waitForLoadState('networkidle');
		await mkdir(SHOTS, { recursive: true });
		let figures = 0;
		for (let n = 1; n <= 11; n++) {
			const carte = page.getByTestId('flash-card');
			await carte.waitFor();
			await expect(page.getByTestId('flash-position')).toHaveText(new RegExp(`^Carte ${n} / 11$`));
			const avant = carte.locator('.flip-card-front');
			expect(
				((await avant.innerText()) ?? '').trim().length,
				`carte ${n} : face avant`
			).toBeGreaterThan(20);
			// Les dessins de la face avant : dans le cadre et lisibles, en clair puis en sombre
			const dessins = avant.locator('svg.figure-svg');
			// Un dessin se monte après le texte : on attend que leur nombre ne bouge plus
			// (sous charge, compter tout de suite en manquait — 4 mesurés au lieu de 7)
			let nombre = -1;
			await expect
				.poll(
					async () => {
						const precedent = nombre;
						nombre = await dessins.count();
						return nombre === precedent;
					},
					{ intervals: [700], timeout: 15_000 }
				)
				.toBe(true);
			for (let i = 0; i < nombre; i++) {
				figures += 1;
				const rendu = await mesurerEnDeuxThemes(page, dessins.nth(i), `2831-flash-${n}-${i + 1}`);
				for (const [theme, m] of Object.entries(rendu)) {
					expect(m.mesures, `carte ${n}, ${theme} : éléments mesurés`).toBeGreaterThan(3);
					expect(m.dehors, `carte ${n}, ${theme} : hors du cadre`).toEqual([]);
					expect(m.pales, `carte ${n}, ${theme} : contraste < 3`).toEqual([]);
					for (const t of m.textes) {
						expect(
							t.hauteur,
							`carte ${n}, ${theme} : hauteur de « ${t.texte} »`
						).toBeGreaterThanOrEqual(8);
					}
				}
			}
			await sansDebordement(page);
			await avant.getByLabel('Voir la correction').click();
			await page.locator('[data-self-assess="found"]').click();
		}
		// Graine fixée : 7 des 11 cartes portent un dessin sur leur face avant
		expect(figures, 'dessins mesurés sur la série').toBe(7);
		await expect(page.getByTestId('flash-summary')).toContainText('11 cartes trouvées sur 11');
	});
});

// ============================================================================
// #2661 / #2665 — « Construire un triangle » (f06e45e8), variations en cm et à angle
// ============================================================================

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

const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Le point à `longueur` de `depuis` dans la direction `deg`° */
const versAngle = (depuis: Pt, deg: number, longueur: number): Pt => ({
	x: depuis.x + longueur * Math.cos(rad(deg)),
	y: depuis.y + longueur * Math.sin(rad(deg))
});

/** Une instance de la variation voulue (reconnue à son énoncé) ; ouvre l'aperçu admin dessus */
async function ouvrirTriangle(
	page: Page,
	convient: (instance: QuestionInstance) => boolean
): Promise<{ instance: QuestionInstance; win: Win; a: Pt; b: Pt; zone: Locator }> {
	const modele = await modeleDeLaBase(TRIANGLE);
	const { seed, instance } = graine(modele, convient);
	const bloc = blocDe(instance);
	await ouvrirModele(page, modele, seed);
	const zone = await figureZone(page);
	return {
		instance,
		win: fenetreDe(bloc),
		a: pointDe(bloc, 'A'),
		b: pointDe(bloc, 'B'),
		zone
	};
}

/** Règle posée le 0 en `centre` vers `vers`, puis compas piqué en `centre` ouvert près de `cm` */
async function arcAuCompas(
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
	// Visé un peu à côté de la graduation, perpendiculairement à la règle
	await tapFigure(
		zone,
		win,
		centre.x + (dx / norme) * cm - (dy / norme) * 0.12,
		centre.y + (dy / norme) * cm + (dx / norme) * 0.12
	);
}

/** Rapporteur posé en A sur [AB], repère à `deg`° (toucher au bord, puis ‹ › jusqu'au degré) */
async function rapporteurEnA(
	page: Page,
	zone: Locator,
	win: Win,
	a: Pt,
	b: Pt,
	deg: number
): Promise<void> {
	await outil(page, 'rapporteur');
	await tapFigure(zone, win, a.x, a.y);
	await tapFigure(zone, win, b.x, b.y);
	await expect(page.getByTestId('rapporteur')).toHaveCount(1);
	const rayon = 0.35 * Math.min(win.xMax - win.xMin, win.yMax - win.yMin);
	const repere = versAngle(a, deg, rayon);
	await tapFigure(zone, win, repere.x, repere.y);
	const curseur = page.getByTestId('rapporteur');
	for (let essai = 0; essai < 140; essai++) {
		const valeur = Number(await curseur.getAttribute('aria-valuenow'));
		if (valeur === deg) return;
		await press(page.getByTestId(valeur < deg ? 'rapporteur-plus' : 'rapporteur-moins'));
	}
	expect(Number(await curseur.getAttribute('aria-valuenow'))).toBe(deg);
}

/**
 * Le texte de la carte corrigée (énoncé, remarque, correction) se lit : chaque morceau de texte
 * (hors formules et dessin) fait au moins 14 px, et la page ne déborde pas en largeur
 */
async function enonceEtCorrectionLisibles(page: Page): Promise<void> {
	const tailles = await page.locator('.correction-card-wrapper').evaluate((racine) => {
		const lus: Array<{ texte: string; taille: number }> = [];
		const marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
		for (let n = marcheur.nextNode(); n; n = marcheur.nextNode()) {
			const texte = (n.textContent ?? '').trim();
			const parent = n.parentElement;
			if (texte.length < 6 || !parent) continue;
			if (parent.closest('svg, .katex, math-span, math-div, [aria-hidden="true"], script, style')) {
				continue;
			}
			if (getComputedStyle(parent).display === 'none') continue;
			lus.push({
				texte: texte.slice(0, 40),
				taille: parseFloat(getComputedStyle(parent).fontSize)
			});
		}
		return lus;
	});
	expect(tailles.length, 'morceaux de texte mesurés (énoncé et correction)').toBeGreaterThan(3);
	for (const { texte, taille } of tailles) {
		expect(taille, `taille de « ${texte} » (px)`).toBeGreaterThanOrEqual(14);
	}
	await sansDebordement(page);
}

test.describe('#2661 — « Construire un triangle » : trois longueurs en cm (v5)', () => {
	const v5 = (i: QuestionInstance): boolean =>
		i.statement.includes('Prends les longueurs sur la règle graduée avec le compas') &&
		variable(i, 'l') === 4 &&
		variable(i, 'm') === 5;

	test('#2661 — v5 (AC = 4 cm, BC = 5 cm) : règle posée en A, compas ouvert sur la graduation, arc ; idem en B ; C au croisement → juste', async ({
		page
	}) => {
		const { win, a, b, zone } = await ouvrirTriangle(page, v5);
		const c = croisement(a, 4, b, 5).sort((p, q) => q.y - p.y)[0];
		await arcAuCompas(page, zone, win, a, { x: a.x + 6, y: a.y }, 4);
		await attendreMm(page, 40);
		await compte(page, 'cercle-eleve', 1);
		await arcAuCompas(page, zone, win, b, { x: b.x - 6, y: b.y }, 5);
		await attendreMm(page, 50);
		await compte(page, 'cercle-eleve', 2);
		await outil(page, 'segment');
		await tapFigure(zone, win, a.x, a.y);
		await tapFigure(zone, win, c.x, c.y);
		await tapFigure(zone, win, b.x, b.y);
		await tapFigure(zone, win, c.x, c.y);
		await compte(page, 'segment-eleve', 2);
		await validate(page);
		await estJuste(page);
		await shootThemes(page, fig(page).first(), '2661-v5-juste');
	});

	test('#2661 — v5 : compas ouvert à l’œil (sans règle) → message « ouvert à l’œil » ; énoncé et correction lisibles', async ({
		page
	}) => {
		const { win, a, b, zone } = await ouvrirTriangle(page, v5);
		const c = croisement(a, 4, b, 5).sort((p, q) => q.y - p.y)[0];
		await arcAuCompas(page, zone, win, a, { x: a.x + 6, y: a.y }, 4, false);
		await arcAuCompas(page, zone, win, b, { x: b.x - 6, y: b.y }, 5);
		await outil(page, 'segment');
		await tapFigure(zone, win, a.x, a.y);
		await tapFigure(zone, win, c.x, c.y);
		await tapFigure(zone, win, b.x, b.y);
		await tapFigure(zone, win, c.x, c.y);
		await compte(page, 'segment-eleve', 2);
		await validate(page);
		await dit(page, 'Ton compas est ouvert à l’œil : ouvre-le sur une graduation de la règle');
		await compte(page, 'bonne-regle', 2);
		await compte(page, 'bon-triangle-arc', 2);
		await enonceEtCorrectionLisibles(page);
		await shootThemes(page, fig(page).first(), '2661-v5-oeil');
	});
});

test.describe('#2661 — « Construire un triangle » : deux côtés et l’angle compris (v6)', () => {
	// Un angle proche de 50° (la ligne dit 50°) : la figure tient dans la fenêtre pour 130° aussi
	const v6 = (i: QuestionInstance): boolean =>
		/CAB = \d+ ; AC = \d+ cm/.test(i.statement) && variable(i, 'a') >= 45 && variable(i, 'a') <= 55;

	/** Rapporteur à `deg`°, règle posée en A vers le repère, côté d'angle tracé sur `longueur` cm */
	async function coteDAngle(
		page: Page,
		ctx: { win: Win; a: Pt; b: Pt; zone: Locator },
		deg: number,
		longueur: number
	): Promise<void> {
		await rapporteurEnA(page, ctx.zone, ctx.win, ctx.a, ctx.b, deg);
		await outil(page, 'regle');
		await tapFigure(ctx.zone, ctx.win, ctx.a.x, ctx.a.y);
		const repere = versAngle(ctx.a, deg, 3.15);
		await tapFigure(ctx.zone, ctx.win, repere.x, repere.y);
		await compte(page, 'regle', 1);
		await outil(page, 'segment');
		await tapFigure(ctx.zone, ctx.win, ctx.a.x, ctx.a.y);
		const bout = versAngle(ctx.a, deg, longueur);
		await tapFigure(ctx.zone, ctx.win, bout.x, bout.y);
		await compte(page, 'segment-eleve', 1);
	}

	test('#2661 — v6 (angle a° proche de 50°, AC en cm) : rapporteur en A, règle le long du côté, côté d’angle, [BC] arrêté sur la graduation de AC → juste', async ({
		page
	}) => {
		const ctx = await ouvrirTriangle(page, v6);
		const a = variable(ctx.instance, 'a');
		const l = variable(ctx.instance, 'l');
		await coteDAngle(page, ctx, a, 6);
		const c = versAngle(ctx.a, a, l);
		await tapFigure(ctx.zone, ctx.win, ctx.b.x, ctx.b.y);
		await tapFigure(ctx.zone, ctx.win, c.x, c.y);
		await compte(page, 'segment-eleve', 2);
		await validate(page);
		await estJuste(page);
		await shootThemes(page, fig(page).first(), '2661-v6-graduation-juste');
	});

	test('#2661 — v6 : C à l’arc du compas ouvert sur la règle à AC (croisement avec le côté d’angle) → juste', async ({
		page
	}) => {
		const ctx = await ouvrirTriangle(page, v6);
		const a = variable(ctx.instance, 'a');
		const l = variable(ctx.instance, 'l');
		await rapporteurEnA(page, ctx.zone, ctx.win, ctx.a, ctx.b, a);
		await arcAuCompas(page, ctx.zone, ctx.win, ctx.a, versAngle(ctx.a, a, 3.15), l);
		await attendreMm(page, l * 10);
		await compte(page, 'cercle-eleve', 1);
		await outil(page, 'segment');
		await tapFigure(ctx.zone, ctx.win, ctx.a.x, ctx.a.y);
		const bout = versAngle(ctx.a, a, 6);
		await tapFigure(ctx.zone, ctx.win, bout.x, bout.y);
		const c = versAngle(ctx.a, a, l);
		await tapFigure(ctx.zone, ctx.win, ctx.b.x, ctx.b.y);
		await tapFigure(ctx.zone, ctx.win, c.x, c.y);
		await compte(page, 'segment-eleve', 2);
		await validate(page);
		await estJuste(page);
		await shootThemes(page, fig(page).first(), '2661-v6-arc-juste');
	});

	test('#2661 — v6 : l’angle supplémentaire (180° − a°, 130° pour 50°) → « Ton angle CAB mesure 130° au lieu de 50°. » ; énoncé et correction lisibles', async ({
		page
	}) => {
		const ctx = await ouvrirTriangle(page, v6);
		const a = variable(ctx.instance, 'a');
		const l = variable(ctx.instance, 'l');
		await coteDAngle(page, ctx, 180 - a, l + 1);
		const c = versAngle(ctx.a, 180 - a, l);
		await tapFigure(ctx.zone, ctx.win, ctx.b.x, ctx.b.y);
		await tapFigure(ctx.zone, ctx.win, c.x, c.y);
		await compte(page, 'segment-eleve', 2);
		await validate(page);
		await dit(page, `Ton angle CAB mesure ${180 - a}° au lieu de ${a}°`);
		await compte(page, 'bonne-regle', 1);
		await compte(page, 'bon-triangle-angle', 1);
		await enonceEtCorrectionLisibles(page);
		await shootThemes(page, fig(page).first(), '2661-v6-supplementaire');
	});
});

test.describe('#2665 — « Construire un triangle » : variation à angle sans cm', () => {
	const sansCm = (i: QuestionInstance): boolean =>
		/AC = u ; CAB = \d+/.test(i.statement) && variable(i, 'a') === 50 && variable(i, 'k') === 1;

	test('#2665 — angle 50° et AC = u : côté d’angle tracé, puis deux [BC] arrêtés sur ce côté → « Trace un seul triangle ABC. »', async ({
		page
	}) => {
		const { instance, win, a, b, zone } = await ouvrirTriangle(page, sansCm);
		expect(await palette(page)).toEqual([
			'rapporteur=Rapporteur',
			'droite=Règle',
			'segment=Segment',
			'report=Report',
			'compas=Compas'
		]);
		// Le segment u de la figure : ses deux bouts, lus dans le bloc
		const u = instance.statement.match(
			/u = segment\(point\((-?[\d.]+), (-?[\d.]+)[^)]*\), point\((-?[\d.]+), (-?[\d.]+)/
		);
		if (!u) throw new Error('segment u introuvable dans le bloc');
		const [u1, u2] = [
			{ x: Number(u[1]), y: Number(u[2]) },
			{ x: Number(u[3]), y: Number(u[4]) }
		];
		const longueurU = u2.x - u1.x;
		await rapporteurEnA(page, zone, win, a, b, 50);
		// Le côté d'angle : la règle de A au repère, puis le segment le long de la règle
		await outil(page, 'droite');
		await tapFigure(zone, win, a.x, a.y);
		const repere = versAngle(a, 50, 3.15);
		await tapFigure(zone, win, repere.x, repere.y);
		await compte(page, 'droite-eleve', 1);
		await outil(page, 'segment');
		await tapFigure(zone, win, a.x, a.y);
		const bout = versAngle(a, 50, 6);
		await tapFigure(zone, win, bout.x, bout.y);
		await compte(page, 'segment-eleve', 1);
		// Report de u, piqué en A : l'arc coupe le côté d'angle en C
		await outil(page, 'report');
		await tapFigure(zone, win, u1.x, u1.y);
		await tapFigure(zone, win, u2.x, u2.y);
		await toucheA(zone, win, a);
		await compte(page, 'report-eleve', 1);
		// Deux [BC] : l'un arrêté plus tôt sur le côté d'angle, l'autre au croisement (à u de A)
		await outil(page, 'segment');
		for (const longueur of [longueurU * 0.4, longueurU]) {
			const c = versAngle(a, 50, longueur);
			await tapFigure(zone, win, b.x, b.y);
			await tapFigure(zone, win, c.x, c.y);
		}
		await compte(page, 'segment-eleve', 3);
		await validate(page);
		await dit(page, 'Trace un seul triangle ABC.');
		await shootThemes(page, fig(page).first(), '2665-un-seul-triangle');
	});
});
