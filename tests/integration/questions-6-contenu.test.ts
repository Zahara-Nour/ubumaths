/**
 * Chantier « questions-6 », lot « corrections » : contenu de 6 modèles (Supabase local requis)
 * ==========================================================================================
 *
 * Migration `20261027100000_questions_6_contenu` : 6 modèles MODIFIER, sans neuf ni tag posé.
 * × 10 / 100 / 1 000 à 3 décimales au plus (819df2a9, f3bf4c64), volumes en m³ / dm³ / cm³ seuls
 * (b79d4cb7), variations retirées (24f7a007 : − 100 % ; 82748db8 : doublon), coquille (ae7a332e).
 * Les tags relevés sont exigés à l'identique. Décision de David du 2026-10-26 (copie figée dans
 * tests/integration/fixtures/questions-6-contenu.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Questions 6e',
	nom: 'corrections de contenu',
	migration: 'supabase/migrations/20261027100000_questions_6_contenu.sql',
	fixture: 'tests/integration/fixtures/questions-6-contenu.json',
	taille: 6,
	gardeRangementNeufs: true
});
