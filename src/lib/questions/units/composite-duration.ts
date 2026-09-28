/**
 * Unit System - Composite Durations
 * ==================================
 *
 * Lit une réponse d'élève écrite en durée composée : « 2 h 15 min »,
 * « 1 h 5 min 30 s », « 2 min 30 s » (lot 3, décisions de David du 2026-09-28).
 *
 * Saisies mesurées au vrai clavier (MathLive 0.110.0) : `2\,h\,15\,\min`,
 * `2h15\min`, `2\,h\,15`, `2\,h\,15\,mn` — « min » devient toujours `\min`,
 * l'espace tapée devient `\,`.
 *
 * La lecture rend la VALEUR, exprimée dans la plus petite unité écrite
 * (`135\unit{min}`, forme que lit `parseLatexQuantity`), et un éventuel
 * défaut de FORME, jugé seulement si la valeur est juste :
 * - perfectible : unité finale oubliée (« 2 h 15 »), forme non normalisée
 *   (« 2 h 75 min ») ;
 * - mauvaise forme : « mn » pour « min », unités dans le désordre ou répétées.
 *
 * ⚠️ N'est appelée que lorsque l'attendu est une durée : ailleurs, `mn` reste
 * une unité inconnue et « 2 h 15 min » une écriture refusée.
 *
 * @module questions/units/composite-duration
 */

import { cleanStudentQuantityLatex } from './student-input';
import { parseUnitExpression } from './parser';
import { isDuration } from './operations';

// ============================================================================
// TYPES
// ============================================================================

type DurationUnit = 'h' | 'min' | 's';

/** Défaut de forme d'une durée composée : `warning` = perfectible, `error` = mauvaise forme */
export interface DurationFormIssue {
	severity: 'error' | 'warning';
	feedback: string;
}

/** Un terme « nombre unité » tel que tapé */
interface DurationPart {
	/** Nombre tel que tapé (`15`, `7,5`) */
	written: string;
	value: number;
	unit: DurationUnit;
	/** Écriture de l'unité : `h`, `min`, `mn`, `s`, ou null si oubliée (dernier terme) */
	writtenUnit: string | null;
}

export type CompositeDurationReading =
	| {
			kind: 'duration';
			/** Valeur dans la plus petite unité écrite : `135\unit{min}` */
			latex: string;
			/** Vrai si plusieurs termes (« 2 h 15 min ») ; faux pour « 15 mn » seul */
			multiPart: boolean;
			issue: DurationFormIssue | null;
	  }
	/** Un terme porte une vraie unité qui n'est pas une durée (« 2 h 15 kg ») */
	| { kind: 'foreign-unit' }
	/**
	 * Virgule ailleurs qu'au dernier terme (« 2,5 h 15 min ») : écriture refusée,
	 * avec un message sur la virgule plutôt que « Unité inconnue »
	 */
	| { kind: 'decimal-inside'; feedback: string };

// ============================================================================
// CONSTANTES
// ============================================================================

/** Durée de chaque unité, en secondes */
const SECONDS: Record<DurationUnit, number> = { h: 3600, min: 60, s: 1 };

/** Ordre décroissant des unités */
const UNIT_ORDER: DurationUnit[] = ['h', 'min', 's'];

/** Écritures reconnues ; `mn` n'est lu que pour dire « l'abréviation est min » */
const UNIT_WRITINGS: Record<string, DurationUnit> = { h: 'h', min: 'min', mn: 'min', s: 's' };

/** Un terme : nombre (virgule ou point décimal), puis lettres éventuelles */
const TERM_PATTERN = /(\d+(?:[.,]\d+)?)\s*([A-Za-z]*)\s*/y;

export const DURATION_FEEDBACK = {
	abbreviation: "L'abréviation de minute est min.",
	order: 'Écris les unités de la plus grande à la plus petite, une seule fois chacune.'
} as const;

// ============================================================================
// HELPERS
// ============================================================================

/** Nombre écrit à la française, sans bruit flottant : 7.5 → `7,5` */
function formatFrench(value: number): string {
	return String(Number(value.toFixed(6))).replace('.', ',');
}

function nextSmallerUnit(unit: DurationUnit): DurationUnit | null {
	return UNIT_ORDER[UNIT_ORDER.indexOf(unit) + 1] ?? null;
}

/**
 * Forme normalisée d'une durée (en secondes), de l'unité `from` à l'unité `to` :
 * 11 700 s de h à min → « 3 h 15 min ». Les termes nuls sont omis.
 */
function normalizedWriting(totalSeconds: number, from: DurationUnit, to: DurationUnit): string {
	const units = UNIT_ORDER.slice(UNIT_ORDER.indexOf(from), UNIT_ORDER.indexOf(to) + 1);
	let rest = totalSeconds;
	const terms: string[] = [];
	units.forEach((unit, index) => {
		const isLast = index === units.length - 1;
		const amount = isLast ? rest / SECONDS[unit] : Math.floor(rest / SECONDS[unit] + 1e-9);
		rest -= amount * SECONDS[unit];
		if (Math.abs(amount) > 1e-9) terms.push(`${formatFrench(amount)} ${unit}`);
	});
	return terms.length > 0 ? terms.join(' ') : `0 ${to}`;
}

/** Découpe la saisie nettoyée en termes ; null si ce n'est pas une suite « nombre lettres » */
function readTerms(cleaned: string): { written: string; letters: string }[] | null {
	const terms: { written: string; letters: string }[] = [];
	TERM_PATTERN.lastIndex = 0;
	while (TERM_PATTERN.lastIndex < cleaned.length) {
		const match = TERM_PATTERN.exec(cleaned);
		if (!match || match[0] === '') return null;
		terms.push({ written: match[1], letters: match[2] });
	}
	return terms;
}

function formIssue(parts: DurationPart[], totalSeconds: number): DurationFormIssue | null {
	if (parts.some((part) => part.writtenUnit === 'mn')) {
		return { severity: 'error', feedback: DURATION_FEEDBACK.abbreviation };
	}

	const ranks = parts.map((part) => UNIT_ORDER.indexOf(part.unit));
	if (ranks.some((rank, index) => index > 0 && rank <= ranks[index - 1])) {
		return { severity: 'error', feedback: DURATION_FEEDBACK.order };
	}

	if (parts.some((part) => part.writtenUnit === null)) {
		const writing = parts.map((part) => `${part.written} ${part.unit}`).join(' ');
		return { severity: 'warning', feedback: `Précise l'unité : ${writing}.` };
	}

	if (parts.some((part, index) => index > 0 && part.value >= 60)) {
		const writing = normalizedWriting(totalSeconds, parts[0].unit, parts[parts.length - 1].unit);
		return { severity: 'warning', feedback: `Écris plutôt ${writing}.` };
	}

	return null;
}

// ============================================================================
// FONCTIONS PRINCIPALES
// ============================================================================

/**
 * Lit une saisie d'élève comme durée composée.
 *
 * Null quand ce n'en est pas une : durée simple (`3\,h`, `2,5\,h` : le chemin
 * ordinaire la lit déjà), nombre seul, lettres inconnues, nombre sans unité
 * ailleurs qu'à la fin. Un nombre décimal ailleurs qu'au dernier terme rend
 * `decimal-inside` (refus, avec la bonne écriture).
 * `15\,mn` seul est lu (pour le message sur l'abréviation).
 */
export function readCompositeDuration(latex: string): CompositeDurationReading | null {
	if (typeof latex !== 'string' || latex.includes('\\unit{')) return null;
	const terms = readTerms(cleanStudentQuantityLatex(latex));
	if (!terms || terms.length === 0) return null;

	const parts: DurationPart[] = [];
	// Décimal seulement au dernier terme (« 1 min 7,5 s ») ; ailleurs, la lecture
	// continue pour proposer la bonne écriture (« 2,5 h 15 min » → 2 h 45 min)
	let decimalInside = false;
	for (const [index, term] of terms.entries()) {
		const isLast = index === terms.length - 1;
		if (!isLast && /[.,]/.test(term.written)) decimalInside = true;
		const value = Number(term.written.replace(',', '.'));

		if (term.letters === '') {
			// Nombre sans unité : seulement en dernier, après une unité (« 2 h 15 »)
			const previous = parts[parts.length - 1];
			const inferred = isLast && previous ? nextSmallerUnit(previous.unit) : null;
			if (!inferred) return null;
			parts.push({ written: term.written, value, unit: inferred, writtenUnit: null });
			continue;
		}

		const unit = UNIT_WRITINGS[term.letters];
		if (!unit) {
			// Vraie unité d'une autre grandeur (kg, m…) : incompatible ; sinon lettres inconnues
			const other = parseUnitExpression(term.letters);
			return other && !isDuration(other) ? { kind: 'foreign-unit' } : null;
		}
		parts.push({ written: term.written, value, unit, writtenUnit: term.letters });
	}

	// Un seul terme : durée simple, déjà lue par le chemin ordinaire — sauf « mn »
	if (parts.length === 1 && parts[0].writtenUnit !== 'mn') return null;

	const totalSeconds = parts.reduce((sum, part) => sum + part.value * SECONDS[part.unit], 0);
	if (decimalInside) {
		const writing = normalizedWriting(totalSeconds, parts[0].unit, parts[parts.length - 1].unit);
		return {
			kind: 'decimal-inside',
			feedback: `Seule la dernière unité peut avoir une virgule : écris ${writing}.`
		};
	}
	const smallest = parts.reduce<DurationUnit>(
		(unit, part) => (SECONDS[part.unit] < SECONDS[unit] ? part.unit : unit),
		parts[0].unit
	);
	const total = Number((totalSeconds / SECONDS[smallest]).toFixed(9));

	return {
		kind: 'duration',
		latex: `${total}\\unit{${smallest}}`,
		multiPart: parts.length > 1,
		issue: formIssue(parts, totalSeconds)
	};
}

/** Défaut de forme d'une durée composée (null si aucun, ou si ce n'en est pas une) */
export function compositeDurationFormIssue(latex: string): DurationFormIssue | null {
	const reading = readCompositeDuration(latex);
	return reading?.kind === 'duration' ? reading.issue : null;
}
