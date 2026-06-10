# Anti-fraud SRS — Référence

Système de détection de patterns de triche sur les reviews SRS (famille A).

> **Statut** : livré 2026-06-10, **désactivé par défaut** en prod.
> **Activation** : `UPDATE app_config SET value='true' WHERE key='anti_fraud_enabled'`.
> **Pré-requis** : ≥ 20 templates 6ᵉ taggés famille A + ≥ 5 capacités multi-templates.

---

## 1. Vue d'ensemble

Le chantier SRS livré en v0.9.9 a introduit un risque P1 documenté :

> Un élève peut POSTer `/api/srs/review/submit` avec `grade=4 (Easy)` sans avoir résolu la question. Cumulé sur 2 templates distincts d'une même capacité → bascule `is_acquired=true` au verdict BO.

Le système anti-fraud détecte 5 signaux comportementaux et les combine en un score composite. Tout est **passif** : on flagge en BDD + on alerte le prof dans son dashboard. **Pas de sanction automatique**, pas d'effet côté élève.

---

## 2. Les 5 signaux

| Signal            | Seuil                                          | Severity | Score | Sample min                |
| ----------------- | ---------------------------------------------- | -------- | ----- | ------------------------- |
| `high_easy_ratio` | > 90 % de Easy                                 | 2        | 0.5   | 20 reviews                |
| `no_again`        | 0 grade=1 sur ≥ 30 reviews consécutives        | 3        | 0.7   | 30 reviews                |
| `fast_timeSpent`  | médiane < 2 s                                  | 3        | 0.7   | 10 reviews avec timeSpent |
| `burst`           | > 15 reviews en 60 s                           | 4        | 0.85  | aucun (détection de pic)  |
| `srs_vs_quiz_gap` | (taux succès SRS) - (taux Monde 1) > 50 points | 5        | 0.9   | 10 attempts chaque côté   |

### Score composite

Si **≥ 2 signaux** sont déclenchés sur une paire (élève, capacité), un flag `composite` est aussi créé avec :

```
composite_score = min(1, Σ(score_i × weight_i) / Σ(weight_i))
```

Poids : `high_easy_ratio: 1`, `no_again: 2`, `fast_timeSpent: 2`, `burst: 3`, `srs_vs_quiz_gap: 3`.

Le flag composite est créé si `composite_score > 0.7`.

---

## 3. Architecture

### Schéma DB

`supabase/migrations/20260610220100_srs_anti_fraud_flags.sql` :

```sql
CREATE TABLE srs_anti_fraud_flags (
    id                  UUID PRIMARY KEY,
    student_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    capacity_skill_id   UUID REFERENCES skills(id) ON DELETE CASCADE,  -- NULL réservé V3
    flag_type           TEXT CHECK (... 6 valeurs),
    severity            SMALLINT CHECK (1..5),
    score               REAL CHECK (0..1),
    window_start        TIMESTAMPTZ,
    window_end          TIMESTAMPTZ,
    sample_size         INTEGER,
    details             JSONB,                       -- breakdown du signal
    resolved            BOOLEAN DEFAULT FALSE,
    resolved_by         UUID REFERENCES profiles(id),
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

CHECK `chk_srs_anti_fraud_resolved_coherent` : garantit `resolved=true ⟺ resolved_by ET resolved_at NON-NULL`.

### Modules TS

| Module                                    | Rôle                                                       |
| ----------------------------------------- | ---------------------------------------------------------- |
| `src/lib/server/anti-fraud/detectors.ts`  | 5 fonctions pures + `composeSignals`                       |
| `src/lib/server/anti-fraud/runner.ts`     | `runAntiFraudJob(supabase, opts)` orchestrateur            |
| `src/lib/server/anti-fraud/types.ts`      | `ReviewEntry`, `AttemptEntry`, `SignalResult`, `JobReport` |
| `src/lib/server/anti-fraud/index.ts`      | Barrel                                                     |
| `src/lib/server/validation/anti-fraud.ts` | 4 schemas Zod                                              |

### Endpoints

| Méthode | Route                                                      | Auth                            |
| ------- | ---------------------------------------------------------- | ------------------------------- |
| POST    | `/api/admin/anti-fraud/run`                                | admin                           |
| GET     | `/api/teacher/classes/[classId]/anti-fraud/flags`          | teacher (owner classe) ou admin |
| PATCH   | `/api/teacher/classes/[classId]/anti-fraud/flags/[flagId]` | teacher (owner classe) ou admin |
| GET     | `/api/teacher/classes/[classId]/anti-fraud/count`          | teacher (owner classe) ou admin |

### UI

Page `/dashboard/teacher/classes/[classId]/analytics` → onglet **🚨 Surveillance** :

- `AntiFraudFlagsList.svelte` — liste avec badge severity + bouton "Marquer comme OK"
- `FlagDetailsDialog.svelte` — modal breakdown JSONB
- `AntiFraudFilters.svelte` — toggle "Inclure résolus"

Badge count sur l'onglet alimenté par `+page.server.ts` au load + `refreshUnresolvedCount()` après chaque resolve.

---

## 4. Cycle de vie d'un flag

1. **Runner** (`runAntiFraudJob`) tourne (manuellement via endpoint admin, V2.0).
2. Pour chaque paire (élève × capacité) avec ≥ N reviews SRS sur 7 j :
   - Applique 5 détecteurs sur les reviews + skill_attempts.
   - Compose les signaux déclenchés.
   - **Dédoublonnage** : skip si flag identique non-résolu < 7 j.
   - INSERT flag(s).
3. **Prof** consulte l'onglet Surveillance → voit la liste.
4. **Prof** clique "Marquer comme OK" → `PATCH .../flags/[flagId]` → `resolved=true`.
5. Flag disparaît de la vue active (consultable via `?resolved=true`).

**Pas d'unresolve** V1 (geste lourd, pas implémenté).

---

## 5. Cross-class

Un flag concerne **(élève, capacité)**, pas (élève, capacité, classe). Conséquences :

- Élève dans 2 classes → flag visible par les 2 profs.
- Résoudre d'un côté → masque l'autre.
- Cohérence simple, pas de divergence de vue inter-profs.

---

## 6. Procédure d'activation

### En local

```sql
UPDATE app_config SET value='true' WHERE key='anti_fraud_enabled';
```

Déclencher manuellement :

```bash
curl -X POST https://app.ubumaths.fr/api/admin/anti-fraud/run \
  -H "Cookie: <admin session>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Pour un dry_run :

```bash
curl ... -d '{"dry_run": true}'
```

### En prod

**À ne PAS activer** tant que :

- < 20 templates 6ᵉ taggés famille A
- < 5 capacités avec ≥ 2 templates distincts

Sinon → faux positifs garantis (samples trop petits, attaques techniquement impossibles).

---

## 7. Tests

| Suite                                 | Tests  | Cible       |
| ------------------------------------- | ------ | ----------- |
| `detectors.test.ts`                   | 30     | ≥ 25 ✅     |
| `runner.test.ts`                      | 11     | ≥ 10 ✅     |
| `validation/anti-fraud.test.ts` (Zod) | 18     | —           |
| `AntiFraudFlagsList.svelte.test.ts`   | 6      | ≥ 5 ✅      |
| `FlagDetailsDialog.svelte.test.ts`    | 3      | ≥ 3 ✅      |
| `AntiFraudFilters.svelte.test.ts`     | 3      | ≥ 3 ✅      |
| **Total**                             | **71** | **≥ 58** ✅ |

---

## 8. Roadmap V2.1 / V3

- **pg_cron auto-scheduling** (V2.1) : exécuter le runner quotidien sans intervention admin.
- **Activation auto** sur seuil tagging atteint (V2.1).
- **UX élève soft warning** (V2.5) : si composite > 0.8 × 3 fenêtres, message non-bloquant.
- **KL divergence** sur distribution Easy/Good/Hard/Again (V3, 6ᵉ signal).
- **Email récap hebdo prof** (V3).
- **Action "Confirmer triche"** : refusée par décision (boîte de Pandore).
- **Drill-down depuis cellule grille** → focus flag prof.

---

## 9. Références

- Spec TDD complète : `docs/wip/srs-anti-fraud-spec-tdd.md`
- Plan d'exécution : `~/.claude/plans/immutable-painting-cake.md`
- Audit sécurité initial : `docs/wip/srs-fsrs-security-audit-findings.md`
- Progress : `docs/wip/srs-anti-fraud-progress.md`
- Modèle d'architecture : page analytics existante (`docs/ref/teacher-analytics.md`)
