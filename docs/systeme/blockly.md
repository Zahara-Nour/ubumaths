---
couvre:
  - 'src/lib/shared/blockly/**'
  - 'src/lib/components/blockly/**'
  - 'src/routes/(public)/tortue/**'
  - 'src/routes/(public)/programmes-de-calcul/**'
  - 'static/blockly/**'
---

# Blockly — programmation par blocs

> Écrite à partir du code le 2026-11-14 (chantier `blockly`, journal
> `docs/archive/wip/blockly-progress.md`). Vérifié contre le code le 2026-11-14 (écran du geste, PR 4b, le même jour) ; programme de calcul (logique, PR 5a) et `départ:` le 2026-11-14 ; écran du programme de calcul (PR 5b) le 2026-11-14 ; nombre maximal de blocs (`blocs:`) le 2026-11-15 ; bac à sable « Programmes de calcul » le 2026-11-15 ; blocs de 4e / 3e et `niveau:` (logique, sans écran) le 2026-11-16 ; leur écran (blocs Blockly, boîtes à outils par niveau, sélecteur du bac à sable) le 2026-11-16 ; module partagé (`types.ts`, `config.ts`, `generators/index.ts`) après le ménage, le 2026-11-16 ; tortue de 4e / 3e (logique, sans écran : moteur commun, `tortue/niveaux.ts`) le 2026-11-16 ; son écran (boîtes à outils par niveau, carte, corrigé, sélecteur de `/tortue`), `départ:` sans contrôle des variables et messages de la notation au vocabulaire tortue le 2026-11-17.

## À quoi ça sert

L'élève assemble des **blocs** (Blockly) ; Chiphre en tire du **JavaScript** ou du **Python** et
l'exécute, la sortie s'affiche dans une console. Programme visé : algorithmique par blocs du cycle 3
et du cycle 4 (Scratch au BO), relais vers Python au lycée.

Trois pages, rien n'est enregistré :

- **`/tortue`, « La Tortue »** (publique, sans connexion, dans le menu et le sitemap) : bac à
  sable de la tortue seule. **Aucun JavaScript n'y est exécuté** : seul l'interpréteur de blocs
  tourne ; le code Python est un aperçu replié (« Voir en Python »), au niveau de base seulement.
  Sélecteur « Blocs : base · 4e · 3e » (boutons `aria-pressed`, base par défaut) : changer de
  niveau change la boîte à outils (`toolboxTortue`), les blocs posés restent ; un bloc au-dessus
  du niveau choisi est refusé au lancer ; en 4e / 3e, pas d'aperçu Python (les blocs de calcul
  n'ont pas de générateur).
- **`/programmes-de-calcul`, « Programmes de calcul »** (publique, sans connexion, dans le menu
  et le sitemap) : bac à sable des blocs de calcul, avec le même éditeur que le geste ```calcul
  (`CalculEditeur`, espace vide au départ) : « Essayer avec » un nombre, Lancer, affichages. Rien
  n'est jugé ; **aucun JavaScript exécuté** (interpréteur seul) ; pas d'aperçu Python (les blocs de
  calcul n'ont pas de générateur). Sélecteur « Blocs : 5e · 4e · 3e » (boutons `aria-pressed`, 5e
  par défaut) : changer de niveau change la boîte à outils, les blocs posés restent ; un bloc
  au-dessus du niveau choisi est refusé au lancer (« Ce bloc n'est pas pris en charge… »). Chaque bac à sable renvoie vers l'autre (« Essaie aussi … »).
- **Plus de page admin** : le prototype `/dev/blockly` (mode Programme exécuté dans un worker
  JavaScript ou Pyodide) a été retiré le 2026-11-16 avec son sandbox, qui s'évadait
  ([ADR 0039](../adr/0039-blocs-interpretes-par-chiphre.md)). Pour essayer des blocs : `/tortue`,
  `/programmes-de-calcul`.

Dans une question (bloc ubumark ```tortue, cf. [ubumark](ubumark.md) et
[questions](questions.md)), la réponse de l'élève est son programme, écrit en **notation texte**
et jugé sur son tracé (§ Programme tortue en réponse), avec les blocs dans la carte, un corrigé
dessiné et un PDF « À faire sur Chiphre » (§ L'écran d'une question tortue).

## Carte du code

| Fichier                                                 | Rôle                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/(public)/tortue/+page.svelte`               | Page publique « La Tortue », sélecteur de niveau (base, 4e, 3e), monte `TortueBacASable`                                                                                                                                                                                                                               |
| `src/lib/components/blockly/TortueBacASable.svelte`     | Blocs tortue du niveau, boutons Lancer / Tout de suite / Effacer, quadrillage animé, aperçu Python replié (base seulement) ; onglets Blocs / Tortue sous `lg`                                                                                                                                                          |
| `src/routes/(public)/programmes-de-calcul/+page.svelte` | Page publique « Programmes de calcul », sélecteur de niveau, monte `CalculEditeur` (programme vide), rien de jugé                                                                                                                                                                                                      |
| `src/lib/components/blockly/BlocklyWorkspace.svelte`    | `Blockly.inject` ; charge la locale française (`blockly/msg/fr`) puis `francaiserBlocsCalcul` avant                                                                                                                                                                                                                    |
| `src/lib/shared/blockly/config.ts`                      | `BLOCKLY_CONFIG` (limites), `DEFAULT_WORKSPACE_OPTIONS`, thème `CHIPHRE_THEME`, messages d'erreur                                                                                                                                                                                                                      |
| `src/lib/shared/blockly/toolbox/standard.ts`            | Boîte à outils : Logique, Boucles, Math, Texte, Listes, Variables, Fonctions                                                                                                                                                                                                                                           |
| `src/lib/shared/blockly/generators/`                    | `generateCode` (générateurs Blockly, aperçu « Voir en Python »), enveloppes `wrapJavaScriptCode` / `wrapPythonCode`, garde-fous (longueur, boucles infinies)                                                                                                                                                           |
| `src/lib/shared/blockly/lecture.ts`                     | Lecture commune (tortue, calcul) : état sérialisé → `BlocLu` vérifié (`lirePiles`), `premierBlocInconnu`, `nombreDeTours`                                                                                                                                                                                              |
| `src/lib/shared/blockly/nombres.ts`                     | Nombres des programmes (tortue, calcul) : `ecrireSansExposant`, `messageExposant` (refus de `1e2`), `toursEntiers` (nombre de tours entier ≥ 0 à l'arrondi du calcul près)                                                                                                                                             |
| `src/lib/shared/blockly/calcul/interpreteur.ts`         | `executerCalcul(etat, nombre, niveau)` : interprète un programme de calcul (5e, 4e, 3e) pour un nombre de départ (ADR 0039), rend les nombres affichés ; `branchesNonParcourues` ; **moteur commun** `creerMoteur` / `preparerProgramme` (variables, calculs, conditions, « si », répétitions), partagé avec la tortue |
| `src/lib/shared/blockly/calcul/notation.ts`             | `etatVersTexteCalcul` / `texteVersEtatCalcul` : `mettre résultat à nombre + 2 ; afficher résultat × 4` ↔ état Blockly ; `messageNiveau`, `conditionsDuProgramme`                                                                                                                                                       |
| `src/lib/shared/blockly/calcul/jugement.ts`             | `jugerProgrammeCalcul` (mêmes affichages sur chaque essai), `dependDuNombre`, `lireProgrammeCalcul`, `lireEssais` / `ecrireEssais`, `ESSAIS_PAR_DEFAUT`                                                                                                                                                                |
| `src/lib/shared/blockly/calcul/blocs.ts`                | `definirBlocsCalcul` (blocs de calcul, « si », « répéter jusqu'à », sans générateur), `francaiserBlocsCalcul`, `surveillerNomsDeVariables` ; **seul fichier de `calcul/` qui importe Blockly**                                                                                                                         |
| `src/lib/shared/blockly/calcul/toolbox.ts`              | `toolboxCalcul(niveau)` (5e = `CALCUL_TOOLBOX` : Calcul, Résultat, Afficher, Boucles avec `controls_repeat` seul ; 4e / 3e : cf. § Niveaux), `COULEURS_CALCUL`, `operation`, `CATEGORIE_DES_VARIABLES`, `categorieConditions` (repris par la tortue) ; sans import de Blockly                                          |
| `src/lib/components/blockly/CalculEditeur.svelte`       | Éditeur d'une question de calcul (blocs du niveau, « Essayer avec », Lancer, affichages) ; rend le programme en texte à chaque modification ; chargé à la demande                                                                                                                                                      |
| `src/lib/shared/blockly/tortue/interpreteur.ts`         | `executerTortue(etat, niveau)` : interprète l'état sérialisé des blocs tortue (ADR 0039) par le moteur commun, avec les blocs du niveau (`base`, `4e`, `3e`) ; rend segments, tortue finale et étapes                                                                                                                  |
| `src/lib/shared/blockly/tortue/niveaux.ts`              | Tortue de 4e / 3e : `texteVersEtatTortue` / `etatVersTexteTortue` (notation de base ou celle du calcul étendue), `nombreDeBlocsTortue`, `messageNiveauTortue`                                                                                                                                                          |
| `src/lib/shared/blockly/tortue/animation.ts`            | `imageAnimation` (image à l'étape i), `rythmeAnimation` (durée d'un tic, étapes par tic)                                                                                                                                                                                                                               |
| `src/lib/shared/blockly/tortue/segments.ts`             | Arrondi, `normaliserSegments` / `memesTraces` (comparer deux tracés sans le chemin), `memesFormes` (8 symétries + translation), `sortDuCadre`                                                                                                                                                                          |
| `src/lib/shared/blockly/tortue/notation.ts`             | `etatVersTexte` / `texteVersEtat` : programme en notation texte (`répéter 4 [ avancer 3 ; tourner à droite 90 ]`) ↔ état Blockly                                                                                                                                                                                       |
| `src/lib/shared/blockly/tortue/jugement.ts`             | `jugerProgrammeTortue` (comparaison `position` ou `forme`, niveau), `lireProgrammeTortue` (segments ou message d'erreur)                                                                                                                                                                                               |
| `src/lib/shared/blockly/tortue/blocs.ts`                | `definirBlocsTortue` : définitions Blockly et générateurs d'aperçu JS / Python (`from turtle import *`)                                                                                                                                                                                                                |
| `src/lib/shared/blockly/tortue/toolbox.ts`              | `toolboxTortue(niveau)` : base = `TORTUE_TOOLBOX` (Tortue, « répéter n fois » `controls_repeat` à champ entier ≥ 0, nombre) ; 4e / 3e : cf. § Tortue de 4e et 3e — uniquement des blocs interprétés au niveau                                                                                                          |
| `src/lib/components/blockly/TortueCanvas.svelte`        | Quadrillage fixe 20 × 20 en SVG, segments coupés au cadre, dépassement signalé ; figure modèle en gris, attendu en pointillés, tracé vert / rouge ; sans Blockly                                                                                                                                                       |
| `src/lib/components/blockly/TortueEditeur.svelte`       | Éditeur d'une question tortue (blocs du niveau, Lancer, quadrillage, onglets sous `lg`) ; rend le programme en texte au niveau à chaque modification ; chargé à la demande                                                                                                                                             |
| `static/blockly/media/`                                 | Médias de Blockly (corbeille, sprites, icônes), servis par Chiphre                                                                                                                                                                                                                                                     |

## Invariants

- **Aucune requête vers un tiers depuis le navigateur des élèves** : `DEFAULT_WORKSPACE_OPTIONS.media`
  vaut `BLOCKLY_MEDIA_PATH` (`/blockly/media/`). Une montée de Blockly recopie
  `node_modules/blockly/media` dans `static/blockly/media` ; `media.test.ts` échoue sinon. Sons
  coupés.
- **Aucun JavaScript généré n'est exécuté** ([ADR 0039](../adr/0039-blocs-interpretes-par-chiphre.md)) :
  les blocs passent par l'interpréteur ; le code JS / Python n'est qu'un aperçu. Garde :
  `__tests__/aucun-javascript-execute.test.ts` refuse dans `src/` tout fichier `js-sandbox*` et
  toute mention de `JsExecutor`, `BlocklyExecutor` ou `blockly/execution` (l'ancien exécuteur).
- **Générateurs remplacés** (`installerGenerateursChiphre`, appelée avant chaque génération, jamais
  au chargement du module) : `text_print` s'écrit `console.log` dans l'aperçu (Blockly génère
  `window.alert`).
- Renderer `thrasos` explicite (défaut depuis Blockly 13).

## Tortue

- **Exécutée par l'interpréteur, jamais par le code généré** ([ADR 0039](../adr/0039-blocs-interpretes-par-chiphre.md)).
  `executerTortue` lit `Blockly.serialization.workspaces.save` (sans dépendre de Blockly) ; le
  code JS / Python n'est qu'un aperçu. Un bloc inconnu, même dans une entrée valeur, refuse tout
  le programme (rien n'est tracé).
- Blocs : `tortue_avancer` / `tortue_reculer` (entrée `VALEUR`), `tortue_gauche` /
  `tortue_droite` (entrée `ANGLE`), `tortue_lever_stylo`, `tortue_baisser_stylo` ;
  `controls_repeat` / `controls_repeat_ext` (nombre de tours entier ≥ 0, cf. § Tortue de 4e et 3e,
  Exécution ; le champ de `controls_repeat` est entier ≥ 0 par Blockly, et lu à l'entier
  inférieur s'il ne l'était pas — état fabriqué seulement), `math_number`. Entrée vide → 0, bloc désactivé → ignoré, nombre posé seul → ignoré. Piles
  exécutées de haut en bas ; les suivants (`next`) sont lus en boucle, seule l'imbrication
  (bornée à 1 000) fait récursion.
- Repère : unité = un carreau, départ en (0, 0), cap 0 = vers la droite, tourner à gauche = sens
  direct, stylo baissé. Coordonnées arrondies au milliardième après chaque déplacement.
- **`LIMITE_PAS` = 10 000** (blocs exécutés et tours de boucle, même vides) : au-delà, arrêt
  `trop-long` avec le tracé partiel. **`DISTANCE_MAX` = 1 000 000** carreaux du départ : au-delà,
  arrêt `trop-loin` avant tout `Infinity` / `NaN`. Toute autre exception → `programme-illisible` :
  `executerTortue` ne lève jamais.
- **Étapes** : après chaque déplacement, virage ou changement de stylo (pas pour une boucle),
  l'interpréteur note la tortue et le nombre de segments déjà tracés (`etapes`). Programme refusé
  → aucune étape ; arrêt `trop-long` → étapes jusqu'au tracé partiel.
- **Boîte à outils** : `controls_repeat` (champ entier ≥ 0 : ni virgule ni négatif ne se
  saisissent) ; l'interpréteur lit encore `controls_repeat_ext`, qui revient avec les variables
  (§ Tortue de 4e et 3e).
- **Moteur commun** : depuis le chantier `tortue-variables`, `executerTortue` passe par le moteur
  des programmes de calcul (`creerMoteur`) ; les blocs tortue lui sont confiés comme instructions
  propres au domaine. Sans niveau, mêmes pas qu'avant ; le nombre de tours calculé suit la règle
  de tous les niveaux (entier ≥ 0, sinon arrêt `tours-non-entier` — correctif `tortue-nombres`,
  2026-11-17 ; avant : entier inférieur, négatif → 0).
- Quadrillage fixe 20 × 20 (`DEMI_COTE_CADRE`). Sur `/tortue`, **animé** : pause de 600 ms au départ (`PAUSE_DEPART_MS`, tortue au départ, rien de
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
  seuls ignorés, entrée vide → 0 ; nombre de tours d'un `controls_repeat_ext` écrit tel quel (non
  entier : la relecture le refuse) ; nombres toujours écrits sans exposant (`nombres.ts`,
  `ecrireSansExposant`) ; un bloc inconnu refuse tout.
  `texteVersEtat` rend une seule pile (`controls_repeat`, ombres `math_number`), rejouable par
  `executerTortue` et rechargeable dans l'espace de blocs. Refus : instruction inconnue (le
  message la cite), nombre absent ou illisible, nombre à exposant (« « 1e2 » : écrire le nombre en
  entier (100). », `messageExposant`), `répéter` sans entier ≥ 0 ou sans crochets,
  crochets mal appariés, plus de 50 répétitions imbriquées, texte trop long. Un aller-retour
  texte → blocs → texte rend le même texte.
- **Jugement** (`jugement.ts`) : les deux programmes rejoués, segments comparés sans ordre ni
  chemin. `position` : même figure au même endroit (`memesTraces`) ; `forme` : à une translation,
  un quart de tour, un demi-tour ou un retournement près (`memesFormes`, les 8 symétries du
  quadrillage, chaque tracé ramené au coin bas gauche de son encadrement). Une rotation d'un
  autre angle ne compte pas. Réponse vide → faux sans message ; illisible, trop longue ou trop
  loin → faux avec le message de la tortue ; attendu illisible ou sans trait → jamais juste.
- **Nombre maximal de blocs** (`blocs: N` du bloc, réponse attendue `position | blocs 3 |
<programme>` ; sans limite, la forme d'avant) : `nombreDeBlocs` compte, sur le texte, chaque
  instruction et chaque `répéter` (les nombres, ombres, ne comptent pas ; un carré en `répéter` =
  3). Au-delà : faux avec « Ton programme utilise 8 blocs ; il en faut au plus 3. »
  (`depassementDeBlocs`), même si le tracé est juste ; un programme illisible garde son message de
  lecture. Programmes de calcul : pas de limite (« un bloc » y est flou).
- `normaliserSegments` range chaque droite dans une case de taille 1e-6 (direction, décalage) et
  cherche sa pareille dans les cases voisines : deux morceaux d'une même droite à cheval sur une
  frontière d'arrondi sont fusionnés (avant la PR 4, une clé arrondie pouvait les séparer).

### Tortue de 4e et 3e

Chantier `tortue-variables`, phase 0 validée par David le 2026-11-16 (journal
`docs/archive/wip/tortue-variables-progress.md`). Même bloc ```tortue, clé `niveau: 4e | 3e` ; absente →
`base`, rien ne change (modèles publiés compris). Écran : boîtes à outils par niveau, carte et
corrigé au niveau, sélecteur de `/tortue` (§ L'écran d'une question tortue, § Trois pages).

- **Blocs admis** (`NIVEAU_DES_BLOCS` de `tortue/interpreteur.ts`, `connusTortue(niveau)`) :
  `base` = blocs tortue, `controls_repeat`, `controls_repeat_ext`, `math_number` ; **4e** + les
  variables (`variables_set`, `variables_get`, `math_change`) et `calcul_operation` (+ − × ÷)
  dans les entrées ; **3e** + `calcul_si`, `calcul_si_sinon`, `logic_compare`, `logic_operation`,
  `logic_negate`, `calcul_repeter_jusqua`. Jamais les blocs propres au calcul (`afficher`,
  `nombre`, `résultat`, `reste`) : bloc inconnu.
- **Boîtes à outils** (`toolboxTortue`) : **4e** = Tortue, Calcul (+ − × ÷, nombre), Variables
  (catégorie dynamique de Blockly : « Créer une variable… », mettre, ajouter, lire), Boucles
  (`controls_repeat_ext` seul, nombre de tours calculé) ; **3e** + Conditions (« si », « si /
  sinon », comparaisons, et / ou / non) et « répéter jusqu'à ». Un nom de variable refusé l'est
  dès sa création (`surveillerNomsDeVariables`, message `.tortue-nom-refuse` sous les blocs).
- **Exécution** : celle du moteur commun, mêmes règles que le calcul (variable jamais mise = 0,
  20 variables au plus, noms réservés refusés, condition vide fausse, égalité à la marge).
  **Nombre de tours** (`controls_repeat_ext`), à tous les niveaux : entier ≥ 0 à l'arrondi du
  calcul près (`toursEntiers`, `0,1 × 30` = 3), jamais arrondi en silence ; sinon arrêt
  `tours-non-entier` avec le tracé partiel (« Répéter : le nombre de fois vaut 2,5, il faut un
  nombre entier (0, 1, 2…). »). Écrit non entier ou négatif (`répéter 2,5 [ … ]`, `répéter -2`) :
  refusé dès la lecture. Les programmes de calcul (répétition calculée de 4e / 3e) gardent
  l'arrondi à l'entier le plus proche (Scratch).
  Distance négative = recule ; angle non entier admis. Arrêts :
  ÷ 0 → `division-par-zero` (« on ne peut pas diviser par 0 ») ; nombre infini → `trop-loin` ;
  boucle sans fin → `trop-long` (10 000 pas, une opération ou une comparaison comptent un pas).
  Étapes de l'animation : une par instruction tortue, aucune pour une variable ou un « si ».
- **Notation** (`tortue/niveaux.ts`) : sans niveau, celle de la tortue (`notation.ts`) ; en 4e /
  3e, celle des programmes de calcul (`calcul/notation.ts`, option `tortue`) avec en plus
  `avancer <calcul>`, `reculer <calcul>`, `tourner à droite <calcul>`, `tourner à gauche
<calcul>`, `lever le stylo`, `baisser le stylo` : `mettre n à 6 ; répéter n [ avancer 3 ;
tourner à gauche 360 ÷ n ]`. Écriture canonique du calcul (`−`, `×`, `÷`, virgule). Les mots
  propres au calcul sont refusés à la lecture en les nommant (« « afficher » n'existe pas pour la
  tortue… », de même `nombre`, `résultat`, `reste de`) ; les exemples des messages sont ceux de la
  tortue (`si n > 0 alors [ avancer 1 ]`, `n > 0`).
- **Compte des blocs** (`nombreDeBlocsTortue`) : en 4e / 3e, les instructions (mettre, ajouter,
  avancer, reculer, tourner, stylo, répéter, si, jusqu'à), jamais les calculs ni les conditions des
  entrées (l'hexagone ci-dessus = 4 blocs).
- **Jugement** inchangé (tracés comparés, `position` ou `forme`), rejoué au niveau ; réponse
  attendue `4e | position | blocs 4 | <programme>` (sans niveau : la forme d'avant).
- **Pour l'auteur** (`messageNiveauTortue`) : le bloc du niveau le plus haut qui dépasse, lu dans la
  notation de 4e / 3e même sans niveau (« « mettre … à » est un bloc de 4e (ajouter niveau: 4e) »
  plutôt qu'« instruction inconnue ») ; nom du bloc par `messageBlocAuDessus`, commun au calcul.
  Variable lue jamais mise : refusée dans `attendu:` (faute de frappe), admise dans `départ:`
  (« complète le programme » : `départ: répéter n [ … ]`, l'élève met `n` ; David, 2026-11-17).

## Programme de calcul en réponse

Programmes de calcul de 5e (« choisir un nombre, ajouter 2, multiplier par 4 »), bloc `calcul
d'une question ([ubumark](ubumark.md)). Logique en PR 5a, écran en PR 5b (cf. « L'écran d'une
question de calcul »).

- **Blocs interprétés** (`calcul/interpreteur.ts`, ADR 0039) : `calcul_nombre_choisi` (le nombre
  de départ, lu seulement : la variable de 5e « en lecture d'une donnée saisie »), `math_number`,
  `calcul_operation` (champ `OP` : `ADD`, `MINUS`, `MULTIPLY`, `DIVIDE`, entrées `A` et `B`),
  `calcul_resultat` (l'unique variable, 0 au départ), `calcul_mettre_resultat`,
  `calcul_afficher`, `controls_repeat` (nombre de tours écrit dans le bloc). L'élève ne crée pas
  de variable en 5e (cf. « Niveaux 4e et 3e »). Entrée vide
  → 0 ; blocs désactivés et calculs posés seuls ignorés ; piles de haut en bas. Erreurs : bloc
  inconnu (même dans une entrée, `math_arithmetic` compris), opération inconnue (illisible),
  division par zéro, nombre devenu infini, plus de 10 000 pas (`LIMITE_PAS_CALCUL` ; une opération compte un pas, comme une instruction
  ou un tour de boucle : un long calcul répété reste borné) ; les
  affichages déjà faits sont rendus.
- **Notation texte** (`calcul/notation.ts`) : `afficher <calcul>`, `mettre résultat à <calcul>` (ou
  `résultat = <calcul>`, plus court pour l'auteur), `répéter n [ … ]`, séparées par `;` ou un retour à la ligne.
  Calculs : nombres, `nombre` (ou `nombre choisi`), `résultat`, `+ − × ÷` (aussi `- * / :`),
  parenthèses ; × et ÷ avant + et −, de gauche à droite ; `−` devant un nombre en fait un
  négatif (`nombre + -3` d'une variable tirée), devant autre chose c'est refusé (écrire `0 − …`).
  Écriture canonique : `mettre résultat à …` (les mots du bloc ; en 5e, `résultat = résultat × 3`
  se lirait comme une égalité), `−`, `×`, `÷`, virgule décimale, sans exposant (`1e21` ne se relirait
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
  **Dépendre du nombre** : quand l'attendu affiche des choses différentes selon le nombre choisi,
  la réponse doit en dépendre aussi, sinon elle est fausse même si ses affichages coïncident
  sur les essais (« pour 3, affiche 10 » à un seul essai : `afficher 10`, `nombre × 0 + 10`) →
  « Ton programme affiche toujours la même chose, quel que soit le nombre choisi. »
  (`PROGRAMME_CONSTANT`). Mesuré par `dependDuNombre` sur les nombres témoins
  (`ESSAIS_PAR_DEFAUT`), un témoin en erreur ignoré, moins de deux témoins utilisables → on ne
  sait pas, rien refusé. Une réponse déjà fausse sur les essais garde son verdict sans message ;
  un attendu constant ne déclenche rien (David, 2026-11-15).

### Niveaux 4e et 3e

Phase 0 validée par David le 2026-11-16 (journal `blockly`). Même bloc ```calcul, même
interpréteur, même jugement ; la clé `niveau:` (5e par défaut) choisit les blocs **admis**
(`NIVEAU_DES_BLOCS` de `calcul/interpreteur.ts`) : un bloc au-dessus du niveau est un bloc inconnu
(`executerCalcul(etat, nombre, niveau)`, 5e par défaut : les appelants d'avant ne changent pas).

- **4e** : variables créées par l'élève — `variables_set` (« mettre x à », entrée `VALUE`),
  `variables_get`, `math_change` (« ajouter … à x », entrée `DELTA`), champ `VAR: { id }` résolu
  par la liste `variables` de l'état (`nomsDesVariables`) ; une variable jamais mise vaut 0 ; noms
  comparés sans majuscules ni accents (`Côté` = `cote`) ; 20 variables au plus (`VARIABLES_MAX`),
  nom de 20 caractères au plus, lettres / chiffres / `_`, jamais un mot du langage (`nombre`,
  `résultat`, `afficher`, `si`, `et`, `reste`, `par`, `faux`… : `verifierNomDeVariable`).
  « si » : `calcul_si` (entrées `CONDITION`, `ALORS`), `calcul_si_sinon` (+ `SINON`) ;
  comparaisons `logic_compare` (`EQ NEQ LT LTE GT GTE`), égalité à la marge du jugement
  (`egauxCalcul` : 0,1 + 0,2 = 0,3, et n'est pas < 0,3) ; condition vide = fausse ; un nombre à
  la place d'une condition (ou l'inverse) → illisible. Reste `math_modulo` (`DIVIDEND`,
  `DIVISOR`) : euclidien, jamais négatif (−7 par 3 → 2), par 0 → division par zéro.
  `controls_repeat_ext` (tours calculés) : arrondi à l'entier le plus proche, négatif → 0.
- **3e** : `logic_operation` (`AND` / `OR`, évaluation courte), `logic_negate`,
  `calcul_repeter_jusqua` (« répéter jusqu'à », entrées `CONDITION`, `DO` ; condition déjà vraie →
  aucun tour ; sans fin → « trop long »). Pas de « tant que » (Python du lycée).
- Une comparaison, un ET / OU / NON, un reste comptent un pas ; un tour de « jusqu'à » aussi.
- **Notation** : `mettre x à …` (ou `x = …`), `ajouter … à x`, `si <condition> alors [ … ]
sinon [ … ]`, `répéter <calcul> [ … ]` (un entier écrit reste le bloc de 5e), `répéter jusqu’à
<condition> [ … ]`, `reste de a par b` (a, b : nombre, nom, ou calcul entre parenthèses).
  Conditions : `= ≠ < > ≤ ≥` (lus aussi `!= <> <= >=`), `et` avant `ou`, `non (…)` toujours
  entre parenthèses, `faux` = condition vide. Un nom garde sa première écriture. L'état écrit
  porte la liste `variables` seulement s'il y en a (la 5e est écrite comme avant). La notation lit
  tous les niveaux ; `messageNiveau(texte, niveau)` dit à l'auteur le bloc qui dépasse (celui du
  niveau le plus haut) et le niveau à demander.
- **Contrôle du modèle** : chaque « si » de la référence doit être vrai et faux au moins une
  fois sur les essais (`branchesNonParcourues`), sinon refus : « « si nombre > 100 » n'est jamais
  vrai sur les essais : ajouter à essais: un nombre qui le rend vrai ». Un « si » jamais atteint
  compte comme jamais vrai. Une variable lue mais jamais mise (ni `mettre`, ni `ajouter`) dans
  `attendu:` ou `départ:` est refusée (`variableJamaisMise` : « « nombr » est lue mais jamais
  mise (faute de frappe ?) », dit avant le niveau ; revue #2716). Règle d'écriture qui en découle
  avec « la référence affiche quelque chose sur chaque essai » : un `afficher` seul dans un « si »
  sans « sinon » ne passe pas (les essais qui le rendent faux n'affichent rien) ; écrire un
  « sinon » ou un `afficher` hors du « si ».
- **Réponse attendue** : `4e | <essais> | <programme>` (rien devant en 5e : les réponses publiées
  ne changent pas) ; le jugement et le corrigé rejouent au niveau lu.
- **Blocs Blockly** (`calcul/blocs.ts`) : `calcul_si` (« si … alors », entrée `CONDITION` de
  type `Boolean`), `calcul_si_sinon`, `calcul_repeter_jusqua` ; les blocs génériques (`variables_set`,
  `math_change`, `math_modulo`) gardent leur définition Blockly, mais `francaiserBlocsCalcul`
  réécrit leurs textes comme la notation (« mettre x à », « ajouter 1 à x », « reste de la
  division de 7 par 2 », « Créer une variable… »), après `Blockly.setLocale` (qui les remettrait).
- **Boîtes à outils** (`toolboxCalcul(niveau)`) : 4e = Calcul (+ reste), Variables (catégorie
  dynamique `custom: 'VARIABLE'` de Blockly : bouton « Créer une variable… », « mettre », « ajouter »,
  lecture), Afficher, Conditions (« si », « si … sinon », les 6 comparaisons), Boucles
  (`controls_repeat_ext`) ; **pas de Résultat** ; 3e ajoute et / ou / non et « répéter jusqu'à ».
  Couleurs des catégories Conditions et Variables = celles des blocs génériques du thème Classic.
- **Noms de variables à la création** (`surveillerNomsDeVariables`, branché par `CalculEditeur`
  hors lecture seule) : à la création ou au renommage, un nom que l'interpréteur refuserait (mot
  du langage, mal écrit) ou confondrait (`Côté` après `cote` : `refusDeNouveauNom`) est retiré
  (création) ou remis à l'ancien nom (renommage) ; message sous les blocs (`.calcul-nom-refuse`),
  effacé à la prochaine action sur les blocs ou au prochain nom accepté. Comparé aux variables
  déjà acceptées, pas à celles présentes : Blockly envoie ses événements au tour suivant.
- **Boîte de saisie** (« Créer une variable… », « Renommer ») : le `<dialog class="blocklyDialog">`
  de Blockly 13, restylé dans `src/app.css` (la remise à zéro de Tailwind l'envoyait en haut à
  gauche, sans marges).

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
- **`blocs:`** : « Au plus N blocs » au-dessus de l'éditeur (dès le rendu serveur), puis le
  compteur « Blocs : 5 / 3 » (`data-compteur-blocs`, `data-depasse`, rouge au-delà), compté comme le
  serveur. Dépasser est permis : Blockly ne bloque rien, la réponse part et le serveur la juge
  fausse. Le corrigé redit le message sous « Ton programme ».
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
- **`niveau: 4e | 3e`** : la carte passe le niveau du bloc à l'éditeur (boîte à outils, notation
  de la réponse, tracé verrouillé) et compte les blocs au niveau (`nombreDeBlocsTortue`) ; l'attendu
  en pointillés et le corrigé se lisent au niveau de la réponse attendue (`4e | …`), sinon à celui
  du bloc (gardé dans l'énoncé masqué).
- **PDF** (`ubumark/generators/tortue-typst.ts`) : cf. [ubumark](ubumark.md).

## L'écran d'une question de calcul

- **Carte** : `CalculProgramme.svelte`, monté par `FillBlanksInput` (case `data-construire-case`),
  `MarkdownRenderer` et `StaticBlockNode` (geste libre). Cadre d'attente au rendu serveur, puis
  `CalculEditeur.svelte` chargé par `import()`, avec le `niveau:` du bloc (boîte à outils et
  exécution de « Lancer » à ce niveau). Mêmes règles de réponse que la tortue : texte
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
  programme juste » (réponse attendue de la case, sinon `attendu:`), tous deux réécrits en
  écriture canonique (`reecrireCalcul` : « mettre résultat à », jamais `résultat =`), tableau « Nombre choisi →
  Ton programme affiche / Il fallait afficher » sur les essais, lignes fausses marquées
  (`data-juste`) ; « erreur », « rien » dans une cellule ; message de l'élève sous le tableau
  (référence connue : celui de `jugerProgrammeCalcul`, « affiche toujours la même chose » compris).
  Référence inconnue (`attendu: ?`) : la colonne de l'élève seule.
- **PDF** (`ubumark/generators/calcul-typst.ts`) : le cadre « À faire sur Chiphre » seul.

## Comment étendre

- Nouveau bloc de calcul : définition dans `calcul/blocs.ts`, entrée dans `toolboxCalcul` au bon niveau
  (et `NIVEAU_DES_BLOCS`), cas
  dans `executerCalcul` (et `INSTRUCTIONS` / `VALEURS` de `calcul/interpreteur.ts`), écriture et lecture dans `calcul/notation.ts` (l'aller-retour doit
  garder le calcul : `notation.test.ts`).
- Nouveau bloc tortue : définition et aperçu dans `tortue/blocs.ts`, cas dans l'`instruction` du
  domaine de `executerTortue` (et dans `NIVEAU_DES_BLOCS` / `INSTRUCTIONS`), lecture et écriture
  dans `tortue/notation.ts` et dans l'option `tortue` de `calcul/notation.ts`, entrée dans
  `TORTUE_TOOLBOX` ; `blocs.test.ts` vérifie
  que chaque bloc de la boîte à outils est interprétable.
- Bloc générique de Blockly (logique, variables… pour la 4e / 3e) : il ne s'exécute **que** par
  l'interpréteur, comme les blocs tortue et calcul ; ses générateurs ne servent qu'à l'aperçu
  (modèle de test d'aperçu : `generators/__tests__/print.test.ts`).
- Générateur Blockly inadapté à l'aperçu : le remplacer dans `installerGenerateursChiphre`.

## Tests

- `src/lib/shared/blockly/__tests__/` : configuration, médias, `aucun-javascript-execute.test.ts` (ADR 0039).
- `src/lib/shared/blockly/generators/__tests__/` : enveloppes, garde-fous, aperçu du bloc `print`.
- `src/lib/shared/blockly/tortue/__tests__/` : interpréteur (nominal, limites, erreurs), segments,
  blocs passés par un vrai `Blockly.Workspace` sérialisé (dont le champ de `controls_repeat`),
  étapes et `imageAnimation` ; `niveaux.test.ts` (4e / 3e : spirale, polygone, calculs dans les
  entrées, « si », « jusqu'à », blocs admis, ÷ 0, trop loin, trop long, noms, notation, compte des
  blocs, jugement). `src/lib/ubumark/__tests__/tortue/tortue-niveau.test.ts` : `niveau:` du
  parseur, réponse attendue avec niveau.
- `src/lib/shared/blockly/calcul/__tests__/` : interpréteur (opérations, variable, répétition,
  erreurs), `niveaux.test.ts` (4e / 3e : variables, conditions, reste, boucles, niveaux, état mal
  formé, aller-retours, branches, jugement), notation (priorités, lecture souple, refus expliqués, aller-retour), jugement (calcul
  écrit autrement, essais, marge, messages), `lireEssais` ; `sans-blockly.test.ts` : ni
  l'interpréteur, ni la notation, ni le jugement n'importent Blockly (imports suivis) ; `blocs.test.ts` : chaque
  bloc de la boîte à outils d'un niveau est défini et admis au niveau, programmes 4e / 3e passés
  par un vrai `Blockly.Workspace` (exécutés, réécrits à l'identique), textes français des blocs,
  noms refusés à la création et au renommage.
- `src/lib/components/markdown/nodes/__tests__/CalculProgramme.svelte.test.ts` (navigateur) :
  blocs → réponse, « Essayer avec » (Lancer, Entrée), messages, lancer effacé, programme vidé,
  trop long, `départ:` (calcul et tortue), verrouillé, question générée, `niveau: 4e` ; corrigé
  (`CalculCorrige`).
- `src/routes/(public)/programmes-de-calcul/__tests__/page.svelte.test.ts` (navigateur) : bac à
  sable, sélecteur de niveau (catégories, nominal 4e, « jusqu'à » en 3e, bloc au-dessus du niveau,
  nom refusé).
- `src/lib/components/blockly/__tests__/tortue-telephone.svelte.test.ts` (navigateur, 390 px et
  1280 px) : onglets, bascule au « Lancer », programme gardé, pause au départ.
- `src/lib/components/markdown/nodes/__tests__/TortueProgramme.svelte.test.ts` (navigateur) :
  figure montrée ou non, blocs → réponse en texte, programme vidé, trop long refusé, verrouillé
  (tracé rouge, attendu en pointillés), évaluation notée sans attendu, téléphone, question
  générée dans `FillBlanksInput` ; corrigé (`TortueCorrige`).
- `src/lib/components/__tests__/Sidebar.svelte.test.ts` : « La Tortue » visible sans connexion.
- `src/lib/shared/python/execution/__tests__/import-direct.test.ts` : exécuteur Python importé par
  son fichier.

## Écarts connus

Les écarts de cette zone sont au [registre des écarts](../ecarts/registre.md) : `pnpm ecarts`. Un écart s'écrit là-bas, jamais ici.
