-- ============================================================================
-- Ré-amorçage du référentiel de 1ʳᵉ spécialité — relecture + formules ubumark
-- ============================================================================
-- Deux changements en une passe :
--
--   1. La relecture du programme par David (2026-08-30). Le grain de suivi
--      s'affine : 153 → 173 points, à structure inchangée (6 thèmes, 14
--      objectifs). Là où le BO enchaînait plusieurs gestes dans une puce — « …
--      démontrer une orthogonalité, calculer un angle, une longueur » — ils
--      deviennent des points distincts, parce qu'un élève peut réussir l'un
--      sans l'autre et que c'est ce qu'on veut suivre.
--
--   2. Les formules passent de l'Unicode entre backticks au LaTeX `$…$`
--      (syntaxe ubumark, rendue par MathLive dans l'application).
--
-- Les codes sont RENUMÉROTÉS à neuf, 1SPE-001 → 1SPE-173, en ordre de lecture.
-- Possible uniquement parce que rien ne les référence encore ; ce sera la
-- dernière fois. Une fois la banque de questions taguée, un code devient une
-- identité qu'on ne réattribue plus.
--
-- ⚠️ DESTRUCTIF sur le niveau `1_SPE` : la purge supprime les thèmes, donc en
-- cascade les objectifs, les points et leurs codes.
--
-- Sûr UNIQUEMENT tant que rien n'est accroché aux points. Vérifié avant
-- écriture, en prod comme en local : 0 tag de question, 0 tag d'exercice,
-- 0 couverture de cahier de texte, 0 acquisition élève, 0 liste d'automatismes.
-- NE PAS rejouer une fois la banque taguée.
--
-- Horodatée au 2026-09-02 pour passer APRÈS les 17 migrations de sécurité déjà
-- appliquées en prod : une version antérieure obligerait `db push --include-all`
-- et laisserait un trou dans l'ordre chronologique de l'historique.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Purge du niveau
-- ---------------------------------------------------------------------------

delete from public.curriculum_themes where grade = '1_SPE';

-- ---------------------------------------------------------------------------
-- 2. Ré-amorçage
-- ---------------------------------------------------------------------------

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
	('1_SPE', 'Vocabulaire ensembliste et logique', 1),
	('1_SPE', 'Algorithmique et programmation', 2),
	('1_SPE', 'Algèbre', 3),
	('1_SPE', 'Analyse', 4),
	('1_SPE', 'Géométrie', 5),
	('1_SPE', 'Probabilités et statistiques', 6);

-- ---------------------------------------------------------------------------
-- 2. Objectifs
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_objectives (theme_id, name, display_order)
SELECT t.id, v.objective_name, v.ord
FROM (VALUES
	('Vocabulaire ensembliste et logique', 'Ensembles', 1),
	('Vocabulaire ensembliste et logique', 'Logique et raisonnement', 2),
	('Algorithmique et programmation', 'Notion de liste', 1),
	('Algèbre', 'Suites numériques, modèles discrets', 1),
	('Algèbre', 'Équations, fonctions polynômes du second degré', 2),
	('Analyse', 'Dérivation', 1),
	('Analyse', 'Variations et courbes représentatives des fonctions', 2),
	('Analyse', 'Fonction exponentielle', 3),
	('Analyse', 'Trigonométrie', 4),
	('Géométrie', 'Calcul vectoriel et produit scalaire', 1),
	('Géométrie', 'Géométrie repérée', 2),
	('Probabilités et statistiques', 'Probabilités conditionnelles et indépendance', 1),
	('Probabilités et statistiques', 'Variables aléatoires réelles', 2),
	('Probabilités et statistiques', 'Expérimentations', 3)
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
	('1SPE-001', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notions d''élément d''un ensemble, de sous-ensemble, d''ensemble vide, d''appartenance et d''inclusion, de réunion, d''intersection et de complémentaire', 1, 'connaissance', 'attendu'),
	('1SPE-002', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Symboles de base correspondants : $\varnothing$, $\in$, $\subset$, $\cap$, $\cup$, $\{\,\dots\,\}$. Notation du complémentaire d''un sous-ensemble $A$ de $E$ : $\bar{A}$ (notation des probabilités) ou $E \setminus A$', 2, 'connaissance', 'attendu'),
	('1SPE-003', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notation des ensembles de nombres et des intervalles', 3, 'connaissance', 'attendu'),
	('1SPE-004', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notion de couple et de produit cartésien de deux ensembles', 4, 'connaissance', 'attendu'),
	('1SPE-005', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notation $\operatorname{Card}(A)$ pour le cardinal d''un ensemble fini', 5, 'connaissance', 'attendu'),
	('1SPE-006', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Lire et écrire des propositions contenant les connecteurs logiques « et », « ou »', 1, 'savoir_faire', 'attendu'),
	('1SPE-007', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Mobiliser un contre-exemple pour montrer qu''une proposition est fausse', 2, 'savoir_faire', 'attendu'),
	('1SPE-008', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Formuler une implication, une équivalence logique, et les mobiliser dans un raisonnement simple', 3, 'savoir_faire', 'attendu'),
	('1SPE-009', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Formuler la réciproque d''une implication, la contraposée', 4, 'savoir_faire', 'attendu'),
	('1SPE-010', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Employer les expressions « condition nécessaire », « condition suffisante »', 5, 'savoir_faire', 'attendu'),
	('1SPE-011', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Identifier le statut des égalités (identité, équation) et celui des lettres utilisées (variable, inconnue, paramètre)', 6, 'savoir_faire', 'attendu'),
	('1SPE-012', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Utiliser les quantificateurs (les symboles $\forall$ et $\exists$ ne sont pas exigibles) et repérer les quantifications implicites, particulièrement dans les propositions conditionnelles', 7, 'savoir_faire', 'attendu'),
	('1SPE-013', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Formuler la négation de propositions quantifiées', 8, 'savoir_faire', 'attendu'),
	('1SPE-014', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Produire un raisonnement par disjonction des cas', 9, 'savoir_faire', 'attendu'),
	('1SPE-015', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Produire un raisonnement par l''absurde', 10, 'savoir_faire', 'attendu'),
	('1SPE-016', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Produire un raisonnement par contraposée', 11, 'savoir_faire', 'attendu'),
	('1SPE-017', 'Algorithmique et programmation', 'Notion de liste', 'Génération des listes en extension et en compréhension, en lien avec la notion d''ensemble', 1, 'connaissance', 'attendu'),
	('1SPE-018', 'Algorithmique et programmation', 'Notion de liste', 'Générer une liste (en extension, par ajouts successifs ou en compréhension)', 2, 'savoir_faire', 'attendu'),
	('1SPE-019', 'Algorithmique et programmation', 'Notion de liste', 'Manipuler des éléments d''une liste (ajouter, supprimer, etc.) et leurs indices', 3, 'savoir_faire', 'attendu'),
	('1SPE-020', 'Algorithmique et programmation', 'Notion de liste', 'Parcourir une liste', 4, 'savoir_faire', 'attendu'),
	('1SPE-021', 'Algorithmique et programmation', 'Notion de liste', 'Itérer sur les éléments d''une liste', 5, 'savoir_faire', 'attendu'),
	('1SPE-022', 'Algèbre', 'Suites numériques, modèles discrets', 'Exemples de modes de génération d''une suite : explicite $u_n = f(n)$, par une relation de récurrence $u_{n+1} = f(u_n)$, par un algorithme, par des motifs géométriques', 1, 'connaissance', 'attendu'),
	('1SPE-023', 'Algèbre', 'Suites numériques, modèles discrets', 'Notations : $u(n)$, $u_n$, $(u(n))$, $(u_n)$', 2, 'connaissance', 'attendu'),
	('1SPE-024', 'Algèbre', 'Suites numériques, modèles discrets', 'Suites arithmétiques : exemples, définition, calcul du terme général', 3, 'connaissance', 'attendu'),
	('1SPE-025', 'Algèbre', 'Suites numériques, modèles discrets', 'Suites arithmétiques : lien avec l''étude d''évolutions successives à accroissements constants ; lien avec les fonctions affines', 4, 'connaissance', 'attendu'),
	('1SPE-026', 'Algèbre', 'Suites numériques, modèles discrets', 'Suites arithmétiques : calcul de $1 + 2 + \dots + n$', 5, 'connaissance', 'attendu'),
	('1SPE-027', 'Algèbre', 'Suites numériques, modèles discrets', 'Suites géométriques : exemples, définition, calcul du terme général', 6, 'connaissance', 'attendu'),
	('1SPE-028', 'Algèbre', 'Suites numériques, modèles discrets', 'Suites géométriques : lien avec l''étude d''évolutions successives à taux constant ; lien avec la fonction exponentielle', 7, 'connaissance', 'attendu'),
	('1SPE-029', 'Algèbre', 'Suites numériques, modèles discrets', 'Suites géométriques : calcul de $1 + q + \dots + q^n$', 8, 'connaissance', 'attendu'),
	('1SPE-030', 'Algèbre', 'Suites numériques, modèles discrets', 'Sens de variation d''une suite', 9, 'connaissance', 'attendu'),
	('1SPE-031', 'Algèbre', 'Suites numériques, modèles discrets', 'Introduction intuitive, sur des exemples, de la notion de limite finie ou infinie, ou de l''absence de limite d''une suite', 10, 'connaissance', 'attendu'),
	('1SPE-032', 'Algèbre', 'Suites numériques, modèles discrets', 'Dans le cadre de l''étude d''une suite, utiliser le registre de la langue naturelle, le registre algébrique, le registre graphique, et passer de l''un à l''autre', 11, 'savoir_faire', 'attendu'),
	('1SPE-033', 'Algèbre', 'Suites numériques, modèles discrets', 'Proposer, modéliser une situation permettant de générer une suite de nombres', 12, 'savoir_faire', 'attendu'),
	('1SPE-034', 'Algèbre', 'Suites numériques, modèles discrets', 'Déterminer une relation explicite ou une relation de récurrence pour une suite définie par un motif géométrique, par une question de dénombrement', 13, 'savoir_faire', 'attendu'),
	('1SPE-035', 'Algèbre', 'Suites numériques, modèles discrets', 'Calculer des termes d''une suite définie explicitement, par récurrence ou par un algorithme', 14, 'savoir_faire', 'attendu'),
	('1SPE-036', 'Algèbre', 'Suites numériques, modèles discrets', 'Pour une suite arithmétique ou géométrique, calculer le terme général', 15, 'savoir_faire', 'attendu'),
	('1SPE-037', 'Algèbre', 'Suites numériques, modèles discrets', 'Pour une suite arithmétique ou géométrique, calculer la somme de termes consécutifs', 16, 'savoir_faire', 'attendu'),
	('1SPE-038', 'Algèbre', 'Suites numériques, modèles discrets', 'Pour une suite arithmétique ou géométrique, déterminer le sens de variation', 17, 'savoir_faire', 'attendu'),
	('1SPE-039', 'Algèbre', 'Suites numériques, modèles discrets', 'Modéliser un phénomène discret à croissance linéaire par une suite arithmétique, un phénomène discret à croissance exponentielle par une suite géométrique', 18, 'savoir_faire', 'attendu'),
	('1SPE-040', 'Algèbre', 'Suites numériques, modèles discrets', 'Conjecturer, dans des cas simples, la limite éventuelle d''une suite', 19, 'savoir_faire', 'attendu'),
	('1SPE-041', 'Algèbre', 'Suites numériques, modèles discrets', 'Calcul du terme général d''une suite arithmétique, d''une suite géométrique', 20, 'demonstration', 'attendu'),
	('1SPE-042', 'Algèbre', 'Suites numériques, modèles discrets', 'Calcul de $1 + 2 + \dots + n$', 21, 'demonstration', 'attendu'),
	('1SPE-043', 'Algèbre', 'Suites numériques, modèles discrets', 'Calcul de $1 + q + \dots + q^n$', 22, 'demonstration', 'attendu'),
	('1SPE-044', 'Algèbre', 'Suites numériques, modèles discrets', 'Calcul de termes d''une suite, de sommes de termes, de seuil', 23, 'savoir_faire', 'approfondissement'),
	('1SPE-045', 'Algèbre', 'Suites numériques, modèles discrets', 'Calcul de factorielle', 24, 'savoir_faire', 'approfondissement'),
	('1SPE-046', 'Algèbre', 'Suites numériques, modèles discrets', 'Liste des premiers termes d''une suite : suites de Syracuse, suite de Fibonacci', 25, 'savoir_faire', 'approfondissement'),
	('1SPE-047', 'Algèbre', 'Suites numériques, modèles discrets', 'Tour de Hanoï', 26, 'savoir_faire', 'approfondissement'),
	('1SPE-048', 'Algèbre', 'Suites numériques, modèles discrets', 'Somme des n premiers carrés, des n premiers cubes', 27, 'savoir_faire', 'approfondissement'),
	('1SPE-049', 'Algèbre', 'Suites numériques, modèles discrets', 'Remboursement d''un emprunt par annuités constantes', 28, 'savoir_faire', 'approfondissement'),
	('1SPE-050', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Forme développée d''une fonction polynôme du second degré. Coefficients', 1, 'connaissance', 'attendu'),
	('1SPE-051', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Forme factorisée d''une fonction polynôme du second, racines', 2, 'connaissance', 'attendu'),
	('1SPE-052', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Forme canonique d''une fonction polynôme du second degré ; factorisation éventuelle ; recherche d''extremum', 3, 'connaissance', 'attendu'),
	('1SPE-053', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Discriminant d''une fonction polynôme du second degré. Calcul des racines', 4, 'connaissance', 'attendu'),
	('1SPE-054', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Calcul des coordonnées du sommet d''une parabole. Axe de symétrie', 5, 'connaissance', 'attendu'),
	('1SPE-055', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Résolution d''une équation du second degré', 6, 'connaissance', 'attendu'),
	('1SPE-056', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Résolution d''une inéquation du second degré', 7, 'connaissance', 'attendu'),
	('1SPE-057', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Expression de la somme et du produit des racines', 8, 'connaissance', 'attendu'),
	('1SPE-058', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Étudier le signe d''une fonction polynôme du second degré donnée sous forme factorisée', 9, 'savoir_faire', 'attendu'),
	('1SPE-059', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Déterminer les fonctions polynômes du second degré s''annulant en deux nombres réels distincts', 10, 'savoir_faire', 'attendu'),
	('1SPE-060', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Factoriser une fonction polynôme du second degré en diversifiant les stratégies : racine évidente, détection des racines par leur somme et leur produit, identité remarquable, application des formules générales', 11, 'savoir_faire', 'attendu'),
	('1SPE-061', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Choisir une forme adaptée (développée réduite, canonique, factorisée) d''une fonction polynôme du second degré dans le cadre de la résolution d''un problème (équation, inéquation, optimisation, variations)', 12, 'savoir_faire', 'attendu'),
	('1SPE-062', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Résoudre ces problèmes à l''aide du discriminant et des coefficients de la fonction polynôme du second degré', 13, 'savoir_faire', 'attendu'),
	('1SPE-063', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Résolution de l''équation du second degré', 14, 'demonstration', 'attendu'),
	('1SPE-064', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Factorisation d''un polynôme du troisième degré admettant une racine, et résolution de l''équation associée', 15, 'savoir_faire', 'approfondissement'),
	('1SPE-065', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Factorisation de $x^n - 1$ par $x - 1$, de $x^n - a^n$ par $x - a$', 16, 'savoir_faire', 'approfondissement'),
	('1SPE-066', 'Algèbre', 'Équations, fonctions polynômes du second degré', 'Déterminer deux nombres réels connaissant leur somme $s$ et leur produit $p$ comme racines de la fonction polynôme $x \mapsto x^2 - sx + p$', 17, 'savoir_faire', 'approfondissement'),
	('1SPE-067', 'Analyse', 'Dérivation', 'Taux de variation ; sécantes à la courbe représentative d''une fonction en un point donné', 1, 'connaissance', 'attendu'),
	('1SPE-068', 'Analyse', 'Dérivation', 'Nombre dérivé d''une fonction en un point, comme limite du taux de variation ; notation $f''(a)$', 2, 'connaissance', 'attendu'),
	('1SPE-069', 'Analyse', 'Dérivation', 'Tangente à la courbe représentative d''une fonction en un point, comme « limite des sécantes » ; pente ; équation $y = f(a) + f''(a)(x - a)$', 3, 'connaissance', 'attendu'),
	('1SPE-070', 'Analyse', 'Dérivation', 'Approximation linéaire : fonction affine tangente $x \mapsto f(a) + f''(a)(x - a)$ et approximation de $f(a + h)$ par $f(a) + f''(a)h$', 4, 'connaissance', 'attendu'),
	('1SPE-071', 'Analyse', 'Dérivation', 'Fonction dérivable sur un intervalle ; fonction dérivée', 5, 'connaissance', 'attendu'),
	('1SPE-072', 'Analyse', 'Dérivation', 'Fonction dérivée des fonctions carré, cube, inverse, racine carrée', 6, 'connaissance', 'attendu'),
	('1SPE-073', 'Analyse', 'Dérivation', 'Opérations sur les fonctions dérivables : somme, produit, inverse, quotient', 7, 'connaissance', 'attendu'),
	('1SPE-074', 'Analyse', 'Dérivation', 'Pour $n$ dans $\mathbb{Z}$, fonction dérivée de la fonction $x \mapsto x^n$', 8, 'connaissance', 'attendu'),
	('1SPE-075', 'Analyse', 'Dérivation', 'Fonction valeur absolue : étude de la dérivabilité en 0', 9, 'connaissance', 'attendu'),
	('1SPE-076', 'Analyse', 'Dérivation', 'Calculer un taux de variation, la pente d''une sécante', 10, 'savoir_faire', 'attendu'),
	('1SPE-077', 'Analyse', 'Dérivation', 'Interpréter le nombre dérivé en contexte : pente d''une tangente, vitesse instantanée, cout marginal, etc.', 11, 'savoir_faire', 'attendu'),
	('1SPE-078', 'Analyse', 'Dérivation', 'Déterminer graphiquement un nombre dérivé par la pente de la tangente', 12, 'savoir_faire', 'attendu'),
	('1SPE-079', 'Analyse', 'Dérivation', 'Construire la tangente en un point à une courbe représentative connaissant le nombre dérivé', 13, 'savoir_faire', 'attendu'),
	('1SPE-080', 'Analyse', 'Dérivation', 'Déterminer l''équation de la tangente en un point à la courbe représentative d''une fonction', 14, 'savoir_faire', 'attendu'),
	('1SPE-081', 'Analyse', 'Dérivation', 'Calculer une valeur approchée de $f(a + h)$', 15, 'savoir_faire', 'attendu'),
	('1SPE-082', 'Analyse', 'Dérivation', 'Dans des cas simples, calculer une fonction dérivée en utilisant les propriétés des opérations sur les fonctions dérivables', 16, 'savoir_faire', 'attendu'),
	('1SPE-083', 'Analyse', 'Dérivation', 'Équation de la tangente en un point à une courbe représentative', 17, 'demonstration', 'attendu'),
	('1SPE-084', 'Analyse', 'Dérivation', 'La fonction racine carrée n''est pas dérivable en 0', 18, 'demonstration', 'attendu'),
	('1SPE-085', 'Analyse', 'Dérivation', 'Fonction dérivée de la fonction carrée, de la fonction inverse', 19, 'demonstration', 'attendu'),
	('1SPE-086', 'Analyse', 'Dérivation', 'Fonction dérivée d''un produit', 20, 'demonstration', 'attendu'),
	('1SPE-087', 'Analyse', 'Dérivation', 'Écrire la liste des coefficients directeurs des sécantes pour un pas donné', 21, 'savoir_faire', 'approfondissement'),
	('1SPE-088', 'Analyse', 'Variations et courbes représentatives des fonctions', 'Représentation algébrique et graphique de fonctions paires, impaires ; traduction géométrique', 1, 'connaissance', 'attendu'),
	('1SPE-089', 'Analyse', 'Variations et courbes représentatives des fonctions', 'Lien entre le sens de variation d''une fonction dérivable sur un intervalle et le signe de sa fonction dérivée ; caractérisation des fonctions constantes', 2, 'connaissance', 'attendu'),
	('1SPE-090', 'Analyse', 'Variations et courbes représentatives des fonctions', 'Nombre dérivé en un extrémum', 3, 'connaissance', 'attendu'),
	('1SPE-091', 'Analyse', 'Variations et courbes représentatives des fonctions', 'Étudier les variations d''une fonction ; déterminer les extrémums', 4, 'savoir_faire', 'attendu'),
	('1SPE-092', 'Analyse', 'Variations et courbes représentatives des fonctions', 'Résoudre un problème d''optimisation', 5, 'savoir_faire', 'attendu'),
	('1SPE-093', 'Analyse', 'Variations et courbes représentatives des fonctions', 'Exploiter les variations d''une fonction pour établir une inégalité ; étudier la position relative de deux courbes représentatives', 6, 'savoir_faire', 'attendu'),
	('1SPE-094', 'Analyse', 'Variations et courbes représentatives des fonctions', 'Étudier, en lien avec la dérivation, une fonction polynôme du second degré : variations, extrémum, allure selon le signe du coefficient de $x^2$', 7, 'savoir_faire', 'attendu'),
	('1SPE-095', 'Analyse', 'Variations et courbes représentatives des fonctions', 'Méthode de Newton, en se limitant à des cas favorables', 8, 'savoir_faire', 'approfondissement'),
	('1SPE-096', 'Analyse', 'Fonction exponentielle', 'Définition de la fonction exponentielle comme unique fonction dérivable sur $\mathbb{R}$ vérifiant $f'' = f$ et $f(0) = 1$ (existence et unicité admises) ; notation $\exp(x)$', 1, 'connaissance', 'attendu'),
	('1SPE-097', 'Analyse', 'Fonction exponentielle', 'Pour tous réels $x$ et $y$, $\exp(x + y) = \exp(x)\exp(y)$ et $\exp(x)\exp(-x) = 1$', 2, 'connaissance', 'attendu'),
	('1SPE-098', 'Analyse', 'Fonction exponentielle', 'Nombre $e$ ; notation $e^x$', 3, 'connaissance', 'attendu'),
	('1SPE-099', 'Analyse', 'Fonction exponentielle', 'Signe, sens de variation et courbe représentative de la fonction exponentielle', 4, 'connaissance', 'attendu'),
	('1SPE-100', 'Analyse', 'Fonction exponentielle', 'Lien avec les suites géométriques', 5, 'connaissance', 'attendu'),
	('1SPE-101', 'Analyse', 'Fonction exponentielle', 'Transformer une expression en utilisant les propriétés algébriques de la fonction exponentielle', 6, 'savoir_faire', 'attendu'),
	('1SPE-102', 'Analyse', 'Fonction exponentielle', 'Pour $a$ réel, dérivée de la fonction $t \mapsto e^{at}$', 7, 'savoir_faire', 'attendu'),
	('1SPE-103', 'Analyse', 'Fonction exponentielle', 'Pour une valeur numérique strictement positive de $k$, représenter graphiquement les fonctions $t \mapsto e^{-kt}$ et $t \mapsto e^{kt}$', 8, 'savoir_faire', 'attendu'),
	('1SPE-104', 'Analyse', 'Fonction exponentielle', 'Modéliser une situation par une croissance, une décroissance exponentielle (évolution d''un capital à taux fixe, décroissance radioactive)', 9, 'savoir_faire', 'attendu'),
	('1SPE-105', 'Analyse', 'Fonction exponentielle', 'Construction de l''exponentielle par la méthode d''Euler', 10, 'savoir_faire', 'approfondissement'),
	('1SPE-106', 'Analyse', 'Fonction exponentielle', 'Détermination d''une valeur approchée de $e$ à l''aide de la suite $\left(\left(1 + \tfrac{1}{n}\right)^n\right)$', 11, 'savoir_faire', 'approfondissement'),
	('1SPE-107', 'Analyse', 'Fonction exponentielle', 'Unicité d''une fonction $f$ dérivable sur $\mathbb{R}$ vérifiant $f'' = f$ et $f(0) = 1$', 12, 'savoir_faire', 'approfondissement'),
	('1SPE-108', 'Analyse', 'Fonction exponentielle', 'Pour tous réels $x$ et $y$, $\exp(x + y) = \exp(x)\exp(y)$', 13, 'savoir_faire', 'approfondissement'),
	('1SPE-109', 'Analyse', 'Fonction exponentielle', 'La fonction exponentielle est strictement positive et croissante', 14, 'savoir_faire', 'approfondissement'),
	('1SPE-110', 'Analyse', 'Trigonométrie', 'Cercle trigonométrique ; longueur d''arc ; radian', 1, 'connaissance', 'attendu'),
	('1SPE-111', 'Analyse', 'Trigonométrie', 'Enroulement de la droite sur le cercle trigonométrique ; image d''un nombre réel', 2, 'connaissance', 'attendu'),
	('1SPE-112', 'Analyse', 'Trigonométrie', 'Cosinus et sinus d''un nombre réel ; lien avec le sinus et le cosinus dans un triangle rectangle ; valeurs remarquables', 3, 'connaissance', 'attendu'),
	('1SPE-113', 'Analyse', 'Trigonométrie', 'Placer un point sur le cercle trigonométrique', 4, 'savoir_faire', 'attendu'),
	('1SPE-114', 'Analyse', 'Trigonométrie', 'Par lecture du cercle trigonométrique, déterminer, pour des valeurs remarquables de $x$, les cosinus et sinus d''angles associés à $x$', 5, 'savoir_faire', 'attendu'),
	('1SPE-115', 'Analyse', 'Trigonométrie', 'Calcul de $\cos\left(\tfrac{\pi}{4}\right)$, $\sin\left(\tfrac{\pi}{4}\right)$, $\cos\left(\tfrac{\pi}{3}\right)$, $\sin\left(\tfrac{\pi}{3}\right)$', 6, 'demonstration', 'attendu'),
	('1SPE-116', 'Analyse', 'Trigonométrie', 'Approximation de $\pi$ par la méthode d''Archimède', 7, 'savoir_faire', 'approfondissement'),
	('1SPE-117', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'Produit scalaire à partir de la projection orthogonale et de la formule avec le cosinus', 1, 'connaissance', 'attendu'),
	('1SPE-118', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'Caractérisation de l''orthogonalité', 2, 'connaissance', 'attendu'),
	('1SPE-119', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'Bilinéarité, symétrie', 3, 'connaissance', 'attendu'),
	('1SPE-120', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'En base orthonormée, expression du produit scalaire et de la norme', 4, 'connaissance', 'attendu'),
	('1SPE-121', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'Expression des coordonnées dans une base orthonormée en termes de produits scalaires avec les vecteurs de la base', 5, 'connaissance', 'attendu'),
	('1SPE-122', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'Développement de $\|\vec{u} + \vec{v}\|^2$ et $\|\vec{u} - \vec{v}\|^2$', 6, 'connaissance', 'attendu'),
	('1SPE-123', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'Formule d''Al-Kashi', 7, 'connaissance', 'attendu'),
	('1SPE-124', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'Transformation de l''expression $\overrightarrow{MA} \cdot \overrightarrow{MB}$', 8, 'connaissance', 'attendu'),
	('1SPE-125', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'Utiliser le produit scalaire pour démontrer une orthogonalité', 9, 'savoir_faire', 'attendu'),
	('1SPE-126', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'Utiliser le produit scalaire pour calculer un angle', 10, 'savoir_faire', 'attendu'),
	('1SPE-127', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'Utiliser le produit scalaire pour calculer une longueur dans le plan', 11, 'savoir_faire', 'attendu'),
	('1SPE-128', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'En vue de la résolution d''un problème, calculer le produit scalaire de deux vecteurs en choisissant une méthode adaptée (projection orthogonale, coordonnées, normes et angle, normes)', 12, 'savoir_faire', 'attendu'),
	('1SPE-129', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'Utiliser le produit scalaire pour résoudre un problème géométrique', 13, 'savoir_faire', 'attendu'),
	('1SPE-130', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'Formule d''Al-Kashi (démonstration avec le produit scalaire)', 14, 'demonstration', 'attendu'),
	('1SPE-131', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'Ensemble des points $M$ tels que $\overrightarrow{MA} \cdot \overrightarrow{MB} = 0$ (démonstration avec le produit scalaire)', 15, 'demonstration', 'attendu'),
	('1SPE-132', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'Loi des sinus', 16, 'savoir_faire', 'approfondissement'),
	('1SPE-133', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'Concourance des hauteurs d''un triangle', 17, 'savoir_faire', 'approfondissement'),
	('1SPE-134', 'Géométrie', 'Calcul vectoriel et produit scalaire', 'Les médianes d''un triangle concourent au centre de gravité', 18, 'savoir_faire', 'approfondissement'),
	('1SPE-135', 'Géométrie', 'Géométrie repérée', 'Vecteur normal à une droite ; le vecteur de coordonnées $(a\,;\,b)$ est normal à la droite d''équation $ax + by + c = 0$', 1, 'connaissance', 'attendu'),
	('1SPE-136', 'Géométrie', 'Géométrie repérée', 'Projection orthogonale d''un point sur une droite', 2, 'connaissance', 'attendu'),
	('1SPE-137', 'Géométrie', 'Géométrie repérée', 'Équation de cercle', 3, 'connaissance', 'attendu'),
	('1SPE-138', 'Géométrie', 'Géométrie repérée', 'Déterminer une équation cartésienne d''une droite connaissant un point et un vecteur normal', 4, 'savoir_faire', 'attendu'),
	('1SPE-139', 'Géométrie', 'Géométrie repérée', 'Déterminer les coordonnées du projeté orthogonal d''un point sur une droite', 5, 'savoir_faire', 'attendu'),
	('1SPE-140', 'Géométrie', 'Géométrie repérée', 'Déterminer et utiliser l''équation d''un cercle donné par son centre et son rayon', 6, 'savoir_faire', 'attendu'),
	('1SPE-141', 'Géométrie', 'Géométrie repérée', 'Reconnaitre une équation de cercle, déterminer centre et rayon', 7, 'savoir_faire', 'attendu'),
	('1SPE-142', 'Géométrie', 'Géométrie repérée', 'Utiliser un repère pour étudier une configuration', 8, 'savoir_faire', 'attendu'),
	('1SPE-143', 'Géométrie', 'Géométrie repérée', 'Recherche de l''ensemble des points équidistants de l''axe des abscisses et d''un point donné', 9, 'savoir_faire', 'approfondissement'),
	('1SPE-144', 'Géométrie', 'Géométrie repérée', 'Déterminer l''intersection d''un cercle ou d''une parabole d''équation $y = ax^2 + bx + c$ avec une droite parallèle à un axe', 10, 'savoir_faire', 'approfondissement'),
	('1SPE-145', 'Probabilités et statistiques', 'Probabilités conditionnelles et indépendance', 'Indépendance de deux évènements.', 1, 'connaissance', 'attendu'),
	('1SPE-146', 'Probabilités et statistiques', 'Probabilités conditionnelles et indépendance', 'Partition de l''univers (systèmes complets d''évènements) ; formule des probabilités totales', 2, 'connaissance', 'attendu'),
	('1SPE-147', 'Probabilités et statistiques', 'Probabilités conditionnelles et indépendance', 'Succession de deux épreuves indépendantes ; représentation par un arbre ou un tableau', 3, 'connaissance', 'attendu'),
	('1SPE-148', 'Probabilités et statistiques', 'Probabilités conditionnelles et indépendance', 'Pour $n \leqslant 4$, répétition de $n$ épreuves de Bernoulli indépendantes et identiques', 4, 'connaissance', 'attendu'),
	('1SPE-149', 'Probabilités et statistiques', 'Probabilités conditionnelles et indépendance', 'Dans des cas simples, calculer une probabilité à l''aide de la formule des probabilités totales', 5, 'savoir_faire', 'attendu'),
	('1SPE-150', 'Probabilités et statistiques', 'Probabilités conditionnelles et indépendance', 'Savoir utiliser ou justifier l''indépendance de deux évènements', 6, 'savoir_faire', 'attendu'),
	('1SPE-151', 'Probabilités et statistiques', 'Probabilités conditionnelles et indépendance', 'Représenter la succession de deux épreuves indépendantes par un arbre ou un tableau', 7, 'savoir_faire', 'attendu'),
	('1SPE-152', 'Probabilités et statistiques', 'Probabilités conditionnelles et indépendance', 'Pour $n \leqslant 4$, représenter l''arbre associé à la répétition de $n$ épreuves de Bernoulli indépendantes et identiques afin de calculer des probabilités', 8, 'savoir_faire', 'attendu'),
	('1SPE-153', 'Probabilités et statistiques', 'Probabilités conditionnelles et indépendance', 'Méthode de Monte-Carlo : estimation de l''aire sous la parabole, estimation du nombre $\pi$', 9, 'savoir_faire', 'approfondissement'),
	('1SPE-154', 'Probabilités et statistiques', 'Probabilités conditionnelles et indépendance', 'Exemples de succession de plusieurs épreuves indépendantes', 10, 'savoir_faire', 'approfondissement'),
	('1SPE-155', 'Probabilités et statistiques', 'Probabilités conditionnelles et indépendance', 'Exemples de marches aléatoires', 11, 'savoir_faire', 'approfondissement'),
	('1SPE-156', 'Probabilités et statistiques', 'Variables aléatoires réelles', 'Variable aléatoire réelle : modélisation du résultat numérique d''une expérience aléatoire ; formalisation comme fonction définie sur l''univers et à valeurs réelles', 1, 'connaissance', 'attendu'),
	('1SPE-157', 'Probabilités et statistiques', 'Variables aléatoires réelles', 'Loi d''une variable aléatoire', 2, 'connaissance', 'attendu'),
	('1SPE-158', 'Probabilités et statistiques', 'Variables aléatoires réelles', 'Espérance, variance, écart type d''une variable aléatoire', 3, 'connaissance', 'attendu'),
	('1SPE-159', 'Probabilités et statistiques', 'Variables aléatoires réelles', 'Linéarité de l''espérance', 4, 'connaissance', 'attendu'),
	('1SPE-160', 'Probabilités et statistiques', 'Variables aléatoires réelles', 'Formule de König-Huygens', 5, 'connaissance', 'attendu'),
	('1SPE-161', 'Probabilités et statistiques', 'Variables aléatoires réelles', 'Interpréter en situation et utiliser les notations $\{X = a\}$, $\{X \leqslant a\}$, $P(X = a)$, $P(X \leqslant a)$', 6, 'savoir_faire', 'attendu'),
	('1SPE-162', 'Probabilités et statistiques', 'Variables aléatoires réelles', 'Passer du registre de la langue naturelle au registre symbolique et inversement', 7, 'savoir_faire', 'attendu'),
	('1SPE-163', 'Probabilités et statistiques', 'Variables aléatoires réelles', 'Modéliser une situation à l''aide d''une variable aléatoire', 8, 'savoir_faire', 'attendu'),
	('1SPE-164', 'Probabilités et statistiques', 'Variables aléatoires réelles', 'Déterminer la loi de probabilité d''une variable aléatoire', 9, 'savoir_faire', 'attendu'),
	('1SPE-165', 'Probabilités et statistiques', 'Variables aléatoires réelles', 'Calculer une espérance, une variance, un écart type', 10, 'savoir_faire', 'attendu'),
	('1SPE-166', 'Probabilités et statistiques', 'Variables aléatoires réelles', 'Utiliser la notion d''espérance dans une résolution de problème (mise pour un jeu équitable, etc.)', 11, 'savoir_faire', 'attendu'),
	('1SPE-167', 'Probabilités et statistiques', 'Variables aléatoires réelles', 'Algorithme renvoyant l''espérance, la variance ou l''écart type d''une variable aléatoire', 12, 'savoir_faire', 'approfondissement'),
	('1SPE-168', 'Probabilités et statistiques', 'Variables aléatoires réelles', 'Fréquence d''apparition des lettres d''un texte donné, en français, en anglais', 13, 'savoir_faire', 'approfondissement'),
	('1SPE-169', 'Probabilités et statistiques', 'Variables aléatoires réelles', 'Pour $X$ variable aléatoire, étude de la fonction du second degré $x \mapsto E\big((X - x)^2\big)$', 14, 'savoir_faire', 'approfondissement'),
	('1SPE-170', 'Probabilités et statistiques', 'Expérimentations', 'Simuler une variable aléatoire avec Python ou un tableur', 1, 'savoir_faire', 'attendu'),
	('1SPE-171', 'Probabilités et statistiques', 'Expérimentations', 'Lire, comprendre et écrire une fonction Python renvoyant la moyenne d''un échantillon de taille $n$ d''une variable aléatoire', 2, 'savoir_faire', 'attendu'),
	('1SPE-172', 'Probabilités et statistiques', 'Expérimentations', 'Étudier sur des exemples la distance entre la moyenne d''un échantillon simulé de taille $n$ d''une variable aléatoire et l''espérance de cette variable aléatoire', 3, 'savoir_faire', 'attendu'),
	('1SPE-173', 'Probabilités et statistiques', 'Expérimentations', 'Simuler, avec Python ou un tableur, $N$ échantillons de taille $n$ d''une variable aléatoire d''espérance $\mu$ et d''écart type $\sigma$ ; si $m$ désigne la moyenne d''un échantillon, calculer la proportion des cas où l''écart entre $m$ et $\mu$ est inférieur ou égal à $\frac{2\sigma}{\sqrt{n}}$', 4, 'savoir_faire', 'attendu')
) AS v(code, theme_name, objective_name, point_name, ord, kind, exigence)
JOIN public.curriculum_themes t     ON t.grade = '1_SPE' AND t.name = v.theme_name
JOIN public.curriculum_objectives o ON o.theme_id = t.id AND o.name = v.objective_name;

END $bootstrap$;
