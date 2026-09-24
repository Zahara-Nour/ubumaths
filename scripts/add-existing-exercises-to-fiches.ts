#!/usr/bin/env tsx

/**
 * Ajouter les exercices EXISTANTS aux fiches créées les 23-24/09/2026
 * ===================================================================
 *
 * Décision de David (2026-09-24) : les fiches doivent être les plus complètes
 * possibles, donc inclure ses exercices existants sur le même thème, et non
 * les éviter. Chaque exercice est placé juste après l'exercice le plus proche
 * (fiches techniques) ou à la fin de la section indiquée (fiches d'application).
 *
 * Écarté volontairement : « Optimisation du coût de fabrication d'une boîte »
 * (x² + 40/x, étude par dérivée : pas du second degré).
 *
 * Garde-fous : base = prod ; fiches en brouillon uniquement ; exercice absent
 * de la fiche ; schéma Zod de la route POST …/exercises ; positions réécrites
 * en 3 passes (index unique fiche+section+position) ; en cas d'échec, positions
 * d'origine restaurées et lignes ajoutées supprimées.
 *
 * Usage :
 *   pnpm tsx scripts/add-existing-exercises-to-fiches.ts            # simulation
 *   pnpm tsx scripts/add-existing-exercises-to-fiches.ts --publier  # écrit en prod
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { validateCreateWorksheetExercise } from '$lib/server/validation/worksheets';
import type { Database } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');

type Ajout = { apres?: string; finDeSection?: string; ids: string[] };
type Plan = { fiche: string; nom: string; ajouts: Ajout[] };

const PLANS: Plan[] = [
	{
		fiche: 'b5ca9ed3-6d42-4bf4-b670-16ee864bb217',
		nom: 'Entraînement technique — Polynômes du second degré',
		ajouts: [
			// après « Passer d'une forme à une autre »
			{
				apres: 'ec591bf4-d99a-46c7-871e-7dcea1de6108',
				ids: [
					'a0f89381-a917-4278-958d-d4e37b8d7786',
					'b56339cb-929a-4846-9c8c-b2a9e320db26',
					'1f4a40e9-8c9d-4052-93f5-af2219f37a31'
				]
			},
			// après « Calculer un discriminant »
			{
				apres: '2fc02476-8006-4668-8dec-e0def88db7c5',
				ids: ['70a3c517-99c8-4bd2-9e74-ccaf918a7d0d', '2aab2af6-67c6-4261-ae96-7b573b980d5a']
			},
			// après « Résoudre des équations »
			{
				apres: '7b18366a-c627-4b99-98cf-01079685a2de',
				ids: [
					'2afe76dc-9f94-4570-ba23-dcf01e669357',
					'ca850c8e-e56e-4d42-8ae5-d19984066411',
					'dde5a2ba-39cc-4960-a643-a54f83342222'
				]
			},
			// après « Résoudre des inéquations »
			{
				apres: '550deff7-e22d-4016-906b-159733132082',
				ids: ['3471288c-c500-4ea9-9b33-f18e4287298a', '67eebdee-fdf9-4c12-9b59-c59ce7e1dc25']
			},
			// après « Déterminer la forme canonique »
			{
				apres: '8ab20683-a86f-46ee-a3af-b530572520cd',
				ids: [
					'f70214d6-7587-4105-aac0-831cd3644670',
					'143a4b98-5718-4ce4-a370-2cad71e456c4',
					'553b1408-ee55-436f-ae6b-ef7d11ce180d',
					'8f8f151d-5f7c-4557-b6eb-fc87dd5bb6c6',
					'f2f808b5-b0ca-4b21-b11c-a05f82a834c6',
					'5b2ac4dd-c499-4655-9ab4-5695261d62b8'
				]
			},
			// après « Extremum et variations »
			{
				apres: 'cfba77e1-a9f6-40fa-989b-727fcd63a949',
				ids: [
					'730969d2-a464-4a4a-b7aa-08421934a315',
					'dd4f11e8-4884-4bf0-936c-dcbc7f745531',
					'1f1924bc-5f9a-4636-8d4d-766d767201fa'
				]
			},
			// après « Retrouver un trinôme »
			{
				apres: 'a10faa1d-74a3-4639-92e1-e632d36ae84a',
				ids: [
					'ea25edae-4fda-48d1-a9ac-27edf301a857',
					'239df764-9783-485c-8e11-6071daf25406',
					'bb063fda-bd7a-4273-bc36-f254ddb60b51',
					'32284397-38f2-41e3-b5e4-1eda6ca72e48',
					'8c91826a-5fb3-4df3-976e-aaeec63101f3',
					'1161474b-1571-40b0-8fd5-785ea34eef4d'
				]
			}
		]
	},
	{
		fiche: 'ad1083a2-de02-4eb4-92e9-8515714b2d80',
		nom: 'Entraînement technique — Fonction exponentielle',
		ajouts: [
			{
				apres: '446705e7-ce1c-46eb-8278-467c800eef42',
				ids: ['eeea0e05-7dfd-41af-9103-34594367a193']
			}, // Simplification d'exponentielle
			{
				apres: 'de5d01c1-55a0-4089-b07f-8ad0779cb350',
				ids: ['36339309-7225-4be7-9be1-d18a6fbab57f']
			}, // Résolution d'équation…
			{
				apres: 'd212f289-1a6b-4c77-aea8-27147c074a42',
				ids: ['34adbec7-6c23-4003-a178-cd15ee3bacc5']
			}, // Résolution d'inéquations…
			{
				apres: 'd02ec7c5-5560-41ad-af81-4665a26f4477',
				ids: ['5ba72e43-2fd8-4075-b80d-d99325ed86f2']
			} // Dérivée avec exponentielle
		]
	},
	{
		fiche: '18f2252a-bc0b-4d4b-884b-fbde69c38871',
		nom: 'Applications de la fonction exponentielle',
		ajouts: [
			{
				finDeSection: 'Exploiter un modèle exponentiel',
				ids: ['22922f4f-db4e-413a-8d7e-e3f51b78ca5b', 'b35c6751-449c-46df-9814-af2693769eda']
			},
			{
				finDeSection: 'Recherche',
				ids: [
					'9d38f891-96ff-4938-b07a-9dbc21bd3125',
					'859045d6-e567-4294-94c2-6999ea6bea18',
					'94ab6221-799a-4099-a5c7-66e4a600ac80',
					'47730c10-fad8-4b5e-956c-f1ddb54f496e',
					'cd9e0bc7-6be8-4d12-9659-a681f563e162'
				]
			}
		]
	},
	{
		fiche: '2d043bf5-c148-4532-87b8-92ab1814b5bb',
		nom: 'Applications des suites',
		ajouts: [
			{
				finDeSection: 'Exploiter un modèle de suite',
				ids: ['ad62872f-3dbe-4544-a079-12bf94ba171e']
			},
			{ finDeSection: 'Recherche', ids: ['cd9e0bc7-6be8-4d12-9659-a681f563e162'] }
		]
	}
];

type Ligne = { id: string; exercise_id: string; section_id: string | null; position: number };
const cle = (s: string | null) => s ?? '∅';

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD)) throw new Error(`Base inattendue : ${url}`);
	const supabase = createClient<Database>(url, key);
	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	for (const plan of PLANS) {
		const { data: fiche, error: e0 } = await supabase
			.from('worksheets')
			.select('id, title, status')
			.eq('id', plan.fiche)
			.single();
		if (e0 || !fiche) throw new Error(`${plan.nom} : fiche introuvable`);
		if (fiche.status !== 'draft')
			throw new Error(`${fiche.title} : statut « ${fiche.status} », seul un brouillon se modifie`);

		const { data: lignes, error: e1 } = await supabase
			.from('worksheet_exercises')
			.select('id, exercise_id, section_id, position')
			.eq('worksheet_id', plan.fiche);
		const { data: sections, error: e2 } = await supabase
			.from('worksheet_sections')
			.select('id, title')
			.eq('worksheet_id', plan.fiche);
		if (e1 || e2 || !lignes || !sections) throw new Error(`${plan.nom} : lecture impossible`);

		// Ordre courant par section, puis insertions
		const parSection = new Map<string, string[]>();
		for (const l of [...lignes].sort((a, b) => a.position - b.position)) {
			const k = cle(l.section_id);
			parSection.set(k, [...(parSection.get(k) ?? []), l.exercise_id]);
		}
		const sectionDe = new Map<string, string | null>();
		const nouveaux: string[] = [];
		for (const a of plan.ajouts) {
			for (const id of a.ids) {
				if (lignes.some((l) => l.exercise_id === id))
					throw new Error(`${plan.nom} : ${id} y figure déjà`);
			}
			const { data: exos, error: e3 } = await supabase
				.from('exercises')
				.select('id, title')
				.in('id', a.ids);
			if (e3 || exos?.length !== a.ids.length)
				throw new Error(`${plan.nom} : exercices introuvables parmi ${a.ids.join(', ')}`);

			let section: string | null;
			let liste: string[];
			if (a.apres) {
				const ancre = lignes.find((l) => l.exercise_id === a.apres);
				if (!ancre) throw new Error(`${plan.nom} : ancre ${a.apres} absente de la fiche`);
				section = ancre.section_id;
				liste = parSection.get(cle(section))!;
				liste.splice(liste.indexOf(a.apres) + 1, 0, ...a.ids);
			} else {
				const s = sections.find((x) => x.title === a.finDeSection);
				if (!s) throw new Error(`${plan.nom} : section « ${a.finDeSection} » absente`);
				section = s.id;
				liste = parSection.get(s.id) ?? [];
				liste.push(...a.ids);
				parSection.set(s.id, liste);
			}
			for (const id of a.ids) {
				sectionDe.set(id, section);
				nouveaux.push(id);
				const v = validateCreateWorksheetExercise({
					exercise_id: id,
					section_id: section ?? undefined,
					position: liste.indexOf(id) + 1,
					variant_mode: 'none'
				});
				if (!v.success)
					throw new Error(`${plan.nom} : Zod refuse ${id} — ${v.error.issues[0].message}`);
			}
			console.log(`  ✓ ${plan.nom} : + ${exos.map((e) => e.title).join(', ')}`);
		}

		if (!PUBLIER) continue;

		// --- Écriture en 3 passes, avec retour arrière -----------------------
		const origine: Ligne[] = lignes.map((l) => ({ ...l }));
		const inseres: string[] = [];
		try {
			// 1. positions temporaires pour les lignes existantes
			for (const [i, l] of lignes.entries()) {
				const { data, error } = await supabase
					.from('worksheet_exercises')
					.update({ position: 500 + i })
					.eq('id', l.id)
					.select('id');
				if (error || data?.length !== 1)
					throw new Error(`position temporaire refusée : ${error?.message ?? '0 ligne'}`);
			}
			// 2. insertion des nouvelles lignes, elles aussi en positions temporaires
			for (const [i, id] of nouveaux.entries()) {
				const { data, error } = await supabase
					.from('worksheet_exercises')
					.insert({
						worksheet_id: plan.fiche,
						exercise_id: id,
						section_id: sectionDe.get(id) ?? null,
						position: 800 + i,
						points: null,
						variant_mode: 'none',
						variant_config: {},
						custom_instructions: null,
						translations: null
					})
					.select('id')
					.single();
				if (error || !data)
					throw new Error(`insertion refusée (${id}) : ${error?.message ?? 'aucune ligne'}`);
				inseres.push(data.id);
			}
			// 3. positions finales
			const { data: toutes, error: e4 } = await supabase
				.from('worksheet_exercises')
				.select('id, exercise_id, section_id')
				.eq('worksheet_id', plan.fiche);
			if (e4 || !toutes) throw new Error('relecture impossible');
			for (const [k, liste] of parSection) {
				for (const [i, exId] of liste.entries()) {
					const ligne = toutes.find((t) => t.exercise_id === exId && cle(t.section_id) === k);
					if (!ligne) throw new Error(`ligne introuvable pour ${exId}`);
					const { data, error } = await supabase
						.from('worksheet_exercises')
						.update({ position: i + 1 })
						.eq('id', ligne.id)
						.select('id');
					if (error || data?.length !== 1)
						throw new Error(`position finale refusée : ${error?.message ?? '0 ligne'}`);
				}
			}
			console.log(
				`  ✍️  ${plan.nom} : ${nouveaux.length} exercice(s) ajouté(s), positions renumérotées`
			);
		} catch (err) {
			if (inseres.length) await supabase.from('worksheet_exercises').delete().in('id', inseres);
			for (const [i, l] of origine.entries())
				await supabase
					.from('worksheet_exercises')
					.update({ position: 900 + i })
					.eq('id', l.id);
			for (const l of origine)
				await supabase.from('worksheet_exercises').update({ position: l.position }).eq('id', l.id);
			throw new Error(
				`${plan.nom} : ${err instanceof Error ? err.message : String(err)} — fiche restaurée`
			);
		}
	}
	console.log(
		PUBLIER ? '\n✅ Terminé.' : '\n🔍 Simulation : rien n’a été écrit. Relancer avec --publier.'
	);
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
