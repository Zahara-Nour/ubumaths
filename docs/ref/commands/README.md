# Claude Code - Commandes Personnalisées

Guide technique des commandes slash disponibles pour le développement UbuMaths.

## Vue d'ensemble

Les commandes slash sont des workflows réutilisables stockés dans `.claude/commands/`. Elles automatisent les tâches récurrentes et garantissent le respect des standards du projet.

### Invocation

```bash
/nom-commande [arguments]
```

### Emplacement des fichiers

```
.claude/commands/
├── check.md          # Vérification complète
├── cleanup.md        # Nettoyage code
├── commit.md         # Commit structuré
├── db-sync.md        # Sync DB/types/docs
├── feature.md        # Workflow TDD
├── fix.md            # Correction bug
├── migration.md      # Migration Supabase
├── new-api.md        # Nouvel endpoint
├── new-component.md  # Nouveau composant
├── perf.md           # Analyse performance
├── pr.md             # Pull Request
├── security.md       # Audit sécurité
└── test.md           # Génération tests
```

---

## Commandes par Catégorie

### Développement

| Commande         | Arguments            | Description                                       |
| ---------------- | -------------------- | ------------------------------------------------- |
| `/feature`       | `[nom]`              | Workflow TDD complet pour nouvelle fonctionnalité |
| `/fix`           | `[description]`      | Correction de bug avec test de régression         |
| `/new-component` | `[NomComposant]`     | Créer un composant Svelte 5                       |
| `/new-api`       | `[chemin] [méthode]` | Créer un endpoint API                             |
| `/test`          | `[fichier]`          | Générer des tests                                 |

### Database

| Commande     | Arguments       | Description                    |
| ------------ | --------------- | ------------------------------ |
| `/migration` | `[description]` | Créer une migration Supabase   |
| `/db-sync`   | -               | Synchroniser schema/types/docs |

### Git

| Commande  | Arguments | Description                  |
| --------- | --------- | ---------------------------- |
| `/commit` | -         | Préparer un commit structuré |
| `/pr`     | -         | Créer une Pull Request       |

### Qualité

| Commande    | Arguments   | Description                       |
| ----------- | ----------- | --------------------------------- |
| `/check`    | -           | Vérification complète du codebase |
| `/cleanup`  | -           | Nettoyer code mort et imports     |
| `/security` | `[fichier]` | Audit sécurité OWASP              |
| `/perf`     | `[fichier]` | Analyse performance               |

---

## Référence Détaillée

### `/feature`

**Usage** : `/feature [nom-feature]`

Implémente une nouvelle fonctionnalité en suivant le workflow TDD collaboratif obligatoire.

#### Phases

1. **Spécification TDD** - Propose les comportements, attend validation
2. **Tests** - Écrit les tests (doivent échouer)
3. **Implémentation** - Code minimal pour faire passer les tests
4. **Vérification** - Tous les tests passent
5. **Code Review** - Agent `code-reviewer`
6. **Commit** - Message structuré

#### Exemple

```bash
/feature auth-google
```

```markdown
## Fonctionnalité : auth-google

### Comportements proposés :

**Cas nominaux :**

1. L'utilisateur peut se connecter avec Google OAuth
2. Le profil est créé automatiquement à la première connexion

**Cas limites :** 3. Si l'email existe déjà, lier le compte

**Cas d'erreur :** 4. Afficher erreur si OAuth échoue
```

---

### `/fix`

**Usage** : `/fix [description-bug]`

Corrige un bug avec une méthodologie structurée incluant un test de régression.

#### Phases

1. **Analyse** - Comprendre et reproduire le bug
2. **Test de régression** - Écrire un test qui échoue
3. **Correction** - Fix minimal
4. **Vérification** - Tests passent
5. **Code Review** - Validation
6. **Commit** - Avec référence au bug

#### Exemple

```bash
/fix "les utilisateurs perdent leur session après 5 minutes"
```

---

### `/new-component`

**Usage** : `/new-component [NomComposant]`

Crée un nouveau composant Svelte 5 conforme aux standards UbuMaths.

#### Structure générée

```
src/lib/components/[NomComposant]/
├── [NomComposant].svelte
└── __tests__/
    └── [NomComposant].svelte.test.ts
```

#### Standards appliqués

- Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`)
- TypeScript strict (pas de `any`)
- Props typées avec interface
- Handlers en lowercase (`onclick`)
- `{@render children()}` au lieu de `<slot />`

#### Exemple

```bash
/new-component UserCard
```

```svelte
<script lang="ts">
	interface Props {
		user: { name: string; avatar: string };
		onclick?: () => void;
	}

	let { user, onclick }: Props = $props();
</script>

<div class="rounded-lg p-4 shadow" {onclick}>
	<img src={user.avatar} alt={user.name} />
	<h3>{user.name}</h3>
</div>
```

---

### `/new-api`

**Usage** : `/new-api [chemin] [GET|POST|PUT|PATCH|DELETE]`

Crée un nouvel endpoint API avec validation Zod et tests.

#### Structure générée

```
src/routes/api/[chemin]/
├── +server.ts
└── __tests__/
    └── [chemin].test.ts
```

#### Standards appliqués

- Validation Zod obligatoire avec limites
- Vérification `locals.user` pour auth
- Gestion d'erreurs structurée
- Types inférés de Zod

#### Exemple

```bash
/new-api rewards/claim POST
```

```typescript
const requestSchema = z.object({
	rewardId: z.string().uuid(),
	quantity: z.number().int().positive().max(10)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Non authentifié');

	const validation = requestSchema.safeParse(await request.json());
	if (!validation.success) throw error(400, validation.error.issues[0].message);

	// ... logique métier
};
```

---

### `/migration`

**Usage** : `/migration [description]`

Crée une nouvelle migration Supabase avec le workflow complet.

#### Phases

1. **Création** - Fichier avec timestamp
2. **Écriture** - SQL avec RLS policies
3. **Validation** - Attente approbation utilisateur
4. **Post-migration** - Update types + docs

#### Format du fichier

```
supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

#### Exemple

```bash
/migration add-user-preferences
```

```sql
-- Migration: add-user-preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  theme TEXT DEFAULT 'light' NOT NULL,
  notifications BOOLEAN DEFAULT true NOT NULL
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
ON user_preferences FOR ALL
TO authenticated
USING (auth.uid() = user_id);
```

---

### `/commit`

**Usage** : `/commit`

Prépare un commit structuré avec message conventionnel.

#### Format du message

```
type(scope): description courte

[Corps optionnel]

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

#### Types disponibles

| Type       | Usage                   |
| ---------- | ----------------------- |
| `feat`     | Nouvelle fonctionnalité |
| `fix`      | Correction de bug       |
| `docs`     | Documentation           |
| `style`    | Formatage               |
| `refactor` | Refactoring             |
| `perf`     | Performance             |
| `test`     | Tests                   |
| `chore`    | Maintenance             |

#### Scopes UbuMaths

`auth`, `api`, `db`, `ui`, `components`, `shop`, `rewards`, `classroom`, `chat`

---

### `/pr`

**Usage** : `/pr`

Crée une Pull Request avec checks automatiques.

#### Pré-checks exécutés

1. `pnpm test:unit -- --run`
2. `pnpm lint`
3. `pnpm check:fast`
4. `pnpm build`

#### Template de PR

```markdown
## Summary

- Description des changements

## Changes

- [ ] Change 1
- [ ] Change 2

## Testing

- [ ] Tests unitaires
- [ ] Test manuel

## Checklist

- [ ] Code review
- [ ] Pas de `any`
- [ ] Documentation à jour
```

---

### `/check`

**Usage** : `/check`

Vérification et correction complète du codebase.

#### Phases

1. **Prettier** - `pnpm format`
2. **ESLint** - `pnpm lint --fix` + corrections manuelles
3. **TypeScript** - `pnpm check` + corrections
4. **Build** - `pnpm build` + corrections
5. **Warnings** - Analyse et correction
6. **Rapport** - `.claude/check-report.md`

#### Fichiers générés

- `.claude/lint-warnings.log`
- `.claude/check-warnings.log`
- `.claude/check-report.md`

---

### `/cleanup`

**Usage** : `/cleanup`

Nettoie le code mort et les éléments inutilisés.

#### Éléments ciblés

- Imports non utilisés
- Variables déclarées mais jamais lues
- Fonctions privées non appelées
- Console.log de debug
- Code commenté sans raison

#### Éléments préservés

- Fichiers de configuration
- Tests
- Documentation
- Fichiers `.claude/`

---

### `/security`

**Usage** : `/security [fichier-optionnel]`

Audit sécurité basé sur OWASP Top 10.

#### Checklist

| Catégorie     | Vérifications                     |
| ------------- | --------------------------------- |
| **Injection** | Validation Zod, pas de SQL concat |
| **Auth**      | `locals.user`, RLS policies       |
| **XSS**       | `{@html}` sanitized               |
| **Secrets**   | Pas de secrets dans le code       |
| **Data**      | Limites numériques, validation    |

#### Rapport généré

```markdown
## Problèmes Critiques

- [Fichier:ligne] - Description

## Problèmes Moyens

- ...

## Suggestions

- ...
```

---

### `/perf`

**Usage** : `/perf [fichier-optionnel]`

Analyse les problèmes de performance potentiels.

#### Checklist Svelte

- `$effect` qui modifie du state (boucles)
- Calculs lourds dans `$derived`
- Re-renders inutiles

#### Checklist Supabase

- Requêtes N+1
- SELECT sans colonnes spécifiques
- Pagination manquante

#### Checklist Bundle

- Imports dynamiques
- Images optimisées
- Preloading

---

### `/db-sync`

**Usage** : `/db-sync`

Synchronise le schéma DB avec les types TypeScript et la documentation.

#### Fichiers vérifiés

1. `supabase/migrations/` - Schéma source
2. `src/lib/types/database.ts` - Types TypeScript
3. `docs/architecture/database-schema.md` - Documentation

#### Commandes utiles

```bash
pnpm db:types          # Régénérer les types
pnpm db:migrate        # Appliquer migrations
```

---

### `/test`

**Usage** : `/test [chemin-fichier]`

Génère des tests pour un fichier ou composant spécifique.

#### Types de tests générés

| Type de fichier | Framework                        |
| --------------- | -------------------------------- |
| `*.svelte`      | vitest + @testing-library/svelte |
| `+server.ts`    | vitest                           |
| `*.ts` (lib)    | vitest                           |

#### Structure des tests

```typescript
describe('[Module]', () => {
	describe('[fonction]', () => {
		it('should [comportement] when [condition]', () => {
			// Arrange
			// Act
			// Assert
		});
	});
});
```

#### Cas couverts

- Cas nominaux
- Cas limites (empty, null, max)
- Cas d'erreur

---

## Créer une Nouvelle Commande

### Structure du fichier

```markdown
---
description: Description courte (affichée dans /help)
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
argument-hint: [arg1] [arg2]
---

# Titre

Instructions pour Claude...
```

### Frontmatter disponible

| Champ           | Description                          |
| --------------- | ------------------------------------ |
| `description`   | Description affichée dans `/help`    |
| `allowed-tools` | Outils autorisés pour cette commande |
| `argument-hint` | Aide visuelle pour les arguments     |
| `model`         | Modèle spécifique (optionnel)        |

### Variables

- `$1`, `$2`, ... - Arguments positionnels
- `!`\`commande\`` - Exécution bash inline

### Exemple

```markdown
---
description: Analyser un composant pour accessibilité
argument-hint: [composant.svelte]
---

# Audit Accessibilité : $1

Vérifie le fichier `$1` pour les problèmes d'accessibilité.

## Contexte

!`cat $1`

## Checklist

- [ ] ARIA labels
- [ ] Keyboard navigation
- [ ] Color contrast
```

---

## Bonnes Pratiques

### Quand utiliser quelle commande

| Situation                  | Commande             |
| -------------------------- | -------------------- |
| Nouvelle feature           | `/feature`           |
| Bug à corriger             | `/fix`               |
| Nouveau composant UI       | `/new-component`     |
| Nouvel endpoint API        | `/new-api`           |
| Changement base de données | `/migration`         |
| Avant de commiter          | `/commit`            |
| Avant de merger            | `/pr`                |
| Maintenance régulière      | `/check`, `/cleanup` |
| Avant déploiement          | `/security`, `/perf` |

### Workflow typique

```bash
# 1. Nouvelle feature
/feature user-preferences

# 2. Après validation des comportements, tests + implémentation...

# 3. Vérification qualité
/check

# 4. Commit
/commit

# 5. Pull Request
/pr
```

---

## Dépannage

### Commande non reconnue

Vérifier que le fichier existe dans `.claude/commands/`.

### Arguments non passés

Les arguments sont accessibles via `$1`, `$2`, etc. dans le fichier `.md`.

### Outils non autorisés

Ajouter les outils nécessaires dans le frontmatter `allowed-tools`.
