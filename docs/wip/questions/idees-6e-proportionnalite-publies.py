"""Ajoute les variations validées à 4 modèles publiés exportés de prod dans
scripts/questions/idees-6e-proportionnalite-publies/ (chantier idees-6e-proportionnalite).

Phase 0 validée par David le 2026-11-25 : F1 (e0ccaf84, +2), F2 (7981dab0, +2), F3 (52bf3fb9, +1 ;
5e4e5e9d, +1). 06df72fd (F4) est traité à part : ce script n'y touche pas. Les variations
s'ajoutent À LA FIN (les réponses des élèves gardent l'indice de leur variation) ; la migration
de contenu est générée par scripts/questions/migration-contenu.ts. Seuls `variations` et
`testSpecs` changent : ni titre, ni niveaux, ni options, ni `shared`.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) :
le relancer réécrit les ajouts sans les doubler.

Programme de 6e : linéarité et retour à l'unité, jamais de produit en croix ; échelles
graphiques seulement (« 1 cm pour … »), pas d'écriture 1/n.

Écarts à la fiche, à signaler à David :
- F1 (a) : les prix s'écrivent 7,2 € et non 7,20 € comme dans la fiche : la règle des zéros juge
  « 21,60 € » forme à améliorer (vérifié par une spec, retirée), et les options du modèle ne
  changent pas ici. Question ouverte : `constraints.zeros: off` sur ce modèle (migration-contenu
  sait changer les options ; elles jugeraient aussi les 6 variations d'origine).
- F2 (a) : un nombre de 4 chiffres (3 600) s'écrit sans espace par `${{N}}$` (règle du BIPM, dès
  5 chiffres ; le modèle n'est pas réglé « Espaces dès 4 chiffres », et ses options ne changent
  pas). L'énoncé l'écrit donc groupé à la main (`3\\,600`, NAFF) ; les réponses restent ≤ 900.
- F3 : l'échelle est dessinée (bloc ```figure : un segment de 1 unité, deux traits aux bouts,
  « 5 m » au-dessus) ET écrite dans le texte ; la figure n'a pas 1 cm à l'écran (taille d'une
  figure à l'écran), le texte le dit. Chaque terrain a son échelle (salle de classe et gymnase
  1 cm pour 2 m, cour 1 cm pour 4 m, terrain de football 1 cm pour 5 m…) pour garder des
  dimensions vraisemblables ; pas de terrain de tennis ni de handball (dimensions fixes connues :
  la réponse se devinerait sans calcul).

Pièges du lot :
- Fusion `shared` ⊕ variation : les variables de `shared` sont tirées pour toutes les variations
  (e0ccaf84 a a, b, c partagées) : on prend d'autres noms. `conditions` est remplacé en bloc.
- Une erreur prévue qui tombe sur la bonne réponse d'un tirage est ignorée ; deux erreurs prévues
  de même valeur sur un tirage se gênent : les conditions les écartent (calculées en entiers).
- 52bf3fb9 a `options.constraints.unit = "off"` et un `shared.statement` : la variation donne son
  propre `statement`. Une erreur prévue « mauvaise unité » s'écrit avec son unité (`8.6\\unit{cm}`).
- `{{if:}}` dans une variable : un seul niveau ; ici les choix à plusieurs valeurs passent par des
  indicatrices dans `eval:` (SEL).

Usage : python3 docs/wip/questions/idees-6e-proportionnalite-publies.py scripts/questions/idees-6e-proportionnalite-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-25)
ORIGINE = {'e0ccaf84': (6, 9), '7981dab0': (2, 8), '52bf3fb9': (6, 8), '5e4e5e9d': (6, 8)}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
	expected = {'status': status}
	if message is not None:
		# un décimal cité dans le message se résout avec un point (2.35)
		expected['expectedErrorMessage'] = message.replace('{,}', '.')
	if violations is not None:
		expected['constraintViolations'] = violations
	return {'description': desc, 'variationIndex': vi, 'variables': variables_,
			'expected': expected, 'answers': answers}


def var(nom, expression):
	return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
	return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, unite=False):
	c = {'expectedAnswer': attendue}
	if unite:
		c['unit'] = {'expected': True}
	if erreurs:
		c['expectedErrors'] = erreurs
	return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
	v = {'statement': statement, 'variables': variables, 'conditions': conditions or []}
	v['blanks'] = blanks
	v['correction'] = {'steps': steps}
	v['hint'] = hint
	return v


def couleur(contenu):
	return PRIMAIRE + '{' + contenu + '}'


def sel(v, valeurs):
	"""Expression qui vaut valeurs[k] quand v == k (indicatrices : `eval` ne connaît pas `==`)."""
	return '+'.join(f'{x}*(1-min(abs({v}-{k}),1))' for k, x in enumerate(valeurs))


def selon(v, textes, k=0):
	"""`{{if:v==0|…|{{if:v==1|…|…}}}}` : le texte numéro v (dans un énoncé, pas une variable)."""
	if k == len(textes) - 1:
		return textes[k]
	return '{{if:' + v + '==' + str(k) + '|' + textes[k] + '|' + selon(v, textes, k + 1) + '}}'


def euros(nombre_dixiemes):
	"""Prix en euros écrit à partir de son nombre de dixièmes : 7,2 (pas 7,20, cf. en-tête)."""
	return '{{eval:' + nombre_dixiemes + '/10;d}}'


def ajouter(court, variations, specs):
	chemin = os.path.join(DOSSIER, court + '.json')
	with open(chemin, encoding='utf-8') as f:
		m = json.load(f)
	nv, ns = ORIGINE[court]
	m['variations'] = m['variations'][:nv]
	m['testSpecs'] = m['testSpecs'][:ns]
	for s in specs:
		s['variationIndex'] += nv
	m['variations'] += variations
	m['testSpecs'] += specs
	with open(chemin, 'w', encoding='utf-8') as f:
		json.dump(m, f, ensure_ascii=False, indent='\t')
		f.write('\n')
	print(f'{court} : {nv} + {len(variations)} variations, {ns} + {len(specs)} specs')


# =============================================================================================
# e0ccaf84 — petit exercice de proportionnalité (6-191). F1 : (a) masses au dixième, on
# multiplie (1,2 kg à 7,2 € → 3,6 kg) ; (b) on connaît la grande quantité, on divise (12 kg à
# 30 € → 4 kg). Noms t, u, k, x, y, p / s, h, G, r, P (a, b, c sont partagés).
# =============================================================================================

# (a) masse de départ x = t/10 (0,5 à 3 kg, jamais entière), prix au kilogramme u euros,
# coefficient k. En centièmes d'euro : juste 10tuk ; écart ajouté 10tu + 10t(k−1) ; virgule
# décalée 100tuk ; prix × nouvelle masse t²uk.
F1_MULT = variation(
	'${{x}}\\,\\text{kg}$ de cerises coûtent $' + euros('t*u') + '\\,€$. Combien coûtent '
	'${{y}}\\,\\text{kg}$ de cerises ?\n\n${{y}}\\,\\text{kg}$ de cerises coûtent $?$.',
	[var('t', '5..30'), var('u', '2..9'), var('k', '2..5'), var('x', 'eval:t/10;d'),
	 var('y', 'eval:t*k/10;d')],
	[case('{{eval:t*u*k/10;d}}\\unit{€}', [
		erreur('{{eval:(t*u+t*(k-1))/10;d}}\\unit{€}',
			   'Le prix n\'augmente pas de l\'écart des masses : cherche par combien la masse est '
			   'multipliée.', 'Écart des masses ajouté au prix'),
		erreur('{{eval:t*u*k;d}}\\unit{€}',
			   'Vérifie la place de la virgule dans ton produit.', 'Virgule mal placée'),
		erreur('{{eval:t*t*u*k/100;d}}\\unit{€}',
			   'On ne multiplie pas le prix par la nouvelle masse : cherche combien de fois '
			   '${{x}}$ kg il y a dans ${{y}}$ kg.', 'Prix multiplié par la masse'),
	], unite=True)],
	[
		'${{y}}\\,\\text{kg}$ de cerises, c\'est $' + couleur('{{k}}\\text{ fois}') + '$ plus que '
		'${{x}}\\,\\text{kg}$, car ${{x}} \\times {{k}} = {{y}}$. Le prix est donc lui aussi '
		'multiplié par ${{k}}$ : $' + euros('t*u') + '\\,€ ' + couleur('\\times {{k}}') + ' = '
		+ couleur(euros('t*u*k') + '\\,€') + '$.',
	],
	'Par combien faut-il multiplier ${{x}}$ kg pour obtenir ${{y}}$ kg ? Fais de même avec le '
	'prix.',
	['mod(t,10)!=0', '10*t*u+10*t*(k-1)!=t*t*u*k', '100*t*u*k!=t*t*u*k',
	 '10*t*u+10*t*(k-1)!=100*t*u*k'],
)

# (b) petite masse s kg à r = h/10 euros (jamais entier), grande masse G = s·k à P = r·k. En
# dixièmes d'euro : juste h ; multiplié hk² ; écart retranché hk − 10s(k−1) (positif) ; virgule
# décalée 10h. Ces valeurs sont distinctes dès que h n'est pas un multiple de 10.
F1_DIV = variation(
	'${{G}}\\,\\text{kg}$ de pommes coûtent $' + euros('h*k') + '\\,€$. Combien '
	'{{if:s==1|coûte|coûtent}} ${{s}}\\,\\text{kg}$ de pommes ?\n\n${{s}}\\,\\text{kg}$ de pommes '
	'{{if:s==1|coûte|coûtent}} $?$.',
	[var('s', '1..6'), var('k', '2..5'), var('h', '11..99'), var('G', 'eval:s*k')],
	[case('{{eval:h/10;d}}\\unit{€}', [
		erreur('{{eval:h*k*k/10;d}}\\unit{€}',
			   'Ici la masse diminue : ${{s}}$ kg, c\'est moins que ${{G}}$ kg, donc le prix est '
			   'plus petit.', 'Multiplication au lieu de division'),
		erreur('{{eval:(h*k-10*s*(k-1))/10;d}}\\unit{€}',
			   'Le prix ne baisse pas de l\'écart des masses : cherche par combien la masse est '
			   'divisée.', 'Écart des masses retranché au prix'),
		erreur('{{eval:h;d}}\\unit{€}',
			   'Vérifie la place de la virgule dans ta division.', 'Virgule mal placée'),
	], unite=True)],
	[
		'${{s}}\\,\\text{kg}$ de pommes, c\'est $' + couleur('{{k}}\\text{ fois}') + '$ moins que '
		'${{G}}\\,\\text{kg}$, car ${{G}} \\div {{k}} = {{s}}$. Le prix est donc lui aussi divisé '
		'par ${{k}}$ : $' + euros('h*k') + '\\,€ ' + couleur('\\div {{k}}') + ' = '
		+ couleur(euros('h') + '\\,€') + '$.',
	],
	'Par combien faut-il diviser ${{G}}$ kg pour obtenir ${{s}}$ kg ? Fais de même avec le prix.',
	['mod(h,10)!=0', 'h*k>10*s*(k-1)'],
)

V_CERISES = {'t': '12', 'u': '6', 'k': '3', 'x': '1.2', 'y': '3.6'}
V_POMMES = {'s': '4', 'k': '3', 'h': '99', 'G': '12'}
SPECS_E0C = [
	spec('F1 masses : 1,2 kg à 7,2 €, 3,6 kg → 21,6 €', 0, V_CERISES, 'correct', ['21{,}6\\,€']),
	spec('F1 masses : sans unité', 0, V_CERISES, 'incorrect', ['21{,}6']),
	spec('F1 masses : écart ajouté (9,6 €)', 0, V_CERISES, 'incorrect', ['9{,}6\\,€'],
		 'Le prix n\'augmente pas de l\'écart des masses : cherche par combien la masse est '
		 'multipliée.'),
	spec('F1 masses : virgule (216 €)', 0, V_CERISES, 'incorrect', ['216\\,€'],
		 'Vérifie la place de la virgule dans ton produit.'),
	spec('F1 masses : prix × masse (25,92 €)', 0, V_CERISES, 'incorrect', ['25{,}92\\,€'],
		 'On ne multiplie pas le prix par la nouvelle masse : cherche combien de fois $1{,}2$ kg '
		 'il y a dans $3{,}6$ kg.'),
	spec('F1 diviser : 12 kg à 29,7 €, 4 kg → 9,9 €', 1, V_POMMES, 'correct', ['9{,}9\\,€']),
	spec('F1 diviser : multiplié (89,1 €)', 1, V_POMMES, 'incorrect', ['89{,}1\\,€'],
		 'Ici la masse diminue : $4$ kg, c\'est moins que $12$ kg, donc le prix est plus petit.'),
	spec('F1 diviser : écart retranché (21,7 €)', 1, V_POMMES, 'incorrect', ['21{,}7\\,€'],
		 'Le prix ne baisse pas de l\'écart des masses : cherche par combien la masse est '
		 'divisée.'),
	spec('F1 diviser : virgule (99 €)', 1, V_POMMES, 'incorrect', ['99\\,€'],
		 'Vérifie la place de la virgule dans ta division.'),
	spec('F1 diviser : 1 kg à 2,4 € de 2 kg à 4,8 €', 1,
		 {'s': '1', 'k': '2', 'h': '24', 'G': '2'}, 'correct', ['2{,}4\\,€']),
]


# =============================================================================================
# 7981dab0 — double, moitié, quadruple, quart, tiers (6-211). F2 : (a) le tiers ou le quart d'un
# nombre à zéros (30a, 300a, 40a, 400a) ; (b) le tiers de 12,09, le quart de 20,16 (un 0 au
# quotient) ou le quart d'un entier non multiple de 4 (9 → 2,25).
# =============================================================================================

QUOI = '{{if:f==3|tiers|quart}}'
RANGS = '{{if:z==1|dizaines|centaines}}'
# N écrit avec l'espace des milliers (`${{N}}$` n'en met pas avant 5 chiffres) ; N ≥ 1 000
# seulement pour z = 2, donc N est un nombre de centaines
NAFF = '{{if:N>=1000|{{eval:floor(N/1000)}}\\,{{eval:mod(N,1000)/100}}00|{{N}}}}'
RELATIONS = ('**Le tiers, le quart.** Le tiers : $\\div 3$ ; le quart : $\\div 4$.')

F2_ENTIERS = variation(
	'Complète.\n\n$$\\text{Le ' + QUOI + ' de } ' + NAFF + ' \\text{ est } ?$$',
	[var('f', '3|4'), var('z', '1|2'), var('a', '2..9'), var('N', 'eval:f*a*10^z'),
	 var('R', 'eval:a*10^z')],
	[case('{{R}}', [
		erreur('{{eval:N/2}}', 'Tu as calculé la moitié : le ' + QUOI + ', c\'est diviser par '
			   '${{f}}$.', 'Moitié au lieu du ' + QUOI),
		erreur('{{eval:N*f}}', 'Le ' + QUOI + ' est plus petit que le nombre de départ : on '
			   'divise par ${{f}}$, on ne multiplie pas.', 'Multiplication au lieu de division'),
		erreur('{{eval:R/10}}', 'Il manque un zéro : le nombre de départ, c\'est ${{eval:f*a}}$ '
			   + RANGS + ', et son ' + QUOI + ' est un nombre de ' + RANGS + '.', 'Zéro oublié'),
	])],
	[
		RELATIONS,
		'$' + NAFF + '$, c\'est ${{eval:f*a}}$ ' + RANGS + ' : ${{eval:f*a}} \\div {{f}} = '
		'{{a}}$, donc le ' + QUOI + ' est ${{a}}$ ' + RANGS + '.',
		'$$' + NAFF + ' \\div {{f}} = ' + couleur('{{R}}') + '$$',
	],
	'Le ' + QUOI + ', c\'est diviser par ${{f}}$. Pense à $' + NAFF + '$ comme à ${{eval:f*a}}$ '
	+ RANGS + '.',
)

# (b) g = 0 : tiers de 3a + 0,03b ; g = 1 : quart de 4a + 0,04b ; g = 2 : quart de n (9 à 39,
# pas un multiple de 4). s = 1 pour g = 2. Le chiffre des dixièmes de 0,0f·b (≤ 3) est plus petit
# que f : il y a toujours un 0 aux dixièmes du quotient (4,03 ; 5,04).
XE = '((1-s)*f*(100*a+b)/100+s*n)'
QUOI_B = '{{if:f==3|tiers|quart}}'
F2_DECIMAUX = variation(
	'Complète. Donne le résultat en écriture décimale.\n\n$$\\text{Le ' + QUOI_B + ' de } {{X}} '
	'\\text{ est } ?$$',
	[var('g', '0..2'), var('a', '2..9'), var('b', '1..9'), var('n', '9..39'),
	 var('s', 'eval:floor(g/2)'), var('f', 'eval:3+min(g,1)'), var('X', 'eval:' + XE + ';d'),
	 var('R', 'eval:(1-s)*(100*a+b)/100+s*n/4;d')],
	[case('{{R}}', [
		erreur('{{eval:' + XE + '/2;d}}', 'Tu as calculé la moitié : le ' + QUOI_B + ', c\'est '
			   'diviser par ${{f}}$.', 'Moitié au lieu du ' + QUOI_B),
		erreur('{{eval:' + XE + '*f;d}}', 'Le ' + QUOI_B + ' est plus petit que le nombre de '
			   'départ : on divise par ${{f}}$, on ne multiplie pas.',
			   'Multiplication au lieu de division'),
		erreur('{{eval:(1-s)*(10*a+b)/10+s*(floor(n/4)+mod(n,4)/10);d}}',
			   '{{if:s==1|Le reste de la division n\'est pas la partie décimale : continue la '
			   'division après la virgule.|Il manque un zéro au quotient : quand un chiffre ne '
			   'contient pas ${{f}}$, on écrit $0$ au quotient.}}',
			   'Reste lu comme une partie décimale, ou zéro oublié'),
	])],
	[
		RELATIONS,
		'{{if:s==1|On pose la division ${{n}} \\div 4$ et on la continue après la virgule : '
		'${{n}} = 4 \\times {{eval:floor(n/4)}} + {{eval:mod(n,4)}}$, puis ${{eval:mod(n,4)}} '
		'\\div 4 = {{eval:mod(n,4)/4;d}}$.|${{X}} = {{eval:f*a}} + {{eval:f*b/100;d}}$ : le '
		+ QUOI_B + ' de ${{eval:f*a}}$ est ${{a}}$, celui de ${{eval:f*b/100;d}}$ est '
		'${{eval:b/100;d}}$.}}',
		'$${{X}} \\div {{f}} = ' + couleur('{{R}}') + '$$',
	],
	'{{if:s==1|Pose la division ${{n}} \\div 4$ : quand il reste quelque chose, continue après '
	'la virgule.|Pose la division ${{X}} \\div {{f}}$ : quand un chiffre ne contient pas ${{f}}$, '
	'écris $0$ au quotient.}}',
	['mod(n,4)!=0'],
)

V_2100 = {'f': '3', 'z': '2', 'a': '7', 'N': '2100', 'R': '700'}
V_360 = {'f': '4', 'z': '1', 'a': '9', 'N': '360', 'R': '90'}
V_1209 = {'g': '0', 'a': '4', 'b': '3', 'n': '9', 's': '0', 'f': '3', 'X': '12.09', 'R': '4.03'}
V_2016 = {'g': '1', 'a': '5', 'b': '4', 'n': '9', 's': '0', 'f': '4', 'X': '20.16', 'R': '5.04'}
V_9 = {'g': '2', 'a': '4', 'b': '3', 'n': '9', 's': '1', 'f': '4', 'X': '9', 'R': '2.25'}
SPECS_798 = [
	spec('F2 entiers : le tiers de 2 100 = 700', 0, V_2100, 'correct', ['700']),
	spec('F2 entiers : moitié (1 050)', 0, V_2100, 'incorrect', ['1050'],
		 'Tu as calculé la moitié : le tiers, c\'est diviser par $3$.'),
	spec('F2 entiers : multiplié (6 300)', 0, V_2100, 'incorrect', ['6300'],
		 'Le tiers est plus petit que le nombre de départ : on divise par $3$, on ne multiplie '
		 'pas.'),
	spec('F2 entiers : zéro oublié (70)', 0, V_2100, 'incorrect', ['70'],
		 'Il manque un zéro : le nombre de départ, c\'est $21$ centaines, et son tiers est un '
		 'nombre de centaines.'),
	spec('F2 entiers : le quart de 360 = 90', 0, V_360, 'correct', ['90']),
	spec('F2 entiers : quart, zéro oublié (9)', 0, V_360, 'incorrect', ['9'],
		 'Il manque un zéro : le nombre de départ, c\'est $36$ dizaines, et son quart est un '
		 'nombre de dizaines.'),
	spec('F2 décimaux : le tiers de 12,09 = 4,03', 1, V_1209, 'correct', ['4{,}03']),
	spec('F2 décimaux : zéro oublié (4,3)', 1, V_1209, 'incorrect', ['4{,}3'],
		 'Il manque un zéro au quotient : quand un chiffre ne contient pas $3$, on écrit $0$ au '
		 'quotient.'),
	spec('F2 décimaux : moitié (6,045)', 1, V_1209, 'incorrect', ['6{,}045'],
		 'Tu as calculé la moitié : le tiers, c\'est diviser par $3$.'),
	spec('F2 décimaux : multiplié (36,27)', 1, V_1209, 'incorrect', ['36{,}27'],
		 'Le tiers est plus petit que le nombre de départ : on divise par $3$, on ne multiplie '
		 'pas.'),
	spec('F2 décimaux : le quart de 20,16 = 5,04', 1, V_2016, 'correct', ['5{,}04']),
	spec('F2 décimaux : le quart de 9 = 2,25', 1, V_9, 'correct', ['2{,}25']),
	spec('F2 décimaux : reste lu comme décimale (2,1)', 1, V_9, 'incorrect', ['2{,}1'],
		 'Le reste de la division n\'est pas la partie décimale : continue la division après la '
		 'virgule.'),
]


# =============================================================================================
# 52bf3fb9 (longueur réelle) et 5e4e5e9d (longueur sur une carte) — 6-193. F3 : échelle
# graphique « 1 cm pour 2, 4 ou 5 m », un rectangle, deux cases (longueur, largeur). Chaque
# terrain a son échelle, pour des dimensions vraisemblables.
# =============================================================================================

ECHELLE = (
	'Voici l\'échelle d\'un plan : le segment ci-dessous mesure $1$ cm sur le plan et '
	'représente ${{ech}}$ m dans la réalité.\n\n```figure\nfenetre: -0.5 ; 1.5 ; -0.4 ; 0.6\n'
	'taille: petite\ndescription: Échelle graphique : un segment de 1 cm marqué {{ech}} m.\n---\n'
	'A = point(0, 0, visible=faux)\nB = point(1, 0, visible=faux)\n'
	'segment(A, B, epaisseur=3)\n'
	'A1 = point(0, -0.1, visible=faux)\nA2 = point(0, 0.1, visible=faux)\n'
	'segment(A1, A2, epaisseur=3)\n'
	'B1 = point(1, -0.1, visible=faux)\nB2 = point(1, 0.1, visible=faux)\n'
	'segment(B1, B2, epaisseur=3)\n'
	'texte(0.5, 0.35, "{{ech}} m")\n```\n\n'
)

# 52bf3fb9 : o = 0 salle de classe (1 cm pour 2 m), 1 gymnase (2 m), 2 cour de récréation (4 m),
# 3 terrain de football (5 m). Plan en dixièmes de cm : xl × xw.
OBJ_R = ['une salle de classe', 'un gymnase', 'une cour de récréation', 'un terrain de football']
F3_REEL = variation(
	ECHELLE + 'Sur ce plan, ' + selon('o', OBJ_R) + ' rectangulaire mesure ${{pl}}$ cm de long '
	'et ${{pw}}$ cm de large. Calcule ses dimensions réelles.\n\nLongueur réelle : $?$\n\n'
	'Largeur réelle : $?$',
	[var('o', '0..3'), var('ech', 'eval:' + sel('o', [2, 2, 4, 5])),
	 var('xl', '{{eval:' + sel('o', [35, 150, 80, 180]) + '}}..{{eval:'
		 + sel('o', [50, 220, 120, 240]) + '}}'),
	 var('xw', '{{eval:' + sel('o', [25, 90, 50, 100]) + '}}..{{eval:'
		 + sel('o', [34, 130, 70, 140]) + '}}'),
	 var('pl', 'eval:xl/10;d'), var('pw', 'eval:xw/10;d'),
	 var('rl', 'eval:ech*xl/10;d'), var('rw', 'eval:ech*xw/10;d')],
	[
		case('{{rl}}\\unit{m}', [
			erreur('{{eval:xl/(10*ech);d}}\\unit{m}', 'La longueur réelle est plus grande que sur le '
				   'plan : chaque centimètre du plan représente ${{ech}}$ m.',
				   'Division au lieu de multiplication'),
			erreur('{{rl}}\\unit{cm}', 'Vérifie l\'unité : sur le plan, $1$ cm représente ${{ech}}$ '
				   'm, pas ${{ech}}$ cm.', 'Mauvaise unité'),
			erreur('{{rw}}\\unit{m}', 'Tu as donné la largeur : la longueur est le plus grand côté '
				   'du rectangle.', 'Longueur et largeur échangées'),
		], unite=True),
		case('{{rw}}\\unit{m}', [
			erreur('{{eval:xw/(10*ech);d}}\\unit{m}', 'La largeur réelle est plus grande que sur le '
				   'plan : chaque centimètre du plan représente ${{ech}}$ m.',
				   'Division au lieu de multiplication'),
			erreur('{{rw}}\\unit{cm}', 'Vérifie l\'unité : sur le plan, $1$ cm représente ${{ech}}$ '
				   'm, pas ${{ech}}$ cm.', 'Mauvaise unité'),
			erreur('{{rl}}\\unit{m}', 'Tu as donné la longueur : la largeur est le plus petit côté '
				   'du rectangle.', 'Longueur et largeur échangées'),
		], unite=True),
	],
	[
		'**Échelle.** Sur le plan, $1$ cm représente ${{ech}}$ m dans la réalité : chaque longueur '
		'du plan, en centimètres, est multipliée par ${{ech}}$ pour obtenir la longueur réelle, en '
		'mètres.',
		'$${{pl}} \\times {{ech}} = ' + couleur('{{rl}}~\\text{m}') + ' \\qquad {{pw}} \\times {{ech}} '
		'= ' + couleur('{{rw}}~\\text{m}') + '$$',
		'Dans la réalité, le rectangle mesure ${{rl}}$ m de long et ${{rw}}$ m de large.',
	],
	'Chaque centimètre du plan représente ${{ech}}$ m dans la réalité : combien de mètres '
	'représentent ${{pl}}$ cm ?',
	['10*xw<=8*xl'],
)

V_CLASSE = {'o': '0', 'ech': '2', 'xl': '43', 'xw': '31', 'pl': '4.3', 'pw': '3.1', 'rl': '8.6',
			'rw': '6.2'}
V_FOOT = {'o': '3', 'ech': '5', 'xl': '213', 'xw': '128', 'pl': '21.3', 'pw': '12.8',
		  'rl': '106.5', 'rw': '64'}
M_UNITE = 'Vérifie l\'unité : sur le plan, $1$ cm représente $2$ m, pas $2$ cm.'
SPECS_52B = [
	spec('F3 réel : 4,3 cm × 3,1 cm (1 cm pour 2 m) → 8,6 m × 6,2 m', 0, V_CLASSE, 'correct',
		 ['8{,}6~\\unit{m}', '6{,}2~\\unit{m}']),
	spec('F3 réel : en centimètres (860 cm, 620 cm)', 0, V_CLASSE, 'correct',
		 ['860~\\unit{cm}', '620~\\unit{cm}']),
	spec('F3 réel : sans unité', 0, V_CLASSE, 'incorrect', ['8{,}6', '6{,}2']),
	spec('F3 réel : longueur divisée (2,15 m)', 0, V_CLASSE, 'incorrect',
		 ['2{,}15~\\unit{m}', '6{,}2~\\unit{m}'],
		 'La longueur réelle est plus grande que sur le plan : chaque centimètre du plan '
		 'représente $2$ m.'),
	spec('F3 réel : largeur divisée (1,55 m)', 0, V_CLASSE, 'incorrect',
		 ['8{,}6~\\unit{m}', '1{,}55~\\unit{m}'],
		 'La largeur réelle est plus grande que sur le plan : chaque centimètre du plan '
		 'représente $2$ m.'),
	spec('F3 réel : longueur en cm (8,6 cm)', 0, V_CLASSE, 'incorrect',
		 ['8{,}6~\\unit{cm}', '6{,}2~\\unit{m}'], M_UNITE),
	spec('F3 réel : largeur en cm (6,2 cm)', 0, V_CLASSE, 'incorrect',
		 ['8{,}6~\\unit{m}', '6{,}2~\\unit{cm}'], M_UNITE),
	spec('F3 réel : largeur à la place de la longueur', 0, V_CLASSE, 'incorrect',
		 ['6{,}2~\\unit{m}', '6{,}2~\\unit{m}'],
		 'Tu as donné la largeur : la longueur est le plus grand côté du rectangle.'),
	spec('F3 réel : longueur à la place de la largeur', 0, V_CLASSE, 'incorrect',
		 ['8{,}6~\\unit{m}', '8{,}6~\\unit{m}'],
		 'Tu as donné la longueur : la largeur est le plus petit côté du rectangle.'),
	spec('F3 réel : football 21,3 cm × 12,8 cm (1 cm pour 5 m)', 0, V_FOOT, 'correct',
		 ['106{,}5~\\unit{m}', '64~\\unit{m}']),
]

# 5e4e5e9d : o = 0 gymnase (1 cm pour 2 m), 1 cour de récréation (4 m), 2 terrain de football
# (5 m), 3 parking (4 m). Dimensions réelles = e × (kl, kw), plan entier en cm.
OBJ_P = ['Un gymnase', 'Une cour de récréation', 'Un terrain de football', 'Un parking']
F3_PLAN = variation(
	ECHELLE + selon('o', OBJ_P) + ' rectangulaire mesure ${{rl}}$ m de long et ${{rw}}$ m de '
	'large. Calcule ses dimensions sur le plan, en centimètres.\n\nLongueur sur le plan : $?$ cm.'
	'\n\nLargeur sur le plan : $?$ cm.',
	[var('o', '0..3'), var('ech', 'eval:' + sel('o', [2, 4, 5, 4])),
	 var('kl', '{{eval:' + sel('o', [15, 8, 18, 10]) + '}}..{{eval:'
		 + sel('o', [22, 12, 24, 15]) + '}}'),
	 var('kw', '{{eval:' + sel('o', [9, 5, 10, 5]) + '}}..{{eval:'
		 + sel('o', [13, 7, 14, 8]) + '}}'),
	 var('rl', 'eval:ech*kl'), var('rw', 'eval:ech*kw')],
	[
		case('{{kl}}', [
			erreur('{{eval:ech*rl}}', 'Sur le plan, la longueur est plus petite que dans la '
				   'réalité : chaque centimètre du plan représente ${{ech}}$ m.',
				   'Multiplication au lieu de division'),
			erreur('{{eval:100*kl}}', 'Tu as converti ${{rl}}$ m en centimètres : l\'échelle '
				   'compare des centimètres du plan à des mètres réels, compte les paquets de '
				   '${{ech}}$ m.', 'Longueur réelle convertie en centimètres'),
			erreur('{{kw}}', 'Tu as donné la largeur : la longueur est le plus grand côté du '
				   'rectangle.', 'Longueur et largeur échangées'),
		]),
		case('{{kw}}', [
			erreur('{{eval:ech*rw}}', 'Sur le plan, la largeur est plus petite que dans la '
				   'réalité : chaque centimètre du plan représente ${{ech}}$ m.',
				   'Multiplication au lieu de division'),
			erreur('{{eval:100*kw}}', 'Tu as converti ${{rw}}$ m en centimètres : l\'échelle '
				   'compare des centimètres du plan à des mètres réels, compte les paquets de '
				   '${{ech}}$ m.', 'Largeur réelle convertie en centimètres'),
			erreur('{{kl}}', 'Tu as donné la longueur : la largeur est le plus petit côté du '
				   'rectangle.', 'Longueur et largeur échangées'),
		]),
	],
	[
		'**Échelle.** Sur le plan, $1$ cm représente ${{ech}}$ m dans la réalité : on cherche '
		'combien de fois ${{ech}}$ m il y a dans chaque dimension réelle.',
		'$${{rl}} \\div {{ech}} = ' + couleur('{{kl}}') + ' \\qquad {{rw}} \\div {{ech}} = '
		+ couleur('{{kw}}') + '$$',
		'Sur le plan, le rectangle mesure ${{kl}}$ cm de long et ${{kw}}$ cm de large.',
	],
	'Chaque centimètre du plan représente ${{ech}}$ m : combien de fois ${{ech}}$ m y a-t-il dans '
	'${{rl}}$ m ?',
)

V_COUR = {'o': '1', 'ech': '4', 'kl': '11', 'kw': '6', 'rl': '44', 'rw': '24'}
SPECS_5E4 = [
	spec('F3 plan : 44 m × 24 m (1 cm pour 4 m) → 11 cm × 6 cm', 0, V_COUR, 'correct',
		 ['11', '6']),
	spec('F3 plan : longueur multipliée (176)', 0, V_COUR, 'incorrect', ['176', '6'],
		 'Sur le plan, la longueur est plus petite que dans la réalité : chaque centimètre du '
		 'plan représente $4$ m.'),
	spec('F3 plan : largeur multipliée (96)', 0, V_COUR, 'incorrect', ['11', '96'],
		 'Sur le plan, la largeur est plus petite que dans la réalité : chaque centimètre du '
		 'plan représente $4$ m.'),
	spec('F3 plan : longueur convertie (1 100)', 0, V_COUR, 'incorrect', ['1100', '6'],
		 'Tu as converti $44$ m en centimètres : l\'échelle compare des centimètres du plan à des '
		 'mètres réels, compte les paquets de $4$ m.'),
	spec('F3 plan : largeur à la place de la longueur', 0, V_COUR, 'incorrect', ['6', '6'],
		 'Tu as donné la largeur : la longueur est le plus grand côté du rectangle.'),
	spec('F3 plan : longueur à la place de la largeur', 0, V_COUR, 'incorrect', ['11', '11'],
		 'Tu as donné la longueur : la largeur est le plus petit côté du rectangle.'),
	spec('F3 plan : football 110 m × 60 m (1 cm pour 5 m) → 22 cm × 12 cm', 0,
		 {'o': '2', 'ech': '5', 'kl': '22', 'kw': '12', 'rl': '110', 'rw': '60'}, 'correct',
		 ['22', '12']),
]


ajouter('e0ccaf84', [F1_MULT, F1_DIV], SPECS_E0C)
ajouter('7981dab0', [F2_ENTIERS, F2_DECIMAUX], SPECS_798)
ajouter('52bf3fb9', [F3_REEL], SPECS_52B)
ajouter('5e4e5e9d', [F3_PLAN], SPECS_5E4)
