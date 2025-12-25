---
description: Nettoyer le code mort, imports inutilises, et fichiers obsoletes
allowed-tools: Bash, Read, Edit, Grep, Glob, TodoWrite
---

# Cleanup

Tu nettoies le codebase en supprimant le code mort et les elements inutilises.

## Phase 1 : Detection Automatique

### Etape 1 : Imports inutilises (ESLint)

```bash
pnpm lint 2>&1 | grep "is defined but never used\|is declared but\|no-unused"
```

### Etape 2 : Variables inutilisees (TypeScript)

```bash
pnpm check 2>&1 | grep "is declared but its value is never read\|declared but never used"
```

### Etape 3 : Fichiers non importes

```bash
# Lister tous les fichiers .ts/.svelte
find src -name "*.ts" -o -name "*.svelte" | head -100
```

Pour chaque fichier suspect, verifier s'il est importe :

```bash
grep -r "from.*[./]filename" src --include="*.ts" --include="*.svelte"
```

---

## Phase 2 : Analyse Manuelle

### Code commente a supprimer

```bash
# Trouver les blocs de code commentes
grep -rn "// TODO\|// FIXME\|// HACK\|// XXX" src --include="*.ts" --include="*.svelte"
```

```bash
# Trouver les gros blocs commentes (3+ lignes)
grep -rn "^[[:space:]]*//" src --include="*.ts" --include="*.svelte" | head -50
```

### Console.log de debug

```bash
grep -rn "console.log\|console.debug\|console.trace" src --include="*.ts" --include="*.svelte" | grep -v "node_modules"
```

### Fichiers temporaires

```bash
# Fichiers potentiellement temporaires
find src -name "*.bak" -o -name "*.tmp" -o -name "*.old" -o -name "*~"
find src -name "*.test.ts.snap" # Snapshots obsoletes potentiels
```

---

## Phase 3 : Classification

### A SUPPRIMER (safe)

- Imports non utilises
- Variables declarees mais jamais lues
- Fonctions privees non appelees
- Console.log de debug
- Code commente sans raison documentee

### A VERIFIER (demander confirmation)

- Fichiers qui semblent non importes
- Exports non utilises dans le projet
- Fonctions publiques non appelees (peuvent etre API)

### A NE PAS TOUCHER

- Fichiers dans `node_modules/`
- Fichiers dans `.claude/`
- Fichiers de configuration (*.config.*)
- Fichiers de test (`*.test.ts`, `*.spec.ts`)
- Documentation (`*.md`)
- Fichiers generes (`database.ts` si auto-genere)

---

## Phase 4 : Nettoyage

### Etape 1 : Imports inutilises

Pour chaque fichier avec des imports inutilises :

```typescript
// AVANT
import { unused, used } from './module';

// APRES
import { used } from './module';
```

### Etape 2 : Variables inutilisees

```typescript
// AVANT
const unused = 'value';
const used = 'value';
console.log(used);

// APRES
const used = 'value';
console.log(used);
```

### Etape 3 : Console.log

```typescript
// SUPPRIMER (sauf si intentionnel et documente)
console.log('debug:', data);
```

Si le console.log est intentionnel, le marquer :

```typescript
// eslint-disable-next-line no-console -- Intentional logging for monitoring
console.log('[Monitor]', event);
```

### Etape 4 : Code commente

```typescript
// SUPPRIMER les blocs commentes sans explication
// function oldImplementation() {
//   ...
// }

// GARDER si documente
// NOTE: Keeping for reference until v2.0 migration is complete
// function legacyHandler() { ... }
```

---

## Phase 5 : Verification

### Apres nettoyage

```bash
# Verifier que tout compile
pnpm check:fast

# Verifier que les tests passent
pnpm test:unit -- --run

# Verifier le lint
pnpm lint
```

---

## Phase 6 : Rapport

### Format du rapport

```markdown
# Rapport Cleanup - [DATE]

## Resume
- Imports supprimes : X
- Variables supprimees : X
- Console.log supprimes : X
- Fichiers supprimes : X
- Lignes de code retirees : ~X

## Details

### Fichiers modifies
- `src/lib/utils/helper.ts` : 3 imports inutilises
- `src/routes/+page.svelte` : 2 console.log

### Fichiers supprimes
- (Aucun / Liste si applicable)

## Verification
- [ ] Build OK
- [ ] Tests OK
- [ ] Lint OK
```

---

## Automatisation Future

### Script de detection

Creer `scripts/detect-unused.sh` :

```bash
#!/bin/bash
echo "=== Imports inutilises ==="
pnpm lint 2>&1 | grep "is defined but never used"

echo "=== Variables inutilisees ==="
pnpm check 2>&1 | grep "is declared but"

echo "=== Console.log ==="
grep -rn "console.log" src --include="*.ts" --include="*.svelte" | wc -l
```

---

## Regles

1. **TOUJOURS** verifier que les tests passent apres cleanup
2. **JAMAIS** supprimer de fichiers sans verification d'import
3. **TOUJOURS** commiter le cleanup separement des features
4. En cas de doute, demander confirmation
5. Preferer ESLint --fix pour les corrections automatiques
