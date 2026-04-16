// src/pages/seller/MyOrders.jsx — Gestion commandes vendeur
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import UserInfoModal from '../../components/ui/UserInfoModal';
import { generateContractPdf } from '../../utils/generateContract';
import { generateQualityReportPdf } from '../../utils/generateQualityReport';
import { generateInvoicePdf } from '../../utils/generateInvoice';
import { generateBonDechargement, generateBonSortie, generateBonLivraison } from '../../utils/generateLogisticsDoc';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
};

const STATUS_CONFIG = {
  pending:   { label:'⏳ En attente de confirmation', color:C.orange, bg:'#FEF5E7' },
  confirmed: { label:'✅ Confirmée',                  color:C.blue,   bg:'#EBF5FB' },
  shipped:   { label:'🚛 Expédiée',                   color:C.leaf,   bg:'#E8F8EE' },
  delivered: { label:'✅ Livrée',                     color:C.eco,    bg:'#E8F8EE' },
  cancelled: { label:'❌ Annulée',                    color:C.urgent, bg:'#FDECEA' },
};

// Actions disponibles selon le statut (côté vendeur)
const SELLER_ACTIONS = {
  pending:   ['confirm', 'cancel'],
  confirmed: ['ship', 'cancel'],
  shipped:   [],   // en attente de confirmation acheteur
  delivered: [],
  cancelled: [],
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');

export default function SellerOrders() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  // Suivi des commandes dont l'article est stocké chez REVEX (admin gère l'expédition)
  const [revexStoredOrders, setRevexStoredOrders] = useState({});

  const [selectedUser, setSelectedUser] = useState(null);

  const { data, isLoading } = useQuery(
    ['seller-orders', filter],
    () => api.get('/orders?role_as=seller' + (filter !== 'all' ? '&status='+filter : '')).then(r => r.data),
    { refetchInterval: 10000 }
  );

  const orders = data?.orders || [];

  // Vérifier si les produits sont en entrepôt REVEX (après déclaration de orders)
  React.useEffect(() => {
    if (!orders.length) return;
    const confirmed = orders.filter(o => o.status === 'confirmed' && o.product_id);
    confirmed.forEach(order => {
      if (revexStoredOrders[order.id] !== undefined) return;
      api.get('/warehouses/check-product/' + order.product_id)
        .then(r => {
          setRevexStoredOrders(prev => ({ ...prev, [order.id]: !!r.data?.warehouse }));
        })
        .catch(() => {
          setRevexStoredOrders(prev => ({ ...prev, [order.id]: false }));
        });
    });
  }, [orders.length]);

  const updateStatus = useMutation(
    ({ orderId, status, cancel_reason }) =>
      api.put('/orders/'+(orderId)+'/status', { status, cancel_reason }),
    {
      onSuccess: (_, { status }) => {
        const msgs = {
          confirmed: '✅ Commande confirmée ! L\'acheteur a été notifié.',
          shipped:   '🚛 Commande marquée comme expédiée !',
          cancelled: '❌ Commande annulée.',
        };
        toast.success(msgs[status] || 'Statut mis à jour');
        qc.invalidateQueries('seller-orders');
        qc.invalidateQueries('seller-orders-all');
        setCancelModal(null);
        setCancelReason('');
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur mise à jour')
    }
  );

  const handleAction = (order, action) => {
    if (action === 'confirm') {
      if (window.confirm('Confirmer la commande '+(order.order_number)+' de '+(order.buyer_company)+' ?')) {
        updateStatus.mutate({ orderId: order.id, status: 'confirmed' });
      }
    } else if (action === 'ship') {
      if (window.confirm('Marquer la commande '+(order.order_number)+' comme expédiée ?')) {
        updateStatus.mutate({ orderId: order.id, status: 'shipped' });
      }
    } else if (action === 'cancel') {
      setCancelModal(order);
    }
  };

  const confirmCancel = () => {
    if (!cancelModal) return;
    updateStatus.mutate({
      orderId: cancelModal.id,
      status: 'cancelled',
      cancel_reason: cancelReason || 'Annulée par le vendeur'
    });
  };

  // Stats rapides
  const byStatus = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const totalRevenu = orders
    .filter(o => o.status === 'delivered')
    .reduce((s, o) => s + Number(o.final_price||0), 0);

  const revenuEnCours = orders
    .filter(o => ['pending','confirmed','shipped'].includes(o.status))
    .reduce((s, o) => s + Number(o.final_price||0), 0);

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div style={{ background:C.cream, minHeight:'100vh' }}>
    <div style={{ maxWidth:1200, margin:'0 auto', padding:'2rem clamp(1rem,4vw,2rem) 4rem' }}>

      {/* En-tête */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.8rem', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2rem', color:C.forest }}>
            🛒 Mes commandes reçues
          </h1>
          <p style={{ color:C.muted, fontSize:'0.88rem', marginTop:'0.2rem' }}>
            {orders.length} commande(s) au total •
            <span style={{ color:C.orange, fontWeight:600, marginLeft:4 }}>{byStatus.pending||0} à confirmer</span>
          </p>
        </div>
        <Link to="/seller" style={{ background:C.beige, color:C.muted, border:'1px solid '+(C.mid)+'', padding:'0.6rem 1.2rem', borderRadius:100, textDecoration:'none', fontSize:'0.85rem' }}>
          ← Dashboard
        </Link>
      </div>

      {/* KPIs rapides */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'2rem' }}>
        {[
          { label:'Total commandes',   value:orders.length,              color:C.forest },
          { label:'CA réalisé',        value:''+(fmt(totalRevenu))+' MAD',  color:C.eco    },
          { label:'CA en cours',       value:''+(fmt(revenuEnCours))+' MAD',color:C.orange },
          { label:'À confirmer',       value:byStatus.pending||0,        color:C.urgent },
        ].map(k => (
          <div key={k.label} style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:14, padding:'1.2rem', textAlign:'center' }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', fontWeight:700, color:k.color }}>{k.value}</div>
            <div style={{ fontSize:'0.75rem', color:C.muted, marginTop:'0.2rem' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── ALERTE commandes à confirmer ── */}
      {(byStatus.pending||0) > 0 && (
        <div style={{ background:'#FEF5E7', border:'1.5px solid #F0B27A', borderRadius:14, padding:'1rem 1.5rem', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:'1rem' }}>
          <span style={{ fontSize:'1.5rem' }}>⚠️</span>
          <div>
            <div style={{ fontWeight:700, color:'#784212' }}>
              {byStatus.pending} commande(s) en attente de votre confirmation
            </div>
            <div style={{ fontSize:'0.82rem', color:'#A04000', marginTop:'0.2rem' }}>
              Confirmez rapidement pour sécuriser le paiement escrow et rassurer l'acheteur.
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        {[
          ['all',       'Toutes ('+(orders.length)+')'],
          ['pending',   '⏳ À confirmer ('+(byStatus.pending||0)+')'],
          ['confirmed', '✅ Confirmées ('+(byStatus.confirmed||0)+')'],
          ['shipped',   '🚛 Expédiées ('+(byStatus.shipped||0)+')'],
          ['delivered', '✅ Livrées ('+(byStatus.delivered||0)+')'],
          ['cancelled', '❌ Annulées ('+(byStatus.cancelled||0)+')'],
        ].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{ padding:'0.45rem 1rem', borderRadius:100, border:'1.5px solid '+(filter===val ? C.forest : C.mid)+'', background:filter===val ? C.forest : C.white, color:filter===val ? C.cream : C.muted, fontSize:'0.82rem', fontWeight:filter===val?600:400, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Liste commandes */}
      {isLoading ? (
        <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}>Chargement...</div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ textAlign:'center', padding:'4rem', color:C.muted }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem', opacity:0.3 }}>📦</div>
          <p>Aucune commande {filter !== 'all' ? 'avec le statut "'+(filter)+'"' : ''}</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {filteredOrders.map(order => {
            const st = STATUS_CONFIG[order.status] || { label:order.status, color:C.muted, bg:C.beige };
            const actions = SELLER_ACTIONS[order.status] || [];
            const imgs = typeof order.product_images === 'string'
              ? (() => { try { return JSON.parse(order.product_images); } catch { return []; } })()
              : (order.product_images || []);

            return (
              <div key={order.id} style={{ background:C.white, border:'1.5px solid '+(order.status==='pending' ? C.orange : C.mid)+'', borderRadius:18, overflow:'hidden', boxShadow: order.status==='pending' ? '0 2px 12px rgba(230,126,34,0.15)' : 'none' }}>

                {/* Header commande */}
                <div style={{ padding:'1.2rem 1.5rem', borderBottom:'1px solid '+(C.beige)+'', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                    <div>
                      <div style={{ fontWeight:700, color:C.forest, fontSize:'0.95rem' }}>{order.order_number}</div>
                      <div style={{ fontSize:'0.75rem', color:C.muted, marginTop:'0.1rem' }}>
                        Reçu le {new Date(order.created_at).toLocaleDateString('fr-MA', { day:'2-digit', month:'long', year:'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.8rem' }}>
                    <span style={{ background:st.bg, color:st.color, padding:'0.35rem 0.9rem', borderRadius:100, fontSize:'0.8rem', fontWeight:700, border:'1px solid '+(st.color)+'44' }}>
                      {st.label}
                    </span>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', fontWeight:700, color:C.forest }}>
                      {fmt(order.final_price)} MAD
                    </div>
                  </div>
                </div>

                {/* Corps commande */}
                <div style={{ padding:'1.2rem 1.5rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>

                  {/* Produit */}
                  <div>
                    <div style={{ fontSize:'0.72rem', color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.5rem' }}>Produit commandé</div>
                    <div style={{ display:'flex', gap:'0.8rem', alignItems:'flex-start' }}>
                      {imgs[0] && (
                        <div style={{ width:56, height:56, borderRadius:8, overflow:'hidden', background:C.beige, flexShrink:0 }}>
                          <img src={imgs[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} />
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight:600, color:C.forest, fontSize:'0.9rem', lineHeight:1.3 }}>{order.product_title}</div>
                        <div style={{ fontSize:'0.78rem', color:C.muted, marginTop:'0.3rem' }}>
                          Quantité : <strong>{order.quantity}</strong> unité(s)<br/>
                          Prix unitaire : <strong>{fmt(order.unit_price)} MAD</strong><br/>
                          Livraison : {order.delivery_type === 'eco' ? '🌿 Économique' : '⚡ Urgente'} (+{fmt(order.delivery_price)} MAD)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acheteur */}
                  <div>
                    <div style={{ fontSize:'0.72rem', color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.5rem' }}>Acheteur</div>
                    <div onClick={() => order.buyer_id && setSelectedUser({ id:order.buyer_id, name:order.buyer_company, role:'buyer' })}
                      style={{ fontWeight:600, color:C.forest, fontSize:'0.9rem', cursor:'pointer', textDecoration:'underline dotted' }}>
                      {order.buyer_company}
                    </div>
                    <div style={{ fontSize:'0.78rem', color:C.muted, marginTop:'0.3rem' }}>
                      📍 {order.buyer_city || '—'}<br/>
                    </div>
                    <div style={{ marginTop:'0.5rem' }}>
                      <Link to={'/messages'}
                        style={{ fontSize:'0.78rem', color:C.blue, textDecoration:'none', fontWeight:600 }}>
                        💬 Contacter l'acheteur →
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Paiement escrow */}
                {['pending','confirmed','shipped'].includes(order.status) && (
                  <div style={{ margin:'0 1.5rem', marginBottom:'1rem', background:'#E8F8EE', border:'1px solid #a8dfc0', borderRadius:10, padding:'0.6rem 1rem', fontSize:'0.78rem', color:'#145A32', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    🔒 <strong>Paiement sécurisé en escrow</strong> — sera libéré après confirmation de l'acheteur
                  </div>
                )}

                {/* Notes */}
                {order.notes && (
                  <div style={{ margin:'0 1.5rem', marginBottom:'1rem', background:C.beige, borderRadius:10, padding:'0.6rem 1rem', fontSize:'0.78rem', color:C.muted }}>
                    📝 Note acheteur : "{order.notes}"
                  </div>
                )}

                {/* ── BOUTONS D'ACTION ── */}
                {actions.length > 0 && (
                  <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid '+(C.beige)+'', background:C.cream, display:'flex', gap:'0.7rem', alignItems:'center', flexWrap:'wrap' }}>

                    {actions.includes('confirm') && (
                      <button
                        onClick={() => handleAction(order, 'confirm')}
                        disabled={updateStatus.isLoading}
                        style={{ background:C.forest, color:C.cream, border:'none', padding:'0.75rem 1.8rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                        ✅ Confirmer la commande
                      </button>
                    )}

                    {actions.includes('ship') && (
                      revexStoredOrders[order.id] === true ? (
                        /* Article stocké chez REVEX — l'admin gère l'expédition */
                        <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:14, padding:'0.7rem 1.1rem', display:'flex', alignItems:'center', gap:'0.6rem', flex:1 }}>
                          <span style={{ fontSize:'1.1rem' }}>🏢</span>
                          <div>
                            <div style={{ fontWeight:700, fontSize:'0.85rem', color:'#1D4ED8' }}>
                              Article stocké chez REVEX
                            </div>
                            <div style={{ fontSize:'0.75rem', color:'#3B82F6' }}>
                              L'équipe REVEX prend en charge l'expédition. Vous serez notifié dès l'envoi.
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAction(order, 'ship')}
                          disabled={updateStatus.isLoading}
                          style={{ background:C.blue, color:'#fff', border:'none', padding:'0.75rem 1.8rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          🚛 Marquer comme expédiée
                        </button>
                      )
                    )}

                    {actions.includes('cancel') && (
                      <button
                        onClick={() => handleAction(order, 'cancel')}
                        disabled={updateStatus.isLoading}
                        style={{ background:'transparent', color:C.urgent, border:'1.5px solid '+(C.urgent)+'', padding:'0.7rem 1.4rem', borderRadius:100, fontWeight:600, fontSize:'0.88rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                        ✗ Annuler
                      </button>
                    )}

                    {order.status === 'pending' && (
                      <div style={{ fontSize:'0.75rem', color:C.muted, marginLeft:'auto' }}>
                        ⚡ Confirmez rapidement pour rassurer l'acheteur
                      </div>
                    )}
                    {order.status === 'confirmed' && (
                      <div style={{ fontSize:'0.75rem', color:C.muted, marginLeft:'auto' }}>
                        📦 Préparez l'envoi puis cliquez "Expédiée"
                      </div>
                    )}
                  </div>
                )}

                {/* ── Documents REVEX ── */}
                <div style={{ padding:'0.75rem 1.5rem', borderTop:'1px solid '+C.beige, display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                  <button onClick={() => generateContractPdf({
                      orderNumber: order.order_number,
                      productTitle: order.product_title,
                      reference: order.reference,
                      grade: order.quality_grade,
                      quantity: order.quantity,
                      unit: order.unit,
                      unitPrice: order.unit_price,
                      totalPrice: order.final_price,
                      deliveryType: order.delivery_type,
                      deliveryPrice: order.delivery_price,
                      sellerCompany: order.seller_company,
                      sellerCity: order.seller_city,
                      buyerCompany: order.buyer_company,
                      buyerCity: order.buyer_city,
                    })}
                    style={{ background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE', padding:'0.4rem 0.9rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                    📄 Contrat de vente
                  </button>
                  <button onClick={() => generateQualityReportPdf({
                      productTitle: order.product_title,
                      reference: order.reference,
                      grade: order.quality_grade,
                      quantity: order.quantity,
                      unit: order.unit,
                      price: order.unit_price,
                      sellerCompany: order.seller_company,
                      locationCity: order.seller_city,
                    })}
                    style={{ background:'#F0FDF4', color:'#059669', border:'1px solid #A7F3D0', padding:'0.4rem 0.9rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                    🔬 Rapport qualité
                  </button>
                  <button onClick={() => generateInvoicePdf({
                      type: 'order',
                      issuedTo: 'seller',
                      orderNumber: order.order_number,
                      productTitle: order.product_title,
                      reference: order.reference,
                      grade: order.quality_grade,
                      quantity: order.quantity,
                      unit: order.unit,
                      unitPrice: order.unit_price,
                      totalPrice: order.final_price,
                      deliveryPrice: order.delivery_price,
                      deliveryType: order.delivery_type,
                      sellerCompany: order.seller_company,
                      sellerCity: order.seller_city,
                      buyerCompany: order.buyer_company,
                      buyerCity: order.buyer_city,
                      createdAt: order.created_at,
                    })}
                    style={{ background:'#FEF3C7', color:'#92400E', border:'1px solid #FDE68A', padding:'0.4rem 0.9rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                    🧾 Facture vendeur
                  </button>
                  {/* ── Bon de déchargement (si livré depuis entrepôt) ── */}
                  {order.status === 'delivered' && (
                    <button onClick={() => generateBonDechargement({
                        orderId: order.id,
                        orderNumber: order.order_number,
                        productTitle: order.product_title,
                        reference: order.reference,
                        grade: order.quality_grade,
                        quantity: order.quantity,
                        unit: order.unit,
                        buyerCompany: order.buyer_company,
                        buyerCity: order.buyer_city,
                        sellerCompany: order.seller_company,
                        warehouseName: 'Entrepôt REVEX',
                        deliveryType: order.delivery_type,
                        finalPrice: order.final_price,
                      })}
                      style={{ background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA', padding:'0.4rem 0.9rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                      📤 Bon déchargement
                    </button>
                  )}
                  {/* ── Bon de sortie (si vendu) ── */}
                  {order.status === 'delivered' && (
                    <button onClick={() => generateBonSortie({
                        orderId: order.id,
                        orderNumber: order.order_number,
                        productTitle: order.product_title,
                        reference: order.reference,
                        grade: order.quality_grade,
                        quantity: order.quantity,
                        unit: order.unit,
                        buyerCompany: order.buyer_company,
                        buyerCity: order.buyer_city,
                        sellerCompany: order.seller_company,
                        finalPrice: order.final_price,
                        createdAt: order.created_at,
                      })}
                      style={{ background:'#F5F3FF', color:'#8B5CF6', border:'1px solid #DDD6FE', padding:'0.4rem 0.9rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                      📦 Bon de sortie
                    </button>
                  )}
                  {/* ── Bon de livraison ── */}
                  {['shipped','delivered'].includes(order.status) && (
                    <button onClick={() => generateBonLivraison({
                        orderId: order.id,
                        orderNumber: order.order_number,
                        productTitle: order.product_title,
                        reference: order.reference,
                        grade: order.quality_grade,
                        quantity: order.quantity,
                        unit: order.unit,
                        buyerCompany: order.buyer_company,
                        buyerCity: order.buyer_city,
                        buyerPhone: order.buyer_phone,
                        sellerCompany: order.seller_company,
                        sellerCity: order.seller_city,
                        deliveryType: order.delivery_type,
                        finalPrice: order.final_price,
                      })}
                      style={{ background:'#ECFDF5', color:'#059669', border:'1px solid #A7F3D0', padding:'0.4rem 0.9rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                      🚛 Bon de livraison
                    </button>
                  )}
                </div>

                {/* Statut final */}
                {order.status === 'delivered' && (
                  <div style={{ padding:'0.8rem 1.5rem', borderTop:'1px solid '+(C.beige)+'', background:'#E8F8EE', fontSize:'0.8rem', color:C.eco }}>
                    ✅ Livraison confirmée par l'acheteur • Paiement libéré
                    {order.delivered_at && ' le '+(new Date(order.delivered_at).toLocaleDateString('fr-MA'))+''}
                  </div>
                )}
                {order.status === 'shipped' && (
                  <div style={{ padding:'0.8rem 1.5rem', borderTop:'1px solid '+(C.beige)+'', background:'#EBF5FB', fontSize:'0.8rem', color:C.blue }}>
                    🚛 En attente de confirmation de réception par l'acheteur
                    {order.shipped_at && ' • Expédié le '+(new Date(order.shipped_at).toLocaleDateString('fr-MA'))+''}
                  </div>
                )}
                {order.status === 'cancelled' && order.cancel_reason && (
                  <div style={{ padding:'0.8rem 1.5rem', borderTop:'1px solid '+(C.beige)+'', background:'#FDECEA', fontSize:'0.8rem', color:C.urgent }}>
                    Motif d'annulation : {order.cancel_reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>

    {/* ── MODAL ANNULATION ── */}
    {cancelModal && (
      <div onClick={() => { setCancelModal(null); setCancelReason(''); }}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
        <div onClick={e => e.stopPropagation()}
          style={{ background:C.white, borderRadius:20, padding:'2rem', maxWidth:440, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', color:C.urgent, marginBottom:'0.5rem' }}>
            ✗ Annuler la commande
          </h2>
          <p style={{ fontSize:'0.85rem', color:C.muted, marginBottom:'1.2rem' }}>
            Commande <strong>{cancelModal.order_number}</strong> de <strong>{cancelModal.buyer_company}</strong>.<br/>
            Le stock sera automatiquement remis en vente.
          </p>
          <div style={{ marginBottom:'1.2rem' }}>
            <label style={{ fontSize:'0.82rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.4rem' }}>
              Motif d'annulation *
            </label>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              rows={3} placeholder="Ex: Stock indisponible, erreur de prix, produit endommagé..."
              style={{ width:'100%', padding:'0.75rem 1rem', border:'1.5px solid '+(C.mid)+'', borderRadius:10, fontSize:'0.9rem', fontFamily:"'DM Sans',sans-serif", outline:'none', resize:'vertical', boxSizing:'border-box' }} />
          </div>
          <div style={{ display:'flex', gap:'0.8rem' }}>
            <button onClick={confirmCancel} disabled={updateStatus.isLoading}
              style={{ flex:1, background:C.urgent, color:'#fff', border:'none', padding:'0.85rem', borderRadius:100, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              {updateStatus.isLoading ? 'Annulation...' : 'Confirmer l\'annulation'}
            </button>
            <button onClick={() => { setCancelModal(null); setCancelReason(''); }}
              style={{ background:'transparent', color:C.muted, border:'1px solid '+(C.mid)+'', padding:'0.85rem 1.2rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              Retour
            </button>
          </div>
        </div>
      </div>
    )}
    {selectedUser && (
      <UserInfoModal
        userId={selectedUser.id}
        userName={selectedUser.name}
        userRole={selectedUser.role}
        onClose={() => setSelectedUser(null)}
      />
    )}
    </div>
  );
}
