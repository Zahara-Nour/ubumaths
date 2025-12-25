# Blockly Phase 2 - Documentation de progression

## Statut : TERMINE

**Date** : 2025-12-06
**Duree** : ~3 heures

---

## Objectif Phase 2

Creer le systeme d'execution de code securise pour Blockly :

- Worker JavaScript sandbox avec isolation
- Executeur JS avec gestion des messages
- Orchestrateur Blockly (JS + Python lazy-loaded)
- Integration avec PlaygroundExecutor Python existant

---

## Architecture

```
BlocklyPlayground.svelte
         |
         v
   BlocklyExecutor (orchestrateur)
         |
    +----+----+
    |         |
    v         v
JsExecutor   PlaygroundExecutor
    |         (lazy-loaded)
    v
js-sandbox.worker.ts
```

---

## Fichiers crees

### Types et Schemas (`src/lib/shared/blockly/execution/`)

| Fichier    | Description                                                               |
| ---------- | ------------------------------------------------------------------------- |
| `types.ts` | Types Worker JS (ToJsWorkerMessage, FromJsWorkerMessage, JsExecutorState) |
| `index.ts` | Barrel exports pour le module execution                                   |

### Worker Messages (`src/lib/shared/blockly/worker/`)

| Fichier       | Description                                     |
| ------------- | ----------------------------------------------- |
| `messages.ts` | Schemas Zod pour validation des messages Worker |

### Worker (`src/lib/workers/`)

| Fichier                | Description                        |
| ---------------------- | ---------------------------------- |
| `js-sandbox.worker.ts` | Worker JavaScript sandbox securise |

### Executeurs (`src/lib/shared/blockly/execution/`)

| Fichier                      | Description                                   |
| ---------------------------- | --------------------------------------------- |
| `js-executor.svelte.ts`      | Gestionnaire du Worker JS avec runes Svelte 5 |
| `blockly-executor.svelte.ts` | Orchestrateur JS + Python avec lazy-loading   |

### Composants mis a jour

| Fichier                    | Modifications                                      |
| -------------------------- | -------------------------------------------------- |
| `BlocklyPlayground.svelte` | Integration BlocklyExecutor, overlay de chargement |

---

## Decisions techniques

### 1. Worker JS Sandbox vs new Function()

**Choix** : Worker avec sandbox
**Justification** :

- Isolation complete (pas d'acces DOM)
- Timeout fiable via termination du Worker
- Securite renforcee via whitelist de globals

### 2. Lazy-loading Python

**Choix** : Import dynamique de PlaygroundExecutor
**Justification** :

- Pyodide est lourd (~15MB)
- JS est le mode par defaut
- Chargement Python uniquement si necessaire

### 3. Polling vs Callbacks pour sync d'etat

**Choix** : Polling avec setInterval (50ms)
**Justification** :

- Simple a implementer
- Runes Svelte dans classes ne supportent pas $effect facilement
- Performance acceptable pour ce cas d'usage

---

## Mesures de securite implementees

### Sandbox Worker JS

1. **Globals bloques** (30+) :

   - `window`, `document`, `fetch`, `XMLHttpRequest`
   - `eval`, `Function`, `Proxy`, `Reflect`
   - `setTimeout`, `setInterval`, `Worker`
   - `localStorage`, `sessionStorage`, `indexedDB`
   - `crypto`, `performance`, `navigator`

2. **Helpers math UbuMaths** :

   - `gcd()`, `lcm()`, `isPrime()`, `factorial()`
   - Avec validation des inputs et limites

3. **Timeout** : 10 secondes + 2s buffer main thread

4. **Protection prototype** :

   - `Object.freeze()` sur prototypes
   - Prevention pollution prototype

5. **Blocage patterns dangereux** :

   - Detection regex: `.constructor(`, `__proto__`, `.prototype =`
   - Erreur avant execution si pattern detecte

6. **Limites output** :

   - 100,000 caracteres cumules max
   - 10,000 caracteres par message
   - Troncature avec message d'avertissement

7. **Sanitisation erreurs** :
   - Suppression chemins fichiers
   - Suppression URLs
   - Limite 500 caracteres

### Validation Zod

- Tous les messages Worker valides des deux cotes
- Limites de taille sur code (100K) et output (10K)
- IDs d'execution valides

---

## Code Review

**Statut** : PASSE
**Reviewer** : code-reviewer (opus)

### Points forts

- Svelte 5 runes correctement utilises
- Pas de type `any`
- Architecture bien structuree
- Validation Zod complete

### Recommandations appliquees

- Limites output ajoutees
- Error boundary pret (hasError state)

### Recommandations differees

- Consolidation schemas.ts vs messages.ts (Phase 3)
- Remplacement polling par callbacks (Phase 3)
- Lock pour chargement Python concurrent (risque faible)

---

## Security Audit

**Statut** : NEEDS_HARDENING -> SECURE (apres corrections)
**Reviewer** : security-auditor (opus)

### Vulnerabilites corrigees

| Severite | Probleme                        | Correction                      |
| -------- | ------------------------------- | ------------------------------- |
| HIGH     | Escape via constructor          | Pattern detection + blocage     |
| HIGH     | Prototype pollution             | Object.freeze() sur prototypes  |
| MEDIUM   | Pas de limite output            | Limite 100K cumule, 10K/message |
| MEDIUM   | Pas de validation taille stdout | Zod .max(10100)                 |
| LOW      | Message erreur non sanitise     | Suppression paths/URLs          |

### Limites connues (acceptees)

- Timeout ne peut pas arreter boucle synchrone (limitation JS)
- Solution: backup timeout main thread (12s) termine le Worker

---

## Fichiers modifies (resume)

```
src/lib/
├── shared/blockly/
│   ├── execution/
│   │   ├── types.ts          (nouveau)
│   │   ├── js-executor.svelte.ts    (nouveau)
│   │   ├── blockly-executor.svelte.ts (nouveau)
│   │   └── index.ts          (nouveau)
│   ├── worker/
│   │   └── messages.ts       (modifie: limites ajoutees)
│   └── index.ts              (modifie: exports execution)
├── workers/
│   └── js-sandbox.worker.ts  (nouveau + securite renforcee)
└── components/blockly/
    └── BlocklyPlayground.svelte (modifie: integration executor)
```

---

## Bugs corriges post-commit

| Bug                       | Cause                                                 | Correction                                         |
| ------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| CSP bloque sons Blockly   | Blockly charge sons depuis `blockly-demo.appspot.com` | `sounds: false` dans config                        |
| Worker URL incorrecte     | 4 niveaux `../../../../` au lieu de 3                 | `../../../workers/js-sandbox.worker.ts`            |
| Imports Worker            | Chemins relatifs non resolus                          | Alias `$lib/shared/...`                            |
| Images trashcan cassees   | CSP bloque unpkg.com pour images                      | Ajoute `unpkg.com` a `img-src` dans CSP            |
| Flyout scrollbar persiste | Scrollbar visible apres fermeture du menu             | CSS `.blocklyFlyoutScrollbar { display: none }`    |
| Texte categories blanc    | Heritage couleur body en dark mode                    | Theme Blockly `toolboxForegroundColour: '#000000'` |
| Texte selectionne noir    | CSS specificity issue                                 | `:not(.blocklyTreeSelected)` + regles separees     |
| Python code trop long     | Helpers inclus meme si non utilises                   | Detection smart des helpers requis                 |

---

## Tests manuels effectues

- [x] Compilation TypeScript OK
- [x] Worker initialisation
- [x] Execution JS basique (console.log)
- [x] Timeout sur boucle infinie
- [x] Detection pattern dangereux
- [x] Limite output respectee
- [x] Fix CSP sons Blockly
- [x] Fix imports Worker

---

## Prochaines etapes (Phase 3)

1. Tests unitaires pour executeurs
2. Consolidation schema files
3. Tortue graphique (Canvas)
4. Mode exercice avec validation

---

## Checklist Phase 2

- [x] Worker JS sandbox cree
- [x] JsExecutor cree
- [x] BlocklyExecutor cree
- [x] Python integration (lazy-load)
- [x] BlocklyPlayground mis a jour
- [x] Code review passe
- [x] Security audit passe
- [x] Vulnerabilites corrigees
- [x] Compilation OK
- [x] Documentation ecrite
