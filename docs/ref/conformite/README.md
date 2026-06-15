# Conformité au droit — UbuMaths

Dossier central de la **conformité réglementaire** d'UbuMaths (RGPD, ePrivacy/cookies, LCEN, DSA).
Il rassemble la documentation existante **et** confronte l'audit RGPD historique au **code actuel**.

> ⚠️ **Statut de ce dossier** : l'audit RGPD de référence (`rgpd.md`) date du **2026-01-16** (v1.12,
> « CONFORME 9/10 »). L'implémentation est **toujours en place**, mais **~5 mois de commits** l'ont
> fait dériver. Ce README est la **source de vérité courante** ; les autres fichiers sont datés.

---

## Index du dossier

| Fichier | Contenu | Date / état |
| --- | --- | --- |
| `README.md` (ce fichier) | Index + **rapport de confrontation** code actuel | **2026-06-15 — à jour** |
| `registre-traitements.md` | Registre des traitements (Art. 30) | 2026-06-15 (neuf) |
| `aipd-dpia.md` | Analyse d'impact (Art. 35) | 2026-06-15 (brouillon) |
| `rgpd.md` | Audit RGPD maître (historique) | 2026-01-16 — **daté** |
| `registre-sous-traitants.md` | Sous-traitants & DPA (Art. 28) | 2026-01-16 — **daté** |
| `consentement-parental.md` | Doc d'implémentation consentement (Art. 8) | 2026-01-16 — **daté** |
| `audit-trail.md` | Schéma de l'audit trail | 2026-01-16 — **daté** |

**Pages publiques liées** : `src/routes/(public)/legal/{mentions-legales,confidentialite,cgu}/+page.svelte`.

---

## Synthèse : où en est la conformité ?

La base RGPD construite en janvier 2026 **tient toujours** : droit à l'effacement, export,
consentement parental (Art. 8), rétention automatisée, audit trail, minimisation (champ `gender`
supprimé) — **tout est encore dans le code**. Trois évolutions majeures depuis :

1. ✅ **Hébergement migré US → UE (eu-west-3, Paris)** le 2026-06-15 → fin du transfert hors UE pour la BDD.
2. ✅ **Lacune « error logs PII » fermée** : `sanitizeErrorData()` masque secrets/emails avant insertion.
3. ⚠️ **Deux régressions de rétention/export** sur les données pédagogiques (voir §Écarts).

**Verdict** : conformité globale **maintenue**, mais **2 trous réels à corriger** + registre des
sous-traitants **incomplet** (IA tierce non listée) + des **docts datés** à rafraîchir.

---

## Rapport de confrontation — doc janvier 2026 vs code actuel

### 1. Rétention des données (`run_cleanup_expired_data()`, cron `rgpd-retention-cleanup`, dim. 03:00 UTC)

| Donnée | Doc janv. | **Code actuel** | Drift |
| --- | --- | --- | --- |
| error_logs | 90 j (resolved) | **30 j (tous)** | modifié (24/05) |
| user_presence | 30 j | 30 j | ✓ |
| friendships (rejected) | 2 ans | 2 ans | ✓ |
| messages | 3 ans (hard delete) | 3 ans | ✓ |
| private_messages | 3 ans | 3 ans | ✓ |
| audit_logs | — | **60 j** | ajouté (24/05) |
| error_occurrences | — | **30 j** | ajouté |
| background_job_runs | — | **7 j** | ajouté |
| **student_attempts / student_progress** | 5 ans + inactif 2 ans | **🔴 RETIRÉS** | tables « mortes », cleanup supprimé (24/05) |

> 🔴 **Trou n°1 — rétention pédagogique non appliquée.** Le cron ne nettoie **plus aucune donnée
> pédagogique**. Les tables ont été renommées (`exercise_completions`, `student_exercise_mastery`
> d'après les triggers d'audit) mais **ne sont pas réintégrées au cron**. Or la
> [politique de confidentialité §7](../../../src/routes/\(public\)/legal/confidentialite) **promet
> « 5 ans »**. → décider : réimplémenter le cleanup sur les nouvelles tables, ou ajuster la promesse.

### 2. Droit à l'effacement (Art. 17)

| Élément | Doc janv. | **Code actuel** | Drift |
| --- | --- | --- | --- |
| Endpoint | `DELETE /api/account/delete` | identique | ✓ |
| RPC SQL | `delete_user_account_rgpd(uuid)` | **`delete_user_account(p_user_id)`** | nom différent |
| Table d'audit | `account_deletion_requests` | **`account_deletion_audit`** | nom différent |
| Rate limit | — | 1 / 24 h | ✓ (ajouté) |

→ Fonctionnel ; seuls les **noms** ont changé (doc à corriger, pas le code).

### 3. Portabilité (Art. 20)

Endpoint `GET /api/account/export` présent. **Bug CONFIRMÉ** (vérifié dans `src/lib/types/database.ts`) :
il requête `student_attempts` (l. 64), `student_progress` (l. 74) et `assignment_submissions` (l. 82)
— **3 tables qui n'existent plus** dans le schéma actuel. Comme le code fait `result.data || []`,
l'export ne plante pas mais renvoie ces catégories **systématiquement vides**.

> 🔴 **Trou n°2 — export pédagogique vide (confirmé).** Les catégories `learning.attempts`,
> `learning.progress` et `learning.submissions` sont **toujours `[]`** → l'**historique d'exercices,
> la maîtrise et les devoirs de l'élève sont absents** de l'export de portabilité (seul
> `learning.flashcards` était censé marcher, mais `srs_cards` était **aussi cassé**).
>
> ✅ **CORRIGÉ (2026-06-15).** L'export requête désormais `exercise_completions`,
> `student_exercise_mastery` et `srs_decks` (decks possédés par l'élève), colonnes réalignées. La
> correction a révélé que **`private_messages`, `notifications` et `game_players` étaient AUSSI
> cassés** (colonnes/filtres obsolètes) → corrigés également. `format_version` → `1.1`. Garde de
> non-régression dans `src/routes/api/account/export/__tests__/export.test.ts` (assert les tables
> réelles, **interdit** les tables mortes).
>
> 🔎 **Complété (2ᵉ passe).** L'export restait à côté de l'essentiel : **aucune évaluation
> référentielle**. Ajout d'une section **`evaluation`** — référentiel de **connaissances** (famille A,
> `student_skill_state_a`), référentiel de **compétences** (famille B, `student_competence_level`),
> tentatives (`skill_attempts`) et indicateurs observables (`student_observable_state`). L'activité
> exercices (`exercise_completions`/`student_exercise_mastery`/`srs_decks`) passe dans une section
> **`activite`** distincte. `format_version` → `1.2`.

### 4. Consentement parental (Art. 8)

| Élément | Doc janv. | **Code actuel** | Drift |
| --- | --- | --- | --- |
| Grades déclencheurs | 6,5,4,3,2 + défaut sûr | identique (`consent.ts`) | ✓ |
| **Période de grâce** | 30 jours | **date fixe `2026-06-30`** | ⏰ modifié (15/02) |
| Service email | Gmail | **Brevo** (`email/brevo.ts`) | modifié |
| Endpoints protégés | ~12 | **19** (`requireConsent`) | étendu (+jeux, marketplace) |
| Tables / fonctions / mode lecture seule | présents | présents | ✓ |

> ⏰ **Attention calendaire** : la période de grâce expire le **2026-06-30** (dans ~2 semaines). Après
> cette date, les élèves < 15 ans **sans consentement validé** repassent en **lecture seule**. À
> anticiper (relancer les enseignants, ou repousser la date).

### 5. Audit trail (Art. 5.2)

| Élément | Doc janv. | **Code actuel** | Drift |
| --- | --- | --- | --- |
| Table | `audit_logs` | identique | ✓ |
| Tables tracées | profiles, student_attempts, student_progress | **profiles, exercise_completions, student_exercise_mastery** | renommage |
| Rétention | `cleanup_old_audit_logs(730 j)` | fonction présente mais **non appelée** ; réel = **60 j** via cron | réduit |
| RLS (admin / user / prof) | présent | présent | ✓ |

### 6. Sécurité des error logs (Art. 5.1.c) — ✅ lacune fermée

La lacune §5.9 du doc (PII non sanitisées dans `request_body`) est **corrigée** :
`sanitizeErrorData()` (`src/lib/server/errorMonitoring.ts`) masque password/token/secret/api_key et
anonymise les emails avant insertion.

### 7. Sous-traitants (Art. 28)

| Sous-traitant | Doc janv. | **Code actuel** | Drift |
| --- | --- | --- | --- |
| Supabase | UE | **UE — France eu-west-3** | ✓ (migration) |
| Google (OAuth/Classroom/Drive/Gmail) | 7 scopes | **+`classroom.topics.readonly`, `courseworkmaterials`** | scopes élargis |
| Brevo | emails parents | identique | ✓ |
| Gmail API | emails élèves (scolaires) | identique (stratégie hybride) | ✓ |
| **Groq** (LLM tuteur/chat) | « à vérifier » | **🟠 actif en prod** (`/api/chat`, llama-3.3-70b ; msg élève dits anonymisés) | à documenter |
| **HuggingFace** (embeddings RAG) | **absent** | **🟠 actif en prod** (`multilingual-e5-large`) | **non documenté** |
| Vercel Analytics / Speed Insights | non détaillé | **actifs, sans cookie** | à documenter |
| Sentry | non utilisé | non utilisé | ✓ |

> 🟠 **Trou n°3 — registre des sous-traitants incomplet.** **HuggingFace** (RAG) manque totalement, et
> **Groq** doit passer de « à vérifier » à « actif » (préférer un prestataire *zero-retention* + CCT
> pour ces deux IA US). À reporter dans `registre-traitements.md` (T6) et `registre-sous-traitants.md`.

---

## Écarts à traiter (priorisés)

| # | Écart | Priorité | Article | Piste |
| --- | --- | --- | --- | --- |
| 1 | Rétention pédagogique non appliquée (cron ne couvre plus exercise_completions/mastery) | 🔴 Haute | 5.1.e | Réintégrer au cron OU ajuster la politique |
| 2 | ~~Export Art. 20 : tables inexistantes → données pédagogiques vides~~ ✅ **CORRIGÉ (2026-06-15)** | ✔️ Fait | 20 | Repointé sur `exercise_completions`/`student_exercise_mastery`/`srs_decks` (+ private_messages/notifications/game_players) + test |
| 3 | Registre sous-traitants : HuggingFace absent, Groq « à vérifier », Vercel Analytics non détaillé | 🟠 Moyenne | 28 | Compléter le registre + CCT/zero-retention |
| 4 | Période de grâce consentement expire 2026-06-30 | ⏰ Calendaire | 8 | Relancer ou repousser |
| 5 | Docs datées (hébergement US, email Gmail, durées) | 🟡 Basse | — | Bandeaux ajoutés ; rafraîchir au besoin |
| 6 | `[A COMPLÉTER]` mentions légales (identité, statut, directeur publication) | 🟠 Moyenne | LCEN | Saisir les infos éditeur |
| 7 | AIPD à finaliser ; DSA (signalement) ; DPA signés | 🟠 Moyenne | 35/DSA/28 | Cf. `aipd-dpia.md` |

---

## Méthode de confrontation

Confrontation menée le 2026-06-15 via lecture du code et des migrations (4 axes : rétention/effacement/
export, consentement, audit/error-logs, sous-traitants). Sources vérifiées :
`supabase/migrations/20260524015516_*`, `20260524020331_*`, `20260115100000_*`, `20260116100000_*`,
`20260215184116_*` ; `src/routes/api/account/{delete,export}/`, `src/routes/api/consent/`,
`src/lib/utils/consent.ts`, `src/lib/server/{errorMonitoring,email/brevo,google/oauth}.ts`,
`src/routes/+layout.svelte`.
