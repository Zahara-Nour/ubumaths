/**
 * Server Load Function for Subdomain Detail Page
 * ==============================================
 *
 * Loads all questions within a specific subdomain from migration export files.
 * Reads level-*.json files from the subdomain directory.
 * Also loads review status from migration_tracking table.
 */

import { error } from '@sveltejs/kit';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { PageServerLoad } from './$types';
import type { GradeCode } from '$lib/types/grades';
import type { MigrationStatus } from '$lib/types/migration';

/**
 * Get the latest export folder from data/migration-output/
 */
async function getLatestExportFolder(): Promise<string> {
	const baseDir = join(process.cwd(), 'data/migration-output');
	const entries = await readdir(baseDir);
	const exportFolders = entries
		.filter((e) => e.startsWith('export-'))
		.sort()
		.reverse();

	if (exportFolders.length === 0) {
		throw error(404, 'No export folder found in data/migration-output/');
	}

	return join(baseDir, exportFolders[0]);
}

/**
 * Individual question data structure from level JSON files
 */
export interface QuestionEntry {
	theme: string;
	domain: string;
	subdomain: string;
	level: number;
	globalIndex: number;
	question: {
		description: string;
		subdescription?: string;
		enounces?: string[];
		expressions?: string[];
		answerFormats?: string[];
		grade?: string;
		defaultDelay?: number;
		_migration?: {
			theme: string;
			domain: string;
			subdomain: string;
			level: number;
			globalIndex: number;
		};
	};
	transformed: {
		type: string;
		title: string;
		description?: string;
		variations?: unknown[];
		grades?: GradeCode[];
		theme?: string;
		domain?: string;
		level?: number;
		status?: string;
		delay?: number;
	};
	warnings: string[];
	errors: string[];
	stats: {
		variations: number;
		variables: number;
		syntaxConversions: number;
		optionsMapped: number;
		correctionConversions: number;
		detectedType: string;
		hasImages: boolean;
		hasCustomValidation: boolean;
		imagesConverted: number;
		imagesMissing: number;
	};
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const { theme, domain, subdomain } = params;

	// Decode URL-encoded params
	const decodedTheme = decodeURIComponent(theme);
	const decodedDomain = decodeURIComponent(domain);
	const decodedSubdomain = decodeURIComponent(subdomain);

	// Build path to subdomain directory
	// Params come from the path which already has the correct directory names (lowercase, underscores)
	const latestExport = await getLatestExportFolder();
	const subdomainPath = join(
		latestExport,
		'by-category',
		decodedTheme,
		decodedDomain,
		decodedSubdomain
	);

	try {
		// Read all files in the subdomain directory
		const files = await readdir(subdomainPath);

		// Filter for level-*.json files
		const levelFiles = files.filter((file) => file.match(/^level-\d+\.json$/));

		if (levelFiles.length === 0) {
			throw error(404, `Aucun fichier de niveau trouvé pour ${theme}/${domain}/${subdomain}`);
		}

		// Read all level files and extract questions
		const allQuestions: QuestionEntry[] = [];

		for (const file of levelFiles) {
			const filePath = join(subdomainPath, file);
			const fileContent = await readFile(filePath, 'utf-8');
			const levelData = JSON.parse(fileContent) as QuestionEntry[];

			// Level files contain arrays of questions
			allQuestions.push(...levelData);
		}

		// Sort by level and globalIndex
		allQuestions.sort((a, b) => {
			if (a.level !== b.level) return a.level - b.level;
			return a.globalIndex - b.globalIndex;
		});

		// Get properly capitalized names from the first question (for display)
		const displayTheme = allQuestions.length > 0 ? allQuestions[0].theme : decodedTheme;
		const displayDomain = allQuestions.length > 0 ? allQuestions[0].domain : decodedDomain;
		const displaySubdomain = allQuestions.length > 0 ? allQuestions[0].subdomain : decodedSubdomain;

		// Calculate statistics
		const stats = {
			totalQuestions: allQuestions.length,
			totalLevels: new Set(allQuestions.map((q) => q.level)).size,
			questionsWithWarnings: allQuestions.filter((q) => q.warnings.length > 0).length,
			questionsWithErrors: allQuestions.filter((q) => q.errors.length > 0).length,
			questionsClean: allQuestions.filter((q) => q.warnings.length === 0 && q.errors.length === 0)
				.length
		};

		// Load review status from database
		const globalIndices = allQuestions.map((q) => q.globalIndex);
		const reviewStatusMap: Record<number, { status: MigrationStatus; reason?: string }> = {};
		const questionEditsMap: Record<number, { editId: string; editedJson: unknown }> = {};

		if (locals.supabase && globalIndices.length > 0) {
			// Load tracking data for review status
			const { data: trackingData } = await locals.supabase
				.from('migration_tracking')
				.select('old_question_index, migration_status, conversion_errors, conversion_notes')
				.in('old_question_index', globalIndices);

			if (trackingData) {
				for (const row of trackingData) {
					// Only include validated or failed (rejected) status
					if (row.migration_status === 'validated' || row.migration_status === 'failed') {
						const errors = row.conversion_errors as { code?: string; message?: string }[] | null;
						const rejectionReason = errors?.find((e) => e.code === 'MANUAL_REJECTION')?.message;
						reviewStatusMap[row.old_question_index] = {
							status: row.migration_status as MigrationStatus,
							reason: rejectionReason || (row.conversion_notes as string | undefined)
						};
					}
				}
			}

			// Load edits from migration_edits table
			// We need to join with migration_tracking to get the old_question_index
			const { data: editsData } = await locals.supabase
				.from('migration_edits')
				.select(
					`
					id,
					edited_json,
					migration_tracking_id,
					migration_tracking!inner(old_question_index)
				`
				)
				.in('migration_tracking.old_question_index', globalIndices);

			if (editsData) {
				for (const edit of editsData) {
					const tracking = edit.migration_tracking as { old_question_index: number } | null;
					if (tracking) {
						questionEditsMap[tracking.old_question_index] = {
							editId: edit.id,
							editedJson: edit.edited_json
						};
					}
				}
			}
		}

		return {
			theme: displayTheme,
			domain: displayDomain,
			subdomain: displaySubdomain,
			questions: allQuestions,
			stats,
			reviewStatusMap,
			questionEditsMap
		};
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			throw error(404, `Données non trouvées pour ${theme}/${domain}/${subdomain}`);
		}
		console.error('Error loading subdomain data:', err);
		throw error(500, 'Erreur lors du chargement des données de migration');
	}
};
