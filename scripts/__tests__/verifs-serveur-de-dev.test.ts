import { describe, expect, it } from 'vitest';
import { devServerCommand, devServerCommandFromPackage } from '../../e2e/verifs/serveur-de-dev';

// Défaut 9 du chantier `verifs-auto` : lancé par `pnpm dev`, le serveur de dev
// survivait à Playwright (autre groupe de processus).
describe('commande du serveur de dev des vérifications', () => {
	it('reprend les gardes du script dev et lance vite sans pnpm, par exec', () => {
		expect(devServerCommand('bash a.sh && bash b.sh && vite dev', 5186)).toBe(
			'bash a.sh && bash b.sh && exec ./node_modules/.bin/vite dev --port 5186 --strictPort'
		);
	});

	it('un script dev réduit à « vite dev »', () => {
		expect(devServerCommand('vite dev', 5176)).toBe(
			'exec ./node_modules/.bin/vite dev --port 5176 --strictPort'
		);
	});

	it('refuse un script dev qui ne finit pas par « vite dev »', () => {
		expect(() => devServerCommand('vite dev && echo fini', 5176)).toThrow(
			/Script « dev » inattendu/
		);
		expect(() => devServerCommand('pnpm dev', 5176)).toThrow(/Script « dev » inattendu/);
	});

	it('le script dev du dépôt passe, sans pnpm', () => {
		const command = devServerCommandFromPackage(5176);
		expect(command).toMatch(/exec \.\/node_modules\/\.bin\/vite dev --port 5176 --strictPort$/);
		expect(command).not.toMatch(/\bpnpm\b/);
	});
});
