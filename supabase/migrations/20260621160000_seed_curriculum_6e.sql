-- Seed — Programme de suivi 6ᵉ (curriculum tracking)
-- ============================================================================
-- Pré-remplit l'arborescence Thème → Item → Point pour le grade '6', d'après le
-- BO cycle 3 (blocs « Connaissances et capacités attendues » de la 6ᵉ).
-- Source de vérité : docs/wip/referentiel/6e-programme-curriculum.md
--   6 thèmes · 20 items · 95 points.
--
-- Idempotent : jointures par nom + ON CONFLICT DO NOTHING. Modèle « hybride » →
-- le prof peut ensuite éditer/compléter dans l'app (le seed ne s'applique qu'une
-- fois, ré-éditer après n'est pas écrasé).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Thèmes
-- ---------------------------------------------------------------------------
insert into public.curriculum_themes (grade, name, display_order) values
	('6', $$Nombres et calculs$$, 1),
	('6', $$Grandeurs et mesures$$, 2),
	('6', $$Espace et géométrie$$, 3),
	('6', $$Organisation, gestion de données et probabilités$$, 4),
	('6', $$Proportionnalité$$, 5),
	('6', $$Initiation à la pensée informatique$$, 6)
on conflict (grade, name) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Items
-- ---------------------------------------------------------------------------
insert into public.curriculum_items (theme_id, name, display_order)
select t.id, v.item_name, v.ord
from (values
	($$Nombres et calculs$$, $$Nombres entiers et décimaux$$, 1),
	($$Nombres et calculs$$, $$Calcul sur les nombres décimaux$$, 2),
	($$Nombres et calculs$$, $$Fractions$$, 3),
	($$Nombres et calculs$$, $$Pourcentages$$, 4),
	($$Nombres et calculs$$, $$Algèbre (pensée algébrique)$$, 5),
	($$Grandeurs et mesures$$, $$Longueurs et périmètres$$, 1),
	($$Grandeurs et mesures$$, $$Aires$$, 2),
	($$Grandeurs et mesures$$, $$Volumes$$, 3),
	($$Grandeurs et mesures$$, $$Durées et repérage dans le temps$$, 4),
	($$Espace et géométrie$$, $$Distances, cercles et disques$$, 1),
	($$Espace et géométrie$$, $$Médiatrice d'un segment$$, 2),
	($$Espace et géométrie$$, $$Angles$$, 3),
	($$Espace et géométrie$$, $$Bissectrice d'un angle saillant$$, 4),
	($$Espace et géométrie$$, $$Triangles$$, 5),
	($$Espace et géométrie$$, $$Symétrie axiale$$, 6),
	($$Espace et géométrie$$, $$Vision dans l'espace$$, 7),
	($$Organisation, gestion de données et probabilités$$, $$Organisation et gestion de données$$, 1),
	($$Organisation, gestion de données et probabilités$$, $$Probabilités$$, 2),
	($$Proportionnalité$$, $$Proportionnalité et échelles$$, 1),
	($$Initiation à la pensée informatique$$, $$Programmer$$, 1)
) as v(theme_name, item_name, ord)
join public.curriculum_themes t on t.grade = '6' and t.name = v.theme_name
on conflict (theme_id, name) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Points (display_order par item ; kind = connaissance | savoir_faire)
-- ---------------------------------------------------------------------------
insert into public.curriculum_points (item_id, name, display_order, kind)
select i.id, v.point_name, v.ord, v.kind
from (values
	-- 1.1 Nombres entiers et décimaux
	($$Nombres entiers et décimaux$$, $$Connaître et utiliser la valeur des chiffres selon leur rang dans l'écriture d'un nombre$$, 1, $$connaissance$$),
	($$Nombres entiers et décimaux$$, $$Connaître les liens entre les unités de numération (unité, dizaine… dixième, centième, millième)$$, 2, $$connaissance$$),
	($$Nombres entiers et décimaux$$, $$Connaître des grands nombres entiers$$, 3, $$connaissance$$),
	($$Nombres entiers et décimaux$$, $$Reconnaître un nombre décimal$$, 4, $$savoir_faire$$),
	($$Nombres entiers et décimaux$$, $$Associer et utiliser différentes écritures d'un nombre décimal (virgule, fraction, nombre mixte, pourcentage)$$, 5, $$savoir_faire$$),
	($$Nombres entiers et décimaux$$, $$Placer un nombre décimal sur une demi-droite graduée et l'y repérer$$, 6, $$savoir_faire$$),
	($$Nombres entiers et décimaux$$, $$Comparer deux nombres décimaux$$, 7, $$savoir_faire$$),
	($$Nombres entiers et décimaux$$, $$Ordonner une liste de nombres décimaux$$, 8, $$savoir_faire$$),
	($$Nombres entiers et décimaux$$, $$Encadrer un nombre décimal par deux décimaux, intercaler$$, 9, $$savoir_faire$$),
	($$Nombres entiers et décimaux$$, $$Donner la valeur arrondie d'un décimal (unité, dixième, centième)$$, 10, $$savoir_faire$$),
	($$Nombres entiers et décimaux$$, $$Déterminer la valeur arrondie de certains nombres non décimaux$$, 11, $$savoir_faire$$),
	-- 1.2 Calcul sur les nombres décimaux
	($$Calcul sur les nombres décimaux$$, $$Additionner et soustraire des nombres décimaux$$, 1, $$savoir_faire$$),
	($$Calcul sur les nombres décimaux$$, $$Multiplier un nombre entier ou décimal par 0,1, 0,01 et 0,001$$, 2, $$savoir_faire$$),
	($$Calcul sur les nombres décimaux$$, $$Connaître le lien avec la division par 10, 100, 1000$$, 3, $$connaissance$$),
	($$Calcul sur les nombres décimaux$$, $$Comprendre le sens de la multiplication de deux nombres décimaux$$, 4, $$connaissance$$),
	($$Calcul sur les nombres décimaux$$, $$Calculer le produit de deux nombres décimaux$$, 5, $$savoir_faire$$),
	($$Calcul sur les nombres décimaux$$, $$Contrôler les résultats à l'aide d'ordres de grandeur$$, 6, $$savoir_faire$$),
	($$Calcul sur les nombres décimaux$$, $$Résoudre des problèmes mettant en jeu des multiplications de décimaux$$, 7, $$savoir_faire$$),
	($$Calcul sur les nombres décimaux$$, $$Diviser un nombre décimal par un nombre entier non nul inférieur à 10$$, 8, $$savoir_faire$$),
	($$Calcul sur les nombres décimaux$$, $$Résoudre des problèmes mettant en jeu des divisions décimales$$, 9, $$savoir_faire$$),
	($$Calcul sur les nombres décimaux$$, $$Effectuer la division euclidienne d'un entier par un entier inférieur à 100$$, 10, $$savoir_faire$$),
	($$Calcul sur les nombres décimaux$$, $$Résoudre des problèmes mettant en jeu des divisions euclidiennes$$, 11, $$savoir_faire$$),
	-- 1.3 Fractions
	($$Fractions$$, $$Relier une fraction au résultat exact de la division de son numérateur par son dénominateur$$, 1, $$savoir_faire$$),
	($$Fractions$$, $$Comprendre et connaître la définition du quotient d'un entier a par un entier b non nul$$, 2, $$connaissance$$),
	($$Fractions$$, $$Compléter des égalités à trous multiplicatives$$, 3, $$savoir_faire$$),
	($$Fractions$$, $$Placer une fraction sur une demi-droite graduée (cas simples)$$, 4, $$savoir_faire$$),
	($$Fractions$$, $$Graduer un segment de longueur donnée$$, 5, $$savoir_faire$$),
	($$Fractions$$, $$Savoir que la fraction a/b peut représenter un entier, un décimal non entier ou un nombre non décimal$$, 6, $$connaissance$$),
	($$Fractions$$, $$Utiliser une multiplication pour appliquer une fraction à un nombre entier$$, 7, $$savoir_faire$$),
	($$Fractions$$, $$Établir des égalités de fractions$$, 8, $$savoir_faire$$),
	($$Fractions$$, $$Comparer et encadrer des fractions$$, 9, $$savoir_faire$$),
	($$Fractions$$, $$Ordonner une liste de nombres écrits sous forme de fractions ou de nombres mixtes$$, 10, $$savoir_faire$$),
	($$Fractions$$, $$Additionner et soustraire des fractions$$, 11, $$savoir_faire$$),
	($$Fractions$$, $$Multiplier une fraction par un nombre entier$$, 12, $$savoir_faire$$),
	($$Fractions$$, $$Résoudre des problèmes mettant en jeu des fractions$$, 13, $$savoir_faire$$),
	($$Fractions$$, $$Inventer des problèmes mettant en jeu des fractions$$, 14, $$savoir_faire$$),
	-- 1.4 Pourcentages
	($$Pourcentages$$, $$Connaître la définition d'un pourcentage$$, 1, $$connaissance$$),
	($$Pourcentages$$, $$Comprendre le sens d'un pourcentage$$, 2, $$connaissance$$),
	($$Pourcentages$$, $$Calculer une proportion (rapport partie/tout) et l'exprimer en pourcentage (cas simples)$$, 3, $$savoir_faire$$),
	($$Pourcentages$$, $$Appliquer un pourcentage à une grandeur ou à un nombre$$, 4, $$savoir_faire$$),
	-- 1.5 Algèbre
	($$Algèbre (pensée algébrique)$$, $$Utiliser des modèles pré-algébriques pour résoudre des problèmes algébriques$$, 1, $$savoir_faire$$),
	($$Algèbre (pensée algébrique)$$, $$Identifier la structure d'un motif évolutif en repérant une régularité$$, 2, $$savoir_faire$$),
	-- 2.1 Longueurs et périmètres
	($$Longueurs et périmètres$$, $$Savoir que le périmètre du disque est proportionnel à son diamètre$$, 1, $$connaissance$$),
	($$Longueurs et périmètres$$, $$Connaître la formule du périmètre d'un disque$$, 2, $$connaissance$$),
	($$Longueurs et périmètres$$, $$Calculer le périmètre d'un disque$$, 3, $$savoir_faire$$),
	($$Longueurs et périmètres$$, $$Calculer des périmètres de figures composées$$, 4, $$savoir_faire$$),
	($$Longueurs et périmètres$$, $$Résoudre des problèmes impliquant des longueurs$$, 5, $$savoir_faire$$),
	-- 2.2 Aires
	($$Aires$$, $$Effectuer des conversions d'aire$$, 1, $$savoir_faire$$),
	($$Aires$$, $$Connaître la formule de l'aire d'un carré ou d'un rectangle$$, 2, $$connaissance$$),
	($$Aires$$, $$Calculer l'aire d'un carré ou d'un rectangle$$, 3, $$savoir_faire$$),
	-- 2.3 Volumes
	($$Volumes$$, $$Connaître l'unité centimètre cube$$, 1, $$connaissance$$),
	($$Volumes$$, $$Comparer des volumes$$, 2, $$savoir_faire$$),
	($$Volumes$$, $$Déterminer un volume$$, 3, $$savoir_faire$$),
	-- 2.4 Durées et repérage dans le temps
	($$Durées et repérage dans le temps$$, $$Effectuer des calculs sur des horaires et des durées$$, 1, $$savoir_faire$$),
	($$Durées et repérage dans le temps$$, $$Résoudre des problèmes impliquant des horaires et des durées$$, 2, $$savoir_faire$$),
	($$Durées et repérage dans le temps$$, $$Convertir des durées$$, 3, $$savoir_faire$$),
	-- 3.1 Distances, cercles et disques
	($$Distances, cercles et disques$$, $$Connaître et utiliser la définition de la distance entre deux points$$, 1, $$connaissance$$),
	($$Distances, cercles et disques$$, $$Connaître et utiliser la définition du milieu d'un segment$$, 2, $$connaissance$$),
	($$Distances, cercles et disques$$, $$Connaître les définitions d'un cercle, d'un disque, d'un rayon, d'un diamètre, d'une corde$$, 3, $$connaissance$$),
	($$Distances, cercles et disques$$, $$Comprendre la définition d'un cercle et celle d'un disque comme ensembles de points$$, 4, $$connaissance$$),
	($$Distances, cercles et disques$$, $$Résoudre des problèmes mettant en jeu des distances à un point$$, 5, $$savoir_faire$$),
	-- 3.2 Médiatrice d'un segment
	($$Médiatrice d'un segment$$, $$Connaître la définition de la médiatrice d'un segment$$, 1, $$connaissance$$),
	($$Médiatrice d'un segment$$, $$Comprendre et utiliser la propriété caractéristique de la médiatrice$$, 2, $$savoir_faire$$),
	($$Médiatrice d'un segment$$, $$Résoudre des problèmes en s'appuyant sur la propriété caractéristique de la médiatrice$$, 3, $$savoir_faire$$),
	-- 3.3 Angles
	($$Angles$$, $$Connaître et utiliser les angles, le lexique et les notations (droit, plat, plein, nul, aigu, obtus, opposés par le sommet, adjacents, supplémentaires)$$, 1, $$connaissance$$),
	($$Angles$$, $$Mesurer un angle$$, 2, $$savoir_faire$$),
	($$Angles$$, $$Construire un angle de mesure donnée$$, 3, $$savoir_faire$$),
	-- 3.4 Bissectrice d'un angle saillant
	($$Bissectrice d'un angle saillant$$, $$Connaître la définition de la bissectrice d'un angle saillant$$, 1, $$connaissance$$),
	($$Bissectrice d'un angle saillant$$, $$Utiliser la bissectrice pour effectuer des constructions et résoudre des problèmes$$, 2, $$savoir_faire$$),
	-- 3.5 Triangles
	($$Triangles$$, $$Construire des triangles$$, 1, $$savoir_faire$$),
	($$Triangles$$, $$Connaître et utiliser les propriétés angulaires des triangles particuliers (rectangle, isocèle, équilatéral)$$, 2, $$savoir_faire$$),
	($$Triangles$$, $$Connaître la valeur de la somme des mesures des angles d'un triangle$$, 3, $$connaissance$$),
	($$Triangles$$, $$Utiliser la somme des angles d'un triangle pour calculer un angle, construire, résoudre des problèmes$$, 4, $$savoir_faire$$),
	($$Triangles$$, $$Savoir que les médiatrices d'un triangle sont concourantes$$, 5, $$connaissance$$),
	($$Triangles$$, $$Connaître et construire le cercle circonscrit à un triangle$$, 6, $$savoir_faire$$),
	-- 3.6 Symétrie axiale
	($$Symétrie axiale$$, $$Connaître la définition du symétrique d'un point par rapport à une droite$$, 1, $$connaissance$$),
	($$Symétrie axiale$$, $$Connaître et utiliser les propriétés de la symétrie axiale pour effectuer des constructions$$, 2, $$savoir_faire$$),
	-- 3.7 Vision dans l'espace
	($$Vision dans l'espace$$, $$Reconnaître les solides usuels (cube, pavé, cylindre, cône, boule, pyramide, prisme droit)$$, 1, $$connaissance$$),
	($$Vision dans l'espace$$, $$Voir dans l'espace des assemblages de cubes (passer entre l'objet 3D et ses représentations 2D, dénombrer)$$, 2, $$savoir_faire$$),
	-- 4.1 Organisation et gestion de données
	($$Organisation et gestion de données$$, $$Planifier une enquête et recueillir des données$$, 1, $$savoir_faire$$),
	($$Organisation et gestion de données$$, $$Réaliser des mesures et les consigner dans un tableau$$, 2, $$savoir_faire$$),
	($$Organisation et gestion de données$$, $$Construire un tableau simple pour présenter des données$$, 3, $$savoir_faire$$),
	($$Organisation et gestion de données$$, $$Faire un choix en filtrant les données d'un tableau selon un critère$$, 4, $$savoir_faire$$),
	-- 4.2 Probabilités
	($$Probabilités$$, $$Savoir que la probabilité d'un évènement est un nombre compris entre 0 et 1$$, 1, $$connaissance$$),
	($$Probabilités$$, $$Calculer des probabilités dans des situations simples d'équiprobabilité$$, 2, $$savoir_faire$$),
	($$Probabilités$$, $$Comparer les résultats d'une expérience aléatoire répétée à une probabilité calculée$$, 3, $$savoir_faire$$),
	-- 5.1 Proportionnalité et échelles
	($$Proportionnalité et échelles$$, $$Connaître la définition de la proportionnalité et la mettre en lien avec des expressions de la vie courante$$, 1, $$connaissance$$),
	($$Proportionnalité et échelles$$, $$Identifier si une situation relève du modèle de la proportionnalité$$, 2, $$savoir_faire$$),
	($$Proportionnalité et échelles$$, $$Résoudre un problème de proportionnalité en choisissant une procédure adaptée (linéarité, retour à l'unité)$$, 3, $$savoir_faire$$),
	($$Proportionnalité et échelles$$, $$Représenter une situation de proportionnalité à l'aide d'un tableau ou de notations symboliques$$, 4, $$savoir_faire$$),
	($$Proportionnalité et échelles$$, $$S'initier à la résolution de problèmes d'échelles$$, 5, $$savoir_faire$$),
	-- 6.1 Programmer
	($$Programmer$$, $$Identifier une instruction ou une séquence d'instructions$$, 1, $$connaissance$$),
	($$Programmer$$, $$Produire et exécuter une séquence d'instructions$$, 2, $$savoir_faire$$),
	($$Programmer$$, $$Répéter à la main une séquence d'instructions pour accomplir une tâche imposée$$, 3, $$savoir_faire$$),
	($$Programmer$$, $$Programmer la construction d'un chemin simple$$, 4, $$savoir_faire$$)
) as v(item_name, point_name, ord, kind)
join public.curriculum_items i on i.name = v.item_name
join public.curriculum_themes t on t.id = i.theme_id and t.grade = '6'
on conflict (item_id, name) do nothing;
