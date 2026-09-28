# Lot « Grandeurs » — rapport de relecture

45 questions TinyMath (#426–#470), CM1 à 6e : conversions, périmètres, aires, durées, vitesses.
Relecture le 2026-09-27 (Claude, trois relecteurs puis contrôle d'ensemble) de **41 questions** ; les
4 autres (#462, #464, #466, #468) attendent une réponse en durée composée (« 2 h 15 min »), pas
encore acceptée par le correcteur (lot 3 du chantier Grandeurs).

> ✅ **Feu vert de David le 2026-09-27 : les 41 questions sont importées en BROUILLON** (vérifié en
> base : reliées au suivi, statut draft, 41 emplacements distincts). David les publie lui-même.

## Les 4 dernières (#462, #464, #466, #468) — relues le 2026-09-28, en attente du feu vert

Débloquées par #502 (réponse en durée composée, mesurée au vrai clavier). Toutes corrigées,
importables (specs vertes, 50 tirages sur 50).

- **#462, #464, #466** (ajouter des durées) ne généraient pas : l'expression TinyMath `&1 h &2 min`
  était recopiée brute → énoncé avec une case à unité, attendu `{{eval:a[h]+b[min]+…}}`, correction
  qui montre la retenue puis le résultat en « h min ». Consigne complétée « sous la forme que tu
  veux » (la sous-description TinyMath laisse l'unité au choix).
- **#468** (soustraire des durées) : la correction affichait « 1.5 h » → « 1 h 30 min » ; unités en
  `\unit`, « épisode » → « film » dans le retour, phrase de conclusion.
- Specs (ex. 2 h 40 min + 35 min = 3 h 15 min) : `3 h 15 min`, `3h15min`, `195 min`, `3,25 h` justes ;
  `2 h 75 min` et `3 h 15` perfectibles ; `3 h 15 mn`, `15 min 3 h` mauvaise forme ; retenue oubliée
  (`2 h 15 min`), `195` sans unité, `8,3 h` pour 8 h 30 min : faux.
- Retenues : attendus calculés exactement, bornes vérifiées (4 h 59 + 4 h 59 = 9 h 58).
- Défaut d'affichage trouvé : `;hms` en ligne affiche « 3 h56 min » (espace perdue) — touche aussi
  **#467 déjà importée** ; correctif en cours (`fix/hms-espace-entre-unites`).

## Bilan

| Verdict                         | Nombre |
| ------------------------------- | ------ |
| Approuvée telle que transformée | 1      |
| Corrigée puis approuvée         | 40     |
| Rejetée                         | 0      |
| À arbitrer                      | 0      |
| En attente (lot 3)              | 4      |

Vérification indépendante (`pnpm question:specs --lot docs/relecture/grandeurs`) : **41 analysés,
0 non importable**, 50 tirages par variation sans échec. Contrôle du rendu (5 tirages par variation,
énoncé et correction) : aucune grandeur brute, aucun marqueur, aucun `*`. Affichage vérifié :
« 4,25 h », « 7 000 km/h », « 31,5 mm² ».

## Préparation : le moteur a appris les grandeurs (chantier `docs/wip/grandeurs-eval-progress.md`)

31 questions sur 45 ne généraient pas : TinyMath calcule avec des grandeurs, et `{{eval}}` jetait
les unités **en silence** (`3 h + 20 min` → 23).

- **#483** `tidy` : l'unité écrite d'abord (28 mm, pas 2,8 cm) ; `3 h ÷ 1 min` → 180.
- **#484** `{{eval}}` calcule avec des grandeurs ; `;[min]` (exprimé en) ; `;hms` (affichage
  « 2 h 15 min ») ; erreur visible au lieu d'une unité jetée.
- **#485** convertisseur TinyMath des grandeurs (14 → 35 questions générées).
- **#486** affichage d'une grandeur dans une formule d'auteur ou dans le texte.

## Corrections notables

- **Unités lues comme des lettres** : `7 km = ? m` affiché « 7 k m » (produit k·m) ; `\,mm^2` lu
  m·m² ; « d m³ », « m L » (#426–#431, #437, #448–#454, #469) → unités déclarées (`7[km]`,
  `\unit{mm^2}`).
- **Ne généraient pas** : listes de grandeurs (#428, #429) ; décimal composé `&1,&2` (#457–#460,
  l'heure décimale est maintenant tirée par ses minutes) ; réponses conditionnelles cassées
  (#461, #463, #465 → heures et minutes calculées, deux cases).
- **#434** : les 7 variations tiraient toutes des côtés en mm (seule l'unité de la réponse changeait,
  et la case accepte toute unité équivalente : 7 fois la même question) → chaque variation a ses
  côtés dans sa propre unité (mm à km).
- **Corrections** : `\textcolor` non fermé (#441, « 11[cm]} ») ; `c*d` et `{c*d}/2` affichés
  (#440, #442, #445) ; fraction de vitesse cassée (#470) ; coquille `\†ext` (#437) ; `align` dans un
  seul `$` (#467).
- **Consignes** : « heures minutes secondes » sans secondes (#455, #456) ; « Conplète » (#469) ;
  « asociée » (#443, #444) ; « A partir » ; espaces en trop.

Chaque fichier `<n>.json` porte le détail dans `editNotes`.

## Choix des relecteurs — validés par David (2026-09-27)

1. **Longueur > largeur** : condition ajoutée sur #434, #435, #438, #439 (TinyMath tirait seulement
   des côtés différents : la « largeur » pouvait dépasser la « longueur »).
2. **#440** : « triangle rectangle de longueur … et de largeur … » → « dont les côtés de l'angle
   droit mesurent … et … ».
3. **Forme de la réponse** : case numérique avec l'unité écrite après quand l'énoncé impose l'unité
   (conversions #426–#431, #448–#460) ; case à unité (toute unité équivalente acceptée, réponse
   sans unité refusée) quand l'énoncé ne l'impose pas (périmètres, aires, #467, #470).
4. **#469** : vitesses tirées peu réalistes (7 200 km/h), comme dans TinyMath — gardées.

## Défauts de conversion restants (corrigés à la main dans ce lot)

1. Unités écrites sans crochets dans les expressions TinyMath (`a km`, `? m`, `\,min`) ou dans les
   éléments d'une liste `$l{&1 km;…}`.
2. Décimal composé `&1,&2` (« Unexpected token: , »).
3. Réponse conditionnelle `a>b ?? X :: Y` avec `[_…_]` mal convertie.
4. `*` recopié dans le LaTeX d'une correction ; `\frac{{{eval…}}}{…}` (accolades mangées).
5. Durée juxtaposée hors `align` : `4~\unit{h} 10~\unit{min}` s'afficherait « 4 h10 min » (espace
   ignorée en formule) — à corriger avec le lot 3.
