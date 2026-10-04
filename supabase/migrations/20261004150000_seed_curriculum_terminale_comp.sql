-- ============================================================================
-- Amorçage — Référentiel de programme, niveau 'T_COMP'
-- ============================================================================
-- GÉNÉRÉ par scripts/generate-curriculum-seed.ts depuis
-- docs/wip/referentiel/terminale-comp-programme.md — ne pas éditer à la main.
--
-- Source : « Programme d'enseignement optionnel de mathématiques complémentaires
-- de terminale générale » (PDF fourni par David le 2026-10-03).
--
--   3 thèmes · 10 objectifs · 139 points
--   kind        : 57 connaissance · 68 savoir_faire · 14 demonstration
--   exigence    : 113 attendu · 26 approfondissement
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
--   SELECT * FROM public.curriculum_referenced_points('T_COMP');
-- puis seulement :
--   DELETE FROM public.curriculum_themes WHERE grade = 'T_COMP';
-- Si elle rend des lignes, ne pas annuler : corriger dans la page Programme.
-- ============================================================================

do $bootstrap$
BEGIN

IF EXISTS (SELECT 1 FROM public.curriculum_themes WHERE grade = 'T_COMP') THEN
	RAISE NOTICE 'Référentiel T_COMP déjà amorcé — aucune modification.';
	RETURN;
END IF;

-- ---------------------------------------------------------------------------
-- 1. Thèmes
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_themes (grade, name, display_order) VALUES
	('T_COMP', 'Analyse', 1),
	('T_COMP', 'Probabilités et statistique', 2),
	('T_COMP', 'Vocabulaire ensembliste et logique', 3);

-- ---------------------------------------------------------------------------
-- 2. Objectifs
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_objectives (theme_id, name, display_order)
SELECT t.id, v.objective_name, v.ord
FROM (VALUES
	('Analyse', 'Suites numériques, modèles discrets', 1),
	('Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 2),
	('Analyse', 'Primitives et équations différentielles', 3),
	('Analyse', 'Fonctions convexes', 4),
	('Analyse', 'Intégration', 5),
	('Probabilités et statistique', 'Lois discrètes', 1),
	('Probabilités et statistique', 'Lois à densité', 2),
	('Probabilités et statistique', 'Statistique à deux variables quantitatives', 3),
	('Vocabulaire ensembliste et logique', 'Ensembles', 1),
	('Vocabulaire ensembliste et logique', 'Logique et raisonnement', 2)
) AS v(theme_name, objective_name, ord)
JOIN public.curriculum_themes t ON t.grade = 'T_COMP' AND t.name = v.theme_name;

-- ---------------------------------------------------------------------------
-- 3. Points
-- ---------------------------------------------------------------------------
-- `code` explicite : la série du markdown. Le trigger d'attribution ne prend
-- la main que pour les points créés ensuite depuis l'app, qui prennent la suite.
INSERT INTO public.curriculum_points (objective_id, code, name, display_order, kind, exigence)
SELECT o.id, v.code, v.point_name, v.ord, v.kind, v.exigence
FROM (VALUES
	('TCOMP-001', 'Analyse', 'Suites numériques, modèles discrets', 'Approche intuitive de la notion de limite, finie ou infinie, d''une suite', 1, 'connaissance', 'attendu'),
	('TCOMP-002', 'Analyse', 'Suites numériques, modèles discrets', 'Approche intuitive des opérations sur les limites', 2, 'connaissance', 'attendu'),
	('TCOMP-003', 'Analyse', 'Suites numériques, modèles discrets', 'Approche intuitive du passage à la limite dans les inégalités et du théorème des gendarmes', 3, 'connaissance', 'attendu'),
	('TCOMP-004', 'Analyse', 'Suites numériques, modèles discrets', 'Limite d''une suite géométrique de raison positive', 4, 'connaissance', 'attendu'),
	('TCOMP-005', 'Analyse', 'Suites numériques, modèles discrets', 'Limite de la somme des termes d''une suite géométrique de raison positive strictement inférieure à $1$', 5, 'connaissance', 'attendu'),
	('TCOMP-006', 'Analyse', 'Suites numériques, modèles discrets', 'Suites arithmético-géométriques', 6, 'connaissance', 'attendu'),
	('TCOMP-007', 'Analyse', 'Suites numériques, modèles discrets', 'Modéliser un problème par une suite donnée par une formule explicite ou une relation de récurrence', 7, 'savoir_faire', 'attendu'),
	('TCOMP-008', 'Analyse', 'Suites numériques, modèles discrets', 'Calculer une limite de suite géométrique', 8, 'savoir_faire', 'attendu'),
	('TCOMP-009', 'Analyse', 'Suites numériques, modèles discrets', 'Calculer la limite de la somme des termes d''une suite géométrique de raison positive et strictement inférieure à $1$', 9, 'savoir_faire', 'attendu'),
	('TCOMP-010', 'Analyse', 'Suites numériques, modèles discrets', 'Représenter graphiquement une suite donnée par une relation de récurrence $u_{n+1} = f(u_n)$ où $f$ est une fonction continue d''un intervalle $I$ dans lui-même', 10, 'savoir_faire', 'attendu'),
	('TCOMP-011', 'Analyse', 'Suites numériques, modèles discrets', 'Conjecturer le comportement global ou asymptotique d''une suite donnée par une relation de récurrence $u_{n+1} = f(u_n)$', 11, 'savoir_faire', 'attendu'),
	('TCOMP-012', 'Analyse', 'Suites numériques, modèles discrets', 'Pour une récurrence arithmético-géométrique : rechercher une suite constante solution particulière', 12, 'savoir_faire', 'attendu'),
	('TCOMP-013', 'Analyse', 'Suites numériques, modèles discrets', 'Pour une récurrence arithmético-géométrique : utiliser une suite constante solution particulière pour déterminer toutes les solutions', 13, 'savoir_faire', 'attendu'),
	('TCOMP-014', 'Analyse', 'Suites numériques, modèles discrets', 'Limite des sommes des termes d''une suite géométrique de raison positive strictement inférieure à $1$ (démonstration)', 14, 'demonstration', 'approfondissement'),
	('TCOMP-015', 'Analyse', 'Suites numériques, modèles discrets', 'Recherche de seuils', 15, 'savoir_faire', 'approfondissement'),
	('TCOMP-016', 'Analyse', 'Suites numériques, modèles discrets', 'Pour une suite récurrente $u_{n+1} = f(u_n)$, calcul des termes successifs', 16, 'savoir_faire', 'approfondissement'),
	('TCOMP-017', 'Analyse', 'Suites numériques, modèles discrets', 'Recherche de valeurs approchées de constantes mathématiques, par exemple $\pi$, $\ln 2$, $\sqrt{2}$', 17, 'savoir_faire', 'approfondissement'),
	('TCOMP-018', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Notion de limite d''une fonction. Lien avec la continuité et les asymptotes horizontales ou verticales', 1, 'connaissance', 'attendu'),
	('TCOMP-019', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Limites des fonctions de référence (carré, cube, racine carrée, inverse, exponentielle, logarithme)', 2, 'connaissance', 'attendu'),
	('TCOMP-020', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Théorème des valeurs intermédiaires (admis). Cas des fonctions strictement monotones', 3, 'connaissance', 'attendu'),
	('TCOMP-021', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Réciproque d''une fonction continue strictement monotone sur un intervalle, représentation graphique', 4, 'connaissance', 'attendu'),
	('TCOMP-022', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Fonction logarithme népérien : réciproque de la fonction exponentielle', 5, 'connaissance', 'attendu'),
	('TCOMP-023', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Limites et représentation graphique de la fonction logarithme népérien', 6, 'connaissance', 'attendu'),
	('TCOMP-024', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Équation fonctionnelle du logarithme népérien', 7, 'connaissance', 'attendu'),
	('TCOMP-025', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Fonction dérivée du logarithme népérien', 8, 'connaissance', 'attendu'),
	('TCOMP-026', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Fonction dérivée de $x \mapsto f(ax + b)$, $x \mapsto e^{u(x)}$, $x \mapsto \ln u(x)$, $x \mapsto u(x)^2$', 9, 'connaissance', 'attendu'),
	('TCOMP-027', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Calculer une fonction dérivée', 10, 'savoir_faire', 'attendu'),
	('TCOMP-028', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Calculer des limites', 11, 'savoir_faire', 'attendu'),
	('TCOMP-029', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Dresser un tableau de variation', 12, 'savoir_faire', 'attendu'),
	('TCOMP-030', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Dans le cadre de la résolution de problème, utiliser le calcul des limites', 13, 'savoir_faire', 'attendu'),
	('TCOMP-031', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Dans le cadre de la résolution de problème, utiliser l''allure des courbes représentatives des fonctions inverse, carré, cube, racine carrée, exponentielle et logarithme', 14, 'savoir_faire', 'attendu'),
	('TCOMP-032', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Exploiter le tableau de variation pour déterminer le nombre de solutions d''une équation du type $f(x) = k$', 15, 'savoir_faire', 'attendu'),
	('TCOMP-033', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Exploiter le tableau de variation pour résoudre une inéquation du type $f(x) \leqslant k$', 16, 'savoir_faire', 'attendu'),
	('TCOMP-034', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Déterminer des valeurs approchées, un encadrement d''une solution d''une équation du type $f(x) = k$', 17, 'savoir_faire', 'attendu'),
	('TCOMP-035', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Utiliser l''équation fonctionnelle de l''exponentielle ou du logarithme pour transformer une écriture', 18, 'savoir_faire', 'attendu'),
	('TCOMP-036', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Utiliser l''équation fonctionnelle de l''exponentielle ou du logarithme pour résoudre une équation, une inéquation', 19, 'savoir_faire', 'attendu'),
	('TCOMP-037', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Utiliser la relation $\ln q^n = n \ln q$ pour déterminer un seuil', 20, 'savoir_faire', 'attendu'),
	('TCOMP-038', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Relation $\ln(ab) = \ln a + \ln b$', 21, 'demonstration', 'approfondissement'),
	('TCOMP-039', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Relation $\ln\left(\frac{1}{a}\right) = -\ln a$', 22, 'demonstration', 'approfondissement'),
	('TCOMP-040', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Calcul de la fonction dérivée du logarithme, en admettant sa dérivabilité', 23, 'demonstration', 'approfondissement'),
	('TCOMP-041', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Calcul de la fonction dérivée de $\ln u$', 24, 'demonstration', 'approfondissement'),
	('TCOMP-042', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Calcul de la fonction dérivée de $\exp u$', 25, 'demonstration', 'approfondissement'),
	('TCOMP-043', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Recherche de valeurs approchées d''une solution d''équation du type $f(x) = k$ par balayage', 26, 'savoir_faire', 'approfondissement'),
	('TCOMP-044', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Recherche de valeurs approchées d''une solution d''équation du type $f(x) = k$ par dichotomie', 27, 'savoir_faire', 'approfondissement'),
	('TCOMP-045', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Recherche de valeurs approchées d''une solution d''équation du type $f(x) = k$ par la méthode de Newton', 28, 'savoir_faire', 'approfondissement'),
	('TCOMP-046', 'Analyse', 'Fonctions : continuité, dérivabilité, limites, représentation graphique', 'Algorithme de Briggs pour le calcul de logarithmes', 29, 'savoir_faire', 'approfondissement'),
	('TCOMP-047', 'Analyse', 'Primitives et équations différentielles', 'Sur des exemples, notion d''une solution d''équation différentielle', 1, 'connaissance', 'attendu'),
	('TCOMP-048', 'Analyse', 'Primitives et équations différentielles', 'Notion de primitive, en liaison avec l''équation différentielle $y'' = f$', 2, 'connaissance', 'attendu'),
	('TCOMP-049', 'Analyse', 'Primitives et équations différentielles', 'Deux primitives d''une même fonction continue sur un intervalle diffèrent d''une constante', 3, 'connaissance', 'attendu'),
	('TCOMP-050', 'Analyse', 'Primitives et équations différentielles', 'Équation différentielle $y'' = ay + b$, où $a$ et $b$ sont des réels ; allure des courbes', 4, 'connaissance', 'attendu'),
	('TCOMP-051', 'Analyse', 'Primitives et équations différentielles', 'Vérifier qu''une fonction donnée est solution d''une équation différentielle', 5, 'savoir_faire', 'attendu'),
	('TCOMP-052', 'Analyse', 'Primitives et équations différentielles', 'Déterminer les primitives d''une fonction, en reconnaissant la dérivée d''une fonction de référence', 6, 'savoir_faire', 'attendu'),
	('TCOMP-053', 'Analyse', 'Primitives et équations différentielles', 'Déterminer les primitives d''une fonction de la forme $2uu''$, $e^{u}u''$ ou $\frac{u''}{u}$', 7, 'savoir_faire', 'attendu'),
	('TCOMP-054', 'Analyse', 'Primitives et équations différentielles', 'Résoudre une équation différentielle $y'' = ay$', 8, 'savoir_faire', 'attendu'),
	('TCOMP-055', 'Analyse', 'Primitives et équations différentielles', 'Pour une équation différentielle $y'' = ay + b$ : déterminer une solution particulière constante', 9, 'savoir_faire', 'attendu'),
	('TCOMP-056', 'Analyse', 'Primitives et équations différentielles', 'Pour une équation différentielle $y'' = ay + b$ : utiliser une solution particulière constante pour déterminer la solution générale', 10, 'savoir_faire', 'attendu'),
	('TCOMP-057', 'Analyse', 'Primitives et équations différentielles', 'Deux primitives d''une même fonction continue sur un intervalle diffèrent d''une constante (démonstration)', 11, 'demonstration', 'approfondissement'),
	('TCOMP-058', 'Analyse', 'Primitives et équations différentielles', 'Résolution de l''équation différentielle $y'' = ay$', 12, 'demonstration', 'approfondissement'),
	('TCOMP-059', 'Analyse', 'Primitives et équations différentielles', 'Sur des exemples, résolution approchée d''une équation différentielle par la méthode d''Euler', 13, 'savoir_faire', 'approfondissement'),
	('TCOMP-060', 'Analyse', 'Fonctions convexes', 'Dérivée seconde d''une fonction', 1, 'connaissance', 'attendu'),
	('TCOMP-061', 'Analyse', 'Fonctions convexes', 'Fonction convexe sur un intervalle : définition par la position relative de la courbe représentative et des sécantes', 2, 'connaissance', 'attendu'),
	('TCOMP-062', 'Analyse', 'Fonctions convexes', 'Lorsque $f$ est dérivable, équivalence admise avec la position de la courbe par rapport aux tangentes', 3, 'connaissance', 'attendu'),
	('TCOMP-063', 'Analyse', 'Fonctions convexes', 'Caractérisation admise de la convexité par la croissance de $f''$, la positivité de $f''''$', 4, 'connaissance', 'attendu'),
	('TCOMP-064', 'Analyse', 'Fonctions convexes', 'Point d''inflexion', 5, 'connaissance', 'attendu'),
	('TCOMP-065', 'Analyse', 'Fonctions convexes', 'Reconnaître sur une représentation graphique une fonction convexe, concave, un point d''inflexion', 6, 'savoir_faire', 'attendu'),
	('TCOMP-066', 'Analyse', 'Fonctions convexes', 'Étudier la convexité, la concavité, d''une fonction deux fois dérivable sur un intervalle', 7, 'savoir_faire', 'attendu'),
	('TCOMP-067', 'Analyse', 'Intégration', 'Définition de l''intégrale d''une fonction continue et positive sur $[a, b]$ comme aire sous la courbe. Notation $\int_a^b f(x)\,\mathrm{d}x$', 1, 'connaissance', 'attendu'),
	('TCOMP-068', 'Analyse', 'Intégration', 'Relation de Chasles', 2, 'connaissance', 'attendu'),
	('TCOMP-069', 'Analyse', 'Intégration', 'Valeur moyenne d''une fonction continue sur $[a, b]$. Approche graphique et numérique', 3, 'connaissance', 'attendu'),
	('TCOMP-070', 'Analyse', 'Intégration', 'La valeur moyenne est comprise entre les bornes de la fonction', 4, 'connaissance', 'attendu'),
	('TCOMP-071', 'Analyse', 'Intégration', 'Approximation d''une intégrale par la méthode des rectangles', 5, 'connaissance', 'attendu'),
	('TCOMP-072', 'Analyse', 'Intégration', 'Présentation de l''intégrale des fonctions continues de signe quelconque', 6, 'connaissance', 'attendu'),
	('TCOMP-073', 'Analyse', 'Intégration', 'Théorème : si $f$ est continue sur $[a, b]$, la fonction $F$ définie sur $[a, b]$ par $F(x) = \int_a^x f(t)\,\mathrm{d}t$ est dérivable sur $[a, b]$ et a pour dérivée $f$', 7, 'connaissance', 'attendu'),
	('TCOMP-074', 'Analyse', 'Intégration', 'Calcul d''intégrales à l''aide de primitives : si $F$ est une primitive de $f$, alors $\int_a^b f(x)\,\mathrm{d}x = F(b) - F(a)$', 8, 'connaissance', 'attendu'),
	('TCOMP-075', 'Analyse', 'Intégration', 'Estimer graphiquement ou encadrer une intégrale, une valeur moyenne', 9, 'savoir_faire', 'attendu'),
	('TCOMP-076', 'Analyse', 'Intégration', 'Calculer une intégrale', 10, 'savoir_faire', 'attendu'),
	('TCOMP-077', 'Analyse', 'Intégration', 'Calculer une valeur moyenne', 11, 'savoir_faire', 'attendu'),
	('TCOMP-078', 'Analyse', 'Intégration', 'Calculer l''aire sous une courbe', 12, 'savoir_faire', 'attendu'),
	('TCOMP-079', 'Analyse', 'Intégration', 'Calculer l''aire entre deux courbes', 13, 'savoir_faire', 'attendu'),
	('TCOMP-080', 'Analyse', 'Intégration', 'Interpréter une intégrale, une valeur moyenne dans un contexte issu d''une autre discipline', 14, 'savoir_faire', 'attendu'),
	('TCOMP-081', 'Analyse', 'Intégration', 'Dérivée de $x \mapsto \int_a^x f(t)\,\mathrm{d}t$ lorsque $f$ est une fonction continue positive croissante', 15, 'demonstration', 'approfondissement'),
	('TCOMP-082', 'Analyse', 'Intégration', 'Méthode des rectangles, des trapèzes', 16, 'savoir_faire', 'approfondissement'),
	('TCOMP-083', 'Analyse', 'Intégration', 'Méthode de Monte-Carlo pour un calcul d''aire', 17, 'savoir_faire', 'approfondissement'),
	('TCOMP-084', 'Probabilités et statistique', 'Lois discrètes', 'Loi uniforme sur $\{1, 2, \ldots, n\}$. Espérance', 1, 'connaissance', 'attendu'),
	('TCOMP-085', 'Probabilités et statistique', 'Lois discrètes', 'Épreuve de Bernoulli. Loi de Bernoulli : définition, espérance et écart type', 2, 'connaissance', 'attendu'),
	('TCOMP-086', 'Probabilités et statistique', 'Lois discrètes', 'Schéma de Bernoulli. Représentation par un arbre', 3, 'connaissance', 'attendu'),
	('TCOMP-087', 'Probabilités et statistique', 'Lois discrètes', 'Coefficients binomiaux : définition (nombre de façons d''obtenir $k$ succès dans un schéma de Bernoulli de taille $n$), triangle de Pascal, symétrie', 4, 'connaissance', 'attendu'),
	('TCOMP-088', 'Probabilités et statistique', 'Lois discrètes', 'Variable aléatoire suivant une loi binomiale $\mathcal{B}(n, p)$. Interprétation : nombre de succès dans le schéma de Bernoulli', 5, 'connaissance', 'attendu'),
	('TCOMP-089', 'Probabilités et statistique', 'Lois discrètes', 'Loi binomiale : expression, espérance et écart type (admis)', 6, 'connaissance', 'attendu'),
	('TCOMP-090', 'Probabilités et statistique', 'Lois discrètes', 'Loi binomiale : représentation graphique', 7, 'connaissance', 'attendu'),
	('TCOMP-091', 'Probabilités et statistique', 'Lois discrètes', 'Loi géométrique : définition, expression, espérance (admise), représentation graphique', 8, 'connaissance', 'attendu'),
	('TCOMP-092', 'Probabilités et statistique', 'Lois discrètes', 'Loi géométrique : propriété caractéristique (loi sans mémoire)', 9, 'connaissance', 'attendu'),
	('TCOMP-093', 'Probabilités et statistique', 'Lois discrètes', 'Identifier des situations où une variable aléatoire suit une loi de Bernoulli, une loi binomiale ou une loi géométrique', 10, 'savoir_faire', 'attendu'),
	('TCOMP-094', 'Probabilités et statistique', 'Lois discrètes', 'Déterminer des coefficients binomiaux à l''aide du triangle de Pascal', 11, 'savoir_faire', 'attendu'),
	('TCOMP-095', 'Probabilités et statistique', 'Lois discrètes', 'Dans le cas où $X$ suit une loi binomiale, calculer à l''aide d''une calculatrice ou d''un logiciel les probabilités des événements de type $P(X = k)$ ou $P(X \leqslant k)$, etc.', 12, 'savoir_faire', 'attendu'),
	('TCOMP-096', 'Probabilités et statistique', 'Lois discrètes', 'Calculer explicitement les probabilités des événements de type $P(X = k)$ ou $P(X \leqslant k)$ pour une variable aléatoire $X$ suivant une loi géométrique', 13, 'savoir_faire', 'attendu'),
	('TCOMP-097', 'Probabilités et statistique', 'Lois discrètes', 'Dans le cas où $X$ suit une loi binomiale, déterminer un intervalle $I$ pour lequel la probabilité $P(X \in I)$ est inférieure à une valeur donnée $\alpha$, ou supérieure à $1 - \alpha$', 14, 'savoir_faire', 'attendu'),
	('TCOMP-098', 'Probabilités et statistique', 'Lois discrètes', 'Dans le cadre de la résolution de problème, utiliser l''espérance des lois précédentes (uniforme, de Bernoulli, binomiale, géométrique)', 15, 'savoir_faire', 'attendu'),
	('TCOMP-099', 'Probabilités et statistique', 'Lois discrètes', 'Utiliser en situation la caractérisation d''une loi géométrique par l''absence de mémoire', 16, 'savoir_faire', 'attendu'),
	('TCOMP-100', 'Probabilités et statistique', 'Lois discrètes', 'Calculer des probabilités dans des situations faisant intervenir des probabilités conditionnelles', 17, 'savoir_faire', 'attendu'),
	('TCOMP-101', 'Probabilités et statistique', 'Lois discrètes', 'Calculer des probabilités dans des situations faisant intervenir des répétitions d''expériences aléatoires', 18, 'savoir_faire', 'attendu'),
	('TCOMP-102', 'Probabilités et statistique', 'Lois discrètes', 'Espérance et écart type d''une variable aléatoire suivant une loi de Bernoulli', 19, 'demonstration', 'approfondissement'),
	('TCOMP-103', 'Probabilités et statistique', 'Lois discrètes', 'Espérance d''une variable aléatoire uniforme sur $\{1, 2, \ldots, n\}$', 20, 'demonstration', 'approfondissement'),
	('TCOMP-104', 'Probabilités et statistique', 'Lois discrètes', 'Espérance d''une variable aléatoire suivant une loi binomiale ($n \leqslant 3$)', 21, 'demonstration', 'approfondissement'),
	('TCOMP-105', 'Probabilités et statistique', 'Lois discrètes', 'Caractérisation d''une loi géométrique par l''absence de mémoire', 22, 'demonstration', 'approfondissement'),
	('TCOMP-106', 'Probabilités et statistique', 'Lois à densité', 'Notion de loi à densité à partir d''exemples. Représentation d''une probabilité comme une aire', 1, 'connaissance', 'attendu'),
	('TCOMP-107', 'Probabilités et statistique', 'Lois à densité', 'Fonction de répartition $x \mapsto P(X \leqslant x)$', 2, 'connaissance', 'attendu'),
	('TCOMP-108', 'Probabilités et statistique', 'Lois à densité', 'Espérance et variance d''une loi à densité, expressions sous forme d''intégrales', 3, 'connaissance', 'attendu'),
	('TCOMP-109', 'Probabilités et statistique', 'Lois à densité', 'Loi uniforme sur $[0, 1]$ puis sur $[a, b]$. Fonction de densité, fonction de répartition. Espérance et variance', 4, 'connaissance', 'attendu'),
	('TCOMP-110', 'Probabilités et statistique', 'Lois à densité', 'Loi exponentielle. Fonction densité, fonction de répartition. Espérance, propriété d''absence de mémoire', 5, 'connaissance', 'attendu'),
	('TCOMP-111', 'Probabilités et statistique', 'Lois à densité', 'Déterminer si une fonction est une densité de probabilité', 6, 'savoir_faire', 'attendu'),
	('TCOMP-112', 'Probabilités et statistique', 'Lois à densité', 'Calculer des probabilités pour une variable aléatoire à densité', 7, 'savoir_faire', 'attendu'),
	('TCOMP-113', 'Probabilités et statistique', 'Lois à densité', 'Calculer l''espérance d''une variable aléatoire à densité', 8, 'savoir_faire', 'attendu'),
	('TCOMP-114', 'Probabilités et statistique', 'Lois à densité', 'Simulation d''une variable de Bernoulli ou d''un lancer de dé (ou d''une variable uniforme sur un ensemble fini) à partir d''une variable aléatoire de loi uniforme sur $[0, 1]$', 9, 'savoir_faire', 'approfondissement'),
	('TCOMP-115', 'Probabilités et statistique', 'Lois à densité', 'Simulation du comportement de la somme de $n$ variables aléatoires indépendantes et de même loi', 10, 'savoir_faire', 'approfondissement'),
	('TCOMP-116', 'Probabilités et statistique', 'Statistique à deux variables quantitatives', 'Nuage de points. Point moyen', 1, 'connaissance', 'attendu'),
	('TCOMP-117', 'Probabilités et statistique', 'Statistique à deux variables quantitatives', 'Ajustement affine. Droite des moindres carrés', 2, 'connaissance', 'attendu'),
	('TCOMP-118', 'Probabilités et statistique', 'Statistique à deux variables quantitatives', 'Coefficient de corrélation', 3, 'connaissance', 'attendu'),
	('TCOMP-119', 'Probabilités et statistique', 'Statistique à deux variables quantitatives', 'Ajustement se ramenant par changement de variable à un ajustement affine', 4, 'connaissance', 'attendu'),
	('TCOMP-120', 'Probabilités et statistique', 'Statistique à deux variables quantitatives', 'Application des ajustements à des interpolations ou extrapolations', 5, 'connaissance', 'attendu'),
	('TCOMP-121', 'Probabilités et statistique', 'Statistique à deux variables quantitatives', 'Représenter un nuage de points', 6, 'savoir_faire', 'attendu'),
	('TCOMP-122', 'Probabilités et statistique', 'Statistique à deux variables quantitatives', 'Calculer les coordonnées d''un point moyen', 7, 'savoir_faire', 'attendu'),
	('TCOMP-123', 'Probabilités et statistique', 'Statistique à deux variables quantitatives', 'Déterminer une droite de régression, à l''aide de la calculatrice, d''un logiciel ou par calcul', 8, 'savoir_faire', 'attendu'),
	('TCOMP-124', 'Probabilités et statistique', 'Statistique à deux variables quantitatives', 'Dans le cadre d''une résolution de problème, utiliser un ajustement pour interpoler, extrapoler', 9, 'savoir_faire', 'attendu'),
	('TCOMP-125', 'Probabilités et statistique', 'Statistique à deux variables quantitatives', 'Droite des moindres carrés (démonstration)', 10, 'demonstration', 'approfondissement'),
	('TCOMP-126', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notions d''élément d''un ensemble, de sous-ensemble, d''appartenance et d''inclusion, de réunion, d''intersection et de complémentaire', 1, 'connaissance', 'attendu'),
	('TCOMP-127', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Symboles de base correspondants : $\in$, $\subset$, $\cap$, $\cup$', 2, 'connaissance', 'attendu'),
	('TCOMP-128', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notation des ensembles de nombres et des intervalles', 3, 'connaissance', 'attendu'),
	('TCOMP-129', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notion de couple', 4, 'connaissance', 'attendu'),
	('TCOMP-130', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notation du complémentaire d''un sous-ensemble $A$ de $E$ : $\bar{A}$ (notation des probabilités) ou $E \setminus A$', 5, 'connaissance', 'attendu'),
	('TCOMP-131', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Symbole de somme $\sum$ pour écrire concisément certaines expressions (son emploi comme outil de calcul n''est pas un objectif du programme)', 6, 'connaissance', 'attendu'),
	('TCOMP-132', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Reconnaître ce qu''est une proposition mathématique', 1, 'savoir_faire', 'attendu'),
	('TCOMP-133', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Utiliser des variables pour écrire des propositions mathématiques', 2, 'savoir_faire', 'attendu'),
	('TCOMP-134', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Lire et écrire des propositions contenant les connecteurs « et », « ou »', 3, 'savoir_faire', 'attendu'),
	('TCOMP-135', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Formuler la négation de propositions simples (sans implication ni quantificateurs)', 4, 'savoir_faire', 'attendu'),
	('TCOMP-136', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Mobiliser un contre-exemple pour montrer qu''une proposition est fausse', 5, 'savoir_faire', 'attendu'),
	('TCOMP-137', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Formuler une implication, une équivalence logique, et les mobiliser dans un raisonnement simple', 6, 'savoir_faire', 'attendu'),
	('TCOMP-138', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Formuler la réciproque d''une implication', 7, 'savoir_faire', 'attendu'),
	('TCOMP-139', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Lire et écrire des propositions contenant une quantification universelle ou existentielle (les symboles $\forall$ et $\exists$ ne sont pas exigibles)', 8, 'savoir_faire', 'attendu')
) AS v(code, theme_name, objective_name, point_name, ord, kind, exigence)
JOIN public.curriculum_themes t     ON t.grade = 'T_COMP' AND t.name = v.theme_name
JOIN public.curriculum_objectives o ON o.theme_id = t.id AND o.name = v.objective_name;

END $bootstrap$;
