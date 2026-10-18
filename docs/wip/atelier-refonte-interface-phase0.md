# Atelier — refonte de l'interface : phase 0, à valider

Demande de David du 2026-10-18 (session « modifs-fixes »). Rien n'est codé : chaque lot attend sa validation.

## Déjà tranché par David (2026-10-18)

- **Console façon Quake : un volet déroulant** qui descend du haut PAR-DESSUS Graphe et Données. L'onglet Calcul disparaît.
- **Carte repliée éditable : la nouvelle définition vaut à Entrée ou à la sortie du champ**, jamais à chaque frappe.
- **Annuler / Rétablir : un vrai chantier**, avec sa propre phase 0 (lot 5). Toute action devient annulable.
- Onglets : Graphe, Données, puis plus tard Géométrie et Python. La « Console » n'est plus un onglet : c'est le volet.

## Constat qui change la barre : « Exporter » n'est pas « Enregistrer »

Le JSON « pour rejouer » (`history-export.ts`) ne contient que les **gestes de Calcul** (`ReplayStep` : saisie, action, supprimer, annuler, garder). Il ne contient **pas** une définition modifiée dans une carte, une couleur, une épaisseur, une courbe masquée, le tableur ou ses formats. Recharger ce fichier ne rend donc pas l'atelier qu'on avait.

Or l'état complet existe déjà, validé par Zod : c'est ce que `persistence.ts` range dans le navigateur.

**Proposition :**

- **Enregistrer** télécharge un fichier `.atelier.json` : l'état complet (`persistence.ts`) plus l'historique de la console.
- **Charger** relit ce fichier avec le même schéma Zod, après une confirmation « Charger remplace l'atelier actuel » (comme « Rejouer » aujourd'hui).
- L'ancien JSON « pour rejouer » reste lisible par Charger : un fichier d'avant la refonte ne devient pas illisible.
- **ubumark (pour lire)** n'est pas un enregistrement : il passe dans le menu de la console (« Copier l'historique pour une fiche »).

Ceci répond aussi à la question de la barre « Exporter l'historique » : elle fait doublon. Elle disparaît.

## Lot 1 — la barre d'icônes

Une seule ligne au-dessus des onglets. Chaque bouton est une icône seule (lucide), avec une infobulle et un `aria-label` en français.

| Place  | Icône        | Action                                                                    |
| ------ | ------------ | ------------------------------------------------------------------------- |
| gauche | `Undo2`      | Annuler (lot 5 ; d'ici là, désactivé avec sa raison)                      |
| gauche | `Redo2`      | Rétablir (lot 5)                                                          |
| gauche | `RotateCcw`  | Repartir de zéro (confirmation existante)                                 |
| gauche | `FolderOpen` | Charger                                                                   |
| gauche | `Save`       | Enregistrer                                                               |
| droite | `Share2`     | Partager (l'actuel « Partager… ») — **à confirmer** : tu ne l'as pas cité |
| droite | `Settings`   | Réglages, icône seule                                                     |

**Comportements :**

- Cas nominal : clic sur Enregistrer → un fichier `atelier-AAAA-MM-JJ.atelier.json` est téléchargé ; un toast dit « Atelier enregistré ».
- Limite : atelier vide → Enregistrer et Repartir de zéro sont désactivés, et l'infobulle dit pourquoi.
- Erreur : un fichier illisible, trop gros ou d'un autre format → rien n'est remplacé, et un message dit pourquoi en français.
- Atelier éphémère (lien partagé, navigation privée) : Repartir de zéro est masqué, comme aujourd'hui.

**À valider :**

- Partager dans la barre, à droite ?
- Undo/Redo visibles mais désactivés en attendant le lot 5, ou absents ?

## Lot 2 — la console déroulante

- Un bouton de la barre et la touche `²` (`` ` `` sur un clavier QWERTY) ouvrent ou ferment le volet. Le volet descend du haut, sur environ 40 % de la hauteur, et se redimensionne à la poignée. On voit le graphe dessous.
- Le champ de saisie prend le focus à l'ouverture. Échap ferme le volet.
- La touche `²` ne bascule pas le volet quand le focus est déjà dans un champ (sinon impossible de taper `²`). → **À valider.**
- **Lisibilité, ta demande :**
  - l'instruction en couleur normale, pas plus sombre que la réponse ;
  - la réponse préfixée `-->` en couleur d'accent ;
  - « a est correctement défini », le nom en couleur, au lieu de « "a" est dans tes objets ».
- Les boutons de ligne (copier, garder, détails…) n'apparaissent qu'au survol ou au focus de la ligne. Ils restent atteignables au clavier.
- Le badge « nouveaux résultats » (A3) passe sur le bouton de la console.
- Sur téléphone, le volet prend tout l'écran.

**À valider :**

- Fond sombre façon terminal, ou thème clair de l'atelier ?
- Police à chasse fixe pour l'instruction tapée ? Les maths restent rendues par MathLive.

## Lot 3 — les cartes de fonction

**Vue repliée (la seule) :**

- Une seule ligne `● f(x) = [3x+5]`.
- Le membre de droite est un champ MathLive éditable. La définition est prise en compte à Entrée ou à la sortie du champ.
- Plus de libellé « fonction » en dessous.
- Une saisie invalide garde l'ancienne définition, et le champ montre l'erreur. Échap revient à l'ancienne valeur.

**Le point de couleur :**

- Un clic ouvre une petite fenêtre : couleur, épaisseur, et peut-être pointillé. Le contenu reprend celui de `CurveSettings` ; c'est la présentation qui change.

**Plus de vue développée :**

- Elle est remplacée par une icône menu (`Menu`, ou `EllipsisVertical`) qui ouvre un menu à deux parties :
  - **Affichage** : aire sous la courbe, tangente… (ce qu'offre `CurveSettings` aujourd'hui) ;
  - **Actions** : dériver, tableau de variations, image, tabuler… (`actionsFor`).
- L'œil (montrer ou masquer la courbe) reste sur la ligne.

**À valider :**

- Les actions qui demandent une saisie (image `f(…)`, tabuler de/à/pas) s'ouvrent dans une petite fenêtre depuis le menu. Le résultat s'écrit dans la console, comme les autres actions (G7). D'accord ?
- Le « ce qu'est cette carte » (dérivée de f, réciproque de g) : une infobulle sur le nom, plutôt qu'une ligne sous la carte ?

## Lot 4 — les autres types d'objets (réflexion, à mener avec toi)

Même grammaire pour tous : une ligne `● nom = [définition éditable]`, puis un menu.

| Type   | Ligne repliée                        | Point              | Menu                     |
| ------ | ------------------------------------ | ------------------ | ------------------------ |
| valeur | `a = [3]` (+ curseur si paramètre ?) | —                  | curseur, bornes, pas     |
| suite  | `u(n) = […]` ou récurrence           | couleur des points | affichage, actions       |
| liste  | `L = {…}` tronquée                   | —                  | statistiques, diagrammes |

→ À discuter en séance : le curseur d'une valeur doit-il rester visible sans ouvrir de menu ?

## Lot 5 — Annuler / Rétablir (chantier à part)

Sa phase 0 vient après les lots 1 à 3. Voici les questions qu'elle devra trancher :

- **La granularité :**
  - une frappe dans une carte = une étape ? (proposition : une validation par Entrée = une étape) ;
  - un réglage de couleur = une étape ?
- **Le tableur :** une saisie de case est-elle dans la même pile que l'atelier ?
- **La console :**
  - annuler une ligne de console, est-ce effacer la ligne ou annuler son effet ? (proposition : effacer son effet ; la ligne reste, barrée) ;
  - l'Annuler de suppression d'aujourd'hui (10 s, Ctrl+Z) se fond dans la pile.
- **La taille de la pile :** est-elle rangée avec l'atelier, ou perdue au rechargement ? (proposition : perdue au rechargement)

## Ordre proposé

1. Lot 1 (barre, Enregistrer/Charger).
2. Lot 2 (console).
3. Lot 3 (cartes de fonction).
4. Lot 4 (réflexion, puis code).
5. Lot 5 (undo/redo).

⚠️ La mise en forme des cases du tableur (`atelier-tableur-mise-en-forme-phase0.md`) touche aussi `persistence.ts`. Le lot 1 (Enregistrer) doit partir de sa version, ou attendre son merge.
