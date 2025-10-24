# 🚀 Déploiement

Guide de déploiement d'UbuMaths sur Vercel.

**Status** : 📝 Documentation en cours

---

## 🎯 Vue d'ensemble

UbuMaths est déployé sur **Vercel** avec déploiement automatique depuis GitHub.

**Production** : https://ubumaths.vercel.app (ou domaine custom)

---

## 📋 Prérequis

- Compte Vercel
- Repository GitHub
- Database Supabase configurée
- Variables d'environnement

---

## ⚙️ Configuration Vercel

### 1. Connecter repository

1. Aller sur [vercel.com](https://vercel.com)
2. "Add New Project"
3. Import depuis GitHub
4. Sélectionner `ubumaths` repository

### 2. Configuration build

Vercel détecte automatiquement SvelteKit :

```
Framework Preset: SvelteKit
Build Command: pnpm build
Output Directory: .svelte-kit
Install Command: pnpm install
```

### 3. Variables d'environnement

Ajouter dans Vercel Dashboard → Settings → Environment Variables :

```bash
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Optionnel
PUBLIC_SITE_URL=https://ubumaths.vercel.app
```

---

## 🔄 Déploiement automatique

### Production (main)

```bash
git push origin main
```

- Déclenche build automatique
- Tests  exécutés
- Déploiement si succès
- URL production mise à jour

### Preview (branches)

Chaque push sur branche feature :
- Crée deployment preview
- URL unique : `ubumaths-git-<branch>.vercel.app`
- Permet test avant merge

---

## 🗄️ Migrations database

### Workflow

1. **Local** : Créer migration SQL
   ```bash
   # Créer fichier migration
   supabase/migrations/<timestamp>_description.sql
   ```

2. **Test local**
   ```bash
   pnpm db:migrate
   ```

3. **Production** : Appliquer migration
   ```bash
   # Depuis Supabase Dashboard ou CLI
   supabase db push
   ```

⚠️ **Important** : Migrations doivent être appliquées AVANT deploy code qui les utilise.

---

## 🧪 Environments

### Production

- Branch : `main`
- URL : https://ubumaths.vercel.app
- Database : Production Supabase
- Monitoring : Actif

### Staging (optionnel)

- Branch : `staging`
- URL : https://ubumaths-staging.vercel.app
- Database : Staging Supabase
- Tests end-to-end

### Preview

- Toutes branches feature
- URL : `ubumaths-git-<branch>.vercel.app`
- Database : Partagée (attention!)

---

## 📊 Monitoring

### Vercel Analytics

Dashboard → Analytics :
- Visites
- Performance (Core Web Vitals)
- Erreurs runtime

### Error Monitoring

UbuMaths intégré error monitoring :
- Dashboard : `/dashboard/admin/errors`
- Capture automatique erreurs
- Stack traces
- User context

---

## 🐛 Debugging déploiement

### Build fails

1. Vérifier logs Vercel
2. Reproduire localement :
   ```bash
   pnpm build
   ```
3. Fix erreurs TypeScript/ESLint
4. Push fix

### Runtime errors

1. Vérifier Vercel Function Logs
2. Vérifier error monitoring dashboard
3. Reproduire localement si possible
4. Fix et redeploy

### Variables d'environnement

Si erreur "Missing env var" :
1. Vérifier Vercel → Settings → Environment Variables
2. Ajouter variables manquantes
3. Redeploy (rerun deployment)

---

## 🔒 Sécurité

### Secrets

- Jamais commit secrets dans code
- Utiliser Vercel Environment Variables
- Rotate keys régulièrement

### CORS

Configuration dans `src/hooks.server.ts` :
```typescript
export const handle: Handle = async ({ event, resolve }) => {
  // CORS headers si nécessaire
  if (event.url.pathname.startsWith('/api/')) {
    if (event.request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }
  }

  return resolve(event);
};
```

---

## ⚡ Performance

### Edge Functions

Vercel déploie automatiquement comme Edge Functions :
- Latence minimale
- Distribution globale
- Cold starts rapides

### Caching

Headers cache configurés :
- Static assets : Cache agressif
- API : Cache intelligent
- HTML : Pas de cache (SSR)

### Build optimization

Dans `vite.config.ts` :
- Code splitting par route
- Tree shaking
- Minification production

---

## 🔗 Domaine custom

1. Vercel → Settings → Domains
2. Ajouter domaine custom
3. Configurer DNS :
   ```
   CNAME ubumaths.fr → cname.vercel-dns.com
   ```
4. Attendre propagation DNS (quelques heures)

---

## 📋 Checklist déploiement

Avant merge dans `main` :

- [ ] Tests passent localement
- [ ] Build réussit (`pnpm build`)
- [ ] Migrations DB appliquées en prod
- [ ] Variables d'env à jour sur Vercel
- [ ] Preview deployment testé
- [ ] Code reviewé et approuvé
- [ ] Changelog mis à jour

---

## 🔗 Ressources

- [Vercel Docs](https://vercel.com/docs)
- [SvelteKit Adapter Vercel](https://kit.svelte.dev/docs/adapter-vercel)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

---

[← Retour aux guides](README.md)
