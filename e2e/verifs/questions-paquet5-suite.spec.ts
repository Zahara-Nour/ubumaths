import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { buildSeriesLink } from '../../src/lib/validation/series';
import { calc, expectLatex, hasSteps, openAtelier, steps } from './helpers/atelier';
import { ADMIN, assertLocalServerEnv, login, sql } from './helpers/carnet';
import { expectNoHorizontalOverflow } from './helpers/pages';

/**
 * Questions, modèles — paquet 5, suite — base LOCALE
 * ==================================================
 *
 * Reprend les lignes #2370 / #2346 (droite graduée au corrigé), #2276 (unité du résultat) et
 * #2341 / #2349 (démonstrations à ranger) de `docs/wip/verifications-manuelles.md`, que
 * `questions-paquet5.spec.ts` n'avait pas encore.
 *
 * Les modèles de la base locale portent les identifiants de la prod : les corrigés se lisent dans
 * l'aperçu admin (graine choisie parmi celles que renvoie `/api/questions/generate/<id>`), les
 * questions se jouent par le lien de série public. Rien n'est écrit en base.
 *
 * Déjà couvert ailleurs : #2276, les cases à unité (« 36 mm », « 0,036 m ») et leurs couleurs
 * sont dans `reponses-unites.spec.ts` ; la saisie d'une durée composée n'y est pas, elle est ici.
 * Le bloc `ranger` (gestes) est dans `blocs-divers.spec.ts` (#1943) ; ici, sa forme « étapes ».
 *
 * Captures à l'œil : `.captures/verifs/questions-paquet5-suite/`.
 */

// Base locale seulement
test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());

// Constantes

const SHOTS = '.captures/verifs/questions-paquet5-suite';
/** « Résoudre ax ⩾ b graphiquement » : variation 0 = pente positive, 1 = pente négative */
const DROITE_AX_B = '320f5ac7-b16a-48a7-b136-704d62854138';
/** « Résoudre |x| < k » : variation 0 = la droite graduée puis la courbe */
const VALEUR_ABSOLUE = '80a87e34-251c-481a-a086-7b7add231cc9';
/** « Soustraire des durées (2) » : durée d'un film entre deux heures */
const SOUSTRAIRE_DUREES_2 = '0bb7a4ca-9c8c-4d37-a7d9-889aa7ed152a';
/** « Ajouter des durées (3) » : « écris la réponse sous la forme que tu veux » */
const AJOUTER_DUREES_3 = '75956b22-7d7d-4f3e-b16e-c65a884fd75f';
/** « Calculer avec des unités » : « Tu peux choisir l'unité du résultat » (variation 2 : litres) */
const CALCULER_UNITES = '64e55fc7-c2f2-41d9-a0e5-01ca9fe6750b';
/** « Démontrer la somme 1 + 2 + ⋯ + n » : variation 3 = étapes à ranger (4 étapes) */
const DEMO_SOMME = '5fbb9a04-d4c3-4810-b717-075493df916b';
/**
 * Les 14 démonstrations du lot 4 (`docs/archive/wip/questions-1spe-demonstrations/lot4_etapes.py`), par le
 * début de leur identifiant : les autres modèles « Démontrer … » ont la même variation, mais la boucle
 * sur les 58 dure un quart d'heure sur le serveur de dev.
 */
const LOT4_PREFIXES = [
	'a81c4c9f',
	'acaeb02a',
	'5fbb9a04',
	'b554a47f',
	'8865b98c',
	'9e377c97',
	'f7938cd3',
	'b05ec37a',
	'e2908d60',
	'16ee6f33',
	'66ecbb33',
	'0931c87e',
	'e8011f4e',
	'dbdf02be'
];
/** Un viewport de téléphone étroit, celui de la ligne #2341 */
const PHONE_360 = { width: 360, height: 800 };
const PHONE_390 = { width: 390, height: 844 };

/** Un tirage d'un modèle : sa graine, sa variation, ses variables, l'énoncé et les étapes du corrigé (LaTeX) */
interface Draw {
	seed: number;
	variation: number;
	vars: Record<string, string>;
	statement: string;
	steps: string;
}

type Operator = '<' | '≤' | '>' | '≥';

/** Une partie de la droite graduée : bornes finies (valeur) ou infinies (null), ouvertes ou fermées */
interface Interval {
	from: number | null;
	to: number | null;
	fromOpen: boolean;
	toOpen: boolean;
}

/** Ce que l'élève voit d'une droite graduée : tout est lu dans le SVG rendu */
interface LineReading {
	axis: { x1: number; x2: number };
	ticks: number[];
	labels: string[];
	segments: { x1: number; x2: number; stroke: string }[];
	/** `beak` : bec du crochet, positif = tourné vers la droite */
	brackets: { x: number; beak: number }[];
	box: { left: number; right: number; width: number; height: number };
}

// Functions

async function shot(page: Page, name: string): Promise<void> {
	await mkdir(SHOTS, { recursive: true });
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

/** Ferme le clavier virtuel s'il est ouvert (il couvre « Valider » sur téléphone) */
async function closeKeyboard(page: Page): Promise<void> {
	const close = page.locator('.math-keyboard-close');
	if ((await close.count()) > 0) {
		await close.click();
		await page.waitForFunction(
			() =>
				!(window as Window & { mathVirtualKeyboard?: { visible: boolean } }).mathVirtualKeyboard
					?.visible
		);
	}
}

/** Écrit dans la case de réponse visible (clic à droite, là où se trouve la case à remplir) */
async function typeInAnswer(page: Page, field: Locator, text: string): Promise<void> {
	await field.scrollIntoViewIfNeeded();
	const box = await field.boundingBox();
	if (!box) throw new Error('case de réponse introuvable');
	await field.click({ position: { x: Math.max(5, box.width - 15), y: box.height / 2 } });
	await page.waitForTimeout(500);
	await page.keyboard.type(text, { delay: 80 });
}

const OPERATORS: Record<string, Operator> = {
	'<': '<',
	'\\leqslant': '≤',
	'>': '>',
	'\\geqslant': '≥'
};
const OPERATOR_SOURCE = '(<|>|\\\\leqslant|\\\\geqslant)';

/** Le sens à l'envers : diviser par un nombre négatif retourne l'inégalité */
function flip(operator: Operator): Operator {
	return { '<': '>', '≤': '≥', '>': '<', '≥': '≤' }[operator] as Operator;
}

/** Tirages d'un modèle (variation, variables) trouvés dans les graines 1, 2, 3… par l'API */
async function scanSeeds(
	page: Page,
	templateId: string,
	wanted: (variation: number, vars: Record<string, string>) => string | null,
	enough: number,
	limit = 600
): Promise<Map<string, Draw>> {
	const found = new Map<string, Draw>();
	for (let seed = 1; seed <= limit && found.size < enough; seed++) {
		const response = await page.request.post(`/api/questions/generate/${templateId}`, {
			data: { seed }
		});
		expect(response.status()).toBe(200);
		const body = (await response.json()) as {
			instance: {
				selectedVariationIndex: number;
				resolvedVariables: { name: string; value: string }[];
				statement: string;
				correction?: { steps: string[] };
			};
		};
		const vars = Object.fromEntries(body.instance.resolvedVariables.map((v) => [v.name, v.value]));
		const key = wanted(body.instance.selectedVariationIndex, vars);
		if (key !== null && !found.has(key)) {
			found.set(key, {
				seed,
				variation: body.instance.selectedVariationIndex,
				vars,
				statement: body.instance.statement,
				steps: (body.instance.correction?.steps ?? []).join('\n')
			});
		}
	}
	return found;
}

/**
 * L'aperçu admin d'un modèle à une graine, une réponse (fausse) écrite, « Valider » : la carte
 * montre le corrigé. Rend le corrigé affiché.
 */
async function openCorrected(page: Page, id: string, seed: number): Promise<Locator> {
	await page.goto(`/dashboard/admin/questions/${id}/preview`);
	await page.waitForLoadState('networkidle');
	await page.locator('#seed').fill(String(seed));
	await page.getByRole('button', { name: 'Générer', exact: true }).click();
	await expect(page.locator('dd', { hasText: new RegExp(`^${seed}$`) }).first()).toBeVisible();
	const answer = page.locator('math-field.math-prompt-inline:visible').first();
	await expect(answer).toBeVisible();
	const validate = page.getByRole('button', { name: 'Valider' });
	// MathLive perd parfois la première frappe : on recommence tant que « Valider » reste grisé
	for (let attempt = 1; attempt <= 3 && !(await validate.isEnabled()); attempt++) {
		await typeInAnswer(page, answer, '7');
		await closeKeyboard(page);
		await page.waitForTimeout(300);
	}
	await validate.click();
	const correction = page.locator('[data-testid="correction-view"]:visible');
	await expect(correction).toHaveCount(1);
	// Les formules d'un bloc ne se composent qu'une fois le bloc à l'écran : on descend jusqu'au dernier
	await correction.locator('.markdown-content > *').last().scrollIntoViewIfNeeded();
	await page.waitForTimeout(400);
	return correction;
}

/** Lit la droite graduée rendue (axe, graduations, demi-droites, crochets) */
async function readLine(line: Locator): Promise<LineReading> {
	return line.evaluate((container) => {
		const number = (value: string | null) => Number(value);
		const axis = container.querySelector('.nl-axis')!;
		const box = container.getBoundingClientRect();
		return {
			axis: { x1: number(axis.getAttribute('x1')), x2: number(axis.getAttribute('x2')) },
			ticks: [...container.querySelectorAll('.nl-tick')].map((t) => number(t.getAttribute('x1'))),
			labels: [...container.querySelectorAll('.number-line-label')].map((label) =>
				(label.textContent ?? '').replace(/\s+/g, '').replace('−', '-')
			),
			segments: [...container.querySelectorAll('.nl-segment')].map((s) => ({
				x1: number(s.getAttribute('x1')),
				x2: number(s.getAttribute('x2')),
				stroke: getComputedStyle(s).stroke
			})),
			brackets: [...container.querySelectorAll('.nl-bracket')].map((b) => {
				// `M bec,haut L x,haut L x,bas L bec,bas` : le bec part de la borne vers l'extérieur du crochet
				const [tip, x] = [...(b.getAttribute('d') ?? '').matchAll(/[ML] ([\d.-]+) /g)].map((m) =>
					Number(m[1])
				);
				return { x, beak: tip - x };
			}),
			box: { left: box.left, right: box.right, width: box.width, height: box.height }
		};
	});
}

/**
 * La droite graduée est celle de l'énoncé : de `start` à `end` pas 1, chaque graduation écrite, les
 * demi-droites (ou segments) aux bonnes places, les crochets tournés vers le segment pour une borne
 * comprise, vers l'extérieur pour une borne exclue, aucun crochet sur une borne infinie.
 */
function expectLine(reading: LineReading, start: number, end: number, expected: Interval[]): void {
	const count = end - start + 1;
	expect(reading.ticks, 'une graduation par entier').toHaveLength(count);
	// Au téléphone, les nombres trop serrés ne sont écrits qu'un sur deux (ou sur trois…), comptés
	// depuis 0 (E63, tranché par David le 2026-11-24, #3146) ; les traits restent tous
	// Hors téléphone, tous les nombres sont exigés ; au téléphone, le pas se lit sur les deux premiers
	const onPhone = test.info().project.use.isMobile === true;
	const stride =
		onPhone && reading.labels.length >= 2
			? Number(reading.labels[1]) - Number(reading.labels[0])
			: 1;
	expect(reading.labels.length, 'au moins un nombre écrit').toBeGreaterThan(0);
	expect(reading.labels, 'chaque graduation écrite, ou une sur `stride` comptée depuis 0').toEqual(
		Array.from({ length: count }, (_, i) => start + i)
			.filter((value) => value % stride === 0)
			.map(String)
	);
	expect(reading.ticks[0]).toBeCloseTo(reading.axis.x1, 0);
	expect(reading.ticks[count - 1]).toBeCloseTo(reading.axis.x2, 0);
	const px = (value: number) => reading.ticks[value - start];

	const drawn = [...reading.segments].sort((a, b) => a.x1 - b.x1);
	const wanted = expected
		.map((part) => ({
			x1: part.from === null ? reading.axis.x1 : px(part.from),
			x2: part.to === null ? reading.axis.x2 : px(part.to)
		}))
		.sort((a, b) => a.x1 - b.x1);
	expect(drawn, 'les demi-droites dessinées').toHaveLength(wanted.length);
	drawn.forEach((segment, i) => {
		expect(segment.x1, `début de la partie ${i + 1}`).toBeCloseTo(wanted[i].x1, 0);
		expect(segment.x2, `fin de la partie ${i + 1}`).toBeCloseTo(wanted[i].x2, 0);
	});

	// Borne comprise : le bec va vers le segment ; exclue : vers l'extérieur ; infinie : pas de crochet
	const bounds = expected.flatMap((part) => [
		...(part.from === null ? [] : [{ x: px(part.from), beak: part.fromOpen ? -1 : 1 }]),
		...(part.to === null ? [] : [{ x: px(part.to), beak: part.toOpen ? 1 : -1 }])
	]);
	const brackets = [...reading.brackets].sort((a, b) => a.x - b.x || a.beak - b.beak);
	bounds.sort((a, b) => a.x - b.x || a.beak - b.beak);
	expect(brackets, 'un crochet par borne finie, pas un de plus').toHaveLength(bounds.length);
	brackets.forEach((bracket, i) => {
		expect(bracket.x, `crochet ${i + 1} sur sa graduation`).toBeCloseTo(bounds[i].x, 0);
		expect(Math.sign(bracket.beak), `crochet ${i + 1} tourné du bon côté`).toBe(bounds[i].beak);
		expect(Math.abs(bracket.beak)).toBeGreaterThan(2);
	});
}

/** Chaque demi-droite est colorée (ni transparente ni invisible), en clair comme en sombre */
async function expectSegmentsVisibleInBothThemes(page: Page, line: Locator): Promise<void> {
	for (const theme of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme: theme });
		await page.waitForFunction(
			(dark) => document.documentElement.classList.contains('dark') === dark,
			theme === 'dark'
		);
		// Plusieurs éléments d'un coup : un seul `evaluateAll` après le changement de thème
		const { segments, background } = await line.evaluate((container) => ({
			segments: [...container.querySelectorAll('.nl-segment')].map(
				(s) => getComputedStyle(s).stroke
			),
			background: getComputedStyle(document.body).backgroundColor
		}));
		for (const stroke of segments) {
			expect(stroke, `${theme} : demi-droite colorée`).toMatch(/^(rgb|color|oklch|lab)/);
			expect(stroke, `${theme} : demi-droite ≠ fond`).not.toBe(background);
		}
	}
	await page.emulateMedia({ colorScheme: 'light' });
}

// ============================================================================
// #2370 — droite graduée au corrigé de « Résoudre ax ⩾ b graphiquement »
// ============================================================================

test('#2370 — « Résoudre ax ⩾ b graphiquement » : au corrigé, 4e bloc = droite de −5 à 5, demi-droite des solutions, crochet du bon côté (strict / large), sens de l’inégalité du corrigé ; les deux variations, les quatre sens', async ({
	page
}) => {
	test.setTimeout(360_000);
	await login(page, ADMIN.email, ADMIN.password);
	// Les 8 tirages (variation 0 / 1 × sens s = 0..3)
	const draws = await scanSeeds(
		page,
		DROITE_AX_B,
		(variation, vars) => `${variation}-${vars.s}`,
		8
	);
	expect([...draws.keys()].sort(), 'les deux variations et les quatre sens ont été tirés').toEqual([
		'0-0',
		'0-1',
		'0-2',
		'0-3',
		'1-0',
		'1-1',
		'1-2',
		'1-3'
	]);

	for (const [key, draw] of draws) {
		const correction = await openCorrected(page, DROITE_AX_B, draw.seed);
		const label = `variation ${draw.variation + 1}, sens ${draw.vars.s} (graine ${draw.seed})`;

		// L'inégalité de l'énoncé : m x ◦ m z  →  x ◦' z (le sens se retourne si m < 0)
		// L'énoncé et le corrigé tels que les rend l'API (au téléphone, le défilement masque des formules de la page)
		const formulas = [draw.statement, draw.steps];
		const inequality = new RegExp(`(-?\\d+)x\\s*${OPERATOR_SOURCE}\\s*(-?\\d+)`);
		const statement = formulas.map((f) => inequality.exec(f)).find((m) => m !== null);
		expect(
			statement,
			`${label} : inégalité de l'énoncé lue à l'écran parmi ${JSON.stringify(formulas)}`
		).toBeTruthy();
		const [, m, rawOperator, rhs] = statement!;
		const slope = Number(m);
		const bound = Number(rhs) / slope;
		const operator = slope < 0 ? flip(OPERATORS[rawOperator]) : OPERATORS[rawOperator];
		expect(bound, `${label} : la borne est l'abscisse z du tirage`).toBe(Number(draw.vars.z));

		// Le corrigé dit lui-même « Les solutions sont les nombres x tels que x ◦ z »
		const concluding = new RegExp(`\\{x\\s*${OPERATOR_SOURCE}\\s*(-?\\d+)\\}`);
		const said = formulas.map((f) => concluding.exec(f)).find((c) => c !== null);
		expect(said, `${label} : conclusion du corrigé parmi ${JSON.stringify(formulas)}`).toBeTruthy();
		expect(OPERATORS[said![1]], `${label} : le corrigé conclut dans le bon sens`).toBe(operator);
		expect(Number(said![2])).toBe(bound);

		// La droite graduée : après la courbe, au bout du corrigé (4e bloc : phrase, courbe, phrase, droite)
		const lines = correction.locator('.number-line-container');
		await expect(lines, label).toHaveCount(1);
		const blocks = await correction.evaluate((view) =>
			[...view.querySelectorAll('.markdown-content > *')].map(
				(node) =>
					node.tagName.toLowerCase() + '.' + (node.getAttribute('class') ?? '').split(' ')[0]
			)
		);
		expect(blocks, label).toEqual([
			'p.mb-4',
			'figure.courbe-figure',
			'p.mb-4',
			'div.number-line-container'
		]);

		const reading = await readLine(lines);
		const toTheLeft = operator === '<' || operator === '≤';
		const strict = operator === '<' || operator === '>';
		expectLine(reading, -5, 5, [
			toTheLeft
				? { from: null, to: bound, fromOpen: false, toOpen: strict }
				: { from: bound, to: null, fromOpen: strict, toOpen: false }
		]);
		// Les crochets du corrigé disent le même « strict / large » que sa phrase
		await expect(correction, label).toContainText(strict ? 'stricte' : 'large');

		if (key === '0-0' || key === '1-3') {
			await expectSegmentsVisibleInBothThemes(page, lines);
			await lines.scrollIntoViewIfNeeded();
			await expectNoHorizontalOverflow(page, `droite graduée ${label}`);
			expect(reading.box.right, `${label} : la droite tient dans la fenêtre`).toBeLessThanOrEqual(
				page.viewportSize()!.width
			);
			await shotThemes(page, `2370-${key}`);
		}
	}
});

// ============================================================================
// #2346 — droite graduée au corrigé de « Résoudre |x| < k »
// ============================================================================

/** Les parties de la droite pour |x| ◦ k, par les mathématiques (pas par le modèle) */
function absoluteValueParts(operator: Operator, k: number): Interval[] {
	switch (operator) {
		case '<':
			return [{ from: -k, to: k, fromOpen: true, toOpen: true }];
		case '≤':
			return [{ from: -k, to: k, fromOpen: false, toOpen: false }];
		case '>':
			return [
				{ from: null, to: -k, fromOpen: false, toOpen: true },
				{ from: k, to: null, fromOpen: true, toOpen: false }
			];
		case '≥':
			return [
				{ from: null, to: -k, fromOpen: false, toOpen: false },
				{ from: k, to: null, fromOpen: false, toOpen: false }
			];
	}
}

/** Les quatre sens du modèle, variation 1 : une graine par sens */
async function absoluteValueDraws(page: Page) {
	const draws = await scanSeeds(
		page,
		VALEUR_ABSOLUE,
		(variation, vars) => (variation === 0 ? vars.s : null),
		4
	);
	expect([...draws.keys()].sort(), 'les quatre sens de la variation 1 ont été tirés').toEqual([
		'0',
		'1',
		'2',
		'3'
	]);
	return draws;
}

test('#2346 — « Résoudre |x| < k » (variation 1) : sous « distance à 0 », droite de −8 à 8 avec ]−k ; k[, [−k ; k] ou deux demi-droites, crochets bien tournés ; la courbe vient ensuite', async ({
	page
}) => {
	test.setTimeout(360_000);
	await login(page, ADMIN.email, ADMIN.password);
	const draws = await absoluteValueDraws(page);

	for (const [sense, draw] of draws) {
		const correction = await openCorrected(page, VALEUR_ABSOLUE, draw.seed);
		const label = `sens ${sense} (graine ${draw.seed})`;

		// L'inégalité de l'énoncé : |x| ◦ k
		// L'énoncé et le corrigé tels que les rend l'API (au téléphone, le défilement masque des formules de la page)
		const formulas = [draw.statement, draw.steps];
		const inequality = new RegExp(`\\\\lvert x\\\\rvert\\s*${OPERATOR_SOURCE}\\s*(\\d+)`);
		const statement = formulas.map((f) => inequality.exec(f)).find((m) => m !== null);
		expect(
			statement,
			`${label} : inégalité de l'énoncé lue à l'écran parmi ${JSON.stringify(formulas)}`
		).toBeTruthy();
		const operator = OPERATORS[statement![1]];
		const k = Number(statement![2]);
		expect(k).toBe(Number(draw.vars.k));

		// L'ordre du corrigé : « distance à 0 », la droite graduée, la courbe, sa lecture, la réponse
		const lines = correction.locator('.number-line-container');
		await expect(lines, label).toHaveCount(1);
		await expect(correction.locator('figure.courbe-figure'), label).toHaveCount(1);
		const order = await correction.evaluate((view) => {
			const nodes = [...view.querySelectorAll('.number-line-container, figure.courbe-figure')];
			return nodes.map((n) =>
				n.classList.contains('number-line-container') ? 'droite' : 'courbe'
			);
		});
		expect(order, `${label} : la droite avant la courbe`).toEqual(['droite', 'courbe']);
		await expect(correction.locator('.markdown-content > p').first(), label).toContainText(
			'distance'
		);

		const reading = await readLine(lines);
		expectLine(reading, -8, 8, absoluteValueParts(operator, k));
		if (sense === '0' || sense === '2') {
			await expectSegmentsVisibleInBothThemes(page, lines);
			await expectNoHorizontalOverflow(page, `droite graduée ${label}`);
			expect(reading.box.right).toBeLessThanOrEqual(page.viewportSize()!.width);
			await lines.scrollIntoViewIfNeeded();
			await shotThemes(page, `2346-sens-${sense}`);
		}
	}
});

test('#2346 — mesure pour David : la droite et la courbe ensemble au corrigé à 390 px (doublon ?)', async ({
	page
}) => {
	test.setTimeout(180_000);
	await page.setViewportSize(PHONE_390);
	await login(page, ADMIN.email, ADMIN.password);
	const draws = await absoluteValueDraws(page);
	const measures: string[] = [];
	for (const [sense, draw] of draws) {
		const correction = await openCorrected(page, VALEUR_ABSOLUE, draw.seed);
		const line = correction.locator('.number-line-container');
		const curve = correction.locator('figure.courbe-figure');
		// Les deux sont affichées l'une sous l'autre : mesure seulement, la question reste à David
		await expect(line).toBeVisible();
		await expect(curve).toBeVisible();
		const [whole, lineBox, curveBox] = await Promise.all([
			correction.boundingBox(),
			line.boundingBox(),
			curve.boundingBox()
		]);
		expect(
			lineBox!.y + lineBox!.height,
			'la droite est au-dessus de la courbe'
		).toBeLessThanOrEqual(curveBox!.y + 1);
		measures.push(
			`sens ${sense} : corrigé ${Math.round(whole!.height)} px (droite ${Math.round(lineBox!.height)} px + courbe ${Math.round(curveBox!.height)} px) sur un écran de ${PHONE_390.height} px`
		);
		await expectNoHorizontalOverflow(page, `corrigé à 390 px, sens ${sense}`);
		if (sense === '1') await shotThemes(page, '2346-doublon-390');
	}
	test.info().annotations.push({ type: 'mesure', description: measures.join(' ; ') });
	console.log(`#2346 mesures à 390 px (${test.info().project.name}) :\n  ${measures.join('\n  ')}`);
});

// ============================================================================
// #2276 — unité du résultat : l'Atelier
// ============================================================================

test('#2276 — Atelier : 12 km + 500 m → 12,5 km ; 5 km + 3 m → 5003 m ; 3 kW * 2 h → 6 kW·h = 21600000 J ; 2 h + 30 min → 2 h 30 min', async ({
	page
}) => {
	test.setTimeout(120_000);
	await openAtelier(page);
	const cases: [string, string, string][] = [
		['12 km + 500 m', '12{,}5~\\mathrm{km}', '12,5 km'],
		['5 km + 3 m', '5003~\\mathrm{m}', '5003 m'],
		['3 kW * 2 h', '6~\\mathrm{kW}\\cdot\\mathrm{h} = 21600000~\\mathrm{J}', '6 kW⋅h=21600000 J'],
		['2 h + 30 min', '2~\\mathrm{h}~30~\\mathrm{min}', '2 h 30 min']
	];
	for (const [input, latex, text] of cases) {
		const answer = await calc(page, input);
		expect(answer.refused, input).toBe(false);
		expectLatex(answer, latex);
		// La réponse affichée, telle que la lit l'élève (espaces insécables comprises)
		expect(answer.text.replace(/[\u00a0\u202f]/g, ' '), input).toContain(text);
	}
});

test('#2276 — Atelier : `.simplifier 1[h]+30[min]` montre « On décompose la durée en heures, minutes, secondes »', async ({
	page
}) => {
	test.setTimeout(120_000);
	await openAtelier(page);
	// PÉRIMÉ (écriture) : la ligne dit `.simplifier 1 h + 30 min`, or « un nombre, une espace, une unité » n'est
	// une grandeur que dans un calcul tapé seul : « Jamais dans une définition de fonction ni dans une commande »
	// (docs/pratiques/notation-unites.md, § Exception : l'atelier, décision de David du 2026-10-11).
	// Dans une commande, les unités s'écrivent entre crochets.
	const answer = await calc(page, '.simplifier 1[h]+30[min]');
	expectLatex(answer, '1~\\mathrm{h}~30~\\mathrm{min}');
	expect(await hasSteps(answer), 'la ligne a un bouton « Comment ? »').toBe(true);
	const written = await steps(answer);
	expect(written).toContain('On décompose la durée en heures, minutes, secondes');
	expect(written).toContain('1~\\mathrm{h} + 30~\\mathrm{min}');
	expect(written).toContain('= 1~\\mathrm{h}~30~\\mathrm{min}');
});

// ============================================================================
// #2276 — unité du résultat : les questions
// ============================================================================

/** Joue une question par le lien de série public (graine fixe) ; rend la carte devant la saisie. */
async function openSeries(
	page: Page,
	templateId: string,
	seed: number,
	variation = 0
): Promise<Locator> {
	await page.goto(
		buildSeriesLink('', [{ templateId, quantity: 1, delay: 0, variations: [variation] }], {
			mode: 'typing',
			seed
		})
	);
	await page.waitForLoadState('networkidle');
	const card = page.getByTestId('typing-card');
	await card.locator('math-field').first().waitFor();
	return card;
}

/** Les formules de l'énoncé en LaTeX : `3~\mathrm{h}~39~\mathrm{min}`… (face avant) */
async function statementFormulas(card: Locator): Promise<string[]> {
	return card
		.locator('.flip-card-front math-span, .flip-card-front .katex-mathml annotation')
		.allTextContents();
}

/** « Case 1 : juste » / « fausse » / « forme à améliorer » une fois la case corrigée */
async function validateAnswer(page: Page, card: Locator, text: string): Promise<string> {
	await typeInAnswer(page, card.locator('math-field').first(), text);
	await page.getByRole('button', { name: 'Valider' }).click();
	const states = page.locator('[id$="-etats"]');
	await expect(states).toHaveCount(1);
	return (await states.innerText()).trim();
}

/** Minutes d'une durée écrite `3~\mathrm{h}~39~\mathrm{min}` */
function minutesOf(formula: string): number {
	const hours = /(\d+)~\\mathrm\{h\}/.exec(formula);
	const minutes = /(\d+)~\\mathrm\{min\}/.exec(formula);
	return Number(hours?.[1] ?? 0) * 60 + Number(minutes?.[1] ?? 0);
}

/** « 1 h 6 min » */
function hoursMinutes(total: number): string {
	return `${Math.floor(total / 60)} h ${total % 60} min`;
}

/** « 1,1 h » quand la durée en heures s'écrit exactement avec une décimale (66 min = 1,1 h) */
function decimalHours(total: number): string | null {
	return total % 6 === 0 ? `${total / 60}`.replace('.', ',') + ' h' : null;
}

/**
 * Cherche la graine d'une question dont la durée attendue s'écrit exactement en heures décimales
 * (un multiple de 6 min, pas d'heures rondes) : pour pouvoir taper « 1,1 h ».
 */
async function findDecimalSeed(
	page: Page,
	templateId: string,
	duration: (formulas: string[]) => number | null
): Promise<{ seed: number; card: Locator; total: number }> {
	for (let seed = 1; seed <= 60; seed++) {
		const card = await openSeries(page, templateId, seed);
		const formulas = await statementFormulas(card);
		const total = duration(formulas);
		if (total !== null && total % 6 === 0 && total % 60 !== 0 && total > 60) {
			return { seed, card, total };
		}
	}
	throw new Error(`aucune durée à décimale exacte dans les 60 premières graines de ${templateId}`);
}

test('#2276 — « Soustraire des durées (2) » : « 1 h 6 min », « 66 min » et « 1,1 h » sont justes (durée d’un film), le corrigé écrit la durée en h et min', async ({
	page
}) => {
	test.setTimeout(240_000);
	// La durée du film = (heure de fin) − (heure de début), lue sur les deux heures de l'énoncé
	const duration = (formulas: string[]) => {
		const [start, end] = formulas.filter((f) => /\\mathrm\{h\}/.test(f));
		return start && end ? minutesOf(end) - minutesOf(start) : null;
	};
	const { seed, total } = await findDecimalSeed(page, SOUSTRAIRE_DUREES_2, duration);
	const forms = [hoursMinutes(total), `${total} min`, decimalHours(total)!];
	test
		.info()
		.annotations.push({ type: 'tirage', description: `graine ${seed} : ${forms.join(' = ')}` });

	for (const form of forms) {
		const card = await openSeries(page, SOUSTRAIRE_DUREES_2, seed);
		expect(await validateAnswer(page, card, form), `« ${form} »`).toBe('Case 1 : juste');
		await expect(card, `« ${form} »`).toContainText('Juste');
	}

	// Une durée fausse : rouge, et le corrigé écrit la durée en h et min (pas en minutes seules)
	const card = await openSeries(page, SOUSTRAIRE_DUREES_2, seed);
	expect(await validateAnswer(page, card, `${total + 1} min`)).toBe('Case 1 : fausse');
	const corrected = await card.locator('math-span').allTextContents();
	const expected = `${Math.floor(total / 60)}~\\unit{h}~${total % 60}~\\unit{min}`;
	expect(
		corrected.some((f) => f.replace(/\\mathrm\{(h|min)\}/g, '\\unit{$1}') === expected),
		`le corrigé écrit ${expected} parmi ${JSON.stringify(corrected)}`
	).toBe(true);
	await shot(page, '2276-soustraire-corrige');
});

test('#2276 — « Ajouter des durées (3) » : « 5 h 43 min », « 343 min » et la forme décimale sont justes', async ({
	page
}) => {
	test.setTimeout(240_000);
	// L'énoncé est UNE case : `3~\mathrm{h}~39~\mathrm{min}+2~\mathrm{h}~12~\mathrm{min}=\placeholder…`
	const duration = (formulas: string[]) => {
		const sum = formulas.join(' ');
		const terms = [...sum.matchAll(/\d+~\\mathrm\{h\}~\d+~\\mathrm\{min\}/g)].map((t) => t[0]);
		return terms.length === 2 ? terms.reduce((acc, t) => acc + minutesOf(t), 0) : null;
	};
	// Cette question écrit sa somme dans la case : on la lit dans la valeur du champ
	let found: { seed: number; total: number } | null = null;
	for (let seed = 1; seed <= 60 && found === null; seed++) {
		const card = await openSeries(page, AJOUTER_DUREES_3, seed);
		const value = await card
			.locator('math-field')
			.first()
			.evaluate((element) => (element as HTMLElement & { value: string }).value);
		const total = duration([value]);
		if (total !== null && total % 6 === 0 && total % 60 !== 0) found = { seed, total };
	}
	expect(found, 'une graine à durée décimale exacte').not.toBeNull();
	const { seed, total } = found!;
	const forms = [hoursMinutes(total), `${total} min`, decimalHours(total)!];
	test
		.info()
		.annotations.push({ type: 'tirage', description: `graine ${seed} : ${forms.join(' = ')}` });
	for (const form of forms) {
		const card = await openSeries(page, AJOUTER_DUREES_3, seed);
		expect(await validateAnswer(page, card, form), `« ${form} »`).toBe('Case 1 : juste');
	}
	// Une somme fausse reste fausse, et le corrigé l'écrit en h et min
	const card = await openSeries(page, AJOUTER_DUREES_3, seed);
	expect(await validateAnswer(page, card, `${total + 1} min`)).toBe('Case 1 : fausse');
	const corrected = (await card.locator('math-span').allTextContents()).join(' | ');
	expect(corrected).toContain(
		`${Math.floor(total / 60)}~\\unit{h}~${total % 60}~\\unit{min}`.replace(
			/\\unit\{(h|min)\}/g,
			'\\mathrm{$1}'
		)
	);
});

test('#2276 — le clavier d’une question de durée a un onglet « Unités » (son contenu : test suivant)', async ({
	page
}) => {
	test.setTimeout(120_000);
	for (const id of [SOUSTRAIRE_DUREES_2, AJOUTER_DUREES_3]) {
		const card = await openSeries(page, id, 5);
		const field = card.locator('math-field').first();
		await typeInAnswer(page, field, '');
		const tab: string | null = await page.evaluate(() => {
			const keyboard = (window as unknown as { mathVirtualKeyboard: { layouts: unknown[] } })
				.mathVirtualKeyboard;
			const layouts = keyboard.layouts as { id?: string; label?: string; rows?: unknown }[];
			const units = layouts.find(
				(layout) => typeof layout === 'object' && layout.id === 'chiphre-units'
			);
			return units?.label ?? null;
		});
		expect(tab, 'onglet « Unités »').toBe('Unités');
	}
});

test('#2276 — le clavier d’une question de durée ne propose QUE les unités de durée', async ({
	page
}) => {
	test.setTimeout(120_000);
	const card = await openSeries(page, SOUSTRAIRE_DUREES_2, 5);
	await typeInAnswer(page, card.locator('math-field').first(), '');
	const keys = await page.evaluate(() => {
		const layouts = (window as unknown as { mathVirtualKeyboard: { layouts: unknown[] } })
			.mathVirtualKeyboard.layouts as { id?: string; rows?: unknown }[];
		const units = layouts.find(
			(layout) => typeof layout === 'object' && layout.id === 'chiphre-units'
		);
		return [...JSON.stringify(units?.rows ?? []).matchAll(/"tooltip":"([^"]*)"/g)].map((m) => m[1]);
	});
	expect(keys, 'le clavier propose les unités de durée, pas le jeu générique').toEqual([
		's',
		'min',
		'h'
	]);
});

test('#2276 — « Calculer avec des unités » (litres) : 1 kL + 5 L attend 1005 L ; la somme de la page, écrite dans l’unité tapée la plus petite, est juste', async ({
	page
}) => {
	test.setTimeout(240_000);
	await login(page, ADMIN.email, ADMIN.password);
	// La règle sur des tirages de la variation « litres » : a kL + b L → (1000 a + b) L, la plus petite unité tapée
	const draws = await scanSeeds(
		page,
		CALCULER_UNITES,
		(variation, vars) => (variation === 2 && vars.c.endsWith('[kL]') ? 'kL' : null),
		1
	);
	const kiloliters = draws.get('kL');
	expect(kiloliters, 'un tirage « a kL + b L »').toBeTruthy();
	const response = await page.request.post(`/api/questions/generate/${CALCULER_UNITES}`, {
		data: { seed: kiloliters!.seed }
	});
	const body = (await response.json()) as {
		instance: { blanks: { expectedAnswer: string; expectedAnswerLatex: string }[] };
	};
	const a = Number(kiloliters!.vars.a);
	const b = Number(kiloliters!.vars.b);
	expect(body.instance.blanks[0].expectedAnswer, `${a} kL + ${b} L`).toBe(`${1000 * a + b}[L]`);
	expect(body.instance.blanks[0].expectedAnswerLatex).toBe(`${1000 * a + b}~\\unit{L}`);

	// Joué par un élève : la variation « litres », la somme lue sur la carte, la réponse dans la plus petite unité
	const card = await openSeries(page, CALCULER_UNITES, 3, 2);
	const formulas = await card
		.locator('math-field')
		.first()
		.evaluate((element) => (element as HTMLElement & { value: string }).value);
	const shown =
		/(\d+)~?\\?(?:mathrm|unit)\{(kL|hL|daL|dL|cL|mL)\}\s*\+\s*(\d+)~?\\?(?:mathrm|unit)\{L\}/.exec(
			formulas
		);
	expect(shown, `la somme est lisible dans « ${formulas} »`).toBeTruthy();
	const factor: Record<string, number> = {
		kL: 1000,
		hL: 100,
		daL: 10,
		dL: 0.1,
		cL: 0.01,
		mL: 0.001
	};
	const litres = Number(shown![1]) * factor[shown![2]] + Number(shown![3]);
	// Dans l'unité tapée la plus petite : litres si c'est un multiple de L, sinon la sous-unité (dL, cL, mL)
	const smaller = factor[shown![2]] >= 1 ? 'L' : shown![2];
	const amount = smaller === 'L' ? litres : litres / factor[smaller];
	expect(await validateAnswer(page, card, `${amount} ${smaller}`)).toBe('Case 1 : juste');
});

// ============================================================================
// #2341, #2349 — démonstrations de 1re spé : étapes à ranger (variation 4)
// ============================================================================

/** Les étapes d'un modèle « Démontrer … », dans le bon ordre, telles qu'écrites dans le bloc `ranger` */
async function rangerSteps(templateId: string): Promise<string[]> {
	const rows = await sql<{ statement: string }>(
		`select variations->3->>'statement' as statement from question_templates where id = $1`,
		[templateId]
	);
	const block = /```ranger\n([\s\S]*?)\n```/.exec(rows[0].statement)?.[1] ?? '';
	return block
		.split('\n')
		.filter((line) => line.startsWith('- '))
		.map((line) => line.slice(2));
}

/** Les modèles « Démontrer … » dont la variation 4 est une suite d'étapes à ranger */
async function demonstrationIds(): Promise<{ id: string; title: string }[]> {
	return sql<{ id: string; title: string }>(
		`select id::text, title from question_templates
		 where title like 'Démontrer%' and status = 'published'
		   and left(id::text, 8) = any($1::text[])
		   and variations->3->>'statement' like '%' || chr(96) || chr(96) || chr(96) || 'ranger%signe: aucun%'
		 order by title`,
		[LOT4_PREFIXES]
	);
}

/** Le texte d'une étape HORS formules, sans espaces ni ponctuation : de quoi la reconnaître sans se fier au LaTeX */
function proseKey(text: string): string {
	return text.replace(/\$[^$]*\$/g, '').replace(/[^\p{L}\p{N}]/gu, '');
}

/** Le texte d'une étiquette ou d'une place hors formules (les formules sont des `math-span`) */
async function labelProse(label: Locator): Promise<string> {
	return label.evaluate((element) => {
		const copy = element.cloneNode(true) as HTMLElement;
		for (const formula of copy.querySelectorAll('math-span')) formula.remove();
		return copy.textContent ?? '';
	});
}

test('#2341 — démonstrations 1re spé, variation 4 : étapes en colonne, places numérotées 1…n, rien ne déborde à 360 px (tous les modèles)', async ({
	page
}) => {
	test.setTimeout(300_000);
	await page.setViewportSize(PHONE_360);
	const models = await demonstrationIds();
	expect(models, 'les 14 modèles du lot 4').toHaveLength(14);
	// Étiquettes dont une formule est coupée à 360 px : relevé sur tous les modèles, jugé après la boucle
	const clipped: string[] = [];
	for (const { id, title } of models) {
		// Le serveur de dev laisse parfois une navigation en suspens : on recharge une fois ou deux
		const link = buildSeriesLink('', [{ templateId: id, quantity: 1, delay: 0, variations: [3] }], {
			mode: 'typing',
			seed: 1
		});
		const card = page.getByTestId('typing-card');
		const zone = card.locator('.flip-card-front .ranger-etapes');
		for (let attempt = 1; attempt <= 3; attempt++) {
			await page.goto(link).catch(() => undefined);
			if (await zone.isVisible().catch(() => false)) break;
			await zone.waitFor({ state: 'visible', timeout: 12_000 }).catch(() => undefined);
			if (await zone.isVisible().catch(() => false)) break;
		}
		await expect(zone, title).toBeVisible();
		await page.waitForTimeout(300);
		await zone.scrollIntoViewIfNeeded();
		const count = (await rangerSteps(id)).length;
		const tray = zone.locator('.ranger-etiquette');
		const places = zone.locator('.ranger-place');
		await expect(tray, title).toHaveCount(count);
		await expect(places, title).toHaveCount(count);
		// Places numérotées 1…n
		await expect(zone.locator('.ranger-numero'), title).toHaveText(
			Array.from({ length: count }, (_, i) => new RegExp(`^${i + 1}\\.?$`))
		);
		// En colonne : chaque étiquette et chaque place sous la précédente, pleine largeur utile
		const geometry = await zone.evaluate((root) => {
			const box = (el: Element) => el.getBoundingClientRect();
			const items = (selector: string) => [...root.querySelectorAll(selector)].map(box);
			return {
				tray: items('.ranger-etiquette').map((b) => ({ top: b.top, left: b.left, right: b.right })),
				places: items('.ranger-place').map((b) => ({ top: b.top, left: b.left, right: b.right })),
				// Contenu plus large que la boîte : la formule est coupée, l'élève ne la lit pas en entier
				overflowing: [...root.querySelectorAll('.ranger-etiquette, .ranger-place')]
					.filter((el) => el.scrollWidth > el.clientWidth + 1)
					.map(
						(el) =>
							`${(el.textContent ?? '').trim().slice(0, 30)} (${el.scrollWidth} px dans ${el.clientWidth} px)`
					),
				font: parseFloat(getComputedStyle(root.querySelector('.ranger-etiquette')!).fontSize),
				viewport: document.documentElement.clientWidth
			};
		});
		for (const column of [geometry.tray, geometry.places]) {
			column.forEach((item, i) => {
				if (i === 0) return;
				expect(item.top, `${title} : étape ${i + 1} sous la précédente`).toBeGreaterThan(
					column[i - 1].top
				);
				expect(Math.abs(item.left - column[0].left), `${title} : même colonne`).toBeLessThan(2);
			});
			for (const item of column) {
				expect(item.right, `${title} : dans l'écran de 360 px`).toBeLessThanOrEqual(
					geometry.viewport
				);
			}
		}
		for (const label of geometry.overflowing) clipped.push(`${title.slice(0, 60)} : « ${label} »`);
		expect(geometry.font, `${title} : texte lisible`).toBeGreaterThanOrEqual(14);
		await expectNoHorizontalOverflow(page, `${title} (360 px)`);
	}
	test
		.info()
		.annotations.push({ type: 'modèles', description: `${models.length} modèles vérifiés` });
	test
		.info()
		.annotations.push({ type: 'coupées', description: `${clipped.length} étiquettes coupées` });
	console.log(
		`#2341 (${test.info().project.name}) étiquettes coupées à 360 px :\n  ${clipped.join('\n  ')}`
	);
	expect(clipped, 'étiquettes dont une formule dépasse la boîte').toEqual([]);
});

test('#2349 — démonstration à ranger, au doigt : toucher une étape puis sa place, les 4 étapes dans le bon ordre → « Juste » ; mauvais ordre → places fausses marquées et rangement juste en correction', async ({
	page,
	hasTouch
}) => {
	test.setTimeout(240_000);
	await page.setViewportSize(PHONE_360);
	const right = await rangerSteps(DEMO_SOMME);
	expect(right).toHaveLength(4);

	const play = async (order: 'juste' | 'inverse') => {
		await page.goto(
			buildSeriesLink('', [{ templateId: DEMO_SOMME, quantity: 1, delay: 0, variations: [3] }], {
				mode: 'typing',
				seed: 1
			})
		);
		await page.waitForLoadState('networkidle');
		const card = page.getByTestId('typing-card');
		const zone = card.locator('.flip-card-front .ranger-etapes');
		await expect(zone).toBeVisible();
		const tray = zone.locator('.ranger-etiquette');
		const places = zone.locator('[data-ranger-place]');
		await expect(tray).toHaveCount(4);
		// Quelle étiquette du plateau est la étape n° i de la démonstration (le plateau est mélangé)
		const keys = await Promise.all(
			[0, 1, 2, 3].map(async (n) => proseKey(await labelProse(tray.nth(n))))
		);
		const trayIndexOfStep = right.map((step) => keys.indexOf(proseKey(step)));
		expect(
			trayIndexOfStep.every((index) => index >= 0),
			`étapes reconnues : ${keys.join(' | ')}`
		).toBe(true);
		const validate = page.getByRole('button', { name: 'Valider' });
		await expect(
			validate,
			'Valider attend que tout soit posé ou laisse la case vide'
		).toBeVisible();
		await shotThemes(page, `2349-avant-${order}`);

		const sequence = order === 'juste' ? [0, 1, 2, 3] : [3, 2, 1, 0];
		for (const [place, step] of sequence.entries()) {
			const label = tray.nth(trayIndexOfStep[step]);
			await press(label, hasTouch);
			await expect(label).toHaveAttribute('aria-pressed', 'true');
			await press(places.nth(place), hasTouch);
			await expect(label).toBeDisabled();
			await expect(places.nth(place)).not.toHaveClass(/ranger-place-vide/);
			await expect(places.nth(place)).toHaveAccessibleName(
				new RegExp(`^Place ${place + 1} sur 4, étiquette ${trayIndexOfStep[step] + 1}`)
			);
		}
		await expect(zone.locator('.ranger-place-vide')).toHaveCount(0);
		await expectNoHorizontalOverflow(page, 'étapes posées (360 px)');
		await shotThemes(page, `2349-posees-${order}`);
		await closeKeyboard(page);
		await validate.click();
		return { card, zone };
	};

	const good = await play('juste');
	await expect(good.zone.locator('.ranger-juste')).toHaveCount(4);
	await expect(good.zone.locator('.ranger-faux')).toHaveCount(0);
	await expect(good.card).toContainText('Juste');
	await expect(good.zone.getByRole('status')).toHaveText('réponse juste');

	const bad = await play('inverse');
	// Dans l'ordre inverse, aucune étape n'est à sa place (4 étapes : 1↔4, 2↔3)
	await expect(bad.zone.locator('.ranger-faux')).toHaveCount(4);
	await expect(bad.card).toContainText('Faux');
	// Le rangement juste est donné à côté : une colonne « Correction » dans l'ordre de la démonstration
	const correction = bad.zone.locator('.ranger-correction');
	await expect(correction).toBeVisible();
	await expect(correction.locator('.ranger-numero')).toHaveCount(4);
	const written = await Promise.all(
		[0, 1, 2, 3].map(async (n) =>
			proseKey(await labelProse(correction.locator('.ranger-place').nth(n)))
		)
	);
	expect(written).toEqual(right.map(proseKey));
	await expectNoHorizontalOverflow(page, 'correction du rangement (360 px)');
	await shotThemes(page, '2349-correction');
});
