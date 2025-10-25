# 🚀 Guide d'implémentation de features

Guide complet pour implémenter une nouvelle fonctionnalité dans UbuMaths.

---

## 📋 Checklist complète

Utilisez cette checklist pour vous assurer de ne rien oublier :

### Phase 1 : Planification

- [ ] Définir le besoin et les objectifs
- [ ] Identifier les users stories
- [ ] Créer des maquettes/wireframes (si UI)
- [ ] Valider avec l'équipe
- [ ] Créer une branche : `git checkout -b feat/feature-name`

### Phase 2 : Base de données

- [ ] Concevoir le schéma de tables
- [ ] Créer migration SQL dans `supabase/migrations/`
- [ ] Ajouter RLS policies
- [ ] Tester la migration : `pnpm db:migrate`
- [ ] Mettre à jour `src/lib/types/database.ts`
- [ ] Documenter dans `docs/architecture/database-schema.md`

### Phase 3 : Backend

- [ ] Créer types TypeScript dans `src/lib/types/`
- [ ] Créer utilities dans `src/lib/utils/feature-name/`
- [ ] Créer API endpoints si nécessaire (`src/routes/api/feature-name/`)
- [ ] Ajouter validation et error handling
- [ ] Écrire tests unitaires

### Phase 4 : Frontend

- [ ] Créer composants dans `src/lib/components/feature-name/`
- [ ] Créer pages dans `src/routes/(protected)/dashboard/feature-name/`
- [ ] Ajouter navigation (si nécessaire)
- [ ] Implémenter UI avec Shadcn-svelte
- [ ] Ajouter loading states et error handling
- [ ] Tester responsive design

### Phase 5 : Tests

- [ ] Tests unitaires (utils, parsers, generators)
- [ ] Tests d'intégration (API endpoints)
- [ ] Tests E2E (user flows)
- [ ] Vérifier coverage : `pnpm test:unit -- --coverage`

### Phase 6 : Documentation

- [ ] Créer dossier `docs/features/feature-name/`
- [ ] Copier template : `cp docs/contributing/feature-template.md docs/features/feature-name/README.md`
- [ ] Remplir README.md avec overview + roadmap
- [ ] Créer docs détaillées (architecture.md, api.md, etc.)
- [ ] Mettre à jour `docs/features/README.md`
- [ ] Mettre à jour `docs/README.md` (master index)

### Phase 7 : Code review & merge

- [ ] Formatter le code : `pnpm format`
- [ ] Vérifier types : `pnpm check`
- [ ] Vérifier liens doc : `pnpm docs:check-links`
- [ ] Créer PR avec description détaillée
- [ ] Faire code review
- [ ] Merger dans main

### Phase 8 : Déploiement

- [ ] Tester en staging (si applicable)
- [ ] Créer release : `pnpm release`
- [ ] Pousser tags : `git push --follow-tags origin main`
- [ ] Vérifier déploiement Vercel
- [ ] Monitorer erreurs dans dashboard admin

---

## 📁 Structure recommandée

### Pour une feature complète

```
projet/
├── src/
│   ├── lib/
│   │   ├── types/
│   │   │   └── feature-name.ts           # Types TypeScript
│   │   ├── utils/
│   │   │   └── feature-name/
│   │   │       ├── index.ts              # Exports publics
│   │   │       ├── parser.ts             # Parsing logic
│   │   │       ├── generator.ts          # Generation logic
│   │   │       ├── validator.ts          # Validation logic
│   │   │       ├── parser.test.ts        # Tests unitaires
│   │   │       └── generator.test.ts
│   │   ├── components/
│   │   │   └── feature-name/
│   │   │       ├── FeatureCard.svelte    # Composants
│   │   │       ├── FeatureForm.svelte
│   │   │       └── FeatureList.svelte
│   │   └── server/
│   │       └── feature-name.ts           # Server-only utils
│   │
│   └── routes/
│       ├── api/
│       │   └── feature-name/
│       │       ├── +server.ts            # API routes
│       │       └── [id]/
│       │           └── +server.ts
│       └── (protected)/
│           └── dashboard/
│               └── feature-name/
│                   ├── +page.svelte      # Page principale
│                   ├── +page.server.ts   # Load function
│                   ├── create/
│                   │   ├── +page.svelte
│                   │   └── +page.server.ts
│                   └── [id]/
│                       ├── +page.svelte
│                       └── +page.server.ts
│
├── supabase/
│   └── migrations/
│       └── 0XX_create_feature_name_tables.sql
│
├── docs/
│   └── features/
│       └── feature-name/
│           ├── README.md                 # Overview + roadmap
│           ├── architecture.md           # Détails techniques
│           ├── api.md                   # Documentation API
│           ├── user-guide.md            # Guide utilisateur
│           └── testing.md               # Tests
│
└── e2e/
    └── feature-name/
        ├── basic-flow.spec.ts            # Tests E2E
        └── advanced-flow.spec.ts
```

---

## 🎯 Patterns recommandés

### 1. Data fetching (SvelteKit load functions)

```typescript
// +page.server.ts
import type { PageServerLoad } from './$types';
import { requireAuth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();
	requireAuth(user);

	const { data, error } = await supabase.from('feature_table').select('*').eq('user_id', user.id);

	if (error) throw error;

	return {
		items: data
	};
};
```

### 2. Form actions (mutations)

```typescript
// +page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	create: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401, { message: 'Non autorisé' });

		const formData = await request.formData();
		const title = formData.get('title') as string;

		// Validation
		if (!title || title.length < 3) {
			return fail(400, { message: 'Titre trop court' });
		}

		// Insert
		const { error } = await supabase.from('feature_table').insert({ title, user_id: user.id });

		if (error) return fail(500, { message: error.message });

		return { success: true };
	}
};
```

### 3. Components Svelte 5

```svelte
<!-- FeatureCard.svelte -->
<script lang="ts">
	import type { Feature } from '$lib/types/feature-name';
	import { Button } from '$lib/components/ui/button';

	let {
		feature,
		onEdit,
		onDelete
	}: {
		feature: Feature;
		onEdit: (id: string) => void;
		onDelete: (id: string) => void;
	} = $props();

	function handleEdit() {
		onEdit(feature.id);
	}

	function handleDelete() {
		if (confirm('Êtes-vous sûr ?')) {
			onDelete(feature.id);
		}
	}
</script>

<div class="rounded-lg border p-4">
	<h3 class="text-lg font-semibold">{feature.title}</h3>
	<p class="text-muted-foreground">{feature.description}</p>

	<div class="mt-4 flex gap-2">
		<Button onclick={handleEdit}>Modifier</Button>
		<Button variant="destructive" onclick={handleDelete}>Supprimer</Button>
	</div>
</div>
```

### 4. Optimistic UI + Debouncing

Pour updates fréquentes (compteurs, likes, etc.) :

```typescript
let optimistic = $state<Record<string, number>>({});
let debounceTimer: ReturnType<typeof setTimeout>;

function handleUpdate(id: string, delta: number) {
	// Update optimiste immédiat
	optimistic[id] = (optimistic[id] || 0) + delta;

	// Debounce update serveur
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(async () => {
		try {
			await fetch(`/api/feature/${id}`, {
				method: 'PATCH',
				body: JSON.stringify({ value: optimistic[id] })
			});
			optimistic[id] = 0; // Reset
		} catch (error) {
			optimistic[id] = 0; // Rollback on error
			toaster.error('Erreur lors de la mise à jour');
		}
	}, 500);
}
```

---

## 🗄️ Base de données

### Migration SQL template

```sql
-- Create table
CREATE TABLE feature_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_feature_items_user_id ON feature_items(user_id);
CREATE INDEX idx_feature_items_status ON feature_items(status);

-- Enable RLS
ALTER TABLE feature_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own items"
  ON feature_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own items"
  ON feature_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items"
  ON feature_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items"
  ON feature_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all items
CREATE POLICY "Admins can view all items"
  ON feature_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feature_items_updated_at
  BEFORE UPDATE ON feature_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 🧪 Tests

### Test unitaire exemple

```typescript
// parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseFeature } from './parser';

describe('Feature Parser', () => {
	it('should parse valid input', () => {
		const input = 'valid input';
		const result = parseFeature(input);

		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
	});

	it('should reject invalid input', () => {
		const input = '';
		const result = parseFeature(input);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});
```

### Test E2E exemple

```typescript
// e2e/feature-name/basic-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user can create a new item', async ({ page }) => {
	// Login
	await page.goto('/login');
	await page.fill('[name="email"]', 'test@example.com');
	await page.fill('[name="password"]', 'password');
	await page.click('button[type="submit"]');

	// Navigate to feature
	await page.goto('/dashboard/feature-name');
	await expect(page.getByText('Feature Name')).toBeVisible();

	// Create item
	await page.click('text=Créer');
	await page.fill('[name="title"]', 'Test Item');
	await page.fill('[name="description"]', 'Test description');
	await page.click('button[type="submit"]');

	// Verify
	await expect(page.getByText('Test Item')).toBeVisible();
});
```

---

## 📚 Documentation

### Template README.md

Copier le template :

```bash
cp docs/contributing/feature-template.md docs/features/feature-name/README.md
```

Puis remplir les sections :

- Vue d'ensemble
- Quick start
- Architecture
- Examples
- Roadmap

### Mettre à jour les index

1. **`docs/features/README.md`** : Ajouter la feature à la liste
2. **`docs/README.md`** : Ajouter dans la section Features
3. **`CLAUDE.md`** : Ajouter lien si feature importante

---

## ✅ Qualité du code

### Avant commit

```bash
# Format code
pnpm format

# Check types
pnpm check

# Run tests
pnpm test:unit

# Check doc links
pnpm docs:check-links
```

### Code review checklist

- [ ] Code formaté (Prettier)
- [ ] Pas d'erreurs TypeScript
- [ ] Tests passent
- [ ] Documentation à jour
- [ ] Pas de console.log oubliés
- [ ] Error handling approprié
- [ ] Loading states implémentés
- [ ] Responsive design testé

---

## 🚀 Déploiement

### Process de release

```bash
# 1. Merger la PR dans main
git checkout main
git pull origin main

# 2. Créer release (auto bump version based on commits)
pnpm release

# 3. Push avec tags
git push --follow-tags origin main

# 4. Vercel déploie automatiquement
```

### Monitoring post-déploiement

- Vérifier dashboard admin : `/dashboard/admin/errors`
- Surveiller Vercel logs
- Tester la feature en production

---

## 💡 Tips

### Performance

- Utiliser `load` functions pour data fetching
- Implémenter optimistic UI pour feedback immédiat
- Debounce les updates serveur fréquentes
- Utiliser `use:enhance` pour progressive enhancement

### UX

- Toujours montrer loading states
- Error handling avec messages clairs
- Confirmation pour actions destructives
- Toast notifications pour feedback

### Accessibilité

- Semantic HTML
- ARIA labels si nécessaire
- Keyboard navigation
- Focus management

---

[← Retour au guide de contribution](README.md)
