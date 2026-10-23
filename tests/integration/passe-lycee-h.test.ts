/**
 * Passe lycée, scissions PR 3 (H) : 10 modèles dans leur vrai programme (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261024010000_passe_lycee_h` : 10 modèles rangés en 1re spé, hors programme à ce
 * niveau, passent dans leur vrai programme (Tle spé ou 2de) : leur niveau scolaire change, et leurs
 * neufs naissent au même niveau. 3 MODIFIER sans neuf (trigonométrie sur [−π ; π], équations sans
 * solution) ; 7 scissions, dont 2 dédoublements (une case par modèle pour réunion, intersection,
 * complémentaire ; la V3 au connecteur tiré pour « et » / « ou »). 9 modèles neufs ; 68db64b0 et
 * 7eec7032 changent de nœud (R2). D'après lot-modifier.md § 4, VALIDÉ par David (copie figée dans
 * tests/integration/fixtures/passe-lycee-h.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Passe lycée',
	nom: 'H, vrai programme',
	migration: 'supabase/migrations/20261024010000_passe_lycee_h.sql',
	fixture: 'tests/integration/fixtures/passe-lycee-h.json',
	taille: 10,
	neufs: 9,
	deplaces: 2,
	changentDeNiveau: 10,
	gardeStatut: true,
	gardeRangementNeufs: true
});
