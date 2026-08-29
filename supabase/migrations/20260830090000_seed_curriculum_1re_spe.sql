-- ============================================================================
-- Amorçage — Programme de suivi 1ʳᵉ spécialité mathématiques (grade '1_SPE')
-- ============================================================================
-- GÉNÉRÉ par scripts/generate-curriculum-1re-spe-seed.ts depuis
-- docs/wip/referentiel/1re-spe-programme.md — ne pas éditer à la main.
--
-- Source : « Programme de spécialité de mathématiques de la classe de première
-- de la voie générale » (programme en vigueur, avec la partie transversale
-- « Automatismes » ; ce n'est PAS l'arrêté du 17 janvier 2019).
--
--   6 thèmes · 14 objectifs · 153 points
--   kind        : 49 connaissance · 93 savoir_faire · 11 demonstration
--   exigence    : 125 attendu · 28 approfondissement
--
-- AMORÇAGE, PAS SYNCHRONISATION.
--
-- Ce fichier remplit un niveau VIDE, une fois. Ensuite c'est la page Programme
-- qui fait foi : ajouts, renommages, déplacements, archivages s'y font, et le
-- markdown n'a plus voix au chapitre. Corriger le markdown après coup ne
-- produit donc plus rien sur une base déjà amorcée — la correction se fait
-- dans l'app.
--
-- D'où la garde ci-dessous : le rejeu (un `db:reset` en local, une migration
-- relancée) ne peut rien écraser, il ne fait rien du tout. C'est la différence
-- avec la version précédente, qui re-synchronisait depuis le markdown et
-- archivait ce qui en avait disparu — elle aurait défait le travail fait dans
-- l'app.
--
-- Le markdown garde un seul rôle : amorcer un niveau NEUF (2de, terminale…).
-- Y saisir 153 points à la main dans un formulaire serait une punition.
--
-- Ce que le seed ne renseigne pas, volontairement :
--   · `regime_acquisition` — au défaut ('diversite') ; c'est un choix de prof
--   · `rang` — NULL ; le programme ne propose aucune échelle de difficulté
-- ============================================================================

do $bootstrap$
BEGIN

IF EXISTS (SELECT 1 FROM public.curriculum_themes WHERE grade = '1_SPE') THEN
	RAISE NOTICE 'Référentiel 1_SPE déjà amorcé — aucune modification.';
	RETURN;
END IF;

-- ---------------------------------------------------------------------------
-- 1. Thèmes
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_themes (grade, name, display_order) VALUES
	('1_SPE', $$Vocabulaire ensembliste et logique$$, 1),
	('1_SPE', $$Algorithmique et programmation$$, 2),
	('1_SPE', $$Algèbre$$, 3),
	('1_SPE', $$Analyse$$, 4),
	('1_SPE', $$Géométrie$$, 5),
	('1_SPE', $$Probabilités et statistiques$$, 6);

-- ---------------------------------------------------------------------------
-- 2. Objectifs
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_objectives (theme_id, name, display_order)
SELECT t.id, v.objective_name, v.ord
FROM (VALUES
	($$Vocabulaire ensembliste et logique$$, $$Ensembles$$, 1),
	($$Vocabulaire ensembliste et logique$$, $$Logique et raisonnement$$, 2),
	($$Algorithmique et programmation$$, $$Notion de liste$$, 1),
	($$Algèbre$$, $$Suites numériques, modèles discrets$$, 1),
	($$Algèbre$$, $$Équations, fonctions polynômes du second degré$$, 2),
	($$Analyse$$, $$Dérivation$$, 1),
	($$Analyse$$, $$Variations et courbes représentatives des fonctions$$, 2),
	($$Analyse$$, $$Fonction exponentielle$$, 3),
	($$Analyse$$, $$Trigonométrie$$, 4),
	($$Géométrie$$, $$Calcul vectoriel et produit scalaire$$, 1),
	($$Géométrie$$, $$Géométrie repérée$$, 2),
	($$Probabilités et statistiques$$, $$Probabilités conditionnelles et indépendance$$, 1),
	($$Probabilités et statistiques$$, $$Variables aléatoires réelles$$, 2),
	($$Probabilités et statistiques$$, $$Expérimentations$$, 3)
) AS v(theme_name, objective_name, ord)
JOIN public.curriculum_themes t ON t.grade = '1_SPE' AND t.name = v.theme_name;

-- ---------------------------------------------------------------------------
-- 3. Points
-- ---------------------------------------------------------------------------
-- `code` explicite : la série du markdown. Le trigger d'attribution ne prend
-- la main que pour les points créés ensuite depuis l'app, qui prennent la suite.
INSERT INTO public.curriculum_points (objective_id, code, name, display_order, kind, exigence)
SELECT o.id, v.code, v.point_name, v.ord, v.kind, v.exigence
FROM (VALUES
	($$1SPE-001$$, $$Vocabulaire ensembliste et logique$$, $$Ensembles$$, $$Notions d'élément d'un ensemble, de sous-ensemble, d'ensemble vide, d'appartenance et d'inclusion, de réunion, d'intersection et de complémentaire$$, 1, $$connaissance$$, $$attendu$$),
	($$1SPE-002$$, $$Vocabulaire ensembliste et logique$$, $$Ensembles$$, $$Symboles de base correspondants : `Ø`, `∈`, `⊂`, `∩`, `∪`, `{ … }`$$, 2, $$connaissance$$, $$attendu$$),
	($$1SPE-003$$, $$Vocabulaire ensembliste et logique$$, $$Ensembles$$, $$Notation des ensembles de nombres et des intervalles$$, 3, $$connaissance$$, $$attendu$$),
	($$1SPE-004$$, $$Vocabulaire ensembliste et logique$$, $$Ensembles$$, $$Notion de couple et de produit cartésien de deux ensembles$$, 4, $$connaissance$$, $$attendu$$),
	($$1SPE-005$$, $$Vocabulaire ensembliste et logique$$, $$Ensembles$$, $$Notation du complémentaire d'un sous-ensemble `A` de `E` : `Ā` (notation des probabilités) ou `E \ A`$$, 5, $$connaissance$$, $$attendu$$),
	($$1SPE-006$$, $$Vocabulaire ensembliste et logique$$, $$Ensembles$$, $$Notation `Card(A)` pour le cardinal d'un ensemble fini$$, 6, $$connaissance$$, $$attendu$$),
	($$1SPE-007$$, $$Vocabulaire ensembliste et logique$$, $$Logique et raisonnement$$, $$Lire et écrire des propositions contenant les connecteurs logiques « et », « ou »$$, 1, $$savoir_faire$$, $$attendu$$),
	($$1SPE-008$$, $$Vocabulaire ensembliste et logique$$, $$Logique et raisonnement$$, $$Mobiliser un contre-exemple pour montrer qu'une proposition est fausse$$, 2, $$savoir_faire$$, $$attendu$$),
	($$1SPE-009$$, $$Vocabulaire ensembliste et logique$$, $$Logique et raisonnement$$, $$Formuler une implication, une équivalence logique, et les mobiliser dans un raisonnement simple$$, 3, $$savoir_faire$$, $$attendu$$),
	($$1SPE-010$$, $$Vocabulaire ensembliste et logique$$, $$Logique et raisonnement$$, $$Formuler la réciproque d'une implication, la contraposée$$, 4, $$savoir_faire$$, $$attendu$$),
	($$1SPE-011$$, $$Vocabulaire ensembliste et logique$$, $$Logique et raisonnement$$, $$Employer les expressions « condition nécessaire », « condition suffisante »$$, 5, $$savoir_faire$$, $$attendu$$),
	($$1SPE-012$$, $$Vocabulaire ensembliste et logique$$, $$Logique et raisonnement$$, $$Identifier le statut des égalités (identité, équation) et celui des lettres utilisées (variable, inconnue, paramètre)$$, 6, $$savoir_faire$$, $$attendu$$),
	($$1SPE-013$$, $$Vocabulaire ensembliste et logique$$, $$Logique et raisonnement$$, $$Utiliser les quantificateurs (les symboles `∀` et `∃` ne sont pas exigibles) et repérer les quantifications implicites, particulièrement dans les propositions conditionnelles$$, 7, $$savoir_faire$$, $$attendu$$),
	($$1SPE-014$$, $$Vocabulaire ensembliste et logique$$, $$Logique et raisonnement$$, $$Formuler la négation de propositions quantifiées$$, 8, $$savoir_faire$$, $$attendu$$),
	($$1SPE-015$$, $$Vocabulaire ensembliste et logique$$, $$Logique et raisonnement$$, $$Produire un raisonnement par disjonction des cas$$, 9, $$savoir_faire$$, $$attendu$$),
	($$1SPE-016$$, $$Vocabulaire ensembliste et logique$$, $$Logique et raisonnement$$, $$Produire un raisonnement par l'absurde$$, 10, $$savoir_faire$$, $$attendu$$),
	($$1SPE-017$$, $$Vocabulaire ensembliste et logique$$, $$Logique et raisonnement$$, $$Produire un raisonnement par contraposée$$, 11, $$savoir_faire$$, $$attendu$$),
	($$1SPE-018$$, $$Algorithmique et programmation$$, $$Notion de liste$$, $$Génération des listes en extension et en compréhension, en lien avec la notion d'ensemble$$, 1, $$connaissance$$, $$attendu$$),
	($$1SPE-019$$, $$Algorithmique et programmation$$, $$Notion de liste$$, $$Générer une liste (en extension, par ajouts successifs ou en compréhension)$$, 2, $$savoir_faire$$, $$attendu$$),
	($$1SPE-020$$, $$Algorithmique et programmation$$, $$Notion de liste$$, $$Manipuler des éléments d'une liste (ajouter, supprimer, etc.) et leurs indices$$, 3, $$savoir_faire$$, $$attendu$$),
	($$1SPE-021$$, $$Algorithmique et programmation$$, $$Notion de liste$$, $$Parcourir une liste$$, 4, $$savoir_faire$$, $$attendu$$),
	($$1SPE-022$$, $$Algorithmique et programmation$$, $$Notion de liste$$, $$Itérer sur les éléments d'une liste$$, 5, $$savoir_faire$$, $$attendu$$),
	($$1SPE-023$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Exemples de modes de génération d'une suite : explicite `uₙ = f(n)`, par une relation de récurrence `uₙ₊₁ = f(uₙ)`, par un algorithme, par des motifs géométriques$$, 1, $$connaissance$$, $$attendu$$),
	($$1SPE-024$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Notations : `u(n)`, `uₙ`, `(u(n))`, `(uₙ)`$$, 2, $$connaissance$$, $$attendu$$),
	($$1SPE-025$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Suites arithmétiques : exemples, définition, calcul du terme général ; lien avec l'étude d'évolutions successives à accroissements constants ; lien avec les fonctions affines ; calcul de `1 + 2 + … + n`$$, 3, $$connaissance$$, $$attendu$$),
	($$1SPE-026$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Suites géométriques : exemples, définition, calcul du terme général ; lien avec l'étude d'évolutions successives à taux constant ; lien avec la fonction exponentielle ; calcul de `1 + q + … + qⁿ`$$, 4, $$connaissance$$, $$attendu$$),
	($$1SPE-027$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Sens de variation d'une suite$$, 5, $$connaissance$$, $$attendu$$),
	($$1SPE-028$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Introduction intuitive, sur des exemples, de la notion de limite finie ou infinie, ou de l'absence de limite d'une suite$$, 6, $$connaissance$$, $$attendu$$),
	($$1SPE-029$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Dans le cadre de l'étude d'une suite, utiliser le registre de la langue naturelle, le registre algébrique, le registre graphique, et passer de l'un à l'autre$$, 7, $$savoir_faire$$, $$attendu$$),
	($$1SPE-030$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Proposer, modéliser une situation permettant de générer une suite de nombres$$, 8, $$savoir_faire$$, $$attendu$$),
	($$1SPE-031$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Déterminer une relation explicite ou une relation de récurrence pour une suite définie par un motif géométrique, par une question de dénombrement$$, 9, $$savoir_faire$$, $$attendu$$),
	($$1SPE-032$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Calculer des termes d'une suite définie explicitement, par récurrence ou par un algorithme$$, 10, $$savoir_faire$$, $$attendu$$),
	($$1SPE-033$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Pour une suite arithmétique ou géométrique, calculer le terme général, la somme de termes consécutifs, déterminer le sens de variation$$, 11, $$savoir_faire$$, $$attendu$$),
	($$1SPE-034$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Modéliser un phénomène discret à croissance linéaire par une suite arithmétique, un phénomène discret à croissance exponentielle par une suite géométrique$$, 12, $$savoir_faire$$, $$attendu$$),
	($$1SPE-035$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Conjecturer, dans des cas simples, la limite éventuelle d'une suite$$, 13, $$savoir_faire$$, $$attendu$$),
	($$1SPE-036$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Calcul du terme général d'une suite arithmétique, d'une suite géométrique$$, 14, $$demonstration$$, $$attendu$$),
	($$1SPE-037$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Calcul de `1 + 2 + … + n`$$, 15, $$demonstration$$, $$attendu$$),
	($$1SPE-038$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Calcul de `1 + q + … + qⁿ`$$, 16, $$demonstration$$, $$attendu$$),
	($$1SPE-039$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Calcul de termes d'une suite, de sommes de termes, de seuil$$, 17, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-040$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Calcul de factorielle$$, 18, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-041$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Liste des premiers termes d'une suite : suites de Syracuse, suite de Fibonacci$$, 19, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-042$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Tour de Hanoï$$, 20, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-043$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Somme des n premiers carrés, des n premiers cubes$$, 21, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-044$$, $$Algèbre$$, $$Suites numériques, modèles discrets$$, $$Remboursement d'un emprunt par annuités constantes$$, 22, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-045$$, $$Algèbre$$, $$Équations, fonctions polynômes du second degré$$, $$Fonction polynôme du second degré donnée sous forme factorisée : racines, signe, expression de la somme et du produit des racines$$, 1, $$connaissance$$, $$attendu$$),
	($$1SPE-046$$, $$Algèbre$$, $$Équations, fonctions polynômes du second degré$$, $$Forme canonique d'une fonction polynôme du second degré ; discriminant ; factorisation éventuelle ; résolution d'une équation du second degré ; signe$$, 2, $$connaissance$$, $$attendu$$),
	($$1SPE-047$$, $$Algèbre$$, $$Équations, fonctions polynômes du second degré$$, $$Étudier le signe d'une fonction polynôme du second degré donnée sous forme factorisée$$, 3, $$savoir_faire$$, $$attendu$$),
	($$1SPE-048$$, $$Algèbre$$, $$Équations, fonctions polynômes du second degré$$, $$Déterminer les fonctions polynômes du second degré s'annulant en deux nombres réels distincts$$, 4, $$savoir_faire$$, $$attendu$$),
	($$1SPE-049$$, $$Algèbre$$, $$Équations, fonctions polynômes du second degré$$, $$Factoriser une fonction polynôme du second degré en diversifiant les stratégies : racine évidente, détection des racines par leur somme et leur produit, identité remarquable, application des formules générales$$, 5, $$savoir_faire$$, $$attendu$$),
	($$1SPE-050$$, $$Algèbre$$, $$Équations, fonctions polynômes du second degré$$, $$Choisir une forme adaptée (développée réduite, canonique, factorisée) d'une fonction polynôme du second degré dans le cadre de la résolution d'un problème (équation, inéquation, optimisation, variations)$$, 6, $$savoir_faire$$, $$attendu$$),
	($$1SPE-051$$, $$Algèbre$$, $$Équations, fonctions polynômes du second degré$$, $$Résolution de l'équation du second degré$$, 7, $$demonstration$$, $$attendu$$),
	($$1SPE-052$$, $$Algèbre$$, $$Équations, fonctions polynômes du second degré$$, $$Factorisation d'un polynôme du troisième degré admettant une racine, et résolution de l'équation associée$$, 8, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-053$$, $$Algèbre$$, $$Équations, fonctions polynômes du second degré$$, $$Factorisation de `xⁿ − 1` par `x − 1`, de `xⁿ − aⁿ` par `x − a`$$, 9, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-054$$, $$Algèbre$$, $$Équations, fonctions polynômes du second degré$$, $$Déterminer deux nombres réels connaissant leur somme `s` et leur produit `p` comme racines de la fonction polynôme `x ↦ x² − sx + p`$$, 10, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-055$$, $$Analyse$$, $$Dérivation$$, $$Taux de variation ; sécantes à la courbe représentative d'une fonction en un point donné$$, 1, $$connaissance$$, $$attendu$$),
	($$1SPE-056$$, $$Analyse$$, $$Dérivation$$, $$Nombre dérivé d'une fonction en un point, comme limite du taux de variation ; notation `f'(a)`$$, 2, $$connaissance$$, $$attendu$$),
	($$1SPE-057$$, $$Analyse$$, $$Dérivation$$, $$Tangente à la courbe représentative d'une fonction en un point, comme « limite des sécantes » ; pente ; équation `y = f(a) + f'(a)(x − a)`$$, 3, $$connaissance$$, $$attendu$$),
	($$1SPE-058$$, $$Analyse$$, $$Dérivation$$, $$Approximation linéaire : fonction affine tangente `x ↦ f(a) + f'(a)(x − a)` et approximation de `f(a + h)` par `f(a) + f'(a)h`$$, 4, $$connaissance$$, $$attendu$$),
	($$1SPE-059$$, $$Analyse$$, $$Dérivation$$, $$Fonction dérivable sur un intervalle ; fonction dérivée$$, 5, $$connaissance$$, $$attendu$$),
	($$1SPE-060$$, $$Analyse$$, $$Dérivation$$, $$Fonction dérivée des fonctions carré, cube, inverse, racine carrée$$, 6, $$connaissance$$, $$attendu$$),
	($$1SPE-061$$, $$Analyse$$, $$Dérivation$$, $$Opérations sur les fonctions dérivables : somme, produit, inverse, quotient$$, 7, $$connaissance$$, $$attendu$$),
	($$1SPE-062$$, $$Analyse$$, $$Dérivation$$, $$Pour `n` dans `ℤ`, fonction dérivée de la fonction `x ↦ xⁿ`$$, 8, $$connaissance$$, $$attendu$$),
	($$1SPE-063$$, $$Analyse$$, $$Dérivation$$, $$Fonction valeur absolue : étude de la dérivabilité en 0$$, 9, $$connaissance$$, $$attendu$$),
	($$1SPE-064$$, $$Analyse$$, $$Dérivation$$, $$Calculer un taux de variation, la pente d'une sécante$$, 10, $$savoir_faire$$, $$attendu$$),
	($$1SPE-065$$, $$Analyse$$, $$Dérivation$$, $$Interpréter le nombre dérivé en contexte : pente d'une tangente, vitesse instantanée, cout marginal, etc.$$, 11, $$savoir_faire$$, $$attendu$$),
	($$1SPE-066$$, $$Analyse$$, $$Dérivation$$, $$Déterminer graphiquement un nombre dérivé par la pente de la tangente$$, 12, $$savoir_faire$$, $$attendu$$),
	($$1SPE-067$$, $$Analyse$$, $$Dérivation$$, $$Construire la tangente en un point à une courbe représentative connaissant le nombre dérivé$$, 13, $$savoir_faire$$, $$attendu$$),
	($$1SPE-068$$, $$Analyse$$, $$Dérivation$$, $$Déterminer l'équation de la tangente en un point à la courbe représentative d'une fonction$$, 14, $$savoir_faire$$, $$attendu$$),
	($$1SPE-069$$, $$Analyse$$, $$Dérivation$$, $$Calculer une valeur approchée de `f(a + h)`$$, 15, $$savoir_faire$$, $$attendu$$),
	($$1SPE-070$$, $$Analyse$$, $$Dérivation$$, $$Dans des cas simples, calculer une fonction dérivée en utilisant les propriétés des opérations sur les fonctions dérivables$$, 16, $$savoir_faire$$, $$attendu$$),
	($$1SPE-071$$, $$Analyse$$, $$Dérivation$$, $$Équation de la tangente en un point à une courbe représentative$$, 17, $$demonstration$$, $$attendu$$),
	($$1SPE-072$$, $$Analyse$$, $$Dérivation$$, $$La fonction racine carrée n'est pas dérivable en 0$$, 18, $$demonstration$$, $$attendu$$),
	($$1SPE-073$$, $$Analyse$$, $$Dérivation$$, $$Fonction dérivée de la fonction carrée, de la fonction inverse$$, 19, $$demonstration$$, $$attendu$$),
	($$1SPE-074$$, $$Analyse$$, $$Dérivation$$, $$Fonction dérivée d'un produit$$, 20, $$demonstration$$, $$attendu$$),
	($$1SPE-075$$, $$Analyse$$, $$Dérivation$$, $$Écrire la liste des coefficients directeurs des sécantes pour un pas donné$$, 21, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-076$$, $$Analyse$$, $$Variations et courbes représentatives des fonctions$$, $$Représentation algébrique et graphique de fonctions paires, impaires ; traduction géométrique$$, 1, $$connaissance$$, $$attendu$$),
	($$1SPE-077$$, $$Analyse$$, $$Variations et courbes représentatives des fonctions$$, $$Lien entre le sens de variation d'une fonction dérivable sur un intervalle et le signe de sa fonction dérivée ; caractérisation des fonctions constantes$$, 2, $$connaissance$$, $$attendu$$),
	($$1SPE-078$$, $$Analyse$$, $$Variations et courbes représentatives des fonctions$$, $$Nombre dérivé en un extrémum, tangente à la courbe représentative$$, 3, $$connaissance$$, $$attendu$$),
	($$1SPE-079$$, $$Analyse$$, $$Variations et courbes représentatives des fonctions$$, $$Étudier les variations d'une fonction ; déterminer les extrémums$$, 4, $$savoir_faire$$, $$attendu$$),
	($$1SPE-080$$, $$Analyse$$, $$Variations et courbes représentatives des fonctions$$, $$Résoudre un problème d'optimisation$$, 5, $$savoir_faire$$, $$attendu$$),
	($$1SPE-081$$, $$Analyse$$, $$Variations et courbes représentatives des fonctions$$, $$Exploiter les variations d'une fonction pour établir une inégalité ; étudier la position relative de deux courbes représentatives$$, 6, $$savoir_faire$$, $$attendu$$),
	($$1SPE-082$$, $$Analyse$$, $$Variations et courbes représentatives des fonctions$$, $$Étudier, en lien avec la dérivation, une fonction polynôme du second degré : variations, extrémum, allure selon le signe du coefficient de `x²`$$, 7, $$savoir_faire$$, $$attendu$$),
	($$1SPE-083$$, $$Analyse$$, $$Variations et courbes représentatives des fonctions$$, $$Méthode de Newton, en se limitant à des cas favorables$$, 8, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-084$$, $$Analyse$$, $$Fonction exponentielle$$, $$Définition de la fonction exponentielle comme unique fonction dérivable sur `ℝ` vérifiant `f' = f` et `f(0) = 1` (existence et unicité admises) ; notation `exp(x)`$$, 1, $$connaissance$$, $$attendu$$),
	($$1SPE-085$$, $$Analyse$$, $$Fonction exponentielle$$, $$Pour tous réels `x` et `y`, `exp(x + y) = exp(x)exp(y)` et `exp(x)exp(−x) = 1` ; nombre `e` ; notation `eˣ`$$, 2, $$connaissance$$, $$attendu$$),
	($$1SPE-086$$, $$Analyse$$, $$Fonction exponentielle$$, $$Signe, sens de variation et courbe représentative de la fonction exponentielle ; lien avec les suites géométriques$$, 3, $$connaissance$$, $$attendu$$),
	($$1SPE-087$$, $$Analyse$$, $$Fonction exponentielle$$, $$Transformer une expression en utilisant les propriétés algébriques de la fonction exponentielle$$, 4, $$savoir_faire$$, $$attendu$$),
	($$1SPE-088$$, $$Analyse$$, $$Fonction exponentielle$$, $$Pour `a` réel, dérivée de la fonction `t ↦ e^(at)`$$, 5, $$savoir_faire$$, $$attendu$$),
	($$1SPE-089$$, $$Analyse$$, $$Fonction exponentielle$$, $$Pour une valeur numérique strictement positive de `k`, représenter graphiquement les fonctions `t ↦ e^(−kt)` et `t ↦ e^(kt)`$$, 6, $$savoir_faire$$, $$attendu$$),
	($$1SPE-090$$, $$Analyse$$, $$Fonction exponentielle$$, $$Modéliser une situation par une croissance, une décroissance exponentielle (évolution d'un capital à taux fixe, décroissance radioactive)$$, 7, $$savoir_faire$$, $$attendu$$),
	($$1SPE-091$$, $$Analyse$$, $$Fonction exponentielle$$, $$Construction de l'exponentielle par la méthode d'Euler$$, 8, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-092$$, $$Analyse$$, $$Fonction exponentielle$$, $$Détermination d'une valeur approchée de `e` à l'aide de la suite `((1 + 1/n)ⁿ)`$$, 9, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-093$$, $$Analyse$$, $$Fonction exponentielle$$, $$Unicité d'une fonction `f` dérivable sur `ℝ` vérifiant `f' = f` et `f(0) = 1`$$, 10, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-094$$, $$Analyse$$, $$Fonction exponentielle$$, $$Pour tous réels `x` et `y`, `exp(x + y) = exp(x)exp(y)`$$, 11, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-095$$, $$Analyse$$, $$Fonction exponentielle$$, $$La fonction exponentielle est strictement positive et croissante$$, 12, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-096$$, $$Analyse$$, $$Trigonométrie$$, $$Cercle trigonométrique ; longueur d'arc ; radian$$, 1, $$connaissance$$, $$attendu$$),
	($$1SPE-097$$, $$Analyse$$, $$Trigonométrie$$, $$Enroulement de la droite sur le cercle trigonométrique ; image d'un nombre réel$$, 2, $$connaissance$$, $$attendu$$),
	($$1SPE-098$$, $$Analyse$$, $$Trigonométrie$$, $$Cosinus et sinus d'un nombre réel ; lien avec le sinus et le cosinus dans un triangle rectangle ; valeurs remarquables$$, 3, $$connaissance$$, $$attendu$$),
	($$1SPE-099$$, $$Analyse$$, $$Trigonométrie$$, $$Placer un point sur le cercle trigonométrique$$, 4, $$savoir_faire$$, $$attendu$$),
	($$1SPE-100$$, $$Analyse$$, $$Trigonométrie$$, $$Par lecture du cercle trigonométrique, déterminer, pour des valeurs remarquables de `x`, les cosinus et sinus d'angles associés à `x`$$, 5, $$savoir_faire$$, $$attendu$$),
	($$1SPE-101$$, $$Analyse$$, $$Trigonométrie$$, $$Calcul de `cos(π/4)`, `sin(π/4)`, `cos(π/3)`, `sin(π/3)`$$, 6, $$demonstration$$, $$attendu$$),
	($$1SPE-102$$, $$Analyse$$, $$Trigonométrie$$, $$Approximation de `π` par la méthode d'Archimède$$, 7, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-103$$, $$Géométrie$$, $$Calcul vectoriel et produit scalaire$$, $$Produit scalaire à partir de la projection orthogonale et de la formule avec le cosinus ; caractérisation de l'orthogonalité$$, 1, $$connaissance$$, $$attendu$$),
	($$1SPE-104$$, $$Géométrie$$, $$Calcul vectoriel et produit scalaire$$, $$Bilinéarité, symétrie ; en base orthonormée, expression du produit scalaire et de la norme, critère d'orthogonalité ; expression des coordonnées dans une base orthonormée en termes de produits scalaires avec les vecteurs de la base$$, 2, $$connaissance$$, $$attendu$$),
	($$1SPE-105$$, $$Géométrie$$, $$Calcul vectoriel et produit scalaire$$, $$Développement de `‖u⃗ + v⃗‖²` et `‖u⃗ − v⃗‖²` ; formule d'Al-Kashi$$, 3, $$connaissance$$, $$attendu$$),
	($$1SPE-106$$, $$Géométrie$$, $$Calcul vectoriel et produit scalaire$$, $$Transformation de l'expression `MA⃗ · MB⃗`$$, 4, $$connaissance$$, $$attendu$$),
	($$1SPE-107$$, $$Géométrie$$, $$Calcul vectoriel et produit scalaire$$, $$Utiliser le produit scalaire pour démontrer une orthogonalité, pour calculer un angle, une longueur dans le plan$$, 5, $$savoir_faire$$, $$attendu$$),
	($$1SPE-108$$, $$Géométrie$$, $$Calcul vectoriel et produit scalaire$$, $$En vue de la résolution d'un problème, calculer le produit scalaire de deux vecteurs en choisissant une méthode adaptée (projection orthogonale, coordonnées, normes et angle, normes)$$, 6, $$savoir_faire$$, $$attendu$$),
	($$1SPE-109$$, $$Géométrie$$, $$Calcul vectoriel et produit scalaire$$, $$Utiliser le produit scalaire pour résoudre un problème géométrique$$, 7, $$savoir_faire$$, $$attendu$$),
	($$1SPE-110$$, $$Géométrie$$, $$Calcul vectoriel et produit scalaire$$, $$Formule d'Al-Kashi (démonstration avec le produit scalaire)$$, 8, $$demonstration$$, $$attendu$$),
	($$1SPE-111$$, $$Géométrie$$, $$Calcul vectoriel et produit scalaire$$, $$Ensemble des points `M` tels que `MA⃗ · MB⃗ = 0` (démonstration avec le produit scalaire)$$, 9, $$demonstration$$, $$attendu$$),
	($$1SPE-112$$, $$Géométrie$$, $$Calcul vectoriel et produit scalaire$$, $$Loi des sinus$$, 10, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-113$$, $$Géométrie$$, $$Calcul vectoriel et produit scalaire$$, $$Concourance des hauteurs d'un triangle$$, 11, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-114$$, $$Géométrie$$, $$Calcul vectoriel et produit scalaire$$, $$Les médianes d'un triangle concourent au centre de gravité$$, 12, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-115$$, $$Géométrie$$, $$Géométrie repérée$$, $$Vecteur normal à une droite ; le vecteur de coordonnées `(a, b)` est normal à la droite d'équation `ax + by + c = 0`$$, 1, $$connaissance$$, $$attendu$$),
	($$1SPE-116$$, $$Géométrie$$, $$Géométrie repérée$$, $$Projection orthogonale d'un point sur une droite$$, 2, $$connaissance$$, $$attendu$$),
	($$1SPE-117$$, $$Géométrie$$, $$Géométrie repérée$$, $$Équation de cercle$$, 3, $$connaissance$$, $$attendu$$),
	($$1SPE-118$$, $$Géométrie$$, $$Géométrie repérée$$, $$Déterminer une équation cartésienne d'une droite connaissant un point et un vecteur normal$$, 4, $$savoir_faire$$, $$attendu$$),
	($$1SPE-119$$, $$Géométrie$$, $$Géométrie repérée$$, $$Déterminer les coordonnées du projeté orthogonal d'un point sur une droite$$, 5, $$savoir_faire$$, $$attendu$$),
	($$1SPE-120$$, $$Géométrie$$, $$Géométrie repérée$$, $$Déterminer et utiliser l'équation d'un cercle donné par son centre et son rayon$$, 6, $$savoir_faire$$, $$attendu$$),
	($$1SPE-121$$, $$Géométrie$$, $$Géométrie repérée$$, $$Reconnaitre une équation de cercle, déterminer centre et rayon$$, 7, $$savoir_faire$$, $$attendu$$),
	($$1SPE-122$$, $$Géométrie$$, $$Géométrie repérée$$, $$Utiliser un repère pour étudier une configuration$$, 8, $$savoir_faire$$, $$attendu$$),
	($$1SPE-123$$, $$Géométrie$$, $$Géométrie repérée$$, $$Recherche de l'ensemble des points équidistants de l'axe des abscisses et d'un point donné$$, 9, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-124$$, $$Géométrie$$, $$Géométrie repérée$$, $$Déterminer l'intersection d'un cercle ou d'une parabole d'équation `y = ax² + bx + c` avec une droite parallèle à un axe$$, 10, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-125$$, $$Probabilités et statistiques$$, $$Probabilités conditionnelles et indépendance$$, $$Indépendance de deux évènements$$, 1, $$connaissance$$, $$attendu$$),
	($$1SPE-126$$, $$Probabilités et statistiques$$, $$Probabilités conditionnelles et indépendance$$, $$Partition de l'univers (systèmes complets d'évènements) ; formule des probabilités totales$$, 2, $$connaissance$$, $$attendu$$),
	($$1SPE-127$$, $$Probabilités et statistiques$$, $$Probabilités conditionnelles et indépendance$$, $$Succession de deux épreuves indépendantes ; représentation par un arbre ou un tableau$$, 3, $$connaissance$$, $$attendu$$),
	($$1SPE-128$$, $$Probabilités et statistiques$$, $$Probabilités conditionnelles et indépendance$$, $$Pour `n ≤ 4`, répétition de `n` épreuves de Bernoulli indépendantes et identiques$$, 4, $$connaissance$$, $$attendu$$),
	($$1SPE-129$$, $$Probabilités et statistiques$$, $$Probabilités conditionnelles et indépendance$$, $$Dans des cas simples, calculer une probabilité à l'aide de la formule des probabilités totales$$, 5, $$savoir_faire$$, $$attendu$$),
	($$1SPE-130$$, $$Probabilités et statistiques$$, $$Probabilités conditionnelles et indépendance$$, $$Savoir utiliser ou justifier l'indépendance de deux évènements$$, 6, $$savoir_faire$$, $$attendu$$),
	($$1SPE-131$$, $$Probabilités et statistiques$$, $$Probabilités conditionnelles et indépendance$$, $$Représenter la succession de deux épreuves indépendantes par un arbre ou un tableau$$, 7, $$savoir_faire$$, $$attendu$$),
	($$1SPE-132$$, $$Probabilités et statistiques$$, $$Probabilités conditionnelles et indépendance$$, $$Pour `n ≤ 4`, représenter l'arbre associé à la répétition de `n` épreuves de Bernoulli indépendantes et identiques afin de calculer des probabilités$$, 8, $$savoir_faire$$, $$attendu$$),
	($$1SPE-133$$, $$Probabilités et statistiques$$, $$Probabilités conditionnelles et indépendance$$, $$Méthode de Monte-Carlo : estimation de l'aire sous la parabole, estimation du nombre `π`$$, 9, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-134$$, $$Probabilités et statistiques$$, $$Probabilités conditionnelles et indépendance$$, $$Exemples de succession de plusieurs épreuves indépendantes$$, 10, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-135$$, $$Probabilités et statistiques$$, $$Probabilités conditionnelles et indépendance$$, $$Exemples de marches aléatoires$$, 11, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-136$$, $$Probabilités et statistiques$$, $$Variables aléatoires réelles$$, $$Variable aléatoire réelle : modélisation du résultat numérique d'une expérience aléatoire ; formalisation comme fonction définie sur l'univers et à valeurs réelles$$, 1, $$connaissance$$, $$attendu$$),
	($$1SPE-137$$, $$Probabilités et statistiques$$, $$Variables aléatoires réelles$$, $$Loi d'une variable aléatoire$$, 2, $$connaissance$$, $$attendu$$),
	($$1SPE-138$$, $$Probabilités et statistiques$$, $$Variables aléatoires réelles$$, $$Espérance, variance, écart type d'une variable aléatoire$$, 3, $$connaissance$$, $$attendu$$),
	($$1SPE-139$$, $$Probabilités et statistiques$$, $$Variables aléatoires réelles$$, $$Linéarité de l'espérance$$, 4, $$connaissance$$, $$attendu$$),
	($$1SPE-140$$, $$Probabilités et statistiques$$, $$Variables aléatoires réelles$$, $$Formule de König-Huygens$$, 5, $$connaissance$$, $$attendu$$),
	($$1SPE-141$$, $$Probabilités et statistiques$$, $$Variables aléatoires réelles$$, $$Interpréter en situation et utiliser les notations `{X = a}`, `{X ≤ a}`, `P(X = a)`, `P(X ≤ a)`$$, 6, $$savoir_faire$$, $$attendu$$),
	($$1SPE-142$$, $$Probabilités et statistiques$$, $$Variables aléatoires réelles$$, $$Passer du registre de la langue naturelle au registre symbolique et inversement$$, 7, $$savoir_faire$$, $$attendu$$),
	($$1SPE-143$$, $$Probabilités et statistiques$$, $$Variables aléatoires réelles$$, $$Modéliser une situation à l'aide d'une variable aléatoire$$, 8, $$savoir_faire$$, $$attendu$$),
	($$1SPE-144$$, $$Probabilités et statistiques$$, $$Variables aléatoires réelles$$, $$Déterminer la loi de probabilité d'une variable aléatoire$$, 9, $$savoir_faire$$, $$attendu$$),
	($$1SPE-145$$, $$Probabilités et statistiques$$, $$Variables aléatoires réelles$$, $$Calculer une espérance, une variance, un écart type$$, 10, $$savoir_faire$$, $$attendu$$),
	($$1SPE-146$$, $$Probabilités et statistiques$$, $$Variables aléatoires réelles$$, $$Utiliser la notion d'espérance dans une résolution de problème (mise pour un jeu équitable, etc.)$$, 11, $$savoir_faire$$, $$attendu$$),
	($$1SPE-147$$, $$Probabilités et statistiques$$, $$Variables aléatoires réelles$$, $$Algorithme renvoyant l'espérance, la variance ou l'écart type d'une variable aléatoire$$, 12, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-148$$, $$Probabilités et statistiques$$, $$Variables aléatoires réelles$$, $$Fréquence d'apparition des lettres d'un texte donné, en français, en anglais$$, 13, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-149$$, $$Probabilités et statistiques$$, $$Variables aléatoires réelles$$, $$Pour `X` variable aléatoire, étude de la fonction du second degré `x ↦ E((X − x)²)`$$, 14, $$savoir_faire$$, $$approfondissement$$),
	($$1SPE-150$$, $$Probabilités et statistiques$$, $$Expérimentations$$, $$Simuler une variable aléatoire avec Python ou un tableur$$, 1, $$savoir_faire$$, $$attendu$$),
	($$1SPE-151$$, $$Probabilités et statistiques$$, $$Expérimentations$$, $$Lire, comprendre et écrire une fonction Python renvoyant la moyenne d'un échantillon de taille `n` d'une variable aléatoire$$, 2, $$savoir_faire$$, $$attendu$$),
	($$1SPE-152$$, $$Probabilités et statistiques$$, $$Expérimentations$$, $$Étudier sur des exemples la distance entre la moyenne d'un échantillon simulé de taille `n` d'une variable aléatoire et l'espérance de cette variable aléatoire$$, 3, $$savoir_faire$$, $$attendu$$),
	($$1SPE-153$$, $$Probabilités et statistiques$$, $$Expérimentations$$, $$Simuler, avec Python ou un tableur, `N` échantillons de taille `n` d'une variable aléatoire d'espérance `μ` et d'écart type `σ` ; si `m` désigne la moyenne d'un échantillon, calculer la proportion des cas où l'écart entre `m` et `μ` est inférieur ou égal à `2σ/√n`$$, 4, $$savoir_faire$$, $$attendu$$)
) AS v(code, theme_name, objective_name, point_name, ord, kind, exigence)
JOIN public.curriculum_themes t     ON t.grade = '1_SPE' AND t.name = v.theme_name
JOIN public.curriculum_objectives o ON o.theme_id = t.id AND o.name = v.objective_name;

END $bootstrap$;
