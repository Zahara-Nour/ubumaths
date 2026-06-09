/**
 * Skills System — Business Types
 * ================================
 *
 * Types métier du système de compétences UbuMaths. Indépendants de la table
 * auto-générée `database.ts` (les unions de valeurs viennent des CHECK
 * constraints SQL, mais sont copiées ici pour la lisibilité et la stabilité).
 *
 * Spec : `docs/wip/skills-referentiel-design.md` (décisions 57-72)
 * Phase 1 progress : `docs/wip/competence-referentiel-phase1-progress.md`
 *
 * Pour les types DERIVED de la base (`Tables<'skills'>`, etc.), voir
 * `database-helpers.ts` (aliases) et `database.ts` (auto-généré).
 */

// ============================================================================
// Family — distinction knowledge / competence (décision 67)
// ============================================================================

/**
 * Famille d'un skill, dérivée des FK `objective_id` / `subdimension_id`.
 * En DB : colonne GENERATED stockée dans `skills.family`.
 * - `'knowledge'`  : famille A (capacités, connaissances et savoir-faire)
 * - `'competence'` : famille B (observables, compétences mathématiques transversales)
 */
export type Family = 'knowledge' | 'competence';

// ============================================================================
// KnowledgeType — type d'acquisition famille knowledge (décisions 56, 66, 68)
// ============================================================================

/**
 * Type d'une capacité famille knowledge, reprend la rubrique BO 2026.
 * Détermine la règle d'acquisition (cf. design §3 + §6.1).
 * En DB : colonne `skills.knowledge_type`, NULL pour famille competence.
 * - `'automatisme'`        : geste à automatiser (calcul mental, lexique...)
 *   Règle : ≥ 5 réussites totales + ≥ 3 sur les 5 dernières tentatives
 * - `'capacite_attendue'`  : compétence réfléchie à mobiliser
 *   Règle : ≥ 1 réussite sur ≥ 2 templates distincts + aucun échec dans les 3 dernières
 */
export type KnowledgeType = 'automatisme' | 'capacite_attendue';

// ============================================================================
// MathCompetence — les 6 compétences mathématiques transversales (famille B)
// ============================================================================

/**
 * Code stable des 6 compétences mathématiques transversales. En DB :
 * `math_competences.code` (UNIQUE). Dispatch via `compute_competence_level()`
 * en PL/pgSQL utilise ces codes (cf. décision 69, migration 1.2).
 */
export type MathCompetenceCode =
	| 'chercher'
	| 'modeliser'
	| 'representer'
	| 'raisonner'
	| 'calculer'
	| 'communiquer';

/**
 * Niveau du socle commun (LSU) pour une compétence math, calculé par règle
 * conjonctive et hiérarchisée (cf. décision 48 + §6.1ter).
 * En DB : `student_competence_level.niveau`.
 */
export type MathCompetenceLevel = 'insuffisante' | 'fragile' | 'satisfaisante' | 'tres_bonne';

/**
 * Lettre d'une sous-dimension du cadre canonique (A/B/C/D).
 * En DB : `math_competence_subdimensions.letter`.
 * Les sous-dimensions sont des regroupements structurels sans état propre
 * (décision 50).
 */
export type SubdimensionLetter = 'A' | 'B' | 'C' | 'D';

// ============================================================================
// SkillAttempts — sources et codes de saisie
// ============================================================================

/**
 * Source d'une saisie d'attempt.
 * - `'auto'`          : générée par le système quand l'élève répond à une question UbuMaths (famille knowledge uniquement)
 * - `'teacher'`       : saisie manuelle prof après évaluation ou observation
 * - `'student_self'`  : auto-évaluation élève (décision 16 — non contributive au calcul officiel)
 */
export type SkillSource = 'auto' | 'teacher' | 'student_self';

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
// Helpers de lecture
// ============================================================================

/**
 * Détermine la famille d'un skill à partir de ses FK. Source de vérité
 * équivalente à la colonne GENERATED `skills.family`.
 */
export function getSkillFamily(skill: {
	objective_id: string | null;
	subdimension_id: string | null;
}): Family {
	return skill.objective_id !== null ? 'knowledge' : 'competence';
}

export function isKnowledgeSkill(skill: {
	objective_id: string | null;
	subdimension_id: string | null;
}): boolean {
	return skill.objective_id !== null;
}

export function isCompetenceSkill(skill: {
	objective_id: string | null;
	subdimension_id: string | null;
}): boolean {
	return skill.subdimension_id !== null;
}

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

export function formatMathCompetenceLevel(level: MathCompetenceLevel): string {
	return MATH_COMPETENCE_LEVEL_LABELS[level];
}

export function getMathCompetenceLevelVisual(level: MathCompetenceLevel): string {
	return MATH_COMPETENCE_LEVEL_VISUALS[level];
}

const KNOWLEDGE_TYPE_LABELS: Record<KnowledgeType, string> = {
	automatisme: 'Automatisme',
	capacite_attendue: 'Capacité attendue'
};

export function formatKnowledgeType(type: KnowledgeType): string {
	return KNOWLEDGE_TYPE_LABELS[type];
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
// Visuels d'état famille knowledge (objectif)
// ============================================================================

/**
 * Niveau atteint sur un objectif famille knowledge = rang max des capacités acquises
 * (0 si aucune). Cf. §6.3.
 */
export type ObjectiveLevel = 0 | 1 | 2 | 3 | 4;

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
	/** Au moins 1 observable de cette sous-dimension manque (ex. ≥ 1 de D pour Chercher Très bonne) */
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

const OBJECTIVE_LEVEL_LABELS: Record<ObjectiveLevel, string> = {
	0: 'Non commencé',
	1: 'En cours',
	2: 'En cours',
	3: 'Objectif atteint',
	4: 'Maîtrisé en profondeur'
};

const OBJECTIVE_LEVEL_VISUALS: Record<ObjectiveLevel, string> = {
	0: '◯',
	1: '🟠',
	2: '🟠',
	3: '🟢',
	4: '✨'
};

export function formatObjectiveLevel(level: ObjectiveLevel): string {
	return OBJECTIVE_LEVEL_LABELS[level];
}

export function getObjectiveLevelVisual(level: ObjectiveLevel): string {
	return OBJECTIVE_LEVEL_VISUALS[level];
}
