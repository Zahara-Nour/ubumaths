import { expect, test, type Page } from '@playwright/test';
import {
	calc,
	card,
	cardAction,
	cardLocator,
	expectLatex,
	expectLatexContaining,
	hasSteps,
	normalizeLatex,
	openAtelier,
	steps,
	stepsAs,
	type Answer
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

/**
 * Clique « Simplifier pour x ≠ … » (#1807 : la fraction reste, la
 * simplification sous condition est au bouton) et rend le LaTeX affiché après.
 */
async function simplifyFor(answer: Answer, condition: string): Promise<string> {
	await answer.line.getByRole('button', { name: `Simplifier pour ${condition}` }).click();
	const math = answer.line.locator('.reponse .math');
	await expect(answer.line.getByRole('button', { name: 'Sans simplifier' })).toBeVisible();
	return normalizeLatex((await math.getAttribute('data-latex')) ?? '');
}

/** Les étapes contiennent ce texte (formules `$…$` comprises, espaces ignorés) */
function expectStepsContaining(text: string, expected: string): void {
	expect(normalizeLatex(text)).toContain(normalizeLatex(expected));
}

/**
 * Les étapes ne contiennent pas ce texte — sur un détail NON VIDE : sans cette
 * garde, un détail vide ou mal lu passerait toujours.
 */
function expectStepsNotContaining(text: string, unexpected: string): void {
	expect(text).toContain('Étape 1 ');
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
	expect(last).toBeGreaterThan(-1);
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
	const derivativeSteps = await steps(derivative);
	expectStepsNotContaining(derivativeSteps, '(e^x)^2\\times');
	expectStepsNotContaining(derivativeSteps, '(e^x)^2\\cdot');
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

test('#1253 — équations avec une valeur absolue', async ({ page }) => {
	const five = await calc(page, '.résoudre |2x+1|=5');
	expectLatex(five, 'S = \\left\\{ -3 ; 2 \\right\\}');
	const fiveSteps = await steps(five);
	expectStepsContaining(fiveSteps, 'Deux nombres ont pour valeur absolue $5$ : $5$ et $-5$');
	expectStepsContaining(fiveSteps, 'On résout $2x + 1 = 5$');
	expectStepsContaining(fiveSteps, 'On résout $2x + 1 = -5$');
	// Les deux branches à plat : une seule numérotation, pas de sous-étapes
	expect(fiveSteps.split('Étape 1 ')).toHaveLength(2);

	const negative = await calc(page, '.résoudre |x|=-2');
	expectLatex(negative, 'S = \\emptyset');
	expectStepsContaining(await steps(negative), 'Une valeur absolue est positive ou nulle');
});

test('#1278, #1279 — inéquations : terme soustrait en bleu, relation gardée', async ({ page }) => {
	const first = await calc(page, '.résoudre 3x-4\\leq 2x+1');
	expectLatex(first, 'x \\leqslant 5');
	const firstSteps = await steps(first);
	expectStepsContaining(firstSteps, 'On soustrait $2x$ aux deux membres');
	expectStepsContaining(firstSteps, '3x - 4 \\textcolor{blue}{- 2x}');
	expectStepsNotContaining(firstSteps, '+ -2x');

	for (const input of ['3x-4\\leq 2x+1', '2x^2<2', '-2x^2\\geq -8']) {
		const answer = await calc(page, `.résoudre ${input}`);
		const detail = await steps(answer);
		// Aucune ligne alignée en « = » (« = 0 ») ni « >= » / « <= » à la place de la relation
		expectStepsNotContaining(detail, '&=');
		expectStepsNotContaining(detail, '>=');
		expectStepsNotContaining(detail, '<=');
	}

	const reversed = await calc(page, '.résoudre -2x^2\\geq -8');
	expectLatex(reversed, 'S = [-2 ; 2]');
	const reversedSteps = await steps(reversed);
	expectStepsContaining(reversedSteps, '-2x^2 + 8 &\\geqslant 0');
	expectStepsContaining(
		reversedSteps,
		'Comme $-2$ est négatif, l’opérateur de l’inéquation est retourné'
	);
});

test('#1282 — inéquation à valeur interdite : pas de « Comment ? »', async ({ page }) => {
	const forbidden = await calc(page, '.résoudre \\frac{2x^3}{x}<2');
	expectLatex(forbidden, 'S = ]-1 ; 0[ \\cup ]0 ; 1[');
	expect(await hasSteps(forbidden)).toBe(false);
	expect(await hasSteps(await calc(page, '.résoudre 2x^2<2'))).toBe(true);
});

test('#1300 — commandes de /cas absentes, .latex sans expression', async ({ page }) => {
	await calc(page, 'a = 3');
	const erase = await calc(page, '.effacer');
	expect(erase.refused).toBe(true);
	expect(erase.text).toContain("« .effacer » n'est pas une commande");
	expectLatex(await calc(page, 'a+1'), '4');

	// La liste des commandes, ouverte sur `.lat`, se ferme sur `.pose` : plus de `.poser`
	const field = page.getByLabel('Calcul, définition ou commande');
	const commands = page.getByRole('listbox', { name: 'Commandes disponibles' });
	await field.fill('.lat');
	await expect(commands.getByRole('option', { name: /\.latex/ })).toBeVisible();
	await field.fill('.pose');
	await expect(commands).toBeHidden();

	// `.latex` puis Entrée complète la commande ; la seconde Entrée la lance
	const lines = page.locator('ol.historique > li');
	const before = await lines.count();
	await field.fill('.latex');
	await field.press('Enter');
	await expect(page.getByText('Modèle : Écrire une expression en LaTeX')).toBeVisible();
	await expect(lines).toHaveCount(before);
	await field.press('Enter');
	await expect(lines).toHaveCount(before + 1);
	await expect(lines.nth(before)).toContainText("Écris l'expression après la commande");
	await expect(lines.nth(before)).toHaveClass(/refus/);

	expectLatex(await calc(page, 'sqrt(2)*sqrt(8)'), '4');
});

test('#1321 — quantités de données', async ({ page }) => {
	expectLatex(await calc(page, '2^10[o]'), '1024~\\mathrm{o}');
	await calc(page, '1[Kio]');
	expectLatex(await calc(page, '.convertir o'), '1~\\mathrm{Kio} = 1024~\\mathrm{o}');
	const mixed = await calc(page, '5[Mo]+3[m]');
	expect(mixed.refused).toBe(true);
	expect(mixed.text).toContain('quantité de données');
});

test('#1483 — unité écrite après un nombre, lettre posée', async ({ page }) => {
	expectLatex(await calc(page, '10^3 m'), '1000~\\mathrm{m}');
	expectLatex(await calc(page, '(1+2) m'), '3~\\mathrm{m}');
	expectLatex(await calc(page, '2π m'), '2 \\pi~\\mathrm{m}');
	expectLatex(await calc(page, '2^10 o'), '1024~\\mathrm{o}');
	await calc(page, 'm = 70');
	await calc(page, 'g = 10');
	// Des valeurs, pas des grammes
	expectLatex(await calc(page, 'm g'), '700');
	await calc(page, 'r = 3');
	// m posée : un produit (2π × 3 × 70), pas des mètres
	expectLatex(await calc(page, '2πr m'), '420 \\pi');
	expectLatex(await calc(page, '2πr[m]'), '6 \\pi~\\mathrm{m}');
});

test('#1326 — intégrale sur un intervalle qui contient une valeur interdite', async ({ page }) => {
	const refusal = await calc(page, '.intégrer \\frac1x de -1 à 1');
	expect(refusal.refused).toBe(true);
	expect(refusal.text).toContain("L'intégrale diverge ou n'est pas définie sur [-1 ; 1]");
	const forbidden =
		'\\text{La fonction n’est pas définie en } x = 0 \\text{, qui appartient à } \\left[ -1 ; 1 \\right]';
	const why = 'Le théorème fondamental ne s’applique';
	const detailed = await steps(refusal);
	expectStepsContaining(detailed, forbidden);
	expectStepsContaining(detailed, why);
	// « Résumé » retire l'explication, garde l'étape
	const summarized = await stepsAs(refusal, 'Résumé');
	expectStepsContaining(summarized, forbidden);
	expectStepsNotContaining(summarized, why);
	expectStepsContaining(await stepsAs(refusal, 'Détaillé'), why);
});

test('#1329 — « On fait apparaître u′ », ln avec ou sans valeur absolue', async ({ page }) => {
	const exponential = await calc(page, '.intégrer e^{2x}');
	expectLatex(exponential, '\\dfrac{1}{2} e^{2 x} + C');
	expectStepsContaining(await steps(exponential), "On fait apparaître $u'$");

	const quotient = await calc(page, '.intégrer \\frac{x}{x^2+1}');
	expectLatex(quotient, '\\dfrac{1}{2} \\ln\\left( x^2 + 1 \\right) + C');
	expectStepsContaining(await steps(quotient), "On fait apparaître $u'$");

	const product = await calc(page, '.intégrer xe^{2x}');
	expectLatex(product, '\\dfrac{1}{2} x e^{2 x} - \\dfrac{1}{4} e^{2 x} + C');
	expectStepsContaining(await steps(product), "On fait apparaître $u'$");

	// u peut s'annuler : la réponse de la ligne écrit |…| comme les étapes
	const absolute = await calc(page, '.intégrer \\frac{2x}{x^2-1}');
	expectLatex(absolute, '\\ln\\left| x^2 - 1 \\right| + C');
	expectStepsContaining(await steps(absolute), '= \\ln\\left| x^2 - 1 \\right|');
});

test('#1333 — singularité dans l’intervalle d’intégration', async ({ page }) => {
	const pole = await calc(page, '.intégrer \\frac{3x^2}{x^3-2} de 1 à 2');
	expect(pole.refused).toBe(true);
	expect(pole.text).toContain('singularité en x ≈ 1,26');
	expectLatex(await calc(page, '.intégrer \\frac{x}{\\sqrt{1-x^2}} de 0 à 1'), '1');
});

test('#1334 — intégration par parties : u, v′, u′, v', async ({ page }) => {
	const parts = await calc(page, '.intégrer xe^x de 0 à 1');
	expectLatex(parts, '1');
	const partsSteps = await steps(parts);
	expectStepsContaining(
		partsSteps,
		"On pose $u(x) = x$ et $v'(x) = e^x$, donc $u'(x) = 1$ et $v(x) = e^x$"
	);
	expectStepsContaining(partsSteps, "u'(x)v(x)");

	const pole = await calc(page, '.intégrer \\frac{3x^2}{x^3-2} de 1 à 2');
	expectStepsContaining(await steps(pole), 'x \\approx 1{,}26');
});

test('#1347, #1349 — .domaine en formule', async ({ page }) => {
	const quotient = await calc(page, '.domaine \\frac{\\ln x}{x-2}');
	expectLatex(quotient, 'D = ]0 ; +\\infty[ \\setminus \\left\\{2\\right\\}');
	expect(quotient.text).not.toContain('Condition');
	const quotientSteps = await steps(quotient);
	expectStepsContaining(quotientSteps, 'Étape 1 Contrainte du logarithme népérien');
	expectStepsContaining(quotientSteps, 'Étape 2 Contrainte de la division');
	expectStepsContaining(quotientSteps, '\\mathbb{R} \\setminus \\left\\{2\\right\\}');
	expectStepsContaining(quotientSteps, 'Étape 3 Intersection des contraintes');
	expect(quotientSteps).not.toContain('Étape 4');

	expectLatex(
		await calc(page, '.domaine \\tan x'),
		'D = \\mathbb{R}\\setminus\\left\\{\\frac{\\pi}{2}+k\\pi,\\ k\\in\\mathbb{Z}\\right\\}'
	);
	const alpha = await calc(page, '.domaine \\frac{1}{x^3-2}');
	expectLatex(
		alpha,
		'D = \\mathbb{R} \\setminus \\left\\{\\alpha\\right\\} \\text{ avec } \\alpha \\approx 1{,}26'
	);
	expect(await hasSteps(alpha)).toBe(false);
	const unknown = await calc(page, '.domaine \\sqrt{\\sin x}');
	expect(unknown.refused).toBe(true);
	expect(unknown.text).toContain('Je ne sais pas encore déterminer ce domaine.');
});

test('#1353, #1357 — .évaluer : remplacement puis une opération par étape', async ({ page }) => {
	const trinomial = await calc(page, '.évaluer 2x^2-3x+1 en x=-1');
	expectLatex(trinomial, '6');
	const detailed = await steps(trinomial);
	expectStepsContaining(detailed, 'Étape 1 On remplace $x$ par $-1$');
	expectStepsContaining(detailed, '\\left( -1 \\right) \\times \\left( -1 \\right)');
	expectStepsContaining(detailed, "Soustraire $-3$, c'est ajouter $3$");
	const summarized = await stepsAs(trinomial, 'Résumé');
	expectStepsContaining(summarized, 'On remplace $x$ par $-1$');
	expectStepsContaining(summarized, 'On effectue les calculs');
	expectStepsNotContaining(summarized, 'Soustraire $-3$');

	const product = await calc(page, '.évaluer x(x-1) en x=-2');
	expectLatex(product, '6');
	// Le remplacement, écrit avec ses parenthèses, est dans les deux rédactions
	const replaced = 'On remplace $x$ par $-2$ \\left( -2 \\right) \\left( -2 - 1 \\right)';
	await steps(product);
	expectStepsContaining(await stepsAs(product, 'Détaillé'), replaced);
	expectStepsContaining(await stepsAs(product, 'Résumé'), replaced);

	const exponential = await calc(page, '.évaluer e^x en x=0');
	expectLatex(exponential, '1');
	expect(await hasSteps(exponential)).toBe(false);
});

test('#1361 — .limite dans la console', async ({ page }) => {
	expectLatex(
		await calc(page, '.limite (x^2-1)/(x-1) en 1'),
		'\\lim\\limits_{x\\to 1} \\dfrac{x^2 - 1}{x - 1} = 2'
	);
	expect((await calc(page, '.limite 1/x en 0')).text).toContain(
		'Pas de limite en 0 : à gauche −∞, à droite +∞'
	);
	expectLatex(
		await calc(page, '.limite x^2 en 3/4-'),
		'\\lim\\limits_{x\\to {\\tfrac{3}{4}}^-} x^2 = \\dfrac{9}{16}'
	);
	expect((await calc(page, '.aide')).text).toContain('.limite');
});

test('5f-4 — « Comment ? » de .résoudre : décimaux et radicaux gardés', async ({ page }) => {
	const decimal = await calc(page, '.résoudre 2x=0,6');
	expectLatex(decimal, 'x = 0{,}3');
	expectStepsContaining(await steps(decimal), 'Solution : $x = 0{,}3$');

	const affine = await calc(page, '.résoudre 0,5x+1=2');
	const affineSteps = await steps(affine);
	expectStepsContaining(affineSteps, '0{,}5x &= 1');
	expectStepsContaining(affineSteps, 'On divise les deux membres par $0{,}5$');

	// La dernière étape écrit S comme la ligne
	const square = await calc(page, '.résoudre 2x^2=1');
	const solutions = 'S = \\left\\{ -\\dfrac{\\sqrt{2}}{2} \\,;\\, \\dfrac{\\sqrt{2}}{2} \\right\\}';
	expectLatex(square, solutions);
	expectStepsContaining(await steps(square), `Solutions ${solutions}`);

	const trinomial = await calc(page, '.résoudre x^2-x-1=0');
	const trinomialSteps = await steps(trinomial);
	expectStepsContaining(trinomialSteps, 'On simplifie les solutions');
	expectStepsContaining(trinomialSteps, '= \\dfrac{1 - \\sqrt{5}}{2}');

	const absolute = await calc(page, '.résoudre |x/2-0,5|=1');
	expectStepsContaining(
		await steps(absolute),
		'On résout $\\dfrac{x}{2} - 0{,}5 = 1$ \\dfrac{x}{2} - 0{,}5 = 1'
	);

	expectLatex(await calc(page, '.résoudre 3x=2'), 'x = \\dfrac{2}{3}');
});

test('#1735 (Q50) — « Comment ? » de .résoudre sur une inéquation', async ({ page }) => {
	const square = await calc(page, '.résoudre x^2<0,5');
	const interval = 'S = ]-\\dfrac{\\sqrt{2}}{2} ; \\dfrac{\\sqrt{2}}{2}[';
	expectLatex(square, interval);
	const squareSteps = await steps(square);
	expectStepsContaining(squareSteps, 'x^2 - 0{,}5 &< 0');
	expectStepsContaining(squareSteps, `Solution : $${interval}$`);

	const trinomial = await calc(page, '.résoudre x^2-x-1<0');
	expectLatex(trinomial, 'S = ]\\dfrac{1 - \\sqrt{5}}{2} ; \\dfrac{1 + \\sqrt{5}}{2}[');
	const trinomialSteps = await steps(trinomial);
	expectStepsContaining(trinomialSteps, 'On dresse le tableau de signes');
	expectStepsContaining(trinomialSteps, '$\\dfrac{1 - \\sqrt{5}}{2}$');

	// Une vraie fraction, plus de « 1 / 2 »
	const rational = await calc(page, '.résoudre 1/(2x-1)>0');
	expectLatex(rational, 'S = ]\\dfrac{1}{2} ; +\\infty[');
	expect(rational.text).not.toContain('1 / 2');

	expectLatex(await calc(page, '.résoudre 2x<0,6'), 'x < 0{,}3');
	expectLatex(await calc(page, '.résoudre 2x<\\sqrt{2}'), 'x < \\dfrac{\\sqrt{2}}{2}');

	const decimalRoot = await calc(page, '.résoudre (x-0,5)/(x+1)>0');
	expectLatex(decimalRoot, 'S = ]-\\infty ; -1[ \\cup ]0{,}5 ; +\\infty[');
	expectStepsContaining(await steps(decimalRoot), '$-1$ $0{,}5$ $+\\infty$');
});

test('#1741 (Q51, Q52) — « Comment ? » de .résoudre : × ou ÷, développer', async ({ page }) => {
	async function firstMove(input: string, expected: string, move: string) {
		const answer = await calc(page, `.résoudre ${input}`);
		expectLatex(answer, expected);
		const detail = await steps(answer);
		expectStepsContaining(detail, `Étape 2 ${move}`);
		return detail;
	}

	await firstMove('x/4=0,5', 'x = 2', 'On multiplie les deux membres par $4$');
	await firstMove('x/3<0,1', 'x < 0{,}3', 'On multiplie les deux membres par $3$');
	await firstMove(
		'\\frac{2}{3}x=1',
		'x = \\dfrac{3}{2}',
		'On multiplie les deux membres par $\\dfrac{3}{2}$'
	);
	await firstMove('0,5x=1', 'x = 2', 'On divise les deux membres par $0{,}5$');
	const bracket = await firstMove('0,5(x+1)=2', 'x = 3', 'On divise les deux membres par $0{,}5$');
	expectStepsContaining(bracket, 'x + 1 &= 4');
	expectStepsContaining(bracket, 'Étape 3 On soustrait $1$ aux deux membres');
	await firstMove('-(x-3)=0', 'x = 3', 'On multiplie les deux membres par $-1$');
	await firstMove('2(x+1)+3=7', 'x = 1', 'On soustrait $3$ aux deux membres');
	await firstMove('3(x-1)=2x+1', 'x = 4', 'On développe');
	await firstMove('3+(x-1)=5', 'x = 3', 'On supprime les parenthèses');
	await firstMove(
		'-2(x+1)\\le4',
		'x \\geqslant -3',
		'On divise les deux membres par $-2$ (changement de sens car $-2$ est négatif)'
	);
});

test('#1710 — « Comment ? » de .limite : décimaux, facteur commun', async ({ page }) => {
	const half = await calc(page, '.limite (0,5x^2+1)/x^2 en +inf');
	expectLatexContaining(half, '= 0{,}5');
	const halfSteps = await steps(half);
	expectStepsContaining(halfSteps, 'x^2 \\left( 0{,}5 + \\dfrac{1}{x^2} \\right)');
	expectStepsContaining(halfSteps, 'La limite vaut $0{,}5$');
	expectStepsNotContaining(halfSteps, '\\frac{1}{2}');

	const quotient = await calc(page, '.limite (1,5x+2)/(3x-1) en +inf');
	expectLatexContaining(quotient, '= 0{,}5');
	const quotientSteps = await steps(quotient);
	expectStepsContaining(quotientSteps, '1{,}5 + \\dfrac{2}{x}');
	expectStepsContaining(quotientSteps, 'La limite vaut $0{,}5$');
	expectStepsNotContaining(quotientSteps, '\\frac{1}{2}');
	expectStepsNotContaining(quotientSteps, '\\frac{3}{2}');

	// Développé, factorisé, puis simplifié
	const common = await calc(page, '.limite ((x+1)^2-1)/x en 0');
	expectStepsContaining(
		await steps(common),
		'Simplification du facteur commun \\begin{aligned} & \\textcolor{blue}{\\lim_{x \\to 0} \\dfrac{\\left( x + 1 \\right)^2 - 1}{x}} \\\\ & = \\lim_{x \\to 0} \\dfrac{x^2 + 2 x}{x} \\\\ & = \\lim_{x \\to 0} \\dfrac{x \\left( x + 2 \\right)}{x} \\\\ & = \\lim_{x \\to 0} \\left( x + 2 \\right) \\end{aligned}'
	);

	const difference = await calc(page, '.limite (x^2-1)/(x-1) en 1');
	const differenceSteps = await steps(difference);
	expectStepsContaining(
		differenceSteps,
		'\\dfrac{\\left( x - 1 \\right) \\left( x + 1 \\right)}{x - 1} \\\\ & = \\lim_{x \\to 1} \\left( x + 1 \\right)'
	);

	const negative = await calc(page, '.limite (-0,5x^2+0,5)/(x-1) en 1');
	expectStepsContaining(await steps(negative), '-0{,}5 \\left( x + 1 \\right)');
});

test('#1709 — /calc retirée : redirigée vers /atelier', async ({ page }) => {
	for (const address of ['/calc', '/calc/', '/calc?share=abc']) {
		await page.goto(address);
		await expect(page).toHaveURL(/\/atelier$/);
	}
	const sum = await calc(page, '2+3*4');
	expectLatex(sum, '14');
	const sumSteps = await steps(sum);
	expectStepsContaining(sumSteps, '= 2 + 12');
	expectStepsContaining(sumSteps, '= 14');

	// Pages voisines, pas redirigées
	for (const address of ['/calcul', '/calculatrices']) {
		await page.goto(address);
		await expect(page).toHaveURL(new RegExp(`${address}$`));
	}
});

test('#1708 — primitives à coefficients décimaux, f′ factorisée', async ({ page }) => {
	expectLatex(await calc(page, '.intégrer 0,6x+1,2'), '0{,}3x^2 + 1{,}2x + C');
	expectLatex(
		await calc(page, '.intégrer 0,5x^2-1,5x'),
		'\\dfrac{1}{6} x^3 - \\dfrac{3}{4} x^2 + C'
	);
	expectLatex(await calc(page, '.intégrer -0,6x+1,2'), '-0{,}3x^2 + 1{,}2x + C');

	const parts = await calc(page, '.intégrer (x+1)e^x');
	expectStepsContaining(
		await steps(parts),
		'On simplifie \\left( x + 1 \\right) e^x - e^x = x e^x'
	);

	expectLatex(await calc(page, '.variations 0,5x^3-1,5x^2'), "f'(x) = 1{,}5 x (x - 2)");
});

test('#1703 — dérivées réduites, racine cubique', async ({ page }) => {
	expectLatex(await calc(page, '.dériver 1 - x e^x'), '-(x + 1)e^x');
	expectLatex(await calc(page, '.variations 1 - x e^x'), "f'(x) = -(x + 1)e^x");
	expectLatex(await calc(page, '.simplifier cbrt(x) - cbrt(x)'), '0');

	// En dernier : « Comment ? » de ce quotient tombe sur le bug de #1674
	const quotient = await calc(page, '.dériver x/(x+1)');
	expectLatex(quotient, '\\dfrac{1}{(x + 1)^2}');
	expectStepsNotContaining(await steps(quotient), 'x + 1 - x');
});

test('#1663 — valeur exacte affichée (console)', async ({ page }) => {
	expectLatex(await calc(page, '0,1+0,2'), '0{,}3');
	expectLatex(await calc(page, '2,50'), '2{,}5');
	expectLatex(await calc(page, '1/3+0,5'), '\\dfrac{5}{6}');
	expectLatex(await calc(page, '0,5*sqrt(2)'), '\\dfrac{\\sqrt{2}}{2}');
	expectLatex(await calc(page, '(1+sqrt(5))/2'), '\\dfrac{1 + \\sqrt{5}}{2}');
	expectLatex(await calc(page, '3*10^20'), '3 \\times 10^{20}');
	expectLatex(await calc(page, '1/(sqrt(3)-1)'), '\\dfrac{1 + \\sqrt{3}}{2}');
	expectLatex(await calc(page, 'ln(8)'), '3 \\ln(2)');
	expectLatex(await calc(page, 'ln(6)'), '\\ln(6)');

	expectLatex(
		await calc(page, '.résoudre x^2 = 0,5'),
		'S = \\left\\{ -\\dfrac{\\sqrt{2}}{2} \\,;\\, \\dfrac{\\sqrt{2}}{2} \\right\\}'
	);
	expectLatex(
		await calc(page, '.résoudre x^2-x-1=0'),
		'S = \\left\\{ \\dfrac{1 - \\sqrt{5}}{2} \\,;\\, \\dfrac{1 + \\sqrt{5}}{2} \\right\\}'
	);
	expectLatex(await calc(page, '.résoudre 2x = 0,6'), 'x = 0{,}3');
	expectLatexContaining(
		await calc(page, '.résoudre 2^n > 1000'),
		'n > \\dfrac{\\ln(1000)}{\\ln(2)}'
	);
});

test('#1673 (Q30) — la valeur avant la lettre dans un produit', async ({ page }) => {
	expectLatex(await calc(page, '.dériver log_2(x)'), '\\dfrac{1}{\\ln(2) x}');
	expectLatex(await calc(page, '.dériver 2^(x^2)'), '2 \\ln(2) x \\times 2^{x^2}');
	expectLatex(await calc(page, '.développer sqrt(2)(x+1)'), '\\sqrt{2} x + \\sqrt{2}');
});

test('#1620 — facteur commun simplifié avec sa condition', async ({ page }) => {
	// Depuis #1807, la fraction reste ; « Simplifier pour x ≠ … » donne le résultat et sa condition
	const ratio = await calc(page, '.simplifier x/x');
	expectLatex(ratio, '\\dfrac{x}{x}');
	expect(await simplifyFor(ratio, 'x ≠ 0')).toBe(
		normalizeLatex('1\\text{,}\\quad\\text{pour }x \\neq 0')
	);
	expectStepsContaining(await steps(ratio), 'On simplifie par le facteur commun, pour x ≠ 0');

	const factored = await calc(page, '.factoriser (x^2-1)/(x+1)');
	expectLatex(factored, '\\dfrac{\\left( x - 1 \\right) \\left( x + 1 \\right)}{x + 1}');
	expect(await simplifyFor(factored, 'x ≠ −1')).toBe(
		normalizeLatex('x - 1\\text{,}\\quad\\text{pour }x \\neq -1')
	);
	expectStepsContaining(await steps(factored), 'On simplifie par le facteur commun, pour x ≠ −1');

	expectLatex(await calc(page, '.dériver \\ln(3x)'), '\\dfrac{1}{x}');
	// Ordre de l'Atelier, retenu par David (2026-10-26)
	expectLatex(await calc(page, '.dériver x^x'), 'x^x(\\ln(x) + 1)');

	// En dernier : « Comment ? » de ce produit tombe sur le bug de #1674
	const product = await calc(page, '.dériver x\\ln(x)');
	expectLatex(product, '\\ln(x) + 1');
	expectStepsNotContaining(await steps(product), '\\frac{x}{x}');
});

test('#1624 — décimaux gardés (console)', async ({ page }) => {
	expectLatex(await calc(page, '0.5+0.25'), '0{,}75');
	expectLatex(await calc(page, '.simplifier 0.5x+0.25x'), '0{,}75 x');
	expectLatex(await calc(page, '.simplifier 0.5(x+1)'), '0{,}5 (x + 1)');
	expectLatex(
		await calc(page, '.résoudre 0.8^n<0.1'),
		'n > \\dfrac{\\ln(0{,}1)}{\\ln(0{,}8)} \\approx 10{,}32'
	);
	expectLatexContaining(await calc(page, '.limite (0.5x+1)/x en +inf'), '= 0{,}5');
});

test('#1628 — racine d’une fraction (console)', async ({ page }) => {
	expectLatex(await calc(page, '(2/3)^(1/2)'), '\\dfrac{\\sqrt{6}}{3}');
});

test('#1631 — ordre des termes (console)', async ({ page }) => {
	expectLatex(
		await calc(page, '.dériver cos(3x+π/4)'),
		'-3 \\sin\\left( 3 x + \\dfrac{\\pi}{4} \\right)'
	);
	expectLatex(
		await calc(page, '.intégrer 1/x + 1/(x+1) + 1/x'),
		'2 \\ln\\left| x \\right| + \\ln\\left| x + 1 \\right| + C'
	);
});

test('#1636 — la fonction avant l’exponentielle (console)', async ({ page }) => {
	expectLatex(await calc(page, '.dériver 2e^(sin(x))'), '2 \\cos(x) e^{\\sin(x)}');
	expectLatex(await calc(page, '.dériver 2^x'), '\\ln(2) \\times 2^x');
});

// =============================================================================
// Lot 6
// =============================================================================

test('#1784 — .développer sans normalize : décimaux, fractions, radicaux, complexes', async ({
	page
}) => {
	expectLatex(await calc(page, '.développer (2x-1)(x+3)'), '2 x^2 + 5 x - 3');
	expectLatex(await calc(page, '.développer (x+1)^3'), 'x^3 + 3 x^2 + 3 x + 1');
	expectLatex(await calc(page, '.développer 0,5x(x+0,2)'), '0{,}5 x^2 + 0{,}1 x');

	const half = await calc(page, '.développer (x+1)/2');
	expectLatex(half, '\\dfrac{1}{2} x + \\dfrac{1}{2}');
	expectStepsContaining(await steps(half), 'On distribue $\\dfrac{1}{2}$');

	for (const input of ['1/(x+1)+1', '(x^2-1)/(x+1)']) {
		expect((await calc(page, `.développer ${input}`)).text).toContain('rien à développer');
	}
	expectLatex(
		await calc(page, '.développer (x+1)(x-2)+1/(x+1)'),
		'x^2 - x - 2 + \\dfrac{1}{x + 1}'
	);
	expectLatex(await calc(page, '.développer (x+1/x)^2'), 'x^2 + 2 + \\dfrac{1}{x^2}');
	expectLatex(await calc(page, '.développer x(1/x-1)'), '-x + \\dfrac{x}{x}');
	expectLatex(
		await calc(page, '.développer (sqrt(x)+1)(sqrt(x)-1)'),
		'x - \\sqrt{x} + \\sqrt{x} - 1'
	);
	expectLatex(await calc(page, '.développer (sqrt(2)+sqrt(3))^2'), '5 + 2 \\sqrt{6}');
	expectLatex(await calc(page, '.développer (1+2i)(3-i)'), '5 + 5 \\imaginaryI');
	expectLatexContaining(
		await calc(page, '.développer e^(ln(x))(x+1)'),
		'\\exponentialE^{\\ln\\left( x \\right)}'
	);
});

test('#1684 — expression littérale au propre ; « Garder »', async ({ page }) => {
	const sum = await calc(page, '2x+3x');
	expectLatex(sum, '5 x');
	expectLatex(await calc(page, 'x*2'), '2 x');
	expectLatex(await calc(page, '3-2x+x^2'), '3 - 2 x + x^2');
	expectLatex(await calc(page, 'x/x'), '\\dfrac{x}{x}');
	const logs = await calc(page, 'ln(x)-ln(x)');
	expectLatex(logs, '\\ln\\left( x \\right) - \\ln\\left( x \\right)');
	expectLatex(await calc(page, 'sin^2(x)'), '\\sin\\left( x \\right)^2');

	// « Garder » crée une fonction : 5x, et ln(x) − ln(x) telle quelle
	await sum.line.getByRole('button', { name: 'Garder…' }).click();
	await expect(page.locator('p.retour')).toContainText('Gardé sous le nom « f »');
	expect(normalizeLatex((await card(page, 'f')).latex ?? '')).toBe('5x');
	await logs.line.getByRole('button', { name: 'Garder…' }).click();
	await expect(page.locator('p.retour')).toContainText('Gardé sous le nom « g »');
	expect(normalizeLatex((await card(page, 'g')).latex ?? '')).toBe(
		normalizeLatex('\\ln\\left( x \\right) - \\ln\\left( x \\right)')
	);
});

test('#1617 — .simplifier : telle quelle sans étapes, ou les étapes qu’il faut', async ({
	page
}) => {
	for (const [input, shown] of [
		['2(x+3)', '2 \\left( x + 3 \\right)'],
		['(x+1)^2', '\\left( x + 1 \\right)^2'],
		['x^2+2x+1', 'x^2 + 2 x + 1']
	]) {
		const same = await calc(page, `.simplifier ${input}`);
		expectLatex(same, shown);
		expect(await hasSteps(same)).toBe(false);
		expect(same.text).not.toMatch(/Custom|Hash/);
	}

	const developed = await calc(page, '.simplifier (x+1)^2-x^2');
	expectLatex(developed, '2 x + 1');
	expectStepsContaining(await steps(developed), 'On reconnaît (a + b)² = a² + 2ab + b²');

	// Depuis #1807, la fraction reste ; « Simplifier pour x ≠ −1 » donne x − 1 et ses deux étapes
	const fraction = await calc(page, '.simplifier (x^2-1)/(x+1)');
	expectLatex(fraction, '\\dfrac{x^2 - 1}{x + 1}');
	expect(await simplifyFor(fraction, 'x ≠ −1')).toBe(
		normalizeLatex('x - 1\\text{,}\\quad\\text{pour }x \\neq -1')
	);
	const fractionSteps = await steps(fraction);
	expectStepsContaining(
		fractionSteps,
		'Étape 1 On factorise pour faire apparaître un facteur commun'
	);
	expectStepsContaining(fractionSteps, 'Étape 2 On simplifie par le facteur commun, pour x ≠ −1');
	expect(fractionSteps).not.toContain('Étape 3');
	// Le résumé se déplie aussi, et garde la condition
	expectStepsContaining(await stepsAs(fraction, 'Résumé'), 'x ≠ −1');

	const plusOne = await calc(page, '.simplifier (x^2-1)/(x+1)+1');
	expect(await simplifyFor(plusOne, 'x ≠ −1')).toBe(
		normalizeLatex('x\\text{,}\\quad\\text{pour }x \\neq -1')
	);
	expectStepsContaining(
		await steps(await calc(page, '.simplifier sqrt(8)')),
		'On simplifie le radical'
	);
});

test('#1375 — « Comment ? » de .développer : distribuer, identité, signe −, résumé', async ({
	page
}) => {
	const product = await calc(page, '.développer (2x-1)(x+3)');
	const detailed = await steps(product);
	expectStepsContaining(detailed, 'On distribue');
	expectStepsContaining(detailed, '2 x \\times x + 2 x \\times 3 - 1 \\times x - 1 \\times 3');
	expectStepsContaining(detailed, 'On calcule chaque produit');
	expectStepsContaining(detailed, 'On réduit');
	// Le résumé retire les lignes à ×
	expectStepsNotContaining(await stepsAs(product, 'Résumé'), '\\times');

	await stepsAs(product, 'Détaillé');
	expectStepsContaining(
		await steps(await calc(page, '.développer (x+1)^2')),
		'On reconnaît (a + b)² = a² + 2ab + b², avec a = x et b = 1'
	);
	expectStepsContaining(
		await steps(await calc(page, '.développer 3(x-2)-(x+1)')),
		'le signe − devant la parenthèse change le signe de chaque terme'
	);
	const decimal = await steps(await calc(page, '.développer (0,5x+1)^2'));
	expectStepsContaining(decimal, '0{,}25 x^2');
	expectStepsNotContaining(decimal, '0.5');
});

test('#1366 — « Comment ? » de .limite ; limite non définie ; ln x sans parenthèses', async ({
	page
}) => {
	const limit = await calc(page, '.limite (x^2-1)/(x-1) en 1');
	const detailed = await steps(limit);
	expectStepsContaining(detailed, 'Forme indéterminée $\\frac{0}{0}$');
	expectStepsContaining(detailed, 'facteur commun');
	expectStepsContaining(detailed, 'La limite vaut $2$');
	const summary = await stepsAs(limit, 'Résumé');
	// Résumé : la technique, puis la conclusion
	expectStepsContaining(summary, 'Simplification du facteur commun');
	expectStepsContaining(summary, 'La limite vaut $2$');
	expect(summary.length).toBeLessThan(detailed.length);

	expect((await calc(page, '.limite sqrt(-x) en 0+')).text).toContain(
		'n’est pas définie à droite de 0'
	);
	const ln = await calc(page, '.limite ln x en 0');
	expect(ln.refused).toBe(true);
	expect(ln.text).toContain('écris ln(x) avec des parenthèses.');
});

test('#1503 — grandeurs : cartes en erreur, dépendances, retour à la normale', async ({ page }) => {
	await calc(page, 'b = 3[min] + 2[km]');
	expect((await card(page, 'b')).message).toBe('On ne peut pas ajouter une durée et une longueur.');
	await calc(page, 'c = 2b');
	expect((await card(page, 'c')).message).toContain('Dépend de « b »');
	await calc(page, 'r = 3[s]');
	await calc(page, 'd = r + 2[m]');
	expect((await card(page, 'd')).message).toBe('On ne peut pas ajouter une durée et une longueur.');
	await calc(page, 'r = 3[m]');
	await expect.poll(async () => (await card(page, 'd')).message).toBeNull();
});

test('#1535 — longueur plus durée : la carte en erreur', async ({ page }) => {
	await calc(page, 'b = 3[m]*π/2 + 1[s]');
	expect((await card(page, 'b')).message).toBe('On ne peut pas ajouter une longueur et une durée.');
});

test('#1342 — lignes en erreur ou en attente ; .réciproque de sin et tan', async ({ page }) => {
	const broken = await calc(page, 'h(x) = x^^2');
	expect(broken.refused).toBe(true);
	expect(broken.text).toContain('« h » est dans tes objets, mais elle est en erreur : ');
	expect((await calc(page, 'p(x) = q(x)+1')).text).toContain('en attente de « q »');

	await calc(page, 'f(x) = sin(x)');
	const sine = await calc(page, '.réciproque f');
	expect(sine.text).toContain('f(0) = f(π) = 0, donc 0 aurait plusieurs antécédents');
	expect(sine.text).toContain('arcsin');

	await calc(page, 'f(x) = tan(x) sur ]-1;4[');
	expect((await calc(page, '.réciproque f')).text).toMatch(/par exemple \][^[]*π\/2\[/);
});

test('#1367 — paramètre non défini : (a ≠ 0), dériver, carte f′ en attente, résoudre', async ({
	page
}) => {
	await calc(page, 'h(x) = e^{a x}');
	expectLatexContaining(await calc(page, '.intégrer h'), '(a \\neq 0)');
	expectLatex(await calc(page, '.dériver a x'), 'a');
	expect((await calc(page, '.résoudre a x = 3')).text).toContain('Le résultat dépend de a');
	expectLatex(await calc(page, '.résoudre x + a = 0'), 'x = -a');
	// En dernier (a = 2 posé ensuite) : la carte f′ attend a comme f, puis f′ = 2
	await calc(page, 'f(x) = a x');
	await cardAction(page, 'f', 'Dériver');
	await expect.poll(async () => (await card(page, 'f′')).message).toContain('En attente de « a »');
	await calc(page, 'a = 2');
	await expect.poll(async () => normalizeLatex((await card(page, 'f′')).latex ?? '')).toBe('2');
});

test('#1368 — ln x sans parenthèses refusé (clavier)', async ({ page }) => {
	for (const input of ['ln x', '.évaluer ln x en x=1']) {
		const refused = await calc(page, input);
		expect(refused.refused).toBe(true);
		expect(refused.text).toContain('« ln x » : écris ln(x) avec des parenthèses.');
	}
	expectLatex(await calc(page, 'ln(x)'), '\\ln\\left( x \\right)');
});

test('#1369 — fonction collée à son argument : refus qui dit quoi écrire (clavier)', async ({
	page
}) => {
	expect((await calc(page, 'sinx')).text).toContain(
		'« sinx » : écris sin(x) avec des parenthèses.'
	);
	expect((await calc(page, 'xlnx')).text).toContain('« lnx »');
	expect((await calc(page, 'log10(100)')).text).toContain('log est le logarithme décimal');
	expect((await calc(page, 'cos2π')).text).toContain('écris cos(');
	// Pas de faux refus « écris sin(x) » sur un mot qui commence par sin
	expect((await calc(page, 'sinus')).refused).toBe(false);
});

test('#1374 — définitions en erreur : circulaire, dépendance, fonction prise pour un nombre', async ({
	page
}) => {
	await calc(page, 'f(x) = f(x)+1');
	expect((await calc(page, '.dériver f')).text).toContain('« f » est mal définie');
	await calc(page, 'g(x) = f(x)+1');
	expect((await calc(page, 'g(2)')).text).toContain('g : Dépend de « f », qui est en erreur.');

	await calc(page, 'a(x) = x^2');
	await calc(page, 'f(x) = ax+1');
	const f = await card(page, 'f');
	expect(f.message).toContain('« a » est une fonction');
	expect(f.message).toContain('Écris a(x)');
	// Les actions de la carte grisées
	await cardLocator(page, 'f').getByRole('button', { name: 'Options de f' }).click();
	for (const action of ['Dériver', 'Réciproque', 'Tabuler', 'Variations']) {
		await expect(page.getByRole('menuitem', { name: new RegExp(`^${action}`) })).toHaveAttribute(
			'aria-disabled',
			'true'
		);
	}
	await page.keyboard.press('Escape');
	expect((await calc(page, 'h(x) = a_1 x')).refused).toBe(false);
	// La carte évaluée (sa formule affichée) avant de lire l'absence de message
	await expect.poll(async () => normalizeLatex((await card(page, 'h')).latex ?? '')).toBe('a_1x');
	await expect.poll(async () => (await card(page, 'h')).message).toBeNull();
});

test('#1404 — conversions, intégrales refusées, réciproque à paramètres', async ({ page }) => {
	expectLatex(await calc(page, '2,5 h en min'), '2{,}5~\\mathrm{h} = 150~\\mathrm{min}');
	await calc(page, '5 km');
	expect((await calc(page, '3 en m')).refused).toBe(true);
	expectLatex(await calc(page, '.convertir m'), '5~\\mathrm{km} = 5000~\\mathrm{m}');

	await calc(page, 'f(x) = x^3');
	await cardAction(page, 'f', 'Dériver');
	await expect.poll(async () => normalizeLatex((await card(page, 'f′')).latex ?? '')).toBe('3x^2');
	// L'image par f′ se lit dans la console (plus de champ d'image sur la carte, 2026-10-18)
	expectLatex(await calc(page, "f'(2)"), '12');

	expect((await calc(page, '.intégrer 1/t de -1 à 1')).text).toContain('t ≈ 0');
	expect((await calc(page, '.intégrer tan(x) de 0 à \\pi')).text).toContain('[0 ; π]');
	const unknown = await calc(page, '.intégrer 1/(x^2-2)');
	expect(unknown.refused).toBe(true);
	expect(unknown.text).toContain('Je ne sais pas calculer cette intégrale');
	expect((await calc(page, '.réciproque a x + b')).text).toContain('Le résultat dépend de a et b');
});

test('#1417 — Copier, Copier en LaTeX, valeur approchée copiée', async ({ page }) => {
	await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
	const clipboard = () => page.evaluate(() => navigator.clipboard.readText());
	const notice = page.locator('p.retour');

	const developed = await calc(page, '.développer (2x-1)(x+3)');
	await developed.line.getByRole('button', { name: 'Copier', exact: true }).click();
	await expect(notice).toHaveText('Copié.');
	expect(await clipboard()).toBe('2x² + 5x − 3');
	await developed.line.getByRole('button', { name: 'Autres façons de copier' }).click();
	await page.getByRole('menuitem', { name: 'Copier en LaTeX' }).click();
	await expect(notice).toHaveText('Copié en LaTeX.');
	expect(await clipboard()).toBe('2 x^2 + 5 x - 3');

	const root = await calc(page, '.dériver sqrt(x)');
	await root.line.getByRole('button', { name: 'Copier', exact: true }).click();
	await expect.poll(clipboard).toBe('1/(2√x)');

	const seventh = await calc(page, '1/7');
	await seventh.line.getByRole('button', { name: 'Valeur approchée' }).click();
	await seventh.line.getByRole('button', { name: 'Copier', exact: true }).click();
	await expect.poll(clipboard).toBe('≈ 0,1429');
});
