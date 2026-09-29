/**
 * Numération (N-DECOMP, N-FRACDEC) : briques de rédaction
 * ======================================================
 *
 * Textes RÉDIGÉS (pas générés), assemblés modèle par modèle dans les lots
 * `n-decomp` et `n-fracdec`. Idée commune : le TABLEAU DE NUMÉRATION — chaque
 * chiffre a un rang, et le rang donne sa valeur (× 10, × 100… ou 1/10, 1/100…).
 *
 * Couleurs (palette.ts) : les chiffres que l'on place et leurs valeurs en
 * `transformed` (orange) ; les rangs conclus, les zéros ajoutés et le facteur
 * d'amplification / de simplification en `intermediate` (bleu) ; la réponse
 * finale reste en noir.
 *
 * Pièges rencontrés (2026-09-29) :
 * - une variable nommée `e` est lue comme la constante d'Euler dans un `{{if:…}}`
 *   (même écrite `{{e}}`) : aucune condition ne peut porter sur elle ;
 * - une condition qui nomme une variable d'expression (`expression`) n'est pas
 *   évaluée à la génération (laissée au navigateur) ;
 * - `mod((x),10)` : parenthèses obligatoires (la virgule suivrait un chiffre).
 */

import { alignBlock, colored, inline } from '../lib/palette';

// ============================================================================
// TYPES
// ============================================================================

/** Un chiffre d'un nombre : sa variable, ou `null` quand la variation le fixe à 0 */
export interface PlaceDigit {
	variable: string | null;
	/** Valeur du rang : 10000, 1000, 100, 10, 1 */
	power: number;
}

/** Une fraction décimale de somme : `{{b}}/10` (numérateur null = fixé à 0) */
export interface DecimalPart {
	variable: string | null;
	/** Dénominateur : 10, 100, 1000 */
	power: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const INTEGER_RANKS: Record<number, string> = {
	1: 'unités',
	10: 'dizaines',
	100: 'centaines',
	1000: 'milliers',
	10000: 'dizaines de milliers'
};

export const DECIMAL_RANKS: Record<number, string> = {
	10: 'dixièmes',
	100: 'centièmes',
	1000: 'millièmes'
};

export const RULE_PLACE_VALUE =
	"**Valeur d'un chiffre.** Un chiffre vaut plus ou moins selon son rang dans le nombre : " +
	'au rang des dizaines, il compte pour ce chiffre $\\times 10$ ; au rang des centaines, ' +
	'pour ce chiffre $\\times 100$ ; et ainsi de suite. On range les chiffres du nombre dans ' +
	'le tableau de numération.';

export const RULE_RECOMPOSE =
	'**Tableau de numération.** Dans $\\left( 4 \\times 1000 \\right)$, le chiffre $4$ est au ' +
	'rang des milliers : le nombre qui multiplie le chiffre donne son rang. On place chaque ' +
	"chiffre dans la colonne de son rang ; un rang qui n'apparaît pas reçoit un $0$. On " +
	"n'écrit pas de zéro à gauche du premier chiffre.";

export const RULE_FRACDEC =
	'**Fraction décimale.** Quand le dénominateur est $10$, $100$ ou $1000$, il donne le rang ' +
	'du dernier chiffre du numérateur : les dixièmes pour $10$, les centièmes pour $100$, ' +
	'les millièmes pour $1000$.';

export const RULE_FRACDEC_ANY =
	`${RULE_FRACDEC} Si le dénominateur n'est pas $10$, $100$ ou $1000$, on cherche d'abord ` +
	'une fraction égale qui a un de ces dénominateurs.';

export const RULE_DECFRAC =
	'**Fraction décimale.** Le rang du dernier chiffre après la virgule donne le dénominateur : ' +
	'dixièmes → $10$, centièmes → $100$. On simplifie ensuite la fraction quand c’est possible.';

// ============================================================================
// FUNCTIONS — briques
// ============================================================================

export const orange = (latex: string): string => colored('transformed', latex);
export const blue = (latex: string): string => colored('intermediate', latex);

/** `{{a}}` */
export const v = (name: string): string => `{{${name}}}`;

/**
 * Tableau de numération : une ligne d'en-têtes, une ligne de chiffres.
 * L'en-tête `,` fait une colonne étroite pour la virgule.
 */
export function positionTable(headers: string[], cells: string[]): string {
	const head = headers.map((h) => (h === ',' ? '' : `\\text{${h}}`)).join(' & ');
	return `$$\\begin{array}{|${'c|'.repeat(headers.length)}} ${head} \\\\ ${cells.join(' & ')} \\end{array}$$`;
}

/** Règle des chiffres décimaux, limitée aux rangs utiles (`1/10 = 0.1`…) */
export function ruleDecimalPlaces(powers: number[]): string {
	const ordinal = ['premier', 'deuxième', 'troisième'];
	const parts = powers.map(
		(power, index) =>
			`le ${ordinal[index]}${index === 0 ? ' chiffre est' : ''} celui des ${DECIMAL_RANKS[power]} ` +
			`($\\dfrac{1}{${power}} = ${1 / power}$)`
	);
	return (
		"**Valeur d'un chiffre.** Après la virgule, " +
		`${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}. ` +
		'On range les chiffres du nombre dans le tableau de numération.'
	);
}

// ============================================================================
// FUNCTIONS — entiers (N-DECOMP)
// ============================================================================

/** « Le chiffre des dizaines est 0 : il ne donne aucun terme. » */
function zeroNote(digits: PlaceDigit[], labels: Record<number, string>): string {
	const zeros = digits.filter((d) => d.variable === null).map((d) => labels[d.power]);
	if (zeros.length === 0) return '';
	return (
		` Le chiffre des ${zeros.join(' et celui des ')} est ${inline(blue('0'))} : ` +
		`${zeros.length > 1 ? 'ils ne donnent' : 'il ne donne'} aucun terme.`
	);
}

/**
 * Décomposer un entier (`{{expression}}`) selon ses rangs.
 * - `values` : réponse `200 + 10 + 5` → `215 = 2 × 100 + 1 × 10 + 5 = 200 + 10 + 5` ;
 * - `products` : réponse `(2 × 100) + (1 × 10) + 5` → `215 = (2 × 100) + (1 × 10) + 5`.
 */
export function integerDecomposition(digits: PlaceDigit[], form: 'values' | 'products'): string[] {
	const present = digits.filter((d): d is { variable: string; power: number } => !!d.variable);
	const table = positionTable(
		digits.map((d) => INTEGER_RANKS[d.power]),
		digits.map((d) => (d.variable ? orange(v(d.variable)) : blue('0')))
	);
	const explanation =
		`On place les chiffres de ${inline('{{expression}}')} dans le tableau.${zeroNote(digits, INTEGER_RANKS)}` +
		` Chaque chiffre compte pour lui-même multiplié par la valeur de son rang. ${table}`;
	if (form === 'products') {
		const answer = present
			.map((d) =>
				d.power === 1 ? v(d.variable) : `\\left( ${v(d.variable)} \\times ${d.power} \\right)`
			)
			.join(' + ');
		return [RULE_PLACE_VALUE, explanation, alignBlock([`{{expression}} &= ${answer}`])];
	}
	const products = present
		.map((d) =>
			d.power === 1 ? orange(v(d.variable)) : `${orange(v(d.variable))} \\times ${d.power}`
		)
		.join(' + ');
	return [
		RULE_PLACE_VALUE,
		explanation,
		alignBlock([`{{expression}} &= ${products}`, '&= {{solution}}'])
	];
}

/**
 * Recomposer un entier écrit `(a × 10000) + (b × 1000) + … + e`, termes nuls
 * retirés (et parfois mélangés) dans l'énoncé.
 * `units` : la variable des unités ; `unitsBranchable` faux quand elle s'appelle
 * `e` (constante d'Euler dans une condition) : le chiffre des unités est alors
 * écrit sans condition, `\left( e \times 1 \right)` (jamais « + 0 »).
 */
export function integerRecomposition(options: {
	digits: { variable: string; power: number }[];
	shuffled: boolean;
	unitsBranchable: boolean;
}): string[] {
	const { digits, shuffled, unitsBranchable } = options;
	const higher = digits.slice(0, -1);
	const units = digits[digits.length - 1];
	// Rang i écrit si un chiffre de ce rang ou d'un rang supérieur est non nul
	const shownUpTo = (index: number): string =>
		`${higher
			.slice(0, index + 1)
			.map((d) => d.variable)
			.join('+')}>0`;
	const digitCell = (d: { variable: string }): string =>
		`{{if:${d.variable}>0|${orange(v(d.variable))}|${blue('0')}}}`;
	const cells = [
		...higher.map((d, index) => `{{if:${shownUpTo(index)}|${digitCell(d)}|}}`),
		unitsBranchable ? digitCell(units) : orange(`{{eval:{{${units.variable}}}}}`)
	];
	const table = positionTable(
		digits.map((d) => INTEGER_RANKS[d.power]),
		cells
	);

	// Calcul : chaque rang à partir du premier chiffre non nul, les zéros en bleu
	const product = (d: { variable: string; power: number }): string =>
		`\\left( {{if:${d.variable}>0|${orange(v(d.variable))}|${blue('0')}}} \\times ${d.power} \\right)`;
	const terms = higher.map(
		(d, index) =>
			`{{if:${shownUpTo(index)}|${index > 0 ? `{{if:${shownUpTo(index - 1)}| + |}}` : ''}${product(d)}|}}`
	);
	const anyHigher = shownUpTo(higher.length - 1);
	const unitsTerm = unitsBranchable
		? `{{if:${anyHigher}|{{if:${units.variable}>0| + ${orange(v(units.variable))}| + \\left( ${blue('0')} \\times 1 \\right)}}|{{if:${units.variable}>0|${orange(v(units.variable))}|0}}}}`
		: `{{if:${anyHigher}| + |}}\\left( ${orange(`{{eval:{{${units.variable}}}}}`)} \\times 1 \\right)`;
	const order = shuffled
		? ' Les termes peuvent être dans le désordre : on les range du plus grand rang au plus petit.'
		: '';
	return [
		RULE_RECOMPOSE,
		`On place chaque chiffre dans la colonne de son rang.${order} ${table}`,
		alignBlock([`${terms.join('')}${unitsTerm} &= {{solution}}`])
	];
}

// ============================================================================
// FUNCTIONS — décimaux (N-DECOMP, N-FRACDEC)
// ============================================================================

/** Rangs décimaux affichés : jusqu'au dernier non nul (un zéro final ne s'écrit pas) */
function shownParts(parts: DecimalPart[]): DecimalPart[] {
	let last = parts.length - 1;
	while (last >= 0 && parts[last].variable === null) last--;
	return parts.slice(0, last + 1);
}

/** Tableau `unités | , | dixièmes | …` d'un nombre `a + b/10 + c/100…` */
export function decimalTable(units: string, parts: DecimalPart[]): string {
	const shown = shownParts(parts);
	return positionTable(
		['unités', ',', ...shown.map((p) => DECIMAL_RANKS[p.power])],
		[orange(v(units)), ',', ...shown.map((p) => (p.variable ? orange(v(p.variable)) : blue('0')))]
	);
}

/** `0.0\textcolor{…}{4}` : la valeur d'un chiffre décimal, chiffre coloré */
function decimalValue(part: { variable: string; power: number }): string {
	const zeros = '0'.repeat(String(part.power).length - 2);
	return `0.${zeros}${orange(v(part.variable))}`;
}

/** Zéro(s) de rang ajouté(s) : « Il n'y a pas de dixièmes : on écrit 0 à ce rang. » */
function decimalZeroNote(parts: DecimalPart[]): string {
	const zeros = shownParts(parts)
		.filter((p) => p.variable === null)
		.map((p) => DECIMAL_RANKS[p.power]);
	if (zeros.length === 0) return '';
	return ` Il n'y a pas de ${zeros.join(' ni de ')} : on écrit ${inline(blue('0'))} ${zeros.length > 1 ? 'à ces rangs' : 'à ce rang'}.`;
}

/**
 * Décomposer un décimal (`{{expression1}}`, chiffres a, b, c…) :
 * - `decimals` : réponse `5 + 0.3 + 0.04` ;
 * - `fractions` : réponse `5 + 3/10 + 4/100` (termes nuls omis).
 */
export function decimalDecomposition(
	units: string,
	parts: DecimalPart[],
	form: 'decimals' | 'fractions'
): string[] {
	const present = parts.filter((p): p is { variable: string; power: number } => !!p.variable);
	const explanation =
		`On place les chiffres de ${inline('{{expression1}}')} dans le tableau.` +
		`${decimalZeroNote(parts)} ${decimalTable(units, parts)}`;
	const rule = ruleDecimalPlaces(parts.map((p) => p.power));
	if (form === 'decimals') {
		const products = present.map((p) => `${orange(v(p.variable))} \\times ${1 / p.power}`);
		return [
			rule,
			explanation,
			alignBlock([
				`{{expression1}} &= ${[orange(v(units)), ...products].join(' + ')}`,
				'&= {{solution}}'
			])
		];
	}
	const values = present.map(decimalValue);
	const fractions = present.map((p) => `\\dfrac{${v(p.variable)}}{${p.power}}`);
	return [
		rule,
		explanation,
		alignBlock([
			`{{expression1}} &= ${[orange(v(units)), ...values].join(' + ')}`,
			`&= ${[v(units), ...fractions].join(' + ')}`
		])
	];
}

/**
 * Somme `a + b/10 + c/100 (+ d/1000)` → nombre décimal.
 * `shuffled` : l'énoncé mélange les termes.
 */
export function fractionSumToDecimal(
	units: string,
	parts: DecimalPart[],
	shuffled: boolean
): string[] {
	const present = parts.filter((p): p is { variable: string; power: number } => !!p.variable);
	const each = present
		.map(
			(p) =>
				`${inline(`\\dfrac{${orange(v(p.variable))}}{${p.power}}`)}, ce sont ` +
				`${inline(orange(v(p.variable)))} ${inline(blue(`\\text{${DECIMAL_RANKS[p.power]}}`))}`
		)
		.join(' ; ');
	const order = shuffled
		? ' Les termes peuvent être dans le désordre : on les range des unités vers les plus petits rangs.'
		: '';
	return [
		RULE_FRACDEC,
		`Chaque fraction place son numérateur au rang donné par son dénominateur : ${each}.` +
			`${order}${decimalZeroNote(parts)} ${decimalTable(units, parts)}`,
		alignBlock([
			`${[orange(v(units)), ...present.map((p) => `\\dfrac{${orange(v(p.variable))}}{${p.power}}`)].join(' + ')} ` +
				`&= ${[orange(v(units)), ...present.map(decimalValue)].join(' + ')}`,
			'&= {{solution}}'
		])
	];
}

/**
 * Explication du placement d'un numérateur `num` (nom de variable) sur un
 * dénominateur FIXE `den` : dernier chiffre, rang, zéros ajoutés / supprimés.
 * `alone` : la fraction est tout le nombre (sinon des unités la précèdent, et
 * « on écrit 0 avant la virgule » serait faux).
 */
function placementSentence(num: string, den: number, alone: boolean): string {
	const last = inline(orange(`{{eval:mod((${num}),10)}}`));
	const leading =
		den === 10
			? ''
			: `{{if:10*${num}<${den}| Il manque des chiffres entre la virgule et ce rang : on les remplace par des ${inline(blue('0'))}.|}}`;
	return (
		`Le dénominateur est ${inline(blue(String(den)))} : ` +
		`{{if:${num}>9|le dernier chiffre de ${inline(v(num))}, ${last},|le chiffre ${last}}} ` +
		`se place au rang des ${inline(blue(`\\text{${DECIMAL_RANKS[den]}}`))}.` +
		(alone
			? `{{if:${num}<${den}| Il n'y a pas d'unités : on écrit ${inline('0')} avant la virgule.|}}`
			: '') +
		leading +
		`{{if:mod((${num}),10)=0| Le dernier chiffre est ${inline('0')} : un zéro à la fin de la ` +
		`partie décimale ne change pas la valeur, on ne l'écrit pas.|}}`
	);
}

/** `\dfrac{42\textcolor{…}{5}}{100}` : numérateur (variable), dernier chiffre coloré */
function coloredNumerator(num: string): string {
	return (
		`{{if:${num}>9|{{eval:(${num}-mod((${num}),10))/10}}|}}` + orange(`{{eval:mod((${num}),10)}}`)
	);
}

/** `424.0` : le numérateur placé, zéros finaux compris (dénominateur fixe) */
function placedWithZeros(num: string, den: number): string {
	const digits = String(den).length - 1;
	const decimals = `mod((${num}),${den})`;
	const pad =
		digits === 1
			? ''
			: digits === 2
				? `{{if:${decimals}<10|0|}}`
				: `{{if:${decimals}<10|00|{{if:${decimals}<100|0|}}}}`;
	return `{{eval:floor(${num}/${den})}}.${pad}{{eval:${decimals}}}`;
}

/**
 * Fraction décimale `num / den` → écriture décimale, dénominateur FIXE (`den`)
 * ou tiré dans une liste (`den` = nom de variable, `denValues` = ses valeurs).
 */
export function fractionToDecimal(
	num: string,
	den: number | { variable: string; values: number[] }
): string[] {
	const cases =
		typeof den === 'number'
			? [{ condition: null, den }]
			: den.values.map((value) => ({ condition: `${den.variable}=${value}`, den: value }));
	const branch = (build: (d: number) => string): string =>
		cases
			.map(({ condition, den: d }) => (condition ? `{{if:${condition}|${build(d)}|}}` : build(d)))
			.join('');
	return [
		RULE_FRACDEC,
		branch((d) => placementSentence(num, d, true)),
		branch((d) =>
			alignBlock([
				`\\dfrac{${coloredNumerator(num)}}{${d}} &= {{if:mod((${num}),10)=0|${placedWithZeros(num, d)} \\\\ &= |}}{{solution}}`
			])
		)
	];
}

/**
 * Nombre `a + c/den` (c à 1, 2 ou 3 chiffres, dénominateur fixe) → décimal.
 */
export function unitsPlusFraction(units: string, num: string, den: number): string[] {
	return [
		RULE_FRACDEC,
		placementSentence(num, den, false),
		alignBlock([
			`${v(units)} + \\dfrac{${coloredNumerator(num)}}{${den}} &= ${v(units)} + {{eval:${num}/${den};d}}`,
			'&= {{solution}}'
		])
	];
}

// ============================================================================
// FUNCTIONS — fraction quelconque d'une liste (N-FRACDEC, cas mêlés)
// ============================================================================

const DECIMAL_DENOMINATORS = [10, 100, 1000];

/** Plus petit facteur k tel que `den × k` vaille 10, 100 ou 1000 (null : impossible) */
export function amplifier(den: number): number | null {
	for (const target of DECIMAL_DENOMINATORS) {
		if (target % den === 0) return target / den;
	}
	return null;
}

/** Explication + calcul d'UNE fraction littérale `n/d` (d décimal ou non) */
function literalFraction(n: number, d: number): { prose: string; calc: string } {
	const k = amplifier(d);
	if (k === null) throw new Error(`${n}/${d} : pas de fraction décimale égale`);
	const num = n * k;
	const den = d * k;
	const rank = DECIMAL_RANKS[den];
	const last = num % 10;
	const place =
		`Le dénominateur est ${inline(blue(String(den)))} : ` +
		(num > 9
			? `le dernier chiffre de ${inline(String(num))}, ${inline(orange(String(last)))},`
			: `le chiffre ${inline(orange(String(last)))}`) +
		` se place au rang des ${inline(blue(`\\text{${rank}}`))}.` +
		(num < den ? ` Il n'y a pas d'unités : on écrit ${inline('0')} avant la virgule.` : '') +
		(10 * num < den
			? ` Il manque des chiffres entre la virgule et ce rang : on les remplace par des ${inline(blue('0'))}.`
			: '');
	if (k === 1) {
		return {
			prose: place,
			calc: alignBlock([`\\dfrac{${num}}{${den}} &= {{solution}}`])
		};
	}
	return {
		prose:
			`Le dénominateur ${inline(String(d))} n'est pas $10$, $100$ ou $1000$. Comme ` +
			`${inline(`${d} \\times ${blue(String(k))} = ${den}`)}, on multiplie le numérateur et le ` +
			`dénominateur par ${inline(blue(String(k)))}. ${place}`,
		calc: alignBlock([
			`\\dfrac{${n}}{${d}} &= \\dfrac{${n} \\times ${blue(String(k))}}{${d} \\times ${blue(String(k))}}`,
			`&= \\dfrac{${num}}{${den}}`,
			'&= {{solution}}'
		])
	};
}

/**
 * Deux fractions de même valeur dans la liste (`1/5` et `2/10`) : la condition
 * ne voit que la valeur, elle ne peut pas les distinguer. Branche commune : la
 * fraction tirée nommée dans la prose (`{{a}}`, convertie en `\\dfrac`), égalée à la
 * fraction de dénominateur 10 / 100 / 1000 d'où part le calcul.
 */
function sameValueFractions(
	name: string,
	group: { n: number; d: number }[]
): { prose: string; calc: string } {
	const { n, d } = group[0];
	const k = amplifier(d);
	if (k === null) throw new Error(`${n}/${d} : pas de fraction décimale égale`);
	const num = n * k;
	const den = d * k;
	const last = num % 10;
	return {
		prose:
			`On écrit ${inline(v(name))} avec le dénominateur ${inline(blue(String(den)))} : ` +
			`${inline(`${v(name)} = \\dfrac{${num}}{${den}}`)}. ` +
			(num > 9
				? `Le dernier chiffre de ${inline(String(num))}, ${inline(orange(String(last)))}, se place`
				: `Le chiffre ${inline(orange(String(last)))} se place`) +
			` au rang des ${inline(blue(`\\text{${DECIMAL_RANKS[den]}}`))}.` +
			(num < den ? ` Il n'y a pas d'unités : on écrit ${inline('0')} avant la virgule.` : ''),
		// Le calcul part de la fraction décimale : `{{a}}` n'est pas converti en LaTeX
		// dans un bloc `align` (il resterait `1/5`)
		calc: alignBlock([`\\dfrac{${num}}{${den}} &= {{solution}}`])
	};
}

/**
 * Fraction tirée dans une LISTE (`1/2|1/4|1/10|…`, variable `name`) : une branche
 * par valeur, choisie par `1000*name = 1000·n/d` (entier : pas d'arrondi).
 * `collisions` : les fractions de même valeur, qu'aucune condition ne distingue.
 */
export function listedFraction(
	name: string,
	list: string
): { steps: string[]; mixed: boolean; collisions: string[] } {
	const fractions = list.split('|').map((item) => {
		const [n, d] = item.split('/').map(Number);
		if (!Number.isInteger(n) || !Number.isInteger(d))
			throw new Error(`« ${item} » : fraction attendue`);
		return { n, d, key: (1000 * n) / d, item };
	});
	const keys = [...new Set(fractions.map((f) => f.key))];
	const collisions: string[] = [];
	const branches = keys.map((key) => {
		const group = fractions.filter((f) => f.key === key);
		if (group.length > 1) collisions.push(group.map((f) => f.item).join(' = '));
		const body =
			group.length > 1 ? sameValueFractions(name, group) : literalFraction(group[0].n, group[0].d);
		return { condition: `1000*${name}=${key}`, ...body };
	});
	return {
		steps: [
			RULE_FRACDEC_ANY,
			branches.map((b) => `{{if:${b.condition}|${b.prose}|}}`).join(''),
			branches.map((b) => `{{if:${b.condition}|${b.calc}|}}`).join('')
		],
		mixed: fractions.some((f) => !DECIMAL_DENOMINATORS.includes(f.d)),
		collisions
	};
}

// ============================================================================
// FUNCTIONS — décimal → fraction (N-FRACDEC)
// ============================================================================

/**
 * Décimal `b/a` (a ∈ {2, 4, 5, 10}) → fraction décimale, puis simplifiée :
 * dixièmes si `10b/a` est entier, sinon centièmes.
 */
export function decimalToFraction(): string[] {
	const tenths = 'mod((10*b),a)=0';
	const branch = (den: 10 | 100): { prose: string; calc: string } => {
		const num = `${den}*b/a`;
		const g = `gcd((${num}),${den})`;
		const last = den === 10 ? `{{eval:${num}}}` : `{{eval:mod((${num}),10)}}`;
		return {
			prose:
				`Le dernier chiffre de ${inline('{{expression1}}')}, ${inline(orange(last))}, est au rang des ` +
				`${inline(blue(`\\text{${DECIMAL_RANKS[den]}}`))} : le dénominateur est ${inline(blue(String(den)))}.` +
				`{{if:${g}>1| Le numérateur et le dénominateur sont divisibles par ${inline(blue(`{{eval:${g}}}`))} : on simplifie.|}}`,
			calc: alignBlock([
				`{{expression1}} &= \\dfrac{${orange(`{{eval:${num}}}`)}}{${den}}` +
					`{{if:${g}>1| \\\\ &= \\dfrac{{{eval:${num}}} : ${blue(`{{eval:${g}}}`)}}{${den} : ${blue(`{{eval:${g}}}`)}} \\\\ &= \\dfrac{{{eval:${num}/${g}}}}{{{eval:${den}/${g}}}}|}}`
			])
		};
	};
	const t = branch(10);
	const h = branch(100);
	return [
		RULE_DECFRAC,
		`{{if:${tenths}|${t.prose}|${h.prose}}}`,
		`{{if:${tenths}|${t.calc}|${h.calc}}}`
	];
}
