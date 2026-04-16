// src/components/tokens/TokenBalance.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', cream:'#F6F1E7',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22'
};

export default function TokenBalance({ compact = false }) {
  const { user } = useAuth();
  const [showTooltip, setShowTooltip] = useState(false);

  const { data } = useQuery(
    'my-tokens',
    () => api.get('/tokens/me').then(r => r.data),
    { enabled: !!user, refetchInterval: 30000, staleTime: 15000 }
  );

  if (!user || user.role === 'admin') return null;

  const balance  = data?.balance ?? user?.tokens_balance ?? 0;
  const isLow    = balance < 5;
  const isEmpty  = balance === 0;
  const color    = isEmpty ? C.urgent : isLow ? C.orange : C.leaf;

  if (compact) {
    return (
      <Link to="/tokens"
        style={{ display:'flex', alignItems:'center', gap:5, background: isEmpty?'#FDECEA':isLow?'#FEF5E7':'#E8F8EE', border:`1px solid ${color}44`, borderRadius:100, padding:'0.3rem 0.8rem', textDecoration:'none', fontSize:'0.82rem', fontWeight:700, color, cursor:'pointer', transition:'all 0.2s' }}
        title={`${balance} jeton(s) disponible(s)`}>
        🪙 {balance}
        {isLow && <span style={{ fontSize:'0.7rem' }}>⚠️</span>}
      </Link>
    );
  }

  return (
    <div style={{ position:'relative' }}>
      <Link to="/tokens"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{ display:'flex', alignItems:'center', gap:6, background: isEmpty?'#FDECEA':isLow?'#FEF5E7':'#E8F8EE', border:`1.5px solid ${color}66`, borderRadius:100, padding:'0.4rem 1rem', textDecoration:'none', transition:'all 0.2s' }}>
        <span style={{ fontSize:'1rem' }}>🪙</span>
        <span style={{ fontWeight:700, color, fontSize:'0.9rem' }}>{balance}</span>
        <span style={{ fontSize:'0.72rem', color, opacity:0.8 }}>jetons</span>
        {isLow && <span style={{ fontSize:'0.75rem' }}>⚠️</span>}
      </Link>

      {/* Tooltip */}
      {showTooltip && (
        <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:C.forest, color:C.cream, borderRadius:12, padding:'0.8rem 1rem', minWidth:200, zIndex:100, boxShadow:'0 8px 24px rgba(0,0,0,0.2)', fontSize:'0.8rem' }}>
          <div style={{ fontWeight:700, marginBottom:'0.5rem' }}>🪙 Mes jetons REVEX</div>
          <div style={{ opacity:0.8, lineHeight:1.6 }}>
            Solde : <strong style={{ color: isEmpty?'#FF6B6B':isLow?C.orange:'#7EA86A' }}>{balance} jeton(s)</strong><br/>
            {isEmpty && '❌ Solde vide — rechargez pour continuer'}<br/>
            {isLow && !isEmpty && '⚠️ Solde faible — rechargez bientôt'}<br/>
            {!isLow && '✅ Solde suffisant'}
          </div>
          <div style={{ marginTop:'0.6rem', fontSize:'0.72rem', opacity:0.65 }}>
            Cliquez pour gérer vos jetons →
          </div>
          {/* Flèche */}
          <div style={{ position:'absolute', top:-6, right:16, width:12, height:12, background:C.forest, transform:'rotate(45deg)', borderRadius:2 }}/>
        </div>
      )}
    </div>
  );
}

/**
 * Hook pour vérifier les jetons avant une action
 */
export function useTokenCheck() {
  const { data } = useQuery('my-tokens', () => api.get('/tokens/me').then(r => r.data), { staleTime: 10000 });

  const checkTokens = (cost, operationName) => {
    const balance = data?.balance || 0;
    if (balance < cost) {
      const msg = `❌ Jetons insuffisants\n\nCette opération coûte ${cost} jeton(s).\nVous avez ${balance} jeton(s).\n\nVoulez-vous recharger votre compte ?`;
      if (window.confirm(msg)) {
        window.location.href = '/tokens';
      }
      return false;
    }
    return true;
  };

  return { balance: data?.balance || 0, checkTokens, costs: data?.costs || {} };
}
