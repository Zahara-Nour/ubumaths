/**
 * Passe lycée, retouches 2 : défauts restés ouverts avant le versement (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261024120000_passe_lycee_retouches_2` : 3 modèles MODIFIER, sans neuf ni tag posé.
 * Signe + du terme en x de l'équation (e02fb162 V1), condition n > k (f796ffc0 V4), deux variations
 * pour que la forme de l'égalité ne donne plus la réponse (0d2edda7, publié). Les tags relevés sont
 * exigés à l'identique. Décision de David du 2026-10-24 (copie figée dans
 * tests/integration/fixtures/passe-lycee-retouches-2.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Passe lycée',
	nom: 'retouches 2 (défauts restés ouverts)',
	migration: 'supabase/migrations/20261024120000_passe_lycee_retouches_2.sql',
	fixture: 'tests/integration/fixtures/passe-lycee-retouches-2.json',
	taille: 3,
	gardeStatut: true,
	gardeRangementNeufs: true
});
