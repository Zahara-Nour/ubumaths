# Chantier `solides-3d` — figures de l'espace qui tournent

## Reprendre ici

_Mis à jour le 2026-11-26, après #3200 et l'essai de David._

- **État** : [ADR 0045](../adr/0045-figures-de-l-espace-qui-tournent.md) ; phase 0 validée (§ 2, Q1 à Q4
  du § 3) ; **lots 1 et 2 mergés** (#3195 moteur de vue ; #3200 clé `tourner: oui` sur les polyèdres, § 6).
  Rien n'est en prod.
- **Prochaine action** : d'abord les **noms des sommets qui sautent** pendant la rotation (demande de
  David après essai, ci-dessous), puis lot 3 — cylindre, cône, boule qui tournent (§ 4), revue
  `code-reviewer` en opus. Une PR ou deux : à proposer à David au début de la session.
- **Essai de David (2026-11-26, au doigt, par le lien)** : « le test est bon ». **Les noms des sommets
  qui bougent sont gênants : à corriger.** Pas encore conçu (piste : un nom garde son côté tant qu'il
  ne gêne pas ; la figure fixe et le PDF ne doivent pas changer).
- **En attente de David** : rien. Mention « Figure à tourner » sous la figure au repos : **gardée**
  (recommandation de la session, « je suis tes recos », David, 2026-11-26).
- **Pièges en cours** : une figure sans rotation reste strictement celle d'aujourd'hui
  (`solide-scene-figee.test.ts`) ; jamais d'instantané de flottants bruts ; cylindre, cône et boule sont
  dessinés « à plat » (ellipses, pas une vraie projection) : leur vue tournée et leur contour sont à
  concevoir ; une ligne `tourner:` non suivie va dans `rotationErrors`, jamais dans `errors` ; un `onclick`
  de Svelte est délégué à la racine (écouteur posé sur la figure pour arrêter le clic après un glissement) ;
  « moins d'animations » et le geste tactile réel n'ont pas de test.
- **Worktree / branche** : `../ubumaths-wt-solides-3d`, branche `feat/solides-3d-lot3` (aucun commit
  de code). Serveur d'essai arrêté, lien retiré ; page d'essai `/aide-ecriture/blocs/solide`, compte
  prof (un autre compte y reçoit un 403).

## 1. D'où l'on part

- Demande de David (2026-11-26) : un petit moteur 3D pour faire tourner les configurations de
  l'espace dans les modèles de questions, réutilisable un jour par le module de géométrie.
- Existant : blocs ` ```cubes `, ` ```solide `, ` ```patron ` (ADR 0034), cavalière fixe, SVG, scène
  en calcul pur partagée avec le PDF (`src/lib/ubumark/utils/espace-scene.ts`, `espace-solides.ts`,
  `espace-patrons.ts`, `generators/espace-typst.ts`). Aucune bibliothèque 3D.
- Maquette hors dépôt montrée à David (pavé et vecteur, pyramide, cylindre, cube coupé par un plan),
  puis « je valide » aux cinq recommandations → ADR 0045.

## 2. Phase 0 — comportements (validés par David le 2026-11-26)

Exemple suivi : un pavé ABCDEFGH avec le vecteur AG, bloc ` ```solide ` avec la clé `tourner: oui`.

### Nominal

1. Sans la clé `tourner:`, rien ne change : même dessin qu'aujourd'hui, à l'écran et sur la fiche.
2. Avec `tourner: oui`, la figure s'ouvre en perspective cavalière, exactement comme sans la clé.
3. L'élève fait glisser le doigt (ou la souris) sur la figure : elle tourne. Elle passe en douceur à
   une vue sans déformation.
4. Pendant qu'elle tourne, les arêtes cachées sont en tirets et les arêtes visibles en trait plein,
   recalculées à chaque angle. Les noms des sommets, les points, les vecteurs, les faces teintées et
   les arêtes épaisses suivent.
5. Un bouton « Vue de départ » apparaît dès que la figure a tourné ; il la ramène à la cavalière.
6. Au clavier : les flèches tournent la figure, Échap la ramène à la vue de départ.
7. Sur la fiche PDF, la figure est toujours la vue de départ.
8. Tourner la figure ne compte pas dans la réponse : ni juste, ni faux, ni enregistré.

### Limites

9. On peut regarder par-dessus et par-dessous, mais pas renverser la figure tête en bas (le haut
   reste en haut).
10. Faire glisser le doigt sur la figure ne fait pas défiler la page ; à côté de la figure, la page
    défile normalement.
11. Si l'appareil demande « moins d'animations », le passage d'une vue à l'autre est immédiat.
12. Le lecteur d'écran lit la même description qu'aujourd'hui, plus « figure que l'on peut tourner ».
    Le nom du solide n'est toujours pas lu.
13. Une nouvelle question (ou une nouvelle variation) repart de la vue de départ.

### Erreurs

14. `tourner:` avec autre chose que `oui` ou `non` : message pour l'auteur, comme pour les autres
    clés mal écrites ; l'élève voit la figure fixe.
15. `tourner: oui` sur une forme ou un réglage pas encore pris en charge par le lot en cours (par
    exemple une section) : message pour l'auteur, figure fixe pour l'élève. Jamais de figure fausse.

## 3. Questions (tranchées le 2026-11-26 : « je valide », chaque recommandation retenue)

- **Q1 — Les cotes pendant la rotation** (`cotes: cm`) : les garder écrites le long des arêtes qui
  tournent, ou ne les montrer que dans la vue de départ ? Recommandation : vue de départ seulement
  au début (leur placement est pensé pour la cavalière), à revoir si cela manque.
- **Q2 — Tourner et tracer un vecteur sur la même figure** (`tracer: vecteur`) : l'autoriser
  (toucher un point = tracer, glisser = tourner) ? Recommandation : oui, mais dans un lot à part,
  après la rotation des figures sans geste.
- **Q3 — Où la rotation est permise** : partout où le bloc s'affiche à l'écran (questions, cours,
  exercices), sauf le chat des élèves qui ne change pas ? Recommandation : oui.
- **Q4 — Patrons** : hors chantier (un patron est à plat) ? Recommandation : oui. Le pliage d'un
  patron en solide serait un autre chantier.

## 4. Découpage (validé le 2026-11-26)

| Lot | Contenu                                                                                                                                                                   | Revue                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1   | Moteur en calcul pur (rotation, deux projections, arêtes cachées des polyèdres), sans rien brancher ; preuve que la vue de départ redonne la scène actuelle au point près | `code-reviewer` (opus, géométrie) |
| 2   | Clé `tourner:` du bloc ` ```solide `, polyèdres (cube, pavé, prisme, pyramide) avec sommets, points, vecteurs, marquages ; glisser, clavier, bouton ; catalogue et doc    | `code-reviewer`                   |
| 3   | Cylindre, cône, boule                                                                                                                                                     | `code-reviewer` (opus)            |
| 4   | Sections ; cotes selon Q1                                                                                                                                                 | `code-reviewer` (opus)            |
| 5   | Gestes sur figure tournée, selon Q2                                                                                                                                       | `code-reviewer`                   |
| 6   | ` ```cubes ` (assemblages)                                                                                                                                                | `code-reviewer`                   |
| 7   | Terminale : repère, points par coordonnées, droites, plans (nouvelle phase 0 le moment venu)                                                                              | à définir                         |

Agents : `geometry-expert` n'est pas le bon (il couvre `geometry-core`) ; lots 1, 3 et 4 en session
principale ou `pedagogy-expert` pour le branchement ubumark ; `frontend-developer` pour le composant
(lot 2).

## 5. Lot 1 — moteur de vue (2026-11-26)

- `src/lib/ubumark/utils/espace-vue.ts` : `EspaceVue` (`yaw`, `pitch`, `oblique`), `VUE_DE_DEPART`
  (cavalière), `vueProjection(vue, pivot)`, `hiddenEdges` (polyèdres convexes), `turnVue` (bascule
  bornée). La vue droite part des angles où une profondeur de 1 se projette comme en cavalière
  (`VUE_DROITE_YAW`, `VUE_DROITE_PITCH`) : le passage d'une vue à l'autre déplace à peine le dessin.
- `espace-solides.ts` : les polyèdres passent par le moteur, à la vue de départ. Aucun réglage
  nouveau, rien de branché à l'écran.
- Preuve que rien ne bouge : `solide-scene-figee.test.ts`, 22 scènes figées **avant** le moteur
  (commit à part), toutes identiques après.
- Tests du moteur : `espace-vue.test.ts` (départ au chiffre près, longueurs gardées, pivot fixe,
  arêtes cachées vues de derrière, de dessous, sous une grille d'angles).
- Revue (`code-reviewer`, opus) : dessin au repos identique, vérifié opération par opération ; corrigé
  avant la PR : bornes de `turnVue` justes aussi en glissant depuis la cavalière et pendant le
  passage (la figure pouvait passer tête en bas), tour ramené entre −π et π, tests du passage
  (`oblique` entre 0 et 1).
- CI de #3195 rouge une fois : l'instantané du **cône** différait au 16e chiffre entre le Mac et la
  CI (cosinus de la machine, code non touché). Instantanés arrondis au milliardième de centimètre ;
  l'identité exacte avec l'ancien code a été vérifiée en local avant l'arrondi. À retenir pour les
  lots suivants : jamais d'instantané de flottants bruts.

## 6. Lot 2 — `tourner: oui` sur les polyèdres (2026-11-26)

- **Clé** `tourner: oui | non` du bloc ` ```solide ` (`SolideSpec.rotate`). Prise en charge : cube, pavé,
  prisme, pyramide, avec sommets, `points:`, `vecteurs:`, `marquer:`, `cachees:`. Pas encore : cylindre, cône,
  boule (lot 3), `section:` et `cotes:` (lot 4), `tracer:` (lot 5).
- **Comportements 14 et 15** (figure fixe pour l'élève, message pour l'auteur) : une ligne `tourner:` qu'on
  ne peut pas suivre ne met **pas** le bloc en erreur. La phrase va dans `EspaceNode.rotationErrors`, à part
  de `errors` : tout ce qui lit `errors` (PDF, cases à geste, corrigé) continue de dessiner la figure, fixe.
  L'auteur lit la phrase au-dessus de la figure (`SolideRotationNote.svelte`).
- **Scène** : `buildSolideScene(spec, vue)`. Cadre du dessin tourné : échelle du dessin fixe, centre du solide
  au milieu d'un carré fixe où la figure tient sous tous les angles (le pavé 4 × 2 × 3 passe de 4,8 cm à
  6,1 cm de large, le cube à 6,6 cm, la pyramide carrée 4 × 5 à 7,1 cm ; sur un écran plus étroit la figure
  rétrécit en bloc) ; la place est réservée dès le repos, la page ne bouge pas. À la vue de départ : le dessin
  fixe, déplacé en bloc (prouvé sur les 8 formes). Noms des sommets : même placement que le dessin fixe, à
  chaque angle (ils peuvent sauter d'un côté à l'autre d'un sommet pendant la rotation ; vus de dessus, les
  noms de deux sommets superposés se chevauchent).
- **Écran** (`Solide.svelte`) : glisser (seuil 4 px, la page ne défile pas sous le doigt), flèches du clavier
  (15°), Échap et bouton « Vue de départ », passage cavalière → vue droite en 250 ms, retour en 350 ms,
  immédiats si l'appareil demande moins d'animations. La vue est attachée au texte du bloc : un autre bloc
  repart de la vue de départ.
- **Ajout hors phase 0** : sous la figure au repos, la mention « Figure à tourner » (avec une icône), à la
  place que prendra le bouton — sans elle, rien ne dit à l'élève que la figure tourne. À retirer si David
  n'en veut pas.
- Vu à l'écran par la session (captures Chromium du composant, pavé, pyramide et prisme sous cinq angles) :
  tirets recalculés, face teintée, arête épaisse, flèches et noms qui suivent, bouton à la place de la
  mention sans déplacer la suite. **Pas vu** : le geste du doigt sur un vrai téléphone (défilement de la
  page bloqué sur la figure, fluidité).
- Catalogue (`block-catalog/solide.ts` : réglage et exemple), doc `docs/systeme/ubumark.md`.
- Revue (`code-reviewer`) : aucun bug d'animation ni de fuite ; figure sans la clé inchangée (diff, 414 tests
  de la scène) ; cadre balayé par pas de 5° sur 6 solides, passage compris : aucun débordement. Corrigé avant
  la PR : tourner une figure posée dans un choix ne coche plus ce choix (le clic qui suit un glissement
  s'arrête à la figure) ; Alt / Ctrl / Cmd + flèche laissés au navigateur ; souris relâchée hors de la figure
  sans capture ; animation arrêtée quand le bloc change. Restent sans test : « moins d'animations »
  (comportement 11), le vrai geste tactile (comportement 10).
