#!/usr/bin/env tsx

/**
 * Coquilles des exercices existants de dérivation (2026-09-24)
 * ============================================================
 *
 * 1. « Dérivée d'un quotient (4) » : la seconde liste (dérivées) repart à 1 alors
 *    qu'elle reprend les fonctions de la première → numérotée 3 et 4, énoncé et
 *    corrigé, FR et EN.
 * 2. « Dériver et factoriser (2) » : les questions 3 et 4 donnaient des trinômes
 *    ~v'(x)~ à racines irrationnelles, contraires à la consigne « factoriser ».
 *    Choix de David : ~-14x~ → ~-18x~ (v' = 6(x-1)(x+3)) et ~+3x~ → ~+48x~
 *    (v' = 1/2(x-8)(x-12)). Corrigés réécrits, vérifiés par sympy.
 * 3. « Expressions formelles » : ~sqrt(f/g)~ n'existe que si ~f/g>0~, hypothèse
 *    absente de l'énoncé → ajoutée (le corrigé la mentionnait déjà).
 *
 * Garde-fous : base de prod vérifiée, chaque remplacement doit être trouvé le
 * nombre EXACT de fois attendu, aucune trace de l'ancienne version ne doit
 * subsister, sauvegarde JSON avant écriture, validation Zod, et relecture des
 * lignes réellement écrites (une écriture refusée rend zéro ligne, sans erreur).
 *
 * Usage :
 *   pnpm tsx scripts/fix-coquilles-derivation.ts            # simulation
 *   pnpm tsx scripts/fix-coquilles-derivation.ts --publier  # écrit en prod
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { exerciseVariationSchema } from '$lib/server/validation/exercises';
import type { Database } from '$lib/types/database';

config({ path: '.env' });

const PROJET_PROD = 'cnevnzsvixxpnurautls';
const PUBLIER = process.argv.includes('--publier');
const DIR_SAUVEGARDE =
	'/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/5a4e98b0-c76d-42bf-8e8c-ee835a4273ea/scratchpad';

const QUOTIENT_4 = '06c55f48-9517-4fde-8748-11f33dae2a6b';
const FACTORISER_2 = '6ab302da-3d6a-45a9-86b5-b5cf0538e67e';
const FORMELLES = '5f0eb1d7-b142-40af-98a4-41aca81840e8';

type Champ = 'statement_md' | 'solution_md' | 'en.statement_md' | 'en.solution_md';
type Remplacement = { de: string; vers: string; fois: number };
type Correction = {
	id: string;
	titre: string;
	champ: Champ;
	remplacements: Remplacement[];
	/** Traces de l'ancienne version qui ne doivent plus apparaître après remplacement. */
	interdits: string[];
};

const LISTE_QUOTIENT = {
	un: '1. ~f(x)={{2x+3}/{x-4}}/{{-x-2}/{x^2+x}}~\n2. ~f(x)={1/{2x}-{-x-2}/{x+2}}/{3x-1}~',
	trois: '3. ~f(x)={{2x+3}/{x-4}}/{{-x-2}/{x^2+x}}~\n4. ~f(x)={1/{2x}-{-x-2}/{x+2}}/{3x-1}~'
};

const DERIVEES_QUOTIENT: Remplacement[] = [
	{ de: '1. ~u(x)=2x^{3}+5x^{2}+3x~', vers: '3. ~u(x)=2x^{3}+5x^{2}+3x~', fois: 1 },
	{ de: '2. ~u(x)=2x+1~', vers: '4. ~u(x)=2x+1~', fois: 1 }
];

const ENONCES_FACTORISER: Remplacement[] = [
	{ de: '~f(x)={-1}/{2x^3+6x^2-14x+7}~', vers: '~f(x)={-1}/{2x^3+6x^2-18x+7}~', fois: 1 },
	{ de: '~f(x)=1/{1/6x^3-5x^2+3x-4}~', vers: '~f(x)=1/{1/6x^3-5x^2+48x-4}~', fois: 1 }
];

const INTERDITS_FACTORISER = ['14x', '5x^2+3x', '5x^{2}+3x', 'sqrt(30)', 'sqrt(94)', '480'];

const CORRECTIONS: Correction[] = [
	{
		id: QUOTIENT_4,
		titre: "Dérivée d'un quotient (4)",
		champ: 'statement_md',
		remplacements: [
			{
				de: `~f~ suivantes.\n\n${LISTE_QUOTIENT.un}`,
				vers: `~f~ suivantes.\n\n${LISTE_QUOTIENT.trois}`,
				fois: 1
			}
		],
		interdits: []
	},
	{
		id: QUOTIENT_4,
		titre: "Dérivée d'un quotient (4)",
		champ: 'en.statement_md',
		remplacements: [
			{
				de: `functions ~f~.\n\n${LISTE_QUOTIENT.un}`,
				vers: `functions ~f~.\n\n${LISTE_QUOTIENT.trois}`,
				fois: 1
			}
		],
		interdits: []
	},
	{
		id: QUOTIENT_4,
		titre: "Dérivée d'un quotient (4)",
		champ: 'solution_md',
		remplacements: DERIVEES_QUOTIENT,
		interdits: []
	},
	{
		id: QUOTIENT_4,
		titre: "Dérivée d'un quotient (4)",
		champ: 'en.solution_md',
		remplacements: DERIVEES_QUOTIENT,
		interdits: []
	},
	{
		id: FACTORISER_2,
		titre: 'Dériver et factoriser (2)',
		champ: 'statement_md',
		remplacements: ENONCES_FACTORISER,
		interdits: INTERDITS_FACTORISER
	},
	{
		id: FACTORISER_2,
		titre: 'Dériver et factoriser (2)',
		champ: 'en.statement_md',
		remplacements: ENONCES_FACTORISER,
		interdits: INTERDITS_FACTORISER
	},
	{
		id: FACTORISER_2,
		titre: 'Dériver et factoriser (2)',
		champ: 'solution_md',
		remplacements: [
			{
				de: "3. ~v(x)=2x^{3}+6x^{2}-14x+7~, ~v'(x)=6x^{2}+12x-14~ : $\\Delta=144+336=480$, racines ~{-12-sqrt(480)}/{12}=-1-{sqrt(30)}/{3}~ et ~-1+{sqrt(30)}/{3}~. ~f'(x)={6(x+1-{sqrt(30)}/{3})(x+1+{sqrt(30)}/{3})}/{(2x^{3}+6x^{2}-14x+7)^{2}}~.",
				vers: "3. ~v(x)=2x^{3}+6x^{2}-18x+7~, ~v'(x)=6x^{2}+12x-18=6(x^{2}+2x-3)~ : $\\Delta=4+12=16$, racines ~1~ et ~-3~ : ~v'(x)=6(x-1)(x+3)~. ~f'(x)={6(x-1)(x+3)}/{(2x^{3}+6x^{2}-18x+7)^{2}}~.",
				fois: 1
			},
			{
				de: "4. ~v(x)={1}/{6}x^{3}-5x^{2}+3x-4~, ~v'(x)={1}/{2}x^{2}-10x+3~ : $\\Delta=100-6=94$, racines ~10-sqrt(94)~ et ~10+sqrt(94)~. ~f'(x)={-{1}/{2}(x-10-sqrt(94))(x-10+sqrt(94))}/{({1}/{6}x^{3}-5x^{2}+3x-4)^{2}}~.",
				vers: "4. ~v(x)={1}/{6}x^{3}-5x^{2}+48x-4~, ~v'(x)={1}/{2}x^{2}-10x+48~ : $\\Delta=100-96=4$, racines ~8~ et ~12~. ~f'(x)={-{1}/{2}(x-8)(x-12)}/{({1}/{6}x^{3}-5x^{2}+48x-4)^{2}}~.",
				fois: 1
			}
		],
		interdits: INTERDITS_FACTORISER
	},
	{
		id: FACTORISER_2,
		titre: 'Dériver et factoriser (2)',
		champ: 'en.solution_md',
		remplacements: [
			{
				de: "3. ~v(x)=2x^{3}+6x^{2}-14x+7~, ~v'(x)=6x^{2}+12x-14~: $\\Delta=144+336=480$, roots ~{-12-sqrt(480)}/{12}=-1-{sqrt(30)}/{3}~ and ~-1+{sqrt(30)}/{3}~. ~f'(x)={6(x+1-{sqrt(30)}/{3})(x+1+{sqrt(30)}/{3})}/{(2x^{3}+6x^{2}-14x+7)^{2}}~.",
				vers: "3. ~v(x)=2x^{3}+6x^{2}-18x+7~, ~v'(x)=6x^{2}+12x-18=6(x^{2}+2x-3)~: $\\Delta=4+12=16$, roots ~1~ and ~-3~: ~v'(x)=6(x-1)(x+3)~. ~f'(x)={6(x-1)(x+3)}/{(2x^{3}+6x^{2}-18x+7)^{2}}~.",
				fois: 1
			},
			{
				de: "4. ~v(x)={1}/{6}x^{3}-5x^{2}+3x-4~, ~v'(x)={1}/{2}x^{2}-10x+3~: $\\Delta=100-6=94$, roots ~10-sqrt(94)~ and ~10+sqrt(94)~. ~f'(x)={-{1}/{2}(x-10-sqrt(94))(x-10+sqrt(94))}/{({1}/{6}x^{3}-5x^{2}+3x-4)^{2}}~.",
				vers: "4. ~v(x)={1}/{6}x^{3}-5x^{2}+48x-4~, ~v'(x)={1}/{2}x^{2}-10x+48~: $\\Delta=100-96=4$, roots ~8~ and ~12~. ~f'(x)={-{1}/{2}(x-8)(x-12)}/{({1}/{6}x^{3}-5x^{2}+48x-4)^{2}}~.",
				fois: 1
			}
		],
		interdits: INTERDITS_FACTORISER
	},
	{
		id: FORMELLES,
		titre: 'Expressions formelles',
		champ: 'statement_md',
		remplacements: [
			{ de: '7. ~sqrt(f/g)~\n', vers: '7. ~sqrt(f/g)~ (on suppose ~f/g>0~)\n', fois: 1 }
		],
		interdits: []
	},
	{
		id: FORMELLES,
		titre: 'Expressions formelles',
		champ: 'en.statement_md',
		remplacements: [{ de: '7. ~sqrt(f/g)~\n', vers: '7. ~sqrt(f/g)~ (assume ~f/g>0~)\n', fois: 1 }],
		interdits: []
	}
];

type Variation = Record<string, unknown> & {
	translations?: { en?: Record<string, unknown> } & Record<string, unknown>;
};

const occurrences = (texte: string, motif: string) => texte.split(motif).length - 1;

function lire(v: Variation, champ: Champ): string {
	if (champ.startsWith('en.')) return String(v.translations?.en?.[champ.slice(3)] ?? '');
	return String(v[champ] ?? '');
}

function ecrire(v: Variation, champ: Champ, valeur: string): void {
	if (champ.startsWith('en.')) {
		if (!v.translations?.en) throw new Error('Traduction anglaise absente');
		v.translations.en[champ.slice(3)] = valeur;
	} else {
		v[champ] = valeur;
	}
}

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle)
		throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
	if (!url.includes(PROJET_PROD)) throw new Error(`Base inattendue : ${url}`);

	const supabase = createClient<Database>(url, cle);
	const ids = [...new Set(CORRECTIONS.map((c) => c.id))];

	console.log(`${PUBLIER ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — ${url}\n`);

	const { data: exercices, error } = await supabase
		.from('exercises')
		.select('id, title, variations')
		.in('id', ids);
	if (error) throw new Error(`Lecture impossible : ${error.message}`);
	if (!exercices || exercices.length !== ids.length) throw new Error('Exercices manquants');

	const sauvegarde = join(DIR_SAUVEGARDE, `backup-coquilles-derivation-${Date.now()}.json`);
	writeFileSync(sauvegarde, JSON.stringify(exercices, null, 2));
	console.log(`💾 Sauvegarde : ${sauvegarde}\n`);

	const aEcrire = new Map<string, Variation[]>();

	for (const id of ids) {
		const exercice = exercices.find((e) => e.id === id)!;
		const variations = structuredClone(exercice.variations) as Variation[];
		if (variations.length !== 1)
			throw new Error(`${exercice.title} : ${variations.length} variations, 1 attendue`);
		const variation = variations[0];

		for (const correction of CORRECTIONS.filter((c) => c.id === id)) {
			let texte = lire(variation, correction.champ);
			for (const { de, vers, fois } of correction.remplacements) {
				const trouvees = occurrences(texte, de);
				if (trouvees !== fois) {
					throw new Error(
						`${correction.titre} [${correction.champ}] : « ${de} » trouvé ${trouvees} fois, ${fois} attendue(s).`
					);
				}
				texte = texte.split(de).join(vers);
				console.log(`  ${correction.titre} [${correction.champ}] : « ${de} » → « ${vers} »`);
			}
			const reste = correction.interdits.find((trace) => texte.includes(trace));
			if (reste)
				throw new Error(`${correction.titre} [${correction.champ}] : « ${reste} » subsiste`);
			ecrire(variation, correction.champ, texte);
		}

		const validation = exerciseVariationSchema.safeParse(variation);
		if (!validation.success)
			throw new Error(`${exercice.title} : ${validation.error.issues[0].message}`);
		aEcrire.set(id, variations);
	}

	if (!PUBLIER) {
		console.log('\nSimulation terminée — relancer avec --publier pour écrire.');
		return;
	}

	for (const [id, variations] of aEcrire) {
		const { data, error: erreurEcriture } = await supabase
			.from('exercises')
			.update({
				variations:
					variations as unknown as Database['public']['Tables']['exercises']['Update']['variations']
			})
			.eq('id', id)
			.select('id, variations');
		if (erreurEcriture) throw new Error(`Écriture ${id} : ${erreurEcriture.message}`);
		if (!data || data.length !== 1)
			throw new Error(`Écriture ${id} : ${data?.length ?? 0} ligne(s) écrite(s), 1 attendue`);
		if (JSON.stringify(data[0].variations) !== JSON.stringify(variations)) {
			throw new Error(`Écriture ${id} : le contenu relu diffère du contenu envoyé`);
		}
		console.log(`✅ ${id} écrit et relu`);
	}
}

main().catch((e: unknown) => {
	console.error('❌', e instanceof Error ? e.message : e);
	process.exit(1);
});
