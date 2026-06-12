/**
 * Migration Question Edit Page - Server Load
 * ============================================
 *
 * Loads a single migration question for editing with QuestionTemplateForm.
 * Sources data from export files or existing migration_edits.
 *
 * SECURITY: Admin only
 */

import { error } from '@sveltejs/kit';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { PageServerLoad } from './$types';
import type { QuestionTemplate } from '$lib/questions/types';
import type { QuestionEntry } from '../../+page.server';

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

export const load: PageServerLoad = async ({ params, locals }) => {
	const { profile, supabase } = locals;

	// Check admin role
	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Accès refusé');
	}

	const { theme, domain, subdomain, globalIndex: globalIndexParam } = params;

	// Validate globalIndex
	const globalIndex = parseInt(globalIndexParam, 10);
	if (isNaN(globalIndex) || globalIndex < 0) {
		throw error(400, 'Index invalide');
	}

	// Decode URL-encoded params
	const decodedTheme = decodeURIComponent(theme);
	const decodedDomain = decodeURIComponent(domain);
	const decodedSubdomain = decodeURIComponent(subdomain);

	// Load questions from export files
	const latestExport = await getLatestExportFolder();
	const subdomainPath = join(
		latestExport,
		'by-category',
		decodedTheme,
		decodedDomain,
		decodedSubdomain
	);

	try {
		const files = await readdir(subdomainPath);
		const levelFiles = files.filter((file) => file.match(/^level-\d+\.json$/));

		if (levelFiles.length === 0) {
			throw error(404, 'Aucun fichier de niveau trouvé');
		}

		// Read all level files and find the question
		let targetQuestion: QuestionEntry | null = null;

		for (const file of levelFiles) {
			const filePath = join(subdomainPath, file);
			const fileContent = await readFile(filePath, 'utf-8');
			const levelData = JSON.parse(fileContent) as QuestionEntry[];

			const found = levelData.find((q) => q.globalIndex === globalIndex);
			if (found) {
				targetQuestion = found;
				break;
			}
		}

		if (!targetQuestion) {
			throw error(404, `Question #${globalIndex} non trouvée`);
		}

		// Check for existing edit in migration_edits
		let sourceData = targetQuestion.transformed;

		if (supabase) {
			const { data: editsData } = await supabase
				.from('migration_edits')
				.select(
					`
					edited_json,
					migration_tracking!inner(old_question_index)
				`
				)
				.eq('migration_tracking.old_question_index', globalIndex)
				.limit(1);

			if (editsData && editsData.length > 0) {
				sourceData = editsData[0].edited_json as typeof sourceData;
			}
		}

		// Map to QuestionTemplate format expected by QuestionTemplateForm
		// Always use entry-level metadata for theme/domain/subdomain (correct categorization)
		// The transformed data may have different/legacy categories
		// Migration JSON files use plain strings where QuestionTemplate requires branded
		// TemplateMarkdown. Cast through unknown — the runtime values are correct strings,
		// the brand is only a compile-time guard that does not apply to legacy JSON files.
		const template: QuestionTemplate = {
			id: `migration-${globalIndex}`,
			title: sourceData.title || '',
			description: sourceData.description,
			shared: sourceData.shared as unknown as QuestionTemplate['shared'],
			defaultDisplayOptions: sourceData.defaultDisplayOptions,
			multipleAnswers: sourceData.multipleAnswers,
			variations: (sourceData.variations || []) as unknown as QuestionTemplate['variations'],
			exerciseInstruction: sourceData.exerciseInstruction,
			options: sourceData.options as unknown as QuestionTemplate['options'],
			grades: sourceData.grades || [],
			theme: targetQuestion.theme,
			domain: targetQuestion.domain,
			subdomain: targetQuestion.subdomain,
			level: targetQuestion.level,
			status: (sourceData.status as 'draft' | 'published') || 'draft',
			delay: sourceData.delay,
			testSpecs: (sourceData as Record<string, unknown>)
				.testSpecs as unknown as QuestionTemplate['testSpecs']
		};

		return {
			template,
			globalIndex,
			theme: targetQuestion.theme,
			domain: targetQuestion.domain,
			subdomain: targetQuestion.subdomain,
			pathParams: { theme, domain, subdomain }
		};
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			throw error(404, `Données non trouvées pour ${theme}/${domain}/${subdomain}`);
		}
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error loading question for edit:', err);
		throw error(500, 'Erreur lors du chargement de la question');
	}
};
