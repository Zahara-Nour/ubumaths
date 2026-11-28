/**
 * `pnpm deploy:prod` — la seule porte vers la prod (ADR 0021)
 * ===========================================================
 *
 * Vercel ne déploie que la branche `production`. Le script part du dernier
 * commit de main vérifié par la CI, crée la version (`pnpm release`), attend la
 * CI de ce commit de version, puis avance `production` jusqu'à lui. Gardé ici :
 * - seul un commit au « CI Summary » vert est livré, toujours avec une version ;
 * - les commits de doc qui le suivent sont enjambés (ils n'ont pas de CI) ;
 * - CI en cours sur main → attente sous le verrou (personne ne merge), puis livraison ;
 *   `--essai` n'attend pas ; CI rouge ou commit de code sans CI → ni version, ni prod ;
 * - main local qui diffère d'origin/main → arrêt, en nommant les commits en cause ;
 * - CI de la version rouge → la version reste, la prod ne bouge pas ;
 * - rien de nouveau → ni version, ni prod ; jamais de force-push ;
 * - `--essai` ne crée rien ;
 * - un second deploy:prod pendant le premier (verrou « deploy ») sort en exit 2
 *   sans rien créer ; l'essai, lui, n'est pas bloqué ;
 * - avant toute création : une migration du commit à livrer pas encore jouée en
 *   prod arrête tout, sauf nommée par `--migration-apres` ; prod illisible → arrêt ;
 * - avant toute création aussi : le schéma de la prod doit être celui du `database.ts`
 *   du commit à livrer (« prod = dépôt ») ; sauté avec `--migration-apres` ou
 *   `--sans-controle-types` ;
 * - après la mise en prod : construction de Vercel attendue, puis le site doit
 *   servir la nouvelle construction et ses pages publiques répondre ; un échec
 *   sort en erreur sans rien défaire ; `--verifier` rejoue ce contrôle seul.
 *
 * Dépôts jetables (un dépôt nu tient lieu de GitHub) et `gh` remplacé par un
 * bouchon qui lit l'état de la CI de chaque commit dans un fichier ; `pnpm
 * release` aussi : il crée un commit de version tagué, dont la CI vaut
 * $CI_VERSION. Comme dans
 * vercel-ignore-build.test.ts, git ne tourne jamais hors du dossier jetable.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import {
	appendFileSync,
	chmodSync,
	existsSync,
	readFileSync,
	mkdtempSync,
	mkdirSync,
	realpathSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

const SCRIPT = resolve(__dirname, '../deploy-prod.sh');
const LOCK = resolve(__dirname, '../lib/lock.py');

let racine: string;
let github: string;
let local: string;
let etats: string;
let numero = 0;
let ciVersion = 'success';
/** La migration du premier commit de chaque dépôt jetable, jouée en prod. */
const BASE = '20250101000000';
/** Variables d'un test : état de Vercel, du site, des pages (cf. les bouchons). */
let decor: Record<string, string> = {};

function env(): NodeJS.ProcessEnv {
	return {
		...process.env,
		PATH: `${join(racine, 'bin')}:${process.env.PATH}`,
		HOME: racine,
		XDG_CONFIG_HOME: racine,
		GIT_CONFIG_NOSYSTEM: '1',
		GIT_CEILING_DIRECTORIES: dirname(racine),
		GIT_AUTHOR_NAME: 'test',
		GIT_AUTHOR_EMAIL: 'test@example.com',
		GIT_COMMITTER_NAME: 'test',
		GIT_COMMITTER_EMAIL: 'test@example.com',
		ETATS_CI: etats,
		RELANCES: join(racine, 'relances'),
		DEPLOY_PROD_RELEASE: `bash ${join(racine, 'bin/release')}`,
		DEPLOY_PROD_PAUSE: '0',
		DEPLOY_PROD_ATTENTE_MAX: '0',
		DEPLOY_PROD_ATTENTE_SITE_MAX: '0',
		DEPLOY_PROD_MIGRATIONS_PROD: `bash ${join(racine, 'bin/migrations-prod')}`,
		DEPLOY_PROD_TYPES_PROD: `bash ${join(racine, 'bin/types-prod')}`,
		TYPES_PROD_APPELS: join(racine, 'types-prod-appels'),
		DEPLOY_PROD_SANTE: `bash ${join(racine, 'bin/sante')}`,
		DEPLOY_PROD_SITE: 'https://site.test',
		MIGRATIONS_JOUEES: join(racine, 'migrations-prod'),
		GITHUB_NU: github,
		CI_VERSION: ciVersion,
		...decor
	};
}

function dansLeBac(cwd: string): string {
	const reel = realpathSync(cwd);
	if (!reel.startsWith(racine + sep)) throw new Error(`hors du dossier jetable : « ${cwd} »`);
	return reel;
}

function git(cwd: string, ...args: string[]): string {
	const r = spawnSync('git', args, { cwd: dansLeBac(cwd), env: env(), encoding: 'utf8' });
	if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${r.status}\n${r.stderr}`);
	return r.stdout.trim();
}

/** Un commit poussé sur main ; `ci` = état de « CI Summary » (absent par défaut). */
function pousser(ci: string | null, ...fichiers: string[]): string {
	for (const f of fichiers) {
		mkdirSync(dirname(join(local, f)), { recursive: true });
		writeFileSync(join(local, f), `${f} ${++numero}\n`);
	}
	git(local, 'add', '-A');
	git(local, 'commit', '-q', '-m', fichiers.join(' '));
	git(local, 'push', '-q', 'origin', 'HEAD:main');
	const sha = git(local, 'rev-parse', 'HEAD');
	if (ci) appendFileSync(etats, `${sha} ${ci}\n`);
	return sha;
}

function production(): string | null {
	const r = spawnSync('git', ['rev-parse', '-q', '--verify', 'refs/heads/production'], {
		cwd: dansLeBac(github),
		env: env(),
		encoding: 'utf8'
	});
	return r.status === 0 ? r.stdout.trim() : null;
}

function deployer(...args: string[]) {
	const r = spawnSync('bash', [SCRIPT, ...args], {
		cwd: dansLeBac(local),
		env: env(),
		encoding: 'utf8'
	});
	return { status: r.status, sortie: `${r.stdout}${r.stderr}` };
}

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'deploy-prod-')));
	github = join(racine, 'github.git');
	local = join(racine, 'local');
	etats = join(racine, 'etats-ci');
	writeFileSync(etats, '');
	decor = {};
	mkdirSync(github);
	mkdirSync(local);
	mkdirSync(join(racine, 'bin'));
	// Bouchon de `gh` : l'état de la CI de chaque commit est lu dans $ETATS_CI
	// (dernière ligne pour ce SHA). Le n° de run d'un commit est son SHA.
	// « running » : la CI tourne, donc « CI Summary » n'existe pas encore ;
	// « running-then-success » : deux lectures en cours, puis vert ;
	// « plantage » : rouge sur le plantage connu des tests navigateur ;
	// « client-rouge » : vrai test client rouge, wrapDynamicImport au log mais
	// navigateur resté ouvert ;
	// « mixte » : un job sur ce plantage, un autre vraiment rouge ;
	// « muet » : rouge, logs illisibles ;
	// « plantage-et-silencieux » : un job sur le plantage connu, un autre rouge
	// SANS log d'étape (timeout, setup) : absent de --log-failed.
	// `gh run rerun <sha> --failed` note la relance dans $RELANCES et donne au
	// commit l'état $APRES_RELANCE (vert par défaut) ; $RELANCE_REFUSEE la fait échouer.
	writeFileSync(
		join(racine, 'bin/gh'),
		`#!/bin/bash
case "$1 $2" in
"run rerun")
	[ -n "\${RELANCE_REFUSEE:-}" ] && { echo "HTTP 403: Must have admin rights" >&2; exit 1; }
	echo "$3" >> "$RELANCES"
	echo "$3 \${APRES_RELANCE:-success}" >> "$ETATS_CI"
	exit 0 ;;
"run view") sha="$3" ;;
"run list") sha=$(printf '%s\\n' "$@" | grep -A1 -x -- '--commit' | tail -1) ;;
"api "*/status)
	# Statut « Vercel » du commit : $VERCEL (vert par défaut) ; « absent » = rien de posé.
	echo "$2" >> "$ETATS_CI.vercel"
	case "\${VERCEL:-success}" in absent) echo absent ;; *) echo "\${VERCEL:-success} https://vercel.test/construction" ;; esac
	exit 0 ;;
*) sha=$(printf '%s\\n' "$@" | grep -oE 'commits/[0-9a-f]+' | head -1 | cut -d/ -f2) ;;
esac
etat=$(grep "^$sha " "$ETATS_CI" | tail -1 | cut -d' ' -f2)
if [ "$etat" = running-then-success ]; then
	n=$(cat "$ETATS_CI.$sha" 2>/dev/null || echo 0)
	[ "$1 $2" = "run list" ] && echo $((n + 1)) > "$ETATS_CI.$sha"
	[ "$n" -lt 2 ] && etat=running || etat=success
fi
case "$1 $2" in
"run view")
	if printf '%s\\n' "$@" | grep -qx jobs; then
		case "$etat" in
		plantage | client-rouge) printf 'Client Tests (browser, shard 1/2)\\nCI Summary\\n' ;;
		mixte) printf 'Client Tests (browser, shard 1/2)\\nServer Tests\\nCI Summary\\n' ;;
		plantage-et-silencieux) printf 'Client Tests (browser, shard 1/2)\\nBuild\\nCI Summary\\n' ;;
		*) printf 'Server Tests\\nCI Summary\\n' ;;
		esac
		exit 0
	fi
	if printf '%s\\n' "$@" | grep -qx status; then
		case "$etat" in running) echo in_progress ;; *) echo completed ;; esac
		exit 0
	fi
	case "$etat" in
	plantage | plantage-et-silencieux)
		# Comme le vrai log : l'erreur wrapDynamicImport, la fermeture du navigateur,
		# puis des milliers de lignes du même job (au-delà du tampon d'un tuyau).
		printf 'Client Tests (browser, shard 1/2)\\tUNKNOWN STEP\\t09:22:29Z TypeError: Cannot read properties of undefined (reading %swrapDynamicImport%s)\\n' "'" "'"
		printf 'Client Tests (browser, shard 1/2)\\tUNKNOWN STEP\\t09:22:29Z Error: [vitest] Browser connection was closed while running tests. Was the page closed unexpectedly?\\n'
		for i in $(seq 1 5000); do printf 'Client Tests (browser, shard 1/2)\\tUNKNOWN STEP\\t09:22:30Z  ✓ src/lib/f%s.test.ts (3 tests) 12ms\\n' "$i"; done
		printf 'CI Summary\\tUNKNOWN STEP\\t09:29:30Z ❌ Client Tests: failure\\n' ;;
	client-rouge)
		# Vrai test client rouge : wrapDynamicImport est dans TOUS les logs du job
		# client, verts compris, mais le navigateur ne s'est pas fermé.
		printf 'Client Tests (browser, shard 1/2)\\tUNKNOWN STEP\\t09:22:29Z TypeError: Cannot read properties of undefined (reading %swrapDynamicImport%s)\\n' "'" "'"
		printf 'Client Tests (browser, shard 1/2)\\tUNKNOWN STEP\\t09:22:30Z AssertionError: expected 2 to be 3\\n'
		printf 'CI Summary\\tUNKNOWN STEP\\t09:29:30Z ❌ Client Tests: failure\\n' ;;
	mixte)
		printf 'Client Tests (browser, shard 1/2)\\tUNKNOWN STEP\\t09:22:29Z Error: [vitest] Browser connection was closed while running tests. Was the page closed unexpectedly?\\n'
		printf 'Server Tests\\tUNKNOWN STEP\\t09:22:30Z AssertionError: expected 2 to be 3\\n'
		printf 'CI Summary\\tUNKNOWN STEP\\t09:29:30Z ❌ failure\\n' ;;
	muet) exit 1 ;;
	*)
		printf 'Server Tests\\tUNKNOWN STEP\\t09:22:30Z AssertionError: expected 2 to be 3\\n'
		printf 'CI Summary\\tUNKNOWN STEP\\t09:29:30Z ❌ failure\\n' ;;
	esac ;;
"run list")
	if printf '%s\\n' "$@" | grep -qx databaseId; then
		[ -n "$etat" ] && echo "$sha"
	else
		case "$etat" in running) echo in_progress ;; '') echo aucun ;; *) echo completed ;; esac
	fi ;;
*)
	case "$etat" in running | '') echo absent ;; plantage | plantage-et-silencieux | client-rouge | mixte | muet) echo failure ;; *) echo "$etat" ;; esac ;;
esac
`
	);
	chmodSync(join(racine, 'bin/gh'), 0o755);
	// Bouchon de la lecture des migrations de la prod : les horodatages de
	// $MIGRATIONS_JOUEES (un par ligne), au format JSON de la CLI ; « panne » = prod illisible.
	writeFileSync(
		join(racine, 'bin/migrations-prod'),
		`#!/bin/bash
echo "Connecting to remote database..." >&2
if grep -qx panne "$MIGRATIONS_JOUEES" 2>/dev/null; then echo "failed to connect to postgres" >&2; exit 1; fi
printf '{"migrations":['
while read -r m; do [ -n "$m" ] && printf '{"local":"%s","remote":"%s","time":"x"},' "$m" "$m"; done < <(cat "$MIGRATIONS_JOUEES" 2>/dev/null)
printf '{"local":"20990101000000","remote":"","time":"x"}]}\n'
`
	);
	// Bouchon du contrôle « prod = dépôt » (scripts/db-types/prod.ts) : note le commit
	// comparé dans $TYPES_PROD_APPELS ; $TYPES_PROD_ETAT = ecart → la prod diffère du dépôt.
	writeFileSync(
		join(racine, 'bin/types-prod'),
		`#!/bin/bash
echo "$1" >>"$TYPES_PROD_APPELS"
if [ "\${TYPES_PROD_ETAT:-}" = ecart ]; then
	echo "⛔ Le schéma public de la prod n'est pas celui de database.ts." >&2
	echo "   Tables.classes.Row.couleur" >&2
	exit 1
fi
echo "✅ prod = dépôt : le schéma public de la prod est celui de database.ts (3 éléments comparés)."
`
	);
	// Bouchon de curl, pour le site : la construction en ligne suit la branche
	// production du faux GitHub (elle change quand production avance), sauf
	// $BUILD_FIGE (le domaine n'a pas basculé) ; la page d'accueil répond $ACCUEIL.
	writeFileSync(
		join(racine, 'bin/curl'),
		`#!/bin/bash
case "$*" in
*version.json*)
	[ -n "\${BUILD_FIGE:-}" ] && { echo '{"version":"111"}'; exit 0; }
	# $SITE_MUET : le site ne répond plus une fois production avancée
	if [ -n "\${SITE_MUET:-}" ] && git --git-dir "$GITHUB_NU" rev-parse -q --verify refs/heads/production >/dev/null; then exit 22; fi
	p=$(git --git-dir "$GITHUB_NU" rev-parse -q --verify refs/heads/production | tr -dc 0-9 | cut -c1-9)
	echo "{\\"version\\":\\"1\${p:-0}\\"}" ;;
*) printf '%s\\n%s' "\${CORPS:-<title>Accueil</title>}" "\${ACCUEIL:-200}" ;;
esac
`
	);
	chmodSync(join(racine, 'bin/curl'), 0o755);
	// Bouchon du contrôle des pages publiques : $PAGES_ROUGES le fait échouer.
	writeFileSync(
		join(racine, 'bin/sante'),
		`#!/bin/bash
echo "Contrôle de 3 chemins publics sur $1"
echo "  OK    /                            200"
if [ -n "\${PAGES_ROUGES:-}" ]; then
	echo "  ÉCHEC /automaths                   500"
	echo "1 chemin(s) en échec :"
	echo "  /automaths → 500"
	exit 1
fi
echo "Tout répond (3 chemins)."
`
	);
	// Bouchon de `pnpm release` : un commit de version tagué, et l'état de sa CI.
	writeFileSync(
		join(racine, 'bin/release'),
		`#!/bin/bash
set -e
n=$(git tag | wc -l | tr -d ' ')
echo "0.$n.0" > VERSION
git add VERSION
git commit -q -m "chore(release): 0.$n.0"
git tag "v0.$n.0"
echo "$(git rev-parse HEAD) $CI_VERSION" >> "$ETATS_CI"
`
	);
	git(github, 'init', '-q', '--bare');
	git(github, 'symbolic-ref', 'HEAD', 'refs/heads/main');
	git(local, 'init', '-q');
	git(local, 'symbolic-ref', 'HEAD', 'refs/heads/main');
	git(local, 'remote', 'add', 'origin', `file://${github}`);
	// Le dépôt a toujours des migrations : sans aucune, le script refuse de livrer.
	writeFileSync(join(racine, 'migrations-prod'), `${BASE}\n`);
	pousser('success', 'src/app.ts', `supabase/migrations/${BASE}_base.sql`);
	ciVersion = 'success';
});

/** Le commit de version poussé sur main, et son parent. */
function version(): { sha: string; parent: string; tag: string } {
	const sha = git(local, 'rev-parse', 'HEAD');
	return {
		sha,
		parent: git(local, 'rev-parse', 'HEAD~1'),
		tag: git(local, 'tag', '--points-at', 'HEAD')
	};
}

afterEach(() => {
	rmSync(racine, { recursive: true, force: true });
});

describe('deploy-prod.sh — ce qui part en prod', () => {
	it('crée une version sur le dernier commit vert et la met en prod', () => {
		const vert = pousser('success', 'src/a.ts');
		const r = deployer();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('Première mise en prod');
		const v = version();
		expect(v.parent).toBe(vert);
		expect(v.tag).toMatch(/^v0\.\d+\.0$/);
		expect(git(github, 'rev-parse', 'refs/heads/main')).toBe(v.sha); // version poussée sur main
		expect(production()).toBe(v.sha);
	});

	it('enjambe les commits de doc sans CI qui suivent le dernier commit vert', () => {
		const vert = pousser('success', 'src/a.ts');
		pousser(null, 'docs/wip/journal.md');
		const doc = pousser(null, 'CLAUDE.md');
		const r = deployer();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('enjambé');
		expect(r.sortie).toContain(vert.slice(0, 7));
		expect(version().parent).toBe(doc); // la version se pose sur la pointe
		expect(production()).toBe(version().sha);
	});

	it('avance production en avance rapide et liste ce qui est livré', () => {
		pousser('success', 'src/a.ts');
		deployer();
		const b = pousser('success', 'src/b.ts');
		const r = deployer();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('À livrer');
		expect(r.sortie).toContain('src/b.ts');
		expect(version().parent).toBe(b);
		expect(production()).toBe(version().sha);
	});

	it('rien de nouveau : ni version, ni prod', () => {
		pousser('success', 'src/a.ts');
		deployer();
		const tags = git(local, 'tag').split('\n').length;
		pousser(null, 'docs/wip/journal.md');
		const r = deployer();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('rien à livrer');
		expect(git(local, 'tag').split('\n').length).toBe(tags);
	});

	it('un commit déjà tagué (relance après interruption) : pas de nouvelle version', () => {
		pousser('success', 'src/a.ts');
		ciVersion = 'pending'; // la CI de la version ne finit pas : la prod ne bouge pas
		const r1 = deployer();
		expect(r1.status, r1.sortie).toBe(1);
		expect(production()).toBeNull();
		const v = version();
		appendFileSync(etats, `${v.sha} success\n`);
		const r2 = deployer();
		expect(r2.status, r2.sortie).toBe(0);
		expect(r2.sortie).toContain('Déjà une version');
		expect(git(local, 'tag').split('\n').length).toBe(1);
		expect(production()).toBe(v.sha);
	});

	it('--essai montre la livraison sans rien pousser', () => {
		pousser('success', 'src/a.ts');
		const r = deployer('--essai');
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain("rien n'est créé");
		expect(production()).toBeNull();
		expect(git(local, 'tag')).toBe('');
	});
});

describe('deploy-prod.sh — attendre la CI', () => {
	it('« CI Summary » absent pendant que la CI tourne : « en cours », pas « sans CI »', () => {
		pousser('success', 'src/a.ts');
		pousser('running', 'src/b.ts');
		const r = deployer();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('CI allégée en cours');
		expect(r.sortie).not.toContain('sans « CI Summary »');
	});

	it('la CI de la version passe au vert pendant l’attente : mise en prod', () => {
		pousser('success', 'src/a.ts');
		ciVersion = 'running-then-success';
		const r = spawnSync('bash', [SCRIPT], {
			cwd: dansLeBac(local),
			env: { ...env(), DEPLOY_PROD_ATTENTE_MAX: '60', DEPLOY_PROD_PAUSE: '0' },
			encoding: 'utf8'
		});
		const sortie = `${r.stdout}${r.stderr}`;
		expect(r.status, sortie).toBe(0);
		expect(sortie).toContain('⏳ CI de la version : pending…');
		expect(production()).toBe(version().sha);
	});
});

// La CI allégée de main (typecheck et build) n'est plus attendue (2026-11-23) : la
// CI COMPLÈTE de la version, seule garde de la prod, la couvre ; et quality.yml la
// fait tourner à côté de celle du merge (groupe de concurrence propre aux versions).
describe('deploy-prod.sh — la CI allégée de main n’est pas attendue', () => {
	// Pas de PAUSE ni d'ATTENTE_MAX : une attente de la CI de main ne rendrait jamais la main.
	function deployerSansAttente(...args: string[]) {
		const r = spawnSync('bash', [SCRIPT, ...args], {
			cwd: dansLeBac(local),
			env: env(),
			encoding: 'utf8'
		});
		return { status: r.status, sortie: `${r.stdout}${r.stderr}` };
	}

	it('CI en cours sur la pointe : version créée dessus sans l’attendre, puis livrée', () => {
		pousser('success', 'src/a.ts');
		// « running » ne finit jamais : une attente ne rendrait pas la main.
		const pointe = pousser('running', 'src/b.ts');
		const r = deployerSansAttente();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('CI allégée en cours');
		expect(r.sortie).not.toContain('attente sous le verrou');
		expect(version().parent).toBe(pointe);
		expect(production()).toBe(version().sha);
	});

	it('CI en cours sur la pointe, suivie de doc : la version part de la pointe', () => {
		pousser('success', 'src/a.ts');
		const code = pousser('running', 'src/b.ts');
		const doc = pousser(null, 'docs/journal.md');
		const r = deployerSansAttente();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('CI allégée en cours');
		expect(git(local, 'merge-base', '--is-ancestor', code, version().sha)).toBe('');
		expect(version().parent).toBe(doc);
	});

	it('--essai montre la livraison, sans rien créer', () => {
		pousser('success', 'src/a.ts');
		pousser('running', 'src/b.ts');
		const r = deployerSansAttente('--essai');
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('CI allégée en cours');
		expect(git(local, 'tag')).toBe('');
		expect(production()).toBeNull();
	});
});

describe('deploy-prod.sh — ce qui arrête tout', () => {
	it('CI de la version rouge : la version reste, la prod ne bouge pas', () => {
		pousser('success', 'src/a.ts');
		ciVersion = 'failure';
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('sur la version');
		expect(production()).toBeNull();
	});

	it('main local en retard sur origin : rien ne se fait', () => {
		pousser('success', 'src/a.ts');
		git(local, 'reset', '-q', '--hard', 'HEAD~1');
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('diffère de origin/main');
		expect(production()).toBeNull();
	});

	it('commit local non poussé : arrêt, en le nommant', () => {
		pousser('success', 'src/a.ts');
		mkdirSync(join(local, 'docs'), { recursive: true });
		writeFileSync(join(local, 'docs/journal.md'), 'local\n');
		git(local, 'add', '-A');
		git(local, 'commit', '-q', '-m', 'docs(wip): journal d’une autre session');
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('diffère de origin/main');
		expect(r.sortie).toContain('journal d’une autre session');
		expect(production()).toBeNull();
	});

	it('CI rouge sur la pointe', () => {
		pousser('success', 'src/a.ts');
		pousser('failure', 'src/b.ts');
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('failure');
		expect(production()).toBeNull();
	});

	it('commit de code sans CI', () => {
		pousser('success', 'src/a.ts');
		pousser(null, 'package.json');
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('Commit de code sans');
		expect(production()).toBeNull();
	});

	it('un article du Shtam (.md sous src/) sans CI n’est pas de la doc', () => {
		pousser('success', 'src/a.ts');
		pousser(null, 'src/lib/server/shtam/articles/32.md');
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('Commit de code sans');
	});

	it('production a divergé : jamais de force-push', () => {
		pousser('success', 'src/a.ts');
		git(local, 'push', '-q', 'origin', 'HEAD:refs/heads/production');
		git(local, 'commit', '-q', '--allow-empty', '-m', 'divergent');
		git(local, 'push', '-q', '-f', 'origin', 'HEAD:refs/heads/production');
		const avant = production();
		git(local, 'reset', '-q', '--hard', 'HEAD~1');
		pousser('success', 'src/b.ts');
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain("n'est pas un ancêtre");
		expect(production()).toBe(avant);
	});
});

describe('deploy-prod.sh — relancer sous le verrou, au lieu de le rendre', () => {
	// Incident du 2026-11-02 : v0.63.0 rouge sur le plantage connu des tests
	// navigateur, script arrêté, verrou rendu, trois merges en 7 s ; la relance
	// lancée à la main, hors verrou, a été annulée en attente. Prod restée en v0.62.0.
	function relances(): string[] {
		const f = join(racine, 'relances');
		return existsSync(f) ? readFileSync(f, 'utf8').trim().split('\n') : [];
	}

	function lancer(args: string[] = [], extra: NodeJS.ProcessEnv = {}) {
		const r = spawnSync('bash', [SCRIPT, ...args], {
			cwd: dansLeBac(local),
			env: { ...env(), DEPLOY_PROD_ATTENTE_MAX: '60', DEPLOY_PROD_PAUSE: '0', ...extra },
			encoding: 'utf8'
		});
		return { status: r.status, sortie: `${r.stdout}${r.stderr}` };
	}

	it('version rouge sur le plantage connu : relancée sous le verrou, puis mise en prod', () => {
		pousser('success', 'src/a.ts');
		ciVersion = 'plantage';
		const r = lancer();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('relance 1/2 sous le verrou');
		expect(relances()).toEqual([version().sha]);
		expect(production()).toBe(version().sha);
	});

	it('plantage connu encore après deux relances : arrêt, la prod ne bouge pas', () => {
		pousser('success', 'src/a.ts');
		ciVersion = 'plantage';
		const r = lancer([], { APRES_RELANCE: 'plantage' });
		expect(r.status, r.sortie).toBe(1);
		expect(relances()).toHaveLength(2);
		expect(r.sortie).toContain('sur la version');
		expect(production()).toBeNull();
	});

	it('vraie CI rouge : aucune relance, et le message propose --relancer-ci', () => {
		pousser('success', 'src/a.ts');
		ciVersion = 'failure';
		const r = lancer();
		expect(r.status, r.sortie).toBe(1);
		expect(relances()).toEqual([]);
		expect(r.sortie).toContain('--relancer-ci');
		expect(production()).toBeNull();
	});

	// 2026-11-08 : wrapDynamicImport est aussi dans les logs verts du job client ;
	// seule la fermeture du navigateur signe le plantage.
	it('vrai test client rouge (wrapDynamicImport au log, navigateur ouvert) : aucune relance', () => {
		pousser('success', 'src/a.ts');
		ciVersion = 'client-rouge';
		const r = lancer();
		expect(r.status, r.sortie).toBe(1);
		expect(relances()).toEqual([]);
		expect(production()).toBeNull();
	});

	it('un job sur le plantage connu, un autre vraiment rouge : aucune relance', () => {
		pousser('success', 'src/a.ts');
		ciVersion = 'mixte';
		const r = lancer();
		expect(r.status, r.sortie).toBe(1);
		expect(relances()).toEqual([]);
		expect(production()).toBeNull();
	});

	it('un autre job rouge sans log d’échec (timeout, setup) : aucune relance', () => {
		pousser('success', 'src/a.ts');
		ciVersion = 'plantage-et-silencieux';
		const r = lancer();
		expect(r.status, r.sortie).toBe(1);
		expect(relances()).toEqual([]);
		expect(production()).toBeNull();
	});

	it('logs d’échec illisibles : traité comme un échec inconnu, aucune relance', () => {
		pousser('success', 'src/a.ts');
		ciVersion = 'muet';
		const r = lancer();
		expect(r.status, r.sortie).toBe(1);
		expect(relances()).toEqual([]);
		expect(production()).toBeNull();
	});

	it('pointe de main rouge sur le plantage connu : relancée, puis livrée', () => {
		pousser('success', 'src/a.ts');
		const pointe = pousser('plantage', 'src/b.ts');
		const r = lancer();
		expect(r.status, r.sortie).toBe(0);
		expect(relances()).toEqual([pointe]);
		expect(version().parent).toBe(pointe);
		expect(production()).toBe(version().sha);
	});

	it('--relancer-ci relance un échec que le script ne reconnaît pas, une fois', () => {
		pousser('success', 'src/a.ts');
		ciVersion = 'failure';
		const r = lancer(['--relancer-ci']);
		expect(r.status, r.sortie).toBe(0);
		expect(relances()).toEqual([version().sha]);
		expect(production()).toBe(version().sha);
	});

	it('rejouer l’incident : la version rouge reste en pointe, --relancer-ci la livre sans nouvelle version', () => {
		pousser('success', 'src/a.ts');
		ciVersion = 'failure';
		expect(lancer().status).toBe(1);
		const v = version();
		const r = lancer(['--relancer-ci']);
		expect(r.status, r.sortie).toBe(0);
		expect(relances()).toEqual([v.sha]);
		expect(git(local, 'tag')).toBe(v.tag); // pas de seconde version
		expect(production()).toBe(v.sha);
	});

	it('gh refuse la relance : arrêt, avec son message', () => {
		pousser('success', 'src/a.ts');
		ciVersion = 'plantage';
		const r = lancer([], { RELANCE_REFUSEE: '1' });
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('HTTP 403');
		expect(production()).toBeNull();
	});

	it('--essai ne relance rien', () => {
		pousser('success', 'src/a.ts');
		pousser('plantage', 'src/b.ts');
		const r = lancer(['--essai']);
		expect(r.status, r.sortie).toBe(1);
		expect(relances()).toEqual([]);
	});

	it('option inconnue : refusée avant toute chose', () => {
		const r = lancer(['--relance']);
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('Usage');
		expect(git(local, 'tag')).toBe('');
	});
});

describe('deploy-prod.sh — un seul déploiement à la fois (verrou « deploy »)', () => {
	it('un second deploy:prod sort en exit 2 sans rien créer ; l’essai passe', async () => {
		pousser('success', 'src/a.ts');
		const premier = spawn('python3', [LOCK, 'deploy', 'pnpm deploy:prod', '--', 'sleep', '60'], {
			cwd: dansLeBac(local),
			env: env(),
			stdio: 'ignore'
		});
		try {
			// Le détenteur écrit son PID une fois le verrou acquis
			const fichier = join(local, '.git', '.locks', 'deploy');
			for (let i = 0; i < 100; i++) {
				if (existsSync(fichier) && readFileSync(fichier, 'utf8').trim()) break;
				await new Promise((r) => setTimeout(r, 50));
			}
			const r = deployer();
			expect(r.status, r.sortie).toBe(2);
			expect(r.sortie).toContain('pnpm deploy:prod tourne déjà');
			expect(production()).toBeNull();
			const essai = deployer('--essai');
			expect(essai.status, essai.sortie).toBe(0);
			expect(essai.sortie).not.toContain('tourne déjà');
		} finally {
			premier.kill('SIGKILL');
		}
	});
});

/** Un commit vert qui apporte ces migrations ; `jouees` = celles déjà en prod. */
function pousserMigrations(migrations: string[], jouees: string[]): string {
	writeFileSync(join(racine, 'migrations-prod'), [BASE, ...jouees].map((m) => `${m}\n`).join(''));
	return pousser('success', ...migrations.map((m) => `supabase/migrations/${m}_exemple.sql`));
}

describe('deploy-prod.sh — avant : les migrations jouées en prod', () => {
	it('toutes jouées : une ligne le dit, la livraison se fait', () => {
		pousserMigrations(['20260101000000', '20260102000000'], ['20260101000000', '20260102000000']);
		const r = deployer();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('✅ migrations : les 3 du commit à livrer sont jouées en prod');
		expect(production()).toBe(version().sha);
	});

	it('une migration pas jouée : arrêt avant la version, en nommant le fichier', () => {
		pousserMigrations(['20260101000000', '20260102000000'], ['20260101000000']);
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('1 migration(s) du commit à livrer ne sont pas jouées en prod');
		expect(r.sortie).toContain('   supabase/migrations/20260102000000_exemple.sql');
		expect(r.sortie).not.toContain('   supabase/migrations/20260101000000_exemple.sql');
		expect(git(local, 'tag')).toBe('');
		expect(production()).toBeNull();
	});

	it('--essai fait le même contrôle', () => {
		pousserMigrations(['20260102000000'], []);
		const r = deployer('--essai');
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('   supabase/migrations/20260102000000_exemple.sql');
	});

	it('--migration-apres laisse passer celle qu’il nomme, et rappelle de la jouer à la fin', () => {
		pousserMigrations(['20260101000000', '20260102000000'], ['20260101000000']);
		const r = deployer('--migration-apres', '20260102000000');
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('sauf 20260102000000');
		expect(production()).toBe(version().sha);
		expect(r.sortie.indexOf('Reste à jouer en prod')).toBeGreaterThan(r.sortie.indexOf('en ligne'));
		expect(r.sortie).toContain('20260102000000 (pnpm db:migrate)');
	});

	it('--migration-apres ne couvre que celle qu’il nomme', () => {
		pousserMigrations(['20260102000000', '20260103000000'], []);
		const r = deployer('--migration-apres', '20260102000000');
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('   supabase/migrations/20260103000000_exemple.sql');
		expect(r.sortie).not.toContain('   supabase/migrations/20260102000000_exemple.sql');
		expect(production()).toBeNull();
	});

	it('--migration-apres sur une migration déjà jouée (faute de frappe) : arrêt', () => {
		pousserMigrations(['20260101000000'], ['20260101000000']);
		const r = deployer('--migration-apres', '20260101000000');
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain("n'est pas en attente");
		expect(git(local, 'tag')).toBe('');
	});

	it('--migration-apres sans horodatage, ou avec autre chose : refusé', () => {
		pousser('success', 'src/a.ts');
		for (const args of [['--migration-apres'], ['--migration-apres', '--essai']]) {
			const r = deployer(...args);
			expect(r.status, r.sortie).toBe(1);
			expect(r.sortie).toContain('14 chiffres');
		}
		expect(git(local, 'tag')).toBe('');
	});

	it('prod en avance sur le commit : signalé, la livraison se fait', () => {
		pousserMigrations(['20260101000000'], ['20260101000000', '20260105000000']);
		const r = deployer();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toMatch(/absente\(s\) du commit à livrer.*20260105000000/);
		expect(production()).toBe(version().sha);
	});

	it('prod illisible : contrôle non fait, donc rien n’est créé', () => {
		pousserMigrations(['20260101000000'], ['panne']);
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('Impossible de lire les migrations jouées en prod');
		expect(r.sortie).toContain('failed to connect');
		expect(git(local, 'tag')).toBe('');
		expect(production()).toBeNull();
	});
});

/** Les commits passés au contrôle « prod = dépôt », dans l'ordre. */
function typesCompares(): string[] {
	const f = join(racine, 'types-prod-appels');
	return existsSync(f) ? readFileSync(f, 'utf8').trim().split('\n') : [];
}

describe('deploy-prod.sh — avant : la prod est la base que le dépôt décrit', () => {
	it('même schéma : une ligne le dit, c’est le commit à livrer qui est comparé', () => {
		const vert = pousser('success', 'src/a.ts');
		pousser(null, 'docs/apres.md');
		const r = deployer();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('✅ prod = dépôt');
		expect(typesCompares()).toEqual([vert]);
		expect(production()).toBe(version().sha);
	});

	it('écart : arrêt avant la version, l’écart est montré', () => {
		pousser('success', 'src/a.ts');
		decor = { TYPES_PROD_ETAT: 'ecart' };
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('Tables.classes.Row.couleur');
		expect(r.sortie).toContain('Contrôle « prod = dépôt »');
		expect(r.sortie).toContain('pnpm db:types:prod');
		expect(git(local, 'tag')).toBe('');
		expect(production()).toBeNull();
	});

	it('--essai fait le même contrôle', () => {
		pousser('success', 'src/a.ts');
		decor = { TYPES_PROD_ETAT: 'ecart' };
		const r = deployer('--essai');
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('Tables.classes.Row.couleur');
	});

	it('une migration pas jouée arrête d’abord : le schéma n’est pas comparé', () => {
		pousserMigrations(['20260102000000'], []);
		decor = { TYPES_PROD_ETAT: 'ecart' };
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('ne sont pas jouées en prod');
		expect(typesCompares()).toEqual([]);
	});

	it('--migration-apres : écart attendu, contrôle sauté et dit, rappel de le rejouer', () => {
		pousserMigrations(['20260102000000'], []);
		decor = { TYPES_PROD_ETAT: 'ecart' };
		const r = deployer('--migration-apres', '20260102000000');
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toMatch(/« prod = dépôt » NON FAIT.*20260102000000.*pnpm db:types:prod/);
		expect(typesCompares()).toEqual([]);
		expect(production()).toBe(version().sha);
	});

	it('--sans-controle-types : sauté et dit, la livraison se fait', () => {
		pousser('success', 'src/a.ts');
		decor = { TYPES_PROD_ETAT: 'ecart' };
		const r = deployer('--sans-controle-types');
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('sauté (--sans-controle-types)');
		expect(typesCompares()).toEqual([]);
		expect(production()).toBe(version().sha);
	});
});

describe('deploy-prod.sh — après : la construction de Vercel et le site', () => {
	it('construction réussie, nouvelle construction servie, pages vertes', () => {
		pousser('success', 'src/a.ts');
		const r = deployer();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toMatch(/✅ v0\.\d+\.0 en ligne\. Tout répond \(3 chemins\)\./);
		// Vercel est interrogé sur le commit de version, pas sur son parent
		expect(readFileSync(`${etats}.vercel`, 'utf8')).toContain(`commits/${version().sha}/status`);
	});

	it('note la durée de ses étapes pour pnpm durees, sous le nom de la version', () => {
		pousser('success', 'src/a.ts');
		const r = deployer();
		expect(r.status, r.sortie).toBe(0);
		const journal = readFileSync(join(racine, '.local/state/durees/mises-en-prod.csv'), 'utf8');
		const lignes = journal.trim().split('\n');
		expect(lignes.map((l) => l.split(';')[2])).toEqual(['ci-version', 'vercel', 'bascule']);
		for (const l of lignes) {
			expect(l).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z;v0\.\d+\.0;[a-z-]+;\d+$/);
		}
	});

	it('journal des durées impossible à écrire : la mise en prod se fait quand même', () => {
		pousser('success', 'src/a.ts');
		writeFileSync(join(racine, 'pas-un-dossier'), '');
		decor = { DUREES_ETAT: join(racine, 'pas-un-dossier') };
		const r = deployer();
		expect(r.status, r.sortie).toBe(0);
		expect(production()).toBe(version().sha);
	});

	it('--verifier ne note aucune durée', () => {
		pousser('success', 'src/a.ts');
		decor = { DUREES_ETAT: join(racine, 'durees-verifier') };
		expect(deployer().status).toBe(0);
		rmSync(join(racine, 'durees-verifier'), { recursive: true });
		const r = deployer('--verifier');
		expect(r.status, r.sortie).toBe(0);
		expect(existsSync(join(racine, 'durees-verifier'))).toBe(false);
	});

	it('construction en échec : erreur, lien donné, production reste avancée', () => {
		pousser('success', 'src/a.ts');
		decor = { VERCEL: 'failure' };
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain("a échoué : l'ancienne version reste en ligne");
		expect(r.sortie).toContain('https://vercel.test/construction');
		expect(r.sortie).not.toContain('Tout répond');
		expect(production()).toBe(version().sha); // rien n'est défait
	});

	it.each(['pending', 'absent'])('construction pas finie (%s) à la fin de l’attente', (etat) => {
		pousser('success', 'src/a.ts');
		decor = { VERCEL: etat };
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain("n'a pas fini de construire");
		expect(r.sortie).toContain('pnpm deploy:prod --verifier');
	});

	it('construit, mais le domaine sert encore l’ancienne construction', () => {
		pousser('success', 'src/a.ts');
		decor = { BUILD_FIGE: '1' };
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain("sert encore l'ancienne construction");
		expect(r.sortie).not.toContain('Tout répond');
	});

	it('une page publique ne répond pas : erreur, la page est nommée, rien n’est défait', () => {
		pousser('success', 'src/a.ts');
		decor = { PAGES_ROUGES: '1' };
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('/automaths → 500');
		expect(r.sortie).toContain('Aucun retour arrière automatique');
		expect(r.sortie).not.toContain('  OK ');
		expect(production()).toBe(version().sha);
	});

	it('mode maintenance : dit, pages non vérifiées, pas une panne', () => {
		pousser('success', 'src/a.ts');
		decor = { ACCUEIL: '503', CORPS: '<title>Maintenance | Chiphre</title>', PAGES_ROUGES: '1' };
		const r = deployer();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('mode maintenance est actif');
		expect(r.sortie).not.toContain('/automaths');
	});

	it('503 sans la page de maintenance : une panne, pas la maintenance', () => {
		pousser('success', 'src/a.ts');
		decor = { ACCUEIL: '503', PAGES_ROUGES: '1' };
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).not.toContain('maintenance est actif');
		expect(r.sortie).toContain('/automaths → 500');
	});

	it('le site ne répond plus après le push : pas pris pour la nouvelle construction', () => {
		pousser('success', 'src/a.ts');
		decor = { SITE_MUET: '1' };
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('ne répond pas');
		expect(r.sortie).not.toContain('Tout répond');
	});

	it('rien à livrer, ou --essai : aucune vérification du site', () => {
		pousser('success', 'src/a.ts');
		expect(deployer('--essai').sortie).not.toContain('Vérification des pages');
		deployer();
		rmSync(`${etats}.vercel`);
		const r = deployer();
		expect(r.sortie).toContain('rien à livrer');
		expect(r.sortie).toContain('pnpm deploy:prod --verifier');
		expect(existsSync(`${etats}.vercel`)).toBe(false);
	});

	it('--verifier : rejoue le contrôle sur production, sans rien créer', () => {
		pousser('success', 'src/a.ts');
		decor = { PAGES_ROUGES: '1' };
		expect(deployer().status).toBe(1);
		const v = version();
		const tags = git(local, 'tag');
		decor = {};
		pousser('success', 'src/b.ts'); // main a avancé : --verifier ne livre pas pour autant
		const r = deployer('--verifier');
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toMatch(/✅ v0\.\d+\.0 en ligne/);
		expect(production()).toBe(v.sha);
		expect(git(local, 'tag')).toBe(tags);
	});

	it('aucune migration dans le commit à livrer : contrôle impossible, arrêt', () => {
		git(local, 'rm', '-q', '-r', 'supabase');
		git(local, 'commit', '-q', '-m', 'sans migrations');
		git(local, 'push', '-q', 'origin', 'HEAD:main');
		appendFileSync(etats, `${git(local, 'rev-parse', 'HEAD')} success\n`);
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('Aucune migration trouvée');
		expect(production()).toBeNull();
	});
});
