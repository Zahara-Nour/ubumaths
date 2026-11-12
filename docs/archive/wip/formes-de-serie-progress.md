# Chantier `formes-de-serie` — redéfinir les formes d'une série et les traces enregistrées

Né le 2026-11-11 de la relecture de `cours-suites` (bouton différent entre flash-card et entraînement
sur une carte de cours). **Clos le 2026-11-12.**

## Reprendre ici

_Mis à jour le 2026-11-12, clôture après #2576._

- **État** : **clos** le 2026-11-12. Découpage entier mergé (#2543, #2547, #2548, #2551, #2554, #2559, #2565, #2570, #2576) ; migrations appliquées en prod. Durable déjà versé PR par PR : `docs/systeme/srs.md`, `evaluations.md`, `base-de-donnees.md`, `analytique-prof.md`, `conformite/`, `CONTEXT.md`, ADR 0037 et 0038 · **Prochaine action** : aucune ; suites ci-dessous (§ Suites) · **En attente de David** : vérifications manuelles #2565, #2554, #2551 dans `docs/wip/verifications-manuelles.md` (suivies là) · **Pièges** : `answer_parts` = texte libre de mineurs, affiché échappé (dans `srs.md`) ; `db:types` pas relancé après #2576 (fonctions de purge appelées par aucun code) · **Worktree / branche** : aucun

## Suites (futurs chantiers, non ouverts)

- **Régularité (P5)** : heatmap élève × semaine + Palotin de régularité (Q-C, § Besoins de suivi) — **fait** : chantier `regularite`, clos le 2026-11-12 (`regularite-progress.md`).
- **Saisie en séries de chapitre** : forme choisie par le prof (CHECK en base : Flash-cards / Contrôle blanc) ; migration additive, seulement si l'usage la demande.
- **Écrans prof et élève** sur les nouvelles traces : P3 taux par point / notion, P4 et E4 erreurs fréquentes, P6 bilan d'un contrôle, P7 durées trop courtes, P8 page de suivi d'un élève.
- **A1 durées ajustées** au temps observé (modèle : `recalculate_minesweeper_reference_times()`).
- **Suppression de `with_help` et `phase_blocage`** (jamais lus ; destructif, temps à part).

## Décisions de David (2026-11-11)

1. **Cinq formes** : Flash-cards · **Saisie** · **Contrôle blanc** · Course aux nombres · En classe.
   - **Flash-cards** : carte retournée, auto-évaluation, correction immédiate ; cartes de cours gardées.
   - **Saisie** (nouvelle) : l'élève tape, **la carte se retourne d'elle-même** après « Valider » (sa
     réponse face à la bonne, puis la correction) ; **pas de chrono** ; cartes de cours gardées,
     auto-évaluées.
   - **Contrôle blanc** (= l'actuel « Entraînement », `TestMode` `interactive`) : saisie, correction et
     note à la fin, pour préparer un contrôle ; note **non enregistrée** ; cartes de cours retirées.
   - Un **contrôle** assigné = même forme que le contrôle blanc, notée pour de vrai.
2. **Auto-évaluation : deux boutons seulement, « Réussi / Pas réussi »**, partout (flash-cards ET
   révisions SRS, qui ont aujourd'hui 4 boutons FSRS). Origines `student_self` et `srs` fusionnées
   en une seule. « Aller au plus simple pour les élèves. »
3. **Nom** : `srs_card_stats` = **« état de mémorisation »**. **Pas d'historique** des séances côté élève.
4. **Séances libres** (`test_sessions` + `test_answers` sans `evaluation_id`) : doublon avec les traces,
   à ne plus écrire **à condition que les traces enregistrent tout le nécessaire** (David : « je n'ai pas dit qu'il ne faut rien écrire »).

## Constats vérifiés (2026-11-11)

- Aujourd'hui : Flash-cards (`flash`), Entraînement (`interactive`, chrono par question, correction
  à la fin), Course, En classe ; cartes de cours retirées de l'Entraînement et de la Course
  (`seriesFormExcludesCourseCards`, `src/lib/questions/course-card.ts:44`). L'onglet « Entraînement »
  de l'aperçu `/dev/modeles` montre `CourseCardView` pour une carte de cours, forme qu'aucun élève ne voit.
- `FlashCard` sait déjà saisir + se retourner après une erreur (`/dev/carte-question`), inutilisé côté élève.
- **Traces** `skill_attempts` (élève, modèle, réussi, origine `auto`/`student_self`/`srs`/`teacher`, date) :
  base de tous les bilans (grille point × élève, top 10 à remédier, « Ma progression »). Pas de colonne
  de temps. `with_help` (toujours faux) et `phase_blocage` (quasi toujours vide) jamais lus.
- **`srs_card_stats`** (une par élève × modèle : état, prochaine révision, stabilité, difficulté,
  historique) : badges des grilles. `review_history[].timeSpent` lu seulement par l'anti-triche.
- **Séances libres** : seulement lues par l'export RGPD. En prod : 4 séances, 33 réponses (fin sept. → nov.).
  Pas de doublon de traces en Entraînement (vérifié en prod : traces = réponses).
- Histogramme des notes 1-4 (widget D de l'analyse de classe) : perd son sens avec 2 boutons.
- **Temps** : seule la fonction `recalculate_minesweeper_reference_times()` (Démineur, cron
  hebdomadaire : médiane 4 semaines par cycle × difficulté, minimum d'échantillons, bornes,
  historique) ajuste un temps de référence. Rien pour les questions ; modèle à reprendre.

## Propositions en attente

- Garder les traces **+ colonne de temps de réponse** (migration, question d'accès à poser) ;
  garder `srs_card_stats` ; arrêter d'écrire les séances libres ; contrôles inchangés.
- Futurs chantiers : taux de réussite par point/notion pour la classe ; page de suivi d'un élève
  côté prof ; bilan par question/notion des contrôles ; durées ajustées (mécanisme du Démineur).

## Besoins de suivi validés (David, 2026-11-11)

Point de départ pour décider du contenu d'une trace : on garde ce qu'un besoin validé exige, rien d'autre.

- **Prof, classe** : P1 top des points à remédier (existe) · P2 grille point × élève (existe) ·
  P3 taux de réussite par point et par notion · P4 erreurs fréquentes d'une question / d'un point ·
  **P5 régularité seulement** : qui utilise le site plus ou moins régulièrement, **sans dates précises**
  (vie privée ; la carte « activité par jour et par élève » actuelle va trop loin) — précisé le 2026-11-11 : **grille élève × semaine depuis la rentrée de septembre, vacances comprises** ; activité = travail de soi-même (pas les contrôles assignés) ; **la régularité DANS la semaine compte** (10 questions d'un coup ≠ régulier) → **validé** : par semaine, nombre de **jours actifs** (jour actif = au moins 5 réponses en formes autonomes, heure de Paris), sans dire lesquels ; affiché en **heatmap à une seule couleur** (couleur d'accent ; 0 vide, 1 très clair, 2-3 moyen, 4+ soutenu ; légende ; survol = palier, jamais le nombre exact ; repère des vacances ; mode sombre) ; côté élève : **Palotin validé** — ne parle qu'après une activité, jamais d'une absence ; aucune série perdue ; aucune comparaison ; aucune notification hors du site ; retour après pause accueilli sans durée ; moments : 1re activité de la semaine, retour après pause, 3/5/10 semaines actives d'affilée, notion acquise, question longtemps ratée enfin réussie, série terminée quel que soit le score ·
  **P6 validé** : bilan d'un contrôle par question et par notion ·
  **P7 durées manifestement trop courtes** : repérer les questions où la majorité n'a rien répondu
  dans le temps imparti.
- **Prof, élève** : P8 page de suivi d'un élève · P9 distinguer prouvé (corrigé par l'appli) et
  déclaré (auto-évaluation).
- **Élève** : E1 ce que je sais faire (existe) · E2 quoi revoir et quand (existe) · E3 mes notes (existe) ·
  E4 mes erreurs récurrentes.
- **Appli** : A1 durées ajustées au temps observé · A2 anti-triche (existe).
- **Trace écrite question par question** dès que possible (une série abandonnée ne laisse rien aujourd'hui :
  Flash-cards et Entraînement n'écrivent qu'en fin de série).

## Contenu d'une trace — validé (David, 2026-11-11)

Une trace par question, écrite dès la réponse. On garde ce qu'un besoin validé exige, rien d'autre.

- **Gardé** : élève, modèle, réussi, date (P1-P3, P5, P8, E1-E2). **Origine** à trois valeurs :
  **corrigé** (par l'appli) · **déclaré** (`student_self` + `srs` fusionnés) · **prof** (P9).
- **Ajouté** :
  - **forme** (flash-cards, saisie, contrôle blanc, course, révision, en classe) — P5, P7, A1 ;
  - **durée de réponse** — A1, P7, A2 ;
  - **durée allouée** et **fin** (validée / temps écoulé) — formes chronométrées seulement — P7, A1 ;
  - **graine** — avec le modèle, reproduit tout le tirage (valeurs, ordre des choix d'un QCM,
    mélange des étiquettes à ranger : une seule source de hasard, `instance-generator.ts:432-435`),
    comme les contrôles (`evaluation-attempts.ts:302`). Une modification du modèle ou du moteur
    rend la relecture fausse : accepté ; les erreurs fréquentes ne regroupent que les traces
    postérieures à la dernière modification du modèle ;
  - **réponse** : liste de chaînes, une par case (bornes actuelles : 50 cases, 2 000 car.), formes
    où l'on répond (pas les flash-cards) — P4, E4. QCM = numéros d'origine, ranger = position
    affichée : illisibles sans la graine. **Figure à compléter : pas le tracé**, seulement son verdict ;
  - **verdict par case** (juste/faux) — P4 : quelle case est ratée, même si le modèle a changé.
- **Pas ajouté** : rattachement au contrôle (P6 lu dans `test_answers` des contrôles, qui
  n'écrivent pas de trace ; contrôles inchangés) ; identifiant de séance ; `with_help` et
  `phase_blocage` jamais lus → à supprimer plus tard (destructif, temps à part).
- **Question d'accès (tranchée)** : l'élève lit ses traces (rien de neuf) ; **le prof lit
  individuellement** réponses tapées, temps et forme de ses élèves en travail autonome (comme les
  copies de contrôle) ; « sans dates précises » (P5) = affichage seulement, le prof lit déjà
  `created_at`.
- **« Prouvé » (P9)** : corrigé dans le navigateur et envoyé tel quel, **comme aujourd'hui** (accepté).
- **Conservation** : réponses tapées jusqu'à la fin de l'année scolaire ; réussi/raté et durées
  comme aujourd'hui ; réponses tapées dans l'export RGPD.

## Glossaire et ADR (2026-11-11)

Questions tranchées par David avant l'écriture (recommandations suivies) :

- **Q1** : le contrôle garde ses deux formes (Contrôle blanc, Course aux nombres).
- **Q2** : « trace » remplace « tentative » (banni, sauf pour un contrôle repassé).
- **Q3** : toujours « forme de série » ; « forme » seule = PDF d'une fiche.
- **Q4** : un seul champ « lieu » : Flash-cards, Saisie, Contrôle blanc, Course aux nombres, révision
  (En classe ne laisse pas de trace d'élève).
- **Q5** : second essai et aide (tuteur, pouvoirs des Mathoux) n'existent pas sur les questions de
  série (`FlashCard.maxAttempts` : démo seulement ; tuteur : exercices de fiche) → `with_help` gardé ;
  une trace par essai ; numéro d'essai ajouté le jour où le second essai existe.

## Comportements de phase 0 — validés (David, 2026-11-11)

Constats du code relus pour les écrire : Flash-cards, Entraînement et Course libres écrivent en fin
de série par `/api/tests/save` (séance libre + traces via `recordSeriesReviews` + gain du Palotin) ;
la révision écrit **carte par carte** (`/api/srs/review/submit`, 4 notes) ; `FlashCard` sait poster
une trace par question (`/api/skill-attempts`) ; **un contrôle envoyé écrit des traces « corrigé »**
(`evaluation-attempts.ts:729`, `recordSeriesReviews`), contrairement à ce que dit l'ADR 0038 (voir Q-A).

### Formes de série (élève)

- **N1 — Choix** : l'élève choisit parmi Flash-cards, Saisie, Contrôle blanc, Course aux nombres ;
  « Entraînement » n'apparaît plus nulle part. En classe reste côté prof.
- **N2 — Saisie, question** : énoncé + champ(s) ; pas de chrono ; « Valider » → la carte se retourne :
  sa réponse face à la bonne, verdict juste/faux, puis la correction ; « Suivante ».
- **N3 — Saisie, carte de cours** : montrée comme en Flash-cards (retourner, puis Réussi / Pas réussi).
- **N4 — Contrôle blanc** : l'actuel Entraînement, tel quel (chrono par question, correction et note
  à la fin) ; la note s'affiche, **n'est pas enregistrée** ; cartes de cours retirées.
- **N5 — Flash-cards** : inchangées, sauf l'écriture de la trace (N9).
- **N6 — Course aux nombres, En classe** : inchangées à l'écran.
- **L1 — Série sans question après retrait des cartes de cours** (Contrôle blanc ou Course d'une série
  de cours) : comme aujourd'hui.
- **L2 — Visiteur non connecté** : les cinq formes jouables, rien d'écrit, annoncé à l'écran (comme
  aujourd'hui).

### Auto-évaluation

- **N7 — Deux boutons partout** : « Réussi / Pas réussi » en Flash-cards, cartes de cours (toutes
  formes) et révisions (les 4 boutons FSRS disparaissent ; raccourcis clavier 1 / 2 au lieu de 1-4).
  FSRS reçoit Good / Again.
- **N8 — Meilleur résultat du jour** (ADR 0016) : inchangé, appliqué aux traces « déclaré ».

### Traces

- **N9 — Une trace par question, envoyée dès la réponse** (Valider, Réussi/Pas réussi, temps écoulé),
  dans toutes les formes autonomes et la révision ; une série abandonnée garde les réponses données.
- **N10 — Contenu** (ADR 0038) : origine (corrigé / déclaré / prof), lieu, durée de réponse, graine ;
  chronométré (Contrôle blanc, Course) : durée allouée + fin (validée / temps écoulé) ; Saisie,
  Contrôle blanc, Course : réponse case par case + verdict par case ; Flash-cards et révision : ni
  réponse ni verdict par case.
- **N11 — Durée de réponse** (David, 2026-11-11) : **seulement là où il y a un chrono** : Contrôle
  blanc, Course aux nombres **et contrôle** ; de l'affichage de la question à « Valider » (ou au temps
  écoulé). **Pas de durée** en Flash-cards, Saisie ni révision : l'élève peut retourner la carte ou
  valider à vide pour voir la réponse, la durée n'y mesure rien (l'anti-triche lit le temps de
  l'état de mémorisation, pas la trace : rien de perdu).
- **N12 — Contrôle blanc** : la trace part à chaque question validée, la note reste invisible jusqu'à
  la fin (le verdict ne s'affiche pas plus tôt).
- **N13 — Fin de série** : le gain du Palotin et les nouvelles de la Chatterie restent montrés comme
  aujourd'hui ; **aucune séance libre** (`test_sessions`, `test_answers`) n'est plus écrite.
- **N14 — Prof** : lit, pour chacun de ses élèves, réponses, temps et lieu (lecture seule ; aucun
  écran neuf dans ce chantier — les écrans P3, P4, P8 sont des chantiers futurs).
- **N15 — Export RGPD** : contient les nouvelles colonnes des traces (réponses comprises) ; les
  anciennes séances libres y restent.
- **L3 — Réponse au-delà des bornes** (> 50 cases ou > 2 000 caractères) : la trace est **refusée par le
  serveur** (400), comme une séance libre aujourd'hui ; l'élève n'est pas bloqué (la série continue).
- **L4 — Modèle repassé en brouillon pendant la série** : la trace est gardée (règle du 2026-09-28).
- **L5 — Compte prof / admin** (aperçu) : rien d'écrit, comme aujourd'hui.
- **L6 — Purge** : à la fin de l'année scolaire, réponses et verdicts par case effacés ; réussi/raté,
  durées, lieu et graine gardés.
- **E1 — Réseau coupé** : la trace est réessayée en silence ; si elle échoue encore en fin de série,
  un message unique « Certaines réponses n'ont pas été enregistrées ». Jamais de blocage de la série.
- **E2 — Corps invalide** (Zod) : 400, rien d'écrit, journal serveur.

### Prof : analyse de classe

- **N16 — Widget D** (histogramme des notes 1-4, `StudentGradeHistogram.svelte`) : **retiré, sans remplacement** (David, 2026-11-11 ; la grille point × élève donne déjà réussi / raté).

### Questions ouvertes (à trancher avant de coder)

- **Q-A — tranchée** (2026-11-11) : les contrôles **gardent leurs traces** « corrigé », lieu
  « contrôle », avec durée de réponse, durée allouée et fin ; réponse, verdict par case et graine
  restent dans la copie (`test_answers`). ADR 0038 corrigé.
- **Q-B — tranchée** : aucune réécriture ; `auto` / `student_self` / `teacher` gardés en base
  (affichés corrigé / déclaré / prof) ; `srs` n'est plus écrit, les anciennes `srs` se lisent « déclaré ».
- **Q-C — tranchée** : heatmap de régularité (P5) et Palotin de régularité = **chantier à part**, juste
  après celui-ci (ils lisent les nouvelles traces).
- **Q-D — tranchée** (2026-11-11) : widget D retiré sans remplacement.

### Colonnes de la PR 1 — validées (David, 2026-11-11)

- **Accès** : aucune policy touchée ; les policies de `skill_attempts` sont par ligne (élève : les
  siennes ; prof : `is_my_student`), les colonnes neuves suivent la règle de l'ADR 0038.
- **Lieu** (`place`) — noms anglais propres, pas ceux de `TestMode` (`course` = « cours » ailleurs
  dans le code, `interactive` ne dit rien) : `flash_cards` (Flash-cards) · `typing` (Saisie) ·
  `mock_test` (Contrôle blanc) · `number_race` (Course aux nombres) · `review` (révision) ·
  `evaluation` (contrôle). Correspondance `TestMode` → lieu dans le code (PR 2/4).
- **Bornes en base** (un élève insère ses traces directement par PostgREST : le Zod de l'API ne
  protège rien) : 50 cases, 2 000 car. par case, durées 0-24 h, graine 0-2³¹−1, fin `validated` /
  `timeout`.
- **Cohérence par lieu en base** (N10, N11) : durées et fin seulement en `mock_test`,
  `number_race`, `evaluation` ; réponse et verdicts seulement en `typing`, `mock_test`,
  `number_race` ; autant de verdicts que de cases ; sans lieu, aucune colonne neuve.
- **Lieu facultatif en base** (anciennes traces) ; l'API l'exigera (PR 2).
- **Plafond total** (David, 2026-11-11, audit de sécurité) : **10 000 caractères par trace**, en plus
  des 2 000 par case — un élève insère sans limite de nombre ; une trace reste sous ~40 Ko.
- **Reporté en PR 2** (David, 2026-11-11) : un élève peut insérer une trace `place = 'evaluation'`
  (le prof lirait « fait en contrôle »). Le serveur écrit aujourd'hui les traces d'un contrôle avec
  le **jeton de l'élève** (`evaluation-attempts.ts`, `recordSeriesReviews(userClient, …)`). Correctif
  envisagé : écriture par le client service + policy d'insertion élève qui refuse `evaluation`
  (question d'accès à poser). Intégrité inchangée d'ici là (« réussi » est déjà falsifiable, ADR 0038).
- **Aucune case** (question sans réponse, temps écoulé) : `answer_parts` et `part_verdicts` NULL ;
  `[]` est refusé.

### Découpage proposé (une PR chacune)

1. **Migration additive** `skill_attempts` (lieu, durées, fin, graine, réponse, verdicts par case ;
   bornes en base) + tests d'intégration RLS (élève : les siennes ; prof : ses élèves) + `db:migrate`.
2. `db:types` + `/api/skill-attempts` étendu (Zod, nouvelles colonnes) ; export RGPD.
3. **Deux boutons** : révision + Flash-cards + cartes de cours ; widget D retiré.
4. **Trace par question** dans Flash-cards, Contrôle blanc (renommage d'Entraînement), Course ; fin de
   série sans séance libre (gain du Palotin gardé).
5. **Forme Saisie** (`TestMode` neuf, `FlashCard` en saisie côté élève).
6. **Purge** de fin d'année (cron) — après la PR 1.

### PR 2 — API et export (2026-11-11)

- `db:types` depuis la prod : amène aussi les colonnes de la boutique d'avatars (`google_avatar_url`,
  `worn_avatar`, migration déjà sur `main`) → un fixture de test complété.
- Zod (`skillAttemptInputSchema`) = CHECK de la migration : 400 plutôt que 500. Lieux acceptés par
  l'API : `flash_cards`, `typing`, `mock_test`, `number_race` (ni `evaluation` ni `review`).
- `FlashCard` (seul appelant, aujourd'hui l'aperçu `/dev/carte-question`, admin : rien d'écrit)
  envoie `place: 'typing'` ; graine, réponse et verdicts viendront avec la Saisie (PR 5).
- **Question d'accès tranchée** (David, 2026-11-11, recommandation suivie) — traces `evaluation` : avant #2548, un élève peut insérer
  directement (PostgREST) une trace `place = 'evaluation'`, que le prof lirait « faite en contrôle ».
  Correctif proposé : la policy d'insertion élève refuse `place = 'evaluation'`, et le serveur écrit
  les traces d'un contrôle avec le client service. Qui ne pourra plus écrire ce qu'il écrivait :
  l'élève, ses traces « contrôle » (aujourd'hui aucune n'existe avec un lieu : le code n'en écrit pas
  encore).
- **#2548** (migration `20261111111212`) : la policy `skill_attempts_insert_own_student` refuse
  `place = 'evaluation'` ; traces sans lieu et autres lieux inchangés. `db:migrate` le 2026-11-11.
  Audit : un élève peut toujours écrire `mock_test` / `number_race` avec des durées inventées
  (voulu, ADR 0038) — à revoir seulement si ces lieux comptent un jour dans une note.

### PR 3 — deux boutons (2026-11-11)

- `SelfAssessButtons.svelte` (`src/lib/components/questions/`) : « Pas réussi » (gauche, touche 1) puis
  « Réussi » (droite, touche 2), partout : révision (`ReviewSession`, raccourcis actifs), Flash-cards
  (`FlashSeries`, raccourcis actifs), cartes de cours (`CourseCardView`, sans raccourcis : plusieurs
  cartes peuvent être à l'écran) ; badge de `CorrectionCard` : « Réussi / Pas réussi ». Ordre choisi
  pour suivre les touches (1 = Again comme avant) ; les Flash-cards montraient « J'avais trouvé » en
  premier, en vert.
- Révision : FSRS reçoit Good (3) / Again (1). L'API accepte encore 1-4 (onglet ouvert pendant la mise
  en prod) ; l'écran n'envoie plus que 1 ou 3. `FSRSButtons.svelte` supprimé ; vitrine `/demo/questions`
  à deux boutons (intervalles Again / Good).
- Trace de révision (paquet et chapitre, `recordSrsReviewAttempt`) : `student_self`, lieu `review`
  (Q-B : `srs` n'est plus écrit). Test d'intégration `paquet-revision-chapitre` : rouge sans, vert avec
  (la policy élève accepte `student_self` + `review`).
- **Comportement gardé** : la heatmap prof (widget C) sortait du taux de réussite toute trace
  `student_self` (cartes de cours… et Flash-cards depuis le 2026-09-30) mais y comptait les révisions
  `srs` ; `student_self` + `review` y compte toujours. Même règle dans l'anti-fraude
  (`srs_vs_quiz_gap`, éteinte en prod). Le détecteur `high_easy_ratio` (> 90 % de Easy) devient muet.
- Widget D retiré : composant, route `knowledge-grades/[studentId]`, `getStudentGradeHistogram`,
  `gradesQuerySchema` ; « Détail par élève » n'a plus que la courbe de rétention (pleine largeur).
- Docs : `srs.md`, `analytique-prof.md`, `CONTEXT.md` (Auto-évaluation).

### PR 4 — trace par question, séries libres (2026-11-11)

Décisions de David (recommandations suivies) :

- **Gain du Palotin** : l'appel de fin `/api/tests/save` est **réduit au gain** — il n'écrit plus ni
  séance libre (`test_sessions`, `test_answers`) ni traces ; il calcule le gain à partir des
  réponses de la série, comme aujourd'hui. Flash-cards : aucun appel de fin (pas d'XP).
- **Course aux nombres** (un chrono global) : question validée → trace, durée = du début de la course
  à « Valider », durée allouée = durée de la course, fin `validated` ; question non validée au
  **chrono écoulé** → trace ratée, fin `timeout` ; question laissée par **« Terminer »** → trace
  ratée **sans durée ni fin** (abandon : ne fausse pas P7).
- **Découpage** : PR 4 = séries libres (Flash-cards, Contrôle blanc, Course) + renommage ;
  **PR 4 bis** = traces d'un contrôle assigné côté serveur (client service, lieu `evaluation`).

Réalisé (2026-11-11) :

- `src/lib/questions/series-trace.ts` : `buildSeriesTrace` (graine, durées plafonnées, réponse et
  verdict par case via `computeBlankColors`, figure sans tracé) et `createTraceRecorder` (une trace à
  la fois, deux nouveaux essais sur réseau / 5xx, `settle()` → message unique). Branché dans
  `FlashSeries`, `TestInteractive`, `TestCourse` ; nul en contrôle et pour un visiteur.
- `/api/skill-attempts` : lieu `flash_cards` → `student_self`, FSRS au meilleur du jour.
- `/api/tests/save` : gain du Palotin seulement (plus de `test_sessions`, `test_answers`, traces).
- Libellés « Entraînement » → « Contrôle blanc » (forme d'un contrôle comprise, CONTEXT.md).
- Revues (code-reviewer + security-auditor, Opus) : corrigés — envois en file (FSRS parallèle sur un
  même modèle perdait des mises à jour), L3 respectée (plus de troncature : le serveur refuse au-delà
  des bornes), gain d'une série relancée, test « jamais en contrôle » de la Course.
- **À trancher par David (non bloquant)** :
  1. _Anti-fraude_ : un élève peut envoyer `place: 'flash_cards'` pour une question de Contrôle
     blanc → trace `student_self`, ignorée par le détecteur (`anti-fraud/runner.ts` ne lit que
     `auto`) mais comptée dans les badges. Pas un accès neuf (l'ancien `/api/tests/save` prenait
     déjà `mode: 'flash'` du client ; la policy permet l'insertion directe). Pistes : le détecteur lit
     aussi `student_self` hors `review`, ou les badges ignorent le déclaré hors carte.
  2. _Doublon_ : une coupure réseau après l'écriture fait renvoyer la trace (2 lignes, 2 révisions
     FSRS). Pistes : pas de nouvel essai après une exception réseau, ou clé d'idempotence (migration).

### PR 4 bis — traces d'un contrôle assigné (2026-11-11)

Phase 0 validée par David (option A) :

- **Nominal** : copie envoyée à temps → une trace `auto` par question, lieu `evaluation`, réussie
  selon le verdict du serveur (Q40), écrite **au client service** (policy élève : `evaluation`
  refusé, #2548). FSRS et paquet Programme : client de l'élève, inchangés.
- **Ni graine** (D18 : l'élève lit ses traces ; la graine reste dans la copie, Q-A) **ni réponse /
  verdict par case** (refusés en base pour `evaluation`, déjà dans `test_answers`).
- **Contrôle blanc** : durée allouée = `delay_seconds` ; durée de réponse = durée envoyée plafonnée ;
  fin `validated` / `timeout`.
- **Course** : durée allouée = durée de la course ; validée → `validated` ; non validée au chrono →
  `timeout`, durée de réponse = durée allouée ; laissée par « Terminer » → ratée, sans durée ni fin.
- **Option A** : la page envoie `endReason` + `timeSpent` par question, **même vide** (Zod,
  facultatifs) ; ancien onglet sans ces champs → trace sans durée ni fin. Une réponse vide reste
  jugée vide.
- **Limites** : copie en retard (Q37) → aucune trace ; 409 → rien de neuf ; aperçu → pas de tentative.
- **Erreur** : traces non écrites → journal serveur, la copie reste notée. Jamais de blocage.
- **Accès** : personne ne lit rien de neuf (durées déjà dans `test_answers.time_spent`) ; seul
  l'écrivain change (serveur au lieu du jeton de l'élève). Pas de migration.

Réalisé (2026-11-11) :

- `src/lib/server/evaluation-trace.ts` (`evaluationTraceOf`) ; `recordSeriesReviews` prend
  `attemptsClient` (service) et les colonnes de trace par révision ; `submitEvaluationAttempt` les
  calcule (`delay_seconds`, `time_limit`, fin et durée envoyées). Une question sans `values` est
  jugée vide (avant : `user_answer = {value: []}`, désormais NULL ; `time_spent` renseigné).
- Page : `TestInteractive` / `TestCourse` portent `endReason` dans le résultat ; `toSubmission`
  envoie durée et fin même pour une question vide ; Zod `endReason` facultatif.
- Tests : unitaires (`evaluation-trace`, `submission`, composants) ; intégration Contrôle blanc
  (preuve rouge : traces sans lieu) et Course (validée / vide au chrono / « Terminer »).
- Revues (code-reviewer + security-auditor, Opus) : aucun bloquant ; corrigés : test de la question
  vide en Course, `SvelteSet`, remise à zéro au « Recommencer », précision d'une seconde notée.
- **À trancher par David (non bloquant)** : 3. _Durées déclarées_ : un élève qui forge sa requête peut afficher des réponses instantanées
  (bornées, sans effet sur la note ; même confiance que `test_answers.time_spent`). 4. _Constat hors PR_ : `skill_attempts_insert_teacher` n'empêche pas `place = 'evaluation'` (un
  prof peut écrire une trace « en contrôle » pour son élève). À aligner seulement si
  « `evaluation` ⇒ écrit par le serveur » doit être strict.

### Décisions sur les points à trancher (David, 2026-11-11)

1. _Anti-fraude par `flash_cards`_ : **rien à faire** (requête à forger, enjeu = badges seulement, déjà possible avant).
2. _Doublon après coupure réseau_ : **corriger simplement** : plus de nouvel essai après une exception réseau ; nouveaux essais gardés pour 500/429/408. Une trace peut se perdre si la coupure précède l'écriture (moindre mal). Pas de clé d'idempotence.
3. _Durées déclarées d'un contrôle_ : **rien à faire** (bornées, sans effet sur la note).
4. _Policy prof sur `evaluation`_ : **rien à faire** (mono-professeur ; ne pas retoucher la RLS pour un gain nul).

Ordre ensuite : vérification manuelle de la Saisie → PR doublon → PR 6 purge → Saisie en séries de chapitre selon l'usage.

### PR « doublon » — plus de nouvel essai après une coupure réseau (2026-11-11)

- `createTraceRecorder` (`series-trace.ts`) : une exception de `fetch` (réseau coupé) arrête les
  essais, la trace compte parmi les non enregistrées ; nouveaux essais gardés pour 5xx / 429 / 408.
  Pas de migration, pas de clé d'idempotence (décision 2 du 2026-11-11).
- Tests : coupure seule, coupure après une panne, trace suivante envoyée quand même (rouges avant) ;
  panne 503 / 429 / 408 réessayée. Doc : `docs/systeme/evaluations.md`.

### PR 5 — forme Saisie (2026-11-11)

Décisions de David (recommandations suivies) :

- **Fin de série** : comme les Flash-cards : bilan « k questions réussies sur n », « Revoir » les
  ratées (en saisie, sans trace), « Recommencer », « Retour au panier ».
- **Gain du Palotin** : oui, comme le Contrôle blanc (réponses corrigées par l'appli ; cartes de
  cours exclues, calcul de `/api/tests/save`).
- **Séries de chapitre** (forme choisie par le prof : Flash-cards / Contrôle blanc, CHECK en base) :
  Saisie **pas dans cette PR** (migration additive à faire plus tard si besoin).

Réalisé (2026-11-11) :

- `TestMode` `typing` (lancement, liens partagés, Zod de fin de série, `TestModeDialog` : carte
  « Saisie »). Cartes de cours gardées (`seriesFormExcludesCourseCards` inchangé).
- `TypingSeries.svelte` : `FlashCard` `interactive` + `flipOnSubmit` (neuf) ; retournement offert
  seulement après « Valider » ; « Suivante » / « Terminer » ; carte de cours = Flash-cards ; bilan,
  « Revoir » (sans trace), gain du Palotin et nouvelles de la Chatterie sous le bilan.
- Trace `typing` (`series-trace.ts`) : réponse et verdict par case, jamais de durée (N11).
- `FlashCard` n'envoie plus de trace elle-même (seuls appelants interactifs : aperçus prof / admin,
  que la route ignorait) : une seule voie, la forme de série.
- `/api/tests/save` : gain en Saisie. Vitrine `/demo/questions` : onglet Saisie (« six formes »).

### PR 6 — purge de fin d'année des réponses (L6, 2026-11-11)

Décisions de David (recommandations suivies) :

- **Quand** : chaque dimanche, dans la purge RGPD existante (`run_cleanup_expired_data`, cron
  `rgpd-retention-cleanup`, 3 h UTC), bloc isolé après C11 ; pas de nouveau cron.
- **Quoi** : `answer_parts` et `part_verdicts` → NULL pour les traces créées **avant le 1er août de
  l'année scolaire en cours** (minuit, heure de Paris) ; date fixe, élèves hors classe compris.
  Gardés : réussi/raté, origine, lieu, durées, fin, graine, date.
- **Périmètre** : les traces seulement ; `test_answers` (copies de contrôle, anciennes séances
  libres) non touché.
- **Perdu** (dit à David avant le SQL) : l'élève et son prof ne liront plus les réponses des années
  passées ; l'export RGPD ne les contiendra plus. Mesuré en prod le 2026-11-11 : 0 trace avec
  réponse (PR 4 et 5 pas encore déployées).

Réalisé :

- `trace_answers_cutoff(date)` (coupure) et `purge_trace_answers()` (SECURITY DEFINER, serveur seul,
  journalisée `trace_answers_purge` dans `background_job_runs`) ; `run_cleanup_expired_data` repris
  de la prod (md5 vérifié) + appel.
- Tests `tests/integration/purge-reponses-traces.test.ts` : coupure (6 dates), trace ancienne
  purgée et reste gardé, trace récente intacte, second passage à 0, droits, appel par la purge.
  Rouges sans la migration, verts avec ; C11, traces et garde SECURITY DEFINER verts.
- Doc : `docs/systeme/conformite/README.md`, `rgpd.md`.
- Revue security-auditor : aucun bloquant ; corrigés : échec journalisé `failed` (sans relancer),
  bornes à la seconde près, purge hebdomadaire réellement lancée dans un test. Mergée (#2576),
  `db:migrate` le 2026-11-12 depuis la branche mergée : droits vérifiés en prod (serveur seul).
