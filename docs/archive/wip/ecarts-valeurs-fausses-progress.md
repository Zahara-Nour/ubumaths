---
title: Valeurs fausses mathAST (V85, V92, V103) — journal
date: 2026-11-24
status: #3108 mergée ; écarts restants au registre
---

## Reprendre ici

_Mis à jour le 2026-11-24, après #3108._

- **État** : #3108 mergée : V85, V92, V103 corrigés et clos au registre ; L117 à L121, V124, V125 ajoutés (deux familles refusées, restes de la revue, décrits plus bas).
- **Prochaine action** : aucune ici ; la suite est dans [ecarts-a-trier](../../wip/ecarts-a-trier-progress.md). Journal archivé le 2026-11-27 : L117 à L121, V124 et V125 ont leur test de preuve (#3230).
- **En attente de David** : rien.
- **Pièges en cours** : `pnpm test:verifs` lancé sans serveur reste accroché après les tests : lancer `pnpm dev --port 5176 --strictPort` d'abord.
- **Worktree / branche** : aucun (retirés au merge de #3108).

---

Chantier fils de [ecarts-a-trier](../../wip/ecarts-a-trier-progress.md).

## Phase 0 (validée par David le 2026-11-24)

### V85 : ensemble de définition d'un quotient trigonométrique

Aujourd'hui, pour un dénominateur produit, seul le premier facteur compte : `1/(sin x cos x)` et `1/(sin x cos 2x)` rendent ℝ privé des kπ.

- Nominal : `1/(sin x cos x)` → ℝ privé des kπ/2 (comme `1/sin(2x)`, déjà juste).
- Limite : valeurs interdites qui ne se rangent pas en une famille → les deux familles écrites (`1/(sin x cos 2x)` → ℝ privé des kπ et des π/4 + kπ/2).
- Inchangé : `1/sin x`, `1/cos x`, `tan x`, `1/(x sin x)`.
- Erreur : zéros d'un facteur introuvables → refus (« Je ne sais pas encore déterminer ce domaine »), jamais un facteur ignoré.

### V92 : `x² − ab = 0`

Aujourd'hui : S = {√a √b ; −√a √b} si 4ab ⩾ 0, faux pour a = b = −1.

- Nominal : S = {√(ab) ; −√(ab)} si ab ⩾ 0. La racine d'un produit de lettres de signe inconnu n'est jamais découpée.
- Cas frères : `x² − 4ab = 0` → ±2√(ab) ; `x² − abc = 0` → ±√(abc).
- Inchangé : `x² − a = 0` → ±√a si a ⩾ 0 ; `x² − a²b = 0` → ±|a|√b ; avec des valeurs données (a = −1, b = −1) → {−1 ; 1}.
- Hors périmètre : V93 (condition non réduite sur une lettre grecque), racines peu lisibles.

### V103 : limite avec une lettre (décision du 2026-11-24 : ajouter la condition)

| Saisie            | Réponse attendue         |
| ----------------- | ------------------------ |
| `1/(x² + k)` en 0 | 1/k, pour k ≠ 0          |
| `1/(x + k)` en 0  | 1/k, pour k ≠ 0          |
| `ln(x + k)` en 0⁺ | ln k, pour k > 0         |
| `ln(x² + k)` en 0 | ln k, pour k > 0         |
| `√(x + k)` en 0⁺  | √k, pour k ⩾ 0           |
| `tan(x + k)` en 0 | tan k, pour k ≠ π/2 + nπ |

- Sans condition (vrai pour tout k) : `kx + 1` en 2 → 2k + 1 ; `1/(x² + k² + 1)` en 0 → 1/(k² + 1).
- `x/k` en 1 → 1/k sans condition (avec k = 0 l'expression tapée n'existe déjà pas).
- Acceptés au lieu d'être refusés : `x² + kx` en 0⁺ → 0 ; `x ln x + kx` en 0⁺ → 0 ; `(k² + 1)/x` en 0⁺ → +∞.
- Toujours refusé : `e^{kx}` en +∞ (discussion de signe « plus tard »).
- Erreur : condition sur k impossible à écrire → refus, jamais une réponse sans condition.

### Organisation

Une seule PR, cas frères compris. Code : `mathast-expert`. Revue : `code-reviewer` en Opus.

## Sonde du 2026-11-24 (avant correction, chemin de l'Atelier)

- `.domaine 1/(sin x cos x)` → ℝ ∖ {kπ} ; `1/(sin x cos 2x)` → ℝ ∖ {kπ} ; `1/sin(2x)` → ℝ ∖ {kπ/2} ; `1/sin x + 1/cos x`, `1/(sin x tan x)`, `tan x / sin x` → refus.
- `.résoudre x²−ab=0` → ±√a√b si 4ab ⩾ 0 ; `x²−4ab=0` → ±2√a√b si 16ab ⩾ 0 ; `x²−abc=0` → ±√a√b√c si 4abc ⩾ 0 ; `x²−a²b=0` → ±√b|a| si 4a²b ⩾ 0 ; `x²−a/b=0` → ±√(4a/b)/2 si 4a/b ⩾ 0.
- `.limite` : `1/(x²+k)` en 0 → 1/k ; `1/(x+k)` en 0 → 1/k ; `ln(x+k)` en 0⁺ → ln k ; `ln(x²+k)` en 0 → ln k ; `√(x+k)` en 0⁺ → √k ; `tan(x+k)` en 0 → tan k ; `x²+kx`, `x ln x+kx`, `(k²+1)/x` en 0⁺ et `e^{kx}` en +∞ → refus « peut dépendre du signe de k ».

## Décision du 2026-11-24 : deux familles de valeurs interdites

David (« je te suis ») : la PR livre le **refus** pour `1/(sin x cos 2x)` (deux familles) et `1/((x − 1) cos x)` (une famille plus un point), au lieu de l'écriture demandée en phase 0. Le moteur ne note qu'une famille (`PeriodicExclusion`), lue par une trentaine de modules : l'étendre est un chantier à part, avec sa phase 0. À entrer au registre comme lacune (plus une valeur fausse).

## Revue (code-reviewer, Opus) et suites

Corrigés dans la PR : `x² − πab = 0` (π, e dans le coefficient) ; `x² − a²bc = 0` (condition bc ⩾ 0) ; `x/(x² + k)` en 0 et `1/x − 1/(x² + k)` en 0⁺ (« pour k ≠ 0 ») ; un essai « pas de limite » ou d'un autre infini fait refuser.

Restes, justes mais à entrer au registre :

- `x² − a²bc = 0` avec a = 0 et bc < 0 : la solution 0 n'est pas annoncée (réponse incomplète).
- Valeur non simplifiée : `(x + k)/(x² + k)` en 0 → « k/k, pour k ≠ 0 ».
- `1/((x − π) sin x)` refusé alors que π est déjà un kπ.
- `x ln x + kx` en 0 (sans côté tapé) s'écrit x → 0 au lieu de 0⁺.
- Même lacune « première famille gardée » dans `intersect` / `union` de `domain/algebra.ts` (autres appelants) ; `normalize` découpe encore √(ab) hors du solveur du second degré.
- Refus à lever : `1/sin x + 1/cos x`, `tan x / sin x`, `x/(kx + x²)` en 0⁺.
