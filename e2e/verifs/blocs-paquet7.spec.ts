import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';
import { associerEntry } from '../../src/lib/block-catalog/associer';
import { figureACompleterEntry } from '../../src/lib/block-catalog/figure-a-completer';
import { schemaBarresEntry } from '../../src/lib/block-catalog/schema-barres';
import { ADMIN, assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';
import {
	createWorksheet,
	pdfText,
	pdfToPng,
	STYLE_IDS,
	teacherPdf,
	TEACHER_ID
} from './helpers/fiches';
import { isTouch, projectName } from './helpers/modele-brouillon';
import { expectNoHorizontalOverflow, gotoSettled } from './helpers/pages';
import { components, inkBox, isBlack, pdfBoxes, rasterPage, share } from './helpers/pdf-mesures';
import { expectContrastBothThemes, setTheme, smallestDrawingText } from './helpers/themes-lisibles';

/**
 * Blocs, paquet 7 (tri des vérifications manuelles)
 * =================================================
 *
 * Reprend les lignes #2611 (PDF de « mesure AB » à l'échelle), #2637 (courbe dans un élément
 * d'associer), #2644 (modèles « relier » à courbes, 2de et 3e), #2644 / #2646 (brouillons
 * `5eec6d7d` et `27ac630c`), #2619 (schéma en barres dans une case choix, modèle 6-142) et #2597
 * (schéma en barres) de `docs/wip/verifications-manuelles.md`. Les lignes #2606 et #2658 (instruments
 * de la figure à compléter) sont dans `blocs-geometrie-7.spec.ts`.
 *
 * Décor : les modèles de la base locale (copie de la prod) lus tels quels dans l'aperçu admin ;
 * pour les PDF, des fiches « Verifs7 blocs <projet> w<n> fiche … » du prof, effacées par ce préfixe
 * seulement. Les blocs de départ sont les exemples du catalogue (`src/lib/block-catalog/`), jamais
 * recopiés. Aucun compte élève : tout se joue en prof (aide à l'écriture, fiches) ou en admin
 * (aperçu des modèles).
 *
 * Ce que ces tests ne voient pas : la vraie imprimante (échelle 100 %, règle sur le papier), le vrai
 * doigt (viser un point de 2 cm sans le voir sous le doigt), la relecture du contenu par David et
 * la publication des brouillons (jamais depuis ici). Captures : `.captures/verifs/blocs-paquet7/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());
test.beforeEach(() => test.setTimeout(180_000));

// Constantes

const SHOTS = '.captures/verifs/blocs-paquet7';
const PREFIX = 'Verifs7 blocs';
/** Modèle « Relier une courbe à sa fonction de référence » (2de), brouillon de la ligne #2644 / #2646 */
const MODELE_2DE = '5eec6d7d-a69b-4ef9-bebd-524e28044929';
/** Modèle « Relier une droite à sa fonction affine » (3e), brouillon de la ligne #2644 / #2646 */
const MODELE_3E = '27ac630c-3784-43fe-8569-53b769eb4f00';
/** Modèle 6-142 « Schéma en barres : choisir le schéma d'un énoncé » */
const MODELE_6_142 = 'a9c37578-1364-47f4-9cf1-b047b6c29a68';
/** 1 cm CSS = 96 / 2,54 px */
const PX_PER_CM = 96 / 2.54;

// Types

interface Spot {
	x: number;
	y: number;
}

interface Region {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

// Fonctions

const workerPrefix = (): string => `${PREFIX} ${projectName()} w${test.info().parallelIndex}`;
const fichePrefix = (): string => `${workerPrefix()} fiche`;
const exerciseSource = (): string => `verifs7 ${projectName()} w${test.info().parallelIndex}`;

function exemple(entry: { examples: { title: string; source: string }[] }, title: string): string {
	const found = entry.examples.find((example) => example.title === title);
	if (!found) throw new Error(`exemple introuvable dans le catalogue : ${title}`);
	return found.source;
}

const MES = exemple(figureACompleterEntry, 'Mesurer un segment (règle graduée)');
const COURBES = exemple(associerEntry, 'Courbe ↔ expression');
const PRIMES = exemple(schemaBarresEntry, 'Les primes');

async function press(locator: Locator): Promise<void> {
	await locator.scrollIntoViewIfNeeded();
	if (isTouch()) await locator.tap();
	else await locator.click();
}

async function shot(page: Page, name: string): Promise<void> {
	await mkdir(SHOTS, { recursive: true });
	await page.screenshot({ path: `${SHOTS}/${name}-${projectName()}.png` });
}

/** L'onglet actif de l'aperçu admin : « Contrôle blanc » (la carte jouée, puis sa correction) */
const carte = (page: Page): Locator => page.locator('[role="tabpanel"][data-state="active"]');

// ============================================================================
// Aperçu admin d'un modèle « relier » à courbes (#2644, #2646)
// ============================================================================

/** Ouvre l'aperçu admin d'un modèle de la base locale, avec cette graine si elle est donnée */
async function ouvrirModele(
	page: Page,
	id: string,
	seed?: number,
	dejaConnecte = false
): Promise<void> {
	if (!dejaConnecte) await login(page, ADMIN.email, ADMIN.password);
	await gotoSettled(page, `/dashboard/admin/questions/${id}/preview`);
	await page.waitForLoadState('networkidle');
	if (seed !== undefined) await nouvelleGraine(page, seed);
	await expect(carte(page).locator('[data-relier-case^="item:"]').first()).toBeVisible({
		timeout: 30_000
	});
}

/** Tire une instance de cette graine (champ « Seed », bouton « Générer ») */
async function nouvelleGraine(page: Page, seed: number): Promise<void> {
	await page.getByLabel('Seed (optionnel)').fill(String(seed));
	await page.getByRole('button', { name: 'Générer', exact: true }).click();
	await expect(page.getByLabel('Seed (optionnel)')).toHaveValue(String(seed));
	await page.waitForLoadState('networkidle');
	await expect(carte(page).locator('[data-relier-case^="item:"]').first()).toBeVisible({
		timeout: 30_000
	});
}

/** La variation tirée, lue dans le panneau de débogage de l'aperçu */
async function variationTiree(page: Page): Promise<number> {
	const text = (await page.locator('#contenu-principal').innerText()).replace(/\s+/g, ' ');
	const match = text.match(/Variation (\d+)/);
	if (!match) throw new Error('pas de « Variation n » dans le panneau de débogage');
	return Number(match[1]);
}

/** Étiquettes affichées (formule LaTeX sans espaces), dans l'ordre de la colonne de droite */
async function etiquettes(scope: Locator): Promise<string[]> {
	return scope
		.locator('[data-relier-case^="label:"]')
		.evaluateAll((els) => els.map((el) => (el.textContent ?? '').replace(/\s+/g, '')));
}

/** La description (lecteur d'écran) de la courbe de chaque élément, dans l'ordre */
async function descriptions(scope: Locator): Promise<string[]> {
	return scope
		.locator('[data-relier-case^="item:"]')
		.evaluateAll((els) =>
			els.map((el) => el.querySelector('svg[role="img"]')?.getAttribute('aria-label') ?? '')
		);
}

/** L'étiquette juste de la courbe de la 2de, d'après sa description (jamais d'après le panneau de débogage) */
function etiquetteDeReference(description: string): string {
	if (/en U/.test(description)) return 'x\\mapstox^2';
	if (/Deux branches/.test(description)) return 'x\\mapsto\\dfrac{1}{x}';
	if (/en V/.test(description)) return 'x\\mapsto|x|';
	if (/Droite qui passe par l.origine/.test(description)) return 'x\\mapstox';
	throw new Error(`courbe de référence inconnue : ${description}`);
}

/** L'étiquette juste de la droite de la 3e : « passe par (0 ; b) et (1 ; c) » donne y = (c − b) x + b */
function etiquetteAffine(description: string): string {
	const m = description.match(/\(0 ; (-?\d+)\) et \(1 ; (-?\d+)\)/);
	if (!m) throw new Error(`droite sans deux points : ${description}`);
	const b = Number(m[1]);
	const a = Number(m[2]) - b;
	const terme = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`;
	const reste = b === 0 ? '' : b > 0 ? `+${b}` : `-${-b}`;
	return `x\\mapsto${terme}${reste}`;
}

/** L'index de l'étiquette juste de chaque élément ; un texte absent des étiquettes fait échouer */
function indexJustes(
	descriptionsDesElements: string[],
	labels: string[],
	juste: (d: string) => string
): number[] {
	return descriptionsDesElements.map((description) => {
		const voulue = juste(description);
		const index = labels.indexOf(voulue);
		expect(
			index,
			`l'étiquette « ${voulue} » est affichée (étiquettes : ${labels.join(' ; ')})`
		).toBeGreaterThanOrEqual(0);
		return index;
	});
}

/** Relie l'élément `item` à l'étiquette `label` : un toucher sur chaque case, au doigt ou à la souris */
async function relier(scope: Locator, item: number, label: number): Promise<void> {
	await press(scope.locator(`[data-relier-case="item:${item}"]`));
	await press(scope.locator(`[data-relier-case="label:${label}"]`));
	await expect(scope.locator(`[data-relier-case="item:${item}"]`)).toHaveAttribute(
		'aria-label',
		new RegExp(`relié à l’étiquette ${label + 1}`)
	);
}

async function valider(page: Page): Promise<void> {
	const button = page.getByRole('button', { name: 'Valider' });
	await button.scrollIntoViewIfNeeded();
	await expect(button).toBeEnabled();
	await button.click();
	await expect(page.locator('.correction-card-wrapper')).toHaveCount(1, { timeout: 30_000 });
}

/** La figure corrigée : la face avant de la carte de correction */
const corrigee = (page: Page): Locator =>
	page.locator('.correction-card-wrapper .flip-front .associer-relier');

/** La largeur d'une courbe (son dessin) dans chaque élément, en px */
async function largeursDesCourbes(scope: Locator): Promise<number[]> {
	return scope
		.locator('[data-relier-case^="item:"]')
		.evaluateAll((els) =>
			els.map((el) => el.querySelector('svg[role="img"]')?.getBoundingClientRect().width ?? 0)
		);
}

/** Les deux colonnes sont côte à côte (même au téléphone) et la page ne déborde pas */
async function deuxColonnesDansLEcran(page: Page, scope: Locator, label: string): Promise<void> {
	const items = await scope
		.locator('[data-relier-case^="item:"]')
		.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right));
	const labelsLeft = await scope
		.locator('[data-relier-case^="label:"]')
		.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left));
	expect(Math.max(...items), `${label} : éléments à gauche des étiquettes`).toBeLessThanOrEqual(
		Math.min(...labelsLeft) + 1
	);
	await expectNoHorizontalOverflow(page, label);
}

/** Les points de liaison ne mordent pas sur les courbes (leur boîte ne recouvre pas celle du dessin) */
async function pointsHorsDesCourbes(scope: Locator, label: string): Promise<void> {
	const chevauchements = await scope.locator('[data-relier-case^="item:"]').evaluateAll((els) =>
		els.map((el) => {
			const svg = el.querySelector('svg[role="img"]')?.getBoundingClientRect();
			const point = el.querySelector('[data-relier-point]')?.getBoundingClientRect();
			if (!svg || !point) return Infinity;
			// Recouvrement horizontal de la courbe par le point (px) : > 1 = le point mord le dessin
			return Math.min(svg.right, point.right) - Math.max(svg.left, point.left);
		})
	);
	for (const [k, mord] of chevauchements.entries()) {
		expect(
			mord,
			`${label} : le point de l'élément ${k + 1} recouvre la courbe de ${mord} px`
		).toBeLessThanOrEqual(1);
	}
}

/** Glisser d'un point à l'autre : au doigt sur Android, à la souris sur ordinateur ; rend false sur iPhone */
class Glisse {
	private session: CDPSession | null = null;

	constructor(private readonly page: Page) {}

	private async send(type: 'touchStart' | 'touchMove' | 'touchEnd', spot?: Spot): Promise<void> {
		this.session ??= await this.page.context().newCDPSession(this.page);
		await this.session.send('Input.dispatchTouchEvent', {
			type,
			touchPoints: spot === undefined ? [] : [{ x: spot.x, y: spot.y, id: 0 }]
		});
	}

	async glisser(from: Spot, to: Spot): Promise<boolean> {
		if (projectName() === 'iphone') return false;
		if (projectName() === 'android') {
			await this.send('touchStart', from);
			for (let step = 1; step <= 8; step++) {
				await this.send('touchMove', {
					x: from.x + ((to.x - from.x) * step) / 8,
					y: from.y + ((to.y - from.y) * step) / 8
				});
			}
			await this.send('touchEnd');
			return true;
		}
		await this.page.mouse.move(from.x, from.y);
		await this.page.mouse.down();
		await this.page.mouse.move(to.x, to.y, { steps: 8 });
		await this.page.mouse.up();
		return true;
	}
}

/** Le centre du point de liaison d'une case */
async function centreDuPoint(scope: Locator, side: 'item' | 'label', index: number): Promise<Spot> {
	const point = scope.locator(`[data-relier-case="${side}:${index}"] [data-relier-point]`);
	await point.scrollIntoViewIfNeeded();
	const box = await point.boundingBox();
	if (!box) throw new Error('point de liaison sans boîte');
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Les traits de la correction : couleur de trait et pointillés, lus sur le rendu */
async function traits(
	page: Page,
	kind: 'juste' | 'faux' | 'solution'
): Promise<{ stroke: string; dash: string }[]> {
	return corrigee(page)
		.locator(`line.relier-trait-${kind}`)
		.evaluateAll((els) =>
			els.map((el) => {
				const style = getComputedStyle(el);
				return { stroke: style.stroke, dash: style.strokeDasharray };
			})
		);
}

/** Une couleur `rgb(...)` ou `color(srgb ...)` en [r, g, b] sur 255 */
function rvb(css: string): [number, number, number] {
	const m = css.match(/rgba?\(([^)]+)\)/);
	if (m) {
		const p = m[1]
			.split(/[ ,/]+/)
			.filter(Boolean)
			.map(Number);
		return [p[0], p[1], p[2]];
	}
	const c = css.match(/color\(srgb ([^)]+)\)/);
	if (c) {
		const p = c[1].split(/[ /]+/).filter(Boolean).map(Number);
		return [p[0] * 255, p[1] * 255, p[2] * 255];
	}
	throw new Error(`couleur illisible : ${css}`);
}

/** Le corrigé écrit : visible, formules rendues, corps de texte lisible, dans l'écran */
async function corrigeEcritLisible(page: Page, debut: string): Promise<void> {
	const ligne = page.getByText(debut, { exact: false }).locator('visible=true').first();
	await ligne.scrollIntoViewIfNeeded();
	await expect(ligne).toBeVisible();
	const paragraphe = ligne.locator('xpath=ancestor-or-self::p[1]');
	// Les formules du corrigé sont des `math-span` (MathLive statique) : présentes, et dessinées (boîte non vide)
	const formules = paragraphe.locator('math-span');
	expect(await formules.count(), 'formules rendues dans le corrigé').toBeGreaterThan(0);
	const boite = await formules.first().boundingBox();
	expect(boite?.width ?? 0, 'première formule dessinée (largeur)').toBeGreaterThan(5);
	const px = await paragraphe.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
	expect(px, 'corps du corrigé écrit (px)').toBeGreaterThanOrEqual(14);
	const box = await paragraphe.boundingBox();
	const largeur = page.viewportSize()?.width ?? 1280;
	expect((box?.x ?? 0) + (box?.width ?? 0), 'le corrigé tient dans l’écran').toBeLessThanOrEqual(
		largeur + 1
	);
}

test.describe('#2644 — modèles « relier » à courbes (aperçu admin)', () => {
	test('#2644 — 2de « Relier une courbe à sa fonction de référence » : 4 courbes à gauche (lisibles), 5 étiquettes dont l’intrus −x², chaque courbe reliée à son expression → juste', async ({
		page
	}) => {
		await ouvrirModele(page, MODELE_2DE, 11);
		const scope = carte(page);
		await expect(scope.locator('[data-relier-case^="item:"]')).toHaveCount(4);
		const labels = await etiquettes(scope);
		expect(labels, 'les cinq étiquettes (x², 1/x, |x|, x et l’intrus −x²)').toHaveLength(5);
		expect(labels).toContain('x\\mapsto-x^2');
		await deuxColonnesDansLEcran(page, scope, '2de');
		await pointsHorsDesCourbes(scope, '2de');
		const justes = indexJustes(await descriptions(scope), labels, etiquetteDeReference);
		for (const [item, label] of justes.entries()) await relier(scope, item, label);
		await shot(page, '2644-2de-reliee');
		await valider(page);
		await expect(corrigee(page).locator('p[role="status"]')).toContainText('réponse juste');
		await expect(page.locator('.correction-card-wrapper')).toContainText('Juste');
		expect(await traits(page, 'juste'), 'quatre traits justes').toHaveLength(4);
		expect(await traits(page, 'faux'), 'aucun trait faux').toHaveLength(0);
	});

	test('#2644 — 2de : une courbe reliée à l’intrus −x² → son trait est rouge, le bon trait est en pointillés verts ; corrigé écrit lisible', async ({
		page
	}) => {
		await ouvrirModele(page, MODELE_2DE, 11);
		const scope = carte(page);
		const labels = await etiquettes(scope);
		const justes = indexJustes(await descriptions(scope), labels, etiquetteDeReference);
		const intrus = labels.indexOf('x\\mapsto-x^2');
		for (const [item, label] of justes.entries())
			await relier(scope, item, item === 0 ? intrus : label);
		await valider(page);
		await expect(corrigee(page).locator('p[role="status"]')).toContainText('réponse fausse');
		const faux = await traits(page, 'faux');
		expect(faux, 'un trait faux').toHaveLength(1);
		const [r, g, b] = rvb(faux[0].stroke);
		expect(r, `trait faux rouge (${faux[0].stroke})`).toBeGreaterThan(g + 60);
		expect(r).toBeGreaterThan(b + 60);
		const solution = await traits(page, 'solution');
		expect(solution, 'un bon trait en pointillés').toHaveLength(1);
		expect(solution[0].dash, 'bon trait en pointillés').not.toMatch(/^(none|)$/);
		const [sr, sg, sb] = rvb(solution[0].stroke);
		expect(sg, `bon trait vert (${solution[0].stroke})`).toBeGreaterThan(sr + 30);
		expect(sg).toBeGreaterThan(sb + 30);
		expect(await traits(page, 'juste'), 'les trois autres traits sont justes').toHaveLength(3);
		await corrigeEcritLisible(page, 'Courbe 1');
		await shot(page, '2644-2de-fausse');
	});

	test('#2644 — 3e « Relier une droite à sa fonction affine » : trois droites, étiquettes écrites `-2x+3` (jamais `3-2x`) sur dix tirages des deux variations ; chaque droite reliée à son expression → juste', async ({
		page
	}) => {
		await ouvrirModele(page, MODELE_3E, 1);
		const variations = new Set<number>();
		for (let seed = 1; seed <= 10; seed++) {
			if (seed > 1) await nouvelleGraine(page, seed);
			variations.add(await variationTiree(page));
			const scope = carte(page);
			const labels = await etiquettes(scope);
			expect(labels.length, 'au moins quatre étiquettes').toBeGreaterThanOrEqual(4);
			for (const label of labels) {
				const forme = label.replace('x\\mapsto', '');
				// Le terme en x d'abord : « −2x+3 », jamais « 3−2x » ni « 3+2x »
				expect(
					forme,
					`étiquette « ${label} » (graine ${seed}) écrite terme en x d'abord`
				).not.toMatch(/^-?\d+[-+]\d*x$/);
			}
			const justes = indexJustes(await descriptions(scope), labels, etiquetteAffine);
			if (seed === 1) {
				await deuxColonnesDansLEcran(page, scope, '3e');
				await pointsHorsDesCourbes(scope, '3e');
			}
			for (const [item, label] of justes.entries()) await relier(scope, item, label);
			await valider(page);
			await expect(corrigee(page).locator('p[role="status"]'), `graine ${seed}`).toContainText(
				'réponse juste'
			);
			if (seed === 1) await shot(page, '2644-3e-juste');
		}
		expect(variations.size, `les deux variations ont été tirées (vues : ${[...variations]})`).toBe(
			2
		);
	});

	test('#2644 — 3e : une droite reliée à l’étiquette qui échange a et b → trait rouge, bon trait en pointillés ; corrigé écrit lisible (droite 1 …)', async ({
		page
	}) => {
		await ouvrirModele(page, MODELE_3E, 1);
		const scope = carte(page);
		const labels = await etiquettes(scope);
		const justes = indexJustes(await descriptions(scope), labels, etiquetteAffine);
		// L'intrus : l'étiquette qui ne va avec aucune droite
		const intrus = labels.findIndex((_, index) => !justes.includes(index));
		expect(intrus, 'une étiquette intruse').toBeGreaterThanOrEqual(0);
		for (const [item, label] of justes.entries())
			await relier(scope, item, item === 0 ? intrus : label);
		await valider(page);
		expect(await traits(page, 'faux')).toHaveLength(1);
		const solution = await traits(page, 'solution');
		expect(solution).toHaveLength(1);
		expect(solution[0].dash).not.toMatch(/^(none|)$/);
		await corrigeEcritLisible(page, 'Droite 1');
		await shot(page, '2644-3e-fausse');
	});
});

/** Nombre d'éléments à courbes de chaque modèle (mesuré à l'écran, à confirmer au premier lancement) */
const NB_COURBES_2DE = 4;
const NB_COURBES_3E = 3;

test.describe('#2644, #2646 — brouillons « associer » 3e 27ac630c et 2de 5eec6d7d', () => {
	test('#2644 — état de la base LOCALE : les deux brouillons (2de, 3e) y existent en brouillon, de bon niveau ; les tests suivants les jouent depuis cette base ; la publication reste à David', async () => {
		const rows = await sql<{ id: string; title: string; status: string; grades: string[] }>(
			`select id, title, status, grades from question_templates where id = any($1::uuid[]) order by title`,
			[[MODELE_2DE, MODELE_3E]]
		);
		expect(rows.map((r) => `${r.id.slice(0, 8)} ${r.status} ${r.grades.join(',')}`).sort()).toEqual(
			['27ac630c draft 3', '5eec6d7d draft 2']
		);
	});

	test('#2646 — chaque courbe reliée à son expression au toucher, sur 8 tirages de chaque brouillon : corrigé juste à chaque fois', async ({
		page
	}) => {
		for (const [modele, justeDe] of [
			[MODELE_2DE, etiquetteDeReference],
			[MODELE_3E, etiquetteAffine]
		] as const) {
			await ouvrirModele(page, modele, 100, modele !== MODELE_2DE);
			for (let seed = 100; seed < 108; seed++) {
				if (seed > 100) await nouvelleGraine(page, seed);
				const scope = carte(page);
				const labels = await etiquettes(scope);
				const justes = indexJustes(await descriptions(scope), labels, justeDe);
				for (const [item, label] of justes.entries()) await relier(scope, item, label);
				await valider(page);
				await expect(
					corrigee(page).locator('p[role="status"]'),
					`${modele.slice(0, 8)} graine ${seed}`
				).toContainText('réponse juste');
			}
		}
	});

	test('#2644 — le glisser : une courbe tirée au doigt (Android) ou à la souris (ordinateur) jusqu’à son étiquette ; trait tracé (iPhone : toucher une case puis l’autre)', async ({
		page
	}) => {
		await ouvrirModele(page, MODELE_2DE, 21);
		const scope = carte(page);
		const labels = await etiquettes(scope);
		const justes = indexJustes(await descriptions(scope), labels, etiquetteDeReference);
		const glisse = new Glisse(page);
		const from = await centreDuPoint(scope, 'item', 0);
		const to = await centreDuPoint(scope, 'label', justes[0]);
		const fait = await glisse.glisser(from, to);
		if (!fait) await relier(scope, 0, justes[0]);
		await expect(scope.locator('[data-relier-case="item:0"]')).toHaveAttribute(
			'aria-label',
			new RegExp(`relié à l’étiquette ${justes[0] + 1}`)
		);
		await expect(scope.locator('line.relier-trait-eleve')).toHaveCount(1);
	});
});

// ============================================================================
// #2637 — courbe dans un élément d'associer (page d'aide à l'écriture, prof)
// ============================================================================

const ASSOCIER_PATH = '/aide-ecriture/blocs/associer';

async function ouvrirAide(page: Page, path: string): Promise<void> {
	await login(page, TEACHER.email, TEACHER.password);
	await gotoSettled(page, path);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await page.waitForLoadState('networkidle');
}

function exemplePage(page: Page, title: string): Locator {
	return page
		.locator('article', { has: page.getByRole('heading', { name: title, exact: true }) })
		.first();
}

test.describe('#2637 — courbe dans un élément d’associer', () => {
	test('#2637 — exemple « Courbe ↔ expression » : deux colonnes gardées (même au téléphone), courbe de ≥ ~130 px, le point de liaison ne mord pas la courbe ; relier au toucher marche', async ({
		page
	}) => {
		await ouvrirAide(page, ASSOCIER_PATH);
		const zone = exemplePage(page, 'Courbe ↔ expression');
		await zone.scrollIntoViewIfNeeded();
		const scope = zone.locator('.associer-relier').first();
		await expect(scope.locator('[data-relier-case^="item:"]')).toHaveCount(3);
		await expect(scope.locator('[data-relier-case^="label:"]')).toHaveCount(4);
		await deuxColonnesDansLEcran(page, scope, 'aide associer');
		await pointsHorsDesCourbes(scope, 'aide associer');
		// Relier chaque courbe à son expression (2x − 1, −x + 2, x² − 2 ; l'intrus x + 2)
		const labels = await etiquettes(scope);
		const voulues = ['x\\mapsto2x-1', 'x\\mapsto-x+2', 'x\\mapstox^2-2'];
		for (const [item, voulue] of voulues.entries()) {
			const index = labels.indexOf(voulue);
			expect(index, `étiquette ${voulue} affichée (${labels})`).toBeGreaterThanOrEqual(0);
			await relier(scope, item, index);
		}
		await expect(scope.locator('line.relier-trait-eleve')).toHaveCount(3);
		await shot(page, '2637-aide-reliee');
		await setTheme(page, 'dark');
		await shot(page, '2637-aide-reliee-sombre');
		await setTheme(page, 'light');
	});

	test('#2637 — un bloc à courbe sans `x:` ni `y:` → un message sur la courbe, pas un dessin muet', async ({
		page
	}) => {
		await ouvrirAide(page, ASSOCIER_PATH);
		const textarea = page.locator('#essayer-bloc');
		await textarea.scrollIntoViewIfNeeded();
		await textarea.fill(
			[
				'````associer',
				'- ```courbe',
				'  f(x) = 2*x - 1',
				'  ```',
				'  -> $x \\mapsto 2x - 1$',
				'- $x^2$ -> carré',
				'- -> constante',
				'````'
			].join('\n')
		);
		const rendu = textarea
			.locator('xpath=ancestor::div[contains(@class,"grid")][1]')
			.locator('div.min-w-0');
		// Le message dit quelle courbe n'est pas dessinée et ce qui manque, au lieu d'un dessin muet
		await expect(rendu.getByText('Bloc courbe : figure non dessinée')).toBeVisible({
			timeout: 15_000
		});
		await expect(
			rendu.getByText('Fenêtre manquante : ajouter une ligne « x: min ; max »')
		).toBeVisible();
		await expect(
			rendu.getByText('Fenêtre manquante : ajouter une ligne « y: min ; max »')
		).toBeVisible();
		await expect(rendu.locator('svg[role="img"]')).toHaveCount(0);
		await shot(page, '2637-sans-fenetre');
	});
});

/** La ligne attend des courbes d'~ 130 px de large au téléphone */
const LARGEUR_ATTENDUE = 130;

/**
 * Courbe lisible : au moins 130 px de large (l'attendu de la ligne, sans tolérance). Sous ce seuil c'est
 * un ÉCART : le symptôme est écrit en positif (les largeurs mesurées), puis `test.fail()` précède l'attendu.
 * Le NOMBRE de courbes mesurées est asserté : un tableau vide donnerait `Math.min()` = `Infinity` et passerait.
 */
function courbeAssezLarge(largeurs: number[], attendues: number, lieu: string): void {
	console.log(
		`${lieu} : courbes de ${largeurs.map(Math.round).join(', ')} px (écran ${test.info().project.name})`
	);
	expect(largeurs, `${lieu} : nombre de courbes mesurées`).toHaveLength(attendues);
	const plusPetite = Math.min(...largeurs);
	expect(plusPetite, `${lieu} : chaque courbe a une largeur mesurée`).toBeGreaterThan(0);
	test.fail(
		plusPetite < LARGEUR_ATTENDUE,
		`${lieu} : plus petite courbe ${Math.round(plusPetite)} px, la ligne attend ~ ${LARGEUR_ATTENDUE} px`
	);
	expect(plusPetite, `${lieu} : courbe ≥ ~${LARGEUR_ATTENDUE} px`).toBeGreaterThanOrEqual(
		LARGEUR_ATTENDUE
	);
}

test.describe('#2637, #2644 — taille des courbes au téléphone', () => {
	// La ligne parle du téléphone : à l'ordinateur la mesure n'a pas de sens (saut visible, motif écrit)
	test.beforeEach(() => {
		test.skip(!isTouch(), 'taille des courbes au téléphone seulement');
	});

	test('#2637 — page d’aide, exemple « Courbe ↔ expression » : chaque courbe fait ≥ ~130 px de large', async ({
		page
	}) => {
		await ouvrirAide(page, ASSOCIER_PATH);
		const zone = exemplePage(page, 'Courbe ↔ expression');
		await zone.scrollIntoViewIfNeeded();
		const scope = zone.locator('.associer-relier').first();
		await expect(scope.locator('[data-relier-case^="item:"]')).toHaveCount(3);
		courbeAssezLarge(await largeursDesCourbes(scope), 3, 'aide associer');
	});

	test('#2644 — aperçu du modèle 2de : chaque courbe fait ≥ ~130 px de large', async ({ page }) => {
		await ouvrirModele(page, MODELE_2DE, 11);
		courbeAssezLarge(await largeursDesCourbes(carte(page)), NB_COURBES_2DE, 'modèle 2de');
	});

	test('#2644 — aperçu du modèle 3e : chaque courbe fait ≥ ~130 px de large', async ({ page }) => {
		await ouvrirModele(page, MODELE_3E, 1);
		courbeAssezLarge(await largeursDesCourbes(carte(page)), NB_COURBES_3E, 'modèle 3e');
	});
});

// ============================================================================
// #2619 — schéma en barres dans une case choix (modèle 6-142)
// ============================================================================

test.describe('#2619 — schéma en barres dans une case choix', () => {
	test('#2619 — modèle 6-142 : trois schémas A, B, C, texte des barres ≈ 12 px à l’écran, étiquettes dans leurs cases ; barres plus courtes au téléphone qu’à l’ordinateur', async ({
		page
	}) => {
		await login(page, ADMIN.email, ADMIN.password);
		await gotoSettled(page, `/dashboard/admin/questions/${MODELE_6_142}/preview`);
		await page.waitForLoadState('networkidle');
		const scope = carte(page);
		const schemas = scope.locator('svg.schema-barres-figure');
		await expect(schemas).toHaveCount(3, { timeout: 30_000 });
		await schemas.first().scrollIntoViewIfNeeded();
		for (const lettre of ['A', 'B', 'C']) {
			await expect(scope.getByText(lettre, { exact: true }).first()).toBeVisible();
		}
		// Texte des barres ≈ 12 px à l'écran (ni écrasé au téléphone, ni changé à l'ordinateur)
		for (let k = 0; k < 3; k++) {
			const { px: plusPetit, text } = await smallestDrawingText(schemas.nth(k));
			expect(
				plusPetit,
				`schéma ${'ABC'[k]} : plus petit texte « ${text} » ≈ 12 px`
			).toBeGreaterThan(11.5);
		}
		const px = await schemas.first().evaluate((svg) => {
			const text = svg.querySelector('text');
			const scale = (text as SVGGraphicsElement).getScreenCTM()?.a ?? 1;
			return parseFloat(getComputedStyle(text as Element).fontSize) * scale;
		});
		expect(px, 'texte ≈ 12 px').toBeLessThan(13.5);
		// Barres plus courtes au téléphone (≈ 5,3 cm) qu'à l'ordinateur (8 cm)
		const largeur = (await schemas.first().boundingBox())?.width ?? 0;
		if (isTouch()) {
			expect(
				largeur / PX_PER_CM,
				`largeur d'un schéma au téléphone : ${Math.round(largeur)} px`
			).toBeLessThan(6.5);
			expect(largeur, 'mais pas écrasé').toBeGreaterThan(150);
		} else {
			expect(
				largeur / PX_PER_CM,
				`largeur d'un schéma à l'ordinateur : ${Math.round(largeur)} px`
			).toBeGreaterThan(7.5);
		}
		// Étiquettes dans leurs cases : chaque texte tient dans un rectangle de son schéma
		const debordements = await schemas.evaluateAll((svgs) =>
			svgs.flatMap((svg, k) => {
				const rects = [...svg.querySelectorAll('rect.schema-barres-segment')].map((r) =>
					r.getBoundingClientRect()
				);
				// Les étiquettes de segments seulement : le total (accolade) est écrit à droite de toutes les barres
				const droiteDesBarres = Math.max(...rects.map((r) => r.right));
				const textes = [...svg.querySelectorAll('text.schema-barres-texte')].filter((t) => {
					const content = (t.textContent ?? '').trim();
					return (
						(content === '?' || /^\d+$/.test(content)) &&
						t.getBoundingClientRect().left < droiteDesBarres
					);
				});
				return textes.flatMap((t) => {
					const box = t.getBoundingClientRect();
					const dans = rects.some(
						(r) =>
							box.left >= r.left - 0.5 &&
							box.right <= r.right + 0.5 &&
							box.top >= r.top - 0.5 &&
							box.bottom <= r.bottom + 0.5
					);
					return dans ? [] : [`schéma ${'ABC'[k]} : « ${t.textContent} » déborde de sa case`];
				});
			})
		);
		expect(debordements, debordements.join(' ; ')).toEqual([]);
		await expectNoHorizontalOverflow(page, 'aperçu du modèle 6-142');
		await shot(page, '2619-schemas');
	});
});

// ============================================================================
// #2597 — schéma en barres sur /demo/blocs
// ============================================================================

test.describe('#2597 — schéma en barres sur /demo/blocs', () => {
	test('#2597 — carte « Un schéma en barres » : barres alignées, Bronze plein plus court qu’Argent avec 80 en pointillés, accolade 320 € à droite ; lisible en clair et en sombre ; tient dans la carte au téléphone', async ({
		page
	}) => {
		await gotoSettled(page, '/demo/blocs');
		const titre = page.getByRole('heading', { name: 'Un schéma en barres', exact: true });
		await titre.scrollIntoViewIfNeeded();
		const carteDemo = titre.locator('xpath=ancestor::div[contains(@class,"overflow-hidden")][1]');
		const svg = carteDemo.locator('svg.schema-barres-figure').first();
		await expect(svg).toBeVisible();
		await svg.scrollIntoViewIfNeeded();

		const dessin = await svg.evaluate((el) => {
			const rect = (r: Element) => {
				const b = r.getBoundingClientRect();
				return {
					left: b.left,
					right: b.right,
					top: b.top,
					bottom: b.bottom,
					dashed: r.classList.contains('schema-barres-manquant')
				};
			};
			return {
				rects: [...el.querySelectorAll('rect.schema-barres-segment')].map(rect),
				textes: [...el.querySelectorAll('text')].map((t) => {
					const b = t.getBoundingClientRect();
					return {
						text: (t.textContent ?? '').trim(),
						left: b.left,
						right: b.right,
						top: b.top,
						bottom: b.bottom
					};
				}),
				accolades: el.querySelectorAll('polyline.schema-barres-accolade').length,
				box: { left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right }
			};
		});
		// Trois barres : on regroupe les segments par hauteur
		const lignes = [...new Set(dessin.rects.map((r) => Math.round(r.top)))].sort((a, b) => a - b);
		expect(lignes, 'trois barres l’une sous l’autre').toHaveLength(3);
		const barre = (k: number) => dessin.rects.filter((r) => Math.round(r.top) === lignes[k]);
		const [or, argent, bronze] = [barre(0), barre(1), barre(2)];
		const gauche = (segments: typeof or) => Math.min(...segments.map((s) => s.left));
		const droite = (segments: typeof or) => Math.max(...segments.map((s) => s.right));
		const pleins = (segments: typeof or) => segments.filter((s) => !s.dashed);
		expect(Math.abs(gauche(or) - gauche(argent)), 'Or et Argent alignées à gauche').toBeLessThan(1);
		expect(Math.abs(gauche(or) - gauche(bronze)), 'Or et Bronze alignées à gauche').toBeLessThan(1);
		// Bronze : le plein est plus court qu'Argent, le pointillé complète jusqu'à la même longueur
		expect(droite(pleins(bronze)), 'Bronze plein plus court qu’Argent').toBeLessThan(
			droite(argent) - 5
		);
		expect(
			bronze.filter((s) => s.dashed),
			'un segment en pointillés chez Bronze'
		).toHaveLength(1);
		expect(
			Math.abs(droite(bronze) - droite(argent)),
			'avec le pointillé, Bronze est aussi long qu’Argent'
		).toBeLessThan(1);
		expect(droite(or), 'Or est la plus longue').toBeGreaterThan(droite(argent) + 5);
		const tirets = await svg
			.locator('rect.schema-barres-manquant')
			.first()
			.evaluate((r) => getComputedStyle(r).strokeDasharray);
		expect(tirets, 'pointillés réels').not.toMatch(/^(none|)$/);
		// 80 écrit dans la case en pointillés, 320 € à droite de toutes les barres, avec une accolade
		const manquant = bronze.find((s) => s.dashed);
		const quatreVingts = dessin.textes.find((t) => t.text === '80');
		expect(quatreVingts, 'le texte 80').toBeDefined();
		expect(
			(quatreVingts?.left ?? 0) >= (manquant?.left ?? 1e9) - 0.5 &&
				(quatreVingts?.right ?? 0) <= (manquant?.right ?? 0) + 0.5,
			'80 dans la case en pointillés'
		).toBe(true);
		const total = dessin.textes.find((t) => t.text === '320 €');
		expect(total, 'le texte 320 €').toBeDefined();
		expect(total?.left ?? 0, '320 € à droite de toutes les barres').toBeGreaterThan(droite(or));
		expect(dessin.accolades, 'une accolade de total').toBeGreaterThanOrEqual(1);
		// Le schéma tient dans la carte (et la page ne déborde pas)
		const cadre = await carteDemo.boundingBox();
		expect(dessin.box.left, 'bord gauche dans la carte').toBeGreaterThanOrEqual(
			(cadre?.x ?? 0) - 1
		);
		expect(dessin.box.right, 'bord droit dans la carte').toBeLessThanOrEqual(
			(cadre?.x ?? 0) + (cadre?.width ?? 0) + 1
		);
		await expectNoHorizontalOverflow(page, '/demo/blocs');
		// Lisible en clair et en sombre : contraste des textes et des traits contre le fond
		await expectContrastBothThemes(page, svg, 'schéma en barres (textes)');
		await expectContrastBothThemes(
			page,
			svg,
			'schéma en barres (traits)',
			'rect.schema-barres-segment, polyline.schema-barres-accolade'
		);
		await mkdir(SHOTS, { recursive: true });
		for (const theme of ['light', 'dark'] as const) {
			await setTheme(page, theme);
			await svg.scrollIntoViewIfNeeded();
			await page.screenshot({
				path: `${SHOTS}/2597-demo-${theme === 'dark' ? 'sombre' : 'clair'}-${projectName()}.png`
			});
		}
		await setTheme(page, 'light');
	});
});

// ============================================================================
// PDF des fiches : #2611, #2637, #2597
// ============================================================================

async function wipe(): Promise<void> {
	await sql(`delete from worksheets where created_by = $1 and title like $2`, [
		TEACHER_ID,
		`${fichePrefix()} %`
	]);
	await sql(`delete from exercises where created_by = $1 and source = $2`, [
		TEACHER_ID,
		exerciseSource()
	]);
}

async function exerciseOf(
	title: string,
	statement: string,
	solution: string
): Promise<{ exercise: { id: string; title: string } }> {
	const rows = await sql<{ id: string }>(
		`insert into exercises (title, source, grades, topic, created_by, category, variations)
		 values ($1, $4, '{}', 'Verifs7', $2, 'automatisme', $3::jsonb) returning id`,
		[
			title,
			TEACHER_ID,
			JSON.stringify([
				{ label: 'guided', hints: [], statement_md: statement, solution_md: solution }
			]),
			exerciseSource()
		]
	);
	return { exercise: { id: rows[0].id, title } };
}

/** Une série d'automatismes figée d'un modèle de la base locale, comme les scripts de fiches la figent */
function figer(templateId: string, seed: number): { statement: string; solution: string } {
	const out = execFileSync(
		'pnpm',
		['exec', 'tsx', 'e2e/verifs/helpers/figer-serie.ts', templateId, String(seed)],
		{ encoding: 'utf8' }
	);
	return JSON.parse(out.slice(out.indexOf('{'))) as { statement: string; solution: string };
}

test.describe('PDF de fiche', { tag: '@bureau' }, () => {
	test.describe.configure({ mode: 'serial' });
	test.skip(() => projectName() !== 'ordi-chrome', 'PDF : même fichier quel que soit l’écran');

	let fiche = '';
	let colonnes = '';
	const ids = { un: '', deux: '' };

	test.beforeAll(async () => {
		if (projectName() !== 'ordi-chrome') return;
		await wipe();
		const serie = figer(MODELE_3E, 1);
		ids.un = await createWorksheet({
			title: `${fichePrefix()} une colonne`,
			styleId: STYLE_IDS.standard,
			exercises: [
				await exerciseOf(
					`${fichePrefix()} mesure`,
					`Mesure le segment $[AB]$.\n\n${MES}`,
					'Voir la figure.'
				),
				await exerciseOf(
					`${fichePrefix()} courbes`,
					`Associe chaque courbe à son expression.\n\n${COURBES}`,
					'Voir la figure.'
				),
				await exerciseOf(
					`${fichePrefix()} barres`,
					`Voici un schéma.\n\n${PRIMES}`,
					'Voir la figure.'
				),
				await exerciseOf(`${fichePrefix()} serie`, serie.statement, serie.solution)
			]
		});
		const exercices = [];
		for (let k = 1; k <= 8; k++) {
			exercices.push(
				await exerciseOf(
					`${fichePrefix()} mesure ${k}`,
					`Mesure le segment $[AB]$.\n\n${MES}`,
					'Voir la figure.'
				)
			);
		}
		ids.deux = await createWorksheet({
			title: `${fichePrefix()} deux colonnes`,
			styleId: STYLE_IDS.deuxColonnes,
			exercises: exercices
		});
	});
	test.afterAll(async () => {
		if (projectName() === 'ordi-chrome') await wipe();
	});

	async function pdfs(page: Page): Promise<void> {
		if (fiche !== '') return;
		await login(page, TEACHER.email, TEACHER.password);
		fiche = await teacherPdf(page, ids.un, { saveAs: 'paquet7-une-colonne.pdf' });
		colonnes = await teacherPdf(page, ids.deux, { saveAs: 'paquet7-deux-colonnes.pdf' });
		pdfToPng(fiche, 'paquet7-une-colonne', 70);
		pdfToPng(colonnes, 'paquet7-deux-colonnes', 70);
	}

	/**
	 * La longueur de [AB] sur l'impression : la rangée de pixels noirs la plus longue de la région
	 * (le trait, disques compris), moins un diamètre de disque, donne la distance des centres.
	 */
	function longueurDeAB(file: string, page: number, region: Region): { cm: number } {
		const dpi = 300;
		const raster = rasterPage(file, page, dpi);
		const box = inkBox(raster, isBlack, region);
		if (!box) throw new Error('aucun trait noir dans la région de la figure');
		const k = dpi / 72;
		const noir = (x: number, y: number): boolean => {
			const i = (y * raster.width + x) * 3;
			return isBlack(raster.data[i], raster.data[i + 1], raster.data[i + 2]);
		};
		const y0 = Math.max(0, Math.floor(box.top * k));
		const y1 = Math.min(raster.height, Math.ceil(box.bottom * k));
		const x0 = Math.max(0, Math.floor(box.left * k));
		const x1 = Math.min(raster.width, Math.ceil(box.right * k));
		let meilleure = { y: 0, run: 0, start: 0 };
		for (let y = y0; y < y1; y++) {
			let run = 0;
			let start = 0;
			for (let x = x0; x <= x1; x++) {
				if (x < x1 && noir(x, y)) {
					if (run === 0) start = x;
					run++;
				} else {
					if (run > meilleure.run) meilleure = { y, run, start };
					run = 0;
				}
			}
		}
		// Diamètre d'un disque : la plus haute colonne d'encre dans les 25 premiers pixels du trait
		let diametre = 0;
		for (let x = meilleure.start; x < meilleure.start + 25; x++) {
			let hits = 0;
			for (
				let y = Math.max(0, meilleure.y - 40);
				y < Math.min(raster.height, meilleure.y + 40);
				y++
			) {
				if (noir(x, y)) hits++;
			}
			diametre = Math.max(diametre, hits);
		}
		return { cm: ((meilleure.run - diametre) / dpi) * 2.54 };
	}

	test('#2611 — fiche à une colonne : la longueur de [AB] dans le PDF est 6 cm (à 0,1 cm près), donc une vraie règle posée sur l’impression à 100 % lit 6 cm', async ({
		page
	}) => {
		await pdfs(page);
		const { boxes } = pdfBoxes(fiche);
		const exo = boxes.find((b) => b.text.includes('Exercice 1'));
		const suivant = boxes.find((b) => b.text.includes('Exercice 2'));
		expect(exo && suivant, 'exercices 1 et 2 dans le PDF').toBeTruthy();
		const mesure = longueurDeAB(fiche, exo?.page ?? 1, {
			left: 0,
			top: (exo?.top ?? 0) + 5,
			right: 595,
			bottom: (suivant?.top ?? 842) - 5
		});
		console.log(`#2611 : [AB] mesure ${mesure.cm.toFixed(3)} cm dans le PDF`);
		expect(
			mesure.cm,
			`[AB] mesure ${mesure.cm.toFixed(3)} cm dans le PDF (attendu 6)`
		).toBeGreaterThan(5.9);
		expect(mesure.cm).toBeLessThan(6.1);
	});

	test('#2611 — même modèle dans une fiche à deux colonnes : figure réduite, sans déborder sur l’autre colonne (huit exercices, les deux colonnes remplies)', async ({
		page
	}) => {
		await pdfs(page);
		const { boxes, pages } = pdfBoxes(colonnes);
		const milieu = pages[0].width / 2;
		const titres = boxes.filter((b) => /^Exercice \d+/.test(b.text.trim()));
		expect(titres.length, 'les huit exercices').toBeGreaterThanOrEqual(8);
		expect(titres.filter((b) => b.left < milieu).length, 'colonne de gauche').toBeGreaterThan(0);
		expect(titres.filter((b) => b.left >= milieu).length, 'colonne de droite').toBeGreaterThan(0);
		// Chaque figure (l'encre noire sous son titre) reste dans sa colonne ; sa longueur est réduite mais lisible
		for (const titre of titres) {
			const page = pages[titre.page - 1];
			const suivants = titres.filter(
				(t) => t.page === titre.page && t.left === titre.left && t.top > titre.top
			);
			const bas = Math.min(...suivants.map((t) => t.top), page.height - 40);
			const gauche = titre.left < milieu;
			const region = {
				left: gauche ? 0 : milieu,
				// Sous le titre et sa consigne (deux lignes) : on ne mesure que la figure
				top: titre.top + titre.height * 3 + 4,
				right: gauche ? milieu : page.width,
				bottom: bas - 4
			};
			const raster = rasterPage(colonnes, titre.page, 150);
			const encre = inkBox(raster, isBlack, region);
			expect(encre, `${titre.text} : une figure sous le titre`).not.toBeNull();
			if (!encre) continue;
			if (gauche)
				expect(
					encre.right,
					`${titre.text} : l'encre reste dans la colonne de gauche`
				).toBeLessThanOrEqual(milieu - 4);
			else
				expect(
					encre.left,
					`${titre.text} : l'encre reste dans la colonne de droite`
				).toBeGreaterThanOrEqual(milieu + 4);
			const mesure = longueurDeAB(colonnes, titre.page, region);
			expect(
				mesure.cm,
				`${titre.text} : [AB] réduit (${mesure.cm.toFixed(2)} cm), pas à l'échelle 1`
			).toBeLessThan(5.5);
			expect(mesure.cm, `${titre.text} : [AB] encore lisible`).toBeGreaterThan(2);
		}
	});

	test('#2637 — PDF d’une fiche avec le bloc « associer » à courbes : courbes petites et numérotées, rien en code brut, y compris dans une série d’automatismes', async ({
		page
	}) => {
		await pdfs(page);
		const texte = pdfText(fiche).join('\n');
		for (const code of [
			'associer',
			'````',
			'```',
			'f(x)',
			'x: -3',
			'y: -7',
			'grille:',
			'description:'
		]) {
			expect(texte, `« ${code} » n'est pas imprimé`).not.toContain(code);
		}
		// Les éléments sont numérotés « 1. », « 2. », « 3. » (l'exemple et la série)
		for (const numero of ['1.', '2.', '3.']) {
			expect(
				texte.split(numero).length - 1,
				`numéro ${numero} imprimé (exemple et série)`
			).toBeGreaterThanOrEqual(2);
		}
		// Une série d'automatismes : la consigne et les expressions sont imprimées
		expect(texte).toContain('Relie chaque droite à la fonction affine');
		expect(texte).toContain('Associe chaque courbe');
		const { pages } = pdfBoxes(fiche);
		let bleues = 0;
		for (const size of pages) {
			const raster = rasterPage(fiche, size.page, 100);
			for (const composant of components(
				raster,
				(r, g, b) => b > 150 && b > r + 60 && b > g + 30
			)) {
				if (composant.pixels < 40) continue;
				bleues++;
				const largeurCm = ((composant.box.right - composant.box.left) / 72) * 2.54;
				expect(largeurCm, 'courbe petite (< 6 cm de large)').toBeLessThan(6);
			}
		}
		expect(
			bleues,
			'les 3 courbes de l’exemple et les 3 droites de la série'
		).toBeGreaterThanOrEqual(6);
	});

	test('#2637 — PDF d’une fiche avec le bloc « associer » à courbes : chaque courbe est sur la page de son numéro (ÉCART : la courbe 3 passe page 2, son « 3. » reste page 1)', async ({
		page
	}) => {
		await pdfs(page);
		const { boxes, pages } = pdfBoxes(fiche);
		const exercice3 = boxes.find((b) => b.text.startsWith('Exercice 3'));
		expect(exercice3, 'l’exercice 3 est imprimé').toBeDefined();
		// Les trois numéros de l'exemple (le premier « n. » de chaque numéro, dans l'ordre du fichier)
		const pageDuNumero = (numero: string): number | undefined =>
			boxes.find((b) => b.text.trim() === numero)?.page;
		const pagesDesNumeros = ['1.', '2.', '3.'].map(pageDuNumero);
		// Les courbes de l'exemple : les composants bleus avant le titre de l'exercice 3
		const pagesDesCourbes: number[] = [];
		for (const size of pages) {
			const raster = rasterPage(fiche, size.page, 100);
			for (const composant of components(
				raster,
				(r, g, b) => b > 150 && b > r + 60 && b > g + 30
			)) {
				if (composant.pixels < 40) continue;
				const avant =
					exercice3 !== undefined &&
					(size.page < exercice3.page ||
						(size.page === exercice3.page && composant.box.bottom < exercice3.top));
				if (avant) pagesDesCourbes.push(size.page);
			}
		}
		console.log(
			`#2637 PDF : numéros 1., 2., 3. pages ${pagesDesNumeros.join(', ')} ; courbes pages ${pagesDesCourbes.join(', ')} ; exercice 3 page ${exercice3?.page}`
		);
		expect(pagesDesCourbes, 'trois courbes dans l’exemple').toHaveLength(3);
		expect(pagesDesNumeros, 'les trois numéros sont imprimés').not.toContain(undefined);
		// Symptôme (capture : paquet7-une-colonne-1.png / -2.png dans .captures/verifs/fiches/) : « 3. » page 1, sa courbe page 2
		expect(pagesDesNumeros, 'les trois numéros sont sur la page 1').toEqual([1, 1, 1]);
		expect(pagesDesCourbes, 'la courbe 3 passe sur la page 2').toEqual([1, 1, 2]);
		test.fail();
		expect(pagesDesCourbes, 'chaque courbe est sur la page de son numéro').toEqual(pagesDesNumeros);
	});

	test('#2597 — PDF d’une fiche avec le schéma en barres : même dessin (Or, Argent, Bronze, 70, 80, 320 €), traits noirs sur blanc, rien en code brut', async ({
		page
	}) => {
		await pdfs(page);
		const texte = pdfText(fiche).join('\n');
		for (const mot of ['Or', 'Argent', 'Bronze', '70', '80', '320 €'])
			expect(texte, mot).toContain(mot);
		expect(texte).not.toContain('schema-barres');
		expect(texte).not.toContain('total :');
		const { boxes, pages } = pdfBoxes(fiche);
		const argent = boxes.find((b) => b.text.trim() === 'Argent');
		const or = boxes.find((b) => b.text.trim() === 'Or');
		const bronze = boxes.find((b) => b.text.trim() === 'Bronze');
		expect(argent && or && bronze, 'les trois noms de barres').toBeTruthy();
		const numero = argent?.page ?? 1;
		const taille = pages.find((p) => p.page === numero);
		const raster = rasterPage(fiche, numero, 200);
		const region = {
			left: 0,
			top: (or?.top ?? 0) - 6,
			right: taille?.width ?? 595,
			bottom: (bronze?.top ?? 0) + (bronze?.height ?? 0) + 6
		};
		// Traits noirs sur blanc : aucune couleur dans le dessin (gris et noir seulement)
		expect(
			share(raster, (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) > 60, region),
			'aucun pixel coloré dans le schéma'
		).toBeLessThan(0.0005);
		// Les barres : leur bord gauche se lit sur l'encre, leur bord droit sur le centre des étiquettes
		// (le texte est centré dans son segment : fin du segment = 2 × centre − début)
		const rangee = (nom: typeof or) =>
			boxes.filter(
				(b) =>
					b.page === numero &&
					Math.abs(b.top - (nom?.top ?? 0)) < 4 &&
					b.left > (nom?.left ?? 0) + (nom?.width ?? 0)
			);
		const centre = (b: { left: number; width: number }): number => b.left + b.width / 2;
		const gaucheDe = (nom: typeof or, premier: { left: number; width: number }): number =>
			inkBox(raster, isBlack, {
				left: (nom?.left ?? 0) + (nom?.width ?? 0) + 4,
				top: (nom?.top ?? 0) - 2,
				right: centre(premier),
				bottom: (nom?.top ?? 0) + (nom?.height ?? 0) + 2
			})?.left ?? 0;
		const [rOr, rArgent, rBronze] = [rangee(or), rangee(argent), rangee(bronze)];
		const [q1, q2, q3] = [rOr[0], rArgent[0], rBronze[0]];
		const gauche = gaucheDe(argent, q2);
		expect(Math.abs(gaucheDe(or, q1) - gauche), 'Or et Argent alignées à gauche').toBeLessThan(1.5);
		expect(
			Math.abs(gaucheDe(bronze, q3) - gauche),
			'Bronze et Argent alignées à gauche'
		).toBeLessThan(1.5);
		const finDe = (premier: { left: number; width: number }): number =>
			2 * centre(premier) - gauche;
		const droiteArgent = finDe(q2);
		const droiteOr = 2 * centre(rOr[1]) - finDe(q1);
		const finPleinBronze = finDe(q3);
		const droiteBronze = 2 * centre(rBronze[1]) - finPleinBronze;
		console.log(
			`#2597 PDF : gauche ${gauche.toFixed(1)}, Or ${droiteOr.toFixed(1)}, Argent ${droiteArgent.toFixed(1)}, Bronze plein ${finPleinBronze.toFixed(1)} puis ${droiteBronze.toFixed(1)}`
		);
		expect(droiteOr, 'Or plus longue qu’Argent').toBeGreaterThan(droiteArgent + 10);
		expect(
			(droiteOr - gauche) / (droiteArgent - gauche),
			'Or / Argent = 6 / 4 (échelle commune)'
		).toBeGreaterThan(1.4);
		expect(
			Math.abs(droiteBronze - droiteArgent),
			'Bronze (avec le pointillé) aussi longue qu’Argent'
		).toBeLessThan(2);
		expect(finPleinBronze, 'Bronze plein plus court qu’Argent').toBeLessThan(droiteArgent - 10);
		// Le pointillé de Bronze : bien plus de tirets (composants noirs séparés) que le trait plein d'Argent
		const sombre = (r: number, g: number, b: number): boolean => r < 190 && g < 190 && b < 190;
		const tirets = (nom: typeof or) =>
			components(raster, sombre, {
				left: finPleinBronze + 1.5,
				top: (nom?.top ?? 0) - 10,
				right: droiteBronze - 1.5,
				bottom: (nom?.top ?? 0) + (nom?.height ?? 0) + 10
			}).length;
		console.log(
			`#2597 PDF : composants ${tirets(bronze)} (Bronze) contre ${tirets(argent)} (Argent)`
		);
		expect(tirets(bronze), 'pointillés de Bronze').toBeGreaterThanOrEqual(tirets(argent) + 4);
	});
});
