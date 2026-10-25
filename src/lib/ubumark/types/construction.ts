/**
 * Bloc ```figure-a-completer — types
 * ============================
 *
 * Figure de départ (même en-tête, même langage que ```figure) que l'élève
 * complète avec des outils ; la case de la question est le bloc lui-même.
 * Le parseur rend un nœud `figure` qui porte `construction` (spécification :
 * `docs/wip/geometrie-validation-progress.md` § 3 et § 4).
 *
 * @module ubumark/types/construction
 */

/** Outils proposés à l'élève (un seul par figure) : droite (CP-059), segment (CP-060) */
export const CONSTRUCTION_TOOLS = ['droite', 'segment'] as const;
export type ConstructionTool = (typeof CONSTRUCTION_TOOLS)[number];

/** Vérifications que l'auteur peut nommer dans `verifier:` */
export const CONSTRUCTION_CHECK_KINDS = ['droite_par', 'carre', 'rectangle'] as const;
export type ConstructionCheckKind = (typeof CONSTRUCTION_CHECK_KINDS)[number];

/** `droite_par A ; B` : une droite tracée passe par les points A et B */
export interface DroiteParCheck {
	kind: 'droite_par';
	points: [string, string];
	/** Ligne de la vérification dans le bloc (1 = première ligne après la clôture) */
	line: number;
}

/**
 * `carre A ; B` : le côté [AB] (déjà tracé) et les segments de l'élève forment
 * un carré, d'un côté ou de l'autre de [AB]
 */
export interface CarreCheck {
	kind: 'carre';
	points: [string, string];
	line: number;
}

/**
 * `rectangle A ; B ; C` : les côtés [AB] et [BC] (déjà tracés) et les segments
 * de l'élève forment le rectangle ABCD
 */
export interface RectangleCheck {
	kind: 'rectangle';
	points: [string, string, string];
	line: number;
}

/** Carré ou rectangle à compléter : une seule vérification de ce genre par figure */
export type PolygonCheck = CarreCheck | RectangleCheck;

export type ConstructionCheck = DroiteParCheck | PolygonCheck;

/** L'outil avec lequel se trace chaque vérification */
export const CHECK_TOOL: Record<ConstructionCheckKind, ConstructionTool> = {
	droite_par: 'droite',
	carre: 'segment',
	rectangle: 'segment'
};

export interface ConstructionSpec {
	tools: ConstructionTool[];
	checks: ConstructionCheck[];
	/**
	 * Numéro de la case de la question (`case: N`), posé par le générateur
	 * (`assign-blank-indices.ts`) ; absent hors d'une question à remplir.
	 */
	caseIndex?: number;
}
