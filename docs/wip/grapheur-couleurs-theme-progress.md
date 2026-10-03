# Couleurs du grapheur : thème clair / sombre et daltonisme

**Branche** `feat/grapheur-couleurs-theme` · ouvert le 2026-10-03

## Le problème, mesuré

- Les courbes sont stockées en **hexadécimal figé** (`#be185d`), identique en clair et en sombre.
- Contraste sur le fond sombre du grapheur (`#1a1a2e`) : rose 2,83, marron 2,49 (< 3:1).
- Distinction pour un élève daltonien : écart minimal OKLab **0,015** (bleu = violet en
  deutéranopie). Sous ~0,02, deux couleurs se confondent.
- Les variables `--graph-*` lues par les composants ne sont **définies nulle part** : seules
  leurs valeurs de repli s'appliquent. `grapheur/export.ts` en recopie une partie à la main.

Huit couleurs ne peuvent pas être distinctes pour un daltonien sous contrainte de contraste
(8 → 0,045 ; 4 → 0,107). D'où le choix de 4 couleurs × 2 styles de trait.

## Décisions de David (2026-10-03)

| #   | Décision                                                                                        |
| --- | ----------------------------------------------------------------------------------------------- |
| 1b  | Export PNG/SVG **toujours en clair**                                                            |
| B   | 4 couleurs franches ; courbes 5 à 8 = mêmes couleurs en pointillés                              |
| 3a  | Périmètre : grapheur seul (constructions, figures ubumark : plus tard)                          |
| P1  | Palette « proposition 1 » : bleu, framboise, ocre, violet                                       |
| Q1a | Nuages de points : pas de forme de point distincte pour l'instant                               |
| Q2a | Une courbe stocke une **identité** (`curve-1`), pas un hexadécimal (risque de rollback accepté) |

Palette (contraste ≥ 4,5 sur chaque fond, même teinte dans les deux modes) :

| Identité  | Nom       | Clair (`#ffffff`) | Sombre (`#1a1a2e`) |
| --------- | --------- | ----------------- | ------------------ |
| `curve-1` | bleu      | `#017cb7`         | `#228bc7`          |
| `curve-2` | framboise | `#dd2779`         | `#ed3a86`          |
| `curve-3` | ocre      | `#b16203`         | `#c0701f`          |
| `curve-4` | violet    | `#8b55ef`         | `#9863fe`          |

Nuancier : https://claude.ai/artifact/5DsP7r5b1CSm1naMdeuc8B

## Spécification validée

1. Courbes 1 à 4 : bleu, framboise, ocre, violet, trait plein.
2. Courbes 5 à 8 : mêmes couleurs en pointillés.
3. Une place libérée est reprise par la courbe suivante.
4. Le mode change l'affichage, jamais la courbe enregistrée.
5. Le sélecteur propose les 4 couleurs dans la variante du mode courant.
6. L'export ne contient aucune `var(` : couleurs réelles du mode clair.
7. Migration des sauvegardes : **règle en attente de validation** (« la plus proche » crée des
   collisions : orange et marron → ocre, cyan → bleu ; proposition : par position dans
   l'ancienne palette).
8. 9ᵉ courbe : on recommence au bleu plein.
9. Un style choisi par l'élève est respecté.
10. Asymptotes, aire, points de tangence, info-bulles suivent la couleur dans les deux modes.
11. Test de contraste ≥ 4,5 lisant `app.css`.
12. Sauvegarde illisible : le grapheur s'ouvre quand même.

## Avancement

- [ ] Phase 1 — socle : tokens `app.css`, places, attribution, migration
- [ ] Phase 2 — rendu : composants, sélecteur, contrôle navigateur 4 combinaisons
- [ ] Phase 3 — export : rendu clair résolu, suppression du tableau en double
- [ ] `code-reviewer` · `check:incremental` · PR
