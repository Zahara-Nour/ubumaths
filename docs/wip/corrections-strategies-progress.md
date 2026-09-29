# Corrections manquantes (mode « 2b ») — progression

Branche `feat/corrections-strategies`, worktree `ubumaths-wt-corrections`.

## Fait (2026-09-29) — lot pilote

- Convention de couleurs (3 rôles) + style maison : `docs/ref/corrections-redaction.md`.
- Outil `scripts/corrections/` : `corrections:generate | check | preview | import` (import en
  simulation par défaut, `--publier` JAMAIS lancé).
- Lot `pilote` = R-PASS (4) + N-SIGNES (11, dont les trous × et : 0b6d749f, a5d4c3ee) :
  `docs/corrections/pilote/` (instantané, 15 propositions, `APERCU.md`). Vérificateur : 15/15,
  1950 tirages.

## En attente

- Relecture de `docs/corrections/pilote/APERCU.md` par David (texte, couleurs, ton).
- Les 4 modèles R-PASS sont passés `published` en prod le 2026-09-29 à 18:05 (hors de cette
  session) : un import toucherait des modèles visibles des élèves.
- Lots suivants : N-REL-ADD (dont les 4 trous + et − chez les relatifs), R-INV, etc.
