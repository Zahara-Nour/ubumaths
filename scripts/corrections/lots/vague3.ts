/**
 * Lots « vague3 » : relatifs (+ / −, comparaison, définition), fractions (× et +),
 * unités, pourcentages
 * ============================================================================
 *
 * Classement : docs/wip/corrections-manquantes-frontiere.md, codes N-REL-ADD (dont
 * les 4 trous 24331791, 84755a7b, b1550840, 372d4f79 — décision du 2026-09-29),
 * N-REL-SUB, N-COMPARER-REL, N-REL-DEF, N-OPPOSES, N-REL-ALG, N-FRAC-MULT,
 * N-FRAC-ADD, N-INVERSE, N-UNITES, N-UNITES-VOL, N-UNITES-AIRE, N-POURCENT.
 *
 * Structures relues en prod (lecture seule) le 2026-09-29 ; les 36 modèles sont
 * `draft` → lot `vague3-brouillons`. Aucun n'est `published` : le lot
 * `vague3-publies` est vide (docs/corrections/vague3-publies/RESUME.md).
 *
 * Écartés (voir SKIPPED) : modèles que le vérificateur ne peut pas contrôler ou
 * que le format de proposition ne peut pas porter.
 */

import type { QuestionTemplate } from '../../../src/lib/questions/types';
import type { Lot, LotEntry, WrittenCorrection } from '../lib/lot';
import { alignBlock, inline } from '../lib/palette';
import {
	RULE_COMPARE,
	RULE_DROITE,
	RULE_OPPOSES,
	RULE_REL_ALG,
	RULE_REL_DEF,
	RULE_REL_SUB,
	blue,
	green,
	holeCorrection,
	mag,
	move,
	neg,
	orange,
	signWord,
	signedEval,
	sumCorrection,
	sumNegNeg,
	sumNegPos,
	sumPosNeg,
	vm,
	type Magnitude
} from './relatifs';

// ============================================================================
// HELPERS
// ============================================================================

type Written = (template: QuestionTemplate) => WrittenCorrection;

const byVariation =
	(variations: string[][], notes: string[] = []): Written =>
	() => ({ steps: { byVariation: variations }, notes });

const one =
	(steps: string[], notes: string[] = []): Written =>
	() => ({ steps: { shared: steps }, notes });

const entry = (templateId: string, code: string, written: Written): LotEntry => ({
	templateId,
	classe: 'N',
	code,
	written
});

const A = vm('a');
const B = vm('b');
const C = vm('c');
const ONE = mag('1');
const TWO = mag('2');

/** (−m1) + m2, écrit avec ou sans parenthèses, avec ou sans droite graduée */
function negPlusPos(
	m1: Magnitude,
	m2: Magnitude,
	opts: { parens?: boolean; droite?: boolean } = {}
) {
	const parens = opts.parens ?? true;
	return sumCorrection({
		before: opts.droite ? [RULE_DROITE, move(neg(m1, false), true, m2)] : [],
		first: `${neg(m1, parens)} + ${m2.latex}`,
		step: sumNegPos(m1, m2)
	});
}

/** (−m1) + (−m2) */
function negPlusNeg(m1: Magnitude, m2: Magnitude) {
	return sumCorrection({ first: `${neg(m1)} + ${neg(m2)}`, step: sumNegNeg(m1, m2) });
}

/** m1 + (−m2) */
function posPlusNeg(m1: Magnitude, m2: Magnitude) {
	return sumCorrection({ first: `${m1.latex} + ${neg(m2)}`, step: sumPosNeg(m1, m2) });
}

/**
 * (−m1) − m2 : sur la droite, on recule (on s'éloigne de zéro) ; sans droite,
 * soustraire m2, c'est ajouter −m2.
 */
function negMinusPos(
	m1: Magnitude,
	m2: Magnitude,
	opts: { parens?: boolean; droite?: boolean } = {}
) {
	const parens = opts.parens ?? true;
	const first = `${neg(m1, parens)} - ${m2.latex}`;
	if (opts.droite) {
		return [
			RULE_DROITE,
			`${move(neg(m1, false), false, m2)} On s’éloigne encore de zéro, du côté des négatifs : ` +
				`le résultat est ${signWord(true)}, et sa distance à zéro est la somme des distances.`,
			alignBlock([
				`${first} &= ${green('-')}\\left( ${m1.latex} + ${m2.latex} \\right)`,
				'&= {{solution}}'
			])
		];
	}
	return sumCorrection({
		before: [`Soustraire ${inline(m2.latex)}, c’est ajouter son opposé ${inline(neg(m2, false))}.`],
		first,
		rewrite: [`&= ${neg(m1, parens)} + ${neg(m2)}`],
		step: sumNegNeg(m1, m2)
	});
}

/** m1 − m2 avec m2 > m1 : on recule au-delà de zéro */
function posMinusBigger(m1: Magnitude, m2: Magnitude, opts: { droite?: boolean } = {}) {
	const first = `${m1.latex} - ${m2.latex}`;
	if (opts.droite) {
		return [
			RULE_DROITE,
			`${move(m1.latex, false, m2)} On recule de plus que ${inline(m1.latex)} : on dépasse ` +
				`zéro, le résultat est ${signWord(true)}. Sa distance à zéro est l’écart ` +
				`${inline(`${m2.latex} - ${m1.latex}`)}.`,
			alignBlock([
				`${first} &= ${green('-')}\\left( ${m2.latex} - ${m1.latex} \\right)`,
				'&= {{solution}}'
			])
		];
	}
	return sumCorrection({
		before: [`Soustraire ${inline(m2.latex)}, c’est ajouter son opposé ${inline(neg(m2, false))}.`],
		first,
		rewrite: [`&= ${m1.latex} + ${neg(m2)}`],
		step: sumPosNeg(m1, m2)
	});
}

// ---------------------------------------------------------------- N-REL-SUB

/** Calcul d'une différence : on la réécrit en addition, puis règle d'addition */
function subCalc(kind: 'negMinusNeg' | 'posMinusNeg' | 'posMinusPos' | 'negMinusPos'): string[] {
	switch (kind) {
		case 'negMinusNeg':
			return [
				RULE_REL_SUB,
				...sumCorrection({
					first: `${neg(A)} - ${neg(B)}`,
					rewrite: [`&= ${neg(A)} + {{b}}`],
					step: sumNegPos(A, B)
				})
			];
		case 'posMinusNeg':
			return [
				RULE_REL_SUB,
				`Soustraire ${inline(neg(B, false))}, c’est ajouter son opposé ${inline('{{b}}')}.`,
				alignBlock([`{{a}} - ${neg(B)} &= {{a}} + {{b}}`, '&= {{solution}}'])
			];
		case 'posMinusPos':
			return [
				RULE_REL_SUB,
				...sumCorrection({
					first: '{{a}} - {{b}}',
					rewrite: [`&= {{a}} + ${neg(B)}`],
					step: sumPosNeg(A, B)
				})
			];
		case 'negMinusPos':
			return [
				RULE_REL_SUB,
				...sumCorrection({
					first: `${neg(A)} - {{b}}`,
					rewrite: [`&= ${neg(A)} + ${neg(B)}`],
					step: sumNegNeg(A, B)
				})
			];
	}
}

const DOUBLE_SIGNS =
	'**Doubles signes.** $+\\left( -b \\right)$ s’écrit $-b$ ; $-\\left( -b \\right)$ s’écrit $+b$ ' +
	'(soustraire un nombre, c’est ajouter son opposé).';

/** Simplifier l'écriture : `x + (−b)` → `x − b`, `x − (−b)` → `x + b` */
function doubleSigns(first: 'neg' | 'pos', operator: '+' | '-'): string[] {
	const x = first === 'neg' ? '-{{a}}' : '{{a}}';
	const posed = `${x} ${operator} ${neg(B)}`;
	const result = operator === '+' ? `${x} ${green('-')} {{b}}` : `${x} ${green('+')} {{b}}`;
	return [
		DOUBLE_SIGNS,
		operator === '+'
			? `Ajouter ${inline(neg(B, false))}, c’est soustraire ${inline('{{b}}')}.`
			: `Soustraire ${inline(neg(B, false))}, c’est ajouter ${inline('{{b}}')}.`,
		alignBlock([`${posed} &= ${result}`])
	];
}

/** Transformer une soustraction en addition : `x − y` → `x + (opposé de y)` */
function toAddition(first: 'neg' | 'pos', second: 'neg' | 'pos'): string[] {
	const x = first === 'neg' ? neg(A) : '{{a}}';
	const xOut = first === 'neg' ? '-{{a}}' : '{{a}}';
	const y = second === 'neg' ? neg(B) : '{{b}}';
	const opposite = second === 'neg' ? green('{{b}}') : `\\left( ${green('-')}{{b}} \\right)`;
	return [
		RULE_REL_SUB,
		`L’opposé de ${inline(second === 'neg' ? neg(B, false) : '{{b}}')} est ` +
			`${inline(opposite)} : on remplace « ${inline('-')} ${inline(second === 'neg' ? neg(B, false) : '{{b}}')} » ` +
			`par « ${inline('+')} ${inline(opposite)} ».`,
		alignBlock([`${x} - ${y} &= ${xOut} + ${opposite}`])
	];
}

// ---------------------------------------------------------------- N-COMPARER-REL

const CONCLUDE_SMALLEST = 'Le plus petit des deux nombres est donc : {{solution}}';

/** QCM entre deux nombres relatifs `g` et `h` (expressions numériques) */
function compareChoice(g: string, h: string): string[] {
	const G = signedEval(g, false);
	const H = signedEval(h, false);
	const plain = (x: string) => `{{eval:${x}}}`;
	const smaller = (x: string, X: string, y: string, Y: string) =>
		`{{if:(${x})<0|{{if:(${y})<0|Les deux nombres sont négatifs : ${inline(X)} est plus ` +
		`éloigné de zéro que ${inline(Y)} (${inline(`{{eval:abs(${x})}} > {{eval:abs(${y})}}`)}), donc ` +
		`${inline(blue(`${plain(x)} < ${plain(y)}`))}.|${inline(X)} est négatif et ${inline(Y)} est positif, donc ` +
		`${inline(blue(`${plain(x)} < ${plain(y)}`))}.}}|Les deux nombres sont positifs : ${inline(blue(`${plain(x)} < ${plain(y)}`))}.}}`;
	return [
		RULE_COMPARE,
		`{{if:(${g})<(${h})|${smaller(g, G, h, H)}|${smaller(h, H, g, G)}}}`,
		CONCLUDE_SMALLEST
	];
}

// ---------------------------------------------------------------- N-FRAC-MULT

const RULE_FRAC_MULT =
	'**Produit de fractions.** On multiplie les numérateurs entre eux et les dénominateurs ' +
	'entre eux : $\\dfrac{a}{b} \\times \\dfrac{c}{d} = \\dfrac{a \\times c}{b \\times d}$.';

/** Trou dans un produit de deux fractions positives */
function fracMultHole(slot: 'num1' | 'den1' | 'num2' | 'den2'): string[] {
	const isNum = slot.startsWith('num');
	const known = { num1: 'b', den1: 'd', num2: 'a', den2: 'c' }[slot];
	const product = isNum ? '{{eval:a*b}}' : '{{eval:c*d}}';
	const part = isNum ? 'numérateurs' : 'dénominateurs';
	return [
		RULE_FRAC_MULT,
		`Les ${part} : ${inline(`? \\times ${orange(`{{${known}}}`)} = ${blue(product)}`)}. ` +
			`Le nombre manquant s’obtient par une division.`,
		alignBlock([`? &= ${blue(product)} : ${orange(`{{${known}}}`)}`, '&= {{solution}}'])
	];
}

/** Nombre tiré (signe quelconque), parenthèses s'il est négatif, sans couleur */
const parPlain = (expression: string): string =>
	`{{if:(${expression})<0|\\left( {{eval:${expression}}} \\right)|{{eval:${expression}}}}}`;

/**
 * Même chose avec des relatifs : le résultat est écrit N / D avec D > 0. Si
 * c × d < 0, il a été écrit avec des signes changés : N = −(a × b), D = −(c × d).
 */
function fracMultHoleSigned(slot: 'num1' | 'den1' | 'num2' | 'den2'): string[] {
	const isNum = slot.startsWith('num');
	const known = { num1: 'b', den1: 'd', num2: 'a', den2: 'c' }[slot];
	const product = isNum ? 'a*b' : 'c*d';
	const part = isNum ? 'numérateurs' : 'dénominateurs';
	const N = '{{eval:a*b*c*d/abs(c*d)}}';
	const D = '{{eval:abs(c*d)}}';
	const changed =
		`le résultat ${inline(`\\dfrac{${N}}{${D}}`)} a été écrit avec des signes changés ` +
		`(dénominateur rendu positif)`;
	const context = isNum
		? `{{if:c*d>0|Le produit des dénominateurs ${inline(`${parPlain('c')} \\times ${parPlain('d')} = ${D}`)} ` +
			`est positif : le numérateur ${inline(N)} du résultat est le produit des numérateurs.|` +
			`Le produit des dénominateurs ${inline(`${parPlain('c')} \\times ${parPlain('d')} = ${parPlain('c*d')}`)} ` +
			`est négatif : ${changed}, donc le produit des numérateurs vaut ${inline(parPlain('a*b'))}.}}`
		: `{{if:c*d>0|Le produit des numérateurs ${inline(`${parPlain('a')} \\times ${parPlain('b')} = ${parPlain('a*b')}`)} ` +
			`est bien le numérateur du résultat : le produit des dénominateurs vaut ${inline(D)}.|` +
			`Le produit des numérateurs ${inline(`${parPlain('a')} \\times ${parPlain('b')} = ${parPlain('a*b')}`)} ` +
			`est l’opposé du numérateur du résultat : ${changed}, donc le produit des dénominateurs vaut ` +
			`${inline(parPlain('c*d'))}.}}`;
	return [
		RULE_FRAC_MULT,
		context,
		`Les ${part} : ${inline(`? \\times ${orange(parPlain(known))} = ${blue(parPlain(product))}`)}.`,
		alignBlock([`? &= ${blue(parPlain(product))} : ${orange(parPlain(known))}`, '&= {{solution}}'])
	];
}

// ---------------------------------------------------------------- N-UNITES

const PREFIXES = ['k', 'h', 'da', '', 'd', 'c', 'm'];

interface UnitRef {
	prefix: number;
	base: string;
	exponent: number;
	label: string;
}

function parseUnit(raw: string): UnitRef {
	const match = /^(k|h|da|d|c|m)?(m|g|L)(?:\^(\d))?$/.exec(raw);
	if (!match) throw new Error(`unité non reconnue « ${raw} »`);
	const [, prefix = '', base, exponent = '1'] = match;
	// « m » seul : mètre (préfixe vide), pas milli
	return { prefix: PREFIXES.indexOf(prefix), base, exponent: Number(exponent), label: raw };
}

const unitLatex = (u: UnitRef): string =>
	`\\text{${u.label.replace(/\^(\d)/, '')}}${u.exponent > 1 ? `^${u.exponent}` : ''}`;

/** Tableau de conversion entre deux unités : une colonne par unité (× exposant) */
function conversionTable(from: UnitRef, to: UnitRef): string {
	const low = Math.min(from.prefix, to.prefix);
	const high = Math.max(from.prefix, to.prefix);
	const n = from.exponent;
	const headers: string[] = [];
	for (let p = low; p <= high; p++) {
		const u = unitLatex({ ...from, prefix: p, label: `${PREFIXES[p]}${from.base}` });
		for (let k = 0; k < n; k++) headers.push(k === n - 1 ? u : '');
	}
	const size = headers.length;
	// Chiffre des unités de `from` : dernière sous-colonne de son unité
	const fromCol = (from.prefix - low) * n + n - 1;
	const toCol = (to.prefix - low) * n + n - 1;
	const cells = headers.map((_, col) => {
		if (col === fromCol) return orange('{{a}}');
		if (to.prefix > from.prefix && col > fromCol) return blue('0');
		if (to.prefix < from.prefix && col < fromCol) return blue(col === toCol ? '0,' : '0');
		return '';
	});
	return `$$\\begin{array}{|${'c|'.repeat(size)}} ${headers.join(' & ')} \\\\ ${cells.join(' & ')} \\end{array}$$`;
}

const RULE_UNITS: Record<number, string> = {
	1:
		'**Tableau de conversion.** Une colonne par unité ; on écrit le chiffre des unités du ' +
		'nombre dans la colonne de son unité, puis on complète avec des zéros jusqu’à l’unité ' +
		'demandée. Passer à l’unité voisine plus petite multiplie par $10$.',
	2:
		'**Tableau de conversion des aires.** Deux colonnes par unité ($1~\\text{m}^2 = 100~\\text{dm}^2$) : ' +
		'passer à l’unité voisine plus petite multiplie par $100$.',
	3:
		'**Tableau de conversion des volumes.** Trois colonnes par unité ($1~\\text{m}^3 = 1000~\\text{dm}^3$) : ' +
		'passer à l’unité voisine plus petite multiplie par $1000$.'
};

/** Conversion `a[U1] = ?[U2]` : lue dans la variable d'expression de la variation */
function conversion(expression: string): string[] {
	const match = /^a\[([^\]]+)\]\s*=\s*\?\[([^\]]+)\]$/.exec(expression.trim());
	if (!match) throw new Error(`conversion illisible « ${expression} »`);
	const from = parseUnit(match[1]);
	const to = parseUnit(match[2]);
	if (from.base !== to.base || from.exponent !== to.exponent) {
		throw new Error(`unités incompatibles « ${expression} »`);
	}
	const steps = Math.abs(to.prefix - from.prefix);
	const factor = 10 ** (steps * from.exponent);
	const smaller = to.prefix > from.prefix;
	const unitsWord = steps === 1 ? 'unité' : 'unités';
	return [
		RULE_UNITS[from.exponent],
		`De ${inline(unitLatex(from))} à ${inline(unitLatex(to))}, on passe ${steps} ${unitsWord} ` +
			`vers la ${smaller ? 'droite' : 'gauche'} du tableau` +
			(from.exponent > 1 ? ` (${inline(blue(String(steps * from.exponent)))} colonnes)` : '') +
			` : on ${smaller ? 'multiplie' : 'divise'} par ${inline(blue(String(factor)))}.`,
		conversionTable(from, to),
		alignBlock([
			`? &= {{a}} ${smaller ? '\\times' : ':'} ${blue(String(factor))}`,
			'&= {{solution}}'
		])
	];
}

export function conversions(template: QuestionTemplate): WrittenCorrection {
	return {
		steps: {
			byVariation: template.variations.map((variation, index) => {
				const expression = variation.variables?.find((v) => v.name.startsWith('expression'));
				if (!expression) throw new Error(`variation ${index} : pas de variable d’expression`);
				return conversion(String(expression.expression));
			})
		},
		notes: [
			'Généré variation par variation depuis la variable d’expression `a[U1] = ?[U2]`.',
			'Tableau : une colonne par unité (× 2 pour les aires, × 3 pour les volumes), le chiffre de `a` en orange, les zéros ajoutés en bleu.'
		]
	};
}

// ============================================================================
// ENTRIES
// ============================================================================

const DROITE = { droite: true };
const POSITIVES = '{{eval:(a+abs(a)+b+abs(b)+c+abs(c)+d+abs(d))/2}}';
const NEGATIVES = '{{eval:(abs(a)-a+abs(b)-b+abs(c)-c+abs(d)-d)/2}}';
const HALF = mag('{{eval:a+0.5;d}}', 'a+0.5');

const RELATIFS: LotEntry[] = [
	// ------------------------------------------------------------ N-REL-ADD
	entry(
		'fd2c3e4b-832a-4eda-87d8-cc61ab1c9c71',
		'N-REL-ADD',
		byVariation([negPlusPos(A, ONE), negPlusPos(A, TWO)])
	),
	entry('31144f5f-04e1-40d3-8972-871527d5669c', 'N-REL-ADD', one(negPlusNeg(A, B))),
	entry(
		'0a34e472-b985-4faa-b4d6-c804e96aff29',
		'N-REL-ADD',
		byVariation([
			negPlusPos(A, B, { parens: false }),
			negMinusPos(A, B, { parens: false }),
			posMinusBigger(C, A)
		])
	),
	entry(
		'32469cec-a95f-4a47-9672-870707027eba',
		'N-REL-ADD',
		byVariation([negPlusPos(A, B), negPlusNeg(A, B), posPlusNeg(A, B)])
	),
	entry(
		'db4f1dde-503b-4fad-8b02-96a5124221d5',
		'N-REL-ADD',
		byVariation([negPlusPos(A, B, DROITE), negMinusPos(A, B, DROITE), posMinusBigger(A, B, DROITE)])
	),
	entry(
		'347eb0d0-4607-4fdb-8f0f-2ecc42ff40b8',
		'N-REL-ADD',
		byVariation([negPlusPos(A, B, DROITE), negMinusPos(A, B, DROITE), posMinusBigger(A, B, DROITE)])
	),
	entry(
		'5b53b1be-f9e7-4fc1-bbeb-be84e180a4fd',
		'N-REL-ADD',
		byVariation([
			negPlusPos(HALF, B, DROITE),
			negMinusPos(HALF, B, DROITE),
			posMinusBigger(HALF, B, DROITE)
		])
	),
	entry(
		'a7ba721b-0d9d-41e9-bff7-6a2369432e08',
		'N-REL-ADD',
		byVariation([negMinusPos(A, ONE), negMinusPos(A, TWO)])
	),
	// Trous (décision du 2026-09-29 : N-REL-ADD, pas R-INV)
	entry(
		'24331791-3177-437f-bfc9-8e727e270293',
		'N-REL-ADD',
		byVariation([
			holeCorrection({ x: '-a', r: '-a+b', operation: 'add', droite: true }),
			holeCorrection({ x: '-a', r: '-a-b', operation: 'sub', droite: true }),
			holeCorrection({ x: 'a', r: 'a-b', operation: 'sub', droite: true })
		])
	),
	entry(
		'84755a7b-fe7d-4be7-b306-40d38dd07aef',
		'N-REL-ADD',
		byVariation([
			holeCorrection({ x: '-a', r: '-a+b', operation: 'add', droite: true }),
			holeCorrection({ x: '-a', r: '-a-b', operation: 'sub', droite: true }),
			holeCorrection({ x: 'a', r: 'a-b', operation: 'sub', droite: true })
		])
	),
	entry(
		'b1550840-5b8f-4a36-8581-5a8aa1267778',
		'N-REL-ADD',
		byVariation([
			holeCorrection({ x: '-a', r: '-a+b', operation: 'add', droite: false }),
			holeCorrection({ x: '-a', r: '-a-b', operation: 'sub', droite: false }),
			holeCorrection({ x: 'c', r: 'c-a', operation: 'sub', droite: false })
		])
	),
	entry(
		'372d4f79-d0d9-4016-bd07-56fd782b5b95',
		'N-REL-ADD',
		byVariation([
			holeCorrection({ x: '-a', r: '-a+b', operation: 'add', droite: false }),
			holeCorrection({ x: '-a', r: '-a-b', operation: 'add', droite: false }),
			holeCorrection({ x: 'a', r: 'a-b', operation: 'add', droite: false }),
			holeCorrection({ x: '-a', r: '-a+b', operation: 'add', droite: false }),
			holeCorrection({ x: '-a', r: '-a-b', operation: 'add', droite: false }),
			holeCorrection({ x: 'a', r: 'a-b', operation: 'add', droite: false })
		])
	),
	// ------------------------------------------------------------ N-OPPOSES
	entry(
		'b896b6ce-9cf0-430a-87ef-b242204cbc3b',
		'N-OPPOSES',
		byVariation([
			[
				RULE_OPPOSES,
				`${inline(neg(A, false))} et ${inline('{{a}}')} sont opposés.`,
				alignBlock([`${neg(A)} + {{a}} &= ${green('0')}`])
			],
			[
				RULE_OPPOSES,
				`${inline('{{a}}')} et ${inline(neg(A, false))} sont opposés.`,
				alignBlock([`{{a}} + ${neg(A)} &= ${green('0')}`])
			]
		])
	),
	// ------------------------------------------------------------ N-REL-ALG
	entry(
		'abc5d417-7638-4048-b710-0394c4ccc42c',
		'N-REL-ALG',
		one(
			[
				RULE_REL_ALG,
				`Termes positifs : leur somme vaut ${inline(blue(POSITIVES))}. ` +
					`Termes négatifs : leurs distances à zéro ont pour somme ${inline(orange(NEGATIVES))}.`,
				alignBlock([
					`{{a}}{{eval:b;+}}{{eval:c;+}}{{eval:d;+}} &= ${blue(POSITIVES)} - ${orange(NEGATIVES)}`,
					`{{if:a+b+c+d<0|&= ${green('-')}\\left( ${orange(NEGATIVES)} - ${blue(POSITIVES)} \\right) \\\\ |}}&= {{solution}}`
				])
			],
			['Les conditions du modèle garantissent au moins un terme positif et un terme négatif.']
		)
	),
	// ------------------------------------------------------------ N-REL-SUB
	entry(
		'1d41e370-b662-4c43-89c5-519495d8fd2b',
		'N-REL-SUB',
		byVariation([
			subCalc('negMinusNeg'),
			subCalc('posMinusNeg'),
			subCalc('posMinusPos'),
			subCalc('negMinusPos')
		])
	),
	entry(
		'8c7942e4-b81a-4049-9e78-7e2f14d5b055',
		'N-REL-SUB',
		byVariation([
			doubleSigns('neg', '+'),
			doubleSigns('pos', '+'),
			doubleSigns('neg', '-'),
			doubleSigns('pos', '-')
		])
	),
	entry(
		'1b866448-717d-44a8-8a6e-648c4ec55a48',
		'N-REL-SUB',
		byVariation([
			toAddition('neg', 'neg'),
			toAddition('pos', 'neg'),
			toAddition('pos', 'pos'),
			toAddition('neg', 'pos')
		])
	),
	// ------------------------------------------------------------ N-COMPARER-REL
	entry(
		'e0b6d00a-cc63-43bb-b2a0-c13d0e0fa00e',
		'N-COMPARER-REL',
		byVariation([compareChoice('a', '-b'), compareChoice('-a', '-b'), compareChoice('-b', '-a')])
	),
	entry(
		'12e27dba-8939-4f84-94e9-87c88458b7c3',
		'N-COMPARER-REL',
		byVariation([compareChoice('g', 'h'), compareChoice('g', 'h')])
	),
	// ------------------------------------------------------------ N-REL-DEF
	entry(
		'756bdbb7-edaa-4263-bd19-493620183371',
		'N-REL-DEF',
		one([RULE_REL_DEF, alignBlock([`${neg(A, false)} &= 0 - ${orange('{{a}}')}`])])
	),
	entry(
		'f7f22023-19cd-4745-aa96-8a3c930cde0f',
		'N-REL-DEF',
		one([RULE_REL_DEF, alignBlock([`0 - ${orange('{{a}}')} &= {{solution}}`])])
	)
];

const FRACTIONS: LotEntry[] = [
	entry(
		'e8de8b81-3466-4b47-820d-50bc8b5f484f',
		'N-FRAC-MULT',
		byVariation([
			fracMultHole('num1'),
			fracMultHole('den1'),
			fracMultHole('num2'),
			fracMultHole('den2')
		])
	),
	entry(
		'23b29a15-e08d-4c9c-bccf-97e589587578',
		'N-FRAC-MULT',
		byVariation([
			fracMultHoleSigned('num1'),
			fracMultHoleSigned('den1'),
			fracMultHoleSigned('num2'),
			fracMultHoleSigned('den2')
		])
	),
	entry(
		'25b78a6f-7a6e-4067-a729-761351333b27',
		'N-FRAC-MULT',
		one([
			RULE_FRAC_MULT,
			'On simplifie ensuite la fraction obtenue{{if:gcd(a*b,c*d)>1| par ' +
				`${inline(blue('{{eval:gcd(a*b,c*d)}}'))}|}}.`,
			alignBlock([
				'\\dfrac{{{a}}}{{{c}}} \\times \\dfrac{{{b}}}{{{d}}} &= \\dfrac{{{a}} \\times {{b}}}{{{c}} \\times {{d}}}',
				'&= \\dfrac{{{eval:a*b}}}{{{eval:c*d}}}',
				'{{if:gcd(a*b,c*d)>1|&= \\dfrac{{{eval:a*b/gcd(a*b,c*d)}} \\times ' +
					`${blue('{{eval:gcd(a*b,c*d)}}')}}{{{eval:c*d/gcd(a*b,c*d)}} \\times ${blue('{{eval:gcd(a*b,c*d)}}')}} \\\\ |}}` +
					'&= {{solution}}'
			])
		])
	)
];

/**
 * Conversions : propositions écrites, mais ROUGES au vérificateur — il ne lit pas
 * une égalité posée avec unités (« 2[km] = ?[m] » → « égalité posée illisible »).
 * Lot séparé `vague3-unites`, à ne pas importer tant que le vérificateur ne sait pas.
 */
const CONVERSIONS: LotEntry[] = [
	entry('7a90fc45-a7e2-493b-96d5-d0963e51e136', 'N-UNITES', conversions),
	entry('82748db8-01fe-4c2e-86b6-4ef8c1dde805', 'N-UNITES-AIRE', conversions),
	entry('b79d4cb7-d138-4be0-86e5-57131c8e265d', 'N-UNITES-VOL', conversions)
];

const POURCENTAGES: LotEntry[] = [
	entry(
		'62590cd3-c811-4acc-9b0d-0ff9e19c4c55',
		'N-POURCENT',
		one([
			'**Pourcentage.** $p\\,\\%$ signifie « $p$ pour cent » : $p\\,\\% = \\dfrac{p}{100}$.',
			alignBlock([`${orange('{{a}}')}\\,\\% &= \\dfrac{${orange('{{a}}')}}{100}`])
		])
	),
	entry(
		'8fd459da-05ef-4053-a52e-5bd2f2ac1a44',
		'N-POURCENT',
		one([
			'**Pourcentage.** Une fraction de dénominateur $100$ s’écrit en pourcentage : ' +
				'$\\dfrac{p}{100} = p\\,\\%$.',
			alignBlock([`\\dfrac{${orange('{{a}}')}}{100} &= ${orange('{{a}}')}\\,\\%`])
		])
	)
];

/**
 * Modèles du classement écartés, et pourquoi (rapportés, jamais silencieux).
 */
export const SKIPPED: Record<string, string> = {
	'4115768c-ddd5-4ecd-9436-ae3228dd9eed':
		'N-INVERSE : aucune variable d’expression, le vérificateur ne peut pas contrôler le point de départ.',
	'355bd41a-1589-4c25-be09-5f062bada81a':
		'N-UNITES-VOL : énoncé écrit en LaTeX, sans variable d’expression (point de départ invérifiable).',
	'c31c9d95-aaab-4086-a1bd-ef94dd8d4c3d':
		'N-UNITES : 126 variations, le format de proposition en porte au plus 50.',
	'7d12a172-405d-4281-af44-f02c265ad174':
		'N-FRAC-ADD : trou au dénominateur (variations 2 et 4) — aucune opération à écrire, le vérificateur exige un calcul.',
	'86b80159-8395-4546-8d0e-2828693b6d97':
		'N-FRAC-ADD : même cas que 7d12a172 (trou au dénominateur).',
	'b6269f1e-8323-4cd4-a578-b669df1c31bb':
		'N-UNITES : égalité posée avec unités (« c + d = ?[m] »), illisible pour le vérificateur.',
	'64e55fc7-c2f2-41d9-a0e5-01ca9fe6750b':
		'N-UNITES : réponse attendue avec unité au choix de l’élève, illisible pour le vérificateur.'
};

export const VAGUE3_BROUILLONS_LOT: Lot = {
	name: 'vague3-brouillons',
	description:
		'Vague 3 (modèles draft) : relatifs + / − (dont trous), comparaison, définition, fractions, unités, pourcentages',
	entries: [...RELATIFS, ...FRACTIONS, ...POURCENTAGES]
};

export const VAGUE3_UNITES_LOT: Lot = {
	name: 'vague3-unites',
	description:
		'Vague 3 (modèles draft) : conversions d’unités — ROUGES au vérificateur (égalité posée avec unités)',
	entries: CONVERSIONS
};
