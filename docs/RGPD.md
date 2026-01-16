# Audit de Conformite RGPD - UbuMaths

> **Date d'audit** : 2026-01-16
> **Version** : 1.11
> **Statut global** : CONFORME (9/10)

---

## Table des matieres

1. [Resume executif](#1-resume-executif)
2. [Donnees personnelles collectees](#2-donnees-personnelles-collectees)
3. [Flux de donnees](#3-flux-de-donnees)
4. [Securite existante](#4-securite-existante)
5. [Lacunes critiques](#5-lacunes-critiques)
6. [Plan d'action](#6-plan-daction)
7. [Implementation technique](#7-implementation-technique)
8. [Documents legaux a creer](#8-documents-legaux-a-creer)
9. [Checklist de conformite](#9-checklist-de-conformite)

---

## 1. Resume executif

### Etat de conformite par categorie

| Categorie                       | Score    | Statut           |
| ------------------------------- | -------- | ---------------- |
| Authentification & Autorisation | 9/10     | Excellent        |
| Chiffrement & Securite          | 8/10     | Bon              |
| Minimisation des donnees        | 9/10     | Excellent        |
| Retention des donnees           | 8/10     | Bon (v1.5)       |
| Droits utilisateur              | 10/10    | Excellent (v1.6) |
| Documentation legale            | 7/10     | Bon (v1.2)       |
| Consentement mineurs            | 9/10     | Excellent (v1.8) |
| Tracabilite & Audit             | 8/10     | Bon (v1.9)       |
| **GLOBAL**                      | **9/10** | **CONFORME**     |

### Risques legaux

- **Amende CNIL** : Jusqu'a 20M EUR ou 4% du chiffre d'affaires
- **Poursuites parentales** : Si donnees d'enfants mal gerees
- **Interdiction d'operation** : En cas de violations graves (art. 83 RGPD)

### Points forts actuels

- Chiffrement AES-256-GCM des tokens Google
- Row-Level Security (RLS) sur toutes les tables Supabase
- Cookies httpOnly/secure/sameSite
- Validation Zod sur tous les endpoints API
- Authentification OAuth PKCE securisee
- **Minimisation des donnees** : champ `gender` supprime (v1.1)

---

## 2. Donnees personnelles collectees

### 2.1 Donnees de profil (`profiles`)

| Champ                              | Sensibilite    | Base legale               | Mineurs      |
| ---------------------------------- | -------------- | ------------------------- | ------------ |
| `id` (UUID)                        | Haute          | Contrat                   | Oui          |
| `email`                            | **Tres haute** | Contrat                   | Oui          |
| `firstname`, `lastname`            | Moyenne        | Contrat                   | Oui          |
| `avatar_url`                       | Basse          | Contrat                   | Oui          |
| ~~`gender`~~                       | ~~Haute~~      | **SUPPRIME** (2026-01-15) | Art. 5(1)(c) |
| `grade` (6eme, 5eme...)            | Moyenne        | Contrat                   | Oui          |
| `role` (student/teacher/admin)     | Basse          | Contrat                   | Oui          |
| `gidouilles`, `bonus`, `vip_cards` | Basse          | Contrat                   | Oui          |

### 2.2 Donnees Google OAuth (`google_integrations`)

> **Enseignants uniquement**

| Champ           | Sensibilite    | Chiffrement |
| --------------- | -------------- | ----------- |
| `access_token`  | **Tres haute** | AES-256-GCM |
| `refresh_token` | **Tres haute** | AES-256-GCM |
| `google_email`  | **Tres haute** | Non         |
| `scopes`        | Moyenne        | Non         |

**Scopes collectes** :

- `openid`, `email`, `profile` - Identite
- `classroom.courses.readonly` - Cours Google Classroom
- `classroom.coursework.students.readonly` - Notes et travaux
- `drive.file` - Fichiers Google Drive
- `gmail.send` - Envoi d'emails (**A revoir - trop large**)

### 2.3 Donnees pre-enregistrees (`pending_students`)

| Champ                   | Sensibilite    | Remarque                                 |
| ----------------------- | -------------- | ---------------------------------------- |
| `email`                 | **Tres haute** | Email enfant avant activation            |
| `firstname`, `lastname` | Moyenne        |                                          |
| ~~`gender`~~            | ~~Haute~~      | **SUPPRIME** (2026-01-15) - Art. 5(1)(c) |
| `grade`                 | Moyenne        |                                          |

### 2.4 Donnees pedagogiques

#### `student_attempts` - Historique des exercices

```
student_id        -> Identite eleve
submitted_answer  -> Reponse donnee (peut contenir texte libre)
is_correct        -> Performance
time_spent_seconds -> Temps passe
hints_used        -> Comportement d'apprentissage
```

#### `student_progress` - Statistiques agregees

```
student_id        -> Identite eleve
mastery_level     -> Niveau de maitrise (0.00-1.00)
exercises_completed -> Volume d'activite
total_points      -> Accumulation de points
```

#### `assignment_submissions` - Travaux remis

```
student_id        -> Identite eleve
completion_percentage -> Performance
submitted_at      -> Horodatage activite
```

### 2.5 Donnees de communication

#### `messages` / `private_messages` - Contenu des echanges

```
sender_id         -> Identite auteur
content           -> Contenu du message (TipTap JSON)
plain_text        -> Texte brut (pour recherche)
```

> **Attention** : Les messages supprimes sont en "soft delete" - le contenu reste accessible aux enseignants.

#### `friendships` - Reseau social

```
requester_id      -> Identite demandeur
addressee_id      -> Identite destinataire
status            -> pending/accepted/rejected
```

#### `user_presence` - Tracking temps reel

```
user_id           -> Identite utilisateur
status            -> online/offline
last_heartbeat    -> Derniere activite
```

### 2.6 Donnees de gamification

#### `game_players` - Profil joueur

```
user_id           -> Identite joueur
level, xp         -> Progression
total_combats     -> Historique activite
last_played_at    -> Dernier acces
```

### 2.7 Donnees de monitoring (`error_logs`)

```
user_id           -> Identite utilisateur (nullable)
url               -> Page visitee
stack_trace       -> Erreur technique
request_body      -> Corps de requete (peut contenir PII)
user_agent        -> Navigateur/OS
browser_name, os_name -> Empreinte technique
```

> **Probleme** : Les `request_body` peuvent contenir des donnees personnelles non sanitisees.

---

## 3. Flux de donnees

### 3.1 Authentification Google OAuth

```
Client -> POST /api/google/auth/connect
       <- URL Google + cookies CSRF/PKCE (httpOnly, 10 min)

Client -> Google OAuth
       <- Consentement utilisateur

Google -> GET /api/google/auth/callback
       -> Validation CSRF
       -> Echange code -> tokens
       -> Chiffrement AES-256-GCM
       -> Stockage google_integrations
       -> Creation session Supabase
```

### 3.2 Sync Google Classroom

```
Enseignant -> POST /api/google/classroom/sync
           -> Decryptage access_token
           -> Refresh si expire
           -> GET Google Classroom API
              - /courses
              - /coursework
              - /submissions (contient emails eleves!)
           -> Stockage dans BD UbuMaths
```

> **Risque** : Les emails des eleves Google Classroom sont importes sans consentement explicite des eleves/parents.

### 3.3 Messagerie

```
Eleve -> POST /api/messages/private/send
      -> Validation sender = auth.uid()
      -> Creation private_messages
      -> Creation message_inbox (1 par destinataire)
      -> Realtime broadcast aux participants
```

### 3.4 Error logging

```
Erreur client -> POST /api/error-logs
             -> Collecte: user_id, url, stack_trace, request_body
             -> Hash signature SHA-256
             -> Stockage error_logs
             -> Deduplication error_occurrences
```

> **Probleme** : Pas de sanitization des PII dans request_body.

---

## 4. Securite existante

### Points positifs

| Mecanisme          | Implementation                 | Evaluation |
| ------------------ | ------------------------------ | ---------- |
| Chiffrement tokens | AES-256-GCM                    | Excellent  |
| Cookies            | httpOnly, secure, sameSite     | Excellent  |
| Authentication     | Google OAuth PKCE + CSRF       | Excellent  |
| JWT                | Signe, expiry 1h, refresh auto | Bon        |
| Validation inputs  | Zod sur tous endpoints         | Bon        |
| RLS Supabase       | Active sur toutes tables       | Bon        |
| Rate limiting      | Configurable (15 min window)   | Bon        |

### Variables d'environnement protegees

```
GOOGLE_TOKEN_ENCRYPTION_KEY   # Cle AES-256
SUPABASE_SERVICE_ROLE_KEY     # Cle admin Supabase
SESSION_SECRET                # Secret session
CSRF_SECRET                   # Secret CSRF
CRON_SECRET                   # Secret taches planifiees
```

---

## 5. Lacunes critiques

### 5.1 ~~CRITIQUE - Pas de politique de retention~~ **CORRIGE** (2026-01-15)

**Article RGPD** : Art. 5(1)(e) - Limitation de la conservation

**Situation actuelle** :

- ~~`profiles` : Conservation indefinie~~ Profils actifs conserves, donnees nettoyees apres inactivite
- ~~`student_attempts` : Conservation indefinie~~ **5 ans + user inactif 2 ans**
- ~~`student_progress` : Conservation indefinie~~ **5 ans + user inactif 2 ans**
- ~~`messages` : Conservation indefinie~~ **3 ans (HARD delete)**
- ~~`private_messages` : Soft delete uniquement~~ **3 ans (HARD delete)**
- `user_presence` : **30 jours**
- `friendships` (rejected) : **2 ans**
- `error_logs` : **90 jours** (resolved)

> **Amelioration 2026-01-15** : Implementation de la politique de retention via pg_cron. Job hebdomadaire `rgpd-retention-cleanup` (dimanche 03:00 UTC) nettoie automatiquement les donnees expirees. Audit complet dans `background_job_runs` avec compteurs par table pour preuve de conformite. Messages en HARD delete (pas soft delete) conformement a l'Art. 17.

---

### 5.2 ~~CRITIQUE - Pas de droit a l'oubli~~ **CORRIGE** (2026-01-15)

**Article RGPD** : Art. 17 - Droit a l'effacement

**Situation actuelle** :

- ~~Aucune API pour supprimer un compte utilisateur~~ **API implementee** (`DELETE /api/account/delete`)
- ~~Aucune interface utilisateur pour demander la suppression~~ **UI implementee** (menu utilisateur)
- ~~Soft deletes sur les messages (contenu reste accessible)~~ **Hard delete avec anonymisation des audits**

> **Amelioration 2026-01-15** : Implementation complete de la suppression de compte conforme RGPD Art. 17. Comprend : API avec rate limiting (1/24h), table d'audit, fonction SQL d'anonymisation, et interface utilisateur avec confirmation en deux etapes. Accessible via le menu utilisateur dans le dashboard.

---

### 5.3 ~~CRITIQUE - Pas de consentement parental pour mineurs~~ **CORRIGE** (2026-01-16)

**Article RGPD** : Art. 8 - Conditions applicables au consentement des enfants

**Situation actuelle** :

- ~~Aucune verification d'age~~ **CORRIGE** : Detection automatique par niveau scolaire (6eme-2nde = <15 ans)
- ~~Aucun mecanisme de consentement parental~~ **CORRIGE** : Systeme complet implemente
- ~~Collecte de `gender` (donnee sensible) sans consentement~~ **CORRIGE** (2026-01-15)
- Eleves de 11-15 ans concernes (grades 6, 5, 4, 3, 2)

> **Amelioration 2026-01-15** : Le champ `gender` a ete supprime des tables `profiles` et `pending_students` conformement au principe de minimisation des donnees (Art. 5(1)(c)).

> **Amelioration 2026-01-16** : Implementation complete du systeme de consentement parental :
>
> - **Detection automatique** : Eleves en 6eme-2nde (grades '6','5','4','3','2') necessitent consentement
> - **Mode lecture seule** : Sans consentement, eleves peuvent consulter mais pas soumettre/jouer/acheter
> - **Periode de grace** : 30 jours pour les eleves existants
> - **Workflow enseignant** : Dashboard `/dashboard/teacher/consent` pour gerer les emails parents
> - **Verification par email** : Token unique, expiration 7 jours, limite 5 emails/eleve
> - **Page de consentement** : `/consent/[token]` publique pour parents (sans authentification)
> - **Audit** : IP et user-agent enregistres lors du consentement
>
> **Tables creees** : `parental_consents` avec RLS
> **Champs ajoutes** : `profiles.consent_required`, `profiles.consent_granted_at`, `profiles.consent_grace_period_ends` > **Fonctions SQL** : `get_consent_info()`, `grant_parental_consent()` (SECURITY DEFINER)

---

### 5.4 ~~CRITIQUE - Pas de politique de confidentialite~~ **CORRIGE** (2026-01-15)

**Article RGPD** : Art. 13-14 - Droit a l'information

**Situation actuelle** :

- ~~Aucun document de politique de confidentialite~~ **Cree** (`/legal/confidentialite`)
- ~~Aucunes mentions legales~~ **Cree** (`/legal/mentions-legales`)
- ~~Aucunes CGU~~ **Cree** (`/legal/cgu`)
- Aucun bandeau de consentement cookies (a implementer si cookies non-essentiels)

> **Amelioration 2026-01-15** : Creation de la documentation legale complete accessible via le footer : Politique de Confidentialite (Art. 13-14), Conditions Generales d'Utilisation, et Mentions Legales. Documents sources dans `docs/legal/`.

---

### 5.5 ~~IMPORTANT - Pas d'export de donnees~~ **CORRIGE** (2026-01-15)

**Article RGPD** : Art. 20 - Droit a la portabilite

**Situation actuelle** :

- ~~Aucune API pour exporter ses donnees~~ **API implementee** (`GET /api/account/export`)
- ~~Interface utilisateur a implementer~~ **UI implementee** (menu utilisateur > "Exporter mes donnees")

> **Amelioration 2026-01-15** : Implementation complete de l'export de donnees conforme RGPD Art. 20. L'endpoint exporte toutes les donnees personnelles en JSON structure : profil, donnees pedagogiques (tentatives, progression, soumissions, flashcards), communications (messages, notifications), donnees sociales (amities), gaming, recompenses, et appartenance aux classes. Rate limiting (1/heure), headers de telechargement, et exclusion des tokens OAuth sensibles. UI accessible via le menu utilisateur dans le dashboard.

---

### 5.6 ~~IMPORTANT - Pas d'audit trail~~ **CORRIGE** (2026-01-16)

**Bonne pratique RGPD** : Art. 5(2) - Principe de responsabilite

**Situation actuelle** :

- ~~Aucun logging des acces aux donnees sensibles~~ **CORRIGE** : Table `audit_logs` avec triggers
- ~~Aucun logging des modifications de donnees pedagogiques~~ **CORRIGE** : Triggers sur `exercise_completions`, `student_exercise_mastery`
- ~~Impossible de repondre a "qui a accede aux donnees de mon enfant ?"~~ **CORRIGE** : RLS permet aux parents/enseignants de voir les logs

> **Amelioration 2026-01-16** : Implementation complete de l'audit trail RGPD via migration `20260116100000_create_audit_trail.sql`. Comprend :
>
> - **Table `audit_logs`** : Capture user_id, action, table_name, record_id, old/new values, timestamps
> - **Triggers automatiques** : Sur `profiles`, `student_attempts`, `student_progress`
> - **RLS granulaire** : Admins voient tout, users voient leurs propres logs, enseignants voient logs de leurs eleves
> - **Fonction de retention** : `cleanup_old_audit_logs(days)` pour nettoyage (defaut 2 ans)
> - **Documentation** : `docs/ref/audit-trail/database-schema.md`

---

### 5.7 ~~IMPORTANT - Pas de DPA avec sous-traitants~~ **DOCUMENTE** (2026-01-16)

**Article RGPD** : Art. 28 - Sous-traitant

**Sous-traitants identifies et documentes** :

- Google (OAuth, Classroom, Drive, Gmail) - DPA disponible
- Supabase (hebergement, BDD) - DPA disponible, region UE
- Groq (LLM API) - A verifier
- Vercel (deploiement) - DPA disponible
- Sentry (monitoring) - Optionnel, non utilise

> **Amelioration 2026-01-16** : Creation du registre des sous-traitants `docs/legal/registre-sous-traitants.md` conformement a l'Art. 28. Documente tous les sous-traitants, leurs DPAs, les donnees traitees, et les mecanismes de transfert hors UE (SCCs).
>
> **Actions restantes** :
>
> - Conserver copies signees des DPAs
> - Verifier politique zero-retention de Groq
> - Configurer regions UE pour Vercel si possible

---

### 5.8 MOYEN - Scopes Google trop larges

**Probleme** : Le scope `gmail.send` permet d'envoyer des emails au nom de l'utilisateur.

**Question** : Est-ce vraiment necessaire ? Si non, reduire les scopes.

---

### 5.9 MOYEN - Error logs avec PII

**Situation actuelle** :

- `request_body` peut contenir des donnees de formulaire (noms, emails)
- `url` peut reveler des identifiants
- Pas de sanitization automatique

---

## 6. Plan d'action

### Phase 1 - URGENT (1-2 semaines)

| Action                             | Priorite | Effort  | Article RGPD |
| ---------------------------------- | -------- | ------- | ------------ |
| Creer politique de confidentialite | CRITIQUE | 3 jours | Art. 13-14   |
| Creer CGU                          | CRITIQUE | 2 jours | -            |
| Creer mentions legales             | CRITIQUE | 1 jour  | LCEN         |
| Implementer droit a l'oubli (API)  | CRITIQUE | 3 jours | Art. 17      |
| Definir politique de retention     | CRITIQUE | 2 jours | Art. 5(1)(e) |

### Phase 2 - IMPORTANT (2-4 semaines)

| Action                         | Priorite | Effort  | Article RGPD |
| ------------------------------ | -------- | ------- | ------------ |
| Systeme consentement parental  | HAUTE    | 5 jours | Art. 8       |
| Export donnees utilisateur     | HAUTE    | 3 jours | Art. 20      |
| Bandeau cookies (si analytics) | HAUTE    | 2 jours | ePrivacy     |
| DPA avec sous-traitants        | HAUTE    | 3 jours | Art. 28      |

### Phase 3 - MOYEN TERME (1-3 mois)

| Action                       | Priorite | Effort  | Article RGPD   |
| ---------------------------- | -------- | ------- | -------------- |
| Audit trail complet          | MOYENNE  | 5 jours | Bonne pratique |
| Reduire scopes Google        | MOYENNE  | 2 jours | Art. 5(1)(c)   |
| Sanitization error logs      | MOYENNE  | 2 jours | Art. 5(1)(c)   |
| Jobs de cleanup automatiques | MOYENNE  | 3 jours | Art. 5(1)(e)   |
| DPIA (Analyse d'impact)      | MOYENNE  | 5 jours | Art. 35        |

---

## 7. Implementation technique

### 7.1 Politique de retention

**Implementation** : `supabase/migrations/20260115100000_pg_cron_rgpd_retention_cleanup.sql`

```sql
-- Fonction principale de nettoyage RGPD (implementee)
CREATE OR REPLACE FUNCTION public.run_cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
    -- Compteurs pour audit trail
    v_error_logs_deleted INTEGER := 0;
    v_presence_deleted INTEGER := 0;
    v_friendships_deleted INTEGER := 0;
    v_messages_deleted INTEGER := 0;
    v_private_messages_deleted INTEGER := 0;
    v_attempts_deleted INTEGER := 0;
    v_progress_deleted INTEGER := 0;
BEGIN
    v_run_id := start_job_run('retention_cleanup', jsonb_build_object(
        'retention_periods', jsonb_build_object(
            'error_logs_days', 90,
            'presence_days', 30,
            'friendships_years', 2,
            'messages_years', 3,
            'pedagogical_years', 5,
            'inactive_threshold_years', 2
        )
    ));

    -- 1. Error logs (90 jours, resolved seulement)
    -- 2. User presence (30 jours)
    -- 3. Friendships rejected (2 ans)
    -- 4. Messages chat (3 ans) - HARD delete
    -- 5. Private messages (3 ans) - CASCADE inbox/attachments
    -- 6. Student attempts (5 ans + user inactif 2 ans)
    -- 7. Student progress (5 ans + user inactif 2 ans)

    -- Complete job avec metadata audit
    PERFORM complete_job_run(v_run_id, 'success', NULL, jsonb_build_object(
        'total_deleted', v_total_deleted,
        'rgpd_compliance', 'Art. 5(1)(e) - Storage limitation'
    ));
END;
$$;

-- Job pg_cron schedule (dimanche 03:00 UTC)
-- Nom: 'rgpd-retention-cleanup'
-- Cron: '0 3 * * 0'
```

**Verification** :

```sql
-- Voir le job schedule
SELECT * FROM cron.job WHERE jobname = 'rgpd-retention-cleanup';

-- Voir les resultats
SELECT job_name, status, metadata FROM background_job_runs
WHERE job_name = 'retention_cleanup' ORDER BY started_at DESC LIMIT 1;
```

### 7.2 Droit a l'oubli

**Implementation** : `src/routes/api/account/delete/+server.ts`

Fonctionnalites implementees :

- **Rate limiting** : 1 demande par 24h par utilisateur
- **Audit table** : `account_deletion_requests` pour tracabilite
- **Fonction SQL** : `delete_user_account_rgpd(uuid)` pour anonymisation complete
- **UI** : Confirmation en 2 etapes (dialogue + saisie "SUPPRIMER")

```typescript
// Points cles de l'implementation
const deleteSchema = z.object({
	confirmation: z.literal('SUPPRIMER') // Confirmation explicite FR
});

// Rate limiting: 1 per 24h
rateLimit(`account_delete:${userId}`, 1, 24 * 60 * 60 * 1000);

// Audit trail avant suppression
await supabase.from('account_deletion_requests').insert({
	user_id: userId,
	email: user.email,
	requested_at: new Date().toISOString(),
	status: 'completed'
});

// Suppression via fonction SQL (anonymise messages, supprime donnees)
await supabase.rpc('delete_user_account_rgpd', { p_user_id: userId });
```

**UI** : Menu utilisateur > "Supprimer mon compte"

### 7.3 Export de donnees

**Implementation** : `src/routes/api/account/export/+server.ts`

Fonctionnalites implementees :

- **Rate limiting** : 1 export par heure par utilisateur
- **Format** : JSON structure avec categories
- **Headers** : Content-Disposition pour telechargement automatique
- **Securite** : Exclusion des tokens OAuth sensibles

**Categories exportees** :
| Categorie | Tables | Limite |
|-----------|--------|--------|
| `profile` | profiles | - |
| `learning.attempts` | student_attempts | 1000 derniers |
| `learning.progress` | student_progress | tout |
| `learning.submissions` | assignment_submissions | tout |
| `learning.flashcards` | srs_cards | tout |
| `communications.messages_sent` | messages | 500 derniers |
| `communications.private_messages_sent` | private_messages | 500 derniers |
| `communications.notifications` | notifications | 200 derniers |
| `social.friendships` | friendships | tout |
| `gaming.player_stats` | game_players | - |
| `rewards.inventory` | student_item_inventory | tout |
| `rewards.gidouilles_history` | gidouilles_history | 500 derniers |
| `rewards.bonus_history` | bonus_history | 500 derniers |
| `rewards.purchases` | shop_purchase_history | 200 derniers |
| `classes.memberships` | class_members | tout |

**Metadata incluses** :

```json
{
	"_metadata": {
		"exported_at": "ISO timestamp",
		"user_id": "UUID",
		"format_version": "1.0",
		"gdpr_article": "Article 20 - Droit a la portabilite"
	}
}
```

**UI** : Menu utilisateur > "Exporter mes donnees"

### 7.4 Consentement parental

**Implementation** : Systeme complet implemente (2026-01-16)

#### Schema de base de donnees

```sql
-- Champs ajoutes a profiles
ALTER TABLE profiles ADD COLUMN consent_required BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN consent_granted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN consent_grace_period_ends TIMESTAMPTZ;

-- Table parental_consents
CREATE TABLE parental_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    parent_email TEXT NOT NULL,
    parent_name TEXT,
    status consent_status DEFAULT 'pending', -- 'pending' | 'granted' | 'expired'
    consent_token UUID UNIQUE DEFAULT gen_random_uuid(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    consent_given_at TIMESTAMPTZ,
    consent_ip INET,
    consent_user_agent TEXT,
    email_count INTEGER DEFAULT 0, -- Max 5 emails par eleve
    last_email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fonctions SECURITY DEFINER pour acces anonyme des parents
CREATE FUNCTION get_consent_info(p_token UUID)
RETURNS TABLE(student_name TEXT, grade TEXT, school_name TEXT, teacher_name TEXT, status TEXT);

CREATE FUNCTION grant_parental_consent(p_token UUID, p_ip INET, p_user_agent TEXT)
RETURNS BOOLEAN;
```

#### Fichiers implementes

| Fichier                                                         | Description                                                                         |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/lib/utils/consent.ts`                                      | Utilitaires: `requiresParentalConsent()`, `hasValidConsent()`, `getConsentStatus()` |
| `src/lib/server/middleware/consent.ts`                          | Middleware: `requireConsent()` pour endpoints API                                   |
| `src/routes/(public)/consent/[token]/+page.svelte`              | Page publique de consentement parent                                                |
| `src/routes/(protected)/dashboard/teacher/consent/+page.svelte` | Dashboard enseignant                                                                |
| `src/routes/api/consent/send-email/+server.ts`                  | API envoi email via Gmail                                                           |
| `src/lib/email-templates/parental-consent.ts`                   | Template email HTML/texte                                                           |
| `src/lib/components/ConsentBanner.svelte`                       | Banniere d'avertissement eleve                                                      |
| `src/lib/components/ConsentButton.svelte`                       | Bouton desactive si pas de consentement                                             |
| `src/lib/stores/consent.svelte.ts`                              | Store client-side pour etat consentement                                            |

#### Endpoints proteges par `requireConsent()`

- `/api/exercises/[id]/complete` - Soumission exercices
- `/api/student/chapters/[id]/quiz/submit` - Soumission quiz
- `/api/python-exercises/[id]/submit` - Exercices Python
- `/api/riddles/[id]/submit` - Enigmes
- `/api/srs/review/submit` - Flashcards
- `/api/chat` - Messages IA
- `/api/messages/send` - Messagerie
- `/api/games/2048/scores` - Scores jeux
- `/api/games/minesweeper/start` - Demarrage jeux
- `/api/vip-cards/*` - Cartes VIP (achat, utilisation)
- `/api/rewards/draw-vip-cards` - Tirage cartes
- `/api/marketplace/trades` - Marketplace

#### Workflow

```
1. Enseignant importe eleves (CSV ou manuel)
   ↓
2. Systeme detecte grade ∈ ['6','5','4','3','2'] → consent_required = TRUE
   ↓
3. Eleve se connecte → Mode lecture seule + banniere d'avertissement
   ↓
4. Enseignant va sur /dashboard/teacher/consent
   ↓
5. Enseignant ajoute email parent + envoie demande
   ↓
6. Parent recoit email avec lien /consent/[token]
   ↓
7. Parent clique "J'autorise" → consent_granted_at = NOW()
   ↓
8. Eleve a acces complet
```

### 7.5 Audit trail

```sql
-- Migration: add_audit_trail.sql

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Fonction trigger generique
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Appliquer sur tables sensibles
CREATE TRIGGER audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_student_attempts
AFTER INSERT OR UPDATE OR DELETE ON student_attempts
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_student_progress
AFTER INSERT OR UPDATE OR DELETE ON student_progress
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

---

## 8. Documents legaux a creer

### 8.1 Structure recommandee

```
docs/legal/
├── politique-confidentialite.md     # Politique de confidentialite (FR)
├── privacy-policy.md                # Privacy Policy (EN)
├── conditions-utilisation.md        # CGU (FR)
├── terms-of-service.md              # ToS (EN)
├── mentions-legales.md              # Mentions legales (LCEN)
├── consentement-parental.md         # Formulaire consentement
├── dpa/
│   ├── google-dpa.md               # DPA avec Google
│   ├── supabase-dpa.md             # DPA avec Supabase
│   └── template-dpa.md             # Template DPA
└── registre-traitements.md          # Registre des traitements (Art. 30)
```

### 8.2 Politique de confidentialite - Structure

```markdown
# Politique de Confidentialite - UbuMaths

## 1. Identite du responsable de traitement

- Nom de l'entite
- Adresse
- Contact DPO (si applicable)

## 2. Donnees collectees

- Donnees d'identification (nom, email)
- Donnees pedagogiques (exercices, notes, progression)
- Donnees de communication (messages)
- Donnees techniques (cookies, logs)

## 3. Finalites du traitement

- Fourniture du service educatif
- Suivi de la progression scolaire
- Communication eleve-enseignant
- Amelioration du service

## 4. Base legale

- Execution du contrat (service educatif)
- Consentement (mineurs, communications marketing)
- Interet legitime (securite, amelioration)

## 5. Destinataires des donnees

- Enseignants (donnees de leurs eleves)
- Sous-traitants (Supabase, Google)
- Aucune vente a des tiers

## 6. Transferts hors UE

- Google Cloud (adequation, SCCs)
- Supabase (serveurs EU preferes)

## 7. Duree de conservation

- Profils : duree de la scolarite + 5 ans
- Donnees pedagogiques : 5 ans apres fin d'annee
- Messages : 3 ans
- Logs techniques : 90 jours

## 8. Droits des utilisateurs

- Droit d'acces
- Droit de rectification
- Droit a l'effacement
- Droit a la portabilite
- Droit d'opposition
- Contact : [email]

## 9. Protection des mineurs

- Consentement parental requis < 15 ans
- Minimisation des donnees collectees (pas de donnees sensibles)
- Droit de retrait du consentement

## 10. Securite

- Chiffrement des communications (HTTPS)
- Chiffrement des donnees sensibles (AES-256)
- Controle d'acces (RLS)

## 11. Cookies

- Cookies strictement necessaires (session)
- Pas de cookies analytics sans consentement

## 12. Modifications

- Notification par email en cas de changement majeur
- Date de derniere mise a jour
```

### 8.3 Mentions legales - Structure

```markdown
# Mentions Legales

## Editeur du site

- Raison sociale
- Forme juridique
- Capital social
- Siege social
- RCS / SIRET
- Directeur de publication

## Hebergement

- Vercel Inc.
- Adresse
- Supabase Inc.
- Adresse

## Propriete intellectuelle

- Tous droits reserves
- Marques deposees

## Limitation de responsabilite

- Clause standard

## Droit applicable

- Droit francais
- Tribunaux competents
```

---

## 9. Checklist de conformite

### Avant mise en production

- [x] Politique de confidentialite publiee et accessible (v1.2)
- [x] CGU publiees et acceptees lors de l'inscription (v1.2)
- [x] Mentions legales publiees (v1.2)
- [x] Mecanisme de consentement parental operationnel (v1.8)
- [x] API de suppression de compte fonctionnelle (v1.3)
- [x] API d'export de donnees fonctionnelle (v1.4)

### Obligations continues

- [x] Registre des traitements a jour (v1.11 - registre-traitements.md)
- [x] DPA documentes avec sous-traitants (v1.10 - registre-sous-traitants.md)
- [x] Jobs de cleanup automatiques actifs (v1.5 - pg_cron rgpd-retention-cleanup)
- [x] Audit trail operationnel (v1.9 - audit_logs avec triggers)
- [ ] Formation des equipes (sensibilisation RGPD)

### En cas de violation de donnees (Art. 33-34)

1. **Notification CNIL** : 72h maximum
2. **Notification utilisateurs** : Si risque eleve pour droits
3. **Documentation** : Registre des violations
4. **Mesures correctives** : Rapport d'incident

---

## Annexes

### A. Contacts utiles

- **CNIL** : https://www.cnil.fr
- **Formulaire plainte CNIL** : https://www.cnil.fr/fr/plaintes
- **Referentiel CNIL Education** : A consulter pour conformite specifique

### B. References RGPD

- Art. 5 - Principes relatifs au traitement
- Art. 6 - Licéite du traitement
- Art. 8 - Conditions applicables au consentement des enfants
- Art. 13-14 - Droit a l'information
- Art. 17 - Droit a l'effacement
- Art. 20 - Droit a la portabilite
- Art. 28 - Sous-traitant
- Art. 30 - Registre des activites de traitement
- Art. 33-34 - Notification de violation

### C. Historique des modifications

| Date       | Version | Modifications                                                                |
| ---------- | ------- | ---------------------------------------------------------------------------- |
| 2026-01-16 | 1.11    | Registre des traitements complet (Art. 30)                                   |
| 2026-01-16 | 1.10    | Registre des sous-traitants (Art. 28 - DPA documentes)                       |
| 2026-01-16 | 1.9     | Audit trail complet (Art. 5(2) - responsabilite, traçabilite)                |
| 2026-01-16 | 1.8     | Consentement parental complet (Art. 8 - mineurs <15 ans)                     |
| 2026-01-15 | 1.7     | Mise a jour doc technique (section 7) avec implementations reelles           |
| 2026-01-15 | 1.6     | UI export donnees (Art. 20 complet - menu utilisateur)                       |
| 2026-01-15 | 1.5     | Politique de retention pg_cron (Art. 5(1)(e) - limitation conservation)      |
| 2026-01-15 | 1.4     | API export donnees (Art. 20 - portabilite)                                   |
| 2026-01-15 | 1.3     | UI suppression compte (Art. 17 complet), rate limiting, audit table          |
| 2026-01-15 | 1.2     | API suppression compte (Art. 17), Documentation legale (Art. 13-14, CGU, ML) |
| 2026-01-15 | 1.1     | Suppression champ `gender` (Art. 5(1)(c) - minimisation)                     |
| 2026-01-15 | 1.0     | Audit initial                                                                |

---

**Document genere le** : 2026-01-16
**Prochaine revue** : 2026-04-16 (trimestrielle)
