/**
 * Zéros finaux qui disent quelque chose
 * =====================================
 *
 * Un zéro final ne s'écrit que s'il dit quelque chose : arrondi, centimes, ou
 * demandé par l'auteur (décision de l'auteur, 2026-11-26). La règle `zeros` du
 * juge retire les zéros finaux d'une réponse ; ce module dit quand ils sont
 * UTILES, donc à ne pas signaler :
 *
 * - arrondi à N décimales (`precision` decimal) : la bonne écriture a
 *   exactement N décimales (« 3,0 » au dixième de 3,04). Moins de décimales,
 *   valeur juste (« 3 ») : il manque des chiffres → perfectible, avec un
 *   message (`missingFeedback`) ;
 * - arrondi à N chiffres significatifs : ramené au nombre de décimales que ces
 *   N chiffres font écrire (3,04 à 2 chiffres → 1 décimale) ; aucune exigence
 *   quand le dernier chiffre gardé est dans la partie entière (« 1 200 ») ;
 * - grandeur en euros : exactement deux décimales, les centimes (« 3,70 € »).
 *
 * Seules les écritures décimales simples sont lues (signe, espaces de
 * groupement, virgule ou point) : une fraction ou une notation scientifique
 * n'a rien à dire ici, la règle `zeros` reste la même.
 *
 * Le verdict ne vaut que pour une réponse déjà jugée juste en valeur : il ne
 * regarde que l'écriture.
 *
 * @module questions/meaningful-zeros
 */

import { resolveUnit } from '#lib/mathAST/units/definitions.ts';
import type { RoundingPrecision } from './rounding';

// ============================================================================
// TYPES
// ============================================================================

/** Ce que les zéros finaux d'une réponse arrondie disent */
export interface RoundingZerosVerdict {
	/** Les zéros finaux tapés sont exigés par l'arrondi : `zeros` ne les signale pas */
	trailingZerosMeaningful: boolean;
	/** Moins de décimales que l'arrondi n'en fait écrire : message à l'élève */
	missingFeedback?: string;
}

/** Écriture décimale simple lue : nombre de décimales tapées et valeur */
interface PlainDecimal {
	decimals: number;
	value: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Rang décimal nommé : « Arrondi au dixième : écris le chiffre des dixièmes… » */
const DECIMAL_RANKS: Record<number, { singular: string; plural: string }> = {
	1: { singular: 'dixième', plural: 'dixièmes' },
	2: { singular: 'centième', plural: 'centièmes' },
	3: { singular: 'millième', plural: 'millièmes' }
};

/** Décimales d'une somme en euros : les centimes */
const CENTS_DECIMALS = 2;

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * Lit une écriture décimale simple (`3{,}70`, `-2.5`, `12\,345{,}6`).
 * `null` pour toute autre écriture.
 */
function readPlainDecimal(latex: string): PlainDecimal | null {
	const compact = latex
		.replace(/\\[,;:! ]|~|\s/g, '')
		.replace(/\{,\}|\{\.\}|,/g, '.')
		.replace(/^\+/, '');
	if (!/^-?\d+(?:\.\d+)?$/.test(compact)) return null;
	const [, fractionalPart = ''] = compact.split('.');
	return { decimals: fractionalPart.length, value: Number(compact) };
}

/**
 * Décimales qu'un arrondi demandé fait écrire, zéros compris. `0` : aucune
 * exigence (arrondi à l'unité, dernier chiffre significatif dans la partie
 * entière, valeur nulle).
 */
function requiredDecimals(precision: RoundingPrecision, value: number): number {
	if (precision.type === 'decimal') return Math.max(0, precision.digits);
	if (value === 0) return 0;
	const magnitude = Math.floor(Math.log10(Math.abs(value)));
	return Math.max(0, precision.digits - 1 - magnitude);
}

/** Message d'un arrondi juste dont les zéros finaux manquent */
export function missingRoundingZerosFeedback(precision: RoundingPrecision): string {
	const { type, digits } = precision;
	if (type === 'significant') {
		return `Arrondi à ${digits} chiffres significatifs : écris les ${digits} chiffres, même les zéros.`;
	}
	const rank = DECIMAL_RANKS[digits];
	return rank
		? `Arrondi au ${rank.singular} : écris le chiffre des ${rank.plural}, même si c'est 0.`
		: `Arrondi à ${digits} décimales : écris les ${digits} décimales, même les zéros.`;
}

/**
 * Zéros finaux d'une réponse arrondie, juste en valeur : utiles (exactement le
 * nombre de décimales que l'arrondi fait écrire) ou manquants (moins).
 *
 * @param studentLatex - partie numérique telle que l'élève l'a tapée
 */
export function roundingZerosVerdict(
	studentLatex: string,
	precision: RoundingPrecision
): RoundingZerosVerdict {
	const writing = readPlainDecimal(studentLatex);
	if (!writing) return { trailingZerosMeaningful: false };

	const required = requiredDecimals(precision, writing.value);
	if (required === 0) return { trailingZerosMeaningful: false };
	if (writing.decimals < required) {
		return {
			trailingZerosMeaningful: false,
			missingFeedback: missingRoundingZerosFeedback(precision)
		};
	}
	return { trailingZerosMeaningful: writing.decimals === required };
}

/**
 * Écriture d'une valeur arrondie avec ses zéros utiles, virgule française
 * (3 au dixième → « 3,0 » ; 0,1 à 2 chiffres significatifs → « 0,10 »), pour les
 * messages qui montrent la bonne réponse.
 */
export function writtenRoundedValue(value: number, precision: RoundingPrecision): string {
	return value.toFixed(requiredDecimals(precision, value)).replace('.', ',');
}

/**
 * Somme en euros écrite avec exactement deux décimales (« 3,70 € ») : ses zéros
 * finaux sont les centimes, jamais superflus.
 *
 * @param numericLatex - partie numérique tapée
 * @param unit - unité tapée (`€`, `euros`, `EUR`…)
 */
export function centsZerosMeaningful(numericLatex: string, unit: string | null): boolean {
	if (unit === null || resolveUnit(unit.trim())?.symbol !== '€') return false;
	return readPlainDecimal(numericLatex)?.decimals === CENTS_DECIMALS;
}
