import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Get user profile
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role, school_id')
		.eq('id', userId)
		.single();

	if (profileError || !profile) {
		throw error(404, 'Profil non trouvé');
	}

	if (profile.role !== 'teacher') {
		throw error(403, 'Accès réservé aux enseignants');
	}

	// Get query parameters
	const selectedClassId = url.searchParams.get('class_id');
	const period = url.searchParams.get('period') || 'week';

	// Get teacher's classes
	const { data: teacherClasses, error: classesError } = await supabase
		.from('classes')
		.select('id, name')
		.eq('teacher_id', userId)
		.order('name');

	if (classesError) {
		console.error('Error fetching teacher classes:', classesError);
		throw error(500, 'Erreur lors de la récupération des classes');
	}

	// Get marketplace configuration for the school
	const { data: marketplaceConfig, error: configError } = await supabase
		.from('marketplace_config')
		.select('*')
		.eq('school_id', profile.school_id)
		.single();

	if (configError && configError.code !== 'PGRST116') {
		// PGRST116 means no rows returned, which is fine
		console.error('Error fetching marketplace config:', configError);
	}

	// Get basic stats for initial display
	const statsUrl = new URL('/api/marketplace/admin/stats', url.origin);
	if (selectedClassId) statsUrl.searchParams.set('class_id', selectedClassId);
	statsUrl.searchParams.set('period', period);

	// Get the session to pass auth headers
	const {
		data: { session }
	} = await supabase.auth.getSession();

	const statsResponse = await fetch(statsUrl, {
		headers: {
			cookie: session
				? `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`
				: ''
		}
	});

	let stats = null;
	if (statsResponse.ok) {
		const data = await statsResponse.json();
		stats = data.stats;
	}

	// Get recent activity
	const activityUrl = new URL('/api/marketplace/admin/activity', url.origin);
	if (selectedClassId) activityUrl.searchParams.set('class_id', selectedClassId);
	activityUrl.searchParams.set('limit', '10');

	const activityResponse = await fetch(activityUrl, {
		headers: {
			cookie: session
				? `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`
				: ''
		}
	});

	let recentActivity = [];
	if (activityResponse.ok) {
		const data = await activityResponse.json();
		recentActivity = data.activities;
	}

	// Get student count for selected class or all classes
	let studentCount = 0;
	if (selectedClassId) {
		const { count } = await supabase
			.from('class_members')
			.select('*', { count: 'exact', head: true })
			.eq('class_id', selectedClassId);
		studentCount = count || 0;
	} else if (teacherClasses && teacherClasses.length > 0) {
		const classIds = teacherClasses.map((c: { id: string }) => c.id);
		const { count } = await supabase
			.from('class_members')
			.select('*', { count: 'exact', head: true })
			.in('class_id', classIds);
		studentCount = count || 0;
	}

	return {
		teacherClasses: teacherClasses || [],
		selectedClassId,
		period,
		marketplaceConfig: marketplaceConfig || {
			is_enabled: false,
			max_listings_per_student: 5,
			max_trades_per_day: 10
		},
		stats,
		recentActivity,
		studentCount
	};
};
