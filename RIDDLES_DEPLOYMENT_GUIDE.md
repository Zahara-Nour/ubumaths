# 🚀 Guide de Déploiement - Système d'Énigmes

Guide pas à pas pour déployer le système d'énigmes mathématiques en production.

---

## 📋 Prérequis

### Environnement

- ✅ Node.js 18+ installé
- ✅ pnpm installé
- ✅ Projet Supabase configuré
- ✅ Compte Vercel (pour déploiement)
- ✅ Git repository

### Vérifications Locales

```bash
# Vérifier que le projet build
pnpm build

# Vérifier les types
pnpm check

# Formater le code
pnpm format
```

---

## 🗄️ 1. Migration Base de Données

### Étape 1.1 : Vérifier la Migration

Le fichier de migration existe déjà :

```
supabase/migrations/099_create_riddles_system.sql
```

**Contenu** :

- 4 tables (riddles, riddle_attempts, riddle_assignments, riddle_of_the_day)
- 3 vues (riddle_stats, riddle_progress, riddle_student_history)
- 6 RPC functions
- Triggers et RLS policies
- Index pour performance

### Étape 1.2 : Pousser la Migration

```bash
# Connexion à Supabase
npx supabase login

# Lier le projet (si pas déjà fait)
npx supabase link --project-ref YOUR_PROJECT_REF

# Pousser la migration
pnpm db:migrate
# ou
npx supabase db push
```

### Étape 1.3 : Vérifier dans Supabase Dashboard

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. **Table Editor** → Vérifier les 4 nouvelles tables
4. **Database** → **Functions** → Vérifier les 6 RPC functions
5. **Database** → **Policies** → Vérifier les RLS policies

**Tables attendues** :

- ✅ `riddles`
- ✅ `riddle_attempts`
- ✅ `riddle_assignments`
- ✅ `riddle_of_the_day`

**Vues attendues** :

- ✅ `riddle_stats`
- ✅ `riddle_progress`
- ✅ `riddle_student_history`

---

## 📝 2. Mise à Jour des Types TypeScript

### Étape 2.1 : Générer les Types

```bash
# Générer les types depuis Supabase
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/database.ts
```

### Étape 2.2 : Vérifier les Types

Le fichier `src/lib/types/riddle.ts` doit compiler sans erreur :

```bash
pnpm check
```

**Erreurs possibles** :

- Types manquants dans `database.ts` → Régénérer
- Import errors → Vérifier les chemins

---

## ⚙️ 3. Configuration Environnement

### Étape 3.1 : Variables d'Environnement

Vérifier que ces variables existent dans `.env` :

```bash
# Supabase (obligatoires)
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=xxx

# API Key pour cron (optionnel mais recommandé)
VITE_RIDDLE_AUTO_SELECT_API_KEY=your-secure-random-key-here
```

### Étape 3.2 : Générer une API Key Sécurisée

```bash
# Générer une clé aléatoire
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ajouter cette clé à `.env` :

```
VITE_RIDDLE_AUTO_SELECT_API_KEY=votre_clé_générée_ici
```

### Étape 3.3 : Variables Vercel

Sur Vercel Dashboard :

1. Projet → **Settings** → **Environment Variables**
2. Ajouter :
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `VITE_RIDDLE_AUTO_SELECT_API_KEY` (si utilisé)

---

## ⏰ 4. Configuration Cron Job (Optionnel)

Le cron job permet de sélectionner automatiquement l'énigme du jour chaque nuit à minuit.

### Option A : Vercel Cron (Recommandé)

#### Étape 4.1 : Créer `vercel.json`

À la racine du projet, créer ou modifier `vercel.json` :

```json
{
	"crons": [
		{
			"path": "/api/riddles/auto-select-daily",
			"schedule": "0 0 * * *"
		}
	]
}
```

**Schedule** :

- `0 0 * * *` = Tous les jours à minuit (UTC)
- `0 1 * * *` = Tous les jours à 1h du matin (UTC)
- `0 6 * * *` = Tous les jours à 6h du matin (UTC)

#### Étape 4.2 : Déployer sur Vercel

```bash
# Via CLI
vercel --prod

# Ou via Git push (si configuré)
git push origin main
```

#### Étape 4.3 : Vérifier le Cron

1. Vercel Dashboard → Votre projet
2. **Settings** → **Cron Jobs**
3. Vérifier que le job apparaît
4. Voir les logs d'exécution

### Option B : GitHub Actions

Créer `.github/workflows/riddle-cron.yml` :

```yaml
name: Daily Riddle Selection

on:
  schedule:
    - cron: '0 0 * * *' # Minuit UTC chaque jour
  workflow_dispatch: # Permet de déclencher manuellement

jobs:
  select-riddle:
    runs-on: ubuntu-latest
    steps:
      - name: Call Auto-Select API
        run: |
          curl -X POST https://votredomaine.com/api/riddles/auto-select-daily \
            -H "Authorization: Bearer ${{ secrets.RIDDLE_API_KEY }}"
```

**Configuration** :

1. GitHub → Repository → **Settings** → **Secrets**
2. Ajouter `RIDDLE_API_KEY` avec votre clé

### Option C : Sélection Manuelle

Si vous ne voulez pas de cron automatique :

1. Aller sur `/dashboard/teacher/riddles/of-the-day`
2. Sélectionner manuellement l'énigme du jour chaque matin
3. Déléguer à un enseignant responsable

---

## 🧪 5. Tests de Validation

### Étape 5.1 : Tests Manuels Critiques

#### Test 1 : Créer une Énigme

1. Se connecter comme professeur
2. Aller sur `/dashboard/teacher/riddles/new`
3. Créer une énigme de test avec validation auto
4. ✅ Publier

#### Test 2 : Énigme du Jour

1. Aller sur `/dashboard/teacher/riddles/of-the-day`
2. Définir l'énigme créée comme énigme du jour
3. Se déconnecter et se reconnecter comme élève
4. Aller sur `/dashboard/student/riddles`
5. ✅ Vérifier que l'énigme apparaît

#### Test 3 : Tentative Élève

1. Comme élève, cliquer "Tenter l'énigme"
2. Soumettre une réponse incorrecte
3. ✅ Vérifier toast "Réponse incorrecte"
4. Soumettre la bonne réponse
5. ✅ Vérifier toast "Bravo ! Tu as gagné X gidouilles"

#### Test 4 : Validation Manuelle

1. Comme prof, créer énigme sans validation auto
2. Comme élève, soumettre réponse libre
3. ✅ Vérifier message reçu par prof
4. Comme prof, aller sur `/dashboard/teacher/riddles/validations`
5. ✅ Valider la réponse
6. Comme élève, vérifier notification reçue

#### Test 5 : Leaderboard

1. Comme élève, aller sur `/dashboard/student/riddles/leaderboard`
2. ✅ Vérifier affichage classement
3. ✅ Vérifier sa position

#### Test 6 : Badges

1. Comme élève, aller sur `/dashboard/student/riddles/history`
2. ✅ Vérifier section badges
3. ✅ Vérifier barres de progression

### Étape 5.2 : Tests API

```bash
# Test endpoint auto-select (GET)
curl https://votredomaine.com/api/riddles/auto-select-daily

# Test endpoint auto-select (POST)
curl -X POST https://votredomaine.com/api/riddles/auto-select-daily \
  -H "Authorization: Bearer VOTRE_API_KEY"
```

**Réponse attendue GET** :

```json
{
  "date": "2025-01-22",
  "hasRiddle": true,
  "riddle": { ... }
}
```

**Réponse attendue POST** :

```json
{
	"success": true,
	"message": "Énigme du jour sélectionnée automatiquement: xxx"
}
```

---

## ✅ 6. Checklist Go-Live

### Avant le Déploiement

- [ ] Migration DB poussée et vérifiée
- [ ] Types TypeScript générés
- [ ] Variables d'environnement configurées
- [ ] Build local réussi (`pnpm build`)
- [ ] Tests manuels passés
- [ ] Cron job configuré (si voulu)
- [ ] Documentation lue par l'équipe

### Pendant le Déploiement

- [ ] Déployer sur Vercel
- [ ] Vérifier que le build passe
- [ ] Tester en production les routes principales
- [ ] Vérifier les logs (pas d'erreurs)

### Après le Déploiement

- [ ] Créer 2-3 énigmes de test réelles
- [ ] Définir première énigme du jour
- [ ] Inviter quelques utilisateurs test
- [ ] Recueillir feedback initial
- [ ] Monitorer usage pendant 48h

---

## 📊 7. Monitoring Recommandé

### Métriques à Suivre

#### Base de Données

- Nombre d'énigmes créées par jour
- Nombre de tentatives par jour
- Taux de réussite moyen par difficulté
- Temps de réponse des requêtes

#### Engagement

- % élèves qui tentent énigme du jour
- Nombre moyen de tentatives par énigme
- Évolution leaderboard (changements top 10)
- Progression badges

#### Technique

- Erreurs API (logs Vercel)
- Temps de chargement pages
- Succès cron job (si activé)
- Utilisation RPC functions

### Outils Recommandés

**Supabase Dashboard** :

- Table Editor → Voir les données
- SQL Editor → Requêtes personnalisées
- Logs → Erreurs et warnings

**Vercel Dashboard** :

- Analytics → Trafic pages
- Logs → Erreurs runtime
- Cron Jobs → Exécutions

**Exemple Requête Analytics** :

```sql
-- Énigmes les plus populaires
SELECT
  r.riddle_number,
  r.title,
  COUNT(ra.id) as total_attempts,
  COUNT(CASE WHEN ra.is_correct = true THEN 1 END) as success_count
FROM riddles r
LEFT JOIN riddle_attempts ra ON r.id = ra.riddle_id
GROUP BY r.id
ORDER BY total_attempts DESC
LIMIT 10;
```

---

## 🐛 8. Troubleshooting

### Problème : Migration échoue

**Symptômes** : Erreur lors de `pnpm db:migrate`

**Solutions** :

1. Vérifier connexion Supabase : `npx supabase status`
2. Vérifier syntaxe SQL de la migration
3. Vérifier permissions DB
4. Essayer `npx supabase db reset` (⚠️ ATTENTION : efface tout)

### Problème : Types TypeScript incorrects

**Symptômes** : Erreurs de compilation sur types DB

**Solutions** :

1. Régénérer : `npx supabase gen types typescript ...`
2. Vérifier que la migration est poussée
3. Redémarrer TypeScript server dans VSCode

### Problème : RLS bloque les requêtes

**Symptômes** : 403 ou données vides malgré existence

**Solutions** :

1. Vérifier que l'utilisateur est connecté
2. Vérifier le rôle (teacher/student)
3. Vérifier les policies dans Supabase Dashboard
4. Tester requête directement dans SQL Editor avec `auth.uid()`

### Problème : Cron job ne se déclenche pas

**Symptômes** : Pas d'énigme auto-sélectionnée

**Solutions** :

1. Vérifier configuration `vercel.json`
2. Vérifier dans Vercel Dashboard → Cron Jobs
3. Voir les logs d'exécution
4. Tester manuellement l'endpoint POST
5. Vérifier timezone (UTC)

### Problème : Badges ne s'affichent pas

**Symptômes** : Section badges vide

**Solutions** :

1. Vérifier que l'élève a des énigmes réussies
2. Vérifier calcul dans `riddle-badges.ts`
3. Vérifier console navigateur pour erreurs
4. Vérifier que `badgeProgress` est bien passé au composant

---

## 🔄 9. Rollback

En cas de problème critique en production :

### Rollback Code

```bash
# Via Vercel Dashboard
1. Deployments → Sélectionner déploiement précédent
2. Cliquer "..." → Promote to Production

# Via Git
git revert HEAD
git push origin main
```

### Rollback Migration

⚠️ **ATTENTION** : Plus complexe, à éviter si possible

```bash
# Créer migration de rollback
npx supabase migration new rollback_riddles_system

# Dans le fichier, ajouter :
# DROP TABLE IF EXISTS riddles CASCADE;
# DROP TABLE IF EXISTS riddle_attempts CASCADE;
# etc.

# Pousser
pnpm db:migrate
```

**Recommandation** : Plutôt que rollback, corriger en avant avec nouvelle migration.

---

## 📝 10. Post-Déploiement

### Semaine 1

- [ ] Créer 10-15 énigmes variées
- [ ] Définir énigme du jour chaque matin (ou activer cron)
- [ ] Former les enseignants
- [ ] Présenter aux élèves
- [ ] Recueillir feedback initial

### Semaine 2-4

- [ ] Analyser métriques d'engagement
- [ ] Ajuster difficultés selon taux réussite
- [ ] Créer plus d'énigmes si succès
- [ ] Corriger bugs mineurs éventuels
- [ ] Optimiser performances si besoin

### Mois 2+

- [ ] Évaluer impact pédagogique
- [ ] Planifier fonctionnalités v1.1
- [ ] Organiser concours/événements
- [ ] Célébrer les top performers

---

## 📞 Support

### Documentation

- **Guide Utilisateur** : `RIDDLES_QUICK_START_GUIDE.md`
- **Résumé Système** : `RIDDLES_SYSTEM_SUMMARY.md`
- **Doc Technique** : `RIDDLES_SYSTEM_IMPLEMENTATION.md`
- **Index** : `RIDDLES_DOCS_INDEX.md`

### En Cas de Problème

1. Consulter cette documentation
2. Vérifier les logs (Vercel + Supabase)
3. Tester en local avec mêmes données
4. Vérifier changelog pour breaking changes

---

## ✅ Résumé des Commandes

```bash
# 1. Migration
pnpm db:migrate

# 2. Types
npx supabase gen types typescript --project-id XXX > src/lib/types/database.ts

# 3. Build local
pnpm build

# 4. Tests
pnpm check

# 5. Déploiement Vercel
vercel --prod

# 6. Test API cron
curl -X POST https://votredomaine.com/api/riddles/auto-select-daily \
  -H "Authorization: Bearer VOTRE_KEY"
```

---

**Version** : 1.0.0
**Date** : Guide complet
**Statut** : ✅ Prêt pour déploiement

🚀 **Bon déploiement !**
