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

## Fait (2026-09-29, nuit) — vérificateur durci (revue de #531) + lots `n-fracdec`, `n-decomp`

Branche `feat/corrections-lots-fracdec-decomp`.

- Vérificateur : trou relié à l'égalité posée (`?` remplacé par la valeur trouvée, l'égalité doit
  tenir ; `? = réponse` seul refusé) ; choix de QCM nommé comme un nombre entier (« 3 » absent de
  « 13 » et de « 3,5 ») ; aléatoire entre accolades (`{{1..9}}`, `{{2|5}}`, `{{digits:2.1}}`,
  `{{-5..5;+-}}`) énuméré et compté dans le garde-fou ; hors calcul : restes `NaN` / `undefined`,
  égalités numériques de la prose ; plusieurs cases : chacune finit un calcul. Preuves rouges
  faites sur copie. Pilote 15/15 (125 995 tirages), r-inv 36/36 (133 645) : inchangés.
- Lot `n-fracdec` : 20 modèles, 20/20 (130 963 tirages), import SIMULATION 20/20, 0 publié.
  Cas mêlés : 322f3479, dd7db98e (fractions non décimales amplifiées) ; dd7db98e tire 1/5 ET 2/10
  (même valeur, indistinguables par une condition) → branche commune.
- Lot `n-decomp` : 13 modèles, 13/13 (55 793 tirages), import SIMULATION 13/13, **11 publiés**.
  accbfd16, 7c642d2f : chiffre des unités nommé `e` (constante d'Euler dans une condition).
- Briques communes : `scripts/corrections/lots/numeration.ts` (tableau de numération).

## Fait (2026-09-29) — vague 1 : calcul réfléchi (branche `feat/corrections-vague1`)

- Stratégies générées `lib/r-mental.ts` : R-COMPL, R-RANGPARRANG, R-RANG, R-DISTRIB, R-DIV-DIZ,
  R-XDIZ, R-PETIT-DIV, R-ECART, R-POSE (enregistrées dans `GENERATORS`). Lots `lots/vague1.ts`.
- `vague1-brouillons` : 2 modèles, 2/2 (4 536 tirages), import SIMULATION 2/2.
- `vague1-publies` : 33 modèles **publiés**, 33/33 (113 032 tirages), import SIMULATION 33/33 ;
  `docs/corrections/vague1-publies/RESUME.md` = un exemple rendu par stratégie, à relire.
- Écartés (7), aucune variable d'expression (départ du calcul invérifiable) : R-QUAD 56b2737d,
  b7cd1846, 3c79eb9c ; R-DOUBLE 022130ca, 47f97c9f ; R-DIV-DIZ 4ee04b22 ; R-COMPL 17a3c039.
- R-POSE (313 − 126) traité en écart par bonds, pas en calcul posé : à trancher.

## En attente

- Relecture de `docs/corrections/pilote/APERCU.md` par David (texte, couleurs, ton).
- Les 4 modèles R-PASS sont passés `published` en prod le 2026-09-29 à 18:05 (hors de cette
  session) : un import toucherait des modèles visibles des élèves.
- Relecture de `docs/corrections/r-inv/APERCU.md` par David, puis feu vert pour `--publier`.
- Relecture de `docs/corrections/n-fracdec/APERCU.md` et `n-decomp/APERCU.md` (11 modèles
  n-decomp sont `published` : un import toucherait des modèles visibles des élèves).
- Lots suivants : N-REL-ADD (dont les 4 trous + et − chez les relatifs), etc.
