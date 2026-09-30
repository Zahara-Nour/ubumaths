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

## Fait (2026-09-29) — vague 2 : lots `vague2-brouillons` (17) et `vague2-publies` (12)

Branche `feat/corrections-vague2`. Codes R-X10, R-DEC-RANG, N-COMPARER-ENT, N-COMPARER-DEC,
N-ESPACES, N-ZEROS, N-DIVEUCL (15ed5af4). Vérificateur 17/17 (89 281 tirages) et 12/12
(69 250) ; import SIMULATION 17/17 et 12/12. Résumé : `docs/corrections/vague2-publies/RESUME.md`.
Écartés (le vérificateur exige un calcul `align` parti d'une variable d'expression ou d'une
égalité à un seul « ? ») : N-POSITION ×8, N-ENCADR ×4, N-DIVISEUR, N-GRADUATION (images),
14a51794 (deux « ? »). Pièges : `expression` interdit dans une condition ; `mod(n,1000)` lu
comme décimal, `mod` sur un entier > 2^31 refusé → `round(n-1000*floor(n/1000))`.

## Fait (2026-09-29) — vague 4 (branche `feat/corrections-vague4`)

- Vérificateur (`lib/verify.ts`), chemin LITTÉRAL : un membre avec des lettres est comparé au suivant
  par `areEquivalent` ; départ littéral = expression posée convertie en LaTeX, ou (sans variable
  d'expression) l'unique bloc `$$…$$` de l'énoncé s'il n'a ni `=` ni inconnue ; fin littérale =
  équivalente à la réponse de la case ; plusieurs cases : une case peut être donnée en prose par
  `n = valeur` (valeur exacte). Chemin numérique inchangé. Preuves rouges sur copie : 7 contrôles.
  Lots importés re-vérifiés : pilote 15/15, r-inv 36/36, n-fracdec 20/20, n-decomp 13/13 (mêmes tirages).
- Lot `vague4-brouillons` (25 `draft`) : 19/25 (353 871 tirages), import SIMULATION 19/25.
  Lot `vague4-publies` (3 `published`) : 1/3 (1af7263e), import SIMULATION 1/3.
  Un exemple rendu par code : `docs/corrections/vague4-publies/RESUME.md`.
- Lots séparés pour l'import tout-ou-rien : `vague4-brouillons` = 19 verts, `vague4-publies` = 1af7263e ;
  les 8 rouges sont dans `CLOTURE` (lots/vague4.ts), propositions dans `docs/corrections/vague4-cloture/`.
- Encore rouges : opposé (aeb86af9, 843c3186, 34e569e7 : l'opération est dans la phrase, le calcul
  part de −A) ; facteur commun (294c4316, e66089e0 : la réponse n'est pas la fin d'un calcul) ;
  traduire une phrase (5d515eb1, 78feafed : aucun bloc posé) ; racine affine (2bdb3db6 : chaîne
  d'équations). Coïncidence numérique relevée : 294c4316 passe quand b − c = 1 (a × 1 = a).
- Piège : un `|` (`\left| … \right|`) hors accolades est lu comme un choix aléatoire par le
  résolveur de correction → l'envelopper dans un groupe `{\left| … \right|}`.

## Fait (2026-09-30) — clôture (branche `feat/corrections-cloture`)

- Liste calculée en prod (lecture seule) : modèles R / N du classement sans aucune correction = **40**.
- Vérificateur (`lib/verify.ts`) : égalité posée avec unités (convertisseur du projet, `2[km] = ?[m]`,
  aussi lue en LaTeX dans l'énoncé `2~\unit{m^3} = ?~\unit{L}`) ; plusieurs trous dans une relation
  (`? < d < ?`, `8 = (3 × ?) + ?` : relation vraie une fois remplie, calcul qui COMMENCE par un nombre
  de la relation) ; contrôles structurels DÉCLARÉS par le lot (`LotEntry.checks`, `StructuralChecks`) :
  `posed` (opération de la phrase, nombres de l'énoncé ou constantes déclarées, `operand` pour une
  troncature), `transform` (opposé / inverse), `end: factor`, `equations: affine-root`,
  `hole: denominator`, `digit` (tableau de numération relu), `written`. Plafond des variations d'une
  proposition : 150 (c31c9d95 en compte 126). Preuves rouges sur copie : 12 neutralisations.
- Lots `cloture-brouillons` (23) et `cloture-publies` (15) ; écartés : d6268317 (image), 64e55fc7
  (unité au choix, `\unit` refusé par MathLive) — `LEFT_OUT` dans `lots/cloture.ts`.

## Fait (2026-09-30) — retouches ciblées (branche `fix/retouches-modeles`)

- `pnpm corrections:retouches` (`scripts/corrections/retouches.ts`, retouches dans `lib/retouches.ts`,
  instantané `docs/corrections/retouches/_modeles.json`) : SIMULATION 18/18 prêtes (checkTemplate +
  vérificateur verts), `--publier` JAMAIS lancé. Sauvegarde prévue : `data/migration-output/backups/retouches-<date>.json`.
- Appliquées : `e` renommée (accbfd16, 7c642d2f → `u` ; 13d52989 → `n`), dd7db98e (2/10 retiré),
  160f782d et 58f7a8dd (réponse sans terme nul), 33b1b496 (r ≠ p, v1-2), ff8082bd (`b` retirée),
  07bce646 (retitré « Opérations sur les limites »), 7 titres R-DEC-RANG (espace finale), 14a51794 et
  bd21a9d7 (`\;` retirés).
- Écartées : 294c4316 (`c` premier avec `b` : diviseurs de a = diviseurs communs, règle déjà juste) ;
  579d0b00, ed5f5f52 (la description inclut les unités, spec « 7996 + 8 »).
- Reste : accbfd16 / 7c642d2f écrivent toujours le chiffre des unités sans branche (un 0 d'unités reste
  orange) — le rendre « branchable » changerait le rendu, à trancher.
