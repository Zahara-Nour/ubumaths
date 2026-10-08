# Relecture des articles du Shtam — progression

Relecture par David, article par article, dans l'ordre de parution. Un commit par article validé.
Branche `relecture/shtam` (worktree `ubumaths-wt-relecture`).

| #   | Date       | Article                                                                                         | État                                                                                                                                                                                    |
| --- | ---------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2026-09-21 | Pythagore dans la vie courante (`pythagore-vie-courante`)                                       | ✅ validé — titre et texte réécrits par David, armoire couchée sur le dos, écran en pouces, corde à 13 nœuds, 2 illustrations SVG                                                       |
| 2   | 2026-09-25 | π transcendant le mardi (`pi-transcendant-le-mardi`)                                            | ✅ validé — titre au conditionnel, réplique de Mère Ubu (tartes), décimales « jamais périodiques », aire du disque πr²                                                                  |
| 3   | 2026-09-29 | Division par zéro en Nombrilie (`nombrilie-division-par-zero`)                                  | ✅ validé — « Erreur mathématique », Galopin qui veut recommencer, experts (limites ±∞) et forme indéterminée 0/0                                                                       |
| 4   | 2026-10-02 | Le Czar et π arrondi à 3 (`czar-alexis-pi-arrondi`)                                             | ✅ validé — palais d'Hiver (plus de Moscou), Sandomir au Trône Royal, impôt sur les tonneaux, arrondi/valeur par excès, roues, loi de l'Indiana (1897)                                  |
| 5   | 2026-10-05 | Le triangle porte plainte (`bedonstan-triangle-plainte`)                                        | ✅ validé — titre « abus de norme » (David), Achras « se courber pour négocier », triplets pythagoriciens, inégalité triangulaire, Pythagore faux hors du plan                          |
| 6   | 2026-10-08 | Douze Pile d'affilée (`pifometrie-pile-ou-face`)                                                | ✅ validé — « la maison gagne toujours », loi binomiale, planche de Galton (illustration SVG), pièce soupçonnée truquée                                                                 |
| 7   | 2026-10-12 | Le Polonais moyen a moins de deux jambes (`pifometrie-moyenne-des-jambes`)                      | ✅ validé — exemple des jambes gardé (David), plan de Mère Ubu explicite (moyenne à 2,999), valeurs extrêmes                                                                            |
| 8   | 2026-10-15 | L'Hôtel de l'Infini (`yoyolande-hotel-de-l-infini`)                                             | ✅ validé — réécrit autour d'un seul client de plus (n → n+1), hôtel fini de 100 chambres en contre-exemple, Dedekind                                                                   |
| 9   | 2026-10-19 | 0,999… = 1 (`nombrilie-zero-virgule-neuf`)                                                      | ✅ validé — « une infinité de 9 » (pas « beaucoup »), chute « il me manque tout », le petit bout plus petit que 0,1 ; 0,01… ; « aux dépens » gardé (David)                              |
| 10  | 2026-10-22 | Les rails de Sandomir (`bedonstan-rails-de-sandomir`, ex-`bedonstan-paralleles-se-rencontrent`) | ✅ validé — réécrit : rails + chef de gare, géométrie de l'œil ; vrai du faux Euclide / projective / sphère / Lobatchevski + 3 SVG                                                      |
| 11  | 2026-10-26 | Le paradoxe du barbier (`patatovie-barbier-paradoxe`)                                           | ✅ validé — barbe retirée, une joue rasée (problème sur les deux), décret de Faustroll « dans quel sens », nouvelle vitrine « hier » (un jour sur deux)                                 |
| 12  | 2026-10-29 | La machine qui dit « ha ha » (`glitchistan-ha-ha`)                                              | ✅ validé — Galopin qui lit les deux lignes (« hypothèse audacieuse »), « attendre ne prouve rien », point Turing reformulé                                                             |
| 13  | 2026-11-02 | La marge de Fermat (`fermat-marge-trop-petite`)                                                 | ✅ validé — une seule page commandée vs 100 pages de Wiles, étudiant « laissée au lecteur », mathématicien « fausse », Mère Ubu réclame la dette ; titre « la page aussi »              |
| 14  | 2026-11-05 | La règle des signes (`nombrilie-regle-des-signes`)                                              | ✅ validé — Échelle de Loyauté (−2, −3 → +6), « additionner leurs forces », auto-dénonciation, bal des opposants par deux, complots en nombre impair (+ vrai du faux), chapô Quatr'esme |
| 15  | 2026-11-09 | Les soldes de Mère Ubu (`nombrilie-soldes-mere-ubu`)                                            | ✅ validé — titre « comptaient sur / comptait mieux », thermes d'Empoche-les-Bains, parade « moins puis plus » chiffrée (8 → 4 → 6), l'ordre ne change rien                             |
| 16  | 2026-11-12 | Le camp du Capitaine Bordure (`bedonstan-camp-de-bordure`)                                      | ✅ validé — titre « découvre la géométrie / découvre la facture », soupe sans contradiction, chute « économies d'échelle » + dormir debout, vrai du faux k = ½                          |

## Outillage ajouté pendant la relecture

- Illustrations : fichiers SVG dans `static/shtam/`, insérés par `![texte](/shtam/fichier.svg){size=large}`.
- Moteur Markdown (`ImageDisplay`) : un chemin qui commence par `/` (pas `//`) désigne un fichier du site.

## Note

- La barre des racines `\sqrt{…}` en ligne apparaît décalée d'une ligne vers le haut, en local ET en production, avec ou sans images (constaté le 2026-10-06). Bug de rendu à traiter à part (PR dédiée), hors relecture.
