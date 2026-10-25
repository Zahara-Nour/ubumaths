/**
 * Bloc ```operation — la scène de la division (potence)
 * =====================================================
 *
 * Calcul pur d'une division posée à la française et de sa grille, partagé
 * par l'écran (`OperationDivision.svelte`) et le PDF (`operation-typst.ts`).
 * Phase 0 : `docs/archive/wip/operations-posees-progress.md` § 12.
 *
 * Partie gauche : le dividende sur la première rangée, puis les étapes, une
 * colonne par chiffre du dividende (zéros ajoutés compris). Partie droite :
 * le diviseur, le trait, le quotient. Tout se fait chiffre par chiffre
 * (`BigInt`) : jamais de nombre flottant.
 *
 * - Un chiffre du quotient par position, dès que le dividende partiel atteint
 *   le diviseur, et au plus tard au chiffre des unités (`5 ÷ 7` → 0).
 * - `étapes: soustractions` : sous chaque dividende partiel, le produit
 *   soustrait, puis le reste avec le chiffre abaissé à sa droite ;
 *   `restes` : les restes seuls (Q1).
 * - Un 0 au quotient ne fait pas de ligne : le chiffre suivant est abaissé
 *   sur la même ligne (Q9). Une ligne de reste n'écrit pas ses zéros de tête
 *   (`06` → `6`), sauf un reste nul.
 * - Quotient décimal : le dividende reçoit les zéros qu'il faut (`785,00`,
 *   marqués `added`, Q5).
 * - À remplir : quotient et reste sont des cases ; à la place des étapes, une
 *   zone libre dont la hauteur ne dépend que du dividende et du diviseur
 *   (des lignes prêtes diraient combien le quotient a de chiffres, Q7) ;
 *   quotient décimal : carreaux libres à droite du dividende.
 *
 * @module ubumark/utils/operation-division-scene
 */

import { OPERATION_MAX_DIVISION, type OperationSpec } from '../types/operation';

// ============================================================================
// TYPES
// ============================================================================

export interface DivisionCell {
	/** Chiffre écrit, ou attendu dans la case ; '' : carreau vide */
	digit: string;
	/** Case à remplir */
	blank: boolean;
	/** Virgule après ce chiffre */
	comma: boolean;
	/** Zéro ajouté au dividende pour continuer la division (Q5) */
	added: boolean;
}

/** Une ligne d'étape, `columns` carreaux */
export interface DivisionRow {
	cells: DivisionCell[];
	/** Produit soustrait : signe − devant son premier chiffre, trait dessous */
	subtract: boolean;
}

export interface DivisionScene {
	/** Colonnes de la partie gauche (chiffres du dividende, zéros ajoutés ou carreaux libres compris) */
	columns: number;
	dividend: DivisionCell[];
	/** Étapes (résolue) ; [] à remplir */
	rows: DivisionRow[];
	/** À remplir : rangées de la zone libre des étapes ; 0 résolue */
	zone: number;
	/** À remplir, division euclidienne : cases du reste, `columns` carreaux ; null sinon */
	remainder: DivisionCell[] | null;
	divisor: string[];
	/** Sous le trait, de gauche à droite */
	quotient: DivisionCell[];
}

export interface DivisionResult {
	/** Écriture française : `1350`, `196,25` */
	quotient: string;
	/** Reste de la division euclidienne ; null pour un quotient décimal (reste nul) */
	remainder: string | null;
}

// ============================================================================
// CALCUL
// ============================================================================

const cell = (digit: string, options: Partial<DivisionCell> = {}): DivisionCell => ({
	digit,
	blank: false,
	comma: false,
	added: false,
	...options
});

/**
 * Zéros à ajouter au dividende pour un quotient décimal exact ; null si le
 * quotient ne s'arrête pas au millième (Q4). Euclidienne : 0.
 */
export function divisionAddedZeros(spec: OperationSpec): number | null {
	if (spec.quotient === 'entier') return 0;
	const [dividend, divisor] = spec.terms;
	const value = BigInt(dividend.integer + dividend.decimal);
	const d = BigInt(divisor.integer);
	for (let z = 0; dividend.decimal.length + z <= OPERATION_MAX_DIVISION.quotientDecimals; z++) {
		if ((value * 10n ** BigInt(z)) % d === 0n) return z;
	}
	return null;
}

interface Emission {
	/** Position du chiffre du quotient (colonne du dernier chiffre du dividende partiel) */
	position: number;
	digit: number;
	partial: bigint;
	remainder: bigint;
}

/** Les chiffres du dividende lus un à un, zéros ajoutés compris */
function workDigits(spec: OperationSpec, zeros: number): string {
	const dividend = spec.terms[0];
	return dividend.integer + dividend.decimal + '0'.repeat(zeros);
}

/** La division chiffre par chiffre : un chiffre du quotient par position, dès le premier */
function longDivision(spec: OperationSpec, zeros: number): Emission[] {
	const digits = workDigits(spec, zeros);
	const units = spec.terms[0].integer.length - 1;
	const d = BigInt(spec.terms[1].integer);
	const emissions: Emission[] = [];
	let current = 0n;
	for (let i = 0; i < digits.length; i++) {
		current = current * 10n + BigInt(digits[i]);
		if (emissions.length === 0 && current < d && i < units) continue;
		const digit = current / d;
		const remainder = current - digit * d;
		emissions.push({ position: i, digit: Number(digit), partial: current, remainder });
		current = remainder;
	}
	return emissions;
}

/** Le quotient et le reste (euclidienne) ; `spec` vient d'un bloc sans erreur */
export function divisionResult(spec: OperationSpec): DivisionResult {
	const zeros = divisionAddedZeros(spec) ?? 0;
	const emissions = longDivision(spec, zeros);
	const units = spec.terms[0].integer.length - 1;
	const integer = emissions
		.filter((e) => e.position <= units)
		.map((e) => e.digit)
		.join('')
		.replace(/^0+(?=\d)/, '');
	const decimal = emissions
		.filter((e) => e.position > units)
		.map((e) => e.digit)
		.join('');
	const quotient = decimal === '' ? integer : `${integer},${decimal}`;
	const remainder = emissions[emissions.length - 1].remainder.toString();
	return { quotient, remainder: spec.quotient === 'entier' ? remainder : null };
}

// ============================================================================
// GRILLE
// ============================================================================

/** Une ligne d'étape : `value` aligné à droite sur la colonne `last` */
function stepRow(value: string, last: number, columns: number, subtract: boolean): DivisionRow {
	const first = last - value.length + 1;
	const cells = Array.from({ length: columns }, (_, c) =>
		cell(c >= first && c <= last ? value[c - first] : '')
	);
	return { cells, subtract };
}

/** Un dividende partiel écrit sans ses zéros de tête (`06` → `6`), un reste nul gardé */
const withoutLeadingZeros = (digits: string) => digits.replace(/^0+(?=\d)/, '');

/** Les étapes d'une division résolue */
function stepRows(spec: OperationSpec, zeros: number, columns: number): DivisionRow[] {
	const digits = workDigits(spec, zeros);
	const rows: DivisionRow[] = [];
	/** Ligne qui porte le dividende partiel en cours (null : la rangée du dividende) */
	let open: { digits: string; last: number } | null = null;
	const flush = () => {
		if (open === null) return;
		rows.push(stepRow(withoutLeadingZeros(open.digits), open.last, columns, false));
		open = null;
	};

	for (const e of longDivision(spec, zeros)) {
		const next = digits[e.position + 1];
		if (e.digit === 0) {
			// Pas de ligne « − 0 » : le chiffre suivant s'abaisse sur la même ligne (Q9)
			if (open !== null && next !== undefined) {
				open = { digits: open.digits + next, last: e.position + 1 };
			}
			continue;
		}
		flush();
		if (spec.steps === 'soustractions') {
			const product = (BigInt(e.digit) * BigInt(spec.terms[1].integer)).toString();
			rows.push(stepRow(product, e.position, columns, true));
		}
		open =
			next === undefined
				? { digits: e.remainder.toString(), last: e.position }
				: { digits: e.remainder.toString() + next, last: e.position + 1 };
	}
	flush();
	return rows;
}

/**
 * Construire la scène d'une division. `spec` vient d'un bloc sans erreur :
 * diviseur entier non nul, quotient décimal qui s'arrête au millième.
 */
export function buildDivisionScene(spec: OperationSpec): DivisionScene {
	const toFill = spec.cells === 'résultat';
	const [dividend, divisor] = spec.terms;
	const zeros = divisionAddedZeros(spec) ?? 0;
	const given = dividend.integer + dividend.decimal;
	const decimalQuotient = spec.quotient === 'décimal';
	// À remplir : carreaux libres jusqu'au millième, quelle que soit la réponse
	const free =
		toFill && decimalQuotient
			? OPERATION_MAX_DIVISION.quotientDecimals - dividend.decimal.length
			: 0;
	const columns = given.length + (toFill ? free : zeros);
	const units = dividend.integer.length - 1;
	const showComma = dividend.decimal !== '' || (!toFill && zeros > 0);

	const dividendCells = Array.from({ length: columns }, (_, c) => {
		const added = c >= given.length;
		return cell(added ? (toFill ? '' : '0') : given[c], {
			added: added && !toFill,
			comma: showComma && c === units
		});
	});

	const { quotient, remainder } = divisionResult(spec);
	const quotientDigits = quotient.replace(',', '');
	const quotientComma = quotient.indexOf(',') - 1;

	if (!toFill) {
		return {
			columns,
			dividend: dividendCells,
			rows: stepRows(spec, zeros, columns),
			zone: 0,
			remainder: null,
			divisor: divisor.integer.split(''),
			quotient: quotientDigits
				.split('')
				.map((digit, c) => cell(digit, { comma: quotientComma >= 0 && c === quotientComma }))
		};
	}

	const maxSteps = Math.max(1, columns - divisor.integer.length + 1);
	const remainderCells =
		remainder === null
			? null
			: Array.from({ length: columns }, (_, c) => {
					const first = columns - divisor.integer.length;
					const padded = remainder.padStart(divisor.integer.length, ' ');
					return c < first ? cell('') : cell(padded[c - first].trim(), { blank: true });
				});

	return {
		columns,
		dividend: dividendCells,
		rows: [],
		zone: spec.steps === 'soustractions' ? 2 * maxSteps : maxSteps,
		remainder: remainderCells,
		divisor: divisor.integer.split(''),
		quotient: Array.from({ length: columns }, (_, c) =>
			cell(quotientDigits[c] ?? '', { blank: true })
		)
	};
}
