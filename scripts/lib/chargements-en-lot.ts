/**
 * Fichiers chargés en lot (`import.meta.glob` de Vite)
 * ====================================================
 *
 * esbuild ne suit pas `import.meta.glob` : les fichiers qu'il charge n'entrent pas dans la
 * fermeture des imports. Ce module lit les motifs d'un fichier et dit si un fichier est chargé.
 * Utilisé par `scripts/ci-integration-touches.ts` (tests touchés) et par la garde
 * `scripts/check-integration-paths.ts` (le filtre `paths` doit couvrir ces fichiers).
 * Seuls des `.md` / `.json` sont admis : un fichier de code chargé en lot a ses propres
 * imports, que la fermeture ne suivrait pas. Tout motif illisible lève une erreur.
 */

import { matchesGlob, posix } from 'node:path';

// Types

/** Un fichier qui charge en lot (`import.meta.glob`) ; motifs relatifs à la racine, `!` = exclu. */
export type Chargement = { chargeur: string; motifs: string[] };

// Fonctions

/** Les `import.meta.glob` d'un fichier ; erreur si un motif n'est pas une chaîne littérale lisible. */
export function chargementsDe(source: string, chargeur: string): Chargement[] {
	const appels = source.split('import.meta.glob').length - 1;
	if (appels === 0) return [];
	const re = /import\.meta\.glob\s*(?:<[^>()]*>)?\s*\(\s*(\[[^\]]*\]|'[^']*'|"[^"]*")\s*[,)]/g;
	const motifs: string[] = [];
	let lus = 0;
	for (const [, argument] of source.matchAll(re)) {
		lus++;
		const corps = argument.startsWith('[') ? argument.slice(1, -1) : argument;
		const morceaux = corps
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		for (const morceau of morceaux) {
			const m = /^(['"])([^'"$`]*)\1$/.exec(morceau);
			if (!m) throw new Error(`${chargeur} : motif de import.meta.glob illisible (${morceau})`);
			// Un fichier de code chargé en lot a ses propres imports, que la fermeture ne suit pas.
			if (!/\.(md|json)$/.test(m[2]))
				throw new Error(`${chargeur} : import.meta.glob d'autre chose que .md ou .json (${m[2]})`);
			motifs.push(versRacine(m[2], chargeur));
		}
	}
	if (lus !== appels) throw new Error(`${chargeur} : import.meta.glob illisible`);
	return [{ chargeur, motifs }];
}

/** Motif de Vite (`/` = racine du projet, `./` et `../` = dossier du chargeur) → relatif à la racine. */
function versRacine(motif: string, chargeur: string): string {
	const negatif = motif.startsWith('!');
	const brut = negatif ? motif.slice(1) : motif;
	let chemin: string;
	if (brut.startsWith('/')) chemin = brut.slice(1);
	else if (brut.startsWith('./') || brut.startsWith('../'))
		chemin = posix.normalize(posix.join(posix.dirname(chargeur), brut));
	else throw new Error(`${chargeur} : motif de import.meta.glob ni relatif ni absolu (${motif})`);
	if (chemin.startsWith('../')) throw new Error(`${chargeur} : motif hors du dépôt (${motif})`);
	return negatif ? `!${chemin}` : chemin;
}

export function charge(fichier: string, c: Chargement): boolean {
	let retenu = false;
	for (const motif of c.motifs) {
		if (motif.startsWith('!')) {
			if (matchesGlob(fichier, motif.slice(1))) retenu = false;
		} else if (matchesGlob(fichier, motif)) retenu = true;
	}
	return retenu;
}
