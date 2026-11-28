# Fixtures des migrations « nœud et tag » générées

Une fixture par migration `supabase/migrations/<horodatage>_questions_<lot>_rangement_tags.sql`
écrite par `scripts/questions/migration-rangement.ts` — ne pas éditer à la main. Elle porte, pour
chaque modèle rangé, le chemin de son nœud et le code de son point (`ranges`), et pour chaque
modèle qui gagne un niveau, ses niveaux relevés en prod et ceux posés (`niveaux`).

`tests/integration/migrations-rangement-tags.test.ts` les rejoue toutes : copies des modèles,
migration, nœuds, tags, niveaux, gardes, rollback. Démarche : `docs/pratiques/couvrir-un-niveau.md`
§ 6.

Les migrations de rangement écrites à la main avant le générateur (2026-11-22) gardent leur test
propre (`tests/integration/questions-*-rangement-tags.test.ts`) et n'ont pas de fixture ici.

Une fixture désigne des nœuds et des points par leur nom et leur code. Si une refonte de l'arbre
renomme un nœud ou archive un point **après** que la migration a été jouée en prod, la fixture ne
peut plus être rejouée : la supprimer dans la PR de la refonte (elle ne prouve plus rien).
