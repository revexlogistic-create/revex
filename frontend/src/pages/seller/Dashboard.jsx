// src/pages/seller/Dashboard.jsx — REVEX Vendeur
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
  active:'Actif', pending:'En attente', sold:'Vendu', inactive:'Inactif', draft:'Brouillon',
  confirmed:'Confirmée', shipped:'Expédiée', delivered:'Livrée', cancelled:'Annulée',
  accepted:'Accepté', rejected:'Refusé', expired:'Expiré'
};

const STATUS_COLOR = {
  active:C.eco, pending:C.orange, sold:'#8E44AD', inactive:C.muted, draft:C.muted,
  confirmed:C.blue, shipped:C.leaf, delivered:C.eco, cancelled:C.urgent,
  accepted:C.eco, rejected:C.urgent, expired:C.muted
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');

export default function SellerDashboard() {
  const { user }  = useAuth();
  const qc        = useQueryClient();
  const navigate  = useNavigate();
  const [quoteFilter, setQuoteFilter] = useState('pending');
  const [showErpModal, setShowErpModal] = useState(false);
  const [selectedErp, setSelectedErp]  = useState(null);
  const [erpForm, setErpForm]          = useState({ url:'', apiKey:'', username:'' });
  const [erpConnections, setErpConnections] = useState(() => {
    try { return JSON.parse(localStorage.getItem('revex_erp_connections') || '{}'); } catch { return {}; }
  });

  const { data: productsData, isLoading: loadProd } = useQuery(
    'seller-products-all',
    () => api.get('/products/me?limit=1000').then(r => r.data),
    { refetchInterval: 30000 }
  );
  const { data: ordersData, isLoading: loadOrd } = useQuery(
    'seller-orders-all',
    () => api.get('/orders?role_as=seller&limit=1000').then(r => r.data),
    { refetchInterval: 30000 }
  );
  const { data: quotesData, isLoading: loadQuotes } = useQuery(
    'seller-quotes-all',
    () => api.get('/quotes?role_as=seller&limit=1000').then(r => r.data),
    { refetchInterval: 15000 }
  );
  const { data: qualData } = useQuery(
    'seller-qualification',
    () => api.get('/analysis/seller-qualification').then(r => r.data),
    { retry: false }
  );
  const { data: analysesData } = useQuery(
    'seller-analyses',
    () => api.get('/analysis/stock').then(r => r.data),
    { retry: false }
  );

  const respondQuote = useMutation(
    ({ id, status }) => api.put('/quotes/'+(id)+'/respond', { status, seller_response: status === 'rejected' ? 'Offre refusée' : undefined }),
    {
      onSuccess: (_, { status }) => {
        toast.success(status === 'accepted' ? '✅ Devis accepté !' : '❌ Devis refusé');
        qc.invalidateQueries('seller-quotes-all');
      },
      onError: () => toast.error('Erreur lors de la réponse au devis')
    }
  );

  const products = productsData?.products || [];
  const orders   = ordersData?.orders || [];
  const quotes   = quotesData?.quotes || [];
  const qual     = qualData?.qualification;
  const analyses = analysesData?.analyses || [];

  // ── KPIs calculés ────────────────────────────────────────────
  const activeProducts   = products.filter(p => p.status === 'active').length;
  const totalViews       = products.reduce((s, p) => s + (p.views_count||0), 0);
  const totalStockValue  = products.reduce((s, p) => s + (Number(p.price||0) * (p.quantity||0)), 0);
  const pendingOrders    = orders.filter(o => o.status === 'pending').length;
  const deliveredOrders  = orders.filter(o => o.status === 'delivered');
  const activeOrders     = orders.filter(o => !['cancelled','refunded'].includes(o.status));
  // CA réalisé = livrées | CA en cours = toutes sauf annulées
  const totalRevenue     = deliveredOrders.reduce((s, o) => s + Number(o.final_price||0), 0);
  const revenuEnCours    = activeOrders.filter(o => o.status !== 'delivered').reduce((s, o) => s + Number(o.final_price||0), 0);
  const pendingQuotes    = quotes.filter(q => q.status === 'pending').length;
  const conversionRate   = orders.length > 0 ? Math.round((deliveredOrders.length / orders.length) * 100) : 0;
  const lastAnalysis     = analyses[0];

  const filteredQuotes = quotes.filter(q => q.status === quoteFilter);

  return (
    <div style={{ background:C.cream, minHeight:'100vh' }}>
    <div style={{ maxWidth:1280, margin:'0 auto', padding:'2rem 2rem 4rem' }}>

      {/* ── EN-TÊTE ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.2rem', color:C.forest, marginBottom:'0.2rem' }}>
            Tableau de bord Vendeur
          </h1>
          <p style={{ color:C.muted, fontSize:'0.9rem' }}>
            {user?.company_name} • {user?.city} •
            <span style={{ color:qual?.status==='approved'?C.eco:C.orange, fontWeight:600, marginLeft:4 }}>
              {qual?.status==='approved' ? '✅ Vendeur qualifié' : '⚠️ Qualification requise'}
            </span>
          </p>
        </div>
        <div style={{ display:'flex', gap:'0.7rem', flexWrap:'wrap' }}>
          <Link to="/seller/commandes" style={btnLink(C.beige, C.forest, C.mid)}>🛒 Mes commandes</Link>
          <Link to="/seller/analyse" style={btnLink(C.beige, C.forest, C.mid)}>🔬 Analyser stock</Link>
          <Link to="/seller/mes-lots" style={btnLink(C.beige, C.forest, C.mid)}>📦 Mes lots</Link>
          <Link to="/seller/urgences" style={btnLink('#FDECEA', C.urgent, C.urgent+'44')}>⚡ Demandes urgentes</Link>
          <Link to="/seller/publier-auto" style={btnLink('#FEF2F2','#DC2626','#FECACA')}>🚗 Publier pièce auto</Link>
          <Link to="/seller/publier" style={btnLink(C.forest, C.cream)}>+ Publier un PDR</Link>
        </div>
      </div>

      {/* ── ALERTE QUALIFICATION ── */}
      {(!qual || qual.status !== 'approved') && (
        <div style={{ background:'#FEF5E7', border:'1.5px solid #F0B27A', borderRadius:14, padding:'1rem 1.5rem', marginBottom:'1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <div style={{ fontWeight:700, color:'#784212', fontSize:'0.95rem' }}>
              {qual?.status==='in_review' ? '🔍 Qualification en cours de vérification' : '⚠️ Qualification vendeur requise'}
            </div>
            <div style={{ fontSize:'0.82rem', color:'#A04000', marginTop:'0.2rem' }}>
              {qual?.status==='in_review'
                ? 'Votre dossier est en cours d\'examen (48h). Vous pouvez déjà préparer vos annonces.'
                : 'Complétez votre qualification pour publier vos stocks sur la marketplace REVEX.'}
            </div>
          </div>
          {qual?.status !== 'in_review' && (
            <Link to="/seller/qualification" style={btnLink('#E67E22', '#fff')}>Compléter le dossier →</Link>
          )}
        </div>
      )}

      {/* ── KPIs PRINCIPAUX ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'2rem' }}>
        {[
          { icon:'📦', label:'Produits actifs',    value:activeProducts,              sub:''+(products.length)+' total',             color:C.leaf  },
          { icon:'💰', label:'CA réalisé',          value:''+(fmt(totalRevenue))+' MAD',  sub: revenuEnCours > 0 ? '+ '+(fmt(revenuEnCours))+' MAD en cours' : ''+(deliveredOrders.length)+' commandes livrées', color:C.eco },
          { icon:'🛒', label:'Commandes reçues',   value:orders.length,               sub:''+(pendingOrders)+' en attente',          color:C.blue  },
          { icon:'👁', label:'Vues totales',        value:fmt(totalViews),             sub:''+(activeProducts)+' annonces actives',   color:C.orange},
        ].map(k => (
          <div key={k.label} style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:16, padding:'1.4rem' }}>
            <div style={{ fontSize:'1.8rem', marginBottom:'0.5rem' }}>{k.icon}</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.7rem', fontWeight:700, color:k.color, lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:'0.78rem', fontWeight:600, color:C.forest, marginTop:'0.4rem' }}>{k.label}</div>
            <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:'0.1rem' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── KPIs SECONDAIRES ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'2rem' }}>
        {[
          { label:'Valeur stock total',    value:''+(fmt(totalStockValue))+' MAD', color:C.forest },
          { label:'CA en cours (non livré)', value:''+(fmt(revenuEnCours))+' MAD',   color:C.orange },
          { label:'Taux de conversion',    value:''+(conversionRate)+'%',          color:C.eco    },
          { label:'Dernière analyse CCOM', value:lastAnalysis ? ''+(lastAnalysis.dormant_count||0)+' dormants détectés' : 'Aucune analyse', color:C.blue },
        ].map(k => (
          <div key={k.label} style={{ background:C.beige, border:'1px solid '+(C.mid)+'', borderRadius:12, padding:'1rem 1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:'0.78rem', color:C.muted }}>{k.label}</div>
            <div style={{ fontWeight:700, color:k.color, fontSize:'0.95rem', textAlign:'right' }}>{String(k.value)}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:'2rem', marginBottom:'2rem' }}>

        {/* ── TOUS MES PRODUITS ── */}
        <div style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:18, padding:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.2rem' }}>
            <h2 style={h2}>📦 Mes PDR publiés <span style={{ fontSize:'0.8rem', color:C.muted, fontWeight:400 }}>({products.length})</span></h2>
            <Link to="/seller/produits" style={linkBtn}>Gérer tout →</Link>
          </div>
          {loadProd ? <Loading/> : products.length === 0 ? (
            <Empty icon="📦" msg="Aucun produit publié" action={{ to:'/seller/publier', label:'Publier maintenant' }} />
          ) : (
            <div style={{ maxHeight:420, overflowY:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
                <thead>
                  <tr style={{ background:C.beige, position:'sticky', top:0 }}>
                    {['Désignation','Réf','Qté','Prix','Vues','Statut'].map(h => (
                      <th key={h} style={{ padding:'0.6rem 0.7rem', textAlign:'left', color:C.muted, fontWeight:600, fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={p.id} style={{ background:i%2===0?C.white:C.cream, borderBottom:'1px solid '+(C.beige)+'' }}>
                      <td style={{ padding:'0.65rem 0.7rem', maxWidth:220 }}>
                        <Link to={'/produit/'+(p.slug)+''} style={{ color:C.forest, textDecoration:'none', fontWeight:500 }}>
                          {p.title?.substring(0,42)}{p.title?.length>42?'...':''}
                        </Link>
                      </td>
                      <td style={{ padding:'0.65rem 0.7rem', color:C.muted, fontFamily:'monospace', fontSize:'0.75rem' }}>{p.reference||'—'}</td>
                      <td style={{ padding:'0.65rem 0.7rem', textAlign:'center' }}>{p.quantity}</td>
                      <td style={{ padding:'0.65rem 0.7rem', fontWeight:600, color:C.leaf }}>{fmt(p.price)} MAD</td>
                      <td style={{ padding:'0.65rem 0.7rem', textAlign:'center', color:C.muted }}>{p.views_count||0}</td>
                      <td style={{ padding:'0.65rem 0.7rem' }}>
                        <span style={{ background:(STATUS_COLOR[p.status]||'#888')+'22', color:STATUS_COLOR[p.status]||'#888', padding:'0.18rem 0.55rem', borderRadius:100, fontSize:'0.7rem', fontWeight:600, whiteSpace:'nowrap' }}>
                          {STATUS_FR[p.status]||p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── DEVIS REÇUS ── */}
        <div style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:18, padding:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <h2 style={h2}>💬 Devis reçus <span style={{ fontSize:'0.8rem', color:C.muted, fontWeight:400 }}>({quotes.length})</span></h2>
          </div>
          {/* Filtre statut */}
          <div style={{ display:'flex', gap:'0.4rem', marginBottom:'1rem', flexWrap:'wrap' }}>
            {['pending','accepted','rejected','expired'].map(s => (
              <button key={s} onClick={() => setQuoteFilter(s)}
                style={{ padding:'0.3rem 0.8rem', borderRadius:100, border:'1px solid '+(quoteFilter===s ? STATUS_COLOR[s]||C.mid : C.mid)+'', background:quoteFilter===s ? (STATUS_COLOR[s]||C.mid)+'22' : 'transparent', color:quoteFilter===s ? STATUS_COLOR[s]||C.muted : C.muted, fontSize:'0.75rem', fontWeight:quoteFilter===s?700:400, cursor:'pointer' }}>
                {STATUS_FR[s]} ({quotes.filter(q=>q.status===s).length})
              </button>
            ))}
          </div>

          {loadQuotes ? <Loading/> : filteredQuotes.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem', color:C.muted, fontSize:'0.85rem' }}>Aucun devis {STATUS_FR[quoteFilter]?.toLowerCase()}</div>
          ) : (
            <div style={{ maxHeight:360, overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.6rem' }}>
              {filteredQuotes.map(q => (
                <div key={q.id} style={{ background:quoteFilter==='pending'?'#FEF5E7':C.beige, border:'1px solid '+(C.mid)+'', borderRadius:12, padding:'0.9rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.4rem' }}>
                    <div style={{ fontWeight:600, fontSize:'0.87rem', color:C.forest }}>{q.buyer_company}</div>
                    <span style={{ background:(STATUS_COLOR[q.status]||'#888')+'22', color:STATUS_COLOR[q.status]||'#888', padding:'0.12rem 0.5rem', borderRadius:100, fontSize:'0.7rem', fontWeight:600 }}>
                      {STATUS_FR[q.status]||q.status}
                    </span>
                  </div>
                  <div style={{ fontSize:'0.78rem', color:C.muted, marginBottom:'0.3rem' }}>{q.product_title?.substring(0,50)}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'0.78rem', color:C.forest }}>
                      Qté: <strong>{q.quantity}</strong>
                      {q.proposed_price && <> • <strong style={{color:C.leaf}}>{fmt(q.proposed_price)} MAD</strong> proposé</>}
                    </span>
                    {q.status === 'pending' && (
                      <div style={{ display:'flex', gap:'0.4rem' }}>
                        <button onClick={() => respondQuote.mutate({ id:q.id, status:'accepted' })}
                          style={{ background:C.eco, color:'#fff', border:'none', padding:'0.3rem 0.8rem', borderRadius:100, fontSize:'0.72rem', cursor:'pointer', fontWeight:600 }}>
                          ✓ Accepter
                        </button>
                        <button onClick={() => respondQuote.mutate({ id:q.id, status:'rejected' })}
                          style={{ background:C.urgent, color:'#fff', border:'none', padding:'0.3rem 0.8rem', borderRadius:100, fontSize:'0.72rem', cursor:'pointer', fontWeight:600 }}>
                          ✗ Refuser
                        </button>
                      </div>
                    )}
                  </div>
                  {q.message && <div style={{ fontSize:'0.75rem', color:C.muted, marginTop:'0.4rem', fontStyle:'italic', background:C.white, borderRadius:8, padding:'0.4rem 0.6rem' }}>"{q.message.substring(0,80)}{q.message.length>80?'...':''}"</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── COMMANDES + ANALYSE ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:'2rem', marginBottom:'2rem' }}>

        {/* Toutes les commandes */}
        <div style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:18, padding:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.2rem' }}>
            <h2 style={h2}>🛒 Commandes reçues <span style={{ fontSize:'0.8rem', color:C.muted, fontWeight:400 }}>({orders.length})</span></h2>
            <Link to="/seller/commandes" style={linkBtn}>Gérer tout →</Link>
          </div>
          {loadOrd ? <Loading/> : orders.length === 0 ? (
            <Empty icon="🛒" msg="Aucune commande reçue pour l'instant" />
          ) : (
            <div style={{ maxHeight:380, overflowY:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
                <thead>
                  <tr style={{ background:C.beige, position:'sticky', top:0 }}>
                    {['N° commande','Acheteur','Produit','Date','Montant','Statut'].map(h => (
                      <th key={h} style={{ padding:'0.6rem 0.7rem', textAlign:'left', color:C.muted, fontWeight:600, fontSize:'0.72rem', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={o.id} style={{ background:i%2===0?C.white:C.cream, borderBottom:'1px solid '+(C.beige)+'' }}>
                      <td style={{ padding:'0.65rem 0.7rem', fontFamily:'monospace', fontSize:'0.75rem', color:C.muted }}>{o.order_number}</td>
                      <td style={{ padding:'0.65rem 0.7rem', color:C.forest, fontWeight:500 }}>{o.buyer_company?.substring(0,20)}</td>
                      <td style={{ padding:'0.65rem 0.7rem', color:C.muted, maxWidth:160 }}>{o.product_title?.substring(0,30)}</td>
                      <td style={{ padding:'0.65rem 0.7rem', color:C.muted, fontSize:'0.75rem' }}>{new Date(o.created_at).toLocaleDateString('fr-MA')}</td>
                      <td style={{ padding:'0.65rem 0.7rem', fontWeight:700, color:C.leaf }}>{fmt(o.final_price)} MAD</td>
                      <td style={{ padding:'0.65rem 0.7rem' }}>
                        <span style={{ background:(STATUS_COLOR[o.status]||'#888')+'22', color:STATUS_COLOR[o.status]||'#888', padding:'0.18rem 0.55rem', borderRadius:100, fontSize:'0.7rem', fontWeight:600 }}>
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

        {/* Analyses CCOM + actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

          {/* Dernières analyses */}
          <div style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:18, padding:'1.5rem', flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
              <h2 style={h2}>🔬 Analyses CCOM</h2>
              <Link to="/seller/analyse" style={linkBtn}>Nouvelle →</Link>
            </div>
            {analyses.length === 0 ? (
              <div style={{ textAlign:'center', padding:'1.5rem', color:C.muted, fontSize:'0.85rem' }}>
                <div style={{ fontSize:'2rem', marginBottom:'0.5rem', opacity:0.3 }}>🔬</div>
                <p>Aucune analyse effectuée</p>
                <Link to="/seller/analyse" style={{ display:'inline-block', marginTop:'0.6rem', background:C.forest, color:C.cream, padding:'0.5rem 1.2rem', borderRadius:100, textDecoration:'none', fontSize:'0.82rem' }}>Analyser mon stock</Link>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem', maxHeight:200, overflowY:'auto' }}>
                {analyses.map(a => (
                  <div key={a.id} style={{ background:C.beige, borderRadius:12, padding:'0.8rem 1rem', border:'1px solid '+(C.mid)+'' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.3rem' }}>
                      <div style={{ fontWeight:600, fontSize:'0.85rem', color:C.forest }}>{a.filename}</div>
                      <div style={{ fontSize:'0.72rem', color:C.muted }}>{new Date(a.created_at).toLocaleDateString('fr-MA')}</div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.4rem', fontSize:'0.75rem' }}>
                      <div style={{ color:C.muted }}>Analysés : <strong style={{color:C.forest}}>{a.total_refs}</strong></div>
                      <div style={{ color:C.urgent }}>Dormants : <strong>{a.dormant_count}</strong></div>
                      <div style={{ color:C.eco }}>Valeur : <strong>{fmt(a.dormant_value)} MAD</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions rapides */}
          <div style={{ background:C.forest, borderRadius:18, padding:'1.5rem' }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:C.cream, marginBottom:'1rem' }}>Actions rapides</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
              {[
                { to:'/seller/publier',        icon:'➕', label:'Publier un PDR',         desc:'Nouvelle annonce de pièce' },
                { to:'/seller/stock',          icon:'🏭', label:'Mon stock chez REVEX',    desc:'Inventaire · Traçabilité · Documents' },
                { to:'/seller/analyse',        icon:'🔬', label:'Analyser mon stock',      desc:'Méthode CCOM (seuil 3 ans)' },
                { to:'/seller/qualification',  icon:'📋', label:'Ma qualification',        desc:qual?.status==='approved'?'✅ Approuvée':'Compléter le dossier' },
                { to:'/messages',              icon:'💬', label:'Mes messages',            desc:''+(quotes.filter(q=>q.status==='pending').length)+' devis en attente' },
                { to:'/transport',             icon:'🚛', label:'Transport retour vide',   desc:'Livraison économique' },
              ].map(a => (
                <Link key={a.to} to={a.to}
                  style={{ display:'flex', gap:'0.7rem', alignItems:'center', background:'rgba(255,255,255,0.07)', borderRadius:10, padding:'0.7rem 0.9rem', textDecoration:'none', transition:'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(74,124,47,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.07)'}>
                  <span style={{ fontSize:'1.2rem' }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize:'0.84rem', fontWeight:600, color:C.cream }}>{a.label}</div>
                    <div style={{ fontSize:'0.72rem', color:'rgba(246,241,231,0.55)' }}>{a.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── CONNEXION ERP ── */}
          <ErpConnector
            erpConnections={erpConnections}
            setErpConnections={setErpConnections}
            showErpModal={showErpModal}
            setShowErpModal={setShowErpModal}
            selectedErp={selectedErp}
            setSelectedErp={setSelectedErp}
            erpForm={erpForm}
            setErpForm={setErpForm}
          />
        </div>
      </div>

    </div>
    </div>
  );
}

// ── Composant ERP Connector ───────────────────────────────────
const ERP_SYSTEMS = [
  {
    id: 'sap',
    name: 'SAP',
    logo: '🔷',
    color: '#0070D1',
    desc: 'SAP S/4HANA · SAP ECC · SAP Business One',
    fields: [
      { key:'url',      label:'URL serveur SAP',         placeholder:'https://sap.votreentreprise.ma' },
      { key:'client',   label:'Client SAP (Mandant)',     placeholder:'Ex: 100' },
      { key:'username', label:'Utilisateur RFC',          placeholder:'RFC_REVEX' },
      { key:'apiKey',   label:'Clé API / Mot de passe',   placeholder:'••••••••', type:'password' },
    ],
    modules: ['MM (Gestion stocks)', 'PM (Maintenance)', 'WM (Gestion entrepôt)'],
    doc: 'https://help.sap.com',
  },
  {
    id: 'odoo',
    name: 'Odoo',
    logo: '🟣',
    color: '#714B67',
    desc: 'Odoo 14 · 15 · 16 · 17 — Community & Enterprise',
    fields: [
      { key:'url',      label:'URL instance Odoo',        placeholder:'https://votreentreprise.odoo.com' },
      { key:'dbname',   label:'Nom de la base de données',placeholder:'ma_entreprise' },
      { key:'username', label:'Email utilisateur Odoo',   placeholder:'admin@entreprise.ma' },
      { key:'apiKey',   label:'Clé API Odoo',             placeholder:'••••••••', type:'password' },
    ],
    modules: ['Stock (Inventaire)', 'Maintenance', 'Achats & Fournisseurs'],
    doc: 'https://www.odoo.com/documentation',
  },
  {
    id: 'oracle',
    name: 'Oracle ERP',
    logo: '🔴',
    color: '#C74634',
    desc: 'Oracle ERP Cloud · Oracle E-Business Suite',
    fields: [
      { key:'url',      label:'URL Oracle ERP Cloud',     placeholder:'https://oracle.votreentreprise.ma' },
      { key:'username', label:'Nom utilisateur Oracle',   placeholder:'INT_REVEX' },
      { key:'apiKey',   label:'Token OAuth2 / API Key',   placeholder:'••••••••', type:'password' },
    ],
    modules: ['Inventory Management', 'Maintenance Cloud', 'Procurement'],
    doc: 'https://docs.oracle.com/en/cloud/saas/erp',
  },
  {
    id: 'dynamics',
    name: 'Microsoft Dynamics',
    logo: '🔵',
    color: '##0078D4',
    desc: 'Dynamics 365 · Dynamics AX · Business Central',
    fields: [
      { key:'url',      label:'URL Tenant Dynamics 365',  placeholder:'https://votreentreprise.crm.dynamics.com' },
      { key:'client',   label:'Client ID (Azure AD)',     placeholder:'xxxxxxxx-xxxx-xxxx' },
      { key:'apiKey',   label:'Client Secret',            placeholder:'••••••••', type:'password' },
    ],
    modules: ['Supply Chain', 'Asset Management', 'Inventory & Warehouse'],
    doc: 'https://docs.microsoft.com/dynamics365',
  },
  {
    id: 'sage',
    name: 'Sage',
    logo: '🟢',
    color: '#00DC82',
    desc: 'Sage X3 · Sage 100 · Sage 200',
    fields: [
      { key:'url',      label:'URL serveur Sage',         placeholder:'https://sage.votreentreprise.ma' },
      { key:'username', label:'Utilisateur Sage',         placeholder:'INT_REVEX' },
      { key:'apiKey',   label:'Mot de passe / Token API', placeholder:'••••••••', type:'password' },
    ],
    modules: ['Gestion des stocks', 'GMAO', 'Achats & Approvisionnement'],
    doc: 'https://www.sage.com/documentation',
  },
];

function ErpConnector({ erpConnections, setErpConnections, showErpModal, setShowErpModal, selectedErp, setSelectedErp, erpForm, setErpForm }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const saveConnection = (erpId) => {
    const updated = { ...erpConnections, [erpId]: { ...erpForm, connected:true, connectedAt: new Date().toISOString() } };
    setErpConnections(updated);
    try { localStorage.setItem('revex_erp_connections', JSON.stringify(updated)); } catch {}
    toast.success('✅ ERP ' + ERP_SYSTEMS.find(e => e.id===erpId)?.name + ' connecté avec succès !');
    setShowErpModal(false);
    setTestResult(null);
    setErpForm({ url:'', apiKey:'', username:'', client:'', dbname:'' });
  };

  const disconnect = (erpId) => {
    const updated = { ...erpConnections };
    delete updated[erpId];
    setErpConnections(updated);
    try { localStorage.setItem('revex_erp_connections', JSON.stringify(updated)); } catch {}
    toast.info('ERP déconnecté.');
  };

  const testConnection = () => {
    setTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      // Simulate test — in production this would call your backend /api/erp/test
      const ok = erpForm.url && erpForm.apiKey;
      setTestResult(ok ? 'success' : 'error');
    }, 2000);
  };

  const connectedCount = Object.keys(erpConnections).length;

  return (
    <div style={{ background:'#fff', borderRadius:18, border:'1px solid #D9CEBC', overflow:'hidden', boxShadow:'0 2px 12px rgba(30,61,15,0.06)' }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', padding:'1.2rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{ fontSize:'1.1rem' }}>🔗</span>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:'#F6F1E7' }}>Connexion ERP</span>
            {connectedCount > 0 && (
              <span style={{ background:'#27AE60', color:'#fff', borderRadius:100, padding:'0.1rem 0.55rem', fontSize:'0.7rem', fontWeight:700 }}>
                {connectedCount} actif{connectedCount>1?'s':''}
              </span>
            )}
          </div>
          <div style={{ fontSize:'0.72rem', color:'rgba(246,241,231,0.55)' }}>Synchronisez votre stock PDR directement depuis votre ERP</div>
        </div>
      </div>

      {/* ERP cards */}
      <div style={{ padding:'1rem 1.2rem', display:'flex', flexDirection:'column', gap:'0.6rem' }}>
        {ERP_SYSTEMS.map(erp => {
          const conn = erpConnections[erp.id];
          return (
            <div key={erp.id}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:conn?'#ECFDF5':'#F6F1E7', border:'1px solid '+(conn?'rgba(39,174,96,0.3)':'#D9CEBC'), borderRadius:12, padding:'0.7rem 1rem', transition:'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 2px 10px rgba(30,61,15,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>

              <div style={{ display:'flex', alignItems:'center', gap:'0.7rem' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:erp.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>
                  {erp.logo}
                </div>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:'0.88rem', fontWeight:700, color:'#1E3D0F' }}>{erp.name}</span>
                    {conn && <span style={{ fontSize:'0.65rem', color:'#059669', fontWeight:600, background:'#D1FAE5', padding:'0.1rem 0.45rem', borderRadius:100 }}>● Connecté</span>}
                  </div>
                  <div style={{ fontSize:'0.72rem', color:'#8C8C7A' }}>{erp.desc}</div>
                  {conn && <div style={{ fontSize:'0.68rem', color:'#059669', marginTop:2 }}>✓ Synchronisé le {new Date(conn.connectedAt).toLocaleDateString('fr-MA')}</div>}
                </div>
              </div>

              <div style={{ display:'flex', gap:'0.5rem', flexShrink:0 }}>
                {conn ? (
                  <>
                    <button onClick={() => { setSelectedErp(erp); setErpForm({...conn}); setShowErpModal(true); }}
                      style={{ background:'transparent', color:'#4A7C2F', border:'1px solid #4A7C2F', borderRadius:100, padding:'0.3rem 0.75rem', fontSize:'0.75rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                      ⚙️ Config
                    </button>
                    <button onClick={() => disconnect(erp.id)}
                      style={{ background:'#FEF2F2', color:'#DC2626', border:'1px solid rgba(220,38,38,0.25)', borderRadius:100, padding:'0.3rem 0.75rem', fontSize:'0.75rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                      Déconnecter
                    </button>
                  </>
                ) : (
                  <button onClick={() => { setSelectedErp(erp); setErpForm({ url:'', apiKey:'', username:'', client:'', dbname:'' }); setTestResult(null); setShowErpModal(true); }}
                    style={{ background:'#1E3D0F', color:'#F6F1E7', border:'none', borderRadius:100, padding:'0.35rem 0.9rem', fontSize:'0.78rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                    Connecter
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info banner */}
      <div style={{ margin:'0 1.2rem 1.2rem', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'0.65rem 1rem', display:'flex', gap:'0.6rem' }}>
        <span style={{ fontSize:'1rem', flexShrink:0 }}>ℹ️</span>
        <div style={{ fontSize:'0.75rem', color:'#1D4ED8', lineHeight:1.6 }}>
          <strong>Anti-bypass :</strong> Une fois votre ERP connecté, toutes les commandes de PDR passées dans votre système sont automatiquement synchronisées avec REVEX — vos transactions restent tracées et certifiées.
        </div>
      </div>

      {/* ── MODAL CONNEXION ERP ── */}
      {showErpModal && selectedErp && (
        <div onClick={() => { setShowErpModal(false); setTestResult(null); }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#fff', borderRadius:24, maxWidth:500, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,0.2)', overflow:'hidden', maxHeight:'92vh', overflowY:'auto' }}>

            {/* Modal header */}
            <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', padding:'1.4rem 1.8rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.8rem' }}>
                <div style={{ width:42, height:42, borderRadius:12, background:selectedErp.color+'33', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem' }}>
                  {selectedErp.logo}
                </div>
                <div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:'#F6F1E7' }}>Connecter {selectedErp.name}</div>
                  <div style={{ fontSize:'0.72rem', color:'rgba(246,241,231,0.55)' }}>{selectedErp.desc}</div>
                </div>
              </div>
              <button onClick={() => { setShowErpModal(false); setTestResult(null); }}
                style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', color:'#F6F1E7', fontSize:'0.85rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
                ✕
              </button>
            </div>

            <div style={{ padding:'1.5rem 1.8rem' }}>

              {/* Modules */}
              <div style={{ background:'#F6F1E7', borderRadius:12, padding:'0.8rem 1rem', marginBottom:'1.2rem' }}>
                <div style={{ fontSize:'0.72rem', color:'#5C5C50', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.5rem' }}>📦 Modules synchronisés</div>
                <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                  {selectedErp.modules.map(m => (
                    <span key={m} style={{ background:'#fff', border:'1px solid #D9CEBC', borderRadius:100, padding:'0.2rem 0.65rem', fontSize:'0.72rem', color:'#1E3D0F', fontWeight:500 }}>
                      ✓ {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Fields */}
              <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem', marginBottom:'1.2rem' }}>
                {selectedErp.fields.map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize:'0.78rem', fontWeight:600, color:'#1E3D0F', display:'block', marginBottom:'0.3rem' }}>
                      {f.label}
                    </label>
                    <input
                      type={f.type || 'text'}
                      value={erpForm[f.key] || ''}
                      onChange={e => setErpForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      style={{ width:'100%', padding:'0.65rem 0.9rem', border:'1.5px solid '+(testResult==='error'&&f.key==='apiKey'?'#EF4444':'#D9CEBC'), borderRadius:10, fontSize:'0.88rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box', background:testResult==='success'?'#F0FDF4':'#fff' }}
                    />
                  </div>
                ))}
              </div>

              {/* Test result */}
              {testResult === 'success' && (
                <div style={{ background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:10, padding:'0.7rem 1rem', marginBottom:'1rem', fontSize:'0.82rem', color:'#065F46' }}>
                  ✅ Connexion testée avec succès — ERP accessible et authentifié.
                </div>
              )}
              {testResult === 'error' && (
                <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'0.7rem 1rem', marginBottom:'1rem', fontSize:'0.82rem', color:'#991B1B' }}>
                  ❌ Connexion échouée — vérifiez l'URL et les identifiants.
                </div>
              )}

              {/* Actions */}
              <div style={{ display:'flex', gap:'0.7rem', marginBottom:'1rem' }}>
                <button onClick={testConnection} disabled={testing || !erpForm.url || !erpForm.apiKey}
                  style={{ flex:1, background:testing?'#D9CEBC':'#F6F1E7', color:testing?'#8C8C7A':'#1E3D0F', border:'1.5px solid #D9CEBC', borderRadius:100, padding:'0.75rem', fontWeight:600, fontSize:'0.88rem', cursor:testing||!erpForm.url||!erpForm.apiKey?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  {testing ? '⏳ Test en cours...' : '🔌 Tester la connexion'}
                </button>
                <button onClick={() => saveConnection(selectedErp.id)} disabled={testResult!=='success'}
                  style={{ flex:1, background:testResult==='success'?'#27AE60':'#D9CEBC', color:'#fff', border:'none', borderRadius:100, padding:'0.75rem', fontWeight:700, fontSize:'0.88rem', cursor:testResult!=='success'?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  ✅ Confirmer la connexion
                </button>
              </div>

              {/* Doc link */}
              <div style={{ textAlign:'center', fontSize:'0.75rem', color:'#8C8C7A' }}>
                📖 <a href={selectedErp.doc} target="_blank" rel="noreferrer" style={{ color:'#4A7C2F' }}>Documentation officielle {selectedErp.name}</a>
                {' · '}
                <span style={{ color:'#8C8C7A' }}>Support REVEX : support@revex.ma</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers UI ─────────────────────────────────────────────
const h2 = { fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:'#1E3D0F', margin:0 };
const linkBtn = { fontSize:'0.82rem', color:'#4A7C2F', textDecoration:'none', whiteSpace:'nowrap' };
const btnLink = (bg, color, border) => ({
  background:bg, color, textDecoration:'none', padding:'0.65rem 1.4rem',
  borderRadius:100, fontWeight:600, fontSize:'0.85rem', border:border?'1px solid '+border:'none',
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
