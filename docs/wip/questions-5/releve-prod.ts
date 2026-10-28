/**
 * Relevé de la prod pour le lot 0 de la 5e (niveaux) (LECTURE SEULE)
 * ======================================================================
 *
 * Écrit l'instantané `etat-prod-<date>/` attendu par `scissions_outils.generer` : contenu brut des
 * modèles (colonnes de la base), nœuds (tous), points des niveaux visés, tags des modèles. Lit `.env`
 * (base distante) ; n'écrit jamais en base. Les md5 sont à vérifier contre le MCP.
 *
 *   pnpm tsx docs/wip/questions-5/releve-prod.ts <dossier> <uuid>[,<uuid>…]
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const [dossier, liste] = process.argv.slice(2);
if (!dossier || !liste) throw new Error('Usage : releve-prod.ts <dossier> <uuid>,…');
const courts = liste.split(',');
const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis (.env)');
console.log(`Base lue : ${new URL(url).hostname}`);
const supabase = createClient(url, key, {
	auth: { persistSession: false, autoRefreshToken: false }
});

const CHAMPS =
	'id,type,options,precision,grades,delay,multiple_answers,theme,domain,subdomain,level,variations,' +
	'exercise_instruction,status,title,description,shared,default_display_options,test_specs,classification_node_id';

async function lire<T>(requete: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
	const { data, error } = await requete;
	if (error) throw error;
	return data ?? [];
}

const ids = courts;
if (!ids.every((i) => /^[0-9a-f-]{36}$/.test(i))) throw new Error('identifiants complets attendus');
const modeles = await lire<Record<string, unknown>>(
	supabase.from('question_templates').select(CHAMPS).in('id', ids).order('id')
);
const noeuds = await lire(
	supabase.from('classification_nodes').select('id,parent_id,kind,name,archived_at').order('id')
);
const points = await lire(
	supabase
		.from('curriculum_points')
		.select('id,code,grade,node_id,archived_at')
		.in('grade', ['CM1', 'CM2', '6', '5', '4', '3'])
		.order('code')
);
const tags = await lire(
	supabase.from('question_template_points').select('template_id,point_id').in('template_id', ids)
);

mkdirSync(dossier, { recursive: true });
const ecrire = (nom: string, x: unknown) =>
	writeFileSync(`${dossier}/${nom}.json`, JSON.stringify(x, null, '\t') + '\n');
ecrire('templates', modeles);
ecrire('nodes', noeuds);
ecrire('points', points);
ecrire('tags', tags);
console.log(
	`${modeles.length} modèles, ${noeuds.length} nœuds, ${points.length} points, ${tags.length} tags`
);
