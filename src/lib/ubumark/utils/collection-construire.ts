/**
 * Bloc ```collection à construire — la construction de l'élève
 * ============================================================
 *
 * Calcul pur, partagé par l'écran (`CollectionConstruire.svelte`) et le PDF
 * (`collection-typst.ts`) ; chantier `docs/wip/construire-progress.md` § 3, 5.
 *
 * L'élève pose des barres de dix (ou paquets) et des cubes (ou jetons) sur un
 * plan vide. Seule la VALEUR posée est jugée (Q5) : 3 barres + 4 cubes, 34
 * cubes ou 2 barres + 14 cubes valent 34. Plan vide → réponse vide (Q6). Les
 * objets se rangent d'office (Q2) : groupes de dix en haut, cubes en rangées
 * de 5 + 5 dessous — la scène de la collection, en `rangées`.
 *
 * @module ubumark/utils/collection-construire
 */

import type { CollectionDrawing, CollectionSet } from '../types/collection';
import { buildCollectionScene, type CollectionScene } from './collection-scene';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Plafonds du plan : au-delà, le bouton « Ajouter » se grise */
export const BUILD_LIMITS = { tens: 10, units: 100 } as const;

/** Plan vide */
export const EMPTY_BUILD: CollectionSet = { tens: 0, units: 0 };

// ============================================================================
// TYPES
// ============================================================================

/** Ce que l'élève ajoute ou enlève : un groupe de dix ou un objet isolé */
export type BuildPiece = keyof CollectionSet;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Valeur posée */
export function buildValue(build: CollectionSet): number {
	return 10 * build.tens + build.units;
}

/** Réponse de la case : la valeur en chiffres, '' si le plan est vide */
export function buildAnswer(build: CollectionSet): string {
	const value = buildValue(build);
	return value === 0 ? '' : String(value);
}

/** Un objet de plus, jamais au-delà du plafond */
export function addToBuild(build: CollectionSet, piece: BuildPiece): CollectionSet {
	if (build[piece] >= BUILD_LIMITS[piece]) return build;
	return { ...build, [piece]: build[piece] + 1 };
}

/** Un objet de moins, jamais sous 0 */
export function removeFromBuild(build: CollectionSet, piece: BuildPiece): CollectionSet {
	if (build[piece] === 0) return build;
	return { ...build, [piece]: build[piece] - 1 };
}

/** Construction juste, le moins d'objets : dizaines et unités (Q8) */
export function solutionBuild(value: number): CollectionSet {
	return { tens: Math.floor(value / 10), units: value % 10 };
}

/**
 * Construction redessinée depuis une réponse seule (composant remonté) : en
 * dizaines et unités ; réponse vide ou illisible → plan vide
 */
export function buildFromAnswer(answer: string): CollectionSet {
	const text = answer.trim();
	if (!/^\d+$/.test(text)) return EMPTY_BUILD;
	const value = Number(text);
	const tens = Math.min(Math.floor(value / 10), BUILD_LIMITS.tens);
	return { tens, units: Math.min(value - 10 * tens, BUILD_LIMITS.units) };
}

/** La scène du plan : la collection posée, objets rangés */
export function buildScene(drawing: CollectionDrawing, build: CollectionSet): CollectionScene {
	return buildCollectionScene(
		{ sets: [build], captions: null, drawing, unitLayout: 'rangées', sizeCm: null },
		0
	);
}

/** La réserve dessinée : un groupe de dix et un objet isolé */
export function reserveScene(drawing: CollectionDrawing): CollectionScene {
	return buildScene(drawing, { tens: 1, units: 1 });
}
