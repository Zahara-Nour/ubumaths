# Chantier lecture-grandeurs — des parseurs de mathAST cohérents avec le BIPM

## Reprendre ici

_Mis à jour le 2026-10-20, ouverture._

- **État** : phase 0. Corpus écrit : `docs/wip/lecture-grandeurs-corpus.md` (≈ 90 écritures, mesurées, 16 questions). Référence : `docs/ref/si/` (Brochure SI, 9e éd., v4.01). Périmètre : parseur MAISON seulement ; le LaTeX ensuite.
- **Prochaine action** : David tranche Q1-Q16 ; puis inventaire des `a/b[u]` déjà écrits (modèles publiés, `{{eval}}`, tests) avant tout code ; ADR de la règle.
- **En attente de David** : Q1-Q16 du corpus.
- **Pièges en cours** : `{2[h]}{30[min]}` vaut 1 h² (écriture produite par `;hms`) ; `π[m]` refusé, `pi` lu p × i ; refus de lecture en anglais.
- **Worktree / branche** : aucun (phase 0, docs sur `main`).

## Historique

### 2026-10-20 — ouverture

- Né de la PR 2 bis de `correction-cases-unite` : `1/2[m]` est lu 1/(2[m]) = 0,5 m⁻¹ par les deux parseurs,
  alors que `\frac{1}{2}\unit{m}` vaut 0,5 m et que l'atelier lit `1/2 m` = (1/2) m.
- Brochure SI téléchargée et relue (§3, §5.2, §5.4.1-5.4.7).
- Règle proposée : l'unité multiplie tout le terme de nombres qui la précède (règle de l'atelier,
  décisions des 2026-10-11 et 2026-10-18).
