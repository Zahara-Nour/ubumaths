# Père Ubu Chatbot - Guide de Configuration

Ce guide vous explique comment configurer le chatbot Père Ubu dans votre application UbuMaths.

## 🎭 Présentation

Le Père Ubu est un chatbot IA avec la personnalité absurde et pataphysique du personnage créé par Alfred Jarry, adapté pour enseigner les mathématiques. Il utilise l'API Groq (gratuite) pour générer des réponses intelligentes avec un ton unique.

**Caractéristiques :**
- 👑 Personnalité absurde mais bienveillante
- 🎓 Explications mathématiques correctes avec des métaphores loufoques
- 💬 Expressions typiques : "Cornegidouille !", "Par ma chandelle verte !"
- 🌐 Accessible publiquement (pas d'authentification requise)
- 💾 Conversations éphémères (localStorage uniquement)
- 📸 **Support d'images** : Envoyez des photos de devoirs pour obtenir de l'aide (NEW!)

## 📦 Fichiers Créés

```
src/
├── lib/
│   ├── config/
│   │   └── personalities.ts          # Définition de la personnalité Père Ubu
│   └── components/
│       └── ChatBot.svelte             # Composant chatbot réutilisable
├── routes/
│   ├── (public)/
│   │   └── pere-ubu/
│   │       └── +page.svelte          # Page publique du chatbot
│   └── api/
│       └── chat/
│           └── +server.ts            # Endpoint API pour Groq
```

## 🔑 Configuration de l'API Groq

### Étape 1 : Créer un compte Groq (gratuit)

1. **Rendez-vous sur** : [https://console.groq.com](https://console.groq.com)

2. **Créez un compte gratuit** :
   - Cliquez sur "Sign Up"
   - Utilisez votre email ou connectez-vous avec Google/GitHub
   - Confirmez votre email

3. **Accédez au Dashboard** après connexion

### Étape 2 : Obtenir votre clé API

1. Dans le dashboard Groq, allez dans la section **"API Keys"**

2. Cliquez sur **"Create API Key"**

3. Donnez un nom à votre clé (par exemple : "UbuMaths Chatbot")

4. **Copiez la clé** immédiatement (elle ne sera plus visible après)
   - Format : `gsk_xxxxxxxxxxxxxxxxxxxxxxxxxx`

5. **Conservez cette clé en sécurité** - ne la partagez jamais publiquement !

### Étape 3 : Configurer votre environnement

1. Ouvrez le fichier `.env` à la racine de votre projet

2. Remplacez `your_groq_api_key_here` par votre vraie clé API :

```bash
# Groq API Configuration (for Père Ubu Chatbot)
# Get your free API key at: https://console.groq.com
GROQ_API_KEY="gsk_votre_vraie_cle_api_ici"
```

3. **Important** : Assurez-vous que `.env` est dans votre `.gitignore` pour ne pas committer votre clé !

### Étape 4 : Redémarrer le serveur de développement

Si votre serveur est déjà en cours d'exécution, redémarrez-le pour charger la nouvelle variable d'environnement :

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis relancez :
pnpm dev
```

## 🚀 Utilisation

### Accéder au Chatbot

Une fois configuré, le chatbot est accessible à l'adresse :

```
http://localhost:5173/pere-ubu
```

En production :
```
https://votre-domaine.com/pere-ubu
```

### Fonctionnalités

- **Chat en temps réel** : Posez des questions mathématiques
- **📸 Envoi d'images** :
  - Uploadez des photos de devoirs (max 4 MB par image)
  - Partagez des URLs d'images (max 20 MB)
  - Jusqu'à 5 images par message
  - Formats supportés : JPG, PNG, GIF, WebP
- **Historique local** : Les conversations sont sauvegardées dans le navigateur
- **Effacer l'historique** : Bouton de suppression dans l'en-tête
- **Auto-scroll** : Descend automatiquement aux nouveaux messages
- **Indicateur de chargement** : Animation pendant que l'IA réfléchit
- **Raccourcis clavier** :
  - `Entrée` : Envoyer le message
  - `Maj + Entrée` : Nouvelle ligne

## 🎨 Personnalisation

### Modifier la personnalité

Éditez le fichier [src/lib/config/personalities.ts](src/lib/config/personalities.ts) :

```typescript
export const personalities = {
  pereUbu: {
    systemPrompt: `Tu es le Père Ubu...`, // Modifiez le prompt ici
    name: 'Père Ubu',
    avatar: '👑', // Changez l'emoji
    description: '...'
  }
};
```

### Ajouter d'autres personnalités

Vous pouvez créer plusieurs personnalités dans le même fichier :

```typescript
export const personalities = {
  pereUbu: { /* ... */ },

  // Nouvelle personnalité
  mereUbu: {
    systemPrompt: `Tu es la Mère Ubu...`,
    name: 'Mère Ubu',
    avatar: '👸',
    description: 'La Mère Ubu, pragmatique et rusée'
  }
};
```

Puis utilisez-la dans le composant :

```svelte
<ChatBot personalityKey="mereUbu" />
```

### Personnaliser l'apparence

Le composant utilise Shadcn UI avec Tailwind CSS. Modifiez les classes dans [src/lib/components/ChatBot.svelte](src/lib/components/ChatBot.svelte).

## 🔧 Configuration Avancée

### Limites de l'API Groq (gratuit)

- **~14 400 requêtes par jour**
- **Latence** : < 1 seconde en général
- **Modèles utilisés** :
  - `llama-3.3-70b-versatile` pour le texte uniquement
  - `meta-llama/llama-4-scout-17b-16e-instruct` pour les images (vision)
- **Tokens max par réponse** : 1000 (ajustable)

### 📸 Fonctionnalité Vision (Images)

Le chatbot **détecte automatiquement** quand un message contient des images et utilise le modèle vision de Groq.

**Limites d'images :**
- **5 images maximum** par message
- **Fichiers uploadés** (base64) : 4 MB maximum par image
- **URLs d'images** : 20 MB maximum par image
- **Résolution maximale** : 33 mégapixels (ex: 6600×5000 pixels)
- **Formats supportés** : JPG, PNG, GIF, WebP

**Utilisation :**

1. **Upload depuis l'appareil** :
   - Cliquez sur l'icône 📎 (trombone)
   - Sélectionnez une ou plusieurs images
   - Les images apparaissent en aperçu
   - Ajoutez du texte (optionnel) et envoyez

2. **Partage d'URL** :
   - Cliquez sur l'icône 🔗 (lien)
   - Collez l'URL de l'image (ex: `https://example.com/photo.jpg`)
   - Cliquez sur "Ajouter"
   - Ajoutez du texte (optionnel) et envoyez

**Validation automatique :**
- ⚠️ Avertissement si le fichier est trop volumineux
- ⚠️ Avertissement si la résolution est trop élevée
- ⚠️ Erreur si le format n'est pas supporté
- ⚠️ Limite de 5 images par message

**Note importante :** Les images **ne sont pas sauvegardées** dans l'historique localStorage pour éviter de surcharger le navigateur. Seuls les messages texte sont persistés.

### Ajuster les paramètres de l'IA

Éditez [src/routes/api/chat/+server.ts](src/routes/api/chat/+server.ts) :

```typescript
// Le modèle est sélectionné automatiquement :
// - llama-3.3-70b-versatile (texte)
// - meta-llama/llama-4-scout-17b-16e-instruct (vision)

body: JSON.stringify({
  model,                 // Détecté automatiquement selon le contenu
  messages: messages,
  temperature: 0.8,      // 0.0-2.0 (plus élevé = plus créatif)
  max_tokens: 1000,      // Nombre max de tokens dans la réponse
  top_p: 1,              // Diversité de l'échantillonnage
  stream: false          // true pour streaming temps réel
})
```

### Gestion de la mémoire contextuelle

Le composant garde les **10 derniers messages** pour le contexte :

```typescript
messages: [
  { role: 'system', content: personality.systemPrompt },
  ...messages.slice(-10) // Ajustez ce nombre
]
```

## 🛡️ Sécurité et Confidentialité

### Données stockées

- **Localement** : Conversations dans `localStorage` du navigateur
- **Serveur** : Aucune donnée de conversation n'est stockée
- **Groq API** : Consulter leur [politique de confidentialité](https://groq.com/privacy-policy/)

### Recommandations

1. ⚠️ **Ne jamais committer la clé API** dans Git
2. 🔒 Gardez votre fichier `.env` sécurisé
3. 🚫 Ne partagez pas votre clé API publiquement
4. 🔄 Régénérez votre clé si elle est compromise
5. 📊 Surveillez votre usage sur le dashboard Groq

## 🐛 Dépannage

### Problème : "API key not configured"

**Solution** :
1. Vérifiez que `GROQ_API_KEY` est défini dans `.env`
2. Redémarrez le serveur de développement
3. Vérifiez que la clé commence par `gsk_`

### Problème : "Service temporairement indisponible"

**Causes possibles** :
- Clé API invalide ou expirée
- Quota gratuit dépassé
- Problème réseau avec l'API Groq

**Solutions** :
1. Vérifiez votre clé sur [console.groq.com](https://console.groq.com)
2. Consultez votre usage et limites
3. Attendez quelques minutes et réessayez

### Problème : Les messages ne s'affichent pas

**Solution** :
1. Ouvrez la console du navigateur (F12)
2. Vérifiez les erreurs JavaScript
3. Vérifiez que localStorage est activé dans votre navigateur

### Problème : L'IA répond lentement

**Causes** :
- Charge du serveur Groq
- Connexion internet lente
- Réponses très longues

**Solutions** :
- Réduisez `max_tokens` dans l'API
- Utilisez un modèle plus rapide (mais moins performant)

## 📚 Ressources

- **Documentation Groq** : [https://console.groq.com/docs](https://console.groq.com/docs)
- **Modèles disponibles** : [https://console.groq.com/docs/models](https://console.groq.com/docs/models)
- **Svelte 5 Runes** : [https://svelte.dev/docs/svelte/what-are-runes](https://svelte.dev/docs/svelte/what-are-runes)
- **Shadcn Svelte** : [https://www.shadcn-svelte.com/](https://www.shadcn-svelte.com/)

## 🎭 À propos du Père Ubu

Le Père Ubu est un personnage créé par **Alfred Jarry** en 1896 dans la pièce *Ubu Roi*. C'est une figure emblématique du théâtre de l'absurde et de la pataphysique.

**Dans cette version éducative** :
- ✅ Humour absurde et surréaliste
- ✅ Expressions loufoques mais inoffensives
- ✅ Pédagogie mathématique sérieuse
- ✅ Bienveillance malgré le grotesque
- ❌ Pas de vulgarité (contrairement à l'original)
- ❌ Pas de violence ou de contenu inapproprié

## 🎨 Rendu LaTeX en Temps Réel avec MathLive

### ✅ Fonctionnalité Implémentée

Le chatbot Père Ubu supporte maintenant le **rendu LaTeX en temps réel** ! Les expressions mathématiques sont automatiquement converties en champs MathLive pendant l'animation de frappe.

**Comment ça marche :**

1. **Le Père Ubu écrit des maths** : Dans ses réponses, il entoure les expressions mathématiques avec `$$`, par exemple `$$x^2 + y^2$$`

2. **Parsing automatique** : Un parseur LaTeX personnalisé (`src/lib/utils/latex-parser.ts`) détecte les expressions `$$...$$ ` et les sépare du texte

3. **Rendu MathLive** : Le composant `MathDisplay` (`src/lib/components/MathDisplay.svelte`) affiche :
   - Le texte normal comme du texte
   - Les expressions LaTeX comme des champs MathLive en lecture seule
   - **Intégration transparente** : Les champs MathLive ont un fond transparent, aucune bordure, et aucun effet de survol - ils se fondent parfaitement dans la bulle de message

4. **Animation fluide** : Pendant l'animation de frappe, les formules mathématiques sont rendues en temps réel au fur et à mesure que chaque caractère apparaît

**Exemples de rendu :**

Entrée du Père Ubu :
```
"Cornegidouille ! La formule $$a^2 + b^2 = c^2$$ est fondamentale !"
```

Ce que l'utilisateur voit :
- "Cornegidouille ! La formule " (texte normal)
- **a² + b² = c²** (MathLive rendu)
- " est fondamentale !" (texte normal)

**Syntaxe LaTeX supportée :**

- **Exposants** : `$$x^2$$` → x²
- **Fractions** : `$$\frac{a}{b}$$` → a/b
- **Racines** : `$$\sqrt{x}$$` → √x
- **Lettres grecques** : `$$\alpha, \beta, \Delta$$` → α, β, Δ
- **Intégrales** : `$$\int_0^1 x^2 dx$$` → ∫₀¹ x² dx
- **Sommes** : `$$\sum_{i=1}^{n} i$$` → Σᵢ₌₁ⁿ i
- Et bien plus encore !

**Fichiers créés :**

```
src/lib/
├── utils/
│   └── latex-parser.ts         # Parseur LaTeX (détecte $$...$$ )
└── components/
    └── MathDisplay.svelte      # Composant d'affichage avec MathLive
```

**Styling et intégration visuelle :**

- ✨ **Fond transparent** : Les champs MathLive héritent du fond de la bulle de message (bleu pour l'utilisateur, gris pour l'assistant)
- 🚫 **Aucune bordure** : Pas de cadre autour des expressions mathématiques
- 👆 **Pas d'effet de survol** : Le curseur reste normal (pas de curseur texte), aucun changement visuel au survol
- 🎯 **Aucun effet de focus** : Pas d'outline ou de ring au clic (les champs sont en lecture seule)
- 🔗 **Intégration naturelle** : Les formules apparaissent comme si elles faisaient partie intégrante du texte

**Performance :**

- ⚡ Parsing ultra-rapide (< 1ms par message)
- 🎨 Rendu temps réel pendant l'animation
- 🔄 Mise à jour fluide sans scintillement
- 📱 Compatible tous navigateurs modernes
- 💪 Styles renforcés avec `!important` pour surcharger les styles par défaut de MathLive

Pour plus de détails techniques, consultez les commentaires détaillés dans le code source des fichiers mentionnés ci-dessus.

---

## 🚀 Prochaines Étapes Possibles

### Améliorations potentielles

1. **Streaming en temps réel** : Afficher la réponse mot par mot
2. **Support Markdown** : Formatage riche (gras, italique, code)
3. **Export de conversation** : Télécharger l'historique en PDF
4. **Thèmes visuels** : Personnaliser l'apparence du chatbot
5. **Synthèse vocale** : Lire les réponses à voix haute
6. **Reconnaissance vocale** : Dicter les questions
7. **Suggestions de questions** : Proposer des questions fréquentes
8. **Intégration avec les devoirs** : Lier aux exercices UbuMaths
9. **Mode multi-personnalité** : Switcher entre Père et Mère Ubu
10. **Analytics** : Suivre les types de questions posées
11. **Saisie LaTeX par l'utilisateur** : Clavier MathLive pour les élèves

---

**Cornegidouille ! Vous êtes prêt à discuter avec le Père Ubu et voir des maths magnifiques ! 🎭📐**

Si vous rencontrez des problèmes, consultez la section Dépannage ou vérifiez les logs du serveur.
