# Spec Phase 0 — Classements de jeux à 3 niveaux (classe / niveau / école)

> Design doc (PAS de code). Branche à créer : `feat/game-leaderboards`.
> Rédigé : 2026-06-16. Statut : **Phase 0 — décisions §6 prises, prêt à détailler l'implémentation**.

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

| Jeu         | Table                         | Score retenu (↑ = meilleur, **un seul par élève**) |
| ----------- | ----------------------------- | -------------------------------------------------- |
| 2048        | `game_2048_scores`            | `best_score` (int)                                 |
| mathémo     | `mathemo_scores`              | `total_score` (numeric)                            |
| minesweeper | vue `minesweeper_leaderboard` | `total_points` (bigint — agrège déjà les parties)  |

**Pas de variante** : un score unique par (jeu, élève). Le mode 2048 a été retiré (2026-06-16) ;
le classement minesweeper agrège déjà toutes les parties/difficultés en un `total_points`.

Existant à réutiliser/remplacer :

- Section **`src/routes/(public)/leaderboards/`** (+ sous-page `mathemo/`) — actuellement **publique/globale**.
- Vues minesweeper : `minesweeper_leaderboard`, `minesweeper_leaderboard_public`, `minesweeper_multiplayer_leaderboard`.
- `profiles.grade` peuplé pour **74/77** élèves ; valeurs `6, 2, 1_GEN, T_SPE…` (même vocab que `classes.grade`).
- `profiles.school_id` peuplé pour 95/98 (cf. refactor) ; helpers `my_school()`/`same_school()` déjà en base.

## 4. Modèle cible

### 4.1 Vue normalisante `game_scores_unified`

```
game_scores_unified(game text, user_id uuid, score numeric, updated_at timestamptz)
```

UNION ALL des 3 sources, une ligne par (jeu, élève) :

- `('2048',        user_id,    best_score,   updated_at)` ← game_2048_scores
- `('mathemo',     user_id,    total_score,  updated_at)` ← mathemo_scores
- `('minesweeper', student_id, total_points, …)` ← source minesweeper (vue ou agrégat brut — à finaliser)

Convention : **score plus élevé = meilleur** pour les 3 (best_score, total_score, total_points sont tous ↑).
Si un futur jeu est « plus petit = mieux » (ex. temps), ajouter une colonne `direction` ou normaliser à l'insertion.

### 4.2 Fonction de classement `game_leaderboard(...)`

```
game_leaderboard(p_game text, p_scope text, p_limit int)
  RETURNS TABLE(rank int NULL, user_id uuid, firstname text, avatar_url text,
                score numeric, is_me boolean, is_teacher boolean)
```

- `SECURITY DEFINER`, `search_path` pinné. Range par `auth.uid()` (l'appelant), jamais un id passé.
- `p_scope ∈ {'class','grade','school'}` → ensemble d'**élèves** :
  - **class** : `student_id IN (SELECT cm2.student_id FROM class_members cm1 JOIN class_members cm2 USING(class_id) WHERE cm1.student_id=auth.uid() AND cm1.status='active' AND cm2.status='active')` (mes camarades) ;
  - **grade** : `profiles.grade = (mon grade) AND profiles.school_id = my_school()` ;
  - **school** : `profiles.school_id = my_school()`.
- **Rang** : `dense_rank() OVER (ORDER BY score DESC)` calculé **entre élèves uniquement** (`role='student'`, `is_test=false`).
- **Le prof** (l'unique `role='teacher'`, s'il a un score pour ce jeu) est **ajouté à chaque scope** comme ligne de
  référence : `is_teacher=true`, **`rank=NULL`** (hors-classement), intercalé à sa position par `score`. Il **ne
  consomme pas de rang** → les rangs élèves ne sont pas décalés. **Admin exclu.**
- Tri final par `score DESC`. Ne renvoie **que** le périmètre autorisé → pas de fuite inter-école (safeguarding).

### 4.3 Affichage

Déplacer les classements de `(public)/leaderboards/` vers **`(protected)/.../leaderboards/`** (auth requise),
avec **3 onglets** (Classe / Niveau / École) par jeu, appelant `game_leaderboard` en RPC.
Minesweeper garde **en plus** sa vue détaillée actuelle (option i).

## 5. Safeguarding / RGPD

- **Plus de classement public inter-écoles** : on retire/segmente `(public)/leaderboards/` et
  `minesweeper_leaderboard_public`. Décision à acter dans l'AIPD (comme l'accès prof au Lot 7).
- Afficher **prénom + avatar** seulement (pas nom complet) sur les classements de mineurs (décidé §6).
- Réutiliser `my_school()` (frontière). Élèves sans `school_id`/`grade` (3) : absents des classements niveau/école.

## 6. Décisions (résolues 2026-06-16, David)

1. **Source du score minesweeper** : `total_points` depuis la vue `minesweeper_leaderboard` ; basculer sur un
   agrégat brut dédié seulement si la vue nested est trop lente (à benchmarker).
2. **Classement public actuel** : **supprimé** → école-only (safeguarding). À acter dans l'AIPD.
3. **Identité affichée** (mineurs) : **prénom + avatar** uniquement.
4. **Ex æquo** : **`dense_rank()`** (sans saut de rang).
5. **Prof / admin** : le **prof apparaît pour information**, positionné par son score, **sans rang**
   (`rank=NULL`, hors-classement) ; les rangs `dense_rank` ne se calculent **qu'entre élèves**. **Admin exclu.**

## 7. Plan d'implémentation (esquisse — §6 résolu, prêt à détailler)

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
- **Hétérogénéité des scores** : chaque jeu a sa propre échelle (best_score / total_score / total_points) ;
  pas de comparaison inter-jeux — chaque classement est interne à un jeu.
