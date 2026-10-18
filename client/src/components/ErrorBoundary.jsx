import React from 'react';

/**
 * ErrorBoundary - filet de sécurité global.
 * Si un composant plante au rendu/démarrage (ex. accès au stockage bloqué par un antivirus
 * comme Kaspersky), on affiche un message clair au lieu d'une page blanche.
 * Styles inline volontaires : fonctionne même si la CSS ne charge pas.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Erreur au démarrage :', error, info);
  }
  render() {
    if (this.state.error) {
      const msg = this.state.error && (this.state.error.stack || this.state.error.message || String(this.state.error));
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0f172a', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div style={{ maxWidth: 540, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Le site n'a pas pu démarrer</h1>
            <p style={{ color: '#cbd5e1', lineHeight: 1.5, marginBottom: 16 }}>
              Cela vient le plus souvent d'un <b>antivirus</b> (par ex. Kaspersky) ou d'une <b>extension de navigateur</b>
              qui bloque le stockage du site ou un script de la page.
            </p>
            <ul style={{ textAlign: 'left', color: '#cbd5e1', lineHeight: 1.7, margin: '0 auto 18px', maxWidth: 440 }}>
              <li>Essaie en <b>navigation privée</b></li>
              <li>Désactive l'extension de l'antivirus (ex. « Kaspersky Protection ») ou ajoute le site en <b>exclusion / site de confiance</b></li>
              <li>Ou essaie avec un autre navigateur</li>
            </ul>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}
            >
              Recharger la page
            </button>
            <details style={{ marginTop: 16, color: '#64748b', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer' }}>Détails techniques</summary>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, marginTop: 8 }}>{msg}</pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
