import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate, QuestionInstance } from '$lib/questions/types';

/**
 * Hierarchical structure for organizing questions
 */
interface QuestionWithPreview {
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
	// Load all published question templates
	const { data: templates, error: templatesError } = await supabase
		.from('question_templates')
		.select('*')
		.eq('status', 'published')
		.order('theme', { ascending: true })
		.order('domain', { ascending: true })
		.order('subdomain', { ascending: true })
		.order('level', { ascending: true });

	if (templatesError) {
		console.error('Failed to load question templates:', templatesError);
		throw error(500, 'Failed to load questions');
	}

	if (!templates || templates.length === 0) {
		return {
			hierarchy: []
		};
	}

	// Generate preview instances with fixed seed for consistency
	const PREVIEW_SEED = 12345;
	const questionsWithPreviews: QuestionWithPreview[] = [];

	for (const template of templates) {
		const result = generateInstance(template as QuestionTemplate, PREVIEW_SEED);
		if (result.success && result.instance) {
			questionsWithPreviews.push({
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
		totalQuestions: questionsWithPreviews.length
	};
};
