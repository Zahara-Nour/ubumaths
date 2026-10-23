/**
 * Passe lycée, lot des scissions (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261024003000_passe_lycee_scissions` : 50 modèles du lycée qui relèvent de plusieurs
 * points sont partagés ; l'origine garde son identifiant, le groupe de variations le plus fourni et
 * ses tags d'avant, chaque autre groupe part dans un modèle neuf (72 en tout) rangé et tagué sur ses
 * propres points. 6 origines changent de nœud (R2). D'après le plan VALIDÉ par David
 * (docs/wip/passe-lycee/analyse/scissions-plan.csv, copie figée dans
 * tests/integration/fixtures/passe-lycee-scissions.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Passe lycée',
	nom: 'scissions',
	migration: 'supabase/migrations/20261024003000_passe_lycee_scissions.sql',
	fixture: 'tests/integration/fixtures/passe-lycee-scissions.json',
	taille: 50,
	neufs: 72,
	deplaces: 6,
	gardeRangementNeufs: true
});
