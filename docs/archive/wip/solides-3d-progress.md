---
title: Chantier solides-3d — figures de l'espace qui tournent
date: 2026-11-28
status: clos
---

# Chantier `solides-3d` — figures de l'espace qui tournent

## Reprendre ici

_Mis à jour le 2026-11-28 : chantier clos._

- **État** : clos. [ADR 0045](../../adr/0045-figures-de-l-espace-qui-tournent.md) ; lots 1 à 6, 7a, 7b,
  bord en butée, 7c, petite PR d'après le 7c et 7e mergés (#3195, #3200, #3211, #3216, #3222, #3227, #3229,
  #3235, #3244, #3251, #3252, #3257, #3263, #3273), découpage des § 4 et § 17 recompté contre les PR et le
  code le 2026-11-28. Lots 1 à 7c en prod (0.117.0) ; le 7e (#3273), essayé par David le 2026-11-28
  (« c'est bon »), attend un `deploy:prod` demandé par David.
- **Durable** : [docs/systeme/ubumark.md](../../systeme/ubumark.md) (blocs solide et cubes, moteur de vue,
  pièges de la rotation) et l'ADR 0045.
- **Non fait, noté dans [outils-manquants.md](../../wip/outils-manquants.md)** : n° 73, repère sans solide
  (lot 7d, laissé tant qu'aucun modèle n'en a besoin) ; n° 74, vecteur à tracer sur une figure qui porte des
  droites, des plans, un repère ou un point d'intersection (écart entre les comportements 86 et 98, laissé
  par David le 2026-11-28).
- **Tranché par David le 2026-11-28, à la clôture (« go » sur les recommandations)** : cases de `retrouver:`
  teintées et description en gris sous le réglage gardées telles quelles ; K n'est pas un point à toucher.
- **Worktree / branche** : aucun ; liens du tailnet retirés.

## Dernier « Reprendre ici » avant la clôture

_Mis à jour le 2026-11-28, après #3273 (lot 7e mergé)._

- **État** : [ADR 0045](../../adr/0045-figures-de-l-espace-qui-tournent.md) ; lots 1 à 6, 7a, 7b, bord en
  butée, 7c, petite PR d'après le 7c et **lot 7e** (point d'intersection, `points: K intersection (IG) (BDE)`,
  § 23 et 24) mergés (#3195 à #3273). Le 7e n'a pas encore été essayé par David. Les lots 3 à 7e ne sont pas
  en prod sans `deploy:prod` demandé par David (le vérifier avant de l'affirmer).
- **Prochaine action** : aucun lot validé ne reste, sauf le 7d (repère sans solide), laissé tant qu'aucun
  modèle n'en a besoin. Avant de proposer la clôture : recompter le découpage validé (§ 4 et § 17) contre les
  PR mergées et le code, puis versement de fin de chantier.
- **En attente de David** : l'essai du 7e ; l'écart entre les comportements 86 et 98 (K n'est pas un point à
  toucher : `tracer:` est refusé avec `intersection`, § 24) ; deux choix de la petite PR d'après le 7c restés
  sans réponse (teinte des cases de `retrouver:`, description en gris sous la clé) ; « (Q) » sur la zone
  teintée de (P) : laissé.
- **Tranché par David le 2026-11-28 (lot 7e, « je te suis »)** : pas de droite d'intersection de deux plans
  dans ce lot ; l'intersection s'écrit toujours avec les points entre parenthèses, jamais avec `d` ou `P` ;
  K hors du solide mais dans la marge est accepté.
- **Tranché par David le 2026-11-28 (lot 7c, « je te suis »)** : les trois choix du § 21 sont gardés
  (vecteurs du repère qui partent tous de l'origine ; coordonnées décimales seulement, les fractions le jour
  où un modèle en a besoin ; point à coordonnées accepté sur un sommet) ; **petite PR à part, après le 7c** :
  description des réglages sous le réglage dans la page d'aide, et cases de saisie de `retrouver:` teintées ;
  « (Q) » sur la zone teintée de (P) : laissé, corrigé dans cette même petite PR s'il le trouve illisible.
- **Tranché par David le 2026-11-27 (lot 7b, « suis tes recos »)** : le nom « (P) » s'écrit à côté du plan
  quand il n'a pas la place dedans (fait, § 19) ; le bord d'un plan ou une droite posés sur une face vue par
  la tranche (butée de la vue de dessus) prennent l'état de l'arête : **petite PR à part, après le 7b, avant
  le 7c** ; couleurs gardées (plans vert et violet, droites bleues) ; un bout de droite encore derrière le
  solide reste en tirets (`(DG)` d'un cube) ; « (P) » qui croise un autre nom pendant la rotation : laissé.
- **Tranché par David le 2026-11-27** : point gardé sur le sommet NOMMÉ du cône ; nom de vecteur qui dépasse
  de 0,08 cm laissé tel quel ; lot 5 : deux points au même endroit = celui de devant, la figure
  « Correction » tourne, « Vue de départ » reste sous la figure à geste, au-dessus des boutons (écart avec
  le comportement 44 accepté) ; lot 6 : chaque face de cube garde sa teinte (arrière = devant, gauche =
  droite, dessous = dessus), `tourner:` refusé avec `dessiner:` ; les deux défauts du § 14 (boule coupée
  très près du centre, cylindre très plat) sont laissés, à corriger s'il les croise dans un modèle.
- **Pièges en cours** : une figure sans rotation reste strictement celle d'aujourd'hui
  (`solide-scene-figee.test.ts`, scènes neuves à prendre sur le code de `main`) ; jamais d'instantané de
  flottants bruts ; l'angle libre d'un nom se calcule dans le repère du dessin fixe (`fixedVertices`), jamais
  de seuil d'égalité ; `turnVue` doit recevoir `solideTilt(form)` ; la rotation vit dans
  `solide-rotation.svelte.ts`, partagée par `Solide.svelte` et `SolideGeste.svelte` ; arrêter un clic avant
  le `onclick` d'un enfant = écouteur `capture` (`on` de Svelte sert les `onclick` délégués d'abord) ;
  « moins d'animations » et le geste tactile réel n'ont pas de test ; **`pnpm pr:merger` RETIRE le worktree
  même si son serveur de dev tourne** (#3227, #3229 : dossier laissé avec `.svelte-kit` et `.vite`, serveur
  à tuer par son PID) — recréer le worktree et relancer le serveur aussitôt après le merge ; `pnpm voir
--compte prof` refusait la connexion du compte fictif le 2026-11-27 (base locale en marche).
- **Worktree / branche** : aucun (retirés par `pnpm pr:merger 3273`) ; à recréer sous le nom
  `../ubumaths-wt-solides-3d` — le dossier existe encore avec seulement `.svelte-kit` (reste du serveur de
  dev, à supprimer avec l'accord de David). Le lien du tailnet 8445 → 5177 est resté publié (serveur
  arrêté) ; le 8444 → 5176 sert à une autre session.

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

## 7. Noms tenus pendant la rotation (2026-11-26)

- **Demande** : après son essai du lot 2, David trouve gênants les noms des sommets qui sautent pendant la
  rotation. Cause : leur place était recalculée de zéro à chaque image (plus grand angle libre autour du
  sommet, puis places essayées par crans).
- **Décision de David** (2026-11-26, à la place des six comportements proposés par la session) : « les noms ne
  bougent pas pendant l'animation, mais seulement quand on arrête l'animation ». Deux PR : les noms d'abord,
  le lot 3 ensuite.
- **Fait** : pendant un mouvement (glissement, flèche du clavier, retour à la vue de départ), chaque nom
  (sommet, point déclaré, vecteur) garde sa place par rapport à son point ; à l'arrêt (doigt levé, touche
  relâchée, fin du passage ou du retour), les noms glissent en 150 ms à la place qui convient à la vue — d'un
  coup si l'appareil demande moins d'animations. Choix de la session, non demandés : le glissement de 150 ms
  (plutôt qu'un saut à l'arrêt) et l'arrêt au clavier = touche relâchée.
- **Conséquence acceptée** : pendant la rotation, un nom tenu peut passer sur une arête ; il s'en écarte à
  l'arrêt.
- Code : `buildSolideScene(spec, vue, held)` et `SolideScene.labelOffsets` (scène tournée seulement) ;
  `holdNames` / `settleNames` dans `Solide.svelte`. Tests : `solide-tourner.test.ts` (« noms tenus pendant la
  rotation »), `SolideTourner.svelte.test.ts` (noms tenus doigt posé, replacés doigt levé, revenus à leur
  place au retour ; vérifié rouge sans `holdNames`).
- Revue (`code-reviewer`) : aucun bug bloquant ; figure fixe inchangée (22 scènes figées), enchaînements
  déroulés (retour interrompu par un glissement, glissement pendant que les noms se replacent,
  `pointercancel`, « moins d'animations »). Corrigé avant la PR : deux flèches tenues ensemble, une relâchée
  — les noms restent tenus tant qu'il reste une flèche enfoncée. Restent sans test : ces enchaînements
  (touche relâchée, figure quittée au clavier, retour interrompu) ; un bloc qui change sous le doigt
  (éditeur du prof) laisse les noms sauter jusqu'à la fin de ce glissement.

## 8. Lot 3 — cylindre, cône, boule : comportements (validés par David le 2026-11-27)

Exemple suivi : un cylindre de rayon 2 et de hauteur 4, bloc ` ```solide ` avec `tourner: oui`. Les
comportements 1 à 15 du § 2 valent tels quels (glisser, clavier, bouton, PDF, noms tenus du § 7) ; ne sont
écrits ici que ceux propres aux solides ronds. Périmètre : les trois formes avec `sommets:` (noms des centres
et du sommet du cône), `marquer: sommet` et `cachees:`. `section:` et `cotes:` restent au lot 4.

### Nominal

16. Au repos, le cylindre, le cône et la boule sont dessinés exactement comme aujourd'hui (ovales « à
    plat »), à l'écran et sur la fiche.
17. Dès que l'élève fait glisser le doigt, la figure passe en douceur à une vraie vue du solide. Ce passage
    se voit à peine : le dessin d'aujourd'hui est déjà presque une vraie vue, regardée d'un peu au-dessus
    (seule la hauteur raccourcit d'environ 5 %).
18. Glisser vers le bas montre le dessus : les ovales du cylindre s'ouvrent jusqu'à devenir des cercles
    (vue de dessus : un seul cercle). Glisser vers le haut montre le dessous.
19. Cylindre : le bord caché est en tirets, recalculé à chaque angle. Vu de dessus, c'est la moitié arrière
    du cercle du bas ; vu de dessous, la moitié arrière du cercle du haut ; de profil (œil à hauteur du
    milieu), un rectangle.
20. Cône : les deux traits qui montent au sommet restent collés à l'ovale de la base à chaque angle. Quand
    on regarde assez de dessus (ou de dessous) pour que le sommet tombe à l'intérieur de l'ovale, ces deux
    traits disparaissent : il ne reste que l'ovale, comme dans la réalité. Vu de dessus, l'ovale est en
    trait plein ; vu de dessous aussi (c'est le disque de base).
21. Boule : le contour reste un cercle sous tous les angles ; l'équateur s'ouvre ou se referme quand on
    bascule (moitié arrière en tirets), jusqu'à se confondre avec le contour vu de dessus.
22. Les noms des centres (et du sommet du cône) et les points marqués suivent, tenus pendant le mouvement
    et replacés à l'arrêt, comme pour les polyèdres.
23. `cachees: non` : tout en trait plein, à chaque angle.

### Limites

24. La figure tient dans son cadre sous tous les angles ; la place est réservée dès le repos, la page ne
    bouge pas (comme au lot 2).
25. Un cône très plat (hauteur à peine plus grande que la moitié du rayon) : ses deux traits disparaissent
    presque tout de suite quand on bascule vers le dessus. Accepté.

### Erreurs

26. `tourner: oui` sur un solide rond coupé (`section:`) ou coté (`cotes:`) : message pour l'auteur, figure
    fixe pour l'élève, comme aujourd'hui (lot 4).

### Questions pour David (réponse du 2026-11-27 : « je te suis » — les deux recommandations, qui sont aussi les choix qui n'ajoutent rien au dessin)

- **Q5 — Tourner à gauche ou à droite.** Un cylindre, un cône ou une boule que l'on fait tourner autour de
  son axe ne change pas d'aspect : l'élève glisse le doigt de côté et ne voit rien bouger (seul le
  glissement vers le haut ou le bas se voit). Pour la boule, même la bascule ne montre que l'équateur qui
  s'ouvre. Deux possibilités : (a) l'accepter, c'est la vérité de l'objet ; (b) dessiner un repère qui
  tourne avec le solide quand la figure peut tourner — par exemple un rayon en tirets sur la base du
  cylindre et du cône, un méridien sur la boule. Recommandation : (a) pour ce lot ; au lot 4, le rayon coté
  (`cotes:`) tournera de lui-même.
- **Q6 — Cône vu de dessus.** Quand les deux traits ont disparu, on ne voit plus qu'un ovale : rien ne dit
  où est le sommet (sauf si l'auteur l'a nommé ou marqué). Faut-il alors dessiner un petit point au sommet ?
  Recommandation : non, on dessine ce qu'on verrait ; l'auteur qui veut le sommet le nomme.

## 9. Lot 3 — ce qui est fait (2026-11-27)

- **Modèle** : le dessin « à plat » (ovales de rapport 0,3) est la vraie vue d'un œil à asin 0,3 ≈ 17,5°
  au-dessus de l'horizontale, hauteurs non raccourcies. `turnedRoundDraft(spec, vue)` en part : inclinaison
  e = 17,5° + `vue.pitch`, petit axe r × sin e (signé), hauteur h × cos e, étirée de 1 / cos 17,5° au repos
  (`oblique`). `vue.yaw` ne change rien.
- **Bascule** : `turnVue(vue, dyaw, dpitch, tilt)` ; `solideTilt(form)` donne la bascule propre au dessin
  (`VUE_TILT` des polyèdres, `SOLIDE_ROUND_TILT`). Bornes des polyèdres inchangées.
- **Parseur** : `tourner: oui` accepté pour cylindre, cône, boule ; coupés ou cotés : figure fixe et phrase
  pour l'auteur (lot 4).
- **Choix de la session, hors phase 0** : quand les deux traits du cône ont disparu, son sommet **s'il est
  nommé** reçoit un point (`Draft.lone`) — sinon le nom « S » flotte près de l'ovale sans rien désigner (vu
  sur les captures). Sans nom : aucun point (Q6). À retirer si David n'en veut pas.
- **Vu par la session** : planche des trois formes (et d'un cône très plat) sous huit inclinaisons, de −60° à
  90° — tirets du bon côté vus de dessus et de dessous, cône tangent, cercle vu de dessus ; page
  `/aide-ecriture/blocs/solide` chargée sans erreur de console. **Pas vu** : le geste du doigt sur un vrai
  téléphone.
- Tests : `solide-ronds-tourner.test.ts` (49, rouges avant le code), `SolideTourner.svelte.test.ts` (cylindre :
  dessous, arrêt à la vue de dessus). Catalogue : exemple « Un cône que l'élève peut tourner ». Doc :
  `docs/systeme/ubumark.md`, `utilitaires-et-demos.md`.
- Revue (`code-reviewer`, opus) : aucun bloquant. Trouvé juste : parties cachées sous tous les angles (0° et
  ±90° compris), figure fixe et polyèdres tournés inchangés (bornes de `turnVue` identiques au bit près),
  cadre (preuve et balayage de 21 passages × 201 bascules sur les dimensions extrêmes, marge minimale
  0,235 cm), pas de NaN. Corrigé : test de l'arc caché du cône (ses bouts sont les pieds des deux traits),
  test tautologique retiré, commentaires déplacés. Laissé à David : le point du sommet nommé est aussi posé vu
  de dessous, où le sommet est caché par le disque.

## 10. Lot 4 — sections et cotes : comportements (validés par David le 2026-11-27)

Exemples suivis : un pavé ABCDEFGH coté en cm et coupé parallèlement à sa face du dessus (section IJKL) ; un
cylindre coté coupé parallèlement à son axe. Blocs ` ```solide ` avec `tourner: oui`. Les comportements 1 à 26
valent tels quels ; ne sont écrits ici que ceux propres aux sections et aux cotes.

### Nominal

27. Au repos, un solide coupé ou coté qui peut tourner est dessiné exactement comme aujourd'hui : section
    teintée, contour épais, noms I, J, K, L, longueurs écrites.
28. Cotes (Q1, tranchée) : dès que l'élève fait glisser le doigt, les longueurs écrites (« 4 cm ») s'effacent.
    Elles reviennent quand la figure est revenue à la vue de départ (bouton, Échap).
29. La section tourne avec le solide : même teinte, même contour épais, à chaque angle. Ses noms (I, J, K, L)
    suivent, tenus pendant le mouvement et replacés à l'arrêt, comme les noms des sommets.
30. Pavé et cube coupés : les arêtes du solide gardent leurs tirets recalculés à chaque angle ; le contour de
    la section reste en trait plein.
31. Cylindre coupé à l'horizontale : la section est un ovale qui s'ouvre et se referme avec ceux des bases.
32. Cylindre coupé parallèlement à l'axe : glisser le doigt de côté fait tourner le rectangle autour de l'axe
    (de face on le voit en vraie grandeur, de profil il se réduit à un trait). C'est le premier solide rond où
    tourner à gauche ou à droite se voit.
33. Boule coupée : le contour reste un cercle, la section est un ovale qui s'ouvre quand on bascule, jusqu'au
    cercle vu de dessus.
34. Sur la fiche PDF : la vue de départ, avec ses cotes, comme aujourd'hui.

### Limites

35. Une section regardée exactement par la tranche se réduit à un trait. Accepté.
36. Le lecteur d'écran lit la même description qu'aujourd'hui (cotes comprises, jamais la nature de la
    section), plus « figure que l'on peut tourner ».

### Erreurs

37. `tourner: oui` avec `tracer:` : toujours figure fixe et message pour l'auteur (lot 5). Il n'y a plus de
    message pour `section:` ni `cotes:`.

### Questions pour David (réponse du 2026-11-27 : « je te suis » — (a) aux deux)

- **Q7 — Les traits qui accompagnent une cote.** Une pyramide cotée a sa hauteur dessinée en tirets, avec
  « 5 cm » à côté ; un cylindre coté a un rayon en tirets. Quand la figure tourne, le « 5 cm » s'efface (Q1).
  Et le trait en tirets ? (a) il reste et tourne avec le solide — on voit la hauteur de la pyramide sous tous
  les angles, et le rayon du cylindre tourne quand on glisse de côté ; (b) il s'efface avec le nombre.
  Recommandation : (a).
- **Q8 — La section vue de derrière.** Un cylindre coupé parallèlement à l'axe, que l'on retourne : le
  rectangle est alors derrière l'axe, vu à travers le solide. (a) le dessiner toujours pareil, teinté, contour
  plein, comme si le solide était transparent — c'est ce que fait déjà le dessin fixe ; (b) mettre en tirets
  les parties du contour cachées par le solide. Recommandation : (a), plus lisible et plus simple.

## 11. Lot 4 — ce qui est fait (2026-11-27)

- **Parseur** : `tourner: oui` accepté avec `section:` et `cotes:`, toutes formes ; reste refusé avec
  `tracer:` (lot 5).
- **Cotes** (Q1, Q7) : `buildSolideScene` n'écrit les longueurs (et le trait de renvoi de la hauteur d'une
  pyramide) qu'à la vue de départ ; les traits de hauteur, de rayon et de distance du plan restent et
  tournent. Le rayon du haut d'un cylindre passe en tirets vu de dessous.
- **Cadre** : le carré fixe, agrandi de la place des cotes du repos (`layoutSolide`, `coteMarks`) — plus
  forcément carré ni centré sur le solide ; il ne bouge pas quand les cotes s'effacent.
- **Sections** (Q8) : pavé et cube par la projection de la vue ; solides ronds par `place(x, y, z)` dans
  `turnedRoundDraft`. Le rectangle du cylindre coupé parallèlement à l'axe et le rayon coté tournent avec
  `vue.yaw`. Noms IJKL tenus pendant la rotation (`labelOffsets` : une place par nom, jamais pour une cote).
- **Trouvé en route, corrigé** : sur le pavé 4 × 2 × 3, ajouter `tourner: oui` déplaçait le nom F au repos
  (depuis le lot 2). Deux angles libres égaux autour de F, départagés par le dernier chiffre, qui n'était pas
  le même dans le repère de la figure à tourner. L'angle libre se calcule maintenant dans le repère du dessin
  fixe ; le dessin fixe ne change pas (deux scènes figées ajoutées, prises sur le code de `main`).
- **Vu par la session** : planche de sept solides coupés ou cotés sous neuf vues (section, tirets, hauteur de
  la pyramide, rayon et rectangle qui tournent, cadre) ; `/aide-ecriture/blocs/solide` chargée sans erreur de
  console ; le composant réel dans Chromium (tests : longueurs effacées au glissement et revenues au retour,
  rectangle du cylindre réduit à un trait au quart de tour). **Pas vu** : le geste du doigt sur un vrai
  téléphone.
- Tests : `solide-sections-tourner.test.ts` (rouges avant le code), `SolideTourner.svelte.test.ts` (lot 4).
  Catalogue : deux exemples (pavé coupé et coté, cylindre coupé parallèlement à l'axe). Doc :
  `docs/systeme/ubumark.md`, `utilitaires-et-demos.md`.
- Revue (`code-reviewer`, opus) : géométrie de `place` juste (signes, dessous, passage, boule), repos = dessin
  fixe sur 418 blocs, cadre fixe sur 448 vues, ordre des places tenues. Corrigé avant la PR : un premier
  correctif du nom F (seuil d'égalité) déplaçait des noms sur 36 dessins fixes — remplacé par le calcul dans
  le repère du dessin fixe ; le renvoi d'une pyramide pouvait sauter à la fin du retour — il reprend sa place
  du repos. **Laissé, hors du lot** : pavés très profonds (2 × 9 × 1, 1 × 6 × 1) avec `points:` ou
  `vecteurs:`, pendant le passage et déjà tournés : un nom de vecteur dépasse le cadre d'environ 0,08 cm
  (existe depuis le lot 2). Dessin fixe d'une boule coupée et cotée : « 1,5 cm » touche le nom du centre
  (dessin d'avant le chantier).

## 12. Lot 5 — gestes sur figure tournée : comportements (validés par David le 2026-11-27)

Exemple suivi : un pavé ABCDEFGH, « trace le vecteur AB + AD + AE » (`tracer: vecteur AB + AD + AE`), avec
`tourner: oui`. La réponse juste est la flèche de A à G.

### Nominal

38. Sans `tourner:`, la figure à geste ne change pas : même dessin, mêmes boutons qu'aujourd'hui.
39. Avec `tourner: oui`, elle s'ouvre comme aujourd'hui (cavalière, anneaux sur les points, boutons
    « Origine », « Extrémité », « Effacer »).
40. Toucher un point sans glisser (doigt posé puis levé au même endroit) : le point est posé, comme
    aujourd'hui. La figure ne tourne pas.
41. Glisser le doigt : la figure tourne, même si le doigt est parti d'un point. Rien n'est posé.
42. Les anneaux, les points choisis et la flèche de l'élève suivent la rotation. La flèche déjà tracée reste
    tracée : tourner ne l'efface pas et ne change pas la réponse.
43. Tous les points restent touchables sous toutes les vues, même ceux de l'arrière du solide.
44. « Vue de départ » apparaît à côté des boutons dès que la figure a tourné ; elle ramène la vue sans
    effacer la flèche. « Effacer » efface la flèche sans ramener la vue.
45. Au clavier : Tab va de point en point, Espace ou Entrée pose le point (comme aujourd'hui) ; les flèches
    tournent la figure et Échap la ramène, que l'on soit sur la figure ou sur un point.
46. La réponse reste « A/G » : la vue ne compte pas, n'est pas enregistrée. Fiche PDF : vue de départ.

### Limites

47. Après la correction, la figure de l'élève (verrouillée) et la figure « Correction » (flèche verte)
    tournent encore, chacune de son côté ; plus rien ne se pose.
48. Deux points l'un devant l'autre à l'écran (pavé vu de face : A cache E) : voir la question (a).
49. Origine imposée (`depuis A`) : A reste posée d'office sous toutes les vues.
50. Glisser sur la figure ne fait pas défiler la page ; « moins d'animations » : retour immédiat ; nouvelle
    question : vue de départ et rien de posé.
51. Lecteur d'écran : la description d'aujourd'hui (« …, points à toucher ») plus « figure que l'on peut
    tourner ». Jamais le nom du solide ni la flèche attendue.

### Erreurs

52. `tourner: oui` avec `tracer:` : plus de message pour l'auteur, la figure tourne. `tourner:` mal écrit :
    message pour l'auteur, figure à geste fixe (inchangé).

### Questions pour David (réponse du 2026-11-27 : « je te suis » — (1) à la (a), « elle tourne » à la (b) ; la (c), sans recommandation, n'est pas tranchée : la PR de la boule vient après ce lot, le choix qui ne change rien)

- **(a) Deux points au même endroit de l'écran** (pavé vu bien de face : A et E se superposent). Que pose le
  toucher ? (1) le point de devant, celui qui est le plus près de l'œil ; (2) rien : il faut tourner un peu
  pour les séparer. Recommandation : (1), avec des zones de toucher qui rétrécissent quand deux points se
  rapprochent (comme aujourd'hui sur un pavé aplati).
- **(b) La figure « Correction »** (flèche verte, sous la figure fausse) : elle tourne aussi (comportement 47),
  ou elle reste fixe ? Recommandation : elle tourne, c'est là que voir AG dans l'espace sert le plus.
- **(c) La petite PR de la boule coupée et cotée** (« 1,5 cm » qui touche le nom du centre, dessin fixe) :
  avant ou après ce lot ?

## 13. Lot 5 — ce qui est fait (2026-11-27)

- **Parseur** : `tourner: oui` accepté avec `tracer:` ; plus aucun réglage refusé, `rotationErrors` ne porte
  plus que la valeur mal écrite.
- **Rotation partagée** : l'état et les gestes sortent de `Solide.svelte` vers
  `solide-rotation.svelte.ts` (`createSolideRotation`) ; `SolideVueDeDepart.svelte` est la ligne sous la figure.
  Deux différences avec le code d'avant, pour `Solide.svelte` aussi : le pointeur n'est capturé qu'une fois le
  seuil de 4 px passé (un toucher garde sa cible, le point reçoit son clic) ; le clic qui suit un glissement est
  arrêté à la descente (`capture`) — à la remontée, `on` de Svelte sert d'abord le `onclick` du point.
- **`SolideGeste.svelte`** : deux rotations (élève ou bonne réponse ; correction). Anneaux, points et flèche
  dessinés depuis la scène de la vue.
- **Point de devant** (question (a)) : `solidePointNearness`, `solideTouchedPoint`. Zone de toucher jamais
  sous 0,2 cm (`HIT_MIN`) sur une figure qui tourne ; là où deux zones se recouvrent, le point le plus près du
  doigt, et celui de devant s'ils en sont aussi près à 1 mm. Au clavier, chaque point reste lui-même.
- **Écart avec le comportement 44, signalé à David** : « Vue de départ » est sous la figure (ligne de hauteur
  réservée, avec « Figure à tourner » au repos, comme sur les autres solides), juste au-dessus des boutons,
  pas dans leur rangée. Sa réponse est attendue.
- **Vu par la session** : le composant réel dans Chromium (image : flèche et anneaux qui suivent, bouton, vue
  de dessus, figure corrigée) ; `/aide-ecriture/blocs/solide` chargée sans erreur de l'appli (exemple neuf :
  « Un vecteur à tracer sur un pavé que l'élève peut tourner »). **Pas vu** : le geste du doigt sur un vrai
  téléphone (toucher contre glisser, seuil de 4 px).
- Tests : `SolideGesteTourner.svelte.test.ts` (12, rouges avant le code), `solide-gestes.test.ts` (point de
  devant), parseur. Doc : `docs/systeme/ubumark.md`, `utilitaires-et-demos.md`.
- Revue (`code-reviewer`) : extraction conforme ligne à ligne, capture tardive, conversion du clic, signe de
  la profondeur, bloc sans `tourner:` inchangé. Corrigé avant la PR : le point de devant gagnait dans tout
  recouvrement de zones, même le doigt nettement sur le point du fond — départagé par la distance au doigt.
  **Laissé, existait avant** : après un glissement au doigt sans clic, un clic sans pointeur (lecteur d'écran)
  arrivant avant tout autre toucher est avalé une fois (`justDragged`) ; un toucher « tremblé » de 4 à 10 px
  tourne un peu la figure et ne pose rien.

## 14. Boule coupée et cotée : le nom du centre ne touche plus la cote (2026-11-27)

- **Défaut** (dessin fixe, d'avant le chantier) : plan de coupe à moins de 0,3 × le rayon du centre environ, la
  distance du plan s'écrit là où le nom du centre se pose (`boule 6`, `section: 1.5` : « 1,5 cm » sur O).
  Même défaut sur un cylindre étroit coupé parallèlement à l'axe (`cylindre 1 8` : la distance à l'axe sur O).
- **Correctif** : dans `layoutSolide`, les cotes écrites à côté de leur trait (`sideCote`) sont calculées avant
  les noms ; le nom d'un **centre** les évite (`firstFree`). Les sommets d'un polyèdre ne changent pas.
- **Mesuré** : 5 244 solides ronds (boule, cylindre, cône ; nommés ou non, cotés ou non, coupés ou non, avec
  et sans `tourner: oui`) comparés avant / après : 108 scènes changent, toutes celles où le nom touchait la
  cote, aucune autre.
- **Vu par la session** : planche avant / après tracée depuis les scènes (Chrome). **Pas vu** : la page
  `/aide-ecriture/blocs/solide` — `pnpm voir --compte prof` refuse la connexion du compte fictif (base locale
  en marche, rien redémarré).
- Tests : `solide-section.test.ts` (trois, rouges sans le correctif), deux solides de plus dans la liste
  `RONDS` de `solide-sections-tourner.test.ts` (repos = dessin fixe, cadre). Doc : `docs/systeme/ubumark.md`.
- Revue (`code-reviewer`) : aucun finding ; `atRest` remonté sans effet (appel pur, pas de récursion), noms
  tenus non touchés, polyèdres inchangés.
- **Laissé, signalé à David** : boule coupée très près du centre, le contour de la section passe dans le texte
  de la cote du rayon ; cylindre très plat (rayon ≥ 3 × hauteur) coupé perpendiculairement à l'axe, la cote du
  rayon et celle de la distance se touchent.

## 15. Lot 6 — assemblages de cubes : comportements (validés par David le 2026-11-27)

Exemple suivi : l'assemblage `hauteurs: 2 1 1 / 1 0 1` (six cubes, un trou devant au milieu), bloc
` ```cubes ` avec la clé `tourner: oui`.

### Nominal

53. Sans `tourner:`, rien ne change : même dessin qu'aujourd'hui, à l'écran et sur la fiche.
54. Avec `tourner: oui`, l'assemblage s'ouvre en perspective cavalière, exactement comme sans la clé, avec
    la mention « Figure à tourner » dessous.
55. L'élève fait glisser le doigt (ou la souris) : l'assemblage tourne et passe en douceur à une vue sans
    déformation. Flèches du clavier, Échap et bouton « Vue de départ » : comme pour un solide.
56. Les cubes restent pleins : pas de tirets. Un cube de devant cache ceux de derrière, sous tous les angles.
    En tournant, on découvre l'arrière, la gauche et le dessous, donc aussi les cubes cachés dans la vue de
    départ.
57. Chaque face garde son quadrillage (un carré par cube), comme aujourd'hui.
58. Teintes des faces : voir la question (a).
59. Tourner ne compte pas dans la réponse ; fiche PDF : vue de départ ; nouvelle question : vue de départ.

### Limites

60. On peut regarder par-dessus et par-dessous, pas renverser l'assemblage (comme un solide).
61. La place de la figure est réservée dès le repos : la page ne bouge pas quand on tourne. Dans un choix
    de QCM (petite figure), tourner ne coche pas le choix.
62. Le plus gros assemblage permis (6 × 6 piles de 6 cubes) tourne sans saccade.
63. Lecteur d'écran : « Assemblage de cubes en perspective, figure que l'on peut tourner ». Jamais le
    nombre de cubes.
64. Glisser sur la figure ne fait pas défiler la page ; « moins d'animations » : passages immédiats ; chat
    des élèves : inchangé (figure fixe).

### Erreurs

65. `tourner:` avec autre chose que `oui` ou `non` : message pour l'auteur, figure fixe pour l'élève.
66. `tourner: oui` avec `vue: dessus`, `face`, `droite` ou `gauche` (dessin à plat) : message pour
    l'auteur, vue fixe pour l'élève.
67. `tourner: oui` avec `retrouver:` (la perspective est cachée, rien à tourner) : message pour l'auteur,
    geste inchangé.
68. `tourner: oui` avec `dessiner:` : voir la question (b).

### Questions pour David (réponse du 2026-11-27 : « je te suis » — (1) aux deux ; et les deux défauts du § 14 sont laissés tels quels, à corriger s'il les croise dans un modèle)

- **(a) Teintes des faces qu'on découvre.** Aujourd'hui : dessus clair, devant gris léger, côté droit gris
  plus foncé. En tournant, on voit aussi l'arrière, la gauche et le dessous. (1) Chaque face garde sa
  teinte, comme un objet peint : l'arrière comme le devant, la gauche comme la droite, le dessous comme le
  dessus ; (2) la lumière reste fixe par rapport à l'œil : la teinte d'une face change selon qu'elle regarde
  vers le haut, vers nous ou sur le côté. Recommandation : (1), plus simple à lire (on reconnaît le
  « devant » après un demi-tour) et la vue de départ reste exactement le dessin d'aujourd'hui.
- **(b) `tourner: oui` avec `dessiner: face`** (l'élève colorie la vue de face dans un quadrillage, la
  perspective est à côté). Si la perspective tourne, l'élève peut se mettre bien en face et recopier la vue.
  (1) Refusé dans ce lot : message pour l'auteur, perspective fixe ; (2) permis : c'est le prof qui choisit
  d'offrir cette aide. Recommandation : (1) ; (2) reste possible plus tard sans rien défaire.

## 16. Lot 6 — ce qui est fait (2026-11-27)

- **Clé** `tourner: oui | non` du bloc ` ```cubes ` (`CubesSpec.rotate`), perspective sans geste seulement.
  Valeur mal écrite, `vue:` à plat, `dessiner:`, `retrouver:` : phrase dans `EspaceNode.rotationErrors`, bloc
  dessiné comme sans la clé (comportements 65 à 68) ; la phrase se lit au-dessus de `Cubes.svelte` et de
  `CubesGeste.svelte` (« Bloc cubes : la figure ne tournera pas »).
- **Scène** : `buildEspaceScene(spec, vue)` → `cubesFaces(heights, vue)` (`espace-scene.ts`). Faces libres
  tournées vers l'œil, ordre du peintre par axe (de la case la plus loin de l'œil à la plus proche) ; teintes
  de la question (a) : arrière = devant, gauche = droite, dessous = dessus. Cadre carré fixe : distance du
  centre à un coin de la boîte × √(1 + déport²), tenu à tout angle et pendant le passage (l'assemblage
  `2 1 1 / 1 0 1` passe de 3,7 × 2,7 cm à un carré de 4,4 cm). À la vue de départ : le dessin fixe, mêmes
  faces, même ordre, déplacé en bloc.
- **Écran** : la rotation d'un solide, rendue commune — `createEspaceRotation` (scène en réglage) dans
  `solide-rotation.svelte.ts`, `createSolideRotation` en est le cas du solide (rien ne change pour lui).
- Catalogue (`block-catalog/cubes.ts` : réglage et exemple), doc `docs/systeme/ubumark.md`.
- Tests : `cubes-tourner.test.ts` (28, dont l'ordre du peintre vérifié par la profondeur réelle des faces qui
  se recouvrent), `CubesTourner.svelte.test.ts` (13).
- Vu à l'écran par la session (captures Chromium du composant, deux assemblages sous six angles, dont
  l'arrière et le dessous) : cubes pleins, trou visible de derrière, teintes tenues, cadre et bouton en place.
  **Pas vu** : le geste du doigt sur un vrai téléphone ; le thème sombre sous une vue tournée.

## 17. Lot 7 — Terminale : droites, plans, repère : comportements (validés par David le 2026-11-27)

Exemple suivi : le cube ABCDEFGH, I milieu de [AE], la droite (IG) et le plan (BDE), `tourner: oui`. Question
type : « La droite (IG) et le plan (BDE) sont-ils sécants ? ». Programme de Terminale spécialité : « les
figures formées à partir des solides usuels (cube, pavé, tétraèdre) sont des supports privilégiés » pour les
positions relatives ; le repère sert ensuite aux calculs (représentations paramétriques, équations de plans).

### Nominal

69. **Droite.** L'auteur écrit `droites: (IG)` dans le bloc ` ```solide ` (deux points nommés : sommets ou
    points déclarés). La droite est dessinée en couleur, elle dépasse des deux côtés, un peu au-delà du
    solide. Elle peut porter un nom : `d = (IG)`.
70. **Plan.** L'auteur écrit `plans: (BDE)` (trois points nommés non alignés). On voit la partie du plan
    qui est dans le solide : ici le triangle BDE, teinté. Il peut porter un nom : `P = (BDE)`.
71. **Repère.** L'auteur écrit `repere: A ; AB, AD, AE` : les trois vecteurs du repère sont dessinés depuis
    A. Il peut alors déclarer un point par ses coordonnées : `points: M (1 ; 0,5 ; 1)`, et s'en servir
    comme d'un autre point (droite, plan, vecteur).
72. **Repère sans solide.** `forme: repere 4 4 4` : trois axes gradués O, I, J, K, sans solide. Points par
    coordonnées, droites et plans s'y écrivent de la même façon ; un plan est montré par sa partie comprise
    dans la boîte du repère, une droite s'arrête au bord de la boîte.
73. Avec `tourner: oui`, tout suit la rotation : droites, plans, axes, points, noms. Sans la clé, la
    figure est fixe ; sur la fiche PDF, c'est toujours la vue de départ.
74. Ce qui est caché se lit comme pour les arêtes : voir la question (c).

### Limites

75. Un plan qui contient une face du solide (`(ABC)` sur un cube) teinte cette face. Une droite qui suit
    une arête la recouvre et la dépasse.
76. Le point où une droite perce un plan, ou la droite où deux plans se coupent, **n'est pas dessiné** de
    lui-même : ce serait donner la réponse. Voir la question (d).
77. Au plus 4 droites et 2 plans par figure (au-delà, on ne lit plus rien).
78. Lecteur d'écran : « droite (IG) », « plan (BDE) », « repère d'origine A ». Jamais la position relative.
79. Une figure sans `droites:`, `plans:` ni `repere:` reste strictement celle d'aujourd'hui.

### Erreurs (message pour l'auteur, jamais de figure fausse)

80. Point inconnu, deux fois le même point pour une droite, trois points alignés pour un plan, nom déjà
    pris.
81. Point par coordonnées qui tombe hors de la figure (hors du solide agrandi d'une marge, hors de la boîte
    du repère) ; coordonnées sans `repere:`.
82. `repere:` dont les trois vecteurs sont dans un même plan.
83. `droites:`, `plans:`, `repere:` sur un cylindre, un cône ou une boule ; avec `section:` ou `tracer:`
    (pas dans ce lot).

### Questions pour David (réponse du 2026-11-27 : « je te suis » — (a) 1 : dans le bloc solide ; (b) 7a droites, 7b plans, 7c repère du solide et points par coordonnées, une PR chacun, 7d laissé tant qu'aucun modèle n'en a besoin ; (c) 2 : tirets là où une face passe devant ; (d) lot 7e après les trois premiers)

- **(a) Où écrire tout cela.** (1) Dans le bloc ` ```solide ` qu'on connaît, avec des lignes en plus
  (`droites:`, `plans:`, `repere:`) et une forme `repere` pour le repère sans solide ; (2) un bloc neuf pour
  la Terminale. Recommandation : (1) — tout ce qui existe (points, vecteurs, rotation, PDF) sert tel quel.
- **(b) Découpage.** Le lot est gros. Proposition : **7a** droites sur un solide ; **7b** plans sur un
  solide ; **7c** repère du solide et points par coordonnées ; **7d** repère sans solide (axes gradués).
  Une PR chacun, dans cet ordre. 7d seulement si tu en as l'usage : en Terminale, les exercices à
  coordonnées sans solide se font le plus souvent sans figure.
- **(c) Ce qui est caché.** Aujourd'hui un vecteur est en trait plein partout, même à travers le solide.
  Pour une droite : (1) pareil, trait plein partout ; (2) comme dans les manuels : en tirets là où une face
  du solide passe devant elle, en plein ailleurs, recalculé quand on tourne ; même règle pour le bord du
  plan teinté. Recommandation : (2), c'est ce qui permet de lire si la droite passe devant ou derrière.
- **(d) Montrer un point d'intersection quand l'auteur le demande** (`points: K intersection (IG) (BDE)`,
  utile pour un corrigé ou pour une question qui part de K). (1) Pas dans ce lot ; (2) dans un lot 7e à la
  suite. Sans recommandation forte : (1) est le choix qui n'ajoute rien.

## 18. Lot 7a — droites : ce qui est fait (2026-11-27)

- **Clé** `droites: (AG), d = (IG)` du bloc ` ```solide ` (`SolideSpec.droites`, `SolideDroite`, au plus
  `SOLIDE_MAX_DROITES` = 4), polyèdres à sommets nommés ; erreurs des comportements 80 et 83, plus « même
  droite » écrite deux fois (`readDroites`).
- **Moteur de vue** (`espace-vue.ts`) : `chordInSolid` (où la droite entre dans le solide et en sort),
  `hiddenStretches` (morceaux cachés ou visibles : coupes aux plans des faces et aux croisements des arêtes
  sur le dessin, état lu au milieu de chaque morceau). Témoin indépendant dans le test (marche pas à pas vers
  l'œil), 7 polyèdres × 164 vues × 3 droites. **Défaut trouvé par ce témoin** : signe faux dans le calcul du
  croisement avec une arête (les coupes au bord du solide manquaient, un bout caché était dessiné plein).
- **Scène** : `SolideScene.droites` ; la droite est la corde allongée de `DROITE_OVERHANG` (18 % de la plus
  grande dimension) de chaque côté, la même sous tous les angles ; ses bouts comptent dans le cadre fixe.
  Nom « (d) » près d'un bout, tenu pendant la rotation. Nom d'un point déclaré : un second tour de places plus
  loin quand le bloc a des droites (`POINT_NAME_FAR`) — le nom de I n'est plus écrit sur (IG) ; sans droites,
  rien ne change.
- **Écart avec le test écrit d'avance** : `(DG)`, diagonale de la face du fond d'un cube. Le test attendait
  plein / tirets / plein ; en cavalière, la droite au-delà de D est encore derrière la face de devant (son
  dessin ne ressort du cube qu'en A, bien plus loin que le dépassement) : tirets puis plein. Le test dit
  maintenant cela. À montrer à David.
- **Écran** (`Solide.svelte`) : `polyline.solide-droite`, `--color-fig-bleu`. **PDF** : `rgb(37, 99, 235)`.
- Catalogue (`block-catalog/solide.ts` : réglage, exemple « Deux droites dans un cube que l'élève peut
  tourner », erreur « La même droite écrite deux fois »), doc `docs/systeme/ubumark.md`.
- Tests : `solide-droites.test.ts` (27), `Solide.svelte.test.ts` (+1).
- Vu à l'écran par la session (captures Chromium du composant) : cube avec (IG) et (BH), cube avec (DG),
  (AF), (DC), cube `cachees: non`, pyramide avec (SO) et (AC), prisme, pavé à 4 diagonales ; cube tourné sous
  4 angles (tirets recalculés, cadre tenu, nom suivi). **Pas vu** : la fiche PDF imprimée (le Typst est
  testé, pas compilé) ; le thème sombre ; le doigt sur un vrai téléphone. Remarque : en cavalière, (AF) et
  (DG) d'un cube se dessinent l'une sur l'autre (la fuyante est à 45°) — c'est la perspective, pas un défaut.
- **Revue** (`code-reviewer`, opus) : géométrie de `hiddenStretches` confirmée par un second témoin (0 désaccord
  sur 46 686 morceaux), bloc sans droites inchangé. Deux défauts corrigés, tests rouges avant : le nom « (d) »
  touchait sa propre droite dès qu'elle était en biais (écart au trait calculé selon la pente,
  `DROITE_NAME_CLEAR`) ; un nom de droite tenu pendant la rotation sortait du cadre (ramené dans le cadre).
  **Laissés** : une droite posée dans une face vue exactement par la tranche est en tirets alors que l'arête
  est en plein (angle que le clavier n'atteint pas) ; `droites:` vide ou `(AG` sans parenthèse fermante
  acceptés sans message.
- Docs produites : `docs/systeme/ubumark.md` (paragraphe « Droites données »), ce journal.

## 19. Lot 7b — plans : ce qui est fait (2026-11-27)

- **Clé** `plans: (BDE), P = (ACG)` du bloc ` ```solide ` (`SolideSpec.plans`, `SolidePlan`, au plus
  `SOLIDE_MAX_PLANS` = 2), polyèdres à sommets nommés ; erreurs des comportements 80 et 83, plus « même
  plan » écrit deux fois (`readPlans`). Nom de plan : une majuscule qui n'est pas le nom d'un point.
- **Moteur de vue** (`espace-vue.ts`) : `planeInSolid`, le polygone où le plan coupe le solide (un sommet par
  sommet du solide posé dans le plan, un par arête traversée, dans l'ordre du tour). Témoin indépendant dans
  le test : 7 polyèdres, tous les plans par trois points pris parmi les sommets et les milieux d'arêtes
  (plus de 3 000), nombre de sommets, appartenance au plan, convexité.
- **Scène** : `SolideScene.plans` (`fill`, `border`) ; le bord est découpé par `hiddenStretches` (celui des
  droites), côté par côté. Un plan qui contient une face la teinte (comportement 75). Le plan ne change ni
  le cadre, ni les arêtes, ni les noms des sommets. Nom « (P) » écrit dans le plan, en un point du plan choisi
  sur le dessin de départ (le plus dégagé) ; il suit ce point pendant la rotation, hors de `labelOffsets`.
- **Écran** (`Solide.svelte`) : `polygon.solide-plan`, `polyline.solide-plan-bord` ; premier plan vert,
  second violet (pour les distinguer : « les plans sont-ils sécants ? »). **PDF** : `PLAN_FILLS`,
  `PLAN_STROKES`.
- Catalogue (`block-catalog/solide.ts` : réglage, exemple « Une droite et un plan dans un cube que l'élève
  peut tourner », erreur « Trois points alignés pour un plan »), doc `docs/systeme/ubumark.md`.
- Tests : `solide-plans.test.ts` (29), `Solide.svelte.test.ts` (+1). Les tests ont été écrits avant le code,
  mais lancés seulement après : pas de passage au rouge observé.
- Vu à l'écran par la session (captures Chromium du composant) : cube avec (BDE), avec (IG) et (BDE), avec
  (ABG) et (BDE), avec (ABC), hexagone par trois milieux, `cachees: non`, pavé à deux plans, pyramide avec
  (SAC) et (SO), prisme, tétraèdre ; cube, pavé et hexagone tournés sous deux angles (polygone, tirets et nom
  suivent). **Pas vu** : la fiche PDF imprimée, le thème sombre, le doigt sur un vrai téléphone.
- **À montrer à David** : `(BDE)` d'un cube est vu presque par la tranche à la vue de départ ; son nom « (P) »
  y touche l'arête cachée [DH] et le bord du plan, faute de place.
- **Revue** (`code-reviewer`, opus) : `planeInSolid` rejoué sur environ 10 600 plans (sommets, milieux, centres,
  dimensions décimales), bord comparé à l'arête qu'il recouvre sur plus de 40 000 morceaux, figure sans plan
  inchangée, nom jamais hors du cadre : rien trouvé. **Un défaut corrigé, test rouge avant** : le nom « (P) »
  pouvait toucher le nom d'un sommet ou une cote (`pave 5 3 2` avec `(ABF)` : touchait D) — la place est
  maintenant la plus dégagée où il ne touche aucune étiquette déjà posée (`spots`, `planSpots`). **Laissés** :
  plan trop petit pour son nom (face du dessus d'un `pave 1 1 6`), le nom touche un nom de sommet ; pendant
  la rotation, « (P) » peut passer sur un autre nom (il suit son point, il n'est pas tenu) ; à la butée de la
  vue de dessus ou de dessous, le bord d'un plan posé sur une face vue par la tranche est en tirets alors que
  l'arête est en plein (prisme, `(ABC)` : l'écart du 7a, atteint en tirant jusqu'au bout).
- **Nom à côté du plan** (tranché par David, « suis tes recos ») : quand aucune place du plan ne tient sans
  toucher un trait, un point ou un nom, « (P) » se pose à côté d'un côté du polygone (`borderSpots`,
  `PLAN_NAME_AWAY`, `PlanSpot`) ; il suit ce point du bord pendant la rotation, ramené dans le cadre. Vu à
  l'écran : cube avec (IG) et (BDE) (« (P) » à droite de [EB]), cube à deux plans, `pave 1 1 6` avec (EFG),
  `pave 5 3 2` avec (ABF), prisme coté avec (ABC), pyramide avec (SAC) ; les deux cubes tournés sous deux
  angles. Le « À montrer à David » ci-dessus n'a plus lieu d'être. Tests : `solide-plans.test.ts` (31).
- **Essayé par David le 2026-11-27 : « c'est bon ».** Le nom à côté du plan a été écrit après la revue : il
  n'a pas été relu par un agent (tests et captures seulement).

## 20. Bord en butée : un trait posé sur une arête a l'état de l'arête (2026-11-27)

- **Défaut** : `hiddenStretches` lance un rayon du point vers l'œil ; quand la face qui porte le segment est vue
  exactement par la tranche, le rayon glisse dans la face et le morceau sortait « caché », alors que
  `hiddenEdges` dessine les arêtes de cette face en plein. Plus large que la butée : toute face vue par la
  tranche (face de côté d'un cube après un demi-tour, par exemple).
- **Correctif** (`espace-vue.ts`) : un segment dont les deux bouts sont dans le plan d'une face que l'œil voit
  au sens de `faceTowardEye` (la règle des arêtes) est en plein d'un bout à l'autre. Une diagonale d'une face
  du fond reste en tirets, même quand ses quatre arêtes sont en plein (vue de dessus d'un cube).
- **Tests** (rouges avant le correctif) : `solide-bord-en-butee.test.ts` (6) — chaque arête de 7 polyèdres
  redonnée à `hiddenStretches` sous 144 butées et 128 autres vues a l'état de `hiddenEdges` ; diagonale d'une
  face vue par la tranche ; cas témoin du prisme (`plans: (ABC)`, `droites: (AB), (BC)`) ;
  `Solide.svelte.test.ts` (+1 : figure tirée à la butée, bord sans tirets à l'écran).
- **Vu à l'écran par la session** (captures Chromium du composant) : prisme témoin en butée de dessus, de
  dessous et de biais ; cube avec `(AB)`, `(AC)` et `(ABF)` en butée de dessus ((AB) pleine, (AC) en tirets).
  En butée de dessus du prisme, « (P) » passe sur le nom de C (déjà laissé : il suit son point).
- Doc : `docs/systeme/ubumark.md` (paragraphe « Droites données »).
- **Revue** (`code-reviewer`, opus) : ancien et nouveau code comparés sur 1 128 972 segments posés dans le plan
  d'une face (7 formes, dimensions de 0,1 à 1000, 445 vues, prolongements et points hors de la face compris),
  contre un témoin indépendant : 31 820 changent, tous sur une face vue par la tranche, tous faux avant et
  justes après ; aucun « visible » là où le témoin dit « caché ». Seuils : 0 désaccord avec `hiddenEdges` sur
  141 120 arêtes, angles à 1e-15 près de la tranche compris. Tests neufs rejoués sur l'ancien code : rouges
  (sauf la diagonale du fond, qui garde le cas inverse). Rien de bloquant ; un commentaire de test corrigé.
- **Essayé par David le 2026-11-27 : « c'est bon ».** Mergé (#3252).

## 21. Lot 7c — repère du solide et points par coordonnées : ce qui est fait (2026-11-27)

- **Clé** `repere: A ; AB, AD, AE` du bloc ` ```solide ` (`SolideSpec.repere`, `SolideRepere` : l'origine et
  le bout de chacun des trois vecteurs), polyèdres à sommets nommés ; parenthèses autour facultatives.
  Erreurs des comportements 82 et 83 (`readRepere`) : trois vecteurs dans un même plan, vecteur nul, point
  inconnu, solide rond, `section:` ou `tracer:` dans le bloc.
- **Points par coordonnées** : `points: M (1 ; 0,5 ; 1)` (`SolidePoint.coords`), à côté des milieux et des
  centres ; le point sert ensuite comme un autre (milieu, vecteur, droite, plan). Les éléments de `points:`
  se coupent aux virgules hors parenthèses (`splitItems`). Erreurs du comportement 81 : coordonnées sans
  `repere:`, point hors du solide agrandi de la marge des droites (`DROITE_OVERHANG`, 18 % de la plus grande
  dimension, sur la boîte du solide) ; plus : deux ou quatre coordonnées, coordonnée qui n'est pas un nombre,
  plus de 3 décimales.
- **Ordre de lecture** : le repère s'appuie sur les sommets et les points déclarés (milieu, centre) **avant
  le premier point à coordonnées** ; il est lu à ce moment-là (`frame`), sinon après les points. Un repère
  mal écrit ne donne qu'une erreur, la sienne.
- **Scène** : les trois vecteurs du repère sont trois flèches de plus dans `SolideScene.arrows` (la scène de
  `repere: A ; AB, AD, AE` est celle de `vecteurs: AB, AD, AE`) ; rien de neuf dans `Solide.svelte` ni dans le
  PDF ; tout suit la rotation. Lecteur d'écran : « repère d'origine A », « point M de coordonnées
  (1 ; 0,5 ; 1) ».
- **Choix faits sans David, à lui montrer** : (1) chaque vecteur du repère **part de l'origine**
  (`A ; AB, AD, AE` oui, `A ; AB, AD, BF` refusé avec une phrase) : les flèches vont ainsi d'un point nommé à
  un autre ; (2) coordonnées **décimales seulement** (`0,5`, pas `1/2` ni `1/3`) : c'est l'écriture validée
  (comportement 71) ; (3) un point à coordonnées posé sur un sommet (`M (1 ; 1 ; 1)` = G) est accepté, deux
  noms au même endroit.
- Catalogue (`block-catalog/solide.ts` : réglage `repere`, réglage `points` complété, exemple « Un repère du
  cube et un point par ses coordonnées », erreurs « trois vecteurs dans un même plan » et « coordonnées sans
  repère »), doc `docs/systeme/ubumark.md` (paragraphe « Repère du solide et points par coordonnées »).
- Tests : `solide-repere.test.ts` (31, rouges avant le code : 27 sur 31), `Solide.svelte.test.ts` (+1).
- Vu à l'écran par la session (captures Chromium du composant) : cube avec son repère ; cube avec M et (AM) ;
  cube en repère (D ; DA, DC, DH) avec deux points et le plan (BDE) ; pavé avec I, M, J milieu de [IM] et le
  vecteur u = AM ; pyramide en repère (O ; OA, OB, OS) ; prisme ; deux cubes tournés au clavier (flèches,
  points et noms suivent). **Pas vu** : la fiche PDF imprimée (le Typst est testé, pas compilé), le thème
  sombre, le doigt sur un vrai téléphone. Remarque : un point placé tout contre un sommet (N à 0,3 de B) a
  son nom contre celui du sommet une fois la figure tournée — les noms sont tenus, comme pour les autres points.
- **Revue** (`code-reviewer`, opus, une soixantaine d'entrées tordues essayées) : `points:` sans coordonnées
  se lit comme avant, aucun consommateur de `solidePoints3` ne perd `coords`, une seule erreur à chaque fois.
  **Deux défauts corrigés, tests rouges avant** : (1) le refus « hors de la figure » regardait la boîte des
  sommets — un point loin d'une pyramide (près du haut) ou du côté vide d'un prisme passait ; il mesure
  maintenant ce dont le point dépasse le plan de chaque face (`beyondFace`, solide convexe) ; (2) un nom de
  sommet ou un nom donné deux fois dans `points:` faisait dire au repère « donné par ses coordonnées » ou
  « déclare-le avant » à la place de la vraie erreur de `points:`. **Laissés** : `repere: (A ; AB, AD, AE`
  (parenthèse non fermée) et `[AB]` acceptés sans message ; `I(milieu AE)` dit « trois coordonnées ».
  Tests : `solide-repere.test.ts` (34).

## 22. Petite PR d'après le 7c : description sous le réglage, cases de `retrouver:` teintées (2026-11-28)

- **Page d'aide d'un bloc** (`BlockHelpPage.svelte`, les 30 fiches) : deux lignes par réglage — la clé, ses
  valeurs, son défaut ; puis la description dessous, sur toute la largeur, en gris. La colonne « Effet »
  disparaît (`tourner:` des cubes y tenait sur dix lignes ; sur téléphone, le tableau défilait de côté).
- **` ```cubes ` + `retrouver:`** (`CubesGeste.svelte`) : les cases à remplir de la vue de dessus sont teintées
  (14 % de `--color-primary` sur le fond) ; avant, rien ne les distinguait des carreaux blancs des vues
  données. La grille de la correction reste blanche.
- Tests (rouges avant le code) : `BlockHelpPage.svelte.test.ts` (2 lignes par réglage, description sous la
  clé, plus de « Effet »), `CubesGeste.svelte.test.ts` (couleur rendue, clair et sombre).
- Vu à l'écran par la session (`pnpm voir`, WebKit) : `/aide-ecriture/blocs/cubes` sur grand écran (tableau,
  deux exemples `retrouver:`), `/aide-ecriture/blocs/solide` au format iPhone (le tableau tient dans la
  largeur). **Pas vu** : le thème sombre à l'écran (la teinte y est lue par le test), une question
  `retrouver:` côté élève.
- « (Q) » sur la zone teintée de (P) : David n'en a rien dit, laissé.
- Revue : aucune (correctif d'affichage, sans logique).

## 23. Hors des lots : segments et angles droits du bloc solide (2026-11-28)

Outil n° 72 d'`outils-manquants.md`, fait par la session `outils` dans son propre chantier, journal
[solide-segments](solide-segments-progress.md), #3264 : `segments: [HF], [DF]` et
`angles-droits: DHF` (polyèdres, ni `section:` ni `tracer:`, rotation et PDF compris). Reprend
`hiddenStretches` comme les droites. Piège : en cavalière, la diagonale [AG] d'un cube se dessine sur
l'arête [FG].

## 23. Lot 7e — point d'intersection : comportements (validés par David le 2026-11-28)

Exemple suivi : cube ABCDEFGH, I milieu de [AE], `points: I milieu AE, K intersection (IG) (BDE)`.

### Nominal

84. **Droite et plan.** `K intersection (IG) (BDE)` : K est marqué d'un point et nommé, là où la droite
    perce le plan.
85. **Deux droites.** `K intersection (AG) (BH)` : K est le point où elles se croisent.
86. K sert ensuite comme un autre point : milieu, vecteur, droite, plan.
87. La droite et le plan n'ont pas besoin d'être dessinés.
88. Avec `tourner: oui`, K et son nom suivent la rotation ; sur la fiche PDF, c'est la vue de départ.

### Limites

89. Rien n'est dessiné sans que l'auteur le demande (le comportement 76 reste vrai).
90. K qui tombe sur un sommet est accepté, deux noms au même endroit.
91. K compte dans les 8 points au plus ; les points qu'il utilise sont déclarés avant lui.
92. Lecteur d'écran : « point K intersection de la droite (IG) et du plan (BDE) ».
93. Une figure sans `intersection` reste strictement celle d'aujourd'hui.

### Erreurs (message pour l'auteur, jamais de figure fausse)

94. Droite parallèle au plan, ou contenue dans le plan.
95. Deux droites parallèles, confondues, ou non coplanaires.
96. Point inconnu, trois points alignés pour le plan, nom déjà pris.
97. K hors de la figure : même règle que pour un point à coordonnées.
98. `intersection` sur un cylindre, un cône ou une boule, ou avec `section:` ou `tracer:`.

### Questions pour David (réponse du 2026-11-28 : « je te suis » — (1) aux trois)

- **(a) Deux plans** (leur intersection est une droite) : (1) pas dans ce lot. Retenu.
- **(b) Écrire avec les noms** (`K intersection d P`) : (1) non, toujours les points entre parenthèses. Retenu.
- **(c) K hors du solide mais dans la marge** : (1) accepté, comme un point à coordonnées. Retenu.

## 24. Lot 7e — ce qui est fait (2026-11-28)

- **Écriture** `points: K intersection (IG) (BDE)` ou `K intersection (AG) (BH)` (`SolidePoint.meet` : `line`,
  `other`), le plan ou la droite en premier, indifféremment. Lecture : `readMeet` (`solide-parser.ts`) ;
  position : `meetPoint`, appelé par `solidePoints3` (`espace-solides.ts`). Rien de neuf dans la scène, dans
  `Solide.svelte` ni dans le PDF : c'est un point déclaré de plus.
- **Erreurs** des comportements 94 à 98, plus : deux plans (« se coupent selon une droite, pas en un
  point »), écriture non comprise (sans parenthèses, un ou trois groupes, un ou quatre points dans un groupe).
- **Écart avec la phase 0, à dire à David** : le comportement 86 disait aussi « point à toucher dans un
  geste », le 98 refuse `tracer:` — or `tracer:` est le seul geste du bloc. Le 98 est appliqué (comme pour
  `droites:`, `plans:`, `repere:`) : K n'est pas un point à toucher tant que `tracer:` est refusé.
- Catalogue (`block-catalog/solide.ts` : réglage `points` complété, exemple « Le point où une droite perce un
  plan », erreur « Une droite parallèle au plan »), doc `docs/systeme/ubumark.md` (paragraphe « Point
  d'intersection »).
- Tests : `solide-intersection.test.ts` (24, rouges avant le code : 22 sur 24), `Solide.svelte.test.ts` (+1).
- Vu à l'écran par la session (captures Chromium du composant) : cube avec K, (IG) et (BDE), à la vue de
  départ et tourné au clavier ; K seul ; (AG) et (BH) avec leur point O ; K sur le sommet A (deux noms côte à
  côte) ; pyramide avec O = (AC) ∩ (BD), K = (AI) ∩ (SBD), tournée ; K dans la marge, juste à gauche de E (son
  nom touche celui de E, comme tout point posé contre un sommet). **Pas vu** : la fiche PDF imprimée (le
  Typst est testé, pas compilé), le thème sombre, le doigt sur un vrai téléphone.
- **Revue** (`code-reviewer`, opus) : témoin indépendant sur 25 000 entrées (10 solides, dimensions de 0,1 à
  1000, droites et plans au hasard parmi sommets, milieux et centres) — chaque point accepté est sur la droite
  et sur le plan ou l'autre droite, aucun accepté sans point unique, aucun sécant refusé à tort, ni NaN ni
  exception ; 80 entrées tordues, une seule erreur à chaque fois ; aucun consommateur ne suppose `of` non
  vide ; bloc sans intersection inchangé. **Deux points corrigés** : `K intersection(IG)(BDE)` sans espace
  disait « non compris » avec l'exemple des milieux (accepté maintenant) ; le test de `section:` / `tracer:`
  asserte une seule erreur. **Laissés** : `intersection` + `repere:` + `section:` dit le conflit deux fois
  (une ligne chacun) ; la marge se rapporte à la plus grande dimension, comme au lot 7c (`pave 0,1 1 0,5` :
  un point à 0,1 hors d'un pavé épais de 0,1 est accepté).
