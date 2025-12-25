---
description: Analyser les problemes de performance potentiels
allowed-tools: Bash, Read, Grep, Glob, Task, TodoWrite
argument-hint: [fichier-ou-dossier-optionnel]
---

# Analyse Performance

Tu analyses le code pour identifier les problemes de performance potentiels.

## Phase 1 : Scope de l'Analyse

### Option A : Fichiers specifies

Analyser : `$1`

### Option B : Fichiers recemment modifies

```bash
git diff --name-only HEAD~10 | grep -E "\.(ts|svelte)$"
```

### Option C : Points chauds connus

- `src/routes/` - Pages et endpoints
- `src/lib/components/` - Composants reutilises
- `src/lib/stores/` - Stores globaux

---

## Phase 2 : Checklist Svelte

### Reactivite

```bash
# Chercher $effect qui modifie du state (boucles potentielles)
grep -rn "\$effect.*\$state\|setState\|\$effect.*=" src --include="*.svelte"
```

- [ ] Pas de `$effect` qui modifie directement du `$state` (boucle infinie)
- [ ] `$derived` utilise pour les valeurs calculees (pas `$effect`)
- [ ] Pas de calculs lourds dans le template (utiliser `$derived`)

### Exemple problematique :

```svelte
<!-- MAUVAIS : boucle infinie potentielle -->
<script>
  let count = $state(0);
  let doubled = $state(0);

  $effect(() => {
    doubled = count * 2; // Modifie state dans effect !
  });
</script>

<!-- BON -->
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

### Re-renders inutiles

- [ ] Les props sont stables (pas de nouveaux objets a chaque render)
- [ ] Les callbacks sont stables (pas de fonctions anonymes recreees)
- [ ] Les listes utilisent des keys stables

```svelte
<!-- MAUVAIS -->
{#each items as item}
  <Item data={item} onclick={() => handle(item)} />
{/each}

<!-- BON -->
{#each items as item (item.id)}
  <Item data={item} {item} onItemClick={handleClick} />
{/each}
```

---

## Phase 3 : Checklist Supabase/Database

### Requetes N+1

```bash
# Chercher des boucles avec des appels Supabase
grep -rn "for.*supabase\|forEach.*supabase\|map.*supabase" src --include="*.ts"
```

- [ ] Pas de requetes dans des boucles
- [ ] Utiliser `.in()` pour les requetes multiples

```typescript
// MAUVAIS : N+1
for (const id of ids) {
  const { data } = await supabase.from('users').select().eq('id', id);
}

// BON : 1 requete
const { data } = await supabase.from('users').select().in('id', ids);
```

### SELECT optimise

```bash
# Chercher SELECT * implicites
grep -rn "\.select()" src --include="*.ts" | grep -v "\.select('"
```

- [ ] Toujours specifier les colonnes : `.select('id, name, email')`
- [ ] Pas de `select('*')` sauf si toutes les colonnes sont necessaires

### Pagination

```bash
# Chercher les requetes sans limite
grep -rn "\.from(" src/routes --include="*.ts" -A5 | grep -v "\.limit\|\.range"
```

- [ ] Toutes les listes ont une limite (`.limit(100)`)
- [ ] Pagination implementee pour les grandes listes

### Index

- [ ] Les colonnes filtrees frequemment ont des index
- [ ] Les FK ont des index
- [ ] Pas de full table scan sur les grandes tables

---

## Phase 4 : Checklist Bundle/Loading

### Imports dynamiques

```bash
# Chercher les gros imports statiques
grep -rn "^import.*from" src/routes --include="*.svelte" | head -50
```

- [ ] Composants lourds charges dynamiquement
- [ ] Libraries lourdes importees uniquement si necessaires

```svelte
<!-- Import dynamique pour composant lourd -->
{#await import('$lib/components/HeavyChart.svelte') then { default: HeavyChart }}
  <HeavyChart {data} />
{/await}
```

### Images

- [ ] Images optimisees (WebP, AVIF)
- [ ] Lazy loading sur les images hors viewport
- [ ] Tailles appropriees (pas de 4K pour une thumbnail)

### Preloading

- [ ] `data-sveltekit-preload-data` sur les liens frequents
- [ ] Preload des donnees critiques dans `+page.server.ts`

---

## Phase 5 : Checklist SSR/Hydration

### Load functions

```bash
# Chercher les load functions
grep -rn "export.*load" src/routes --include="*.ts" -l
```

- [ ] Pas de waterfalls dans les load functions
- [ ] Donnees parallelisees avec `Promise.all`

```typescript
// MAUVAIS : waterfall
export async function load() {
  const users = await getUsers();
  const posts = await getPosts(); // Attend users
  return { users, posts };
}

// BON : parallel
export async function load() {
  const [users, posts] = await Promise.all([
    getUsers(),
    getPosts()
  ]);
  return { users, posts };
}
```

### Hydration

- [ ] Pas de mismatch SSR/client
- [ ] `$effect` ne cause pas de flash de contenu

---

## Phase 6 : Outils de Mesure

### Bundle size

```bash
pnpm build
# Regarder la sortie pour les chunks volumineux
```

### Lighthouse (manuel)

1. Ouvrir l'app en production/preview
2. DevTools > Lighthouse
3. Analyser les metriques

### Supabase Query Performance

Dans le dashboard Supabase :
- Database > Query Performance
- Identifier les requetes lentes

---

## Phase 7 : Rapport

### Format du rapport

```markdown
# Rapport Performance - [DATE]

## Resume
- Problemes critiques : X
- Problemes moyens : X
- Suggestions : X

## Problemes Critiques

### [Probleme 1]
- **Fichier** : path/to/file.ts:123
- **Impact** : [Lent/Bloquant/Memoire]
- **Cause** : [Description]
- **Solution** : [Comment corriger]

## Problemes Moyens

### [Probleme 2]
- ...

## Metriques (si disponibles)
- Build size : X KB
- Largest chunk : X KB
- Requete la plus lente : X ms

## Recommandations
1. [Action prioritaire]
2. [Action secondaire]
```

---

## Regles

1. Mesurer AVANT d'optimiser
2. Optimiser les problemes reels, pas les problemes theoriques
3. Les micro-optimisations sont rarement necessaires
4. La lisibilite > performance (sauf hotpath prouve)
5. Documenter les optimisations non-evidentes
