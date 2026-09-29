import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate, QuestionInstance } from '$lib/questions/types';
import { compareCategories } from '$lib/questions/category-order';
import { PREVIEW_SEED } from '$lib/questions/cart-preview';

/**
 * Hierarchical structure for organizing questions
 */
interface QuestionWithPreview {
	id: string; // template.id for keying
	template: QuestionTemplate;
	preview: QuestionInstance;
}

interface SubdomainGroup {
	subdomain: string | null;
	questions: QuestionWithPreview[];
}

interface DomainGroup {
	domain: string;
	subdomains: SubdomainGroup[];
}

interface ThemeGroup {
	theme: string;
	domains: DomainGroup[];
}

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Fetch all published question templates directly from database
	const { data: allTemplates, error: templatesError } = await supabase
		.from('question_templates')
		.select('*')
		.eq('status', 'published');

	// Ordre déclaré (TinyMath) des thèmes, domaines, sous-domaines, puis niveau.
	// La hiérarchie ci-dessous est construite dans cet ordre d'apparition.
	const templates =
		allTemplates?.sort((a, b) => {
			const byCategory = compareCategories(a, b);
			if (byCategory !== 0) return byCategory;
			// `level` est numérique : un tri lexicographique classerait 10 avant 2.
			return (a.level ?? 0) - (b.level ?? 0);
		}) || [];

	if (templatesError) {
		console.error('Failed to load question templates:', templatesError);
		throw error(500, 'Failed to load questions');
	}

	if (!templates || templates.length === 0) {
		return {
			hierarchy: [],
			templates: [] // Empty array for cache initialization
		};
	}

	// Aperçus à graine fixe, la même que le panier et la création d'évaluation
	const questionsWithPreviews: QuestionWithPreview[] = [];

	for (const template of templates) {
		const result = generateInstance(template as QuestionTemplate, PREVIEW_SEED);
		if (result.success && result.instance) {
			questionsWithPreviews.push({
				id: template.id,
				template: template as QuestionTemplate,
				preview: result.instance
			});
		} else {
			// Error case - result.success is false, so errors should exist
			const errors = 'errors' in result ? result.errors : ['Unknown error'];
			console.warn(`Failed to generate preview for template ${template.id}:`, errors);
		}
	}

	// Build hierarchical structure: Theme → Domain → Subdomain → Questions
	const themeMap = new Map<string, ThemeGroup>();

	for (const question of questionsWithPreviews) {
		const { theme, domain, subdomain } = question.template;

		// Get or create theme
		if (!themeMap.has(theme)) {
			themeMap.set(theme, {
				theme,
				domains: []
			});
		}
		const themeGroup = themeMap.get(theme)!;

		// Get or create domain
		let domainGroup = themeGroup.domains.find((d) => d.domain === domain);
		if (!domainGroup) {
			domainGroup = {
				domain,
				subdomains: []
			};
			themeGroup.domains.push(domainGroup);
		}

		// Get or create subdomain
		const subdomainKey = subdomain || ''; // Treat null as empty string for consistency
		let subdomainGroup = domainGroup.subdomains.find((s) => (s.subdomain || '') === subdomainKey);
		if (!subdomainGroup) {
			subdomainGroup = {
				subdomain: subdomain || null,
				questions: []
			};
			domainGroup.subdomains.push(subdomainGroup);
		}

		// Add question to subdomain
		subdomainGroup!.questions.push(question);
	}

	// Convert map to array
	const hierarchy = Array.from(themeMap.values());

	// Extract unique themes for dropdown
	const themes = hierarchy.map((t) => t.theme);

	return {
		hierarchy,
		themes,
		totalQuestions: questionsWithPreviews.length,
		templates: templates as QuestionTemplate[] // Raw templates for cache initialization
	};
};
