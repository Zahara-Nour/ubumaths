/**
 * Lot 2 bis, lot B « retirer des variations » — (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261021100000_lot_2bis_retirer_variations` : 7 modèles du CP et du collège perdent
 * les variations qui relèvent d'un autre point (specs réindexées, variable commune devenue inutile
 * retirée) puis reçoivent le tag de leur point, d'après la liste VALIDÉE par David
 * (docs/archive/wip/arbre-notions/analyse/lot-2bis-modifications.md, copie figée — contenu d'avant et
 * d'après — dans tests/integration/fixtures/lot-2bis-variations.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	nom: 'retirer des variations',
	migration: 'supabase/migrations/20261021100000_lot_2bis_retirer_variations.sql',
	fixture: 'tests/integration/fixtures/lot-2bis-variations.json',
	taille: 7
});
