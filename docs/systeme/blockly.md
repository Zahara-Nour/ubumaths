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
> `docs/wip/blockly-progress.md`). Vérifié contre le code le 2026-11-14.

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
et jugé sur son tracé (§ Programme tortue en réponse). L'écran de la question (blocs dans la
carte, corrigé) et le PDF viennent avec la PR 4b du chantier `blockly` ; décisions dans son
journal.

## Carte du code

| Fichier                                                       | Rôle                                                                                                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/routes/(public)/tortue/+page.svelte`                     | Page publique « La Tortue », monte `TortueBacASable`                                                                                             |
| `src/lib/components/blockly/TortueBacASable.svelte`           | Blocs tortue, boutons Lancer / Tout de suite / Effacer, quadrillage animé, aperçu Python replié ; onglets Blocs / Tortue sous `lg`               |
| `src/routes/(protected)/dev/blockly/+page.svelte`             | Page de test, monte `BlocklyPlayground`                                                                                                          |
| `src/lib/components/blockly/BlocklyPlayground.svelte`         | Assemble espace de travail, barre d'outils, aperçu du code, console                                                                              |
| `src/lib/components/blockly/BlocklyWorkspace.svelte`          | `Blockly.inject` ; charge la locale française (`blockly/msg/fr`) avant                                                                           |
| `src/lib/stores/blocklyPlayground.svelte.ts`                  | État de la page (langage, code, sortie)                                                                                                          |
| `src/lib/shared/blockly/config.ts`                            | `BLOCKLY_CONFIG` (délais, limites), `DEFAULT_WORKSPACE_OPTIONS`, thème `CHIPHRE_THEME`, messages d'erreur                                        |
| `src/lib/shared/blockly/toolbox/standard.ts`                  | Boîte à outils : Logique, Boucles, Math, Texte, Listes, Variables, Fonctions                                                                     |
| `src/lib/shared/blockly/generators/`                          | `generateCode` / `getRawCode` (générateurs Blockly), enveloppes `wrapJavaScriptCode` / `wrapPythonCode`, garde-fous (longueur, boucles infinies) |
| `src/lib/shared/blockly/execution/blockly-executor.svelte.ts` | Aiguille vers `JsExecutor` ou, chargé à la demande, le `PlaygroundExecutor` Python (Pyodide, cf. [python/](python/))                             |
| `src/lib/shared/blockly/execution/js-executor.svelte.ts`      | Pilote le worker JavaScript                                                                                                                      |
| `src/lib/workers/js-sandbox.worker.ts`                        | Sandbox JavaScript : globales filtrées, délai de 10 s, sortie limitée                                                                            |
| `src/lib/workers/js-sandbox-source.ts`                        | Source de la fonction sandbox (sans effet de bord, testable sous Node)                                                                           |
| `src/lib/shared/blockly/tortue/interpreteur.ts`               | `executerTortue` : interprète l'état sérialisé des blocs tortue (ADR 0039), rend segments, tortue finale et étapes                               |
| `src/lib/shared/blockly/tortue/animation.ts`                  | `imageAnimation` (image à l'étape i), `rythmeAnimation` (durée d'un tic, étapes par tic)                                                         |
| `src/lib/shared/blockly/tortue/segments.ts`                   | Arrondi, `normaliserSegments` / `memesTraces` (comparer deux tracés sans le chemin), `memesFormes` (8 symétries + translation), `sortDuCadre`    |
| `src/lib/shared/blockly/tortue/notation.ts`                   | `etatVersTexte` / `texteVersEtat` : programme en notation texte (`répéter 4 [ avancer 3 ; tourner à droite 90 ]`) ↔ état Blockly                 |
| `src/lib/shared/blockly/tortue/jugement.ts`                   | `jugerProgrammeTortue` (comparaison `position` ou `forme`), `lireProgrammeTortue` (segments ou message d'erreur)                                 |
| `src/lib/shared/blockly/tortue/blocs.ts`                      | `definirBlocsTortue` : définitions Blockly et générateurs d'aperçu JS / Python (`from turtle import *`)                                          |
| `src/lib/shared/blockly/tortue/toolbox.ts`                    | `TORTUE_TOOLBOX` : Tortue, « répéter n fois » (`controls_repeat`, champ entier ≥ 0), nombre — uniquement des blocs interprétés                   |
| `src/lib/components/blockly/TortueCanvas.svelte`              | Quadrillage fixe 20 × 20 en SVG, segments coupés au cadre, dépassement signalé                                                                   |
| `static/blockly/media/`                                       | Médias de Blockly (corbeille, sprites, icônes), servis par Chiphre                                                                               |

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

## Comment étendre

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
- `src/lib/components/blockly/__tests__/tortue-telephone.svelte.test.ts` (navigateur, 390 px et
  1280 px) : onglets, bascule au « Lancer », programme gardé, pause au départ.
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
