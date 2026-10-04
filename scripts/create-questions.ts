/**
 * Créer des modèles de questions NEUFS (en brouillon) depuis des fichiers JSON
 * ============================================================================
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit sans `--publier`.
 *
 * Pour des questions écrites hors de l'éditeur (ex. automatismes de 1re) ; les
 * questions TinyMath passent, elles, par `pnpm relecture:import`.
 *
 * Chaque fichier `*.json` du dossier est un modèle brut (camelCase, sans `id`), avec
 * ses `testSpecs`. Il n'est créé que si :
 *  - `checkTemplate` passe (structure, TOUTES les specs vertes, tirages sans échec) ;
 *  - aucun modèle de même titre n'existe au même endroit (thème, domaine,
 *    sous-domaine, niveau) — rejouable sans doublon.
 * Statut forcé à `draft` (David publie lui-même) ; `test_specs` écrit ; chaque ligne
 * est relue après écriture. S'arrête à la première erreur.
 *
 * Rattachement au référentiel : champ facultatif `"points": ["1SPE-135", …]` (codes de
 * `curriculum_points`, ≤ 20, sans doublon), écrit dans `question_template_points`. Tous les
 * fichiers sont vérifiés AVANT toute écriture (modèle, codes résolus en une requête, niveau de
 * chaque point présent dans `grades`). Sans champ `points`, aucun lien n'est lu ni touché.
 * Un lien en base absent du fichier n'est JAMAIS supprimé, sauf `--remplacer-points`.
 *
 * Usage :
 *   pnpm tsx scripts/create-questions.ts --dir <dossier>            (simulation)
 *   pnpm tsx scripts/create-questions.ts --dir <dossier> --publier  (écrit)
 *   … --publier --mettre-a-jour   remplace aussi le contenu des modèles DÉJÀ en base, s'ils
 *                                 sont encore en brouillon (un modèle publié n'est jamais touché),
 *                                 et ajoute leurs liens manquants vers les points du fichier
 *   … --mettre-a-jour --remplacer-points   supprime en plus les liens en base absents du fichier
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { QuestionTemplate } from '$lib/questions/types';
import { checkTemplate } from '$lib/migration/review/check-template';
import { toTemplateInsertRow } from '$lib/migration/review/template-insert-row';
import { argValue, createScriptClient, findReviewerId, hasFlag } from './relecture/common';
import {
	checkPointCodes,
	extractTemplatePoints,
	planPointLinks,
	type ExistingLink,
	type PointLinkPlan,
	type ResolvedPoint
} from './lib/template-points';

type Client = SupabaseClient<Database>;

interface Entree {
	fichier: string;
	modele: Omit<QuestionTemplate, 'id'>;
	/** `null` : pas de champ `points` dans le fichier */
	codes: string[] | null;
}

/** Sérialisation à clés triées : `jsonb` réordonne les clés, `JSON.stringify` seul verrait
 *  toujours une différence entre le fichier et la base */
function canonique(valeur: unknown): string {
	return JSON.stringify(valeur, (_cle, v: unknown) =>
		v && typeof v === 'object' && !Array.isArray(v)
			? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
			: v
	);
}

/** Tous les codes de tous les fichiers, en UNE requête ; seuls les points actifs reviennent */
async function resoudrePoints(
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

async function lireLiens(supabase: Client, templateId: string): Promise<ExistingLink[]> {
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

function decrireLiens(plan: PointLinkPlan, remplacer: boolean): string {
	const parties: string[] = [];
	if (plan.toAdd.length) parties.push(`+${plan.toAdd.length} à ajouter (${plan.toAdd.join(', ')})`);
	if (plan.present.length) parties.push(`${plan.present.length} déjà présents`);
	if (plan.extra.length) {
		const codes = plan.extra.map((l) => l.code).join(', ');
		parties.push(
			remplacer
				? `-${plan.extra.length} à supprimer (${codes})`
				: `${plan.extra.length} en base absents du fichier, gardés (${codes})`
		);
	}
	return `liens : ${parties.length ? parties.join(' ; ') : 'aucun'}`;
}

/** Ajoute (et, si demandé, supprime) les liens, puis relit : la RLS échoue en silence */
async function ecrireLiens(
	supabase: Client,
	fichier: string,
	templateId: string,
	codes: string[],
	plan: PointLinkPlan,
	resolus: ReadonlyMap<string, ResolvedPoint>,
	remplacer: boolean
): Promise<void> {
	if (plan.toAdd.length > 0) {
		const lignes = plan.toAdd.map((code) => {
			const point = resolus.get(code);
			if (!point) throw new Error(`${fichier} : point ${code} non résolu`);
			return { template_id: templateId, point_id: point.id };
		});
		const { data, error } = await supabase
			.from('question_template_points')
			.insert(lignes)
			.select('point_id');
		if (error || data?.length !== lignes.length)
			throw new Error(
				`${fichier} : ajout des liens non confirmé — ${error?.message ?? `${data?.length ?? 0}/${lignes.length} lignes`}`
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
				`${fichier} : suppression des liens non confirmée — ${error?.message ?? `${data?.length ?? 0}/${plan.extra.length} lignes`}`
			);
	}
	const relu = planPointLinks(codes, await lireLiens(supabase, templateId));
	if (relu.toAdd.length > 0 || (remplacer && relu.extra.length > 0)) {
		throw new Error(`${fichier} : liens relus incomplets — ${decrireLiens(relu, remplacer)}`);
	}
}

async function main(): Promise<number> {
	const publier = hasFlag('--publier');
	const mettreAJour = hasFlag('--mettre-a-jour');
	const remplacerPoints = hasFlag('--remplacer-points');
	const dossier = argValue('--dir');
	if (!dossier) {
		console.error(
			'Usage : pnpm tsx scripts/create-questions.ts --dir <dossier> [--publier [--mettre-a-jour [--remplacer-points]]]'
		);
		return 2;
	}
	if (remplacerPoints && !mettreAJour) {
		console.error('⛔ --remplacer-points ne vaut qu’avec --mettre-a-jour');
		return 2;
	}
	const { supabase, target } = createScriptClient(publier);
	console.log(`${publier ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — base ${target}\n`);
	const auteur = await findReviewerId(supabase);

	const fichiers = readdirSync(dossier)
		.filter((f) => f.endsWith('.json'))
		.sort();
	if (fichiers.length === 0) {
		console.error(`⛔ aucun fichier .json dans ${dossier}`);
		return 2;
	}

	// 1. Tout vérifier avant la moindre écriture
	const entrees: Entree[] = [];
	for (const fichier of fichiers) {
		const extrait = extractTemplatePoints(
			JSON.parse(readFileSync(join(dossier, fichier), 'utf8')) as unknown,
			fichier
		);
		if (!extrait.ok) {
			console.error(`⛔ ${extrait.error}`);
			return 1;
		}
		const modele = extrait.template as unknown as Omit<QuestionTemplate, 'id'>;
		const rapport = checkTemplate(modele);
		if (!rapport.passed) {
			console.error(`⛔ ${fichier} refusé : ${rapport.reasons.join(' ; ')}`);
			return 1;
		}
		entrees.push({ fichier, modele, codes: extrait.codes });
	}
	const tousLesCodes = [...new Set(entrees.flatMap((e) => e.codes ?? []))];
	const resolus = await resoudrePoints(supabase, tousLesCodes);
	const erreursPoints = checkPointCodes(
		entrees.map((e) => ({ file: e.fichier, codes: e.codes, grades: e.modele.grades ?? [] })),
		resolus
	);
	if (erreursPoints.length > 0) {
		for (const erreur of erreursPoints) console.error(`⛔ ${erreur}`);
		return 1;
	}

	// 2. Créer / mettre à jour
	let crees = 0;
	let deja = 0;
	let misAJour = 0;
	for (const { fichier, modele, codes } of entrees) {
		let requete = supabase
			.from('question_templates')
			.select('id, status, variations, shared, options, test_specs')
			.eq('title', modele.title)
			.eq('theme', modele.theme)
			.eq('domain', modele.domain)
			.eq('level', modele.level);
		requete = modele.subdomain
			? requete.eq('subdomain', modele.subdomain)
			: requete.is('subdomain', null);
		const { data: existants, error: e1 } = await requete;
		if (e1) throw new Error(`${fichier} : lecture impossible — ${e1.message}`);
		if (existants && existants.length > 0) {
			if (existants.length > 1) {
				console.error(
					`⛔ ${fichier} : ${existants.length} modèles identiques déjà en base — à régler à la main`
				);
				return 1;
			}
			const existant = existants[0];
			const ligne = toTemplateInsertRow(modele, auteur);
			// `points` n'est pas du contenu du modèle : comparé à part, sur les liens
			const identique =
				canonique(existant.variations) === canonique(ligne.variations) &&
				canonique(existant.shared) === canonique(ligne.shared) &&
				canonique(existant.options) === canonique(ligne.options) &&
				canonique(existant.test_specs) === canonique(ligne.test_specs);
			const plan = codes ? planPointLinks(codes, await lireLiens(supabase, existant.id)) : null;
			const liensAEcrire =
				!!plan && (plan.toAdd.length > 0 || (remplacerPoints && plan.extra.length > 0));
			const noteLiens = plan ? `\n      ${decrireLiens(plan, remplacerPoints)}` : '';
			if ((identique && !liensAEcrire) || !mettreAJour) {
				const aFaire = [
					identique ? '' : 'CONTENU DIFFÉRENT',
					plan?.toAdd.length ? 'LIENS À AJOUTER' : ''
				].filter(Boolean);
				console.log(
					`  = ${fichier} : déjà en base (${existant.id})${aFaire.length ? ` — ${aFaire.join(', ')} (--mettre-a-jour)` : ''}${noteLiens}`
				);
				deja++;
				continue;
			}
			if (existant.status !== 'draft') {
				console.error(`⛔ ${fichier} : modèle ${existant.status}, jamais modifié par ce script`);
				return 1;
			}
			const quoi = identique ? 'liens à mettre à jour' : 'contenu à mettre à jour';
			if (!publier) {
				console.log(`  ↻ ${fichier} : ${quoi} (${existant.id})${noteLiens}`);
				continue;
			}
			if (!identique) {
				const { data: maj, error: e3 } = await supabase
					.from('question_templates')
					.update({
						variations: ligne.variations,
						shared: ligne.shared,
						options: ligne.options,
						test_specs: ligne.test_specs
					})
					.eq('id', existant.id)
					.eq('status', 'draft')
					.select('id');
				if (e3 || maj?.length !== 1)
					throw new Error(
						`${fichier} : mise à jour non confirmée — ${e3?.message ?? 'aucune ligne'}`
					);
			}
			if (codes && plan) {
				await ecrireLiens(supabase, fichier, existant.id, codes, plan, resolus, remplacerPoints);
			}
			console.log(
				`  ↻ ${fichier} : ${identique ? 'liens' : 'contenu'} mis à jour (${existant.id})${noteLiens}`
			);
			misAJour++;
			continue;
		}

		const specs = modele.testSpecs?.length ?? 0;
		const planNeuf = codes ? planPointLinks(codes, []) : null;
		const noteNeuf = planNeuf ? `\n      ${decrireLiens(planNeuf, false)}` : '';
		if (!publier) {
			console.log(`  ✓ ${fichier} : « ${modele.title} » (${specs} specs) — à créer${noteNeuf}`);
			continue;
		}
		const { data: cree, error: e2 } = await supabase
			.from('question_templates')
			.insert(toTemplateInsertRow(modele, auteur))
			.select('id, status, title')
			.single();
		// La RLS échoue en silence : exiger la ligne relue, en brouillon
		if (e2 || !cree || cree.status !== 'draft' || cree.title !== modele.title) {
			throw new Error(
				`${fichier} : création non confirmée — ${e2?.message ?? JSON.stringify(cree)}`
			);
		}
		if (codes && planNeuf) {
			await ecrireLiens(supabase, fichier, cree.id, codes, planNeuf, resolus, false);
		}
		console.log(`  ✍️  ${fichier} : « ${cree.title} » créé en brouillon (${cree.id})${noteNeuf}`);
		crees++;
	}
	console.log(
		`\n${fichiers.length} fichiers — ${publier ? `${crees} créés, ${misAJour} mis à jour` : 'simulation'}, ${deja} déjà en base.`
	);
	return 0;
}

main()
	.then((code) => process.exit(code))
	.catch((e) => {
		console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(1);
	});
