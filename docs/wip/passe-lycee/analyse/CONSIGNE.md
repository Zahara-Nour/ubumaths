# Analyse des modèles du lycée contre les bornes (passe lycée, étape d)

Consigne commune aux agents d'analyse (2026-10-23). Reprend celle du collège
(`../../arbre-notions/analyse/CONSIGNE.md`, 2026-10-18), adaptée au lycée.

## But

Pour chaque modèle du lot, dire à quel point il peut être tagué, en **inclusion stricte** : chaque question que le
modèle peut générer doit rester dans les bornes du point **et** dans les bornes générales de son programme. Une seule
question hors bornes suffit à refuser le tag. Une couverture partielle du point est acceptée.

**Plusieurs programmes (décision de David, 2026-10-23, option A)** : un modèle est jugé contre **tous les programmes
du lycée où sa tâche existe**, pas seulement celui de son niveau. Il peut recevoir un point dans chacun (au plus un
par programme), chaque fois en inclusion stricte contre les bornes de **ce** programme. Exemple : un modèle de 1re
spé sur les suites géométriques peut aussi viser un point de 1re ES (`1_GEN`) ou de 1re techno, si ses nombres, ses
notations et ses formes restent dans les bornes de ce programme-là (souvent plus étroites).

Programmes : `2` (2de), `1_SPE`, `1_GEN` (enseignement scientifique de 1re, partie maths), `1_TECHNO`, `T_SPE`,
`T_COMP` (maths complémentaires), `T_EXP` (maths expertes), `T_TECHNO`.

## Entrées

- `../releves/<template_id>.json` : ce que le modèle génère réellement (300 tirages par variation, plages, natures,
  format, exemples). Les plages relevées font foi, pas le titre.
- `lots.csv` : les modèles de chaque lot, avec leurs tags actuels.
- `../bornes/<programme>.json` (`2de`, `1spe`, `1gen`, `1techno`, `tspe`, `tcomp`, `texp`, `ttechno`) : bornes
  générales (`general`) et bornes propres de chaque point (`points`, avec libellé et rubrique). Validées par David
  (étape b, close le 2026-10-23). Les bornes de force `décision` sont des choix de David : elles priment. L'en-tête
  de `../bornes/<programme>.md` dit de quel programme celui-ci hérite (la 1re hérite de la 2de, etc.) : les bornes
  héritées s'appliquent aussi.
- `../bornes/points-lycee.csv` : les 1 507 points (grade, code, rubrique, libellé, nœud).
- `../../../adr/0020-arbre-central-programmes-pointeurs.md`, § Décision, point 7 : principes (BO immuable,
  hors-programme dans l'arbre, un point par programme au plus, point sur le nœud du modèle ou sa notion).

Les tags actuels (étape 2 de l'ancien chantier) sont antérieurs aux principes du 2026-10-17 : une piste, pas une
vérité.

## Méthode, pour chaque modèle

1. Lire titre, sous-titre, consigne, déclarations des variables, plages relevées, format, exemples.
2. Chercher, dans **chaque programme** où la tâche peut exister, les points qui la décrivent (tag actuel d'abord, puis
   les voisins de la même rubrique ou du même nœud). Un point de vocabulaire ou d'une technique voisine ne compte pas.
3. Confronter chaque variation à toutes les bornes du point et du programme : fonctions admises, formes (développée,
   factorisée, canonique), nature des coefficients, notations (Σ, intervalles, limites), outils (calculatrice,
   logiciel), contexte. Lire le **sens** de la tâche, pas les mots-clés.
4. Verdict, par (modèle, programme) :
   - `TAG` : un point, toutes les variations dedans ;
   - `TAG_PAR_VARIATION` : dans ce programme, les variations relèvent de points différents (les lister) ; à
     signaler, un modèle ne porte qu'un point par programme ;
   - `MODIFIER` : un point convient presque ; dire exactement quoi changer (plage d'une variable, contrainte,
     variation à retirer) ;
   - `HORS_PROGRAMME` : aucun point de ce programme ne le décrit ;
   - `A_TRANCHER` : vraie hésitation, à poser à David avec des options.
5. Justifier en une ou deux phrases avec les chiffres ou les formes (« coefficient de x² égal à 3 tiré, borne
   décision l1s-2 : b/(2a) entier ou demi-entier »).

**Lignes à écrire** : pour chaque modèle, toujours une ligne pour le programme de son niveau (pour `T_SPE,T_COMP` :
une ligne pour chacun des deux) ; pour les autres programmes, une ligne seulement si le verdict est `TAG`, `MODIFIER`,
`TAG_PAR_VARIATION` ou `A_TRANCHER`. Un modèle sans aucun point (les 12 `SANS_POINT`) reçoit le même examen.

## Sortie

Un CSV `<lot>.csv`, séparateur `;`, champs entre guillemets s'ils contiennent `;`, colonnes :
`template_id;grades;titre;sous_titre;programme;verdict;code;libelle_point;variations_hors;modification;justification;tags_actuels`.
Écrire au fil de l'eau (reprise après crash). Un `<lot>-notes.md` pour les `A_TRANCHER` : une entrée par question
(modèle, exemple concret tiré du relevé, options, reco), écrite pour être lue seule, avec les libellés des points
(pas seulement les codes).
