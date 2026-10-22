# Bornes des points de Terminale, mathématiques complémentaires (T_COMP)

Objectif : pour chaque point de programme actif de l'option mathématiques complémentaires (`grade` = `T_COMP`), dire jusqu'où vont les questions générées (« seulement »), pour juger ensuite qu'un modèle reste entièrement dans le point. 178 points lus dans `points-lycee.csv` (base locale, empreinte identique à la prod le 2026-10-22). Données : `tcomp.json` ; incertitudes : `questions-tcomp.json` (`ltc-N`).

## Sources et façon de citer

| Abréviation       | Document                                                                                                           | Page citée  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ | ----------- |
| **BO Tle compl.** | Programme de l'option de mathématiques complémentaires de terminale, BO n° 14 du 2026-04-02 (`bo/tcomp.txt`)       | page du PDF |
| **BO 1re spé**    | Programme de spécialité de 1re, programme suivi l'année précédente (`bo/1spe.txt`), cité seulement pour l'héritage | page du PDF |
| **BO 2de**        | Programme de 2de (`bo/2de.txt`), cité seulement pour l'héritage                                                    | page du PDF |

**Force** : `BO` = écrit dans le programme ; `déduite` = ma lecture d'un texte implicite (toujours expliquée dans la remarque ⚠ du point, ou dans la borne même pour les bornes générales). Aucun document d'accompagnement n'est disponible pour ce programme : aucun n'est cité.

Le programme a deux volets : neuf **thèmes d'étude** (au moins six traités, problèmes « possibles », non exhaustifs) et les **contenus et capacités attendues**, qui font la borne. Un thème ne sert de source que lorsqu'il précise un contenu (formule de Bayes, rang du premier succès de la loi géométrique, formes des intervalles de fluctuation, déciles). Le reste des thèmes (Lorenz, Gini, tests médicaux, Verhulst…) est en question (ltc-7).

## Ce qui est le plus utile pour la vérification « seulement »

- **Fonctions** : six fonctions de référence (carré, cube, racine carrée, inverse, exp, ln), plus les polynômes de 1re spé ; **pas de cos ni de sin** comme fonctions.
- **Dérivées** : opérations de 1re spé et **seules compositions f(ax + b), e^{u}, ln u, u²** ; pas de √u (u non affine), pas de uⁿ (n ⩾ 3).
- **Primitives** : dérivées connues lues à l'envers et **formes 2uu', e^{u}u', u'/u** seulement (u > 0, pas de ln |u|).
- **Limites** : approche intuitive ; limites des fonctions de référence et opérations admises ; **pas de croissances comparées au BO** (ltc-1) ; asymptotes horizontales et verticales seulement.
- **Suites** : limite d'une suite géométrique de **raison positive** seulement ; somme pour 0 ⩽ q < 1 ; arithmético-géométriques par la solution constante (limite seulement si a ⩾ 0, lecture déduite).
- **Logarithme** : réciproque de exp, sur ]0, +∞[ ; ln(ab), ln(1/a), ln(qⁿ) = n ln q ; seuil par ln.
- **Équations différentielles** : résolution de y' = ay et y' = ay + b seulement ; non linéaire (logistique) admise en vérification, sans connaissance exigible ; ordre 2 en question (ltc-6).
- **Intégrale** : définie pour f continue positive sur [a, b] (aire) ; signe quelconque en présentation ; calcul par F(b) − F(a) avec les primitives du programme.
- **Lois** : uniforme discrète, Bernoulli, binomiale, géométrique (rang du premier succès, k ⩾ 1) ; uniforme sur [a, b], exponentielle (espérance, pas de variance) ; **pas de loi normale** ; coefficients binomiaux par le triangle de Pascal, **pas de formule factorielle** ; binomiale calculée à la calculatrice (ltc-2).
- **Statistique à deux variables** : point moyen, droite des moindres carrés (calculatrice, logiciel ou calcul), changement de variable vers l'affine ; coefficient de corrélation sans capacité de calcul (ltc-4).
- **Notations** : Σ pour écrire, jamais pour calculer ; ∀ et ∃ non exigibles.

## Ce qui change par rapport à la 1re spécialité

1. **Schéma de Bernoulli** : la 1re spé se limitait à n ⩽ 4 ; la Tle compl. ne borne plus n (lecture déduite).
2. **Logique** : la liste de Tle compl. est plus courte (négation sans quantificateurs, ni contraposée ni condition nécessaire / suffisante) que celle de la 1re spé ; contradiction apparente avec l'héritage, en question (ltc-10).
3. **Limites** : la 1re spé ne faisait que conjecturer la limite d'une suite ; la Tle compl. ajoute les opérations (admises), le passage à la limite dans les inégalités, les gendarmes, les limites de fonctions, toujours sans formalisation.
4. **Fonctions** : ln s'ajoute ; aucune fonction trigonométrique n'arrive.

## Questions en attente

- **ltc-1** — Croissances comparées absentes du BO (TCOMP-230, TCOMP-378, TCOMP-231) : recommandation « donnee ».
- **ltc-2** — Probabilités binomiales à la main (TCOMP-290, TCOMP-297, TCOMP-303) : recommandation « petit_n ».
- **ltc-3** — Densités sur [0, +∞[ (intégrales sur un intervalle non borné) (TCOMP-310, TCOMP-312, TCOMP-314, TCOMP-315, TCOMP-316, TCOMP-371, TCOMP-376) : recommandation « limite ».
- **ltc-4** — Coefficient de corrélation : calcul par formule ? (TCOMP-322, TCOMP-327) : recommandation « lecture ».
- **ltc-5** — Convention de calcul des déciles (TCOMP-202, TCOMP-331) : recommandation « comme_quartiles ».
- **ltc-6** — Vérifier une solution d'une équation différentielle d'ordre 2 (TCOMP-250, TCOMP-245) : recommandation « ordre1 ».
- **ltc-7** — Notions des thèmes d'étude absentes du volet « contenus » (TCOMP-302, TCOMP-224, TCOMP-280, TCOMP-281, TCOMP-324, thèmes d'étude) : recommandation « habillage ».
- **ltc-8** — Fonctions réciproques : seulement les couples illustrés ? (TCOMP-223, TCOMP-340) : recommandation « toute ».
- **ltc-9** — Produit cartésien : dénombrer ? (TCOMP-330, TCOMP-201) : recommandation « notion ».
- **ltc-10** — Logique : liste de la Tle compl. plus courte que celle de la 1re spé (bornes générales de T_COMP) : recommandation « heritage ».

## Terminale, mathématiques complémentaires (178 points, 131 avec une borne propre)

Bornes : 118 `BO` et 28 `déduite` sur les points ; 8 `BO` et 1 `déduite` en bornes générales.

### Bornes générales (héritées par tous les points)

Ce qui vient de la 2de et de la 1re spécialité n'est pas recopié, sauf lorsque la Tle compl. le change.

- Fonctions de référence : carré, cube, racine carrée, inverse, exponentielle, logarithme népérien. Le logarithme est la seule famille nouvelle ; polynômes du second degré, x ↦ xⁿ (n ∈ ℤ) et t ↦ e^{at} viennent de la 1re spécialité. — _BO Tle compl. p.9 ; BO 1re spé p.7-8_ (BO)
- Pas de fonctions trigonométriques (x ↦ cos x, x ↦ sin x) : la 1re spécialité ne voit que le cosinus et le sinus d'un réel sur le cercle, et la Tle compl. ne les ajoute pas aux fonctions de référence. — _BO Tle compl. p.9 ; BO 1re spé p.8_ (déduite)
- Compositions : seulement x ↦ f(ax + b), x ↦ e^{u(x)}, x ↦ ln u(x), x ↦ u(x)², en plus des opérations de 1re spé (somme, produit, inverse, quotient). — _BO Tle compl. p.9_ (BO)
- Limites et continuité : approche intuitive. La formalisation de la limite n'est pas un attendu ; les opérations sur les limites sont admises ; composition des limites et théorèmes de comparaison seulement « en contexte » ; on admet qu'une fonction dérivable sur un intervalle est continue. — _BO Tle compl. p.8-9_ (BO)
- Équations différentielles : la résolution se limite aux équations linéaires du premier ordre à coefficients constants (y' = ay, y' = ay + b). Une équation non linéaire (logistique) peut apparaître, sans aucune connaissance exigible à son sujet. — _BO Tle compl. p.9_ (BO)
- Lois de probabilité au programme : uniforme sur {1, …, n}, Bernoulli, binomiale, géométrique ; à densité : uniforme sur [a, b], exponentielle. Aucune autre (la loi normale n'y figure pas). — _BO Tle compl. p.11_ (BO)
- Le symbole Σ sert à écrire concisément ; son emploi comme outil de calcul n'est pas un objectif. — _BO Tle compl. p.3_ (BO)
- Symboles ∀ et ∃ non exigibles ; complémentaire noté Ā ou E \ A ; cardinal noté Card(A). — _BO Tle compl. p.3_ (BO)
- Algorithmes écrits en langage naturel (affectation notée ←) ou en Python ; aucune notion d'algorithmique nouvelle par rapport à la 2de et à la 1re (variable, type, affectation, instruction conditionnelle, boucle, fonction, liste). — _BO Tle compl. p.12_ (BO)

### Vocabulaire ensembliste et logique

- **TCOMP-201** — Notion de couple, de triplet et plus généralement de $n$-uplet. — _hérite des bornes générales_
  - ⚠ Vocabulaire transversal : le BO (p.3) ne dit rien au-delà de la notion ; hérite des bornes générales.
- **TCOMP-330** — Notion de produit cartésien. — _hérite des bornes générales_
  - ⚠ Le BO (p.3) donne la notion et la notation Card(A), mais aucune règle de dénombrement (Card(E × F) = Card E × Card F, nombre de n-uplets) : voir ltc-9.

### Thèmes d'étude > Répartition des richesses, inégalités

- **TCOMP-202** — Statistique descriptive : caractéristiques de dispersion — déciles.
  - Déciles d'une série statistique (répartition de richesses, de salaires), en prolongement de la médiane et des quartiles de 2de ; convention de calcul non fixée par le BO (ltc-5). — _BO Tle compl. p.5-6_ (BO)
  - ⚠ Point tiré des « contenus associés » d'un thème d'étude, exigence d'approfondissement. Convention des déciles : ltc-5.
- **TCOMP-331** — Statistique descriptive : caractéristiques de dispersion — rapport interdécile.
  - Rapport interdécile = D9 / D1 (quotient, à ne pas confondre avec l'écart interdécile D9 − D1). — _BO Tle compl. p.6_ (déduite)
  - ⚠ Lecture déduite : le BO nomme le rapport interdécile sans le définir ; le sens usuel (INSEE) est le quotient D9/D1. Point tiré d'un thème d'étude, exigence d'approfondissement.

### Analyse > Suites numériques, modèles discrets

- **TCOMP-203** — Approche intuitive de la notion de limite, finie ou infinie, d'une suite.
  - Approche intuitive, sur des exemples (calculs numériques, graphiques) ; aucune définition formelle de la limite. — _BO Tle compl. p.8-9_ (BO)
- **TCOMP-204** — Approche intuitive des opérations sur les limites.
  - Opérations sur les limites admises, utilisées sans démonstration. — _BO Tle compl. p.8-9_ (BO)
- **TCOMP-332** — Approche intuitive du passage à la limite dans les inégalités.
  - Approche intuitive : résultat admis et utilisé, sans démonstration. — _BO Tle compl. p.8_ (BO)
- **TCOMP-205** — Approche intuitive du théorème des gendarmes.
  - Approche intuitive : théorème admis et utilisé, sans démonstration. — _BO Tle compl. p.8_ (BO)
- **TCOMP-206** — Limite d'une suite géométrique de raison positive.
  - Raison positive seulement (q ⩾ 0) : pas de suite géométrique de raison négative. — _BO Tle compl. p.8_ (BO)
- **TCOMP-207** — Limite de la somme des termes d'une suite géométrique de raison positive strictement inférieure à $1$.
  - Raison q avec 0 ⩽ q < 1 ; limite de la somme des termes u₀ + u₁ + … + uₙ. — _BO Tle compl. p.8_ (BO)
- **TCOMP-208** — Suites arithmético-géométriques.
  - Limite d'une suite arithmético-géométrique uₙ₊₁ = a uₙ + b seulement si a ⩾ 0 (la suite géométrique associée doit avoir une raison positive). — _BO Tle compl. p.8_ (déduite)
  - ⚠ Lecture déduite : le BO ne donne la limite que pour une suite géométrique de raison positive ; la limite d'une suite arithmético-géométrique passe par la suite géométrique uₙ − ℓ de raison a, donc a ⩾ 0.
- **TCOMP-377** — Modéliser un problème par une suite donnée par une formule explicite ou une relation de récurrence.
  - Suite donnée par une formule explicite ou par une relation de récurrence (dont arithmético-géométrique). — _BO Tle compl. p.8_ (BO)
- **TCOMP-209** — Calculer une limite de suite géométrique.
  - Raison positive seulement (q ⩾ 0) : pas de suite géométrique de raison négative. — _BO Tle compl. p.8_ (BO)
  - Limite d'une suite arithmético-géométrique uₙ₊₁ = a uₙ + b seulement si a ⩾ 0 (la suite géométrique associée doit avoir une raison positive). — _BO Tle compl. p.8_ (déduite)
  - ⚠ Lecture déduite : le BO ne donne la limite que pour une suite géométrique de raison positive ; la limite d'une suite arithmético-géométrique passe par la suite géométrique uₙ − ℓ de raison a, donc a ⩾ 0.
- **TCOMP-210** — Calculer la limite de la somme des termes d'une suite géométrique de raison positive et strictement inférieure à $1$.
  - Raison q avec 0 ⩽ q < 1 ; limite de la somme des termes u₀ + u₁ + … + uₙ. — _BO Tle compl. p.8_ (BO)
- **TCOMP-211** — Représenter graphiquement une suite donnée par une relation de récurrence $u_{n+1} = f(u_n)$ où $f$ est une fonction continue d'un intervalle $I$ dans lui-même.
  - Récurrence uₙ₊₁ = f(uₙ) avec f continue d'un intervalle I dans lui-même. — _BO Tle compl. p.8_ (BO)
- **TCOMP-212** — Conjecturer le comportement global ou asymptotique d'une suite donnée par une relation de récurrence $u_{n+1} = f(u_n)$.
  - Récurrence uₙ₊₁ = f(uₙ) avec f continue d'un intervalle I dans lui-même. — _BO Tle compl. p.8_ (BO)
  - Conjecture seulement (comportement global ou asymptotique) : aucune preuve exigée. — _BO Tle compl. p.8_ (BO)
- **TCOMP-213** — Pour une récurrence arithmético-géométrique : rechercher une suite constante solution particulière.
  - Suite constante ℓ solution de ℓ = aℓ + b, donc a ≠ 1. — _BO Tle compl. p.8_ (déduite)
  - ⚠ Lecture déduite : une solution constante n'existe (en général) que pour a ≠ 1 ; le BO ne l'écrit pas.
- **TCOMP-214** — Pour une récurrence arithmético-géométrique : utiliser une suite constante solution particulière pour déterminer toutes les solutions.
  - Toutes les solutions par la suite géométrique uₙ − ℓ : uₙ = ℓ + (u₀ − ℓ)aⁿ. — _BO Tle compl. p.8_ (déduite)
  - Limite d'une suite arithmético-géométrique uₙ₊₁ = a uₙ + b seulement si a ⩾ 0 (la suite géométrique associée doit avoir une raison positive). — _BO Tle compl. p.8_ (déduite)
  - ⚠ Lecture déduite : la forme uₙ = ℓ + (u₀ − ℓ)aⁿ est la seule conséquence de la méthode du BO (« utilisation de cette suite pour déterminer toutes les solutions »). Lecture déduite : le BO ne donne la limite que pour une suite géométrique de raison positive ; la limite d'une suite arithmético-géométrique passe par la suite géométrique uₙ − ℓ de raison a, donc a ⩾ 0.
- **TCOMP-215** — Limite des sommes des termes d'une suite géométrique de raison positive strictement inférieure à $1$ (démonstration). — _hérite des bornes générales_
  - ⚠ Démonstration (« démonstration possible » du BO) : point-compétence, aucune borne propre au-delà des bornes générales.
- **TCOMP-216** — Recherche de seuils. — _hérite des bornes générales_
  - ⚠ Exemple d'algorithme du BO : hérite de la borne générale d'algorithmique (langage naturel avec ← ou Python, aucune notion nouvelle).
- **TCOMP-217** — Pour une suite récurrente $u_{n+1} = f(u_n)$, calcul des termes successifs. — _hérite des bornes générales_
  - ⚠ Exemple d'algorithme du BO : hérite de la borne générale d'algorithmique (langage naturel avec ← ou Python, aucune notion nouvelle).
- **TCOMP-218** — Recherche de valeurs approchées de constantes mathématiques, par exemple $\pi$, $\ln 2$, $\sqrt{2}$.
  - Exemples du BO : π, ln 2, √2 (liste ouverte : « par exemple »). — _BO Tle compl. p.9_ (BO)
  - ⚠ Exemple d'algorithme du BO : hérite de la borne générale d'algorithmique (langage naturel avec ← ou Python, aucune notion nouvelle).

### Analyse > Fonctions : continuité, dérivabilité, limites, représentation graphique

- **TCOMP-333** — Notion de limite d'une fonction.
  - Notion intuitive de limite, en un point ou aux bornes d'un intervalle ; la formalisation n'est pas un attendu. — _BO Tle compl. p.9_ (BO)
- **TCOMP-219** — Lien entre la notion de limite et les asymptotes horizontales ou verticales.
  - Asymptotes horizontales et verticales seulement (pas d'asymptote oblique). — _BO Tle compl. p.9_ (BO)
- **TCOMP-220** — Lien entre la notion de limite et la continuité.
  - Continuité intuitive ; une fonction dérivable sur un intervalle est continue (admis). — _BO Tle compl. p.9_ (BO)
- **TCOMP-221** — Limites de la fonction carré.
  - Limites aux bornes de ℝ : +∞ en −∞ et en +∞. — _BO Tle compl. p.9_ (BO)
- **TCOMP-334** — Limites de la fonction cube.
  - Limites aux bornes de ℝ : −∞ en −∞, +∞ en +∞. — _BO Tle compl. p.9_ (BO)
- **TCOMP-335** — Limites de la fonction racine carrée.
  - Limite en +∞ : +∞ (fonction définie sur [0, +∞[). — _BO Tle compl. p.9_ (BO)
- **TCOMP-336** — Limites de la fonction inverse.
  - Limites : 0 en −∞ et en +∞ ; −∞ en 0 à gauche, +∞ en 0 à droite. — _BO Tle compl. p.9_ (BO)
- **TCOMP-337** — Limites de la fonction exponentielle.
  - Limites : 0 en −∞, +∞ en +∞. — _BO Tle compl. p.9_ (BO)
- **TCOMP-338** — Limites de la fonction logarithme.
  - Limites : −∞ en 0 (à droite), +∞ en +∞. — _BO Tle compl. p.9_ (BO)
- **TCOMP-222** — Théorème des valeurs intermédiaires (admis).
  - Théorème admis, pour une fonction continue sur un intervalle. — _BO Tle compl. p.9_ (BO)
- **TCOMP-339** — Théorème des valeurs intermédiaires : cas des fonctions strictement monotones.
  - Fonction continue strictement monotone sur un intervalle : existence et unicité de la solution de f(x) = k. — _BO Tle compl. p.9_ (BO)
- **TCOMP-223** — Réciproque d'une fonction continue strictement monotone sur un intervalle.
  - Pas de développement théorique ; notion illustrée par les couples carré / racine carrée et exponentielle / logarithme. — _BO Tle compl. p.9_ (BO)
  - ⚠ Faut-il s'en tenir aux deux couples illustrés ? ltc-8.
- **TCOMP-340** — Représentation graphique de la réciproque d'une fonction continue strictement monotone.
  - Pas de développement théorique ; notion illustrée par les couples carré / racine carrée et exponentielle / logarithme. — _BO Tle compl. p.9_ (BO)
  - ⚠ Faut-il s'en tenir aux deux couples illustrés ? ltc-8.
- **TCOMP-224** — Fonction logarithme népérien : réciproque de la fonction exponentielle.
  - Logarithme défini comme réciproque de l'exponentielle, donc sur ]0, +∞[ ; le thème historique le relie aussi à l'équation fonctionnelle et à la quadrature de l'hyperbole, sans en faire une définition. — _BO Tle compl. p.5 ; 9_ (BO)
  - ⚠ La quadrature de l'hyperbole (aire sous 1/t) n'est qu'un « problème possible » d'un thème : voir ltc-7.
- **TCOMP-225** — Représentation graphique de la fonction logarithme népérien. — _hérite des bornes générales_
- **TCOMP-226** — Équation fonctionnelle du logarithme népérien.
  - Propriétés : ln(ab) = ln a + ln b, ln(1/a) = −ln a, ln(qⁿ) = n ln q (a, b, q > 0). — _BO Tle compl. p.9_ (BO)
- **TCOMP-227** — Fonction dérivée du logarithme népérien.
  - (ln x)' = 1/x sur ]0, +∞[. — _BO Tle compl. p.9_ (BO)
- **TCOMP-341** — Fonction dérivée de $x \mapsto f(ax + b)$.
  - (f(ax + b))' = a f'(ax + b), f étant une fonction dont la dérivée est connue. — _BO Tle compl. p.9_ (BO)
- **TCOMP-228** — Fonction dérivée de $x \mapsto e^{u(x)}$.
  - (e^{u})' = u' e^{u}. — _BO Tle compl. p.9_ (BO)
- **TCOMP-342** — Fonction dérivée de $x \mapsto \ln u(x)$.
  - (ln u)' = u'/u. — _BO Tle compl. p.9_ (BO)
  - u strictement positive sur l'intervalle d'étude ; pas de ln |u|. — _BO Tle compl. p.9_ (déduite)
  - ⚠ Lecture déduite : ln n'est défini que sur ]0, +∞[ (réciproque de exp) et le BO n'écrit que ln u ; ln |u| n'apparaît nulle part.
- **TCOMP-343** — Fonction dérivée de $x \mapsto u(x)^2$.
  - (u²)' = 2u u' ; pas de formule générale pour uⁿ. — _BO Tle compl. p.9_ (BO)
- **TCOMP-229** — Calculer une fonction dérivée.
  - Fonctions construites sur les fonctions de référence par somme, produit, inverse, quotient (1re spé) et par les seules compositions f(ax + b), e^{u}, ln u, u². — _BO Tle compl. p.9 ; BO 1re spé p.7_ (BO)
- **TCOMP-230** — Calculer des limites.
  - Limites des fonctions de référence et opérations sur les limites (admises) ; composition et comparaison seulement en contexte. — _BO Tle compl. p.9_ (BO)
  - ⚠ Les croissances comparées (eˣ/x, x e^{−x}, ln x / x) ne figurent pas au BO : ltc-1.
- **TCOMP-231** — Dresser un tableau de variation.
  - Études sur des intervalles quelconques, avec une notion intuitive de limite aux bornes. — _BO Tle compl. p.9_ (BO)
- **TCOMP-378** — Dans le cadre de la résolution de problème, utiliser le calcul des limites.
  - Limites des fonctions de référence et opérations sur les limites (admises) ; composition et comparaison seulement en contexte. — _BO Tle compl. p.9_ (BO)
  - ⚠ Capacité de résolution de problème ; mêmes bornes que TCOMP-230 (croissances comparées : ltc-1).
- **TCOMP-232** — Dans le cadre de la résolution de problème, utiliser l'allure des courbes représentatives des fonctions inverse, carré, cube, racine carrée, exponentielle et logarithme.
  - Allure des courbes des seules fonctions inverse, carré, cube, racine carrée, exponentielle, logarithme. — _BO Tle compl. p.9_ (BO)
- **TCOMP-233** — Exploiter le tableau de variation pour déterminer le nombre de solutions d'une équation du type $f(x) = k$.
  - Équation du type f(x) = k ; nombre de solutions lu dans le tableau de variation (théorème des valeurs intermédiaires, cas strictement monotone). — _BO Tle compl. p.9_ (BO)
- **TCOMP-234** — Exploiter le tableau de variation pour résoudre une inéquation du type $f(x) \leqslant k$.
  - Inéquation du type f(x) ⩽ k, résolue à partir du tableau de variation. — _BO Tle compl. p.9_ (BO)
- **TCOMP-235** — Déterminer des valeurs approchées, un encadrement d'une solution d'une équation du type $f(x) = k$.
  - Valeurs approchées ou encadrement d'une solution de f(x) = k (calculatrice, balayage, dichotomie) ; aucune précision imposée par le BO. — _BO Tle compl. p.4 ; 9_ (BO)
- **TCOMP-236** — Utiliser l'équation fonctionnelle du logarithme pour transformer une écriture.
  - Propriétés : ln(ab) = ln a + ln b, ln(1/a) = −ln a, ln(qⁿ) = n ln q (a, b, q > 0). — _BO Tle compl. p.9_ (BO)
- **TCOMP-237** — Utiliser l'équation fonctionnelle de l'exponentielle pour résoudre une équation.
  - Propriétés de 1re spé : e^{x + y} = eˣ eʸ, eˣ e^{−x} = 1 ; la stricte croissance de exp ; passage par ln (réciproque) possible. — _BO Tle compl. p.9 ; BO 1re spé p.8_ (BO)
- **TCOMP-344** — Utiliser l'équation fonctionnelle de l'exponentielle pour résoudre une inéquation.
  - Propriétés de 1re spé : e^{x + y} = eˣ eʸ, eˣ e^{−x} = 1 ; la stricte croissance de exp ; passage par ln (réciproque) possible. — _BO Tle compl. p.9 ; BO 1re spé p.8_ (BO)
- **TCOMP-238** — Utiliser l'équation fonctionnelle du logarithme pour résoudre une équation.
  - Propriétés : ln(ab) = ln a + ln b, ln(1/a) = −ln a, ln(qⁿ) = n ln q (a, b, q > 0). — _BO Tle compl. p.9_ (BO)
  - Résolution sur l'ensemble où les expressions sous ln sont strictement positives. — _BO Tle compl. p.9_ (déduite)
  - ⚠ Lecture déduite : conséquence de la définition de ln sur ]0, +∞[ ; le BO n'en parle pas explicitement.
- **TCOMP-345** — Utiliser l'équation fonctionnelle du logarithme pour résoudre une inéquation.
  - Propriétés : ln(ab) = ln a + ln b, ln(1/a) = −ln a, ln(qⁿ) = n ln q (a, b, q > 0). — _BO Tle compl. p.9_ (BO)
  - Résolution sur l'ensemble où les expressions sous ln sont strictement positives. — _BO Tle compl. p.9_ (déduite)
  - ⚠ Lecture déduite : conséquence de la définition de ln sur ]0, +∞[ ; le BO n'en parle pas explicitement.
- **TCOMP-239** — Utiliser la relation $\ln q^n = n \ln q$ pour déterminer un seuil.
  - Seuil pour qⁿ (q > 0, n entier naturel) : qⁿ ⩽ s ou qⁿ ⩾ s résolu par n ln q. — _BO Tle compl. p.9_ (BO)
- **TCOMP-240** — Relation $\ln(ab) = \ln a + \ln b$ (démonstration). — _hérite des bornes générales_
  - ⚠ Démonstration (« démonstration possible » du BO) : point-compétence, aucune borne propre au-delà des bornes générales.
- **TCOMP-346** — Relation $\ln\left(\frac{1}{a}\right) = -\ln a$ (démonstration). — _hérite des bornes générales_
  - ⚠ Démonstration (« démonstration possible » du BO) : point-compétence, aucune borne propre au-delà des bornes générales.
- **TCOMP-241** — Calcul de la fonction dérivée du logarithme, en admettant sa dérivabilité.
  - La dérivabilité du logarithme est admise. — _BO Tle compl. p.9_ (BO)
  - ⚠ Démonstration (« démonstration possible » du BO) : point-compétence, aucune borne propre au-delà des bornes générales.
- **TCOMP-242** — Calcul de la fonction dérivée de $\ln u$. — _hérite des bornes générales_
  - ⚠ Démonstration (« démonstration possible » du BO) : point-compétence, aucune borne propre au-delà des bornes générales.
- **TCOMP-347** — Calcul de la fonction dérivée de $\exp u$. — _hérite des bornes générales_
  - ⚠ Démonstration (« démonstration possible » du BO) : point-compétence, aucune borne propre au-delà des bornes générales.
- **TCOMP-243** — Méthode de recherche de valeurs approchées d'une solution d'équation du type $f(x) = k$ : balayage. — _hérite des bornes générales_
  - ⚠ Exemple d'algorithme du BO : hérite de la borne générale d'algorithmique (langage naturel avec ← ou Python, aucune notion nouvelle).
- **TCOMP-348** — Méthode de recherche de valeurs approchées d'une solution d'équation du type $f(x) = k$ : dichotomie. — _hérite des bornes générales_
  - ⚠ Exemple d'algorithme du BO : hérite de la borne générale d'algorithmique (langage naturel avec ← ou Python, aucune notion nouvelle).
- **TCOMP-349** — Méthode de recherche de valeurs approchées d'une solution d'équation du type $f(x) = k$ : méthode de Newton. — _hérite des bornes générales_
  - ⚠ Exemple d'algorithme du BO : hérite de la borne générale d'algorithmique (langage naturel avec ← ou Python, aucune notion nouvelle).
- **TCOMP-244** — Algorithme de Briggs pour le calcul de logarithmes. — _hérite des bornes générales_
  - ⚠ Exemple d'algorithme du BO : hérite de la borne générale d'algorithmique (langage naturel avec ← ou Python, aucune notion nouvelle).

### Analyse > Primitives et équations différentielles

- **TCOMP-245** — Sur des exemples, notion d'une solution d'équation différentielle.
  - Sur des exemples seulement ; existence et unicité de la solution vérifiant une condition initiale mises en évidence sur ces exemples, pas démontrées. — _BO Tle compl. p.9_ (BO)
- **TCOMP-246** — Notion de primitive, en liaison avec l'équation différentielle $y' = f$.
  - Primitive F de f : F' = f, en lien avec l'équation y' = f. — _BO Tle compl. p.9_ (BO)
- **TCOMP-247** — Deux primitives d'une même fonction continue sur un intervalle diffèrent d'une constante.
  - Fonction continue sur un intervalle. — _BO Tle compl. p.9_ (BO)
- **TCOMP-248** — Équation différentielle $y' = ay + b$, où $a$ et $b$ sont des réels.
  - a et b réels ; la solution particulière constante −b/a suppose a ≠ 0. — _BO Tle compl. p.9_ (déduite)
  - ⚠ Lecture déduite : le BO dit « a et b réels » ; la solution constante n'existe que pour a ≠ 0 (pour a = 0, y' = b relève des primitives).
- **TCOMP-249** — Allure des courbes des solutions de l'équation différentielle $y' = ay + b$. — _hérite des bornes générales_
- **TCOMP-250** — Vérifier qu'une fonction donnée est solution d'une équation différentielle.
  - Équation donnée, linéaire ou non (par exemple logistique y' = ay(b − y)) : seule la vérification par le calcul de la dérivée est demandée. — _BO Tle compl. p.4 ; 9_ (déduite)
  - ⚠ Lecture déduite : le BO admet qu'une équation non linéaire « peut apparaître » sans connaissance exigible ; la vérification n'en demande aucune. L'ordre (y'' admis ou non) : ltc-6.
- **TCOMP-251** — Déterminer les primitives d'une fonction, en reconnaissant la dérivée d'une fonction de référence.
  - Primitives lues sur les dérivées connues : xⁿ (n ∈ ℤ, n ≠ −1), 1/x (→ ln x sur ]0, +∞[), 1/√x, eˣ, e^{ax}, et f(ax + b) ; plus les formes 2uu', e^{u}u', u'/u. — _BO Tle compl. p.9 ; BO 1re spé p.7-8_ (déduite)
  - ⚠ Lecture déduite : le BO dit « en reconnaissant la dérivée d'une fonction de référence » ; la liste est celle des dérivées connues en 1re spé et en Tle compl.
- **TCOMP-252** — Déterminer les primitives d'une fonction de la forme $2uu'$.
  - Forme 2uu' (primitive u²) seulement ; pas de forme générale uⁿu'. — _BO Tle compl. p.9_ (BO)
- **TCOMP-350** — Déterminer les primitives d'une fonction de la forme $e^{u}u'$.
  - Forme e^{u}u' (primitive e^{u}). — _BO Tle compl. p.9_ (BO)
- **TCOMP-351** — Déterminer les primitives d'une fonction de la forme $\frac{u'}{u}$.
  - Forme u'/u (primitive ln u). — _BO Tle compl. p.9_ (BO)
  - u strictement positive sur l'intervalle d'étude ; pas de ln |u|. — _BO Tle compl. p.9_ (déduite)
  - ⚠ Lecture déduite : ln n'est défini que sur ]0, +∞[ (réciproque de exp) et le BO n'écrit que ln u ; ln |u| n'apparaît nulle part.
- **TCOMP-253** — Résoudre une équation différentielle $y' = ay$.
  - a réel ; solutions x ↦ C e^{ax} ; une condition initiale fixe la solution. — _BO Tle compl. p.9_ (BO)
- **TCOMP-254** — Pour une équation différentielle $y' = ay + b$ : déterminer une solution particulière constante.
  - a et b réels ; la solution particulière constante −b/a suppose a ≠ 0. — _BO Tle compl. p.9_ (déduite)
  - ⚠ Lecture déduite : le BO dit « a et b réels » ; la solution constante n'existe que pour a ≠ 0 (pour a = 0, y' = b relève des primitives).
- **TCOMP-255** — Pour une équation différentielle $y' = ay + b$ : utiliser une solution particulière constante pour déterminer la solution générale.
  - Solution générale = solutions de y' = ay plus la solution particulière constante. — _BO Tle compl. p.9_ (BO)
  - a et b réels ; la solution particulière constante −b/a suppose a ≠ 0. — _BO Tle compl. p.9_ (déduite)
  - ⚠ Lecture déduite : le BO dit « a et b réels » ; la solution constante n'existe que pour a ≠ 0 (pour a = 0, y' = b relève des primitives).
- **TCOMP-256** — Deux primitives d'une même fonction continue sur un intervalle diffèrent d'une constante (démonstration). — _hérite des bornes générales_
  - ⚠ Démonstration (« démonstration possible » du BO) : point-compétence, aucune borne propre au-delà des bornes générales.
- **TCOMP-257** — Résolution de l'équation différentielle $y' = ay$. — _hérite des bornes générales_
  - ⚠ Démonstration (« démonstration possible » du BO) : point-compétence, aucune borne propre au-delà des bornes générales.
- **TCOMP-258** — Sur des exemples, résolution approchée d'une équation différentielle par la méthode d'Euler.
  - Sur des exemples seulement. — _BO Tle compl. p.10_ (BO)
  - ⚠ Exemple d'algorithme du BO : hérite de la borne générale d'algorithmique (langage naturel avec ← ou Python, aucune notion nouvelle).

### Analyse > Fonctions convexes

- **TCOMP-259** — Dérivée seconde d'une fonction. — _hérite des bornes générales_
- **TCOMP-260** — Fonction convexe sur un intervalle : définition par la position relative de la courbe représentative et des sécantes.
  - Définition par la position de la courbe sous ses sécantes (cordes) sur un intervalle. — _BO Tle compl. p.10_ (BO)
- **TCOMP-261** — Lorsque $f$ est dérivable, équivalence admise avec la position de la courbe par rapport aux tangentes.
  - Équivalence admise : courbe au-dessus de ses tangentes, pour f dérivable. — _BO Tle compl. p.10_ (BO)
- **TCOMP-262** — Caractérisation admise de la convexité par la croissance de $f'$.
  - Caractérisation admise : f convexe ⇔ f' croissante. — _BO Tle compl. p.10_ (BO)
- **TCOMP-352** — Caractérisation admise de la convexité par la positivité de $f''$.
  - Caractérisation admise : f convexe ⇔ f'' ⩾ 0. — _BO Tle compl. p.10_ (BO)
- **TCOMP-263** — Point d'inflexion. — _hérite des bornes générales_
  - ⚠ Le BO (p.10) nomme le point d'inflexion sans le définir.
- **TCOMP-264** — Reconnaitre sur une représentation graphique une fonction convexe, concave. — _hérite des bornes générales_
- **TCOMP-353** — Reconnaitre sur une représentation graphique un point d'inflexion. — _hérite des bornes générales_
- **TCOMP-265** — Étudier la convexité, la concavité, d'une fonction deux fois dérivable sur un intervalle.
  - Fonction deux fois dérivable sur un intervalle (fonctions du programme). — _BO Tle compl. p.10_ (BO)

### Analyse > Intégration

- **TCOMP-266** — Définition de l'intégrale d'une fonction continue et positive sur $[a, b]$ comme aire sous la courbe. Notation $\int_a^b f(x)\,\mathrm{d}x$.
  - f continue et positive sur [a, b] ; intégrale = aire sous la courbe (en unités d'aire). — _BO Tle compl. p.10_ (BO)
  - Notation ∫_a^b f(x) dx ; mise en relation avec Σ f(xᵢ)Δxᵢ. — _BO Tle compl. p.10_ (BO)
- **TCOMP-267** — Relation de Chasles. — _hérite des bornes générales_
- **TCOMP-268** — Valeur moyenne d'une fonction continue sur $[a, b]$. Approche graphique et numérique.
  - Valeur moyenne d'une fonction continue sur [a, b], abordée graphiquement et numériquement. — _BO Tle compl. p.10_ (BO)
- **TCOMP-269** — La valeur moyenne est comprise entre les bornes de la fonction.
  - Si m ⩽ f ⩽ M sur [a, b], la valeur moyenne est comprise entre m et M. — _BO Tle compl. p.10_ (BO)
- **TCOMP-270** — Approximation d'une intégrale par la méthode des rectangles.
  - Méthode des rectangles. — _BO Tle compl. p.10_ (BO)
- **TCOMP-271** — Présentation de l'intégrale des fonctions continues de signe quelconque.
  - Signe quelconque : présentation seulement. — _BO Tle compl. p.10_ (BO)
- **TCOMP-272** — Théorème : si $f$ est continue sur $[a, b]$, la fonction $F$ définie sur $[a, b]$ par $F(x) = \int_a^x f(t)\,\mathrm{d}t$ est dérivable sur $[a, b]$ et a pour dérivée $f$.
  - f continue sur [a, b] ; F(x) = ∫_a^x f(t) dt. — _BO Tle compl. p.10_ (BO)
- **TCOMP-273** — Calcul d'intégrales à l'aide de primitives : si $F$ est une primitive de $f$, alors $\int_a^b f(x)\,\mathrm{d}x = F(b) - F(a)$.
  - Primitives limitées à celles du programme (dérivées des fonctions de référence, f(ax + b), 2uu', e^{u}u', u'/u). — _BO Tle compl. p.9-10_ (déduite)
  - ⚠ Lecture déduite : le calcul d'intégrale passe par F(b) − F(a) ; seules les primitives que le programme sait déterminer sont disponibles.
- **TCOMP-274** — Estimer graphiquement une intégrale. — _hérite des bornes générales_
- **TCOMP-354** — Encadrer une intégrale. — _hérite des bornes générales_
- **TCOMP-275** — Estimer graphiquement une valeur moyenne. — _hérite des bornes générales_
- **TCOMP-355** — Encadrer une valeur moyenne. — _hérite des bornes générales_
- **TCOMP-276** — Calculer une intégrale.
  - Primitives limitées à celles du programme (dérivées des fonctions de référence, f(ax + b), 2uu', e^{u}u', u'/u). — _BO Tle compl. p.9-10_ (déduite)
  - ⚠ Lecture déduite : le calcul d'intégrale passe par F(b) − F(a) ; seules les primitives que le programme sait déterminer sont disponibles.
- **TCOMP-277** — Calculer une valeur moyenne.
  - Primitives limitées à celles du programme (dérivées des fonctions de référence, f(ax + b), 2uu', e^{u}u', u'/u). — _BO Tle compl. p.9-10_ (déduite)
  - ⚠ Lecture déduite : le calcul d'intégrale passe par F(b) − F(a) ; seules les primitives que le programme sait déterminer sont disponibles.
- **TCOMP-278** — Calculer l'aire sous une courbe.
  - Aire sous la courbe d'une fonction continue et positive (en unités d'aire). — _BO Tle compl. p.10_ (BO)
  - Primitives limitées à celles du programme (dérivées des fonctions de référence, f(ax + b), 2uu', e^{u}u', u'/u). — _BO Tle compl. p.9-10_ (déduite)
  - ⚠ Lecture déduite : le calcul d'intégrale passe par F(b) − F(a) ; seules les primitives que le programme sait déterminer sont disponibles.
- **TCOMP-279** — Calculer l'aire entre deux courbes.
  - Aire entre deux courbes : ∫_a^b (f − g) avec f ⩾ g sur [a, b]. — _BO Tle compl. p.10_ (déduite)
  - Primitives limitées à celles du programme (dérivées des fonctions de référence, f(ax + b), 2uu', e^{u}u', u'/u). — _BO Tle compl. p.9-10_ (déduite)
  - ⚠ Lecture déduite : le BO dit seulement « entre deux courbes » ; la formule suit de la définition par l'aire. Lecture déduite : le calcul d'intégrale passe par F(b) − F(a) ; seules les primitives que le programme sait déterminer sont disponibles.
- **TCOMP-280** — Interpréter une intégrale dans un contexte issu d'une autre discipline. — _hérite des bornes générales_
  - ⚠ Capacité d'interprétation en contexte d'une autre discipline : pas de borne propre.
- **TCOMP-281** — Interpréter une valeur moyenne dans un contexte issu d'une autre discipline. — _hérite des bornes générales_
  - ⚠ Capacité d'interprétation en contexte d'une autre discipline : pas de borne propre.
- **TCOMP-282** — Dérivée de $x \mapsto \int_a^x f(t)\,\mathrm{d}t$ lorsque $f$ est une fonction continue positive croissante.
  - f continue, positive et croissante seulement. — _BO Tle compl. p.10_ (BO)
  - ⚠ Démonstration (« démonstration possible » du BO) : point-compétence, aucune borne propre au-delà des bornes générales.
- **TCOMP-283** — Méthode des rectangles. — _hérite des bornes générales_
  - ⚠ Exemple d'algorithme du BO : hérite de la borne générale d'algorithmique (langage naturel avec ← ou Python, aucune notion nouvelle).
- **TCOMP-356** — Méthode des trapèzes. — _hérite des bornes générales_
  - ⚠ Exemple d'algorithme du BO : hérite de la borne générale d'algorithmique (langage naturel avec ← ou Python, aucune notion nouvelle).
- **TCOMP-284** — Méthode de Monte-Carlo pour un calcul d'aire. — _hérite des bornes générales_
  - ⚠ Exemple d'algorithme du BO : hérite de la borne générale d'algorithmique (langage naturel avec ← ou Python, aucune notion nouvelle).

### Probabilités et statistique > Lois discrètes

- **TCOMP-285** — Loi uniforme sur $\{1, 2, \ldots, n\}$.
  - Valeurs 1, 2, …, n équiprobables : P(X = k) = 1/n. — _BO Tle compl. p.11_ (BO)
- **TCOMP-357** — Loi uniforme sur $\{1, 2, \ldots, n\}$ : espérance.
  - E(X) = (n + 1)/2. — _BO Tle compl. p.11_ (BO)
- **TCOMP-286** — Épreuve de Bernoulli. Loi de Bernoulli : définition.
  - X à valeurs 0 et 1, P(X = 1) = p. — _BO Tle compl. p.11_ (BO)
- **TCOMP-358** — Loi de Bernoulli : espérance.
  - E(X) = p. — _BO Tle compl. p.11_ (BO)
- **TCOMP-359** — Loi de Bernoulli : écart type.
  - σ(X) = √(p(1 − p)). — _BO Tle compl. p.11_ (BO)
- **TCOMP-287** — Schéma de Bernoulli.
  - Taille n quelconque (la 1re spé se limitait à n ⩽ 4). — _BO Tle compl. p.11 ; BO 1re spé p.10_ (déduite)
  - ⚠ Lecture déduite : le BO de Tle compl. ne borne plus n, alors que celui de 1re spé (p.10) écrivait « pour n ⩽ 4 ».
- **TCOMP-360** — Schéma de Bernoulli : représentation par un arbre. — _hérite des bornes générales_
- **TCOMP-288** — Coefficients binomiaux : définition (nombre de façons d'obtenir $k$ succès dans un schéma de Bernoulli de taille $n$).
  - Définition : nombre de façons d'obtenir k succès dans un schéma de Bernoulli de taille n (chemins de l'arbre). — _BO Tle compl. p.11_ (BO)
  - Pas de formule n!/(k!(n − k)!) : les coefficients s'obtiennent par dénombrement des chemins de l'arbre ou par le triangle de Pascal. — _BO Tle compl. p.11_ (déduite)
  - ⚠ Lecture déduite : le BO définit les coefficients binomiaux par le schéma de Bernoulli et ne donne comme outil que le triangle de Pascal ; la factorielle n'apparaît qu'en exemple d'algorithme de 1re spé.
- **TCOMP-361** — Coefficients binomiaux : triangle de Pascal.
  - Relation de Pascal (construction du triangle). — _BO Tle compl. p.11_ (BO)
- **TCOMP-362** — Coefficients binomiaux : symétrie.
  - Symétrie : (n k) = (n n − k). — _BO Tle compl. p.11_ (BO)
- **TCOMP-289** — Variable aléatoire suivant une loi binomiale $\mathcal{B}(n, p)$. Interprétation : nombre de succès dans le schéma de Bernoulli.
  - Notation ℬ(n, p) ; X = nombre de succès du schéma de Bernoulli. — _BO Tle compl. p.11_ (BO)
- **TCOMP-290** — Loi binomiale : expression.
  - P(X = k) = (n k) pᵏ (1 − p)ⁿ⁻ᵏ. — _BO Tle compl. p.11_ (BO)
  - ⚠ Calcul effectif à la main ou à la calculatrice : ltc-2.
- **TCOMP-291** — Loi binomiale : espérance (admise).
  - E(X) = np, admise. — _BO Tle compl. p.11_ (BO)
- **TCOMP-363** — Loi binomiale : écart type (admis).
  - σ(X) = √(np(1 − p)), admis. — _BO Tle compl. p.11_ (BO)
- **TCOMP-292** — Loi binomiale : représentation graphique. — _hérite des bornes générales_
- **TCOMP-293** — Loi géométrique : définition.
  - Rang du premier succès dans un schéma de Bernoulli (valeurs k ⩾ 1), ou loi discrète sans mémoire. — _BO Tle compl. p.7 ; 11_ (BO)
- **TCOMP-364** — Loi géométrique : expression.
  - P(X = k) = (1 − p)ᵏ⁻¹ p pour k ⩾ 1 (rang du premier succès). — _BO Tle compl. p.7 ; 11_ (BO)
- **TCOMP-365** — Loi géométrique : espérance (admise).
  - E(X) = 1/p, admise. — _BO Tle compl. p.11_ (BO)
- **TCOMP-366** — Loi géométrique : représentation graphique. — _hérite des bornes générales_
- **TCOMP-294** — Loi géométrique : propriété caractéristique (loi sans mémoire).
  - Absence de mémoire : P_{X > m}(X > m + n) = P(X > n). — _BO Tle compl. p.7 ; 11_ (BO)
- **TCOMP-295** — Identifier des situations où une variable aléatoire suit une loi de Bernoulli. — _hérite des bornes générales_
- **TCOMP-367** — Identifier des situations où une variable aléatoire suit une loi binomiale. — _hérite des bornes générales_
- **TCOMP-368** — Identifier des situations où une variable aléatoire suit une loi géométrique. — _hérite des bornes générales_
- **TCOMP-296** — Déterminer des coefficients binomiaux à l'aide du triangle de Pascal.
  - Par le triangle de Pascal. — _BO Tle compl. p.11_ (BO)
  - Pas de formule n!/(k!(n − k)!) : les coefficients s'obtiennent par dénombrement des chemins de l'arbre ou par le triangle de Pascal. — _BO Tle compl. p.11_ (déduite)
  - ⚠ Lecture déduite : le BO définit les coefficients binomiaux par le schéma de Bernoulli et ne donne comme outil que le triangle de Pascal ; la factorielle n'apparaît qu'en exemple d'algorithme de 1re spé.
- **TCOMP-297** — Dans le cas où $X$ suit une loi binomiale, calculer à l'aide d'une calculatrice ou d'un logiciel les probabilités des événements de type $P(X = k)$ ou $P(X \leqslant k)$, etc.
  - Calcul à la calculatrice ou au logiciel ; événements P(X = k), P(X ⩽ k) et apparentés. — _BO Tle compl. p.11_ (BO)
  - ⚠ Calcul à la main admis ou non : ltc-2.
- **TCOMP-298** — Calculer explicitement les probabilités des événements de type $P(X = k)$ ou $P(X \leqslant k)$ pour une variable aléatoire $X$ suivant une loi géométrique.
  - P(X = k) = (1 − p)ᵏ⁻¹ p pour k ⩾ 1 (rang du premier succès). — _BO Tle compl. p.7 ; 11_ (BO)
  - P(X ⩽ k) = 1 − (1 − p)ᵏ, P(X > k) = (1 − p)ᵏ. — _BO Tle compl. p.11_ (déduite)
  - ⚠ Lecture déduite : « calculer explicitement ces probabilités » ; P(X ⩽ k) découle de la somme géométrique de 1re spé.
- **TCOMP-299** — Dans le cas où $X$ suit une loi binomiale, déterminer un intervalle $I$ pour lequel la probabilité $P(X \in I)$ est inférieure à une valeur donnée $\alpha$, ou supérieure à $1 - \alpha$.
  - Intervalle I tel que P(X ∈ I) ⩽ α ou ⩾ 1 − α, X binomiale (calculatrice, logiciel ou algorithme) ; les thèmes donnent I centré en n/2 pour ℬ(n, 1/2) et I = [0, k]. — _BO Tle compl. p.6-7 ; 11_ (BO)
- **TCOMP-300** — Dans le cadre de la résolution de problème, utiliser l'espérance des lois précédentes (uniforme, de Bernoulli, binomiale, géométrique).
  - Espérances des seules lois discrètes du programme : uniforme, Bernoulli, binomiale, géométrique. — _BO Tle compl. p.11_ (BO)
- **TCOMP-301** — Utiliser en situation la caractérisation d'une loi géométrique par l'absence de mémoire.
  - Absence de mémoire : P_{X > m}(X > m + n) = P(X > n). — _BO Tle compl. p.7 ; 11_ (BO)
- **TCOMP-302** — Calculer des probabilités dans des situations faisant intervenir des probabilités conditionnelles.
  - Inversion du conditionnement par la formule de Bayes P_B(A) = P_A(B)P(A)/P(B), en plus des outils de 1re spé (arbres pondérés, tableaux croisés, probabilités totales). — _BO Tle compl. p.6 ; BO 1re spé p.5 ; 10_ (BO)
  - ⚠ La formule de Bayes est écrite dans le thème « Inférence bayésienne » (« bien comprendre cette distinction est un objectif majeur ») ; le vocabulaire des tests (sensibilité, spécificité, valeurs prédictives) n'est qu'un problème possible : ltc-7.
- **TCOMP-303** — Calculer des probabilités dans des situations faisant intervenir des répétitions d'expériences aléatoires.
  - Répétition d'expériences aléatoires indépendantes. — _BO Tle compl. p.11_ (BO)
  - Taille n quelconque (la 1re spé se limitait à n ⩽ 4). — _BO Tle compl. p.11 ; BO 1re spé p.10_ (déduite)
  - ⚠ Lecture déduite : le BO de Tle compl. ne borne plus n, alors que celui de 1re spé (p.10) écrivait « pour n ⩽ 4 ».
- **TCOMP-304** — Espérance d'une variable aléatoire suivant une loi de Bernoulli (démonstration). — _hérite des bornes générales_
  - ⚠ Démonstration (« démonstration possible » du BO) : point-compétence, aucune borne propre au-delà des bornes générales.
- **TCOMP-369** — Écart type d'une variable aléatoire suivant une loi de Bernoulli (démonstration). — _hérite des bornes générales_
  - ⚠ Démonstration (« démonstration possible » du BO) : point-compétence, aucune borne propre au-delà des bornes générales.
- **TCOMP-305** — Espérance d'une variable aléatoire uniforme sur $\{1, 2, \ldots, n\}$. — _hérite des bornes générales_
  - ⚠ Démonstration (« démonstration possible » du BO) : point-compétence, aucune borne propre au-delà des bornes générales.
- **TCOMP-306** — Espérance d'une variable aléatoire suivant une loi binomiale ($n \leqslant 3$).
  - n ⩽ 3. — _BO Tle compl. p.11_ (BO)
  - ⚠ Démonstration (« démonstration possible » du BO) : point-compétence, aucune borne propre au-delà des bornes générales.
- **TCOMP-307** — Caractérisation d'une loi géométrique par l'absence de mémoire. — _hérite des bornes générales_
  - ⚠ Démonstration (« démonstration possible » du BO) : point-compétence, aucune borne propre au-delà des bornes générales.

### Probabilités et statistique > Lois à densité

- **TCOMP-308** — Notion de loi à densité à partir d'exemples.
  - À partir d'exemples. — _BO Tle compl. p.11_ (BO)
- **TCOMP-370** — Représentation d'une probabilité comme une aire.
  - P(a ⩽ X ⩽ b) = aire sous la densité entre a et b. — _BO Tle compl. p.11_ (BO)
- **TCOMP-309** — Fonction de répartition $x \mapsto P(X \leqslant x)$.
  - F(x) = P(X ⩽ x). — _BO Tle compl. p.11_ (BO)
- **TCOMP-310** — Espérance d'une loi à densité, expression sous forme d'intégrale.
  - Espérance écrite sous forme d'intégrale (∫ x f(x) dx). — _BO Tle compl. p.11_ (BO)
  - ⚠ Intervalles non bornés : ltc-3.
- **TCOMP-371** — Variance d'une loi à densité, expression sous forme d'intégrale.
  - Variance écrite sous forme d'intégrale. — _BO Tle compl. p.11_ (BO)
  - ⚠ Intervalles non bornés : ltc-3.
- **TCOMP-311** — Loi uniforme sur $[0, 1]$ puis sur $[a, b]$ : fonction de densité.
  - Densité 1 sur [0, 1], puis 1/(b − a) sur [a, b]. — _BO Tle compl. p.11_ (BO)
- **TCOMP-372** — Loi uniforme sur $[0, 1]$ puis sur $[a, b]$ : fonction de répartition.
  - F(x) = (x − a)/(b − a) sur [a, b]. — _BO Tle compl. p.11_ (BO)
- **TCOMP-373** — Loi uniforme sur $[0, 1]$ puis sur $[a, b]$ : espérance.
  - E(X) = (a + b)/2. — _BO Tle compl. p.11_ (BO)
- **TCOMP-374** — Loi uniforme sur $[0, 1]$ puis sur $[a, b]$ : variance.
  - V(X) = (b − a)²/12. — _BO Tle compl. p.11_ (BO)
- **TCOMP-312** — Loi exponentielle : fonction densité.
  - Densité x ↦ λe^{−λx} sur [0, +∞[, λ > 0. — _BO Tle compl. p.11_ (BO)
- **TCOMP-375** — Loi exponentielle : fonction de répartition.
  - F(x) = 1 − e^{−λx} pour x ⩾ 0. — _BO Tle compl. p.11_ (BO)
- **TCOMP-376** — Loi exponentielle : espérance.
  - E(X) = 1/λ ; pas de variance de la loi exponentielle au programme. — _BO Tle compl. p.11_ (déduite)
  - ⚠ Lecture déduite : le BO liste pour la loi exponentielle « espérance, propriété d'absence de mémoire », sans la variance qu'il cite pour la loi uniforme. Calcul de 1/λ : ltc-3.
- **TCOMP-313** — Propriété d'absence de mémoire de la loi exponentielle.
  - P_{X > t}(X > t + h) = P(X > h). — _BO Tle compl. p.7 ; 11_ (BO)
- **TCOMP-314** — Déterminer si une fonction est une densité de probabilité.
  - Fonction continue, positive, d'intégrale égale à 1 sur l'intervalle considéré. — _BO Tle compl. p.11_ (BO)
  - ⚠ Intervalles non bornés (densité sur [0, +∞[) : ltc-3.
- **TCOMP-315** — Calculer des probabilités pour une variable aléatoire à densité.
  - Lois à densité du programme (uniforme, exponentielle) ou densités données par l'énoncé ; probabilité = intégrale de la densité. — _BO Tle compl. p.11_ (BO)
  - ⚠ Intervalles non bornés : ltc-3.
- **TCOMP-316** — Calculer l'espérance d'une variable aléatoire à densité.
  - Primitives limitées à celles du programme (dérivées des fonctions de référence, f(ax + b), 2uu', e^{u}u', u'/u). — _BO Tle compl. p.9-10_ (déduite)
  - ⚠ Lecture déduite : le calcul d'intégrale passe par F(b) − F(a) ; seules les primitives que le programme sait déterminer sont disponibles. Intervalles non bornés : ltc-3.
- **TCOMP-317** — Simulation d'une variable de Bernoulli ou d'un lancer de dé (ou d'une variable uniforme sur un ensemble fini) à partir d'une variable aléatoire de loi uniforme sur $[0, 1]$.
  - À partir d'une variable de loi uniforme sur [0, 1]. — _BO Tle compl. p.11_ (BO)
  - ⚠ Exemple d'algorithme du BO : hérite de la borne générale d'algorithmique (langage naturel avec ← ou Python, aucune notion nouvelle).
- **TCOMP-318** — Simulation du comportement de la somme de $n$ variables aléatoires indépendantes et de même loi. — _hérite des bornes générales_
  - ⚠ Exemple d'algorithme du BO : hérite de la borne générale d'algorithmique (langage naturel avec ← ou Python, aucune notion nouvelle).

### Probabilités et statistique > Statistique à deux variables quantitatives

- **TCOMP-319** — Nuage de points. — _hérite des bornes générales_
- **TCOMP-320** — Point moyen.
  - Point moyen G(x̄ ; ȳ). — _BO Tle compl. p.12_ (BO)
- **TCOMP-321** — Ajustement affine. Droite des moindres carrés. — _hérite des bornes générales_
- **TCOMP-322** — Coefficient de corrélation. — _hérite des bornes générales_
  - ⚠ Le BO (p.12) cite le coefficient de corrélation dans les contenus sans capacité de calcul : ltc-4.
- **TCOMP-323** — Ajustement se ramenant par changement de variable à un ajustement affine.
  - Changement de variable ramenant à un ajustement affine, par exemple une relation exponentielle (z = ln y). — _BO Tle compl. p.11-12_ (BO)
- **TCOMP-324** — Application des ajustements à des interpolations ou extrapolations.
  - Interpolations ou extrapolations, avec un regard critique. — _BO Tle compl. p.7 ; 12_ (BO)
- **TCOMP-325** — Représenter un nuage de points. — _hérite des bornes générales_
- **TCOMP-326** — Calculer les coordonnées d'un point moyen.
  - Coordonnées (x̄ ; ȳ), moyennes des deux séries. — _BO Tle compl. p.12_ (BO)
- **TCOMP-327** — Déterminer une droite de régression, à l'aide de la calculatrice, d'un logiciel ou par calcul.
  - À la calculatrice, au logiciel ou par calcul. — _BO Tle compl. p.12_ (BO)
- **TCOMP-328** — Dans le cadre d'une résolution de problème, utiliser un ajustement pour interpoler, extrapoler.
  - Interpolations ou extrapolations, avec un regard critique. — _BO Tle compl. p.7 ; 12_ (BO)
- **TCOMP-329** — Droite des moindres carrés (démonstration). — _hérite des bornes générales_
  - ⚠ Démonstration (« démonstration possible » du BO) : point-compétence, aucune borne propre au-delà des bornes générales.
