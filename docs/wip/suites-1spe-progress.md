---
title: Suites numériques 1re SPE — questions et escalier du bloc courbe
date: 2026-10-01
status: lots 0-5 faits ; 35 modèles neufs en brouillon (2026-10-01) ; relecture et publication par David
---

# Suites 1re SPE — point de reprise

## Commande de David (2026-10-01)

Compléter les questions sur les suites (1re SPE) : améliorer l'existant, ajouter des questions,
utiliser les représentations graphiques (bloc ```courbe).

Décisions (réponses de David, 2026-10-01) :

- Périmètre : TOUS les blocs A à I (géométriques, compléments arithmétiques, reconnaître, sens
  de variation, représentation graphique, récurrences variées, sommes, seuil/algorithmes,
  modélisation).
- **Escalier ajouté au bloc courbe d'abord** (lot 0, branche + PR), puis les questions.
- Modèles publiés défectueux : **corrigés en place** (variations ajoutées EN FIN de liste
  seulement — les indices de variation des tentatives existantes ne doivent pas bouger).
- Rangement : **un domaine par notion** dans le thème « Suites » (Suites géométriques, Sens de
  variation, Sommes, Représentation graphique, Seuil et algorithmes, Modélisation, Reconnaître
  une suite) à côté d'Apprivoiser / Suites arithmétiques / Limites.
- Option `termes` de l'escalier : ma recommandation, acceptée par le « ok » de David à la spec
  (à confirmer s'il préfère autre chose).
- Ordre : lot 0 → lot 1 (existant) → lots 2 à 5.

## Lot 0 — escalier dans le bloc ```courbe (branche `feat/courbe-escalier`)

```courbe
x: -1 ; 7
y: -1 ; 7
u(0) = 0.5 ; u(n+1) = 0.5*u(n)+3 pour n de 0 à 4   bleu   escalier termes
```

Repère (uₙ ; uₙ₊₁) : courbe de f (`u(n)` → x, trait foncé), droite y = x (pointillés gris),
escalier (couleur de la suite), réutilisant `computeCobwebPath` du grapheur.

Comportements :

- E1 nominal : courbe de f + y = x + escalier (u₀;0)→(u₀;u₁)→(u₁;u₁)→… , n1 − n0 marches.
- E2 pas de nuage de points pour une suite en escalier.
- E3 `termes` : rappels pointillés verticaux vers l'axe des abscisses + étiquettes u₀, u₁…
  (une étiquette trop proche d'une précédente est omise — convergence).
- E4 escalier hors fenêtre : coupé au bord, avertissement prof.
- E5 `escalier` sur une suite explicite → erreur située.
- E6 relation dépendant de n → erreur située.
- E7 escalier + nuage dans le même bloc → erreur (repères incompatibles). `termes` sans
  `escalier`, `escalier` sur une fonction → erreur.
- E8 même scène écran (SVG) et Typst ; compilation d'une fiche.
- E9 aria-label mentionne l'escalier. `nom=` nomme la courbe de f.

- [x] Tests rouges (19 serveur + 3 navigateur, rouges avant) · [x] parseur · [x] scène · [x] Typst
      · [x] SVG · [x] compilation d'une fiche (3 escaliers, énoncé + corrigé, FR + EN : 4/4 OK
      avec `compile-prod.mjs`, page relue à l'œil) · [x] typecheck 0 erreur · [x] PR #601 mergée (2026-10-01)

Relecture (`code-reviewer`, 2026-10-01) : rien de bloquant. Corrigés, tests rouges d'abord :
départ de l'escalier sur l'axe dessiné (faux « sort de la fenêtre » quand y_min > 0), une seule
droite y = x avec deux escaliers, avertissement si la courbe de la relation est hors fenêtre.
Écart minimal entre étiquettes u_k selon la taille (u₁ omise à tort en taille moyenne, vu sur
le PDF).

Limites connues (à dire à David) :

- Rangs u_k placés 26 px / 0,38 cm sous l'axe : si l'axe des abscisses n'est pas en bas de la
  fenêtre, ils sont DANS le repère (lisibles, mais peuvent croiser un tracé). Pour les
  questions : fenêtre y qui commence à 0 ou un peu en dessous.
- Deux escaliers : leurs relations sont toutes deux en noir (décision produit ouverte : refuser,
  ou colorer la relation).

## Lot 1 — existant (corrigé en place)

- `8ed02829` / `a8b51d16` identiques (arith. › calculer un terme 3 et 4) ; `u_a = a·r` ⇒ u₀ = 0.
- Récurrence `79d69593`, `1239554b` : une seule variation.
- `7703e625` variation `(-1)^n` triviale.
- Deviner (`0af4bf32`, `fc921674`, `95c38330`) : liste à partir de u₁.
- `158ecaa4` sans description ; `requiredForm: {pattern: "u"}` à comprendre.
- Sous-domaines sans accent : vérifier les dépendances au texte avant de renommer.

Vérifié en production le 2026-10-01 :

- **Aucun usage élève** des 14 modèles du thème (evaluation_attempt_questions, skill_attempts,
  srs_cards, test_answers, journal) ; aucune référence par identifiant dans series, chapter
  templates, worksheet_exercises, test_sessions. Ajouter des variations ne change donc aucun
  tirage déjà vu.
- Le texte des sous-domaines n'est cité en dur que dans `src/lib/questions/category-order.ts`
  (ordre d'affichage) : renommer = PR qui met ce fichier à jour (avec l'ordre des nouveaux
  domaines), PUIS mise à jour en base.
- `requiredForm: {pattern: "u"}` : une lettre seule est vraisemblablement un joker — à confirmer
  par une spec (réponse développée acceptée ?) avant de le retirer.

### Lot 1 — fait (2026-10-01), branche `feat/suites-1spe-questions`

`update-published-questions.ts` prend désormais `--lot second-degre | suites` (obligatoire).
Instantanés dans `scripts/questions/suites-existants/` (exportés par le nouveau
`scripts/export-question-templates.ts`, lecture seule). 9 modèles publiés écrits en base et
relus conformes, preuves rouges faites (specs du fichier rouges sur le contenu d'avant) :

- `8ed02829` (arith. 3) : u_a quelconque, écart 2 à 5 rangs ; `a8b51d16` (arith. 4) : terme
  éloigné (u_20…u_50) + terme de rang inférieur — les deux ne sont plus identiques.
- `79d69593` (u₁) : + u_n² + c, u_n/2 + c ; `1239554b` (u₂) : + u_n + 2n + c, 2u_n − n.
- `7703e625` (explicite) : + n² − bn, (−1)ⁿ × n (la variation (−1)ⁿ reste).
- Deviner `0af4bf32`, `fc921674`, `95c38330` : + liste à partir de u₁ (piège u₁ pris pour u₀).
- `158ecaa4` : description. `requiredForm: {pattern: "u"}` laissé tel quel (inoffensif).

Piège trouvé : dans un CORRIGÉ, `u_{{a}}` donne `u_10` (rendu u₁0) pour un rang ≥ 10 — l'énoncé
est renormalisé, pas le corrigé. Écrire `u_{ {{a}} }`.

Sous-domaines accentués : `category-order.ts` mis à jour (+ ordre des nouveaux domaines, Limites
passé en dernier) ; renommage en base par `scripts/rename-question-subdomains.ts` APRÈS le merge
(simulation : 5 modèles, dont `07bce646` de terminale, même catégorie).

## Lots 2 à 5 — modèles neufs (brouillon)

Délégués à 4 agents `pedagogy-expert` (Opus), fichiers dans `scripts/questions/suites-1spe/`
(`<lot>-<nn>-<slug>.json`). **35 modèles créés en BROUILLON en production le 2026-10-01**
(`create-questions.ts --publier`, relus ; base : 35 brouillons + 14 publiés dans le thème).
Chacun : `question:specs` vert, 150 tirages par variation, réponses recalculées en Python (fractions
exactes) ; graphiques : 200 tirages par variation passés par `parseCourbeContent`/`buildCourbeScene`
(0 erreur, 0 avertissement, réponse recalculée depuis la suite TRACÉE) ; fiches de test compilées
avec `compile-prod.mjs` (lots 3, 4, 5).

| Lot | Modèles                                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2   | géométriques : terme suivant, précédent, u_n depuis u_0, u_b depuis u_a, raison (entière, fractionnaire), terme général (u_0, u_p) ; arithmétiques : terme général (u_0, u_p) |
| 3   | reconnaître arith./géo. (liste, récurrence, forme explicite, nuage) ; sens de variation (r ; q et u*0 ; u*{n+1} − u_n à calculer ; conclure du signe ; nuage)                 |
| 4   | lire un terme ; lire u_0 et r ; associer formule et nuage ; récurrences avec n ; récurrence par f ; escalier : lire un terme, comportement (QCM)                              |
| 5   | sommes (1+…+n, arith., 1+q+…+qⁿ, géo.) ; seuil (arith. par le calcul, géo. avec tableau) ; pourcentages ; placements (nature, valeur)                                         |

**Non créés** : les 2 modèles Python (Seuil et algorithmes › Algorithmes). Un bloc ```python sort bien
dans le PDF, mais `FillBlanksInput.svelte`(énoncé des questions à trous) n'affiche que paragraph,
math-block, image et heading : le code — et les tableaux markdown — sont INVISIBLES à l'écran.
Décision David : corriger`FillBlanksInput`, ou faire ces modèles en QCM.

**Défauts trouvés par les agents** :

- `\textcolor{#FF5722}` (= `{{color:primary.0}}`) faisait échouer TOUT PDF de corrigé, et le
  contenu coloré était imprimé comme du texte → corrigé, PR #602.
- Tableau markdown avec `{{…}}` dans un énoncé : `X | Y` lu comme un tirage au choix, le tableau est
  détruit (5-06 a donc des énoncés figés). Non corrigé.
- `\dots` non converti en Typst (texte « dots ») ; `\cdots` utilisé. Non corrigé.
- Une condition qui porte sur une variable `eval:` n'est jamais satisfaite (échec après 100
  essais) ; une variable nommée `e` vaut la constante d'Euler.
- `products` (défaut `warn`) signale `3\times2^n` / `500\times1{,}05^n` comme non optimal : mis à
  `off` dans 2-07, 2-08, 5-07.
- Fiche figée (`buildSerie`) : choix de QCM numérotés « 1) 2) » mais « Réponse : d) » en lettre.

**À trancher par David** (en plus de la publication) :

- Réglages de forme (ADR 0013) : `form: warn` en 2-07, 2-09, 2-10 ; `form: off` en 2-08 (accepte
  aussi un calcul inachevé comme `6\times2^n\div2`).
- 3-08 : troisième choix « ni croissante, ni décroissante » (au lieu de « on ne peut pas conclure »).
- 3-04 (nature sur un nuage) et 4-03 (formule d'un nuage) se recoupent un peu.
- Peu de tirages distincts dans certains modèles graphiques (3 à 10 par variation).

## Journal

- 2026-10-01 : spec validée par David ; #601 (escalier), #602 (`\textcolor` dans le PDF), #603
  (questions) mergées ; 9 modèles publiés corrigés, 35 modèles neufs en brouillon ; 5
  sous-domaines renommés en base (accents) par `rename-question-subdomains.ts --publier`, relus.

## Décisions de David (2026-10-01, « je suis tes reco »)

1. Python : corriger l'affichage → `StaticBlockNode` dans `FillBlanksInput` (#607 : courbe,
   tableau, code, liste étaient INVISIBLES dans l'énoncé d'une question à trous — y compris deux
   modèles publiés du second degré, `87140df3` et `eae2ff6a`). Modèles 5-10 et 5-11 (à trous) créés
   en brouillon ; réponses recalculées en exécutant le code Python tiré.
2. 2-08 : `form: warn` + `requiredForm: {pattern: "a * b^c"}` — u_p × q^(n−p) et u_0 × qⁿ justes,
   calcul inachevé (`5\times3^n\div9`) refusé ; brouillon mis à jour.
3. 3-08 : « ni croissante, ni décroissante » validé. 4. « Limites » en dernier, validé.
4. Plusieurs escaliers : chaque relation (et son nom) prend la couleur de son escalier ; noir pour
   un escalier seul.

Défaut (CORRIGÉ, voir plus bas) : dans une série de fiche (`buildSerie`), à partir de la question 10,
les lignes sont décalées de 4 espaces et un bloc ```python n'est plus reconnu : il s'imprime en
texte brut entre guillemets (le PDF compile). Questions 1 à 9 correctes.

## Défauts corrigés (2026-10-01, « corrige les défauts »)

- Bloc de code sous « 10. » (retrait de 4) : le parseur de listes retirait toujours 3 espaces ;
  il retire maintenant aussi la largeur supplémentaire du marqueur (`list-parser.ts`).
- `\dots` (et `\dotsb`, `\dotsc`…) → `...` en Typst, comme `\ldots`.
- Choix de QCM d'une série : `**a)** …` en paragraphes, plus une sous-liste que le PDF
  renumérotait « 1) 2) » (la numérotation dépend de la profondeur). Les fiches déjà créées sont
  figées : seules les nouvelles séries changent.
- Tableau à cellules `{{…}}` : `normalizeExpression` lisait les « | » comme une liste de tirage et
  enveloppait TOUT l'énoncé dans `{{…}}`. Le contenu markdown (énoncé, corrigé) n'est plus
  normalisé (option `markdown`). Mesuré sur la production : 0 texte sur 4 928 n'était modifié par
  cette normalisation → aucun rendu existant ne change.

## cleanCoefficients activé (2026-10-03)

`shared.cleanCoefficients: true` (`1x` → `x`, `+0` retiré, `+-` → `-`) ; exclusions de ±1 / 0 qui ne servaient qu'à l'affichage levées. Vérifié : specs vertes (150 tirages), 300 tirages par variation sans `1x`, `0x`, `+-`, `--` dans le rendu (les `4+0`, `-1-0` restants sont des étapes de calcul voulues).

- 2-07, 2-09, 2-10, 3-03, 3-05, 3-07 : coefficients et raisons dès 1, termes constants pouvant valoir 0 ; 2-10 : `c != r`, `c != p*r` retirées.
- 3-02 : q et p ∈ [−5 ; 5] privés de 0 et 1 (suite géométrique non dégénérée). Raison r ≠ 0 gardée.

## cleanCoefficients activé (modèles publiés, 2026-10-03)

Modèles PUBLIÉS de `scripts/questions/suites-existants/` (lot `suites` de
`update-published-questions.ts`, qui accepte l'ajout de `shared.cleanCoefficients: true`).
Rien n'est écrit en base : écriture par David après relecture.

- **0af4bf32** (deviner, suite arithmétique) : u₀ ∈ [−9 ; 9], raison dès 1 (comme 2-09) →
  `−7 + n`, `−n`, `7n`. 9 specs ajoutées (`−7+1n` → factorOne, `0+7n` → nullTerms).
- Gardés dans #725 (corrigé en chaîne, `1\times2^n`), repris ensuite (branche
  `feat/restes-publies-modeles`) : 7703e625, 79d69593, 1239554b, fc921674, 95c38330.
  Raison r ∉ {−1, 0, 1} gardée pour 8ed02829, a8b51d16 (aucun coefficient devant une lettre).
- Non touchés : 158ecaa4 (sous-domaine « Écriture » en base ≠ « Ecriture » du fichier : le
  script s'arrête) ; 337d31c3, 849aabbc, 1315d326, 7247dbb0, c23840b6 (hors du lot du script).
- Vérifs : 300 tirages/variation, 0 échec, 0 motif interdit ; recalcul Python 0 écart.

## Restes des modèles publiés : corrigés réécrits (2026-10-03)

Les chaînes de calcul (`u_1 = … = … = …`) sont protégées par l'option : elles s'écrivent
désormais proprement par `{{if:…}}` (coefficient 1 → `u_0`, −1 → `-u_0`, terme constant nul
omis ; substitution sautée quand elle répète le résultat, `u_1 = -u_0 = -4`). Option activée.

| Modèle   | Réécriture                                                                                                         | Levé                                   | Gardé                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ----------------------------------------------------------------------- |
| 7703e625 | v0 `u_5 = -5 + 3`, `7 × 3`, `u_5 = 5` ; v3 `6² − 6`                                                                | v0 b dès ±1, c ∈ [−9 ; 9] ; v3 b dès 1 | b ≠ 0 (v0), b ≠ a (v3 : u_a = 0) ; v1 `2\|-2` (choix d'auteur)          |
| 79d69593 | v0 `u_1 = -u_0 + 2 = -(-3) + 2` ; v1, v2 terme nul omis ; v2 énoncé par `{{if:}}` (`\dfrac{u_n}{2}+0` non nettoyé) | v0 b dès ±1, c ∋ 0 ; v1, v2 c ∋ 0      | b ≠ 0 ; `b != 1 or c != 0` (suite constante) ; u₀ inchangé              |
| 1239554b | v0 les deux pas ; v1 `u_1 = u_0 + 2 × 0 = -3`                                                                      | v0 b dès ±1, c ∋ 0 ; v1 c ∋ 0          | idem 79d69593 ; v2 `2u_0 - 0` (n = 0 substitué, voulu)                  |
| fc921674 | réponse `{{eval:a*(b)^n}}` (variable `n` = `n\|n`) : `2^n`, `-(-3)^n`, `3(-2)^n`, `-4 × 3^n`                       | (u₀ = ±1 déjà tiré)                    | q ∉ {−1, 0, 1} : suite constante, alternée ou nulle, rien à conjecturer |
| 95c38330 | idem, `{{eval:a*(c)^n}}` : `(1/2)^n`, `7(−1/4)^n` (× implicite devant la parenthèse)                               | u₀ dès ±1                              | raison 1/b, b ∈ [2 ; 5] premier avec u₀                                 |

Exception justifiée : 1239554b v0, u₁ = 0 et b = −1 → `u_2 = -u_1 + 2 = -0 + 2` (substitution
de u₁ en couleur, 4 tirages sur 300). `1/2^n` reste « forme non optimale » (`form`), comme
`6/5^n` avant. Vérifs : simulation « identique » avant ; specs vertes (21, 16, 15, 15, 14 ;
150 tirages) ; 300 tirages/variation, 0 échec, aucun motif interdit hors exceptions ;
recalcul Python (Fraction) des réponses, des termes affichés et de 4171 chaînes : 0 écart ;
PDF de contrôle (17 tirages à ±1 / 0) relu. Simulation finale : `shared`, `variations`,
`testSpecs`. Écriture (David) :
`pnpm tsx scripts/update-published-questions.ts --lot suites --seulement 7703e625,79d69593,1239554b,fc921674,95c38330 --publier`.
