/**
 * Atelier — la complétion des fonctions et des lettres grecques dans Calcul
 *
 * Phase 0 `docs/wip/atelier-cas-phase0.md`, PR 3 (décisions de David du
 * 2026-10-11). **Règle unique** : la liste s'ouvre quand le mot en cours
 * (lettres seulement) a au moins 2 lettres et est le début d'une proposition
 * — la choisir change toujours le champ.
 *
 * Les propositions viennent des listes UNIQUES du moteur — les fonctions d'un
 * élève (`SHOWN_FUNCTIONS`) et les lettres grecques (`GREEK_LETTERS`) — et non
 * du module de complétion de `/cas`, qui insérait `\alpha` à côté de `sin(` :
 * une saisie mêlée que Calcul refuse (#911). Une lettre grecque s'insère en
 * SYMBOLE (`α`), comme `π`.
 *
 * Pas de nom du panneau : un nom d'objet fait UNE lettre (`f`, `a`, `u_1`),
 * il n'y a rien à compléter (mesuré le 2026-10-11 : `aire*2` se lit a·i·r·e·2).
 *
 * @module atelier/completion
 */

import { SHOWN_FUNCTIONS } from '$lib/mathAST/parser/custom/tokenizer';
import { GREEK_LETTERS } from '$lib/mathAST/types';

// =============================================================================
// Types
// =============================================================================

/** Ce que la liste propose : un nom tapable, et ce qui le remplace. */
export interface Proposal {
	/** Ce que l'élève tape, et que la liste montre (`sin`, `alpha`). */
	readonly label: string;
	/** Ce qui remplace le mot en cours (`sin(`, `α`). */
	readonly insert: string;
}

// =============================================================================
// Constantes
// =============================================================================

/**
 * Le symbole de chaque lettre de `GREEK_LETTERS` — les variantes (`varphi`…)
 * exceptées : un élève les tape rarement, et elles doubleraient la liste.
 * `epsilon` donne ε, la lettre qu'on écrit à la main.
 */
const GREEK_SYMBOLS: Readonly<Record<string, string>> = {
	alpha: 'α',
	beta: 'β',
	gamma: 'γ',
	delta: 'δ',
	epsilon: 'ε',
	zeta: 'ζ',
	eta: 'η',
	theta: 'θ',
	iota: 'ι',
	kappa: 'κ',
	lambda: 'λ',
	mu: 'μ',
	nu: 'ν',
	xi: 'ξ',
	rho: 'ρ',
	sigma: 'σ',
	tau: 'τ',
	upsilon: 'υ',
	phi: 'φ',
	chi: 'χ',
	psi: 'ψ',
	omega: 'ω',
	Gamma: 'Γ',
	Delta: 'Δ',
	Theta: 'Θ',
	Lambda: 'Λ',
	Xi: 'Ξ',
	Pi: 'Π',
	Sigma: 'Σ',
	Upsilon: 'Υ',
	Phi: 'Φ',
	Psi: 'Ψ',
	Omega: 'Ω'
};

/**
 * Toutes les propositions, dans l'ordre de la liste : fonctions, puis
 * lettres grecques, puis π (`pi` en lettres est refusé depuis #896).
 */
export const PROPOSALS: readonly Proposal[] = [
	...SHOWN_FUNCTIONS.map((name) => ({ label: name, insert: `${name}(` })),
	...GREEK_LETTERS.filter((name) => GREEK_SYMBOLS[name] !== undefined).map((name) => ({
		label: name,
		insert: GREEK_SYMBOLS[name]
	})),
	{ label: 'pi', insert: 'π' }
];

// =============================================================================
// Fonctions
// =============================================================================

const isLetter = (char: string | undefined) => char !== undefined && /^[A-Za-z]$/.test(char);

/**
 * Le mot en cours : les lettres qui finissent au curseur, ou `null`.
 *
 * Pas de mot dans le nom d'une commande (`.dé` : c'est la liste des
 * commandes), ni dans une saisie en LaTeX : `\frac{co` → `cos(` serait une
 * saisie mêlée, que Calcul refuse (#911, revue).
 */
function wordAt(draft: string, caret: number): { word: string; start: number } | null {
	if (draft.includes('\\')) return null;
	let start = caret;
	while (isLetter(draft[start - 1])) start--;
	if (start === caret) return null;
	if (draft.startsWith('.') && !draft.slice(0, start).includes(' ')) return null;
	return { word: draft.slice(start, caret), start };
}

/**
 * Les propositions pour le mot qui finit au curseur.
 *
 * Choisir change toujours le champ : une fonction ajoute sa parenthèse, une
 * lettre grecque devient symbole. Au plus 8 — la liste le tient d'elle-même,
 * un test le garde.
 */
export function proposalsFor(draft: string, caret: number): Proposal[] {
	const current = wordAt(draft, caret);
	if (current === null || current.word.length < 2) return [];
	return PROPOSALS.filter((p) => p.label.startsWith(current.word));
}

/** Le brouillon où la proposition remplace le mot en cours, et le curseur après elle. */
export function insertProposal(
	draft: string,
	caret: number,
	proposal: Proposal
): { draft: string; caret: number } {
	const current = wordAt(draft, caret);
	const start = current?.start ?? caret;
	return {
		draft: draft.slice(0, start) + proposal.insert + draft.slice(caret),
		caret: start + proposal.insert.length
	};
}
