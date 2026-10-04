---
title: Atelier — `/grapheur` passe par l'atelier, progression
date: 2026-10-04
phase0: docs/wip/atelier-grapheur-phase0.md (validée le 2026-10-04)
---

# `/grapheur` passe par l'atelier — progression

## Lot 1 — les réglages d'affichage appartiennent à l'objet

Branche `feat/atelier-reglages-affichage`, worktree `../ubumaths-wt-reglages`.

- [x] Tests rouges : `src/lib/atelier/__tests__/reglages-affichage.test.ts`
      — 23 rouges sur le comportement (`setDisplay` absent, aucun réglage) ;
      3 verts, tous des garde-fous de limite (fonction jamais tracée sans
      réglages, rien de rangé pour rien, jamais de case f′).
- [x] Implémentation — 26/26 ; suites atelier + grapheur + stores : 1 347
      serveur, 308 navigateur ; `check:incremental` 0 erreur ; `lint:fast` propre.
  - `display.ts` : `curveDisplaySchema` (une seule règle pour la carte, la
    sauvegarde et le lien), `newDisplay` (couple couleur/style libre, règle
    `getNextSlot` du grapheur), `readDisplayPatch`, `plainDisplay` (copie sans
    proxy, pour `structuredClone`).
  - `FunctionObject.display?` ; `setPlotted` l'attribue au premier tracé ;
    `update` le conserve ; `setDisplay` le modifie ; `adoptDisplay` le pose à
    la relecture (`restore`, `mergeInto`) AVANT le tracé.
  - Sauvegarde/lien : champ optionnel, version inchangée ; `.catch(undefined)`
    — un réglage abîmé est oublié, l'objet gardé.
  - `syncPlots` recopie les réglages en n'écrivant que ce qui diffère ;
    `showDerivative` toujours ramené à `false` (Q1).
  - Preuves rouges par neutralisation (copie de sauvegarde, pas de
    `git checkout`) : sans `.catch` → « réglage illisible » rougit ; diff
    forcé → « n'écrit rien » rougit.
- [x] Revue `code-reviewer` : rien de bloquant ; corrigé, tests d'abord (rouges vus) :
  - F1 une clé `undefined` (zod 4 la garde) effaçait le réglage et faisait
    jeter `serialize()` → écartée dans `readDisplayPatch` ;
  - F2 bornes ±1e9 partagées avec le grapheur (`COORDINATE_LIMIT`) ;
  - F3 `setDisplay` ne relance plus `recomputeAll` (seulement `revision++`) ;
  - F4 un nom qui pointait vers un nuage est retracé en courbe ;
  - F5 `settingsDiff` recopie sans proxy ; F9 patch vide = rien ;
  - F7 mesuré : sans compression, 8 fonctions aux réglages complets = 2 332
    caractères de lien (plafond 1 800) → rangement compact (couleur, style,
    écarts au défaut) : 1 351.
  - F6 **accepté, noté** : une fonction reçue par lien garde sa couleur même
    si une courbe de l'atelier l'a déjà ; les fonctions retirées gardent la
    leur et comptent dans le choix de la suivante. À revoir si ça gêne à
    l'usage.
- [x] PR #779, CI verte (un job relancé : port Postgres occupé sur le runner), mergée.

## Lot 2a — la carte modifiable

Branche `feat/atelier-carte-modifiable`, worktree `../ubumaths-wt-carte`.
Le lot 2 est coupé en deux PR (contenu inchangé) : 2a = champ + carte fermée,
2b = « Sur le graphique ».

### Mesure préalable — ce que MathLive écrit (Chromium, frappe réelle)

| Tapé       | MathLive rend                                         |
| ---------- | ----------------------------------------------------- |
| `f'(x)+1`  | `f^{\prime}\left(x\right)+1`                          |
| `x^2-3x+1` | `x^2-3x+1` (sort seul de l'exposant après un chiffre) |
| `sin(x)`   | `\sin\left(x\right)`                                  |
| `a*x`      | `a\cdot x`                                            |
| `1/2x`     | `\frac{1}{2x}` ⚠️ = 1/(2x)                            |

- [x] `f^{\prime}` était **refusé** par le parseur LaTeX → accepté
      (`^{\prime}`, `^{\prime\prime}`, `^\prime`), tests au niveau du
      parseur, preuve rouge (5 rouges avec l'ancien parseur).
- [x] En LaTeX, l'atelier ne transmettait pas ses noms de fonctions :
      `k(x)` tapé dans la carte se lisait k·x → corrigé (`parse.ts`).
- Suites mathAST + atelier + grapheur + questions : 21 145 verts.
- [x] Secours « unité » : MathLive écrit `12\operatorname{\mathrm{km}}`
      (refusé) ; `normalizeStudentQuantity` (questions) le ramène à
      `12\unit{km}` mais ferait de `2b` « 2 unité b » (mesuré) → appliqué
      SEULEMENT si la saisie brute ne se lit pas et que le résultat est une
      grandeur (`atelier/mathfield.ts`). 10 tests, 4 rouges sur stub.
- [x] Carte : `DefinitionField.svelte` (préfixe `f(x) =`, MathLive, écriture
      0,3 s après la dernière touche, provenance `keyboard`, suit une
      modification faite ailleurs, prête à taper si vide, flush à la
      fermeture) ; `ObjectCard` : pastille de couleur, définition rendue par
      `toLatex` (jamais le texte saisi dans `{@html}`), 👁 sans changer de vue.
      14 tests navigateur (11 rouges avant) ; 2 anciens tests qui cherchaient
      le texte brut `x^2` adaptés (rendu mathématique voulu, C1).
- Suites client atelier + grapheur : 322 verts ; `check:incremental` 0 ;
  eslint des fichiers touchés propre.
- [x] Revues `code-reviewer` + `accessibility-tester` : rien de bloquant
      côté sécurité (sonde XSS : `\href`, `\htmlData`, `<img onerror>`…,
      tout refusé ou dépouillé). Corrigé, tests d'abord (rouges vus) :
  - A ouvrir puis fermer une carte réécrivait la définition traduite
    (drapeau `dirty` ; preuve par neutralisation) ;
  - B MathLive ne connaît pas `\unit` (« 12 \unitkm ») → `forMathlive`
    réécrit en `\operatorname{\mathrm{km}}`, sa propre forme ;
  - C définition vidée ailleurs : champ vidé (correctif LOCAL — `MathField`
    est partagé avec les réponses aux questions, on n'y touche pas) ;
  - a11y : définition rendue `aria-hidden` + texte lisible
    (`convertLatexToSpeakableText`) ; 👁 à étiquette constante + `aria-pressed` ;
    focus visible ; pastille neutre = cercle vide lisible en projection.
  - Fermer une carte = en ouvrir une autre (re-cliquer ne referme pas :
    comportement existant, noté).
- Noté, hors lot (revue D/E) : un nom de fonction suivi d'un exposant entre
  accolades (`u^{2}`, `h^{10}`) ne se lit pas en LaTeX (limite antérieure,
  désormais atteignable depuis la carte) ; `F`, `G`, `H` ne sont plus des
  fonctions par défaut en lecture LaTeX (cohérent avec la lecture texte).
- Noté pour le lot 3 : l'action « Tracer » (qui bascule vers Graphe) fait
  maintenant doublon avec 👁 — à trancher avec la règle des actions.

## Lot 2b — « Sur le graphique » dans la carte

Branche `feat/atelier-carte-reglages`, worktree `../ubumaths-wt-reglages2`.
Lot 2a mergé (#784) ; pied de page limité à l'accueil (#787, hors chantier).

- [x] `curveOf(atelier, graph, nom)` (`plot-sync.ts`) : la courbe dessinée
      pour un objet, en lecture seule — 3 tests, rouges avant.
- [x] `CurveSettings.svelte` : couleur, épaisseur, style, tangente (curseur
      x₀, pente, cercle osculateur, κ), aire (bornes, aire signée, longueur).
      Écrit dans l'atelier (`setDisplay`) ; calcule sur la courbe dessinée.
      Pas de case f′ (Q1). Rien dans Calcul (S5). 8 tests navigateur, 7 rouges
      avant (1 garde-fou).
- [x] `AtelierContainer` fournit son grapheur par contexte à tout le
      conteneur (la carte lit la courbe et la fenêtre visible).
- Trouvé par le test : deux bornes modifiées coup sur coup — la seconde lisait
  la prop périmée et effaçait la première → lecture de l'état courant de
  l'atelier.
- Suites : 335 navigateur, 1 379 serveur ; `check:incremental` 0 ; eslint propre.
- [x] Revues `code-reviewer` + `accessibility-tester` : rien de bloquant ;
      corrigé, tests d'abord (rouges vus) :
  - réactivité : retirer puis retracer laissait « pente non définie »
    (`posted` non réactif) → le `$derived` lit `graph.functions` ; preuve par
    neutralisation ;
  - borne > 1e9 refusée en silence → message (`role="alert"`,
    `aria-invalid`), et le champ reprend la valeur retenue en le quittant ;
  - curseur x₀ : `aria-valuetext` « x₀ = 1,5, pente 3 » (le curseur partagé ne
    transmet rien à son pouce → posé sur l'élément `role="slider"`) ;
  - bornes : groupe nommé, noms qui commencent par le mot visible (WCAG 2.5.3) ;
    tailles lisibles en projection ; pas de `h3` orphelin ;
  - nombres avec la virgule (règle #448) — ⚠️ le grapheur, lui, affiche
    encore un point : écart assumé, à aligner lors de la bascule (lot 6).
- Noté, à trancher (revue) : des bornes inversées (de 0 à −3) donnent une
  aire POSITIVE (`integralUnder` trie les bornes, comme le grapheur).

## Lot 3a — « Dériver » crée la carte `f′`

Branche `feat/atelier-deriver-carte`, worktree `../ubumaths-wt-deriver`.
Lot 2b mergé (#795). Le lot 3 est coupé en deux PR (contenu inchangé) :
3a = l'objet `f′` ; 3b = règle des actions (pas de bascule vers Calcul,
repère « nouveau résultat », champ « Image »).

Mesuré avant : `g(x) = f'(x)` valait déjà `2x-3` (dérivée vivante) ; le nom
`f'` était refusé ; `f'(2)` se calcule même avec un objet `f'` présent (le
moteur n'est donc pas touché).

- [x] `names.ts` : `isDerivativeName`, `derivativeOf`, `derivativeName`,
      `displayName` (`f'` s'affiche `f′`, `f''` → `f″`).
- [x] `createDerivative` : objet `f'` défini par `f'(x)` (vivant), tracé si
      `f` l'est, pas de doublon (`existed`), refusé sur vide / illisible /
      en attente (message de l'objet) / non-fonction ; un objet `f'` défini
      autrement est refusé (E1). Renommer `f` renomme `f′` ; la fusion d'un
      lien emmène `f′` avec `f` renommée.
- [x] « Dériver » (bouton) et `.dériver f` créent la carte ET écrivent la
      ligne ; `.dériver x^2+1` ne crée rien ; `f'(x) = 3x` tapé est refusé.
- [x] « Garder la dérivée » supprimée (action, code, et son fichier de test
      — dont un test assertait l'inverse de G6) ; ses cas utiles repris.
- [x] Carte `f′` : nom `f′`, formule calculée, pas de champ, « dérivée de f ».
- Trouvé en route : sur une fonction en attente, « Dériver » ajoutait « ne
  se lit pas » (faux) → la carte n'est tentée que si le calcul aboutit.
- [x] Revue `code-reviewer` — corrigé, tests d'abord (7 rouges vus) :
  - **B1 (bloquant)** : `differentiate` lève sur |x| ; la carte `f′` qui suit
    `f` le rencontrait dès que `f` devenait `abs(x)` → carte, moteur et tracés
    tombaient. `expressionOf` rattrape l'échec, la carte `f′` passe en erreur
    (« La dérivée de « f » ne se calcule pas. »), aucune carte n'est créée
    pour une fonction non dérivable.
  - B2 : renommer `g` en `f` alors qu'une `f′` orpheline existe faisait deux
    `f′` → refusé. C3 : renommer `f′` elle-même → refusé (« c'est f qu'on
    renomme »). C1 : la fusion traite les fonctions avant leurs dérivées.
    C2 : `.dériver f` dit « existe déjà » / « ne se calcule pas » comme le
    bouton (`derivativeNote`, partagé).
  - Noté, non traité : C4 (une `f′` orpheline peut arriver par sauvegarde ou
    lien — sans danger, aucune saisie élève ne l'atteint) ; M1 (`f″` de x³
    s'affiche `3*2x` : `differentiate` ne simplifie pas) ; M5 (L1 : la carte
    existante n'est pas SÉLECTIONNÉE — avec le lot 3b, qui gère l'écran).
- ⚠️ La bascule vers Calcul après « Dériver » reste jusqu'au lot 3b.
- Tests : 32 serveur (27 rouges avant) + 3 navigateur ; suites atelier
  236 navigateur, 2 120 serveur ; `check:incremental` 0 ; les 18
  avertissements eslint des fichiers touchés sont antérieurs (aucun dans
  les lignes modifiées, vérifié).

## Lot 3b — une action ne change pas de vue

Branche `feat/atelier-actions-sans-bascule`, worktree `../ubumaths-wt-actions`.
Lot 3a mergé (#798).

- [x] Une action écrit sa ligne dans Calcul SANS y emmener (G7, A1/A2) ;
      « Tracer », « Nuage », « Diagramme » gardent leur bascule (A5, Q2).
- [x] Repère « • » sur l'onglet Calcul tant qu'un résultat n'a pas été vu
      (A3), avec texte pour lecteur d'écran et annonce ; ce qu'on calcule
      sous ses yeux dans Calcul ne compte pas comme nouveau.
- [x] « Image d'un nombre » : n'est plus un bouton qui prépare `f(` dans
      Calcul, mais un champ `f( x ) = …` dans la carte (A4) ; la ligne va
      aussi dans Calcul ; ⚠️ ne passe pas par `submit`, qui VIDAIT le
      brouillon de Calcul.
- [x] L1 : dériver une seconde fois sélectionne la carte `f′` existante.
- Choix à signaler à David : « Tableau croisé » et « Comparer » PRÉPARENT
  une commande à compléter au clavier → elles emmènent toujours dans Calcul
  (y aller est le geste lui-même).
- Tests : 10 navigateur (8 rouges avant, 2 garde-fous) ; un ancien test
  (« Image prépare la saisie ») remplacé — il assertait le comportement que
  A4 supprime. Suites : 338 navigateur, 1 171 serveur ; `check:incremental` 0.

## Lots suivants

2 carte modifiable · 3 Dériver → `f′` · 4 curseurs · 5 suites · 6 bascule.
