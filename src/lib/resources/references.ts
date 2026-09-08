/**
 * Extraction des références `[[type:uuid|libellé]]` d'un contenu markdown.
 *
 * Fonction pure, sans dépendance : elle sert côté serveur pour dériver la
 * couverture du programme depuis ce que le prof a écrit dans une séance, et elle
 * est testable sans base ni éditeur.
 *
 * ⚠️ L'expression régulière DOIT rester alignée sur celle du parser
 * (`src/lib/ubumark/parser/markdown-parser.ts`). Si les deux divergent, une
 * référence s'afficherait comme un lien sans compter dans la couverture, ou
 * l'inverse — deux incohérences également difficiles à diagnostiquer. Un test
 * vérifie que les deux acceptent les mêmes types.
 *
 * @module resources/references
 */

import { isResourceKind, type ResourceKind } from './kinds';

/**
 * Même grammaire que le parser : type, uuid canonique, libellé sans `]`.
 *
 * Exportée pour que `linkify.ts` reconnaisse exactement les mêmes références que
 * la couverture du programme : un lien affiché qui ne compterait pas — ou un
 * point compté sans lien visible — serait indétectable à la lecture.
 */
export const REFERENCE_REGEX =
	/\[\[(\w+):([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\|([^\]]+)\]\]/gi;

export interface ResourceReference {
	kind: ResourceKind;
	id: string;
	label: string;
}

/**
 * Toutes les références d'un ou plusieurs contenus, dédoublonnées.
 *
 * Un même exercice cité deux fois — dans l'énoncé et dans les devoirs — ne
 * compte qu'une fois : la couverture dit qu'un point a été travaillé, pas
 * combien de fois il a été mentionné.
 *
 * Les types inconnus sont ignorés en silence, comme le fait le parser : du texte
 * ressemblant à une référence n'est pas une référence.
 */
export function extractResourceReferences(
	...contents: (string | null | undefined)[]
): ResourceReference[] {
	const seen = new Map<string, ResourceReference>();

	for (const content of contents) {
		if (!content) continue;

		for (const match of content.matchAll(REFERENCE_REGEX)) {
			const [, rawKind, id, label] = match;
			const kind = rawKind.toLowerCase();
			if (!isResourceKind(kind)) continue;

			seen.set(`${kind}:${id.toLowerCase()}`, {
				kind,
				id: id.toLowerCase(),
				label: label.trim()
			});
		}
	}

	return [...seen.values()];
}

/**
 * Les identifiants d'un type donné, prêts pour une requête `in(...)`.
 */
export function referenceIdsOfKind(references: ResourceReference[], kind: ResourceKind): string[] {
	return references.filter((reference) => reference.kind === kind).map((reference) => reference.id);
}

/**
 * Remplace chaque référence par son seul libellé.
 *
 * Sert aux APERÇUS (grille de la semaine, cartes de séance) : là, le texte est
 * tronqué à cinquante caractères, et un uuid en mangerait la moitié. Le libellé
 * dit déjà de quoi il s'agit ; le lien, lui, appartient à la page de détail.
 *
 * Les types inconnus sont laissés intacts : rien ne prouve que c'était une
 * référence, et effacer du texte qu'on n'a pas compris serait pire que l'afficher.
 */
export function referencesToLabels(content: string | null | undefined): string {
	if (!content) return '';

	return content.replace(REFERENCE_REGEX, (whole, rawKind: string, _id: string, label: string) =>
		isResourceKind(rawKind.toLowerCase()) ? label.trim() : whole
	);
}
