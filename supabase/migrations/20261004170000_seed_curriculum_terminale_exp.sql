-- ============================================================================
-- Amorçage — Référentiel de programme, niveau 'T_EXP'
-- ============================================================================
-- GÉNÉRÉ par scripts/generate-curriculum-seed.ts depuis
-- docs/wip/referentiel/terminale-exp-programme.md — ne pas éditer à la main.
--
-- Source : « Programme d'enseignement optionnel de mathématiques expertes
-- de terminale générale » (PDF fourni par David le 2026-10-03).
--
--   3 thèmes · 11 objectifs · 153 points
--   kind        : 65 connaissance · 72 savoir_faire · 16 demonstration
--   exigence    : 121 attendu · 32 approfondissement
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
--   SELECT * FROM public.curriculum_referenced_points('T_EXP');
-- puis seulement :
--   DELETE FROM public.curriculum_themes WHERE grade = 'T_EXP';
-- Si elle rend des lignes, ne pas annuler : corriger dans la page Programme.
-- ============================================================================

do $bootstrap$
BEGIN

IF EXISTS (SELECT 1 FROM public.curriculum_themes WHERE grade = 'T_EXP') THEN
	RAISE NOTICE 'Référentiel T_EXP déjà amorcé — aucune modification.';
	RETURN;
END IF;

-- ---------------------------------------------------------------------------
-- 1. Thèmes
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_themes (grade, name, display_order) VALUES
	('T_EXP', 'Nombres complexes', 1),
	('T_EXP', 'Arithmétique', 2),
	('T_EXP', 'Graphes et matrices', 3);

-- ---------------------------------------------------------------------------
-- 2. Objectifs
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_objectives (theme_id, name, display_order)
SELECT t.id, v.objective_name, v.ord
FROM (VALUES
	('Nombres complexes', 'Nombres complexes : point de vue algébrique', 1),
	('Nombres complexes', 'Nombres complexes : point de vue géométrique', 2),
	('Nombres complexes', 'Nombres complexes et trigonométrie', 3),
	('Nombres complexes', 'Équations polynomiales', 4),
	('Nombres complexes', 'Utilisation des nombres complexes en géométrie', 5),
	('Arithmétique', 'Divisibilité et congruences', 1),
	('Arithmétique', 'PGCD, théorèmes de Bézout et de Gauss', 2),
	('Arithmétique', 'Nombres premiers', 3),
	('Graphes et matrices', 'Graphes', 1),
	('Graphes et matrices', 'Matrices', 2),
	('Graphes et matrices', 'Chaînes de Markov', 3)
) AS v(theme_name, objective_name, ord)
JOIN public.curriculum_themes t ON t.grade = 'T_EXP' AND t.name = v.theme_name;

-- ---------------------------------------------------------------------------
-- 3. Points
-- ---------------------------------------------------------------------------
-- `code` explicite : la série du markdown. Le trigger d'attribution ne prend
-- la main que pour les points créés ensuite depuis l'app, qui prennent la suite.
INSERT INTO public.curriculum_points (objective_id, code, name, display_order, kind, exigence)
SELECT o.id, v.code, v.point_name, v.ord, v.kind, v.exigence
FROM (VALUES
	('TEXP-001', 'Nombres complexes', 'Nombres complexes : point de vue algébrique', 'Ensemble $\mathbb{C}$ des nombres complexes. Partie réelle et partie imaginaire', 1, 'connaissance', 'attendu'),
	('TEXP-002', 'Nombres complexes', 'Nombres complexes : point de vue algébrique', 'Opérations sur les nombres complexes', 2, 'connaissance', 'attendu'),
	('TEXP-003', 'Nombres complexes', 'Nombres complexes : point de vue algébrique', 'Conjugaison. Propriétés algébriques de la conjugaison', 3, 'connaissance', 'attendu'),
	('TEXP-004', 'Nombres complexes', 'Nombres complexes : point de vue algébrique', 'Inverse d''un nombre complexe non nul', 4, 'connaissance', 'attendu'),
	('TEXP-005', 'Nombres complexes', 'Nombres complexes : point de vue algébrique', 'Formule du binôme dans $\mathbb{C}$', 5, 'connaissance', 'attendu'),
	('TEXP-006', 'Nombres complexes', 'Nombres complexes : point de vue algébrique', 'Effectuer des calculs algébriques avec des nombres complexes', 6, 'savoir_faire', 'attendu'),
	('TEXP-007', 'Nombres complexes', 'Nombres complexes : point de vue algébrique', 'Résoudre une équation linéaire $az = b$', 7, 'savoir_faire', 'attendu'),
	('TEXP-008', 'Nombres complexes', 'Nombres complexes : point de vue algébrique', 'Résoudre une équation simple faisant intervenir $z$ et $\bar{z}$', 8, 'savoir_faire', 'attendu'),
	('TEXP-009', 'Nombres complexes', 'Nombres complexes : point de vue algébrique', 'Conjugué d''un produit, d''un inverse, d''une puissance entière', 9, 'demonstration', 'attendu'),
	('TEXP-010', 'Nombres complexes', 'Nombres complexes : point de vue algébrique', 'Formule du binôme', 10, 'demonstration', 'attendu'),
	('TEXP-011', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Image d''un nombre complexe. Image du conjugué', 1, 'connaissance', 'attendu'),
	('TEXP-012', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Affixe d''un point, d''un vecteur', 2, 'connaissance', 'attendu'),
	('TEXP-013', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Module d''un nombre complexe. Interprétation géométrique', 3, 'connaissance', 'attendu'),
	('TEXP-014', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Relation $|z|^2 = z\bar{z}$', 4, 'connaissance', 'attendu'),
	('TEXP-015', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Module d''un produit, d''un inverse', 5, 'connaissance', 'attendu'),
	('TEXP-016', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Ensemble $\mathbb{U}$ des nombres complexes de module $1$', 6, 'connaissance', 'attendu'),
	('TEXP-017', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Stabilité de $\mathbb{U}$ par produit et passage à l''inverse', 7, 'connaissance', 'attendu'),
	('TEXP-018', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Arguments d''un nombre complexe non nul. Interprétation géométrique', 8, 'connaissance', 'attendu'),
	('TEXP-019', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Forme trigonométrique d''un nombre complexe', 9, 'connaissance', 'attendu'),
	('TEXP-020', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Déterminer le module d''un nombre complexe', 10, 'savoir_faire', 'attendu'),
	('TEXP-021', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Déterminer les arguments d''un nombre complexe', 11, 'savoir_faire', 'attendu'),
	('TEXP-022', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Représenter un nombre complexe par un point', 12, 'savoir_faire', 'attendu'),
	('TEXP-023', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Déterminer l''affixe d''un point', 13, 'savoir_faire', 'attendu'),
	('TEXP-024', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Formule $|z|^2 = z\bar{z}$', 14, 'demonstration', 'attendu'),
	('TEXP-025', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Module d''un produit', 15, 'demonstration', 'attendu'),
	('TEXP-026', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Module d''une puissance', 16, 'demonstration', 'attendu'),
	('TEXP-027', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Suite de nombres complexes définie par $z_{n+1} = az_n + b$', 17, 'savoir_faire', 'approfondissement'),
	('TEXP-028', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Inégalité triangulaire pour deux nombres complexes ; cas d''égalité', 18, 'savoir_faire', 'approfondissement'),
	('TEXP-029', 'Nombres complexes', 'Nombres complexes : point de vue géométrique', 'Étude expérimentale de l''ensemble de Mandelbrot, d''ensembles de Julia', 19, 'savoir_faire', 'approfondissement'),
	('TEXP-030', 'Nombres complexes', 'Nombres complexes et trigonométrie', 'Formules d''addition à partir du produit scalaire', 1, 'connaissance', 'attendu'),
	('TEXP-031', 'Nombres complexes', 'Nombres complexes et trigonométrie', 'Formules de duplication à partir du produit scalaire', 2, 'connaissance', 'attendu'),
	('TEXP-032', 'Nombres complexes', 'Nombres complexes et trigonométrie', 'Exponentielle imaginaire, notation $e^{i\theta}$', 3, 'connaissance', 'attendu'),
	('TEXP-033', 'Nombres complexes', 'Nombres complexes et trigonométrie', 'Relation fonctionnelle de l''exponentielle imaginaire', 4, 'connaissance', 'attendu'),
	('TEXP-034', 'Nombres complexes', 'Nombres complexes et trigonométrie', 'Forme exponentielle d''un nombre complexe', 5, 'connaissance', 'attendu'),
	('TEXP-035', 'Nombres complexes', 'Nombres complexes et trigonométrie', 'Formules d''Euler : $\cos(\theta) = \frac{1}{2}(e^{i\theta} + e^{-i\theta})$, $\sin(\theta) = \frac{1}{2i}(e^{i\theta} - e^{-i\theta})$', 6, 'connaissance', 'attendu'),
	('TEXP-036', 'Nombres complexes', 'Nombres complexes et trigonométrie', 'Formule de Moivre : $\cos(n\theta) + i\sin(n\theta) = (\cos(\theta) + i\sin(\theta))^n$', 7, 'connaissance', 'attendu'),
	('TEXP-037', 'Nombres complexes', 'Nombres complexes et trigonométrie', 'Passer de la forme algébrique d''un nombre complexe à sa forme trigonométrique ou exponentielle', 8, 'savoir_faire', 'attendu'),
	('TEXP-038', 'Nombres complexes', 'Nombres complexes et trigonométrie', 'Passer de la forme trigonométrique ou exponentielle d''un nombre complexe à sa forme algébrique', 9, 'savoir_faire', 'attendu'),
	('TEXP-039', 'Nombres complexes', 'Nombres complexes et trigonométrie', 'Effectuer des calculs sur des nombres complexes en choisissant une forme adaptée, en particulier dans le cadre de la résolution de problèmes', 10, 'savoir_faire', 'attendu'),
	('TEXP-040', 'Nombres complexes', 'Nombres complexes et trigonométrie', 'Utiliser les formules d''Euler et de Moivre pour transformer des expressions trigonométriques, dans des contextes divers (intégration, suites, etc.)', 11, 'savoir_faire', 'attendu'),
	('TEXP-041', 'Nombres complexes', 'Nombres complexes et trigonométrie', 'Utiliser les formules d''Euler et de Moivre pour calculer des puissances de nombres complexes', 12, 'savoir_faire', 'attendu'),
	('TEXP-042', 'Nombres complexes', 'Nombres complexes et trigonométrie', 'Démonstration d''une des formules d''addition', 13, 'demonstration', 'attendu'),
	('TEXP-043', 'Nombres complexes', 'Équations polynomiales', 'Solutions complexes d''une équation du second degré à coefficients réels', 1, 'connaissance', 'attendu'),
	('TEXP-044', 'Nombres complexes', 'Équations polynomiales', 'Factorisation de $z^n - a^n$ par $z - a$', 2, 'connaissance', 'attendu'),
	('TEXP-045', 'Nombres complexes', 'Équations polynomiales', 'Si $P$ est un polynôme et $P(a) = 0$, factorisation de $P$ par $z - a$', 3, 'connaissance', 'attendu'),
	('TEXP-046', 'Nombres complexes', 'Équations polynomiales', 'Un polynôme de degré $n$ admet au plus $n$ racines', 4, 'connaissance', 'attendu'),
	('TEXP-047', 'Nombres complexes', 'Équations polynomiales', 'Résoudre une équation polynomiale de degré $2$ à coefficients réels', 5, 'savoir_faire', 'attendu'),
	('TEXP-048', 'Nombres complexes', 'Équations polynomiales', 'Résoudre une équation de degré $3$ à coefficients réels dont une racine est connue', 6, 'savoir_faire', 'attendu'),
	('TEXP-049', 'Nombres complexes', 'Équations polynomiales', 'Factoriser un polynôme dont une racine est connue', 7, 'savoir_faire', 'attendu'),
	('TEXP-050', 'Nombres complexes', 'Équations polynomiales', 'Factorisation de $z^n - a^n$ par $z - a$ (démonstration)', 8, 'demonstration', 'attendu'),
	('TEXP-051', 'Nombres complexes', 'Équations polynomiales', 'Factorisation de $P(z)$ par $z - a$ si $P(a) = 0$', 9, 'demonstration', 'attendu'),
	('TEXP-052', 'Nombres complexes', 'Équations polynomiales', 'Le nombre de solutions d''une équation polynomiale est inférieur ou égal à son degré', 10, 'demonstration', 'attendu'),
	('TEXP-053', 'Nombres complexes', 'Équations polynomiales', 'Racines carrées d''un nombre complexe, équation du second degré à coefficients complexes', 11, 'savoir_faire', 'approfondissement'),
	('TEXP-054', 'Nombres complexes', 'Équations polynomiales', 'Formules de Viète', 12, 'savoir_faire', 'approfondissement'),
	('TEXP-055', 'Nombres complexes', 'Équations polynomiales', 'Résolution par radicaux de l''équation de degré $3$', 13, 'savoir_faire', 'approfondissement'),
	('TEXP-056', 'Nombres complexes', 'Utilisation des nombres complexes en géométrie', 'Interprétation géométrique du module et d''un argument de $\frac{c-a}{b-a}$', 1, 'connaissance', 'attendu'),
	('TEXP-057', 'Nombres complexes', 'Utilisation des nombres complexes en géométrie', 'Racines $n$-ièmes de l''unité. Description de l''ensemble $\mathbb{U}_n$ des racines $n$-ièmes de l''unité', 2, 'connaissance', 'attendu'),
	('TEXP-058', 'Nombres complexes', 'Utilisation des nombres complexes en géométrie', 'Représentation géométrique de l''ensemble $\mathbb{U}_n$ des racines $n$-ièmes de l''unité', 3, 'connaissance', 'attendu'),
	('TEXP-059', 'Nombres complexes', 'Utilisation des nombres complexes en géométrie', 'Racines $n$-ièmes de l''unité, cas particuliers : $n = 2, 3, 4$', 4, 'connaissance', 'attendu'),
	('TEXP-060', 'Nombres complexes', 'Utilisation des nombres complexes en géométrie', 'Dans le cadre de la résolution de problème, utiliser les nombres complexes pour démontrer un alignement', 5, 'savoir_faire', 'attendu'),
	('TEXP-061', 'Nombres complexes', 'Utilisation des nombres complexes en géométrie', 'Dans le cadre de la résolution de problème, utiliser les nombres complexes pour démontrer une orthogonalité', 6, 'savoir_faire', 'attendu'),
	('TEXP-062', 'Nombres complexes', 'Utilisation des nombres complexes en géométrie', 'Dans le cadre de la résolution de problème, utiliser les nombres complexes pour calculer des longueurs', 7, 'savoir_faire', 'attendu'),
	('TEXP-063', 'Nombres complexes', 'Utilisation des nombres complexes en géométrie', 'Dans le cadre de la résolution de problème, utiliser les nombres complexes pour calculer des angles', 8, 'savoir_faire', 'attendu'),
	('TEXP-064', 'Nombres complexes', 'Utilisation des nombres complexes en géométrie', 'Dans le cadre de la résolution de problème, utiliser les nombres complexes pour déterminer des ensembles de points', 9, 'savoir_faire', 'attendu'),
	('TEXP-065', 'Nombres complexes', 'Utilisation des nombres complexes en géométrie', 'Utiliser les racines de l''unité dans l''étude de configurations liées aux polygones réguliers', 10, 'savoir_faire', 'attendu'),
	('TEXP-066', 'Nombres complexes', 'Utilisation des nombres complexes en géométrie', 'Détermination de l''ensemble $\mathbb{U}_n$', 11, 'demonstration', 'attendu'),
	('TEXP-067', 'Nombres complexes', 'Utilisation des nombres complexes en géométrie', 'Lignes trigonométriques de $\frac{2\pi}{5}$, construction du pentagone régulier à la règle et au compas', 12, 'savoir_faire', 'approfondissement'),
	('TEXP-068', 'Nombres complexes', 'Utilisation des nombres complexes en géométrie', 'Somme des racines $n$-ièmes de l''unité', 13, 'savoir_faire', 'approfondissement'),
	('TEXP-069', 'Nombres complexes', 'Utilisation des nombres complexes en géométrie', 'Racines $n$-ièmes d''un nombre complexe', 14, 'savoir_faire', 'approfondissement'),
	('TEXP-070', 'Nombres complexes', 'Utilisation des nombres complexes en géométrie', 'Transformation de Fourier discrète', 15, 'savoir_faire', 'approfondissement'),
	('TEXP-071', 'Arithmétique', 'Divisibilité et congruences', 'Divisibilité dans $\mathbb{Z}$', 1, 'connaissance', 'attendu'),
	('TEXP-072', 'Arithmétique', 'Divisibilité et congruences', 'Division euclidienne d''un élément de $\mathbb{Z}$ par un élément de $\mathbb{N}^*$', 2, 'connaissance', 'attendu'),
	('TEXP-073', 'Arithmétique', 'Divisibilité et congruences', 'Congruences dans $\mathbb{Z}$', 3, 'connaissance', 'attendu'),
	('TEXP-074', 'Arithmétique', 'Divisibilité et congruences', 'Compatibilité des congruences avec les opérations', 4, 'connaissance', 'attendu'),
	('TEXP-075', 'Arithmétique', 'Divisibilité et congruences', 'Déterminer les diviseurs d''un entier', 5, 'savoir_faire', 'attendu'),
	('TEXP-076', 'Arithmétique', 'Divisibilité et congruences', 'Résoudre une congruence $ax \equiv b \,[n]$', 6, 'savoir_faire', 'attendu'),
	('TEXP-077', 'Arithmétique', 'Divisibilité et congruences', 'Déterminer un inverse de $a$ modulo $n$ lorsque $a$ et $n$ sont premiers entre eux', 7, 'savoir_faire', 'attendu'),
	('TEXP-078', 'Arithmétique', 'Divisibilité et congruences', 'Établir des tests de divisibilité', 8, 'savoir_faire', 'attendu'),
	('TEXP-079', 'Arithmétique', 'Divisibilité et congruences', 'Utiliser des tests de divisibilité', 9, 'savoir_faire', 'attendu'),
	('TEXP-080', 'Arithmétique', 'Divisibilité et congruences', 'Étudier des problèmes de chiffrement', 10, 'savoir_faire', 'attendu'),
	('TEXP-081', 'Arithmétique', 'Divisibilité et congruences', 'Problèmes de codage (codes barres, code ISBN, clé du Rib, code Insee)', 11, 'savoir_faire', 'approfondissement'),
	('TEXP-082', 'Arithmétique', 'Divisibilité et congruences', 'Problèmes de chiffrement (affine, Vigenère, Hill, RSA)', 12, 'savoir_faire', 'approfondissement'),
	('TEXP-083', 'Arithmétique', 'Divisibilité et congruences', 'Exemples simples de codes correcteurs', 13, 'savoir_faire', 'approfondissement'),
	('TEXP-084', 'Arithmétique', 'PGCD, théorèmes de Bézout et de Gauss', 'PGCD de deux entiers', 1, 'connaissance', 'attendu'),
	('TEXP-085', 'Arithmétique', 'PGCD, théorèmes de Bézout et de Gauss', 'Algorithme d''Euclide', 2, 'connaissance', 'attendu'),
	('TEXP-086', 'Arithmétique', 'PGCD, théorèmes de Bézout et de Gauss', 'Couples d''entiers premiers entre eux', 3, 'connaissance', 'attendu'),
	('TEXP-087', 'Arithmétique', 'PGCD, théorèmes de Bézout et de Gauss', 'Théorème de Bézout', 4, 'connaissance', 'attendu'),
	('TEXP-088', 'Arithmétique', 'PGCD, théorèmes de Bézout et de Gauss', 'Théorème de Gauss', 5, 'connaissance', 'attendu'),
	('TEXP-089', 'Arithmétique', 'PGCD, théorèmes de Bézout et de Gauss', 'Déterminer le PGCD de deux entiers', 6, 'savoir_faire', 'attendu'),
	('TEXP-090', 'Arithmétique', 'PGCD, théorèmes de Bézout et de Gauss', 'Résoudre des équations diophantiennes simples', 7, 'savoir_faire', 'attendu'),
	('TEXP-091', 'Arithmétique', 'PGCD, théorèmes de Bézout et de Gauss', 'Écriture du PGCD de $a$ et $b$ sous la forme $ax + by$, $(x, y) \in \mathbb{Z}^2$', 8, 'demonstration', 'attendu'),
	('TEXP-092', 'Arithmétique', 'PGCD, théorèmes de Bézout et de Gauss', 'Théorème de Gauss (démonstration)', 9, 'demonstration', 'attendu'),
	('TEXP-093', 'Arithmétique', 'PGCD, théorèmes de Bézout et de Gauss', 'Algorithme d''Euclide de calcul du PGCD de deux nombres', 10, 'savoir_faire', 'approfondissement'),
	('TEXP-094', 'Arithmétique', 'PGCD, théorèmes de Bézout et de Gauss', 'Calcul d''un couple de Bézout par l''algorithme d''Euclide', 11, 'savoir_faire', 'approfondissement'),
	('TEXP-095', 'Arithmétique', 'PGCD, théorèmes de Bézout et de Gauss', 'Détermination des racines rationnelles d''un polynôme à coefficients entiers', 12, 'savoir_faire', 'approfondissement'),
	('TEXP-096', 'Arithmétique', 'PGCD, théorèmes de Bézout et de Gauss', 'Lemme chinois et applications à des situations concrètes', 13, 'savoir_faire', 'approfondissement'),
	('TEXP-097', 'Arithmétique', 'PGCD, théorèmes de Bézout et de Gauss', 'Détermination des triplets pythagoriciens', 14, 'savoir_faire', 'approfondissement'),
	('TEXP-098', 'Arithmétique', 'PGCD, théorèmes de Bézout et de Gauss', 'Étude de l''équation de Pell-Fermat', 15, 'savoir_faire', 'approfondissement'),
	('TEXP-099', 'Arithmétique', 'Nombres premiers', 'Nombres premiers', 1, 'connaissance', 'attendu'),
	('TEXP-100', 'Arithmétique', 'Nombres premiers', 'L''ensemble des nombres premiers est infini', 2, 'connaissance', 'attendu'),
	('TEXP-101', 'Arithmétique', 'Nombres premiers', 'Existence et unicité de la décomposition d''un entier en produit de facteurs premiers', 3, 'connaissance', 'attendu'),
	('TEXP-102', 'Arithmétique', 'Nombres premiers', 'Petit théorème de Fermat', 4, 'connaissance', 'attendu'),
	('TEXP-103', 'Arithmétique', 'Nombres premiers', 'Étudier la primalité de certains nombres', 5, 'savoir_faire', 'attendu'),
	('TEXP-104', 'Arithmétique', 'Nombres premiers', 'L''ensemble des nombres premiers est infini (démonstration)', 6, 'demonstration', 'attendu'),
	('TEXP-105', 'Arithmétique', 'Nombres premiers', 'Crible d''Ératosthène', 7, 'savoir_faire', 'approfondissement'),
	('TEXP-106', 'Arithmétique', 'Nombres premiers', 'Décomposition en facteurs premiers', 8, 'savoir_faire', 'approfondissement'),
	('TEXP-107', 'Arithmétique', 'Nombres premiers', 'Démonstrations du petit théorème de Fermat', 9, 'savoir_faire', 'approfondissement'),
	('TEXP-108', 'Arithmétique', 'Nombres premiers', 'Étude de tests de primalité : notion de témoin, nombres de Carmichaël', 10, 'savoir_faire', 'approfondissement'),
	('TEXP-109', 'Arithmétique', 'Nombres premiers', 'Recherche de nombres premiers particuliers (Mersenne, Fermat)', 11, 'savoir_faire', 'approfondissement'),
	('TEXP-110', 'Arithmétique', 'Nombres premiers', 'Étude du système cryptographique RSA', 12, 'savoir_faire', 'approfondissement'),
	('TEXP-111', 'Arithmétique', 'Nombres premiers', 'Étude des sommes de deux carrés par les entiers de Gauss', 13, 'savoir_faire', 'approfondissement'),
	('TEXP-112', 'Graphes et matrices', 'Graphes', 'Graphe, sommets, arêtes', 1, 'connaissance', 'attendu'),
	('TEXP-113', 'Graphes et matrices', 'Graphes', 'Exemple du graphe complet', 2, 'connaissance', 'attendu'),
	('TEXP-114', 'Graphes et matrices', 'Graphes', 'Sommets adjacents, degré, ordre d''un graphe', 3, 'connaissance', 'attendu'),
	('TEXP-115', 'Graphes et matrices', 'Graphes', 'Chaîne, longueur d''une chaîne', 4, 'connaissance', 'attendu'),
	('TEXP-116', 'Graphes et matrices', 'Graphes', 'Graphe connexe', 5, 'connaissance', 'attendu'),
	('TEXP-117', 'Graphes et matrices', 'Graphes', 'Représentation matricielle : matrice d''adjacence d''un graphe', 6, 'connaissance', 'attendu'),
	('TEXP-118', 'Graphes et matrices', 'Graphes', 'Modéliser une situation par un graphe', 7, 'savoir_faire', 'attendu'),
	('TEXP-119', 'Graphes et matrices', 'Graphes', 'Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour calculer le nombre de chemins de longueur donnée entre deux sommets d''un graphe', 8, 'savoir_faire', 'attendu'),
	('TEXP-120', 'Graphes et matrices', 'Graphes', 'Expression du nombre de chemins de longueur $n$ reliant deux sommets d''un graphe à l''aide de la puissance $n$-ième de la matrice d''adjacence', 9, 'demonstration', 'attendu'),
	('TEXP-121', 'Graphes et matrices', 'Graphes', 'Étude de graphes eulériens', 10, 'savoir_faire', 'approfondissement'),
	('TEXP-122', 'Graphes et matrices', 'Matrices', 'Notion de matrice (tableau de nombres réels)', 1, 'connaissance', 'attendu'),
	('TEXP-123', 'Graphes et matrices', 'Matrices', 'Matrice carrée, matrice colonne, matrice ligne', 2, 'connaissance', 'attendu'),
	('TEXP-124', 'Graphes et matrices', 'Matrices', 'Opérations sur les matrices', 3, 'connaissance', 'attendu'),
	('TEXP-125', 'Graphes et matrices', 'Matrices', 'Inverse d''une matrice carrée', 4, 'connaissance', 'attendu'),
	('TEXP-126', 'Graphes et matrices', 'Matrices', 'Puissances d''une matrice carrée', 5, 'connaissance', 'attendu'),
	('TEXP-127', 'Graphes et matrices', 'Matrices', 'Représentation matricielle des transformations géométriques du plan', 6, 'connaissance', 'attendu'),
	('TEXP-128', 'Graphes et matrices', 'Matrices', 'Représentation matricielle des systèmes linéaires', 7, 'connaissance', 'attendu'),
	('TEXP-129', 'Graphes et matrices', 'Matrices', 'Représentation matricielle des suites récurrentes', 8, 'connaissance', 'attendu'),
	('TEXP-130', 'Graphes et matrices', 'Matrices', 'Exemples de calcul de puissances de matrices carrées d''ordre $2$ ou $3$', 9, 'connaissance', 'attendu'),
	('TEXP-131', 'Graphes et matrices', 'Matrices', 'Suite de matrices colonnes $(U_n)$ vérifiant une relation de récurrence du type $U_{n+1} = AU_n + C$', 10, 'connaissance', 'attendu'),
	('TEXP-132', 'Graphes et matrices', 'Matrices', 'Modéliser une situation par une matrice', 11, 'savoir_faire', 'attendu'),
	('TEXP-133', 'Graphes et matrices', 'Matrices', 'Calculer l''inverse d''une matrice carrée', 12, 'savoir_faire', 'attendu'),
	('TEXP-134', 'Graphes et matrices', 'Matrices', 'Calculer les puissances d''une matrice carrée', 13, 'savoir_faire', 'attendu'),
	('TEXP-135', 'Graphes et matrices', 'Matrices', 'Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour résoudre un système linéaire', 14, 'savoir_faire', 'attendu'),
	('TEXP-136', 'Graphes et matrices', 'Matrices', 'Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour étudier une suite récurrente linéaire', 15, 'savoir_faire', 'attendu'),
	('TEXP-137', 'Graphes et matrices', 'Matrices', 'Interpolation polynomiale', 16, 'savoir_faire', 'approfondissement'),
	('TEXP-138', 'Graphes et matrices', 'Matrices', 'Modèle « proie-prédateur » discrétisé : évolution couplée de deux suites récurrentes', 17, 'savoir_faire', 'approfondissement'),
	('TEXP-139', 'Graphes et matrices', 'Chaînes de Markov', 'Graphe orienté pondéré associé à une chaîne de Markov à deux ou trois états', 1, 'connaissance', 'attendu'),
	('TEXP-140', 'Graphes et matrices', 'Chaînes de Markov', 'Chaîne de Markov à deux ou trois états', 2, 'connaissance', 'attendu'),
	('TEXP-141', 'Graphes et matrices', 'Chaînes de Markov', 'Distribution initiale d''une chaîne de Markov, représentée par une matrice ligne $\pi_0$', 3, 'connaissance', 'attendu'),
	('TEXP-142', 'Graphes et matrices', 'Chaînes de Markov', 'Matrice de transition d''une chaîne de Markov, graphe pondéré associé', 4, 'connaissance', 'attendu'),
	('TEXP-143', 'Graphes et matrices', 'Chaînes de Markov', 'Pour une chaîne de Markov à deux ou trois états de matrice $P$, interprétation du coefficient $(i, j)$ de $P^n$', 5, 'connaissance', 'attendu'),
	('TEXP-144', 'Graphes et matrices', 'Chaînes de Markov', 'Distribution d''une chaîne de Markov après $n$ transitions, représentée comme la matrice ligne $\pi_0 P^n$', 6, 'connaissance', 'attendu'),
	('TEXP-145', 'Graphes et matrices', 'Chaînes de Markov', 'Distributions invariantes d''une chaîne de Markov à deux ou trois états', 7, 'connaissance', 'attendu'),
	('TEXP-146', 'Graphes et matrices', 'Chaînes de Markov', 'Associer un graphe orienté pondéré à une chaîne de Markov à deux ou trois états', 8, 'savoir_faire', 'attendu'),
	('TEXP-147', 'Graphes et matrices', 'Chaînes de Markov', 'Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour étudier une chaîne de Markov à deux ou trois états : calculer des probabilités', 9, 'savoir_faire', 'attendu'),
	('TEXP-148', 'Graphes et matrices', 'Chaînes de Markov', 'Dans le cadre de la résolution de problèmes, utiliser le calcul matriciel pour étudier une chaîne de Markov à deux ou trois états : déterminer une probabilité invariante', 10, 'savoir_faire', 'attendu'),
	('TEXP-149', 'Graphes et matrices', 'Chaînes de Markov', 'Pour une chaîne de Markov, expression de la probabilité de passer de l''état $i$ à l''état $j$ en $n$ transitions', 11, 'demonstration', 'attendu'),
	('TEXP-150', 'Graphes et matrices', 'Chaînes de Markov', 'Pour une chaîne de Markov, expression de la matrice ligne représentant la distribution après $n$ transitions', 12, 'demonstration', 'attendu'),
	('TEXP-151', 'Graphes et matrices', 'Chaînes de Markov', 'Marche aléatoire sur un graphe. Étude asymptotique', 13, 'savoir_faire', 'approfondissement'),
	('TEXP-152', 'Graphes et matrices', 'Chaînes de Markov', 'Modèle de diffusion d''Ehrenfest', 14, 'savoir_faire', 'approfondissement'),
	('TEXP-153', 'Graphes et matrices', 'Chaînes de Markov', 'Algorithme PageRank', 15, 'savoir_faire', 'approfondissement')
) AS v(code, theme_name, objective_name, point_name, ord, kind, exigence)
JOIN public.curriculum_themes t     ON t.grade = 'T_EXP' AND t.name = v.theme_name
JOIN public.curriculum_objectives o ON o.theme_id = t.id AND o.name = v.objective_name;

END $bootstrap$;
