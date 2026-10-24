/**
 * Retour après l'élévation admin (`safeElevationRedirect`)
 * ========================================================
 *
 * Seules les sections gardées par l'élévation sont des retours admis : l'admin
 * (`/dashboard/admin`) et, depuis le chantier demo-debug, les pages de dev (`/dev`).
 * Tout le reste retombe sur l'accueil admin (pas de redirection ouverte).
 */
import { describe, it, expect } from 'vitest';
import { safeElevationRedirect } from '../elevation-redirect';

describe('safeElevationRedirect', () => {
	it('garde une page de l’admin', () => {
		expect(safeElevationRedirect('/dashboard/admin')).toBe('/dashboard/admin');
		expect(safeElevationRedirect('/dashboard/admin/users')).toBe('/dashboard/admin/users');
	});

	it('garde une page de dev', () => {
		expect(safeElevationRedirect('/dev')).toBe('/dev');
		expect(safeElevationRedirect('/dev/polices')).toBe('/dev/polices');
	});

	it('refuse le reste : accueil admin', () => {
		expect(safeElevationRedirect(null)).toBe('/dashboard/admin');
		expect(safeElevationRedirect('')).toBe('/dashboard/admin');
		expect(safeElevationRedirect('https://evil.example/dev')).toBe('/dashboard/admin');
		expect(safeElevationRedirect('//evil.example/dev')).toBe('/dashboard/admin');
		expect(safeElevationRedirect('/devoirs')).toBe('/dashboard/admin');
		expect(safeElevationRedirect('/dashboard/administration')).toBe('/dashboard/admin');
		expect(safeElevationRedirect('/aide-ecriture')).toBe('/dashboard/admin');
	});
});
