-- ============================================================================
-- Chantier « seo », lot 2 : un exemple à part sur 42 autres pages du glossaire
-- ============================================================================
-- Ces 42 pages (`/glossaire/<adresse>`) sortent en 1re ou 2e page de Google (place moyenne ≤ 20,
-- export Search Console du 2026-11-16), mais avec moins de 10 affichages en 28 jours. Le lot 1
-- (20261121221131) a traité les 14 pages à 10 affichages ou plus ; la 43e page du relevé, le
-- chiffre de César, avait déjà un exemple. Chacune reçoit un exemple (`exemples`), au niveau du
-- terme, relu et validé par David le 2026-11-23 (« je valide tout »). Les définitions ne changent pas.
--
-- Garde : exactement 42 entrées visées (terme principal, non masqué, sans exemple), sinon la
-- migration échoue sans rien changer : elle n'écrase jamais un exemple déjà saisi. Le trigger
-- `dictionary_entries_keep_version` garde la version précédente de chaque entrée (auteur vide :
-- migration) et pose `updated_at` : les 42 pages changent de `lastmod` dans le sitemap, accepté.
--
-- Données d'élèves : aucune.
--
-- Accès : personne ne gagne ni ne perd d'accès, aucune règle (policy) ne change. Tout visiteur
-- lit 42 exemples de plus sur des pages déjà publiques. Question posée à David avant le SQL, le
-- 2026-11-23, avec cette réponse proposée ; sa réponse : « je valide tout ».
--
-- Rollback (aucune donnée d'élève). Il retire l'exemple des 42 entrées, même modifié depuis dans
-- l'admin (la version précédente reste dans l'historique). Bloc éprouvé par le test d'intégration,
-- à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- update public.dictionary_entries set exemples = null
--  where not hidden and derived_from is null and exemples is not null
--    and slug in (
--                 'propriete-de-linearite',
--                 'ensemble-des-solutions',
--                 'operation-inverse',
--                 'une-chance-sur-deux',
--                 'intercaler',
--                 'projete-orthogonal',
--                 'angle-plein',
--                 'diviseur-commun',
--                 'programme-de-calcul',
--                 'quadruple',
--                 'vecteurs-egaux',
--                 'propriete-caracteristique',
--                 'cas-favorable',
--                 'egalite-a-trous',
--                 'approximation-lineaire',
--                 'escalier-suite',
--                 'angle-saillant',
--                 'exponentiation-rapide',
--                 'carre-puissance',
--                 'droite-de-mayer',
--                 'hauteur-geometrie',
--                 'indiscernable',
--                 'experiences-independantes',
--                 'factorielle',
--                 'retour-a-l-unite',
--                 'methode-de-kasiski',
--                 'echelle-de-probabilites',
--                 'plan-lieu',
--                 'priorites-operatoires',
--                 'base-puissance',
--                 'cardinal',
--                 'echantillon',
--                 'suite-majoree',
--                 'tableau-croise',
--                 'quatrieme-proportionnelle',
--                 'discriminant',
--                 'terme-operation',
--                 'classe-statistique',
--                 'disjonction-des-cas',
--                 'grand-cercle',
--                 'inegalite-de-bienayme-tchebychev',
--                 'terme-general');
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
		'propriete-de-linearite',
		'ensemble-des-solutions',
		'operation-inverse',
		'une-chance-sur-deux',
		'intercaler',
		'projete-orthogonal',
		'angle-plein',
		'diviseur-commun',
		'programme-de-calcul',
		'quadruple',
		'vecteurs-egaux',
		'propriete-caracteristique',
		'cas-favorable',
		'egalite-a-trous',
		'approximation-lineaire',
		'escalier-suite',
		'angle-saillant',
		'exponentiation-rapide',
		'carre-puissance',
		'droite-de-mayer',
		'hauteur-geometrie',
		'indiscernable',
		'experiences-independantes',
		'factorielle',
		'retour-a-l-unite',
		'methode-de-kasiski',
		'echelle-de-probabilites',
		'plan-lieu',
		'priorites-operatoires',
		'base-puissance',
		'cardinal',
		'echantillon',
		'suite-majoree',
		'tableau-croise',
		'quatrieme-proportionnelle',
		'discriminant',
		'terme-operation',
		'classe-statistique',
		'disjonction-des-cas',
		'grand-cercle',
		'inegalite-de-bienayme-tchebychev',
		'terme-general');
	if visees <> 42 then
		raise exception 'exemples du glossaire, lot 2 : 42 entrées sans exemple attendues, % trouvées', visees;
	end if;
end;
$$;

update public.dictionary_entries e
   set exemples = jsonb_build_object(
		'items', jsonb_build_array(jsonb_build_object('grade', e.grade, 'content', v.content)))
  from (values
		('propriete-de-linearite',
		 'Une recette de crêpes pour $4$ personnes demande $250$ g de farine. Pour $8$ personnes, deux fois plus de monde, il faut deux fois plus de farine : $500$ g. Pour $2$ personnes, deux fois moins : $125$ g.'),
		('ensemble-des-solutions',
		 'L''équation $x^2 = 9$ a deux solutions, $-3$ et $3$ : $S = \{-3 ; 3\}$. Ne donner que $3$, c''est oublier une solution. L''équation $x^2 = -4$ n''a aucune solution réelle, car un carré n''est jamais négatif : $S = \varnothing$.'),
		('operation-inverse',
		 'Sur un jeu de l''oie, j''avance de $4$ cases, puis je recule de $4$ cases : je reviens sur ma case de départ. Reculer de $4$ défait « avancer de $4$ » : $10 + 4 = 14$, puis $14 - 4 = 10$.'),
		('une-chance-sur-deux',
		 'Avec un dé à six faces, « obtenir un nombre pair » a une chance sur deux : $3$ faces sur $6$ le réalisent ($2$, $4$ et $6$). « Obtenir $6$ » a beaucoup moins de chances : $1$ chance sur $6$.'),
		('intercaler',
		 'Entre $7$ et $10$, on peut intercaler $8$ ou $9$. Entre $15$ et $16$, on ne peut intercaler aucun nombre entier : ils se suivent.'),
		('projete-orthogonal',
		 'Dans un repère orthonormé, le projeté orthogonal de $M(3 ; 5)$ sur l''axe des abscisses est $H(3 ; 0)$, et la distance de $M$ à cet axe est $MH = 5$. Sur la droite d''équation $y = x$, le projeté orthogonal de $A(4 ; 0)$ est $K(2 ; 2)$, et la distance de $A$ à cette droite est $AK = \sqrt{8} = 2\sqrt{2}$.'),
		('angle-plein',
		 'De midi à $13$ h, la grande aiguille d''une horloge fait un tour complet du cadran : elle balaie un angle plein, $360°$. En un quart d''heure, elle fait un quart de tour : $360° \div 4 = 90°$, un angle droit.'),
		('diviseur-commun',
		 'On range $24$ billes rouges et $36$ billes bleues dans des sacs tous pareils, sans qu''il reste de bille. Le nombre de sacs doit être un diviseur commun à $24$ et $36$ : avec $6$ sacs, chacun reçoit $4$ rouges et $6$ bleues. Le plus grand nombre de sacs possible est $12$, avec $2$ rouges et $3$ bleues dans chacun.'),
		('programme-de-calcul',
		 'Programme : « choisis un nombre, ajoute $4$, puis multiplie le résultat par $2$ ». Avec $3$ : $3 + 4 = 7$, puis $7 \times 2 = 14$. Avec $10$ : $10 + 4 = 14$, puis $14 \times 2 = 28$.'),
		('quadruple',
		 'Le quadruple de $6$ est $6 \times 4 = 24$. C''est aussi le double du double : le double de $6$ est $12$, et le double de $12$ est $24$. Le périmètre d''un carré de côté $5$ cm est le quadruple de son côté : $20$ cm.'),
		('vecteurs-egaux',
		 'Sur un quadrillage, pour aller de $A$ à $B$, on avance de $4$ carreaux vers la droite et on descend de $1$ ; pour aller de $C$ à $D$, on fait exactement le même trajet : $\overrightarrow{AB} = \overrightarrow{CD}$. En revanche, $\overrightarrow{AB}$ et $\overrightarrow{DC}$ ne sont pas égaux : même direction et même longueur, mais sens contraire.'),
		('propriete-caracteristique',
		 '« Avoir quatre angles droits » est une propriété caractéristique du rectangle : tout rectangle a quatre angles droits, et tout quadrilatère qui a quatre angles droits est un rectangle. « Avoir quatre côtés » n''en est pas une : un losange a aussi quatre côtés.'),
		('cas-favorable',
		 'On tire une carte au hasard dans un jeu de $32$ cartes. Pour l''évènement « tirer un roi », il y a $4$ cas favorables, les quatre rois, sur $32$ cas possibles : la probabilité est $\frac{4}{32} = \frac{1}{8}$.'),
		('egalite-a-trous',
		 'Tu as $5$ images et tu en veux $9$. Combien t''en manque-t-il ? On écrit l''égalité à trous $5 + \ldots = 9$ : il en manque $4$, car $5 + 4 = 9$.'),
		('approximation-lineaire',
		 'Avec $f(x) = x^2$ et $a = 3$ : $f(3) = 9$ et $f''(3) = 6$, donc $3{,}01^2 \approx 9 + 6 \times 0{,}01 = 9{,}06$. La valeur exacte est $9{,}0601$ : l''erreur n''est que de $0{,}0001$.'),
		('escalier-suite',
		 'Avec $f(x) = \frac{x}{2} + 2$ et $u_0 = 0$ : on monte de l''abscisse $0$ jusqu''à la courbe, à la hauteur $f(0) = 2$, puis on va horizontalement jusqu''à la droite $y = x$, et on lit $u_1 = 2$ en abscisse. En recommençant, on obtient $u_2 = 3$, puis $u_3 = 3{,}5$ : les marches rapetissent et se rapprochent de l''abscisse $4$, où la courbe coupe la droite $y = x$.'),
		('angle-saillant',
		 'Deux demi-droites de même origine forment deux angles. Si l''un mesure $120°$, il est saillant ; l''autre, qui fait le tour par l''autre côté, mesure $360° - 120° = 240°$ : il est plus grand qu''un angle plat, ce n''est pas un angle saillant.'),
		('exponentiation-rapide',
		 'Pour calculer $3^{13}$ modulo $7$ : $13$ s''écrit $1101$ en binaire, donc $3^{13} = 3^8 \times 3^4 \times 3^1$. On élève au carré modulo $7$ : $3^2 = 9 \equiv 2$, $3^4 \equiv 2^2 = 4$, $3^8 \equiv 4^2 = 16 \equiv 2$. Donc $3^{13} \equiv 2 \times 4 \times 3 = 24 \equiv 3 \pmod{7}$ : cinq multiplications au lieu de douze.'),
		('carre-puissance',
		 'Le carré de $7$ est $7^2 = 7 \times 7 = 49$ : un carré de $7$ cm de côté a une aire de $49$ cm². Attention, $7^2$ n''est pas $7 \times 2 = 14$.'),
		('droite-de-mayer',
		 'Nuage de six points : $(1 ; 3)$, $(2 ; 4)$, $(3 ; 5)$, $(4 ; 9)$, $(5 ; 10)$ et $(6 ; 11)$. Le groupe des trois premiers a pour point moyen $G_1(2 ; 4)$, celui des trois derniers $G_2(5 ; 10)$. La droite de Mayer passe par $G_1$ et $G_2$ : c''est la droite d''équation $y = 2x$. Elle passe bien par le point moyen du nuage entier, $G(3{,}5 ; 7)$.'),
		('hauteur-geometrie',
		 'Dans le triangle $ABC$, la hauteur issue de $A$ passe par $A$ et coupe la droite $(BC)$ à angle droit, en un point $H$. Si $BC = 6$ cm et $AH = 4$ cm, l''aire du triangle est $\frac{6 \times 4}{2} = 12$ cm². Un triangle a trois hauteurs, une par sommet.'),
		('indiscernable',
		 'Un sac opaque contient $3$ boules rouges et $1$ boule verte, toutes de la même taille et de la même matière : elles sont indiscernables au toucher. En tirant sans regarder, on a $3$ chances sur $4$ de prendre une rouge. Si la verte était plus grosse, on la reconnaîtrait au toucher, et le tirage ne serait plus au hasard.'),
		('experiences-independantes',
		 'On lance une pièce, puis un dé. Que la pièce tombe sur pile ou sur face, le dé a toujours $1$ chance sur $6$ de donner $3$ : les deux expériences sont indépendantes. Si l''on tire une carte d''un paquet sans la remettre, puis une deuxième, les deux tirages ne sont pas indépendants : la première carte n''est plus dans le paquet.'),
		('factorielle',
		 'De combien de façons $5$ coureurs peuvent-ils franchir la ligne d''arrivée, sans ex æquo ? $5$ choix pour le premier, $4$ pour le deuxième, et ainsi de suite : $5! = 5 \times 4 \times 3 \times 2 \times 1 = 120$ classements possibles.'),
		('retour-a-l-unite',
		 '$5$ m de tissu coûtent $40$ €. Un mètre coûte $40 \div 5 = 8$ €, donc $3$ m coûtent $3 \times 8 = 24$ €. Passer directement de $5$ m à $3$ m serait difficile : le passage par $1$ m simplifie le calcul.'),
		('methode-de-kasiski',
		 'Dans un message chiffré par Vigenère, la séquence « KZR » revient $18$ lettres plus loin, et la séquence « MQE » revient $30$ lettres plus loin. La longueur de la clé divise probablement $18$ et $30$ : c''est $2$, $3$ ou $6$. On essaie d''abord $6$.'),
		('echelle-de-probabilites',
		 'Un sac contient $9$ billes rouges et $1$ bille bleue. Sur l''échelle, « tirer une bille rouge » se place du côté « probable », près de « certain » ; « tirer une bille bleue » se place sur « peu probable » ; « tirer une bille verte » se place sur « impossible ».'),
		('plan-lieu',
		 'Sur le plan de la cour, on voit d''en haut le préau, le bac à sable et le portail. Pour aller du portail au bac à sable, on suit le chemin avec le doigt sur le plan, puis on fait le même trajet dans la cour.'),
		('priorites-operatoires',
		 '$20 - (3 + 1)^2 \div 8 = 20 - 4^2 \div 8 = 20 - 16 \div 8 = 20 - 2 = 18$ : d''abord la parenthèse, puis la puissance, puis la division, enfin la soustraction.'),
		('base-puissance',
		 'Dans $2^5 = 2 \times 2 \times 2 \times 2 \times 2 = 32$, la base est $2$ et l''exposant est $5$. Dans $(-3)^2 = 9$, la base est $-3$ ; dans $-3^2 = -9$, la base n''est que $3$.'),
		('cardinal',
		 'Une boîte pleine contient $6$ œufs : la collection des œufs a pour cardinal $6$. Si on en prend $2$ pour faire un gâteau, il en reste $4$ : le cardinal de la collection devient $4$.'),
		('echantillon',
		 'On lance $100$ fois une pièce et on note pile ou face à chaque lancer : la liste des $100$ résultats est un échantillon de taille $100$. S''il contient $47$ fois pile, la fréquence de pile dans cet échantillon est $0{,}47$, proche de la probabilité $0{,}5$.'),
		('suite-majoree',
		 'La suite $u_n = 2 - \frac{1}{n + 1}$ est majorée par $2$ : pour tout $n$, $u_n < 2$. Elle est aussi minorée par $1$, car elle est croissante et $u_0 = 1$. La suite $v_n = n^2$, elle, n''est pas majorée : elle finit par dépasser n''importe quel nombre $M$ fixé à l''avance.'),
		('tableau-croise',
		 'Un club a $100$ adhérents, qui pratiquent chacun un seul sport : $60$ le tennis, $40$ la natation. Parmi eux, $35$ joueurs de tennis et $15$ nageurs sont mineurs. Le tableau croisé (sport en colonnes, mineur ou majeur en lignes) a quatre cases : $35$ et $15$ sur la ligne des mineurs, $25$ et $25$ sur celle des majeurs, avec en marge $50$ mineurs et $50$ majeurs.'),
		('quatrieme-proportionnelle',
		 'Une voiture consomme $6$ L d''essence pour $100$ km. Pour $250$ km, la consommation $x$ vérifie $\frac{6}{100} = \frac{x}{250}$, d''où $x = \frac{6 \times 250}{100} = 15$ : elle consomme $15$ L, et $15$ est la quatrième proportionnelle de $6$, $100$ et $250$.'),
		('discriminant',
		 'Pour $x^2 - 5x + 6 = 0$ : $\Delta = (-5)^2 - 4 \times 1 \times 6 = 1 > 0$, deux solutions, $2$ et $3$. Pour $x^2 - 6x + 9 = 0$ : $\Delta = 36 - 36 = 0$, une seule solution, $3$. Pour $x^2 + 2x + 5 = 0$ : $\Delta = 4 - 20 = -16 < 0$, aucune solution réelle.'),
		('terme-operation',
		 'Dans $45 - 18 = 27$, les termes sont $45$ et $18$, et $27$ est la différence. Dans $7 + 8 + 5 = 20$, il y a trois termes, $7$, $8$ et $5$, et $20$ est leur somme.'),
		('classe-statistique',
		 'Les notes d''un contrôle sont regroupées en classes : $[0 ; 5[$, $[5 ; 10[$, $[10 ; 15[$ et $[15 ; 20]$. Une note de $10$ tombe dans la classe $[10 ; 15[$, pas dans $[5 ; 10[$ : le crochet tourné vers l''extérieur exclut $10$. Si $7$ élèves ont au moins $10$ et moins de $15$, l''effectif de la classe $[10 ; 15[$ est $7$.'),
		('disjonction-des-cas',
		 'Pour montrer que $|x| \geq x$ pour tout réel $x$ : si $x \geq 0$, alors $|x| = x$ ; si $x < 0$, alors $|x| = -x$, qui est positif, donc plus grand que $x$. Les deux cas couvrent tous les réels : l''inégalité est toujours vraie.'),
		('grand-cercle',
		 'Quand on coupe une orange en deux moitiés égales, le bord de la coupe est un grand cercle de l''orange. Une tranche coupée plus près du bord donne un cercle plus petit, qui n''est pas un grand cercle. Sur la Terre, le parallèle qui passe par Paris n''est pas un grand cercle : il est plus petit que l''équateur.'),
		('inegalite-de-bienayme-tchebychev',
		 'Une variable aléatoire $X$ a pour espérance $50$ et pour variance $25$. Avec $\delta = 10$ : $P(|X - 50| \geq 10) \leq \frac{25}{10^2} = 0{,}25$. Donc $X$ prend une valeur strictement comprise entre $40$ et $60$ avec une probabilité d''au moins $0{,}75$.'),
		('terme-general',
		 'Avec le terme général $u_n = n^2 + 1$, on calcule directement n''importe quel terme, sans ceux d''avant : $u_0 = 1$, $u_3 = 10$, $u_{10} = 101$. Au contraire, $u_{n+1} = 2u_n$ avec $u_0 = 3$ est une relation de récurrence ; son terme général est $u_n = 3 \times 2^n$.')
       ) as v(slug, content)
 where e.slug = v.slug and not e.hidden and e.derived_from is null and e.exemples is null;
