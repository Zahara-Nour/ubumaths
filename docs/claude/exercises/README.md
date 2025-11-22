# Système Images Multi-Format - État d'Avancement

## Progression Générale

| Phase | Nom                              | Statut           | Date de Reprise |
| ----- | -------------------------------- | ---------------- | --------------- |
| 1     | Types et modèle de données       | ✅ Complète      | 2025-11-22      |
| 2     | Service de dimensionnement       | ✅ Complète      | 2025-11-22      |
| 3     | Parser markdown enrichi          | ✅ Complète      | 2025-11-22      |
| 4     | HTML Renderer                    | ✅ Complète      | 2025-11-22      |
| 5     | LaTeX Transpiler                 | ✅ Complète      | 2025-11-22      |
| 6     | Typst Transpiler                 | ⏳ Non commencée | -               |
| 7     | System d'upload d'images         | ⏳ Non commencée | -               |
| 8     | Interface utilisateur enseignant | ⏳ Non commencée | -               |
| 9     | Tests E2E                        | ⏳ Non commencée | -               |

## Objectif Global

Implémenter un système robuste de gestion des images dans les exercices mathématiques, supportant :

- **5 classes de taille sémantiques** : inline, small, medium, large, full
- **Alignement flexible** : left, center, right
- **Multi-format** : HTML (%), LaTeX (\\textwidth), Typst (%)
- **Métadonnées enrichies** : dimensions originales, captions, alt text
- **Transpilation correcte** : Conversion fiable entre formats

## Comment Reprendre le Travail

### 1. Lire la documentation de la phase complète

Consultez `/docs/claude/exercises/phase-1-types.md` pour comprendre :

- Les types créés et modifiés
- Les décisions de design
- L'architecture mise en place
- Ce qui a été audité

### 2. Identifier la prochaine phase

Lisez `/docs/claude/exercises/phase-2-dimensions.md` pour connaître :

- L'objectif exact
- Les fichiers à créer/modifier
- L'approche recommandée
- Les tests attendus

### 3. Vérifier l'intégrité du code

```bash
# Vérifier la compilation TypeScript
pnpm check

# Vérifier rapidement (changes seulement)
pnpm check:fast

# Lint
pnpm lint

# Tests unitaires
pnpm test:unit
```

## Commandes Utiles

### Vérification de qualité

```bash
# Check complet (TypeScript + Svelte)
pnpm check

# Check rapide (TypeScript seulement, changements)
pnpm check:fast

# Check fichiers staged
pnpm check:staged

# Lint (ESLint)
pnpm lint

# Format
pnpm format
```

### Tests

```bash
# Tests unitaires (Vitest)
pnpm test:unit

# Tests triggers database
pnpm test:triggers

# Watch mode
pnpm test:unit -- --watch

# Spécifique à un fichier
pnpm test:unit -- src/lib/exercises
```

### Build & Dev

```bash
# Mode développement (port 5175)
pnpm dev -- --port 5175

# Build production
pnpm build

# Preview production build
pnpm preview
```

## Notes Importantes

### Architecture Générale

Le système est organisé dans `/src/lib/exercises/` :

```
src/lib/exercises/
├── types.ts                    # Définitions de types (Phase 1) ✅
├── services/                   # Services métier (Phase 2+)
├── parser/                     # Parser markdown (Phase 3)
├── transpilers/                # Transpileurs (Phase 5-6)
├── utils/                      # Utilitaires
└── *.test.ts                   # Tests unitaires
```

### Contraintes Importantes

1. **Rétro-compatibilité** : Toutes les nouvelles propriétés sont optionnelles
2. **TypeScript strict** : Aucun `any` type autorisé
3. **Validation Zod** : Tous les inputs utilisateur doivent être validés
4. **Tests requis** : 99%+ de couverture attendue
5. **Zéro avertissement ESLint** : En production

### Standards de Code

- Svelte 5 runes (pas Svelte 4)
- TypeScript strict mode
- Pas de `any` types
- Validation avec Zod pour tous les inputs
- Prose claire et en anglais dans les commentaires

## Phases Détaillées

### Phase 1 : Types et Modèle de Données ✅

**Statut** : Complète

Création de la fondation du système :

- Extension de `ImageNode` avec propriétés de dimensionnement
- Types pour classes de taille et alignements
- Interface `ImageSizeMapping` pour conversions multi-format
- Constante `DEFAULT_IMAGE_SIZE_MAPPINGS` avec valeurs par défaut

**Fichiers modifiés** :

- `/src/lib/exercises/types.ts`

Voir `/docs/claude/exercises/phase-1-types.md` pour détails.

### Phase 2 : Service de Dimensionnement ✅

**Statut** : Complète

Création du service centralisé pour transformer les classes de taille sémantiques en dimensions réelles pour chaque format de sortie.

**Fichiers créés** :

- `/src/lib/exercises/services/image-dimensions.ts`

**Fonctions implémentées** :

1. `getDimensionsForFormat(node, format)` - Calcule dimensions pour un format
2. `getPercentDimensions(percent, format)` - Convertit % en dimensions
3. `autoDetectSizeClass(width, height)` - Auto-détecte classe de taille
4. `getAlignmentStyles(alignment, format)` - Génère styles d'alignement
5. `shouldUseFigureEnvironment(node)` - Détermine figure environment

Voir `/docs/claude/exercises/phase-2-dimensions.md` pour détails complets.

### Phase 3 : Parser Markdown Enrichi ✅

**Statut** : Complète

Implémentation du support complet des images enrichies dans le parser markdown.

**Fichiers modifiés** :

- `/src/lib/exercises/parser/markdown-parser.ts`

**Fonctionnalités implémentées** :

1. Regex `IMAGE_REGEX` pour capturer images avec/sans attributs
2. Fonction `parseImageAttributes()` pour parser `{size=... align=... ...}`
3. Fonction `parseImageLine()` pour créer les ImageNodes
4. Intégration dans `parseMarkdown()` pour détection automatique
5. Validation stricte (whitelist) pour tous les énums
6. Support complet de la syntaxe enrichie

**Syntaxe supportée** :

```markdown
![alt](url)
![alt](url 'title')
![alt](url){size=medium}
![alt](url){width=60%}
![alt](url){align=center}
![alt](url){caption="Figure 1"}
![alt](url 'title'){size=large align=right caption="Figure 1"}
```

Voir `/docs/claude/exercises/phase-3-parser.md` pour détails complets.

### Phase 4 : HTML Renderer ✅

**Statut** : Complète

Mise à jour de `ExerciseDisplay.svelte` pour rendre les images avec support complet :

**Fichiers modifiés** :

- `/src/lib/components/exercises/ExerciseDisplay.svelte`

**Fonctionnalités implémentées** :

1. Fonction `renderImage()` avec support complet des attributs
2. Protection XSS via `escapeHtml()` pour tous les attributs
3. Accessibilité WCAG 2.1 Level AA (aria-describedby, lazy loading)
4. Prévention CLS via `aspect-ratio` CSS
5. Gestion des ratios extrêmes (>3:1 et <1:3)
6. Classes CSS responsive (`.exercise-image-*`)
7. Support `<figure>` + `<figcaption>` sémantique

**Audits passés** :

- Accessibilité : PASS (WCAG 2.1 Level AA)
- Performance : GOOD (85/100)

Voir `/docs/claude/exercises/phase-4-html-renderer.md` pour détails complets.

### Phase 5 : LaTeX Transpiler

**Objectif** : Convertir l'AST en LaTeX avec images en \\includegraphics.

**Tâches** :

- Créer transpileur LaTeX
- Gérer les dimensions en \\textwidth
- Support pour captions (figure environment)
- Tests de transpilation

### Phase 6 : Typst Transpiler

**Objectif** : Convertir l'AST en Typst avec images.

**Tâches** :

- Créer transpileur Typst
- Gérer les dimensions en %
- Support des images natives Typst
- Tests de transpilation

### Phase 7 : System d'Upload d'Images

**Objectif** : Permettre aux enseignants d'uploader des images.

**Tâches** :

- Créer API endpoint d'upload
- Intégrer Supabase Storage
- Optimisation et compression
- Validation des fichiers

### Phase 8 : Interface Utilisateur Enseignant

**Objectif** : Créer l'UI pour gérer les images dans les exercices.

**Tâches** :

- Composant sélecteur d'image
- Widget de prévisualisation
- Contrôles de dimensionnement
- Intégration dans l'éditeur d'exercices

### Phase 9 : Tests E2E

**Objectif** : Tests end-to-end complets du système.

**Tâches** :

- Tests Playwright complets
- Workflow complet : upload → utilisation → rendu
- Tests multi-navigateur
- Documentation des cas de test

## Ressources

- **Documentation architecture** : `/docs/claude/architecture.md`
- **Best practices** : `/docs/claude/best-practices.md`
- **Quality standards** : `/docs/claude/quality-standards.md`
- **Database** : `/docs/claude/database.md`
- **UI Components** : `/docs/claude/ui-components.md`

## Questions Fréquentes

**Q: Pourquoi 5 classes de taille ?**

R: Couvrent 95% des cas d'usage pratiques en mathématiques. Les cas spéciaux peuvent utiliser `widthPercent` directement.

**Q: Comment gérer les images dans les transpilers ?**

R: Chaque transpileur doit implémenter `transpileImage()` qui use `DEFAULT_IMAGE_SIZE_MAPPINGS` pour convertir `sizeClass` en dimensions appropriées.

**Q: Et les images responsives ?**

R: Géré en HTML via width/maxWidth/maxHeight. LaTeX/Typst ne sont pas responsifs (documents fixes).

**Q: Rétro-compatibilité ?**

R: Toutes les nouvelles propriétés (`sizeClass`, `widthPercent`, `alignment`, `caption`, `originalWidth`, `originalHeight`) sont optionnelles. Pas de breaking changes.

---

**Mis à jour** : 2025-11-22
**Branch** : feature/audit-trail
