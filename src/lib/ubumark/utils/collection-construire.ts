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
 * À partir de 100 (chantier `docs/archive/wip/collection-centaines-progress.md`, Q3) :
 * la réserve a aussi des plaques de cent, et des gros cubes dès 1 000 ; tout
 * est dessiné à l'échelle d'un grand bloc. Sous 100, rien ne change.
 *
 * @module ubumark/utils/collection-construire
 */

import {
	COLLECTION_BUILD_RANGE,
	COLLECTION_LARGE_LIMITS,
	type CollectionDrawing,
	type CollectionSet
} from '../types/collection';
import { buildCollectionScene, type CollectionScene } from './collection-scene';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Plafonds du plan sous 100 : au-delà, le bouton « Ajouter » se grise */
export const BUILD_LIMITS: CollectionSet = { thousands: 0, hundreds: 0, tens: 10, units: 100 };

/** Plan vide */
export const EMPTY_BUILD: CollectionSet = { thousands: 0, hundreds: 0, tens: 0, units: 0 };

/** Les pièces, du plus grand rang au plus petit (ordre de la scène) */
const PIECES = ['thousands', 'hundreds', 'tens', 'units'] as const;

/** Valeur d'une pièce */
export const PIECE_VALUES: Record<BuildPiece, number> = {
	thousands: 1000,
	hundreds: 100,
	tens: 10,
	units: 1
};

// ============================================================================
// TYPES
// ============================================================================

/** Ce que l'élève ajoute ou enlève : un gros cube, une plaque, un groupe de dix ou un objet isolé */
export type BuildPiece = keyof CollectionSet;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Grand plan (plaques, gros cubes) : valeur à construire de 100 et plus */
export function isLargeBuild(target: number): boolean {
	return target >= COLLECTION_BUILD_RANGE.large;
}

/** Les pièces de la réserve, déduites de la valeur à construire (Q3) */
export function reservePieces(target: number): BuildPiece[] {
	if (target >= 1000) return [...PIECES];
	if (isLargeBuild(target)) return ['hundreds', 'tens', 'units'];
	return ['tens', 'units'];
}

/** Plafonds du plan : ceux d'avant les centaines sous 100, ceux d'un grand bloc au-delà */
export function buildLimits(target: number): CollectionSet {
	if (!isLargeBuild(target)) return BUILD_LIMITS;
	const { thousands, hundreds, tens, units } = COLLECTION_LARGE_LIMITS;
	return { thousands: target >= 1000 ? thousands : 0, hundreds, tens, units };
}

/** Valeur posée */
export function buildValue(build: CollectionSet): number {
	return PIECES.reduce((sum, piece) => sum + PIECE_VALUES[piece] * build[piece], 0);
}

/** Réponse de la case : la valeur en chiffres, '' si le plan est vide */
export function buildAnswer(build: CollectionSet): string {
	const value = buildValue(build);
	return value === 0 ? '' : String(value);
}

/** Une pièce de plus, jamais au-delà du plafond */
export function addToBuild(
	build: CollectionSet,
	piece: BuildPiece,
	limits: CollectionSet = BUILD_LIMITS
): CollectionSet {
	if (build[piece] >= limits[piece]) return build;
	return { ...build, [piece]: build[piece] + 1 };
}

/** Une pièce de moins, jamais sous 0 */
export function removeFromBuild(build: CollectionSet, piece: BuildPiece): CollectionSet {
	if (build[piece] === 0) return build;
	return { ...build, [piece]: build[piece] - 1 };
}

/** Construction juste, le moins d'objets : milliers, centaines, dizaines et unités (Q8) */
export function solutionBuild(value: number): CollectionSet {
	return {
		thousands: Math.floor(value / 1000),
		hundreds: Math.floor((value % 1000) / 100),
		tens: Math.floor((value % 100) / 10),
		units: value % 10
	};
}

/**
 * Construction redessinée depuis une réponse seule (composant remonté) : du
 * plus grand rang de la réserve au plus petit, chacun à son plafond ; réponse
 * vide ou illisible → plan vide
 */
export function buildFromAnswer(answer: string, target: number): CollectionSet {
	const text = answer.trim();
	if (!/^\d+$/.test(text)) return EMPTY_BUILD;
	const limits = buildLimits(target);
	let rest = Number(text);
	const build = { ...EMPTY_BUILD };
	for (const piece of PIECES) {
		build[piece] = Math.min(Math.floor(rest / PIECE_VALUES[piece]), limits[piece]);
		rest -= build[piece] * PIECE_VALUES[piece];
	}
	return build;
}

/** La scène du plan : la collection posée, objets rangés */
export function buildScene(
	drawing: CollectionDrawing,
	build: CollectionSet,
	large = false
): CollectionScene {
	return buildCollectionScene(
		{
			sets: [build],
			captions: null,
			drawing,
			unitLayout: 'rangées',
			sizeCm: null,
			...(large && { large: true as const })
		},
		0
	);
}

/** La réserve dessinée : une pièce de chaque sorte disponible, à l'échelle du plan */
export function reserveScene(drawing: CollectionDrawing, target: number): CollectionScene {
	const pieces = reservePieces(target);
	const one = { ...EMPTY_BUILD };
	for (const piece of pieces) one[piece] = 1;
	return buildScene(drawing, one, isLargeBuild(target));
}
