# Fixtures des migrations de contenu de modèles publiés

Une fixture par migration `supabase/migrations/<horodatage>_questions_<lot>_contenu.sql`, écrite
avec elle par `scripts/questions/migration-contenu.ts` — ne pas éditer à la main. Elle porte, pour
chaque modèle, le contenu relevé en prod (`avant`) et celui du fichier du lot (`apres`).

`tests/integration/migrations-contenu-publie.test.ts` les rejoue toutes : copie des modèles,
migration, gardes, rollback. Démarche : `docs/pratiques/couvrir-un-niveau.md` § 7.
