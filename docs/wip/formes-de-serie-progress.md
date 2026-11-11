# Chantier `formes-de-serie` — redéfinir les formes d'une série et les traces enregistrées

Né le 2026-11-11 de la relecture de `cours-suites` (bouton différent entre flash-card et entraînement
sur une carte de cours). Discussion de conception (phase 0) : **rien de codé**.

## Reprendre ici

_Mis à jour le 2026-11-11, phase 0 en cours (aucune PR)._

- **État** : phase 0, décisions de David ci-dessous ; ni ADR ni `CONTEXT.md` écrits · **Prochaine action** : répondre à David sur les points ouverts (nom des « fiches de révision », historique élève), puis écrire l'ADR + `CONTEXT.md` (commit doc sur `main`), puis comportements de phase 0 · **En attente de David** : (a) nom de `srs_card_stats` (proposé : « état de mémorisation ») ; (b) historique « mes dernières séances » côté élève, oui/non ; (c) piste (a) ADR 0017 de `cours-suites` (hors de ce chantier) · **Pièges en cours** : « Saisie » déjà employé pour la page prof `teacher/evaluation-tasks/[id]/saisie` ; ADR 0016 (meilleur résultat du jour) concerne l'auto-évaluation, à revoir avec la fusion des boutons · **Worktree / branche** : aucun (doc sur `main`)

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
3. **Séances libres** (`test_sessions` + `test_answers` sans `evaluation_id`) : doublon avec les traces,
   à ne plus écrire (sous réserve de l'historique élève, point ouvert b).

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
