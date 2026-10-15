---
couvre:
  - 'src/lib/components/ui/**'
  - 'src/lib/components/{MySelect,MyCheckbox,UserAvatar}.svelte'
  - 'src/lib/components/navigation/BackLink.svelte'
  - 'src/lib/navigation/return-links.ts'
  - 'src/lib/components/rich-text/{RichTextEditor,RichTextDisplay}.svelte'
  - 'src/lib/stores/{toaster,theme,fontSize}.svelte.ts'
---

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

Exemples réels : `ScheduleEntryModal.svelte` (single + triggerClass), `WorksheetAssignmentForm.svelte` (multiple), `src/routes/(protected)/dashboard/admin/users/+page.svelte` (variant invisible).

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

## BackLink — bouton retour (OBLIGATOIRE)

Règle tranchée par David le 2026-10-11. **Fichier** : `src/lib/components/navigation/BackLink.svelte`.

**Quand le mettre**

- **Pas de bouton retour** sur une page qu'on ouvre depuis la navigation principale (barre latérale, menu mobile) ou depuis un onglet de rubrique (`GroupedRouteLayout` : Contenu, Gamification, Modération) : la navigation joue déjà ce rôle.
- **Un `BackLink`** sur toute page qu'on ouvre depuis une autre page : détail (`[id]`), création ou modification (`new`, `edit`), résultats, affectation, sous-page (archive, classement…).
- **Page-carrefour** (une liste, un outil, une rubrique) : **pas de bouton retour**, même quand on y arrive par une carte de l'accueil ou du tableau de bord admin — c'est un point d'entrée. Le retour est pour ses sous-pages.
- **Page où l'élève est en pleine activité** (test, révision, fiche en cours, combat) : `kind="quit"`, libellé « Quitter ». Le mot dit qu'on interrompt l'activité ; la destination reste la page parente.
- **Fil d'Ariane** : seulement pour les arborescences de plus de deux niveaux (migration admin), et **jamais** avec un `BackLink` sur la même page.
- **Hors règle** : les boutons de fin de parcours (« Retour au panier » sur l'écran de résultats, « Retour au menu » après une partie) sont des actions, pas des boutons retour — ils restent où ils sont. La page d'erreur garde « Page précédente » : elle n'a pas de page parente connue.
- **Rubriques éditoriales** (le Shtam, le Cabinet Noir de Turingrad) : leur lien de retour typographié (« ← Le Shtam ») est gardé. Il respecte le fond de la règle — vrai lien vers la page parente, au-dessus du titre, qui dit où il mène ; seul le style diffère, par choix.

**Où** : en haut de la page, **au-dessus du `h1`**, sur sa propre ligne. Le titre reste aligné avec le contenu et rien ne déborde sur mobile.

**Où il mène** : à la **page parente, lue dans l'adresse de la page** — jamais `history.back()`, jamais `goto()` dans un `onclick`. Une page qui a deux parents possibles le dit dans son adresse : un exercice ouvert depuis une fiche porte `?fiche=<uuid>` (`worksheetReturnHref`, `src/lib/worksheets/exercise-edit-link.ts`) ; le journal d'un élève ouvert depuis l'accueil porte `?depuis=accueil`, une session de révision lancée depuis le Programme `?depuis=programme`, l'aperçu « vue élève » d'une affectation ouvert depuis un signalement `?depuis=signalement&signalement=<uuid>`, les copies par élève d'une affectation ouvertes depuis son aperçu `?depuis=apercu` (`src/lib/navigation/return-links.ts`, qui écrit le lien et le relit).

Pourquoi : la destination écrite dans le lien est la même après un lien partagé, dans un nouvel onglet ou après un rechargement, et le libellé peut l'annoncer avant le clic. Revenir là où on était, c'est le rôle du bouton retour du navigateur, que ce lien ne double pas.

**Libellé** : « Retour à… » / « Retour aux… » + la page parente. Jamais « Retour » seul, jamais une flèche seule.

**Modifications non enregistrées** : `confirmLeave="…"` demande confirmation avant de partir ; un refus annule la navigation, et le lien reste un vrai lien (pas de question sur un clic qui ouvre un nouvel onglet). Exemple : édition d'un deck SRS. **Quitter un contrôle noté** demande aussi confirmation : la tentative reste ouverte, les réponses tapées sont perdues et le chrono d'une course continue de tourner (`automathsQuitLink`). Pas de confirmation en entraînement.

**Garde** : `src/lib/__tests__/bouton-retour-sans-historique.test.ts` refuse tout `history.back()` hors de la page d'erreur.

```svelte
<div>
	<BackLink href="/dashboard/teacher/series" label="Retour aux séries" />
	<h1 class="text-3xl font-bold tracking-tight">Modifier la série</h1>
</div>

<!-- Page en pleine activité -->
<BackLink href="/automaths/panier" label="Quitter" kind="quit" />

<!-- Modifications non enregistrées -->
<BackLink
	href="/dashboard/teacher/srs/decks"
	label="Retour aux decks"
	confirmLeave={hasChanges ? 'Vous avez des modifications non sauvegardées. Quitter ?' : undefined}
/>
```

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
	<Dialog.Trigger>…</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header><Dialog.Title>…</Dialog.Title></Dialog.Header>
		…
	</Dialog.Content>
</Dialog.Root>
```

Les croix de `Dialog.Content` et de `Sheet.Content` sont nommées **« Fermer »** pour les lecteurs
d'écran (« Close » jusqu'au 2026-10-14, relevé par la revue a11y des réglages de l'atelier).

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

> Voir aussi : [best-practices.md](svelte-typescript.md) · [quality-standards.md](qualite.md) · [architecture.md](../systeme/architecture-generale.md).

Vérifié contre le code le 2026-10-10.
