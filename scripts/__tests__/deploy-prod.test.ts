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
 *   sans rien créer ; l'essai, lui, n'est pas bloqué.
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
		CI_VERSION: ciVersion
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
	mkdirSync(github);
	mkdirSync(local);
	mkdirSync(join(racine, 'bin'));
	// Bouchon de `gh` : l'état de la CI de chaque commit est lu dans $ETATS_CI
	// (dernière ligne pour ce SHA). Le n° de run d'un commit est son SHA.
	// « running » : la CI tourne, donc « CI Summary » n'existe pas encore ;
	// « running-then-success » : deux lectures en cours, puis vert ;
	// « plantage » : rouge sur le plantage connu des tests navigateur ;
	// « mixte » : un job sur ce plantage, un autre vraiment rouge ;
	// « muet » : rouge, logs illisibles.
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
	case "$etat" in
	plantage)
		printf 'Client Tests (browser, shard 1/2)\\tUNKNOWN STEP\\t09:22:29Z TypeError: Cannot read properties of undefined (reading %swrapDynamicImport%s)\\n' "'" "'"
		printf 'CI Summary\\tUNKNOWN STEP\\t09:29:30Z ❌ Client Tests: failure\\n' ;;
	mixte)
		printf 'Client Tests (browser, shard 1/2)\\tUNKNOWN STEP\\t09:22:29Z TypeError: Cannot read properties of undefined (reading %swrapDynamicImport%s)\\n' "'" "'"
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
	case "$etat" in running | '') echo absent ;; plantage | mixte | muet) echo failure ;; *) echo "$etat" ;; esac ;;
esac
`
	);
	chmodSync(join(racine, 'bin/gh'), 0o755);
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
	pousser('success', 'src/app.ts');
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
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('CI en cours');
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

describe('deploy-prod.sh — attendre la CI de main sous le verrou', () => {
	function deployerAvecAttente(...args: string[]) {
		const r = spawnSync('bash', [SCRIPT, ...args], {
			cwd: dansLeBac(local),
			env: { ...env(), DEPLOY_PROD_ATTENTE_MAX: '60', DEPLOY_PROD_PAUSE: '0' },
			encoding: 'utf8'
		});
		return { status: r.status, sortie: `${r.stdout}${r.stderr}` };
	}

	it('CI en cours sur la pointe : attend sous le verrou, puis livre', () => {
		pousser('success', 'src/a.ts');
		const pointe = pousser('running-then-success', 'src/b.ts');
		const r = deployerAvecAttente();
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('sous le verrou');
		expect(version().parent).toBe(pointe);
		expect(production()).toBe(version().sha);
	});

	it('CI toujours en cours au bout de l’attente : ni version, ni prod', () => {
		pousser('success', 'src/a.ts');
		pousser('running', 'src/b.ts');
		const r = deployerAvecAttente();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('CI en cours');
		expect(git(local, 'tag')).toBe('');
		expect(production()).toBeNull();
	});

	it('--essai n’attend pas la CI en cours', () => {
		pousser('success', 'src/a.ts');
		pousser('running-then-success', 'src/b.ts');
		const r = deployerAvecAttente('--essai');
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('CI en cours');
		expect(r.sortie).not.toContain('sous le verrou');
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

	it('CI en cours sur la pointe', () => {
		pousser('success', 'src/a.ts');
		pousser('pending', 'src/b.ts');
		const r = deployer();
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('CI en cours');
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

	it('un job sur le plantage connu, un autre vraiment rouge : aucune relance', () => {
		pousser('success', 'src/a.ts');
		ciVersion = 'mixte';
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
