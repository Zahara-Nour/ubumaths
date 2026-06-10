/**
 * Types partagés du module anti-fraud SRS.
 *
 * Spec TDD : docs/wip/srs-anti-fraud-spec-tdd.md
 */

import type { AntiFraudFlagType, AntiFraudSeverity } from '$lib/types/database-helpers';

/**
 * Entrée individuelle dans `srs_card_stats.review_history` (JSONB array).
 *
 * Structure produite par `applyFsrsReview` dans `src/lib/server/srs/fsrs-actions.ts`.
 */
export interface ReviewEntry {
	date: string; // ISO timestamp
	grade: 1 | 2 | 3 | 4;
	elapsedDays: number;
	retrievability: number;
	timeSpent?: number; // seconds, optional V1
}

/**
 * Tentative agrégée pour `srs_vs_quiz_gap` (vue `skill_attempts`).
 */
export interface AttemptEntry {
	created_at: string; // ISO
	success: boolean;
	grade: number | null;
	source: 'auto' | 'srs' | 'task' | string;
}

/**
 * Résultat d'un détecteur unitaire.
 * `null` = aucun seuil franchi, pas de flag à créer pour ce signal.
 */
export interface SignalResult {
	flag_type: Exclude<AntiFraudFlagType, 'composite'>;
	severity: AntiFraudSeverity;
	score: number; // 0..1
	sample_size: number;
	details: Record<string, unknown>;
}

/**
 * Résultat composite (synthèse).
 */
export interface CompositeResult {
	flag_type: 'composite';
	severity: AntiFraudSeverity;
	score: number;
	sample_size: number;
	details: {
		signals: SignalResult[];
	};
}

/**
 * Rapport retourné par `runAntiFraudJob`.
 */
export interface JobReport {
	flags_created: number;
	scanned_pairs: number;
	skipped_disabled: boolean;
	skipped_dedupe: number;
	duration_ms: number;
}
