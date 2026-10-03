-- ============================================================================
-- Amorçage — Référentiel de programme, niveau 'T_SPE'
-- ============================================================================
-- GÉNÉRÉ par scripts/generate-curriculum-seed.ts depuis
-- docs/wip/referentiel/terminale-spe-programme.md — ne pas éditer à la main.
--
-- Source : « Programme de l'enseignement de spécialité de mathématiques de la
-- classe terminale de la voie générale » (nouveau programme, PDF fourni par
-- David le 2026-10-03).
--
--   5 thèmes · 18 objectifs · 262 points
--   kind        : 101 connaissance · 143 savoir_faire · 18 demonstration
--   exigence    : 207 attendu · 55 approfondissement
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
--
-- ROLLBACK (migration additive) — valable tant que rien ne s'est rattaché au
-- niveau. La suppression d'un thème emporte en cascade objectifs, points ET ce
-- qui pointe vers eux (états d'élèves, exercices, entrées de journal…). Donc,
-- d'abord, vérifier que cette requête ne rend AUCUNE ligne :
--   SELECT * FROM public.curriculum_referenced_points('T_SPE');
-- puis seulement :
--   DELETE FROM public.curriculum_themes WHERE grade = 'T_SPE';
-- Si elle rend des lignes, ne pas annuler : corriger dans la page Programme.
-- ============================================================================

do $bootstrap$
BEGIN

IF EXISTS (SELECT 1 FROM public.curriculum_themes WHERE grade = 'T_SPE') THEN
	RAISE NOTICE 'Référentiel T_SPE déjà amorcé — aucune modification.';
	RETURN;
END IF;

-- ---------------------------------------------------------------------------
-- 1. Thèmes
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_themes (grade, name, display_order) VALUES
	('T_SPE', 'Vocabulaire ensembliste et logique', 1),
	('T_SPE', 'Algorithmique et programmation', 2),
	('T_SPE', 'Algèbre et géométrie', 3),
	('T_SPE', 'Analyse', 4),
	('T_SPE', 'Probabilités', 5);

-- ---------------------------------------------------------------------------
-- 2. Objectifs
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_objectives (theme_id, name, display_order)
SELECT t.id, v.objective_name, v.ord
FROM (VALUES
	('Vocabulaire ensembliste et logique', 'Ensembles', 1),
	('Vocabulaire ensembliste et logique', 'Logique et raisonnement', 2),
	('Algorithmique et programmation', 'Notion de liste', 1),
	('Algèbre et géométrie', 'Combinatoire et dénombrement', 1),
	('Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 2),
	('Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 3),
	('Algèbre et géométrie', 'Représentations paramétriques et équations cartésiennes', 4),
	('Analyse', 'Suites', 1),
	('Analyse', 'Limites des fonctions', 2),
	('Analyse', 'Compléments sur la dérivation', 3),
	('Analyse', 'Continuité des fonctions d''une variable réelle', 4),
	('Analyse', 'Fonction logarithme', 5),
	('Analyse', 'Fonctions sinus et cosinus', 6),
	('Analyse', 'Primitives, équations différentielles', 7),
	('Analyse', 'Calcul intégral', 8),
	('Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 1),
	('Probabilités', 'Sommes de variables aléatoires', 2),
	('Probabilités', 'Concentration, loi des grands nombres', 3)
) AS v(theme_name, objective_name, ord)
JOIN public.curriculum_themes t ON t.grade = 'T_SPE' AND t.name = v.theme_name;

-- ---------------------------------------------------------------------------
-- 3. Points
-- ---------------------------------------------------------------------------
-- `code` explicite : la série du markdown. Le trigger d'attribution ne prend
-- la main que pour les points créés ensuite depuis l'app, qui prennent la suite.
INSERT INTO public.curriculum_points (objective_id, code, name, display_order, kind, exigence)
SELECT o.id, v.code, v.point_name, v.ord, v.kind, v.exigence
FROM (VALUES
	('TSPE-001', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notions d''élément d''un ensemble, de sous-ensemble, d''ensemble vide, d''appartenance et d''inclusion, de réunion, d''intersection et de complémentaire', 1, 'connaissance', 'attendu'),
	('TSPE-002', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Symboles de base correspondants : $\varnothing$, $\in$, $\subset$, $\cap$, $\cup$, $\{\,\ldots\,\}$', 2, 'connaissance', 'attendu'),
	('TSPE-003', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notation des ensembles de nombres et des intervalles', 3, 'connaissance', 'attendu'),
	('TSPE-004', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notion de couple, de triplet et plus généralement de $n$-uplet et celle de produit cartésien', 4, 'connaissance', 'attendu'),
	('TSPE-005', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notation du complémentaire d''un sous-ensemble $A$ de $E$ : $\bar{A}$ (notation des probabilités) ou $E \setminus A$', 5, 'connaissance', 'attendu'),
	('TSPE-006', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notation $\operatorname{Card}(A)$ pour le cardinal (nombre d''éléments) d''un ensemble fini $A$', 6, 'connaissance', 'attendu'),
	('TSPE-007', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notion de bijection, rencontrée en analyse, en géométrie (notamment bijection entre le plan et $\mathbb{R}^2$, l''espace et $\mathbb{R}^3$), en dénombrement', 7, 'connaissance', 'attendu'),
	('TSPE-008', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Composition de deux fonctions, utilisée principalement dans le cadre des fonctions d''une variable réelle', 8, 'connaissance', 'attendu'),
	('TSPE-009', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Symbole de somme $\sum$ pour écrire certaines expressions de façon concise (sa manipulation pour démontrer des égalités n''est pas un objectif du programme)', 9, 'connaissance', 'attendu'),
	('TSPE-010', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Reconnaitre ce qu''est une proposition mathématique', 1, 'savoir_faire', 'attendu'),
	('TSPE-011', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Utiliser des variables pour écrire des propositions mathématiques', 2, 'savoir_faire', 'attendu'),
	('TSPE-012', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Lire et écrire des propositions contenant les connecteurs « et », « ou »', 3, 'savoir_faire', 'attendu'),
	('TSPE-013', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Formuler la négation de propositions simples, pouvant contenir un ou deux quantificateurs', 4, 'savoir_faire', 'attendu'),
	('TSPE-014', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Mobiliser un contre-exemple pour montrer qu''une proposition est fausse', 5, 'savoir_faire', 'attendu'),
	('TSPE-015', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Formuler une implication, une équivalence logique, et les mobiliser dans un raisonnement simple', 6, 'savoir_faire', 'attendu'),
	('TSPE-016', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Formuler la réciproque d''une implication, ou sa contraposée', 7, 'savoir_faire', 'attendu'),
	('TSPE-017', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Lire et écrire des propositions contenant une quantification universelle ou existentielle (les symboles $\forall$ et $\exists$ ne sont pas exigibles)', 8, 'savoir_faire', 'attendu'),
	('TSPE-018', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Raisonner par disjonctions des cas', 9, 'savoir_faire', 'attendu'),
	('TSPE-019', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Raisonner par l''absurde', 10, 'savoir_faire', 'attendu'),
	('TSPE-020', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Raisonner par contraposée', 11, 'savoir_faire', 'attendu'),
	('TSPE-021', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Raisonner par équivalence', 12, 'savoir_faire', 'attendu'),
	('TSPE-022', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Utiliser une propriété caractéristique', 13, 'savoir_faire', 'attendu'),
	('TSPE-023', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Distinguer condition nécessaire et condition suffisante', 14, 'savoir_faire', 'attendu'),
	('TSPE-024', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Démontrer une propriété par récurrence', 15, 'savoir_faire', 'attendu'),
	('TSPE-025', 'Algorithmique et programmation', 'Notion de liste', 'Génération des listes en compréhension et en extension, en lien avec la notion d''ensemble', 1, 'connaissance', 'attendu'),
	('TSPE-026', 'Algorithmique et programmation', 'Notion de liste', 'Générer une liste (en extension, par ajouts successifs ou en compréhension)', 2, 'savoir_faire', 'attendu'),
	('TSPE-027', 'Algorithmique et programmation', 'Notion de liste', 'Manipuler des éléments d''une liste (ajouter, supprimer, etc.) et leurs indices', 3, 'savoir_faire', 'attendu'),
	('TSPE-028', 'Algorithmique et programmation', 'Notion de liste', 'Parcourir une liste', 4, 'savoir_faire', 'attendu'),
	('TSPE-029', 'Algorithmique et programmation', 'Notion de liste', 'Itérer sur les éléments d''une liste', 5, 'savoir_faire', 'attendu'),
	('TSPE-030', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Principe additif : nombre d''éléments d''une réunion d''ensembles deux à deux disjoints', 1, 'connaissance', 'attendu'),
	('TSPE-031', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Principe multiplicatif : nombre d''éléments d''un produit cartésien', 2, 'connaissance', 'attendu'),
	('TSPE-032', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Nombre de $k$-uplets (ou $k$-listes) d''un ensemble à $n$ éléments', 3, 'connaissance', 'attendu'),
	('TSPE-033', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Nombre des parties d''un ensemble à $n$ éléments. Lien avec les $n$-uplets de $\{0, 1\}$, les mots de longueur $n$ sur un alphabet à deux éléments, les chemins dans un arbre, les issues dans une succession de $n$ épreuves de Bernoulli', 4, 'connaissance', 'attendu'),
	('TSPE-034', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Nombre des $k$-uplets d''éléments distincts d''un ensemble à $n$ éléments', 5, 'connaissance', 'attendu'),
	('TSPE-035', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Définition de $n!$', 6, 'connaissance', 'attendu'),
	('TSPE-036', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Nombre de permutations d''un ensemble fini à $n$ éléments', 7, 'connaissance', 'attendu'),
	('TSPE-037', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Combinaisons de $k$ éléments d''un ensemble à $n$ éléments : parties à $k$ éléments de l''ensemble. Représentation en termes de mots ou de chemins', 8, 'connaissance', 'attendu'),
	('TSPE-038', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Pour $0 \leqslant k \leqslant n$, formules : $\binom{n}{k} = \frac{n(n-1)\cdots(n-k+1)}{k!} = \frac{n!}{(n-k)!\,k!}$', 9, 'connaissance', 'attendu'),
	('TSPE-039', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Explicitation pour $k = 0, 1, 2$', 10, 'connaissance', 'attendu'),
	('TSPE-040', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Symétrie', 11, 'connaissance', 'attendu'),
	('TSPE-041', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Relation et triangle de Pascal', 12, 'connaissance', 'attendu'),
	('TSPE-042', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Dans le cadre d''un problème de dénombrement, utiliser une représentation adaptée (ensembles, arbres, tableaux, diagrammes)', 13, 'savoir_faire', 'attendu'),
	('TSPE-043', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Dans le cadre d''un problème de dénombrement, reconnaitre les objets à dénombrer', 14, 'savoir_faire', 'attendu'),
	('TSPE-044', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Effectuer des dénombrements simples dans des situations issues de divers domaines scientifiques (informatique, génétique, théorie des jeux, probabilités, etc.)', 15, 'savoir_faire', 'attendu'),
	('TSPE-045', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Démonstration par dénombrement de la relation : $\sum_{k=0}^{n} \binom{n}{k} = 2^n$', 16, 'demonstration', 'attendu'),
	('TSPE-046', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Démonstrations de la relation de Pascal (par le calcul, par une méthode combinatoire)', 17, 'demonstration', 'attendu'),
	('TSPE-047', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Combinaisons avec répétitions', 18, 'savoir_faire', 'approfondissement'),
	('TSPE-048', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Pour un entier $n$ donné, génération de la liste des coefficients $\binom{n}{k}$ à l''aide de la relation de Pascal', 19, 'savoir_faire', 'approfondissement'),
	('TSPE-049', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Génération des permutations d''un ensemble fini, ou tirage aléatoire d''une permutation', 20, 'savoir_faire', 'approfondissement'),
	('TSPE-050', 'Algèbre et géométrie', 'Combinatoire et dénombrement', 'Génération des parties à 2, 3 éléments d''un ensemble fini', 21, 'savoir_faire', 'approfondissement'),
	('TSPE-051', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Vecteurs de l''espace. Translations', 1, 'connaissance', 'attendu'),
	('TSPE-052', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Combinaisons linéaires de vecteurs de l''espace', 2, 'connaissance', 'attendu'),
	('TSPE-053', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Droites de l''espace. Vecteurs directeurs d''une droite. Vecteurs colinéaires', 3, 'connaissance', 'attendu'),
	('TSPE-054', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Caractérisation d''une droite par un point et un vecteur directeur', 4, 'connaissance', 'attendu'),
	('TSPE-055', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Plans de l''espace. Direction d''un plan de l''espace', 5, 'connaissance', 'attendu'),
	('TSPE-056', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Caractérisation d''un plan de l''espace par un point et un couple de vecteurs non colinéaires', 6, 'connaissance', 'attendu'),
	('TSPE-057', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Bases et repères de l''espace', 7, 'connaissance', 'attendu'),
	('TSPE-058', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Décomposition d''un vecteur sur une base', 8, 'connaissance', 'attendu'),
	('TSPE-059', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Représenter des combinaisons linéaires de vecteurs donnés', 9, 'savoir_faire', 'attendu'),
	('TSPE-060', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Exploiter une figure pour exprimer un vecteur comme combinaison linéaire de vecteurs', 10, 'savoir_faire', 'attendu'),
	('TSPE-061', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Décrire la position relative de deux droites, d''une droite et d''un plan, de deux plans', 11, 'savoir_faire', 'attendu'),
	('TSPE-062', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Lire sur une figure si deux vecteurs d''un plan, trois vecteurs de l''espace, forment une base', 12, 'savoir_faire', 'attendu'),
	('TSPE-063', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Lire sur une figure la décomposition d''un vecteur dans une base', 13, 'savoir_faire', 'attendu'),
	('TSPE-064', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Étudier géométriquement des problèmes simples de configurations dans l''espace (alignement, colinéarité, parallélisme, coplanarité)', 14, 'savoir_faire', 'attendu'),
	('TSPE-065', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Barycentre d''une famille d''un système pondéré de deux, trois ou quatre points', 15, 'savoir_faire', 'approfondissement'),
	('TSPE-066', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Exemples d''utilisation des barycentres, en particulier de la propriété d''associativité, pour résoudre des problèmes de géométrie', 16, 'savoir_faire', 'approfondissement'),
	('TSPE-067', 'Algèbre et géométrie', 'Manipulation des vecteurs, des droites et des plans de l''espace', 'Fonction vectorielle de Leibniz', 17, 'savoir_faire', 'approfondissement'),
	('TSPE-068', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Produit scalaire de deux vecteurs de l''espace. Bilinéarité, symétrie', 1, 'connaissance', 'attendu'),
	('TSPE-069', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Orthogonalité de deux vecteurs. Caractérisation par le produit scalaire', 2, 'connaissance', 'attendu'),
	('TSPE-070', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Base orthonormée, repère orthonormé', 3, 'connaissance', 'attendu'),
	('TSPE-071', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Coordonnées d''un vecteur dans une base orthonormée. Expressions du produit scalaire et de la norme', 4, 'connaissance', 'attendu'),
	('TSPE-072', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Expression de la distance entre deux points', 5, 'connaissance', 'attendu'),
	('TSPE-073', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Développement de $\|\vec{u} + \vec{v}\|^2$, formules de polarisation', 6, 'connaissance', 'attendu'),
	('TSPE-074', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Orthogonalité de deux droites, d''un plan et d''une droite', 7, 'connaissance', 'attendu'),
	('TSPE-075', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Vecteur normal à un plan. Étant donnés un point $A$ et un vecteur non nul $\vec{n}$, plan passant par $A$ et normal à $\vec{n}$', 8, 'connaissance', 'attendu'),
	('TSPE-076', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Projeté orthogonal d''un point sur une droite, sur un plan', 9, 'connaissance', 'attendu'),
	('TSPE-077', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Plans perpendiculaires. Caractérisation par des vecteurs normaux', 10, 'connaissance', 'attendu'),
	('TSPE-078', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Utiliser le produit scalaire pour démontrer une orthogonalité', 11, 'savoir_faire', 'attendu'),
	('TSPE-079', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Utiliser le produit scalaire pour démontrer la perpendicularité de deux plans', 12, 'savoir_faire', 'attendu'),
	('TSPE-080', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Utiliser le produit scalaire pour calculer un angle', 13, 'savoir_faire', 'attendu'),
	('TSPE-081', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Utiliser le produit scalaire pour calculer une longueur dans l''espace', 14, 'savoir_faire', 'attendu'),
	('TSPE-082', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Utiliser la projection orthogonale pour déterminer la distance d''un point à une droite ou à un plan', 15, 'savoir_faire', 'attendu'),
	('TSPE-083', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Résoudre des problèmes impliquant des grandeurs et mesures : longueur, angle, aire, volume', 16, 'savoir_faire', 'attendu'),
	('TSPE-084', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Étudier des problèmes de configuration dans l''espace : orthogonalité de deux droites, d''une droite et d''un plan', 17, 'savoir_faire', 'attendu'),
	('TSPE-085', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Étudier des problèmes de configuration dans l''espace : lieux géométriques simples, par exemple plan médiateur de deux points', 18, 'savoir_faire', 'attendu'),
	('TSPE-086', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Le projeté orthogonal d''un point $M$ sur un plan $\mathcal{P}$ est le point de $\mathcal{P}$ le plus proche de $M$', 19, 'demonstration', 'attendu'),
	('TSPE-087', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Intersection d''une sphère et d''un plan', 20, 'savoir_faire', 'approfondissement'),
	('TSPE-088', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Plan tangent à une sphère en un point', 21, 'savoir_faire', 'approfondissement'),
	('TSPE-089', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Sphère circonscrite à un tétraèdre', 22, 'savoir_faire', 'approfondissement'),
	('TSPE-090', 'Algèbre et géométrie', 'Orthogonalité et distances dans l''espace', 'Fonction scalaire de Leibniz', 23, 'savoir_faire', 'approfondissement'),
	('TSPE-091', 'Algèbre et géométrie', 'Représentations paramétriques et équations cartésiennes', 'Représentation paramétrique d''une droite', 1, 'connaissance', 'attendu'),
	('TSPE-092', 'Algèbre et géométrie', 'Représentations paramétriques et équations cartésiennes', 'Équation cartésienne d''un plan', 2, 'connaissance', 'attendu'),
	('TSPE-093', 'Algèbre et géométrie', 'Représentations paramétriques et équations cartésiennes', 'Déterminer une représentation paramétrique d''une droite', 3, 'savoir_faire', 'attendu'),
	('TSPE-094', 'Algèbre et géométrie', 'Représentations paramétriques et équations cartésiennes', 'Reconnaitre une droite donnée par une représentation paramétrique', 4, 'savoir_faire', 'attendu'),
	('TSPE-095', 'Algèbre et géométrie', 'Représentations paramétriques et équations cartésiennes', 'Déterminer l''équation cartésienne d''un plan dont on connait un vecteur normal et un point', 5, 'savoir_faire', 'attendu'),
	('TSPE-096', 'Algèbre et géométrie', 'Représentations paramétriques et équations cartésiennes', 'Reconnaitre un plan donné par une équation cartésienne et préciser un vecteur normal à ce plan', 6, 'savoir_faire', 'attendu'),
	('TSPE-097', 'Algèbre et géométrie', 'Représentations paramétriques et équations cartésiennes', 'Déterminer les coordonnées du projeté orthogonal d''un point sur un plan donné par une équation cartésienne', 7, 'savoir_faire', 'attendu'),
	('TSPE-098', 'Algèbre et géométrie', 'Représentations paramétriques et équations cartésiennes', 'Déterminer les coordonnées du projeté orthogonal d''un point sur une droite donnée par un point et un vecteur directeur', 8, 'savoir_faire', 'attendu'),
	('TSPE-099', 'Algèbre et géométrie', 'Représentations paramétriques et équations cartésiennes', 'Dans un cadre géométrique repéré, traduire par un système d''équations linéaires des problèmes de types suivants : décider si trois vecteurs forment une base, déterminer les coordonnées d''un vecteur dans une base, étudier une configuration dans l''espace (alignement, colinéarité, parallélisme, coplanarité, intersection et orthogonalité de droites ou de plans), etc.', 9, 'savoir_faire', 'attendu'),
	('TSPE-100', 'Algèbre et géométrie', 'Représentations paramétriques et équations cartésiennes', 'Dans des cas simples, résoudre le système obtenu et interpréter géométriquement les solutions', 10, 'savoir_faire', 'attendu'),
	('TSPE-101', 'Algèbre et géométrie', 'Représentations paramétriques et équations cartésiennes', 'Équation cartésienne du plan normal au vecteur $\vec{n}$ et passant par le point $A$', 11, 'demonstration', 'attendu'),
	('TSPE-102', 'Algèbre et géométrie', 'Représentations paramétriques et équations cartésiennes', 'Déterminer l''intersection de deux plans', 12, 'savoir_faire', 'approfondissement'),
	('TSPE-103', 'Algèbre et géométrie', 'Représentations paramétriques et équations cartésiennes', 'Déterminer un vecteur orthogonal à deux vecteurs non colinéaires', 13, 'savoir_faire', 'approfondissement'),
	('TSPE-104', 'Algèbre et géométrie', 'Représentations paramétriques et équations cartésiennes', 'Équation d''une sphère dont on connait le centre et le rayon', 14, 'savoir_faire', 'approfondissement'),
	('TSPE-105', 'Algèbre et géométrie', 'Représentations paramétriques et équations cartésiennes', 'Intersection d''une sphère et d''une droite', 15, 'savoir_faire', 'approfondissement'),
	('TSPE-106', 'Analyse', 'Suites', 'La suite $(u_n)$ tend vers $+\infty$ si tout intervalle de la forme $[A\,;\,+\infty[$ contient toutes les valeurs $u_n$ à partir d''un certain rang. Cas des suites croissantes non majorées', 1, 'connaissance', 'attendu'),
	('TSPE-107', 'Analyse', 'Suites', 'Suite tendant vers $-\infty$', 2, 'connaissance', 'attendu'),
	('TSPE-108', 'Analyse', 'Suites', 'La suite $(u_n)$ converge vers le nombre réel $\ell$ si tout intervalle ouvert contenant $\ell$ contient toutes les valeurs $u_n$ à partir d''un certain rang', 3, 'connaissance', 'attendu'),
	('TSPE-109', 'Analyse', 'Suites', 'Limites et comparaison. Théorèmes des gendarmes', 4, 'connaissance', 'attendu'),
	('TSPE-110', 'Analyse', 'Suites', 'Opérations sur les limites', 5, 'connaissance', 'attendu'),
	('TSPE-111', 'Analyse', 'Suites', 'Comportement d''une suite géométrique $(q^n)$ où $q$ est un nombre réel', 6, 'connaissance', 'attendu'),
	('TSPE-112', 'Analyse', 'Suites', 'Théorème admis : toute suite croissante majorée (ou décroissante minorée) converge', 7, 'connaissance', 'attendu'),
	('TSPE-113', 'Analyse', 'Suites', 'Établir la convergence d''une suite, ou sa divergence vers $+\infty$ ou $-\infty$', 8, 'savoir_faire', 'attendu'),
	('TSPE-114', 'Analyse', 'Suites', 'Raisonner par récurrence pour établir une propriété d''une suite', 9, 'savoir_faire', 'attendu'),
	('TSPE-115', 'Analyse', 'Suites', 'Étudier des phénomènes d''évolution modélisables par une suite', 10, 'savoir_faire', 'attendu'),
	('TSPE-116', 'Analyse', 'Suites', 'Toute suite croissante non majorée tend vers $+\infty$', 11, 'demonstration', 'attendu'),
	('TSPE-117', 'Analyse', 'Suites', 'Limite de $(q^n)$, après démonstration par récurrence de l''inégalité de Bernoulli', 12, 'demonstration', 'attendu'),
	('TSPE-118', 'Analyse', 'Suites', 'Divergence vers $+\infty$ d''une suite minorée par une suite divergeant vers $+\infty$', 13, 'demonstration', 'attendu'),
	('TSPE-119', 'Analyse', 'Suites', 'Limite en $+\infty$ et en $-\infty$ de la fonction exponentielle', 14, 'demonstration', 'attendu'),
	('TSPE-120', 'Analyse', 'Suites', 'Recherche de seuils', 15, 'savoir_faire', 'approfondissement'),
	('TSPE-121', 'Analyse', 'Suites', 'Recherche de valeurs approchées de $\pi$, $e$, $\sqrt{2}$, $\frac{1 + \sqrt{5}}{2}$, $\ln(2)$, etc.', 16, 'savoir_faire', 'approfondissement'),
	('TSPE-122', 'Analyse', 'Suites', 'Propriétés et utilisation des suites adjacentes', 17, 'savoir_faire', 'approfondissement'),
	('TSPE-123', 'Analyse', 'Suites', 'Exemples de suites vérifiant une relation de récurrence linéaire d''ordre 2 à coefficients constants', 18, 'savoir_faire', 'approfondissement'),
	('TSPE-124', 'Analyse', 'Suites', 'Exemples d''application de la méthode de Newton', 19, 'savoir_faire', 'approfondissement'),
	('TSPE-125', 'Analyse', 'Suites', 'Étude de la convergence de la méthode de Héron', 20, 'savoir_faire', 'approfondissement'),
	('TSPE-126', 'Analyse', 'Limites des fonctions', 'Limite finie ou infinie d''une fonction en $+\infty$, en $-\infty$, en un point', 1, 'connaissance', 'attendu'),
	('TSPE-127', 'Analyse', 'Limites des fonctions', 'Asymptote parallèle à un axe de coordonnées', 2, 'connaissance', 'attendu'),
	('TSPE-128', 'Analyse', 'Limites des fonctions', 'Limites faisant intervenir les fonctions de référence étudiées en classe de première : puissances entières, racine carrée, fonction exponentielle', 3, 'connaissance', 'attendu'),
	('TSPE-129', 'Analyse', 'Limites des fonctions', 'Limites et comparaison', 4, 'connaissance', 'attendu'),
	('TSPE-130', 'Analyse', 'Limites des fonctions', 'Opérations sur les limites', 5, 'connaissance', 'attendu'),
	('TSPE-131', 'Analyse', 'Limites des fonctions', 'Déterminer dans des cas simples la limite d''une suite ou d''une fonction en un point, en $\pm\infty$, en utilisant les limites usuelles, les croissances comparées, les opérations sur les limites, des majorations, minorations ou encadrements, la factorisation du terme prépondérant dans une somme', 6, 'savoir_faire', 'attendu'),
	('TSPE-132', 'Analyse', 'Limites des fonctions', 'Faire le lien entre l''existence d''une asymptote parallèle à un axe et celle de la limite correspondante', 7, 'savoir_faire', 'attendu'),
	('TSPE-133', 'Analyse', 'Limites des fonctions', 'Croissance comparée de $x \mapsto x^n$ et $\exp$ en $+\infty$', 8, 'demonstration', 'attendu'),
	('TSPE-134', 'Analyse', 'Limites des fonctions', 'Asymptotes obliques', 9, 'savoir_faire', 'approfondissement'),
	('TSPE-135', 'Analyse', 'Limites des fonctions', 'Branches infinies', 10, 'savoir_faire', 'approfondissement'),
	('TSPE-136', 'Analyse', 'Compléments sur la dérivation', 'Composée de deux fonctions, notation $v \circ u$', 1, 'connaissance', 'attendu'),
	('TSPE-137', 'Analyse', 'Compléments sur la dérivation', 'Relation $(v \circ u)'' = (v'' \circ u) \times u''$ pour la dérivée de la composée de deux fonctions dérivables', 2, 'connaissance', 'attendu'),
	('TSPE-138', 'Analyse', 'Compléments sur la dérivation', 'Dérivée seconde d''une fonction', 3, 'connaissance', 'attendu'),
	('TSPE-139', 'Analyse', 'Compléments sur la dérivation', 'Fonction convexe sur un intervalle : définition par la position relative de la courbe représentative et des sécantes', 4, 'connaissance', 'attendu'),
	('TSPE-140', 'Analyse', 'Compléments sur la dérivation', 'Pour une fonction deux fois dérivable, équivalence admise avec la position par rapport aux tangentes, la croissance de $f''$, la positivité de $f''''$', 5, 'connaissance', 'attendu'),
	('TSPE-141', 'Analyse', 'Compléments sur la dérivation', 'Point d''inflexion', 6, 'connaissance', 'attendu'),
	('TSPE-142', 'Analyse', 'Compléments sur la dérivation', 'Calculer la dérivée d''une fonction donnée par une formule simple mettant en jeu opérations algébriques et composition', 7, 'savoir_faire', 'attendu'),
	('TSPE-143', 'Analyse', 'Compléments sur la dérivation', 'Calculer la fonction dérivée d''une fonction construite simplement à partir des fonctions de référence', 8, 'savoir_faire', 'attendu'),
	('TSPE-144', 'Analyse', 'Compléments sur la dérivation', 'Déterminer les limites d''une fonction construite simplement à partir des fonctions de référence', 9, 'savoir_faire', 'attendu'),
	('TSPE-145', 'Analyse', 'Compléments sur la dérivation', 'Étudier les variations d''une fonction construite simplement à partir des fonctions de référence', 10, 'savoir_faire', 'attendu'),
	('TSPE-146', 'Analyse', 'Compléments sur la dérivation', 'Démontrer des inégalités en utilisant la convexité d''une fonction', 11, 'savoir_faire', 'attendu'),
	('TSPE-147', 'Analyse', 'Compléments sur la dérivation', 'Esquisser l''allure de la courbe représentative d''une fonction $f$ à partir de la donnée de tableaux de variations de $f$, de $f''$ ou de $f''''$', 12, 'savoir_faire', 'attendu'),
	('TSPE-148', 'Analyse', 'Compléments sur la dérivation', 'Lire sur une représentation graphique de $f$, de $f''$ ou de $f''''$ les intervalles où $f$ est convexe, concave, et les points d''inflexion', 13, 'savoir_faire', 'attendu'),
	('TSPE-149', 'Analyse', 'Compléments sur la dérivation', 'Dans le cadre de la résolution de problème, étudier et utiliser la convexité d''une fonction', 14, 'savoir_faire', 'attendu'),
	('TSPE-150', 'Analyse', 'Compléments sur la dérivation', 'Si $f''''$ est positive, alors la courbe représentative de $f$ est au-dessus de ses tangentes', 15, 'demonstration', 'attendu'),
	('TSPE-151', 'Analyse', 'Compléments sur la dérivation', 'Courbe de Lorenz', 16, 'savoir_faire', 'approfondissement'),
	('TSPE-152', 'Analyse', 'Compléments sur la dérivation', 'Dérivée $n$-ième d''une fonction', 17, 'savoir_faire', 'approfondissement'),
	('TSPE-153', 'Analyse', 'Compléments sur la dérivation', 'Inégalité arithmético-géométrique', 18, 'savoir_faire', 'approfondissement'),
	('TSPE-154', 'Analyse', 'Continuité des fonctions d''une variable réelle', 'Fonction continue en un point (définition par les limites), sur un intervalle', 1, 'connaissance', 'attendu'),
	('TSPE-155', 'Analyse', 'Continuité des fonctions d''une variable réelle', 'Toute fonction dérivable est continue', 2, 'connaissance', 'attendu'),
	('TSPE-156', 'Analyse', 'Continuité des fonctions d''une variable réelle', 'Image d''une suite convergente par une fonction continue', 3, 'connaissance', 'attendu'),
	('TSPE-157', 'Analyse', 'Continuité des fonctions d''une variable réelle', 'Théorème des valeurs intermédiaires', 4, 'connaissance', 'attendu'),
	('TSPE-158', 'Analyse', 'Continuité des fonctions d''une variable réelle', 'Cas des fonctions continues strictement monotones', 5, 'connaissance', 'attendu'),
	('TSPE-159', 'Analyse', 'Continuité des fonctions d''une variable réelle', 'Étudier les solutions d''une équation du type $f(x) = k$ : existence, unicité, encadrement', 6, 'savoir_faire', 'attendu'),
	('TSPE-160', 'Analyse', 'Continuité des fonctions d''une variable réelle', 'Pour une fonction continue $f$ d''un intervalle dans lui-même, étudier une suite définie par une relation de récurrence $u_{n+1} = f(u_n)$', 7, 'savoir_faire', 'attendu'),
	('TSPE-161', 'Analyse', 'Continuité des fonctions d''une variable réelle', 'Méthode de dichotomie', 8, 'savoir_faire', 'approfondissement'),
	('TSPE-162', 'Analyse', 'Continuité des fonctions d''une variable réelle', 'Méthode de Newton', 9, 'savoir_faire', 'approfondissement'),
	('TSPE-163', 'Analyse', 'Continuité des fonctions d''une variable réelle', 'Méthode de la sécante', 10, 'savoir_faire', 'approfondissement'),
	('TSPE-164', 'Analyse', 'Continuité des fonctions d''une variable réelle', 'Démonstration par dichotomie du théorème des valeurs intermédiaires', 11, 'savoir_faire', 'approfondissement'),
	('TSPE-165', 'Analyse', 'Continuité des fonctions d''une variable réelle', 'Fonctions continues de $\mathbb{R}$ dans $\mathbb{R}$ telles que $f(x + y) = f(x) + f(y)$, pour tous réels $x$, $y$', 12, 'savoir_faire', 'approfondissement'),
	('TSPE-166', 'Analyse', 'Continuité des fonctions d''une variable réelle', 'Prolongement par continuité', 13, 'savoir_faire', 'approfondissement'),
	('TSPE-167', 'Analyse', 'Fonction logarithme', 'Fonction logarithme népérien, notée $\ln$, construite comme réciproque de la fonction exponentielle', 1, 'connaissance', 'attendu'),
	('TSPE-168', 'Analyse', 'Fonction logarithme', 'Propriétés algébriques du logarithme', 2, 'connaissance', 'attendu'),
	('TSPE-169', 'Analyse', 'Fonction logarithme', 'Fonction dérivée du logarithme, variations', 3, 'connaissance', 'attendu'),
	('TSPE-170', 'Analyse', 'Fonction logarithme', 'Limites en $0$ et en $+\infty$, courbe représentative', 4, 'connaissance', 'attendu'),
	('TSPE-171', 'Analyse', 'Fonction logarithme', 'Lien entre les courbes représentatives des fonctions logarithme népérien et exponentielle', 5, 'connaissance', 'attendu'),
	('TSPE-172', 'Analyse', 'Fonction logarithme', 'Croissance comparée du logarithme népérien et de $x \mapsto x^n$ en $0$ et en $+\infty$', 6, 'connaissance', 'attendu'),
	('TSPE-173', 'Analyse', 'Fonction logarithme', 'Utiliser l''équation fonctionnelle de l''exponentielle ou du logarithme pour transformer une écriture', 7, 'savoir_faire', 'attendu'),
	('TSPE-174', 'Analyse', 'Fonction logarithme', 'Utiliser l''équation fonctionnelle de l''exponentielle ou du logarithme pour résoudre une équation, une inéquation', 8, 'savoir_faire', 'attendu'),
	('TSPE-175', 'Analyse', 'Fonction logarithme', 'Dans le cadre d''une résolution de problème, utiliser les propriétés des fonctions exponentielle et logarithme', 9, 'savoir_faire', 'attendu'),
	('TSPE-176', 'Analyse', 'Fonction logarithme', 'Calcul de la fonction dérivée de la fonction logarithme népérien, la dérivabilité étant admise', 10, 'demonstration', 'attendu'),
	('TSPE-177', 'Analyse', 'Fonction logarithme', 'Limite en $0$ de $x \mapsto x\ln(x)$', 11, 'demonstration', 'attendu'),
	('TSPE-178', 'Analyse', 'Fonction logarithme', 'Algorithme de Briggs pour le calcul du logarithme', 12, 'savoir_faire', 'approfondissement'),
	('TSPE-179', 'Analyse', 'Fonction logarithme', 'Pour $a$ dans $\mathbb{R}$, fonction $x \mapsto x^a$', 13, 'savoir_faire', 'approfondissement'),
	('TSPE-180', 'Analyse', 'Fonction logarithme', 'Pour $x$ dans $\mathbb{R}$, limite de $\left(1 + \frac{x}{n}\right)^n$', 14, 'savoir_faire', 'approfondissement'),
	('TSPE-181', 'Analyse', 'Fonctions sinus et cosinus', 'Fonctions trigonométriques sinus et cosinus. Parité, périodicité. Courbes représentatives', 1, 'connaissance', 'attendu'),
	('TSPE-182', 'Analyse', 'Fonctions sinus et cosinus', 'Dérivées, variations', 2, 'connaissance', 'attendu'),
	('TSPE-183', 'Analyse', 'Fonctions sinus et cosinus', 'Lier la représentation graphique des fonctions sinus et cosinus et le cercle trigonométrique', 3, 'savoir_faire', 'attendu'),
	('TSPE-184', 'Analyse', 'Fonctions sinus et cosinus', 'Traduire graphiquement la parité et la périodicité des fonctions sinus et cosinus', 4, 'savoir_faire', 'attendu'),
	('TSPE-185', 'Analyse', 'Fonctions sinus et cosinus', 'Résoudre une équation du type $\cos(x) = a$', 5, 'savoir_faire', 'attendu'),
	('TSPE-186', 'Analyse', 'Fonctions sinus et cosinus', 'Résoudre une inéquation de la forme $\cos(x) \leqslant a$ sur $[-\pi, \pi]$', 6, 'savoir_faire', 'attendu'),
	('TSPE-187', 'Analyse', 'Fonctions sinus et cosinus', 'Dans le cadre de la résolution de problème, notamment géométrique, étudier une fonction simple définie à partir de fonctions trigonométriques, pour déterminer des variations, un optimum', 7, 'savoir_faire', 'attendu'),
	('TSPE-188', 'Analyse', 'Fonctions sinus et cosinus', 'Fonction tangente', 8, 'savoir_faire', 'approfondissement'),
	('TSPE-189', 'Analyse', 'Primitives, équations différentielles', 'Équation différentielle $y'' = f$', 1, 'connaissance', 'attendu'),
	('TSPE-190', 'Analyse', 'Primitives, équations différentielles', 'Notion de primitive d''une fonction continue sur un intervalle. Deux primitives d''une même fonction continue sur un intervalle diffèrent d''une constante', 2, 'connaissance', 'attendu'),
	('TSPE-191', 'Analyse', 'Primitives, équations différentielles', 'Primitives des fonctions de référence : $x \mapsto x^n$ pour $n \in \mathbb{Z}$, $x \mapsto \frac{1}{\sqrt{x}}$, exponentielle, sinus, cosinus', 3, 'connaissance', 'attendu'),
	('TSPE-192', 'Analyse', 'Primitives, équations différentielles', 'Équation différentielle $y'' = ay$, où $a$ est un nombre réel ; allure des courbes', 4, 'connaissance', 'attendu'),
	('TSPE-193', 'Analyse', 'Primitives, équations différentielles', 'Équation différentielle $y'' = ay + b$', 5, 'connaissance', 'attendu'),
	('TSPE-194', 'Analyse', 'Primitives, équations différentielles', 'Calculer une primitive en utilisant les primitives de référence et les fonctions de la forme $(v'' \circ u) \times u''$', 6, 'savoir_faire', 'attendu'),
	('TSPE-195', 'Analyse', 'Primitives, équations différentielles', 'Pour une équation différentielle $y'' = ay + b$ ($a \neq 0$) : déterminer une solution particulière constante ; utiliser cette solution pour déterminer toutes les solutions', 7, 'savoir_faire', 'attendu'),
	('TSPE-196', 'Analyse', 'Primitives, équations différentielles', 'Pour une équation différentielle $y'' = ay + f$ : à partir de la donnée d''une solution particulière, déterminer toutes les solutions', 8, 'savoir_faire', 'attendu'),
	('TSPE-197', 'Analyse', 'Primitives, équations différentielles', 'Deux primitives d''une même fonction continue sur un intervalle diffèrent d''une constante', 9, 'demonstration', 'attendu'),
	('TSPE-198', 'Analyse', 'Primitives, équations différentielles', 'Résolution de l''équation différentielle $y'' = ay$ où $a$ est un nombre réel', 10, 'demonstration', 'attendu'),
	('TSPE-199', 'Analyse', 'Primitives, équations différentielles', 'Autres exemples d''équations différentielles, éventuellement en lien avec une modélisation, par exemple l''équation logistique', 11, 'savoir_faire', 'approfondissement'),
	('TSPE-200', 'Analyse', 'Primitives, équations différentielles', 'Résolution par la méthode d''Euler de $y'' = f$, de $y'' = ay + b$', 12, 'savoir_faire', 'approfondissement'),
	('TSPE-201', 'Analyse', 'Calcul intégral', 'Définition de l''intégrale d''une fonction continue positive définie sur un segment $[a, b]$, comme aire sous la courbe représentative de $f$. Notation $\int_a^b f(x)\,\mathrm{d}x$', 1, 'connaissance', 'attendu'),
	('TSPE-202', 'Analyse', 'Calcul intégral', 'Théorème : si $f$ est une fonction continue positive sur $[a, b]$, alors la fonction $F_a$ définie sur $[a, b]$ par $F_a(x) = \int_a^x f(t)\,\mathrm{d}t$ est la primitive de $f$ qui s''annule en $a$', 2, 'connaissance', 'attendu'),
	('TSPE-203', 'Analyse', 'Calcul intégral', 'Sous les hypothèses du théorème, relation $\int_a^b f(x)\,\mathrm{d}x = F(b) - F(a)$ où $F$ est une primitive quelconque de $f$. Notation $\left[F(x)\right]_a^b$', 3, 'connaissance', 'attendu'),
	('TSPE-204', 'Analyse', 'Calcul intégral', 'Théorème : toute fonction continue sur un intervalle admet des primitives', 4, 'connaissance', 'attendu'),
	('TSPE-205', 'Analyse', 'Calcul intégral', 'Définition par les primitives de $\int_a^b f(x)\,\mathrm{d}x$ lorsque $f$ est une fonction continue de signe quelconque sur un intervalle contenant $a$ et $b$', 5, 'connaissance', 'attendu'),
	('TSPE-206', 'Analyse', 'Calcul intégral', 'Linéarité, positivité et intégration des inégalités', 6, 'connaissance', 'attendu'),
	('TSPE-207', 'Analyse', 'Calcul intégral', 'Relation de Chasles', 7, 'connaissance', 'attendu'),
	('TSPE-208', 'Analyse', 'Calcul intégral', 'Valeur moyenne d''une fonction', 8, 'connaissance', 'attendu'),
	('TSPE-209', 'Analyse', 'Calcul intégral', 'Intégration par parties', 9, 'connaissance', 'attendu'),
	('TSPE-210', 'Analyse', 'Calcul intégral', 'Estimer graphiquement ou encadrer une intégrale, une valeur moyenne', 10, 'savoir_faire', 'attendu'),
	('TSPE-211', 'Analyse', 'Calcul intégral', 'Calculer une intégrale à l''aide d''une primitive', 11, 'savoir_faire', 'attendu'),
	('TSPE-212', 'Analyse', 'Calcul intégral', 'Calculer une intégrale à l''aide d''une intégration par parties', 12, 'savoir_faire', 'attendu'),
	('TSPE-213', 'Analyse', 'Calcul intégral', 'Majorer (minorer) une intégrale à partir d''une majoration (minoration) d''une fonction par une autre fonction', 13, 'savoir_faire', 'attendu'),
	('TSPE-214', 'Analyse', 'Calcul intégral', 'Calculer l''aire entre deux courbes', 14, 'savoir_faire', 'attendu'),
	('TSPE-215', 'Analyse', 'Calcul intégral', 'Étudier une suite d''intégrales, vérifiant éventuellement une relation de récurrence', 15, 'savoir_faire', 'attendu'),
	('TSPE-216', 'Analyse', 'Calcul intégral', 'Interpréter une intégrale, une valeur moyenne dans un contexte issu d''une autre discipline', 16, 'savoir_faire', 'attendu'),
	('TSPE-217', 'Analyse', 'Calcul intégral', 'Pour une fonction positive croissante $f$ sur $[a, b]$, la fonction $x \mapsto \int_a^x f(t)\,\mathrm{d}t$ est une primitive de $f$. Pour toute primitive $F$ de $f$, relation $\int_a^b f(x)\,\mathrm{d}x = F(b) - F(a)$', 17, 'demonstration', 'attendu'),
	('TSPE-218', 'Analyse', 'Calcul intégral', 'Intégration par parties (démonstration)', 18, 'demonstration', 'attendu'),
	('TSPE-219', 'Analyse', 'Calcul intégral', 'Approximation d''une aire par l''utilisation de suites adjacentes', 19, 'savoir_faire', 'approfondissement'),
	('TSPE-220', 'Analyse', 'Calcul intégral', 'Encadrement de $H_n = \sum_{k=1}^{n} \frac{1}{k}$ par des intégrales', 20, 'savoir_faire', 'approfondissement'),
	('TSPE-221', 'Analyse', 'Calcul intégral', 'Méthodes des rectangles, des milieux, des trapèzes', 21, 'savoir_faire', 'approfondissement'),
	('TSPE-222', 'Analyse', 'Calcul intégral', 'Méthode de Monte-Carlo', 22, 'savoir_faire', 'approfondissement'),
	('TSPE-223', 'Analyse', 'Calcul intégral', 'Algorithme de Brouncker pour le calcul de $\ln(2)$', 23, 'savoir_faire', 'approfondissement'),
	('TSPE-224', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Modèle de la succession d''épreuves indépendantes : la probabilité d''une issue $(x_1, \ldots, x_n)$ est égale au produit des probabilités des composantes $x_i$. Représentation par un produit cartésien, par un arbre', 1, 'connaissance', 'attendu'),
	('TSPE-225', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Épreuve de Bernoulli, loi de Bernoulli', 2, 'connaissance', 'attendu'),
	('TSPE-226', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Schéma de Bernoulli : répétition de $n$ épreuves de Bernoulli indépendantes', 3, 'connaissance', 'attendu'),
	('TSPE-227', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Loi binomiale $\mathcal{B}(n, p)$ : loi du nombre de succès. Expression à l''aide des coefficients binomiaux', 4, 'connaissance', 'attendu'),
	('TSPE-228', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Modéliser une situation par une succession d''épreuves indépendantes, ou une succession de deux ou trois épreuves quelconques', 5, 'savoir_faire', 'attendu'),
	('TSPE-229', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Représenter la situation par un arbre', 6, 'savoir_faire', 'attendu'),
	('TSPE-230', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Calculer une probabilité en utilisant l''indépendance, des probabilités conditionnelles, la formule des probabilités totales', 7, 'savoir_faire', 'attendu'),
	('TSPE-231', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Modéliser une situation par un schéma de Bernoulli, par une loi binomiale', 8, 'savoir_faire', 'attendu'),
	('TSPE-232', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Utiliser l''expression de la loi binomiale pour résoudre un problème de seuil, de comparaison, d''optimisation relatif à des probabilités de nombre de succès', 9, 'savoir_faire', 'attendu'),
	('TSPE-233', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Dans le cadre d''une résolution de problème modélisé par une variable binomiale $X$, calculer numériquement une probabilité du type $P(X = k)$, $P(X \leqslant k)$, $P(k \leqslant X \leqslant k'')$, en s''aidant au besoin d''un algorithme', 10, 'savoir_faire', 'attendu'),
	('TSPE-234', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Dans le cadre d''une résolution de problème modélisé par une variable binomiale $X$, chercher un intervalle $I$ pour lequel la probabilité $P(X \in I)$ est inférieure à une valeur donnée $\alpha$, ou supérieure à $1 - \alpha$', 11, 'savoir_faire', 'attendu'),
	('TSPE-235', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Expression de la probabilité de $k$ succès dans le schéma de Bernoulli', 12, 'demonstration', 'attendu'),
	('TSPE-236', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Simulation de la planche de Galton', 13, 'savoir_faire', 'approfondissement'),
	('TSPE-237', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Problème de la surréservation. Étant donné une variable aléatoire binomiale $X$ et un réel strictement positif $\alpha$, détermination du plus petit entier $k$ tel que $P(X > k) \leqslant \alpha$', 14, 'savoir_faire', 'approfondissement'),
	('TSPE-238', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Simulation d''un échantillon d''une variable aléatoire', 15, 'savoir_faire', 'approfondissement'),
	('TSPE-239', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Loi géométrique', 16, 'savoir_faire', 'approfondissement'),
	('TSPE-240', 'Probabilités', 'Succession d''épreuves indépendantes, schéma de Bernoulli', 'Introduction de la loi de Poisson comme limite de lois binomiales. Interprétation (évènements rares)', 17, 'savoir_faire', 'approfondissement'),
	('TSPE-241', 'Probabilités', 'Sommes de variables aléatoires', 'Somme de deux variables aléatoires', 1, 'connaissance', 'attendu'),
	('TSPE-242', 'Probabilités', 'Sommes de variables aléatoires', 'Linéarité de l''espérance : $E(X + Y) = E(X) + E(Y)$ et $E(aX) = aE(X)$', 2, 'connaissance', 'attendu'),
	('TSPE-243', 'Probabilités', 'Sommes de variables aléatoires', 'Dans le cadre de la succession d''épreuves indépendantes, exemples de variables indépendantes $X$, $Y$ et relation d''additivité $V(X + Y) = V(X) + V(Y)$', 3, 'connaissance', 'attendu'),
	('TSPE-244', 'Probabilités', 'Sommes de variables aléatoires', 'Relation $V(aX) = a^2V(X)$', 4, 'connaissance', 'attendu'),
	('TSPE-245', 'Probabilités', 'Sommes de variables aléatoires', 'Application à l''espérance, la variance et l''écart type de la loi binomiale', 5, 'connaissance', 'attendu'),
	('TSPE-246', 'Probabilités', 'Sommes de variables aléatoires', 'Échantillon de taille $n$ d''une loi de probabilité : liste $(X_1, \ldots, X_n)$ de variables indépendantes identiques suivant cette loi', 6, 'connaissance', 'attendu'),
	('TSPE-247', 'Probabilités', 'Sommes de variables aléatoires', 'Espérance, variance, écart type de la somme $S_n = X_1 + \cdots + X_n$ et de la moyenne $M_n = \frac{S_n}{n}$', 7, 'connaissance', 'attendu'),
	('TSPE-248', 'Probabilités', 'Sommes de variables aléatoires', 'Représenter une variable comme somme de variables aléatoires plus simples', 8, 'savoir_faire', 'attendu'),
	('TSPE-249', 'Probabilités', 'Sommes de variables aléatoires', 'Calculer l''espérance d''une variable aléatoire, notamment en utilisant la propriété de linéarité', 9, 'savoir_faire', 'attendu'),
	('TSPE-250', 'Probabilités', 'Sommes de variables aléatoires', 'Calculer la variance d''une variable aléatoire, notamment en l''exprimant comme somme de variables aléatoires indépendantes', 10, 'savoir_faire', 'attendu'),
	('TSPE-251', 'Probabilités', 'Sommes de variables aléatoires', 'Espérance et variance de la loi binomiale', 11, 'demonstration', 'attendu'),
	('TSPE-252', 'Probabilités', 'Sommes de variables aléatoires', 'Relation $E(XY) = E(X)E(Y)$ pour des variables aléatoires indépendantes $X$, $Y$. Application à la variance de $X + Y$', 12, 'savoir_faire', 'approfondissement'),
	('TSPE-253', 'Probabilités', 'Concentration, loi des grands nombres', 'Inégalité de Bienaymé-Tchebychev. Pour une variable aléatoire $X$ d''espérance $\mu$ et de variance $V$, et quel que soit le réel strictement positif $\delta$ : $P(|X - \mu| \geqslant \delta) \leqslant \frac{V(X)}{\delta^2}$', 1, 'connaissance', 'attendu'),
	('TSPE-254', 'Probabilités', 'Concentration, loi des grands nombres', 'Inégalité de concentration. Si $M_n$ est la variable aléatoire moyenne d''un échantillon de taille $n$ d''une variable aléatoire d''espérance $\mu$ et de variance $V$, alors pour tout $\delta > 0$, $P(|M_n - \mu| \geqslant \delta) \leqslant \frac{V}{n\delta^2}$', 2, 'connaissance', 'attendu'),
	('TSPE-255', 'Probabilités', 'Concentration, loi des grands nombres', 'Loi des grands nombres', 3, 'connaissance', 'attendu'),
	('TSPE-256', 'Probabilités', 'Concentration, loi des grands nombres', 'Appliquer l''inégalité de Bienaymé-Tchebychev pour définir une taille d''échantillon, en fonction de la précision et du risque choisi', 4, 'savoir_faire', 'attendu'),
	('TSPE-257', 'Probabilités', 'Concentration, loi des grands nombres', 'Calculer la probabilité de $(|S_n - pn| > \sqrt{n})$, où $S_n$ est une variable aléatoire qui suit une loi binomiale $\mathcal{B}(n, p)$. Comparer avec l''inégalité de Bienaymé-Tchebychev', 5, 'savoir_faire', 'approfondissement'),
	('TSPE-258', 'Probabilités', 'Concentration, loi des grands nombres', 'Simulation d''une marche aléatoire', 6, 'savoir_faire', 'approfondissement'),
	('TSPE-259', 'Probabilités', 'Concentration, loi des grands nombres', 'Simuler $N$ échantillons de taille $n$ d''une variable aléatoire d''espérance $\mu$ et d''écart type $\sigma$. Calculer l''écart type $s$ de la série des moyennes des échantillons observés, à comparer à $\frac{\sigma}{\sqrt{n}}$. Calculer la proportion des échantillons pour lesquels l''écart entre la moyenne et $\mu$ est inférieur ou égal à $ks$, ou à $k\frac{\sigma}{\sqrt{n}}$, pour $k = 1, 2, 3$', 7, 'savoir_faire', 'approfondissement'),
	('TSPE-260', 'Probabilités', 'Concentration, loi des grands nombres', 'Estimation', 8, 'savoir_faire', 'approfondissement'),
	('TSPE-261', 'Probabilités', 'Concentration, loi des grands nombres', 'Marche aléatoire', 9, 'savoir_faire', 'approfondissement'),
	('TSPE-262', 'Probabilités', 'Concentration, loi des grands nombres', 'Exemples d''application issus d''autres disciplines pour diverses valeurs de $n$ : sondage (par exemple $n = 1\,000$), étude du sex ratio (par exemple $n = 10^6$), demi-vie d''atomes radioactifs ($n = 10^{23}$)', 10, 'savoir_faire', 'approfondissement')
) AS v(code, theme_name, objective_name, point_name, ord, kind, exigence)
JOIN public.curriculum_themes t     ON t.grade = 'T_SPE' AND t.name = v.theme_name
JOIN public.curriculum_objectives o ON o.theme_id = t.id AND o.name = v.objective_name;

END $bootstrap$;
