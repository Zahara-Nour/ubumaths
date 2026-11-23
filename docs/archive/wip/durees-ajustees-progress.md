---
status: clos
---

# Chantier `durees-ajustees` — durées ajustées au temps observé (A1)

Ouvert le 2026-11-15, choisi par David après la clôture de `taux-par-point`. Besoin A1 validé le
2026-11-11 ([`formes-de-serie-progress.md`](./formes-de-serie-progress.md) § « Besoins de
suivi validés ») : « durées ajustées au temps observé ». Suite prévue de `durees-trop-courtes`
([journal](./durees-trop-courtes-progress.md), Q5 : « aucune durée suggérée, c'est A1 »).

## Reprendre ici

_Mis à jour le 2026-11-15 : chantier clos._

- **État** : clos (PR unique #2673) ; durable dans `docs/systeme/evaluations.md` § Durée observée, `analytique-prof.md`, `questions.md` · **Prochaine action** : aucune · **Pièges** : prod sans trace avec durée au 2026-11-15 → suggestion invisible tant que Contrôles blancs / contrôles chronométrés n'ont pas tourné ; vérification manuelle #2673 dans `docs/wip/verifications-manuelles.md` · **Worktree / branche** : aucun

## Ce qui existe (vérifié le 2026-11-15)

- **Durée d'une question** = `delay` de sa ligne de série (`{ templateId, quantity, delay }`, ADR 0035).
  Tout modèle ajouté au panier part à **20 s** (`DEFAULT_DELAY`, `src/lib/stores/questionCart.svelte.ts:19`,
  bornes 5-300 s ; seul appel : `QuestionPreviewCard.svelte:32`) ; 0 → 20 s au tirage
  (`DEFAULT_QUESTION_DELAY_SECONDS`). Aucune durée propre au modèle.
- **Durées mesurées** :
  - Contrôle blanc libre (`skill_attempts`, lieu `mock_test`) : `response_ms` depuis l'affichage,
    **plafonnée** à `allotted_ms`, fin `validated` / `timeout` ;
  - contrôle de forme `interactive` : `test_answers.time_spent` (secondes), durée lue dans la composition ;
  - Course aux nombres : durée **depuis le début de la course** → inutilisable par question ;
  - Saisie, Flash-cards : aucune durée.
- **Signal « durée sans doute trop courte »** (P7) : `src/lib/server/stats/duration-signals.ts`, client du
  prof sous la RLS (`is_my_student`), modèle × durée, ≥ 5 élèves, traces postérieures à la dernière
  modification du modèle. Même lecture réutilisable ici.
- **Modèle existant de recalcul** : `recalculate_minesweeper_reference_times()` (médiane sur 4 semaines,
  table de référence, cron hebdomadaire).
- **Prod (MCP, 2026-11-15)** : 101 traces, toutes sans lieu ni durée (antérieures aux colonnes du
  2026-11-11). **Aucune donnée pour A1 aujourd'hui** : le comportement restera invisible tant que des
  Contrôles blancs ou des contrôles chronométrés n'auront pas tourné.

## Phase 0 — comportements proposés (à valider)

- **Nominal** : dans le panier et l'éditeur de série, sous la durée d'une ligne, une suggestion
  « Durée observée : 35 s » avec un bouton « Appliquer », quand les élèves ont assez répondu à ce
  modèle (Q2, Q3). Aucune durée n'est changée sans le geste du prof.
- **Limite** : pas assez d'élèves → rien ; suggestion trop proche de la durée actuelle → rien (Q5) ;
  série verrouillée (déjà utilisée) → suggestion visible dans le panier seulement, pas d'« Appliquer »
  dans l'éditeur (une série verrouillée ne change pas).
- **Erreur** : lecture en échec → pas de suggestion, le panier et l'éditeur restent.

## Questions à David (phase 0, posées le 2026-11-15)

- **Q1 — Où agit la durée observée ?**
  - **A (reco)** : **suggestion avec « Appliquer »** sous la durée d'une ligne (panier + éditeur) ;
  - B : A, et en plus un modèle ajouté au panier part directement à sa durée observée (au lieu de 20 s) ;
  - C : ajustement automatique des séries existantes — déconseillé (une série change sous le prof).
- **Q2 — Quels élèves comptent ?**
  - **A (reco)** : **les élèves du prof**, sous la RLS existante (comme le signal P7) : aucune lecture
    nouvelle, **aucune migration** ;
  - B : tous les élèves du site, recalcul hebdomadaire dans une table (comme le démineur) : migration,
    `SECURITY DEFINER`, question d'accès à trancher.
- **Q3 — Quelle règle ?** La durée de réponse est plafonnée (un temps écoulé dit seulement « plus
  long que la durée »).
  - **A (reco)** : durée dans laquelle **80 % des tirages** ont été validés (temps écoulé compté comme
    « au-delà »), **arrondie aux 5 s supérieures**, bornée à 5-300 s. Si plus de 20 % des tirages ont
    fini en temps écoulé, le chiffre n'est pas calculable : on suggère « plus long » sans chiffre
    (ou rien, la marque P7 le dit déjà) ;
  - B : médiane des réponses validées (plus simple, mais sous-estime quand beaucoup d'élèves manquent
    de temps).
  - Réponse fausse validée à temps : comptée (l'élève a eu le temps de répondre).
- **Q4 — Seuils.** **Reco** : au moins **5 élèves** (comme P7), chaque élève compté par ses tirages ;
  traces postérieures à la dernière modification du modèle ; toutes durées allouées confondues.
- **Q5 — Quand afficher.** **Reco** : seulement si la durée observée diffère de la durée de la ligne
  d'au moins **5 s et 25 %** (dans un sens comme dans l'autre : trop long aussi).
- **Q6 — Sources.** **Reco** : Contrôle blanc libre (`mock_test`) + contrôles de forme `interactive` ;
  Course aux nombres, Saisie, Flash-cards hors (pas de durée par question).

**Question d'accès** (A2 reco) : **personne ne lit rien de plus** — le prof lit déjà ces traces pour le
signal P7 ; seule une durée agrégée par modèle sort, aucun nom. (Avec Q2 B, elle serait à reposer.)

## Décisions (David, 2026-11-15 : « oui » aux recommandations)

- **Q1 A** : suggestion « Durée observée : N s » + « Appliquer », panier et éditeur ; rien d'automatique.
- **Q2 A** : élèves du prof, sous la RLS existante ; **aucune migration**, une seule PR.
- **Q3 A** : durée où 80 % des tirages sont validés (temps écoulé = au-delà), arrondie aux 5 s
  supérieures, bornée 5-300 s ; plus de 20 % de temps écoulés → aucun chiffre.
- **Q4** : ≥ 5 élèves ; traces postérieures à la dernière modification du modèle.
- **Q5** : écart ≥ 5 s **et** ≥ 25 % avec la durée de la ligne, dans les deux sens.
- **Q6** : `mock_test` + contrôles `interactive`.
- **Accès** : personne ne lit rien de plus.
- **Q7 (revue, David 2026-11-15 : A)** : une question **passée à vide avant la fin** est écartée
  (durée inconnue) ; seules les réponses écrites, justes ou fausses, donnent une durée.
  **Vérifié ensuite** : ce cas ne se produit pas avec les écrans actuels — « Valider » reste désactivé
  tant qu'une case est vide (`QuestionCard.svelte`, `hasValidInput`), et aucune correction ne
  s'affiche pendant un Contrôle blanc. La règle reste comme garde-fou (données anciennes, écran futur).

## PR 1 — calcul, endpoint, panier, éditeur (2026-11-15)

- **Calcul** : `observedDurationsOf` (`src/lib/server/stats/duration-signals.ts`) sur les tirages du
  signal P7, enrichis de `responseSeconds` / `timedOut` ; `response_ms` ajoutée à la lecture des
  traces `mock_test`. Contrôle : `time_spent ≥ durée − 1` = bout du chrono (règle P7).
- **Règle d'affichage** : `observedSuggestion` (`src/lib/types/duration-signals.ts`), Q5.
- **Endpoint** : `GET /api/series/duration-signals` rend `{ signals, observed }` (était `signals`).
- **UI** : `ObservedDelayHint.svelte` (« Durée observée : N s » + « Appliquer ») dans
  `CartQuestionCard` et l'éditeur de série (copie de travail, écrite à l'enregistrement).
- **Série verrouillée** : l'éditeur ne s'ouvre pas (« Modifier » masqué, `handleEdit`) et la base
  refuse (UBS01) : rien à ajouter.
- **Tests** : unitaires (calcul, règle, endpoint), client (tuile, éditeur), intégration
  `tests/integration/durees-trop-courtes.test.ts` (durée observée lue en base ; **rouge sans la
  lecture de `response_ms`**, vérifié).
- **Doc** : `docs/systeme/evaluations.md` § Durée observée.

## Historique

- 2026-11-15 : chantier clos, journal archivé.
- 2026-11-15 : #2673 mergée (CI verte ; revues sans bloquant ; Q7 réponse vide écartée).
- 2026-11-15 : PR 1 écrite (calcul, endpoint, panier, éditeur).
- 2026-11-15 : phase 0 validée (recos).
- 2026-11-15 : chantier ouvert, worktree créé, phase 0 écrite.
