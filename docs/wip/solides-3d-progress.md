# Chantier `solides-3d` — figures de l'espace qui tournent

## Reprendre ici

_Mis à jour le 2026-11-26, lot 1 en PR._

- **État** : [ADR 0045](../adr/0045-figures-de-l-espace-qui-tournent.md) ; phase 0 validée par David
  (§ 2, et Q1 à Q4 du § 3 selon les recommandations) ; **lot 1 fait** (moteur de vue, § 5).
- **Prochaine action** : lot 2 — clé `tourner:` du bloc ` ```solide ` pour les polyèdres (§ 4), dans
  une nouvelle session.
- **En attente de David** : rien.
- **Pièges en cours** : une figure sans rotation doit rester strictement celle d'aujourd'hui
  (`solide-scene-figee.test.ts`) ; cylindre, cône et boule sont dessinés « à plat » (ellipses
  conventionnelles, pas une vraie projection) : leur passage à la vue tournée est à concevoir au
  lot 3 ; le cadre du dessin tourné (échelle fixe, pivot fixe) est à faire au lot 2.
- **Worktree / branche** : `../ubumaths-wt-solides-3d`, `feat/solides-3d` (retirés au merge).

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
