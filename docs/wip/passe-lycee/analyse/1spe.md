# Passe des points — 1re spécialité (`1_SPE`, 165 points)

Texte : `bo/1spe.txt` (667 lignes, relu en entier, Automatismes l. 244-288 compris). Détail ligne à ligne :
[1spe.tsv](1spe.tsv) (64 lignes ; chaque citation vérifiée par script contre le texte extrait).

## Bilan

| Question                               | Propositions                                                                                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1a (puce qui réunit plusieurs savoirs) | **31 coupes → +42 points**                                                                                                                                                                  |
| 1b (deux gestes, une partie évaluable) | **6 coupes → +6 points** (256, 280, 283, 332, 333, 341)                                                                                                                                     |
| 2 (familles)                           | famille donnée ligne à ligne ; **9 coupes alignent la 1re spé** sur des jumeaux déjà coupés (211, 213, 216, 244, 256, 261, 283, 292, 327) ; les autres entraînent 1re techno, 1re gén., Tle |
| 3 (doublons)                           | 0 doublon net ; 1 cas à trancher (1SPE-301) ; 1SPE-209/210 vérifiés : pas un doublon                                                                                                        |
| 4 (automatismes)                       | 2 points ⚙ neufs, 1 ⚙ à trancher, 5 cibles de 2de à couper, 2 cibles à ajouter                                                                                                              |
| Non-coupes argumentées                 | 9 GARDER, 8 A_TRANCHER                                                                                                                                                                      |

Si tout est accepté : 165 → **213 points** (+ 2 ou 3 ⚙). **65 tags** de prod à répartir sur les moitiés (les
plus chargés : 213 et 292 : 7, 283 : 6, 223, 244, 248 : 5).

## Retours sur des décisions du seed (2026-10-08) — à confirmer

La grille du 2026-10-22 (« 1a : on coupe toujours ») contredit des non-coupes du seed ; proposées en COUPER :

- **1SPE-264** dérivées de carré, cube, inverse, racine carrée (×4) — c'est l'exemple même de la méthode ;
  avec 1SPE-277 (démonstration ×2) et 1TECHNO-073.
- **1SPE-230** suite arithmétique / géométrique (« le geste est le choix du modèle ») ; 1TECHNO-042 reste entier.
- **1SPE-283** variations / extrémums ; **1SPE-292** signe / variations / courbe de exp (1GEN-034/035 et
  TTECHNO-032/033 sont déjà séparés) ; **1SPE-305** valeurs remarquables à part.

## Questions pour David

1. **Variance et écart type** (1SPE-350, 357) : un point ou deux ? Reco : **un** (σ = √V, tout modèle « σ » passe
   par V). 1SPE-359 suit (2 ou 3 points).
2. **Arbre ou tableau** (1SPE-342) : couper comme en 2de (2-393/2-394) ? Reco : **oui** pour la capacité, garder
   le contenu 1SPE-338 entier. Le seed avait refusé.
3. **Stratégies de factorisation** (1SPE-253) : reco **garder** (le BO vise la diversité des stratégies).
4. **Partition de l'univers** (1SPE-337) : reco **garder** (sinon un point « partition » peu questionnable),
   comme TTECHNO-055.
5. **1SPE-301** (approfondissement « exp(x + y) = exp(x)exp(y) ») répète l. 483 mot pour mot : reco **garder**
   (c'est la démonstration, même statut que 300 et 302) ; archiver si tu y vois un doublon du BO.
6. **1SPE-221** (registres d'une suite) : libellé V2 non littéral ; couper en algébrique ↔ graphique (garde le
   code et ses 3 modèles, tous graphiques) / langue ↔ algébrique ? Reco : **oui**.
7. **1SPE-363** (lire / écrire une fonction Python) : reco **garder** tant qu'aucun modèle n'exécute de Python.
8. **Automatismes, l. 274-277** (même texte en 1re gén. et 1re techno) :
   - « Déterminer graphiquement le signe d'une fonction » n'a pas de point (2-329 = signe des fonctions de
     référence) → **⚙** ; « tracer une droite par un point et son coefficient directeur » → **⚙**.
   - « Coefficient directeur à partir de deux points » : ⚙ (reco) ou 2-314 « à partir de deux points » suffit ?
   - Un ⚙ **par programme de 1re** (1SPE, 1GEN, 1TECHNO), puisque la 1re gén. ne référence jamais la 1re spé ?
     Reco : oui, trois jumeaux. La Tle techno (l. 427-430) viserait celui de 1re techno.
   - Ajouter aux cibles **3-045 et 3-067** (« lire graphiquement l'équation réduite ») et **2-395**
     (« distinguer P(A ∩ B), P_A(B) »).
   - Cibles de 2de à couper pour une référence précise : 2-336 (équation / inéquation), 2-316 (réduite /
     cartésienne), 2-315 (pente / vecteur directeur), 2-314 (×3), 2-372 (histogramme / polygone). **À
     coordonner avec la passe 2de**, qui doit les reprendre avec leur famille.

## Écarts relevés, hors des quatre questions (rien proposé)

- Points absents du texte littéral, gardés par décision S1 (2026-10-08) : 1SPE-243 (forme développée),
  247 (sommet, axe), 250 (inéquation du second degré). Libellés reformulés par V2 : 221, 354, 364.
- Petits écarts de libellé : 1SPE-220 « ou **de** l'absence » (BO : « ou l'absence ») ; 1SPE-281 « et **le**
  signe » (BO : « et signe »).
- Lignes du BO sans point, tranchées au seed : l. 348 (« Proposer, modéliser… »), l. 552, l. 574.
