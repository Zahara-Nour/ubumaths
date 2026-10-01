/**
 * Renommer des sous-domaines de modèles de questions (accents, coquilles)
 * =======================================================================
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit sans `--publier`.
 *
 * Les catégories ne sont que des champs texte des modèles ; leur ordre d'affichage vit dans
 * `src/lib/questions/category-order.ts`, qui doit porter le NOUVEAU nom AVANT le renommage
 * (sinon la catégorie se range en fin de liste). Seuls les renommages listés dans `RENOMMAGES`
 * sont faits (décision de David du 2026-10-01 : sous-domaines des suites sans accent).
 *
 * Pour chaque renommage : les modèles concernés sont lus, puis mis à jour par id ; chaque
 * ligne rendue est relue (la RLS échoue en silence : zéro ligne ≠ succès). Arrêt si le nouveau
 * nom est déjà pris au même niveau (index unique des modèles publiés).
 *
 * Usage :
 *   pnpm tsx scripts/rename-question-subdomains.ts            (simulation)
 *   pnpm tsx scripts/rename-question-subdomains.ts --publier  (écrit)
 */
import { createScriptClient, hasFlag } from './relecture/common';

interface Renommage {
	theme: string;
	domain: string;
	ancien: string;
	nouveau: string;
}

const RENOMMAGES: readonly Renommage[] = [
	{
		theme: 'Suites',
		domain: 'Apprivoiser',
		ancien: 'Ecriture des termes',
		nouveau: 'Écriture des termes'
	},
	{
		theme: 'Suites',
		domain: 'Suites arithmétiques',
		ancien: 'Determiner la raison',
		nouveau: 'Déterminer la raison'
	},
	{
		theme: 'Suites',
		domain: 'Limites',
		ancien: 'Determiner une limite',
		nouveau: 'Déterminer une limite'
	}
];

async function main(): Promise<number> {
	const publier = hasFlag('--publier');
	const { supabase, target } = createScriptClient(publier);
	console.log(`${publier ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — base ${target}\n`);

	for (const r of RENOMMAGES) {
		const { data, error } = await supabase
			.from('question_templates')
			.select('id, title, level, status, subdomain')
			.eq('theme', r.theme)
			.eq('domain', r.domain)
			.in('subdomain', [r.ancien, r.nouveau]);
		if (error) throw new Error(`${r.ancien} : lecture — ${error.message}`);
		const anciens = (data ?? []).filter((m) => m.subdomain === r.ancien);
		const nouveaux = (data ?? []).filter((m) => m.subdomain === r.nouveau);
		const conflit = anciens.find((a) => nouveaux.some((n) => n.level === a.level));
		if (conflit) {
			throw new Error(`« ${r.nouveau} » niveau ${conflit.level} existe déjà : arrêt`);
		}
		console.log(
			`■ ${r.theme} › ${r.domain} › « ${r.ancien} » → « ${r.nouveau} » : ${anciens.length} modèle(s)`
		);
		for (const m of anciens)
			console.log(`    ${m.id.slice(0, 8)} niveau ${m.level} (${m.status}) — ${m.title}`);
		if (!publier) continue;

		for (const m of anciens) {
			const { data: rendu, error: ecriture } = await supabase
				.from('question_templates')
				.update({ subdomain: r.nouveau })
				.eq('id', m.id)
				.eq('subdomain', r.ancien)
				.select('id, subdomain');
			if (ecriture || rendu?.length !== 1 || rendu[0].subdomain !== r.nouveau) {
				throw new Error(
					`${m.id} : renommage non confirmé — ${ecriture?.message ?? 'aucune ligne'}`
				);
			}
			console.log(`  ✍️  ${m.id.slice(0, 8)} relu : « ${rendu[0].subdomain} »`);
		}
	}
	if (!publier) console.log('\nSimulation, rien d’écrit.');
	return 0;
}

main().then(
	(code) => process.exit(code),
	(e: unknown) => {
		console.error(e);
		process.exit(1);
	}
);
