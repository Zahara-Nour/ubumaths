/**
 * Lot 2 bis, lot D « scinder en deux modèles » — (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261021150000_lot_2bis_scissions` : 3 modèles de 5e « additionner ou soustraire des
 * fractions » sont scindés. Chacun garde son identifiant, ses variations d'addition et reçoit le tag
 * 5-026 ; un modèle neuf reçoit ses variations de soustraction et le tag 5-123. f92d63a6 et sa moitié
 * neuve acceptent le résultat non simplifié (`options`). D'après la liste VALIDÉE par David
 * (docs/wip/arbre-notions/analyse/lot-2bis-modifications.md, copie figée — contenu d'avant, d'après
 * et des modèles neufs — dans tests/integration/fixtures/lot-2bis-scissions.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	nom: 'scinder en deux modèles',
	migration: 'supabase/migrations/20261021150000_lot_2bis_scissions.sql',
	fixture: 'tests/integration/fixtures/lot-2bis-scissions.json',
	taille: 3,
	neufs: 3
});
