# Chantier lecture-grandeurs — des parseurs de mathAST cohérents avec le BIPM

## Reprendre ici

_Mis à jour le 2026-10-21, après #1565._

- **État** : chantier codé en entier — PR 1 (#1555), 2 (#1557), 3 (#1558), 4 (#1560), `BARE_PI` (#1561), 5 (#1562), 6 virgule (#1565) mergées, **pas en prod**. Pages à cocher closes : grandeurs (81/81), virgule (31/31).
- **Décidé par David** : (1)-(17), détail dans l'historique ; (16) `2 m 30 cm` reste une somme dans l'atelier ; (17) pas de ′ ″.
- **Prochaine action** : versement de fin de chantier (durable → `docs/systeme/`, journal archivé), quand David le dit.
- **En attente de David** : ⚠️ AVANT le `deploy:prod` qui livre #1565 : `pnpm tsx scripts/reecrire-virgule-decimale-base.ts` (simulation : 22 remplacements, 12 lignes), puis `--ecrire` (8 modèles publiés + 7 formules d'exercices ; note dans `verifications-manuelles.md`). Les brouillons `pi` nus sont déjà réécrits.
- **Pièges** : un inventaire par regex rate des formes (`(-a,5)`, `{{a}},{{c}}`) : mesurer par différentiel ancien/nouveau code ; textes rangés de l'atelier et chaînes du DSL relus par `legacyDecimalCommas` ; RD maison sans fonctions génériques ni matrices. Limites hors PR : liste dans l'historique du 2026-10-21.
- **Worktree / branche** : aucun (#1565 mergée). Sondes : `docs/wip/lecture-grandeurs-sondes.md`.

## Historique

### 2026-10-21 — PR 6 codée : virgule toujours séparatrice, « ; » refusé

- Parseur maison (Pratt et RD) : le tokenizer ne lit plus la virgule décimale ; `;` = jeton
  `SEMICOLON` ; refus `DECIMAL_COMMA` (virgule collée entre deux entiers, texte « write 2.5 » avec
  le nombre tapé, `√2,5` compris), `UNEXPECTED_COMMA`, `SEMICOLON` (`refusal-codes.ts`). `f(1,5)` =
  deux arguments (Pratt ; le RD maison n'a pas de fonctions génériques). Tests :
  `parser/__tests__/virgule-point-virgule.test.ts` (77, rouges avant). Empreinte du corpus maison :
  16 saisies sur 1 299 (toutes à virgule ou `;`, refus qui changent de code), régénérée.
- **Mesure prod (MCP lecture seule ; la lecture par script avec la clé de service est refusée)** —
  différentiel ancien code (dépôt principal) / nouveau (worktree) sur copies locales : l'inventaire
  du 2026-10-20 était incomplet. Publiés : `e0ccaf84` (`a = 2,5|3,5` + 9 specs : PLUS AUCUN
  tirage), `5b53b1be` (`(-a,5)+b` : virgule après une LETTRE, invisible à `\d,\d` ; plus aucun
  tirage), `9cc8cd82`, `f9a3333d`, `59ac62a2`, `99c4ab73` (`?*0,5 = …` : affiché `□*0,5` brut).
  Exercices : les 7 formules connues. Rien d'autre : `{{eval}}`/`{{if}}`, conditions et expressions
  passés au crible (appels effondrés de l'intérieur) ; exclusions `!a,b`, `!cd(a)` identiques ;
  autres tables de contenu sans formule `~…~`. `953574d4` (`{{a}},{{c}}` en réponse attendue) :
  correction identique (specs jouées), seul l'affichage après coup passe de `1.16` à `1,16`.
- **Atelier** : un objet rangé (lien, stockage) est relu sans provenance (`'url'`) et l'atelier en
  range avec une virgule (`formatSliderValue` : `0,3` ; commande : `0,5u_n + 3`) → 8 tests rouges
  (`recalcul-equivalence`, suites). `legacyDecimalCommas` (`parser/custom/legacy-decimal-commas.ts`)
  = règle exacte de l'ancien tokenizer, appliquée par `readByProvenance` hors saisie élève, et par
  la DSL géométrie (`sur ]0,5 ; 1,5[`, fonctionnalité voulue).
- Contenus : `scripts/reecrire-virgule-decimale-base.ts` (22 remplacements exacts comptés, 12
  lignes, dont `953574d4` et `9f380957` ajoutés après la CI : réponse attendue `{{a}},{{c}}` lue
  par l'outil de vérification des corrections ; au point, notation identique et affichage `1.16`
  comme avant), éprouvé en LOCAL (lignes de test aux mêmes ids : écriture, idempotence, relecture, règle
  par modèle). Transition vérifiée sur copies : (ancien code, ancien contenu) → (ancien, nouveau) →
  (nouveau, nouveau) : énoncés, LaTeX, réponses attendues identiques ; oracle des cases à unité
  inchangé. Dépôt réécrit : fixture `e0ccaf84`, `data/relecture/` 490 et 320.
- Mis à jour (ancienne tolérance assertée) : conditions `a>2,5` → `ConditionSyntaxError`,
  `{{eval:2,5*2}}` → `AuthorExpressionError`, `~3,14~` → message rouge.
- Revue Opus : DSL (`courbe("y = 0,5x")`, `avec x > 1,5` refusés) → chaînes du DSL par
  `legacyDecimalCommas` ; les trois refus traduits dans `french-errors.ts` (textes de la page
  virgule). CI : `scripts/corrections` ne lisait plus la réponse attendue `{{a}},{{c}}` → au point.
- **Limites laissées, hors PR** :
  - `[[1;2]]` : pas de `SEMICOLON` (Pratt `SYNTAX_ERROR`, RD `UNEXPECTED_TOKEN`) ;
  - un `{{eval}}` à unités dont la lecture maison échoue (`e0ccaf84` avant réécriture) dit
    « Unexpected token: , » : le repli LaTeX écrase le `DECIMAL_COMMA` du maison ;
  - `f(1,5)` : deux arguments en Pratt, `DECIMAL_COMMA` en RD (le RD maison n'a pas de fonctions
    génériques, écart d'avant la PR) ;
  - `courbe("y = { … , 0,5x … }")` : la virgule sépare aussi les morceaux, ambiguïté d'avant la PR ;
  - le script ne réécrit que des modèles publiés et des exercices ; des brouillons gardent des
    virgules dans des descriptions et des réponses (relevé par la revue), non lues par le parseur
    maison selon la mesure ;
  - réponse attendue affichée `1.16` (point anglais) pour `953574d4`, `9f380957` : comme avant.

### 2026-10-21 — décisions (16) et (17)

- **David** (sur recommandation) : (16) l'atelier garde `2 m 30 cm` = `(2[m]+30[cm])` = 2,3 m (calculatrice,
  écriture réelle d'élève, sans ambiguïté) ; le parseur garde son refus de `2[m] 30[cm]`, qui protège les
  réponses d'exercices de conversion. (17) Pas d'unités ′ et ″ pour l'instant : aucun cas réel (collège =
  degrés seuls, 0 angle juxtaposé à l'inventaire), et `′` sert déjà de prime (`f′`).

### 2026-10-20 — PR 5 codée : durées juxtaposées

- Inventaire : `}{` entre grandeurs, 0 en prod (modèles + exercices) et 0 dans le dépôt ; aucune durée
  ou angle juxtaposé écrit à la main. `;hms` : 4 modèles en prod.
- **David** : angles hors PR (les unités ′ et ″ n'existent pas dans mathAST : `15[′]` refusé par le
  tokenizer, `15[arcmin]` inconnue) ; PR 5 = durées seules, angles juxtaposés refusés.
- Marque : `AdditionNode.displayStyle?: 'juxtaposed'` (`juxtaposedSum`, `isJuxtaposedSum`). Module
  partagé `parser/juxtaposed-quantities.ts` ; Pratt : niveau `JUXTAPOSE = 22` (entre `+` et `*`) ; RD :
  niveau `parseJuxtaposed` entre additif et multiplicatif. Les 4 parseurs donnent les mêmes arbres.
- Refus `JUXTAPOSED_QUANTITIES`, trois textes (`operator`, `notDuration`, `missingUnit`), traduits par
  l'atelier. `2[m] 30` garde `MISSING_OPERATOR`. `{2[m]}{3[m]}` reste un produit, écrit avec `\times`.
- Écriture : `2[h] 30[min]` / `2~\unit{h}~30~\unit{min}`, sans parenthèses sous un signe ou après
  `−` (`-2[h] 30[min]`, `3[h]-1[h] 30[min]`, aller-retour exact).
- **Chemins mesurés** : les recopies génériques (`mapNode`, `mapNodeTopDown`, `cloneNode`,
  `replaceNode`, `stripUnnecessaryBrackets`, `removeNullTermsAST`, `substitute`) PERDAIENT la marque
  (`add(…)` sans style) ; corrigées (option `displayStyle` de `add`). Rendu testé par chemin : maison,
  LaTeX, spans colorés, structure, `computeQuantity`/`compositeDuration` (désormais somme juxtaposée),
  `;hms` (écrit toujours `{2[h]}{15[min]}`, lu en somme : `;[min]` → 135 min, plus 1 h²), carte de
  l'atelier. Garde : toute recopie `case 'addition' → add(…)` de `src/lib` passe `displayStyle`
  (rouge sans le correctif, vérifié).
- Atelier : `natural-quantities` laisse les durées juxtaposées au parseur (`2*1 h 30 min` aussi, par
  `DURATION_RUN`) ; `2 m 30 cm` reste `(2[m]+30[cm])` = 2,3 m (rien décidé d'autre). Tests changés :
  `1 h 30 min * 2`, `2 * 1 h 30 min`, **`1 h 30 min / 2`** (la phase 0 n'en nommait que deux ; même
  règle) → refus ; `2 h 30 en min` → « Chaque partie d'une durée composée a besoin de son unité ».
- Empreinte du corpus maison : 1 saisie sur 1 299 bouge (`{2[h]}{15[min]}`), régénérée.
- Suite serveur `src/lib` : 56 774 verts ; `check:incremental` 0 ; cliquet tenu ; lint rapide propre.
- Revue Opus (7 findings, tous corrigés, tests rouges sans les correctifs vérifiés) : durée composée
  signée en facteur écrite sans parenthèses (`(-2[h] 30[min])*2` relu refusé) → `needsParenthesesUnderSign` ;
  RD LaTeX ne refermait pas une couleur après une juxtaposition ; produit implicite signé de grandeurs
  écrit `-2 h 30 min` (relu somme) → `\times` ; aides de l'atelier perdues sur une durée (`h` du panneau) ;
  `DURATION_RUN` après `/` ou `^-` ; `\circ` avec une durée (Pratt/RD divergeaient → refus) ; couleur du
  signe en tête perdue. Suite : 56 786 verts.

### 2026-10-20 — PR « retrait de `BARE_PI` » codée

- Worktree `../ubumaths-wt-lecture-grandeurs`, branche `refactor/retrait-bare-pi`.
- Portée exacte de l'ancienne tolérance : `{{eval:…}}` (`parseEvalAst`), `conditions[]`
  (`normalizeCondition`) et — relevé par la revue — la condition `{{if:…}}` du bon choix d'un QCM
  (`resolveConditionalChoice`, sans filtre des variables ; 0 cas en prod comme au dépôt). Pas la
  condition d'un `{{if:…}}` d'énoncé ou de corrigé : `pi` y est un nom inconnu (laissée au navigateur,
  ou refusée en strict). Expression de variable lue entière seulement si `eval:…`. Les blocs courbe et
  trig ont leur propre lecture de `pi` : hors PR.
- Refus : `barePiRefusal` (`ubumark/parameterization/validator/bare-pi.ts`) → `AuthorExpressionError`
  / `ConditionSyntaxError`, « « pi » sans antislash se lit p × i ; écris \pi pour la constante π, ou p*i
  pour le produit ». `checkTemplate` l'attrape (génération) : import et publication bloqués.
- `pi` isolé = hors lettre **Unicode** (`\p{L}`) : l'ancienne règle ASCII prenait le `pi` de « pièce ».
- Inventaire (`rewriteBarePi`) : **199 `pi` nus, 18 modèles, tous `draft`**, identiques dans le dépôt
  (`scripts/questions/`) et en prod (1005 modèles lus, paginés : PostgREST plafonne à 1000). Le
  « 186 + 159 » d'avant comptait autrement. 0 dans tests/, data/, seeds.
- Dépôt réécrit textuellement (`scripts/inventaire-pi-nu.ts --ecrire`) : diff = 199 antislashes, rien
  d'autre ; 18/18 `question:specs` importables (3650 tirages) ; l'ancienne version de C-01 refusée.
- Prod : `scripts/reecrire-pi-nu-base.ts` (simulation par défaut, `--ecrire`, sauvegarde, relecture) ;
  garde `updated_at` (rien d'écrasé si le modèle a bougé) ; écriture éprouvée en LOCAL (modèle de test
  à 4 cas : 4 réécrits, `{{pi|e}}` et « pièce » intacts, ligne supprimée). Simulation prod = 199 / 18. La réécriture est compatible avec le code en prod (`\pi` y est déjà lu) :
  à faire AVANT le `deploy:prod` qui livre le refus.

### 2026-10-20 — PR 4 codée : l'unité multiplie tout le terme

- `parser/custom/unit-term.ts` (partagé Pratt/RD) : à chaque produit, quotient, signe construit, l'unité
  remonte sur le terme ; une grandeur formée ou des accolades le ferment (`braceWrap` : `2/{7[km]}`) ;
  E7 `AMBIGUOUS_TERM`, K2 `MISSING_NUMBER_BEFORE_UNIT` ; `:/` et `:` suivent `/`.
- Tokenizer : espaces entre chiffres ignorés, sauf en exposant/indice (`x^2 3` refusé, décision 14 tenue) ;
  `2 3` = 23 (test PR 3 mis à jour). `π` = constante dans les deux parseurs.
- `toCustom` : signe sans parenthèses (`-5[m]`), accolades à droite quand la relecture changerait
  (`needsClosedRightOperand`). Rendu LaTeX et maison des écritures dont l'arbre change : identique (test).
- Effets mesurés et réglés : atelier `v*3[h]` (v grandeur du panneau) refusé → `unitsOverQuantities` dans
  `computeQuantity` ; DSL géométrie `x = 2 * π` = 2π (π y était déjà réservé). Corpus maison : 1 saisie
  sur 1 299 change d'arbre (`{{eval:135[min];hms}}`), rendu identique.
- **David** (Q-T1, Q-T2) : `2*20[°C]` refusé et opaque (`isMultipliedTemperature`), `(2*20)[°C]` = 40 °C ;
  `-20[°C]` = −20 °C, donc `-20[°C]+30[°C]` refusé, `-20[°C]-5[°C]` = −25 K (remplace B2 ; `-(20[°C])+30[°C]`
  reste 10 K). Valide aussi : espaces sauf exposant, accolades qui ferment, `:/` comme `/`.
- Suite serveur `src/lib` : 56 471 tests verts ; `check:incremental` 0 ; cliquet tenu.
- Revue Opus : 1 bloquant (atelier `d/2[h]` = 5 km·h → l'unité redescend sur le dernier facteur quand
  une lettre se révèle grandeur, `unitOnLastFactor`), `toCustom` de `-(20[°C])` et du signe d'une grandeur
  (`startsWithSign` voit `unit`), mode coloré, `@red{…}` ferme, accolades inutiles après `:/`. Tests rouges
  sans les correctifs, vérifié. 56 480 tests verts.
- **David garde tel quel** : espaces entre chiffres partout (`2 1/2` = 21/2, `√2 3` = √23, `max(2 3)` = 23) ;
  `[t]`, `[s]`, `[a]` en tête refusés (unités) ; `2*20[°C]` ≢ `2\times20\unit{°C}` (les deux refusés).

### 2026-10-20 — PR 4 : inventaire des valeurs qui changent, π

- Mesure (sondes `arbre.ts`, `calcul.ts`) : un `/` devant le nombre qui porte l'unité met l'unité au
  dénominateur — `1/2[m]` 0,5 m⁻¹, `-1/2[m]`, `10^3/2[m]` 500 m⁻¹, `1/2/3[m]`, `1/2[km/h]` 0,5 h/km.
  `2*3[m]`, `-5[m]`, `2sqrt(2)[m]`, `10^3[m]` : même valeur, arbre seul. `6[m]/2*3[s]` 9 m·s (→ refus E7).
- **Inventaire : AUCUNE valeur ne change en prod.** Prod (1 005 modèles + 379 exercices, 24 543 calculs et
  expressions de variables) : 13 modèles portent une unité, toutes parenthésées ou seules (`(b*c)[kg]`,
  `(1[cm])/a`, `(c+d)/(1[m])`, `{{a}}[km]`) ; 0 `a/b[u]`, 0 forme E7, 0 unité seule (les 234 `;[m]` sont des
  modificateurs). `toCustom` parenthèse toujours (aller-retour vérifié, 18 cas) ; `braceWrap` met `{}` ;
  `expressedIn`, `natural-quantities`, `quantity-converter` parenthèsent ou écrivent un décimal. Dépôt :
  rien dans `scripts/questions/`, `tests/fixtures/` ; dans les tests, seulement grandeur/grandeur et un
  `'1/2[m]'` de détection de format (`input-detector-units.test.ts:55`).
- `a1[mm]` (prod) : `a1` est une variable (`1..11`) substituée avant la lecture.
- π : le parseur lit `pi` = p × i et `π` = une lettre ; `{{eval}}` remplace `pi` par `\pi` (`BARE_PI`,
  `29268f90c`, 2026-10-02). **David** : lettres grecques = `\…`, donc `pi` reste p × i ; `π` = la constante
  partout ; Q11 révisée (phase 0). Retrait de `BARE_PI` = PR à part (réécriture de 186 + 159 calculs).

### 2026-10-20 — PR 3 codée : codes précis des refus

- David valide les 4 fiches virgule en attente (S11, V1, V4, V7) : page virgule close 31/31.
- Portée = le tableau « PR 3 » de la phase 0 (pas seulement `MISSING_OPERATOR`) : lecture inchangée, seul le
  code change. Module partagé `parser/refusal-codes.ts` ; `INVALID_UNIT` retiré du type.
- Maison : le refus se précise dans `error()` (jeton courant refusé = nombre ; jeton précédent = lettre,
  symbole `pi`, `)` → `MISSING_OPERATOR` ; `.` collé → `LEADING_DECIMAL_POINT`). Mesuré : le tokenizer
  range `.` et `;` parmi les LETTER, d'où le filtre « vraie lettre ». `MISSING_DELIMITER` seulement quand la
  fin arrive avant le fermant (`(1+2]` garde `UNEXPECTED_TOKEN`).
- LaTeX : le refus existant « nombre après un facteur » passe ENTIER en `MISSING_OPERATOR` (`\sqrt{2}3`,
  `x^{2}3` compris : un refus, un code). Dans le maison, `|x|2` et `x^2 3` gardent `UNEXPECTED_TOKEN`
  (décision : lettre ou `)` seulement). Écart signalé à David → « suis LaTeX » : le maison refuse
  `MISSING_OPERATOR` après tout facteur (lettre, nombre, `)`, `]`, `}`, `|`, `%`), `2[m]3[m]` compris
  (la PR 5 le passera à `JUXTAPOSED_QUANTITIES`, dans les deux parseurs).
- Revue Opus : `1.2.3`, `x.5` recevaient « write 0.3 » (le `.` collé à un facteur n'est pas un point de
  tête) → corrigé avec le jeton d'avant le `.` ; suggestions ajoutées dans `error-context.ts`.
- Atelier : traduction ajoutée pour le nouveau texte de `.5` (« Il manque le zéro avant le point décimal :
  écris 0.5 »). Empreinte du corpus maison régénérée : 5 saisies bougent, toutes « code seul » (vérifié en
  ramenant les nouveaux codes aux anciens : même empreinte).

### 2026-10-20 — PR 2 codée : exposant signé, exposants empilés

- Page virgule réparée (v4) : un reste de la v1 après la liste des fiches cassait le script (« Chargement
  des réponses… » sans fin). 31 fiches affichées, 0 répondue.
- Parseur maison (Pratt + RD) : `^` + signe + UN nombre, UNE lettre ou un symbole ; signe devant `(`, `{`,
  `|`, `[`, une fonction → `NEGATIVE_EXPONENT_BEFORE_GROUP` ; autre chose (`2^--3`, `2^-`) → « Expected
  exponent » inchangé. `^` juste après un exposant → `STACKED_EXPONENTS`, dans les QUATRE parseurs
  (`2^{3}^{2}` compris, que TeX refuse aussi). Messages : `parser/exponent-rules.ts`.
- Mesuré : le LaTeX lisait `2^3^2` = 2^(3²) (la phase 0 disait « de gauche à droite », c'était le maison) ;
  `toLatex`/`toCustom` n'écrivent jamais d'empilement ; empreintes : maison 1/1 299 change (`e^x=e^(-x)`,
  le RD lit `^(`), LaTeX 2/4 122 (`x^2^3`, `a^b^c^d`, refusés).
- En plus : le RD maison lit `x^(…)` comme Pratt (il refusait `2^(x+1)` : le message de refus propose
  `2^(-…)`). Rattrapage `^-1` → `^(-1)` de l'atelier (`parse.ts`) retiré : devenu inutile, il ne servait
  plus qu'à lire `2^-x y`, refusé par décision (11).
- Hors périmètre, noté : le LaTeX Pratt lit `2^-x`, `e^-x^2` (= e^{-x²}), `2^-\sin(x)` ; le LaTeX RD les
  refuse (« Unexpected token: - »). MathLive met les accolades : à trancher plus tard s'il le faut.
- Revue Opus : corrigés `2^-f(x)` (fonction générique) refusé comme `2^-sin(x)`, et `f^-1(x)` = réciproque
  (il se lisait f⁻¹·(x)) — Pratt seul, le RD maison n'a pas de fonctions génériques. Laissés, notés :
  `x^2_1^3` lu par les 4 parseurs ; LaTeX Pratt accepte `f^{-1}^{2}(x)` (le RD le refuse), d'avant la PR.

### 2026-10-20 — page grandeurs terminée (81/81)

- 63 réponses de David + 18 fiches tranchées en conversation. Questions de David traitées en conversation :
  E7 (cas ambigus `6[m]/2*3[s]` : refus, nouveau code `AMBIGUOUS_TERM`), H5 (`·` séparateur mal lu → « et »
  sur la page v9 ; `pi[m]` = π[m]), I1/I4 (le calcul refuse toute lettre avec un message faux : tâche de
  l'atelier, hors chantier), J2 (°C non additifs : refus existant expliqué), K2 (`[m]` refusé,
  `MISSING_NUMBER_BEFORE_UNIT` ajouté au catalogue ; je ne sais pas pourquoi il en était absent).
- Validées sans commentaire : G10 (espace dans l'unité reste refusée), H3/H4 (π constante), I2/I3 (lettres
  dans le terme), K1 (`10^(3[m])` lu, le calcul refuse).
- Mesuré : `computeQuantity` refuse `x+1` et `x[m]` (« Ces grandeurs ne se combinent pas ») ; `6[m]/2*3[s]` =
  9 m·s, `6[m]/2/3[s]` = 1 m/s, `6[m]*2/3[s]` = 4 m/s aujourd'hui.

### 2026-10-20 — PR 1 codée : `×`, `·`, `⋅` lus `*`

- Tokenizer maison : `×`, `·`, `⋅` → jeton STAR qui garde le symbole tapé ; entre crochets d'unité, `·`/`⋅` → `.`,
  `×` → `*` (`3[m×s]` gardé par David). `2×` (lu « 2 fois la lettre × ») est désormais refusé comme `2*`.
- Revue Opus : le portier de l'atelier (`cli/core/input-detector.ts`) ne reconnaissait que `·` dans une unité →
  `⋅` et `×` ajoutés. Hors périmètre, noté : dans `pipeline.parse`, `2×3` (Unicode, sans crochet) part au LaTeX
  et y est refusé ; MathLive n'écrit jamais l'Unicode.
- Page grandeurs v8 : codes alignés sur le catalogue (F4, E12 → `JUXTAPOSED_QUANTITIES` ; G2 →
  `UNIT_EXPONENT_OUTSIDE` ; B7 → `NEGATIVE_EXPONENT_BEFORE_GROUP` / `STACKED_EXPONENTS` ; G11 → `UNKNOWN_UNIT` ;
  K2 : code à choisir si Q15 = refus) ; 18 fiches marquées « tranché en conversation » (champ `tranche`, hors
  « Ce qui reste », aucune réponse écrite à la place de David).

### 2026-10-20 — phase 0 validée (5e session)

- David valide les questions ouvertes 1 à 5 et toutes les lignes 🟡 ; ajoute `)2` à `MISSING_OPERATOR`.
- Mesures (parseur maison) qui corrigent la phase 0 : `2×` est accepté aujourd'hui (lettre ×) ; `10^+3` refusé
  (« Expected exponent ») ; `2^x y` refusé (« Multiple letters in exponent ») → `2^-x y` refusé aussi (et non
  `2^{-x}·y`) ; `(1+x)2`, `sqrt(2)3` refusés `UNEXPECTED_TOKEN` ; `(2)(3)` = produit ; `1/2/3[m]` = `(1/2)/(3[m])`.

### 2026-10-20 — phase 0 rédigée, sonde clavier des durées

- `docs/wip/lecture-grandeurs-phase0.md` : comportements par PR (6 PR), questions ouvertes. Recos données en
  conversation (LaTeX lit `×`/`·` Unicode ; `MISSING_OPERATOR` = nombre après un facteur ; `30[min] 2[h]` lu ;
  `{2[m]}{3[m]}` reste un produit ; lignes 🟡 telles quelles ; ordre 1→5 puis 6) : **pas encore validées**.
- Sonde au vrai clavier (Calcul et carte, tableau dans le fichier des sondes) : `2 h 30 min ± 2 h 30 min`,
  `3 h - 1 h 30 min`, `-2 h 30 min` marchent déjà ; `2*1 h 30 min` refusé par accident, `2 * 1 h 30 min` = 3 h.
- **David : `2*1 h 30 min` est ambigu ; validé : refus d'une durée composée collée à `*` ou `/`, des deux côtés,
  avec ou sans espaces, dans les parseurs ET l'atelier** (le test du lot C change d'attendu).

### 2026-10-20 — ouverture

- Né de la PR 2 bis de `correction-cases-unite` : `1/2[m]` est lu 1/(2[m]) = 0,5 m⁻¹ par les deux parseurs,
  alors que `\frac{1}{2}\unit{m}` vaut 0,5 m et que l'atelier lit `1/2 m` = (1/2) m.
- Brochure SI téléchargée et relue (§3, §5.2, §5.4.1-5.4.7).
- Règle proposée : l'unité multiplie tout le terme de nombres qui la précède (règle de l'atelier,
  décisions des 2026-10-11 et 2026-10-18).

### 2026-10-20 — langue interne du parseur maison : inventaire et décisions

Inventaire de qui écrit en syntaxe maison (prod lue en lecture seule, dépôt par grep) :

| Qui                                         | Combien                                                                | Écriture                                                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Modèles en prod, `{{eval:…}}`               | 884 / 1 005 modèles (538 publiés), 15 182 calculs                      | 266 décimaux à point, 911 virgules d'arguments, 3 172 `;` de modificateur                                  |
| Expressions de variables en prod            | 8 317 (4 590 calculs)                                                  | 81 décimaux à point (listes `1.5\|2`), 168 virgules d'arguments, 1 119 `;`                                 |
| Blocs ` ```courbe ` / ` ```figure ` en prod | 178 / 36                                                               | en-têtes déjà séparés par `;`                                                                              |
| `scripts/questions/`                        | 9 674 `{{eval:` dans 401 fichiers                                      | idem prod                                                                                                  |
| `tests/fixtures/`                           | 398 dans 29 fichiers                                                   | idem                                                                                                       |
| Valeurs réinjectées                         | chaque tirage                                                          | `braceWrap` → `evalResultToCustom` (toCustom → parseCustom)                                                |
| `toCustom` hors tests                       | ~330 appels, ~70 fichiers                                              | relu par parseCustom : `evalResultToCustom`, `clean-coefficients`, importeur LaTeX → maison, DSL géométrie |
| Atelier                                     | 32 appels `decimal-comma`                                              | déjà en (a) : `decimalCommaInput` à l'entrée, virgule à l'affichage                                        |
| Tests                                       | 487 lignes `parseCustom(` (90 fichiers), 342 `toCustom(` (51 fichiers) | —                                                                                                          |

- Option (b) (parseur maison en français) écartée : ~23 000 expressions de prod à migrer, 68 virgules
  séparatrices entre chiffres (`max(-9,1-a*b)`, `binom(24,5-k)`) qui changeraient de sens en silence,
  et `;` déjà pris par les modificateurs des modèles et les en-têtes de blocs.
- **David tranche (a)** : le parseur maison garde le point décimal.
- Virgule décimale tolérée par parseCustom : présente depuis le premier commit (`c698f9ce6`, 2025-12-02),
  sans décision écrite ; a coûté le bug `mod(16,4)` = mod(16.4) (`22930800f`, 2026-10-02, 153 tirages
  faux sur 1 050) et la pile de parenthèses du tokenizer. Usagers mesurés en prod : aucun calcul,
  condition, variable, bloc ni DSL ; **7 formules `~…~` d'exercices** (`0,02`, `0,57`, `f''(0,2)`,
  `cos(x)=0,8`, `sin(x)=0,5`, `0,89!=1`, `cos^2(x)+sin^2(x)=0,8^{2}+…`). `parse-student-domain` et
  l'atelier traduisent eux-mêmes avant le parseur.
- **David tranche : retirer la virgule décimale du parseur maison.** Les 7 formules seront réécrites au
  point (l'affichage remet la virgule via `toLocaleDecimal`). À mesurer dans la PR : chemins de l'atelier
  ou tests qui ne passeraient que grâce à la tolérance ; lecture de `(1,2)` et `[1,5]` sans elle.

### 2026-10-20 — pages à cocher mises à jour

- Réponses relues : page grandeurs, 13 « Validé », aucun « Non validé » ni « je ne tranche pas » ;
  page virgule, aucune réponse.
- Conflit avec la décision (3) : A3 (`2,5[m]` = 2,5 m, validé le 2026-10-20 à 06:05) devient un refus.
  David confirme. A3 réécrite et sa réponse effacée (remise à relire) ; B4, B5 réécrits au point.
- Correction d'une sonde : `π[m]` est analysé, mais π y est une variable et le calcul refuse ; H3 disait
  vrai. Ajouté sur H3/H4 : `\pi[m]` et `2\pi[m]` sont déjà calculés.
- Page virgule réécrite (version 2, 31 fiches) : point décimal, virgule toujours séparatrice (fonctions,
  matrices), `;` refusé ; Q-A et Q-M disparaissent. Sondes : `f(1,5)` = f(1.5) aujourd'hui (devient deux
  arguments), `max((2,5),3)` = max(2.5 ; 3) (devient refus), `[1,2]` = `(1.2)` (devient refus),
  `[[1,5, 2]]` = trois éléments (inchangé).

### 2026-10-20 — page grandeurs refaite : LECTURE d'abord, calcul à part

- Reproche de David : la page proposait des VALEURS (« 2500 m ») et présentait des refus du CALCUL comme
  des lectures (`2+3[m]`, `π[m]`, `10^(3[m])` sont lus ; c'est `computeQuantity` qui refuse).
- Page refaite (version 4) : « Lu aujourd'hui » = arbre parenthésé mesuré par sonde (`arbre.ts`, sur les 80
  écritures) ; « Lecture proposée » = arbre voulu ; puis, à la demande de David, « Calcul aujourd'hui »
  (mesuré : `computeQuantity`, mode exact) et « Calcul attendu » (écrit à la main, 37 fiches où il change).
- Lectures révélées : `π[m]` = π LETTRE (variable) ; `pi[m]` = p × (i[m]) avec i imaginaire ; `[m]` = la
  lettre m ; `2*1/2` se lit déjà 2 × (1/2) sans unité ; J4 `2*20[°C]` relève de la règle du terme
  ((2 × 20)[°C]), le refus reste au calcul ; K1 devient une question (lecture inchangée, ma reco, ou refus
  à la lecture).
- À faire : la page virgule (v2) écrit encore quelques valeurs (« max(2 ; 5) = 5 ») : à passer en arbres.

### 2026-10-20 — réponses A3, B5, B6, B7

- A3 (refus de `2,5[m]`), B5 (× lu comme *), B6 : validés.
- B7 « je ne tranche pas » : David craint `10^-3+4` (10^(−3)+4 ou 10^(−3+4) ?) et propose d'accepter `^-`
  seulement quand rien ne suit. Sondes : `10^3+4` = (10^3) + 4 ; `10^{-3}+4` = (10^(−3)) + 4 ;
  `10^-3` et `2^-x` refusés. L'atelier réécrit déjà `^-` + un nombre ou UNE lettre (pas suivi d'un autre
  `^`) en `^{-…}` (`NEGATIVE_EXPONENT`, `atelier/parse.ts`, 2026-10-13). Ma reco : la même règle dans le
  parseur maison (l'exposant sans accolades est UN élément, le signe y entre) ; refus de `e^-x^2` et de
  `2^-sin(x)` / `2^-(…)`. La condition « rien derrière » refuserait `10^-3[m]` et `10^-3*5`. Fiche B7
  précisée ; la page disait à tort que l'atelier « produit » `10^-3` : il l'ACCEPTE et le traduit.
- Vu en passant (hors périmètre, à signaler) : `2^3^2` est lu (2^3)^2, contre la convention 2^(3^2).

### 2026-10-20 — B9 exposants empilés, `10^-3*4`

- Fiche B9 ajoutée (page + corpus, Q17) : `2^3^2` = (2^3)^2 = 64, `e^x^2` = (e^x)², `2^3^2[m]` = ((2^3)^2)[m].
  0 exposant empilé sans accolades en prod (modèles + exercices) ; `toCustom` écrit `2^{3^2}` / `(2^3)^2`.
  Reco : refus. Le corpus .md porte désormais un avertissement : la page à cocher fait foi.
- `10^-3*4` aujourd'hui (parseur maison) : refus « Negative exponent requires braces » ; `10^{-3}*4` =
  (10^(−3)) × 4. Avec la reco B7 : (10^(−3)) × 4.

### 2026-10-20 — refus : parseur ou atelier ?

- Question de David : le message « Deux exposants à la suite… » est-il dans le parseur ou l'atelier ? Les
  deux : le parseur décide du refus (code `ParseErrorCode` + message anglais), l'atelier traduit
  (`french-errors.ts`, 2026-10-12, 54 traductions ; parmi les messages du corpus, seul « Invalid unit »
  est traduit). **David garde ce découpage.**
- Code d'erreur = un nom parmi 17 (`UNEXPECTED_TOKEN`, `INVALID_UNIT`, `INVALID_SUPERSCRIPT`…), plus le
  message, la position et le contexte. Mesuré : 30 des 36 refus du corpus sont `UNEXPECTED_TOKEN`, et
  `10[m]^3`, `kg/m.s`, `m s` sont classés `INVALID_UNIT`. Proposé sur les fiches : des codes précis
  (nouveaux) pour que l'atelier traduise par code, pas par le texte anglais.
- Fiches de refus réécrites (lignes « Refus du parseur » / « Message de l'atelier (plus tard) ») ; page
  virgule passée en arbres. Découvert : `f(x;y)` et `max(x;y)` sont LUS, « ; » comme une lettre (P3).

### 2026-10-20 — codes d'erreur précis

- **David : « je veux des codes précis ».** Le parseur rend un code par cause de refus ; l'atelier traduit
  par code, plus par le texte anglais.
- Mesuré en plus : `2×3` est refusé (`UNEXPECTED_TOKEN`), le parseur maison ne connaît que `*` ; `(1+2` rend
  `UNEXPECTED_TOKEN` alors que `MISSING_DELIMITER` existe. Catalogue proposé à David (en attente).

### 2026-10-20 — Q9 : durées juxtaposées lues comme une somme

- Mesuré : l'atelier refuse `2~\unit{h}~30~\unit{min}` (« Nombre « 30 » écrit après un facteur… ») ; il
  n'affiche « 2 h 30 min » qu'en SORTIE (`compositeDuration`). Les champs réponse acceptent déjà
  « 2 h 15 min » via `readCompositeDuration` (`questions/units/composite-duration.ts`, lot 3), hors parseur,
  quand l'attendu est une durée. Pas de nœud durée dans mathAST ; `HMSValue` (`questions/units/types.ts`)
  n'est utilisé nulle part.
- Bug 1 h² : `{2[h]}{30[min]}` (écrit par `;hms`) est un produit implicite ; `computeQuantity` rend 1 h², l'atelier
  aussi avec `\left(2~\unit{h}\right)\left(30~\unit{min}\right)`. Les modèles sont protégés par la garde
  « Produit de durées » (`evaluate-with-modifiers.ts:494`).
- David : l'atelier et MathLive doivent accepter l'écriture naturelle « 2h 30 min ». Options (a) parseur lit
  une somme juxtaposée, (b) l'atelier réutilise `readCompositeDuration`, (c) nœud durée. **David tranche (a)**,
  « il faudra gérer le vrai risque » : la marque perdue par une transformation (échec bénin : « 2 h + 30 min »,
  valeur juste). Fiches F1-F3 notées sur la page.
- Coût : chaque parseur a deux implémentations (Pratt par défaut, RD) ; modèle à suivre :
  `parser/number-after-factor.ts`. Touchés aussi : `juxtaposesQuantities` (latex-generator ×2,
  `build-structure.ts`), le générateur maison, `;hms`, `compositeDuration`.
- Q9 complétée par David : angles comme les durées ; autres grandeurs juxtaposées refusées
  (`JUXTAPOSED_QUANTITIES`) ; gestion du risque validée (mesure des chemins, tests de rendu, garde).
- Erreur de ma part : `2×3` refusé n'était pas une découverte, c'est la fiche B5 (Q7, « × lu comme * »),
  validée par David. Mesuré : le parseur maison lit `*` (style `cross`) et le produit implicite (`2x`,
  `2(x+1)`), refuse `×`, `·`, `⋅`, `\times`, `\cdot` ; le parseur LaTeX lit `\times`, `\cdot`, `*`, l'implicite,
  et refuse `×`/`·` Unicode (« Nombre « 3 » écrit après un facteur »).
- David : `·` et `⋅` lus comme `*` ; acceptés aussi dans les unités entre crochets. Mesuré : `3[m·s^-1]`
  refusé par le tokenizer maison (« Expected ']' after unit ») alors que `units/parser.ts:81` accepte `·`.
- B7 validée par David (fiche, règle de l'atelier depuis le 2026-10-13) : `10^-3+4` = 10^{-3}+4. Réponse
  notée sur la page (choix « ok »).
- B9 : David — empilé = 2^(3^2) ; refus dans le parseur maison ; mesurer MathLive. Mesure au vrai clavier
  (MathLive 0.111, sonde `mathlive-clavier` dans le fichier des sondes) : `2^3^2` → `2^2` (!), `2^3→^2` →
  `2^2`, `e^x^2` → `e^{x^2}`, `e^-x^2` → `e^{-x^2}`, `10^-3+4` → `10^{-3+4}`, `10^-3→+4` → `10^{-3}+4`,
  `2^^3` → `2^{^3}`. MathLive met TOUJOURS les accolades : le parseur LaTeX ne reçoit jamais `2^3^2` d'un élève.
  Vu en passant : taper `^` sur un exposant à un chiffre REMPLACE l'exposant (le 3 disparaît) ; `10^-3+4`
  reste dans l'exposant tant que l'élève ne sort pas avec →.

### 2026-10-20 — catalogue des codes validé

- David valide les trois refus de B7 et le catalogue. **14 codes** : `DECIMAL_COMMA`, `LEADING_DECIMAL_POINT`,
  `STACKED_EXPONENTS`, `JUXTAPOSED_QUANTITIES`, `MISSING_OPERATOR`, `SEMICOLON`, `UNEXPECTED_COMMA`,
  `UNIT_EXPONENT_OUTSIDE`, `AMBIGUOUS_UNIT`, `SPACE_IN_UNIT`, `UNKNOWN_UNIT`, `EMPTY_UNIT`, `MISSING_DELIMITER`
  (existant, enfin utilisé), `NEGATIVE_EXPONENT_BEFORE_GROUP`. `INVALID_UNIT` disparaît ; `UNEXPECTED_TOKEN`
  reste en dernier recours. `SEMICOLON` et `UNEXPECTED_COMMA` suivront les réponses de la page virgule (P3 :
  `f(x;y)`).
- B9 côté LaTeX : David suit la reco, `2^3^2` refusé aussi par le parseur LaTeX (MathLive ne le produit jamais).
