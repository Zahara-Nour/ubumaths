# Idées à reprendre du format d'exercices de l'autre plateforme

_Relevé du 2026-11-21. Copie lue : `extern/banque-exercices/` (hors dépôt, lecture seule, rien copié).
Chez nous : `src/lib/questions/`, [questions.md](../../../systeme/questions.md),
[ubumark.md](../../../systeme/ubumark.md), [couvrir-un-niveau.md § 3 bis](../../../pratiques/couvrir-un-niveau.md)._

## En bref

Leur exercice est une **classe de code** : chaque auteur écrit une méthode `nouvelleVersion()` qui
tire les nombres, écrit l'énoncé, la correction et la réponse attendue, et choisit une des ~50
options de comparaison. Le nôtre est un **modèle déclaratif** (variables, énoncé ubumark, cases,
forme exigée, règles, specs), vérifié par un schéma Zod et rejoué par `checkTemplate`.

Notre format est nettement plus sûr et plus riche pour juger une réponse (forme, valeur, gestes,
étapes générées). Le leur est meilleur sur **ce que le prof règle** et sur **la façon dont le
hasard se répartit dans une série** : le prof choisit les types de questions d'un exercice, et
dix questions d'une même série ne tombent jamais deux fois sur le même cas. Ce sont les deux
idées à prendre en premier. Viennent ensuite les messages écrits pour une erreur prévue, la
bascule d'une case en QCM, le coup de pouce et le nom accessible des cases.

## Comparaison point par point

| Point                      | Eux                                                                                                                                                                                                                                       | Nous                                                                                                                                                                                                                                                                                                                        | Verdict                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Forme d'un exercice        | Classe TS, code libre (`src/exercices/Exercice.ts`, `ExerciceSimple.ts`)                                                                                                                                                                  | Modèle JSON + Zod strict (`template-schema.ts`, `types.ts`)                                                                                                                                                                                                                                                                 | **Nous** : lisible, contrôlé, éditable par le prof                                   |
| Réglages du prof           | Jusqu'à 5 réglages `sup`…`sup5` (nombre, texte « 1-3-5 », case à cocher), plus `besoinFormulaireComplexe` : listes pondérées, ordre imposé (`src/lib/formulaireComplexe.ts`)                                                              | Le prof choisit un modèle et un nombre de répétitions ; la variation est tirée au hasard (`instance-generator.ts` l. 593, `randomIndex`) ; une ligne de série n'a que `templateId`, `quantity`, `delay` (`validation/series.ts` l. 57)                                                                                      | **Eux**                                                                              |
| Répartition dans une série | `combinaisonListes` répartit les types de questions à parts égales ; `quotaChoice` / `quotaRandint` / `fromQuestionPlan` répartissent une valeur sur N questions (`ExerciceSimple.ts`)                                                    | Chaque répétition a sa graine et tire sa variation indépendamment (`series-items.ts`, `drawSeriesQuestions`) : 10 questions peuvent tomber sur la même variation                                                                                                                                                            | **Eux**                                                                              |
| Pas de doublon             | `questionJamaisPosee(i, …valeurs)` : empreinte des valeurs, tirage refait si déjà vu (`exerciseMethods.ts`)                                                                                                                               | Rien entre deux répétitions d'un même modèle ; on refait le tirage seulement pour des étiquettes identiques **dans** une instance (`rangerLabelsCollide`…)                                                                                                                                                                  | **Eux**                                                                              |
| Graine                     | 4 caractères dans l'adresse, `seedrandom` global (`exerciseMethods.ts`)                                                                                                                                                                   | Une source de hasard par instance, graine 31 bits, « Mêmes nombres pour tous » (`seriesSeedSequence`) ; l'évaluation enregistre modèle + graine (ADR 0015)                                                                                                                                                                  | **Nous** (plus robuste) ; même service rendu                                         |
| Natures de réponse         | Environ 50 options booléennes dans une chaîne de `if` où la première qui correspond gagne (`interactif/comparisonFunctions.ts` l. 3415) ; plus récent : comparateurs composables `all` / `seq` de contrôles nommés (`interactif/checks/`) | `answerKind` (intervalles, équation, vecteur, matrice, primitive, solution d'ED), grandeurs avec conversion (`units/`), `requiredForm` (produit, somme, fraction, puissance, forme d'équation, motif + `acceptable`), `validationRules` (diviseur, multiple, plage, racine, prédicat…), `rulesSuffice`, `answerAssumptions` | **Nous** (une case garde tous ses réglages ; leur ordre des `if` est fragile)        |
| Juste ≠ bien écrit         | Options de forme mêlées à la comparaison (`fractionIrreductible`, `sansTimes`…) ; verdict juste ou faux                                                                                                                                   | Statuts `correct` / `unoptimal_form` (½) / `bad_form` / `incorrect`, forme jugée sur ce que l'élève a tapé (ADR 0006), contraintes `strict` / `warn` / `off` (`constraint-constants.ts`)                                                                                                                                    | **Nous**                                                                             |
| Tolérance                  | `tolerance` en puissance de 10 (`checks/isEqual.ts`), `precisionUnite`                                                                                                                                                                    | `PrecisionType` : décimales, chiffres significatifs, ordre de grandeur, tolérance absolue ou relative (`types.ts` l. 154)                                                                                                                                                                                                   | **Nous**                                                                             |
| Message pour une erreur    | Chaque contrôle porte son message (`feedbackKo`, ex. « La mantisse doit être inférieure à 10. ») ; l'auteur peut le réécrire (`checks/types.ts`)                                                                                          | Messages fixes par contrainte (`feedback.ts`), type d'erreur deviné automatiquement (`error-kinds.ts`) ; une règle de validation n'a pas de message à elle                                                                                                                                                                  | **Mitigé** : leur auteur peut écrire un message ciblé ; nous devinons mieux sans lui |
| Points partiels            | Barèmes au choix (`fonctionsBaremes.ts`), contrôles pondérés (`checks/combinators.ts`)                                                                                                                                                    | Barème fixe 1 / ½ / 0 par question (`grading.ts`, décision Q35)                                                                                                                                                                                                                                                             | Décision figée chez nous, à ne pas rouvrir sans David                                |
| QCM                        | `ExerciceQcm*`, option `lastChoice` (les derniers choix restent en place au mélange, `interactif/qcm.ts`) ; un exercice simple avec `distracteurs` passe en version QCM d'un clic (`versionQcmDisponible`, `qcmDistractors.ts`)           | Case choix (bloc ` ```choix `, ADR 0033), `plusieurs:` et `melanger:` (`choix-parser.ts`) ; pas de bascule d'une case en QCM, pas de choix fixé en dernier                                                                                                                                                                  | **Eux** sur ces deux gestes                                                          |
| Correction                 | `correctionDetaillee` : chaque exercice code deux branches à la main (ex. `2e/2L12-8.ts`) ; « correction minimale » = ce qui est surligné en orange (`components/setup/typst/minimalCorrection.ts`)                                       | Concise / détaillée par marqueurs (ADR 0017), étapes générées par palier (mode B, `generatedSteps`), PDF « réponses seules ou corrigé détaillé »                                                                                                                                                                            | **Nous**                                                                             |
| Coup de pouce              | `tip` (bouton indice), environ 76 exercices (`Exercice.ts`)                                                                                                                                                                               | Indices `{{hint:id}}` dans les **exercices de fiche** seulement (`HintReference.svelte`) ; rien pour un modèle de question                                                                                                                                                                                                  | **Eux** pour les questions                                                           |
| Note au prof               | `comment` : « Une factorisation sera acceptée si… » (ex. `2e/2L12-8.ts`)                                                                                                                                                                  | Fiche du modèle, pour l'admin (`template-fact-sheet.ts`)                                                                                                                                                                                                                                                                    | **Eux** (le prof lit ce qui est accepté)                                             |
| Clavier                    | Choisi par l'auteur pour chaque champ (`formatChampTexte`, `interactif/claviers/`)                                                                                                                                                        | Déduit de la nature de la case (tests `FillBlanksInput-*-keyboard`)                                                                                                                                                                                                                                                         | **Nous** (rien à régler)                                                             |
| Gestes de réponse          | Clic sur figure, glisser-déposer, liste déroulante, grilles de jeux                                                                                                                                                                       | Construire, placer, ranger, associer, texte à trous, colorier, cubes, patron, figure à compléter jugée par propriétés (§ 3 bis)                                                                                                                                                                                             | **Nous** pour le programme ; eux pour les jeux                                       |
| Accessibilité              | Nom accessible en français de chaque champ, calculé depuis la page, avec les symboles lus en mots (`interactif/nomAccessibleChamp.ts`) ; verbalisation des notations, `demandeLaVue` ; tests e2e d'accessibilité                          | `BlankInput.svelte` l. 126 : `aria-label="Reponse {index}"` (sans accent) ; les cases MathLive (`\placeholder`) n'ont ni nom ni description (commentaire de `FillBlanksInput.svelte` l. 350)                                                                                                                                | **Eux**                                                                              |
| Évaluation notée           | Correction dans le navigateur, réponses présentes côté client                                                                                                                                                                             | Rien de la réponse ne part au navigateur (`toPublicQuestion`, ADR 0015)                                                                                                                                                                                                                                                     | **Nous**                                                                             |
| Vérifier un modèle         | Tests e2e de masse (stabilité, compilation LaTeX, console) ; pas de spec par exercice                                                                                                                                                     | `testSpecs` exigées pour publier, `checkTemplate` : 50 tirages par variation, gardes de fuite (`findUnmaskedAnswers`)                                                                                                                                                                                                       | **Nous**                                                                             |
| Papier                     | LaTeX, Typst, AMC (format déduit de la réponse : `amc/amcInference.ts`), Moodle, QCMCam, et correction de copies scannées dans le navigateur (`src/lib/omr/`)                                                                             | PDF Typst, copie par élève à son nom (`worksheets/student-copies.ts`), série figée (ADR 0011)                                                                                                                                                                                                                               | **Eux** sur la correction du papier                                                  |
| Course aux nombres         | `ExerciceCan`, sujet officiel ou tiré, questions liées pour le document papier                                                                                                                                                            | Série minutée, durée par ligne (`series-items.ts`)                                                                                                                                                                                                                                                                          | Équivalent                                                                           |

## Idées à adopter, par ordre d'intérêt

1. **Répartir les variations et refuser les doublons dans une série.** Quand une ligne répète un
   modèle N fois, les variations sont réparties à parts égales (comme `combinaisonListes`), et une
   instance qui a déjà les mêmes nombres qu'une autre est tirée de nouveau (comme
   `questionJamaisPosee`). _Élève_ : dix questions variées au lieu de trois fois la même. _Prof_ :
   une série couvre vraiment toutes les formes du modèle. _Coût_ : moyen. ⚠️ Invariant 3 : une
   évaluation régénère sa copie depuis (modèle, graine) ; il ne faut donc pas changer ce que
   `generateInstance(template, seed)` rend pour une graine. La variation imposée doit être
   enregistrée avec la graine, ou être un paramètre en plus. _Fichiers_ : `series-items.ts`
   (`drawSeriesQuestions`, `SeriesDraw`), `generator/instance-generator.ts` (variation imposée),
   le tirage enregistré d'une évaluation (ADR 0015).
2. **Laisser le prof choisir les variations d'une ligne de série.** C'est l'équivalent de leur
   « Type de questions : 1-2-5 » : par exemple seulement « a²x² − b² » et « (ax + b)² − c² ».
   _Prof_ : un modèle sert plusieurs séances (révision ciblée, différenciation) sans qu'on écrive
   un modèle par difficulté. _Coût_ : moyen. Il faut d'abord trancher la question de conception
   avec David (ADR 0035 : une série enregistre des modèles), et nommer les variations pour le prof.
   _Fichiers_ : `validation/series.ts` (`seriesItemSchema`), `series-items.ts`,
   `instance-generator.ts`, l'écran de composition du catalogue.
3. **Les erreurs prévues, avec leur message.** Une case peut dire : « si l'élève répond
   `(x − 3)²`, lui écrire : “Tu as confondu a² − b² et (a − b)².” ». _Élève_ : un message qui parle
   de **son** erreur, là où `error-kinds.ts` ne fait que deviner une relation. _Prof_ : ses erreurs
   classiques deviennent visibles dans les panneaux d'erreurs. _Coût_ : moyen. On compare la
   réponse à l'erreur prévue avec le juge ordinaire. Le message prime sur le type deviné, comme les
   remarques de case aujourd'hui. _Fichiers_ : `types.ts` (`TemplateBlank`), `template-schema.ts`,
   `utils/answer-validator.ts`, `error-kinds.ts`, `testSpecs` (une spec par erreur prévue).
4. **Basculer une case en QCM.** Le prof coche « en QCM » sur une ligne de série, et la case devient
   une case choix : la bonne réponse et trois erreurs prévues (idée 3), sans doublon après
   normalisation, comme `distracteursDistincts`. _Élève_ : sur téléphone, en course aux nombres ou
   pour les plus jeunes, on répond sans clavier. _Coût_ : moyen à fort. Cette idée dépend de
   l'idée 3. _Fichiers_ : `choice-case.ts`, `choices.ts` (indices d'origine et positions
   affichées), `instance-generator.ts`, `validation/series.ts`.
5. **Un coup de pouce pour une question.** Un indice que l'élève ouvre s'il est bloqué, masqué en
   évaluation notée. La brique existe déjà pour les fiches (`{{hint:id}}`, `HintReference.svelte`,
   `ExerciseHint`). _Élève_ : il avance seul au lieu d'abandonner. _Coût_ : petit à moyen. Reste une
   question pour David : un indice ouvert compte-t-il dans la révision espacée ? _Fichiers_ :
   `types.ts` (`QuestionVariation`), `public-question.ts` (le retirer en évaluation), `QuestionCard`,
   `FlashCard`.
6. **Nommer les cases pour un lecteur d'écran.** Chaque case reçoit un nom en français, comme
   « Question 2, case 1 sur 3 », et les symboles sont lus en mots (≤, ∈, π), sur le modèle de
   `nomAccessibleChamp.ts`. Au passage, corriger « Reponse » en « Réponse » (`BlankInput.svelte`).
   _Élève_ : un élève malvoyant peut répondre. _Coût_ : moyen, car MathLive cache ses cases dans
   son shadow DOM. Il faut le passer à `accessibility-tester`. _Fichiers_ : `BlankInput.svelte`,
   `FillBlanksInput.svelte`, `MathField.svelte`.
7. **Une note au prof sur ce qui est accepté.** Une phrase lisible dans le catalogue, comme
   « Toute factorisation en facteurs du 1er degré est acceptée », écrite par l'auteur ou tirée des
   réglages (`requiredForm`, `rulesSuffice`, contraintes). _Prof_ : il sait à quoi s'attendre avant
   de donner la série. _Coût_ : petit. _Fichiers_ : `template-fact-sheet.ts`, la carte du
   catalogue.
8. **Garder des choix en dernier dans une case choix.** Un réglage comme `dernier: 1` laisse
   « Aucune de ces réponses » à la fin malgré le mélange (leur `lastChoice`). _Coût_ : petit.
   _Fichiers_ : `choix-parser.ts`, `choice-case.ts`, `choice-case-editor.ts`.
9. **Plus tard : corriger les copies papier par scan.** Le prof imprime une série en QCM ou en
   cases à chiffres, scanne les copies, et la correction se fait dans le navigateur (leur
   `src/lib/omr/`, sans service extérieur). Nos cases déclaratives donneraient le format papier
   sans rien écrire en plus (leur `amcInference.ts` le devine depuis du code). _Coût_ : fort ; à
   peser avec le RGPD, car ce sont des copies d'élèves.

**À ne pas reprendre** : leurs ~50 options booléennes dont l'ordre décide ; la correction détaillée
codée en deux branches dans chaque exercice ; le clavier choisi à la main ; la correction notée
faite dans le navigateur ; les barèmes au choix (notre 1 / ½ / 0 est une décision figée).

## Là où notre format est nettement meilleur : à exploiter dans les nouveaux modèles

- **Juste en valeur, mal écrit** : `requiredForm` (avec `acceptable` pour la forme perfectible) et
  les contraintes en `warn` ou `strict` plutôt qu'un simple faux. Eux ne savent dire que juste ou
  faux.
- **Plusieurs bonnes réponses** : `validationRules` + `rulesSuffice` (« un diviseur de 60 »,
  « un nombre entre 2 et 3 ») au lieu d'une seule réponse attendue.
- **Hypothèses** (`answerAssumptions`) : `√(x²) = x` accepté quand x > 0.
- **Étapes générées par palier** (mode B) : une correction juste pour chaque tirage, rédigée selon
  le niveau, au lieu d'une correction écrite à la main en deux versions.
- **Gestes du programme** (construire, placer, ranger, associer, trous, colorier, cubes, patron,
  figure jugée par propriétés) : à préférer à une saisie quand le BO parle de « placer » ou de
  « construire ».
- **Type d'erreur deviné** (`error-kinds.ts`), sans rien écrire.
- **`testSpecs` + `checkTemplate`** (50 tirages par variation) : écrire une spec par forme
  acceptée **et** par forme refusée. C'est ce qui manque le plus chez eux.
- **Évaluation notée côté serveur** et **anti-fuite** (`toPublicQuestion`, `findUnmaskedAnswers`) :
  un modèle peut servir en évaluation sans rien révéler.
- **Grandeurs avec conversion** et **arrondi demandé** (`PrecisionType`) : écrire `unit` et
  `precision` plutôt qu'accepter un nombre seul.

## Décisions de David (2026-11-21)

1. **Répartir les variations dans une série : oui.** L'ancien site (TinyMath, `extern/new-tinymath`,
   `apps/ubumaths/src/lib/questions/generateQuestion.ts`) le faisait déjà :
   - **quota par variation** : `limit = ceil(nbQuestions / nbVariations)`, recalculé quand une
     variation atteint son quota ; le tirage se fait au hasard parmi les variations encore sous leur
     quota (`availables`) ;
   - **option `exhaust`** : chaque élément fixe (sans hasard) sort une seule fois, et le nombre de
     questions est plafonné au nombre d'éléments ;
   - **refus des doublons** : même variation et mêmes valeurs (variables, énoncé, expression,
     choix, image) qu'une question déjà tirée → nouveau tirage (boucle `do … while`).
     **Doublon, précision de David (2026-11-21)** : deux calculs différents qui ont la même réponse
     (« 12 × 5 » et « 15 × 4 ») ne sont **pas** un doublon. Reste à trancher en phase 0 : « même
     énoncé affiché » (TinyMath, à peu près) ou « mêmes valeurs à l'ordre près » (`2 + 3` = `3 + 2` ?).
     TinyMath : même modèle, même variation, mêmes valeurs tirées (expressions remises en forme puis
     comparées comme texte) et même texte ; 100 nouveaux tirages au plus, puis le doublon est gardé.
     Point délicat chez nous : une évaluation régénère la copie par la graine (ADR 0015) ; la
     variation imposée doit être enregistrée avec la graine.
2. **Le prof choisit les variations d'une ligne de série : oui** (utile).
3. **Erreurs prévues avec leur message : oui**, à recouper avec les chantiers sur les erreurs
   (`type-erreur`, `erreurs-frequentes`).
4. **Case ou QCM à partir des erreurs prévues : idée intéressante.** Les deux formes ont leurs
   avantages ; piste de David : des variations pour les deux formes (à mesurer : un tirage au
   hasard mêlerait alors deux difficultés, cf. idées 1 et 2).
5. **Coup de pouce : oui**, à recouper avec la génération automatique des corrections (l'indice
   pourrait être la première étape de la correction générée). **Révision espacée : un indice
   ouvert puis une réponse juste = demi-réussite** (David, 2026-11-21) : la question revient plus
   tôt, pour vérifier que l'élève sait faire seul.

**Ordre (David, 2026-11-21)** : chantier `idees-format` dans une nouvelle session, idée 1 d'abord
(répartition des variations), puis 2 à 5 ; puis vérification du lot « nombres et calculs » de
Seconde au regard de ces critères ; ensuite seulement les autres rubriques de Seconde
(`idees-rubrique`) et les autres niveaux.
