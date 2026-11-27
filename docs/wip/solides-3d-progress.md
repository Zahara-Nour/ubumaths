# Chantier `solides-3d` — figures de l'espace qui tournent

## Reprendre ici

_Mis à jour le 2026-11-27, après #3229._

- **État** : [ADR 0045](../adr/0045-figures-de-l-espace-qui-tournent.md) ; phase 0 validée (§ 2, Q1 à Q4
  du § 3) ; **lots 1 à 5 mergés** (#3195 moteur ; #3200 polyèdres ; #3211 noms tenus, § 7 ; #3216 cylindre,
  cône, boule, § 8 et 9 ; #3222 sections et cotes, § 10 et 11 ; #3227 vecteur à tracer sur figure tournée,
  § 12 et 13) ; **#3229** : nom d'un centre écarté des cotes (boule coupée près du centre, § 14). Les lots 3
  à 5 et #3229 ne sont pas en prod tant qu'un `deploy:prod` demandé par David ne les a pas emportés (le
  vérifier avant de l'affirmer).
- **Prochaine action** : lot 6 (` ```cubes `, assemblages) : comportements à écrire en français et à faire
  valider par David avant tout code.
- **En attente de David** : son essai au doigt, sur `/aide-ecriture/blocs/solide` (compte prof) : noms tenus
  (§ 7), solides ronds (§ 9), lot 4 (longueurs qui s'effacent, section qui tourne), lot 5 (exemple « Un
  vecteur à tracer sur un pavé que l'élève peut tourner » : toucher contre glisser, toucher « tremblé » de 4
  à 10 px qui tourne sans poser). Puis sa demande de `deploy:prod` (mise en prod seulement après son essai).
  Deux défauts voisins signalés le 2026-11-27, sans réponse (§ 14) : contour de la section dans le texte de
  la cote du rayon (boule coupée très près du centre) ; cotes du rayon et de la distance qui se touchent
  (cylindre très plat coupé perpendiculairement à l'axe). Les corriger ou les laisser ?
- **Tranché par David le 2026-11-27** : point gardé sur le sommet NOMMÉ du cône ; nom de vecteur qui dépasse
  de 0,08 cm laissé tel quel ; lot 5 : deux points au même endroit = celui de devant, la figure
  « Correction » tourne, « Vue de départ » reste sous la figure à geste, au-dessus des boutons (écart avec
  le comportement 44 accepté).
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
- **Worktree / branche** : `../ubumaths-wt-solides-3d`, branche `feat/solides-3d-lot-6` (neuve, depuis
  `main` après #3229, rien dedans). Serveur d'essai sur 5176, lien du tailnet par `pnpm lien`.

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
