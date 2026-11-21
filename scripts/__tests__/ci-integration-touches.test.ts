/**
 * Tests touchés par une PR de code (nightly-integration.yml, job `portee`)
 * ========================================================================
 *
 * `scripts/ci-integration-touches.ts` choisit, pour une PR qui ne touche que du code (`src/`), de
 * la doc et des tests d'intégration, les seuls tests qui atteignent un fichier modifié.
 * Comportements validés : docs/archive/wip/ci-integration-progress.md § 9.
 *
 * Dépôt jetable pour le bout en bout : git ne tourne jamais hors du dossier temporaire.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import {
	chargementsDe,
	selectionner,
	sortie,
	SEUIL_UN_MORCEAU,
	type Changement,
	type Chargement
} from '../ci-integration-touches';

const GS = 'tests/integration/global-setup.ts';
const T_A = 'tests/integration/a.test.ts';
const T_B = 'tests/integration/b.test.ts';
const T_DB = 'tests/integration/database/c.test.ts';

/** Fermetures par défaut : a → math/x, b → math/y + articles (chargeur), c → rien de src. */
function fermetures(extra: Record<string, string[]> = {}): Map<string, string[]> {
	return new Map(
		Object.entries({
			[GS]: [GS, 'tests/helpers/purge.ts'],
			[T_A]: [T_A, 'tests/helpers/purge.ts', 'src/lib/math/x.ts'],
			[T_B]: [T_B, 'src/lib/math/y.ts', 'src/lib/server/shtam/articles.ts'],
			[T_DB]: [T_DB],
			...extra
		})
	);
}

const ARTICLES: Chargement = {
	chargeur: 'src/lib/server/shtam/articles.ts',
	motifs: ['src/lib/server/shtam/articles/*.md']
};

function m(...fichiers: string[]): Changement[] {
	return fichiers.map((fichier) => ({ statut: 'M', fichier }));
}

function choisir(
	changements: Changement[],
	opts: { fermetures?: Map<string, string[]>; chargements?: Chargement[]; marques?: string[] } = {}
) {
	return selectionner({
		changements,
		fermetures: opts.fermetures ?? fermetures(),
		chargements: opts.chargements ?? [ARTICLES],
		marques: new Set(opts.marques ?? [])
	});
}

describe('selectionner — code seul (cas 1)', () => {
	it('un fichier de src/ atteint par un test : ce test seulement', () => {
		expect(choisir(m('src/lib/math/x.ts'))).toEqual({ kind: 'tests', tests: [T_A] });
	});

	it('plusieurs fichiers : l’union des tests, triée, sans doublon', () => {
		expect(choisir(m('src/lib/math/y.ts', 'src/lib/math/x.ts', 'docs/a.md'))).toEqual({
			kind: 'tests',
			tests: [T_A, T_B]
		});
	});

	it('la doc et les .md hors src/ ne comptent pas', () => {
		expect(choisir(m('src/lib/math/x.ts', 'docs/systeme/a.md', 'README.md', 'CONTEXT.md'))).toEqual(
			{
				kind: 'tests',
				tests: [T_A]
			}
		);
	});
});

describe('selectionner — chargements en lot (cas 2)', () => {
	it('un article chargé par un fichier atteint : les tests du chargeur', () => {
		expect(choisir(m('src/lib/server/shtam/articles/a.md'))).toEqual({
			kind: 'tests',
			tests: [T_B]
		});
	});

	it('un fichier de docs/ chargé en lot compte comme du code', () => {
		const bornes: Chargement = {
			chargeur: 'src/lib/math/x.ts',
			motifs: ['docs/systeme/bornes/*.json', '!docs/systeme/bornes/questions*.json']
		};
		expect(choisir(m('docs/systeme/bornes/6e.json'), { chargements: [bornes] })).toEqual({
			kind: 'tests',
			tests: [T_A]
		});
		// motif négatif : non chargé, donc de la doc ordinaire
		expect(choisir(m('docs/systeme/bornes/questions-6e.json'), { chargements: [bornes] })).toEqual({
			kind: 'aucun'
		});
	});

	it('un chargeur qu’aucun test n’atteint ne compte pas', () => {
		const orphelin: Chargement = { chargeur: 'src/lib/z.ts', motifs: ['docs/z/*.json'] };
		expect(choisir(m('docs/z/a.json'), { chargements: [orphelin] })).toEqual({ kind: 'aucun' });
	});
});

describe('selectionner — aucun test atteint (cas 3)', () => {
	it('un fichier de src/ qu’aucun test n’importe : aucun', () => {
		expect(choisir(m('src/routes/page.svelte'))).toEqual({ kind: 'aucun' });
	});

	it('de la doc seule : aucun', () => {
		expect(choisir(m('docs/a.md'))).toEqual({ kind: 'aucun' });
	});
});

describe('selectionner — tests d’intégration de la PR (cas 4)', () => {
	it('code + test modifié : les tests atteints et ce test', () => {
		expect(choisir(m('src/lib/math/x.ts', T_DB))).toEqual({ kind: 'tests', tests: [T_A, T_DB] });
	});

	it('test ajouté seul : ce test', () => {
		expect(choisir([{ statut: 'A', fichier: 'tests/integration/neuf.test.ts' }])).toEqual({
			kind: 'tests',
			tests: ['tests/integration/neuf.test.ts']
		});
	});

	it('test supprimé : suite complète', () => {
		expect(choisir([{ statut: 'D', fichier: T_A }]).kind).toBe('complet');
	});

	it('l’outillage de la suite : suite complète', () => {
		for (const f of [
			'tests/helpers/purge.ts',
			'tests/integration/fixtures/a.json',
			'tests/integration/helpers.ts',
			GS
		]) {
			expect(choisir(m('src/lib/math/x.ts', f)).kind, f).toBe('complet');
		}
	});
});

describe('selectionner — tests de migration de données (cas 5)', () => {
	it('atteint par le code mais marqué : laissé de côté', () => {
		expect(choisir(m('src/lib/math/y.ts'), { marques: [T_B] })).toEqual({ kind: 'aucun' });
	});

	it('marqué mais modifié par la PR : il tourne', () => {
		expect(choisir(m('src/lib/math/y.ts', T_B), { marques: [T_B] })).toEqual({
			kind: 'tests',
			tests: [T_B]
		});
	});
});

describe('selectionner — suite complète (cas 6, 7, 8)', () => {
	it('tout fichier hors src/, doc et tests d’intégration', () => {
		for (const f of [
			'supabase/migrations/20261121000000_x.sql',
			'supabase/config.toml',
			'package.json',
			'pnpm-lock.yaml',
			'.github/workflows/nightly-integration.yml',
			'scripts/ci-integration-touches.ts',
			'scripts/questions/2de/a.json',
			'tests/fixtures/lexique/dictionnaire-reference.ts',
			'vite.config.ts',
			'static/a.png',
			'tests/integration/fixtures/a.md',
			'supabase/a.md',
			'scripts/a.md'
		]) {
			expect(choisir(m('src/lib/math/x.ts', f)).kind, f).toBe('complet');
		}
	});

	it('un fichier atteint par le global-setup, ou src/env.ts', () => {
		const f = fermetures({ [GS]: [GS, 'src/lib/server/seed.ts'] });
		expect(choisir(m('src/lib/server/seed.ts'), { fermetures: f }).kind).toBe('complet');
		expect(choisir(m('src/env.ts')).kind).toBe('complet');
	});

	it('un fichier chargé en lot par le global-setup', () => {
		const f = fermetures({ [GS]: [GS, 'src/lib/server/shtam/articles.ts'] });
		expect(choisir(m('src/lib/server/shtam/articles/a.md'), { fermetures: f }).kind).toBe(
			'complet'
		);
	});

	it('un fichier de src/ supprimé (ou renommé : supprimé + ajouté)', () => {
		expect(choisir([{ statut: 'D', fichier: 'src/lib/math/x.ts' }]).kind).toBe('complet');
	});

	it('un fichier de src/ ajouté : compte comme modifié', () => {
		expect(choisir([{ statut: 'A', fichier: 'src/lib/math/neuf.ts' }])).toEqual({
			kind: 'aucun'
		});
	});

	it('aucun changement : suite complète (dans le doute)', () => {
		expect(choisir([]).kind).toBe('complet');
	});
});

describe('chargementsDe — lecture des import.meta.glob (cas 2, 10)', () => {
	it('motif relatif, avec type générique', () => {
		const src = `const T = import.meta.glob<string>('./transcriptions/**/*.md', { eager: true });`;
		expect(chargementsDe(src, 'src/lib/server/programmes/transcriptions.ts')).toEqual([
			{
				chargeur: 'src/lib/server/programmes/transcriptions.ts',
				motifs: ['src/lib/server/programmes/transcriptions/**/*.md']
			}
		]);
	});

	it('tableau de motifs depuis la racine, négation comprise', () => {
		const src = `const F = import.meta.glob<unknown>(
	[
		'/docs/systeme/programmes/bornes/*.json',
		"!/docs/systeme/programmes/bornes/**/questions*.json"
	],
	{ eager: true, import: 'default' }
);`;
		expect(chargementsDe(src, 'src/lib/server/point-bounds.ts')).toEqual([
			{
				chargeur: 'src/lib/server/point-bounds.ts',
				motifs: [
					'docs/systeme/programmes/bornes/*.json',
					'!docs/systeme/programmes/bornes/**/questions*.json'
				]
			}
		]);
	});

	it('remontée de dossier', () => {
		expect(chargementsDe(`import.meta.glob('../data/*.json')`, 'src/lib/a/b.ts')).toEqual([
			{ chargeur: 'src/lib/a/b.ts', motifs: ['src/lib/data/*.json'] }
		]);
	});

	it('aucun chargement : liste vide', () => {
		expect(chargementsDe(`import x from './x';`, 'src/lib/a.ts')).toEqual([]);
	});

	it('un motif illisible (variable, gabarit, alias) : erreur, donc suite complète', () => {
		for (const src of [
			`import.meta.glob(MOTIFS)`,
			'import.meta.glob(`./${dossier}/*.md`)',
			`import.meta.glob('$lib/a/*.md')`,
			`import.meta.glob(['./a/*.md', MOTIF])`,
			`import.meta.glob('./modules/*.ts')`
		]) {
			expect(() => chargementsDe(src, 'src/lib/a.ts'), src).toThrow();
		}
	});
});

describe('sortie — pour $GITHUB_OUTPUT (cas 3, 11)', () => {
	it('tests : la liste, aucun=false', () => {
		expect(sortie({ kind: 'tests', tests: [T_A, T_B] })).toBe(
			`fichiers=${T_A} ${T_B}\naucun=false`
		);
	});

	it('aucun : liste vide, aucun=true', () => {
		expect(sortie({ kind: 'aucun' })).toBe('fichiers=\naucun=true');
	});

	it('suite complète : liste vide, aucun=false', () => {
		expect(sortie({ kind: 'complet', raison: 'x' })).toBe('fichiers=\naucun=false');
	});

	it('le seuil d’un seul morceau est de 40 tests', () => {
		expect(SEUIL_UN_MORCEAU).toBe(40);
	});
});

// ============================================================================
// Bout en bout : vrai dépôt git jetable, vrai calcul des imports
// ============================================================================

const SCRIPT = resolve(__dirname, '../ci-integration-touches.ts');
const TSX = resolve(__dirname, '../../node_modules/.bin/tsx');
let racine = '';

function env(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
	return {
		...process.env,
		HOME: racine,
		XDG_CONFIG_HOME: racine,
		GIT_CONFIG_NOSYSTEM: '1',
		GIT_CEILING_DIRECTORIES: dirname(racine),
		GIT_AUTHOR_NAME: 'test',
		GIT_AUTHOR_EMAIL: 'test@example.com',
		GIT_COMMITTER_NAME: 'test',
		GIT_COMMITTER_EMAIL: 'test@example.com',
		GITHUB_EVENT_NAME: 'pull_request',
		...extra
	};
}

function git(...args: string[]): void {
	const r = spawnSync('git', args, { cwd: racine, env: env(), encoding: 'utf8' });
	if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${r.status}\n${r.stderr}`);
}

function ecrire(fichier: string, contenu: string): void {
	mkdirSync(join(racine, dirname(fichier)), { recursive: true });
	writeFileSync(join(racine, fichier), contenu);
	git('add', fichier);
}

function depot(): void {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'ci-touches-')));
	if (!racine || racine === sep) throw new Error('dossier jetable invalide');
	git('init', '-q', '-b', 'main');
	ecrire('src/lib/a.ts', 'export const a = 1;\n');
	ecrire('src/lib/b.ts', 'export const b = 2;\n');
	ecrire('src/routes/page.ts', 'export const p = 3;\n');
	ecrire('tests/integration/a.test.ts', "import { a } from '../../src/lib/a';\nconsole.log(a);\n");
	ecrire('tests/integration/b.test.ts', "import { b } from '#lib/b.ts';\nconsole.log(b);\n");
	ecrire('tests/integration/global-setup.ts', 'export default () => {};\n');
	git('commit', '-q', '-m', 'init');
}

function pr(...fichiers: string[]): void {
	git('switch', '-q', '-c', 'feat/x');
	// Les exports restent : un import cassé ferait échouer le calcul (suite complète)
	for (const f of fichiers)
		ecrire(f, 'export const a = 11;\nexport const b = 22;\nexport const p = 33;\n');
	git('commit', '-q', '-m', 'pr');
	git('switch', '-q', 'main');
	ecrire('autre.txt', 'main avance\n');
	git('commit', '-q', '-m', 'main avance');
	git('merge', '-q', '--no-ff', '-m', 'merge', 'feat/x');
}

function verdict(extra: NodeJS.ProcessEnv = {}): string {
	const r = spawnSync(TSX, [SCRIPT], { cwd: racine, env: env(extra), encoding: 'utf8' });
	expect(r.status, r.stderr).toBe(0);
	return r.stdout.trim();
}

afterEach(() => {
	if (racine && racine.startsWith(realpathSync(tmpdir())))
		rmSync(racine, { recursive: true, force: true });
	racine = '';
});

describe('ci-integration-touches — bout en bout', () => {
	it('fichier importé par un test (chemin relatif) : ce test', () => {
		depot();
		pr('src/lib/a.ts');
		expect(verdict()).toBe('fichiers=tests/integration/a.test.ts\naucun=false');
	});

	it('fichier importé par l’alias #lib : ce test', () => {
		depot();
		pr('src/lib/b.ts');
		expect(verdict()).toBe('fichiers=tests/integration/b.test.ts\naucun=false');
	});

	it('fichier qu’aucun test n’atteint : aucun', () => {
		depot();
		pr('src/routes/page.ts');
		expect(verdict()).toBe('fichiers=\naucun=true');
	});

	it('hors src/ : suite complète', () => {
		depot();
		pr('src/lib/a.ts', 'supabase/config.toml');
		expect(verdict()).toBe('fichiers=\naucun=false');
	});

	it('calcul des imports en échec (import cassé) : suite complète', () => {
		depot();
		git('switch', '-q', '-c', 'feat/x');
		ecrire('src/lib/a.ts', 'export const autre = 1;\n');
		git('commit', '-q', '-m', 'pr');
		git('switch', '-q', 'main');
		ecrire('autre.txt', 'main avance\n');
		git('commit', '-q', '-m', 'main avance');
		git('merge', '-q', '--no-ff', '-m', 'merge', 'feat/x');
		expect(verdict()).toBe('fichiers=\naucun=false');
	});

	it('pas une PR (nuit, à la main) : suite complète', () => {
		depot();
		pr('src/lib/a.ts');
		expect(verdict({ GITHUB_EVENT_NAME: 'schedule' })).toBe('fichiers=\naucun=false');
	});
});
