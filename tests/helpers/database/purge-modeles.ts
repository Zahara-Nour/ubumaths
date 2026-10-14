/**
 * Purge des modèles de chapitre dans la base de TEST (jamais la prod)
 * ===================================================================
 *
 * ADR 0029 : un chapitre lié porte une ligne de lien par élément du modèle, et
 * `source_id` est en `ON DELETE RESTRICT` (sections : `SET NULL`). Supprimer un
 * modèle — directement, ou par la cascade de la suppression de son auteur — est
 * donc refusé tant qu'un chapitre le relie, et la purge entière échoue.
 *
 * Décision : avant de supprimer les modèles visés, les chapitres qui les relient
 * sont DÉTACHÉS (`source_id` vidé, instanciation marquée détachée), comme le fait
 * « Détacher du modèle ». Un chapitre d'une classe que la purge ne touche pas
 * garde ainsi son contenu : la base l'a recopié dans chaque ligne de lien.
 *
 * Les modèles ORPHELINS (auteur disparu) partent aussi : la suppression de
 * secours des profils (`session_replication_role = replica`, clés étrangères
 * coupées) en laissait derrière elle.
 *
 * Tests : `tests/integration/purge-tests-lignes-de-lien.test.ts`.
 */

// Types
/** Ce dont la purge a besoin d'un client `pg` (le singleton des tests ou celui de `global-setup`). */
interface Queryable {
	query: (sql: string) => Promise<unknown>;
}

// Constantes
/** Les six tables qui portent des lignes de lien, sections EN DERNIER. */
const LINKED_TABLES = [
	'chapter_documents',
	'chapter_checklist_items',
	'chapter_exercises',
	'chapter_worksheets',
	'chapter_series',
	'chapter_sections'
] as const;

// Functions
/**
 * Détache les chapitres reliant les modèles des auteurs visés (ou sans auteur),
 * puis supprime ces modèles — leur contenu part avec eux (CASCADE).
 *
 * @param client - Connexion postgres en mode normal (PAS `replica` : les
 *   cascades et les déclencheurs doivent jouer)
 * @param creatorsSql - Sous-requête SQL constante rendant les `id` des profils
 *   dont les modèles sont à purger (jamais une valeur venue de l'extérieur)
 */
export async function purgeTemplatesOf(client: Queryable, creatorsSql: string): Promise<void> {
	const templates = `
		select t.id from public.chapter_templates t
		where t.created_by in (${creatorsSql})
			or not exists (select 1 from public.profiles p where p.id = t.created_by)`;

	for (const table of LINKED_TABLES) {
		await client.query(`
			update public.${table} c set source_id = null
			where c.source_id in (
				select m.id from public.${table} m where m.template_id in (${templates})
			)`);
	}

	await client.query(`
		update public.chapter_template_instantiations set is_detached = true
		where template_id in (${templates})`);

	await client.query(`delete from public.chapter_templates where id in (${templates})`);
}
