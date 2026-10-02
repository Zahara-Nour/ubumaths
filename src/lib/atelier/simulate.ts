/**
 * Atelier — une loi à partir de deux listes, et `.simuler`
 *
 * Outils statistiques v2, lot 1, PR (b) (Q72-Q77, 2026-10-02). `.simuler L M n`
 * tire n fois la loi « valeurs L, probabilités M » et range les EFFECTIFS
 * observés dans une nouvelle liste (Q73) : elle tient sous le plafond de 200
 * valeurs quel que soit n, et l'élève enchaîne sur les actions de la v1.
 *
 * La conversion en fractions est celle de l'action « Loi » (lot 6, Q44, Q51),
 * déplacée ici pour être partagée : mêmes refus, mêmes messages.
 *
 * @module atelier/simulate
 */

import type { Atelier } from './atelier.svelte';
import { isList, type ListObject } from './types';
import { readListValue } from './parse';
import { nextName } from './names';
import { Fraction } from '$lib/statistics/fraction';
import { formatFraction, formatStatNumber } from '$lib/statistics/format';
import { simulateCounts, simulateRunningMean, simulateSamples } from '$lib/statistics/simulation';
import { createRandomSource } from '$lib/utils/random';
import type { StatChartScene } from '$lib/ubumark/utils/stat-chart-scene';
import { buildRunningMeanScene, buildSampleMeansScene } from '$lib/ubumark/utils/simulation-scene';

// =============================================================================
// Types
// =============================================================================

export type LawFractions =
	| { readonly ok: true; readonly values: Fraction[]; readonly probabilities: Fraction[] }
	| { readonly ok: false; readonly message: string };

export type SimulateResult =
	| { readonly ok: true; readonly text: string; readonly chart?: StatChartScene }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

const USAGE =
	'Écris la commande ainsi : .simuler L M 100 (valeurs, probabilités, nombre de tirages).';
const FREQUENCY_USAGE =
	'Écris la commande ainsi : .fréquence L M 1000 (valeurs, probabilités, nombre de tirages).';
const SAMPLES_USAGE =
	'Écris la commande ainsi : .échantillons L M 50 100 (valeurs, probabilités, nombre d’échantillons, taille).';

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Une valeur de liste telle que l'élève l'a tapée (`1/10007`), sinon son
 * décimal : le message doit se retrouver dans la liste (revue Q51).
 */
function typedAs(lists: readonly ListObject[], value: number): string {
	for (const list of lists) {
		const typed = list.definition
			.split(';')
			.map((piece) => piece.trim())
			.find((piece) => readListValue(piece) === value);
		if (typed !== undefined) return typed;
	}
	return formatStatNumber(value, 'fr');
}

/**
 * Les valeurs et les probabilités en fractions exactes.
 *
 * ⚠️ Une liste contient des décimaux de la machine (1/6 y vaut 0,1666…) : ils
 * repassent en fractions (dénominateur ≤ 10 000) pour que la somme fasse
 * EXACTEMENT 1 et que E(X) s'écrive 7/2.
 */
export function lawFractions(values: ListObject, probabilities: ListObject): LawFractions {
	const numbers = [...values.values, ...probabilities.values];
	const fractions = numbers.map((n) => Fraction.fromNumber(n));
	// Nommer la valeur fautive (Q51) : l'élève la retrouve dans sa liste
	const faulty = fractions.indexOf(null);
	if (faulty !== -1) {
		return {
			ok: false,
			message: `${typedAs([values, probabilities], numbers[faulty])} ne s’écrit pas comme une fraction simple : la loi ne peut pas être calculée exactement.`
		};
	}
	return {
		ok: true,
		values: fractions.slice(0, values.values.length) as Fraction[],
		probabilities: fractions.slice(values.values.length) as Fraction[]
	};
}

function listNamed(atelier: Atelier, name: string): ListObject | null {
	const object = atelier.get(name);
	return object !== undefined && isList(object) ? object : null;
}

/** 100000 → « 100 000 », comme les messages du moteur */
function grouped(value: number): string {
	return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Une fréquence en français, au millième : 0,173 */
function frequency(count: number, n: number): string {
	return formatStatNumber(Number((count / n).toFixed(3)), 'fr');
}

/** Les deux listes nommées et leur loi en fractions, ou le refus */
function listsAndLaw(
	atelier: Atelier,
	valuesName: string,
	probabilitiesName: string
):
	| { ok: true; values: ListObject; probabilities: ListObject; law: Fraction[][] }
	| { ok: false; message: string } {
	for (const name of [valuesName, probabilitiesName]) {
		if (listNamed(atelier, name) === null) {
			return { ok: false, message: `« ${name} » n’est pas une liste de l’atelier.` };
		}
	}
	const values = listNamed(atelier, valuesName)!;
	const probabilities = listNamed(atelier, probabilitiesName)!;
	// Une liste qualitative (Q88) : la raison du bouton, pas « 0 valeur(s) » (revue)
	const words = [values, probabilities].find((list) => list.categories !== undefined);
	if (words !== undefined) {
		return {
			ok: false,
			message: `${words.name} contient des mots : action pour une liste de nombres.`
		};
	}
	const law = lawFractions(values, probabilities);
	if (!law.ok) return law;
	return { ok: true, values, probabilities, law: [law.values, law.probabilities] };
}

/**
 * Un nombre de tirages tel que tapé : des chiffres seulement. `Number` lirait
 * `0x10`, `1e3`, et `1,000` (virgule décimale) donnerait UN tirage sans
 * prévenir (revue) — NaN est refusé par le moteur, avec le bon message.
 */
function readCount(written: string): number {
	return /^\d+$/.test(written) ? Number(written) : Number.NaN;
}

/** Un réel au millième, à la française */
function thousandth(value: number): string {
	return formatStatNumber(Number(value.toFixed(3)), 'fr');
}

/**
 * `.simuler L M n` : n tirages de la loi, effectifs dans une nouvelle liste.
 *
 * @param argument ce qui suit `.simuler`, les NOMS tels que tapés
 * @param seed la graine de ces tirages (Q76), affichée et rejouable
 */
export function simulateCommand(atelier: Atelier, argument: string, seed: number): SimulateResult {
	const parts = argument.trim().split(/\s+/);
	if (parts.length < 3) return { ok: false, message: USAGE };
	// « 1 000 » s'écrit avec une espace en français : les morceaux de n se recollent
	const [valuesName, probabilitiesName, ...rest] = parts;
	const written = rest.join('');

	const found = listsAndLaw(atelier, valuesName, probabilitiesName);
	if (!found.ok) return found;
	const { values, probabilities } = found;
	const law = { values: found.law[0], probabilities: found.law[1] };

	const n = readCount(written);
	const outcome = simulateCounts(law.values, law.probabilities, n, createRandomSource(seed));
	if (!outcome.ok) return outcome;

	const name = nextName('list', atelier.names);
	const created = atelier.create({
		kind: 'list',
		name,
		definition: outcome.value.counts.join(' ; ')
	});
	if (!created.ok) return { ok: false, message: created.message };

	// Valeurs et probabilités telles que l'élève les a tapées (`0,5`, pas `1/2`) :
	// la ligne se retrouve dans sa liste (revue, comme Q51)
	const lines = values.values.map((value, i) => {
		const count = outcome.value.counts[i];
		const typedValue = typedAs([values], value);
		const typedProbability = typedAs([probabilities], probabilities.values[i]);
		return `${typedValue} : ${count} fois, fréquence ${frequency(count, n)} — probabilité ${typedProbability}`;
	});
	const draws = `${grouped(n)} ${n === 1 ? 'tirage' : 'tirages'}`;
	return {
		ok: true,
		text: [
			`${draws} de ${valuesName} avec probabilités ${probabilitiesName} (graine ${seed}) → effectifs dans ${name}`,
			...lines,
			// Q83 : les deux autres simulations, avec les noms de l'élève
			`Pour aller plus loin : .fréquence ${valuesName} ${probabilitiesName} 1000 · .échantillons ${valuesName} ${probabilitiesName} 50 100`
		].join('\n')
	};
}

/** `.fréquence L M n` : la moyenne des tirages selon n, et sa courbe (Q74, Q81) */
export function frequencyCommand(atelier: Atelier, argument: string, seed: number): SimulateResult {
	const parts = argument.trim().split(/\s+/);
	if (parts.length < 3) return { ok: false, message: FREQUENCY_USAGE };
	const [valuesName, probabilitiesName, ...rest] = parts;
	const found = listsAndLaw(atelier, valuesName, probabilitiesName);
	if (!found.ok) return found;
	const [xs, ps] = found.law;

	const n = readCount(rest.join(''));
	const outcome = simulateRunningMean(xs, ps, n, createRandomSource(seed));
	if (!outcome.ok) return outcome;

	const { means, expectation } = outcome.value;
	const expectationText = formatFraction(expectation);
	return {
		ok: true,
		text: [
			`${grouped(n)} ${n === 1 ? 'tirage' : 'tirages'} de ${valuesName} avec probabilités ${probabilitiesName} (graine ${seed})`,
			`moyenne des tirages : ${thousandth(means[n - 1])} — espérance E = ${expectationText}`
		].join('\n'),
		chart: buildRunningMeanScene(means, expectation.toNumber(), expectationText, 'fr')
	};
}

/** `.échantillons L M N n` : N échantillons de taille n, et leur histogramme (Q75, Q82) */
export function samplesCommand(atelier: Atelier, argument: string, seed: number): SimulateResult {
	const parts = argument.trim().split(/\s+/);
	// Deux nombres : pas d'espace de milliers ici (« 1 000 » serait ambigu)
	if (parts.length !== 4) return { ok: false, message: SAMPLES_USAGE };
	const [valuesName, probabilitiesName, countText, sizeText] = parts;
	const found = listsAndLaw(atelier, valuesName, probabilitiesName);
	if (!found.ok) return found;
	const [xs, ps] = found.law;

	const sampleCount = readCount(countText);
	const sampleSize = readCount(sizeText);
	const outcome = simulateSamples(xs, ps, sampleCount, sampleSize, createRandomSource(seed));
	if (!outcome.ok) return outcome;

	const { means, expectation, deviation, margin, within } = outcome.value;
	// 100 % seulement si TOUS y sont (999 sur 1 000 ne s'arrondit pas à 100)
	const percent =
		within === sampleCount ? 100 : Math.min(99, Math.round((100 * within) / sampleCount));
	// 0 et 1 au singulier, en français
	const plural = within > 1;
	return {
		ok: true,
		text: [
			`${grouped(sampleCount)} ${sampleCount === 1 ? 'échantillon' : 'échantillons'} de ${grouped(sampleSize)} ${sampleSize === 1 ? 'tirage' : 'tirages'} de ${valuesName} avec probabilités ${probabilitiesName} (graine ${seed})`,
			`μ = ${formatFraction(expectation)} ; σ ≈ ${thousandth(deviation)} ; 2σ/√n ≈ ${thousandth(margin)}`,
			`${grouped(within)} ${plural ? 'échantillons' : 'échantillon'} sur ${grouped(sampleCount)} (${percent} %) ${plural ? 'ont' : 'a'} une moyenne à moins de ${thousandth(margin)} de μ`
		].join('\n'),
		chart: buildSampleMeansScene(means, expectation.toNumber(), margin, 'fr')
	};
}
