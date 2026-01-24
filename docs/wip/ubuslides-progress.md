# UbuSlides - Documentation de progression

> **Statut** : 🟢 Phase 2 terminée - Prêt pour Phase 3 (Questions)
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

### Phase 3 : Plugin Questions

**Objectif** : Questions interactives dans les slides

**Livrables** :

- [ ] Plugin `questions` pour reveal.js
- [ ] `QuestionSlide.svelte`
- [ ] Intégration types de questions existants
- [ ] Validation réponses
- [ ] Feedback visuel

**Dépendances** :

- Composants questions existants (`src/lib/components/questions/`)
- Système de variables UbuMark

---

### Phase 4 : Plugin Whiteboard

**Objectif** : Pages whiteboard comme slides

**Livrables** :

- [ ] Plugin `whiteboard` pour reveal.js
- [ ] `WhiteboardSlide.svelte`
- [ ] Mode lecture (affichage)
- [ ] Mode édition (dessin live)
- [ ] Synchronisation avec store whiteboard

**Dépendances** :

- Whiteboard existant (`src/lib/whiteboard/`)
- Canvas rendering

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

**Phase 3 - Plugin Questions** :

1. Analyser composants questions existants
2. Créer `QuestionSlide.svelte`
3. Intégrer types de questions (QCM, numérique, etc.)
4. Validation réponses
5. Feedback visuel
6. Tests et validation
