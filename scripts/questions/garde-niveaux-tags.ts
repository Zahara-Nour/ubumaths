/**
 * Garde : les niveaux des tags sont dans les niveaux de leur modèle
 * ===================================================================
 *
 * Liste les modèles tagués d'un point dont le niveau manque à `grades` (règle et raison :
 * `scripts/lib/niveaux-des-tags.ts`). Lecture seule. Sort en code 1 s'il y a un écart : à lancer
 * après une migration de rangement et avant une publication (couvrir-un-niveau.md § 8).
 *
 *   pnpm tsx scripts/questions/garde-niveaux-tags.ts
 *
 * Base visée : `.env` (la PROD) ; `set -a; . ./.env.local; set +a` avant, pour la base locale.
 */

import { createScriptClient } from '../relecture/common';
import { ecartsNiveaux, formaterEcart, lireLignesTags } from '../lib/niveaux-des-tags';

async function main(): Promise<number> {
	const { supabase, target } = createScriptClient(false);
	console.log(`🔍 LECTURE — base ${target}\n`);
	const lignes = await lireLignesTags(supabase);
	const ecarts = ecartsNiveaux(lignes);
	const modeles = new Set(lignes.map((l) => l.id)).size;
	if (ecarts.length === 0) {
		console.log(`✅ ${modeles} modèles tagués (${lignes.length} tags) : aucun niveau manquant.`);
		return 0;
	}
	for (const e of ecarts) console.error(formaterEcart(e));
	console.error(
		`\n⛔ ${ecarts.length} modèle(s) sur ${modeles} tagués d'un point dont le niveau manque à \`grades\` (le cahier de texte ne les montre pas à ce niveau)`
	);
	return 1;
}

main()
	.then((code) => process.exit(code))
	.catch((e) => {
		console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(1);
	});
