import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { templateMarkdown } from '../../src/lib/ubumark/index';
import {
	ADMIN,
	assertLocalServerEnv,
	login,
	sql,
	TEACHER,
	withFirstVersion
} from './helpers/carnet';
import {
	createWorksheet,
	pdfFonts,
	pdfRuns,
	pdfText,
	pdfToPng,
	STYLE_IDS,
	teacherPdf,
	TEACHER_ID
} from './helpers/fiches';
import { expectNoHorizontalOverflow, gotoSettled } from './helpers/pages';

/**
 * Blocs de géométrie et de probabilités, paquet 5 (tri des vérifications manuelles)
 * =================================================================================
 *
 * Reprend les lignes #2356, #2347, #2339, #2331, #2400 (solides), #2309, #2294, #2328 (droite
 * graduée), #2274, #2304/#2306, #2296 (repère `courbe`) et #2398 (arbre pondéré) de
 * `docs/wip/verifications-manuelles.md`.
 *
 * Décor : les pages d'aide `/aide-ecriture/blocs/*` (prof) pour les exemples, des modèles brouillons
 * « Verifs5 … » (créés par l'API, effacés en `afterEach`) ouverts dans l'aperçu admin pour les gestes
 * et les corrections, les modèles PUBLIÉS de la base locale (copie de la prod) pour #2328, #2304,
 * #2306 et #2296 : l'aperçu choisit la variation d'après la graine (champ « Seed »), on cherche donc
 * une graine dont l'énoncé convient. Une fiche « Verifs5 … » donne les PDF (lus par poppler).
 *
 * Gestes : souris sur l'ordinateur, `tap()` sur iPhone et Android. Les mesures « se touche-t-il au
 * doigt » sont des tailles à l'écran (rayon de la zone qui reçoit le toucher, écart entre points),
 * jugées avec les captures `.captures/verifs/blocs-paquet5/`.
 */

test.skip(process.env.VERIFS_URL !== undefined, 'serveur de dev et base locale seulement');
test.beforeAll(() => assertLocalServerEnv());
test.beforeEach(() => test.setTimeout(180_000));

// Constantes

const SHOTS = '.captures/verifs/blocs-paquet5';
const SOLIDE_PATH = '/aide-ecriture/blocs/solide';
const LINE_PATH = '/aide-ecriture/blocs/droite-graduee';
/** Marges fixes de la droite graduée (`NL_LAYOUT` de `number-line-render.ts`) */
const NL_MARGIN = 40;
/** Cadre d'un repère `courbe` de taille moyenne, marge comprise (`courbe-scene.ts`) */
const COURBE = { pad: 26, width: 400, height: 300 };
const MODELS = {
	inequation: '06601c87-7abb-4a3d-a0fc-750d61760faa',
	lireVecteur: '22e8272e-9139-4f0d-8b87-6ea1be635ad9',
	tracerVecteur: 'dd286c93-c5f2-4938-92d8-c27855745c79',
	droiteReduite: '8d4bd94d-73f7-4589-8b3f-67c84edcf778',
	droiteCartesienne: '2cfae58d-7fdb-45f7-8ea1-777a4a307b5a',
	probabilitesTotales: 'ecf4d46b-02d5-4fd1-86db-eac7b017a257'
};

// Types

interface Spot {
	x: number;
	y: number;
}
interface Win {
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
}
interface Instance {
	statement: string;
	vars: Record<string, string>;
}

// Décor : les modèles brouillons créés, effacés après chaque test

let createdIds: string[] = [];
test.afterEach(async () => {
	if (createdIds.length > 0) {
		await sql(`delete from question_templates where id = any($1::uuid[])`, [createdIds]);
	}
	createdIds = [];
});
test.afterAll(async () => {
	// Seulement les brouillons de CE worker : un autre worker en a en cours (même projet ou non)
	await sql(`delete from question_templates where title like $1`, [`${draftPrefix()} %`]);
});

// Fonctions

/** Préfixe des titres de brouillons de ce worker : projet + numéro de worker (jamais effacés par un autre) */
const draftPrefix = (): string =>
	`Verifs5 ${test.info().project.name} w${test.info().parallelIndex}`;
const isTouch = (): boolean => test.info().project.use.hasTouch === true;
const projectName = (): string => test.info().project.name;
const fence = (name: string, ...lines: string[]): string =>
	['```' + name, ...lines, '```'].join('\n');

/** Toucher (téléphone) ou cliquer (ordinateur) */
async function press(locator: Locator): Promise<void> {
	await locator.scrollIntoViewIfNeeded();
	if (isTouch()) await locator.tap();
	else await locator.click();
}

async function pressAt(target: Locator, position: Spot): Promise<void> {
	if (isTouch()) await target.tap({ position });
	else await target.click({ position });
}

/** Amène le lieu à l'écran (le serveur de dev peut recharger la page : on rejoue une fois) */
async function scrollTo(locator: Locator): Promise<void> {
	try {
		await locator.scrollIntoViewIfNeeded();
	} catch {
		await locator.page().waitForLoadState('networkidle');
		await locator.scrollIntoViewIfNeeded();
	}
}

/** Capture la page en clair puis en sombre : `<nom>-clair|sombre-<projet>.png` */
async function shootThemes(page: Page, target: Locator, name: string): Promise<void> {
	await mkdir(SHOTS, { recursive: true });
	for (const theme of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme: theme });
		await page.waitForFunction(
			(dark) => document.documentElement.classList.contains('dark') === dark,
			theme === 'dark'
		);
		await target.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => undefined);
		await page.screenshot({
			path: `${SHOTS}/${name}-${theme === 'dark' ? 'sombre' : 'clair'}-${projectName()}.png`
		});
	}
	await page.emulateMedia({ colorScheme: 'light' });
}

/** Ouvre l'aperçu d'un modèle (admin) */
async function openModel(page: Page, id: string): Promise<void> {
	await page.goto(`/dashboard/admin/questions/${id}/preview`);
	await page.waitForLoadState('networkidle');
}

/** Un modèle brouillon (admin) dont l'énoncé est `statement` ; ouvre son aperçu. `plain` : sans geste, une case bidon */
async function openPreview(
	page: Page,
	title: string,
	statement: string,
	options: { plain?: boolean } = {}
): Promise<string> {
	// Déjà connecté (un test ouvre d'abord une page en prof) : la page de connexion renverrait ailleurs
	await page.context().clearCookies();
	await login(page, ADMIN.email, ADMIN.password);
	const plain = options.plain === true;
	const response = await page.request.post('/api/questions/templates', {
		data: {
			type: 'fill_in_blanks',
			title: `${draftPrefix()} ${title}`,
			grades: ['T_SPE'],
			level: 2,
			status: 'draft',
			delay: 60,
			variations: [
				{
					statement: templateMarkdown(plain ? `${statement}\n\nMot : [_]` : statement),
					...(plain ? { blanks: [{ expectedAnswer: 'x' }] } : {})
				}
			]
		}
	});
	const body = (await response.json()) as { template?: { id: string } };
	expect(response.status(), JSON.stringify(body)).toBe(201);
	const id = body.template?.id ?? '';
	expect(id).not.toBe('');
	createdIds.push(id);
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			await page.goto(`/dashboard/admin/questions/${id}/preview`);
			break;
		} catch (error) {
			if (!String(error).includes('ERR_ABORTED') || attempt === 2) throw error;
			await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
		}
	}
	await page.waitForLoadState('networkidle');
	return id;
}

/** L'instance (énoncé, variables) qu'un modèle donne pour une graine */
async function generate(page: Page, id: string, seed: number): Promise<Instance> {
	const response = await page.request.post(`/api/questions/generate/${id}`, { data: { seed } });
	const body = (await response.json()) as {
		success: boolean;
		instance?: {
			statement: string;
			resolvedVariables?: Array<{ name: string; value: string }>;
		};
	};
	if (!body.success || !body.instance) return { statement: '', vars: {} };
	return {
		statement: body.instance.statement,
		vars: Object.fromEntries((body.instance.resolvedVariables ?? []).map((v) => [v.name, v.value]))
	};
}

/** Première graine dont l'énoncé convient (l'aperçu choisit la variation par la graine) */
async function findSeed(
	page: Page,
	id: string,
	matches: (instance: Instance) => boolean
): Promise<{ seed: number; instance: Instance }> {
	for (let seed = 1; seed <= 200; seed++) {
		const instance = await generate(page, id, seed);
		if (matches(instance)) return { seed, instance };
	}
	throw new Error(`aucune graine ne convient pour le modèle ${id}`);
}

/** Rouvre l'aperçu d'un modèle sur cette graine (champ « Seed » puis « Générer ») */
async function openSeeded(page: Page, id: string, seed: number): Promise<void> {
	await openModel(page, id);
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

async function validate(page: Page): Promise<void> {
	const button = page.getByRole('button', { name: 'Valider' });
	await button.scrollIntoViewIfNeeded();
	await expect(button).toBeEnabled();
	await button.click();
}

/** Le texte de l'aperçu (la carte de la question et sa remarque), espaces réduits */
async function previewText(page: Page): Promise<string> {
	return ((await page.locator('#contenu-principal').innerText()) ?? '').replace(/\s+/g, ' ');
}

/** Ouvre la page d'aide d'un bloc, en prof, une fois la page hydratée */
async function openBloc(page: Page, path: string): Promise<void> {
	await page.context().clearCookies();
	await login(page, TEACHER.email, TEACHER.password);
	await gotoSettled(page, path);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await page.waitForLoadState('networkidle');
}

/** Le rendu de l'exemple (à droite du texte) de ce titre, dans la page d'aide */
function rendered(page: Page, title: string): Locator {
	return page
		.locator('article', { has: page.getByRole('heading', { name: title, exact: true }) })
		.first()
		.locator('div.min-w-0')
		.first();
}

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

// ----------------------------------------------------------------------------
// Mesures de dessins vectoriels (solides)
// ----------------------------------------------------------------------------

/** La figure visible de ce nom de classe (l'aperçu en rend plusieurs : fiche du modèle, carte…) */
const visibleSvg = (page: Page, cls: string): Locator => page.locator(`svg.${cls}:visible`).first();

interface Measure {
	/** Étiquettes dont le cadre touche un trait */
	onStrokes: string[];
	/** Paires d'étiquettes dont les cadres se recouvrent */
	overlaps: string[];
	/** Corps le plus petit d'une étiquette, en px à l'écran */
	minFontPx: number;
}

/** Les étiquettes d'un solide qui touchent un trait ou une autre étiquette, et leur taille à l'écran */
async function measureLabels(drawing: Locator, ignore: string[] = []): Promise<Measure> {
	return drawing.evaluate((svg, skip) => {
		type Pt = { x: number; y: number };
		const toScreen = (el: SVGGraphicsElement, x: number, y: number): Pt => {
			const m = el.getScreenCTM();
			return m ? { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f } : { x, y };
		};
		const segments: Array<[Pt, Pt]> = [];
		for (const el of svg.querySelectorAll('polyline')) {
			const g = el as unknown as SVGPolylineElement;
			const pts = [...g.points].map((p) => toScreen(g, p.x, p.y));
			for (let i = 0; i + 1 < pts.length; i++) segments.push([pts[i], pts[i + 1]]);
		}
		for (const el of svg.querySelectorAll('line')) {
			const g = el as SVGLineElement;
			segments.push([
				toScreen(g, g.x1.baseVal.value, g.y1.baseVal.value),
				toScreen(g, g.x2.baseVal.value, g.y2.baseVal.value)
			]);
		}
		const hits = (a: Pt, b: Pt, r: { l: number; t: number; rr: number; bb: number }) => {
			let t0 = 0;
			let t1 = 1;
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const checks: Array<[number, number]> = [
				[-dx, a.x - r.l],
				[dx, r.rr - a.x],
				[-dy, a.y - r.t],
				[dy, r.bb - a.y]
			];
			for (const [p, q] of checks) {
				if (p === 0) {
					if (q < 0) return false;
				} else {
					const t = q / p;
					if (p < 0) t0 = Math.max(t0, t);
					else t1 = Math.min(t1, t);
				}
			}
			return t0 <= t1;
		};
		const boxes: Array<{ label: string; l: number; t: number; rr: number; bb: number }> = [];
		const onStrokes: string[] = [];
		let minFontPx = Infinity;
		const scale = svg.getBoundingClientRect().width / (svg as SVGSVGElement).viewBox.baseVal.width;
		for (const text of svg.querySelectorAll('text')) {
			const label = (text.textContent ?? '').trim();
			if (label === '') continue;
			const box = text.getBoundingClientRect();
			const inner = {
				l: box.left + 1.5,
				t: box.top + 1.5,
				rr: box.right - 1.5,
				bb: box.bottom - 1.5
			};
			boxes.push({ label, ...inner });
			if (!skip.includes(label) && segments.some(([a, b]) => hits(a, b, inner))) {
				onStrokes.push(label);
			}
			minFontPx = Math.min(minFontPx, parseFloat(text.getAttribute('font-size') ?? '0') * scale);
		}
		const overlaps: string[] = [];
		for (let i = 0; i < boxes.length; i++) {
			for (let j = i + 1; j < boxes.length; j++) {
				const a = boxes[i];
				const b = boxes[j];
				if (a.l < b.rr && b.l < a.rr && a.t < b.bb && b.t < a.bb) {
					overlaps.push(`${a.label}/${b.label}`);
				}
			}
		}
		return { onStrokes, overlaps, minFontPx };
	}, ignore);
}

/** Centre des étiquettes d'un solide par texte, en px de la fenêtre */
async function labelCenters(drawing: Locator): Promise<Record<string, Spot>> {
	return drawing.evaluate((svg) => {
		const out: Record<string, Spot> = {};
		for (const text of svg.querySelectorAll('text')) {
			const box = text.getBoundingClientRect();
			out[(text.textContent ?? '').trim()] = {
				x: box.x + box.width / 2,
				y: box.y + box.height / 2
			};
		}
		return out;
	});
}

// ============================================================================
// Solides : #2356, #2347, #2339, #2331, #2400
// ============================================================================

test('#2356 — « w1 = AB, u = AE » : w₁ (1 plus petit, abaissé) sous sa petite flèche, u inchangé', async ({
	page
}) => {
	await openPreview(
		page,
		'2356 indice',
		`Voici le cube.\n\n${fence('solide', 'forme: cube 3', 'sommets: A B C D E F G H', 'vecteurs: w1 = AB, u = AE')}`,
		{ plain: true }
	);
	const drawing = visibleSvg(page, 'solide-figure');
	await expect(drawing).toBeVisible({ timeout: 30_000 });
	await drawing.scrollIntoViewIfNeeded();
	const parts = await drawing.evaluate((svg) => {
		const read = (name: string) => {
			const text = [...svg.querySelectorAll('text')].find((t) =>
				(t.firstChild?.textContent ?? '').trim().startsWith(name)
			);
			if (!text) return null;
			const sub = text.querySelector('tspan');
			return {
				content: (text.textContent ?? '').trim(),
				size: parseFloat(text.getAttribute('font-size') ?? '0'),
				sub:
					sub === null
						? null
						: {
								content: (sub.textContent ?? '').trim(),
								size: parseFloat(sub.getAttribute('font-size') ?? '0'),
								dy: parseFloat(sub.getAttribute('dy') ?? '0')
							}
			};
		};
		return { w: read('w'), u: read('u') };
	});
	expect(parts.w, 'étiquette w').not.toBeNull();
	expect(parts.w?.sub?.content, 'w a un indice « 1 »').toBe('1');
	expect(parts.w?.sub?.size, '1 plus petit que w').toBeLessThan(parts.w?.size ?? 0);
	expect(parts.w?.sub?.dy, '1 abaissé').toBeGreaterThan(0);
	expect(parts.u?.content, 'u sans indice').toBe('u');
	expect(parts.u?.sub, 'u sans indice').toBeNull();
	// Un vecteur nommé = sa flèche + la petite flèche posée sur son nom : 2 vecteurs, 4 pointes
	await expect(drawing.locator('polygon.solide-pointe')).toHaveCount(4);
	await shootThemes(page, drawing, '2356-indice');
});

test('#2347 — combinaison en fractions : u, v, w dessinés et nommés sur le tétraèdre, G touchable ; réponse fausse : « Ta flèche représente …, pas 1/3 u + 1/3 v + 1/3 w »', async ({
	page
}) => {
	await openBloc(page, SOLIDE_PATH);
	const drawing = rendered(page, 'Une combinaison de vecteurs donnés')
		.locator('svg.solide-figure')
		.first();
	await scrollTo(drawing);
	// 3 vecteurs nommés = 3 flèches + 3 petites flèches sur les noms
	await expect(drawing.locator('polygon.solide-pointe')).toHaveCount(6);
	const centers = await labelCenters(drawing);
	for (const name of ['u', 'v', 'w', 'S', 'A', 'B', 'C', 'G']) {
		expect(centers[name], `étiquette ${name}`).toBeDefined();
	}
	const measure = await measureLabels(drawing);
	expect(measure.onStrokes, 'étiquettes sur un trait').toEqual([]);
	expect(measure.overlaps, 'étiquettes qui se recouvrent').toEqual([]);

	// Dans une question : G se touche, un autre sommet donne la phrase de correction
	await openPreview(
		page,
		'2347 combinaison',
		`Trace le vecteur.\n\n${fence(
			'solide',
			'forme: pyramide triangle 4 3',
			'sommets: S A B C',
			'points: G centre ABC',
			'vecteurs: u = SA, v = SB, w = SC',
			'tracer: vecteur 1/3 u + 1/3 v + 1/3 w depuis S'
		)}`
	);
	const figure = visibleSvg(page, 'solide-figure');
	await expect(figure).toBeVisible({ timeout: 30_000 });
	await expect(figure.locator('circle.solide-cliquable[aria-label="Point G"]')).toHaveCount(1);
	await press(figure.locator('circle.solide-cliquable[aria-label="Point B"]'));
	await expect(figure.locator('.solide-fleche-eleve')).toHaveCount(1);
	await validate(page);
	await expect(page.locator('.solide-faux').first()).toBeVisible();
	const sentence = page.locator('.solide-geste p.text-sm').first();
	await expect(sentence).toContainText('Ta flèche représente');
	await expect(sentence).toContainText('pas');
	// La combinaison est une formule à part : fractions et flèches sur u, v, w (pas du texte brut)
	const formulas = sentence.locator('math-span');
	await expect(formulas).toHaveCount(2);
	await expect(formulas.nth(1)).toContainText(
		'\\frac{1}{3}\\vec{u}+\\frac{1}{3}\\vec{v}+\\frac{1}{3}\\vec{w}'
	);
	const box = await formulas.nth(1).boundingBox();
	expect(box?.width ?? 0, 'formule dessinée').toBeGreaterThan(20);
	const html = await sentence.innerHTML();
	console.log(
		`#2347 ${projectName()} : phrase = « ${(await sentence.innerText()).replace(/\s+/g, ' ')} »`
	);
	console.log(`#2347 ${projectName()} : html = ${html.slice(0, 1200)}`);
	await shootThemes(page, sentence, '2347-phrase');
	await expect(page.locator('.solide-correction .solide-fleche-juste')).toHaveCount(1);
});

const VECTOR_ORIGIN_FIXED = fence(
	'solide',
	'forme: cube 3',
	'sommets: A B C D E F G H',
	'points: I milieu CG',
	'tracer: vecteur AB + AD + 1/2 AE depuis A'
);
const VECTOR_ORIGIN_FREE = fence(
	'solide',
	'forme: cube 3',
	'sommets: A B C D E F G H',
	'tracer: vecteur AB + AD'
);

/** La zone de toucher d'un point d'un solide à geste */
const solidePoint = (drawing: Locator, name: string): Locator =>
	drawing.locator(`circle.solide-cliquable[aria-label^="Point ${name}"]`);

test('#2339 — origine imposée : A en petit disque bleu, toucher I trace la flèche bleue (pointe visible, rien dessus) ; juste → vert', async ({
	page
}) => {
	await openPreview(page, '2339 imposee', `Trace le vecteur.\n\n${VECTOR_ORIGIN_FIXED}`);
	const drawing = visibleSvg(page, 'solide-figure');
	await expect(drawing).toBeVisible({ timeout: 30_000 });
	await drawing.scrollIntoViewIfNeeded();
	// A posée d'office : un disque bleu, sans bouton à toucher ni bouton « Origine »
	const origin = drawing.locator('circle.solide-origine');
	await expect(origin).toHaveCount(1);
	await expect(page.getByRole('button', { name: 'Origine', exact: true })).toHaveCount(0);
	const disc = await origin.evaluate((el) => {
		const style = getComputedStyle(el);
		return { diameter: el.getBoundingClientRect().width, fill: style.fill };
	});
	expect(disc.diameter, 'disque de A (px)').toBeGreaterThanOrEqual(4);
	expect(disc.diameter, 'petit disque (px)').toBeLessThanOrEqual(20);
	expect(disc.fill, 'disque bleu').toBe(await tokenColor(page, '--color-fig-bleu'));
	console.log(`#2339 ${projectName()} : disque de A ${disc.diameter.toFixed(1)} px`);
	await press(solidePoint(drawing, 'I'));
	const arrow = drawing.locator('.solide-fleche-eleve');
	await expect(arrow).toHaveCount(1);
	// La flèche est dessinée APRÈS tous les disques : sa pointe n'est cachée par rien
	const order = await drawing.evaluate((svg) => {
		const all = [...svg.children];
		const arrowIndex = all.findIndex((el) => el.classList.contains('solide-fleche-eleve'));
		const lastDisc = all.reduce((last, el, i) => (el.tagName === 'circle' ? i : last), -1);
		const head = svg.querySelector('.solide-fleche-eleve polygon')?.getBoundingClientRect();
		return { arrowIndex, lastDisc, headSize: Math.max(head?.width ?? 0, head?.height ?? 0) };
	});
	expect(order.arrowIndex, 'flèche au-dessus des disques').toBeGreaterThan(order.lastDisc);
	expect(order.headSize, 'pointe lisible (px)').toBeGreaterThanOrEqual(6);
	const stroke = await arrow.locator('line').evaluate((el) => getComputedStyle(el).stroke);
	expect(stroke, 'flèche bleue').toBe(await tokenColor(page, '--color-fig-bleu'));
	await shootThemes(page, drawing, '2339-imposee');
	await validate(page);
	await expect(page.locator('.solide-juste').first()).toBeVisible();
	await expect(page.locator('.solide-geste p.text-sm')).toHaveCount(0);
});

test('#2339 — origine imposée, réponse fausse : la phrase et la flèche juste en vert', async ({
	page
}) => {
	await openPreview(page, '2339 fausse', `Trace le vecteur.\n\n${VECTOR_ORIGIN_FIXED}`);
	const drawing = visibleSvg(page, 'solide-figure');
	await expect(drawing).toBeVisible({ timeout: 30_000 });
	await press(solidePoint(drawing, 'C'));
	await validate(page);
	await expect(page.locator('.solide-faux').first()).toBeVisible();
	await expect(page.locator('.solide-geste p.text-sm').first()).toContainText('Ta flèche');
	const green = page.locator('.solide-correction .solide-fleche-juste').first();
	await expect(green).toBeVisible();
	const stroke = await green.locator('line').evaluate((el) => getComputedStyle(el).stroke);
	expect(stroke, 'flèche juste en vert').toBe(await tokenColor(page, '--color-fig-vert'));
	await shootThemes(page, green, '2339-fausse');
});

test('#2339 — origine libre : Origine puis Extrémité, E puis G est juste (comme A puis C)', async ({
	page
}) => {
	await openPreview(page, '2339 libre', `Trace le vecteur.\n\n${VECTOR_ORIGIN_FREE}`);
	const drawing = visibleSvg(page, 'solide-figure');
	await expect(drawing).toBeVisible({ timeout: 30_000 });
	await drawing.scrollIntoViewIfNeeded();
	await expect(page.getByRole('button', { name: 'Origine', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await press(solidePoint(drawing, 'E'));
	await press(solidePoint(drawing, 'G'));
	await expect(drawing.locator('.solide-fleche-eleve')).toHaveCount(1);
	await validate(page);
	await expect(page.locator('.solide-juste').first()).toBeVisible();
});

test('#2339 — pavé aplati : chaque point reçoit le toucher à son centre, zones de toucher sans chevauchement (mesures en px)', async ({
	page
}) => {
	await openPreview(
		page,
		'2339 plat',
		`Trace le vecteur.\n\n${fence('solide', 'forme: pave 4 3 0.5', 'sommets: A B C D E F G H', 'tracer: vecteur AB')}`
	);
	const drawing = visibleSvg(page, 'solide-figure');
	await expect(drawing).toBeVisible({ timeout: 30_000 });
	await drawing.scrollIntoViewIfNeeded();
	const zones = await drawing.evaluate((svg) =>
		[...svg.querySelectorAll('circle.solide-cliquable')].map((el) => {
			const box = el.getBoundingClientRect();
			return {
				name: (el.getAttribute('aria-label') ?? '').replace('Point ', ''),
				x: box.x + box.width / 2,
				y: box.y + box.height / 2,
				radius: box.width / 2
			};
		})
	);
	expect(zones.length, 'huit sommets').toBe(8);
	const radius = Math.min(...zones.map((z) => z.radius));
	let closest = Infinity;
	for (let i = 0; i < zones.length; i++) {
		for (let j = i + 1; j < zones.length; j++) {
			closest = Math.min(closest, Math.hypot(zones[i].x - zones[j].x, zones[i].y - zones[j].y));
		}
	}
	console.log(
		`#2339 ${projectName()} : pavé aplati, plus petit rayon de toucher ${radius.toFixed(1)} px, points les plus proches à ${closest.toFixed(1)} px`
	);
	expect(radius * 2, 'zones sans chevauchement').toBeLessThanOrEqual(closest + 0.5);
	for (const zone of zones) {
		const hit = await page.evaluate(
			({ x, y }) => document.elementFromPoint(x, y)?.getAttribute('aria-label') ?? '',
			{ x: zone.x, y: zone.y }
		);
		expect(hit, `toucher au centre de ${zone.name}`).toBe(`Point ${zone.name}`);
	}
	await shootThemes(page, drawing, '2339-plat');
});

test('#2331 — « Des vecteurs sur un cube » : flèches à pointe pleine, I pointé et nommé, u, v, w près de leur flèche sans toucher un trait ni un nom', async ({
	page
}, info) => {
	await openBloc(page, SOLIDE_PATH);
	const drawing = rendered(page, 'Des vecteurs sur un cube').locator('svg.solide-figure').first();
	await scrollTo(drawing);
	// 3 vecteurs nommés = 3 flèches + 3 petites flèches sur les noms
	await expect(drawing.locator('polygon.solide-pointe')).toHaveCount(6);
	const fills = await drawing
		.locator('polygon.solide-pointe')
		.evaluateAll((els) => els.map((el) => getComputedStyle(el).fill));
	for (const fill of fills) expect(fill, 'pointe pleine').not.toBe('none');
	const centers = await labelCenters(drawing);
	for (const name of ['I', 'u', 'v', 'w']) expect(centers[name], `étiquette ${name}`).toBeDefined();
	await expect(drawing.locator('circle.solide-point')).toHaveCount(1);
	const measure = await measureLabels(drawing);
	expect(measure.onStrokes, 'étiquettes sur un trait').toEqual([]);
	expect(measure.overlaps, 'étiquettes qui se recouvrent').toEqual([]);
	// Chaque nom est près d'une flèche (distance du nom à la pointe la plus proche, px)
	const nearest = await drawing.evaluate((svg) => {
		const mid = (el: Element) => {
			const box = el.getBoundingClientRect();
			return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
		};
		const arrows = [...svg.querySelectorAll('polygon.solide-pointe')].map(mid);
		const out: Record<string, number> = {};
		for (const text of svg.querySelectorAll('text')) {
			const name = (text.textContent ?? '').trim();
			if (!['u', 'v', 'w'].includes(name)) continue;
			const c = mid(text);
			out[name] = Math.min(...arrows.map((a) => Math.hypot(a.x - c.x, a.y - c.y)));
		}
		return out;
	});
	for (const name of ['u', 'v', 'w']) {
		expect(nearest[name], `${name} près d'une flèche (px)`).toBeLessThan(130);
	}
	console.log(
		`#2331 ${info.project.name} : taille des noms ${measure.minFontPx.toFixed(1)} px ; distances nom-pointe ${JSON.stringify(nearest)}`
	);
	await shootThemes(page, drawing, '2331-cube');
	const tetra = rendered(page, 'Le centre d’une face d’un tétraèdre')
		.locator('svg.solide-figure')
		.first();
	await scrollTo(tetra);
	const tetraMeasure = await measureLabels(tetra);
	expect(tetraMeasure.onStrokes, 'tétraèdre : étiquettes sur un trait').toEqual([]);
	expect(tetraMeasure.overlaps, 'tétraèdre : étiquettes qui se recouvrent').toEqual([]);
	await expect(tetra.locator('polygon.solide-pointe')).toHaveCount(1);
	expect((await labelCenters(tetra)).G, 'G nommé').toBeDefined();
	await shootThemes(page, tetra, '2331-tetra');
});

test('#2400 — tétraèdre S A B C : B devant, seule AC en tirets, G, I et sommets séparés, « 4 cm » sous [BC] sans trait dessus', async ({
	page
}) => {
	await openPreview(
		page,
		'2400 tetraedre',
		`Voici le tétraèdre.\n\n${fence(
			'solide',
			'forme: pyramide triangle 4 3.27',
			'sommets: S A B C',
			'points: G centre ABC, I milieu BC',
			'cotes: cm'
		)}`,
		{ plain: true }
	);
	const drawing = visibleSvg(page, 'solide-figure');
	await expect(drawing).toBeVisible({ timeout: 30_000 });
	await drawing.scrollIntoViewIfNeeded();
	const geometry = await drawing.evaluate((svg) => {
		const toScreen = (el: SVGGraphicsElement, x: number, y: number) => {
			const m = el.getScreenCTM() as DOMMatrix;
			return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
		};
		const labels: Record<string, { x: number; y: number }> = {};
		for (const text of svg.querySelectorAll('text')) {
			const box = text.getBoundingClientRect();
			labels[(text.textContent ?? '').trim()] = {
				x: box.x + box.width / 2,
				y: box.y + box.height / 2
			};
		}
		const ends = (selector: string) =>
			[...svg.querySelectorAll(selector)].map((el) => {
				const g = el as unknown as SVGPolylineElement;
				const pts = [...g.points].map((p) => toScreen(g, p.x, p.y));
				return [pts[0], pts[pts.length - 1]];
			});
		// Points posés (G, I) : la cote de la hauteur en tirets s'arrête sur G, ce n'est pas une arête
		const dots = [...svg.querySelectorAll('circle.solide-point')].map((el) => {
			const box = el.getBoundingClientRect();
			return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
		});
		return {
			labels,
			dots,
			dashed: ends('polyline.solide-cache').filter(
				(seg) => !seg.some((p) => dots.some((d) => Math.hypot(d.x - p.x, d.y - p.y) < 3))
			),
			solid: ends('polyline.solide-trait:not(.solide-cache)')
		};
	});
	const { labels } = geometry;
	const vertex = (p: { x: number; y: number }) =>
		['S', 'A', 'B', 'C'].reduce((best, name) =>
			Math.hypot(labels[name].x - p.x, labels[name].y - p.y) <
			Math.hypot(labels[best].x - p.x, labels[best].y - p.y)
				? name
				: best
		);
	// Arêtes en tirets (la cote de la hauteur est aussi en tirets, mais ne relie pas deux sommets distincts)
	const hiddenEdges = geometry.dashed
		.map(([a, b]) => [vertex(a), vertex(b)].sort().join(''))
		.filter((edge) => edge[0] !== edge[1]);
	expect(hiddenEdges, 'AC en tirets').toContain('AC');
	expect(
		hiddenEdges.filter((edge) => edge !== 'AC'),
		'aucune autre arête en tirets (hors cote de la hauteur)'
	).toEqual([]);
	// B est devant : le plus bas des quatre sommets, entre A et C
	expect(labels.B.y, 'B plus bas que A').toBeGreaterThan(labels.A.y);
	expect(labels.B.y, 'B plus bas que C').toBeGreaterThan(labels.C.y);
	expect(labels.A.x, 'A au fond, à gauche de B').toBeLessThan(labels.B.x);
	expect(labels.C.x, 'C au fond, à droite de B').toBeGreaterThan(labels.B.x);
	// Aucune étiquette ne coupe un trait (la cote de la hauteur peut toucher SC : ligne à part d'outils-manquants)
	const measure = await measureLabels(drawing, ['3,27 cm']);
	expect(measure.onStrokes, 'étiquettes sur un trait').toEqual([]);
	expect(measure.overlaps, 'étiquettes qui se recouvrent').toEqual([]);
	// « 4 cm » est sous [BC], pas dessus
	const bc = geometry.solid.find(([a, b]) => [vertex(a), vertex(b)].sort().join('') === 'BC');
	expect(bc, 'arête [BC] dessinée').toBeDefined();
	if (bc) {
		const [b, c] = bc;
		const t = (labels['4 cm'].x - b.x) / (c.x - b.x);
		expect(labels['4 cm'].y, '« 4 cm » sous [BC]').toBeGreaterThan(b.y + t * (c.y - b.y));
	}
	console.log(
		`#2400 ${projectName()} : distance G-I ${Math.hypot(labels.G.x - labels.I.x, labels.G.y - labels.I.y).toFixed(0)} px`
	);
	await shootThemes(page, drawing, '2400-tetraedre');
});

// ============================================================================
// Droite graduée : #2309, #2294, #2328
// ============================================================================

/** Toucher la droite à la graduation `value` (droite de `start` à `end`, dessinée en px) */
async function tapLine(svg: Locator, start: number, end: number, value: number): Promise<void> {
	const box = await svg.boundingBox();
	if (!box) throw new Error('droite sans boîte');
	await pressAt(svg, {
		x: NL_MARGIN + ((value - start) / (end - start)) * (box.width - 2 * NL_MARGIN),
		y: box.height / 2
	});
}

const REPRESENT_HALF = fence(
	'line',
	'start: -3',
	'end: 5',
	'step: 1',
	'arrows: true',
	'representer: [2, +inf['
);
const REPRESENT_BOUNDED = fence(
	'line',
	'start: -3',
	'end: 5',
	'step: 1',
	'arrows: true',
	'representer: [-1, 3['
);

const representerZone = (page: Page): Locator => page.locator('.representer-zone:visible').first();

/** Le sens (+1 vers la droite) d'un crochet `M tip,y1 L x,y1 L x,y2 L tip,y2` */
function bracketOpening(d: string): number {
	const numbers = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
	return Math.sign(numbers[0] - numbers[2]);
}

test('#2309 — demi-droite [2, +inf[ : boutons de côté grisés avant la borne, toucher pose la borne, « vers la droite → » trace jusqu’à la flèche, « 2 comprise » bascule le crochet', async ({
	page
}) => {
	await openPreview(
		page,
		'2309 demi-droite',
		`Représente les solutions de $x \\geqslant 2$.\n\n${REPRESENT_HALF}`
	);
	const zone = representerZone(page);
	await expect(zone).toBeVisible({ timeout: 30_000 });
	const svg = zone.locator('svg').first();
	await svg.scrollIntoViewIfNeeded();
	const left = page.getByRole('button', { name: '← vers la gauche' });
	const right = page.getByRole('button', { name: 'vers la droite →' });
	await expect(left).toBeDisabled();
	await expect(right).toBeDisabled();
	await expect(zone.locator('line.nl-segment')).toHaveCount(0);
	await tapLine(svg, -3, 5, 2);
	await expect(zone).toHaveAttribute('aria-valuetext', /borne 2 comprise, côté pas choisi/);
	await expect(left).toBeEnabled();
	await expect(right).toBeEnabled();
	await press(right);
	await expect(right).toHaveAttribute('aria-pressed', 'true');
	// Le trait va de 2 jusqu'à la flèche de droite, le crochet s'ouvre vers les solutions
	const drawn = await svg.evaluate((el) => {
		const segment = el.querySelector('line.nl-segment');
		const arrows = [...el.querySelectorAll('path.nl-arrow')];
		const rightArrow = arrows[arrows.length - 1];
		return {
			x2: Number(segment?.getAttribute('x2')),
			arrowTip: Number(rightArrow?.getAttribute('d')?.match(/M\s*(-?[\d.]+)/)?.[1]),
			bracket: el.querySelector('path.nl-bracket')?.getAttribute('d') ?? ''
		};
	});
	expect(drawn.x2, 'le trait atteint la flèche').toBeGreaterThanOrEqual(drawn.arrowTip - 12);
	expect(bracketOpening(drawn.bracket), 'crochet [ tourné vers la droite').toBe(1);
	// « 2 comprise » bascule : « 2 exclue », crochet retourné
	const toggle = page.getByRole('button', { name: /^2 comprise$/ });
	await press(toggle);
	const excluded = page.getByRole('button', { name: /^2 exclue$/ });
	await expect(excluded).toBeVisible();
	const flipped = await svg.evaluate(
		(el) => el.querySelector('path.nl-bracket')?.getAttribute('d') ?? ''
	);
	expect(bracketOpening(flipped), 'crochet ] tourné vers la gauche').toBe(-1);
	// Les boutons se touchent au doigt (44 px de haut)
	for (const button of [left, right, excluded]) {
		const box = await button.boundingBox();
		expect(box?.height ?? 0, 'hauteur du bouton (px)').toBeGreaterThanOrEqual(43);
	}
	await expectNoHorizontalOverflow(page, '2309 demi-droite');
	await shootThemes(page, zone, '2309-demi-droite');
});

test('#2309 — demi-droite, mauvais côté : la phrase et la droite juste', async ({ page }) => {
	await openPreview(
		page,
		'2309 verdict',
		`Représente les solutions de $x \\geqslant 2$.\n\n${REPRESENT_HALF}`
	);
	const zone = representerZone(page);
	await expect(zone).toBeVisible({ timeout: 30_000 });
	const svg = zone.locator('svg').first();
	await svg.scrollIntoViewIfNeeded();
	await tapLine(svg, -3, 5, 2);
	await press(page.getByRole('button', { name: '← vers la gauche' }));
	await validate(page);
	await expect(zone).toHaveClass(/representer-faux/);
	const correction = page.locator('.representer-correction').first();
	await expect(correction).toBeVisible();
	// Libellé de `representerMistakes` (number-line-representer.ts) : bonne borne, côté inverse
	expect(await previewText(page), 'phrase de la correction').toContain(
		'Les solutions sont de l’autre côté de 2.'
	);
	await expect(correction.locator('line.nl-segment')).toHaveCount(1);
	await shootThemes(page, correction, '2309-faux');
});

test('#2309 — demi-droite : borne, côté droit, comprise → juste', async ({ page }) => {
	await openPreview(
		page,
		'2309 juste',
		`Représente les solutions de $x \\geqslant 2$.\n\n${REPRESENT_HALF}`
	);
	const zone = representerZone(page);
	await expect(zone).toBeVisible({ timeout: 30_000 });
	const svg = zone.locator('svg').first();
	await svg.scrollIntoViewIfNeeded();
	await tapLine(svg, -3, 5, 2);
	await press(page.getByRole('button', { name: 'vers la droite →' }));
	await validate(page);
	await expect(zone).toHaveClass(/representer-juste/);
});

test('#2309 — intervalle borné [-1, 3[ : deux touchers, ◀ ▶ déplacent la dernière borne touchée', async ({
	page
}) => {
	await openPreview(
		page,
		'2309 borne',
		`Représente $-1 \\leqslant x < 3$.\n\n${REPRESENT_BOUNDED}`
	);
	const zone = representerZone(page);
	await expect(zone).toBeVisible({ timeout: 30_000 });
	const svg = zone.locator('svg').first();
	await svg.scrollIntoViewIfNeeded();
	await tapLine(svg, -3, 5, -1);
	await expect(zone).toHaveAttribute('aria-valuetext', /bornes : -1 comprise/);
	await tapLine(svg, -3, 5, 3);
	await expect(zone).toHaveAttribute('aria-valuetext', /-1 comprise, 3 comprise/);
	const back = page.getByRole('button', { name: 'Reculer la borne d’une graduation' });
	const forward = page.getByRole('button', { name: 'Avancer la borne d’une graduation' });
	await press(back);
	await expect(zone).toHaveAttribute('aria-valuetext', /-1 comprise, 2 comprise/);
	await press(forward);
	await expect(zone).toHaveAttribute('aria-valuetext', /-1 comprise, 3 comprise/);
	await press(page.getByRole('button', { name: /^3 comprise$/ }));
	await validate(page);
	await expect(zone).toHaveClass(/representer-juste/);
});

test('#2294 — « Intervalles » et « Demi-droite » : crochets tournés comme en cours, trait jusqu’à la flèche, flèche visible, nombres non masqués', async ({
	page
}, info) => {
	await openBloc(page, LINE_PATH);
	const closedOpen = rendered(page, 'Intervalles ouvert et fermé');
	await scrollTo(closedOpen);
	// [-2, 1] fermé (vers l'intérieur : + puis −), ]2, 4[ ouvert (− puis +)
	const brackets = await closedOpen
		.locator('path.nl-bracket')
		.evaluateAll((els) => els.map((el) => el.getAttribute('d') ?? ''));
	expect(brackets.map(bracketOpening), 'crochets [-2,1] puis ]2,4[').toEqual([1, -1, -1, 1]);
	const half = rendered(page, 'Demi-droite (solutions d’une inéquation)');
	await scrollTo(half);
	const halfBrackets = await half
		.locator('path.nl-bracket')
		.evaluateAll((els) => els.map((el) => el.getAttribute('d') ?? ''));
	expect(halfBrackets.map(bracketOpening), '[2, +inf[ : un crochet, vers la droite').toEqual([1]);
	const measures = await half.evaluate((root) => {
		const svg = root.querySelector('svg.number-line-svg') as SVGSVGElement;
		const segment = svg.querySelector('line.nl-segment');
		const arrows = [...svg.querySelectorAll('path.nl-arrow')].map((a) => a.getBoundingClientRect());
		const bracket = svg.querySelector('path.nl-bracket')?.getBoundingClientRect();
		const segBox = segment?.getBoundingClientRect();
		const rightArrow = arrows[arrows.length - 1];
		const labels = [...root.querySelectorAll('.number-line-label')].map((l) =>
			l.getBoundingClientRect()
		);
		const hits = (a: DOMRect, b: DOMRect) =>
			a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
		return {
			segmentReachesArrow: segBox ? Math.abs(segBox.right - rightArrow.left) <= 14 : false,
			arrowWidth: rightArrow.width,
			arrowHeight: rightArrow.height,
			bracketHeight: bracket?.height ?? 0,
			bracketWidth: bracket?.width ?? 0,
			labelCount: labels.length,
			labelsCovered: labels.filter(
				(l) => (segBox && hits(l, segBox)) || arrows.some((a) => hits(l, a))
			).length
		};
	});
	expect(measures.segmentReachesArrow, 'le trait va jusqu’à la flèche').toBe(true);
	expect(measures.arrowWidth, 'flèche visible (px)').toBeGreaterThanOrEqual(6);
	expect(measures.labelCount, 'nombres écrits').toBeGreaterThanOrEqual(5);
	expect(measures.labelsCovered, 'nombre masqué par le trait ou la flèche').toBe(0);
	console.log(
		`#2294 ${info.project.name} : crochet ${measures.bracketWidth.toFixed(1)} × ${measures.bracketHeight.toFixed(1)} px, flèche ${measures.arrowWidth.toFixed(1)} × ${measures.arrowHeight.toFixed(1)} px`
	);
	expect(measures.bracketHeight, 'hauteur du crochet (px)').toBeGreaterThanOrEqual(10);
	await expectNoHorizontalOverflow(page, '2294');
	await shootThemes(page, half, '2294-demi-droite');
	await shootThemes(page, closedOpen, '2294-intervalles');
});

test('#2328 — 3-014 en tiers : un toucher au centre de chaque graduation pose la borne dessus ; corrigé faux : le segment ne frôle aucun nombre écrit', async ({
	page
}) => {
	await login(page, ADMIN.email, ADMIN.password);
	const { seed, instance } = await findSeed(page, MODELS.inequation, (i) =>
		i.statement.includes('step: 1/3')
	);
	await openSeeded(page, MODELS.inequation, seed);
	const zone = representerZone(page);
	await expect(zone).toBeVisible({ timeout: 30_000 });
	const svg = zone.locator('svg').first();
	await svg.scrollIntoViewIfNeeded();
	const start = Number(instance.vars.g);
	expect(Number.isFinite(start), `g = ${instance.vars.g}`).toBe(true);
	const box = (await svg.boundingBox()) as { width: number; height: number };
	const spacing = (box.width - 2 * NL_MARGIN) / 12;
	console.log(
		`#2328 ${projectName()} : graduation en tiers de ${start} à ${start + 4}, écart entre graduations ${spacing.toFixed(1)} px (largeur ${box.width.toFixed(0)} px)`
	);
	for (const k of [0, 1, 2, 5, 7, 11, 12]) {
		await pressAt(svg, {
			x: NL_MARGIN + (k / 12) * (box.width - 2 * NL_MARGIN),
			y: box.height / 2
		});
		const text = (await zone.getAttribute('aria-valuetext')) ?? '';
		const shown = text.match(/borne (\S+) (comprise|exclue)/)?.[1] ?? '';
		const asNumber = shown.includes('/')
			? Number(shown.split('/')[0]) / Number(shown.split('/')[1])
			: Number(shown.replace(',', '.'));
		expect(asNumber, `borne lue « ${shown} » sur la graduation ${k}/12`).toBeCloseTo(
			start + k / 3,
			1
		);
	}
	await shootThemes(page, zone, '2328-tiers');
	// Corrigé faux à coup sûr : on lit le côté attendu dans l'énoncé (« representer: ]-inf, … » = vers la
	// gauche) et on choisit l'autre
	const expectedSide = /representer:\s*\]-inf/.test(instance.statement)
		? 'gauche'
		: /representer:\s*[[\]][^\n]*\+inf\[/.test(instance.statement)
			? 'droite'
			: null;
	expect(expectedSide, `côté attendu lu dans l'énoncé de la graine ${seed}`).not.toBeNull();
	await tapLine(svg, start, start + 4, start + 1);
	await press(
		page.getByRole('button', {
			name: expectedSide === 'gauche' ? 'vers la droite →' : '← vers la gauche'
		})
	);
	await validate(page);
	await expect(zone).toHaveClass(/representer-faux/);
	const correction = page.locator('.representer-correction').first();
	await expect(correction).toBeVisible();
	const layout = await correction.evaluate((root) => {
		const segment = root.querySelector('line.nl-segment');
		const axis = root.querySelector('line.nl-axis');
		const segBox = segment?.getBoundingClientRect();
		const labels = [...root.querySelectorAll('.number-line-label, .point-label')].map((l) =>
			l.getBoundingClientRect()
		);
		const hits = (a: DOMRect, b: DOMRect) =>
			a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
		return {
			raised: segBox && axis ? axis.getBoundingClientRect().top - segBox.top : 0,
			touching: segBox ? labels.filter((l) => hits(l, segBox)).length : -1,
			hasSegment: segment !== null
		};
	});
	expect(layout.hasSegment, 'segment dans la correction').toBe(true);
	console.log(
		`#2328 ${projectName()} : segment remonté de ${layout.raised.toFixed(1)} px, nombres touchés ${layout.touching}`
	);
	expect(layout.touching, 'nombres écrits frôlés par le segment').toBe(0);
	await shootThemes(page, correction, '2328-correction');
});

// ============================================================================
// Repère `courbe` : #2274, #2304/#2306, #2296
// ============================================================================

const VECTOR_WIN: Win = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };

/** Le point (x ; y) du repère, en px dans le <svg> */
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
	await pressAt(svg, await courbeSpot(svg, win, x, y));
}

/** Le repère à toucher, amené à l'écran */
async function courbeZone(page: Page): Promise<{ zone: Locator; svg: Locator }> {
	const zone = page.locator('.placer-zone:visible').first();
	await expect(zone).toBeVisible({ timeout: 30_000 });
	const svg = zone.locator('svg').first();
	await svg.scrollIntoViewIfNeeded();
	return { zone, svg };
}

const posed = (zone: Locator): Locator => zone.locator('circle.courbe-pose');
const arrowOf = (zone: Locator): Locator => zone.locator('g.courbe-fleche');

const VECTOR_FREE = fence(
	'courbe',
	'x: -5 ; 5',
	'y: -5 ; 5',
	'grille: 1',
	'tracer: vecteur (3 ; -2)'
);
const VECTOR_FROM = fence(
	'courbe',
	'x: -5 ; 5',
	'y: -5 ; 5',
	'grille: 1',
	'points: A(-1 ; 2)',
	'tracer: vecteur u = (3 ; -2) depuis A'
);

test('#2274 — vecteur libre : origine puis extrémité, flèche bleue à pointe visible sans disque dessus ; boutons Origine / Extrémité', async ({
	page
}) => {
	await openPreview(
		page,
		'2274 libre',
		`Représente le vecteur $\\vec{u}(3\\,;\\,-2)$.\n\n${VECTOR_FREE}`
	);
	const { zone, svg } = await courbeZone(page);
	const origin = page.getByRole('button', { name: 'Origine', exact: true });
	const end = page.getByRole('button', { name: 'Extrémité', exact: true });
	await expect(origin).toHaveAttribute('aria-pressed', 'true');
	await tapCourbe(svg, VECTOR_WIN, -1, 1);
	await expect(posed(zone)).toHaveCount(1);
	await expect(end).toHaveAttribute('aria-pressed', 'true');
	await tapCourbe(svg, VECTOR_WIN, 2, -1);
	await expect(arrowOf(zone)).toHaveCount(1);
	// Pointe visible (polygone) et pas de disque sur l'extrémité : le seul disque est l'origine
	await expect(posed(zone)).toHaveCount(1);
	const geometry = await zone.evaluate((root) => {
		const head = root.querySelector('g.courbe-fleche polygon')?.getBoundingClientRect();
		const disc = root.querySelector('circle.courbe-pose')?.getBoundingClientRect();
		return {
			headSize: Math.max(head?.width ?? 0, head?.height ?? 0),
			discDistance:
				head && disc
					? Math.hypot(
							head.x + head.width / 2 - (disc.x + disc.width / 2),
							head.y + head.height / 2 - (disc.y + disc.height / 2)
						)
					: 0
		};
	});
	expect(geometry.headSize, 'pointe de la flèche (px)').toBeGreaterThanOrEqual(6);
	expect(geometry.discDistance, 'aucun disque sur la pointe (px)').toBeGreaterThan(8);
	await shootThemes(page, zone, '2274-libre');
	// « Origine » puis toucher : l'origine bouge ; « Extrémité » puis toucher : tout représentant est juste
	await press(origin);
	await tapCourbe(svg, VECTOR_WIN, -3, 2);
	await expect(posed(zone)).toHaveCount(1);
	await press(end);
	await tapCourbe(svg, VECTOR_WIN, 0, 0);
	await validate(page);
	await expect(zone).toHaveClass(/placer-juste/);
});

/** Pose le vecteur libre (-2 ; 1) → (1 ; -1) et rend la zone avec son texte lu avant tout geste */
async function vecteurLibrePose(
	page: Page
): Promise<{ zone: Locator; svg: Locator; before: string | null }> {
	await openPreview(page, '2274 glisser', `Représente le vecteur.\n\n${VECTOR_FREE}`);
	const { zone, svg } = await courbeZone(page);
	await tapCourbe(svg, VECTOR_WIN, -2, 1);
	await tapCourbe(svg, VECTOR_WIN, 1, -1);
	await expect(arrowOf(zone)).toHaveCount(1);
	return { zone, svg, before: await zone.getAttribute('aria-valuetext') };
}

test('#2274 — vecteur libre : glisser un bout la déplace (souris sur ordinateur, doigt sous Android)', async ({
	page
}, info) => {
	test.skip(
		info.project.name === 'iphone',
		'glisser : pas sur iPhone (WebKit n’a pas de geste tactile CDP)'
	);
	const { zone, svg, before } = await vecteurLibrePose(page);
	const from = await courbeSpot(svg, VECTOR_WIN, 1, -1);
	const to = await courbeSpot(svg, VECTOR_WIN, 3, -3);
	const box = (await svg.boundingBox()) as { x: number; y: number };
	if (info.project.name === 'android') {
		const session = await page.context().newCDPSession(page);
		const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', spot?: Spot) =>
			session.send('Input.dispatchTouchEvent', {
				type,
				touchPoints: spot === undefined ? [] : [{ x: spot.x, y: spot.y, id: 0 }]
			});
		await send('touchStart', { x: box.x + from.x, y: box.y + from.y });
		for (let step = 1; step <= 8; step++) {
			await send('touchMove', {
				x: box.x + from.x + ((to.x - from.x) * step) / 8,
				y: box.y + from.y + ((to.y - from.y) * step) / 8
			});
		}
		await send('touchEnd');
	} else {
		await page.mouse.move(box.x + from.x, box.y + from.y);
		await page.mouse.down();
		await page.mouse.move(box.x + (from.x + to.x) / 2, box.y + (from.y + to.y) / 2, { steps: 5 });
		await page.mouse.move(box.x + to.x, box.y + to.y, { steps: 5 });
		await page.mouse.up();
	}
	await expect(zone).not.toHaveAttribute('aria-valuetext', before ?? '');
	await expect(arrowOf(zone)).toHaveCount(1);
});

test('#2274 — vecteur libre : au clavier, une flèche = un cran', async ({ page }) => {
	test.skip(isTouch(), 'clavier : pas au toucher (iPhone, Android)');
	const { zone, before } = await vecteurLibrePose(page);
	await zone.focus();
	await page.keyboard.press('ArrowRight');
	await expect(zone).not.toHaveAttribute('aria-valuetext', before ?? '');
});

test('#2274 — « depuis A » : A ne bouge pas, aucun bouton (périmé : « seule Extrémité », ea5fd701b0) ; flèche juste ailleurs → vert', async ({
	page
}) => {
	await openPreview(
		page,
		'2274 depuis A',
		`Trace le représentant d'origine $A$.\n\n${VECTOR_FROM}`
	);
	const { zone, svg } = await courbeZone(page);
	await expect(page.getByRole('button', { name: 'Origine', exact: true })).toHaveCount(0);
	// Périmé : la ligne dit « seule Extrémité est proposée », ea5fd701b0 (2026-11-05) n'en laisse aucune
	await expect(page.getByRole('button', { name: 'Extrémité', exact: true })).toHaveCount(0);
	await expect(zone.locator('circle.courbe-point')).toHaveCount(1);
	await tapCourbe(svg, VECTOR_WIN, 2, 0);
	await expect(arrowOf(zone)).toHaveCount(1);
	await expect(zone.locator('circle.courbe-point')).toHaveCount(1);
	await validate(page);
	await expect(zone).toHaveClass(/placer-juste/);
});

test('#2274 — sens inversé : « Ta flèche va dans le mauvais sens… » et la flèche juste en vert', async ({
	page
}) => {
	await openPreview(page, '2274 inverse', `Trace le représentant d'origine $A$.\n\n${VECTOR_FROM}`);
	const { zone, svg } = await courbeZone(page);
	await tapCourbe(svg, VECTOR_WIN, -4, 4);
	await validate(page);
	await expect(zone).toHaveClass(/placer-faux/);
	expect(await previewText(page)).toMatch(/Ta flèche va dans le mauvais sens/);
	const correction = page.locator('.placer-correction').first();
	await expect(correction).toBeVisible();
	await expect(correction.locator('g.courbe-fleche')).toHaveCount(1);
	const stroke = await correction
		.locator('g.courbe-fleche line')
		.first()
		.evaluate((el) => getComputedStyle(el).stroke);
	expect(stroke, 'flèche juste en vert').toBe(await tokenColor(page, '--color-fig-vert'));
	await shootThemes(page, correction, '2274-inverse');
});

test('#2274 — vecteur nommé, flèche fausse : « …, pas u⃗ (3 ; −2). » avec une espace avant u⃗', async ({
	page
}) => {
	await openPreview(page, '2274 nomme', `Trace le représentant d'origine $A$.\n\n${VECTOR_FROM}`);
	const { zone, svg } = await courbeZone(page);
	await tapCourbe(svg, VECTOR_WIN, 1, 2);
	await validate(page);
	await expect(zone).toHaveClass(/placer-faux/);
	const sentence = page.locator('p.text-sm', { hasText: 'Ta flèche représente' }).first();
	await expect(sentence).toBeVisible();
	const read = await sentence.evaluate((p) => ({
		text: (p.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' '),
		nodes: [...p.childNodes]
			.filter((node) => node.nodeType !== Node.COMMENT_NODE)
			.map((node) => ({
				kind: node.nodeType === Node.TEXT_NODE ? 'text' : 'node',
				text: node.textContent ?? ''
			}))
	}));
	console.log(`#2274 ${projectName()} : phrase = « ${read.text} »`);
	// « …, pas » puis une espace (insécable, dans son propre nœud de texte) puis la formule à part
	const index = read.nodes.findIndex((n) => n.kind === 'text' && n.text.endsWith('pas'));
	expect(index, 'le texte « …, pas » précède la formule').toBeGreaterThanOrEqual(0);
	let next = index + 1;
	let between = '';
	while (read.nodes[next]?.kind === 'text') between += read.nodes[next++].text;
	expect(between, 'une espace entre « pas » et la formule').toMatch(/^[\s\u00a0]+$/);
	expect(read.nodes[next]?.kind, 'la formule suit, à part').toBe('node');
	await shootThemes(page, sentence, '2274-nomme');
});

test('#2274 — droite fausse : « Ta droite n’est pas celle d’équation y = … » avec une espace avant la formule', async ({
	page
}) => {
	const win: Win = { xMin: -5, xMax: 5, yMin: -4, yMax: 4 };
	await openPreview(
		page,
		'2274 droite',
		`Trace la droite.\n\n${fence('courbe', 'x: -5 ; 5', 'y: -4 ; 4', 'grille: 1', 'tracer: y = x')}`
	);
	const { zone, svg } = await courbeZone(page);
	await tapCourbe(svg, win, 0, 1);
	await tapCourbe(svg, win, 2, 3);
	await validate(page);
	await expect(zone).toHaveClass(/placer-faux/);
	const sentence = page.locator('p.text-sm', { hasText: 'Ta droite' }).first();
	await expect(sentence).toBeVisible();
	const nodes = await sentence.evaluate((p) =>
		[...p.childNodes]
			.filter((node) => node.nodeType !== Node.COMMENT_NODE)
			.map((node) => ({
				kind: node.nodeType === Node.TEXT_NODE ? 'text' : 'node',
				text: node.textContent ?? ''
			}))
	);
	const formula = nodes.findIndex((n) => n.kind === 'node');
	expect(formula, 'la formule est un élément à part').toBeGreaterThan(0);
	expect(nodes[formula - 1].text, 'une espace avant la formule').toMatch(/[\s\u00a0]$/);
});

// Modèles publiés : 2-299, 2-298, 2-316, 2-445

test('#2304 — 2-299 « Lire les coordonnées d’un vecteur » : la flèche (AB, puis u⃗ avec son étiquette) se lit dans le repère, deux cases en colonne', async ({
	page
}) => {
	await login(page, ADMIN.email, ADMIN.password);
	for (const [label, pick] of [
		['AB', (i: Instance) => i.statement.includes('vecteur(A, B)')],
		['u', (i: Instance) => i.statement.includes('texte(') && i.statement.includes('u⃗')]
	] as const) {
		const { seed } = await findSeed(page, MODELS.lireVecteur, pick);
		await openSeeded(page, MODELS.lireVecteur, seed);
		const figure = page.locator('figure.figure-bloc:visible').first();
		await expect(figure).toBeVisible({ timeout: 30_000 });
		await figure.scrollIntoViewIfNeeded();
		// La pointe de la flèche du vecteur (les pointes des axes portent la classe `figure-fleche`)
		const head = await figure
			.locator('svg polygon[data-element]')
			.first()
			.evaluate((el) => {
				const box = el.getBoundingClientRect();
				return Math.max(box.width, box.height);
			});
		expect(head, `pointe de la flèche ${label} (px)`).toBeGreaterThanOrEqual(5);
		if (label === 'u') {
			await expect(figure).toContainText('u');
		} else {
			await expect(figure).toContainText('A');
			await expect(figure).toContainText('B');
		}
		// Deux cases en colonne : UN champ MathLive avec une matrice à deux inconnues (`?`), l'une sous l'autre
		const field = page.locator('math-field:visible').first();
		await expect(field).toBeVisible();
		const boxes = await field.evaluate((el) => {
			const prompts = [...(el.shadowRoot?.querySelectorAll('.ML__prompt, .ML__placeholder') ?? [])];
			return prompts.map((node) => {
				const box = node.getBoundingClientRect();
				return { x: box.x, y: box.y, width: box.width, height: box.height };
			});
		});
		console.log(`#2304 ${projectName()} : cases ${JSON.stringify(boxes)}`);
		expect(boxes.length, 'cases de réponse').toBe(2);
		const [first, second] = boxes;
		expect(second.y, 'deuxième case sous la première').toBeGreaterThan(first.y + first.height / 2);
		expect(Math.abs(second.x - first.x), 'cases alignées en colonne (px)').toBeLessThan(20);
		await shootThemes(page, figure, `2304-lire-${label}`);
	}
});

test('#2306 — 2-298 « Représenter un vecteur » : origine libre (Origine puis Extrémité), flèche juste → vert, sens inversé et coordonnées échangées → leur phrase, corrigé en vert', async ({
	page
}) => {
	await login(page, ADMIN.email, ADMIN.password);
	const { seed, instance } = await findSeed(
		page,
		MODELS.tracerVecteur,
		(i) => !i.statement.includes('depuis A')
	);
	const a = Number(instance.vars.a);
	const b = Number(instance.vars.b);
	expect(Number.isFinite(a) && Number.isFinite(b), JSON.stringify(instance.vars)).toBe(true);
	const win: Win = { xMin: -6, xMax: 6, yMin: -6, yMax: 6 };
	const ox = a > 0 ? -2 : 2;
	const oy = b > 0 ? -2 : 2;
	// Juste : un représentant quelconque de (a ; b)
	await openSeeded(page, MODELS.tracerVecteur, seed);
	let { zone, svg } = await courbeZone(page);
	await expect(page.getByRole('button', { name: 'Origine', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Extrémité', exact: true })).toBeVisible();
	await tapCourbe(svg, win, ox, oy);
	await tapCourbe(svg, win, ox + a, oy + b);
	await validate(page);
	await expect(zone).toHaveClass(/placer-juste/);
	await shootThemes(page, zone, '2306-juste');
	// Sens inversé
	await openSeeded(page, MODELS.tracerVecteur, seed);
	({ zone, svg } = await courbeZone(page));
	await tapCourbe(svg, win, ox + a, oy + b);
	await tapCourbe(svg, win, ox, oy);
	await validate(page);
	await expect(zone).toHaveClass(/placer-faux/);
	expect(await previewText(page)).toMatch(/Ta flèche va dans le mauvais sens/);
	const correction = page.locator('.placer-correction').first();
	await expect(correction).toBeVisible();
	await expect(correction.locator('g.courbe-fleche')).toHaveCount(1);
	await shootThemes(page, correction, '2306-inverse');
	// Coordonnées échangées (a et b sont toujours distincts en valeur absolue)
	await openSeeded(page, MODELS.tracerVecteur, seed);
	({ zone, svg } = await courbeZone(page));
	await tapCourbe(svg, win, 0, 0);
	await tapCourbe(svg, win, b, a);
	await validate(page);
	await expect(zone).toHaveClass(/placer-faux/);
	expect(await previewText(page), `échangées (a=${a}, b=${b})`).toMatch(
		/échangé l.abscisse et l.ordonnée/
	);
});

test('#2306 — 2-298 « depuis A » : aucun bouton (périmé : « seule Extrémité », ea5fd701b0), A ne bouge pas, extrémité juste → vert', async ({
	page
}) => {
	await login(page, ADMIN.email, ADMIN.password);
	const { seed, instance } = await findSeed(page, MODELS.tracerVecteur, (i) =>
		i.statement.includes('depuis A')
	);
	const [a, b, xa, ya] = ['a', 'b', 'xa', 'ya'].map((name) => Number(instance.vars[name]));
	await openSeeded(page, MODELS.tracerVecteur, seed);
	const { zone, svg } = await courbeZone(page);
	await expect(page.getByRole('button', { name: 'Origine', exact: true })).toHaveCount(0);
	// Périmé : la ligne dit « seule Extrémité est proposée », ea5fd701b0 (2026-11-05) n'en laisse aucune
	await expect(page.getByRole('button', { name: 'Extrémité', exact: true })).toHaveCount(0);
	await tapCourbe(svg, { xMin: -6, xMax: 6, yMin: -6, yMax: 6 }, xa + a, ya + b);
	await validate(page);
	await expect(zone).toHaveClass(/placer-juste/);
});

const DRAW_WIN: Win = { xMin: -6, xMax: 6, yMin: -6, yMax: 6 };

test('#2296 — 2-316 droite d’équation réduite : deux points justes → vert ; pente fausse → « Ta droite n’est pas celle d’équation … » ; un point seul → « Il faut placer deux points. » ; corrigé affiché', async ({
	page
}) => {
	await login(page, ADMIN.email, ADMIN.password);
	const { seed, instance } = await findSeed(
		page,
		MODELS.droiteReduite,
		(i) => i.statement.includes('Trace la droite') && !i.statement.includes('dfrac')
	);
	const m = Number(instance.vars.m);
	const p = Number(instance.vars.p);
	await openSeeded(page, MODELS.droiteReduite, seed);
	let { zone, svg } = await courbeZone(page);
	const statement = await previewText(page);
	// Le « d » est une formule (absente du texte lu) : « Trace la droite [d] : place deux de ses points. »
	expect(statement).toMatch(/Trace la droite\s*: place deux de ses points\./);
	await expect(page.locator('math-span', { hasText: /^d$/ }).first()).toBeAttached();
	await expect(posed(zone)).toHaveCount(0);
	await tapCourbe(svg, DRAW_WIN, 0, p);
	await tapCourbe(svg, DRAW_WIN, 1, p + m);
	await validate(page);
	await expect(zone).toHaveClass(/placer-juste/);
	await shootThemes(page, zone, '2296-reduite-juste');
	// Pente fausse (parallèle décalée d'un cran)
	await openSeeded(page, MODELS.droiteReduite, seed);
	({ zone, svg } = await courbeZone(page));
	await tapCourbe(svg, DRAW_WIN, 0, p + 1);
	await tapCourbe(svg, DRAW_WIN, 1, p + m + 1);
	await validate(page);
	await expect(zone).toHaveClass(/placer-faux/);
	expect(await previewText(page)).toMatch(/Ta droite n.est pas celle d.équation/);
	const correction = page.locator('.placer-correction').first();
	await expect(correction).toBeVisible();
	await expect(correction.locator('line.courbe-trace').first()).toBeVisible();
	await expect(correction.locator('circle.courbe-pose').first()).toBeVisible();
	await shootThemes(page, correction, '2296-reduite-faux');
	// Un point seul
	await openSeeded(page, MODELS.droiteReduite, seed);
	({ zone, svg } = await courbeZone(page));
	await tapCourbe(svg, DRAW_WIN, 0, p);
	await validate(page);
	await expect(page.locator('#contenu-principal')).toContainText('Il faut placer deux points.');
});

test('#2296 — 2-316 pente fractionnaire : points (0 ; p) et (q ; p + n) → vert', async ({
	page
}) => {
	await login(page, ADMIN.email, ADMIN.password);
	const { seed, instance } = await findSeed(page, MODELS.droiteReduite, (i) =>
		i.statement.includes('dfrac')
	);
	const [q, n, p] = ['q', 'n', 'p'].map((name) => Number(instance.vars[name]));
	await openSeeded(page, MODELS.droiteReduite, seed);
	const { zone, svg } = await courbeZone(page);
	await tapCourbe(svg, DRAW_WIN, 0, p);
	await tapCourbe(svg, DRAW_WIN, q, p + n);
	await validate(page);
	await expect(zone).toHaveClass(/placer-juste/);
});

test('#2296 — 2-445 équation cartésienne : pente fausse → l’équation de l’énoncé, propre (ni « 1y » ni « + -3 »)', async ({
	page
}) => {
	await login(page, ADMIN.email, ADMIN.password);
	for (const variation of ['m', 'a'] as const) {
		const { seed, instance } = await findSeed(page, MODELS.droiteCartesienne, (i) =>
			variation === 'm' ? 'm' in i.vars : !('m' in i.vars)
		);
		const b = Number(instance.vars.b);
		const p = Number(instance.vars.p);
		const slope = variation === 'm' ? Number(instance.vars.m) : -Number(instance.vars.a) / b;
		const run = variation === 'm' ? 1 : Math.abs(b);
		await openSeeded(page, MODELS.droiteCartesienne, seed);
		let { zone, svg } = await courbeZone(page);
		await tapCourbe(svg, DRAW_WIN, 0, p);
		await tapCourbe(svg, DRAW_WIN, run, p + slope * run);
		await validate(page);
		await expect(zone, `juste (${JSON.stringify(instance.vars)})`).toHaveClass(/placer-juste/);
		// Pente fausse : parallèle décalée d'un cran
		await openSeeded(page, MODELS.droiteCartesienne, seed);
		({ zone, svg } = await courbeZone(page));
		await tapCourbe(svg, DRAW_WIN, 0, p + 1);
		await tapCourbe(svg, DRAW_WIN, run, p + slope * run + 1);
		await validate(page);
		await expect(zone).toHaveClass(/placer-faux/);
		expect(await previewText(page)).toMatch(/Ta droite n.est pas celle d.équation/);
		const sentence = page.locator('p.text-sm', { hasText: 'Ta droite' }).first();
		console.log(
			`#2296 ${projectName()} : variation ${variation}, phrase = « ${((await sentence.textContent()) ?? '').replace(/\s+/g, ' ')} »`
		);
		const mathText = (await sentence.locator('math-span, math-div').allTextContents()).join(' ');
		expect(mathText, 'une formule dans la phrase').not.toBe('');
		expect(mathText, 'pas de « 1y »').not.toMatch(/(^|[^\d])1\s*y/);
		expect(mathText, 'pas de « + -3 »').not.toMatch(/\+\s*[-−]\s*\d/);
		await shootThemes(page, sentence, `2296-cartesienne-${variation}`);
	}
});

// ============================================================================
// Arbre pondéré : #2398
// ============================================================================

test('#2398 — arbre G_1 / G_2 : G₁ et G₂ en indices à l’écran ; le modèle « Probabilités totales » (arbre en \\mathrm{A}_1) s’affiche comme avant', async ({
	page
}) => {
	// Une branche = « événement:probabilité » ; le texte après la virgule (P(…)=…) s'écrit au bout
	await openPreview(
		page,
		'2398 arbre',
		`Voici l'arbre.\n\n${fence(
			'probtree',
			'root: Tirage',
			'outcomes: true',
			'G_1:0.4',
			'  D:0.5, P(G_1\\cap D)=0.2',
			'G_2:0.6',
			'  D:0.5, P(G_2\\cap D)=0.3'
		)}`,
		{ plain: true }
	);
	const tree = page.locator('.probability-tree:visible').first();
	await expect(tree).toBeVisible({ timeout: 30_000 });
	await tree.scrollIntoViewIfNeeded();
	const formulas = await tree.locator('math-span').allTextContents();
	console.log(`#2398 ${projectName()} : formules de l'arbre = ${JSON.stringify(formulas)}`);
	// G_1 et G_2 sont écrits en indice (G_{1}, G_{2}), ni « G_1 » brut ni « G1 » sans indice
	expect(formulas.filter((f) => /^G_\{?1\}?$/.test(f.trim())).length, 'G₁ en indice').toBe(1);
	expect(formulas.filter((f) => /^G_\{?2\}?$/.test(f.trim())).length, 'G₂ en indice').toBe(1);
	expect(
		formulas.filter((f) => /P\(G_\{?1\}?\\cap D\)/.test(f)).length,
		'P(G₁∩D) avec G₁ en indice'
	).toBe(1);
	await shootThemes(page, tree, '2398-arbre');

	// Le modèle publié (variation « usine ») montre son arbre en \mathrm{A}_1 dans la correction,
	// qu'une réponse fausse fait apparaître
	const { seed } = await findSeed(page, MODELS.probabilitesTotales, (i) =>
		i.statement.includes('usine')
	);
	await openSeeded(page, MODELS.probabilitesTotales, seed);
	const field = page.locator('math-field:visible').first();
	await press(field);
	await expect(field).toBeFocused();
	await page.keyboard.type('1', { delay: 80 });
	await validate(page);
	const published = page.locator('.probability-tree:visible').first();
	await expect(published).toBeVisible({ timeout: 30_000 });
	await published.scrollIntoViewIfNeeded();
	const publishedFormulas = await published.locator('math-span').allTextContents();
	console.log(`#2398 ${projectName()} : arbre publié = ${JSON.stringify(publishedFormulas)}`);
	expect(
		publishedFormulas.some((f) => /A\}?_\{?1\}?/.test(f)),
		'les événements A_1 du modèle publié sont présents'
	).toBe(true);
	await shootThemes(page, published, '2398-publie');
});

// ============================================================================
// PDF d'une fiche : #2356, #2331, #2339, #2294, #2274, #2398
// ============================================================================

test.describe('PDF de fiche', () => {
	test.describe.configure({ mode: 'serial' });
	let worksheetId = '';

	const BLOCKS = {
		vecteurs: fence(
			'solide',
			'forme: cube 3',
			'sommets: A B C D E F G H',
			'points: I milieu EF',
			'vecteurs: w1 = AB, u = AE, v = AD'
		),
		tracer: fence(
			'solide',
			'forme: cube 3',
			'sommets: A B C D E F G H',
			'tracer: vecteur AB + AD depuis A'
		),
		droite: fence(
			'line',
			'start: -3',
			'end: 5',
			'step: 1',
			'arrows: true',
			'segments: [2, +inf[ vert, ]-3, -1[ orange'
		),
		repere: fence('courbe', 'x: -5 ; 5', 'y: -5 ; 5', 'grille: 1', 'tracer: vecteur (3 ; -2)'),
		arbre: fence('probtree', 'Pile:1/2', '  Pile:1/2', '  Face:1/2', 'Face:1/2')
	};

	async function exercise(title: string, statement: string, solution: string): Promise<string> {
		const rows = await sql<{ id: string }>(
			withFirstVersion(
				`insert into exercises (title, source, grades, topic, created_by, category)
				 values ($1, 'verifs5', '{}', 'Verifs5', $2, 'automatisme') returning id`,
				{ variations: '$3::jsonb' }
			),
			[
				title,
				TEACHER_ID,
				JSON.stringify([
					{ label: 'guided', hints: [], statement_md: statement, solution_md: solution }
				])
			]
		);
		return rows[0].id;
	}

	async function wipe(): Promise<void> {
		await sql(`delete from worksheets where created_by = $1 and title like 'Verifs5 %'`, [
			TEACHER_ID
		]);
		await sql(`delete from exercises where created_by = $1 and source = 'verifs5'`, [TEACHER_ID]);
	}

	// Le PDF ne se joue que sur l'ordinateur : les autres projets ne touchent pas à la fiche (leur
	// `wipe` effacerait celle d'un worker en cours)
	test.beforeAll(async () => {
		if (projectName() !== 'ordi-chrome') return;
		await wipe();
		const ids: Array<{ id: string; title: string }> = [];
		for (const [title, block] of [
			['Verifs5 vecteurs', BLOCKS.vecteurs],
			['Verifs5 tracer', BLOCKS.tracer],
			['Verifs5 droite', BLOCKS.droite],
			['Verifs5 repere', BLOCKS.repere],
			['Verifs5 arbre', BLOCKS.arbre]
		] as const) {
			ids.push({ id: await exercise(title, `Énoncé.\n\n${block}`, 'Voir la figure.'), title });
		}
		worksheetId = await createWorksheet({
			title: 'Verifs5 fiche blocs',
			styleId: STYLE_IDS.standard,
			exercises: ids.map(({ id, title }) => ({ exercise: { id, title } }))
		});
	});
	test.afterAll(async () => {
		if (projectName() === 'ordi-chrome') await wipe();
	});

	test('#2356, #2398 — PDF de la fiche : indice de w₁ plus petit et abaissé, étiquettes u, v, I, « Pile » en texte droit ; PDF du corrigé : titres et solution (les flèches et les repères se jugent sur les captures)', async ({
		page
	}) => {
		test.skip(projectName() !== 'ordi-chrome', 'PDF : même fichier quel que soit l’écran');
		await login(page, TEACHER.email, TEACHER.password);
		const fiche = await teacherPdf(page, worksheetId, { saveAs: 'paquet5-fiche.pdf' });
		const corrige = await teacherPdf(page, worksheetId, {
			kind: 'Corrigé',
			saveAs: 'paquet5-corrige.pdf'
		});
		pdfToPng(fiche, 'paquet5-fiche', 70);
		pdfToPng(corrige, 'paquet5-corrige', 70);
		const text = pdfText(fiche).join('\n');
		const runs = pdfRuns(fiche);
		console.log(
			`PDF fiche : polices ${pdfFonts(fiche)
				.map((l) => l.split(/\s+/)[0])
				.join(', ')}`
		);
		console.log(
			`PDF fiche : textes ${runs
				.map((r) => `${r.text}@${r.size}`)
				.join(' | ')
				.slice(0, 1500)}`
		);
		expect(text, 'Pile en texte droit').toMatch(/\bPile\b/);
		expect(text, 'pas de lettres espacées').not.toMatch(/P\s+i\s+l\s+e/);
		const wIndex = runs.findIndex((r) => r.text.trim() === 'w');
		expect(wIndex, 'étiquette w dans le PDF').toBeGreaterThanOrEqual(0);
		const w = runs[wIndex];
		const indice = runs[wIndex + 1];
		expect(indice?.text.trim(), 'le run qui suit « w » est son indice').toBe('1');
		expect(indice.size, 'indice « 1 » plus petit que « w »').toBeLessThan(w.size);
		expect(indice.top, 'indice « 1 » abaissé sous la ligne de « w »').toBeGreaterThan(w.top);
		expect(indice.left, 'indice « 1 » à droite de « w »').toBeGreaterThan(w.left);
		for (const name of ['u', 'v', 'I']) {
			expect(
				runs.some((r) => r.text.trim() === name),
				`${name} dans le PDF`
			).toBe(true);
		}
		// Corrigé : titre « CORRECTION », les cinq exercices et leur solution (le corrigé ne redessine pas les figures)
		const solution = pdfText(corrige).join('\n');
		expect(solution, 'le corrigé s’annonce').toMatch(/CORRECTION/);
		for (const title of ['vecteurs', 'tracer', 'droite', 'repere', 'arbre']) {
			expect(solution, `exercice « ${title} » dans le corrigé`).toContain(`Verifs5 ${title}`);
		}
		expect(solution.match(/Voir la figure\./g)?.length, 'une solution par exercice').toBe(5);
	});
});
