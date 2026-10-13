---
title: Atelier de recherche — chapeau du chantier
date: 2026-10-10
status: v1 livrée (dont /grapheur par l'atelier, #811) ; reste le remplacement de /cas ; v2 et v3 non commencées
---

# Atelier — où en est le chantier

- **Ce qui est livré, et comment ça marche** : [docs/systeme/atelier.md](../systeme/atelier.md)
  (vérifié contre le code le 2026-10-10) ; syntaxe des commandes : [atelier-syntaxe.md](../systeme/atelier-syntaxe.md).
- **Historique** (phase 1, lots et PR, décisions D1-D8) : [atelier-progress-historique.md](../archive/wip/atelier-progress-historique.md).

> **Objectif (David, 2026-10-01)** : l'atelier a vocation à **remplacer le REPL web** (`/cas`). Il garde
> `WebReplEngine` comme calculateur (`atelier/engine.ts`) : le moteur reste, la page `/cas` partira.

## Les trois versions du cadrage

| Version | Contenu                                                              | État                                  |
| ------- | -------------------------------------------------------------------- | ------------------------------------- |
| **v1**  | page publique, panneau d'objets, vues Calcul · Graphe · Données, URL | ✅ livrée, `/grapheur` compris (#811) |
| **v2**  | géométrie à la souris (barre d'outils sur `GeometryCanvas`)          | ⏸ non commencée, aucune phase 0       |
| **v3**  | Python, banc d'essai de conjecture (lycée, réseau requis)            | ⏸ non commencée, aucune phase 0       |

## Reste à faire

1. **Remplacer `/cas`** : `/cas` existe toujours (`ReplContainer`), hors barre latérale. Le catalogue de
   l'atelier (`commands.ts`) traduit toutes les commandes du moteur ; 7 sont déclarées indisponibles avec
   leur raison. Pas encore fait : l'inventaire de ce que `/cas` offre et que l'atelier n'offre pas, puis
   le retrait de la page. `/calc` existe aussi (et figure dans le sitemap) ; le cadrage visait la fusion
   `/calc` + `/cas`. **Inventaire fait le 2026-10-11** : [atelier-cas-phase0.md](atelier-cas-phase0.md)
   (↑/↓, bouton exact ⇄ décimal, complétion — phase 0 en attente de validation ; retrait de `/cas` suspendu).
2. **v2, puis v3** : phase 0 à écrire.
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
   - **2c. Commande `.limite`** (aucune aujourd'hui ; `pedagogical-limits` sert aux corrections) :
     syntaxe et limites à gauche / à droite à trancher par David.
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
- **Renommer la liste partenaire choisie** fait revenir en silence au
  partenaire par défaut (#615).
