import { expect, test, type Locator, type Page } from '@playwright/test';
import { assertLocalServerEnv, login, sql, TEACHER } from './helpers/carnet';

/**
 * Constructions à la règle et au compas — lignes anciennes de verifications-manuelles.md
 * =======================================================================================
 *
 * #1750 (vitrine, essais du prof, 403), #1665/#1666 (constructions au prof seul),
 * #1659/#1662 (constructions publiques, sur la base locale), #1653, #1649, #1637/#1638,
 * #1647, #1633, #1629, #1626, #1623, #1621, #1619.
 *
 * Les scripts se jouent dans `/constructions/essais` (prof), pas à pas (« étape suivante »,
 * instantanée) : à chaque arrêt on lit la consigne, les instruments posés (position,
 * rotation) et les objets de la figure (points, segments, arcs, codages).
 *
 *   VERIFS_PORT=5179 pnpm test:verifs constructions.spec --project ordi-chrome --workers 1
 *
 * Décor : « Verifs3 … » (construction, script d'essai), supprimé en fin de passage.
 * Captures : `.captures/verifs/constructions/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');

// La config est `fullyParallel` et chaque `afterAll` efface tout le décor « Verifs3 % » : en série,
// sinon un worker effacerait le décor d'un autre en plein test.
test.describe.configure({ mode: 'serial' });

const STUDENT = { email: 'eleve01@local.test', password: 'local-eleve' };
const ADMIN_ACCOUNT = { email: 'admin@local.test', password: 'local-admin' };
const RUN = Date.now().toString(36);
const SHOTS = '.captures/verifs/constructions';

test.beforeAll(() => {
	assertLocalServerEnv();
});

test.afterAll(async () => {
	await sql(`delete from constructions where title like 'Verifs3 %'`);
	await sql(`delete from construction_demo_scripts where name like 'Verifs3 %'`);
});

// ============================================================================
// OUTILS : jouer un script dans les essais et lire l'état du lecteur
// ============================================================================

interface State {
	points: { label: string; x: number; y: number }[];
	lines: string[];
	paths: string[];
	/** Instruments posés : type → origine (translate) et centre du corps (pixels de la figure) */
	instruments: { type: string; x: number; y: number; rotation: number; cx: number; cy: number }[];
	/** Consignes de l'auteur, de la sous-étape, ligne d'arrêt (une chaîne) */
	text: string;
	labels: string[];
	/** Centres des marqueurs d'angle droit */
	marks: { cx: number; cy: number }[];
}

function stepButton(page: Page): Locator {
	return page.getByTitle('Etape suivante (instantane)');
}

/** Tape le script dans l'éditeur des essais et attend que le lecteur l'ait pris */
async function typeScript(page: Page, lines: string[]): Promise<void> {
	await page.goto('/constructions/essais');
	await page.waitForLoadState('networkidle');
	const editor = page.locator('.cm-content');
	const expected = lines.join('\n');
	// L'éditeur se monte tard : on retape tant que son contenu n'est pas exactement le script
	await expect(async () => {
		await editor.click();
		await page.keyboard.press('ControlOrMeta+a');
		await page.keyboard.insertText(expected + '\n');
		const content = await editor
			.locator('.cm-line')
			.evaluateAll((els) => els.map((el) => el.textContent ?? '').join('\n'));
		expect(content.trim()).toBe(expected);
	}).toPass({ timeout: 15000 });
	// La validation est différée (300 ms) puis le lecteur recharge le script :
	// on attend que son nombre d'étapes ne bouge plus.
	const total = page.getByText(/Etape \d+ \/ \d+/);
	let previous = '';
	await expect(async () => {
		await page.waitForTimeout(400); // le lecteur ne signale pas son rechargement
		const now = await total.innerText();
		const stable = now === previous;
		previous = now;
		expect(stable).toBe(true);
	}).toPass({ timeout: 15000 });
}

async function readState(page: Page): Promise<State> {
	return page.locator('.construction-player').evaluate((root) => {
		const round = (v: number): number => Math.round(v * 10) / 10;
		const num = (v: string | null): number => round(Number(v));
		const canvas = root.querySelector('.construction-canvas')?.getBoundingClientRect();
		const ox = canvas?.left ?? 0;
		const oy = canvas?.top ?? 0;
		const points = [...root.querySelectorAll('circle.point')].map((c) => {
			let t = c.nextElementSibling;
			while (t && t.tagName !== 'text') t = t.nextElementSibling;
			return {
				label: t?.textContent ?? '',
				x: num(c.getAttribute('cx')),
				y: num(c.getAttribute('cy'))
			};
		});
		const lines = [...root.querySelectorAll('.elements line')].map((l) => {
			const kind = l.getAttribute('class')?.split(' ')[0] ?? '';
			return `${kind}[${num(l.getAttribute('x1'))},${num(l.getAttribute('y1'))}->${num(l.getAttribute('x2'))},${num(l.getAttribute('y2'))}]`;
		});
		const paths = [...root.querySelectorAll('.elements path')].map((p) => {
			const kind = p.getAttribute('class')?.split(' ')[0] ?? '';
			const b = (p as SVGGraphicsElement).getBBox();
			return `${kind}{${round(b.x)},${round(b.y)},${round(b.width)},${round(b.height)}}`;
		});
		const marks = [...root.querySelectorAll('.elements path.angle-mark')].map((p) => {
			const b = (p as SVGGraphicsElement).getBBox();
			return { cx: round(b.x + b.width / 2), cy: round(b.y + b.height / 2) };
		});
		const instruments = [...root.querySelectorAll('[data-instrument]')].map((g) => {
			const tr = g.getAttribute('transform') ?? '';
			const m = /translate\(([-\d.e]+), ([-\d.e]+)\) rotate\(([-\d.e]+)\)/.exec(tr);
			const r = g.getBoundingClientRect();
			return {
				type: g.getAttribute('data-instrument') ?? '',
				x: round(Number(m?.[1])),
				y: round(Number(m?.[2])),
				rotation: round(Number(m?.[3])),
				cx: round(r.left + r.width / 2 - ox),
				cy: round(r.top + r.height / 2 - oy)
			};
		});
		const text = [...root.querySelectorAll('[data-testid]')]
			.map((e) => (e.textContent ?? '').trim())
			.join(' ¶ ');
		const labels = [...root.querySelectorAll('.elements text.label')].map(
			(t) => t.textContent ?? ''
		);
		return { points, lines, paths, instruments, text, labels, marks };
	});
}

/** Rejoue le script depuis le début, « étape suivante » ; rend l'état après chaque pas */
async function playAll(
	page: Page,
	script: string[],
	shots: Record<number, string> = {}
): Promise<State[]> {
	await typeScript(page, script);
	await page.getByTitle('Recommencer').click();
	const steps: State[] = [];
	await expect(stepButton(page)).toBeEnabled();
	const counter = page.getByText(/Etape \d+ \/ \d+/);
	const currentStep = async (): Promise<number> =>
		Number(/Etape (\d+) \//.exec(await counter.innerText())?.[1]);
	while (await stepButton(page).isEnabled()) {
		const before = await currentStep();
		await stepButton(page).click();
		// le compteur « Etape n / m » avance quand le lecteur a peint l'étape
		await expect.poll(currentStep).toBe(before + 1);
		steps.push(await readState(page));
		const name = shots[steps.length];
		if (name)
			await page.locator('.construction-player').screenshot({ path: `${SHOTS}/${name}.png` });
	}
	return steps;
}

/** Avance jusqu'à la dernière étape (instantané) */
async function toEnd(page: Page): Promise<void> {
	while (await stepButton(page).isEnabled()) await stepButton(page).click();
}

function instrument(state: State, type: string): State['instruments'][number] | undefined {
	return state.instruments.find((i) => i.type === type);
}

function allText(steps: State[]): string {
	return steps.map((s) => s.text).join(' ¶ ');
}

function pointAt(state: State, label: string): { x: number; y: number } {
	const p = state.points.find((q) => q.label === label);
	if (!p) throw new Error(`point ${label} absent : ${state.points.map((q) => q.label).join(',')}`);
	return p;
}

function near(a: number, b: number, tol = 1): void {
	expect(Math.abs(a - b), `${a} ≉ ${b}`).toBeLessThanOrEqual(tol);
}

function dot(ax: number, ay: number, bx: number, by: number): number {
	return ax * bx + ay * by;
}

/** Le marqueur d'angle droit le plus proche d'un sommet */
function markNear(state: State, p: { x: number; y: number }): { cx: number; cy: number } {
	return state.marks.reduce((m, n) =>
		Math.hypot(m.cx - p.x, m.cy - p.y) < Math.hypot(n.cx - p.x, n.cy - p.y) ? m : n
	);
}

// ============================================================================
// SCRIPTS : #1653 … #1621 (essais, prof)
// ============================================================================

test.describe('lecteur des essais (prof)', () => {
	test.beforeEach(async ({ page }) => {
		await login(page, TEACHER.email, TEACHER.password);
	});

	test('#1653 — angle plat : arcs au-dessus, bissectrice verticale, en @arcs_egaux et en @mesure', async ({
		page
	}) => {
		const plat = (option: string): string[] => [
			'A = point(4, 0)',
			'V = point(0, 0)',
			'B = point(-4, 0)',
			'c1 = demidroite(V, A)',
			'c2 = demidroite(V, B)',
			`d = bissectrice(A, V, B) ${option}`
		];
		const egaux = await playAll(page, plat('@euclide @arcs_egaux @complet'), {
			12: '1653-angle-plat-arcs-egaux'
		});
		const fin = egaux.at(-1)!;
		const v = pointAt(fin, 'V');
		// Les deux grands arcs (centres A′ et B′) sont entièrement au-dessus de la droite (VA)
		const grands = fin.paths.filter((p) => p.startsWith('arc')).slice(2);
		expect(grands).toHaveLength(2);
		for (const arc of grands) {
			const [, y, , h] = /\{([\d.-]+),([\d.-]+),([\d.-]+),([\d.-]+)\}/
				.exec(arc)!
				.slice(1)
				.map(Number);
			expect(y + h, `arc ${arc} sous V`).toBeLessThan(v.y);
		}
		expect(pointAt(fin, 'P').y).toBeLessThan(v.y);
		// La bissectrice est verticale, par V
		const verticale = new RegExp(`^geo-line\\[${v.x},[\\d.-]+->${v.x},[\\d.-]+\\]$`);
		expect(fin.lines.find((l) => l.startsWith('geo-line'))).toMatch(verticale);

		const mesure = await playAll(page, plat('@mesure @complet'));
		expect(allText(mesure)).toContain('180°');
		expect(allText(mesure)).toContain('180 ÷ 2 = 90');
		expect(mesure.at(-1)!.lines.find((l) => l.startsWith('geo-line'))).toMatch(verticale);

		// @arc_milieu sur un angle plat : refus qui renvoie vers les deux autres options
		await typeScript(page, plat('@euclide @arc_milieu'));
		const message = page.locator('.script-editor');
		await expect(message).toContainText('@arcs_egaux');
		await expect(message).toContainText('@mesure');
	});

	test('#1653 — parallèle à l’équerre avec P sur (AB) : le message cite @equerre', async ({
		page
	}) => {
		const steps = await playAll(page, [
			'A = point(0, 0)',
			'B = point(4, 1)',
			'P = point(8, 2)',
			'd = parallele(P, A, B) @equerre @double_perpendiculaire'
		]);
		expect(steps.at(-1)!.text).toContain('@equerre');
		expect(steps.at(-1)!.text).toContain('Arrêt à la ligne 4');
	});

	test('#1653 — C et D déjà pris : points auxiliaires E*, F* (pas C*, D*)', async ({ page }) => {
		const steps = await playAll(page, [
			'C = point(0, 0)',
			'D = point(4, 1)',
			'M = point(1, 3)',
			'm = parallele(M, C, D) @euclide @double_perpendiculaire @complet'
		]);
		const fin = steps.at(-1)!;
		expect(fin.labels).toEqual(expect.arrayContaining(['E*', 'F*']));
		expect(fin.labels).not.toContain('C*');
		expect(fin.labels).not.toContain('D*');
		expect(allText(steps)).toContain('E*');
		expect(allText(steps)).not.toMatch(/C\*|D\*/);
	});

	test('#1653 — parallèle à l’équerre en @complet : carré en P dans le coin de l’équerre ; trait bleu le long de la règle', async ({
		page
	}) => {
		const steps = await playAll(
			page,
			[
				'A = point(0, 0)',
				'B = point(4, 1)',
				'P = point(1, 3)',
				'd = parallele(P, A, B) @equerre @double_perpendiculaire @complet'
			],
			{ 10: '1653-equerre-en-P', 13: '1653-equerre-figure-finie' }
		);
		const enP = steps.find((s) => s.text.includes('angle droit en P'));
		expect(enP, 'étape « angle droit en P »').toBeDefined();
		const equerre = instrument(enP!, 'setSquare')!;
		const p = pointAt(steps.at(-1)!, 'P');
		near(equerre.x, p.x, 1);
		near(equerre.y, p.y, 1);
		// Le carré le plus proche de P est du même côté que le corps de l'équerre (dans son coin)
		const marque = markNear(steps.at(-1)!, p);
		expect(
			dot(equerre.cx - p.x, equerre.cy - p.y, marque.cx - p.x, marque.cy - p.y),
			'le carré n’est pas du côté de l’équerre'
		).toBeGreaterThan(0);

		const segment = await playAll(
			page,
			['A = point(-3, 0)', 'B = point(3, 1)', 'segment(A, B)', '@pause(500)'],
			{ 3: '1653-segment-trait-bleu-sous-la-regle' }
		);
		const pendantTrace = segment[2];
		expect(instrument(pendantTrace, 'ruler')).toBeDefined();
		expect(pendantTrace.lines.filter((l) => l.startsWith('segment'))).toHaveLength(1);
	});

	test('#1649 — règle posée et crayon au bout du trait à chaque arrêt, figure sans instrument à la fin', async ({
		page
	}) => {
		const steps = await playAll(
			page,
			[
				'A = point(-3, 0)',
				'B = point(3, 1)',
				'segment(A, B)',
				'@pause(1500)',
				'arc(A, rayon=4, debut=0, fin=60)',
				'@pause(500)'
			],
			{ 3: '1649-arret-regle-et-crayon', 5: '1649-arret-compas' }
		);
		const b = pointAt(steps[2], 'B');
		const a = pointAt(steps[2], 'A');
		for (const arret of [steps[2], steps[3]]) {
			const regle = instrument(arret, 'ruler')!;
			const crayon = instrument(arret, 'pencil')!;
			expect(regle, 'règle posée').toBeDefined();
			near(regle.x, a.x);
			near(regle.y, a.y);
			near(crayon.x, b.x);
			near(crayon.y, b.y);
		}
		// Le compas à la fin de l'arc (centré en A)
		const compas = instrument(steps[4], 'compass')!;
		expect(compas, 'compas à l’arrêt').toBeDefined();
		near(compas.x, a.x);
		near(compas.y, a.y);
		// Sans @pause final, la dernière étape rend la figure nue
		const nue = await playAll(page, [
			'A = point(-3, 0)',
			'B = point(3, 1)',
			'segment(A, B)',
			'@pause(1500)',
			'arc(A, rayon=4, debut=0, fin=60)'
		]);
		expect(nue.at(-1)!.instruments).toEqual([]);
	});

	test('#1649 — lecture continue : aucun clignotement d’instrument entre deux étapes', async ({
		page
	}) => {
		await typeScript(page, [
			'A = point(-3, 0)',
			'B = point(3, 1)',
			'segment(A, B)',
			'@pause(1500)',
			'arc(A, rayon=4, debut=0, fin=60)'
		]);
		await page.getByTitle('Recommencer').click();
		await page.evaluate(() => {
			const frames: string[] = [];
			Object.assign(window, { __frames: frames });
			const loop = (): void => {
				const types = [...document.querySelectorAll('[data-instrument]')]
					.map((g) => g.getAttribute('data-instrument'))
					.sort()
					.join('+');
				frames.push(types);
				requestAnimationFrame(loop);
			};
			loop();
		});
		await page.getByTitle('Lecture', { exact: true }).click();
		// Fin de lecture : le bouton redevient « Lecture »
		await expect(page.getByTitle('Pause')).toBeVisible();
		await expect(page.getByTitle('Lecture', { exact: true })).toBeVisible({ timeout: 30000 });
		const frames = await page.evaluate(
			() => (window as unknown as { __frames: string[] }).__frames
		);
		const first = frames.findIndex((f) => f !== '');
		const last = frames.findLastIndex((f) => f !== '');
		expect(first, 'aucun instrument vu pendant la lecture').toBeGreaterThanOrEqual(0);
		const trou = frames.slice(first, last + 1).findIndex((f) => f === '');
		expect(trou, 'une image sans instrument entre deux étapes').toBe(-1);
		expect(frames.at(-1), 'à la fin, plus d’instrument').toBe('');
	});

	test('#1637/#1638 — milieu mesuré : 0 de la règle sur A, 6,8 en face de B, crayon à 3,4, codage seulement avec un segment', async ({
		page
	}) => {
		const pts = ['A = point(-2, -1)', 'B = point(4.37, 1.5)'];
		const avec = await playAll(
			page,
			[...pts, 's = segment(A, B)', 'I = milieu(A, B) @mesure @complet'],
			{ 3: '1637-regle-0-sur-A' }
		);
		const a = pointAt(avec.at(-1)!, 'A');
		const b = pointAt(avec.at(-1)!, 'B');
		const lecture = avec.find((s) => s.text.includes('on lit AB = 6,8 cm'))!;
		expect(lecture, 'consigne « on lit AB = 6,8 cm »').toBeDefined();
		const regle = instrument(lecture, 'ruler')!;
		near(regle.x, a.x);
		near(regle.y, a.y);
		// 6,8 cm en face de B : l'origine de la règle est en A, orientée vers B
		const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
		near(regle.rotation, angle, 0.2);
		near(Math.hypot(b.x - a.x, b.y - a.y) / 40, 6.8, 0.05);
		// Le crayon se pose à la graduation 3,4 : le milieu de [AB]
		const repere = avec.find((s) => s.text.includes('on repère la graduation 3,4'))!;
		const crayon = instrument(repere, 'pencil')!;
		near(crayon.x, (a.x + b.x) / 2, 0.5);
		near(crayon.y, (a.y + b.y) / 2, 0.5);
		const finale = avec.at(-1)!;
		const i = pointAt(finale, 'I');
		near(i.x, (a.x + b.x) / 2, 0.5);
		near(i.y, (a.y + b.y) / 2, 0.5);
		const codes = finale.lines.filter((l) => l.startsWith('segment-mark'));
		expect(codes.length, 'codage AI = IB (deux traits de chaque côté)').toBeGreaterThanOrEqual(4);
		// Sans segment : aucun codage, rien d'autre que les points
		const sans = await playAll(page, [...pts, 'I = milieu(A, B) @mesure @complet']);
		expect(sans.at(-1)!.lines).toEqual([]);
		expect(sans.at(-1)!.paths).toEqual([]);
		// Chaque consigne vient à son étape, dans l'ordre
		expect(allText(sans)).toMatch(/lit AB = 6,8 cm.*÷ 2 = 3,4.*marque I/);
	});

	test('#1637/#1638 — milieu mesuré : B à gauche de A (0 sur B), segment vertical, milieu(s)', async ({
		page
	}) => {
		const aGauche = await playAll(page, [
			'A = point(2, -1)',
			'B = point(-4.37, 1.5)',
			's = segment(A, B)',
			'I = milieu(A, B) @mesure @complet'
		]);
		const lecture = aGauche.find((s) => s.text.includes('on lit'))!;
		const regleG = instrument(lecture, 'ruler')!;
		const aG = pointAt(aGauche.at(-1)!, 'A');
		const bG = pointAt(aGauche.at(-1)!, 'B');
		// la règle va de gauche à droite : son 0 est sur B, le point le plus à gauche
		expect(bG.x).toBeLessThan(aG.x);
		near(regleG.x, bG.x);
		near(regleG.y, bG.y);
		expect(lecture.text).toContain('6,8 cm');
		near(pointAt(aGauche.at(-1)!, 'I').x, (aG.x + bG.x) / 2, 0.5);

		const vertical = await playAll(page, [
			'A = point(1, -3)',
			'B = point(1, 4)',
			's = segment(A, B)',
			'I = milieu(A, B) @mesure @complet'
		]);
		const lectureV = vertical.find((s) => s.text.includes('on lit'))!;
		expect(lectureV.text).toContain('7 cm');
		const iV = pointAt(vertical.at(-1)!, 'I');
		const aV = pointAt(vertical.at(-1)!, 'A');
		const bV = pointAt(vertical.at(-1)!, 'B');
		near(iV.y, (aV.y + bV.y) / 2, 0.5);
		near(iV.x, aV.x, 0.5);

		const parSegment = await playAll(page, [
			'A = point(-2, -1)',
			'B = point(4.37, 1.5)',
			's = segment(A, B)',
			'I = milieu(s) @mesure @complet'
		]);
		const aS = pointAt(parSegment.at(-1)!, 'A');
		const bS = pointAt(parSegment.at(-1)!, 'B');
		near(pointAt(parSegment.at(-1)!, 'I').x, (aS.x + bS.x) / 2, 0.5);
		expect(allText(parSegment)).toContain('on lit AB = 6,8 cm');
	});

	test('#1647 — médiatrice mesurée : règle, milieu, équerre sur I au-dessus, tracé, prolongement', async ({
		page
	}) => {
		const pts = ['A = point(-3, -1)', 'B = point(3.4, 0.5)'];
		const d = 'd = mediatrice(A, B) @mesure @complet';
		const avec = await playAll(page, [...pts, 's = segment(A, B)', d], {
			5: '1647-milieu-repere',
			7: '1647-equerre-sur-I',
			9: '1647-mediatrice-figure-finie'
		});
		const fin = avec.at(-1)!;
		const a = pointAt(fin, 'A');
		const i = pointAt(fin, 'I');
		const lecture = avec.find((s) => s.text.includes('AB = 6,6 cm'))!;
		near(instrument(lecture, 'ruler')!.x, a.x);
		const repere = avec.find((s) => s.text.includes('graduation 3,3'))!;
		expect(repere.text).toContain('6,6 ÷ 2 = 3,3');
		const equerre = avec.find((s) => s.text.includes('le coin sur I'))!;
		const sq = instrument(equerre, 'setSquare')!;
		near(sq.x, i.x);
		near(sq.y, i.y);
		const angleAB = Math.atan2(pointAt(fin, 'B').y - a.y, pointAt(fin, 'B').x - a.x);
		near(sq.rotation, (angleAB * 180) / Math.PI, 0.2); // bord sur (AB)
		// Le corps de l'équerre est au-dessus de (AB) (y d'écran plus petit)
		const normaleHaut = { x: Math.sin(angleAB), y: -Math.cos(angleAB) };
		expect(dot(sq.cx - i.x, sq.cy - i.y, normaleHaut.x, normaleHaut.y)).toBeGreaterThan(0);
		// tracé au-dessus, puis règle, puis prolongement en dessous
		const trace = avec.find((s) => s.text.includes('on trace la perpendiculaire'))!;
		expect(instrument(trace, 'pencil')!.y).toBeLessThan(i.y);
		expect(avec.some((s) => s.text.includes('pose la règle le long'))).toBe(true);
		expect(fin.text).toContain('médiatrice de [AB]');
		const enDessous = fin.lines
			.filter((l) => l.startsWith('segment['))
			.some((l) => Number(/->[\d.-]+,([\d.-]+)\]/.exec(l)![1]) > i.y);
		expect(enDessous, 'prolongement en dessous de I').toBe(true);
		// Codage AI = IB et carré d'angle droit en I
		expect(fin.lines.filter((l) => l.startsWith('segment-mark')).length).toBeGreaterThanOrEqual(4);
		expect(fin.marks).toHaveLength(1);
		near(fin.marks[0].cx, i.x, 20);
		near(fin.marks[0].cy, i.y, 20);

		// Avec M = milieu(A, B) avant d : pas de mesure
		const avecM = await playAll(page, [...pts, 's = segment(A, B)', 'M = milieu(A, B)', d]);
		expect(allText(avecM)).not.toContain('AB = 6,6');
		expect(avecM.some((s) => s.text.includes('le coin sur M'))).toBe(true);

		// Sans s : aucun codage
		const sans = await playAll(page, [...pts, d]);
		expect(sans.at(-1)!.lines.filter((l) => l.startsWith('segment-mark'))).toEqual([]);
		expect(sans.at(-1)!.marks).toEqual([]);
	});

	test('#1633 — lettres des points auxiliaires : sur la figure, les mêmes que dans les consignes', async ({
		page
	}) => {
		const pts = ['A = point(0, 0)', 'B = point(4, 1)', 'P = point(1, 3)'];
		const d = 'd = parallele(P, A, B) @euclide @double_perpendiculaire @complet';
		const steps = await playAll(page, [...pts, d], { 19: '1633-lettres-figure-finie' });
		const fin = steps.at(-1)!;
		for (const nom of ['A*', 'B*', 'Q', 'C*', 'D*', 'R', 'e']) {
			expect(fin.labels, `lettre ${nom} sur la figure`).toContain(nom);
		}
		const texte = allText(steps);
		for (const nom of ['A*', 'B*', 'Q', 'C*', 'D*', 'R']) {
			const echappe = nom.replace('*', '\\*');
			expect(texte).toMatch(new RegExp(`(^|[^\\p{L}])${echappe}(?![\\p{L}*′])`, 'u'));
		}
		// Q déjà pris par le script : le point auxiliaire s'écrit Q′, figure et consignes
		const avecQ = await playAll(page, [...pts, 'Q = point(6, 5)', d]);
		expect(avecQ.at(-1)!.labels).toContain('Q′');
		expect(allText(avecQ)).toContain('Q′');
		// K = centre(c) : « se croisent en K », lettre K au centre, aucun O
		const circ = await playAll(page, [
			'A = point(0, 0)',
			'B = point(4, 1)',
			'C = point(1, 3)',
			'c = cercle_circonscrit(A, B, C) @euclide',
			'K = centre(c)'
		]);
		expect(allText(circ)).toContain('se croisent en K');
		expect(allText(circ)).not.toMatch(/(^|[^\p{L}])O([^\p{L}]|$)/u);
		expect(circ.at(-1)!.labels).toContain('K');
		expect(circ.at(-1)!.labels).not.toContain('O');
	});

	test('#1629 — consignes de parallèle : « Compas en C, on prend la mesure |CD| », « parallèle à d », aucune lettre absente', async ({
		page
	}) => {
		const steps = await playAll(page, [
			'C = point(0, 0)',
			'D = point(6, 1)',
			'd = droite(C, D)',
			'M = point(2, 4)',
			'm = parallele(M, C, D) @euclide',
			'n = parallele(M, d) @euclide @double_perpendiculaire'
		]);
		const texte = allText(steps);
		expect(texte).toContain('Compas en C, on prend la mesure |CD|');
		expect(texte).toContain('Compas en M');
		expect(steps.at(-1)!.text).toMatch(/parallèle à d\s*$/);
		// Seules lettres permises : celles du script et les points auxiliaires (Q, R, A*, B*, E*, F*)
		// (une lettre seule : C, D, M du script ou Q, R auxiliaires ; une étoile ou une prime : auxiliaire)
		const seules = new Set(['C', 'D', 'M', 'Q', 'R']);
		const lettres = texte.match(/(?<![\p{L}*′])[A-Z][*′]?(?![\p{L}])/gu) ?? [];
		expect(lettres.length).toBeGreaterThan(10);
		for (const lettre of lettres)
			expect(seules.has(lettre) || /[*′]$/.test(lettre), `lettre ${lettre} hors script`).toBe(true);
	});

	test('#1626 — parallèle à une droite nommée : m comme parallele(P, A, B), point caché de k en fondu, « e » réservé', async ({
		page
	}) => {
		const avant = ['A = point(0, 0)', 'B = point(6, 1)'];
		const nommee = await playAll(page, [
			...avant,
			'd = droite(A, B)',
			'P = point(2, 4)',
			'm = parallele(P, d) @euclide'
		]);
		const troisPoints = await playAll(page, [
			...avant,
			'd = droite(A, B)',
			'P = point(2, 4)',
			'm = parallele(P, A, B) @euclide'
		]);
		// Même animation : mêmes consignes, mêmes instruments
		expect(nommee.length).toBeGreaterThan(5);
		expect(nommee.map((s) => s.text)).toEqual(troisPoints.map((s) => s.text));
		expect(nommee.map((s) => s.instruments.map((i) => i.type).join('+'))).toEqual(
			troisPoints.map((s) => s.instruments.map((i) => i.type).join('+'))
		);

		const script = [
			...avant,
			'd = droite(A, B)',
			'P = point(2, 4)',
			'm = parallele(P, d) @euclide',
			'C = point(8, 4)',
			'k = perpendiculaire(C, A, B)',
			'n = parallele(P, k) @euclide @complet'
		];
		const steps = await playAll(page, script);
		const idx = steps.findIndex((s) => s.text.includes('On choisit un point de la droite'));
		expect(idx, 'consigne du point caché de k').toBeGreaterThan(0);
		// le point caché apparaît à cette étape, avant le premier coup de compas de n
		expect(steps[idx].points.length).toBeGreaterThan(steps[idx - 1].points.length);
		expect(steps.findIndex((s, i) => i > idx && instrument(s, 'compass'))).toBeGreaterThan(idx);

		await typeScript(page, [...script, 'e = point(1, 1)']);
		await expect(page.locator('.script-editor')).toContainText('"e" est une constante réservée');
		await expect(page.locator('.script-editor')).toContainText('le nombre e');
	});

	test('#1623 — P sur (AB) : ligne rouge d’arrêt au dernier pas, absente un pas avant et avec P hors de la droite', async ({
		page
	}) => {
		const d = 'd = parallele(P, A, B) @euclide @double_perpendiculaire';
		await typeScript(page, ['A = point(0, 0)', 'B = point(4, 0)', 'P = point(2, 0)', d]);
		const arret = page.getByTestId('arret-execution');
		await page.getByTitle('Recommencer').click();
		await expect(arret).toHaveCount(0);
		while (await stepButton(page).isEnabled()) await stepButton(page).click();
		await expect(arret).toContainText('Arrêt à la ligne 4');
		await expect(arret).toContainText('P est sur la droite (AB)');
		await page
			.locator('.construction-player')
			.screenshot({ path: `${SHOTS}/1623-ligne-rouge-arret.png` });
		await page.getByTitle('Etape precedente').click();
		await expect(arret).toHaveCount(0);

		const horsDroite = await playAll(page, [
			'A = point(0, 0)',
			'B = point(4, 0)',
			'P = point(2, 3)',
			d
		]);
		expect(horsDroite.every((s) => !s.text.includes('Arrêt'))).toBe(true);
		expect(horsDroite.at(-1)!.lines.some((l) => l.startsWith('geo-line'))).toBe(true);
	});

	test('#1623 — (AB) verticale : l’équerre est posée du côté de P, le carré en P dans son coin', async ({
		page
	}) => {
		const equerre = (p: string): string[] => [
			'A = point(0, 0)',
			'B = point(0, 4)',
			`P = point(${p})`,
			'd = parallele(P, A, B) @equerre @double_perpendiculaire @complet'
		];
		for (const [p, cote, vue] of [
			['-3, 1', -1, '1623-equerre-P-a-gauche'],
			['3, 1', 1, '1623-equerre-P-a-droite']
		] as const) {
			const steps = await playAll(page, equerre(p), { 4: vue });
			const fin = steps.at(-1)!;
			const a = pointAt(fin, 'A');
			const premiere = steps.find((s) => instrument(s, 'setSquare'))!;
			const sq = instrument(premiere, 'setSquare')!;
			// du côté de P : le corps de l'équerre est à gauche (P à gauche) ou à droite de (AB)
			expect(Math.sign(sq.cx - a.x), `équerre du côté de P = ${p}`).toBe(cote);
			// à la pose sur e (angle droit en P), le carré en P est dans le coin de l'équerre
			const enP = steps.find((s) => s.text.includes('angle droit en P'))!;
			const eq = instrument(enP, 'setSquare')!;
			const pp = pointAt(fin, 'P');
			const marque = markNear(fin, pp);
			expect(dot(eq.cx - pp.x, eq.cy - pp.y, marque.cx - pp.x, marque.cy - pp.y)).toBeGreaterThan(
				0
			);
		}
	});

	test('#1621 — double perpendiculaire au compas puis à l’équerre ; P sur (AB) → erreur', async ({
		page
	}) => {
		const script = (option: string, p = '1, 3'): string[] => [
			'A = point(0, 0)',
			'B = point(4, 1)',
			`P = point(${p})`,
			`d = parallele(P, A, B) ${option}`
		];
		const compas = await playAll(page, script('@euclide @double_perpendiculaire'));
		const t = allText(compas);
		expect(t).toMatch(/perpendiculaire e/);
		expect(t).toMatch(/petit arc coupe e en C\*/);
		expect(t).toMatch(/petit arc coupe e en D\*/);
		expect(t).toMatch(/ouvre davantage/);
		expect(t).toContain('Les arcs se croisent en R');
		// la dernière étape (règle par P et R) rend la figure sans instrument
		expect(compas.at(-1)!.text).toContain('Règle par P et R');
		expect(compas.at(-1)!.instruments).toEqual([]);

		const equerre = await playAll(page, script('@equerre @double_perpendiculaire @complet'), {
			10: '1621-equerre-angle-droit-en-P',
			13: '1621-equerre-deux-marqueurs'
		});
		const fin = equerre.at(-1)!;
		// deux marqueurs d'angle droit, en F (pied de e sur (AB)) et en P
		expect(fin.marks).toHaveLength(2);
		const p = pointAt(fin, 'P');
		const f = fin.points.find((q) => q.label === '')!; // F : point sans lettre
		expect(f, 'pied F de la perpendiculaire').toBeDefined();
		for (const sommet of [p, f]) {
			const proche = markNear(fin, sommet);
			expect(Math.hypot(proche.cx - sommet.x, proche.cy - sommet.y)).toBeLessThan(25);
		}
		// bien orientés : chaque marqueur est du côté du corps de l'équerre posée à ce sommet
		const enF = equerre.find((s) => s.text.includes('glisser'))!;
		const sqF = instrument(enF, 'setSquare')!;
		const mF = markNear(fin, f);
		expect(dot(sqF.cx - f.x, sqF.cy - f.y, mF.cx - f.x, mF.cy - f.y)).toBeGreaterThan(0);
		const enP = equerre.find((s) => s.text.includes('angle droit en P'))!;
		const sqP = instrument(enP, 'setSquare')!;
		const mP = markNear(fin, p);
		expect(dot(sqP.cx - p.x, sqP.cy - p.y, mP.cx - p.x, mP.cy - p.y)).toBeGreaterThan(0);

		const surAB = await playAll(page, script('@equerre @double_perpendiculaire', '2, 0.5'));
		expect(surAB.at(-1)!.text).toContain('P est sur la droite (AB)');
	});
});

// ============================================================================
// COMPAS : ouverture lue sur l'instrument pendant une lecture continue
// ============================================================================

interface CompassFrame {
	t: number;
	/** Ouverture du compas en pixels (null : pas de compas à l'écran) */
	opening: number | null;
}

async function startCompassRecording(page: Page): Promise<void> {
	await page.evaluate(() => {
		const frames: CompassFrame[] = [];
		Object.assign(window, { __compass: frames });
		const t0 = performance.now();
		const loop = (): void => {
			const compass = document.querySelector('[data-instrument="compass"]');
			let opening: number | null = null;
			if (compass) {
				for (const g of compass.querySelectorAll('g[transform]')) {
					const m = /^translate\(([-\d.e]+), 0\) rotate\(-/.exec(g.getAttribute('transform') ?? '');
					if (m) {
						opening = Number(m[1]);
						break;
					}
				}
			}
			frames.push({ t: performance.now() - t0, opening });
			requestAnimationFrame(loop);
		};
		loop();
	});
}

async function readCompassRecording(page: Page): Promise<CompassFrame[] | undefined> {
	return page.evaluate(() => (window as unknown as { __compass?: CompassFrame[] }).__compass);
}

/**
 * Rejoue la construction en lecture continue en notant le compas à chaque image.
 * Le serveur de dev peut recharger la page (dépendances) : l'enregistrement perdu → on recommence.
 */
async function recordPlay(page: Page): Promise<CompassFrame[]> {
	for (let attempt = 0; attempt < 3; attempt++) {
		await page.getByTitle('Recommencer').click();
		await startCompassRecording(page);
		await page.getByTitle('Lecture', { exact: true }).click();
		await expect(page.getByTitle('Pause')).toBeVisible();
		await expect(page.getByTitle('Lecture', { exact: true })).toBeVisible({ timeout: 60000 });
		const frames = await readCompassRecording(page);
		if (frames) return frames.filter((f) => f.opening !== null);
	}
	throw new Error('enregistrement du compas perdu trois fois (page rechargée ?)');
}

// ============================================================================
// PAGES ET DROITS : #1750, #1665/#1666, #1659/#1662, #1619
// ============================================================================

const PHONE = { width: 390, height: 844 };

/** Aucune barre de défilement horizontale sur la page */
async function noHorizontalScroll(page: Page): Promise<void> {
	const [scroll, client] = await page.evaluate(() => [
		document.documentElement.scrollWidth,
		document.documentElement.clientWidth
	]);
	expect(scroll, `défilement horizontal : ${scroll} > ${client}`).toBeLessThanOrEqual(client);
}

test.describe('pages et droits', () => {
	test('#1750 sans compte : carte sur /demo, trois constructions ouvertes sur la figure finie, « Jouer » rejoue, script replié', async ({
		page
	}) => {
		await page.goto('/demo');
		await page.waitForLoadState('networkidle');
		const carte = page.getByRole('link', { name: /Constructions à la règle et au compas/ });
		await expect(carte).toBeVisible();
		await expect(carte).toHaveAttribute('href', '/demo/constructions');
		// après la géométrie : la carte « Figures de géométrie » vient avant dans la page
		const ordre = await page
			.locator('a[href^="/demo/"]')
			.evaluateAll((liens) => liens.map((a) => a.getAttribute('href')));
		expect(ordre.indexOf('/demo/geometrie')).toBeGreaterThanOrEqual(0);
		expect(ordre.indexOf('/demo/geometrie')).toBeLessThan(ordre.indexOf('/demo/constructions'));

		await page.goto('/demo/constructions');
		await page.waitForLoadState('networkidle');
		const lecteurs = page.locator('.construction-player');
		await expect(lecteurs).toHaveCount(3);
		// Ouverte sur la figure finie : « Etape n / n »
		for (let i = 0; i < 3; i++) {
			const etape = await lecteurs
				.nth(i)
				.getByText(/Etape \d+ \/ \d+/)
				.innerText();
			const [, courante, total] = /Etape (\d+) \/ (\d+)/.exec(etape)!;
			expect(courante, `lecteur ${i + 1} ouvert sur la figure finie`).toBe(total);
		}
		const premier = lecteurs.first();
		const pointsFinale = await premier.locator('circle.point').count();
		expect(pointsFinale).toBeGreaterThan(3);
		// « Jouer » repart du début : la figure se vide, puis se refait
		await premier.getByTitle('Lecture', { exact: true }).click();
		await expect(premier.getByTitle('Pause')).toBeVisible();
		await expect
			.poll(async () => premier.locator('circle.point').count())
			.toBeLessThan(pointsFinale);
		// consignes sous la toile
		const toile = (await premier.locator('.construction-canvas').boundingBox())!;
		await expect(premier.getByTestId('consigne-auteur')).toBeVisible();
		const consigne = (await premier.getByTestId('consigne-auteur').boundingBox())!;
		expect(consigne.y).toBeGreaterThanOrEqual(toile.y + toile.height - 1);
		await premier.getByTitle('Pause').click();
		// « Voir le script » replié, puis ouvert
		const scripts = page.locator('details');
		await expect(scripts).toHaveCount(3);
		for (let i = 0; i < 3; i++) await expect(scripts.nth(i)).not.toHaveAttribute('open', '');
		await scripts.first().locator('summary', { hasText: 'Voir le script' }).click();
		await expect(scripts.first().locator('pre')).toContainText('point(');
	});

	test('#1750 sans compte, au téléphone : toile réduite, boutons lisibles, frise sur la ligne suivante', async ({
		page
	}) => {
		await page.setViewportSize(PHONE);
		await page.goto('/demo/constructions');
		await page.waitForLoadState('networkidle');
		const lecteur = page.locator('.construction-player').first();
		await expect(lecteur).toBeVisible();
		await noHorizontalScroll(page);
		const toile = (await lecteur.locator('.construction-canvas').boundingBox())!;
		expect(toile.width, 'toile réduite à l’écran').toBeLessThanOrEqual(PHONE.width);
		expect(toile.width).toBeLessThan(500);
		// boutons lisibles : dans l'écran, au moins 32 px
		for (const titre of ['Recommencer', 'Lecture', 'Etape suivante (instantane)']) {
			const box = (await lecteur.getByTitle(titre).boundingBox())!;
			expect(box.width, `bouton ${titre}`).toBeGreaterThanOrEqual(32);
			expect(box.x + box.width).toBeLessThanOrEqual(PHONE.width);
		}
		// la frise passe à la ligne : sa rangée n'est pas celle des boutons
		const boutons = (await lecteur.getByTitle('Lecture', { exact: true }).boundingBox())!;
		const frise = (await lecteur.getByRole('slider', { name: 'Timeline' }).boundingBox())!;
		expect(frise.y, 'la frise est sous les boutons').toBeGreaterThan(
			boutons.y + boutons.height - 1
		);
		await lecteur.scrollIntoViewIfNeeded();
		await page
			.locator('.construction-player')
			.first()
			.screenshot({
				path: `${SHOTS}/1750-vitrine-telephone.png`
			});
	});

	test('#1750/#1619 prof : « Essais » sur /constructions, éditeur, enregistrer puis supprimer un script', async ({
		page
	}) => {
		await login(page, TEACHER.email, TEACHER.password);
		await page.goto('/constructions');
		await page.waitForLoadState('networkidle');
		await page.getByRole('link', { name: 'Essais' }).click();
		await expect(page).toHaveURL(/\/constructions\/essais$/);
		await page.waitForLoadState('networkidle');
		await expect(page.locator('.cm-content')).toBeVisible();
		// les trois commandes sont là
		const nom = `Verifs3 essai ${RUN}`;
		await page.getByLabel('Nom du script').fill(nom);
		await page.getByRole('button', { name: 'Enregistrer' }).click();
		await expect
			.poll(
				async () =>
					(await sql('select id from construction_demo_scripts where name = $1', [nom])).length
			)
			.toBe(1);
		const supprimer = page.getByRole('button', { name: 'Passer à la trappe' });
		await expect(supprimer).toBeVisible();
		await supprimer.click();
		await expect
			.poll(
				async () =>
					(await sql('select id from construction_demo_scripts where name = $1', [nom])).length
			)
			.toBe(0);
		await expect(supprimer).toHaveCount(0);
	});

	test('#1750 prof : une construction publiée s’ouvre, commandes du lecteur rangées (grand écran puis téléphone)', async ({
		page
	}) => {
		await login(page, TEACHER.email, TEACHER.password);
		const [{ id }] = await sql<{ id: string }>(
			`select id from constructions where title = 'Symétrie axiale au compas'`
		);
		for (const taille of [{ width: 1280, height: 800 }, PHONE]) {
			await page.setViewportSize(taille);
			await page.goto(`/constructions/${id}`);
			await page.waitForLoadState('networkidle');
			await expect(page.getByRole('heading', { name: 'Symétrie axiale au compas' })).toBeVisible();
			const lecteur = page.locator('.construction-player');
			await expect(lecteur).toBeVisible();
			await noHorizontalScroll(page);
			for (const titre of ['Recommencer', 'Lecture', 'Etape suivante (instantane)']) {
				const box = (await lecteur.getByTitle(titre).boundingBox())!;
				expect(box.x, `bouton ${titre}`).toBeGreaterThanOrEqual(0);
				expect(box.x + box.width).toBeLessThanOrEqual(taille.width);
			}
			await page.screenshot({
				path: `${SHOTS}/1750-lecteur-${taille.width > 500 ? 'grand-ecran' : 'telephone'}.png`
			});
		}
	});

	test('#1750/#1619 élève, admin, sans compte : pas de bouton « Essais », /constructions/essais refusée, aucun champ d’enregistrement', async ({
		page,
		browser
	}) => {
		for (const compte of [STUDENT, ADMIN_ACCOUNT]) {
			await login(page, compte.email, compte.password);
			await page.goto('/constructions');
			await page.waitForLoadState('networkidle');
			await expect(page.getByRole('link', { name: 'Essais' })).toHaveCount(0);
			const reponse = await page.goto('/constructions/essais');
			expect(reponse?.status(), compte.email).toBe(403);
			await expect(page.getByLabel('Nom du script')).toHaveCount(0);
			await expect(page.getByRole('button', { name: 'Enregistrer' })).toHaveCount(0);
			await page.context().clearCookies();
		}
		// Sans être connecté : renvoyé à la connexion, aucun champ
		const anonyme = await browser.newContext();
		const pageAnonyme = await anonyme.newPage();
		await pageAnonyme.goto('/constructions/essais');
		await expect(pageAnonyme).not.toHaveURL(/\/constructions\/essais/);
		await expect(pageAnonyme.getByLabel('Nom du script')).toHaveCount(0);
		await anonyme.close();
	});

	test('#1750 prof : /construction-demo renvoie sur /constructions/essais', async ({ page }) => {
		await login(page, TEACHER.email, TEACHER.password);
		await page.goto('/construction-demo');
		await expect(page).toHaveURL(/\/constructions\/essais$/);
	});

	test('#1665/#1666 prof : Publiées et Brouillons, Modifier / Supprimer partout, dépublier fait passer en Brouillons', async ({
		page
	}) => {
		const titre = `Verifs3 construction ${RUN}`;
		await sql(
			`insert into constructions (title, format, script, dsl_script, is_public)
			 values ($1, 'dsl', '{}'::jsonb, 'A = point(0, 0)', true)`,
			[titre]
		);
		const [{ id }] = await sql<{ id: string }>('select id from constructions where title = $1', [
			titre
		]);
		const [{ publiees }] = await sql<{ publiees: string }>(
			'select count(*) as publiees from constructions where is_public'
		);
		const [{ brouillons }] = await sql<{ brouillons: string }>(
			'select count(*) as brouillons from constructions where not is_public'
		);
		await login(page, TEACHER.email, TEACHER.password);
		await page.goto('/constructions');
		await page.waitForLoadState('networkidle');
		await expect(
			page.getByRole('heading', { name: new RegExp(`^Publiées\\s*\\(${publiees}\\)`) })
		).toBeVisible();
		await expect(
			page.getByRole('heading', { name: new RegExp(`^Brouillons\\s*\\(${brouillons}\\)`) })
		).toBeVisible();
		const section = (nom: string): Locator =>
			page
				.locator('section')
				.filter({ has: page.getByRole('heading', { name: new RegExp(`^${nom}`) }) });
		await expect(
			section('Brouillons').locator('[data-slot="card"]', {
				hasText: 'Exercice de repérage de points'
			})
		).toBeVisible();
		// Modifier et Supprimer sur chaque carte, brouillon comme publiée
		for (const carte of [
			section('Brouillons').locator('[data-slot="card"]', {
				hasText: 'Exercice de repérage de points'
			}),
			section('Publiées').locator('[data-slot="card"]', { hasText: titre })
		]) {
			await carte.getByRole('button').first().click();
			await expect(page.getByRole('menuitem', { name: 'Modifier' })).toBeVisible();
			await expect(page.getByRole('menuitem', { name: 'Supprimer' })).toBeVisible();
			await page.keyboard.press('Escape');
		}
		// Dépublier : la construction passe en Brouillons
		await page.goto(`/constructions/${id}/edit`);
		await page.waitForLoadState('networkidle');
		await page.getByLabel('Rendre publique').uncheck();
		await page
			.getByRole('button', { name: /Enregistrer/ })
			.last()
			.click();
		await expect(page).toHaveURL(new RegExp(`/constructions/${id}$`));
		await page.goto('/constructions');
		await page.waitForLoadState('networkidle');
		await expect(
			section('Brouillons').locator('[data-slot="card"]', { hasText: titre })
		).toBeVisible();
		await expect(section('Publiées').locator('[data-slot="card"]', { hasText: titre })).toHaveCount(
			0
		);
		// Supprimer fonctionne aussi
		page.once('dialog', (dialog) => void dialog.accept());
		const carte = section('Brouillons').locator('[data-slot="card"]', { hasText: titre });
		await carte.getByRole('button').first().click();
		await page.getByRole('menuitem', { name: 'Supprimer' }).click();
		await expect(page.getByText(titre)).toHaveCount(0);
		expect(await sql('select id from constructions where title = $1', [titre])).toHaveLength(0);
	});

	test('#1665/#1666 élève et admin : seulement « Publiées », ni menu ni création, un brouillon tapé à la main → 404, l’API refuse', async ({
		page
	}) => {
		const [{ id }] = await sql<{ id: string }>(
			`select id from constructions where title = 'Exercice de repérage de points'`
		);
		for (const compte of [STUDENT, ADMIN_ACCOUNT]) {
			await login(page, compte.email, compte.password);
			await page.goto('/constructions');
			await page.waitForLoadState('networkidle');
			await expect(page.getByRole('heading', { name: /^Publiées/ })).toBeVisible();
			await expect(page.getByRole('heading', { name: /^Brouillons/ })).toHaveCount(0);
			await expect(page.getByText('Exercice de repérage de points')).toHaveCount(0);
			await expect(page.getByRole('link', { name: 'Nouvelle construction' })).toHaveCount(0);
			await expect(page.getByRole('link', { name: 'Importer XML' })).toHaveCount(0);
			// aucun menu d'actions sur les cartes
			await expect(page.locator('[data-slot="card"]').getByRole('button')).toHaveCount(0);
			const brouillon = await page.goto(`/constructions/${id}`);
			expect(brouillon?.status(), `brouillon pour ${compte.email}`).toBe(404);
			const creation = await page.request.post('/api/constructions', {
				data: { title: `Verifs3 refusée ${RUN}`, format: 'dsl', dsl_script: 'A = point(0, 0)' }
			});
			expect(creation.ok(), `création par ${compte.email}`).toBe(false);
			const script = await page.request.post('/api/construction-demo-scripts', {
				data: { name: `Verifs3 refusé ${RUN}`, dsl_script: 'A = point(0, 0)' }
			});
			expect(script.ok(), `script d'essai par ${compte.email}`).toBe(false);
			await page.context().clearCookies();
		}
		expect(
			await sql(`select id from constructions where title like 'Verifs3 refus%'`)
		).toHaveLength(0);
		expect(
			await sql(`select id from construction_demo_scripts where name like 'Verifs3 refus%'`)
		).toHaveLength(0);
	});

	test('#1659/#1662 (base locale) : constructions publiques, titres accentués, aucune ligne « Auteur », brouillon absent', async ({
		page
	}) => {
		await login(page, STUDENT.email, STUDENT.password);
		await page.goto('/constructions');
		await page.waitForLoadState('networkidle');
		const [{ n }] = await sql<{ n: string }>(
			`select count(*) as n from constructions where is_public and title not like 'Verifs3 %'`
		);
		await expect(page.locator('[data-slot="card"]')).toHaveCount(Number(n));
		for (const titre of [
			"Construction d'un parallélogramme",
			'Symétrie axiale au compas',
			"Partage d'un segment en trois parts égales"
		]) {
			await expect(page.locator('[data-slot="card"]', { hasText: titre })).toBeVisible();
		}
		await expect(page.getByText('Exercice de repérage de points')).toHaveCount(0);
		await expect(page.locator('main')).not.toContainText(/Auteur/i);
	});

	test('#1659/#1662 (base locale) : parallélogramme — le compas arrive presque fermé, s’ouvre jusqu’à B, puis reporte OB', async ({
		page
	}) => {
		test.setTimeout(150_000); // lecture continue : ~35 s de construction à vitesse normale
		await login(page, STUDENT.email, STUDENT.password);
		const [{ id }] = await sql<{ id: string }>(
			`select id from constructions where title = 'Construction d''un parallélogramme'`
		);
		await page.goto(`/constructions/${id}`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: /parallélogramme/ })).toBeVisible();
		await toEnd(page);
		const fin = await readState(page);
		const o = pointAt(fin, 'O');
		const b = pointAt(fin, 'B');
		const ob = Math.hypot(b.x - o.x, b.y - o.y);
		const frames = await recordPlay(page);
		expect(frames.length, 'le compas est apparu').toBeGreaterThan(5);
		const ouvertures = frames.map((f) => f.opening!);
		expect(ouvertures[0], 'le compas arrive presque fermé').toBeLessThan(ob * 0.2);
		const maximum = Math.max(...ouvertures);
		near(maximum, ob, ob * 0.05); // il s'ouvre jusqu'à OB, pas au-delà
		expect(ouvertures.indexOf(maximum)).toBeGreaterThan(0);
		// puis il garde cette ouverture pour reporter OB de l'autre côté de O
		const apres = ouvertures.slice(ouvertures.indexOf(maximum));
		expect(apres.filter((x) => Math.abs(x - ob) <= ob * 0.05).length).toBeGreaterThan(5);
		await page.screenshot({ path: `${SHOTS}/1659-parallelogramme-figure-finie.png` });
	});

	test('#1659/#1662 (base locale) : partage en trois et symétrie axiale — I, J, K reportés, deux arcs, M′ au croisement', async ({
		page
	}) => {
		await login(page, STUDENT.email, STUDENT.password);
		const lire = async (titre: string): Promise<State> => {
			const [{ id }] = await sql<{ id: string }>('select id from constructions where title = $1', [
				titre
			]);
			await page.goto(`/constructions/${id}`);
			await page.waitForLoadState('networkidle');
			await expect(page.locator('.construction-player')).toBeVisible();
			await toEnd(page);
			return readState(page);
		};
		const partage = await lire("Partage d'un segment en trois parts égales");
		for (const lettre of ['I', 'J', 'K', 'M', 'N']) {
			expect(partage.labels, `point ${lettre} du partage`).toContain(lettre);
		}
		expect(partage.paths.filter((p) => p.startsWith('arc')).length).toBeGreaterThanOrEqual(3);
		expect(partage.lines.filter((l) => l.startsWith('segment-mark'))).toHaveLength(3); // AM, MN, NB
		await page.screenshot({ path: `${SHOTS}/1659-partage-figure-finie.png` });
		const symetrie = await lire('Symétrie axiale au compas');
		expect(symetrie.paths.filter((p) => p.startsWith('arc')).length).toBeGreaterThanOrEqual(2);
		const m = pointAt(symetrie, 'M');
		expect(m).toBeDefined();
		expect(symetrie.lines.filter((l) => l.startsWith('segment-mark'))).toHaveLength(4); // MH, HM′
		await page.screenshot({ path: `${SHOTS}/1659-symetrie-figure-finie.png` });
	});

	test('#1659/#1662 : médiatrice @euclide — le compas s’ouvre à sa première apparition', async ({
		page
	}) => {
		await login(page, TEACHER.email, TEACHER.password);
		await typeScript(page, [
			'A = point(-3, 0)',
			'B = point(3, 1)',
			'd = mediatrice(A, B) @euclide'
		]);
		const frames = await recordPlay(page);
		expect(frames.length, 'le compas est apparu').toBeGreaterThan(3);
		const ouvertures = frames.map((f) => f.opening!);
		const ab = 6 * 40;
		expect(ouvertures[0], 'à sa première apparition, le compas est fermé').toBeLessThan(ab * 0.25);
		expect(Math.max(...ouvertures), 'puis il s’ouvre').toBeGreaterThan(ab * 0.5);
	});
});
