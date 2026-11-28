import { describe, test, expect } from 'vitest';
import { escapeHtml } from '../html-escape';

describe('escapeHtml', () => {
	test('escapes < and >', () => {
		expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
	});

	test('escapes ampersands', () => {
		expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
	});

	test('escapes double quotes', () => {
		expect(escapeHtml('"Hello World"')).toBe('&quot;Hello World&quot;');
	});

	test('escapes single quotes', () => {
		expect(escapeHtml("'Hello World'")).toBe('&#039;Hello World&#039;');
	});

	test('handles null', () => {
		expect(escapeHtml(null)).toBe('');
	});

	test('handles undefined', () => {
		expect(escapeHtml(undefined)).toBe('');
	});

	test('handles empty string', () => {
		expect(escapeHtml('')).toBe('');
	});

	test('handles numbers', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(escapeHtml(42 as any)).toBe('42');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(escapeHtml(0 as any)).toBe('0');
	});

	test('handles booleans', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(escapeHtml(true as any)).toBe('true');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(escapeHtml(false as any)).toBe('false');
	});

	test('preserves safe text', () => {
		expect(escapeHtml('Hello World')).toBe('Hello World');
	});

	test('preserves Unicode and emoji', () => {
		expect(escapeHtml('Hello 🎓 World')).toBe('Hello 🎓 World');
		expect(escapeHtml('M. Dupont')).toBe('M. Dupont');
	});

	test('escapes mixed content', () => {
		expect(escapeHtml('Hello <b>World</b> & "Friends"')).toBe(
			'Hello &lt;b&gt;World&lt;/b&gt; &amp; &quot;Friends&quot;'
		);
	});

	test('handles complex XSS payload (template injection)', () => {
		const payload = `</strong><script>alert('xss')</script><strong>`;
		expect(escapeHtml(payload)).toBe(
			'&lt;/strong&gt;&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;&lt;strong&gt;'
		);
	});

	test('handles OWASP XSS vector: img onerror', () => {
		const payload = `<img src=x onerror=alert(1)>`;
		expect(escapeHtml(payload)).toBe('&lt;img src=x onerror=alert(1)&gt;');
	});

	test('handles OWASP XSS vector: javascript URL', () => {
		const payload = `javascript:alert(1)`;
		expect(escapeHtml(payload)).toBe('javascript:alert(1)'); // No HTML chars
	});

	test('handles OWASP XSS vector: event handler', () => {
		const payload = `" onclick="alert(1)`;
		expect(escapeHtml(payload)).toBe('&quot; onclick=&quot;alert(1)');
	});
});
