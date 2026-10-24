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
		expect(safeElevationRedirect('/dev/polices?x=..')).toBe('/dev/polices?x=..');
		expect(safeElevationRedirect('/dev/fichier.v2')).toBe('/dev/fichier.v2');
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

	it('refuse les segments « . » et « .. » et la barre oblique inverse (sortie de section)', () => {
		expect(safeElevationRedirect('/dev/../api/account/delete')).toBe('/dashboard/admin');
		expect(safeElevationRedirect('/dev/..//evil.example')).toBe('/dashboard/admin');
		expect(safeElevationRedirect('/dashboard/admin/../../auth/logout')).toBe('/dashboard/admin');
		expect(safeElevationRedirect('/dev/./polices')).toBe('/dashboard/admin');
		expect(safeElevationRedirect('/dev/%2e%2e/api/x')).toBe('/dashboard/admin');
		expect(safeElevationRedirect('/dev/.%2E/api/x')).toBe('/dashboard/admin');
		expect(safeElevationRedirect('/dev/\\evil.example')).toBe('/dashboard/admin');
	});
});
