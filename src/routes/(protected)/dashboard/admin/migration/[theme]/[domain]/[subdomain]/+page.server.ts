/**
 * Server Load Function for Subdomain Detail Page
 * ==============================================
 *
 * Loads all questions within a specific subdomain from migration export files.
 * Reads level-*.json files from the subdomain directory.
 */

import { error } from '@sveltejs/kit';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { PageServerLoad } from './$types';

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
		grades?: string[];
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

export const load: PageServerLoad = async ({ params }) => {
	const { theme, domain, subdomain } = params;

	// Decode URL-encoded params
	const decodedTheme = decodeURIComponent(theme);
	const decodedDomain = decodeURIComponent(domain);
	const decodedSubdomain = decodeURIComponent(subdomain);

	// Build path to subdomain directory
	// Params come from the path which already has the correct directory names (lowercase, underscores)
	const subdomainPath = join(
		process.cwd(),
		'data/migration-output/export-2025-11-27/by-category',
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

		return {
			theme: displayTheme,
			domain: displayDomain,
			subdomain: displaySubdomain,
			questions: allQuestions,
			stats
		};
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			throw error(404, `Données non trouvées pour ${theme}/${domain}/${subdomain}`);
		}
		console.error('Error loading subdomain data:', err);
		throw error(500, 'Erreur lors du chargement des données de migration');
	}
};
