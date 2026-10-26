/**
 * Chantier « questions-ce1 », lot 0 (corrections) : contenu de 3 modèles (Supabase local requis)
 * ===============================================================================================
 *
 * Migration `20261027000000_questions_ce1_contenu` : 3 modèles MODIFIER, sans neuf ni tag posé.
 * Moitié par décomposition jusqu'à 698 (c96ecf4d), distributivité 11 à 19 (9d709f5b), parité de 0 à
 * 999 (c73734a8). Les tags relevés sont exigés à l'identique. Phase 0 validée par David le
 * 2026-10-26 (copie figée dans tests/integration/fixtures/questions-ce1-contenu.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Questions CE1',
	nom: 'corrections de contenu',
	migration: 'supabase/migrations/20261027000000_questions_ce1_contenu.sql',
	fixture: 'tests/integration/fixtures/questions-ce1-contenu.json',
	taille: 3,
	gardeRangementNeufs: true
});
