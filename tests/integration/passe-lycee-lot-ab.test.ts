/**
 * Passe lycée, lot MODIFIER — lots A + B (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261024001000_passe_lycee_lot_ab` : 6 modèles du lycée perdent les variations qui
 * relèvent d'un autre point ou resserrent leurs nombres, puis reçoivent le tag de leur point ; 3
 * d'entre eux sont scindés, la variation retirée partant dans un modèle neuf rangé et tagué sur son
 * propre point (TSPE-323, TEXP-357, TEXP-316). f3e68e4b garde son tag TCOMP-302. D'après la liste
 * VALIDÉE par David (docs/wip/passe-lycee/analyse/lot-modifier.md, copie figée dans
 * tests/integration/fixtures/passe-lycee-lot-ab.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Passe lycée',
	nom: 'lots A + B (nombres, variations)',
	migration: 'supabase/migrations/20261024001000_passe_lycee_lot_ab.sql',
	fixture: 'tests/integration/fixtures/passe-lycee-lot-ab.json',
	taille: 6,
	neufs: 3
});
