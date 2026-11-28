import { readdir, readFile } from 'fs/promises';
import { join, resolve, sep } from 'path';
import type { DocumentMetadata } from './markdown-parser';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('server/docs-scanner');

export interface DocCategory {
	name: string;
	icon: string;
	path: string;
	docs: DocumentMetadata[];
}

const DOCS_ROOT = join(process.cwd(), 'docs');

/**
 * Rubriques connues : les dossiers de `docs/` (README de `docs/`), dans
 * l'ordre de la barre de navigation. Un autre dossier vient après, sous son nom.
 */
const CATEGORY_CONFIG: Record<string, { name: string; icon: string; order: number }> = {
	systeme: { name: 'Système', icon: '🏗️', order: 1 },
	pratiques: { name: 'Pratiques', icon: '🛠️', order: 2 },
	adr: { name: 'Décisions (ADR)', icon: '📜', order: 3 },
	wip: { name: 'Chantiers en cours', icon: '🚧', order: 4 },
	archive: { name: 'Archives', icon: '📦', order: 5 }
};

const DEFAULT_CATEGORY_ORDER = 99;

/** Nom affiché d'une rubrique, d'après son dossier. */
export function docCategoryName(dirName: string): string {
	return CATEGORY_CONFIG[dirName]?.name ?? dirName.charAt(0).toUpperCase() + dirName.slice(1);
}

/** Rubriques connues d'abord, dans leur ordre ; les autres ensuite, par nom. */
export function orderDocCategories(categories: DocCategory[]): DocCategory[] {
	const order = (c: DocCategory) => CATEGORY_CONFIG[c.path]?.order ?? DEFAULT_CATEGORY_ORDER;
	return [...categories].sort((a, b) => order(a) - order(b) || a.path.localeCompare(b.path));
}

/** Minuscules, sans accents : « Données » et « donnees » se trouvent l'un l'autre. */
function normalizeForSearch(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
}

/**
 * Filtre de la recherche (V116) : garde les docs dont le titre ou le chemin
 * (`<rubrique>/<fichier>`) contient le texte cherché ; une rubrique sans doc
 * retenue disparaît. Sans texte, tout est gardé.
 */
export function filterDocCategories(
	categories: DocCategory[],
	query: string | null
): DocCategory[] {
	const needle = normalizeForSearch(query?.trim() ?? '');
	if (!needle) return categories;
	return categories
		.map((category) => ({
			...category,
			docs: category.docs.filter((doc) =>
				[doc.title, `${category.path}/${doc.path}`].some((text) =>
					normalizeForSearch(text).includes(needle)
				)
			)
		}))
		.filter((category) => category.docs.length > 0);
}

/**
 * Scan docs directory and return categorized document list
 */
export async function scanDocumentation(): Promise<DocCategory[]> {
	const categories: DocCategory[] = [];

	// Scan each top-level category
	const entries = await readdir(DOCS_ROOT, { withFileTypes: true });

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		const categoryName = entry.name;
		const categoryPath = join(DOCS_ROOT, categoryName);
		const docs = await scanCategory(categoryPath, categoryName);

		if (docs.length > 0) {
			categories.push({
				name: docCategoryName(categoryName),
				icon: CATEGORY_CONFIG[categoryName]?.icon ?? '📄',
				path: categoryName,
				docs
			});
		}
	}

	return orderDocCategories(categories);
}

/**
 * Recursively scan a category directory
 */
async function scanCategory(
	dirPath: string,
	categoryName: string,
	relativePath = ''
): Promise<DocumentMetadata[]> {
	const docs: DocumentMetadata[] = [];

	try {
		const entries = await readdir(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dirPath, entry.name);
			const docPath = join(relativePath, entry.name);

			if (entry.isDirectory()) {
				// Recursively scan subdirectories
				const subDocs = await scanCategory(fullPath, categoryName, docPath);
				docs.push(...subDocs);
			} else if (entry.name.endsWith('.md')) {
				// Read file to extract metadata
				const content = await readFile(fullPath, 'utf-8');
				const metadata = extractQuickMetadata(content, categoryName, docPath);
				docs.push(metadata);
			}
		}
	} catch (error) {
		logger.error(`Error scanning ${dirPath}:`, error);
	}

	// Sort: README first, then by depth (shallower first), then alphabetically
	return docs.sort((a, b) => {
		// README files always first
		const aIsReadme = a.path.endsWith('README.md');
		const bIsReadme = b.path.endsWith('README.md');
		if (aIsReadme && !bIsReadme) return -1;
		if (!aIsReadme && bIsReadme) return 1;

		// Then sort by depth (number of slashes)
		const aDepth = (a.path.match(/\//g) || []).length;
		const bDepth = (b.path.match(/\//g) || []).length;
		if (aDepth !== bDepth) return aDepth - bDepth;

		// Finally alphabetically
		return a.title.localeCompare(b.title);
	});
}

/**
 * Quick metadata extraction without full parsing
 */
function extractQuickMetadata(content: string, category: string, path: string): DocumentMetadata {
	// Extract title - prefer ## heading over # if first is a filename
	const h1Match = content.match(/^#\s+(.+)$/m);
	const h1Title = h1Match ? h1Match[1].replace(/\p{Emoji}/gu, '').trim() : null;

	// If H1 looks like a filename (contains .md or _), try to find a better H2
	let title = h1Title || path.replace('.md', '');
	if (h1Title && (h1Title.includes('.md') || h1Title.includes('_'))) {
		const h2Match = content.match(/^##\s+(.+)$/m);
		if (h2Match) {
			title = h2Match[1].replace(/\p{Emoji}/gu, '').trim();
		}
	}

	// Extract status
	const statusMatch = content.match(/\*\*Status\*\*\s*:\s*(.+)/);
	const status = statusMatch ? statusMatch[1].trim() : undefined;

	// Extract last updated
	const dateMatch = content.match(/\*\*(?:Last Updated|Dernière mise à jour)\*\*\s*:\s*(.+)/i);
	const lastUpdated = dateMatch ? dateMatch[1].trim() : undefined;

	return {
		path,
		title,
		category: category.charAt(0).toUpperCase() + category.slice(1),
		status,
		lastUpdated
	};
}

/**
 * Get full document content
 */
export async function getDocumentContent(categoryPath: string, docPath: string): Promise<string> {
	// SECURITY (finding M7): the [...path] URL param feeds this; `..` segments (or
	// %2e%2e decoded by SvelteKit) would escape DOCS_ROOT (LFI). Resolve and assert
	// containment before reading.
	const root = resolve(DOCS_ROOT);
	const fullPath = resolve(root, categoryPath, docPath);
	if (fullPath !== root && !fullPath.startsWith(root + sep)) {
		throw new Error(`Invalid document path: ${categoryPath}/${docPath}`);
	}

	try {
		return await readFile(fullPath, 'utf-8');
	} catch {
		throw new Error(`Document not found: ${categoryPath}/${docPath}`);
	}
}
