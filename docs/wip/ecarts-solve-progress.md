# Chantier `ecarts-solve` — réponses fausses de mathAST/solve

## Reprendre ici

_Mis à jour le 2026-11-01, avant la PR._

- **État** : les 5 écarts (V13, L22, V45, V42, L27) corrigés et commités, doc à jour ; PR à ouvrir · **Prochaine action** : revue (Opus) et merge par la session principale ; ensuite archiver ce journal · **En attente de David** : rien · **Pièges en cours** : ne pas toucher `pedagogical-simplify/`, `simplify`, `tidy` (chantier `fusion-moteurs`) · **Worktree / branche** : `ubumaths-wt-ecarts-solve` / `fix/ecarts-solve`

## Journal

- 2026-11-01 : ouverture.
- 2026-11-01 : mesures avant correctif (sondes vitest temporaires, supprimées) — V13 : `x_1+1=3`,
  `e_1+1=3` → « non supporte » ; V42 : `\ln(x+a)=1` portait `approximate` = e ; L27 : `x^3-3x+1=0`
  trois racines arrondies `exact: true` ; V45 : `\frac{2\sqrt{x^5-x+1}}{\sqrt{x^5-x+1}}=x+4` → −2 ;
  L22 : seul `constantNames` (lecture de calcul) avait un effet observable (`e_1` non compté).
- Commits : V42 74c970077, L27 c017902d9, V45 526433bf7, V13+L22 e3f4f0147.
- Relevé, non corrigé : racines de cubique arrondies écrites en fraction géante (README mathAST,
  Points ouverts) ; lecteurs de `solve` qui ignorent `domainUnresolved` (reste de V45).
