/**
 * Admin operations validation schemas
 */

import { z } from 'zod';
import { formDataTransforms, roleSchema, uuidSchema } from './common';
import { gradeCodeSchema, gradeFlexibleSchema } from './grades';

/**
 * Schema for adding a user to a class
 */
export const addToClassSchema = z.object({
	userId: z.string().uuid('Identifiant d’utilisateur invalide'),
	classId: z.string().uuid('Identifiant de classe invalide')
});

/**
 * Schema for removing a user from a class
 */
export const removeFromClassSchema = addToClassSchema;

/**
 * Composition d'une classe depuis l'année précédente.
 *
 * Le plafond de 200 n'est pas décoratif : chaque identifiant devient une
 * adhésion, et le rôle `authenticated` a un `statement_timeout` de 8 s. Une
 * promotion réaliste tient largement dessous — la plus grosse école du parc
 * compte 77 élèves.
 */
export const composeClassSchema = z.object({
	targetClassId: z.string().uuid('Identifiant de classe de destination invalide'),
	studentIds: z
		.array(z.string().uuid('Identifiant d’élève invalide'))
		.min(1, 'Aucun élève sélectionné')
		.max(200, 'Trop d’élèves d’un coup (200 au maximum)'),
	/**
	 * Consentement explicite au déplacement d'école. Inscrire un élève dans une
	 * classe d'une autre école déplace son profil — donc ses trimestres, son
	 * calendrier et son marché. Ça ne doit jamais arriver par inadvertance :
	 * sans ce drapeau, l'API refuse et dit combien d'élèves sont concernés.
	 */
	confirmSchoolChange: z.boolean().optional().default(false)
});

/**
 * Liste des élèves composables pour une classe de destination.
 */
export const classCompositionSourceSchema = z.object({
	targetClassId: z.string().uuid('Identifiant de classe de destination invalide')
});

/**
 * Schema for searching users
 */
export const searchUsersSchema = z.object({
	query: z.string().trim().min(1).max(100),
	role: roleSchema.optional(),
	limit: z.coerce.number().int().positive().max(50).default(20)
});

// ============================================================================
// USER MANAGEMENT FORM SCHEMAS
// ============================================================================

// ============================================================================
// STUDENT IMPORT SCHEMAS
// ============================================================================

/**
 * Import students form schema
 */
export const importStudentsFormSchema = z.object({
	students: z.string().min(1, 'Données des élèves requises'), // JSON string
	school_id: formDataTransforms.uuid
});

/**
 * Un élève importé, tel que la page l'envoie après lecture du CSV.
 *
 * Le niveau est ramené à son code (« 6ème » → « 6 ») : c'est la forme que
 * portent les profils, où il est recopié à l'activation du compte.
 */
export const importedStudentSchema = z.object({
	email: z.string().trim().toLowerCase().max(254, 'Courriel trop long').email('Courriel invalide'),
	firstname: z.string().trim().min(1, 'Prénom requis').max(100, 'Prénom trop long'),
	lastname: z.string().trim().min(1, 'Nom requis').max(100, 'Nom trop long'),
	grade: gradeFlexibleSchema.nullable(),
	class_codes: z
		.array(z.string().trim().toUpperCase().max(10, 'Code de classe trop long'))
		.max(20, 'Trop de codes de classe pour un élève')
});

/**
 * La liste des élèves d'un import. Le plafond borne la taille d'un envoi : la
 * plus grosse école du parc compte 77 élèves.
 */
export const importedStudentsSchema = z
	.array(importedStudentSchema)
	.min(1, 'Aucun élève à importer')
	.max(1000, 'Trop d’élèves dans un seul import (1 000 au plus)');

// ============================================================================
// CLASS MANAGEMENT SCHEMAS (dashboard/admin/classes)
// ============================================================================

/** Un champ de formulaire vide, blanc ou absent devient `null`. */
function emptyToNull<T extends z.ZodType>(schema: T) {
	return z.preprocess(
		(v) => (v === undefined || (typeof v === 'string' && v.trim() === '') ? null : v),
		schema.nullable()
	);
}

/** Code d'inscription d'une classe : lettres, chiffres, `-` et `_`, 10 caractères au plus. */
const joinCodeSchema = z
	.string()
	.trim()
	.toUpperCase()
	.max(10, 'Code de classe trop long (10 caractères au plus)')
	.regex(/^[A-Z0-9_-]*$/, 'Code de classe : lettres, chiffres, « - » et « _ » seulement');

/** Formulaire de création d'une classe ; un code vide est généré par la base. */
export const adminClassCreateSchema = z.object({
	name: z.string().trim().min(1, 'Nom requis').max(100, 'Nom trop long (100 caractères au plus)'),
	description: emptyToNull(
		z.string().trim().max(500, 'Description trop longue (500 caractères au plus)')
	),
	school_id: emptyToNull(uuidSchema),
	grade: emptyToNull(gradeCodeSchema),
	join_code: joinCodeSchema.nullish().transform((v) => v ?? '')
});

/** Formulaire de modification d'une classe : le code y est toujours saisi. */
export const adminClassUpdateSchema = adminClassCreateSchema.extend({
	id: uuidSchema,
	join_code: joinCodeSchema.min(1, 'Code de classe requis'),
	is_active: z
		.string()
		.nullish()
		.transform((v) => v === 'true')
});

/** Activation / désactivation d'une classe. */
export const adminClassIdSchema = z.object({ id: uuidSchema });

// ============================================================================
// SCHOOL MANAGEMENT SCHEMAS
// ============================================================================

// ============================================================================
// NOTIFICATION MANAGEMENT SCHEMAS
// ============================================================================

// ============================================================================
// TEST MODE SCHEMA
// ============================================================================

/**
 * Schema for toggling test mode (POST /api/test-mode)
 * Teacher-only: Enable/disable test mode for question generation
 * NOTE: Exported from common.ts to avoid duplication
 */
// export const testModeSchema = z.object({
// 	enabled: z.boolean()
// });

// ============================================================================
// USER PROFILE UPDATE SCHEMA (API)
// ============================================================================

/**
 * Schema for partial update of user profile fields (PATCH /api/admin/users/[id])
 * Admin-only: Update user profile fields from inline editing
 *
 * All fields are optional (partial update), nullable fields accept null
 * NOTE: Email is read-only and cannot be updated via this endpoint
 */
export const updateUserFieldsSchema = z
	.object({
		firstname: z
			.string()
			.min(1, 'Prénom invalide')
			.max(100, 'Prénom trop long')
			.nullable()
			.optional(),
		lastname: z.string().min(1, 'Nom invalide').max(100, 'Nom trop long').nullable().optional(),
		role: z.enum(['admin', 'teacher', 'student'], { message: 'Rôle invalide' }).optional(),
		school_id: z.string().uuid('Identifiant d’école invalide').nullable().optional(),
		is_test: z.boolean({ message: 'Valeur de « compte de test » invalide' }).optional()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Aucun champ à modifier'
	});

// ============================================================================
// CLASS STUDENTS QUERY SCHEMA
// ============================================================================

/**
 * Schema for querying students in a class (GET /api/admin/class-students)
 * Query Parameters:
 * - class_id: Optional UUID of the class to filter students
 */
export const classStudentsQuerySchema = z.object({
	class_id: z.string().uuid('Identifiant de classe invalide').optional()
});

// ============================================================================
// USER STATUS MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Schema for updating user approval status (PATCH /api/admin/users/[id]/status)
 * Admin-only: Approve or reject pending users
 *
 * When approving, profile fields can be updated at the same time
 */
export const updateUserStatusSchema = z.object({
	status: z.enum(['approved', 'rejected'], {
		message: 'Statut invalide (approved ou rejected attendu)'
	}),
	rejection_reason: z
		.string()
		.max(500, 'Motif du refus trop long (500 caractères au maximum)')
		.nullable()
		.optional(),
	// Optional profile fields (for approval with updates)
	firstname: z
		.string()
		.min(1, 'Prénom invalide')
		.max(100, 'Prénom trop long')
		.nullable()
		.optional(),
	lastname: z.string().min(1, 'Nom invalide').max(100, 'Nom trop long').nullable().optional(),
	school_id: z.string().uuid('Identifiant d’école invalide').nullable().optional(),
	is_test: z.boolean({ message: 'Valeur de « compte de test » invalide' }).optional()
});
