# Google Classroom Integration - Setup Guide

Guide complet pour configurer l'intégration Google Classroom dans UbuMaths.

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Configuration Google Cloud](#configuration-google-cloud)
4. [Configuration du projet](#configuration-du-projet)
5. [Migration de la base de données](#migration-de-la-base-de-données)
6. [Test de l'intégration](#test-de-lintégration)
7. [Architecture technique](#architecture-technique)
8. [Dépannage](#dépannage)

---

## 🎯 Vue d'ensemble

L'intégration Google Classroom permet aux enseignants de :

- **Connecter** leur compte Google Classroom personnel
- **Associer** manuellement les cours Google Classroom aux classes UbuMaths
- **Synchroniser** les travaux et devoirs depuis Google Classroom
- **Organiser** les documents par catégories (Cours, Exercices, Corrections, Devoirs, Évaluations)
- **Partager** les documents avec toute la classe ou des élèves spécifiques
- **Donner accès** aux élèves via l'interface UbuMaths avec aperçu et liens externes

### Fonctionnalités clés

- ✅ OAuth 2.0 avec PKCE (sécurité renforcée)
- ✅ Chiffrement AES-256-GCM des tokens
- ✅ Synchronisation manuelle à la demande
- ✅ Support de tous types de fichiers (PDF, vidéos, Google Docs, etc.)
- ✅ Catégorisation automatique des travaux
- ✅ Gestion des dates d'échéance avec alertes visuelles
- ✅ Row Level Security (RLS) complet

---

## 📦 Prérequis

### Outils requis

- **Node.js** ≥ 18
- **pnpm** ≥ 8
- **Docker** (pour Supabase local)
- **Compte Google Cloud** avec accès à la console

### Accès requis

- Accès administrateur au projet Google Cloud
- Accès au tableau de bord Supabase (production)
- Accès au dépôt GitHub pour les variables d'environnement

---

## ☁️ Configuration Google Cloud

### Étape 1 : Créer un projet Google Cloud

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un nouveau projet ou sélectionner un projet existant
3. Activer les APIs nécessaires :
   - **Google Classroom API**
   - **Google Drive API**

```bash
# Via gcloud CLI (optionnel)
gcloud services enable classroom.googleapis.com
gcloud services enable drive.googleapis.com
```

### Étape 2 : Configurer l'écran de consentement OAuth

1. Aller dans **APIs & Services** > **OAuth consent screen**
2. Choisir **External** (pour permettre tout utilisateur Google)
3. Remplir les informations requises :
   - **App name** : UbuMaths
   - **User support email** : Votre email
   - **Developer contact** : Votre email
4. Ajouter les scopes nécessaires :
   - `https://www.googleapis.com/auth/classroom.courses.readonly`
   - `https://www.googleapis.com/auth/classroom.coursework.me.readonly`
   - `https://www.googleapis.com/auth/classroom.coursework.students.readonly`
   - `https://www.googleapis.com/auth/drive.readonly`

### Étape 3 : Créer les identifiants OAuth 2.0

1. Aller dans **APIs & Services** > **Credentials**
2. Cliquer sur **Create Credentials** > **OAuth client ID**
3. Choisir **Web application**
4. Configurer :
   - **Name** : UbuMaths Google Classroom
   - **Authorized redirect URIs** :
     - Local : `http://localhost:5175/api/google/auth/callback`
     - Production : `https://ubumaths.com/api/google/auth/callback`
5. Sauvegarder et noter :
   - **Client ID** : `xxxxx.apps.googleusercontent.com`
   - **Client Secret** : `GOCSPX-xxxxx`

---

## 🔧 Configuration du projet

### Étape 1 : Générer la clé de chiffrement

La clé de chiffrement protège les tokens OAuth dans la base de données.

```bash
# Générer une clé aléatoire de 32 bytes en base64
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Exemple de sortie** : `h3F9kL2mN8pQ5rS7tV9wX1yZ3aB5cD7eF9gH1jK3lM5n=`

⚠️ **IMPORTANT** : Conservez cette clé en sécurité ! Elle ne peut jamais être changée après la première utilisation (les tokens existants deviendraient indéchiffrables).

### Étape 2 : Configurer les variables d'environnement

#### Développement local (`.env.local`)

```bash
# Google Classroom OAuth
GOOGLE_CLASSROOM_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLASSROOM_CLIENT_SECRET="GOCSPX-xxxxx"
GOOGLE_CLASSROOM_REDIRECT_URI="http://localhost:5175/api/google/auth/callback"

# Encryption (CRITICAL - Never commit to git!)
GOOGLE_TOKEN_ENCRYPTION_KEY="h3F9kL2mN8pQ5rS7tV9wX1yZ3aB5cD7eF9gH1jK3lM5n="
```

#### Production (Vercel)

Ajouter ces variables dans **Vercel Dashboard** > **Project Settings** > **Environment Variables** :

```
GOOGLE_CLASSROOM_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLASSROOM_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_CLASSROOM_REDIRECT_URI=https://ubumaths.com/api/google/auth/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=h3F9kL2mN8pQ5rS7tV9wX1yZ3aB5cD7eF9gH1jK3lM5n=
```

#### Supabase (pour RLS et triggers)

Ajouter dans **Supabase Dashboard** > **Project Settings** > **Database** > **Secrets** :

```sql
-- Via SQL Editor dans Supabase Dashboard
ALTER DATABASE postgres SET app.encryption_key TO 'h3F9kL2mN8pQ5rS7tV9wX1yZ3aB5cD7eF9gH1jK3lM5n=';

-- Vérifier la configuration
SELECT current_setting('app.encryption_key', true);
```

### Étape 3 : Validation de la configuration

```bash
# Le serveur de développement validera automatiquement les variables
pnpm dev -- --port 5175

# Vous devriez voir une erreur si des variables manquent :
# "GOOGLE_TOKEN_ENCRYPTION_KEY required when using Google Classroom integration"
```

---

## 💾 Migration de la base de données

### Étape 1 : Démarrer Supabase local (optionnel - pour tests)

```bash
pnpm db:start
# Attendre que tous les services démarrent (30-60 secondes)
```

### Étape 2 : Appliquer les migrations

```bash
# Production (via Supabase CLI)
pnpm db:migrate

# Ou manuellement via SQL Editor dans Supabase Dashboard
# Copier le contenu de supabase/migrations/20251114120000_google_classroom_integration.sql
```

### Étape 3 : Vérifier les tables créées

```bash
# Via psql ou Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%google%'
ORDER BY table_name;
```

**Tables attendues** :

- `class_google_classroom_links`
- `coursework_categories`
- `coursework_materials`
- `google_classroom_courses`
- `google_classroom_coursework`
- `google_integrations`
- `shared_coursework`
- `shared_coursework_students`

### Étape 4 : Régénérer les types TypeScript

```bash
# Mettre à jour src/lib/types/database.ts
pnpm db:types
```

---

## ✅ Test de l'intégration

### Phase 1 : Connexion OAuth (Enseignant)

1. Se connecter en tant qu'enseignant
2. Aller dans **Paramètres** > **Google Classroom**
3. Cliquer sur **Connecter Google Classroom**
4. Autoriser l'accès sur Google
5. Vérifier le statut de connexion : **Connecté**

**Logs à vérifier** :

```bash
# Serveur de développement
[Google OAuth] State generated: xxx
[Google OAuth] Code received, exchanging for tokens
[Google OAuth] Tokens stored successfully
```

### Phase 2 : Synchronisation des cours

1. Cliquer sur **Synchroniser maintenant**
2. Attendre la fin de la synchronisation (quelques secondes)
3. Vérifier le message de succès :
   - "X cours synchronisés"
   - "Y travaux synchronisés"
   - "Z catégories créées"

**Vérification database** :

```sql
-- Cours synchronisés
SELECT name, section, enrollment_code
FROM google_classroom_courses
WHERE teacher_id = 'xxx';

-- Travaux synchronisés
SELECT title, description, state
FROM google_classroom_coursework
WHERE course_id IN (SELECT id FROM google_classroom_courses WHERE teacher_id = 'xxx');
```

### Phase 3 : Association classe ↔ cours (TODO - Phase 7)

> **Note** : Cette fonctionnalité est prévue pour la Phase 7
> Les enseignants devront manuellement associer chaque classe UbuMaths à un cours Google Classroom.

### Phase 4 : Partage aux élèves (TODO - Phase 8)

> **Note** : Cette fonctionnalité est prévue pour la Phase 8
> Les enseignants pourront choisir quels travaux partager, à quelle classe, et optionnellement à quels élèves spécifiques.

### Phase 5 : Visualisation élève

1. Se connecter en tant qu'élève
2. Aller dans **Classe** (menu principal)
3. Vérifier l'affichage des travaux partagés
4. Tester l'ouverture des documents (liens externes)

**Test de sécurité** :

```bash
# Tenter d'accéder aux travaux d'un autre élève (doit échouer)
curl -X GET http://localhost:5175/api/google/coursework/xxx \
  -H "Authorization: Bearer <student_token>"

# Réponse attendue : 403 Forbidden
```

---

## 🏗️ Architecture technique

### Flux de données complet

```
┌─────────────────┐
│  Google OAuth   │  1. Enseignant clique "Connecter"
│   (PKCE Flow)   │  2. Redirect vers Google → autorisation
└────────┬────────┘  3. Callback avec code → échange tokens
         │           4. Tokens chiffrés (AES-256-GCM)
         ▼           5. Stockés dans google_integrations
┌─────────────────┐
│ google_         │
│ integrations    │  • access_token (chiffré)
└────────┬────────┘  • refresh_token (chiffré)
         │           • expires_at
         │
         ▼
┌─────────────────┐
│  Sync Service   │  1. Fetch courses (Google Classroom API)
│                 │  2. Upsert google_classroom_courses
└────────┬────────┘  3. Fetch coursework per course
         │           4. Upsert google_classroom_coursework
         ▼           5. Extract materials (Drive links, etc.)
┌─────────────────┐  6. Upsert coursework_materials
│ google_         │
│ classroom_      │  • Courses (id, name, section)
│ tables          │  • Coursework (title, desc, due_date)
└────────┬────────┘  • Materials (title, url, drive_id)
         │
         ▼
┌─────────────────┐
│  Manual Link    │  Enseignant associe :
│  (Phase 7)      │  • classe UbuMaths ↔ cours Google
└────────┬────────┘  Table : class_google_classroom_links
         │
         ▼
┌─────────────────┐
│  Sharing UI     │  Enseignant partage :
│  (Phase 8)      │  • Coursework → shared_coursework
└────────┬────────┘  • Optionnel : students → shared_coursework_students
         │
         ▼
┌─────────────────┐
│  Student View   │  Élève voit :
│  (Phase 6 ✅)   │  • Travaux de sa classe (RLS)
└─────────────────┘  • Catégories, dates, matériaux
```

### Schéma de sécurité

```
┌──────────────────────────────────────────────────┐
│  NIVEAU 1 : OAuth 2.0 + PKCE                     │
├──────────────────────────────────────────────────┤
│  • Code Verifier (random 128 chars)              │
│  • Code Challenge (SHA-256 hash)                 │
│  • State (CSRF protection, cookie httpOnly)      │
│  • Authorization Code (single use)               │
└───────────────────┬──────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│  NIVEAU 2 : Chiffrement AES-256-GCM              │
├──────────────────────────────────────────────────┤
│  • Clé : 32 bytes aléatoires (base64)            │
│  • Dérivation : PBKDF2 (100k iterations)         │
│  • IV : 16 bytes aléatoires par token            │
│  • AuthTag : 16 bytes pour intégrité             │
│  • Format : [IV]:[AuthTag]:[CipherText]          │
└───────────────────┬──────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│  NIVEAU 3 : Row Level Security (RLS)             │
├──────────────────────────────────────────────────┤
│  • google_integrations : teacher_id = auth.uid() │
│  • shared_coursework : via class membership      │
│  • coursework_materials : via shared_coursework  │
│  • Fail-closed (DENY by default)                 │
└──────────────────────────────────────────────────┘
```

### Structure des fichiers

```
src/
├── lib/
│   ├── server/
│   │   ├── google/
│   │   │   ├── oauth.ts                  # OAuth 2.0 + PKCE flow
│   │   │   ├── encryption.ts             # AES-256-GCM encryption
│   │   │   ├── classroom-api.ts          # Google Classroom API client
│   │   │   ├── drive-api.ts              # Google Drive API client (unused)
│   │   │   ├── sync.ts                   # Sync orchestration
│   │   │   ├── utils.ts                  # Date parsing, material extraction
│   │   │   ├── errors.ts                 # Custom error classes
│   │   │   └── schemas.ts                # Zod validation schemas
│   │   └── validation/
│   │       └── google.ts                 # Request validation schemas
│   └── types/
│       └── google.ts                     # TypeScript types for Google API
│
├── routes/
│   ├── api/
│   │   └── google/
│   │       ├── auth/
│   │       │   ├── connect/+server.ts    # Initiate OAuth
│   │       │   ├── callback/+server.ts   # OAuth callback
│   │       │   ├── disconnect/+server.ts # Revoke access
│   │       │   └── status/+server.ts     # Check connection
│   │       ├── sync/+server.ts           # Manual sync
│   │       └── courses/+server.ts        # List courses
│   │
│   └── (protected)/
│       └── dashboard/
│           ├── teacher/
│           │   └── settings/
│           │       └── google/
│           │           └── +page.svelte  # Teacher settings UI
│           └── student/
│               └── classroom/
│                   ├── +page.server.ts   # Data loading
│                   └── +page.svelte      # Student view UI
│
supabase/
└── migrations/
    └── 20251114120000_google_classroom_integration.sql  # Schema + RLS

docs/
├── architecture/
│   └── google-classroom-schema.md        # Schema documentation
└── guides/
    └── google-classroom-setup.md         # Ce fichier
```

---

## 🔧 Dépannage

### Erreur : "Encryption key not configured"

**Symptôme** : Warning lors de la migration ou erreur au démarrage

**Solution** :

```bash
# 1. Générer une clé
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 2. L'ajouter à .env.local
echo "GOOGLE_TOKEN_ENCRYPTION_KEY=<votre_clé>" >> .env.local

# 3. L'ajouter à Supabase
# Via SQL Editor :
ALTER DATABASE postgres SET app.encryption_key TO '<votre_clé>';
```

### Erreur : "Invalid state parameter (CSRF protection)"

**Symptôme** : Erreur 400 lors du callback OAuth

**Causes possibles** :

1. Cookie bloqué (SameSite, third-party cookies)
2. Redirect trop lent (cookie expiré)
3. Tentative de CSRF attack

**Solution** :

```typescript
// Vérifier la configuration des cookies dans oauth.ts
cookies.set('google_oauth_state', state, {
  path: '/',
  httpOnly: true,
  secure: true,  // Doit être true en production HTTPS
  sameSite: 'lax',
  maxAge: 600  // 10 minutes
});
```

### Erreur : "Failed to refresh access token"

**Symptôme** : Erreur après quelques heures, synchronisation échoue

**Cause** : Le refresh token est invalide ou révoqué

**Solution** :

1. Enseignant doit se reconnecter
2. Vérifier que le scope `offline_access` est activé (implicite avec `access_type=offline`)

### Erreur : "Rate limit exceeded (429)"

**Symptôme** : Erreur lors de la synchronisation avec beaucoup de cours

**Cause** : Dépassement des quotas Google API

**Solution** :

L'API client implémente déjà un retry avec exponential backoff (2s, 4s, 8s, 16s). Si le problème persiste :

```typescript
// Augmenter les délais dans classroom-api.ts
const calculateBackoff = (attempt: number) => {
  return Math.min(1000 * Math.pow(2, attempt), 32000); // Max 32s au lieu de 16s
};
```

### Erreur : Database types obsolètes

**Symptôme** : Erreurs TypeScript après migration

**Solution** :

```bash
# Régénérer les types
pnpm db:types

# Redémarrer le serveur
pnpm dev -- --port 5175
```

### Problème : Les élèves ne voient pas les travaux

**Vérifications** :

1. **Migration appliquée ?**
   ```sql
   SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'shared_coursework');
   ```

2. **Travaux partagés ?**
   ```sql
   SELECT COUNT(*) FROM shared_coursework WHERE visible = true;
   ```

3. **Élève inscrit dans la classe ?**
   ```sql
   SELECT * FROM class_members WHERE user_id = '<student_id>' AND role = 'student';
   ```

4. **RLS policies actives ?**
   ```sql
   SELECT tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies
   WHERE tablename LIKE '%coursework%';
   ```

---

## 🚀 Prochaines étapes (Phases futures)

### Phase 7 : Association Classes ↔ Cours (TODO)

Permettre aux enseignants d'associer manuellement une classe UbuMaths à un cours Google Classroom.

**UI attendue** :

```
Classe : CM2-A
Cours Google Classroom : [Dropdown : Mathématiques CM2 2024-2025]
[Associer]
```

**Table** : `class_google_classroom_links` (déjà créée)

### Phase 8 : Interface de partage enseignant (TODO)

Permettre aux enseignants de :

- Voir tous les travaux synchronisés
- Choisir quels travaux partager
- Choisir la classe cible
- Optionnellement restreindre à certains élèves

**UI attendue** :

```
Travaux disponibles :
☐ Exercice 1 - Fractions (Mathématiques CM2)
☐ Contrôle - Tables de multiplication (Mathématiques CM2)

[Partager avec] : [Dropdown : Classe CM2-A]
Élèves spécifiques (optionnel) : [Multi-select]

[Partager]
```

**Tables** : `shared_coursework` + `shared_coursework_students` (déjà créées)

### Phase 9 : Synchronisation automatique (TODO)

Ajouter un cron job ou webhook pour synchroniser automatiquement les nouveaux travaux.

**Options** :

- **Vercel Cron** : `/api/cron/google-sync` (quotidien)
- **Supabase Functions** : Trigger périodique
- **Google Pub/Sub** : Webhooks temps réel (avancé)

### Phase 10 : Analytics enseignant (TODO)

Permettre aux enseignants de voir :

- Quels élèves ont ouvert les documents
- Combien de temps passé sur chaque document
- Taux de complétion des travaux

**Nouveau schéma** :

```sql
CREATE TABLE coursework_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id),
  coursework_id UUID REFERENCES google_classroom_coursework(id),
  material_id UUID REFERENCES coursework_materials(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER
);
```

---

## 📚 Ressources

### Documentation officielle

- [Google Classroom API](https://developers.google.com/classroom)
- [Google Drive API](https://developers.google.com/drive)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [PKCE (RFC 7636)](https://datatracker.ietf.org/doc/html/rfc7636)

### Documentation interne

- [Database Schema](../architecture/google-classroom-schema.md)
- [Architecture Overview](../architecture/README.md)
- [Best Practices](../claude/best-practices.md)

### Support

- **Issues GitHub** : Créer un issue pour les bugs ou questions
- **Logs Vercel** : Vérifier les erreurs en production
- **Supabase Dashboard** : Vérifier les logs database et API

---

## ✅ Checklist de déploiement

Avant de déployer en production :

- [ ] Variables d'environnement configurées dans Vercel
- [ ] Clé de chiffrement configurée dans Supabase (`app.encryption_key`)
- [ ] Migration appliquée en production (`pnpm db:migrate`)
- [ ] Types TypeScript régénérés (`pnpm db:types`)
- [ ] OAuth credentials créés dans Google Cloud Console
- [ ] Redirect URI production ajouté dans Google Cloud Console
- [ ] APIs Google activées (Classroom + Drive)
- [ ] Tests manuels effectués :
  - [ ] Connexion OAuth
  - [ ] Synchronisation cours
  - [ ] Visualisation élève
  - [ ] Déconnexion

---

**Version** : 1.0.0 (14 novembre 2025)
**Auteur** : Claude Code
**Statut** : ✅ Phases 1-6 complètes, Phases 7-10 à venir
