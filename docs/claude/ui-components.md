# UI Components

Référence synthétique pour Claude : **composants UI obligatoires**, imports Shadcn-svelte, conventions Tailwind 4. Règles non négociables : [CLAUDE.md](../../CLAUDE.md#règles-de-code-non-négociables).

---

## MySelect — sélecteurs (OBLIGATOIRE)

**Règle n°2** : toujours `MySelect` — jamais `<select>` natif, jamais `import * as Select from '$lib/components/ui/select'`.

**Fichier** : `src/lib/components/MySelect.svelte` (construit sur Bits UI `Select`, SSR-compatible, touch-friendly 44 px).

### Props

| Prop                                                                         | Type                                                     | Défaut        | Notes                                    |
| ---------------------------------------------------------------------------- | -------------------------------------------------------- | ------------- | ---------------------------------------- |
| `type`                                                                       | `'single' \| 'multiple'`                                 | `'single'`    | Discriminant obligatoire pour `multiple` |
| `value`                                                                      | `string` (single) \| `string[]` (multiple)               | `$bindable`   | Bind ou callback                         |
| `items`                                                                      | `{ value: string; label: string; disabled?: boolean }[]` | —             | Requis                                   |
| `placeholder`                                                                | `string`                                                 | `'Select...'` |                                          |
| `variant`                                                                    | `'default' \| 'invisible'`                               | `'default'`   | `invisible` = sans bordure visible       |
| `fitContent`                                                                 | `boolean`                                                | `false`       | Largeur du trigger = label le plus large |
| `triggerClass`                                                               | `string`                                                 | —             | Remplace la classe calculée              |
| `onValueChange`                                                              | `(value) => void`                                        | —             | Callback à préférer                      |
| `onchange`                                                                   | `(value) => void`                                        | —             | Alias rétro-compatible                   |
| `disabled`, `required`, `name`, `id`, `open`, `onOpenChange`, `contentProps` | —                                                        | —             | Passés à Bits UI                         |

### Usages canoniques

```svelte
<!-- Single select with bind (most common) -->
<MySelect type="single" bind:value={grade} {items} placeholder="Sélectionner un niveau" />

<!-- Single select with callback -->
<MySelect type="single" bind:value={questionType} items={QUESTION_TYPES} />

<!-- Multiple select -->
<MySelect
	type="multiple"
	bind:value={selectedClassIds}
	{items}
	placeholder="Sélectionnez une ou plusieurs classes"
/>

<!-- Invisible variant (inline, no visible border) -->
<MySelect type="single" bind:value={tempRole} {items} placeholder="Rôle" variant="invisible" />

<!-- fitContent: trigger width matches widest label -->
<MySelect type="single" bind:value={mode} {items} fitContent />
```

Exemples réels : `AssessmentConfigForm.svelte` (single + triggerClass), `WorksheetAssignmentForm.svelte` (multiple), `src/routes/(protected)/dashboard/admin/users/+page.svelte` (variant invisible).

---

## MyCheckbox — cases à cocher (OBLIGATOIRE)

**Règle n°2** : toujours `MyCheckbox` — jamais `<input type="checkbox">` natif, jamais `import { Checkbox } from '$lib/components/ui/checkbox'` en direct.

**Fichier** : `src/lib/components/MyCheckbox.svelte` (wrapper Shadcn Checkbox + Label auto-connecté, touch-friendly 44 px).

### Props

| Prop                      | Type                                      | Défaut             | Notes                                     |
| ------------------------- | ----------------------------------------- | ------------------ | ----------------------------------------- |
| `checked`                 | `boolean`                                 | `$bindable(false)` | Bind                                      |
| `label`                   | `string`                                  | —                  | Texte du label (sinon snippet `children`) |
| `labelClass`              | `string`                                  | `''`               | Classes supplémentaires pour le Label     |
| `disabled`                | `boolean`                                 | `false`            |                                           |
| `required`                | `boolean`                                 | `false`            |                                           |
| `onCheckedChange`         | `(v: boolean \| 'indeterminate') => void` | —                  | Callback complet                          |
| `onchange`                | `(v: boolean) => void`                    | —                  | Alias simplifié (booléen seulement)       |
| `checkboxRef`, `labelRef` | `$bindable`                               | —                  | Refs DOM optionnelles                     |
| `children`                | snippet                                   | —                  | Rendu personnalisé du label               |

### Usages canoniques

```svelte
<!-- Basic labeled checkbox -->
<MyCheckbox bind:checked={shuffleTerms} label="Mélanger les termes (sommes)" />

<!-- Checkbox without bind, with callback -->
<MyCheckbox checked={soundEnabled} label="Son de fin" onchange={handleSoundChange} />

<!-- Indeterminate state (select-all pattern) -->
<MyCheckbox checked={allVisibleSelected} onCheckedChange={toggleSelectAll} />

<!-- Checkbox with custom label content (snippet) -->
<MyCheckbox bind:checked={agree}>
	J'accepte les <a href="/cgu">conditions</a>
</MyCheckbox>
```

Exemples réels : `DisplayOptionsEditor.svelte` (série de checkboxes), `ChecklistSection.svelte` (onCheckedChange sans bind), `PomodoroSettings.svelte` (onchange alias).

---

## Shadcn-svelte — inventaire et imports

**Emplacement** : `src/lib/components/ui/<composant>/`

**Règle d'import** : composants « simples » → import nommé ; composants « composés » (sous-parties) → import namespace `* as X`.

```svelte
<!-- Named import for atomic components -->
import {Button} from '$lib/components/ui/button'; import {Input} from '$lib/components/ui/input'; import
{Label} from '$lib/components/ui/label'; import {Badge} from '$lib/components/ui/badge'; import {Switch}
from '$lib/components/ui/switch'; import {Textarea} from '$lib/components/ui/textarea'; import {Separator}
from '$lib/components/ui/separator'; import {Skeleton} from '$lib/components/ui/skeleton'; import {Progress}
from '$lib/components/ui/progress';

<!-- Namespace import for compound components -->
import * as Card from '$lib/components/ui/card'; import * as Dialog from '$lib/components/ui/dialog';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu'; import * as Sheet from '$lib/components/ui/sheet';
import * as Tabs from '$lib/components/ui/tabs'; import * as Collapsible from '$lib/components/ui/collapsible';
import * as Avatar from '$lib/components/ui/avatar'; import * as Accordion from '$lib/components/ui/accordion';
```

**Composants disponibles** (dossiers dans `src/lib/components/ui/`) : accordion · alert · avatar · badge · breadcrumb · button · calendar · card · checkbox · collapsible · confirm-dialog · dialog · dropdown-menu · input · label · popover · progress · radio-group · scroll-area · separator · sheet · skeleton · slider · switch · table · tabs · textarea · tooltip.

### Snippets d'usage fréquents

```svelte
<!-- DropdownMenu with navigation link -->
<DropdownMenu.Item>
	<a href="/dashboard">Tableau de bord</a>
</DropdownMenu.Item>

<!-- Card compound -->
<Card.Root>
	<Card.Header><Card.Title>Titre</Card.Title></Card.Header>
	<Card.Content>…</Card.Content>
</Card.Root>

<!-- Dialog -->
<Dialog.Root bind:open>
	<Dialog.Trigger asChild let:builder>…</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header><Dialog.Title>…</Dialog.Title></Dialog.Header>
		…
	</Dialog.Content>
</Dialog.Root>
```

### ConfirmDialog (composant custom)

Boîte de confirmation réutilisable (titre + description + variante destructive).

```svelte
import ConfirmDialog from '$lib/components/ui/confirm-dialog/ConfirmDialog.svelte'; // ou : import {ConfirmDialog}
from '$lib/components/ui/confirm-dialog';

<ConfirmDialog
	bind:open={showConfirm}
	title="Supprimer ?"
	description="Cette action est irréversible."
	variant="destructive"
	onConfirm={handleDelete}
/>
```

---

## UserAvatar — avatars utilisateurs

Ne pas utiliser directement les primitives Shadcn Avatar. Utiliser **`UserAvatar`** :

```svelte
import UserAvatar from '$lib/components/UserAvatar.svelte';

<UserAvatar
  avatar_url={user.avatar_url}
  role={user.role}
  firstname={user.firstname}
  lastname={user.lastname}
  class="h-8 w-8"
  decorative={true}   <!-- set true when parent already provides a11y name -->
/>
```

`loading="lazy"` par défaut (évite les batchs 429 sur l'API Google avatars quand de nombreux avatars sont montés en même temps).

---

## Éditeur de texte riche

**Composant** : `src/lib/components/rich-text/RichTextEditor.svelte` — unifié form + chat.

```svelte
import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';

<!-- Form mode (default) — bidirectionnel via htmlValue -->
let content = $state('');
<RichTextEditor bind:htmlValue={content} />

<!-- Chat mode — send callback, vidage après envoi -->
<RichTextEditor mode="chat" onSend={(json) => handleSend(json)} enterToSend />
```

Props clés : `preset` (`'full'` par défaut), `toolbar`, `minHeight`, `maxHeight`, `disabled`, `imageUpload`, `onchange`.  
Pour l'affichage seul : `RichTextDisplay.svelte` (pas d'éditeur).

---

## Notifications toast

```svelte
import {toaster} from '$lib/stores/toaster.svelte'; toaster.success('Évaluation créée'); toaster.error('Erreur
lors de la sauvegarde'); toaster.warning('Aucun élève sélectionné'); toaster.info('Synchronisation en
cours…'); toaster.message('Message neutre'); // sans icône de statut
```

Wrapper sur `svelte-sonner`. Le Toaster est monté dans le layout racine.

---

## Thème & taille de police

```svelte
import {theme} from '$lib/stores/theme.svelte'; import {fontSize} from '$lib/stores/fontSize.svelte';
theme.toggle(); // bascule clair/sombre (via mode-watcher) theme.dark; // boolean réactif fontSize.increase();
// +12,5 % (max 150 %) fontSize.decrease(); // −12,5 % (min 75 %) fontSize.reset(); // 100 % fontSize.size;
// scale actuelle (0.75–1.5) fontSize.canIncrease; // boolean
```

La variable CSS `--font-scale` est appliquée sur `<html>`. Le scaling n'affecte que `<main>` via des règles `calc()` dans `app.css`.

---

## Tailwind 4 — conventions

- **Mobile-first** : classes sans préfixe = mobile ; `sm:` / `md:` / `lg:` pour les breakpoints supérieurs.
- **Tokens sémantiques** (ne pas hard-coder les couleurs) : `bg-background`, `text-foreground`, `border-border`, `bg-muted`, `text-muted-foreground`, `bg-card`, `text-card-foreground`, `bg-popover`, `bg-accent`, `text-accent-foreground`, `text-destructive`.
- **`cn()` pour les classes conditionnelles** :

```svelte
import {cn} from '$lib/utils';

<div class={cn('flex gap-2', isActive && 'bg-accent', className)}>…</div>
```

- **`prettier-plugin-tailwindcss`** est configuré : les classes sont triées automatiquement au `prettier --write`. Ne pas trier manuellement.
- Touch targets : les wrappers `MySelect` / `MyCheckbox` appliquent `min-height: 44px` via `@media (pointer: coarse)` — ne pas écraser cette règle.

---

> Voir aussi : [best-practices.md](best-practices.md) · [quality-standards.md](quality-standards.md) · [architecture.md](architecture.md).
