# Relevé « Algèbre » de 6e (2026-11-28)

Chantier [`idees-6e-algebre`](idees-6e-algebre-progress.md). 9 exercices de la rubrique 6N4 d'une autre
plateforme (anciennes versions exclues), lus dans leur code source, comparés à nos modèles de tous les
niveaux en prod (lecture seule). Relevé par deux agents. Trois affirmations ont été vérifiées dans le
code : les quatre niveaux de balances et leurs quadruplets (6N4A-3, l. 56-81), les effectifs de 2 à 10
de 6N4A-4 (l. 63-64), et les cases de 6N43-1, qui montrent bien les termes `u0 + i × raison` et non les
rangs (l. 42-44, l'agent s'était trompé). Les ids sont ceux de la plateforme.

Points de 6e en prod : **6-142** « utiliser des modèles pré-algébriques (schémas en barre) pour résoudre
des problèmes algébriques », 8 modèles ; **6-143** « identifier la structure d'un motif évolutif »,
1 modèle (39bafe0e, étapes 4 à 20). Points voisins : CM1-062, 063, 065, 066 ; CM2-065, 066, 068, 069,
070 (motifs évolutifs : 4baa1364, 3ffa86cd, 6223743f) ; 6-123 (division euclidienne). **Aucun point,
à aucun niveau, pour un motif répétitif** (frise périodique) : le BO de 6e ne parle que de motifs
évolutifs (`cycle-3/6-nombres.md`, § Algèbre).

Blocs utiles déjà là : ` ```schema-barres ` (barres, `?`, accolades, `total :`, lisible dans une case
choix), ` ```cubes ` (assemblage de cubes, affichage et gestes de vues), ` ```figure ` (motifs
d'allumettes et de jetons de 39bafe0e).

| Id     | Ce qu'on demande                                                                                                                                                                                                   | Forme de réponse                                | Modèle(s) Chiphre                                                                   | Verdict                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 6N4A-1 | 8 problèmes à une étape (tout, partie, produit, part, nombre de parts, comparaison) : associer chacun à un schéma A à H, ou écrire l'opération sans calculer (« 56 gommes avec mes 7 amis » → ÷ 8)                 | lettre du schéma, ou expression `32+7`          | a9c37578 (6-142, choisir le schéma : total et écart seulement), d79ea0bc, 2af325bb  | 🟡 le choix du schéma ne couvre qu'un type d'énoncé ; « quelle opération ? » sans calculer n'existe pas |
| 6N4A-2 | Énoncé à trous + schéma figé : retrouver les nombres pour que l'énoncé, le schéma et la réponse se correspondent (3 achats, triathlon ×15 et ×5, partie manquante d'une somme de trois, partage avec reste)        | plusieurs cases                                 | aucun dans ce sens (schéma → énoncé)                                                | ❌ lire un schéma pour compléter un énoncé                                                              |
| 6N4A-3 | Deux pesées de fruits : masse de chaque fruit ; 4 niveaux (soustraction ; soustraction puis division ; multiplier une pesée puis soustraire ; les trois) ; option masses en kg                                     | deux cases en g ou kg                           | a06458ad (6-142 : niveaux 2 à 4, masses au dixième), d962df2c (CM2), b28c7f78 (CM1) | ✅ ; manquent les pesées en kg (décimaux à trois chiffres)                                              |
| 6N4A-4 | « Têtes et pattes » : lapins et poules, avions et voitures, triangles et quadrilatères, dromadaires et chameaux, fleurs (pétales), pièces (1 c à 2 €) ; effectifs de 2 à 10 ; correction par essais et ajustements | deux cases                                      | 4048d9c5 v0 (6-142 : billets de 5 € et 10 €)                                        | 🟡 même structure, un seul contexte, entiers                                                            |
| 6N4A-5 | Choisir l'un des six schémas (additif ou multiplicatif ; parties-tout, comparaison, comparaison avec total), le compléter, puis répondre                                                                           | schéma construit (JSON) + phrase à compléter    | 6-142 : 399342ff, d79ea0bc, e97ca3dd, 2af325bb, 4c967bde (résoudre, schéma donné)   | ✅ pour résoudre ; construire le schéma = outil n° 32, reporté par David le 2026-11-12                  |
| 6N4B-1 | Frise de pictogrammes répétée (période 2 à 8, avec ou sans symétrie, sous-série) : forme suivante, longueur du motif, forme d'un rang lointain (4L + 1 à 10L), forme n° 42                                         | QCM des formes, nombre                          | aucun, à aucun niveau                                                               | ❌ motif répétitif ; le rang lointain passe par le reste de la division euclidienne                     |
| 6N4B   | Catalogue de motifs 2D et 3D affines (difficulté par le nombre de formes de l'étape 4) : dessiner l'étape suivante, nombre d'éléments à l'étape suivante, 10, 11 à 100, 100                                        | nombre ; dessin (éditeur de grille ou de cubes) | 39bafe0e (6-143 : étapes 4 à 20, inverse), 4baa1364, 3ffa86cd, 6223743f (CM2)       | 🟡 manquent l'étape 100 et les motifs de cubes en 6e ; dessiner l'étape suivante : pas d'outil          |
| 6N4B-2 | Motifs de cubes en 3D : nombre de cubes à l'étape suivante, 10, 100 ; à quelle étape le motif a N cubes (rang 20 à 80) ; dessiner l'étape suivante                                                                 | nombre ; empilement de cubes                    | aucun motif de cubes ; 39bafe0e v3 (inverse, jetons)                                | 🟡 ` ```cubes ` affiche les étapes ; construire l'empilement : pas d'outil                              |
| 6N43-1 | Suite à pas constant (raison 2 à 8, début 2 à 9) : X et Y sont-ils dans la suite ? (X − début multiple de la raison) ; rangs 100 à 209 ou 2 000 à 9 099 ; option : suite montrée à partir d'un rang k              | QCM à quatre combinaisons (oui-oui, oui-non…)   | 1b122322 (CM2-068, terme éloigné), 4d75350c (CM2)                                   | ❌ appartenance à une suite ; le QCM oui / non est en partie au hasard                                  |

## Ce que leur format fait et pas le nôtre

- **Construire l'étape suivante d'un motif** (6N4B, 6N4B-2) : poser des formes sur une grille, ou empiler
  des cubes. Chez nous, ` ```cubes ` `dessiner:` dessine une vue, pas un empilement. Question Q1 de la
  phase 0.
- **Construire et compléter un schéma en barres** (6N4A-2, 6N4A-5) : outil n° 32, déjà noté, reporté.
</content>

</invoke>
