/**
 * Welcome Email Page - Server Load
 * =================================
 *
 * Loads student information and checks prerequisites for sending welcome email.
 *
 * SECURITY:
 * - Requires teacher role
 * - Validates student_id as UUID
 * - Verifies teacher teaches the student
 *
 * DATA LOADED:
 * - Student profile (id, firstname, lastname, email)
 * - Gmail access status (google_integrations with gmail.send scope)
 * - Previous email sent status (welcome_emails_sent table)
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { verifyTeacherStudent } from '$lib/server/middleware/student-access';

// Validate student_id query parameter
const querySchema = z.object({
	student_id: z.string().uuid('ID eleve invalide')
});

export const load: PageServerLoad = async ({ url, locals }) => {
	// Require teacher authentication
	const { user } = await requireRole(locals, 'teacher');
	const supabase = locals.supabase;

	// Validate query parameters
	const rawParams = {
		student_id: url.searchParams.get('student_id')
	};

	const validation = querySchema.safeParse(rawParams);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { student_id } = validation.data;

	// Verify teacher-student relationship
	const hasAccess = await verifyTeacherStudent(user.id, student_id, supabase);
	if (!hasAccess) {
		throw error(403, "Vous ne pouvez envoyer des emails qu'a vos propres eleves");
	}

	// Fetch student profile
	const { data: student, error: studentError } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, email')
		.eq('id', student_id)
		.single();

	if (studentError || !student) {
		console.error('[Welcome Email] Error fetching student:', studentError);
		throw error(404, 'Eleve non trouve');
	}

	// Check if teacher has Gmail integration with gmail.send scope
	const { data: googleIntegration, error: integrationError } = await supabase
		.from('google_integrations')
		.select('id, scopes')
		.eq('teacher_id', user.id)
		.single();

	if (integrationError && integrationError.code !== 'PGRST116') {
		// PGRST116 = no rows returned, which is expected if no integration
		console.error('[Welcome Email] Error fetching Google integration:', integrationError);
	}

	// Check if gmail.send scope is present
	const hasGmailAccess =
		googleIntegration?.scopes?.includes('https://www.googleapis.com/auth/gmail.send') ?? false;

	// Check if welcome email was already sent
	let previousEmail: { sent_at: string } | null = null;

	const { data: emailRecord } = await supabase
		.from('welcome_emails_sent')
		.select('sent_at')
		.eq('student_id', student_id)
		.order('sent_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (emailRecord) {
		previousEmail = emailRecord;
	}

	return {
		student: {
			id: student.id,
			firstname: student.firstname,
			lastname: student.lastname,
			email: student.email
		},
		hasGmailAccess,
		previousEmail
	};
};
