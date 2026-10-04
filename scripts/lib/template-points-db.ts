/**
 * Rattachement d'un modèle au référentiel — accès base
 * ====================================================
 *
 * Lectures et écritures de `question_template_points`, communes à
 * `scripts/create-questions.ts` et `scripts/link-template-points.ts`. La logique pure
 * (contrôles, plan, textes) vit dans `template-points.ts`.
 *
 * La RLS échoue en silence (zéro ligne, pas d'erreur) : chaque écriture exige ses lignes
 * rendues, puis les liens sont relus.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	describeLinkPlan,
	planPointLinks,
	type ExistingLink,
	type PointLinkPlan,
	type ResolvedPoint
} from './template-points';

// Types

type Client = SupabaseClient<Database>;

// Fonctions

/** Tous les codes, en UNE requête ; seuls les points actifs reviennent */
export async function resolvePoints(
	supabase: Client,
	codes: string[]
): Promise<Map<string, ResolvedPoint>> {
	const resolus = new Map<string, ResolvedPoint>();
	if (codes.length === 0) return resolus;
	const { data, error } = await supabase
		.from('curriculum_points')
		.select('id, code, curriculum_objectives(curriculum_themes(grade))')
		.in('code', codes)
		.is('archived_at', null);
	if (error) throw new Error(`lecture des points du référentiel : ${error.message}`);
	for (const ligne of data ?? []) {
		const grade = ligne.curriculum_objectives?.curriculum_themes?.grade;
		if (!grade) throw new Error(`point ${ligne.code} : niveau introuvable (objectif → thème)`);
		resolus.set(ligne.code, { id: ligne.id, code: ligne.code, grade });
	}
	return resolus;
}

/** Liens en base d'un modèle (code lu par jointure, même si le point a été archivé) */
export async function readLinks(supabase: Client, templateId: string): Promise<ExistingLink[]> {
	const { data, error } = await supabase
		.from('question_template_points')
		.select('point_id, curriculum_points(code)')
		.eq('template_id', templateId);
	if (error) throw new Error(`lecture des liens de ${templateId} : ${error.message}`);
	return (data ?? []).map((l) => ({
		pointId: l.point_id,
		code: l.curriculum_points?.code ?? `(point ${l.point_id})`
	}));
}

/** Ajoute (et, si demandé, supprime) les liens, puis relit : la RLS échoue en silence */
export async function writeLinks(
	supabase: Client,
	label: string,
	templateId: string,
	codes: string[],
	plan: PointLinkPlan,
	resolus: ReadonlyMap<string, ResolvedPoint>,
	remplacer: boolean
): Promise<void> {
	if (plan.toAdd.length > 0) {
		const lignes = plan.toAdd.map((code) => {
			const point = resolus.get(code);
			if (!point) throw new Error(`${label} : point ${code} non résolu`);
			return { template_id: templateId, point_id: point.id };
		});
		const { data, error } = await supabase
			.from('question_template_points')
			.insert(lignes)
			.select('point_id');
		if (error || data?.length !== lignes.length)
			throw new Error(
				`${label} : ajout des liens non confirmé — ${error?.message ?? `${data?.length ?? 0}/${lignes.length} lignes`}`
			);
	}
	if (remplacer && plan.extra.length > 0) {
		const { data, error } = await supabase
			.from('question_template_points')
			.delete()
			.eq('template_id', templateId)
			.in(
				'point_id',
				plan.extra.map((l) => l.pointId)
			)
			.select('point_id');
		if (error || data?.length !== plan.extra.length)
			throw new Error(
				`${label} : suppression des liens non confirmée — ${error?.message ?? `${data?.length ?? 0}/${plan.extra.length} lignes`}`
			);
	}
	const relu = planPointLinks(codes, await readLinks(supabase, templateId));
	if (relu.toAdd.length > 0 || (remplacer && relu.extra.length > 0)) {
		throw new Error(`${label} : liens relus incomplets — ${describeLinkPlan(relu, remplacer)}`);
	}
}
