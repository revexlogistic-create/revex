// src/pages/seller/MyLots.jsx — Gestion des lots vendeur
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9',
};

const STATUS_CONFIG = {
  draft:        { label:'⬜ Brouillon',      color:C.muted,  bg:C.beige   },
  active:       { label:'🟢 Actif',          color:C.eco,    bg:'#E8F8EE' },
  auction_live: { label:'🔨 Enchère live',   color:C.orange, bg:'#FEF5E7' },
  auction_ended:{ label:'🏁 Enchère terminée',color:'#8B5CF6',bg:'#F3E8FF'},
  sold:         { label:'🔵 Vendu',          color:C.blue,   bg:'#EBF5FB' },
  inactive:     { label:'🔴 Inactif',        color:C.urgent, bg:'#FDECEA' },
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');

export default function MyLots() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [showStorageModal, setShowStorageModal] = useState(null); // lot object
  const [storageLoading, setStorageLoading] = useState(false);

  // ── Mes lots ─────────────────────────────────────────────────
  const { data, isLoading, refetch } = useQuery(
    ['my-lots', filter],
    () => api.get('/lots?role=seller' + (filter !== 'all' ? '&status=' + filter : '')).then(r => r.data),
    { staleTime: 20000 }
  );
  const lots = data?.lots || [];

  // Stats
  const stats = {
    total:  lots.length,
    active: lots.filter(l => ['active','auction_live'].includes(l.status)).length,
    sold:   lots.filter(l => l.status === 'sold').length,
    ca:     lots.filter(l => l.status === 'sold').reduce((s,l) => s + Number(l.price||0), 0),
  };

  // ── Mutation status ─────────────────────────────────────────
  const statusMutation = useMutation(
    ({ id, status }) => api.put('/lots/' + id + '/status', { status }),
    {
      onSuccess: () => { qc.invalidateQueries('my-lots'); toast.success('Statut mis à jour.'); },
      onError: e => toast.error(e.response?.data?.error || 'Erreur'),
    }
  );

  // ── Demande de stockage du lot ──────────────────────────────
  const handleStorageLot = async (lot) => {
    setStorageLoading(true);
    try {
      const items = lot.items_summary || (lot.items_count + ' articles');
      await api.post('/storage', {
        contactName:        user?.contact_name || user?.email || 'Contact',
        companyName:        user?.company_name || '',
        contactPhone:       user?.phone || '+212 600 000 000',
        contactEmail:       user?.email || '',
        city:               user?.city || lot.location_city || 'Maroc',
        storageType:        'long',
        selectedProductIds: [],
        customItems:        'LOT: ' + lot.title + ' — ' + items,
        estimatedVol:       lot.total_weight_kg ? Math.max(0.5, Math.round(lot.total_weight_kg * 0.003 * 10) / 10) : 1,
        estimatedQty:       lot.items_count || 1,
        wantPhotos:         true,
        wantCertif:         true,
        wantInventory:      true,
        wantPicking:        false,
        deliveryMode:       'self',
        deliveryNotes:      'Lot REVEX : ' + lot.title + ' — Valeur : ' + fmt(lot.price) + ' MAD',
      });
      toast.success('🏢 Demande de stockage envoyée pour le lot "' + lot.title.substring(0,30) + '" !');
      setShowStorageModal(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la demande');
    } finally {
      setStorageLoading(false);
    }
  };

  const filteredLots = filter === 'all' ? lots : lots.filter(l => l.status === filter);

  return (
    <div style={{ background:C.cream, minHeight:'100vh' }}>

      {/* ── HERO ── */}
      <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', padding:'2rem 2rem 1.5rem', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', border:'1.5px solid rgba(126,168,106,0.1)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <Link to="/seller" style={{ color:'rgba(246,241,231,0.5)', fontSize:'0.78rem', textDecoration:'none', display:'inline-block', marginBottom:'0.7rem' }}>
                ← Tableau de bord vendeur
              </Link>
              <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.2rem', fontWeight:700, color:'#F6F1E7', margin:0 }}>
                📦 Mes Lots
              </h1>
              <p style={{ color:'rgba(246,241,231,0.6)', fontSize:'0.88rem', marginTop:'0.3rem' }}>
                Gérez vos lots industriels · Enchères et prix fixe
              </p>
            </div>
            <div style={{ display:'flex', gap:'0.6rem' }}>
              <button onClick={() => refetch()}
                style={{ background:'rgba(255,255,255,0.1)', color:'rgba(246,241,231,0.8)', border:'1px solid rgba(255,255,255,0.2)', padding:'0.6rem 1rem', borderRadius:100, fontSize:'0.82rem', cursor:'pointer' }}>
                🔄
              </button>
              <Link to="/lots/publier"
                style={{ background:'#F6F1E7', color:'#1E3D0F', textDecoration:'none', padding:'0.7rem 1.5rem', borderRadius:100, fontWeight:700, fontSize:'0.88rem' }}>
                + Créer un lot
              </Link>
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.7rem', marginTop:'1.5rem' }}>
            {[
              { icon:'📦', label:'Total lots',    value:stats.total,                      color:'#F6F1E7' },
              { icon:'🟢', label:'Actifs',        value:stats.active,                     color:'#6EE7B7' },
              { icon:'🔵', label:'Vendus',        value:stats.sold,                       color:'#93C5FD' },
              { icon:'💰', label:'CA lots',       value:fmt(stats.ca)+' MAD',             color:'#FCD34D' },
            ].map(k => (
              <div key={k.label} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'0.8rem', textAlign:'center' }}>
                <div style={{ fontSize:'1.1rem', marginBottom:'0.25rem' }}>{k.icon}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:k.color }}>{k.value}</div>
                <div style={{ fontSize:'0.65rem', color:'rgba(246,241,231,0.5)', marginTop:2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'2rem 2rem 4rem' }}>

        {/* Filtres */}
        <div style={{ display:'flex', gap:'0.4rem', marginBottom:'1.2rem', flexWrap:'wrap' }}>
          {[['all','Tous ('+lots.length+')'],['active','🟢 Actifs'],['auction_live','🔨 Enchères'],['sold','🔵 Vendus'],['draft','⬜ Brouillons']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              style={{ background:filter===v?C.forest:C.white, color:filter===v?C.cream:C.muted, border:'1px solid '+(filter===v?C.forest:C.mid), padding:'0.4rem 0.9rem', borderRadius:100, fontSize:'0.8rem', cursor:'pointer', fontWeight:filter===v?700:400, fontFamily:"'DM Sans',sans-serif" }}>
              {l}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}>Chargement...</div>
        )}

        {/* Vide */}
        {!isLoading && filteredLots.length === 0 && (
          <div style={{ textAlign:'center', padding:'4rem', background:C.white, borderRadius:18, border:'2px dashed '+C.mid }}>
            <div style={{ fontSize:'4rem', opacity:0.15, marginBottom:'0.7rem' }}>📦</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', color:C.forest, marginBottom:'0.4rem' }}>
              {filter === 'all' ? 'Aucun lot créé' : 'Aucun lot avec ce statut'}
            </div>
            <Link to="/lots/publier"
              style={{ display:'inline-block', marginTop:'1rem', background:C.forest, color:C.cream, textDecoration:'none', padding:'0.7rem 1.8rem', borderRadius:100, fontWeight:700 }}>
              + Créer mon premier lot
            </Link>
          </div>
        )}

        {/* Liste des lots */}
        {!isLoading && filteredLots.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {filteredLots.map(lot => {
              const st = STATUS_CONFIG[lot.status] || STATUS_CONFIG.draft;
              const isLive = lot.status === 'auction_live';
              const isActive = ['active','auction_live'].includes(lot.status);

              return (
                <div key={lot.id} style={{ background:C.white, border:'1.5px solid '+(isLive?C.orange:C.mid), borderRadius:18, overflow:'hidden', boxShadow:'0 2px 10px rgba(30,61,15,0.05)' }}>

                  {/* Header */}
                  <div style={{ padding:'1rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem', background:isLive?'#FFFBEB':C.white }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:3 }}>
                        <Link to={'/lots/'+lot.slug}
                          style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', fontWeight:700, color:C.forest, textDecoration:'none' }}>
                          {lot.title}
                        </Link>
                        {isLive && <span style={{ background:'#FEF3C7', color:'#92400E', fontSize:'0.65rem', fontWeight:700, padding:'0.1rem 0.5rem', borderRadius:100 }}>EN DIRECT</span>}
                      </div>
                      <div style={{ fontSize:'0.75rem', color:C.muted }}>
                        {lot.lot_type==='auction' ? '🔨 Enchère' : '🏷️ Prix fixe'}
                        {' · '}{lot.items_count||0} article(s)
                        {lot.location_city && ' · 📍 '+lot.location_city}
                        {' · 📅 '+new Date(lot.created_at).toLocaleDateString('fr-MA')}
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.8rem', flexWrap:'wrap' }}>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:C.leaf }}>
                          {fmt(lot.current_bid || lot.price)} MAD
                        </div>
                        {lot.bid_count > 0 && <div style={{ fontSize:'0.68rem', color:C.orange }}>{lot.bid_count} enchère(s)</div>}
                      </div>
                      <span style={{ background:st.bg, color:st.color, padding:'0.25rem 0.8rem', borderRadius:100, fontSize:'0.75rem', fontWeight:700 }}>
                        {st.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ padding:'0.7rem 1.5rem', background:C.cream, borderTop:'1px solid '+C.beige, display:'flex', gap:'0.5rem', flexWrap:'wrap', alignItems:'center' }}>

                    {/* Voir le lot */}
                    <Link to={'/lots/'+lot.slug}
                      style={{ background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.38rem 0.8rem', borderRadius:100, fontSize:'0.78rem', textDecoration:'none', fontWeight:600 }}>
                      👁️ Voir
                    </Link>

                    {/* Modifier */}
                    {lot.status === 'draft' && (
                      <Link to={'/lots/publier?edit='+lot.id}
                        style={{ background:'#EFF6FF', color:C.blue, border:'1px solid #BFDBFE', padding:'0.38rem 0.8rem', borderRadius:100, fontSize:'0.78rem', textDecoration:'none', fontWeight:600 }}>
                        ✏️ Modifier
                      </Link>
                    )}

                    {/* Activer / Désactiver */}
                    {lot.status === 'draft' && (
                      <button onClick={() => statusMutation.mutate({ id:lot.id, status:'active' })}
                        style={{ background:C.eco, color:'#fff', border:'none', padding:'0.38rem 0.8rem', borderRadius:100, fontSize:'0.78rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                        ▶️ Activer
                      </button>
                    )}

                    {lot.status === 'active' && (
                      <button onClick={() => statusMutation.mutate({ id:lot.id, status:'inactive' })}
                        style={{ background:'#FEF5E7', color:C.orange, border:'1px solid #FDE68A', padding:'0.38rem 0.8rem', borderRadius:100, fontSize:'0.78rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                        ⏸️ Désactiver
                      </button>
                    )}

                    {lot.status === 'inactive' && (
                      <button onClick={() => statusMutation.mutate({ id:lot.id, status:'active' })}
                        style={{ background:C.eco, color:'#fff', border:'none', padding:'0.38rem 0.8rem', borderRadius:100, fontSize:'0.78rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                        ▶️ Réactiver
                      </button>
                    )}

                    {/* STOCKER CHEZ REVEX */}
                    {isActive && (
                      <button onClick={() => setShowStorageModal(lot)}
                        style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', color:'#F6F1E7', border:'none', padding:'0.38rem 0.9rem', borderRadius:100, fontSize:'0.78rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', gap:'0.4rem' }}>
                        🏢 Stocker chez REVEX
                      </button>
                    )}

                    {/* Stats rapides */}
                    <div style={{ marginLeft:'auto', display:'flex', gap:'0.8rem', fontSize:'0.72rem', color:C.muted }}>
                      {lot.views > 0 && <span>👁️ {lot.views} vues</span>}
                      {lot.bid_count > 0 && <span>🔨 {lot.bid_count} offres</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL STOCKAGE LOT ── */}
      {showStorageModal && (
        <div onClick={() => setShowStorageModal(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:C.cream, borderRadius:22, maxWidth:480, width:'100%', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>

            <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', padding:'1.3rem 1.6rem' }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:'#F6F1E7' }}>
                🏢 Stocker ce lot chez REVEX
              </div>
              <div style={{ fontSize:'0.75rem', color:'rgba(246,241,231,0.55)', marginTop:3 }}>
                {showStorageModal.title?.substring(0,50)}
              </div>
            </div>

            <div style={{ padding:'1.5rem 1.6rem' }}>
              {/* Récap lot */}
              <div style={{ background:C.beige, borderRadius:12, padding:'1rem', marginBottom:'1.2rem' }}>
                {[
                  ['📦 Articles', (showStorageModal.items_count||'?')+' article(s)'],
                  ['⚖️ Poids', showStorageModal.total_weight_kg ? fmt(showStorageModal.total_weight_kg)+' kg' : '—'],
                  ['💰 Valeur', fmt(showStorageModal.price)+' MAD'],
                  ['📍 Localisation', showStorageModal.location_city || '—'],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'0.4rem 0', borderBottom:'1px solid '+C.mid, fontSize:'0.83rem' }}>
                    <span style={{ color:C.muted }}>{k}</span>
                    <span style={{ fontWeight:600, color:C.forest }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Avantages */}
              <div style={{ background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:12, padding:'0.9rem 1rem', marginBottom:'1.2rem', fontSize:'0.82rem', color:'#065F46', lineHeight:1.7 }}>
                ✅ Votre lot sera stocké dans un entrepôt REVEX<br/>
                📸 Photos professionnelles + certificat qualité<br/>
                🚛 Expédition gérée par REVEX lors de la vente<br/>
                💰 Commission réduite à 3% sur la vente depuis l'entrepôt
              </div>

              <div style={{ display:'flex', gap:'0.7rem' }}>
                <button onClick={() => handleStorageLot(showStorageModal)} disabled={storageLoading}
                  style={{ flex:1, background:C.forest, color:C.cream, border:'none', padding:'0.8rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem', cursor:storageLoading?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  {storageLoading ? '⏳ Envoi...' : '📤 Envoyer la demande'}
                </button>
                <button onClick={() => setShowStorageModal(null)}
                  style={{ background:'transparent', color:C.muted, border:'1.5px solid '+C.mid, padding:'0.8rem 1.2rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
