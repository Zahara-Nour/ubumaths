# 0005 — Publication par élément, accès hérité de la classe

- **Statut** : acceptée (mise en service le 2026-09-14)
- **Date** : 2026-09-13 · **Décidée par** : David

## Contexte

« Mon cours » devait permettre de publier un chapitre au fur et à mesure, de le réutiliser d'une année
à l'autre, et de gérer les élèves qui arrivent ou partent en cours d'année.

## Décision

| Sujet                     | Décision                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------- |
| Publication               | **Par élément** (`<contenu>.published_at`), pas par rubrique                           |
| Publier une fiche         | La **distribue** à la classe, un clic, sans confirmation                               |
| Dépublier une fiche       | Retire du chapitre, **laisse l'affectation** (l'élève garde son travail)               |
| Accès élève               | **Hérité de la classe**, résolu à la volée (même seed) — pas matérialisé par élève     |
| Sortie de classe          | L'élève est **archivé** : relit ce qu'il a reçu, ne reçoit plus rien                   |
| Modèles de chapitre       | Emportent les fiches ; la mise à jour **n'efface rien**                                |
| Lien modèle ↔ chapitre   | Le chapitre d'origine est une **instanciation ordinaire** (pas de `source_chapter_id`) |
| Documents                 | Plafond **25 Mo**, téléversement **direct** navigateur → storage                       |
| Quiz de chapitre          | Réutilise le moteur de questions                                                       |
| Variations d'une question | **Tirage par élève**                                                                   |

## Écarté

- Distribution matérialisée par élève : un élève inscrit après la publication perdrait ses fiches
  **en silence** (figé par `tests/integration/eleve-inscrit-apres-publication.test.ts`).
- Upload via l'API : Vercel plafonne le corps de requête bien sous 25 Mo.
- Quiz de chapitre « vrai/faux » ou à énoncés propres.

## Conséquences

- Les policies testent `published_at <= now()`, jamais `is not null`.
- Une fiche publiée cumule **deux gardes** : publiée dans le chapitre ET distribuée.
- Les variations d'un même modèle doivent être **de difficulté équivalente** (tirage par élève).
- Un plafond de taille a deux gardes : `storage.buckets.file_size_limit` ET le CHECK `valid_file_size`.
