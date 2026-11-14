# Chantier `durees-trop-courtes` — repérer les durées manifestement trop courtes (P7)

Ouvert le 2026-11-14, choisi par David après la clôture de `suivi-eleve`. Besoin P7 validé le
2026-11-11 ([`formes-de-serie-progress.md`](../archive/wip/formes-de-serie-progress.md) § « Besoins de
suivi validés ») : « repérer les questions où la majorité n'a rien répondu dans le temps imparti ».
Suite prévue : A1 (durées ajustées au temps observé), chantier à part.

## Reprendre ici

_Mis à jour le 2026-11-14, phase 0._

- **État** : état des lieux fait, comportements et questions Q1 à Q5 posés (§ « Phase 0 ») · **Prochaine action** : plan technique de la PR 1 après les réponses · **En attente de David** : Q1 à Q5 · **Pièges en cours** : prod presque vide (aucune trace chronométrée, 1 contrôle, 101 réponses) : tout se vérifie en local · **Worktree / branche** : `../ubumaths-wt-durees-trop-courtes`, `feat/durees-trop-courtes`

## Ce qui existe (vérifié le 2026-11-14)

- **Une durée appartient à une ligne de série** `{ templateId, quantity, delay }` (20 s par défaut,
  5 à 600 s) : le même modèle peut avoir 10 s dans une série et 40 s dans une autre.
- **Formes chronométrées par question** : Contrôle blanc libre (lieu `mock_test`) et contrôle de forme
  `interactive` (lieu `evaluation`). À 0, ce qui est saisi est validé, rien = faux.
- **Course aux nombres** : un seul chrono global (toutes les questions à l'écran) ; pas de durée par
  question. Une question jamais validée finit `timeout` au chrono.
- **Ce que les traces gardent** (`skill_attempts`, ADR 0038) : `allotted_ms` (durée de la question),
  `response_ms`, `end_reason` (`validated` / `timeout`), `answer_parts` (`mock_test` seulement ; rien
  en contrôle, la réponse est dans `test_answers`). **Aucun lien vers la série** : une trace de Contrôle
  blanc libre dit le modèle et la durée, pas de quelle série elle vient.
- **Contrôles** : `test_answers` (statut, dont « sans réponse », `time_spent`) + traces `evaluation`
  avec `end_reason` ; le bilan d'un contrôle (P6, `getEvaluationBreakdown`) a déjà une ligne par modèle
  avec la répartition juste / partiel / faux / **sans réponse**.
- **Prod (MCP, 2026-11-14)** : 101 traces, aucune avec lieu ; 1 contrôle, 16 séances, 101 réponses.

## Phase 0 — comportements proposés (à valider)

- **Nominal** : une question est signalée **« durée sans doute trop courte »** quand, sur au moins
  **5 élèves** qui l'ont eue **à cette durée**, **plus de la moitié** ont laissé le chrono s'écouler
  **sans rien répondre** (Q1). Le signal dit « 7 élèves sur 10 n'ont rien répondu dans les 20 s » ;
  aucun nom.
  - **Bilan d'un contrôle** (PR 1) : la ligne du modèle porte la marque ; sous le seuil de 5 élèves,
    rien.
  - **Éditeur de série** (PR 2) : à côté de la durée d'une ligne (modèle × durée), la même marque, lue
    sur les Contrôles blancs et les contrôles de **ses** élèves à **cette durée** (Q2, Q3).
- **Limite** : moins de 5 élèves à cette durée → rien (pas de jugement sur 2 copies). Question
  répondue faux à temps → ce n'est pas une durée trop courte, elle ne compte pas. Course aux nombres →
  hors du signal (Q4).
- **Erreur** : lecture en échec → pas de marque, la page reste (le bilan et l'éditeur ne dépendent pas
  du signal).

## Questions à David (phase 0, posées le 2026-11-14)

- **Q1 — « Rien répondu »** : seulement le chrono écoulé **sans rien saisi** (proposé) ? Ou aussi le
  chrono écoulé avec une réponse **commencée** (validée d'office à 0 s) ? Et les seuils : 5 élèves au
  moins, plus de la moitié (proposé) ?
- **Q2 — Grain** : le signal porte sur **modèle × durée** (proposé : le même modèle peut aller à 40 s et
  manquer à 10 s), pas sur le modèle seul ?
- **Q3 — Où** : PR 1 dans le **bilan d'un contrôle**, PR 2 dans l'**éditeur de série** (à côté de la
  durée de chaque ligne) — proposé. Ailleurs (analytique de classe, page du modèle) ?
- **Q4 — Course aux nombres** : hors du signal (pas de durée par question) — proposé ? Ou un signal à
  part au niveau de la course (« la plupart n'ont pas fini ») ?
- **Q5 — Une suggestion de durée ?** Le signal dit seulement « trop courte » (proposé ; proposer une
  durée, c'est A1) ? Ou il propose déjà une durée (par exemple le temps qu'ont mis ceux qui ont
  répondu) ?

## Journal

- 2026-11-14 : chantier ouvert, état des lieux, phase 0 posée (Q1 à Q5).
