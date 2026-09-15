/**
 * `pnpm release` — rendre son niveau à une fonctionnalité
 * =======================================================
 *
 * En dessous de 1.0.0, standard-version force `preMajor` et rétrograde chaque
 * niveau d'un cran : une fonctionnalité ne vaut plus qu'un patch. Ce n'est pas
 * configurable — la ligne est écrite en dur, APRÈS la lecture de
 * `.versionrc.json` :
 *
 *   // node_modules/standard-version/lib/lifecycles/bump.js:117
 *   if (semver.lt(currentVersion, '1.0.0')) presetOptions.preMajor = true
 *
 * Résultat vécu : la v0.14.2 est sortie avec dix `feat:` dedans, annoncée
 * comme un simple correctif. Un numéro de version faux ne fait rien rougir —
 * on ne s'en aperçoit qu'en relisant le CHANGELOG.
 *
 * Ce script décide donc le niveau lui-même et le passe en `--release-as`.
 * Tout le reste (CHANGELOG, commit de release, tag) reste à standard-version,
 * qui lit toujours `.versionrc.json`.
 *
 *   feat / feature   → MINEUR  (au lieu de patch)
 *   rupture `!` ou BREAKING CHANGE → MINEUR  (inchangé : on reste en 0.x)
 *   tout le reste    → patch   (inchangé)
 *
 * ⚠️ Le 1.0.0 n'est pas la conséquence d'un `!` dans un message de commit,
 * c'est une décision de produit : il se pose à la main, `pnpm release:major`.
 * C'est pourquoi une rupture s'arrête ici au mineur.
 *
 * Un argument explicite (`--release-as`, `--prerelease`, `--first-release`)
 * l'emporte : `pnpm release:minor` et consorts continuent de fonctionner tels
 * quels.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export type Bump = 'minor' | 'patch';

/** `type(portée)!:` — le `!` annonce une rupture dès l'en-tête. */
const HEADER = /^([a-z]+)(?:\([^)]*\))?(!)?:/;

/** Les deux orthographes admises par la spec, en pied de message. */
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:/m;

/** Options qui désignent déjà le niveau : on ne se met pas en travers. */
const EXPLICIT = ['-r', '--release-as', '-p', '--prerelease', '--first-release'];

/**
 * Le niveau de version qu'appellent ces messages de commit bruts (en-tête +
 * corps). Le type se lit en TÊTE : un correctif qui raconte dans son corps la
 * fonctionnalité qu'il répare reste un correctif.
 */
export function decideBump(commits: string[]): Bump {
	for (const commit of commits) {
		const header = commit.split('\n', 1)[0]?.trim() ?? '';
		const match = HEADER.exec(header);

		if (match?.[2]) return 'minor';
		if (BREAKING_FOOTER.test(commit)) return 'minor';
		if (match?.[1] === 'feat' || match?.[1] === 'feature') return 'minor';
	}

	return 'patch';
}

/** Le dernier tag de version atteignable, ou `null` à la toute première release. */
function lastVersionTag(): string | null {
	const res = spawnSync('git', ['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*'], {
		encoding: 'utf8'
	});
	return res.status === 0 ? res.stdout.trim() : null;
}

/** Les messages de commit depuis ce tag — le même intervalle que le CHANGELOG. */
export function readCommitsSinceLastTag(tag: string | null): string[] {
	const res = spawnSync('git', ['log', '--format=%B%x00', tag ? `${tag}..HEAD` : 'HEAD'], {
		encoding: 'utf8'
	});
	if (res.status !== 0) throw new Error(`git log a échoué : ${res.stderr?.trim()}`);

	return res.stdout
		.split('\0')
		.map((message) => message.trim())
		.filter(Boolean);
}

function main(): void {
	const passthrough = process.argv.slice(2);
	const forced = passthrough.some(
		(arg) => EXPLICIT.includes(arg) || EXPLICIT.some((option) => arg.startsWith(`${option}=`))
	);

	let args = passthrough;
	if (!forced) {
		const tag = lastVersionTag();
		const commits = readCommitsSinceLastTag(tag);
		const bump = decideBump(commits);

		console.log(
			`ℹ️  ${commits.length} commit(s) depuis ${tag ?? 'le début'} → version ${bump === 'minor' ? 'MINEURE' : 'de correctif'}`
		);
		args = ['--release-as', bump, ...passthrough];
	}

	const cli = fileURLToPath(
		new URL('../node_modules/standard-version/bin/cli.js', import.meta.url)
	);
	const res = spawnSync(process.execPath, [cli, ...args], { stdio: 'inherit' });
	process.exit(res.status ?? 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main();
}
