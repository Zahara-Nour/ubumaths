---
description: Implementer une nouvelle fonctionnalite avec workflow TDD complet
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Task, TodoWrite, AskUserQuestion
argument-hint: [nom-feature]
---

# Feature : $1

Tu implementes une nouvelle fonctionnalite en suivant le workflow TDD collaboratif **OBLIGATOIRE**.

## Phase 0 : Specification TDD (OBLIGATOIRE - ATTENDRE VALIDATION)

### Etape 1 : Recherche contexte

1. Utilise Grep/Glob pour trouver le code existant lie a cette feature
2. Lis les fichiers pertinents pour comprendre l'architecture actuelle
3. Identifie les patterns utilises dans le projet

### Etape 2 : Proposer les comportements

Presente a l'utilisateur :

```markdown
## Fonctionnalite : $1

### Comportements proposes :

**Cas nominaux :**
1. [Comportement principal attendu]
2. [Autre comportement normal]

**Cas limites :**
3. [Que se passe-t-il avec des valeurs vides ?]
4. [Que se passe-t-il avec des valeurs max ?]

**Cas d'erreur :**
5. [Que se passe-t-il si X echoue ?]
6. [Que se passe-t-il sans authentification ?]

### Questions :
- [Clarification necessaire ?]
- [Choix d'implementation a valider ?]
```

### Etape 3 : ATTENDRE

**STOP** - Attends que l'utilisateur valide, corrige ou complete les comportements.
Utilise `AskUserQuestion` si besoin de clarifications.

---

## Phase 1 : Ecrire les Tests (doivent ECHOUER)

Une fois les comportements valides :

1. Cree les fichiers de test selon le type :
   - Composant : `src/lib/components/[Name]/__tests__/[Name].test.ts`
   - API : `src/routes/api/[path]/__tests__/[endpoint].test.ts`
   - Utilitaire : `src/lib/[module]/__tests__/[file].test.ts`

2. Structure de test :

```typescript
import { describe, it, expect } from 'vitest';

describe('[Feature]', () => {
  describe('[Comportement 1]', () => {
    it('should [comportement attendu]', () => {
      // Arrange
      // Act
      // Assert
      expect(true).toBe(false); // Doit echouer
    });
  });
});
```

3. Execute les tests pour confirmer qu'ils echouent :

```bash
pnpm test:server [chemin] --run
# ou
pnpm test:client [chemin] --run
```

---

## Phase 2 : Implementation

1. Utilise TodoWrite pour lister chaque etape d'implementation
2. Implemente le code minimal pour faire passer les tests
3. Respecte les standards UbuMaths :
   - Svelte 5 runes uniquement ($state, $derived, $effect, $props)
   - TypeScript strict (pas de `any`)
   - Validation Zod pour toutes les entrees
   - MySelect/MyCheckbox (pas Shadcn direct)

---

## Phase 3 : Tests Passent

1. Execute les tests :

```bash
pnpm test:server [chemin] --run
# ou
pnpm test:client [chemin] --run
```

2. Si des tests echouent, corrige le code
3. Continue jusqu'a ce que TOUS les tests passent

---

## Phase 4 : Code Review

Lance l'agent `code-reviewer` pour verifier :
- Qualite du code
- Respect des standards
- Securite
- Performance

---

## Phase 5 : Commit

Si tout est valide, prepare le commit :

```bash
git add -A
git status
```

Propose un message de commit au format :
```
feat(scope): description courte

- Detail 1
- Detail 2

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Regles Critiques

1. **JAMAIS** implementer avant validation des comportements
2. **JAMAIS** de `any` dans le code
3. **TOUJOURS** des tests qui echouent d'abord
4. **TOUJOURS** code review avant commit
5. Utilise TodoWrite pour tracker CHAQUE etape
