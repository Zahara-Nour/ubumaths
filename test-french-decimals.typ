// Test file for French decimal formatting in Typst
// Compile with: typst compile test-french-decimals.typ

#set page(paper: "a4", margin: 2cm)
#set text(font: "New Computer Modern", size: 11pt, lang: "fr")

= Test des nombres décimaux français

== Principe

- `","` dans Typst = chaîne de caractères (affiche une virgule sans espacement)
- `thin` = espace fine pour grouper les chiffres
- `,` normale = séparateur d'arguments avec espacement

== Tests de base

=== Nombres décimaux simples
- Pi : $3","14159$ (attendu: 3,14159)
- Demi : $0","5$ (attendu: 0,5)
- Négatif : $-2","718$ (attendu: -2,718)

=== Avec espaces fines (groupement)
- Grand entier : $1 thin 234 thin 567$ (attendu: 1 234 567)
- Décimal complet : $1 thin 234","567 thin 8$ (attendu: 1 234,567 8)

=== Dans des expressions
- Équation : $x = 3","14 + 2","71$
- Fraction : $frac(1","5, 2) = 0","75$ (virgule string dans frac)

=== Vérification : virgule comme séparateur (doit avoir un espace)
- Coordonnées : $(a, b, c)$ -- virgule normale = séparateur avec espace

== Résultat attendu
- Nombres décimaux : virgule *sans* espace autour (via `","`)
- Séparateurs $(a, b)$ : virgule *avec* espacement normal
- Groupement : espaces fines entre groupes de 3 chiffres
