// src/pages/buyer/MyOrders.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import DisputeModal from '../../components/disputes/DisputeModal';
import BackButton from '../../components/ui/BackButton';
import UserInfoModal from '../../components/ui/UserInfoModal';
import { generateCertificatePdf } from '../../utils/generateCertificate';
import { generateContractPdf } from '../../utils/generateContract';
import { generateQualityReportPdf } from '../../utils/generateQualityReport';
import { generateBonCommande, generateBonLivraison } from '../../utils/generateLogisticsDoc';
import { generateInvoicePdf } from '../../utils/generateInvoice';
const C = { forest: '#1E3D0F', leaf: '#4A7C2F', cream: '#F6F1E7', beige: '#EDE6D3', beigemid: '#D9CEBC', white: '#FDFAF4', muted: '#5C5C50', eco: '#27AE60', urgent: '#C0392B' };

export default function MyOrders() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [disputeOrder, setDisputeOrder] = useState(null);
  const [selectedUser, setSelectedUser]  = useState(null);
  const [trackingOrder, setTrackingOrder] = useState(null);

  const { data } = useQuery(['orders-buyer', statusFilter], () =>
    api.get('/orders?role_as=buyer' + (statusFilter ? '&status='+statusFilter : '')).then(r => r.data)
  );

  const confirmMutation = useMutation(
    (orderId) => api.put('/orders/'+orderId+'/status', { status: 'delivered' }),
    { onSuccess: () => { toast.success('✅ Réception confirmée ! Paiement libéré au vendeur.'); qc.invalidateQueries('orders-buyer'); } }
  );

  const statusMap = {
    pending:  { label: '⏳ En attente',  color: '#E67E22' },
    confirmed:{ label: '✅ Confirmée',   color: '#2980B9' },
    shipped:  { label: '🚛 Expédiée',   color: C.leaf    },
    delivered:{ label: '✅ Livrée',      color: C.eco     },
    cancelled:{ label: '❌ Annulée',     color: C.urgent  },
    disputed: { label: '⚖️ En litige',  color: '#8E44AD' },
  };

  return (
    <>
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '2.5rem 2rem' }}>

      <div style={{ marginBottom:'1rem' }}>
        <BackButton to={'/buyer'} label="Mes commandes" />
      </div>      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', color: C.forest, marginBottom: '1.5rem' }}>Mes commandes</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[['', 'Toutes'], ['pending', 'En attente'], ['confirmed', 'Confirmées'], ['shipped', 'Expédiées'], ['delivered', 'Livrées']].map(([v, l]) => (
          <button key={v} onClick={() => setStatusFilter(v)} style={{ padding: '0.4rem 0.9rem', borderRadius: 100, border: '1px solid '+(statusFilter===v?C.forest:C.beigemid), background: statusFilter === v ? C.forest : C.white, color: statusFilter === v ? C.cream : C.muted, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{l}</button>
        ))}
      </div>

      {(data?.orders || []).map(o => {
        const st = statusMap[o.status] || { label: o.status, color: C.muted };
        return (
          <div key={o.id} style={{ background: C.white, border: '1px solid '+C.beigemid, borderRadius: 16, padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, color: C.forest, fontSize: '1rem' }}>{o.order_number}</div>
                <div style={{ fontSize: '0.82rem', color: C.muted, marginTop: '0.2rem' }}>
                  Vendeur : <span onClick={() => o.seller_id && setSelectedUser({ id:o.seller_id, name:o.seller_company, role:'seller' })}
                    style={{ color:C.leaf, fontWeight:600, cursor:'pointer', textDecoration:'underline dotted' }}>
                    {o.seller_company}
                  </span> • {new Date(o.created_at).toLocaleDateString('fr-MA')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ background: st.color + '22', color: st.color, padding: '0.3rem 0.8rem', borderRadius: 100, fontSize: '0.8rem', fontWeight: 600 }}>{st.label}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem', fontWeight: 700, color: C.forest, marginTop: '0.3rem' }}>{Number(o.final_price).toLocaleString()} MAD</div>
              </div>
            </div>
            <div style={{ background: C.beige, borderRadius: 10, padding: '0.8rem 1rem', marginBottom: '0.6rem', fontSize: '0.85rem', color: C.muted }}>
              📦 {o.product_title} • Qté: {o.quantity} • Livraison: {o.delivery_type === 'eco' ? '🌿 Économique' : '⚡ Urgente'} (+{Number(o.delivery_price).toLocaleString()} MAD)
            </div>

            {/* ── Trajet retour à vide assigné ── */}
            {o.delivery_type === 'eco' && o.transport_id && (
              <div style={{ background:'#E8F8EE', border:'1px solid #a8dfc0', borderRadius:10, padding:'0.7rem 1rem', marginBottom:'0.6rem', fontSize:'0.82rem' }}>
                <div style={{ fontWeight:700, color:'#145A32', marginBottom:'0.2rem' }}>🚛 Livraison retour à vide</div>
                <div style={{ color:'#1E8449' }}>
                  Statut transport : <strong>{
                    o.transport_status === 'matched'              ? '🔗 Trajet assigné'
                    : o.transport_status === 'confirmed_by_carrier' ? '✅ Transporteur confirmé'
                    : o.transport_status === 'picked_up'            ? '📦 Colis pris en charge'
                    : o.transport_status === 'delivered'            ? '✅ Livré'
                    : '⏳ En attente'
                  }</strong>
                </div>
              </div>
            )}
            {o.delivery_type === 'eco' && !o.transport_id && o.status === 'confirmed' && (
              <div style={{ background:'#FEF5E7', border:'1px solid #F0B27A', borderRadius:10, padding:'0.7rem 1rem', marginBottom:'0.6rem', fontSize:'0.8rem', color:'#784212' }}>
                ⏳ Le vendeur recherche un transporteur retour à vide pour votre commande.
              </div>
            )}

            {/* Escrow status */}
            {['confirmed', 'shipped'].includes(o.status) && (
              <div style={{ background: '#E8F8EE', border: '1px solid #a8dfc0', borderRadius: 10, padding: '0.6rem 1rem', marginBottom: '0.8rem', fontSize: '0.8rem', color: '#145A32' }}>
                🔒 Paiement sécurisé en escrow — sera libéré à votre confirmation de réception.
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {/* ── Bouton Traçabilité ── */}
              <button onClick={() => setTrackingOrder(o)}
                style={{ background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE', padding:'0.6rem 1.2rem', borderRadius:100, fontSize:'0.82rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                📍 Suivre ma commande
              </button>
              {/* ── Contrat ── */}
              <button onClick={() => generateContractPdf({
                  orderNumber: o.order_number,
                  productTitle: o.product_title,
                  reference: o.reference,
                  grade: o.quality_grade,
                  quantity: o.quantity,
                  unit: o.unit,
                  unitPrice: o.unit_price,
                  totalPrice: o.final_price,
                  deliveryType: o.delivery_type,
                  deliveryPrice: o.delivery_price,
                  sellerCompany: o.seller_company,
                  sellerCity: o.seller_city,
                  buyerCompany: o.buyer_company,
                  buyerCity: o.buyer_city,
                })}
                style={{ background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE', padding:'0.6rem 1.2rem', borderRadius:100, fontSize:'0.82rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                📄 Contrat
              </button>
              {/* ── Rapport qualité ── */}
              <button onClick={() => generateQualityReportPdf({
                  productTitle: o.product_title,
                  reference: o.reference,
                  grade: o.quality_grade,
                  quantity: o.quantity,
                  unit: o.unit,
                  price: o.unit_price,
                  sellerCompany: o.seller_company,
                  locationCity: o.seller_city,
                })}
                style={{ background:'#F0FDF4', color:'#059669', border:'1px solid #A7F3D0', padding:'0.6rem 1.2rem', borderRadius:100, fontSize:'0.82rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                🔬 Qualité
              </button>
              {/* ── Facture acheteur ── */}
              <button onClick={() => generateInvoicePdf({
                  type: 'order',
                  issuedTo: 'buyer',
                  orderNumber: o.order_number,
                  productTitle: o.product_title,
                  reference: o.reference,
                  grade: o.quality_grade,
                  quantity: o.quantity,
                  unit: o.unit,
                  unitPrice: o.unit_price,
                  totalPrice: o.final_price,
                  deliveryPrice: o.delivery_price,
                  deliveryType: o.delivery_type,
                  sellerCompany: o.seller_company,
                  sellerCity: o.seller_city,
                  buyerCompany: o.buyer_company,
                  buyerCity: o.buyer_city,
                  createdAt: o.created_at,
                })}
                style={{ background:'#FEF3C7', color:'#92400E', border:'1px solid #FDE68A', padding:'0.6rem 1.2rem', borderRadius:100, fontSize:'0.82rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                🧾 Facture
              </button>
              {/* ── Bon de commande ── */}
              <button onClick={() => generateBonCommande({
                  orderId: o.id,
                  orderNumber: o.order_number,
                  productTitle: o.product_title,
                  reference: o.reference,
                  grade: o.quality_grade,
                  quantity: o.quantity,
                  unit: o.unit,
                  unitPrice: o.unit_price,
                  finalPrice: o.final_price,
                  deliveryPrice: o.delivery_price,
                  deliveryType: o.delivery_type,
                  buyerCompany: o.buyer_company,
                  buyerCity: o.buyer_city,
                  sellerCompany: o.seller_company,
                  sellerCity: o.seller_city,
                  createdAt: o.created_at,
                  notes: o.notes,
                })}
                style={{ background:'#FFFBEB', color:'#92400E', border:'1px solid #FDE68A', padding:'0.6rem 1.2rem', borderRadius:100, fontSize:'0.82rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                📋 Bon de commande
              </button>
              {/* ── Bon de livraison ── */}
              {['shipped','delivered'].includes(o.status) && (
                <button onClick={() => generateBonLivraison({
                    orderId: o.id,
                    orderNumber: o.order_number,
                    productTitle: o.product_title,
                    reference: o.reference,
                    grade: o.quality_grade,
                    quantity: o.quantity,
                    unit: o.unit,
                    buyerCompany: o.buyer_company,
                    buyerCity: o.buyer_city,
                    buyerPhone: o.buyer_phone,
                    sellerCompany: o.seller_company,
                    sellerCity: o.seller_city,
                    deliveryType: o.delivery_type,
                    finalPrice: o.final_price,
                  })}
                  style={{ background:'#ECFDF5', color:'#059669', border:'1px solid #A7F3D0', padding:'0.6rem 1.2rem', borderRadius:100, fontSize:'0.82rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  🚛 Bon de livraison
                </button>
              )}
              {o.status === 'shipped' && (
                <button onClick={() => window.confirm('Confirmer la réception et libérer le paiement ?') && confirmMutation.mutate(o.id)} style={{ background: C.eco, color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 100, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  ✅ Confirmer réception
                </button>
              )}
              {['confirmed', 'shipped'].includes(o.status) && (
                <button onClick={() => setDisputeOrder(o)}
                  style={{ background: C.urgent, color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 100, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  ⚖️ Ouvrir un litige
                </button>
              )}
              {o.status === 'disputed' && (
                <span style={{ background:'#F3E5F5', color:'#8E44AD', borderRadius:100, padding:'0.4rem 0.9rem', fontSize:'0.78rem', fontWeight:600 }}>
                  ⚖️ Litige en cours d'examen
                </span>
              )}
            </div>
          </div>
        );
      })}
      {data?.orders?.length === 0 && <div style={{ textAlign: 'center', padding: '4rem', color: C.muted }}>Aucune commande trouvée</div>}
    </div>

    {/* Modal litige */}
    {disputeOrder && (
      <DisputeModal
        order={disputeOrder}
        onClose={() => setDisputeOrder(null)}
      />
    )}
    {/* Modal info vendeur */}
    {selectedUser && (
      <UserInfoModal
        userId={selectedUser.id}
        userName={selectedUser.name}
        userRole={selectedUser.role}
        onClose={() => setSelectedUser(null)}
      />
    )}
    {/* Modal traçabilité */}
    {trackingOrder && (
      <TrackingModal order={trackingOrder} onClose={() => setTrackingOrder(null)} />
    )}
    </>
  );
}

// ── Composant TrackingModal ────────────────────────────────────
function TrackingModal({ order, onClose }) {
  const C = {
    forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
    cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
    white:'#FDFAF4', muted:'#5C5C50',
    eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
  };

  // Étapes de traçabilité selon le statut
  const ALL_STEPS = [
    {
      key: 'pending',
      icon: '📋',
      label: 'Commande passée',
      desc: 'Votre commande a été enregistrée et transmise au vendeur.',
      color: C.blue,
    },
    {
      key: 'confirmed',
      icon: '✅',
      label: 'Commande confirmée',
      desc: 'Le vendeur a confirmé la disponibilité et la qualité de la pièce. Paiement sécurisé en escrow.',
      color: C.leaf,
    },
    {
      key: 'shipped',
      icon: '🚛',
      label: 'Expédiée',
      desc: order.delivery_type === 'eco'
        ? 'Votre colis est pris en charge par un transporteur retour à vide REVEX.'
        : 'Votre colis est en route via livraison urgente.',
      color: C.orange,
    },
    {
      key: 'delivered',
      icon: '📦',
      label: 'Livrée',
      desc: 'Colis livré. Confirmez la réception pour libérer le paiement au vendeur.',
      color: C.eco,
    },
    {
      key: 'completed',
      icon: '🏆',
      label: 'Transaction certifiée',
      desc: 'Transaction complète. Certificat digital de traçabilité REVEX émis avec QR code.',
      color: '#8B5CF6',
    },
  ];

  const STATUS_ORDER = ['pending','confirmed','shipped','delivered','completed'];

  // Déterminer l'index actuel
  const currentStatus = order.status === 'disputed' ? 'confirmed' : order.status;
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);

  // Informations de localisation selon le transport
  const getLocationInfo = () => {
    const ts = order.transport_status;
    if (!order.transport_id) {
      if (order.status === 'pending')   return { city:'—', detail:'En attente de confirmation vendeur', progress:10 };
      if (order.status === 'confirmed') return { city: order.seller_city || 'Site vendeur', detail:'Préparation de l\'expédition en cours', progress:25 };
      if (order.status === 'shipped')   return { city:'En transit', detail:'Expédié depuis '+( order.seller_city||'le site vendeur'), progress:65 };
      if (order.status === 'delivered') return { city: order.delivery_city || 'Destination', detail:'Livré — en attente de confirmation', progress:90 };
      return { city:'—', detail:'Statut inconnu', progress:0 };
    }
    if (ts === 'matched')               return { city: order.departure_city || 'Départ', detail:'Transporteur assigné — trajet planifié', progress:35 };
    if (ts === 'confirmed_by_carrier')  return { city: order.departure_city || 'Départ', detail:'Transporteur confirmé — ramassage imminent', progress:50 };
    if (ts === 'picked_up')             return { city:'En transit', detail:'Colis pris en charge · Retour à vide REVEX', progress:70 };
    if (ts === 'delivered')             return { city: order.delivery_city || 'Destination', detail:'Livré par transporteur REVEX', progress:95 };
    return { city:'—', detail:'Transport en cours d\'assignation', progress:20 };
  };

  const loc = getLocationInfo();

  // Historique des événements
  const getEvents = () => {
    const events = [];
    const d = new Date(order.created_at);
    const fmt = (date, offset) => {
      const nd = new Date(date.getTime() + offset * 60 * 60 * 1000);
      return nd.toLocaleString('fr-MA', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
    };
    events.push({ time: fmt(d, 0),  icon:'📋', label:'Commande '+order.order_number+' créée',              color: C.blue });
    if (currentIdx >= 1) events.push({ time: fmt(d, 4),  icon:'🔒', label:'Paiement '+Number(order.final_price).toLocaleString()+' MAD sécurisé en escrow', color: C.leaf });
    if (currentIdx >= 1) events.push({ time: fmt(d, 5),  icon:'✅', label:'Commande confirmée par '+order.seller_company, color: C.leaf });
    if (currentIdx >= 1) events.push({ time: fmt(d, 8),  icon:'🔬', label:'Contrôle qualité — Certificat Grade '+( order.quality_grade||'A'), color: '#8B5CF6' });
    if (currentIdx >= 2 && order.delivery_type === 'eco') {
      events.push({ time: fmt(d, 24), icon:'🚛', label:'Transporteur retour à vide assigné', color: C.orange });
      events.push({ time: fmt(d, 26), icon:'📦', label:'Colis pris en charge — départ '+( order.seller_city||'site vendeur'), color: C.orange });
    }
    if (currentIdx >= 2 && order.delivery_type !== 'eco') {
      events.push({ time: fmt(d, 12), icon:'🚀', label:'Expédition urgente lancée', color: C.orange });
    }
    if (currentIdx >= 3) events.push({ time: fmt(d, 48), icon:'📦', label:'Livraison confirmée à destination', color: C.eco });
    if (order.status === 'disputed')  events.push({ time: fmt(d, 50), icon:'⚖️', label:'Litige ouvert — arbitrage REVEX en cours', color: C.urgent });
    return events.reverse();
  };

  const events = getEvents();

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', overflowY:'auto' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'#F6F1E7', borderRadius:24, maxWidth:560, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,0.25)', maxHeight:'94vh', overflowY:'auto', margin:'auto' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', padding:'1.4rem 1.8rem', borderRadius:'24px 24px 0 0', position:'relative' }}>
          <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', border:'1px solid rgba(126,168,106,0.15)', pointerEvents:'none' }}/>
          <button onClick={onClose}
            style={{ position:'absolute', top:14, right:16, background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', color:'#F6F1E7', fontSize:'0.85rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
            ✕
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:'0.8rem', marginBottom:'0.5rem' }}>
            <span style={{ fontSize:'1.5rem' }}>📍</span>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', fontWeight:700, color:'#F6F1E7' }}>
                Traçabilité & Localisation
              </div>
              <div style={{ fontSize:'0.78rem', color:'rgba(246,241,231,0.6)' }}>
                {order.order_number} · {order.product_title}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:'1.5rem 1.8rem' }}>

          {/* ── Localisation en temps réel ── */}
          <div style={{ background:'#fff', borderRadius:16, padding:'1.2rem', marginBottom:'1.2rem', border:'1px solid #D9CEBC', boxShadow:'0 2px 10px rgba(30,61,15,0.05)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem', marginBottom:'0.8rem' }}>
              <div style={{ fontWeight:700, fontSize:'0.88rem', color:C.forest }}>🗺️ Localisation actuelle</div>
              <span style={{ fontSize:'0.7rem', color:C.muted, background:'#F6F1E7', padding:'0.2rem 0.6rem', borderRadius:100 }}>
                Mis à jour à l'instant
              </span>
            </div>

            {/* Barre de progression */}
            <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.8rem' }}>
              <span style={{ fontSize:'0.8rem', color:C.muted, whiteSpace:'nowrap', minWidth:80 }}>
                📍 {order.seller_city || 'Vendeur'}
              </span>
              <div style={{ flex:1, background:'#EDE6D3', borderRadius:100, height:8, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', left:0, top:0, height:'100%', width:loc.progress+'%', background:'linear-gradient(90deg,#1E3D0F,#4A7C2F)', borderRadius:100, transition:'width 0.8s ease' }}/>
                {/* Moving dot */}
                <div style={{ position:'absolute', top:'50%', left:loc.progress+'%', transform:'translate(-50%,-50%)', width:14, height:14, background:'#27AE60', borderRadius:'50%', border:'2px solid #fff', boxShadow:'0 0 6px rgba(39,174,96,0.6)' }}/>
              </div>
              <span style={{ fontSize:'0.8rem', color:C.muted, whiteSpace:'nowrap', minWidth:80, textAlign:'right' }}>
                🏭 {order.delivery_city || 'Destination'}
              </span>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:C.forest }}>
                  📌 {loc.city}
                </div>
                <div style={{ fontSize:'0.78rem', color:C.muted, marginTop:2 }}>{loc.detail}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'0.72rem', color:C.muted }}>Progression</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:700, color:C.leaf }}>{loc.progress}%</div>
              </div>
            </div>

            {/* Infos transport eco */}
            {order.delivery_type === 'eco' && order.transport_id && (
              <div style={{ background:'#ECFDF5', borderRadius:10, padding:'0.7rem 0.9rem', marginTop:'0.8rem', fontSize:'0.78rem' }}>
                <div style={{ fontWeight:700, color:'#065F46', marginBottom:4 }}>🌿 Transport Retour à Vide REVEX</div>
                <div style={{ color:'#047857', display:'flex', gap:'1rem', flexWrap:'wrap' }}>
                  {order.carrier_company && <span>🚛 {order.carrier_company}</span>}
                  {order.price_per_kg && <span>💰 {order.price_per_kg} MAD/kg</span>}
                  {order.departure_city && order.arrival_city && (
                    <span>📍 {order.departure_city} → {order.arrival_city}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Timeline traçabilité ── */}
          <div style={{ background:'#fff', borderRadius:16, padding:'1.2rem', marginBottom:'1.2rem', border:'1px solid #D9CEBC' }}>
            <div style={{ fontWeight:700, fontSize:'0.88rem', color:C.forest, marginBottom:'1rem' }}>🔍 Étapes de traçabilité</div>

            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {ALL_STEPS.map((step, i) => {
                const isDone   = i <= currentIdx;
                const isCurrent = i === currentIdx;
                const isLast   = i === ALL_STEPS.length - 1;
                return (
                  <div key={step.key} style={{ display:'flex', gap:'0.9rem' }}>
                    {/* Ligne verticale */}
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0, width:32 }}>
                      <div style={{
                        width:32, height:32, borderRadius:'50%',
                        background: isDone ? step.color : '#EDE6D3',
                        border: isCurrent ? '3px solid '+step.color : '2px solid '+(isDone ? step.color : '#D9CEBC'),
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'0.9rem', flexShrink:0,
                        boxShadow: isCurrent ? '0 0 0 4px '+step.color+'22' : 'none',
                        transition:'all 0.3s',
                      }}>
                        {isDone ? step.icon : '○'}
                      </div>
                      {!isLast && (
                        <div style={{ width:2, flex:1, minHeight:24, background: i < currentIdx ? step.color : '#D9CEBC', marginTop:2, marginBottom:2 }}/>
                      )}
                    </div>
                    {/* Contenu */}
                    <div style={{ paddingBottom: isLast ? 0 : '1rem', paddingTop:'0.25rem', flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                        <span style={{ fontSize:'0.88rem', fontWeight:isCurrent?700:600, color: isDone ? step.color : C.muted }}>
                          {step.label}
                        </span>
                        {isCurrent && (
                          <span style={{ background:step.color+'22', color:step.color, fontSize:'0.65rem', fontWeight:700, padding:'0.1rem 0.5rem', borderRadius:100 }}>
                            EN COURS
                          </span>
                        )}
                        {isDone && !isCurrent && (
                          <span style={{ color:step.color, fontSize:'0.75rem' }}>✓</span>
                        )}
                      </div>
                      {isDone && (
                        <div style={{ fontSize:'0.77rem', color:C.muted, lineHeight:1.5 }}>{step.desc}</div>
                      )}
                      {order.status === 'disputed' && step.key === 'confirmed' && (
                        <div style={{ fontSize:'0.75rem', color:C.urgent, fontWeight:600, marginTop:4 }}>
                          ⚖️ Litige ouvert — arbitrage REVEX en cours (SLA 72h)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Historique des événements ── */}
          <div style={{ background:'#fff', borderRadius:16, padding:'1.2rem', marginBottom:'1.2rem', border:'1px solid #D9CEBC' }}>
            <div style={{ fontWeight:700, fontSize:'0.88rem', color:C.forest, marginBottom:'0.8rem' }}>📅 Historique des événements</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.55rem' }}>
              {events.map((ev, i) => (
                <div key={i} style={{ display:'flex', gap:'0.7rem', alignItems:'flex-start', padding:'0.55rem 0.8rem', background:i===0?'#F0FDF4':'#F6F1E7', borderRadius:10, border:i===0?'1px solid #A7F3D0':'1px solid transparent' }}>
                  <span style={{ fontSize:'1rem', flexShrink:0, marginTop:1 }}>{ev.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'0.82rem', fontWeight:600, color:ev.color }}>{ev.label}</div>
                    <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:1 }}>🕐 {ev.time}</div>
                  </div>
                  {i === 0 && <span style={{ fontSize:'0.65rem', color:'#059669', fontWeight:700, background:'#D1FAE5', padding:'0.15rem 0.5rem', borderRadius:100, flexShrink:0, alignSelf:'center' }}>DERNIER</span>}
                </div>
              ))}
            </div>
          </div>

          {/* ── Certificat de traçabilité ── */}
          <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', borderRadius:16, padding:'1.2rem', marginBottom:'1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem' }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', color:'#F6F1E7', fontWeight:700, marginBottom:4 }}>
                  📜 Certificat Digital REVEX
                </div>
                <div style={{ fontSize:'0.75rem', color:'rgba(246,241,231,0.6)' }}>
                  {order.status === 'delivered' || order.status === 'completed'
                    ? 'Certificat émis · QR code vérifiable · Opposable juridiquement'
                    : 'Sera émis automatiquement à la confirmation de réception'}
                </div>
              </div>
              <div style={{ display:'flex', gap:'0.5rem' }}>
                {(order.status === 'delivered' || order.status === 'completed') ? (
                  <button
                    onClick={() => generateCertificatePdf({
                      type: 'order',
                      id: order.id,
                      orderNumber: order.order_number,
                      title: order.product_title,
                      grade: order.quality_grade,
                      price: order.final_price,
                      quantity: order.quantity,
                      sellerCompany: order.seller_company,
                      buyerCompany: order.buyer_company,
                      deliveryType: order.delivery_type,
                      locationCity: order.seller_city,
                      createdAt: order.created_at,
                    })}
                    style={{ background:'#F6F1E7', color:'#1E3D0F', border:'none', borderRadius:100, padding:'0.55rem 1.1rem', fontSize:'0.8rem', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    ⬇️ Télécharger
                  </button>
                ) : (
                  <span style={{ background:'rgba(255,255,255,0.1)', color:'rgba(246,241,231,0.6)', borderRadius:100, padding:'0.4rem 0.9rem', fontSize:'0.75rem', border:'1px solid rgba(255,255,255,0.15)' }}>
                    🔒 En attente de livraison
                  </span>
                )}
              </div>
            </div>

            {/* Infos certificat */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginTop:'0.9rem' }}>
              {[
                ['N° commande', order.order_number],
                ['Produit', (order.product_title||'').substring(0,25)+'...'],
                ['Vendeur', order.seller_company],
                ['Grade certifié', 'Grade '+(order.quality_grade||'A')],
                ['Valeur', Number(order.final_price).toLocaleString()+' MAD'],
                ['Méthode', order.delivery_type==='eco'?'🌿 Retour à vide':'⚡ Urgent'],
              ].map(([k,v]) => (
                <div key={k} style={{ background:'rgba(255,255,255,0.07)', borderRadius:8, padding:'0.45rem 0.7rem' }}>
                  <div style={{ fontSize:'0.65rem', color:'rgba(246,241,231,0.45)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{k}</div>
                  <div style={{ fontSize:'0.82rem', color:'#F6F1E7', fontWeight:600, marginTop:1 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={onClose}
            style={{ width:'100%', background:'transparent', color:C.muted, border:'1.5px solid #D9CEBC', borderRadius:100, padding:'0.75rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'0.88rem' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
