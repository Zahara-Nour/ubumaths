/**
 * Suivi d'un élève (prof) : bloc « Points du programme »
 * =======================================================
 *
 * Par point du niveau de l'élève qu'il a travaillé : le badge FSRS (même règle
 * que la grille A de la classe : le pire des modèles du point) et deux comptes
 * de traces, `{ done, succeeded }` chacun :
 *   - prouvé  : sources `auto` + `teacher` (l'appli ou un adulte a jugé) ;
 *   - déclaré : sources `student_self` + `srs` (l'élève a dit « je sais »).
 * `onlyDeclared` : rien de prouvé, du déclaré seulement.
 *
 * Une trace sans verdict (`success` NULL) ou d'origine inconnue n'est comptée
 * nulle part (l'origine inconnue est journalisée). Aucune date : décision vie
 * privée (docs/wip/suivi-eleve-progress.md, Q5).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { fetchInChunks } from '$lib/server/utils/chunked-in';
import { keepLinksOfGrade } from '$lib/server/curriculum-grade';
import { PROGRAMME_POINT_COLS } from '$lib/server/programme-tree';
import { readInBatches } from '$lib/server/evaluation-breakdown';
import type { ProgrammePointRow } from '$lib/utils/programme-tree';
import {
	templateToBadge,
	BADGE_PRIORITY,
	type CurriculumPointBadge
} from '$lib/server/srs/curriculum-point-badge';
import { isLivePoint, placeInTree } from '$lib/server/stats/class-knowledge';
import {
	AUTONOMOUS_SOURCES,
	buildRegularityGrid,
	countActiveWeeks,
	readSchoolYearOfSchool,
	regularityFirstDay,
	type RegularityTier,
	type RegularityTrace,
	type RegularityWeek
} from '$lib/server/stats/class-regularity';
import { schoolDay } from '$lib/server/course-card-attempts';
import { getStudentAssignments } from '$lib/server/evaluations';
import type { StudentEvaluationStatus } from '$lib/types/evaluation';
import type { MathCompetenceLevel } from '$lib/types/skills';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/stats/student-follow-up');

type SB = SupabaseClient<Database>;

type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface AttemptCount {
	done: number;
	succeeded: number;
}

export interface StudentAttemptRow {
	template_id: string | null;
	source: string;
	success: boolean | null;
}

export interface StudentTemplateLink {
	template_id: string;
	curriculum_points: ProgrammePointRow | null;
}

export interface StudentFsrsRow {
	card_reference_id: string;
	state: CardState;
	next_review: string;
}

/** Régularité de l'élève : un palier par semaine depuis la rentrée (jamais de nombre). */
export interface StudentRegularity {
	weeks: RegularityWeek[];
	tiers: RegularityTier[];
}

/** Une compétence et le niveau de l'élève (null : pas encore évaluée). */
export interface StudentCompetence {
	id: string;
	name: string;
	level: MathCompetenceLevel | null;
}

/** Un contrôle assigné à l'élève : ni date, ni contenu de la série. */
export interface StudentEvaluation {
	evaluation_id: string;
	title: string;
	best_grade: number | null;
	status: StudentEvaluationStatus;
}

/** Un point travaillé, avant rangement dans l'arbre. */
export interface StudentPointCounts {
	point: ProgrammePointRow;
	badge: CurriculumPointBadge;
	proved: AttemptCount;
	declared: AttemptCount;
	onlyDeclared: boolean;
}

/** Ce que la page lit : un point travaillé, rangé sous sa branche et sa notion. */
export interface StudentPointFollowUp {
	id: string;
	name: string;
	branch_name: string | null;
	notion_name: string | null;
	badge: CurriculumPointBadge;
	proved: AttemptCount;
	declared: AttemptCount;
	onlyDeclared: boolean;
}

const PROVED_SOURCES = new Set(['auto', 'teacher']);
const DECLARED_SOURCES = new Set(['student_self', 'srs']);

interface BuildInput {
	attempts: readonly StudentAttemptRow[];
	links: readonly StudentTemplateLink[];
	fsrs: readonly StudentFsrsRow[];
	/** Niveau de l'élève (`profiles.grade`). */
	grade: string | null;
	now: number;
}

/**
 * Pure : traces + liens modèle → point + états FSRS → une entrée par point
 * travaillé (non rangée : l'ordre est celui des liens).
 */
export function buildStudentPointFollowUp(input: BuildInput): StudentPointCounts[] {
	// Points vivants, puis carte partagée entre deux référentiels : seul le
	// niveau de l'élève compte (même règle que la grille A).
	const liveLinks = input.links.filter(
		(l) => l.curriculum_points !== null && isLivePoint(l.curriculum_points)
	);
	const links = keepLinksOfGrade(liveLinks, input.grade, (l) => ({
		template_id: l.template_id,
		grade: l.curriculum_points?.grade ?? null
	}));

	const pointsOfTemplate = new Map<string, ProgrammePointRow[]>();
	for (const l of links) {
		const list = pointsOfTemplate.get(l.template_id) ?? [];
		list.push(l.curriculum_points!);
		pointsOfTemplate.set(l.template_id, list);
	}

	const fsrsOfTemplate = new Map(input.fsrs.map((r) => [r.card_reference_id, r]));

	const byPoint = new Map<
		string,
		{
			point: ProgrammePointRow;
			templates: Set<string>;
			proved: AttemptCount;
			declared: AttemptCount;
		}
	>();

	// Une origine inconnue est journalisée une fois, pas à chaque trace.
	const unknownSources = new Set<string>();
	for (const a of input.attempts) {
		if (a.template_id === null) continue;
		const points = pointsOfTemplate.get(a.template_id);
		if (!points) continue;

		const isProved = PROVED_SOURCES.has(a.source);
		const isDeclared = DECLARED_SOURCES.has(a.source);
		if (!isProved && !isDeclared && !unknownSources.has(a.source)) {
			unknownSources.add(a.source);
			logger.warn(`[student-follow-up] Source de trace inconnue : ${a.source}`);
		}

		for (const point of points) {
			const entry = byPoint.get(point.id) ?? {
				point,
				templates: new Set<string>(),
				proved: { done: 0, succeeded: 0 },
				declared: { done: 0, succeeded: 0 }
			};
			byPoint.set(point.id, entry);
			entry.templates.add(a.template_id);

			// Sans verdict ou d'origine inconnue : le point est travaillé, la trace n'est comptée nulle part.
			if (a.success === null) continue;
			const count = isProved ? entry.proved : isDeclared ? entry.declared : null;
			if (!count) continue;
			count.done += 1;
			if (a.success) count.succeeded += 1;
		}
	}

	return [...byPoint.values()].map(({ point, templates, proved, declared }) => {
		const subBadges = [...templates].map((tplId): CurriculumPointBadge => {
			const card = fsrsOfTemplate.get(tplId);
			if (!card) return 'en_apprentissage';
			return templateToBadge(card.state, card.next_review, input.now);
		});
		const badge = subBadges.reduce<CurriculumPointBadge>(
			(acc, b) => (BADGE_PRIORITY[b] > BADGE_PRIORITY[acc] ? b : acc),
			'non_commencee'
		);
		return {
			point,
			badge,
			proved,
			declared,
			onlyDeclared: proved.done === 0 && declared.done > 0
		};
	});
}

/**
 * Les points travaillés par un élève, dans l'ordre de l'arbre. Lève une
 * erreur si une lecture échoue : l'appelant la transforme en `pointsError`.
 */
export async function getStudentPointFollowUp(
	supabase: SB,
	studentId: string
): Promise<StudentPointFollowUp[]> {
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('grade')
		.eq('id', studentId)
		.maybeSingle();
	if (profileError) throw new Error(`Niveau de l'élève illisible : ${profileError.message}`);
	const grade = profile?.grade ?? null;

	// Les traces d'un élève grossissent sans borne : lues par pages, triées sur
	// une colonne unique (plafond `max_rows` de PostgREST).
	const attempts = await readInBatches<StudentAttemptRow>(
		'Traces',
		[studentId],
		(batch, from, to) =>
			supabase
				.from('skill_attempts')
				.select('template_id, source, success')
				.in('student_id', batch)
				.not('template_id', 'is', null)
				.order('id')
				.range(from, to)
	);

	const templateIds = [...new Set(attempts.map((a) => a.template_id as string))];
	if (templateIds.length === 0) return [];

	const { data: linkRows, error: linkError } = await fetchInChunks(templateIds, (batch) =>
		supabase
			.from('question_template_points')
			.select(`template_id, point_id, curriculum_points(${PROGRAMME_POINT_COLS})`)
			.in('template_id', batch)
	);
	if (linkError) throw new Error(`Points des modèles illisibles : ${linkError.message}`);

	const { data: fsrsRows, error: fsrsError } = await fetchInChunks(templateIds, (batch) =>
		supabase
			.from('srs_card_stats')
			.select('card_reference_id, state, next_review')
			.eq('user_id', studentId)
			.eq('card_reference_type', 'template')
			.in('card_reference_id', batch)
	);
	if (fsrsError) throw new Error(`Mémoire de l'élève illisible : ${fsrsError.message}`);

	const counts = buildStudentPointFollowUp({
		attempts,
		links: (linkRows ?? []) as unknown as StudentTemplateLink[],
		fsrs: (fsrsRows ?? []) as StudentFsrsRow[],
		grade,
		now: Date.now()
	});
	if (counts.length === 0) return [];

	const placed = await placeInTree(
		supabase,
		counts.map((c) => c.point)
	);
	const countsByPoint = new Map(counts.map((c) => [c.point.id, c]));

	return placed.map((p) => {
		const c = countsByPoint.get(p.id)!;
		return {
			id: p.id,
			name: p.name,
			branch_name: p.branch_name,
			notion_name: p.notion_name,
			badge: c.badge,
			proved: c.proved,
			declared: c.declared,
			onlyDeclared: c.onlyDeclared
		};
	});
}

// ===========================================================================
// Bloc « Régularité »
// ===========================================================================

/**
 * La ligne de l'élève, mêmes règles que la grille C de la classe. Comptée en
 * TypeScript sur ses traces (la fonction de base compte par classe ; un élève
 * peut être hors classe : décision R1). Rentrée = celle de l'école de l'élève.
 * @throws si une lecture échoue (une ligne vide dirait « il n'a pas travaillé »).
 */
export async function getStudentRegularity(
	supabase: SB,
	studentId: string,
	now = new Date()
): Promise<StudentRegularity> {
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('school_id')
		.eq('id', studentId)
		.maybeSingle();
	if (profileError) throw new Error(`École de l'élève illisible : ${profileError.message}`);
	// Profil masqué : la grille partira du 1er septembre, pas de la rentrée de l'école
	if (!profile)
		logger.warn("[getStudentRegularity] Profil de l'élève illisible, rentrée par défaut");

	const { start, holidays } = await readSchoolYearOfSchool(
		supabase,
		profile?.school_id ?? null,
		now
	);
	const firstDay = regularityFirstDay(start, now);
	// Un jour de marge : minuit à Paris tombe la veille en UTC
	const since = new Date(new Date(`${firstDay}T00:00:00Z`).getTime() - 24 * 3600 * 1000);

	const traces = await readInBatches<RegularityTrace>(
		'Traces de régularité',
		[studentId],
		(batch, from, to) =>
			supabase
				.from('skill_attempts')
				.select('student_id, created_at, source, place')
				.in('student_id', batch)
				.in('source', [...AUTONOMOUS_SOURCES])
				.gte('created_at', since.toISOString())
				.order('id')
				.range(from, to)
	);

	const grid = buildRegularityGrid({
		students: [{ id: studentId, display_name: '' }],
		activeWeeks: countActiveWeeks(traces, firstDay),
		firstDay,
		today: schoolDay(now),
		holidays
	});
	return { weeks: grid.weeks, tiers: grid.students[0].tiers };
}

// ===========================================================================
// Bloc « Compétences »
// ===========================================================================

/** Les compétences dans l'ordre d'affichage, avec le niveau de l'élève. */
export async function getStudentCompetences(
	supabase: SB,
	studentId: string
): Promise<StudentCompetence[]> {
	const { data: competences, error: competencesError } = await supabase
		.from('math_competences')
		.select('id, name, display_order')
		.order('display_order', { ascending: true });
	if (competencesError) throw new Error(`Compétences illisibles : ${competencesError.message}`);

	const { data: levels, error: levelsError } = await supabase
		.from('student_competence_level')
		.select('math_competence_id, niveau')
		.eq('student_id', studentId);
	if (levelsError) throw new Error(`Niveaux de l'élève illisibles : ${levelsError.message}`);

	const levelOf = new Map(
		(levels ?? []).map((l) => [l.math_competence_id, l.niveau as MathCompetenceLevel])
	);
	return (competences ?? []).map((c) => ({
		id: c.id,
		name: c.name,
		level: levelOf.get(c.id) ?? null
	}));
}

// ===========================================================================
// Bloc « Contrôles »
// ===========================================================================

/**
 * Les contrôles publiés assignés à l'élève (nommément ou par une de ses
 * classes), lus avec le client du prof (RLS). Un contrôle assigné deux fois
 * n'apparaît qu'une fois. Du plus récent au plus ancien, sans date rendue.
 */
export async function getStudentEvaluations(
	supabase: SB,
	studentId: string
): Promise<StudentEvaluation[]> {
	const assignments = await getStudentAssignments(supabase, studentId);
	const byEvaluation = new Map<string, (typeof assignments)[number]>();
	for (const a of assignments) {
		if (!byEvaluation.has(a.evaluation.id)) byEvaluation.set(a.evaluation.id, a);
	}
	return [...byEvaluation.values()]
		.sort((a, b) => b.evaluation.created_at.localeCompare(a.evaluation.created_at))
		.map((a) => ({
			evaluation_id: a.evaluation.id,
			title: a.evaluation.series.title,
			best_grade: a.best_grade,
			status: a.status
		}));
}
