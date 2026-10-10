/**
 * L'étape « Ignored Build Step » de Vercel
 * ========================================
 *
 * `scripts/vercel-ignore-build.sh` décide, pour chaque déploiement, si Vercel
 * construit (sortie 1) ou saute le build (sortie 0). Un build sauté ne stocke
 * rien ; un build de trop coûte ~6 min et ~110 Mo de stockage, plafonné à
 * 10 Go sur le plan gratuit (alerte 100 % le 2026-10-10).
 *
 * Ce qui est gardé ici :
 * - seule la POINTE de `main` se construit : un commit dépassé est embarqué
 *   par le build du commit plus récent ;
 * - le code d'un commit sauté n'est JAMAIS perdu : la pointe se compare au
 *   dernier déploiement RÉUSSI, pas à son seul parent ;
 * - un REDÉPLOIEMENT (`pnpm maintenance:on|off`, bouton « Redeploy ») se
 *   construit toujours, même quand `main` a avancé ;
 * - un `.md` à la racine (CLAUDE.md, CONTEXT.md) est de la doc ;
 * - dans le doute (variable vide, dépôt injoignable), on construit.
 *
 * On joue le vrai script dans des dépôts jetables : un dépôt nu tient lieu de
 * GitHub, et chaque « conteneur de build » est un clone superficiel du commit
 * (--depth=10, comme Vercel), pris au moment où Vercel le prendrait.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '../vercel-ignore-build.sh');

let racine: string;
let github: string;
let travail: string;
let numero = 0;

/** git isolé de la config de la machine (signature, hooks) : la CI n'en a pas. */
function envGit(): NodeJS.ProcessEnv {
	return {
		...process.env,
		HOME: racine,
		XDG_CONFIG_HOME: racine,
		GIT_CONFIG_NOSYSTEM: '1',
		GIT_AUTHOR_NAME: 'test',
		GIT_AUTHOR_EMAIL: 'test@example.com',
		GIT_COMMITTER_NAME: 'test',
		GIT_COMMITTER_EMAIL: 'test@example.com'
	};
}

function git(cwd: string, ...args: string[]): string {
	const r = spawnSync('git', args, { cwd, env: envGit(), encoding: 'utf8' });
	if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${r.status}\n${r.stderr}`);
	return r.stdout.trim();
}

/** Un commit qui modifie ces fichiers, poussé sur le « GitHub » ; rend son SHA. */
function pousser(...fichiers: string[]): string {
	for (const f of fichiers) {
		mkdirSync(dirname(join(travail, f)), { recursive: true });
		writeFileSync(join(travail, f), `${f} ${++numero}\n`);
	}
	git(travail, 'add', '-A');
	git(travail, 'commit', '-q', '-m', fichiers.join(' '));
	git(travail, 'push', '-q', 'origin', 'main');
	return git(travail, 'rev-parse', 'HEAD');
}

/** Le conteneur de build : un clone superficiel du seul commit construit. */
function conteneur(sha: string): string {
	const dir = mkdtempSync(join(racine, 'build-'));
	git(dir, 'init', '-q');
	git(dir, 'fetch', '-q', '--depth=10', `file://${github}`, sha);
	git(dir, 'checkout', '-q', '--detach', 'FETCH_HEAD');
	return dir;
}

interface Deploiement {
	/** Commit construit (VERCEL_GIT_COMMIT_SHA). */
	sha: string;
	/** Commit du dernier déploiement réussi (VERCEL_GIT_PREVIOUS_SHA). */
	precedent?: string;
	/** VERCEL_ENV. */
	cible?: string;
	/** Le « GitHub » ne répond pas. */
	injoignable?: boolean;
	/** Conteneur déjà cloné (sinon : cloné maintenant). */
	dans?: string;
}

/** Lance le vrai script : statut 0 = build sauté, 1 = build. */
function decider(d: Deploiement) {
	const r = spawnSync('bash', [SCRIPT], {
		cwd: d.dans ?? conteneur(d.sha),
		env: {
			...envGit(),
			VERCEL_ENV: d.cible ?? 'production',
			VERCEL_GIT_COMMIT_SHA: d.sha,
			VERCEL_GIT_PREVIOUS_SHA: d.precedent ?? '',
			VERCEL_GIT_COMMIT_REF: 'main',
			VERCEL_GIT_REPO_OWNER: '',
			VERCEL_GIT_REPO_SLUG: '',
			IGNORE_BUILD_REMOTE_URL: d.injoignable
				? `file://${join(racine, 'introuvable.git')}`
				: `file://${github}`
		},
		encoding: 'utf8'
	});
	return { status: r.status, sortie: `${r.stdout}${r.stderr}` };
}

beforeEach(() => {
	racine = mkdtempSync(join(tmpdir(), 'vercel-ignore-'));
	github = join(racine, 'github.git');
	travail = join(racine, 'travail');
	git(racine, 'init', '-q', '--bare', github);
	git(github, 'symbolic-ref', 'HEAD', 'refs/heads/main');
	// Vercel récupère un commit précis, comme actions/checkout : GitHub l'accepte.
	git(github, 'config', 'uploadpack.allowReachableSHA1InWant', 'true');
	git(racine, 'init', '-q', travail);
	git(travail, 'symbolic-ref', 'HEAD', 'refs/heads/main');
	git(travail, 'remote', 'add', 'origin', `file://${github}`);
	pousser('src/app.ts');
});

afterEach(() => {
	rmSync(racine, { recursive: true, force: true });
});

describe('vercel-ignore-build.sh — ce qui se construit', () => {
	it('hors production, tout est sauté', () => {
		const sha = pousser('src/a.ts');
		const r = decider({ sha, cible: 'preview' });
		expect(r.status, r.sortie).toBe(0);
	});

	it('la pointe de main, avec du code depuis le dernier déploiement : construit', () => {
		const deploye = pousser('src/a.ts');
		const sha = pousser('src/b.ts');
		const r = decider({ sha, precedent: deploye });
		expect(r.status, r.sortie).toBe(1);
	});

	it('rien que de la doc depuis le dernier déploiement : sauté', () => {
		const deploye = pousser('src/a.ts');
		const sha = pousser('docs/wip/journal.md', 'docs/wip/arbre.json');
		const r = decider({ sha, precedent: deploye });
		expect(r.status, r.sortie).toBe(0);
	});

	it('un .md à la racine (CLAUDE.md, CONTEXT.md) est de la doc : sauté', () => {
		const deploye = pousser('src/a.ts');
		const sha = pousser('CLAUDE.md', 'CONTEXT.md');
		const r = decider({ sha, precedent: deploye });
		expect(r.status, r.sortie).toBe(0);
	});

	it('un commit dépassé par un commit plus récent de main : sauté', () => {
		const deploye = pousser('src/a.ts');
		const depasse = pousser('src/b.ts');
		const dans = conteneur(depasse);
		pousser('src/c.ts'); // main avance pendant que `depasse` attend son tour
		const r = decider({ sha: depasse, precedent: deploye, dans });
		expect(r.status, r.sortie).toBe(0);
	});

	it("le code d'un commit sauté n'est pas perdu : la pointe de doc qui le suit construit", () => {
		const deploye = pousser('src/a.ts');
		pousser('src/b.ts'); // sauté : dépassé par la pointe ci-dessous
		const pointe = pousser('docs/wip/journal.md');
		const r = decider({ sha: pointe, precedent: deploye });
		expect(r.status, r.sortie).toBe(1);
	});

	it('dernier déploiement à plus de 10 commits : le clone est approfondi, la doc reste sautée', () => {
		const deploye = pousser('src/a.ts');
		for (let i = 0; i < 12; i++) pousser(`docs/wip/note-${i}.md`);
		const sha = pousser('docs/wip/fin.md');
		const r = decider({ sha, precedent: deploye });
		expect(r.status, r.sortie).toBe(0);
	});
});

describe('vercel-ignore-build.sh — redéploiements : toujours construits', () => {
	it('maintenance:on|off redéploie le dernier déploiement alors que main a avancé : construit', () => {
		const deploye = pousser('src/a.ts');
		const dans = conteneur(deploye);
		pousser('src/b.ts'); // main a du code plus récent, pas encore construit
		const r = decider({ sha: deploye, precedent: deploye, dans });
		expect(r.status, r.sortie).toBe(1);
	});

	it("même quand ce déploiement n'est qu'un commit de doc (il embarquait du code sauté)", () => {
		pousser('src/a.ts');
		const pointeDoc = pousser('docs/wip/journal.md'); // construit pour le code sauté
		const r = decider({ sha: pointeDoc, precedent: pointeDoc });
		expect(r.status, r.sortie).toBe(1);
	});

	it("redéployer un ancien commit (retour arrière) : construit, même si ce n'est qu'un commit de doc", () => {
		pousser('src/a.ts');
		const ancien = pousser('docs/wip/journal.md');
		const dans = conteneur(ancien);
		const recent = pousser('src/b.ts');
		const r = decider({ sha: ancien, precedent: recent, dans });
		expect(r.status, r.sortie).toBe(1);
	});
});

describe('vercel-ignore-build.sh — dans le doute, on construit', () => {
	it('VERCEL_GIT_PREVIOUS_SHA vide : règle d’avant, sur le seul dernier commit', () => {
		pousser('src/a.ts');
		const code = pousser('src/b.ts');
		const dansCode = conteneur(code);
		const doc = pousser('docs/wip/journal.md');
		// pas de dernier déploiement connu : ni règle de la pointe, ni comparaison longue
		const r1 = decider({ sha: code, dans: dansCode });
		expect(r1.status, r1.sortie).toBe(1);
		const r2 = decider({ sha: doc });
		expect(r2.status, r2.sortie).toBe(0);
	});

	it('dépôt injoignable : pas de règle de la pointe, le code se construit', () => {
		const deploye = pousser('src/a.ts');
		const sha = pousser('src/b.ts');
		const dans = conteneur(sha);
		pousser('src/c.ts');
		const r = decider({ sha, precedent: deploye, dans, injoignable: true });
		expect(r.status, r.sortie).toBe(1);
	});
});
