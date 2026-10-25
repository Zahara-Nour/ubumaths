/**
 * Bloc ```operation — la scène
 * ============================
 *
 * Calcul pur d'une opération posée (résultat, retenues, chiffres barrés) et de
 * sa grille, partagé par l'écran (`Operation.svelte`) et le PDF
 * (`operation-typst.ts`) : les deux ne peuvent pas diverger.
 *
 * Tout se fait chiffre par chiffre (entiers `BigInt` pour le résultat) :
 * jamais de nombre flottant, `0,1 + 0,2` vaut `0,3`.
 *
 * Grille : `columns` colonnes de chiffres, de gauche à droite ; les
 * `decimals` dernières sont après la virgule. Le signe se dessine à gauche
 * de la dernière ligne de termes.
 *
 * - **Addition** : retenue écrite au-dessus de la colonne qui la reçoit.
 *   À remplir (`cases: résultat`), une colonne de plus que le plus long
 *   terme : la largeur ne trahit pas la retenue finale.
 * - **Soustraction par compensation** : petit 1 devant le chiffre du haut,
 *   petit 1 contre le chiffre du bas de la colonne suivante.
 * - **Soustraction par cassage** : chiffre du haut barré, nouvelle valeur
 *   au-dessus (valeur finale si la colonne est cassée puis complétée).
 * - **Multiplication** (lot 2) : facteurs alignés à droite sur leur dernier
 *   chiffre (pas virgule sous virgule), une ligne de produit partiel par
 *   chiffre non nul du bas, décalée de son rang, zéros de décalage écrits ;
 *   une seule ligne non nulle : résultat directement sous le trait. À
 *   remplir, le résultat a autant de colonnes que les deux facteurs réunis et
 *   sa virgule n'est pas dessinée (l'élève la pose, Q3) ; retenues : une
 *   rangée au-dessus du nombre du haut, plus celle de l'addition des produits
 *   partiels ; résolue, les retenues de l'addition seules quand il y a des
 *   produits partiels (Q5).
 *
 * Décimaux de longueurs différentes : carreaux vides, jamais de zéro ajouté
 * (décision 10) ; un carreau vide du haut compte pour 0 dans le calcul.
 *
 * Phase 0 : `docs/wip/operations-posees-progress.md`.
 *
 * @module ubumark/utils/operation-scene
 */

import type { OperationSpec, OperationTerm } from '../types/operation';

// ============================================================================
// TYPES
// ============================================================================

/** Petite écriture : retenue, nouvelle valeur (cassage) */
export interface OperationMark {
	/** Texte écrit, ou attendu dans la case ('' : rien à écrire) */
	text: string;
	/** Case à remplir (aide, jamais jugée) */
	blank: boolean;
}

/** Un carreau d'une ligne de terme */
export interface OperationCell {
	/** '' : carreau vide */
	digit: string;
	/** Barré (cassage) */
	struck: boolean;
	/** Petit 1 devant le chiffre (compensation) */
	mark: OperationMark | null;
	/** Virgule après ce chiffre */
	comma: boolean;
	/** Toujours faux : un terme n'est jamais à remplir */
	blank: false;
}

/** Un carreau du résultat */
export interface OperationResultCell {
	/** Chiffre écrit, ou attendu dans la case ; '' : carreau de tête vide */
	digit: string;
	blank: boolean;
	comma: boolean;
}

export interface OperationScene {
	operator: OperationSpec['operator'];
	/** Colonnes de chiffres */
	columns: number;
	/** Colonnes après la virgule du résultat (0 : nombres entiers) */
	decimals: number;
	/** Au-dessus du premier terme, une entrée par colonne */
	above: (OperationMark | null)[];
	/** Une ligne par terme, `columns` carreaux chacune */
	terms: OperationCell[][];
	/**
	 * Multiplication : retenues de l'addition des produits partiels, rangée
	 * au-dessus d'eux ; null sans produits partiels ou avec `retenues: non`
	 */
	partialCarries: (OperationMark | null)[] | null;
	/** Multiplication : produits partiels, `columns` carreaux chacun ([] : aucun) */
	partials: OperationResultCell[][];
	result: OperationResultCell[];
}

// ============================================================================
// CALCUL
// ============================================================================

/** Décimales du résultat : celles du plus long terme ; multiplication : celles des facteurs réunies */
function decimalsOf(spec: OperationSpec): number {
	const counts = spec.terms.map((t) => t.decimal.length);
	return spec.operator === '×' ? counts.reduce((a, b) => a + b, 0) : Math.max(...counts);
}

/** Chiffres d'un facteur, virgule ôtée : `46,55` → `4655` */
const factorDigits = (term: OperationTerm) => term.integer + term.decimal;

/** Le terme en entier, à `decimals` chiffres après la virgule */
const scaled = (term: OperationTerm, decimals: number) =>
	BigInt(term.integer + term.decimal.padEnd(decimals, '0'));

/** Chiffres du résultat, virgule retirée, sans zéro de tête superflu */
function resultDigits(spec: OperationSpec): string {
	const decimals = decimalsOf(spec);
	let value: bigint;
	if (spec.operator === '×') {
		value = spec.terms.reduce((product, t) => product * BigInt(factorDigits(t)), 1n);
	} else {
		const values = spec.terms.map((t) => scaled(t, decimals));
		value =
			spec.operator === '+'
				? values.reduce((a, b) => a + b, 0n)
				: values.slice(1).reduce((a, b) => a - b, values[0]);
	}
	return value.toString().padStart(decimals + 1, '0');
}

/** Le résultat en écriture française : `82`, `291,55`, `4,0` */
export function operationResult(spec: OperationSpec): string {
	const digits = resultDigits(spec);
	const decimals = decimalsOf(spec);
	if (decimals === 0) return digits;
	return `${digits.slice(0, -decimals)},${digits.slice(-decimals)}`;
}

// ============================================================================
// GRILLE
// ============================================================================

/** Les chiffres d'un terme placés dans la grille ('' : carreau vide) */
function placeTerm(term: OperationTerm, columns: number, decimals: number): string[] {
	const integerColumns = columns - decimals;
	const cells: string[] = Array(integerColumns - term.integer.length).fill('');
	cells.push(...term.integer.split(''));
	cells.push(...term.decimal.split(''));
	while (cells.length < columns) cells.push('');
	return cells;
}

const digitValue = (digit: string) => (digit === '' ? 0 : Number(digit));

/**
 * Un nombre aligné à droite sur `columns` carreaux, zéros de tête jamais écrits
 * avant la colonne `keepFrom` (le chiffre des unités l'est toujours)
 */
function rightAligned(value: string, columns: number, keepFrom: number): string[] {
	const padded = value.padStart(columns, '0');
	return padded
		.split('')
		.map((digit, c) => (c < keepFrom && /^0+$/.test(padded.slice(0, c + 1)) ? '' : digit));
}

/** Une retenue : écrite si elle existe (résolue), case partout ailleurs (à remplir) */
const writtenMark = (toFill: boolean, text: string): OperationMark | null =>
	toFill ? { text, blank: true } : text === '' ? null : { text, blank: false };

/** Multiplication (`spec.terms` dans l'ordre de pose : le haut, le bas) */
function buildMultiplicationScene(spec: OperationSpec): OperationScene {
	const toFill = spec.cells === 'résultat';
	const [topTerm, bottomTerm] = spec.terms;
	const top = factorDigits(topTerm);
	const bottom = factorDigits(bottomTerm);
	const decimals = decimalsOf(spec);
	const digits = resultDigits(spec);

	// Une ligne par chiffre non nul du bas, décalée de son rang : la ligne d'un 0
	// est sautée, la suivante a un zéro de décalage de plus (Q2)
	const lines = [...bottom]
		.reverse()
		.map((digit, shift) => ({ digit: Number(digit), shift }))
		.filter((l) => l.digit !== 0);
	const withPartials = lines.length >= 2;
	const partialValues = lines.map(
		(l) => (BigInt(top) * BigInt(l.digit)).toString() + '0'.repeat(l.shift)
	);

	const columns = toFill
		? top.length + bottom.length
		: Math.max(
				top.length,
				bottom.length,
				digits.length,
				...(withPartials ? partialValues.map((v) => v.length) : [])
			);
	const unitsColumn = columns - decimals - 1;
	const topOffset = columns - top.length;

	const placeFactor = (term: OperationTerm): OperationCell[] => {
		const all = factorDigits(term);
		const offset = columns - all.length;
		return Array.from({ length: columns }, (_, c) => ({
			digit: c < offset ? '' : all[c - offset],
			struck: false,
			mark: null,
			comma: term.decimal !== '' && c === columns - term.decimal.length - 1,
			blank: false
		}));
	};

	const result: OperationResultCell[] = rightAligned(digits, columns, unitsColumn).map(
		(digit, c) => ({ digit, blank: toFill, comma: !toFill && decimals > 0 && c === unitsColumn })
	);

	// Produits partiels : à remplir, une case de plus que le nombre du haut, plus le décalage
	const partials: OperationResultCell[][] = withPartials
		? partialValues.map((value, i) => {
				const width = top.length + 1 + lines[i].shift;
				return rightAligned(value, columns, columns - 1).map((digit, c) => ({
					digit,
					blank: toFill && c >= columns - width,
					comma: false
				}));
			})
		: [];

	/** Retenues de la ligne du chiffre `m`, au-dessus du chiffre du haut qui les reçoit */
	const multiplyCarries = (m: number): string[] => {
		const marks: string[] = Array(columns).fill('');
		let carry = 0;
		for (let i = top.length - 1; i >= 0; i--) {
			carry = Math.floor((Number(top[i]) * m + carry) / 10);
			if (i > 0 && carry > 0) marks[topOffset + i - 1] = String(carry);
		}
		return marks;
	};

	const above: (OperationMark | null)[] = Array(columns).fill(null);
	let partialCarries: (OperationMark | null)[] | null = null;
	if (spec.carries) {
		// Une seule rangée au-dessus du haut : avec plusieurs lignes, l'élève la
		// réutilise (rien d'attendu) ; résolue, elle n'est écrite que sans produits partiels
		const single = withPartials ? null : multiplyCarries(lines[0]?.digit ?? 0);
		for (let c = topOffset; c < columns - 1; c++) {
			if (toFill) above[c] = { text: single?.[c] ?? '', blank: true };
			else if (single !== null) above[c] = writtenMark(false, single[c]);
		}
		if (withPartials) {
			const rows = partials.map((row) => row.map((cell) => cell.digit));
			const carries: string[] = Array(columns).fill('');
			let carry = 0;
			for (let c = columns - 1; c >= 0; c--) {
				carry = Math.floor(rows.reduce((sum, row) => sum + digitValue(row[c]), carry) / 10);
				if (c > 0 && carry > 0) carries[c - 1] = String(carry);
			}
			partialCarries = carries.map((text, c) =>
				c === columns - 1 ? null : writtenMark(toFill, text)
			);
		}
	}

	return {
		operator: '×',
		columns,
		decimals,
		above,
		terms: [placeFactor(topTerm), placeFactor(bottomTerm)],
		partialCarries,
		partials,
		result
	};
}

/**
 * Construire la scène d'une opération. `spec` vient d'un bloc sans erreur :
 * une soustraction a deux termes, le premier le plus grand.
 */
export function buildOperationScene(spec: OperationSpec): OperationScene {
	if (spec.operator === '×') return buildMultiplicationScene(spec);
	const decimals = decimalsOf(spec);
	const toFill = spec.cells === 'résultat';
	const digits = resultDigits(spec);
	const longestTerm = Math.max(...spec.terms.map((t) => t.integer.length));
	const resultInteger = digits.length - decimals;

	let integerColumns: number;
	if (spec.operator === '-') integerColumns = spec.terms[0].integer.length;
	else if (toFill) integerColumns = longestTerm + 1;
	else integerColumns = Math.max(longestTerm, resultInteger);
	const columns = integerColumns + decimals;
	const unitsColumn = integerColumns - 1;

	const placed = spec.terms.map((t) => placeTerm(t, columns, decimals));
	const terms: OperationCell[][] = placed.map((row, r) =>
		row.map((digit, c) => ({
			digit,
			struck: false,
			mark: null,
			comma: c === unitsColumn && spec.terms[r].decimal !== '',
			blank: false
		}))
	);

	// Résultat : zéros de tête jamais écrits, le chiffre des unités toujours
	const padded = digits.padStart(columns, '0');
	const result: OperationResultCell[] = padded.split('').map((digit, c) => ({
		digit: c < unitsColumn && /^0+$/.test(padded.slice(0, c + 1)) ? '' : digit,
		blank: toFill,
		comma: decimals > 0 && c === unitsColumn
	}));

	const above: (OperationMark | null)[] = Array(columns).fill(null);
	const written = (text: string) => writtenMark(toFill, text);

	if (spec.operator === '+') {
		let carry = 0;
		const carries: string[] = Array(columns).fill('');
		for (let c = columns - 1; c >= 0; c--) {
			const sum = placed.reduce((s, row) => s + digitValue(row[c]), carry);
			carry = Math.floor(sum / 10);
			if (c > 0 && carry > 0) carries[c - 1] = String(carry);
		}
		if (spec.carries) {
			for (let c = 0; c < columns - 1; c++) above[c] = written(carries[c]);
		}
	} else if (spec.method === 'compensation') {
		const [top, bottom] = placed;
		const topTen: string[] = Array(columns).fill('');
		const bottomOne: string[] = Array(columns).fill('');
		let borrow = 0;
		for (let c = columns - 1; c >= 0; c--) {
			const subtrahend = digitValue(bottom[c]) + borrow;
			borrow = digitValue(top[c]) < subtrahend ? 1 : 0;
			if (borrow === 1) {
				topTen[c] = '1';
				if (c > 0) bottomOne[c - 1] = '1';
			}
		}
		if (spec.carries) {
			// À remplir : une case en haut par colonne (sauf la première) ; le petit 1 du bas
			// suit la case de la colonne de droite, l'élève ne l'écrit pas (PR 1b, décision c)
			for (let c = 0; c < columns; c++) {
				if (c > 0 || topTen[c] !== '') terms[0][c].mark = written(topTen[c]);
				if (!toFill && bottomOne[c] !== '') terms[1][c].mark = written(bottomOne[c]);
			}
		}
	} else {
		const [top, bottom] = placed;
		const values = top.map(digitValue);
		for (let c = columns - 1; c >= 0; c--) {
			if (values[c] >= digitValue(bottom[c])) continue;
			// Casser la colonne non nulle la plus proche à gauche, à travers les zéros
			let k = c - 1;
			while (values[k] === 0) k--;
			values[k]--;
			for (let j = k + 1; j < c; j++) values[j] = 9;
			values[c] += 10;
		}
		for (let c = 0; c < columns; c++) {
			const changed = values[c] !== digitValue(top[c]);
			// À remplir, rien n'est barré : savoir quelle colonne casser fait partie de la réponse
			if (changed && spec.carries && !toFill) terms[0][c].struck = top[c] !== '';
			if (spec.carries) above[c] = written(changed ? String(values[c]) : '');
		}
	}

	return {
		operator: spec.operator,
		columns,
		decimals,
		above,
		terms,
		partialCarries: null,
		partials: [],
		result
	};
}
