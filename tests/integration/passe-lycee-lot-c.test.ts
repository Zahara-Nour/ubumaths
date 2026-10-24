/**
 * Passe lycée, lot MODIFIER — lot C (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261024002000_passe_lycee_lot_c` : 10 modèles du lycée changent de consigne, d'énoncé
 * ou de corrigé pour tenir dans leur point, puis reçoivent le tag de ce point ; 646b4cd3 (C4,
 * TSPE-376) reçoit son tag sans changer de contenu. D'après la liste VALIDÉE par David
 * (docs/archive/wip/passe-lycee/analyse/lot-modifier.md, copie figée dans
 * tests/integration/fixtures/passe-lycee-lot-c.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Passe lycée',
	nom: 'lot C (consignes, énoncés, corrigés)',
	migration: 'supabase/migrations/20261024002000_passe_lycee_lot_c.sql',
	fixture: 'tests/integration/fixtures/passe-lycee-lot-c.json',
	taille: 11,
	tagsSeuls: 1
});
