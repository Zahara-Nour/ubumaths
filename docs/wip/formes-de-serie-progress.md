# Chantier `formes-de-serie` — redéfinir les formes d'une série et les traces enregistrées

Né le 2026-11-11 de la relecture de `cours-suites` (bouton différent entre flash-card et entraînement
sur une carte de cours). Discussion de conception (phase 0) : **rien de codé**.

## Reprendre ici

_Mis à jour le 2026-11-11, phase 0 en cours (aucune PR, rien de codé)._

- **État** : formes, noms, deux boutons d'auto-évaluation, « état de mémorisation », besoins de suivi (P1-P9, E1-E4, A1-A2), régularité P5 (heatmap) et Palotin **validés** ; ni ADR ni `CONTEXT.md` écrits · **Prochaine action** : déduire des besoins validés le **contenu exact d'une trace** (temps, forme, durée allouée, fin de question sous chrono pour P7, réponse tapée + graine pour P4/E4, rattachement au contrôle pour P6, origine prouvé/déclaré pour P9) et le soumettre à David avec la question d'accès ; puis ADR + `CONTEXT.md` (commit doc sur `main`) ; puis comportements de phase 0 · **En attente de David** : rien d'ouvert (hors chantier : piste (a) ADR 0017 de `cours-suites`) · **Pièges en cours** : « Saisie » déjà employé pour la page prof `teacher/evaluation-tasks/[id]/saisie` ; ADR 0016 (meilleur résultat du jour) à revoir avec la fusion des boutons ; widget « heatmap activité » actuel (élève × jour) à remplacer ; ne pas relancer la discussion sur ce qui est validé ci-dessous · **Worktree / branche** : aucun (doc sur `main`)

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
