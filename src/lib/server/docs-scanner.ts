import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { DocumentMetadata } from './markdown-parser';

export interface DocCategory {
	name: string;
	icon: string;
	path: string;
	docs: DocumentMetadata[];
}

const DOCS_ROOT = join(process.cwd(), 'docs');

const CATEGORY_CONFIG: Record<string, { icon: string; order: number }> = {
	features: { icon: '🎯', order: 1 },
	architecture: { icon: '🏗️', order: 2 },
	guides: { icon: '📖', order: 3 },
	development: { icon: '🛠️', order: 4 },
	contributing: { icon: '🤝', order: 5 },
	archive: { icon: '📦', order: 6 }
};

/**
 * Scan docs directory and return categorized document list
 */
export async function scanDocumentation(): Promise<DocCategory[]> {
	const categories: Map<string, DocCategory> = new Map();

	// Scan each top-level category
	const entries = await readdir(DOCS_ROOT, { withFileTypes: true });

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		const categoryName = entry.name;
		const categoryPath = join(DOCS_ROOT, categoryName);
		const config = CATEGORY_CONFIG[categoryName] || { icon: '📄', order: 99 };

		const docs = await scanCategory(categoryPath, categoryName);

		if (docs.length > 0) {
			categories.set(categoryName, {
				name: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
				icon: config.icon,
				path: categoryName,
				docs
			});
		}
	}

	// Sort by order
	return Array.from(categories.values()).sort((a, b) => {
		const orderA = CATEGORY_CONFIG[a.path.toLowerCase()]?.order || 99;
		const orderB = CATEGORY_CONFIG[b.path.toLowerCase()]?.order || 99;
		return orderA - orderB;
	});
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
		console.error(`Error scanning ${dirPath}:`, error);
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
	const fullPath = join(DOCS_ROOT, categoryPath, docPath);

	try {
		return await readFile(fullPath, 'utf-8');
	} catch {
		throw new Error(`Document not found: ${categoryPath}/${docPath}`);
	}
}

/**
 * Search documentation by query
 */
export async function searchDocumentation(query: string): Promise<DocumentMetadata[]> {
	const allCategories = await scanDocumentation();
	const allDocs = allCategories.flatMap((cat) => cat.docs);

	const lowerQuery = query.toLowerCase();

	return allDocs.filter((doc) => {
		return (
			doc.title.toLowerCase().includes(lowerQuery) ||
			doc.path.toLowerCase().includes(lowerQuery) ||
			doc.category.toLowerCase().includes(lowerQuery)
		);
	});
}
