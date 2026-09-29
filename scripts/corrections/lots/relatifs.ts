/**
 * Addition et soustraction de relatifs (N-REL-*) : briques de rédaction
 * =====================================================================
 *
 * Textes RÉDIGÉS : chaque modèle du lot `vague3` les assemble variation par
 * variation, d'après la STRUCTURE réelle de la variation (relue en prod le
 * 2026-09-29). Couleurs (palette.ts) : les signes « − » regardés en
 * `transformed`, « même signe / signes contraires » en `intermediate`, le signe
 * du résultat en `conclusion`.
 *
 * Un nombre est donné par sa DISTANCE À ZÉRO, en deux écritures : `latex` (ce
 * qu'on écrit : `{{a}}`, `{{eval:a+0.5;d}}`) et `value` (l'expression numérique
 * des conditions : `a`, `a+0.5`).
 */

import { alignBlock, colored, inline } from '../lib/palette';

// ============================================================================
// TYPES
// ============================================================================

export interface Magnitude {
	latex: string;
	value: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const RULE_REL_ADD =
	'**Addition de deux nombres relatifs.** Deux nombres de même signe : on garde ce signe ' +
	'et on additionne leurs distances à zéro. Deux nombres de signes contraires : on prend le ' +
	'signe de celui qui est le plus éloigné de zéro, et on soustrait les distances à zéro.';

export const RULE_DROITE =
	'**Sur la droite graduée**, ajouter un nombre positif, c’est avancer vers la droite ; ' +
	'soustraire un nombre positif, c’est reculer vers la gauche.';

export const RULE_REL_SUB =
	'**Soustraire un nombre, c’est ajouter son opposé** : $a - b = a + \\left( -b \\right)$ et ' +
	'$a - \\left( -b \\right) = a + b$.';

export const RULE_OPPOSES =
	'**Deux nombres opposés** ont la même distance à zéro et des signes contraires ; ' +
	'leur somme est égale à $0$.';

export const RULE_REL_DEF =
	'**Définition.** Le nombre $-a$ est le résultat de la soustraction $0 - a$ : ' +
	'c’est le nombre qu’il faut ajouter à $a$ pour obtenir $0$.';

export const RULE_REL_ALG =
	'**Somme algébrique.** On regroupe les termes positifs d’un côté, les termes négatifs de ' +
	'l’autre : on additionne les uns, on additionne les distances à zéro des autres, puis on ' +
	'conclut avec la règle des signes contraires.';

export const RULE_COMPARE =
	'**Comparer deux relatifs.** Un nombre négatif est plus petit qu’un nombre positif. ' +
	'Entre deux nombres négatifs, le plus petit est celui qui est le plus éloigné de zéro.';

// ============================================================================
// FUNCTIONS — écriture
// ============================================================================

export const orange = (latex: string): string => colored('transformed', latex);
export const blue = (latex: string): string => colored('intermediate', latex);
export const green = (latex: string): string => colored('conclusion', latex);

export const mag = (latex: string, value = latex.replace(/[{}]/g, '')): Magnitude => ({
	latex,
	value
});

/** `{{a}}` → magnitude `a` */
export const vm = (name: string): Magnitude => ({ latex: `{{${name}}}`, value: name });

/** Nombre négatif : `\left( −3 \right)` dans une opération, `−3` seul */
export function neg(m: Magnitude, parenthesized = true): string {
	const bare = `${orange('-')}${m.latex}`;
	return parenthesized ? `\\left( ${bare} \\right)` : bare;
}

export function relation(sameSign: boolean): string {
	return inline(blue(`\\text{${sameSign ? 'même signe' : 'signes contraires'}}`));
}

export function signWord(negative: boolean, feminine = false): string {
	const word = negative ? 'négati' : 'positi';
	return inline(green(`\\text{${word}${feminine ? 've' : 'f'}}`));
}

/** Nombre signé d'une expression numérique (condition), écrit avec parenthèses s'il est négatif */
export function signedEval(expression: string, parenthesized = true): string {
	const negative = `${orange('-')}{{eval:abs(${expression})}}`;
	return `{{if:(${expression})<0|${parenthesized ? `\\left( ${negative} \\right)` : negative}|{{eval:${expression}}}}}`;
}

// ============================================================================
// FUNCTIONS — sommes (calcul et raisonnement)
// ============================================================================

export interface SumStep {
	/** Phrase qui applique la règle aux nombres tirés */
	reason: string;
	/** Lignes du calcul qui SUIVENT le premier membre (`&= …`) */
	lines: string[];
}

/** `(−m1) + (−m2)` : même signe, négatif */
export function sumNegNeg(m1: Magnitude, m2: Magnitude): SumStep {
	return {
		reason:
			`${inline(neg(m1, false))} et ${inline(neg(m2, false))} sont de ${relation(true)} : ` +
			`la somme est ${signWord(true)}, et on additionne les distances à zéro.`,
		lines: [`&= ${green('-')}\\left( ${m1.latex} + ${m2.latex} \\right)`, '&= {{solution}}']
	};
}

/**
 * `(−m1) + m2` : signes contraires. Le signe est celui du plus éloigné de zéro ;
 * égalité des distances → nombres opposés, somme nulle.
 */
export function sumNegPos(m1: Magnitude, m2: Magnitude): SumStep {
	const a = m1.value;
	const b = m2.value;
	const pair = `${inline(neg(m1, false))} et ${inline(m2.latex)} sont de ${relation(false)}`;
	return {
		reason:
			`${pair}. {{if:(${a})>(${b})|${inline(neg(m1, false))} est le plus éloigné de zéro : ` +
			`la somme est ${signWord(true)}.|{{if:(${a})<(${b})|${inline(m2.latex)} est le plus ` +
			`éloigné de zéro : la somme est ${signWord(false)}.|Ils ont la même distance à zéro : ` +
			`ils sont opposés, leur somme est nulle.}}}} {{if:(${a})=(${b})||On soustrait les ` +
			`distances à zéro.}}`,
		lines: [
			`{{if:(${a})>(${b})|&= ${green('-')}\\left( ${m1.latex} - ${m2.latex} \\right) \\\\ |` +
				`{{if:(${a})<(${b})|&= ${green('+')}\\left( ${m2.latex} - ${m1.latex} \\right) \\\\ |}}}}` +
				'&= {{solution}}'
		]
	};
}

/** `m1 + (−m2)` : signes contraires, le positif en premier */
export function sumPosNeg(m1: Magnitude, m2: Magnitude): SumStep {
	const a = m1.value;
	const b = m2.value;
	return {
		reason:
			`${inline(m1.latex)} et ${inline(neg(m2, false))} sont de ${relation(false)}. ` +
			`{{if:(${a})>(${b})|${inline(m1.latex)} est le plus éloigné de zéro : la somme est ` +
			`${signWord(false)}.|{{if:(${a})<(${b})|${inline(neg(m2, false))} est le plus éloigné ` +
			`de zéro : la somme est ${signWord(true)}.|Ils ont la même distance à zéro : ils sont ` +
			`opposés, leur somme est nulle.}}}} {{if:(${a})=(${b})||On soustrait les distances à zéro.}}`,
		lines: [
			`{{if:(${a})>(${b})|&= ${green('+')}\\left( ${m1.latex} - ${m2.latex} \\right) \\\\ |` +
				`{{if:(${a})<(${b})|&= ${green('-')}\\left( ${m2.latex} - ${m1.latex} \\right) \\\\ |}}}}` +
				'&= {{solution}}'
		]
	};
}

/** Correction complète d'une somme : règle (+ droite), raisonnement, calcul */
export function sumCorrection(options: {
	first: string;
	step: SumStep;
	/** Étapes avant la règle d'addition (droite graduée, soustraction → addition) */
	before?: string[];
	/** Lignes intercalées entre le premier membre et le calcul de la somme */
	rewrite?: string[];
}): string[] {
	const { first, step } = options;
	return [
		...(options.before ?? []),
		RULE_REL_ADD,
		step.reason,
		alignBlock([`${first} ${[...(options.rewrite ?? []), ...step.lines].join(' \\\\ ')}`])
	];
}

// ============================================================================
// FUNCTIONS — droite graduée
// ============================================================================

/** Phrase de déplacement sur la droite graduée : départ, avancer / reculer de `m` */
export function move(start: string, forward: boolean, m: Magnitude): string {
	return (
		`Sur la droite graduée, on part de ${inline(start)} et on ` +
		`${forward ? 'avance' : 'recule'} de ${inline(m.latex)} {{if:(${m.value})>1|graduations|graduation}} vers la ` +
		`${forward ? 'droite' : 'gauche'}.`
	);
}

// ============================================================================
// FUNCTIONS — nombre manquant d'une somme / différence
// ============================================================================

/**
 * `x + ? = r` (ou `? + x = r`), `x − ? = r` : le nombre manquant se lit comme un
 * DÉPLACEMENT de `x` à `r` — son signe dit le sens (avancer / reculer), sa distance
 * à zéro est l'écart entre `x` et `r` (différence des distances à zéro si `x` et `r`
 * sont de même signe, somme sinon).
 *
 * `x`, `r` : expressions numériques des variables tirées (conditions).
 */
export function holeCorrection(options: {
	x: string;
	r: string;
	operation: 'add' | 'sub';
	droite: boolean;
}): string[] {
	const { x, r, operation, droite } = options;
	const X = signedEval(x, false);
	const R = signedEval(r, false);
	const forward = `(${r})>(${x})`;
	// Écart entre x et r, écrit à partir des distances à zéro
	const ax = `{{eval:abs(${x})}}`;
	const ar = `{{eval:abs(${r})}}`;
	const gap =
		`{{if:(${x})*(${r})=0|{{eval:abs(${x})+abs(${r})}}|` +
		`{{if:(${x})*(${r})<0|${ax} + ${ar}|` +
		`{{if:(${x})*(${x})>(${r})*(${r})|${ax} - ${ar}|${ar} - ${ax}}}}}}}`;
	const gapWords =
		`{{if:(${x})*(${r})=0|l’un des deux est $0$, l’écart est la distance à zéro de l’autre.|` +
		`{{if:(${x})*(${r})<0|ils sont de part et d’autre de zéro, on additionne leurs distances à zéro.|` +
		`ils sont du même côté de zéro, on soustrait leurs distances à zéro.}}}}`;
	const moving = droite ? 'Sur la droite graduée, pour aller' : 'Pour aller';
	const direction =
		`{{if:${forward}|on ${inline(blue('\\text{avance}'))} vers la droite|` +
		`on ${inline(blue('\\text{recule}'))} vers la gauche}}`;
	const missingSign =
		operation === 'add'
			? `{{if:${forward}|ajouter un nombre ${signWord(false)}|ajouter un nombre ${signWord(true)}}}`
			: `{{if:${forward}|soustraire un nombre ${signWord(true)}|soustraire un nombre ${signWord(false)}}}`;
	const signOf = operation === 'add' ? `{{if:${forward}|+|-}}` : `{{if:${forward}|-|+}}`;
	return [
		droite ? RULE_DROITE : RULE_REL_ADD,
		`${moving} de ${inline(X)} à ${inline(R)}, ${direction} : c’est ${missingSign}.`,
		`Sa distance à zéro est l’écart entre ${inline(X)} et ${inline(R)} : ${gapWords}`,
		alignBlock([`? &= ${green(signOf)}\\left( ${gap} \\right)`, '&= {{solution}}'])
	];
}
