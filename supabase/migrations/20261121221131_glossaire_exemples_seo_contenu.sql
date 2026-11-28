-- ============================================================================
-- Chantier « seo » : un exemple à part sur 14 pages du glossaire
-- ============================================================================
-- Ces 14 pages (`/glossaire/<adresse>`) sont celles du glossaire qui sortent en 1re ou 2e page
-- de Google avec 10 affichages ou plus en 28 jours (export Search Console du 2026-11-16). Elles
-- n'avaient qu'une définition. Chacune reçoit un exemple (`exemples`), au niveau du terme, relu
-- et validé par David le 2026-11-21 (« tout OK »). Les définitions ne changent pas.
--
-- Garde : exactement 14 entrées visées (terme principal, non masqué, sans exemple), sinon la
-- migration échoue sans rien changer : elle n'écrase jamais un exemple déjà saisi. Le trigger
-- `dictionary_entries_keep_version` garde la version précédente de chaque entrée (auteur vide :
-- migration) et pose `updated_at` : les 14 pages changent de `lastmod` dans le sitemap, accepté.
--
-- Données d'élèves : aucune.
--
-- Accès : personne ne gagne ni ne perd d'accès, aucune règle (policy) ne change. Tout visiteur
-- lit 14 exemples de plus sur des pages déjà publiques. Question posée à David avant le SQL, le
-- 2026-11-21, avec cette réponse proposée ; sa réponse : « je suis tes recos ».
--
-- Rollback (aucune donnée d'élève). Il retire l'exemple des 14 entrées. Bloc éprouvé par le test
-- d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL
-- en un seul envoi) :
-- ROLLBACK:BEGIN
-- update public.dictionary_entries set exemples = null
--  where not hidden and derived_from is null and exemples is not null
--    and slug in (
--                 'strictement-positif',
--                 'partage-proportionnel',
--                 'concourantes',
--                 'representant-vecteur',
--                 'nombre-non-decimal',
--                 'compris-entre',
--                 'tirage-sans-remise',
--                 'tirage-avec-remise',
--                 'nombre-mixte',
--                 'successeur',
--                 'disjoints',
--                 'distance-a-zero',
--                 'peu-probable',
--                 'angle-nul');
-- ROLLBACK:END
-- ============================================================================

do $$
declare
	visees integer;
begin
	select count(*) into visees
	  from public.dictionary_entries
	 where not hidden and derived_from is null and exemples is null
	   and slug in (
		'strictement-positif',
		'partage-proportionnel',
		'concourantes',
		'representant-vecteur',
		'nombre-non-decimal',
		'compris-entre',
		'tirage-sans-remise',
		'tirage-avec-remise',
		'nombre-mixte',
		'successeur',
		'disjoints',
		'distance-a-zero',
		'peu-probable',
		'angle-nul');
	if visees <> 14 then
		raise exception 'exemples du glossaire : 14 entrées sans exemple attendues, % trouvées', visees;
	end if;
end;
$$;

update public.dictionary_entries e
   set exemples = jsonb_build_object(
		'items', jsonb_build_array(jsonb_build_object('grade', e.grade, 'content', v.content)))
  from (values
		('strictement-positif',
		 'La longueur d''un côté d''un triangle est un nombre strictement positif : elle ne peut être ni négative ni nulle. Pour dire que $x$ est strictement positif, on écrit $x > 0$.'),
		('partage-proportionnel',
		 'Trois amis repeignent une clôture : ils travaillent $2$ h, $3$ h et $5$ h, soit $10$ h en tout. Ils partagent $400$ € proportionnellement à leurs heures : une heure vaut $400 \div 10 = 40$ €, et ils reçoivent $80$ €, $120$ € et $200$ €.'),
		('concourantes',
		 'Les rayons d''une roue de vélo sont portés par des droites concourantes : elles passent toutes par le centre de la roue. Trois droites qui dessinent un triangle ne sont pas concourantes : elles se coupent deux à deux, en trois points différents.'),
		('representant-vecteur',
		 'Dans un repère, la flèche de $A(1 ; 1)$ à $B(4 ; 3)$ et celle de $C(0 ; -2)$ à $D(3 ; 0)$ avancent toutes les deux de $3$ unités et montent de $2$ unités : ce sont deux représentants du même vecteur, et $\overrightarrow{AB} = \overrightarrow{CD}$.'),
		('nombre-non-decimal',
		 '$\frac{1}{4} = 0{,}25$ est un nombre décimal : son écriture à virgule s''arrête. $\frac{2}{3} = 0{,}666\ldots$ et $\frac{1}{7} = 0{,}142857\ldots$ sont des nombres non décimaux, tout comme le nombre $\pi$.'),
		('compris-entre',
		 '$7$ est compris entre $5$ et $10$. $12$ n''est pas compris entre $5$ et $10$ : il est plus grand que $10$.'),
		('tirage-sans-remise',
		 'Une urne contient $3$ boules rouges et $2$ boules bleues. On tire deux boules sans remise : la probabilité d''obtenir deux rouges est $\frac{3}{5} \times \frac{2}{4} = \frac{3}{10}$.'),
		('tirage-avec-remise',
		 'Une urne contient $3$ boules rouges et $2$ boules bleues. On tire deux boules avec remise : la probabilité d''obtenir deux rouges est $\frac{3}{5} \times \frac{3}{5} = \frac{9}{25}$. Si on répète $n$ tirages avec remise, le nombre de boules rouges obtenues suit la loi binomiale de paramètres $n$ et $\frac{3}{5}$.'),
		('nombre-mixte',
		 '$\frac{7}{2} = 3 + \frac{1}{2}$ : dans $7$ demis, il y a $3$ unités et il reste $1$ demi. Dans la vie courante, $1$ heure et quart, c''est $1 + \frac{1}{4}$ heure, soit $\frac{5}{4}$ d''heure.'),
		('successeur',
		 'Le successeur de $99$ est $100$ ; celui de $-3$ est $-2$. Le nombre entier qui vient juste avant s''appelle le prédécesseur : celui de $7$ est $6$, celui de $n$ est $n - 1$.'),
		('disjoints',
		 'On lance un dé. $A = \{1 ; 3 ; 5\}$ et $B = \{2 ; 4\}$ sont disjoints, donc $P(A \cup B) = P(A) + P(B) = \frac{3}{6} + \frac{2}{6} = \frac{5}{6}$. En revanche, $A$ et $C = \{3 ; 6\}$ ne sont pas disjoints : $A \cap C = \{3\}$.'),
		('distance-a-zero',
		 'La distance à zéro de $-7{,}5$ est $7{,}5$ ; celle de $0$ est $0$. Deux nombres opposés, comme $-4$ et $4$, ont la même distance à zéro. De deux nombres négatifs, le plus petit est celui qui a la plus grande distance à zéro : $-9 < -2$.'),
		('peu-probable',
		 'Obtenir $6$ dix fois de suite en lançant un dé est peu probable, mais pas impossible. Obtenir pile en lançant une pièce n''est pas peu probable : on a une chance sur deux.'),
		('angle-nul',
		 'À midi, les deux aiguilles d''une horloge sont l''une sur l''autre : elles forment un angle nul. À ne pas confondre avec l''angle plein, qui mesure $360°$ : ses côtés sont aussi confondus, mais on a fait un tour complet.')
	) as v(slug, content)
 where e.slug = v.slug and not e.hidden and e.derived_from is null and e.exemples is null;
