/**
 * Passe lycée, scissions PR 2 : réécritures (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261024004000_passe_lycee_reecritures` : 7 modèles du lycée qui ne se partagent pas en
 * répartissant leurs variations. E3 : la question « arithmétique, géométrique, ou ni l'un ni l'autre ? »
 * devient binaire et garde toutes ses variations (origine « arithmétique ? », neuf « géométrique ? ») ;
 * les deux modèles qui portent un tag de 1re techno restent INTACTS et reçoivent deux neufs. S6 : une
 * case par modèle. S11 : trois modèles, V2 enrichie. 10 modèles neufs ; 30b597c3 change de nœud (R2).
 * D'après scissions-notes.md, VALIDÉ par David (copie figée dans
 * tests/integration/fixtures/passe-lycee-reecritures.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Passe lycée',
	nom: 'réécritures',
	migration: 'supabase/migrations/20261024004000_passe_lycee_reecritures.sql',
	fixture: 'tests/integration/fixtures/passe-lycee-reecritures.json',
	taille: 7,
	neufs: 10,
	deplaces: 1,
	tagsSeuls: 2,
	gardeStatut: true,
	gardeRangementNeufs: true
});
