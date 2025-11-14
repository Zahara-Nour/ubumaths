# Google Classroom Integration - Next Steps

## ⚠️ Action requise avant de tester

L'intégration Google Classroom (Phases 1-6) est complète et pushée sur la branche `claude/google-drive-integration-01K9ceVisTk1ZqDYicFjrHEt`, mais nécessite les étapes suivantes pour être fonctionnelle :

---

## 1. Migration de la base de données

La migration n'a **pas encore été appliquée** à la base de données. Vous devez la pousser vers Supabase :

```bash
# Appliquer la migration à Supabase
pnpm db:migrate
```

Cette commande va créer :
- 8 nouvelles tables (google_integrations, google_classroom_courses, etc.)
- 28 RLS policies (sécurité multi-tenant)
- 20 indexes (performance)
- 5 triggers (updated_at auto)
- 1 fonction (initialize_default_categories)
- 1 vue (student_coursework_view)

**Note** : Le chiffrement des tokens se fait **côté Node.js** (AES-256-GCM), pas dans PostgreSQL. Les tables stockent les tokens déjà chiffrés.

---

## 2. Régénération des types TypeScript

Après la migration, vous **devez** régénérer les types TypeScript :

```bash
# Régénérer src/lib/types/database.ts
pnpm db:types
```

**Important** : Sans cette étape, vous aurez ~20 erreurs TypeScript dans les fichiers :
- `src/lib/server/google/sync.ts`
- `src/lib/server/google/oauth.ts`
- `src/lib/server/google/schemas.ts`

Ces erreurs sont **normales** avant la régénération des types (les nouvelles tables n'existent pas encore dans `database.ts`).

---

## 3. Configuration des variables d'environnement

Vous devez configurer les identifiants OAuth Google :

### 3.1 Google Cloud Console

1. Créer un projet sur [Google Cloud Console](https://console.cloud.google.com/)
2. Activer les APIs :
   - Google Classroom API
   - Google Drive API
3. Créer des identifiants OAuth 2.0 (voir [docs/guides/google-classroom-setup.md](docs/guides/google-classroom-setup.md))

### 3.2 Variables d'environnement locales

Créer/mettre à jour `.env.local` :

```bash
# OAuth Google
GOOGLE_CLASSROOM_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLASSROOM_CLIENT_SECRET="GOCSPX-xxxxx"
GOOGLE_CLASSROOM_REDIRECT_URI="http://localhost:5175/api/google/auth/callback"

# Clé de chiffrement (générer avec : node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
GOOGLE_TOKEN_ENCRYPTION_KEY="votre_clé_base64_32_bytes"
```

⚠️ **IMPORTANT** : Cette clé sert au chiffrement AES-256-GCM côté Node.js. Elle n'est **jamais** envoyée à PostgreSQL. Conservez-la en sécurité !

### 3.3 Production (Vercel)

Ajouter les mêmes variables dans **Vercel Dashboard** > **Project Settings** > **Environment Variables**.

---

## 4. Vérification après setup

Une fois les étapes 1-3 complétées :

```bash
# 1. Vérifier que les types sont corrects (APRÈS pnpm db:types)
pnpm check:fast
# Résultat attendu : 0 erreurs TypeScript

# 2. Vérifier le linting
pnpm lint
# Résultat attendu : 0 erreurs (34 warnings OK - patterns Svelte légitimes)

# 3. Démarrer le serveur
pnpm dev -- --port 5175

# 4. Tester l'intégration
# Se connecter en tant qu'enseignant
# Aller dans Paramètres > Google Classroom
# Cliquer "Connecter Google Classroom"
# Autoriser l'accès sur Google
# Vérifier le statut : "Connecté"
# Cliquer "Synchroniser maintenant"
# Vérifier les logs : "X cours synchronisés, Y travaux synchronisés"
```

---

## 5. Tests manuels recommandés

Après avoir vérifié que tout compile :

### Test 1 : Connexion OAuth
- [ ] Se connecter en tant qu'enseignant
- [ ] Aller dans Paramètres > Google Classroom
- [ ] Cliquer "Connecter Google Classroom"
- [ ] Autoriser l'accès sur Google
- [ ] Vérifier redirection vers UbuMaths
- [ ] Vérifier statut "Connecté"

### Test 2 : Synchronisation
- [ ] Cliquer "Synchroniser maintenant"
- [ ] Vérifier le message de succès
- [ ] Vérifier les statistiques affichées

### Test 3 : Visualisation élève
- [ ] Se connecter en tant qu'élève
- [ ] Aller dans Classe (menu principal)
- [ ] Vérifier que la page se charge (même si vide)
- [ ] Si des travaux ont été partagés, vérifier l'affichage

### Test 4 : Déconnexion
- [ ] Retourner dans Paramètres > Google Classroom
- [ ] Cliquer "Déconnecter"
- [ ] Vérifier statut "Non connecté"

---

## 6. Phases futures (TODO)

Les phases suivantes ne sont **pas encore implémentées** :

### Phase 7 : Association Classes ↔ Cours
- Permettre aux enseignants d'associer une classe UbuMaths à un cours Google Classroom
- Table `class_google_classroom_links` déjà créée
- UI à créer dans les paramètres de classe

### Phase 8 : Interface de partage enseignant
- Permettre aux enseignants de choisir quels travaux partager
- Choisir la classe cible
- Optionnellement restreindre à certains élèves
- Tables `shared_coursework` + `shared_coursework_students` déjà créées

### Phase 9 : Synchronisation automatique
- Cron job ou webhook pour synchroniser automatiquement
- Options : Vercel Cron, Supabase Functions, ou Google Pub/Sub

### Phase 10 : Analytics enseignant
- Suivre quels élèves ont ouvert les documents
- Temps passé sur chaque document
- Taux de complétion

---

## 7. Documentation complète

Pour tous les détails (setup OAuth, troubleshooting, architecture) :

📖 **[docs/guides/google-classroom-setup.md](docs/guides/google-classroom-setup.md)** (762 lignes)

Sections :
- Configuration Google Cloud Console (étapes détaillées)
- Configuration des variables d'environnement
- Migration de la base de données
- Tests de l'intégration
- Architecture technique (diagrammes de flux)
- Dépannage (7 problèmes courants)
- Phases futures (roadmap)

---

## 8. Résumé des fichiers créés

### Backend (Phase 1-3)
- ✅ `supabase/migrations/20251114120000_google_classroom_integration.sql` (8 tables, RLS)
- ✅ `src/lib/server/google/oauth.ts` (OAuth 2.0 + PKCE)
- ✅ `src/lib/server/google/encryption.ts` (AES-256-GCM)
- ✅ `src/lib/server/google/classroom-api.ts` (API client)
- ✅ `src/lib/server/google/drive-api.ts` (API client - unused for now)
- ✅ `src/lib/server/google/sync.ts` (Sync orchestration)
- ✅ `src/lib/server/google/utils.ts` (Helpers)
- ✅ `src/lib/server/google/errors.ts` (Custom errors)
- ✅ `src/lib/server/google/schemas.ts` (Zod validation)
- ✅ `src/lib/types/google.ts` (TypeScript types)
- ✅ `src/lib/server/validation/google.ts` (Request validation)

### API Endpoints (Phase 4)
- ✅ `src/routes/api/google/auth/connect/+server.ts`
- ✅ `src/routes/api/google/auth/callback/+server.ts`
- ✅ `src/routes/api/google/auth/disconnect/+server.ts`
- ✅ `src/routes/api/google/auth/status/+server.ts`
- ✅ `src/routes/api/google/sync/+server.ts`
- ✅ `src/routes/api/google/courses/+server.ts`

### UI (Phase 5-6)
- ✅ `src/routes/(protected)/dashboard/teacher/settings/google/+page.svelte`
- ✅ `src/routes/(protected)/dashboard/student/classroom/+page.server.ts`
- ✅ `src/routes/(protected)/dashboard/student/classroom/+page.svelte`

### Documentation
- ✅ `docs/architecture/google-classroom-schema.md`
- ✅ `docs/guides/google-classroom-setup.md`
- ✅ `docs/README.md` (mis à jour)

---

## 9. Statut actuel

| Phase | Statut | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ Complète | Database schema (8 tables, RLS, encryption) |
| **Phase 2** | ✅ Complète | OAuth config + encryption services |
| **Phase 3** | ✅ Complète | API clients (Classroom, Drive, sync) |
| **Phase 4** | ✅ Complète | REST API endpoints (6 endpoints) |
| **Phase 5** | ✅ Complète | Teacher settings UI |
| **Phase 6** | ✅ Complète | Student coursework view (MVP) |
| **Phase 7** | ⏳ TODO | Class ↔ Course association UI |
| **Phase 8** | ⏳ TODO | Teacher sharing interface |
| **Phase 9** | ⏳ TODO | Auto-sync (cron/webhooks) |
| **Phase 10** | ⏳ TODO | Student analytics |

**Branche Git** : `claude/google-drive-integration-01K9ceVisTk1ZqDYicFjrHEt`

**Commits** :
1. `8451acb` - Phase 1: Database schema
2. `7aeb3e1` - Phase 2: OAuth + encryption
3. `c967bd7` - Phase 3: API clients + sync
4. `82ffe3f` - Phase 4: REST API endpoints
5. `82fd240` - Phase 5: Teacher settings UI
6. `82fd240` - Phase 6: Student interface
7. `7bca58f` - Documentation complète
8. `5f7c739` - Prettier formatting

---

## ❓ Questions ?

Consulter **[docs/guides/google-classroom-setup.md](docs/guides/google-classroom-setup.md)** pour :
- Troubleshooting (encryption key, CSRF, rate limits, etc.)
- Architecture détaillée (data flow, security layers)
- Exemples de configuration

---

**Créé par** : Claude Code
**Date** : 2025-11-14
**Branche** : `claude/google-drive-integration-01K9ceVisTk1ZqDYicFjrHEt`
