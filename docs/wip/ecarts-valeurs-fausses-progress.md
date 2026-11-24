---
title: Valeurs fausses mathAST (V85, V92, V103) — journal
date: 2026-11-24
status: phase 0 validée ; correction en cours
---

## Reprendre ici

_Mis à jour le 2026-11-24, à l'ouverture du chantier._

- **État** : phase 0 validée par David (« je suis tes recos », 2026-11-24). Worktree créé, rien de corrigé.
- **Prochaine action** : cas frères ajoutés aux tests de preuve (rouges), correction par `mathast-expert`, revue `code-reviewer` en Opus, une seule PR.
- **En attente de David** : rien.
- **Pièges en cours** : sondes par le chemin de l'Atelier (`runInput`), jamais `pnpm math` ; les tests de `tests/ecarts/` ne tournent qu'avec `ECARTS_PREUVES=1 pnpm exec vitest run --project=ecarts` ; à la correction, le test de preuve quitte `tests/ecarts/` pour un test ordinaire à côté du code ; le registre (`docs/ecarts/registre.md`) se met à jour sur `main` après le merge.
- **Worktree / branche** : `ubumaths-wt-ecarts-valeurs-fausses` · `fix/ecarts-valeurs-fausses`.

---

Chantier fils de [ecarts-a-trier](ecarts-a-trier-progress.md).

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
