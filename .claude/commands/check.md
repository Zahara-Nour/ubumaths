---
description: Verification et correction complete du codebase (format, lint, types, build)
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Task, TodoWrite
---

# Verification Complete du Codebase

Tu dois effectuer une verification complete du codebase et corriger TOUTES les erreurs. **Ne t'arrete pas tant que tout n'est pas corrige.**

## Workflow Obligatoire

Utilise TodoWrite pour tracker chaque etape. Marque chaque tache comme `in_progress` puis `completed`.

### Phase 1 : Formatage (Prettier)

```bash
pnpm format
```

- Prettier corrige automatiquement le formatage
- Verifie qu'il n'y a pas d'erreurs

### Phase 2 : ESLint (Corrections automatiques + manuelles)

```bash
pnpm lint --fix
```

1. Execute `pnpm lint --fix` pour les corrections automatiques
2. Si des erreurs persistent, corrige-les manuellement une par une
3. Re-execute `pnpm lint` jusqu'a 0 erreurs
4. **IMPORTANT** : Sauvegarde les warnings dans un fichier :

```bash
pnpm lint 2>&1 | tee .claude/lint-warnings.log
```

### Phase 3 : TypeScript (svelte-check)

```bash
pnpm check
```

1. Execute `pnpm check` (inclut svelte-check + TypeScript)
2. Pour chaque erreur :
   - Lis le fichier concerne
   - Analyse l'erreur
   - Corrige le probleme
3. Re-execute `pnpm check` jusqu'a 0 erreurs
4. **IMPORTANT** : Sauvegarde les warnings :

```bash
pnpm check 2>&1 | tee -a .claude/check-warnings.log
```

### Phase 4 : Build

```bash
pnpm build
```

1. Execute `pnpm build`
2. Si des erreurs apparaissent :
   - Analyse les erreurs de build
   - Corrige les problemes (souvent lies aux imports, types, ou SSR)
3. Re-execute jusqu'a build reussi

### Phase 5 : Analyse des Warnings

1. Lis les fichiers de warnings :
   - `.claude/lint-warnings.log`
   - `.claude/check-warnings.log`

2. Pour chaque warning, determine s'il faut le corriger :

   **Corriger OBLIGATOIREMENT** :
   - `@typescript-eslint/no-unused-vars` (variables inutilisees)
   - `@typescript-eslint/no-explicit-any` (remplacer par types corrects)
   - `svelte/valid-compile` warnings
   - Accessibilite (a11y-*)
   - `prefer-const`
   - `no-console` (sauf si debug intentionnel)

   **Ignorer (situations particulieres)** :
   - Warnings dans `node_modules/`
   - Warnings dans fichiers generes
   - `// eslint-disable-next-line` avec justification

3. Corrige les warnings identifies
4. Re-execute les checks pour confirmer

### Phase 6 : Rapport Final

Genere un rapport dans `.claude/check-report.md` :

```markdown
# Rapport de Verification - [DATE]

## Resume
- Erreurs Prettier : X corrigees
- Erreurs ESLint : X corrigees
- Erreurs TypeScript : X corrigees
- Erreurs Build : X corrigees
- Warnings analyses : X
- Warnings corriges : X
- Warnings ignores (justifies) : X

## Corrections Majeures
- [Liste des corrections importantes]

## Warnings Ignores (avec justification)
- [Warning] : [Raison]

## Status Final
[SUCCESS/ISSUES REMAINING]
```

## Regles Critiques

1. **NE JAMAIS s'arreter** avant d'avoir 0 erreurs sur TOUTES les etapes
2. **Corriger dans l'ordre** : format -> lint -> types -> build
3. **Utiliser TodoWrite** pour tracker la progression
4. **Sauvegarder les warnings** dans des fichiers pour analyse
5. **Documenter** les corrections majeures et les decisions

## Commandes de Reference

```bash
# Formatage
pnpm format

# Lint avec fix automatique
pnpm lint --fix

# Lint seul (verification)
pnpm lint

# TypeScript + Svelte check
pnpm check

# Build production
pnpm build

# Check rapide (TypeScript only)
pnpm check:fast
```

## En Cas de Blocage

Si une erreur persiste apres 3 tentatives :
1. Utilise l'agent `debugger` avec le modele Opus pour analyser
2. Documente le probleme dans le rapport
3. Continue avec les autres erreurs

**Objectif : 0 erreurs, warnings analyses et corriges si necessaire.**
