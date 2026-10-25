import { defineConfig, devices } from '@playwright/test';

/**
 * Vérifications manuelles automatisées (`e2e/verifs/`)
 * ====================================================
 *
 * Chaque test reprend une ligne de `docs/wip/verifications-manuelles.md`, son
 * numéro de PR dans le titre. Lancés à la demande (`pnpm test:verifs`), pas en
 * CI : sur le serveur de dev, sans `pnpm build` ni verrou gros process.
 *
 * Port : `VERIFS_PORT` (5176 par défaut, celui d'un worktree ; 5175 dans le
 * dépôt principal). Un serveur déjà lancé sur ce port est réutilisé.
 *
 * `VERIFS_URL=https://chiph.re` : les mêmes tests contre la prod, sans serveur
 * local — les lignes « puis prod » (pages publiques, sans compte).
 */

const port = Number(process.env.VERIFS_PORT ?? 5176);
const remoteURL = process.env.VERIFS_URL;

export default defineConfig({
	testDir: './e2e/verifs',
	timeout: 60 * 1000,
	fullyParallel: true,
	retries: 0,
	reporter: [['list']],
	use: {
		baseURL: remoteURL ?? `http://localhost:${port}`,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		navigationTimeout: 60 * 1000,
		actionTimeout: 15 * 1000
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer:
		remoteURL === undefined
			? {
					command: `pnpm dev --port ${port} --strictPort`,
					port,
					reuseExistingServer: true,
					timeout: 120 * 1000
				}
			: undefined
});
