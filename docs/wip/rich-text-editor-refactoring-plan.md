# Plan de Refactoring : Unification RichTextEditor

> **Status** : En attente de validation
> **Date** : 2025-12-13
> **Objectif** : Fusionner `RichTextEditor.svelte` et `FormRichTextEditor.svelte` en un composant unique configurable

---

## Decisions actees

| Aspect         | Decision                                                  |
| -------------- | --------------------------------------------------------- |
| Math templates | Configurable par prop (`'full'` \| `'basic'` \| `'none'`) |
| Headings       | 6 niveaux partout                                         |
| Emoji UI       | Tabs (DropdownMenu)                                       |
| Insertion math | Custom Command (pas Insert HTML)                          |

---

## Phase 0 : Specification TDD

### Comportements proposes

#### Mode Form (defaut)

1. Le composant accepte `bind:value` (HTML) et `bind:jsonValue` (JSON optionnel)
2. Le contenu initial est charge depuis `value`
3. Les modifications mettent a jour `value` et `jsonValue` en temps reel
4. Pas de bouton "Envoyer" par defaut
5. Le contenu persiste (pas d'effacement automatique)

#### Mode Chat

1. Le composant accepte `onSend` callback
2. Le bouton "Envoyer" est visible
3. Cliquer sur "Envoyer" appelle `onSend(jsonContent)` et efface le contenu
4. Le contenu demarre vide

#### Features configurables

1. `mathTemplates="full"` affiche 9 templates math
2. `mathTemplates="basic"` affiche 4 templates math
3. `mathTemplates="none"` masque la section Formule
4. `showSendButton={true/false}` force l'affichage du bouton
5. `showClearButton={true/false}` controle le bouton Effacer
6. `minHeight` controle la hauteur minimum de l'editeur

#### Insertion Math

1. Les templates utilisent `editor.commands.insertMathInline(latex)`
2. La detection automatique `$$...$$` fonctionne
3. Le bouton "Bloc" utilise `editor.commands.insertMathBlock(latex)`

### Questions

- Les comportements ci-dessus sont-ils corrects ?
- Y a-t-il des cas d'usage manquants ?

---

## Phase 1 : Preparation (extraction code partage)

**Agent** : `frontend-developer` (Sonnet)
**Risque** : Faible - pas de modification des composants existants

### Taches

1. Creer `src/lib/components/rich-text/config.ts`
   - `TEXT_COLORS` : palette unifiee (8 couleurs avec noms)
   - `HIGHLIGHT_COLORS` : palette surlignage (7 couleurs)
   - `EMOJI_CATEGORIES` : 8 categories (version fusionnee)
   - `MATH_TEMPLATES_FULL` : 9 templates
   - `MATH_TEMPLATES_BASIC` : 4 templates

2. Creer `src/lib/components/rich-text/editor-config.ts`
   - `createEditorExtensions()` : factory pour les extensions TipTap
   - `getEditorProps()` : props par defaut de l'editeur

3. Creer `src/lib/components/rich-text/types.ts`
   - Interface `RichTextEditorProps`
   - Type `MathTemplateLevel`
   - Type `RichTextMode`

### Validation

- [ ] Les fichiers sont crees
- [ ] Les imports fonctionnent
- [ ] Aucune modification des composants existants

### Code Review

**Agent** : `code-reviewer` (Sonnet)

### Commit

Direct : `git commit -m "refactor(rich-text): extract shared config and types"`

### Documentation progression

Mettre a jour ce fichier avec le status de la phase.

---

## Phase 2 : Creation du composant unifie

**Agent** : `frontend-developer` (Opus)
**Risque** : Moyen - nouveau composant, pas de migration

### Taches

1. Creer `src/lib/components/rich-text/RichTextEditorUnified.svelte`
   - Importer depuis config.ts, editor-config.ts, types.ts
   - Implementer mode `form` et mode `chat`
   - Toolbar unifie avec DropdownMenu (style RichTextEditor)
   - Support des props configurables
   - Utiliser Custom Command pour insertion math

2. Props interface :
   ```typescript
   interface Props {
   	mode?: 'chat' | 'form';
   	value?: string;
   	jsonValue?: unknown;
   	onSend?: (content: unknown) => void;
   	mathTemplates?: 'full' | 'basic' | 'none';
   	showSendButton?: boolean;
   	showClearButton?: boolean;
   	minHeight?: string;
   	disabled?: boolean;
   }
   ```

### Tests unitaires

**Agent** : `test-automator` (Sonnet)

- Test mode form : binding bidirectionnel
- Test mode chat : callback onSend + clear
- Test mathTemplates : nombre de boutons affiches
- Test showSendButton : presence/absence du bouton

### Validation

- [ ] Composant cree
- [ ] Tests passent (`pnpm test:client RichTextEditorUnified`)
- [ ] Mode form fonctionne (binding)
- [ ] Mode chat fonctionne (callback + clear)

### Code Review

**Agent** : `code-reviewer` (Opus)

### Commit

**Agent** : `commit-manager` (Sonnet) - changement significatif multi-fichiers

### Documentation progression

Mettre a jour ce fichier.

---

## Phase 3 : Migration des usages

**Agent** : `frontend-developer` (Sonnet)
**Risque** : Eleve - modification de composants en production

### Ordre de migration (risque croissant)

#### 3.1 Demo pages

- `src/routes/(public)/demo/rich-text-editor-demo/+page.svelte`

#### 3.2 RiddleForm

- `src/lib/components/riddles/RiddleForm.svelte`
- Props : `bind:value={statement}`, `bind:value={correction}`

#### 3.3 QuestionTemplateForm

- `src/lib/components/QuestionTemplateForm.svelte`
- Note : lazy loading a conserver

#### 3.4 Messages compose

- `src/routes/(protected)/messages/compose/+page.svelte`
- Props : `bind:value={content}`, `bind:jsonValue={contentJson}`

#### 3.5 ChatComposer (le plus risque)

- `src/lib/components/chat/ChatComposer.svelte`
- Props : `mode="chat"`, `onSend={handleSend}`

### Pour chaque migration

1. Mettre a jour l'import
2. Adapter les props
3. Verifier manuellement le fonctionnement
4. Documenter dans ce fichier

### Validation

- [ ] Toutes les migrations effectuees
- [ ] Tests existants passent
- [ ] Verification manuelle de chaque usage

### Code Review

**Agent** : `code-reviewer` (Opus)

### Commit

**Agent** : `commit-manager` (Sonnet)

### Documentation progression

Lister chaque migration completee dans ce fichier.

---

## Phase 4 : Cleanup

**Agent** : `frontend-developer` (Sonnet)
**Risque** : Faible - suppression de code mort

### Taches

1. Renommer `RichTextEditorUnified.svelte` -> `RichTextEditor.svelte`
2. Supprimer l'ancien `RichTextEditor.svelte` (backup git)
3. Supprimer `FormRichTextEditor.svelte`
4. Mettre a jour les re-exports si necessaire
5. Mettre a jour `src/lib/components/rich-text/README.md`

### Validation

- [ ] Un seul composant RichTextEditor existe
- [ ] Pas d'imports casses
- [ ] Documentation a jour

### Code Review

**Agent** : `code-reviewer` (Sonnet)

### Commit

Direct : `git commit -m "refactor(rich-text): remove legacy components"`

---

## Phase 5 : Quality Checks (FIN DU PLAN)

### Verification finale

```bash
pnpm check          # TypeScript
pnpm lint           # ESLint
pnpm test:unit -- --run  # Tests unitaires
pnpm build          # Build production
```

### Criteres de succes

- [ ] 0 erreurs TypeScript
- [ ] 0 erreurs ESLint
- [ ] Tous les tests passent
- [ ] Build reussit

### Commit final (si corrections)

Direct ou `commit-manager` selon complexite

### Documentation finale

- Mettre a jour `docs/claude/ui-components.md` si necessaire
- Archiver ce fichier dans `docs/archive/` ou supprimer

---

## Fichiers impliques

### A creer

- `src/lib/components/rich-text/config.ts`
- `src/lib/components/rich-text/editor-config.ts`
- `src/lib/components/rich-text/types.ts`
- `src/lib/components/rich-text/RichTextEditorUnified.svelte`

### A modifier

- `src/routes/(public)/demo/rich-text-editor-demo/+page.svelte`
- `src/lib/components/riddles/RiddleForm.svelte`
- `src/lib/components/QuestionTemplateForm.svelte`
- `src/routes/(protected)/messages/compose/+page.svelte`
- `src/lib/components/chat/ChatComposer.svelte`
- `src/lib/components/rich-text/README.md`

### A supprimer

- `src/lib/components/rich-text/RichTextEditor.svelte` (ancien)
- `src/lib/components/rich-text/FormRichTextEditor.svelte`

---

## Estimation

| Phase   | Complexite             |
| ------- | ---------------------- |
| Phase 0 | Validation utilisateur |
| Phase 1 | Simple                 |
| Phase 2 | Moyenne                |
| Phase 3 | Elevee (5 migrations)  |
| Phase 4 | Simple                 |
| Phase 5 | Verification           |
