/**
 * GET /api/teacher/classes/[classId]/anti-fraud/flags
 *
 * Liste les flags anti-fraud des élèves de la classe (jointure class_members).
 * Filtres : resolved, since, type, capacity.
 *
 * Cf. spec TDD : docs/wip/srs-anti-fraud-spec-tdd.md §B9
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '$lib/server/stats/teacher-class-auth';
import { classIdParamSchema } from '$lib/server/validation/teacher-analytics';
import { flagsListQuerySchema } from '$lib/server/validation/anti-fraud';

const MAX_FLAGS_PER_REQUEST = 100;
const DEFAULT_SINCE_DAYS = 30;

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const paramCheck = classIdParamSchema.safeParse(params);
	if (!paramCheck.success) {
		return json({ error: paramCheck.error.issues[0].message }, { status: 400 });
	}

	const queryCheck = flagsListQuerySchema.safeParse({
		resolved: url.searchParams.get('resolved') ?? undefined,
		since: url.searchParams.get('since') ?? undefined,
		type: url.searchParams.get('type') ?? undefined,
		capacity: url.searchParams.get('capacity') ?? undefined
	});
	if (!queryCheck.success) {
		return json({ error: queryCheck.error.issues[0].message }, { status: 400 });
	}

	const { classId } = paramCheck.data;
	const { resolved, since, type, capacity } = queryCheck.data;
	await requireTeacherOfClass(locals, classId);

	// 1. Liste des élèves actifs de la classe.
	const { data: memberRows } = await locals.supabase
		.from('class_members')
		.select('student_id')
		.eq('class_id', classId)
		.eq('status', 'active');

	const studentIds = (memberRows ?? []).map((m) => m.student_id);
	if (studentIds.length === 0) {
		return json({ flags: [], total: 0, resolved_count: 0 });
	}

	// 2. Construit la query flags avec filtres.
	const sinceIso =
		since ?? new Date(Date.now() - DEFAULT_SINCE_DAYS * 24 * 3600 * 1000).toISOString();

	let q = locals.supabase
		.from('srs_anti_fraud_flags')
		.select(
			'id, student_id, capacity_point_id, flag_type, severity, score, sample_size, details, resolved, resolved_by, resolved_at, created_at, profiles!srs_anti_fraud_flags_student_id_fkey(id, first_name, last_name), curriculum_points(id, name)'
		)
		.in('student_id', studentIds)
		.gte('created_at', sinceIso)
		.eq('resolved', resolved)
		.order('score', { ascending: false })
		.order('created_at', { ascending: false })
		.limit(MAX_FLAGS_PER_REQUEST);

	if (type) q = q.eq('flag_type', type);
	if (capacity) q = q.eq('capacity_point_id', capacity);

	const { data: flagRows, error: flagErr } = await q;
	if (flagErr) {
		return json({ error: flagErr.message }, { status: 500 });
	}

	type FlagRow = {
		id: string;
		student_id: string;
		capacity_point_id: string | null;
		flag_type: string;
		severity: number;
		score: number;
		sample_size: number;
		details: Record<string, unknown> | null;
		resolved: boolean;
		resolved_by: string | null;
		resolved_at: string | null;
		created_at: string;
		profiles: { id: string; first_name: string | null; last_name: string | null } | null;
		skills: { id: string; name: string } | null;
	};

	const flags = ((flagRows ?? []) as unknown as FlagRow[]).map((row) => ({
		id: row.id,
		student_id: row.student_id,
		capacity_point_id: row.capacity_point_id,
		flag_type: row.flag_type,
		severity: row.severity,
		score: row.score,
		sample_size: row.sample_size,
		details: row.details,
		resolved: row.resolved,
		resolved_by: row.resolved_by,
		resolved_at: row.resolved_at,
		created_at: row.created_at,
		student: row.profiles
			? {
					id: row.profiles.id,
					first_name: row.profiles.first_name,
					last_name: row.profiles.last_name
				}
			: { id: row.student_id, first_name: null, last_name: null },
		capacity: row.skills ? { id: row.skills.id, name: row.skills.name } : null
	}));

	// 3. Compteur total + résolus (pour le tableau de bord).
	const { count: resolvedCount } = await locals.supabase
		.from('srs_anti_fraud_flags')
		.select('id', { count: 'exact', head: true })
		.in('student_id', studentIds)
		.eq('resolved', true)
		.gte('created_at', sinceIso);

	return json({
		flags,
		total: flags.length,
		resolved_count: resolvedCount ?? 0
	});
};
