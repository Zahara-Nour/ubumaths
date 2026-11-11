# Chantier `formes-de-serie` — redéfinir les formes d'une série et les traces enregistrées

Né le 2026-11-11 de la relecture de `cours-suites` (bouton différent entre flash-card et entraînement
sur une carte de cours). Discussion de conception (phase 0) : **rien de codé**.

## Reprendre ici

_Mis à jour le 2026-11-11, phase 0 en cours (aucune PR, rien de codé)._

- **État** : ADR 0037/0038 écrits ; **comportements de phase 0 + découpage rédigés** (§ « Comportements de phase 0 — à valider ») · **Prochaine action** : faire valider les comportements, puis PR 1 (migration) · **En attente de David** : validation des comportements + Q-A (les contrôles écrivent des traces aujourd'hui, l'ADR 0038 dit non), Q-B, Q-C ; N11 (durée : chronos + contrôle) et Q-D (widget D retiré) tranchés · **Pièges en cours** : « Saisie » nomme aussi la page prof `teacher/evaluation-tasks/[id]/saisie` ; hors chantier : un contrôle tronque en silence au-delà de 50 cases / 2 000 car. (`submission.ts`) ; ne pas relancer ce qui est validé · **Worktree / branche** : aucun (doc sur `main`) ; un worktree au premier code

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

## Comportements de phase 0 — à valider (rédigés le 2026-11-11)

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

- **Q-A — Les contrôles écrivent-ils encore des traces ?** Aujourd'hui **oui** (« corrigé », chaque
  contrôle envoyé à l'heure alimente la grille point × élève et l'état de mémorisation). L'ADR 0038
  écrit le contraire. Les arrêter retirerait les contrôles des bilans existants. Reco : **les garder**
  comme aujourd'hui (sans réponse ni temps : le contrôle les a dans `test_answers`), lieu « contrôle »
  ajouté, ADR 0038 corrigé.
- **Q-B — Origine des anciennes traces** : réécrire `srs` → `student_self` en base (réécriture de
  données) ou ne plus écrire `srs` et lire les deux comme « déclaré » ? Reco : **ne rien réécrire**,
  garder `auto` / `student_self` / `teacher` comme valeurs (affichées corrigé / déclaré / prof).
- **Q-C — P5 (heatmap de régularité) et le Palotin de régularité** : validés dans le détail, mais
  dans ce chantier ou dans un chantier à part ? Reco : **chantier à part**, après celui-ci (ils lisent
  les nouvelles traces).
- **Q-D — tranchée** (2026-11-11) : widget D retiré sans remplacement.

### Découpage proposé (une PR chacune)

1. **Migration additive** `skill_attempts` (lieu, durées, fin, graine, réponse, verdicts par case ;
   bornes en base) + tests d'intégration RLS (élève : les siennes ; prof : ses élèves) + `db:migrate`.
2. `db:types` + `/api/skill-attempts` étendu (Zod, nouvelles colonnes) ; export RGPD.
3. **Deux boutons** : révision + Flash-cards + cartes de cours ; widget D retiré.
4. **Trace par question** dans Flash-cards, Contrôle blanc (renommage d'Entraînement), Course ; fin de
   série sans séance libre (gain du Palotin gardé).
5. **Forme Saisie** (`TestMode` neuf, `FlashCard` en saisie côté élève).
6. **Purge** de fin d'année (cron) — après la PR 1.
