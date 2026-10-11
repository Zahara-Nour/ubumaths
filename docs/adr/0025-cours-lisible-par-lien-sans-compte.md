# 0025 — Le cours d'une classe est lisible par lien, sans compte

- **Statut** : acceptée — amende l'ADR 0005 (accès hérité de la classe) ; mise en œuvre close le
  2026-10-12 (#1150, #1158 ; journal `docs/archive/wip/cours-partageable-progress.md`)
- **Date** : 2026-10-12 · **Décidée par** : David

## Contexte

Tous les élèves n'ont pas de compte. Le cahier de texte est déjà lisible par lien depuis #174
(`class_journal_share_tokens`, route `(public)/cahier/[token]`). Le cours, lui, n'est lisible que par
un élève inscrit dans la classe : l'ADR 0005 fait **hériter l'accès de la classe**, et toutes les
policies de « Mon cours » passent par `is_class_student()`.

## Décision

Un **lien de lecture du cours**, par classe, sur le modèle exact du lien du cahier :

| Sujet               | Décision                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Lien                | **Distinct de celui du cahier** : table `class_course_share_tokens`, révocation séparée    |
| Porte d'entrée      | **Des fonctions `SECURITY DEFINER` seulement** ; `anon` ne lit aucune table du cours       |
| Ce qui est lisible  | Chapitres visibles, contenus `published_at <= now()` : plan, documents, checklists (texte) |
| Fiches              | Publiées dans un chapitre visible **ET** distribuées à la classe, en PDF lecture seule     |
| Séries              | Entraînement libre automaths, sans note (la composition est dans l'URL)                    |
| Réservé aux comptes | **Masqué** : exercices notés, quiz, révisions, progression des checklists                  |
| Documents privés    | Le serveur vérifie lien + document, puis renvoie vers une URL signée courte                |
| Durée de vie        | Expire le 31 août ; un seul lien actif par classe ; révoquer = désactiver                  |

## Invariants

- Le lien **ne fait que lire** ; il n'inscrit personne. Jamais de chemin vers `classes.join_code`.
- Il ne montre **rien de plus** que ce qu'un élève de la classe voit, et rien de personnel.
- Révoqué, expiré, inexistant, classe archivée : **la même réponse** (`null`, puis 404).
- Le jeton du cahier n'ouvre pas le cours, et inversement.
- Pages publiques en `noindex`.

## Écarté

- **Un seul lien pour le cahier et le cours** : tout ou rien, impossible de partager l'un sans l'autre.
- **Une colonne de portée sur `class_journal_share_tokens`** : modifier une table et une fonction en
  production, où un filtre oublié ouvrirait le cours avec le lien du cahier.
- **Une policy `anon` sur les tables du cours** : c'est l'erreur du finding H8 (audit d'août) ; une
  policy permissive se combine en OU avec les autres.
- **Contenus réservés affichés verrouillés** : bruit pour un élève qui n'a pas de compte.

## Conséquences

- Les fonctions refont à la main les gardes des policies élève (chapitre visible, `published_at`,
  distribution des fiches) : toute nouvelle garde côté élève doit y être reportée.
- Un nouveau type de contenu de chapitre n'est **pas** lisible par lien tant qu'on ne l'ajoute pas
  explicitement à la fonction.
