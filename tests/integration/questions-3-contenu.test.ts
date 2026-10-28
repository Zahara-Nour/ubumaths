/**
 * Chantier « questions-3 », lot 0 (corrections) : contenu d'un modèle (Supabase local requis)
 * ========================================================================================
 *
 * Migration `20261028200000_questions_3_contenu` : 1 modèle MODIFIER, sans neuf ni changement de
 * niveau. « Augmentation » (290dcf6f, 3-068, tag gardé) perd sa variation à 200 %. Phase 0 validée
 * par David le 2026-10-28 (copie figée dans tests/integration/fixtures/questions-3-contenu.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Questions 3e',
	nom: 'corrections de contenu',
	migration: 'supabase/migrations/20261028200000_questions_3_contenu.sql',
	fixture: 'tests/integration/fixtures/questions-3-contenu.json',
	taille: 1
});
