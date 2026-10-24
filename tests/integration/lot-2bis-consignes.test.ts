/**
 * Lot 2 bis, lot C « changer la consigne ou l'affichage » — (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261021120000_lot_2bis_consignes` : 16 modèles du CP à la 4e changent de consigne ou
 * d'affichage (comparaisons « a … b » avec <, = et >, symbole ÷, tableaux habillés en grandeurs,
 * échelle « 1 cm représente … », écriture simplifiée des relatifs, factorisation par une
 * constante), avec leurs corrigés, leurs specs et, pour les comparaisons, `options` (choix non
 * mélangés) ; puis reçoivent le tag de leur point, d'après la liste VALIDÉE par David
 * (docs/archive/wip/arbre-notions/analyse/lot-2bis-modifications.md, copie figée — contenu d'avant et
 * d'après — dans tests/integration/fixtures/lot-2bis-consignes.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	nom: 'changer la consigne ou l’affichage',
	migration: 'supabase/migrations/20261021120000_lot_2bis_consignes.sql',
	fixture: 'tests/integration/fixtures/lot-2bis-consignes.json',
	taille: 16
});
