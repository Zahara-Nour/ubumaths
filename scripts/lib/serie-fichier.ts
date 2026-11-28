/**
 * Une série décrite dans un fichier (`scripts/series/<nom>.json`) et ses contrôles
 * — logique pure, testée dans `scripts/__tests__/serie-fichier.test.ts`.
 *
 * Utilisé par `scripts/series/creer-serie.ts` : une série validée avec David devient un fichier,
 * que le script enregistre en base au nom du professeur. Le fichier reprend la forme d'une série
 * de l'appli (ADR 0035 : des modèles, chacun avec un nombre de questions et une durée) ; `modele`
 * (le titre du modèle) n'est là que pour la relecture humaine et n'est pas enregistré.
 */

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { createSeriesSchema } from '../../src/lib/server/validation/evaluations';
import { seriesItemSchema, type SeriesItem } from '../../src/lib/validation/series';

// Types

/** Ce qu'il faut d'une ligne `question_templates` pour contrôler une ligne de série */
export interface LigneModeleSerie {
	id: string;
	title: string;
	status: string;
	grades: string[] | null;
}

// Constantes

const ligneFichierSchema = seriesItemSchema
	.extend({
		modele: z.string().max(300).optional()
	})
	.strict();

/** Le fichier : une série de l'appli, plus l'id écrit après l'enregistrement */
export const serieFichierSchema = createSeriesSchema
	.omit({ items: true })
	.extend({
		id: z.string().uuid('id de série invalide').optional(),
		items: z.array(ligneFichierSchema).min(1, 'Au moins un modèle').max(50)
	})
	.strict()
	.superRefine((serie, ctx) => {
		// Mêmes bornes que l'enregistrement par l'appli (total de questions…)
		const items = serie.items.map(versLigneSerie);
		const verdict = createSeriesSchema.shape.items.safeParse(items);
		if (!verdict.success) {
			for (const issue of verdict.error.issues) {
				ctx.addIssue({ code: 'custom', message: issue.message, path: ['items', ...issue.path] });
			}
		}
		const vus = new Set<string>();
		for (const [i, item] of serie.items.entries()) {
			if (vus.has(item.templateId)) {
				ctx.addIssue({
					code: 'custom',
					message: `modèle ${item.templateId} présent deux fois`,
					path: ['items', i, 'templateId']
				});
			}
			vus.add(item.templateId);
		}
	});

export type SerieFichier = z.infer<typeof serieFichierSchema>;

// Fonctions

/** Une ligne de série telle que la base l'enregistre (sans le titre de relecture) */
export function versLigneSerie(item: SerieFichier['items'][number]): SeriesItem {
	return { templateId: item.templateId, quantity: item.quantity, delay: item.delay };
}

/** Lit et valide un fichier de série ; lève une erreur lisible sur un fichier refusé */
export function lireSerie(chemin: string): SerieFichier {
	let brut: unknown;
	try {
		brut = JSON.parse(readFileSync(chemin, 'utf8'));
	} catch (e) {
		throw new Error(`${chemin} illisible : ${e instanceof Error ? e.message : String(e)}`);
	}
	const verdict = serieFichierSchema.safeParse(brut);
	if (!verdict.success) {
		const lignes = verdict.error.issues.map(
			(i) => `  - ${i.path.join('.') || '(racine)'} : ${i.message}`
		);
		throw new Error(`${chemin} refusé :\n${lignes.join('\n')}`);
	}
	return verdict.data;
}

/**
 * Contrôles en base : chaque modèle existe, est publié (un brouillon est invisible aux élèves)
 * et est du niveau de la série. Rend la liste des refus, vide si tout va bien.
 */
export function controlerModeles(serie: SerieFichier, lignes: LigneModeleSerie[]): string[] {
	const parId = new Map(lignes.map((l) => [l.id, l]));
	const refus: string[] = [];
	for (const item of serie.items) {
		const ligne = parId.get(item.templateId);
		const nom = item.modele ? `« ${item.modele} » (${item.templateId})` : item.templateId;
		if (!ligne) {
			refus.push(`${nom} : modèle introuvable en base`);
			continue;
		}
		if (ligne.status !== 'published') {
			refus.push(
				`« ${ligne.title} » : pas publié (${ligne.status}), les élèves ne le verraient pas`
			);
		}
		if (!(ligne.grades ?? []).includes(serie.grade)) {
			refus.push(
				`« ${ligne.title} » : niveau ${(ligne.grades ?? []).join(', ') || 'aucun'}, pas ${serie.grade}`
			);
		}
	}
	return refus;
}

/** Durée totale de la série, en secondes (0 = durée par défaut du modèle) */
export function dureeTotale(serie: SerieFichier, delaisParDefaut: Map<string, number>): number {
	return serie.items.reduce(
		(total, item) =>
			total +
			item.quantity * (item.delay > 0 ? item.delay : (delaisParDefaut.get(item.templateId) ?? 0)),
		0
	);
}

/** Réécrit le fichier avec l'id de la série en tête, le reste inchangé */
export function ecrireIdSerie(chemin: string, id: string): void {
	const brut = JSON.parse(readFileSync(chemin, 'utf8')) as Record<string, unknown>;
	const { id: _ancien, ...reste } = brut;
	// Fichier temporaire puis renommage : jamais de JSON tronqué
	const temporaire = `${chemin}.tmp`;
	writeFileSync(temporaire, `${JSON.stringify({ id, ...reste }, null, '\t')}\n`);
	renameSync(temporaire, chemin);
}
