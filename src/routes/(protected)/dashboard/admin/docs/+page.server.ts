import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth';
import { scanDocumentation } from '$lib/server/docs-scanner';
import { parseMarkdown } from '$lib/server/markdown-parser';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase }, url }) => {
	const { user } = await safeGetSession();
	requireAuth(user);

	if (!user) throw error(401, 'Unauthorized');

	// Only admins can access docs
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profile?.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

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
