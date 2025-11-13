/**
 * API endpoint for school configuration (timezone and week_config)
 * Phase 5: Daily summaries timezone and week configuration
 *
 * PUT /api/admin/schools/[schoolId]/config
 * - Admin only
 * - Updates school timezone and week_config in timetable JSONB
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateSchoolConfigSchema } from '$lib/server/validation/school-config';
import { DEFAULT_TIMEZONE } from '$lib/utils/timezones';
import { DEFAULT_WEEK_CONFIG } from '$lib/utils/week-config';
import type { SchoolTimetable } from '$lib/types/database';

/**
 * Update school configuration (timezone and week_config)
 * Admin only
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const { user, profile, supabase } = locals;

	// Authentication check
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Authorization check - admin only
	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	const { schoolId } = params;

	// Validate schoolId is UUID
	if (
		!schoolId ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId)
	) {
		throw error(400, 'Invalid school ID format');
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = updateSchoolConfigSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { timezone, week_config } = validation.data;

	// Fetch current school to verify existence and get current timetable
	const { data: school, error: fetchError } = await supabase
		.from('schools')
		.select('id, name, timezone, timetable')
		.eq('id', schoolId)
		.single();

	if (fetchError) {
		console.error('[PUT /api/admin/schools/[schoolId]/config] Fetch error:', fetchError);
		throw error(404, 'School not found');
	}

	if (!school) {
		throw error(404, 'School not found');
	}

	// Prepare updated timetable
	// Merge with existing timetable data (preserve periods if they exist)
	const currentTimetable = (school.timetable as SchoolTimetable | null) || {
		periods: []
	};

	const updatedTimetable: SchoolTimetable = {
		...currentTimetable,
		week_config
	};

	// Update school with new timezone and timetable
	const { data: updatedSchool, error: updateError } = await supabase
		.from('schools')
		.update({
			timezone,
			timetable: updatedTimetable
		})
		.eq('id', schoolId)
		.select('id, name, timezone, timetable')
		.single();

	if (updateError) {
		console.error('[PUT /api/admin/schools/[schoolId]/config] Update error:', updateError);
		throw error(500, 'Failed to update school configuration');
	}

	if (!updatedSchool) {
		throw error(500, 'Failed to update school configuration');
	}

	// Return success response
	return json({
		success: true,
		message: 'Configuration mise à jour avec succès',
		school: {
			id: updatedSchool.id,
			name: updatedSchool.name,
			timezone: updatedSchool.timezone || DEFAULT_TIMEZONE,
			timetable: (updatedSchool.timetable as SchoolTimetable | null) || {
				periods: [],
				week_config: DEFAULT_WEEK_CONFIG
			}
		}
	});
};

/**
 * Get school configuration (timezone and week_config)
 * Admin only
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { user, profile, supabase } = locals;

	// Authentication check
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Authorization check - admin only
	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	const { schoolId } = params;

	// Validate schoolId is UUID
	if (
		!schoolId ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId)
	) {
		throw error(400, 'Invalid school ID format');
	}

	// Fetch school
	const { data: school, error: fetchError } = await supabase
		.from('schools')
		.select('id, name, timezone, timetable')
		.eq('id', schoolId)
		.single();

	if (fetchError) {
		console.error('[GET /api/admin/schools/[schoolId]/config] Fetch error:', fetchError);
		throw error(404, 'School not found');
	}

	if (!school) {
		throw error(404, 'School not found');
	}

	const timetable = (school.timetable as SchoolTimetable | null) || {
		periods: [],
		week_config: DEFAULT_WEEK_CONFIG
	};

	return json({
		success: true,
		school: {
			id: school.id,
			name: school.name,
			timezone: school.timezone || DEFAULT_TIMEZONE,
			timetable
		}
	});
};
