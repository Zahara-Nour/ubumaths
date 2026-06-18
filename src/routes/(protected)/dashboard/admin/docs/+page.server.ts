import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/middleware/auth';
import { scanDocumentation } from '$lib/server/docs-scanner';
import { parseMarkdown } from '$lib/server/markdown-parser';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Admin gate (admin login OR step-up elevation)
	await requireAdmin(locals);

	// Scan all documentation
	const categories = await scanDocumentation();

	// Get search query if present
	const searchQuery = url.searchParams.get('q');

	// Load main README as default content
	const readmePath = join(process.cwd(), 'docs', 'README.md');
	const readmeContent = await readFile(readmePath, 'utf-8');
	const parsedReadme = await parseMarkdown(readmeContent, 'README.md');

	return {
		categories,
		searchQuery,
		defaultDoc: parsedReadme,
		currentPath: null
	};
};
