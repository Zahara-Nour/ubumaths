/**
 * Chantier « questions-6 » : contenu des 4 modèles d'origine du lot 5, scissions (Supabase local requis)
 * ==========================================================================================
 *
 * Migration `20261101121300_questions_6_ranger_contenu` : 4 modèles MODIFIER, sans neuf ni tag posé.
 * c9c3a8a3 (02), 378aa770 (03), afebbb91 (04, titre resserré, spec ajoutée en v1), ddf5d292 (08) perdent
 * les variations déplacées dans les 7 modèles neufs publiés le 2026-10-29. Les tags relevés (6-131,
 * 6-136, 6-133, 6-205) sont exigés à l'identique. Décision de David du 2026-10-28, accord du 2026-10-29
 * (copie figée dans tests/integration/fixtures/questions-6-ranger-contenu.json).
 * Méthode (copies de la prod, rejeu du fichier, rollback) : tests/helpers/database/lot-2bis-migration.ts.
 *
 * @vitest-environment node
 */
import { decrireLotModifier } from '../helpers/database/lot-2bis-migration';

decrireLotModifier({
	chantier: 'Questions 6e',
	nom: '06 et 07 du lot 4 en ranger',
	migration: 'supabase/migrations/20261101121300_questions_6_ranger_contenu.sql',
	fixture: 'tests/integration/fixtures/questions-6-ranger-contenu.json',
	taille: 2,
	gardeRangementNeufs: true
});
