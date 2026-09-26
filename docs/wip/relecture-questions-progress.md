# Relecture des questions TinyMath — progression

> Prompt de départ : `docs/wip/relecture-questions-tinymath-prompt.md`.

## Décisions de David

- 2026-09-26 — `testAnswerss` : **option a**, un mode « la règle suffit » sur les cases réponse,
  nommé `rulesSuffice`. La correction affichée à l'élève (« une réponse possible ») est dans la
  même PR.

- 2026-09-26 — Phase 0 validée :
  1. **Lot pilote : Relatifs** (36 questions, 5e-4e).
  2. **Import en brouillon après le feu vert de David sur chaque lot** (pas au fil de l'eau).
  3. **Marqueur « relu par Claude »** : `reviewed_by` = David, `conversion_notes` commence par
     « Relu par Claude le … ».
  4. **Scripts dangereux** (`migration:import`, `validate-phase1-questions`) : passés en
     **simulation par défaut**, écriture seulement avec `--publier`.

## Phase 0 — spécification

Présentée et validée le 2026-09-26 (cf. décisions ci-dessus).

## Chantier en cours : `fix/regle-suffit`

Constats mesurés (validateur réel, 2026-09-26) sur les 8 questions à `testAnswerss`
(209, 210, 216, 481, 482, 535, 611, 621) :

1. Les `validationRules` d'une case ne sont qu'une pré-condition : la réponse doit AUSSI égaler
   `expectedAnswer` → « trouve UN diviseur » n'accepte que le diviseur tiré.
2. Le transformateur écrit `dividend: "d"` au lieu de `"{{d}}"` → même la bonne réponse est
   refusée (« free variables: d »).
3. Sa regex `mod(...)` non ancrée perd les exclusions `&answer!=1 && &answer!=n`.
4. 210, 481, 535, 611 ne génèrent pas d'instance (autres défauts, à traiter en relecture).

Comportement livré :

- `rulesSuffice: true` (case réponse ou `blankDefaults`) → juste ⇔ toutes les règles passent ;
  `expectedAnswer` n'est plus qu'un exemple ; la réponse doit être un nombre simple. Sans règle, le mode est
  ignoré (jamais « tout est juste ») et le template est refusé à la validation.
- FlashCard : chaque case est colorée par le validateur réel en mode `rulesSuffice` ; le verso
  titre « Une réponse possible ».
- Transformateur : `{{a}}`, découpage des `&&`, `equation_root`, `rulesSuffice` posé sur les cases.

Écart à la spec validée : la forme n'est PAS comparée à `expectedAnswer` (le contrôle « exact »
exige l'identité : 3 contre 2 serait de mauvaise forme). En `rulesSuffice`, la réponse doit être un
nombre simple (comme une case à précision). Limite : une fraction (`1/2`) serait refusée — à
élargir si une question à plusieurs réponses fractionnaires apparaît.

Après relecture (`code-reviewer`) :

- `12/2` n'est évalué pour les règles qu'en mode `rulesSuffice` : les questions existantes gardent
  exactement leur verdict et leur message.
- Mode ignoré sur une case texte ou avec unité (règles numériques).
- En `rulesSuffice`, pas de message technique de règle à l'élève (retour ordinaire).
- Éditeur de templates : `shared.blankDefaults.rulesSuffice` conservé à la sauvegarde.

## À traiter plus tard (noté, pas corrigé)

- Plusieurs cases `rulesSuffice` aux mêmes règles acceptent deux fois la même valeur (« 3 et 3 »).
  Pas toujours une erreur (« un diviseur de 12 et un de 15 ») → décision pédagogique. Aucune des
  8 questions n'a plus d'une case par variante (mesuré).
- Appariement glouton en ordre indifférent : peut refuser une affectation valide si une case
  `rulesSuffice` côtoie une case exacte.
- Messages des règles en anglais (« 5 does not divide 12 ») encore montrés à l'élève dans le mode
  historique (règles = pré-condition). Défaut antérieur.
- `MigrationQuestionEditForm` n'affiche pas `rulesSuffice` au relecteur.
- #216 variante 3 : `$l{1;4;7}+2-mod(&1+&2;3)` mal convertie (≈ 1 tirage sur 2 échoue) — `it.fails`
  dans `transformer-test-answers.test.ts`. #210, #481, #535, #611 ne génèrent pas (tirages).
- #621 : pas de `solutionss`, égalités `testAnswers` ignorées → réponse attendue à reprendre.

## Phase 1 — outillage (`chore/outillage-relecture`)

- Simulation par défaut : `import-questions-to-db`, `validate-phase1-questions` **et
  `rollback-migration`** (il supprimait par défaut ; même décision appliquée).
- `pnpm question:specs` (vérifier / prévisualiser), `pnpm relecture:verdicts` (reporter les verdicts
  d'un lot), `pnpm relecture:import` (importer en brouillon). Circuit : `docs/relecture/README.md`.
- Importable ⇔ structure + schéma strict OK, ≥ 1 spec « correct » PAR variation, toutes les specs
  vertes, 50 tirages par variation sans échec, niveau ≥ 1.
- Garde-fous (relecture `code-reviewer`) : verdict déjà rendu et différent → refus sans
  `--remplacer` ; import recoupé avec le fichier relu (contenu identique exigé) ; doublon
  d'empreinte refusé ; rejet/arbitrage n'écrit jamais de version corrigée.

## Décisions en attente de David

- **Niveaux** : la base exige `level ≥ 1` ; TinyMath commence à 0 (136 questions) ; le transformateur
  ne décale PAS (mesuré : 633/633 identiques) alors que son propre contrôle exige ≥ 1. Les 41 de
  David : 0 changé en 1 à la main → paires au même niveau (#0/#1, #9/#10, #25/#26, #96/#97) qui se
  bloqueraient à la publication (unicité thème/domaine/sous-domaine/niveau) ; #20 resté à 0.
  Proposition : +1 pour tous. En attendant, l'outil écarte tout niveau < 1.

## Pièges rencontrés

- **12 paires TinyMath ont la même empreinte** (`generateStableQuestionHash`), clé UNIQUE du suivi :
  74/136, 75/137, 78/140, 79/141, 80/142, 81/143, 82/144, 84/146, 85/147, 629/630 sont de vrais
  doublons (→ rejet « doublon de #… ») ; **356/360 et 435/439 sont des questions distinctes** : #360
  et #439 ne peuvent pas avoir leur propre ligne de suivi (à traiter au lot Fractions / Grandeurs).
- Une spec sans `variationIndex` vise la variation 0.
- `check:incremental` refuse de tourner quand Supabase local est démarré (RAM) : `db:stop` d'abord.
- `rollback-migration` (existant) ne relit ni le delete ni l'update et `--all` supprimerait aussi les
  brouillons de la relecture : ne pas l'utiliser pour eux.
- `&solution` (→ `{{solution:html}}`) est rendu HORS formule (« est 1.5 ») : vérifier au rendu
  que l'élève voit « 1,5 » (notation décimale) — repéré sur #260.
- #364 : consigne en HTML TinyMath (`<h3 class="${get(color2)}-text">`) non convertie — à reprendre.
- #397 : conditionnel `{{if:…}}` contenant un `align` multiligne → « Failed to parse random »
  (indépendant des couleurs) — groupe « conditionnels » à traiter.
- ⚠️ Signe explicite TinyMath dans une évaluation (`[+_g_]`, #586, #601) : `{{eval:+g}}` perd le
  signe → `f(x)=7x9` au lieu de `7x+9`, sortie d'apparence VALIDE. Prochain groupe à corriger ;
  d'ici là, relire tout énoncé à `[+_…_]`.
- ⚠️ Variables TinyMath nommées `e` (&5) ou `i` (&9) : l'évaluateur les lisait comme constantes
  (Euler, imaginaire) → réponses attendues fausses sans erreur (80 questions utilisent &5, dont 9 de
  David : #3, 16, 17, 18, 19, 101, 103, 104, 106) et boucle sur `10^e` (#47). Noms sans e ni i
  depuis #461. **Les versions corrigées de David portent encore `e`** : à renommer en Phase 2.
- Durées (#461…) : marqueurs TinyMath `[°…°]` non convertis dans l'énoncé, réponse attendue brute
  `[_b+3_]` → groupe à traiter. #590 « Résoudre graphiquement » : vérifier le graphique.
- Champ réponse, expression désormais affichée (#462) : échec HONNÊTE plutôt qu'une question sans
  sa donnée — #611 et #527 (`[_…_]` contenant une inconnue x : `{{eval:+-(a+(b))x}}`) ; #457/#459
  (virgule décimale `&1,&2h`) ; #621 (aucune solution) ; #344 (2ᵉ `enounces2` perdu, 1 variation) ;
  #486 point final dans la formule (`$?.$`) ; redondances visuelles #313, #455, #456.

## Lot pilote Relatifs — TERMINÉ (2026-09-26)

- 36/36 importées en brouillon après feu vert de David (rapport : `docs/relecture/relatifs/RAPPORT.md`).
- Arbitrages : #330 → `additionOnly` ; #335 → termes signés. Les 8 défauts de conversion du lot corrigés
  (#464 parenthèses après « : », #465 validateur, #466 transformateur).
- Génération du corpus : 198 → 507/633 sur la journée (#457-#466).
- Tes 41 (David) : la variable `e` n'y pose PAS de problème (remplacée avant calcul ; vérifié sur 30 tirages).

## Phase 2 — les 41 de David : TERMINÉE (2026-09-26)

- 41/41 importées en brouillon (`docs/relecture/david/RAPPORT.md`) : 33 telles quelles (+ specs, niveau +1),
  7 corrigées selon ses décisions (#1, #3, #6, #9, #10, #11, #12), #20 corrigée (19 réponses fausses héritées
  de TinyMath, CP → CE1).
- Ses specs ont révélé 2 défauts de code corrigés (#467) : « \* » ≠ « × » au contrôle de forme (bonne réponse
  refusée) ; espaces des milliers mal placées acceptées.
- En base : 79 templates (2 d'origine + 36 Relatifs + 41), tous en brouillon.

## Lot Fractions — TERMINÉ (2026-09-26)

- 57/58 importées en brouillon (feu vert d'import donné d'avance ; rapport `docs/relecture/fractions/RAPPORT.md`).
- **#360 non importée** : même empreinte que #356 alors que les questions sont distinctes → pas de ligne de
  suivi possible (clé UNIQUE). Décision de David attendue (même cas : #439).
- #468 : `pgcd`, `10^$e[a;b]`, variables mixtes, accolade LaTeX devant un marqueur (analyseur en prod,
  0 changement de résultat mesuré sur 12 576 instances). Génération : 515/633.
- Défaut majeur restant dans le convertisseur : réponse `{{eval:expressionN}}` sur une fraction → décimal
  arrondi (toute fraction juste refusée) ; corrigé à la main dans ~30 questions, toucherait les lots suivants.
- 6 points « à regarder » pour David dans le rapport (espace des milliers, signes, parenthèses…).
- En base : 136 templates, tous en brouillon.

## Calcul exact comme TinyMath — LIVRÉ (#469, 2026-09-26)

- `{{eval:…}}` rend la forme exacte (`\dfrac{9}{7}`, `2 \sqrt{2}`, `\ln(2)`) ; `;d` = décimal ; un calcul
  contenant un décimal reste décimal. Convertisseur : `[._…_]` et `result-type: decimal` → `;d`.
- 13 brouillons en base ont reçu `;d` avant le merge (sauvegarde `data/migration-output/backups/eval-d-*`).
- Mesure : aucune réponse ni énoncé en base ne change ; 52 anciennes questions passent au résultat exact.
- Défaut connu (prod, hors PR) : deux `$$…$$` sur une même ligne séparés par du texte → texte abîmé
  (« et » → `\exponentialE t`).

## Défauts récurrents du convertisseur — LIVRÉS (#470, #471, 2026-09-26)

- #470 : réponse `p/q` → `\dfrac` ; tirages composés (`$e[1;9]*10+$e[1;9]`, `$e[1;5]*10`, `2*$e{3}`)
  → variables auxiliaires ; exclusions `\{…}` (relatif, liste, n chiffres) ; `<b>`, `[°…°]` ; aide HTML
  non recopiée ; formules `$$…$$`/`$…$` en une passe (« et » → `\exponentialE t` corrigé en prod).
- #471 (décision de David, option 1) : `{{if:…}}` sur les variables tirées résolu à la génération ;
  condition sur la réponse de l'élève laissée intacte ; texte sans marqueur plus déformé (« On 7
  multiplié ») ; conditions TinyMath `pgcd`→`gcd`, `;`→`,`.
- Corpus : 515 → 524/633 génèrent ; plus aucun `{{if:…}}` brut ; base (136) inchangée.
- Restent connus : `\dfrac{-3}{4}` attendu (variable négative) jugé perfectible ; calcul avec une lettre
  tirée (#532 `[_&3&4_]`) ; `$ers[…]` ; aucun code navigateur ne résout `{{if:isCorrect…}}` ;
  #360/#439 (empreinte partagée) en attente de David.

## Prochaine étape

Lot suivant de la relecture (fin d'Entiers, Décimaux…) : même méthode, rapport, import en brouillon.
