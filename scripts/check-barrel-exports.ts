/**
 * Garde : un export de baril que plus personne n'importe
 * ======================================================
 *
 * Un baril de composants (`index.ts` qui ré-exporte `export { default as X }`)
 * rend son symbole INVISIBLE à tous les outils du dépôt. oxlint, eslint et
 * svelte-check ne voient qu'un export — parfaitement légitime — et jamais le
 * fait que personne ne l'importe. Le composant peut donc survivre des mois à la
 * disparition de son dernier consommateur.
 *
 * Ce n'est pas une hypothèse. Le 2026-09-14, retirer les onglets de l'écran
 * « Mon cours » a laissé `ChecklistEditor.svelte` (321 lignes) et
 * `ChapterEditor.svelte` (373 lignes) sans aucun appelant, et la CI est restée
 * verte. Ils n'ont été trouvés qu'à la lecture, par hasard.
 *
 * Le danger n'est pas le poids mort : c'est qu'on rebranche de bonne foi un
 * composant qui n'a pas suivi les six derniers changements de schéma.
 *
 * ── Ce que la garde sait, et ce qu'elle ne sait pas ────────────────────────
 *
 * Elle cherche le NOM du symbole ailleurs que dans le baril et dans le fichier
 * qui le définit. Une occurrence, même en commentaire, suffit à le déclarer
 * vivant : on préfère rater un orphelin qu'accuser à tort un export vivant et
 * faire rougir la CI pour rien.
 *
 * `export * from './x'` n'est pas analysable sans résoudre le module — ces
 * lignes sont signalées, pas analysées.
 *
 * ── Baseline ──────────────────────────────────────────────────────────────
 *
 * Comme `check-css-tokens.sh`, une baseline porte la dette antérieure pour que
 * la garde puisse atterrir sans rougir. Elle ne peut que RÉTRÉCIR : un orphelin
 * de plus échoue, et un orphelin de moins échoue aussi, en demandant de
 * resserrer la baseline. Sans ce second sens, la dette se figerait.
 *
 * Usage :
 *   npx tsx scripts/check-barrel-exports.ts            # vérifie (CI)
 *   npx tsx scripts/check-barrel-exports.ts --update   # réécrit la baseline
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join, relative } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const BASELINE = join(ROOT, 'scripts', 'barrel-exports-baseline.txt');

/** Où l'on cherche des consommateurs. */
const CORPUS_DIRS = ['src', 'tests', 'e2e', 'scripts'];

/** Un symbole ré-exporté par un baril. */
type BarrelExport = {
	/** Le baril, en chemin relatif à la racine. */
	barrel: string;
	/** Le nom sous lequel il est exporté — celui qu'un consommateur écrirait. */
	name: string;
	/** Le fichier d'où il vient, si on a pu le résoudre. */
	source: string | null;
};

/**
 * Les barils de COMPOSANTS, et eux seuls.
 *
 * ⚠️ Périmètre délibéré. Mesuré le 2026-09-14 : 532 exports de baril sans
 * consommateur dans tout `src/`, dont 502 dans des modules-bibliothèques —
 * `mathAST`, `constructions`, `geometry-core`, `shared/python`. Là, le baril
 * EST l'interface publique du module : un export sans appelant interne y est
 * normal, pas un oubli. Les inclure noierait les 30 vrais orphelins sous 502
 * faux positifs, et la garde ne servirait plus à rien.
 *
 * Un composant, lui, n'a pas d'API publique : il existe pour être affiché
 * quelque part. Sans consommateur, il est mort.
 */
function listBarrels(): string[] {
	const sortie = execFileSync('git', ['ls-files', 'src/lib/components/**/index.ts'], {
		cwd: ROOT,
		encoding: 'utf8'
	});
	return sortie.split('\n').filter(Boolean);
}

/**
 * Les symboles qu'un baril ré-exporte.
 *
 * ⚠️ Seules les formes `export … from '…'` comptent : un `export const` défini
 * SUR PLACE n'est pas un ré-export, et le lint le voit déjà.
 */
function parseBarrel(barrel: string): { exports: BarrelExport[]; wildcards: number } {
	const contenu = readFileSync(join(ROOT, barrel), 'utf8');
	const exports: BarrelExport[] = [];
	let wildcards = 0;

	// `export * from './x'` : pas analysable sans résoudre le module.
	wildcards += (contenu.match(/^\s*export\s+\*\s+from\s+/gm) ?? []).length;

	// `export [type] { … } from './x';` — la liste peut tenir sur plusieurs lignes.
	const re = /export\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
	let m: RegExpExecArray | null;

	while ((m = re.exec(contenu)) !== null) {
		const [, liste, chemin] = m;
		const source = resolveSource(barrel, chemin);

		for (const brut of liste.split(',')) {
			const clause = brut.trim().replace(/^type\s+/, '');
			if (!clause) continue;

			// `default as Nom` et `Origine as Nom` : c'est le nom d'ARRIVÉE que
			// les consommateurs écrivent.
			const alias = clause.match(/\bas\s+([A-Za-z_$][\w$]*)\s*$/);
			const name = alias ? alias[1] : clause;
			if (!/^[A-Za-z_$][\w$]*$/.test(name)) continue;

			exports.push({ barrel, name, source });
		}
	}

	return { exports, wildcards };
}

/** Le fichier visé par un `from './x'`, avec son extension si on la devine. */
function resolveSource(barrel: string, chemin: string): string | null {
	if (!chemin.startsWith('.')) return null;
	const base = join(dirname(barrel), chemin);

	for (const suffixe of ['', '.svelte', '.ts', '.svelte.ts', '/index.ts']) {
		const candidat = base + suffixe;
		if (existsSync(join(ROOT, candidat))) return candidat;
	}
	return null;
}

/**
 * Index inversé : identifiant → les fichiers où il apparaît.
 *
 * ⚠️ UN SEUL passage sur le corpus. La version naïve lançait un `git grep` par
 * symbole : 512 symboles × ~1900 fichiers = 4 min 39 s, hors de question en CI.
 * Ici on lit chaque fichier une fois (~2 s).
 *
 * On ne garde que les TROIS premiers fichiers par identifiant : il suffit d'en
 * trouver un qui ne soit ni le baril ni la source, et deux exclusions au plus
 * sont possibles. Garder la liste entière ferait exploser la mémoire sur une
 * machine 8 Go.
 */
function indexerLeCorpus(): Map<string, string[]> {
	const sortie = execFileSync('git', ['ls-files', '--', ...CORPUS_DIRS], {
		cwd: ROOT,
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024
	});

	const index = new Map<string, string[]>();
	const identifiant = /[A-Za-z_$][\w$]*/g;

	for (const fichier of sortie.split('\n').filter(Boolean)) {
		if (!/\.(ts|js|mjs|svelte|svelte\.ts)$/.test(fichier)) continue;

		let contenu: string;
		try {
			contenu = readFileSync(join(ROOT, fichier), 'utf8');
		} catch {
			continue; // binaire, lien cassé : rien à y chercher
		}

		// Un même identifiant revient souvent dans un fichier : on ne l'ajoute
		// qu'une fois par fichier.
		const vusIci = new Set<string>();
		for (const m of contenu.matchAll(identifiant)) {
			const mot = m[0];
			if (vusIci.has(mot)) continue;
			vusIci.add(mot);

			const liste = index.get(mot);
			if (!liste) index.set(mot, [fichier]);
			else if (liste.length < 3) liste.push(fichier);
		}
	}

	return index;
}

/** Le symbole apparaît-il ailleurs que dans son baril et son fichier d'origine ? */
function aUnConsommateur(exp: BarrelExport, index: Map<string, string[]>): boolean {
	const fichiers = index.get(exp.name);
	if (!fichiers) return false;

	const exclus = new Set([exp.barrel, exp.source].filter(Boolean) as string[]);
	return fichiers.some((f) => !exclus.has(f));
}

function scan(): string[] {
	const orphelins: string[] = [];
	let wildcardsTotal = 0;
	const index = indexerLeCorpus();

	for (const barrel of listBarrels()) {
		const { exports, wildcards } = parseBarrel(barrel);
		wildcardsTotal += wildcards;

		for (const exp of exports) {
			if (!aUnConsommateur(exp, index)) orphelins.push(`${exp.barrel} ${exp.name}`);
		}
	}

	if (wildcardsTotal > 0) {
		console.log(
			`::notice::${wildcardsTotal} 'export * from' non analysé(s) — cette garde ne les couvre pas.`
		);
	}

	return orphelins.sort();
}

const courant = scan();

if (process.argv.includes('--update')) {
	writeFileSync(BASELINE, courant.join('\n') + (courant.length ? '\n' : ''));
	console.log(`Baseline mise à jour : ${courant.length} export(s) de baril sans consommateur.`);
	process.exit(0);
}

if (!existsSync(BASELINE)) {
	console.log(
		`::error::Baseline absente (${relative(ROOT, BASELINE)}). Lancer : npx tsx scripts/check-barrel-exports.ts --update`
	);
	process.exit(1);
}

const attendu = new Set(
	readFileSync(BASELINE, 'utf8')
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean)
);

let status = 0;

// Un orphelin de plus : une régression.
for (const ligne of courant) {
	if (attendu.has(ligne)) continue;
	status = 1;
	const [barrel, name] = ligne.split(' ');
	console.log(
		`::error file=${barrel}::'${name}' est ré-exporté mais importé nulle part. Le supprimer, ou l'ajouter à la baseline s'il est voulu public.`
	);
}

// Un orphelin de moins : un progrès, qu'il faut graver.
const vus = new Set(courant);
for (const ligne of attendu) {
	if (vus.has(ligne)) continue;
	status = 1;
	const [barrel, name] = ligne.split(' ');
	console.log(
		`::error file=${barrel}::'${name}' a retrouvé un consommateur (ou a disparu) : lancer 'npx tsx scripts/check-barrel-exports.ts --update' et committer la baseline.`
	);
}

if (status === 0) {
	console.log(
		`::notice::Aucun export de baril orphelin de plus — dette résiduelle : ${courant.length}.`
	);
}

process.exit(status);
