/**
 * Thème d'une diapositive d'après son fond (chantier demo-debug, PR 6i-b)
 */
import { describe, it, expect } from 'vitest';
import { slideColorScheme } from '../slide-theme';

describe('slideColorScheme', () => {
	it('déduit le thème d’un fond de couleur unie', () => {
		expect(slideColorScheme({ background: '#1a1a2e' })).toBe('dark');
		expect(slideColorScheme({ background: '#000' })).toBe('dark');
		expect(slideColorScheme({ background: '#ffffff' })).toBe('light');
		expect(slideColorScheme({ background: '#ddd' })).toBe('light');
		expect(slideColorScheme({ background: '#4a1942' })).toBe('dark');
		expect(slideColorScheme({ background: '#e94560' })).toBe('light');
		expect(slideColorScheme({ background: 'rgb(30, 58, 95)' })).toBe('dark');
		expect(slideColorScheme({ background: 'rgba(255, 255, 255, 1)' })).toBe('light');
		expect(slideColorScheme({ background: ' WHITE ' })).toBe('light');
		expect(slideColorScheme({ background: 'black' })).toBe('dark');
	});

	it('le thème imposé l’emporte sur le fond', () => {
		expect(slideColorScheme({ background: '#ffffff', theme: 'sombre' })).toBe('dark');
		expect(slideColorScheme({ background: '#000000', theme: 'clair' })).toBe('light');
		expect(slideColorScheme({ backgroundImage: 'photo.jpg', theme: 'sombre' })).toBe('dark');
		expect(slideColorScheme({ theme: 'clair' })).toBe('light');
	});

	it('suit le site quand la diapositive n’a pas de fond', () => {
		expect(slideColorScheme({})).toBe('site');
	});

	it('ne devine rien sous un dégradé, une image, une vidéo ou une page', () => {
		expect(slideColorScheme({ background: 'linear-gradient(to bottom, #283b95, #17b2c3)' })).toBe(
			'unknown'
		);
		expect(slideColorScheme({ background: 'var(--fond)' })).toBe('unknown');
		expect(slideColorScheme({ background: 'hsl(200 50% 20%)' })).toBe('unknown');
		expect(slideColorScheme({ background: 'transparent' })).toBe('unknown');
		expect(slideColorScheme({ background: '#00000080' })).toBe('unknown');
		expect(slideColorScheme({ background: '#000', backgroundImage: 'photo.jpg' })).toBe('unknown');
		expect(slideColorScheme({ backgroundVideo: 'film.mp4' })).toBe('unknown');
		expect(slideColorScheme({ backgroundIframe: 'https://example.org' })).toBe('unknown');
	});
});
