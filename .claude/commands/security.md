---
description: Audit securite rapide sur les fichiers modifies ou specifies
allowed-tools: Bash(git:*), Read, Grep, Glob, Task
argument-hint: [fichier-ou-dossier-optionnel]
---

# Audit Securite

Tu effectues un audit de securite cible sur le code.

## Phase 1 : Identifier les Fichiers a Auditer

### Option A : Fichiers recemment modifies

```bash
git diff --name-only HEAD~10
```

### Option B : Fichier/dossier specifie

Auditer : `$1`

### Option C : Fichiers sensibles

```bash
# Endpoints API
find src/routes/api -name "+server.ts" -type f

# Server-side code
find src -name "+page.server.ts" -type f

# Auth-related
grep -r "locals.user" src/routes --include="*.ts" -l
```

---

## Phase 2 : Checklist OWASP pour UbuMaths

### A01 - Broken Access Control

```bash
# Verifier les endpoints sans auth check
grep -r "RequestHandler" src/routes/api --include="*.ts" -A 10 | grep -v "locals.user"
```

- [ ] Tous les endpoints proteges verifient `locals.user`
- [ ] Les RLS policies sont actives sur toutes les tables utilisateur
- [ ] Pas d'acces direct aux ressources d'autres utilisateurs

### A02 - Cryptographic Failures

- [ ] Pas de secrets dans le code source
- [ ] Variables d'environnement pour les cles
- [ ] HTTPS force en production

```bash
# Chercher des secrets potentiels
grep -r "password\|secret\|api_key\|apikey\|token" src --include="*.ts" --include="*.svelte" | grep -v "node_modules"
```

### A03 - Injection

```bash
# Chercher des concatenations SQL dangereuses
grep -r "SELECT.*\+" src --include="*.ts"
grep -r "INSERT.*\+" src --include="*.ts"
grep -r "UPDATE.*\+" src --include="*.ts"
```

- [ ] Toutes les requetes utilisent les clients Supabase (pas de SQL brut)
- [ ] Pas de concatenation de strings pour les requetes
- [ ] Pas d'`eval()` ou `Function()`

```bash
# Chercher eval/Function
grep -r "eval(" src --include="*.ts" --include="*.svelte"
grep -r "new Function(" src --include="*.ts" --include="*.svelte"
```

### A04 - Insecure Design

- [ ] Validation cote serveur (pas seulement client)
- [ ] Rate limiting sur les endpoints sensibles
- [ ] Limites sur les uploads/inputs

### A05 - Security Misconfiguration

- [ ] Headers de securite configures
- [ ] CORS restrictif
- [ ] Pas de debug en production

### A06 - Vulnerable Components

```bash
# Verifier les vulnerabilites connues
pnpm audit
```

### A07 - Auth Failures

```bash
# Chercher les endpoints d'auth
grep -r "signIn\|signUp\|signOut\|resetPassword" src --include="*.ts" -l
```

- [ ] Sessions securisees (httpOnly, secure, sameSite)
- [ ] Logout invalide la session
- [ ] Tokens expires correctement

### A08 - Data Integrity

- [ ] Validation Zod sur toutes les entrees

```bash
# Verifier les schemas Zod
grep -r "safeParse\|parse(" src/routes --include="*.ts"
```

- [ ] Limites numeriques (.min/.max)
- [ ] Limites de taille sur les arrays et strings

### A09 - Logging Failures

- [ ] Pas de donnees sensibles dans les logs
- [ ] Erreurs loggees correctement

```bash
# Chercher console.log avec donnees potentiellement sensibles
grep -r "console.log.*password\|console.log.*token\|console.log.*email" src
```

### A10 - SSRF

- [ ] URLs externes validees
- [ ] Pas de fetch vers des URLs utilisateur sans validation

---

## Phase 3 : Audit Specifique Svelte/SvelteKit

### XSS

```bash
# Chercher @html (potentiel XSS)
grep -r "{@html" src --include="*.svelte"
```

- [ ] Chaque `{@html}` utilise une sanitization
- [ ] Pas d'interpolation de donnees utilisateur dans `{@html}`

### CSP

- [ ] Content-Security-Policy configuree dans `hooks.server.ts`

### Form Actions

```bash
# Verifier les form actions
grep -r "export const actions" src/routes --include="*.ts" -l
```

- [ ] Chaque action valide ses inputs
- [ ] Protection CSRF active (default SvelteKit)

---

## Phase 4 : Rapport

### Format du rapport

```markdown
# Rapport Securite - [DATE]

## Resume
- Fichiers audites : X
- Problemes critiques : X
- Problemes moyens : X
- Suggestions : X

## Problemes Critiques (a corriger immediatement)

### [Probleme 1]
- **Fichier** : path/to/file.ts:123
- **Risque** : [Description du risque]
- **Correction** : [Comment corriger]

## Problemes Moyens

### [Probleme 2]
- ...

## Suggestions d'amelioration

- [Suggestion 1]
- [Suggestion 2]

## Fichiers Valides

- path/to/secure-file.ts ✓
```

---

## Phase 5 : Corrections

Si des problemes sont trouves :

1. Corrige les problemes **critiques** immediatement
2. Cree des issues pour les problemes **moyens**
3. Documente les **suggestions** pour plus tard

---

## Regles Critiques

1. **TOUJOURS** validation Zod sur les entrees
2. **TOUJOURS** verifier `locals.user` dans les endpoints proteges
3. **JAMAIS** de `{@html}` sans sanitization
4. **JAMAIS** de secrets dans le code
5. **JAMAIS** de concatenation SQL
