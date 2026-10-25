import { expect, test, type Page } from '@playwright/test';
import {
	calc,
	expectLatex,
	expectLatexContaining,
	hasSteps,
	normalizeLatex,
	openAtelier,
	steps
} from './helpers/atelier';

/**
 * La console de l'Atelier — lignes de `docs/wip/verifications-manuelles.md`
 * ===========================================================================
 *
 * Un test par ligne, son numéro de PR dans le titre. L'attendu est celui de
 * la ligne : un test rouge est un bug ou une ligne périmée, à signaler à
 * David — jamais un attendu à changer pour passer.
 *
 * Chaque test part d'une page neuve : une valeur posée (`a = 2`) ne déborde
 * pas sur le suivant.
 */

test.beforeEach(async ({ page }) => {
	await openAtelier(page);
});

/** Les étapes contiennent ce texte (formules `$…$` comprises, espaces ignorés) */
function expectStepsContaining(text: string, expected: string): void {
	expect(normalizeLatex(text)).toContain(normalizeLatex(expected));
}

function expectStepsNotContaining(text: string, unexpected: string): void {
	expect(normalizeLatex(text)).not.toContain(normalizeLatex(unexpected));
}

async function simplified(page: Page, input: string, expected: string, step: string) {
	const answer = await calc(page, `.simplifier ${input}`);
	expectLatex(answer, expected);
	expectStepsContaining(await steps(answer), step);
}

test('#1717 — intégrale à coefficient décimal : réponse décimale', async ({ page }) => {
	const half = await calc(page, '.intégrer 0,5x de 0 à 1');
	expectLatex(half, '0{,}25');
	// « Comment ? » finit sur « = 0,25 » : la dernière formule du détail
	const detail = normalizeLatex(await steps(half));
	const last = detail.lastIndexOf('\\end{aligned}');
	expect(detail.slice(0, last)).toMatch(/=0\{,\}25$/);

	expectLatex(await calc(page, '.intégrer 0,2x+1 de 0 à 2'), '2{,}4');
	expectLatex(await calc(page, '.intégrer 0,5x^2 de 0 à 1'), '\\dfrac{1}{6}');
	// Pas de décimal devant un irrationnel
	expectLatex(await calc(page, '.intégrer 0,5e^x de 0 à 1'), '\\dfrac{e - 1}{2}');
	expectLatex(await calc(page, '.intégrer 0,5x de 0 à π'), '\\dfrac{\\pi^2}{4}');
	expectLatex(await calc(page, '.intégrer x de 0 à 1'), '\\dfrac{1}{2}');
});

test('#1743 (5f-5) — puissances à exposant fractionnaire, quotients d’exponentielles', async ({
	page
}) => {
	expectLatex(await calc(page, '2^{0,5}'), '\\sqrt{2}');
	expectLatex(await calc(page, '8^{1/2}'), '2\\sqrt{2}');
	expectLatex(await calc(page, '2^{3/2}'), '2\\sqrt{2}');
	expectLatex(await calc(page, '2^{0,5}x'), '\\sqrt{2}\\,x');
	expectLatex(await calc(page, '27^{2/3}'), '9');
	expectLatex(await calc(page, '2^{1/3}'), '2^{\\frac{1}{3}}');

	await simplified(page, '2^{0,5}', '\\sqrt{2}', 'On écrit la puissance avec une racine carrée');
	await simplified(page, 'e^{2x}/e^x', 'e^x', 'aᵐ / aⁿ = aᵐ⁻ⁿ');
	expectLatex(await calc(page, '.simplifier e^x*e'), 'e^{x+1}');
	expectLatex(await calc(page, '.simplifier e^x/e^{x+1}'), '\\dfrac{1}{e}');
	// Réduction de fraction, pas aᵐ / aⁿ
	const two = await calc(page, '.simplifier 2/2');
	const twoSteps = await steps(two);
	expectStepsContaining(twoSteps, 'On réduit la fraction');
	expectStepsNotContaining(twoSteps, 'aᵐ / aⁿ');
});

test('#1749 (M2) — produits et quotients d’exponentielles avec facteurs', async ({ page }) => {
	await simplified(page, 'x*e^x*e', 'x\\,e^{x+1}', 'aᵐ · aⁿ = aᵐ⁺ⁿ');
	await simplified(page, '3e^{2x}/e^x', '3e^x', 'aᵐ / aⁿ = aᵐ⁻ⁿ');
	expectLatex(await calc(page, '.simplifier \\frac{e^{2x}}{3e^x}'), '\\dfrac{e^x}{3}');
	await simplified(page, '\\frac{6\\cdot2^x}{2}', '3 \\times 2^x', 'On réduit la fraction');
	expectLatex(await calc(page, '.simplifier 2^x*3*2'), '6 \\times 2^x');
});

test('#1674 — exponentielles regroupées (Q29)', async ({ page }) => {
	expectLatex(await calc(page, '.simplifier e^x*e^x'), 'e^{2x}');
	expectLatex(await calc(page, '.simplifier 3e^x*2e^x'), '6e^{2x}');
	// La correction n'écrit pas (eˣ)²·… quand un regroupement a lieu
	const derivative = await calc(page, '.dériver (e^x)^2');
	expectStepsNotContaining(await steps(derivative), '(e^x)^2\\times');
	// Tapé seul, il reste écrit
	expectLatex(await calc(page, '(e^x)^2'), '\\left(e^x\\right)^2');
});

test('#1682 — termes qui s’annulent (S3)', async ({ page }) => {
	expectLatex(await calc(page, '.simplifier x-x'), '0');
	expectLatex(await calc(page, '.simplifier 2ln(x)+3ln(x)'), '5\\ln(x)');
	// Une primitive de 1/x − 1/x (intégration pédagogique) → 0
	expectLatex(await calc(page, '.intégrer 1/x-1/x'), '0 + C');
});

test('#1656 — forme finale de f′ (partie console)', async ({ page }) => {
	expectLatex(await calc(page, '.dériver x*e^x'), '(x + 1)e^x');
	expectLatex(await calc(page, '.dériver (x-1)/x^2'), '\\dfrac{2 - x}{x^3}');
	expectLatex(await calc(page, '.dériver x^2/(x-1)^2'), '-\\dfrac{2x}{(x - 1)^3}');
	expectLatex(await calc(page, '.dériver 2x/(x^2-9)'), '-\\dfrac{2x^2 + 18}{(x^2 - 9)^2}');
	expectLatex(await calc(page, '.dériver x/e^x'), '\\dfrac{1 - x}{e^x}');
});

test('#1658, #1660 — dérivée factorisée pour les variations (console)', async ({ page }) => {
	const quotient = await calc(page, '.variations x^2/(x+1)');
	// Ligne de réponse factorisée
	expectLatexContaining(quotient, "f'(x) = \\dfrac{x(x + 2)}{(x + 1)^2}");
	const quotientSteps = await steps(quotient);
	expectStepsContaining(quotientSteps, 'Dérivée');
	expectStepsContaining(quotientSteps, '\\dfrac{x^2 + 2x}{(x + 1)^2}');
	expectStepsContaining(quotientSteps, 'On factorise pour étudier le signe');

	expectLatexContaining(await calc(page, '.variations x^3-3x'), "f'(x) = 3(x - 1)(x + 1)");
	expectLatex(await calc(page, '.dériver x^3-3x'), '3x^2 - 3');

	const composed = await calc(page, '.variations e^{x^2-1}');
	expectStepsNotContaining(await steps(composed), 'On factorise');

	const product = await calc(page, '.variations x*e^{-x^2}');
	expectLatexContaining(product, "f'(x) = (1 - 2x^2)e^{-x^2}");
	expectStepsNotContaining(await steps(product), 'On factorise');

	expectLatex(await calc(page, '.dériver -x^2/(x+2)'), '-\\dfrac{x^2 + 4x}{(x + 2)^2}');
});

test('#1625 — racine d’un décimal, décimaux sous une barre à variable', async ({ page }) => {
	expectLatex(await calc(page, 'sqrt(0.5)'), '\\dfrac{\\sqrt{2}}{2}');
	expectLatex(await calc(page, 'sqrt(0.25)'), '0{,}5');
	expectLatex(await calc(page, '.simplifier 0.5/x'), '\\dfrac{0{,}5}{x}');
});

test('#1302 — résoudre avec un paramètre', async ({ page }) => {
	expectLatex(
		await calc(page, '.résoudre e^(2x+1)=a'),
		'x = \\dfrac{\\ln(a) - 1}{2} \\quad \\text{si } a > 0'
	);
	// Avant : 1000
	expectLatex(await calc(page, '.résoudre \\log_2(x)=3'), 'x = 8');
	const square = await calc(page, '.résoudre x^2=a');
	expectLatex(
		square,
		'S = \\left\\{ \\sqrt{a} \\,;\\, -\\sqrt{a} \\right\\} \\quad \\text{si } a \\geqslant 0'
	);
	expect(square.text).not.toContain('Delta');
});

test('#1319 — fonctions nommées k, q appelées dans Calcul', async ({ page }) => {
	await calc(page, 'k(x) = x+1');
	expectLatex(await calc(page, 'k(0)'), '1');
	await calc(page, 'q(x) = 2x');
	expectLatex(await calc(page, 'q(3)'), '6');
	// Comme avant
	expectLatex(await calc(page, "k'(3)"), '1');
	expectLatex(await calc(page, '.dériver k(x)'), '1');
});

test('#1502 — l’unité Ko', async ({ page }) => {
	const kilo = await calc(page, '5 Ko');
	expectLatex(kilo, '5~\\mathrm{Ko}');
	expect(kilo.text).not.toContain('Unité inconnue');
	await calc(page, '5[Ko]');
	expectLatexContaining(await calc(page, '.convertir o'), '= 5000~\\mathrm{o}');
});

test('#1345 — intégrales : constante sortie, intégrande entre parenthèses', async ({ page }) => {
	const quotient = await calc(page, '.intégrer \\frac3x');
	const quotientSteps = await steps(quotient);
	expectStepsContaining(quotientSteps, 'On sort la constante $3$');
	expectStepsContaining(quotientSteps, '\\int \\dfrac{3}{x}\\,dx = 3 \\int \\dfrac{1}{x}\\,dx');

	// La première ligne écrit l'intégrande entre parenthèses : plus de `\int -`
	const sine = await steps(await calc(page, '.intégrer -3\\sin(x+2)'));
	expectStepsContaining(sine, '\\int \\left( -3 \\sin');
	expectStepsNotContaining(sine, '\\int -');

	expectStepsContaining(
		await steps(await calc(page, '.intégrer e^{2x}')),
		"On fait apparaître $u'$"
	);
});

test('#1350 — « On sort le signe − », jamais la constante −1', async ({ page }) => {
	for (const input of ['-e^x', '-\\frac{1}{x+1}', 'xe^{-x}']) {
		const detail = await steps(await calc(page, `.intégrer ${input}`));
		expectStepsContaining(detail, 'On sort le signe $-$');
		expectStepsNotContaining(detail, 'constante $-1$');
		expectStepsNotContaining(detail, '(-1)');
	}
	expectStepsContaining(
		await steps(await calc(page, '.intégrer -2e^x')),
		'On sort la constante $-2$'
	);
});

test('#1351 — .évaluer répond en formule', async ({ page }) => {
	const square = await calc(page, '.évaluer x^2 en x=3');
	expectLatex(square, '9');
	expect(square.text).not.toContain('Result');
	expectLatex(await calc(page, '.évaluer x^2 en x=1,5'), '2{,}25');
	await calc(page, 'f(x) = 3x^2');
	expectLatex(await calc(page, '.évaluer f en x=2'), 'f(2) = 12');

	const forbidden = await calc(page, '.évaluer \\frac{x+1}{x-1} en x=1');
	expect(forbidden.text).toContain("est une valeur interdite : le dénominateur s'annule");
	expect((await calc(page, '.évaluer \\sqrt{x} en x=-1')).refused).toBe(true);
});

test('#1362, #1363 — limites dites en phrases', async ({ page }) => {
	const logarithm = await calc(page, '.limite ln(x) en 0');
	expectLatexContaining(logarithm, 'x\\to 0^+');
	expectLatexContaining(logarithm, '= -\\infty');
	expectLatexContaining(
		await calc(page, '.limite sqrt(x) en -1'),
		"\\text{ : l'expression n'est pas définie au voisinage de } -1"
	);
	expectLatexContaining(
		await calc(page, '.limite sin(x) en +∞'),
		"\\text{ : l'expression oscille sans se rapprocher d'aucune valeur}"
	);
});

test('#1364 — .évaluer avec deux lettres', async ({ page }) => {
	const two = await calc(page, '.évaluer 2a+3b en a=1,5 ; b=2');
	expectLatex(two, '9');
	// « Comment ? » commence par le remplacement
	expectStepsContaining(await steps(two), 'Étape 1 On remplace $a$ par $1{,}5$ et $b$ par $2$');
	const comma = await calc(page, '.évaluer 2a+3b en a=1,5, b=2');
	expect(comma.text).toContain('Sépare les valeurs avec « ; »');
});

test('#1365 — fonction à paramètre non posé', async ({ page }) => {
	await calc(page, 'f(x) = a x');
	expectLatex(await calc(page, '.dériver f'), 'a');
	expectLatex(await calc(page, 'f(2)'), '2a');
	const pending = await calc(page, '.variations f');
	expect(pending.text).toContain(
		"Le résultat dépend de a : donne-lui une valeur (a = 2) pour l'étudier."
	);
	await calc(page, 'a = 2');
	const answered = await calc(page, '.variations f');
	expect(answered.refused).toBe(false);
	expectLatexContaining(answered, "f'(x) = 2");
});

test('#1372 — .développer', async ({ page }) => {
	expectLatex(await calc(page, '.développer (2x-1)(x+3)'), '2x^2 + 5x - 3');
	expectLatex(await calc(page, '.développer (a+b)^2'), 'a^2 + 2ab + b^2');
	expectLatex(await calc(page, '.développer -(x+1)'), '-x - 1');
	expectLatex(await calc(page, '.développer (0,5x+1)^2'), '0{,}25x^2 + x + 1');

	const done = await calc(page, '.développer x^2+1');
	expect(done.text).toContain('« x^2+1 » est déjà développée et réduite.');
	expect(done.refused).toBe(false);
	const equation = await calc(page, '.développer (x+1)^2=4');
	expect(equation.refused).toBe(true);
	expect(equation.text).toContain('.résoudre (x+1)^2=4');

	// Taper `.dév` : la liste propose « développer »
	await page.getByLabel('Calcul, définition ou commande').fill('.dév');
	await expect(
		page.getByRole('listbox', { name: 'Commandes disponibles' }).getByRole('option', {
			name: /\.développer/
		})
	).toBeVisible();
	await page.getByLabel('Calcul, définition ou commande').fill('');

	// `.aide` la montre dans « Calculer »
	const help = await calc(page, '.aide');
	expect(help.text).toMatch(/ Calculer .*\.développer .* Étudier une fonction/);
});

test('#1371 — limites de partie entière et de signe', async ({ page }) => {
	const floor = await calc(page, '.limite floor(x) en 1');
	expectLatex(floor, '\\text{Pas de limite en } 1 \\text{ : à gauche } 0 \\text{, à droite } 1');
	expectLatexContaining(await calc(page, '.limite floor(x) en 1^+'), '= 1');
	expectLatex(
		await calc(page, '.limite sign(x) en 0'),
		'\\text{Pas de limite en } 0 \\text{ : à gauche } -1 \\text{, à droite } 1'
	);
	const pi = await calc(page, '.limite floor(x) en \\pi');
	expectLatexContaining(pi, '= 3');
	const unknown = await calc(page, '.limite floor(floor(x)/2) en 1');
	expect(unknown.text).toContain('Je ne sais pas calculer cette limite.');
	// Pas de « Comment ? » sur ces lignes
	for (const line of [floor, pi, unknown]) expect(await hasSteps(line)).toBe(false);
});

test('#1373 — intégrales avec un paramètre a', async ({ page }) => {
	expectLatex(
		await calc(page, '.intégrer 1/(x^2+a^2) de 1 à 2'),
		'\\dfrac{\\arctan(\\dfrac{2}{a}) - \\arctan(\\dfrac{1}{a})}{a} \\quad (a \\neq 0)'
	);
	expectLatex(
		await calc(page, '.intégrer 1/(a x) de 1 à 2'),
		'\\dfrac{\\ln(2)}{a} \\quad (a \\neq 0)'
	);
	expectLatex(
		await calc(page, '.intégrer x^a de 1 à 2'),
		'\\dfrac{2^{a + 1} - 1}{a + 1} \\quad (a \\neq -1)'
	);
	expect((await calc(page, '.intégrer (x-a)^(-1) de 0 à 1')).refused).toBe(true);
	expect((await calc(page, '.intégrer ln(x-a) de 1 à 2')).refused).toBe(true);
	// Refus en français
	const unknown = await calc(page, '.intégrer 1/(x^2+a^2+1) de 0 à 1');
	expect(unknown.refused).toBe(true);
	expect(unknown.text).not.toMatch(/\b(cannot|error|unable|failed|unknown)\b/i);
});

test('#1655 — dérivées à coefficients décimaux (partie console)', async ({ page }) => {
	expectLatex(await calc(page, '.dériver 0,5x^2-1,5x'), 'x - 1{,}5');
	expectLatex(await calc(page, '.dériver -4,9x^2+20x'), '20 - 9{,}8x');
	expectLatex(await calc(page, '.dériver x^2/1,5'), '\\dfrac{4x}{3}');
});
