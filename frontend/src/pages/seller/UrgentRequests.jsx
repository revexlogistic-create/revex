// src/pages/seller/UrgentRequests.jsx — Demandes urgentes côté vendeur

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', cream:'#F6F1E7',
  beige:'#EDE6D3', mid:'#D9CEBC', white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9',
};

const URGENCY = {
  critical: { label:'🔴 CRITIQUE', color:C.urgent, bg:'#FDECEA' },
  high:     { label:'🟠 Haute',    color:C.orange, bg:'#FEF5E7' },
  medium:   { label:'🟡 Moyenne',  color:'#D4A017',bg:'#FFFBEB' },
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');
const fmtDate = d => new Date(d).toLocaleDateString('fr-MA', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
const hoursLeft = d => Math.max(0, Math.floor((new Date(d) - Date.now()) / 3600000));

export default function SellerUrgentRequests() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState({ proposed_price:'', delivery_hours:'', message:'', quantity_available:1, product_id:'' });
  const [myProducts, setMyProducts] = useState([]);

  // Charger mes produits pour la sélection
  React.useEffect(() => {
    api.get('/products/mine?limit=200').then(r => setMyProducts(r.data?.products||[])).catch(()=>{});
  }, []);

  const { data, isLoading, refetch } = useQuery(
    'seller-urgent-open',
    () => api.get('/analysis/urgent/open').then(r => r.data).catch(() => ({ requests:[] })),
    { staleTime: 30000, refetchInterval: 60000 }
  );
  const requests = data?.requests || [];

  const respondMutation = useMutation(
    ({ id, payload }) => api.post('/analysis/urgent/' + id + '/respond', payload),
    {
      onSuccess: () => {
        qc.invalidateQueries('seller-urgent-open');
        toast.success('✅ Réponse envoyée ! L\'acheteur est notifié immédiatement.');
        setOpenId(null);
        setForm({ proposed_price:'', delivery_hours:'', message:'', quantity_available:1, product_id:'' });
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur lors de l\'envoi'),
    }
  );

  const handleRespond = (reqId) => {
    if (!form.proposed_price) { toast.error('Le prix est obligatoire'); return; }
    respondMutation.mutate({
      id: reqId,
      payload: {
        proposed_price:    Number(form.proposed_price),
        delivery_hours:    form.delivery_hours ? Number(form.delivery_hours) : null,
        message:           form.message || null,
        quantity_available:Number(form.quantity_available) || 1,
        product_id:        form.product_id || null,
      }
    });
  };

  const stats = {
    total:    requests.length,
    critical: requests.filter(r => r.urgency_level === 'critical').length,
    responded:requests.filter(r => Number(r.already_responded) > 0).length,
  };

  return (
    <div style={{ background:C.cream, minHeight:'100vh' }}>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#7B1113,#C0392B)', padding:'2rem 2rem 1.5rem', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:180, height:180, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,0.1)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <Link to="/seller" style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.78rem', textDecoration:'none', display:'inline-block', marginBottom:'0.7rem' }}>
                ← Mon espace vendeur
              </Link>
              <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.2rem', fontWeight:700, color:'#fff', margin:0 }}>
                ⚡ Demandes PDR Urgentes
              </h1>
              <p style={{ color:'rgba(255,255,255,0.65)', fontSize:'0.88rem', marginTop:'0.4rem' }}>
                Acheteurs cherchant des pièces en urgence — Répondez et concluez une vente immédiate
              </p>
            </div>
            <button onClick={() => refetch()}
              style={{ background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)', padding:'0.6rem 1.1rem', borderRadius:100, fontSize:'0.82rem', cursor:'pointer' }}>
              🔄 Actualiser
            </button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.7rem', marginTop:'1.5rem' }}>
            {[
              { icon:'⚡', label:'Demandes ouvertes', value:stats.total,    color:'#fff'     },
              { icon:'🔴', label:'Critiques',         value:stats.critical, color:'#FCA5A5'  },
              { icon:'✅', label:'Mes réponses',       value:stats.responded,color:'#6EE7B7' },
            ].map(k => (
              <div key={k.label} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:12, padding:'0.8rem', textAlign:'center' }}>
                <div style={{ fontSize:'1.1rem', marginBottom:'0.25rem' }}>{k.icon}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:k.color }}>{k.value}</div>
                <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.5)', marginTop:2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'2rem 2rem 4rem' }}>

        {isLoading && <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}>Chargement...</div>}

        {!isLoading && requests.length === 0 && (
          <div style={{ textAlign:'center', padding:'4rem', background:C.white, borderRadius:18, border:'2px dashed '+C.mid }}>
            <div style={{ fontSize:'4rem', opacity:0.15, marginBottom:'0.7rem' }}>⚡</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:C.forest }}>
              Aucune demande urgente en ce moment
            </div>
            <div style={{ fontSize:'0.85rem', color:C.muted, marginTop:'0.4rem' }}>
              Les nouvelles demandes apparaîtront ici dès qu'un acheteur en soumettra une.
            </div>
          </div>
        )}

        {!isLoading && requests.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {requests.map(r => {
              const urg = URGENCY[r.urgency_level] || URGENCY.high;
              const left = hoursLeft(r.expires_at);
              const alreadyReplied = Number(r.already_responded) > 0;
              const isOpen = openId === r.id;

              return (
                <div key={r.id} style={{ background:C.white, border:'2px solid '+(r.urgency_level==='critical'?C.urgent:alreadyReplied?C.eco:C.mid), borderRadius:18, overflow:'hidden', boxShadow:'0 2px 10px rgba(30,61,15,0.05)' }}>

                  {/* Header */}
                  <div style={{ padding:'1rem 1.5rem', background:r.urgency_level==='critical'?'#FFF5F5':alreadyReplied?'#F0FDF4':C.white, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem' }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:4 }}>
                        <span style={{ background:urg.bg, color:urg.color, fontSize:'0.68rem', fontWeight:700, padding:'0.12rem 0.55rem', borderRadius:100 }}>
                          {urg.label}
                        </span>
                        {alreadyReplied && (
                          <span style={{ background:'#ECFDF5', color:C.eco, fontSize:'0.68rem', fontWeight:700, padding:'0.12rem 0.55rem', borderRadius:100 }}>
                            ✅ Répondu
                          </span>
                        )}
                        <span style={{ background:left<=4?'#FDECEA':C.beige, color:left<=4?C.urgent:C.muted, fontSize:'0.65rem', fontWeight:600, padding:'0.1rem 0.5rem', borderRadius:100 }}>
                          ⏱ {left}h restantes
                        </span>
                      </div>
                      <div style={{ fontWeight:700, color:C.forest, fontSize:'0.95rem', marginBottom:3 }}>
                        {r.part_description?.substring(0,90)}{r.part_description?.length > 90 ? '...' : ''}
                      </div>
                      <div style={{ fontSize:'0.72rem', color:C.muted }}>
                        🏭 {r.buyer_company}
                        {r.part_reference && ' · 🔖 Réf: '+r.part_reference}
                        {' · 📍 '+r.location_city}
                        {' · ⏱ Max '+r.max_delivery_hours+'h'}
                        {r.max_budget && ' · 💰 Budget max: '+fmt(r.max_budget)+' MAD'}
                        {' · 📅 '+fmtDate(r.created_at)}
                      </div>
                    </div>

                    <div style={{ display:'flex', gap:'0.5rem', flexShrink:0 }}>
                      {!alreadyReplied ? (
                        <button onClick={() => { setOpenId(isOpen?null:r.id); setForm({ proposed_price:'', delivery_hours:r.max_delivery_hours||'', message:'', quantity_available:1, product_id:'' }); }}
                          style={{ background:C.urgent, color:'#fff', border:'none', padding:'0.5rem 1.2rem', borderRadius:100, fontWeight:700, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          ⚡ {isOpen ? 'Fermer' : 'J\'ai cette pièce'}
                        </button>
                      ) : (
                        <button onClick={() => setOpenId(isOpen?null:r.id)}
                          style={{ background:'#ECFDF5', color:C.eco, border:'1px solid #A7F3D0', padding:'0.5rem 1.1rem', borderRadius:100, fontWeight:600, fontSize:'0.82rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          {isOpen ? '▲ Masquer' : '✏️ Modifier ma réponse'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Formulaire de réponse */}
                  {isOpen && (
                    <div style={{ padding:'1.2rem 1.5rem', borderTop:'1px solid '+C.beige, background:'#FFFBEB' }}>
                      <div style={{ fontWeight:700, color:C.forest, fontSize:'0.88rem', marginBottom:'1rem' }}>
                        💬 Votre réponse à l'acheteur
                      </div>

                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.75rem', marginBottom:'0.75rem' }}>
                        <div>
                          <label style={lbl}>Prix proposé (MAD) *</label>
                          <input type="number" value={form.proposed_price}
                            onChange={e => setForm(f=>({...f, proposed_price:e.target.value}))}
                            placeholder={'Ex: '+(r.max_budget ? Math.round(Number(r.max_budget)*0.9) : 5000)}
                            style={inp} min="0"/>
                        </div>
                        <div>
                          <label style={lbl}>Délai de livraison (heures)</label>
                          <input type="number" value={form.delivery_hours}
                            onChange={e => setForm(f=>({...f, delivery_hours:e.target.value}))}
                            placeholder={'Max '+r.max_delivery_hours+'h'}
                            style={inp} min="1" max={r.max_delivery_hours}/>
                        </div>
                        <div>
                          <label style={lbl}>Quantité disponible</label>
                          <input type="number" value={form.quantity_available}
                            onChange={e => setForm(f=>({...f, quantity_available:e.target.value}))}
                            style={inp} min="1"/>
                        </div>
                      </div>

                      {/* Lier à un produit catalogue */}
                      {myProducts.length > 0 && (
                        <div style={{ marginBottom:'0.75rem' }}>
                          <label style={lbl}>Lier à un de vos produits (optionnel — permet commande directe)</label>
                          <select value={form.product_id}
                            onChange={e => setForm(f=>({...f, product_id:e.target.value}))}
                            style={inp}>
                            <option value="">-- Aucun produit sélectionné --</option>
                            {myProducts.filter(p => p.status === 'active').map(p => (
                              <option key={p.id} value={p.id}>{p.title} — {fmt(p.price)} MAD</option>
                            ))}
                          </select>
                          {form.product_id && (
                            <div style={{ fontSize:'0.72rem', color:C.eco, marginTop:3 }}>
                              ✅ L'acheteur pourra commander directement via REVEX
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ marginBottom:'1rem' }}>
                        <label style={lbl}>Message pour l'acheteur</label>
                        <textarea value={form.message}
                          onChange={e => setForm(f=>({...f, message:e.target.value}))}
                          rows={3} placeholder="Ex: Nous avons en stock ce composant en bon état, livrable depuis Casablanca. Pièce vérifiée et testée avant expédition..."
                          style={{ ...inp, resize:'vertical' }}/>
                      </div>

                      {/* Récap */}
                      {form.proposed_price && (
                        <div style={{ background:'linear-gradient(135deg,#7B1113,#C0392B)', borderRadius:12, padding:'0.9rem 1.2rem', marginBottom:'1rem' }}>
                          <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.55)', marginBottom:'0.5rem' }}>📋 Récapitulatif de votre offre</div>
                          <div style={{ display:'flex', gap:'2rem', flexWrap:'wrap', fontSize:'0.82rem' }}>
                            <div>
                              <span style={{ color:'rgba(255,255,255,0.5)' }}>Prix : </span>
                              <strong style={{ color:'#FCD34D' }}>{fmt(form.proposed_price)} MAD</strong>
                            </div>
                            {form.delivery_hours && (
                              <div>
                                <span style={{ color:'rgba(255,255,255,0.5)' }}>Délai : </span>
                                <strong style={{ color:'#6EE7B7' }}>{form.delivery_hours}h</strong>
                              </div>
                            )}
                            <div>
                              <span style={{ color:'rgba(255,255,255,0.5)' }}>Qté : </span>
                              <strong style={{ color:'#fff' }}>{form.quantity_available} unité(s)</strong>
                            </div>
                            {form.product_id && (
                              <div>
                                <span style={{ color:'#6EE7B7', fontWeight:700 }}>✅ Commande directe activée</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div style={{ display:'flex', gap:'0.7rem' }}>
                        <button onClick={() => handleRespond(r.id)} disabled={respondMutation.isLoading || !form.proposed_price}
                          style={{ background:respondMutation.isLoading||!form.proposed_price?C.mid:C.urgent, color:'#fff', border:'none', padding:'0.75rem 2rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem', cursor:respondMutation.isLoading||!form.proposed_price?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          {respondMutation.isLoading ? '⏳ Envoi...' : '⚡ Envoyer ma réponse'}
                        </button>
                        <button onClick={() => setOpenId(null)}
                          style={{ background:'transparent', color:C.muted, border:'1.5px solid '+C.mid, padding:'0.75rem 1.3rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const lbl = { fontSize:'0.75rem', fontWeight:600, color:'#1E3D0F', display:'block', marginBottom:'0.3rem' };
const inp = { width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid #D9CEBC', borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' };
