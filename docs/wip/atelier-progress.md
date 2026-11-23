---
title: Atelier de recherche — chapeau du chantier
date: 2026-10-10
status: v1 livrée (dont /grapheur par l'atelier, #811) ; /cas retirée (2026-10-13) ; v2 et tableur livrés, en prod ; v3 remplacée par le pont « Ouvrir dans Python », livré (#1697, 2026-10-24)
---

# Atelier — où en est le chantier

## Reprendre ici

_Mis à jour le 2026-10-26, après #1839 (limite de uⁿ)._

- **État** : `/spreadsheet` retiré et pont « Ouvrir dans Python » livrés et en prod (v0.47.0).
  Aucun worktree ni PR ouverts pour l'atelier.
- **Fait** : **`/calc` retirée** (2026-10-25, chantier `retrait-calc`, PR 1 #1705 + PR 2) :
  redirection 308 vers `/atelier`, hors du sitemap, `components/calculator`,
  `stores/calculator.svelte.ts` et `mathAST/step-generator` supprimés ;
  `atelier-saisie-naturelle.md` versé dans `atelier.md` et archivé. **Chantier du tableur clos**
  (2026-10-25) : [journal](../archive/wip/atelier-tableur-progress.md) et 8 phases 0 versés dans
  `docs/archive/wip/` ; restent ses vérifications manuelles (David).
- **Ménage** : #1733 verse dans `docs/archive/wip/` les neuf journaux livrés (cas, copier, croiser,
  développer, intervalle, listes qualitatives, réciproque, réglages, remplacer) ; leurs restes ci-dessous.
- **Fait (2026-10-26, #1827, pas en prod)** : bouton ⤢ « Agrandir le graphe » dans la barre du graphe (toute la fenêtre, Échap le réduit), icône maison pour « Réinitialiser la vue », graphe qui remplit la largeur de sa vue. Échap quitte aussi le plein écran du NAVIGATEUR (Chrome) : verrou d'Échap proposé, refusé par David. Worktree retiré.
- **Fait (2026-10-26, #1839, pas en prod)** : limite de uⁿ quand u → ±∞ (V66, ex-« V65 » en doublon) : `.variations (x-3)^2` a son tableau ; [journal](../archive/wip/limite-puissance-progress.md).
- **Fait (2026-10-27, #1844, #1852, #1857, pas en prod)** : écarts voisins V67-V71 des limites ; [journal](../archive/wip/limites-ecarts-progress.md), restes dans les Points ouverts du README mathAST.
- **Déployé** : v0.47.0 (2026-10-25) livre le retrait de `/spreadsheet`, de `/calc` et le pont Python.
  Table `spreadsheets` supprimée le 2026-10-25 ([journal](../archive/wip/drop-spreadsheets-progress.md)).
- **Sens inverse Python → atelier LIVRÉ** (#1746, 2026-10-25, sur `main`, pas en prod) : chantier
  [python-vers-atelier](../archive/wip/python-vers-atelier-progress.md). Plus tard, si l'usage le demande :
  « Ouvrir dans Python » pour une carte `f′`.
- **Restes des phases 0 archivées le 2026-10-25** (`docs/archive/wip/`) : Q93 et M1, crues ouvertes,
  étaient tranchées depuis le 2026-10-02 (décisions 92 et 93 d'`outils-statistiques-v2-progress.md`) et
  confirmées par David le 2026-10-25 — 20 modalités par côté dans l'atelier, 8 dans un bloc imprimé ;
  `1e3` → 1000, `2x`/`π`/`3 m` = mots, cause nommée. Restent : `breadcrumb-ellipsis` dit encore
  « More » (composant inutilisé) ; `f(2x)` sur un intervalle : chantier [composees](../archive/wip/composees-progress.md) (2026-10-26).

- **Ce qui est livré, et comment ça marche** : [docs/systeme/atelier.md](../systeme/atelier.md)
  (vérifié contre le code le 2026-10-10) ; syntaxe des commandes : [atelier-syntaxe.md](../systeme/atelier-syntaxe.md).
- **Historique** (phase 1, lots et PR, décisions D1-D8) : [atelier-progress-historique.md](../archive/wip/atelier-progress-historique.md).

> **Objectif (David, 2026-10-01)** : l'atelier a vocation à **remplacer le REPL web** (`/cas`). Il garde
> `WebReplEngine` comme calculateur (`atelier/engine.ts`) : le moteur reste, la page `/cas` partira.

## Les trois versions du cadrage

| Version | Contenu                                                              | État                                                                                                                |
| ------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **v1**  | page publique, panneau d'objets, vues Calcul · Graphe · Données, URL | ✅ livrée, `/grapheur` compris (#811)                                                                               |
| **v2**  | géométrie (vue Figure, points, courbes par équations, puis souris)   | ✅ lots 1-3 livrés ([journal](../archive/wip/atelier-geometrie-progress.md)), en prod (v0.41.0)                     |
| **v3**  | Python, banc d'essai de conjecture (lycée, réseau requis)            | ❌ remplacée le 2026-10-24 : pont « Ouvrir dans Python » livré, #1697 ([décision](../systeme/atelier.md#décisions)) |

## Reste à faire

1. **Remplacer `/cas`** — ✅ **fait le 2026-10-13** (PR 4 de [atelier-cas-phase0.md](../archive/wip/atelier-cas-phase0.md),
   #1340) : la page est retirée, l'adresse mène à `/atelier` ; moteur allégé de ce que seule `/cas`
   utilisait (#1343). Reste `/calc` (publique, dans le sitemap) : ses commandes ne marchent pas — en
   mode commande elle envoie `..diff x^2` et le moteur répond « Commande inconnue : .diff » (constat
   du 2026-10-13, antérieur à #1343). Décision de David (2026-10-13) : l'atelier remplace `/calc` ; il lui manque d'abord une saisie
   naturelle (MathLive, sans point) → [atelier-saisie-naturelle.md](../archive/wip/atelier-saisie-naturelle.md).
   Précisé le 2026-10-14 : plus aucun correctif sur `/calc` (V55 sans objet), la page sera supprimée.
   Historique : `/cas` existait toujours (`ReplContainer`), hors barre latérale. Le catalogue de
   l'atelier (`commands.ts`) traduit toutes les commandes du moteur ; 7 sont déclarées indisponibles avec
   leur raison. Pas encore fait : l'inventaire de ce que `/cas` offre et que l'atelier n'offre pas, puis
   le retrait de la page. `/calc` existe aussi (et figure dans le sitemap) ; le cadrage visait la fusion
   `/calc` + `/cas`. **Inventaire fait le 2026-10-11** : [atelier-cas-phase0.md](../archive/wip/atelier-cas-phase0.md)
   (↑/↓, bouton exact ⇄ décimal, complétion — PR 1 à 3 livrées le 2026-10-11, PR 4 le 2026-10-13).
2. **v2, puis v3** : v2 livrée, chantier clos le 2026-10-19 ([phase 0](../archive/wip/atelier-geometrie-phase0.md), [journal](../archive/wip/atelier-geometrie-progress.md)) ; v3 remplacée le 2026-10-24 par le pont « Ouvrir dans Python », livré par #1697 ([journal](../archive/wip/atelier-python-progress.md)).
   Après la PR 1 de la géométrie : « Remplacer mon atelier » par un atelier reçu ([atelier-remplacer-phase0.md](../archive/wip/atelier-remplacer-phase0.md), validée le 2026-10-18).
3. **Étapes rédigées : plan décidé par David le 2026-10-13** (ses réponses Q1-Q4 = mes recommandations).
   - **2a. Sélecteur « résumé / détaillé »** — **fait (PR à venir)** (`steps-summary.ts`, tests
     `etapes-resume.test.ts` et `etapes-resume.svelte.test.ts`) : interrupteur DANS chaque « Comment ? » déplié (pas de
     réglage global) ; « détaillé » à l'ouverture, dernier choix retenu dans ce navigateur ; les quatre
     commandes qui rédigent déjà (simplifier, factoriser, dériver, résoudre ; toutes figées sur
     `verbosity: 'detailed'`) ; pas d'interrupteur là où le résumé ne diffère pas du détaillé ; une
     réponse sans étapes (V48) reste sans « Comment ? ». Une étape essentielle (valeur interdite) reste
     aux deux niveaux.
   - **2b. Brancher les étapes que le moteur rédige déjà**, une commande par PR : `.intégrer`
     (`pedagogical-integration`), puis `.domaine` (`pedagogical-domain`), puis `.évaluer`
     (`pedagogical-evaluate`) ; rédaction mesurée sur des cas d'élèves avant, refus si trompeuse.
   - **Retour de David sur 2a (2026-10-13)** : réglage **ligne par ligne** (#1292 basculait toute la vue) ;
     le dernier choix sert de niveau d'ouverture aux lignes dépliées ensuite.
   - **2b `.intégrer` — décidé par David le 2026-10-13** (mes recos) : PR 1 = branchement avec garde de
     concordance (étapes ↔ réponse du moteur) et refus des cas trompeurs (composées au coefficient non
     expliqué, bornes littérales, `\ln x` de 0 à 1 impropre) ; PR 2 = rédaction des composées
     (« $e^{2x} = \frac12 \times 2e^{2x}$ »), `\ln|u|` en primitive mais `\ln u` si u > 0 sûr,
     « F(b) − F(a) » ; PR 3 = IPP en notation terminale (u, v′) ; plus tard `1/x^2`, `\sqrt x` (x^n).
     Hors terminale (IPP cyclique, éléments simples) montré ; `+ C` gardé ; pôle dans l'intervalle :
     étapes du refus montrées.
   - **2b `.intégrer` PR 1 — FAITE (2026-10-13, branche `feat/atelier-etapes-integrer`, non commitée à la
     remise de l'agent)** : `integrate-steps.ts` + garde `integrate-steps-check.ts` (concordance avec le
     moteur ; coefficient caché détecté sur les règles composées et le v d'une IPP), branchés dans
     `calcul.ts` ; tests `integrer-etapes.test.ts`. **Écart à la décision** : le pôle dans l'intervalle
     sort en ligne de REFUS (`CalcResult` `refus`, sans champ `steps`) — pas d'étapes du refus dans cette
     PR ; les y mettre demande un champ `steps` sur `refus` + son rendu dans `CalculView` (à trancher).
     Revue : éléments simples à facteur non unitaire refusés (coefficient caché) ; contrôle du v d'IPP
     retiré (aucun cas ne passait que par lui). **Noté pour plus tard** : parenthèses résiduelles dans
     les étapes (`\int \left(2e^{2x}\right)dx` quand l'intégrande vient d'une f(x) définie).
   - **2b `.intégrer` PR 2 — FAITE (2026-10-13, branche `feat/integration-redaction-composees`, non
     commitée à la remise de l'agent)** : étape `reveal-derivative` (« On fait apparaître $u'$ ») avant
     toute composée à coefficient (½, signe, facteur constant), v d'une IPP rédigé sous « Choix » ;
     `\ln\left| u \right|` dans les étapes, `\ln u` si u > 0 certain (`positivity.ts`) ; « $F(b) - F(a)$ ».
     Garde : un `k` n'est accepté que si la réécriture le précède (`revealExplains`) ; e^{2x}, sin(2x),
     e^{-x}, 3/x, x/(x²+1), (2x+1)³, xe^{2x}… passent de refusés à montrés. Restent refusés : éléments
     simples à facteur non unitaire (même principe à appliquer, non décidé). Tests :
     `composees-coefficient-explique.test.ts`, `integrer-etapes.test.ts`.
   - **2b `.intégrer` — étapes du refus (2026-10-13, branche `feat/atelier-integrer-pole`)** : l'écart
     ci-dessus est résorbé. `CalcResult` `refus` reçoit `steps?`/`summary?` ; `integrateRefusalSteps`
     les pose pour `INTEGRAL_UNDEFINED` quand les étapes concluent `undefinedAt` et que la valeur citée
     est vérifiée interdite et dans [a ; b] (`citesForbiddenPoint`). Borne = pôle (`\frac1x` de 0 à 1) :
     concordant (« 0 appartient à [0 ; 1] », le moteur dit « diverge en x = 0 »), étapes montrées.
     `desk` et `CalculView` : « Comment ? » sur la ligne de refus, rien à changer dans le composant.
     Tests : `integrer-etapes.test.ts` (refus + garde), `integrer-pole-depliage.svelte.test.ts` (rendu).
     **Noté** : l'intégrande `\frac{1}{x-2}` s'écrit `\dfrac{1}{\left( x - 2 \right)}` dans les étapes
     (parenthèses résiduelles, `pedagogical-integration`).
   - **2b `.intégrer` PR 3 — FAITE (2026-10-13, branche `feat/integration-ipp-terminale`, commit
     01c392219)** : IPP en notation de terminale au lycée (u(x), v′(x), u′(x),
     v(x) ; formule avec bornes annoncée dans une intégrale définie, puis la version primitive des
     lignes de calcul), supérieur inchangé (u, dv). Sous-étapes `reveal-derivative` du v gardées ; IPP
     cyclique idem. Tests : `ipp-notation-terminale.test.ts`, `integrer-etapes.test.ts`.
     **À soumettre à David** : IPP calculée AVEC bornes (∫₀¹ = [xeˣ]₀¹ − ∫₀¹ eˣ dx) plutôt que
     primitive puis théorème fondamental — changement d'architecture du pipeline, non fait.
   - **À faire plus tard — défauts du moteur `integration` relevés (2026-10-13)** :
     - Le domaine rend des pôles faux près de 0 : x³ − 6,4·10⁻¹¹ (pôle 0,0004) rendu « 0 » ;
       x³ − 10⁻¹⁰ (pôle 0,000464) rendu 0,000737.
     - `.intégrer \frac1t ; t de -1 à 1` : le message du refus dit « (x ≈ 0) » au lieu de t.
     - `.intégrer … de -1 à 1/2` : le message écrit l'intervalle « [-1 ; 1:/2] ».
     - `.intégrer \frac{1}{x^2-2} de 0 à 2` : « Unable to factor denominator », en anglais.
   - **Décisions de David du 2026-10-13 (soir), mes recos** — `.intégrer` : I1 titre « On sort la
     constante k » quand u′ = 1 ; I2 garder $-\left(-e^{-x}\right)$ pour k = −1 ; I3 IPP bornée via
     primitive gardée, rédaction directe $[uv]_a^b - \int_a^b u'v$ plus tard. `.domaine` : Q1 corriger
     le moteur (chaque étape montre l'ensemble de SA contrainte) ; Q2 corriger l'écriture des ensembles
     (périodiques, singleton) ; Q3 valeur interdite irrationnelle → étapes refusées, réponse « ≈ 1,26 » ;
     Q4 brancher sans la résolution de la contrainte, raccord au tableau de signes plus tard ; Q5 réponse
     en formule $D = …$ ; Q6 brancher « domaine universel », justification « $x^2+1>0$ » si simple.
     **PR 1 `.domaine` (moteur) faite (2026-10-13, branche `fix/pedagogical-domain-etapes`)** : G1
     garde `unresolved` (+ domaine restreint sans contrainte enregistrée, `x^{-1/2}`), Q1, Q2, D3
     (racine n-ième), Q6 (`x^2+1`, somme de puissances paires + constante > 0 seulement), Q3 (valeur
     interdite en décimal → pas d'étapes), étapes qui doivent prouver le domaine (revue) ; tests
     `pedagogical-domain/__tests__/redaction-etapes.test.ts`, doc `docs/systeme/mathast/README.md`.
     Découpage : PR 1 moteur (garde `unresolved` aussi pour `correction-generator`, Q1, Q2, Q6) ; PR 2
     atelier (« Comment ? », garde par ensembles, Q3, Q5).
     **PR 2 `.domaine` (atelier) faite (2026-10-13, branche `feat/atelier-etapes-domaine`)** :
     réponse en formule `D = …` (Q5, `domainToLatex`, plus de « Condition ») ; « Comment ? » +
     Résumé / Détaillé derrière `sameDomainByValue` (ensemble conclu = domaine du moteur, par
     valeur) ; Q3 : pas d'étapes, `D = ℝ \ {α} avec α ≈ 1,26` (écriture validée par David) ; Q4, Q6 branchés ; refus inchangés. `domain-steps.ts`,
     `domain-steps-check.ts` ; tests `domaine-etapes.test.ts` (+ export),
     `domaine-etapes-affichage.svelte.test.ts` ; tests qui lisaient « Domaine : … » / « t > 0 »
     dans le texte mis à jour (oracle du domaine compris). Reste : justification « $x^2+1>0$ »
     dans l'étape universelle si simple (Q6), raccord au tableau de signes (Q4).
   - **Décisions de David (2026-10-13, fin de journée)** : le signe moins se rédige « On sort le signe
     $-$ » ($\int -f = -\int f$, sans $(-1)$), quelle que soit l'écriture (`\frac{-1}{x}`, `-\frac1x`,
     `-e^x`) ; valeur interdite approchée de `.domaine` écrite $D = \mathbb{R}\setminus\{\alpha\}$ avec
     $\alpha \approx 1{,}26$ (validé).
   - **`.évaluer` — décidé par David le 2026-10-14** (phase 0 : pas de module d'évaluation pédagogique ;
     `pedagogical-arithmetic` saute les pièges du négatif, écrit `*`, conclut 2/0 en silence) : E1 moteur
     d'abord ; E2 rédaction collège ; E3 une opération par étape, $(-3)^2 = (-3)\times(-3) = 9$, étape
     « On remplace $x$ par … », résumé = remplacement + résultat ; E4 pas de « Comment ? » pour
     $e^0$, $\ln 1$… ; E5 saisie décimale → réponse décimale (2,25) ; E6 (validé le 2026-10-14)
     plusieurs lettres séparées par « ; » (`en a=1,5 ; b=2`), une étape « On remplace $a$ par $1{,}5$
     et $b$ par $2$ », message « Sépare les valeurs avec « ; » » si virgule. Découpage : PR 1 réponse en formule + refus justes ; PR 2 moteur
     (`\times`, $(-a)^n$, plus de calculs avalés, titre de √9, dénominateur nul) ; PR 3 atelier.
     PR 1 (#1351) et PR 2 (#1353) mergées. **PR 3 faite (2026-10-14)** : `evaluate-steps.ts` +
     `evaluate-steps-check.ts`, étape « On remplace » rédigée par l'atelier, résumé construit
     (remplacement + « On effectue les calculs »), gardes E4/E5, une seule lettre ; tests
     `evaluer-etapes.test.ts`, `evaluer-etapes-affichage.svelte.test.ts`. Reste : E6.
   - **2c. Commande `.limite`** — syntaxe validée par David le 2026-10-14 : L1 `en 1` (`en x=1`
     toléré) ; L2 côté `0+` / `0-` / `0^+` et `à droite` / `à gauche` ; L3 `+∞`, `+inf`, `∞` seul =
     $+\infty$ ; L4 sans côté et gauche ≠ droite → « Pas de limite en 0 : à gauche $-\infty$, à droite
     $+\infty$ » ; L5 réponse $\lim\limits_{x\to 1}\dfrac{x^2-1}{x-1} = 2$, `e` et non `exp(1)`, jamais
     de valeur approchée ; L6 `.limite f en +∞` → $\lim f(x)$. PR 1 moteur (#1359) mergée ; PR 2
     commande qui répond seule ; PR 3 « Comment ? ». Plus tard : conjuguée, forme $1^\infty$.
     **Fait le 2026-10-14** : PR 2 #1361 (`limit.ts`), moteur #1362 (`definedSide`, `noLimitReason`,
     oscillation, e, statut approché, f(u) exact), raisons écrites #1363. Ouvert : raison quand le côté
     est TAPÉ (reco : oui, « n'est pas définie à droite de 0 ») ; PR 3 « Comment ? » ; E6.
   - **Décisions de David (2026-10-14, « je suis tes recos »)** : Q1 `.limite` avec côté TAPÉ → raison
     écrite (« n'est pas définie à droite de $0$ », « oscille… ») ; Q2 fonction à paramètre : refus
     large gardé (#1365), refus ciblé (seulement si le paramètre décide) en PR à part plus tard ;
     Q3 primitive/intégrale qui divise par le paramètre → condition « ($a \neq 0$) » affichée ;
     Q4 bouton « Dériver » de la carte aligné sur la commande ($f'(x) = a$) ; Q5 V57 `.résoudre a x = 0`
     → refus « Le résultat dépend de a » quand le moteur divise par une expression du paramètre
     ($x + a = 0$ reste accepté) ; discussion complète « si $a \neq 0$… si $a = 0$… » = piste future.
   - **Décisions de David (2026-10-14, « je te suis »)**, après V58/V60/V61 (#1371, #1373, #1374) :
     intégrale BORNÉE à paramètre → la condition de l'intégrande est dite (`1/(a x)` de 1 à 2 →
     $\dfrac{\ln 2}{a}$ ($a \neq 0$)), la primitive seule ne la redit pas (la saisie la montre) ;
     `E(x)` lu comme la partie entière dans l'atelier, en PR à part (aujourd'hui `.limite E(x) en 1` → « E »).
   - **3. V48 (a)** : rédaction sur la fraction écrite (valeur interdite, double barre).

### Dettes encore ouvertes (vérifiées dans le code)

- **D10 depuis les vues** — `create`/`update` ont un paramètre de provenance,
  mais `ObjectPanel` et `DataView` appellent sans lui (défaut `'url'`) ; seule
  la vue Calcul passe `'text'` (`desk.svelte.ts:401`). Sans effet observé.
- **`recomputeAll` réassigne tout le tableau** (`atelier.svelte.ts`,
  `this.items = this.items.map(...)`). Jamais mesuré sur une vue réelle.
- **Curseur recréé par `build()`** — sans effet tant qu'on ne peut pas régler
  les bornes d'un curseur depuis l'atelier : aucune action ne le permet encore.
- **Composant de saisie des unités** (macro `\unit`, palette) — pas extrait ;
  aucune trace de `\unit` dans `components/atelier`.
- ~~**Renommer la liste partenaire choisie** fait revenir en silence au
  partenaire par défaut (#615).~~ Corrigé (`2e7351c11`, 2026-10-02 ; test `list-limits.test.ts`).

### État mesuré le 2026-10-14 (moteur de `main`, `runInput` / `CalcDesk`)

Relevé des points « plus tard » de ce journal et des phases 0, à la demande de David.

- **Faits depuis** :
  - message anglais « Unable to factor denominator » → « Je ne sais pas factoriser le
    dénominateur » ;
  - pôles faux près de 0 (x³ − 10⁻¹⁰) → plus de valeur fausse, refus honnête ;
  - `m(x) = 1/0` → `.domaine m` répond ∅ (étape « 0 ≠ 0 »), `m(1)` « Division par zéro » ;
  - forme 1^∞ : `.limite (1+1/x)^x en +inf` → e, 3 étapes ;
  - `π/3` sans accolades, `.mode décimal` à 4 décimales (#1101, #1107).
- **Toujours ouverts** :
  - `.intégrer 1/t de -1 à 1` dit « (x ≈ 0) » au lieu de t ;
  - `.intégrer 1/x de -1 à 1/2` écrit « [-1 ; 1:/2] » ;
  - image depuis la carte f′ : « Impossible de calculer f′(1). » ;
  - sans étapes : `.intégrer 1/x^2`, `.intégrer \sqrt x`, `.limite` par la conjuguée ;
  - `.domaine 1/(x^2+1)` : « Aucune restriction particulière », sans « x² + 1 > 0 » ;
  - fonction à paramètre libre : refus large (`.variations`, `.limite`, `.résoudre`) ;
    réciproque à paramètres sans carte refusée ;
  - `cos(2(x+1))` développé, `e^(2(x+1))` « rien à développer » ;
  - `0,5*0,5` → 1/4 en mode exact (décision de David en attente) ;
  - saisie, lot 2 (tournures nominales, `2,5 h en min`) ;
  - tableur : option C choisie le 2026-10-15, lot 1 livré (#1410→#1413) ; phase 0 du lot 2 validée ([atelier-tableur-lot2-phase0.md](../archive/wip/atelier-tableur-lot2-phase0.md)) ; v2, v3 non commencés ; « Renommer » désactivé ; pas de palette d'unités ;
  - composées `f(2x)` sur un ensemble (atelier-intervalle, décision c) : chantier [composees](../archive/wip/composees-progress.md), u affine (2026-10-26).
- **Corrigés par #1404 (2026-10-15)** : image depuis la carte f′, « (x ≈ 0) » pour t, « [-1 ; 1:/2] »
  (et `\pi`), les trois défauts nouveaux ci-dessous ; revue : `3 en m` refusé n'efface plus la
  grandeur d'avant, lettres grecques en symboles dans « dépend de ».
- **Défauts nouveaux, trouvés en mesurant** (corrigés par #1404) :
  - `2,5 h en min` (sans `.convertir`) est calculé comme un produit et s'affiche
    « 2,5 h e n m i n », sans refus ;
  - `.intégrer 1/(x^2-2)` (sans bornes) rend la sortie brute du moteur « ∫ 1/(x^2-2) dx : Non
    résolu / Technique tentée : … » au lieu d'un refus en français ;
  - `.réciproque a x + b` : « la réciproque de f », alors qu'aucune f n'est tapée.
