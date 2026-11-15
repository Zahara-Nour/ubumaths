---
status: en-cours
---

# Chantier `durees-ajustees` — durées ajustées au temps observé (A1)

Ouvert le 2026-11-15, choisi par David après la clôture de `taux-par-point`. Besoin A1 validé le
2026-11-11 ([`formes-de-serie-progress.md`](../archive/wip/formes-de-serie-progress.md) § « Besoins de
suivi validés ») : « durées ajustées au temps observé ». Suite prévue de `durees-trop-courtes`
([journal](../archive/wip/durees-trop-courtes-progress.md), Q5 : « aucune durée suggérée, c'est A1 »).

## Reprendre ici

_Mis à jour le 2026-11-15, à l'ouverture._

- **État** : phase 0 écrite (comportements + questions Q1-Q6), rien codé · **Prochaine action** : réponses de David, puis plan technique · **En attente de David** : Q1-Q6 ci-dessous · **Pièges en cours** : prod sans aucune trace avec durée (2026-11-15) ; durée de réponse plafonnée à la durée allouée (donnée censurée) ; `question_templates.updated_at` remet le signal à zéro (Q8 de `durees-trop-courtes`) · **Worktree / branche** : `../ubumaths-wt-durees-ajustees` · `feat/durees-ajustees`

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

## Historique

- 2026-11-15 : chantier ouvert, worktree créé, phase 0 écrite.
