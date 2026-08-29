/**
 * Anti-fraud SRS runner — orchestrateur du job de détection.
 *
 * Cf. spec TDD : docs/wip/srs-anti-fraud-spec-tdd.md §B7..B8
 *
 * Flux :
 *   1. Vérifie app_config.anti_fraud_enabled. Exit early si false.
 *   2. Liste les (student × capacity) avec ≥ N reviews SRS sur 7j.
 *   3. Pour chaque paire :
 *      - Load reviews depuis srs_card_stats.review_history.
 *      - Load skill_attempts (srs vs auto) pour srs_vs_quiz_gap.
 *      - Applique 5 détecteurs + composite.
 *      - Skip si flag identique non-résolu < 7j (dédoublonnage).
 *      - INSERT flag(s).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { ReviewEntry, AttemptEntry, JobReport, SignalResult } from './types';
import {
	composeSignals,
	detectBurst,
	detectFastTimeSpent,
	detectHighEasyRatio,
	detectNoAgain,
	detectSrsVsQuizGap
} from './detectors';
import type { RunJobOptions } from '$lib/server/validation/anti-fraud';

const DEFAULT_WINDOW_DAYS = 7;
const DEDUPE_WINDOW_DAYS = 7;

type SBClient = SupabaseClient<Database>;

/**
 * Lit le feature flag `anti_fraud_enabled` via `app_config`.
 * Retourne false si table/row absente (fail-safe).
 */
async function isAntiFraudEnabled(supabase: SBClient): Promise<boolean> {
	const { data, error } = await supabase
		.from('app_config')
		.select('value')
		.eq('key', 'anti_fraud_enabled')
		.maybeSingle();

	if (error || !data) return false;
	return data.value?.toLowerCase() === 'true';
}

/**
 * Liste les paires (student_id, capacity_point_id) ayant des reviews SRS sur la fenêtre.
 * Implémentation : lecture batchée des `srs_card_stats` + tagging templates.
 */
async function listScanPairs(
	supabase: SBClient,
	windowStart: Date,
	studentFilter?: string
): Promise<Map<string, Map<string, ReviewEntry[]>>> {
	// 1. Tous les srs_card_stats avec review_history non-vide pour des templates tagués.
	let statsQuery = supabase
		.from('srs_card_stats')
		.select('user_id, card_reference_id, review_history')
		.eq('card_reference_type', 'template');

	if (studentFilter) {
		statsQuery = statsQuery.eq('user_id', studentFilter);
	}

	const { data: statsRows, error: statsErr } = await statsQuery;
	if (statsErr) throw new Error(`Failed to load srs_card_stats: ${statsErr.message}`);

	type StatRow = {
		user_id: string;
		card_reference_id: string;
		review_history: ReviewEntry[] | null;
	};

	// 2. Tous les tags template → skill famille A.
	const templateIds = [
		...new Set(((statsRows ?? []) as unknown as StatRow[]).map((r) => r.card_reference_id))
	];
	if (templateIds.length === 0) return new Map();

	const { data: tagRows, error: tagErr } = await supabase
		.from('question_template_points')
		.select('template_id, skill_id, skills!inner(family)')
		.in('template_id', templateIds);

	if (tagErr) throw new Error(`Failed to load question_template_points: ${tagErr.message}`);

	type TagRow = {
		template_id: string;
		skill_id: string;
		skills: { family: string } | null;
	};

	// Map template_id → liste de capacity_point_id (famille A).
	const templateToSkills = new Map<string, string[]>();
	for (const tag of (tagRows ?? []) as unknown as TagRow[]) {
		if (tag.skills?.family !== 'knowledge') continue;
		const arr = templateToSkills.get(tag.template_id) ?? [];
		arr.push(tag.skill_id);
		templateToSkills.set(tag.template_id, arr);
	}

	// 3. Construction des paires : Map<student_id, Map<capacity_id, ReviewEntry[]>>.
	const pairs = new Map<string, Map<string, ReviewEntry[]>>();
	const cutoffMs = windowStart.getTime();

	for (const row of (statsRows ?? []) as unknown as StatRow[]) {
		const history = Array.isArray(row.review_history) ? row.review_history : [];
		const filtered = history.filter((h) => {
			if (!h?.date) return false;
			return new Date(h.date).getTime() >= cutoffMs;
		});
		if (filtered.length === 0) continue;

		const skills = templateToSkills.get(row.card_reference_id);
		if (!skills) continue;

		for (const skillId of skills) {
			let studentMap = pairs.get(row.user_id);
			if (!studentMap) {
				studentMap = new Map();
				pairs.set(row.user_id, studentMap);
			}
			const existing = studentMap.get(skillId) ?? [];
			studentMap.set(skillId, [...existing, ...filtered]);
		}
	}

	return pairs;
}

/**
 * Load skill_attempts SRS vs Monde 1 pour une paire (student, capacity).
 */
async function loadAttempts(
	supabase: SBClient,
	studentId: string,
	capacityPointId: string,
	windowStart: Date
): Promise<{ srs: AttemptEntry[]; quiz: AttemptEntry[] }> {
	// Templates tagués avec cette capacité.
	const { data: tagRows } = await supabase
		.from('question_template_points')
		.select('template_id')
		.eq('point_id', capacityPointId);

	const templateIds = [...new Set((tagRows ?? []).map((t) => t.template_id))];
	if (templateIds.length === 0) return { srs: [], quiz: [] };

	const { data: attempts } = await supabase
		.from('skill_attempts')
		.select('created_at, success, grade, source')
		.eq('student_id', studentId)
		.in('template_id', templateIds)
		.gte('created_at', windowStart.toISOString());

	const all = (attempts ?? []) as unknown as AttemptEntry[];
	return {
		srs: all.filter((a) => a.source === 'srs'),
		quiz: all.filter((a) => a.source === 'auto')
	};
}

/**
 * Vérifie si un flag identique non-résolu existe déjà dans la fenêtre dédoublonnage.
 */
async function hasRecentFlag(
	supabase: SBClient,
	studentId: string,
	capacityId: string | null,
	flagType: string,
	now: Date
): Promise<boolean> {
	const dedupeCutoff = new Date(now.getTime() - DEDUPE_WINDOW_DAYS * 24 * 3600 * 1000);
	let q = supabase
		.from('srs_anti_fraud_flags')
		.select('id')
		.eq('student_id', studentId)
		.eq('flag_type', flagType)
		.eq('resolved', false)
		.gte('created_at', dedupeCutoff.toISOString());

	if (capacityId === null) {
		q = q.is('capacity_point_id', null);
	} else {
		q = q.eq('capacity_point_id', capacityId);
	}

	const { data, error } = await q.limit(1);
	if (error) {
		// En cas d'erreur, on choisit de skip (pas de double insert) plutôt que d'insérer.
		return true;
	}
	return (data ?? []).length > 0;
}

/**
 * Insert d'un flag dans srs_anti_fraud_flags.
 */
async function insertFlag(
	supabase: SBClient,
	studentId: string,
	capacityId: string | null,
	signal:
		| SignalResult
		| (typeof composeSignals extends (...args: never[]) => infer R ? Exclude<R, null> : never),
	windowStart: Date,
	windowEnd: Date
): Promise<boolean> {
	const { error } = await supabase.from('srs_anti_fraud_flags').insert({
		student_id: studentId,
		capacity_point_id: capacityId,
		flag_type: signal.flag_type,
		severity: signal.severity,
		score: signal.score,
		sample_size: signal.sample_size,
		window_start: windowStart.toISOString(),
		window_end: windowEnd.toISOString(),
		details: signal.details as never
	});
	return !error;
}

/**
 * Point d'entrée du runner anti-fraud.
 */
export async function runAntiFraudJob(
	supabase: SBClient,
	opts: RunJobOptions = { dry_run: false }
): Promise<JobReport> {
	const startMs = performance.now();

	const enabled = await isAntiFraudEnabled(supabase);
	if (!enabled) {
		console.info('[anti-fraud] disabled by config — skipping');
		return {
			flags_created: 0,
			scanned_pairs: 0,
			skipped_disabled: true,
			skipped_dedupe: 0,
			duration_ms: Math.round(performance.now() - startMs)
		};
	}

	const now = new Date();
	const windowStart = opts.since
		? new Date(opts.since)
		: new Date(now.getTime() - DEFAULT_WINDOW_DAYS * 24 * 3600 * 1000);

	const pairs = await listScanPairs(supabase, windowStart, opts.student_id);

	let flagsCreated = 0;
	let scannedPairs = 0;
	let skippedDedupe = 0;

	for (const [studentId, capacityMap] of pairs) {
		for (const [capacityId, reviews] of capacityMap) {
			scannedPairs += 1;

			const signals: SignalResult[] = [];
			const high = detectHighEasyRatio(reviews);
			const noAg = detectNoAgain(reviews);
			const fast = detectFastTimeSpent(reviews);
			const burst = detectBurst(reviews);

			if (high) signals.push(high);
			if (noAg) signals.push(noAg);
			if (fast) signals.push(fast);
			if (burst) signals.push(burst);

			// srs_vs_quiz_gap nécessite un load skill_attempts séparé.
			const { srs, quiz } = await loadAttempts(supabase, studentId, capacityId, windowStart);
			const gap = detectSrsVsQuizGap(srs, quiz);
			if (gap) signals.push(gap);

			const composite = composeSignals(signals);

			const toInsert: (SignalResult | NonNullable<ReturnType<typeof composeSignals>>)[] = [
				...signals
			];
			if (composite) toInsert.push(composite);

			for (const sig of toInsert) {
				if (opts.dry_run) {
					flagsCreated += 1;
					continue;
				}
				const recent = await hasRecentFlag(supabase, studentId, capacityId, sig.flag_type, now);
				if (recent) {
					skippedDedupe += 1;
					continue;
				}
				const ok = await insertFlag(supabase, studentId, capacityId, sig, windowStart, now);
				if (ok) flagsCreated += 1;
			}
		}
	}

	return {
		flags_created: flagsCreated,
		scanned_pairs: scannedPairs,
		skipped_disabled: false,
		skipped_dedupe: skippedDedupe,
		duration_ms: Math.round(performance.now() - startMs)
	};
}
