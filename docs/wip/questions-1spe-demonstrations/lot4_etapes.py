"""Lot 4 du chantier « questions-1spe-demonstrations » (journal § 7, D2) : une variation « étapes à
ranger » (```ranger, `signe: aucun`) par démonstration, AJOUTÉE en dernière position des 14 modèles.

Ce fichier porte le CONTENU (énoncé, étapes dans le bon ordre, corrigé) ; `lot4_ajouter.py` l'écrit
dans les JSON de `scripts/questions/1spe-demonstrations-{1,2,3}/` ; les specs (positions affichées)
sont calculées par le générateur, jamais à la main.

Règle (catalogue du bloc) : des étapes qui ne peuvent PAS permuter, chacune découle de la précédente ;
une étape interchangeable passe dans l'énoncé.
"""

CONSIGNE = "Remets les étapes de la démonstration dans l'ordre."

ETAPES = {
    # ------------------------------------------------------------------ Suites, second degré
    '1spe-demonstrations-1/01-demontrer-terme-general-arithmetique.json': {
        'intro': r"Soit $(u_n)$ une suite arithmétique de raison $r$, et $n$ un entier naturel non nul. On démontre que $u_n=u_0+nr$.",
        'etapes': [
            r"Pour tout entier naturel $k$, $u_{k+1}-u_k=r$.",
            r"On écrit cette égalité pour $k=0$, …, $k=n-1$ et on additionne : $(u_1-u_0)+\cdots+(u_n-u_{n-1})=r+\cdots+r$.",
            r"Les termes $u_1$, …, $u_{n-1}$ se simplifient, et le membre de droite compte $n$ termes : $u_n-u_0=nr$.",
            r"Donc $u_n=u_0+nr$.",
        ],
        'correction': [
            r"On part de la définition (la différence de deux termes consécutifs vaut $r$), on l'écrit $n$ fois, puis on additionne.",
            r"La somme se télescope : il reste $u_n-u_0=nr$, d'où $\textcolor{{{color:primary.0}}}{u_n=u_0+nr}$.",
        ],
    },
    '1spe-demonstrations-1/02-demontrer-terme-general-geometrique.json': {
        'intro': r"Soit $(u_n)$ une suite géométrique de premier terme $u_0\neq 0$ et de raison $q\neq 0$, et $n$ un entier naturel non nul. On démontre que $u_n=u_0q^n$.",
        'etapes': [
            r"Pour tout entier naturel $k$, $u_{k+1}=q\times u_k$ : de proche en proche, aucun terme n'est nul.",
            r"Donc pour tout entier naturel $k$, $\dfrac{u_{k+1}}{u_k}=q$.",
            r"On écrit cette égalité pour $k=0$, …, $k=n-1$ et on multiplie : $\dfrac{u_1}{u_0}\times\cdots\times\dfrac{u_n}{u_{n-1}}=q\times\cdots\times q$.",
            r"Les termes $u_1$, …, $u_{n-1}$ se simplifient : $\dfrac{u_n}{u_0}=q^n$.",
            r"Donc $u_n=u_0q^n$.",
        ],
        'correction': [
            r"Avant d'écrire un quotient $\dfrac{u_{k+1}}{u_k}$, il faut savoir que $u_k\neq 0$ : c'est la première étape.",
            r"Le produit des $n$ quotients se télescope : $\dfrac{u_n}{u_0}=q^n$, d'où $\textcolor{{{color:primary.0}}}{u_n=u_0q^n}$.",
        ],
    },
    '1spe-demonstrations-1/03-demontrer-somme-des-entiers.json': {
        'intro': "Soit $n$ un entier naturel non nul et $S=1+2+\\cdots+n$. On démontre que $S=\\dfrac{n(n+1)}{2}$. On écrit $S$ deux fois, la seconde dans l'ordre inverse :\n\n$$S=1+2+\\cdots+(n-1)+n$$\n\n$$S=n+(n-1)+\\cdots+2+1$$",
        'etapes': [
            r"On additionne ces deux égalités terme à terme : $2S=(1+n)+(2+(n-1))+\cdots+(n+1)$.",
            r"Chacune de ces sommes vaut $n+1$.",
            r"Il y a $n$ sommes, donc $2S=n(n+1)$.",
            r"Donc $S=\dfrac{n(n+1)}{2}$.",
        ],
        'correction': [
            r"L'addition terme à terme donne $n$ sommes de deux termes, toutes égales à $n+1$.",
            r"Donc $2S=n(n+1)$ et $\textcolor{{{color:primary.0}}}{S=\dfrac{n(n+1)}{2}}$.",
        ],
    },
    '1spe-demonstrations-1/04-demontrer-somme-geometrique.json': {
        'intro': r"Soit $q$ un réel différent de $1$, $n$ un entier naturel et $S=1+q+q^2+\cdots+q^n$. On démontre que $S=\dfrac{1-q^{n+1}}{1-q}$.",
        'etapes': [
            r"On multiplie chaque terme de $S$ par $q$ : $qS=q+q^2+\cdots+q^n+q^{n+1}$.",
            r"On soustrait : les termes $q$, …, $q^n$ se compensent, et $S-qS=1-q^{n+1}$.",
            r"Or $S-qS=(1-q)S$, donc $(1-q)S=1-q^{n+1}$.",
            r"Comme $q\neq 1$, $1-q\neq 0$ : $S=\dfrac{1-q^{n+1}}{1-q}$.",
        ],
        'correction': [
            r"$S$ et $qS$ ont les mêmes termes, sauf $1$ (dans $S$) et $q^{n+1}$ (dans $qS$) : leur différence vaut $1-q^{n+1}$.",
            r"On factorise par $S$, puis on divise par $1-q$, qui n'est pas nul : $\textcolor{{{color:primary.0}}}{S=\dfrac{1-q^{n+1}}{1-q}}$.",
        ],
    },
    '1spe-demonstrations-1/05-demontrer-resolution-second-degre.json': {
        'intro': r"Soit $a$, $b$ et $c$ trois réels, avec $a\neq 0$, et $\Delta=b^2-4ac$. On démontre que si $\Delta<0$, l'équation $ax^2+bx+c=0$ n'a pas de solution réelle.",
        'etapes': [
            r"Comme $a\neq 0$, l'équation équivaut à $x^2+\dfrac{b}{a}x+\dfrac{c}{a}=0$.",
            r"Elle équivaut à $\left(x+\dfrac{b}{2a}\right)^2-\dfrac{b^2}{4a^2}+\dfrac{c}{a}=0$.",
            r"Elle équivaut à $\left(x+\dfrac{b}{2a}\right)^2=\dfrac{b^2}{4a^2}-\dfrac{c}{a}$.",
            r"Elle équivaut à $\left(x+\dfrac{b}{2a}\right)^2=\dfrac{b^2-4ac}{4a^2}=\dfrac{\Delta}{4a^2}$.",
            r"Si $\Delta<0$, le membre de droite est strictement négatif, alors qu'un carré est positif ou nul : aucune solution.",
        ],
        'correction': [
            r"On divise par $a$, on fait apparaître le carré $\left(x+\dfrac{b}{2a}\right)^2$ (forme canonique), puis on isole ce carré.",
            r"Le membre de droite a le signe de $\Delta$ (car $4a^2>0$) : si $\Delta<0$, $\textcolor{{{color:primary.0}}}{\text{aucun réel n'est solution}}$.",
        ],
    },
    # ------------------------------------------------------------------ Dérivation
    '1spe-demonstrations-2/01-demontrer-equation-tangente.json': {
        'intro': r"Soit $f$ une fonction dérivable en un réel $a$, et $A(a\,;f(a))$ le point de sa courbe d'abscisse $a$. On démontre que la tangente $T$ à la courbe en $A$ a pour équation $y=f(a)+f'(a)(x-a)$.",
        'etapes': [
            r"$T$ a pour coefficient directeur $f'(a)$ : elle a une équation de la forme $y=f'(a)x+p$.",
            r"$A(a\,;f(a))$ est sur $T$ : $f(a)=f'(a)\times a+p$.",
            r"Donc $p=f(a)-f'(a)\times a$.",
            r"$T$ a pour équation $y=f'(a)x+f(a)-f'(a)\times a$.",
            r"Soit $y=f(a)+f'(a)(x-a)$.",
        ],
        'correction': [
            r"Le coefficient directeur vient de la définition de la tangente ; l'ordonnée à l'origine $p$, du point $A$.",
            r"On remplace $p$, puis on met $f'(a)$ en facteur : $\textcolor{{{color:primary.0}}}{y=f(a)+f'(a)(x-a)}$.",
        ],
    },
    '1spe-demonstrations-2/02-demontrer-racine-non-derivable-en-0.json': {
        'intro': r"Soit $f$ la fonction racine carrée, définie sur $[0\,;+\infty[$ par $f(x)=\sqrt{x}$. On démontre que $f$ n'est pas dérivable en $0$.",
        'etapes': [
            r"Pour $h>0$, le taux de variation de $f$ entre $0$ et $h$ vaut $\dfrac{f(h)-f(0)}{h}=\dfrac{\sqrt{h}}{h}$.",
            r"Comme $h=\sqrt{h}\times\sqrt{h}$, ce taux vaut $\dfrac{1}{\sqrt{h}}$.",
            r"Quand $h$ se rapproche de $0$, $\sqrt{h}$ se rapproche de $0$ : le taux $\dfrac{1}{\sqrt{h}}$ grandit sans limite.",
            r"Le taux n'a pas de limite réelle : $f$ n'est pas dérivable en $0$.",
        ],
        'correction': [
            r"On calcule le taux de variation entre $0$ et $h$, on le simplifie en $\dfrac{1}{\sqrt{h}}$, puis on regarde ce qu'il devient quand $h$ se rapproche de $0$.",
            r"Il grandit sans limite : $\textcolor{{{color:primary.0}}}{f\text{ n'est pas dérivable en }0}$.",
        ],
    },
    '1spe-demonstrations-2/03-demontrer-derivee-carre.json': {
        'intro': r"Soit $f$ la fonction carré, définie sur $\mathbb{R}$ par $f(x)=x^2$, $a$ un réel et $h$ un réel non nul. On démontre que $f'(a)=2a$.",
        'etapes': [
            r"$f(a+h)-f(a)=(a+h)^2-a^2=2ah+h^2$.",
            r"Le taux de variation vaut $\dfrac{f(a+h)-f(a)}{h}=\dfrac{2ah+h^2}{h}=2a+h$.",
            r"Quand $h$ tend vers $0$, le taux $2a+h$ tend vers $2a$.",
            r"Donc $f$ est dérivable en $a$ et $f'(a)=2a$.",
        ],
        'correction': [
            r"On développe, on simplifie le taux par $h$ (non nul), puis on fait tendre $h$ vers $0$.",
            r"Le taux tend vers $2a$ : $\textcolor{{{color:primary.0}}}{f'(a)=2a}$.",
        ],
    },
    '1spe-demonstrations-2/04-demontrer-derivee-inverse.json': {
        'intro': r"Soit $f$ la fonction inverse, définie sur $]-\infty\,;0[\,\cup\,]0\,;+\infty[$ par $f(x)=\dfrac{1}{x}$, $a$ un réel non nul et $h$ un réel non nul tel que $a+h\neq 0$. On démontre que $f'(a)=-\dfrac{1}{a^2}$.",
        'etapes': [
            r"$f(a+h)-f(a)=\dfrac{1}{a+h}-\dfrac{1}{a}=\dfrac{-h}{a(a+h)}$.",
            r"Le taux de variation vaut $\dfrac{f(a+h)-f(a)}{h}=-\dfrac{1}{a(a+h)}$.",
            r"Quand $h$ tend vers $0$, $a(a+h)$ tend vers $a^2$, non nul : le taux tend vers $-\dfrac{1}{a^2}$.",
            r"Donc $f$ est dérivable en $a$ et $f'(a)=-\dfrac{1}{a^2}$.",
        ],
        'correction': [
            r"On réduit au même dénominateur, on simplifie le taux par $h$ (non nul), puis on fait tendre $h$ vers $0$.",
            r"Le taux tend vers $-\dfrac{1}{a^2}$ : $\textcolor{{{color:primary.0}}}{f'(a)=-\dfrac{1}{a^2}}$.",
        ],
    },
    '1spe-demonstrations-2/05-demontrer-derivee-produit.json': {
        'intro': r"Soit $u$ et $v$ deux fonctions dérivables en un réel $a$, et $h$ un réel non nul. On admet que $v(a+h)$ tend vers $v(a)$ quand $h$ tend vers $0$. On démontre que $(uv)'(a)=u'(a)v(a)+u(a)v'(a)$.",
        'etapes': [
            r"On ajoute et on retranche $u(a)v(a+h)$ au numérateur $u(a+h)v(a+h)-u(a)v(a)$ du taux de variation de $uv$.",
            r"Le numérateur s'écrit $\big(u(a+h)-u(a)\big)v(a+h)+u(a)\big(v(a+h)-v(a)\big)$.",
            r"Le taux vaut $\dfrac{u(a+h)-u(a)}{h}\times v(a+h)+u(a)\times\dfrac{v(a+h)-v(a)}{h}$.",
            r"Quand $h$ tend vers $0$, ce taux tend vers $u'(a)v(a)+u(a)v'(a)$.",
            r"Donc $uv$ est dérivable en $a$ et $(uv)'(a)=u'(a)v(a)+u(a)v'(a)$.",
        ],
        'correction': [
            r"Le terme ajouté puis retranché permet de factoriser : apparaissent les taux de variation de $u$ et de $v$.",
            r"Ils tendent vers $u'(a)$ et $v'(a)$, et $v(a+h)$ vers $v(a)$ : $\textcolor{{{color:primary.0}}}{(uv)'(a)=u'(a)v(a)+u(a)v'(a)}$.",
        ],
    },
    # ------------------------------------------------------------------ Trigonométrie, produit scalaire
    '1spe-demonstrations-3/01-demontrer-cos-sin-pi-sur-4.json': {
        'intro': r"Dans un repère orthonormé d'origine $O$, soit $M$ le point du cercle trigonométrique associé au réel $\dfrac{\pi}{4}$, et $H$ son projeté orthogonal sur l'axe des abscisses : $OH=\cos\left(\dfrac{\pi}{4}\right)$, $HM=\sin\left(\dfrac{\pi}{4}\right)$ et $\widehat{HOM}=45^\circ$. On démontre que $\cos\left(\dfrac{\pi}{4}\right)=\sin\left(\dfrac{\pi}{4}\right)=\dfrac{\sqrt{2}}{2}$.",
        'etapes': [
            r"Le triangle $OHM$ est rectangle en $H$, donc $\widehat{OMH}=90^\circ-45^\circ=45^\circ$.",
            r"Il a deux angles égaux : il est isocèle en $H$, et $\cos\left(\dfrac{\pi}{4}\right)=\sin\left(\dfrac{\pi}{4}\right)$.",
            r"On note $c$ cette valeur commune. Comme $OM=1$, le théorème de Pythagore donne $c^2+c^2=1$.",
            r"Donc $c^2=\dfrac{1}{2}$.",
            r"Comme $c>0$, $c=\dfrac{\sqrt{2}}{2}$.",
        ],
        'correction': [
            r"Le triangle $OHM$ est rectangle isocèle : cosinus et sinus sont égaux, et Pythagore donne $2c^2=1$.",
            r"$c$ est positif : $\textcolor{{{color:primary.0}}}{c=\dfrac{\sqrt{2}}{2}}$.",
        ],
    },
    '1spe-demonstrations-3/02-demontrer-cos-sin-pi-sur-3.json': {
        'intro': r"Dans un repère orthonormé d'origine $O$, soit $A(1\,;0)$, $M$ le point du cercle trigonométrique associé au réel $\dfrac{\pi}{3}$, et $H$ son projeté orthogonal sur l'axe des abscisses : $OH=\cos\left(\dfrac{\pi}{3}\right)$, $HM=\sin\left(\dfrac{\pi}{3}\right)$ et $\widehat{AOM}=60^\circ$. On démontre que $\cos\left(\dfrac{\pi}{3}\right)=\dfrac{1}{2}$ et $\sin\left(\dfrac{\pi}{3}\right)=\dfrac{\sqrt{3}}{2}$.",
        'etapes': [
            r"$OA=OM=1$ : le triangle $OAM$ est isocèle en $O$.",
            r"Ses angles à la base valent $\dfrac{180^\circ-60^\circ}{2}=60^\circ$ : il est équilatéral.",
            r"Dans ce triangle équilatéral, la hauteur issue de $M$ est aussi une médiane : $H$ est le milieu de $[OA]$.",
            r"Donc $\cos\left(\dfrac{\pi}{3}\right)=OH=\dfrac{1}{2}$.",
            r"Comme $\cos^2+\sin^2=1$, $\sin\left(\dfrac{\pi}{3}\right)^2=1-\dfrac{1}{4}=\dfrac{3}{4}$.",
            r"Le sinus est positif : $\sin\left(\dfrac{\pi}{3}\right)=\dfrac{\sqrt{3}}{2}$.",
        ],
        'correction': [
            r"Le triangle $OAM$ est équilatéral : le pied $H$ de sa hauteur est le milieu de $[OA]$, d'où $\cos\left(\dfrac{\pi}{3}\right)=\dfrac{1}{2}$.",
            r"Le sinus vient ensuite de $\cos^2+\sin^2=1$ : $\textcolor{{{color:primary.0}}}{\sin\left(\dfrac{\pi}{3}\right)=\dfrac{\sqrt{3}}{2}}$.",
        ],
    },
    '1spe-demonstrations-3/03-demontrer-al-kashi.json': {
        'intro': r"Soit $ABC$ un triangle. On démontre la formule d'Al-Kashi : $BC^2=AB^2+AC^2-2\times AB\times AC\times\cos\widehat{BAC}$.",
        'etapes': [
            r"Par la relation de Chasles, $\overrightarrow{BC}=\overrightarrow{BA}+\overrightarrow{AC}=\overrightarrow{AC}-\overrightarrow{AB}$.",
            r"Donc $BC^2=\left\|\overrightarrow{AC}-\overrightarrow{AB}\right\|^2$.",
            r"En développant, $BC^2=AC^2-2\,\overrightarrow{AC}\cdot\overrightarrow{AB}+AB^2$.",
            r"Comme $\overrightarrow{AC}\cdot\overrightarrow{AB}=AC\times AB\times\cos\widehat{BAC}$, $BC^2=AB^2+AC^2-2\times AB\times AC\times\cos\widehat{BAC}$.",
        ],
        'correction': [
            r"On écrit $\overrightarrow{BC}$ avec $\overrightarrow{AB}$ et $\overrightarrow{AC}$, puis on développe son carré scalaire, comme $(a-b)^2=a^2-2ab+b^2$.",
            r"Le produit scalaire s'écrit avec le cosinus de l'angle : on obtient $\textcolor{{{color:primary.0}}}{\text{la formule d'Al-Kashi}}$.",
        ],
    },
    '1spe-demonstrations-3/04-demontrer-cercle-de-diametre.json': {
        'intro': r"Soit $A$ et $B$ deux points distincts, et $I$ le milieu de $[AB]$. On démontre que l'ensemble des points $M$ du plan tels que $\overrightarrow{MA}\cdot\overrightarrow{MB}=0$ est le cercle de diamètre $[AB]$.",
        'etapes': [
            r"Par la relation de Chasles, $\overrightarrow{MA}\cdot\overrightarrow{MB}=\left(\overrightarrow{MI}+\overrightarrow{IA}\right)\cdot\left(\overrightarrow{MI}+\overrightarrow{IB}\right)$.",
            r"Comme $\overrightarrow{IB}=-\overrightarrow{IA}$, $\overrightarrow{MA}\cdot\overrightarrow{MB}=\left(\overrightarrow{MI}+\overrightarrow{IA}\right)\cdot\left(\overrightarrow{MI}-\overrightarrow{IA}\right)=MI^2-IA^2$.",
            r"Donc $\overrightarrow{MA}\cdot\overrightarrow{MB}=0$ équivaut à $MI^2=IA^2$, soit $MI=IA=\dfrac{AB}{2}$.",
            r"L'ensemble cherché est le cercle de centre $I$ et de rayon $\dfrac{AB}{2}$ : le cercle de diamètre $[AB]$.",
        ],
        'correction': [
            r"On passe par le milieu $I$ : le produit scalaire devient $MI^2-IA^2$.",
            r"Il est nul quand $MI=\dfrac{AB}{2}$ : $M$ décrit $\textcolor{{{color:primary.0}}}{\text{le cercle de diamètre }[AB]}$.",
        ],
    },
}


def statement(court: str) -> str:
    e = ETAPES[court]
    lignes = '\n'.join(f'- {etape}' for etape in e['etapes'])
    return f"{e['intro']}\n\n{CONSIGNE}\n\n```ranger\nsigne: aucun\n{lignes}\n```"
