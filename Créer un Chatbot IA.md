# Guide : Créer un Chatbot IA avec Personnalité en Svelte 5

Ce guide vous aide à créer un bot conversationnel avec une personnalité définie, utilisant Svelte 5 (avec runes) et des APIs IA gratuites.

---

## Table des Matières

1. [Architecture du Système](#architecture)
2. [Définir les Personnalités](#personnalités)
3. [Composant Svelte 5](#composant-svelte)
4. [Configuration API Backend](#api-backend)
5. [Best Practices](#best-practices)
6. [APIs IA Gratuites](#apis-gratuites)

---

## Architecture du Système {#architecture}

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Interface  │─────▶│ Personnalité│─────▶│   API IA    │
│ Utilisateur │      │   (Prompt)  │      │  Gratuite   │
│ (Svelte 5)  │      └─────────────┘      │ (Groq/etc.) │
└─────────────┘             │              └─────────────┘
       │                    │                     │
       │                    ▼                     │
       │            ┌─────────────┐              │
       │            │  Stockage   │              │
       └───────────▶│  Messages   │◀─────────────┘
                    │(localStorage)│
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │Gestionnaire │
                    │  Contexte   │
                    └─────────────┘
```

**Composants clés :**

- **Interface Utilisateur** : Composant Svelte 5 avec runes
- **Couche Personnalité** : System prompt qui définit le comportement du bot
- **API IA** : Service gratuit (Groq, DeepSeek, Hugging Face)
- **Stockage** : localStorage pour persister l'historique
- **Gestionnaire de Contexte** : Maintient la cohérence conversationnelle

---

## Définir les Personnalités {#personnalités}

### Fichier : `personality.js`

Créez un fichier pour définir différentes personnalités de bot :

```javascript
// personality.js

export const personalities = {
  friendlyHelper: {
    systemPrompt: `Tu es un assistant amical et enthousiaste.
Tu utilises des emojis occasionnellement 😊
Tu es patient et encourageant.
Tu réponds en français de manière claire et accessible.`,
    name: "Alex l'Assistant",
    avatar: "😊"
  },
  
  expertTech: {
    systemPrompt: `Tu es un expert technique en développement web.
Tu donnes des réponses précises et détaillées.
Tu utilises des exemples de code quand c'est pertinent.
Tu restes professionnel mais accessible.`,
    name: "DevBot Pro",
    avatar: "🤖"
  },
  
  creativeWriter: {
    systemPrompt: `Tu es un écrivain créatif et imaginatif.
Tu utilises des métaphores et des descriptions vivantes.
Tu inspires et motives par tes mots.
Tu t'adaptes au ton émotionnel de la conversation.`,
    name: "Plume",
    avatar: "✍️"
  },
  
  teacherBot: {
    systemPrompt: `Tu es un professeur patient et pédagogue.
Tu expliques les concepts complexes simplement.
Tu poses des questions pour vérifier la compréhension.
Tu encourages l'apprentissage par la pratique.`,
    name: "Prof. Einstein",
    avatar: "👨‍🏫"
  }
};
```

**Éléments d'une personnalité :**

- **Ton** : formel, amical, humoristique, professionnel
- **Rôle** : assistant, expert, coach, ami
- **Expertise** : domaine de connaissance spécifique
- **Style** : concis, détaillé, créatif, technique

---

## Composant Svelte 5 {#composant-svelte}

### Fichier : `ChatBot.svelte`

Voici le composant principal utilisant les runes de Svelte 5 :

```svelte
<script>
  import { personalities } from './personality.js';

  // Props avec Svelte 5
  let { personalityKey = 'friendlyHelper' } = $props();
  
  // State réactif avec runes
  let messages = $state([]);
  let inputValue = $state('');
  let isLoading = $state(false);
  
  // Valeur dérivée automatiquement mise à jour
  const personality = $derived(personalities[personalityKey]);
  
  // Effet : charger l'historique au montage du composant
  $effect(() => {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      try {
        messages = JSON.parse(saved);
      } catch (e) {
        console.error('Erreur chargement historique:', e);
      }
    }
  });
  
  // Effet : sauvegarder automatiquement l'historique
  $effect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    }
  });
  
  // Fonction d'envoi de message
  async function sendMessage() {
    if (!inputValue.trim() || isLoading) return;
    
    // Ajouter le message utilisateur
    const userMessage = {
      role: 'user',
      content: inputValue,
      timestamp: Date.now()
    };
    
    messages = [...messages, userMessage];
    inputValue = '';
    isLoading = true;
    
    try {
      // Appel API avec le system prompt de la personnalité
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: personality.systemPrompt },
            ...messages.slice(-10) // Garder seulement les 10 derniers messages
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error('Erreur API');
      }
      
      const data = await response.json();
      
      // Ajouter la réponse du bot
      messages = [...messages, {
        role: 'assistant',
        content: data.message,
        timestamp: Date.now()
      }];
      
    } catch (error) {
      console.error('Erreur:', error);
      messages = [...messages, {
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        timestamp: Date.now()
      }];
    } finally {
      isLoading = false;
    }
  }
  
  function clearHistory() {
    if (confirm('Voulez-vous vraiment effacer l\'historique ?')) {
      messages = [];
      localStorage.removeItem('chatHistory');
    }
  }
  
  // Scroll automatique vers le bas
  let messagesContainer;
  $effect(() => {
    if (messagesContainer && messages.length > 0) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });
</script>

<div class="chat-container">
  <!-- Header -->
  <div class="chat-header">
    <span class="avatar">{personality.avatar}</span>
    <h2>{personality.name}</h2>
    <button class="clear-btn" onclick={clearHistory} title="Effacer l'historique">
      🗑️
    </button>
  </div>
  
  <!-- Messages -->
  <div class="messages" bind:this={messagesContainer}>
    {#if messages.length === 0}
      <div class="welcome-message">
        <p>👋 Bonjour ! Je suis {personality.name}.</p>
        <p>Comment puis-je vous aider aujourd'hui ?</p>
      </div>
    {/if}
    
    {#each messages as message (message.timestamp)}
      <div class="message {message.role}">
        <div class="content">{message.content}</div>
        <div class="time">
          {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    {/each}
    
    {#if isLoading}
      <div class="message assistant loading">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    {/if}
  </div>
  
  <!-- Input -->
  <div class="input-area">
    <input
      bind:value={inputValue}
      placeholder="Écrivez votre message..."
      disabled={isLoading}
      onkeydown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      }}
    />
    <button 
      onclick={sendMessage} 
      disabled={isLoading || !inputValue.trim()}
      class="send-btn"
    >
      {isLoading ? '⏳' : '📤'}
    </button>
  </div>
</div>

<style>
  .chat-container {
    max-width: 700px;
    margin: 2rem auto;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .chat-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .chat-header h2 {
    margin: 0;
    flex: 1;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .avatar {
    font-size: 2.5rem;
  }
  
  .clear-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 8px;
    padding: 0.5rem;
    cursor: pointer;
    font-size: 1.25rem;
    transition: background 0.2s;
  }
  
  .clear-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  .messages {
    height: 500px;
    overflow-y: auto;
    padding: 1.5rem;
    background: #f9fafb;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .welcome-message {
    text-align: center;
    color: #6b7280;
    padding: 2rem;
  }
  
  .welcome-message p {
    margin: 0.5rem 0;
  }
  
  .message {
    padding: 0.875rem 1rem;
    border-radius: 12px;
    max-width: 75%;
    animation: fadeIn 0.3s ease-in;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .message.user {
    background: #3b82f6;
    color: white;
    margin-left: auto;
    border-bottom-right-radius: 4px;
  }
  
  .message.assistant {
    background: white;
    border: 1px solid #e5e7eb;
    margin-right: auto;
    border-bottom-left-radius: 4px;
  }
  
  .content {
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  
  .time {
    font-size: 0.75rem;
    opacity: 0.6;
    margin-top: 0.5rem;
    text-align: right;
  }
  
  .typing-indicator {
    display: flex;
    gap: 5px;
    padding: 0.5rem 0;
  }
  
  .typing-indicator span {
    width: 8px;
    height: 8px;
    background: #9ca3af;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out;
  }
  
  .typing-indicator span:nth-child(1) {
    animation-delay: 0s;
  }
  
  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }
  
  @keyframes bounce {
    0%, 60%, 100% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-8px);
    }
  }
  
  .input-area {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background: white;
    border-top: 1px solid #e5e7eb;
  }
  
  input {
    flex: 1;
    padding: 0.875rem 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    font-size: 0.9375rem;
    transition: border-color 0.2s;
  }
  
  input:focus {
    outline: none;
    border-color: #3b82f6;
  }
  
  input:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
  
  .send-btn {
    padding: 0.875rem 1.5rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1.25rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .send-btn:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
  }
  
  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
</style>
```

### Explication des Runes Svelte 5

- **`$props()`** : Récupère les props passées au composant
- **`$state()`** : Crée un état réactif (remplace `let` avec réactivité)
- **`$derived()`** : Crée une valeur calculée automatiquement mise à jour
- **`$effect()`** : Exécute du code quand ses dépendances changent

---

## Configuration API Backend {#api-backend}

### Option 1 : SvelteKit

Créez le fichier `src/routes/api/chat/+server.js` :

```javascript
// src/routes/api/chat/+server.js

import { json } from '@sveltejs/kit';
import { GROQ_API_KEY } from '$env/static/private';

export async function POST({ request }) {
  try {
    const { messages } = await request.json();
    
    // Validation
    if (!messages || !Array.isArray(messages)) {
      return json(
        { error: 'Format de messages invalide' },
        { status: 400 }
      );
    }
    
    // Appel à l'API Groq
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1,
          stream: false
        })
      }
    );
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erreur API Groq:', errorData);
      throw new Error(`Erreur API: ${response.status}`);
    }
    
    const data = await response.json();
    
    return json({
      message: data.choices[0].message.content
    });
    
  } catch (error) {
    console.error('Erreur serveur:', error);
    return json(
      { 
        error: 'Erreur lors de la communication avec l\'IA',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
```

### Configuration Environnement

Créez un fichier `.env` à la racine de votre projet :

```bash
# .env (NE JAMAIS COMMITER CE FICHIER)

# Obtenir une clé gratuite sur https://console.groq.com
GROQ_API_KEY=gsk_votre_clé_api_ici
```

Ajoutez `.env` à votre `.gitignore` :

```
.env
.env.local
.env.*.local
```

---

## Best Practices {#best-practices}

### ✅ À Faire

1. **Limiter le contexte** : Envoyer seulement les 10-15 derniers messages pour optimiser les coûts
2. **Gérer les erreurs** : Toujours avoir un fallback gracieux
3. **Sauvegarder l'historique** : Utiliser localStorage ou une base de données
4. **Ajouter un retry** : En cas d'échec temporaire de l'API
5. **Indicateur de chargement** : Animation de frappe pour montrer l'activité
6. **Validation** : Limiter la taille des messages (ex: 1000 caractères max)
7. **Tester les personnalités** : A/B testing pour l'expérience utilisateur

### ❌ À Éviter

1. **Envoyer tout l'historique** : Coûteux en tokens et lent
2. **Exposer les clés API** : Toujours côté serveur uniquement
3. **Stocker des données sensibles** : Pas de mots de passe en localStorage
4. **Oublier l'accessibilité** : Ajouter ARIA labels et navigation clavier
5. **Négliger les limites** : Respecter les quotas et rate limiting
6. **Messages non sécurisés** : Toujours échapper le HTML pour éviter XSS

### 🚀 Améliorations Possibles

1. **Streaming** : Afficher la réponse mot par mot en temps réel
2. **Markdown** : Support du formatage riche (gras, italique, code)
3. **Voice** : Synthèse et reconnaissance vocale
4. **Export** : Télécharger l'historique des conversations
5. **Suggestions** : Proposer des questions fréquentes
6. **Multi-langue** : Détection et adaptation automatique de la langue

---

## APIs IA Gratuites {#apis-gratuites}

### 1. Groq (Recommandé) ⚡

- **Site** : https://console.groq.com
- **Modèle** : llama-3.3-70b-versatile
- **Avantages** : Très rapide, quota généreux, compatible OpenAI
- **Quota gratuit** : ~14,400 requêtes/jour
- **Latence** : < 1 seconde pour la plupart des requêtes

### 2. DeepSeek 🆓

- **Site** : https://platform.deepseek.com
- **Modèle** : deepseek-chat
- **Avantages** : Open source, très abordable
- **API compatible** : Format OpenAI

### 3. Hugging Face 🤗

- **Site** : https://huggingface.co/inference-api
- **Modèles** : Nombreux modèles gratuits (Mixtral, Llama, etc.)
- **Avantages** : Grande variété de modèles
- **Limitation** : Rate limiting plus strict

### 4. Together AI 🚀

- **Site** : https://www.together.ai
- **Modèles** : Meta-Llama-3, Mixtral, etc.
- **Avantages** : Offre gratuite disponible
- **API** : Compatible OpenAI

---

## Utilisation du Composant

### Fichier : `+page.svelte`

```svelte
<script>
  import ChatBot from '$lib/components/ChatBot.svelte';
  
  let selectedPersonality = $state('friendlyHelper');
  
  const personalityOptions = [
    { key: 'friendlyHelper', label: '😊 Assistant Amical' },
    { key: 'expertTech', label: '🤖 Expert Tech' },
    { key: 'creativeWriter', label: '✍️ Écrivain Créatif' },
    { key: 'teacherBot', label: '👨‍🏫 Professeur' }
  ];
</script>

<main>
  <h1>Mon Assistant IA Personnel</h1>
  
  <div class="personality-selector">
    <label for="personality">Choisir une personnalité :</label>
    <select id="personality" bind:value={selectedPersonality}>
      {#each personalityOptions as option}
        <option value={option.key}>
          {option.label}
        </option>
      {/each}
    </select>
  </div>
  
  <ChatBot personalityKey={selectedPersonality} />
</main>

<style>
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: #1f2937;
  }
  
  .personality-selector {
    max-width: 700px;
    margin: 0 auto 2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  label {
    font-weight: 600;
    color: #4b5563;
  }
  
  select {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
  }
</style>
```

---

## Checklist de Démarrage

- [ ] Créer un compte sur https://console.groq.com
- [ ] Obtenir une clé API gratuite
- [ ] Créer le fichier `personality.js`
- [ ] Créer le composant `ChatBot.svelte`
- [ ] Créer l'endpoint API `src/routes/api/chat/+server.js`
- [ ] Configurer le fichier `.env` avec votre clé API
- [ ] Tester avec différentes personnalités
- [ ] Ajouter la gestion d'erreurs
- [ ] Optimiser les performances
- [ ] Déployer sur Vercel/Netlify

---

## Prochaines Étapes

1. **Personnaliser** : Adapter les personnalités à votre cas d'usage
2. **Optimiser** : Ajouter le caching et le rate limiting
3. **Enrichir** : Ajouter streaming, markdown, voice
4. **Déployer** : Mettre en production
5. **Analyser** : Suivre les métriques d'utilisation

**Bon développement ! 🚀**