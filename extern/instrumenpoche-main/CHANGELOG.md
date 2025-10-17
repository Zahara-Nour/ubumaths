Liste des changements
=====================

v 2.4
-----
* passage à webpack5 et terser5
* renommage des méthodes onXXX de IepDoc en xxx (doc.onPlay() devient doc.play(), plus logique si on l'utilise de l'extérieur, ce qui n'était jamais le cas jusqu'à maintenant donc pas vraiment un "breaking change")  
* Ajout de la doc (et rectification des sources pour que tout colle)
* iepLoader viré, on a désormais iepLoad et iepLoadPromise, plus logique, seul le premier est exporté par webpack (et c'est le 2e qui est inclus par défaut lors d'un import de ce module npm) 

v 2.3
-----
Le svg suit le div, lui-même en 100% (sauf grands écrans) pour suivre window.
Le div est resizable (coin inférieur droit), et les boutons + & - ne jouent plus que sur la viewBox (sans changer la taille du div ni du svg).
Ça règle le pb de resize en cas de bascule portrait / paysage sur tablette par ex.

* 2.3.4 On vire l'autoresize (ça marchait mal, la détection via getBBox n'est pas satisfaisante, cf commit d126569 pour une tentative avec getBoundingClientRect)
* 2.3.3 Fix déplacement de la barre d'outils qui marchait plus
* 2.3.2 Autoresize du viewBox à la création d'objet, pour agrandir le viewBox au cas où un élément déborde
* 2.3.1 div limité en largeur sur grands écrans (pour éviter un éventuel scroll, un comble quand y'a bcp de place) 
* 2.3.0 Le svg suit le div, qui est en 100%
