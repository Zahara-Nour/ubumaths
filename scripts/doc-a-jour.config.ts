/**
 * Périmètre de la garde « code modifié ⇒ doc modifiée » (scripts/check-doc-a-jour.ts).
 *
 * - `scope` : le code dont la doc doit suivre les changements.
 * - `excluded` : jamais soumis (tests, généré, non-code).
 * - `trous` : zones de code connues SANS doc système. Chaque entrée est une dette
 *   nommée : la retirer quand la doc est écrite (et lui ajouter le `couvre:`).
 */

import type { CoverageConfig } from './check-doc-a-jour';

export const COVERAGE_CONFIG: CoverageConfig = {
	scope: [
		'src/lib/**',
		'src/routes/**',
		'src/hooks*.ts',
		'src/app.*',
		'supabase/migrations/**',
		// Environnement de dev (2026-10-11) : la carte docs/pratiques/environnement-de-dev.md
		// doit suivre la CI, les hooks, Vercel et les scripts d'outillage, sinon elle
		// ment au premier changement. Liste EXPLICITE, pas `scripts/**` : la plupart
		// des scripts sont des outils ponctuels sans rapport avec l'environnement.
		// Ni package.json ni pnpm-lock.yaml : Dependabot les touche à chaque montée de
		// version, la doc deviendrait un frein sans rien dire de neuf.
		'.github/workflows/**',
		'.github/dependabot.yml',
		'.husky/*',
		'.lintstagedrc.js',
		'vercel.json',
		'svelte.config.js',
		'vite.config.ts',
		'.nvmrc',
		'.claude/settings.json',
		'.claude/hooks/**',
		'scripts/gros-process.sh',
		'scripts/check-incremental.sh',
		'scripts/cliquet-types-tests.ts',
		'scripts/deploy-prod.sh',
		'scripts/release.ts',
		'scripts/lint-fast.sh',
		'scripts/lint-fast-fichiers.sh',
		'scripts/with-db-lock.sh',
		'scripts/ci-version-seule.sh',
		'scripts/vercel-ignore-build.sh',
		'scripts/releve-web-vitals.ts',
		'scripts/check-production-health.ts'
	],
	excluded: [
		'**/__tests__/**',
		'**/*.test.*',
		'**/*.spec.*',
		'src/lib/types/database.ts',
		'**/*.md',
		'**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,otf,mp3,wav,ogg}'
	],
	// Zones de code sans doc, une `note` par zone (affichée par la règle « doc d'abord »).
	// Retirer une zone quand sa doc est écrite (et lui donner son `couvre:`) : `--couverture`
	// échoue sur un trou périmé. Ordre : un fichier appartient au PREMIER trou qui le
	// désigne, un glob précis passe donc avant le glob large qui le contient.
	trous: [
		{ glob: 'src/lib/shared/blockly/**', note: 'Blockly, calculatrice' },
		{ glob: 'src/lib/components/blockly/**', note: 'Blockly, calculatrice' },
		{ glob: 'src/lib/stores/blocklyPlayground.svelte.ts', note: 'Blockly, calculatrice' },
		{ glob: 'src/routes/(public)/blockly/**', note: 'Blockly, calculatrice' },
		{ glob: 'src/lib/workers/js-sandbox.worker.ts', note: 'Blockly, calculatrice' },
		{ glob: 'src/routes/(protected)/calculatrice/**', note: 'Blockly, calculatrice' }
	]
};
