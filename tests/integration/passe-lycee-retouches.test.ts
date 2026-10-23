/**
 * Passe lycée, retouches des brouillons de #1651 (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261024020000_passe_lycee_retouches` : 5 modèles MODIFIER, sans neuf ni tag posé.
 * Conclusions de corrigé en gras (70e682f9, f3100c29), « u₁² ≠ u₀ × u₂ » écrit en clair (d1010214,
 * f3100c29), descriptions de specs de la scission somme / produit (0dee4515, 88a4432e). Les tags
 * posés par #1651 sont exigés à l'identique. Décision de David du 2026-10-23 (copie figée dans
 * tests/integration/fixtures/passe-lycee-retouches.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Passe lycée',
	nom: 'retouches des brouillons de #1651',
	migration: 'supabase/migrations/20261024020000_passe_lycee_retouches.sql',
	fixture: 'tests/integration/fixtures/passe-lycee-retouches.json',
	taille: 5,
	gardeStatut: true,
	gardeRangementNeufs: true
});
