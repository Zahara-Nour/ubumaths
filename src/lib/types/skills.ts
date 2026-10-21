/**
 * Skills System — Business Types
 * ================================
 *
 * Types métier du système de compétences Chiphre. Indépendants de la table
 * auto-générée `database.ts` (les unions de valeurs viennent des CHECK
 * constraints SQL, mais sont copiées ici pour la lisibilité et la stabilité).
 *
 * Spec : `docs/archive/wip/skills-referentiel-design.md` (décisions 57-72)
 * Phase 1 progress : `docs/wip/competence-referentiel-phase1-progress.md`
 *
 * Pour les types DERIVED de la base (`Tables<'observables'>`, etc.), voir
 * `database-helpers.ts` (aliases) et `database.ts` (auto-généré).
 */

// ============================================================================
// MathCompetence — les 6 compétences mathématiques transversales (famille B)
// ============================================================================

/**
 * Code stable des 6 compétences mathématiques transversales. En DB :
 * `math_competences.code` (UNIQUE). Dispatch via `compute_competence_level()`
 * en PL/pgSQL utilise ces codes (cf. décision 69, migration 1.2).
 */
export type MathCompetenceCode =
	'chercher' | 'modeliser' | 'representer' | 'raisonner' | 'calculer' | 'communiquer';

/**
 * Niveau du socle commun (LSU) pour une compétence math, calculé par règle
 * conjonctive et hiérarchisée (cf. décision 48 + §6.1ter).
 * En DB : `student_competence_level.niveau`.
 */
export type MathCompetenceLevel = 'insuffisante' | 'fragile' | 'satisfaisante' | 'tres_bonne';

/**
 * Lettre d'une composante du cadre canonique (A/B/C/D).
 * En DB : `math_competence_subdimensions.letter`.
 * Les composantes sont des regroupements structurels sans état propre
 * (décision 50).
 */
export type SubdimensionLetter = 'A' | 'B' | 'C' | 'D';

// ============================================================================
// SkillAttempts — sources et codes de saisie
// ============================================================================

/**
 * Source d'une saisie d'attempt.
 * - `'auto'`          : générée par le système quand l'élève répond à une question Chiphre en quiz interactif (Monde 1)
 * - `'srs'`           : générée quand l'élève s'auto-évalue lors d'une review SRS (Monde 2 — décision 2026-06-10)
 * - `'teacher'`       : saisie manuelle prof après évaluation ou observation (famille B)
 * - `'student_self'`  : auto-évaluation élève (décision 16 — non contributive au calcul officiel)
 */
export type SkillSource = 'auto' | 'srs' | 'teacher' | 'student_self';

/**
 * Code ternaire d'une saisie famille competence (décision 45).
 * - `'plus'`  : observable réussi en autonomie sur cette tâche
 * - `'minus'` : observable non réussi alors que l'occasion était présente
 * - (`'∅'`)   : hors périmètre — ne génère PAS de ligne (implicite par absence)
 */
export type SkillAttemptCode = 'plus' | 'minus';

/**
 * Phase de résolution de problème (BO 2026 cycle 3), utilisée comme outil de
 * diagnostic post-erreur (décision 30). En DB : `skill_attempts.phase_blocage`.
 */
export type PhaseBlocage = 'comprendre' | 'modeliser' | 'calculer' | 'repondre' | 'regulation';

// ============================================================================
// Helpers d'affichage UI (libellés français)
// ============================================================================

const MATH_COMPETENCE_LEVEL_LABELS: Record<MathCompetenceLevel, string> = {
	insuffisante: 'Insuffisante',
	fragile: 'Fragile',
	satisfaisante: 'Satisfaisante',
	tres_bonne: 'Très bonne maîtrise'
};

const MATH_COMPETENCE_LEVEL_VISUALS: Record<MathCompetenceLevel, string> = {
	insuffisante: '◯',
	fragile: '🟠',
	satisfaisante: '🟢',
	tres_bonne: '✨'
};

/**
 * Une compétence est-elle réellement OBSERVÉE ?
 *
 * ⚠️ `niveau` est NOT NULL en base, et `update_student_competence_level` écrit
 * `'insuffisante'` dès qu'il y a moins de deux tâches (garde §6.4). Donc la
 * PRÉSENCE d'une ligne dans `student_competence_level` ne prouve rien : une
 * ligne `{niveau:'insuffisante', task_count:0}` est parfaitement possible.
 *
 * Sans ce seuil partagé, la tuile comptait « 1 observée » pendant que le
 * panneau affichait « Pas encore observée » pour la même compétence — la
 * divergence tuile/page que ce module entier vise à rendre impossible.
 *
 * Le seuil est celui du SQL : deux tâches avant de prononcer un niveau.
 */
export function isCompetenceObserved(competence: { task_count: number }): boolean {
	return competence.task_count >= MIN_TASKS_FOR_COMPETENCE_LEVEL;
}

/** Garde §6.4 — nombre minimal de tâches d'observation, aligné sur le PL/pgSQL. */
export const MIN_TASKS_FOR_COMPETENCE_LEVEL = 2;

export function formatMathCompetenceLevel(level: MathCompetenceLevel): string {
	return MATH_COMPETENCE_LEVEL_LABELS[level];
}

export function getMathCompetenceLevelVisual(level: MathCompetenceLevel): string {
	return MATH_COMPETENCE_LEVEL_VISUALS[level];
}

const MATH_COMPETENCE_NAMES: Record<MathCompetenceCode, string> = {
	chercher: 'Chercher',
	modeliser: 'Modéliser',
	representer: 'Représenter',
	raisonner: 'Raisonner',
	calculer: 'Calculer',
	communiquer: 'Communiquer'
};

export function formatMathCompetenceCode(code: MathCompetenceCode): string {
	return MATH_COMPETENCE_NAMES[code];
}

// ============================================================================
// MissingForNextItem — items du champ missing_for_next (décision UI 2026-06-09)
// ============================================================================

/**
 * Item du champ `student_competence_level.missing_for_next` (JSONB array).
 * Type discriminé par `kind` — chaque variant décrit une exigence manquante
 * pour atteindre le niveau supérieur de la compétence.
 *
 * Produit par les 6 fonctions `compute_<competence>_level` (migration 1.2).
 *
 * Cf. décisions 69 (règles conjonctives) + 2026-06-09 (format typé).
 */
export type MissingForNextItem =
	/** Un observable précis manque (ex. C2 pour Chercher Très bonne) */
	| { kind: 'observable'; code: string }
	/** Au moins 1 observable de cette composante manque (ex. ≥ 1 de D pour Chercher Très bonne) */
	| { kind: 'one_of_subdim'; letter: SubdimensionLetter }
	/** Au moins n observables sur total (ex. ≥ 2 des 3 obs de A pour Chercher Satisfaisante) */
	| { kind: 'n_of_subdim'; letter: SubdimensionLetter; n: number; total: number }
	/** Au moins 1 parmi cette liste (ex. ≥ 1 parmi B2..B5 pour Chercher Satisfaisante) */
	| { kind: 'one_of_codes'; codes: string[] }
	/** Garde-fou §6.4 (minimum de tâches d'observation) */
	| { kind: 'guard'; name: 'needs_more_tasks' | 'confirm_with_third_task' };

/**
 * Format de `student_competence_level.missing_for_next` côté DB (JSONB).
 * Utilisable comme cast TypeScript : `result.missing_for_next as MissingForNext`.
 */
export type MissingForNext = MissingForNextItem[];

/**
 * Format de `student_competence_level.validated_observables` côté DB (JSONB).
 * Array plat de codes observables acquis qui valident le niveau actuel.
 */
export type ValidatedObservables = string[];

// ============================================================================
// Niveau d'une notion du programme (« Ce que je sais faire »)
// ============================================================================

/**
 * Niveau d'une notion pour l'élève : aucun point acquis, une partie, ou tous.
 *
 * Plus d'échelle à rangs (ni « maîtrisé ✨ ») depuis la bascule sur l'arbre des
 * notions (C5, étape 3, PR D) : aucun point neuf ne porte de `rang`.
 *
 * ⚠️ Fonction PARTAGÉE serveur (agrégation) / client (rendu) : c'est elle qui
 * garantit que la tuile du dashboard et la page disent le même chiffre.
 */
export type NotionLevel = 'non_commence' | 'en_cours' | 'atteint';

const NOTION_LEVEL_LABELS: Record<NotionLevel, string> = {
	non_commence: 'Non commencé',
	en_cours: 'En cours',
	atteint: 'Atteint'
};

const NOTION_LEVEL_VISUALS: Record<NotionLevel, string> = {
	non_commence: '◯',
	en_cours: '🟠',
	atteint: '🟢'
};

export function notionLevel(n: { acquired_count: number; total_count: number }): NotionLevel {
	if (n.total_count === 0 || n.acquired_count === 0) return 'non_commence';
	return n.acquired_count >= n.total_count ? 'atteint' : 'en_cours';
}

export function formatNotionLevel(level: NotionLevel): string {
	return NOTION_LEVEL_LABELS[level];
}

export function getNotionLevelVisual(level: NotionLevel): string {
	return NOTION_LEVEL_VISUALS[level];
}
