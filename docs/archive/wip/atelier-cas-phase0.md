---
title: Atelier — ce qui manque avant de retirer /cas (phase 0)
date: 2026-10-11
status: PR 1 (#1080), PR 2 (#1086) et PR 3 (#1094) livrées le 2026-10-11 ; PR 4 (retrait de /cas) livrée le 2026-10-13 (#1340) ; points mis de côté faits (#1101, #1107) ; archivé le 2026-10-25
---

# Atelier — ce qui manque avant de retirer `/cas`

Inventaire du 2026-10-11 (`/cas` contre l'atelier, lu dans le code) et décisions de David du même jour.
Chapeau du chantier : [atelier-progress.md](../../wip/atelier-progress.md).

## Décisions de David (2026-10-11)

- On ajoute à Calcul : **le rappel des saisies (↑/↓)**, **le bouton exact ⇄ décimal par ligne**,
  **la complétion** (commandes ET noms).
- On **laisse perdre** : l'historique conservé au rechargement (l'export JSON existe), la recherche
  Ctrl+R, la saisie sur plusieurs lignes, les onglets MathLive de `/cas`, `.def'` (dérivée donnée à
  la main).
- **Rectification (2026-10-13)** : `.inv` figurait ici, mais David ne l'avait pas tranché à part (il
  était dans l'inventaire couvert par « je valide »). Décision de David du 2026-10-13 : on ne reprend
  pas `.inv` (réciproque donnée à la main, jamais vérifiée) ; on garde **l'idée d'une vraie réciproque,
  calculée algébriquement par le moteur**. Nouvelle fonctionnalité, phase 0 à écrire. Mesure du même
  jour : `solve(y = f(x), x)` sait faire les affines, homographiques, `x³`, `1/x`, `x²` (deux
  branches, sans condition sur y), mais répond **`no-solution`** (faux) pour `e^{2x+1}`, `ln(x−1)`,
  `√(x+2)`, `2^x`, `3eˣ−1` dès que le second membre est une lettre.
  **→ Faite depuis** : commande `.réciproque f [sur I]` et carte `f⁻¹` de l'atelier, moteur
  `mathAST/reciprocal/` — voir [reciproque.md](../../systeme/mathast/reciproque.md) et
  [atelier-reciproque-phase0.md](atelier-reciproque-phase0.md).
- **Les six autres commandes de noms** (`.poser`, `.définir`, `.effacer`, `.oublier`,
  `.oublier-fonction`, `.dérivée-de`) restent hors de l'atelier (2026-10-13) : le panneau fait la même
  chose. David (2026-10-13) : **elles ne doivent pas exister** dans l'atelier — pas de refus
  particulier, `.effacer` répond comme toute commande inconnue (« n'est pas une commande »), et elles
  quittent la liste déroulante. Constat du 2026-10-13 : leur refus n'est montré que dans la liste déroulante ; tapées en
  entier, elles partent au moteur (`runCommand` ne lit pas `unavailable`) — `.effacer` désynchronise
  le moteur du panneau, `.définir` crée une fonction invisible.
- **Entrée dans une liste ouverte** :
  - liste des **commandes** (après `.`) → Entrée **choisit** (une commande incomplète ne calcule rien) ;
  - liste des **noms et fonctions** (au milieu d'un calcul) → Entrée **calcule** ; Tab ou un clic
    choisit. Exemple : `t = 2`, `a = 5`, l'élève tape `3ta`, la liste propose `tan(` — Entrée doit
    donner 30, pas `3tan(`.
- **Après le choix d'une commande, son modèle reste affiché sous le champ** (`.taylor sin(x) ordre 5 en 0`)
  pendant que l'élève tape la suite — plutôt qu'une complétion des mots-clés.
- ~~**`/cas` n'est PAS retirée pour l'instant** (David, 2026-10-11).~~ **Feu vert de David le
  2026-10-13** : `/cas` est retirée, l'adresse mène à `/atelier` (redirection permanente).

## Trois PR (le retrait est suspendu)

### PR 1 — le clavier de Calcul et le modèle de la commande (✅ #1080)

**Rappel des saisies**

| Cas                                                       | Attendu                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Trois lignes tapées, champ vide, ↑                        | le champ reçoit la dernière saisie, curseur à la fin                                     |
| ↑ encore                                                  | l'avant-dernière ; ↑ sur la plus ancienne : rien ne bouge                                |
| ↓ après des ↑                                             | la saisie suivante ; ↓ après la plus récente : le brouillon d'avant le premier ↑ revient |
| L'élève avait commencé `2x+` puis ↑, puis ↓ jusqu'au bout | `2x+` revient, intact                                                                    |
| Ligne produite par un bouton (action d'une carte)         | **pas rappelée** : seules les saisies tapées le sont                                     |
| Deux saisies identiques de suite                          | rappelées une seule fois                                                                 |
| Rechargement de la page                                   | rien à rappeler (les lignes ne sont pas conservées)                                      |
| Saisie refusée (ligne rouge)                              | rappelée : c'est celle qu'on veut corriger                                               |
| Liste ouverte                                             | ↑/↓ choisissent dans la liste, pas dans l'historique                                     |

**Liste des commandes au clavier**

| Cas                     | Attendu                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `.dé`                   | liste ouverte, première commande disponible surlignée                               |
| ↓ / ↑                   | le surlignage descend / monte, en boucle ; les commandes indisponibles sont sautées |
| Entrée ou Tab           | le champ devient `.dériver ` (avec l'espace), liste fermée                          |
| Échap                   | liste fermée, champ inchangé ; la liste ne revient qu'à la frappe suivante          |
| `.zz` (aucune commande) | pas de liste ; Entrée calcule comme aujourd'hui (message de commande inconnue)      |
| Clic                    | comme aujourd'hui                                                                   |
| Lecteur d'écran         | la liste est annoncée comme une liste de choix, l'élément surligné est annoncé      |

**Modèle de la commande**

| Cas                                                    | Attendu                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Champ `.taylor ` (choisie ou tapée à la main)          | sous le champ : `.taylor sin(x) ordre 5 en 0` (l'exemple du catalogue)               |
| L'élève tape la suite                                  | le modèle reste                                                                      |
| Champ vidé, ou qui ne commence plus par cette commande | le modèle disparaît                                                                  |
| Commande sans exemple dans le catalogue                | sa description à la place ; un test exige un exemple pour chaque commande disponible |
| Alias tapé (`.deriver`, `.diff`)                       | le modèle de la commande, écrit avec son nom français                                |

### PR 2 — le bouton exact ⇄ décimal (✅ #1086)

| Cas                                          | Attendu                                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `\sqrt{2}/2`, `π/3`, `2/7`, `ln(3)`, `e^2`   | bouton ≈ ; un clic : `≈ 0,7071` (arrondi de `.mode décimal`, virgule décimale) ; un second clic : la valeur exacte |
| `.résoudre x^2=2`                            | bouton sur l'ensemble : `S = {−1,4142 ; 1,4142}` ; les étapes ne bougent pas                                       |
| Résultat déjà décimal ou entier (`0,5`, `3`) | pas de bouton                                                                                                      |
| Résultat littéral (`2x+1`, `f′(x) = …`)      | pas de bouton                                                                                                      |
| Ligne refusée, message, `.aide`              | pas de bouton                                                                                                      |
| `.mode décimal` actif                        | la ligne arrive en décimal ; le bouton montre la valeur exacte                                                     |
| Export, rejeu, « Garder »                    | ignorent le bouton : on exporte et on garde la valeur EXACTE                                                       |

### PR 3 — la complétion des fonctions et des lettres grecques (✅ #1094)

**Règle unique** : la liste s'ouvre quand le mot en cours (lettres seulement) a **au moins 2 lettres**, est
le **début** d'une proposition, et que choisir cette proposition **changerait** le champ.

| Cas                                   | Attendu                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `si`                                  | propose `sin(` (et `sinh(` si Calcul l'accepte)                                |
| `al`                                  | propose `α` (le symbole, pas `\alpha`)                                         |
| `pi`                                  | propose `π` (`pi` en lettres est refusé depuis #896)                           |
| ~~Panneau avec `aire = 12`, `ai`~~    | ~~propose `aire`~~ — faux : un nom d'objet fait une lettre (voir le journal)   |
| `f`, `x`, `a` (une lettre)            | rien                                                                           |
| `3ta` avec `t` et `a` dans le panneau | `tan(` proposé ; **Entrée calcule** 3·t·a = 30                                 |
| Tab ou clic                           | remplace le mot par la proposition ; `sin(` met le curseur après la parenthèse |
| Échap                                 | ferme la liste                                                                 |
| `.dériver si` (après la commande)     | propose `sin(` comme ailleurs                                                  |
| Sur le nom de la commande (`.dé`)     | c'est la liste des commandes (PR 1), pas celle-ci                              |
| Au plus 8 propositions                | fonctions d'abord, puis lettres grecques, puis π                               |

**Garde-fou** : un test insère chaque proposition dans une saisie type (`sin(` → `sin(1)`, `α` → `2α`…)
et exige que Calcul l'**accepte** ; une proposition refusée fait échouer le test. Raison : le module de
complétion de `/cas` (`mathAST/cli/completion`) insère `\alpha` et `\pi` en LaTeX à côté de `sin(` en
syntaxe maison — une saisie mêlée que Calcul refuse depuis #911.

### PR 4 — le retrait de `/cas` (✅ 2026-10-13, #1340)

Part : la route `src/routes/(public)/cas/`, `src/lib/components/cas/` (dont `AstDrawer` et
`AstTreeViewer`, jamais montés), `src/lib/stores/repl.svelte.ts`. Restent : `WebReplEngine` (moteur
de l'atelier) et `mathAST/cli/completion` (la PR 3 ne l'utilise pas : `atelier/completion.ts` part
des listes du moteur — à retirer avec `/cas` s'il n'a pas d'autre usage). Aucun lien ne pointe vers `/cas`,
absente du sitemap. `/calc` (autre page, autre composant, dans le sitemap) : inventaire à part.

## Journal

- 2026-10-11 — phase 0 validée par David (« je valide »). PR 1 codée sur
  `feat/atelier-calcul-clavier` : `CalcDesk.recallPrevious` / `recallNext` (saisies tapées
  seulement, `#submit(text, typed)`), `commandBeingWritten` (`commands.ts`), combobox dans
  `CalculView.svelte`. Mesuré : le curseur se place seul à la fin d'une ligne rappelée (norme HTML) —
  un `setSelectionRange` ajouté ne changeait rien au test, retiré.
- 2026-10-11 — revue `code-reviewer` de la PR 1 : corrigés une ligne rappelée commençant par un
  point qui rouvrait la liste (`.pose` bloquait ↑/↓), « Comparer » en plein rappel qui perdait le
  brouillon, un historique rejoué rappelable (« Comparer » compris), le surlignage gardé après
  effacement, Maj+↑/↓, l'Entrée IME de Safari (code 229), les ids fixes (`$props.id()`), « Modèle »
  affiché pour une commande indisponible.
- 2026-10-11 — DÉCISION DE DAVID (« oui ») : une commande sans argument tapée en entier se lance
  d'une seule Entrée. Marqueur explicite `runsAlone` dans le catalogue (aide, valeurs, fonctions,
  exact, décimal, auto, exporter) : « sans exemple » ne suffisait pas, `.arbre` n'en a pas et attend
  une expression. Garde : chacune répond tapée seule.
- 2026-10-11 — PR 1 mergée (#1080).
- 2026-10-11 — PR 2, mesuré avant de coder : `.mode décimal` écrit 15 chiffres (`0,707106781186547`)
  et met `≈` devant une valeur exacte (`≈ 0,250000000000000`, `≈ 3`) ; `.résoudre` ignore le mode.
  DÉCISIONS DE DAVID (« ok pour tes recos ») : le bouton ≈ montre **4 décimales** (`≈ 0,7071`) ;
  une valeur dont l'écriture décimale tient dans l'arrondi s'écrit avec **=** sans zéros inutiles
  (1/4 → `= 0,25`) ; pas de bouton sur un résultat déjà entier ou décimal ; **aligner `.mode décimal`
  sur la même règle, dans une PR à part**.
- 2026-10-11 — PR 2 codée sur `feat/atelier-bouton-approche` : règle unique
  `mathAST/cli/approximation.ts` ; le moteur rend `approximateLatex` / `exactLatex` (calcul) et
  `approximateLatex` (`.solve`, `solutionsApproximationLatex`) ; `Alternative` dans `calcul.ts`, sur
  les calculs, `.résoudre`, l'image et « Résoudre » des cartes ; bouton « Valeur approchée / Valeur
  exacte » dans `CalculView.svelte`. Mesuré : une grandeur ne reçoit jamais de valeur approchée du
  moteur (branche des unités) — la garde « rendu depuis l'arbre » ajoutée ne changeait rien, retirée.
- 2026-10-11 — revue `code-reviewer` de la PR 2 : corrigés un « = » faux pour un grand irrationnel
  (`= 485165195,4098` pour e²⁰ : l'exactitude se décide désormais sur le RATIONNEL,
  `evaluateNodeToRational`, et rien au-delà de 10⁹), les zéros retirés d'une valeur approchée
  (`≈ 5,099` → `≈ 5,0990`, décision « 4 décimales »), l'ordre et la forme des solutions (le bouton
  approche les solutions que les ÉTAPES affichent, `SolvedSteps.approximate`, pas celles du moteur
  triées : `-x^2+x+1=0`, `(x-√2)^2=0`), `.résoudre … dans [a ; b]` sans bouton.
- 2026-10-11 — PR 2 mergée (#1086).
- 2026-10-11 — PR 3, mesuré avant de coder : un nom d'objet fait UNE lettre (`aire = 12` n'est pas
  un nom, `aire*2` se lit a·i·r·e·2) — la ligne « `ai` propose `aire` » de la phase 0 était fausse,
  il n'y a aucun nom du panneau à compléter. Calcul accepte les 19 fonctions de `SHOWN_FUNCTIONS` et
  les lettres grecques tapées en symbole (`2α`, `sin(α)`). PR 3 codée sur `feat/atelier-completion` :
  `atelier/completion.ts` (règle, propositions, insertion), liste « Fonctions et lettres grecques »
  dans `CalculView.svelte`. Preuves rouges par mutation : curseur au milieu, Entrée qui insérerait,
  proposition refusée (`lim(`).
- 2026-10-11 — revue `code-reviewer` de la PR 3 : corrigés le curseur retenu périmé (Cmd+← sur Mac,
  sélection à la souris finie hors du champ : Tab insérait à l'ancienne place — curseur relu au
  moment de décider, et `selectionchange`), `\frac{co` qui proposait `cos(` (aucune proposition dans
  une saisie en LaTeX), deux tests qui ne prouvaient rien (« au plus 8 » devient une garde sur tous
  les débuts de 2 lettres ; condition « choisir changerait le champ » retirée, toujours vraie),
  options annoncées par leur nom. Mesuré : unités (`cm`, `km`, `min`, `h`) et listes qualitatives
  n'ouvrent rien ; `si`, `de`, `et` ouvrent une liste qu'Entrée ignore.
- 2026-10-11 — PR 3 mergée (#1094). Les trois PR de la phase 0 sont livrées.
- 2026-10-13 — PR 4 (feu vert de David) (#1340) : `/cas` et `/cas/` → `/atelier` en
  308, query string comprise (`redirectHandle`, sorti de `hooks.server.ts` dans
  `src/lib/server/redirectHandle.ts` pour être testé seul). Supprimés : la route, `components/cas/`
  (8 composants), `stores/repl.svelte.ts`, `mathAST/cli/completion/` (plus aucun usage : ni
  l'atelier, ni `pnpm math` ; son ré-export de `mathAST/index.ts` retiré). Gardé : `WebReplEngine`.
  Trois réponses de Calcul réparées en même temps : `.exporter` (répondait « Aucun historique a
  exporter » après dix calculs) lance le téléchargement JSON du bouton, ou dit « Rien à exporter
  pour l'instant. » ; `.valeurs` et `.fonctions` (en anglais, depuis l'état du moteur : `u(n)`
  comptée comme fonction, `g(t)` écrite en x, `b = 2*5`) listent les cartes du panneau, en
  français (`listing.ts`), f′ et f⁻¹ comprises.

## Mis de côté (David, 2026-10-11 : « on verra après »)

- ~~`π/3` s'affiche `{1/3}π` dans Calcul (accolades visibles dans le LaTeX)~~ — **fait** le
  2026-10-11 (#1101 : un calcul s'écrit depuis son arbre mis au propre ; #1107 : texte exact).
- ~~Aligner `.mode décimal` sur la règle du bouton ≈ (4 décimales, `=` quand c'est exact)~~ —
  **fait** le 2026-10-11 (#1107).
