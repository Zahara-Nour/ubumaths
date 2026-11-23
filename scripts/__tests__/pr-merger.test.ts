/**
 * `pnpm pr:merger` — merger une PR et ranger derrière elle
 * ========================================================
 *
 * Gardé ici (scripts/pr-merger/) :
 * - le merge ne part que sur les contrôles du dernier commit tous verts (« sauté »
 *   vaut vert), contrôle de synthèse présent ; une liste vide n'est jamais verte ;
 * - CI en cours → attente ; rouge, brouillon, conflit, PR fermée → rien n'est mergé ;
 * - PR avec migration → garde des horodatages jouée avant, son refus arrête tout ;
 * - `pnpm deploy:prod` en cours (verrou « deploy ») → attente, puis exit 2 ;
 * - le commit mergé est celui dont les contrôles ont été lus (`--match-head-commit`),
 *   toujours par un merge commit ; `Base branch was modified` → une seule relance ;
 * - rien n'est rangé tant que l'état relu n'est pas `MERGED` ;
 * - rangement : worktree retiré, branche locale supprimée, dépôt principal à jour ;
 *   worktree pas propre ou commits locaux jamais poussés → tout reste en place ;
 * - PR déjà mergée → rangement seul ; `--essai` → rien ;
 * - une PR mergée par la commande note sa durée pour `pnpm durees`, même lancée
 *   depuis le worktree qu'elle retire ; un rangement seul ou un essai, rien ;
 * - session Claude en arrière-plan (`CLAUDE_CODE_SESSION_ATTENDED=0`) → pas de refus.
 *
 * Dépôts jetables : un dépôt nu tient lieu de GitHub, `gh` est un bouchon qui lit
 * la PR dans un fichier JSON et fait le merge dans le dépôt nu. git ne tourne
 * jamais hors du dossier jetable.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import {
	blocage,
	fichiersSensibles,
	lireWorktrees,
	migrations,
	refus,
	verdictDesControles,
	type Controle,
	type Pr
} from '../pr-merger/logique.ts';

const SCRIPT = resolve(__dirname, '../pr-merger/index.ts');
const TSX = resolve(__dirname, '../../node_modules/.bin/tsx');
const VERROU = resolve(__dirname, '../lib/lock.py');
const BRANCHE = 'feat/exemple';

const VERT: Controle[] = [
	{ __typename: 'CheckRun', name: 'Lint', status: 'COMPLETED', conclusion: 'SUCCESS' },
	{ __typename: 'CheckRun', name: 'Build', status: 'COMPLETED', conclusion: 'SKIPPED' },
	{ __typename: 'CheckRun', name: 'CI Summary', status: 'COMPLETED', conclusion: 'SUCCESS' }
];
const EN_COURS: Controle[] = [
	{ __typename: 'CheckRun', name: 'Lint', status: 'COMPLETED', conclusion: 'SUCCESS' },
	{ __typename: 'CheckRun', name: 'Type Check', status: 'IN_PROGRESS', conclusion: null }
];
const ROUGE: Controle[] = [
	{ __typename: 'CheckRun', name: 'Lint', status: 'COMPLETED', conclusion: 'SUCCESS' },
	{
		__typename: 'CheckRun',
		name: 'Server Tests (shard 2/4)',
		status: 'COMPLETED',
		conclusion: 'FAILURE'
	},
	{ __typename: 'CheckRun', name: 'CI Summary', status: 'COMPLETED', conclusion: 'FAILURE' }
];

function pr(champs: Partial<Pr> = {}): Pr {
	return {
		number: 12,
		state: 'OPEN',
		isDraft: false,
		baseRefName: 'main',
		headRefName: BRANCHE,
		headRefOid: 'a'.repeat(40),
		mergeable: 'MERGEABLE',
		mergeStateStatus: 'CLEAN',
		statusCheckRollup: VERT,
		...champs
	};
}

describe('pr:merger : règles', () => {
	it('tout fini, réussi ou sauté, synthèse présente : vert', () => {
		expect(verdictDesControles(VERT)).toEqual({ etat: 'vert' });
	});

	it('liste vide : absent, jamais vert', () => {
		expect(verdictDesControles([])).toEqual({ etat: 'absent' });
	});

	it('tout vert mais pas de synthèse (workflow annexe seul enregistré) : absent', () => {
		expect(verdictDesControles(VERT.slice(0, 2))).toEqual({ etat: 'absent' });
	});

	it('synthèse sautée : elle n’a rien vérifié, absent', () => {
		const sautee = { ...VERT[2], conclusion: 'SKIPPED' };
		expect(verdictDesControles([VERT[0], VERT[1], sautee])).toEqual({ etat: 'absent' });
	});

	it('un contrôle qui tourne : en cours, nommé', () => {
		expect(verdictDesControles(EN_COURS)).toEqual({ etat: 'en-cours', noms: ['Type Check'] });
	});

	it('un rouge l’emporte sur ce qui tourne encore', () => {
		const v = verdictDesControles([...EN_COURS, ROUGE[1]]);
		expect(v).toEqual({ etat: 'rouge', noms: ['Server Tests (shard 2/4) (failure)'] });
	});

	it('annulé, expiré : rouges', () => {
		const v = verdictDesControles([
			{ __typename: 'CheckRun', name: 'Build', status: 'COMPLETED', conclusion: 'CANCELLED' },
			{ __typename: 'CheckRun', name: 'Lint', status: 'COMPLETED', conclusion: 'TIMED_OUT' }
		]);
		expect(v).toEqual({ etat: 'rouge', noms: ['Build (cancelled)', 'Lint (timed_out)'] });
	});

	it('statut de commit (hors Actions) : en attente puis rouge', () => {
		const attente = { __typename: 'StatusContext', context: 'Vercel', state: 'PENDING' };
		const echec = { __typename: 'StatusContext', context: 'Vercel', state: 'FAILURE' };
		expect(verdictDesControles([...VERT, attente])).toEqual({ etat: 'en-cours', noms: ['Vercel'] });
		expect(verdictDesControles([...VERT, echec])).toEqual({
			etat: 'rouge',
			noms: ['Vercel (failure)']
		});
	});

	it('refus : fermée, autre base, brouillon, conflit', () => {
		expect(refus(pr())).toBeNull();
		expect(refus(pr({ state: 'CLOSED' }))).toMatch(/fermée/);
		expect(refus(pr({ baseRefName: 'production' }))).toMatch(/production/);
		expect(refus(pr({ isDraft: true }))).toMatch(/brouillon/);
		expect(refus(pr({ mergeable: 'CONFLICTING' }))).toMatch(/conflit/);
	});

	it('blocage : BLOCKED et DIRTY seulement (en retard sur main : mergeable)', () => {
		expect(blocage(pr({ mergeStateStatus: 'BLOCKED' }))).toMatch(/BLOCKED/);
		expect(blocage(pr({ mergeStateStatus: 'DIRTY' }))).toMatch(/conflit/);
		expect(blocage(pr({ mergeStateStatus: 'BEHIND' }))).toBeNull();
		expect(blocage(pr({ mergeStateStatus: 'UNKNOWN' }))).toBeNull();
	});

	it('migrations et fichiers sensibles', () => {
		const fichiers = [
			'supabase/migrations/20261123101530_exemple.sql',
			'src/routes/api/exemple/+server.ts',
			'src/lib/components/Exemple.svelte',
			'docs/systeme/exemple.md'
		];
		expect(migrations(fichiers)).toEqual([fichiers[0]]);
		expect(fichiersSensibles(fichiers)).toEqual(fichiers.slice(0, 2));
	});

	it('worktrees : le premier est le dépôt principal, HEAD détachée sans branche', () => {
		const lu = lireWorktrees(
			'worktree /d/principal\nHEAD abc\nbranch refs/heads/main\n\n' +
				'worktree /d/wt-exemple\nHEAD def\nbranch refs/heads/feat/exemple\n\n' +
				'worktree /d/wt-fige\nHEAD 123\ndetached\n'
		);
		expect(lu).toEqual([
			{ chemin: '/d/principal', branche: 'main' },
			{ chemin: '/d/wt-exemple', branche: 'feat/exemple' },
			{ chemin: '/d/wt-fige', branche: null }
		]);
	});
});

// ============================================================================
// De bout en bout, sur des dépôts jetables
// ============================================================================

let racine: string;
let github: string;
let principal: string;
let wt: string;
let decor: string;
let sha: string;
let variables: Record<string, string> = {};
let enfants: ChildProcess[] = [];

function env(): NodeJS.ProcessEnv {
	const propre = { ...process.env };
	// La session qui lance les tests ne décide pas de leur verdict.
	delete propre.CLAUDE_CODE_SESSION_ATTENDED;
	return {
		...propre,
		PATH: `${join(racine, 'bin')}:${process.env.PATH}`,
		HOME: racine,
		XDG_CONFIG_HOME: racine,
		GIT_CONFIG_NOSYSTEM: '1',
		GIT_CEILING_DIRECTORIES: dirname(racine),
		GIT_AUTHOR_NAME: 'test',
		GIT_AUTHOR_EMAIL: 'test@example.com',
		GIT_COMMITTER_NAME: 'test',
		GIT_COMMITTER_EMAIL: 'test@example.com',
		DECOR: decor,
		SERVEUR: join(racine, 'serveur'),
		PR_MERGER_PAUSE: '0',
		PR_MERGER_ATTENTE_MAX: '5',
		PR_MERGER_ATTENTE_ABSENT: '0',
		PR_MERGER_GARDE_MIGRATIONS: `bash ${join(racine, 'bin/garde')}`,
		...variables
	};
}

function dansLeBac(cwd: string): string {
	const reel = realpathSync(cwd);
	if (reel !== racine && !reel.startsWith(racine + sep))
		throw new Error(`hors du dossier jetable : « ${cwd} »`);
	return reel;
}

function git(cwd: string, ...args: string[]): string {
	const r = spawnSync('git', args, { cwd: dansLeBac(cwd), env: env(), encoding: 'utf8' });
	if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${r.status}\n${r.stderr}`);
	return r.stdout.trim();
}

/** Ce que `gh pr view` rendra ; `suite` = les lectures suivantes, dans l'ordre. */
function github_dit(premiere: Partial<Pr>, ...suite: Partial<Pr>[]): void {
	const lectures = [premiere, ...suite].map((p) => pr({ headRefOid: sha, ...p }));
	lectures.forEach((p, i) => {
		const dernier = i === lectures.length - 1;
		writeFileSync(join(decor, dernier ? 'pr.json' : `pr.json.${i + 1}`), JSON.stringify(p));
	});
}

function merger(args: string[] = ['12'], cwd = principal) {
	const r = spawnSync(TSX, [SCRIPT, ...args], {
		cwd: dansLeBac(cwd),
		env: env(),
		encoding: 'utf8'
	});
	return { status: r.status, sortie: `${r.stdout}${r.stderr}` };
}

function lu(nom: string): string {
	const f = join(decor, nom);
	return existsSync(f) ? readFileSync(f, 'utf8') : '';
}

/** Les lignes du journal des durées, quand le test en a demandé un (`DUREES_ETAT`). */
function dureesNotees(): string[] {
	const f = join(racine, 'durees/local.csv');
	return existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean) : [];
}

function brancheLocale(): boolean {
	return (
		spawnSync('git', ['rev-parse', '-q', '--verify', `refs/heads/${BRANCHE}`], {
			cwd: dansLeBac(principal),
			env: env()
		}).status === 0
	);
}

function mainContientLaBranche(): boolean {
	return (
		spawnSync('git', ['merge-base', '--is-ancestor', sha, 'main'], {
			cwd: dansLeBac(principal),
			env: env()
		}).status === 0
	);
}

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'pr-merger-')));
	github = join(racine, 'github.git');
	principal = join(racine, 'principal');
	wt = join(racine, 'wt-exemple');
	decor = join(racine, 'decor');
	variables = {};
	enfants = [];
	for (const d of [github, decor, join(racine, 'bin')]) mkdirSync(d);

	// Bouchon de `gh`. `pr view` : la k-ième lecture rend pr.json.k s'il existe,
	// sinon pr.json. `pr merge` : note ses arguments ; une ligne de merge-echecs =
	// un échec avec ce message ; sinon fait le merge dans le dépôt nu (merge commit,
	// branche distante supprimée, comme le réglage du dépôt) et passe la PR à MERGED,
	// sauf $MERGE_SANS_EFFET.
	writeFileSync(
		join(racine, 'bin/gh'),
		`#!/bin/bash
echo "$*" >> "$DECOR/appels"
case "$1 $2" in
"pr view")
	k=$(( $(cat "$DECOR/lectures" 2>/dev/null || echo 0) + 1 ))
	echo "$k" > "$DECOR/lectures"
	if [ -f "$DECOR/pr.json.$k" ]; then cat "$DECOR/pr.json.$k"; else cat "$DECOR/pr.json"; fi ;;
"pr diff") cat "$DECOR/fichiers" 2>/dev/null ;;
"pr merge")
	echo "$*" >> "$DECOR/merges"
	if [ -s "$DECOR/merge-echecs" ]; then
		head -1 "$DECOR/merge-echecs" >&2
		tail -n +2 "$DECOR/merge-echecs" > "$DECOR/merge-echecs.x" && mv "$DECOR/merge-echecs.x" "$DECOR/merge-echecs"
		exit 1
	fi
	[ -n "\${MERGE_SANS_EFFET:-}" ] && exit 0
	git -C "$SERVEUR" fetch -q origin &&
		git -C "$SERVEUR" checkout -q -B main origin/main &&
		git -C "$SERVEUR" merge -q --no-ff -m "Merge pull request" origin/${BRANCHE} &&
		git -C "$SERVEUR" push -q origin main &&
		git -C "$SERVEUR" push -q origin --delete ${BRANCHE} || exit 1
	sed -i.x 's/"state":"OPEN"/"state":"MERGED"/' "$DECOR/pr.json" ;;
*) echo "gh $* : pas prévu par le bouchon" >&2; exit 1 ;;
esac
`
	);
	// Bouchon de la garde des migrations : note l'appel, $GARDE_REFUSE la fait échouer.
	writeFileSync(
		join(racine, 'bin/garde'),
		`#!/bin/bash
echo "$*" >> "$DECOR/garde"
[ -n "\${GARDE_REFUSE:-}" ] && { echo "horodatage déjà pris sur origin/main" >&2; exit 1; }
exit 0
`
	);
	chmodSync(join(racine, 'bin/gh'), 0o755);

	git(racine, 'init', '-q', '--bare', '-b', 'main', github);
	git(racine, 'clone', '-q', github, principal);
	writeFileSync(join(principal, 'README'), 'base\n');
	git(principal, 'add', 'README');
	git(principal, 'commit', '-q', '-m', 'base');
	git(principal, 'push', '-q', '-u', 'origin', 'HEAD:main');
	git(principal, 'worktree', 'add', '-q', '-b', BRANCHE, wt, 'origin/main');
	writeFileSync(join(wt, 'exemple.txt'), 'exemple\n');
	git(wt, 'add', 'exemple.txt');
	git(wt, 'commit', '-q', '-m', 'exemple');
	git(wt, 'push', '-q', '-u', 'origin', BRANCHE);
	sha = git(wt, 'rev-parse', 'HEAD');
	git(racine, 'clone', '-q', github, join(racine, 'serveur'));
	writeFileSync(join(decor, 'fichiers'), 'exemple.txt\n');
	github_dit({});
});

afterEach(() => {
	for (const e of enfants) e.kill('SIGKILL');
	rmSync(racine, { recursive: true, force: true });
});

describe('pr:merger : de bout en bout', () => {
	it('contrôles verts : merge commit du commit lu, worktree et branche retirés, main à jour', () => {
		const r = merger();
		expect(r.sortie).toContain('#12 : MERGED');
		expect(r.status).toBe(0);
		expect(lu('merges').trim()).toBe(`pr merge 12 --merge --match-head-commit ${sha}`);
		expect(existsSync(wt)).toBe(false);
		expect(brancheLocale()).toBe(false);
		expect(mainContientLaBranche()).toBe(true);
		expect(r.sortie).toContain('Reste à faire : « Reprendre ici »');
		expect(r.sortie).not.toContain('db:migrate');
		expect(r.sortie).not.toContain('⚠️');
		expect(lu('garde')).toBe('');
	});

	it('lancée depuis le worktree qu’elle retire, sans numéro : même résultat', () => {
		const r = merger([], wt);
		expect(r.status).toBe(0);
		expect(lu('merges')).toContain('pr merge 12 --merge');
		expect(existsSync(wt)).toBe(false);
		expect(brancheLocale()).toBe(false);
	});

	it('PR mergée : durée notée pour `pnpm durees` ; rangement seul ou essai : rien', () => {
		variables = { DUREES_ETAT: join(racine, 'durees') };
		expect(merger(['12', '--essai']).status).toBe(0);
		expect(dureesNotees()).toHaveLength(0);
		// Depuis le worktree qu'elle retire : le script qui note n'existe plus à la fin.
		expect(merger([], wt).status).toBe(0);
		expect(existsSync(wt)).toBe(false);
		expect(dureesNotees()).toHaveLength(1);
		expect(dureesNotees()[0]).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:]+Z;pr-merger;\d+$/);
		// Déjà mergée : le second lancement ne fait que ranger.
		expect(merger().status).toBe(0);
		expect(dureesNotees()).toHaveLength(1);
	});

	it('CI en cours puis verte : attend, puis merge', () => {
		github_dit({ statusCheckRollup: EN_COURS }, { statusCheckRollup: EN_COURS }, {});
		const r = merger();
		expect(r.sortie).toContain('CI en cours');
		expect(r.status).toBe(0);
		expect(existsSync(wt)).toBe(false);
	});

	it('nouveau commit poussé pendant l’attente : c’est lui qui est mergé', () => {
		const autre = 'b'.repeat(40);
		github_dit({ statusCheckRollup: EN_COURS }, { headRefOid: autre });
		variables = { MERGE_SANS_EFFET: '1' };
		merger();
		expect(lu('merges')).toContain(`--match-head-commit ${autre}`);
	});

	it('verte mais encore `BLOCKED` une lecture : relit, puis merge', () => {
		variables = { PR_MERGER_ATTENTE_ABSENT: '5' };
		github_dit({ mergeStateStatus: 'BLOCKED' }, {});
		const r = merger();
		expect(r.sortie).toContain('encore `BLOCKED`');
		expect(r.status).toBe(0);
		expect(existsSync(wt)).toBe(false);
	});

	it('--essai sur une CI en cours : le dit sans attendre', () => {
		github_dit({ statusCheckRollup: EN_COURS }, {});
		const r = merger(['12', '--essai']);
		expect(r.status).toBe(2);
		expect(lu('lectures').trim()).toBe('1');
		expect(lu('merges')).toBe('');
	});

	it('durée illisible dans l’environnement : valeur par défaut, pas d’attente sans fin', () => {
		variables = { PR_MERGER_ATTENTE_ABSENT: 'bientot', PR_MERGER_ATTENTE_MAX: 'jamais' };
		github_dit({ statusCheckRollup: EN_COURS }, {});
		expect(merger().status).toBe(0);
	});

	it('CI qui ne finit pas : exit 2, rien de mergé', () => {
		variables = { PR_MERGER_ATTENTE_MAX: '0' };
		github_dit({ statusCheckRollup: EN_COURS });
		const r = merger();
		expect(r.status).toBe(2);
		expect(r.sortie).toContain('Type Check');
		expect(lu('merges')).toBe('');
		expect(existsSync(wt)).toBe(true);
	});

	it('contrôle rouge : nommé, rien de mergé', () => {
		github_dit({ statusCheckRollup: ROUGE });
		const r = merger();
		expect(r.status).toBe(1);
		expect(r.sortie).toContain('Server Tests (shard 2/4) (failure)');
		expect(lu('merges')).toBe('');
	});

	it('aucun contrôle sur le dernier commit : refus, jamais « vert » sur du vide', () => {
		github_dit({ statusCheckRollup: [] });
		const r = merger();
		expect(r.status).toBe(1);
		expect(r.sortie).toContain('aucun verdict de la CI');
		expect(lu('merges')).toBe('');
	});

	it.each([
		['brouillon', { isDraft: true }, /brouillon/],
		['conflit', { mergeable: 'CONFLICTING' }, /conflit/],
		['fermée', { state: 'CLOSED' }, /fermée/],
		['bloquée', { mergeStateStatus: 'BLOCKED' }, /BLOCKED/]
	])('PR %s : rien de mergé', (_nom, champs, motif) => {
		github_dit(champs);
		const r = merger();
		expect(r.status).toBe(1);
		expect(r.sortie).toMatch(motif);
		expect(lu('merges')).toBe('');
		expect(existsSync(wt)).toBe(true);
	});

	it('PR avec migration : garde jouée avant le merge, db:migrate rappelé, jamais joué', () => {
		writeFileSync(join(decor, 'fichiers'), 'supabase/migrations/20261123101530_exemple.sql\n');
		const r = merger();
		expect(r.status).toBe(0);
		expect(lu('garde').trim()).toBe('--pr 12');
		expect(r.sortie).toContain('PR sensible');
		expect(r.sortie).toContain('`pnpm db:migrate` si les 4 conditions sont réunies');
		expect(lu('appels')).not.toContain('migrate');
	});

	it('garde des migrations qui refuse : rien de mergé', () => {
		writeFileSync(join(decor, 'fichiers'), 'supabase/migrations/20261123101530_exemple.sql\n');
		variables = { GARDE_REFUSE: '1' };
		const r = merger();
		expect(r.status).toBe(1);
		expect(r.sortie).toContain('horodatage déjà pris');
		expect(lu('merges')).toBe('');
	});

	it('deploy:prod en cours : attend le verrou, exit 2 s’il n’est pas rendu', async () => {
		const tenu = spawn('python3', [VERROU, 'deploy', 'pnpm deploy:prod', '--', 'sleep', '30'], {
			cwd: dansLeBac(principal),
			env: env()
		});
		enfants.push(tenu);
		// Le verrou est pris quand lock.py dit qu'un autre le tient.
		for (let i = 0; i < 100; i++) {
			const r = spawnSync('python3', [VERROU, '--tenu', 'deploy'], {
				cwd: dansLeBac(principal),
				env: env()
			});
			if (r.status === 0) break;
			await new Promise((fin) => setTimeout(fin, 50));
		}
		variables = { PR_MERGER_ATTENTE_MAX: '0' };
		const r = merger();
		expect(r.sortie).toContain('deploy:prod');
		expect(r.status).toBe(2);
		expect(lu('merges')).toBe('');
	});

	it('`Base branch was modified` une fois : relance, mergée', () => {
		writeFileSync(
			join(decor, 'merge-echecs'),
			'GraphQL: Base branch was modified. Review and try the merge again.\n'
		);
		const r = merger();
		expect(r.status).toBe(0);
		expect(lu('merges').trim().split('\n')).toHaveLength(2);
		expect(existsSync(wt)).toBe(false);
	});

	it('`Base branch was modified` deux fois : une seule relance, rien de rangé', () => {
		const ligne = 'GraphQL: Base branch was modified. Review and try the merge again.\n';
		writeFileSync(join(decor, 'merge-echecs'), ligne + ligne + ligne);
		const r = merger();
		expect(r.status).toBe(1);
		expect(lu('merges').trim().split('\n')).toHaveLength(2);
		expect(existsSync(wt)).toBe(true);
		expect(brancheLocale()).toBe(true);
	});

	it('autre échec du merge : pas de relance, rien de rangé', () => {
		writeFileSync(join(decor, 'merge-echecs'), 'GraphQL: Head sha did not match\n');
		const r = merger();
		expect(r.status).toBe(1);
		expect(r.sortie).toContain('Head sha did not match');
		expect(lu('merges').trim().split('\n')).toHaveLength(1);
		expect(existsSync(wt)).toBe(true);
	});

	it('merge accepté mais état relu ≠ MERGED : rien de rangé', () => {
		variables = { MERGE_SANS_EFFET: '1' };
		const r = merger();
		expect(r.status).toBe(1);
		expect(r.sortie).toContain('pas MERGED');
		expect(existsSync(wt)).toBe(true);
		expect(brancheLocale()).toBe(true);
	});

	it('PR déjà mergée : pas de second merge, rangement seul', () => {
		expect(merger().status).toBe(0);
		git(principal, 'worktree', 'add', '-q', '-b', BRANCHE, wt, sha);
		writeFileSync(join(decor, 'merges'), '');
		const r = merger();
		expect(r.status).toBe(0);
		expect(r.sortie).toContain('Déjà mergée');
		expect(lu('merges')).toBe('');
		expect(existsSync(wt)).toBe(false);
		expect(brancheLocale()).toBe(false);
	});

	it('worktree pas propre : mergée, worktree et branche laissés, fichier nommé', () => {
		writeFileSync(join(wt, 'brouillon.txt'), 'pas commité\n');
		const r = merger();
		expect(r.status).toBe(0);
		expect(r.sortie).toContain('#12 : MERGED');
		expect(r.sortie).toContain('brouillon.txt');
		expect(existsSync(join(wt, 'brouillon.txt'))).toBe(true);
		expect(brancheLocale()).toBe(true);
	});

	it('commit local jamais poussé : worktree et branche gardés', () => {
		writeFileSync(join(wt, 'apres.txt'), 'après la PR\n');
		git(wt, 'add', 'apres.txt');
		git(wt, 'commit', '-q', '-m', 'apres');
		const r = merger();
		expect(r.status).toBe(0);
		expect(r.sortie).toContain('commits absents de main');
		expect(existsSync(wt)).toBe(true);
		expect(brancheLocale()).toBe(true);
	});

	it('dépôt principal avec un commit pas encore poussé : jamais réécrit, signalé, le reste rangé', () => {
		writeFileSync(join(principal, 'doc.md'), 'doc d’une autre session\n');
		git(principal, 'add', 'doc.md');
		git(principal, 'commit', '-q', '-m', 'doc');
		const avant = git(principal, 'rev-parse', 'main');
		const r = merger();
		expect(r.status).toBe(0);
		expect(git(principal, 'rev-parse', 'main')).toBe(avant);
		expect(r.sortie).toContain('dépôt principal pas mis à jour');
		expect(existsSync(wt)).toBe(false);
		expect(brancheLocale()).toBe(false);
	});

	it('branche locale sans worktree : supprimée', () => {
		git(principal, 'worktree', 'remove', wt);
		const r = merger();
		expect(r.status).toBe(0);
		expect(brancheLocale()).toBe(false);
	});

	it('ni worktree ni branche locale : mergée, rien à ranger', () => {
		git(principal, 'worktree', 'remove', wt);
		git(principal, 'branch', '-q', '-D', BRANCHE);
		const r = merger();
		expect(r.status).toBe(0);
		expect(r.sortie).not.toContain('⚠️');
	});

	it('--essai : contrôles lus, rien de mergé ni de rangé', () => {
		const r = merger(['12', '--essai']);
		expect(r.status).toBe(0);
		expect(r.sortie).toContain('serait mergée');
		expect(lu('merges')).toBe('');
		expect(existsSync(wt)).toBe(true);
	});

	it('session Claude en arrière-plan (personne devant le terminal) : pas de refus', () => {
		variables = { CLAUDE_CODE_SESSION_ATTENDED: '0' };
		const r = merger();
		expect(r.status).toBe(0);
		expect(r.sortie).not.toContain('ne merge jamais');
		expect(lu('merges')).not.toBe('');
	});

	it('argument qui n’est pas un numéro : usage, aucun appel', () => {
		const r = merger(['feat/exemple']);
		expect(r.status).toBe(1);
		expect(r.sortie).toContain('usage');
		expect(lu('appels')).toBe('');
	});
});
