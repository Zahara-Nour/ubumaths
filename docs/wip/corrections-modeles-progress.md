# Chantier `corrections-modeles` : correction concise / détaillée et corrections générées

## Reprendre ici

_Mis à jour le 2026-11-17, à la reprise._

- **État** : phase 0 ; page de démonstration `/dev/corrections` (14 modèles × Flash-cards / Saisie / fin de série) sur la branche `feat/corrections-demo`, commitée et poussée, **sans PR** (serveur `pnpm dev --port 5178 --strictPort` depuis le worktree ; 5176 pris par `questions-1techno`) · **Prochaine action** : recueillir les retours de David sur la page (§ Retours ; RC1 → chantier `mots-cliquables`), puis choisir quoi reprendre de TinyMath et répondre aux Q1–Q5 · **En attente de David** : Q1 à Q5 ci-dessous · **Pièges en cours** : ne pas refaire ce que l'ADR 0017 et Q91–Q101 ont déjà tranché ; le dire si une proposition y revient ; le journal vit sur `main` (l'exemplaire de la branche est périmé) · **Worktree / branche** : `ubumaths-wt-corrections-modeles` · `feat/corrections-demo`, migrée en `#lib` le 2026-11-18 (#2826)

## Origine

Demande de David du 2026-11-16, à la suite du retour A1 (2) du chantier [`cours-suites`](cours-suites-progress.md).
Aucune des 30 cartes « Cours : … » n'a de marqueur de détail, donc leur correction concise est identique à la
détaillée. Ce chantier ne se contente pas de marquer les 30 cartes : il reprend la question en entier.

1. **Prise en compte** : comment les modèles portent une correction concise et une correction détaillée.
2. **Affichage** : ce qu'on montre selon la situation (flash-cards, révision, Entraînement, En classe,
   évaluation, aperçu prof, fiches PDF).
3. **Corrections générées par mathAST** : peuvent-elles remplacer les corrections écrites à la main dans
   les modèles ? Pour quels modèles, et à quelles conditions ?

## Déjà tranché (à ne pas re-proposer sans le dire)

- [ADR 0017](../adr/0017-correction-concise-et-detaillee.md) : un seul champ de correction, détails marqués dans
  le texte (`\detail{…}`, `> [!méthode|rappel|attention]`, `[…]{.rappel}`…), transformation avant le rendu,
  ouverture en concis, un seul interrupteur.
- Journal [`correction-concise-detaillee`](correction-concise-detaillee-progress.md) (D1–D12, Q88–Q90) :
  - lot 1 (transformation, composant, flash-cards et cartes de cours) livré par #636 ;
  - lot 3 (fiches PDF) fait le 2026-10-11 ;
  - **lot 2** (autres affichages et aperçu prof) **et lot 4** (mode B : concise = `summarized`,
    détaillée = `detailed`) restent à faire.
- [Q91–Q101](correction-trois-niveaux-et-questions-de-cours.md) : trois niveaux (résultat attendu → concise →
  détaillée), places selon la situation (Q91), présentation des réponses fausses (Q92–Q93), résultat attendu
  construit automatiquement (Q94), correction d'une carte de cours (Q96).

## Étude (faite le 2026-11-16)

- [x] **Prod** (MCP lecture seule, 2026-11-16) : 2 442 modèles (2 297 publiés, 145 brouillons ; types
      `fill_in_blanks` et `course_card`, 10 cartes de cours dont 6 brouillons « Cours : … »).
  - Mode A : 2 220 publiés et 145 brouillons ont des étapes écrites (2,5 étapes en moyenne).
  - **Mode B : 0** modèle avec `generatedSteps`.
  - **Marqueurs de détail : 0** (`\detail{`, `[!…]`, `]{.…}` cherchés dans tout le JSON) → l'interrupteur
    n'est jamais apparu à un élève en prod.
  - 51 publiés n'ont **aucune** correction (seulement la réponse attendue, ex. « Calcule $4a$ »).
  - Les 30 « Cours : … » de `cours-suites` = 6 `course_card` + 24 `fill_in_blanks`, tous brouillons.
- [x] **Code** (relevé dans `src/`, vérifié par sondage) :
  - **Concise + interrupteur** (`CorrectionView`) : flash-cards (`FlashCard`), révision SRS, grille En classe,
    `CorrectionCard` (résultats d'Entraînement, résultats d'évaluation élève et prof), cartes de cours
    (`CourseCardBack`). → La partie « autres affichages » du lot 2 est **déjà faite**.
  - **Détaillée seule** : aperçu de l'éditeur (`QuestionPreview.svelte:60`), `/dev/apercu-question`
    (`QuestionPreviewBaseCard`) → **reste du lot 2 = D10** (le prof voit les deux vues dans l'aperçu).
    `QuestionCompareView` n'existe plus.
  - PDF : corrigés d'exercices toujours en détaillée (`render-exercise.ts:457`) ; `serie-automatismes.ts`
    garde les marqueurs bruts mais n'a aucun appelant hors tests.
  - **Mode B** : affiché seulement par `CorrectionCard:404` et `CourseCardBack:31`. `FlashCard`, SRS et
    l'aperçu ignorent `_renderedSteps` → un modèle en mode B sans étapes écrites y apparaîtrait **sans
    correction**. `verbosity: 'summarized'` n'est passé nulle part (défaut `detailed`) ; le `feedback` qui
    suit les étapes générées est rendu sans transformation des marqueurs.
- [x] **mathAST** (`generator/correction-generator.ts:106`, 12 `kind`) : calcul (opérations, fractions,
      puissances, racines, notation scientifique), équations 1er et 2nd degré, inéquations (1er, 2nd degré,
      rationnelles, tableaux de signes), dérivée, primitive/intégrale, simplifier (factoriser, développer,
      réduire), limite, ensemble de définition.
  - `summarized` ≠ `detailed` : en général les mêmes étapes **sans le texte d'explication** ; seul
    « développer » fusionne des lignes. Aucun test ne montre une sortie `summarized` hors développement.
  - Échec du moteur → repli silencieux sur le mode A (`console.warn`) ; le mode A l'emporte toujours.
  - **Périmètre en prod, estimé d'après le verbe de l'énoncé** (grossier) : calculer 317, équation 65,
    inéquation 36, limite 26, réduire 25, développer 24, dériver 23, intégrer 22, factoriser 14 → **≈ 550 des
    2 297 publiés (~24 %)** ; ≈ 1 740 autres (numération, géométrie, problèmes, fonctions, cours…).
  - Échantillon de corrections écrites : figures (` ```courbe `, ` ```trig `), raisonnement (« la fonction cube
    est strictement croissante… »), conditions `{{if:…}}` selon les valeurs. Le moteur ne produit rien de cela.
- [x] **Ancien site TinyMath** (`extern/new-tinymath/apps/ubumaths/src`, lu le 2026-11-16) : **deux niveaux,
      séparés par le retournement de la carte**.
  - Recto en mode correction (`ui/Question.svelte`, `questions/correctionItem.ts` `createCorrection`) :
    la **correction simple, construite automatiquement** selon le type (calcul : `expr ≠ réponse` en rouge
    puis `= solution` encadrée verte ; trous : solutions en vert ; QCM : bordure verte + pastille ✓/✗),
    surchargeable par modèle (`correctionFormat`, gabarits `&exp`, `&sol`, `&ans`). Remarques (`coms` :
    « Ta réponse : … », zéros ou parenthèses inutiles, fraction non simplifiée…) à côté, en écriture
    manuscrite ; pastille numérotée verte / ambre / rouge dans la liste (`CorrectionListItems.svelte`).
  - Verso « Détails » (`ui/BackCard.svelte`, `createDetailedCorrection`) : les lignes écrites par l'auteur
    (`correctionDetails` : texte à gabarits ou image). **Pas de bouton de retournement sans détails**
    (`QuestionCard.svelte`, `isFlashCard`).
  - Flash-card : verso = « Réponse : » en grand + image de correction + détails.
  - Dans Chiphre : le recto existe déjà (`ExpectedResultView`, Q92–Q94 livrés) ; le verso porte la correction
    écrite **et** l'interrupteur concise / détaillée → trois niveaux là où TinyMath en avait deux.
  - Vérifié le 2026-11-16 : (1) **pas de surcharge par modèle** du résultat attendu (`buildExpectedResult`
    ne lit que `statement`, `blanks`, `expressions`) ; (2) **le bouton de retournement de `CorrectionCard`
    est toujours là**, verso « Aucune correction disponible. » sans correction écrite (51 modèles publiés) ;
    `FlashCard` : `flippable` vaut `true` par défaut, son verso a toujours le résultat attendu.
- [x] **Par situation** (termes de `CONTEXT.md`, relevé du 2026-11-16) :
  - `FlashCard` (recto = question ; verso = « Réponse », résultat attendu, « Correction », correction écrite) :
    **Flash-cards**, **révision SRS**, **Saisie** (retournée après « Valider », `TypingSeries.svelte:286`),
    grilles **En classe** (`startFlipped`, sans retournement).
  - `CorrectionCard` (recto = statut + résultat attendu ; verso = « Correction ») : fin de **Contrôle blanc**
    et de **Course aux nombres** (`TestResults`), résultats d'un **contrôle** (`EvaluationResults`,
    `QuestionErrorsPanel`).
  - **Carte de cours** (`course_card`) : pas de résultat attendu (`expected-result.ts:974`) ; verso =
    `CourseCardBack`. **Question de cours** = marqueur (carte, QCM, vrai/faux) ; un QCM de cours se
    corrige comme toute case choix.
- [x] **Par case** (rapport d'agent sur `expected-result.ts`, `ExpectedResultView`) : rendu dédié pour
      chaque sorte (formule R1 `≠`/`=`, énoncé rempli + « Ta réponse », choix, figure à compléter, figure
      de travail, tableaux, placer, ranger/associer/trous, construire, programmer). Repli texte seul
      (`expected-only`) pour un bloc mal formé. **Non vérifié** : `BuildAnswer` ne rend rien pour un bloc
      ranger/associer/trous/cubes/patron/solide en erreur (pas de `{:else}`).
  - Prod (publiés) : choix 749, courbe 124 (affichage compris), ranger 85, espace 32, figure à compléter
    21, trig 20, diagramme 18, monnaie 18, horloge 13, partage 9, collection 7, tortue 4, robot 2 ; le reste
    = cases MathLive.
- [x] **Cartes de cours** : déjà tranché par **Q96** (concise = la réponse de cours ; détail = explication,
      exemple, contre-exemple, lien avec la méthode). Reste à **marquer** les cartes, rien à décider.

## Retours de David sur `/dev/corrections`

- **RC1 (2026-11-16)** : les mots soulignés alourdissent la lecture → chantier
  [`mots-cliquables`](../archive/wip/mots-cliquables-progress.md) (mots récents seulement, rien dans la correction).

## Questions de phase 0 (en attente de David)

- **Q1 : sort du journal `correction-concise-detaillee`.** Ce chantier reprend-il ses lots 2 et 4, son journal
  étant archivé après versement ? Ou les deux restent-ils séparés ?
- **Q2 : rôle de la correction générée.** Si mathAST sait corriger un modèle, la correction générée
  remplace-t-elle la correction écrite (qu'on supprime), ou sert-elle seulement quand rien n'est écrit ?
  Le prof peut-il choisir modèle par modèle ?
- **Q3 : les 30 cartes de `cours-suites`.** Leur publication attend-elle la fin de ce chantier, ou peuvent-elles
  sortir avec une correction concise identique à la détaillée (cas D4 de l'ADR, prévu) ?
- **Q4 : marquer l'existant.** 0 des 2 365 corrections écrites n'a de marqueur. Les marque-t-on par lots
  (proposition de marquage relue par David sur une page à cocher, niveau par niveau), ou seulement au fil
  des nouveaux modèles et des retouches ?
- **Q5 : les 51 modèles publiés sans correction.** Leur écrit-on une correction (ou une correction générée,
  ce sont des calculs), ou la réponse attendue suffit-elle ?

## Journal

- 2026-11-16 : situations et cases relevées ; page `/dev/corrections` ; RC1 → chantier `mots-cliquables`.
- 2026-11-16 : état des lieux (prod, code, mathAST) ; lot 2 réduit à l'aperçu prof (D10) ; Q4–Q5 ajoutées.
- 2026-11-16 : lecture de l'affichage des corrections de TinyMath (§ Étude).
- 2026-11-16 : chantier ouvert à la demande de David ; renvoi depuis `cours-suites` (retour A1 (2)).
