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
 * - ce qui change sous src/ ou static/ se construit, `.md` compris (articles
 *   du Shtam) ; un `.md` de la racine (CLAUDE.md) est de la doc ;
 * - dans le doute (variable vide, dépôt injoignable, réponse en retard), on
 *   construit.
 *
 * Chaque test vérifie aussi la RAISON affichée : un plantage du script sort
 * en ≠ 0, donc « construit » pour Vercel, et passerait pour un succès.
 *
 * On joue le vrai script dans des dépôts jetables : un dépôt nu tient lieu de
 * GitHub, et chaque « conteneur de build » est un clone superficiel
 * (--depth=10, comme Vercel), pris au moment où Vercel le prendrait.
 *
 * ⚠️ `git` ne doit JAMAIS tourner hors du dossier jetable : le 2026-10-10, un
 * banc d'essai en bash a fait `git -C ""` après un `mktemp` raté — git est
 * alors resté dans le dossier courant, le dépôt principal, et l'a basculé sur
 * ces commits de test. D'où `git()` qui refuse tout dossier hors de `racine`,
 * et GIT_CEILING_DIRECTORIES qui empêche git de remonter au-dessus.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, realpathSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

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
		GIT_CEILING_DIRECTORIES: dirname(racine),
		GIT_AUTHOR_NAME: 'test',
		GIT_AUTHOR_EMAIL: 'test@example.com',
		GIT_COMMITTER_NAME: 'test',
		GIT_COMMITTER_EMAIL: 'test@example.com'
	};
}

/** Garde-fou : aucun processus de ce test ne tourne hors du dossier jetable. */
function dansLeBac(cwd: string): string {
	const reel = realpathSync(cwd);
	if (!reel.startsWith(racine + sep)) throw new Error(`hors du dossier jetable : « ${cwd} »`);
	return reel;
}

function git(cwd: string, ...args: string[]): string {
	const r = spawnSync('git', args, { cwd: dansLeBac(cwd), env: envGit(), encoding: 'utf8' });
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

/** Variante : un clone de la BRANCHE, qui contient déjà les commits plus récents. */
function conteneurDeBranche(sha: string): string {
	const dir = mkdtempSync(join(racine, 'build-'));
	git(dir, 'init', '-q');
	git(dir, 'fetch', '-q', '--depth=10', `file://${github}`, 'main');
	git(dir, 'checkout', '-q', '--detach', sha);
	return dir;
}

interface Deploiement {
	/** Commit construit (VERCEL_GIT_COMMIT_SHA). */
	sha: string;
	/** Commit du dernier déploiement réussi (VERCEL_GIT_PREVIOUS_SHA). */
	precedent?: string;
	/** VERCEL_ENV. */
	cible?: string;
	/** Dépôt interrogé pour la pointe de main (par défaut : le « GitHub »). */
	depot?: string;
	/** Conteneur déjà cloné (sinon : cloné maintenant). */
	dans?: string;
}

/** Lance le vrai script : statut 0 = build sauté, 1 = build. */
function decider(d: Deploiement) {
	const r = spawnSync('bash', [SCRIPT], {
		cwd: dansLeBac(d.dans ?? conteneur(d.sha)),
		env: {
			...envGit(),
			VERCEL_ENV: d.cible ?? 'production',
			VERCEL_GIT_COMMIT_SHA: d.sha,
			VERCEL_GIT_PREVIOUS_SHA: d.precedent ?? '',
			VERCEL_GIT_COMMIT_REF: 'main',
			VERCEL_GIT_REPO_OWNER: '',
			VERCEL_GIT_REPO_SLUG: '',
			IGNORE_BUILD_REMOTE_URL: d.depot ?? `file://${github}`
		},
		encoding: 'utf8'
	});
	return { status: r.status, sortie: `${r.stdout}${r.stderr}` };
}

/** Sortie attendue ET raison attendue. */
function attendre(r: ReturnType<typeof decider>, status: 0 | 1, raison: string) {
	expect(r.status, r.sortie).toBe(status);
	expect(r.sortie).toContain(raison);
}

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'vercel-ignore-')));
	github = join(racine, 'github.git');
	travail = join(racine, 'travail');
	mkdirSync(github);
	mkdirSync(travail);
	git(github, 'init', '-q', '--bare');
	git(github, 'symbolic-ref', 'HEAD', 'refs/heads/main');
	// Vercel récupère un commit précis, comme actions/checkout : GitHub l'accepte.
	git(github, 'config', 'uploadpack.allowReachableSHA1InWant', 'true');
	git(travail, 'init', '-q');
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
		attendre(decider({ sha, cible: 'preview' }), 0, 'hors production');
	});

	it('la pointe de main, avec du code depuis le dernier déploiement : construit', () => {
		const deploye = pousser('src/a.ts');
		const sha = pousser('src/b.ts');
		attendre(decider({ sha, precedent: deploye }), 1, 'src/ ou static/ a changé');
	});

	it('du code hors de src/ (package.json, vercel.json) : construit', () => {
		const deploye = pousser('src/a.ts');
		const sha = pousser('package.json');
		attendre(decider({ sha, precedent: deploye }), 1, 'du code a changé');
	});

	it('rien que de la doc depuis le dernier déploiement : sauté', () => {
		const deploye = pousser('src/a.ts');
		const sha = pousser('docs/wip/journal.md', 'docs/wip/arbre.json');
		attendre(decider({ sha, precedent: deploye }), 0, 'rien que de la doc');
	});

	it('un .md à la racine (CLAUDE.md, CONTEXT.md) est de la doc : sauté', () => {
		const deploye = pousser('src/a.ts');
		const sha = pousser('CLAUDE.md', 'CONTEXT.md');
		attendre(decider({ sha, precedent: deploye }), 0, 'rien que de la doc');
	});

	it('un article du Shtam (.md importé au build) : construit', () => {
		const deploye = pousser('src/a.ts');
		const sha = pousser('src/lib/server/shtam/articles/32-article.md', 'docs/wip/relecture.md');
		attendre(decider({ sha, precedent: deploye }), 1, 'src/ ou static/ a changé');
	});

	it('un commit dépassé par un commit plus récent de main : sauté', () => {
		const deploye = pousser('src/a.ts');
		const depasse = pousser('src/b.ts');
		const dans = conteneur(depasse);
		pousser('src/c.ts'); // main avance pendant que `depasse` attend son tour
		attendre(decider({ sha: depasse, precedent: deploye, dans }), 0, 'main a avancé');
	});

	it('même quand le clone contient déjà la pointe (clone de la branche) : sauté', () => {
		const deploye = pousser('src/a.ts');
		const depasse = pousser('src/b.ts');
		pousser('src/c.ts');
		const dans = conteneurDeBranche(depasse);
		attendre(decider({ sha: depasse, precedent: deploye, dans }), 0, 'main a avancé');
	});

	it("le code d'un commit sauté n'est pas perdu : la pointe de doc qui le suit construit", () => {
		const deploye = pousser('src/a.ts');
		pousser('src/b.ts'); // sauté : dépassé par la pointe ci-dessous
		const pointe = pousser('docs/wip/journal.md');
		attendre(decider({ sha: pointe, precedent: deploye }), 1, 'src/ ou static/ a changé');
	});

	it('dernier déploiement à plus de 10 commits : le clone est approfondi, la doc reste sautée', () => {
		const deploye = pousser('src/a.ts');
		for (let i = 0; i < 12; i++) pousser(`docs/wip/note-${i}.md`);
		const sha = pousser('docs/wip/fin.md');
		attendre(decider({ sha, precedent: deploye }), 0, 'rien que de la doc');
	});
});

describe('vercel-ignore-build.sh — redéploiements : toujours construits', () => {
	it('maintenance:on|off redéploie le dernier déploiement alors que main a avancé : construit', () => {
		const deploye = pousser('src/a.ts');
		const dans = conteneur(deploye);
		pousser('src/b.ts'); // main a du code plus récent, pas encore construit
		attendre(decider({ sha: deploye, precedent: deploye, dans }), 1, 'redéploiement');
	});

	it("même quand ce déploiement n'est qu'un commit de doc (il embarquait du code sauté)", () => {
		pousser('src/a.ts');
		const pointeDoc = pousser('docs/wip/journal.md'); // construit pour le code sauté
		attendre(decider({ sha: pointeDoc, precedent: pointeDoc }), 1, 'redéploiement');
	});

	it('même si VERCEL_GIT_PREVIOUS_SHA arrive abrégé', () => {
		pousser('src/a.ts');
		const deploye = pousser('docs/wip/journal.md');
		attendre(decider({ sha: deploye, precedent: deploye.slice(0, 12) }), 1, 'redéploiement');
	});

	it("redéployer un ancien commit (retour arrière) : construit, même si ce n'est qu'un commit de doc", () => {
		pousser('src/a.ts');
		const ancien = pousser('docs/wip/journal.md');
		const dans = conteneur(ancien);
		const recent = pousser('src/b.ts');
		attendre(decider({ sha: ancien, precedent: recent, dans }), 1, "absent de l'historique");
	});
});

describe('vercel-ignore-build.sh — dans le doute, on construit', () => {
	it('VERCEL_GIT_PREVIOUS_SHA vide : construit, même pour de la doc', () => {
		pousser('src/a.ts');
		const code = pousser('src/b.ts');
		const dansCode = conteneur(code);
		const doc = pousser('docs/wip/journal.md');
		attendre(decider({ sha: code, dans: dansCode }), 1, 'VERCEL_GIT_PREVIOUS_SHA vide');
		attendre(decider({ sha: doc }), 1, 'VERCEL_GIT_PREVIOUS_SHA vide');
	});

	it('dépôt injoignable : pas de règle de la pointe, le code se construit', () => {
		const deploye = pousser('src/a.ts');
		const sha = pousser('src/b.ts');
		const dans = conteneur(sha);
		pousser('src/c.ts');
		const depot = `file://${join(racine, 'introuvable.git')}`;
		attendre(decider({ sha, precedent: deploye, dans, depot }), 1, 'src/ ou static/ a changé');
	});

	it('pointe en retard (réponse plus ancienne que le commit) : construit', () => {
		const deploye = pousser('src/a.ts');
		const enRetard = join(racine, 'en-retard.git');
		mkdirSync(enRetard);
		git(enRetard, 'init', '-q', '--bare');
		git(travail, 'push', '-q', `file://${enRetard}`, 'main'); // figé sur `deploye`
		const sha = pousser('src/b.ts');
		const depot = `file://${enRetard}`;
		attendre(decider({ sha, precedent: deploye, depot }), 1, 'src/ ou static/ a changé');
	});
});
