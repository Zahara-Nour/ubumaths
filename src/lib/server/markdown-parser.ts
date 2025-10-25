import { marked } from 'marked';
import hljs from 'highlight.js';

// Configure marked
marked.setOptions({
	gfm: true, // GitHub Flavored Markdown
	breaks: true // Convert \n to <br>
});

// Custom renderer with syntax highlighting and link fixing
const renderer = new marked.Renderer();

renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
	if (lang && hljs.getLanguage(lang)) {
		try {
			const highlighted = hljs.highlight(text, { language: lang }).value;
			return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
		} catch (err) {
			console.error('Highlight error:', err);
		}
	}
	const autoHighlighted = hljs.highlightAuto(text).value;
	return `<pre><code class="hljs">${autoHighlighted}</code></pre>`;
};

// Fix relative markdown links to absolute doc paths
renderer.link = function ({
	href,
	title,
	text
}: {
	href: string;
	title?: string | null;
	text: string;
}) {
	// Transform relative .md links to absolute doc paths
	if (href && href.endsWith('.md') && !href.startsWith('http') && !href.startsWith('/')) {
		// Remove .md extension and prepend /dashboard/admin/docs/
		const cleanHref = href.replace(/\.md$/, '');
		href = `/dashboard/admin/docs/${cleanHref}`;
	}

	const titleAttr = title ? ` title="${title}"` : '';
	return `<a href="${href}"${titleAttr}>${text}</a>`;
};

marked.setOptions({ renderer });

export interface DocumentMetadata {
	path: string;
	title: string;
	category: string;
	status?: string;
	lastUpdated?: string;
}

export interface ParsedDocument {
	html: string;
	metadata: DocumentMetadata;
	toc: TableOfContentsItem[];
}

export interface TableOfContentsItem {
	id: string;
	text: string;
	level: number;
}

/**
 * Parse markdown content to HTML with metadata extraction
 */
export async function parseMarkdown(content: string, filePath: string): Promise<ParsedDocument> {
	// Extract metadata from frontmatter or content
	const metadata = extractMetadata(content, filePath);

	// Generate table of contents
	const toc = generateTableOfContents(content);

	// Parse markdown to HTML
	const html = await marked.parse(content);

	return {
		html,
		metadata,
		toc
	};
}

/**
 * Extract metadata from markdown content
 */
function extractMetadata(content: string, filePath: string): DocumentMetadata {
	// Extract title (first # heading)
	const titleMatch = content.match(/^#\s+(.+)$/m);
	const title = titleMatch ? titleMatch[1].replace(/\p{Emoji}/gu, '').trim() : 'Untitled';

	// Extract status if present
	const statusMatch = content.match(/\*\*Status\*\*\s*:\s*(.+)/);
	const status = statusMatch ? statusMatch[1].trim() : undefined;

	// Extract last updated date if present
	const dateMatch = content.match(/\*\*Last Updated\*\*\s*:\s*(.+)/i);
	const lastUpdated = dateMatch ? dateMatch[1].trim() : undefined;

	// Determine category from file path
	const category = extractCategory(filePath);

	return {
		path: filePath,
		title,
		category,
		status,
		lastUpdated
	};
}

/**
 * Extract category from file path
 */
function extractCategory(filePath: string): string {
	const parts = filePath.split('/');

	if (parts.includes('features')) return 'Features';
	if (parts.includes('architecture')) return 'Architecture';
	if (parts.includes('guides')) return 'Guides';
	if (parts.includes('development')) return 'Development';
	if (parts.includes('contributing')) return 'Contributing';

	return 'Documentation';
}

/**
 * Generate table of contents from markdown headers
 */
function generateTableOfContents(content: string): TableOfContentsItem[] {
	const toc: TableOfContentsItem[] = [];
	const headerRegex = /^(#{1,6})\s+(.+)$/gm;
	const usedIds = new Set<string>();

	let match;
	while ((match = headerRegex.exec(content)) !== null) {
		const level = match[1].length;
		const text = match[2].replace(/\p{Emoji}/gu, '').trim();

		// Skip level 1 headers (main title)
		if (level === 1) continue;

		// Generate ID from text (slugify)
		const id = text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');

		// Ensure unique ID by appending number if needed
		let uniqueId = id;
		let counter = 1;
		while (usedIds.has(uniqueId)) {
			uniqueId = `${id}-${counter}`;
			counter++;
		}
		usedIds.add(uniqueId);

		toc.push({ id: uniqueId, text, level });
	}

	return toc;
}

// Re-export from shared utility
export { addHeaderIds } from '$lib/utils/markdown';
