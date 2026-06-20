---
title: Modele de donnees — theme authentication
date: 2026-06-12
author: documentation-writer agent
posture: Reference
---

# Modele de donnees — authentication

Ce document decrit les tables, colonnes, contraintes, politiques RLS et triggers du theme
`authentication`. Toutes les informations sont verifiees dans `supabase/migrations/`.

Le theme couvre **deux processus** (voir [security.md](security.md)) :

- **Process 1 — session / login** : tables `profiles`, `user_restrictions`, `user_presence`.
- **Process 2 — integration Google API** : table `google_integrations`.

`profiles` est le pivot : c'est l'extension de `auth.users` (table geree par Supabase Auth)
cree automatiquement a l'inscription, et c'est la **seule source de verite du role** (RBAC).

---

## Vue d'ensemble

```
auth.users  (Supabase Auth, Process 1)
   │  ON INSERT → trigger on_auth_user_created
   ▼
profiles  ──────────────┬─────────────┬──────────────────┐
 (role, status, …)      │             │                  │
                        ▼             ▼                  ▼
              user_restrictions  user_presence   google_integrations
               (Process 1)        (Process 1)      (Process 2)
```

| Table                 | Process | Role principal                              | Migration de creation                             |
| --------------------- | ------- | ------------------------------------------- | ------------------------------------------------- |
| `profiles`            | 1       | Identite, role (RBAC), statut d'approbation | `001_initial_schema.sql`                          |
| `google_integrations` | 2       | Tokens OAuth Google chiffres                | `20251114150000_google_classroom_integration.sql` |
| `user_restrictions`   | 1       | Moderation (mute/timeout/ban)               | `20251110120000_create_user_restrictions.sql`     |
| `user_presence`       | 1       | Statut en ligne (WebSocket)                 | `035_create_user_presence_table.sql`              |

---

## Table `profiles` (Process 1)

Extension de `auth.users`. La PK est partagee avec `auth.users.id`
(`REFERENCES auth.users(id) ON DELETE CASCADE`) : supprimer l'utilisateur Supabase supprime
le profil en cascade.

### Colonnes cles

| Colonne                     | Type          | Contraintes                                                                    | Source (migration) |
| --------------------------- | ------------- | ------------------------------------------------------------------------------ | ------------------ |
| `id`                        | `UUID`        | PK, FK → `auth.users(id)` ON DELETE CASCADE                                    | `001`              |
| `email`                     | `TEXT`        | `UNIQUE NOT NULL`                                                              | `001`              |
| `role`                      | `user_role`   | `NOT NULL DEFAULT 'student'`                                                   | `001`              |
| `status`                    | `user_status` | `NOT NULL DEFAULT 'approved'`                                                  | `20251208100000`   |
| `full_name`                 | `TEXT`        | nullable (legacy, remplace par firstname/lastname)                             | `001` / `003`      |
| `firstname`                 | `TEXT`        | nullable                                                                       | `003` / `010`      |
| `lastname`                  | `TEXT`        | nullable                                                                       | `003` / `010`      |
| `gender`                    | `TEXT`        | `CHECK (gender IN ('boy','girl'))`, nullable                                   | `025`              |
| `avatar_url`                | `TEXT`        | nullable                                                                       | `010`              |
| `class_ids`                 | `UUID[]`      | `DEFAULT '{}'`, index GIN                                                      | `010`              |
| `rejection_reason`          | `TEXT`        | nullable (rempli si `status = 'rejected'`)                                     | `20251208100000`   |
| `status_changed_at`         | `TIMESTAMPTZ` | nullable                                                                       | `20251208100000`   |
| `status_changed_by`         | `UUID`        | FK → `profiles(id)` ON DELETE SET NULL                                         | `20251208100000`   |
| `python_settings`           | `JSONB`       | `DEFAULT '{"editorTheme":"default","fontSize":14,"showPedagogicErrors":true}'` | `20251205160000`   |
| `consent_required`          | `BOOLEAN`     | `NOT NULL DEFAULT FALSE` (RGPD art. 8)                                         | `20260115140000`   |
| `consent_granted_at`        | `TIMESTAMPTZ` | nullable                                                                       | `20260115140000`   |
| `consent_grace_period_ends` | `TIMESTAMPTZ` | nullable                                                                       | `20260115140000`   |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`                                                       | `001`              |

### Types enumeres

```sql
-- 001_initial_schema.sql
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');

-- 20251208100000_add_approval_status_to_profiles.sql
CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
```

- `role` → **moteur du RBAC**. Lu en base par `requireRole` / `requireRoles`
  (`src/lib/server/middleware/auth.ts`) et `getUserProfile` (`src/lib/server/auth.ts`),
  **jamais** depuis le JWT.
- `status` → **workflow d'approbation**. `DEFAULT 'approved'` pour la retrocompatibilite ;
  les nouveaux comptes `@voltairedoha.com` sont forces a `pending` par le trigger (voir
  ci-dessous). La garde de routes protegees s'appuie sur ce champ
  (`src/routes/(protected)/+layout.server.ts`).

### Index

| Index                    | Colonnes                                               | Migration        |
| ------------------------ | ------------------------------------------------------ | ---------------- |
| `idx_profiles_role`      | `(role)`                                               | `001`            |
| `idx_profiles_status`    | `(status)`                                             | `20251208100000` |
| `idx_profiles_pending`   | `(created_at DESC) WHERE status = 'pending'` (partiel) | `20251208100000` |
| `idx_profiles_class_ids` | `GIN (class_ids)`                                      | `010`            |

### RLS — `profiles`

RLS active des `001`. Politiques principales (les migrations ulterieures durcissent
l'auto-update) :

| Politique                                             | Operation | Condition                                                                                                                                                                 |
| ----------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Users can view their own profile`                    | SELECT    | `auth.uid() = id`                                                                                                                                                         |
| `Users can update own profile`                        | UPDATE    | `auth.uid() = id` **ET** `role` inchange **ET** `status` inchange (`20251208100001`)                                                                                      |
| `Teachers can view student profiles in their classes` | SELECT    | `role = 'student'` ET `is_my_student(id)` — mono-prof : `is_my_student` delegue a `is_teacher_or_admin()`, donc le prof unique / l'admin voit **tous** les profils eleves |
| `Teachers can view pending users for approval`        | SELECT    | `status = 'pending'` ET `is_teacher_or_admin()` (`20251208100001`)                                                                                                        |
| `Teachers and admins can update user status`          | UPDATE    | `auth.uid() != id` ET `is_teacher_or_admin()` (`20251208100001`)                                                                                                          |

> **Point de securite cle.** La politique `Users can update own profile` empeche un
> utilisateur de modifier **son propre `role` ou `status`** : le `WITH CHECK` exige que
> `role` et `status` restent egaux a leurs valeurs courantes (via la fonction
> `SECURITY DEFINER` `get_user_status(uuid)` pour eviter la recursion RLS). Un eleve ne peut
> donc pas s'auto-promouvoir `admin` ni s'auto-approuver. La fonction `get_user_status` est
> definie dans `20251208100001_add_status_rls_policies.sql`.

> **Modele mono-professeur.** Un seul `teacher` (+ un seul `admin`). Les classes ne sont
> plus assignees a un prof (colonne `teacher_id` supprimee des tables de classes) ; les
> helpers d'autorisation de classe (`is_class_teacher`, `is_my_student`) **delèguent a
> `is_teacher_or_admin()`** et sont donc admin-inclusifs. La frontiere sociale = l'**ecole**,
> la classe = sous-groupe d'organisation. Detail : `docs/architecture/database-schema.md`
> § « Mono-teacher RLS model ».

### Trigger `handle_new_user` → `on_auth_user_created`

Cree automatiquement le profil quand un utilisateur s'inscrit via Supabase Auth
(`AFTER INSERT ON auth.users`). C'est le **lien `auth.users` → `profiles`**. Fonction
`SECURITY DEFINER` avec `SET search_path = public`.

Evolution (version courante = `20251208120000_fix_voltairedoha_approval_bypass.sql`) :

| Migration        | Apport                                                                                                                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `001` / `004`    | Creation initiale : insere `(id, email, role='student')`                                                                                                                                                                                                                               |
| `027`            | Si l'email existe dans `pending_students` (non active), pre-remplit le profil (firstname, lastname, school_id, grade, gender) et marque l'eleve active                                                                                                                                 |
| `029`            | En plus, **inscrit l'eleve** dans ses `class_ids` pre-assignees (boucle d'INSERT dans `class_members`)                                                                                                                                                                                 |
| `20251208120000` | Extrait l'avatar Google (`picture`/`avatar_url`), et **force `status='pending'` pour les emails `@voltairedoha.com`** (sinon `approved`). Corrige le bypass d'approbation : la colonne `status` ayant `DEFAULT 'approved'`, les nouveaux comptes auraient sinon contourne le workflow. |

Comportement de la version courante :

- **Eleve pre-importe** (dans `pending_students`, non active) → profil pre-rempli, inscription
  dans les classes, `status = 'approved'` (ajoute explicitement par l'enseignant).
- **Nouveau compte `@voltairedoha.com`** → `status = 'pending'` (approbation admin requise).
- **Autre nouveau compte** → `status = 'approved'`.
- **Profil deja existant** (`unique_violation`) → met a jour l'avatar Google si manquant.
- **Toute autre erreur** → `RAISE WARNING` sans **bloquer** la creation de l'utilisateur.

> **Lien avec le callback OAuth.** Le trigger (niveau base) et le callback
> `src/routes/(public)/auth/callback/+server.ts` (niveau applicatif, garde de domaine) sont
> complementaires ; le callback gere le cas du profil absent (signOut + erreur explicite).

---

## Table `google_integrations` (Process 2)

Stocke les tokens OAuth Google **chiffres** (AES-256-GCM, cote Node.js) pour l'integration
Classroom/Drive. **Une integration par enseignant** (`teacher_id UNIQUE`). Ce n'est pas un
mecanisme de login.

### Colonnes

| Colonne                     | Type          | Contraintes                                             |
| --------------------------- | ------------- | ------------------------------------------------------- |
| `id`                        | `UUID`        | PK `DEFAULT gen_random_uuid()`                          |
| `teacher_id`                | `UUID`        | `NOT NULL UNIQUE` FK → `profiles(id)` ON DELETE CASCADE |
| `access_token`              | `TEXT`        | `NOT NULL` — **chiffre** (court terme, ~1 h)            |
| `refresh_token`             | `TEXT`        | `NOT NULL` — **chiffre** (long terme)                   |
| `token_expiry`              | `TIMESTAMPTZ` | `NOT NULL`                                              |
| `scopes`                    | `TEXT[]`      | `NOT NULL DEFAULT '{}'`, `CHECK array_length > 0`       |
| `google_email`              | `TEXT`        | `NOT NULL`, `CHECK` format e-mail                       |
| `last_sync_at`              | `TIMESTAMPTZ` | nullable                                                |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`                                |

> Le chiffrement/dechiffrement est realise **hors base**, par
> `src/lib/server/google/encryption.ts` (AES-256-GCM, IV aleatoire + auth tag). La base ne
> stocke que le chiffre en `TEXT`. Voir [security.md](security.md) findings #4, #13, #14.

### Index

`idx_google_integrations_teacher (teacher_id)` et `idx_google_integrations_expiry
(token_expiry)`.

### Triggers

`trigger_update_google_integrations_updated_at` (`BEFORE UPDATE`) met `updated_at = NOW()`.

### RLS — `google_integrations`

RLS active. Politiques (toutes en role `authenticated`) :

| Politique                                          | Operation | Condition                                   |
| -------------------------------------------------- | --------- | ------------------------------------------- |
| `Teachers can view their own Google integration`   | SELECT    | `teacher_id = auth.uid()`                   |
| `Teachers can insert their own Google integration` | INSERT    | `teacher_id = auth.uid()` ET role `teacher` |
| `Teachers can update their own Google integration` | UPDATE    | `teacher_id = auth.uid()`                   |
| `Teachers can delete their own Google integration` | DELETE    | `teacher_id = auth.uid()`                   |
| `Admins can view all Google integrations`          | SELECT    | role `admin` (support)                      |

Un enseignant ne voit donc **que sa propre** integration ; les admins peuvent lire toutes les
integrations (mais les tokens restent chiffres). Aucun eleve n'a acces a cette table.

---

## Table `user_restrictions` (Process 1)

Moderation au niveau base : mute / timeout / ban, portee conversation ou globale.

### Colonnes

| Colonne                     | Type          | Contraintes                                                |
| --------------------------- | ------------- | ---------------------------------------------------------- |
| `id`                        | `UUID`        | PK `DEFAULT gen_random_uuid()`                             |
| `user_id`                   | `UUID`        | `NOT NULL` FK → `profiles(id)` ON DELETE CASCADE           |
| `scope_type`                | `TEXT`        | `CHECK IN ('conversation','global')`                       |
| `scope_id`                  | `UUID`        | FK → `conversations(id)` ON DELETE CASCADE, NULL si global |
| `restriction_type`          | `TEXT`        | `CHECK IN ('mute','timeout','ban')`                        |
| `reason`                    | `TEXT`        | `NOT NULL CHECK (length(reason) >= 5)`                     |
| `restricted_by`             | `UUID`        | `NOT NULL` FK → `profiles(id)` (audit)                     |
| `expires_at`                | `TIMESTAMPTZ` | NULL = permanent                                           |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()`                                   |

Contraintes metier :

- `valid_scope` : `(global ET scope_id NULL)` OU `(conversation ET scope_id NOT NULL)`.
- `unique_active_restriction` : `UNIQUE (user_id, scope_type, scope_id, restriction_type)`
  empeche les doublons actifs.

### RLS — `user_restrictions`

| Politique                          | Operation | Condition                                                                                |
| ---------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| `Teachers can view restrictions`   | SELECT    | role `teacher`/`admin`                                                                   |
| `Users can view own restrictions`  | SELECT    | `auth.uid() = user_id` (`20251111000000`)                                                |
| `Teachers can create restrictions` | INSERT    | role `teacher`/`admin` ET `restricted_by = auth.uid()`                                   |
| `Teachers can update restrictions` | UPDATE    | role `teacher`/`admin` ; `WITH CHECK` fige `user_id` et `restricted_by` (audit immuable) |
| `Teachers can delete restrictions` | DELETE    | role `teacher`/`admin`                                                                   |

Helper `SECURITY DEFINER` `is_user_restricted(p_user_id, p_conversation_id)` : retourne `true`
si une restriction active (globale ou de la conversation) existe. Trigger
`trigger_update_user_restrictions_updated_at` (`BEFORE UPDATE`).

---

## Table `user_presence` (Process 1)

Statut en ligne par WebSocket. PK = `user_id` (1 ligne par utilisateur).

### Colonnes

| Colonne          | Type          | Contraintes                                       |
| ---------------- | ------------- | ------------------------------------------------- |
| `user_id`        | `UUID`        | PK, FK → `profiles(id)` ON DELETE CASCADE         |
| `status`         | `TEXT`        | `CHECK IN ('online','offline') DEFAULT 'offline'` |
| `last_heartbeat` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()`                          |
| `updated_at`     | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()`                          |

### RLS — `user_presence`

| Politique                        | Operation | Condition                                                           |
| -------------------------------- | --------- | ------------------------------------------------------------------- |
| `Users can view own presence`    | SELECT    | `auth.uid() = user_id`                                              |
| `Users can view friend presence` | SELECT    | `user_id` parmi les amis acceptes (`friendships` status `accepted`) |
| `Users can manage own presence`  | ALL       | `auth.uid() = user_id`                                              |

Fonctions associees (`SECURITY DEFINER`) : `upsert_user_presence`, `cleanup_stale_presence`
(passe `offline` apres 2 min sans heartbeat), `get_friend_ids`. Trigger
`user_presence_updated_at_trigger`.

---

## Annexe — `error_logs` (journalisation, hors theme strict)

`error_logs` n'est pas une table du theme `authentication`, mais le flux d'auth y ecrit
(profil manquant, etc., via `src/hooks.server.ts:178` et `(protected)/+layout.server.ts`).
A noter pour la confidentialite : le contexte journalise inclut `user_email` (PII — voir
[security.md](security.md) finding #11).

RLS (migration `20251023024428_create_error_monitoring_system.sql`) :

| Politique                                       | Operation            | Condition                              |
| ----------------------------------------------- | -------------------- | -------------------------------------- |
| `admin_view_error_logs`                         | SELECT               | `is_admin()`                           |
| `admin_insert_error_logs` / `update` / `delete` | INSERT/UPDATE/DELETE | `is_admin()`                           |
| `service_insert_error_logs`                     | INSERT               | `true` (service-role / log applicatif) |

Lecture **admin uniquement** ; insertion ouverte au service-role pour permettre la
journalisation applicative.

---

## Relations recapitulatives

| Relation                           | Type                      | Sens                                             |
| ---------------------------------- | ------------------------- | ------------------------------------------------ |
| `auth.users` → `profiles`          | 1:1                       | Cree par trigger `handle_new_user`               |
| `profiles.role` → RBAC             | logique                   | Lu en base a chaque requete protegee             |
| `profiles` → `google_integrations` | 1:1 (`teacher_id UNIQUE`) | Process 2, enseignant uniquement                 |
| `profiles` → `user_restrictions`   | 1:N                       | `user_id` (cible) + `restricted_by` (moderateur) |
| `profiles` → `user_presence`       | 1:1                       | `user_id` PK                                     |
| `profiles` → `error_logs`          | 1:N                       | `user_id` ON DELETE SET NULL                     |

**Voir aussi :** [security.md](security.md) (audit de securite, findings, Process 1 vs 2).
