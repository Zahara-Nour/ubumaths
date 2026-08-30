-- ============================================================================
-- Amorçage — Référentiel de programme, niveau '2'
-- ============================================================================
-- GÉNÉRÉ par scripts/generate-curriculum-seed.ts depuis
-- docs/wip/referentiel/2de-programme.md — ne pas éditer à la main.
--
-- Source : « Programme de spécialité de mathématiques de la classe de première
-- de la voie générale » (programme en vigueur, avec la partie transversale
-- « Automatismes » ; ce n'est PAS l'arrêté du 17 janvier 2019).
--
--   6 thèmes · 14 objectifs · 185 points
--   kind        : 68 connaissance · 105 savoir_faire · 12 demonstration
--   exigence    : 163 attendu · 22 approfondissement
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

IF EXISTS (SELECT 1 FROM public.curriculum_themes WHERE grade = '2') THEN
	RAISE NOTICE 'Référentiel 2 déjà amorcé — aucune modification.';
	RETURN;
END IF;

-- ---------------------------------------------------------------------------
-- 1. Thèmes
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_themes (grade, name, display_order) VALUES
	('2', 'Vocabulaire ensembliste et logique', 1),
	('2', 'Algorithmique et programmation', 2),
	('2', 'Nombres et calculs, algèbre', 3),
	('2', 'Géométrie', 4),
	('2', 'Fonctions', 5),
	('2', 'Statistiques et probabilités', 6);

-- ---------------------------------------------------------------------------
-- 2. Objectifs
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_objectives (theme_id, name, display_order)
SELECT t.id, v.objective_name, v.ord
FROM (VALUES
	('Vocabulaire ensembliste et logique', 'Ensembles', 1),
	('Vocabulaire ensembliste et logique', 'Logique et raisonnement', 2),
	('Algorithmique et programmation', 'Variables et instructions élémentaires', 1),
	('Algorithmique et programmation', 'Notion de fonction', 2),
	('Nombres et calculs, algèbre', 'Arithmétique', 1),
	('Nombres et calculs, algèbre', 'Nombres réels', 2),
	('Nombres et calculs, algèbre', 'Algèbre', 3),
	('Géométrie', 'Vecteurs et problèmes de géométrie', 1),
	('Géométrie', 'Droites du plan', 2),
	('Fonctions', 'Représentation algébrique et graphique des fonctions', 1),
	('Fonctions', 'Variations et extrémums d''une fonction', 2),
	('Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 1),
	('Statistiques et probabilités', 'Croisement de deux variables qualitatives', 2),
	('Statistiques et probabilités', 'Probabilités', 3)
) AS v(theme_name, objective_name, ord)
JOIN public.curriculum_themes t ON t.grade = '2' AND t.name = v.theme_name;

-- ---------------------------------------------------------------------------
-- 3. Points
-- ---------------------------------------------------------------------------
-- `code` explicite : la série du markdown. Le trigger d'attribution ne prend
-- la main que pour les points créés ensuite depuis l'app, qui prennent la suite.
INSERT INTO public.curriculum_points (objective_id, code, name, display_order, kind, exigence)
SELECT o.id, v.code, v.point_name, v.ord, v.kind, v.exigence
FROM (VALUES
	('2-001', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notions d''élément d''un ensemble, de sous-ensemble, d''ensemble vide, d''appartenance et d''inclusion, de réunion, d''intersection et de complémentaire', 1, 'connaissance', 'attendu'),
	('2-002', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Symboles de base correspondants : $\varnothing$, $\in$, $\subset$, $\cap$, $\cup$, $\{\,\ldots\,\}$', 2, 'connaissance', 'attendu'),
	('2-003', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notation des ensembles de nombres et des intervalles', 3, 'connaissance', 'attendu'),
	('2-004', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notion de couple et de produit cartésien de deux ensembles', 4, 'connaissance', 'attendu'),
	('2-005', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notation du complémentaire d''un sous-ensemble $A$ de $E$ : $\bar{A}$ (notation des probabilités) ou $E \setminus A$', 5, 'connaissance', 'attendu'),
	('2-006', 'Vocabulaire ensembliste et logique', 'Ensembles', 'Notation $\operatorname{Card}(A)$ pour le cardinal d''un ensemble fini', 6, 'connaissance', 'attendu'),
	('2-007', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Reconnaitre ce qu''est une proposition mathématique', 1, 'savoir_faire', 'attendu'),
	('2-008', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Utiliser des variables pour écrire des propositions mathématiques', 2, 'savoir_faire', 'attendu'),
	('2-009', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Lire et écrire des propositions contenant les connecteurs « et », « ou »', 3, 'savoir_faire', 'attendu'),
	('2-010', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Formuler la négation de propositions simples (sans implication ni quantificateurs)', 4, 'savoir_faire', 'attendu'),
	('2-011', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Mobiliser un contre-exemple pour montrer qu''une proposition est fausse', 5, 'savoir_faire', 'attendu'),
	('2-012', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Formuler une implication, une équivalence logique, et les mobiliser dans un raisonnement simple', 6, 'savoir_faire', 'attendu'),
	('2-013', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Formuler la réciproque d''une implication, la contraposée', 7, 'savoir_faire', 'attendu'),
	('2-014', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Lire et écrire des propositions contenant une quantification universelle ou existentielle (les symboles $\forall$ et $\exists$ sont hors programme)', 8, 'savoir_faire', 'attendu'),
	('2-015', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Produire un raisonnement par disjonction des cas', 9, 'savoir_faire', 'attendu'),
	('2-016', 'Vocabulaire ensembliste et logique', 'Logique et raisonnement', 'Produire un raisonnement par l''absurde', 10, 'savoir_faire', 'attendu'),
	('2-017', 'Algorithmique et programmation', 'Variables et instructions élémentaires', 'Variables informatiques de type entier, booléen, flottant, chaine de caractères', 1, 'connaissance', 'attendu'),
	('2-018', 'Algorithmique et programmation', 'Variables et instructions élémentaires', 'Affectation (notée $\leftarrow$ en langage naturel)', 2, 'connaissance', 'attendu'),
	('2-019', 'Algorithmique et programmation', 'Variables et instructions élémentaires', 'Séquence d''instructions', 3, 'connaissance', 'attendu'),
	('2-020', 'Algorithmique et programmation', 'Variables et instructions élémentaires', 'Instruction conditionnelle', 4, 'connaissance', 'attendu'),
	('2-021', 'Algorithmique et programmation', 'Variables et instructions élémentaires', 'Boucle bornée (`for`), boucle non bornée (`while`)', 5, 'connaissance', 'attendu'),
	('2-022', 'Algorithmique et programmation', 'Variables et instructions élémentaires', 'Choisir ou déterminer le type d''une variable (entier, flottant ou chaine de caractères)', 6, 'savoir_faire', 'attendu'),
	('2-023', 'Algorithmique et programmation', 'Variables et instructions élémentaires', 'Concevoir et écrire une instruction d''affectation, une séquence d''instructions, une instruction conditionnelle', 7, 'savoir_faire', 'attendu'),
	('2-024', 'Algorithmique et programmation', 'Variables et instructions élémentaires', 'Écrire une formule permettant un calcul combinant des variables', 8, 'savoir_faire', 'attendu'),
	('2-025', 'Algorithmique et programmation', 'Variables et instructions élémentaires', 'Programmer, dans des cas simples, une boucle bornée, une boucle non bornée', 9, 'savoir_faire', 'attendu'),
	('2-026', 'Algorithmique et programmation', 'Variables et instructions élémentaires', 'Dans des cas plus complexes : lire, comprendre, modifier ou compléter un algorithme ou un programme', 10, 'savoir_faire', 'attendu'),
	('2-027', 'Algorithmique et programmation', 'Notion de fonction', 'Fonctions à un ou plusieurs arguments', 1, 'connaissance', 'attendu'),
	('2-028', 'Algorithmique et programmation', 'Notion de fonction', 'Fonction renvoyant un nombre aléatoire ; série statistique obtenue par la répétition de l''appel d''une telle fonction', 2, 'connaissance', 'attendu'),
	('2-029', 'Algorithmique et programmation', 'Notion de fonction', 'Écrire des fonctions simples ; appeler une fonction', 3, 'savoir_faire', 'attendu'),
	('2-030', 'Algorithmique et programmation', 'Notion de fonction', 'Lire, comprendre, modifier, compléter des fonctions plus complexes', 4, 'savoir_faire', 'attendu'),
	('2-031', 'Algorithmique et programmation', 'Notion de fonction', 'Lire et comprendre une fonction renvoyant une moyenne, un écart type (aucune connaissance sur les listes n''est exigée)', 5, 'savoir_faire', 'attendu'),
	('2-032', 'Algorithmique et programmation', 'Notion de fonction', 'Écrire des fonctions renvoyant le résultat numérique d''une expérience aléatoire, d''une répétition d''expériences aléatoires indépendantes', 6, 'savoir_faire', 'attendu'),
	('2-033', 'Nombres et calculs, algèbre', 'Arithmétique', 'Notations $\mathbb{N}$ et $\mathbb{Z}$', 1, 'connaissance', 'attendu'),
	('2-034', 'Nombres et calculs, algèbre', 'Arithmétique', 'Définition des notions de multiple, de diviseur, de nombre pair, de nombre impair : $a$ est multiple de $b$ s''il existe un entier $k$ tel que $a = kb$', 2, 'connaissance', 'attendu'),
	('2-035', 'Nombres et calculs, algèbre', 'Arithmétique', 'Modéliser et résoudre des problèmes mobilisant les notions de multiple, de diviseur, de nombre pair, de nombre impair', 3, 'savoir_faire', 'attendu'),
	('2-036', 'Nombres et calculs, algèbre', 'Arithmétique', 'Présenter les fractions sous forme irréductible', 4, 'savoir_faire', 'attendu'),
	('2-037', 'Nombres et calculs, algèbre', 'Arithmétique', 'Pour une valeur numérique de $a$, la somme de deux multiples de $a$ est multiple de $a$', 5, 'demonstration', 'attendu'),
	('2-038', 'Nombres et calculs, algèbre', 'Arithmétique', 'Le carré d''un nombre impair est impair', 6, 'demonstration', 'attendu'),
	('2-039', 'Nombres et calculs, algèbre', 'Arithmétique', 'Déterminer si un entier naturel $a$ est multiple d''un entier naturel $b$', 7, 'savoir_faire', 'approfondissement'),
	('2-040', 'Nombres et calculs, algèbre', 'Arithmétique', 'Pour des entiers $a$ et $b$ donnés, déterminer le plus grand multiple de $a$ inférieur ou égal à $b$', 8, 'savoir_faire', 'approfondissement'),
	('2-041', 'Nombres et calculs, algèbre', 'Nombres réels', 'Ensemble $\mathbb{R}$ des nombres réels, droite numérique', 1, 'connaissance', 'attendu'),
	('2-042', 'Nombres et calculs, algèbre', 'Nombres réels', 'Intervalles de $\mathbb{R}$ ; représentation graphique, notations du type $[a\,;\,+\infty[$, $]-\infty\,;\,a]$, $[a\,;\,b]$', 2, 'connaissance', 'attendu'),
	('2-043', 'Nombres et calculs, algèbre', 'Nombres réels', 'Notation en valeur absolue $|a|$ pour la distance de $a$ à $0$ ; distance entre deux nombres réels', 3, 'connaissance', 'attendu'),
	('2-044', 'Nombres et calculs, algèbre', 'Nombres réels', 'Inéquation du type $|x - a| \leqslant r$ ; représentation graphique des solutions, intervalle $[a - r\,;\,a + r]$', 4, 'connaissance', 'attendu'),
	('2-045', 'Nombres et calculs, algèbre', 'Nombres réels', 'Ensemble $\mathbb{D}$ des nombres décimaux ; encadrement décimal d''un nombre réel à $10^{-n}$ près', 5, 'connaissance', 'attendu'),
	('2-046', 'Nombres et calculs, algèbre', 'Nombres réels', 'Ensemble $\mathbb{Q}$ des nombres rationnels ; nombres irrationnels, exemples fournis par la géométrie comme $\sqrt{2}$ et $\pi$', 6, 'connaissance', 'attendu'),
	('2-047', 'Nombres et calculs, algèbre', 'Nombres réels', 'Lire l''abscisse d''un nombre réel sur une droite graduée', 7, 'savoir_faire', 'attendu'),
	('2-048', 'Nombres et calculs, algèbre', 'Nombres réels', 'Placer un nombre réel d''abscisse donnée sur une droite graduée', 8, 'savoir_faire', 'attendu'),
	('2-049', 'Nombres et calculs, algèbre', 'Nombres réels', 'Représenter un intervalle de la droite numérique', 9, 'savoir_faire', 'attendu'),
	('2-050', 'Nombres et calculs, algèbre', 'Nombres réels', 'Déterminer si un nombre réel appartient à un intervalle donné', 10, 'savoir_faire', 'attendu'),
	('2-051', 'Nombres et calculs, algèbre', 'Nombres réels', 'Donner un encadrement, d''amplitude donnée, d''un nombre réel par des décimaux', 11, 'savoir_faire', 'attendu'),
	('2-052', 'Nombres et calculs, algèbre', 'Nombres réels', 'Dans le cadre de la résolution de problèmes, arrondir en donnant le nombre de chiffres significatifs adapté à la situation étudiée', 12, 'savoir_faire', 'attendu'),
	('2-053', 'Nombres et calculs, algèbre', 'Nombres réels', 'Le nombre rationnel $\tfrac{1}{3}$ n''est pas décimal', 13, 'demonstration', 'attendu'),
	('2-054', 'Nombres et calculs, algèbre', 'Nombres réels', 'Le nombre réel $\sqrt{2}$ est irrationnel', 14, 'demonstration', 'attendu'),
	('2-055', 'Nombres et calculs, algèbre', 'Nombres réels', 'Déterminer par balayage un encadrement de $\sqrt{2}$ d''amplitude inférieure ou égale à $10^{-n}$', 15, 'demonstration', 'attendu'),
	('2-056', 'Nombres et calculs, algèbre', 'Nombres réels', 'Développement décimal illimité d''un nombre réel', 16, 'savoir_faire', 'approfondissement'),
	('2-057', 'Nombres et calculs, algèbre', 'Nombres réels', 'Observation, sur des exemples, de la périodicité du développement décimal de nombres rationnels', 17, 'savoir_faire', 'approfondissement'),
	('2-058', 'Nombres et calculs, algèbre', 'Algèbre', 'Règles de calcul sur les puissances entières relatives', 1, 'connaissance', 'attendu'),
	('2-059', 'Nombres et calculs, algèbre', 'Algèbre', 'Règles de calcul sur les racines carrées ; relation $\sqrt{a^2} = |a|$', 2, 'connaissance', 'attendu'),
	('2-060', 'Nombres et calculs, algèbre', 'Algèbre', 'Exemples simples de calcul sur des expressions algébriques, en particulier sur des expressions fractionnaires', 3, 'connaissance', 'attendu'),
	('2-061', 'Nombres et calculs, algèbre', 'Algèbre', 'Somme d''inégalités ; produit d''une inégalité par un réel positif, négatif, en liaison avec le sens de variation d''une fonction affine', 4, 'connaissance', 'attendu'),
	('2-062', 'Nombres et calculs, algèbre', 'Algèbre', 'Comparaison additive (par différence), comparaison multiplicative (par rapport, pour deux nombres strictement positifs)', 5, 'connaissance', 'attendu'),
	('2-063', 'Nombres et calculs, algèbre', 'Algèbre', 'Ensemble des solutions des équations du type $ax + b = 0$ et des inéquations de la forme $ax + b > 0$', 6, 'connaissance', 'attendu'),
	('2-064', 'Nombres et calculs, algèbre', 'Algèbre', 'Équation de la forme $A(x)B(x) = 0$ (équation produit nul)', 7, 'connaissance', 'attendu'),
	('2-065', 'Nombres et calculs, algèbre', 'Algèbre', 'En liaison avec la section « Fonctions », étude du signe des expressions de la forme $A(x)B(x)$ et $\tfrac{A(x)}{B(x)}$', 8, 'connaissance', 'attendu'),
	('2-066', 'Nombres et calculs, algèbre', 'Algèbre', 'Équation $\tfrac{A(x)}{B(x)} = k$ (équation quotient), en lien avec l''ensemble de définition d''une expression', 9, 'connaissance', 'attendu'),
	('2-067', 'Nombres et calculs, algèbre', 'Algèbre', 'Effectuer des calculs numériques ou littéraux mettant en jeu des puissances, des racines carrées, des écritures fractionnaires', 10, 'savoir_faire', 'attendu'),
	('2-068', 'Nombres et calculs, algèbre', 'Algèbre', 'Sur des cas simples de relations entre variables ($U = RI$, $d = vt$, $S = \pi r^2$, $V = abc$, $V = \pi r^2 h$), exprimer une variable en fonction des autres', 11, 'savoir_faire', 'attendu'),
	('2-069', 'Nombres et calculs, algèbre', 'Algèbre', 'Exprimer une variable en fonction de l''autre dans une relation du premier degré $ax + by = c$', 12, 'savoir_faire', 'attendu'),
	('2-070', 'Nombres et calculs, algèbre', 'Algèbre', 'Choisir la forme la plus adaptée (factorisée, développée réduite) d''une expression en vue de la résolution d''un problème', 13, 'savoir_faire', 'attendu'),
	('2-071', 'Nombres et calculs, algèbre', 'Algèbre', 'Comparer deux quantités en utilisant leur différence, ou leur rapport (ratio) dans le cas de quantités positives', 14, 'savoir_faire', 'attendu'),
	('2-072', 'Nombres et calculs, algèbre', 'Algèbre', 'Interpréter, selon le contexte, cette comparaison en termes de variation additive ou multiplicative', 15, 'savoir_faire', 'attendu'),
	('2-073', 'Nombres et calculs, algèbre', 'Algèbre', 'Modéliser un problème par une inéquation', 16, 'savoir_faire', 'attendu'),
	('2-074', 'Nombres et calculs, algèbre', 'Algèbre', 'Donner l''ensemble des solutions d''une équation du premier degré du type $ax = b$, $a + x = b$, $ax + b = cx + d$', 17, 'savoir_faire', 'attendu'),
	('2-075', 'Nombres et calculs, algèbre', 'Algèbre', 'Donner l''ensemble des solutions d''une inéquation du premier degré du type $ax \geqslant b$, $a + x \geqslant b$, $ax + b \geqslant cx + d$', 18, 'savoir_faire', 'attendu'),
	('2-076', 'Nombres et calculs, algèbre', 'Algèbre', 'Donner l''ensemble des solutions d''une équation du type $x^2 = a$', 19, 'savoir_faire', 'attendu'),
	('2-077', 'Nombres et calculs, algèbre', 'Algèbre', 'Quels que soient les réels positifs $a$ et $b$, on a $\sqrt{ab} = \sqrt{a}\,\sqrt{b}$', 20, 'demonstration', 'attendu'),
	('2-078', 'Nombres et calculs, algèbre', 'Algèbre', 'Déterminer la première puissance d''un nombre positif donné supérieure ou inférieure à une valeur donnée', 21, 'demonstration', 'attendu'),
	('2-079', 'Nombres et calculs, algèbre', 'Algèbre', 'Développement de $(a + b + c)^2$', 22, 'savoir_faire', 'approfondissement'),
	('2-080', 'Nombres et calculs, algèbre', 'Algèbre', 'Développement de $(a + b)^3$', 23, 'savoir_faire', 'approfondissement'),
	('2-081', 'Nombres et calculs, algèbre', 'Algèbre', 'Inégalité entre moyennes géométrique et arithmétique de deux réels strictement positifs', 24, 'savoir_faire', 'approfondissement'),
	('2-082', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Égalité de deux vecteurs ; notation $\vec{u}$ ; vecteur nul', 1, 'connaissance', 'attendu'),
	('2-083', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Représentants d''un vecteur', 2, 'connaissance', 'attendu'),
	('2-084', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Produit d''un vecteur par un nombre réel', 3, 'connaissance', 'attendu'),
	('2-085', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Colinéarité de deux vecteurs', 4, 'connaissance', 'attendu'),
	('2-086', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Représentation d''un vecteur comme combinaison de deux vecteurs non colinéaires', 5, 'connaissance', 'attendu'),
	('2-087', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Base orthonormée ; coordonnées d''un vecteur', 6, 'connaissance', 'attendu'),
	('2-088', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Expression de la norme d''un vecteur', 7, 'connaissance', 'attendu'),
	('2-089', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Expression des coordonnées de $\vec{AB}$ en fonction de celles de $A$ et de $B$', 8, 'connaissance', 'attendu'),
	('2-090', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Déterminant de deux vecteurs dans une base orthonormée, critère de colinéarité ; application à l''alignement, au parallélisme', 9, 'connaissance', 'attendu'),
	('2-091', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Caractérisation vectorielle du milieu d''un segment', 10, 'connaissance', 'attendu'),
	('2-092', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Représenter la somme de deux vecteurs à partir de représentants de même origine', 11, 'savoir_faire', 'attendu'),
	('2-093', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Représenter un vecteur dont on connait les coordonnées', 12, 'savoir_faire', 'attendu'),
	('2-094', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Lire les coordonnées d''un vecteur', 13, 'savoir_faire', 'attendu'),
	('2-095', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Calculer les coordonnées d''une somme de vecteurs, d''un produit d''un vecteur par un nombre réel', 14, 'savoir_faire', 'attendu'),
	('2-096', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Calculer la distance entre deux points', 15, 'savoir_faire', 'attendu'),
	('2-097', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Calculer les coordonnées du milieu d''un segment', 16, 'savoir_faire', 'attendu'),
	('2-098', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Caractériser alignement et parallélisme par la colinéarité de vecteurs', 17, 'savoir_faire', 'attendu'),
	('2-099', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Résoudre des problèmes en utilisant la représentation la plus adaptée des vecteurs', 18, 'savoir_faire', 'attendu'),
	('2-100', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Résoudre des problèmes avec des méthodes diverses (méthodes vectorielles, repérées ou non, méthodes géométriques)', 19, 'savoir_faire', 'attendu'),
	('2-101', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Caractérisations de la colinéarité de deux vecteurs non nuls : nullité du déterminant ; proportionnalité des coordonnées', 20, 'demonstration', 'attendu'),
	('2-102', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Barycentre de deux ou trois points', 21, 'savoir_faire', 'approfondissement'),
	('2-103', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Formule permettant le calcul des coordonnées du milieu d''un segment', 22, 'savoir_faire', 'approfondissement'),
	('2-104', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Démontrer que les hauteurs d''un triangle sont concourantes', 23, 'savoir_faire', 'approfondissement'),
	('2-105', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Expression de l''aire d''un triangle : $\tfrac{1}{2}ab\sin C$', 24, 'savoir_faire', 'approfondissement'),
	('2-106', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Démontrer que l''isobarycentre de trois points non alignés est l''intersection des médianes', 25, 'savoir_faire', 'approfondissement'),
	('2-107', 'Géométrie', 'Vecteurs et problèmes de géométrie', 'Démontrer que le point de concours des médiatrices est le centre du cercle circonscrit', 26, 'savoir_faire', 'approfondissement'),
	('2-108', 'Géométrie', 'Droites du plan', 'Vecteur directeur d''une droite', 1, 'connaissance', 'attendu'),
	('2-109', 'Géométrie', 'Droites du plan', 'Équation de droite : équation cartésienne, équation réduite', 2, 'connaissance', 'attendu'),
	('2-110', 'Géométrie', 'Droites du plan', 'Pente (ou coefficient directeur) d''une droite non parallèle à l''axe des ordonnées', 3, 'connaissance', 'attendu'),
	('2-111', 'Géométrie', 'Droites du plan', 'Déterminer une équation de droite à partir de deux points, d''un point et un vecteur directeur, ou d''un point et la pente', 4, 'savoir_faire', 'attendu'),
	('2-112', 'Géométrie', 'Droites du plan', 'Déterminer la pente ou un vecteur directeur d''une droite donnée par une équation ou une représentation graphique', 5, 'savoir_faire', 'attendu'),
	('2-113', 'Géométrie', 'Droites du plan', 'Tracer une droite connaissant son équation cartésienne ou réduite', 6, 'savoir_faire', 'attendu'),
	('2-114', 'Géométrie', 'Droites du plan', 'Établir que trois points sont alignés ou non', 7, 'savoir_faire', 'attendu'),
	('2-115', 'Géométrie', 'Droites du plan', 'Déterminer si deux droites sont parallèles ou sécantes', 8, 'savoir_faire', 'attendu'),
	('2-116', 'Géométrie', 'Droites du plan', 'Déterminer le point d''intersection de deux droites sécantes données par leur équation réduite', 9, 'savoir_faire', 'attendu'),
	('2-117', 'Géométrie', 'Droites du plan', 'En utilisant le déterminant, établir la forme générale d''une équation de droite', 10, 'demonstration', 'attendu'),
	('2-118', 'Géométrie', 'Droites du plan', 'Étudier l''alignement de trois points dans le plan', 11, 'savoir_faire', 'approfondissement'),
	('2-119', 'Géométrie', 'Droites du plan', 'Déterminer une équation de droite passant par deux points donnés', 12, 'savoir_faire', 'approfondissement'),
	('2-120', 'Géométrie', 'Droites du plan', 'Ensemble des points équidistants d''un point et de l''axe des abscisses', 13, 'savoir_faire', 'approfondissement'),
	('2-121', 'Géométrie', 'Droites du plan', 'Représentation, sur des exemples, de parties du plan décrites par des inégalités sur les coordonnées', 14, 'savoir_faire', 'approfondissement'),
	('2-122', 'Fonctions', 'Représentation algébrique et graphique des fonctions', 'Fonction à valeurs réelles définie sur un intervalle ou une réunion finie d''intervalles de $\mathbb{R}$', 1, 'connaissance', 'attendu'),
	('2-123', 'Fonctions', 'Représentation algébrique et graphique des fonctions', 'Recherche de domaine d''étude (ensemble de définition)', 2, 'connaissance', 'attendu'),
	('2-124', 'Fonctions', 'Représentation algébrique et graphique des fonctions', 'Courbe représentative : la courbe d''équation $y = f(x)$ est l''ensemble des points du plan dont les coordonnées $(x\,;\,y)$ vérifient $y = f(x)$', 3, 'connaissance', 'attendu'),
	('2-125', 'Fonctions', 'Représentation algébrique et graphique des fonctions', 'Signe d''une fonction affine et des fonctions de référence', 4, 'connaissance', 'attendu'),
	('2-126', 'Fonctions', 'Représentation algébrique et graphique des fonctions', 'Tableau de signes pour une fonction produit ou quotient', 5, 'connaissance', 'attendu'),
	('2-127', 'Fonctions', 'Représentation algébrique et graphique des fonctions', 'Exploiter l''équation $y = f(x)$ d''une courbe : appartenance, calcul de coordonnées', 6, 'savoir_faire', 'attendu'),
	('2-128', 'Fonctions', 'Représentation algébrique et graphique des fonctions', 'Modéliser par des fonctions des situations issues des mathématiques, des autres disciplines ou de la vie courante ou citoyenne', 7, 'savoir_faire', 'attendu'),
	('2-129', 'Fonctions', 'Représentation algébrique et graphique des fonctions', 'Fonctions valeur absolue, carré, inverse : définitions et courbes représentatives', 8, 'savoir_faire', 'attendu'),
	('2-130', 'Fonctions', 'Représentation algébrique et graphique des fonctions', 'Résoudre une équation ou une inéquation du type $f(x) = k$, $f(x) < k$, en choisissant une méthode adaptée : graphique, algébrique, logicielle', 9, 'savoir_faire', 'attendu'),
	('2-131', 'Fonctions', 'Représentation algébrique et graphique des fonctions', 'Résoudre une équation ou une inéquation de la forme $f(x) = 0$, $f(x) > 0$ à l''aide d''un tableau de signes, lorsque $f$ est un produit ou un quotient', 10, 'savoir_faire', 'attendu'),
	('2-132', 'Fonctions', 'Représentation algébrique et graphique des fonctions', 'Résoudre, graphiquement ou à l''aide d''un outil numérique, une équation ou inéquation du type $f(x) = g(x)$, $f(x) < g(x)$', 11, 'savoir_faire', 'attendu'),
	('2-133', 'Fonctions', 'Représentation algébrique et graphique des fonctions', 'Pour les fonctions affines, valeur absolue, carré, inverse, racine carrée et cube, résoudre graphiquement ou algébriquement une équation ou une inéquation du type $f(x) = k$, $f(x) < k$', 12, 'savoir_faire', 'attendu'),
	('2-134', 'Fonctions', 'Variations et extrémums d''une fonction', 'Croissance, décroissance, monotonie d''une fonction définie sur un intervalle ; tableau de variations', 1, 'connaissance', 'attendu'),
	('2-135', 'Fonctions', 'Variations et extrémums d''une fonction', 'Maximum, minimum d''une fonction sur un intervalle', 2, 'connaissance', 'attendu'),
	('2-136', 'Fonctions', 'Variations et extrémums d''une fonction', 'Pour une fonction affine donnée par $f(x) = mx + p$, interprétation de $m$ comme taux d''accroissement et de $p$ comme ordonnée à l''origine', 3, 'connaissance', 'attendu'),
	('2-137', 'Fonctions', 'Variations et extrémums d''une fonction', 'Variations d''une fonction affine selon le signe du coefficient directeur', 4, 'connaissance', 'attendu'),
	('2-138', 'Fonctions', 'Variations et extrémums d''une fonction', 'Relier représentation graphique et tableau de variations', 5, 'savoir_faire', 'attendu'),
	('2-139', 'Fonctions', 'Variations et extrémums d''une fonction', 'Déterminer graphiquement les extrémums d''une fonction sur un intervalle', 6, 'savoir_faire', 'attendu'),
	('2-140', 'Fonctions', 'Variations et extrémums d''une fonction', 'Exploiter un logiciel de géométrie dynamique ou de calcul formel, la calculatrice ou Python pour décrire les variations d''une fonction donnée par une formule', 7, 'savoir_faire', 'attendu'),
	('2-141', 'Fonctions', 'Variations et extrémums d''une fonction', 'Pour une fonction affine, relier sens de variation, signe de la fonction et droite représentative', 8, 'savoir_faire', 'attendu'),
	('2-142', 'Fonctions', 'Variations et extrémums d''une fonction', 'Traiter des problèmes d''optimisation', 9, 'savoir_faire', 'attendu'),
	('2-143', 'Fonctions', 'Variations et extrémums d''une fonction', 'Fonctions valeur absolue, carré : signe et variations', 10, 'savoir_faire', 'attendu'),
	('2-144', 'Fonctions', 'Variations et extrémums d''une fonction', 'Pour deux nombres $a$ et $b$ donnés et une fonction de référence $f$, comparer $f(a)$ et $f(b)$ numériquement ou graphiquement', 11, 'savoir_faire', 'attendu'),
	('2-145', 'Fonctions', 'Variations et extrémums d''une fonction', 'Variations des fonctions affines', 12, 'demonstration', 'attendu'),
	('2-146', 'Fonctions', 'Variations et extrémums d''une fonction', 'Position relative des courbes d''équation $y = x$ et $y = x^2$, pour $x \geqslant 0$', 13, 'demonstration', 'attendu'),
	('2-147', 'Fonctions', 'Variations et extrémums d''une fonction', 'Variations des fonctions carré, inverse', 14, 'demonstration', 'attendu'),
	('2-148', 'Fonctions', 'Variations et extrémums d''une fonction', 'Pour une fonction dont le tableau de variations est donné, algorithmes d''approximation numérique d''un extrémum (balayage, dichotomie)', 15, 'savoir_faire', 'approfondissement'),
	('2-149', 'Fonctions', 'Variations et extrémums d''une fonction', 'Algorithme de calcul approché de longueur d''une portion de courbe représentative de fonction', 16, 'savoir_faire', 'approfondissement'),
	('2-150', 'Fonctions', 'Variations et extrémums d''une fonction', 'Relier les courbes représentatives de la fonction racine carrée et de la fonction carré sur $\mathbb{R}^+$', 17, 'savoir_faire', 'approfondissement'),
	('2-151', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Ensembles de référence inclus les uns dans les autres : pourcentage de pourcentage', 1, 'connaissance', 'attendu'),
	('2-152', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Évolution : variation absolue (variation additive) $V_2 - V_1$', 2, 'connaissance', 'attendu'),
	('2-153', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Évolution : coefficient multiplicateur (variation multiplicative) $\tfrac{V_2}{V_1}$', 3, 'connaissance', 'attendu'),
	('2-154', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Évolution : variation relative (taux d''évolution) $\tfrac{V_2 - V_1}{V_1}$', 4, 'connaissance', 'attendu'),
	('2-155', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Évolutions successives, évolution réciproque : relation sur les coefficients multiplicateurs (produit, inverse)', 5, 'connaissance', 'attendu'),
	('2-156', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Linéarité de la moyenne', 6, 'connaissance', 'attendu'),
	('2-157', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Indicateurs de dispersion : écart type', 7, 'connaissance', 'attendu'),
	('2-158', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Influence sur la moyenne, la médiane, de l''ajout ou de la suppression d''une valeur dans la série', 8, 'connaissance', 'attendu'),
	('2-159', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Représentation graphique : histogramme, polygone des fréquences cumulées', 9, 'connaissance', 'attendu'),
	('2-160', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Calcul de la moyenne à partir de la moyenne et des effectifs de chaque classe (moyenne pondérée) ; cas particulier où la répartition est uniforme dans chaque classe', 10, 'connaissance', 'attendu'),
	('2-161', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Détermination de la classe médiane à partir des effectifs des classes ; estimation de la médiane dans le cas de répartition uniforme dans la classe médiane', 11, 'connaissance', 'attendu'),
	('2-162', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Exploiter la relation entre effectifs, proportions et pourcentages', 12, 'savoir_faire', 'attendu'),
	('2-163', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Traiter des situations simples mettant en jeu des pourcentages de pourcentages', 13, 'savoir_faire', 'attendu'),
	('2-164', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Exploiter la relation entre deux valeurs successives et leur taux d''évolution', 14, 'savoir_faire', 'attendu'),
	('2-165', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Calculer le taux d''évolution global à partir des taux d''évolution successifs', 15, 'savoir_faire', 'attendu'),
	('2-166', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Calculer un taux d''évolution réciproque', 16, 'savoir_faire', 'attendu'),
	('2-167', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Pour une série regroupée en classes, calculer la moyenne à partir de la moyenne et des effectifs de chaque classe', 17, 'savoir_faire', 'attendu'),
	('2-168', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Pour une série regroupée en classes, déterminer la classe médiane et estimer la médiane dans le cas d''une répartition uniforme', 18, 'savoir_faire', 'attendu'),
	('2-169', 'Statistiques et probabilités', 'Information chiffrée et statistique descriptive', 'Décrire les différences entre deux séries statistiques, en s''appuyant sur des indicateurs ou couples d''indicateurs (moyenne–écart type, médiane–écart interquartile) ou sur des représentations graphiques données', 19, 'savoir_faire', 'attendu'),
	('2-170', 'Statistiques et probabilités', 'Croisement de deux variables qualitatives', 'Tableau croisé d''effectifs', 1, 'connaissance', 'attendu'),
	('2-171', 'Statistiques et probabilités', 'Croisement de deux variables qualitatives', 'Fréquence conditionnelle, fréquence marginale', 2, 'connaissance', 'attendu'),
	('2-172', 'Statistiques et probabilités', 'Croisement de deux variables qualitatives', 'Calculer des fréquences conditionnelles et des fréquences marginales', 3, 'savoir_faire', 'attendu'),
	('2-173', 'Statistiques et probabilités', 'Croisement de deux variables qualitatives', 'Compléter un tableau croisé par des raisonnements sur les effectifs ou en utilisant des fréquences conditionnelles', 4, 'savoir_faire', 'attendu'),
	('2-174', 'Statistiques et probabilités', 'Croisement de deux variables qualitatives', 'À partir de deux listes représentant deux caractères d''individus, déterminer un sous-ensemble d''individus répondant à un critère (filtre, utilisation de ET, OU, NON)', 5, 'savoir_faire', 'approfondissement'),
	('2-175', 'Statistiques et probabilités', 'Croisement de deux variables qualitatives', 'Dresser le tableau croisé de deux variables qualitatives à partir du fichier des individus et calculer des fréquences conditionnelles ou marginales', 6, 'savoir_faire', 'approfondissement'),
	('2-176', 'Statistiques et probabilités', 'Probabilités', 'Version vulgarisée de la loi des grands nombres : lorsque $n$ est grand, sauf exception, la fréquence observée est proche de la probabilité', 1, 'connaissance', 'attendu'),
	('2-177', 'Statistiques et probabilités', 'Probabilités', 'Probabilité conditionnelle d''un évènement $B$ sachant un évènement $A$ de probabilité non nulle ; notation $P_A(B)$', 2, 'connaissance', 'attendu'),
	('2-178', 'Statistiques et probabilités', 'Probabilités', 'Arbres de probabilité, application au calcul de probabilités', 3, 'connaissance', 'attendu'),
	('2-179', 'Statistiques et probabilités', 'Probabilités', 'Observer la loi des grands nombres à l''aide d''une simulation sur Python ou tableur', 4, 'savoir_faire', 'attendu'),
	('2-180', 'Statistiques et probabilités', 'Probabilités', 'Construire un arbre pondéré ou un tableau en lien avec une situation donnée', 5, 'savoir_faire', 'attendu'),
	('2-181', 'Statistiques et probabilités', 'Probabilités', 'Passer du registre de la langue naturelle au registre symbolique et inversement', 6, 'savoir_faire', 'attendu'),
	('2-182', 'Statistiques et probabilités', 'Probabilités', 'Calculer des probabilités conditionnelles lorsque les évènements sont présentés sous forme de tableau croisé d''effectifs ou d''arbre de probabilité', 7, 'savoir_faire', 'attendu'),
	('2-183', 'Statistiques et probabilités', 'Probabilités', 'Interpréter les pondérations de chaque branche d''un arbre en termes de probabilités, et notamment de probabilités conditionnelles', 8, 'savoir_faire', 'attendu'),
	('2-184', 'Statistiques et probabilités', 'Probabilités', 'Faire le lien entre la définition des probabilités conditionnelles et la multiplication des probabilités des branches du chemin correspondant', 9, 'savoir_faire', 'attendu'),
	('2-185', 'Statistiques et probabilités', 'Probabilités', 'Distinguer en situation $P_A(B)$ et $P_B(A)$, par exemple dans des situations de type « faux positifs »', 10, 'savoir_faire', 'attendu')
) AS v(code, theme_name, objective_name, point_name, ord, kind, exigence)
JOIN public.curriculum_themes t     ON t.grade = '2' AND t.name = v.theme_name
JOIN public.curriculum_objectives o ON o.theme_id = t.id AND o.name = v.objective_name;

END $bootstrap$;
