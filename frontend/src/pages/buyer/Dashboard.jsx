// src/pages/buyer/Dashboard.jsx — REVEX Acheteur
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
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
};

const STATUS_FR = {
  pending:'En attente', confirmed:'Confirmée', shipped:'Expédiée',
  delivered:'Livrée', cancelled:'Annulée',
  accepted:'Accepté', rejected:'Refusé', expired:'Expiré'
};

const STATUS_COLOR = {
  pending:C.orange, confirmed:C.blue, shipped:C.leaf,
  delivered:C.eco, cancelled:C.urgent,
  accepted:C.eco, rejected:C.urgent, expired:C.muted
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');

export default function BuyerDashboard() {
  const { user }    = useAuth();
  const qc          = useQueryClient();
  const navigate    = useNavigate();
  const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' && window.innerWidth < 769);
  React.useEffect(function() { var h = function() { setIsMobile(window.innerWidth < 769); }; window.addEventListener('resize', h); return function() { window.removeEventListener('resize', h); }; }, []);
  const [orderFilter, setOrderFilter] = useState('all');

  const { data: ordersData, isLoading: loadOrd } = useQuery(
    'buyer-orders-all',
    () => api.get('/orders?role_as=buyer&limit=1000').then(r => r.data),
    { refetchInterval: 30000 }
  );
  const { data: quotesData, isLoading: loadQuotes } = useQuery(
    'buyer-quotes-all',
    () => api.get('/quotes?role_as=buyer&limit=1000').then(r => r.data),
    { refetchInterval: 30000 }
  );
  const { data: favsData } = useQuery(
    'buyer-favorites',
    () => api.get('/users/me/favorites').then(r => r.data),
    { retry: false }
  );
  const { data: urgentData } = useQuery(
    'buyer-urgent',
    () => api.get('/analysis/urgent').then(r => r.data).catch(() => ({ requests:[] })),
    { retry: false }
  );
  const { data: watchedData, isLoading: loadWatched } = useQuery(
    'buyer-watched-lots',
    () => api.get('/lots/watched').then(r => r.data),
    { refetchInterval: 15000, retry: 1, staleTime: 5000 }
  );

  const orders       = ordersData?.orders  || [];
  const quotes       = quotesData?.quotes  || [];
  const favs         = favsData?.favorites || [];
  const urgents      = urgentData?.requests|| [];
  const watchedLots  = watchedData?.lots   || [];
  const watchedCount = watchedData?.total  ?? watchedLots.length;

  // ── KPIs ─────────────────────────────────────────────────────
  const deliveredOrders  = orders.filter(o => o.status === 'delivered');
  const pendingOrders    = orders.filter(o => o.status === 'pending');
  const totalSpent       = deliveredOrders.reduce((s, o) => s + Number(o.final_price||0), 0);
  const pendingQuotes    = quotes.filter(q => q.status === 'pending').length;
  const acceptedQuotes   = quotes.filter(q => q.status === 'accepted').length;

  const filteredOrders = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter);

  const removeFav = useMutation(
    (productId) => api.post('/products/'+productId+'/favorite'),
    {
      onSuccess: () => { toast.success('🤍 Retiré des favoris'); qc.invalidateQueries('buyer-favorites'); }
    }
  );

  return (
    <div style={{ background:C.cream, minHeight:'100vh' }}>
    <div style={{ maxWidth:1280, margin:'0 auto', padding:'1.5rem clamp(1rem,4vw,2rem) 4rem' }}>

      {/* ── EN-TÊTE ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.2rem', color:C.forest, marginBottom:'0.2rem' }}>
            {user && user.role === 'acheteur_auto' ? 'Mon espace Auto' : 'Mon espace Acheteur'}
          </h1>
          <p style={{ color:C.muted, fontSize:'0.9rem' }}>
            {user && user.role === 'acheteur_auto'
              ? ((user.contact_name || user.company_name) + ' • ' + (user.city || 'Maroc') + ' • Particulier')
              : ((user ? user.company_name : '') + ' • ' + (user ? user.city : '') + ' • ' + (user && user.sector ? user.sector : 'Industrie'))}
          </p>
        </div>
        <div style={{ display:'flex', gap:'0.7rem', flexWrap:'wrap' }}>
          {(!user || user.role !== 'acheteur_auto') && (
            <Link to="/buyer/urgence" style={btnLink('#FDECEA', C.urgent, '1px solid '+C.urgent)}>⚡ Demande urgente</Link>
          )}
          <Link to={user && user.role === 'acheteur_auto' ? '/pieces-auto' : '/catalogue'}
            style={btnLink(user && user.role === 'acheteur_auto' ? '#1A3C2E' : C.forest, '#F4F6F4')}>
            {user && user.role === 'acheteur_auto' ? '🚗 Pièces Auto' : '📦 Parcourir le catalogue'}
          </Link>
        </div>
      </div>

      {/* ── KPIs PRINCIPAUX ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(150px,100%),1fr))', gap:'1rem', marginBottom:'2rem' }}>
        {(user && user.role === 'acheteur_auto' ? [
          { icon:'🚗', label:'Mes commandes',       value:orders.length,            sub:deliveredOrders.length+' livrées',   color:C.blue,   to:'/buyer/commandes' },
          { icon:'💰', label:'Total dépensé',        value:fmt(totalSpent)+' MAD',   sub:pendingOrders.length+' en attente', color:C.forest,  to:null },
          { icon:'❤️', label:'Mes favoris',          value:favs.length,              sub:'pièces auto sauvegardées',         color:C.urgent,  to:'#section-favoris' },
          { icon:'🔍', label:'Marketplace Auto',     value:'Explorer',               sub:'Toutes marques · Maroc',           color:'#1A3C2E', to:'/pieces-auto' },
        ] : [
          { icon:'🛒', label:'Total commandes',     value:orders.length,            sub:deliveredOrders.length+' livrées',   color:C.blue,   to:null },
          { icon:'💰', label:'Total dépensé',        value:fmt(totalSpent)+' MAD',   sub:pendingOrders.length+' en attente', color:C.forest,  to:null },
          { icon:'💬', label:'Devis envoyés',         value:quotes.length,            sub:acceptedQuotes+' acceptés',         color:C.orange,  to:null },
          { icon:'❤️', label:'Favoris',              value:favs.length,              sub:urgents.length+' demandes urgentes',color:C.urgent,  to:null },
          { icon:'👁', label:'Lots surveillés',      value:watchedCount,             sub:watchedLots.filter(l=>l.sale_type==='auction').length+' enchères', color:'#8E44AD', to:null },
        ]).map(function(k) {
          var inner = (
            <React.Fragment>
              <div style={{ fontSize:'1.8rem', marginBottom:'0.5rem' }}>{k.icon}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.7rem', fontWeight:700, color:k.color, lineHeight:1 }}>{k.value}</div>
              <div style={{ fontSize:'0.78rem', fontWeight:600, color:C.forest, marginTop:'0.4rem' }}>{k.label}</div>
              <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:'0.1rem' }}>{k.sub}</div>
            </React.Fragment>
          );
          if (k.to && k.to.startsWith('#')) {
            return (
              <div key={k.label} onClick={function() { var el = document.getElementById(k.to.substring(1)); if(el) el.scrollIntoView({behavior:'smooth'}); }}
                style={{ textDecoration:'none', display:'block', background:C.white, border:'1px solid '+C.mid, borderRadius:16, padding:'1.4rem', transition:'all 0.15s', cursor:'pointer' }}>
                {inner}
              </div>
            );
          }
          if (k.to) {
            return (
              <Link key={k.label} to={k.to} style={{ textDecoration:'none', display:'block', background:C.white, border:'1px solid '+C.mid, borderRadius:16, padding:'1.4rem', transition:'all 0.15s' }}>
                {inner}
              </Link>
            );
          }
          return (
            <div key={k.label} style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:16, padding:'1.4rem' }}>
              {inner}
            </div>
          );
        })}
      </div>

      {!isMobile && <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:'2rem', marginBottom:'1.5rem' }}>

        {/* ── TOUTES MES COMMANDES ── */}
        <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, padding: isMobile ? '1rem' : '1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <h2 style={h2}>🛒 Mes commandes <span style={{ fontSize:'0.8rem', color:C.muted, fontWeight:400 }}>({orders.length})</span></h2>
            <Link to="/buyer/commandes" style={linkBtn}>Voir tout →</Link>
          </div>

          {/* Filtres */}
          <div className='tabs-scroll' style={{ display:'flex', gap:'0.4rem', marginBottom:'1rem', flexWrap:'nowrap', overflowX:'auto', paddingBottom:4 }}>
            {[['all','Toutes'], ['pending','En attente'], ['confirmed','Confirmées'], ['delivered','Livrées'], ['cancelled','Annulées']].map(([val, label]) => (
              <button key={val} onClick={() => setOrderFilter(val)}
                style={{ padding:'0.28rem 0.75rem', borderRadius:100, border:'1px solid '+(orderFilter===val ? C.leaf : C.mid), background:orderFilter===val?'#E8F8EE':'transparent', color:orderFilter===val?C.leaf:C.muted, fontSize:'0.75rem', fontWeight:orderFilter===val?700:400, cursor:'pointer' }}>
                {label} ({val==='all'?orders.length:orders.filter(o=>o.status===val).length})
              </button>
            ))}
          </div>

          {loadOrd ? <Loading/> : filteredOrders.length === 0 ? (
            <Empty icon="🛒" msg="Aucune commande" action={{ to:'/catalogue', label:'Parcourir le catalogue' }} />
          ) : isMobile ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                {filteredOrders.map(function(o) { return (
                  <div key={o.id} style={{ background:C.beige, borderRadius:12, padding:'0.9rem 1rem', border:'1px solid '+C.mid }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.4rem' }}>
                      <div style={{ fontSize:'0.72rem', color:C.muted, fontFamily:'monospace' }}>{o.order_number||(o.id ? o.id.substring(0,12) : '—')}</div>
                      <span style={{ background:STATUS_COLOR[o.status]||C.muted, color:'#fff', borderRadius:100, padding:'0.12rem 0.6rem', fontSize:'0.68rem', fontWeight:700 }}>
                        {STATUS_FR[o.status]||o.status}
                      </span>
                    </div>
                    <div style={{ fontWeight:700, color:C.forest, fontSize:'0.88rem', marginBottom:'0.2rem' }}>{o.product_title||o.product_name||'—'}</div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontSize:'0.75rem', color:C.muted }}>{o.seller_company||'—'} · {o.created_at ? new Date(o.created_at).toLocaleDateString('fr-MA') : '—'}</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, color:C.forest, fontSize:'1rem' }}>{fmt(o.final_price||o.price)} MAD</div>
                    </div>
                  </div>
                ); })}
              </div>
            ) : (
            <div style={{ maxHeight:400, overflowY:'auto', overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
              <table style={{ width:'100%', minWidth:520, borderCollapse:'collapse', fontSize:'0.83rem' }}>
                <thead>
                  <tr style={{ background:C.beige, position:'sticky', top:0 }}>
                    {['N° commande','Produit','Vendeur','Date','Montant','Statut'].map(h => (
                      <th key={h} style={{ padding:'0.6rem 0.7rem', textAlign:'left', color:C.muted, fontWeight:600, fontSize:'0.72rem', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o, i) => (
                    <tr key={o.id} style={{ background:i%2===0?C.white:C.cream, borderBottom:'1px solid '+(C.beige) }}>
                      <td style={{ padding:'0.65rem 0.7rem', fontFamily:'monospace', fontSize:'0.75rem', color:C.muted }}>{o.order_number}</td>
                      <td style={{ padding:'0.65rem 0.7rem', color:C.forest, fontWeight:500, maxWidth:160 }}>{o.product_title ? o.product_title.substring(0,32) : '—'}</td>
                      <td style={{ padding:'0.65rem 0.7rem', color:C.muted }}>{o.seller_company ? o.seller_company.substring(0,20) : '—'}</td>
                      <td style={{ padding:'0.65rem 0.7rem', color:C.muted, fontSize:'0.75rem' }}>{new Date(o.created_at).toLocaleDateString('fr-MA')}</td>
                      <td style={{ padding:'0.65rem 0.7rem', fontWeight:700, color:C.leaf }}>{fmt(o.final_price)} MAD</td>
                      <td style={{ padding:'0.65rem 0.7rem' }}>
                        <span style={{ background:(STATUS_COLOR[o.status]||'#888')+'22', color:STATUS_COLOR[o.status]||'#888', padding:'0.18rem 0.55rem', borderRadius:100, fontSize:'0.7rem', fontWeight:600, whiteSpace:'nowrap' }}>
                          {STATUS_FR[o.status]||o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── DEVIS ENVOYÉS — masqué pour acheteur_auto ── */}
        {(!user || user.role !== 'acheteur_auto') && <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, padding:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.2rem' }}>
            <h2 style={h2}>💬 Mes devis <span style={{ fontSize:'0.8rem', color:C.muted, fontWeight:400 }}>({quotes.length})</span></h2>
            <Link to="/buyer/devis" style={linkBtn}>Voir tout →</Link>
          </div>
          {loadQuotes ? <Loading/> : quotes.length === 0 ? (
            <Empty icon="💬" msg="Aucun devis envoyé" action={{ to:'/catalogue', label:'Trouver un produit' }} />
          ) : (
            <div style={{ maxHeight:400, overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.6rem' }}>
              {quotes.map(q => (
                <div key={q.id} style={{ background:C.beige, borderRadius:12, padding:'0.85rem', border:'1px solid '+C.mid }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.3rem' }}>
                    <Link to={'/produit/'+q.product_slug} style={{ fontWeight:600, fontSize:'0.85rem', color:C.forest, textDecoration:'none' }}>
                      {q.product_title?.substring(0,40)}
                    </Link>
                    <span style={{ background:(STATUS_COLOR[q.status]||'#888')+'22', color:STATUS_COLOR[q.status]||'#888', padding:'0.12rem 0.5rem', borderRadius:100, fontSize:'0.7rem', fontWeight:600, flexShrink:0, marginLeft:6 }}>
                      {STATUS_FR[q.status]||q.status}
                    </span>
                  </div>
                  <div style={{ fontSize:'0.75rem', color:C.muted, marginBottom:'0.2rem' }}>
                    Vendeur : {q.seller_company}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:C.forest }}>
                    Qté: <strong>{q.quantity}</strong>
                    {q.proposed_price && <> • Prix proposé: <strong style={{color:C.leaf}}>{fmt(q.proposed_price)} MAD</strong></>}
                  </div>
                  {q.seller_response && (
                    <div style={{ fontSize:'0.73rem', color:C.muted, marginTop:'0.4rem', fontStyle:'italic', background:C.white, borderRadius:8, padding:'0.35rem 0.6rem' }}>
                      Réponse vendeur : "{q.seller_response.substring(0,60)}"
                    </div>
                  )}
                  <div style={{ fontSize:'0.7rem', color:C.muted, marginTop:'0.3rem' }}>
                    {new Date(q.created_at).toLocaleDateString('fr-MA')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>}
      </div>}

      {/* ── FAVORIS + ACTIONS ── */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: isMobile ? '1.2rem' : '2rem' }}>

        {/* Favoris — PDR ou Auto selon le rôle */}
        <div id="section-favoris" style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, padding:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.2rem' }}>
            <h2 style={h2}>
              {user && user.role === 'acheteur_auto' ? '🚗' : '❤️'} Mes favoris
              <span style={{ fontSize:'0.8rem', color:C.muted, fontWeight:400 }}> ({favs.length})</span>
            </h2>
            <Link to={user && user.role === 'acheteur_auto' ? '/pieces-auto' : '/catalogue'}
              style={{ fontSize:'0.8rem', color:C.leaf, textDecoration:'none', fontWeight:600 }}>
              {user && user.role === 'acheteur_auto' ? 'Pièces auto →' : 'Catalogue →'}
            </Link>
          </div>
          {favs.length === 0 ? (
            <Empty icon={user && user.role === 'acheteur_auto' ? '🚗' : '❤️'}
              msg={user && user.role === 'acheteur_auto' ? 'Aucune pièce auto en favori' : 'Aucun favori sauvegardé'}
              action={{ to: user && user.role === 'acheteur_auto' ? '/pieces-auto' : '/catalogue', label: user && user.role === 'acheteur_auto' ? 'Parcourir les pièces auto' : 'Parcourir le catalogue' }} />
          ) : (
            <div style={{ maxHeight:400, overflowY:'auto' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.7rem' }}>
                {favs.map(p => {
                  const imgs = typeof p.images === 'string' ? (() => { try { return JSON.parse(p.images); } catch { return []; } })() : (p.images || []);
                  const isAuto = p.is_auto === true;
                  const detailPath = isAuto ? '/auto/'+p.slug : '/produit/'+p.slug;
                  return (
                    <div key={p.id} style={{ background:isAuto?'#EEF4F0':C.beige, borderRadius:12, overflow:'hidden', border:'1px solid '+(isAuto?'#C8D4C8':C.mid), position:'relative' }}>
                      <button onClick={() => removeFav.mutate(p.id)}
                        style={{ position:'absolute', top:5, right:5, background:'rgba(255,255,255,0.8)', border:'none', borderRadius:'50%', width:22, height:22, cursor:'pointer', fontSize:'0.7rem', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1 }}>
                        ✕
                      </button>
                      <div style={{ height:80, background:C.mid, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {imgs[0] ? <img src={imgs[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} /> : <span style={{ fontSize:'1.8rem', opacity:0.2 }}>{isAuto?'🔧':'📦'}</span>}
                      </div>
                      <div style={{ padding:'0.7rem' }}>
                        <Link to={detailPath} style={{ fontSize:'0.8rem', fontWeight:600, color:C.forest, textDecoration:'none', lineHeight:1.3, display:'block', marginBottom:'0.3rem' }}>
                          {p.title && p.title.substring(0,38)}{p.title && p.title.length>38?'...':''}
                        </Link>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, color:isAuto?'#1A3C2E':C.leaf, fontSize:'0.92rem' }}>{fmt(p.price)} MAD</div>
                        {isAuto && p.vehicle_make && <div style={{ fontSize:'0.7rem', color:'#4A4E5A', marginTop:'0.1rem' }}>🚗 {p.vehicle_make} {p.vehicle_model||''}</div>}
                        {!isAuto && p.location_city && <div style={{ fontSize:'0.7rem', color:C.muted, marginTop:'0.1rem' }}>📍 {p.location_city}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions + demandes urgentes */}
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {/* Demandes urgentes */}
          {urgents.length > 0 && (
            <div style={{ background:'#FDECEA', border:'1px solid '+(C.urgent), borderRadius:18, padding:'1.2rem' }}>
              <h2 style={{ ...h2, color:C.urgent, marginBottom:'0.8rem' }}>⚡ Demandes urgentes ({urgents.length})</h2>
              <div style={{ maxHeight:140, overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                {urgents.map(u => (
                  <div key={u.id} style={{ background:C.white, borderRadius:10, padding:'0.6rem 0.8rem', fontSize:'0.8rem' }}>
                    <div style={{ fontWeight:600, color:C.forest }}>{u.part_name}</div>
                    <div style={{ color:C.muted, fontSize:'0.72rem' }}>{u.status} • {new Date(u.created_at).toLocaleDateString('fr-MA')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions rapides — adaptées au rôle */}
          <div style={{ background:'#0F2318', borderRadius:18, padding:'1.5rem', flex:1 }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:'#F4F6F4', marginBottom:'0.4rem' }}>
              {user && user.role === 'acheteur_auto' ? '🚗 Espace Particulier' : 'Actions rapides'}
            </h2>
            <p style={{ fontSize:'0.75rem', color:'rgba(244,246,244,0.4)', marginBottom:'1rem' }}>
              {user && user.role === 'acheteur_auto' ? 'Pièces automobiles · Toutes marques' : 'Raccourcis vers vos outils'}
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.55rem' }}>
              {(user && user.role === 'acheteur_auto' ? [
                { to:'/pieces-auto',        icon:'🚗', label:'Pièces Auto',               desc:'Marketplace toutes marques' },
                { to:'/buyer/commandes',    icon:'📦', label:'Mes commandes',              desc:'Suivre mes achats en cours' },
                { to:'/messages',           icon:'💬', label:'Mes messages',              desc:'Contacter les vendeurs' },
                { to:'/buyer/profil',       icon:'👤', label:'Mon profil',                desc:'Informations & préférences' },
              ] : [
                { to:'/catalogue',    icon:'📦', label:'Parcourir le catalogue',    desc:'Trouver une pièce disponible' },
                { to:'/buyer/urgence',icon:'⚡', label:'Demande urgente',           desc:'Besoin en moins de 48h' },
                { to:'/messages',     icon:'💬', label:'Mes messages',              desc:'Contacter les vendeurs' },
                { to:'/transport',    icon:'🚛', label:'Transport retour vide',     desc:'Livraison économique' },
              ]).map(function(a) { return (
                <Link key={a.to} to={a.to}
                  style={{ display:'flex', gap:'0.7rem', alignItems:'center', background:'rgba(255,255,255,0.06)', borderRadius:12, padding:'0.75rem 0.9rem', textDecoration:'none', transition:'all 0.2s', border:'1px solid rgba(74,144,101,0.1)' }}
                  onMouseEnter={function(e){ e.currentTarget.style.background='rgba(74,144,101,0.18)'; e.currentTarget.style.borderColor='rgba(74,144,101,0.35)'; }}
                  onMouseLeave={function(e){ e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor='rgba(74,144,101,0.1)'; }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', flexShrink:0 }}>
                    {a.icon}
                  </div>
                  <div>
                    <div style={{ fontSize:'0.84rem', fontWeight:600, color:'#F4F6F4' }}>{a.label}</div>
                    <div style={{ fontSize:'0.71rem', color:'rgba(244,246,244,0.45)', marginTop:1 }}>{a.desc}</div>
                  </div>
                  <span style={{ marginLeft:'auto', color:'rgba(74,144,101,0.6)', fontSize:'0.8rem' }}>→</span>
                </Link>
              ); })}
            </div>

            {/* Badge info acheteur_auto */}
            {user && user.role === 'acheteur_auto' && (
              <div style={{ marginTop:'1rem', background:'rgba(232,200,102,0.1)', border:'1px solid rgba(232,200,102,0.2)', borderRadius:10, padding:'0.7rem 0.9rem', fontSize:'0.75rem', color:'rgba(244,246,244,0.55)', lineHeight:1.6 }}>
                <span style={{ color:'#E8C866', fontWeight:700 }}>✨ Compte particulier</span><br/>
                Accès à la marketplace pièces automobiles uniquement.
              </div>
            )}
          </div>
        </div>
        {/* ── LOTS SURVEILLÉS (buyer) / PIÈCES RÉCENTES AUTO (acheteur_auto) ── */}
        {user && user.role === 'acheteur_auto' ? (
          <div style={{ background:'#0F2318', border:'1px solid #2D5A46', borderRadius:18, padding:'1.5rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', color:'#F4F6F4', margin:0 }}>
                🚗 Marketplace Pièces Auto
              </h2>
              <Link to="/pieces-auto" style={{ fontSize:'0.8rem', color:'#E8C866', textDecoration:'none', fontWeight:600 }}>Voir tout →</Link>
            </div>
            <p style={{ fontSize:'0.8rem', color:'rgba(244,246,244,0.5)', marginBottom:'1.2rem', lineHeight:1.6 }}>
              Retrouvez toutes les pièces automobiles disponibles sur REVEX. Filtrez par marque, modèle ou type de pièce.
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem' }}>
              {[
                { icon:'🔍', label:'Rechercher', desc:'Toutes marques', to:'/pieces-auto' },
                { icon:'🆕', label:'Nouvelles', desc:'Arrivées récentes', to:'/pieces-auto?sort=newest' },
                { icon:'💰', label:'Moins chers', desc:'Prix croissant', to:'/pieces-auto?sort=price_asc' },
                { icon:'⭐', label:'Mieux notés', desc:'Top vendeurs', to:'/pieces-auto?sort=views' },
              ].map(function(a) { return (
                <Link key={a.to} to={a.to} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(74,144,101,0.15)', borderRadius:12, padding:'0.8rem', textDecoration:'none', transition:'all 0.2s' }}
                  onMouseEnter={function(e){ e.currentTarget.style.background='rgba(74,144,101,0.15)'; }}
                  onMouseLeave={function(e){ e.currentTarget.style.background='rgba(255,255,255,0.06)'; }}>
                  <div style={{ fontSize:'1.3rem', marginBottom:'0.3rem' }}>{a.icon}</div>
                  <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#F4F6F4' }}>{a.label}</div>
                  <div style={{ fontSize:'0.7rem', color:'rgba(244,246,244,0.45)' }}>{a.desc}</div>
                </Link>
              ); })}
            </div>
          </div>
        ) : (
        <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, overflow:'hidden' }}>
          <div style={{ padding:'1.2rem 1.5rem', borderBottom:'1px solid '+C.mid, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={h2}>👁 Lots surveillés <span style={{ fontSize:'0.8rem', color:C.muted, fontWeight:400 }}>({watchedLots.length})</span></h2>
            <Link to="/lots" style={linkBtn}>Voir tous les lots →</Link>
          </div>
          {loadWatched ? <Loading/> : watchedLots.length === 0 ? (
            <Empty icon="👁" msg="Aucun lot surveillé" action={{ to:'/lots', label:'Parcourir les lots' }}/>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1px', background:C.mid }}>
              {watchedLots.map(lot => {
                const isAuction = lot.sale_type === 'auction';
                const secsLeft  = Number(lot.seconds_remaining || 0);
                const urgent    = secsLeft > 0 && secsLeft < 86400; // < 24h
                return (
                  <Link key={lot.id} to={'/lots/'+lot.slug}
                    style={{ display:'block', background:urgent?'#FEF5E7':C.white, padding:'1rem 1.2rem', textDecoration:'none', transition:'background 0.15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background=urgent?'#FDECEA':'#EDE6D3'}
                    onMouseLeave={e=>e.currentTarget.style.background=urgent?'#FEF5E7':C.white}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.5rem', gap:'0.5rem' }}>
                      <div style={{ fontWeight:600, color:C.forest, fontSize:'0.88rem', lineHeight:1.3, flex:1 }}>
                        {lot.title?.substring(0,45)}{lot.title?.length>45?'...':''}
                      </div>
                      <span style={{ background:isAuction?'#FEF5E7':'#E8F8EE', color:isAuction?C.orange:C.eco, borderRadius:100, padding:'0.12rem 0.5rem', fontSize:'0.7rem', fontWeight:700, flexShrink:0 }}>
                        {isAuction ? '🔨 Enchère' : '🏷️ Fixe'}
                      </span>
                    </div>
                    <div style={{ fontSize:'0.75rem', color:C.muted, marginBottom:'0.5rem' }}>
                      🏭 {lot.seller_company}
                    </div>
                    {isAuction ? (
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:C.orange }}>
                            {Number(lot.current_bid||lot.start_price||0).toLocaleString('fr-MA')} MAD
                          </div>
                          <div style={{ fontSize:'0.7rem', color:C.muted }}>{lot.bid_count||0} enchère(s)</div>
                        </div>
                        {secsLeft > 0 ? (
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontSize:'0.7rem', color:urgent?C.urgent:C.muted }}>⏱ Fin dans</div>
                            <div style={{ fontWeight:700, fontSize:'0.82rem', color:urgent?C.urgent:C.forest }}>
                              {secsLeft > 86400
                                ? Math.floor(secsLeft/86400)+'j '+Math.floor((secsLeft%86400)/3600)+'h'
                                : Math.floor(secsLeft/3600)+'h '+Math.floor((secsLeft%3600)/60)+'m'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize:'0.75rem', color:C.urgent, fontWeight:600 }}>Terminée</span>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:C.leaf }}>
                        {Number(lot.price||0).toLocaleString('fr-MA')} MAD
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
    </div>
  );
}

const h2 = { fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:'#1E3D0F', margin:0 };
const linkBtn = { fontSize:'0.82rem', color:'#4A7C2F', textDecoration:'none', whiteSpace:'nowrap' };
const btnLink = (bg, color, border) => ({
  background:bg, color, textDecoration:'none', padding:'0.65rem 1.4rem',
  borderRadius:100, fontWeight:600, fontSize:'0.85rem', border:border||'none',
  whiteSpace:'nowrap', fontFamily:"'DM Sans',sans-serif"
});
const Loading = () => <div style={{ padding:'2rem', textAlign:'center', color:'#5C5C50', fontSize:'0.85rem' }}>Chargement...</div>;
const Empty = ({ icon, msg, action }) => (
  <div style={{ textAlign:'center', padding:'2rem', color:'#5C5C50' }}>
    <div style={{ fontSize:'2rem', marginBottom:'0.5rem', opacity:0.3 }}>{icon}</div>
    <p style={{ fontSize:'0.85rem' }}>{msg}</p>
    {action && <Link to={action.to} style={{ display:'inline-block', marginTop:'0.8rem', background:'#1E3D0F', color:'#F6F1E7', padding:'0.55rem 1.2rem', borderRadius:100, textDecoration:'none', fontSize:'0.82rem' }}>{action.label}</Link>}
  </div>
);
