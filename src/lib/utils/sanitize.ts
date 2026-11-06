/**
 * HTML Sanitization Utility
 *
 * SECURITY: Prevents XSS (Cross-Site Scripting) attacks
 * - Uses DOMPurify for safe HTML sanitization
 * - Whitelist-based approach (only allowed tags/attributes)
 * - Supports math rendering (MathLive)
 * - Safe for user-generated content
 *
 * USAGE:
 * ```svelte
 * <script>
 *   import { sanitizeHtml } from '$lib/utils/sanitize';
 *   let untrustedContent = '<script>alert("xss")</script><p>Safe text</p>';
 * </script>
 *
 * {@html sanitizeHtml(untrustedContent)}
 * ```
 *
 * CRITICAL: ALWAYS use sanitizeHtml() before rendering user-generated HTML with {@html}
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Configuration for educational math content
 * Allows rich text formatting + math expressions
 */
const ALLOWED_TAGS = [
	// Text formatting
	'p',
	'br',
	'strong',
	'b',
	'em',
	'i',
	'u',
	's',
	'strike',
	'del',
	'mark',
	'sub',
	'sup',
	'small',

	// Headings
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',

	// Lists
	'ul',
	'ol',
	'li',

	// Links and media
	'a',
	'img',

	// Tables (for structured data)
	'table',
	'thead',
	'tbody',
	'tr',
	'th',
	'td',

	// Math rendering (MathLive)
	'math-field',
	'math-inline',
	'math-display',

	// Structural
	'div',
	'span',
	'blockquote',
	'code',
	'pre'
];

const ALLOWED_ATTR = [
	// Links
	'href',
	'target',
	'rel',

	// Images
	'src',
	'alt',
	'title',
	'width',
	'height',

	// Styling (limited)
	'class',
	'style',

	// MathLive specific
	'read-only',
	'disabled',

	// Table attributes
	'colspan',
	'rowspan',

	// Accessibility
	'aria-label',
	'role'
];

/**
 * Sanitize HTML content for safe rendering
 *
 * @param dirty - Untrusted HTML string
 * @returns Sanitized HTML safe for {@html} rendering
 */
export function sanitizeHtml(dirty: string): string {
	if (!dirty || typeof dirty !== 'string') {
		return '';
	}

	return DOMPurify.sanitize(dirty, {
		ALLOWED_TAGS,
		ALLOWED_ATTR,
		ALLOW_DATA_ATTR: false, // Prevent data-* attributes (potential XSS vector)
		ALLOW_UNKNOWN_PROTOCOLS: false, // Only http:, https:, mailto:
		SAFE_FOR_TEMPLATES: true, // Extra protection for template contexts
		KEEP_CONTENT: true, // Keep text content even if tags are removed
		RETURN_TRUSTED_TYPE: false // Return string, not TrustedHTML
	});
}

/**
 * Sanitize HTML with relaxed math field support
 * Use for rich text editors with MathLive integration
 *
 * @param dirty - Untrusted HTML with math content
 * @returns Sanitized HTML with math field support
 */
export function sanitizeHtmlWithMath(dirty: string): string {
	if (!dirty || typeof dirty !== 'string') {
		return '';
	}

	return DOMPurify.sanitize(dirty, CONFIG_AVEC_MATH);
}

/** Réglage DOMPurify du HTML à formules (partagé avec {@link transformMathHtml}). */
const CONFIG_AVEC_MATH = {
	ALLOWED_TAGS: [...ALLOWED_TAGS, 'math-field'],
	ALLOWED_ATTR: [
		...ALLOWED_ATTR,
		'read-only',
		'value',
		'mode',
		// TipTap math extension attributes
		'latex', // Formula content attribute
		'data-math-inline', // Inline math marker
		'data-math-block' // Block math marker
	],
	ALLOW_DATA_ATTR: false, // Keep false - we explicitly allow only data-math-* above
	ALLOW_UNKNOWN_PROTOCOLS: false,
	SAFE_FOR_TEMPLATES: true,
	KEEP_CONTENT: true
};

/**
 * Sanitize plain text (strip all HTML)
 * Use for contexts where no HTML should be allowed
 *
 * @param dirty - Untrusted string
 * @returns Plain text with all HTML removed
 */
export function sanitizePlainText(dirty: string): string {
	if (!dirty || typeof dirty !== 'string') {
		return '';
	}

	return DOMPurify.sanitize(dirty, {
		ALLOWED_TAGS: [], // No tags allowed
		ALLOWED_ATTR: [],
		KEEP_CONTENT: true // Keep text content
	});
}

/**
 * Transform TipTap math HTML to renderable math-field elements
 *
 * TipTap serializes math nodes as:
 * - <span data-math-inline latex="x^2"></span>
 * - <div data-math-block latex="x^2"></div>
 *
 * This transforms them to MathLive elements:
 * - <span class="math-inline-wrapper"><math-field read-only>x^2</math-field></span>
 * - <div class="math-block-wrapper"><math-field read-only>x^2</math-field></div>
 *
 * @param html - HTML from RichTextEditor
 * @returns HTML with math-field elements for display
 */
export function transformMathHtml(html: string): string {
	if (!html || typeof html !== 'string') {
		return '';
	}

	// Assaini d'abord, rendu en ARBRE : les formules sont remplacées dans le DOM, jamais
	// par expression sur le texte HTML. Les expressions d'avant parcouraient les attributs
	// avec `[^>]*` ; or jsdom (rendu serveur) n'échappe pas `>` dans une valeur
	// d'attribut — `title="></span><img onerror=…>"` fermait la balise à tort et le reste
	// sortait en vrai HTML (XSS stocké, audit de #2425). Et `latex` n'était lu que juste
	// après le marqueur, alors que l'éditeur l'écrit en dernier : formules vides.
	const fragment = DOMPurify.sanitize(html, {
		...CONFIG_AVEC_MATH,
		RETURN_DOM_FRAGMENT: true
	}) as DocumentFragment;

	// Document inerte : un `math-field` créé là n'est pas un élément MathLive actif
	const inerte = (fragment.ownerDocument ?? document).implementation.createHTMLDocument('');
	const conteneur = inerte.createElement('div');
	conteneur.appendChild(inerte.importNode(fragment, true));

	const formules = conteneur.querySelectorAll('span[data-math-inline], div[data-math-block]');
	for (const formule of formules) {
		// Comme avant : seule une formule de TipTap, élément vide, est remplacée
		if (formule.childNodes.length > 0) continue;
		const enLigne = formule.tagName === 'SPAN';
		const enveloppe = inerte.createElement(enLigne ? 'span' : 'div');
		enveloppe.className = enLigne ? 'math-inline-wrapper' : 'math-block-wrapper';
		const champ = inerte.createElement('math-field');
		champ.setAttribute('read-only', '');
		// Texte, pas HTML : la sérialisation échappe `<`, `>`, `&`
		champ.textContent = formule.getAttribute('latex') ?? '';
		enveloppe.appendChild(champ);
		formule.replaceWith(enveloppe);
	}

	return conteneur.innerHTML;
}

/** Schémas d'URL autorisés dans un lien ; un lien relatif (sans schéma) passe aussi */
const SAFE_URL_SCHEMES: ReadonlySet<string> = new Set(['http', 'https', 'mailto']);

/**
 * Un lien sûr, ou '#' : schémas autorisés (`SAFE_URL_SCHEMES`) ou lien relatif.
 *
 * @param url - URL string to sanitize
 * @returns The URL unchanged if safe, '#' otherwise
 */
export function sanitizeUrl(url: string | undefined): string {
	if (!url || typeof url !== 'string') {
		return '#';
	}

	// Ce que le NAVIGATEUR lira : il retire espaces et caractères de contrôle en
	// tête, et tabulations / retours à la ligne partout (`java\nscript:` devient
	// `javascript:`). On décide sur cette forme-là, pas sur la chaîne écrite.
	// eslint-disable-next-line no-control-regex
	const normalized = url.replace(/^[\u0000-\u0020]+/, '').replace(/[\t\n\r]/g, '');

	// Un schéma explicite (`xxx:`) doit être dans la liste BLANCHE. Une liste
	// noire (`javascript:`, `data:`…) laisse passer ce qu'on n'a pas prévu.
	const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(normalized)?.[1].toLowerCase();
	if (scheme !== undefined && !SAFE_URL_SCHEMES.has(scheme)) {
		return '#';
	}

	return url;
}

/**
 * Check if string contains potentially dangerous HTML
 * Use for validation before sanitization
 *
 * @param input - String to check
 * @returns true if input contains script/dangerous tags
 */
export function containsDangerousHtml(input: string): boolean {
	if (!input || typeof input !== 'string') {
		return false;
	}

	// Check for dangerous patterns
	const dangerousPatterns = [
		/<script/i,
		/<iframe/i,
		/<object/i,
		/<embed/i,
		/<link/i,
		/javascript:/i,
		/on\w+\s*=/i, // Event handlers (onclick, onload, etc.)
		/<meta/i
	];

	return dangerousPatterns.some((pattern) => pattern.test(input));
}
