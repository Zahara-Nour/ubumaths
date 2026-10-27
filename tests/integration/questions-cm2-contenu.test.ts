/**
 * Chantier « questions-cm2 », lot 0 (changements de niveau) : contenu d'un modèle (Supabase local requis)
 * ======================================================================================================
 *
 * Migration `20261028100000_questions_cm2_contenu` : 1 modèle MODIFIER, sans neuf. Moitié des impairs
 * de 1 à 15 (edc5d7d4, au lieu de 1 à 29), niveaux [CM1] → [CM2], tag CM2-037 posé. Phase 0 validée
 * par David le 2026-10-28 (copie figée dans tests/integration/fixtures/questions-cm2-contenu.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Questions CM2',
	nom: 'corrections de contenu',
	migration: 'supabase/migrations/20261028100000_questions_cm2_contenu.sql',
	fixture: 'tests/integration/fixtures/questions-cm2-contenu.json',
	taille: 1,
	gardeRangementNeufs: true,
	changentDeNiveau: 1
});
