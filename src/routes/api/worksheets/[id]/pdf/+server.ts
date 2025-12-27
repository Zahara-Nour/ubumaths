/**
 * PDF Generation API Endpoint
 * ===========================
 *
 * Generates PDF documents for worksheets using Typst.
 * Supports both worksheet and correction modes.
 *
 * NOTE: Server-side PDF generation requires Typst CLI to be installed.
 * Currently returns 501 Not Implemented - PDF generation should be done client-side
 * using the PdfPreview component which loads Typst.js in the browser.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRoles } from '$lib/server/middleware/auth';
import { generateWorksheetTypst } from '$lib/worksheets/typst-generator';
import type { InstanceData, WorksheetWithRelations } from '$lib/types/worksheets';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Request body schema
const generatePdfSchema = z.object({
	mode: z.enum(['worksheet', 'correction']),
	studentId: z.string().uuid().optional(),
	variantSeed: z.number().int().positive().optional(),
	studentName: z.string().optional(),
	className: z.string().optional()
});

// ============================================================================
// MAIN HANDLER
// ============================================================================

export const POST: RequestHandler = async ({ params, locals, request }) => {
	// Check authentication - require teacher or admin
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Validate request body
	const body = await request.json().catch(() => null);
	const validation = generatePdfSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { mode, studentId, variantSeed: _variantSeed, studentName, className } = validation.data;

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
						statement_md,
						solution_md,
						difficulty,
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

		// Check permissions (only teachers who created the worksheet or admins)
		if (worksheet.created_by !== user.id && profile.role !== 'admin') {
			throw error(403, 'Non autorisé');
		}

		// Get or generate instance data
		let instanceData: InstanceData;

		if (studentId) {
			// Try to fetch existing instance for this student
			const { data: instance } = await locals.supabase
				.from('worksheet_instances')
				.select('instance_data')
				.eq('worksheet_id', params.id)
				.eq('student_id', studentId)
				.single();

			if (instance) {
				instanceData = instance.instance_data as InstanceData;
			} else {
				// Generate new instance (would need to import instance generator)
				// For now, create a simple instance from exercises
				instanceData = generateSimpleInstance(worksheet as WorksheetWithRelations);
			}
		} else {
			// Generate generic instance for preview
			instanceData = generateSimpleInstance(worksheet as WorksheetWithRelations);
		}

		// Check if Typst CLI is available
		const typstAvailable = await isTypstAvailable();
		if (!typstAvailable) {
			throw error(
				501,
				'La génération de PDF côté serveur nécessite Typst CLI. Utilisez la prévisualisation client-side.'
			);
		}

		// Generate Typst document
		const typstContent = generateWorksheetTypst({
			worksheet: worksheet,
			instance: instanceData,
			config: worksheet.config || {},
			mode,
			studentName,
			className
		});

		// Compile to PDF using CLI
		const pdfData = await generatePdfWithTypstCli(typstContent);

		// Return PDF as base64
		const base64 = Buffer.from(pdfData).toString('base64');

		return json({
			success: true,
			pdf: base64,
			filename: `${worksheet.title.replace(/[^a-zA-Z0-9]/g, '_')}_${mode}.pdf`
		});
	} catch (err) {
		console.error('PDF generation error:', err);

		if (err instanceof Error && 'status' in err) {
			throw err;
		}

		throw error(500, 'Erreur lors de la génération du PDF');
	}
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if Typst CLI is available
 */
async function isTypstAvailable(): Promise<boolean> {
	try {
		await execAsync('typst --version');
		return true;
	} catch {
		return false;
	}
}

/**
 * Generate PDF using Typst CLI
 * Creates a temporary .typ file, compiles it to PDF, and returns the result
 */
async function generatePdfWithTypstCli(typstContent: string): Promise<Uint8Array> {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(7);
	const baseFilename = `worksheet_${timestamp}_${random}`;
	const typFilePath = join(tmpdir(), `${baseFilename}.typ`);
	const pdfFilePath = join(tmpdir(), `${baseFilename}.pdf`);

	try {
		// Write Typst content to temp file
		await writeFile(typFilePath, typstContent, 'utf-8');

		// Compile with Typst CLI
		await execAsync(`typst compile "${typFilePath}" "${pdfFilePath}"`);

		// Read the generated PDF
		const pdfData = await readFile(pdfFilePath);

		return new Uint8Array(pdfData);
	} finally {
		// Cleanup temp files
		try {
			await unlink(typFilePath);
		} catch {
			// Ignore cleanup errors
		}
		try {
			await unlink(pdfFilePath);
		} catch {
			// Ignore cleanup errors
		}
	}
}

/**
 * Generate a simple instance from worksheet exercises
 * This is a placeholder - in production, use the actual instance generator
 */
function generateSimpleInstance(worksheet: WorksheetWithRelations): InstanceData {
	const exercises = worksheet.exercises || [];

	// Sort exercises by position
	const sortedExercises = [...exercises].sort((a, b) => a.position - b.position);

	// Map to resolved exercises
	const resolvedExercises = sortedExercises.map((we) => ({
		exercise_id: we.exercise_id,
		title: we.exercise?.title ?? null,
		position: we.position,
		parameters: {},
		statement: we.exercise?.statement_md || '',
		solution: we.exercise?.solution_md || ''
	}));

	return {
		exercises: resolvedExercises,
		variant_info: {
			seed: Math.floor(Math.random() * 1000000),
			version: 'preview'
		}
	};
}

// ============================================================================
// GET HANDLER (for downloading existing PDFs if stored)
// ============================================================================

export const GET: RequestHandler = async ({ locals }) => {
	// Check authentication - require teacher or admin
	await requireRoles(locals, ['teacher', 'admin']);

	// This could be implemented to retrieve stored PDFs from a cache
	// For now, redirect to POST
	throw error(405, 'Use POST to generate PDFs');
};
