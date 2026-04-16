// src/components/ui/UserInfoModal.jsx — Popup info utilisateur
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../../api/axios';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
};

const SECTOR_ICONS = {
  Chimie:'⚗️', Minier:'⛏️', Ciment:'🏗️', Énergie:'⚡', Agriculture:'🌾',
  Textile:'🧵', Automobile:'🚗', Agroalimentaire:'🌽', default:'🏭'
};

function StarRating({ rating }) {
  const r = Number(rating) || 0;
  return (
    <div style={{ display:'flex', gap:2, alignItems:'center' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize:'0.9rem', color: i <= r ? '#F59E0B' : '#D9CEBC' }}>★</span>
      ))}
      <span style={{ fontSize:'0.75rem', color:C.muted, marginLeft:4 }}>{r > 0 ? r.toFixed(1) : 'Nouveau'}</span>
    </div>
  );
}

export default function UserInfoModal({ userId, userName, userRole, onClose, onContact }) {
  const { data, isLoading } = useQuery(
    ['user-info', userId],
    () => api.get('/users/'+userId+'/profile').then(r => r.data),
    { retry: false, staleTime: 300000 }
  );

  const user = data?.profile || data?.user;
  const sectorIcon = user?.sector ? (SECTOR_ICONS[user.sector] || SECTOR_ICONS.default) : SECTOR_ICONS.default;

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:C.white, borderRadius:24, maxWidth:440, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', overflow:'hidden' }}>

        {/* Header vert */}
        <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', padding:'1.5rem 2rem', position:'relative' }}>
          <button onClick={onClose}
            style={{ position:'absolute', top:12, right:14, background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', color:'#fff', fontSize:'0.85rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
            ✕
          </button>

          {/* Avatar initiales */}
          <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
            <div style={{ width:54, height:54, borderRadius:'50%', background:'rgba(126,168,106,0.3)', border:'2px solid rgba(126,168,106,0.5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', fontWeight:700, color:'#F6F1E7', flexShrink:0 }}>
              {(userName || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:'#F6F1E7', lineHeight:1.2 }}>
                {isLoading ? userName : (user?.company_name || userName)}
              </div>
              <div style={{ fontSize:'0.72rem', color:'rgba(246,241,231,0.6)', marginTop:2 }}>
                {userRole === 'seller' ? '🏭 Vendeur REVEX' : userRole === 'buyer' ? '🛒 Acheteur REVEX' : '👤 Utilisateur'}
              </div>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div style={{ padding:'1.5rem 2rem' }}>
          {isLoading ? (
            <div style={{ textAlign:'center', padding:'2rem', color:C.muted }}>
              <div style={{ fontSize:'1.5rem', marginBottom:'0.5rem', opacity:0.4 }}>⏳</div>
              Chargement...
            </div>
          ) : !user ? (
            <div style={{ textAlign:'center', padding:'1.5rem', color:C.muted }}>
              <p style={{ fontSize:'0.88rem' }}>Informations non disponibles</p>
            </div>
          ) : (
            <>
              {/* Infos principales */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.7rem', marginBottom:'1.2rem' }}>
                {[
                  ['📍', 'Ville', user.city || '—'],
                  ['🏭', 'Secteur', user.sector ? sectorIcon+' '+user.sector : '—'],
                  ['🗓️', 'Membre depuis', new Date(user.created_at).toLocaleDateString('fr-MA', { month:'long', year:'numeric' })],
                  ['📦', userRole==='seller' ? 'Produits actifs' : 'Commandes', userRole==='seller' ? (user.active_products||'0') : (user.orders_count||'0')],
                ].filter(([,,v]) => v && v !== '—').map(([icon, label, value]) => (
                  <div key={label} style={{ background:C.beige, borderRadius:12, padding:'0.7rem 0.9rem' }}>
                    <div style={{ fontSize:'0.68rem', color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.2rem' }}>{icon} {label}</div>
                    <div style={{ fontSize:'0.85rem', fontWeight:600, color:C.forest }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Note vendeur */}
              {userRole === 'seller' && (
                <div style={{ background:C.beige, borderRadius:12, padding:'0.8rem 1rem', marginBottom:'1rem' }}>
                  <div style={{ fontSize:'0.72rem', color:C.muted, marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>⭐ Réputation vendeur</div>
                  <StarRating rating={user.rating}/>
                  <div style={{ display:'flex', gap:'1.2rem', marginTop:'0.6rem', fontSize:'0.78rem', color:C.muted }}>
                    {user.total_sales > 0 && <span>🛒 {user.total_sales} vente{user.total_sales>1?'s':''}</span>}
                    {user.qualification_status === 'approved' && <span style={{ color:C.eco, fontWeight:600 }}>✓ Vendeur qualifié</span>}
                  </div>
                </div>
              )}

              {/* Description / activité */}
              {user.business_description && (
                <div style={{ marginBottom:'1rem', fontSize:'0.83rem', color:C.muted, lineHeight:1.65, background:C.beige, borderRadius:12, padding:'0.8rem 1rem' }}>
                  <div style={{ fontWeight:600, color:C.forest, marginBottom:'0.3rem', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>📋 Activité</div>
                  {user.business_description.substring(0, 150)}{user.business_description.length > 150 ? '...' : ''}
                </div>
              )}

              {/* Badges qualité */}
              <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1.2rem' }}>
                {user.qualification_status === 'approved' && (
                  <span style={{ background:'#ECFDF5', color:'#059669', borderRadius:100, padding:'0.2rem 0.7rem', fontSize:'0.72rem', fontWeight:700, border:'1px solid #A7F3D0' }}>
                    ✅ Qualifié REVEX
                  </span>
                )}
                {user.revex_certified && (
                  <span style={{ background:'#EFF6FF', color:'#2563EB', borderRadius:100, padding:'0.2rem 0.7rem', fontSize:'0.72rem', fontWeight:700, border:'1px solid #BFDBFE' }}>
                    🏆 Certifié
                  </span>
                )}
                {user.total_sales >= 10 && (
                  <span style={{ background:'#FEF3C7', color:'#D97706', borderRadius:100, padding:'0.2rem 0.7rem', fontSize:'0.72rem', fontWeight:700, border:'1px solid #FDE68A' }}>
                    🌟 Vendeur actif
                  </span>
                )}
              </div>

              {/* CTA */}
              <div style={{ display:'flex', gap:'0.7rem' }}>
                {onContact && (
                  <button onClick={onContact}
                    style={{ flex:1, background:C.forest, color:C.cream, border:'none', padding:'0.75rem', borderRadius:100, fontWeight:700, fontSize:'0.88rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    💬 Contacter
                  </button>
                )}
                {userRole === 'seller' && (
                  <Link to={'/catalogue?seller='+userId}
                    onClick={onClose}
                    style={{ flex:1, background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.75rem', borderRadius:100, fontWeight:600, fontSize:'0.88rem', textDecoration:'none', textAlign:'center', display:'block' }}>
                    📦 Ses produits
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
