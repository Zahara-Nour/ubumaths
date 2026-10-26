/**
 * Publication d'un lot de modèles relu sur sa page à cocher
 * ==========================================================
 *
 * Retrouve en base les brouillons du lot (même clé que `create-questions.ts`), exige que CHAQUE
 * fichier du dossier ait exactement un brouillon, puis les publie par `publishTemplates` (le
 * contrôle de l'admin : `templatePublicationErrors`, collisions de catégorie) et relit leur statut.
 * Démarche : docs/pratiques/couvrir-un-niveau.md § 8.
 *
 *   pnpm tsx scripts/questions/publier-lot.ts --dir scripts/questions/cp-c             # simulation
 *   pnpm tsx scripts/questions/publier-lot.ts --dir scripts/questions/cp-c --publier   # écriture
 *
 * Base visée : `.env` (la PROD) ; `set -a; . ./.env.local; set +a` avant, pour la base locale.
 * En prod, l'écriture est lancée par David (`!`).
 */

import { argValue, createScriptClient, hasFlag } from '../relecture/common';
import { publishTemplates } from '../../src/lib/server/questions-bulk-status';
import { apparierLot, lireLot, titresDuLot } from '../lib/lot-questions';

async function main(): Promise<number> {
	const dossier = argValue('--dir');
	const publier = hasFlag('--publier');
	if (!dossier) {
		console.error('Usage : pnpm tsx scripts/questions/publier-lot.ts --dir <dossier> [--publier]');
		return 2;
	}
	const lot = lireLot(dossier);
	const { supabase, target } = createScriptClient(publier);
	console.log(`${publier ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — base ${target}\n`);

	const { data, error } = await supabase
		.from('question_templates')
		.select('id, title, theme, domain, subdomain, level, status')
		.in('title', titresDuLot(lot));
	if (error) throw new Error(`lecture impossible — ${error.message}`);
	const appariement = apparierLot(lot, data ?? [], { statut: 'draft' });
	if (!appariement.ok) {
		for (const e of appariement.erreurs) console.error(`⛔ ${e}`);
		console.error(`\n⛔ lot refusé : ${lot.length} brouillons attendus, rien n'est publié`);
		return 1;
	}
	for (const { fichier, ligne } of appariement.paires) {
		console.log(`  ${ligne.id.slice(0, 8)} brouillon  ${fichier} « ${ligne.title} »`);
	}
	const ids = appariement.paires.map((p) => p.ligne.id);
	if (!publier) {
		console.log(`\n${ids.length} brouillons à publier — simulation (--publier pour écrire).`);
		return 0;
	}

	const resultat = await publishTemplates(supabase, ids);
	for (const r of resultat.refused)
		console.error(`⛔ ${r.title} (${r.id}) : ${r.reasons.join(' ; ')}`);

	// La RLS échoue en silence : relire le statut plutôt que croire le compte rendu
	const { data: relues, error: e2 } = await supabase
		.from('question_templates')
		.select('id, status')
		.in('id', ids);
	if (e2) throw new Error(`relecture impossible — ${e2.message}`);
	const publies = (relues ?? []).filter((r) => r.status === 'published').length;
	console.log(`\n${publies}/${ids.length} publiés (statut relu en base).`);
	return publies === ids.length ? 0 : 1;
}

main()
	.then((code) => process.exit(code))
	.catch((e) => {
		console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(1);
	});
