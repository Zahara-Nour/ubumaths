/**
 * Lot 2 bis, lot A « resserrer les nombres tirés » — (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261021090000_lot_2bis_resserrer_nombres` : 39 modèles du CP à la 4e reçoivent
 * leur nouveau contenu (bornes, variations, corrigés, specs) puis le tag de leur point, d'après la
 * liste VALIDÉE par David (docs/archive/wip/arbre-notions/analyse/lot-2bis-modifications.md, copie figée
 * — contenu d'avant et d'après — dans tests/integration/fixtures/lot-2bis-nombres.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	nom: 'resserrer les nombres tirés',
	migration: 'supabase/migrations/20261021090000_lot_2bis_resserrer_nombres.sql',
	fixture: 'tests/integration/fixtures/lot-2bis-nombres.json',
	taille: 39
});
