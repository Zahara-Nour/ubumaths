/**
 * Un lot de modèles de questions (`scripts/questions/<niveau>-<lot>/*.json`) et ses lignes en base
 * — logique pure, testée dans `scripts/__tests__/lot-questions.test.ts`.
 *
 * Utilisé par `scripts/questions/page-a-cocher.ts` et `scripts/questions/publier-lot.ts`
 * (démarche : docs/pratiques/couvrir-un-niveau.md § 8). Un modèle du lot est retrouvé en base par
 * la même clé que `create-questions.ts` : titre, thème, domaine, sous-domaine, niveau.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { QuestionTemplate } from '../../src/lib/questions/types';
import { readTemplateFile } from './template-file';

// Types

export type ModeleFichier = Omit<QuestionTemplate, 'id'>;

export interface ModeleDuLot {
	fichier: string;
	modele: ModeleFichier;
}

/** Ce qu'il faut d'une ligne `question_templates` pour l'apparier */
export interface LigneModele {
	id: string;
	title: string;
	theme: string;
	domain: string;
	subdomain: string | null;
	level: number;
	status: string;
}

export interface Paire<L extends LigneModele> {
	fichier: string;
	modele: ModeleFichier;
	ligne: L;
	/** Homonymes d'un autre niveau écartés par le départage (niveau hors de la clé) : à signaler */
	ecartes?: L[];
}

export type Appariement<L extends LigneModele> =
	{ ok: true; paires: Paire<L>[] } | { ok: false; erreurs: string[] };

// Fonctions

/** Les modèles d'un dossier de lot, dans l'ordre des fichiers ; lève une erreur sur un fichier refusé */
export function lireLot(dossier: string): ModeleDuLot[] {
	const fichiers = readdirSync(dossier)
		.filter((f) => f.endsWith('.json'))
		.sort();
	if (fichiers.length === 0) throw new Error(`aucun fichier .json dans ${dossier}`);
	return fichiers.map((fichier) => {
		const extrait = readTemplateFile(
			JSON.parse(readFileSync(join(dossier, fichier), 'utf8')) as unknown,
			fichier
		);
		if (!extrait.ok) throw new Error(extrait.error);
		return { fichier, modele: extrait.template as unknown as ModeleFichier };
	});
}

export interface OptionsAppariement {
	/** Statut exigé de chaque ligne (`draft` pour publier) ; tout statut sinon */
	statut?: string;
	/**
	 * false : le niveau n'entre pas dans la clé (page à cocher d'un ancien lot, dont les niveaux
	 * ont été renumérotés en base après coup ; la fiche signale l'écart). Vrai par défaut.
	 */
	niveau?: boolean;
}

/** Même clé que `create-questions.ts` (sous-domaine absent = null), niveau compris sauf option */
function memeModele(modele: ModeleFichier, ligne: LigneModele, niveau: boolean): boolean {
	return (
		ligne.title === modele.title &&
		ligne.theme === modele.theme &&
		ligne.domain === modele.domain &&
		ligne.subdomain === (modele.subdomain ?? null) &&
		(!niveau || ligne.level === modele.level)
	);
}

/** Ce qui sépare une ligne de même titre du fichier : « sous-domaine X en base, Y dans le fichier » */
function ecarts(modele: ModeleFichier, ligne: LigneModele, niveau: boolean): string {
	const champs: [string, unknown, unknown][] = [
		['thème', ligne.theme, modele.theme],
		['domaine', ligne.domain, modele.domain],
		['sous-domaine', ligne.subdomain, modele.subdomain ?? null],
		...(niveau ? [['niveau', ligne.level, modele.level] as [string, unknown, unknown]] : [])
	];
	return champs
		.filter(([, base, fichier]) => base !== fichier)
		.map(
			([nom, base, fichier]) =>
				`${nom} « ${String(base)} » en base, « ${String(fichier)} » dans le fichier`
		)
		.join(', ');
}

/**
 * Chaque modèle du lot avec SA ligne en base : exactement une, au statut demandé s'il est donné.
 * Tout ou rien : la moindre absence, ambiguïté ou erreur de statut fait échouer le lot entier.
 */
export function apparierLot<L extends LigneModele>(
	lot: readonly ModeleDuLot[],
	lignes: readonly L[],
	{ statut: statutAttendu, niveau = true }: OptionsAppariement = {}
): Appariement<L> {
	const erreurs: string[] = [];
	const paires: Paire<L>[] = [];
	for (const { fichier, modele } of lot) {
		let trouvees = lignes.filter((l) => memeModele(modele, l, niveau));
		// Niveau hors de la clé : un homonyme d'un autre niveau (même modèle en CM1 et en 6e) est
		// départagé par le niveau du fichier, s'il en désigne exactement un. Le choix est rendu
		// (`ecartes`) : un ancien lot renuméroté prendrait ainsi l'homonyme, pas son modèle
		let ecartes: L[] = [];
		const memeNiveau = trouvees.filter((l) => l.level === modele.level);
		if (trouvees.length > 1 && memeNiveau.length === 1) {
			ecartes = trouvees.filter((l) => l !== memeNiveau[0]);
			trouvees = memeNiveau;
		}
		if (trouvees.length === 0) {
			const memeTitre = lignes.filter((l) => l.title === modele.title);
			erreurs.push(
				`${fichier} : « ${modele.title} » absent de la base${memeTitre.map((l) => ` ; même titre, ${ecarts(modele, l, niveau)} (${l.id.slice(0, 8)})`).join('')}`
			);
			continue;
		}
		if (trouvees.length > 1) {
			erreurs.push(`${fichier} : ${trouvees.length} modèles « ${modele.title} » en base`);
			continue;
		}
		const ligne = trouvees[0];
		if (statutAttendu && ligne.status !== statutAttendu) {
			erreurs.push(
				`${fichier} : « ${modele.title} » (${ligne.id.slice(0, 8)}) est « ${ligne.status} », attendu « ${statutAttendu} »`
			);
			continue;
		}
		const deja = paires.find((p) => p.ligne.id === ligne.id);
		if (deja) {
			erreurs.push(
				`${fichier} : même modèle en base que ${deja.fichier} (${ligne.id.slice(0, 8)})`
			);
			continue;
		}
		paires.push({ fichier, modele, ligne, ...(ecartes.length > 0 ? { ecartes } : {}) });
	}
	return erreurs.length > 0 ? { ok: false, erreurs } : { ok: true, paires };
}

/**
 * Valeur d'une option (`--dir <dossier>`) ; absente si l'option manque ou si la suite est une
 * autre option (`--dir --publier` ne donne pas le dossier « --publier »)
 */
export function valeurArgument(argv: readonly string[], option: string): string | undefined {
	const i = argv.indexOf(option);
	const valeur = i === -1 ? undefined : argv[i + 1];
	return valeur === undefined || valeur.startsWith('--') ? undefined : valeur;
}

/** Titres distincts du lot : le filtre de la requête (l'appariement fin se fait ensuite) */
export function titresDuLot(lot: readonly ModeleDuLot[]): string[] {
	return [...new Set(lot.map((m) => m.modele.title))];
}
