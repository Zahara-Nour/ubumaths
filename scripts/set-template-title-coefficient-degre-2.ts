/**
 * Donner son titre au modèle « coefficient du terme de degré 2 » (publié, sans titre)
 * ==================================================================================
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit sans `--publier`.
 *
 * Une seule mise à jour, ciblée par id, colonne `title` uniquement (demande de David,
 * 2026-10-01). Rejouable : n'écrit que si le titre est encore vide, et relit la ligne
 * après écriture (la RLS échoue en silence : zéro ligne, pas d'erreur).
 *
 * Usage :
 *   pnpm tsx scripts/set-template-title-coefficient-degre-2.ts             (simulation)
 *   pnpm tsx scripts/set-template-title-coefficient-degre-2.ts --publier   (écrit)
 */
import { createScriptClient, hasFlag } from './relecture/common';

const TEMPLATE_ID = '64e53490-57b0-44ba-9737-94779b78191b';
const NEW_TITLE = 'Lire le coefficient du terme de degré 2';

async function main(): Promise<number> {
	const publier = hasFlag('--publier');
	const { supabase, target } = createScriptClient(publier);
	console.log(`${publier ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — base ${target}\n`);

	const { data: avant, error: e1 } = await supabase
		.from('question_templates')
		.select('id, title, status, subdomain, level')
		.eq('id', TEMPLATE_ID)
		.maybeSingle();
	if (e1) throw new Error(`lecture impossible — ${e1.message}`);
	if (!avant) {
		console.error(`⛔ modèle ${TEMPLATE_ID} introuvable`);
		return 1;
	}
	console.log(
		`Modèle ${avant.id} (${avant.status}, ${avant.subdomain} niveau ${avant.level}) — titre actuel : « ${avant.title ?? ''} »`
	);

	if (avant.title === NEW_TITLE) {
		console.log('= titre déjà en place, rien à faire');
		return 0;
	}
	if ((avant.title ?? '').trim() !== '') {
		console.error('⛔ le titre n’est pas vide : on ne l’écrase pas');
		return 1;
	}
	if (!publier) {
		console.log(`→ écrirait le titre « ${NEW_TITLE} »`);
		return 0;
	}

	const { data: maj, error: e2 } = await supabase
		.from('question_templates')
		.update({ title: NEW_TITLE })
		.eq('id', TEMPLATE_ID)
		.select('id, title');
	if (e2 || maj?.length !== 1 || maj[0].title !== NEW_TITLE) {
		throw new Error(`mise à jour non confirmée — ${e2?.message ?? JSON.stringify(maj)}`);
	}

	const { data: apres, error: e3 } = await supabase
		.from('question_templates')
		.select('id, title, status')
		.eq('id', TEMPLATE_ID)
		.single();
	if (e3 || apres.title !== NEW_TITLE) {
		throw new Error(`relecture en échec — ${e3?.message ?? JSON.stringify(apres)}`);
	}
	console.log(`✍️  titre écrit et relu : « ${apres.title} » (${apres.status})`);
	return 0;
}

main()
	.then((code) => process.exit(code))
	.catch((e) => {
		console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(1);
	});
