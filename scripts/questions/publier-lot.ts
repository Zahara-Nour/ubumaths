/**
 * Publication d'un lot de modèles relu sur sa page à cocher
 * ==========================================================
 *
 * Retrouve en base chaque fichier du dossier (même clé que `create-questions.ts`, exactement une
 * ligne par fichier), puis publie les brouillons par `publishTemplates` (le contrôle de l'admin :
 * `templatePublicationErrors`, collisions de catégorie) et relit leur statut.
 * - Simulation par défaut : les contrôles sont JOUÉS (`publishTemplates` en simulation), rien
 *   n'est écrit.
 * - `--publier` simule d'abord : un seul refus, et rien n'est écrit (tout ou rien).
 * - Un modèle déjà publié est laissé tel quel : relancer après une publication interrompue
 *   reprend les brouillons qui restent.
 * Démarche : docs/pratiques/couvrir-un-niveau.md § 8.
 *
 *   pnpm tsx scripts/questions/publier-lot.ts --dir scripts/questions/cp-c             # simulation
 *   pnpm tsx scripts/questions/publier-lot.ts --dir scripts/questions/cp-c --publier   # écriture
 *
 * Base visée : `.env` (la PROD) ; `set -a; . ./.env.local; set +a` avant, pour la base locale.
 * En prod, l'écriture est lancée par David (`!`).
 */

import { createScriptClient, hasFlag } from '../relecture/common';
import { publishTemplates } from '../../src/lib/server/questions-bulk-status';
import { apparierLot, lireLot, titresDuLot, valeurArgument } from '../lib/lot-questions';

const LIBELLE: Record<string, string> = { draft: 'brouillon', published: 'publié' };

async function main(): Promise<number> {
	const dossier = valeurArgument(process.argv, '--dir');
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
	const appariement = apparierLot(lot, data ?? []);
	if (!appariement.ok) {
		for (const e of appariement.erreurs) console.error(`⛔ ${e}`);
		console.error(`\n⛔ lot refusé : un modèle par fichier attendu, rien n'est publié`);
		return 1;
	}
	const autres = appariement.paires.filter((p) => !(p.ligne.status in LIBELLE));
	for (const { fichier, ligne } of appariement.paires) {
		console.log(
			`  ${ligne.id.slice(0, 8)} ${(LIBELLE[ligne.status] ?? ligne.status).padEnd(9)}  ${fichier} « ${ligne.title} »`
		);
	}
	if (autres.length > 0) {
		console.error(
			`\n⛔ lot refusé : ${autres.length} modèle(s) ni brouillon ni publié, rien n'est publié`
		);
		return 1;
	}
	const ids = appariement.paires.map((p) => p.ligne.id);
	const brouillons = appariement.paires
		.filter((p) => p.ligne.status === 'draft')
		.map((p) => p.ligne.id);
	if (brouillons.length === 0) {
		console.log(`\nTout le lot est déjà publié : rien à faire.`);
		return 0;
	}

	// Les contrôles de la publication, sans écrire : un refus arrête tout
	const essai = await publishTemplates(supabase, brouillons, { simulation: true });
	for (const r of essai.refused)
		console.error(`⛔ ${r.title} (${r.id.slice(0, 8)}) : ${r.reasons.join(' ; ')}`);
	if (essai.refused.length > 0) {
		console.error(
			`\n⛔ ${essai.refused.length}/${brouillons.length} brouillon(s) refusé(s) au contrôle : rien n'est publié`
		);
		return 1;
	}
	if (!publier) {
		console.log(
			`\n${brouillons.length} brouillons passent le contrôle — simulation (--publier pour écrire).`
		);
		return 0;
	}

	const resultat = await publishTemplates(supabase, brouillons);
	for (const r of resultat.refused)
		console.error(`⛔ ${r.title} (${r.id.slice(0, 8)}) : ${r.reasons.join(' ; ')}`);

	// La RLS échoue en silence : relire le statut plutôt que croire le compte rendu
	const { data: relues, error: e2 } = await supabase
		.from('question_templates')
		.select('id, status')
		.in('id', ids);
	if (e2) throw new Error(`relecture impossible — ${e2.message}`);
	const publies = (relues ?? []).filter((r) => r.status === 'published').length;
	console.log(`\n${publies}/${ids.length} modèles du lot publiés (statut relu en base).`);
	return publies === ids.length ? 0 : 1;
}

main()
	.then((code) => process.exit(code))
	.catch((e) => {
		console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(1);
	});
