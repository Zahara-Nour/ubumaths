import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { assertLocalServerEnv, sql, TEACHER, login } from './helpers/carnet';
import {
	assignWorksheet,
	createWorksheet,
	pdfInfo,
	pdfText,
	pdfToPng,
	STYLE_IDS,
	teacherPdf,
	TEACHER_ID
} from './helpers/fiches';
import { brouillons, fence, isTouch, projectName } from './helpers/modele-brouillon';
import { expectNoHorizontalOverflow } from './helpers/pages';
import {
	components,
	inkBox,
	isBlack,
	isBlue,
	isInk,
	pdfBoxes,
	pdfRawText,
	rasterPage,
	share
} from './helpers/pdf-mesures';

/**
 * Blocs, paquet 6 (tri des vérifications manuelles)
 * =================================================
 *
 * Reprend les lignes #2420 (collection : plaques de cent et gros cubes), #2456 (tableau de
 * variations à compléter), #2491 (courbe de données), #2462 (droite graduée dans une liste
 * numérotée), #2427 (cote de la hauteur d'une pyramide) et #2518 (coupures de colonne du PDF) de
 * `docs/wip/verifications-manuelles.md`. Les lignes de modèles (#2489, #2492, #2536/#2538) et
 * l'évaluation de rattrapage (#2509) sont dans `modeles-paquet6.spec.ts`.
 *
 * Décor : des modèles brouillons « Verifs6 blocs <projet> w<n> … » (créés par l'API, joués dans
 * l'aperçu admin), une fiche « Verifs6 blocs … » pour les PDF (lus par poppler), et les modèles /
 * fiches de la base locale (copie de la prod) quand la ligne les cite. Effacés par ce préfixe
 * complet seulement.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());
test.beforeEach(() => test.setTimeout(240_000));

// Constantes

const SHOTS = '.captures/verifs/out-blocs6';
const PREFIX = 'Verifs6 blocs';
const PYRAMIDE_ID = '6a770d04-b763-4887-95a9-336709a92fba';
const decor = brouillons(PREFIX, SHOTS);

// Fonctions

/** Préfixe complet des brouillons de ce worker (jamais effacé par un autre) */
const workerPrefix = (): string => `${PREFIX} ${projectName()} w${test.info().parallelIndex}`;
/** Le titre d'un brouillon : le préfixe du worker est ajouté par `openPreview` (projet) */
const title = (name: string): string => `w${test.info().parallelIndex} ${name}`;

test.afterAll(async () => {
	await sql(`delete from question_templates where title like $1`, [`${workerPrefix()} %`]);
});

/** Un toucher (doigt) ou un clic (souris) au centre de l'élément */
async function press(locator: Locator): Promise<void> {
	await locator.scrollIntoViewIfNeeded();
	if (isTouch()) await locator.tap();
	else await locator.click();
}

/** La largeur d'un dessin à l'écran en centimètres CSS (96 px = 2,54 cm) */
const cm = (px: number): number => px / (96 / 2.54);

/** Capture de la page entière sous `.captures/verifs/out-blocs6/<nom>-<projet>.png` */
async function shot(page: Page, name: string): Promise<void> {
	await mkdir(SHOTS, { recursive: true });
	await page.screenshot({ path: `${SHOTS}/${name}-${projectName()}.png` });
}

/** L'onglet actif de l'aperçu admin : « Contrôle blanc » (la carte jouée, puis sa correction) */
const carte = (page: Page): Locator => page.locator('[role="tabpanel"][data-state="active"]');

// ============================================================================
// #2420 — plaques de cent et gros cubes
// ============================================================================

test('#2420 — collection milliers 2, centaines 6, dizaines 3, unités 15 : 2 gros cubes en relief (3 faces), 6 plaques 10 × 10, 3 barres, 15 cubes, 12 cm au plus et dans l’écran ; toucher une plaque la barre', async ({
	page
}) => {
	await decor.openPreview(
		page,
		title('2420 dessin'),
		[
			'Combien ?',
			'',
			fence('collection', 'milliers: 2', 'centaines: 6', 'dizaines: 3', 'unités: 15'),
			'',
			'Nombre : [_]'
		].join('\n'),
		{ blanks: [{ expectedAnswer: '2645' }] }
	);
	const card = carte(page);
	const svg = card.locator('svg.collection-dessin').first();
	await expect(svg).toBeVisible();
	await svg.scrollIntoViewIfNeeded();

	// Les objets : 2 gros cubes, 6 plaques, 3 barres de dix, 15 cubes
	await expect(svg.locator('g.collection-gros-cube')).toHaveCount(2);
	await expect(svg.locator('g.collection-plaque')).toHaveCount(6);
	await expect(svg.locator('g.collection-barre')).toHaveCount(3);
	await expect(svg.locator('g.collection-cube')).toHaveCount(15);

	// Un gros cube se lit comme un cube : trois faces (devant, dessus, côté), de teintes différentes
	const cube = svg.locator('g.collection-gros-cube').first();
	await expect(cube.locator('polygon')).toHaveCount(3);
	const fills = await cube
		.locator('polygon')
		.evaluateAll((els) => els.map((el) => getComputedStyle(el).fill));
	expect(
		new Set(fills).size,
		`les trois faces ont des teintes différentes : ${fills.join(' | ')}`
	).toBe(3);
	// Plus des traits de quadrillage dessus (10 × 10 cubes), comme les plaques
	expect(await cube.locator('line.collection-quadrillage').count()).toBeGreaterThan(20);

	// Une plaque se lit comme 10 × 10 : un carré, 9 traits dans chaque sens
	const plate = svg.locator('g.collection-plaque').first();
	await expect(plate.locator('line.collection-quadrillage')).toHaveCount(18);
	const plateBox = await plate.boundingBox();
	expect(Math.abs((plateBox?.width ?? 0) - (plateBox?.height ?? 1)), 'plaque carrée').toBeLessThan(
		2
	);

	// Taille : 12 cm au plus (la ligne dit « 12 cm »), dans l'écran du téléphone
	const box = await svg.boundingBox();
	const viewport = page.viewportSize()?.width ?? 1280;
	expect(cm(box?.width ?? 0), 'largeur du bloc en cm').toBeLessThanOrEqual(12.05);
	expect(box?.x ?? -1, 'bord gauche dans l’écran').toBeGreaterThanOrEqual(0);
	expect((box?.x ?? 0) + (box?.width ?? 0), 'bord droit dans l’écran').toBeLessThanOrEqual(
		viewport
	);
	if (isTouch()) {
		// Sur téléphone la page ne déborde pas non plus
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow, 'aucun défilement horizontal').toBeLessThanOrEqual(0);
	} else {
		expect(cm(box?.width ?? 0), 'à l’ordinateur le bloc fait bien ~12 cm').toBeGreaterThan(11);
	}
	await shot(page, '2420-grand-bloc');

	// Toucher une plaque la barre : un trait de marque, la plaque porte la classe de marque
	const target = await plate.boundingBox();
	if (!target) throw new Error('plaque sans boîte');
	const spot = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
	if (isTouch()) await page.touchscreen.tap(spot.x, spot.y);
	else await page.mouse.click(spot.x, spot.y);
	await expect(svg.locator('line.collection-marque')).toHaveCount(1);
	await expect(svg.locator('g.collection-plaque.collection-objet-marque')).toHaveCount(1);
	await shot(page, '2420-plaque-barree');
});

test('#2420 — `construire: 2435` : 4 boutons dans la réserve (gros cube, plaque, barre, cube), toucher une pièce posée l’enlève ; réponse fausse → la correction montre 2 gros cubes, 4 plaques, 3 barres, 5 cubes', async ({
	page
}) => {
	await decor.openPreview(
		page,
		title('2420 construire'),
		['Construis 2 435.', '', fence('collection', 'construire: 2435')].join('\n')
	);
	const card = carte(page);
	const plan = card.getByRole('img', { name: 'Ta collection', exact: true });
	await expect(plan).toBeVisible();
	const pieces = [
		'Ajouter un gros cube de mille',
		'Ajouter une plaque de cent',
		'Ajouter une barre de dix',
		'Ajouter un cube'
	];
	await expect(card.getByRole('button', { name: /^Ajouter / })).toHaveCount(4);
	for (const name of pieces) await expect(card.getByRole('button', { name })).toBeVisible();
	// L'ordre de la réserve : gros cube, plaque, barre, cube
	const names = await card
		.getByRole('button', { name: /^Ajouter / })
		.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
	expect(names).toEqual(pieces);
	await shot(page, '2420-reserve');

	// Toucher une pièce posée l'enlève (chaque sorte, au doigt ou à la souris)
	const placed = plan.locator('g.collection-objet');
	for (const [index, kind] of ['gros-cube', 'plaque', 'barre', 'cube'].entries()) {
		await press(card.getByRole('button', { name: pieces[index] }));
		await expect(placed).toHaveCount(1);
		await expect(plan.locator(`g.collection-${kind}`)).toHaveCount(1);
		// La pièce au milieu de l'écran : au bord, la barre fixe du haut recevrait le toucher
		await placed.first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
		const box = await placed.first().boundingBox();
		if (!box) throw new Error(`pièce ${kind} sans boîte`);
		const spot = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
		if (isTouch()) await page.touchscreen.tap(spot.x, spot.y);
		else await page.mouse.click(spot.x, spot.y);
		await expect(placed, `toucher le ${kind} posé l'enlève`).toHaveCount(0);
	}

	// Réponse fausse : un seul cube posé → « Ta collection vaut 1. » et la correction juste
	await press(card.getByRole('button', { name: 'Ajouter un cube' }));
	await decor.validate(page);
	await expect(card.getByText('Ta collection vaut 1.').first()).toBeVisible();
	const solution = card.getByRole('img', { name: 'Une collection juste', exact: true }).first();
	await expect(solution).toBeVisible();
	await expect(solution.locator('g.collection-gros-cube')).toHaveCount(2);
	await expect(solution.locator('g.collection-plaque')).toHaveCount(4);
	await expect(solution.locator('g.collection-barre')).toHaveCount(3);
	await expect(solution.locator('g.collection-cube')).toHaveCount(5);
	await solution.scrollIntoViewIfNeeded();
	await shot(page, '2420-correction');
});

// ============================================================================
// #2456 — tableau de variations à compléter
// ============================================================================

/** La cubique de la ligne : valeur 4 en -2 et flèche entre -2 et 2 à compléter */
const CUBIQUE = fence(
	'variation',
	'variable: x',
	'domain: -inf, -2, 2, +inf',
	'',
	'variation: f(x)',
	'  -inf: -inf, bottom',
	'  -2: ?4, top',
	'  -2,2: ?flèche',
	'  2: -4, bottom',
	'  +inf: +inf, top'
);

/** Tape `typed` au vrai clavier dans la première case MathLive de la carte */
async function typeInField(page: Page, card: Locator, typed: string): Promise<void> {
	const field = card.locator('math-field').first();
	await field.scrollIntoViewIfNeeded();
	const box = await field.boundingBox();
	if (!box) throw new Error('case MathLive introuvable');
	await field.click({ position: { x: Math.max(3, box.width / 2), y: box.height / 2 } });
	await expect
		.poll(async () => page.evaluate(() => document.activeElement?.tagName))
		.toBe('MATH-FIELD');
	await page.keyboard.type(typed, { delay: 80 });
}

async function openCubique(page: Page, name: string, dejaConnecte = false): Promise<Locator> {
	await decor.openPreview(
		page,
		title(name),
		['Complète le tableau de variations de la fonction cubique.', '', CUBIQUE].join('\n'),
		{},
		dejaConnecte
	);
	const card = carte(page);
	await expect(card.locator('table.vt-grid')).toBeVisible({ timeout: 30_000 });
	return card;
}

test('#2456 — cubique à compléter : case MathLive à la place de 4, case en pointillés (sans flèche dessinée) entre -2 et 2, valeurs de -2 et 2 au milieu de la ligne ; le toucher ouvre ↗ / ↘ sous la case et le choix s’écrit dans la case', async ({
	page
}) => {
	const card = await openCubique(page, '2456 ecran');
	const table = card.locator('table.vt-grid');

	// Une seule case MathLive (à la place de 4), le « 4 » n'est écrit nulle part
	await expect(table.locator('math-field')).toHaveCount(1);
	expect(await table.innerText()).not.toMatch(/4/);
	// La case flèche : en pointillés, vide, et AUCUNE flèche dessinée à sa place ni descendante
	// ailleurs (les deux flèches montantes des bouts, elles, sont écrites dans le bloc)
	const arrow = table.locator('button[data-signe-case="fleche"]');
	await expect(arrow).toHaveCount(1);
	await expect(table.locator('td.vt-arrow-cell').filter({ has: arrow }).locator('svg')).toHaveCount(
		0
	);
	await expect(table.locator('svg.vt-arrow-down')).toHaveCount(0);
	expect(await arrow.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('dashed');
	expect((await arrow.innerText()).trim()).toBe('');
	// Les valeurs de -2 et de 2 au milieu de la ligne (la case de -2, la valeur -4 de 2)
	const containers = table.locator(
		'tr.vt-variation-row td.vt-variation-value-cell .vt-value-container'
	);
	const classes = await containers.evaluateAll((els) => els.map((el) => el.className));
	const hidden = classes.filter((c) => c.includes('vt-pos-center'));
	expect(
		hidden.length,
		`les valeurs en -2 et 2 au milieu (classes : ${classes.join(' | ')})`
	).toBeGreaterThanOrEqual(2);
	// Plus précisément : la colonne de -2 (case MathLive) et celle de 2 (« -4 »)
	const minusTwo = table
		.locator('td.vt-variation-value-cell')
		.filter({ has: page.locator('math-field') })
		.locator('.vt-value-container');
	await expect(minusTwo).toHaveClass(/vt-pos-center/);
	const two = table.locator('td.vt-variation-value-cell').filter({ hasText: /−\s*4|-\s*4/ });
	await expect(two.locator('.vt-value-container')).toHaveClass(/vt-pos-center/);
	await shot(page, '2456-ecran');

	// Un toucher sur la case flèche ouvre ↗ / ↘ sous la case
	await press(arrow);
	const menu = page.locator('[data-signe-menu]');
	await expect(menu).toBeVisible();
	await expect(menu.getByRole('button')).toHaveCount(2);
	expect(await menu.getByRole('button').allInnerTexts()).toEqual(['↗', '↘']);
	const caseBox = await arrow.boundingBox();
	const menuBox = await menu.boundingBox();
	const viewport = page.viewportSize()?.width ?? 1280;
	expect(menuBox?.y ?? 0, 'le menu s’ouvre sous la case').toBeGreaterThanOrEqual(
		(caseBox?.y ?? 0) + (caseBox?.height ?? 0) - 1
	);
	expect(menuBox?.x ?? -1, 'menu dans l’écran à gauche').toBeGreaterThanOrEqual(0);
	expect(
		(menuBox?.x ?? 0) + (menuBox?.width ?? 0),
		'menu dans l’écran à droite'
	).toBeLessThanOrEqual(viewport);
	await shot(page, '2456-menu');
	// Le choix s'écrit dans la case, le menu se referme
	await press(menu.getByRole('button', { name: 'décroissante' }));
	await expect(arrow).toHaveText('↘');
	await expect(menu).toHaveCount(0);
});

test('#2456 — cubique à compléter : ↘ et 4 → Juste ; ↗ → Faux et la correction montre la flèche attendue ↘', async ({
	page
}) => {
	let card = await openCubique(page, '2456 juste');
	await typeInField(page, card, '4');
	await press(card.locator('button[data-signe-case="fleche"]'));
	await press(page.locator('[data-signe-menu]').getByRole('button', { name: 'décroissante' }));
	await decor.validate(page);
	await expect(card.getByTestId('global-verdict')).toHaveText(/Juste/);
	await shot(page, '2456-juste');

	card = await openCubique(page, '2456 faux', true);
	await typeInField(page, card, '4');
	await press(card.locator('button[data-signe-case="fleche"]'));
	await press(
		page.locator('[data-signe-menu]').getByRole('button', { name: 'croissante', exact: true })
	);
	await decor.validate(page);
	await expect(card.getByTestId('global-verdict')).toHaveText(/Faux/);
	// La correction : la flèche de l'élève ↗ barrée, la flèche attendue ↘ en dessous
	const wrong = card.locator('[data-sign-cell][data-status="incorrect"]');
	await expect(wrong).toHaveCount(1);
	await expect(wrong.locator('[data-student]')).toHaveText('↗');
	await expect(wrong.locator('[data-expected]')).toHaveText('↘');
	// La case du 4 est juste (rien n'est montré en plus)
	await expect(card.locator('[data-sign-cell][data-status="correct"]')).toHaveCount(1);
	await shot(page, '2456-faux');
});

// ============================================================================
// #2491 — courbe de données
// ============================================================================

const DONNEES: Array<[number, number]> = [
	[6, 8],
	[8, 11],
	[10, 15],
	[12, 19],
	[14, 21],
	[16, 20],
	[18, 16],
	[20, 12]
];
const COURBE_DONNEES = fence(
	'courbe',
	'x: 6 ; 20',
	'y: 0 ; 25',
	'grille: 2 ; 5',
	'axes: x = heure ; y = température (°C)',
	`données: ${DONNEES.map(([x, y]) => `(${x} ; ${y})`).join(' ; ')}`
);

/** Teinte d'un jeton de couleur (`--color-fig-bleu`…) telle que le navigateur la calcule */
async function tokenColor(page: Page, token: string): Promise<string> {
	return page.evaluate((name) => {
		const probe = document.createElement('span');
		probe.style.color = `var(${name})`;
		document.body.append(probe);
		const color = getComputedStyle(probe).color;
		probe.remove();
		return color;
	}, token);
}

test('#2491 — courbe de données : ligne brisée bleue par les 8 points, un disque par point, axes au bord (0 hors de la fenêtre en x), titres « heure » et « température (°C) » lisibles dans la figure ; 14 h se lit sur la grille', async ({
	page
}) => {
	await decor.openPreview(
		page,
		title('2491 courbe'),
		['La température dans la journée.', '', COURBE_DONNEES, '', 'Mot : [_]'].join('\n'),
		{ blanks: [{ expectedAnswer: 'x' }] }
	);
	const svg = carte(page).locator('svg.courbe-svg').first();
	await expect(svg).toBeVisible({ timeout: 30_000 });
	await svg.scrollIntoViewIfNeeded();

	const m = await svg.evaluate((root) => {
		type Pt = { x: number; y: number };
		const toScreen = (el: SVGGraphicsElement, x: number, y: number): Pt => {
			const t = el.getScreenCTM();
			return t ? { x: t.a * x + t.c * y + t.e, y: t.b * x + t.d * y + t.f } : { x, y };
		};
		const lineEnds = (el: Element) => {
			const l = el as SVGLineElement;
			return {
				a: toScreen(l, l.x1.baseVal.value, l.y1.baseVal.value),
				b: toScreen(l, l.x2.baseVal.value, l.y2.baseVal.value)
			};
		};
		const rect = (el: Element) => {
			const r = el.getBoundingClientRect();
			return { l: r.left, t: r.top, r: r.right, b: r.bottom };
		};
		const poly = root.querySelector('polyline.courbe-donnees') as SVGPolylineElement | null;
		const polyPts = poly ? [...poly.points].map((p) => toScreen(poly, p.x, p.y)) : [];
		const dots = [...root.querySelectorAll('circle.courbe-donnee')].map((c) => {
			const e = c as SVGCircleElement;
			return toScreen(e, e.cx.baseVal.value, e.cy.baseVal.value);
		});
		const gridV = [...root.querySelectorAll('.courbe-grille line')]
			.map(lineEnds)
			.filter((l) => Math.abs(l.a.x - l.b.x) < 0.5)
			.map((l) => l.a.x);
		const gridH = [...root.querySelectorAll('.courbe-grille line')]
			.map(lineEnds)
			.filter((l) => Math.abs(l.a.y - l.b.y) < 0.5)
			.map((l) => l.a.y);
		const axes = [...root.querySelectorAll('.courbe-axes line')].map(lineEnds);
		const titles = [...root.querySelectorAll('text.courbe-titre-axe')].map((t) => {
			const e = t as SVGTextElement;
			const scale = e.getScreenCTM()?.a ?? 1;
			return {
				text: (e.textContent ?? '').trim(),
				font: parseFloat(getComputedStyle(e).fontSize) * scale,
				box: rect(e)
			};
		});
		const ticks = [...root.querySelectorAll('.courbe-graduations text')].map((t) => {
			const e = t as SVGTextElement;
			return {
				text: (t.textContent ?? '').trim(),
				font: parseFloat(getComputedStyle(e).fontSize) * (e.getScreenCTM()?.a ?? 1),
				box: rect(t)
			};
		});
		return {
			stroke: poly ? getComputedStyle(poly).stroke : '',
			fill: dots[0] ? getComputedStyle(root.querySelector('circle.courbe-donnee')!).fill : '',
			polyPts,
			dots,
			gridV,
			gridH,
			axes,
			titles,
			ticks,
			svgBox: rect(root)
		};
	});

	// La ligne brisée passe par les 8 points, dans l'ordre, et chacun porte un disque
	expect(m.dots, 'un disque par point').toHaveLength(8);
	expect(m.polyPts, 'la ligne brisée a 8 sommets').toHaveLength(8);
	m.polyPts.forEach((p, i) => {
		expect(Math.abs(p.x - m.dots[i].x), `sommet ${i + 1} sur son disque (x)`).toBeLessThan(0.6);
		expect(Math.abs(p.y - m.dots[i].y), `sommet ${i + 1} sur son disque (y)`).toBeLessThan(0.6);
	});
	// Bleu (le jeton « bleu » des figures), trait et disques
	const blue = await tokenColor(page, '--color-fig-bleu');
	expect(m.stroke, 'ligne brisée bleue').toBe(blue);
	expect(m.fill, 'disques bleus').toBe(blue);

	// Grille 2 ; 5 : 8 verticales (6, 8 … 20), 6 horizontales (0, 5 … 25) ; chaque point est à sa place
	expect(m.gridV).toHaveLength(8);
	expect(m.gridH).toHaveLength(6);
	const xs = [...m.gridV].sort((a, b) => a - b);
	const ys = [...m.gridH].sort((a, b) => b - a); // de y = 0 (bas) à y = 25 (haut)
	const screenX = (x: number): number => xs[0] + ((x - 6) / 14) * (xs[7] - xs[0]);
	const screenY = (y: number): number => ys[0] + (y / 25) * (ys[5] - ys[0]);
	DONNEES.forEach(([x, y], i) => {
		expect(Math.abs(m.dots[i].x - screenX(x)), `abscisse du point (${x} ; ${y})`).toBeLessThan(1);
		expect(Math.abs(m.dots[i].y - screenY(y)), `ordonnée du point (${x} ; ${y})`).toBeLessThan(1);
	});
	// 14 h : le disque est sur la verticale de la grille de 14, entre les horizontales 20 et 25
	const at14 = m.dots[4];
	expect(Math.min(...xs.map((g) => Math.abs(g - at14.x))), '14 h sur une verticale').toBeLessThan(
		1
	);
	expect(at14.y).toBeLessThan(ys[4]); // plus haut que la ligne 20
	expect(at14.y).toBeGreaterThan(ys[5]); // plus bas que la ligne 25

	// Axes au bord : l'axe des ordonnées au bord gauche (x = 6, 0 hors fenêtre), l'axe des abscisses en bas (y = 0)
	const [axisX, axisY] = m.axes;
	expect(Math.abs(axisY.a.x - xs[0]), 'axe des ordonnées au bord gauche').toBeLessThan(1);
	expect(Math.abs(axisX.a.y - ys[0]), 'axe des abscisses au bord bas').toBeLessThan(1);
	// 0 n'est pas dans la fenêtre en x : aucun « O » d'origine ni graduation 0 sur l'axe des x
	expect(m.ticks.map((t) => t.text)).not.toContain('O');

	// Titres : présents, lisibles (>= 9 px à l'écran), dans la figure, sans toucher une graduation
	expect(m.titles.map((t) => t.text).sort()).toEqual(['heure', 'température (°C)'].sort());
	for (const t of m.titles) {
		// Lisibles comme les graduations (le dessin se réduit à la largeur du téléphone : la taille absolue
		// se juge sur la capture) : jamais plus petits qu'elles
		const tickFont = Math.min(...m.ticks.map((tick) => tick.font));
		console.log(
			`#2491 ${projectName()} : « ${t.text} » ${t.font.toFixed(1)} px, graduations ${tickFont.toFixed(1)} px`
		);
		expect(
			t.font,
			`« ${t.text} » : taille à l'écran (graduations ${tickFont.toFixed(1)} px)`
		).toBeGreaterThanOrEqual(tickFont - 0.1);
		expect(t.box.l, `« ${t.text} » dans la figure (gauche)`).toBeGreaterThanOrEqual(
			m.svgBox.l - 0.5
		);
		expect(t.box.r, `« ${t.text} » dans la figure (droite)`).toBeLessThanOrEqual(m.svgBox.r + 0.5);
		expect(t.box.t, `« ${t.text} » dans la figure (haut)`).toBeGreaterThanOrEqual(m.svgBox.t - 0.5);
		for (const tick of m.ticks) {
			const apart =
				t.box.r <= tick.box.l ||
				tick.box.r <= t.box.l ||
				t.box.b <= tick.box.t ||
				tick.box.b <= t.box.t;
			expect(apart, `« ${t.text} » ne recouvre pas la graduation « ${tick.text} »`).toBe(true);
		}
	}
	await shot(page, '2491-courbe');
});

// ============================================================================
// #2427 — cote de la hauteur d'une pyramide
// ============================================================================

interface Instance {
	statement: string;
	vars: Record<string, string>;
}

/** L'instance (énoncé, variables) qu'un modèle donne pour une graine */
async function generate(page: Page, id: string, seed: number): Promise<Instance> {
	const response = await page.request.post(`/api/questions/generate/${id}`, { data: { seed } });
	const body = (await response.json()) as {
		success: boolean;
		instance?: { statement: string; resolvedVariables?: Array<{ name: string; value: string }> };
	};
	if (!body.success || !body.instance) return { statement: '', vars: {} };
	return {
		statement: body.instance.statement,
		vars: Object.fromEntries((body.instance.resolvedVariables ?? []).map((v) => [v.name, v.value]))
	};
}

/** Rouvre l'aperçu d'un modèle sur cette graine (champ « Seed » puis « Générer ») */
async function openSeeded(page: Page, id: string, seed: number): Promise<void> {
	await page.goto(`/dashboard/admin/questions/${id}/preview`);
	await page.waitForLoadState('networkidle');
	await page.locator('#seed').fill(String(seed));
	const generated = page.waitForResponse(
		(r) =>
			r.url().includes('/api/questions/generate/') &&
			r.request().postData()?.includes(`"seed":${seed}`) === true
	);
	await page.getByRole('button', { name: 'Générer', exact: true }).click();
	await generated;
	await page.waitForLoadState('networkidle');
}

test('#2427 — « Volume d’une pyramide », plusieurs tirages : la hauteur reste en tirets, sa cote est à droite du solide au bout d’un trait fin parti du milieu de la hauteur, aucune arête ne traverse le texte', async ({
	page
}) => {
	await login(page, 'admin@local.test', 'local-admin');
	// Des tirages de la forme « pyramide » (le modèle a aussi une question de formule, sans dessin)
	const seeds: Array<{ seed: number; instance: Instance }> = [];
	const seen = new Set<string>();
	for (let seed = 1; seed <= 400 && seeds.length < 6; seed++) {
		const instance = await generate(page, PYRAMIDE_ID, seed);
		if (!/forme: pyramide (carree|rectangle)/.test(instance.statement)) continue;
		const key = JSON.stringify(instance.vars);
		if (seen.has(key)) continue;
		seen.add(key);
		seeds.push({ seed, instance });
	}
	expect(seeds.length, 'six tirages dessinés trouvés').toBe(6);

	for (const { seed, instance } of seeds) {
		const label = `graine ${seed} (${JSON.stringify(instance.vars)})`;
		await openSeeded(page, PYRAMIDE_ID, seed);
		const drawing = carte(page).locator('svg.solide-figure').first();
		await expect(drawing).toBeVisible({ timeout: 30_000 });
		await drawing.scrollIntoViewIfNeeded();
		const g = await drawing.evaluate((svg) => {
			type Pt = { x: number; y: number };
			const toScreen = (el: SVGGraphicsElement, x: number, y: number): Pt => {
				const m = el.getScreenCTM() as DOMMatrix;
				return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
			};
			const lines = [...svg.querySelectorAll('polyline.solide-trait')].map((el) => {
				const p = el as unknown as SVGPolylineElement;
				return {
					pts: [...p.points].map((q) => toScreen(p, q.x, q.y)),
					dashed: p.classList.contains('solide-cache'),
					width: parseFloat(p.getAttribute('stroke-width') ?? '0')
				};
			});
			const texts = [...svg.querySelectorAll('text')].map((t) => {
				const r = t.getBoundingClientRect();
				return { text: (t.textContent ?? '').trim(), l: r.left, r: r.right, t: r.top, b: r.bottom };
			});
			return { lines, texts };
		});
		// La hauteur : le trait en tirets vertical le plus long
		const verticals = g.lines
			.filter(
				(l) =>
					l.dashed &&
					l.pts.length === 2 &&
					Math.abs(l.pts[0].x - l.pts[1].x) < 1.5 &&
					Math.abs(l.pts[0].y - l.pts[1].y) > 10
			)
			.sort((a, b) => Math.abs(b.pts[0].y - b.pts[1].y) - Math.abs(a.pts[0].y - a.pts[1].y));
		expect(
			verticals.length,
			`${label} : la hauteur est un trait vertical en tirets`
		).toBeGreaterThan(0);
		const height = verticals[0];
		const hx = height.pts[0].x;
		const [yTop, yBottom] = [height.pts[0].y, height.pts[1].y].sort((a, b) => a - b);
		const midY = (yTop + yBottom) / 2;

		// Le trait fin, plein, part du MILIEU de la hauteur (un bout du trait y est)
		const nearMid = (p: { x: number; y: number }): boolean =>
			Math.abs(p.x - hx) < 2 && Math.abs(p.y - midY) < Math.max(2, (yBottom - yTop) * 0.08);
		const leaders = g.lines.filter(
			(l) => !l.dashed && l.pts.length === 2 && (nearMid(l.pts[0]) || nearMid(l.pts[1]))
		);
		expect(leaders.length, `${label} : un trait fin part du milieu de la hauteur`).toBe(1);
		const leader = leaders[0];
		const maxWidth = Math.max(...g.lines.filter((l) => !l.dashed).map((l) => l.width));
		expect(leader.width, `${label} : trait plus fin que les arêtes`).toBeLessThan(maxWidth);
		const far = nearMid(leader.pts[0]) ? leader.pts[1] : leader.pts[0];
		expect(far.x, `${label} : le trait va vers la droite`).toBeGreaterThan(hx);

		// Sa cote : « <h> cm », la hauteur du tirage (une autre cote peut valoir autant : on prend celle
		// au bout du trait), à droite de la hauteur, contre le bout du trait
		const h = instance.vars.h;
		const gap = (t: { l: number; r: number; t: number; b: number }): number =>
			Math.hypot(Math.max(t.l - far.x, far.x - t.r, 0), Math.max(t.t - far.y, far.y - t.b, 0));
		const candidates = g.texts.filter((t) => t.text === `${h} cm`).sort((a, b) => gap(a) - gap(b));
		expect(candidates.length, `${label} : la cote « ${h} cm » est écrite`).toBeGreaterThan(0);
		const cote = candidates[0];
		expect(
			gap(cote),
			`${label} : le trait finit contre le texte (écart ${gap(cote).toFixed(1)} px)`
		).toBeLessThan(12);
		expect(cote.l, `${label} : la cote est à droite de la hauteur`).toBeGreaterThan(hx);
		// Hors du solide : à droite de tous les traits du solide (la hauteur et le trait fin exceptés)
		const solidRight = Math.max(
			...g.lines.filter((l) => l !== height && l !== leader).flatMap((l) => l.pts.map((p) => p.x))
		);
		expect(
			cote.l,
			`${label} : la cote est à droite des arêtes du solide (bord ${solidRight.toFixed(0)} px)`
		).toBeGreaterThanOrEqual(solidRight - 0.5);

		// Aucune arête (hors ce trait fin) ne traverse le rectangle du texte
		const crosses = (a: { x: number; y: number }, b: { x: number; y: number }): boolean => {
			let t0 = 0;
			let t1 = 1;
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const checks: Array<[number, number]> = [
				[-dx, a.x - cote.l],
				[dx, cote.r - a.x],
				[-dy, a.y - cote.t],
				[dy, cote.b - a.y]
			];
			for (const [p, q] of checks) {
				if (p === 0) {
					if (q < 0) return false;
				} else {
					const r = q / p;
					if (p < 0) t0 = Math.max(t0, r);
					else t1 = Math.min(t1, r);
				}
			}
			return t0 <= t1;
		};
		const touching = g.lines
			.filter((l) => l !== leader)
			.filter((l) => l.pts.some((p, i) => i > 0 && crosses(l.pts[i - 1], p)));
		expect(touching.length, `${label} : aucune arête dans le texte de la cote`).toBe(0);
		if (seed === seeds[0].seed) await shot(page, '2427-pyramide');
	}
});

// ============================================================================
// PDF des fiches : #2420, #2491, #2456 (exercices à nous), #2462 et #2518 (fiches de la base locale)
// ============================================================================

/** Préfixe des fiches et exercices de CE worker (projet + numéro de worker) */
const fichePrefix = (): string => `${workerPrefix()} fiche`;
/** Source des exercices de CE worker, pour les retrouver sans toucher ceux d'un autre */
const exerciseSource = (): string => `verifs6 ${projectName()} w${test.info().parallelIndex}`;
const REPERE_ID = 'c9e0effd-8d91-4e9d-89b2-4e40de2026c1';
const RATTRAPAGE_ID = 'f337aa82-b020-4348-bf05-f99f4782f99b';
/** Les repères des figures des exercices à colonnes : (P, Q), (R, S) … un segment de coin à coin */
const PAIRES = [
	['P', 'Q'],
	['R', 'S'],
	['T', 'U'],
	['V', 'W'],
	['X', 'Y'],
	['B', 'C'],
	['D', 'E'],
	['F', 'G']
] as const;

/** Une exercice « Verifs6 blocs … » du prof, énoncé et corrigé donnés */
async function exerciseOf(title: string, statement: string, solution: string): Promise<string> {
	const rows = await sql<{ id: string }>(
		`insert into exercises (title, source, grades, topic, created_by, category, variations)
		 values ($1, $4, '{}', 'Verifs6', $2, 'automatisme', $3::jsonb) returning id`,
		[
			title,
			TEACHER_ID,
			JSON.stringify([
				{ label: 'guided', hints: [], statement_md: statement, solution_md: solution }
			]),
			exerciseSource()
		]
	);
	return rows[0].id;
}

async function wipeFiches6(): Promise<void> {
	await sql(`delete from worksheets where created_by = $1 and title like $2`, [
		TEACHER_ID,
		`${fichePrefix()} %`
	]);
	await sql(`delete from exercises where created_by = $1 and source = $2`, [
		TEACHER_ID,
		exerciseSource()
	]);
}

/** La série figée du modèle 7f82d15a (graine 1 : cubique, cases vides) comme les scripts de fiches la figent */
function figerVariations(): { statement: string; solution: string } {
	const out = execFileSync(
		'pnpm',
		[
			'exec',
			'tsx',
			'e2e/verifs/helpers/figer-serie.ts',
			'7f82d15a-1c46-4bd5-81bc-a9f5e21048ed',
			'1'
		],
		{ encoding: 'utf8' }
	);
	return JSON.parse(out) as { statement: string; solution: string };
}

/**
 * Une copie « Verifs6 blocs fiche … » d'une fiche de la base locale (copie de la prod) : mêmes
 * exercices, même style, mêmes réglages. La fiche d'origine n'est jamais touchée.
 */
async function copyFiche(sourceId: string, title: string): Promise<string> {
	const source6 = exerciseSource();
	const source = await sql<{ type: string; config: unknown; style_id: string | null }>(
		`select type, config, style_id from worksheets where id = $1`,
		[sourceId]
	);
	expect(source.length, `fiche ${sourceId} dans la base locale`).toBe(1);
	const created = await sql<{ id: string }>(
		`insert into worksheets (title, type, config, status, created_by, style_id, grades)
		 values ($1, $2, $3::jsonb, 'published', $4, $5, '{}') returning id`,
		[title, source[0].type, JSON.stringify(source[0].config), TEACHER_ID, source[0].style_id]
	);
	const worksheetId = created[0].id;
	const sections = await sql<{ id: string; title: string; position: number }>(
		`select id, title, position from worksheet_sections where worksheet_id = $1 order by position`,
		[sourceId]
	);
	const sectionMap = new Map<string, string>();
	for (const section of sections) {
		const row = await sql<{ id: string }>(
			`insert into worksheet_sections (worksheet_id, title, position) values ($1, $2, $3) returning id`,
			[worksheetId, section.title, section.position]
		);
		sectionMap.set(section.id, row[0].id);
	}
	const placed = await sql<{
		exercise_id: string;
		section_id: string | null;
		position: number;
		points: number | null;
		answer_frame_lines: unknown;
	}>(
		`select exercise_id, section_id, position, points, answer_frame_lines
		   from worksheet_exercises where worksheet_id = $1 order by position`,
		[sourceId]
	);
	for (const row of placed) {
		const copy = await sql<{ id: string }>(
			`insert into exercises (title, source, grades, topic, created_by, category, variations, generic_functions, variables)
			 select title, $3, grades, topic, $2, category, variations, generic_functions, variables
			   from exercises where id = $1 returning id`,
			[row.exercise_id, TEACHER_ID, source6]
		);
		await sql(
			`insert into worksheet_exercises (worksheet_id, exercise_id, section_id, position, points, answer_frame_lines)
			 values ($1, $2, $3, $4, $5, $6::jsonb)`,
			[
				worksheetId,
				copy[0].id,
				row.section_id ? (sectionMap.get(row.section_id) ?? null) : null,
				row.position,
				row.points,
				row.answer_frame_lines ? JSON.stringify(row.answer_frame_lines) : null
			]
		);
	}
	return worksheetId;
}

test.afterAll(async () => {
	await wipeFiches6();
});

/** L'exercice 1 de la copie de la fiche « Automatismes : géométrie et repérage (1) », ouvert par l'élève */
async function openRepereExercise(page: Page): Promise<void> {
	const worksheet = await copyFiche(REPERE_ID, `${fichePrefix()} ecran`);
	const assignment = await assignWorksheet(worksheet, ['eleve01@local.test']);
	// L'élève ouvre l'exercice de sa fiche (l'aperçu du prof renvoie à l'éditeur de l'exercice)
	await login(page, 'eleve01@local.test', 'local-eleve');
	await page.goto(`/dashboard/student/worksheets/${assignment}`);
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: /^Ouvrir la Corvée 1/ }).click();
	await expect(
		page.getByText('Lis les coordonnées du point').locator('visible=true').first()
	).toBeVisible({
		timeout: 30_000
	});
	await page.waitForLoadState('networkidle');
}

test('#2462 — à l’écran, la droite graduée d’un item de liste n’apparaît jamais en code brut (`start: … end: …`) et les repères de Q3 et Q4 sont dessinés', async ({
	page
}) => {
	await openRepereExercise(page);
	const text = await page.locator('body').innerText();
	for (const code of ['start:', 'end:', 'step:', 'major:', 'points:', '```']) {
		expect(text, `« ${code} » n'est pas affiché en texte brut`).not.toContain(code);
	}
	// Les repères (bloc courbe, dans la même liste) sont dessinés : la liste est bien rendue
	await expect(page.locator('svg.courbe-svg:visible')).toHaveCount(2);
	await shot(page, '2462-ecran');
});

test('#2462 — à l’écran, la droite graduée de Q1 et de Q2 est dessinée dans la liste numérotée, dans la largeur de l’item (Q1 : point A dessiné ; Q2 : aucun point)', async ({
	page
}) => {
	// Écart E56, corrigé : `ListNode.svelte` ne rendait pas le nœud `number-line` (rien n'était
	// dessiné à la place de la droite).
	await openRepereExercise(page);
	const lines = page.locator('.number-line-container:visible');
	await expect(lines).toHaveCount(2, { timeout: 5000 });
	const geometry = await lines.evaluateAll((els) =>
		els.map((el) => {
			const item = el.closest('li');
			const box = el.getBoundingClientRect();
			const itemBox = item?.getBoundingClientRect();
			return {
				inItem: item !== null,
				itemText: (item?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 60),
				left: box.left,
				right: box.right,
				itemLeft: itemBox?.left ?? 0,
				itemRight: itemBox?.right ?? 0,
				points: el.querySelectorAll('.nl-point').length,
				ticks: el.querySelectorAll('.nl-tick').length
			};
		})
	);
	geometry.forEach((g, index) => {
		expect(g.inItem, `droite ${index + 1} dans un item de liste`).toBe(true);
		expect(g.left, `droite ${index + 1} : bord gauche dans l'item`).toBeGreaterThanOrEqual(
			g.itemLeft - 1
		);
		expect(g.right, `droite ${index + 1} : bord droit dans l'item`).toBeLessThanOrEqual(
			g.itemRight + 1
		);
		expect(g.ticks, `droite ${index + 1} : graduée`).toBeGreaterThan(3);
	});
	// Apostrophe droite dans l'énoncé de la base : on lit le texte sans elle
	expect(geometry[0].itemText).toContain('abscisse du point');
	expect(geometry[1].itemText).toContain('Place le nombre');
	expect(geometry[0].points, 'Q1 : le point A est dessiné').toBe(1);
	expect(geometry[1].points, 'Q2 : aucun point à l’énoncé').toBe(0);
	await expectNoHorizontalOverflow(page, 'exercice');
});

/** Huit exercices « introduction, dessin, questions » de longueurs variées (les coupures de colonne tombent partout) */
async function colonnesExercises(): Promise<Array<{ exercise: { id: string; title: string } }>> {
	const placed = [];
	for (const [index, [a, b]] of PAIRES.entries()) {
		const k = index + 1;
		const questions = Array.from(
			{ length: ((k * 3) % 5) + 1 },
			(_, i) =>
				`${i + 1}) Question ${k}.${i + 1} : calculer la longueur demandée en justifiant soigneusement chaque étape du raisonnement mené.`
		).join('\n');
		const statement = [
			`Introduction numéro ${k} du problème : on considère la figure suivante dessinée dans le plan, avec deux points nommés.`,
			'',
			fence(
				'figure',
				'fenetre: 0 ; 10 ; 0 ; 5',
				'---',
				`${a} = point(0, 0, etiquette="bas-gauche")`,
				`${b} = point(10, 5, etiquette="haut-droite")`,
				`segment(${a}, ${b})`
			),
			'',
			questions
		].join('\n');
		const title = `Colonnes ${k}`;
		placed.push({ exercise: { id: await exerciseOf(title, statement, 'Voir la figure.'), title } });
	}
	return placed;
}

test.describe('PDF de fiche', { tag: '@bureau' }, () => {
	test.describe.configure({ mode: 'serial' });
	test.skip(() => projectName() !== 'ordi-chrome', 'PDF : même fichier quel que soit l’écran');

	let worksheetId = '';
	let fiche = '';
	let corrige = '';
	/** Copie de « Automatismes : géométrie et repérage (1) » (#2462) et de l'évaluation de rattrapage (#2518) */
	let repereId = '';
	let rattrapageId = '';
	/** Fiche en deux colonnes faite pour le test des coupures (#2518) */
	let colonnesId = '';

	test.beforeAll(async () => {
		if (projectName() !== 'ordi-chrome') return;
		await wipeFiches6();
		const serie = figerVariations();
		const exercises = [
			{
				title: `${fichePrefix()} objets`,
				statement: [
					'Combien d’objets ?',
					'',
					fence('collection', 'milliers: 2', 'centaines: 6', 'dizaines: 3', 'unités: 15'),
					'',
					'Construis 2 435.',
					'',
					fence('collection', 'construire: 2435')
				].join('\n'),
				solution: 'Voir la figure.'
			},
			{
				title: `${fichePrefix()} courbe`,
				statement: ['La température dans la journée.', '', COURBE_DONNEES].join('\n'),
				solution: 'Voir la figure.'
			},
			{ title: `${fichePrefix()} variations`, statement: serie.statement, solution: serie.solution }
		];
		const placed = [];
		for (const e of exercises) {
			placed.push({
				exercise: { id: await exerciseOf(e.title, e.statement, e.solution), title: e.title }
			});
		}
		worksheetId = await createWorksheet({
			title: `${fichePrefix()} blocs`,
			styleId: STYLE_IDS.standard,
			exercises: placed
		});
		repereId = await copyFiche(REPERE_ID, `${fichePrefix()} repere`);
		rattrapageId = await copyFiche(RATTRAPAGE_ID, `${fichePrefix()} rattrapage`);
		colonnesId = await createWorksheet({
			title: `${fichePrefix()} colonnes`,
			styleId: STYLE_IDS.ficheEleve,
			exercises: await colonnesExercises()
		});
	});
	test.afterAll(async () => {
		if (projectName() === 'ordi-chrome') await wipeFiches6();
	});

	/** Les deux PDF de la fiche, téléchargés une fois par l'interface */
	async function pdfs(page: Page): Promise<void> {
		if (fiche !== '') return;
		await login(page, TEACHER.email, TEACHER.password);
		fiche = await teacherPdf(page, worksheetId, { saveAs: 'paquet6-fiche.pdf' });
		corrige = await teacherPdf(page, worksheetId, {
			kind: 'Corrigé',
			saveAs: 'paquet6-corrige.pdf'
		});
		pdfToPng(fiche, 'paquet6-fiche', 70);
		pdfToPng(corrige, 'paquet6-corrige', 70);
	}

	test('#2420 — PDF d’une fiche avec ces blocs : rien ne dépasse la page, le bloc est dessiné (jamais son code), le dessin se lit en noir et blanc', async ({
		page
	}) => {
		await pdfs(page);
		const { pages } = pdfInfo(fiche) && pdfBoxes(fiche);
		const text = pdfText(fiche).join('\n');
		expect(text, 'le code du bloc n’est pas imprimé').not.toMatch(
			/milliers|centaines|construire|collection/
		);
		expect(text).toContain('Construis 2 435.');
		for (const size of pages) {
			const raster = rasterPage(fiche, size.page, 100);
			const ink = inkBox(raster, isInk);
			expect(ink, `page ${size.page} : de l'encre`).not.toBeNull();
			if (!ink) continue;
			expect(ink.left, `page ${size.page} : marge gauche`).toBeGreaterThanOrEqual(15);
			expect(ink.right, `page ${size.page} : marge droite`).toBeLessThanOrEqual(size.width - 15);
			expect(ink.bottom, `page ${size.page} : bas de page`).toBeLessThanOrEqual(size.height - 8);
		}
		// En niveaux de gris : des traits noirs ET des surfaces grises distinctes du blanc et du noir
		const gray = (r: number, g: number, b: number): number => 0.299 * r + 0.587 * g + 0.114 * b;
		const raster = rasterPage(fiche, 1, 100);
		const mid = share(raster, (r, g, b) => gray(r, g, b) > 110 && gray(r, g, b) < 215);
		const dark = share(raster, (r, g, b) => gray(r, g, b) < 80);
		expect(mid, 'surfaces des objets (gris moyens)').toBeGreaterThan(0.003);
		expect(dark, 'traits foncés').toBeGreaterThan(0.003);
		execFileSync('pdftoppm', [
			'-gray',
			'-png',
			'-r',
			'110',
			'-f',
			'1',
			'-l',
			'1',
			fiche,
			`${SHOTS}/2420-pdf-niveaux-de-gris`
		]);
	});

	test('#2491 — PDF : la même courbe de données (titres, graduations, ligne brisée bleue du point (6 ; 8) au point (20 ; 12) en passant par (14 ; 21))', async ({
		page
	}) => {
		await pdfs(page);
		const text = pdfText(fiche).join('\n');
		expect(text).toContain('heure');
		expect(text).toContain('température (°C)');
		const { boxes, pages } = pdfBoxes(fiche);
		// La courbe est le seul dessin avec des graduations 6 … 20 et 0 … 25
		const onPage = boxes.filter((b) => b.text.trim() === 'heure');
		expect(onPage.length, 'titre « heure » une fois').toBe(1);
		const pageNo = onPage[0].page;
		const size = pages.find((p) => p.page === pageNo);
		expect(size).toBeDefined();
		// Seulement la figure de la courbe : de son titre d'axe y jusqu'à l'exercice suivant
		const figTop =
			boxes.find((b) => b.page === pageNo && b.text.includes('température (°C)'))?.top ?? 0;
		const figBottom =
			boxes.find((b) => b.page === pageNo && b.text.startsWith('Exercice 3'))?.top ?? Infinity;
		const labels = boxes.filter(
			(b) => b.page === pageNo && b.top >= figTop - 2 && b.top < figBottom
		);
		const numeric = (n: number) => labels.filter((b) => b.text.trim() === String(n));
		// Axe des x : graduations 6, 8 … 20 à la même hauteur, régulièrement espacées
		const xTicks = [6, 8, 10, 12, 14, 16, 18, 20].map((n) => {
			const candidates = numeric(n);
			expect(candidates.length, `graduation ${n} (x)`).toBeGreaterThan(0);
			// celle de l'axe horizontal : la plus basse des occurrences à la même hauteur que « 6 »
			return candidates;
		});
		const six = xTicks[0].sort((a, b) => b.top - a.top)[0];
		const row = xTicks.map((c) => c.find((b) => Math.abs(b.top - six.top) < 2));
		expect(
			row.every((b) => b !== undefined),
			'graduations x alignées'
		).toBe(true);
		const xs = row.map(
			(b) => (b as NonNullable<typeof b>).left + (b as NonNullable<typeof b>).width / 2
		);
		const step = (xs[7] - xs[0]) / 7;
		xs.forEach((x, i) =>
			expect(Math.abs(x - (xs[0] + i * step)), `graduation x n°${i}`).toBeLessThan(2)
		);
		// Axe des y : 5, 10 … 25 (les chiffres 10, 20 sont aussi sur l'axe x : on garde ceux de la colonne la plus à gauche)
		const yCol = Math.min(...[5, 15, 25].flatMap((n) => numeric(n).map((b) => b.left + b.width)));
		const yTicks = [5, 10, 15, 20, 25].map((n) => {
			const found = numeric(n)
				.filter((b) => b.left + b.width <= yCol + 4)
				.sort((a, b) => a.top - b.top)[0];
			expect(found, `graduation ${n} (y)`).toBeDefined();
			return found.top + found.height / 2;
		});
		const yStep = (yTicks[0] - yTicks[4]) / 4;
		// Valeur y → hauteur sur la page (5 en bas, 25 en haut)
		const yAt = (v: number): number => yTicks[0] - ((v - 5) / 5) * yStep;
		const xAt = (v: number): number => xs[0] + ((v - 6) / 2) * step;

		// La ligne brisée : l'encre bleue s'étend de (6 ; 8) à (20 ; 12), son point le plus haut est (14 ; 21)
		const raster = rasterPage(fiche, pageNo, 150);
		const region = {
			left: 0,
			top: figTop - 4,
			right: size?.width ?? 600,
			bottom: Math.min(figBottom, size?.height ?? 850) - 2
		};
		const blue = inkBox(raster, isBlue, region);
		expect(blue, 'de l’encre bleue').not.toBeNull();
		if (!blue) return;
		expect(Math.abs(blue.left - xAt(6)), 'le bleu commence à x = 6').toBeLessThan(4.5);
		expect(Math.abs(blue.right - xAt(20)), 'le bleu finit à x = 20').toBeLessThan(4.5);
		expect(Math.abs(blue.top - yAt(21)), 'le point le plus haut est à y = 21').toBeLessThan(4.5);
		expect(Math.abs(blue.bottom - yAt(8)), 'le point le plus bas est à y = 8').toBeLessThan(4.5);
		// Le point le plus haut est sur la verticale de 14 h
		const topColumns = components(raster, isBlue, {
			left: xAt(14) - 3,
			top: yAt(21) - 3,
			right: xAt(14) + 3,
			bottom: yAt(21) + 3
		});
		expect(topColumns.length, 'de l’encre bleue autour de (14 ; 21)').toBeGreaterThan(0);
	});

	test('#2456 — PDF : énoncé sans aucune flèche et cases vides (aucune valeur du tableau écrite) ; corrigé avec les trois flèches (↗ ↘ ↗) et les valeurs', async ({
		page
	}) => {
		await pdfs(page);
		const marker = 'Complète le tableau de variations';
		const bodyOf = (file: string): { top: number; page: number; text: string } => {
			const { boxes } = pdfBoxes(file);
			const at = boxes.find((b) => b.text.includes(marker));
			expect(at, 'la consigne du tableau').toBeDefined();
			const found = at as NonNullable<typeof at>;
			return { top: found.top, page: found.page, text: pdfRawText(file)[found.page - 1] };
		};
		const arrowsOf = (file: string, pageNo: number, below: number) => {
			const raster = rasterPage(file, pageNo, 150);
			return components(
				raster,
				(r, g, b) => r < 190 && g < 190 && b < 190 && Math.abs(r - b) < 30,
				{
					left: 0,
					top: below,
					right: raster.width,
					bottom: raster.height
				}
			).filter(
				(c) =>
					c.box.right - c.box.left >= 30 &&
					c.box.right - c.box.left <= 70 &&
					c.box.bottom - c.box.top >= 10 &&
					c.box.bottom - c.box.top <= 40
			);
		};

		// Énoncé : aucune flèche ; six cases carrées vides (deux valeurs de x et quatre valeurs de f) ; seuls -4 et 4 écrits
		const enonce = bodyOf(fiche);
		expect(
			arrowsOf(fiche, enonce.page, enonce.top).length,
			'aucune flèche dessinée à l’énoncé'
		).toBe(0);
		const cases = components(rasterPage(fiche, enonce.page, 150), isBlack, {
			left: 0,
			top: enonce.top,
			right: 600,
			bottom: 840
		}).filter((c) => {
			const w = c.box.right - c.box.left;
			const h = c.box.bottom - c.box.top;
			return w >= 10 && w <= 16 && h >= 10 && h <= 16;
		});
		expect(cases.length, 'cases vides du tableau').toBe(6);
		// Ni la valeur 6 ni −2 ne sont écrites sous la consigne (elles sont les réponses)
		const afterMarker = enonce.text.slice(enonce.text.indexOf(marker));
		expect(afterMarker, 'aucune réponse écrite dans le tableau').not.toMatch(/^6$/m);
		expect(afterMarker).not.toMatch(/^−2$/m);

		// Corrigé : les valeurs écrites et trois flèches, montante, descendante, montante
		const solution = bodyOf(corrige);
		const after = solution.text.slice(solution.text.indexOf(marker));
		expect(after).toMatch(/^6$/m);
		expect(after).toMatch(/^−2$/m);
		const arrows = arrowsOf(corrige, solution.page, solution.top).sort(
			(a, b) => a.box.left - b.box.left
		);
		expect(arrows.length, 'trois flèches au corrigé').toBe(3);
		const directions = arrows.map((a) => (a.rightY < a.leftY ? '↗' : '↘'));
		expect(directions).toEqual(['↗', '↘', '↗']);
	});
	/** Le PDF « Fiche » d'une de nos fiches, téléchargé par l'interface */
	async function fichePdf(page: Page, id: string, saveAs: string): Promise<string> {
		await login(page, TEACHER.email, TEACHER.password);
		const file = await teacherPdf(page, id, { saveAs });
		pdfToPng(file, saveAs.replace(/\.pdf$/, ''), 70);
		return file;
	}

	test('#2462 — PDF « Automatismes : géométrie et repérage (1) » : droites graduées dessinées (jamais `start:` en texte brut), dans leur colonne, graduations lisibles ; points à placer : énoncé vide, corrigé avec A en vert sur la droite et A, B dans le repère', async ({
		page
	}) => {
		const enonce = await fichePdf(page, repereId, 'paquet6-repere-fiche.pdf');
		const solution = await teacherPdf(page, repereId, {
			kind: 'Corrigé',
			saveAs: 'paquet6-repere-corrige.pdf'
		});
		pdfToPng(solution, 'paquet6-repere-corrige', 70);
		const raw = pdfRawText(enonce).join('\n');
		for (const code of ['start:', 'end:', 'step:', 'major:', 'points:']) {
			expect(raw, `« ${code} » n'est pas imprimé`).not.toContain(code);
		}

		// Les deux droites de la série 1 (Q1 et Q2) : graduations −3 … −1 puis −3 … 1, dans la colonne de gauche
		const { boxes, pages } = pdfBoxes(enonce);
		const size = pages[0];
		const middle = size.width / 2;
		const first = boxes.filter((b) => b.page === 1);
		const top = (start: string): number => {
			const found = first.find((b) => b.text.startsWith(start));
			expect(found, `« ${start} » sur la page 1`).toBeDefined();
			return (found as NonNullable<typeof found>).top;
		};
		const [q1, q2, q3, q4, q5] = [
			'1) Lis l’abscisse',
			'2) Place le nombre',
			'3) Lis les coordonnées',
			'4) Place les points',
			'5) Le triangle'
		].map(top);
		const between = (from: number, to: number, label: string) =>
			first.filter((b) => b.left < middle && b.top > from && b.top < to && b.text.trim() === label);
		for (const [label, from, to] of [
			['−3', q1, q2],
			['−2', q1, q2],
			['−1', q1, q2],
			['−3', q2, q3],
			['−2', q2, q3],
			['−1', q2, q3],
			['0', q2, q3],
			['1', q2, q3]
		] as const) {
			const ticks = between(from, to, label);
			expect(
				ticks.length,
				`graduation « ${label} » de la droite entre ${from.toFixed(0)} et ${to.toFixed(0)}`
			).toBe(1);
			expect(ticks[0].left + ticks[0].width, `« ${label} » dans la colonne de gauche`).toBeLessThan(
				middle - 2
			);
			expect(
				ticks[0].size,
				`« ${label} » lisible une fois réduite (corps ${ticks[0].size.toFixed(1)} pt)`
			).toBeGreaterThanOrEqual(6);
		}
		// Le trait de chaque droite aussi : une longue ligne noire dont le bord droit reste dans la colonne
		const raster = rasterPage(enonce, 1, 150);
		for (const [name, from, to] of [
			['Q1', q1, q2],
			['Q2', q2, q3]
		] as const) {
			const axis = components(raster, isBlack, {
				left: 0,
				top: from + 18,
				right: raster.width,
				bottom: to - 4
			})
				.filter((c) => c.box.right - c.box.left > 150)
				.sort((a, b) => b.box.right - b.box.left - (a.box.right - a.box.left))[0];
			expect(axis, `${name} : la droite est tracée`).toBeDefined();
			expect(axis.box.right, `${name} : la droite finit avant la colonne voisine`).toBeLessThan(
				middle
			);
			expect(axis.box.left, `${name} : la droite commence dans la marge`).toBeGreaterThan(20);
		}

		// Énoncé : Q2 sans point (A seul au nom de Q1), repère de Q4 vide ; corrigé : A posé en vert, A et B dans le repère
		const named = (file: string, label: string, from: number, to: number) =>
			pdfBoxes(file).boxes.filter(
				(b) =>
					b.page === 1 &&
					b.left < middle &&
					b.top > from + 14 &&
					b.top < to &&
					b.text.trim() === label
			);
		expect(named(enonce, 'A', q2, q3), 'énoncé Q2 : aucun point nommé').toHaveLength(0);
		expect(named(enonce, 'A', q4, q5), 'énoncé Q4 : pas de A dans le repère').toHaveLength(0);
		expect(named(enonce, 'B', q4, q5), 'énoncé Q4 : pas de B dans le repère').toHaveLength(0);
		const green = (file: string): number =>
			share(rasterPage(file, 1, 100), (r, g, b) => g > r + 40 && g > b + 40, {
				left: 0,
				top: q2 + 14,
				right: middle,
				bottom: q3
			});
		expect(green(enonce), 'énoncé Q2 : rien de vert').toBe(0);
		// Le corrigé n'a pas les mêmes hauteurs : on relit ses repères
		const solutionBoxes = pdfBoxes(solution).boxes.filter((b) => b.page === 1);
		const solutionMiddle = pdfBoxes(solution).pages[0].width / 2;
		const consigne = (start: string): (typeof solutionBoxes)[number] => {
			const found = solutionBoxes.find((b) => b.text.startsWith(start));
			expect(found, `« ${start} » au corrigé`).toBeDefined();
			return found as NonNullable<typeof found>;
		};
		const [s2, s3, s4, s5] = [
			'2) Place le nombre',
			'3) Lis les coordonnées',
			'4) Place les points',
			'5) Le triangle'
		].map(consigne);
		// Les lettres nommées sous la consigne `from`, dans sa colonne, avant la consigne `to`
		const inBand = (label: string, from: typeof s2, to: typeof s2) =>
			solutionBoxes.filter(
				(b) =>
					b.left < solutionMiddle === from.left < solutionMiddle &&
					b.top > from.top + 14 &&
					b.top < to.top &&
					b.text.trim() === label
			);
		expect(inBand('A', s2, s3).length, 'corrigé Q2 : A nommé sur la droite').toBeGreaterThanOrEqual(
			1
		);
		expect(inBand('A', s4, s5).length, 'corrigé Q4 : A dans le repère').toBeGreaterThanOrEqual(1);
		expect(inBand('B', s4, s5).length, 'corrigé Q4 : B dans le repère').toBeGreaterThanOrEqual(1);
		const solutionGreen = share(
			rasterPage(solution, 1, 100),
			(r, g, b) => g > r + 40 && g > b + 40,
			{ left: 0, top: s2.top + 14, right: solutionMiddle, bottom: s3.top }
		);
		expect(solutionGreen, 'corrigé Q2 : le point posé est vert').toBeGreaterThan(0.0003);
	});

	test('#2518 — PDF de l’évaluation de rattrapage (deux colonnes, dessins) : l’introduction du « massif » reste en bas de la colonne 1 et son dessin commence en haut de la colonne 2 (sans espace en plus) ; aucun titre d’exercice seul en bas de colonne', async ({
		page
	}) => {
		const file = await fichePdf(page, rattrapageId, 'paquet6-rattrapage.pdf');
		const { boxes, pages } = pdfBoxes(file);
		const size = pages[0];
		const middle = size.width / 2;
		const intro = boxes.find((b) => b.text.startsWith('Une place a la forme'));
		expect(intro, 'introduction du massif').toBeDefined();
		if (!intro) return;
		expect(intro.page, 'introduction page 1').toBe(1);
		expect(intro.left, 'introduction en colonne 1').toBeLessThan(middle);
		expect(intro.top, 'introduction en bas de la colonne 1').toBeGreaterThan(size.height * 0.75);
		// Le dessin : de l'encre en haut de la colonne 2, à la hauteur de la première ligne de la colonne 1
		const title1 = boxes.find((b) => b.text.startsWith('Le saut du dauphin'));
		expect(title1, 'titre du premier exercice').toBeDefined();
		const colTop = (title1 as NonNullable<typeof title1>).top;
		const raster = rasterPage(file, 1, 150);
		const left = inkBox(raster, isInk, {
			left: 20,
			top: colTop - 6,
			right: middle - 6,
			bottom: colTop + 30
		});
		const right = inkBox(raster, isInk, {
			left: middle + 6,
			top: colTop - 6,
			right: size.width - 20,
			bottom: colTop + 60
		});
		expect(left, 'encre en haut de la colonne 1').not.toBeNull();
		expect(right, 'le dessin commence en haut de la colonne 2').not.toBeNull();
		if (left && right) {
			// L'écart mesuré (~9 pt) est la marge propre au dessin (étiquettes au-dessus du carré) ;
			// un espace ajouté en tête de colonne ferait plus de 12 pt (voir le test des colonnes plus bas)
			expect(
				Math.abs(right.top - left.top),
				`le haut de la colonne 2 (${right.top.toFixed(1)}) et celui de la colonne 1 (${left.top.toFixed(1)}) sont à la même hauteur`
			).toBeLessThan(12);
		}
		// Le dessin n'est PAS resté en colonne 1 sous l'introduction : plus d'encre sous elle
		const introBottom = Math.max(
			...boxes
				.filter(
					(b) => b.page === 1 && b.left < middle && b.top >= intro.top && b.top < size.height - 45
				)
				.map((b) => b.top + b.height)
		);
		const below = inkBox(raster, isInk, {
			left: 20,
			top: introBottom + 3,
			right: middle - 6,
			bottom: size.height - 45
		});
		expect(below, 'rien sous l’introduction en colonne 1').toBeNull();
		// Aucun titre d'exercice seul en bas de colonne : une ligne de texte suit chacun, dans la même colonne
		for (const name of ['Le saut du dauphin', 'Le massif de fleurs', 'L’atelier de bougies']) {
			const heading = boxes.find((b) => b.text.startsWith(name));
			expect(heading, `titre « ${name} »`).toBeDefined();
			if (!heading) continue;
			const sameColumn = (b: (typeof boxes)[number]) =>
				b.page === heading.page && b.left < middle === heading.left < middle;
			const follows = boxes.filter(
				(b) => sameColumn(b) && b.top > heading.top + 8 && b.top < heading.top + 60
			);
			expect(follows.length, `« ${name} » est suivi de texte dans sa colonne`).toBeGreaterThan(0);
		}
	});

	test('#2518 — huit exercices « introduction + dessin + questions » en deux colonnes : jamais d’introduction en bas de colonne 2 sans son dessin, un dessin qui change de colonne reste en haut de colonne 2 de la même page, aucun titre seul en bas de colonne', async ({
		page
	}) => {
		const file = await fichePdf(page, colonnesId, 'paquet6-colonnes.pdf');
		const { boxes, pages } = pdfBoxes(file);
		const middle = pages[0].width / 2;
		const column = (b: { left: number }): 1 | 2 => (b.left < middle ? 1 : 2);
		const split: number[] = [];
		const togetherOnNextPage: number[] = [];
		for (const [index, [a]] of PAIRES.entries()) {
			const k = index + 1;
			const title = boxes.find((b) => b.text.trim() === `Colonnes ${k}`);
			const intro = boxes.find((b) => b.text.startsWith(`Introduction numéro ${k} `));
			// Le repère du dessin : « bas-gauche » = le premier point nommé du segment
			const mark = boxes.find((b) => b.text.trim() === a);
			expect(
				title && intro && mark,
				`exercice ${k} : titre, introduction et dessin dans le PDF`
			).toBeTruthy();
			if (!title || !intro || !mark) continue;
			// Le titre est suivi de son introduction dans la même colonne de la même page
			expect(
				[intro.page, column(intro)],
				`exercice ${k} : le titre n'est pas seul en bas de colonne`
			).toEqual([title.page, column(title)]);
			if (intro.page === mark.page && column(intro) === column(mark)) {
				expect(mark.top, `exercice ${k} : le dessin est sous l'introduction`).toBeGreaterThan(
					intro.top
				);
				if (title.top < 80 && title.page > 1 && column(title) === 1) togetherOnNextPage.push(k);
				continue;
			}
			// Le dessin change de colonne : seulement de la colonne 1 à la colonne 2 de la MÊME page
			expect(
				[intro.page, column(intro), mark.page, column(mark)],
				`exercice ${k} : introduction page ${intro.page} colonne ${column(intro)}, dessin page ${mark.page} colonne ${column(mark)}`
			).toEqual([intro.page, 1, intro.page, 2]);
			split.push(k);
			// Pas d'espace en plus en haut de la colonne 2 : le segment de coin à coin commence à la
			// hauteur du premier texte de la colonne 1 de la même page
			const columnTop = Math.min(
				...boxes
					.filter(
						(b) => b.page === intro.page && column(b) === 1 && b.top > (intro.page === 1 ? 135 : 0)
					)
					.map((b) => b.top)
			);
			const raster = rasterPage(file, intro.page, 150);
			const ink1 = inkBox(raster, isInk, {
				left: 20,
				top: columnTop - 6,
				right: middle - 6,
				bottom: columnTop + 25
			});
			const ink2 = inkBox(raster, isInk, {
				left: middle + 6,
				top: columnTop - 6,
				right: pages[0].width - 20,
				bottom: columnTop + 40
			});
			expect(ink1 && ink2, `exercice ${k} : encre en haut des deux colonnes`).toBeTruthy();
			if (ink1 && ink2) {
				expect(
					Math.abs(ink2.top - ink1.top),
					`exercice ${k} : haut de colonne 2 (${ink2.top.toFixed(1)}) / colonne 1 (${ink1.top.toFixed(1)})`
				).toBeLessThan(5);
			}
		}
		// Les deux cas du test se sont bien produits (sinon le test ne prouve rien)
		expect(
			split.length,
			`une introduction en colonne 1 et son dessin en colonne 2 (exercices ${split})`
		).toBeGreaterThanOrEqual(1);
		expect(
			togetherOnNextPage.length,
			`une introduction et son dessin partis ensemble en haut de la page suivante (exercices ${togetherOnNextPage})`
		).toBeGreaterThanOrEqual(1);
	});
});
