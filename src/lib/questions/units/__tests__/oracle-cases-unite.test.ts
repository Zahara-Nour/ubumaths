/**
 * Oracle de la correction des cases à unité (chantier correction-cases-unite)
 * ===========================================================================
 *
 * Les 25 modèles publiés à case à unité (copiés de la production, lecture
 * seule, `tests/fixtures/correction-cases-unite/modeles/`) sont tirés à
 * graines fixes ; chaque case reçoit une batterie de réponses typiques
 * d'élève, écrites comme MathLive les écrit. Le verdict de `validateAnswer`
 * (le parcours de l'élève) est figé dans `oracle.json`.
 *
 * Tout verdict qui change est une décision : voulu → `ORACLE_MAJ=1` pour
 * réécrire l'oracle, dans le même commit que le changement ; sinon régression.
 *
 * La prod ne garde aucune réponse d'élève aux cases à unité (2026-10-19) :
 * l'oracle repose sur les vraies questions, pas sur de vraies réponses.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate } from '$lib/questions/types';
import { validateAnswer } from '$lib/utils/answer-validator';

// ============================================================================
// TYPES
// ============================================================================

interface OracleEntry {
	modele: string;
	graine: number;
	attendu: string;
	famille: string;
	saisie: string;
	juste: boolean;
	message: string | null;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const FIXTURES = 'tests/fixtures/correction-cases-unite';
const MODELES = join(FIXTURES, 'modeles');
const ORACLE = join(FIXTURES, 'oracle.json');
const GRAINES = [1, 2, 3, 4, 5, 6, 7, 8];

/** Familles d'unités : du plus grand au plus petit, rapport 10 entre voisines */
const ECHELLES: string[][] = [
	['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm'],
	['kg', 'hg', 'dag', 'g', 'dg', 'cg', 'mg'],
	['kL', 'hL', 'daL', 'L', 'dL', 'cL', 'mL']
];

// ============================================================================
// ÉCRITURES
// ============================================================================

/** Un nombre sans bruit de flottant (`2.5*100` → 250) */
function clean(value: number): number {
	return Number(value.toPrecision(12));
}

/** Vrai si la valeur s'écrit en au plus 4 décimales (sinon un élève l'arrondit) */
function isShortDecimal(value: number): boolean {
	return Math.abs(clean(value) - Number(clean(value).toFixed(4))) < 1e-12;
}

/** La valeur telle qu'un élève l'écrit : exacte si courte, sinon arrondie au centième */
function studentValue(value: number): { value: number; famille: string } {
	return isShortDecimal(value)
		? { value: clean(value), famille: '' }
		: { value: Number(value.toFixed(2)), famille: '-arrondie' };
}

/** Nombre écrit comme MathLive l'écrit : virgule en `{,}` */
function mathliveNumber(value: number): string {
	return String(clean(value)).replace('.', '{,}');
}

/** Nombre écrit au clavier ordinaire : virgule simple */
function plainNumber(value: number): string {
	return String(clean(value)).replace('.', ',');
}

/** Unité comme le clavier « Unités » de MathLive l'écrit */
function mathliveUnit(unit: string): string {
	if (unit === 'min') return '\\min';
	const power = /^(.+)\^(\d)$/.exec(unit);
	if (power) return `\\operatorname{\\mathrm{${power[1]}}}^${power[2]}`;
	return `\\operatorname{\\mathrm{${unit}}}`;
}

/** `v unité` à la MathLive ; la vitesse en fraction, le nombre DANS le numérateur */
function mathliveQuantity(value: number, unit: string): string {
	if (unit === 'km.h^{-1}')
		return `\\frac{${mathliveNumber(value)}\\operatorname{\\mathrm{km}}}{h}`;
	if (unit === 'm.s^{-1}') return `\\frac{${mathliveNumber(value)}\\operatorname{\\mathrm{m}}}{s}`;
	return `${mathliveNumber(value)}${mathliveUnit(unit)}`;
}

/** L'unité voisine plus petite et le facteur de conversion, ou null */
function smallerNeighbour(unit: string): { unit: string; factor: number } | null {
	const power = /^(.+)\^(\d)$/.exec(unit);
	const base = power ? power[1] : unit;
	const exponent = power ? Number(power[2]) : 1;
	for (const scale of ECHELLES) {
		const index = scale.indexOf(base);
		if (index === -1) continue;
		const next = index < scale.length - 1 ? scale[index + 1] : scale[index - 1];
		const factor = index < scale.length - 1 ? 10 ** exponent : 10 ** -exponent;
		return { unit: power ? `${next}^${exponent}` : next, factor };
	}
	if (unit === 'h') return { unit: 'min', factor: 60 };
	if (unit === 'min') return { unit: 's', factor: 60 };
	if (unit === 'km.h^{-1}') return { unit: 'm.s^{-1}', factor: 1 / 3.6 };
	return null;
}

/** Une autre grandeur que celle attendue */
function foreignUnit(unit: string): string {
	return ECHELLES[1].some((u) => unit.startsWith(u) || unit === u) ? 'm' : 'kg';
}

/** `2 h 15 min` à la MathLive, depuis une durée en minutes (entière) */
function compositeDuration(minutes: number): string | null {
	if (!Number.isInteger(minutes) || minutes < 60) return null;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest === 0
		? `${hours}\\operatorname{\\mathrm{h}}`
		: `${hours}\\operatorname{\\mathrm{h}}\\,${rest}\\min`;
}

/** Les réponses typiques d'un élève pour l'attendu `valeur[unité]` */
function answersFor(value: number, unit: string): { famille: string; saisie: string }[] {
	const answers: { famille: string; saisie: string }[] = [
		{ famille: 'juste', saisie: mathliveQuantity(value, unit) },
		{ famille: 'juste-clavier', saisie: `${plainNumber(value)} ${unit}` },
		{ famille: 'juste-colle', saisie: `${plainNumber(value)}${unit}` },
		{ famille: 'sans-unite', saisie: mathliveNumber(value) },
		{ famille: 'valeur-fausse', saisie: mathliveQuantity(value + 1, unit) },
		{ famille: 'autre-grandeur', saisie: mathliveQuantity(value, foreignUnit(unit)) }
	];
	if (!Number.isInteger(value)) {
		answers.push({
			famille: 'point-decimal',
			saisie: mathliveQuantity(value, unit).replace('{,}', '.')
		});
	}
	const neighbour = smallerNeighbour(unit);
	if (neighbour) {
		const converted = studentValue(value * neighbour.factor);
		answers.push(
			{
				famille: `convertie${converted.famille}`,
				saisie: mathliveQuantity(converted.value, neighbour.unit)
			},
			{ famille: 'non-convertie', saisie: mathliveQuantity(value, neighbour.unit) }
		);
		// Facteur d'une longueur pour une aire (×10 au lieu de ×100)
		if (unit.endsWith('^2')) {
			answers.push({
				famille: 'convertie-facteur-10',
				saisie: mathliveQuantity(value * 10, neighbour.unit)
			});
		}
	}
	if (unit === 'min') {
		const composite = compositeDuration(value);
		if (composite) answers.push({ famille: 'duree-composee', saisie: composite });
		const hours = studentValue(value / 60);
		answers.push({
			famille: `heures-decimales${hours.famille}`,
			saisie: mathliveQuantity(hours.value, 'h')
		});
	}
	if (unit === 'h') {
		const composite = compositeDuration(clean(value * 60));
		if (composite) answers.push({ famille: 'duree-composee', saisie: composite });
		// Erreur classique : 2,5 h lu « 2 h 50 min »
		const [hours, decimals] = String(clean(value)).split('.');
		if (decimals) {
			answers.push({
				famille: 'heures-decimales-lues-minutes',
				saisie: `${hours}\\operatorname{\\mathrm{h}}\\,${decimals.padEnd(2, '0')}\\min`
			});
		}
	}
	return answers;
}

/** `20[km.h^{-1}]` → { value, unit } */
function readExpected(expected: string): { value: number; unit: string } | null {
	const match = /^\(?\+?(-?\d+(?:\.\d+)?)\[([^[\]]+)\]\)?$/.exec(expected.trim());
	return match ? { value: Number(match[1]), unit: match[2] } : null;
}

// ============================================================================
// CALCUL DE L'ORACLE
// ============================================================================

function computeOracle(): OracleEntry[] {
	const entries: OracleEntry[] = [];
	for (const file of readdirSync(MODELES).sort()) {
		const template = JSON.parse(readFileSync(join(MODELES, file), 'utf8')) as QuestionTemplate;
		const modele = file.replace(/\.json$/, '');
		for (const graine of GRAINES) {
			const generated = generateInstance(template, graine);
			if (!generated.success) throw new Error(`${modele} graine ${graine} : tirage impossible`);
			const instance = generated.instance;
			const blanks = instance.blanks ?? [];
			blanks.forEach((blank, index) => {
				if (!blank.unit?.expected) return;
				const expected = readExpected(blank.expectedAnswer);
				if (!expected) throw new Error(`${modele} : attendu illisible ${blank.expectedAnswer}`);
				for (const { famille, saisie } of answersFor(expected.value, expected.unit)) {
					// Les autres cases reçoivent leur attendu : seule celle-ci est jugée
					const answers = blanks.map((b, i) => (i === index ? saisie : b.expectedAnswer));
					const result = validateAnswer(answers, instance, answers);
					entries.push({
						modele,
						graine,
						attendu: blank.expectedAnswer,
						famille,
						saisie,
						juste: result.isCorrect,
						message: result.feedback ?? result.message ?? null
					});
				}
			});
		}
	}
	return entries;
}

// ============================================================================
// TEST
// ============================================================================

describe('oracle de la correction des cases à unité', () => {
	it('chaque réponse garde son verdict', () => {
		const actual = computeOracle();
		if (process.env.ORACLE_MAJ === '1' || !existsSync(ORACLE)) {
			writeFileSync(ORACLE, `${JSON.stringify(actual, null, '\t')}\n`);
		}
		const frozen = JSON.parse(readFileSync(ORACLE, 'utf8')) as OracleEntry[];
		expect(actual).toEqual(frozen);
	});
});
