# Chantier `mots-cliquables` : moins de mots soulignés

## Reprendre ici

_Mis à jour le 2026-11-16, à l'ouverture du chantier._

- **État** : phase 0, comportements écrits, aucun code · **Prochaine action** : validation par David des
  comportements N1–E1 et réponses aux Q1–Q2, puis tests rouges · **En attente de David** : Q1–Q2 ci-dessous, validation N1–E1 ·
  **Pièges en cours** : Q2 revient sur la décision 4 du 2026-10-08 (`lexique-progress.md` : définitions
  disponibles dans les corrections) ; le niveau de lecture sert aussi au choix des définitions montrées ·
  **Worktree / branche** : aucun ; au premier code → `ubumaths-wt-mots-cliquables`

## Origine

Retour de David du 2026-11-16, en relisant `/dev/corrections` (chantier
[`corrections-modeles`](corrections-modeles-progress.md)) : les mots soulignés partout alourdissent la
lecture des cartes ; à réserver aux mots qui ne servent pas à tout bout de champ.

Mesures (base locale = copie de la prod, 2 297 modèles publiés) :

- 20 entrées sur 675 sont « jamais souligné » (calcul, nombre, chiffre, opération, résultat…).
- « jamais souligné » ne vaut que pour son entrée : `calcul` l'est, `calculer` (CE1, formes
  `calcule`, `calculez`) ne l'est pas → « Calcule » souligné dans 437 modèles. Idem verbes de consigne :
  range/ordonne 127, représente 83, vérifie 77, compare 76, démontre 72, résous 68…
- Noms les plus fréquents : fonction 366, équation 193, moyenne 191, entier 181 (CP), courbe 172,
  fraction 171 (CE1), somme 170 (CP), repère 158, produit 149 (CE1), triangle 119 (CP)…
- Niveau de lecture d'un prof ou d'un visiteur = le **plus petit** niveau de la question
  (`lexicon/grade.ts`) : sur une question 4e/3e, tout le primaire est souligné.

## Décidé par David (2026-11-16)

- Pas de liste « jamais souligné » allongée à la main : deux règles automatiques.
- **R1 Mots récents** : un mot n'est souligné que s'il apparaît au niveau de l'élève ou l'année d'avant.
- **R2 Énoncé seulement** : rien de souligné dans la correction (résultat attendu, correction écrite).
- **R3 Prof et visiteur** : niveau de lecture = le plus **haut** niveau de la question.
- Chantier séparé de `corrections-modeles`.
- **Q3 → R4 (2026-11-16) : aucun mot souligné automatiquement sur une question de cours** (carte de cours,
  ou modèle marqué « question de cours »), comme prévu par la décision 4 du 2026-10-08 jamais appliquée.
  Raison (reconstruite, acceptée par David) : le mot cliquable donnerait la réponse (« suite géométrique »
  sur « définition d'une suite géométrique »). Marquage d'auteur `[mot]{.def}` toujours possible.
- **R5 (2026-11-16) : verbes de consigne « jamais souligné »** (liste fermée, décision 1 du 2026-10-08) —
  R1 ne suffit pas : `calculer` (CE1) resterait souligné sur une question de CE1/CE2, sans intérêt à aucun
  niveau. Entrées : calculer, comparer, vérifier, déterminer, ordonner (formes range/rangez), représenter,
  tracer, décomposer, convertir, justifier. (compléter, écrire, donner, entourer, colorier, placer, lire,
  citer, expliquer : pas d'entrée, donc jamais soulignés.) **Restent soulignables** (notions) : résoudre,
  développer, factoriser, simplifier, réduire, démontrer, encadrer, arrondir.
  - Fait **en base locale** le 2026-11-16 (`update … set auto_link=false`, 10 lignes). **Prod : à faire par
    David** dans l'admin du dictionnaire (case « jamais souligné »), ou par un lot du chantier.

## Phase 0 — comportements (à valider)

Nominal :

- **N1** Élève de 4e : « Calcule » (CE1), « fraction » (CE1), « somme » (CP) **non** soulignés ;
  « équation » (5e) souligné ; « fonction » (3e) non souligné (pas encore à son niveau, inchangé).
- **N2** Élève de CE2 : « fraction » (CE1) souligné ; élève de CM1 : non souligné.
- **N3** Flash-card, Saisie, fin de série : l'énoncé du recto garde ses mots ; le verso (résultat attendu,
  énoncé rempli, correction écrite) et le verso de `CorrectionCard` n'en ont aucun.
- **N4** Prof ou visiteur sur une question 4e + 3e : lu comme un élève de 3e.

Limites :

- **L1** `[mot]{.def}` force un mot même ancien ; `{.nodef}` et « jamais souligné » bloquent toujours.
- **L2** Élève de CP : pas d'année d'avant, seuls les mots du CP.
- **L3** Filières : « l'année d'avant » se compte en années scolaires (`schoolYear`) : 1re spé → 2de ;
  un mot partagé avec une filière (`sharedWith`) suit le niveau où ce lecteur le rencontre (`gradeMetBy`).
- **L4** Toujours la première occurrence seulement (inchangé) ; si elle est trop ancienne, l'occurrence
  suivante ne prend pas le relais.

Erreur :

- **E1** Niveau de lecture inconnu (question sans niveau, profil sans niveau) : aucun mot souligné
  (aujourd'hui : aucun aussi, `lexiconGrade` rend `null`).

## Questions (en attente de David)

- **Q1 : la fiche montrée au clic.** R3 change aussi les définitions affichées à un prof ou un visiteur
  (aujourd'hui les plus simples, celles du plus petit niveau). Garder le plus petit niveau pour la fiche
  et le plus haut pour choisir quoi souligner ? Reco : oui, deux usages distincts.
- **Q2 : R2 revient sur la décision 4 du 2026-10-08** (« définitions disponibles … corrections »).
  Confirmes-tu ? Reco : oui, la correction se lit d'un trait ; le mot reste cliquable dans l'énoncé.
- ~~**Q3 : cartes et questions de cours.**~~ Tranchée → R4.
  Texte d'origine : La décision 4 disait déjà « pas de repérage automatique sur une
  question de cours ou une carte de cours » : **pas appliqué** (vérifié le 2026-11-16 :
  `provideQuestionLexicon(() => instance.grades)` dans `FlashCard`, `CorrectionCard`, `QuestionCard`, sans
  test du type ni de `courseQuestion`). L'appliquer dans ce chantier ? Reco : oui.

## Journal

- 2026-11-16 : chantier ouvert (retour de David sur `/dev/corrections`), mesures, R1–R3 validées ; R4 (question de cours) validée ; R5 (verbes de consigne) validée, faite en local.
