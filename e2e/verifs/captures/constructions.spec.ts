import { expect, test, type Locator, type Page } from '@playwright/test';
import { shoot, type Line } from '../helpers/captures';
import { storageStatePath } from '../helpers/comptes';

/**
 * Captures des constructions animées (`/constructions/essais`) — lignes « à l'œil »
 * ==================================================================================
 *
 * Chaque test tape le script d'une ligne de `verifications-manuelles.md` dans
 * l'éditeur des essais, le rejoue pas à pas (« étape suivante », instantanée) et
 * capture le lecteur aux arrêts où l'on voit ce que dit la ligne. Les messages
 * précis (refus, ligne rouge d'arrêt) sont en plus assertés.
 */

test.use({ storageState: storageStatePath('teacher') });

// ============================================================================
// HELPERS
// ============================================================================

/** Choisit les étapes à capturer : rang (1…n), nombre d'étapes, consigne de la sous-étape */
type Pick = (index: number, total: number, text: string) => boolean;

const MAX_SHOTS_PER_RUN = 8;
const PROBE = process.env.VERIFS_PROBE === '1';

const none: Pick = () => false;
const last: Pick = (i, n) => i === n;
const at =
	(...indexes: number[]): Pick =>
	(i) =>
		indexes.includes(i);
const matching =
	(re: RegExp): Pick =>
	(_i, _n, text) =>
		re.test(text);
const any =
	(...picks: Pick[]): Pick =>
	(i, n, t) =>
		picks.some((p) => p(i, n, t));

function stepButton(page: Page): Locator {
	return page.getByTitle('Etape suivante (instantane)');
}

function player(page: Page): Locator {
	return page.locator('.construction-player');
}

/** Tape le script dans l'éditeur des essais et attend que le lecteur l'ait pris */
async function typeScript(page: Page, lines: string[]): Promise<void> {
	await page.goto('/constructions/essais');
	const editor = page.locator('.cm-content');
	await editor.click();
	await page.keyboard.press('ControlOrMeta+a');
	await page.keyboard.insertText(lines.join('\n') + '\n');
	// La validation est différée (300 ms) ; le lecteur recharge ensuite le script
	await page.waitForTimeout(900);
}

/** Texte des consignes affichées sous la figure (auteur + sous-étape + arrêt) */
async function instructionText(page: Page): Promise<string> {
	const parts = await player(page)
		.locator(
			'[data-testid=consigne-auteur], [data-testid=consigne-sous-etape], [data-testid=arret-execution]'
		)
		.allInnerTexts();
	return parts.join(' ¶ ');
}

/** Recommence la construction (le lecteur s'ouvre sur la figure finie) */
async function restart(page: Page): Promise<void> {
	await page.getByTitle('Recommencer').click();
	await page.waitForTimeout(400);
}

/**
 * Joue le script en « étape suivante » depuis le début : capture le lecteur aux
 * étapes choisies. Rend les consignes de chaque étape (pour les assertions).
 */
async function playSteps(
	page: Page,
	line: Line,
	script: string[],
	caption: string,
	pick: Pick
): Promise<string[]> {
	await typeScript(page, script);
	await restart(page);
	const total = Number((await page.getByText(/Etape \d+ \/ \d+/).innerText()).split('/')[1]);
	const texts: string[] = [];
	let shots = 0;
	for (let i = 1; i <= total; i++) {
		if (await stepButton(page).isDisabled()) break;
		await stepButton(page).click();
		await page.waitForTimeout(350);
		const text = await instructionText(page);
		texts.push(text);
		if (PROBE) console.log(`[${caption}] ${i}/${total} ${text}`);
		if (!PROBE && shots < MAX_SHOTS_PER_RUN && pick(i, total, text)) {
			shots++;
			await shoot(page, line, `${caption} — étape ${i}/${total}`, { target: player(page) });
		}
	}
	return texts;
}

/** Tape le script et capture l'éditeur entier (message d'erreur compris) */
async function shootEditor(
	page: Page,
	line: Line,
	script: string[],
	caption: string
): Promise<void> {
	await typeScript(page, script);
	if (!PROBE) await shoot(page, line, caption, { target: page.locator('.script-editor') });
}

const base = (...lines: string[]): string[] => lines;

// ============================================================================
// TESTS
// ============================================================================

test('#1653 — bissectrice d’un angle plat, parallèle à l’équerre, points E*/F*', async ({
	page
}) => {
	const line: Line = {
		pr: '#1653',
		title: 'Bissectrice de l’angle plat, parallèles, noms des points',
		look: 'Angle plat (A = (4 ; 0), V = (0 ; 0), B = (−4 ; 0), demi-droites VA et VB) : bissectrice @euclide @arcs_egaux @complet → arcs au-dessus, bissectrice verticale ; même chose en @mesure @complet (« on lit 180° », « 180 ÷ 2 = 90 ») ; en @euclide @arc_milieu → refus avec renvoi vers @arcs_egaux / @mesure. P = (8 ; 2) sur (AB) puis parallele(P, A, B) @equerre @double_perpendiculaire → le message cite @equerre. C = (0 ; 0), D = (4 ; 1), M = (1 ; 3), m = parallele(M, C, D) @euclide @double_perpendiculaire @complet → points E*, F* (pas C*/D*). A = (0 ; 0), B = (4 ; 1), P = (1 ; 3), d = parallele(P, A, B) @equerre @double_perpendiculaire @complet → carré en P dans le coin de l’équerre. segment(A, B) : le trait bleu reste visible le long de la règle pendant le tracé.'
	};
	const plat = (option: string): string[] =>
		base(
			'A = point(4, 0)',
			'V = point(0, 0)',
			'B = point(-4, 0)',
			'c1 = demidroite(V, A)',
			'c2 = demidroite(V, B)',
			`d = bissectrice(A, V, B) ${option}`
		);

	await playSteps(
		page,
		line,
		plat('@euclide @arcs_egaux @complet'),
		'angle plat @euclide @arcs_egaux @complet',
		at(7, 8, 11, 12)
	);
	await playSteps(page, line, plat('@mesure @complet'), 'angle plat @mesure @complet', at(6, 7, 9));

	// Refus de @arc_milieu sur un angle plat
	await playSteps(
		page,
		line,
		plat('@euclide @arc_milieu'),
		'angle plat @euclide @arc_milieu : refus',
		last
	);
	const editor = page.locator('.script-editor');
	await expect(editor).toContainText('@arcs_egaux');
	await expect(editor).toContainText('@mesure');

	// Parallèle à l'équerre avec P sur (AB) : le message cite @equerre
	const surAB = base(
		'A = point(0, 0)',
		'B = point(4, 1)',
		'P = point(8, 2)',
		'd = parallele(P, A, B) @equerre @double_perpendiculaire'
	);
	const textes = await playSteps(
		page,
		line,
		surAB,
		'P sur (AB), @equerre @double_perpendiculaire',
		last
	);
	expect(textes.join(' ')).toContain('@equerre');

	await playSteps(
		page,
		line,
		base(
			'C = point(0, 0)',
			'D = point(4, 1)',
			'M = point(1, 3)',
			'm = parallele(M, C, D) @euclide @double_perpendiculaire @complet'
		),
		'C, D déjà pris : points auxiliaires E*, F*',
		at(6, 14, 19)
	);

	await playSteps(
		page,
		line,
		base(
			'A = point(0, 0)',
			'B = point(4, 1)',
			'P = point(1, 3)',
			'd = parallele(P, A, B) @equerre @double_perpendiculaire @complet'
		),
		'équerre @double_perpendiculaire @complet',
		at(5, 6, 10, 13)
	);

	await playSteps(
		page,
		line,
		// Le @pause final garde la règle posée (la dernière étape rend la figure sans instrument)
		base('A = point(-3, 0)', 'B = point(3, 1)', 'segment(A, B)', '@pause(500)'),
		'segment(A, B) : trait bleu le long de la règle',
		at(3)
	);
});

test('#1649 — règle posée et crayon au bout du trait, puis compas', async ({ page }) => {
	const line: Line = {
		pr: '#1649',
		title: 'Instruments tenus entre deux étapes',
		look: 'A = (−3 ; 0), B = (3 ; 1), segment(A, B), @pause(1500), arc(A, rayon=4, debut=0, fin=60) en « étape suivante » → à chaque arrêt la règle reste posée et le crayon au bout du trait (en B), puis le compas à la fin de l’arc ; à la fin, figure sans instrument.'
	};
	await playSteps(
		page,
		line,
		base(
			'A = point(-3, 0)',
			'B = point(3, 1)',
			'segment(A, B)',
			'@pause(1500)',
			'arc(A, rayon=4, debut=0, fin=60)'
		),
		'script de la ligne',
		at(3, 4, 5)
	);
	// Avec un @pause final, la dernière étape garde le compas à la fin de l'arc
	await playSteps(
		page,
		line,
		base(
			'A = point(-3, 0)',
			'B = point(3, 1)',
			'segment(A, B)',
			'@pause(1500)',
			'arc(A, rayon=4, debut=0, fin=60)',
			'@pause(500)'
		),
		'avec un @pause final : le compas à la fin de l’arc',
		at(5, 6)
	);
});

test('#1637/#1638 — milieu mesuré : règle 0 sur A, crayon à la moitié, codage', async ({
	page
}) => {
	const line: Line = {
		pr: '#1637/#1638',
		title: 'Milieu à la règle graduée',
		look: 'A = (−2 ; −1), B = (4,37 ; 1,5), I = milieu(A, B) @mesure @complet → la règle se pose 0 sur A et 6,8 en face de B (« on lit AB = 6,8 cm »), le crayon à la graduation 3,4, I apparaît ; sans segment : aucun codage ; avec s = segment(A, B) avant : codage AI = IB en @complet. Variantes : B à gauche de A (0 sur B), un segment vertical, et milieu(s).'
	};
	const milieu = (...avant: string[]): string[] => [...avant, 'I = milieu(A, B) @mesure @complet'];
	const pts = ['A = point(-2, -1)', 'B = point(4.37, 1.5)'];
	await playSteps(
		page,
		line,
		milieu(...pts),
		'sans segment (aucun codage)',
		matching(/lit AB|graduation|marque/)
	);
	await playSteps(
		page,
		line,
		milieu(...pts, 's = segment(A, B)'),
		'avec segment s (codage AI = IB)',
		matching(/lit AB|graduation|marque/)
	);
	await playSteps(
		page,
		line,
		milieu('A = point(2, -1)', 'B = point(-4.37, 1.5)', 's = segment(A, B)'),
		'B à gauche de A (0 sur B)',
		matching(/lit AB|graduation|marque/)
	);
	await playSteps(
		page,
		line,
		milieu('A = point(1, -3)', 'B = point(1, 4)', 's = segment(A, B)'),
		'segment vertical',
		matching(/lit AB|graduation|marque/)
	);
	await playSteps(
		page,
		line,
		[...pts, 's = segment(A, B)', 'I = milieu(s) @mesure @complet'],
		'milieu(s)',
		matching(/lit AB|graduation|marque/)
	);
});

test('#1643 — bissectrice mesurée au rapporteur', async ({ page }) => {
	const line: Line = {
		pr: '#1643',
		title: 'Bissectrice au rapporteur',
		look: 'A = (5 ; 0), V = (0 ; 0), B = (1,38 ; 4,81), c1 = demidroite(V, A), c2 = demidroite(V, B), d = bissectrice(A, V, B) @mesure @complet → rapporteur centre sur V, 0 côté A, « on lit l’angle AVB = 74° », crayon en face de 37°, repère P juste dehors, bissectrice, codage des deux angles égaux. Puis B = (1,38 ; −4,81) : rapporteur retourné, 37 sur l’échelle intérieure. Sans c1/c2 : aucun codage. B = (1,29 ; 4,83) : « 75 ÷ 2 = 37,5 ».'
	};
	const script = (b: string, demis = true): string[] => [
		'A = point(5, 0)',
		'V = point(0, 0)',
		`B = point(${b})`,
		...(demis ? ['c1 = demidroite(V, A)', 'c2 = demidroite(V, B)'] : []),
		'd = bissectrice(A, V, B) @mesure @complet'
	];
	const key = matching(/lit l’angle|÷|repère|bissectrice/);
	await playSteps(page, line, script('1.38, 4.81'), 'B = (1,38 ; 4,81)', key);
	await playSteps(
		page,
		line,
		script('1.38, -4.81'),
		'B = (1,38 ; −4,81) : rapporteur retourné',
		key
	);
	await playSteps(
		page,
		line,
		script('1.38, 4.81', false),
		'sans c1/c2 : aucun codage',
		matching(/lit l’angle|bissectrice/)
	);
	await playSteps(page, line, script('1.29, 4.83'), 'B = (1,29 ; 4,83) : 75 ÷ 2', matching(/÷/));
});

test('#1647 — médiatrice mesurée : règle, équerre sur le milieu', async ({ page }) => {
	const line: Line = {
		pr: '#1647',
		title: 'Médiatrice à la règle et à l’équerre',
		look: 'A = (−3 ; −1), B = (3,4 ; 0,5), s = segment(A, B), d = mediatrice(A, B) @mesure @complet → règle 0 sur A, « AB = 6,6 cm », crayon à 3,3, milieu I, équerre bord sur (AB) coin sur I au-dessus, tracé, prolongement en dessous ; à la fin codage AI = IB et carré d’angle droit en I. Ajouter M = milieu(A, B) avant d : pas de mesure, on part de l’équerre sur M. Sans s : aucun codage.'
	};
	const pts = ['A = point(-3, -1)', 'B = point(3.4, 0.5)'];
	const d = 'd = mediatrice(A, B) @mesure @complet';
	const key = matching(/lit AB|marque|pose l'équerre|trace la perpendiculaire|prolonge/);
	await playSteps(page, line, [...pts, 's = segment(A, B)', d], 'avec segment s', key);
	await playSteps(
		page,
		line,
		[...pts, 's = segment(A, B)', 'M = milieu(A, B)', d],
		'avec M = milieu(A, B) : pas de mesure',
		key
	);
	await playSteps(page, line, [...pts, d], 'sans s : aucun codage', key);
});

test('#1633 — lettres des points auxiliaires sur la figure', async ({ page }) => {
	const line: Line = {
		pr: '#1633',
		title: 'Lettres des points auxiliaires',
		look: 'A = (0 ; 0), B = (4 ; 1), P = (1 ; 3), d = parallele(P, A, B) @euclide @double_perpendiculaire @complet → A*, B*, Q, C*, D*, R et la droite e portent leur lettre sur la figure, la même que dans les consignes. Ajouter Q = point(6, 5) avant d → le point auxiliaire s’écrit Q′. Puis C = point(1, 3), c = cercle_circonscrit(A, B, C) @euclide, K = centre(c) → consignes « … se croisent en K… », lettre K au centre, aucun O.'
	};
	const pts = ['A = point(0, 0)', 'B = point(4, 1)', 'P = point(1, 3)'];
	const d = 'd = parallele(P, A, B) @euclide @double_perpendiculaire @complet';
	const key = any(matching(/apparaissent|croisent en|perpendiculaire e/), last);
	const textes = (
		await playSteps(page, line, [...pts, d], 'parallèle @euclide @double_perpendiculaire', key)
	).join(' ');
	for (const nom of ['A*', 'B*', 'Q', 'C*', 'D*', 'R']) expect(textes).toContain(nom);
	const avecQ = await playSteps(
		page,
		line,
		[...pts, 'Q = point(6, 5)', d],
		'avec Q = (6 ; 5) : point auxiliaire Q′',
		key
	);
	expect(avecQ.join(' ')).toContain('Q′');
	const circonscrit = (
		await playSteps(
			page,
			line,
			[
				'A = point(0, 0)',
				'B = point(4, 1)',
				'C = point(1, 3)',
				'c = cercle_circonscrit(A, B, C) @euclide',
				'K = centre(c)'
			],
			'cercle circonscrit, centre K',
			any(matching(/K/), at(20, 21))
		)
	).join(' ');
	expect(circonscrit).toContain('se croisent en K');
	expect(circonscrit).not.toMatch(/\bO\b/);
});

test('#1629 — consignes de parallèle : « Compas en C… », « parallèle à d »', async ({ page }) => {
	const line: Line = {
		pr: '#1629',
		title: 'Consignes des parallèles',
		look: 'C = (0 ; 0), D = (6 ; 1), d = droite(C, D), M = (2 ; 4), m = parallele(M, C, D) @euclide, n = parallele(M, d) @euclide @double_perpendiculaire → consignes « Compas en C, on prend la mesure |CD| », « Compas en M… » ; la dernière de n finit par « parallèle à d ». Aucune lettre absente du script (hors points auxiliaires Q, R, E*, F*… : C et D étant pris, la paire s’appelle E*/F* depuis #1653).'
	};
	const texts = await playSteps(
		page,
		line,
		base(
			'C = point(0, 0)',
			'D = point(6, 1)',
			'd = droite(C, D)',
			'M = point(2, 4)',
			'm = parallele(M, C, D) @euclide',
			'n = parallele(M, d) @euclide @double_perpendiculaire'
		),
		'm puis n',
		any(matching(/Compas en C, on prend|Compas en M, on prend|parallèle à d/), last)
	);
	expect(texts.join(' ')).toContain('Compas en C, on prend la mesure |CD|');
	expect(texts[texts.length - 1]).toMatch(/parallèle à d\s*$/);
});

test('#1626 — parallèle à une droite nommée, point caché de k, « e » réservé', async ({ page }) => {
	const line: Line = {
		pr: '#1626',
		title: 'Parallèle à une droite nommée',
		look: 'A = (0 ; 0), B = (6 ; 1), d = droite(A, B), P = (2 ; 4), m = parallele(P, d) @euclide, C = (8 ; 4), k = perpendiculaire(C, A, B), n = parallele(P, k) @euclide @complet → m s’anime comme parallele(P, A, B) ; pour n, le point caché de k apparaît en fondu (« On choisit un point de la droite ») avant le compas. Puis e = point(1, 1) → message « "e" est une constante réservée : c’est le nombre e… ».'
	};
	const script = base(
		'A = point(0, 0)',
		'B = point(6, 1)',
		'd = droite(A, B)',
		'P = point(2, 4)',
		'm = parallele(P, d) @euclide',
		'C = point(8, 4)',
		'k = perpendiculaire(C, A, B)',
		'n = parallele(P, k) @euclide @complet'
	);
	const textes = await playSteps(
		page,
		line,
		script,
		'm puis n',
		any(matching(/On choisit un point|Compas en C, on prend/), at(5, 10), last)
	);
	expect(textes.join(' ')).toContain('On choisit un point de la droite');
	await shootEditor(
		page,
		line,
		[...script, 'e = point(1, 1)'],
		'e = point(1, 1) : constante réservée'
	);
	await expect(page.locator('.script-editor')).toContainText('est une constante réservée');
});

test('#1623 — point sur la droite : arrêt, puis équerre sur (AB) verticale', async ({ page }) => {
	const line: Line = {
		pr: '#1623',
		title: 'Arrêt si P est sur la droite ; équerre du bon côté',
		look: 'A = (0 ; 0), B = (4 ; 0), P = (2 ; 0), d = parallele(P, A, B) @euclide @double_perpendiculaire : avancer jusqu’au bout → sous les consignes, ligne rouge « ⚠ Arrêt à la ligne 4 : … P est sur la droite (AB) … » ; reculer d’un pas → elle disparaît. Avec P = (2 ; 3) : aucune ligne d’arrêt. Double perpendiculaire à l’équerre avec (AB) verticale (B = (0 ; 4), P = (−3 ; 1) puis (3 ; 1)) : l’équerre est posée du côté de P ; le carré en P dans le coin de l’équerre.'
	};
	const d = 'd = parallele(P, A, B) @euclide @double_perpendiculaire';
	await playSteps(
		page,
		line,
		['A = point(0, 0)', 'B = point(4, 0)', 'P = point(2, 0)', d],
		'P sur (AB) : fin de lecture',
		none
	);
	// Avancer jusqu'au bout : la ligne rouge d'arrêt
	const arret = page.getByTestId('arret-execution');
	await restart(page);
	while (await stepButton(page).isEnabled()) await stepButton(page).click();
	await page.waitForTimeout(350);
	await expect(arret).toContainText('Arrêt à la ligne 4');
	await expect(arret).toContainText('P est sur la droite (AB)');
	await shoot(page, line, 'P sur (AB) : ligne rouge d’arrêt au dernier pas', {
		target: player(page)
	});
	// Reculer d'un pas : elle disparaît
	await page.getByTitle('Etape precedente').click();
	await page.waitForTimeout(350);
	await expect(arret).toHaveCount(0);
	await shoot(page, line, 'P sur (AB) : un pas en arrière, plus de ligne rouge', {
		target: player(page)
	});

	// P hors de la droite : aucune ligne d'arrêt
	await playSteps(
		page,
		line,
		['A = point(0, 0)', 'B = point(4, 0)', 'P = point(2, 3)', d],
		'P = (2 ; 3) : aucune ligne d’arrêt',
		last
	);
	await expect(arret).toHaveCount(0);

	// (AB) verticale, équerre du côté de P
	const equerre = (p: string): string[] => [
		'A = point(0, 0)',
		'B = point(0, 4)',
		`P = point(${p})`,
		'd = parallele(P, A, B) @equerre @double_perpendiculaire @complet'
	];
	await playSteps(
		page,
		line,
		equerre('-3, 1'),
		'(AB) verticale, P = (−3 ; 1)',
		any(matching(/glisser|pose l'équerre avec un bord/), last)
	);
	await playSteps(
		page,
		line,
		equerre('3, 1'),
		'(AB) verticale, P = (3 ; 1)',
		any(matching(/glisser|pose l'équerre avec un bord/), last)
	);
});

test('#1621 — double perpendiculaire au compas puis à l’équerre', async ({ page }) => {
	const line: Line = {
		pr: '#1621',
		title: 'Double perpendiculaire',
		look: 'A = (0 ; 0), B = (4 ; 1), P = (1 ; 3), d = parallele(P, A, B) @euclide @double_perpendiculaire, puis @equerre @double_perpendiculaire : au compas, la perpendiculaire puis e, deux petits arcs en P (C*, D*), ouverture plus grande, R, règle (PR) ; à l’équerre, l’équerre posée sur e angle droit en P, deux marqueurs d’angle droit en F et en P bien orientés. P = (2 ; 0,5) (sur (AB)) → erreur « P est sur la droite (AB) ».'
	};
	const script = (option: string, p = '1, 3'): string[] => [
		'A = point(0, 0)',
		'B = point(4, 1)',
		`P = point(${p})`,
		`d = parallele(P, A, B) ${option}`
	];
	await playSteps(
		page,
		line,
		script('@euclide @double_perpendiculaire'),
		'@euclide @double_perpendiculaire',
		any(
			matching(
				/perpendiculaire e à|petit arc coupe e en D|On trace un arc de centre|Les arcs se croisent en R/
			),
			last
		)
	);
	await playSteps(
		page,
		line,
		script('@equerre @double_perpendiculaire'),
		'@equerre @double_perpendiculaire',
		any(matching(/glisser|perpendiculaire e à|pose l'équerre avec un bord/), last)
	);
	const texts = await playSteps(
		page,
		line,
		script('@equerre @double_perpendiculaire', '2, 0.5'),
		'P = (2 ; 0,5) sur (AB)',
		last
	);
	expect(texts.join(' ')).toContain('P est sur la droite (AB)');
});
