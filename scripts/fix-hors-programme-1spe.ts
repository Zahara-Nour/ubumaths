#!/usr/bin/env tsx

/**
 * Fiches 1re spé : exercices hors du NOUVEAU programme → « Pour aller plus loin » (2026-09-25)
 * ==========================================================================================
 *
 * Confrontation au nouveau programme de spécialité de 1re (PDF fourni par David) :
 *  - trigonométrie limitée au cercle (radian, cos/sin d'un réel, valeurs remarquables,
 *    angles associés) : plus d'équations/inéquations cos x = a, ni de fonctions sin/cos
 *    (périodicité, courbes) ;
 *  - dérivation sans x ↦ g(ax + b).
 * Décisions de David : les exercices dont le SUJET entier sort du programme passent dans
 * une section « Pour aller plus loin (terminale) » (rien n'est supprimé) ; les fiches de
 * trigonométrie sont renommées « … Trigonométrie ». Seules les fiches en BROUILLON sont
 * touchées ; les exercices partiellement hors programme restent en place (retouche des
 * questions à décider à part).
 *
 * Garde-fous : base de prod ; fiches en brouillon vérifiées, titres attendus vérifiés ;
 * chaque exercice déplacé retrouvé exactement une fois dans sa fiche ; validation Zod des
 * sections ; chaque écriture relue (`.select()`), sinon arrêt ; sauvegarde JSON avant.
 *
 * Usage :
 *   pnpm tsx scripts/fix-hors-programme-1spe.ts            # simulation
 *   pnpm tsx scripts/fix-hors-programme-1spe.ts --publier  # écrit en prod
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { validateCreateWorksheetSection } from '$lib/server/validation/worksheets';
import type { Database } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const DIR_SAUVEGARDE =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/5a4e98b0-c76d-42bf-8e8c-ee835a4273ea/scratchpad';

const PLUS_LOIN = { title: 'Pour aller plus loin (terminale)', en: 'Going further (final year)' };
const EXERCICES = { title: 'Exercices', en: 'Exercises' };

const TRIGO_TECH = '808e2eee-162a-4493-81f6-8a945c81db3c';
const TRIGO_APP = 'dde45b26-572c-4d2d-b836-195d79a09c98';
const DERIV_TECH = '139ec069-e7a3-404f-bb1e-40299c7304fb';

/** Fiches techniques (sans sections) : exercices (préfixe d'id) à déplacer. */
const TECHNIQUES: { id: string; titre: string; horsProgramme: string[] }[] = [
	{
		id: TRIGO_TECH,
		titre: 'Entraînement technique — Fonctions trigonométriques',
		// équations cos x = a, équations qui s'y ramènent, inéquations, parité et périodicité
		horsProgramme: ['85c7d783', '070c8d78', '34cec984', 'e4ea47ab']
	},
	{
		id: DERIV_TECH,
		titre: 'Entraînement technique — Dérivation',
		// dérivée de x ↦ g(ax + b)
		horsProgramme: ['4c1eea1a']
	}
];

/** Applications de trigonométrie : la section « Phénomènes périodiques » devient « Pour aller plus loin ». */
const APP_SECTION_PERIODIQUE = '2fad4033';
const APP_SECTION_RECHERCHE = '8f567f89';
const APP_COMBIEN_DE_SOLUTIONS = '274b9641';

const RENOMMAGES: { id: string; avant: string; titre: string; en: string }[] = [
	{
		id: TRIGO_TECH,
		avant: 'Entraînement technique — Fonctions trigonométriques',
		titre: 'Entraînement technique — Trigonométrie',
		en: 'Technical practice — Trigonometry'
	},
	{
		id: TRIGO_APP,
		avant: 'Applications des fonctions trigonométriques',
		titre: 'Applications de la trigonométrie',
		en: 'Trigonometry in context'
	}
];

type Supabase = ReturnType<typeof createClient<Database>>;

function verifierLignes<T>(quoi: string, data: T[] | null, error: { message: string } | null): T[] {
	if (error) throw new Error(`${quoi} : ${error.message}`);
	if (!data || data.length !== 1)
		throw new Error(`${quoi} : ${data?.length ?? 0} ligne(s), 1 attendue`);
	return data;
}

async function lireFiche(supabase: Supabase, id: string) {
	const { data: w, error } = await supabase
		.from('worksheets')
		.select('id, title, status, translations')
		.eq('id', id)
		.single();
	if (error || !w) throw new Error(`Fiche ${id} introuvable : ${error?.message}`);
	if (w.status !== 'draft')
		throw new Error(`Fiche « ${w.title} » : ${w.status}, brouillon attendu`);
	const { data: sections } = await supabase
		.from('worksheet_sections')
		.select('id, title, position')
		.eq('worksheet_id', id)
		.order('position');
	const { data: lignes } = await supabase
		.from('worksheet_exercises')
		.select('id, position, section_id, exercise_id')
		.eq('worksheet_id', id)
		.order('position');
	return { fiche: w, sections: sections ?? [], lignes: lignes ?? [] };
}

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle) throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants');
	if (!url.includes(PROJET_PROD)) throw new Error(`Base inattendue : ${url}`);
	const supabase = createClient<Database>(url, cle);
	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	for (const s of [PLUS_LOIN, EXERCICES]) {
		const v = validateCreateWorksheetSection({
			title: s.title,
			position: 1,
			translations: { en: { title: s.en } }
		});
		if (!v.success)
			throw new Error(`Section « ${s.title} » : Zod refuse — ${v.error.issues[0].message}`);
	}

	// Lecture et vérifications (rien n'est écrit avant que TOUT soit vérifié)
	const etat = new Map<string, Awaited<ReturnType<typeof lireFiche>>>();
	for (const id of [TRIGO_TECH, TRIGO_APP, DERIV_TECH]) etat.set(id, await lireFiche(supabase, id));
	const sauvegarde = join(DIR_SAUVEGARDE, `backup-hors-programme-${Date.now()}.json`);
	writeFileSync(sauvegarde, JSON.stringify([...etat.values()], null, 2));
	console.log(`💾 Sauvegarde : ${sauvegarde}\n`);

	// Rejouable : une fiche technique déjà réorganisée (sections « Exercices » puis « Pour
	// aller plus loin » contenant exactement les exercices hors programme) est sautée
	const dejaFaites = new Set<string>();
	for (const t of TECHNIQUES) {
		const { fiche, sections, lignes } = etat.get(t.id)!;
		if (
			fiche.title !== t.titre &&
			!RENOMMAGES.some((r) => r.id === t.id && r.titre === fiche.title)
		)
			throw new Error(`Fiche ${t.id} : titre « ${fiche.title} »`);
		if (sections.length > 0) {
			const plusLoin = sections.find((x) => x.title === PLUS_LOIN.title);
			const gardes = sections.find((x) => x.title === EXERCICES.title);
			const dansPlusLoin = lignes
				.filter((l) => l.section_id === plusLoin?.id)
				.map((l) => l.exercise_id.slice(0, 8));
			const conforme =
				sections.length === 2 &&
				gardes?.position === 1 &&
				plusLoin?.position === 2 &&
				dansPlusLoin.length === t.horsProgramme.length &&
				t.horsProgramme.every((p) => dansPlusLoin.includes(p)) &&
				lignes.every((l) => l.section_id === gardes?.id || l.section_id === plusLoin?.id);
			if (!conforme)
				throw new Error(`« ${fiche.title} » a déjà des sections, différentes de l'état visé`);
			dejaFaites.add(t.id);
			console.log(`  « ${fiche.title} » : déjà réorganisée, sautée`);
			continue;
		}
		for (const p of t.horsProgramme) {
			const n = lignes.filter((l) => l.exercise_id.startsWith(p)).length;
			if (n !== 1) throw new Error(`« ${fiche.title} » : exercice ${p} trouvé ${n} fois`);
		}
		console.log(
			`  « ${fiche.title} » : ${lignes.length - t.horsProgramme.length} gardés, ${t.horsProgramme.length} → « ${PLUS_LOIN.title} »`
		);
	}
	const app = etat.get(TRIGO_APP)!;
	const periodique = app.sections.find((s) => s.id.startsWith(APP_SECTION_PERIODIQUE));
	const recherche = app.sections.find((s) => s.id.startsWith(APP_SECTION_RECHERCHE));
	const combien = app.lignes.filter((l) => l.exercise_id.startsWith(APP_COMBIEN_DE_SOLUTIONS));
	if (!periodique || periodique.title !== 'Phénomènes périodiques')
		throw new Error('Section « Phénomènes périodiques » introuvable');
	if (!recherche || recherche.title !== 'Recherche')
		throw new Error('Section « Recherche » introuvable');
	if (combien.length !== 1 || combien[0].section_id !== recherche.id)
		throw new Error('« Combien de solutions ? » introuvable dans « Recherche »');
	console.log(
		`  « ${app.fiche.title} » : « Phénomènes périodiques » → « ${PLUS_LOIN.title} » (dernière), + « Combien de solutions ? »`
	);
	for (const r of RENOMMAGES) {
		const { fiche } = etat.get(r.id)!;
		if (fiche.title !== r.avant)
			throw new Error(`Fiche ${r.id} : titre « ${fiche.title} », attendu « ${r.avant} »`);
		console.log(`  Renommage : « ${r.avant} » → « ${r.titre} »`);
	}

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	const creerSection = async (
		worksheetId: string,
		s: { title: string; en: string },
		position: number
	) => {
		const { data, error } = await supabase
			.from('worksheet_sections')
			.insert({
				worksheet_id: worksheetId,
				title: s.title,
				instructions: null,
				translations: { en: { title: s.en } },
				position
			})
			.select('id');
		return verifierLignes(`Section « ${s.title} »`, data, error)[0].id;
	};
	const placer = async (ligneId: string, sectionId: string, position: number) => {
		const { data, error } = await supabase
			.from('worksheet_exercises')
			.update({ section_id: sectionId, position })
			.eq('id', ligneId)
			.select('id');
		verifierLignes(`Exercice de fiche ${ligneId}`, data, error);
	};

	// Fiches techniques : « Exercices » puis « Pour aller plus loin (terminale) »
	for (const t of TECHNIQUES) {
		if (dejaFaites.has(t.id)) continue;
		const { lignes } = etat.get(t.id)!;
		const sectionGardes = await creerSection(t.id, EXERCICES, 1);
		const sectionPlusLoin = await creerSection(t.id, PLUS_LOIN, 2);
		let g = 0;
		let h = 0;
		for (const l of lignes) {
			const hors = t.horsProgramme.some((p) => l.exercise_id.startsWith(p));
			if (hors) await placer(l.id, sectionPlusLoin, ++h);
			else await placer(l.id, sectionGardes, ++g);
		}
		console.log(`  ✅ ${t.titre} : ${g} + ${h}`);
	}

	// Applications de trigonométrie : section renommée et placée en dernier ; Recherche avant
	{
		const { data: d1, error: e1 } = await supabase
			.from('worksheet_sections')
			.update({
				title: PLUS_LOIN.title,
				translations: { en: { title: PLUS_LOIN.en } },
				position: 99
			})
			.eq('id', periodique.id)
			.select('id');
		verifierLignes('Section « Phénomènes périodiques »', d1, e1);
		const { data: d2, error: e2 } = await supabase
			.from('worksheet_sections')
			.update({ position: 2 })
			.eq('id', recherche.id)
			.select('id');
		verifierLignes('Section « Recherche »', d2, e2);
		// Contrainte d'unicité (fiche, position) : 3 n'est libre qu'une fois « Recherche » en 2
		const { data: d3, error: e3 } = await supabase
			.from('worksheet_sections')
			.update({ position: 3 })
			.eq('id', periodique.id)
			.select('id');
		verifierLignes('Section « Pour aller plus loin » en dernier', d3, e3);
		const dejaDansPlusLoin = app.lignes.filter((l) => l.section_id === periodique.id).length;
		await placer(combien[0].id, periodique.id, dejaDansPlusLoin + 1);
		// Renumérote la section Recherche sans « Combien de solutions ? »
		let r = 0;
		for (const l of app.lignes.filter(
			(x) => x.section_id === recherche.id && x.id !== combien[0].id
		)) {
			await placer(l.id, recherche.id, ++r);
		}
		console.log(`  ✅ ${app.fiche.title} : section « ${PLUS_LOIN.title} » en dernier`);
	}

	for (const r of RENOMMAGES) {
		const { fiche } = etat.get(r.id)!;
		const translations = {
			...(fiche.translations as Record<string, unknown>),
			en: { ...(fiche.translations as { en?: Record<string, unknown> })?.en, title: r.en }
		};
		const { data, error } = await supabase
			.from('worksheets')
			.update({ title: r.titre, translations })
			.eq('id', r.id)
			.select('id, title');
		const [lu] = verifierLignes(`Renommage ${r.id}`, data, error);
		if (lu.title !== r.titre) throw new Error(`Renommage ${r.id} : titre relu « ${lu.title} »`);
		console.log(`  ✅ « ${r.titre} »`);
	}
	console.log('\n✅ Terminé.');
}

main().catch((e: unknown) => {
	console.error('❌', e instanceof Error ? e.message : e);
	process.exit(1);
});
