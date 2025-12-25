# Patterns Responsive

Patterns courants pour le developpement responsive dans UbuMaths.

---

## Navigation

### Layout Dashboard

```svelte
<div class="flex min-h-screen">
	<!-- Hamburger mobile -->
	<div
		class="fixed top-0 left-0 z-40 flex h-16 w-full items-center gap-4 border-b bg-background px-4 md:hidden"
	>
		<Button variant="ghost" size="icon" onclick={() => (menuOpen = true)}>
			<Menu class="h-6 w-6" />
		</Button>
		<h1 class="text-lg font-semibold">Dashboard</h1>
	</div>

	<!-- Sidebar desktop -->
	<aside class="hidden w-64 shrink-0 border-r md:block">
		<nav class="p-4">
			<!-- Navigation items -->
		</nav>
	</aside>

	<!-- Contenu principal -->
	<main class="flex-1 pt-16 md:pt-0">
		<div class="p-4 md:p-6">
			<!-- Contenu -->
		</div>
	</main>

	<!-- Drawer mobile -->
	<MobileNavDrawer bind:open={menuOpen} items={navItems} />
</div>
```

### Header Responsive

```svelte
<header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
	<!-- Titre -->
	<div>
		<h1 class="text-xl font-bold sm:text-2xl">Titre de la Page</h1>
		<p class="text-sm text-muted-foreground">Description</p>
	</div>

	<!-- Actions -->
	<div class="flex flex-wrap items-center gap-2">
		<Button size="sm">
			<Plus class="h-4 w-4 sm:mr-2" />
			<span class="sr-only sm:not-sr-only">Ajouter</span>
		</Button>
		<Button variant="outline" size="sm">
			<Filter class="h-4 w-4 sm:mr-2" />
			<span class="sr-only sm:not-sr-only">Filtrer</span>
		</Button>
	</div>
</header>
```

---

## Grids

### Stats Cards

```svelte
<!-- Progression : 1 -> 2 -> 4 colonnes -->
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-4">
	<Card>
		<Card.Header class="pb-2">
			<Card.Title class="text-sm font-medium">Stat 1</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="text-2xl font-bold">42</div>
		</Card.Content>
	</Card>
	<!-- ... autres cards -->
</div>
```

### Content Grid

```svelte
<!-- Pour cartes de contenu (exercices, cours, etc.) -->
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
	{#each items as item}
		<ContentCard {item} />
	{/each}
</div>
```

### Two-Column Layout

```svelte
<!-- Desktop : 2 colonnes, Mobile : empile -->
<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
	<Card>Colonne 1</Card>
	<Card>Colonne 2</Card>
</div>
```

### Split Layout (60/40)

```svelte
<!-- Desktop only, mobile utilise un drawer -->
<div class="hidden h-full lg:flex">
	<div class="w-[60%] border-r">
		<!-- Contenu principal -->
	</div>
	<div class="w-[40%]">
		<!-- Panel lateral -->
	</div>
</div>

<!-- Mobile : tout en modal/drawer -->
<div class="lg:hidden">
	<!-- Version mobile -->
</div>
```

---

## Tables

### Table avec Colonnes Cachees

```svelte
<div class="overflow-x-auto rounded-lg border">
	<table class="w-full text-sm">
		<thead class="border-b bg-muted/50">
			<tr>
				<!-- Toujours visible -->
				<th class="px-2 py-2 text-left sm:px-4 sm:py-3">Nom</th>
				<th class="px-2 py-2 text-center sm:px-4 sm:py-3">Score</th>

				<!-- Cache sur mobile -->
				<th class="hidden px-2 py-2 text-center sm:table-cell sm:px-4 sm:py-3"> Date </th>
				<th class="hidden px-2 py-2 text-right sm:table-cell sm:px-4 sm:py-3"> Actions </th>
			</tr>
		</thead>
		<tbody>
			{#each items as item}
				<tr class="border-b">
					<td class="px-2 py-2 sm:px-4 sm:py-3">
						<span class="font-medium">{item.name}</span>
						<!-- Info secondaire visible seulement sur mobile -->
						<span class="block text-xs text-muted-foreground sm:hidden">
							{item.date}
						</span>
					</td>
					<td class="px-2 py-2 text-center sm:px-4 sm:py-3">{item.score}</td>
					<td class="hidden px-2 py-2 text-center sm:table-cell sm:px-4 sm:py-3">
						{item.date}
					</td>
					<td class="hidden px-2 py-2 text-right sm:table-cell sm:px-4 sm:py-3">
						<Button size="sm">Voir</Button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
```

### Table Scroll Horizontal

```svelte
<div class="overflow-x-auto">
	<table class="min-w-[600px]">
		<!-- Force une largeur minimum, scroll horizontal sur mobile -->
	</table>
</div>
```

---

## Tabs

### Tabs avec Wrap

```svelte
<Tabs.Root value={activeTab}>
	<Tabs.List class="flex h-auto w-full flex-wrap justify-start gap-1">
		{#each tabs as tab}
			<Tabs.Trigger value={tab.id} class="flex-shrink-0">
				{tab.label}
			</Tabs.Trigger>
		{/each}
	</Tabs.List>

	{#each tabs as tab}
		<Tabs.Content value={tab.id}>
			<!-- Contenu -->
		</Tabs.Content>
	{/each}
</Tabs.Root>
```

### Tabs Icon-Only Mobile

```svelte
<Tabs.List class="flex h-auto w-full flex-wrap justify-center gap-1">
	<Tabs.Trigger value="overview" class="flex items-center gap-1">
		<Eye class="h-4 w-4" />
		<span class="hidden sm:inline">Vue d'ensemble</span>
	</Tabs.Trigger>
	<Tabs.Trigger value="stats" class="flex items-center gap-1">
		<BarChart class="h-4 w-4" />
		<span class="hidden sm:inline">Statistiques</span>
	</Tabs.Trigger>
	<Tabs.Trigger value="settings" class="flex items-center gap-1">
		<Settings class="h-4 w-4" />
		<span class="hidden sm:inline">Parametres</span>
	</Tabs.Trigger>
</Tabs.List>
```

---

## Boutons

### Bouton Icon-Only Mobile

```svelte
<!-- Icone seule sur mobile, avec texte sur desktop -->
<Button>
	<Download class="h-4 w-4 sm:mr-2" />
	<span class="sr-only sm:not-sr-only">Telecharger</span>
</Button>
```

### Groupe de Boutons

```svelte
<!-- Wrap automatique sur mobile -->
<div class="flex flex-wrap items-center gap-2">
	<Button variant="outline" size="sm">Action 1</Button>
	<Button variant="outline" size="sm">Action 2</Button>
	<Button variant="outline" size="sm">Action 3</Button>
</div>
```

### Boutons Pleine Largeur Mobile

```svelte
<div class="flex flex-col gap-2 sm:flex-row">
	<Button class="w-full sm:w-auto">Confirmer</Button>
	<Button variant="outline" class="w-full sm:w-auto">Annuler</Button>
</div>
```

---

## Formulaires

### Filtres Responsifs

```svelte
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
	<div>
		<Label>Categorie</Label>
		<MySelect items={categories} />
	</div>
	<div>
		<Label>Niveau</Label>
		<MySelect items={levels} />
	</div>
	<div>
		<Label>Statut</Label>
		<MySelect items={statuses} />
	</div>
	<div class="flex items-end gap-2">
		<Button class="flex-1">Appliquer</Button>
		<Button variant="outline">Reset</Button>
	</div>
</div>
```

### Formulaire Stack/Inline

```svelte
<form class="space-y-4">
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<div>
			<Label for="firstname">Prenom</Label>
			<Input id="firstname" />
		</div>
		<div>
			<Label for="lastname">Nom</Label>
			<Input id="lastname" />
		</div>
	</div>

	<div>
		<Label for="email">Email</Label>
		<Input id="email" type="email" />
	</div>

	<div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
		<Button type="submit">Enregistrer</Button>
	</div>
</form>
```

---

## Modals et Dialogs

### Dialog Responsive

```svelte
<Dialog.Root>
	<Dialog.Content class="max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto sm:w-full">
		<Dialog.Header>
			<Dialog.Title>Titre</Dialog.Title>
		</Dialog.Header>

		<div class="p-4 sm:p-6">
			<!-- Contenu -->
		</div>

		<Dialog.Footer class="flex-col gap-2 sm:flex-row">
			<Button class="w-full sm:w-auto">Confirmer</Button>
			<Dialog.Close asChild>
				<Button variant="outline" class="w-full sm:w-auto">Annuler</Button>
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
```

### Modal Fullscreen Mobile

```svelte
<Dialog.Content
	class="fixed inset-0 h-screen max-h-none w-screen max-w-none
         sm:relative sm:inset-auto sm:h-auto sm:max-h-[90vh] sm:w-auto sm:max-w-lg"
>
	<!-- Plein ecran sur mobile, modal standard sur desktop -->
</Dialog.Content>
```

---

## Podium / Leaderboard

### Podium Responsive

```svelte
<div class="grid grid-cols-3 gap-2 sm:gap-4">
	<!-- 2eme place -->
	<div class="order-1 flex flex-col items-center">
		<div class="text-2xl sm:text-4xl">🥈</div>
		<Avatar class="h-10 w-10 sm:h-16 sm:w-16" />
		<p class="mt-1 line-clamp-1 text-xs sm:mt-2 sm:text-sm">{name}</p>
		<p class="text-base font-bold sm:text-lg">{score}</p>
	</div>

	<!-- 1ere place -->
	<div class="order-2 flex flex-col items-center">
		<div class="text-3xl sm:text-5xl">🥇</div>
		<Avatar class="h-14 w-14 sm:h-20 sm:w-20" />
		<p class="mt-1 line-clamp-1 text-sm font-bold sm:mt-2">{name}</p>
		<p class="text-xl font-bold sm:text-2xl">{score}</p>
	</div>

	<!-- 3eme place -->
	<div class="order-3 flex flex-col items-center">
		<div class="text-2xl sm:text-4xl">🥉</div>
		<Avatar class="h-10 w-10 sm:h-16 sm:w-16" />
		<p class="mt-1 line-clamp-1 text-xs sm:mt-2 sm:text-sm">{name}</p>
		<p class="text-base font-bold sm:text-lg">{score}</p>
	</div>
</div>
```

---

## Empty States

```svelte
<div class="flex flex-col items-center justify-center p-8 text-center">
	<FileQuestion class="h-12 w-12 text-muted-foreground sm:h-16 sm:w-16" />
	<h3 class="mt-4 text-lg font-semibold">Aucun resultat</h3>
	<p class="mt-2 max-w-sm text-sm text-muted-foreground">Description de l'etat vide</p>
	<Button class="mt-4">Action</Button>
</div>
```

---

## Voir Aussi

- [Index](./index.md)
- [Breakpoints](./breakpoints.md)
- [Composants](./components.md)
- [Checklist](./checklist.md)
