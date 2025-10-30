import { slugify } from './string';

/**
 * Add IDs to headers in HTML for anchor links
 * Client-safe utility (no Node.js dependencies)
 */
export function addHeaderIds(html: string): string {
	const usedIds = new Set<string>();

	return html.replace(/<h([2-6])>(.*?)<\/h\1>/g, (match, level, content) => {
		const text = content.replace(/<[^>]*>/g, '').trim();
		const id = slugify(text);

		// Ensure unique ID by appending number if needed
		let uniqueId = id;
		let counter = 1;
		while (usedIds.has(uniqueId)) {
			uniqueId = `${id}-${counter}`;
			counter++;
		}
		usedIds.add(uniqueId);

		return `<h${level} id="${uniqueId}">${content}</h${level}>`;
	});
}
