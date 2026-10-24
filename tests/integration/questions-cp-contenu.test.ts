/**
 * Chantier « questions », corrections CP : contenu de 4 modèles (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261025000000_questions_cp_contenu` : 4 modèles MODIFIER, sans neuf ni tag posé.
 * Corrigé de la décomposition sans × (52c4d773), complément à la dizaine supérieure (0e5372a4),
 * valeur 0 retirée des doubles et moitiés (25285413, 89bef942). Les tags relevés sont exigés à
 * l'identique. Décision de David du 2026-10-24 (copie figée dans
 * tests/integration/fixtures/questions-cp-contenu.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Questions CP',
	nom: 'corrections de contenu',
	migration: 'supabase/migrations/20261025000000_questions_cp_contenu.sql',
	fixture: 'tests/integration/fixtures/questions-cp-contenu.json',
	taille: 4,
	gardeRangementNeufs: true
});
