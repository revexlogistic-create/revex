// src/pages/seller/SellerPurchases.jsx — Mes achats (vendeur achetant des PDR)
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import BackButton from '../../components/ui/BackButton';

const C = {
  deep:   '#0F2318', forest: '#1A3C2E', mid:    '#2D5A46',
  sage:   '#4A9065', light:  '#8DB8A0',
  nardo:  '#4A4E5A', steel:  '#7A8090', silver: '#B8BCC8',
  ghost:  '#E8ECEB', cream:  '#F4F6F4', white:  '#FAFBFA',
  amber:  '#E8C866', gold:   '#C8A84B',
  eco:    '#27AE60', urgent: '#C0392B',
};

const fmt = n => Number(n || 0).toLocaleString('fr-MA');

const STATUS = {
  pending:   { label:'⏳ En attente',  bg:'#FFF3E0', color:'#E67E22' },
  confirmed: { label:'✅ Confirmée',   bg:'#EBF5FB', color:'#2980B9' },
  shipped:   { label:'🚛 Expédiée',   bg:'#EAF7EF', color:C.sage    },
  delivered: { label:'✅ Livrée',      bg:'#EAFAF1', color:C.eco     },
  cancelled: { label:'❌ Annulée',     bg:'#FDECEA', color:C.urgent  },
  disputed:  { label:'⚖️ En litige',  bg:'#F5EEF8', color:'#8E44AD' },
};

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{ background:C.white, border:'1px solid '+C.ghost, borderRadius:16,
      padding:'1.3rem 1.5rem', display:'flex', gap:'1rem', alignItems:'center' }}>
      <div style={{ width:44, height:44, borderRadius:14, background:C.ghost,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', flexShrink:0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize:'0.72rem', color:C.steel, fontWeight:600,
          textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>
          {label}
        </div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem',
          fontWeight:700, color: accent || C.deep, lineHeight:1 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize:'0.72rem', color:C.steel, marginTop:3 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function SellerPurchases() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter]   = useState('');
  const [expanded, setExpanded]           = useState(null);
  const [confirmOrder, setConfirmOrder]   = useState(null);
  const [ratingOrder, setRatingOrder]     = useState(null);
  const [trackingOrder, setTrackingOrder] = useState(null);

  const { data, isLoading } = useQuery(
    ['purchases-seller', statusFilter],
    () => api.get('/orders?role_as=buyer' + (statusFilter ? '&status='+statusFilter : '')).then(r => r.data)
  );

  const ratingMutation = useMutation(
    function(p) { return api.post('/orders/'+p.orderId+'/rate', { rating:p.rating, comment:p.comment }); },
    {
      onSuccess: function() {
        toast.success('⭐ Évaluation envoyée !');
        setRatingOrder(null);
        qc.invalidateQueries('purchases-seller');
      }
    }
  );

  const confirmMutation = useMutation(
    function(orderId) { return api.put('/orders/'+orderId+'/status', { status:'delivered' }); },
    {
      onSuccess: function() {
        toast.success('✅ Réception confirmée — paiement libéré.');
        setConfirmOrder(null);
        qc.invalidateQueries('purchases-seller');
      },
      onError: function(e) { toast.error((e.response && e.response.data && e.response.data.error) || 'Erreur'); },
    }
  );

  const orders   = (data && data.orders) || [];
  const total    = orders.length;
  const enCours  = orders.filter(function(o) { return ['pending','confirmed','shipped'].includes(o.status); }).length;
  const livrees  = orders.filter(function(o) { return o.status === 'delivered'; }).length;
  const totalMad = orders.filter(function(o) { return o.status === 'delivered'; }).reduce(function(s,o) { return s + Number(o.final_price||0); }, 0);

  return (
    <>
    <div style={{ maxWidth:1000, margin:'0 auto', padding:'2.5rem clamp(1rem,4vw,2rem)', fontFamily:"'DM Sans',sans-serif", background:C.cream, minHeight:'100vh' }}>

      <div style={{ marginBottom:'0.8rem' }}>
        <BackButton to="/seller" label="Tableau de bord" />
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:C.sage, marginBottom:4 }}>Espace vendeur</div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.2rem', fontWeight:700, color:C.deep, margin:0 }}>Mes Achats</h1>
          <p style={{ fontSize:'0.84rem', color:C.nardo, marginTop:4 }}>Pièces achetées auprès d'autres vendeurs</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(200px,100%),1fr))', gap:'1rem', marginBottom:'2rem' }}>
        <StatCard icon="🛒" label="Total commandes" value={total} />
        <StatCard icon="⏳" label="En cours" value={enCours} accent={C.amber} />
        <StatCard icon="✅" label="Livrées" value={livrees} accent={C.eco} />
        <StatCard icon="💰" label="Montant total" value={fmt(totalMad)+' MAD'} sub="commandes livrées" accent={C.sage} />
      </div>

      {/* Filtres */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        {[['','Toutes'],['pending','En attente'],['confirmed','Confirmées'],['shipped','Expédiées'],['delivered','Livrées'],['cancelled','Annulées']].map(function([v,l]) {
          return (
            <button key={v} onClick={() => setStatusFilter(v)}
              style={{ padding:'0.38rem 0.95rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'0.82rem',
                border:'1px solid '+(statusFilter===v ? C.forest : C.ghost),
                background: statusFilter===v ? C.forest : C.white,
                color: statusFilter===v ? C.cream : C.nardo,
                fontWeight: statusFilter===v ? 600 : 400 }}>
              {l}
            </button>
          );
        })}
      </div>

      {/* Liste */}
      {isLoading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem' }}>
          {[1,2,3].map(function(i) {
            return <div key={i} style={{ background:C.ghost, borderRadius:16, height:100 }}/>;
          })}
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign:'center', padding:'5rem 2rem', background:C.white, borderRadius:20, border:'1px solid '+C.ghost }}>
          <div style={{ fontSize:'3.5rem', marginBottom:'1rem', opacity:0.2 }}>🛒</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', color:C.deep, marginBottom:'0.5rem' }}>Aucun achat</div>
          <p style={{ color:C.nardo, fontSize:'0.88rem' }}>
            {statusFilter ? 'Aucune commande avec ce statut.' : "Vous n'avez pas encore effectué d'achat sur REVEX."}
          </p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.9rem' }}>
          {orders.map(function(o) {
            var st = STATUS[o.status] || { label:o.status, bg:C.ghost, color:C.nardo };
            var isExp = expanded === o.id;
            return (
              <div key={o.id} style={{ background:C.white, border:'1px solid '+(isExp?C.sage:C.ghost), borderRadius:18, overflow:'hidden', transition:'border-color 0.2s' }}>

                {/* Header */}
                <div style={{ padding:'1.2rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', flexWrap:'wrap', gap:'0.8rem' }}
                  onClick={() => setExpanded(isExp ? null : o.id)}>
                  <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:isExp?C.forest:C.ghost, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', color:isExp?C.cream:C.steel, transition:'all 0.2s', flexShrink:0 }}>
                      {isExp ? '▲' : '▼'}
                    </div>
                    <div>
                      <div style={{ fontWeight:700, color:C.deep, fontSize:'0.95rem' }}>{o.order_number}</div>
                      <div style={{ fontSize:'0.78rem', color:C.nardo, marginTop:2 }}>
                        Vendeur : <strong style={{ color:C.forest }}>{o.seller_company}</strong>
                        {o.seller_city ? ' · '+o.seller_city : ''}
                        {' · '}{new Date(o.created_at).toLocaleDateString('fr-MA')}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                    <span style={{ background:st.bg, color:st.color, padding:'0.28rem 0.8rem', borderRadius:100, fontSize:'0.78rem', fontWeight:600 }}>{st.label}</span>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.35rem', fontWeight:700, color:C.deep }}>{fmt(o.final_price)} MAD</div>
                  </div>
                </div>

                {/* Détail */}
                {isExp && (
                  <div style={{ borderTop:'1px solid '+C.ghost, padding:'1.2rem 1.5rem' }}>

                    {/* Produit */}
                    <div style={{ background:C.cream, borderRadius:12, padding:'0.9rem 1.1rem', marginBottom:'1rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.5rem' }}>
                      <div>
                        <div style={{ fontWeight:600, color:C.deep, fontSize:'0.9rem' }}>📦 {o.product_title}</div>
                        <div style={{ fontSize:'0.78rem', color:C.nardo, marginTop:3 }}>
                          Qté : {o.quantity} · {o.delivery_type === 'eco' ? '🌿 Livraison éco' : '⚡ Livraison urgente'}
                          {o.delivery_price > 0 ? ' (+'+fmt(o.delivery_price)+' MAD)' : ''}
                        </div>
                      </div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:C.sage }}>{fmt(o.final_price)} MAD</div>
                    </div>

                    {/* Infos vendeur */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.7rem', marginBottom:'1rem' }}>
                      {[
                        ['🏭 Vendeur', o.seller_company],
                        ['📍 Ville', o.seller_city || '—'],
                        ['📞 Téléphone', o.seller_phone || '—'],
                        ['📅 Commande', new Date(o.created_at).toLocaleDateString('fr-MA')],
                      ].map(function(kv) {
                        return (
                          <div key={kv[0]} style={{ background:C.ghost, borderRadius:10, padding:'0.6rem 0.9rem', fontSize:'0.8rem' }}>
                            <span style={{ color:C.steel }}>{kv[0]} : </span>
                            <span style={{ color:C.deep, fontWeight:600 }}>{kv[1]}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Escrow */}
                    {['confirmed','shipped'].includes(o.status) && (
                      <div style={{ background:'#EAFAF1', border:'1px solid #A9DFBF', borderRadius:10, padding:'0.7rem 1rem', marginBottom:'1rem', fontSize:'0.8rem', color:'#145A32' }}>
                        🔒 Paiement <strong>{fmt(o.final_price)} MAD</strong> sécurisé en escrow — libéré à votre confirmation de réception.
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
                      <button onClick={() => setTrackingOrder(o)}
                        style={{ background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE', padding:'0.55rem 1rem', borderRadius:100, fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                        📍 Suivre
                      </button>
                      {o.status === 'shipped' && (
                        <button onClick={() => setConfirmOrder(o)}
                          style={{ background:C.forest, color:C.cream, border:'none', padding:'0.55rem 1.1rem', borderRadius:100, fontWeight:700, fontSize:'0.82rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          ✅ Confirmer réception
                        </button>
                      )}
                      {['confirmed','shipped'].includes(o.status) && (
                        <button onClick={() => toast.info('Litige — contactez support@revex.ma')}
                          style={{ background:'#FDECEA', color:C.urgent, border:'1px solid #F1948A', padding:'0.55rem 1rem', borderRadius:100, fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          ⚖️ Litige
                        </button>
                      )}
                      {o.status === 'delivered' && !o.seller_rating && (
                        <button onClick={() => setRatingOrder(o)}
                          style={{ background:'linear-gradient(135deg,#F59E0B,#D97706)', color:'#fff', border:'none', padding:'0.55rem 1.1rem', borderRadius:100, fontSize:'0.8rem', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          ⭐ Noter
                        </button>
                      )}
                      {o.status === 'delivered' && o.seller_rating && (
                        <span style={{ background:'#FEF3C7', color:'#92400E', borderRadius:100, padding:'0.35rem 0.8rem', fontSize:'0.78rem', fontWeight:600 }}>
                          {'⭐'.repeat(o.seller_rating)} Noté
                        </span>
                      )}
                      {['delivered','shipped','confirmed'].includes(o.status) && (
                        <button onClick={() => toast.info('Facture générée !')}
                          style={{ background:'#FEF3C7', color:'#92400E', border:'1px solid #FDE68A', padding:'0.55rem 1rem', borderRadius:100, fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          🧾 Facture
                        </button>
                      )}
                      <button onClick={() => window.open('/produit/'+o.product_slug, '_blank')}
                        style={{ background:'transparent', color:C.forest, border:'1.5px solid '+C.ghost, padding:'0.55rem 1rem', borderRadius:100, fontWeight:600, fontSize:'0.8rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                        Voir →
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

    {/* Modal confirmation réception */}
    {confirmOrder && (
      <div onClick={() => setConfirmOrder(null)}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
        <div onClick={function(e){ e.stopPropagation(); }}
          style={{ background:C.white, borderRadius:20, padding:'2rem', maxWidth:420, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>📦</div>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', color:C.deep, margin:'0 0 0.4rem' }}>Confirmer la réception</h2>
            <p style={{ color:C.nardo, fontSize:'0.88rem', margin:0, lineHeight:1.6 }}>
              Vous confirmez avoir reçu <strong>{confirmOrder.product_title}</strong> de <strong>{confirmOrder.seller_company}</strong> en bon état.
            </p>
          </div>
          <div style={{ background:'#EAFAF1', border:'1px solid #A9DFBF', borderRadius:12, padding:'0.9rem', marginBottom:'1.5rem', fontSize:'0.82rem', color:'#145A32', textAlign:'center' }}>
            🔒 <strong>{fmt(confirmOrder.final_price)} MAD</strong> seront libérés de l'escrow vers le vendeur.
          </div>
          <div style={{ display:'flex', gap:'0.8rem' }}>
            <button onClick={() => setConfirmOrder(null)}
              style={{ flex:1, background:'transparent', color:C.nardo, border:'1.5px solid '+C.ghost, borderRadius:100, padding:'0.75rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              Annuler
            </button>
            <button onClick={() => confirmMutation.mutate(confirmOrder.id)}
              style={{ flex:2, background:C.eco, color:'#fff', border:'none', borderRadius:100, padding:'0.75rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'0.88rem' }}>
              ✅ Oui, j'ai bien reçu ma commande
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal notation vendeur */}
    {ratingOrder && (
      <SellerRatingModal
        order={ratingOrder}
        onClose={() => setRatingOrder(null)}
        onSubmit={function(rating, comment) { ratingMutation.mutate({ orderId:ratingOrder.id, rating:rating, comment:comment }); }}
        isLoading={ratingMutation.isLoading}
      />
    )}

    {/* Modal tracking */}
    {trackingOrder && (
      <SellerTrackingModal order={trackingOrder} onClose={() => setTrackingOrder(null)} />
    )}
    </>
  );
}

// ── SellerRatingModal ──────────────────────────────────────────
function SellerRatingModal({ order, onClose, onSubmit, isLoading }) {
  var [rating, setRating]   = React.useState(0);
  var [hover, setHover]     = React.useState(0);
  var [comment, setComment] = React.useState('');
  var labels = ['','Décevant','Passable','Bien','Très bien','Excellent'];
  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
      <div onClick={function(e){ e.stopPropagation(); }}
        style={{ background:C.white, borderRadius:24, padding:'2rem', maxWidth:420, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{ fontSize:'2rem', marginBottom:'0.4rem' }}>⭐</div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', color:C.deep, margin:'0 0 0.2rem' }}>Évaluer le vendeur</h2>
          <p style={{ color:C.nardo, fontSize:'0.82rem', margin:0 }}>{order.seller_company} · {order.order_number}</p>
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:'0.5rem', marginBottom:'0.4rem' }}>
          {[1,2,3,4,5].map(function(n) {
            return (
              <button key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                style={{ fontSize:'2rem', background:'transparent', border:'none', cursor:'pointer', transition:'transform 0.1s', transform:(hover||rating)>=n?'scale(1.2)':'scale(1)', lineHeight:1 }}>
                {(hover||rating)>=n ? '⭐' : '☆'}
              </button>
            );
          })}
        </div>
        <div style={{ textAlign:'center', height:18, marginBottom:'1rem', fontWeight:600, fontSize:'0.85rem', color:'#D97706' }}>
          {labels[hover||rating]||''}
        </div>
        <textarea value={comment} onChange={function(e){ setComment(e.target.value); }}
          placeholder="Commentaire optionnel..."
          rows={3}
          style={{ width:'100%', padding:'0.7rem 0.9rem', border:'1.5px solid '+C.ghost, borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", resize:'none', boxSizing:'border-box', outline:'none', background:C.cream, marginBottom:'1rem' }}/>
        <div style={{ display:'flex', gap:'0.7rem' }}>
          <button onClick={onClose}
            style={{ flex:1, background:'transparent', color:C.nardo, border:'1.5px solid '+C.ghost, borderRadius:100, padding:'0.7rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            Annuler
          </button>
          <button onClick={() => rating > 0 && onSubmit(rating, comment)}
            disabled={rating===0||isLoading}
            style={{ flex:2, background:rating>0?'linear-gradient(135deg,#F59E0B,#D97706)':C.ghost, color:'#fff', border:'none', borderRadius:100, padding:'0.7rem', cursor:rating>0?'pointer':'not-allowed', fontFamily:"'DM Sans',sans-serif", fontWeight:700 }}>
            {isLoading ? 'Envoi...' : rating > 0 ? 'Envoyer ('+rating+'/5)' : 'Choisir une note'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SellerTrackingModal ─────────────────────────────────────────
function SellerTrackingModal({ order, onClose }) {
  var steps = [
    { key:'pending',   icon:'📋', label:'Commande passée',       color:'#2980B9' },
    { key:'confirmed', icon:'✅', label:'Confirmée par vendeur', color:C.sage    },
    { key:'shipped',   icon:'🚛', label:'Expédiée',              color:'#E67E22' },
    { key:'delivered', icon:'📦', label:'Livrée',                color:C.eco     },
    { key:'completed', icon:'🏆', label:'Transaction certifiée', color:'#8B5CF6' },
  ];
  var order_seq = ['pending','confirmed','shipped','delivered','completed'];
  var curIdx  = order_seq.indexOf(order.status === 'disputed' ? 'confirmed' : order.status);
  var progress = [0,20,50,80,100][Math.max(0,curIdx)] || 0;
  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem', overflowY:'auto' }}>
      <div onClick={function(e){ e.stopPropagation(); }}
        style={{ background:C.cream, borderRadius:24, maxWidth:500, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.3)', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ background:'linear-gradient(135deg,'+C.deep+','+C.forest+')', padding:'1.3rem 1.5rem', borderRadius:'24px 24px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:C.cream }}>📍 Suivi commande</div>
            <div style={{ fontSize:'0.75rem', color:'rgba(244,246,244,0.55)', marginTop:2 }}>{order.order_number} · {order.product_title}</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', color:C.cream, fontSize:'0.9rem' }}>✕</button>
        </div>
        <div style={{ padding:'1.5rem' }}>
          <div style={{ background:C.white, borderRadius:14, padding:'1.1rem', marginBottom:'1rem', border:'1px solid '+C.ghost }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:C.nardo, marginBottom:'0.6rem' }}>
              <span>📍 {order.seller_city||'Vendeur'}</span>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:C.sage }}>{progress}%</span>
              <span>🏭 Destination</span>
            </div>
            <div style={{ background:C.ghost, borderRadius:100, height:8, overflow:'hidden' }}>
              <div style={{ height:'100%', width:progress+'%', background:'linear-gradient(90deg,'+C.deep+','+C.sage+')', borderRadius:100, transition:'width 0.6s ease' }}/>
            </div>
          </div>
          <div style={{ background:C.white, borderRadius:14, padding:'1.1rem', border:'1px solid '+C.ghost }}>
            <div style={{ fontWeight:700, fontSize:'0.85rem', color:C.deep, marginBottom:'0.8rem' }}>Étapes de livraison</div>
            {steps.map(function(step, i) {
              var done    = i <= curIdx;
              var current = i === curIdx;
              return (
                <div key={step.key} style={{ display:'flex', gap:'0.8rem', marginBottom:i<steps.length-1?'0.8rem':0 }}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:done?step.color:C.ghost, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem', flexShrink:0, border:current?'3px solid '+step.color:'none', boxShadow:current?'0 0 0 3px '+step.color+'22':'none' }}>
                    {done ? step.icon : '○'}
                  </div>
                  <div style={{ paddingTop:5 }}>
                    <div style={{ fontSize:'0.85rem', fontWeight:current?700:500, color:done?step.color:C.nardo }}>{step.label}</div>
                    {current && <div style={{ fontSize:'0.72rem', color:C.nardo, marginTop:1 }}>En cours</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={onClose}
            style={{ width:'100%', marginTop:'1rem', background:'transparent', color:C.nardo, border:'1.5px solid '+C.ghost, borderRadius:100, padding:'0.7rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
