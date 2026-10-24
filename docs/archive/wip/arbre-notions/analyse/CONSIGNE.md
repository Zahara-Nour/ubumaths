# Analyse des modèles contre les bornes (C5, étape 2 bis)

Consigne commune aux agents d'analyse (2026-10-18).

## But

Pour chaque modèle du lot, dire à quel point de son programme il peut être tagué, en
**inclusion stricte** : chaque question que le modèle peut générer doit rester dans les bornes
du point. Une seule question hors bornes suffit à refuser le tag. Une couverture partielle du
point est acceptée (le modèle n'a pas à couvrir tout le point).

## Entrées

- `../releves/<template_id>.json` : ce que le modèle génère réellement (300 tirages par
  variation, plages, natures, format, exemples). `../releves/index.csv` : l'index.
- `../bornes/cycle{2,3,4}.json` : bornes générales du niveau + bornes propres de chaque point
  (forces BO, accompagnement, déduite, décision). Toutes validées par David le 2026-10-18.
- `../c5-lot-2bis-v2.csv` : la proposition précédente (point candidat, décision R1/R3…),
  faite trop vite. Elle sert de piste, pas de vérité.
- `../../../adr/0020-arbre-central-programmes-pointeurs.md` §7 : principes (BO immuable,
  hors-programme dans l'arbre, un point par programme au plus, point sur le nœud du modèle ou
  sa notion).

## Méthode, pour chaque modèle

1. Lire titre, sous-titre, consigne, déclarations des variables, plages relevées, format,
   exemples. Les plages relevées font foi, pas le titre.
2. Chercher les points du niveau du modèle qui décrivent sa tâche (le candidat du CSV d'abord,
   puis les voisins de la même rubrique ou du même nœud). Un point de vocabulaire ou d'une
   technique voisine ne compte pas.
3. Confronter chaque variation à toutes les bornes du point et du niveau : taille des nombres,
   opérandes, nature (entier, décimal, fraction, négatif), retenue, format (symboles, trou,
   QCM), contexte. Lire le **sens** : « ajouter 9 » n'est pas « calculer 9 + 47 posé ».
4. Verdict par modèle :
   - `TAG` : un point, toutes les variations dedans ;
   - `TAG_PAR_VARIATION` : les variations relèvent de points différents (lister) — à signaler,
     un modèle ne porte qu'un point par programme ;
   - `MODIFIER` : un point convient presque ; dire exactement quoi changer dans le modèle
     (plage d'une variable, contrainte, variation à retirer) pour qu'il rentre ;
   - `HORS_PROGRAMME` : aucun point ne le décrit, il reste dans l'arbre sans tag ;
   - `A_TRANCHER` : vraie hésitation, à poser à David avec les options.
5. Justifier en une ou deux phrases avec les chiffres (« réponse jusqu'à 1 839 > 1 000,
   borne générale CE1 »).

## Sortie

Un CSV `analyse/<lot>.csv`, séparateur `;`, colonnes :
`template_id;grade;titre;sous_titre;verdict;code;libelle_point;variations_hors;modification;justification;ancien_csv`
(`ancien_csv` = décision et code de c5-lot-2bis-v2.csv, pour voir les écarts).
Écrire au fil de l'eau (reprise après crash). Un `analyse/<lot>-notes.md` pour les questions
A_TRANCHER (une par entrée : modèle, exemple concret, options, reco).
