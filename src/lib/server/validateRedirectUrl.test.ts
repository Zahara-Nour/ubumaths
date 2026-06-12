import { describe, it, expect } from 'vitest';
import { validateRedirectUrl } from './validateRedirectUrl';

const ORIGIN = 'https://app.example.com';

describe('validateRedirectUrl', () => {
	it('autorise les chemins relatifs (avec query string)', () => {
		expect(validateRedirectUrl('/dashboard', ORIGIN)).toBe('/dashboard');
		expect(validateRedirectUrl('/auth/login?error=x', ORIGIN)).toBe('/auth/login?error=x');
	});

	it('autorise les URLs absolues de meme origine', () => {
		expect(validateRedirectUrl('https://app.example.com/x', ORIGIN)).toBe(
			'https://app.example.com/x'
		);
	});

	it('rejette les redirections protocol-relative (//evil.com) -> /', () => {
		expect(validateRedirectUrl('//evil.com', ORIGIN)).toBe('/');
		expect(validateRedirectUrl('//evil.com/path', ORIGIN)).toBe('/');
	});

	it('rejette les origines externes (et les sous-domaines pieges) -> /', () => {
		expect(validateRedirectUrl('https://evil.com/phish', ORIGIN)).toBe('/');
		expect(validateRedirectUrl('https://app.example.com.evil.com', ORIGIN)).toBe('/');
	});

	it('rejette les schemes/URLs malformes -> /', () => {
		expect(validateRedirectUrl('javascript:alert(1)', ORIGIN)).toBe('/');
		expect(validateRedirectUrl('not a url', ORIGIN)).toBe('/');
	});
});
