// src/pages/catalog/ProductDetail.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import UserInfoModal from '../../components/ui/UserInfoModal';

// ── Palette couleurs ─────────────────────────────────────────
const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
};

// ── Grade qualité CCOM ───────────────────────────────────────
const GRADE_CONFIG = {
  'A+': { color: C.eco,    bg:'#E8F8EE', label:'Neuf certifié REVEX',  desc:'Jamais utilisé, documenté et certifié REVEX' },
  'A':  { color: C.blue,   bg:'#EBF5FB', label:'Neuf non certifié',     desc:'Jamais utilisé, emballage origine' },
  'B':  { color: C.orange, bg:'#FEF5E7', label:'Bon état révisé',       desc:'Utilisé, révisé et fonctionnel' },
  'C':  { color: C.urgent, bg:'#FDECEA', label:'Usagé fonctionnel',     desc:'Usures normales, testé et opérationnel' },
  'D':  { color:'#7F8C8D', bg:'#F2F3F4', label:'Pour pièces',           desc:'À réviser ou utiliser comme source pièces' },
};

// ── Trust Score facteurs ──────────────────────────────────────
const TRUST_FACTORS = [
  { label:'Images fournies',    check: p => { try { const imgs = typeof p.images==='string' ? JSON.parse(p.images) : p.images; return Array.isArray(imgs) && imgs.length > 0; } catch { return false; } } },
  { label:'Fiche technique',    check: p => !!p.technical_sheet_url },
  { label:'Certifié REVEX',     check: p => !!p.revex_certified },
  { label:'Grade qualité',      check: p => !!p.quality_grade },
  { label:'Spécifications',     check: p => { try { const s = typeof p.specifications==='string' ? JSON.parse(p.specifications||'{}') : (p.specifications||{}); return Object.keys(s).length > 0; } catch { return false; } } },
  { label:'Description',        check: p => (p.description||'').length > 50 },
  { label:'Compatibilité',      check: p => !!p.compatibility_notes },
  { label:'Vendeur qualifié',   check: p => p.seller_qualification === 'approved' },
];

// ── Helpers ───────────────────────────────────────────────────
const parseJSON = (val, fallback) => {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

const fmtPrice = (n) => Number(n || 0).toLocaleString('fr-MA');

const conditionLabel = { new:'Neuf', good:'Bon état', used:'Usagé' };

// ────────────────────────────────────────────────────────────

// ── Sélecteur de trajet retour à vide inline ─────────────────
function TransportPicker({ fromCity, toCity, selected, onSelect }) {
  const { data, isLoading } = useQuery(
    ['eco-transports', fromCity, toCity],
    () => api.get('/transport?departure=' + (fromCity||'') + '&arrival=' + (toCity||'')).then(r => r.data),
    { staleTime: 60000, retry: false }
  );
  const transports = (data?.transports || []).filter(t => t.status === 'available');

  const C = {
    eco:'#27AE60', forest:'#1E3D0F', beige:'#EDE6D3', mid:'#D9CEBC',
    muted:'#5C5C50', white:'#FDFAF4', cream:'#F6F1E7'
  };

  if (isLoading) return (
    <div style={{ borderTop:'1px solid #A7F3D0', padding:'0.8rem 1.2rem' }}>
      <div style={{ fontSize:'0.78rem', color:C.muted, display:'flex', alignItems:'center', gap:'0.5rem' }}>
        <span style={{ display:'inline-block', width:14, height:14, border:'2px solid '+C.eco, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        Recherche des trajets disponibles...
      </div>
      <style>{'.spin-anim{animation:spin 0.8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );

  if (!transports.length) return (
    <div style={{ borderTop:'1px solid #A7F3D0', padding:'0.9rem 1.2rem', background:'#F0FDF4' }}>
      <div style={{ fontSize:'0.78rem', color:'#065F46', display:'flex', alignItems:'center', gap:'0.5rem' }}>
        <span>ℹ️</span>
        <span>Aucun trajet retour à vide disponible sur ce corridor pour le moment.</span>
      </div>
      <div style={{ fontSize:'0.72rem', color:'#047857', marginTop:'0.3rem' }}>
        La commande sera créée et le transporteur assigné automatiquement.
      </div>
    </div>
  );

  return (
    <div style={{ borderTop:'1px solid #A7F3D0', padding:'0.8rem 1.2rem', background:'#F0FDF4' }}>
      <div style={{ fontSize:'0.75rem', fontWeight:700, color:C.eco, marginBottom:'0.6rem' }}>
        🚛 {transports.length} trajet{transports.length > 1 ? 's' : ''} disponible{transports.length > 1 ? 's' : ''} sur ce corridor
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'0.45rem', maxHeight:200, overflowY:'auto' }}>
        {transports.map(t => {
          const isChosen = selected?.id === t.id;
          const depDate = new Date(t.departure_date).toLocaleDateString('fr-MA', { day:'2-digit', month:'short' });
          return (
            <div key={t.id}
              onClick={e => { e.stopPropagation(); onSelect(isChosen ? null : t); }}
              style={{ background:isChosen?'#DCFCE7':C.white, border:'1.5px solid '+(isChosen?C.eco:C.mid), borderRadius:10, padding:'0.6rem 0.9rem', cursor:'pointer', transition:'all 0.15s', display:'flex', justifyContent:'space-between', alignItems:'center' }}
              onMouseEnter={e => { if(!isChosen) e.currentTarget.style.borderColor=C.eco+'88'; }}
              onMouseLeave={e => { if(!isChosen) e.currentTarget.style.borderColor=C.mid; }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.7rem' }}>
                <div style={{ background:isChosen?C.eco:'#D1FAE5', color:isChosen?'#fff':'#065F46', width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', flexShrink:0 }}>
                  🚛
                </div>
                <div>
                  <div style={{ fontSize:'0.82rem', fontWeight:700, color:C.forest }}>
                    {t.departure_city} → {t.arrival_city}
                  </div>
                  <div style={{ fontSize:'0.68rem', color:C.muted }}>
                    📅 {depDate} · 🚚 {t.vehicle_type||'Camion'} · 🏢 {t.carrier_company||'—'}
                    {t.capacity_tons && (' · ⚖️ '+t.capacity_tons+'T')}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexShrink:0, marginLeft:'0.6rem' }}>
                {t.price_per_kg && (
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:'0.92rem', color:C.eco }}>
                    {t.price_per_kg} MAD/kg
                  </span>
                )}
                {isChosen
                  ? <span style={{ background:C.eco, color:'#fff', fontSize:'0.65rem', fontWeight:700, padding:'0.15rem 0.55rem', borderRadius:100 }}>✓ Choisi</span>
                  : <span style={{ background:'#D1FAE5', color:'#065F46', fontSize:'0.65rem', fontWeight:700, padding:'0.15rem 0.55rem', borderRadius:100 }}>Choisir</span>
                }
              </div>
            </div>
          );
        })}
      </div>
      {selected && (
        <div style={{ marginTop:'0.55rem', fontSize:'0.72rem', color:C.eco, fontWeight:600, display:'flex', alignItems:'center', gap:'0.4rem' }}>
          <span>✅</span>
          <span>Trajet sélectionné : {selected.carrier_company||'Transporteur'} · {selected.departure_city} → {selected.arrival_city}</span>
          <button onClick={e => { e.stopPropagation(); onSelect(null); }}
            style={{ background:'none', border:'none', color:'#991B1B', cursor:'pointer', fontSize:'0.8rem', marginLeft:'auto' }}>
            ✕ Retirer
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProductDetail() {
  const { slug }    = useParams();
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const qc          = useQueryClient();

  const [activeImg,     setActiveImg]     = useState(0);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 769);
  useEffect(function() { var h = function() { setIsMobile(window.innerWidth < 769); }; window.addEventListener('resize', h); return function() { window.removeEventListener('resize', h); }; }, []);
  const [qty,           setQty]           = useState(1);
  const [delivery,      setDelivery]      = useState('eco');
  const [showTransportModal, setShowTransportModal] = useState(false);

  // Bloquer le scroll de la page quand le popup transport est ouvert
  React.useEffect(() => {
    if (showTransportModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showTransportModal]);
  const [showQuote,     setShowQuote]     = useState(false);
  const [quoteMsg,      setQuoteMsg]      = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [contacting,    setContacting]    = useState(false);
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [activeTab,     setActiveTab]     = useState('specs');
  const [selectedTransport, setSelectedTransport] = useState(null); // trajet retour à vide choisi

  // ── Chargement produit ──────────────────────────────────────
  const { data, isLoading, error } = useQuery(
    ['product', slug],
    () => api.get('/products/'+slug).then(r => r.data),
    { retry: 1 }
  );

  const product = data?.product;

  // ── Vérifier si l'article est stocké chez REVEX ──────────────
  const { data: warehouseData } = useQuery(
    ['product-warehouse-storage', product?.id],
    () => api.get('/warehouses/check-product/' + product.id).then(r => r.data).catch(() => null),
    { enabled: !!product?.id, retry: false, staleTime: 60000 }
  );
  const warehouseInfo = warehouseData?.warehouse || null;
  const warehouseArticle = warehouseData?.article || null;
  const similar = data?.similar || [];

  // ── Mutations ───────────────────────────────────────────────
  const orderMutation = useMutation(
    (payload) => api.post('/orders', payload),
    {
      onSuccess: async (res) => {
        const orderId = res.data.order.id;
        // Escrow
        api.post('/analysis/escrow', { order_id: orderId, payment_method: 'simulated' }).catch(() => {});
        // Réserver le trajet retour à vide si sélectionné
        if (selectedTransport && delivery === 'eco') {
          try {
            await api.post('/transport/book', { order_id: orderId, transport_id: selectedTransport.id });
            toast.success('✅ Commande créée + trajet retour à vide réservé !');
          } catch {
            toast.success('✅ Commande créée ! (trajet transport à confirmer)');
          }
        } else {
          toast.success('✅ Commande créée ! Paiement sécurisé en escrow.');
        }
        navigate('/buyer/commandes');
      },
      onError: (e) => toast.error(e.response?.data?.error || 'Erreur commande')
    }
  );

  const quoteMutation = useMutation(
    (payload) => api.post('/quotes', payload),
    {
      onSuccess: () => { toast.success('💬 Devis envoyé !'); setShowQuote(false); setQuoteMsg(''); setProposedPrice(''); },
      onError:   (e) => toast.error(e.response?.data?.error || 'Erreur devis')
    }
  );

  const favMutation = useMutation(
    () => api.post('/products/'+product.id+'/favorite'),
    {
      onSuccess: (res) => {
        toast.success(res.data.favorite ? '❤️ Ajouté aux favoris' : '🤍 Retiré des favoris');
        qc.invalidateQueries(['product', slug]);
      }
    }
  );

  // ── Contacter le vendeur ────────────────────────────────────
  const handleContact = async () => {
    if (!user) { navigate('/login'); return; }
    setContacting(true);
    try {
      const res = await api.post('/messages/send', {
        recipient_id: product.seller_id,
        product_id:   product.id,
        content: 'Bonjour, je suis intéressé par votre annonce : "'+product.title+'". Pouvez-vous me donner plus dinformations ?'
      });
      toast.success('✅ Message envoyé !');
      navigate('/messages/'+(res.data.conversation_id));
    } catch(e) {
      toast.error(e.response?.data?.error || 'Erreur message');
    } finally {
      setContacting(false);
    }
  };

  // ── États chargement / erreur ───────────────────────────────
  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', color:C.muted, flexDirection:'column', gap:'1rem' }}>
      <div style={{ width:40, height:40, border:'3px solid '+(C.mid), borderTop:'3px solid '+(C.leaf), borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <span style={{ fontSize:'0.9rem' }}>Chargement du produit...</span>
    </div>
  );

  if (error || !product) return (
    <div style={{ textAlign:'center', padding:'4rem 2rem' }}>
      <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>😕</div>
      <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.8rem', color:C.forest, marginBottom:'0.8rem' }}>Produit introuvable</h2>
      <p style={{ color:C.muted, marginBottom:'1.5rem' }}>Ce produit n'existe pas ou a été retiré.</p>
      <Link to="/catalogue" style={{ background:C.forest, color:C.cream, padding:'0.8rem 2rem', borderRadius:100, textDecoration:'none', fontWeight:600 }}>← Retour au catalogue</Link>
    </div>
  );

  // ── Données dérivées ─────────────────────────────────────────
  const images      = parseJSON(product.images, []);
  const specs       = parseJSON(product.specifications, {});
  const gradeConf   = GRADE_CONFIG[product.quality_grade] || null;
  const delivCost   = delivery === 'urgent'
    ? Number(product.urgent_delivery_price||0)
    : delivery === 'standard'
    ? Number(product.standard_delivery_price || ((Number(product.urgent_delivery_price||0) + Number(product.eco_delivery_price||0)) / 2) || 150)
    : Number(product.eco_delivery_price||0);
  const total       = Number(product.price||0) * qty + delivCost;
  const trustScore  = product.trust_score || 0;
  const trustColor  = trustScore >= 75 ? C.eco : trustScore >= 50 ? C.orange : C.urgent;
  const isOwner     = user?.id === product.seller_id;
  const canBuy      = user && !isOwner;
  const dormantDate = product.dormant_since ? new Date(product.dormant_since) : null;
  const dormantMonths = dormantDate ? Math.floor((new Date() - dormantDate) / (1000*60*60*24*30)) : null;

  // ── CCOM scores (si dispo depuis l'analyse) ──────────────────
  const ccomScore = product.ccom_score || null;
  const ccomClass = ccomScore > 75 ? { label:'Stock Actif', color:C.eco }
                  : ccomScore > 50 ? { label:'Stock Utile', color:C.blue }
                  : ccomScore > 25 ? { label:'Stock Lent',  color:C.orange }
                  : ccomScore !== null ? { label:'Stock Dormant', color:C.urgent }
                  : null;

  return (
    <div style={{ background:'#F6F1E7', minHeight:'100vh' }}>

      {/* ── HERO BREADCRUMB ── */}
      <div style={{ background:'linear-gradient(135deg,#1E3D0F 0%,#2D5A1B 55%,#1E3D0F 100%)', padding:'1.8rem 2rem', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:160, height:160, borderRadius:'50%', border:'1px solid rgba(126,168,106,0.15)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.8rem', color:'rgba(246,241,231,0.55)', flexWrap:'wrap', marginBottom:'0.8rem' }}>
            <Link to="/" style={{ color:'rgba(246,241,231,0.55)', textDecoration:'none' }}>Accueil</Link>
            <span>›</span>
            <Link to="/catalogue" style={{ color:'#7EA86A', textDecoration:'none', fontWeight:500 }}>Catalogue</Link>
            {product.category_name && <><span>›</span><span style={{ color:'rgba(246,241,231,0.55)' }}>{product.category_name}</span></>}
            <span>›</span>
            <span style={{ color:'rgba(246,241,231,0.8)', fontWeight:500 }}>{product.title.substring(0,40)}{product.title.length>40?'...':''}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.9rem', fontWeight:700, color:'#F6F1E7', lineHeight:1.2, margin:0, maxWidth:700 }}>
                {product.title}
              </h1>
              <div style={{ display:'flex', gap:'0.6rem', marginTop:'0.6rem', flexWrap:'wrap' }}>
                {gradeConf && (
                  <span style={{ background:gradeConf.color, color:'#fff', borderRadius:8, padding:'0.2rem 0.65rem', fontSize:'0.72rem', fontWeight:700 }}>
                    Grade {product.quality_grade} · {gradeConf.label}
                  </span>
                )}
                {product.revex_certified && (
                  <span style={{ background:'rgba(5,150,105,0.85)', color:'#fff', borderRadius:8, padding:'0.2rem 0.65rem', fontSize:'0.7rem', fontWeight:700 }}>
                    ✓ Certifié REVEX
                  </span>
                )}
                {warehouseInfo && (
                  <span style={{ background:'rgba(37,99,235,0.85)', color:'#fff', borderRadius:8, padding:'0.2rem 0.65rem', fontSize:'0.7rem', fontWeight:700, display:'flex', alignItems:'center', gap:'0.3rem' }}>
                    🏢 Stocké chez REVEX · {warehouseInfo.name}
                  </span>
                )}
                <span style={{ background:'rgba(255,255,255,0.1)', color:'rgba(246,241,231,0.7)', borderRadius:8, padding:'0.2rem 0.65rem', fontSize:'0.72rem' }}>
                  🏭 {product.seller_company}
                </span>
              </div>
            </div>
            <Link to="/catalogue" style={{ color:'rgba(246,241,231,0.65)', textDecoration:'none', fontSize:'0.82rem', border:'1px solid rgba(255,255,255,0.15)', padding:'0.4rem 1rem', borderRadius:100, whiteSpace:'nowrap' }}>
              ← Retour au catalogue
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'2rem clamp(1rem,4vw,2rem) 4rem' }}>
        <div style={{ display:'flex', flexDirection:isMobile?'column':'row', gap:'2rem', alignItems:'start' }}>

          {/* ════════════════════════════════════
              COLONNE GAUCHE — Images + Détails
          ════════════════════════════════════ */}
          <div>

            {/* ── Galerie images ── */}
            <div style={{ background:'#fff', borderRadius:20, height:400, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative', marginBottom:'0.8rem', border:'1px solid rgba(30,61,15,0.08)', boxShadow:'0 4px 24px rgba(30,61,15,0.07)' }}>
              {images[activeImg]
                ? <img src={images[activeImg]} alt={product.title} style={{ width:'100%', height:'100%', objectFit:'contain' }} onError={e => { e.target.style.display='none'; }} />
                : <div style={{ textAlign:'center', opacity:0.25 }}><div style={{fontSize:'5rem'}}>📦</div><div style={{fontSize:'0.85rem',marginTop:'0.5rem',color:C.muted}}>Pas d'image</div></div>
              }

              {/* Badges superposés */}
              <div style={{ position:'absolute', top:12, left:12, display:'flex', flexDirection:'column', gap:5 }}>
                {gradeConf && (
                  <span style={{ background:gradeConf.color, color:'#fff', borderRadius:8, padding:'0.28rem 0.75rem', fontSize:'0.78rem', fontWeight:700, boxShadow:'0 2px 8px rgba(0,0,0,0.2)' }}>
                    Grade {product.quality_grade}
                  </span>
                )}
                {product.revex_certified && (
                  <span style={{ background:C.eco, color:'#fff', borderRadius:8, padding:'0.28rem 0.75rem', fontSize:'0.75rem', fontWeight:700 }}>
                    ✓ Certifié REVEX
                  </span>
                )}
                {product.urgent_mode && (
                  <span style={{ background:C.urgent, color:'#fff', borderRadius:8, padding:'0.28rem 0.75rem', fontSize:'0.75rem', fontWeight:700 }}>
                    ⚡ Urgence
                  </span>
                )}
                {product.sla_available && (
                  <span style={{ background:'#8E44AD', color:'#fff', borderRadius:8, padding:'0.28rem 0.75rem', fontSize:'0.75rem', fontWeight:700 }}>
                    📋 SLA dispo
                  </span>
                )}
              </div>

              {/* Nb photos */}
              {images.length > 1 && (
                <div style={{ position:'absolute', bottom:10, right:12, background:'rgba(30,61,15,0.75)', color:'#fff', borderRadius:100, padding:'0.2rem 0.6rem', fontSize:'0.72rem', fontWeight:600 }}>
                  {activeImg + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Miniatures */}
            {images.length > 1 && (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:'1.5rem' }}>
                {images.map((img, i) => (
                  <div key={i} onClick={() => setActiveImg(i)}
                    style={{ width:72, height:72, borderRadius:10, overflow:'hidden', border:'2.5px solid '+(i===activeImg ? C.leaf : C.mid), cursor:'pointer', background:C.beige, flexShrink:0 }}>
                    <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} />
                  </div>
                ))}
              </div>
            )}

            {/* ── Onglets détail ── */}
            <div style={{ background:C.white, borderRadius:18, border:'1px solid '+(C.mid), overflow:'hidden' }}>
              {/* Tabs header */}
              <div style={{ display:'flex', borderBottom:'1px solid '+(C.mid) }}>
                {[
                  ['specs',  '⚙️ Spécifications'],
                  ['ccom',   '📊 Analyse CCOM'],
                  ['desc',   '📝 Description'],
                ].map(([id, label]) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    style={{ flex:1, padding:'0.9rem 0.5rem', border:'none', cursor:'pointer', fontSize:'0.82rem', fontWeight:activeTab===id?700:400, color:activeTab===id?C.forest:C.muted, background:activeTab===id?C.beige:'transparent', borderBottom:activeTab===id?'2px solid '+C.leaf:'2px solid transparent', fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s' }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Onglet Spécifications ── */}
              {activeTab === 'specs' && (
                <div style={{ padding:'1.5rem' }}>
                  {Object.keys(specs).length > 0 ? (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem' }}>
                      {Object.entries(specs).map(([k, v]) => (
                        <div key={k} style={{ background:C.beige, borderRadius:10, padding:'0.65rem 0.9rem', border:'1px solid '+(C.mid) }}>
                          <div style={{ fontSize:'0.68rem', color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.15rem' }}>{k.replace(/_/g,' ')}</div>
                          <div style={{ fontSize:'0.9rem', fontWeight:600, color:C.forest }}>{String(v)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign:'center', padding:'2rem', color:C.muted }}>
                      <div style={{fontSize:'2rem',marginBottom:'0.5rem',opacity:0.3}}>⚙️</div>
                      <p style={{fontSize:'0.85rem'}}>Aucune spécification renseignée pour ce produit.</p>
                    </div>
                  )}

                  {/* Infos supplémentaires */}
                  <div style={{ marginTop:'1.2rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem' }}>
                    {[
                      ['État physique',     conditionLabel[product.condition] || product.condition],
                      ['Quantité dispo',    product.quantity+' '+(product.unit || 'unité(s)')],
                      ['Référence',         product.reference || '—'],
                      ['Marque',            product.brand || '—'],
                      ['Modèle',            product.model || '—'],
                      ['Poids',             product.weight_kg ? product.weight_kg+' kg' : '—'],
                      ['Localisation',      product.location_city || '—'],
                      ['Garantie',          product.warranty_months ? product.warranty_months+' mois' : 'Sans garantie'],
                    ].map(([lbl, val]) => (
                      <div key={lbl} style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0', borderBottom:'1px solid '+(C.beige), fontSize:'0.84rem' }}>
                        <span style={{ color:C.muted }}>{lbl}</span>
                        <span style={{ color:C.forest, fontWeight:500 }}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* ── Produits similaires inline ── */}
                  {similar.length > 0 && (
                    <div style={{ marginTop:'1.5rem', borderTop:'1.5px solid '+C.beige, paddingTop:'1.2rem' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem', marginBottom:'1rem' }}>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.15rem', fontWeight:700, color:C.forest }}>
                          🔍 Articles similaires disponibles
                        </div>
                        <Link to={'/catalogue?category='+(product.category_name||'')}
                          style={{ fontSize:'0.78rem', color:C.leaf, textDecoration:'none', fontWeight:600 }}>
                          Voir tout →
                        </Link>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'0.7rem' }}>
                        {similar.slice(0,6).map(p => {
                          const pImgs = parseJSON(p.images, []);
                          const pGrade = GRADE_CONFIG[p.quality_grade];
                          const pPct = p.price && product.price
                            ? Math.round(((Number(product.price) - Number(p.price)) / Number(product.price)) * 100)
                            : null;
                          return (
                            <Link key={p.id} to={'/produit/'+p.slug}
                              style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:12, overflow:'hidden', textDecoration:'none', display:'block', transition:'all 0.18s' }}
                              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 18px rgba(30,61,15,0.1)'; e.currentTarget.style.borderColor=C.leaf; }}
                              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=C.mid; }}>

                              {/* Image */}
                              <div style={{ height:100, background:C.beige, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
                                {pImgs[0]
                                  ? <img src={pImgs[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} />
                                  : <span style={{ fontSize:'1.8rem', opacity:0.2 }}>📦</span>}
                                {p.quality_grade && pGrade && (
                                  <span style={{ position:'absolute', top:5, left:5, background:pGrade.color, color:'#fff', fontSize:'0.6rem', fontWeight:700, padding:'0.1rem 0.4rem', borderRadius:5 }}>
                                    {p.quality_grade}
                                  </span>
                                )}
                                {pPct !== null && pPct > 0 && (
                                  <span style={{ position:'absolute', top:5, right:5, background:C.eco, color:'#fff', fontSize:'0.6rem', fontWeight:700, padding:'0.1rem 0.4rem', borderRadius:5 }}>
                                    -{pPct}%
                                  </span>
                                )}
                                {pPct !== null && pPct < 0 && (
                                  <span style={{ position:'absolute', top:5, right:5, background:C.orange, color:'#fff', fontSize:'0.6rem', fontWeight:700, padding:'0.1rem 0.4rem', borderRadius:5 }}>
                                    +{Math.abs(pPct)}%
                                  </span>
                                )}
                              </div>

                              {/* Infos */}
                              <div style={{ padding:'0.65rem 0.7rem' }}>
                                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'0.82rem', fontWeight:700, color:C.forest, lineHeight:1.3, marginBottom:'0.35rem' }}>
                                  {p.title.substring(0,40)}{p.title.length>40?'...':''}
                                </div>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                  <span style={{ fontWeight:700, color:C.leaf, fontSize:'0.88rem' }}>
                                    {fmtPrice(p.price)} MAD
                                  </span>
                                  {p.seller_company && (
                                    <span style={{ fontSize:'0.62rem', color:C.muted }}>
                                      🏭 {p.seller_company.substring(0,10)}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize:'0.65rem', color:C.muted, marginTop:2 }}>
                                  📍 {p.location_city || '—'}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                      {similar.length > 6 && (
                        <div style={{ textAlign:'center', marginTop:'0.8rem' }}>
                          <Link to={'/catalogue?category='+(product.category_name||'')}
                            style={{ fontSize:'0.8rem', color:C.leaf, fontWeight:600, textDecoration:'none' }}>
                            + {similar.length - 6} autres articles similaires →
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {similar.length === 0 && (
                    <div style={{ marginTop:'1.5rem', borderTop:'1.5px solid '+C.beige, paddingTop:'1.2rem' }}>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:C.forest, marginBottom:'0.7rem' }}>
                        🔍 Articles similaires
                      </div>
                      <div style={{ textAlign:'center', padding:'1.5rem', background:C.cream, borderRadius:12, color:C.muted, fontSize:'0.82rem' }}>
                        Aucun article similaire disponible pour le moment dans cette catégorie.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Onglet CCOM ── */}
              {activeTab === 'ccom' && (
                <div style={{ padding:'1.5rem' }}>
                  {/* Trust Score */}
                  <div style={{ marginBottom:'1.5rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem', marginBottom:'0.6rem' }}>
                      <span style={{ fontWeight:700, color:C.forest, fontSize:'0.9rem' }}>🏆 Trust Score REVEX</span>
                      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:700, color:trustColor }}>{trustScore}%</span>
                    </div>
                    <div style={{ background:C.mid, borderRadius:100, height:10, overflow:'hidden' }}>
                      <div style={{ background:'linear-gradient(90deg,'+(trustColor)+','+(trustColor)+'aa)', height:'100%', width:trustScore+'%', borderRadius:100, transition:'width 0.8s ease' }} />
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem', marginTop:'1rem' }}>
                      {TRUST_FACTORS.map(f => {
                        const ok = f.check(product);
                        return (
                          <div key={f.label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.78rem', color:ok?C.eco:C.muted }}>
                            <span style={{ fontSize:'0.85rem' }}>{ok ? '✅' : '⭕'}</span>{f.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grade qualité */}
                  {gradeConf && (
                    <div style={{ background:gradeConf.bg, border:'1.5px solid '+(gradeConf.color)+'44', borderRadius:14, padding:'1rem 1.2rem', marginBottom:'1rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.8rem' }}>
                        <div style={{ background:gradeConf.color, color:'#fff', borderRadius:10, width:42, height:42, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'1.1rem', flexShrink:0 }}>
                          {product.quality_grade}
                        </div>
                        <div>
                          <div style={{ fontWeight:700, color:C.forest, fontSize:'0.9rem' }}>{gradeConf.label}</div>
                          <div style={{ fontSize:'0.78rem', color:C.muted, marginTop:'0.1rem' }}>{gradeConf.desc}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Score CCOM si disponible */}
                  {ccomScore !== null && ccomClass && (
                    <div style={{ background:ccomClass.color+'18', border:'1.5px solid '+(ccomClass.color)+'44', borderRadius:14, padding:'1rem 1.2rem', marginBottom:'1rem' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontWeight:700, color:C.forest, fontSize:'0.88rem' }}>Score CCOM</div>
                          <div style={{ fontSize:'0.75rem', color:C.muted, marginTop:'0.1rem' }}>Méthode d'analyse stock</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.8rem', fontWeight:700, color:ccomClass.color }}>{ccomScore}</div>
                          <div style={{ fontSize:'0.72rem', color:ccomClass.color, fontWeight:600 }}>{ccomClass.label}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stock dormant info */}
                  {dormantDate && (
                    <div style={{ background:'#FEF5E7', border:'1px solid #F0B27A', borderRadius:14, padding:'1rem 1.2rem' }}>
                      <div style={{ fontWeight:700, color:'#784212', fontSize:'0.88rem', marginBottom:'0.3rem' }}>⏱ Stock dormant</div>
                      <div style={{ fontSize:'0.82rem', color:'#A04000', lineHeight:1.6 }}>
                        Sans mouvement depuis le <strong>{dormantDate.toLocaleDateString('fr-MA')}</strong>
                        {dormantMonths !== null && <> — <strong style={{color:dormantMonths>=36?C.urgent:C.orange}}>{dormantMonths} mois</strong></>}
                        {dormantMonths >= 36 && <span style={{marginLeft:6,background:C.urgent,color:'#fff',borderRadius:100,padding:'0.1rem 0.5rem',fontSize:'0.7rem',fontWeight:700}}>≥ 3 ans</span>}
                      </div>
                    </div>
                  )}

                  {/* Certification REVEX */}
                  {product.revex_certified && (
                    <div style={{ background:'#E8F8EE', border:'1px solid #a8dfc0', borderRadius:14, padding:'1rem 1.2rem', marginTop:'0.8rem' }}>
                      <div style={{ fontWeight:700, color:'#145A32', fontSize:'0.88rem' }}>✅ Certifié REVEX</div>
                      {product.certification_ref && <div style={{ fontSize:'0.78rem', color:C.muted, marginTop:'0.2rem' }}>Réf : {product.certification_ref}</div>}
                      {product.certification_date && <div style={{ fontSize:'0.75rem', color:C.muted }}>Date : {new Date(product.certification_date).toLocaleDateString('fr-MA')}</div>}
                    </div>
                  )}
                </div>
              )}

              {/* ── Onglet Description ── */}
              {activeTab === 'desc' && (
                <div style={{ padding:'1.5rem' }}>
                  {product.description ? (
                    <p style={{ color:C.forest, lineHeight:1.8, fontSize:'0.92rem', whiteSpace:'pre-wrap' }}>{product.description}</p>
                  ) : (
                    <div style={{ textAlign:'center', padding:'2rem', color:C.muted }}>
                      <div style={{fontSize:'2rem',marginBottom:'0.5rem',opacity:0.3}}>📝</div>
                      <p style={{fontSize:'0.85rem'}}>Aucune description disponible.</p>
                    </div>
                  )}
                  {product.compatibility_notes && (
                    <div style={{ marginTop:'1.2rem', background:C.beige, borderRadius:12, padding:'1rem', border:'1px solid '+(C.mid) }}>
                      <div style={{ fontWeight:700, fontSize:'0.85rem', color:C.forest, marginBottom:'0.4rem' }}>🔧 Compatibilité</div>
                      <p style={{ fontSize:'0.85rem', color:C.muted, lineHeight:1.6 }}>{product.compatibility_notes}</p>
                    </div>
                  )}
                  {product.tags && Array.isArray(product.tags) && product.tags.length > 0 && (
                    <div style={{ marginTop:'1.2rem', display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                      {product.tags.map(t => (
                        <span key={t} style={{ background:C.beige, color:C.muted, borderRadius:100, padding:'0.25rem 0.7rem', fontSize:'0.75rem', border:'1px solid '+(C.mid) }}>#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ════════════════════════════════════
              COLONNE DROITE — Achat + Vendeur
          ════════════════════════════════════ */}
          <div style={{ position:'sticky', top:85 }}>

            {/* ── Titre + Prix ── */}
            <div style={{ background:C.white, borderRadius:18, border:'1px solid '+(C.mid), padding:'1.5rem', marginBottom:'1rem' }}>
              {product.reference && <div style={{ fontSize:'0.72rem', color:C.muted, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:'0.3rem' }}>Réf : {product.reference}</div>}
              <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.55rem', fontWeight:700, color:C.forest, lineHeight:1.2, marginBottom:'0.8rem' }}>{product.title}</h1>

              <div style={{ display:'flex', alignItems:'baseline', gap:'0.6rem', marginBottom:'0.3rem' }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2rem', fontWeight:700, color:C.leaf }}>
                  {product.price_on_request ? 'Prix sur demande' : fmtPrice(product.price)+' MAD'}
                </div>
                {!product.price_on_request && <div style={{ fontSize:'0.82rem', color:C.muted }}>HT / {product.unit||'unité'}</div>}
              </div>
              {product.negotiable && <div style={{ fontSize:'0.78rem', color:C.eco, fontWeight:600 }}>✓ Prix négociable</div>}
            </div>

            {/* ── Quantité ── */}
            <div style={{ background:C.white, borderRadius:18, border:'1px solid '+(C.mid), padding:'1.2rem', marginBottom:'1rem' }}>
              <label style={{ fontSize:'0.82rem', fontWeight:700, color:C.forest, display:'block', marginBottom:'0.6rem' }}>
                Quantité <span style={{ color:C.muted, fontWeight:400 }}>({product.quantity} disponibles)</span>
              </label>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <button onClick={() => setQty(q => Math.max(1, q-1))}
                  style={{ width:38, height:38, borderRadius:8, border:'1.5px solid '+(C.mid), background:C.beige, cursor:'pointer', fontWeight:700, fontSize:'1.2rem', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                <span style={{ width:50, textAlign:'center', fontWeight:700, fontSize:'1.1rem', color:C.forest }}>{qty}</span>
                <button onClick={() => setQty(q => Math.min(product.quantity, q+1))}
                  style={{ width:38, height:38, borderRadius:8, border:'1.5px solid '+(C.mid), background:C.beige, cursor:'pointer', fontWeight:700, fontSize:'1.2rem', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
              </div>
            </div>

            {/* ── Sélection livraison — bouton popup ── */}
            <div style={{ background:C.white, borderRadius:18, border:'1.5px solid '+(delivery==='eco'?C.eco:delivery==='urgent'?C.urgent:'#6366F1'), marginBottom:'1rem', overflow:'hidden' }}>
              {/* Résumé mode sélectionné */}
              <div style={{ padding:'0.9rem 1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.7rem' }}>
                  <span style={{ fontSize:'1.3rem' }}>
                    {delivery==='eco'?'🌿':delivery==='urgent'?'⚡':'🚛'}
                  </span>
                  <div>
                    <div style={{ fontSize:'0.88rem', fontWeight:700, color:delivery==='eco'?C.eco:delivery==='urgent'?C.urgent:'#6366F1' }}>
                      {delivery==='eco'?'Livraison Éco — Retour à vide':delivery==='urgent'?'Livraison Urgente':'Livraison Standard'}
                    </div>
                    <div style={{ fontSize:'0.72rem', color:C.muted }}>
                      {delivery==='eco'
                        ? ('🌱 Écologique · '+(product.delivery_days_eco||5)+'-7 jours · +'+(fmtPrice(delivCost))+' MAD')
                        : delivery==='urgent'
                        ? ('⚡ Transport dédié · '+(product.delivery_days_urgent||48)+'h · +'+(fmtPrice(delivCost))+' MAD')
                        : ('📦 Transporteur standard · 3-5 jours · +'+(fmtPrice(delivCost))+' MAD')
                      }
                      {selectedTransport && delivery==='eco' && (
                        <span style={{ marginLeft:5, color:C.eco, fontWeight:700 }}>
                          · ✓ {selectedTransport.carrier_company||'Transporteur'} assigné
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowTransportModal(true)}
                  style={{ background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.4rem 0.9rem', borderRadius:100, fontSize:'0.78rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap' }}>
                  Changer →
                </button>
              </div>
            </div>

            {/* ── POPUP SÉLECTION TRANSPORT ── */}
            {showTransportModal && ReactDOM.createPortal((
              <div onClick={() => setShowTransportModal(false)}
                style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.65)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', overflowY:'auto' }}>
                <div onClick={e => e.stopPropagation()}
                  style={{ background:C.cream, borderRadius:24, maxWidth:520, width:'100%', maxHeight:'92vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.35)', flexShrink:0 }}>

                  {/* Header modal */}
                  <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', padding:'1.4rem 1.8rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.35rem', fontWeight:700, color:'#F6F1E7' }}>
                        🚛 Mode de livraison
                      </div>
                      <div style={{ fontSize:'0.75rem', color:'rgba(246,241,231,0.55)', marginTop:2 }}>
                        Choisissez selon vos besoins et votre budget
                      </div>
                    </div>
                    <button onClick={() => setShowTransportModal(false)}
                      style={{ background:'rgba(255,255,255,0.12)', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', color:'#F6F1E7', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      ✕
                    </button>
                  </div>

                  {/* Options */}
                  <div style={{ padding:'1rem 1.6rem', display:'flex', flexDirection:'column', gap:'0.7rem', overflowY:'auto', flex:1 }}>

                    {/* Eco */}
                    <div
                      onClick={() => { setDelivery('eco'); setSelectedTransport(null); }}
                      style={{ borderRadius:16, border:'2px solid '+(delivery==='eco'?C.eco:C.mid), background:delivery==='eco'?'#ECFDF5':C.white, cursor:'pointer', overflow:'hidden', transition:'all 0.18s' }}
                      onMouseEnter={e => { if(delivery!=='eco') e.currentTarget.style.borderColor=C.eco+'88'; }}
                      onMouseLeave={e => { if(delivery!=='eco') e.currentTarget.style.borderColor=C.mid; }}>
                      <div style={{ padding:'1rem 1.2rem', display:'flex', alignItems:'flex-start', gap:'0.9rem' }}>
                        <div style={{ width:44, height:44, borderRadius:12, background:delivery==='eco'?C.eco:'#D1FAE5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', flexShrink:0 }}>
                          🌿
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                            <div>
                              <div style={{ fontWeight:700, color:C.eco, fontSize:'0.95rem', marginBottom:3 }}>Livraison Éco</div>
                              <div style={{ fontSize:'0.75rem', color:C.muted, lineHeight:1.5 }}>
                                Retour à vide d'un camion sur votre trajet.<br/>
                                Délai : {product.delivery_days_eco||5}–7 jours · Éco-responsable 🌱
                              </div>
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0, marginLeft:'0.8rem' }}>
                              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:C.eco }}>
                                +{fmtPrice(product.eco_delivery_price||0)} MAD
                              </div>
                              {delivery==='eco' && (
                                <div style={{ fontSize:'0.65rem', color:C.eco, fontWeight:700 }}>✓ Sélectionné</div>
                              )}
                            </div>
                          </div>
                          {/* Tags */}
                          <div style={{ display:'flex', gap:'0.4rem', marginTop:'0.6rem', flexWrap:'wrap' }}>
                            {['Économique','Écologique','-60% vs urgente'].map(t => (
                              <span key={t} style={{ background:'#D1FAE5', color:'#065F46', fontSize:'0.62rem', padding:'0.1rem 0.5rem', borderRadius:100, fontWeight:600 }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* ── Trajets retour à vide disponibles ── */}
                      {delivery === 'eco' && (
                        <TransportPicker
                          fromCity={product.location_city || product.seller_city}
                          toCity={user?.city}
                          selected={selectedTransport}
                          onSelect={(t) => {
                            setSelectedTransport(t);
                            if (t) toast.info('🚛 Trajet sélectionné : '+t.departure_city+' → '+t.arrival_city);
                          }}
                        />
                      )}
                    </div>

                    {/* Standard */}
                    <div
                      onClick={() => { setDelivery('standard'); setSelectedTransport(null); }}
                      style={{ borderRadius:16, border:'2px solid '+(delivery==='standard'?'#6366F1':C.mid), background:delivery==='standard'?'#EEF2FF':C.white, cursor:'pointer', transition:'all 0.18s' }}
                      onMouseEnter={e => { if(delivery!=='standard') e.currentTarget.style.borderColor='#A5B4FC'; }}
                      onMouseLeave={e => { if(delivery!=='standard') e.currentTarget.style.borderColor=C.mid; }}>
                      <div style={{ padding:'1rem 1.2rem', display:'flex', alignItems:'flex-start', gap:'0.9rem' }}>
                        <div style={{ width:44, height:44, borderRadius:12, background:delivery==='standard'?'#6366F1':'#E0E7FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', flexShrink:0 }}>
                          🚛
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                            <div>
                              <div style={{ fontWeight:700, color:'#4338CA', fontSize:'0.95rem', marginBottom:3 }}>Livraison Standard</div>
                              <div style={{ fontSize:'0.75rem', color:C.muted, lineHeight:1.5 }}>
                                Transporteur partenaire dédié à votre commande.<br/>
                                Délai : 3–5 jours ouvrables · Suivi inclus 📦
                              </div>
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0, marginLeft:'0.8rem' }}>
                              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:'#4338CA' }}>
                                +{fmtPrice(delivCost)} MAD
                              </div>
                              {delivery==='standard' && (
                                <div style={{ fontSize:'0.65rem', color:'#6366F1', fontWeight:700 }}>✓ Sélectionné</div>
                              )}
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:'0.4rem', marginTop:'0.6rem', flexWrap:'wrap' }}>
                            {['Fiable','Suivi GPS','Assurance incluse'].map(t => (
                              <span key={t} style={{ background:'#E0E7FF', color:'#3730A3', fontSize:'0.62rem', padding:'0.1rem 0.5rem', borderRadius:100, fontWeight:600 }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Urgent */}
                    <div
                      onClick={() => { setDelivery('urgent'); setSelectedTransport(null); }}
                      style={{ borderRadius:16, border:'2px solid '+(delivery==='urgent'?C.urgent:C.mid), background:delivery==='urgent'?'#FEF2F2':C.white, cursor:'pointer', transition:'all 0.18s' }}
                      onMouseEnter={e => { if(delivery!=='urgent') e.currentTarget.style.borderColor=C.urgent+'88'; }}
                      onMouseLeave={e => { if(delivery!=='urgent') e.currentTarget.style.borderColor=C.mid; }}>
                      <div style={{ padding:'1rem 1.2rem', display:'flex', alignItems:'flex-start', gap:'0.9rem' }}>
                        <div style={{ width:44, height:44, borderRadius:12, background:delivery==='urgent'?C.urgent:'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', flexShrink:0 }}>
                          ⚡
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                            <div>
                              <div style={{ fontWeight:700, color:C.urgent, fontSize:'0.95rem', marginBottom:3 }}>Livraison Urgente</div>
                              <div style={{ fontSize:'0.75rem', color:C.muted, lineHeight:1.5 }}>
                                Transport express prioritaire porte-à-porte.<br/>
                                Délai : {product.delivery_days_urgent||48}h · Priorité maximum ⚡
                              </div>
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0, marginLeft:'0.8rem' }}>
                              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:C.urgent }}>
                                +{fmtPrice(product.urgent_delivery_price||0)} MAD
                              </div>
                              {delivery==='urgent' && (
                                <div style={{ fontSize:'0.65rem', color:C.urgent, fontWeight:700 }}>✓ Sélectionné</div>
                              )}
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:'0.4rem', marginTop:'0.6rem', flexWrap:'wrap' }}>
                            {['Express','Prioritaire','Garanti 48h'].map(t => (
                              <span key={t} style={{ background:'#FEE2E2', color:'#991B1B', fontSize:'0.62rem', padding:'0.1rem 0.5rem', borderRadius:100, fontWeight:600 }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Footer modal */}
                  <div style={{ padding:'1rem 1.8rem', borderTop:'1px solid '+C.beige, background:C.white, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:'0.75rem', color:C.muted }}>
                      Mode sélectionné : <strong style={{ color:C.forest }}>
                        {delivery==='eco'?'Éco':delivery==='urgent'?'Urgent':'Standard'} · +{fmtPrice(delivCost)} MAD
                      </strong>
                    </div>
                    <button onClick={() => setShowTransportModal(false)}
                      style={{ background:C.forest, color:C.cream, border:'none', padding:'0.65rem 1.8rem', borderRadius:100, fontWeight:700, fontSize:'0.88rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                      ✅ Confirmer ce mode
                    </button>
                  </div>
                </div>
              </div>
            ), document.body)}

            {/* ── Total + Escrow ── */}
            {!product.price_on_request && (
              <div style={{ background:C.beige, borderRadius:14, padding:'1rem 1.2rem', marginBottom:'1rem', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid '+(C.mid) }}>
                <div>
                  <div style={{ fontSize:'0.78rem', color:C.muted }}>Total estimé</div>
                  <div style={{ fontSize:'0.7rem', color:C.muted }}>({qty} × {fmtPrice(product.price)} + livraison)</div>
                </div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:700, color:C.forest }}>{fmtPrice(total)} MAD</div>
              </div>
            )}

            {/* Badge escrow */}
            <div style={{ background:'#E8F8EE', border:'1px solid #a8dfc0', borderRadius:12, padding:'0.65rem 0.9rem', marginBottom:'1rem', display:'flex', gap:8, alignItems:'flex-start' }}>
              <span>🔒</span>
              <div style={{ fontSize:'0.75rem', color:'#145A32', lineHeight:1.4 }}>
                <strong>Paiement sécurisé Escrow</strong> — Votre paiement est bloqué jusqu'à confirmation de réception.
              </div>
            </div>

            {/* ── Section Entrepôt REVEX ── */}
            {warehouseInfo && warehouseArticle && (
              <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', borderRadius:16, padding:'1.1rem 1.2rem', marginBottom:'0.8rem', border:'1px solid rgba(126,168,106,0.2)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.6rem', marginBottom:'0.8rem' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:3 }}>
                      <span style={{ fontSize:'1rem' }}>🏢</span>
                      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:'#F6F1E7' }}>
                        Stocké chez REVEX
                      </span>
                    </div>
                    <div style={{ fontSize:'0.75rem', color:'rgba(246,241,231,0.6)' }}>
                      Article disponible dans notre entrepôt — expédition sous 24h
                    </div>
                  </div>
                  <Link to={'/admin/entrepot/'+warehouseInfo.id}
                    style={{ background:'rgba(255,255,255,0.12)', color:'#F6F1E7', border:'1px solid rgba(255,255,255,0.2)', padding:'0.35rem 0.9rem', borderRadius:100, fontSize:'0.75rem', fontWeight:600, textDecoration:'none', whiteSpace:'nowrap' }}>
                    🔗 Voir l'entrepôt
                  </Link>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.5rem', marginBottom:'0.7rem' }}>
                  {[
                    { icon:'🏭', label:'Entrepôt', value:warehouseInfo.name },
                    { icon:'📍', label:'Ville', value:warehouseInfo.city },
                    { icon:'📊', label:'Zone / Allée', value:[warehouseArticle.zone, warehouseArticle.shelf].filter(Boolean).join(' / ') || '—' },
                  ].map(k => (
                    <div key={k.label} style={{ background:'rgba(255,255,255,0.08)', borderRadius:10, padding:'0.6rem 0.7rem' }}>
                      <div style={{ fontSize:'0.65rem', color:'rgba(246,241,231,0.45)', marginBottom:2 }}>{k.icon} {k.label}</div>
                      <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#F6F1E7' }}>{k.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
                  {[
                    { icon:'✅', label:'Statut stock', value: warehouseArticle.status === 'en_stock' ? 'En stock' : warehouseArticle.status === 'reserve' ? 'Réservé' : warehouseArticle.status, color: warehouseArticle.status === 'en_stock' ? '#6EE7B7' : '#FCD34D' },
                    { icon:'🚛', label:'Livraison', value:'Expédition depuis entrepôt REVEX · 24h', color:'#93C5FD' },
                  ].map(k => (
                    <div key={k.label} style={{ background:'rgba(255,255,255,0.06)', borderRadius:10, padding:'0.6rem 0.7rem', display:'flex', gap:'0.5rem', alignItems:'center' }}>
                      <span style={{ fontSize:'1rem' }}>{k.icon}</span>
                      <div>
                        <div style={{ fontSize:'0.65rem', color:'rgba(246,241,231,0.45)' }}>{k.label}</div>
                        <div style={{ fontSize:'0.8rem', fontWeight:600, color:k.color }}>{k.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {warehouseInfo.ouverture && (
                  <div style={{ marginTop:'0.6rem', fontSize:'0.72rem', color:'rgba(246,241,231,0.5)' }}>
                    🕐 Horaires entrepôt : {warehouseInfo.ouverture}
                    {warehouseInfo.responsable && warehouseInfo.responsable !== '—' && (
                      <span> · 👤 Responsable : {warehouseInfo.responsable}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Boutons action ── */}
            <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem', marginBottom:'1rem' }}>
              {canBuy ? (
                <>
                  {!product.price_on_request && (
                    <button
                      onClick={() => orderMutation.mutate({ product_id:product.id, quantity:qty, delivery_type:delivery, delivery_address:{} })}
                      disabled={orderMutation.isLoading}
                      style={btn(C.forest, C.cream, orderMutation.isLoading)}>
                      {orderMutation.isLoading ? '⏳ Traitement...'
                        : delivery==='eco' && selectedTransport
                          ? '🛒 Commander + 🚛 '+(selectedTransport.carrier_company || 'Transport')
                          : '🛒 Commander maintenant'}
                    </button>
                  )}
                  {/* Rappel trajet sélectionné */}
                  {delivery === 'eco' && !selectedTransport && (
                    <div style={{ fontSize:'0.73rem', color:C.muted, textAlign:'center', padding:'0.2rem 0' }}>
                      🌿 Choisissez un trajet retour à vide ci-dessus pour une livraison éco
                    </div>
                  )}
                  {delivery === 'eco' && selectedTransport && (
                    <div style={{ background:'#E8F8EE', border:'1px solid #a8dfc0', borderRadius:10, padding:'0.5rem 0.8rem', fontSize:'0.75rem', color:'#145A32' }}>
                      🚛 Trajet : <strong>{selectedTransport.departure_city} → {selectedTransport.arrival_city}</strong>
                      {' '}• {selectedTransport.carrier_company}
                      {' '}• {new Date(selectedTransport.departure_date).toLocaleDateString('fr-MA')}
                    </div>
                  )}
                  <button onClick={() => setShowQuote(true)} style={btn('transparent', C.forest, false, '1.5px solid '+(C.mid))}>
                    💬 Demander un devis
                  </button>
                  <button onClick={handleContact} disabled={contacting} style={btn('#2980B9', '#fff', contacting)}>
                    {contacting ? '⏳ Envoi...' : '✉️ Contacter le vendeur'}
                  </button>
                  <button onClick={() => favMutation.mutate()} style={btn('transparent', C.muted, favMutation.isLoading, '1px solid '+(C.mid))}>
                    {product.is_favorite ? '❤️ Retiré des favoris' : '🤍 Ajouter aux favoris'}
                  </button>
                </>
              ) : isOwner ? (
                <Link to={'/seller/publier/'+product.id} style={{ ...btn(C.forest, C.cream), textDecoration:'none', textAlign:'center', display:'block' }}>
                  ✏️ Modifier ce produit
                </Link>
              ) : (
                <Link to="/login" style={{ ...btn(C.forest, C.cream), textDecoration:'none', textAlign:'center', display:'block' }}>
                  Se connecter pour acheter
                </Link>
              )}
            </div>

            {/* ── Infos vendeur ── */}
            <div onClick={() => !isOwner && setShowSellerModal(true)}
              style={{ background:C.white, borderRadius:16, border:'1px solid '+(C.mid), padding:'1.2rem', cursor:isOwner?'default':'pointer', transition:'box-shadow 0.2s' }}
              onMouseEnter={e => !isOwner && (e.currentTarget.style.boxShadow='0 4px 20px rgba(30,61,15,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow='none')}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem', marginBottom:'0.8rem' }}>
                <div style={{ fontWeight:700, fontSize:'0.82rem', color:C.forest }}>🏭 Vendeur</div>
                {!isOwner && <span style={{ fontSize:'0.7rem', color:C.leaf, fontWeight:600 }}>Voir profil →</span>}
              </div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', fontWeight:700, color:C.forest, marginBottom:'0.2rem' }}>
                {product.seller_company || '—'}
              </div>
              <div style={{ fontSize:'0.8rem', color:C.muted, marginBottom:'0.6rem' }}>📍 {product.seller_city || '—'}</div>
              <div style={{ display:'flex', gap:'1.2rem', fontSize:'0.8rem', color:C.muted, marginBottom:'0.5rem' }}>
                <span>⭐ {Number(product.seller_rating||0).toFixed(1)}/5</span>
                <span>📦 {product.seller_sales||0} ventes</span>
                {product.seller_reviews > 0 && <span>💬 {product.seller_reviews} avis</span>}
              </div>
              {product.seller_qualification === 'approved' && (
                <div style={{ fontSize:'0.75rem', color:C.eco, fontWeight:600 }}>✅ Vendeur qualifié REVEX</div>
              )}
              <div style={{ marginTop:'0.6rem', fontSize:'0.72rem', color:C.muted }}>
                📅 Membre depuis {product.seller_since ? new Date(product.seller_since).getFullYear() : '—'}<br/>
                📍 Stock expédié depuis {product.location_city||'—'}
              </div>
            </div>
          </div>
        </div>

        {/* Modal vendeur */}
        {showSellerModal && product.seller_id && (
          <UserInfoModal
            userId={product.seller_id}
            userName={product.seller_company}
            userRole="seller"
            onClose={() => setShowSellerModal(false)}
            onContact={() => { setShowSellerModal(false); handleContact(); }}
          />
        )}

        {/* ── MODAL DEVIS ── */}
        {showQuote && (
          <div onClick={() => setShowQuote(false)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:C.white, borderRadius:24, padding:'2rem', maxWidth:480, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', color:C.forest, marginBottom:'0.3rem' }}>💬 Demander un devis</h2>
              <p style={{ fontSize:'0.82rem', color:C.muted, marginBottom:'1.5rem' }}>{product.title}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                <div>
                  <label style={lbl}>Quantité souhaitée</label>
                  <input type="number" value={qty} min={1} max={product.quantity} onChange={e => setQty(Math.max(1,parseInt(e.target.value)||1))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Prix proposé (MAD HT) — optionnel</label>
                  <input type="number" value={proposedPrice} onChange={e => setProposedPrice(e.target.value)} placeholder={'Prix catalogue : '+(fmtPrice(product.price))+' MAD'} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Message au vendeur *</label>
                  <textarea value={quoteMsg} onChange={e => setQuoteMsg(e.target.value)} rows={4} placeholder="Décrivez votre besoin, délai souhaité, conditions..." style={{ ...inp, resize:'vertical' }} />
                </div>
                <div style={{ display:'flex', gap:'0.8rem' }}>
                  <button onClick={() => quoteMutation.mutate({ product_id:product.id, quantity:qty, proposed_price:proposedPrice||null, message:quoteMsg, delivery_type:delivery })}
                    disabled={!quoteMsg || quoteMutation.isLoading}
                    style={{ flex:1, background:!quoteMsg?C.mid:C.forest, color:C.cream, border:'none', borderRadius:100, padding:'0.85rem', fontWeight:600, cursor:!quoteMsg?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    {quoteMutation.isLoading ? 'Envoi...' : '📤 Envoyer le devis'}
                  </button>
                  <button onClick={() => setShowQuote(false)}
                    style={{ background:'transparent', color:C.muted, border:'1px solid '+(C.mid), borderRadius:100, padding:'0.85rem 1.2rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PRODUITS SIMILAIRES ── */}
        {similar.length > 0 && (
          <div style={{ marginTop:'3.5rem' }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.8rem', color:C.forest, marginBottom:'1.5rem' }}>Produits similaires</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(220px,100%),1fr))', gap:'1rem' }}>
              {similar.map(p => {
                const pImgs = parseJSON(p.images, []);
                return (
                  <Link key={p.id} to={'/produit/'+p.slug}
                    style={{ background:C.white, border:'1px solid '+(C.mid), borderRadius:14, overflow:'hidden', textDecoration:'none', transition:'transform 0.2s, box-shadow 0.2s', display:'block' }}
                    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(30,61,15,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>
                    <div style={{ height:130, background:C.beige, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                      {pImgs[0]
                        ? <img src={pImgs[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} />
                        : <span style={{ fontSize:'2rem', opacity:0.2 }}>📦</span>}
                    </div>
                    <div style={{ padding:'0.9rem' }}>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'0.95rem', fontWeight:700, color:C.forest, lineHeight:1.3, marginBottom:'0.4rem' }}>
                        {p.title.substring(0,45)}{p.title.length>45?'...':''}
                      </div>
                      <div style={{ fontWeight:700, color:C.leaf, fontSize:'0.92rem' }}>{fmtPrice(p.price)} MAD</div>
                      <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:'0.2rem' }}>{p.location_city || ''}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles helpers ────────────────────────────────────────────
const btn = (bg, color, disabled, border) => ({
  background: disabled ? '#D9CEBC' : bg,
  color,
  border: border || 'none',
  padding:'0.85rem 1.2rem',
  borderRadius:100,
  fontWeight:600,
  fontSize:'0.92rem',
  cursor: disabled ? 'not-allowed' : 'pointer',
  width:'100%',
  fontFamily:"'DM Sans',sans-serif",
  opacity: disabled ? 0.7 : 1,
  transition:'opacity 0.2s, transform 0.15s',
});

const lbl = { fontSize:'0.82rem', fontWeight:600, color:'#1E3D0F', display:'block', marginBottom:'0.4rem' };
const inp = { width:'100%', padding:'0.72rem 1rem', border:'1.5px solid #D9CEBC', borderRadius:10, fontSize:'0.9rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' };
