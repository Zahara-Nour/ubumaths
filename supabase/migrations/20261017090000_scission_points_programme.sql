-- ============================================================================
-- Scission des points de programme validée par David (étape C5 de l'arbre des notions).
-- ============================================================================
-- Un point qui disait deux (ou trois) choses devient deux (ou trois) points, chacun évaluable
-- seul (ADR 0020). Décisions de David, toutes dans docs/wip/arbre-notions/ :
--   * c5-scissions-spec.json : 137 points scindés, archivage de 3-002 (doublon du BO de 3-001),
--     et les cinq points « tables » (CP-018, CE1-026, CE1-027, CE2-020, CE2-021) déjà écrits
--     dans la première version de ce fichier (opération à trou : CP-073, CE1-090, CE1-091,
--     CE2-084, CE2-085) ;
--   * c5-scissions-verif.json : toutes les corrections de libellés prises ; CM1-019 et CM2-018
--     scindés (lire une fraction / une somme) ; 3-038 ARCHIVÉ (quasi-doublon du BO de 3-041) ;
--   * c5-scissions-manques.json + réponses : CM1-045 et CE2-026 (× 4 / × 8), CM2-050 (÷ 4 / ÷ 8),
--     5-034 et 4-021 (nombre / grandeur) scindés ; sept points ⚙ NEUFS nés d'une ligne
--     d'automatisme (tiers en 6e, perspective cavalière en 5e, somme des opposés en 4e,
--     hausse et baisse en pourcentage sans coefficient en 3e, périmètre d'un polygone et
--     interpréter les quartiles en 2de — libellés vérifiés sur le BO de seconde) ;
--   * c5-scissions-automatismes-lignes.json + réponses : quelles moitiés vise chaque ligne des
--     listes d'automatismes, et les mots sans référence à rattacher.
-- Les données ci-dessous (blocs DONNÉES) sont GÉNÉRÉES par c5-scissions-generer.py depuis ces
-- fichiers et l'état de la prod du 2026-10-17 ; la fixture des tests vient du même script.
--
-- Ce que fait la migration :
--   * le point d'origine garde son code et prend le libellé de la 1re moitié ; chaque autre
--     moitié est un point NEUF au code explicite (prochain libre du grade, à partir du maximum ;
--     le trigger d'attribution lirait l'objectif, nul ici), qui copie de son origine le grade,
--     le nœud, la rubrique, le genre, l'exigence et le régime, rangé juste après elle ;
--   * les points ⚙ prennent les valeurs de leur option (nœud désigné par son chemin dans
--     l'arbre), rangés avant leur point d'ancrage (place indiquée dans l'option) ;
--   * l'ordre d'affichage redevient une suite 1..N sans trou dans chaque grade touché (la 2de
--     avait un trou en 132, laissé par le retrait de 2-332 : il est refermé) ;
--   * 3-002 et 3-038 sont archivés (archived_at = now()) : rien n'est supprimé ;
--   * les références d'automatismes (point, grade référent) vers un point scindé sont remplacées
--     par celles des moitiés choisies, grade par grade ; les mots sans référence reçoivent les
--     points proposés ; les références vers un point non scindé ne bougent pas.
--
-- Accès : AUCUN changement — le référentiel reste lisible comme avant, aucune donnée d'élève
-- n'est touchée (aucun usage ne s'accroche aux points scindés : vérifié en prod et gardé).
--
-- Gardes (avant toute écriture ; un refus ne laisse rien) : chaque point d'origine existe avec
-- son libellé ACTUEL exact, son grade, un nœud, sans objectif, non archivé ; idem pour les deux
-- points à archiver ; aucun usage (tag de modèle, tag d'exercice, état élève, journal,
-- signalement anti-fraude) ne s'y accroche ; aucun code neuf n'existe ; chaque nœud des points ⚙
-- existe, une seule fois, notion ou sous-notion non archivée, et chaque ancre existe ;
-- l'ensemble des références d'automatismes vers les points en jeu est EXACTEMENT celui attendu ;
-- l'ordre d'affichage de chaque grade est celui attendu (1..N, ou 1..N+1 avec le trou connu).
-- Prouvée par tests/integration/scission-points-programme.test.ts.
--
-- ⚠️ Ne JAMAIS jouer ce fichier hors d'une transaction : pnpm db:migrate (supabase db push)
-- l'exécute en une seule transaction.
--
-- Rollback — à jouer dans une transaction ouverte par l'opérateur, en retirant les « -- » du
-- bloc (il ne contient ni begin ni commit). Il REFUSE si un usage s'est accroché à un point
-- neuf (tag, état élève, journal, signalement, ou une référence d'automatisme qui n'est pas
-- celle de la migration) : le supprimer effacerait EN SILENCE (ON DELETE CASCADE) des données
-- d'élèves mineurs — DESTRUCTIF, arrêt obligatoire et accord explicite de David. Sinon il remet
-- les références d'avant, supprime les points neufs, rend aux origines leur libellé, désarchive
-- 3-002 et 3-038, puis renumérote chaque grade dans l'ordre existant (et rouvre le trou de la
-- 2de en 132), ce qui ramène chaque point à son ordre d'avant. Les dates (updated_at, created_at
-- des références remises) ne sont pas restaurées. Le bloc entre les marqueurs est EXACTEMENT
-- celui que le test extrait et exécute.
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- create temporary table _rb_point (
-- 	code text primary key, grade text not null, role text not null, origine text,
-- 	rang integer, ancien_nom text, nom text not null
-- ) on commit drop;
-- insert into _rb_point (code, grade, role, origine, rang, ancien_nom, nom) values
-- -- DONNÉES:POINTS:BEGIN
--   ('CP-003', 'CP', 'origine', null, 1, $pt$Connaitre la suite écrite et la suite orale des nombres jusqu'à cent.$pt$, $pt$Connaître la suite écrite des nombres jusqu'à cent (écris le nombre qui suit 99).$pt$),
--   ('CP-074', 'CP', 'neuf', 'CP-003', 2, null, $pt$Connaître la suite orale des nombres jusqu'à cent (récite la suite de 90 à 100, en classe).$pt$),
--   ('CP-006', 'CP', 'origine', null, 1, $pt$Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles =, < et >.$pt$, $pt$Comparer deux nombres entiers avec les symboles =, < et > (47 … 52).$pt$),
--   ('CP-075', 'CP', 'neuf', 'CP-006', 2, null, $pt$Encadrer un nombre entier avec les symboles < et > (… < 47 < …).$pt$),
--   ('CP-076', 'CP', 'neuf', 'CP-006', 3, null, $pt$Intercaler un nombre entier entre deux nombres donnés (47 < … < 52).$pt$),
--   ('CP-014', 'CP', 'origine', null, 1, $pt$Comprendre le sens de l'addition et de la soustraction.$pt$, $pt$Comprendre le sens de l'addition (choisir l'addition pour une situation de réunion, d'ajout).$pt$),
--   ('CP-077', 'CP', 'neuf', 'CP-014', 2, null, $pt$Comprendre le sens de la soustraction (choisir la soustraction pour une situation de retrait, d'écart).$pt$),
--   ('CP-015', 'CP', 'origine', null, 1, $pt$Comprendre et utiliser les symboles « + », « - » et « = ».$pt$, $pt$Comprendre et utiliser le symbole « + » (5 + 3 : que veut dire ce signe ?).$pt$),
--   ('CP-078', 'CP', 'neuf', 'CP-015', 2, null, $pt$Comprendre et utiliser le symbole « − » (8 − 3 : que veut dire ce signe ?).$pt$),
--   ('CP-079', 'CP', 'neuf', 'CP-015', 3, null, $pt$Comprendre et utiliser le symbole « = » (complète : 5 + 3 … 8).$pt$),
--   ('CP-018', 'CP', 'origine', null, 1, $pt$Connaitre dans les deux sens les tables d'addition.$pt$, $pt$Connaître les tables d'addition : donner la somme de deux nombres (3 + 4 = ?).$pt$),
--   ('CP-073', 'CP', 'neuf', 'CP-018', 2, null, $pt$Connaître les tables d'addition dans l'autre sens : trouver le terme manquant d'une addition (3 + ? = 7).$pt$),
--   ('CP-019', 'CP', 'origine', null, 1, $pt$Connaitre les doubles et les moitiés de nombres usuels.$pt$, $pt$Connaître les doubles de nombres usuels (double de 8 = ?).$pt$),
--   ('CP-080', 'CP', 'neuf', 'CP-019', 2, null, $pt$Connaître les moitiés de nombres usuels (moitié de 16 = ?).$pt$),
--   ('CP-020', 'CP', 'origine', null, 1, $pt$Ajouter ou soustraire 1 ou 2 à un nombre.$pt$, $pt$Ajouter 1 ou 2 à un nombre (37 + 2 = ?).$pt$),
--   ('CP-081', 'CP', 'neuf', 'CP-020', 2, null, $pt$Soustraire 1 ou 2 à un nombre (37 − 2 = ?).$pt$),
--   ('CP-021', 'CP', 'origine', null, 1, $pt$Ajouter ou soustraire 10 à un nombre.$pt$, $pt$Ajouter 10 à un nombre (34 + 10 = ?).$pt$),
--   ('CP-082', 'CP', 'neuf', 'CP-021', 2, null, $pt$Soustraire 10 à un nombre (34 − 10 = ?).$pt$),
--   ('CP-022', 'CP', 'origine', null, 1, $pt$Ajouter ou soustraire 20, 30, 40, 50, 60, 70, 80 ou 90 à un nombre.$pt$, $pt$Ajouter 20, 30, …, 90 à un nombre (14 + 30 = ?).$pt$),
--   ('CP-083', 'CP', 'neuf', 'CP-022', 2, null, $pt$Soustraire 20, 30, …, 90 à un nombre (74 − 30 = ?).$pt$),
--   ('CP-069', 'CP', 'origine', null, 1, $pt$Construire et compléter un tableau à double entrée.$pt$, $pt$Compléter un tableau à double entrée.$pt$),
--   ('CP-084', 'CP', 'neuf', 'CP-069', 2, null, $pt$Construire un tableau à double entrée.$pt$),
--   ('CE1-004', 'CE1', 'origine', null, 1, $pt$Connaitre la suite écrite et la suite orale des nombres jusqu'à mille.$pt$, $pt$Connaître la suite écrite des nombres jusqu'à mille (écris le nombre qui suit 999).$pt$),
--   ('CE1-092', 'CE1', 'neuf', 'CE1-004', 2, null, $pt$Connaître la suite orale des nombres jusqu'à mille (récite la suite de 990 à 1 000, en classe).$pt$),
--   ('CE1-007', 'CE1', 'origine', null, 1, $pt$Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles (=, <, >).$pt$, $pt$Comparer deux nombres entiers avec les symboles =, < et > (239 … 243).$pt$),
--   ('CE1-093', 'CE1', 'neuf', 'CE1-007', 2, null, $pt$Encadrer un nombre entier avec les symboles < et > (… < 239 < …).$pt$),
--   ('CE1-094', 'CE1', 'neuf', 'CE1-007', 3, null, $pt$Intercaler un nombre entier entre deux nombres donnés (391 < … < 396).$pt$),
--   ('CE1-016', 'CE1', 'origine', null, 1, $pt$Savoir interpréter, représenter, écrire et lire les fractions ½, ⅓, ¼, ⅕, ⅙, ⅛ et 1/10.$pt$, $pt$Lire et écrire les fractions ½, ⅓, ¼, ⅕, ⅙, ⅛ et 1/10 en chiffres et en lettres (un quart ↔ 1/4).$pt$),
--   ('CE1-095', 'CE1', 'neuf', 'CE1-016', 2, null, $pt$Représenter l'une des fractions ½, ⅓, ¼, ⅕, ⅙, ⅛ ou 1/10 par un partage (colorier les parts d'une figure).$pt$),
--   ('CE1-096', 'CE1', 'neuf', 'CE1-016', 3, null, $pt$Interpréter un partage par l'une des fractions ½, ⅓, ¼, ⅕, ⅙, ⅛ ou 1/10 (quelle part de la figure est coloriée ?).$pt$),
--   ('CE1-017', 'CE1', 'origine', null, 1, $pt$Savoir interpréter, représenter, écrire et lire des fractions inférieures ou égales à 1.$pt$, $pt$Lire et écrire une fraction inférieure ou égale à 1 en chiffres et en lettres (trois quarts ↔ 3/4).$pt$),
--   ('CE1-097', 'CE1', 'neuf', 'CE1-017', 2, null, $pt$Représenter une fraction inférieure ou égale à 1 par un partage (colorier les parts d'une figure).$pt$),
--   ('CE1-098', 'CE1', 'neuf', 'CE1-017', 3, null, $pt$Interpréter un partage par une fraction inférieure ou égale à 1 (quelle part de la figure est coloriée ?).$pt$),
--   ('CE1-021', 'CE1', 'origine', null, 1, $pt$Additionner et soustraire des fractions de même dénominateur.$pt$, $pt$Additionner des fractions de même dénominateur (2/5 + 1/5 = ?).$pt$),
--   ('CE1-099', 'CE1', 'neuf', 'CE1-021', 2, null, $pt$Soustraire des fractions de même dénominateur (4/5 − 1/5 = ?).$pt$),
--   ('CE1-022', 'CE1', 'origine', null, 1, $pt$Poser et effectuer des additions et des soustractions en colonnes.$pt$, $pt$Poser et effectuer une addition en colonnes.$pt$),
--   ('CE1-100', 'CE1', 'neuf', 'CE1-022', 2, null, $pt$Poser et effectuer une soustraction en colonnes.$pt$),
--   ('CE1-026', 'CE1', 'origine', null, 1, $pt$Connaitre dans les deux sens les tables d'addition.$pt$, $pt$Connaître les tables d'addition : donner la somme de deux nombres (3 + 4 = ?).$pt$),
--   ('CE1-090', 'CE1', 'neuf', 'CE1-026', 2, null, $pt$Connaître les tables d'addition dans l'autre sens : trouver le terme manquant d'une addition (3 + ? = 7).$pt$),
--   ('CE1-027', 'CE1', 'origine', null, 1, $pt$Connaitre dans les deux sens les tables de multiplication.$pt$, $pt$Connaître les tables de multiplication : donner le produit de deux nombres (3 × 4 = ?).$pt$),
--   ('CE1-091', 'CE1', 'neuf', 'CE1-027', 2, null, $pt$Connaître les tables de multiplication dans l'autre sens : trouver le facteur manquant d'un produit (3 × ? = 12).$pt$),
--   ('CE1-028', 'CE1', 'origine', null, 1, $pt$Connaitre des faits multiplicatifs usuels : les doubles et les moitiés.$pt$, $pt$Connaître des faits multiplicatifs usuels : les doubles (double de 25 = ?).$pt$),
--   ('CE1-101', 'CE1', 'neuf', 'CE1-028', 2, null, $pt$Connaître des faits multiplicatifs usuels : les moitiés (moitié de 50 = ?).$pt$),
--   ('CE1-029', 'CE1', 'origine', null, 1, $pt$Ajouter ou soustraire un nombre entier de dizaines à un nombre.$pt$, $pt$Ajouter un nombre entier de dizaines à un nombre (246 + 30 = ?).$pt$),
--   ('CE1-102', 'CE1', 'neuf', 'CE1-029', 2, null, $pt$Soustraire un nombre entier de dizaines à un nombre (246 − 30 = ?).$pt$),
--   ('CE1-084', 'CE1', 'origine', null, 1, $pt$Ajouter ou soustraire un nombre entier de centaines à un nombre.$pt$, $pt$Ajouter un nombre entier de centaines à un nombre (346 + 200 = ?).$pt$),
--   ('CE1-103', 'CE1', 'neuf', 'CE1-084', 2, null, $pt$Soustraire un nombre entier de centaines à un nombre (346 − 200 = ?).$pt$),
--   ('CE1-063', 'CE1', 'origine', null, 1, $pt$Comparer et mesurer des durées écoulées entre deux instants affichés sur une horloge (pour des intervalles de temps situés dans une même journée, avec des heures données en heures entières, en heures et demi-heure ou en heures et quarts d'heure).$pt$, $pt$Mesurer la durée écoulée entre deux instants affichés sur une horloge (même journée ; heures entières, demi-heures ou quarts d'heure).$pt$),
--   ('CE1-104', 'CE1', 'neuf', 'CE1-063', 2, null, $pt$Comparer deux durées écoulées entre des instants affichés sur une horloge (même journée ; heures entières, demi-heures ou quarts d'heure).$pt$),
--   ('CE1-070', 'CE1', 'origine', null, 1, $pt$Reconnaitre, nommer et décrire un cercle, un carré, un rectangle, un triangle, un triangle rectangle en utilisant le vocabulaire approprié.$pt$, $pt$Reconnaître et nommer un cercle, un carré, un rectangle, un triangle ou un triangle rectangle (quelle est cette figure ?).$pt$),
--   ('CE1-105', 'CE1', 'neuf', 'CE1-070', 2, null, $pt$Décrire un cercle, un carré, un rectangle, un triangle ou un triangle rectangle avec le vocabulaire approprié (côtés, sommets, angles droits).$pt$),
--   ('CE1-082', 'CE1', 'origine', null, 1, $pt$Lire et interpréter les données d'un diagramme en barres.$pt$, $pt$Lire une donnée sur un diagramme en barres (combien d'élèves ont choisi le foot ?).$pt$),
--   ('CE1-106', 'CE1', 'neuf', 'CE1-082', 2, null, $pt$Interpréter les données d'un diagramme en barres (quel sport est le plus choisi ?).$pt$),
--   ('CE1-089', 'CE1', 'origine', null, 1, $pt$Lire et interpréter les données d'un tableau à double entrée.$pt$, $pt$Lire une donnée dans un tableau à double entrée (combien de filles mangent à la cantine le lundi ?).$pt$),
--   ('CE1-107', 'CE1', 'neuf', 'CE1-089', 2, null, $pt$Interpréter les données d'un tableau à double entrée (quel jour y a-t-il le plus d'élèves à la cantine ?).$pt$),
--   ('CE2-004', 'CE2', 'origine', null, 1, $pt$Connaitre la suite écrite et la suite orale des nombres jusqu'à dix-mille.$pt$, $pt$Connaître la suite écrite des nombres jusqu'à dix mille (écris le nombre qui suit 9 999).$pt$),
--   ('CE2-086', 'CE2', 'neuf', 'CE2-004', 2, null, $pt$Connaître la suite orale des nombres jusqu'à dix mille (récite la suite de 9 990 à 10 000, en classe).$pt$),
--   ('CE2-007', 'CE2', 'origine', null, 1, $pt$Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles (=, <, >).$pt$, $pt$Comparer deux nombres entiers avec les symboles =, < et > (6 239 … 6 243).$pt$),
--   ('CE2-087', 'CE2', 'neuf', 'CE2-007', 2, null, $pt$Encadrer un nombre entier avec les symboles < et > (… < 6 239 < …).$pt$),
--   ('CE2-088', 'CE2', 'neuf', 'CE2-007', 3, null, $pt$Intercaler un nombre entier entre deux nombres donnés (2 393 < … < 2 396).$pt$),
--   ('CE2-014', 'CE2', 'origine', null, 1, $pt$Additionner et soustraire des fractions.$pt$, $pt$Additionner des fractions (3/4 + 1/4 = ?).$pt$),
--   ('CE2-089', 'CE2', 'neuf', 'CE2-014', 2, null, $pt$Soustraire des fractions (3/4 − 1/4 = ?).$pt$),
--   ('CE2-016', 'CE2', 'origine', null, 1, $pt$Poser et effectuer des additions et des soustractions en colonnes.$pt$, $pt$Poser et effectuer une addition en colonnes.$pt$),
--   ('CE2-090', 'CE2', 'neuf', 'CE2-016', 2, null, $pt$Poser et effectuer une soustraction en colonnes.$pt$),
--   ('CE2-017', 'CE2', 'origine', null, 1, $pt$Comprendre et utiliser les mots « facteur », « produit » et « multiple ».$pt$, $pt$Comprendre et utiliser les mots « facteur » et « produit » (dans 4 × 6 = 24, quel est le produit ?).$pt$),
--   ('CE2-091', 'CE2', 'neuf', 'CE2-017', 2, null, $pt$Comprendre et utiliser le mot « multiple » (24 est-il un multiple de 6 ?).$pt$),
--   ('CE2-020', 'CE2', 'origine', null, 1, $pt$Connaitre dans les deux sens les tables d'addition.$pt$, $pt$Connaître les tables d'addition : donner la somme de deux nombres (3 + 4 = ?).$pt$),
--   ('CE2-084', 'CE2', 'neuf', 'CE2-020', 2, null, $pt$Connaître les tables d'addition dans l'autre sens : trouver le terme manquant d'une addition (3 + ? = 7).$pt$),
--   ('CE2-021', 'CE2', 'origine', null, 1, $pt$Connaitre dans les deux sens les tables de multiplication.$pt$, $pt$Connaître les tables de multiplication : donner le produit de deux nombres (3 × 4 = ?).$pt$),
--   ('CE2-085', 'CE2', 'neuf', 'CE2-021', 2, null, $pt$Connaître les tables de multiplication dans l'autre sens : trouver le facteur manquant d'un produit (3 × ? = 12).$pt$),
--   ('CE2-022', 'CE2', 'origine', null, 1, $pt$Connaitre des faits multiplicatifs usuels : les doubles et les moitiés.$pt$, $pt$Connaître des faits multiplicatifs usuels : les doubles (double de 35 = ?).$pt$),
--   ('CE2-092', 'CE2', 'neuf', 'CE2-022', 2, null, $pt$Connaître des faits multiplicatifs usuels : les moitiés (moitié de 70 = ?).$pt$),
--   ('CE2-026', 'CE2', 'origine', null, 1, $pt$Multiplier un nombre entier par 4 ou par 8.$pt$, $pt$Multiplier un nombre entier par 4 (4 × 37 = ?).$pt$),
--   ('CE2-093', 'CE2', 'neuf', 'CE2-026', 2, null, $pt$Multiplier un nombre entier par 8 (8 × 27 = ?).$pt$),
--   ('CE2-059', 'CE2', 'origine', null, 1, $pt$Comparer et mesurer des durées écoulées entre deux instants affichés sur une horloge (pour des intervalles de temps situés dans une même journée).$pt$, $pt$Mesurer la durée écoulée entre deux instants affichés sur une horloge (dans une même journée).$pt$),
--   ('CE2-094', 'CE2', 'neuf', 'CE2-059', 2, null, $pt$Comparer deux durées écoulées entre des instants affichés sur une horloge (dans une même journée).$pt$),
--   ('CE2-068', 'CE2', 'origine', null, 1, $pt$Reconnaitre, nommer et décrire le carré, le rectangle, le triangle, le triangle rectangle et le losange.$pt$, $pt$Reconnaître et nommer le carré, le rectangle, le triangle, le triangle rectangle et le losange (quelle est cette figure ?).$pt$),
--   ('CE2-095', 'CE2', 'neuf', 'CE2-068', 2, null, $pt$Décrire le carré, le rectangle, le triangle, le triangle rectangle et le losange avec le vocabulaire approprié (côtés, sommets, angles droits).$pt$),
--   ('CE2-075', 'CE2', 'origine', null, 1, $pt$Lire et interpréter les données d'un tableau à double entrée.$pt$, $pt$Lire une donnée dans un tableau à double entrée (combien de filles mangent à la cantine le lundi ?).$pt$),
--   ('CE2-096', 'CE2', 'neuf', 'CE2-075', 2, null, $pt$Interpréter les données d'un tableau à double entrée (quel jour y a-t-il le plus d'élèves à la cantine ?).$pt$),
--   ('CE2-083', 'CE2', 'origine', null, 1, $pt$Lire et interpréter les données d'un diagramme en barres.$pt$, $pt$Lire une donnée sur un diagramme en barres (combien d'élèves ont choisi le foot ?).$pt$),
--   ('CE2-097', 'CE2', 'neuf', 'CE2-083', 2, null, $pt$Interpréter les données d'un diagramme en barres (combien d'élèves de plus pour le foot que pour le basket ?).$pt$),
--   ('CM1-004', 'CM1', 'origine', null, 1, $pt$Connaître la suite écrite et la suite orale des nombres jusqu'à 999 999$pt$, $pt$Connaître la suite écrite des nombres jusqu'à 999 999 (écris le nombre qui suit 99 999).$pt$),
--   ('CM1-140', 'CM1', 'neuf', 'CM1-004', 2, null, $pt$Connaître la suite orale des nombres jusqu'à 999 999 (récite la suite de 99 990 à 100 000, en classe).$pt$),
--   ('CM1-008', 'CM1', 'origine', null, 1, $pt$Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles =, < et >$pt$, $pt$Comparer deux nombres entiers avec les symboles =, < et > (45 307 … 45 370).$pt$),
--   ('CM1-141', 'CM1', 'neuf', 'CM1-008', 2, null, $pt$Encadrer un nombre entier avec les symboles < et > (… < 45 307 < …).$pt$),
--   ('CM1-142', 'CM1', 'neuf', 'CM1-008', 3, null, $pt$Intercaler un nombre entier entre deux nombres donnés (45 307 < … < 45 370).$pt$),
--   ('CM1-010', 'CM1', 'origine', null, 1, $pt$Savoir placer des nombres et repérer des points sur une demi-droite graduée$pt$, $pt$Placer un nombre entier sur une demi-droite graduée.$pt$),
--   ('CM1-143', 'CM1', 'neuf', 'CM1-010', 2, null, $pt$Lire le nombre qui repère un point d'une demi-droite graduée.$pt$),
--   ('CM1-014', 'CM1', 'origine', null, 1, $pt$Savoir interpréter, représenter, écrire et lire des fractions$pt$, $pt$Lire et écrire une fraction en chiffres et en lettres (cinq tiers ↔ 5/3).$pt$),
--   ('CM1-144', 'CM1', 'neuf', 'CM1-014', 2, null, $pt$Représenter une fraction donnée par un partage (colorier les parts d'une figure).$pt$),
--   ('CM1-145', 'CM1', 'neuf', 'CM1-014', 3, null, $pt$Interpréter un partage par une fraction (quelle part de la figure est coloriée ?).$pt$),
--   ('CM1-018', 'CM1', 'origine', null, 1, $pt$Savoir placer une fraction ou la somme d'un nombre entier et d'une fraction inférieure à un sur une demi-droite graduée$pt$, $pt$Placer une fraction sur une demi-droite graduée (place 3/4).$pt$),
--   ('CM1-146', 'CM1', 'neuf', 'CM1-018', 2, null, $pt$Placer la somme d'un entier et d'une fraction inférieure à un sur une demi-droite graduée (place 2 + 1/4).$pt$),
--   ('CM1-019', 'CM1', 'origine', null, 1, $pt$Savoir repérer un point d'une demi-droite graduée par une fraction ou par la somme d'un nombre entier et d'une fraction$pt$, $pt$Repérer un point d'une demi-droite graduée par une fraction (le point A repère … : 3/4).$pt$),
--   ('CM1-147', 'CM1', 'neuf', 'CM1-019', 2, null, $pt$Repérer un point d'une demi-droite graduée par la somme d'un nombre entier et d'une fraction (le point B repère … : 2 + 1/4).$pt$),
--   ('CM1-021', 'CM1', 'origine', null, 1, $pt$Additionner et soustraire des fractions$pt$, $pt$Additionner des fractions (3/10 + 5/10 = ?).$pt$),
--   ('CM1-148', 'CM1', 'neuf', 'CM1-021', 2, null, $pt$Soustraire des fractions (8/10 − 5/10 = ?).$pt$),
--   ('CM1-023', 'CM1', 'origine', null, 1, $pt$Interpréter, représenter, écrire et lire des fractions décimales$pt$, $pt$Lire et écrire une fraction décimale en chiffres et en lettres (vingt-trois centièmes ↔ 23/100).$pt$),
--   ('CM1-149', 'CM1', 'neuf', 'CM1-023', 2, null, $pt$Représenter une fraction décimale donnée par un partage (colorier les parts d'une figure).$pt$),
--   ('CM1-150', 'CM1', 'neuf', 'CM1-023', 3, null, $pt$Interpréter un partage par une fraction décimale (quelle part de la figure est coloriée ?).$pt$),
--   ('CM1-025', 'CM1', 'origine', null, 1, $pt$Placer une fraction décimale sur une demi-droite graduée et repérer un point d'une demi-droite graduée par une fraction décimale$pt$, $pt$Placer une fraction décimale sur une demi-droite graduée.$pt$),
--   ('CM1-151', 'CM1', 'neuf', 'CM1-025', 2, null, $pt$Repérer un point d'une demi-droite graduée par une fraction décimale.$pt$),
--   ('CM1-028', 'CM1', 'origine', null, 1, $pt$Comparer, encadrer, intercaler des fractions décimales en utilisant les symboles =, < et >$pt$, $pt$Comparer deux fractions décimales avec les symboles =, < et > (7/10 … 65/100).$pt$),
--   ('CM1-152', 'CM1', 'neuf', 'CM1-028', 2, null, $pt$Encadrer une fraction décimale (… < 237/100 < …).$pt$),
--   ('CM1-153', 'CM1', 'neuf', 'CM1-028', 3, null, $pt$Intercaler une fraction décimale entre deux fractions décimales (3/10 < … < 4/10).$pt$),
--   ('CM1-030', 'CM1', 'origine', null, 1, $pt$Passer d'une écriture sous forme d'une fraction décimale ou d'une somme de fractions décimales à une écriture à virgule et réciproquement$pt$, $pt$Écrire à virgule un nombre donné par une fraction décimale ou une somme de fractions décimales (237/100 = ? ou 2 + 3/10 + 7/100 = ?).$pt$),
--   ('CM1-154', 'CM1', 'neuf', 'CM1-030', 2, null, $pt$Écrire un nombre à virgule sous forme de fraction décimale ou de somme de fractions décimales (2,37 = ?/100).$pt$),
--   ('CM1-031', 'CM1', 'origine', null, 1, $pt$Interpréter, représenter, écrire et lire des nombres décimaux (écriture à virgule)$pt$, $pt$Lire et écrire un nombre décimal en chiffres et en lettres (trois unités et vingt-cinq centièmes ↔ 3,25).$pt$),
--   ('CM1-155', 'CM1', 'neuf', 'CM1-031', 2, null, $pt$Interpréter l'écriture à virgule : valeur de chaque chiffre (chiffre des centièmes de 3,25 ?).$pt$),
--   ('CM1-156', 'CM1', 'neuf', 'CM1-031', 3, null, $pt$Représenter un nombre décimal (figure partagée en dixièmes ou en centièmes).$pt$),
--   ('CM1-032', 'CM1', 'origine', null, 1, $pt$Placer un nombre décimal en écriture à virgule sur une demi-droite graduée et repérer un point d'une demi-droite graduée par un nombre décimal$pt$, $pt$Placer un nombre décimal sur une demi-droite graduée.$pt$),
--   ('CM1-157', 'CM1', 'neuf', 'CM1-032', 2, null, $pt$Repérer un point d'une demi-droite graduée par un nombre décimal.$pt$),
--   ('CM1-033', 'CM1', 'origine', null, 1, $pt$Savoir donner la partie entière et l'arrondi à l'entier d'un nombre décimal$pt$, $pt$Donner la partie entière d'un nombre décimal (partie entière de 3,7 = ?).$pt$),
--   ('CM1-158', 'CM1', 'neuf', 'CM1-033', 2, null, $pt$Donner l'arrondi à l'entier d'un nombre décimal (arrondi de 3,7 = ?).$pt$),
--   ('CM1-034', 'CM1', 'origine', null, 1, $pt$Comparer, ordonner, par ordre croissant ou décroissant, des nombres décimaux donnés par leur écriture à virgule en utilisant les symboles =, < et >$pt$, $pt$Comparer deux nombres décimaux avec les symboles =, < et > (3,7 … 3,25).$pt$),
--   ('CM1-159', 'CM1', 'neuf', 'CM1-034', 2, null, $pt$Ordonner des nombres décimaux dans l'ordre croissant ou décroissant.$pt$),
--   ('CM1-132', 'CM1', 'origine', null, 1, $pt$Encadrer, intercaler des nombres décimaux donnés par leur écriture à virgule en utilisant les symboles =, < et >$pt$, $pt$Encadrer un nombre décimal (entre deux entiers consécutifs : 3 < 3,7 < 4 ; au dixième près : 3,7 < 3,74 < 3,8).$pt$),
--   ('CM1-160', 'CM1', 'neuf', 'CM1-132', 2, null, $pt$Intercaler un nombre décimal entre deux nombres décimaux (3,4 < … < 3,5).$pt$),
--   ('CM1-035', 'CM1', 'origine', null, 1, $pt$Connaître des faits numériques usuels relatifs aux nombres entiers — répertoire additif ✂$pt$, $pt$Connaître le répertoire additif : donner la somme de deux nombres (8 + 7 = ?).$pt$),
--   ('CM1-161', 'CM1', 'neuf', 'CM1-035', 2, null, $pt$Connaître le répertoire additif : compléter une addition à trou (8 + ? = 15).$pt$),
--   ('CM1-036', 'CM1', 'origine', null, 1, $pt$Connaître des faits numériques usuels relatifs aux nombres entiers — répertoire multiplicatif ✂$pt$, $pt$Connaître le répertoire multiplicatif : donner le produit de deux nombres (7 × 8 = ?).$pt$),
--   ('CM1-162', 'CM1', 'neuf', 'CM1-036', 2, null, $pt$Connaître le répertoire multiplicatif : compléter une multiplication à trou (7 × ? = 56).$pt$),
--   ('CM1-043', 'CM1', 'origine', null, 1, $pt$Ajouter ou soustraire 8, 9, 18, 19, 28, 29, 38 ou 39, à un nombre$pt$, $pt$Ajouter 8, 9, 18, 19, 28, 29, 38 ou 39 à un nombre (57 + 29 = ?).$pt$),
--   ('CM1-163', 'CM1', 'neuf', 'CM1-043', 2, null, $pt$Soustraire 8, 9, 18, 19, 28, 29, 38 ou 39 à un nombre (57 − 29 = ?).$pt$),
--   ('CM1-045', 'CM1', 'origine', null, 1, $pt$Multiplier un nombre entier par 4 ou par 8$pt$, $pt$Multiplier un nombre entier par 4 (4 × 45 = ?).$pt$),
--   ('CM1-164', 'CM1', 'neuf', 'CM1-045', 2, null, $pt$Multiplier un nombre entier par 8 (8 × 45 = ?).$pt$),
--   ('CM1-050', 'CM1', 'origine', null, 1, $pt$Poser en colonnes et effectuer des additions et des soustractions de nombres décimaux$pt$, $pt$Poser en colonnes et effectuer une addition de nombres décimaux.$pt$),
--   ('CM1-165', 'CM1', 'neuf', 'CM1-050', 2, null, $pt$Poser en colonnes et effectuer une soustraction de nombres décimaux.$pt$),
--   ('CM1-094', 'CM1', 'origine', null, 1, $pt$Comparer et mesurer des durées écoulées entre deux instants affichés sur une horloge (instants et durées sont exprimés en heure et minute)$pt$, $pt$Mesurer la durée écoulée entre deux instants affichés sur une horloge (en heures et minutes).$pt$),
--   ('CM1-166', 'CM1', 'neuf', 'CM1-094', 2, null, $pt$Comparer deux durées écoulées entre des instants affichés sur une horloge (en heures et minutes).$pt$),
--   ('CM1-100', 'CM1', 'origine', null, 1, $pt$Reconnaître et utiliser la notion de perpendicularité$pt$, $pt$Reconnaître des droites perpendiculaires.$pt$),
--   ('CM1-167', 'CM1', 'neuf', 'CM1-100', 2, null, $pt$Tracer la droite perpendiculaire à une droite donnée passant par un point.$pt$),
--   ('CM1-101', 'CM1', 'origine', null, 1, $pt$Reconnaître et utiliser la notion de parallélisme$pt$, $pt$Reconnaître des droites parallèles.$pt$),
--   ('CM1-168', 'CM1', 'neuf', 'CM1-101', 2, null, $pt$Tracer la droite parallèle à une droite donnée passant par un point.$pt$),
--   ('CM1-121', 'CM1', 'origine', null, 1, $pt$Lire et interpréter les données d'un tableau à simple entrée$pt$, $pt$Lire une donnée dans un tableau à simple entrée (quelle est la population de Lyon ?).$pt$),
--   ('CM1-169', 'CM1', 'neuf', 'CM1-121', 2, null, $pt$Interpréter les données d'un tableau à simple entrée (quelle ville est la plus peuplée ?).$pt$),
--   ('CM1-137', 'CM1', 'origine', null, 1, $pt$Lire et interpréter les données d'un tableau à double entrée$pt$, $pt$Lire une donnée dans un tableau à double entrée (combien de garçons pratiquent la natation ?).$pt$),
--   ('CM1-170', 'CM1', 'neuf', 'CM1-137', 2, null, $pt$Interpréter les données d'un tableau à double entrée (quel sport attire le plus de filles ?).$pt$),
--   ('CM1-138', 'CM1', 'origine', null, 1, $pt$Lire et interpréter les données d'un diagramme en barres$pt$, $pt$Lire une donnée sur un diagramme en barres (combien de livres ont été prêtés en mars ?).$pt$),
--   ('CM1-171', 'CM1', 'neuf', 'CM1-138', 2, null, $pt$Interpréter les données d'un diagramme en barres (combien de livres de plus en mars qu'en février ?).$pt$),
--   ('CM1-139', 'CM1', 'origine', null, 1, $pt$Lire et interpréter les données d'une courbe$pt$, $pt$Lire une donnée sur une courbe (quelle température à 14 h ?).$pt$),
--   ('CM1-172', 'CM1', 'neuf', 'CM1-139', 2, null, $pt$Interpréter les données d'une courbe (à quel moment la température est-elle la plus haute ?).$pt$),
--   ('CM2-002', 'CM2', 'origine', null, 1, $pt$Connaître la suite écrite et la suite orale des nombres jusqu'à 999 999 999$pt$, $pt$Connaître la suite écrite des nombres jusqu'à 999 999 999 (écris le nombre qui suit 999 999).$pt$),
--   ('CM2-126', 'CM2', 'neuf', 'CM2-002', 2, null, $pt$Connaître la suite orale des nombres jusqu'à 999 999 999 (récite la suite de 999 990 à 1 000 000, en classe).$pt$),
--   ('CM2-005', 'CM2', 'origine', null, 1, $pt$Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles =, < et >$pt$, $pt$Comparer deux nombres entiers avec les symboles =, < et > (3 405 270 … 3 450 207).$pt$),
--   ('CM2-127', 'CM2', 'neuf', 'CM2-005', 2, null, $pt$Encadrer un nombre entier avec les symboles < et > (… < 3 405 270 < …).$pt$),
--   ('CM2-128', 'CM2', 'neuf', 'CM2-005', 3, null, $pt$Intercaler un nombre entier entre deux nombres donnés (3 405 270 < … < 3 450 207).$pt$),
--   ('CM2-007', 'CM2', 'origine', null, 1, $pt$Placer des nombres et repérer des points sur une demi-droite graduée$pt$, $pt$Placer un nombre entier sur une demi-droite graduée.$pt$),
--   ('CM2-129', 'CM2', 'neuf', 'CM2-007', 2, null, $pt$Lire le nombre qui repère un point d'une demi-droite graduée.$pt$),
--   ('CM2-008', 'CM2', 'origine', null, 1, $pt$Déterminer si un nombre entier inférieur ou égal à 10 est un diviseur d'un nombre entier donné ou si un nombre entier donné est un multiple d'un nombre entier inférieur ou égal à 10$pt$, $pt$Déterminer si un nombre entier inférieur ou égal à 10 est un diviseur d'un nombre entier donné (7 est-il un diviseur de 56 ?).$pt$),
--   ('CM2-130', 'CM2', 'neuf', 'CM2-008', 2, null, $pt$Déterminer si un nombre entier donné est un multiple d'un nombre entier inférieur ou égal à 10 (56 est-il un multiple de 7 ?).$pt$),
--   ('CM2-013', 'CM2', 'origine', null, 1, $pt$Interpréter, représenter, écrire et lire des fractions$pt$, $pt$Lire et écrire une fraction en chiffres et en lettres (cinq tiers ↔ 5/3).$pt$),
--   ('CM2-131', 'CM2', 'neuf', 'CM2-013', 2, null, $pt$Représenter une fraction donnée par un partage (colorier les parts d'une figure).$pt$),
--   ('CM2-132', 'CM2', 'neuf', 'CM2-013', 3, null, $pt$Interpréter un partage par une fraction (quelle part de la figure est coloriée ?).$pt$),
--   ('CM2-017', 'CM2', 'origine', null, 1, $pt$Placer une fraction ou la somme d'un nombre entier et d'une fraction inférieure à un sur une demi-droite graduée$pt$, $pt$Placer une fraction sur une demi-droite graduée (place 3/4).$pt$),
--   ('CM2-133', 'CM2', 'neuf', 'CM2-017', 2, null, $pt$Placer la somme d'un entier et d'une fraction inférieure à un sur une demi-droite graduée (place 2 + 1/4).$pt$),
--   ('CM2-018', 'CM2', 'origine', null, 1, $pt$Repérer un point d'une demi-droite graduée par une fraction ou par la somme d'un nombre entier et d'une fraction$pt$, $pt$Repérer un point d'une demi-droite graduée par une fraction (le point A repère … : 3/4).$pt$),
--   ('CM2-134', 'CM2', 'neuf', 'CM2-018', 2, null, $pt$Repérer un point d'une demi-droite graduée par la somme d'un nombre entier et d'une fraction (le point B repère … : 2 + 1/4).$pt$),
--   ('CM2-020', 'CM2', 'origine', null, 1, $pt$Additionner et soustraire des fractions$pt$, $pt$Additionner des fractions (3/4 + 1/4 = ?).$pt$),
--   ('CM2-135', 'CM2', 'neuf', 'CM2-020', 2, null, $pt$Soustraire des fractions (3/4 − 1/4 = ?).$pt$),
--   ('CM2-023', 'CM2', 'origine', null, 1, $pt$Interpréter, représenter, écrire et lire des fractions décimales$pt$, $pt$Lire et écrire une fraction décimale en chiffres et en lettres (vingt-trois centièmes ↔ 23/100).$pt$),
--   ('CM2-136', 'CM2', 'neuf', 'CM2-023', 2, null, $pt$Représenter une fraction décimale donnée par un partage (colorier les parts d'une figure).$pt$),
--   ('CM2-137', 'CM2', 'neuf', 'CM2-023', 3, null, $pt$Interpréter un partage par une fraction décimale (quelle part de la figure est coloriée ?).$pt$),
--   ('CM2-025', 'CM2', 'origine', null, 1, $pt$Placer une fraction décimale sur une demi-droite graduée et repérer un point d'une demi-droite graduée par une fraction décimale$pt$, $pt$Placer une fraction décimale sur une demi-droite graduée.$pt$),
--   ('CM2-138', 'CM2', 'neuf', 'CM2-025', 2, null, $pt$Repérer un point d'une demi-droite graduée par une fraction décimale.$pt$),
--   ('CM2-028', 'CM2', 'origine', null, 1, $pt$Comparer, encadrer, intercaler des fractions décimales en utilisant les symboles =, < et >$pt$, $pt$Comparer deux fractions décimales avec les symboles =, < et > (7/10 … 65/100).$pt$),
--   ('CM2-139', 'CM2', 'neuf', 'CM2-028', 2, null, $pt$Encadrer une fraction décimale (… < 237/100 < …).$pt$),
--   ('CM2-140', 'CM2', 'neuf', 'CM2-028', 3, null, $pt$Intercaler une fraction décimale entre deux fractions décimales (3/10 < … < 4/10).$pt$),
--   ('CM2-030', 'CM2', 'origine', null, 1, $pt$Passer d'une écriture sous forme d'une fraction décimale ou de la somme de fractions décimales à une écriture à virgule et réciproquement$pt$, $pt$Écrire à virgule un nombre donné par une fraction décimale ou une somme de fractions décimales (237/100 = ? ou 2 + 3/10 + 7/100 = ?).$pt$),
--   ('CM2-141', 'CM2', 'neuf', 'CM2-030', 2, null, $pt$Écrire un nombre à virgule sous forme de fraction décimale ou de somme de fractions décimales (2,37 = ?/100).$pt$),
--   ('CM2-031', 'CM2', 'origine', null, 1, $pt$Interpréter, représenter, écrire et lire des nombres décimaux (écriture à virgule)$pt$, $pt$Lire et écrire un nombre décimal en chiffres et en lettres (trois unités et vingt-cinq centièmes ↔ 3,25).$pt$),
--   ('CM2-142', 'CM2', 'neuf', 'CM2-031', 2, null, $pt$Interpréter l'écriture à virgule : valeur de chaque chiffre (chiffre des centièmes de 3,25 ?).$pt$),
--   ('CM2-143', 'CM2', 'neuf', 'CM2-031', 3, null, $pt$Représenter un nombre décimal (figure partagée en dixièmes ou en centièmes).$pt$),
--   ('CM2-032', 'CM2', 'origine', null, 1, $pt$Placer un nombre décimal en écriture à virgule sur une demi-droite graduée et repérer un point d'une demi-droite graduée par un nombre en écriture à virgule$pt$, $pt$Placer un nombre décimal sur une demi-droite graduée.$pt$),
--   ('CM2-144', 'CM2', 'neuf', 'CM2-032', 2, null, $pt$Repérer un point d'une demi-droite graduée par un nombre décimal.$pt$),
--   ('CM2-033', 'CM2', 'origine', null, 1, $pt$Savoir donner la partie entière et l'arrondi à l'entier d'un nombre décimal$pt$, $pt$Donner la partie entière d'un nombre décimal (partie entière de 3,7 = ?).$pt$),
--   ('CM2-145', 'CM2', 'neuf', 'CM2-033', 2, null, $pt$Donner l'arrondi à l'entier d'un nombre décimal (arrondi de 3,7 = ?).$pt$),
--   ('CM2-034', 'CM2', 'origine', null, 1, $pt$Comparer, ordonner par ordre croissant ou décroissant des nombres décimaux donnés par leur écriture à virgule en utilisant les symboles =, < et >$pt$, $pt$Comparer deux nombres décimaux avec les symboles =, < et > (3,7 … 3,25).$pt$),
--   ('CM2-146', 'CM2', 'neuf', 'CM2-034', 2, null, $pt$Ordonner des nombres décimaux dans l'ordre croissant ou décroissant.$pt$),
--   ('CM2-117', 'CM2', 'origine', null, 1, $pt$Encadrer, intercaler des nombres décimaux donnés par leur écriture à virgule en utilisant les symboles =, < et >$pt$, $pt$Encadrer un nombre décimal (entre deux entiers consécutifs : 3 < 3,7 < 4 ; au dixième près : 3,7 < 3,74 < 3,8).$pt$),
--   ('CM2-147', 'CM2', 'neuf', 'CM2-117', 2, null, $pt$Intercaler un nombre décimal entre deux nombres décimaux (3,4 < … < 3,5).$pt$),
--   ('CM2-035', 'CM2', 'origine', null, 1, $pt$Connaître des faits numériques usuels avec des entiers — répertoire additif ✂$pt$, $pt$Connaître le répertoire additif : donner la somme de deux nombres (8 + 7 = ?).$pt$),
--   ('CM2-148', 'CM2', 'neuf', 'CM2-035', 2, null, $pt$Connaître le répertoire additif : compléter une addition à trou (8 + ? = 15).$pt$),
--   ('CM2-036', 'CM2', 'origine', null, 1, $pt$Connaître des faits numériques usuels avec des entiers — répertoire multiplicatif ✂$pt$, $pt$Connaître le répertoire multiplicatif : donner le produit de deux nombres (7 × 8 = ?).$pt$),
--   ('CM2-149', 'CM2', 'neuf', 'CM2-036', 2, null, $pt$Connaître le répertoire multiplicatif : compléter une multiplication à trou (7 × ? = 56).$pt$),
--   ('CM2-045', 'CM2', 'origine', null, 1, $pt$Ajouter ou soustraire 8, 9, 18, 19, 28, 29, …, 98 ou 99 à un nombre$pt$, $pt$Ajouter 8, 9, 18, 19, …, 98 ou 99 à un nombre (157 + 39 = ?).$pt$),
--   ('CM2-150', 'CM2', 'neuf', 'CM2-045', 2, null, $pt$Soustraire 8, 9, 18, 19, …, 98 ou 99 à un nombre (157 − 39 = ?).$pt$),
--   ('CM2-050', 'CM2', 'origine', null, 1, $pt$Diviser un nombre entier par 4 ou par 8$pt$, $pt$Diviser un nombre entier par 4 (128 ÷ 4 = ?).$pt$),
--   ('CM2-151', 'CM2', 'neuf', 'CM2-050', 2, null, $pt$Diviser un nombre entier par 8 (128 ÷ 8 = ?).$pt$),
--   ('CM2-067', 'CM2', 'origine', null, 1, $pt$Exécuter ou produire un programme de calcul$pt$, $pt$Exécuter un programme de calcul (résultat pour un nombre de départ donné).$pt$),
--   ('CM2-152', 'CM2', 'neuf', 'CM2-067', 2, null, $pt$Produire un programme de calcul pour obtenir un résultat donné.$pt$),
--   ('CM2-084', 'CM2', 'origine', null, 1, $pt$Comparer et mesurer des durées écoulées entre deux instants affichés sur une horloge (instants et durées sont exprimés en heure, minute et seconde)$pt$, $pt$Mesurer la durée écoulée entre deux instants affichés sur une horloge (en heures, minutes et secondes).$pt$),
--   ('CM2-153', 'CM2', 'neuf', 'CM2-084', 2, null, $pt$Comparer deux durées écoulées entre des instants affichés sur une horloge (en heures, minutes et secondes).$pt$),
--   ('CM2-089', 'CM2', 'origine', null, 1, $pt$Reconnaître et utiliser la notion de perpendicularité$pt$, $pt$Reconnaître des droites perpendiculaires.$pt$),
--   ('CM2-154', 'CM2', 'neuf', 'CM2-089', 2, null, $pt$Tracer la droite perpendiculaire à une droite donnée passant par un point.$pt$),
--   ('CM2-090', 'CM2', 'origine', null, 1, $pt$Reconnaître et utiliser la notion de parallélisme$pt$, $pt$Reconnaître des droites parallèles.$pt$),
--   ('CM2-155', 'CM2', 'neuf', 'CM2-090', 2, null, $pt$Tracer la droite parallèle à une droite donnée passant par un point.$pt$),
--   ('CM2-107', 'CM2', 'origine', null, 1, $pt$Lire et interpréter les données d'un tableau$pt$, $pt$Lire une donnée dans un tableau (quelle est la population de Lyon ?).$pt$),
--   ('CM2-156', 'CM2', 'neuf', 'CM2-107', 2, null, $pt$Interpréter les données d'un tableau (quelle ville est la plus peuplée ?).$pt$),
--   ('CM2-123', 'CM2', 'origine', null, 1, $pt$Lire et interpréter les données d'un diagramme en barres$pt$, $pt$Lire une donnée sur un diagramme en barres (combien de livres ont été prêtés en mars ?).$pt$),
--   ('CM2-157', 'CM2', 'neuf', 'CM2-123', 2, null, $pt$Interpréter les données d'un diagramme en barres (combien de livres de plus en mars qu'en février ?).$pt$),
--   ('CM2-124', 'CM2', 'origine', null, 1, $pt$Lire et interpréter les données d'un diagramme circulaire$pt$, $pt$Lire une donnée sur un diagramme circulaire (quelle part des élèves vient à vélo ?).$pt$),
--   ('CM2-158', 'CM2', 'neuf', 'CM2-124', 2, null, $pt$Interpréter les données d'un diagramme circulaire (quel moyen de transport est le plus utilisé ?).$pt$),
--   ('CM2-125', 'CM2', 'origine', null, 1, $pt$Lire et interpréter les données d'une courbe$pt$, $pt$Lire une donnée sur une courbe (quelle température à 14 h ?).$pt$),
--   ('CM2-159', 'CM2', 'neuf', 'CM2-125', 2, null, $pt$Interpréter les données d'une courbe (entre quelles heures la température augmente-t-elle ?).$pt$),
--   ('6-113', '6', 'origine', null, 1, $pt$Encadrer un nombre décimal par deux nombres décimaux, intercaler un nombre décimal entre deux nombres décimaux$pt$, $pt$Encadrer un nombre décimal par deux nombres décimaux (… < 3,47 < …).$pt$),
--   ('6-202', '6', 'neuf', '6-113', 2, null, $pt$Intercaler un nombre décimal entre deux nombres décimaux (3,4 < … < 3,5).$pt$),
--   ('6-133', '6', 'origine', null, 1, $pt$Comparer et encadrer des fractions$pt$, $pt$Comparer deux fractions (3/4 … 5/6).$pt$),
--   ('6-203', '6', 'neuf', '6-133', 2, null, $pt$Encadrer une fraction (… < 7/3 < …).$pt$),
--   ('6-134', '6', 'origine', null, 1, $pt$Ordonner une liste de nombres écrits sous forme de fractions ou de nombres mixtes$pt$, $pt$Ordonner une liste de fractions (range 3/4 ; 2/3 ; 5/6).$pt$),
--   ('6-204', '6', 'neuf', '6-134', 2, null, $pt$Ordonner une liste de nombres mixtes (range 2 + 1/4 ; 1 + 3/4 ; 2 + 1/3).$pt$),
--   ('6-135', '6', 'origine', null, 1, $pt$Additionner et soustraire des fractions$pt$, $pt$Additionner des fractions (2/3 + 1/6 = ?).$pt$),
--   ('6-205', '6', 'neuf', '6-135', 2, null, $pt$Soustraire des fractions (2/3 − 1/6 = ?).$pt$),
--   ('6-157', '6', 'origine', null, 1, $pt$Effectuer des calculs sur des horaires et des durées$pt$, $pt$Calculer un horaire ou une durée à partir des deux autres données (départ 9 h 40, durée 1 h 35 : arrivée ? ; départ 9 h 40, arrivée 11 h 15 : durée ?).$pt$),
--   ('6-206', '6', 'neuf', '6-157', 2, null, $pt$Calculer sur des durées (1 h 40 min + 2 h 35 min = ?).$pt$),
--   ('6-178', '6', 'origine', null, 1, $pt$Connaître et construire le cercle circonscrit à un triangle$pt$, $pt$Connaître le cercle circonscrit à un triangle (son centre est le point de concours des médiatrices).$pt$),
--   ('6-207', '6', 'neuf', '6-178', 2, null, $pt$Construire le cercle circonscrit à un triangle.$pt$),
--   ('6-181', '6', 'origine', null, 1, $pt$Voir dans l'espace des assemblages de cubes : passage, dans les deux sens, entre l'objet à trois dimensions et ses diverses représentations à deux dimensions ; dénombrements$pt$, $pt$Associer à un assemblage de cubes ses représentations planes (vue de dessus, de face…).$pt$),
--   ('6-208', '6', 'neuf', '6-181', 2, null, $pt$Retrouver un assemblage de cubes à partir de ses représentations planes.$pt$),
--   ('6-209', '6', 'neuf', '6-181', 3, null, $pt$Dénombrer les cubes d'un assemblage.$pt$),
--   ('6-195', '6', 'origine', null, 1, $pt$Produire et exécuter une séquence d'instructions$pt$, $pt$Exécuter une séquence d'instructions (résultat pour un nombre de départ donné).$pt$),
--   ('6-210', '6', 'neuf', '6-195', 2, null, $pt$Produire une séquence d'instructions pour obtenir un résultat donné.$pt$),
--   ('5-005', '5', 'origine', null, 1, $pt$Traduire un problème, une succession donnée d'opérations, un programme de calcul, en une seule expression, en faisant appel ou non à des parenthèses.$pt$, $pt$Traduire un problème en une seule expression (Léo achète 3 cahiers à 2 € et un stylo à 1 € : écris le calcul du prix).$pt$),
--   ('5-116', '5', 'neuf', '5-005', 2, null, $pt$Traduire une succession donnée d'opérations en une seule expression (ajoute 3 à 5, puis multiplie le résultat par 2 : écris le calcul).$pt$),
--   ('5-117', '5', 'neuf', '5-005', 3, null, $pt$Traduire un programme de calcul en une seule expression (choisis 5, ajoute 3, multiplie par 2 : écris l'expression).$pt$),
--   ('5-006', '5', 'origine', null, 1, $pt$Nommer un calcul, distinguer sommes et produits, termes et facteurs.$pt$, $pt$Nommer un calcul : dire s'il est une somme ou un produit (3 + 4 × 5 est une somme).$pt$),
--   ('5-118', '5', 'neuf', '5-006', 2, null, $pt$Identifier les termes d'une somme ou les facteurs d'un produit.$pt$),
--   ('5-010', '5', 'origine', null, 1, $pt$Connaitre les critères de divisibilité par 3 et par 9.$pt$, $pt$Connaître le critère de divisibilité par 3 (4 518 est-il divisible par 3 ?).$pt$),
--   ('5-119', '5', 'neuf', '5-010', 2, null, $pt$Connaître le critère de divisibilité par 9 (4 518 est-il divisible par 9 ?).$pt$),
--   ('5-013', '5', 'origine', null, 1, $pt$Définir l'opposé et la valeur absolue d'un nombre.$pt$, $pt$Donner l'opposé d'un nombre relatif (opposé de −3 = ?).$pt$),
--   ('5-120', '5', 'neuf', '5-013', 2, null, $pt$Donner la valeur absolue d'un nombre relatif (valeur absolue de −3 = ?).$pt$),
--   ('5-016', '5', 'origine', null, 1, $pt$Lire l'abscisse d'un nombre relatif sur une droite graduée et placer un nombre relatif d'abscisse donnée.$pt$, $pt$Lire l'abscisse d'un point sur une droite graduée (nombres relatifs).$pt$),
--   ('5-121', '5', 'neuf', '5-016', 2, null, $pt$Placer sur une droite graduée un point d'abscisse relative donnée.$pt$),
--   ('5-017', '5', 'origine', null, 1, $pt$Comparer et ranger dans l'ordre croissant et décroissant des nombres décimaux relatifs.$pt$, $pt$Comparer deux nombres décimaux relatifs (−3,5 … −5).$pt$),
--   ('5-122', '5', 'neuf', '5-017', 2, null, $pt$Ranger des nombres décimaux relatifs dans l'ordre croissant ou décroissant.$pt$),
--   ('5-026', '5', 'origine', null, 1, $pt$Additionner et soustraire des fractions de dénominateurs quelconques.$pt$, $pt$Additionner des fractions de dénominateurs quelconques (2/3 + 1/4 = ?).$pt$),
--   ('5-123', '5', 'neuf', '5-026', 2, null, $pt$Soustraire des fractions de dénominateurs quelconques (2/3 − 1/4 = ?).$pt$),
--   ('5-034', '5', 'origine', null, 1, $pt$Produire des formules (double, triple, carré, successeur, prédécesseur, aire, périmètre, etc.).$pt$, $pt$Produire des formules pour un nombre : double, triple, carré, successeur, prédécesseur (triple de n : 3n ; successeur de n : n + 1).$pt$),
--   ('5-124', '5', 'neuf', '5-034', 2, null, $pt$Produire des formules de grandeurs : aire, périmètre (aire d'un rectangle de longueur L et de largeur l : L × l).$pt$),
--   ('5-044', '5', 'origine', null, 1, $pt$Modéliser des problèmes relevant des opérations à trous par des équations du type ax = c ou x + b = c.$pt$, $pt$Modéliser par une équation du type x + b = c un problème relevant d'une addition à trou.$pt$),
--   ('5-125', '5', 'neuf', '5-044', 2, null, $pt$Modéliser par une équation du type ax = c un problème relevant d'une multiplication à trou.$pt$),
--   ('5-045', '5', 'origine', null, 1, $pt$Résoudre des équations du type ax = c ou x + b = c par des méthodes arithmétiques s'appuyant sur les opérations inverses.$pt$, $pt$Résoudre une équation du type x + b = c par l'opération inverse (x + 7 = 12 : x = 12 − 7).$pt$),
--   ('5-126', '5', 'neuf', '5-045', 2, null, $pt$Résoudre une équation du type ax = c par l'opération inverse (3x = 12 : x = 12 ÷ 3).$pt$),
--   ('5-046', '5', 'origine', null, 1, $pt$Sur une droite graduée : lire l'abscisse d'un point donné ; placer un point d'abscisse donnée.$pt$, $pt$Lire l'abscisse d'un point sur une droite graduée.$pt$),
--   ('5-127', '5', 'neuf', '5-046', 2, null, $pt$Placer sur une droite graduée un point d'abscisse donnée.$pt$),
--   ('5-047', '5', 'origine', null, 1, $pt$Dans le plan muni d'un repère orthogonal : lire les coordonnées d'un point donné ; placer un point de coordonnées données.$pt$, $pt$Lire les coordonnées d'un point dans un repère orthogonal.$pt$),
--   ('5-128', '5', 'neuf', '5-047', 2, null, $pt$Placer un point de coordonnées données dans un repère orthogonal.$pt$),
--   ('5-051', '5', 'origine', null, 1, $pt$Connaitre et convertir des unités usuelles (volume et capacité).$pt$, $pt$Convertir des unités de volume (m³, dm³, cm³).$pt$),
--   ('5-129', '5', 'neuf', '5-051', 2, null, $pt$Convertir des unités de contenance et passer d'une unité de volume à une unité de contenance (1 L = 1 dm³).$pt$),
--   ('5-058', '5', 'origine', null, 1, $pt$Connaitre la somme des angles d'un triangle et savoir la démontrer.$pt$, $pt$Connaître la somme des angles d'un triangle (deux angles de 40° et 65° : le troisième ?).$pt$),
--   ('5-130', '5', 'neuf', '5-058', 2, null, $pt$Savoir démontrer la somme des angles d'un triangle (démontre que la somme vaut 180°, sur papier).$pt$),
--   ('5-062', '5', 'origine', null, 1, $pt$Définir et tracer les hauteurs dans un triangle.$pt$, $pt$Définir une hauteur d'un triangle (quel segment est la hauteur issue de A ?).$pt$),
--   ('5-131', '5', 'neuf', '5-062', 2, null, $pt$Tracer une hauteur d'un triangle.$pt$),
--   ('5-064', '5', 'origine', null, 1, $pt$Définir et tracer les médianes dans un triangle.$pt$, $pt$Définir une médiane d'un triangle (quel segment est la médiane issue de A ?).$pt$),
--   ('5-132', '5', 'neuf', '5-064', 2, null, $pt$Tracer une médiane d'un triangle.$pt$),
--   ('5-070', '5', 'origine', null, 1, $pt$Utiliser une propriété caractéristique sur les diagonales ou les côtés pour construire des parallélogrammes ou donner la nature du quadrilatère.$pt$, $pt$Donner la nature d'un quadrilatère à l'aide d'une propriété de ses côtés ou de ses diagonales.$pt$),
--   ('5-133', '5', 'neuf', '5-070', 2, null, $pt$Construire un parallélogramme à l'aide d'une propriété de ses côtés ou de ses diagonales.$pt$),
--   ('5-076', '5', 'origine', null, 1, $pt$Calculer des effectifs et des fréquences (exprimées sous forme décimale, fractionnaire ou de pourcentage).$pt$, $pt$Calculer des effectifs à partir de données.$pt$),
--   ('5-134', '5', 'neuf', '5-076', 2, null, $pt$Calculer une fréquence (sous forme décimale, fractionnaire ou de pourcentage).$pt$),
--   ('5-077', '5', 'origine', null, 1, $pt$Lire et interpréter des informations présentées sous forme de graphiques.$pt$, $pt$Lire une donnée sur un graphique (quelle est la valeur en 2020 ?).$pt$),
--   ('5-135', '5', 'neuf', '5-077', 2, null, $pt$Interpréter les données d'un graphique (entre quelles années la valeur a-t-elle le plus augmenté ?).$pt$),
--   ('5-109', '5', 'origine', null, 1, $pt$Lire et interpréter des informations présentées sous forme de tableaux.$pt$, $pt$Lire une donnée dans un tableau (combien d'élèves ont 12 ans ?).$pt$),
--   ('5-136', '5', 'neuf', '5-109', 2, null, $pt$Interpréter les données d'un tableau (quel âge est le plus fréquent ?).$pt$),
--   ('5-110', '5', 'origine', null, 1, $pt$Lire et interpréter des informations présentées sous forme de diagrammes en barres.$pt$, $pt$Lire une donnée sur un diagramme en barres (combien d'élèves ont 12 ans ?).$pt$),
--   ('5-137', '5', 'neuf', '5-110', 2, null, $pt$Interpréter les données d'un diagramme en barres (quel âge est le plus fréquent ?).$pt$),
--   ('5-111', '5', 'origine', null, 1, $pt$Lire et interpréter des informations présentées sous forme de diagrammes circulaires.$pt$, $pt$Lire une donnée sur un diagramme circulaire (quelle part des élèves vient à vélo ?).$pt$),
--   ('5-138', '5', 'neuf', '5-111', 2, null, $pt$Interpréter les données d'un diagramme circulaire (quel moyen de transport est le plus utilisé ?).$pt$),
--   ('5-080', '5', 'origine', null, 1, $pt$Calculer et interpréter la moyenne simple d'une série de données.$pt$, $pt$Calculer la moyenne simple d'une série de données (12, 15, 9, 14 → ?).$pt$),
--   ('5-139', '5', 'neuf', '5-080', 2, null, $pt$Interpréter la moyenne simple d'une série de données (une moyenne de 12 veut-elle dire que chacun a 12 ?).$pt$),
--   ('5-086', '5', 'origine', null, 1, $pt$Calculer, appliquer des proportions, des pourcentages.$pt$, $pt$Calculer une proportion ou un pourcentage (part du tout : 12 sur 48 = ? %).$pt$),
--   ('5-140', '5', 'neuf', '5-086', 2, null, $pt$Appliquer une proportion ou un pourcentage à une quantité (25 % de 48 = ?).$pt$),
--   ('5-090', '5', 'origine', null, 1, $pt$Reconnaitre une situation de proportionnalité à partir d'un tableau ou d'un graphique.$pt$, $pt$Reconnaître une situation de proportionnalité à partir d'un tableau (quotients égaux).$pt$),
--   ('5-141', '5', 'neuf', '5-090', 2, null, $pt$Reconnaître une situation de proportionnalité à partir d'un graphique (points alignés avec l'origine).$pt$),
--   ('5-094', '5', 'origine', null, 1, $pt$Lire et interpréter un tableau de valeurs.$pt$, $pt$Lire une donnée dans un tableau de valeurs (quelle valeur correspond à 3 ?).$pt$),
--   ('5-142', '5', 'neuf', '5-094', 2, null, $pt$Interpréter les données d'un tableau de valeurs (la grandeur augmente-t-elle quand x augmente ?).$pt$),
--   ('5-096', '5', 'origine', null, 1, $pt$Lire et interpréter un graphique cartésien donné par une courbe ou un nuage de points.$pt$, $pt$Lire une donnée sur un graphique cartésien, courbe ou nuage de points (quelle est l'ordonnée du point d'abscisse 2 ?).$pt$),
--   ('5-143', '5', 'neuf', '5-096', 2, null, $pt$Interpréter les données d'un graphique cartésien, courbe ou nuage de points (pour quelles valeurs la grandeur dépasse-t-elle 10 ?).$pt$),
--   ('4-004', '4', 'origine', null, 1, $pt$Utiliser le vocabulaire (somme, quotient, etc.) à partir d'un enchainement d'opérations dans un programme de calcul et inversement.$pt$, $pt$Nommer un enchaînement d'opérations avec le vocabulaire (somme, produit, quotient…) : (3 + 5) × 2 est « le produit de la somme de 3 et 5 par 2 ».$pt$),
--   ('4-073', '4', 'neuf', '4-004', 2, null, $pt$Écrire l'enchaînement d'opérations décrit par une phrase (« le quotient de 12 par la somme de 2 et 4 » = ?).$pt$),
--   ('4-009', '4', 'origine', null, 1, $pt$Calculer et représenter la fraction d'une fraction, d'un nombre, d'une quantité.$pt$, $pt$Calculer la fraction d'une fraction, d'un nombre ou d'une quantité (2/3 de 3/5 = ?).$pt$),
--   ('4-074', '4', 'neuf', '4-009', 2, null, $pt$Représenter la fraction d'une fraction ou d'une quantité (par un schéma).$pt$),
--   ('4-021', '4', 'origine', null, 1, $pt$Produire des formules et tester leur vraisemblance : aires de formes géométriques simples, nombres pairs/impairs, etc.$pt$, $pt$Produire des formules et tester leur vraisemblance : nombres pairs/impairs (un nombre pair : 2n).$pt$),
--   ('4-075', '4', 'neuf', '4-021', 2, null, $pt$Produire des formules et tester leur vraisemblance : aires de formes géométriques simples (aire d'un triangle de base b et de hauteur h).$pt$),
--   ('4-029', '4', 'origine', null, 1, $pt$Connaitre le volume de la pyramide et du cône de révolution.$pt$, $pt$Connaître le volume d'une pyramide (V = B × h / 3).$pt$),
--   ('4-076', '4', 'neuf', '4-029', 2, null, $pt$Connaître le volume d'un cône de révolution (V = π r² h / 3).$pt$),
--   ('4-040', '4', 'origine', null, 1, $pt$Déterminer une médiane et l'interpréter dans le cas d'une série de petit effectif présentée sous forme de données brutes.$pt$, $pt$Déterminer la médiane d'une série de petit effectif présentée sous forme de données brutes (3, 7, 8, 12, 15 → ?).$pt$),
--   ('4-077', '4', 'neuf', '4-040', 2, null, $pt$Interpréter la médiane d'une série de petit effectif (que dire des valeurs si la médiane vaut 8 ?).$pt$),
--   ('4-041', '4', 'origine', null, 1, $pt$Calculer et interpréter l'étendue d'une série présentée sous forme de données brutes, d'un tableau, d'un diagramme en barres, d'un diagramme circulaire.$pt$, $pt$Calculer l'étendue d'une série présentée sous forme de données brutes, d'un tableau ou d'un diagramme.$pt$),
--   ('4-078', '4', 'neuf', '4-041', 2, null, $pt$Interpréter l'étendue d'une série (laquelle des deux classes a les notes les plus dispersées ?).$pt$),
--   ('4-048', '4', 'origine', null, 1, $pt$Calculer la probabilité d'un évènement et de l'évènement contraire.$pt$, $pt$Calculer la probabilité d'un évènement.$pt$),
--   ('4-079', '4', 'neuf', '4-048', 2, null, $pt$Calculer la probabilité de l'évènement contraire (P(non A) = 1 − P(A)).$pt$),
--   ('4-057', '4', 'origine', null, 1, $pt$Rendre compte d'une augmentation ou une diminution exprimée en pourcentages au moyen d'un coefficient multiplicateur$pt$, $pt$Traduire une augmentation de t % par un coefficient multiplicateur (+ 20 % → × 1,2).$pt$),
--   ('4-080', '4', 'neuf', '4-057', 2, null, $pt$Traduire une diminution de t % par un coefficient multiplicateur (− 20 % → × 0,8).$pt$),
--   ('4-060', '4', 'origine', null, 1, $pt$Savoir appliquer un programme de calcul à deux (plusieurs) étapes à un nombre simple puis à une variable.$pt$, $pt$Appliquer un programme de calcul à plusieurs étapes à un nombre donné.$pt$),
--   ('4-081', '4', 'neuf', '4-060', 2, null, $pt$Appliquer un programme de calcul à plusieurs étapes à une variable (écrire l'expression obtenue en fonction de x).$pt$),
--   ('3-014', '3', 'origine', null, 1, $pt$Résoudre analytiquement et graphiquement une inéquation du premier degré du type ax ⩾ b.$pt$, $pt$Résoudre par le calcul une inéquation du premier degré du type ax ⩾ b (3x ⩾ 12).$pt$),
--   ('3-057', '3', 'neuf', '3-014', 2, null, $pt$Résoudre graphiquement une inéquation du premier degré du type ax ⩾ b.$pt$),
--   ('3-016', '3', 'origine', null, 1, $pt$Manipuler les trois identités remarquables pour développer et factoriser : a² + 2ab + b² = (a + b)² ; a² − 2ab + b² = (a − b)² ; a² − b² = (a − b)(a + b).$pt$, $pt$Développer avec les identités remarquables ((x + 3)² = ?).$pt$),
--   ('3-058', '3', 'neuf', '3-016', 2, null, $pt$Factoriser avec les identités remarquables (x² − 9 = ?).$pt$),
--   ('3-022', '3', 'origine', null, 1, $pt$Connaitre et appliquer le théorème de Thalès (configurations des triangles emboités et configuration dite du papillon).$pt$, $pt$Reconnaître une configuration où le théorème de Thalès s'applique : triangles emboîtés ou papillon, avec (BC) // (MN) (quelle configuration ? quels triangles ?).$pt$),
--   ('3-059', '3', 'neuf', '3-022', 2, null, $pt$Écrire l'égalité des rapports du théorème de Thalès dans une configuration donnée (AM/AB = … = …).$pt$),
--   ('3-060', '3', 'neuf', '3-022', 3, null, $pt$Appliquer le théorème de Thalès pour calculer une longueur (AM = 3, AB = 5, BC = 7 : calcule MN).$pt$),
--   ('3-023', '3', 'origine', null, 1, $pt$Connaitre et utiliser les lignes trigonométriques dans le triangle rectangle : cosinus, sinus, tangente.$pt$, $pt$Connaître les lignes trigonométriques dans le triangle rectangle : écrire cosinus, sinus et tangente d'un angle (cos(B) = … / …).$pt$),
--   ('3-061', '3', 'neuf', '3-023', 2, null, $pt$Utiliser les lignes trigonométriques pour calculer une longueur ou un angle dans un triangle rectangle (BC = 6, angle B = 40° : calcule AB).$pt$),
--   ('3-030', '3', 'origine', null, 1, $pt$Construire et utiliser des boites à moustache pour représenter les valeurs de position d'une série statistique.$pt$, $pt$Construire la boîte à moustaches d'une série statistique.$pt$),
--   ('3-062', '3', 'neuf', '3-030', 2, null, $pt$Lire une boîte à moustaches (médiane, quartiles, étendue).$pt$),
--   ('3-036', '3', 'origine', null, 1, $pt$Traduire une augmentation ou une diminution en pourcentages.$pt$, $pt$Traduire une augmentation en pourcentage.$pt$),
--   ('3-063', '3', 'neuf', '3-036', 2, null, $pt$Traduire une diminution en pourcentage.$pt$),
--   ('3-041', '3', 'origine', null, 1, $pt$Définir et utiliser les fonctions linéaires.$pt$, $pt$Reconnaître une fonction linéaire (expression ou droite passant par l'origine).$pt$),
--   ('3-064', '3', 'neuf', '3-041', 2, null, $pt$Utiliser une fonction linéaire donnée par son expression (calculer une image : f(3) = ?).$pt$),
--   ('3-042', '3', 'origine', null, 1, $pt$Résoudre graphiquement des équations et des inéquations linéaires.$pt$, $pt$Résoudre graphiquement une équation linéaire (f(x) = 6).$pt$),
--   ('3-065', '3', 'neuf', '3-042', 2, null, $pt$Résoudre graphiquement une inéquation linéaire (f(x) ⩽ 6).$pt$),
--   ('3-044', '3', 'origine', null, 1, $pt$Définir et utiliser les fonctions affines.$pt$, $pt$Reconnaître une fonction affine (expression ou droite).$pt$),
--   ('3-066', '3', 'neuf', '3-044', 2, null, $pt$Utiliser une fonction affine donnée par son expression (calculer une image : f(3) = ?).$pt$),
--   ('3-045', '3', 'origine', null, 1, $pt$Déterminer graphiquement les coefficients d'une fonction affine.$pt$, $pt$Lire graphiquement l'ordonnée à l'origine d'une fonction affine.$pt$),
--   ('3-067', '3', 'neuf', '3-045', 2, null, $pt$Lire graphiquement le coefficient directeur d'une fonction affine.$pt$),
--   ('3-002', '3', 'archive', null, null, $pt$Rendre irréductible une fraction.$pt$, $pt$Rendre irréductible une fraction.$pt$),
--   ('3-038', '3', 'archive', null, null, $pt$Connaitre et utiliser les fonctions linéaires.$pt$, $pt$Connaitre et utiliser les fonctions linéaires.$pt$);
-- -- DONNÉES:POINTS:END
-- create temporary table _rb_auto (
-- 	code text primary key, grade text not null, seq integer not null, ancre text not null,
-- 	nom text not null, kind text not null, exigence text not null, regime text not null,
-- 	rubrique text, chemin text not null
-- ) on commit drop;
-- insert into _rb_auto (code, grade, seq, ancre, nom, kind, exigence, regime, rubrique, chemin) values
-- -- DONNÉES:AUTOS:BEGIN
--   ('6-211', '6', 1, '6-189', $pt$Repérer des relations multiplicatives simples entre des nombres : le tiers (12 est le tiers de 36).$pt$, 'savoir_faire', 'attendu', 'fluence', $pt$La proportionnalité > Automatismes$pt$, $pt$Nombres et calculs > Entiers : multiplication > triple et tiers$pt$),
--   ('5-144', '5', 2, '5-048', $pt$Reconnaître un cube, un pavé représenté en perspective cavalière.$pt$, 'savoir_faire', 'attendu', 'fluence', $pt$Espace et géométrie > Représentation de l'espace > Automatismes$pt$, $pt$Géométrie > Solides > perspective cavalière$pt$),
--   ('4-082', '4', 3, '4-001', $pt$Somme des opposés : savoir que la somme de deux nombres opposés est nulle (−7,5 + 7,5 = 0).$pt$, 'connaissance', 'attendu', 'fluence', $pt$Nombres et calculs > Opérations sur les nombres relatifs > Automatismes$pt$, $pt$Nombres et calculs > Relatifs : calculs > sommes$pt$),
--   ('3-068', '3', 4, '3-036', $pt$Appliquer, dans des cas simples, une augmentation exprimée en pourcentage sans utiliser le coefficient multiplicateur (120 € augmenté de 20 % : 120 + 24 = 144 €).$pt$, 'savoir_faire', 'attendu', 'fluence', $pt$Proportionnalité, fonctions > Proportionnalité > Automatismes$pt$, $pt$Proportionnalité > Évolutions > variations en pourcentage$pt$),
--   ('3-069', '3', 5, '3-036', $pt$Appliquer, dans des cas simples, une diminution exprimée en pourcentage sans utiliser le coefficient multiplicateur (120 € diminué de 20 % : 120 − 24 = 96 €).$pt$, 'savoir_faire', 'attendu', 'fluence', $pt$Proportionnalité, fonctions > Proportionnalité > Automatismes$pt$, $pt$Proportionnalité > Évolutions > variations en pourcentage$pt$),
--   ('2-401', '2', 6, '2-235', $pt$Calculer le périmètre d'un polygone.$pt$, 'savoir_faire', 'attendu', 'fluence', $pt$Automatismes > Géométrie$pt$, $pt$Grandeurs et mesures > Périmètres$pt$),
--   ('2-402', '2', 7, '2-235', $pt$Interpréter les quartiles d'une série statistique (Q1 = 12 : au moins un quart des valeurs sont inférieures ou égales à 12).$pt$, 'savoir_faire', 'attendu', 'fluence', $pt$Automatismes > Statistiques$pt$, $pt$Statistiques > Indicateurs > quartiles$pt$);
-- -- DONNÉES:AUTOS:END
-- create temporary table _rb_ref (
-- 	code text not null, grade text not null, avant boolean not null, apres boolean not null,
-- 	primary key (code, grade)
-- ) on commit drop;
-- insert into _rb_ref (code, grade, avant, apres) values
-- -- DONNÉES:REFS:BEGIN
--   ('2-280', '1_GEN', false, true),
--   ('2-280', '1_SPE', false, true),
--   ('2-280', '1_TECHNO', false, true),
--   ('2-280', '2', false, true),
--   ('2-280', 'T_COMP', false, true),
--   ('2-280', 'T_SPE', false, true),
--   ('2-280', 'T_TECHNO', true, true),
--   ('2-382', '1_GEN', true, true),
--   ('2-382', '1_SPE', true, true),
--   ('2-382', '1_TECHNO', true, true),
--   ('2-382', '2', false, true),
--   ('2-382', 'T_COMP', true, true),
--   ('2-382', 'T_SPE', true, true),
--   ('2-401', '1_GEN', false, true),
--   ('2-401', '1_SPE', false, true),
--   ('2-401', '1_TECHNO', false, true),
--   ('2-401', '2', false, true),
--   ('2-401', 'T_COMP', false, true),
--   ('2-401', 'T_SPE', false, true),
--   ('2-402', '1_GEN', false, true),
--   ('2-402', '1_SPE', false, true),
--   ('2-402', '1_TECHNO', false, true),
--   ('2-402', '2', false, true),
--   ('2-402', 'T_COMP', false, true),
--   ('2-402', 'T_SPE', false, true),
--   ('3-014', '1_GEN', true, true),
--   ('3-014', '1_SPE', true, true),
--   ('3-014', '1_TECHNO', true, true),
--   ('3-014', '2', true, true),
--   ('3-014', 'T_COMP', true, true),
--   ('3-014', 'T_SPE', true, true),
--   ('3-016', '1_GEN', true, true),
--   ('3-016', '1_SPE', true, true),
--   ('3-016', '1_TECHNO', true, true),
--   ('3-016', '2', true, true),
--   ('3-016', 'T_COMP', true, true),
--   ('3-016', 'T_SPE', true, true),
--   ('3-016', 'T_TECHNO', true, true),
--   ('3-022', '1_GEN', true, false),
--   ('3-022', '1_SPE', true, false),
--   ('3-022', '1_TECHNO', true, false),
--   ('3-022', '2', true, false),
--   ('3-022', 'T_COMP', true, false),
--   ('3-022', 'T_SPE', true, false),
--   ('3-023', '1_GEN', true, true),
--   ('3-023', '1_SPE', true, true),
--   ('3-023', '1_TECHNO', true, true),
--   ('3-023', '2', true, true),
--   ('3-023', 'T_COMP', true, true),
--   ('3-023', 'T_SPE', true, true),
--   ('3-030', '1_GEN', true, false),
--   ('3-030', '1_SPE', true, false),
--   ('3-030', '1_TECHNO', true, false),
--   ('3-030', '2', true, false),
--   ('3-030', 'T_COMP', true, false),
--   ('3-030', 'T_SPE', true, false),
--   ('3-030', 'T_TECHNO', true, false),
--   ('3-041', '1_GEN', true, true),
--   ('3-041', '1_SPE', true, true),
--   ('3-041', '1_TECHNO', true, true),
--   ('3-041', '2', true, true),
--   ('3-041', 'T_COMP', true, true),
--   ('3-041', 'T_SPE', true, true),
--   ('3-044', '1_GEN', true, true),
--   ('3-044', '1_SPE', true, true),
--   ('3-044', '1_TECHNO', true, true),
--   ('3-044', '2', true, true),
--   ('3-044', 'T_COMP', true, true),
--   ('3-044', 'T_SPE', true, true),
--   ('3-058', '1_GEN', false, true),
--   ('3-058', '1_SPE', false, true),
--   ('3-058', '1_TECHNO', false, true),
--   ('3-058', '2', false, true),
--   ('3-058', 'T_COMP', false, true),
--   ('3-058', 'T_SPE', false, true),
--   ('3-058', 'T_TECHNO', false, true),
--   ('3-060', '1_GEN', false, true),
--   ('3-060', '1_SPE', false, true),
--   ('3-060', '1_TECHNO', false, true),
--   ('3-060', '2', false, true),
--   ('3-060', 'T_COMP', false, true),
--   ('3-060', 'T_SPE', false, true),
--   ('3-061', '1_GEN', false, true),
--   ('3-061', '1_SPE', false, true),
--   ('3-061', '1_TECHNO', false, true),
--   ('3-061', '2', false, true),
--   ('3-061', 'T_COMP', false, true),
--   ('3-061', 'T_SPE', false, true),
--   ('3-062', '1_GEN', false, true),
--   ('3-062', '1_SPE', false, true),
--   ('3-062', '1_TECHNO', false, true),
--   ('3-062', '2', false, true),
--   ('3-062', 'T_COMP', false, true),
--   ('3-062', 'T_SPE', false, true),
--   ('3-062', 'T_TECHNO', false, true),
--   ('4-021', '3', true, true),
--   ('4-029', '1_GEN', true, true),
--   ('4-029', '1_SPE', true, true),
--   ('4-029', '1_TECHNO', true, true),
--   ('4-029', '2', true, true),
--   ('4-029', '3', true, true),
--   ('4-029', 'T_COMP', true, true),
--   ('4-029', 'T_SPE', true, true),
--   ('4-040', '1_GEN', true, true),
--   ('4-040', '1_SPE', true, true),
--   ('4-040', '1_TECHNO', true, true),
--   ('4-040', '2', true, true),
--   ('4-040', '3', true, true),
--   ('4-040', 'T_COMP', true, true),
--   ('4-040', 'T_SPE', true, true),
--   ('4-041', '3', true, true),
--   ('4-048', '1_GEN', true, true),
--   ('4-048', '1_SPE', true, true),
--   ('4-048', '1_TECHNO', true, true),
--   ('4-048', '2', true, true),
--   ('4-048', 'T_COMP', true, true),
--   ('4-048', 'T_SPE', true, true),
--   ('4-057', '1_GEN', true, true),
--   ('4-057', '1_SPE', true, true),
--   ('4-057', '1_TECHNO', true, true),
--   ('4-057', '2', true, true),
--   ('4-057', '3', true, true),
--   ('4-057', 'T_COMP', true, true),
--   ('4-057', 'T_SPE', true, true),
--   ('4-057', 'T_TECHNO', true, true),
--   ('4-076', '1_GEN', false, true),
--   ('4-076', '1_SPE', false, true),
--   ('4-076', '1_TECHNO', false, true),
--   ('4-076', '2', false, true),
--   ('4-076', '3', false, true),
--   ('4-076', 'T_COMP', false, true),
--   ('4-076', 'T_SPE', false, true),
--   ('4-077', '1_GEN', false, true),
--   ('4-077', '1_SPE', false, true),
--   ('4-077', '1_TECHNO', false, true),
--   ('4-077', '2', false, true),
--   ('4-077', 'T_COMP', false, true),
--   ('4-077', 'T_SPE', false, true),
--   ('4-079', '1_GEN', false, true),
--   ('4-079', '1_SPE', false, true),
--   ('4-079', '1_TECHNO', false, true),
--   ('4-079', '2', false, true),
--   ('4-079', 'T_COMP', false, true),
--   ('4-079', 'T_SPE', false, true),
--   ('4-080', '1_GEN', false, true),
--   ('4-080', '1_SPE', false, true),
--   ('4-080', '1_TECHNO', false, true),
--   ('4-080', '2', false, true),
--   ('4-080', '3', false, true),
--   ('4-080', 'T_COMP', false, true),
--   ('4-080', 'T_SPE', false, true),
--   ('4-080', 'T_TECHNO', false, true),
--   ('5-010', '3', true, true),
--   ('5-013', '4', true, true),
--   ('5-016', '1_GEN', true, true),
--   ('5-016', '1_SPE', true, true),
--   ('5-016', '1_TECHNO', true, true),
--   ('5-016', '2', true, true),
--   ('5-016', '3', true, true),
--   ('5-016', '4', true, true),
--   ('5-016', 'T_COMP', true, true),
--   ('5-016', 'T_SPE', true, true),
--   ('5-025', '1_GEN', true, true),
--   ('5-025', '1_SPE', true, true),
--   ('5-025', '1_TECHNO', true, true),
--   ('5-025', '2', true, true),
--   ('5-025', '3', false, true),
--   ('5-025', '4', true, true),
--   ('5-025', 'T_COMP', true, true),
--   ('5-025', 'T_SPE', true, true),
--   ('5-025', 'T_TECHNO', true, true),
--   ('5-026', '3', true, true),
--   ('5-026', '4', true, true),
--   ('5-034', '4', false, true),
--   ('5-045', '3', true, true),
--   ('5-045', '4', true, true),
--   ('5-047', '1_GEN', true, true),
--   ('5-047', '1_SPE', true, true),
--   ('5-047', '1_TECHNO', true, true),
--   ('5-047', '2', true, true),
--   ('5-047', '3', true, true),
--   ('5-047', '4', true, true),
--   ('5-047', 'T_COMP', true, true),
--   ('5-047', 'T_SPE', true, true),
--   ('5-051', '1_GEN', true, true),
--   ('5-051', '1_SPE', true, true),
--   ('5-051', '1_TECHNO', true, true),
--   ('5-051', '2', true, true),
--   ('5-051', 'T_COMP', true, true),
--   ('5-051', 'T_SPE', true, true),
--   ('5-051', 'T_TECHNO', true, true),
--   ('5-060', '4', false, true),
--   ('5-062', '4', true, true),
--   ('5-064', '4', true, true),
--   ('5-066', '4', false, true),
--   ('5-067', '4', false, true),
--   ('5-070', '4', true, true),
--   ('5-076', '4', true, true),
--   ('5-077', '1_GEN', true, true),
--   ('5-077', '1_SPE', true, true),
--   ('5-077', '1_TECHNO', true, true),
--   ('5-077', '2', true, true),
--   ('5-077', 'T_COMP', true, true),
--   ('5-077', 'T_SPE', true, true),
--   ('5-077', 'T_TECHNO', true, true),
--   ('5-080', '3', true, true),
--   ('5-080', '4', true, true),
--   ('5-096', '1_GEN', true, true),
--   ('5-096', '1_SPE', true, true),
--   ('5-096', '1_TECHNO', true, true),
--   ('5-096', '2', true, true),
--   ('5-096', 'T_COMP', true, true),
--   ('5-096', 'T_SPE', true, true),
--   ('5-096', 'T_TECHNO', true, true),
--   ('5-110', '1_GEN', true, true),
--   ('5-110', '1_SPE', true, true),
--   ('5-110', '1_TECHNO', true, true),
--   ('5-110', '2', true, true),
--   ('5-110', 'T_COMP', true, true),
--   ('5-110', 'T_SPE', true, true),
--   ('5-110', 'T_TECHNO', true, true),
--   ('5-111', '1_GEN', true, true),
--   ('5-111', '1_SPE', true, true),
--   ('5-111', '1_TECHNO', true, true),
--   ('5-111', '2', true, true),
--   ('5-111', 'T_COMP', true, true),
--   ('5-111', 'T_SPE', true, true),
--   ('5-111', 'T_TECHNO', true, true),
--   ('5-112', '1_GEN', false, true),
--   ('5-112', '1_SPE', false, true),
--   ('5-112', '1_TECHNO', false, true),
--   ('5-112', 'T_COMP', false, true),
--   ('5-112', 'T_SPE', false, true),
--   ('5-112', 'T_TECHNO', false, true),
--   ('5-113', '1_GEN', false, true),
--   ('5-113', '1_SPE', false, true),
--   ('5-113', '1_TECHNO', false, true),
--   ('5-113', 'T_COMP', false, true),
--   ('5-113', 'T_SPE', false, true),
--   ('5-113', 'T_TECHNO', false, true),
--   ('5-114', '1_GEN', false, true),
--   ('5-114', '1_SPE', false, true),
--   ('5-114', '1_TECHNO', false, true),
--   ('5-114', 'T_COMP', false, true),
--   ('5-114', 'T_SPE', false, true),
--   ('5-114', 'T_TECHNO', false, true),
--   ('5-119', '3', false, true),
--   ('5-121', '1_GEN', false, true),
--   ('5-121', '1_SPE', false, true),
--   ('5-121', '1_TECHNO', false, true),
--   ('5-121', '2', false, true),
--   ('5-121', '3', false, true),
--   ('5-121', '4', false, true),
--   ('5-121', 'T_COMP', false, true),
--   ('5-121', 'T_SPE', false, true),
--   ('5-123', '3', false, true),
--   ('5-123', '4', false, true),
--   ('5-126', '3', false, true),
--   ('5-126', '4', false, true),
--   ('5-128', '1_GEN', false, true),
--   ('5-128', '1_SPE', false, true),
--   ('5-128', '1_TECHNO', false, true),
--   ('5-128', '2', false, true),
--   ('5-128', '3', false, true),
--   ('5-128', '4', false, true),
--   ('5-128', 'T_COMP', false, true),
--   ('5-128', 'T_SPE', false, true),
--   ('5-129', '1_GEN', false, true),
--   ('5-129', '1_SPE', false, true),
--   ('5-129', '1_TECHNO', false, true),
--   ('5-129', '2', false, true),
--   ('5-129', 'T_COMP', false, true),
--   ('5-129', 'T_SPE', false, true),
--   ('5-129', 'T_TECHNO', false, true),
--   ('5-134', '4', false, true),
--   ('5-135', '1_GEN', false, true),
--   ('5-135', '1_SPE', false, true),
--   ('5-135', '1_TECHNO', false, true),
--   ('5-135', '2', false, true),
--   ('5-135', 'T_COMP', false, true),
--   ('5-135', 'T_SPE', false, true),
--   ('5-137', '1_GEN', false, true),
--   ('5-137', '1_SPE', false, true),
--   ('5-137', '1_TECHNO', false, true),
--   ('5-137', '2', false, true),
--   ('5-137', 'T_COMP', false, true),
--   ('5-137', 'T_SPE', false, true),
--   ('5-138', '1_GEN', false, true),
--   ('5-138', '1_SPE', false, true),
--   ('5-138', '1_TECHNO', false, true),
--   ('5-138', '2', false, true),
--   ('5-138', 'T_COMP', false, true),
--   ('5-138', 'T_SPE', false, true),
--   ('5-139', '1_GEN', false, true),
--   ('5-139', '1_SPE', false, true),
--   ('5-139', '1_TECHNO', false, true),
--   ('5-139', '2', false, true),
--   ('5-139', 'T_COMP', false, true),
--   ('5-139', 'T_SPE', false, true),
--   ('5-143', '1_GEN', false, true),
--   ('5-143', '1_SPE', false, true),
--   ('5-143', '1_TECHNO', false, true),
--   ('5-143', '2', false, true),
--   ('5-143', 'T_COMP', false, true),
--   ('5-143', 'T_SPE', false, true),
--   ('6-133', '5', true, true),
--   ('6-135', '5', true, true),
--   ('6-178', '5', true, true),
--   ('6-181', '5', true, true),
--   ('6-205', '5', false, true),
--   ('6-208', '5', false, true),
--   ('6-209', '5', false, true),
--   ('CE2-020', '5', true, false),
--   ('CE2-022', '4', true, true),
--   ('CE2-022', '6', true, true),
--   ('CE2-084', '5', false, true),
--   ('CE2-092', '4', false, true),
--   ('CE2-092', '6', false, true),
--   ('CM1-045', '6', false, true),
--   ('CM2-008', '6', true, true),
--   ('CM2-013', '6', true, false),
--   ('CM2-018', '6', false, true),
--   ('CM2-030', '6', true, true),
--   ('CM2-036', '4', true, true),
--   ('CM2-036', '5', true, true),
--   ('CM2-036', '6', false, true),
--   ('CM2-050', '6', false, true),
--   ('CM2-107', '6', true, true),
--   ('CM2-123', '6', true, true),
--   ('CM2-124', '6', true, true),
--   ('CM2-125', '6', true, true),
--   ('CM2-130', '6', false, true),
--   ('CM2-132', '6', false, true),
--   ('CM2-141', '6', false, true),
--   ('CM2-149', '4', false, true),
--   ('CM2-149', '5', false, true),
--   ('CM2-149', '6', false, true);
-- -- DONNÉES:REFS:END
-- create temporary table _rb_grade (
-- 	grade text primary key, n_avant integer not null, n_apres integer not null, trou_avant integer
-- ) on commit drop;
-- insert into _rb_grade (grade, n_avant, n_apres, trou_avant) values
-- -- DONNÉES:GRADES:BEGIN
--   ('CP', 72, 84, null),
--   ('CE1', 89, 107, null),
--   ('CE2', 83, 97, null),
--   ('CM1', 138, 171, null),
--   ('CM2', 124, 158, null),
--   ('6', 101, 111, null),
--   ('5', 114, 143, null),
--   ('4', 72, 82, null),
--   ('3', 55, 68, null),
--   ('2', 199, 201, 132);
-- -- DONNÉES:GRADES:END
-- -- Verrou des points neufs (FOR UPDATE bloque l'insertion d'un usage, qui prend FOR KEY SHARE)
-- -- jusqu'à la fin de la transaction : aucun usage ne peut s'accrocher entre la garde et le DELETE.
-- select count(*) from (select 1 from public.curriculum_points
--  where code in (select code from _rb_point where role = 'neuf' union all select code from _rb_auto)
--  for update) verrou;
-- do $rb_garde$
-- declare
-- 	v_detail text;
-- begin
-- 	select string_agg(x.code, ', ' order by x.code) into v_detail
-- 	  from (select code, nom from _rb_point where role <> 'archive'
-- 	        union all select code, nom from _rb_auto) x
-- 	 where not exists (select 1 from public.curriculum_points p
-- 	                    where p.code = x.code and p.name = x.nom and p.archived_at is null);
-- 	if v_detail is not null then
-- 		raise exception 'rollback : points de la scission absents ou modifiés : %', v_detail;
-- 	end if;
-- 	select string_agg(x.code, ', ' order by x.code) into v_detail
-- 	  from _rb_point x
-- 	 where x.role = 'archive'
-- 	   and not exists (select 1 from public.curriculum_points p
-- 	                    where p.code = x.code and p.name = x.nom and p.archived_at is not null);
-- 	if v_detail is not null then
-- 		raise exception 'rollback : points archivés absents ou désarchivés : %', v_detail;
-- 	end if;
-- 	select string_agg(distinct p.code, ', ') into v_detail
-- 	  from public.curriculum_points p
-- 	 where p.code in (select code from _rb_point where role = 'neuf' union all select code from _rb_auto)
-- 	   and (exists (select 1 from public.question_template_points u where u.point_id = p.id)
-- 	     or exists (select 1 from public.exercise_curriculum_points u where u.point_id = p.id)
-- 	     or exists (select 1 from public.student_point_state u where u.point_id = p.id)
-- 	     or exists (select 1 from public.journal_entry_points u where u.point_id = p.id)
-- 	     or exists (select 1 from public.srs_anti_fraud_flags u where u.capacity_point_id = p.id)
-- 	     or exists (select 1 from public.curriculum_point_automatismes u where u.point_id = p.id
-- 	                 and not exists (select 1 from _rb_ref r
-- 	                                  where r.code = p.code and r.grade = u.grade and r.apres)));
-- 	if v_detail is not null then
-- 		raise exception 'rollback : usages accrochés aux points neufs : % (supprimer ces points les effacerait : arrêt, décision de David)', v_detail;
-- 	end if;
-- end $rb_garde$;
-- delete from public.curriculum_point_automatismes a
--  using public.curriculum_points p, _rb_ref r
--  where p.id = a.point_id and r.code = p.code and r.grade = a.grade and r.apres and not r.avant;
-- insert into public.curriculum_point_automatismes (point_id, grade)
-- select p.id, r.grade from _rb_ref r join public.curriculum_points p on p.code = r.code
--  where r.avant and not r.apres
-- on conflict (point_id, grade) do nothing;
-- delete from public.curriculum_points
--  where code in (select code from _rb_point where role = 'neuf' union all select code from _rb_auto);
-- update public.curriculum_points p set name = x.ancien_nom
--   from _rb_point x where x.role = 'origine' and p.code = x.code and p.name is distinct from x.ancien_nom;
-- update public.curriculum_points p set archived_at = null
--   from _rb_point x where x.role = 'archive' and p.code = x.code;
-- update public.curriculum_points p set display_order = r.o
--   from (select id, row_number() over (partition by grade order by display_order, code) as o
--           from public.curriculum_points where grade in (select grade from _rb_grade)) r
--  where p.id = r.id and p.display_order <> r.o;
-- update public.curriculum_points p set display_order = p.display_order + 1
--   from _rb_grade g
--  where p.grade = g.grade and g.trou_avant is not null and p.display_order >= g.trou_avant;
-- do $rb_check$
-- declare
-- 	v_detail text;
-- begin
-- 	select string_agg(g.grade, ', ' order by g.grade) into v_detail
-- 	  from _rb_grade g
-- 	 where (select count(*) from public.curriculum_points p where p.grade = g.grade) <> g.n_avant
-- 	    or (select count(distinct display_order) from public.curriculum_points p where p.grade = g.grade) <> g.n_avant
-- 	    or (select max(display_order) from public.curriculum_points p where p.grade = g.grade)
-- 	       <> g.n_avant + case when g.trou_avant is null then 0 else 1 end;
-- 	if v_detail is not null then raise exception 'rollback : effectifs ou ordres incohérents : %', v_detail; end if;
-- 	select string_agg(x.code, ', ' order by x.code) into v_detail
-- 	  from _rb_point x
-- 	 where x.role <> 'neuf' and not exists (select 1 from public.curriculum_points p
-- 	                    where p.code = x.code and p.name = x.ancien_nom and p.archived_at is null);
-- 	if v_detail is not null then raise exception 'rollback : origines non restaurées : %', v_detail; end if;
-- 	select string_agg(d.r, ', ' order by d.r) into v_detail from (
-- 		(select p.code || '§' || a.grade as r from public.curriculum_point_automatismes a
-- 		   join public.curriculum_points p on p.id = a.point_id
-- 		  where p.code in (select code from _rb_ref)
-- 		 except select code || '§' || grade from _rb_ref where avant)
-- 		union all
-- 		(select code || '§' || grade from _rb_ref where avant
-- 		 except select p.code || '§' || a.grade from public.curriculum_point_automatismes a
-- 		   join public.curriculum_points p on p.id = a.point_id)) d;
-- 	if v_detail is not null then raise exception 'rollback : références d''automatismes non restaurées : %', v_detail; end if;
-- end $rb_check$;
-- drop table _rb_point, _rb_auto, _rb_ref, _rb_grade;
-- ROLLBACK:END
-- ============================================================================

-- Une écriture concurrente fait échouer proprement la migration au lieu d'attendre.
set local lock_timeout = '5s';

-- ---- 1. Les données de la décision (générées) ----------------------------------
-- Un point en jeu : 'origine' (garde son code, rang 1), 'neuf' (moitié de rang ≥ 2 d'une
-- origine), 'archive' (archivé, libellé inchangé).
drop table if exists pg_temp._sc_point;
create temporary table _sc_point (
	code text primary key, grade text not null, role text not null, origine text,
	rang integer, ancien_nom text, nom text not null
);
insert into _sc_point (code, grade, role, origine, rang, ancien_nom, nom) values
-- DONNÉES:POINTS:BEGIN
  ('CP-003', 'CP', 'origine', null, 1, $pt$Connaitre la suite écrite et la suite orale des nombres jusqu'à cent.$pt$, $pt$Connaître la suite écrite des nombres jusqu'à cent (écris le nombre qui suit 99).$pt$),
  ('CP-074', 'CP', 'neuf', 'CP-003', 2, null, $pt$Connaître la suite orale des nombres jusqu'à cent (récite la suite de 90 à 100, en classe).$pt$),
  ('CP-006', 'CP', 'origine', null, 1, $pt$Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles =, < et >.$pt$, $pt$Comparer deux nombres entiers avec les symboles =, < et > (47 … 52).$pt$),
  ('CP-075', 'CP', 'neuf', 'CP-006', 2, null, $pt$Encadrer un nombre entier avec les symboles < et > (… < 47 < …).$pt$),
  ('CP-076', 'CP', 'neuf', 'CP-006', 3, null, $pt$Intercaler un nombre entier entre deux nombres donnés (47 < … < 52).$pt$),
  ('CP-014', 'CP', 'origine', null, 1, $pt$Comprendre le sens de l'addition et de la soustraction.$pt$, $pt$Comprendre le sens de l'addition (choisir l'addition pour une situation de réunion, d'ajout).$pt$),
  ('CP-077', 'CP', 'neuf', 'CP-014', 2, null, $pt$Comprendre le sens de la soustraction (choisir la soustraction pour une situation de retrait, d'écart).$pt$),
  ('CP-015', 'CP', 'origine', null, 1, $pt$Comprendre et utiliser les symboles « + », « - » et « = ».$pt$, $pt$Comprendre et utiliser le symbole « + » (5 + 3 : que veut dire ce signe ?).$pt$),
  ('CP-078', 'CP', 'neuf', 'CP-015', 2, null, $pt$Comprendre et utiliser le symbole « − » (8 − 3 : que veut dire ce signe ?).$pt$),
  ('CP-079', 'CP', 'neuf', 'CP-015', 3, null, $pt$Comprendre et utiliser le symbole « = » (complète : 5 + 3 … 8).$pt$),
  ('CP-018', 'CP', 'origine', null, 1, $pt$Connaitre dans les deux sens les tables d'addition.$pt$, $pt$Connaître les tables d'addition : donner la somme de deux nombres (3 + 4 = ?).$pt$),
  ('CP-073', 'CP', 'neuf', 'CP-018', 2, null, $pt$Connaître les tables d'addition dans l'autre sens : trouver le terme manquant d'une addition (3 + ? = 7).$pt$),
  ('CP-019', 'CP', 'origine', null, 1, $pt$Connaitre les doubles et les moitiés de nombres usuels.$pt$, $pt$Connaître les doubles de nombres usuels (double de 8 = ?).$pt$),
  ('CP-080', 'CP', 'neuf', 'CP-019', 2, null, $pt$Connaître les moitiés de nombres usuels (moitié de 16 = ?).$pt$),
  ('CP-020', 'CP', 'origine', null, 1, $pt$Ajouter ou soustraire 1 ou 2 à un nombre.$pt$, $pt$Ajouter 1 ou 2 à un nombre (37 + 2 = ?).$pt$),
  ('CP-081', 'CP', 'neuf', 'CP-020', 2, null, $pt$Soustraire 1 ou 2 à un nombre (37 − 2 = ?).$pt$),
  ('CP-021', 'CP', 'origine', null, 1, $pt$Ajouter ou soustraire 10 à un nombre.$pt$, $pt$Ajouter 10 à un nombre (34 + 10 = ?).$pt$),
  ('CP-082', 'CP', 'neuf', 'CP-021', 2, null, $pt$Soustraire 10 à un nombre (34 − 10 = ?).$pt$),
  ('CP-022', 'CP', 'origine', null, 1, $pt$Ajouter ou soustraire 20, 30, 40, 50, 60, 70, 80 ou 90 à un nombre.$pt$, $pt$Ajouter 20, 30, …, 90 à un nombre (14 + 30 = ?).$pt$),
  ('CP-083', 'CP', 'neuf', 'CP-022', 2, null, $pt$Soustraire 20, 30, …, 90 à un nombre (74 − 30 = ?).$pt$),
  ('CP-069', 'CP', 'origine', null, 1, $pt$Construire et compléter un tableau à double entrée.$pt$, $pt$Compléter un tableau à double entrée.$pt$),
  ('CP-084', 'CP', 'neuf', 'CP-069', 2, null, $pt$Construire un tableau à double entrée.$pt$),
  ('CE1-004', 'CE1', 'origine', null, 1, $pt$Connaitre la suite écrite et la suite orale des nombres jusqu'à mille.$pt$, $pt$Connaître la suite écrite des nombres jusqu'à mille (écris le nombre qui suit 999).$pt$),
  ('CE1-092', 'CE1', 'neuf', 'CE1-004', 2, null, $pt$Connaître la suite orale des nombres jusqu'à mille (récite la suite de 990 à 1 000, en classe).$pt$),
  ('CE1-007', 'CE1', 'origine', null, 1, $pt$Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles (=, <, >).$pt$, $pt$Comparer deux nombres entiers avec les symboles =, < et > (239 … 243).$pt$),
  ('CE1-093', 'CE1', 'neuf', 'CE1-007', 2, null, $pt$Encadrer un nombre entier avec les symboles < et > (… < 239 < …).$pt$),
  ('CE1-094', 'CE1', 'neuf', 'CE1-007', 3, null, $pt$Intercaler un nombre entier entre deux nombres donnés (391 < … < 396).$pt$),
  ('CE1-016', 'CE1', 'origine', null, 1, $pt$Savoir interpréter, représenter, écrire et lire les fractions ½, ⅓, ¼, ⅕, ⅙, ⅛ et 1/10.$pt$, $pt$Lire et écrire les fractions ½, ⅓, ¼, ⅕, ⅙, ⅛ et 1/10 en chiffres et en lettres (un quart ↔ 1/4).$pt$),
  ('CE1-095', 'CE1', 'neuf', 'CE1-016', 2, null, $pt$Représenter l'une des fractions ½, ⅓, ¼, ⅕, ⅙, ⅛ ou 1/10 par un partage (colorier les parts d'une figure).$pt$),
  ('CE1-096', 'CE1', 'neuf', 'CE1-016', 3, null, $pt$Interpréter un partage par l'une des fractions ½, ⅓, ¼, ⅕, ⅙, ⅛ ou 1/10 (quelle part de la figure est coloriée ?).$pt$),
  ('CE1-017', 'CE1', 'origine', null, 1, $pt$Savoir interpréter, représenter, écrire et lire des fractions inférieures ou égales à 1.$pt$, $pt$Lire et écrire une fraction inférieure ou égale à 1 en chiffres et en lettres (trois quarts ↔ 3/4).$pt$),
  ('CE1-097', 'CE1', 'neuf', 'CE1-017', 2, null, $pt$Représenter une fraction inférieure ou égale à 1 par un partage (colorier les parts d'une figure).$pt$),
  ('CE1-098', 'CE1', 'neuf', 'CE1-017', 3, null, $pt$Interpréter un partage par une fraction inférieure ou égale à 1 (quelle part de la figure est coloriée ?).$pt$),
  ('CE1-021', 'CE1', 'origine', null, 1, $pt$Additionner et soustraire des fractions de même dénominateur.$pt$, $pt$Additionner des fractions de même dénominateur (2/5 + 1/5 = ?).$pt$),
  ('CE1-099', 'CE1', 'neuf', 'CE1-021', 2, null, $pt$Soustraire des fractions de même dénominateur (4/5 − 1/5 = ?).$pt$),
  ('CE1-022', 'CE1', 'origine', null, 1, $pt$Poser et effectuer des additions et des soustractions en colonnes.$pt$, $pt$Poser et effectuer une addition en colonnes.$pt$),
  ('CE1-100', 'CE1', 'neuf', 'CE1-022', 2, null, $pt$Poser et effectuer une soustraction en colonnes.$pt$),
  ('CE1-026', 'CE1', 'origine', null, 1, $pt$Connaitre dans les deux sens les tables d'addition.$pt$, $pt$Connaître les tables d'addition : donner la somme de deux nombres (3 + 4 = ?).$pt$),
  ('CE1-090', 'CE1', 'neuf', 'CE1-026', 2, null, $pt$Connaître les tables d'addition dans l'autre sens : trouver le terme manquant d'une addition (3 + ? = 7).$pt$),
  ('CE1-027', 'CE1', 'origine', null, 1, $pt$Connaitre dans les deux sens les tables de multiplication.$pt$, $pt$Connaître les tables de multiplication : donner le produit de deux nombres (3 × 4 = ?).$pt$),
  ('CE1-091', 'CE1', 'neuf', 'CE1-027', 2, null, $pt$Connaître les tables de multiplication dans l'autre sens : trouver le facteur manquant d'un produit (3 × ? = 12).$pt$),
  ('CE1-028', 'CE1', 'origine', null, 1, $pt$Connaitre des faits multiplicatifs usuels : les doubles et les moitiés.$pt$, $pt$Connaître des faits multiplicatifs usuels : les doubles (double de 25 = ?).$pt$),
  ('CE1-101', 'CE1', 'neuf', 'CE1-028', 2, null, $pt$Connaître des faits multiplicatifs usuels : les moitiés (moitié de 50 = ?).$pt$),
  ('CE1-029', 'CE1', 'origine', null, 1, $pt$Ajouter ou soustraire un nombre entier de dizaines à un nombre.$pt$, $pt$Ajouter un nombre entier de dizaines à un nombre (246 + 30 = ?).$pt$),
  ('CE1-102', 'CE1', 'neuf', 'CE1-029', 2, null, $pt$Soustraire un nombre entier de dizaines à un nombre (246 − 30 = ?).$pt$),
  ('CE1-084', 'CE1', 'origine', null, 1, $pt$Ajouter ou soustraire un nombre entier de centaines à un nombre.$pt$, $pt$Ajouter un nombre entier de centaines à un nombre (346 + 200 = ?).$pt$),
  ('CE1-103', 'CE1', 'neuf', 'CE1-084', 2, null, $pt$Soustraire un nombre entier de centaines à un nombre (346 − 200 = ?).$pt$),
  ('CE1-063', 'CE1', 'origine', null, 1, $pt$Comparer et mesurer des durées écoulées entre deux instants affichés sur une horloge (pour des intervalles de temps situés dans une même journée, avec des heures données en heures entières, en heures et demi-heure ou en heures et quarts d'heure).$pt$, $pt$Mesurer la durée écoulée entre deux instants affichés sur une horloge (même journée ; heures entières, demi-heures ou quarts d'heure).$pt$),
  ('CE1-104', 'CE1', 'neuf', 'CE1-063', 2, null, $pt$Comparer deux durées écoulées entre des instants affichés sur une horloge (même journée ; heures entières, demi-heures ou quarts d'heure).$pt$),
  ('CE1-070', 'CE1', 'origine', null, 1, $pt$Reconnaitre, nommer et décrire un cercle, un carré, un rectangle, un triangle, un triangle rectangle en utilisant le vocabulaire approprié.$pt$, $pt$Reconnaître et nommer un cercle, un carré, un rectangle, un triangle ou un triangle rectangle (quelle est cette figure ?).$pt$),
  ('CE1-105', 'CE1', 'neuf', 'CE1-070', 2, null, $pt$Décrire un cercle, un carré, un rectangle, un triangle ou un triangle rectangle avec le vocabulaire approprié (côtés, sommets, angles droits).$pt$),
  ('CE1-082', 'CE1', 'origine', null, 1, $pt$Lire et interpréter les données d'un diagramme en barres.$pt$, $pt$Lire une donnée sur un diagramme en barres (combien d'élèves ont choisi le foot ?).$pt$),
  ('CE1-106', 'CE1', 'neuf', 'CE1-082', 2, null, $pt$Interpréter les données d'un diagramme en barres (quel sport est le plus choisi ?).$pt$),
  ('CE1-089', 'CE1', 'origine', null, 1, $pt$Lire et interpréter les données d'un tableau à double entrée.$pt$, $pt$Lire une donnée dans un tableau à double entrée (combien de filles mangent à la cantine le lundi ?).$pt$),
  ('CE1-107', 'CE1', 'neuf', 'CE1-089', 2, null, $pt$Interpréter les données d'un tableau à double entrée (quel jour y a-t-il le plus d'élèves à la cantine ?).$pt$),
  ('CE2-004', 'CE2', 'origine', null, 1, $pt$Connaitre la suite écrite et la suite orale des nombres jusqu'à dix-mille.$pt$, $pt$Connaître la suite écrite des nombres jusqu'à dix mille (écris le nombre qui suit 9 999).$pt$),
  ('CE2-086', 'CE2', 'neuf', 'CE2-004', 2, null, $pt$Connaître la suite orale des nombres jusqu'à dix mille (récite la suite de 9 990 à 10 000, en classe).$pt$),
  ('CE2-007', 'CE2', 'origine', null, 1, $pt$Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles (=, <, >).$pt$, $pt$Comparer deux nombres entiers avec les symboles =, < et > (6 239 … 6 243).$pt$),
  ('CE2-087', 'CE2', 'neuf', 'CE2-007', 2, null, $pt$Encadrer un nombre entier avec les symboles < et > (… < 6 239 < …).$pt$),
  ('CE2-088', 'CE2', 'neuf', 'CE2-007', 3, null, $pt$Intercaler un nombre entier entre deux nombres donnés (2 393 < … < 2 396).$pt$),
  ('CE2-014', 'CE2', 'origine', null, 1, $pt$Additionner et soustraire des fractions.$pt$, $pt$Additionner des fractions (3/4 + 1/4 = ?).$pt$),
  ('CE2-089', 'CE2', 'neuf', 'CE2-014', 2, null, $pt$Soustraire des fractions (3/4 − 1/4 = ?).$pt$),
  ('CE2-016', 'CE2', 'origine', null, 1, $pt$Poser et effectuer des additions et des soustractions en colonnes.$pt$, $pt$Poser et effectuer une addition en colonnes.$pt$),
  ('CE2-090', 'CE2', 'neuf', 'CE2-016', 2, null, $pt$Poser et effectuer une soustraction en colonnes.$pt$),
  ('CE2-017', 'CE2', 'origine', null, 1, $pt$Comprendre et utiliser les mots « facteur », « produit » et « multiple ».$pt$, $pt$Comprendre et utiliser les mots « facteur » et « produit » (dans 4 × 6 = 24, quel est le produit ?).$pt$),
  ('CE2-091', 'CE2', 'neuf', 'CE2-017', 2, null, $pt$Comprendre et utiliser le mot « multiple » (24 est-il un multiple de 6 ?).$pt$),
  ('CE2-020', 'CE2', 'origine', null, 1, $pt$Connaitre dans les deux sens les tables d'addition.$pt$, $pt$Connaître les tables d'addition : donner la somme de deux nombres (3 + 4 = ?).$pt$),
  ('CE2-084', 'CE2', 'neuf', 'CE2-020', 2, null, $pt$Connaître les tables d'addition dans l'autre sens : trouver le terme manquant d'une addition (3 + ? = 7).$pt$),
  ('CE2-021', 'CE2', 'origine', null, 1, $pt$Connaitre dans les deux sens les tables de multiplication.$pt$, $pt$Connaître les tables de multiplication : donner le produit de deux nombres (3 × 4 = ?).$pt$),
  ('CE2-085', 'CE2', 'neuf', 'CE2-021', 2, null, $pt$Connaître les tables de multiplication dans l'autre sens : trouver le facteur manquant d'un produit (3 × ? = 12).$pt$),
  ('CE2-022', 'CE2', 'origine', null, 1, $pt$Connaitre des faits multiplicatifs usuels : les doubles et les moitiés.$pt$, $pt$Connaître des faits multiplicatifs usuels : les doubles (double de 35 = ?).$pt$),
  ('CE2-092', 'CE2', 'neuf', 'CE2-022', 2, null, $pt$Connaître des faits multiplicatifs usuels : les moitiés (moitié de 70 = ?).$pt$),
  ('CE2-026', 'CE2', 'origine', null, 1, $pt$Multiplier un nombre entier par 4 ou par 8.$pt$, $pt$Multiplier un nombre entier par 4 (4 × 37 = ?).$pt$),
  ('CE2-093', 'CE2', 'neuf', 'CE2-026', 2, null, $pt$Multiplier un nombre entier par 8 (8 × 27 = ?).$pt$),
  ('CE2-059', 'CE2', 'origine', null, 1, $pt$Comparer et mesurer des durées écoulées entre deux instants affichés sur une horloge (pour des intervalles de temps situés dans une même journée).$pt$, $pt$Mesurer la durée écoulée entre deux instants affichés sur une horloge (dans une même journée).$pt$),
  ('CE2-094', 'CE2', 'neuf', 'CE2-059', 2, null, $pt$Comparer deux durées écoulées entre des instants affichés sur une horloge (dans une même journée).$pt$),
  ('CE2-068', 'CE2', 'origine', null, 1, $pt$Reconnaitre, nommer et décrire le carré, le rectangle, le triangle, le triangle rectangle et le losange.$pt$, $pt$Reconnaître et nommer le carré, le rectangle, le triangle, le triangle rectangle et le losange (quelle est cette figure ?).$pt$),
  ('CE2-095', 'CE2', 'neuf', 'CE2-068', 2, null, $pt$Décrire le carré, le rectangle, le triangle, le triangle rectangle et le losange avec le vocabulaire approprié (côtés, sommets, angles droits).$pt$),
  ('CE2-075', 'CE2', 'origine', null, 1, $pt$Lire et interpréter les données d'un tableau à double entrée.$pt$, $pt$Lire une donnée dans un tableau à double entrée (combien de filles mangent à la cantine le lundi ?).$pt$),
  ('CE2-096', 'CE2', 'neuf', 'CE2-075', 2, null, $pt$Interpréter les données d'un tableau à double entrée (quel jour y a-t-il le plus d'élèves à la cantine ?).$pt$),
  ('CE2-083', 'CE2', 'origine', null, 1, $pt$Lire et interpréter les données d'un diagramme en barres.$pt$, $pt$Lire une donnée sur un diagramme en barres (combien d'élèves ont choisi le foot ?).$pt$),
  ('CE2-097', 'CE2', 'neuf', 'CE2-083', 2, null, $pt$Interpréter les données d'un diagramme en barres (combien d'élèves de plus pour le foot que pour le basket ?).$pt$),
  ('CM1-004', 'CM1', 'origine', null, 1, $pt$Connaître la suite écrite et la suite orale des nombres jusqu'à 999 999$pt$, $pt$Connaître la suite écrite des nombres jusqu'à 999 999 (écris le nombre qui suit 99 999).$pt$),
  ('CM1-140', 'CM1', 'neuf', 'CM1-004', 2, null, $pt$Connaître la suite orale des nombres jusqu'à 999 999 (récite la suite de 99 990 à 100 000, en classe).$pt$),
  ('CM1-008', 'CM1', 'origine', null, 1, $pt$Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles =, < et >$pt$, $pt$Comparer deux nombres entiers avec les symboles =, < et > (45 307 … 45 370).$pt$),
  ('CM1-141', 'CM1', 'neuf', 'CM1-008', 2, null, $pt$Encadrer un nombre entier avec les symboles < et > (… < 45 307 < …).$pt$),
  ('CM1-142', 'CM1', 'neuf', 'CM1-008', 3, null, $pt$Intercaler un nombre entier entre deux nombres donnés (45 307 < … < 45 370).$pt$),
  ('CM1-010', 'CM1', 'origine', null, 1, $pt$Savoir placer des nombres et repérer des points sur une demi-droite graduée$pt$, $pt$Placer un nombre entier sur une demi-droite graduée.$pt$),
  ('CM1-143', 'CM1', 'neuf', 'CM1-010', 2, null, $pt$Lire le nombre qui repère un point d'une demi-droite graduée.$pt$),
  ('CM1-014', 'CM1', 'origine', null, 1, $pt$Savoir interpréter, représenter, écrire et lire des fractions$pt$, $pt$Lire et écrire une fraction en chiffres et en lettres (cinq tiers ↔ 5/3).$pt$),
  ('CM1-144', 'CM1', 'neuf', 'CM1-014', 2, null, $pt$Représenter une fraction donnée par un partage (colorier les parts d'une figure).$pt$),
  ('CM1-145', 'CM1', 'neuf', 'CM1-014', 3, null, $pt$Interpréter un partage par une fraction (quelle part de la figure est coloriée ?).$pt$),
  ('CM1-018', 'CM1', 'origine', null, 1, $pt$Savoir placer une fraction ou la somme d'un nombre entier et d'une fraction inférieure à un sur une demi-droite graduée$pt$, $pt$Placer une fraction sur une demi-droite graduée (place 3/4).$pt$),
  ('CM1-146', 'CM1', 'neuf', 'CM1-018', 2, null, $pt$Placer la somme d'un entier et d'une fraction inférieure à un sur une demi-droite graduée (place 2 + 1/4).$pt$),
  ('CM1-019', 'CM1', 'origine', null, 1, $pt$Savoir repérer un point d'une demi-droite graduée par une fraction ou par la somme d'un nombre entier et d'une fraction$pt$, $pt$Repérer un point d'une demi-droite graduée par une fraction (le point A repère … : 3/4).$pt$),
  ('CM1-147', 'CM1', 'neuf', 'CM1-019', 2, null, $pt$Repérer un point d'une demi-droite graduée par la somme d'un nombre entier et d'une fraction (le point B repère … : 2 + 1/4).$pt$),
  ('CM1-021', 'CM1', 'origine', null, 1, $pt$Additionner et soustraire des fractions$pt$, $pt$Additionner des fractions (3/10 + 5/10 = ?).$pt$),
  ('CM1-148', 'CM1', 'neuf', 'CM1-021', 2, null, $pt$Soustraire des fractions (8/10 − 5/10 = ?).$pt$),
  ('CM1-023', 'CM1', 'origine', null, 1, $pt$Interpréter, représenter, écrire et lire des fractions décimales$pt$, $pt$Lire et écrire une fraction décimale en chiffres et en lettres (vingt-trois centièmes ↔ 23/100).$pt$),
  ('CM1-149', 'CM1', 'neuf', 'CM1-023', 2, null, $pt$Représenter une fraction décimale donnée par un partage (colorier les parts d'une figure).$pt$),
  ('CM1-150', 'CM1', 'neuf', 'CM1-023', 3, null, $pt$Interpréter un partage par une fraction décimale (quelle part de la figure est coloriée ?).$pt$),
  ('CM1-025', 'CM1', 'origine', null, 1, $pt$Placer une fraction décimale sur une demi-droite graduée et repérer un point d'une demi-droite graduée par une fraction décimale$pt$, $pt$Placer une fraction décimale sur une demi-droite graduée.$pt$),
  ('CM1-151', 'CM1', 'neuf', 'CM1-025', 2, null, $pt$Repérer un point d'une demi-droite graduée par une fraction décimale.$pt$),
  ('CM1-028', 'CM1', 'origine', null, 1, $pt$Comparer, encadrer, intercaler des fractions décimales en utilisant les symboles =, < et >$pt$, $pt$Comparer deux fractions décimales avec les symboles =, < et > (7/10 … 65/100).$pt$),
  ('CM1-152', 'CM1', 'neuf', 'CM1-028', 2, null, $pt$Encadrer une fraction décimale (… < 237/100 < …).$pt$),
  ('CM1-153', 'CM1', 'neuf', 'CM1-028', 3, null, $pt$Intercaler une fraction décimale entre deux fractions décimales (3/10 < … < 4/10).$pt$),
  ('CM1-030', 'CM1', 'origine', null, 1, $pt$Passer d'une écriture sous forme d'une fraction décimale ou d'une somme de fractions décimales à une écriture à virgule et réciproquement$pt$, $pt$Écrire à virgule un nombre donné par une fraction décimale ou une somme de fractions décimales (237/100 = ? ou 2 + 3/10 + 7/100 = ?).$pt$),
  ('CM1-154', 'CM1', 'neuf', 'CM1-030', 2, null, $pt$Écrire un nombre à virgule sous forme de fraction décimale ou de somme de fractions décimales (2,37 = ?/100).$pt$),
  ('CM1-031', 'CM1', 'origine', null, 1, $pt$Interpréter, représenter, écrire et lire des nombres décimaux (écriture à virgule)$pt$, $pt$Lire et écrire un nombre décimal en chiffres et en lettres (trois unités et vingt-cinq centièmes ↔ 3,25).$pt$),
  ('CM1-155', 'CM1', 'neuf', 'CM1-031', 2, null, $pt$Interpréter l'écriture à virgule : valeur de chaque chiffre (chiffre des centièmes de 3,25 ?).$pt$),
  ('CM1-156', 'CM1', 'neuf', 'CM1-031', 3, null, $pt$Représenter un nombre décimal (figure partagée en dixièmes ou en centièmes).$pt$),
  ('CM1-032', 'CM1', 'origine', null, 1, $pt$Placer un nombre décimal en écriture à virgule sur une demi-droite graduée et repérer un point d'une demi-droite graduée par un nombre décimal$pt$, $pt$Placer un nombre décimal sur une demi-droite graduée.$pt$),
  ('CM1-157', 'CM1', 'neuf', 'CM1-032', 2, null, $pt$Repérer un point d'une demi-droite graduée par un nombre décimal.$pt$),
  ('CM1-033', 'CM1', 'origine', null, 1, $pt$Savoir donner la partie entière et l'arrondi à l'entier d'un nombre décimal$pt$, $pt$Donner la partie entière d'un nombre décimal (partie entière de 3,7 = ?).$pt$),
  ('CM1-158', 'CM1', 'neuf', 'CM1-033', 2, null, $pt$Donner l'arrondi à l'entier d'un nombre décimal (arrondi de 3,7 = ?).$pt$),
  ('CM1-034', 'CM1', 'origine', null, 1, $pt$Comparer, ordonner, par ordre croissant ou décroissant, des nombres décimaux donnés par leur écriture à virgule en utilisant les symboles =, < et >$pt$, $pt$Comparer deux nombres décimaux avec les symboles =, < et > (3,7 … 3,25).$pt$),
  ('CM1-159', 'CM1', 'neuf', 'CM1-034', 2, null, $pt$Ordonner des nombres décimaux dans l'ordre croissant ou décroissant.$pt$),
  ('CM1-132', 'CM1', 'origine', null, 1, $pt$Encadrer, intercaler des nombres décimaux donnés par leur écriture à virgule en utilisant les symboles =, < et >$pt$, $pt$Encadrer un nombre décimal (entre deux entiers consécutifs : 3 < 3,7 < 4 ; au dixième près : 3,7 < 3,74 < 3,8).$pt$),
  ('CM1-160', 'CM1', 'neuf', 'CM1-132', 2, null, $pt$Intercaler un nombre décimal entre deux nombres décimaux (3,4 < … < 3,5).$pt$),
  ('CM1-035', 'CM1', 'origine', null, 1, $pt$Connaître des faits numériques usuels relatifs aux nombres entiers — répertoire additif ✂$pt$, $pt$Connaître le répertoire additif : donner la somme de deux nombres (8 + 7 = ?).$pt$),
  ('CM1-161', 'CM1', 'neuf', 'CM1-035', 2, null, $pt$Connaître le répertoire additif : compléter une addition à trou (8 + ? = 15).$pt$),
  ('CM1-036', 'CM1', 'origine', null, 1, $pt$Connaître des faits numériques usuels relatifs aux nombres entiers — répertoire multiplicatif ✂$pt$, $pt$Connaître le répertoire multiplicatif : donner le produit de deux nombres (7 × 8 = ?).$pt$),
  ('CM1-162', 'CM1', 'neuf', 'CM1-036', 2, null, $pt$Connaître le répertoire multiplicatif : compléter une multiplication à trou (7 × ? = 56).$pt$),
  ('CM1-043', 'CM1', 'origine', null, 1, $pt$Ajouter ou soustraire 8, 9, 18, 19, 28, 29, 38 ou 39, à un nombre$pt$, $pt$Ajouter 8, 9, 18, 19, 28, 29, 38 ou 39 à un nombre (57 + 29 = ?).$pt$),
  ('CM1-163', 'CM1', 'neuf', 'CM1-043', 2, null, $pt$Soustraire 8, 9, 18, 19, 28, 29, 38 ou 39 à un nombre (57 − 29 = ?).$pt$),
  ('CM1-045', 'CM1', 'origine', null, 1, $pt$Multiplier un nombre entier par 4 ou par 8$pt$, $pt$Multiplier un nombre entier par 4 (4 × 45 = ?).$pt$),
  ('CM1-164', 'CM1', 'neuf', 'CM1-045', 2, null, $pt$Multiplier un nombre entier par 8 (8 × 45 = ?).$pt$),
  ('CM1-050', 'CM1', 'origine', null, 1, $pt$Poser en colonnes et effectuer des additions et des soustractions de nombres décimaux$pt$, $pt$Poser en colonnes et effectuer une addition de nombres décimaux.$pt$),
  ('CM1-165', 'CM1', 'neuf', 'CM1-050', 2, null, $pt$Poser en colonnes et effectuer une soustraction de nombres décimaux.$pt$),
  ('CM1-094', 'CM1', 'origine', null, 1, $pt$Comparer et mesurer des durées écoulées entre deux instants affichés sur une horloge (instants et durées sont exprimés en heure et minute)$pt$, $pt$Mesurer la durée écoulée entre deux instants affichés sur une horloge (en heures et minutes).$pt$),
  ('CM1-166', 'CM1', 'neuf', 'CM1-094', 2, null, $pt$Comparer deux durées écoulées entre des instants affichés sur une horloge (en heures et minutes).$pt$),
  ('CM1-100', 'CM1', 'origine', null, 1, $pt$Reconnaître et utiliser la notion de perpendicularité$pt$, $pt$Reconnaître des droites perpendiculaires.$pt$),
  ('CM1-167', 'CM1', 'neuf', 'CM1-100', 2, null, $pt$Tracer la droite perpendiculaire à une droite donnée passant par un point.$pt$),
  ('CM1-101', 'CM1', 'origine', null, 1, $pt$Reconnaître et utiliser la notion de parallélisme$pt$, $pt$Reconnaître des droites parallèles.$pt$),
  ('CM1-168', 'CM1', 'neuf', 'CM1-101', 2, null, $pt$Tracer la droite parallèle à une droite donnée passant par un point.$pt$),
  ('CM1-121', 'CM1', 'origine', null, 1, $pt$Lire et interpréter les données d'un tableau à simple entrée$pt$, $pt$Lire une donnée dans un tableau à simple entrée (quelle est la population de Lyon ?).$pt$),
  ('CM1-169', 'CM1', 'neuf', 'CM1-121', 2, null, $pt$Interpréter les données d'un tableau à simple entrée (quelle ville est la plus peuplée ?).$pt$),
  ('CM1-137', 'CM1', 'origine', null, 1, $pt$Lire et interpréter les données d'un tableau à double entrée$pt$, $pt$Lire une donnée dans un tableau à double entrée (combien de garçons pratiquent la natation ?).$pt$),
  ('CM1-170', 'CM1', 'neuf', 'CM1-137', 2, null, $pt$Interpréter les données d'un tableau à double entrée (quel sport attire le plus de filles ?).$pt$),
  ('CM1-138', 'CM1', 'origine', null, 1, $pt$Lire et interpréter les données d'un diagramme en barres$pt$, $pt$Lire une donnée sur un diagramme en barres (combien de livres ont été prêtés en mars ?).$pt$),
  ('CM1-171', 'CM1', 'neuf', 'CM1-138', 2, null, $pt$Interpréter les données d'un diagramme en barres (combien de livres de plus en mars qu'en février ?).$pt$),
  ('CM1-139', 'CM1', 'origine', null, 1, $pt$Lire et interpréter les données d'une courbe$pt$, $pt$Lire une donnée sur une courbe (quelle température à 14 h ?).$pt$),
  ('CM1-172', 'CM1', 'neuf', 'CM1-139', 2, null, $pt$Interpréter les données d'une courbe (à quel moment la température est-elle la plus haute ?).$pt$),
  ('CM2-002', 'CM2', 'origine', null, 1, $pt$Connaître la suite écrite et la suite orale des nombres jusqu'à 999 999 999$pt$, $pt$Connaître la suite écrite des nombres jusqu'à 999 999 999 (écris le nombre qui suit 999 999).$pt$),
  ('CM2-126', 'CM2', 'neuf', 'CM2-002', 2, null, $pt$Connaître la suite orale des nombres jusqu'à 999 999 999 (récite la suite de 999 990 à 1 000 000, en classe).$pt$),
  ('CM2-005', 'CM2', 'origine', null, 1, $pt$Comparer, encadrer, intercaler des nombres entiers en utilisant les symboles =, < et >$pt$, $pt$Comparer deux nombres entiers avec les symboles =, < et > (3 405 270 … 3 450 207).$pt$),
  ('CM2-127', 'CM2', 'neuf', 'CM2-005', 2, null, $pt$Encadrer un nombre entier avec les symboles < et > (… < 3 405 270 < …).$pt$),
  ('CM2-128', 'CM2', 'neuf', 'CM2-005', 3, null, $pt$Intercaler un nombre entier entre deux nombres donnés (3 405 270 < … < 3 450 207).$pt$),
  ('CM2-007', 'CM2', 'origine', null, 1, $pt$Placer des nombres et repérer des points sur une demi-droite graduée$pt$, $pt$Placer un nombre entier sur une demi-droite graduée.$pt$),
  ('CM2-129', 'CM2', 'neuf', 'CM2-007', 2, null, $pt$Lire le nombre qui repère un point d'une demi-droite graduée.$pt$),
  ('CM2-008', 'CM2', 'origine', null, 1, $pt$Déterminer si un nombre entier inférieur ou égal à 10 est un diviseur d'un nombre entier donné ou si un nombre entier donné est un multiple d'un nombre entier inférieur ou égal à 10$pt$, $pt$Déterminer si un nombre entier inférieur ou égal à 10 est un diviseur d'un nombre entier donné (7 est-il un diviseur de 56 ?).$pt$),
  ('CM2-130', 'CM2', 'neuf', 'CM2-008', 2, null, $pt$Déterminer si un nombre entier donné est un multiple d'un nombre entier inférieur ou égal à 10 (56 est-il un multiple de 7 ?).$pt$),
  ('CM2-013', 'CM2', 'origine', null, 1, $pt$Interpréter, représenter, écrire et lire des fractions$pt$, $pt$Lire et écrire une fraction en chiffres et en lettres (cinq tiers ↔ 5/3).$pt$),
  ('CM2-131', 'CM2', 'neuf', 'CM2-013', 2, null, $pt$Représenter une fraction donnée par un partage (colorier les parts d'une figure).$pt$),
  ('CM2-132', 'CM2', 'neuf', 'CM2-013', 3, null, $pt$Interpréter un partage par une fraction (quelle part de la figure est coloriée ?).$pt$),
  ('CM2-017', 'CM2', 'origine', null, 1, $pt$Placer une fraction ou la somme d'un nombre entier et d'une fraction inférieure à un sur une demi-droite graduée$pt$, $pt$Placer une fraction sur une demi-droite graduée (place 3/4).$pt$),
  ('CM2-133', 'CM2', 'neuf', 'CM2-017', 2, null, $pt$Placer la somme d'un entier et d'une fraction inférieure à un sur une demi-droite graduée (place 2 + 1/4).$pt$),
  ('CM2-018', 'CM2', 'origine', null, 1, $pt$Repérer un point d'une demi-droite graduée par une fraction ou par la somme d'un nombre entier et d'une fraction$pt$, $pt$Repérer un point d'une demi-droite graduée par une fraction (le point A repère … : 3/4).$pt$),
  ('CM2-134', 'CM2', 'neuf', 'CM2-018', 2, null, $pt$Repérer un point d'une demi-droite graduée par la somme d'un nombre entier et d'une fraction (le point B repère … : 2 + 1/4).$pt$),
  ('CM2-020', 'CM2', 'origine', null, 1, $pt$Additionner et soustraire des fractions$pt$, $pt$Additionner des fractions (3/4 + 1/4 = ?).$pt$),
  ('CM2-135', 'CM2', 'neuf', 'CM2-020', 2, null, $pt$Soustraire des fractions (3/4 − 1/4 = ?).$pt$),
  ('CM2-023', 'CM2', 'origine', null, 1, $pt$Interpréter, représenter, écrire et lire des fractions décimales$pt$, $pt$Lire et écrire une fraction décimale en chiffres et en lettres (vingt-trois centièmes ↔ 23/100).$pt$),
  ('CM2-136', 'CM2', 'neuf', 'CM2-023', 2, null, $pt$Représenter une fraction décimale donnée par un partage (colorier les parts d'une figure).$pt$),
  ('CM2-137', 'CM2', 'neuf', 'CM2-023', 3, null, $pt$Interpréter un partage par une fraction décimale (quelle part de la figure est coloriée ?).$pt$),
  ('CM2-025', 'CM2', 'origine', null, 1, $pt$Placer une fraction décimale sur une demi-droite graduée et repérer un point d'une demi-droite graduée par une fraction décimale$pt$, $pt$Placer une fraction décimale sur une demi-droite graduée.$pt$),
  ('CM2-138', 'CM2', 'neuf', 'CM2-025', 2, null, $pt$Repérer un point d'une demi-droite graduée par une fraction décimale.$pt$),
  ('CM2-028', 'CM2', 'origine', null, 1, $pt$Comparer, encadrer, intercaler des fractions décimales en utilisant les symboles =, < et >$pt$, $pt$Comparer deux fractions décimales avec les symboles =, < et > (7/10 … 65/100).$pt$),
  ('CM2-139', 'CM2', 'neuf', 'CM2-028', 2, null, $pt$Encadrer une fraction décimale (… < 237/100 < …).$pt$),
  ('CM2-140', 'CM2', 'neuf', 'CM2-028', 3, null, $pt$Intercaler une fraction décimale entre deux fractions décimales (3/10 < … < 4/10).$pt$),
  ('CM2-030', 'CM2', 'origine', null, 1, $pt$Passer d'une écriture sous forme d'une fraction décimale ou de la somme de fractions décimales à une écriture à virgule et réciproquement$pt$, $pt$Écrire à virgule un nombre donné par une fraction décimale ou une somme de fractions décimales (237/100 = ? ou 2 + 3/10 + 7/100 = ?).$pt$),
  ('CM2-141', 'CM2', 'neuf', 'CM2-030', 2, null, $pt$Écrire un nombre à virgule sous forme de fraction décimale ou de somme de fractions décimales (2,37 = ?/100).$pt$),
  ('CM2-031', 'CM2', 'origine', null, 1, $pt$Interpréter, représenter, écrire et lire des nombres décimaux (écriture à virgule)$pt$, $pt$Lire et écrire un nombre décimal en chiffres et en lettres (trois unités et vingt-cinq centièmes ↔ 3,25).$pt$),
  ('CM2-142', 'CM2', 'neuf', 'CM2-031', 2, null, $pt$Interpréter l'écriture à virgule : valeur de chaque chiffre (chiffre des centièmes de 3,25 ?).$pt$),
  ('CM2-143', 'CM2', 'neuf', 'CM2-031', 3, null, $pt$Représenter un nombre décimal (figure partagée en dixièmes ou en centièmes).$pt$),
  ('CM2-032', 'CM2', 'origine', null, 1, $pt$Placer un nombre décimal en écriture à virgule sur une demi-droite graduée et repérer un point d'une demi-droite graduée par un nombre en écriture à virgule$pt$, $pt$Placer un nombre décimal sur une demi-droite graduée.$pt$),
  ('CM2-144', 'CM2', 'neuf', 'CM2-032', 2, null, $pt$Repérer un point d'une demi-droite graduée par un nombre décimal.$pt$),
  ('CM2-033', 'CM2', 'origine', null, 1, $pt$Savoir donner la partie entière et l'arrondi à l'entier d'un nombre décimal$pt$, $pt$Donner la partie entière d'un nombre décimal (partie entière de 3,7 = ?).$pt$),
  ('CM2-145', 'CM2', 'neuf', 'CM2-033', 2, null, $pt$Donner l'arrondi à l'entier d'un nombre décimal (arrondi de 3,7 = ?).$pt$),
  ('CM2-034', 'CM2', 'origine', null, 1, $pt$Comparer, ordonner par ordre croissant ou décroissant des nombres décimaux donnés par leur écriture à virgule en utilisant les symboles =, < et >$pt$, $pt$Comparer deux nombres décimaux avec les symboles =, < et > (3,7 … 3,25).$pt$),
  ('CM2-146', 'CM2', 'neuf', 'CM2-034', 2, null, $pt$Ordonner des nombres décimaux dans l'ordre croissant ou décroissant.$pt$),
  ('CM2-117', 'CM2', 'origine', null, 1, $pt$Encadrer, intercaler des nombres décimaux donnés par leur écriture à virgule en utilisant les symboles =, < et >$pt$, $pt$Encadrer un nombre décimal (entre deux entiers consécutifs : 3 < 3,7 < 4 ; au dixième près : 3,7 < 3,74 < 3,8).$pt$),
  ('CM2-147', 'CM2', 'neuf', 'CM2-117', 2, null, $pt$Intercaler un nombre décimal entre deux nombres décimaux (3,4 < … < 3,5).$pt$),
  ('CM2-035', 'CM2', 'origine', null, 1, $pt$Connaître des faits numériques usuels avec des entiers — répertoire additif ✂$pt$, $pt$Connaître le répertoire additif : donner la somme de deux nombres (8 + 7 = ?).$pt$),
  ('CM2-148', 'CM2', 'neuf', 'CM2-035', 2, null, $pt$Connaître le répertoire additif : compléter une addition à trou (8 + ? = 15).$pt$),
  ('CM2-036', 'CM2', 'origine', null, 1, $pt$Connaître des faits numériques usuels avec des entiers — répertoire multiplicatif ✂$pt$, $pt$Connaître le répertoire multiplicatif : donner le produit de deux nombres (7 × 8 = ?).$pt$),
  ('CM2-149', 'CM2', 'neuf', 'CM2-036', 2, null, $pt$Connaître le répertoire multiplicatif : compléter une multiplication à trou (7 × ? = 56).$pt$),
  ('CM2-045', 'CM2', 'origine', null, 1, $pt$Ajouter ou soustraire 8, 9, 18, 19, 28, 29, …, 98 ou 99 à un nombre$pt$, $pt$Ajouter 8, 9, 18, 19, …, 98 ou 99 à un nombre (157 + 39 = ?).$pt$),
  ('CM2-150', 'CM2', 'neuf', 'CM2-045', 2, null, $pt$Soustraire 8, 9, 18, 19, …, 98 ou 99 à un nombre (157 − 39 = ?).$pt$),
  ('CM2-050', 'CM2', 'origine', null, 1, $pt$Diviser un nombre entier par 4 ou par 8$pt$, $pt$Diviser un nombre entier par 4 (128 ÷ 4 = ?).$pt$),
  ('CM2-151', 'CM2', 'neuf', 'CM2-050', 2, null, $pt$Diviser un nombre entier par 8 (128 ÷ 8 = ?).$pt$),
  ('CM2-067', 'CM2', 'origine', null, 1, $pt$Exécuter ou produire un programme de calcul$pt$, $pt$Exécuter un programme de calcul (résultat pour un nombre de départ donné).$pt$),
  ('CM2-152', 'CM2', 'neuf', 'CM2-067', 2, null, $pt$Produire un programme de calcul pour obtenir un résultat donné.$pt$),
  ('CM2-084', 'CM2', 'origine', null, 1, $pt$Comparer et mesurer des durées écoulées entre deux instants affichés sur une horloge (instants et durées sont exprimés en heure, minute et seconde)$pt$, $pt$Mesurer la durée écoulée entre deux instants affichés sur une horloge (en heures, minutes et secondes).$pt$),
  ('CM2-153', 'CM2', 'neuf', 'CM2-084', 2, null, $pt$Comparer deux durées écoulées entre des instants affichés sur une horloge (en heures, minutes et secondes).$pt$),
  ('CM2-089', 'CM2', 'origine', null, 1, $pt$Reconnaître et utiliser la notion de perpendicularité$pt$, $pt$Reconnaître des droites perpendiculaires.$pt$),
  ('CM2-154', 'CM2', 'neuf', 'CM2-089', 2, null, $pt$Tracer la droite perpendiculaire à une droite donnée passant par un point.$pt$),
  ('CM2-090', 'CM2', 'origine', null, 1, $pt$Reconnaître et utiliser la notion de parallélisme$pt$, $pt$Reconnaître des droites parallèles.$pt$),
  ('CM2-155', 'CM2', 'neuf', 'CM2-090', 2, null, $pt$Tracer la droite parallèle à une droite donnée passant par un point.$pt$),
  ('CM2-107', 'CM2', 'origine', null, 1, $pt$Lire et interpréter les données d'un tableau$pt$, $pt$Lire une donnée dans un tableau (quelle est la population de Lyon ?).$pt$),
  ('CM2-156', 'CM2', 'neuf', 'CM2-107', 2, null, $pt$Interpréter les données d'un tableau (quelle ville est la plus peuplée ?).$pt$),
  ('CM2-123', 'CM2', 'origine', null, 1, $pt$Lire et interpréter les données d'un diagramme en barres$pt$, $pt$Lire une donnée sur un diagramme en barres (combien de livres ont été prêtés en mars ?).$pt$),
  ('CM2-157', 'CM2', 'neuf', 'CM2-123', 2, null, $pt$Interpréter les données d'un diagramme en barres (combien de livres de plus en mars qu'en février ?).$pt$),
  ('CM2-124', 'CM2', 'origine', null, 1, $pt$Lire et interpréter les données d'un diagramme circulaire$pt$, $pt$Lire une donnée sur un diagramme circulaire (quelle part des élèves vient à vélo ?).$pt$),
  ('CM2-158', 'CM2', 'neuf', 'CM2-124', 2, null, $pt$Interpréter les données d'un diagramme circulaire (quel moyen de transport est le plus utilisé ?).$pt$),
  ('CM2-125', 'CM2', 'origine', null, 1, $pt$Lire et interpréter les données d'une courbe$pt$, $pt$Lire une donnée sur une courbe (quelle température à 14 h ?).$pt$),
  ('CM2-159', 'CM2', 'neuf', 'CM2-125', 2, null, $pt$Interpréter les données d'une courbe (entre quelles heures la température augmente-t-elle ?).$pt$),
  ('6-113', '6', 'origine', null, 1, $pt$Encadrer un nombre décimal par deux nombres décimaux, intercaler un nombre décimal entre deux nombres décimaux$pt$, $pt$Encadrer un nombre décimal par deux nombres décimaux (… < 3,47 < …).$pt$),
  ('6-202', '6', 'neuf', '6-113', 2, null, $pt$Intercaler un nombre décimal entre deux nombres décimaux (3,4 < … < 3,5).$pt$),
  ('6-133', '6', 'origine', null, 1, $pt$Comparer et encadrer des fractions$pt$, $pt$Comparer deux fractions (3/4 … 5/6).$pt$),
  ('6-203', '6', 'neuf', '6-133', 2, null, $pt$Encadrer une fraction (… < 7/3 < …).$pt$),
  ('6-134', '6', 'origine', null, 1, $pt$Ordonner une liste de nombres écrits sous forme de fractions ou de nombres mixtes$pt$, $pt$Ordonner une liste de fractions (range 3/4 ; 2/3 ; 5/6).$pt$),
  ('6-204', '6', 'neuf', '6-134', 2, null, $pt$Ordonner une liste de nombres mixtes (range 2 + 1/4 ; 1 + 3/4 ; 2 + 1/3).$pt$),
  ('6-135', '6', 'origine', null, 1, $pt$Additionner et soustraire des fractions$pt$, $pt$Additionner des fractions (2/3 + 1/6 = ?).$pt$),
  ('6-205', '6', 'neuf', '6-135', 2, null, $pt$Soustraire des fractions (2/3 − 1/6 = ?).$pt$),
  ('6-157', '6', 'origine', null, 1, $pt$Effectuer des calculs sur des horaires et des durées$pt$, $pt$Calculer un horaire ou une durée à partir des deux autres données (départ 9 h 40, durée 1 h 35 : arrivée ? ; départ 9 h 40, arrivée 11 h 15 : durée ?).$pt$),
  ('6-206', '6', 'neuf', '6-157', 2, null, $pt$Calculer sur des durées (1 h 40 min + 2 h 35 min = ?).$pt$),
  ('6-178', '6', 'origine', null, 1, $pt$Connaître et construire le cercle circonscrit à un triangle$pt$, $pt$Connaître le cercle circonscrit à un triangle (son centre est le point de concours des médiatrices).$pt$),
  ('6-207', '6', 'neuf', '6-178', 2, null, $pt$Construire le cercle circonscrit à un triangle.$pt$),
  ('6-181', '6', 'origine', null, 1, $pt$Voir dans l'espace des assemblages de cubes : passage, dans les deux sens, entre l'objet à trois dimensions et ses diverses représentations à deux dimensions ; dénombrements$pt$, $pt$Associer à un assemblage de cubes ses représentations planes (vue de dessus, de face…).$pt$),
  ('6-208', '6', 'neuf', '6-181', 2, null, $pt$Retrouver un assemblage de cubes à partir de ses représentations planes.$pt$),
  ('6-209', '6', 'neuf', '6-181', 3, null, $pt$Dénombrer les cubes d'un assemblage.$pt$),
  ('6-195', '6', 'origine', null, 1, $pt$Produire et exécuter une séquence d'instructions$pt$, $pt$Exécuter une séquence d'instructions (résultat pour un nombre de départ donné).$pt$),
  ('6-210', '6', 'neuf', '6-195', 2, null, $pt$Produire une séquence d'instructions pour obtenir un résultat donné.$pt$),
  ('5-005', '5', 'origine', null, 1, $pt$Traduire un problème, une succession donnée d'opérations, un programme de calcul, en une seule expression, en faisant appel ou non à des parenthèses.$pt$, $pt$Traduire un problème en une seule expression (Léo achète 3 cahiers à 2 € et un stylo à 1 € : écris le calcul du prix).$pt$),
  ('5-116', '5', 'neuf', '5-005', 2, null, $pt$Traduire une succession donnée d'opérations en une seule expression (ajoute 3 à 5, puis multiplie le résultat par 2 : écris le calcul).$pt$),
  ('5-117', '5', 'neuf', '5-005', 3, null, $pt$Traduire un programme de calcul en une seule expression (choisis 5, ajoute 3, multiplie par 2 : écris l'expression).$pt$),
  ('5-006', '5', 'origine', null, 1, $pt$Nommer un calcul, distinguer sommes et produits, termes et facteurs.$pt$, $pt$Nommer un calcul : dire s'il est une somme ou un produit (3 + 4 × 5 est une somme).$pt$),
  ('5-118', '5', 'neuf', '5-006', 2, null, $pt$Identifier les termes d'une somme ou les facteurs d'un produit.$pt$),
  ('5-010', '5', 'origine', null, 1, $pt$Connaitre les critères de divisibilité par 3 et par 9.$pt$, $pt$Connaître le critère de divisibilité par 3 (4 518 est-il divisible par 3 ?).$pt$),
  ('5-119', '5', 'neuf', '5-010', 2, null, $pt$Connaître le critère de divisibilité par 9 (4 518 est-il divisible par 9 ?).$pt$),
  ('5-013', '5', 'origine', null, 1, $pt$Définir l'opposé et la valeur absolue d'un nombre.$pt$, $pt$Donner l'opposé d'un nombre relatif (opposé de −3 = ?).$pt$),
  ('5-120', '5', 'neuf', '5-013', 2, null, $pt$Donner la valeur absolue d'un nombre relatif (valeur absolue de −3 = ?).$pt$),
  ('5-016', '5', 'origine', null, 1, $pt$Lire l'abscisse d'un nombre relatif sur une droite graduée et placer un nombre relatif d'abscisse donnée.$pt$, $pt$Lire l'abscisse d'un point sur une droite graduée (nombres relatifs).$pt$),
  ('5-121', '5', 'neuf', '5-016', 2, null, $pt$Placer sur une droite graduée un point d'abscisse relative donnée.$pt$),
  ('5-017', '5', 'origine', null, 1, $pt$Comparer et ranger dans l'ordre croissant et décroissant des nombres décimaux relatifs.$pt$, $pt$Comparer deux nombres décimaux relatifs (−3,5 … −5).$pt$),
  ('5-122', '5', 'neuf', '5-017', 2, null, $pt$Ranger des nombres décimaux relatifs dans l'ordre croissant ou décroissant.$pt$),
  ('5-026', '5', 'origine', null, 1, $pt$Additionner et soustraire des fractions de dénominateurs quelconques.$pt$, $pt$Additionner des fractions de dénominateurs quelconques (2/3 + 1/4 = ?).$pt$),
  ('5-123', '5', 'neuf', '5-026', 2, null, $pt$Soustraire des fractions de dénominateurs quelconques (2/3 − 1/4 = ?).$pt$),
  ('5-034', '5', 'origine', null, 1, $pt$Produire des formules (double, triple, carré, successeur, prédécesseur, aire, périmètre, etc.).$pt$, $pt$Produire des formules pour un nombre : double, triple, carré, successeur, prédécesseur (triple de n : 3n ; successeur de n : n + 1).$pt$),
  ('5-124', '5', 'neuf', '5-034', 2, null, $pt$Produire des formules de grandeurs : aire, périmètre (aire d'un rectangle de longueur L et de largeur l : L × l).$pt$),
  ('5-044', '5', 'origine', null, 1, $pt$Modéliser des problèmes relevant des opérations à trous par des équations du type ax = c ou x + b = c.$pt$, $pt$Modéliser par une équation du type x + b = c un problème relevant d'une addition à trou.$pt$),
  ('5-125', '5', 'neuf', '5-044', 2, null, $pt$Modéliser par une équation du type ax = c un problème relevant d'une multiplication à trou.$pt$),
  ('5-045', '5', 'origine', null, 1, $pt$Résoudre des équations du type ax = c ou x + b = c par des méthodes arithmétiques s'appuyant sur les opérations inverses.$pt$, $pt$Résoudre une équation du type x + b = c par l'opération inverse (x + 7 = 12 : x = 12 − 7).$pt$),
  ('5-126', '5', 'neuf', '5-045', 2, null, $pt$Résoudre une équation du type ax = c par l'opération inverse (3x = 12 : x = 12 ÷ 3).$pt$),
  ('5-046', '5', 'origine', null, 1, $pt$Sur une droite graduée : lire l'abscisse d'un point donné ; placer un point d'abscisse donnée.$pt$, $pt$Lire l'abscisse d'un point sur une droite graduée.$pt$),
  ('5-127', '5', 'neuf', '5-046', 2, null, $pt$Placer sur une droite graduée un point d'abscisse donnée.$pt$),
  ('5-047', '5', 'origine', null, 1, $pt$Dans le plan muni d'un repère orthogonal : lire les coordonnées d'un point donné ; placer un point de coordonnées données.$pt$, $pt$Lire les coordonnées d'un point dans un repère orthogonal.$pt$),
  ('5-128', '5', 'neuf', '5-047', 2, null, $pt$Placer un point de coordonnées données dans un repère orthogonal.$pt$),
  ('5-051', '5', 'origine', null, 1, $pt$Connaitre et convertir des unités usuelles (volume et capacité).$pt$, $pt$Convertir des unités de volume (m³, dm³, cm³).$pt$),
  ('5-129', '5', 'neuf', '5-051', 2, null, $pt$Convertir des unités de contenance et passer d'une unité de volume à une unité de contenance (1 L = 1 dm³).$pt$),
  ('5-058', '5', 'origine', null, 1, $pt$Connaitre la somme des angles d'un triangle et savoir la démontrer.$pt$, $pt$Connaître la somme des angles d'un triangle (deux angles de 40° et 65° : le troisième ?).$pt$),
  ('5-130', '5', 'neuf', '5-058', 2, null, $pt$Savoir démontrer la somme des angles d'un triangle (démontre que la somme vaut 180°, sur papier).$pt$),
  ('5-062', '5', 'origine', null, 1, $pt$Définir et tracer les hauteurs dans un triangle.$pt$, $pt$Définir une hauteur d'un triangle (quel segment est la hauteur issue de A ?).$pt$),
  ('5-131', '5', 'neuf', '5-062', 2, null, $pt$Tracer une hauteur d'un triangle.$pt$),
  ('5-064', '5', 'origine', null, 1, $pt$Définir et tracer les médianes dans un triangle.$pt$, $pt$Définir une médiane d'un triangle (quel segment est la médiane issue de A ?).$pt$),
  ('5-132', '5', 'neuf', '5-064', 2, null, $pt$Tracer une médiane d'un triangle.$pt$),
  ('5-070', '5', 'origine', null, 1, $pt$Utiliser une propriété caractéristique sur les diagonales ou les côtés pour construire des parallélogrammes ou donner la nature du quadrilatère.$pt$, $pt$Donner la nature d'un quadrilatère à l'aide d'une propriété de ses côtés ou de ses diagonales.$pt$),
  ('5-133', '5', 'neuf', '5-070', 2, null, $pt$Construire un parallélogramme à l'aide d'une propriété de ses côtés ou de ses diagonales.$pt$),
  ('5-076', '5', 'origine', null, 1, $pt$Calculer des effectifs et des fréquences (exprimées sous forme décimale, fractionnaire ou de pourcentage).$pt$, $pt$Calculer des effectifs à partir de données.$pt$),
  ('5-134', '5', 'neuf', '5-076', 2, null, $pt$Calculer une fréquence (sous forme décimale, fractionnaire ou de pourcentage).$pt$),
  ('5-077', '5', 'origine', null, 1, $pt$Lire et interpréter des informations présentées sous forme de graphiques.$pt$, $pt$Lire une donnée sur un graphique (quelle est la valeur en 2020 ?).$pt$),
  ('5-135', '5', 'neuf', '5-077', 2, null, $pt$Interpréter les données d'un graphique (entre quelles années la valeur a-t-elle le plus augmenté ?).$pt$),
  ('5-109', '5', 'origine', null, 1, $pt$Lire et interpréter des informations présentées sous forme de tableaux.$pt$, $pt$Lire une donnée dans un tableau (combien d'élèves ont 12 ans ?).$pt$),
  ('5-136', '5', 'neuf', '5-109', 2, null, $pt$Interpréter les données d'un tableau (quel âge est le plus fréquent ?).$pt$),
  ('5-110', '5', 'origine', null, 1, $pt$Lire et interpréter des informations présentées sous forme de diagrammes en barres.$pt$, $pt$Lire une donnée sur un diagramme en barres (combien d'élèves ont 12 ans ?).$pt$),
  ('5-137', '5', 'neuf', '5-110', 2, null, $pt$Interpréter les données d'un diagramme en barres (quel âge est le plus fréquent ?).$pt$),
  ('5-111', '5', 'origine', null, 1, $pt$Lire et interpréter des informations présentées sous forme de diagrammes circulaires.$pt$, $pt$Lire une donnée sur un diagramme circulaire (quelle part des élèves vient à vélo ?).$pt$),
  ('5-138', '5', 'neuf', '5-111', 2, null, $pt$Interpréter les données d'un diagramme circulaire (quel moyen de transport est le plus utilisé ?).$pt$),
  ('5-080', '5', 'origine', null, 1, $pt$Calculer et interpréter la moyenne simple d'une série de données.$pt$, $pt$Calculer la moyenne simple d'une série de données (12, 15, 9, 14 → ?).$pt$),
  ('5-139', '5', 'neuf', '5-080', 2, null, $pt$Interpréter la moyenne simple d'une série de données (une moyenne de 12 veut-elle dire que chacun a 12 ?).$pt$),
  ('5-086', '5', 'origine', null, 1, $pt$Calculer, appliquer des proportions, des pourcentages.$pt$, $pt$Calculer une proportion ou un pourcentage (part du tout : 12 sur 48 = ? %).$pt$),
  ('5-140', '5', 'neuf', '5-086', 2, null, $pt$Appliquer une proportion ou un pourcentage à une quantité (25 % de 48 = ?).$pt$),
  ('5-090', '5', 'origine', null, 1, $pt$Reconnaitre une situation de proportionnalité à partir d'un tableau ou d'un graphique.$pt$, $pt$Reconnaître une situation de proportionnalité à partir d'un tableau (quotients égaux).$pt$),
  ('5-141', '5', 'neuf', '5-090', 2, null, $pt$Reconnaître une situation de proportionnalité à partir d'un graphique (points alignés avec l'origine).$pt$),
  ('5-094', '5', 'origine', null, 1, $pt$Lire et interpréter un tableau de valeurs.$pt$, $pt$Lire une donnée dans un tableau de valeurs (quelle valeur correspond à 3 ?).$pt$),
  ('5-142', '5', 'neuf', '5-094', 2, null, $pt$Interpréter les données d'un tableau de valeurs (la grandeur augmente-t-elle quand x augmente ?).$pt$),
  ('5-096', '5', 'origine', null, 1, $pt$Lire et interpréter un graphique cartésien donné par une courbe ou un nuage de points.$pt$, $pt$Lire une donnée sur un graphique cartésien, courbe ou nuage de points (quelle est l'ordonnée du point d'abscisse 2 ?).$pt$),
  ('5-143', '5', 'neuf', '5-096', 2, null, $pt$Interpréter les données d'un graphique cartésien, courbe ou nuage de points (pour quelles valeurs la grandeur dépasse-t-elle 10 ?).$pt$),
  ('4-004', '4', 'origine', null, 1, $pt$Utiliser le vocabulaire (somme, quotient, etc.) à partir d'un enchainement d'opérations dans un programme de calcul et inversement.$pt$, $pt$Nommer un enchaînement d'opérations avec le vocabulaire (somme, produit, quotient…) : (3 + 5) × 2 est « le produit de la somme de 3 et 5 par 2 ».$pt$),
  ('4-073', '4', 'neuf', '4-004', 2, null, $pt$Écrire l'enchaînement d'opérations décrit par une phrase (« le quotient de 12 par la somme de 2 et 4 » = ?).$pt$),
  ('4-009', '4', 'origine', null, 1, $pt$Calculer et représenter la fraction d'une fraction, d'un nombre, d'une quantité.$pt$, $pt$Calculer la fraction d'une fraction, d'un nombre ou d'une quantité (2/3 de 3/5 = ?).$pt$),
  ('4-074', '4', 'neuf', '4-009', 2, null, $pt$Représenter la fraction d'une fraction ou d'une quantité (par un schéma).$pt$),
  ('4-021', '4', 'origine', null, 1, $pt$Produire des formules et tester leur vraisemblance : aires de formes géométriques simples, nombres pairs/impairs, etc.$pt$, $pt$Produire des formules et tester leur vraisemblance : nombres pairs/impairs (un nombre pair : 2n).$pt$),
  ('4-075', '4', 'neuf', '4-021', 2, null, $pt$Produire des formules et tester leur vraisemblance : aires de formes géométriques simples (aire d'un triangle de base b et de hauteur h).$pt$),
  ('4-029', '4', 'origine', null, 1, $pt$Connaitre le volume de la pyramide et du cône de révolution.$pt$, $pt$Connaître le volume d'une pyramide (V = B × h / 3).$pt$),
  ('4-076', '4', 'neuf', '4-029', 2, null, $pt$Connaître le volume d'un cône de révolution (V = π r² h / 3).$pt$),
  ('4-040', '4', 'origine', null, 1, $pt$Déterminer une médiane et l'interpréter dans le cas d'une série de petit effectif présentée sous forme de données brutes.$pt$, $pt$Déterminer la médiane d'une série de petit effectif présentée sous forme de données brutes (3, 7, 8, 12, 15 → ?).$pt$),
  ('4-077', '4', 'neuf', '4-040', 2, null, $pt$Interpréter la médiane d'une série de petit effectif (que dire des valeurs si la médiane vaut 8 ?).$pt$),
  ('4-041', '4', 'origine', null, 1, $pt$Calculer et interpréter l'étendue d'une série présentée sous forme de données brutes, d'un tableau, d'un diagramme en barres, d'un diagramme circulaire.$pt$, $pt$Calculer l'étendue d'une série présentée sous forme de données brutes, d'un tableau ou d'un diagramme.$pt$),
  ('4-078', '4', 'neuf', '4-041', 2, null, $pt$Interpréter l'étendue d'une série (laquelle des deux classes a les notes les plus dispersées ?).$pt$),
  ('4-048', '4', 'origine', null, 1, $pt$Calculer la probabilité d'un évènement et de l'évènement contraire.$pt$, $pt$Calculer la probabilité d'un évènement.$pt$),
  ('4-079', '4', 'neuf', '4-048', 2, null, $pt$Calculer la probabilité de l'évènement contraire (P(non A) = 1 − P(A)).$pt$),
  ('4-057', '4', 'origine', null, 1, $pt$Rendre compte d'une augmentation ou une diminution exprimée en pourcentages au moyen d'un coefficient multiplicateur$pt$, $pt$Traduire une augmentation de t % par un coefficient multiplicateur (+ 20 % → × 1,2).$pt$),
  ('4-080', '4', 'neuf', '4-057', 2, null, $pt$Traduire une diminution de t % par un coefficient multiplicateur (− 20 % → × 0,8).$pt$),
  ('4-060', '4', 'origine', null, 1, $pt$Savoir appliquer un programme de calcul à deux (plusieurs) étapes à un nombre simple puis à une variable.$pt$, $pt$Appliquer un programme de calcul à plusieurs étapes à un nombre donné.$pt$),
  ('4-081', '4', 'neuf', '4-060', 2, null, $pt$Appliquer un programme de calcul à plusieurs étapes à une variable (écrire l'expression obtenue en fonction de x).$pt$),
  ('3-014', '3', 'origine', null, 1, $pt$Résoudre analytiquement et graphiquement une inéquation du premier degré du type ax ⩾ b.$pt$, $pt$Résoudre par le calcul une inéquation du premier degré du type ax ⩾ b (3x ⩾ 12).$pt$),
  ('3-057', '3', 'neuf', '3-014', 2, null, $pt$Résoudre graphiquement une inéquation du premier degré du type ax ⩾ b.$pt$),
  ('3-016', '3', 'origine', null, 1, $pt$Manipuler les trois identités remarquables pour développer et factoriser : a² + 2ab + b² = (a + b)² ; a² − 2ab + b² = (a − b)² ; a² − b² = (a − b)(a + b).$pt$, $pt$Développer avec les identités remarquables ((x + 3)² = ?).$pt$),
  ('3-058', '3', 'neuf', '3-016', 2, null, $pt$Factoriser avec les identités remarquables (x² − 9 = ?).$pt$),
  ('3-022', '3', 'origine', null, 1, $pt$Connaitre et appliquer le théorème de Thalès (configurations des triangles emboités et configuration dite du papillon).$pt$, $pt$Reconnaître une configuration où le théorème de Thalès s'applique : triangles emboîtés ou papillon, avec (BC) // (MN) (quelle configuration ? quels triangles ?).$pt$),
  ('3-059', '3', 'neuf', '3-022', 2, null, $pt$Écrire l'égalité des rapports du théorème de Thalès dans une configuration donnée (AM/AB = … = …).$pt$),
  ('3-060', '3', 'neuf', '3-022', 3, null, $pt$Appliquer le théorème de Thalès pour calculer une longueur (AM = 3, AB = 5, BC = 7 : calcule MN).$pt$),
  ('3-023', '3', 'origine', null, 1, $pt$Connaitre et utiliser les lignes trigonométriques dans le triangle rectangle : cosinus, sinus, tangente.$pt$, $pt$Connaître les lignes trigonométriques dans le triangle rectangle : écrire cosinus, sinus et tangente d'un angle (cos(B) = … / …).$pt$),
  ('3-061', '3', 'neuf', '3-023', 2, null, $pt$Utiliser les lignes trigonométriques pour calculer une longueur ou un angle dans un triangle rectangle (BC = 6, angle B = 40° : calcule AB).$pt$),
  ('3-030', '3', 'origine', null, 1, $pt$Construire et utiliser des boites à moustache pour représenter les valeurs de position d'une série statistique.$pt$, $pt$Construire la boîte à moustaches d'une série statistique.$pt$),
  ('3-062', '3', 'neuf', '3-030', 2, null, $pt$Lire une boîte à moustaches (médiane, quartiles, étendue).$pt$),
  ('3-036', '3', 'origine', null, 1, $pt$Traduire une augmentation ou une diminution en pourcentages.$pt$, $pt$Traduire une augmentation en pourcentage.$pt$),
  ('3-063', '3', 'neuf', '3-036', 2, null, $pt$Traduire une diminution en pourcentage.$pt$),
  ('3-041', '3', 'origine', null, 1, $pt$Définir et utiliser les fonctions linéaires.$pt$, $pt$Reconnaître une fonction linéaire (expression ou droite passant par l'origine).$pt$),
  ('3-064', '3', 'neuf', '3-041', 2, null, $pt$Utiliser une fonction linéaire donnée par son expression (calculer une image : f(3) = ?).$pt$),
  ('3-042', '3', 'origine', null, 1, $pt$Résoudre graphiquement des équations et des inéquations linéaires.$pt$, $pt$Résoudre graphiquement une équation linéaire (f(x) = 6).$pt$),
  ('3-065', '3', 'neuf', '3-042', 2, null, $pt$Résoudre graphiquement une inéquation linéaire (f(x) ⩽ 6).$pt$),
  ('3-044', '3', 'origine', null, 1, $pt$Définir et utiliser les fonctions affines.$pt$, $pt$Reconnaître une fonction affine (expression ou droite).$pt$),
  ('3-066', '3', 'neuf', '3-044', 2, null, $pt$Utiliser une fonction affine donnée par son expression (calculer une image : f(3) = ?).$pt$),
  ('3-045', '3', 'origine', null, 1, $pt$Déterminer graphiquement les coefficients d'une fonction affine.$pt$, $pt$Lire graphiquement l'ordonnée à l'origine d'une fonction affine.$pt$),
  ('3-067', '3', 'neuf', '3-045', 2, null, $pt$Lire graphiquement le coefficient directeur d'une fonction affine.$pt$),
  ('3-002', '3', 'archive', null, null, $pt$Rendre irréductible une fraction.$pt$, $pt$Rendre irréductible une fraction.$pt$),
  ('3-038', '3', 'archive', null, null, $pt$Connaitre et utiliser les fonctions linéaires.$pt$, $pt$Connaitre et utiliser les fonctions linéaires.$pt$);
-- DONNÉES:POINTS:END

-- Les points ⚙ : rangés avant leur ancre, dans l'ordre de seq ; nœud désigné par son chemin.
drop table if exists pg_temp._sc_auto;
create temporary table _sc_auto (
	code text primary key, grade text not null, seq integer not null, ancre text not null,
	nom text not null, kind text not null, exigence text not null, regime text not null,
	rubrique text, chemin text not null
);
insert into _sc_auto (code, grade, seq, ancre, nom, kind, exigence, regime, rubrique, chemin) values
-- DONNÉES:AUTOS:BEGIN
  ('6-211', '6', 1, '6-189', $pt$Repérer des relations multiplicatives simples entre des nombres : le tiers (12 est le tiers de 36).$pt$, 'savoir_faire', 'attendu', 'fluence', $pt$La proportionnalité > Automatismes$pt$, $pt$Nombres et calculs > Entiers : multiplication > triple et tiers$pt$),
  ('5-144', '5', 2, '5-048', $pt$Reconnaître un cube, un pavé représenté en perspective cavalière.$pt$, 'savoir_faire', 'attendu', 'fluence', $pt$Espace et géométrie > Représentation de l'espace > Automatismes$pt$, $pt$Géométrie > Solides > perspective cavalière$pt$),
  ('4-082', '4', 3, '4-001', $pt$Somme des opposés : savoir que la somme de deux nombres opposés est nulle (−7,5 + 7,5 = 0).$pt$, 'connaissance', 'attendu', 'fluence', $pt$Nombres et calculs > Opérations sur les nombres relatifs > Automatismes$pt$, $pt$Nombres et calculs > Relatifs : calculs > sommes$pt$),
  ('3-068', '3', 4, '3-036', $pt$Appliquer, dans des cas simples, une augmentation exprimée en pourcentage sans utiliser le coefficient multiplicateur (120 € augmenté de 20 % : 120 + 24 = 144 €).$pt$, 'savoir_faire', 'attendu', 'fluence', $pt$Proportionnalité, fonctions > Proportionnalité > Automatismes$pt$, $pt$Proportionnalité > Évolutions > variations en pourcentage$pt$),
  ('3-069', '3', 5, '3-036', $pt$Appliquer, dans des cas simples, une diminution exprimée en pourcentage sans utiliser le coefficient multiplicateur (120 € diminué de 20 % : 120 − 24 = 96 €).$pt$, 'savoir_faire', 'attendu', 'fluence', $pt$Proportionnalité, fonctions > Proportionnalité > Automatismes$pt$, $pt$Proportionnalité > Évolutions > variations en pourcentage$pt$),
  ('2-401', '2', 6, '2-235', $pt$Calculer le périmètre d'un polygone.$pt$, 'savoir_faire', 'attendu', 'fluence', $pt$Automatismes > Géométrie$pt$, $pt$Grandeurs et mesures > Périmètres$pt$),
  ('2-402', '2', 7, '2-235', $pt$Interpréter les quartiles d'une série statistique (Q1 = 12 : au moins un quart des valeurs sont inférieures ou égales à 12).$pt$, 'savoir_faire', 'attendu', 'fluence', $pt$Automatismes > Statistiques$pt$, $pt$Statistiques > Indicateurs > quartiles$pt$);
-- DONNÉES:AUTOS:END

-- Les références d'automatismes (point, grade référent) des points en jeu : avant / après.
drop table if exists pg_temp._sc_ref;
create temporary table _sc_ref (
	code text not null, grade text not null, avant boolean not null, apres boolean not null,
	primary key (code, grade)
);
insert into _sc_ref (code, grade, avant, apres) values
-- DONNÉES:REFS:BEGIN
  ('2-280', '1_GEN', false, true),
  ('2-280', '1_SPE', false, true),
  ('2-280', '1_TECHNO', false, true),
  ('2-280', '2', false, true),
  ('2-280', 'T_COMP', false, true),
  ('2-280', 'T_SPE', false, true),
  ('2-280', 'T_TECHNO', true, true),
  ('2-382', '1_GEN', true, true),
  ('2-382', '1_SPE', true, true),
  ('2-382', '1_TECHNO', true, true),
  ('2-382', '2', false, true),
  ('2-382', 'T_COMP', true, true),
  ('2-382', 'T_SPE', true, true),
  ('2-401', '1_GEN', false, true),
  ('2-401', '1_SPE', false, true),
  ('2-401', '1_TECHNO', false, true),
  ('2-401', '2', false, true),
  ('2-401', 'T_COMP', false, true),
  ('2-401', 'T_SPE', false, true),
  ('2-402', '1_GEN', false, true),
  ('2-402', '1_SPE', false, true),
  ('2-402', '1_TECHNO', false, true),
  ('2-402', '2', false, true),
  ('2-402', 'T_COMP', false, true),
  ('2-402', 'T_SPE', false, true),
  ('3-014', '1_GEN', true, true),
  ('3-014', '1_SPE', true, true),
  ('3-014', '1_TECHNO', true, true),
  ('3-014', '2', true, true),
  ('3-014', 'T_COMP', true, true),
  ('3-014', 'T_SPE', true, true),
  ('3-016', '1_GEN', true, true),
  ('3-016', '1_SPE', true, true),
  ('3-016', '1_TECHNO', true, true),
  ('3-016', '2', true, true),
  ('3-016', 'T_COMP', true, true),
  ('3-016', 'T_SPE', true, true),
  ('3-016', 'T_TECHNO', true, true),
  ('3-022', '1_GEN', true, false),
  ('3-022', '1_SPE', true, false),
  ('3-022', '1_TECHNO', true, false),
  ('3-022', '2', true, false),
  ('3-022', 'T_COMP', true, false),
  ('3-022', 'T_SPE', true, false),
  ('3-023', '1_GEN', true, true),
  ('3-023', '1_SPE', true, true),
  ('3-023', '1_TECHNO', true, true),
  ('3-023', '2', true, true),
  ('3-023', 'T_COMP', true, true),
  ('3-023', 'T_SPE', true, true),
  ('3-030', '1_GEN', true, false),
  ('3-030', '1_SPE', true, false),
  ('3-030', '1_TECHNO', true, false),
  ('3-030', '2', true, false),
  ('3-030', 'T_COMP', true, false),
  ('3-030', 'T_SPE', true, false),
  ('3-030', 'T_TECHNO', true, false),
  ('3-041', '1_GEN', true, true),
  ('3-041', '1_SPE', true, true),
  ('3-041', '1_TECHNO', true, true),
  ('3-041', '2', true, true),
  ('3-041', 'T_COMP', true, true),
  ('3-041', 'T_SPE', true, true),
  ('3-044', '1_GEN', true, true),
  ('3-044', '1_SPE', true, true),
  ('3-044', '1_TECHNO', true, true),
  ('3-044', '2', true, true),
  ('3-044', 'T_COMP', true, true),
  ('3-044', 'T_SPE', true, true),
  ('3-058', '1_GEN', false, true),
  ('3-058', '1_SPE', false, true),
  ('3-058', '1_TECHNO', false, true),
  ('3-058', '2', false, true),
  ('3-058', 'T_COMP', false, true),
  ('3-058', 'T_SPE', false, true),
  ('3-058', 'T_TECHNO', false, true),
  ('3-060', '1_GEN', false, true),
  ('3-060', '1_SPE', false, true),
  ('3-060', '1_TECHNO', false, true),
  ('3-060', '2', false, true),
  ('3-060', 'T_COMP', false, true),
  ('3-060', 'T_SPE', false, true),
  ('3-061', '1_GEN', false, true),
  ('3-061', '1_SPE', false, true),
  ('3-061', '1_TECHNO', false, true),
  ('3-061', '2', false, true),
  ('3-061', 'T_COMP', false, true),
  ('3-061', 'T_SPE', false, true),
  ('3-062', '1_GEN', false, true),
  ('3-062', '1_SPE', false, true),
  ('3-062', '1_TECHNO', false, true),
  ('3-062', '2', false, true),
  ('3-062', 'T_COMP', false, true),
  ('3-062', 'T_SPE', false, true),
  ('3-062', 'T_TECHNO', false, true),
  ('4-021', '3', true, true),
  ('4-029', '1_GEN', true, true),
  ('4-029', '1_SPE', true, true),
  ('4-029', '1_TECHNO', true, true),
  ('4-029', '2', true, true),
  ('4-029', '3', true, true),
  ('4-029', 'T_COMP', true, true),
  ('4-029', 'T_SPE', true, true),
  ('4-040', '1_GEN', true, true),
  ('4-040', '1_SPE', true, true),
  ('4-040', '1_TECHNO', true, true),
  ('4-040', '2', true, true),
  ('4-040', '3', true, true),
  ('4-040', 'T_COMP', true, true),
  ('4-040', 'T_SPE', true, true),
  ('4-041', '3', true, true),
  ('4-048', '1_GEN', true, true),
  ('4-048', '1_SPE', true, true),
  ('4-048', '1_TECHNO', true, true),
  ('4-048', '2', true, true),
  ('4-048', 'T_COMP', true, true),
  ('4-048', 'T_SPE', true, true),
  ('4-057', '1_GEN', true, true),
  ('4-057', '1_SPE', true, true),
  ('4-057', '1_TECHNO', true, true),
  ('4-057', '2', true, true),
  ('4-057', '3', true, true),
  ('4-057', 'T_COMP', true, true),
  ('4-057', 'T_SPE', true, true),
  ('4-057', 'T_TECHNO', true, true),
  ('4-076', '1_GEN', false, true),
  ('4-076', '1_SPE', false, true),
  ('4-076', '1_TECHNO', false, true),
  ('4-076', '2', false, true),
  ('4-076', '3', false, true),
  ('4-076', 'T_COMP', false, true),
  ('4-076', 'T_SPE', false, true),
  ('4-077', '1_GEN', false, true),
  ('4-077', '1_SPE', false, true),
  ('4-077', '1_TECHNO', false, true),
  ('4-077', '2', false, true),
  ('4-077', 'T_COMP', false, true),
  ('4-077', 'T_SPE', false, true),
  ('4-079', '1_GEN', false, true),
  ('4-079', '1_SPE', false, true),
  ('4-079', '1_TECHNO', false, true),
  ('4-079', '2', false, true),
  ('4-079', 'T_COMP', false, true),
  ('4-079', 'T_SPE', false, true),
  ('4-080', '1_GEN', false, true),
  ('4-080', '1_SPE', false, true),
  ('4-080', '1_TECHNO', false, true),
  ('4-080', '2', false, true),
  ('4-080', '3', false, true),
  ('4-080', 'T_COMP', false, true),
  ('4-080', 'T_SPE', false, true),
  ('4-080', 'T_TECHNO', false, true),
  ('5-010', '3', true, true),
  ('5-013', '4', true, true),
  ('5-016', '1_GEN', true, true),
  ('5-016', '1_SPE', true, true),
  ('5-016', '1_TECHNO', true, true),
  ('5-016', '2', true, true),
  ('5-016', '3', true, true),
  ('5-016', '4', true, true),
  ('5-016', 'T_COMP', true, true),
  ('5-016', 'T_SPE', true, true),
  ('5-025', '1_GEN', true, true),
  ('5-025', '1_SPE', true, true),
  ('5-025', '1_TECHNO', true, true),
  ('5-025', '2', true, true),
  ('5-025', '3', false, true),
  ('5-025', '4', true, true),
  ('5-025', 'T_COMP', true, true),
  ('5-025', 'T_SPE', true, true),
  ('5-025', 'T_TECHNO', true, true),
  ('5-026', '3', true, true),
  ('5-026', '4', true, true),
  ('5-034', '4', false, true),
  ('5-045', '3', true, true),
  ('5-045', '4', true, true),
  ('5-047', '1_GEN', true, true),
  ('5-047', '1_SPE', true, true),
  ('5-047', '1_TECHNO', true, true),
  ('5-047', '2', true, true),
  ('5-047', '3', true, true),
  ('5-047', '4', true, true),
  ('5-047', 'T_COMP', true, true),
  ('5-047', 'T_SPE', true, true),
  ('5-051', '1_GEN', true, true),
  ('5-051', '1_SPE', true, true),
  ('5-051', '1_TECHNO', true, true),
  ('5-051', '2', true, true),
  ('5-051', 'T_COMP', true, true),
  ('5-051', 'T_SPE', true, true),
  ('5-051', 'T_TECHNO', true, true),
  ('5-060', '4', false, true),
  ('5-062', '4', true, true),
  ('5-064', '4', true, true),
  ('5-066', '4', false, true),
  ('5-067', '4', false, true),
  ('5-070', '4', true, true),
  ('5-076', '4', true, true),
  ('5-077', '1_GEN', true, true),
  ('5-077', '1_SPE', true, true),
  ('5-077', '1_TECHNO', true, true),
  ('5-077', '2', true, true),
  ('5-077', 'T_COMP', true, true),
  ('5-077', 'T_SPE', true, true),
  ('5-077', 'T_TECHNO', true, true),
  ('5-080', '3', true, true),
  ('5-080', '4', true, true),
  ('5-096', '1_GEN', true, true),
  ('5-096', '1_SPE', true, true),
  ('5-096', '1_TECHNO', true, true),
  ('5-096', '2', true, true),
  ('5-096', 'T_COMP', true, true),
  ('5-096', 'T_SPE', true, true),
  ('5-096', 'T_TECHNO', true, true),
  ('5-110', '1_GEN', true, true),
  ('5-110', '1_SPE', true, true),
  ('5-110', '1_TECHNO', true, true),
  ('5-110', '2', true, true),
  ('5-110', 'T_COMP', true, true),
  ('5-110', 'T_SPE', true, true),
  ('5-110', 'T_TECHNO', true, true),
  ('5-111', '1_GEN', true, true),
  ('5-111', '1_SPE', true, true),
  ('5-111', '1_TECHNO', true, true),
  ('5-111', '2', true, true),
  ('5-111', 'T_COMP', true, true),
  ('5-111', 'T_SPE', true, true),
  ('5-111', 'T_TECHNO', true, true),
  ('5-112', '1_GEN', false, true),
  ('5-112', '1_SPE', false, true),
  ('5-112', '1_TECHNO', false, true),
  ('5-112', 'T_COMP', false, true),
  ('5-112', 'T_SPE', false, true),
  ('5-112', 'T_TECHNO', false, true),
  ('5-113', '1_GEN', false, true),
  ('5-113', '1_SPE', false, true),
  ('5-113', '1_TECHNO', false, true),
  ('5-113', 'T_COMP', false, true),
  ('5-113', 'T_SPE', false, true),
  ('5-113', 'T_TECHNO', false, true),
  ('5-114', '1_GEN', false, true),
  ('5-114', '1_SPE', false, true),
  ('5-114', '1_TECHNO', false, true),
  ('5-114', 'T_COMP', false, true),
  ('5-114', 'T_SPE', false, true),
  ('5-114', 'T_TECHNO', false, true),
  ('5-119', '3', false, true),
  ('5-121', '1_GEN', false, true),
  ('5-121', '1_SPE', false, true),
  ('5-121', '1_TECHNO', false, true),
  ('5-121', '2', false, true),
  ('5-121', '3', false, true),
  ('5-121', '4', false, true),
  ('5-121', 'T_COMP', false, true),
  ('5-121', 'T_SPE', false, true),
  ('5-123', '3', false, true),
  ('5-123', '4', false, true),
  ('5-126', '3', false, true),
  ('5-126', '4', false, true),
  ('5-128', '1_GEN', false, true),
  ('5-128', '1_SPE', false, true),
  ('5-128', '1_TECHNO', false, true),
  ('5-128', '2', false, true),
  ('5-128', '3', false, true),
  ('5-128', '4', false, true),
  ('5-128', 'T_COMP', false, true),
  ('5-128', 'T_SPE', false, true),
  ('5-129', '1_GEN', false, true),
  ('5-129', '1_SPE', false, true),
  ('5-129', '1_TECHNO', false, true),
  ('5-129', '2', false, true),
  ('5-129', 'T_COMP', false, true),
  ('5-129', 'T_SPE', false, true),
  ('5-129', 'T_TECHNO', false, true),
  ('5-134', '4', false, true),
  ('5-135', '1_GEN', false, true),
  ('5-135', '1_SPE', false, true),
  ('5-135', '1_TECHNO', false, true),
  ('5-135', '2', false, true),
  ('5-135', 'T_COMP', false, true),
  ('5-135', 'T_SPE', false, true),
  ('5-137', '1_GEN', false, true),
  ('5-137', '1_SPE', false, true),
  ('5-137', '1_TECHNO', false, true),
  ('5-137', '2', false, true),
  ('5-137', 'T_COMP', false, true),
  ('5-137', 'T_SPE', false, true),
  ('5-138', '1_GEN', false, true),
  ('5-138', '1_SPE', false, true),
  ('5-138', '1_TECHNO', false, true),
  ('5-138', '2', false, true),
  ('5-138', 'T_COMP', false, true),
  ('5-138', 'T_SPE', false, true),
  ('5-139', '1_GEN', false, true),
  ('5-139', '1_SPE', false, true),
  ('5-139', '1_TECHNO', false, true),
  ('5-139', '2', false, true),
  ('5-139', 'T_COMP', false, true),
  ('5-139', 'T_SPE', false, true),
  ('5-143', '1_GEN', false, true),
  ('5-143', '1_SPE', false, true),
  ('5-143', '1_TECHNO', false, true),
  ('5-143', '2', false, true),
  ('5-143', 'T_COMP', false, true),
  ('5-143', 'T_SPE', false, true),
  ('6-133', '5', true, true),
  ('6-135', '5', true, true),
  ('6-178', '5', true, true),
  ('6-181', '5', true, true),
  ('6-205', '5', false, true),
  ('6-208', '5', false, true),
  ('6-209', '5', false, true),
  ('CE2-020', '5', true, false),
  ('CE2-022', '4', true, true),
  ('CE2-022', '6', true, true),
  ('CE2-084', '5', false, true),
  ('CE2-092', '4', false, true),
  ('CE2-092', '6', false, true),
  ('CM1-045', '6', false, true),
  ('CM2-008', '6', true, true),
  ('CM2-013', '6', true, false),
  ('CM2-018', '6', false, true),
  ('CM2-030', '6', true, true),
  ('CM2-036', '4', true, true),
  ('CM2-036', '5', true, true),
  ('CM2-036', '6', false, true),
  ('CM2-050', '6', false, true),
  ('CM2-107', '6', true, true),
  ('CM2-123', '6', true, true),
  ('CM2-124', '6', true, true),
  ('CM2-125', '6', true, true),
  ('CM2-130', '6', false, true),
  ('CM2-132', '6', false, true),
  ('CM2-141', '6', false, true),
  ('CM2-149', '4', false, true),
  ('CM2-149', '5', false, true),
  ('CM2-149', '6', false, true);
-- DONNÉES:REFS:END

-- Les grades touchés : effectif avant / après, trou connu de l'ordre d'affichage avant.
drop table if exists pg_temp._sc_grade;
create temporary table _sc_grade (
	grade text primary key, n_avant integer not null, n_apres integer not null, trou_avant integer
);
insert into _sc_grade (grade, n_avant, n_apres, trou_avant) values
-- DONNÉES:GRADES:BEGIN
  ('CP', 72, 84, null),
  ('CE1', 89, 107, null),
  ('CE2', 83, 97, null),
  ('CM1', 138, 171, null),
  ('CM2', 124, 158, null),
  ('6', 101, 111, null),
  ('5', 114, 143, null),
  ('4', 72, 82, null),
  ('3', 55, 68, null),
  ('2', 199, 201, 132);
-- DONNÉES:GRADES:END

-- Le chemin de chaque nœud de l'arbre (« Branche > Notion > sous-notion »).
drop table if exists pg_temp._sc_chemin;
create temporary table _sc_chemin as
with recursive c as (
	select id, kind, archived_at, name::text as chemin
	  from public.classification_nodes where parent_id is null
	union all
	select n.id, n.kind, n.archived_at, c.chemin || ' > ' || n.name
	  from public.classification_nodes n join c on n.parent_id = c.id
)
select id, kind, archived_at, chemin from c;

-- ---- 2. Gardes : l'état attendu, sinon RIEN ne change ---------------------------
do $garde$
declare
	v_detail text;
begin
	-- 2a. chaque origine (et chaque point à archiver) existe avec son libellé actuel exact,
	--     son grade, un nœud, sans objectif, non archivé
	select string_agg(s.code, ', ' order by s.code) into v_detail
	  from _sc_point s
	 where s.role in ('origine', 'archive')
	   and not exists (
		select 1 from public.curriculum_points p
		 where p.code = s.code and p.name = s.ancien_nom and p.grade = s.grade
		   and p.node_id is not null and p.objective_id is null and p.archived_at is null);
	if v_detail is not null then
		raise exception 'état inattendu : points d''origine absents ou modifiés : %', v_detail;
	end if;
	-- 2b. aucun usage hors des références d'automatismes (celles-ci sont gardées en 2e)
	select string_agg(s.code, ', ' order by s.code) into v_detail
	  from _sc_point s join public.curriculum_points p on p.code = s.code
	 where s.role in ('origine', 'archive')
	   and (exists (select 1 from public.question_template_points u where u.point_id = p.id)
	     or exists (select 1 from public.exercise_curriculum_points u where u.point_id = p.id)
	     or exists (select 1 from public.student_point_state u where u.point_id = p.id)
	     or exists (select 1 from public.journal_entry_points u where u.point_id = p.id)
	     or exists (select 1 from public.srs_anti_fraud_flags u where u.capacity_point_id = p.id));
	if v_detail is not null then
		raise exception 'état inattendu : usages déjà accrochés aux points à scinder : % (leur partage entre les moitiés n''est pas tranché)', v_detail;
	end if;
	-- 2c. aucun code neuf n'existe
	select string_agg(p.code, ', ' order by p.code) into v_detail
	  from public.curriculum_points p
	 where p.code in (select code from _sc_point where role = 'neuf' union all select code from _sc_auto);
	if v_detail is not null then
		raise exception 'état inattendu : codes neufs déjà pris : %', v_detail;
	end if;
	-- 2d. chaque point ⚙ : un nœud unique et rangeable (notion ou sous-notion, non archivé),
	--     une ancre du même grade
	select string_agg(a.code, ', ' order by a.code) into v_detail
	  from _sc_auto a
	 where (select count(*) from _sc_chemin c
	         where c.chemin = a.chemin and c.archived_at is null and c.kind in ('notion', 'subnotion')) <> 1
	    or not exists (select 1 from public.curriculum_points p
	                    where p.code = a.ancre and p.grade = a.grade and p.archived_at is null);
	if v_detail is not null then
		raise exception 'état inattendu : nœud ou ancre introuvable pour les points ⚙ : %', v_detail;
	end if;
	-- 2e. les références d'automatismes des points en jeu sont EXACTEMENT celles attendues
	--     (« + » : en trop en base, « - » : absente de la base)
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || p.code || '§' || a.grade as r
		   from public.curriculum_point_automatismes a
		   join public.curriculum_points p on p.id = a.point_id
		  where p.code in (select code from _sc_ref union select code from _sc_point)
		    and not exists (select 1 from _sc_ref r where r.code = p.code and r.grade = a.grade and r.avant))
		union all
		(select '-' || r.code || '§' || r.grade
		   from _sc_ref r
		  where r.avant
		    and not exists (select 1 from public.curriculum_point_automatismes a
		                      join public.curriculum_points p on p.id = a.point_id
		                     where p.code = r.code and a.grade = r.grade))) d;
	if v_detail is not null then
		raise exception 'état inattendu : références d''automatismes différentes de celles attendues : %', v_detail;
	end if;
	-- 2f. l'ordre d'affichage de chaque grade est celui attendu (1..N, ou 1..N+1 et le trou connu)
	select string_agg(g.grade, ', ' order by g.grade) into v_detail
	  from _sc_grade g
	 where (select count(*) from public.curriculum_points p where p.grade = g.grade) <> g.n_avant
	    or (select count(distinct display_order) from public.curriculum_points p where p.grade = g.grade) <> g.n_avant
	    or (select min(display_order) from public.curriculum_points p where p.grade = g.grade) <> 1
	    or (select max(display_order) from public.curriculum_points p where p.grade = g.grade)
	       <> g.n_avant + case when g.trou_avant is null then 0 else 1 end
	    or exists (select 1 from public.curriculum_points p
	                where p.grade = g.grade and p.display_order = g.trou_avant);
	if v_detail is not null then
		raise exception 'état inattendu : effectif ou ordre d''affichage inattendu avant la scission : %', v_detail;
	end if;
end $garde$;

-- ---- 3. Les points neufs : moitiés (copient leur origine), puis points ⚙ -------------
-- display_order provisoire = celui de l'origine (ou de l'ancre) ; la renumérotation (4) les range.
insert into public.curriculum_points
	(code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id,
	 objective_id, rang, archived_at)
select s.code, s.nom, o.kind, o.exigence, o.regime_acquisition, o.rubrique, o.grade,
       o.display_order, o.node_id, o.objective_id, o.rang, o.archived_at
  from _sc_point s join public.curriculum_points o on o.code = s.origine
 where s.role = 'neuf';

insert into public.curriculum_points
	(code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
select a.code, a.nom, a.kind, a.exigence, a.regime, a.rubrique, a.grade, x.display_order, c.id
  from _sc_auto a
  join public.curriculum_points x on x.code = a.ancre
  join _sc_chemin c on c.chemin = a.chemin and c.archived_at is null and c.kind in ('notion', 'subnotion');

-- ---- 4. Renuméroter chaque grade touché : 1..N, moitiés juste après l'origine (par rang),
--         points ⚙ juste avant leur ancre (par seq) --------------------------------------
update public.curriculum_points p set display_order = r.o
  from (select q.id,
               row_number() over (
                 partition by q.grade
                 order by q.display_order,
                          coalesce(s.rang, case when a.code is not null then 0 else 1 end),
                          coalesce(a.seq, 0)) as o
          from public.curriculum_points q
          left join _sc_point s on s.code = q.code and s.role = 'neuf'
          left join _sc_auto a on a.code = q.code
         where q.grade in (select grade from _sc_grade)) r
 where p.id = r.id and p.display_order <> r.o;

-- ---- 5. Les origines prennent le libellé de leur 1re moitié ; deux points archivés ------
update public.curriculum_points p set name = s.nom
  from _sc_point s
 where s.role = 'origine' and p.code = s.code and p.name = s.ancien_nom;

update public.curriculum_points p set archived_at = now()
  from _sc_point s
 where s.role = 'archive' and p.code = s.code and p.archived_at is null;

-- ---- 6. Références d'automatismes : retirer celles qui ne sont plus, poser les nouvelles --
delete from public.curriculum_point_automatismes a
 using public.curriculum_points p, _sc_ref r
 where p.id = a.point_id and r.code = p.code and r.grade = a.grade and r.avant and not r.apres;

insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, r.grade
  from _sc_ref r join public.curriculum_points p on p.code = r.code
 where r.apres and not r.avant;

-- ---- 7. Vérifications (la migration échoue si le compte n'y est pas) ----------------
do $check$
declare
	v_detail text;
	v_n integer;
begin
	-- effectifs et ordres 1..N par grade
	select string_agg(g.grade, ', ' order by g.grade) into v_detail
	  from _sc_grade g
	 where (select count(*) from public.curriculum_points p where p.grade = g.grade) <> g.n_apres
	    or (select count(distinct display_order) from public.curriculum_points p where p.grade = g.grade) <> g.n_apres
	    or (select min(display_order) from public.curriculum_points p where p.grade = g.grade) <> 1
	    or (select max(display_order) from public.curriculum_points p where p.grade = g.grade) <> g.n_apres;
	if v_detail is not null then
		raise exception 'scission : effectif ou ordre incohérent : %', v_detail;
	end if;
	-- chaque moitié neuve : son libellé, les attributs de son origine, juste après elle
	select count(*) into v_n
	  from _sc_point s
	  join public.curriculum_points n on n.code = s.code and n.name = s.nom
	  join public.curriculum_points o on o.code = s.origine
	 where s.role = 'neuf'
	   and n.display_order = o.display_order + s.rang - 1 and n.grade = o.grade
	   and n.node_id = o.node_id and n.rubrique is not distinct from o.rubrique
	   and n.kind = o.kind and n.exigence = o.exigence
	   and n.regime_acquisition = o.regime_acquisition and n.archived_at is null;
	if v_n <> 168 then
		raise exception 'scission : moitiés neuves conformes : %/168', v_n;
	end if;
	-- chaque origine porte le libellé de sa 1re moitié
	select count(*) into v_n
	  from _sc_point s join public.curriculum_points p on p.code = s.code and p.name = s.nom
	 where s.role = 'origine' and p.archived_at is null;
	if v_n <> 149 then
		raise exception 'scission : origines renommées : %/149', v_n;
	end if;
	-- les points ⚙ : libellé, valeurs, nœud, juste avant leur ancre
	select count(*) into v_n
	  from _sc_auto a
	  join public.curriculum_points p on p.code = a.code and p.name = a.nom
	  join public.curriculum_points x on x.code = a.ancre
	  join _sc_chemin c on c.id = p.node_id and c.chemin = a.chemin
	 where p.grade = a.grade and p.kind = a.kind and p.exigence = a.exigence
	   and p.regime_acquisition = a.regime and p.rubrique is not distinct from a.rubrique
	   and p.display_order < x.display_order
	   and x.display_order - p.display_order <= (select count(*) from _sc_auto b where b.ancre = a.ancre);
	if v_n <> 7 then
		raise exception 'scission : points ⚙ conformes : %/7', v_n;
	end if;
	-- deux points archivés, libellé inchangé
	select count(*) into v_n
	  from _sc_point s join public.curriculum_points p on p.code = s.code
	 where s.role = 'archive' and p.archived_at is not null and p.name = s.nom;
	if v_n <> 2 then
		raise exception 'scission : points archivés : %/2', v_n;
	end if;
	-- les références des points en jeu sont EXACTEMENT celles attendues
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || p.code || '§' || a.grade as r
		   from public.curriculum_point_automatismes a
		   join public.curriculum_points p on p.id = a.point_id
		  where p.code in (select code from _sc_ref union select code from _sc_point union select code from _sc_auto)
		    and not exists (select 1 from _sc_ref r where r.code = p.code and r.grade = a.grade and r.apres))
		union all
		(select '-' || r.code || '§' || r.grade
		   from _sc_ref r
		  where r.apres
		    and not exists (select 1 from public.curriculum_point_automatismes a
		                      join public.curriculum_points p on p.id = a.point_id
		                     where p.code = r.code and a.grade = r.grade))) d;
	if v_detail is not null then
		raise exception 'scission : références d''automatismes inattendues : %', v_detail;
	end if;
	select count(*) into v_n from _sc_ref where avant;
	if v_n <> 167 then raise exception 'scission : références avant : %/167', v_n; end if;
	select count(*) into v_n from _sc_ref where apres;
	if v_n <> 322 then raise exception 'scission : références après : %/322', v_n; end if;
end $check$;

drop table _sc_point, _sc_auto, _sc_ref, _sc_grade, _sc_chemin;
