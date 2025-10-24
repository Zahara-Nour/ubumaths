/**
 * Add IDs to headers in HTML for anchor links
 * Client-safe utility (no Node.js dependencies)
 */
export function addHeaderIds(html: string): string {
	return html.replace(/<h([2-6])>(.*?)<\/h\1>/g, (match, level, content) => {
		const text = content.replace(/<[^>]*>/g, '').trim();
		const id = text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');

		return `<h${level} id="${id}">${content}</h${level}>`;
	});
}
