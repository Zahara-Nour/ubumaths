/**
 * Chantier « questions-1spe-demonstrations », lot 4 : étapes à ranger (Supabase local requis)
 * ===========================================================================================
 *
 * Migration `20261103194133_questions_1spe_demonstrations_etapes_contenu` : 14 modèles MODIFIER,
 * sans neuf ni tag posé. Chaque démonstration publiée reçoit une variation de plus, la dernière
 * (```ranger, `signe: aucun`) et ses specs ; les trois premières variations et les specs d'avant ne
 * changent pas. Les tags relevés sont exigés à l'identique. Décision de David du 2026-11-03 (D2 ;
 * copie figée dans tests/integration/fixtures/questions-1spe-demonstrations-etapes-contenu.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Questions 1re spé, démonstrations',
	nom: 'lot 4, étapes à ranger',
	migration: 'supabase/migrations/20261103194133_questions_1spe_demonstrations_etapes_contenu.sql',
	fixture: 'tests/integration/fixtures/questions-1spe-demonstrations-etapes-contenu.json',
	taille: 14,
	gardeRangementNeufs: true
});
