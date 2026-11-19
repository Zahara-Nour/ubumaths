# Chantier « cote-hauteur » — cote de la hauteur d'une pyramide hors du solide

> Origine : n° 17 de [`outils-manquants.md`](../../wip/outils-manquants.md) (défaut visible en prod), relevé à la revue de #2400
> ([`tetraedre-vue`](tetraedre-vue-progress.md) § Revue). Ordre de David du 2026-11-06 : n° 17 d'abord.

## Reprendre ici

_Mis à jour le 2026-11-06, après #2427. **Chantier clos** (journal archivé)._

- **État** : #2427 mergée, pas encore en prod. Doc versée (`docs/systeme/ubumark.md` § Solide) ; ex-ligne 17 de
  `outils-manquants.md` en « Livré ».
- **Reste à David** : `pnpm deploy:prod`, puis la ligne #2427 de `verifications-manuelles.md`.
- **Revue** (`code-reviewer` Sonnet) : rien de bloquant ; repli sans place libre seulement pour `pyramide rectangle 1 4 1`.
- **Worktree / branche** : aucun (supprimés).

---

## Phase 0 (2026-11-06, tranchée par David)

Aperçu à trois colonnes (actuel / cote hors du solide avec traits de rappel / ligne de renvoi) sur carrée 6×9, 12×3,
4×12 et tétraèdre 4×3. **Choix : ligne de renvoi.** Rappels écartés : celui du pied traverse la base et se confond avec
[DC], et touche « C » en 12×3.

Comportements :

- Nominal : pyramide carrée, triangle (tétraèdre), rectangle avec `cotes:` → hauteur en tirets inchangée ; trait fin du
  milieu de la hauteur vers la droite, au-delà du sommet le plus à droite ; texte au bout.
- Limite : le texte ne touche ni un trait ni une étiquette, le renvoi ne traverse aucune étiquette (nom « C » en 12×3) →
  le bout monte ou descend (`LEADER_RISES`).
- Inchangé : prisme (cote au tiers de la hauteur, sur le trait), solides ronds, cotes des côtés ; sans `cotes:`, aucun
  renvoi.

## Fait

- `espace-solides.ts` : `side: 'renvoi'`, `leaderCote`, `SolideLine.thin`, `solideLineStroke` (épaisseur commune
  écran / PDF, utilisée par `Solide.svelte`, `SolideGeste.svelte`, `espace-typst.ts`).
- `cote-hauteur-pyramide.test.ts` : les 143 cas du modèle publié, 8 tétraèdres, 4 pyramides à base rectangle ; rouges
  sans le correctif (15 sur 16).
- Doc : `docs/systeme/ubumark.md` § Solide.

## Noté, hors périmètre

- Pyramide carrée très fine (`2 15`, dans les 143 cas du modèle) : la cote du côté « 2 cm » touche les noms A et B, déjà
  avant ce correctif.
