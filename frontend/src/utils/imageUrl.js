// src/utils/imageUrl.js
// Par défaut pointe vers localhost:5000 (dev PC)
// Sur téléphone : créer frontend/.env.local avec REACT_APP_API_URL=http://192.168.X.X:5000/api

var BASE = 'http://localhost:5000';
try {
  if (process.env.REACT_APP_API_URL) {
    BASE = process.env.REACT_APP_API_URL.replace('/api', '').replace(/\/$/, '');
  }
} catch(e) {}

export function getImageUrl(url) {
  if (!url) return null;
  // Déjà une URL complète
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // URL relative /uploads/... → ajouter le base
  if (url.startsWith('/')) return BASE + url;
  // Chemin sans slash
  return BASE + '/' + url;
}

export default getImageUrl;
