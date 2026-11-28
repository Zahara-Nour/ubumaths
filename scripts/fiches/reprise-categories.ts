/**
 * Reprise des fiches en prod : catégorie, notions et titre (ADR 0041, PR 3b)
 * ==========================================================================
 *
 * Écrit sur les fiches existantes la catégorie, les notions et le titre validés
 * par David sur la page à cocher (réponses exportées dans
 * `data/fiches/reprise-categories/reponses.json`). Une fiche modifiée depuis le
 * relevé (titre changé, catégorie ou notions déjà posées) est sautée : la règle
 * est dans `reprise-categories-plan.ts`.
 *
 * Simulation par défaut : affiche avant → après, n'écrit rien. `--appliquer` écrit.
 * Base : celle du `.env` (prod), ou celle des variables d'environnement déjà posées
 * (essai en local : PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY de
 * `pnpm exec supabase status -o env`).
 *
 * Usage : pnpm tsx scripts/fiches/reprise-categories.ts [--appliquer] [--reponses <fichier>]
 *
 * Écriture fiche par fiche : les notions d'abord (`worksheet_classifications`,
 * position 0, 1, …), puis `worksheets` (type, catégorie, case titre libre, titre),
 * seulement si la fiche a encore son titre du relevé et aucune catégorie. Pas de
 * transaction possible par l'API : une fiche écrite à moitié (notions posées,
 * fiche en échec) est signalée, garde son ancien titre, et une relance la saute
 * (notions déjà posées) ; la finir dans l'éditeur. Jamais de titre composé sans
 * ses notions.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { config as dotenv } from 'dotenv';
import { z } from 'zod';
import type { Database } from '#lib/types/database.ts';
import { loadBranches } from '#lib/server/worksheets/worksheet-classification.ts';
import { type FicheEnBase, type NoeudConnu, planFiche } from './reprise-categories-plan.ts';

dotenv({ path: '.env' });

// ============================================================================
// Constantes
// ============================================================================

const FICHIER_PAR_DEFAUT = 'data/fiches/reprise-categories/reponses.json';

const ReponsesSchema = z
	.array(
		z.object({
			id: z.string().uuid(),
			titreActuel: z.string().min(1).max(300),
			type: z.enum(['worksheet', 'assessment']),
			categorie: z.string().max(40).nullable(),
			notions: z.array(z.string().uuid()).max(20),
			titreLibre: z.boolean()
		})
	)
	.min(1)
	.max(200);

// ============================================================================
// Fonctions
// ============================================================================

function lireArguments() {
	const args = process.argv.slice(2);
	const i = args.indexOf('--reponses');
	return {
		appliquer: args.includes('--appliquer'),
		fichier: i >= 0 && args[i + 1] ? args[i + 1] : FICHIER_PAR_DEFAUT
	};
}

async function main() {
	const { appliquer, fichier } = lireArguments();
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle) throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants');
	const supabase = createClient<Database>(url, cle);

	const lu = ReponsesSchema.safeParse(JSON.parse(readFileSync(fichier, 'utf8')));
	if (!lu.success) throw new Error(`Réponses illisibles (${fichier}) : ${lu.error.message}`);
	const reponses = lu.data;
	const ids = reponses.map((r) => r.id);

	console.log(
		`Base : ${new URL(url).host} · ${reponses.length} réponses · ${appliquer ? 'ÉCRITURE' : 'simulation'}\n`
	);

	const { data: lignes, error: e1 } = await supabase
		.from('worksheets')
		.select('id, title, type, category, custom_title')
		.in('id', ids);
	if (e1) throw e1;
	const { data: classees, error: e2 } = await supabase
		.from('worksheet_classifications')
		.select('worksheet_id')
		.in('worksheet_id', ids);
	if (e2) throw e2;
	const nombre = new Map<string, number>();
	for (const c of classees) nombre.set(c.worksheet_id, (nombre.get(c.worksheet_id) ?? 0) + 1);
	const fiches = new Map<string, FicheEnBase>(
		lignes.map((l) => [l.id, { ...l, nombreNotions: nombre.get(l.id) ?? 0 }])
	);

	const idsNoeuds = [...new Set(reponses.flatMap((r) => r.notions))];
	const { data: lus, error: e3 } = await supabase
		.from('classification_nodes')
		.select('id, name, kind, archived_at')
		.in('id', idsNoeuds);
	if (e3) throw e3;
	// Branche de chaque notion, lue dans l'arbre comme le fait l'éditeur (ADR 0041, 2026-11-20)
	const branches = await loadBranches(supabase, idsNoeuds);
	const noeuds = new Map<string, NoeudConnu>(
		lus.map((n) => [
			n.id,
			{
				name: n.name,
				kind: n.kind,
				archived: n.archived_at !== null,
				branch: branches.get(n.id) ?? null
			}
		])
	);

	let ecrites = 0;
	let sautees = 0;
	let echecs = 0;
	for (const reponse of reponses) {
		const plan = planFiche(reponse, fiches.get(reponse.id), noeuds);
		if (plan.action === 'sauter') {
			sautees++;
			console.log(`⏭  ${reponse.titreActuel} — sautée : ${plan.raison}`);
			continue;
		}
		const { avant, apres } = plan;
		const noms = apres.notions.map((id) => noeuds.get(id)?.name).join(' · ') || '(aucune)';
		console.log(`•  ${avant.title}`);
		if (apres.type !== avant.type) console.log(`     type : ${avant.type} → ${apres.type}`);
		console.log(`     catégorie : ${apres.category ?? '(aucune)'} · notions : ${noms}`);
		if (apres.title !== avant.title)
			console.log(`     titre : « ${avant.title} » → « ${apres.title} » (composé)`);
		// Branche introuvable : le titre retombe sur les notions, sans erreur
		if (apres.notions.length > 1 && apres.notions.some((id) => !noeuds.get(id)?.branch))
			console.warn('     ⚠️ branche introuvable pour une notion : titre composé des notions');
		if (!appliquer) continue;

		// Notions d'abord : une fiche à moitié écrite n'a jamais un titre composé sans notions.
		// RLS contournée (clé de service) mais .select() quand même : lignes comptées
		if (apres.notions.length > 0) {
			const { data: ins, error: e5 } = await supabase
				.from('worksheet_classifications')
				.insert(
					apres.notions.map((node_id, position) => ({ worksheet_id: plan.id, node_id, position }))
				)
				.select('node_id');
			if (e5 || ins.length !== apres.notions.length) {
				echecs++;
				console.error(
					`     ❌ notions non écrites, fiche inchangée : ${e5?.message ?? 'lignes manquantes'}`
				);
				continue;
			}
		}
		// Seulement si la fiche est encore telle qu'au relevé : un prof qui l'a reprise
		// entre la lecture et l'écriture garde son choix (zéro ligne = échec visible)
		const { data: maj, error: e4 } = await supabase
			.from('worksheets')
			.update({
				type: apres.type,
				category: apres.category,
				custom_title: apres.custom_title,
				title: apres.title
			})
			.eq('id', plan.id)
			.eq('title', avant.title)
			.is('category', null)
			.select('id');
		if (e4 || maj.length !== 1) {
			echecs++;
			console.error(
				`     ❌ fiche écrite à moitié (notions posées, titre et catégorie non), à finir dans l’éditeur : ${e4?.message ?? 'fiche modifiée entre-temps'}`
			);
			continue;
		}
		ecrites++;
	}

	console.log(
		`\n${appliquer ? `${ecrites} écrites` : `${reponses.length - sautees} à écrire`} · ${sautees} sautées${appliquer ? ` · ${echecs} échecs` : ''}`
	);
	if (!appliquer)
		console.log('Simulation : rien n’a été écrit. Relancer avec --appliquer pour écrire.');
	if (echecs > 0) process.exitCode = 1;
}

main().catch((erreur: unknown) => {
	console.error(erreur);
	process.exit(1);
});
