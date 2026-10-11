# Spécification : Calculatrice Scientifique UbuMaths

> **Version** : 1.1
> **Date** : Janvier 2025
> **Priorité** : Haute (MVP dès que possible)
> **Basée sur** : CAS/REPL existant (`/cas`) + MathAST

---

## 1. Vue d'ensemble

### 1.1 Objectif

Calculatrice scientifique en ligne pour élèves francophones, intégrant un CAS (Computer Algebra System) complet, un grapheur de fonctions, et des fonctionnalités statistiques.

**Stratégie** : Étendre le CAS/REPL existant (`/cas`) plutôt que recréer.

### 1.2 URL

`/calc`

### 1.3 Accès (Hybride)

| Fonctionnalité                        | Public | Connecté |
| ------------------------------------- | ------ | -------- |
| Calcul basique                        | ✅     | ✅       |
| CAS (dérivées, intégrales, équations) | ✅     | ✅       |
| Grapheur                              | ✅     | ✅       |
| Statistiques                          | ✅     | ✅       |
| Unités physiques                      | ✅     | ✅       |
| **Historique sync (multi-appareils)** | ❌     | ✅       |
| **Steps détaillés adaptatifs**        | ❌     | ✅       |

---

## 2. Architecture technique

### 2.1 Stack

- **Frontend** : Svelte 5 (runes), Tailwind CSS 4, Shadcn-svelte
- **Input mathématique** : MathLive (LaTeX visual input)
- **CAS** : **MathAST uniquement** (pas de Compute Engine)
  - `$lib/mathAST/` - Moteur principal
  - `$lib/mathAST/cli/web/` - WebReplEngine (déjà fonctionnel)
- **Grapheur** : Composants existants (`$lib/components/grapheur`)
- **Statistiques** : Spreadsheet existant (`$lib/spreadsheet`) + extensions
- **Unités** : `$lib/mathAST/units/` (manipulation AST) + `$lib/questions/units/` (parsing LaTeX)
- **Persistance** : localStorage + Supabase (si connecté)

### 2.2 PWA Offline

- Service worker pour fonctionnement hors-ligne
- Tout le calcul est client-side (pas de dépendance serveur)
- Cache des assets MathLive

### 2.3 Infrastructure existante à réutiliser

#### CAS/REPL existant (`/cas`)

| Composant     | Chemin                                     | Status     |
| ------------- | ------------------------------------------ | ---------- |
| WebReplEngine | `$lib/mathAST/cli/web/web-repl-engine.ts`  | ✅ Complet |
| ReplContainer | `$lib/components/cas/ReplContainer.svelte` | ✅ Complet |
| ReplInput     | `$lib/components/cas/ReplInput.svelte`     | ✅ Complet |
| ReplOutput    | `$lib/components/cas/ReplOutput.svelte`    | ✅ Complet |
| AstDrawer     | `$lib/components/cas/AstDrawer.svelte`     | ✅ Complet |

#### Commandes CAS déjà implémentées

| Commande     | Alias | Description                       |
| ------------ | ----- | --------------------------------- |
| `.parse`     | `.p`  | Parser une expression             |
| `.tree`      | `.t`  | Afficher l'AST                    |
| `.latex`     | `.l`  | Convertir en LaTeX                |
| `.custom`    | `.c`  | Convertir en syntaxe custom       |
| `.simplify`  | `.s`  | Simplifier                        |
| `.normal`    | `.n`  | Forme normale                     |
| `.equiv`     | `.eq` | Tester l'équivalence              |
| `.diff`      | `.d`  | Dériver                           |
| `.taylor`    |       | Développement de Taylor           |
| `.eval`      | `.e`  | Évaluer numériquement             |
| `.let`       |       | Définir une variable              |
| `.def`       |       | Définir une fonction              |
| `.def-deriv` |       | Définir la dérivée d'une fonction |
| `.inv`       |       | Définir l'inverse d'une fonction  |
| `.vars`      |       | Lister les variables              |
| `.fns`       |       | Lister les fonctions              |
| `.clear`     |       | Effacer tout                      |
| `.unset`     |       | Supprimer une variable            |
| `.undef`     |       | Supprimer une fonction            |
| `.mode`      |       | Changer le mode (exact/decimal)   |

#### MathAST Core

| Module          | Chemin                          | Fonctionnalités                    |
| --------------- | ------------------------------- | ---------------------------------- |
| Parser          | `$lib/mathAST/parser/`          | LaTeX + Custom syntax              |
| Factory         | `$lib/mathAST/factory.ts`       | Création de nœuds AST              |
| Eval            | `$lib/mathAST/eval/`            | substitute, evaluate, getVariables |
| Differentiation | `$lib/mathAST/differentiation/` | differentiate, differentiateN      |
| Pattern         | `$lib/mathAST/pattern/`         | Pattern matching, règles           |
| Normal          | `$lib/mathAST/normal/`          | Forme canonique                    |

#### Système d'unités (deux modules)

| Module              | Chemin                  | Usage                                                        |
| ------------------- | ----------------------- | ------------------------------------------------------------ |
| **mathAST/units**   | `$lib/mathAST/units/`   | Opérations sur unités AST (multiply, divide, power, convert) |
| **questions/units** | `$lib/questions/units/` | Parsing `\unit{}` LaTeX, validation réponses                 |

**Architecture unités** :

- `mathAST/units/types.ts` - Types: `Dimension`, `BaseUnitDef`, `Unit`
- `mathAST/units/operations.ts` - Opérations: `multiply`, `divide`, `power`, `invert`
- `mathAST/units/parser.ts` - Parser: `parse('km/h')` → `Unit`
- `mathAST/units/conversion.ts` - Conversion: `getConversionFactor`, `normalizeToBase`
- `mathAST/units/definitions.ts` - Définitions: `SI_PREFIXES`, `BASE_UNITS`, `SPECIAL_UNITS`
- `mathAST/units/formatter.ts` - Affichage

#### Autres composants

| Composant        | Chemin                       | Usage                     |
| ---------------- | ---------------------------- | ------------------------- |
| Grapheur complet | `$lib/components/grapheur/`  | Tracé de courbes, analyse |
| Spreadsheet      | `$lib/spreadsheet/`          | Tableur avec formules     |
| replStore        | `$lib/stores/repl.svelte.ts` | État du REPL              |

---

## 3. Interface utilisateur

### 3.1 Layout principal

```
┌─────────────────────────────────────────────────────────────────┐
│  [📊 Calcul]  [📈 Graphique]                          [⚙️]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   (Contenu selon onglet actif)                                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Clavier virtuel (collapsible desktop, visible mobile)          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Onglet Calcul - Champ unifié intelligent

#### Mode normal (100% MathLive)

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────┐ [=] │
│  │  sin(x²) + cos(x)                                     │     │
│  └───────────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────────────┤
│  = sin(x²) + cos(x)                            [▼ Étapes] [📋] │
├─────────────────────────────────────────────────────────────────┤
│  Historique                                                     │
│  • sin(π/4) = √2/2                                              │
│  • 2 + 3 × 4 = 14                                               │
└─────────────────────────────────────────────────────────────────┘
```

#### Mode commande (après avoir tapé ".")

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────┬────────────────────────────────────────────┐ [=] │
│  │  .diff   │  sin(x²) + cos(x)                         │     │
│  │  ~~~~~~  │  ~~~~~~~~~~~~~~~~                         │     │
│  │  <input> │  <MathField>                              │     │
│  └──────────┴────────────────────────────────────────────┘     │
│  Suggestions: .diff, .diff2                                    │
│  [Tab] ou [Espace] pour passer à l'expression                  │
├─────────────────────────────────────────────────────────────────┤
│  Résultat: 2x·cos(x²) - sin(x)                 [▼ Étapes] [📋] │
└─────────────────────────────────────────────────────────────────┘
```

#### Comportement du champ unifié

| Action                           | Résultat                                          |
| -------------------------------- | ------------------------------------------------- |
| Taper dans un champ vide         | Mode MathLive (100%)                              |
| Taper `.` au début               | Bascule en mode commande (champ texte + MathLive) |
| `Tab` ou `Espace` après commande | Focus passe au MathField                          |
| `Backspace` sur `.`              | Retour au mode MathLive 100%                      |
| `Entrée`                         | Exécute (commande ou expression)                  |
| `↑` / `↓`                        | Navigation historique                             |

### 3.3 Onglet Graphique

Réutilise `GrapheurContainer` existant avec :

- FunctionPanel (sidebar)
- GraphSVG avec interactions
- ViewportControls (zoom, pan, export)
- CoordinatesDisplay

### 3.4 Clavier virtuel

**Desktop** : Caché par défaut, bouton "⌨️ Clavier" pour afficher
**Mobile** : Toujours visible

```
┌────────────────────────────────────────────────────────────────┐
│ [sin] [cos] [tan] [log] [ln] [√] [^] [∫] [d/dx] [▼ Plus...]   │
│ [π] [e] [i] [(] [)] [,] [=] [≠] [<] [>]                       │
│ [7] [8] [9] [÷] [←]                                            │
│ [4] [5] [6] [×] [C]                                            │
│ [1] [2] [3] [-] [AC]                                           │
│ [0] [.] [x] [+] [=]                                            │
└────────────────────────────────────────────────────────────────┘
```

### 3.5 Thème

- Light/Dark toggle
- Respecte la préférence système
- Persisté en localStorage

---

## 4. Fonctionnalités CAS (via MathAST)

### 4.1 Déjà implémenté dans MathAST

| Fonctionnalité            | Module                           | Status     |
| ------------------------- | -------------------------------- | ---------- |
| Parsing LaTeX             | `parser/latex/`                  | ✅ Complet |
| Parsing syntaxe custom    | `parser/custom/`                 | ✅ Complet |
| Évaluation numérique      | `eval/evaluate.ts`               | ✅ Complet |
| Substitution de variables | `eval/substitute.ts`             | ✅ Complet |
| Dérivation symbolique     | `differentiation/`               | ✅ Complet |
| Séries de Taylor          | `cli/commands/taylor.command.ts` | ✅ Complet |
| Forme normale             | `normal/`                        | ✅ Complet |
| Pattern matching          | `pattern/`                       | ✅ Complet |
| Règles de simplification  | `pattern/rules/`                 | ✅ Partiel |
| Génération LaTeX          | `latex-generator.ts`             | ✅ Complet |
| Fonctions utilisateur     | `eval/function-bindings.ts`      | ✅ Complet |

**Fonctions supportées** (via factory.ts) :

- Trigonométrie : `sin`, `cos`, `tan`, `arcsin`, `arccos`, `arctan`
- Logarithmes : `ln`, `log`, `exp`
- Racines : `sqrt`
- Valeur absolue : `abs`
- Fonctions génériques : `f`, `g`, `h` (définissables par l'utilisateur)

### 4.2 À développer dans MathAST

| Fonctionnalité               | Priorité | Complexité | Notes                                      |
| ---------------------------- | -------- | ---------- | ------------------------------------------ |
| **Support unités dans eval** | MVP      | Moyenne    | Intégrer `mathAST/units` dans l'évaluateur |
| **Commande `.convert`**      | MVP      | Faible     | Conversion d'unités (`5 km` → `5000 m`)    |
| **Commande `.limit`**        | V2       | Haute      | Calcul de limites                          |
| **Commande `.integrate`**    | V2       | Haute      | Intégration symbolique                     |
| **Commande `.solve`**        | V2       | Haute      | Résolution d'équations                     |
| **Factorisation avancée**    | V2       | Moyenne    | Polynômes, expressions                     |
| **Développement**            | V2       | Moyenne    | `(a+b)^n`                                  |
| **Statistiques**             | MVP      | Faible     | `mean`, `stdev`, `variance`, `linreg`      |

### 4.3 Toggle exact/décimal

Déjà implémenté via `.mode` :

- `.mode exact` : résultat symbolique (√2, π/4, 1/3)
- `.mode decimal` : conversion numérique

### 4.4 Intégration des unités dans MathAST ✅ IMPLÉMENTÉ

**`evaluateWithUnits`** existe déjà dans `$lib/mathAST` :

```typescript
import { evaluateWithUnits } from '$lib/mathAST';

const result = evaluateWithUnits(parseLatex('5~\\unit{km} + 3000~\\unit{m}'));
// result.value = 8, result.unit = km
```

**Modes de conversion** :
| Mode | Comportement | Exemple `5 km + 3000 m` |
|------|--------------|-------------------------|
| `'first'` (défaut) | Convertit vers la première unité | `8 km` |
| `'si'` | Normalise vers unités SI de base | `8000 m` |
| `'best'` | Choisit l'unité la plus lisible (0.1-1000) | `8 km` |

**Gestion des erreurs** :

- `DimensionalEvaluationError` pour `5 m + 3 s` (dimensions incompatibles)
- Message pédagogique inclus

**Ce qui reste à faire** :

- Intégrer `evaluateWithUnits` dans le WebReplEngine
- Nouvelle commande `.convert [unit]` pour conversions explicites

### 4.5 V2 (Intégrales + Équations)

- Intégrales définies et indéfinies (nouvelle commande `.integrate`)
- Résolution d'équations (nouvelle commande `.solve`)
- Limites (nouvelle commande `.limit`)

### 4.6 V3 (Matrices)

- Opérations matricielles
- Déterminant, inverse
- Valeurs propres

---

## 5. Statistiques

### 5.1 MVP

| Fonction                  | Description                    |
| ------------------------- | ------------------------------ |
| `mean(...)`               | Moyenne arithmétique           |
| `median(...)`             | Médiane                        |
| `stdev(...)`              | Écart-type                     |
| `variance(...)`           | Variance                       |
| `min(...)` / `max(...)`   | Extrema                        |
| `sum(...)` / `count(...)` | Somme, comptage                |
| `linreg(x, y)`            | Régression linéaire (a, b, r²) |

### 5.2 Input des données

1. **Liste inline** : `mean(1, 2, 3, 4)` ou `stdev([1.5, 2.3, 4.1])`
2. **Mini-tableur** : Bouton "📊 Données" ouvre le composant Spreadsheet existant
   - Copier-coller depuis Excel/Google Sheets
   - Sélection de plage pour les calculs

### 5.3 Visualisation (V2)

- Histogrammes
- Box plots
- Nuages de points avec droite de régression

---

## 6. Unités physiques

### 6.1 Système supporté

Réutilise `$lib/questions/units/definitions.ts` :

- Préfixes SI : pico → giga
- Unités de base : m, g, s, L, A, K, mol, cd
- Unités spéciales : h, min, €, $, °, rad

### 6.2 Fonctionnalités

- Calculs avec unités : `5 m/s × 3 s = 15 m`
- Conversions automatiques : `1 km = 1000 m`
- Analyse dimensionnelle : détection d'incohérences
- Affichage : unités en indice (3 m·s⁻¹)

---

## 7. Steps pédagogiques

### 7.1 Niveaux de détail

| Niveau    | Détail           | Exemple pour 2+3×4                                     |
| --------- | ---------------- | ------------------------------------------------------ |
| 6ème-5ème | Très détaillé    | "Priorité : multiplication d'abord → 3×4=12 → 2+12=14" |
| 4ème-3ème | Groupes logiques | "2+3×4 → 2+12 → 14"                                    |
| 2nde-1ère | Succinct         | "= 2+12 = 14"                                          |
| Terminale | Minimal          | "= 14"                                                 |

### 7.2 Détection du niveau

1. **Priorité 1** : Contexte exercice (si lancé depuis UbuMaths)
2. **Priorité 2** : Profil utilisateur (si connecté)
3. **Priorité 3** : Sélection manuelle dans les paramètres

### 7.3 Override enseignant

Un enseignant peut configurer le niveau de détail pour sa classe (augmenter ou réduire).

### 7.4 Affichage

- Expansion verticale (type Wolfram Alpha)
- Bouton "▼ Voir les étapes" sous le résultat
- Collapsible

---

## 8. Gestion des erreurs

### 8.1 Format

```
❌ [Expression invalide]

💡 [Explication pédagogique 1-2 phrases + exemple correct]
   [?] En savoir plus → popup détaillé (optionnel)
```

### 8.2 Erreurs courantes

| Erreur         | Message pédagogique                                                             |
| -------------- | ------------------------------------------------------------------------------- |
| Division par 0 | "La division par zéro n'est pas définie. Essayez 1÷2 = 0.5"                     |
| √(-4)          | "La racine carrée d'un nombre négatif n'existe pas dans ℝ. Essayez √4 = 2"      |
| log(-1)        | "Le logarithme n'est défini que pour les nombres positifs. Essayez log(10) = 1" |
| Syntaxe        | "Expression mal formée. Vérifiez les parenthèses et opérateurs."                |

---

## 9. Persistance

### 9.1 Historique

| Donnée     | Stockage                              |
| ---------- | ------------------------------------- |
| Expression | localStorage + Supabase (si connecté) |
| Résultat   | localStorage + Supabase               |
| Timestamp  | localStorage + Supabase               |
| Steps      | NON stockés (recalculés à la demande) |

- **Limite** : 100 derniers calculs
- **Sync** : Automatique si connecté (merge intelligent)

### 9.2 Variables utilisateur

- Nommage libre : `rayon = 5`, `prix = 19.99`
- Limite : 20 variables max
- Persistées en localStorage

### 9.3 Paramètres

- Décimales (2-10, défaut 4)
- Thème (light/dark/system)
- Niveau de détail des steps
- Clavier virtuel visible/caché

---

## 10. Partage

### 10.1 URL encodée (défaut)

`/calc?e=c2luKHgpK2Nvcyh4KQ==` (base64 de l'expression)

- Fonctionne sans serveur
- URL courte pour expressions simples

### 10.2 Shortcode Supabase (état complet)

`/calc/s/abc123`

- Expression + viewport grapheur + variables + paramètres
- Nécessite Supabase
- Pour partager un "workspace" complet

### 10.3 Export

- **LaTeX** : Copier l'expression/résultat en LaTeX
- **Texte** : Copier en texte brut
- **Lien** : Générer URL de partage

---

## 11. Accessibilité (WCAG AA)

### 11.1 Requis

- Contraste suffisant (4.5:1 texte, 3:1 UI)
- Navigation clavier complète
- Focus visible
- Labels ARIA sur tous les boutons
- Rôles ARIA pour les régions

### 11.2 Nice-to-have (V2)

- Lecture d'écran optimisée pour équations
- Mode haut contraste
- Descriptions vocales

---

## 12. Performance

### 12.1 Limites

- **Grapheur** : 10 fonctions simultanées max
- **Variables** : 20 max
- **Historique** : 100 entrées max
- **Expression** : 1000 caractères max

### 12.2 Optimisations

- Sampling adaptatif pour le grapheur
- Debounce sur l'input MathLive (200ms)
- Lazy loading du Compute Engine

---

## 13. Structure des fichiers (proposée)

```
src/
├── routes/
│   └── (public)/
│       └── calc/
│           ├── +page.svelte          # Page principale (layout onglets)
│           ├── +page.ts              # Load (vérif params URL)
│           └── s/[shortcode]/        # Partage shortcode
│               └── +page.server.ts
│
├── lib/
│   ├── components/
│   │   └── calculator/               # Nouveaux composants UI calculatrice
│   │       ├── CalculatorContainer.svelte  # Layout principal (onglets)
│   │       ├── UnifiedInput.svelte         # Champ unifié intelligent ⭐
│   │       ├── CommandInput.svelte         # Partie commande (texte + autocomplete)
│   │       ├── ResultDisplay.svelte        # Affichage résultat + steps
│   │       ├── CalculatorKeyboard.svelte   # Clavier virtuel
│   │       └── SettingsPanel.svelte        # Paramètres (décimales, niveau...)
│   │
│   ├── mathAST/                      # Existant - extensions
│   │   ├── eval/
│   │   │   └── statistics.ts         # NOUVEAU: mean, stdev, linreg
│   │   ├── cli/commands/
│   │   │   ├── convert.command.ts    # NOUVEAU: conversion unités
│   │   │   └── stats.command.ts      # NOUVEAU: commande .stats
│   │   └── step-generator/           # NOUVEAU: génération steps pédagogiques
│   │       ├── index.ts
│   │       ├── arithmetic-steps.ts
│   │       └── calculus-steps.ts
│   │
│   └── stores/
│       └── calculator.svelte.ts      # NOUVEAU: état calculatrice
│                                     # (étend replStore)
│
# RÉUTILISÉS TELS QUELS:
# - $lib/components/cas/          → ReplInput, ReplOutput
# - $lib/components/grapheur/     → GrapheurContainer, etc.
# - $lib/mathAST/                 → Tout le CAS existant
# - $lib/mathAST/units/           → Système d'unités
# - $lib/stores/repl.svelte.ts    → État REPL
```

---

## 14. Phases d'implémentation

### Phase 1 : Base Calculator (court)

**Objectif** : Page `/calc` avec REPL existant + UI calculatrice

1. Route `/calc` avec layout onglets [Calcul][Graphique]
2. Adapter `ReplContainer` pour UI calculatrice (masquer mode terminal)
3. Ajouter clavier virtuel adaptatif (mobile visible, desktop toggle)
4. Historique localStorage (réutiliser `replStore`)
5. Thème light/dark toggle

**Réutilise** : `WebReplEngine`, `ReplInput`, `ReplOutput`, `replStore`

### Phase 2 : Unités (prioritaire)

**Objectif** : Calculs avec unités physiques via MathAST

1. Intégrer `mathAST/units` dans l'évaluateur (`eval/evaluate.ts`)
2. Parser `\unit{}` dans les expressions LaTeX
3. Nouvelle commande `.convert` pour conversions
4. Propagation des unités dans les opérations
5. Analyse dimensionnelle + erreurs pédagogiques

**Fichiers** : `mathAST/eval/evaluate.ts`, `mathAST/cli/commands/convert.command.ts`

### Phase 3 : Grapheur intégré

**Objectif** : Onglet Graphique fonctionnel

1. Intégrer `GrapheurContainer` dans l'onglet Graphique
2. Partage de contexte (variables/fonctions définies dans Calcul)
3. Bouton "Tracer" depuis résultat calcul

**Réutilise** : Tout le code grapheur existant

### Phase 4 : Statistiques

**Objectif** : Fonctions statistiques dans MathAST

1. Nouvelles fonctions dans l'évaluateur : `mean`, `median`, `stdev`, `variance`
2. Régression linéaire : `linreg(x, y)` → `{a, b, r2}`
3. Input tableur : Bouton "📊 Données" ouvre mini-spreadsheet
4. Intégration liste inline : `mean(1, 2, 3, 4)`

**Fichiers** : `mathAST/eval/statistics.ts` (nouveau), `mathAST/cli/commands/stats.command.ts`

### Phase 5 : Steps pédagogiques

**Objectif** : Afficher les étapes de calcul

1. Module `step-generator.ts` pour générer les étapes
2. Expansion verticale sous les résultats
3. Niveaux de détail adaptatifs (6ème → Terminale)
4. Override enseignant

### Phase 6 : Finitions + Sync

**Objectif** : Polish et persistance cloud

1. Sync Supabase pour historique (si connecté)
2. PWA offline (service worker)
3. Partage URL base64 + shortcode Supabase
4. Export LaTeX/texte
5. WCAG AA compliance

---

## 15. Questions ouvertes (à clarifier si besoin)

### Architecture

1. ~~**UnitNode dans eval**~~ → **RÉSOLU** : `evaluateWithUnits()` existe avec 3 modes de conversion (`first`, `si`, `best`)
2. ~~**Parser LaTeX unités**~~ → **RÉSOLU** : Le parser LaTeX supporte `\unit{}` nativement

### Fonctionnalités

3. **Intégrales** : Reporter à V2 confirmé. Quelle bibliothèque/approche pour l'implémentation symbolique ?
4. **Équations** : Reporter à V2 confirmé. Quelle complexité maximale ? (linéaire, quadratique, systèmes ?)
5. **Limites** : Reporter à V2 confirmé. Jusqu'à quelle complexité ? (règle de l'Hôpital ?)

### UI

6. ~~**Mode terminal**~~ → **DÉCIDÉ** : Masqué dans `/calc`. Disponible dans `/cas` pour power users.
7. ~~**AST Drawer**~~ → **DÉCIDÉ** : Non visible dans `/calc`. Réservé au debug dans `/cas`.
8. ~~**Input mode**~~ → **DÉCIDÉ** : Champ unifié intelligent (Approche A améliorée)
   - Par défaut : 100% MathLive
   - Taper `.` au début : bascule en mode commande (texte + MathLive côte à côte)
   - Tab/Espace après commande : focus vers MathField

---

## 16. Métriques de succès

- Temps de chargement initial < 2s
- Temps de calcul < 100ms pour expressions simples
- Score Lighthouse > 90 (Performance, Accessibility)
- 0 erreur TypeScript/ESLint
- Couverture de tests > 80%

---

## Annexe A : Ressources existantes à réutiliser

### CAS/REPL (Prêt à l'emploi)

| Module        | Fichier                                    | Status     |
| ------------- | ------------------------------------------ | ---------- |
| WebReplEngine | `$lib/mathAST/cli/web/web-repl-engine.ts`  | ✅ Complet |
| ReplContainer | `$lib/components/cas/ReplContainer.svelte` | ✅ Complet |
| ReplInput     | `$lib/components/cas/ReplInput.svelte`     | ✅ Complet |
| ReplOutput    | `$lib/components/cas/ReplOutput.svelte`    | ✅ Complet |
| replStore     | `$lib/stores/repl.svelte.ts`               | ✅ Complet |

### MathAST Core

| Module            | Fichier                            | Documentation                 |
| ----------------- | ---------------------------------- | ----------------------------- |
| Types             | `$lib/mathAST/types.ts`            | MathNode, UnitNode, etc.      |
| Factory           | `$lib/mathAST/factory.ts`          | Création de nœuds             |
| Parser LaTeX      | `$lib/mathAST/parser/latex/`       | parseLatex, parsePratt        |
| Parser Custom     | `$lib/mathAST/parser/custom/`      | parseCustom                   |
| Évaluation        | `$lib/mathAST/eval/`               | evaluate, substitute          |
| Différentiation   | `$lib/mathAST/differentiation/`    | differentiate, differentiateN |
| Forme normale     | `$lib/mathAST/normal/`             | Canonicalisation              |
| Pattern matching  | `$lib/mathAST/pattern/`            | match, applyRule              |
| Générateur LaTeX  | `$lib/mathAST/latex-generator.ts`  | toLatex                       |
| Générateur Custom | `$lib/mathAST/custom-generator.ts` | toCustom                      |

### Système d'unités

| Module       | Fichier                             | Usage                        |
| ------------ | ----------------------------------- | ---------------------------- |
| Types        | `$lib/mathAST/units/types.ts`       | Dimension, Unit, BaseUnitDef |
| Opérations   | `$lib/mathAST/units/operations.ts`  | multiply, divide, power      |
| Parser       | `$lib/mathAST/units/parser.ts`      | parse('km/h') → Unit         |
| Conversion   | `$lib/mathAST/units/conversion.ts`  | getConversionFactor          |
| Définitions  | `$lib/mathAST/units/definitions.ts` | SI_PREFIXES, BASE_UNITS      |
| Formatter    | `$lib/mathAST/units/formatter.ts`   | Affichage                    |
| Parser LaTeX | `$lib/questions/units/parser.ts`    | Parsing `\unit{}`            |

### Autres composants

| Module      | Fichier                     | Status     |
| ----------- | --------------------------- | ---------- |
| Grapheur    | `$lib/components/grapheur/` | ✅ Complet |
| Spreadsheet | `$lib/spreadsheet/`         | ✅ Complet |

## Annexe B : Dépendances

| Package                                | Version  | Usage              |
| -------------------------------------- | -------- | ------------------ |
| `mathlive`                             | existant | Input LaTeX visuel |
| **Aucune nouvelle dépendance requise** |          | MathAST suffit     |

## Annexe C : Commandes CAS à ajouter

| Commande     | Priorité | Description            |
| ------------ | -------- | ---------------------- |
| `.convert`   | MVP      | Conversion d'unités    |
| `.stats`     | MVP      | Fonctions statistiques |
| `.limit`     | V2       | Calcul de limites      |
| `.integrate` | V2       | Intégration symbolique |
| `.solve`     | V2       | Résolution d'équations |
| `.factor`    | V2       | Factorisation          |
| `.expand`    | V2       | Développement          |
