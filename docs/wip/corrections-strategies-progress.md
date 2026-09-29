# Corrections manquantes (mode « 2b ») — progression

Branche `feat/corrections-strategies`, worktree `ubumaths-wt-corrections`.

## Fait (2026-09-29) — lot pilote

- Convention de couleurs (3 rôles) + style maison : `docs/ref/corrections-redaction.md`.
- Outil `scripts/corrections/` : `corrections:generate | check | preview | import` (import en
  simulation par défaut, `--publier` JAMAIS lancé).
- Lot `pilote` = R-PASS (4) + N-SIGNES (11, dont les trous × et : 0b6d749f, a5d4c3ee) :
  `docs/corrections/pilote/` (instantané, 15 propositions, `APERCU.md`). Vérificateur : 15/15,
  1950 tirages.

## Fait (2026-09-29, soir) — outil durci + lot `r-inv` (branche `feat/corrections-lot-r-inv`)

- Revue de #527 : chaîne stricte (membre illisible = échec, `?` seulement en tête d'un trou et suivi de
  la réponse), départ = opération posée, domaine entier (≤ 20 000) ou 5 000 graines pour les branches
  et la vérification, `--publier` tout ou rien, choix de QCM échappé, instantanés sans `created_by`,
  R-PASS « diminuende rond » (30 − 6 = 20 + 10 − 6). Pilote re-vérifié : 15/15 (125 995 tirages).
- Constat en prod (lecture seule) : les 15 modèles du pilote ont été importés le 2026-09-29 à 18:58
  (hors de cette session), corrections identiques aux propositions, vertes au vérificateur durci.
- Lot `r-inv` : 36 modèles, `docs/corrections/r-inv/` (aperçu, instantané), 36/36 au vérificateur,
  import en SIMULATION 36/36 prêts. 27 des 36 sont `published`.

## En attente

- Relecture de `docs/corrections/pilote/APERCU.md` par David (texte, couleurs, ton).
- Les 4 modèles R-PASS sont passés `published` en prod le 2026-09-29 à 18:05 (hors de cette
  session) : un import toucherait des modèles visibles des élèves.
- Relecture de `docs/corrections/r-inv/APERCU.md` par David, puis feu vert pour `--publier`.
- Lots suivants : N-REL-ADD (dont les 4 trous + et − chez les relatifs), etc.
