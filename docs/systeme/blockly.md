---
couvre:
  - 'src/lib/shared/blockly/**'
  - 'src/lib/components/blockly/**'
  - src/lib/stores/blocklyPlayground.svelte.ts
  - 'src/routes/(protected)/dev/blockly/**'
  - 'src/routes/(public)/tortue/**'
  - src/lib/workers/js-sandbox.worker.ts
  - src/lib/workers/js-sandbox-source.ts
  - 'static/blockly/**'
---

# Blockly — programmation par blocs

> Écrite à partir du code le 2026-11-14 (chantier `blockly`, journal
> `docs/wip/blockly-progress.md`). Vérifié contre le code le 2026-11-14 (écran du geste, PR 4b, le même jour) ; programme de calcul (logique, PR 5a) et `départ:` le 2026-11-14 ; écran du programme de calcul (PR 5b) le 2026-11-14.

## À quoi ça sert

L'élève assemble des **blocs** (Blockly) ; Chiphre en tire du **JavaScript** ou du **Python** et
l'exécute, la sortie s'affiche dans une console. Programme visé : algorithmique par blocs du cycle 3
et du cycle 4 (Scratch au BO), relais vers Python au lycée.

Deux pages, rien n'est enregistré :

- **`/tortue`, « La Tortue »** (publique, sans connexion, dans le menu et le sitemap) : bac à
  sable de la tortue seule. **Aucun JavaScript n'y est exécuté** : seul l'interpréteur de blocs
  tourne ; le code Python est un aperçu replié (« Voir en Python »).
- **`/dev/blockly`** (réservée à l'admin) : prototype à deux modes, **Programme** (console, code
  exécuté dans le worker JS ou Pyodide) et **Tortue** (quadrillage, tracé instantané).

Dans une question (bloc ubumark ```tortue, cf. [ubumark](ubumark.md) et
[questions](questions.md)), la réponse de l'élève est son programme, écrit en **notation texte**
et jugé sur son tracé (§ Programme tortue en réponse), avec les blocs dans la carte, un corrigé
dessiné et un PDF « À faire sur Chiphre » (§ L'écran d'une question tortue).

## Carte du code

| Fichier                                                       | Rôle                                                                                                                                                             |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/(public)/tortue/+page.svelte`                     | Page publique « La Tortue », monte `TortueBacASable`                                                                                                             |
| `src/lib/components/blockly/TortueBacASable.svelte`           | Blocs tortue, boutons Lancer / Tout de suite / Effacer, quadrillage animé, aperçu Python replié ; onglets Blocs / Tortue sous `lg`                               |
| `src/routes/(protected)/dev/blockly/+page.svelte`             | Page de test, monte `BlocklyPlayground`                                                                                                                          |
| `src/lib/components/blockly/BlocklyPlayground.svelte`         | Assemble espace de travail, barre d'outils, aperçu du code, console                                                                                              |
| `src/lib/components/blockly/BlocklyWorkspace.svelte`          | `Blockly.inject` ; charge la locale française (`blockly/msg/fr`) avant                                                                                           |
| `src/lib/stores/blocklyPlayground.svelte.ts`                  | État de la page (langage, code, sortie)                                                                                                                          |
| `src/lib/shared/blockly/config.ts`                            | `BLOCKLY_CONFIG` (délais, limites), `DEFAULT_WORKSPACE_OPTIONS`, thème `CHIPHRE_THEME`, messages d'erreur                                                        |
| `src/lib/shared/blockly/toolbox/standard.ts`                  | Boîte à outils : Logique, Boucles, Math, Texte, Listes, Variables, Fonctions                                                                                     |
| `src/lib/shared/blockly/generators/`                          | `generateCode` / `getRawCode` (générateurs Blockly), enveloppes `wrapJavaScriptCode` / `wrapPythonCode`, garde-fous (longueur, boucles infinies)                 |
| `src/lib/shared/blockly/execution/blockly-executor.svelte.ts` | Aiguille vers `JsExecutor` ou, chargé à la demande, le `PlaygroundExecutor` Python (Pyodide, cf. [python/](python/))                                             |
| `src/lib/shared/blockly/execution/js-executor.svelte.ts`      | Pilote le worker JavaScript                                                                                                                                      |
| `src/lib/workers/js-sandbox.worker.ts`                        | Sandbox JavaScript : globales filtrées, délai de 10 s, sortie limitée                                                                                            |
| `src/lib/workers/js-sandbox-source.ts`                        | Source de la fonction sandbox (sans effet de bord, testable sous Node)                                                                                           |
| `src/lib/shared/blockly/lecture.ts`                           | Lecture commune (tortue, calcul) : état sérialisé → `BlocLu` vérifié (`lirePiles`), `premierBlocInconnu`, `nombreDeTours`                                        |
| `src/lib/shared/blockly/calcul/interpreteur.ts`               | `executerCalcul(etat, nombre)` : interprète un programme de calcul pour un nombre de départ (ADR 0039), rend les nombres affichés                                |
| `src/lib/shared/blockly/calcul/notation.ts`                   | `etatVersTexteCalcul` / `texteVersEtatCalcul` : `résultat = nombre + 2 ; afficher résultat × 4` ↔ état Blockly                                                   |
| `src/lib/shared/blockly/calcul/jugement.ts`                   | `jugerProgrammeCalcul` (mêmes affichages sur chaque essai), `lireProgrammeCalcul`, `lireEssais` / `ecrireEssais`, `ESSAIS_PAR_DEFAUT`                            |
| `src/lib/shared/blockly/calcul/blocs.ts`                      | `definirBlocsCalcul` : définitions Blockly des blocs de calcul (sans générateur) ; **seul fichier de `calcul/` qui importe Blockly**                             |
| `src/lib/shared/blockly/calcul/toolbox.ts`                    | `CALCUL_TOOLBOX` (Calcul, Résultat, Afficher, Boucles avec `controls_repeat` seul), `COULEURS_CALCUL` ; sans import de Blockly                                   |
| `src/lib/components/blockly/CalculEditeur.svelte`             | Éditeur d'une question de calcul (blocs, « Essayer avec », Lancer, affichages) ; rend le programme en texte à chaque modification ; chargé à la demande          |
| `src/lib/shared/blockly/tortue/interpreteur.ts`               | `executerTortue` : interprète l'état sérialisé des blocs tortue (ADR 0039), rend segments, tortue finale et étapes                                               |
| `src/lib/shared/blockly/tortue/animation.ts`                  | `imageAnimation` (image à l'étape i), `rythmeAnimation` (durée d'un tic, étapes par tic)                                                                         |
| `src/lib/shared/blockly/tortue/segments.ts`                   | Arrondi, `normaliserSegments` / `memesTraces` (comparer deux tracés sans le chemin), `memesFormes` (8 symétries + translation), `sortDuCadre`                    |
| `src/lib/shared/blockly/tortue/notation.ts`                   | `etatVersTexte` / `texteVersEtat` : programme en notation texte (`répéter 4 [ avancer 3 ; tourner à droite 90 ]`) ↔ état Blockly                                 |
| `src/lib/shared/blockly/tortue/jugement.ts`                   | `jugerProgrammeTortue` (comparaison `position` ou `forme`), `lireProgrammeTortue` (segments ou message d'erreur)                                                 |
| `src/lib/shared/blockly/tortue/blocs.ts`                      | `definirBlocsTortue` : définitions Blockly et générateurs d'aperçu JS / Python (`from turtle import *`)                                                          |
| `src/lib/shared/blockly/tortue/toolbox.ts`                    | `TORTUE_TOOLBOX` : Tortue, « répéter n fois » (`controls_repeat`, champ entier ≥ 0), nombre — uniquement des blocs interprétés                                   |
| `src/lib/components/blockly/TortueCanvas.svelte`              | Quadrillage fixe 20 × 20 en SVG, segments coupés au cadre, dépassement signalé ; figure modèle en gris, attendu en pointillés, tracé vert / rouge ; sans Blockly |
| `src/lib/components/blockly/TortueEditeur.svelte`             | Éditeur d'une question tortue (blocs, Lancer, quadrillage, onglets sous `lg`) ; rend le programme en texte à chaque modification ; chargé à la demande           |
| `static/blockly/media/`                                       | Médias de Blockly (corbeille, sprites, icônes), servis par Chiphre                                                                                               |

## Invariants

- **Aucune requête vers un tiers depuis le navigateur des élèves** : `DEFAULT_WORKSPACE_OPTIONS.media`
  vaut `BLOCKLY_MEDIA_PATH` (`/blockly/media/`). Une montée de Blockly recopie
  `node_modules/blockly/media` dans `static/blockly/media` ; `media.test.ts` échoue sinon. Sons
  coupés.
- **Sandbox JavaScript** : le code reçoit uniquement des globales sûres, en **paramètres** d'une
  fonction en mode strict ; les globales dangereuses (`window`, `fetch`, `Function`…) y valent
  `undefined`. `eval` et `arguments` ne peuvent pas être des paramètres en mode strict
  (`construireSourceSandbox` refuse) : `eval` est retiré de la portée globale du worker au
  démarrage. `checkDangerousPatterns` refuse `constructor` / `__proto__` / affectation de
  `prototype`.
- **Boucle infinie** : le délai dépassé (ou `cancel`) fait `terminate()` puis recrée le worker
  (`relancerWorker`, `js-executor.svelte.ts`) ; un worker bloqué ne lit plus ses messages.
- **La sortie passe par la console du worker** : `wrapJavaScriptCode` n'intercepte ni
  `console.log` ni les erreurs ; une erreur remonte au worker, qui l'affiche.
- **Générateurs remplacés** (`installerGenerateursChiphre`, appelée avant chaque génération, jamais
  au chargement du module) : `text_print` écrit par `console.log` (Blockly génère
  `window.alert`, bloqué dans le sandbox).
- **Python** : `base-executor.svelte.ts` n'importe aucune **valeur** du barrel
  `$lib/shared/python` (import circulaire quand Blockly charge l'exécuteur par son fichier).
- Renderer `thrasos` explicite (défaut depuis Blockly 13).

## Tortue

- **Exécutée par l'interpréteur, jamais par le code généré** ([ADR 0039](../adr/0039-blocs-interpretes-par-chiphre.md)).
  `executerTortue` lit `Blockly.serialization.workspaces.save` (sans dépendre de Blockly) ; le
  code JS / Python n'est qu'un aperçu. Un bloc inconnu, même dans une entrée valeur, refuse tout
  le programme (rien n'est tracé).
- Blocs : `tortue_avancer` / `tortue_reculer` (entrée `VALEUR`), `tortue_gauche` /
  `tortue_droite` (entrée `ANGLE`), `tortue_lever_stylo`, `tortue_baisser_stylo` ;
  `controls_repeat` / `controls_repeat_ext` (répétitions arrondies à l'entier inférieur, négatives
  → 0), `math_number`. Entrée vide → 0, bloc désactivé → ignoré, nombre posé seul → ignoré. Piles
  exécutées de haut en bas ; les suivants (`next`) sont lus en boucle, seule l'imbrication
  (bornée à 1 000) fait récursion.
- Repère : unité = un carreau, départ en (0, 0), cap 0 = vers la droite, tourner à gauche = sens
  direct, stylo baissé. Coordonnées arrondies au milliardième après chaque déplacement.
- **`LIMITE_PAS` = 10 000** (blocs exécutés et tours de boucle, même vides) : au-delà, arrêt
  `trop-long` avec le tracé partiel. **`DISTANCE_MAX` = 1 000 000** carreaux du départ : au-delà,
  arrêt `trop-loin` avant tout `Infinity` / `NaN`. Toute autre exception → `programme-illisible` :
  `executerTortue` ne lève jamais.
- En mode Programme, un espace de travail qui contient un bloc tortue n'est pas envoyé au worker
  (message « Les blocs tortue s'exécutent en mode Tortue. »).
- **Étapes** : après chaque déplacement, virage ou changement de stylo (pas pour une boucle),
  l'interpréteur note la tortue et le nombre de segments déjà tracés (`etapes`). Programme refusé
  → aucune étape ; arrêt `trop-long` → étapes jusqu'au tracé partiel.
- **Boîte à outils** : `controls_repeat` (champ entier ≥ 0 : ni virgule ni négatif ne se
  saisissent) ; l'interpréteur lit encore `controls_repeat_ext`, qui reviendra avec les variables.
- Quadrillage fixe 20 × 20 (`DEMI_COTE_CADRE`). Sur `/dev/blockly`, tracé instantané ; sur
  `/tortue`, **animé** : pause de 600 ms au départ (`PAUSE_DEPART_MS`, tortue au départ, rien de
  tracé), puis 300 ms par étape jusqu'à 40 étapes, au-delà l'animation entière dure
  12 s (plusieurs étapes par tic sous 16 ms) ; « Tout de suite » saute à la fin, toute
  modification des blocs arrête l'animation et vide le quadrillage ; le message (fin ou erreur)
  s'affiche à la fin de l'animation.
- **Téléphone et tablette en portrait** (sous `lg`, 1024 px) : onglets « Blocs » / « Tortue », un
  panneau à la fois ; « Lancer » bascule sur Tortue. L'espace de blocs est masqué, jamais démonté
  (le programme reste) ; Blockly se redimensionne au retour (`ResizeObserver`). Au-dessus de `lg`,
  les deux panneaux côte à côte, sans onglets ; les boutons sont au-dessus des deux.

## Programme tortue en réponse

- **Notation texte** (`notation.ts`) : `avancer n`, `reculer n`, `tourner à droite n`,
  `tourner à gauche n`, `lever le stylo`, `baisser le stylo`, `répéter n [ … ]`, séparées par `;`
  ou un retour à la ligne (`\r\n` compris, blancs autour admis). Lecture souple (accents, majuscules, espaces, virgule ou point
  décimal) ; écriture canonique (accents, virgule, `;`, `[ … ]` espacés). C'est ce que l'auteur
  écrit dans `attendu:` et ce qui est **enregistré** comme réponse de l'élève : une réponse fait au
  plus 2 000 caractères (`MAX_ANSWER_LENGTH`) et l'état Blockly sérialisé est trop bavard (un
  carré ≈ 700 caractères). `LONGUEUR_MAX_PROGRAMME` = `MAX_ANSWER_LENGTH - 1` : l'envoi tronque
  une réponse trop longue à `MAX_ANSWER_LENGTH`, un programme de cette longueur exacte peut avoir
  été coupé (et rejoué comme un autre programme) : il est refusé (« Programme trop long »).
- `etatVersTexte` suit l'exécution : piles de haut en bas, blocs désactivés et nombres posés
  seuls ignorés, entrée vide → 0, répétitions à l'entier inférieur ; un bloc inconnu refuse tout.
  `texteVersEtat` rend une seule pile (`controls_repeat`, ombres `math_number`), rejouable par
  `executerTortue` et rechargeable dans l'espace de blocs. Refus : instruction inconnue (le
  message la cite), nombre absent ou illisible, `répéter` sans entier ≥ 0 ou sans crochets,
  crochets mal appariés, plus de 50 répétitions imbriquées, texte trop long. Un aller-retour
  texte → blocs → texte rend le même texte.
- **Jugement** (`jugement.ts`) : les deux programmes rejoués, segments comparés sans ordre ni
  chemin. `position` : même figure au même endroit (`memesTraces`) ; `forme` : à une translation,
  un quart de tour, un demi-tour ou un retournement près (`memesFormes`, les 8 symétries du
  quadrillage, chaque tracé ramené au coin bas gauche de son encadrement). Une rotation d'un
  autre angle ne compte pas. Réponse vide → faux sans message ; illisible, trop longue ou trop
  loin → faux avec le message de la tortue ; attendu illisible ou sans trait → jamais juste.
- `normaliserSegments` range chaque droite dans une case de taille 1e-6 (direction, décalage) et
  cherche sa pareille dans les cases voisines : deux morceaux d'une même droite à cheval sur une
  frontière d'arrondi sont fusionnés (avant la PR 4, une clé arrondie pouvait les séparer).

## Programme de calcul en réponse

Programmes de calcul de 5e (« choisir un nombre, ajouter 2, multiplier par 4 »), bloc `calcul
d'une question ([ubumark](ubumark.md)). Logique en PR 5a, écran en PR 5b (cf. « L'écran d'une
question de calcul »).

- **Blocs interprétés** (`calcul/interpreteur.ts`, ADR 0039) : `calcul_nombre_choisi` (le nombre
  de départ, lu seulement : la variable de 5e « en lecture d'une donnée saisie »), `math_number`,
  `calcul_operation` (champ `OP` : `ADD`, `MINUS`, `MULTIPLY`, `DIVIDE`, entrées `A` et `B`),
  `calcul_resultat` (l'unique variable, 0 au départ), `calcul_mettre_resultat`,
  `calcul_afficher`, `controls_repeat` (nombre de tours écrit dans le bloc ; `controls_repeat_ext`, à
  nombre de tours calculé, est inconnu : il ne s'écrirait pas en texte). L'élève ne crée pas de variable (4e). Entrée vide
  → 0 ; blocs désactivés et calculs posés seuls ignorés ; piles de haut en bas. Erreurs : bloc
  inconnu (même dans une entrée, `math_arithmetic` compris), opération inconnue (illisible),
  division par zéro, nombre devenu infini, plus de 10 000 pas (`LIMITE_PAS_CALCUL` ; une opération compte un pas, comme une instruction
  ou un tour de boucle : un long calcul répété reste borné) ; les
  affichages déjà faits sont rendus.
- **Notation texte** (`calcul/notation.ts`) : `afficher <calcul>`, `résultat = <calcul>` (ou
  `mettre résultat à <calcul>`), `répéter n [ … ]`, séparées par `;` ou un retour à la ligne.
  Calculs : nombres, `nombre` (ou `nombre choisi`), `résultat`, `+ − × ÷` (aussi `- * / :`),
  parenthèses ; × et ÷ avant + et −, de gauche à droite ; `−` devant un nombre en fait un
  négatif (`nombre + -3` d'une variable tirée), devant autre chose c'est refusé (écrire `0 − …`).
  Écriture canonique : `−`, `×`, `÷`, virgule décimale, sans exposant (`1e21` ne se relirait
  pas), parenthèses là seulement où l'arbre les exige — à droite d'une opération de même
  priorité aussi (`2 × (3 × 4)` reste tel quel) et autour d'un négatif opérande (`nombre + (−3)`).
  Un nombre trop grand pour être lu est refusé (jamais lu 0). Même longueur maximale que la tortue (`LONGUEUR_MAX_PROGRAMME`). Un nombre dans une entrée part
  en ombre ; un calcul, posé sur une ombre 0.
- **Jugement** (`calcul/jugement.ts`) : référence et réponse rejouées sur chaque nombre d'essai
  (`essais:`, sinon `ESSAIS_PAR_DEFAUT` = −3 ; 0 ; 1 ; 2 ; 5 ; 10 ; 0,5 — un seul essai ne
  sépare pas `× 2` de `+ 2`) ; juste si mêmes nombres affichés, dans le même ordre, ni plus ni
  moins, pour chaque essai (`memesAffichages`, marge relative 1e-9 : 0,1 + 0,2 = 0,3, pas 0,3001 ; près de 0, marge absolue 1e-12 : 10⁻¹¹ ≠ 0).
  Réponse vide → faux sans message ; illisible → le message de lecture ; erreur sur un essai →
  « Avec le nombre 0 : Division par zéro… » ; rien d'affiché sur aucun essai → « Ton programme
  n'affiche rien. » ; référence illisible, muette sur un essai ou en erreur, ou aucun essai →
  jamais juste (refusée à la publication).

## L'écran d'une question tortue

- **Carte** : `TortueProgramme.svelte` (nœud ubumark, `components/markdown/nodes/`), monté par
  `FillBlanksInput` à la place du bloc (case `data-construire-case`). Il montre d'abord le
  quadrillage seul (rendu serveur, figure `montrer: oui` en gris), puis charge
  `TortueEditeur.svelte` par `import()` au montage : Blockly n'est téléchargé que par une carte
  tortue. Chaque modification des blocs donne `etatVersTexte` ; la réponse de la case est ce texte,
  ou `''` quand le programme est vide, trop long (> `LONGUEUR_MAX_PROGRAMME`, message « Programme
  trop long », gardé après la validation) ou illisible. Une réponse déjà donnée revient en blocs
  (`texteVersEtat`) sans être renvoyée, même écrite autrement que `etatVersTexte` (point décimal).
  `FillBlanksInput` recrée la carte quand le bloc change (`{#key node.source}`).
- **Après la validation** (case verrouillée) : l'espace de blocs est recréé en lecture seule
  (`BlocklyWorkspace`, `readonly`), sans « Effacer » ; le quadrillage montre tout de suite le tracé
  final du programme de l'élève, vert juste ou rouge faux, et l'attendu en pointillés quand il est
  connu : réponse attendue de la case (`position | <programme>`), sinon `attendu:` du bloc. Jamais
  en évaluation notée (`attendu: ?`, case masquée). « Lancer » rejoue l'animation.
- **Corrigé** (copie corrigée, bonne réponse) : `TortueCorrige.svelte` via `BuildAnswer`, sans
  Blockly : quadrillage (tracé de l'élève et attendu en pointillés, ou tracé juste seul) et
  programmes en texte (« Ton programme », « Un programme juste »). La ligne `build` de
  `expected-result.ts` porte la réponse attendue (`expected`), seul endroit où un énoncé masqué
  garde le programme de référence.
- **Hors question** (aperçu de l'éditeur riche, aide à l'écriture, `MarkdownRenderer` et
  `StaticBlockNode`) : la même carte, geste libre, rien de jugé.
- **PDF** (`ubumark/generators/tortue-typst.ts`) : cf. [ubumark](ubumark.md).

## L'écran d'une question de calcul

- **Carte** : `CalculProgramme.svelte`, monté par `FillBlanksInput` (case `data-construire-case`),
  `MarkdownRenderer` et `StaticBlockNode` (geste libre). Cadre d'attente au rendu serveur, puis
  `CalculEditeur.svelte` chargé par `import()`. Mêmes règles de réponse que la tortue : texte
  `etatVersTexteCalcul`, `''` si vide, trop long (« Programme trop long ») ou illisible ; réponse
  déjà donnée rechargée sans être renvoyée ; `{#key node.source}`.
- **« Essayer avec »** : champ (`data-calcul-focus`, focalisé à l'ouverture de la question),
  5 proposé, lu par `lireEssais` (virgule, `−`) ; « Lancer » ou Entrée → `executerCalcul` sur ce
  nombre : « Avec 2,5, le programme affiche : 18 ; 4,5 » (50 affichages au plus), « n'affiche
  rien », ou le message d'erreur (division par zéro…) sous les affichages déjà faits. Nombre
  illisible → « Écris un nombre… ». Toute modification des blocs efface le dernier lancer.
- **`départ:`** (calcul et tortue) : posé dans l'espace de travail quand la case est vide et pas
  jugée (aussi projeté en classe) ; il ne devient la réponse qu'au premier changement (Valider reste grisé tant que
  l'élève n'y a pas touché). Espace vidé puis carte recréée (autre question et retour) : le départ
  revient (réponse vide = pas répondu, retour à l'état de départ). Case jugée sans réponse : espace
  vide, jamais le départ.
- **Après la validation** : blocs en lecture seule, sans « Effacer », cadre vert ou rouge ;
  « Essayer avec » marche encore.
- **Corrigé** : `CalculCorrige.svelte` via `BuildAnswer`, sans Blockly : « Ton programme », « Un
  programme juste » (réponse attendue de la case, sinon `attendu:`), tableau « Nombre choisi →
  Ton programme affiche / Il fallait afficher » sur les essais, lignes fausses marquées
  (`data-juste`) ; « erreur », « rien » dans une cellule ; message de l'élève sous le tableau.
  Référence inconnue (`attendu: ?`) : la colonne de l'élève seule.
- **PDF** (`ubumark/generators/calcul-typst.ts`) : le cadre « À faire sur Chiphre » seul.

## Comment étendre

- Nouveau bloc de calcul : définition dans `calcul/blocs.ts`, entrée dans `CALCUL_TOOLBOX`, cas
  dans `executerCalcul` (et `INSTRUCTIONS` / `VALEURS` de `calcul/interpreteur.ts`), écriture et lecture dans `calcul/notation.ts` (l'aller-retour doit
  garder le calcul : `notation.test.ts`).
- Nouveau bloc tortue : définition et aperçu dans `tortue/blocs.ts`, cas dans `executerTortue`
  (et dans `INSTRUCTIONS` / `VALEURS`), entrée dans `TORTUE_TOOLBOX` ; `blocs.test.ts` vérifie
  que chaque bloc de la boîte à outils est interprétable.
- Nouveau bloc : définition JSON + générateurs JavaScript **et** Python, entrée dans la boîte à
  outils ; un test qui génère le code depuis un `Blockly.Workspace` sans interface et l'exécute dans
  `construireSourceSandbox` (modèle : `generators/__tests__/print.test.ts`).
- Générateur Blockly inadapté au sandbox : le remplacer dans `installerGenerateursChiphre`.

## Tests

- `src/lib/shared/blockly/__tests__/` : types, médias.
- `src/lib/shared/blockly/generators/__tests__/` : enveloppes, garde-fous, bloc `print` exécuté.
- `src/lib/shared/blockly/tortue/__tests__/` : interpréteur (nominal, limites, erreurs), segments,
  blocs passés par un vrai `Blockly.Workspace` sérialisé (dont le champ de `controls_repeat`),
  étapes et `imageAnimation`.
- `src/lib/shared/blockly/calcul/__tests__/` : interpréteur (opérations, variable, répétition,
  erreurs), notation (priorités, lecture souple, refus expliqués, aller-retour), jugement (calcul
  écrit autrement, essais, marge, messages), `lireEssais` ; `sans-blockly.test.ts` : ni
  l'interpréteur, ni la notation, ni le jugement n'importent Blockly (imports suivis).
- `src/lib/components/markdown/nodes/__tests__/CalculProgramme.svelte.test.ts` (navigateur) :
  blocs → réponse, « Essayer avec » (Lancer, Entrée), messages, lancer effacé, programme vidé,
  trop long, `départ:` (calcul et tortue), verrouillé, question générée ; corrigé (`CalculCorrige`).
- `src/lib/components/blockly/__tests__/tortue-telephone.svelte.test.ts` (navigateur, 390 px et
  1280 px) : onglets, bascule au « Lancer », programme gardé, pause au départ.
- `src/lib/components/markdown/nodes/__tests__/TortueProgramme.svelte.test.ts` (navigateur) :
  figure montrée ou non, blocs → réponse en texte, programme vidé, trop long refusé, verrouillé
  (tracé rouge, attendu en pointillés), évaluation notée sans attendu, téléphone, question
  générée dans `FillBlanksInput` ; corrigé (`TortueCorrige`).
- `src/lib/components/__tests__/Sidebar.svelte.test.ts` : « La Tortue » visible sans connexion.
- `src/lib/workers/__tests__/js-sandbox-source.test.ts` : la fonction sandbox compile et s'exécute.
- `src/lib/shared/blockly/execution/__tests__/js-executor-boucle.svelte.test.ts` (navigateur) :
  après une boucle infinie, la console répond de nouveau.
- `src/lib/shared/python/execution/__tests__/import-direct.test.ts` : exécuteur Python importé par
  son fichier.

## Écarts connus

- ⚠️ **Le sandbox JavaScript n'est pas étanche** (revue `security-auditor` de #2627, 2026-11-14) :
  `(() => {}).constructor('return this')()` rend la portée globale du worker (`fetch` vers l'API
  avec les cookies de l'utilisateur, `importScripts`, `postMessage`). `checkDangerousPatterns` se
  contourne (`x['constr' + 'uctor']`). Le worker, fichier statique, n'a pas de CSP propre. Sans
  gravité tant que l'élève n'exécute que ce qu'il a écrit (les blocs standard ne produisent pas ce
  code) ; **à régler avant d'exécuter un programme écrit par quelqu'un d'autre** (programme
  partagé, exemple, devoir du prof). Choix à faire au chantier `blockly`.
- Le bloc `text_prompt_ext` (absent de la boîte à outils) génère `window.prompt` : à remplacer dans
  `installerGenerateursChiphre` s'il y entre.

- Le numéro de ligne d'une erreur (`extractLineNumber`) se rapporte au code enveloppé, pas aux
  blocs.
- Doublons de doc dans le module (`README.md`, `QUICK_REFERENCE.md`, `EXAMPLES.md`, en anglais,
  de la création du prototype) : non vérifiés contre le code.
