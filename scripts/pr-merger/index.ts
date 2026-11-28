/**
 * `pnpm pr:merger [<n>] [--essai]` : merger une PR et ranger derrière elle
 * =======================================================================
 *
 * Les gestes 7 à 9 du flux d'une PR (docs/pratiques/git-workflow.md § 3), dans
 * l'ordre, chacun arrêtant tout s'il échoue :
 *
 *   1. contrôles du DERNIER commit de la PR : attendus s'ils tournent, tous verts
 *      (« sauté » vaut vert), contrôle de synthèse présent ; jamais « vert » sur
 *      une liste vide ;
 *   2. PR qui touche supabase/migrations/ : `pnpm check:migrations --pr <n>` ;
 *   3. `pnpm deploy:prod` en cours (verrou « deploy ») : attendu ;
 *   4. `gh pr merge --merge --match-head-commit <sha>` : le commit mergé est celui
 *      dont les contrôles ont été lus ; `Base branch was modified` → une relance ;
 *   5. état relu : rien n'est rangé sans `MERGED` ;
 *   6. worktree de la branche retiré, branche locale supprimée (`-d`), dépôt
 *      principal mis à jour (`git pull --ff-only` : jamais de rebase sous les pieds
 *      d'une autre session) ; un worktree avec des fichiers modifiés ou non suivis,
 *      ou une branche avec des commits jamais poussés, restent en place.
 *
 * Limites assumées :
 *   - les fichiers IGNORÉS du worktree (.env.local, node_modules) partent avec lui ;
 *   - le verrou est lu juste avant le merge, pas tenu : un `deploy:prod` lancé dans
 *     la seconde qui suit passe (même fenêtre que le hook garde-commandes.py), et
 *     un verrou illisible (python3 absent) vaut « libre » ;
 *   - un contrôle rouge non exigé par la protection de main arrête aussi le merge.
 *
 * Sans <n> : la PR de la branche courante. `--essai` : dit ce qui serait fait, sans
 * attendre ni la CI ni le verrou, et s'arrête avant le merge.
 * PR déjà mergée : seulement le rangement. Ne joue jamais `pnpm db:migrate`.
 * Une PR mergée par ce lancement : sa durée (attente de la CI comprise) est notée
 * pour `pnpm durees` (scripts/durees/noter.sh).
 * Ne reconnaît pas une tâche planifiée : c'est à la session de ne pas la lancer
 * (CLAUDE.md § Git Workflow).
 *
 * Sorties : 0 fait · 1 refus · 2 attente dépassée (CI, verrou).
 * Tests : scripts/__tests__/pr-merger.test.ts.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	blocage,
	fichiersSensibles,
	lireWorktrees,
	migrations,
	refus,
	verdictDesControles,
	type Pr
} from './logique.ts';

// ============================================================================
// Constantes
// ============================================================================

const SCRIPTS = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHAMPS =
	'number,state,isDraft,baseRefName,headRefName,headRefOid,mergeable,mergeStateStatus,statusCheckRollup';

/** Secondes entre deux lectures de GitHub ou du verrou. */
const PAUSE = secondes(process.env.PR_MERGER_PAUSE, 20);
/** Attente la plus longue de la CI, puis du verrou de mise en prod. */
const ATTENTE_MAX = secondes(process.env.PR_MERGER_ATTENTE_MAX, 3600);
/**
 * Attente la plus longue d'un run pas encore enregistré (juste après un push), et
 * de GitHub qui dit encore `BLOCKED` quelques secondes après le dernier contrôle vert.
 */
const ATTENTE_ABSENT = secondes(process.env.PR_MERGER_ATTENTE_ABSENT, 120);
/** Remplaçable par un bouchon dans les tests. */
const GARDE_MIGRATIONS =
	process.env.PR_MERGER_GARDE_MIGRATIONS ??
	`bash ${resolve(SCRIPTS, 'garde-migrations-horodatage.sh')}`;

// ============================================================================
// Fonctions
// ============================================================================

/** Une valeur illisible ne doit pas donner NaN : `attendu >= NaN` attendrait sans fin. */
function secondes(valeur: string | undefined, defaut: number): number {
	const lu = Number(valeur ?? defaut);
	return Number.isFinite(lu) && lu >= 0 ? lu : defaut;
}

function dire(message: string): void {
	console.log(message);
}

function arreter(code: number, ...lignes: string[]): never {
	for (const l of lignes) console.error(l);
	process.exit(code);
}

function lancer(commande: string, args: string[], cwd?: string) {
	const r = spawnSync(commande, args, { cwd, encoding: 'utf8' });
	return {
		ok: r.status === 0,
		stdout: (r.stdout ?? '').trim(),
		sortie: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim()
	};
}

function gh(...args: string[]) {
	return lancer('gh', args);
}

function git(cwd: string, ...args: string[]) {
	return lancer('git', ['-C', cwd, ...args]);
}

function pause(secondes: number): Promise<void> {
	return new Promise((fin) => setTimeout(fin, secondes * 1000));
}

function lirePr(cible: string[]): Pr {
	const r = gh('pr', 'view', ...cible, '--json', CHAMPS);
	if (!r.ok) arreter(1, '⛔ PR illisible :', r.sortie, 'Rien n’est mergé.');
	return JSON.parse(r.stdout) as Pr;
}

function fichiersDeLaPr(n: string): string[] {
	const r = gh('pr', 'diff', n, '--name-only');
	if (!r.ok) arreter(1, '⛔ Fichiers de la PR illisibles :', r.sortie, 'Rien n’est mergé.');
	return r.stdout.split('\n').filter(Boolean);
}

/** Le texte de scripts/durees/noter.sh, ou `null` : une durée non notée n'arrête rien. */
function lireLeNoteur(): string | null {
	try {
		return readFileSync(resolve(SCRIPTS, 'durees/noter.sh'), 'utf8');
	} catch {
		return null;
	}
}

function deployEnCours(): boolean {
	return lancer('python3', [resolve(SCRIPTS, 'lib/lock.py'), '--tenu', 'deploy']).ok;
}

/** Attend les contrôles du dernier commit ; rend la PR telle que lue au vert. */
async function attendreLesControles(n: string, premiere: Pr, essai: boolean): Promise<Pr> {
	let pr = premiere;
	let attendu = 0;
	let attenduBloque = 0;
	let annonce = '';
	for (;;) {
		const motif = refus(pr);
		if (motif) arreter(1, `⛔ #${n} : ${motif}.`, 'Rien n’est mergé.');
		const verdict = verdictDesControles(pr.statusCheckRollup ?? []);
		const commit = pr.headRefOid.slice(0, 10);
		if (verdict.etat === 'vert') {
			// GitHub met quelques secondes à lever `BLOCKED` après le dernier contrôle
			// vert : relire avant de conclure qu'une règle de main refuse le merge.
			if (pr.mergeStateStatus === 'BLOCKED' && !essai && attenduBloque < ATTENTE_ABSENT) {
				if (attenduBloque === 0)
					dire('⏳ Contrôles verts, GitHub dit encore `BLOCKED` : relecture…');
				await pause(PAUSE);
				attenduBloque += Math.max(PAUSE, 1);
				pr = lirePr([n]);
				if (pr.state === 'MERGED') return pr;
				continue;
			}
			dire(`✅ Contrôles verts sur ${commit}.`);
			return pr;
		}
		if (verdict.etat === 'rouge')
			arreter(
				1,
				`⛔ #${n} : contrôle(s) rouge(s) sur ${commit} :`,
				...verdict.noms.map((nom) => `   - ${nom}`),
				'Rien n’est mergé.'
			);
		const limite = essai ? 0 : verdict.etat === 'absent' ? ATTENTE_ABSENT : ATTENTE_MAX;
		if (attendu >= limite) {
			if (verdict.etat === 'absent')
				arreter(
					1,
					`⛔ #${n} : aucun verdict de la CI sur ${commit} (pas de « CI Summary »), et rien ne tourne.`,
					'Rien n’est mergé. Run pas encore enregistré, ou CI non déclenchée : gh pr checks ' + n
				);
			arreter(
				2,
				`⛔ #${n} : la CI de ${commit} tourne encore après ${attendu} s :`,
				...verdict.noms.map((nom) => `   - ${nom}`),
				'Rien n’est mergé. Relancer la commande plus tard.'
			);
		}
		const quoi =
			verdict.etat === 'absent'
				? `⏳ Pas encore de CI sur ${commit}, attente de son enregistrement…`
				: `⏳ CI en cours sur ${commit} (${verdict.noms.length} contrôle(s)), attente…`;
		// Une ligne par changement, pas une par lecture : la sortie reste lisible.
		if (quoi !== annonce) dire(quoi);
		annonce = quoi;
		await pause(PAUSE);
		attendu += Math.max(PAUSE, 1);
		pr = lirePr([n]);
		if (pr.state === 'MERGED') return pr;
	}
}

async function attendreLeVerrou(essai: boolean): Promise<void> {
	let attendu = 0;
	while (deployEnCours()) {
		if (attendu >= (essai ? 0 : ATTENTE_MAX))
			arreter(
				2,
				`⛔ \`pnpm deploy:prod\` tient encore le verrou après ${attendu} s.`,
				'Rien n’est mergé. Relancer la commande après la mise en prod.'
			);
		if (attendu === 0) dire('⏳ `pnpm deploy:prod` en cours : attente de la fin de la livraison…');
		await pause(PAUSE);
		attendu += Math.max(PAUSE, 1);
	}
}

function merger(n: string, sha: string): void {
	const args = ['pr', 'merge', n, '--merge', '--match-head-commit', sha];
	let r = gh(...args);
	if (!r.ok && /Base branch was modified/i.test(r.sortie)) {
		dire('🔁 `Base branch was modified` : une relance.');
		r = gh(...args);
	}
	if (!r.ok) arreter(1, `⛔ #${n} : \`gh pr merge\` a échoué :`, r.sortie, 'Rien n’est rangé.');
}

/** Rangement d'après-merge. Rend ce qui n'a pas pu être rangé. */
function ranger(branche: string): string[] {
	const restes: string[] = [];
	const liste = git(process.cwd(), 'worktree', 'list', '--porcelain');
	if (!liste.ok) return [`worktrees illisibles : ${liste.sortie}`];
	const worktrees = lireWorktrees(liste.stdout);
	const principal = worktrees[0].chemin;
	const wt = worktrees.find((w) => w.branche === branche);
	// Le worktree d'où la commande est lancée va peut-être disparaître.
	const depuis = process.cwd();
	process.chdir(principal);

	// Dépôt principal sur main : le rattraper (le merge y arrive). `--ff-only` et
	// pas `--rebase` : le dépôt est partagé, un rebase réécrirait le commit pas
	// encore poussé d'une autre session pendant qu'elle travaille. Refusé (main
	// local en avance, fichier modifié en travers) : dit, sans rien rattraper ici.
	const fetch = git(principal, 'fetch', '-q', 'origin', 'main');
	if (!fetch.ok) restes.push(`\`git fetch origin main\` en échec : ${fetch.sortie}`);
	if (worktrees[0].branche === 'main') {
		const pull = git(principal, 'pull', '--ff-only', '-q');
		if (pull.ok) dire('✅ Dépôt principal à jour.');
		else
			restes.push(
				`dépôt principal pas mis à jour (\`git pull --ff-only\` refusé : main local en avance ou fichier en travers ; \`git pull --rebase\` à la main) :\n${pull.sortie}`
			);
	}

	if (!git(principal, 'rev-parse', '-q', '--verify', `refs/heads/${branche}`).ok) {
		if (wt)
			restes.push(`worktree ${wt.chemin} sans branche locale « ${branche} » : laissé en place`);
		return restes;
	}
	if (wt && wt.chemin === principal) {
		restes.push(`le dépôt principal est sur « ${branche} » : ni worktree ni branche retirés`);
		return restes;
	}
	// Des commits locaux jamais poussés ne sont pas dans le merge : on ne retire rien.
	if (!git(principal, 'merge-base', '--is-ancestor', branche, 'origin/main').ok) {
		restes.push(
			`la branche locale « ${branche} » a des commits absents de main : branche${wt ? ' et worktree' : ''} gardés`
		);
		return restes;
	}
	if (wt) {
		const etat = git(wt.chemin, 'status', '--porcelain');
		if (!etat.ok || etat.stdout) {
			restes.push(
				`worktree ${wt.chemin} pas propre, laissé en place avec sa branche :\n${etat.ok ? etat.stdout : etat.sortie}`
			);
			return restes;
		}
		const retrait = git(principal, 'worktree', 'remove', wt.chemin);
		if (!retrait.ok) {
			restes.push(`worktree ${wt.chemin} non retiré : ${retrait.sortie}`);
			return restes;
		}
		dire(`✅ Worktree retiré : ${wt.chemin}`);
		if (depuis === wt.chemin || depuis.startsWith(`${wt.chemin}/`))
			dire(`ℹ️ Le dossier courant du terminal n’existe plus : cd ${principal}`);
	}
	const suppression = git(principal, 'branch', '-d', branche);
	if (suppression.ok) dire(`✅ Branche locale supprimée : ${branche}`);
	else restes.push(`branche locale « ${branche} » non supprimée : ${suppression.sortie}`);
	// La branche distante est supprimée par GitHub au merge : oublier sa trace.
	git(principal, 'fetch', '-q', '--prune', 'origin');
	dire(git(principal, 'worktree', 'list').stdout);
	return restes;
}

async function main(): Promise<void> {
	const debut = Math.floor(Date.now() / 1000);
	// Lu maintenant : lancée depuis le worktree qu'elle retire, la commande ne
	// trouverait plus le script au moment de noter sa durée.
	const noteur = lireLeNoteur();
	const args = process.argv.slice(2);
	const essai = args.includes('--essai');
	const reste = args.filter((a) => a !== '--essai');
	if (reste.length > 1 || (reste[0] !== undefined && !/^\d+$/.test(reste[0])))
		arreter(1, 'usage : pnpm pr:merger [<numéro de PR>] [--essai]');

	// Pas de garde « tâche planifiée » ici : la seule variable que pose Claude Code
	// (`CLAUDE_CODE_SESSION_ATTENDED=0`) dit « personne devant le terminal », ce qui
	// est aussi le cas d'une session ordinaire en arrière-plan (refus à tort le
	// 2026-11-23). La règle de CLAUDE.md § Git Workflow fait foi.

	let pr = lirePr(reste);
	const n = String(pr.number);
	dire(`PR #${n} · ${pr.headRefName} · ${pr.headRefOid.slice(0, 10)}`);

	const dejaMergee = pr.state === 'MERGED';
	let aMigrer: string[] = [];
	if (dejaMergee) {
		dire('ℹ️ Déjà mergée : rangement seulement.');
	} else {
		pr = await attendreLesControles(n, pr, essai);
	}
	if (pr.state !== 'MERGED') {
		const bloque = blocage(pr);
		if (bloque) arreter(1, `⛔ #${n} : ${bloque}.`, 'Rien n’est mergé.');

		const fichiers = fichiersDeLaPr(n);
		aMigrer = migrations(fichiers);
		const sensibles = fichiersSensibles(fichiers);
		if (sensibles.length > 0)
			dire(
				`ℹ️ PR sensible (${sensibles.length} fichier(s), dont ${sensibles[0]}) : revue \`code-reviewer\` + \`security-auditor\` attendue avant le merge. La commande ne la vérifie pas.`
			);

		if (aMigrer.length > 0) {
			const [commande, ...debut] = GARDE_MIGRATIONS.split(' ');
			const garde = lancer(commande, [...debut, '--pr', n]);
			if (garde.sortie) dire(garde.sortie);
			if (!garde.ok) arreter(1, `⛔ #${n} : la garde des migrations refuse.`, 'Rien n’est mergé.');
			dire('✅ Migrations : horodatages libres sur origin/main.');
		}

		await attendreLeVerrou(essai);

		if (essai) {
			dire(
				`✅ Essai : #${n} serait mergée (commit ${pr.headRefOid.slice(0, 10)}). Rien n’est fait.`
			);
			return;
		}
		merger(n, pr.headRefOid);
	} else if (essai) {
		dire('✅ Essai : le rangement serait fait. Rien n’est fait.');
		return;
	}

	const etat = lirePr([n]).state;
	if (etat !== 'MERGED')
		arreter(1, `⛔ #${n} : état relu « ${etat} », pas MERGED.`, 'Rien n’est rangé.');
	dire(`✅ #${n} : MERGED.`);

	const restes = ranger(pr.headRefName);
	for (const r of restes) dire(`⚠️ ${r}`);
	// Un rangement seul (PR déjà mergée) n'a pas tout joué : pas une mesure.
	if (!dejaMergee && noteur !== null)
		spawnSync('bash', ['-s', '--', 'pr-merger', String(debut)], { input: noteur });

	const suite = ['« Reprendre ici » du journal du chantier'];
	if (aMigrer.length > 0)
		suite.push(
			`\`pnpm db:migrate\` si les 4 conditions sont réunies (${aMigrer.length} migration(s))`
		);
	else if (dejaMergee) suite.push('`pnpm db:migrate` si la PR portait une migration');
	if (restes.length > 0) suite.push('le rangement signalé ci-dessus');
	dire(`👉 Reste à faire : ${suite.join(' ; ')}.`);
}

await main();
