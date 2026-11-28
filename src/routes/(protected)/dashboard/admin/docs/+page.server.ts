import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin } from '#lib/server/middleware/auth.ts';
import { filterDocCategories, scanDocumentation } from '#lib/server/docs-scanner.ts';
import { parseMarkdown } from '#lib/server/markdown-parser.ts';
import { readFile } from 'fs/promises';
import { join } from 'path';

const searchQuerySchema = z.string().trim().max(100);

export const load: PageServerLoad = async ({ locals, url }) => {
	// Admin gate (admin login OR step-up elevation)
	await requireAdmin(locals);

	// Recherche : filtre sur le titre et le chemin des docs (V116), bornée
	// comme le champ de saisie
	const parsed = searchQuerySchema.safeParse(url.searchParams.get('q') ?? '');
	if (!parsed.success) error(400, 'Recherche trop longue (100 caractères au plus)');
	const searchQuery = parsed.data || null;
	const categories = filterDocCategories(await scanDocumentation(), searchQuery);

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
