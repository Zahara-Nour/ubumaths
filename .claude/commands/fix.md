---
description: Corriger un bug avec analyse complete, test de regression, et validation
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Task, TodoWrite
argument-hint: [description-bug]
---

# Fix : $1

Tu corriges un bug en suivant une methodologie structuree.

## Phase 1 : Comprendre le Bug

### Etape 1 : Collecte d'informations

1. Lis la description du bug : "$1"
2. Recherche dans le codebase :
   - Fichiers potentiellement impliques
   - Code similaire ou lie
   - Tests existants

```bash
# Rechercher les fichiers lies
```

### Etape 2 : Reproduire le bug

1. Identifie les etapes pour reproduire
2. Comprends le comportement actuel vs attendu
3. Note les conditions specifiques (donnees, etat, timing)

### Etape 3 : Identifier la cause racine

1. Trace le flux d'execution
2. Identifie exactement OU le bug se produit
3. Comprends POURQUOI il se produit

---

## Phase 2 : Test de Regression (AVANT le fix)

**OBLIGATOIRE** : Ecris un test qui reproduit le bug et ECHOUE.

```typescript
import { describe, it, expect } from 'vitest';

describe('[Module concerne]', () => {
  it('should [comportement attendu] - regression test for: $1', () => {
    // Arrange - conditions qui causent le bug

    // Act - action qui declenche le bug

    // Assert - ce qui devrait se passer (echoue actuellement)
    expect(actual).toBe(expected);
  });
});
```

Execute le test pour confirmer qu'il echoue :

```bash
pnpm test:server [chemin] --run
# ou
pnpm test:client [chemin] --run
```

---

## Phase 3 : Corriger le Bug

1. Applique le fix minimal necessaire
2. Respecte les standards :
   - Pas de `any`
   - Validation Zod si applicable
   - Svelte 5 runes

3. Evite les effets de bord :
   - Ne modifie que ce qui est necessaire
   - Ne refactore pas "en passant"

---

## Phase 4 : Verification

### Etape 1 : Test de regression passe

```bash
pnpm test:server [chemin] --run
```

Le test de regression doit maintenant PASSER.

### Etape 2 : Tests existants passent

```bash
pnpm test:unit -- --run
```

Aucun test existant ne doit casser.

### Etape 3 : Verification manuelle (si applicable)

Decris comment verifier manuellement que le bug est corrige.

---

## Phase 5 : Code Review

Lance l'agent `code-reviewer` pour verifier :
- Le fix est correct et complet
- Pas d'effets de bord
- Pas de regression potentielle

---

## Phase 6 : Commit

```bash
git add -A
git status
```

Message de commit :

```
fix(scope): description courte du fix

Probleme: [description du bug]
Solution: [description du fix]

Closes #[issue-number] (si applicable)

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Regles Critiques

1. **TOUJOURS** un test de regression AVANT le fix
2. **JAMAIS** de refactoring opportuniste
3. **TOUJOURS** verifier les tests existants
4. Fix minimal = moins de risques
5. Documenter la cause racine dans le commit
