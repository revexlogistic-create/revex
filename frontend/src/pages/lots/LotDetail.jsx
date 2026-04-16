// src/pages/lots/LotDetail.jsx — Détail d'un lot avec enchères
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import UserInfoModal from '../../components/ui/UserInfoModal';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import ReactDOM from 'react-dom';
import { generateBonLivraison, generateBonCommande } from '../../utils/generateLogisticsDoc';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
};

const LOT_TYPE_CONFIG = {
  recyclage:  { icon:'♻️', label:'Recyclage matière première', color:C.eco,    bg:'#E8F8EE' },
  diy:        { icon:'🔧', label:'Make It Yourself',           color:C.orange, bg:'#FEF5E7' },
  industriel: { icon:'🏭', label:'Pièces industrielles',       color:C.blue,   bg:'#EBF5FB' },
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');

function Countdown({ endDate }) {
  const [t, setT] = useState({});
  useEffect(() => {
    const tick = () => {
      const diff = new Date(endDate) - new Date();
      if (diff <= 0) { setT({ done:true }); return; }
      setT({
        d: Math.floor(diff/86400000),
        h: Math.floor((diff%86400000)/3600000),
        m: Math.floor((diff%3600000)/60000),
        s: Math.floor((diff%60000)/1000)
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  if (t.done) return <div style={{ color:C.urgent, fontWeight:700 }}>Enchère terminée</div>;
  return (
    <div style={{ display:'flex', gap:'0.5rem' }}>
      {t.d > 0 && <TimeBox v={t.d} l="jours"/>}
      <TimeBox v={t.h} l="heures"/>
      <TimeBox v={t.m} l="min"/>
      <TimeBox v={t.s} l="sec"/>
    </div>
  );
}

const TimeBox = ({ v, l }) => (
  <div style={{ background:C.forest, color:C.cream, borderRadius:10, padding:'0.5rem 0.8rem', textAlign:'center', minWidth:52 }}>
    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', fontWeight:700, lineHeight:1 }}>{String(v).padStart(2,'0')}</div>
    <div style={{ fontSize:'0.62rem', opacity:0.7, marginTop:2 }}>{l}</div>
  </div>
);


// ── Sélecteur trajets retour à vide pour LotDetail ────────────
function LotTransportPicker({ fromCity, toCity, selected, onSelect }) {
  const { data, isLoading } = useQuery(
    ['lot-eco-transports', fromCity, toCity],
    () => api.get('/transport?departure=' + (fromCity||'') + '&arrival=' + (toCity||'')).then(r => r.data),
    { staleTime: 60000, retry: false }
  );
  const transports = (data?.transports || []).filter(t => t.status === 'available');

  const C2 = { eco:'#27AE60', forest:'#1E3D0F', beige:'#EDE6D3', mid:'#D9CEBC', muted:'#5C5C50', white:'#FDFAF4' };

  if (isLoading) return (
    <div style={{ borderTop:'1px solid #A7F3D0', padding:'0.8rem 1.1rem', background:'#F0FDF4', display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.78rem', color:C2.muted }}>
      <span style={{ display:'inline-block', width:14, height:14, border:'2px solid '+C2.eco, borderTopColor:'transparent', borderRadius:'50%', animation:'lotSpin 0.8s linear infinite' }}/>
      Recherche des trajets retour à vide...
      <style>{'@keyframes lotSpin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );

  if (!transports.length) return (
    <div style={{ borderTop:'1px solid #A7F3D0', padding:'0.75rem 1.1rem', background:'#F0FDF4', fontSize:'0.78rem', color:'#065F46' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
        <span>ℹ️</span>
        <span>Aucun trajet retour à vide disponible sur ce corridor.</span>
      </div>
      <div style={{ fontSize:'0.7rem', color:'#047857', marginTop:'0.25rem' }}>Le transporteur sera assigné automatiquement à la commande.</div>
    </div>
  );

  return (
    <div style={{ borderTop:'1px solid #A7F3D0', padding:'0.75rem 1.1rem', background:'#F0FDF4' }}>
      <div style={{ fontSize:'0.72rem', fontWeight:700, color:C2.eco, marginBottom:'0.5rem' }}>
        🚛 {transports.length} trajet{transports.length>1?'s':''} disponible{transports.length>1?'s':''} sur ce corridor
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', maxHeight:180, overflowY:'auto' }}>
        {transports.map(t => {
          const isChosen = selected?.id === t.id;
          const depDate = new Date(t.departure_date).toLocaleDateString('fr-MA', { day:'2-digit', month:'short' });
          return (
            <div key={t.id}
              onClick={e => { e.stopPropagation(); onSelect(isChosen ? null : t); }}
              style={{ background:isChosen?'#DCFCE7':C2.white, border:'1.5px solid '+(isChosen?C2.eco:C2.mid), borderRadius:10, padding:'0.55rem 0.85rem', cursor:'pointer', transition:'all 0.15s', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:'0.82rem', fontWeight:700, color:C2.forest }}>
                  {t.departure_city} → {t.arrival_city}
                </div>
                <div style={{ fontSize:'0.68rem', color:C2.muted }}>
                  📅 {depDate} · 🚚 {t.vehicle_type||'Camion'} · 🏢 {t.carrier_company||'—'}
                  {t.capacity_tons ? ' · ⚖️ '+t.capacity_tons+'T' : ''}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', flexShrink:0, marginLeft:'0.5rem' }}>
                {t.price_per_kg && (
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:'0.88rem', color:C2.eco }}>
                    {t.price_per_kg} MAD/kg
                  </span>
                )}
                <span style={{ background:isChosen?C2.eco:'#D1FAE5', color:isChosen?'#fff':'#065F46', fontSize:'0.62rem', fontWeight:700, padding:'0.12rem 0.5rem', borderRadius:100 }}>
                  {isChosen?'✓ Choisi':'Choisir'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {selected && (
        <div style={{ marginTop:'0.5rem', fontSize:'0.72rem', color:C2.eco, fontWeight:600, display:'flex', alignItems:'center', gap:'0.4rem' }}>
          <span>✅</span>
          <span>{selected.carrier_company||'Transporteur'} · {selected.departure_city} → {selected.arrival_city}</span>
          <button onClick={e => { e.stopPropagation(); onSelect(null); }}
            style={{ background:'none', border:'none', color:'#991B1B', cursor:'pointer', fontSize:'0.78rem', marginLeft:'auto' }}>
            ✕ Retirer
          </button>
        </div>
      )}
    </div>
  );
}

export default function LotDetail() {
  const { slug }  = useParams();
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const [bidAmount, setBidAmount] = useState('');
  const [activeImg, setActiveImg] = useState(0);

  const [showTransportModal, setShowTransportModal] = useState(false);
  const [delivery, setDelivery] = useState('standard');
  const [selectedEcoTransport, setSelectedEcoTransport] = useState(null);

  React.useEffect(() => {
    if (showTransportModal) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [showTransportModal]);

  const { data, isLoading } = useQuery(
    ['lot', slug],
    () => api.get('/lots/'+slug+'').then(r => r.data),
    { refetchInterval: 5000 }
  );

  const lot   = data?.lot;
  const items = data?.items || [];
  const bids  = data?.bids  || [];

  const { data: warehouseData } = useQuery(
    ['lot-warehouse', lot?.id || ''],
    () => api.get('/warehouses/check-lot/' + lot.id).then(r => r.data).catch(() => null),
    { enabled: !!lot?.id, retry: false, staleTime: 60000 }
  );

  const bidMutation = useMutation(
    (amount) => api.post('/lots/'+lot.id+'/bid', { amount }),
    {
      onSuccess: (res) => {
        toast.success('🎉 Enchère de '+fmt(res.data.new_current_bid)+' MAD placée !');
        setBidAmount('');
        qc.invalidateQueries(['lot', slug]);
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur')
    }
  );

  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellerModal, setShowSellerModal] = useState(false);

  const buyMutation = useMutation(
    () => api.post('/lots/' + lot.id + '/buy', {
      delivery_mode: delivery,
      delivery_cost: delivCost,
    }),
    {
      onSuccess: (res) => {
        toast.success('🎉 ' + res.data.message);
        setShowBuyModal(false);
        qc.invalidateQueries(['lot', slug]);
        // Ouvrir conversation avec le vendeur
        contactMutation.mutate();
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur lors de l\'achat')
    }
  );

  const watchMutation = useMutation(
    () => api.post('/lots/'+lot.id+'/watch'),
    {
      onSuccess: (r) => {
        qc.invalidateQueries(['lot', slug]);
        qc.invalidateQueries('buyer-watched-lots'); // màj dashboard
        toast.info(r.data.watching ? '👁 Lot ajouté aux surveillés' : 'Surveillance retirée');
      }
    }
  );

  const contactMutation = useMutation(
    () => api.post('/messages/send', { recipient_id:lot.seller_id, content:'Bonjour, je suis intéressé par votre lot : "' + lot.title + '"' }),
    { onSuccess: (r) => navigate('/messages/' + r.data.conversation_id) }
  );

  if (isLoading) return <div style={{ textAlign:'center', padding:'4rem', color:C.muted }}>Chargement...</div>;
  if (!lot) return <div style={{ textAlign:'center', padding:'4rem', color:C.muted }}>Lot introuvable</div>;

  const warehouseInfo = warehouseData?.warehouse || null;

  const tc = LOT_TYPE_CONFIG[lot.lot_type] || { icon:'📦', label:lot.lot_type, color:C.muted, bg:C.beige };
  const isAuction   = lot.sale_type === 'auction';
  const isOwner     = user?.id === lot.seller_id;
  // Prix livraison estimé
  const delivCost = delivery === 'urgent' ? Math.round((lot.price||0)*0.05 + 500)
    : delivery === 'eco' ? Math.round((lot.total_weight_kg||50)*2)
    : Math.round((lot.total_weight_kg||50)*3);
  const canBid      = user && !isOwner && lot.status === 'auction_live';
  const minBid      = Number(lot.current_bid || lot.start_price || 0) + Number(lot.bid_increment || 100);
  const imgs        = typeof lot.images === 'string' ? (() => { try { return JSON.parse(lot.images); } catch { return []; } })() : (lot.images || []);

  return (
    <div style={{ background:'#F6F1E7', minHeight:'100vh' }}>

      {/* ── HERO BREADCRUMB ── */}
      <div style={{ background:'linear-gradient(135deg,#1E3D0F 0%,#2D5A1B 55%,#1E3D0F 100%)', padding:'1.8rem 2rem', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:160, height:160, borderRadius:'50%', border:'1px solid rgba(126,168,106,0.15)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.8rem', color:'rgba(246,241,231,0.55)', flexWrap:'wrap', marginBottom:'0.8rem' }}>
            <Link to="/lots" style={{ color:'#7EA86A', textDecoration:'none', fontWeight:500 }}>← Lots</Link>
            <span>›</span>
            <span style={{ background:tc.bg+'44', color:tc.color, borderRadius:100, padding:'0.1rem 0.6rem', fontSize:'0.72rem', fontWeight:600, border:'1px solid '+tc.color+'44' }}>{tc.icon} {tc.label}</span>
            <span>›</span>
            <span style={{ color:'rgba(246,241,231,0.7)' }}>{lot.title?.substring(0,40)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.9rem', fontWeight:700, color:'#F6F1E7', lineHeight:1.2, margin:0, maxWidth:700 }}>
                {lot.title}
              </h1>
              <div style={{ display:'flex', gap:'0.6rem', marginTop:'0.6rem', flexWrap:'wrap' }}>
                <span style={{ background:isAuction?'rgba(217,119,6,0.85)':'rgba(5,150,105,0.85)', color:'#fff', borderRadius:8, padding:'0.2rem 0.65rem', fontSize:'0.72rem', fontWeight:700 }}>
                  {isAuction ? '🔨 Enchère live' : '🏷️ Prix fixe'}
                </span>
                {lot.blind_lot && <span style={{ background:'rgba(30,30,30,0.8)', color:'#fff', borderRadius:8, padding:'0.2rem 0.65rem', fontSize:'0.7rem', fontWeight:700 }}>🙈 Lot aveugle</span>}
                {warehouseInfo && (
                  <span style={{ background:'rgba(37,99,235,0.85)', color:'#fff', borderRadius:8, padding:'0.2rem 0.65rem', fontSize:'0.7rem', fontWeight:700 }}>
                    🏢 Stocké chez REVEX · {warehouseInfo.name}
                  </span>
                )}
                <span style={{ background:'rgba(255,255,255,0.1)', color:'rgba(246,241,231,0.7)', borderRadius:8, padding:'0.2rem 0.65rem', fontSize:'0.72rem' }}>
                  🏭 {lot.seller_company}
                </span>
                {lot.location_city && <span style={{ background:'rgba(255,255,255,0.1)', color:'rgba(246,241,231,0.65)', borderRadius:8, padding:'0.2rem 0.65rem', fontSize:'0.72rem' }}>📍 {lot.location_city}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

    <div style={{ maxWidth:1200, margin:'0 auto', padding:'2rem 2rem 4rem' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 400px', gap:'2.5rem', alignItems:'start' }}>

        {/* ── GAUCHE ── */}
        <div>
          {/* Galerie */}
          <div style={{ background:'#fff', borderRadius:20, height:380, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', marginBottom:'0.8rem', position:'relative', border:'1px solid rgba(30,61,15,0.08)', boxShadow:'0 4px 24px rgba(30,61,15,0.07)' }}>
            {imgs[activeImg]
              ? <img src={imgs[activeImg]} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
              : <span style={{ fontSize:'6rem', opacity:0.2 }}>{tc.icon}</span>}
            <div style={{ position:'absolute', top:12, left:12, display:'flex', flexDirection:'column', gap:4 }}>
              {lot.industry_category && <span style={{ background:'rgba(30,61,15,0.8)', color:'#fff', borderRadius:8, padding:'0.25rem 0.7rem', fontSize:'0.72rem', fontWeight:600 }}>🏭 {lot.industry_category}</span>}
            </div>
          </div>
          {imgs.length > 1 && (
            <div style={{ display:'flex', gap:8, marginBottom:'1.5rem' }}>
              {imgs.map((img, i) => (
                <div key={i} onClick={() => setActiveImg(i)} style={{ width:68, height:68, borderRadius:10, overflow:'hidden', border:'2px solid '+(i===activeImg?C.leaf:C.mid), cursor:'pointer' }}>
                  <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div style={{ background:C.white, borderRadius:18, border:'1px solid '+C.mid, padding:'1.5rem', marginBottom:'1.5rem' }}>
            <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', color:C.forest, marginBottom:'1rem' }}>📋 Description du lot</h3>
            {lot.description ? (
              <p style={{ color:C.forest, lineHeight:1.8, fontSize:'0.92rem', whiteSpace:'pre-wrap' }}>{lot.description}</p>
            ) : <p style={{ color:C.muted, fontStyle:'italic' }}>Aucune description fournie.</p>}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem', marginTop:'1.2rem' }}>
              {[
                ['Condition', lot.condition==='mixed'?'Mixte':lot.condition==='new'?'Neuf':lot.condition==='good'?'Bon état':'Usagé'],
                ['Nb articles', items.length + ' article(s)'],
                ['Poids total', lot.total_weight_kg ? fmt(lot.total_weight_kg) + ' kg' : '—'],
                ['Valeur estimée', lot.total_value_est ? fmt(lot.total_value_est) + ' MAD' : '—'],
                ['Localisation', lot.location_city || '—'],
                ['Vendeur', lot.seller_company],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'0.45rem 0', borderBottom:'1px solid '+C.beige, fontSize:'0.84rem' }}>
                  <span style={{ color:C.muted }}>{k}</span>
                  <span style={{ color:C.forest, fontWeight:500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Liste des articles */}
          <div style={{ background:C.white, borderRadius:18, border:'1px solid '+C.mid, overflow:'hidden' }}>
            <div style={{ padding:'1.2rem 1.5rem', borderBottom:'1px solid '+C.mid, fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:C.forest }}>
              📦 Contenu du lot ({items.length} articles)
              {lot.blind_lot && <span style={{ marginLeft:10, background:'#2C3E50', color:'#fff', borderRadius:100, padding:'0.2rem 0.7rem', fontSize:'0.72rem', fontWeight:700 }}>🙈 Lot Aveugle</span>}
            </div>

            {/* Blind lot = articles masqués pour TOUT LE MONDE
                Révélés uniquement après vente (status = sold) */}
            {lot.blind_lot === true && lot.status !== 'sold' ? (
              <div style={{ padding:'3rem 2rem', textAlign:'center' }}>
                <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🙈</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:C.forest, marginBottom:'0.5rem' }}>
                  Lot Aveugle
                </div>
                <p style={{ color:C.muted, fontSize:'0.88rem', lineHeight:1.7, maxWidth:380, margin:'0 auto 1.5rem' }}>
                  Le contenu détaillé de ce lot est révélé uniquement après l'achat.<br/>
                  Vous achetez ce lot sans connaître précisément son contenu.<br/>
                  <strong style={{ color:C.orange }}>Poids total : {lot.total_weight_kg ? fmt(lot.total_weight_kg) + ' kg' : 'non précisé'} • {items.length} article(s)</strong>
                </p>
                <div style={{ background:'#FEF5E7', border:'1px solid #F0B27A', borderRadius:12, padding:'0.8rem 1.2rem', display:'inline-block', fontSize:'0.82rem', color:'#784212' }}>
                  ⚠️ Achat sans garantie de contenu spécifique — Lot vendu tel quel
                </div>
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
                <thead>
                  <tr style={{ background:C.beige }}>
                    {['Désignation','Réf','Qté','État','Notes'].map(h => (
                      <th key={h} style={{ padding:'0.6rem 1rem', textAlign:'left', color:C.muted, fontWeight:600, fontSize:'0.72rem', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={it.id} style={{ background:i%2===0?C.white:C.cream, borderBottom:'1px solid '+C.beige }}>
                      <td style={{ padding:'0.65rem 1rem', fontWeight:500, color:C.forest }}>
                        {it.product_slug ? (
                          <Link to={'/produit/'+it.product_slug} style={{ color:C.leaf, textDecoration:'none' }}>{it.designation}</Link>
                        ) : it.designation}
                      </td>
                      <td style={{ padding:'0.65rem 1rem', fontFamily:'monospace', fontSize:'0.75rem', color:C.muted }}>{it.reference||'—'}</td>
                      <td style={{ padding:'0.65rem 1rem', textAlign:'center' }}>{it.quantity} {it.unit}</td>
                      <td style={{ padding:'0.65rem 1rem' }}>
                        <span style={{ background:it.condition==='new'?'#E8F8EE':it.condition==='good'?'#EBF5FB':'#FEF5E7', color:it.condition==='new'?C.eco:it.condition==='good'?C.blue:C.orange, padding:'0.12rem 0.5rem', borderRadius:100, fontSize:'0.7rem', fontWeight:600 }}>
                          {it.condition==='new'?'Neuf':it.condition==='good'?'Bon état':'Usagé'}
                        </span>
                      </td>
                      <td style={{ padding:'0.65rem 1rem', color:C.muted, fontSize:'0.78rem' }}>{it.notes||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── DROITE ── */}
        <div style={{ position:'sticky', top:85 }}>
          {/* Prix + titre */}
          <div style={{ background:C.white, borderRadius:18, border:'1px solid '+C.mid, padding:'1.5rem', marginBottom:'1rem' }}>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', color:C.forest, lineHeight:1.3, marginBottom:'1rem' }}>{lot.title}</h1>

            {isAuction ? (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'0.5rem' }}>
                  <div style={{ fontSize:'0.78rem', color:C.muted }}>Enchère actuelle</div>
                  <div style={{ fontSize:'0.72rem', color:C.muted }}>{bids.length} enchère(s)</div>
                </div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.5rem', fontWeight:700, color:C.orange, marginBottom:'0.3rem' }}>
                  {fmt(lot.current_bid || lot.start_price)} MAD
                </div>
                <div style={{ fontSize:'0.78rem', color:C.muted, marginBottom:'1rem' }}>
                  Palier min : +{fmt(lot.bid_increment)} MAD · Prochaine min : {fmt(minBid)} MAD
                </div>
                {lot.auction_end && (
                  <div style={{ marginBottom:'1rem' }}>
                    <div style={{ fontSize:'0.78rem', color:C.muted, marginBottom:'0.5rem' }}>Fin de l'enchère</div>
                    <Countdown endDate={lot.auction_end} />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.5rem', fontWeight:700, color:C.leaf, marginBottom:'0.3rem' }}>
                  {fmt(lot.price)} MAD
                </div>
                {lot.negotiable && <div style={{ fontSize:'0.78rem', color:C.eco, fontWeight:600, marginBottom:'0.5rem' }}>✓ Prix négociable</div>}
                <div style={{ fontSize:'0.78rem', color:C.muted }}>{items.length} article(s) • {lot.total_weight_kg ? fmt(lot.total_weight_kg) + ' kg' : 'poids non précisé'}</div>
              </div>
            )}
          </div>

          {/* Entrepôt REVEX */}
          {warehouseInfo && (
            <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', borderRadius:16, padding:'1rem 1.2rem', marginBottom:'1rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.6rem' }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1rem', fontWeight:700, color:'#F6F1E7' }}>
                  🏢 Stocké chez REVEX
                </div>
                <Link to={'/admin/entrepot/'+warehouseInfo.id}
                  style={{ background:'rgba(255,255,255,0.12)', color:'rgba(246,241,231,0.8)', border:'1px solid rgba(255,255,255,0.2)', padding:'0.2rem 0.7rem', borderRadius:100, fontSize:'0.72rem', textDecoration:'none' }}>
                  Voir entrepôt →
                </Link>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem', fontSize:'0.72rem' }}>
                {[['🏭 Entrepôt',warehouseInfo.name],['📍 Ville',warehouseInfo.city],['✅ Statut','En stock'],['🚛 Expédition','Depuis REVEX · 24h']].map(([k,v])=>(
                  <div key={k} style={{ background:'rgba(255,255,255,0.07)', borderRadius:8, padding:'0.4rem 0.6rem' }}>
                    <div style={{ color:'rgba(246,241,231,0.4)', marginBottom:1 }}>{k}</div>
                    <div style={{ color:'#F6F1E7', fontWeight:600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sélection livraison */}
          <div style={{ background:C.white, borderRadius:14, border:'1.5px solid '+(delivery==='eco'?C.eco:delivery==='urgent'?C.urgent:'#6366F1'), marginBottom:'1rem', overflow:'hidden' }}>
            <div style={{ padding:'0.75rem 1.1rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                <span style={{ fontSize:'1.1rem' }}>{delivery==='eco'?'🌿':delivery==='urgent'?'⚡':'🚛'}</span>
                <div>
                  <div style={{ fontSize:'0.85rem', fontWeight:700, color:delivery==='eco'?C.eco:delivery==='urgent'?C.urgent:'#4338CA' }}>
                    {delivery==='eco'?'Livraison Éco':delivery==='urgent'?'Livraison Urgente':'Livraison Standard'}
                  </div>
                  <div style={{ fontSize:'0.7rem', color:C.muted }}>+{delivCost.toLocaleString('fr-MA')} MAD estimé</div>
                </div>
              </div>
              <button onClick={() => setShowTransportModal(true)}
                style={{ background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.32rem 0.75rem', borderRadius:100, fontSize:'0.75rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                Changer →
              </button>
            </div>
          </div>

          {/* ── POPUP TRANSPORT LOT ── */}
          {showTransportModal && ReactDOM.createPortal((
            <div onClick={() => setShowTransportModal(false)}
              style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.65)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', overflowY:'auto' }}>
              <div onClick={e => e.stopPropagation()}
                style={{ background:C.cream, borderRadius:22, maxWidth:500, width:'100%', maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.3)', margin:'auto' }}>
                <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', padding:'1.2rem 1.6rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
                  <div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.25rem', fontWeight:700, color:'#F6F1E7' }}>🚛 Mode de livraison</div>
                    <div style={{ fontSize:'0.72rem', color:'rgba(246,241,231,0.5)', marginTop:2 }}>Lot : {lot.title?.substring(0,35)}</div>
                  </div>
                  <button onClick={() => setShowTransportModal(false)}
                    style={{ background:'rgba(255,255,255,0.12)', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', color:'#F6F1E7', fontSize:'1rem' }}>✕</button>
                </div>

                <div style={{ padding:'1rem 1.5rem', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:'0.7rem' }}>

                  {/* ── Éco ── */}
                  <div onClick={() => setDelivery('eco')}
                    style={{ borderRadius:14, border:'2px solid '+(delivery==='eco'?C.eco:C.mid), background:delivery==='eco'?C.eco+'11':C.white, cursor:'pointer', overflow:'hidden', transition:'all 0.15s' }}>
                    <div style={{ padding:'0.9rem 1.1rem', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ display:'flex', gap:'0.7rem', alignItems:'flex-start' }}>
                        <div style={{ width:40, height:40, borderRadius:10, background:delivery==='eco'?C.eco:'#D1FAE5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>🌿</div>
                        <div>
                          <div style={{ fontWeight:700, color:C.eco, fontSize:'0.92rem' }}>Livraison Éco</div>
                          <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:2 }}>
                            Retour à vide · {lot.total_weight_kg||50} kg · {lot.location_city||'—'} → vous
                          </div>
                          <div style={{ display:'flex', gap:'0.35rem', marginTop:'0.45rem', flexWrap:'wrap' }}>
                            {['Économique','Éco-responsable','-60%'].map(t => (
                              <span key={t} style={{ background:C.eco+'22', color:C.eco, fontSize:'0.6rem', padding:'0.1rem 0.45rem', borderRadius:100, fontWeight:600 }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:'0.6rem' }}>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:C.eco }}>
                          +{Math.round((lot.total_weight_kg||50)*2).toLocaleString('fr-MA')} MAD
                        </div>
                        {delivery==='eco' && <div style={{ fontSize:'0.62rem', color:C.eco, fontWeight:700 }}>✓ Sélectionné</div>}
                      </div>
                    </div>
                    {/* Trajets réels retour à vide */}
                    {delivery === 'eco' && (
                      <LotTransportPicker
                        fromCity={lot.location_city || lot.seller_city}
                        toCity={user?.city}
                        selected={selectedEcoTransport}
                        onSelect={t => {
                          setSelectedEcoTransport(t);
                          if (t) toast.info('🚛 Trajet : '+t.departure_city+' → '+t.arrival_city);
                        }}
                      />
                    )}
                  </div>

                  {/* ── Standard ── */}
                  <div onClick={() => { setDelivery('standard'); setSelectedEcoTransport(null); }}
                    style={{ borderRadius:14, border:'2px solid '+(delivery==='standard'?'#4338CA':C.mid), background:delivery==='standard'?'#EEF2FF':C.white, cursor:'pointer', padding:'0.9rem 1.1rem', transition:'all 0.15s' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ display:'flex', gap:'0.7rem', alignItems:'flex-start' }}>
                        <div style={{ width:40, height:40, borderRadius:10, background:delivery==='standard'?'#6366F1':'#E0E7FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>🚛</div>
                        <div>
                          <div style={{ fontWeight:700, color:'#4338CA', fontSize:'0.92rem' }}>Livraison Standard</div>
                          <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:2 }}>Transporteur partenaire · 3-5 jours</div>
                          <div style={{ display:'flex', gap:'0.35rem', marginTop:'0.45rem', flexWrap:'wrap' }}>
                            {['Fiable','Suivi GPS','Assurance'].map(t => (
                              <span key={t} style={{ background:'#6366F122', color:'#4338CA', fontSize:'0.6rem', padding:'0.1rem 0.45rem', borderRadius:100, fontWeight:600 }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:'0.6rem' }}>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:'#4338CA' }}>
                          +{Math.round((lot.total_weight_kg||50)*3).toLocaleString('fr-MA')} MAD
                        </div>
                        {delivery==='standard' && <div style={{ fontSize:'0.62rem', color:'#4338CA', fontWeight:700 }}>✓ Sélectionné</div>}
                      </div>
                    </div>
                  </div>

                  {/* ── Urgente ── */}
                  <div onClick={() => { setDelivery('urgent'); setSelectedEcoTransport(null); }}
                    style={{ borderRadius:14, border:'2px solid '+(delivery==='urgent'?C.urgent:C.mid), background:delivery==='urgent'?'#FEF2F2':C.white, cursor:'pointer', padding:'0.9rem 1.1rem', transition:'all 0.15s' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ display:'flex', gap:'0.7rem', alignItems:'flex-start' }}>
                        <div style={{ width:40, height:40, borderRadius:10, background:delivery==='urgent'?C.urgent:'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>⚡</div>
                        <div>
                          <div style={{ fontWeight:700, color:C.urgent, fontSize:'0.92rem' }}>Livraison Urgente</div>
                          <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:2 }}>Express porte-à-porte · 24-48h</div>
                          <div style={{ display:'flex', gap:'0.35rem', marginTop:'0.45rem', flexWrap:'wrap' }}>
                            {['Express','Prioritaire','Garanti'].map(t => (
                              <span key={t} style={{ background:C.urgent+'22', color:C.urgent, fontSize:'0.6rem', padding:'0.1rem 0.45rem', borderRadius:100, fontWeight:600 }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:'0.6rem' }}>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:C.urgent }}>
                          +{Math.round((lot.price||0)*0.05+500).toLocaleString('fr-MA')} MAD
                        </div>
                        {delivery==='urgent' && <div style={{ fontSize:'0.62rem', color:C.urgent, fontWeight:700 }}>✓ Sélectionné</div>}
                      </div>
                    </div>
                  </div>

                </div>

                <div style={{ padding:'0.9rem 1.5rem', borderTop:'1px solid '+C.beige, background:C.white, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
                  <div style={{ fontSize:'0.75rem', color:C.muted }}>
                    Mode : <strong style={{ color:C.forest }}>{delivery==='eco'?'Éco':delivery==='urgent'?'Urgent':'Standard'} · +{delivCost.toLocaleString('fr-MA')} MAD</strong>
                  </div>
                  <button onClick={() => setShowTransportModal(false)}
                    style={{ background:C.forest, color:C.cream, border:'none', padding:'0.6rem 1.5rem', borderRadius:100, fontWeight:700, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    ✅ Confirmer
                  </button>
                </div>
              </div>
            </div>
          ), document.body)}

          {/* Actions */}
          <div style={{ background:C.white, borderRadius:18, border:'1px solid '+C.mid, padding:'1.2rem', marginBottom:'1rem' }}>
            {!user ? (
              <Link to="/login" style={{ display:'block', background:C.forest, color:C.cream, textAlign:'center', padding:'0.9rem', borderRadius:100, textDecoration:'none', fontWeight:600, fontSize:'0.95rem' }}>
                Se connecter pour participer
              </Link>
            ) : isOwner ? (
              <div style={{ fontSize:'0.85rem', color:C.muted, textAlign:'center', padding:'0.5rem' }}>Votre lot</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem' }}>
                {isAuction && canBid && (
                  <div>
                    <label style={{ fontSize:'0.8rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.4rem' }}>
                      Mon enchère (min {fmt(minBid)} MAD)
                    </label>
                    <div style={{ display:'flex', gap:'0.5rem' }}>
                      <input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)}
                        placeholder={String(minBid)} min={minBid}
                        style={{ flex:1, padding:'0.65rem 0.9rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.9rem', fontFamily:"'DM Sans',sans-serif", outline:'none' }}/>
                      <button onClick={() => bidAmount && bidMutation.mutate(Number(bidAmount))} disabled={!bidAmount || Number(bidAmount)<minBid || bidMutation.isLoading}
                        style={{ background:Number(bidAmount)>=minBid?C.orange:C.mid, color:'#fff', border:'none', padding:'0.65rem 1.2rem', borderRadius:100, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'0.88rem', whiteSpace:'nowrap' }}>
                        {bidMutation.isLoading ? '⏳' : '🔨 Enchérir'}
                      </button>
                    </div>
                    {/* Boutons rapides */}
                    <div style={{ display:'flex', gap:'0.4rem', marginTop:'0.5rem', flexWrap:'wrap' }}>
                      {[minBid, minBid+500, minBid+1000, minBid+2000].map(v => (
                        <button key={v} onClick={() => setBidAmount(String(v))}
                          style={{ background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.25rem 0.6rem', borderRadius:100, fontSize:'0.72rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          {fmt(v)} MAD
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {!isAuction && (
                  <button onClick={() => setShowBuyModal(true)}
                    style={{ background:C.forest, color:C.cream, border:'none', padding:'0.9rem', borderRadius:100, fontWeight:700, fontSize:'0.95rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    🛒 Acheter ce lot — {fmt(lot.price)} MAD
                  </button>
                )}
                <button onClick={() => watchMutation.mutate()}
                  style={{ background:lot.is_watching?'#E8F8EE':'transparent', color:lot.is_watching?C.eco:C.muted, border:'1px solid '+(lot.is_watching?C.eco:C.mid), padding:'0.7rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'0.85rem', fontWeight:500 }}>
                  {lot.is_watching ? '👁 Surveillé' : '👁 Surveiller ce lot'}
                </button>
                <button onClick={() => contactMutation.mutate()}
                  style={{ background:'transparent', color:C.blue, border:'1px solid '+C.blue+'44', padding:'0.7rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:'0.85rem' }}>
                  ✉️ Contacter le vendeur
                </button>
              </div>
            )}
          </div>

          {/* Historique enchères */}
          {isAuction && bids.length > 0 && (
            <div style={{ background:C.white, borderRadius:16, border:'1px solid '+C.mid, padding:'1.2rem' }}>
              <div style={{ fontWeight:700, fontSize:'0.88rem', color:C.forest, marginBottom:'0.8rem' }}>🔨 Historique des enchères</div>
              <div style={{ maxHeight:200, overflowY:'auto' }}>
                {bids.map((b, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0', borderBottom:'1px solid '+C.beige, fontSize:'0.82rem' }}>
                    <div>
                      <span style={{ fontWeight:b.is_winning?700:400, color:b.is_winning?C.orange:C.muted }}>
                        {b.is_winning ? '🏆 ' : ''}{b.bidder_company}
                      </span>
                    </div>
                    <div style={{ fontWeight:700, color:b.is_winning?C.orange:C.forest }}>
                      {fmt(b.amount)} MAD
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendeur */}
          <div onClick={() => !isOwner && setShowSellerModal(true)}
            style={{ background:C.white, borderRadius:16, border:'1px solid '+C.mid, padding:'1.2rem', marginTop:'1rem', cursor:isOwner?'default':'pointer', transition:'box-shadow 0.2s' }}
            onMouseEnter={e => !isOwner && (e.currentTarget.style.boxShadow='0 4px 20px rgba(30,61,15,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow='none')}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
              <div style={{ fontWeight:700, fontSize:'0.82rem', color:C.forest }}>🏭 Vendeur</div>
              {!isOwner && <span style={{ fontSize:'0.7rem', color:C.leaf, fontWeight:600 }}>Voir profil →</span>}
            </div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', fontWeight:700, color:C.forest }}>{lot.seller_company}</div>
            <div style={{ fontSize:'0.78rem', color:C.muted, marginTop:'0.2rem' }}>📍 {lot.seller_city} • ⭐ {Number(lot.seller_rating||0).toFixed(1)}/5</div>
          </div>
        </div>
      </div>

      {/* Modal vendeur */}
      {showSellerModal && lot.seller_id && (
        <UserInfoModal
          userId={lot.seller_id}
          userName={lot.seller_company}
          userRole="seller"
          onClose={() => setShowSellerModal(false)}
          onContact={() => { setShowSellerModal(false); contactMutation.mutate(); }}
        />
      )}

      {/* ── MODAL CONFIRMATION ACHAT ── */}
      {showBuyModal && (
        <div onClick={() => setShowBuyModal(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:C.white, borderRadius:24, padding:'2rem', maxWidth:460, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', color:C.forest, marginBottom:'0.5rem' }}>
              🛒 Confirmer l'achat
            </h2>
            <p style={{ fontSize:'0.85rem', color:C.muted, marginBottom:'1.5rem' }}>
              {lot.title}
            </p>

            {/* Récap */}
            <div style={{ background:C.beige, borderRadius:14, padding:'1.2rem', marginBottom:'1.5rem' }}>
              {[
                ['Lot', lot.title?.substring(0,45)],
                ['Vendeur', lot.seller_company],
                ['Nb articles', items.length + ' article(s)'],
                lot.blind_lot ? ['Contenu', '🙈 Lot aveugle — révélé après achat'] : null,
                ['Montant total', fmt(lot.price) + ' MAD HT'],
              ].filter(Boolean).map(([k, v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'0.45rem 0', borderBottom:'1px solid '+C.mid, fontSize:'0.85rem' }}>
                  <span style={{ color:C.muted }}>{k}</span>
                  <span style={{ color:C.forest, fontWeight:600 }}>{v}</span>
                </div>
              ))}
              {/* Livraison sélectionnée */}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'0.45rem 0', borderBottom:'1px solid '+C.mid, fontSize:'0.85rem' }}>
                <span style={{ color:C.muted }}>
                  {delivery==='eco'?'🌿':delivery==='urgent'?'⚡':'🚛'} Livraison {delivery==='eco'?'Éco':delivery==='urgent'?'Urgente':'Standard'}
                </span>
                <span style={{ color:C.forest, fontWeight:600 }}>+{fmt(delivCost)} MAD</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:'0.7rem', fontSize:'1.1rem' }}>
                <span style={{ fontWeight:700, color:C.forest }}>Total TTC</span>
                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:700, color:C.leaf }}>
                  {fmt(Number(lot.price||0) + delivCost)} MAD
                </span>
              </div>
            </div>

            {/* Changer mode de livraison depuis le modal */}
            <div style={{ background:C.beige, borderRadius:10, padding:'0.65rem 1rem', marginBottom:'1rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:'0.78rem', color:C.muted }}>
                Mode : <strong style={{ color:C.forest }}>{delivery==='eco'?'Éco — Retour à vide':delivery==='urgent'?'Urgente — Express':'Standard'}</strong>
              </div>
              <button onClick={() => { setShowBuyModal(false); setShowTransportModal(true); }}
                style={{ background:'transparent', color:C.leaf, border:'none', fontSize:'0.75rem', cursor:'pointer', fontWeight:600, textDecoration:'underline' }}>
                Changer →
              </button>
            </div>

            <div style={{ background:'#E8F8EE', border:'1px solid #a8dfc0', borderRadius:10, padding:'0.7rem 1rem', marginBottom:'1.5rem', fontSize:'0.78rem', color:'#145A32' }}>
              🔒 Paiement sécurisé escrow — libéré à la confirmation de réception.<br/>
              📞 Le vendeur sera contacté automatiquement après l'achat.
            </div>

            <div style={{ display:'flex', gap:'0.8rem' }}>
              <button onClick={() => buyMutation.mutate()} disabled={buyMutation.isLoading}
                style={{ flex:1, background:buyMutation.isLoading?C.mid:C.forest, color:C.cream, border:'none', padding:'0.9rem', borderRadius:100, fontWeight:700, fontSize:'0.95rem', cursor:buyMutation.isLoading?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                {buyMutation.isLoading ? '⏳ Traitement...' : '✅ Confirmer l\'achat'}
              </button>
              <button onClick={() => setShowBuyModal(false)}
                style={{ background:'transparent', color:C.muted, border:'1px solid '+C.mid, padding:'0.9rem 1.4rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
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
