# Chantier `versions-exercices` — versions d'un exercice, la fiche choisit la sienne

## Reprendre ici

_Mis à jour le 2026-11-25, phase 0 close (aucune PR encore)._

- **État** : phase 0 validée par David (« je suis tes recommandations ») → [ADR 0044](../adr/0044-versions-d-un-exercice.md), entrée « Version » de CONTEXT.md.
- **Prochaine action** : réponse de David à la **question d'accès** (ci-dessous), puis worktree `../ubumaths-wt-versions-exercices`, branche `feat/versions-exercices`, découpage en PR à proposer.
- **En attente de David** : question d'accès.
- **Pièges en cours** : le mot « version » a déjà trois autres sens dans le code (ADR 0044, Conséquences).
- **Worktree / branche** : pas encore créés.

## Décisions (2026-11-25)

Voir l'[ADR 0044](../adr/0044-versions-d-un-exercice.md) : historique 1, 2, 3… ; chaque version =
contenu complet (niveaux de guidage compris) + note ; modifiable sur place ; fiche d'identité commune
(titre compris) ; la fiche précise la version, dernière par défaut à l'import ; repère « version plus
récente » + bouton (confirmation si la fiche est distribuée) ; hors fiche = dernière ; version utilisée
non supprimable ; reprise = tout en version 1.

## Mesures (prod, lecture seule, 2026-11-25)

- 50 fiches, 424 exercices en fiche, 64 partagés par 2 ou 3 fiches, 12 affectations.
- 428 exercices ; niveaux de guidage : guidé 427, autonome 42, intermédiaire 5, personnalisé 0 ;
  aucune valeur tirée (0 exercice à variables).
- Modèles de questions : 2 390 sur 2 866 ont plusieurs variations, chacune avec son énoncé (2 390),
  sa correction (2 347), ses variables (2 342), ses cases (2 292) → définition de « variation »
  précisée dans CONTEXT.md (commit `a30618b58`).

## Question d'accès (avant tout SQL)

« Qui pourra lire quoi, qu'il ne pouvait pas lire avant ? » — proposition : **personne**. Une
version se lit exactement quand son exercice se lit (mêmes règles que `exercises`), s'écrit quand
l'exercice s'écrit ; l'élève lit la version de sa fiche par le même chemin qu'aujourd'hui.

## Écarts relevés en passant

- Formulaire d'exercice : carte « Variations » et toasts « Variation ajoutee », « Maximum 10
  variations autorisees » (mot contraire à CONTEXT.md, accents manquants).
