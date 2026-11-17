/**
 * Un lot de modèles de questions (`scripts/questions/<niveau>-<lot>/*.json`) et ses lignes en base
 * — logique pure, testée dans `scripts/__tests__/lot-questions.test.ts`.
 *
 * Utilisé par `scripts/questions/page-a-cocher.ts` et `scripts/questions/publier-lot.ts`
 * (démarche : docs/pratiques/couvrir-un-niveau.md § 8). Un modèle du lot est retrouvé en base par
 * l'`id` que porte son fichier (écrit par `create-questions --publier`, ou par
 * `export-question-templates.ts`) ; titre et niveau doivent encore concorder. L'ancienne clé
 * (titre + thème, domaine, sous-domaine, niveau) est abandonnée (ADR 0035, chantier
 * `automaths-arbre`, lot 3b).
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
	level: number;
	status: string;
}

export interface Paire<L extends LigneModele> {
	fichier: string;
	modele: ModeleFichier;
	ligne: L;
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
	 * false : le niveau n'a pas à concorder (page à cocher d'un ancien lot, dont les niveaux ont
	 * été renumérotés en base après coup ; la fiche signale l'écart). Vrai par défaut.
	 */
	niveau?: boolean;
}

/** Ce qui sépare la ligne du fichier : « titre X en base, Y dans le fichier », vide si rien */
function ecarts(modele: ModeleFichier, ligne: LigneModele, niveau: boolean): string {
	const champs: [string, unknown, unknown][] = [
		['titre', ligne.title, modele.title],
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

/** L'id que porte un fichier, null s'il n'en porte pas (modèle pas encore créé) */
function idDuFichier(modele: ModeleFichier): string | null {
	const id: unknown = (modele as { id?: unknown }).id;
	return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Chaque modèle du lot avec SA ligne en base, désignée par l'id du fichier, au statut demandé
 * s'il est donné. Tout ou rien : un fichier sans id, un id absent, un titre ou un niveau qui ne
 * concordent plus, un statut inattendu font échouer le lot entier.
 */
export function apparierLot<L extends LigneModele>(
	lot: readonly ModeleDuLot[],
	lignes: readonly L[],
	{ statut: statutAttendu, niveau = true }: OptionsAppariement = {}
): Appariement<L> {
	const erreurs: string[] = [];
	const paires: Paire<L>[] = [];
	for (const { fichier, modele } of lot) {
		const id = idDuFichier(modele);
		if (id === null) {
			erreurs.push(
				`${fichier} : « ${modele.title} » sans id — le créer d’abord (create-questions --publier écrit son id)`
			);
			continue;
		}
		const ligne = lignes.find((l) => l.id === id);
		if (!ligne) {
			erreurs.push(`${fichier} : id ${id.slice(0, 8)} absent de la base`);
			continue;
		}
		const ecart = ecarts(modele, ligne, niveau);
		if (ecart) {
			erreurs.push(`${fichier} : ${ecart} (${id.slice(0, 8)})`);
			continue;
		}
		if (statutAttendu && ligne.status !== statutAttendu) {
			erreurs.push(
				`${fichier} : « ${modele.title} » (${id.slice(0, 8)}) est « ${ligne.status} », attendu « ${statutAttendu} »`
			);
			continue;
		}
		const deja = paires.find((p) => p.ligne.id === id);
		if (deja) {
			erreurs.push(`${fichier} : même modèle en base que ${deja.fichier} (${id.slice(0, 8)})`);
			continue;
		}
		paires.push({ fichier, modele, ligne });
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

/** Ids distincts du lot, pour `.in('id', …)` ; un fichier sans id n'en donne pas (refusé par
 *  `apparierLot`) */
export function idsDuLot(lot: readonly ModeleDuLot[]): string[] {
	return [...new Set(lot.flatMap((m) => idDuFichier(m.modele) ?? []))];
}
