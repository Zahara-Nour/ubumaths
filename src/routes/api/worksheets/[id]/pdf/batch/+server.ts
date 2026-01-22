/**
 * Batch PDF Generation API Endpoint
 * ==================================
 *
 * Generates PDFs for an entire class and returns them as a zip file.
 * Each student gets their own personalized variant.
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { generateWorksheetTypst } from '$lib/worksheets/typst-generator';
import { getExerciseContentSafe, type Exercise } from '$lib/exercises/types';
import type { WorksheetWithRelations, InstanceData } from '$lib/types/worksheets';
import JSZip from 'jszip';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Typst.js library type
type TypstLibrary = {
	setCompilerInitOptions: (options: { getModule: () => string }) => void;
	setRendererInitOptions: (options: { getModule: () => string }) => void;
	pdf: (options: { mainContent: string }) => Promise<Uint8Array>;
};

// Request body schema
const batchGenerateSchema = z.object({
	classId: z.string().uuid(),
	mode: z.enum(['worksheet', 'correction']),
	includeAbsent: z.boolean().optional().default(false)
});

// Student type from database
interface Student {
	id: string;
	firstname: string | null;
	lastname: string | null;
	email: string;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export const POST: RequestHandler = async ({ params, locals, request }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Non autorisé');
	}

	// Check role from profile
	const { data: userProfile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', locals.user.id)
		.single();

	if (!userProfile || userProfile.role !== 'teacher') {
		throw error(401, 'Non autorisé - enseignant requis');
	}

	const user = { ...locals.user, role: userProfile.role };

	// Validate request body
	const body = await request.json().catch(() => null);
	const validation = batchGenerateSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { classId, mode, includeAbsent: _includeAbsent } = validation.data;

	try {
		// Fetch worksheet with all relations
		const { data: worksheet, error: fetchError } = await locals.supabase
			.from('worksheets')
			.select(
				`
				*,
				worksheet_sections(
					*
				),
				worksheet_exercises(
					*,
					exercise:exercises(
						id,
						title,
						variables,
						shared,
						variations
					)
				)
			`
			)
			.eq('id', params.id)
			.single();

		if (fetchError || !worksheet) {
			throw error(404, 'Feuille de travail introuvable');
		}

		// Check permissions
		if (worksheet.created_by !== user.id && user.role !== 'admin') {
			throw error(403, 'Non autorisé');
		}

		// Fetch class information
		const { data: classData, error: classError } = await locals.supabase
			.from('classes')
			.select('id, name')
			.eq('id', classId)
			.single();

		if (classError || !classData) {
			throw error(404, 'Classe introuvable');
		}

		// Fetch students in the class
		const { data: students, error: studentsError } = await locals.supabase
			.from('class_students')
			.select(
				`
				student:profiles!class_students_student_id_fkey(
					id,
					firstname,
					lastname,
					email
				)
			`
			)
			.eq('class_id', classId)
			.eq('is_active', true);

		if (studentsError || !students) {
			throw error(500, 'Erreur lors de la récupération des élèves');
		}

		// Type the students properly (Supabase returns nested objects)
		const typedStudents = students as unknown as Array<{ student: Student }>;

		// Check for existing worksheet instances
		const studentIds = typedStudents.map((s) => s.student.id);
		const { data: existingInstances } = await locals.supabase
			.from('worksheet_instances')
			.select('student_id, instance_data, variant_seed')
			.eq('worksheet_id', params.id)
			.in('student_id', studentIds);

		// Create a map of existing instances
		const instanceMap = new Map<string, InstanceData>();
		if (existingInstances) {
			existingInstances.forEach((inst) => {
				instanceMap.set(inst.student_id, inst.instance_data as InstanceData);
			});
		}

		// Initialize Typst once
		const typst = await initializeTypst();

		// Create zip file
		const zip = new JSZip();
		const folder = zip.folder(
			`${worksheet.title.replace(/[^a-zA-Z0-9]/g, '_')}_${classData.name}_${mode}`
		);

		if (!folder) {
			throw error(500, 'Erreur lors de la création du fichier zip');
		}

		// Process in batches to avoid memory issues
		const BATCH_SIZE = 5;
		const batches: Array<Array<{ student: Student }>> = [];
		for (let i = 0; i < typedStudents.length; i += BATCH_SIZE) {
			batches.push(typedStudents.slice(i, i + BATCH_SIZE));
		}

		// Generate PDFs for each batch
		for (const batch of batches) {
			const pdfPromises = batch.map(async ({ student }) => {
				// Get or generate instance for this student
				let instanceData = instanceMap.get(student.id);
				if (!instanceData) {
					// Generate new instance (simplified for now)
					instanceData = generateSimpleInstance(worksheet as WorksheetWithRelations);
				}

				// Generate student name
				const studentName = formatStudentName(student);

				// Generate Typst document
				const typstContent = generateWorksheetTypst({
					worksheet: worksheet,
					instance: instanceData,
					config: worksheet.config || {},
					mode,
					studentName,
					className: classData.name
				});

				// Compile to PDF
				const pdfData = await typst.pdf({ mainContent: typstContent });

				// Create filename
				const filename = `${sanitizeFilename(studentName)}_${worksheet.title.replace(/[^a-zA-Z0-9]/g, '_')}_${mode}.pdf`;

				return { filename, data: pdfData };
			});

			// Wait for batch to complete
			const pdfs = await Promise.all(pdfPromises);

			// Add PDFs to zip
			pdfs.forEach(({ filename, data }) => {
				folder.file(filename, data);
			});
		}

		// If correction mode, also add a master correction document
		if (mode === 'correction') {
			const masterTypst = generateWorksheetTypst({
				worksheet: worksheet,
				instance: generateSimpleInstance(worksheet as WorksheetWithRelations),
				config: worksheet.config || {},
				mode: 'correction',
				studentName: 'CORRECTION GÉNÉRALE',
				className: classData.name
			});

			const masterPdf = await typst.pdf({ mainContent: masterTypst });
			folder.file('00_CORRECTION_GENERALE.pdf', masterPdf);
		}

		// Add summary document
		const summary = generateBatchSummary(worksheet, typedStudents, classData.name, mode);
		folder.file('00_SOMMAIRE.txt', summary);

		// Generate zip file
		const zipData = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });

		// Return zip file
		return new Response(zipData as unknown as BodyInit, {
			headers: {
				'Content-Type': 'application/zip',
				'Content-Disposition': `attachment; filename="${worksheet.title.replace(/[^a-zA-Z0-9]/g, '_')}_${classData.name}_${mode}.zip"`
			}
		});
	} catch (err) {
		console.error('Batch PDF generation error:', err);

		if (err instanceof Error && 'status' in err) {
			throw err;
		}

		throw error(500, 'Erreur lors de la génération des PDFs');
	}
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Initialize Typst.js library
 */
async function initializeTypst(): Promise<TypstLibrary> {
	// Import the Typst.js library
	const { $typst } = (await import('@myriaddreamin/typst.ts')) as { $typst: TypstLibrary };

	if (!$typst) {
		throw new Error('Failed to load Typst library');
	}

	// Initialize compiler and renderer
	$typst.setCompilerInitOptions({
		getModule: () =>
			'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm'
	});

	$typst.setRendererInitOptions({
		getModule: () =>
			'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm'
	});

	return $typst as TypstLibrary;
}

/**
 * Generate a simple instance from worksheet exercises
 */
function generateSimpleInstance(
	worksheet: WorksheetWithRelations & { worksheet_exercises?: WorksheetWithRelations['exercises'] }
): InstanceData {
	// Handle both property names: 'exercises' from composed response, 'worksheet_exercises' from joined query
	const exercises = worksheet.exercises || worksheet.worksheet_exercises || [];

	// Sort exercises by position
	const sortedExercises = [...exercises].sort((a, b) => a.position - b.position);

	// Map to resolved exercises using variations (single source of truth)
	const resolvedExercises = sortedExercises.map((we) => {
		const content = we.exercise
			? getExerciseContentSafe(we.exercise as unknown as Exercise)
			: { statement_md: '', solution_md: '' };
		return {
			exercise_id: we.exercise_id,
			title: we.exercise?.title ?? null,
			position: we.position,
			parameters: {},
			statement: content.statement_md,
			solution: content.solution_md
		};
	});

	return {
		exercises: resolvedExercises,
		variant_info: {
			seed: Math.floor(Math.random() * 1000000),
			version: 'batch'
		}
	};
}

/**
 * Format student name for display and filename
 */
function formatStudentName(student: Student): string {
	const firstName = student.firstname || '';
	const lastName = student.lastname || '';

	if (firstName && lastName) {
		return `${lastName.toUpperCase()} ${firstName}`;
	} else if (lastName) {
		return lastName.toUpperCase();
	} else if (firstName) {
		return firstName;
	} else {
		return student.email.split('@')[0];
	}
}

/**
 * Sanitize filename by removing special characters
 */
function sanitizeFilename(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // Remove accents
		.replace(/[^a-zA-Z0-9_-]/g, '_') // Replace special chars with underscore
		.replace(/__+/g, '_') // Remove duplicate underscores
		.trim();
}

/**
 * Generate summary text file for the batch
 */
function generateBatchSummary(
	worksheet: { title: string; type: string },
	students: { student: Student }[],
	className: string,
	mode: string
): string {
	const date = new Date().toLocaleString('fr-FR');
	const modeLabel = mode === 'correction' ? 'Corrections' : 'Feuilles de travail';

	return `========================================
GÉNÉRATION BATCH DE PDFS
========================================

Feuille de travail : ${worksheet.title}
Type : ${worksheet.type}
Classe : ${className}
Mode : ${modeLabel}
Date de génération : ${date}

========================================
LISTE DES ÉLÈVES (${students.length})
========================================

${students.map((s, i) => `${i + 1}. ${formatStudentName(s.student)}`).join('\n')}

========================================
INFORMATIONS
========================================

- Chaque PDF est personnalisé avec le nom de l'élève
- Les exercices peuvent être mélangés selon la configuration
- ${mode === 'correction' ? 'Les solutions sont incluses' : 'Les solutions ne sont pas incluses'}

========================================
`;
}
