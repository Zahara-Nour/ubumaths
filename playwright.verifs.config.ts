import { existsSync } from 'node:fs';
import { chromium, defineConfig, firefox, webkit } from '@playwright/test';
import {
	activeProjects,
	DEFAULT_PROJECT,
	VERIFS_PROJECTS,
	type Engine
} from './e2e/verifs/projets';
import { devServerCommandFromPackage } from './e2e/verifs/serveur-de-dev';

/**
 * Vérifications manuelles automatisées (`e2e/verifs/`)
 * ====================================================
 *
 * Chaque test reprend une ligne de `docs/wip/verifications-manuelles.md`, son
 * numéro de PR dans le titre. Lancés à la demande (`pnpm test:verifs`), pas en
 * CI : sur le serveur de dev, sans `pnpm build` ni verrou gros process.
 *
 * Navigateurs (noms et moteurs : `e2e/verifs/projets.ts`) :
 *
 *   pnpm test:verifs                     ordinateur Chrome seul (le jour)
 *   pnpm test:verifs --project iphone    un navigateur (`--project` se répète)
 *   pnpm test:verifs:tout                les cinq navigateurs + Firefox à 390 px
 *
 * Un test sans sens au téléphone (raccourci `Ctrl+…`, survol, glisser à la
 * souris) porte l'étiquette `@bureau` : sauté sur iPhone, Android et Firefox à
 * 390 px. Firefox à 390 px ne joue qu'un sous-ensemble (graphiques,
 * constructions, clavier MathLive `@clavier-mathlive`).
 *
 * Le carnet (`carnet.spec.ts`) remet à zéro un décor de la base locale : il ne
 * tourne que sur l'ordinateur Chrome, deux navigateurs en même temps se
 * gâteraient le décor.
 *
 * Port : `VERIFS_PORT` (5176 par défaut, celui d'un worktree ; 5175 dans le
 * dépôt principal). Un serveur déjà lancé sur ce port est réutilisé ; sinon
 * Playwright en lance un et l'arrête à la fin (`e2e/verifs/serveur-de-dev.ts`).
 *
 * `VERIFS_URL=https://chiph.re` : les mêmes tests contre la prod, sans serveur
 * local — les lignes « puis prod » (pages publiques, sans compte).
 */

const port = Number(process.env.VERIFS_PORT ?? 5176);
const remoteURL = process.env.VERIFS_URL;

// Les projets se décident UNE fois, dans le processus principal (qui voit
// `--project` et `VERIFS_TOUT`), puis passent aux workers par l'environnement :
// un worker relit cette config sans les arguments et doit y trouver la même
// liste de projets.
if (process.env.TEST_WORKER_INDEX === undefined) {
	// Processus principal : toujours recalculé (une variable restée dans le shell ne compte pas)
	process.env.VERIFS_PROJETS = activeProjects(process.argv, process.env.VERIFS_TOUT === '1').join(
		','
	);
}
const active = (process.env.VERIFS_PROJETS ?? '').split(',');
const selected = VERIFS_PROJECTS.filter((project) => active.includes(project.name));

const ENGINES = { chromium, webkit, firefox } as const;

/** Moteur absent → arrêt avant tout test, avec la ligne qui l'installe */
function assertEnginesInstalled(engines: readonly Engine[]): void {
	const missing = [...new Set(engines)].filter(
		(engine) => !existsSync(ENGINES[engine].executablePath())
	);
	if (missing.length > 0) {
		throw new Error(
			`Navigateur absent (${missing.join(', ')}) : pnpm exec playwright install ${missing.join(' ')}`
		);
	}
}

assertEnginesInstalled(selected.map((project) => project.engine));

export default defineConfig({
	testDir: './e2e/verifs',
	// Les captures ont leur config (`playwright.captures.config.ts`)
	testIgnore: '**/captures/**',
	timeout: 60 * 1000,
	// Serveur de dev : une page ou un calcul compilé à froid dépasse les 5 s par défaut
	expect: { timeout: 15 * 1000 },
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
	projects: selected.map((project) => ({
		name: project.name,
		use: project.use,
		...(project.phone ? { grepInvert: /@bureau/ } : {}),
		...(project.only ? { grep: project.only } : {}),
		// Le carnet : un seul navigateur (décor partagé de la base locale)
		...(project.name === DEFAULT_PROJECT
			? {}
			: { testIgnore: ['**/captures/**', '**/carnet.spec.ts'] })
	})),
	webServer:
		remoteURL === undefined
			? {
					command: devServerCommandFromPackage(port),
					port,
					reuseExistingServer: true,
					timeout: 120 * 1000
				}
			: undefined
});
