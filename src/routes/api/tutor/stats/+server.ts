import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Query parameters validation for tutor statistics endpoint
 */
const statsQuerySchema = z.object({
	classId: z.string().uuid().optional(),
	period: z.enum(['day', 'week', 'month', 'all']).default('week'),
	studentId: z.string().uuid().optional()
});

// ============================================================================
// TYPES
// ============================================================================

interface ConversationRow {
	id: string;
	student_id: string;
	message_count: number;
	max_help_level_reached: number;
	effort_score: number | null;
	topics_covered: string[] | null;
	started_at: string;
	profiles: {
		id: string;
		full_name: string;
		avatar_url: string | null;
	} | null;
}

interface StudentStats {
	studentId: string;
	studentName: string;
	avatarUrl: string | null;
	conversationCount: number;
	totalMessages: number;
	avgEffortScore: number;
	maxHelpLevel: number;
}

interface TopicStats {
	topic: string;
	count: number;
	percentage: number;
}

interface HelpLevelDistribution {
	level: number;
	count: number;
}

interface StatsResponse {
	overview: {
		totalConversations: number;
		totalMessages: number;
		activeStudents: number;
		avgEffortScore: number;
		avgHelpLevel: string;
	};
	byStudent: StudentStats[];
	topTopics: TopicStats[];
	helpLevelDistribution: HelpLevelDistribution[];
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export const GET: RequestHandler = async ({ url, locals }) => {
	// 1. Auth check (require teacher or admin)
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// 2. Parse and validate query params
	const validation = statsQuerySchema.safeParse({
		classId: url.searchParams.get('classId') || undefined,
		period: url.searchParams.get('period') || 'week',
		studentId: url.searchParams.get('studentId') || undefined
	});

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { classId, period, studentId } = validation.data;

	// 3. Calculate date range
	const now = new Date();
	let startDate: Date;

	switch (period) {
		case 'day':
			startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
			break;
		case 'week':
			startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			break;
		case 'month':
			startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			break;
		default:
			startDate = new Date(0);
	}

	// 4. Build query with RLS (teacher only sees their classes)
	let query = locals.supabase
		.from('tutor_conversations')
		.select(
			`
      id,
      student_id,
      message_count,
      max_help_level_reached,
      effort_score,
      topics_covered,
      started_at,
      profiles!student_id (
        id,
        full_name,
        avatar_url
      )
    `
		)
		.gte('started_at', startDate.toISOString());

	if (classId) {
		query = query.eq('class_id', classId);
	}

	if (studentId) {
		query = query.eq('student_id', studentId);
	}

	// For teachers (non-admins), only show conversations from their classes
	if (profile.role === 'teacher') {
		// Get teacher's class IDs first
		const { data: teacherClasses } = await locals.supabase
			.from('classes')
			.select('id')
			.eq('teacher_id', user.id);

		if (teacherClasses && teacherClasses.length > 0) {
			const classIds = teacherClasses.map((c) => c.id);
			query = query.in('class_id', classIds);
		} else {
			// Teacher has no classes, return empty results
			return json({
				overview: {
					totalConversations: 0,
					totalMessages: 0,
					activeStudents: 0,
					avgEffortScore: 0,
					avgHelpLevel: '0.0'
				},
				byStudent: [],
				topTopics: [],
				helpLevelDistribution: Array.from({ length: 8 }, (_, i) => ({ level: i, count: 0 }))
			});
		}
	}

	const { data: rawConversations, error: dbError } = await query;

	if (dbError) {
		console.error('Database error:', dbError);
		throw error(500, 'Erreur lors de la récupération des statistiques');
	}

	// Transform raw data to match ConversationRow type
	// Supabase returns profiles as array, we need single object or null
	const conversations: ConversationRow[] = (rawConversations || []).map((conv) => ({
		...conv,
		profiles: Array.isArray(conv.profiles) ? conv.profiles[0] || null : conv.profiles
	}));

	// 5. Calculate statistics
	const stats: StatsResponse = {
		overview: {
			totalConversations: conversations.length,
			totalMessages: conversations.reduce((sum, c) => sum + c.message_count, 0),
			activeStudents: new Set(conversations.map((c) => c.student_id)).size,
			avgEffortScore: conversations.length
				? Math.round(
						conversations.reduce((sum, c) => sum + (c.effort_score || 0), 0) / conversations.length
					)
				: 0,
			avgHelpLevel: conversations.length
				? (
						conversations.reduce((sum, c) => sum + c.max_help_level_reached, 0) /
						conversations.length
					).toFixed(1)
				: '0.0'
		},
		byStudent: calculateStudentStats(conversations),
		topTopics: calculateTopTopics(conversations),
		helpLevelDistribution: calculateHelpLevelDistribution(conversations)
	};

	return json(stats);
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate per-student statistics from conversations
 */
function calculateStudentStats(conversations: ConversationRow[]): StudentStats[] {
	const byStudent = new Map<string, StudentStats>();

	for (const conv of conversations || []) {
		const existing = byStudent.get(conv.student_id) || {
			studentId: conv.student_id,
			studentName: conv.profiles?.full_name || 'Élève',
			avatarUrl: conv.profiles?.avatar_url || null,
			conversationCount: 0,
			totalMessages: 0,
			avgEffortScore: 0,
			maxHelpLevel: 0,
			effortScores: []
		};

		existing.conversationCount++;
		existing.totalMessages += conv.message_count;
		existing.maxHelpLevel = Math.max(existing.maxHelpLevel, conv.max_help_level_reached);
		if (conv.effort_score !== null) {
			(existing as unknown as { effortScores: number[] }).effortScores.push(conv.effort_score);
		}

		byStudent.set(conv.student_id, existing);
	}

	return Array.from(byStudent.values()).map((s) => {
		const effortScores = (s as unknown as { effortScores: number[] }).effortScores;
		return {
			studentId: s.studentId,
			studentName: s.studentName,
			avatarUrl: s.avatarUrl,
			conversationCount: s.conversationCount,
			totalMessages: s.totalMessages,
			avgEffortScore: effortScores.length
				? Math.round(effortScores.reduce((a, b) => a + b, 0) / effortScores.length)
				: 0,
			maxHelpLevel: s.maxHelpLevel
		};
	});
}

/**
 * Calculate top topics from conversations
 */
function calculateTopTopics(conversations: ConversationRow[]): TopicStats[] {
	const topicCounts = new Map<string, number>();

	for (const conv of conversations || []) {
		for (const topic of conv.topics_covered || []) {
			topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
		}
	}

	const total = Array.from(topicCounts.values()).reduce((a, b) => a + b, 0) || 1;

	return Array.from(topicCounts.entries())
		.map(([topic, count]) => ({
			topic,
			count,
			percentage: Math.round((count / total) * 100)
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);
}

/**
 * Calculate help level distribution from conversations
 */
function calculateHelpLevelDistribution(conversations: ConversationRow[]): HelpLevelDistribution[] {
	const levels = Array.from({ length: 8 }, () => 0); // 0-7

	for (const conv of conversations || []) {
		if (conv.max_help_level_reached >= 0 && conv.max_help_level_reached <= 7) {
			levels[conv.max_help_level_reached]++;
		}
	}

	return levels.map((count, level) => ({ level, count }));
}
