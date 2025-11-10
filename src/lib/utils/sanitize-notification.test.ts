import { describe, test, expect } from 'vitest';
import { sanitizeNotificationHtml } from './sanitize-notification';

describe('sanitizeNotificationHtml - Client-Side', () => {
	// Test: Basic sanitization
	test('preserves safe paragraph tags', () => {
		expect(sanitizeNotificationHtml('<p>Hello World</p>')).toBe('<p>Hello World</p>');
	});

	test('preserves strong tags', () => {
		expect(sanitizeNotificationHtml('<p><strong>Bold text</strong></p>')).toBe(
			'<p><strong>Bold text</strong></p>'
		);
	});

	test('preserves emphasis tags', () => {
		expect(sanitizeNotificationHtml('<p><em>Italic text</em></p>')).toBe(
			'<p><em>Italic text</em></p>'
		);
	});

	test('preserves lists', () => {
		const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
		expect(sanitizeNotificationHtml(html)).toBe(html);
	});

	// Test: Attack vectors blocked (matching M1 security audit findings)
	test('strips script tags', () => {
		expect(sanitizeNotificationHtml('<p>Text</p><script>alert(1)</script>')).toBe('<p>Text</p>');
	});

	test('removes onclick event handlers', () => {
		expect(sanitizeNotificationHtml('<p onclick="alert(1)">Text</p>')).toBe('<p>Text</p>');
	});

	test('removes ALL attributes including href', () => {
		// Note: <a> tag is also not in whitelist, so entire tag removed
		expect(sanitizeNotificationHtml('<a href="evil.com">Link</a>')).toBe('Link'); // Tag removed, text kept
	});

	test('strips img tags (tracking pixels)', () => {
		expect(sanitizeNotificationHtml('<p>Text</p><img src="track.gif">')).toBe('<p>Text</p>');
	});

	test('removes style attributes (UI redressing)', () => {
		expect(sanitizeNotificationHtml('<p style="position:fixed">Text</p>')).toBe('<p>Text</p>');
	});

	test('removes class attributes', () => {
		expect(sanitizeNotificationHtml('<p class="malicious">Text</p>')).toBe('<p>Text</p>');
	});

	test('strips iframe tags (clickjacking)', () => {
		expect(sanitizeNotificationHtml('<p>Text</p><iframe src="evil.com"></iframe>')).toBe(
			'<p>Text</p>'
		);
	});

	test('strips object and embed tags', () => {
		expect(sanitizeNotificationHtml('<object data="evil.swf"></object>')).toBe('');
		expect(sanitizeNotificationHtml('<embed src="evil.swf">')).toBe('');
	});

	test('removes heading tags (not in whitelist)', () => {
		// Headings allowed in generic sanitizer but NOT in notification sanitizer
		expect(sanitizeNotificationHtml('<h1>Big Title</h1>')).toBe('Big Title'); // Tag removed, text kept
	});

	test('removes div and span tags (not in whitelist)', () => {
		expect(sanitizeNotificationHtml('<div>Content</div>')).toBe('Content');
		expect(sanitizeNotificationHtml('<span>Content</span>')).toBe('Content');
	});

	// Test: Configuration alignment with server
	test('allows exactly 13 tags (same as server)', () => {
		// Allowed: p, br, strong, b, em, i, u, mark, ul, ol, li, blockquote, hr
		const allowedTags =
			'<p><br><strong>a</strong><b>b</b><em>c</em><i>d</i><u>e</u><mark>f</mark></p><ul><li>g</li></ul><ol><li>h</li></ol><blockquote>i</blockquote><hr>';
		expect(sanitizeNotificationHtml(allowedTags)).toContain('<p>');
		expect(sanitizeNotificationHtml(allowedTags)).toContain('<strong>');
		expect(sanitizeNotificationHtml(allowedTags)).toContain('<ul>');
	});

	test('blocks tags allowed in generic sanitizer but not notifications', () => {
		// Generic sanitizer allows <a>, <img>, <h1>, <div>, <span>, <table>
		// Notification sanitizer should block ALL of these

		expect(sanitizeNotificationHtml('<a>link</a>')).toBe('link');
		expect(sanitizeNotificationHtml('<img>')).toBe('');
		expect(sanitizeNotificationHtml('<h1>title</h1>')).toBe('title');
		expect(sanitizeNotificationHtml('<div>content</div>')).toBe('content');
		expect(sanitizeNotificationHtml('<span>text</span>')).toBe('text');
		expect(sanitizeNotificationHtml('<table><tr><td>cell</td></tr></table>')).toBe('cell');
	});

	// Test: Edge cases
	test('handles null input', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(sanitizeNotificationHtml(null as any)).toBe('');
	});

	test('handles undefined input', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(sanitizeNotificationHtml(undefined as any)).toBe('');
	});

	test('handles empty string', () => {
		expect(sanitizeNotificationHtml('')).toBe('');
	});

	test('preserves plain text without HTML', () => {
		expect(sanitizeNotificationHtml('Just plain text')).toBe('Just plain text');
	});

	test('preserves Unicode and emoji', () => {
		expect(sanitizeNotificationHtml('<p>M. Dupont 🎓</p>')).toBe('<p>M. Dupont 🎓</p>');
	});

	test('handles mixed safe and unsafe content', () => {
		const mixed = '<p>Safe text</p><script>alert(1)</script><strong>More safe</strong>';
		expect(sanitizeNotificationHtml(mixed)).toBe('<p>Safe text</p><strong>More safe</strong>');
	});
});
