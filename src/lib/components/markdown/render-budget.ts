/**
 * Budget de rendu des figures, par DOCUMENT — contexte des composants markdown
 * ============================================================================
 *
 * Les blocs ```figure et ```courbe sont rendus partout, chat élève et tableau
 * blanc compris. Chaque bloc a son propre budget (`FIGURE_LIMITS`,
 * `COURBE_LIMITS`), mais un message en contenait autant qu'on voulait : 126
 * blocs `polygone_regulier(K,1,10^7)` dans 10 000 caractères bloquaient 2,8 s
 * le fil principal de CHAQUE lecteur (mesuré le 2026-10-01).
 *
 * `MarkdownRenderer` pose un budget partagé par tous ses blocs (rendus
 * imbriqués compris) : au plus `blocks` figures/courbes, et au plus `ms` de
 * calcul cumulé. Au-delà, les blocs suivants affichent le cadre neutre (et un
 * message pour le prof).
 *
 * @module components/markdown/render-budget
 */

import { getContext, hasContext, setContext } from 'svelte';

const RENDER_BUDGET_KEY = Symbol('markdown-figure-render-budget');

export const DOCUMENT_FIGURE_LIMITS = {
	/** Blocs ```figure + ```courbe dessinés par document */
	blocks: 20,
	/** Temps de calcul cumulé des scènes, en ms */
	ms: 100
} as const;

export const OVER_BUDGET_MESSAGE = `Trop de figures dans ce document (au plus ${DOCUMENT_FIGURE_LIMITS.blocks}, ou calcul trop long) : celle-ci n’est pas dessinée`;

export interface FigureRenderBudget {
	/** Le bloc peut-il être dessiné ? Décidé au premier appel, dans l'ordre de rendu. */
	admits(node: object): boolean;
	/** Le temps cumulé est-il épuisé ? */
	exhausted(): boolean;
	/** Compter le temps passé à calculer une scène */
	spend(ms: number): void;
}

export function createRenderBudget(): FigureRenderBudget {
	const decisions = new WeakMap<object, boolean>();
	let admitted = 0;
	let spent = 0;
	return {
		admits(node) {
			const known = decisions.get(node);
			if (known !== undefined) return known;
			const ok = admitted < DOCUMENT_FIGURE_LIMITS.blocks && spent < DOCUMENT_FIGURE_LIMITS.ms;
			if (ok) admitted++;
			decisions.set(node, ok);
			return ok;
		},
		exhausted: () => spent >= DOCUMENT_FIGURE_LIMITS.ms,
		spend(ms) {
			spent += ms;
		}
	};
}

type BudgetGetter = () => FigureRenderBudget | null;

/**
 * Poser le budget du document. Un rendu imbriqué garde celui de son parent :
 * le plafond vaut pour le document entier.
 */
export function provideRenderBudget(get: () => FigureRenderBudget): void {
	const parent = readRenderBudget();
	setContext<BudgetGetter>(RENDER_BUDGET_KEY, () => parent() ?? get());
}

/** Budget du document ; sans renderer (composant isolé), pas de budget. */
export function readRenderBudget(): BudgetGetter {
	return hasContext(RENDER_BUDGET_KEY) ? getContext<BudgetGetter>(RENDER_BUDGET_KEY) : () => null;
}

/**
 * Calculer une scène sous le budget : rien si le temps est épuisé (null),
 * sinon le résultat, temps décompté.
 */
export function withinBudget<T>(budget: FigureRenderBudget | null, compute: () => T): T | null {
	if (budget?.exhausted()) return null;
	const start = performance.now();
	const result = compute();
	budget?.spend(performance.now() - start);
	return result;
}
