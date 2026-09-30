/**
 * Source de hasard des générateurs de questions
 * =============================================
 *
 * Une instance de question tire tout son hasard d'UNE source, consommée dans l'ordre :
 * choix de variation, variables, tirages en ligne, couleurs, mélange des choix, nouveaux
 * essais. Avec une graine, la source est un générateur pseudo-aléatoire (mulberry32)
 * initialisé par la graine : même graine → même suite de tirages → même instance.
 * Sans graine, la source est `Math.random` : même chemin, pas de branche séparée.
 *
 * On ne recalcule JAMAIS un tirage depuis la graine (`f(seed)`, `f(seed + i)`) : deux
 * tirages qui reçoivent la même graine seraient égaux, et deux tirages successifs
 * (branche d'une liste, puis valeur de la sous-plage) seraient corrélés.
 *
 * ⚠️ Pas cryptographique : contenu pédagogique seulement.
 *
 * @module utils/random
 */

/** Rend un réel de [0, 1[ à chaque appel ; chaque appel fait avancer la source */
export type RandomSource = () => number;

/**
 * Source d'une instance : pseudo-aléatoire reproductible avec une graine
 * (0 comprise), `Math.random` sans graine.
 */
export function createRandomSource(seed?: number): RandomSource {
	return seed === undefined ? Math.random : mulberry32(seedToState(seed));
}

/** Entier uniforme de [min, max] (bornes comprises), un tirage consommé */
export function randomInt(min: number, max: number, random: RandomSource): number {
	return Math.floor(random() * (max - min + 1)) + min;
}

/** Indice uniforme de [0, length[, un tirage consommé */
export function randomIndex(length: number, random: RandomSource): number {
	return Math.floor(random() * length);
}

/** Mélange de Fisher-Yates dans une copie ; `length - 1` tirages consommés */
export function shuffled<T>(items: readonly T[], random: RandomSource): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = randomIndex(i + 1, random);
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * Graine quelconque (négative, au-delà de 2³²) → état 32 bits.
 * Les deux moitiés de la graine sont mêlées : 1 et 2³² + 1 ne donnent pas la même suite.
 */
function seedToState(seed: number): number {
	const integer = Math.trunc(seed);
	const low = integer >>> 0;
	const high = Math.floor(integer / 0x100000000) >>> 0;
	return (low ^ Math.imul(high, 0x9e3779b9)) >>> 0;
}

/** mulberry32 : état 32 bits, période 2³², bonne répartition pour des graines voisines */
function mulberry32(initialState: number): RandomSource {
	let state = initialState;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
