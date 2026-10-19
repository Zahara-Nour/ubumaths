# Atelier — Annuler / Rétablir (lot 5 de la refonte) : phase 0, validée

Lot 5 de `atelier-refonte-interface-phase0.md`. Validée le 2026-10-19. Le code attend le merge du chantier de performance de la session atelier-geometry (`perf/atelier-recalcul`), qui touche le même modèle.

## Déjà tranché par David (2026-10-18)

- Une étape = une validation (Entrée, sortie du champ, choix dans un menu). Un changement de couleur = une étape. Tout un glissé de curseur = une seule étape.
- Le tableur est dans la même pile que le reste de l'atelier.
- Annuler une ligne de console annule son effet ; la ligne reste, barrée.
- La pile est perdue au rechargement.

## État des lieux (2026-10-19)

- `Atelier` (`atelier.svelte.ts`) a une cinquantaine de méthodes qui modifient l'état : objets, curseurs, affichage, grille, graine. Il n'existe pas de point de passage unique : `revision++` est un compteur, sans « avant » ni « après ».
- `serialize()` / `restore()` couvrent l'état rangé : objets, affichages, curseurs, grille, formats, graine. Plafond : 500 000 caractères. Un atelier courant pèse sans doute 1 à 10 ko (estimation, non mesurée).
- Ce qui n'est pas dans `serialize()` :
  - les diagrammes affichés et le mode de calcul ;
  - le réglage des angles (à vérifier) ;
  - l'état du graphe (zoom, fenêtre) ;
  - la console.
- Le tableur a **déjà sa propre pile** (`#undo` / `#redo`, 100 gestes), avec des boutons dans Données et Ctrl+Z / Ctrl+Y.
- L'annulation de suppression existe à part : une copie avant suppression, un toast de 10 s et Ctrl+Z.
- Le curseur écrit dans l'atelier à **chaque cran** : il n'y a pas d'événement de fin de glissé.

## Proposition

### Comment : des photos de l'état, pas des opérations inverses ← à trancher (Q1)

- **(A) Photos** ← recommandé.
  - Avant chaque étape, on garde une photo de l'état (`serialize()`, plus ce qui n'y est pas mais doit s'annuler : diagrammes affichés, mode de calcul, angles).
  - Annuler remet la photo d'avant ; Rétablir remet celle d'après.
  - C'est simple et sûr : une seule voie, déjà testée par le rechargement et le fichier `.atelier.json`. Une méthode ajoutée demain est couverte sans rien écrire.
  - Coût mémoire : 100 étapes × 10 ko = 1 Mo. Le plafond se compte en taille totale plutôt qu'en nombre d'étapes (5 Mo proposés), pour un gros atelier.
- **(B) Opérations inverses** : chacune des ~50 méthodes saurait se défaire. C'est plus fin en mémoire, mais chaque méthode est une occasion de bug, et chaque méthode future doit y penser.

Avec (A), la pile propre du tableur et l'annulation de suppression disparaissent : elles deviennent des cas de la pile commune.

### Où commence et finit une étape

- Une étape s'ouvre et se ferme autour d'un **geste de l'élève** : validation d'une carte, choix dans un menu ou une fenêtre, ligne de console, geste du tableur (avec les gestes composés existants), Repartir de zéro, Charger.
- Un **calcul** ne fait pas d'étape : `f(2)` dans la console ne change rien à l'atelier, donc il n'y a rien à annuler.
- **Curseur** : la photo est prise au début du glissé (pointerdown, ou première touche), et l'étape se ferme au relâchement. Il faut ajouter cet événement de fin, qui n'existe pas.
- Une étape qui n'a rien changé n'est pas gardée (photo identique).

### Comportements

- **Barre d'icônes** : Annuler (`Undo2`) et Rétablir (`Redo2`) reviennent à gauche, comme prévu au lot 1. L'infobulle nomme l'étape, par exemple « Annuler : supprimer f » ou « Rétablir : couleur de g ». Les boutons sont grisés quand la pile est vide, avec leur raison.
- **Raccourcis** :
  - Ctrl/Cmd+Z annule, Ctrl+Y ou Ctrl/Cmd+Maj+Z rétablit.
  - **Dans un champ en cours de frappe**, c'est l'annuler du champ lui-même (MathLive, texte), comme aujourd'hui.
  - Hors d'un champ, c'est la pile de l'atelier.
- **Console** : annuler l'étape d'une ligne la barre (et une annonce le dit). Rétablir la débarre. Les lectures graphiques d'une ligne barrée disparaissent.
- **Nouvelle étape après des annulations** : la partie « à rétablir » est oubliée, comme partout. Les lignes barrées restent barrées.
- **Annonce** : chaque annulation est dite par la région `aria-live` (« Annulé : supprimer f »).
- **Repartir de zéro et Charger deviennent annulables** : un clic malheureux ne perd plus rien. La confirmation actuelle peut alors rester ou partir (Q5).
- **Ce qui ne s'annule pas** :
  - le zoom et le déplacement du graphe ;
  - l'ouverture de la console ;
  - le changement d'onglet ;
  - le texte des lignes de console, qui restent visibles.
- **Pile vidée** quand un autre onglet modifie le même atelier (la session le détecte déjà), et au rechargement.

## Questions pour David (recommandation en premier) — les 6 recommandations validées par David le 2026-10-19 (« je te suis »)

1. **La méthode** : (A) des photos de l'état ← recommandé ; ou (B) des opérations inverses.
2. **Le zoom et le déplacement du graphe annulables ?** Non ← recommandé : c'est regarder, pas modifier.
3. **Les boutons Annuler / Rétablir propres au tableur** (vue Données) : les retirer au profit de ceux de la barre ← recommandé, une seule pile et un seul endroit. Ou les garder comme raccourcis de la même pile.
4. **Le toast « Annuler » après une suppression** : le garder (il fait découvrir le geste), relié à la pile commune et sans la limite de 10 s ← recommandé ; ou le retirer.
5. **Repartir de zéro, une fois annulable** : garder la confirmation ← recommandé (le geste vide tout, mieux vaut deux sécurités pour un élève) ; ou la retirer.
6. **Plafond** : 100 étapes et 5 Mo au total, la plus ancienne étape oubliée au-delà ← recommandé.

## Découpage proposé (après validation)

1. **La pile et les photos.** Le modèle, les étapes de la console, des cartes, des menus et du tableur, les raccourcis et les boutons de la barre. Les piles du tableur et de la suppression sont retirées.
2. **Le curseur** (fin de glissé) et **les lignes barrées** de la console (avec les lectures graphiques).
3. **Repartir de zéro et Charger** annulables ; le toast relié à la pile.
