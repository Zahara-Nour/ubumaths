/**
 * Chantier « questions-6 », lot 4 « Fractions » : contenu d'1 modèle du lot 3 (Supabase local requis)
 * ==========================================================================================
 *
 * Migration `20261028140000_questions_6_fractions_contenu` : 1 modèle MODIFIER, sans neuf ni tag posé.
 * e3d87166 (Multiplier par 0,1) : la couleur hors formule de la correction de la v1, affichée brute,
 * devient du gras. Le tag relevé (6-116) est exigé à l'identique. Décision de David du 2026-10-28
 * (copie figée dans tests/integration/fixtures/questions-6-fractions-contenu.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Questions 6e',
	nom: 'lot 4, contenu de e3d87166',
	migration: 'supabase/migrations/20261028140000_questions_6_fractions_contenu.sql',
	fixture: 'tests/integration/fixtures/questions-6-fractions-contenu.json',
	taille: 1,
	gardeRangementNeufs: true
});
