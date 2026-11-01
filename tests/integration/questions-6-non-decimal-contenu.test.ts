/**
 * Chantier « questions-6 » : contenu du modèle 01 du lot 4, « non décimal » (Supabase local requis)
 * ==========================================================================================
 *
 * Migration `20261028200000_questions_6_non_decimal_contenu` : 1 modèle MODIFIER, sans neuf ni tag posé.
 * 5077e030 (Entier, décimal ou non décimal ?) : plus de dénominateur 7 dans la variante « non décimal »,
 * reste qui revient nommé dans la correction, « Pose la division sur ton brouillon. » dans les énoncés.
 * Le tag relevé (6-130) est exigé à l'identique. Décision de David du 2026-10-28
 * (copie figée dans tests/integration/fixtures/questions-6-non-decimal-contenu.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Questions 6e',
	nom: 'modèle 01 du lot 4, non décimal',
	migration: 'supabase/migrations/20261028200000_questions_6_non_decimal_contenu.sql',
	fixture: 'tests/integration/fixtures/questions-6-non-decimal-contenu.json',
	taille: 1,
	gardeRangementNeufs: true
});
