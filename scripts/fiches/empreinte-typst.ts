/**
 * Empreinte Typst de TOUS les textes d'exercices en base (non-régression)
 * ========================================================================
 *
 * Avant de livrer un correctif du générateur PDF, mesurer ce qu'il change sur le
 * contenu réel : on prend l'empreinte sur `main` puis sur la branche, et on compare.
 * Chaque texte (énoncé, corrigé, FR, EN) est converti en Typst, dans sa langue.
 *
 * ⚠️ Une empreinte doit CONTENIR la classe visée : si aucun texte en base n'a le
 * défaut corrigé, « 0 changement » ne prouve rien — le prouver par un test unitaire.
 * Chaque changement doit s'expliquer par le correctif, et seulement par lui.
 *
 * Usage :
 *   pnpm tsx scripts/fiches/empreinte-typst.ts <sortie.json>          # prendre l'empreinte
 *   pnpm tsx scripts/fiches/empreinte-typst.ts --compare <a.json> <b.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { config as dotenv } from 'dotenv';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';
import type { Database } from '$lib/types/database';

dotenv({ path: '.env' });

type Variation = {
	statement_md?: string;
	solution_md?: string;
	translations?: { en?: { statement_md?: string; solution_md?: string } };
};

function comparer(a: Record<string, string>, b: Record<string, string>) {
	const changes = Object.keys(a).filter((k) => a[k] !== b[k]);
	const exercices = new Set(changes.map((k) => k.split('/')[0]));
	console.log(
		`${Object.keys(a).length} textes — ${changes.length} changent (${exercices.size} exercices)`
	);
	for (const k of changes.slice(0, 40)) {
		const x = a[k].split('\n');
		const y = (b[k] ?? '').split('\n');
		const i = x.findIndex((l, n) => l !== y[n]);
		console.log(`\n${k}\n  - ${x[i]?.slice(0, 160)}\n  + ${y[i]?.slice(0, 160)}`);
	}
	if (changes.length > 40) console.log(`\n… et ${changes.length - 40} autres`);
}

async function main() {
	const args = process.argv.slice(2);
	if (args[0] === '--compare' && args[1] && args[2]) {
		comparer(JSON.parse(readFileSync(args[1], 'utf8')), JSON.parse(readFileSync(args[2], 'utf8')));
		return;
	}
	const sortie = args[0];
	if (!sortie) {
		console.error('Usage : empreinte-typst.ts <sortie.json> | --compare <a.json> <b.json>');
		process.exit(2);
	}
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle) throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants');
	const supabase = createClient<Database>(url, cle);
	const { data, error } = await supabase.from('exercises').select('id, variations');
	if (error) throw new Error(`Lecture impossible : ${error.message}`);

	const empreinte: Record<string, string> = {};
	for (const e of data ?? []) {
		(e.variations as Variation[]).forEach((v, k) => {
			const textes = {
				s: v.statement_md,
				c: v.solution_md,
				es: v.translations?.en?.statement_md,
				ec: v.translations?.en?.solution_md
			};
			for (const [champ, texte] of Object.entries(textes)) {
				if (!texte) continue;
				const language = champ.startsWith('e') ? 'en' : 'fr';
				try {
					empreinte[`${e.id}/${k}/${champ}`] = generateTypst(parseMarkdown(texte), {
						includeSetup: false,
						language
					});
				} catch (err) {
					empreinte[`${e.id}/${k}/${champ}`] = `ERR ${String(err)}`;
				}
			}
		});
	}
	writeFileSync(sortie, JSON.stringify(empreinte));
	console.log(`${Object.keys(empreinte).length} textes → ${sortie}`);
}

main().catch((e) => {
	console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
