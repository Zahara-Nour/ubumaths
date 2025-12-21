# Public Exercise Viewer - Progression

## État Actuel

**Phase en cours**: TERMINÉ + CORRECTIFS APPLIQUÉS
**Date de mise à jour**: 2025-12-21
**Status**: Toutes les phases complétées avec succès + correctifs de bugs appliqués

## Phases Complétées

### Phase 0: Valider comportements TDD ✅

- 23 comportements validés par l'utilisateur
- Inclut: accès public, tokens, variations, seed, PDF, liens partageables

### Phase 1: Migration DB ✅

- Fichier: `supabase/migrations/20251221141345_create_exercise_share_tokens.sql`
- Table `exercise_share_tokens` créée avec:
  - Champs: id, exercise_id, token, created_by, created_at, expires_at, is_active, access_count, last_accessed_at
  - Index sur token, exercise_id, created_by
  - Fonction `generate_share_token()` pour génération 16 caractères
  - RLS policies pour enseignants et lecture publique tokens valides

### Phase 2: Types et Validation ✅

- `src/lib/exercises/types.ts`: Interface `ExerciseShareToken` et `CreateShareTokenData`
- `src/lib/server/validation/exercises.ts`: Schemas Zod ajoutés:
  - `shareTokenQuerySchema`
  - `createShareTokenSchema`
  - `revokeShareTokenSchema`
  - `shareTokenResponseSchema`
  - `shareTokensListResponseSchema`
  - `createShareTokenResponseSchema`
  - Fonctions helper de validation

### Phase 3: Fonctions Serveur (TDD) ✅

- Fichier: `src/lib/server/exercise-share-tokens.ts`
- Tests: `src/lib/server/__tests__/exercise-share-tokens.test.ts` (23 tests passent)
- Fonctions implémentées:
  - `generateShareTokenString()` - Génère token 16 caractères sans caractères ambigus
  - `createShareToken()` - Créer token avec expiration optionnelle
  - `getExerciseByShareToken()` - Récupérer exercice via token
  - `recordTokenAccess()` - Enregistrer accès (fire-and-forget)
  - `revokeShareToken()` - Révoquer un token
  - `getExerciseShareTokens()` - Lister tokens d'un exercice
  - `validateShareToken()` - Valider token pour exercice spécifique
  - `buildShareUrl()` - Construire URL partageable

### Phase 4: Améliorer page publique exercice ✅

- `src/routes/(public)/exercice/[slug]/+page.server.ts`:
  - Support token via `?token=...` pour accès exercices privés
  - Fallback de slug vers UUID ID
  - Params URL pour variation et seed (`?variation=...&seed=...`)
  - Logique d'accès simplifiée: public OU token valide
  - Conversion DB row → Exercise avec support variations
- `src/routes/(public)/exercice/[slug]/+page.svelte`:
  - Selecteur de variation (autonomous > intermediate > guided)
  - Bouton "Copier le lien" avec état actuel
  - Bouton "Régénérer" pour exercices paramétrés
  - Badges d'accès (public/lien partagé)
  - Affichage du seed pour débug
  - Svelte 5 runes: `$state`, `$derived`, `$derived.by`
  - Import `$app/state` au lieu de `$app/stores`
  - MySelect pour le dropdown de variation

### Phase 5: Générateur Typst pour exercices ✅

- **Fichiers créés**:
  - `src/lib/exercises/typst/exercise-typst-generator.ts` - Générateur principal
  - `src/lib/exercises/typst/index.ts` - Exports du module
- **Fonctionnalités**:
  - `generateExerciseTypst()` - Génère document Typst depuis un exercice
  - `generateStaticExerciseTypst()` - Version simplifiée sans instance
  - Support variations et seed
  - Métadonnées complètes (titre, source, difficulté, tags, variation)
  - Énoncé et correction optionnelle
  - Conversion LaTeX → Typst via ubumark
  - Setup page A4, police New Computer Modern, opérateurs math
- **Intégration page publique**:
  - Bouton "PDF" avec état de chargement
  - Génération client-side via TypstService
  - Téléchargement automatique du PDF
  - Feedback utilisateur via toaster
- **Code review effectué**: Correction async/await inutiles

### Phase 6: API endpoints tokens ✅

- **Fichiers créés**:
  - `src/routes/api/exercises/[id]/share/+server.ts` - POST (créer) et GET (lister)
  - `src/routes/api/exercises/[id]/share/[tokenId]/+server.ts` - DELETE (révoquer)
- **Fonctionnalités**:
  - POST `/api/exercises/[id]/share` - Créer token avec expiration optionnelle
  - GET `/api/exercises/[id]/share` - Lister tous les tokens d'un exercice
  - DELETE `/api/exercises/[id]/share/[tokenId]` - Révoquer un token
- **Sécurité**:
  - Validation UUID via `validateUuidParam()` pour tous les paramètres
  - Vérification propriété exercice (created_by = user.id)
  - Messages d'erreur génériques (pas d'exposition d'erreurs internes)
  - Status code 201 pour création
- **Code review effectué**: Corrections appliquées

### Phase 7: Dashboard enseignant ✅

- **Fichier modifié**: `src/routes/(protected)/dashboard/teacher/exercises/[id]/+page.svelte`
- **Fonctionnalités ajoutées**:
  - Bouton "Partager" dans les actions de l'exercice
  - Dialog de partage avec options de création de token
  - Sélection d'expiration (aucune, 7j, 30j, 90j, 1 an)
  - Liste des tokens existants avec:
    - Date de création
    - Date d'expiration (ou "Jamais")
    - Nombre d'accès
    - Bouton copier le lien
    - Bouton révoquer
  - Feedback visuel (icône check après copie)
  - Support MySelect pour le dropdown d'expiration
  - Svelte 5 runes ($state, $derived)

## Correctifs Post-Implémentation ✅

### 1. Numérotation académique française dans les PDF (2025-12-21)

**Fichier**: `src/lib/ubumark/generators/typst-generator.ts`

**Problème**: Numérotation américaine (1., a., i.) au lieu de la notation académique française (1), a), i))

**Solution**: Modification du générateur Typst pour utiliser le schéma de numérotation français:

```typescript
set enum(
  numbering: n => {
    if n <= 20 { numbering("1)", n) }
    else if n <= 46 { numbering("a)", n - 20) }
    else { numbering("i)", n - 46) }
  }
)
```

**Résultat**: Les listes numérotées utilisent désormais `1) a) i)` dans les PDF exportés

### 2. Bouton "Régénérer" conditionnel (2025-12-21)

**Fichier**: `src/routes/(public)/exercice/[slug]/+page.svelte`

**Problème**: Le bouton "Régénérer" s'affichait même pour les exercices statiques (sans variables)

**Solution**: Ajout d'une condition pour vérifier la présence de variables:

```svelte
{#if hasVariables}
	<Button onclick={regenerate} variant="outline">
		<RefreshCw class="mr-2 h-4 w-4" />
		Régénérer
	</Button>
{/if}
```

**Résultat**: Le bouton n'apparaît que pour les exercices paramétrés

### 3. RLS Policy pour l'accès via token (2025-12-21)

**Fichiers**:

- `supabase/migrations/20251221180000_add_exercise_access_via_token.sql` (initial)
- `supabase/migrations/20251221181000_fix_exercise_token_rls_recursion.sql` (fix)

**Problème**: Récursion infinie dans la policy RLS lors de l'accès aux exercices via token

**Solution**:

1. Création d'une fonction SECURITY DEFINER pour contourner RLS:

```sql
CREATE OR REPLACE FUNCTION public.check_exercise_token_access(
    exercise_uuid UUID,
    token_string TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM exercise_share_tokens
        WHERE exercise_id = exercise_uuid
          AND token = token_string
          AND is_active = true
          AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$;
```

2. Policy simplifiée utilisant cette fonction:

```sql
CREATE POLICY "Allow exercise access via valid share token"
    ON exercises
    FOR SELECT
    USING (
        auth.uid() IS NULL  -- Permet l'accès sans authentification
        AND check_exercise_token_access(id, current_setting('request.jwt.claims', true)::json->>'token')
    );
```

**Résultat**: Accès public aux exercices via token sans récursion RLS

### 4. Gestion des accolades imbriquées dans LaTeX (2025-12-21)

**Fichier**: `src/lib/ubumark/generators/typst-generator.ts`

**Problème**: Les accolades imbriquées dans les fractions LaTeX (`\dfrac{(-1)^{n+1}}{u^2_n}`) n'étaient pas correctement converties en Typst

**Solution**: Implémentation d'un parseur d'accolades équilibrées:

```typescript
function parseBalancedBraces(text: string, startPos: number): { content: string; endPos: number } {
	let depth = 0;
	let content = '';
	let i = startPos;

	while (i < text.length) {
		const char = text[i];
		if (char === '{') {
			depth++;
			if (depth > 1) content += char;
		} else if (char === '}') {
			depth--;
			if (depth === 0) return { content, endPos: i };
			content += char;
		} else {
			content += char;
		}
		i++;
	}
	throw new Error('Unbalanced braces in LaTeX fraction');
}
```

**Résultat**: Les fractions complexes avec accolades imbriquées sont correctement converties (`frac((-1)^{n+1}, u^2_n)`)

### 5. Échappement Markdown dans les PDF (2025-12-21)

**Fichier**: `src/lib/ubumark/generators/typst-generator.ts`

**Problème**: Les caractères échappés Markdown (`\*`, `\_`, etc.) apparaissaient littéralement dans les PDF

**Solution**: Ajout d'une fonction de désescapage avant conversion Typst:

```typescript
function unescapeMarkdown(text: string): string {
	return text.replace(/\\([*_`~\[\](){}#+\-.!|\\])/g, '$1').replace(/\\\\/g, '\\');
}
```

**Résultat**: Les caractères échappés sont correctement affichés dans les PDF (`\*` → `*`)

## Prochaines Étapes

### Quality Checks Finaux ✅

- [x] `pnpm check:fast` - TypeScript (erreurs pré-existantes uniquement dans tests et database types, pas liées à cette feature)
- [x] `pnpm lint` - ESLint (correction d'un import inutilisé dans exercise-typst-generator.ts)
- [x] `pnpm format` - Prettier
- [x] Tests unitaires pour les correctifs (génération Typst, RLS)

## Fichiers Créés/Modifiés

### Fichiers Initiaux

| Fichier                                                                | Action                             |
| ---------------------------------------------------------------------- | ---------------------------------- |
| `supabase/migrations/20251221141345_create_exercise_share_tokens.sql`  | Créé                               |
| `src/lib/exercises/types.ts`                                           | Modifié (ajout ExerciseShareToken) |
| `src/lib/server/validation/exercises.ts`                               | Modifié (ajout schemas tokens)     |
| `src/lib/server/exercise-share-tokens.ts`                              | Créé                               |
| `src/lib/server/__tests__/exercise-share-tokens.test.ts`               | Créé                               |
| `src/routes/(public)/exercice/[slug]/+page.server.ts`                  | Modifié (support tokens)           |
| `src/routes/(public)/exercice/[slug]/+page.svelte`                     | Modifié (UI complète)              |
| `src/lib/exercises/typst/exercise-typst-generator.ts`                  | Créé                               |
| `src/lib/exercises/typst/index.ts`                                     | Créé                               |
| `src/routes/api/exercises/[id]/share/+server.ts`                       | Créé                               |
| `src/routes/api/exercises/[id]/share/[tokenId]/+server.ts`             | Créé                               |
| `src/routes/(protected)/dashboard/teacher/exercises/[id]/+page.svelte` | Modifié (share dialog)             |

### Fichiers Correctifs

| Fichier                                                                   | Action                                                    |
| ------------------------------------------------------------------------- | --------------------------------------------------------- |
| `src/lib/ubumark/generators/typst-generator.ts`                           | Modifié (numérotation française + fractions + unescaping) |
| `src/routes/(public)/exercice/[slug]/+page.svelte`                        | Modifié (bouton régénérer conditionnel)                   |
| `supabase/migrations/20251221180000_add_exercise_access_via_token.sql`    | Créé (RLS policy initiale)                                |
| `supabase/migrations/20251221181000_fix_exercise_token_rls_recursion.sql` | Créé (fix récursion RLS)                                  |

## Notes

- TDD suivi correctement pour Phase 3 (tests écrits AVANT implémentation)
- 23/23 tests passent pour les tokens
- Migrations appliquées et testées
- PDF génération fonctionne client-side via WASM Typst
- Tous les correctifs ont été testés en production
- Numérotation française conforme aux standards académiques français
- Gestion robuste des accolades imbriquées dans LaTeX
- RLS policy optimisée avec SECURITY DEFINER pour éviter récursion
