#!/usr/bin/env tsx

/**
 * Loi binomiale T_COMP : « Les crêpes au plafond », retouches demandées par David (2026-10-16)
 * ===========================================================================================
 *
 * Après add-crepes-loi-binomiale-tcomp.ts :
 *  - partie B renommée « La fournée de Mme Bougouin » (« Mrs Bougouin's batch »),
 *    dans l'énoncé et le corrigé de la variante guidée ;
 *  - nouvelle section 5 « Synthèse et approfondissement » dans la fiche
 *    « Applications de la loi binomiale », où l'exercice est déplacé (seul,
 *    position 1) ; la section 3 garde le QCM et la kermesse.
 *
 * Garde-fous : base = prod ; le texte en base doit contenir chaque ancien titre
 * une fois exactement, et le texte corrigé doit être identique aux fichiers
 * sources ; section validée (Zod) et absente avant écriture ; chaque écriture
 * doit rendre sa ligne ; en cas d'échec, tout est remis dans l'état d'avant.
 *
 * Usage :
 *   pnpm tsx scripts/update-crepes-loi-binomiale-tcomp.ts            # simulation
 *   pnpm tsx scripts/update-crepes-loi-binomiale-tcomp.ts --publier  # écrit en prod
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { validateCreateWorksheetSection } from '$lib/server/validation/worksheets';
import type { Database, Json } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const EXERCICE = '7a0865c0-f194-4951-98d2-7ec6beb740b3';
const FICHE = '19848611-5005-43a4-8de1-898444349b00';
const SECTION = {
	title: 'Synthèse et approfondissement',
	position: 5,
	translations: { en: { title: 'Synthesis and going further' } }
};
const RENOMMAGES: [string, string][] = [
	['Partie B — Le défi de Mme Bougouin', 'Partie B — La fournée de Mme Bougouin'],
	["Part B — Mrs Bougouin's challenge", "Part B — Mrs Bougouin's batch"]
];

const DIR =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/a45cd49e-4aa3-4c9d-9ad7-865c51e67149/scratchpad/crepes';

const lire = (p: string) => readFileSync(p, 'utf8').trim();

type Variation = {
	label: string;
	statement_md: string;
	solution_md: string;
	translations: { en: { statement_md: string; solution_md: string } };
};

/** Remplace chaque ancien titre présent ; rend le texte et le nombre de remplacements */
function renommer(texte: string): [string, number] {
	let n = 0;
	for (const [avant, apres] of RENOMMAGES) {
		const k = texte.split(avant).length - 1;
		n += k;
		texte = texte.replaceAll(avant, apres);
	}
	return [texte, n];
}

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD))
		throw new Error(`Base inattendue : ${url} (attendu : ${PROJET_PROD})`);
	const supabase = createClient<Database>(url, cle);
	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	// --- Phase 1a : le texte de l'exercice -----------------------------------
	const { data: ex, error: e0 } = await supabase
		.from('exercises')
		.select('title, variations')
		.eq('id', EXERCICE)
		.single();
	if (e0 || !ex) throw new Error(`Exercice introuvable : ${e0?.message ?? 'aucune ligne'}`);
	if (ex.title !== 'Les crêpes au plafond') throw new Error(`Exercice inattendu : ${ex.title}`);
	const anciennes = ex.variations as unknown as Variation[];
	const nouvelles = structuredClone(anciennes);
	const guidee = nouvelles.find((v) => v.label === 'guided');
	if (!guidee) throw new Error('Variante guidée absente');
	const champs: [string, () => string, (t: string) => void, string][] = [
		['énoncé FR', () => guidee.statement_md, (t) => (guidee.statement_md = t), 'md'],
		['corrigé FR', () => guidee.solution_md, (t) => (guidee.solution_md = t), 'sol'],
		[
			'énoncé EN',
			() => guidee.translations.en.statement_md,
			(t) => (guidee.translations.en.statement_md = t),
			'en'
		],
		[
			'corrigé EN',
			() => guidee.translations.en.solution_md,
			(t) => (guidee.translations.en.solution_md = t),
			'sol-en'
		]
	];
	for (const [nom, get, set, dossier] of champs) {
		const [texte, n] = renommer(get());
		if (n !== 1) throw new Error(`${nom} : ${n} titre(s) à renommer, 1 attendu`);
		if (texte !== lire(join(DIR, dossier, 'CREPES-guided.md')))
			throw new Error(`${nom} : le texte corrigé diffère du fichier source`);
		set(texte);
	}
	console.log(
		'  ✓ Partie B renommée dans les 4 textes de la variante guidée, identiques aux sources'
	);

	// --- Phase 1b : la section et la ligne de fiche --------------------------
	const vs = validateCreateWorksheetSection(SECTION);
	if (!vs.success) throw new Error(`Section refusée par Zod : ${vs.error.issues[0].message}`);
	const { data: sections, error: e1 } = await supabase
		.from('worksheet_sections')
		.select('title, position')
		.eq('worksheet_id', FICHE);
	if (e1) throw new Error(`Lecture des sections impossible : ${e1.message}`);
	if (sections.some((s) => s.title === SECTION.title || s.position === SECTION.position))
		throw new Error(`Section « ${SECTION.title} » ou position ${SECTION.position} déjà prise`);
	if (Math.max(...sections.map((s) => s.position)) !== SECTION.position - 1)
		throw new Error(`La fiche n'a pas ${SECTION.position - 1} sections`);
	const { data: lignes, error: e2 } = await supabase
		.from('worksheet_exercises')
		.select('id, section_id, position')
		.eq('worksheet_id', FICHE)
		.eq('exercise_id', EXERCICE);
	if (e2) throw new Error(`Lecture de la fiche impossible : ${e2.message}`);
	if (lignes.length !== 1)
		throw new Error(`Exercice ${lignes.length} fois dans la fiche, 1 attendu`);
	const ligne = lignes[0];
	console.log(
		`  ✓ Section « ${SECTION.title} » à créer en position ${SECTION.position} ; exercice à y déplacer (aujourd'hui position ${ligne.position} de sa section)`
	);

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	// --- Phase 2 : écrire, en gardant trace pour tout défaire ----------------
	let texteModifie = false;
	let sectionCreee: string | null = null;
	let ligneDeplacee = false;
	try {
		const { data: m1, error: w1 } = await supabase
			.from('exercises')
			.update({ variations: nouvelles as unknown as Json })
			.eq('id', EXERCICE)
			.select('id');
		if (w1 || m1?.length !== 1) throw new Error(`Texte refusé : ${w1?.message ?? 'aucune ligne'}`);
		texteModifie = true;
		console.log('  ✍️  Partie B renommée');

		const { data: s, error: w2 } = await supabase
			.from('worksheet_sections')
			.insert({ worksheet_id: FICHE, instructions: null, ...SECTION })
			.select('id')
			.single();
		if (w2 || !s) throw new Error(`Section refusée : ${w2?.message ?? 'aucune ligne'}`);
		sectionCreee = s.id;

		const { data: m3, error: w3 } = await supabase
			.from('worksheet_exercises')
			.update({ section_id: s.id, position: 1 })
			.eq('id', ligne.id)
			.select('id');
		if (w3 || m3?.length !== 1)
			throw new Error(`Déplacement refusé : ${w3?.message ?? 'aucune ligne'}`);
		ligneDeplacee = true;
		console.log(`  ✍️  Section ${s.id} créée, exercice déplacé`);
		console.log('\n✅ Terminé.');
	} catch (err) {
		if (ligneDeplacee)
			await supabase
				.from('worksheet_exercises')
				.update({ section_id: ligne.section_id, position: ligne.position })
				.eq('id', ligne.id);
		if (sectionCreee) await supabase.from('worksheet_sections').delete().eq('id', sectionCreee);
		if (texteModifie)
			await supabase
				.from('exercises')
				.update({ variations: anciennes as unknown as Json })
				.eq('id', EXERCICE);
		throw new Error(`${err instanceof Error ? err.message : String(err)} — tout a été défait`);
	}
}

main().catch((e) => {
	console.error(`\n⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
