import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { validateTimetable, type SchoolTimetable } from '$lib/utils/timetable';
import { validateUuidParam } from '$lib/server/validation/params';
import {
	createSchoolYearSchema,
	updateSchoolYearSchema,
	deleteSchoolYearSchema,
	setActiveYearSchema,
	createAcademicPeriodSchema,
	updateAcademicPeriodSchema,
	deleteAcademicPeriodSchema,
	createSchoolHolidaySchema,
	updateSchoolHolidaySchema,
	deleteSchoolHolidaySchema,
	duplicateSchoolYearSchema
} from '$lib/server/validation/academic';

/**
 * Load school data with academic years, periods, holidays, and timetable
 */
export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw redirect(303, '/login');
	}

	const schoolId = validateUuidParam(params.schoolId, 'schoolId');

	// Get user profile to check if admin
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Only admins can manage school organisation');
	}

	// Fetch school data
	const { data: school, error: schoolError } = await supabase
		.from('schools')
		.select('*')
		.eq('id', schoolId)
		.single();

	if (schoolError || !school) {
		throw error(404, 'School not found');
	}

	// Fetch all school years for this school
	const { data: schoolYears, error: yearsError } = await supabase
		.from('school_years')
		.select('*')
		.eq('school_id', schoolId)
		.order('start_date', { ascending: false });

	if (yearsError) {
		console.error('Error fetching school years:', yearsError);
	}

	// Find active year
	const activeYear = schoolYears?.find((y) => y.is_active);

	// Fetch periods and holidays for active year
	let academicPeriods: unknown[] = [];
	let schoolHolidays: unknown[] = [];

	if (activeYear) {
		const { data: periods, error: periodsError } = await supabase
			.from('academic_periods')
			.select('*')
			.eq('school_year_id', activeYear.id)
			.order('period_order');

		if (periodsError) {
			console.error('Error fetching academic periods:', periodsError);
		} else {
			academicPeriods = periods || [];
		}

		const { data: holidays, error: holidaysError } = await supabase
			.from('school_holidays')
			.select('*')
			.eq('school_year_id', activeYear.id)
			.order('start_date');

		if (holidaysError) {
			console.error('Error fetching school holidays:', holidaysError);
		} else {
			schoolHolidays = holidays || [];
		}
	}

	return {
		school,
		schoolYears: schoolYears || [],
		activeYear,
		academicPeriods,
		schoolHolidays
	};
};

/**
 * Form actions for managing academic organisation
 */
export const actions: Actions = {
	// ========================================
	// School Year Actions
	// ========================================

	/**
	 * Create a new school year
	 */
	createYear: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { error: 'Non autorisé' });
		}

		// Verify admin role
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'admin') {
			return fail(403, { error: 'Seuls les admins peuvent créer des années scolaires' });
		}

		const formData = await request.formData();
		const validation = createSchoolYearSchema.safeParse({
			school_id: params.schoolId,
			name: formData.get('name'),
			start_date: formData.get('start_date'),
			end_date: formData.get('end_date'),
			is_active: formData.get('is_active') === 'true'
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				errors: validation.error.flatten().fieldErrors
			});
		}

		const { error: dbError } = await supabase.from('school_years').insert(validation.data);

		if (dbError) {
			console.error('Error creating school year:', dbError);
			return fail(500, { error: "Erreur lors de la création de l'année scolaire" });
		}

		return { success: true, message: 'Année scolaire créée avec succès' };
	},

	/**
	 * Update an existing school year
	 */
	updateYear: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { error: 'Non autorisé' });
		}

		// Verify admin role
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'admin') {
			return fail(403, { error: 'Seuls les admins peuvent modifier des années scolaires' });
		}

		const formData = await request.formData();
		const validation = updateSchoolYearSchema.safeParse({
			id: formData.get('id'),
			name: formData.get('name'),
			start_date: formData.get('start_date'),
			end_date: formData.get('end_date'),
			is_active: formData.get('is_active') === 'true'
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				errors: validation.error.flatten().fieldErrors
			});
		}

		const { id, ...updates } = validation.data;
		// Explicitly type updates to avoid spread type error
		const updateData: {
			name?: string;
			start_date?: string;
			end_date?: string;
			is_active?: boolean;
		} = updates;
		const { error: dbError } = await supabase.from('school_years').update(updateData).eq('id', id);

		if (dbError) {
			console.error('Error updating school year:', dbError);
			return fail(500, { error: "Erreur lors de la mise à jour de l'année scolaire" });
		}

		return { success: true, message: 'Année scolaire mise à jour avec succès' };
	},

	/**
	 * Delete a school year
	 */
	deleteYear: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { error: 'Non autorisé' });
		}

		// Verify admin role
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'admin') {
			return fail(403, { error: 'Seuls les admins peuvent supprimer des années scolaires' });
		}

		const formData = await request.formData();
		const validation = deleteSchoolYearSchema.safeParse({
			id: formData.get('id')
		});

		if (!validation.success) {
			return fail(400, { error: 'ID invalide' });
		}

		const { error: dbError } = await supabase
			.from('school_years')
			.delete()
			.eq('id', validation.data.id);

		if (dbError) {
			console.error('Error deleting school year:', dbError);
			return fail(500, { error: "Erreur lors de la suppression de l'année scolaire" });
		}

		return { success: true, message: 'Année scolaire supprimée avec succès' };
	},

	/**
	 * Set active school year (deactivates all others for this school)
	 */
	setActiveYear: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { error: 'Non autorisé' });
		}

		// Verify admin role
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'admin') {
			return fail(403, { error: "Seuls les admins peuvent définir l'année active" });
		}

		const formData = await request.formData();
		const validation = setActiveYearSchema.safeParse({
			id: formData.get('id'),
			school_id: params.schoolId
		});

		if (!validation.success) {
			return fail(400, { error: 'Données invalides' });
		}

		// First, deactivate all years for this school
		const { error: deactivateError } = await supabase
			.from('school_years')
			.update({ is_active: false })
			.eq('school_id', validation.data.school_id);

		if (deactivateError) {
			console.error('Error deactivating years:', deactivateError);
			return fail(500, { error: 'Erreur lors de la désactivation des années' });
		}

		// Then activate the selected year
		const { error: activateError } = await supabase
			.from('school_years')
			.update({ is_active: true })
			.eq('id', validation.data.id);

		if (activateError) {
			console.error('Error activating year:', activateError);
			return fail(500, { error: "Erreur lors de l'activation de l'année" });
		}

		return { success: true, message: 'Année scolaire active définie avec succès' };
	},

	// ========================================
	// Academic Period Actions
	// ========================================

	/**
	 * Create a new academic period
	 */
	createPeriod: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { error: 'Non autorisé' });
		}

		// Verify admin role
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'admin') {
			return fail(403, { error: 'Seuls les admins peuvent créer des périodes académiques' });
		}

		const formData = await request.formData();
		const validation = createAcademicPeriodSchema.safeParse({
			school_year_id: formData.get('school_year_id'),
			type: formData.get('type'),
			name: formData.get('name'),
			start_date: formData.get('start_date'),
			end_date: formData.get('end_date'),
			period_order: Number(formData.get('period_order')),
			color: formData.get('color') || '#3b82f6'
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				errors: validation.error.flatten().fieldErrors
			});
		}

		const { error: dbError } = await supabase.from('academic_periods').insert(validation.data);

		if (dbError) {
			console.error('Error creating academic period:', dbError);
			return fail(500, { error: 'Erreur lors de la création de la période académique' });
		}

		return { success: true, message: 'Période académique créée avec succès' };
	},

	/**
	 * Update an existing academic period
	 */
	updatePeriod: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { error: 'Non autorisé' });
		}

		// Verify admin role
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'admin') {
			return fail(403, { error: 'Seuls les admins peuvent modifier des périodes académiques' });
		}

		const formData = await request.formData();
		const periodOrderRaw = formData.get('period_order');
		const validation = updateAcademicPeriodSchema.safeParse({
			id: formData.get('id'),
			type: formData.get('type'),
			name: formData.get('name'),
			start_date: formData.get('start_date'),
			end_date: formData.get('end_date'),
			period_order: periodOrderRaw ? Number(periodOrderRaw) : undefined,
			color: formData.get('color')
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				errors: validation.error.flatten().fieldErrors
			});
		}

		const { id, ...updates } = validation.data;
		// Explicitly type updates to avoid spread type error
		const updateData: {
			type?: string;
			name?: string;
			start_date?: string;
			end_date?: string;
			period_order?: number;
			color?: string | null;
		} = updates;
		const { error: dbError } = await supabase
			.from('academic_periods')
			.update(updateData)
			.eq('id', id);

		if (dbError) {
			console.error('Error updating academic period:', dbError);
			return fail(500, { error: 'Erreur lors de la mise à jour de la période académique' });
		}

		return { success: true, message: 'Période académique mise à jour avec succès' };
	},

	/**
	 * Delete an academic period
	 */
	deletePeriod: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { error: 'Non autorisé' });
		}

		// Verify admin role
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'admin') {
			return fail(403, { error: 'Seuls les admins peuvent supprimer des périodes académiques' });
		}

		const formData = await request.formData();
		const validation = deleteAcademicPeriodSchema.safeParse({
			id: formData.get('id')
		});

		if (!validation.success) {
			return fail(400, { error: 'ID invalide' });
		}

		const { error: dbError } = await supabase
			.from('academic_periods')
			.delete()
			.eq('id', validation.data.id);

		if (dbError) {
			console.error('Error deleting academic period:', dbError);
			return fail(500, { error: 'Erreur lors de la suppression de la période académique' });
		}

		return { success: true, message: 'Période académique supprimée avec succès' };
	},

	// ========================================
	// School Holiday Actions
	// ========================================

	/**
	 * Create a new school holiday
	 */
	createHoliday: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { error: 'Non autorisé' });
		}

		// Verify admin role
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'admin') {
			return fail(403, { error: 'Seuls les admins peuvent créer des vacances scolaires' });
		}

		const formData = await request.formData();
		const validation = createSchoolHolidaySchema.safeParse({
			school_year_id: formData.get('school_year_id'),
			name: formData.get('name'),
			start_date: formData.get('start_date'),
			end_date: formData.get('end_date')
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				errors: validation.error.flatten().fieldErrors
			});
		}

		const { error: dbError } = await supabase.from('school_holidays').insert(validation.data);

		if (dbError) {
			console.error('Error creating school holiday:', dbError);
			return fail(500, { error: 'Erreur lors de la création des vacances scolaires' });
		}

		return { success: true, message: 'Vacances scolaires créées avec succès' };
	},

	/**
	 * Update an existing school holiday
	 */
	updateHoliday: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { error: 'Non autorisé' });
		}

		// Verify admin role
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'admin') {
			return fail(403, { error: 'Seuls les admins peuvent modifier des vacances scolaires' });
		}

		const formData = await request.formData();
		const validation = updateSchoolHolidaySchema.safeParse({
			id: formData.get('id'),
			name: formData.get('name'),
			start_date: formData.get('start_date'),
			end_date: formData.get('end_date')
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				errors: validation.error.flatten().fieldErrors
			});
		}

		const { id, ...updates } = validation.data;
		// Explicitly type updates to avoid spread type error
		const updateData: {
			name?: string;
			start_date?: string;
			end_date?: string;
		} = updates;
		const { error: dbError } = await supabase
			.from('school_holidays')
			.update(updateData)
			.eq('id', id);

		if (dbError) {
			console.error('Error updating school holiday:', dbError);
			return fail(500, { error: 'Erreur lors de la mise à jour des vacances scolaires' });
		}

		return { success: true, message: 'Vacances scolaires mises à jour avec succès' };
	},

	/**
	 * Delete a school holiday
	 */
	deleteHoliday: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { error: 'Non autorisé' });
		}

		// Verify admin role
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'admin') {
			return fail(403, { error: 'Seuls les admins peuvent supprimer des vacances scolaires' });
		}

		const formData = await request.formData();
		const validation = deleteSchoolHolidaySchema.safeParse({
			id: formData.get('id')
		});

		if (!validation.success) {
			return fail(400, { error: 'ID invalide' });
		}

		const { error: dbError } = await supabase
			.from('school_holidays')
			.delete()
			.eq('id', validation.data.id);

		if (dbError) {
			console.error('Error deleting school holiday:', dbError);
			return fail(500, { error: 'Erreur lors de la suppression des vacances scolaires' });
		}

		return { success: true, message: 'Vacances scolaires supprimées avec succès' };
	},

	// ========================================
	// Year Duplication Action
	// ========================================

	/**
	 * Duplicate a school year with its periods and holidays
	 */
	duplicateYear: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { error: 'Non autorisé' });
		}

		// Verify admin role
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'admin') {
			return fail(403, { error: 'Seuls les admins peuvent dupliquer des années scolaires' });
		}

		const formData = await request.formData();
		const validation = duplicateSchoolYearSchema.safeParse({
			source_year_id: formData.get('source_year_id'),
			target_year_name: formData.get('target_year_name'),
			include_periods: formData.get('include_periods') === 'true',
			include_holidays: formData.get('include_holidays') === 'true',
			date_offset_days: Number(formData.get('date_offset_days')) || 365
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				errors: validation.error.flatten().fieldErrors
			});
		}

		// Fetch source year
		const { data: sourceYear, error: sourceError } = await supabase
			.from('school_years')
			.select('*')
			.eq('id', validation.data.source_year_id)
			.single();

		if (sourceError || !sourceYear) {
			return fail(404, { error: 'Année scolaire source non trouvée' });
		}

		// Calculate new dates
		const dateOffset = validation.data.date_offset_days * 24 * 60 * 60 * 1000; // Convert days to milliseconds
		const newStartDate = new Date(new Date(sourceYear.start_date).getTime() + dateOffset)
			.toISOString()
			.split('T')[0];
		const newEndDate = new Date(new Date(sourceYear.end_date).getTime() + dateOffset)
			.toISOString()
			.split('T')[0];

		// Create new school year
		const { data: newYear, error: yearError } = await supabase
			.from('school_years')
			.insert({
				school_id: sourceYear.school_id,
				name: validation.data.target_year_name,
				start_date: newStartDate,
				end_date: newEndDate,
				is_active: false,
				metadata: sourceYear.metadata || {}
			})
			.select()
			.single();

		if (yearError || !newYear) {
			console.error('Error creating duplicate year:', yearError);
			return fail(500, { error: "Erreur lors de la création de l'année dupliquée" });
		}

		// Duplicate periods if requested
		if (validation.data.include_periods) {
			const { data: periods, error: periodsError } = await supabase
				.from('academic_periods')
				.select('*')
				.eq('school_year_id', validation.data.source_year_id)
				.order('period_order');

			if (!periodsError && periods && periods.length > 0) {
				const newPeriods = periods.map((period) => ({
					school_year_id: newYear.id,
					type: period.type,
					name: period.name,
					start_date: new Date(new Date(period.start_date).getTime() + dateOffset)
						.toISOString()
						.split('T')[0],
					end_date: new Date(new Date(period.end_date).getTime() + dateOffset)
						.toISOString()
						.split('T')[0],
					period_order: period.period_order,
					color: period.color,
					metadata: period.metadata || {}
				}));

				const { error: insertPeriodsError } = await supabase
					.from('academic_periods')
					.insert(newPeriods);

				if (insertPeriodsError) {
					console.error('Error duplicating periods:', insertPeriodsError);
				}
			}
		}

		// Duplicate holidays if requested
		if (validation.data.include_holidays) {
			const { data: holidays, error: holidaysError } = await supabase
				.from('school_holidays')
				.select('*')
				.eq('school_year_id', validation.data.source_year_id)
				.order('start_date');

			if (!holidaysError && holidays && holidays.length > 0) {
				const newHolidays = holidays.map((holiday) => ({
					school_year_id: newYear.id,
					name: holiday.name,
					start_date: new Date(new Date(holiday.start_date).getTime() + dateOffset)
						.toISOString()
						.split('T')[0],
					end_date: new Date(new Date(holiday.end_date).getTime() + dateOffset)
						.toISOString()
						.split('T')[0]
				}));

				const { error: insertHolidaysError } = await supabase
					.from('school_holidays')
					.insert(newHolidays);

				if (insertHolidaysError) {
					console.error('Error duplicating holidays:', insertHolidaysError);
				}
			}
		}

		return { success: true, message: 'Année scolaire dupliquée avec succès' };
	},

	// ========================================
	// Timetable Action (Legacy - kept for backwards compatibility)
	// ========================================

	/**
	 * Update school timetable
	 * Validates periods and saves to database
	 */
	updateTimetable: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Not authenticated' });
		}

		// Verify admin role
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'admin') {
			return fail(403, { message: 'Only admins can update timetables' });
		}

		const formData = await request.formData();
		const timetableJson = formData.get('timetable') as string;

		if (!timetableJson) {
			return fail(400, { message: 'Timetable data is required' });
		}

		let timetable: SchoolTimetable;
		try {
			timetable = JSON.parse(timetableJson);
		} catch {
			return fail(400, { message: 'Invalid timetable JSON' });
		}

		// Validate timetable
		const validation = validateTimetable(timetable.periods ?? []);
		if (!validation.valid) {
			return fail(400, {
				message: 'Timetable validation failed',
				errors: validation.errors
			});
		}

		// Update school timetable
		const { error: updateError } = await supabase
			.from('schools')
			.update({ timetable })
			.eq('id', params.schoolId);

		if (updateError) {
			console.error('Error updating timetable:', updateError);
			return fail(500, { message: 'Failed to update timetable' });
		}

		return { success: true };
	}
};
