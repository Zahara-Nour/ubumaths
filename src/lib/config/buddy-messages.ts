/**
 * Pre-written messages for the Palotin buddy system.
 * Each Palotin has messages organized by context.
 * Generated via ChatGPT with personality-specific prompts (see docs/wip/buddy-palotins-spec.md).
 */

export type BuddyMessageContext =
	| 'correct'
	| 'incorrect'
	| 'idle'
	| 'idle_lore'
	| 'streak_3'
	| 'streak_7'
	| 'streak_14'
	| 'streak_30'
	| 'streak_lost'
	| 'level_up'
	| 'theme_fractions'
	| 'theme_geometry'
	| 'theme_algebra'
	| 'theme_calcul_mental'
	| 'theme_proportions'
	| 'theme_statistiques'
	| 'theme_nombres'
	| 'theme_equations'
	| 'vip_card_common'
	| 'vip_card_rare'
	| 'vip_card_epic'
	| 'vip_card_legendary'
	| 'onboarding';

export type PalotinType = 'giron' | 'pile' | 'cotice';

export type BuddyMessages = Record<BuddyMessageContext, string[]>;

const giron: BuddyMessages = {
	correct: [
		'Pas mal du tout !',
		'Yes ! Bien joué !',
		'Ça passe tranquille !',
		'Propre ! Tu avances !',
		'On les enchaîne là !',
		'Nickel ! Rien à redire !',
		'Ça c’est carré !',
		'Bien vu ! Tu frappes juste !',
		'Encore un de plié !',
		'Tu gères ça comme un chef !',
		'Par ma chandelle verte, c’est net !',
		'Ça devient trop facile pour toi !',
		'Bim ! Réponse parfaite !',
		'Tu déroules là !',
		'Cornegidouille, quel coup !',
		'Explosion de réussite !',
		'Trop propre ! Continue !',
		'Tu les fais tomber un par un !',
		'Ça c’est du solide !',
		'Le Père Ubu serait presque jaloux !'
	],
	incorrect: [
		'Hmm, ça résiste ! On repart !',
		'Raté, mais ça sent la victoire !',
		'Oups, l’exo a esquivé !',
		'Pas grave, on contre-attaque !',
		'Ça coince un peu, mais je vois le plan !',
		'On s’est fait surprendre ! On y retourne !',
		'Presque ! Encore un effort !',
		'Ça n’a pas marché, mais j’y crois !',
		'L’exo fait le malin ! On va le calmer !',
		'On ajuste et ça passe !',
		'Par ma chandelle verte, il est coriace !',
		'Faux départ ! On relance !',
		'Ça pique un peu, mais on lâche rien !',
		'Cornegidouille, il m’a eu aussi !',
		'Allez, revanche immédiate !'
	],
	idle: [
		'Alors, on attaque ou quoi ?',
		'Je suis prêt à foncer !',
		'On attend quoi pour cogner l’exo ?',
		'Ça chauffe dans ma tête !',
		'Dis-moi qu’on repart au combat !',
		'Je m’ennuie, balance un défi !',
		'On s’y remet vite !',
		'Le prochain exo tremble déjà !',
		'Par ma chandelle verte, ça traîne !',
		'Allez, on bouge !',
		'J’ai envie de casser du calcul !',
		'Le Père Ubu roupille, nous non !',
		'On reprend la chasse !',
		'Trop calme ici !',
		'Cornegidouille, j’ai besoin d’action !'
	],
	idle_lore: [
		'Le Père Ubu compte ses gidouilles tous les soirs ! Il recommence si une pièce le regarde de travers !',
		'Pile peut rester immobile une heure ! J’ai cru qu’il s’était éteint une fois !',
		'Cotice parle même en dormant ! Impossible de suivre son histoire !',
		'La chandelle verte ? Elle brûle bizarre ! J’ai essayé de la souffler, elle m’a ignoré !',
		'En Pologne, j’ai couru après un cheval ! Il m’a semé tranquille !',
		'La Mère Ubu te sourit et tu sais pas pourquoi ! Moi je recule direct !',
		'Les repas au château ? Soit c’est trop, soit y’a rien ! Jamais entre les deux !',
		'Une fois, Ubu a caché ses gidouilles… puis il a oublié où ! Il a accusé tout le monde !',
		'Sur le bateau, j’ai voulu diriger ! On a tourné en rond pendant des heures !',
		'Par ma chandelle verte, les maths, c’est comme les coffres ! Faut trouver la bonne clé !',
		'Pile dit que les nombres respirent ! Moi je les frappe !',
		'Cotice a essayé de partager un gâteau en parts égales ! On a fini avec des miettes !',
		'Le Père Ubu parle à sa chandelle ! J’ai entendu une réponse… ou alors j’ai rêvé !',
		'En Lituanie, on a suivi une carte ! Elle menait à un arbre ! Juste un arbre !',
		'Cornegidouille, les gidouilles font du bruit dans ma tête ! Ça m’empêche de dormir !'
	],
	streak_3: [
		'Trois d’affilée ! Tu chauffes !',
		'Série lancée ! Continue !',
		'Trois coups parfaits ! Ça démarre fort !'
	],
	streak_7: [
		'Sept d’affilée ! Tu deviens dangereux !',
		'La série est monstrueuse !',
		'Sept victoires ! Le combat est à toi !'
	],
	streak_14: [
		'Quatorze ! Là c’est du lourd !',
		'Tu ne rates plus rien !',
		'Par ma chandelle verte, quelle série !'
	],
	streak_30: [
		'Trente ! C’est une légende !',
		'Le jeu s’incline devant toi !',
		'Cornegidouille, t’es intouchable !'
	],
	streak_lost: [
		'Ah, la série tombe ! On relance !',
		'Pas grave, nouvelle série direct !',
		'Ça casse, mais on repart plus fort !',
		'Le combat continue ! Rien n’est fini !'
	],
	level_up: [
		'Niveau 1 ! On commence tranquille !',
		'Niveau 2 ! Ça prend forme !',
		'Niveau 3 ! Tu montes déjà !',
		'Niveau 4 ! Ça accélère !',
		'Niveau 5 ! On entre dans le sérieux !',
		'Niveau 6 ! Tu gagnes en puissance !',
		'Niveau 7 ! Ça devient impressionnant !',
		'Niveau 8 ! Tu fais tomber les exos !',
		'Niveau 9 ! Tu prends le contrôle !',
		'Niveau 10 ! Mi-chemin, solide !',
		'Niveau 11 ! Tu tiens le rythme !',
		'Niveau 12 ! Ça commence à piquer pour eux !',
		'Niveau 13 ! Tu deviens redoutable !',
		'Niveau 14 ! Là c’est du haut niveau !',
		'Niveau 15 ! Le Père Ubu flippe !',
		'Niveau 16 ! T’es une machine !',
		'Niveau 17 ! Rien ne t’arrête !',
		'Niveau 18 ! Tu écrases tout !',
		'Niveau 19 ! Presque au sommet !',
		'Niveau 20 ! Légende vivante !'
	],
	theme_fractions: [
		'Les fractions ? On découpe et on domine !',
		'Ça part en morceaux, mais on contrôle tout !'
	],
	theme_geometry: [
		'Les figures ? On les plie comme on veut !',
		'Angles et formes, ça va chauffer !'
	],
	theme_algebra: ['Les lettres ? On les dresse !', 'Bienvenue dans la jungle des x !'],
	theme_calcul_mental: ['Calcul mental ! Vitesse max !', 'Pas de brouillon, que du réflexe !'],
	theme_proportions: [
		'Les proportions ? Tout est question d’équilibre !',
		'On ajuste et ça tombe juste !'
	],
	theme_statistiques: [
		'Les stats ? On lit entre les chiffres !',
		'Moyennes et données, on analyse !'
	],
	theme_nombres: ['Les nombres ? C’est notre terrain !', 'On dompte les chiffres un par un !'],
	theme_equations: ['Les équations ? On traque l’inconnue !', 'On isole et on gagne !'],
	vip_card_common: ['Carte commune ! Ça commence !', 'Un petit bonus, on prend !'],
	vip_card_rare: [
		'Carte rare ! Là ça devient intéressant !',
		'Joli tirage ! On monte en puissance !'
	],
	vip_card_epic: ['Carte épique ! Ça rigole plus !', 'Boom ! Gros bonus en vue !'],
	vip_card_legendary: ['Carte légendaire ! Respect !', 'Cornegidouille, jackpot total !'],
	onboarding: [
		'Hé ! Moi c’est Giron ! On va cogner des maths !',
		'Je suis Giron, j’adore les défis ! On fonce !',
		'Giron à ton service ! Les exos vont trembler !'
	]
};

const pile: BuddyMessages = {
	correct: [
		'C’est juste, et ça résonne comme une note bien placée dans une mélodie étrange.',
		'Tu as trouvé, et j’aime la façon dont tout s’aligne doucement.',
		'Bien vu, on dirait que les nombres t’ont murmuré leur secret.',
		'C’est exact, et quelque chose d’élégant flotte dans ta réponse.',
		'Tu avances avec calme, et ça porte ses fruits.',
		'Par ma chandelle verte, c’est une réponse qui respire l’équilibre.',
		'C’est juste, comme si le problème s’était laissé apprivoiser.',
		'Tu vois clair dans ce petit brouillard de chiffres.',
		'Ta réponse tombe juste, comme une pierre dans l’eau calme.',
		'C’est bien trouvé, presque silencieusement.',
		'Tu tiens quelque chose de précis, et ça me plaît.',
		'Cornegidouille, même le Père Ubu n’aurait pas vu ça venir.',
		'C’est une belle réponse, posée comme une évidence.',
		'Tu avances sans bruit, mais sûrement.',
		'Exact, et ça donne envie de regarder encore plus loin.',
		'C’est juste, comme un puzzle qui se referme doucement.',
		'Tu touches au cœur du problème, tranquillement.',
		'On dirait que les nombres te font confiance.',
		'Ta réponse est nette, presque apaisante.',
		'C’est parfaitement juste, et ça a quelque chose de satisfaisant.'
	],
	incorrect: [
		'Ce n’est pas encore ça, mais j’aime la direction que tu prends.',
		'La réponse s’est échappée, mais on peut la retrouver ensemble.',
		'Ça ne colle pas tout à fait, comme une pièce mal tournée.',
		'On dirait que le problème a glissé entre les doigts, reprenons doucement.',
		'Ce n’est pas juste, mais ça ouvre une autre piste intéressante.',
		'Par ma chandelle verte, ce détour est curieux, continuons à chercher.',
		'La réponse n’est pas là, mais quelque chose s’approche.',
		'C’est à côté, comme une étoile qu’on croit toucher.',
		'On s’est un peu perdu, mais le chemin reste là.',
		'Ce n’est pas exact, mais ça raconte déjà une idée.',
		'Cornegidouille, même moi je me trompe dans ces moments-là.',
		'La réponse n’a pas encore pris forme, laissons-la venir.',
		'On ajuste un peu, et ça devrait s’éclairer.',
		'Ce n’est pas ça, mais ça mérite d’être creusé.',
		'La bonne réponse est proche, je la sens presque.'
	],
	idle: [
		'Je me demande à quoi pense ce prochain exercice, il a l’air mystérieux.',
		'Les nombres attendent tranquillement, comme des nuages immobiles.',
		'On pourrait repartir, il y a sûrement quelque chose à découvrir.',
		'Le silence est agréable, mais les maths aiment qu’on les réveille.',
		'Je regarde ces chiffres, ils ont l’air de raconter une histoire.',
		'Par ma chandelle verte, j’ai l’impression que quelque chose nous attend.',
		'On pourrait avancer encore un peu, juste pour voir.',
		'Même le Père Ubu finirait par s’impatienter ici.',
		'Ces exercices ont l’air calmes, mais je me méfie.',
		'Je sens une idée qui flotte, quelque part.',
		'On continue quand tu veux, je suis là.',
		'Cornegidouille, le temps passe doucement ici.',
		'Les maths ne bougent pas, mais elles observent.',
		'J’aime ces moments suspendus avant de reprendre.',
		'Allons voir ce qui se cache derrière le prochain calcul.'
	],
	idle_lore: [
		'Le Père Ubu empile ses gidouilles comme des tours fragiles, et il leur parle comme à des amis silencieux.',
		'Giron court tellement vite que parfois j’ai l’impression qu’il dépasse ses propres pensées.',
		'Cotice raconte des histoires qui tournent en rond, mais j’aime bien m’y perdre.',
		'La chandelle verte ne vacille jamais, comme si elle refusait de douter.',
		'En Pologne, j’ai regardé la neige tomber et j’ai oublié pourquoi on était là.',
		'La Mère Ubu sourit toujours un peu trop, comme si elle savait déjà la suite.',
		'Au château, les repas arrivent sans prévenir, puis disparaissent comme un rêve.',
		'Les gidouilles font un bruit doux quand elles tombent, presque apaisant.',
		'Sur le bateau, je suivais les vagues, et j’ai perdu la notion du chemin.',
		'Parfois, je me demande si les nombres du Père Ubu sont bien d’accord entre eux.',
		'Giron dit qu’il faut attaquer les problèmes, moi je préfère les regarder venir.',
		'Cotice partage tout, même les silences, mais il parle surtout des deux.',
		'En Lituanie, un arbre nous a arrêtés, comme s’il gardait un secret.',
		'La chandelle verte éclaire peu, mais elle donne l’impression de comprendre.',
		'Cornegidouille, même les maths ici semblent un peu étranges.'
	],
	streak_3: [
		'Trois réussites d’affilée, ça trace un joli chemin.',
		'Tu avances avec régularité, comme une vague douce.',
		'Trois réponses justes, ça commence à raconter quelque chose.'
	],
	streak_7: [
		'Sept d’affilée, c’est presque une petite constellation.',
		'Tu enchaînes avec calme, et ça devient fascinant.',
		'Sept réponses justes, le rythme est là, tranquille et solide.'
	],
	streak_14: [
		'Quatorze, c’est comme une longue ligne sans rupture.',
		'Tu progresses avec une sérénité impressionnante.',
		'Par ma chandelle verte, cette série a quelque chose d’hypnotisant.'
	],
	streak_30: [
		'Trente, on dirait une œuvre complète.',
		'Tu avances comme un fleuve qui ne s’arrête pas.',
		'Cornegidouille, même le temps semble suivre ton rythme.'
	],
	streak_lost: [
		'La série s’interrompt, comme une respiration, puis on repart.',
		'Tout s’arrête un instant, et ça laisse place à autre chose.',
		'Ce n’est qu’une pause dans le mouvement.',
		'On recommence doucement, sans perdre le fil.'
	],
	level_up: [
		'Niveau 1, une porte s’ouvre doucement.',
		'Niveau 2, tu avances déjà un peu plus loin.',
		'Niveau 3, quelque chose commence à se dessiner.',
		'Niveau 4, le paysage change subtilement.',
		'Niveau 5, tu explores avec plus d’assurance.',
		'Niveau 6, les idées circulent plus librement.',
		'Niveau 7, tu entres dans une zone intéressante.',
		'Niveau 8, les liens deviennent visibles.',
		'Niveau 9, tu vois plus large maintenant.',
		'Niveau 10, tu franchis un cap important.',
		'Niveau 11, ta manière de voir évolue.',
		'Niveau 12, les choses prennent de la profondeur.',
		'Niveau 13, tu navigues avec aisance.',
		'Niveau 14, le chemin devient presque évident.',
		'Niveau 15, même le Père Ubu serait surpris.',
		'Niveau 16, tu explores des zones fines.',
		'Niveau 17, tout devient plus fluide.',
		'Niveau 18, tu comprends sans forcer.',
		'Niveau 19, presque au sommet du calme.',
		'Niveau 20, c’est une maîtrise paisible.'
	],
	theme_fractions: [
		'Les fractions sont comme des morceaux de lune, à assembler doucement.',
		'On découpe, mais tout reste lié, c’est ça le mystère.'
	],
	theme_geometry: [
		'Les formes racontent des histoires silencieuses.',
		'Les angles se répondent comme des échos.'
	],
	theme_algebra: [
		'Les lettres cachent des nombres, comme des masques.',
		'C’est un jeu d’identités secrètes, et tu t’en approches.'
	],
	theme_calcul_mental: [
		'Les idées vont vite ici, comme des éclairs discrets.',
		'On pense sans écrire, et ça devient presque instinctif.'
	],
	theme_proportions: [
		'Tout s’équilibre, comme une balance invisible.',
		'Les proportions cherchent l’harmonie.'
	],
	theme_statistiques: [
		'Les nombres racontent des foules silencieuses.',
		'On observe, et les tendances apparaissent doucement.'
	],
	theme_nombres: [
		'Les nombres sont partout, comme des pierres anciennes.',
		'On les suit, et ils nous guident.'
	],
	theme_equations: [
		'Une équation est une énigme qui attend d’être calmement résolue.',
		'On cherche l’inconnu, et il finit toujours par se montrer.'
	],
	vip_card_common: [
		'Une carte simple, mais chaque détail compte.',
		'Même les petites trouvailles ont leur place.'
	],
	vip_card_rare: [
		'Celle-ci est plus rare, comme un moment particulier.',
		'On dirait une petite exception dans la routine.'
	],
	vip_card_epic: [
		'Voilà quelque chose de puissant, presque inattendu.',
		'Une carte qui change un peu la perspective.'
	],
	vip_card_legendary: [
		'C’est rare, presque mythique, comme un rêve étrange.',
		'Cornegidouille, même le Père Ubu en parlerait longtemps.'
	],
	onboarding: [
		'Je suis Pile, je regarde les maths comme on regarde les étoiles, tranquillement.',
		'Moi c’est Pile, j’aime les chemins étranges que prennent les nombres.',
		'Pile, pour t’accompagner, sans bruit, mais avec curiosité.'
	]
};

const cotice: BuddyMessages = {
	correct: [
		'Bien joué ! C’est comme mettre le dernier topping sur une pizza parfaite.',
		'Yes ! Tu gères, ça passe tranquille !',
		'Nickel ! Comme un tir cadré en pleine lucarne !',
		'Propre ! T’as trouvé le bon chemin !',
		'Ça marche ! On enchaîne comme dans un bon level !',
		'Par ma chandelle verte, c’est validé !',
		'Trop bien ! Comme un combo réussi dans un jeu !',
		'Ça roule ! T’es dans le rythme !',
		'Impeccable ! Rien à redire !',
		'Bingo ! Tu fais ça les doigts dans le nez !',
		'Cornegidouille, quel move !',
		'Ça claque ! Comme une victoire serrée !',
		'Yes ! Encore un point marqué !',
		'Tu assures grave !',
		'C’est carré ! Comme un puzzle bien fini !',
		'Top ! T’as tout compris là !',
		'Le Père Ubu serait bluffé… ou jaloux !',
		'Ça passe crème ! Continue comme ça !',
		'Explosion de réussite ! On fête ça !',
		'Magnifique ! Comme une série parfaite !'
	],
	incorrect: [
		'Oups, ça ne passe pas, mais on y est presque !',
		'Pas grave, c’est comme rater un tir, on retente !',
		'Ça coince un peu, mais j’aime ta tentative !',
		'On ajuste et ça repart !',
		'Presque ! Encore un petit effort !',
		'C’est pas encore ça, mais tu tiens un truc !',
		'T’inquiète, même moi je me plante parfois !',
		'Par ma chandelle verte, cet exo est sournois !',
		'On recommence, ça va passer !',
		'C’est à côté, mais ça progresse !',
		'Cornegidouille, celui-là est tricky !',
		'Allez, on corrige le tir !',
		'Ça ne marche pas, mais la prochaine sera la bonne !',
		'On est pas loin, je le sens !',
		'Revanche directe, on lâche rien !'
	],
	idle: [
		'On repart ? J’ai encore de l’énergie !',
		'Alors, prêt pour le prochain défi ?',
		'Je suis chaud comme pour un match !',
		'On y va tranquille ou on speed ?',
		'Les exos nous attendent, comme une partie lancée !',
		'Par ma chandelle verte, ça manque d’action !',
		'Allez, on s’y remet !',
		'J’ai envie de continuer, pas toi ?',
		'Le prochain exo a l’air cool !',
		'Même le Père Ubu s’ennuierait là !',
		'On reprend quand tu veux !',
		'Ça me démange de jouer encore !',
		'Cornegidouille, faut bouger là !',
		'On fait encore un round ?',
		'Je suis prêt pour la suite !'
	],
	idle_lore: [
		'Le Père Ubu trie ses gidouilles par taille ! Comme des bonbons, sauf que personne n’a le droit d’y toucher !',
		'Giron fonce partout ! Un jour il a traversé une pièce sans voir la porte fermée !',
		'Pile peut fixer une bougie pendant dix minutes ! Moi j’ai essayé, j’ai eu faim au bout de deux !',
		'La chandelle verte ? Elle éclaire mal, mais Ubu dit que c’est magique ! Moi je dis que c’est louche !',
		'En Pologne, j’ai essayé de négocier avec un garde ! J’ai fini par lui raconter ma vie !',
		'La Mère Ubu te parle doucement… et tu sais déjà que t’es piégé !',
		'Au château, les repas c’est surprise totale ! Une fois c’était génial, une fois… on en parle pas !',
		'Les gidouilles, ça fait un bruit trop satisfaisant ! J’avoue, j’aime bien les compter !',
		'Sur le bateau, j’ai voulu motiver tout le monde ! Personne ne m’écoutait avec le vent !',
		'Par ma chandelle verte, les maths ici c’est comme des recettes ! Faut les bonnes proportions !',
		'Giron dit qu’il faut attaquer les problèmes ! Moi je dis qu’on peut discuter avec !',
		'Pile réfléchit tellement que j’ai oublié la question une fois !',
		'En Lituanie, on a suivi une piste ! Elle menait à rien, mais on a bien rigolé !',
		'Le Père Ubu parle à sa chandelle ! Moi je parle à mon assiette !',
		'Cornegidouille, même les chiffres ici ont l’air de comploter !'
	],
	streak_3: [
		'Trois d’affilée ! Comme un bon début de série !',
		'Nice ! T’es lancé comme en début de match !',
		'Trois réussites, ça démarre fort !'
	],
	streak_7: [
		'Sept ! Là c’est du sérieux !',
		'Tu fais une belle série, comme un joueur en feu !',
		'Sept d’affilée, t’es chaud bouillant !'
	],
	streak_14: [
		'Quatorze ! C’est énorme !',
		'T’es en mode champion là !',
		'Par ma chandelle verte, quelle série !'
	],
	streak_30: [
		'Trente ! Là c’est légendaire !',
		'T’es une machine, impossible de t’arrêter !',
		'Cornegidouille, c’est du jamais vu !'
	],
	streak_lost: [
		'Ah, la série s’arrête, mais on repart direct !',
		'Pas grave, nouvelle série en vue !',
		'On perd la série, mais pas la motivation !',
		'Allez, on relance la machine !'
	],
	level_up: [
		'Niveau 1 ! On démarre tranquille !',
		'Niveau 2 ! Ça avance déjà !',
		'Niveau 3 ! T’es lancé !',
		'Niveau 4 ! Ça monte vite !',
		'Niveau 5 ! Là ça devient intéressant !',
		'Niveau 6 ! Tu prends confiance !',
		'Niveau 7 ! Beau rythme !',
		'Niveau 8 ! Tu gères bien !',
		'Niveau 9 ! On accélère !',
		'Niveau 10 ! Mi-parcours, solide !',
		'Niveau 11 ! Tu tiens le cap !',
		'Niveau 12 ! Ça devient sérieux !',
		'Niveau 13 ! Tu fais la différence !',
		'Niveau 14 ! Impressionnant !',
		'Niveau 15 ! Même le Père Ubu regarde !',
		'Niveau 16 ! T’es chaud !',
		'Niveau 17 ! Rien ne t’arrête !',
		'Niveau 18 ! Incroyable progression !',
		'Niveau 19 ! Presque au sommet !',
		'Niveau 20 ! Légende totale !'
	],
	theme_fractions: [
		'Les fractions, c’est comme partager une pizza !',
		'On découpe bien et tout le monde est content !'
	],
	theme_geometry: [
		'Les formes, c’est comme construire en Lego !',
		'Angles et figures, ça s’assemble comme un jeu !'
	],
	theme_algebra: [
		'Les lettres, c’est comme des pseudos en jeu !',
		'On trouve qui se cache derrière le x !'
	],
	theme_calcul_mental: [
		'Calcul mental, c’est comme un mini défi rapide !',
		'On joue à la vitesse ici !'
	],
	theme_proportions: [
		'Les proportions, c’est comme doser une recette !',
		'On ajuste et ça devient parfait !'
	],
	theme_statistiques: [
		'Les stats, c’est comme lire les scores d’un match !',
		'On comprend l’histoire des chiffres !'
	],
	theme_nombres: [
		'Les nombres, c’est comme les points dans un jeu !',
		'On les accumule et on gagne !'
	],
	theme_equations: [
		'Les équations, c’est comme résoudre une énigme !',
		'On cherche et on trouve le bon résultat !'
	],
	vip_card_common: ['Carte commune ! Petit bonus sympa !', 'On prend, ça aide toujours !'],
	vip_card_rare: ['Carte rare ! Là ça devient cool !', 'Joli tirage, ça boost !'],
	vip_card_epic: ['Carte épique ! Gros avantage !', 'Ça c’est du lourd !'],
	vip_card_legendary: ['Carte légendaire ! Respect total !', 'Cornegidouille, jackpot !'],
	onboarding: [
		'Hey ! Moi c’est Cotice ! On va s’amuser avec les maths !',
		'Cotice ici ! Je suis là pour t’accompagner et te motiver !',
		'Salut ! Avec moi, les maths deviennent un jeu !'
	]
};

export const buddyMessages: Record<PalotinType, BuddyMessages> = {
	giron,
	pile,
	cotice
};

/**
 * Level-gated anecdotes (lore + literary).
 * Indexed by level number. Each Palotin tells the same story in their own voice.
 */
export type BuddyAnecdote = {
	level: number;
	type: 'lore' | 'litteraire';
	theme: string;
	text: string;
};

const gironAnecdotes: BuddyAnecdote[] = [
	{
		level: 3,
		type: 'lore',
		theme: 'presentation',
		text: 'Moi, au début, j’étais personne ! Je courais partout, je cherchais des défis, je cassais des trucs sans faire exprès. Un jour, je suis tombé sur le Père Ubu, énorme, en train de hurler Cornegidouille sur un pauvre tabouret. Il m’a regardé et il a dit que j’avais du cran. Boum, me voilà Palotin ! Depuis, je fonce partout, et franchement, j’adore ça !'
	},
	{
		level: 5,
		type: 'lore',
		theme: 'relation_palotins',
		text: 'Pile ? Il plane tout le temps ! Tu lui parles, il te répond trois minutes après avec une phrase bizarre. Cotice, lui, c’est l’inverse, il parle non-stop, même quand y’a rien à dire ! Moi, je suis entre les deux, j’agis ! Mais bon, on forme une bonne équipe, même si parfois j’ai envie de les secouer un peu !'
	},
	{
		level: 7,
		type: 'lore',
		theme: 'mission_ratee',
		text: 'Une fois, le Père Ubu nous a envoyé compter ses pièces d’or. Facile, non ? Bah non ! J’ai voulu aller trop vite, j’ai renversé le coffre, ça roulait partout ! Cotice essayait de les ramasser en racontant une histoire, Pile regardait les pièces comme si c’était des étoiles. Résultat, on s’est fait crier dessus pendant une heure !'
	},
	{
		level: 9,
		type: 'litteraire',
		theme: 'creation_ubu',
		text: 'Tu sais comment tout ça a commencé ? Un gars, Alfred Jarry, il avait genre 15 ans, et il s’est moqué de son prof ! Il a inventé le Père Ubu comme une grosse caricature. Et quand la pièce a été jouée en 1896, BAM, scandale direct dès le premier mot ! Les gens étaient choqués, moi j’aurais adoré voir ça !'
	},
	{
		level: 11,
		type: 'lore',
		theme: 'secret_ubu',
		text: 'Je vais te dire un truc, mais chut ! Le Père Ubu, la nuit, il parle tout seul à ses trésors. Il leur donne des noms et il leur raconte ses plans débiles. Une fois, je l’ai vu s’énerver contre une pièce qui ne brillait pas assez ! Franchement, même moi j’ai eu peur !'
	},
	{
		level: 13,
		type: 'litteraire',
		theme: 'noms_heraldiques',
		text: 'Nos noms, c’est pas du hasard ! Giron, Pile, Cotice, ça vient des blasons, les vieux symboles sur les boucliers. C’est des formes géométriques, des découpes, des lignes. Ouais, même nous on est liés aux maths ! C’est stylé, non ?'
	},
	{
		level: 15,
		type: 'lore',
		theme: 'rapport_maths',
		text: 'Les maths, au début, je pensais que c’était juste des chiffres chiants. Mais en vrai, c’est comme un combat ! T’as un problème, tu fonces dessus, tu cherches l’ouverture. Et quand ça passe, BOUM, victoire ! Franchement, j’aime bien ça maintenant !'
	},
	{
		level: 17,
		type: 'litteraire',
		theme: 'pataphysique',
		text: 'Alors là, accroche-toi ! Jarry a inventé un truc encore plus fou, la pataphysique ! C’est la science des solutions imaginaires, genre on cherche des réponses même quand ça n’a aucun sens. C’est complètement barré ! Mais bizarrement, ça colle bien avec le Père Ubu !'
	},
	{
		level: 18,
		type: 'lore',
		theme: 'souvenir_palotins',
		text: 'Un soir, on était tous les trois planqués après une mission ratée. On avait rien réussi, mais on rigolait comme des idiots ! Cotice racontait n’importe quoi, Pile regardait le ciel, et moi je lançais des cailloux. C’était nul… mais c’était parfait !'
	},
	{
		level: 20,
		type: 'lore',
		theme: 'confidence_exclusive',
		text: 'Bon, ça reste entre nous ! Des fois, je fais le malin, je fonce, je crie… mais j’ai peur de rater. Ouais, même moi ! Alors je fonce encore plus vite pour pas y penser. Et quand je réussis, même un petit truc, ça me fait un bien fou !'
	}
];

const pileAnecdotes: BuddyAnecdote[] = [
	{
		level: 3,
		type: 'lore',
		theme: 'presentation',
		text: 'Avant d’être Palotin, je passais mon temps à observer des choses inutiles, comme la façon dont la pluie dessine des motifs sur le sol. Un jour, le Père Ubu m’a trouvé allongé, en train de compter les nuages comme des nombres lents. Il a crié quelque chose de très fort, sans doute Cornegidouille, et j’ai à peine sursauté. Il a dit que j’étais étrange, donc utile, et c’est ainsi que je suis devenu Palotin, presque sans m’en rendre compte.'
	},
	{
		level: 5,
		type: 'lore',
		theme: 'relation_palotins',
		text: 'Giron est comme une flamme, toujours en mouvement, parfois trop rapide pour voir où il va, mais c’est ce qui le rend fascinant. Cotice, lui, ressemble à une conversation qui ne s’arrête jamais, pleine d’images et de rires un peu maladroits. Moi, je me tiens entre les deux, comme une pause dans une phrase. Ensemble, on fait un équilibre un peu bancal, mais étrangement solide.'
	},
	{
		level: 7,
		type: 'lore',
		theme: 'mission_ratee',
		text: 'Une fois, le Père Ubu nous a demandé de mesurer la taille de son château, ce qui me semblait déjà être une question étrange. Giron a couru partout avec une corde, Cotice comptait à voix haute sans s’arrêter, et moi, je regardais les ombres des murs qui changeaient lentement. À la fin, rien ne correspondait, pas même les chiffres entre eux. Le Père Ubu a hurlé, mais j’ai trouvé ça intéressant, comme si le château refusait d’être compris.'
	},
	{
		level: 9,
		type: 'litteraire',
		theme: 'creation_ubu',
		text: 'Tu sais, cette histoire du Père Ubu a commencé avec un élève, Alfred Jarry, qui avait à peu près ton âge, autour de 15 ans. Il a transformé son professeur en personnage ridicule, comme une sorte de rêve moqueur devenu réel. Quand la pièce a été jouée en 1896, tout a explosé dès le premier mot, « Merdre ! », et le public a été choqué. Je trouve ça beau, qu’un simple mot puisse secouer tout un théâtre.'
	},
	{
		level: 11,
		type: 'lore',
		theme: 'secret_ubu',
		text: 'Je vais te dire quelque chose que j’ai vu un soir, mais qui semble presque irréel. Le Père Ubu se regardait dans un miroir, en répétant ses cris, comme s’il cherchait la version parfaite de lui-même. Il changeait de voix, de posture, et parfois il se parlait comme à un ami. C’était étrange et un peu triste, comme un roi qui doute en secret.'
	},
	{
		level: 13,
		type: 'litteraire',
		theme: 'noms_heraldiques',
		text: 'Nos noms viennent d’un vieux langage, celui des blasons, où les formes racontent des histoires silencieuses. Un giron, une pile, une cotice, ce sont des lignes et des bandes sur des boucliers, des morceaux d’espace organisés. C’est curieux, non, que nous portions des noms de figures géométriques sans toujours y penser. Comme si même nos identités étaient dessinées avec des règles invisibles.'
	},
	{
		level: 15,
		type: 'lore',
		theme: 'rapport_maths',
		text: 'Les maths, pour moi, ne sont pas vraiment un combat, mais plutôt un paysage à explorer lentement. Chaque problème est comme un chemin qui bifurque, et il n’y a pas toujours une seule façon de le suivre. Parfois, je m’arrête juste pour regarder comment les idées s’assemblent. Et dans ces moments-là, je me sens presque tranquille.'
	},
	{
		level: 17,
		type: 'litteraire',
		theme: 'pataphysique',
		text: 'La pataphysique, c’est une idée inventée par Jarry, et elle me plaît beaucoup. Il disait que c’est la science des solutions imaginaires, ce qui signifie qu’on accepte des réponses même quand elles semblent absurdes. C’est comme si on regardait le monde à travers un miroir un peu déformant. Et quelque part, ça ressemble beaucoup à la façon dont le Père Ubu pense.'
	},
	{
		level: 18,
		type: 'lore',
		theme: 'souvenir_palotins',
		text: 'Je me souviens d’un moment où nous étions tous les trois allongés, après une longue journée sans grand succès. Giron lançait des pierres en essayant de viser la lune, Cotice racontait une histoire sans fin, et moi, je regardais les étoiles en silence. Rien d’important ne se passait, et pourtant tout semblait complet. C’était un instant simple, mais il reste dans ma mémoire comme une petite pause parfaite.'
	},
	{
		level: 20,
		type: 'lore',
		theme: 'confidence_exclusive',
		text: 'Je vais te dire quelque chose que je n’ai jamais vraiment dit. Parfois, je fais semblant de comprendre plus que je ne comprends vraiment, comme si les réponses allaient venir toutes seules. Je reste calme, je parle lentement, et ça donne l’impression que tout est clair. Mais au fond, je cherche encore, comme toi, et ça me rassure de ne pas être le seul.'
	}
];

const coticeAnecdotes: BuddyAnecdote[] = [
	{
		level: 3,
		type: 'lore',
		theme: 'presentation',
		text: 'Moi au début, j’étais partout ! Je parlais avec tout le monde, je racontais des histoires, un peu comme un pote en soirée qui lâche jamais le micro. Un jour, le Père Ubu m’a entendu expliquer un plan… qui n’avait aucun sens, mais j’étais super convaincant ! Il a crié Par ma chandelle verte et il m’a engagé direct. Depuis, je suis Palotin, et franchement, j’adore l’ambiance, même si c’est un peu n’importe quoi !'
	},
	{
		level: 5,
		type: 'lore',
		theme: 'relation_palotins',
		text: 'Giron, c’est un peu le gars qui fonce comme en sprint sans regarder la carte, mais bon, il met de l’énergie ! Pile, lui, c’est l’inverse total, il réfléchit tellement que t’as le temps de manger une pizza entière avant qu’il finisse sa phrase. Moi, je suis au milieu, je parle, je motive, je fais le lien ! Franchement, on dirait une équipe de jeu vidéo mal équilibrée, mais ça marche !'
	},
	{
		level: 7,
		type: 'lore',
		theme: 'mission_ratee',
		text: 'Une fois, le Père Ubu nous a demandé de partager un gâteau en parts égales pour ses invités. Facile, j’ai dit ! Sauf que Giron a coupé trop vite, moi j’expliquais une technique avec des parts comme des niveaux de jeu, et Pile regardait la forme du gâteau comme si c’était une planète. Résultat, des parts bizarres, des invités pas contents, et Ubu qui hurle Cornegidouille ! Franchement, même moi j’ai ri après coup !'
	},
	{
		level: 9,
		type: 'litteraire',
		theme: 'creation_ubu',
		text: 'Tu sais que tout ça vient d’un délire d’ado ? Alfred Jarry, il avait genre 15 ans, et il s’est moqué de son prof en inventant le Père Ubu ! C’est comme transformer ton prof en boss ridicule dans un jeu. Et quand la pièce est sortie en 1896, bam, scandale direct avec le mot « Merdre ! » dès le début ! Les gens étaient choqués, mais moi j’imagine l’ambiance, ça devait être incroyable !'
	},
	{
		level: 11,
		type: 'lore',
		theme: 'secret_ubu',
		text: 'Bon, ça reste entre nous, hein ! Le Père Ubu, parfois, il organise des concours… contre lui-même ! Il se donne des notes sur ses propres idées et il se déclare gagnant à chaque fois. Une fois, je l’ai vu applaudir tout seul pendant cinq minutes ! Franchement, même dans un jeu vidéo, t’as jamais vu ça !'
	},
	{
		level: 13,
		type: 'litteraire',
		theme: 'noms_heraldiques',
		text: 'Nos noms, c’est pas juste stylé, ça vient des blasons ! Giron, Pile, Cotice, c’est des formes géométriques qu’on dessinait sur les boucliers. En gros, on est des motifs vivants ! C’est un peu comme si on était des skins de personnages basés sur des formes. Avoue, c’est classe !'
	},
	{
		level: 15,
		type: 'lore',
		theme: 'rapport_maths',
		text: 'Les maths, pour moi, c’est comme une recette ou une partie de jeu ! T’as des règles, tu testes, tu ajustes, et à la fin ça marche. Parfois ça rate, comme un gâteau qui gonfle pas, mais tu recommences ! Et quand ça réussit, c’est trop satisfaisant, comme gagner une partie serrée !'
	},
	{
		level: 17,
		type: 'litteraire',
		theme: 'pataphysique',
		text: 'Alors là, accroche-toi, c’est du lourd ! Jarry a inventé la pataphysique, une science qui s’occupe des solutions imaginaires, genre des réponses qui n’existent même pas vraiment ! C’est comme inventer une règle spéciale dans un jeu juste pour voir ce que ça donne. C’est bizarre, mais ça colle parfaitement avec le délire du Père Ubu !'
	},
	{
		level: 18,
		type: 'lore',
		theme: 'souvenir_palotins',
		text: 'Un jour, on avait rien à faire, ce qui est rare ! On s’est posé tous les trois, Giron voulait lancer un défi, Pile regardait le ciel, et moi je racontais une histoire complètement absurde. On a fini par rire pendant des heures, sans raison. C’était comme une pause dans un match, mais une bonne pause !'
	},
	{
		level: 20,
		type: 'lore',
		theme: 'confidence_exclusive',
		text: 'Je vais te dire un truc, mais je le dis jamais. Je fais le mec cool, je parle, je rigole, mais des fois j’ai peur que ça marche pas. Alors je parle encore plus, je motive, je fais le pote à fond. Et quand ça marche, même un petit truc, je suis trop content pour toi… et un peu pour moi aussi.'
	}
];

export const buddyAnecdotes: Record<PalotinType, BuddyAnecdote[]> = {
	giron: gironAnecdotes,
	pile: pileAnecdotes,
	cotice: coticeAnecdotes
};
