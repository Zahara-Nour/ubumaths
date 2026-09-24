#!/usr/bin/env tsx

/**
 * Fiche « Entraînement technique — Polynômes du second degré » (1ʳᵉ spé)
 * =====================================================================
 *
 * Rassemble les 13 exercices créés par create-exercices-technique-second-degre.ts
 * dans une fiche BROUILLON, dans l'ordre du .tex. Même configuration que la fiche
 * « Applications des fonctions polynôme du second degré » de David (modèle
 * « Fiche élève », 1_SPE, sans nom ni date).
 *
 * Reproduit les deux insertions des routes POST /api/worksheets et
 * POST /api/worksheets/[id]/exercises, avec leurs schémas Zod.
 *
 * Garde-fous : base = prod ; les 13 exercices existent ; aucune fiche du même
 * titre (idempotent) ; chaque insertion doit rendre sa ligne ; en cas d'échec
 * après la création de la fiche, elle est supprimée (pas de fiche à moitié remplie).
 *
 * Usage :
 *   pnpm tsx scripts/create-fiche-technique-second-degre.ts            # simulation
 *   pnpm tsx scripts/create-fiche-technique-second-degre.ts --publier  # écrit en prod
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import {
	validateCreateWorksheet,
	validateCreateWorksheetExercise
} from '$lib/server/validation/worksheets';
import type { Database } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const DAVID = '97c1d5e4-5fa0-44ce-be83-ed5467f3a424';
const ECOLE = '05668b78-e4d2-4d85-85b6-183e75d24204';
const MODELE_FICHE_ELEVE = '00000000-0000-4000-8000-000000000012';
const TITRE = 'Entraînement technique — Polynômes du second degré';

/** Les 13 exercices, dans l'ordre du .tex. */
const EXERCICES = [
	'870701ff-2f8b-47fa-9987-711e0e8c4ded',
	'ec591bf4-d99a-46c7-871e-7dcea1de6108',
	'2fc02476-8006-4668-8dec-e0def88db7c5',
	'7b18366a-c627-4b99-98cf-01079685a2de',
	'13a27a9a-25b2-452c-85fe-0d2e605a3d34',
	'fc86df6e-c5cb-4aca-8b02-732ff4ce5955',
	'550deff7-e22d-4016-906b-159733132082',
	'8ab20683-a86f-46ee-a3af-b530572520cd',
	'cfba77e1-a9f6-40fa-989b-727fcd63a949',
	'a6c50f8c-c3c6-444a-88e9-7bdc0fa2a076',
	'a10faa1d-74a3-4639-92e1-e632d36ae84a',
	'faa2a6f8-877d-446e-9049-8c6af9839f86',
	'53026bc7-d9af-40da-848c-f0adaf84a6aa'
];

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD))
		throw new Error(`Base inattendue : ${url} (attendu : ${PROJET_PROD})`);
	const supabase = createClient<Database>(url, cle);
	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	const { data: existante, error: e1 } = await supabase
		.from('worksheets')
		.select('id')
		.eq('title', TITRE);
	if (e1) throw new Error(`Lecture des fiches impossible : ${e1.message}`);
	if (existante && existante.length > 0)
		throw new Error(`Une fiche « ${TITRE} » existe déjà (${existante[0].id})`);

	const { data: exos, error: e2 } = await supabase
		.from('exercises')
		.select('id, title')
		.in('id', EXERCICES);
	if (e2) throw new Error(`Lecture des exercices impossible : ${e2.message}`);
	if (exos?.length !== EXERCICES.length)
		throw new Error(`${exos?.length ?? 0} exercices trouvés sur ${EXERCICES.length}`);

	const fiche = validateCreateWorksheet({
		title: TITRE,
		description:
			'Rédiger les calculs et justifier les réponses sur une copie. Donner les valeurs exactes. Présenter les études de signe et de variations dans des tableaux et les ensembles de solutions avec une notation adaptée.',
		translations: {
			en: {
				title: 'Technical practice — Quadratic polynomials',
				description:
					'Show your working and justify your answers on paper. Give exact values. Present sign and variation studies in tables, and solution sets with suitable notation.'
			}
		},
		type: 'worksheet',
		config: {
			language: 'fr',
			show_date: false,
			show_class: false,
			show_title: true,
			page_layout: 'A4',
			show_points: false,
			numbering_style: 'numeric',
			show_student_name: false,
			shuffle_exercises: false,
			shuffle_within_sections: false
		},
		template_id: MODELE_FICHE_ELEVE,
		grades: ['1_SPE']
	});
	if (!fiche.success) throw new Error(`Zod refuse la fiche : ${fiche.error.issues[0].message}`);

	const lignes = EXERCICES.map((exercise_id, i) => {
		const v = validateCreateWorksheetExercise({
			exercise_id,
			position: i + 1,
			variant_mode: 'none'
		});
		if (!v.success)
			throw new Error(`Zod refuse l'exercice ${i + 1} : ${v.error.issues[0].message}`);
		return v.data;
	});
	EXERCICES.forEach((id, i) =>
		console.log(`  ✓ ${i + 1}. ${exos.find((e) => e.id === id)?.title}`)
	);

	if (!PUBLIER) {
		console.log('\n🔍 Simulation : rien n’a été écrit. Relancer avec --publier.');
		return;
	}

	const d = fiche.data;
	const { data: creee, error: e3 } = await supabase
		.from('worksheets')
		.insert({
			title: d.title,
			description: d.description ?? null,
			type: d.type,
			config: d.config ?? {},
			translations: d.translations ?? null,
			status: 'draft',
			version: 1,
			template_id: d.template_id ?? null,
			grades: d.grades ?? [],
			created_by: DAVID,
			school_id: ECOLE
		})
		.select('id')
		.single();
	if (e3 || !creee)
		throw new Error(`Création de la fiche refusée : ${e3?.message ?? 'aucune ligne rendue'}`);
	console.log(`\n  ✍️  Fiche ${creee.id}`);

	const { data: ajoutes, error: e4 } = await supabase
		.from('worksheet_exercises')
		.insert(
			lignes.map((l) => ({
				worksheet_id: creee.id,
				exercise_id: l.exercise_id,
				section_id: null,
				position: l.position,
				points: null,
				variant_mode: l.variant_mode ?? 'none',
				variant_config: {},
				custom_instructions: null,
				translations: null
			}))
		)
		.select('id');
	if (e4 || ajoutes?.length !== EXERCICES.length) {
		// Pas de fiche à moitié remplie
		await supabase.from('worksheets').delete().eq('id', creee.id);
		throw new Error(
			`Ajout des exercices refusé (${ajoutes?.length ?? 0}/${EXERCICES.length}) : ${e4?.message ?? ''} — fiche supprimée`
		);
	}
	console.log(`  ✍️  ${ajoutes.length} exercices ajoutés\n\n✅ Fiche créée (brouillon).`);
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
