# Spec TDD — Anti-Cheat SRS (chantier B + C)

> Date : 2026-06-10
> Source : `docs/wip/srs-fsrs-security-audit-findings.md` §V2 + plan `/Users/david/.claude/plans/immutable-painting-cake.md`
> Phase 0 du plan : verrouille les comportements attendus AVANT le code.

---

## 1. Vocabulaire

| Terme               | Définition                                                                   |
| ------------------- | ---------------------------------------------------------------------------- |
| **Review SRS**      | Entrée de `srs_card_stats.review_history`, ou `skill_attempts` source='srs'  |
| **Attempt Monde 1** | `skill_attempts` source='auto' (quiz interactif)                             |
| **Capacité**        | Skill famille A (`skill_objectives` ou capacité atomique liée à un objectif) |
| **Flag**            | Row de `srs_anti_fraud_flags` créée par le runner                            |
| **Signal**          | Résultat d'un détecteur unitaire pour une paire (élève, capacité)            |
| **Composite**       | Flag émis si ≥ 2 signaux individuels ont passé leur seuil                    |
| **Fenêtre**         | Période glissante 7 jours par défaut (`window_start` à `window_end`)         |
| **Résolu**          | Flag marqué `resolved=true` par un prof                                      |

---

## 2. Comportements attendus

### B1. Détection — Signal `high_easy_ratio`

**Quand** : pour chaque paire (élève E, capacité C) avec **≥ 20 reviews SRS** sur la fenêtre 7 j.
**Calcul** : `ratio = #{grade=4} / total`.
**Seuil** : `ratio > 0.90`.
**Si seuil franchi** : créer flag `{ type: 'high_easy_ratio', severity: 2, score: 0.5, sample_size: total, details: { ratio, easy_count, total } }`.
**Si non** : pas de flag.

**Cas limites** :

- `total < 20` → skip silencieux (pas de log d'erreur).
- `total = 20`, `easy_count = 18` → ratio = 0.90 strict, **PAS** de flag (seuil strict `> 0.90`).
- `total = 20`, `easy_count = 19` → ratio = 0.95 → flag créé.
- Flag identique non-résolu existe dans les 7 derniers jours (même `student_id, capacity_skill_id, flag_type`) → skip création (dédoublonnage).

### B2. Détection — Signal `no_again`

**Quand** : ≥ 30 reviews consécutives chronologiques (capacité C, ordre `date ASC`).
**Calcul** : `again_count = #{grade=1}`.
**Seuil** : `again_count = 0` ET séquence atteint au moins 30 reviews consécutives.
**Si seuil franchi** : flag `{ type: 'no_again', severity: 3, score: 0.7, sample_size: <longueur séquence>, details: { streak_length, last_again_date: null } }`.

**Cas limites** :

- Élève a 35 reviews dont aucune Again → flag (streak_length=35).
- Élève a 50 reviews dont 1 Again en position 5 → on regarde la séquence post-Again (45 reviews sans Again) → flag (streak_length=45) si ≥ 30.
- Élève a 28 reviews sans Again → skip.

### B3. Détection — Signal `fast_timeSpent`

**Quand** : ≥ 10 reviews avec `timeSpent != null` sur la fenêtre (capacité C).
**Calcul** : `median = median(timeSpent in seconds)`.
**Seuil** : `median < 2` (secondes).
**Si seuil franchi** : flag `{ type: 'fast_timeSpent', severity: 3, score: 0.7, sample_size, details: { median_seconds, sample_size } }`.

**Cas limites** :

- Reviews sans `timeSpent` (champ optionnel V1) → exclues du calcul mais comptent pour `sample_size_total` (info). Si reste < 10 avec timeSpent → skip.
- Median = 2.0 exact → PAS de flag (seuil strict `< 2`).
- Median = 1.5 sur 10 reviews → flag.

### B4. Détection — Signal `burst`

**Quand** : à tout moment dans la fenêtre, **≥ 16 reviews** dans une fenêtre glissante de 60 s.
**Calcul** : glisse fenêtre 60 s sur les timestamps `date`, trouve max count.
**Seuil** : `max_count >= 16`.
**Si seuil franchi** : flag `{ type: 'burst', severity: 4, score: 0.85, sample_size: max_count, details: { burst_count, burst_start, burst_end } }`.

**Cas limites** :

- 15 reviews en 60 s → PAS de flag (seuil strict `>= 16`).
- 20 reviews en 30 s → flag (max_count=20).
- Reviews dispersées (1 par minute) → PAS de flag.
- **`burst` est le SEUL détecteur qui NE nécessite PAS `sample_size >= 20` global** (un burst en 60 s est suspect par lui-même).

### B5. Détection — Signal `srs_vs_quiz_gap`

**Quand** : sur capacité C, **chaque côté** a ≥ 10 attempts sur la fenêtre.
**Calcul** :

- `srs_success_rate = #{srs.success=true} / srs.total` (source='srs')
- `quiz_success_rate = #{quiz.success=true} / quiz.total` (source='auto')
- `gap = srs_success_rate - quiz_success_rate` (en points sur 100)

**Seuil** : `gap > 0.50` (50 points).
**Si seuil franchi** : flag `{ type: 'srs_vs_quiz_gap', severity: 5, score: 0.9, sample_size: min(srs.total, quiz.total), details: { srs_rate, quiz_rate, gap_pct, srs_total, quiz_total } }`.

**Cas limites** :

- SRS 95 %, Quiz 30 % (10 chaque côté) → gap=0.65 → flag.
- SRS 80 %, Quiz 30 % (10 chaque côté) → gap=0.50 strict → PAS de flag.
- SRS 100 %, Quiz n/a (0 quiz) → skip (manque quiz pour comparer).
- Gap **négatif** (quiz mieux que SRS) → ne pas flagger (anomalie inverse, pas un signe de triche).

### B6. Score composite

**Quand** : pour chaque paire (élève, capacité), si **≥ 2 signaux individuels** passent leur seuil.
**Calcul** : `composite_score = min(1, sum(score_i * weight_i) / sum(weight_i))` avec poids :

- `high_easy_ratio`: 1 (Moyen)
- `no_again`: 2 (Fort)
- `fast_timeSpent`: 2 (Fort)
- `burst`: 3 (Très fort)
- `srs_vs_quiz_gap`: 3 (Très fort)

**Si composite_score > 0.7** : créer flag composite `{ type: 'composite', severity: 5, score: composite_score, sample_size, details: { signals: [list of triggered signals with their details] } }`.

**Note** : les signaux individuels sont créés **EN PLUS** du composite (pas de remplacement). Le composite est un signal de synthèse pour le tri prof.

### B7. Job désactivé par défaut

**Quand** : à l'entrée de `runAntiFraudJob`.
**Lecture** : `SELECT value FROM app_config WHERE key = 'anti_fraud_enabled'`.
**Si `value != 'true'`** : exit early, log info `"Anti-fraud disabled by config"`.
**Retour** : `{ flags_created: 0, scanned_pairs: 0, skipped_disabled: true, duration_ms }`.

**Cas limites** :

- `app_config` table absente → comportement = "disabled" (fail-safe).
- `value` = 'TRUE' (majuscule) → considéré activé (comparaison case-insensitive).
- `value` = '1' ou autre → considéré désactivé (strict).

### B8. Sample size minimum

**Règle générale** : **tous les détecteurs** exigent `sample_size >= 20` sur la fenêtre 7j de la paire (élève, capacité), **SAUF** `burst` qui détecte un pic instantané.

**Implication** : un élève avec 5 reviews seulement → **aucun flag créé** (même si 100 % Easy), sauf si un burst > 16 / 60 s arrive (cas pathologique très rare).

**Pas de log d'erreur** sur skip — c'est le mode nominal pour la grande majorité des paires.

### B9. Lecture prof — GET liste flags

**Endpoint** : `GET /api/teacher/classes/[classId]/anti-fraud/flags`
**Auth** : `requireTeacherOfClass(locals, classId)` → 403 si non-owner non-admin.
**Query params Zod** :

- `resolved?: boolean` (default `false` → ne montre que non-résolus)
- `since?: ISO date` (default `now - 30j`)
- `type?: AntiFraudFlagType` (filtre exact)
- `capacity?: UUID` (filtre exact sur capacity_skill_id)

**Retour** :

```json
{
  "flags": [
    {
      "id": "...",
      "student": { "id": "...", "first_name": "...", "last_name": "..." },
      "capacity": { "id": "...", "name": "..." },
      "flag_type": "...",
      "severity": 1..5,
      "score": 0..1,
      "sample_size": ...,
      "details": {...},
      "resolved": false,
      "created_at": "..."
    }
  ],
  "total": number,
  "resolved_count": number
}
```

**Tri** : `score DESC, created_at DESC`.
**Limite** : 100 flags max par requête (anti-DoS).

### B10. Marquer comme OK (resolve)

**Endpoint** : `PATCH /api/teacher/classes/[classId]/anti-fraud/flags/[flagId]`
**Body Zod** : `{ resolved: true }` (seule valeur acceptée — pas d'unresolve V1).
**Effet** :

- Vérifie ownership : flag.student_id appartient à un élève de la classe (via `class_members.status='active'`).
- Si flag déjà résolu → 200 idempotent (pas d'erreur), `{ already_resolved: true }`.
- Sinon : UPDATE `resolved=true, resolved_by=auth.uid(), resolved_at=NOW()`.

**Refus** :

- Flag pour élève hors classe du prof → 404 (pas 403, pour ne pas révéler l'existence du flag).
- Body Zod invalide → 400.

### B11. Cross-class

**Comportement** : un flag concerne `(student_id, capacity_skill_id)` — pas de notion de classe au niveau du flag.

**Implications** :

- Élève dans 2 classes (prof A et prof B) → flag visible des deux côtés via leurs GET respectifs.
- Prof A résout le flag → flag.resolved=true → disparaît aussi de la vue prof B.
- Prof B peut **toujours voir** le flag résolu en mettant `?resolved=true` dans le query param (consultation historique).

### B12. Compteur badge

**Endpoint** : `GET /api/teacher/classes/[classId]/anti-fraud/count`
**Auth** : `requireTeacherOfClass`.
**Retour** : `{ count: number }` (nombre de flags non-résolus pour les élèves de la classe).
**Performance** : 1 SELECT COUNT(\*) avec jointure `class_members`. Pas de pagination.

**Comportement UI** : si `count > 0`, badge `🚨 Surveillance (3)` ; sinon `🚨 Surveillance`.

---

## 3. Cas d'erreur globaux

| Cas                                    | Réponse                           |
| -------------------------------------- | --------------------------------- |
| classId UUID malformé                  | 400 Zod                           |
| classId valide mais classe inexistante | 404 (via `requireTeacherOfClass`) |
| Prof non-owner et non-admin            | 403                               |
| flagId malformé                        | 400 Zod                           |
| flagId valide mais flag inexistant     | 404                               |
| Body PATCH invalide                    | 400 Zod                           |
| Erreur DB                              | 500 (Supabase propage)            |

---

## 4. Non-comportements (hors scope)

- **Pas d'unresolve** : V1 ne permet pas de remettre `resolved=false` (geste lourd, pas nécessaire en V1).
- **Pas d'edit du flag** : un flag créé par le runner est immuable sauf colonnes resolved/resolved_by/resolved_at.
- **Pas de notification push/email** : in-app uniquement (badge count).
- **Pas d'action côté élève** : aucun effet pour l'élève (UX D reporté).
- **Pas d'effet sur les données SRS** : marquer un flag ne reset PAS `srs_card_stats` ni `skill_attempts`.
- **Pas de retry automatique** : si runner crash, log + abandon, redéclenchement manuel par admin.
- **Pas de pg_cron** V2.0 : déclenchement manuel via endpoint admin. Auto-scheduling V2.1.

---

## 5. Vérification end-to-end (manuelle après livraison)

### Setup (UPDATE app_config en local)

```sql
UPDATE app_config SET value = 'true' WHERE key = 'anti_fraud_enabled';
```

### Test détection nominal

Pour un élève E + capacité C donnée :

1. INSERT 25 reviews SRS grade=4 sur 7j → POST `/api/admin/anti-fraud/run` → assert flag `high_easy_ratio` créé.
2. INSERT 35 reviews sans grade=1 sur 7j → flag `no_again` créé.
3. INSERT 12 reviews avec timeSpent=1s → flag `fast_timeSpent` créé.
4. INSERT 20 reviews espacées de 2s → flag `burst` créé.
5. INSERT 10 attempts srs success=true + 10 attempts auto success=false sur même capacité → flag `srs_vs_quiz_gap` créé.
6. Si 2+ signaux remplis → flag `composite` créé EN PLUS.

### Test UI prof

- Prof login → `/dashboard/teacher/classes/[classId]/analytics` → onglet "🚨 Surveillance" affiche les flags.
- Badge count visible sur l'onglet.
- Clic "Marquer comme OK" sur un flag → flag disparaît, count décrémente.
- Toggle "Inclure résolus" → flag réapparaît.
- Mode projection actif → noms remplacés par "Élève 1", "Élève 2".

### Test sécurité

- Prof B login → URL classe de prof A → 403.
- Élève login → endpoint `/api/admin/anti-fraud/run` → 403 (admin only).
- Élève dans 2 classes flagué → prof A résout → prof B ne voit plus le flag dans `?resolved=false`.

### Test désactivation

```sql
UPDATE app_config SET value = 'false' WHERE key = 'anti_fraud_enabled';
```

→ POST `/api/admin/anti-fraud/run` retourne `{ skipped_disabled: true, flags_created: 0 }`.

---

## 6. Métriques de validation TDD

| Module                              | Tests minimum                                           |
| ----------------------------------- | ------------------------------------------------------- |
| `detectors.test.ts`                 | ≥ 25 (5 cas × 5 détecteurs)                             |
| `runner.test.ts`                    | ≥ 10 (désactivé, vide, nominal, dédoublonnage, dry_run) |
| `anti-fraud-endpoints.test.ts`      | ≥ 12 (auth, filtres, idempotence, cross-class)          |
| `AntiFraudFlagsList.svelte.test.ts` | ≥ 5                                                     |
| `FlagDetailsDialog.svelte.test.ts`  | ≥ 3                                                     |
| `AntiFraudFilters.svelte.test.ts`   | ≥ 3                                                     |
| **Total**                           | **≥ 58 tests verts**                                    |

---

## 7. Décisions architecturales actées (rappel)

1. Job désactivé par défaut via `app_config.anti_fraud_enabled` (feature flag DB).
2. Granularité = (élève × capacité).
3. Fenêtre 7 j glissante, non exposée UI.
4. UI = 3ᵉ onglet "🚨 Surveillance" sur page analytics existante.
5. Action prof = "Marquer comme OK" uniquement.
6. Pas d'UX élève.
7. In-app seulement (pas d'email).
