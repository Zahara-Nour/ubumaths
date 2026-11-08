/**
 * Cases d'un tableau de signes à compléter (```variation à `?`)
 * =============================================================
 *
 * Chantier `docs/archive/wip/tableau-signes-progress.md`. L'auteur écrit le tableau juste
 * et préfixe d'un `?` chaque cellule cachée : la réponse attendue de chaque case
 * est tirée du bloc (`cases` du nœud), jamais écrite dans `blanks`.
 *
 * - valeur (de x dans `domain:`, ou d'une ligne `variation:`) : case `math`, juge
 *   ordinaire (`3/2` = `1,5`) ;
 * - signe (`+`, `-`), marque (`z`, `||`, `rien`) et flèche d'une ligne `variation:`
 *   (`↗`, `↘`, chantier `variations-a-completer`) : case `text`, égalité exacte
 *   (`0` ramené à `z`, `−` à `-`).
 *
 * `??n` (valeur) et `?` seul (signe, marque) sont les formes de l'énoncé envoyé
 * pendant une évaluation notée (`masked-statement.ts`) : refusées dans un modèle.
 *
 * @module questions/sign-table-case
 */

import { parseVariationTableContent } from '$lib/ubumark/parser/variation-table-parser';
import type { HiddenCellKind, VariationTableNode } from '$lib/ubumark/types/variation-table';
import type { InstanceBlank } from './types';

// Types
/** Réponse attendue d'une case de tableau, et la nature de sa cellule */
export interface SignTableAnswer {
	kind: HiddenCellKind;
	/** LaTeX de la valeur, ou `+` | `-` | `z` | `||` | `rien` | `↗` | `↘` */
	answer: string;
}

// Constantes
const CASE_LABEL = 'tableau de signes';

/** Ce que la correction affiche pour un signe ou une marque */
const CELL_DISPLAY: Record<string, string> = {
	'+': '+',
	'-': '-',
	z: '0',
	'||': '\\|',
	rien: '\\text{rien}',
	'↗': '\\nearrow',
	'↘': '\\searrow'
};

const MASKED_FORM_MESSAGE =
	'??n et ? seul sont réservés à l’énoncé envoyé pendant une évaluation : écrire la réponse après le ? (?-3, ?+, ?z, ?||, ?rien, ?4, top, ?flèche)';

// Functions
/** Préfixe des messages d'une case de tableau */
const prefixOf = (index: number) => `Case ${index + 1} (${CASE_LABEL}) :`;

/**
 * Réponses des cases d'un tableau à compléter, lues dans son texte (sans `case:`).
 * `first` : numéro de la première case du tableau.
 *
 * @returns les réponses (une par cellule cachée, dans l'ordre de lecture) ou les
 *          messages pour l'auteur
 */
export function readSignTableCases(
	source: string,
	first: number,
	options: { orderIndependent?: boolean } = {}
): { answers: SignTableAnswer[] } | { errors: string[] } {
	const { node, errors } = parseVariationTableContent(source.split('\n'));
	if (node === null) {
		return { errors: [`${prefixOf(first)} ${errors.map((e) => e.message).join(' ; ')}`] };
	}
	if (node.caseIndex !== undefined) {
		return {
			errors: [`${prefixOf(first)} case: est posée automatiquement, retirer cette ligne du bloc`]
		};
	}
	if (options.orderIndependent) {
		return {
			errors: [
				`${prefixOf(first)} un tableau à compléter ne se combine pas avec « ordre indifférent »`
			]
		};
	}
	// Une ligne que le parseur ignore (domaine répété, texte libre) partirait telle quelle
	// dans l'énoncé d'une évaluation : un tableau à compléter n'a aucune erreur
	if (errors.length > 0) {
		return { errors: [`${prefixOf(first)} ${errors.map((e) => e.message).join(' ; ')}`] };
	}
	const cells = node.cases ?? [];
	// Valeur de x cachée évaluée dans une ligne de variations (`f(-3)`) : elle partirait en clair
	// (une valeur elle-même cachée part masquée, `?, top` : elle ne compte pas)
	const hiddenValues = new Set(
		cells.filter((c) => c.row !== 'domain' && c.kind === 'valeur').map((c) => `${c.row}|${c.key}`)
	);
	for (const cell of cells) {
		if (cell.kind !== 'valeur' || cell.row !== 'domain') continue;
		const shown = node.rows.some(
			(row, rowIndex) =>
				row.type === 'variation' &&
				[...row.values.entries()].some(
					([key, value]) =>
						!hiddenValues.has(`${rowIndex}|${key}`) &&
						// Même échappement des deux côtés (`\\frac` dans le JSON)
						JSON.stringify(value).includes(JSON.stringify(`(${cell.answer})`).slice(1, -1))
				)
		);
		if (shown) {
			return {
				errors: [
					`${prefixOf(first + cell.index)} la valeur cachée ${cell.answer} est écrite dans une ligne variation: (« (${cell.answer}) ») ; elle partirait en clair, l’écrire autrement`
				]
			};
		}
	}
	const masked = cells.find((cell) => cell.answer === '');
	if (masked) return { errors: [`${prefixOf(first + masked.index)} ${MASKED_FORM_MESSAGE}`] };
	return { answers: cells.map((cell) => ({ kind: cell.kind, answer: cell.answer })) };
}

/** Le LaTeX que la correction affiche pour la réponse d'une case de tableau */
export function signTableAnswerLatex({ kind, answer }: SignTableAnswer): string {
	return kind === 'valeur' ? answer : (CELL_DISPLAY[answer] ?? answer);
}

/** Réponse d'un signe ou d'une marque, ramenée à son jeton (`0` → `z`, `−` → `-`) */
export function signCellToken(answer: string): string {
	const token = answer.trim().replace(/−/g, '-');
	return token === '0' ? 'z' : token;
}

/** Case d'un signe, d'une marque ou d'une flèche de tableau (jugée au jeton, pas comme une formule) */
export function isSignTableCell(blank: InstanceBlank): boolean {
	return blank.cellule === 'signe' || blank.cellule === 'marque' || blank.cellule === 'fleche';
}

/** Signe, marque ou flèche : le même jeton (une case vide n'est jamais juste, même pour « rien ») */
export function isSignCellCorrect(userAnswer: string, expected: string): boolean {
	return userAnswer.trim() !== '' && signCellToken(userAnswer) === signCellToken(expected);
}

/** Les numéros des cases d'un tableau affiché (première case posée par `case: N`) */
export function signTableCaseIndices(node: VariationTableNode): number[] {
	const first = node.caseIndex;
	if (first === undefined || !node.cases) return [];
	return node.cases.map((_, k) => first + k);
}
