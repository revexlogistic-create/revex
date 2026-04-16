// src/pages/auto/AutoProductDetail.jsx
// Detail page pour pièces automobiles — design particulier

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

const CA = {
  red:'#1A3C2E', darkRed:'#0F2318',
  cream:'#F4F6F4', beige:'#E8EDE8', mid:'#C8D4C8',
  white:'#FFFFFF', muted:'#4A4E5A', dark:'#1C1F23',
  blue:'#2563EB', eco:'#059669', orange:'#D97706',
  bg:'#F9FAFB',
};

const CONDITIONS = {
  new:       { label:'Neuf',        color:'#059669', bg:'#ECFDF5' },
  good:      { label:'Bon état',    color:'#2563EB', bg:'#EFF6FF' },
  used:      { label:'Occasion',    color:'#D97706', bg:'#FFFBEB' },
  for_parts: { label:'Pour pièces', color:'#6B7280', bg:'#F3F4F6' },
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');

export default function AutoProductDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 769);
  useEffect(function() {
    var handler = function() { setIsMobile(window.innerWidth < 769); };
    window.addEventListener('resize', handler);
    return function() { window.removeEventListener('resize', handler); };
  }, []);
  const [showContact, setShowContact] = useState(false);
  const [msg, setMsg] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState('standard');

  const { data, isLoading } = useQuery(
    ['auto-product', slug],
    () => api.get('/products/' + slug).then(r => r.data),
    { retry: 1 }
  );
  const product = data?.product;
  const similar = data?.similar || [];
  const imgs = product ? (Array.isArray(product.images) ? product.images
    : (product.images ? (() => { try { return JSON.parse(product.images); } catch { return []; } })() : []))
    : [];

  const cond = product ? (CONDITIONS[product.condition] || CONDITIONS.used) : CONDITIONS.used;

  const orderMutation = useMutation(
    (payload) => api.post('/orders', payload),
    {
      onSuccess: () => {
        toast.success('✅ Commande passée ! Le vendeur va vous contacter.');
        setShowOrderModal(false);
        qc.invalidateQueries('buyer-orders');
        navigate('/buyer/commandes');
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur lors de la commande'),
    }
  );

  const contactMutation = useMutation(
    (message) => api.post('/messages/send', { recipient_id: product.seller_id, content: message }),
    {
      onSuccess: (res) => {
        toast.success('💬 Message envoyé au vendeur !');
        setShowContact(false);
        navigate('/messages/' + res.data.conversation_id);
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur'),
    }
  );

  const favMutation = useMutation(
    () => api.post('/products/' + product.id + '/favorite'),
    { onSuccess: () => { toast.info('❤️ Ajouté aux favoris'); qc.invalidateQueries(['auto-product', slug]); } }
  );

  if (isLoading) return (
    <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', color:CA.muted }}>
      Chargement...
    </div>
  );

  if (!product) return (
    <div style={{ minHeight:'60vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem' }}>
      <div style={{ fontSize:'3rem', opacity:0.15 }}>🔧</div>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', color:CA.dark }}>Pièce introuvable</div>
      <Link to="/pieces-auto" style={{ color:CA.red, textDecoration:'none', fontWeight:600 }}>← Retour à la marketplace</Link>
    </div>
  );

  const total = Number(product.price||0) * qty;

  return (
    <div style={{ background:CA.bg, minHeight:'100vh' }}>

      {/* Breadcrumb */}
      <div style={{ background:'#fff', borderBottom:'1px solid #E5E7EB', padding:'0.65rem 2rem' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', fontSize:'0.78rem', color:CA.muted, display:'flex', gap:'0.4rem', alignItems:'center', flexWrap:'wrap' }}>
          <Link to="/pieces-auto" style={{ color:CA.red, textDecoration:'none', fontWeight:600 }}>🚗 Pièces Auto</Link>
          <span>/</span>
          {product.vehicle_make && <><span style={{ color:CA.blue }}>{product.vehicle_make}</span><span>/</span></>}
          <span style={{ color:CA.dark }}>{product.title?.substring(0,40)}</span>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'1.2rem clamp(0.8rem,3vw,1.5rem) 4rem' }}>
        <div style={{ display:'flex', flexDirection:isMobile?'column':'row', gap:'1.5rem', alignItems:'start' }}>

        {/* ── GAUCHE ── */}
        <div style={{ flex:1, minWidth:0, width:isMobile?'100%':'auto' }}>
          {/* Galerie photos */}
          <div style={{ background:'#fff', borderRadius:18, overflow:'hidden', border:'1px solid #E5E7EB', marginBottom:'1.5rem' }}>
            <div style={{ height:380, background:CA.cream, position:'relative', overflow:'hidden' }}>
              {imgs[activeImg] ? (
                <img src={imgs[activeImg]} alt={product.title}
                  style={{ width:'100%', height:'100%', objectFit:'contain', padding:'1rem' }}/>
              ) : (
                <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
                  <span style={{ fontSize:'5rem', opacity:0.1 }}>🔧</span>
                  <span style={{ color:CA.muted, fontSize:'0.85rem' }}>Aucune photo</span>
                </div>
              )}
              {/* Badges */}
              <div style={{ position:'absolute', top:12, left:12, display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                <span style={{ background:cond.bg, color:cond.color, fontSize:'0.72rem', fontWeight:700, padding:'0.25rem 0.7rem', borderRadius:100 }}>
                  {cond.label}
                </span>
                {product.urgent_mode && (
                  <span style={{ background:CA.red, color:'#fff', fontSize:'0.7rem', fontWeight:700, padding:'0.25rem 0.7rem', borderRadius:100 }}>
                    ⚡ Livraison express
                  </span>
                )}
              </div>
            </div>
            {/* Thumbnails */}
            {imgs.length > 1 && (
              <div style={{ display:'flex', gap:'0.5rem', padding:'0.8rem 1rem', overflowX:'auto', borderTop:'1px solid #E5E7EB' }}>
                {imgs.map((img, i) => (
                  <div key={i} onClick={() => setActiveImg(i)}
                    style={{ width:64, height:64, borderRadius:10, overflow:'hidden', border:'2px solid '+(i===activeImg?CA.red:'#E5E7EB'), cursor:'pointer', flexShrink:0 }}>
                    <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compatibilité véhicule */}
          {(product.vehicle_make || product.brand) && (
            <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:14, padding:'1rem 1.2rem', marginBottom:'1.5rem' }}>
              <div style={{ fontWeight:700, color:'#1D4ED8', fontSize:'0.88rem', marginBottom:'0.5rem' }}>
                🚗 Compatibilité véhicule
              </div>
              <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap', fontSize:'0.85rem' }}>
                {(product.vehicle_make||product.brand) && (
                  <div><span style={{ color:CA.muted }}>Marque : </span><strong>{product.vehicle_make||product.brand}</strong></div>
                )}
                {(product.vehicle_model||product.model) && (
                  <div><span style={{ color:CA.muted }}>Modèle : </span><strong>{product.vehicle_model||product.model}</strong></div>
                )}
                {product.vehicle_year && (
                  <div><span style={{ color:CA.muted }}>Année : </span><strong>{product.vehicle_year}{product.vehicle_year_end?' – '+product.vehicle_year_end:'+'}</strong></div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E5E7EB', padding:'1.2rem', marginBottom:'1.5rem' }}>
              <div style={{ fontWeight:700, color:CA.dark, marginBottom:'0.7rem' }}>📋 Description</div>
              <p style={{ fontSize:'0.88rem', color:'#374151', lineHeight:1.7, margin:0, whiteSpace:'pre-line' }}>
                {product.description}
              </p>
            </div>
          )}

          {/* Caractéristiques */}
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E5E7EB', padding:'1.2rem', marginBottom:'1.5rem' }}>
            <div style={{ fontWeight:700, color:CA.dark, marginBottom:'0.8rem' }}>🔩 Caractéristiques</div>
            <div className='form-2col' style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
              {[
                ['Référence', product.reference],
                ['Marque pièce', product.brand],
                ['État', cond.label],
                ['Quantité dispo', (product.quantity||1)+' '+( product.unit||'pièce')],
                ['Ville', product.location_city],
                ['Livraison', product.delivery_type==='pickup'?'Remise en main propre':product.delivery_type==='delivery'?'Envoi uniquement':'Envoi + Main propre'],
                product.weight_kg && ['Poids', product.weight_kg+' kg'],
                product.eco_delivery_price && ['Frais livraison std', fmt(product.eco_delivery_price)+' MAD'],
                product.urgent_delivery_price && ['Frais express', fmt(product.urgent_delivery_price)+' MAD'],
              ].filter(Boolean).filter(x => x[1]).map(([k,v]) => (
                <div key={k} style={{ background:CA.bg, borderRadius:10, padding:'0.55rem 0.8rem' }}>
                  <div style={{ fontSize:'0.65rem', color:CA.muted, marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:'0.85rem', fontWeight:600, color:CA.dark }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pièces similaires */}
          {similar.length > 0 && (
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E5E7EB', padding:'1.2rem' }}>
              <div style={{ fontWeight:700, color:CA.dark, marginBottom:'1rem' }}>🔧 Pièces similaires</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'0.7rem' }}>
                {similar.slice(0,4).map(p => {
                  const simImgs = Array.isArray(p.images)?p.images:(p.images?(() => { try { return JSON.parse(p.images); } catch { return []; } })():[]);
                  return (
                    <Link key={p.id} to={(p.is_auto===true?'/auto/':'/produit/')+p.slug}
                      style={{ display:'block', textDecoration:'none', background:CA.bg, borderRadius:12, overflow:'hidden', border:'1px solid #E5E7EB', transition:'all 0.15s' }}>
                      <div style={{ height:100, background:CA.cream, overflow:'hidden' }}>
                        {simImgs[0] ? <img src={simImgs[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', opacity:0.15 }}>🔧</div>}
                      </div>
                      <div style={{ padding:'0.6rem' }}>
                        <div style={{ fontSize:'0.78rem', fontWeight:600, color:CA.dark, lineHeight:1.3 }}>{p.title?.substring(0,35)}</div>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1rem', fontWeight:700, color:CA.red, marginTop:3 }}>{fmt(p.price)} MAD</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── DROITE ── */}
        <div style={{ width:isMobile?'100%':380, flexShrink:0, position:isMobile?'static':'sticky', top:80 }}>

          {/* Prix + titre */}
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E5E7EB', padding:'1.5rem', marginBottom:'1rem', boxShadow:'0 4px 20px rgba(26,60,46,0.06)' }}>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:700, color:CA.dark, lineHeight:1.2, marginBottom:'0.5rem' }}>
              {product.title}
            </h1>
            {product.reference && (
              <div style={{ fontSize:'0.75rem', color:CA.muted, fontFamily:'monospace', marginBottom:'0.8rem' }}>
                Réf: {product.reference}
              </div>
            )}

            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.5rem', fontWeight:700, color:CA.red, lineHeight:1, marginBottom:'0.3rem' }}>
              {fmt(product.price)} MAD
            </div>
            {product.negotiable && (
              <div style={{ fontSize:'0.78rem', color:CA.eco, fontWeight:600, marginBottom:'0.5rem' }}>✓ Prix négociable</div>
            )}
            <div style={{ fontSize:'0.78rem', color:CA.muted }}>
              {product.quantity > 1 ? product.quantity+' pièces disponibles' : '1 pièce disponible'}
            </div>
          </div>

          {/* Quantité + actions */}
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E5E7EB', padding:'1.2rem', marginBottom:'1rem' }}>
            {/* Qty */}
            <div style={{ display:'flex', alignItems:'center', gap:'0.7rem', marginBottom:'1rem' }}>
              <span style={{ fontSize:'0.78rem', fontWeight:600, color:CA.dark }}>Quantité :</span>
              <div style={{ display:'flex', alignItems:'center', border:'1.5px solid #E5E7EB', borderRadius:100, overflow:'hidden' }}>
                <button onClick={() => setQty(q => Math.max(1,q-1))}
                  style={{ background:'transparent', border:'none', padding:'0.4rem 0.9rem', cursor:'pointer', fontSize:'1.1rem', color:CA.dark }}>−</button>
                <span style={{ padding:'0 0.7rem', fontWeight:700, color:CA.dark }}>{qty}</span>
                <button onClick={() => setQty(q => Math.min(product.quantity||99, q+1))}
                  style={{ background:'transparent', border:'none', padding:'0.4rem 0.9rem', cursor:'pointer', fontSize:'1.1rem', color:CA.dark }}>+</button>
              </div>
              <span style={{ fontSize:'0.78rem', color:CA.muted }}>Total : <strong style={{ color:CA.red }}>{fmt(Number(product.price||0)*qty + (selectedDelivery==='standard'?Number(product.eco_delivery_price||0):0) + (selectedDelivery==='express'?Number(product.urgent_delivery_price||0):0))} MAD</strong></span>
            </div>

            {/* Livraison — sélection interactive */}
            <div style={{ marginBottom:'1rem' }}>
              <div style={{ fontWeight:700, fontSize:'0.82rem', color:CA.dark, marginBottom:'0.6rem' }}>🚚 Mode de livraison</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                {product.delivery_type !== 'pickup' && (
                  <label style={{ display:'flex', alignItems:'center', gap:'0.8rem', padding:'0.7rem 0.9rem', borderRadius:12, border:'2px solid '+(selectedDelivery==='standard'?CA.red:'#E5E7EB'), background:selectedDelivery==='standard'?'#F0F7F4':'#fff', cursor:'pointer', transition:'all 0.15s' }}>
                    <input type="radio" name="dlv" value="standard" checked={selectedDelivery==='standard'} onChange={function(){ setSelectedDelivery('standard'); }} style={{ accentColor:CA.red, width:15, height:15, flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:'0.82rem', color:CA.dark }}>🚛 Standard · 2–5 jours</div>
                    </div>
                    <div style={{ fontWeight:700, color:CA.red, fontSize:'0.85rem', flexShrink:0 }}>
                      {product.eco_delivery_price ? '+'+fmt(product.eco_delivery_price)+' MAD' : 'Gratuit'}
                    </div>
                  </label>
                )}
                {product.urgent_delivery_price > 0 && product.delivery_type !== 'pickup' && (
                  <label style={{ display:'flex', alignItems:'center', gap:'0.8rem', padding:'0.7rem 0.9rem', borderRadius:12, border:'2px solid '+(selectedDelivery==='express'?'#D97706':'#E5E7EB'), background:selectedDelivery==='express'?'#FFFBEB':'#fff', cursor:'pointer', transition:'all 0.15s' }}>
                    <input type="radio" name="dlv" value="express" checked={selectedDelivery==='express'} onChange={function(){ setSelectedDelivery('express'); }} style={{ accentColor:'#D97706', width:15, height:15, flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:'0.82rem', color:CA.dark }}>⚡ Express · 24h</div>
                    </div>
                    <div style={{ fontWeight:700, color:'#D97706', fontSize:'0.85rem', flexShrink:0 }}>+{fmt(product.urgent_delivery_price)} MAD</div>
                  </label>
                )}
                {(product.delivery_type === 'pickup' || product.delivery_type === 'both') && (
                  <label style={{ display:'flex', alignItems:'center', gap:'0.8rem', padding:'0.7rem 0.9rem', borderRadius:12, border:'2px solid '+(selectedDelivery==='pickup'?'#1D4ED8':'#E5E7EB'), background:selectedDelivery==='pickup'?'#EFF6FF':'#fff', cursor:'pointer', transition:'all 0.15s' }}>
                    <input type="radio" name="dlv" value="pickup" checked={selectedDelivery==='pickup'} onChange={function(){ setSelectedDelivery('pickup'); }} style={{ accentColor:'#1D4ED8', width:15, height:15, flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:'0.82rem', color:CA.dark }}>📍 Main propre · {product.location_city}</div>
                    </div>
                    <div style={{ fontWeight:700, color:'#1D4ED8', fontSize:'0.85rem', flexShrink:0 }}>Gratuit</div>
                  </label>
                )}
              </div>
            </div>

            {/* Boutons */}
            {!user ? (
              <Link to="/login"
                style={{ display:'block', background:CA.red, color:'#fff', textAlign:'center', padding:'0.9rem', borderRadius:100, fontWeight:700, textDecoration:'none', fontSize:'0.95rem', marginBottom:'0.6rem' }}>
                Se connecter pour acheter
              </Link>
            ) : (user.id === product.seller_id || user.company_name === product.seller_company) ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                <Link to={'/seller/publier-auto?edit='+product.slug}
                  style={{ display:'block', background:'#1A3C2E', color:'#F4F6F4', textAlign:'center', padding:'0.9rem', borderRadius:100, fontWeight:700, textDecoration:'none', fontSize:'0.95rem' }}>
                  ✏️ Modifier cette annonce
                </Link>
                <Link to={'/seller/mes-produits'}
                  style={{ display:'block', background:'transparent', color:'#1A3C2E', textAlign:'center', padding:'0.75rem', borderRadius:100, fontWeight:600, fontSize:'0.88rem', textDecoration:'none', border:'1.5px solid #C8D4C8' }}>
                  📦 Voir mes annonces
                </Link>
                <div style={{ background:'#E8F8EE', border:'1px solid #A7F3D0', borderRadius:12, padding:'0.6rem 0.9rem', fontSize:'0.78rem', color:'#065F46', textAlign:'center' }}>
                  👤 Vous êtes le vendeur de cette pièce
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                <button onClick={() => setShowOrderModal(true)}
                  style={{ background:CA.red, color:'#fff', border:'none', padding:'0.9rem', borderRadius:100, fontWeight:700, fontSize:'0.95rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  🛒 Acheter maintenant
                </button>
                <button onClick={() => setShowContact(true)}
                  style={{ background:CA.cream, color:CA.red, border:'1.5px solid '+CA.mid, padding:'0.75rem', borderRadius:100, fontWeight:600, fontSize:'0.88rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  💬 Contacter le vendeur
                </button>
                <button onClick={() => favMutation.mutate()}
                  style={{ background:'transparent', color:CA.muted, border:'1.5px solid #E5E7EB', padding:'0.6rem', borderRadius:100, fontSize:'0.82rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  ❤️ Ajouter aux favoris
                </button>
              </div>
            )}
          </div>

          {/* Vendeur */}
          <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', padding:'1rem' }}>
            <div style={{ fontWeight:700, color:CA.dark, fontSize:'0.85rem', marginBottom:'0.6rem' }}>🏪 Vendeur</div>
            <div style={{ fontWeight:700, color:CA.dark }}>{product.seller_company || '—'}</div>
            <div style={{ fontSize:'0.78rem', color:CA.muted, marginTop:'0.2rem' }}>
              📍 {product.location_city||product.seller_city||'—'} · ⭐ {Number(product.seller_rating||0).toFixed(1)}/5
            </div>
            <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.7rem' }}>
              <Link to={"/pieces-auto?make="+encodeURIComponent(product.vehicle_make||product.brand||'')}
                style={{ flex:1, background:CA.bg, color:CA.muted, border:'1px solid #E5E7EB', padding:'0.4rem 0.6rem', borderRadius:100, fontSize:'0.72rem', textAlign:'center', textDecoration:'none' }}>
                Autres pièces du vendeur →
              </Link>
            </div>
          </div>

          {/* Sécurité */}
          <div style={{ background:'#F0FDF4', border:'1px solid #A7F3D0', borderRadius:14, padding:'0.9rem 1rem', marginTop:'1rem', fontSize:'0.75rem', color:'#065F46', lineHeight:1.7 }}>
            🔒 Paiement sécurisé REVEX<br/>
            ✅ Vendeur vérifié<br/>
            🔄 Retour possible si pièce non conforme
          </div>
        </div>
      </div>

      {/* ── MODAL COMMANDE ── */}
      {showOrderModal && (
        <div onClick={() => setShowOrderModal(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9999, display:'flex', alignItems:isMobile?'flex-end':'center', justifyContent:'center', padding: isMobile?'0':'1rem' }}>
          <div onClick={function(e){ e.stopPropagation(); }}
            style={{ background:'#fff', borderRadius: isMobile?'22px 22px 0 0':'22px', padding:'1.8rem', maxWidth:480, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'92vh', overflowY:'auto' }}>

            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', color:CA.dark, marginBottom:'1.2rem' }}>
              🛒 Confirmer la commande
            </h2>

            {/* Récap produit */}
            <div style={{ background:CA.cream, borderRadius:14, padding:'1rem', marginBottom:'1.2rem' }}>
              {[
                ['Pièce',       product.title ? product.title.substring(0,45) : ''],
                ['État',        cond.label],
                ['Vendeur',     product.seller_company],
                ['Quantité',    qty+' pièce(s)'],
                ['Prix unitaire', fmt(product.price)+' MAD'],
              ].map(function(kv) {
                return (
                  <div key={kv[0]} style={{ display:'flex', justifyContent:'space-between', padding:'0.35rem 0', borderBottom:'1px solid '+CA.mid, fontSize:'0.85rem' }}>
                    <span style={{ color:CA.muted }}>{kv[0]}</span>
                    <span style={{ fontWeight:600, color:CA.dark }}>{kv[1]}</span>
                  </div>
                );
              })}
            </div>

            {/* ── Choix mode de livraison ── */}
            <div style={{ marginBottom:'1.2rem' }}>
              <div style={{ fontWeight:700, fontSize:'0.85rem', color:CA.dark, marginBottom:'0.7rem' }}>
                🚚 Choisir le mode de livraison
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>

                {/* Standard */}
                {product.delivery_type !== 'pickup' && (
                  <label style={{ display:'flex', alignItems:'center', gap:'0.9rem', padding:'0.85rem 1rem', borderRadius:14, border:'2px solid '+(selectedDelivery==='standard'?CA.red:'#E5E7EB'), background:selectedDelivery==='standard'?'#F0F7F4':'#fff', cursor:'pointer', transition:'all 0.15s' }}>
                    <input type="radio" name="delivery" value="standard" checked={selectedDelivery==='standard'} onChange={function(){ setSelectedDelivery('standard'); }} style={{ accentColor:CA.red, width:16, height:16 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:'0.88rem', color:CA.dark }}>🚛 Livraison standard</div>
                      <div style={{ fontSize:'0.72rem', color:CA.muted, marginTop:2 }}>Délai 2–5 jours · Amana, Ghazala...</div>
                    </div>
                    <div style={{ fontWeight:700, color:CA.red, fontSize:'0.9rem', flexShrink:0 }}>
                      {product.eco_delivery_price ? '+'+fmt(product.eco_delivery_price)+' MAD' : 'À convenir'}
                    </div>
                  </label>
                )}

                {/* Express */}
                {product.urgent_delivery_price && product.delivery_type !== 'pickup' && (
                  <label style={{ display:'flex', alignItems:'center', gap:'0.9rem', padding:'0.85rem 1rem', borderRadius:14, border:'2px solid '+(selectedDelivery==='express'?'#D97706':'#E5E7EB'), background:selectedDelivery==='express'?'#FFFBEB':'#fff', cursor:'pointer', transition:'all 0.15s' }}>
                    <input type="radio" name="delivery" value="express" checked={selectedDelivery==='express'} onChange={function(){ setSelectedDelivery('express'); }} style={{ accentColor:'#D97706', width:16, height:16 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:'0.88rem', color:CA.dark }}>⚡ Livraison express</div>
                      <div style={{ fontSize:'0.72rem', color:CA.muted, marginTop:2 }}>Délai 24h · Prioritaire</div>
                    </div>
                    <div style={{ fontWeight:700, color:'#D97706', fontSize:'0.9rem', flexShrink:0 }}>
                      +{fmt(product.urgent_delivery_price)} MAD
                    </div>
                  </label>
                )}

                {/* Main propre */}
                {(product.delivery_type === 'pickup' || product.delivery_type === 'both') && (
                  <label style={{ display:'flex', alignItems:'center', gap:'0.9rem', padding:'0.85rem 1rem', borderRadius:14, border:'2px solid '+(selectedDelivery==='pickup'?'#1D4ED8':'#E5E7EB'), background:selectedDelivery==='pickup'?'#EFF6FF':'#fff', cursor:'pointer', transition:'all 0.15s' }}>
                    <input type="radio" name="delivery" value="pickup" checked={selectedDelivery==='pickup'} onChange={function(){ setSelectedDelivery('pickup'); }} style={{ accentColor:'#1D4ED8', width:16, height:16 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:'0.88rem', color:CA.dark }}>📍 Remise en main propre</div>
                      <div style={{ fontSize:'0.72rem', color:CA.muted, marginTop:2 }}>À {product.location_city||'convenir'} · Rendez-vous à fixer avec le vendeur</div>
                    </div>
                    <div style={{ fontWeight:700, color:'#1D4ED8', fontSize:'0.9rem', flexShrink:0 }}>Gratuit</div>
                  </label>
                )}
              </div>
            </div>

            {/* Total */}
            <div style={{ background:'#F9FAFB', borderRadius:12, padding:'0.9rem 1rem', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:700, color:CA.dark }}>Total à payer</span>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', fontWeight:700, color:CA.red }}>
                {fmt(
                  Number(product.price||0) * qty +
                  (selectedDelivery==='standard' ? Number(product.eco_delivery_price||0) : 0) +
                  (selectedDelivery==='express'  ? Number(product.urgent_delivery_price||0) : 0)
                )} MAD
              </span>
            </div>

            {/* Escrow info */}
            <div style={{ background:'#F0FDF4', border:'1px solid #A7F3D0', borderRadius:10, padding:'0.6rem 0.9rem', marginBottom:'1.2rem', fontSize:'0.75rem', color:'#065F46' }}>
              🔒 Paiement sécurisé en escrow · Libéré au vendeur après votre confirmation de réception
            </div>

            <div style={{ display:'flex', gap:'0.7rem' }}>
              <button
                onClick={function() {
                  var dp = selectedDelivery==='standard' ? Number(product.eco_delivery_price||0)
                    : selectedDelivery==='express' ? Number(product.urgent_delivery_price||0) : 0;
                  orderMutation.mutate({ product_id:product.id, quantity:qty, delivery_type:selectedDelivery, delivery_price:dp });
                }}
                disabled={orderMutation.isLoading}
                style={{ flex:1, background:orderMutation.isLoading?'#E5E7EB':CA.red, color:orderMutation.isLoading?CA.muted:'#fff', border:'none', padding:'0.9rem', borderRadius:100, fontWeight:700, cursor:orderMutation.isLoading?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'0.9rem' }}>
                {orderMutation.isLoading ? '⏳ Traitement...' : '✅ Confirmer la commande'}
              </button>
              <button onClick={() => setShowOrderModal(false)}
                style={{ background:'transparent', color:CA.muted, border:'1.5px solid #E5E7EB', padding:'0.9rem 1.1rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONTACT ── */}
      {showContact && (
        <div onClick={() => setShowContact(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#fff', borderRadius:22, padding:'2rem', maxWidth:440, width:'100%' }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', color:CA.dark, marginBottom:'0.5rem' }}>
              💬 Contacter le vendeur
            </h2>
            <p style={{ fontSize:'0.82rem', color:CA.muted, marginBottom:'1rem' }}>
              Re: {product.title?.substring(0,50)}
            </p>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4}
              placeholder="Bonjour, je suis intéressé par cette pièce. Est-elle encore disponible ?"
              style={{ width:'100%', padding:'0.75rem', border:'1.5px solid #E5E7EB', borderRadius:12, fontSize:'0.88rem', resize:'vertical', outline:'none', boxSizing:'border-box', marginBottom:'1rem' }}/>
            <div style={{ display:'flex', gap:'0.7rem' }}>
              <button onClick={() => contactMutation.mutate(msg||'Bonjour, je suis intéressé par cette pièce. Est-elle encore disponible ?')}
                disabled={contactMutation.isLoading}
                style={{ flex:1, background:CA.red, color:'#fff', border:'none', padding:'0.85rem', borderRadius:100, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                {contactMutation.isLoading ? '⏳...' : '📤 Envoyer'}
              </button>
              <button onClick={() => setShowContact(false)}
                style={{ background:'transparent', color:CA.muted, border:'1.5px solid #E5E7EB', padding:'0.85rem 1.2rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
