#!/usr/bin/env tsx

/**
 * Variables aléatoires, 1ʳᵉ spé : réponses des 29 exercices (2026-10-13)
 * =====================================================================
 *
 * Remplit le champ « Réponses » (`answers_md`, et `translations.en.answers_md`)
 * de chaque variation des exercices des deux fiches de variables aléatoires
 * (`0ef45afb`, `d720d039`), pour le PDF « Réponses ». Rien d'autre n'est touché.
 *
 * Contenu vérifié avant écriture : chaque nombre des réponses figure dans le
 * corrigé de la même variation, en FR comme en EN (`verif.py` du dossier de
 * rédaction) ; rendu écran (`pnpm check:ubumark`) et PDF (compilateur de prod).
 *
 * Garde-fous : base = prod ; chaque exercice retrouvé par id ET titre, dans le
 * thème ; les variations du fichier = celles en base (mêmes labels) ; aucune
 * réponse déjà présente (pas d'écrasement) ; tout validé par Zod AVANT la
 * moindre écriture ; chaque écriture doit rendre sa ligne ; en cas d'échec,
 * les exercices déjà écrits retrouvent leurs variations d'avant.
 *
 * Usage :
 *   pnpm tsx scripts/reponses-variables-aleatoires-1spe.ts            # simulation
 *   pnpm tsx scripts/reponses-variables-aleatoires-1spe.ts --publier  # écrit en prod
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { updateExerciseSchema } from '$lib/server/validation/exercises';
import type { Database, Json } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const TOPIC = 'Variables aléatoires';
const DIR =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/f2116999-53aa-43b1-b92b-02d696355328/scratchpad/reponses/out';

type Fichier = {
	id: string;
	title: string;
	variations: Record<string, { fr: string; en: string }>;
};

type Variation = {
	label: string;
	answers_md?: string;
	translations?: { en?: { answers_md?: string; [cle: string]: unknown } };
	[cle: string]: unknown;
};

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD))
		throw new Error(`Base inattendue : ${url} (attendu : ${PROJET_PROD})`);
	const supabase = createClient<Database>(url, cle);
	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	const fichiers = readdirSync(DIR)
		.filter((f) => f.endsWith('.json'))
		.map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Fichier);
	const { data: enBase, error } = await supabase
		.from('exercises')
		.select('id, title, topic, variations')
		.in(
			'id',
			fichiers.map((f) => f.id)
		);
	if (error) throw new Error(`Lecture impossible : ${error.message}`);

	const ecritures: { id: string; title: string; avant: Variation[]; apres: Variation[] }[] = [];
	let n = 0;
	for (const f of fichiers) {
		const ex = enBase?.find((e) => e.id === f.id);
		if (!ex) throw new Error(`« ${f.title} » : id ${f.id} introuvable`);
		if (ex.title !== f.title || ex.topic !== TOPIC)
			throw new Error(`« ${f.title} » : en base « ${ex.title} » (${ex.topic})`);
		const avant = ex.variations as unknown as Variation[];
		const labels = avant.map((v) => v.label).sort();
		if (JSON.stringify(labels) !== JSON.stringify(Object.keys(f.variations).sort()))
			throw new Error(`« ${f.title} » : variations ${labels.join(',')} en base, fichier différent`);
		const apres = avant.map((v) => {
			if (v.answers_md || v.translations?.en?.answers_md)
				throw new Error(`« ${f.title} » ${v.label} : réponses déjà présentes`);
			const r = f.variations[v.label];
			if (!r.fr.trim() || !r.en.trim()) throw new Error(`« ${f.title} » ${v.label} : réponse vide`);
			n++;
			return {
				...v,
				answers_md: r.fr.trim(),
				translations: { ...v.translations, en: { ...v.translations?.en, answers_md: r.en.trim() } }
			};
		});
		const z = updateExerciseSchema.safeParse({ variations: apres });
		if (!z.success)
			throw new Error(
				`« ${f.title} » : Zod refuse — ${z.error.issues[0].path.join('.')} ${z.error.issues[0].message}`
			);
		ecritures.push({ id: ex.id, title: ex.title, avant, apres });
	}
	console.log(
		`  ✓ ${ecritures.length} exercices, ${n} variations validées (Zod, ids, titres, labels)`
	);

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	const faits: typeof ecritures = [];
	try {
		for (const e of ecritures) {
			const { data, error: eu } = await supabase
				.from('exercises')
				.update({ variations: e.apres as unknown as Json })
				.eq('id', e.id)
				.select('id');
			if (eu || data?.length !== 1)
				throw new Error(`« ${e.title} » : ${eu?.message ?? `${data?.length ?? 0} ligne(s)`}`);
			faits.push(e);
		}
	} catch (err) {
		console.error(`\n⛔ ${(err as Error).message}\n   Retour à l'état d'avant…`);
		for (const e of faits)
			await supabase
				.from('exercises')
				.update({ variations: e.avant as unknown as Json })
				.eq('id', e.id);
		process.exit(1);
	}
	console.log(`  ✍️  ${faits.length} exercices complétés`);

	// Relecture : chaque variation porte ses réponses FR et EN
	const { data: relus, error: er } = await supabase
		.from('exercises')
		.select('id, variations')
		.in(
			'id',
			faits.map((e) => e.id)
		);
	if (er) throw new Error(`Relecture impossible : ${er.message}`);
	const manquantes = (relus ?? []).flatMap((e) =>
		(e.variations as unknown as Variation[])
			.filter((v) => !v.answers_md || !v.translations?.en?.answers_md)
			.map((v) => `${e.id} ${v.label}`)
	);
	if (manquantes.length > 0)
		throw new Error(`Relecture : réponses absentes — ${manquantes.join(', ')}`);
	console.log(
		'  ✓ Relecture : toutes les variations ont leurs réponses FR et EN\n\n✅ Réponses écrites.'
	);
}

main().catch((err) => {
	console.error(`⛔ ${(err as Error).message}`);
	process.exit(1);
});
