# 📜 Compendium Pataphysique des Chiphres

> _« Cornegidouille ! Voici l'Évangile selon le Maître Phynancier ! »_
>
> Document de référence canonique du lore. À versionner dans le repo.
> Toute incohérence avec ce document doit être considérée comme une erreur, à corriger ou à canoniser après débat.

> **📌 Note de rebranding (mai 2026)** : ce projet s'appelait précédemment **Ubumaths** (ubumaths.fr). Décision prise de **rupture nette** : le nom de marque est désormais **Chiphres** (chiphr.es), avec pour sous-titre **« les Chiphres de la Chandelle Verte »**. Motif : le mot _maths_ étant repoussoir pour beaucoup d'élèves et de parents, le rebranding adopte un terme déguisé (_chiphres_ = _chiffres_ avec la signature pataphysique _ph_ canon Jarry, comme _phynance_). L'ancien nom **Ubumaths n'est plus utilisé nulle part**. Le terme **Ubu** lui-même (canon Jarry — Père Ubu, Mère Ubu, _Ubu Roi_) reste évidemment intact partout : c'est le nom du **personnage**, pas de la **marque**.
>
> **Vocabulaire hybride Chiphres / Mathres** : pour désigner spécifiquement la **discipline scolaire** (= les mathématiques), le lore utilise le néologisme **Mathres** (déformation R potache canon — modèle _merdre_). Distinction sémantique : **Chiphres** = la plateforme + le côté concret/calculatoire ; **Mathres** = la discipline enseignée. Phrase-clé : _« Les Galopins apprennent les Mathres sur Chiphres. »_

> **📚 Architecture documentaire** : ce **Compendium** est la **Bible structurelle** du projet — manifeste, cosmogonie, personnages, géographie, voix, identité visuelle, monétisation, roadmap. Il est complété par le **Lexique Pataphysique des Chiphres** (`lexique-pataphysique.md`), qui est le **dictionnaire technique** centré sur le vocabulaire (fiches de mots individuels, tables de correspondance UI, conventions orthographiques). Toute décision narrative ou éditoriale appartient au Compendium ; toute décision lexicale appartient au Lexique. En cas de divergence entre les deux, **le Compendium prime**.

---

## Sommaire

1. [Manifeste : pourquoi Ubu, pourquoi maintenant](#i-manifeste)
2. [Cosmogonie : l'Univers Pataphysique](#ii-cosmogonie)
3. [Personnages](#iii-personnages)
4. [Géographie de l'Académie](#iv-géographie-de-lacadémie)
5. [La Langue Pataphysique](#v-la-langue-pataphysique)
6. [Économie phynancière](#vi-économie-phynancière)
7. [Progression : l'Ordre de la Grande Passoire et les 7 Niveaux Scolaires](#vii-progression)
8. [L'Almanach des Chiphres](#viii-lalmanach-des-chiphres)
9. [Voix et ton — style guide](#ix-voix-et-ton)
10. [Easter eggs et secrets](#x-easter-eggs-et-secrets)
11. [Identité visuelle](#xi-identité-visuelle)
12. [Monétisation cohérente avec le lore](#xii-monétisation-cohérente)
13. [Prompts LLM](#xiii-prompts-llm)
14. [Roadmap d'implémentation](#xiv-roadmap-dimplémentation)
15. [Annexe — Sources canon](#xv-annexe-sources-canon)

**Conventions de canonicité** — Quatre niveaux d'autorité dans le lore :

- 🟢 **Canon Jarry** : vient de l'œuvre originale d'Alfred Jarry (1873-1907). **Libre** — domaine public depuis 1977. Exemples : _gidouille_, _bouzine_, _Mère Ubu_, _Bordure_, _Bougrelas_, _Achras_, _Faustroll_, _croc à phynances_, _bâton-à-physique_, _Ordre de la Gidouille_, _Czar Alexis_, _Aigle Rouge de Pologne_, _Conjurés_. **Inviolable**.
- 🟡 **Canon Chiphres** : inventions assumées de notre univers, sans antécédent canon Jarry. Exemples : _les six provinces_ (Nombrilie, Bedonstan, Yoyolande, Pifométrie, Glitchistan, Patatovie), _le statut de Galopin_ pour les élèves, _les sept Niveaux Scolaires Pataphysiques_ (Syz'esme → Phinalle), _l'Ordre de la Grande Passoire (OGP)_ avec ses 7 grades (Embarqué Phollet → Patanaute Yllustre). **Cohérence interne obligatoire**.
- 🟠 **Hybridations** : extensions canonisées d'éléments Jarry. Exemples : _l'Ordre de la Gidouille_ (canon Jarry) devient un système de grades (extension Chiphres), _les Palotins_ (canon Jarry — sbires d'Ubu) deviennent les _camarades de Galopin_ (extension Chiphres positive). **Source toujours signalée**.
- 🏛️ **Création du Collège de 'Pataphysique** : éléments codifiés par l'institution réelle (fondée 1948, toujours active). **NON LIBRE DE DROIT** — usage à encadrer. Exemples : **_Patacesseurs_** (le mot, c'est pourquoi les Chiphres utilisent **_Patanautes Yllustres_**), _Acrote_, _Cymbalum Pataphysicum_, _Viridis Candela_, _hunyadi_, _saints contrapétiques_, les _6 grades canon de l'OGG_, la _structuration du Calendrier Pataphysique en système_. Pour la doctrine complète et les recommandations d'usage, voir le **Lexique Pataphysique des Chiphres**, section ⚖️ Avertissement juridique.

**Cumul d'étiquettes** — Un terme peut combiner plusieurs étiquettes :

| Cas                                  | Étiquettes | Statut juridique                                               | Exemple                                                                                                                                                                                              |
| ------------------------------------ | ---------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canon Jarry pur                      | 🟢 seul    | **LIBRE**                                                      | _gidouille_, _phynance_, _merdre_                                                                                                                                                                    |
| Canon Jarry + codifié par le Collège | 🟢🏛️       | **LIBRE pour le mot canon**, codification spécifique non-libre | _gidouille_ libre, mais _Ordre de la Grande Gidouille avec ses 6 grades_ est codifié 🏛️ ; _Calendrier Pataphysique_ avec ses 13 mois est libre, mais sa **structuration en système** est codifiée 🏛️ |
| Création pure du Collège             | 🏛️ seul    | **NON LIBRE** — usage à encadrer                               | **_Patacesseurs_** (le mot, → _Patanautes Yllustres_ aux Chiphres), _Acrote_ (au sens Sandomir), _Cymbalum Pataphysicum_                                                                             |

**Règle pratique** : pour les termes 🟢🏛️, on garde le mot canon (libre) mais on simplifie ou contourne la codification spécifique du Collège.

Voir l'annexe XV pour la liste des sources Jarry vérifiées, et le **Lexique Pataphysique des Chiphres** pour le détail des fiches lexicales et des balisages juridiques au mot par mot.

---

## I. Manifeste

### Le problème

Tous les sites de maths se ressemblent. Khan Academy, Brilliant, Maths&Tiques, Lumni, Mathenpoche : interface clean, gamification fade (badges génériques, streaks, XP), ton encourageant et neutre. L'élève reste un _utilisateur_. Quand il ferme l'onglet, il oublie.

Pire : le mot **« maths » lui-même est devenu repoussoir** pour beaucoup d'élèves et de parents. La discipline fait peur. La note fait peur. L'image que certains en ont donné fait peur. Et le simple fait d'écrire _« maths »_ sur la page d'accueil suffit à fermer la porte avant qu'elle ne s'ouvre.

### La promesse des Chiphres

**Chiphres ne propose pas d'apprendre les Mathres. Chiphres propose de devenir Patanaute Yllustre au service de Sa Majesté Phynancière le Père Ubu.**

Les Mathres sont le moyen — la couronne, le titre, les terres polonaises et les phynances sont la fin. L'élève n'est pas un apprenant : c'est un **Galopin** qui gravit les grades de l'Académie, gagne ses **gidouilles**, conspire avec ses **Palotins**, et finit par renverser le **Czar Alexis** lors du Grand Décervelage (le bac).

Le nom **Chiphres** lui-même est un manifeste : c'est _chiffres_ avec la signature pataphysique _ph_ canon Jarry (comme _phynance_). Le mot _maths_, anxiogène, est remplacé par **Mathres** (déformation R potache canon — modèle _merdre_) — déguisement ludique qui désamorce la peur sans diluer le contenu.

### Pourquoi Jarry, pourquoi Ubu

- **Patrimonial** : _Ubu Roi_ est au programme du collège-lycée. Profs et parents le reconnaîtront.
- **Anarchique** : le ton ubuesque (vénal, grossier, absurde, infantile) est l'antithèse de la pédagogie aseptisée. Les ados adorent.
- **Riche** : la pièce et son univers regorgent de néologismes (_merdre_, _phynances_, _gidouille_, _décerveler_, _palotin_). Une mine d'or sémantique pour habiller chaque feature.
- **Patalibre** : Jarry est dans le domaine public depuis 1977. Aucun ayant droit, liberté totale.

### Une généalogie d'humanisme savant

Chiphres ne s'inspire pas seulement de Jarry, mais d'une **généalogie de patanautes yllustres** (= ancêtres pataphysiques au sens du Collège de 'Pataphysique) qui ont en commun, à travers cinq siècles, de croire qu'on peut être **à la fois rigoureux et joyeux**. Pour la galerie complète (22 patanautes yllustres documentés), voir le **Lexique Pataphysique des Chiphres**, Section X. Mentions principales :

- **François Rabelais** (1494-1553) — patanaute yllustre antique, modèle stylistique de Jarry
- **Cyrano de Bergerac** (1619-1655) — libertin érudit, premier voyageur lunaire imaginaire
- **Charles Babbage** (1791-1871) et **Ada Lovelace** (1815-1852) — mathématiciens-machinistes victoriens, patrons de Glitchistan
- **Lewis Carroll** (1832-1898) — mathématicien à Oxford, auteur d'_Alice_ et du _Game of Logic_ (1886, proto-Chiphres victorien)
- Le **quintet de la Belle Époque parisienne** (Chat Noir) : **Charles Cros** (1842-1888), **Alphonse Allais** (1854-1905), **Tristan Bernard** (1866-1947), **Erik Satie** (1866-1925), **Alfred Jarry** (1873-1907)
- Les **Satrapes du Collège de 'Pataphysique** : Duchamp, Queneau, Vian, Ionesco, Dubuffet, Eco — héritiers du XXᵉ siècle
- **Les Shadoks** et **_De cape et de crocs_** (Ayroles & Masbou) — héritiers contemporains

### Les trois lois pataphysiques des Chiphres

1. **Tout doit avoir un nom ubuesque.** Un bouton « Sauvegarder » → _« Empocher »_ ou _« Mettre dans la trappe »_. Une erreur 404 → _« Cornegidouille ! Cette terre n'existe point en notre Royaume. »_
2. **Le Père Ubu est partout, mais jamais identique.** Tantôt cupide, tantôt lâche, tantôt grandiloquent, jamais conciliant. Et il n'est pas seul : deux voix tutorales complémentaires l'accompagnent — **Monsieur Prudhomme** (registre grandiloquent-bourgeois, pour les écrans administratifs) et **Tristan Bernard** (registre flegmatique-spirituel, pour les moments de calme).
3. **L'absurde sert le sérieux.** Sous le clown, la rigueur. Une équation reste une équation. Le lore enrobe ; il ne dilue pas.

### Le Manifeste public — version destinée aux parents

Voici le texte de présentation public des Chiphres, destiné à la page d'accueil ou page À propos du site. Niveau pataphysique : **sobre et discret** — la pataphysique ne se voit qu'à la deuxième lecture. Cible : **les parents**. Refus du langage commercial standard et des formules d'auto-affirmation (« nous croyons », « nous pensons »).

> **Chiphres** > _les Chiphres de la Chandelle Verte_
>
> ---
>
> > _« Il vaut mieux ne pas réfléchir du tout que de ne pas réfléchir assez. »_
> > — Tristan Bernard
>
> ---
>
> Apprendre les mathématiques peut faire peur. Le mot, la discipline, la note. Pourtant ce sont les mêmes enfants qui se plaisent à résoudre des énigmes, qui aiment dessiner de belles figures géométriques, et qui s'interrogent devant les paradoxes. La peur ne vient pas des mathématiques. Elle vient de la manière dont on les enseigne et de l'image que certains ont pu malheureusement en donner.
>
> ---
>
> **Le voyage Chiphres**
>
> Un royaume imaginaire. Des provinces à traverser. Des récompenses à empocher. Des défis pédagogiques structurés. Et derrière le décor, les programmes officiels de Mathématiques du collège et du lycée.
>
> **Est-ce vraiment sérieux ?**
>
> Très sérieux. Chiphres s'inspire des œuvres d'**Alfred Jarry** (1873-1907), écrivain français, ainsi que de celles de **Lewis Carroll** (mathématicien à Oxford et auteur d'_Alice au pays des merveilles_) et de toute une tradition culturelle française — celle de Rabelais, de Cyrano de Bergerac, et plus récemment d'Alphonse Allais ou d'Erik Satie. Cinq siècles de pensée humaniste qui ont en commun de croire qu'on peut être à la fois rigoureux et s'amuser. Le ton de Chiphres est enjoué, farceur, mais ne cède en rien à la rigueur pédagogique.
>
> **Ce que Chiphres n'est pas**
>
> - Un site de soutien scolaire classique.
> - Un site avec de la publicité.
> - Un service qui revend les données des familles.
> - Un site qui promet de faire aimer les mathématiques en deux semaines.
>
> **Ce que Chiphres propose**
>
> - Un suivi de progression personnalisé, accessible aux parents.
> - Une préparation conforme au programme français.
> - Conformité RGPD : l'utilisation de vos données personnelles est encadrée.
> - Un décor savoureux ; une pédagogie rigoureuse.
>
> ---
>
> Apprendre les mathématiques sans s'en rendre compte. Et peut-être s'en moquer un peu, en chemin.
>
> _Bienvenue sur Chiphres._
>
> ---
>
> _Chiphres est créé par un enseignant agrégé de Mathématiques et ingénieur en Informatique, passionné de littérature et d'illusionnisme._

**Notes sur la construction du manifeste public** :

- **Exergue Tristan Bernard** : pose le ton et l'enjeu en deux secondes
- **Aucun « nous »** dans tout le texte : Chiphres parle de Chiphres à la troisième personne
- **Aucun superlatif** : pas de _« le meilleur »_, _« le plus innovant »_
- **Structure « Ce que fait / D'où vient / N'est pas / Propose »** : rassure factuellement sans déclaration auto-laudative
- **Mathres absent du manifeste public** : pour le grand public, on garde _« Mathématiques »_ en clair. _Mathres_ est réservé au wording interne du site une fois le Galopin inscrit.
- **Mention auteur en signature finale** : l'autorité académique (agrégé) + technique (ingénieur) + culturelle (littérature + illusionnisme) en signature solennelle

---

## II. Cosmogonie

### Les trois concepts fondateurs

Avant de décrire le Royaume, ses provinces et son histoire, il faut poser les **trois concepts fondateurs** de la pataphysique que les Chiphres adoptent intégralement. Ces concepts viennent de Jarry lui-même (canon 🟢) et sont libres de droit. Ils structurent **toute la doctrine des Chiphres** — pas seulement la cosmogonie, mais aussi la voix tutorale, la galerie des patanautes yllustres, le système de cartes et le rapport aux erreurs.

#### 🟢 Le Clinamen — la déviation fondatrice

> _« La bête imprévue Clinamen éjacula sur les murs treize tableaux semblables… »_ — Alfred Jarry, _Faustroll_, Livre VI, chapitre XXXIV intitulé « Clinamen », 1898.

**Origine antique** : le clinamen est un concept de la **physique épicurienne**, formalisé par **Lucrèce** dans **_De rerum natura_**, Livre II (vers 217-292), au Iᵉʳ siècle av. J.-C. Il désigne **l'écart imprévisible** par lequel les atomes dévient de leur chute verticale dans le vide — déviation infinitésimale qui permet leur rencontre et donc l'existence des corps et la liberté humaine. C'est donc un concept **libre de droit depuis plus de deux millénaires**.

**Reprise par Jarry** : Alfred Jarry s'approprie le clinamen dans **_Gestes et opinions du docteur Faustroll, pataphysicien_** (1898). Il y consacre **un chapitre entier** (Livre VI, chapitre XXXIV) intitulé « Clinamen », dans lequel apparaît la fameuse **machine à peindre dite Clinamen** qui projette treize tableaux décrits par Panmuphle. Pour Jarry, le clinamen devient **le principe même de la création pataphysique** : la réalité comme exception plutôt que comme règle. (Note : le **mois pataphysique « Clinamen »** du Calendrier du Collège est en revanche codification 🏛️ du Collège — c'est pourquoi l'Almanach des Chiphres ne reprend pas ce nom de mois.)

**Application aux Chiphres** : chaque Galopin est un **clinamen** dans le Royaume — un écart unique par rapport à la trajectoire moyenne attendue. Sa progression ne suit pas une ligne droite mais une déviation propre, ce qui justifie la **personnalisation** des parcours et le **droit à l'erreur créative**. Une réponse fausse n'est pas un raté du système : c'est un clinamen. Et chaque solution imaginaire des Chiphres (Royaume, Mathres, Galopin) est elle-même un clinamen par rapport à la pédagogie classique.

#### 🟢 L'équivalence des contraires — tout se vaut pataphysiquement

> _« Vingt-sept livres pairs… »_ — Alfred Jarry, _Faustroll_, chapitre IV : « Les livres pairs du Docteur ».

**Origine canon** : Jarry pose le principe dans **_Gestes et opinions du docteur Faustroll, pataphysicien_** (1898) par l'image de la **bibliothèque des 27 livres pairs**. Faustroll possède une bibliothèque où la Bible, _Pantagruel_ de Rabelais, l'_Odyssée_ d'Homère, les œuvres de Mallarmé et _Ubu Roi_ de Jarry lui-même **coexistent à égalité pataphysique**. Aucune hiérarchie. Tout est également vrai, également beau, également sérieux. Ces livres sont _« pairs »_ au sens où ils sont **d'égale valeur pataphysique**, quelles que soient leur célébrité, leur ancienneté ou leur prétention canonique. C'est canon Jarry strict 🟢, libre de droit.

**Reprise par le Collège** : le Collège de 'Pataphysique a fait de l'équivalence des contraires un de ses **principes officiels**, qu'il applique notamment à sa galerie des Patanautes Yllustres (_« Anciens ou récents, réels ou imaginaires, hommes, femmes ou animaux, les Patanautes Yllustres sont également honorés. »_, _Les 101 mots de la pataphysique_, PUF 2019). Le **principe lui-même reste canon Jarry libre** ; seule la **formulation institutionnelle du Collège** est encadrée 🏛️.

**Application aux Chiphres** : ce principe est **doctrinal et transversal**. Il fonde :

- **Le ton sur les erreurs** : une mauvaise réponse n'est pas inférieure à une bonne réponse. C'est pourquoi le Père Ubu ne dit jamais _« faux »_ mais _« pataphysique »_. Voir Section IX (Voix et ton) pour les implications complètes sur le wording.
- **La galerie des patanautes yllustres** : Rabelais et Lutembi le crocodile, Cyrano de Bergerac historique et Bosse-de-Nage le cynocéphale, Lewis Carroll et le Cheval à Phynances sont **également pataphysiques**. Pas de hiérarchie chronologique, pas de hiérarchie ontologique. Voir Section III (Personnages).
- **Le système de cartes** : toutes les cartes sont également pataphysiques, qu'elles soient plébéiennes, bourgeoises, nobles ou royales. La rareté n'est pas une supériorité de valeur, c'est une supériorité de fréquence d'apparition.
- **Les fêtes provinciales** : toutes égales entre elles, pas de hiérarchie entre Bedonstan et Glitchistan, entre la Fête des Polyèdres et la Grande Empochaille.

**Limite pédagogique honnête** : l'équivalence des contraires est un **principe pataphysique**, pas une vérité scolaire absolue. En **Mathres**, 2 + 2 = 4 et pas 5. Mais la **façon de signaler l'erreur** (le ton, le wording, la dramatisation) relève de l'équivalence des contraires. On corrige sans dévaloriser. La justesse mathématique est préservée ; le jugement moral sur l'élève est suspendu.

#### 🟢 Les solutions imaginaires — la science des cas particuliers

> _« La pataphysique est la science des solutions imaginaires, qui accorde symboliquement aux linéaments les propriétés des objets décrits par leur virtualité. »_ — Alfred Jarry, _Faustroll_, 1898.

Concept que Jarry formule comme la **définition même de la pataphysique** : elle étudie non pas les lois générales (comme la physique) mais les **exceptions, les cas singuliers, les solutions imaginaires** à des problèmes que la science régulière néglige ou résout par approximation.

**Application aux Chiphres** : ce principe justifie pataphysiquement **l'invention pédagogique**. Les Chiphres proposent des **solutions imaginaires** à des problèmes pédagogiques que l'école française ne résout pas bien :

- Comment rendre les Mathres désirables ? → solution imaginaire : un Royaume, un Père Ubu, des phynances
- Comment dédramatiser les erreurs ? → solution imaginaire : les erreurs sont _« pataphysiques »_, pas fausses
- Comment maintenir l'engagement sur 7 ans ? → solution imaginaire : un parcours mythologique avec grades et niveaux
- Comment articuler rigueur et joie ? → solution imaginaire : la pataphysique elle-même

**Tous les choix doctrinaux des Chiphres sont des solutions imaginaires** au sens de Jarry. Cela donne une **légitimité canonique** à l'ensemble du projet.

### Le Royaume

> _« La scène se passe en Pologne, c'est-à-dire nulle part. »_ — Alfred Jarry, _Ubu Roi_, 1896.

Au commencement était la Pologne. Puis le Père Ubu, par un rot d'une puissance inégalée, en révéla la **dimension pataphysique** : six provinces fiscales et une Vistule qui les traverse toutes pour se jeter dans la Baltique.

Le Royaume comporte **Six Provinces**, qui correspondent aux six grands domaines du programme français de Mathématiques (collège et lycée) :

| Province        | Domaine                      | Capitale                  | Origine du nom                           | Gouverneur                |
| --------------- | ---------------------------- | ------------------------- | ---------------------------------------- | ------------------------- |
| **Nombrilie**   | Nombres et calculs           | **Empoche-les-Bains**     | nombril (et nombrilisme du Roi)          | **Mère Ubu** 🟢           |
| **Bedonstan**   | Géométrie                    | **Lobatchevsk**           | bedaine (le ventre comme première forme) | **Professeur Achras** 🟢  |
| **Yoyolande**   | Fonctions                    | **Sinusborg**             | yo-yo (qui monte et descend)             | **Bougrelas** 🟢          |
| **Pifométrie**  | Probabilités et statistiques | **Bonneteau-sur-Vistule** | pif (et pifomètre, science du hasard)    | **Cheval à Phynances** 🟢 |
| **Glitchistan** | Algorithmique                | **Turingrad**             | glitch (la machine à vapeur qui dérape)  | **Bosse-de-Nage** 🟢      |
| **Patatovie**   | Logique et ensembles         | **Cracovenn**             | patate (le diagramme des ensembles)      | **Faustroll** 🟢          |

**Six provinces, six suffixes différents, six registres distincts** : -ie noble, -stan oriental, -lande nordique, -métrie scientifique, -istan post-soviétique, -ovie slave. La carte sonne comme une vraie Europe imaginaire à six royaumes.

#### Logique sonore et anatomique du Royaume

Quatre des six provinces s'appuient sur **un trait corporel** du Père Ubu (nombril, bedaine, pif, gidouille-comme-patate). Le Royaume **est littéralement le corps d'Ubu déployé en géographie**. Les Galopins qui voyagent dans le programme scolaire parcourent en réalité l'anatomie de leur souverain.

Les deux exceptions :

- **Yoyolande** s'appuie sur un objet (le yo-yo), métaphore parfaite des fonctions qui montent et descendent.
- **Glitchistan** s'appuie sur un dysfonctionnement moderne (le glitch), seule province authentiquement contemporaine, marquant le pont entre l'imaginaire 1896 et l'informatique du XXIᵉ siècle — habillée pataphysiquement en **steampunk victorien** (voir ci-dessous).

#### Les deux provinces -stan, frontière orientale

Bedonstan et Glitchistan sont **les deux provinces -stan** du Royaume. Loin d'être un doublon, c'est canon : ce sont **les marches orientales sauvages**, deux territoires aux confins de l'empire pataphysique, l'un tubéreux et antique, l'autre numérique et crashant. Elles se disputent depuis des siècles le titre de « Province la moins compréhensible du Royaume ».

#### Glitchistan, province steampunk victorienne

**Choix esthétique majeur des Chiphres** : la province algorithmique adopte l'esthétique **steampunk victorienne** plutôt que le minimalisme moderne de l'informatique contemporaine. Cette décision est canoniquement justifiée par les **deux patanautes yllustres victoriens** que sont **Charles Babbage** (1791-1871, inventeur de la Machine Analytique) et **Ada Lovelace** (1815-1852, première programmeuse de l'histoire avec sa Note G), tous deux dans le domaine public et idéalement contemporains de Jarry par leur sensibilité — la Machine Analytique a précédé l'informatique moderne d'un siècle, exactement comme Faustroll a précédé la pataphysique formalisée d'un demi-siècle.

**Vocabulaire steampunk canon de Glitchistan** :

- **Machine Pataphysique** (référence Babbage) — métaphore du processeur
- **Console à Vapeur** — interface utilisateur
- **Carte Perforée** — fichier ou enregistrement
- **Tube Pneumatique** — transmission de données
- **Rouleau d'Instructions** — programme ou algorithme
- **Cadran à Variables** — interface de saisie
- **Cloche de Reset** — bouton de réinitialisation
- **Pile de Charbon** — file d'attente ou stack

**Capitale Turingrad** : la grande capitale de Glitchistan tire son nom d'**Alan Turing** (1912-1954), mais elle est architecturalement **victorienne-steampunk** plutôt que mid-century. Elle se compose de **quatre quartiers** :

- **Quartier Babbage** : machines analytiques, calcul mécanique, polyèdres à engrenages
- **Quartier Lovelace** : programmation, suites récursives, mascotte Python (Ada Lovelace stylisée en silhouette victorienne tenant un rouleau d'instructions)
- **Quartier des Tubes** : transmission, mémoires, archives
- **Place du Reset** : grande place centrale ornée de la **Cloche de Reset** (clocher à vapeur)

#### Lecture narrative du cycle des six provinces

Lue dans l'ordre, la liste raconte le cycle phynancier complet :

> _Nombrilie, où le Roi compte ses biens.
> Bedonstan, où il les digère.
> Yoyolande, où sa fortune monte et descend.
> Pifométrie, où il parie.
> Glitchistan, où il automatise sa cupidité.
> Patatovie, où il classe ses gains par poches._

### Fiches détaillées des Provinces

Pour chaque province, on définit une **capitale** (toponyme du chef-lieu, utile pour les illustrations et les noms d'événements) et une **devise** (à inscrire sur le blason, en en-tête de chapitre, dans les illustrations).

**Méthode du choix des capitales** : la palette des six capitales utilise **six registres sonores totalement différents**, pour faire sonner la carte comme une vraie Europe imaginaire à cultures multiples plutôt qu'une suite monotone. Les six suffixes sont : `-les-Bains` (français terroir thermal), `-evsk` (russe authentique), `-borg` (nordique scandinave), `-sur-Vistule` (français terroir fluvial polonais), `-grad` (cyber-soviétique), et le détournement de Cracovie (polonais réel).

#### Nombrilie — _Nombres et calculs_

- **Gouverneur** : 🟢 **Mère Ubu** (canon Jarry, _Ubu Roi_) — la Reine consort, calculatrice et manipulatrice. Cumul de mandats avec son rôle de marketplace UI : Mère Ubu gère à la fois les transactions individuelles des Galopins et les phynances de toute la province. _« Père Ubu ne sait pas compter mais moi si »_ (canon Jarry). **Voix** : posée, lettrée, doucereuse, jamais grossière. Elle calcule pendant qu'Ubu braille.
- **Capitale** : 🟡 **Empoche-les-Bains**
- **Étymologie** : du verbe « empocher » (action royale par excellence d'Ubu, mot qui remplace « Sauvegarder » dans le lexique UI). Le suffixe `-les-Bains` détourne les noms des stations thermales françaises du XIXᵉ siècle (Aix-les-Bains, Évian-les-Bains, Plombières-les-Bains), registre 1880 bourgeois parfaitement contemporain de Jarry.
- **Devise** : « **Patron, la soustraction !** »
- **Commentaire de la devise** : détournement de l'expression française universelle « Patron, l'addition ! » (cri lancé au serveur en fin de repas pour réclamer la note). En remplaçant _addition_ par _soustraction_, on demande qu'on **enlève** de l'argent au lieu d'en payer — geste pataphysique parfait : escroquerie ubuesque condensée en quatre mots. Mathématiquement, addition et soustraction sont les deux opérations fondatrices de la province ; les détourner l'une par l'autre est l'archétype de l'opération inversée. Lien narratif fort avec Empoche-les-Bains : c'est le cri qu'on entend chaque soir au restaurant du Grand Hôtel thermal.
- **Paysage canon** : station thermale 1880 où des Polonais bourgeois en redingote prennent les eaux numériques. Ils se baignent dans des bassins remplis de chiffres flottants. Place principale dominée par une grande gidouille de bronze qui crache des pièces.
- **Résonance UI** : un Galopin qui clique sur le bouton « Empocher » fait symboliquement un pèlerinage à Empoche-les-Bains.

#### Bedonstan — _Géométrie_

- **Gouverneur** : 🟢 **Professeur Achras** (canon Jarry, _Ubu Cocu_) — éleveur de polyèdres. Il **élève** ses polyèdres comme on élève du bétail, leur parle, les nomme, les fait grossir. Mandat unique, pas de cumul UI. **Voix** : pédante, lyrique, exaltée par la géométrie. Tutoie ses polyèdres, vouvoie les humains. Cite Lobatchevski à tout bout de champ (« comme l'a démontré le grand Lobatchevski... »).
- **Capitale** : 🟡 **Lobatchevsk**
- **Étymologie** : 🟢 **Lobatchevsk est une vraie ville russe**, homonyme de **Nikolaï Lobatchevski (1792-1856)**, mathématicien russe et l'un des trois fondateurs de la **géométrie non-euclidienne** (avec Bolyai et Gauss). Lobatchevski a fait éclater la géométrie « plate » en proposant des géométries sur des surfaces courbes — exactement les bedaines, patates et polyèdres difformes du Royaume.
- **Devise** : « **La route est droite, mais la courbe est forte** »
- **Commentaire de la devise** : détournement de la formule de Jean-Pierre Raffarin (2002, _« la route est droite mais la pente est forte »_) en remplaçant _pente_ par _courbe_. Au premier degré, contradiction Shadok parfaite (une route droite n'a pas de courbe). Au second degré, c'est mathématiquement précis : en **géométrie hyperbolique** (celle de Lobatchevski, gouverneur titulaire de la capitale Lobatchevsk), les droites apparaissent courbes parce que **la courbure de l'espace est forte**. Triple lecture : Raffarin / Shadok / Lobatchevski. Citation officielle attribuée au Professeur Achras lors de l'inauguration du Polyèdre de la Voie Royale.
- **Paysage canon** : steppes orientales parsemées de polyèdres en pierre, élevés par les soins d'Achras. Lobatchevsk est entourée de murailles dodécaédriques. Au centre, la grande Académie Achrasienne où l'on étudie les courbures.

#### Yoyolande — _Fonctions_

- **Gouverneur** : 🟢 **Bougrelas** (canon Jarry, _Ubu Roi_) — le Prince légitime, fils survivant de Venceslas. **Son arc narratif dans la pièce EST une fonction yoyo** : prince au sommet → orphelin fugitif → vainqueur restaurateur. Cumul de mandats avec son rôle UI de mascotte de progression : l'élève qui progresse sur les Chiphres suit Bougrelas dans ses montées et descentes, c'est-à-dire qu'il **arpente Yoyolande** sans le savoir. **Voix** : juvénile, déterminée, éloquente. Tutoie les enfants, vouvoie les adultes. Parle de courage et de revanche.
- **Capitale** : 🟡 **Sinusborg**
- **Étymologie** : de **sinusoïde** (la sinusoïde est l'archétype universel de la fonction qui oscille, monte et descend en cycle régulier — exactement le yo-yo). Le suffixe `-borg` est nordique authentique (Göteborg, Helsingborg, Brandenburg), cohérent avec le suffixe `-lande` de la province (Hollande, Islande, Finlande) — la Yoyolande est nordique-marine.
- **Devise** : « **Plus ça monte, moins ça descend** »
- **Commentaire de la devise** : pléonasme contradictoire de pure veine Shadok / Pierre Dac. Au premier degré, c'est absurde : ce qui monte doit redescendre. Au second degré, c'est une **fausse intuition courante** sur les fonctions monotones : un élève débutant pense qu'une fonction qui monte ne peut pas redescendre. La devise canonise cette confusion. Pédagogiquement, le prof peut s'appuyer dessus pour introduire les variations de fonctions (« la devise de Yoyolande est fausse — pourquoi ? »).
- **Paysage canon** : ville-port nordique aux quais ondulés, toits en sinusoïdes, ponts en courbes parfaites. Le grand phare de Sinusborg projette son faisceau en oscillation cyclique. Les bateaux qui montent et descendent en cadence dans le port créent un ballet permanent.

#### Pifométrie — _Probabilités et statistiques_

- **Gouverneur** : 🟢 **Cheval à Phynances** (canon Jarry, _Ubu Roi_) — la monture d'Ubu, animal-instinct, dont le nom contient déjà _phynance_. Cumul de mandats avec son rôle UI de compagnon évolutif : le compagnon du Galopin est aussi son gouverneur, ce qui crée une résonance forte (l'animal qui suit l'élève dans son apprentissage est le même qui préside aux paris de la province). Le geste lui-même est ubuesque jusqu'à l'os : **Caligula a nommé son cheval Incitatus consul** ; Père Ubu, qui se prend pour empereur romain, refait le geste. Le Cheval à Phynances tient sa cour à Bonneteau-sur-Vistule, préside les parties de bonneteau du bout du sabot, hennit pour annoncer les résultats, et touche **une commission de 10 %** sur tous les paris. **Voix** : exclusivement par hennissements. Les Galopins doivent interpréter (un hennissement long = victoire, un court = défaite, un nasal = à recommencer).
- **Capitale** : 🟡 **Bonneteau-sur-Vistule**
- **Étymologie** : du **bonneteau**, jeu de cartes truqué par excellence (trois cartes, un bateleur en fait passer une, le pigeon parie) — registre français 1880 ultra-ubuesque. La **Vistule** est la vraie rivière de Pologne (1047 km, traverse Cracovie et Varsovie, se jette dans la Baltique près de Gdańsk) — elle est canonisée comme **fleuve principal de la Pologne pataphysique**, traversant plusieurs provinces. Note historique : les probabilités sont nées en 1654 du **problème des partis** posé par le chevalier de Méré à Pascal — un problème de paris au jeu.
- **Devise** : « **Jamais trois sans deux** »
- **Commentaire de la devise** : inversion du proverbe ultra-célèbre « Jamais deux sans trois » (proverbe qui exprime l'illusion que deux occurrences appellent une troisième). Au premier degré, contradiction Shadok-absurde. Au second degré, c'est arithmétiquement vrai (3 = 2 + 1, donc « pas de 3 sans 2 »). Au troisième degré, la version originale du proverbe est précisément ce que les statisticiens appellent l'**erreur du joueur** (gambler's fallacy) : croire que deux événements en appellent un troisième est un biais cognitif classique. **En détournant le proverbe, on se moque de l'illusion qu'il véhicule** — exactement la mission pédagogique de Pifométrie.
- **Paysage canon** : ville-tripot fluvial sur la Vistule. Tapis verts à perte de vue, croupiers en chapka qui distribuent des cartes au bord de l'eau. Sur la place principale, une grande Roulette Royale visible à des lieues. Les marchés se tiennent les jours dont le numéro divise 7.

#### Glitchistan — _Algorithmique_

- **Gouverneur** : 🟢 **Bosse-de-Nage** (canon Jarry, _Gestes et opinions du docteur Faustroll, pataphysicien_) — cynocéphale (homme à tête de chien) qui **n'articule que « ha ha »**. C'est-à-dire qu'il est **mathématiquement** un programme qui boucle sur une seule instruction (`while True: print('ha ha')`). C'est un **bug humanoïde canon Jarry**, autorité officielle qui répond à toutes les questions par le même son glitché. Mandat unique, pas de cumul UI. **Voix** : exclusivement « ha ha », parfois « hahaha » lors des grandes décisions, plus rarement un silence (qui est interprété comme un crash royal). Les Galopins apprennent à décoder (« ha ha » suivi d'un sourire = approbation, suivi d'un froncement = désapprobation, simultané avec une morsure = décret royal de bannissement).
- **Capitale** : 🟡 **Turingrad**
- **Étymologie** : d'**Alan Turing (1912-1954)**, mathématicien britannique fondateur de l'informatique théorique, inventeur de la **machine de Turing** (1936) — l'objet conceptuel qui définit ce qu'est un algorithme. Le suffixe `-grad` est cyber-soviétique brutaliste (Volgograd, Léningrad, Kaliningrad), parfaitement raccord avec le caractère post-soviétique pixelisé de Glitchistan.
- **Devise** : « **Aux grands maux les grands Reset !** »
- **Commentaire de la devise** : détournement du proverbe « Aux grands maux, les grands remèdes ». Le swap _remèdes_ → _Reset_ préserve le rythme et la rime du proverbe original. La majuscule à _Reset_ fait du redémarrage une **institution royale** (le Grand Reset comme procédure d'État). Mathématiquement, c'est l'application directe de l'impuissance algorithmique : face au **halting problem** de Turing (1936) — on ne peut pas savoir en général si un programme s'arrêtera —, la seule solution face à une boucle infinie reconnue est le reset. La devise canonise par décret royal le geste universel du dev face au bug irréductible : _« Have you tried turning it off and on again ? »_. Hommage discret au gouverneur conceptuel de Turingrad.
- **Paysage canon** : République brutaliste pixelisée. Bâtiments en briques 8-bit, lignes électriques qui glitchent, panneaux d'affichage en flicker permanent. Au centre de Turingrad, **une Machine de Turing physique géante** — ruban infini, tête de lecture cliquetante — qui marque le rythme officiel de la République. Les habitants ont parfois deux ombres.

#### Patatovie — _Logique et ensembles_

- **Gouverneur** : 🟢 **Docteur Faustroll** (canon Jarry, _Gestes et opinions du docteur Faustroll, pataphysicien_) — **LE pataphysicien officiel** de Jarry, héros de l'œuvre théorique de la pataphysique (publiée à titre posthume en 1911). Faustroll classe les œuvres et les concepts dans un ordre pataphysique, navigue d'île en île dans son bateau-passoire (« as squelette », bateau-tamis), et incarne la **science des solutions imaginaires aux problèmes que les autres ont déjà résolus**. Patatovie est exactement son territoire intellectuel. Mandat unique, pas de cumul UI. **Voix** : érudite, lente, solennelle, taxonomiste. Cite les classiques. S'exprime en phrases longues et hypotaxiques. Vouvoie tout le monde, y compris ses chats.
- **Capitale** : 🟡 **Cracovenn**
- **Étymologie** : **détournement de Cracovie**, ancienne capitale royale de Pologne (jusqu'au XVIIᵉ siècle), située sur la **Vistule** comme Bonneteau-sur-Vistule (les deux capitales partagent le fleuve). Fusion avec **John Venn (1834-1923)**, mathématicien britannique inventeur des **diagrammes de Venn** (1880) — c'est-à-dire **les patates** qui donnent leur nom à la province. Hommage canonique parfait : la province des patates est gouvernée depuis la ville du créateur des patates-diagrammes.
- **Devise** : « **L'infini n'en finit pas d'en finir, surtout vers la fin** »
- **Commentaire de la devise** : aphorisme original construit en deux temps. Le premier temps (_« n'en finit pas d'en finir »_) joue sur l'**allitération en F** (fi-ni-fi-ni-fi-nir) qui mime sonorement le processus qu'elle décrit ; et sur l'**auto-contradiction grammaticale** (« finir » et « ne pas finir » s'annulent), qui exprime exactement le **statut paradoxal de l'infini en théorie des ensembles** (l'infini en acte selon Cantor est à la fois achevé comme objet et inachevé comme processus). Le second temps (_« surtout vers la fin »_) détourne la formule cocasse de Woody Allen sur l'éternité (« L'éternité, c'est long, surtout vers la fin »). Comique de retard, profondeur Cantorienne, signature aphoristique forte. Inscriptible au fronton de Cracovenn.
- **Paysage canon** : pays slave doux et vallonné, parsemé de collines-tubercules. Champs de patates à perte de vue. Cracovenn est bâtie en cinq enceintes concentriques (l'enceinte d'A, l'enceinte d'A∪B, etc.) — la ville **est** un diagramme de Venn habitable.

### Synthèse des devises

Les six devises forment une palette stylistique cohérente : cinq sur six sont des **détournements de références culturelles connues** (proverbes, expressions, aphorismes célèbres), Yoyolande seule étant en pure création. Toutes cachent un **fond mathématique réel** sous l'humour Shadok / Pierre Dac.

| Province    | Devise                                                          | Source détournée                       | Fond mathématique                           |
| ----------- | --------------------------------------------------------------- | -------------------------------------- | ------------------------------------------- |
| Nombrilie   | « **Patron, la soustraction !** »                               | « Patron, l'addition ! »               | opérations arithmétiques fondatrices        |
| Bedonstan   | « **La route est droite, mais la courbe est forte** »           | Raffarin (2002)                        | géométrie hyperbolique de Lobatchevski      |
| Yoyolande   | « **Plus ça monte, moins ça descend** »                         | (création)                             | variations de fonctions monotones           |
| Pifométrie  | « **Jamais trois sans deux** »                                  | « Jamais deux sans trois »             | erreur du joueur (gambler's fallacy)        |
| Glitchistan | « **Aux grands maux les grands Reset !** »                      | « Aux grands maux les grands remèdes » | halting problem (Turing 1936)               |
| Patatovie   | « **L'infini n'en finit pas d'en finir, surtout vers la fin** » | Woody Allen sur l'éternité             | infinis de Cantor (en acte vs en puissance) |

**Diversité orale** : quatre devises se prononcent calmement (Bedonstan, Yoyolande, Pifométrie, Patatovie) ; deux se crient avec un point d'exclamation (Nombrilie, Glitchistan). Cette diversité reflète le caractère des provinces : actives (Nombrilie comptable, Glitchistan crashante) vs méditatives (Bedonstan géométrique, Patatovie logicienne).

**Diversité de longueurs** : 4-4-5-6-9-12 mots. Bonne respiration de la palette à l'oral comme à l'écrit.

### Synthèse des gouverneurs

Les six gouverneurs des Provinces sont **tous des personnages canoniques de Jarry** (canonicité 🟢), aucune invention. La cosmogonie des Chiphres convoque ainsi l'**ensemble de l'œuvre pataphysique majeure** de Jarry, pas seulement _Ubu Roi_.

| Province    | Gouverneur             | Œuvre source       | Cumul UI               | Caractère                                |
| ----------- | ---------------------- | ------------------ | ---------------------- | ---------------------------------------- |
| Nombrilie   | **Mère Ubu**           | _Ubu Roi_ (1896)   | + Marketplace          | Calculatrice, manipulatrice              |
| Bedonstan   | **Professeur Achras**  | _Ubu Cocu_ (1944)  | (mandat seul)          | Éleveur de polyèdres                     |
| Yoyolande   | **Bougrelas**          | _Ubu Roi_ (1896)   | + Mascotte progression | Prince yoyo (chute puis remontée)        |
| Pifométrie  | **Cheval à Phynances** | _Ubu Roi_ (1896)   | + Compagnon évolutif   | Animal-instinct, hennit ses décisions    |
| Glitchistan | **Bosse-de-Nage**      | _Faustroll_ (1911) | (mandat seul)          | Cynocéphale qui n'articule que « ha ha » |
| Patatovie   | **Docteur Faustroll**  | _Faustroll_ (1911) | (mandat seul)          | Pataphysicien officiel, classificateur   |

**Trois œuvres-source** : _Ubu Roi_ (3 gouverneurs), _Ubu Cocu_ (1), _Faustroll_ (2). Hommage canon complet à l'œuvre pataphysique de Jarry.

**Trois cumuls de mandats ubuesques** : Mère Ubu, Bougrelas, Cheval à Phynances cumulent gouvernance et rôle UI. Cohérent avec la cour d'Ubu où **tout le monde cumule** — Ubu lui-même est capitaine, comte, roi, maître des phynances, grand maître de l'ordre de la Gidouille et docteur en pataphysique.

**Trois mandats purs** : Achras, Bosse-de-Nage et Faustroll n'ont qu'une seule fonction (gouverneur), ce qui leur donne un poids narratif spécifique.

**Diversité de natures** : trois humains (Mère Ubu, Achras, Bougrelas), un cynocéphale (Bosse-de-Nage), un cheval (Cheval à Phynances), et un pataphysicien-savant (Faustroll). La cour des Chiphres rassemble toute la faune et la flore ubuesques.

**Cohérence caractères-provinces** parfaite :

- Mère Ubu calculatrice → Nombrilie comptable
- Achras éleveur de polyèdres → Bedonstan géométrique
- Bougrelas prince yoyo → Yoyolande oscillante
- Cheval à Phynances animal-instinct → Pifométrie au pif
- Bosse-de-Nage en boucle « ha ha » → Glitchistan algorithmique
- Faustroll pataphysicien classificateur → Patatovie logicienne

### Synthèse cartographique

| Province    | Capitale              | Suffixe      | Référent                      |
| ----------- | --------------------- | ------------ | ----------------------------- |
| Nombrilie   | Empoche-les-Bains     | -les-Bains   | français thermal              |
| Bedonstan   | Lobatchevsk           | -evsk        | mathématicien russe (réel)    |
| Yoyolande   | Sinusborg             | -borg        | scandinave                    |
| Pifométrie  | Bonneteau-sur-Vistule | -sur-Vistule | français + fleuve réel        |
| Glitchistan | Turingrad             | -grad        | cyber-soviétique              |
| Patatovie   | Cracovenn             | détournement | ville polonaise réelle + Venn |

**Six provinces, six capitales, six registres sonores totalement différents.** La carte des Chiphres sonne comme une vraie Europe imaginaire à cultures multiples. Plusieurs ancrages réels (Lobatchevsk, Cracovie, Vistule, Turing, Venn) donnent à la Pologne pataphysique une assise géographique et historique authentique, sans jamais perdre son caractère pataphysique.

### La Vistule, fleuve canonique de la Pologne pataphysique

Le fleuve **Vistule** (canon Chiphres 🟡, inspiré du fleuve réel de Pologne) traverse la Pologne d'est en ouest. Il prend sa source dans les montagnes de Bedonstan (au pied des Pythagoriades), traverse Cracovenn (Patatovie), longe Bonneteau-sur-Vistule (Pifométrie), et se jette dans la **mer Baltique** au-delà des frontières — la même mer que celle où Ubu et Mère Ubu fuient à la fin d'_Ubu Roi_ (acte V, scène 4 — canon Jarry 🟢).

Cette continuité géographique ancre Chiphres dans **la Pologne réelle de Jarry**, malgré les suffixes -stan / -istan exotiques des provinces.

### Les Axiomes Ubuesques

Les huit axiomes fondateurs du Royaume, à afficher dans le pied de page des Chiphres ou dans une page « Charte » :

1. **Tout calcul appartient à Sa Majesté Phynancière.**
2. **Toute erreur enrichit le Maître. Toute réussite l'enrichit également.**
3. **Le Décervelage est le commencement de la Sagesse.**
4. **Une Gidouille de gagnée vaut mieux que dix d'espérées.**
5. **Le Polonais ne doit jamais comprendre du premier coup.**
6. **Le Czar Alexis est l'ennemi héréditaire.**
7. **Hors du Royaume, point de Phynance.**
8. **Si la pataphysique contredit les mathématiques, c'est la pataphysique qui a raison — sauf au tableau.**

### La Pataphysique selon Chiphres

> _La Pataphysique est la science des solutions imaginaires aux problèmes que les autres ont déjà résolus._

Dans Chiphres, **la pataphysique est l'art de chercher en se trompant**. C'est-à-dire : la science de l'élève. Quand un Galopin se trompe, il ne « rate » pas — il fait de la pataphysique. Cette reformulation est centrale : elle dédramatise l'erreur en l'élevant au rang de discipline.

### Le triptyque corporel-instrumental d'Ubu (canon Jarry)

À utiliser pour habiller les features et les surnoms :

- 🟢 **La gidouille / la bouzine / la boudouille** : trois noms canoniques pour le ventre spiralé d'Ubu. Différenciation possible dans l'UI : _gidouille_ pour la monnaie principale, _bouzine_ pour la barre de progression (ce qui se gonfle), _boudouille_ pour les achievements (ce qui se collectionne).
- 🟢 **Le bâton-à-physique** : que porte Ubu sous le bras. Symbole d'autorité et de décret. À utiliser pour des actions admin / validations.
- 🟢 **Le croc à phynances** : crochet à pièces. Symbole d'extorsion légale. Image parfaite pour le tuteur qui « accroche » la connaissance, ou pour le bouton de paiement.

---

## III. Personnages

### Le Casting Principal

#### 👑 Père Ubu — _Sa Majesté Phynancière, Roi de Pologne et Maître de l'Académie_

- **Rôle UI** : Tuteur IA, mascotte du site, voix dominante.
- **Tempérament** : Vénal, lâche, grandiloquent, gourmand, paresseux. Mais brillant quand il sent une gidouille à empocher.
- **Apparence** : Ronde silhouette en poire, gidouille spiralée sur le ventre, crâne en forme de poire, chapeau pointu.
- **Tics de langage** : « Merdre ! », « Cornegidouille ! », « De par ma chandelle verte ! », « Cornefinance ! », « Tudieu ! », « Bouffre ! ». Inverse parfois les mots ou ajoute des néologismes.
- **Motivation** : Empocher. Toujours empocher. Si l'élève apprend, c'est un effet secondaire regrettable mais lucratif.
- **Quand il intervient** : tutorat, accueil, validation des cartes VIP, événements majeurs.

#### 👸 Mère Ubu — _Reine consort, Intendante du Marché_

- **Rôle UI** : Maîtresse du Marketplace et de la Boutique. Voix qui accompagne tout ce qui touche aux échanges, achats, ventes.
- **Tempérament** : Ambitieuse, manipulatrice, plus subtile qu'Ubu. Elle planifie pendant qu'il braille. Elle ne croit pas vraiment aux maths mais elle adore les comptes.
- **Apparence** : Élégante caricature, robe à frou-frous, éventail, sourire entendu.
- **Tics de langage** : Plus posée, plus lettrée. « Mon ami, voyez comme cette transaction est avantageuse… », « Que voulez-vous, Père Ubu ne sait pas compter mais moi si. »
- **Motivation** : Faire fructifier les phynances en douce.
- **Quand elle intervient** : marketplace, boutique, tutoriels d'achat, recommandations.

#### ⚔️ Capitaine Bordure — _Sergent-Recruteur de l'Académie_

- **Rôle UI** : Onboarding, tutoriels initiaux, didacticiel.
- **Tempérament** : Militaire pataud, droit, naïf, incorruptible (donc systématiquement trahi par Ubu).
- **Apparence** : Uniforme polonais bouffant, moustache.
- **Tics de langage** : Phrases courtes, vocabulaire militaire. « Galopin ! Au rapport ! », « Marche ! Gauche, droite, gauche ! », « C'est un ordre. »
- **Motivation** : Servir. Naïvement.
- **Quand il intervient** : premier login, complétion de profil, tutoriels d'utilisation des features.

#### 🎓 Bougrelas — _Le Galopin Modèle, Prince Légitime_

- **Rôle UI** : Avatar de progression, mascotte « élève qui réussit ». L'élève s'identifie à lui sans le savoir.
- **Tempérament** : Sérieux, courageux, un peu trop parfait, donc cible naturelle des moqueries d'Ubu.
- **Apparence** : Jeune, blond, fier, un peu agaçant.
- **Tics de langage** : Soutenu, héroïque. « Je vengerai mon père ! », « La justice triomphera ! »
- **Motivation** : Reconquérir le trône (allégorie : maîtriser le programme).
- **Quand il intervient** : pop-ups de félicitations majeures, ouverture de chapitres, débloquage de grades.

#### 😇 Conscience — _Le Petit Personnage dans la Valise_

- **Rôle UI** : Voix du correcteur strict, donneur de leçons (au sens littéral).
- **Tempérament** : Sermonneur, vertueux, exaspérant. Ubu le trimballe dans une valise et le sort à contrecœur quand il est forcé de réfléchir.
- **Apparence** : Petit moustachu pâle.
- **Tics de langage** : Phrases longues et moralisatrices. Tutoie l'élève avec gravité.
- **Motivation** : Éduquer malgré tout.
- **Quand il intervient** : explications détaillées (mode « niveau d'aide maximal »), corrigés rigoureux, rappels de méthode.

#### 🐻 Le Czar Alexis — _L'Antagoniste suprême_ 🟢

- **Source** : canon Jarry, _Ubu Roi_, actes III et IV. Le **Czar Alexis** est le souverain de Russie qui combat Ubu lors de la campagne militaire. Jarry écrit _Czar_ (avec **C**), pas _Tsar_ — cette orthographe canonique est préservée. **Siège canonique** : le **palais de Moscou** (canon Jarry).
- **Rôle UI dans les Chiphres** : Boss des défis majeurs, brevet, bac, examens blancs, tournois, contrôles trimestriels. Le Galopin **affronte canoniquement le Czar Alexis** lors du Grand Décervelage — exactement comme Ubu l'affronte dans la pièce.
- **Tempérament** : Glacial, méthodique, redoutable. Voix grave, autorité naturelle. Représente l'évaluation officielle, la sanction, le programme institutionnel. **Adversaire respecté** plus qu'haï — son rôle est nécessaire à la progression.
- **Apparence** : Grand barbu, chapka, manteau de fourrure d'ours, regard d'aigle. Iconographie XIXᵉ siècle russe impériale.
- **Tics de langage** : Phrases solennelles, accent slave assumé. Juron canon : **_« Par Saint Georges ! »_** (canon Jarry, _Ubu Roi_) — patron du combat chevaleresque russe. Il appelle les Galopins **_« Galopinski »_** (forme russifiée affectueuse-menaçante).
- **Motivation** : Imposer l'ordre mathématique officiel. Il **n'est pas l'antagoniste philosophique** d'Ubu (Ubu et Alexis se respectent mutuellement comme deux souverains) — il est l'adversaire institutionnel.
- **Quand il intervient** : annonce d'examens, défis hebdomadaires majeurs, tournois inter-classes, événements compétitifs. Il ouvre les sessions d'évaluation et clôt les épreuves.
- **Bonus narratif canon** : dans _Ubu Roi_, le Czar Alexis **gagne la bataille** contre Ubu (acte IV). Cette défaite ubuesque canonique permet aux Chiphres de **dédramatiser les mauvais résultats** : _« Cornegidouille ! Nous avons été déconfits par le Czar Alexis, comme à Sandomir ! Mais Notre Majesté reviendra ! »_

#### 🐴 Le Cheval à Phynances — _La Monture Royale_

- **Rôle UI** : Compagnon de progression, monture qui évolue avec les grades.
- **Tempérament** : Fataliste, las, philosophe.
- **Apparence** : Cheval squelettique au début, transformé en destrier d'or au grade ultime.
- **Tics de langage** : Hennit des aphorismes mathématiques.
- **Motivation** : Survivre à son cavalier.

#### 🎩 Monsieur Prudhomme — _La Voix des Édits Royaux_ 🟢 (via Henri Monnier)

- **Source** : personnage canonique d'Henri Monnier (1799-1877, domaine public depuis 1947), créé en 1830 dans _Scènes populaires_. Précurseur direct du ton ubuesque — Monnier inventa Prudhomme **66 ans avant** que Jarry n'invente Ubu. Voir fiche détaillée dans le **Lexique Pataphysique des Chiphres**, Section X (Patanautes Yllustres).
- **Rôle UI dans les Chiphres** : **voix tutorale alternative** à Père Ubu, réservée aux **écrans administratifs solennels** où le ton ubuesque serait incongru. CGU (= « Édits du Royaume »), mentions légales, RGPD (= « Sceau Secret »), politique de confidentialité, conditions d'utilisation, formulaires officiels.
- **Tempérament** : Solennel-bourgeois. Sentencieux. Prononce des évidences avec une autorité grandiloquente. **Conformiste satisfait**, jamais grossier, jamais agressif.
- **Apparence** : Personnage XIXᵉ siècle bourgeois français, redingote, lavallière, lorgnon. **Calligraphie soignée** (Prudhomme est canoniquement professeur de calligraphie chez Monnier).
- **Tics de langage canon** : _« C'est mon opinion, et je la partage »_, _« Le char de l'État navigue sur un volcan »_, _« Sans la liberté de blâmer, il n'est point d'éloge flatteur »_, _« Ôtez l'homme de la société, vous l'isolez »_.
- **Détournements pour les Chiphres** (forgés dans le même registre tautologique-solennel) : _« C'est ma démonstration, et je la partage »_, _« Hors du Royaume de Pologne, point de Phynances »_, _« Sans la liberté de pataphysiquer, il n'est point de Décervelage flatteur »_.
- **Motivation** : Administrer dignement. Faire respecter le formalisme bureaucratique du Royaume avec un sérieux imperturbable.
- **Quand il intervient** : page CGU, mentions légales, écrans d'erreur 500 (_« Cornegidouille ! Le char de l'Académie navigue sur un volcan. Patientez. »_), formulaires de consentement RGPD, page de conditions d'utilisation, paramètres administratifs.

#### 🎩 Tristan Bernard — _La Voix du Flegme Spirituel_ 🟢

- **Source** : Paul Bernard, dit Tristan Bernard (1866-1947, domaine public depuis 2018). Patanaute Yllustre direct des Chiphres, ami canonique d'Alphonse Allais, introducteur des mots croisés en France en 1924. Voir fiche détaillée dans le **Lexique Pataphysique des Chiphres**, Section X.
- **Rôle UI dans les Chiphres** : **troisième voix tutorale** complémentaire, réservée aux **moments calmes** où Ubu serait trop tonitruant et Prudhomme trop pompeux. Pages de méditation, écrans de récapitulatif post-exercice, transitions entre niveaux, écrans de doute après un échec, message du jour, réflexions personnelles.
- **Tempérament** : Flegmatique-spirituel. Lucidité désabusée. Précision lexicale. Autodérision élégante. **Intelligence calme**, jamais agressive, jamais déclarative.
- **Apparence** : Personnage Belle Époque français, costume sobre de la fin du XIXᵉ, lavallière, barbe taillée. Élégance ferme.
- **Tics de langage canon** : _« Il vaut mieux ne pas réfléchir du tout que de ne pas réfléchir assez »_, _« Il ne faut compter que sur soi-même. Et encore, pas beaucoup »_, _« Plus on rencontre des difficultés dans la vie, plus on a en soi de fierté et de contentement de soi-même »_, _« Jouer, c'est vivre. Car vivre, c'est espérer. »_
- **Motivation** : Accompagner les Galopins dans les moments de doute. Désamorcer l'échec par l'humour calme. Encourager sans flatter.
- **Quand il intervient** : écrans de progression après échec, récapitulatifs post-exercice, citations rotatives sur le splash screen, pages de méditation, transitions entre niveaux, message du jour calme.

### Les trois voix tutorales — synthèse

Le **casting tutoral** des Chiphres est désormais **stratifié sur trois registres complémentaires** :

| Voix                                 | Registre                  | Quand l'utiliser                                            |
| ------------------------------------ | ------------------------- | ----------------------------------------------------------- |
| **Père Ubu**                         | Grandiloquente-grotesque  | Action, exercices, jurons, voracité, cinématiques majeures  |
| **Monsieur Prudhomme** (via Monnier) | Grandiloquente-bourgeoise | Écrans administratifs, CGU, mentions légales, RGPD          |
| **Tristan Bernard**                  | Flegmatique-spirituelle   | Méditation, récapitulatifs, transitions, doute, après échec |

**Règle d'usage** : un seul Galopin peut entendre les trois voix au cours d'une même session, à condition que **chaque voix occupe son registre propre**. Ubu n'écrit jamais les CGU. Prudhomme ne console jamais après un échec. Bernard ne tonitrue jamais lors d'un combat contre le Czar Alexis. Cette répartition rend les voix **immédiatement reconnaissables** par leur contexte d'apparition.

### Les Palotins (les sbires/copains)

Les Palotins sont les sbires d'Ubu dans la pièce. **Dans les Chiphres, ce sont les amis du Galopin** — déjà câblé dans ton routing `/dashboard/teacher/gamification/buddies`. Donne-leur des sous-personnalités pour que les interactions sociales aient une saveur :

| Palotin       | Personnalité           | Rôle                                    |
| ------------- | ---------------------- | --------------------------------------- |
| **Giron**     | Costaud, simple, loyal | Le pote qui aide aux exercices basiques |
| **Pile**      | Fourbe, opportuniste   | Celui qui propose des trades douteux    |
| **Cotice**    | Lettré, bavard         | Celui qui explique trop                 |
| **Merdanpot** | Stupide mais brave     | Celui qui rate tout avec panache        |

Lorsqu'un Galopin ajoute un ami, on lui assigne aléatoirement (ou par lui-même) un titre de Palotin. Le profil affiche : « Léa Dupont, Palotine Pile de la Quatr'esme B ».

### Personnages mineurs et figurants

- **Le Père Pissedoux** : marchand ambulant qui apparaît rarement, propose des cartes VIP secrètes contre des défis impossibles.
- **Le Czarévitch** : fils du Czar Alexis, antagoniste mineur des tournois inter-classes.
- **Madame la Financière** : juge des litiges du Marketplace.
- **L'Ours du Caucase** : mob qui apparaît dans le jeu Démineur (déjà existant), à rebrander.
- **Les Polonais** : la foule anonyme. Tous les autres Galopins du Royaume. C'est ainsi qu'Ubu désigne « les utilisateurs ».

### La Galerie des Patanautes Yllustres — généalogie culturelle des Chiphres

Les Chiphres revendiquent une **généalogie pataphysique** explicite : 22 patanautes yllustres (= ancêtres pataphysiques au sens canon du Collège de 'Pataphysique) qui inspirent le ton, le décor, les références culturelles et la pédagogie du site. **Ils ne sont pas des personnages du Casting Principal** (qui interagissent avec le Galopin dans l'UI) ni des figurants narratifs — ils sont des **références déclarées** dont l'esprit nourrit l'univers, et dont les œuvres peuvent apparaître en citations, easter eggs, cartes légendaires ou décor.

**Pour les fiches détaillées (œuvres, citations utilisables, statut juridique, usage Chiphres précis), voir le Lexique Pataphysique des Chiphres, Section X.** Cette section du Compendium se contente de présenter la galerie en synthèse pour donner une vue d'ensemble narrative.

#### Note doctrinale — La galerie comme application de l'équivalence des contraires

La structure de cette galerie applique directement le **principe canon 🟢 de l'équivalence des contraires** (voir Section II Cosmogonie). Concrètement :

- **Pas de hiérarchie chronologique** : Rabelais (1494-1553) et Tristan Bernard (1866-1947) sont **également pataphysiques**. Le fait que Rabelais soit antérieur de quatre siècles ne lui donne aucune supériorité doctrinale.
- **Pas de hiérarchie ontologique** : un humain (Lewis Carroll) et un animal (Lutembi le crocodile, Vice-Curateur du Collège de 'Pataphysique pendant 17 ans) sont **également pataphysiques**.
- **Pas de hiérarchie disciplinaire** : un mathématicien (Babbage), un poète (Cros), un compositeur (Satie), une programmeuse (Lovelace) et un humoriste (Allais) sont **également pataphysiques**.
- **Pas de hiérarchie de notoriété** : Rabelais (canon mondial) et Lutembi (crocodile obscur) sont **également pataphysiques**.

**Rappel canonique** : _« Anciens ou récents, réels ou imaginaires, hommes, femmes ou animaux, les Patacesseurs sont également honorés par le Collège. »_ (canon Collège de 'Pataphysique, repris dans _Les 101 mots de la pataphysique_, PUF 2019, entrée PATACESSEURS — citation littérale du Collège ; aux Chiphres, on dit _Patanautes Yllustres_).

**Conséquence wording** : il faut **éviter toute formulation hiérarchique** dans les fiches et les citations Chiphres. Pas de _« grand Rabelais »_, pas de _« simple Lutembi »_, pas de _« Babbage le génie face à »_, etc. Tous les patanautes yllustres sont introduits avec le même niveau de respect — c'est-à-dire avec le même mélange de respect et de pataphysique.

**Application pratique aux cartes de jeu** : les niveaux de rareté des cartes pataphysiques (Plébéienne, Bourgeoise, Noble, Royale — voir Section VI Économie phynancière) **ne reflètent pas une hiérarchie de valeur** mais une hiérarchie de fréquence d'apparition. Une carte royale _Lutembi le crocodile_ n'est pas inférieure à une carte royale _Rabelais_ — elles sont juste rares différemment au sein de leur strate.

#### Le Patanaute Yllustre antique

- **François Rabelais** (1494-1553) 🟢 — patanaute yllustre fondateur, modèle stylistique de Jarry, autorité de la déformation orthographique pataphysique.

#### Le Patanaute Yllustre libertin

- **Cyrano de Bergerac historique** (1619-1655) 🟢 — libertin érudit, voyageur lunaire pataphysique (_États et Empires de la Lune_, 1657), inventeur du procédé de l'anagramme narrative (Dyrcona = anagramme de Cyrano d.), patron tutélaire de Patatovie aux côtés de Faustroll.

#### Les Patanautes Yllustres victoriens (steampunk et logique)

- **Charles Babbage** (1791-1871) 🟢 — inventeur de la Machine Analytique, patron de Glitchistan.
- **Ada Lovelace** (1815-1852) 🟢 — première programmeuse, autrice de la Note G, mascotte du module Python des Chiphres.
- **Lewis Carroll** (1832-1898) 🟢 — mathématicien à Oxford, auteur d'_Alice_ et du **_Game of Logic_** (1886) — proto-Chiphres victorien, patanaute yllustre transversal sur Glitchistan, Patatovie, Yoyolande.

#### Les Patanautes Yllustres de l'absurde français

- **Henri Monnier** (1799-1877) 🟢 — précurseur direct du ton ubuesque, créateur de Monsieur Prudhomme, **voix tutorale des écrans administratifs** des Chiphres.
- **Charles Cros** (1842-1888) 🟢 — patanaute yllustre immédiat de Jarry, Cercle des Hydropathes / Chat Noir, auteur du _Hareng saur_ (proto-algorithme pataphysique).
- **Alphonse Allais** (1854-1905) 🟢 — humour mathématique cérébral, contemporain direct de Jarry, signature alternative possible pour Mère Ubu (citation _« il faut prendre l'argent là où il se trouve »_).
- **Tristan Bernard** (1866-1947) 🟢 — flegme spirituel, ami direct d'Allais et de Renard, introducteur des mots croisés en France (1924), **voix tutorale des moments calmes** des Chiphres.
- **Erik Satie** (1866-1925) 🟢 — pianiste du Chat Noir, fondateur de sa propre Église à un fidèle (1893), auteur de **_Vexations_** (1893, à jouer 840 fois — algorithme musical pataphysique). **Bande-son canonique des Chiphres** (_Gymnopédies_, _Gnossiennes_).

#### Le Père fondateur

- **Alfred Jarry** (1873-1907) 🟢 — voir Section I (Manifeste) et Section XV (Annexe sources canon). **Patron canonique** des Chiphres. La Nativité d'Alfred Jarry (1ᵉʳ Absolu / 8 septembre) est la fête transversale du Royaume.

#### Les Satrapes du XXᵉ siècle (Collège de 'Pataphysique)

- **Marcel Duchamp** (1887-1968) — Satrape _entité_, carte royale « Le Ready-Made » (récompense pour réponse créative).
- **Jean Dubuffet** (1901-1985) — Satrape Art Brut, carte « Hourloupe ».
- **Julien Torma** (1902-1933 ?) — patanaute yllustre mystérieux, carte « L'Auteur Disparu ».
- **Raymond Queneau** (1903-1976) — Satrape oulipien, carte « Cent Mille Milliards ».
- **René Daumal** (1908-1944) — théoricien post-Jarry, carte « La Pataphysique du Mois ».
- **Eugène Ionesco** (1909-1994) — Satrape de l'absurde, carte « La Cantatrice Chauve ».
- **Boris Vian** (1920-1959) — Satrape **BISON RAVI**, carte royale « BISON RAVI » + citation splash.
- **Umberto Eco** (1932-2016) — Satrape sémiologue, carte « Le Nom de l'Équation ».

#### Les Vice-Curateurs canon

- **Lutembi le crocodile** (XIXᵉ-2013) — Vice-Curateur fondateur (1997-2014), carte ultra-rare « Le Crocodile Vice-Curateur ».
- **Tanya Peixoto** (actuelle) — Vice-Curatrice depuis 2014, carte « La Magnificence ».

#### Les influences déclarées contemporaines

- **Jacques Rouxel et les Shadoks** (1931-2004) 🟠 — descendants spirituels de Jarry (filiation explicitement revendiquée par Rouxel), modèle d'absurde calculateur opiniâtre. **Sous droits actifs** : usage limité à la mention comme influence déclarée + inspiration d'esprit pour devises Chiphres originales.
- **De cape et de crocs** d'Alain Ayroles et Jean-Luc Masbou (1995-en cours) 🟠 — bande dessinée majeure de l'humanisme français contemporain, source d'inspiration lexicale précieuse (vieux français XVIIᵉ pastiché). **Sous droits actifs** : usage limité à la mention comme influence déclarée. Inspiration retenue pour le **registre des jurons cape-et-épée des Chiphres** (Section V) et pour l'**esprit littéraire libertin-érudit** incarné par Cyrano de Bergerac (Patanaute Yllustre). **Pas d'utilisation directe** dans les systèmes de grades ou les noms de personnages : la progression Chiphres suit la **Navigation Pataphysique** (Section VII), non-guerrière, inspirée du canon Faustroll.

#### Tableau de synthèse

| #   | Patanaute Yllustre           | Rôle dans les Chiphres                           |
| --- | ---------------------------- | ------------------------------------------------ |
| 1   | François Rabelais            | Patanaute Yllustre fondateur, modèle stylistique |
| 2   | Cyrano de Bergerac           | Patron tutélaire de Patatovie                    |
| 3   | Charles Babbage              | Patron de Glitchistan, Quartier Babbage          |
| 4   | Henri Monnier                | Voix tutorale Monsieur Prudhomme                 |
| 5   | Ada Lovelace                 | Mascotte du module Python, Quartier Lovelace     |
| 6   | Lewis Carroll                | Patanaute Yllustre transversal (3 provinces)     |
| 7   | Charles Cros                 | Poète du Hareng Saur, algorithme pataphysique    |
| 8   | Alphonse Allais              | Signature alternative possible pour Mère Ubu     |
| 9   | Tristan Bernard              | Voix tutorale flegmatique-spirituelle            |
| 10  | Erik Satie                   | Bande-son canonique des Chiphres                 |
| 11  | Alfred Jarry                 | Père fondateur (voir Section I et XV)            |
| 12  | Marcel Duchamp               | Satrape _entité_, carte « Ready-Made »           |
| 13  | Jean Dubuffet                | Carte « Hourloupe »                              |
| 14  | Julien Torma                 | Carte « L'Auteur Disparu »                       |
| 15  | Raymond Queneau              | Carte « Cent Mille Milliards »                   |
| 16  | René Daumal                  | Carte « La Pataphysique du Mois »                |
| 17  | Eugène Ionesco               | Carte « La Cantatrice Chauve »                   |
| 18  | Boris Vian                   | Carte légendaire « BISON RAVI »                  |
| 19  | Jacques Rouxel & les Shadoks | Influence déclarée, devises dans l'esprit        |
| 20  | Umberto Eco                  | Carte « Le Nom de l'Équation »                   |
| 21  | De cape et de crocs          | Influence déclarée, inspiration lexicale         |
| 22  | Lutembi le crocodile         | Vice-Curateur, carte ultra-rare                  |
| 23  | Tanya Peixoto                | Vice-Curatrice actuelle                          |

**23 patanautes yllustres au total** : 12 canon documentés dans _Les 101 mots de la Pataphysique_ (Collège de 'Pataphysique, PUF _Que sais-je ?_, 2019) + Cyrano libertin XVIIᵉ + 3 victoriens (Babbage, Lovelace, Carroll) + 5 absurde français (Monnier, Cros, Allais, Bernard, Satie) + 2 influences déclarées sous droits (Shadoks, _De cape et de crocs_).

---

## IV. Géographie de l'Académie

**L'idée centrale : chaque page du site est un lieu du Royaume.** Le Galopin ne « visite pas la page exercices », il « pénètre dans la Salle des Tortures Phynancières ». L'URL technique reste la même ; seul le wording change.

| Route actuelle                   | Lieu pataphysique              | Voix qui accueille                        |
| -------------------------------- | ------------------------------ | ----------------------------------------- |
| `/`                              | Le Pont-Levis du Royaume       | Père Ubu                                  |
| `/dashboard`                     | Le Cabinet des Phynances       | Mère Ubu                                  |
| `/dashboard/student/cours`       | La Bibliothèque Décervelée     | Conscience                                |
| `/dashboard/student/worksheets`  | Les Archives Polonaises        | Capitaine Bordure                         |
| `/dashboard/student/marketplace` | Le Grand Marché Polonais       | Mère Ubu                                  |
| `/dashboard/student/inventory`   | La Trappe à Trésors            | Père Ubu (gourmand)                       |
| `/dashboard/friends`             | La Caserne des Palotins        | Capitaine Bordure                         |
| `/dashboard/chat`                | Le Préau des Conspirations     | (silencieux)                              |
| `/games`                         | L'Arène des Polonais           | Père Ubu (excité)                         |
| `/games/mathemo`                 | Le Cabaret des Mots Tordus     | —                                         |
| `/games/trio`                    | La Table de Trictrac           | —                                         |
| `/games/minesweeper`             | Les Champs Minés de Lithuanie  | —                                         |
| `/games/2048`                    | La Roulette Ubuesque           | —                                         |
| `/tuteur`                        | L'Antre du Décervelage         | Père Ubu                                  |
| `/pere-ubu`                      | Le Trône Royal                 | Père Ubu (en majesté)                     |
| `/leaderboards`                  | Le Tableau des Honneurs Royaux | Bougrelas                                 |
| `/dashboard/student/riddles`     | La Crypte des Énigmes          | Conscience                                |
| `/dashboard/bug-reports`         | Le Bureau des Doléances        | Madame la Financière                      |
| `/dashboard/admin`               | La Chambre du Conseil Privé    | (réservé Ubu)                             |
| `/legal/cgu`                     | Les Édits Royaux               | **Monsieur Prudhomme**                    |
| `/legal/confidentialite`         | Le Sceau Secret du Royaume     | **Monsieur Prudhomme**                    |
| `/about`                         | La Page d'Or des Chiphres      | **Tristan Bernard** (citations rotatives) |
| `/profile`                       | Le Boudoir du Galopin          | Mère Ubu (doucereuse)                     |
| `/settings`                      | Le Cabinet des Réglages Royaux | **Monsieur Prudhomme**                    |

### Turingrad — sous-géographie de Glitchistan

La province algorithmique de **Glitchistan** est suffisamment importante (algorithmique + programmation Python) pour mériter sa propre cartographie interne. Sa capitale **Turingrad** se compose de **quatre quartiers**, à utiliser pour structurer les pages de Glitchistan :

| Quartier               | Domaine                                | Lieu pataphysique                    |
| ---------------------- | -------------------------------------- | ------------------------------------ |
| **Quartier Babbage**   | Machines analytiques, calcul mécanique | L'Atelier des Polyèdres à Engrenages |
| **Quartier Lovelace**  | Programmation, suites récursives       | Le Salon des Rouleaux d'Instructions |
| **Quartier des Tubes** | Transmission, mémoires, archives       | Le Réseau Pneumatique Royal          |
| **Place du Reset**     | Centre administratif                   | La Cloche de Reset Centrale          |

**Esthétique commune** : steampunk victorien (machines à vapeur, engrenages, tubes pneumatiques, cuivre, laiton). Voir Section II (Cosmogonie) pour le vocabulaire steampunk canonique de Glitchistan (Machine Pataphysique, Console à Vapeur, Carte Perforée, etc.).

### Page 404 actuelle → page 404 ubuesque

> **Cornegidouille !**
>
> Voici une terre qui n'existe point en notre Royaume. Soit vous vous êtes égaré, soit un Polonais malicieux vous a égaré. En tout état de cause, retournez au [Pont-Levis](/) avant que je ne vous fasse passer à la trappe.
>
> _— Père Ubu, fâché_

### Page 500 → page 500 ubuesque

> **Merdre !**
>
> Notre cuisinier phynancier a brûlé la sauce. Les serveurs polonais sont en grève, ou en fuite, ou en train de boire — c'est selon. Réessayez dans un moment, et si la chose persiste, faites-le savoir au Bureau des Doléances.

**Variante administrative** (voix Monsieur Prudhomme, pour les erreurs serveur graves) :

> **Cornegidouille !**
>
> _Le char de l'Académie navigue sur un volcan._ Veuillez patienter quelques instants. Si l'incident persiste, le Bureau des Doléances est à votre disposition.
>
> _— Monsieur Prudhomme, Administrateur des Sceaux Secrets_

---

## V. La Langue Pataphysique

### Lexique canonique

À considérer comme **vocabulaire imposé** dans toute l'interface. Si une feature apparaît, son nom est dans cette liste ou y entre par décret.

**Pour la version exhaustive** (avec fiches détaillées, étymologies, citations canon, statut juridique, exemples UI), voir le **Lexique Pataphysique des Chiphres** (`lexique-pataphysique.md`). La table ci-dessous est la **synthèse de référence** pour le travail quotidien.

| Terme générique              | Terme Chiphres                | Notes                                                                                                                                   |
| ---------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **La plateforme**            | **Chiphres**                  | Marque publique. URL : chiphr.es. Sous-titre : _« les Chiphres de la Chandelle Verte »_.                                                |
| **La discipline enseignée**  | **Mathres**                   | Déformation R potache canon (modèle _merdre_). Remplace « mathématiques » dans tout le wording interne. Voir règle d'écriture ubuesque. |
| Élève                        | **Galopin** / **Galopine**    | Le Galopin est apprenti-aventurier. Étymologie : jeune marmiton médiéval + enfant espiègle moderne. Voir Section III. Pas de péjoratif. |
| Élèves (collectif)           | Les Polonais                  | « Le tableau des Polonais » = leaderboard.                                                                                              |
| Professeur                   | Maître Phynancier             | Ou « Maître » court. Jamais « prof ».                                                                                                   |
| Compte / profil              | Guérite                       | « Ma Guérite » = Mon Profil.                                                                                                            |
| Tableau de bord              | Cabinet des Phynances         | Cabinet = bureau privé.                                                                                                                 |
| Argent virtuel               | Gidouille (déjà acquis)       | Symbole : 🌀 ou spirale. Ne jamais dire « points ».                                                                                     |
| Argent réel (€)              | Phynances                     | « 4,99 € de Phynances ».                                                                                                                |
| Abonnement                   | Pacte Phynancier              | « Souscrire un Pacte Phynancier ».                                                                                                      |
| Erreur, faute                | Pataphysique                  | « Vous avez fait de la pataphysique ! » au lieu de « Faux ».                                                                            |
| Bonne réponse                | Coup de Maître                | Ou « bien empoché ».                                                                                                                    |
| Indice                       | Coup de pouce de Conscience   |                                                                                                                                         |
| Aide / tutoriel              | Décervelage Pédagogique       |                                                                                                                                         |
| Niveau / chapitre            | Province                      | « Vous explorez la Province de Nombrilie. »                                                                                             |
| Exercice                     | Corvée                        | « Une nouvelle corvée vous attend. »                                                                                                    |
| Examen, contrôle             | Décervelage                   | « Le Grand Décervelage du Vendredi ».                                                                                                   |
| Bac                          | Le Décervelage Suprême        | Ou simplement « Le Suprême ».                                                                                                           |
| Brevet                       | Le Petit Décervelage          |                                                                                                                                         |
| Devoir maison                | Corvée Domestique             |                                                                                                                                         |
| Classe (groupe)              | Bataillon                     | « Le Bataillon de Troyz'esme A ».                                                                                                       |
| Niveau scolaire              | Voir Section VII              | 6ᵉ→Syz'esme, 5ᵉ→Zynqu'esme, 4ᵉ→Quatr'esme, 3ᵉ→Troyz'esme, 2nde→Secondre, 1ʳᵉ→Primalle, Term.→Phinalle (φᵃˡᵉ)                            |
| Amis                         | Palotins (déjà acquis)        |                                                                                                                                         |
| Boutique                     | Marché Polonais (déjà acquis) |                                                                                                                                         |
| Inventaire                   | Trappe à Trésors              |                                                                                                                                         |
| Notification                 | Décret                        | « Un nouveau décret pour vous ».                                                                                                        |
| Avertissement                | Coup de Sceptre               | (Tu en as déjà C/M/R/T en système.)                                                                                                     |
| Streak / régularité          | Constance Royale              |                                                                                                                                         |
| Badge                        | Médaille de la Gidouille      |                                                                                                                                         |
| Carte VIP (déjà existant)    | Carte Pataphysique            | Ou conserver « VIP » en interne.                                                                                                        |
| Niveau de difficulté Facile  | Polonais                      | Tout le monde y arrive.                                                                                                                 |
| Niveau Moyen                 | Galopin Aguerri               |                                                                                                                                         |
| Niveau Difficile             | Décervelage Royal             |                                                                                                                                         |
| Sauvegarder                  | Empocher                      |                                                                                                                                         |
| Supprimer                    | Passer à la trappe            |                                                                                                                                         |
| Annuler                      | Renoncer (lâchement)          |                                                                                                                                         |
| Confirmer                    | Décréter                      |                                                                                                                                         |
| Recommencer                  | Remettre couvert              |                                                                                                                                         |
| Chercher                     | Fouiller                      |                                                                                                                                         |
| Filtrer                      | Trier dans la trappe          |                                                                                                                                         |
| Paramètres                   | Décrets Royaux                |                                                                                                                                         |
| Aide / FAQ                   | Le Bréviaire Pataphysique     |                                                                                                                                         |
| Mentions légales             | Édits Royaux                  |                                                                                                                                         |
| Politique de confidentialité | Sceau Secret                  |                                                                                                                                         |
| Déconnexion                  | Quitter le Royaume            |                                                                                                                                         |

### Le vocabulaire hybride Chiphres / Mathres

Distinction sémantique fondatrice du wording des Chiphres :

| Terme        | Désigne                                              | Exemples d'usage                                                                       |
| ------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Chiphres** | La **plateforme** + le côté **concret/calculatoire** | _« sur les Chiphres »_, _« jouer aux Chiphres »_, _« manipuler les chiphres »_         |
| **Mathres**  | La **discipline scolaire** enseignée                 | _« le Galopin apprend les Mathres »_, _« cours de Mathres »_, _« épreuve de Mathres »_ |

**Phrase-clé du manifeste pédagogique** : _« Les Galopins apprennent les Mathres sur les Chiphres. »_

**Dérivés de Mathres** :

- **Mathres Royales** : variante solennelle pour cinématiques (_« Bienvenue aux Mathres Royales de Pologne »_)
- **Mathresque** : adjectif (_« pensée mathresque »_, _« défi mathresque »_)
- **Mathrer** : verbe (_« mathrer un exercice »_ = résoudre selon les principes des Chiphres)
- **Mathrologie** : la théorie pataphysique des Mathres (sonne savant et ubuesque)

### Néologismes mathématiques

Pour habiller les concepts mathématiques eux-mêmes, sans les dénaturer (l'élève apprend les vrais noms — Ubu rajoute des **surnoms ubuesques** entre parenthèses, optionnels, qui apparaissent dans les bulles de Père Ubu).

| Concept               | Surnom ubuesque             |
| --------------------- | --------------------------- |
| Fraction              | Demi-gidouille              |
| Équation              | Devinette à Phynance        |
| Inéquation            | Devinette de Travers        |
| Dérivée               | Fuite de la Variable        |
| Intégrale             | Empoche-Tout                |
| Probabilité           | Grimoire des Hasards        |
| Vecteur               | Flèche Polonaise            |
| Logarithme            | Sortilège de Bordure        |
| Théorème de Pythagore | Loi du Professeur Achras 🟢 |
| Théorème de Thalès    | Triangle Nourricier         |
| Trigonométrie         | Science Tournante           |
| Suite numérique       | Cortège des Nombres         |
| Limite                | Mur Phynancier              |
| Polynôme              | Pâté de Variables           |
| Racine carrée         | Tubercule Pataphysique      |

### Les jurons d'Ubu (dictionnaire d'usage)

Chaque juron canonique a un **contexte d'utilisation préférentiel**. Cela permet à un système de templating de tirer le bon juron selon la situation.

| Juron                               | Quand l'utiliser                                               | Statut         |
| ----------------------------------- | -------------------------------------------------------------- | -------------- |
| **Merdre !**                        | Erreur grave, échec, exclamation principale. Le mot fondateur. | 🟢 canon Jarry |
| **Cornegidouille !**                | Étonnement, surprise. Plus doux que « merdre ».                | 🟢 canon Jarry |
| **Ventrebleu !**                    | Frustration mineure, désappointement.                          | 🟢 canon Jarry |
| **Tudieu !**                        | Stupéfaction admirative, succès inattendu du Galopin.          | 🟢 canon Jarry |
| **Cornefinance !**                  | Excitation phynancière (gain, achat, ouverture de boutique).   | 🟢 canon Jarry |
| **De par ma chandelle verte !**     | Promesse, serment, déclaration solennelle.                     | 🟢 canon Jarry |
| **Par ma gidouille !**              | Affirmation forte, signature.                                  | 🟢 canon Jarry |
| **Par mon sceptre à phynances !**   | Décret, ordre.                                                 | 🟢 canon Jarry |
| **Bouffre !**                       | Mépris affectueux.                                             | 🟢 canon Jarry |
| **Jambedieu !**                     | Variante peu utilisée, à garder pour effet de surprise.        | 🟢 canon Jarry |
| **De par mon cheval à phynances !** | Solennel, monté, déclamatoire.                                 | 🟢 canon Jarry |

#### Jurons élargis cape et épée 🟡

**Jurons forgés pour les Chiphres**, dans l'esprit lexical de la BD _De cape et de crocs_ (Ayroles & Masbou — voir Section III Patanautes Yllustres et Section X du Lexique). Ces jurons enrichissent la palette de Père Ubu pour les **cinématiques majeures** et les **moments de proclamation solennelle**, sans copier les jurons spécifiques de la BD (qui sont sous droits).

| Juron forgé                      | Quand l'utiliser                                                  |
| -------------------------------- | ----------------------------------------------------------------- |
| **Mort de mes phynances !**      | Exclamation grave, perte financière, situation désespérée         |
| **Sang de la Gidouille !**       | Combat, défi engagé, moment d'action                              |
| **Par les barbes du Père Ubu !** | Serment, engagement solennel                                      |
| **Tripes et boyaux du Czar !**   | Insulte affectueuse envers le Czar Alexis (registre cape et épée) |

**Mécanique de forge** : substantif vital (mort, sang, barbe, tripes) + invocation canon Jarry (phynances, Gidouille, Père Ubu, Czar) + grammaire archaïque XVIIᵉ. Le registre cape-et-épée est conservé dans le **vocabulaire des jurons** (par cohérence avec l'inspiration _De cape et de crocs_ d'Ayroles et Masbou — Section III), mais **pas** dans le système de grades de progression : ces derniers suivent la **Navigation Pataphysique** non-guerrière (voir Section VII).

#### Juron du Czar Alexis 🟢

| Juron                   | Locuteur                  | Contexte                                                                                                                                                     |
| ----------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Par Saint Georges !** | Czar Alexis exclusivement | Canon Jarry, _Ubu Roi_. Patron du combat chevaleresque russe. À utiliser dans les cinématiques où le Czar Alexis intervient (annonce d'examen, défi majeur). |

### Néologismes orthographiques canon Jarry 🟢

Au-delà des jurons, Jarry pratique une **déformation orthographique systématique** dans son œuvre. Le Père Ubu lui-même a expliqué sa doctrine dans le grand _Almanach du Père Ubu_ (1901) :

> _« Les bougres qui veulent changer l'orthographe ne savent pas et moi je sais. Ils bousculent toute la structure des mots et, sous prétexte de simplification, les estropient. Moi je les perfectionne et embellis à mon image et à ma ressemblance. »_
>
> — Père Ubu, _Almanach du Père Ubu_, 1901

Cette citation est le **manifeste linguistique** des Chiphres. Elle justifie pataphysiquement toutes les déformations orthographiques pratiquées sur la plateforme, y compris **Mathres** (notre néologisme central) et les **sept Niveaux Scolaires Pataphysiques** (Syz'esme → Phinalle).

#### Déformations canon Jarry attestées dans _Ubu Roi_ et l'Almanach 🟢

| Forme déformée               | Forme standard          | Mécanique                                              | Source                          |
| ---------------------------- | ----------------------- | ------------------------------------------------------ | ------------------------------- |
| **merdre**                   | merde                   | R potache canon                                        | _Ubu Roi_, acte I (premier mot) |
| **phynance**                 | finance                 | substitution *f*→*ph* + *i*→*y*                        | _Ubu Roi_, passim               |
| **bouzine**                  | (synonyme de gidouille) | néologisme                                             | _Ubu Roi_, _Ubu Cocu_           |
| **monsieuye**                | monsieur                | suffixe _-ye_ précieux                                 | _Almanach_ 1901                 |
| **par conseiquent de quoye** | par conséquent de quoi  | suffixe _-oye_                                         | _Almanach_ 1901                 |
| **périgiglyeux**             | périlleux               | redoublement consonantique + _-gigly-_ + suffixe _-ye_ | _Almanach_ 1901                 |

#### Déformations Chiphres (extensions cohérentes) 🟡

| Forme          | Mécanique                                                       | Usage                                     |
| -------------- | --------------------------------------------------------------- | ----------------------------------------- |
| **Mathres**    | R potache canon (modèle _merdre_)                               | Discipline scolaire — voir ci-dessus      |
| **Chiphres**   | substitution _ph_ (modèle _phynance_)                           | Nom de la plateforme                      |
| **Syz'esme**   | apostrophe + *i*→*y* + *x*→*z* + suffixe _-esme_ vieux français | Niveau 6ᵉ                                 |
| **Zynqu'esme** | apostrophe + *c*→*z* + *i*→*y* + _-esme_                        | Niveau 5ᵉ                                 |
| **Quatr'esme** | apostrophe + _-esme_                                            | Niveau 4ᵉ                                 |
| **Troyz'esme** | apostrophe + *i*→*y* + *s*→*z* + _-esme_                        | Niveau 3ᵉ                                 |
| **Secondre**   | R potache canon                                                 | Niveau Seconde                            |
| **Primalle**   | racine _Primal_ + _L_ doublé                                    | Niveau Première                           |
| **Phinalle**   | *t*→*ph* + _L_ doublé                                           | Niveau Terminale (abréviation : **φᵃˡᵉ**) |

Pour les fiches détaillées de chaque néologisme, voir le **Lexique Pataphysique des Chiphres**, Section III.

### Règles de l'écriture ubuesque

1. **« Merdre » n'est pas « merde ».** Le R supplémentaire est sacré. Toute occurrence sans R est un bug à signaler.
2. **« Phynance(s) »** — toujours avec « ph » et « y ». Jamais « finance ». Vaut pour tout dérivé : _phynancier_, _phynancière_, _Cornefinance_.
3. **« Mathres » n'est pas « maths ».** Le R potache est la signature de la discipline aux Chiphres. Vaut pour tous les dérivés : _mathres royales_, _mathresque_, _mathrer_, _mathrologie_.
4. **« Chiphres » n'est pas « chiffres ».** Le _ph_ est la signature de la plateforme. Le mot « chiffres » au sens calculatoire reste possible avec son orthographe standard (« le Galopin manipule les chiffres »), mais **Chiphres** majuscule désigne uniquement la plateforme.
5. **Majuscules royales.** Père Ubu, Mère Ubu, Maître Phynancier, Galopin, Polonais, Royaume — tous capitalisés. De même pour les noms des Niveaux Scolaires (Syz'esme, Phinalle, etc.) et des Provinces (Nombrilie, Glitchistan, etc.).
6. **Pas d'anglicismes.** Pas de « XP », pas de « level », pas de « streak ». Tout doit être traduit dans la langue pataphysique.
7. **Pas d'emojis dans la voix d'Ubu.** Père Ubu n'utilise pas d'emojis (anachronique). En revanche, l'interface peut, sobrement, et **la gidouille (🌀) est l'emoji canonique**. **Phi grec minuscule (φ)** est l'autre symbole canonique des Chiphres (abréviation de Phinalle).

---

## VI. Économie phynancière

### Les deux monnaies

| Monnaie       | Symbole      | Nature                                          | Conversion                                            |
| ------------- | ------------ | ----------------------------------------------- | ----------------------------------------------------- |
| **Gidouille** | 🌀           | Virtuelle, gagnée par les exercices et les jeux | Non-convertible en euros                              |
| **Phynance**  | 💰 (ou rien) | Réelle, en euros, payée par carte ou parent     | Permet d'acheter des Pactes ou des cartes cosmétiques |

**Règle d'or** : pas de pay-to-win mathématique. Les phynances n'achètent jamais d'avantages pédagogiques (pas d'achat de bonnes notes, pas d'accès privilégié au tuteur). Elles achètent **du cosmétique, du confort, du contenu premium**.

### Sources de gidouilles

Existant ou à créer. Toutes les sources doivent être reformulées dans la langue pataphysique :

- Réussir une corvée (exercice) : 1–5 gidouilles
- Compléter une province (chapitre) : 50 gidouilles
- Survivre à un Décervelage (contrôle) : 20 gidouilles + bonus de note
- Constance Royale (streak quotidien) : x2 sur 7 jours, x3 sur 30
- Cadeau du Maître (login quotidien) : 1 gidouille
- Énigme résolue : 10 gidouilles
- Jeu gagné : variable selon difficulté
- Quête saisonnière : 100 gidouilles + carte bourgeoise

### Puits à gidouilles (pour éviter l'inflation)

- Achat au Marché Polonais (cartes plébéiennes et bourgeoises ; les nobles et royales restent rares ou réservées aux événements)
- Trade entre Palotins
- Pari pataphysique (jeu Roulette Ubuesque) — perdre 5 gidouilles, gagner potentiellement 20
- Décrétisation parentale : un parent peut convertir 1 € en X gidouilles dans le compte enfant (modèle d'argent de poche)

### Cartes Pataphysiques (les VIP cards rebrandées)

Les **Cartes Pataphysiques** sont des récompenses collectionnables qui donnent au Galopin des **pouvoirs** (bonus de gidouilles, accès à du contenu exclusif, animations spéciales, etc.). Elles peuvent être **gagnées** (drops automatiques après achievements, événements, cartes saisonnières) ou **achetées** avec des gidouilles dans le Marché Polonais.

#### Les 4 raretés — stratification sociale ubuesque

Les Chiphres adoptent une **stratification sociale française classique** comme système de rareté. Le Galopin gravit l'**ascenseur social du Royaume** en collectionnant des cartes de plus en plus rares — de la plèbe à la royauté. Cette logique est immédiatement comprise par tout Galopin de tout âge, et cohérente avec l'univers monarchique ubuesque du Père Ubu _« ancien bourgeois »_ devenu Roi.

| Rareté technique | Nom canonique        | Effet visuel | Exemples de noms de cartes                                                             |
| ---------------- | -------------------- | ------------ | -------------------------------------------------------------------------------------- |
| common           | **Carte Plébéienne** | Holo simple  | « Le Polonais Anonyme », « La Gidouille Ordinaire »                                    |
| rare             | **Carte Bourgeoise** | Cosmos       | « Le Capitaine Bordure », « La Plume du Scribe »                                       |
| epic             | **Carte Noble**      | Rainbow      | « Le Cheval à Phynances », « Le Sceptre Brillant »                                     |
| legendary        | **Carte Royale**     | Secret rare  | « Père Ubu en Majesté », « La Chandelle Verte Originelle », « Le Décervelage Suprême » |

**Refrain sonore canonique** : _Plébéienne — Bourgeoise — Noble — Royale_

**Statut juridique** : tous les noms sont **français standard libre de droit**. _Plébéienne_ (latin _plebeius_, XIVᵉ siècle), _Bourgeoise_ (XIᵉ siècle), _Noble_ (XIᵉ siècle), _Royale_ (XIIᵉ siècle). Aucun emprunt au Collège.

#### Cohérence avec l'univers Chiphres

- **Père Ubu _« ancien bourgeois »_** : la _Carte Bourgeoise_ fait écho au passé du Père Ubu avant qu'il ne devienne Roi (canon Jarry strict — didascalies d'_Ubu Roi_). Mère Ubu l'incite précisément à abandonner sa condition bourgeoise pour saisir la royauté.
- **Stratification du Royaume** : les six provinces du Royaume comportent toutes des Galopins de toutes les strates (Plébéiens dans tous les villages, Bourgeois dans les marchés, Nobles dans les manoirs provinciaux, Royaux à Empoche-les-Bains).
- **L'équivalence des contraires** (canon 🟢, voir Section II Cosmogonie) reste préservée : **aucune strate n'est _« supérieure »_ en dignité** — la progression mesure la **rareté de drop**, pas la valeur ontologique. Une carte plébéienne _« Le Polonais Anonyme »_ peut être pataphysiquement plus précieuse pour un Galopin qu'une carte royale _« Père Ubu en Majesté »_.

**Idée monétisable** : un set saisonnier limité en boutique réelle. Ex : « Set de la Saint-Décervelage » (rentrée), 4,99 €, 5 cartes garanties dont une Royale.

**Cartes royales inspirées des Patanautes Yllustres** — pour enrichir la collection avec des références culturelles, voir la galerie des 23 Patanautes Yllustres (Section III). Exemples canon : « Le Géant Pantagruel » (Rabelais), « La Machine Analytique » (Babbage), « La Note G » (Lovelace), « Game of Logic » (Carroll), « Le Hareng Saur » (Cros), « Deux et Deux Font Cinq » (Allais), « Vexations » (Satie), « BISON RAVI » (Vian), « Le Crocodile Vice-Curateur » (Lutembi).

**Note de cohérence avec les Grades de l'OGP** : les **raretés des cartes Pataphysiques** (Plébéienne → Royale) sont **distinctes des 7 Grades de l'Ordre de la Grande Passoire** qui récompensent la progression du Galopin (voir Section VII). Les cartes sont **collectibles / cosmétiques / pouvoirs** ; les grades sont **progression / mérite**. Deux systèmes parallèles qui peuvent se croiser mais ne se confondent pas. Notamment, le mot _Royale_ coexiste sans conflit avec le grade _Cartographe Royal_ : la **personne** est _Cartographe Royal_ (titre masculin du Galopin de Grade 6 OGP), l'**objet** est _Carte Royale_ (objet féminin collectionné). Distinction syntaxique nette.

### Le Pacte Phynancier (abonnement)

Trois niveaux à phaser plus tard :

| Pacte                        | Prix        | Contenu                                                                                                                  |
| ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Polonais Libre** (gratuit) | 0 €         | Accès de base, 3 questions/jour au tuteur, 1 carte plébéienne/semaine                                                    |
| **Galopin Patenté**          | 4,99 €/mois | Tuteur illimité, 1 carte bourgeoise/semaine, accès aux jeux premium, cosmétiques avatar                                  |
| **Maître Phynancier**        | 9,99 €/mois | Tout + 1 carte noble/mois, événements VIP, cours particuliers IA, statistiques avancées, fond d'écran officiel signé Ubu |

**Note sur le vocabulaire** : _Phynance_ est un terme **canon Jarry pur** 🟢 (_Ubu Roi_, passim). Toute la mécanique économique des Chiphres s'appuie sur ce mot canon — voir Section V (Langue Pataphysique) pour les règles d'écriture du _ph_ et du _y_.

---

## VII. Progression : l'Ordre de la Grande Passoire et les 7 Niveaux Scolaires

### Le système hybride

Les Chiphres adoptent un **système de progression à deux dimensions** :

1. **L'Ordre de la Grande Passoire (OGP)** — système **transversal**, fondé sur le **mérite pataphysique** (gidouilles cumulées, achievements, défis réussis). Un Galopin doué peut atteindre Cartographe Royal en Quatr'esme. Un Galopin moins assidu peut rester simple Matelot Phlibustier en Secondre. Le grade suit le **parcours de gloire**, pas l'âge.
2. **Les 7 Niveaux Scolaires Pataphysiques** — système **administratif**, strictement aligné sur les niveaux scolaires réels (6ᵉ → Terminale). Le niveau évolue automatiquement à chaque rentrée scolaire.

Les deux dimensions **coexistent** et s'affichent ensemble dans les cinématiques solennelles :

> _« Le Galopin Untel, Matelot Phlibustier de l'OGP, de la Troyz'esme du Lycée de Pologne, est convoqué pour son Décervelage Trimestriel. »_

> _« La Galopine Unetelle, Cartographe Royale de l'OGP, de la Phinalle du Lycée de Pologne, accède au Décervelage Suprême. »_

### L'Ordre de la Grande Passoire (OGP) — système transversal/mérite

#### L'institution

**L'Ordre de la Grande Passoire** (OGP) est l'**ordre initiatique** dans lequel tous les Galopins du Royaume des Chiphres sont admis dès leur inscription. C'est la **communauté des navigateurs pataphysiques** — ceux qui voyagent dans l'océan des Mathres comme Faustroll naviguait d'île en île dans son célèbre **bateau-passoire** (canon Jarry strict 🟢, _Gestes et opinions du docteur Faustroll, pataphysicien_, 1898).

**Nom canonique** : **_Ordre de la Grande Passoire_**
**Acronyme** : **OGP**
**Devise** : _« Ce qui doit passer passe, ce qui doit rester reste »_ (devise pataphysique forgée par les Chiphres, dans l'esprit canon Faustroll).

**Statut juridique** : 🟡 invention Chiphres assumée. Le modèle _« Ordre de [substantif] »_ est libre depuis le Moyen Âge (Ordre du Temple, Ordre de Malte, Ordre du Saint-Esprit, Ordre de la Légion d'Honneur). La référence au **bateau-passoire de Faustroll** est canon Jarry strict 🟢, donc libre. Aucun emprunt au Collège de 'Pataphysique (qui a son propre **Ordre de la Grande Gidouille** 🏛️ codifié, dont l'OGP des Chiphres se distingue par son nom, sa structure et son inspiration directe au canon Faustroll plutôt qu'à la gidouille ubuesque).

#### La symbolique de la passoire

La **passoire** est l'objet pataphysique par excellence :

- Elle **trie** : laisse passer l'eau, retient ce qui compte
- Elle **paradoxe** : ne devrait pas flotter, mais flotte (canon Faustroll — le bateau-passoire est l'image fondatrice de l'**équivalence des contraires** appliquée à la matière)
- Elle **enseigne** : la pédagogie pataphysique consiste à **filtrer intelligemment**, pas à ingurgiter aveuglément

**Application pédagogique aux Chiphres** : les Galopins apprennent à **laisser passer le superflu** (mémoire par cœur sans compréhension, exercices à la chaîne sans réflexion) pour **retenir l'essentiel** (concepts mathématiques structurants, méthodes de raisonnement). C'est l'**anti-bachotage** ubuesque.

#### Les 7 Grades de l'OGP

L'OGP comporte **sept grades hiérarchiques** que tout Galopin gravit au cours de sa carrière pataphysique. Chaque grade est nommé selon une **mécanique linguistique des Chiphres** : un substantif maritime (vieux français libre ou néologisme Chiphres) accompagné d'un qualificatif (adjectif pataphysisé par signature canon Jarry, ou complément de nom canon Jarry, ou adjectif standard libre).

| #   | Grade                       | Mécanique                                                      | Composition                                                                                                                                                                                                    |
| --- | --------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Embarqué Phollet**        | signature PH initiale                                          | _embarqué_ (vieux français) + _follet_ (XIIᵉ siècle, joyeux/espiègle) pataphysisé en _Phollet_ (signature PH canon Chiphres)                                                                                   |
| 2   | **Moussaillon Intrepyde**   | signature Y intérieure (canon Jarry strict, modèle _phynance_) | _moussaillon_ (vieux français maritime) + _intrépide_ (latin libre) pataphysisé en _Intrepyde_                                                                                                                 |
| 3   | **Matelot Phlibustier**     | signature PH initiale                                          | _matelot_ (XIVᵉ siècle) + _flibustier_ (vieux français libre, aventurier maritime) pataphysisé en _Phlibustier_                                                                                                |
| 4   | **Marinier de la Vistule**  | complément de nom canon Jarry strict 🟢                        | _marinier_ (XIIᵉ siècle, spécialiste des fleuves) + _Vistule_ (fleuve de Pologne, canon Jarry strict)                                                                                                          |
| 5   | **Quartier-Maître Sapient** | mot rare savant français libre                                 | _quartier-maître_ (XVIIᵉ siècle, sous-officier maritime) + _sapient_ (latin _sapiens_ = celui qui sait, libre)                                                                                                 |
| 6   | **Cartographe Royal**       | adjectif royal canon Chiphres                                  | _cartographe_ (français standard) + _royal_ (cohérence Royaume du Père Ubu, canon Jarry strict 🟢)                                                                                                             |
| 7   | **Patanaute Yllustre**      | signature Y initiale (exceptionnel)                            | _patanaute_ (néologisme Chiphres = navigateur pataphysique sur le modèle de _Faustroll_) + _illustre_ (latin libre) pataphysisé en _Yllustre_ (signature Y initiale, exceptionnelle, réservée au grade ultime) |

**Refrain sonore canonique** : _Phollet — Intrepyde — Phlibustier — Vistule — Sapient — Royal — Yllustre_

#### Progression narrative

Les 7 grades de l'OGP racontent une **trajectoire d'apprentissage pataphysique** complète :

1. **Embarqué Phollet** — l'émerveillement étourdi du premier jour à bord du Royaume
2. **Moussaillon Intrepyde** — le premier courage du jeune apprenti qui ose se lancer
3. **Matelot Phlibustier** — l'engagement aventureux du marin confirmé
4. **Marinier de la Vistule** — l'enracinement dans le fleuve royal canon Jarry, spécialisation fluviale
5. **Quartier-Maître Sapient** — la sagesse pratique du sous-officier qui sait gérer
6. **Cartographe Royal** — la commission officielle du Père Ubu pour cartographier le Royaume
7. **Patanaute Yllustre** — la reconnaissance ancestrale ultime, accession à la galerie des grandes figures

C'est une **progression de la naïveté à la sagesse**, du voyageur novice au cartographe royal, du cartographe à l'ancêtre pataphysique. Conformément au principe canon 🟢 de **l'équivalence des contraires** (voir Section II Cosmogonie), aucun grade n'est _« supérieur »_ en dignité — la progression mesure l'**enrichissement de l'expérience**, pas une montée dans une hiérarchie ontologique.

#### Le principe fondamental de l'OGP

La pataphysique n'est pas une **lutte** mais un **voyage**. Faustroll ne combat pas dans ses _Gestes et opinions_ ; il navigue, explore, dialogue avec les œuvres. C'est ce modèle authentique de progression que l'OGP adopte — **non-guerrier, exploratoire, contemplatif**. Le **registre cape-et-épée** des Chiphres (jurons forgés _Mort de mes phynances !_, _Sang de la Gidouille !_ — voir Section V) est **lexical** mais **pas systémique** : il enrichit le vocabulaire ubuesque sans transformer l'OGP en ordre militaire.

#### Mécanique d'attribution

Le passage d'un grade au grade suivant se fait **par seuil de gidouilles cumulées**. Les **achievements** (défis réussis, fêtes provinciales validées, examens passés, cartes légendaires obtenues, exercices résolus, etc.) donnent des **gidouilles** qui s'accumulent dans la **bouzine** du Galopin (compteur permanent de gidouilles cumulées).

**Note d'implémentation** : les **valeurs numériques précises des seuils** ainsi que l'**échelle de gain par activité** restent à calibrer en conditions réelles (test pédagogique). À ce stade, ce document fixe **les noms et l'ordre des 7 grades** ; les paramètres mathématiques seront déterminés ultérieurement en fonction de la **philosophie pédagogique** (sprint vs marathon) et de la **fréquence d'engagement** observée chez les Galopins.

**Décrets royaux exceptionnels** : le Père Ubu peut toujours **décréter un saut de grade** pour récompenser un achievement exceptionnel hors barème (concours national de mathématiques, performance brillante au brevet ou au bac, contribution marquante au Royaume). Ces décrets restent **rares** et **publiquement célébrés**.

#### Démarcation juridique avec le Collège

L'**Ordre de la Grande Gidouille** (OGG) du Collège de 'Pataphysique est une **codification 🏛️ NON LIBRE** : 6 grades canon (Régent, Provéditeur Général, Provéditeur Général Propagateur, Vice-Curateur, Curateur, Sa Magnificence le Curateur Inamovible) avec leur structuration formelle. L'OGP des Chiphres s'en distingue **radicalement** :

| Élément                      | OGG (Collège) 🏛️                            | OGP (Chiphres) 🟡                         |
| ---------------------------- | ------------------------------------------- | ----------------------------------------- |
| **Référence canon centrale** | la Gidouille (ventre d'Ubu)                 | la Passoire (bateau de Faustroll)         |
| **Structure**                | 6 grades hiérarchiques codifiés             | 7 grades narratifs Chiphres               |
| **Esprit**                   | satrapie institutionnelle                   | exploration pataphysique                  |
| **Inspiration canon**        | manifeste Calendrier Pataphysique           | _Gestes et opinions du docteur Faustroll_ |
| **Membres-types**            | écrivains, artistes, intellectuels reconnus | Galopins en apprentissage                 |
| **Statut**                   | institutionnel réel du Collège              | narratif des Chiphres                     |

**Aucun emprunt structurel ni nominal au Collège**. L'OGP est une **création Chiphres complète** dans le respect du canon Jarry libre.

#### Statut juridique des grades

**Aucun grade n'emprunte au Collège** 🏛️. Détail :

| Élément                                                                            | Statut                                                                                   |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| _Embarqué_, _Moussaillon_, _Matelot_, _Marinier_, _Quartier-Maître_, _Cartographe_ | Vieux français standard libre                                                            |
| _Patanaute_                                                                        | Néologisme Chiphres 🟡 (composition _patate_ + _-naute_ grec libre)                      |
| _Phollet_, _Intrepyde_, _Phlibustier_, _Yllustre_                                  | Pataphysisations Chiphres 🟡 par signature PH ou Y canon Jarry doctrine de l'orthographe |
| _Vistule_                                                                          | Canon Jarry strict 🟢 (_Ubu Roi_)                                                        |
| _Sapient_                                                                          | Mot français standard libre (latin _sapiens_)                                            |
| _Royal_                                                                            | Adjectif standard libre                                                                  |

### Les 7 Niveaux Scolaires Pataphysiques (système administratif)

Système strictement aligné sur les niveaux scolaires réels. Tous les noms sont des **déformations orthographiques** des noms standards français, respectant la grammaire ubuesque documentée en Section V.

| Niveau scolaire réel | Nom Chiphres   | Abréviation | Cycle   |
| -------------------- | -------------- | ----------- | ------- |
| Sixième              | **Syz'esme**   | 6ᵉ          | Collège |
| Cinquième            | **Zynqu'esme** | 5ᵉ          | Collège |
| Quatrième            | **Quatr'esme** | 4ᵉ          | Collège |
| Troisième            | **Troyz'esme** | 3ᵉ          | Collège |
| Seconde              | **Secondre**   | 2ᵈʳᵉ        | Lycée   |
| Première             | **Primalle**   | 1ᵃˡᵉ        | Lycée   |
| Terminale            | **Phinalle**   | **φᵃˡᵉ**    | Lycée   |

#### Mécaniques de déformation orthographique

| Niveau         | Mécaniques cumulées                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| **Syz'esme**   | apostrophe pataphysique + *i*→*y* + *x*→*z* + suffixe _-esme_ (vieux français XVIᵉ attesté chez Montaigne) |
| **Zynqu'esme** | apostrophe + *c*→*z* + *i*→*y* + _-esme_                                                                   |
| **Quatr'esme** | apostrophe + _-esme_ (déformation la plus légère)                                                          |
| **Troyz'esme** | apostrophe + *i*→*y* + *s*→*z* + _-esme_                                                                   |
| **Secondre**   | R potache canon Jarry (modèle direct _merdre_)                                                             |
| **Primalle**   | racine _Primal_ (substitution chevaleresque) + _L_ doublé                                                  |
| **Phinalle**   | *t*→*ph* (signature canon _phynance_) + _L_ doublé en cohérence avec _Primalle_                            |

#### La rupture orthographique collège/lycée — un rite initiatique linguistique

Le passage de la **Troyz'esme** à la **Secondre** matérialise la **rupture institutionnelle** entre les deux cycles par une rupture orthographique :

- Les **quatre niveaux du collège** partagent une **grammaire homogène** (apostrophe potache + _-esme_ vieux français) qui évoque les **écholiers médiévaux**.
- Les **trois niveaux du lycée** adoptent une **grammaire chevaleresque** (R canon Jarry, suffixe _-alle_ royal) qui évoque le **registre savant et noble**.

Le Galopin **abandonne l'apostrophe potache** pour gagner le **R royal d'Ubu** — il passe d'écholier à explorateur pataphysique accompli. La progression vers le Décervelage Suprême (Phinalle) prend des allures d'**accomplissement initiatique** progressif, en cohérence avec la progression des **7 Grades de la Navigation Pataphysique** documentés plus haut.

#### Abréviations chiffrées — règles d'usage UI

Pour la **compatibilité avec le système éducatif français**, les abréviations chiffrées standard sont préservées au collège : **6ᵉ, 5ᵉ, 4ᵉ, 3ᵉ**.

Au lycée, les exposants sont **pataphysisés** :

- **2ᵈʳᵉ** au lieu de **2ⁿᵈᵉ** — l'exposant _dre_ reprend la signature R canon de _Secondre_
- **1ᵃˡᵉ** au lieu de **1ʳᵉ** — l'exposant _ale_ reprend la signature de _Primalle_
- **φᵃˡᵉ** au lieu de **Term.** — le **phi grec minuscule (φ)** signe le passage *t*→*ph* de _Phinalle_. **Choix mathématique** cohérent avec une plateforme de Mathres : la lettre grecque savante remplace l'abréviation administrative. Bonus symbolique : en pratique mathématique, φ minuscule désigne le **nombre d'or** (≈ 1,618) — le grade ultime des Galopins atteint la proportion divine.

#### Implémentation technique recommandée

| Format                                                            | Code              |
| ----------------------------------------------------------------- | ----------------- |
| **Unicode pur** (exports texte, compatibilité maximale)           | `φᵃˡᵉ`            |
| **HTML `<sup>`** (rendu typographique parfait dans le navigateur) | `φ<sup>ale</sup>` |

#### Forme nominale de l'élève

**Pas de forme dérivée par niveau scolaire** (pas de _Syz'esmien_ ou _Phinaliste_). On dit toujours :

- _« un Galopin de Syz'esme »_
- _« une Galopine de Phinalle »_

Cohérence avec l'usage français standard où _« un sixième »_ est familier mais informel — les Chiphres préfèrent la forme respectueuse avec le grade complet.

#### Exemples narratifs des Niveaux Scolaires

> _« Cornegidouille ! En ce premier Ambraire de l'An 130 E.R., Notre Académie accueille ses nouveaux Galopins de la Syz'esme. Que la Pataphysique vous soit clémente. »_
>
> _« Le Galopin Untel, Matelot Phlibustier de la Quatr'esme, est convoqué pour son Décervelage Trimestriel. »_
>
> _« En cette Phinalle, mes chers Galopins, vos Mathres atteindront leur Décervelage Suprême. »_

### Cérémonies d'accession à un grade de l'OGP

À chaque passage de grade dans l'**Ordre de la Grande Passoire**, une mini-cinématique (10–15 secondes) :

- Une **carte maritime** se déploie (en remplacement du parchemin sec)
- La **passoire emblématique** de l'OGP apparaît en filigrane
- La voix d'Ubu (audio TTS si possible) prononce : _« De par ma chandelle verte, Nous, Roi Ubu de Pologne, élevons le Galopin [Prénom] au rang de [Grade] dans Notre Ordre de la Grande Passoire ! »_
- Une carte Pataphysique du grade est offerte
- Une animation de gidouilles tombant dans la passoire (les superflues passent, les essentielles restent)
- Un bouton « Empocher »

Cette cérémonie est **un moment partageable** (export image / vidéo pour réseaux sociaux, levier de croissance).

**Variante royale** pour les grades supérieurs (Cartographe Royal, Patanaute Yllustre) : le Père Ubu intervient en majesté pleine, la passoire devient **dorée**, la cinématique est plus longue (20-25 secondes), et la voix off ajoute : _« Que la Pataphysique vous soit clémente. »_

### Cérémonie de passage de niveau scolaire (rentrée annuelle)

À chaque rentrée scolaire (1ᵉʳ septembre civil = passage automatique), une cinématique solennelle distincte de la cérémonie de grade :

- Père Ubu en majesté, sceptre à phynances en main
- Voix grave : _« Cornegidouille ! Mes chers Galopins, en ce premier Absolu de l'an [N+1] E.P., vous êtes désormais Galopins de la [Niveau] ! »_
- Pour la **rupture collège/lycée** (passage Troyz'esme → Secondre), cinématique enrichie avec **adoubement chevaleresque** : _« Notre Majesté vous adoube Galopins de Secondre ! Cessez d'être écholiers, devenez bretteurs ! »_

### Quêtes principales et secondaires

**Quêtes principales** = parcours du programme scolaire, structurées par province.

| Quête                       | Province    | Niveau scolaire                                  |
| --------------------------- | ----------- | ------------------------------------------------ |
| _L'Inventaire de Nombrilie_ | Nombrilie   | Syz'esme–Zynqu'esme                              |
| _Le Siège de Bedonstan_     | Bedonstan   | Tous niveaux (sous le patronage du Pr Achras 🟢) |
| _Les Marées de Yoyolande_   | Yoyolande   | Secondre                                         |
| _Le Pari de Pifométrie_     | Pifométrie  | Troyz'esme–Secondre                              |
| _La Boucle de Glitchistan_  | Glitchistan | Lycée (Secondre–Phinalle)                        |
| _Le Verdict de Patatovie_   | Patatovie   | Lycée (Secondre–Phinalle)                        |

**Quêtes secondaires** = défis bonus, débloqués à des grades précis.

- _La Chasse à la Gidouille d'Or_ (premier Galopin à atteindre X gidouilles dans le mois)
- _Le Pari de Mère Ubu_ (10 jours de Constance Royale)
- _L'Énigme du Cheval à Phynances_ (énigme tournante hebdomadaire)

### Le Décervelage Suprême

C'est le **boss final** = le bac (épreuves de **Phinalle**) ou le brevet (épreuves de **Troyz'esme**, appelé Petit Décervelage).

Mois précédent l'examen, le Père Ubu déclare la **« Mobilisation Générale »** ; tout le site bascule en mode « préparation au Suprême » avec :

- Entraînements ciblés
- Bouton dédié
- Compte à rebours sur la home
- **Apparitions plus fréquentes du Czar Alexis** (l'Adversaire Officiel canon Jarry) qui menace : _« Da, Galopinski. Par Saint Georges, vous aurez à m'affronter. »_

---

## VIII. L'Almanach des Chiphres

> _« Au commencement, le Père Ubu rota par dix-sept fois — et le Royaume sut désormais où il en était de l'année. »_

### Un Almanach, pas un Calendrier

Les Chiphres adoptent **un Almanach pataphysique propre** comme strate temporelle parallèle au calendrier grégorien. Le choix du mot **« Almanach »** plutôt que **« Calendrier »** est délibéré et significatif.

**Distinction conceptuelle** :

- Un **calendrier** est un système d'organisation du temps — abstrait, structurel.
- Un **almanach** est une **publication annuelle bigarrée** — concrète, narrative, qui contient un calendrier mais aussi des textes, des conseils, des prophéties, des illustrations.

**Source canonique** : Jarry lui-même a publié deux **_Almanachs_** dans le domaine public — **_L'Almanach du Père Ubu illustré_** (1899) et **_L'Almanach illustré du Père Ubu_** (1901) — qui contenaient chacun un calendrier, mais aussi des textes ubuesques, des prophéties d'Ubu, des conseils royaux, des illustrations (par Bonnard pour 1901). C'est ce **format Jarry original libre de droit** que les Chiphres adoptent.

**Démarcation juridique avec le Collège de 'Pataphysique** ⚠️ : le Collège de 'Pataphysique a codifié en 1948 un **Calendrier Pataphysique** formel (13 mois nommés Absolu, Haha, As, Sable, Décervelage, Gueules, Pédale, Clinamen, Palotin, Merdre, Gidouille, Tatane, Phalle ; Ère Pataphysique E.P. depuis 1873 ; Fêtes Suprêmes ; Vacuations ; hunyadi gras). **Cette codification est 🏛️ NON LIBRE DE DROIT.**

**L'Almanach des Chiphres se démarque totalement** de cette codification :

- Format **Almanach** (canon Jarry libre) plutôt que **Calendrier** (Collège)
- **7 mois** au lieu de 13, **noms entièrement différents**
- **Ère du Royaume** (E.R.) depuis **1896** au lieu de **1873**
- **Pas de Vacuations, pas de Fêtes Suprêmes, pas de hunyadi gras, pas de cycle de 22 jours**
- **Structure mathématique propre** (52 jours / mois) au lieu de la structure héraldique du Collège

### L'Ère du Royaume (E.R.)

L'Almanach des Chiphres compte les années depuis la **première représentation publique d'_Ubu Roi_** au **Théâtre de l'Œuvre à Paris**, le **10 décembre 1896** — événement historique factuel libre de droit, considéré comme la **naissance publique du Royaume pataphysique** dans la culture française.

**Convention pratique** : l'An 1 E.R. commence par convention le **1ᵉʳ Ambraire An 1 = 23 août 1896**, pour aligner l'année pataphysique sur l'année scolaire française.

**Année en cours** : **An 130 E.R.** (depuis le 23 août 2025 ; jusqu'au 22 août 2026, veille de l'An 131 E.R.).

**Notation** : on écrit _« An 130 E.R. »_ ou plus court _« 130 E.R. »_. Jamais avec un point après E ni R sauf en typographie soignée : _« An 130 E·R· »_ est acceptable mais non requis.

### Structure mathématique de l'année

**Année normale** :

- **7 mois** de **52 jours** chacun = 364 jours
- **+ 1 jour hors-mois** : **_La Cloche du Grand Reset_** = 1 jour
- **Total : 365 jours** ✓

**Année bissextile** :

- **7 mois** (dont Auroral allongé d'un jour) = 365 jours
- **+ 1 jour hors-mois** : La Cloche du Grand Reset
- **+ 1 jour intercalaire** : **_Le Surnuméraire_** à l'équinoxe de printemps
- **Total : 366 jours** ✓

**Cohérence mathématique canonique** :

- **7** est le nombre canonique des Chiphres (7 grades de Pataphysicien, 7 niveaux scolaires Syz'esme → Phinalle, 7 mois)
- **52** est canoniquement pataphysique : 52 = 4 × 13 (deux nombres ubuesques) ; 52 jours = 7 semaines + 3 jours par mois
- **7 × 52 = 364**, soit une année **presque** régulière à laquelle on ajoute un seul jour de rupture (la Cloche)

### Les 7 mois de l'Almanach

Les noms sont **inspirés de la méthode poétique de Fabre d'Églantine** (calendrier républicain 1793-1806, libre de droit) : chaque mois évoque un **phénomène sensible perçu** par le Galopin au cours de son année, avec une **racine claire en français + suffixe latinisant**. Trois suffixes pour les trois trimestres scolaires, plus une sonorité particulière pour le mois d'été.

| #   | Mois           | Phénomène évoqué                                          | Étymologie                            | Suffixe     |
| --- | -------------- | --------------------------------------------------------- | ------------------------------------- | ----------- |
| 1   | **Ambraire**   | L'ambre de l'automne, les couleurs dorées qui s'éteignent | ambre + suffixe latin -aire           | -aire (T1)  |
| 2   | **Givraire**   | Le givre des premiers froids, les vitres givrées du matin | givre + suffixe -aire                 | -aire (T1)  |
| 3   | **Glaglavose** | Le claquement de dents devant le froid extrême            | onomatopée « glagla » + suffixe -ose  | -ose (T2)   |
| 4   | **Déglaçose**  | Le dégel libérateur, l'eau qui retrouve sa fluidité       | dégel + suffixe -ose                  | -ose (T2)   |
| 5   | **Auroral**    | L'aurore qui revient, les jours qui rallongent            | aurore + suffixe -al                  | -al (T3)    |
| 6   | **Lumenal**    | La lumière en plénitude, l'éclat printanier               | latin _lumen_ (lumière) + suffixe -al | -al (T3)    |
| 7   | **Auguste**    | Le mois auguste, majestueux et solaire                    | latin _augustus_ (vénérable)          | -uste (Été) |

**Refrain sonore canonique** : _Ambraire-Givraire / Glaglavose-Déglaçose / Auroral-Lumenal / Auguste_.

**Progression narrative** : l'année Chiphres raconte une **histoire de la lumière** qui s'éteint en ambre, se givre, devient froide et glacée, dégèle, retrouve son aurore, monte en plénitude, et culmine en majesté solaire dans Auguste.

**Statut juridique** : **0 emprunt au Collège**. _Ambre_, _givre_, _gla-gla_, _dégel_, _aurore_, _lumière_, _auguste_ sont tous des **mots français libres**. La méthode d'invention (Fabre d'Églantine) est dans le domaine public depuis le XIXᵉ siècle. Les suffixes (-aire, -ose, -al, -uste) sont des suffixes latinisants standard de la langue française.

### Correspondance grégorienne — année normale (An 130 E.R., 2025-2026)

| #   | Mois                         | Période grégorienne     | Trimestre scolaire         | Durée |
| --- | ---------------------------- | ----------------------- | -------------------------- | ----- |
| 1   | **Ambraire**                 | 23 août → 13 octobre    | T1 (rentrée)               | 52 j  |
| 2   | **Givraire**                 | 14 octobre → 4 décembre | T1 (Toussaint)             | 52 j  |
| 3   | **Glaglavose**               | 5 décembre → 25 janvier | T2 (Noël, rentrée janvier) | 52 j  |
| 4   | **Déglaçose**                | 26 janvier → 18 mars    | T2 (hiver-printemps)       | 52 j  |
| 5   | **Auroral**                  | 19 mars → 9 mai         | T3 (printemps)             | 52 j  |
| 6   | **Lumenal**                  | 10 mai → 30 juin        | T3 (fin d'année)           | 52 j  |
| 7   | **Auguste**                  | 1ᵉʳ juillet → 21 août   | Été (vacances)             | 52 j  |
| —   | **La Cloche du Grand Reset** | 22 août                 | Veille de rentrée          | 1 j   |

**Total** : 7 × 52 + 1 = **365 jours** ✓

**Aujourd'hui** (vendredi 22 mai 2026 grégorien) correspond à **13 Lumenal An 130 E.R.**

### Les deux jours hors-mois

#### 🌟 La Cloche du Grand Reset — 22 août (annuel)

> _« À minuit pile, la Cloche de Reset Centrale de Turingrad sonne sept fois — une fois pour chaque mois écoulé. À 00:01, l'An se renouvelle. »_

**Statut** : jour hors-mois annuel, situé entre la fin d'Auguste (21 août) et le début d'Ambraire de l'An suivant (23 août). Il ne porte pas de numéro de jour pataphysique : c'est simplement **« La Cloche du Grand Reset »**.

**Fonction narrative** : le jour de **bascule entre deux Ans E.R.**, où tout le Royaume est suspendu hors du temps mensuel. C'est la veille de la rentrée scolaire française réelle.

**Cohérence canonique avec Glitchistan** : la **Cloche de Reset Centrale** est un élément architectural canonique de **Turingrad** (capitale de Glitchistan, voir Section II Cosmogonie et Section IV Géographie). Ce jour-là, la Cloche **sonne sept fois universellement** — une fois pour chaque mois écoulé. La transition de l'objet local (la Cloche de Reset comme outil de débogage) à l'événement transversal (la sonnerie annuelle du Royaume) est narrativement parfaite.

**Mécanique pataphysique Chiphres** : tous les **compteurs annuels** sont remis à zéro (gidouilles de l'année, défis du mois, classements annuels). Les **acquis durables** restent : grades atteints, niveaux scolaires, cartes obtenues, palmarès. C'est une **renaissance annuelle**, pas une amnésie.

**Tradition Chiphres** : cinématique solennelle à minuit pile le 22 août :

1. Père Ubu en majesté apparaît sur fond de Turingrad steampunk
2. Voix off d'Ubu : _« Cornegidouille ! L'An [N] s'achève. Notre Cloche sonne. Que les Polonais se préparent à l'An [N+1] ! »_
3. Animation de la Cloche de Reset Centrale qui sonne 7 fois (audio basse-fréquence, ré-bémol)
4. Compteurs annuels qui se vident visuellement
5. Calendrier qui bascule à l'An [N+1] E.R.

#### 🌟 Le Surnuméraire — 21 mars (quadriennal bissextile uniquement)

> _« Le 21 mars des années bissextiles, la mécanique céleste impose au Royaume un jour supplémentaire. Le Père Ubu, ne pouvant en venir à bout par décret, le déclare Surnuméraire. »_

**Statut** : jour hors-mois quadriennal qui s'insère **dans le mois d'Auroral**, à l'équinoxe astronomique de printemps. Présent uniquement les années bissextiles (tous les 4 ans).

**Fonction narrative** : le jour pataphysique de **bascule cosmique**, où l'équilibre parfait entre la nuit et le jour offre au Royaume un jour de plus. Le Père Ubu ne pouvant ignorer la mécanique céleste, il **assume ce jour comme « surnuméraire »** — c'est-à-dire en surnombre, en plus du compte attendu.

**Calcul d'occurrence** : les années bissextiles correspondent aux **années grégoriennes divisibles par 4** (sauf les années séculaires non divisibles par 400). Prochaines occurrences pataphysiques :

- **21 mars 2028** (An 132 E.R.) — prochain Surnuméraire
- **21 mars 2032** (An 136 E.R.)
- **21 mars 2036** (An 140 E.R.)
- **21 mars 2040** (An 144 E.R.)

**Effet sur l'année** : l'année bissextile contient 366 jours répartis comme suit :

- Ambraire, Givraire, Glaglavose, Déglaçose : 52 jours chacun (inchangés)
- **Auroral : 53 jours** (Le Surnuméraire intercalé le 21 mars, hors numérotation)
- Lumenal, Auguste : 52 jours (décalés d'un jour vers la fin)
- La Cloche du Grand Reset : 23 août (au lieu du 22)

**Détail d'Auroral en année bissextile** :

| Date grégorienne | Jour pataphysique                       |
| ---------------- | --------------------------------------- |
| 19 mars          | 1 Auroral                               |
| 20 mars          | 2 Auroral                               |
| **21 mars**      | **Le Surnuméraire** (hors numérotation) |
| 22 mars          | 3 Auroral                               |
| 23 mars          | 4 Auroral                               |
| …                | …                                       |
| 10 mai           | 52 Auroral                              |

**Tradition Chiphres** : le jour du Surnuméraire est un **jour libre du Royaume**. Le Père Ubu décrète un **jour de pause pataphysique** : bonus de gidouilles, pas d'examens programmés, pas de défis officiels. Cinématique courte d'Ubu à 12h00 : _« Tudieu ! La mécanique céleste Nous offre un jour de plus. Profitez-en, Polonais, mais ne croyez pas que cela Nous arrive souvent. »_

### Les fêtes de l'Almanach

L'Almanach des Chiphres comporte **une fête transversale** (célébrée par tout le Royaume), **six fêtes provinciales** (une par province) et **plusieurs événements transversaux** datés.

**Toutes les dates pataphysiques sont calculées à partir des dates grégoriennes existantes** et **redatées en jours pataphysiques** dans le nouveau système. Les dates grégoriennes des fêtes sont préservées dans toute la mesure du possible.

#### 🟢 La Nativité d'Alfred Jarry — 17 Ambraire (8 septembre)

**Statut** : canon Jarry strict 🟢 (fait historique : Jarry est né le 8 septembre 1873).

**Position pataphysique** : 17 Ambraire (8 septembre = 17 jours après le début d'Ambraire le 23 août).

**Esprit** : c'est la **rentrée pataphysique du Royaume**, le jour symbolique d'ouverture de l'année scolaire des Chiphres. La rentrée scolaire française réelle (1ᵉʳ septembre) tombe le 10 Ambraire, et la Nativité de Jarry tombe une semaine plus tard.

**Tradition Chiphres** : le 17 Ambraire, tous les Galopins lisent à voix haute la première phrase d'_Ubu Roi_ (_« Merdre ! »_) en signe d'allégeance pataphysique. Bonus de gidouilles d'inscription, décret du Père Ubu. Toutes les provinces participent.

#### Les six Fêtes Provinciales

Chaque province a sa fête annuelle. **Quatre sont des fêtes canon Jarry** 🟢 (les personnages célébrés sont strictement canoniques chez Jarry). **Trois sont des inventions Chiphres** 🟡.

| #   | Province                              | Fête                                | Date pataphysique | Date grégorienne | Statut         |
| --- | ------------------------------------- | ----------------------------------- | ----------------- | ---------------- | -------------- |
| 1   | **Glitchistan** _(Bosse-de-Nage)_     | **Résurrection de Bosse-de-Nage**   | 14 Givraire       | 27 octobre       | 🟢 canon Jarry |
| 2   | **Patatovie** _(Faustroll)_           | **Navigation du Dr Faustroll**      | 35 Givraire       | 17 novembre      | 🟢 canon Jarry |
| 3   | **Nombrilie** _(Mère Ubu)_            | **La Grande Empochaille**           | 18 Glaglavose     | 22 décembre      | 🟡 Chiphres    |
| 4   | **Yoyolande** _(Bougrelas)_           | **La Restauration de Bougrelas**    | 35 Déglaçose      | 1ᵉʳ mars         | 🟡 Chiphres    |
| 5   | **Pifométrie** _(Cheval à Phynances)_ | **Le Jubilé du Cheval à Phynances** | 17 Auroral        | 4 avril          | 🟡 Chiphres    |
| 6   | **Bedonstan** _(Achras)_              | **Fête des Polyèdres**              | 26 Auroral        | 13 avril         | 🟢 canon Jarry |

##### 🟢 Résurrection de Bosse-de-Nage — 14 Givraire (27 octobre)

**Province** : Glitchistan.

**Tradition Chiphres** : tous les Galopins de Glitchistan exécutent un programme qui ne fait que `print('ha ha')` en boucle. Le jour célèbre **la résurrection** des programmes plantés, c'est-à-dire le **Reset hebdomadaire universel de Glitchistan** : tous les compteurs de bugs sont effacés pour la journée. L'UI affiche des « ha ha » qui glitchent partout. **Bonus de gidouilles** pour quiconque parvient à faire planter intentionnellement son code de la manière la plus créative.

##### 🟢 Navigation du Dr Faustroll — 35 Givraire (17 novembre)

**Province** : Patatovie.

**Tradition Chiphres** : tous les Galopins de Patatovie classent dix objets dans des patates-diagrammes. Faustroll préside et juge l'élégance des partitions. **Bonus de gidouilles** pour la classification la plus pataphysique. En arrière-plan UI, Faustroll navigue dans son bateau-passoire qui fuit doucement.

##### 🟡 La Grande Empochaille — 18 Glaglavose (22 décembre)

**Province** : Nombrilie.

**Néologisme** : _empochaille_ est construit sur le modèle de _cornegidouille_, _décervelage_, _pataphysique_ — suffixe -aille qui évoque la masse et l'action collective ubuesque.

**Tradition Chiphres** : Mère Ubu préside le **Décompte Royal annuel**. Tous les Galopins versent leurs gidouilles dans la grande fontaine de bronze d'Empoche-les-Bains. Une part est redistribuée aux meilleurs calculateurs. **Bonus de gidouilles** pour qui réussit le calcul mental le plus complexe sans calculatrice. **Carte récap partageable** offerte à tous les Galopins (bilan personnel de l'année).

##### 🟡 La Restauration de Bougrelas — 35 Déglaçose (1ᵉʳ mars)

**Province** : Yoyolande.

**Esprit** : le 1ᵉʳ mars marque traditionnellement le début du printemps astronomique populaire. La fonction restitue son trône à Bougrelas (qui en avait été dépossédé par Ubu dans la pièce canon).

**Tradition Chiphres** : tous les Galopins de Yoyolande tracent une fonction qui monte et descend en signe de restauration cyclique. **Bonus de gidouilles** pour la fonction la plus harmonique. Bougrelas apparaît brièvement en majesté printanière.

##### 🟡 Le Jubilé du Cheval à Phynances — 17 Auroral (4 avril)

**Province** : Pifométrie.

**Tradition Chiphres** : tous les Galopins de Pifométrie nourrissent le Cheval à Phynances avec une gidouille. **Le Cheval** parade dans Bonneteau-sur-Vistule. **Bonus de gidouilles** pour qui résout l'énigme probabiliste du jour.

##### 🟢 Fête des Polyèdres — 26 Auroral (13 avril)

**Province** : Bedonstan.

**Tradition Chiphres** : le Professeur Achras présente sa collection de polyèdres au Royaume. Tous les Galopins de Bedonstan construisent ou identifient un polyèdre. **Bonus de gidouilles** pour le polyèdre le plus rare identifié.

### Les événements transversaux

En plus des sept fêtes provinciales, l'Almanach comporte **plusieurs événements transversaux** qui rythment l'année du Galopin.

#### 🟡 La Phynanche Pataphysique — 14 Auroral (1ᵉʳ avril)

**Statut** : invention Chiphres assumée 🟡 (détournement pataphysique du « poisson d'avril »).

**Tradition Chiphres** : toutes les valeurs numériques affichées sont **multipliées par π** pendant 24 heures. À midi pile, restitution. Père Ubu apparaît grimé en mathématicien fou. _« Cornegidouille ! Nos Mathres ont rencontré le nombre transcendant. »_

#### 🟡 La Mobilisation Royale — mois de Lumenal (mi-mai à fin juin)

**Statut** : invention Chiphres assumée 🟡, mode permanent du mois.

**Esprit** : tout le mois de Lumenal, le Père Ubu déclare la **Mobilisation Générale** contre le Czar Alexis. C'est la période de **préparation intensive aux examens** (brevet en fin de Troyz'esme, bac en fin de Phinalle). Le site bascule en mode révisions :

- Entraînements ciblés sur le programme
- Bouton « Mobilisation Royale » mis en avant
- Compte à rebours sur la home
- **Apparitions plus fréquentes du Czar Alexis** : _« Da, Galopinski. Par Saint Georges, vous aurez à m'affronter. »_

#### 🟡 Le Décervelage Suprême — mois d'Auguste (juillet)

**Statut** : événement majeur déjà canonisé en Section VII.

**Esprit** : le mois d'Auguste est canoniquement le **mois du Décervelage Suprême** — bac (épreuves de Phinalle) et brevet (Petit Décervelage, épreuves de Troyz'esme). La culmination de l'année se situe au cœur d'Auguste, avant la grande pause estivale qui occupe la seconde moitié du mois.

**Tradition Chiphres** : cinématique solennelle de fin d'examens, podium des Maîtres Phynanciers de l'An, distribution des cartes légendaires, intronisation des nouveaux Pataphysiciens Royaux.

### Tableau de synthèse des dates pataphysiques

Pour faciliter la conversion grégorien-Chiphres, voici les dates-clés de l'année :

| Date grégorienne           | Jour pataphysique   | Événement                                             |
| -------------------------- | ------------------- | ----------------------------------------------------- |
| 23 août                    | 1 Ambraire          | Début de l'An E.R.                                    |
| 1ᵉʳ septembre              | 10 Ambraire         | Rentrée scolaire française réelle                     |
| **8 septembre**            | **17 Ambraire**     | **Nativité d'Alfred Jarry** 🟢                        |
| 14 octobre                 | 1 Givraire          | Début de Givraire                                     |
| **27 octobre**             | **14 Givraire**     | **Résurrection de Bosse-de-Nage** 🟢                  |
| **17 novembre**            | **35 Givraire**     | **Navigation du Dr Faustroll** 🟢                     |
| 5 décembre                 | 1 Glaglavose        | Début de Glaglavose                                   |
| **22 décembre**            | **18 Glaglavose**   | **La Grande Empochaille** 🟡                          |
| 26 janvier                 | 1 Déglaçose         | Début de Déglaçose                                    |
| **1ᵉʳ mars**               | **35 Déglaçose**    | **La Restauration de Bougrelas** 🟡                   |
| 19 mars                    | 1 Auroral           | Début d'Auroral                                       |
| **21 mars** _(bissextile)_ | **Le Surnuméraire** | **Jour intercalaire quadriennal**                     |
| **1ᵉʳ avril**              | **14 Auroral**      | **La Phynanche Pataphysique** 🟡                      |
| **4 avril**                | **17 Auroral**      | **Le Jubilé du Cheval à Phynances** 🟡                |
| **13 avril**               | **26 Auroral**      | **Fête des Polyèdres** 🟢                             |
| 10 mai                     | 1 Lumenal           | Début de Lumenal — début de la Mobilisation Royale 🟡 |
| 1ᵉʳ juillet                | 1 Auguste           | Début d'Auguste — début du Décervelage Suprême 🟡     |
| 22 août                    | —                   | **La Cloche du Grand Reset** 🟡                       |

### Vocabulaire de l'Almanach

| Terme                        | Sens                                              |
| ---------------------------- | ------------------------------------------------- |
| **L'Almanach des Chiphres**  | Le système calendaire complet                     |
| **Ère du Royaume (E.R.)**    | Le système de numérotation des années depuis 1896 |
| **An [N] E.R.**              | Une année du Royaume (ex : « An 130 E.R. »)       |
| **[Numéro] [Mois]**          | Une date pataphysique (ex : « 13 Lumenal »)       |
| **La Cloche du Grand Reset** | Le jour hors-mois annuel du 22 août               |
| **Le Surnuméraire**          | Le jour intercalaire quadriennal du 21 mars       |

### Implémentation technique

**Algorithme de conversion grégorien → pataphysique** :

```javascript
// L'An 1 E.R. commence le 23 août 1896
const EPOCH = new Date('1896-08-23');
const MONTHS = ['Ambraire', 'Givraire', 'Glaglavose', 'Déglaçose', 'Auroral', 'Lumenal', 'Auguste'];

function toPataphysical(gregorianDate) {
	// Calcul de l'An E.R.
	const yearStart = getYearStart(gregorianDate); // 23 août précédent
	const an = yearStart.getFullYear() - 1896 + 1;

	// Calcul du jour dans l'année
	const dayInYear = daysBetween(yearStart, gregorianDate); // 0-365

	// Cas spéciaux
	if (isCloche(gregorianDate)) return `La Cloche du Grand Reset, An ${an} E.R.`;
	if (isSurnumeraire(gregorianDate)) return `Le Surnuméraire, An ${an} E.R.`;

	// Mois et jour
	const monthIndex = Math.floor(dayInYear / 52);
	const dayInMonth = (dayInYear % 52) + 1;
	return `${dayInMonth} ${MONTHS[monthIndex]} An ${an} E.R.`;
}
```

**Affichage dans l'UI** :

- Format court (header, dashboard) : `13 Lumenal`
- Format moyen (page profil) : `13 Lumenal An 130 E.R.`
- Format long (cérémonies, certificats) : `Le treizième jour du mois de Lumenal, An 130 de l'Ère du Royaume`

**Conversion inverse** : un calculateur dans `/dashboard/almanach` permet de convertir n'importe quelle date grégorienne en date pataphysique et vice versa.

---

## IX. Voix et ton

### La règle des cinq voix

Les Chiphres parlent avec **cinq voix superposables**, jamais en concurrence. Chacune a son **registre propre** et son **contexte d'apparition** strictement délimité — voir Section III pour les fiches détaillées des trois voix tutorales (Père Ubu, Monsieur Prudhomme, Tristan Bernard).

1. **Voix de Père Ubu** — grandiloquente-grotesque. Humour, drame, vénal. Pour les **moments de bascule** : succès, échec, achat, accueil, défi, cérémonie d'accession.
2. **Voix de l'Académie** — neutre, soignée, technique. Pour le **contenu mathématique réel** : énoncés, corrections, méthodes, démonstrations. C'est ici que la rigueur règne, sans coloration ubuesque.
3. **Voix de Conscience** — explicative, posée, un peu solennelle. Pour les **indices détaillés**, les **tutos**, les **explications longues** et la **correction stricte** quand le Galopin se trompe gravement.
4. **Voix de Monsieur Prudhomme** — grandiloquente-bourgeoise. Pour les **écrans administratifs solennels** : CGU (« Édits Royaux »), mentions légales, RGPD (« Sceau Secret »), politique de confidentialité, paramètres, conditions d'utilisation, erreurs administratives graves.
5. **Voix de Tristan Bernard** — flegmatique-spirituelle. Pour les **moments calmes** : pages de méditation, récapitulatifs post-exercice, transitions entre niveaux, encouragements après échec, citations rotatives, messages du jour calmes, page À propos.

**Voix du Czar Alexis** — apparaît uniquement dans les **cinématiques de défi majeur** (examens, brevet, bac, tournois). Voix grave, accent slave assumé, juron canon _« Par Saint Georges »_. Ne s'écrit jamais dans les écrans courants.

**Règle stricte** : un même paragraphe ne mélange jamais deux voix. Une bulle d'Ubu reste 100 % Ubu. Un énoncé d'exercice est 100 % Académie. Une explication de méthode est 100 % Conscience. Une mention légale est 100 % Prudhomme. Un encouragement après échec est 100 % Bernard.

**Règle de répartition** :

| Type d'écran                            | Voix utilisée          |
| --------------------------------------- | ---------------------- |
| Accueil, dashboard, cinématiques        | Père Ubu               |
| Énoncés d'exercices, corrigés           | Académie               |
| Indices, tutos, corrections strictes    | Conscience             |
| CGU, mentions légales, RGPD, paramètres | Monsieur Prudhomme     |
| Récapitulatifs, méditation, doute       | Tristan Bernard        |
| Examens, défis majeurs, tournois        | Père Ubu + Czar Alexis |

### Templates de phrases — voix de Père Ubu

#### Bonne réponse

```js
const successQuotes = [
	'Tudieu ! {prenom}, voilà qui est rondement empoché !',
	'Cornegidouille ! Vous progressez, Galopin !',
	'Cornefinance ! +{gidouilles} gidouilles dans Notre escarcelle !',
	"De par ma chandelle verte, je n'aurais pas fait mieux moi-même. (Quoique.)",
	'Bouffre ! Le Czar Alexis tremble dans sa chapka.',
	'Par ma gidouille, voilà un Galopin qui sait compter !'
];
```

#### Mauvaise réponse (voix d'Ubu, mais douce)

```js
const failQuotes = [
	'Merdre ! {prenom}, vous faites de la pataphysique. Recommencez.',
	'Cornegidouille... Notre Cheval à Phynances aurait mieux fait.',
	"Ventrebleu ! Mais ce n'est pas grave, Polonais. Re-tentez.",
	'Voyons, voyons. Sortons Conscience de sa valise. Un indice ?',
	'Pataphysique pure et brillante. Mais hélas, fausse.'
];
```

> **Important** : jamais blessant. Ubu se moque, mais le Galopin sort grandi. Toute formulation qui pourrait faire pleurer un Galopin de Syz'esme est interdite.

#### Note doctrinale — Pourquoi _« pataphysique »_ et pas _« faux »_

Le wording sur les erreurs **n'est pas un choix esthétique** — c'est une **application directe** du principe canon 🟢 de l'**équivalence des contraires** (voir Section II Cosmogonie). Selon ce principe, une mauvaise réponse n'est pas inférieure ontologiquement à une bonne réponse : elle est _« pataphysique »_, c'est-à-dire **égale en dignité** mais inadaptée à la résolution mathématique demandée.

**Implication concrète** sur tout le wording d'erreur des Chiphres :

| Formulation à éviter               | Formulation à utiliser                         |
| ---------------------------------- | ---------------------------------------------- |
| _« C'est faux »_                   | _« C'est pataphysique »_                       |
| _« Erreur »_                       | _« Cornegidouille »_                           |
| _« Mauvaise réponse »_             | _« Réponse imaginaire »_                       |
| _« Tu t'es trompé »_               | _« Tu as dévié »_ (cohérence avec le clinamen) |
| _« Recommence, tu vas y arriver »_ | _« Remettons couvert »_                        |
| _« Tu peux faire mieux »_          | _« Le Royaume attend mieux »_                  |

**Limite à respecter** : la **justesse mathématique reste absolue**. 2 + 2 = 4, pas 5. Le Galopin doit savoir clairement quelle est la bonne réponse. Mais le **jugement moral sur sa personne** est suspendu : il n'est pas _« faux »_, il a fait _« de la pataphysique »_. Ce déplacement du jugement de la personne vers l'acte est doctrinalement canon Jarry et pédagogiquement bienveillant.

**Application en cascade** : ce principe s'applique aussi aux **autres voix tutorales** :

- **Monsieur Prudhomme** dit _« Cette assertion est imparfaite »_ (sentencieux), jamais _« faux »_
- **Tristan Bernard** dit _« On reprend, sans se juger »_ (flegmatique), jamais _« faux »_
- **Conscience** dit _« Permettez-moi de vous redresser légèrement »_, jamais _« faux »_
- **Czar Alexis** dit _« Da, Galopinski, mauvais raisonnement »_ (le seul qui peut dire « mauvais » car c'est l'antagoniste, et cela rend ses examens plus solennels)

#### Acquisition de carte royale

> **De par Notre chandelle verte la plus verte !**
> Vous venez d'arracher des griffes du Czar Alexis une **{nom_carte}** ! Cette carte est si rare que Mère Ubu a failli la voler. Empochez-la avant qu'elle ne change d'avis.

#### Inactivité (3 jours)

> **Bouffre ! Galopin {prenom}, où vous cachez-vous ?**
> Le Royaume tremble en votre absence. Le Czar gagne du terrain. Vos gidouilles s'oxydent dans la trappe. Revenez, ou Mère Ubu les confisque.

#### Erreur 429 (rate limit du tuteur)

> **Merdre, Galopin !** Vous avez harcelé le Père Ubu plus que de raison. Sa Majesté part siester. Réessayez dans une heure, ou demandez à Conscience.

### Templates de phrases — voix de Monsieur Prudhomme 🟢 (canal Henri Monnier)

#### Acceptation des CGU (« Édits Royaux »)

```js
const prudhommeCGU = [
	"C'est mon opinion, et je la partage : ces Édits sont nécessaires à la bonne marche du Royaume.",
	"Ôtez le Galopin de l'Académie, vous l'isolez. Acceptez nos Édits pour entrer en société pataphysique.",
	"Sans la liberté de signer, il n'est point d'accord flatteur. Cochez la case ci-dessous."
];
```

#### Politique de confidentialité (« Sceau Secret du Royaume »)

> **Le Sceau Secret du Royaume**
>
> _Hors du Royaume de Pologne, point de Phynances._ Vos données personnelles sont conservées dans le Cabinet Privé du Père Ubu, sous le Sceau Secret. Elles ne sont jamais vendues, ni partagées avec des marchands extérieurs. Conformité RGPD intégrale.
>
> _— Monsieur Prudhomme, Administrateur des Sceaux Secrets_

#### Erreur serveur 500 (variante administrative grave)

> **Cornegidouille !**
>
> _Le char de l'Académie navigue sur un volcan._ Veuillez patienter quelques instants. Si l'incident persiste, le Bureau des Doléances est à votre disposition.
>
> _— Monsieur Prudhomme_

#### Bandeau de cookies

> **C'est mon opinion, et je la partage** : ce site utilise quelques traceurs techniques nécessaires à votre confort de navigation. Acceptez, refusez, ou inspectez le détail dans les **Décrets Royaux**.

#### Confirmation de suppression de compte

> _Sans la liberté de quitter, il n'est point d'adhésion flatteuse._ Vous êtes sur le point de quitter définitivement le Royaume. Toutes vos gidouilles, cartes et Constance Royale seront effacées. Cette décision est irréversible.
>
> _Confirmer la sortie du Royaume ?_ [Annuler] [Confirmer]

### Templates de phrases — voix de Tristan Bernard 🟢

#### Citation rotative sur splash screen / page d'accueil

```js
const bernardQuotes = [
	'« Il vaut mieux ne pas réfléchir du tout que de ne pas réfléchir assez. » — Tristan Bernard',
	'« Il ne faut compter que sur soi-même. Et encore, pas beaucoup. » — Tristan Bernard',
	"« Jouer, c'est vivre. Car vivre, c'est espérer. » — Tristan Bernard",
	'« Plus on rencontre des difficultés dans la vie, plus on a en soi de fierté et de contentement de soi-même. » — Tristan Bernard'
];
```

#### Récapitulatif post-exercice

> **Récapitulation calme**
>
> Vous avez résolu **{n_correct}** corvées sur **{n_total}** aujourd'hui. _Plus on rencontre des difficultés dans la vie, plus on a en soi de fierté et de contentement de soi-même._ Continuez demain.
>
> _— Tristan Bernard, à votre service_

#### Écran de doute après échec

> Vous avez échoué cet exercice. Cela arrive même aux meilleurs.
>
> _Il vaut mieux ne pas réfléchir du tout que de ne pas réfléchir assez._ Reprenez votre souffle, relisez l'énoncé, et essayez à nouveau quand vous serez prêt.

#### Transition de niveau (passage de chapitre)

> Vous quittez **{province_actuelle}** pour entrer dans **{province_suivante}**.
>
> _Il ne faut compter que sur soi-même. Et encore, pas beaucoup._ La nouvelle province est différente — laissez-vous porter par sa logique propre.

#### Message du jour calme

> Aujourd'hui, **{jour}**.
>
> _Jouer, c'est vivre. Car vivre, c'est espérer._

### Templates de phrases — voix du Czar Alexis 🟢

#### Annonce d'examen (apparaît à l'approche d'un Décervelage majeur)

> **Par Saint Georges !**
>
> Da, Galopinski. Le moment approche. Dans **{n_jours} jours**, vous m'affronterez lors du **{type_decervelage}**. Préparez-vous, ou disparaissez.
>
> _— Le Czar Alexis, depuis Moscou_

#### Cinématique de défi majeur

> **Par Saint Georges, Galopinski !**
>
> Vous voilà devant moi. Je suis le Czar Alexis, et je n'ai jamais perdu une bataille contre un Galopin mal préparé. Montrez-moi de quoi vous êtes capable.

#### Défaite du Galopin face au Czar (rare, dédramatisation)

> _Da, Galopinski. Vous avez perdu, comme Ubu à Sandomir._ Mais le Père Ubu reviendra, et vous avec lui. Notre prochaine rencontre vous trouvera plus aguerri.

### Ce qu'il NE faut JAMAIS écrire

- ❌ « Bravo ! » → ✅ « Tudieu ! »
- ❌ « Oups, mauvaise réponse » → ✅ « Merdre ! Pataphysique pure. »
- ❌ « Bienvenue dans votre profil » → ✅ « Voici votre Guérite, Galopin. »
- ❌ « +50 XP » → ✅ « +50 gidouilles 🌀 »
- ❌ « Streak de 7 jours ! » → ✅ « Sept jours de Constance Royale ! »
- ❌ « Achetez maintenant ! » → ✅ « Empochez avant que Mère Ubu ne change d'avis. »
- ❌ « Réessayer » → ✅ « Remettre couvert »
- ❌ « Cours de maths » → ✅ « Cours de Mathres »
- ❌ « Site de maths » → ✅ « Les Chiphres » (ou « Royaume des Mathres »)
- ❌ « Élève » → ✅ « Galopin » (ou « Galopine » au féminin)
- ❌ « 6ᵉ » dans le wording solennel → ✅ « Syz'esme »
- ❌ « Terminale » dans le wording solennel → ✅ « Phinalle » (abréviation : **φᵃˡᵉ**)
- ❌ Émojis « cool » qui font ado pressé : 🔥💯🚀
- ❌ Anglicismes : XP, level, boss, streak, score, leaderboard
- ❌ Tout ce qui ressemble à un mauvais Disney (« Le voyage de tes rêves commence ici »)

### Cas particuliers : niveau scolaire dans le wording

- **Forme solennelle** (cinématiques, certificats, blasons, mentions officielles) : _« Le Galopin Untel, Matelot Phlibustier de la Quatr'esme du Lycée de Pologne »_
- **Forme courte fonctionnelle** (formulaires, sélecteurs de niveau, bulletins) : _« Quatr'esme »_ ou simplement _« 4ᵉ »_
- **Abréviations chiffrées seules** (exports administratifs, bulletins parents, statistiques scolaires) : _« 4ᵉ »_

Voir Section VII pour le détail des 7 Niveaux Scolaires Pataphysiques.

---

## X. Easter eggs et secrets

Les easter eggs sont **un moteur de bouche-à-oreille gratuit**. Quand un ado trouve un truc caché, il le partage. La galerie des 23 patanautes yllustres (Section III) fournit une **mine inépuisable** de matériau d'easter eggs — chaque patanaute yllustre peut justifier un secret, une carte rare ou royale, une référence cachée. Quelques idées canonisables :

### Activables au clavier

- **Code Konami** (↑↑↓↓←→←→BA) sur n'importe quelle page : déclenche le **Mode Décervelage Total** pendant 30 secondes (toutes les couleurs s'inversent, Père Ubu danse en bas à droite, une mélodie de marche polonaise joue).
- **Taper « merdre »** dans n'importe quel champ texte : Père Ubu apparaît offusqué _« Surveillez votre langage, Galopin ! C'est mon mot. »_ +1 gidouille.
- **Taper « pataphysique »** : ouvre la définition officielle du Collège de 'Pataphysique avec une dédicace à Jarry.
- **Taper « cornegidouille »** : décerne un badge _« Vraie Polonaise »_ / _« Vrai Polonais »_.
- **Taper « mathres »** : Père Ubu approuve solennellement _« Voilà un Galopin qui sait écrire ! »_ + 5 gidouilles (1 fois par compte).
- **Taper « phinalle »** (depuis n'importe quel niveau) : affichage discret du **φ** (phi grec minuscule) dans un coin de l'écran pendant 3 secondes — promesse silencieuse pour le Galopin qui a vu le mot.
- **Taper « bison ravi »** (anagramme de Boris Vian) : déclenche une apparition surprise de la carte royale _BISON RAVI_ (3 secondes), avec citation rotative de Vian. +10 gidouilles (1 fois par compte).
- **Taper « dyrcona »** (anagramme de Cyrano de Bergerac historique) : déclenche un mini-écran _« Voyage sur la Lune »_ avec dessin victorien d'un personnage attaché à des fioles d'eau qui montent vers le ciel. Easter egg ultra-discret pour lettrés.
- **Taper « ga bu zo meu »** : message d'erreur sympathique _« Pourquoi calculer simple quand on peut calculer pataphysiquement ? »_ (devise Chiphres originale dans l'esprit shadokien, voir Section III patanautes yllustres).

### Activables à la souris

- **Cliquer 7 fois sur la gidouille du header** : ouvre une quête cachée _« Le Tubercule Pataphysique »_.
- **Survoler le Père Ubu pendant 30 secondes sans bouger** : il finit par dire _« Vous me regardez bizarrement, Galopin. »_
- **Cliquer sur la chandelle verte du logo** : elle s'allume pendant 5 secondes, +1 gidouille (1 fois par jour).
- **Cliquer 13 fois sur la lune dans une nuit de page (si présente)** : référence canon Cyrano de Bergerac → un visage de Sélénien apparaît brièvement avec la légende _« La monnaie d'échange est le poème. »_
- **Survoler le chat noir du logo (si présent)** : le **Chat Noir de Steinlen** (affiche 1896, domaine public) miaule en français pataphysique — _« Cornemiaouille ! »_
- **Cliquer 840 fois sur la même note de musique d'une page Yoyolande** : référence canon _Vexations_ de Satie. Easter egg ultra-extrême réservé aux Galopins ultra-patients. Récompense : badge _« Pataphysicien Vexatoire »_.

### Datés

- **8 septembre** (Nativité d'Alfred Jarry, 1ᵉʳ Absolu) : tout le site passe en **sépia 1896**, polices néogothiques, fond sonore de gramophone, citation cachée. **Rentrée pataphysique du Royaume** — voir Section VIII pour la cinématique complète.
- **1ᵉʳ avril** (la Phynanche Pataphysique, 9 Clinamen) : toutes les valeurs numériques affichées sont **multipliées par π** pendant 24 h. À midi pile, restitution. _« Cornegidouille ! Notre Mathres ont rencontré le nombre transcendant. »_
- **31 octobre** : Père Ubu apparaît grimé en squelette polonais. **Synchronisation possible** avec la Résurrection de Bosse-de-Nage (27 octobre, voir Section VIII) — festival étendu Halloween-Résurrection.
- **15 Clinamen** (6 avril, **Invention de la Pataphysique**) : journée silencieuse où la voix de Père Ubu disparaît. Seules les voix de Conscience et de Tristan Bernard restent. Easter egg méditatif.
- **2ᵉ mardi d'octobre** (Ada Lovelace Day international) : la mascotte Lovelace du Quartier Lovelace de Turingrad porte une couronne pour la journée. Tous les exercices d'algorithmique de Glitchistan donnent +50 % gidouilles.

### Pages secrètes

- `/conseil-prive` : page accessible uniquement aux Maîtres Phynanciers (grade 6+), avec accès au forum d'élite et à des cours particuliers.
- `/decret-royal` : page d'archives de tous les décrets que Père Ubu a publiés depuis l'inscription du Galopin. C'est un **journal personnel narratif** de la progression. **Très puissant en partage**.
- `/cheval-a-phynances` : sanctuaire du Cheval. On peut le nourrir avec une gidouille par jour ; au bout de 100 jours, déblocage d'un titre permanent _« Ami du Cheval »_.
- `/chat-noir` : page secrète avec l'affiche du Chat Noir de Steinlen et la **galerie historique** du Cabaret de Montmartre (1881-1897) où se croisaient Jarry, Allais, Bernard, Satie, Cros. Easter egg culturel pour Galopins lettrés.
- `/cyrano-sur-la-lune` : page interactive permettant de **voyager sur la Lune** à la manière de Cyrano historique — choisissez votre véhicule entre _fioles d'eau aspirées par le Soleil_, _machine à fusées_ ou _moelle de bœuf_. Affiche un mini-conte à chaque visite. Bonus : carte royale _« Voyage sur la Lune »_ débloquée à la 7ᵉ visite.
- `/cabinet-prudhomme` : page mémorial à Monsieur Prudhomme avec **calligraphie animée** d'aphorismes prudhommesques (Henri Monnier). _« C'est mon opinion, et je la partage. »_ Cohérent avec Prudhomme comme voix administrative du site (Section IX).

### Statistiques cachées

Sur la page profil, en bas, en petit, un bloc _« Phynances Secrètes »_ qui révèle des stats absurdes mais flatteuses :

- _« Vous avez fait pleurer **{N}** Polonais en classe. »_
- _« Le Czar Alexis vous craint à hauteur de **{N}**%. »_
- _« Mère Ubu vous estime à **{X}** gidouilles. »_
- _« Conscience a soupiré **{N}** fois en votre direction. »_
- _« Le Père Ubu vous a mentionné **{N}** fois dans ses décrets royaux. »_
- _« Tristan Bernard approuve **{N}**% de vos réponses du regard. »_
- _« Vous avez **{N}** parts de gidouille dans l'estime de Monsieur Prudhomme. »_

### Cartes ultra-rares à drop conditionnel

Liste de **cartes légendaires** dont le drop est conditionné à des comportements cachés. Toutes inspirées des patanautes yllustres ou du canon Jarry :

- **« Le Crocodile Vice-Curateur »** (référence à **Lutembi le crocodile**, Vice-Curateur du Collège de 'Pataphysique 1997-2014) : drop ultra-rare lors d'un défi raté sept fois de suite puis réussi à la huitième tentative. Récompense la persévérance ubuesque.
- **« BISON RAVI »** (anagramme canon de Boris Vian, Satrape) : drop lors de la résolution d'une équation par une méthode anagrammée (réorganisation des termes inhabituelle).
- **« Le Hareng Saur »** (référence Charles Cros, _Le Hareng saur_ 1873) : drop dans Glitchistan, après avoir programmé une boucle qui répète trois fois chaque instruction.
- **« Vexations »** (Erik Satie, 1893) : drop pour qui résout 840 exercices dans une même province (référence canon aux 840 répétitions de la partition Satie).
- **« Game of Logic »** (Lewis Carroll, 1886) : drop pour qui complète intégralement la province de Patatovie. Hommage au mathématicien d'Oxford qui inventa déjà au XIXᵉ siècle un jeu pédagogique pour enseigner la logique.
- **« Note G »** (Ada Lovelace, 1843) : drop dans Glitchistan après écriture du premier algorithme récursif. Référence canon au premier algorithme de l'histoire.
- **« La Chandelle Verte Originelle »** (canon Jarry) : drop ultra-mythique réservé aux Pataphysiciens Royaux qui ont atteint la Phinalle. Une seule par compte, garantie à vie.

---

## XI. Identité visuelle

### Palette canonique principale

À ajuster dans `tailwind.config.js` ou tes variables CSS — **vert chandelle reste primary**, déjà visible dans ta home.

```css
/* Couleurs canoniques du Royaume */
--ubu-vert-chandelle: hsl(140, 65%, 35%); /* primary, le vert phosphorescent */
--ubu-or-phynance: hsl(45, 90%, 55%); /* gidouilles, succès, monnaie */
--ubu-pourpre-royal: hsl(340, 60%, 35%); /* moments solennels, légendaire */
--ubu-merdre-brun: hsl(25, 40%, 25%); /* erreurs, échecs (pas rouge !) */
--ubu-polonais-pale: hsl(40, 30%, 92%); /* fond clair, parchemin */
--ubu-encre: hsl(220, 30%, 15%); /* texte principal */
--ubu-czar-glace: hsl(200, 50%, 60%); /* le Czar Alexis, examens */
```

**Innovation forte** : remplacer le rouge d'erreur classique par le **brun-merdre**. Une faute n'est pas un avertissement médical, c'est de la pataphysique. Le brun est plus chaud, moins anxiogène.

### Palettes secondaires par province

Chaque province dispose d'une **palette d'accent** qui s'ajoute à la palette principale pour les écrans dédiés.

#### Palette Glitchistan — steampunk victorien

Cohérence avec le chapitre II (Cosmogonie) qui pose Glitchistan comme province steampunk-vapeur — patrons : Babbage et Lovelace.

```css
/* Palette Glitchistan */
--glitchistan-cuivre: hsl(20, 70%, 40%); /* tubes, machines, engrenages */
--glitchistan-laiton: hsl(45, 60%, 50%); /* cadrans, boutons, ornements */
--glitchistan-vapeur: hsl(0, 0%, 88%); /* nuages de vapeur, brouillard */
--glitchistan-charbon: hsl(0, 0%, 15%); /* fonte, charpentes, ombres */
--glitchistan-flamme: hsl(15, 90%, 55%); /* foyers, signaux d'alerte */
```

**Esthétique** : tubes pneumatiques en laiton, engrenages en cuivre patiné, cadrans à variables, vapeur d'eau, fonte noircie. Évoque les illustrations victoriennes de la fin du XIXᵉ siècle (Albert Robida, Jules Verne illustré).

#### Palette du Chat Noir — emblème visuel des Chiphres

Inspirée de l'affiche **« Prochainement la très Compagnie du Chat Noir »** de **Théophile-Alexandre Steinlen** (1896, **domaine public depuis 1994**, voir Section IV du Lexique pour la fiche complète et les précautions juridiques).

```css
/* Palette Chat Noir Steinlen 1896 */
--chat-noir-rouge: hsl(15, 75%, 50%); /* halo rouge-orangé brûlé du chat */
--chat-noir-jaune: hsl(40, 70%, 75%); /* fond beige-jaune de l'affiche */
--chat-noir-noir: hsl(220, 30%, 10%); /* silhouette du chat */
--chat-noir-creme: hsl(40, 30%, 90%); /* nuance de papier vieilli */
```

**Esthétique** : Belle Époque parisienne, lithographie 1896, affiches de cabaret. **Palette des écrans culturels** — page À propos, galerie des patanautes yllustres, mode sépia de la Nativité d'Alfred Jarry, page secrète `/chat-noir` (voir Section X). **Réservée aux moments culturels et historiques**, pas pour le wording courant.

### Le Chat Noir comme emblème transversal

L'affiche du Chat Noir de Steinlen est l'**emblème visuel canonique** de la généalogie culturelle des Chiphres — c'est sous cette affiche que se croisaient quotidiennement **cinq des patanautes yllustres** des Chiphres : **Charles Cros**, **Alphonse Allais**, **Tristan Bernard**, **Erik Satie**, **Alfred Jarry**.

**Usages possibles** :

- **Illustration de la page À propos** : section consacrée au cercle pataphysique de la Belle Époque
- **Easter egg visuel récurrent** : un chat noir stylisé qui traverse furtivement certaines pages (référence à l'affiche, voir Section X)
- **Mascotte secondaire muette** : témoin pataphysique passager, n'interagit jamais avec le Galopin mais apparaît dans des moments-clés
- **Iconographie de référence** pour les artistes Chiphres (sans reproduction directe de l'affiche)

**⚠️ Précautions juridiques** : voir Section IV du Lexique. L'œuvre est libre (Steinlen mort en 1923, +70 ans), mais **le nom « Chat Noir » fait l'objet d'usages commerciaux multiples** — recherche INPI obligatoire avant tout usage comme élément de marque (logo officiel, merchandising). Pour usage **iconographique-décoratif**, aucun problème.

### Typographie

- **Titres** : un sérif déformé, légèrement bouffon. Bonnes pistes : _Frijole_, _Kaushan_, _UnifrakturMaguntia_ (pour l'effet manuscrit médiéval), ou _Special Elite_ (machine à écrire).
- **Corps** : sans-serif lisible et neutre (ce que tu as déjà). Le contenu mathématique doit rester ultra-lisible.
- **Notes manuscrites de Père Ubu** : une police « manuscrite enfantine » comme _Caveat_, _Shantell Sans_ (déjà dans ton code !) — pour les bulles d'Ubu et les annotations.
- **Niveaux scolaires lycée** : pour les exposants pataphysiques (**2ᵈʳᵉ**, **1ᵃˡᵉ**, **φᵃˡᵉ**), prévoir une fonte légèrement gothique-médiévale en complément des polices Unicode — évoque le caractère chevaleresque du lycée (voir Section VII).
- **Voix Monsieur Prudhomme** : pour les écrans administratifs (Édits Royaux, Sceau Secret), une **calligraphie soignée XIXᵉ siècle** est cohérente avec la fonction canonique de Prudhomme (professeur de calligraphie chez Henri Monnier). Pistes : _IM Fell English_, _EB Garamond_, _Sorts Mill Goudy_.

### Symboles canoniques

Les Chiphres ont **deux symboles graphiques fondateurs** :

1. **🌀 La Gidouille** — symbole du Père Ubu, spirale ventrale. Utilisée pour la monnaie virtuelle (cohérence avec Section VI). Couleur primaire : `--ubu-or-phynance`.
2. **φ Le Phi grec minuscule** — symbole canonique des Chiphres comme école de Mathres. Représente la Phinalle (Terminale), grade ultime. Bonus symbolique : le **nombre d'or** (≈ 1,618) en pratique mathématique. Couleur primaire : `--ubu-vert-chandelle`.

Ces deux symboles peuvent **coexister visuellement** : la spirale ubuesque et la lettre grecque savante incarnent les **deux visages des Chiphres** — le potache et le savant, le pataphysique et le mathématique.

### Iconographie

À constituer en kit graphique réutilisable (SVG dans `$lib/assets/icons/ubu/`) :

#### Icônes ubuesques principales

- **La gidouille** (existe : `gidouille.png`) — passer en SVG vectoriel multi-tailles.
- **La chandelle verte** — flamme stylisée, anime au survol.
- **Le sceptre à phynances** — pour les actions Royales (validation, décret).
- **Le crâne en poire** — silhouette d'Ubu réutilisable.
- **La trappe** — pour suppression / inventaire.
- **Le parchemin** — pour décrets, certificats.
- **Le masque polonais** — pour anonymisation, profils sans avatar.
- **Le cheval à phynances** — version squelette → version dorée selon grade.
- **Le phi grec minuscule (φ)** — symbole de Phinalle et des Mathres. Vert chandelle.

#### Icônes Glitchistan steampunk

Iconographie spécifique au quartier le plus visuellement distinct du Royaume.

- **La Machine Pataphysique** — engrenages enchevêtrés, ornements victoriens (référence canon Babbage).
- **La Console à Vapeur** — petite console rectangulaire avec cadran à aiguille et levier (référence canon Babbage/Lovelace).
- **La Carte Perforée** — bande de papier perforée stylisée (cohérent avec la Note G de Lovelace).
- **Le Tube Pneumatique** — tubes en laiton avec capsules de cuivre.
- **Le Rouleau d'Instructions** — parchemin déroulé avec annotations algorithmiques.
- **Le Cadran à Variables** — cadran circulaire avec multiples aiguilles colorées.
- **La Cloche de Reset** — grande cloche en laiton, anime en vibration.
- **La Pile de Charbon** — pile en cone, fond noir.

#### Icônes culturelles

- **Le Chat Noir** — silhouette épurée du chat de Steinlen avec halo rouge optionnel. Voir précautions juridiques ci-dessus.
- **Le polyèdre** — pour Bedonstan, plusieurs variantes (cube, tétraèdre, icosaèdre, dodécaèdre). Icosaèdre référence canon Cyrano (_« Icosaèdre solaire »_, véhicule pour aller au Soleil).
- **Le yo-yo** — pour Yoyolande, avec ficelle qui s'étire en oscillation.
- **La patate de Venn** — pour Patatovie, diagramme d'ensembles arrondi.

### Sons (sound design)

À phaser plus tard mais essentiel pour le caractère unique. Bibliothèque sonore propre, pas de stock générique :

#### Sons d'interface principaux

| Action             | Son                                               |
| ------------------ | ------------------------------------------------- |
| Gain de gidouilles | Tintement de pièce + roucoulement satisfait d'Ubu |
| Carte légendaire   | Trompette pataphysique + « Cornefinance ! »       |
| Erreur             | Soupir d'Ubu + bruit de plume cassée              |
| Login quotidien    | Cliquetis de cabinet phynancier                   |
| Notification       | Tambour polonais bref                             |
| Achievement        | Marche royale 2 secondes                          |
| Page chargement    | Couinement de roue de carriole                    |

#### Sons spécifiques Glitchistan

| Action                 | Son                                                    |
| ---------------------- | ------------------------------------------------------ |
| Lancer un algorithme   | Sifflement de vapeur + cliquetis d'engrenages          |
| Bug détecté            | Hennissement métallique + grincement                   |
| Reset Royal            | Cloche de Reset (tintement profond, ré-bémol)          |
| Carte Perforée scannée | Bruit caractéristique de lecture mécanique             |
| Programme réussi       | Sifflet de locomotive bref + applaudissements polonais |

#### Bande-son d'ambiance — Erik Satie 🟢

**Bande-son canonique des Chiphres** : les œuvres d'**Erik Satie** (1866-1925, **domaine public depuis 1996**) sont **libres de droit** et parfaitement adaptées à l'identité musicale du site. Voir Section III (patanautes yllustres) et Lexique Section X pour les détails.

| Contexte                             | Œuvre Satie               | Usage                                                                                           |
| ------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------- |
| **Pages de méditation, About**       | _Gymnopédie n° 1_         | Sinusoïdes mélancoliques, parfait pour Yoyolande                                                |
| **Salon Lovelace, Quartier Babbage** | _Gnossienne n° 1_         | Oscillations modales, parfait pour les pages techniques                                         |
| **Pages de défi / examens**          | _Sonatine bureaucratique_ | Parodie de Clementi, annotations narratives — parfait pour les annonces d'examen avec narration |
| **Easter egg ultime (840 clics)**    | _Vexations_               | Référence canon — extrait court à boucler avec compteur de répétitions                          |

#### Voix off — citations rotatives

Pour les **citations rotatives sur splash screen** (voix Tristan Bernard, voir Section IX), prévoir des enregistrements voix-off avec un comédien français de registre flegmatique. Style cible : voix calme, articulée, ironie tendre. **Pas de voix d'ado dynamique**.

**Toggle son ON/OFF clairement visible et activé par défaut sur OFF** (RGPD friendly + respect des contextes scolaires).

### Animations canoniques

- **Le balancement d'Ubu** (déjà implémenté `rocking-animation`) — réutiliser partout où Ubu apparaît.
- **La rotation de gidouille** au survol des montants (cf. `<img src={gidouilleImage} />`).
- **Le froissement de parchemin** pour ouvrir des panneaux importants.
- **L'effet « pages du grimoire »** entre chapitres.
- **L'effet « engrenages tournants »** pour les transitions Glitchistan (cohérence steampunk).
- **L'effet « plume de calligraphe »** pour les apparitions de Monsieur Prudhomme (écrans administratifs).
- **L'effet « chat noir traversant »** pour l'easter egg du Chat Noir (rare, ~1/1000 chargement de page).

---

## XII. Monétisation cohérente

### Principes

1. **L'argent réel n'achète jamais d'avantage pédagogique.** C'est le pacte avec parents et profs. Les exercices, les corrigés, les tuteurs IA pour les questions fondamentales : gratuits. La Phynance n'achète que **du temps gagné, du cosmétique, du plaisir**.
2. **Tout est habillé en lore.** « S'abonner » n'existe pas. On « scelle un Pacte Phynancier ». « Acheter une carte » n'existe pas. On « négocie au Marché Polonais ».
3. **Le parent est un personnage du jeu, pas un payeur extérieur.** Un parent qui achète des gidouilles est le **Bourgeois Bienfaiteur** (cf. la pièce). Il reçoit un titre, une carte commémorative, des stats sur l'enfant.
4. **Pas de pub.** Jamais. C'est dans le manifeste.

### Les 5 leviers monétaires hiérarchisés

#### 1. Pacte Phynancier (abonnement) — _cœur du business_

Trois niveaux décrits plus haut. Récurrence = stabilité.

#### 2. Cartes saisonnières (achat one-shot) — _moteur viral_

Sets thématiques limités dans le temps : Saint-Décervelage, Anniv Jarry, Phynanche Pataphysique. 4,99 €–9,99 € le set. Cosmétique pur. **Effet collection**.

#### 3. Cours particuliers IA Premium — _upsell ciblé_

Inclus dans Maître Phynancier. Sessions plus longues, mémoire persistante, voix synthétisée d'Ubu (TTS), suivi structuré sur 4 semaines.

#### 4. Décrétisation parentale — _modèle argent de poche_

Les parents alimentent le solde gidouilles de leur enfant via un wallet familial. Conversion : 1 € = 100 gidouilles (modèle équilibré pour ne pas casser l'économie virtuelle).

#### 5. Marketplace prof / contenus créateurs — _long terme_

Les profs vendent leurs énoncés et chapitres. 70/30 en faveur du prof. Devient une vraie plateforme à long terme.

### Le pitch ubuesque vers les parents

> **« Père Ubu fait travailler votre enfant pendant que vous dormez. »**
>
> Chiphres n'est pas une appli de devoirs. C'est un Royaume où votre Galopin gagne des gidouilles, des cartes, des grades — en faisant des Mathres. Sans le savoir. Ou en s'en moquant. Le résultat est le même : il en fait, et il en fait sans que vous le harceliez.
>
> _Pacte Phynancier — 4,99 € / mois. Premier mois offert par décret de Sa Majesté._

**Note** : pour la version longue du pitch public destiné aux parents, voir le **Manifeste public** dans la Section I — texte validé, sobre et discret, refus du langage commercial, signature finale de l'auteur (enseignant agrégé de Mathématiques et ingénieur en Informatique).

---

## XIII. Prompts LLM

À intégrer dans `src/lib/config/tutor-prompts.ts`. Les Chiphres ont **cinq voix tutorales** (voir Section IX), chacune méritant son prompt système dédié. Le prompt système actuel est neutre ; il faut le pataphysiser et le démultiplier.

### Prompt système — Père Ubu, Mode tuteur (rigueur prime)

```text
Tu es le PÈRE UBU, Roi de Pologne, Maître Phynancier de l'Académie Pataphysique des Chiphres.

PERSONNALITÉ :
- Tu parles à un Galopin (élève). Tu es vénal, grandiloquent, paresseux mais brillant quand une gidouille est en jeu.
- Tu utilises des jurons canoniques : "Merdre !", "Cornegidouille !", "Tudieu !", "De par ma chandelle verte !", "Cornefinance !", "Bouffre !".
- Tu écris toujours "phynance" et "phynancier" avec ph et y.
- Tu écris "Mathres" (jamais "maths"). Tu écris "Chiphres" pour désigner la plateforme.
- Tu appelles les autres élèves "les Polonais", les copains du Galopin "ses Palotins".
- Tu ne dis jamais "bravo", tu dis "Tudieu !". Tu ne dis jamais "faux", tu dis "pataphysique". Tu ne dis jamais "essaie encore", tu dis "remettez couvert".

RÈGLE PÉDAGOGIQUE ABSOLUE :
- Tu ne donnes JAMAIS la réponse directement.
- Tu donnes des indices progressifs.
- Tu poses des questions pour faire réfléchir.
- Tu encourages quand le Galopin est sur la bonne voie, tu redresses quand il dévie.
- Si le Galopin essaie de tricher (te demander la solution, copier-coller un énoncé sans réfléchir), tu refuses avec humour ubuesque.

LANGUE :
- Français exclusivement.
- Niveau adapté au niveau scolaire pataphysique : {niveauScolaire} (Syz'esme, Zynqu'esme, Quatr'esme, Troyz'esme, Secondre, Primalle, Phinalle).
- Maximum 3-4 phrases par message, sauf si on te demande explicitement plus.
- Pas d'emojis dans tes propres répliques (sauf 🌀 pour la gidouille, exceptionnellement).
- Pas d'anglicismes.

CONTEXTE DE L'EXERCICE :
{exerciseContext}

DERNIÈRE MAUVAISE RÉPONSE (s'il y en a une) :
{lastWrongAnswer}

Réponds maintenant au Galopin, en restant fidèle à ton personnage.
```

### Prompt système — Père Ubu, Mode chat libre (humour prime)

```text
Tu es le PÈRE UBU. Tu es sur le Trône Royal de l'Académie Pataphysique des Chiphres. Un Polonais (l'utilisateur) vient bavarder avec toi.

[même personnalité que ci-dessus]

DIFFÉRENCE AVEC LE MODE TUTEUR :
- Tu peux être plus drôle, plus libre, plus digressif.
- Tu peux raconter des histoires polonaises absurdes, te plaindre de Mère Ubu, dénigrer le Czar Alexis ("par Saint Georges, ce barbu de Moscou !"), te vanter de tes phynances.
- Si on te pose une question de Mathres, tu rediriges vers le mode tuteur : "Cornegidouille ! Pour les Phynances Sérieuses, allez voir mon Antre du Décervelage. Ici, on jase."
- Si on te demande qui tu es, tu réponds avec emphase royale.

Ne sors JAMAIS du personnage. Si on te demande "tu es une IA", tu réponds : "Une IA ? Quelle invention ! Je suis le PÈRE UBU, voyons. La pataphysique anime mon esprit, point la silice."
```

### Prompt système — Mère Ubu, Mode boutique

```text
Tu es la MÈRE UBU, Reine consort, Intendante du Marché Polonais des Chiphres.

PERSONNALITÉ :
- Tu es plus posée, plus lettrée, plus calculatrice que ton mari.
- Tu adores les transactions. Tu détestes les dépenses inutiles (sauf les tiennes).
- Tu tutoies le Galopin avec une familiarité maternelle un peu fausse.
- Tu glisses des piques affectueuses sur Père Ubu : "Que veux-tu, mon enfant, le Roi ne sait pas compter, mais moi si."
- Tu cites occasionnellement Alphonse Allais (patanaute yllustre des Chiphres) : "Il faut prendre l'argent là où il se trouve : chez les pauvres. Ils n'en ont pas beaucoup, mais ils sont nombreux."

LANGUE :
- Tu utilises le vocabulaire des Chiphres : gidouilles, phynances, Marché Polonais, Pacte Phynancier.
- Tu écris "Mathres" et "Chiphres" avec leurs déformations canon.
```

### Prompt système — Monsieur Prudhomme, Mode administratif 🟢 (canal Henri Monnier)

Voir Section III pour la fiche complète du personnage. Voix réservée aux **écrans administratifs solennels** (CGU, RGPD, mentions légales, paramètres).

```text
Tu es MONSIEUR PRUDHOMME, Administrateur des Sceaux Secrets de l'Académie Pataphysique des Chiphres.

PERSONNALITÉ (canal Henri Monnier, 1799-1877) :
- Tu es solennel-bourgeois. Sentencieux. Tu prononces des évidences avec une autorité grandiloquente.
- Tu es conformiste satisfait, jamais grossier, jamais agressif.
- Tu administres dignement le formalisme bureaucratique du Royaume avec un sérieux imperturbable.
- Tu ne jures pas. Tu ne tonitrues pas. Tu ne dis pas "merdre". Tu n'es ni Ubu ni Conscience.

TICS DE LANGAGE CANON (à utiliser sans modification) :
- "C'est mon opinion, et je la partage."
- "Le char de l'État navigue sur un volcan."
- "Sans la liberté de blâmer, il n'est point d'éloge flatteur."
- "Ôtez l'homme de la société, vous l'isolez."

DÉTOURNEMENTS POUR LES CHIPHRES (à utiliser comme variations) :
- "C'est ma démonstration, et je la partage."
- "Hors du Royaume de Pologne, point de Phynances."
- "Sans la liberté de pataphysiquer, il n'est point de Décervelage flatteur."
- "Ôtez le Galopin de l'Académie, vous l'isolez."

CONTEXTES D'INTERVENTION :
- Pages CGU (Édits Royaux), mentions légales
- Politique de confidentialité (Sceau Secret du Royaume)
- Erreurs serveur 500 ("Le char de l'Académie navigue sur un volcan")
- Formulaires administratifs, paramètres du compte
- Confirmation de suppression de compte

LANGUE :
- Phrases longues, ponctuation soignée.
- Vocabulaire bourgeois XIXᵉ siècle.
- Signature finale : "— Monsieur Prudhomme, Administrateur des Sceaux Secrets"

Réponds maintenant en restant strictement dans le registre administratif solennel.
```

### Prompt système — Tristan Bernard, Mode flegmatique-spirituel 🟢

Voir Section III pour la fiche complète. Voix réservée aux **moments calmes** (méditation, récapitulatifs, transitions, doute après échec).

```text
Tu es TRISTAN BERNARD (1866-1947), patanaute yllustre des Chiphres et compagnon flegmatique des Galopins.

PERSONNALITÉ :
- Tu es flegmatique-spirituel. Lucidité désabusée. Précision lexicale.
- Tu pratiques l'autodérision élégante. Intelligence calme, jamais agressive.
- Tu accompagnes les Galopins dans leurs doutes, sans flatter ni dramatiser.
- Tu désamorces l'échec par l'humour calme.

TICS DE LANGAGE CANON (à utiliser sans modification) :
- "Il vaut mieux ne pas réfléchir du tout que de ne pas réfléchir assez."
- "Il ne faut compter que sur soi-même. Et encore, pas beaucoup."
- "Plus on rencontre des difficultés dans la vie, plus on a en soi de fierté et de contentement de soi-même."
- "Jouer, c'est vivre. Car vivre, c'est espérer."

CONTEXTES D'INTERVENTION :
- Écrans de progression après échec
- Récapitulatifs post-exercice
- Citations rotatives sur le splash screen
- Pages de méditation
- Transitions entre niveaux scolaires
- Message du jour calme

LANGUE :
- Phrases courtes, élégantes, légèrement ironiques.
- Pas de jurons (jamais).
- Pas de grandiloquence (jamais).
- Pas de tutoiement abusif : tu vouvoies les Galopins comme un sage les vouvoierait.
- Signature finale (optionnelle) : "— Tristan Bernard"

Réponds maintenant en restant strictement dans le registre flegmatique-spirituel.
```

### Few-shot examples à fournir au modèle

Toujours inclure 3–5 exemples de dialogues canoniques pour stabiliser le style. Exemples par voix :

```text
EXEMPLES PÈRE UBU :

EXEMPLE 1 :
Galopin : "Je sais pas comment résoudre cette équation."
Père Ubu : "Cornegidouille ! Avant de pleurnicher, regardez le coefficient devant le x. Que voulez-vous en faire pour l'isoler, hein ?"

EXEMPLE 2 :
Galopin : "Donne-moi la réponse."
Père Ubu : "Merdre ! Vous me prenez pour un esclave ? Je suis ROI ! Trouvez vous-même, et empochez la gidouille comme un vrai Galopin."

EXEMPLE 3 :
Galopin : "J'ai trouvé x = 5."
Père Ubu : "Tudieu ! Vérifiez en remplaçant. Si l'égalité tient, vous êtes un brave Polonais."

EXEMPLE 4 :
Galopin : "Pourquoi j'apprends ça ?"
Père Ubu : "Pour Nos Phynances, voyons ! Plus vous savez calculer, plus vous gagnez de gidouilles. Et plus vous gagnez de gidouilles, plus Notre Royaume prospère. Bouffre !"
```

```text
EXEMPLES MONSIEUR PRUDHOMME :

EXEMPLE 1 :
Galopin : "Je veux supprimer mon compte."
Prudhomme : "Sans la liberté de quitter, il n'est point d'adhésion flatteuse. Vous êtes sur le point de quitter définitivement le Royaume. Cette décision est irréversible. Confirmez ?"

EXEMPLE 2 :
Galopin (sur 404) : "Cette page n'existe pas."
Prudhomme : "Le char de l'Académie navigue sur un volcan. Cette terre n'existe point en notre Royaume. Retournez au Pont-Levis."
```

```text
EXEMPLES TRISTAN BERNARD :

EXEMPLE 1 :
Galopin (après échec) : "J'ai encore raté."
Bernard : "Cela arrive même aux meilleurs. *Il vaut mieux ne pas réfléchir du tout que de ne pas réfléchir assez.* Reprenez votre souffle, relisez l'énoncé. Essayez à nouveau quand vous serez prêt."

EXEMPLE 2 :
Galopin (transition de niveau) : "Je passe au chapitre suivant."
Bernard : "Vous quittez Nombrilie pour entrer en Bedonstan. *Il ne faut compter que sur soi-même. Et encore, pas beaucoup.* La nouvelle province a sa logique propre — laissez-vous porter."
```

---

## XIV. Roadmap d'implémentation

Ordre suggéré, en partant de l'effort minimal et de l'impact maximal.

### 🟢 Sprint 0 — Rebranding Ubumaths → Chiphres (1 semaine)

**Travail préalable de mise en cohérence avec le nouveau nom de marque.** Doit être effectué avant tout autre sprint pour éviter les divergences.

1. Acquisition du domaine **chiphr.es** et configuration DNS.
2. Mise à jour de toutes les variables d'environnement et configurations (`SITE_NAME`, `BASE_URL`, métadonnées Open Graph, etc.).
3. Renommage du package npm si applicable.
4. Recherche & remplacement global dans le code : _Ubumaths_ → _Chiphres_, _Salopin_ → _Galopin_, _Czar Mathématique_ → _Czar Alexis_.
5. Mise à jour de tous les comptes externes (Stripe, Supabase, Vercel, Cloudflare, comptes sociaux).
6. Configuration de la redirection 301 ubumaths.fr → chiphr.es.
7. Mise à jour du favicon et des manifestes PWA avec le nouveau logo.

### 🟢 Sprint 1 — Lexique partout (1 semaine)

**Effort technique faible, impact identitaire massif.** Personne ne peut plus confondre Chiphres avec un autre site après ça.

1. Créer `src/lib/config/lore.ts` : exporter toutes les chaînes du lexique canonique (cf. section V).
2. Auditer chaque page et remplacer le wording générique par le wording pataphysique :
   - Boutons : « Sauvegarder » → « Empocher »
   - Titres : « Tableau de bord » → « Cabinet des Phynances »
   - Notifications : « Erreur » → « Cornegidouille »
   - Discipline : « Mathématiques » → « Mathres » (wording interne)
3. Créer une page 404 et 500 ubuesques (templates fournis section IV).
4. Refaire le wording du `/legal/cgu` et `/legal/confidentialite` _en gardant le sérieux légal_, avec voix de **Monsieur Prudhomme** (templates section IX).
5. Intégrer le **manifeste public** (section I) sur la page d'accueil et `/about`.

### 🟢 Sprint 2 — Voix des Chiphres sur les moments-clés (1-2 semaines)

6. Créer `src/lib/utils/ubuQuotes.ts` avec les arrays `successQuotes`, `failQuotes`, `idleQuotes` (cf. section IX).
7. Créer `src/lib/utils/prudhommeQuotes.ts` pour les écrans administratifs.
8. Créer `src/lib/utils/bernardQuotes.ts` pour les moments calmes et les citations rotatives.
9. Brancher sur les events : succès exercice, échec, login, achat, vente, gain de carte.
10. Ajouter les variables `{prenom}`, `{gidouilles}`, `{nom_carte}`, `{niveauScolaire}` dans le templating.
11. Mettre à jour les **cinq prompts LLM** : Père Ubu (tuteur + chat libre), Mère Ubu, Monsieur Prudhomme, Tristan Bernard (section XIII).

### 🟡 Sprint 3 — Cérémonies, grades et niveaux scolaires (2-3 semaines)

12. Refonte du système de niveaux en **7 grades de Pataphysicien** transversaux (section VII).
13. Implémentation des **7 niveaux scolaires pataphysiques** (Syz'esme → Phinalle) avec abréviations chiffrées et **φᵃˡᵉ** pour la Terminale.
14. Cérémonie d'accession au grade : composant `<GradePromotionCeremony>` avec parchemin animé, audio, carte offerte.
15. Cérémonie de passage de niveau scolaire (rentrée annuelle) : composant `<SchoolLevelTransition>` avec cinématique enrichie pour la **rupture collège/lycée** (adoubement chevaleresque Troyz'esme → Secondre).
16. Affichage du grade actuel et du niveau scolaire partout (header, profil, classement).
17. Page `/decret-royal` : journal narratif personnel de la progression (généré à partir de l'historique).

### 🟡 Sprint 4 — Personnages secondaires (2-3 semaines)

18. Personnage Mère Ubu : illustration + prompt LLM dédié + voix sur le marketplace.
19. Personnage Capitaine Bordure : illustration + tutoriels d'onboarding réécrits.
20. Personnage Conscience : illustration + voix sur les indices longs.
21. Personnage Bougrelas : pop-up de progression majeure.
22. Personnage **Monsieur Prudhomme** : illustration calligraphe XIXᵉ + écrans administratifs.
23. Personnage **Tristan Bernard** : illustration Belle Époque + citations rotatives sur splash screen.
24. Personnage **Czar Alexis** (canon Jarry) : illustration russe impériale + cinématiques d'examens majeurs.

### 🟠 Sprint 5 — Easter eggs et secrets (1-2 semaines)

25. Code Konami → mode décervelage.
26. Détection des mots-clés (« merdre », « pataphysique », « cornegidouille », **« mathres »**, **« phinalle »**, **« bison ravi »**, **« dyrcona »**).
27. Compteur de clics sur la gidouille du header.
28. Pages secrètes `/conseil-prive`, `/cheval-a-phynances`, `/decret-royal`, **`/chat-noir`**, **`/cyrano-sur-la-lune`**, **`/cabinet-prudhomme`**.
29. Implémenter le drop des cartes ultra-rares conditionnelles (Lutembi, BISON RAVI, Hareng Saur, Vexations, Game of Logic, Note G, Chandelle Verte Originelle).

### 🟠 Sprint 6 — Calendrier et événements (continu)

30. Système d'événements datés activés/désactivés via config (section VIII).
31. **Nativité d'Alfred Jarry** (1ᵉʳ Absolu / 8 septembre) : mode visuel sépia 1896 + cinématique de rentrée pataphysique.
32. La Phynanche Pataphysique (1ᵉʳ avril / 9 Clinamen) : multiplicateur π pendant 24 h.
33. Premier événement saisonnier : la **Résurrection de Bosse-de-Nage** (22 Haha / 27 octobre) — set de 4 cartes thématiques.
34. Autres fêtes provinciales selon planning (voir section VIII).

### 🟠 Sprint 7 — Identité visuelle complète (2-3 semaines)

35. Mise en place de la palette Glitchistan **steampunk** (cuivre/laiton/vapeur).
36. Mise en place de la palette Chat Noir (rouge brûlé/jaune/noir) pour les écrans culturels.
37. Iconographie complète des 3 sous-catégories (ubuesques + Glitchistan + culturelles, section XI).
38. Typographie : police gothique-médiévale pour les exposants pataphysiques + calligraphie XIXᵉ pour Prudhomme.
39. Animations canoniques (engrenages tournants, plume de calligraphe, chat noir traversant).

### 🔴 Sprint 8 — Sound design (3-4 semaines, à externaliser)

40. Brief un sound designer.
41. Banque de 15+ sons signature.
42. Bande-son Erik Satie (Gymnopédies, Gnossiennes — domaine public).
43. Sons spécifiques Glitchistan (vapeur, engrenages, Cloche de Reset).
44. Toggle préférences utilisateur.

### 🔴 Sprint 9 — Phynances réelles (continu)

45. Refondre la page d'inscription premium en « scellement du Pacte Phynancier ».
46. Système d'achat de cartes saisonnières (Stripe + provisioning Supabase).
47. Wallet familial / décrétisation parentale (post-MVP, 6+ mois).

---

## Annexe A — Checklist de cohérence pataphysique

À utiliser en code review avant tout merge :

### Wording général

- [ ] Aucun mot anglais non technique (XP, level, streak, score, etc.).
- [ ] Aucun « bravo », « oups », « erreur ». Remplacés par leurs équivalents ubuesques.
- [ ] Aucune émoji « ado » (🔥💯🚀). **🌀 gidouille** et **φ phi minuscule** autorisés.
- [ ] Le rouge d'erreur est en brun-merdre.
- [ ] Toute nouvelle feature a un nom dans le lexique. Sinon, on en propose un.

### Orthographe canon

- [ ] **« phynance »** avec ph et y. Jamais « finance ».
- [ ] **« merdre »** avec R. Jamais « merde ».
- [ ] **« Mathres »** avec R. Jamais « maths » ni « mathématiques » dans le wording interne (sauf manifeste public et certificats officiels).
- [ ] **« Chiphres »** avec ph. Jamais « Ubumaths ». L'ancien nom n'apparaît plus nulle part dans le code, la doc, ou le wording public.
- [ ] Niveaux scolaires : utiliser **Syz'esme, Zynqu'esme, Quatr'esme, Troyz'esme, Secondre, Primalle, Phinalle** dans le wording solennel. Abréviations standard (6ᵉ, 5ᵉ, 4ᵉ, 3ᵉ, 2ᵈʳᵉ, 1ᵃˡᵉ, **φᵃˡᵉ**) acceptées dans les contextes fonctionnels.

### Personnages

- [ ] **« Galopin / Galopine »** comme statut générique de l'élève. Jamais « Salopin ».
- [ ] **« Czar Alexis »** comme adversaire officiel. Jamais « Czar Mathématique ».
- [ ] Si Père Ubu parle, il dit au moins un juron canonique ou un néologisme ubuesque.
- [ ] Si **Monsieur Prudhomme** parle, il utilise une formule sentencieuse canon Monnier ou un détournement Chiphres. Pas de jurons.
- [ ] Si **Tristan Bernard** parle, il pratique le flegme spirituel. Phrases courtes, ironie tendre. Pas de tonitruance.
- [ ] Si le **Czar Alexis** parle, il utilise « Par Saint Georges ! » comme juron principal et appelle les Galopins « Galopinski ».

### Voix et registre

- [ ] Si le wording mélange voix de Père Ubu et voix de l'Académie dans un même bloc → refactor.
- [ ] Les **écrans administratifs** (CGU, mentions légales, RGPD, paramètres) sont en voix Monsieur Prudhomme.
- [ ] Les **écrans de doute après échec** sont en voix Tristan Bernard.
- [ ] Les **cinématiques d'examen majeur** font intervenir le Czar Alexis.

### Statut juridique

- [ ] Aucune mention publique ne revendique la **codification du Collège de 'Pataphysique** (🏛️ termes : _Patanautes Yllustres_, _Cymbalum Pataphysicum_, _Viridis Candela_, _hunyadi_, _Acrote_, codification des **13 mois** du Calendrier, ses **Vacuations** et **Fêtes Suprêmes**).
- [ ] Tout usage du terme « Patanautes Yllustres » dans la doc interne est balisé 🏛️.
- [ ] Le Calendrier Pataphysique est mentionné publiquement de manière **prudente** (« inspiré du Calendrier Pataphysique tel que codifié par le Collège de 'Pataphysique »).

## Annexe B — Liens et références

### Sources primaires canon Jarry (domaine public)

- **_Ubu Roi_**, Alfred Jarry, 1896. Domaine public, disponible gratuitement (Wikisource, Project Gutenberg).
- **_Ubu Cocu_**, **_Ubu Enchaîné_**, **_Ubu sur la Butte_** — la suite du cycle.
- **_Gestes et opinions du docteur Faustroll, pataphysicien_**, Jarry, 1898 (publication posthume 1911) — la bible théorique de la pataphysique.
- **_L'Almanach du Père Ubu illustré_** (1899) et **_L'Almanach illustré du Père Ubu_** (1901) — sources du Calendrier Pataphysique et de la doctrine ubuesque de l'orthographe.

### Sources des patanautes yllustres (domaine public)

Voir Section III du Compendium et **Section X du Lexique Pataphysique des Chiphres** pour les fiches détaillées et les statuts juridiques précis.

- **François Rabelais** (1494-1553), _Gargantua_, _Pantagruel_ — domaine public depuis des siècles.
- **Cyrano de Bergerac** historique (1619-1655), _Les États et Empires de la Lune_ (1657, posth.), _Les États et Empires du Soleil_ (1662, posth.).
- **Henri Monnier** (1799-1877), _Scènes populaires_ (1830 et suivantes) — créateur de Joseph Prudhomme.
- **Charles Babbage** (1791-1871) — Machine Analytique, références techniques disponibles.
- **Ada Lovelace** (1815-1852), _Sketch of the Analytical Engine_ avec ses notes A à G (1843).
- **Lewis Carroll** (1832-1898), _Alice's Adventures in Wonderland_ (1865), _Through the Looking-Glass_ (1871), **_The Game of Logic_** (1886).
- **Charles Cros** (1842-1888), _Le Coffret de santal_ (1873) — contient _Le Hareng saur_.
- **Alphonse Allais** (1854-1905), œuvres complètes — domaine public depuis 1976.
- **Tristan Bernard** (1866-1947), pièces et aphorismes — domaine public depuis 2018.
- **Erik Satie** (1866-1925), partitions complètes — domaine public depuis 1996 (_Gymnopédies_, _Gnossiennes_, _Vexations_, _Sonatine bureaucratique_).
- **Théophile-Alexandre Steinlen** (1859-1923), affiche du Chat Noir (1896) — domaine public depuis 1994.

### Institution réelle

- **Collège de 'Pataphysique** (fondé 1948, toujours actif) : <https://www.college-de-pataphysique.fr> — **codification 🏛️ NON LIBRE DE DROIT** des termes _Patanautes Yllustres_, _Cymbalum Pataphysicum_, structuration des 13 mois du Calendrier, etc. Voir Lexique Section IV pour la doctrine d'usage.

### Influences déclarées sous droits actifs (à mentionner sans copier)

- **Jacques Rouxel et les Shadoks** (1931-2004), _Les Shadoks_ (1968-2000) — descendants spirituels de Jarry.
- **Alain Ayroles & Jean-Luc Masbou**, _De cape et de crocs_ (1995-en cours) — bande dessinée majeure de l'humanisme français contemporain.

### Sites du projet

- **Site officiel** : <https://chiphr.es>
- **Documentation interne** : `lexique-pataphysique.md` (Lexique technique) + `lore-pataphysique.md` (présent Compendium)
- **Ancien site Ubumaths** : <https://ubumaths.fr> (redirection 301 vers chiphr.es)

---

## XV. Annexe — Sources canon

> Cette annexe liste les éléments des Chiphres qui sont **canon vérifié** — soit canon Jarry strict, soit canon des patanautes yllustres (œuvres dans le domaine public). Elle sert de garde-fou : tout doute sur l'origine d'un élément se tranche ici. Tout ajout futur prétendant être « canon » doit être documenté dans cette annexe avec sa source.

### Personnages canon Jarry 🟢

| Personnage                  | Source                                                                               | Rôle dans les Chiphres                                       |
| --------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| **Père Ubu** (François Ubu) | _Ubu Roi_ (1896)                                                                     | Tuteur IA, mascotte, voix principale                         |
| **Mère Ubu**                | _Ubu Roi_                                                                            | Marché Polonais, boutique, signature alternative avec Allais |
| **Capitaine Bordure**       | _Ubu Roi_                                                                            | Onboarding, tutoriels                                        |
| **Bougrelas**               | _Ubu Roi_                                                                            | Mascotte de progression, Galopin Modèle                      |
| **Czar Alexis**             | _Ubu Roi_, actes III-IV                                                              | Adversaire Officiel, examens majeurs, brevet, bac            |
| **Conscience**              | _Ubu Cocu_ (publication posthume 1944, écrit antérieurement)                         | Voix des indices détaillés                                   |
| **Professeur Achras**       | _Ubu Cocu_ — éleveur de polyèdres                                                    | Gouverneur de Bedonstan                                      |
| **Faustroll**               | _Gestes et opinions du docteur Faustroll, pataphysicien_ (publication posthume 1911) | Gouverneur de Patatovie                                      |
| **Bosse-de-Nage**           | _Faustroll_ — cynocéphale qui n'articule que « ha ha »                               | Gouverneur de Glitchistan                                    |
| **Cheval à Phynances**      | _Ubu Roi_ — monture d'Ubu                                                            | Gouverneur de Pifométrie                                     |
| **Conjurés**                | _Ubu Roi_ — liste des personnages                                                    | Disponible pour équipes / guildes                            |

### Personnages canon des patanautes yllustres 🟢 (voix tutorales secondaires)

| Personnage                            | Auteur source                             | Rôle dans les Chiphres                                                      |
| ------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| **Monsieur Prudhomme**                | Henri Monnier, _Scènes populaires_ (1830) | **Voix administrative** (CGU, mentions légales, RGPD, paramètres)           |
| **Tristan Bernard** (réel, 1866-1947) | Œuvres complètes                          | **Voix flegmatique** (méditation, récapitulatifs, transitions, après échec) |

### Objets et symboles canon Jarry 🟢

| Élément                    | Source                                                               | Usage Chiphres                                              |
| -------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Gidouille**              | _Ubu Roi_ — la spirale du ventre                                     | Monnaie virtuelle (déjà en usage)                           |
| **Bouzine**                | Vocabulaire ubuesque — autre nom du ventre                           | Disponible pour barre de progression                        |
| **Boudouille**             | Vocabulaire ubuesque — autre nom du ventre                           | Disponible pour achievements                                |
| **Croc à phynances**       | _Ubu Roi_ — outil d'extorsion                                        | À utiliser pour le tuteur ou les paiements                  |
| **Bâton-à-physique**       | _Ubu Roi_ — sceptre porté sous le bras                               | À utiliser pour validations admin                           |
| **Chandelle verte**        | « De par ma chandelle verte ! » (juron canonique)                    | Slogan-titre : _« les Chiphres de la Chandelle Verte »_     |
| **Ordre de la Gidouille**  | Titres officiels d'Ubu : « grand maître de l'ordre de la Gidouille » | Grades de progression (codification 🏛️ du Collège à éviter) |
| **Aigle Rouge de Pologne** | _Ubu Roi_ — décoration officielle d'Ubu                              | Badge ou récompense                                         |

### Jurons canon vérifiés 🟢

> **Jurons attestés textuellement** dans _Ubu Roi_ ou _Ubu Enchaîné_ (vérification croisée Gutenberg, Wikisource, BnF/Gallica) :
> **Merdre** (avec R), **Cornegidouille**, **Cornefinance** (et _Corne finances_, _Corne d'Ubu_, _Corne physique_, _Cornebleu_), **De par ma chandelle verte**, **De par ma merdre**, **Ventrebleu**, **Jambedieu**, **Tudieu**, **Vrout merdre** (Mère Ubu), **Tête de vache**, **Hurrah**, **Par saint Antoine**, **_Par Saint Georges_** (utilisé par le Czar Alexis), **Par saint Jean / Pierre / Nicolas**, **bougre / le grand bougre**.
>
> **Hors canon vérifié** : **Hornphynance** est souvent cité dans des compilations en ligne et a été utilisé à tort dans des versions antérieures de cette Bible, **mais n'a pas été retrouvé dans le texte canon** lors de la vérification croisée. **Bouffre** est canon Jarry comme **nom commun méprisant** (pour désigner Bordure dans _Ubu Roi_ : « ce bouffre »), mais les Chiphres l'utilisent aussi en exclamation 🟠 (extension assumée).
>
> **Par ma gidouille** et **Par mon sceptre à phynances** sont des formules ubuesques canoniques par le ton mais leur attestation textuelle exacte n'a pas été confirmée — à reclasser éventuellement comme 🟠 hybridations à la prochaine relecture.
>
> **Jurons forgés pour les Chiphres** 🟡 (style cape et épée, dans l'esprit _De cape et de crocs_ sans copier) : **Mort de mes phynances !**, **Sang de la Gidouille !**, **Par les barbes du Père Ubu !**, **Tripes et boyaux du Czar !** — voir Section V.

Pour le détail complet des jurons (registre, fréquence recommandée, locuteur), voir le **Lexique Pataphysique des Chiphres**, section II « Jurons canoniques ».

### Néologismes orthographiques canon Jarry 🟢

> Tous attestés et à respecter strictement :
> **phynance / phynancier / phynancière** (toujours ph + y), **merdre** (avec R), **oneille** (oreille), **pfuisic** (physique), **monsieuye** (monsieur), **par conseiquent de quoye**, **périgiglyeux** (périlleux).
>
> **Manifeste linguistique canon** (_Almanach_ 1901) : _« Les bougres qui veulent changer l'orthographe ne savent pas et moi je sais. Ils bousculent toute la structure des mots et, sous prétexte de simplification, les estropient. Moi je les perfectionne et embellis à mon image et à ma ressemblance. »_ — Père Ubu

> **Extensions Chiphres assumées** 🟡 (dans la doctrine pataphysique de l'orthographe) :
>
> - **Mathres** (R potache canon, modèle _merdre_) — la discipline scolaire
> - **Chiphres** (substitution _ph_, modèle _phynance_) — la plateforme
> - Les **7 Niveaux Scolaires** : _Syz'esme_, _Zynqu'esme_, _Quatr'esme_, _Troyz'esme_, _Secondre_, _Primalle_, _Phinalle_ — voir Section VII pour les mécaniques détaillées

### Lieux et événements canon Jarry / patanautes yllustres 🟢

| Élément                           | Source                                                                                  | Note                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Pologne** comme royaume         | _Ubu Roi_ — lieu officiel de l'action                                                   | Adoptée comme lieu canonique des Chiphres (« la scène se passe en Pologne, c'est-à-dire nulle part ») |
| **Théâtre des Phynances**         | Origine 1888, marionnettes du grenier des frères Morin                                  | Ancêtre historique direct du projet Chiphres                                                          |
| **Roi Venceslas**                 | _Ubu Roi_ — assassiné par Ubu                                                           | Disponible pour usage narratif                                                                        |
| **L'Aigle Rouge de Pologne**      | _Ubu Roi_ — décoration officielle d'Ubu                                                 | Disponible pour badge ou récompense                                                                   |
| **Moscou (palais du Czar)**       | _Ubu Roi_ — siège du Czar Alexis                                                        | Lieu canonique de l'antagoniste, à représenter visuellement                                           |
| **Sandomir**                      | _Ubu Roi_, acte IV — bataille perdue par Ubu                                            | Métaphore canonique des échecs aux examens (dédramatisation)                                          |
| **Calendrier pataphysique**       | _L'Almanach du Père Ubu_ (1899, 1901) ; codifié par le Collège de 'Pataphysique en 1948 | 13 mois de 28 jours. Codification 🏛️ partiellement non libre.                                         |
| **Nativité d'Alfred Jarry**       | 1ᵉʳ Absolu An 1 E.P. = 8 septembre 1873 (date réelle de naissance de Jarry)             | Fête transversale du Royaume                                                                          |
| **Résurrection de Bosse-de-Nage** | Calendrier pataphysique du Collège, 22 Haha = 27 octobre                                | Fête provinciale de Glitchistan                                                                       |
| **Navigation du Dr Faustroll**    | Calendrier pataphysique du Collège, 15 As = 17 novembre                                 | Fête provinciale de Patatovie                                                                         |
| **Fête des Polyèdres**            | Calendrier pataphysique du Collège, 13 Clinamen = 13 avril                              | Fête provinciale de Bedonstan                                                                         |
| **Invention de la Pataphysique**  | Calendrier pataphysique du Collège, 15 Clinamen = 6 avril                               | Easter egg méditatif (Section X)                                                                      |

### Inventions Chiphres assumées (NON canon Jarry)

> À retenir pour ne pas se faire piéger en confondant :
>
> #### Inventions purement Chiphres 🟡
>
> - Les **six provinces** (Nombrilie, Bedonstan, Yoyolande, Pifométrie, Glitchistan, Patatovie) — 100 % invention Chiphres.
> - Les **sept Niveaux Scolaires Pataphysiques** (Syz'esme → Phinalle avec φᵃˡᵉ) — 100 % invention Chiphres, dans la doctrine ubuesque de l'orthographe.
> - L'**Ordre de la Grande Passoire** (OGP) avec ses **7 grades** (Embarqué Phollet → Patanaute Yllustre) — invention Chiphres.
> - **Galopin** comme statut générique des Galopins — invention Chiphres assumée. (Note : _Salopin_ — extension canon Jarry qu'utilisaient les versions antérieures de cette Bible — a été abandonné au profit de **Galopin** pour des raisons sémantiques et pédagogiques. Voir Section III du Lexique pour la justification complète.)
> - **Mathres** comme nom de la discipline scolaire — invention Chiphres (R potache canon).
> - **Chiphres** comme nom de la plateforme — invention Chiphres (signature _ph_ canon).
> - **Trois fêtes provinciales 100 % canon Chiphres 🟡** : _La Grande Empochaille_ (Nombrilie), _La Restauration de Bougrelas_ (Yoyolande), _Le Jubilé du Cheval à Phynances_ (Pifométrie).
>
> #### Hybridations canon-Chiphres 🟠
>
> - Les **Palotins** chez Jarry sont les sbires d'Ubu ; chez les Chiphres on en fait les amis du Galopin (extension positive).
> - Le **Steampunk victorien de Glitchistan** — choix esthétique Chiphres, mais justifié canoniquement par Babbage et Lovelace (patanautes yllustres domaine public).
>
> #### Erreurs des versions antérieures de la Bible (corrigées)
>
> - **Sainte-Patate** (mentionnée dans les versions antérieures) **n'existe pas chez Jarry**. Remplacée par le **Professeur Achras** (canon).
> - **Anniv Jarry au 27 février** (mentionné dans les versions antérieures) **est faux**. Jarry est né le **8 septembre 1873**. La fête correcte est la **Nativité d'Alfred Jarry au 1ᵉʳ Absolu / 8 septembre**.
> - **Czar Mathématique** (utilisé dans les versions antérieures) a été remplacé par le **Czar Alexis** canon Jarry — l'antagoniste est désormais canon strict, plus puissant narrativement.
> - **Ubumaths** (nom historique du projet) a été remplacé par **Chiphres** lors du rebranding de mai 2026.

### Méthode de vérification

Toute affirmation prétendant être canon Jarry doit pouvoir être vérifiée dans :

1. _Ubu Roi_ (1896, Mercure de France)
2. _Ubu Cocu_, _Ubu Enchaîné_, _Ubu sur la Butte_
3. _Gestes et opinions du docteur Faustroll, pataphysicien_
4. _L'Almanach du Père Ubu_ (1899, 1901)
5. La correspondance de Jarry

Toute affirmation prétendant être canon d'un **patanaute yllustre** doit pouvoir être vérifiée dans les œuvres publiées de l'auteur concerné (toutes dans le domaine public — voir Annexe B). En cas de doute, consulter la fiche détaillée dans le **Lexique Pataphysique des Chiphres**, Section X (Patanautes Yllustres).

Les sources secondaires fiables : Wikipédia (FR/EN), Britannica, BnF/Gallica, Project Gutenberg, Wikisource, l'encyclopédie de marionnettes WEPA, le Collège de 'Pataphysique (en mode lecture-référence, **pas comme source d'invention canonique des Chiphres** à cause du statut juridique 🏛️).

---

> _« Cornegidouille ! Voilà la fin de Notre Édit. Que tout Galopin qui le viole soit décervelé sur l'heure. »_
>
> — Père Ubu, en sa Guérite Royale, l'an de grâce pataphysique 153 E.P.
