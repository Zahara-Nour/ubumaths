# Load Function Monitoring System

## 📚 Overview

Le système de monitoring des fonctions `load` permet de tracer automatiquement tous les appels aux fonctions de chargement SvelteKit, côté client et serveur, pour comprendre le flux de navigation et identifier les problèmes de performance.

## ✨ Features

- ✅ **Tracing automatique** : Tous les appels aux fonctions load sont tracés
- 📊 **Métriques de performance** : Temps d'exécution de chaque load
- 🔍 **Détection parent()** : Trace les appels à `parent()` avec leur timing
- 🎯 **First visit vs Revisit** : Distingue les premières visites des revisites
- 🌐 **Server vs Client** : Différencie les load server-side et client-side
- 💻 **SSR vs Browser** : Pour les load clients, indique si SSR ou navigation browser
- 🎚️ **Activation/désactivation** : Via variable d'environnement `VITE_ENABLE_LOAD_MONITORING`
- 🚀 **Zero impact en production** : Désactivé automatiquement en mode production

## 🚀 Quick Start

### 1. Activer le monitoring

Dans votre fichier `.env` :

```bash
VITE_ENABLE_LOAD_MONITORING=true
```

### 2. Lancer l'application

```bash
pnpm dev --port 5175
```

### 3. Observer les logs

Ouvrez la console du navigateur ou regardez le terminal serveur. Vous verrez des logs comme :

**Navigateur (Client Load):**

```
[Client Load] /games (First visit, Browser) - Started
[Client Load] /games - parent() called (12.34ms)
[Client Load] /games (First visit, Browser) - Completed (23.56ms)
```

**Terminal (Server Load):**

```
10:32:15 AM [Server Load] /dashboard/teacher/classes (First visit) - Started
10:32:15 AM [Server Load] /dashboard/teacher/classes - parent() called (45.67ms)
10:32:15 AM [Server Load] /dashboard/teacher/classes (First visit) - Completed (123.45ms)
```

## 📋 Logs Expliqués

### Format des logs

```
[Type] Route (Visit Status, Context) - Status (Timing)
```

- **Type** : `Server Load` ou `Client Load`
- **Route** : Le chemin de la route (ex: `/dashboard/teacher/classes`)
- **Visit Status** : `First visit` ou `Revisit`
- **Context** : `SSR`, `Browser` (client uniquement)
- **Status** : `Started`, `Completed`, `Error`
- **Timing** : Temps d'exécution en millisecondes

### Exemples

**Première visite server-side:**

```
[Server Load] /dashboard (First visit) - Started
[Server Load] /dashboard - parent() called (5.23ms)
[Server Load] /dashboard (First visit) - Completed (87.45ms)
```

**Revisit client-side dans le browser:**

```
[Client Load] /dashboard/student/exercises (Revisit, Browser) - Started
[Client Load] /dashboard/student/exercises (Revisit, Browser) - Completed (12.34ms)
```

**Load avec erreur:**

```
[Server Load] /api/data (First visit) - Started
[Server Load] /api/data (First visit) - Error (45.67ms) Error: Failed to fetch
```

## 🔧 Implementation

### Fichiers modifiés

Le système a été appliqué automatiquement à **24 fichiers** :

- 2 fichiers modifiés manuellement (exemples)
- 22 fichiers modifiés par script de migration automatique

### Pattern de code

**Avant (code original):**

```typescript
export const load: PageServerLoad = async ({ parent, locals }) => {
	const { user } = await parent();
	const { supabase } = locals;

	// ... logic

	return { data };
};
```

**Après (avec monitoring):**

```typescript
import { loadMonitor } from '$lib/utils/loadTracer';

export const load: PageServerLoad = loadMonitor.traceServerLoad(async (event) => {
	const { parent } = event;
	const { locals } = event;
	const { user } = await parent();
	const { supabase } = locals;

	// ... logic (inchangé)

	return { data };
});
```

## 📊 Use Cases

### 1. Debugging de flux de navigation

**Problème** : L'utilisateur signale que la page `/dashboard/student/exercises` est lente.

**Solution** : Activez le monitoring et naviguez vers la page. Vous verrez :

```
[Client Load] /dashboard/student/exercises (First visit, Browser) - Started
[Client Load] /dashboard/student/exercises - parent() called (156.78ms) ← SLOW!
[Client Load] /dashboard/student/exercises (First visit, Browser) - Completed (234.56ms)
```

Le problème est l'appel à `parent()` qui prend 157ms. Investiguer le layout parent.

### 2. Performance analysis

**Problème** : Comprendre quelles routes sont les plus lentes au chargement.

**Solution** : Activez le monitoring et naviguez dans l'app. Triez les logs par timing :

```
// Rapides
[Server Load] /games (First visit) - Completed (12.34ms)
[Server Load] /api-docs (First visit) - Completed (23.45ms)

// Normales
[Server Load] /dashboard (First visit) - Completed (87.65ms)

// Lentes
[Server Load] /dashboard/teacher/warnings (First visit) - Completed (345.67ms) ← À optimiser
[Server Load] /dashboard/student/exercises (First visit) - Completed (456.78ms) ← À optimiser
```

### 3. Comprendre le cache SvelteKit

**Problème** : Vérifier si SvelteKit cache correctement les données entre navigations.

**Solution** :

1. Visitez une page : `[Server Load] /dashboard (First visit) - Started`
2. Naviguez ailleurs
3. Revenez : `[Client Load] /dashboard (Revisit, Browser) - Started`

Si la deuxième visite est client-side et rapide, SvelteKit utilise bien le cache!

### 4. Tracking des appels parent()

**Problème** : Identifier les pages qui font trop d'appels coûteux à `parent()`.

**Solution** : Grep les logs pour "parent() called" :

```bash
# Dans la console ou logs
grep "parent() called" | sort -t'(' -k2 -rn
```

Résultat :

```
[Server Load] /dashboard/teacher/warnings - parent() called (234.56ms) ← ATTENTION!
[Server Load] /dashboard/student/exercises - parent() called (123.45ms)
[Client Load] /dashboard - parent() called (12.34ms) ← OK
```

## ⚙️ Configuration

### Variables d'environnement

```bash
# Activer le monitoring (default: false)
VITE_ENABLE_LOAD_MONITORING=true
```

### Modes de fonctionnement

| Mode                                                             | Monitoring            | Performance Impact     |
| ---------------------------------------------------------------- | --------------------- | ---------------------- |
| Development (`dev = true`) + `VITE_ENABLE_LOAD_MONITORING=true`  | ✅ Activé             | Minimal (logging only) |
| Development (`dev = true`) + `VITE_ENABLE_LOAD_MONITORING=false` | ❌ Désactivé          | Aucun                  |
| Production (`dev = false`)                                       | ❌ Toujours désactivé | Aucun                  |

## 🧪 Testing

Pour tester le système manuellement :

1. Activez le monitoring :

   ```bash
   echo "VITE_ENABLE_LOAD_MONITORING=true" >> .env
   ```

2. Lancez le serveur :

   ```bash
   pnpm dev --port 5175
   ```

3. Ouvrez la console du navigateur (F12)

4. Naviguez vers différentes pages :
   - `/` → Voir les logs de layout root
   - `/dashboard` → Voir les logs server + client
   - `/games` → Voir les logs client uniquement
   - Revenez à `/dashboard` → Voir "Revisit"

## 📁 Files Structure

```
src/lib/utils/
└── loadTracer.ts              # Core monitoring system

scripts/
├── migrate-load-monitoring.js # Migration script (ancien, bugué)
└── migrate-load-simple.js     # Migration script (nouveau, robuste)

.env.example                   # Documentation de la variable
docs/development/
└── load-monitoring.md         # Cette documentation
```

## 🔍 Advanced Usage

### API du LoadMonitor

```typescript
import { loadMonitor } from '$lib/utils/loadTracer';

// Obtenir les statistiques
const stats = loadMonitor.getStats();
console.log(`Routes visitées: ${stats.totalVisited}`);
console.log(`Liste: ${stats.routes.join(', ')}`);

// Reset le tracking des visites
loadMonitor.clearVisitedRoutes();
```

### Créer un logger custom

Si vous voulez logger ailleurs que dans la console :

```typescript
// Dans loadTracer.ts
private log(message: string, ...args: unknown[]) {
	if (!this.monitoringEnabled) return;

	// Au lieu de :
	this.logger.trace(message, ...args);

	// Vous pouvez faire :
	myCustomLogger.log(message, ...args);
	// ou envoyer à un service externe
	// ou stocker dans un fichier
}
```

## 🚧 Limitations

1. **Pas de support pour les actions** : Le système ne trace que les `load` functions, pas les form `actions`
2. **Contexte limité** : On voit le timing mais pas les données retournées (pour garder les logs légers)
3. **Pas de flamegraph** : Les logs sont textuels, pas visuels
4. **First visit détection** : Basée sur un Set en mémoire, reset au reload de la page

## 🎯 Future Improvements

- [ ] Support pour tracer les form actions
- [ ] Option pour logger les données retournées (avec limite de taille)
- [ ] Export des metrics vers un fichier JSON
- [ ] Intégration avec Performance API pour plus de métriques
- [ ] UI graphique pour visualiser les flamegraphs
- [ ] Persistence du First visit tracking (localStorage)

## 📝 Migration Notes

### Scripts de migration

Deux scripts disponibles :

1. **`migrate-load-monitoring.js`** (ancien, deprecated)
   - Algorithme complexe de comptage d'accolades
   - Beaucoup d'échecs

2. **`migrate-load-simple.js`** (nouveau, recommandé) ✅
   - Approche basée sur regex simples
   - 22 fichiers migrés avec succès, 0 erreurs

### Rollback

Pour revenir en arrière :

```bash
git diff src/routes | head -100  # Vérifier les changements
git checkout src/routes          # Annuler tous les changements
```

Ou rollback sélectif :

```bash
git checkout src/routes/path/to/file/+page.server.ts
```

## 🤝 Contributing

Si vous ajoutez une nouvelle fonction `load` :

```typescript
// ✅ BON - Utilisez le wrapper
import { loadMonitor } from '$lib/utils/loadTracer';

export const load = loadMonitor.traceServerLoad(async (event) => {
	// ... code
});

// ❌ MAUVAIS - Pattern ancien
export const load: PageServerLoad = async ({ parent }) => {
	// ... code
};
```

## 📞 Support

Questions ou problèmes ? Consultez :

- Cette documentation
- Le code source dans `src/lib/utils/loadTracer.ts`
- Les exemples dans les fichiers déjà migrés

---

**Créé le** : 2025-11-01
**Dernière mise à jour** : 2025-11-01
**Auteur** : Claude Code (avec Option B - migration automatique)
