/**
 * PDF Generation API Endpoint
 * ===========================
 *
 * Generates PDF documents for worksheets using Typst.
 * Supports both worksheet and correction modes.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { generateWorksheetTypst } from '$lib/worksheets/typst-generator';
import type { InstanceData, WorksheetWithRelations } from '$lib/types/worksheets';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Typst.js library type (same as in preview component)
type TypstLibrary = {
	setCompilerInitOptions: (options: { getModule: () => string }) => void;
	setRendererInitOptions: (options: { getModule: () => string }) => void;
	pdf: (options: { mainContent: string }) => Promise<Uint8Array>;
};

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
	// Check authentication
	const user = await locals.safeGetUser();
	if (!user) {
		throw error(401, 'Non authentifié');
	}

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
						variables
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
		if (worksheet.created_by !== user.id && user.role !== 'admin') {
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

		// Generate Typst document
		const typstContent = generateWorksheetTypst({
			worksheet: worksheet,
			instance: instanceData,
			config: worksheet.config || {},
			mode,
			studentName,
			className
		});

		// Dynamically import and initialize Typst
		const typst = await initializeTypst();

		// Compile to PDF
		const pdfData = await typst.pdf({ mainContent: typstContent });

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
 * Initialize Typst.js library
 * This is a server-side implementation using dynamic imports
 */
async function initializeTypst(): Promise<TypstLibrary> {
	// Import the Typst.js library
	// Note: In production, you might want to use a different approach
	// like running Typst CLI in a subprocess or using a dedicated service
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
 * This is a placeholder - in production, use the actual instance generator
 */
function generateSimpleInstance(worksheet: WorksheetWithRelations): InstanceData {
	const exercises = worksheet.worksheet_exercises || [];

	// Sort exercises by position
	const sortedExercises = [...exercises].sort((a, b) => a.position - b.position);

	// Map to resolved exercises
	const resolvedExercises = sortedExercises.map((we) => ({
		exercise_id: we.exercise_id,
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
	// Check authentication
	const user = await locals.safeGetUser();
	if (!user) {
		throw error(401, 'Non authentifié');
	}

	// This could be implemented to retrieve stored PDFs from a cache
	// For now, redirect to POST
	throw error(405, 'Use POST to generate PDFs');
};
