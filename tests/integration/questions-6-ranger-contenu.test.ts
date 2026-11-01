/**
 * Chantier « questions-6 » : 06 et 07 du lot 4 passent en ranger (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261101121300_questions_6_ranger_contenu` : 2 modèles MODIFIER, sans neuf ni tag posé.
 * 83c835bb (06, Ranger des fractions) et c360d588 (07, Ranger des nombres mixtes) passent de trois
 * cases à un bloc ranger ; variations et specs remplacées par la source. Les tags relevés (6-134,
 * 6-204) sont exigés à l'identique. Décision de David du 2026-10-31 (copie figée dans
 * tests/integration/fixtures/questions-6-ranger-contenu.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Questions 6e',
	nom: '06 et 07 du lot 4 en ranger',
	migration: 'supabase/migrations/20261101121300_questions_6_ranger_contenu.sql',
	fixture: 'tests/integration/fixtures/questions-6-ranger-contenu.json',
	taille: 2,
	gardeRangementNeufs: true
});
