---
name: couvrir-niveau
description: Couvrir les points du programme d'un niveau en modèles de questions (relevé, vérification de l'existant, classement des points sans modèle, création des outils qui manquent (nouveaux blocs, gestes de réponse), lots, brouillons en prod, nœud + tag par migration, page à cocher, publication). Utiliser quand David dit « couvre le CE1 », « compléter les modèles de 6e », « quels points du niveau X n'ont pas de modèle », ou reprend un lot de modèles de questions. Exige le niveau avant tout travail.
---

# Couvrir un niveau en modèles de questions

Démarche complète : [docs/pratiques/couvrir-un-niveau.md](../../../docs/pratiques/couvrir-un-niveau.md).
Ce skill en est le déroulé ; le document fait foi pour chaque étape, les gabarits et les pièges.
Chantier de référence : le CP ([journal](../../../docs/wip/questions-progress.md)).

## 0. Avant tout

- **Le niveau** (`CP`, `CE1`… `6`… `2de`) : sans lui, le demander et s'arrêter.
- Un chantier par niveau : journal `docs/wip/questions-<niveau>-progress.md` (bloc « Reprendre
  ici »), worktree `../ubumaths-wt-questions-<niveau>` le temps d'une PR.
- Vocabulaire de [CONTEXT.md](../../../CONTEXT.md) : branche → notion → sous-notion, point,
  modèle, variation. Jamais les noms de colonnes devant David.

## 1. Relevé et état des lieux (une fois par niveau)

1. Relevé MCP prod en lecture seule (requêtes du § 1 de la doc) : points du niveau avec leur
   nombre de modèles ; modèles du niveau avec statut, nœud, tags.
2. Bornes : `docs/systeme/programmes/bornes/` (le cycle du niveau).
3. Vérifier chaque modèle existant contre les bornes (plages ET corrigé) ; modèles non tagués :
   point du niveau, d'un niveau suivant, ou rien.
4. Classer chaque point sans modèle : **A** texte, **B** outil existant, **C** outil neuf,
   **D** non évaluable.
5. Écrire tout cela dans le journal, puis **questions à David** (ordre des outils, corrections,
   points à trancher). **Attendre ses réponses** ; une question sans réponse n'est pas tranchée.

## 1 bis. Créer les outils qui manquent (classe C)

**D'abord le catalogue** des outils existants (doc, § 3 bis) : tableau de variations, cercle
trigo, courbes et grapheur, droite graduée, arbres, statistiques, géométrie (**en refonte** :
lire `figure-et-choix` et `geometrie-validation`), horloge, opérations posées, collection,
monnaie ; réponses en case, QCM (**en cours de réécriture en case « choix »**, chantier
`figure-et-choix` : demander à David la forme à écrire tant que ce n'est pas en prod), construire,
figure à compléter. Un point classé C à tort coûte
un chantier.

Un point qui demande un outil absent n'est pas abandonné : je **propose l'outil** (bloc ubumark
d'affichage, QCM de dessins, geste de réponse comme « construire » ou « placer »), ce qu'il
couvre (ce niveau et les suivants) et sa place dans l'ordre des lots. David décide.

- Chantier à part (worktree, journal, phase 0 avec la syntaxe du bloc en exemples), ADR si la
  décision est durable.
- Recette technique : `docs/systeme/ubumark.md` § « Comment étendre — nouveau bloc spécial » ;
  patrons `monnaie`, `collection`, `MonnaieConstruire` (doc, § 3 ter).
- Par paliers : affichage, puis geste ; une PR et une page de démo par palier.
- Les modèles qui s'en servent restent en brouillon jusqu'au `deploy:prod` qui livre le bloc.

## 2. Un lot (3 à 10 modèles, un thème) — une PR de fichiers, une PR de migration

1. **Phase 0** en français : point (un seul) et sous-notion de chaque modèle, variations,
   plages, niveaux numérotés, forme de réponse, **question d'accès** de la migration. Attendre
   la validation ; consigner les décisions dans le journal.
2. **Écrire** : script `docs/wip/questions/lot-<x>.py` (gabarit `lot-c.py`) → JSON de
   `scripts/questions/<niveau>-<lot>/` ; `testSpecs` justes ET erreurs typiques ;
   `create-questions` en simulation tout vert ; essai en base **locale** (`.env.local` chargé) et
   modèles joués dans l'aperçu admin. PR des fichiers (revue : aucune, contenu), merge.
3. **Prod** : `deploy:prod` si un bloc neuf l'exige (David seul) ; **David** lance
   `create-questions --publier` (brouillons) ; relever les `id`.
4. **Migration nœud + tag** (gabarit `20261026210000_questions_cp_c_rangement_tags.sql` + son
   test d'intégration) : test rouge sans la migration puis vert, `security-auditor`, CI verte,
   merge, `db:migrate` depuis le dépôt principal, vérification en prod.
5. **Page à cocher** (artefact `db`, un exemple par variation tiré par le vrai générateur, rendu
   vérifié à 390 px, ouverte dans Chrome) ; lire et **compter** les verdicts en base.
6. **Publication** : script de publication en simulation, puis **David** le lance avec
   `--publier` ; relire `published` en base. Journal + « Reprendre ici » à jour, commit direct.

## 3. Règles

- Rien n'est écrit en prod par moi : `create-questions --publier`, `--mettre-a-jour` et la
  publication sont lancés par David (`!`), je vérifie ensuite.
- Corriger un modèle en prod : instantané d'abord (§ 7 de la doc).
- Un outil neuf (classe C) = un chantier à part, avec sa propre phase 0 ; jamais caché dans un
  lot de modèles.
- Relire les pièges (§ 9 de la doc) avant d'écrire un lot.
