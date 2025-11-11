# Guide UI : Sélection de Cartes VIP

Guide utilisateur pour la nouvelle interface de sélection visuelle de cartes VIP dans le tableau de bord enseignant.

🆕 2025-11-11 - Interface visuelle de sélection de cartes

---

## Vue d'ensemble

L'interface de sélection de cartes VIP a été améliorée pour offrir une expérience visuelle et intuitive. Au lieu d'un menu déroulant classique, les enseignants peuvent maintenant visualiser et sélectionner les cartes VIP dans une galerie interactive.

### Avantages de la Nouvelle Interface

- **Visualisation complète** : Voir l'apparence de chaque carte avant de la sélectionner
- **Navigation intuitive** : Parcourir les cartes dans une grille responsive
- **Tri intelligent** : Les cartes les plus rares apparaissent en premier
- **Sélection rapide** : Un simple clic pour sélectionner une carte
- **Accessibilité** : Support complet du clavier et des lecteurs d'écran

---

## Comment Utiliser le Sélecteur de Cartes

### 1. État Initial (Aucune Carte Sélectionnée)

Lorsque vous créez une nouvelle récompense, vous verrez une zone cliquable avec :

- Une icône de carte en pointillés
- Le texte "Sélectionner une carte VIP"
- Une bordure en pointillés (indique qu'aucune carte n'est sélectionnée)

**Action** : Cliquez n'importe où dans cette zone pour ouvrir la galerie de cartes.

### 2. Ouverture de la Galerie

Après avoir cliqué, une fenêtre modale s'ouvre avec :

**En-tête** :

- Titre : "Sélectionner une carte VIP"
- Description : "Cliquez sur une carte pour la sélectionner. Les cartes les plus rares sont affichées en premier."

**Grille de Cartes** :

- Les cartes sont affichées dans une grille responsive
- Sur mobile : 2 colonnes
- Sur tablette : 3 colonnes
- Sur ordinateur : 4 colonnes
- Défilement vertical si beaucoup de cartes disponibles

### 3. Navigation dans les Cartes

**Tri Automatique par Rareté** :

Les cartes sont automatiquement triées par ordre de rareté décroissante :

1. **Légendaire** (violet/doré) - Les plus rares, affichées en premier
2. **Épique** (violet) - Très rares
3. **Rare** (bleu) - Rares
4. **Commune** (gris/blanc) - Les plus courantes, affichées en dernier

**Interaction avec les Cartes** :

- **Survol** : La carte s'agrandit légèrement (effet de zoom)
- **Clic** : Sélectionne la carte et ferme automatiquement la galerie
- **Clavier** :
  - Tab/Shift+Tab pour naviguer entre les cartes
  - Entrée ou Espace pour sélectionner
  - Échap pour fermer sans sélectionner

### 4. Après Sélection

Une fois une carte sélectionnée :

- La galerie se ferme automatiquement
- La carte sélectionnée s'affiche dans la zone de sélection
- La bordure devient solide (indique qu'une carte est sélectionnée)
- Vous pouvez voir tous les détails de la carte :
  - Image/artwork
  - Nom de la carte
  - Badge de rareté
  - Description (si affichée)

**Pour Changer de Carte** :

Cliquez à nouveau sur la carte affichée pour rouvrir la galerie et sélectionner une autre carte.

---

## Cas d'Usage : Tableau de Bord Récompenses

### Scénario : Créer une Récompense pour un Élève

1. **Accédez au tableau de bord récompenses**
   - Menu : Enseignant → Récompenses

2. **Créez une nouvelle récompense**
   - Cliquez sur "Créer une récompense" ou "Ajouter"

3. **Sélectionnez la carte VIP**
   - Cliquez sur la zone de sélection (bordure pointillée)
   - La galerie s'ouvre avec toutes les cartes disponibles
   - Cartes triées par rareté (légendaires en premier)

4. **Parcourez les cartes disponibles**
   - Survolez les cartes pour les prévisualiser en grand
   - Lisez les descriptions pour comprendre les effets
   - Notez la rareté (code couleur du badge)

5. **Sélectionnez votre carte**
   - Cliquez sur la carte désirée
   - La galerie se ferme automatiquement
   - La carte apparaît dans la zone de sélection

6. **Vérifiez votre sélection**
   - La carte sélectionnée est affichée avec tous ses détails
   - Si vous voulez changer, cliquez dessus pour rouvrir la galerie

7. **Finalisez la récompense**
   - Complétez les autres champs (élève, points Gidouilles, etc.)
   - Cliquez sur "Créer la récompense"

### Scénario : Modifier une Récompense Existante

1. **Ouvrez la récompense à modifier**
   - La carte actuellement sélectionnée est affichée

2. **Changez la carte VIP**
   - Cliquez sur la carte affichée
   - Galerie s'ouvre avec la carte actuelle visible
   - Sélectionnez une nouvelle carte
   - Ancienne carte remplacée automatiquement

3. **Sauvegardez les modifications**

---

## États Visuels

### Aucune Carte Disponible

Si aucune carte n'est disponible, la galerie affiche :

- Un emoji de boîte 📦
- Le message "Aucune carte disponible"

**Causes possibles** :

- Aucune carte n'a encore été créée dans le système
- Toutes les cartes ont été filtrées (par niveau, etc.)
- Problème de connexion à la base de données

**Solution** : Contactez un administrateur si ce message apparaît de manière inattendue.

### Chargement des Cartes

Pendant le chargement :

- La galerie peut afficher un indicateur de chargement
- Les cartes apparaissent progressivement

### Carte Sélectionnée

Indicateurs visuels d'une carte sélectionnée :

- Bordure solide (non pointillée)
- Affichage complet de la carte VIP
- Possibilité de survol avec effet d'agrandissement
- Au clic : réouverture de la galerie

---

## Accessibilité

### Navigation au Clavier

**Dans la Zone de Sélection** :

- `Tab` : Accéder à la zone de sélection
- `Entrée` ou `Espace` : Ouvrir la galerie

**Dans la Galerie Modale** :

- `Tab` / `Shift+Tab` : Naviguer entre les cartes
- `Entrée` ou `Espace` : Sélectionner la carte avec le focus
- `Échap` : Fermer la galerie sans sélectionner
- `Clic à l'extérieur` : Fermer la galerie sans sélectionner

### Lecteurs d'Écran

**Annonces ARIA** :

- Zone vide : "Sélectionner une carte VIP"
- Carte sélectionnée : "Carte sélectionnée : [Nom]. Cliquer pour changer"
- Chaque carte dans la galerie : "Sélectionner la carte [Nom]"

**Navigation** :

- Toutes les cartes sont accessibles au clavier
- Focus visible sur l'élément actif
- Annonce du titre et de la description de la galerie

---

## Responsive Design

### Mobile (< 768px)

- **Grille** : 2 colonnes
- **Cartes** : Taille réduite mais lisible
- **Modal** : Pleine largeur avec marges minimales
- **Défilement** : Vertical, hauteur maximale 60% de la hauteur d'écran

**Interaction Mobile** :

- Tap sur la zone de sélection pour ouvrir
- Tap sur une carte pour sélectionner
- Swipe vertical pour parcourir les cartes

### Tablette (768px - 1024px)

- **Grille** : 3 colonnes
- **Cartes** : Taille moyenne
- **Modal** : Largeur optimale pour la lecture
- **Défilement** : Confortable avec plusieurs cartes visibles

### Desktop (> 1024px)

- **Grille** : 4 colonnes
- **Cartes** : Taille complète
- **Modal** : Largeur maximale 4xl (896px)
- **Défilement** : Minimum requis, toutes les cartes souvent visibles

---

## Dépannage

### La Galerie ne s'Ouvre Pas

**Problème** : Clic sur la zone de sélection sans effet

**Solutions** :

1. Vérifiez que JavaScript est activé
2. Rafraîchissez la page (F5 ou Cmd/Ctrl + R)
3. Videz le cache du navigateur
4. Vérifiez votre connexion Internet

### Les Cartes ne S'Affichent Pas

**Problème** : Galerie ouverte mais vide (sans message "Aucune carte disponible")

**Solutions** :

1. Attendez quelques secondes (chargement)
2. Vérifiez votre connexion Internet
3. Rafraîchissez la page
4. Si le problème persiste, contactez le support technique

### La Sélection ne se Sauvegarde Pas

**Problème** : Carte sélectionnée mais disparaît après fermeture de la galerie

**Solutions** :

1. Assurez-vous de bien cliquer SUR la carte (pas à côté)
2. Attendez la fermeture complète de la galerie
3. Vérifiez que la carte apparaît bien après fermeture
4. Si le problème persiste, essayez un autre navigateur

### Les Images des Cartes ne Chargent Pas

**Problème** : Cartes affichées sans images

**Solutions** :

1. Connexion Internet lente - attendez le chargement
2. Problème de cache - videz le cache du navigateur
3. Extensions de navigateur (bloqueurs de pub) - désactivez temporairement
4. Contactez le support si toutes les images sont manquantes

---

## Conseils d'Utilisation

### Meilleure Expérience

- **Utilisez un écran large** : La grille 4 colonnes sur desktop offre la meilleure vue d'ensemble
- **Prenez le temps** : Survolez les cartes pour voir les effets de zoom avant de cliquer
- **Lisez les descriptions** : Chaque carte a des effets différents, assurez-vous de choisir la bonne
- **Vérifiez la rareté** : Les badges de couleur indiquent la rareté (légendaire = plus puissant)

### Workflow Efficace

1. **Filtre mental** : Décidez d'abord quel type de carte vous voulez (bonus points, échange, etc.)
2. **Tri automatique** : Les cartes rares sont en haut, si vous cherchez une carte commune, scrollez vers le bas
3. **Recherche visuelle** : Utilisez les couleurs et icônes pour identifier rapidement les cartes
4. **Sélection rapide** : Un seul clic suffit, pas besoin de "Valider" ou "OK"

---

## Comparaison : Ancienne vs Nouvelle Interface

### Ancienne Interface (Menu Déroulant)

```
[ Sélectionner une carte ▼ ]
  ↓ Clic
[ Bonus                    ]
[ Roue de la Fortune       ]
[ Alchimie                 ]
[ ... liste textuelle ...  ]
```

**Limitations** :

- Pas de prévisualisation visuelle
- Noms de cartes seuls (peu descriptif)
- Aucune indication de rareté
- Défilement dans un petit menu
- Difficile de comparer les cartes

### Nouvelle Interface (Galerie Visuelle)

```
┌────────────────────────────────┐
│ Sélectionner une carte VIP     │
│ Cliquez pour voir la galerie   │
├────────────────────────────────┤
│                                │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│ │Card│ │Card│ │Card│ │Card│  │
│ │  1 │ │  2 │ │  3 │ │  4 │  │
│ └────┘ └────┘ └────┘ └────┘  │
│                                │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│ │Card│ │Card│ │Card│ │Card│  │
│ │  5 │ │  6 │ │  7 │ │  8 │  │
│ └────┘ └────┘ └────┘ └────┘  │
│                                │
└────────────────────────────────┘
```

**Avantages** :

- Prévisualisation complète (image, couleur, rareté)
- Grille spacieuse et facile à parcourir
- Tri automatique par rareté
- Effet de survol pour focus
- Expérience visuelle engageante

---

## Questions Fréquentes

### Q : Puis-je encore rechercher une carte par nom ?

**R** : Non, la galerie actuelle utilise un tri par rareté. Les cartes légendaires apparaissent toujours en premier. Pour trouver une carte spécifique, scrollez dans la galerie ou mémorisez sa rareté pour la localiser plus vite.

### Q : Combien de cartes sont affichées à la fois ?

**R** : Cela dépend de votre écran :

- Mobile : 2 par ligne
- Tablette : 3 par ligne
- Desktop : 4 par ligne

Vous pouvez scroller verticalement pour voir toutes les cartes disponibles.

### Q : La galerie prend-elle beaucoup de temps à charger ?

**R** : Non. Les cartes sont optimisées et ne se chargent que lorsque vous ouvrez la galerie. Le chargement initial est très rapide (< 1 seconde sur une connexion normale).

### Q : Puis-je sélectionner plusieurs cartes en même temps ?

**R** : Non, le sélecteur permet de choisir une seule carte à la fois. Si vous avez besoin d'attribuer plusieurs cartes, créez plusieurs récompenses.

### Q : Les cartes sont-elles toujours dans le même ordre ?

**R** : Oui, les cartes sont triées de manière cohérente par rareté (légendaire → commun). Au sein d'une même rareté, l'ordre peut varier selon l'implémentation.

### Q : Que se passe-t-il si je clique en dehors de la galerie ?

**R** : La galerie se ferme sans effectuer de sélection. Si vous aviez déjà une carte sélectionnée, elle reste inchangée.

### Q : Puis-je "dé-sélectionner" une carte ?

**R** : Actuellement, non. Une fois une carte sélectionnée, vous pouvez uniquement la remplacer par une autre carte. Pour créer une récompense sans carte VIP, n'utilisez pas ce champ ou contactez un administrateur.

---

## Améliorations Futures Prévues

Les améliorations suivantes sont envisagées pour de futures versions :

- **Recherche par nom** : Barre de recherche pour filtrer les cartes par nom
- **Filtres par rareté** : Boutons pour afficher uniquement certaines raretés
- **Filtres par type d'action** : Afficher uniquement les cartes avec échange, bonus, etc.
- **Prévisualisation étendue** : Voir les détails complets de la carte au survol (tooltip)
- **Historique** : Voir les cartes récemment sélectionnées en premier
- **Favoris** : Marquer des cartes favorites pour accès rapide

---

## Support Technique

### Informations pour le Support

Si vous rencontrez un problème avec le sélecteur de cartes VIP, fournissez ces informations au support :

- **Navigateur et version** (ex: Chrome 120, Firefox 121)
- **Appareil** (Desktop, Mobile, Tablette)
- **Système d'exploitation** (Windows, macOS, iOS, Android)
- **Étapes pour reproduire** (ce que vous avez fait avant le problème)
- **Message d'erreur** (si affiché)
- **Capture d'écran** (si possible)

### Navigateurs Supportés

Le sélecteur de cartes VIP fonctionne sur :

- **Chrome/Edge** : Version 100+
- **Firefox** : Version 100+
- **Safari** : Version 15+
- **Mobile** : iOS Safari 15+, Chrome Mobile 100+

**Note** : Les versions plus anciennes peuvent fonctionner mais ne sont pas officiellement supportées.

---

## Historique des Versions

### Version 1.0 (2025-11-11)

**Fonctionnalités Initiales** :

- Sélecteur visuel de cartes VIP avec galerie modale
- Remplacement du menu déroulant MySelect
- Grille responsive (2/3/4 colonnes)
- Tri automatique par rareté
- Support clavier et accessibilité
- Effet de zoom au survol
- État vide géré ("Aucune carte disponible")

**Intégration** :

- Tableau de bord récompenses enseignant
- API de création/modification de récompenses

---

[← Retour à l'index VIP Cards](./VIP_CARDS_INDEX.md) | [← Retour aux Features](./README.md)
