/**
 * Tests for server-side HTML sanitization
 *
 * Critical security tests for XSS prevention in notifications
 */

import { describe, it, expect } from 'vitest';
import { sanitizeNotificationHtml, containsDangerousHtml } from './sanitization';

describe('sanitizeNotificationHtml', () => {
	it('should strip script tags', () => {
		const malicious = '<p>Hello</p><script>alert("xss")</script>';
		const result = sanitizeNotificationHtml(malicious);

		expect(result).not.toContain('<script>');
		expect(result).not.toContain('alert');
		expect(result).toContain('<p>Hello</p>');
	});

	it('should remove all event handler attributes', () => {
		const malicious = '<p onclick="steal()">Click me</p>';
		const result = sanitizeNotificationHtml(malicious);

		expect(result).not.toContain('onclick');
		expect(result).not.toContain('steal');
		expect(result).toBe('<p>Click me</p>');
	});

	it('should remove href attributes (no links allowed)', () => {
		const html = '<p><a href="http://phishing.com">Click</a></p>';
		const result = sanitizeNotificationHtml(html);

		expect(result).not.toContain('href');
		expect(result).not.toContain('phishing');
	});

	it('should preserve safe HTML tags', () => {
		const safe = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
		const result = sanitizeNotificationHtml(safe);

		expect(result).toBe(safe);
	});

	it('should preserve lists', () => {
		const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
		const result = sanitizeNotificationHtml(html);

		expect(result).toBe(html);
	});

	it('should handle plain text', () => {
		const plain = 'Just plain text, no HTML';
		const result = sanitizeNotificationHtml(plain);

		expect(result).toBe(plain);
	});

	it('should handle empty input', () => {
		expect(sanitizeNotificationHtml('')).toBe('');
		expect(sanitizeNotificationHtml(null as unknown as string)).toBe('');
		expect(sanitizeNotificationHtml(undefined as unknown as string)).toBe('');
	});

	it('should strip iframe tags (clickjacking)', () => {
		const malicious = '<p>Text</p><iframe src="http://evil.com"></iframe>';
		const result = sanitizeNotificationHtml(malicious);

		expect(result).not.toContain('<iframe>');
		expect(result).not.toContain('evil.com');
		expect(result).toContain('<p>Text</p>');
	});

	it('should strip object and embed tags', () => {
		const malicious = '<object data="malware.swf"></object><embed src="evil.swf">';
		const result = sanitizeNotificationHtml(malicious);

		expect(result).not.toContain('<object>');
		expect(result).not.toContain('<embed>');
		expect(result).not.toContain('malware');
		expect(result).not.toContain('evil');
	});

	it('should handle mixed safe and malicious content', () => {
		const mixed =
			'<p><strong>Safe</strong> text</p><script>alert("xss")</script><ul><li>Item</li></ul>';
		const result = sanitizeNotificationHtml(mixed);

		expect(result).toContain('<p><strong>Safe</strong> text</p>');
		expect(result).toContain('<ul><li>Item</li></ul>');
		expect(result).not.toContain('<script>');
		expect(result).not.toContain('alert');
	});

	it('should strip style attributes (CSS injection)', () => {
		const html = '<p style="background: url(javascript:alert())">Text</p>';
		const result = sanitizeNotificationHtml(html);

		expect(result).not.toContain('style');
		expect(result).not.toContain('javascript');
		expect(result).toBe('<p>Text</p>');
	});

	it('should strip script tags completely (including content)', () => {
		const html = '<p>Before</p><script>alert("xss")</script><p>After</p>';
		const result = sanitizeNotificationHtml(html);

		// DOMPurify removes script tags AND their content for security
		expect(result).toContain('Before');
		expect(result).toContain('After');
		expect(result).not.toContain('alert'); // Script content removed (SECURITY)
		expect(result).not.toContain('<script>'); // Tag removed
		expect(result).toBe('<p>Before</p><p>After</p>');
	});

	it('should handle non-string input gracefully', () => {
		expect(sanitizeNotificationHtml(123 as unknown as string)).toBe('');
		expect(sanitizeNotificationHtml({} as unknown as string)).toBe('');
		expect(sanitizeNotificationHtml([] as unknown as string)).toBe('');
	});
});

describe('containsDangerousHtml', () => {
	it('should detect script tags', () => {
		expect(containsDangerousHtml('<script>alert("xss")</script>')).toBe(true);
		expect(containsDangerousHtml('<SCRIPT>alert("xss")</SCRIPT>')).toBe(true);
	});

	it('should detect event handlers', () => {
		expect(containsDangerousHtml('<p onclick="steal()">Text</p>')).toBe(true);
		expect(containsDangerousHtml('<img onerror="alert()" src="x">')).toBe(true);
		expect(containsDangerousHtml('<body onload="hack()">')).toBe(true);
	});

	it('should detect iframe tags', () => {
		expect(containsDangerousHtml('<iframe src="http://evil.com"></iframe>')).toBe(true);
	});

	it('should detect javascript: protocol', () => {
		expect(containsDangerousHtml('<a href="javascript:alert()">Click</a>')).toBe(true);
	});

	it('should detect data: URLs with HTML', () => {
		expect(containsDangerousHtml('<img src="data:text/html,<script>alert()</script>">')).toBe(true);
	});

	it('should return false for safe HTML', () => {
		expect(containsDangerousHtml('<p><strong>Bold</strong> text</p>')).toBe(false);
		expect(containsDangerousHtml('<ul><li>Item</li></ul>')).toBe(false);
		expect(containsDangerousHtml('Plain text')).toBe(false);
	});

	it('should handle empty input', () => {
		expect(containsDangerousHtml('')).toBe(false);
		expect(containsDangerousHtml(null as unknown as string)).toBe(false);
		expect(containsDangerousHtml(undefined as unknown as string)).toBe(false);
	});
});
