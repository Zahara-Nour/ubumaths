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
import { AGE_QUESTION_GRADE } from '$lib/utils/age-declaration';
import { requireRole, requireRoles } from '$lib/server/middleware/auth';
import { verifyTeacherStudent } from '$lib/server/middleware/student-access';
import { requiresParentalConsent } from '$lib/utils/consent';
import { isBrevoConfigured } from '$lib/server/email/brevo';

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
	/** Réponse à la question d'âge en 2nde ('15_plus' | 'under_15' | null). */
	age_declaration: string | null;
	age_declared_at: string | null;
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
	// Auth guard (throws if not a teacher). Queries below are scoped by RLS, so the
	// user id isn't needed directly here.
	await requireRole(locals, 'teacher');
	const supabase = locals.supabase;

	// Get all classes for this teacher
	const { data: classes, error: classError } = await supabase
		.from('classes')
		.select('id, name')
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
			emailServiceReady: isBrevoConfigured(),
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
				consent_grace_period_ends,
				age_declaration,
				age_declared_at
			)
		`
		)
		.in('class_id', classIds);

	if (memberError) {
		console.error('[Consent Page] Error fetching students:', memberError);
		throw error(500, 'Erreur lors du chargement des élèves');
	}

	// Fetch parental consents for these students
	// m.student may be an array or object depending on Supabase typing
	const studentIds =
		memberships
			?.map((m) => {
				const student = Array.isArray(m.student) ? m.student[0] : m.student;
				return (student as { id: string } | null)?.id;
			})
			.filter((id): id is string => !!id) || [];

	const { data: consents, error: consentsError } = await supabase
		.from('parental_consents')
		.select('student_id, parent_email, status, email_count, last_email_sent_at')
		.in('student_id', studentIds)
		.order('created_at', { ascending: false });

	if (consentsError) {
		console.error('Lecture impossible :', consentsError);
		throw error(500, 'Impossible de charger les données');
	}

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
		// m.student may be an array or object depending on Supabase typing
		const studentRaw = Array.isArray(membership.student)
			? membership.student[0]
			: membership.student;
		const student = studentRaw as {
			id: string;
			firstname: string | null;
			lastname: string | null;
			email: string | null;
			avatar_url: string | null;
			grade: string | null;
			consent_required: boolean;
			consent_granted_at: string | null;
			consent_grace_period_ends: string | null;
			age_declaration: string | null;
			age_declared_at: string | null;
		} | null;

		if (!student) continue;

		// Élèves d'un niveau soumis (règle de la base : tout sauf 1re/terminale, primaire et
		// niveau inconnu compris), ou déjà soumis en base : une dispense reste visible pour
		// pouvoir être levée.
		const needsConsent = requiresParentalConsent(student.grade) || student.consent_required;

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
			age_declaration: student.age_declaration,
			age_declared_at: student.age_declared_at,
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

	// The consent email is sent server-side via Brevo (see api/consent/send-email),
	// so availability depends on the transactional email service, not a per-teacher
	// Google/Gmail integration.
	const emailServiceReady = isBrevoConfigured();

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
		emailServiceReady,
		stats
	};
};

// Annulation de la réponse d'âge d'un élève (C16)
const resetAgeDeclarationSchema = z.object({
	studentId: z.string().uuid()
});

/** Délai de grâce rouvert quand la réponse d'âge est annulée. */
const AGE_RESET_GRACE_DAYS = 30;

// Schema for updating parent email
const updateParentEmailSchema = z.object({
	studentId: z.string().uuid(),
	parentEmail: z.string().email('Email parent invalide').toLowerCase().trim()
});

export const actions: Actions = {
	/**
	 * Annule la réponse d'âge d'un élève : la question lui sera reposée.
	 * Client du professeur (locals.supabase) : le garde guard_profile_consent_fields
	 * laisse passer un professeur ou un administrateur, et la RLS s'applique.
	 */
	resetAgeDeclaration: async ({ request, locals }) => {
		const { user } = await requireRoles(locals, ['teacher', 'admin']);
		const supabase = locals.supabase;

		const formData = await request.formData();
		const validation = resetAgeDeclarationSchema.safeParse({
			studentId: formData.get('studentId')
		});
		if (!validation.success) {
			return fail(400, { error: 'Élève invalide' });
		}
		const { studentId } = validation.data;

		const hasAccess = await verifyTeacherStudent(user.id, studentId, supabase);
		if (!hasAccess) {
			return fail(403, { error: 'Vous ne pouvez modifier que vos propres élèves' });
		}

		const graceEnds = new Date(Date.now() + AGE_RESET_GRACE_DAYS * 24 * 60 * 60 * 1000);
		const { data, error: updateError } = await supabase
			.from('profiles')
			.update({
				age_declaration: null,
				age_declared_at: null,
				consent_required: true,
				consent_grace_period_ends: graceEnds.toISOString()
			})
			.eq('id', studentId)
			// Seulement un élève de 2nde qui a répondu : sinon la question ne lui serait
			// jamais reposée (1re, terminale) ou son délai serait relancé sans raison.
			.eq('grade', AGE_QUESTION_GRADE)
			.not('age_declaration', 'is', null)
			.select('id');

		if (updateError) {
			console.error('[Consent Page] Annulation de la réponse d’âge impossible :', updateError);
			return fail(500, { error: "Erreur lors de l'annulation de la déclaration" });
		}

		// Un refus de la RLS ne rend pas d'erreur : zéro ligne.
		// Zéro ligne aussi si l'élève n'est pas en 2nde ou n'a pas répondu.
		if (!data || data.length !== 1) {
			return fail(403, { error: "La déclaration n'a pas pu être annulée" });
		}

		return { success: true };
	},

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
		const { data: existing, error: existingError } = await supabase
			.from('parental_consents')
			.select('id')
			.eq('student_id', studentId)
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà. Une AUTRE
		// panne prenait le même visage et faisait conclure « rien ici », donc créer
		// par-dessus ce qu'on n'avait simplement pas su lire.
		if (existingError && existingError.code !== 'PGRST116') {
			console.error('Lecture impossible :', existingError);
			throw error(500, 'Impossible de vérifier l’état actuel');
		}

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
