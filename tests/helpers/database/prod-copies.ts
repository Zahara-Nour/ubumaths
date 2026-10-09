/**
 * Copies minimales des modèles et des exercices de la PRODUCTION, portant leurs vrais identifiants
 * ============================================================================
 *
 * Les migrations de données qui rangent les contenus (#981, nettoyage des facettes) visent des
 * identifiants qui n'existent qu'en production. Les tests fabriquent donc des copies minimales,
 * dans la transaction ouverte, puis rejouent la migration depuis son fichier. La date de
 * modification est fabriquée pour vérifier qu'un rangement ne la touche pas.
 */
import type { Client } from 'pg';

// ============================================================================
// TYPES
// ============================================================================

export interface ProdCopies {
	templateIds: string[];
	exerciseIds: string[];
	/** Auteur des exercices (profil existant). */
	authorId: string;
	/** Date de création et de modification fabriquée. */
	timestamp: string;
}

// ============================================================================
// FONCTIONS
// ============================================================================

export async function insertProdCopies(pg: Client, copies: ProdCopies): Promise<void> {
	await pg.query(
		`insert into public.question_templates (id, type, grades, theme, domain, level, variations, status, title, created_at, updated_at)
		 select unnest($1::uuid[]), 'numerical_exact', array['2'], 'copie', 'copie', 1, '[{}]'::jsonb, 'draft', 'copie de la prod', $2::timestamptz, $2::timestamptz`,
		[copies.templateIds, copies.timestamp]
	);
	await pg.query(
		`insert into public.exercises (id, created_by, category, title, created_at, updated_at)
		 select unnest($1::uuid[]), $2::uuid, 'application', 'copie de la prod', $3::timestamptz, $3::timestamptz`,
		[copies.exerciseIds, copies.authorId, copies.timestamp]
	);
}
