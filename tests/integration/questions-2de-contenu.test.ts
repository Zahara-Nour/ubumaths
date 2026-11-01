/**
 * Chantier « questions-2de », lot « corrections » : contenu de 7 modèles (Supabase local requis)
 * ============================================================================================
 *
 * Migration `20261027192000_questions_2de_contenu` : 7 modèles MODIFIER, sans neuf ni tag posé.
 * Corrigé sans « suite géométrique » (8b59ca4b), intervalles accolés → [a ; d] (8c31675a), |x − a| = b
 * par la distance (939153b6), sous-titres et consigne des marches « Développer » (85f6e96e, 1338da34,
 * 288c2bf0, 6909bfde). Les tags relevés sont exigés à l'identique. Décision de David du 2026-10-27
 * (copie figée dans tests/integration/fixtures/questions-2de-contenu.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Questions 2de',
	nom: 'corrections de contenu',
	migration: 'supabase/migrations/20261027192000_questions_2de_contenu.sql',
	fixture: 'tests/integration/fixtures/questions-2de-contenu.json',
	taille: 7,
	gardeRangementNeufs: true
});
