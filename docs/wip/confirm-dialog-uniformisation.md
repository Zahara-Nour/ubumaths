# Uniformiser les confirmations — remplacer `confirm()` par `ConfirmDialog`

> **Créé le** : 2026-08-29 · **Statut** : à faire, non commencé
> **Origine** : la page Programme utilisait le `confirm()` natif pour supprimer un
> thème, un objectif ou un point. Corrigée (commit `495f81efb`) ; le reste de
> l'application ne l'est pas.

---

## Pourquoi

Le projet a son composant, `src/lib/components/ui/confirm-dialog/ConfirmDialog.svelte`,
déjà utilisé dans une dizaine de pages. Le `confirm()` du navigateur, lui :

- **ignore la charte** — police système, boutons OS, aucun rapport avec le reste ;
- **ne met rien en forme** — d'où les avertissements collés au titre par des `\n\n` ;
- **bloque le fil d'exécution**, ce qui fige toute animation en cours ;
- **n'est pas testable** — on ne peut ni le simuler ni vérifier son contenu ;
- **est supprimable par le navigateur** : Chrome le neutralise déjà dans les
  iframes cross-origin, et sa dépréciation revient régulièrement.

## Le patron cible

Le `confirm()` est synchrone, le dialogue ne l'est pas : le geste passe de un à
deux temps. Une fonction mémorise la cible et ouvre, une autre exécute.

```svelte
let confirmOpen = $state(false);
let pendingDelete = $state<{ id: string; name: string } | null>(null);

function askDelete(node: { id: string; name: string }) {
	pendingDelete = node;
	confirmOpen = true;
}

async function confirmDelete() {
	const target = pendingDelete;
	pendingDelete = null;
	if (!target) return;
	// … l'appel API
}
```

```svelte
<ConfirmDialog
	bind:open={confirmOpen}
	title={pendingDelete ? `Supprimer « ${pendingDelete.name} » ?` : ''}
	description={…}
	confirmLabel={lore.actions.delete}
	variant="destructive"
	onConfirm={confirmDelete}
	onCancel={() => (pendingDelete = null)}
/>
```

Exemple complet : `src/routes/(protected)/dashboard/teacher/programme/+page.svelte`.

**Profiter du passage** pour améliorer le message. Le `confirm()` ne pouvant rien
mettre en forme, ses textes disent en général « Êtes-vous sûr ? » là où le
dialogue peut dire ce que l'action emporte réellement — et c'est le seul intérêt
d'une confirmation.

## Inventaire — 35 fichiers, 39 appels

**Priorité haute — suppressions en cascade ou irréversibles**

| Fichier                                                                                  | n   |
| ---------------------------------------------------------------------------------------- | --- |
| `dashboard/admin/schools/[schoolId]/organisation/+page.svelte`                           | 2   |
| `dashboard/teacher/message-templates/+page.svelte`                                       | 2   |
| `dashboard/teacher/srs/decks/[id]/edit/+page.svelte`                                     | 2   |
| `dashboard/teacher/classes/+page.svelte`                                                 | 1   |
| `dashboard/teacher/contenu/enigmes/+page.svelte`                                         | 1   |
| `dashboard/teacher/contenu/notebooks/+page.svelte`                                       | 1   |
| `dashboard/teacher/evaluation-tasks/[id]/+page.svelte`                                   | 1   |
| `dashboard/teacher/srs/decks/+page.svelte`                                               | 1   |
| `dashboard/admin/message-templates/+page.svelte`                                         | 1   |
| `dashboard/admin/migration/[theme]/[domain]/[subdomain]/[globalIndex]/edit/+page.svelte` | 1   |
| `lib/components/exercises/ExerciseForm.svelte`                                           | 1   |
| `lib/components/QuestionTemplateForm.svelte`                                             | 1   |
| `lib/components/documents/DocumentCard.svelte`                                           | 1   |

**Priorité moyenne — actions sociales ou d'échange, visibles par les élèves**

| Fichier                                                                      | n        |
| ---------------------------------------------------------------------------- | -------- |
| `lib/components/marketplace/TradeNegotiationModal.svelte`                    | 2        |
| `lib/components/marketplace/MyTrades.svelte`                                 | 1        |
| `dashboard/student/marketplace/trade/[id]/+page.svelte`                      | 1        |
| `lib/components/FriendsList.svelte`                                          | 1        |
| `lib/components/FriendRequests.svelte`                                       | 1        |
| `messages/inbox` · `messages/drafts` · `messages/archived` · `messages/[id]` | 1 chacun |
| `lib/components/teacher/anti-fraud/AntiFraudFlagsList.svelte`                | 1        |

**Priorité basse — outils, perte de travail non persisté**

| Fichier                                                           | n        |
| ----------------------------------------------------------------- | -------- |
| `spreadsheet/+page.svelte` · `python-notebook/+page.svelte`       | 1 chacun |
| `constructions/+page.svelte` · `constructions/[id]/+page.svelte`  | 1 chacun |
| `games/minesweeper/multiplayer/+page.svelte`                      | 1        |
| `(public)/automaths/panier/+page.svelte`                          | 1        |
| `dashboard/revisions/decks/[id]/+page.svelte`                     | 1        |
| `dashboard/teacher/settings/google/+page.svelte`                  | 1        |
| `dashboard/teacher/assessments/[id]/assign/+page.svelte`          | 1        |
| `dashboard/teacher/contenu/enigmes/validations/[id]/+page.svelte` | 1        |
| `lib/components/test/TestCourse.svelte`                           | 1        |

## Méthode

Par lots de 4 ou 5 fichiers, un commit par lot — pas un gros commit de 35
fichiers, impossible à relire et à revenir en arrière proprement.

Après chaque fichier : `svelte-autofixer`, puis `pnpm check:incremental` en fin
de lot. Aucun test n'a à changer : le `confirm()` n'était de toute façon pas
testé, c'est précisément l'un des reproches.

## Garde-fou à poser à la fin

Une fois l'inventaire vidé, une règle de lint interdisant `confirm(`, `alert(`
et `prompt(` dans les `.svelte` empêchera la dette de revenir. Sans elle, le
prochain formulaire réintroduira le raccourci — c'est comme ça que ces 35
fichiers sont apparus.

## Vérifier l'inventaire

```bash
grep -rlP --include="*.svelte" "(?<![A-Za-z])confirm\(" src/routes src/lib/components | wc -l
```

Doit valoir 1 tant que la page Programme conserve le commentaire qui explique le
remplacement, et 0 une fois celui-ci retiré à la fin du chantier.
