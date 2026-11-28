# Chantier `mots-cliquables` : moins de mots soulignés

## Reprendre ici

_Mis à jour le 2026-11-17, après #2757 — chantier clos._

- **État** : R1–R6 en prod (v0.93.0), vérifiées par David (téléphone, prod) ; homonymes chez le prof/visiteur laissés tels quels · **Prochaine action** : aucune · **En attente de David** : rien · **Pièges en cours** : aucun (le durable est dans `docs/systeme/dictionnaire.md`) · **Worktree / branche** : aucun ; `ubumaths-wt-mots-cliquables` et `feat/mots-cliquables-r6` retirés

## Origine

Retour de David du 2026-11-16, en relisant `/dev/corrections` (chantier
[`corrections-modeles`](../../wip/corrections-modeles-progress.md)) : les mots soulignés partout alourdissent la
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
    David** dans l'admin du dictionnaire (case « jamais souligné »), ou par un lot du chantier. → **migration** `20261116205041_dictionnaire_verbes_consigne_jamais_soulignes`
    (choix de David), question d'accès tranchée : personne ; prod mesurée le 2026-11-16 : les 10 à `true`.

- **R6 (2026-11-16) : soulignement masqué par défaut, interrupteur sur la carte.** Même après R5, trop de
  mots soulignés (« indigeste », David). Un bouton sur la carte (icône livre, « Mots du dictionnaire »)
  affiche le soulignement ; choix mémorisé **sur l'appareil** (localStorage, comme
  `chiphre:correction-detail`), valable pour toutes les cartes. Même défaut et même bouton pour un prof
  (les aperçus montrent ce que voit l'élève).
  - **Masqué, à la souris** : mots cliquables, soulignement au survol.
  - **Masqué, au doigt** (pas de survol) : mots **non** cliquables (pas de fiche ouverte par surprise).
  - **Masqué, au clavier** : mots hors de l'ordre de tabulation ; le bouton les rend atteignables.
  - Pas de critère de fréquence en plus : R1 allège déjà la vue affichée.
  - Ordre : R6 d'abord (lecture digeste tout de suite), R1, R2, R4 dans la même PR ou juste après.

## Phase 0 — comportements (validés par David le 2026-11-16)

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

Bascule (R6) :

- **B1** Première visite : aucun mot souligné ; bouton « Mots du dictionnaire » visible sur la carte
  (énoncé), `aria-pressed="false"`.
- **B2** Clic sur le bouton : les mots repérés (R1, R4, R5, `{.def}`) apparaissent soulignés, sur cette carte
  et les suivantes ; rechargement de la page : toujours affichés (mémoire de l'appareil).
- **B3** Masqué, souris : survol d'un mot repéré → souligné ; clic → sa fiche.
- **B4** Masqué, écran tactile (`(hover: none)`) : toucher un mot ne fait rien.
- **B5** Masqué, clavier : Tab va du bouton à la case réponse sans s'arrêter sur les mots ; affiché : les
  mots reprennent leur place dans la tabulation.
- **B6** Aucun mot repéré sur la carte (question de cours, R4 ; énoncé sans mot) : pas de bouton.
- **B7** Mémoire illisible (navigation privée, stockage bloqué) : masqué, aucune erreur.

Erreur :

- **E1** Niveau de lecture inconnu (question sans niveau, profil sans niveau) : aucun mot souligné
  (aujourd'hui : aucun aussi, `lexiconGrade` rend `null`).

## Questions (tranchées par David le 2026-11-16 : oui aux deux recos)

- **Q1 → oui** : prof et visiteur, plus petit niveau pour la fiche, plus haut pour choisir quoi souligner.
- **Q2 → oui** : rien de souligné dans la correction (revient sur la décision 4 du 2026-10-08).
- Texte d'origine — **Q1 : la fiche montrée au clic.** R3 change aussi les définitions affichées à un prof ou un visiteur
  (aujourd'hui les plus simples, celles du plus petit niveau). Garder le plus petit niveau pour la fiche
  et le plus haut pour choisir quoi souligner ? Reco : oui, deux usages distincts.
- **Q2 : R2 revient sur la décision 4 du 2026-10-08** (« définitions disponibles … corrections »).
  Confirmes-tu ? Reco : oui, la correction se lit d'un trait ; le mot reste cliquable dans l'énoncé.
- ~~**Q3 : cartes et questions de cours.**~~ Tranchée → R4.
  Texte d'origine : La décision 4 disait déjà « pas de repérage automatique sur une
  question de cours ou une carte de cours » : **pas appliqué** (vérifié le 2026-11-16 :
  `provideQuestionLexicon(() => instance.grades)` dans `FlashCard`, `CorrectionCard`, `QuestionCard`, sans
  test du type ni de `courseQuestion`). L'appliquer dans ce chantier ? Reco : oui.

- **Homonymes chez le prof et le visiteur → laisser tel quel** (David, 2026-11-17, reco suivie) : sur une question de translation 4e + 3e, la fiche d'« image » montre « image (transformation) » (4e) et « image (fonction) » (3e, lu par le secours), comme pour un élève de 3e ; pas de choix du sens selon le contexte de la question.

## Journal

- 2026-11-16 : chantier ouvert (retour de David sur `/dev/corrections`), mesures, R1–R3 validées ; R4 (question de cours) validée ; R5 (verbes de consigne) validée, faite en local.
- 2026-11-16 : #2732 (migration R5) mergée ; `db:migrate` appliqué et vérifié en prod.
- 2026-11-16 : Q1, Q2 tranchées (oui) ; N1–E1 et B1–B7 validés.
- 2026-11-16 : R6 validée (masqué par défaut, bouton sur la carte, mémoire de l'appareil ; doigt : non cliquable masqué ; prof : même défaut) ; B1–B7 écrits.
- 2026-11-17 : R6 codée (worktree `ubumaths-wt-mots-cliquables`) : `visibility.svelte.ts` (choix de l'appareil), `card-terms.svelte.ts` (mots d'une carte), `can-hover.svelte.ts`, `LexiconToggle` sur `QuestionCard`, `FlashCard` (recto), `CorrectionCard` (en-tête) ; B1–B7 verts. Hors carte (démo, structure) : mots toujours soulignés.
- 2026-11-17 : #2741 (R6) mergée après revue (finding : carte de cours sans bouton, corrigé) ; vérification manuelle notée.
- 2026-11-17 : points de la revue de #2741 tranchés par David : écrans hybrides vus comme souris → **garder** ; bouton 32 px → **40 px** ; verso sans bouton → réglé par R2.
- 2026-11-17 : R1–R4 codées (worktree `ubumaths-wt-mots-cliquables-r14`, le premier reste figé pour le serveur 5177) : `LinkOptions` (`recentOnly`, `auto`) dans `linker.ts`, `questionReadingGrades` (R3), `LexiconReading` dans `lexicon-context.ts`, `LexiconOff` (R2), `isCourseQuestion` passé à `provideQuestionLexicon` (R4). Anciens tests passés à des mots de 6e (R1) ; `/dev/mots-cliquables` : « aire » et « carré » marqués `{.def}`.
- 2026-11-17 : PR #2747 ouverte ; revue `code-reviewer` : aucun bloquant ; corrigé : clé de première occurrence d'un homonyme marqué `{.def}` (sens ancien + récent), test des homonymes, commentaires.
- 2026-11-17 : #2747 (R1–R4) mergée, CI verte ; worktree `ubumaths-wt-mots-cliquables-r14` retiré.
- 2026-11-17 : `deploy:prod` → v0.93.0 (la 0.92.0 avait sa CI rouge : job cliquet bloqué 20 min, sans lien avec le code) ; R6 et R1–R4 en prod.
- 2026-11-17 : test d'écran demandé par David (« je te suis ») : prof/visiteur, question 4e + 3e, « fonction » souligné, fiche avec sa définition de 3e (niveau de secours de `lexiconCard`, jusque-là sans test) ; vérifié rouge sans le secours ; #2757 mergée, CI verte.
- 2026-11-17 : vérifications de #2741 et #2747 faites par Claude dans Chrome, en dev sur `main` (= v0.93.0), comptes locaux fictifs (élève passé en 4e puis 1re spé le temps du test, remis en 6e), GIF `~/Downloads/verif-mots-cliquables-v0.93.gif`. Tout conforme : élève 4e, « Calcule », « calcul », « figure », « prix » non soulignés, « coefficient multiplicateur » et « parallélogramme » (5e) soulignés ; masqués par défaut, survol → souligné, clic → fiche, icône 40 × 40, choix gardé sur la carte suivante et au rechargement, Tab saute les mots masqués et s'y arrête affichés ; verso de flash-card et cartes de correction de fin de série sans mot ni icône ; carte de cours « dérivée » (élève 1re spé) sans mot ni icône, question ordinaire « dérivée » soulignée, « fonction » (3e) non ; visiteur et prof sur question 4e + 3e : « image », « translation » soulignés, « parallélogramme » non (R3), fiches pleines, dont « image (fonction) », sens de 3e lu par le secours. Aucune question 4e + 3e de la base ne contient de mot de 3e seul : ce cas reste couvert par le test de #2757. Non vérifiable ici : le doigt sur un vrai téléphone, la prod.
- 2026-11-17 : homonymes chez le prof/visiteur tranchés par David : laisser tel quel (les deux sens d'« image » sur une question de translation, comme un élève de 3e).
- 2026-11-17 : vérifications au doigt et en prod faites par David ; lignes #2741 et #2747 retirées de `verifications-manuelles.md` ; worktree `ubumaths-wt-mots-cliquables` retiré ; versement dans `docs/systeme/dictionnaire.md` (homonymes) ; journal archivé. Chantier clos.
