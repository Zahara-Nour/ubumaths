/**
 * Niveaux d'un modèle et niveaux de ses tags
 * ==========================================
 *
 * Règle : un modèle tagué d'un point d'un niveau porte ce niveau dans `grades`. Le cahier de texte
 * filtre les modèles par niveau (`.contains('grades', [niveau])`) : sans lui, une classe de ce
 * niveau ne voit pas le modèle, sans rien signaler.
 *
 * Fonctions pures, appelées par `scripts/questions/garde-niveaux-tags.ts` (toute la base) et par
 * `publier-lot.ts` (les modèles du lot).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/types/database';

// Types

/** Un tag lu en base : le modèle, ses niveaux, et le niveau du point tagué */
export interface LigneTag {
	id: string;
	title: string;
	status: string;
	grades: string[];
	pointGrade: string;
}

/** Un modèle dont des niveaux de tags manquent à `grades` */
export interface EcartNiveaux {
	id: string;
	title: string;
	status: string;
	grades: string[];
	manquants: string[];
}

// Constantes

/** PostgREST plafonne une lecture à 1000 lignes : on lit par pages */
const PAGE = 1000;
/** Identifiants par requête `.in()` : la liste part dans l'URL (cf. `reprise-verdicts.ts`) */
const PAQUET = 200;

// Fonctions

/** Les niveaux des tags absents de `grades`, sans doublon, triés */
export function niveauxManquants(
	grades: readonly string[],
	niveauxTags: readonly string[]
): string[] {
	const presents = new Set(grades);
	return [...new Set(niveauxTags.filter((g) => !presents.has(g)))].sort();
}

/** Les modèles en écart, triés par statut (publiés d'abord) puis par titre */
export function ecartsNiveaux(lignes: readonly LigneTag[]): EcartNiveaux[] {
	const parModele = new Map<string, { ligne: LigneTag; niveaux: string[] }>();
	for (const l of lignes) {
		const m = parModele.get(l.id) ?? { ligne: l, niveaux: [] };
		m.niveaux.push(l.pointGrade);
		parModele.set(l.id, m);
	}
	const ecarts: EcartNiveaux[] = [];
	for (const { ligne, niveaux } of parModele.values()) {
		const manquants = niveauxManquants(ligne.grades, niveaux);
		if (manquants.length > 0) {
			ecarts.push({
				id: ligne.id,
				title: ligne.title,
				status: ligne.status,
				grades: ligne.grades,
				manquants
			});
		}
	}
	const rang = (s: string): number => (s === 'published' ? 0 : 1);
	return ecarts.sort(
		(a, b) => rang(a.status) - rang(b.status) || a.title.localeCompare(b.title, 'fr')
	);
}

/** Une ligne lisible par écart : `id8 statut [niveaux] + manquants « titre »` */
export function formaterEcart(e: EcartNiveaux): string {
	return `  ${e.id.slice(0, 8)} ${e.status.padEnd(9)} [${e.grades.join(', ')}] + ${e.manquants.join(', ')}  « ${e.title} »`;
}

/**
 * Les tags lus en base, avec les niveaux de leur modèle et celui de leur point ; `ids` : seulement
 * ces modèles (sinon toute la base). Jointures embarquées : un tag dont le modèle ou le point
 * serait masqué par la RLS manquerait, d'où la clé de service (`createScriptClient`).
 */
export async function lireLignesTags(
	supabase: SupabaseClient<Database>,
	ids?: readonly string[]
): Promise<LigneTag[]> {
	if (!ids) return lirePages(supabase, null);
	const lignes: LigneTag[] = [];
	for (let i = 0; i < ids.length; i += PAQUET) {
		lignes.push(...(await lirePages(supabase, ids.slice(i, i + PAQUET))));
	}
	return lignes;
}

/** Les tags par pages de 1000 ; `ids` : seulement ces modèles (null : toute la base) */
async function lirePages(
	supabase: SupabaseClient<Database>,
	ids: readonly string[] | null
): Promise<LigneTag[]> {
	const lignes: LigneTag[] = [];
	for (let debut = 0; ; debut += PAGE) {
		let requete = supabase
			.from('question_template_points')
			.select(
				'template_id, point_id, question_templates!inner(title, status, grades), curriculum_points!inner(grade)'
			)
			.order('template_id')
			.order('point_id')
			.range(debut, debut + PAGE - 1);
		if (ids) requete = requete.in('template_id', [...ids]);
		const { data, error } = await requete;
		if (error) throw new Error(`lecture des tags impossible — ${error.message}`);
		for (const t of data ?? []) {
			lignes.push({
				id: t.template_id,
				title: t.question_templates.title,
				status: t.question_templates.status,
				grades: t.question_templates.grades ?? [],
				pointGrade: t.curriculum_points.grade
			});
		}
		if ((data ?? []).length < PAGE) return lignes;
	}
}
