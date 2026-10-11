# Corrections manquantes — vague 3 (relatifs, fractions, unités, pourcentages)

Branche `feat/corrections-vague3`, worktree `ubumaths-wt-corr-vague3`. Fichier séparé de
`corrections-strategies-progress.md` (4 vagues en parallèle : pas de conflit de fusion).

## Fait (2026-09-29)

- Codes : N-REL-ADD (dont les 4 trous 24331791, 84755a7b, b1550840, 372d4f79), N-REL-SUB,
  N-COMPARER-REL, N-REL-DEF, N-OPPOSES, N-REL-ALG, N-FRAC-MULT, N-FRAC-ADD, N-INVERSE,
  N-UNITES(-VOL, -AIRE), N-POURCENT : 36 modèles classés.
- Statut prod (lecture seule) : **36 draft, 0 published** → lot `vague3-publies` vide
  (`docs/corrections/vague3-publies/RESUME.md` : un exemple rendu par code).
- Lot `vague3-brouillons` : 26 modèles, vérificateur 26/26 (62 949 tirages), import SIMULATION
  26/26 prêts. Briques : `scripts/corrections/lots/relatifs.ts` ; lot : `lots/vague3.ts`.
- Lot `vague3-unites` : 3 conversions (7a90fc45, 82748db8, b79d4cb7), propositions écrites mais
  **rouges** : le vérificateur ne lit pas une égalité posée avec unités (« 2[km] = ?[m] » →
  « égalité posée illisible »). Ne pas importer tant que le vérificateur ne sait pas.
- Écartés (`SKIPPED` dans `lots/vague3.ts`) : 4115768c (N-INVERSE, pas de variable
  d'expression), 355bd41a (énoncé LaTeX sans variable d'expression), c31c9d95 (126 variations >
  50 du format de proposition), 7d12a172 et 86b80159 (trou au dénominateur : aucun calcul à
  écrire, le vérificateur en exige un), b6269f1e et 64e55fc7 (unités dans l'égalité posée /
  la réponse).

## En attente

- Relecture de `docs/corrections/vague3-brouillons/APERCU.md` par David, puis feu vert `--publier`.
- Vérificateur : lire les grandeurs (unités) dans l'égalité posée — débloque 5 modèles d'unités.
