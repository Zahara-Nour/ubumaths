/**
 * `sanitizeUrl` : seuls les liens sûrs sortent (liste BLANCHE).
 *
 * L'ancienne liste noire (`startsWith('javascript:')`) se contournait : le
 * navigateur retire tabulations, retours à la ligne et caractères de contrôle
 * d'une URL, donc `java\nscript:alert(1)` passait le test ET s'exécutait.
 */
import { describe, expect, it } from 'vitest';
import { sanitizeUrl } from '../sanitize';

describe('sanitizeUrl — liens acceptés', () => {
	it.each([
		'https://chiph.re/cours',
		'http://exemple.fr/page?x=1#ancre',
		'mailto:prof@exemple.fr',
		'/dashboard/eleve',
		'#section-2',
		'?page=3',
		'page-relative',
		'//cdn.exemple.fr/a.png'
	])('garde « %s »', (url) => {
		expect(sanitizeUrl(url)).toBe(url);
	});
});

describe('sanitizeUrl — liens refusés', () => {
	it.each([
		'javascript:alert(1)',
		'JavaScript:alert(1)',
		'  javascript:alert(1)',
		'java\nscript:alert(1)',
		'java\tscript:alert(1)',
		'\u0001javascript:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'vbscript:msgbox(1)',
		'file:///etc/passwd',
		'blob:https://x/abc'
	])('neutralise %j', (url) => {
		expect(sanitizeUrl(url)).toBe('#');
	});

	it('neutralise une valeur vide ou absente', () => {
		expect(sanitizeUrl('')).toBe('#');
		expect(sanitizeUrl(undefined)).toBe('#');
	});
});
