# Audit de Conformite RGPD - UbuMaths

> **Date d'audit** : 2026-01-15
> **Version** : 1.2
> **Statut global** : PARTIELLEMENT CONFORME (6/10)

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

| Categorie                       | Score    | Statut                  |
| ------------------------------- | -------- | ----------------------- |
| Authentification & Autorisation | 9/10     | Excellent               |
| Chiffrement & Securite          | 8/10     | Bon                     |
| Minimisation des donnees        | 9/10     | Excellent               |
| Retention des donnees           | 2/10     | **CRITIQUE**            |
| Droits utilisateur              | 6/10     | Partiel (v1.2)          |
| Documentation legale            | 7/10     | Bon (v1.2)              |
| Consentement mineurs            | 0/10     | **Manquant**            |
| **GLOBAL**                      | **6/10** | **PARTIELLEMENT CONF.** |

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

### 5.1 CRITIQUE - Pas de politique de retention

**Article RGPD viole** : Art. 5(1)(e) - Limitation de la conservation

**Situation actuelle** :

- `profiles` : Conservation indefinie
- `student_attempts` : Conservation indefinie
- `student_progress` : Conservation indefinie
- `messages` : Conservation indefinie
- `private_messages` : Soft delete uniquement

**Seule exception** :

- `error_logs` : 90 jours (cleanup automatique)

**Impact** : Les donnees pedagogiques des eleves sont conservees a vie sans justification legale.

---

### 5.2 ~~CRITIQUE - Pas de droit a l'oubli~~ **CORRIGE** (2026-01-15)

**Article RGPD** : Art. 17 - Droit a l'effacement

**Situation actuelle** :

- ~~Aucune API pour supprimer un compte utilisateur~~ **API implementee** (`DELETE /api/account/delete`)
- Aucune interface utilisateur pour demander la suppression (a implementer)
- ~~Soft deletes sur les messages (contenu reste accessible)~~ **Hard delete avec anonymisation des audits**

> **Amelioration 2026-01-15** : Implementation de l'API de suppression de compte conforme RGPD Art. 17. La fonction `delete_user_account` anonymise les tables d'audit (preservant l'integrite des logs), supprime les messages/notifications, et prepare la suppression CASCADE. Confirmation explicite requise ("SUPPRIMER MON COMPTE").

---

### 5.3 CRITIQUE - Pas de consentement parental pour mineurs

**Article RGPD viole** : Art. 8 - Conditions applicables au consentement des enfants

**Situation actuelle** :

- Aucune verification d'age
- Aucun mecanisme de consentement parental
- ~~Collecte de `gender` (donnee sensible) sans consentement~~ **CORRIGE** (2026-01-15)
- Eleves de 11-15 ans concernes

**Impact** : Collecte de donnees d'enfants < 15 ans sans consentement parental (exige par la CNIL).

> **Amelioration 2026-01-15** : Le champ `gender` a ete supprime des tables `profiles` et `pending_students` conformement au principe de minimisation des donnees (Art. 5(1)(c)). Ce champ n'etait utilise que pour la selection d'avatars, ce qui ne justifiait pas la collecte de cette donnee sensible sur des mineurs.

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

### 5.5 IMPORTANT - Pas d'export de donnees

**Article RGPD viole** : Art. 20 - Droit a la portabilite

**Situation actuelle** :

- Aucune API pour exporter ses donnees
- Aucune interface utilisateur pour telecharger ses donnees

---

### 5.6 IMPORTANT - Pas d'audit trail

**Bonne pratique RGPD non respectee**

**Situation actuelle** :

- Aucun logging des acces aux donnees sensibles
- Aucun logging des modifications de donnees pedagogiques
- Impossible de repondre a "qui a accede aux donnees de mon enfant ?"

---

### 5.7 IMPORTANT - Pas de DPA avec sous-traitants

**Article RGPD viole** : Art. 28 - Sous-traitant

**Sous-traitants identifies sans DPA documente** :

- Google (OAuth, Classroom, Drive, Gmail)
- Supabase (hebergement, BDD)
- Groq (LLM API si active)
- Vercel (deploiement)
- Sentry (monitoring, optionnel)

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

```sql
-- Migration: add_retention_policies.sql

-- Fonction de nettoyage des anciennes donnees
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- Donnees pedagogiques: 5 ans apres fin d'annee scolaire
    DELETE FROM student_attempts
    WHERE created_at < NOW() - INTERVAL '5 years'
    AND student_id IN (
        SELECT id FROM profiles
        WHERE updated_at < NOW() - INTERVAL '5 years'
    );

    -- Messages: 3 ans
    DELETE FROM messages
    WHERE created_at < NOW() - INTERVAL '3 years';

    DELETE FROM private_messages
    WHERE sent_at < NOW() - INTERVAL '3 years';

    -- Presence: 30 jours
    DELETE FROM user_presence
    WHERE updated_at < NOW() - INTERVAL '30 days';

    -- Friendships inactives: 2 ans
    DELETE FROM friendships
    WHERE status = 'rejected'
    AND updated_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Job CRON (a configurer dans Supabase)
SELECT cron.schedule(
    'cleanup-expired-data',
    '0 3 * * 0',  -- Dimanche 3h du matin
    'SELECT cleanup_expired_data()'
);
```

### 7.2 Droit a l'oubli

```typescript
// src/routes/api/account/delete/+server.ts

import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const deleteSchema = z.object({
	confirmation: z.literal('DELETE MY ACCOUNT'),
	password: z.string().optional()
});

export const DELETE: RequestHandler = async ({ locals, request }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Non authentifie');

	const validation = deleteSchema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, 'Confirmation requise');
	}

	const supabase = locals.supabase;

	// 1. Supprimer toutes les donnees utilisateur (cascade)
	// Les FK ON DELETE CASCADE gerent la plupart des suppressions

	// 2. Supprimer les messages (hard delete, pas soft delete)
	await supabase.from('private_messages').delete().eq('sender_id', user.id);

	await supabase.from('messages').delete().eq('sender_id', user.id);

	// 3. Supprimer le profil
	await supabase.from('profiles').delete().eq('id', user.id);

	// 4. Supprimer l'utilisateur Supabase Auth
	const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

	if (authError) {
		throw error(500, 'Erreur lors de la suppression');
	}

	return json({ success: true, message: 'Compte supprime' });
};
```

### 7.3 Export de donnees

```typescript
// src/routes/api/account/export/+server.ts

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Non authentifie');

	const format = url.searchParams.get('format') || 'json';
	const supabase = locals.supabase;

	// Collecter toutes les donnees personnelles
	const [profile, attempts, progress, messages, friendships] = await Promise.all([
		supabase.from('profiles').select('*').eq('id', user.id).single(),
		supabase.from('student_attempts').select('*').eq('student_id', user.id),
		supabase.from('student_progress').select('*').eq('student_id', user.id),
		supabase.from('private_messages').select('*').eq('sender_id', user.id),
		supabase
			.from('friendships')
			.select('*')
			.or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
	]);

	const exportData = {
		exported_at: new Date().toISOString(),
		user_id: user.id,
		profile: profile.data,
		student_attempts: attempts.data,
		student_progress: progress.data,
		messages_sent: messages.data,
		friendships: friendships.data
	};

	if (format === 'csv') {
		// Conversion CSV (simplifiee)
		return new Response(JSON.stringify(exportData, null, 2), {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="ubumaths-export-${user.id}.json"`
			}
		});
	}

	return json(exportData);
};
```

### 7.4 Consentement parental

```sql
-- Migration: add_parental_consent.sql

CREATE TABLE parental_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    parent_email TEXT NOT NULL,
    parent_name TEXT NOT NULL,
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    consent_token UUID UNIQUE DEFAULT gen_random_uuid(),
    consent_given_at TIMESTAMPTZ,
    consent_ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Index pour recherche par token
CREATE INDEX idx_parental_consents_token ON parental_consents(consent_token);

-- RLS
ALTER TABLE parental_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage consents"
ON parental_consents FOR ALL
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
```

```typescript
// src/routes/api/consent/verify/[token]/+server.ts

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals, getClientAddress }) => {
	const { token } = params;
	const supabase = locals.supabaseAdmin; // Service role pour cette operation

	// Verifier le token
	const { data: consent, error: fetchError } = await supabase
		.from('parental_consents')
		.select('*')
		.eq('consent_token', token)
		.gt('expires_at', new Date().toISOString())
		.single();

	if (fetchError || !consent) {
		throw error(404, 'Lien de consentement invalide ou expire');
	}

	// Enregistrer le consentement
	const { error: updateError } = await supabase
		.from('parental_consents')
		.update({
			consent_given: true,
			consent_given_at: new Date().toISOString(),
			consent_ip: getClientAddress()
		})
		.eq('id', consent.id);

	if (updateError) {
		throw error(500, "Erreur lors de l'enregistrement du consentement");
	}

	// Activer le compte eleve
	await supabase.from('profiles').update({ is_active: true }).eq('id', consent.student_id);

	return json({ success: true, message: 'Consentement enregistre' });
};
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

- [ ] Politique de confidentialite publiee et accessible
- [ ] CGU publiees et acceptees lors de l'inscription
- [ ] Mentions legales publiees
- [ ] Mecanisme de consentement parental operationnel
- [ ] API de suppression de compte fonctionnelle
- [ ] API d'export de donnees fonctionnelle

### Obligations continues

- [ ] Registre des traitements a jour (Art. 30)
- [ ] DPA signes avec tous les sous-traitants
- [ ] Jobs de cleanup automatiques actifs
- [ ] Audit trail operationnel
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
| 2026-01-15 | 1.2     | API suppression compte (Art. 17), Documentation legale (Art. 13-14, CGU, ML) |
| 2026-01-15 | 1.1     | Suppression champ `gender` (Art. 5(1)(c) - minimisation)                     |
| 2026-01-15 | 1.0     | Audit initial                                                                |

---

**Document genere le** : 2026-01-15
**Prochaine revue** : 2026-04-15 (trimestrielle)
