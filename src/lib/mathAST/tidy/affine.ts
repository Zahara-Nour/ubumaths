/**
 * L'arithmétique des températures, dans `tidy`.
 *
 * Contrat : `docs/wip/tidy-phase0.md` §D.2 — les règles de `evaluateWithUnits`,
 * reprises telles quelles, mais **sans jamais lever** :
 *
 * | somme            | résultat                         |
 * | ---------------- | -------------------------------- |
 * | `30[°C]-20[°C]`  | `10[K]` (absolue − absolue = écart) |
 * | `20[°C]+5[K]`    | `25[°C]` (absolue ± écart)       |
 * | `5[K]+20[°C]`    | `25[°C]`                         |
 * | `20[°C]+5[°C]`   | inchangé (somme de deux absolues) |
 * | `5[K]-20[°C]`    | inchangé (écart − absolue)       |
 *
 * `normalize` fait déjà ce calcul sur les formes normales ; `tidy` doit le
 * refaire, car il ne passe pas par `normalize` — et c'est lui qui rend
 * l'écriture. Tout est en rationnels exacts (`293,15 = 5463/20`) ; le décimal
 * n'apparaît qu'à la sortie.
 *
 * @module mathAST/tidy/affine
 */

import type { MathNode } from '../types';
import type { Unit } from '../units/types';
import type { Rational } from '../normal/types';
import { flattenSumShallow } from '../flatten';
import { extractRational } from '../common/numeric';
import { add, number, opposite, subtract, withUnit } from '../factory';
import {
	absRational,
	addRational,
	divRational,
	mulRational,
	negRational,
	subRational
} from '../normal/rational';
import { exactConversion } from '../units/exact';
import { parse as parseUnit } from '../units/parser';
import { format as formatUnit } from '../units/formatter';
import { decimalString } from './decimal';

/** Zéro kelvin d'écart : l'accumulateur des écarts d'une somme. */
const ZERO_KELVIN: Rational = { n: 0n, d: 1n };

// =============================================================================
// Types
// =============================================================================

/**
 * Une grandeur numérique de température, telle qu'elle est écrite : sa valeur,
 * son unité, son signe dans la somme, et sa lecture en kelvins — absolue pour
 * une unité affine (°C, °F), écart pour une unité linéaire (K).
 */
type TemperatureTerm = {
	readonly negated: boolean;
	/** Le nœud portait-il au moins un signe (`-`, `+`) devant la grandeur ? */
	readonly signed: boolean;
	readonly unit: Unit;
	readonly value: Rational;
	readonly coefficient: Rational;
	readonly kelvin: Rational;
	readonly absolute: boolean;
};

// =============================================================================
// Lecture d'un opérande
// =============================================================================

/** La grandeur de température que porte ce nœud, signes repliés, ou `null`. */
function temperatureTerm(node: MathNode, negated: boolean): TemperatureTerm | null {
	let current = node;
	let sign = negated;
	let signed = false;

	for (;;) {
		if (current.type === 'delimiter') {
			current = current.content;
			continue;
		}
		if (current.type === 'positive') {
			signed = true;
			current = current.operand;
			continue;
		}
		if (current.type === 'opposite') {
			signed = true;
			sign = !sign;
			current = current.operand;
			continue;
		}
		break;
	}

	if (current.type !== 'unit') return null;

	const conversion = exactConversion(current.unit.original ?? formatUnit(current.unit));
	if (conversion === null) return null;
	if (conversion.components.size !== 1 || conversion.components.get('K') !== 1) return null;

	const value = extractRational(current.expression);
	if (value === null) return null;

	const offset = conversion.offset;
	const shifted = offset === null ? value : addRational(value, offset);
	return {
		negated: sign,
		signed,
		unit: current.unit,
		value,
		coefficient: conversion.coefficient,
		kelvin: mulRational(shifted, conversion.coefficient),
		absolute: offset !== null
	};
}

// =============================================================================
// Écriture du résultat
// =============================================================================

/** Une grandeur écrite en décimal, ou `null` si le décimal est infini. */
function quantityNode(value: Rational, unit: Unit): MathNode | null {
	const magnitude = decimalString(absRational(value));
	if (magnitude === null) return null;
	const written = number(magnitude);
	return withUnit(value.n < 0n ? opposite(written) : written, unit);
}

/** La somme telle qu'elle est écrite : une composition interdite ne bouge pas. */
function asWritten(terms: readonly TemperatureTerm[]): MathNode | null {
	const [first, ...rest] = terms;
	const firstValue = first.negated ? negRational(first.value) : first.value;
	let result = quantityNode(firstValue, first.unit);
	if (result === null) return null;

	for (const term of rest) {
		const node = quantityNode(term.value, term.unit);
		if (node === null) return null;
		result = term.negated ? subtract(result, node) : add(result, node);
	}
	return result;
}

// =============================================================================
// Point d'entrée
// =============================================================================

/**
 * Met au propre une somme de températures numériques, ou rend `null` si ce
 * n'en est pas une — la mise au propre ordinaire reprend alors la main.
 *
 * Les écarts (K) se cumulent librement ; les absolues (°C, °F) ne se somment
 * pas. Une absolue, plus des écarts, reste dans l'unité de l'absolue ; deux
 * absolues de signes opposés donnent un écart en kelvins. Tout le reste est
 * interdit et rendu **tel qu'il est écrit**, sans exception ni réordonnancement.
 */
export function tidyTemperatureSum(node: MathNode): MathNode | null {
	if (node.type !== 'addition' && node.type !== 'subtraction') return null;

	const parts = flattenSumShallow(node);
	if (parts.length < 2) return null;

	const terms: TemperatureTerm[] = [];
	for (const { sign, term } of parts) {
		const temperature = temperatureTerm(term, sign === '-');
		if (temperature === null) return null;
		terms.push(temperature);
	}

	const absolutes = terms.filter((term) => term.absolute);
	// Que des écarts : ils s'additionnent comme deux grandeurs ordinaires.
	if (absolutes.length === 0) return null;

	// La somme signée des écarts, en kelvins.
	const deltas = terms
		.filter((term) => !term.absolute)
		.reduce(
			(total, term) =>
				term.negated ? subRational(total, term.kelvin) : addRational(total, term.kelvin),
			ZERO_KELVIN
		);

	if (absolutes.length === 1) {
		const [absolute] = absolutes;
		// Écart − absolue : interdit.
		if (absolute.negated) return asWritten(terms);
		const shift = divRational(deltas, absolute.coefficient);
		return quantityNode(addRational(absolute.value, shift), absolute.unit);
	}

	if (absolutes.length === 2) {
		const [first, second] = absolutes;
		// Somme de deux absolues : interdite.
		if (first.negated === second.negated) return asWritten(terms);
		const [plus, minus] = first.negated ? [second, first] : [first, second];
		const kelvin = parseUnit('K');
		if (kelvin === null) return null;
		return quantityNode(addRational(subRational(plus.kelvin, minus.kelvin), deltas), kelvin);
	}

	// Trois absolues ou plus : aucune lecture n'a de sens.
	return asWritten(terms);
}

/**
 * Replie une **chaîne de signes** autour d'une température seule dans sa
 * valeur : `-(-20[°C])` est la température 20 °C, `+(-20[°C])` la température
 * −20 °C (finding F1 de la seconde revue). `null` s'il n'y a pas de signe, ou
 * pas de température numérique seule.
 */
export function tidySignedTemperature(node: MathNode): MathNode | null {
	const term = temperatureTerm(node, false);
	if (term === null || !term.signed || !term.absolute) return null;
	return quantityNode(term.negated ? negRational(term.value) : term.value, term.unit);
}
