import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, type LaunchOptions, type PlaywrightTestOptions } from '@playwright/test';

/**
 * Navigateurs de `pnpm test:verifs` (R6 du chantier `verifs-auto`)
 * ================================================================
 *
 * Sur iPhone, tous les navigateurs utilisent WebKit ; sur Android, Chrome,
 * Samsung et Edge utilisent Chromium, Firefox utilise Gecko. Playwright ne
 * simule pas le toucher de Firefox Android : Firefox à 390 px n'est qu'une
 * fenêtre étroite, sur un sous-ensemble de tests.
 */

// ============================================================================
// TYPES
// ============================================================================

export type Engine = 'chromium' | 'webkit' | 'firefox';

export interface VerifsProject {
	name: string;
	engine: Engine;
	use: Partial<PlaywrightTestOptions> & {
		defaultBrowserType?: Engine;
		launchOptions?: LaunchOptions;
	};
	/** Téléphone : les tests `@bureau` sont sautés */
	phone: boolean;
	/** Sous-ensemble joué (`grep`), sinon toute la suite */
	only?: RegExp;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Le projet du jour : `pnpm test:verifs` sans `--project` */
export const DEFAULT_PROJECT = 'ordi-chrome';

/**
 * Firefox sur macOS 27 : il lit `~/Library/Application Support/Firefox` même
 * avec le profil que lui donne Playwright, macOS le lui refuse (confidentialité)
 * et il s'arrête au départ (« Could not find profile folder »). Un dossier
 * personnel à lui (`CFFIXED_USER_HOME`) l'en détourne ; ailleurs, rien.
 */
function firefoxLaunchOptions(): LaunchOptions {
	if (process.platform !== 'darwin') return {};
	const home = join(tmpdir(), 'chiphre-verifs-firefox-home');
	mkdirSync(home, { recursive: true });
	return { env: { ...process.env, CFFIXED_USER_HOME: home } };
}

const firefoxDesktop = { ...devices['Desktop Firefox'], launchOptions: firefoxLaunchOptions() };

export const VERIFS_PROJECTS: readonly VerifsProject[] = [
	{ name: 'ordi-chrome', engine: 'chromium', use: devices['Desktop Chrome'], phone: false },
	{ name: 'ordi-safari', engine: 'webkit', use: devices['Desktop Safari'], phone: false },
	{ name: 'ordi-firefox', engine: 'firefox', use: firefoxDesktop, phone: false },
	{ name: 'iphone', engine: 'webkit', use: devices['iPhone 15'], phone: true },
	{ name: 'android', engine: 'chromium', use: devices['Pixel 7'], phone: true },
	{
		name: 'firefox-390',
		engine: 'firefox',
		// Firefox ne connaît pas `isMobile` : la largeur d'un téléphone seulement
		use: { ...firefoxDesktop, viewport: { width: 390, height: 844 } },
		phone: true,
		// Graphiques, constructions, clavier MathLive (grep : fichier, titres, étiquettes)
		only: /atelier-graphe|atelier-geometrie|@clavier-mathlive/
	}
];

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Les noms donnés par `--project x` ou `--project=x` */
export function requestedProjects(argv: readonly string[]): string[] {
	const names: string[] = [];
	argv.forEach((arg, index) => {
		const inline = /^--project=(.+)$/.exec(arg);
		if (inline) names.push(inline[1]);
		else if (arg === '--project' && index + 1 < argv.length) {
			names.push(argv[index + 1]);
		}
	});
	return names;
}

/**
 * Les projets à déclarer : tous avec `VERIFS_TOUT`, ceux de `--project` s'il y
 * en a (un nom inconnu est laissé à Playwright, qui le refuse en listant les
 * bons), sinon l'ordinateur Chrome seul.
 */
export function activeProjects(argv: readonly string[], all: boolean): string[] {
	if (all) return VERIFS_PROJECTS.map((project) => project.name);
	const requested = requestedProjects(argv);
	if (requested.length === 0) return [DEFAULT_PROJECT];
	const known = VERIFS_PROJECTS.map((project) => project.name);
	// Inconnu ou motif (`ordi-*`) : on déclare tout, Playwright filtre ou refuse en listant les noms
	return requested.every((name) => known.includes(name)) ? requested : known;
}
