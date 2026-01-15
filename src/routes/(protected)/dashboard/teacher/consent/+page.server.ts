/**
 * Teacher Consent Management Page - Server-Side Logic
 * =====================================================
 *
 * Handles data loading and actions for managing parental consent.
 * RGPD Article 8 compliance for minors under 15.
 *
 * FEATURES:
 * - Load students requiring consent (grouped by class)
 * - Show consent status (pending, granted, expired, in grace period)
 * - Send/resend consent emails
 * - Update parent email addresses
 */

import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { verifyTeacherStudent } from '$lib/server/middleware/student-access';
import { GRADES_REQUIRING_CONSENT } from '$lib/utils/consent';

/**
 * Student with consent information
 */
export interface StudentConsentInfo {
	id: string;
	firstname: string | null;
	lastname: string | null;
	email: string | null;
	avatar_url: string | null;
	grade: string | null;
	consent_required: boolean;
	consent_granted_at: string | null;
	consent_grace_period_ends: string | null;
	parent_email: string | null;
	consent_status: 'granted' | 'pending' | 'expired' | 'grace_period' | 'not_required';
	email_count: number;
	last_email_sent_at: string | null;
}

/**
 * Class with students requiring consent
 */
export interface ClassWithConsentStudents {
	id: string;
	name: string;
	students: StudentConsentInfo[];
}

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await requireRole(locals, 'teacher');
	const supabase = locals.supabase;

	// Get all classes for this teacher
	const { data: classes, error: classError } = await supabase
		.from('classes')
		.select('id, name')
		.eq('teacher_id', user.id)
		.eq('is_active', true)
		.order('name');

	if (classError) {
		console.error('[Consent Page] Error fetching classes:', classError);
		throw error(500, 'Erreur lors du chargement des classes');
	}

	// Get all students in these classes with consent info
	const classIds = classes?.map((c) => c.id) || [];

	if (classIds.length === 0) {
		return {
			classes: [] as ClassWithConsentStudents[],
			hasGmailAccess: false,
			stats: { total: 0, granted: 0, pending: 0, graceCount: 0 }
		};
	}

	// Fetch students with consent information
	const { data: memberships, error: memberError } = await supabase
		.from('class_members')
		.select(
			`
			class_id,
			student:profiles!class_members_student_id_fkey(
				id,
				firstname,
				lastname,
				email,
				avatar_url,
				grade,
				consent_required,
				consent_granted_at,
				consent_grace_period_ends
			)
		`
		)
		.in('class_id', classIds);

	if (memberError) {
		console.error('[Consent Page] Error fetching students:', memberError);
		throw error(500, 'Erreur lors du chargement des élèves');
	}

	// Fetch parental consents for these students
	const studentIds =
		memberships?.map((m) => (m.student as { id: string })?.id).filter((id): id is string => !!id) ||
		[];

	const { data: consents } = await supabase
		.from('parental_consents')
		.select('student_id, parent_email, status, email_count, last_email_sent_at')
		.in('student_id', studentIds)
		.order('created_at', { ascending: false });

	// Create a map of student_id to latest consent
	const consentMap = new Map<
		string,
		{
			parent_email: string | null;
			status: string;
			email_count: number;
			last_email_sent_at: string | null;
		}
	>();
	for (const consent of consents || []) {
		// Only keep the first (latest) consent per student
		if (!consentMap.has(consent.student_id)) {
			consentMap.set(consent.student_id, {
				parent_email: consent.parent_email,
				status: consent.status,
				email_count: consent.email_count,
				last_email_sent_at: consent.last_email_sent_at
			});
		}
	}

	// Build class-student structure with consent status
	const classStudentMap = new Map<string, StudentConsentInfo[]>();

	for (const membership of memberships || []) {
		const student = membership.student as {
			id: string;
			firstname: string | null;
			lastname: string | null;
			email: string | null;
			avatar_url: string | null;
			grade: string | null;
			consent_required: boolean;
			consent_granted_at: string | null;
			consent_grace_period_ends: string | null;
		} | null;

		if (!student) continue;

		// Only include students who need consent (grades 6-2)
		const needsConsent =
			student.grade && (GRADES_REQUIRING_CONSENT as readonly string[]).includes(student.grade);

		if (!needsConsent) continue;

		const consent = consentMap.get(student.id);
		const now = new Date();

		// Determine consent status
		let consentStatus: StudentConsentInfo['consent_status'] = 'not_required';

		if (!student.consent_required) {
			consentStatus = 'not_required';
		} else if (student.consent_granted_at) {
			consentStatus = 'granted';
		} else if (
			student.consent_grace_period_ends &&
			new Date(student.consent_grace_period_ends) > now
		) {
			consentStatus = 'grace_period';
		} else if (consent?.status === 'pending') {
			consentStatus = 'pending';
		} else if (consent?.status === 'expired') {
			consentStatus = 'expired';
		} else {
			consentStatus = 'pending';
		}

		const studentInfo: StudentConsentInfo = {
			id: student.id,
			firstname: student.firstname,
			lastname: student.lastname,
			email: student.email,
			avatar_url: student.avatar_url,
			grade: student.grade,
			consent_required: student.consent_required,
			consent_granted_at: student.consent_granted_at,
			consent_grace_period_ends: student.consent_grace_period_ends,
			parent_email: consent?.parent_email || null,
			consent_status: consentStatus,
			email_count: consent?.email_count || 0,
			last_email_sent_at: consent?.last_email_sent_at || null
		};

		const classId = membership.class_id;
		if (!classStudentMap.has(classId)) {
			classStudentMap.set(classId, []);
		}
		classStudentMap.get(classId)!.push(studentInfo);
	}

	// Build final structure
	const classesWithStudents: ClassWithConsentStudents[] = (classes || [])
		.filter((c) => classStudentMap.has(c.id))
		.map((c) => ({
			id: c.id,
			name: c.name,
			students: classStudentMap.get(c.id) || []
		}));

	// Check Gmail access
	const { data: integration } = await supabase
		.from('google_integrations')
		.select('scopes')
		.eq('teacher_id', user.id)
		.single();

	const hasGmailAccess = integration?.scopes?.includes(
		'https://www.googleapis.com/auth/gmail.send'
	);

	// Calculate stats
	const allStudents = classesWithStudents.flatMap((c) => c.students);
	const stats = {
		total: allStudents.length,
		granted: allStudents.filter((s) => s.consent_status === 'granted').length,
		pending: allStudents.filter(
			(s) => s.consent_status === 'pending' || s.consent_status === 'expired'
		).length,
		graceCount: allStudents.filter((s) => s.consent_status === 'grace_period').length
	};

	return {
		classes: classesWithStudents,
		hasGmailAccess: !!hasGmailAccess,
		stats
	};
};

// Schema for updating parent email
const updateParentEmailSchema = z.object({
	studentId: z.string().uuid(),
	parentEmail: z.string().email('Email parent invalide').toLowerCase().trim()
});

export const actions: Actions = {
	updateParentEmail: async ({ request, locals }) => {
		const { user } = await requireRole(locals, 'teacher');
		const supabase = locals.supabase;

		const formData = await request.formData();
		const validation = updateParentEmailSchema.safeParse({
			studentId: formData.get('studentId'),
			parentEmail: formData.get('parentEmail')
		});

		if (!validation.success) {
			return fail(400, { error: validation.error.issues[0].message });
		}

		const { studentId, parentEmail } = validation.data;

		// Verify teacher has access to this student
		const hasAccess = await verifyTeacherStudent(user.id, studentId, supabase);
		if (!hasAccess) {
			return fail(403, { error: 'Vous ne pouvez modifier que vos propres élèves' });
		}

		// Check if consent record exists, create or update
		const { data: existing } = await supabase
			.from('parental_consents')
			.select('id')
			.eq('student_id', studentId)
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		if (existing) {
			const { error: updateError } = await supabase
				.from('parental_consents')
				.update({ parent_email: parentEmail })
				.eq('id', existing.id);

			if (updateError) {
				console.error('[Consent Page] Update error:', updateError);
				return fail(500, { error: 'Erreur lors de la mise à jour' });
			}
		} else {
			const { error: insertError } = await supabase.from('parental_consents').insert({
				student_id: studentId,
				parent_email: parentEmail,
				status: 'pending',
				email_count: 0
			});

			if (insertError) {
				console.error('[Consent Page] Insert error:', insertError);
				return fail(500, { error: 'Erreur lors de la création' });
			}
		}

		return { success: true };
	}
};
