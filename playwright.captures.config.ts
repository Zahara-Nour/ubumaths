import { defineConfig, devices } from '@playwright/test';

/**
 * Captures des vérifications « à l'œil » (`e2e/verifs/captures/`)
 * ===============================================================
 *
 * Chaque test rejoue une ligne de `docs/wip/verifications-manuelles.md` qu'aucune
 * assertion ne tranche (un rendu, une couleur, une animation) et prend des
 * captures, en thème clair et en thème sombre : David les coche sur une page à
 * cocher (`pnpm verifs:captures-page`). Lancées à la demande, pas en CI.
 *
 * Sorties : `.captures/` (ignoré par git) — une image et une fiche JSON par
 * capture. Les pages réservées (prof, admin) se lisent avec les comptes LOCAUX
 * de `supabase/seed/dev_accounts.sql` : le projet `comptes` refuse toute autre
 * adresse que localhost.
 *
 * Port : `VERIFS_PORT` (5176 par défaut), comme `playwright.verifs.config.ts`.
 */

const port = Number(process.env.VERIFS_PORT ?? 5176);
// Un dossier de sortie par lancement : Playwright vide le sien en partant, deux
// lancements en même temps se gâteraient leurs traces. Posé dans l'environnement
// avant le départ des workers, qui relisent cette config et en héritent.
process.env.CAPTURES_RUN ??= String(Date.now());

export default defineConfig({
	testDir: './e2e/verifs/captures',
	// Pas `test-results/` : `pnpm test:verifs` le vide à chaque lancement
	outputDir: `./.captures/.runs/${process.env.CAPTURES_RUN}`,
	timeout: 90 * 1000,
	expect: { timeout: 15 * 1000 },
	fullyParallel: true,
	retries: 0,
	reporter: [['list']],
	use: {
		baseURL: `http://localhost:${port}`,
		trace: 'retain-on-failure',
		navigationTimeout: 60 * 1000,
		actionTimeout: 15 * 1000
	},
	projects: [
		{ name: 'comptes', testMatch: /comptes\.setup\.ts/ },
		{
			name: 'captures',
			dependencies: ['comptes'],
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: {
		command: `pnpm dev --port ${port} --strictPort`,
		port,
		reuseExistingServer: true,
		timeout: 120 * 1000
	}
});
