# Spec Phase 0 — Classements de jeux à 3 niveaux (classe / niveau / école)

> Design doc (PAS de code). Branche à créer : `feat/game-leaderboards`.
> Rédigé : 2026-06-16. Statut : **Phase 0 — à valider**.

## 1. Objectif

Pour **chaque jeu**, exposer un classement à **3 portées** :

- **Classe** — mes camarades de classe ;
- **Niveau** — même `grade` que moi, **dans mon école** ;
- **École** — tous les élèves de mon école.

Et **retirer le classement public global** actuel (mineurs exposés inter-écoles → RGPD/safeguarding),
cohérent avec le modèle « école = frontière sociale » du refactor mono-prof
(cf. `docs/wip/single-teacher-refactor.md`, helpers `my_school()`/`same_school()`).

## 2. Décisions verrouillées (David, 2026-06-16)

| Sujet          | Décision                                                                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jeux concernés | **minesweeper, 2048, mathémo** (PAS navadra — module condamné, réécriture en cours)                                                                                                                              |
| « Niveau »     | `profiles.grade` **∩ même école**                                                                                                                                                                                |
| Minesweeper    | **Option (i)** : entre dans la couche unifiée avec **une** métrique simple (`total_points`) pour les 3 portées ; **garde sa vue détaillée** existante (avg_top_10 / temps de référence / ELO multijoueur) à côté |
| Couche unifiée | Oui — faisable (verdict Phase 0)                                                                                                                                                                                 |

## 3. État réel (mesuré 2026-06-16)

Chaque jeu a **sa propre table de score** (pas de stockage commun) :

| Jeu         | Table                         | Métrique retenue (↑ = meilleur) | Variante                       |
| ----------- | ----------------------------- | ------------------------------- | ------------------------------ |
| 2048        | `game_2048_scores`            | `best_score` (int)              | — (mode retiré 2026-06-16)     |
| mathémo     | `mathemo_scores`              | `total_score` (numeric)         | —                              |
| minesweeper | vue `minesweeper_leaderboard` | `total_points` (bigint)         | difficulté/cycle (à confirmer) |

Existant à réutiliser/remplacer :

- Section **`src/routes/(public)/leaderboards/`** (+ sous-page `mathemo/`) — actuellement **publique/globale**.
- Vues minesweeper : `minesweeper_leaderboard`, `minesweeper_leaderboard_public`, `minesweeper_multiplayer_leaderboard`.
- `profiles.grade` peuplé pour **74/77** élèves ; valeurs `6, 2, 1_GEN, T_SPE…` (même vocab que `classes.grade`).
- `profiles.school_id` peuplé pour 95/98 (cf. refactor) ; helpers `my_school()`/`same_school()` déjà en base.

## 4. Modèle cible

### 4.1 Vue normalisante `game_scores_unified`

```
game_scores_unified(game text, variant text NULL, user_id uuid, score numeric, updated_at timestamptz)
```

UNION ALL des 3 sources, une ligne par (jeu, variante, élève) :

- `('2048',        NULL, user_id, best_score,  updated_at)` ← game_2048_scores
- `('mathemo',     NULL, user_id, total_score, updated_at)` ← mathemo_scores
- `('minesweeper', <variant?>, student_id, total_points, …)` ← source minesweeper (vue ou agrégat brut — à finaliser)

Convention : **score plus élevé = meilleur** pour les 3 (best_score, total_score, total_points sont tous ↑).
Si un futur jeu est « plus petit = mieux » (ex. temps), ajouter une colonne `direction` ou normaliser à l'insertion.

### 4.2 Fonction de classement `game_leaderboard(...)`

```
game_leaderboard(p_game text, p_variant text, p_scope text, p_limit int)
  RETURNS TABLE(rank int, user_id uuid, firstname text, avatar_url text, score numeric, is_me boolean)
```

- `SECURITY DEFINER`, `search_path` pinné. Range par `auth.uid()` (l'appelant), jamais un id passé.
- `p_scope ∈ {'class','grade','school'}` → ensemble d'élèves :
  - **class** : `student_id IN (SELECT cm2.student_id FROM class_members cm1 JOIN class_members cm2 USING(class_id) WHERE cm1.student_id=auth.uid() AND cm1.status='active' AND cm2.status='active')` (mes camarades) ;
  - **grade** : `profiles.grade = (mon grade) AND profiles.school_id = my_school()` ;
  - **school** : `profiles.school_id = my_school()`.
- Filtre `role='student'` (exclut prof/admin) et `is_test=false`. Rang par `score DESC` (dense rank — à confirmer §6).
- Ne renvoie **que** le périmètre autorisé → pas de fuite inter-école (safeguarding).

### 4.3 Affichage

Déplacer les classements de `(public)/leaderboards/` vers **`(protected)/.../leaderboards/`** (auth requise),
avec **3 onglets** (Classe / Niveau / École) par jeu, appelant `game_leaderboard` en RPC.
Minesweeper garde **en plus** sa vue détaillée actuelle (option i).

## 5. Safeguarding / RGPD

- **Plus de classement public inter-écoles** : on retire/segmente `(public)/leaderboards/` et
  `minesweeper_leaderboard_public`. Décision à acter dans l'AIPD (comme l'accès prof au Lot 7).
- Afficher **prénom + avatar** seulement (pas nom complet) sur les classements de mineurs — à confirmer §6.
- Réutiliser `my_school()` (frontière). Élèves sans `school_id`/`grade` (3) : absents des classements niveau/école.

## 6. Questions ouvertes (à trancher avant implémentation)

1. **Variantes** : seul minesweeper a une variante (difficulté/cycle) — 2048 et mathémo sont mono-classement
   (mode 2048 retiré le 2026-06-16). Pour minesweeper : un classement **par difficulté** ou **agrégé** ?
   (reco : par difficulté.)
2. **Source minesweeper exacte** : `total_points` depuis la vue `minesweeper_leaderboard` (nested view, perf ?)
   ou un agrégat brut dédié ? Variante = difficulté ou un score global ?
3. **Sort du classement public actuel** : suppression pure, ou maintien d'un classement « école » public-anonymisé ?
4. **Identité affichée** : prénom seul vs prénom+nom (mineurs).
5. **Égalités / méthode de rang** : `rank()` vs `dense_rank()` ; gestion des ex æquo.
6. **Le prof/admin** apparaît-il ? (reco : non — élèves uniquement.)

## 7. Plan d'implémentation (esquisse — à détailler après validation §6)

1. **Phase 0 — Spec TDD** : comportements en français (ce doc + réponses §6), validés par David.
2. **Migration** : vue `game_scores_unified` + fonction `game_leaderboard` (SECURITY DEFINER, RLS-safe).
   _Agent : `supabase-expert` (Opus)._ **David pousse** (`pnpm db:migrate`).
3. **Audit sécu** : `security-auditor` (Opus) — fuite inter-école, SECURITY DEFINER, perf des rangs.
4. **Serveur/RPC** : wrappers + types. _Agent : `backend-developer`._
5. **UI** : page `(protected)` avec onglets 3-scopes par jeu ; retrait du public. _Agent : `frontend-developer` + svelte-autofixer._
6. **Tests** : intégration RLS (un élève ne voit que son périmètre) + unitaires du classement. _`test-automator`._
   ⚠️ Respecter le verrou mono-prof (les tests créant des profs : cf. `tests/integration/global-setup.ts`).
7. **Doc/AIPD** : acter le retrait du classement public ; checks finaux.

## 8. Risques

- **RGPD mineurs** : tout classement expose des données d'élèves → périmètre école strict + identité minimale.
- **Perf** : `game_leaderboard` fait un rang sur un JOIN profiles/class_members ; index sur `(school_id, grade)`,
  `class_members(student_id, status)` ; éviter de ranker toute la base. Vue nested minesweeper à benchmarker.
- **Couplage navadra** : exclu ici ; son classement 3-niveaux sera (re)fait dans la réécriture.
- **Variantes** : si mal modélisées, multiplication des classements peu lisibles.
