import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth';
import { scanDocumentation, getDocumentContent } from '$lib/server/docs-scanner';
import { parseMarkdown } from '$lib/server/markdown-parser';

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase }, params }) => {
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

	// Parse path: /features/questions/README -> category: features, docPath: questions/README.md
	const pathSegments = params.path.split('/');

	if (pathSegments.length < 1) {
		throw error(400, 'Invalid document path');
	}

	const category = pathSegments[0];
	let docPath = pathSegments.slice(1).join('/');

	// Add .md extension if not already present
	if (!docPath.endsWith('.md')) {
		docPath += '.md';
	}

	// Get document content
	try {
		const content = await getDocumentContent(category, docPath);
		const parsedDoc = await parseMarkdown(content, `${category}/${docPath}`);

		// Scan categories for sidebar
		const categories = await scanDocumentation();

		return {
			doc: parsedDoc,
			categories,
			currentPath: `${category}/${docPath}`,
			searchQuery: null
		};
	} catch (err) {
		console.error('Document load error:', err);
		throw error(404, `Document not found: ${category}/${docPath}`);
	}
};
