/**
 * Chantier « questions-cm1 », lot 0 (corrections) : contenu de 2 modèles (Supabase local requis)
 * ==============================================================================================
 *
 * Migration `20261028100000_questions_cm1_contenu` : 2 modèles MODIFIER, sans neuf, qui passent du
 * CM1 au CM2 avec le tag de leur point. Moitié des impairs de 1 à 15 (edc5d7d4, CM2-037), forme
 * décimale des fractions du point (322f3479, CM2-039). Phase 0 validée par David le 2026-10-28
 * (copie figée dans tests/integration/fixtures/questions-cm1-contenu.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Questions CM1',
	nom: 'corrections de contenu',
	migration: 'supabase/migrations/20261028100000_questions_cm1_contenu.sql',
	fixture: 'tests/integration/fixtures/questions-cm1-contenu.json',
	taille: 2,
	changentDeNiveau: 2,
	gardeRangementNeufs: true
});
