import { describe, expect, it } from 'vitest';
import { isNavItemActive } from '../public-nav-items.ts';

describe('isNavItemActive', () => {
	it('surligne le lien de la page même', () => {
		expect(isNavItemActive('/shtam', '/shtam')).toBe(true);
	});

	it("surligne le lien parent d'une sous-page (article du Shtam)", () => {
		expect(isNavItemActive('/shtam', '/shtam/un-article')).toBe(true);
	});

	it("ne surligne pas un lien qui n'est qu'un début de mot", () => {
		expect(isNavItemActive('/shtam', '/shtamboul')).toBe(false);
	});

	it("« Accueil » n'est surligné que sur la page d'accueil", () => {
		expect(isNavItemActive('/', '/')).toBe(true);
		expect(isNavItemActive('/', '/shtam')).toBe(false);
	});
});
