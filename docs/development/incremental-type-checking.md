# Incremental Type Checking

Guide pour vérifier les types de manière incrémentale et optimiser le workflow de développement.

---

## 🚨 Le Problème

`pnpm check` exécute `svelte-check` qui vérifie **TOUS** les fichiers du projet à chaque fois. Pour un projet de la taille d'UbuMaths, cela peut prendre beaucoup de temps.

---

## ✅ Solutions Disponibles

### 1. Check Rapide (Recommandé pour développement)

```bash
pnpm check:fast
```

**Caractéristiques** :

- Utilise TypeScript en mode incrémental
- Cache les résultats dans `.svelte-kit/tsconfig.tsbuildinfo`
- **Première exécution** : Même vitesse que `pnpm check`
- **Exécutions suivantes** : Beaucoup plus rapide (jusqu'à 10x)
- Ne vérifie que les fichiers TypeScript (pas les fichiers `.svelte`)

**Quand l'utiliser** :

- ✅ Pendant le développement actif
- ✅ Pour vérifier rapidement vos changements TypeScript
- ✅ Avant de commencer un refactoring
- ❌ Avant un commit final (utiliser `pnpm check` complet)

---

### 2. Check Fichiers Modifiés

```bash
# Vérifier les fichiers modifiés depuis HEAD
pnpm check:changed

# Vérifier les fichiers modifiés depuis main
pnpm check:changed main

# Vérifier les fichiers modifiés dans les 5 derniers commits
pnpm check:changed HEAD~5
```

**Caractéristiques** :

- Identifie automatiquement les fichiers TypeScript modifiés
- Exécute `tsc` uniquement sur ces fichiers
- Pour les fichiers Svelte : exécute `svelte-check` complet (pas d'option incrémentale disponible)

**Quand l'utiliser** :

- ✅ Après avoir modifié quelques fichiers TypeScript
- ✅ Pour vérifier l'impact de vos changements
- ✅ Dans un workflow de review

---

### 3. Check Fichiers Staged

```bash
pnpm check:staged
```

**Caractéristiques** :

- Vérifie uniquement les fichiers en staging area (`git add`)
- Parfait pour validation pré-commit
- Rapide si peu de fichiers staged

**Quand l'utiliser** :

- ✅ Juste avant de commiter
- ✅ Dans les hooks pre-commit
- ✅ Pour valider que vos fichiers staged sont corrects

---

### 4. Check Complet (Production-ready)

```bash
pnpm check
```

**Caractéristiques** :

- Vérifie **TOUS** les fichiers (TypeScript + Svelte)
- Exécute `svelte-check` en mode complet
- Le plus lent mais le plus complet

**Quand l'utiliser** :

- ✅ Avant un commit important
- ✅ Avant de push vers main
- ✅ Avant de créer une PR
- ✅ En CI/CD

---

## 🎯 Workflow Recommandé

### Développement Actif

```bash
# Pendant que vous codez
pnpm check:fast

# Après chaque petite modification
pnpm check:fast

# Vérification rapide des changements
pnpm check:changed
```

### Avant Commit

```bash
# Formater
pnpm format

# Vérifier types (rapide)
pnpm check:fast

# Vérifier uniquement les fichiers staged
pnpm check:staged

# Tests
pnpm test:unit
```

### Avant Push / PR

```bash
# Check complet
pnpm check

# Lint complet
pnpm lint

# Tests complets
pnpm test:unit

# Build
pnpm build
```

---

## ⚙️ Configuration

### TypeScript Incremental Mode

Le mode incrémental est configuré dans `tsconfig.json` :

```json
{
	"compilerOptions": {
		"incremental": true,
		"tsBuildInfoFile": ".svelte-kit/tsconfig.tsbuildinfo"
	}
}
```

Le fichier `.tsbuildinfo` est ignoré par Git et contient le cache de compilation.

### Scripts Package.json

```json
{
	"scripts": {
		"check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
		"check:fast": "svelte-kit sync && tsc --noEmit --incremental",
		"check:changed": "bash scripts/check-changed.sh",
		"check:staged": "bash scripts/check-changed.sh --staged"
	}
}
```

---

## 📊 Performance Comparison

Sur UbuMaths (projet moyen-grand) :

| Commande             | Première Exécution | Exécutions Suivantes | Use Case              |
| -------------------- | ------------------ | -------------------- | --------------------- |
| `pnpm check`         | ~45-60s            | ~45-60s              | Vérification complète |
| `pnpm check:fast`    | ~45-60s            | ~5-15s ⚡            | Dev actif             |
| `pnpm check:changed` | ~5-20s             | ~5-20s               | Review ciblée         |
| `pnpm check:staged`  | ~2-10s             | ~2-10s               | Pre-commit            |

---

## 🚧 Limitations

### svelte-check n'a PAS de mode incrémental

Le package `svelte-check` doit toujours vérifier tous les fichiers `.svelte` car :

- Les composants Svelte sont fortement couplés
- Un changement dans un composant peut affecter d'autres composants
- L'outil ne supporte pas le filtrage par fichier

**Solution** : Utiliser `check:fast` pour les vérifications TypeScript rapides, et `pnpm check` uniquement quand nécessaire.

### IDE Extension Recommandée

Pour un feedback en temps réel pendant le développement :

**VSCode** : Extension "Svelte for VS Code"

- Type checking en temps réel
- Autocomplete
- Détection d'erreurs instantanée
- Pas besoin de lancer `pnpm check` manuellement

---

## 🔧 Scripts Disponibles

### `scripts/check-changed.sh`

Script bash qui identifie les fichiers modifiés et exécute les vérifications appropriées :

```bash
# Usage
./scripts/check-changed.sh              # Depuis HEAD
./scripts/check-changed.sh main         # Depuis main branch
./scripts/check-changed.sh HEAD~5       # Depuis 5 commits
./scripts/check-changed.sh --staged     # Fichiers staged
```

**Comportement** :

1. Identifie les fichiers TypeScript/Svelte modifiés
2. Pour TypeScript : exécute `tsc` sur ces fichiers
3. Pour Svelte : exécute `svelte-check` complet (pas d'alternative)
4. Affiche un résumé des résultats

---

## 💡 Tips & Tricks

### 1. Watch Mode pour Dev Continu

```bash
pnpm check:watch
```

Exécute `svelte-check` en mode watch - vérifie automatiquement à chaque sauvegarde.

### 2. Combiner avec ESLint Cache

```bash
pnpm lint  # Utilise --cache automatiquement
```

ESLint a déjà un cache activé (`.eslintcache`), ce qui rend le linting incrémental par défaut.

### 3. Git Hooks

Ajoutez `check:staged` à vos hooks pre-commit pour validation automatique :

```bash
# .husky/pre-commit
pnpm check:staged
```

### 4. CI/CD Optimization

En CI, utilisez toujours le check complet :

```yaml
# .github/workflows/ci.yml
- name: Type check
  run: pnpm check # Check complet requis
```

### 5. Clean Cache

Si vous rencontrez des problèmes avec le cache incrémental :

```bash
# Nettoyer le cache TypeScript
rm .svelte-kit/tsconfig.tsbuildinfo

# Nettoyer le cache ESLint
rm .eslintcache
```

---

## 🎓 Best Practices

1. **Utilisez `check:fast` pendant le développement** - Feedback rapide
2. **Utilisez `check:staged` avant commit** - Validation des changements
3. **Utilisez `check` avant push/PR** - Garantie de qualité complète
4. **Configurez votre IDE** - Feedback en temps réel sans commandes manuelles
5. **Profitez du cache ESLint** - Déjà actif par défaut
6. **Ne commitez pas les fichiers de cache** - Déjà dans `.gitignore`

---

## 🆕 Date d'Ajout

**2025-11-01** - Implémentation du système de type checking incrémental

---

[← Retour au guide de développement](README.md)
