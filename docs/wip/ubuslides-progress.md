# UbuSlides - Documentation de progression

> **Statut** : 🟢 Phase 4 terminée - Prêt pour Phase 5 (Realtime)
> **Dernière mise à jour** : 2026-01-24

---

## Vue d'ensemble

Intégration de reveal.js dans UbuMaths pour créer un système de slides interactif adapté à l'enseignement des mathématiques.

### Objectifs

- Slides avec contenu UbuMark (formules, variables, hints)
- Intégration pages whiteboard comme slides
- Questions interactives dans les slides
- Synchronisation temps réel prof/élèves
- Annotations professeur en live

### Architecture cible

```
┌─────────────────────────────────────────────────────────┐
│                    UbuSlides                            │
├─────────────────────────────────────────────────────────┤
│  Plugins UbuMaths                                       │
│  ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐   │
│  │ UbuMark │ │ Whiteboard│ │ Questions│ │ Realtime │   │
│  └─────────┘ └───────────┘ └──────────┘ └──────────┘   │
├─────────────────────────────────────────────────────────┤
│  Wrappers Svelte 5                                      │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────┐    │
│  │ Deck.svelte│ │Slide.svelte│ │PresenterView.svelte│  │
│  └────────────┘ └────────────┘ └──────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  reveal.js (utilisé tel quel)                           │
│  Navigation | Transitions | Fragments | Overview | API  │
└─────────────────────────────────────────────────────────┘
```

---

## Phases du projet

### Phase 1 : Prototype Deck/Slide ✅ TERMINÉE

**Objectif** : Wrappers Svelte 5 fonctionnels pour reveal.js

**Livrables** :

- [x] `Deck.svelte` - Wrapper principal reveal.js
- [x] `Slide.svelte` - Wrapper section avec props typées
- [x] `types.ts` - Types TypeScript
- [x] Démo fonctionnelle 5 slides
- [ ] Tests unitaires (reportés)

**Comportements attendus** :

1. Le deck s'initialise correctement au mount
2. La navigation clavier/touch fonctionne
3. Les transitions entre slides fonctionnent
4. Le composant se détruit proprement au unmount
5. Les props Slide sont réactives (background, transition, etc.)

**Structure fichiers** :

```
src/lib/slides/
├── core/
│   ├── Deck.svelte
│   ├── Slide.svelte
│   ├── types.ts
│   └── config.ts
└── index.ts
```

---

### Phase 2 : Plugin UbuMark ✅ TERMINÉE

**Objectif** : Rendre le contenu UbuMark dans les slides

**Livrables** :

- [x] `UbuMarkSlide.svelte` - Slide avec contenu markdown
- [x] Support formules math ($...$) via MarkdownRenderer
- [x] Support variables ({{name}}) via substitution
- [x] Support fragments via {.fragment} marker
- [ ] Plugin `ubumark` reveal.js natif (reporté - non nécessaire)

**Décisions techniques** :

- Contenu passé via prop (pas slot) pour traitement variables
- Variables pré-définies via prop `variables`
- SSR désactivé (reveal.js nécessite DOM)
- Réutilisation de MarkdownRenderer existant

**Dépendances** :

- MarkdownRenderer existant (`src/lib/components/markdown/`)

---

### Phase 3 : Plugin Questions ✅ TERMINÉE

**Objectif** : Questions interactives dans les slides

**Livrables** :

- [x] `QuestionSlide.svelte` - Slide avec question interactive
- [x] Support tous types (QCM, numérique, algébrique, blancs)
- [x] Validation réponses via `validateAnswer()`
- [x] Feedback visuel (correct/incorrect)
- [x] Section correction révélée par bouton/fragment
- [ ] Plugin `questions` reveal.js natif (reporté - non nécessaire)

**Décisions techniques** :

- Réutilisation des input components existants (pas QuestionCard)
- Correction séparée via fragment reveal.js
- Callback `onanswer` pour collecte (prévu Phase 5)
- Style simplifié adapté aux slides

**Dépendances** :

- Input components (`src/lib/components/question-inputs/`)
- `validateAnswer()` (`src/lib/utils/answer-validator.ts`)

---

### Phase 4 : Plugin Whiteboard ✅ TERMINÉE

**Objectif** : Pages whiteboard comme slides avec annotations

**Livrables** :

- [x] `PageRenderer.svelte` - Rendu lecture seule d'une Page
- [x] `SlideAnnotationLayer.svelte` - Layer d'annotations autonome
- [x] `SlideAnnotationToolbar.svelte` - Barre d'outils flottante
- [x] `WhiteboardSlide.svelte` - Slide avec page whiteboard
- [x] Mode lecture (affichage page)
- [x] Mode annotation (dessin professeur)
- [x] Undo/redo local
- [ ] Synchronisation store whiteboard (reporté Phase 5)

**Décisions techniques** :

- `PageRenderer` : Extraction logique de rendu de WhiteboardCanvas
- `SlideAnnotationLayer` : Autonome (pas couplé à whiteboardStore)
- Annotations éphémères par défaut (perdues à la fermeture)
- Callback `onAnnotationsChange` pour persistence optionnelle

**Dépendances** :

- Whiteboard existant (`src/lib/whiteboard/`)
- roughjs pour rendu formes
- perfect-freehand pour strokes

---

### Phase 5 : Plugin Realtime

**Objectif** : Synchronisation prof/élèves

**Livrables** :

- [ ] Plugin `realtime` pour reveal.js
- [ ] Canal Supabase dédié slides
- [ ] Sync position slide
- [ ] Collecte réponses élèves
- [ ] Affichage résultats agrégés

**Dépendances** :

- Supabase Realtime (`src/lib/stores/`)
- Système de présence existant

---

### Phase 6 : Vues spécialisées

**Objectif** : Interfaces prof et élève

**Livrables** :

- [ ] `PresenterView.svelte` - Vue speaker enrichie
- [ ] `StudentView.svelte` - Vue élève participative
- [ ] `ControlView.svelte` - Télécommande mobile
- [ ] Timer exercices
- [ ] Notes UbuMark

---

### Phase 7 : Export & Persistence

**Objectif** : Sauvegarder et exporter

**Livrables** :

- [ ] Format `.ubs` (UbuSlides)
- [ ] Export PDF
- [ ] Export vers whiteboard
- [ ] Import depuis cours existants

---

## Journal de progression

### 2026-01-24

- [x] Analyse reveal.js (documentation complète dans `extern/reveal.js/reveal.md`)
- [x] Analyse UbuMaths (UbuMark, Whiteboard, Questions)
- [x] Définition architecture cible
- [x] Création documentation de progression
- [x] **TERMINÉ** : Phase 1 - Prototype Deck/Slide
  - [x] Installation reveal.js via pnpm
  - [x] Types TypeScript (`types.ts`)
  - [x] Configuration par défaut (`config.ts`)
  - [x] Composant Deck.svelte (wrapper reveal.js)
  - [x] Composant Slide.svelte (wrapper section)
  - [x] Layout isolé (`+layout@.svelte`)
  - [x] Page démo fonctionnelle
  - [x] Fix: export contexte, CSS scoping, font-size
- [x] **TERMINÉ** : Phase 2 - Plugin UbuMark
  - [x] Composant UbuMarkSlide.svelte
  - [x] Support formules math via MarkdownRenderer
  - [x] Substitution variables {{name}}
  - [x] Support fragments {.fragment}
  - [x] Fix: SSR désactivé (+page.ts)
  - [x] Démo mise à jour avec UbuMarkSlide
- [x] **TERMINÉ** : Phase 3 - Plugin Questions
  - [x] Composant QuestionSlide.svelte
  - [x] Support QCM, numérique, algébrique, blancs
  - [x] Validation via validateAnswer()
  - [x] Feedback visuel correct/incorrect
  - [x] Section correction via fragment
  - [x] Démo avec exemples QCM et numérique
- [x] **TERMINÉ** : Phase 4 - Plugin Whiteboard
  - [x] Composant PageRenderer.svelte (lecture seule)
  - [x] Composant SlideAnnotationLayer.svelte (annotations autonomes)
  - [x] Composant SlideAnnotationToolbar.svelte (barre d'outils)
  - [x] Composant WhiteboardSlide.svelte (intégration)
  - [x] Support roughjs pour formes
  - [x] Support perfect-freehand pour strokes
  - [x] Undo/redo local pour annotations
  - [x] Démo avec exemple whiteboard

---

## Décisions techniques

### Intégration reveal.js

| Décision         | Choix                         | Justification                   |
| ---------------- | ----------------------------- | ------------------------------- |
| Import reveal.js | NPM package                   | Facilite les mises à jour       |
| Initialisation   | `onMount` Svelte              | Cycle de vie propre             |
| État             | Runes Svelte 5                | Cohérence avec UbuMaths         |
| Plugins          | Architecture reveal.js native | Réutilisation patterns éprouvés |

### Configuration par défaut

```typescript
const defaultConfig = {
	width: 1920,
	height: 1080,
	margin: 0.04,
	controls: true,
	progress: true,
	hash: true,
	transition: 'slide',
	// UbuMaths specifics
	ubumark: true,
	mathRenderer: 'mathlive'
};
```

---

## Fichiers modifiés/créés

### Phase 1 (terminée ✅)

| Fichier                               | Statut  | Description                   |
| ------------------------------------- | ------- | ----------------------------- |
| `src/lib/slides/core/Deck.svelte`     | ✅ Créé | Wrapper principal reveal.js   |
| `src/lib/slides/core/Slide.svelte`    | ✅ Créé | Wrapper section               |
| `src/lib/slides/core/types.ts`        | ✅ Créé | Types TypeScript              |
| `src/lib/slides/core/config.ts`       | ✅ Créé | Configuration défaut          |
| `src/lib/slides/core/context.ts`      | ✅ Créé | Clé contexte Svelte           |
| `src/lib/slides/index.ts`             | ✅ Créé | Exports publics               |
| `src/routes/slides/+layout@.svelte`   | ✅ Créé | Layout isolé (sans dashboard) |
| `src/routes/slides/demo/+page.svelte` | ✅ Créé | Page démo fonctionnelle       |

### Phase 2 (terminée ✅)

| Fichier                                   | Statut     | Description                |
| ----------------------------------------- | ---------- | -------------------------- |
| `src/lib/slides/core/UbuMarkSlide.svelte` | ✅ Créé    | Slide avec contenu UbuMark |
| `src/lib/slides/index.ts`                 | ✅ Modifié | Export UbuMarkSlide        |
| `src/routes/slides/demo/+page.ts`         | ✅ Créé    | Désactive SSR              |
| `src/routes/slides/demo/+page.svelte`     | ✅ Modifié | Démo avec UbuMarkSlide     |

### Phase 3 (terminée ✅)

| Fichier                                    | Statut     | Description                 |
| ------------------------------------------ | ---------- | --------------------------- |
| `src/lib/slides/core/QuestionSlide.svelte` | ✅ Créé    | Slide avec question         |
| `src/lib/slides/index.ts`                  | ✅ Modifié | Export QuestionSlide        |
| `src/routes/slides/demo/+page.svelte`      | ✅ Modifié | Démo avec exemples question |

### Phase 4 (terminée ✅)

| Fichier                                                   | Statut     | Description                  |
| --------------------------------------------------------- | ---------- | ---------------------------- |
| `src/lib/whiteboard/components/PageRenderer.svelte`       | ✅ Créé    | Rendu lecture seule Page     |
| `src/lib/slides/components/SlideAnnotationLayer.svelte`   | ✅ Créé    | Layer annotations autonome   |
| `src/lib/slides/components/SlideAnnotationToolbar.svelte` | ✅ Créé    | Barre d'outils flottante     |
| `src/lib/slides/core/WhiteboardSlide.svelte`              | ✅ Créé    | Slide whiteboard avec annot. |
| `src/lib/slides/index.ts`                                 | ✅ Modifié | Export WhiteboardSlide       |
| `src/routes/slides/demo/+page.svelte`                     | ✅ Modifié | Démo avec exemple whiteboard |

---

## Risques identifiés

| Risque                             | Impact | Mitigation                   |
| ---------------------------------- | ------ | ---------------------------- |
| Conflit CSS reveal.js / Tailwind   | Moyen  | Scoper les styles reveal     |
| Performance whiteboard dans slides | Élevé  | Lazy loading, virtualisation |
| Complexité sync realtime           | Moyen  | Commencer simple, itérer     |

---

## Ressources

- Documentation reveal.js : `extern/reveal.js/reveal.md`
- UbuMark : `src/lib/ubumark/`
- Whiteboard : `src/lib/whiteboard/`
- Questions : `src/lib/components/questions/`
- Supabase Realtime : `docs/claude/realtime.md`

---

## Prochaines actions

1. ~~**Créer structure fichiers** Phase 1~~ ✅
2. ~~**Installer reveal.js** via pnpm~~ ✅
3. ~~**Implémenter Deck.svelte**~~ ✅
4. ~~**Implémenter Slide.svelte**~~ ✅
5. ~~**Créer page démo** fonctionnelle~~ ✅
6. ~~**Implémenter UbuMarkSlide.svelte**~~ ✅
7. ~~**Support formules math et variables**~~ ✅

8. ~~**Implémenter QuestionSlide.svelte**~~ ✅
9. ~~**Support validation et feedback**~~ ✅

~~**Phase 4 - Plugin Whiteboard**~~ : ✅ TERMINÉE

**Phase 5 - Plugin Realtime** :

1. Créer canal Supabase dédié slides
2. Sync position slide (prof → élèves)
3. Sync annotations whiteboard (temps réel)
4. Collecte réponses élèves (questions)
5. Affichage résultats agrégés
