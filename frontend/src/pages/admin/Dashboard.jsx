// src/pages/admin/Dashboard.jsx — REVEX Administration
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { generateInvoicePdf } from '../../utils/generateInvoice';
import ReactDOM from 'react-dom';
import { generateBonChargement, generateBonDechargement, generateBonSortie } from '../../utils/generateLogisticsDoc';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
};

const STATUS_FR = {
  pending:'En attente', confirmed:'Confirmée', shipped:'Expédiée',
  delivered:'Livrée', cancelled:'Annulée', active:'Actif',
  inactive:'Inactif', suspended:'Suspendu'
};

const STATUS_COLOR = {
  pending:C.orange, confirmed:C.blue, shipped:C.leaf,
  delivered:C.eco, cancelled:C.urgent,
  active:C.eco, inactive:C.muted, suspended:C.urgent
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');

const h3 = { fontFamily:"'Cormorant Garamond',serif", fontSize:'1.25rem', color:'#1E3D0F', margin:0 };
const Empty = ({ icon, msg }) => (
  <div style={{ textAlign:'center', padding:'2.5rem', color:'#5C5C50' }}>
    <div style={{ fontSize:'2rem', marginBottom:'0.5rem', opacity:0.3 }}>{icon}</div>
    <p style={{ fontSize:'0.85rem' }}>{msg}</p>
  </div>
);

export default function AdminDashboard() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [orderFilter, setOrderFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  const { data, isLoading } = useQuery(
    'admin-dashboard',
    () => api.get('/admin/dashboard').then(r => r.data),
    { refetchInterval: 60000 }
  );

  const { data: usersData } = useQuery(
    'admin-users-all',
    () => api.get('/admin/users?limit=1000').then(r => r.data),
    { refetchInterval: 60000 }
  );

  const { data: productsData } = useQuery(
    'admin-products-all',
    () => api.get('/admin/products?limit=1000').then(r => r.data),
    { refetchInterval: 60000 }
  );

  const { data: ordersAdminData } = useQuery(
    'admin-orders-all',
    () => api.get('/admin/orders?limit=1000').then(r => r.data),
    { retry: false, refetchInterval: 60000 }
  );

  const { data: disputesData } = useQuery(
    'admin-disputes-all',
    () => api.get('/admin/disputes?limit=1000').then(r => r.data),
    { retry: false }
  );

  const { data: qualifsData } = useQuery(
    'admin-qualifications',
    () => api.get('/admin/qualifications').then(r => r.data),
    { retry: false, refetchInterval: 30000 }
  );

  const activateUser = useMutation(
    ({ id, action }) => api.put('/admin/users/'+id+'/'+action),
    {
      onSuccess: (_, { action }) => {
        toast.success(action === 'activate' ? '✅ Utilisateur activé' : '🔴 Utilisateur suspendu');
        qc.invalidateQueries('admin-users-all');
      }
    }
  );

  const moderateProduct = useMutation(
    ({ id, action }) => api.put('/admin/products/'+id+'/'+action),
    {
      onSuccess: () => { toast.success('✅ Produit mis à jour'); qc.invalidateQueries('admin-products-all'); }
    }
  );

  const updateOrderMutation = useMutation(
    function(vars) { return api.put('/admin/orders/'+vars.id+'/status', { status: vars.status }); },
    {
      onSuccess: function(data, vars) {
        toast.success('Commande mise a jour : ' + vars.status);
        qc.invalidateQueries('admin-orders-all');
        qc.invalidateQueries('admin-dashboard');
        setSelectedOrder(null);
      },
      onError: function(e) { toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Erreur'); }
    }
  );

  const releaseEscrowMutation = useMutation(
    function(vars) { return api.put('/admin/orders/'+vars.id+'/escrow', { decision: vars.decision }); },
    {
      onSuccess: function(res) {
        toast.success(res.data.message || 'Escrow mis a jour');
        qc.invalidateQueries('admin-orders-all');
        setSelectedOrder(null);
      },
      onError: function(e) { toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Erreur escrow'); }
    }
  );

  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', color:C.muted, flexDirection:'column', gap:'1rem' }}>
      <div style={{ width:40, height:40, border:'3px solid '+(C.mid)+'', borderTop:'3px solid '+(C.leaf)+'', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      <span>Chargement du dashboard...</span>
    </div>
  );

  const { stats={}, recentOrders=[], topProducts=[], salesByMonth=[] } = data || {};
  const users    = usersData?.users    || [];
  const products     = (productsData?.products || []).filter(p => p.is_auto !== true);
  const autoProducts  = (productsData?.products || []).filter(p => p.is_auto === true);
  const allOrders= ordersAdminData?.orders || recentOrders;
  const disputes = disputesData?.disputes || [];
  const qualifs  = qualifsData?.qualifications || [];
  const pendingQualifs = qualifs.filter(q => q.status === 'pending' || q.status === 'under_review');

  // ── Données graphiques ────────────────────────────────────────
  const pieData = [
    { name:'Actifs',   value: users.filter(u=>u.status==='active').length,    color:C.eco    },
    { name:'Pendants', value: users.filter(u=>u.status==='pending').length,   color:C.orange },
    { name:'Suspendus',value: users.filter(u=>u.status==='suspended').length, color:C.urgent },
  ].filter(d => d.value > 0);

  const roleData = [
    { name:'Acheteurs',   value: users.filter(u=>u.role==='buyer').length   },
    { name:'Vendeurs',    value: users.filter(u=>u.role==='seller').length  },
    { name:'Admins',      value: users.filter(u=>u.role==='admin').length   },
  ].filter(d => d.value > 0);

  const pendingUsers    = users.filter(u => u.status === 'pending');
  const pendingProducts = (productsData?.products || []).filter(p => p.status === 'pending');
  const openDisputes    = disputes.filter(d => d.status === 'open');

  const TABS = [
    { id:'overview',        label:'Vue d\'ensemble' },
    { id:'qualifications',  label:'Qualifications (' + pendingQualifs.length + ')' },
    { id:'users',           label:'Utilisateurs (' + users.length + ')' },
    { id:'products',        label:'Produits PDR (' + products.length + ')' },
    { id:'orders',          label:'Commandes (' + allOrders.length + ')' },
    { id:'disputes',        label:'Litiges (' + openDisputes.length + ')' },
    { id:'stockage',        label:'🏢 Stockage' },
    { id:'expeditions',      label:'🚛 Expéditions REVEX' },
    { id:'inventaires',      label:'🔍 Inventaires' },
    { id:'urgences',         label:'⚡ Urgences' },
    { id:'auto',             label:'🚗 Pièces Auto' },
  ];


  // ── RECHERCHE GLOBALE ──────────────────────────────────────
  const runSearch = function(q) {
    setGlobalSearch(q);
    if (!q.trim()) { setSearchResults(null); return; }
    var qLow = q.toLowerCase();
    var rOrders   = allOrders.filter(function(o) {
      return (o.order_number&&o.order_number.toLowerCase().includes(qLow))
          || (o.buyer_company&&o.buyer_company.toLowerCase().includes(qLow))
          || (o.seller_company&&o.seller_company.toLowerCase().includes(qLow))
          || (o.product_title&&o.product_title.toLowerCase().includes(qLow));
    });
    var rProducts = products.filter(function(p) {
      return (p.title&&p.title.toLowerCase().includes(qLow))
          || (p.reference&&p.reference.toLowerCase().includes(qLow))
          || (p.brand&&p.brand.toLowerCase().includes(qLow))
          || (p.seller_company&&p.seller_company.toLowerCase().includes(qLow));
    });
    var rUsers = users.filter(function(u) {
      return (u.company_name&&u.company_name.toLowerCase().includes(qLow))
          || (u.email&&u.email.toLowerCase().includes(qLow))
          || (u.contact_name&&u.contact_name.toLowerCase().includes(qLow))
          || (u.city&&u.city.toLowerCase().includes(qLow));
    });
    var rDisputes = disputes.filter(function(d) {
      return (d.order_number&&d.order_number.toLowerCase().includes(qLow))
          || (d.buyer_company&&d.buyer_company.toLowerCase().includes(qLow))
          || (d.seller_company&&d.seller_company.toLowerCase().includes(qLow))
          || (d.reason&&d.reason.toLowerCase().includes(qLow));
    });
    setSearchResults({ orders:rOrders, products:rProducts, users:rUsers, disputes:rDisputes });
  };

  return (
    <div style={{ background:C.cream, minHeight:'100vh' }}>
    <div style={{ maxWidth:1400, margin:'0 auto', padding:'2rem 2rem 4rem' }}>

      {/* ── EN-TÊTE ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.2rem', color:C.forest }}>⚙️ Administration REVEX</h1>
          <p style={{ color:C.muted, fontSize:'0.9rem', marginTop:'0.2rem' }}>Tableau de bord complet de la plateforme</p>
        </div>
        {/* Barre de recherche globale */}
        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', background:C.white, border:'1px solid '+C.mid, borderRadius:100, padding:'0.4rem 0.4rem 0.4rem 1rem', minWidth:320, boxShadow:'0 2px 12px rgba(30,61,15,0.06)' }}>
          <span style={{ fontSize:'0.9rem', opacity:0.5 }}>🔍</span>
          <input value={globalSearch} onChange={function(e){ runSearch(e.target.value); }}
            placeholder="Chercher commande, produit, utilisateur..."
            style={{ flex:1, border:'none', outline:'none', fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", color:C.forest, background:'transparent', minWidth:200 }}/>
          {globalSearch && (
            <button onClick={function(){ setGlobalSearch(''); setSearchResults(null); }}
              style={{ background:C.mid, border:'none', borderRadius:'50%', width:22, height:22, cursor:'pointer', fontSize:'0.7rem', color:C.muted, flexShrink:0 }}>
              ✕
            </button>
          )}
        </div>

        {/* Alertes urgentes */}
        <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
          {pendingUsers.length > 0 && (
            <div style={{ background:'#FEF5E7', border:'1px solid #F0B27A', borderRadius:100, padding:'0.45rem 1rem', fontSize:'0.8rem', fontWeight:600, color:'#784212' }}>
              ⚠️ {pendingUsers.length} utilisateur(s) à valider
            </div>
          )}
          {pendingQualifs.length > 0 && (
            <div onClick={() => setActiveTab('qualifications')}
              style={{ background:'#EBF5FB', border:'1px solid #AED6F1', borderRadius:100, padding:'0.45rem 1rem', fontSize:'0.8rem', fontWeight:600, color:'#1A5276', cursor:'pointer' }}>
              🏭 {pendingQualifs.length} qualification(s) en attente
            </div>
          )}
          {openDisputes.length > 0 && (
            <div style={{ background:'#FDECEA', border:'1px solid '+(C.urgent)+'', borderRadius:100, padding:'0.45rem 1rem', fontSize:'0.8rem', fontWeight:600, color:C.urgent }}>
              ⚖️ {openDisputes.length} litige(s) ouvert(s)
            </div>
          )}
        </div>
      </div>

      {/* ── KPIs GLOBAUX ── */}
      <div className='kpi-grid' style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'1rem', marginBottom:'2rem' }}>
        {[
          { icon:'👥', label:'Utilisateurs',    value:stats.users?.total||users.length,          sub:'+'+(stats.users?.new_this_month||0)+' ce mois',     color:C.blue   },
          { icon:'📦', label:'Produits actifs', value:stats.products?.active||products.filter(p=>p.status==='active').length, sub:''+(stats.products?.sold||0)+' vendus',   color:C.leaf   },
          { icon:'🛒', label:'Commandes',        value:stats.orders?.total||allOrders.length,     sub:''+(stats.orders?.pending||0)+' en attente',         color:C.orange },
          { icon:'💰', label:'CA mensuel',       value:''+(fmt(stats.revenue?.monthly_revenue))+' MAD', sub:'Total: '+(fmt(stats.revenue?.total_revenue))+' MAD', color:C.eco    },
          { icon:'⚖️', label:'Litiges ouverts',  value:openDisputes.length,                       sub:''+(disputes.length)+' total',                       color:C.urgent },
        ].map(k => (
          <div key={k.label} style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:16, padding:'1.3rem' }}>
            <div style={{ fontSize:'1.7rem', marginBottom:'0.4rem' }}>{k.icon}</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', fontWeight:700, color:k.color, lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:'0.76rem', fontWeight:600, color:C.forest, marginTop:'0.3rem' }}>{k.label}</div>
            <div style={{ fontSize:'0.7rem', color:C.muted, marginTop:'0.1rem' }}>{k.sub}</div>
          </div>
        ))}
      </div>


      {/* ── RÉSULTATS RECHERCHE GLOBALE ── */}
      {searchResults && (
        <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, padding:'1.5rem', marginBottom:'1.5rem', boxShadow:'0 4px 20px rgba(30,61,15,0.08)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:C.forest }}>
              Résultats pour <em>"{globalSearch}"</em>
            </div>
            <div style={{ fontSize:'0.78rem', color:C.muted }}>
              {searchResults.orders.length + searchResults.products.length + searchResults.users.length + searchResults.disputes.length} résultat(s)
            </div>
          </div>

          {/* Commandes */}
          {searchResults.orders.length > 0 && (
            <div style={{ marginBottom:'1.2rem' }}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:C.leaf, marginBottom:'0.5rem' }}>
                🛒 Commandes ({searchResults.orders.length})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                {searchResults.orders.slice(0,5).map(function(o) {
                  return (
                    <div key={o.id} onClick={function(){ setSearchResults(null); setGlobalSearch(''); setActiveTab('orders'); setSelectedOrder(o); }}
                      style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.6rem 0.9rem', background:C.cream, borderRadius:10, cursor:'pointer', transition:'background 0.15s' }}
                      onMouseEnter={function(e){ e.currentTarget.style.background=C.beige; }}
                      onMouseLeave={function(e){ e.currentTarget.style.background=C.cream; }}>
                      <div>
                        <span style={{ fontFamily:'monospace', fontSize:'0.78rem', color:C.muted }}>{o.order_number}</span>
                        <span style={{ marginLeft:'0.7rem', fontSize:'0.82rem', color:C.forest, fontWeight:500 }}>{o.product_title && o.product_title.substring(0,40)}</span>
                      </div>
                      <div style={{ display:'flex', gap:'0.6rem', alignItems:'center' }}>
                        <span style={{ fontSize:'0.75rem', color:C.muted }}>{o.buyer_company}</span>
                        <span style={{ background:(STATUS_COLOR[o.status]||'#888')+'22', color:STATUS_COLOR[o.status]||'#888', padding:'0.15rem 0.5rem', borderRadius:100, fontSize:'0.7rem', fontWeight:600 }}>{STATUS_FR[o.status]||o.status}</span>
                        <span style={{ fontWeight:700, color:C.leaf, fontSize:'0.82rem' }}>{fmt(o.final_price)} MAD</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Produits */}
          {searchResults.products.length > 0 && (
            <div style={{ marginBottom:'1.2rem' }}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:C.leaf, marginBottom:'0.5rem' }}>
                📦 Produits ({searchResults.products.length})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                {searchResults.products.slice(0,5).map(function(p) {
                  return (
                    <div key={p.id} onClick={function(){ setSearchResults(null); setGlobalSearch(''); setActiveTab('products'); }}
                      style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.6rem 0.9rem', background:C.cream, borderRadius:10, cursor:'pointer', transition:'background 0.15s' }}
                      onMouseEnter={function(e){ e.currentTarget.style.background=C.beige; }}
                      onMouseLeave={function(e){ e.currentTarget.style.background=C.cream; }}>
                      <div>
                        <span style={{ fontSize:'0.82rem', color:C.forest, fontWeight:500 }}>{p.title && p.title.substring(0,45)}</span>
                        {p.reference && <span style={{ marginLeft:'0.6rem', fontFamily:'monospace', fontSize:'0.72rem', color:C.muted }}>{p.reference}</span>}
                      </div>
                      <div style={{ display:'flex', gap:'0.6rem', alignItems:'center' }}>
                        <span style={{ fontSize:'0.75rem', color:C.muted }}>{p.seller_company}</span>
                        <span style={{ background:(STATUS_COLOR[p.status]||'#888')+'22', color:STATUS_COLOR[p.status]||'#888', padding:'0.15rem 0.5rem', borderRadius:100, fontSize:'0.7rem', fontWeight:600 }}>{STATUS_FR[p.status]||p.status}</span>
                        <span style={{ fontWeight:700, color:C.leaf, fontSize:'0.82rem' }}>{fmt(p.price)} MAD</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Utilisateurs */}
          {searchResults.users.length > 0 && (
            <div style={{ marginBottom:'1.2rem' }}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:C.leaf, marginBottom:'0.5rem' }}>
                👥 Utilisateurs ({searchResults.users.length})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                {searchResults.users.slice(0,5).map(function(u) {
                  return (
                    <div key={u.id} onClick={function(){ setSearchResults(null); setGlobalSearch(''); setActiveTab('users'); }}
                      style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.6rem 0.9rem', background:C.cream, borderRadius:10, cursor:'pointer', transition:'background 0.15s' }}
                      onMouseEnter={function(e){ e.currentTarget.style.background=C.beige; }}
                      onMouseLeave={function(e){ e.currentTarget.style.background=C.cream; }}>
                      <div>
                        <span style={{ fontSize:'0.82rem', color:C.forest, fontWeight:500 }}>{u.company_name || u.contact_name}</span>
                        <span style={{ marginLeft:'0.6rem', fontSize:'0.75rem', color:C.muted }}>{u.email}</span>
                      </div>
                      <div style={{ display:'flex', gap:'0.6rem', alignItems:'center' }}>
                        <span style={{ fontSize:'0.75rem', color:C.muted }}>{u.city||'—'}</span>
                        <span style={{ background:(STATUS_COLOR[u.status]||'#888')+'22', color:STATUS_COLOR[u.status]||'#888', padding:'0.15rem 0.5rem', borderRadius:100, fontSize:'0.7rem', fontWeight:600 }}>{u.role}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Litiges */}
          {searchResults.disputes.length > 0 && (
            <div>
              <div style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:C.urgent, marginBottom:'0.5rem' }}>
                ⚖️ Litiges ({searchResults.disputes.length})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                {searchResults.disputes.slice(0,3).map(function(d) {
                  return (
                    <div key={d.id} onClick={function(){ setSearchResults(null); setGlobalSearch(''); setActiveTab('disputes'); }}
                      style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.6rem 0.9rem', background:'#FEF5F5', borderRadius:10, cursor:'pointer' }}
                      onMouseEnter={function(e){ e.currentTarget.style.background='#FDECEA'; }}
                      onMouseLeave={function(e){ e.currentTarget.style.background='#FEF5F5'; }}>
                      <div>
                        <span style={{ fontFamily:'monospace', fontSize:'0.78rem', color:C.muted }}>{d.order_number}</span>
                        <span style={{ marginLeft:'0.7rem', fontSize:'0.8rem', color:C.forest }}>{d.buyer_company} vs {d.seller_company}</span>
                      </div>
                      <span style={{ background:C.urgent+'22', color:C.urgent, padding:'0.15rem 0.5rem', borderRadius:100, fontSize:'0.7rem', fontWeight:600 }}>{d.status==='open'?'Ouvert':'Résolu'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {searchResults.orders.length + searchResults.products.length + searchResults.users.length + searchResults.disputes.length === 0 && (
            <div style={{ textAlign:'center', padding:'2rem', color:C.muted, fontSize:'0.88rem' }}>
              Aucun résultat pour "{globalSearch}"
            </div>
          )}
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ display:'flex', gap:'0.3rem', marginBottom:'1.5rem', borderBottom:'2px solid '+(C.mid)+'', paddingBottom:'0', overflowX:'auto', flexShrink:0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding:'0.65rem 1.2rem', border:'none', background:'transparent', cursor:'pointer', fontSize:'0.85rem', fontWeight:activeTab===t.id?700:400, color:activeTab===t.id?C.forest:C.muted, borderBottom:activeTab===t.id?'3px solid '+C.leaf:'3px solid transparent', fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════
          TAB : VUE D'ENSEMBLE
      ════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:'2rem', marginBottom:'2rem' }}>
            {/* Graphique ventes */}
            <div style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:18, padding:'1.5rem' }}>
              <h3 style={h3}>📈 Ventes par mois</h3>
              {salesByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={salesByMonth} margin={{ top:5, right:5, bottom:5, left:0 }}>
                    <XAxis dataKey="month" tick={{ fontSize:11 }} />
                    <YAxis tick={{ fontSize:11 }} />
                    <Tooltip formatter={(v, n) => [n==='revenue'? fmt(v)+' MAD':v, n==='revenue'?'Revenu':'Commandes']} />
                    <Bar dataKey="orders"  fill={C.leaf}   radius={[4,4,0,0]} name="Commandes" />
                    <Bar dataKey="revenue" fill={C.sage}   radius={[4,4,0,0]} name="Revenu" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign:'center', padding:'3rem', color:C.muted, fontSize:'0.85rem' }}>Données insuffisantes pour le graphique</div>
              )}
            </div>

            {/* Répartition utilisateurs */}
            <div style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:18, padding:'1.5rem' }}>
              <h3 style={h3}>👥 Répartition utilisateurs</h3>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display:'flex', justifyContent:'center', gap:'1.2rem', flexWrap:'wrap' }}>
                    {pieData.map(d => (
                      <div key={d.name} style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.78rem' }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background:d.color, flexShrink:0 }}/>
                        <span style={{ color:C.muted }}>{d.name}: <strong style={{color:C.forest}}>{d.value}</strong></span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div style={{ textAlign:'center', padding:'2rem', color:C.muted, fontSize:'0.85rem' }}>Aucune donnée</div>}

              {/* Rôles */}
              <div style={{ marginTop:'1rem', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.6rem' }}>
                {roleData.map(r => (
                  <div key={r.name} style={{ background:C.beige, borderRadius:10, padding:'0.6rem', textAlign:'center' }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:C.forest }}>{r.value}</div>
                    <div style={{ fontSize:'0.72rem', color:C.muted }}>{r.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Commandes récentes + Produits top */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem' }}>
            <div style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:18, padding:'1.5rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1rem' }}>
                <h3 style={h3}>🛒 Commandes récentes</h3>
                <button onClick={() => setActiveTab('orders')} style={{ fontSize:'0.82rem', color:C.leaf, background:'none', border:'none', cursor:'pointer' }}>Voir tout →</button>
              </div>
              {recentOrders.length === 0 ? <Empty icon="🛒" msg="Aucune commande"/> : (
                <div style={{ maxHeight:280, overflowY:'auto' }}>
                  {recentOrders.map((o, i) => (
                    <div key={o.id} style={{ display:'flex', justifyContent:'space-between', padding:'0.6rem 0', borderBottom:'1px solid '+(C.beige)+'', fontSize:'0.82rem' }}>
                      <div>
                        <div style={{ fontWeight:500, color:C.forest }}>{o.order_number}</div>
                        <div style={{ color:C.muted, fontSize:'0.72rem' }}>{o.buyer_company} → {o.seller_company}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontWeight:700, color:C.leaf }}>{fmt(o.final_price)} MAD</div>
                        <span style={{ background:(STATUS_COLOR[o.status]||'#888')+'22', color:STATUS_COLOR[o.status]||'#888', padding:'0.12rem 0.4rem', borderRadius:100, fontSize:'0.68rem', fontWeight:600 }}>
                          {STATUS_FR[o.status]||o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:18, padding:'1.5rem' }}>
              <h3 style={{ ...h3, marginBottom:'1rem' }}>🏆 Produits les plus vus</h3>
              {topProducts.length === 0 ? <Empty icon="📦" msg="Données insuffisantes"/> : (
                <div style={{ maxHeight:280, overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  {topProducts.map((p, i) => (
                    <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'0.8rem', padding:'0.6rem', background:C.beige, borderRadius:10 }}>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:C.muted, width:28, textAlign:'center' }}>#{i+1}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:500, fontSize:'0.85rem', color:C.forest }}>{p.title?.substring(0,40)}</div>
                        <div style={{ fontSize:'0.72rem', color:C.muted }}>{p.views_count||0} vues • {fmt(p.price)} MAD</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Liens gestion rapide */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginTop:'2rem' }}>
            {[
              { to:'/admin/utilisateurs', icon:'👥', label:'Gérer utilisateurs',   desc:'Activer, suspendre, qualifier' },
              { to:'/admin/produits',     icon:'📦', label:'Gérer produits',        desc:'Modération des annonces PDR' },
              { to:'/admin/litiges',      icon:'⚖️', label:'Gérer litiges',         desc:'Arbitrage et libération escrow' },
              { to:'/seller/analyse',     icon:'🔬', label:'Analyses CCOM',         desc:'Vue d\'ensemble des analyses' },
            ].map(a => (
              <Link key={a.to} to={a.to}
                style={{ background:C.forest, borderRadius:16, padding:'1.3rem', textDecoration:'none', display:'block', transition:'opacity 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                <div style={{ fontSize:'1.8rem', marginBottom:'0.7rem' }}>{a.icon}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', fontWeight:700, color:C.cream, marginBottom:'0.3rem' }}>{a.label}</div>
                <div style={{ fontSize:'0.75rem', color:'rgba(246,241,231,0.6)' }}>{a.desc}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ════════════════════════════════════
          TAB : UTILISATEURS
      ════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:18, padding:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1.2rem' }}>
            <h3 style={h3}>👥 Tous les utilisateurs ({users.length})</h3>
            <Link to="/admin/utilisateurs" style={{ fontSize:'0.82rem', color:C.leaf, textDecoration:'none' }}>Page complète →</Link>
          </div>
          {pendingUsers.length > 0 && (
            <div style={{ background:'#FEF5E7', border:'1px solid #F0B27A', borderRadius:12, padding:'0.8rem 1rem', marginBottom:'1rem', fontSize:'0.82rem', color:'#784212' }}>
              ⚠️ <strong>{pendingUsers.length} utilisateur(s)</strong> en attente d'activation
            </div>
          )}
          <div style={{ maxHeight:600, overflowY:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
              <thead>
                <tr style={{ background:C.beige, position:'sticky', top:0 }}>
                  {['Entreprise','Email','Rôle','Ville','Inscription','Statut','Actions'].map(h => (
                    <th key={h} style={{ padding:'0.65rem 0.8rem', textAlign:'left', color:C.muted, fontWeight:600, fontSize:'0.72rem', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ background:i%2===0?C.white:C.cream, borderBottom:'1px solid '+(C.beige)+'' }}>
                    <td style={{ padding:'0.65rem 0.8rem', fontWeight:500, color:C.forest }}>{u.company_name||'—'}</td>
                    <td style={{ padding:'0.65rem 0.8rem', color:C.muted, fontSize:'0.8rem' }}>{u.email}</td>
                    <td style={{ padding:'0.65rem 0.8rem' }}>
                      <span style={{ background:u.role==='admin'?C.urgent+'22':u.role==='seller'?C.blue+'22':C.eco+'22', color:u.role==='admin'?C.urgent:u.role==='seller'?C.blue:C.eco, padding:'0.12rem 0.5rem', borderRadius:100, fontSize:'0.72rem', fontWeight:600 }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding:'0.65rem 0.8rem', color:C.muted, fontSize:'0.8rem' }}>{u.city||'—'}</td>
                    <td style={{ padding:'0.65rem 0.8rem', color:C.muted, fontSize:'0.75rem' }}>{new Date(u.created_at).toLocaleDateString('fr-MA')}</td>
                    <td style={{ padding:'0.65rem 0.8rem' }}>
                      <span style={{ background:(STATUS_COLOR[u.status]||'#888')+'22', color:STATUS_COLOR[u.status]||'#888', padding:'0.12rem 0.5rem', borderRadius:100, fontSize:'0.7rem', fontWeight:600 }}>
                        {STATUS_FR[u.status]||u.status}
                      </span>
                    </td>
                    <td style={{ padding:'0.65rem 0.8rem' }}>
                      <div style={{ display:'flex', gap:'0.3rem' }}>
                        {u.status === 'pending' && (
                          <button onClick={() => activateUser.mutate({ id:u.id, action:'activate' })}
                            style={{ background:C.eco, color:'#fff', border:'none', padding:'0.25rem 0.65rem', borderRadius:100, fontSize:'0.7rem', cursor:'pointer', fontWeight:600 }}>
                            Activer
                          </button>
                        )}
                        {u.status === 'active' && u.role !== 'admin' && (
                          <button onClick={() => activateUser.mutate({ id:u.id, action:'suspend' })}
                            style={{ background:C.urgent, color:'#fff', border:'none', padding:'0.25rem 0.65rem', borderRadius:100, fontSize:'0.7rem', cursor:'pointer', fontWeight:600 }}>
                            Suspendre
                          </button>
                        )}
                        {u.status === 'suspended' && (
                          <button onClick={() => activateUser.mutate({ id:u.id, action:'activate' })}
                            style={{ background:C.leaf, color:'#fff', border:'none', padding:'0.25rem 0.65rem', borderRadius:100, fontSize:'0.7rem', cursor:'pointer', fontWeight:600 }}>
                            Réactiver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          TAB : PRODUITS
      ════════════════════════════════════ */}
      {activeTab === 'products' && (
        <div style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:18, padding:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1.2rem' }}>
            <h3 style={h3}>📦 Tous les produits ({products.length})</h3>
            <Link to="/admin/produits" style={{ fontSize:'0.82rem', color:C.leaf, textDecoration:'none' }}>Page complète →</Link>
          </div>
          {pendingProducts.length > 0 && (
            <div style={{ background:'#FEF5E7', border:'1px solid #F0B27A', borderRadius:12, padding:'0.8rem 1rem', marginBottom:'1rem', fontSize:'0.82rem', color:'#784212' }}>
              ⚠️ <strong>{pendingProducts.length} produit(s)</strong> en attente de modération
            </div>
          )}
          <div style={{ maxHeight:600, overflowY:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
              <thead>
                <tr style={{ background:C.beige, position:'sticky', top:0 }}>
                  {['Désignation','Réf','Vendeur','Qté','Prix','Vues','Statut','Actions'].map(h => (
                    <th key={h} style={{ padding:'0.65rem 0.8rem', textAlign:'left', color:C.muted, fontWeight:600, fontSize:'0.72rem', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.id} style={{ background:i%2===0?C.white:C.cream, borderBottom:'1px solid '+(C.beige)+'' }}>
                    <td style={{ padding:'0.65rem 0.8rem', maxWidth:200 }}>
                      <Link to={(p.is_auto?'/auto/':'/produit/')+p.slug} style={{ color:C.forest, textDecoration:'none', fontWeight:500 }}>
                        {p.title?.substring(0,38)}{p.title?.length>38?'...':''}
                      </Link>
                    </td>
                    <td style={{ padding:'0.65rem 0.8rem', fontFamily:'monospace', fontSize:'0.75rem', color:C.muted }}>{p.reference||'—'}</td>
                    <td style={{ padding:'0.65rem 0.8rem', color:C.muted, fontSize:'0.8rem' }}>{p.seller_company?.substring(0,20)}</td>
                    <td style={{ padding:'0.65rem 0.8rem', textAlign:'center' }}>{p.quantity}</td>
                    <td style={{ padding:'0.65rem 0.8rem', fontWeight:700, color:C.leaf }}>{fmt(p.price)} MAD</td>
                    <td style={{ padding:'0.65rem 0.8rem', textAlign:'center', color:C.muted }}>{p.views_count||0}</td>
                    <td style={{ padding:'0.65rem 0.8rem' }}>
                      <span style={{ background:(STATUS_COLOR[p.status]||'#888')+'22', color:STATUS_COLOR[p.status]||'#888', padding:'0.12rem 0.5rem', borderRadius:100, fontSize:'0.7rem', fontWeight:600 }}>
                        {STATUS_FR[p.status]||p.status}
                      </span>
                    </td>
                    <td style={{ padding:'0.65rem 0.8rem' }}>
                      <div style={{ display:'flex', gap:'0.3rem' }}>
                        {p.status === 'pending' && (
                          <button onClick={() => moderateProduct.mutate({ id:p.id, action:'approve' })}
                            style={{ background:C.eco, color:'#fff', border:'none', padding:'0.22rem 0.6rem', borderRadius:100, fontSize:'0.68rem', cursor:'pointer', fontWeight:600 }}>
                            ✓ Approuver
                          </button>
                        )}
                        {p.status === 'active' && (
                          <button onClick={() => moderateProduct.mutate({ id:p.id, action:'suspend' })}
                            style={{ background:C.urgent, color:'#fff', border:'none', padding:'0.22rem 0.6rem', borderRadius:100, fontSize:'0.68rem', cursor:'pointer', fontWeight:600 }}>
                            Retirer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          TAB : PIÈCES AUTO
      ════════════════════════════════════ */}
      {activeTab === 'auto' && (
        <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, padding:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.2rem', flexWrap:'wrap', gap:'0.7rem' }}>
            <h3 style={h3}>🚗 Pièces Automobiles ({autoProducts.length})</h3>
            <div style={{ display:'flex', gap:'0.5rem' }}>
              <Link to="/pieces-auto" style={{ background:'#FEE2E2', color:'#DC2626', textDecoration:'none', padding:'0.45rem 1rem', borderRadius:100, fontSize:'0.8rem', fontWeight:700 }}>
                Voir marketplace →
              </Link>
            </div>
          </div>

          {/* Stats auto */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.7rem', marginBottom:'1.2rem' }}>
            {[
              { label:'Total annonces', value:autoProducts.length, color:'#DC2626' },
              { label:'Actives', value:autoProducts.filter(p=>p.status==='active').length, color:'#059669' },
              { label:'Vendus', value:autoProducts.filter(p=>p.status==='sold').length, color:'#2563EB' },
              { label:'Valeur totale', value:autoProducts.reduce((s,p)=>s+Number(p.price||0),0).toLocaleString('fr-MA')+' MAD', color:'#D97706' },
            ].map(s => (
              <div key={s.label} style={{ background:'#FFF7F7', border:'1px solid #FECACA', borderRadius:12, padding:'0.8rem 1rem', textAlign:'center' }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:'0.68rem', color:'#6B7280', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ maxHeight:500, overflowY:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
              <thead>
                <tr style={{ background:'#FEE2E2', position:'sticky', top:0 }}>
                  {['Photo','Désignation','Véhicule','Vendeur','Prix','Etat','Vues','Statut','Actions'].map(h => (
                    <th key={h} style={{ padding:'0.6rem 0.7rem', textAlign:'left', color:'#991B1B', fontWeight:600, fontSize:'0.7rem', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {autoProducts.length === 0 && (
                  <tr><td colSpan={9} style={{ padding:'2rem', textAlign:'center', color:'#6B7280' }}>Aucune pièce auto publiée pour l'instant</td></tr>
                )}
                {autoProducts.map((p, i) => {
                  const imgs = Array.isArray(p.images)?p.images:(p.images?(() => { try { return JSON.parse(p.images); } catch { return []; } })():[]);
                  const cond = { new:'Neuf', good:'Bon état', used:'Occasion', for_parts:'Pour pièces' };
                  return (
                    <tr key={p.id} style={{ background:i%2===0?C.white:'#FFF7F7', borderBottom:'1px solid #FEE2E2' }}>
                      <td style={{ padding:'0.5rem 0.7rem' }}>
                        <div style={{ width:44, height:44, borderRadius:8, overflow:'hidden', background:'#FEE2E2' }}>
                          {imgs[0] ? <img src={imgs[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', opacity:0.3 }}>🔧</div>}
                        </div>
                      </td>
                      <td style={{ padding:'0.5rem 0.7rem', maxWidth:160 }}>
                        <Link to={'/auto/'+p.slug} style={{ color:'#DC2626', textDecoration:'none', fontWeight:600, fontSize:'0.82rem' }}>
                          {p.title?.substring(0,35)}{p.title?.length>35?'...':''}
                        </Link>
                        {p.reference && <div style={{ fontSize:'0.65rem', color:'#6B7280', fontFamily:'monospace' }}>Réf: {p.reference}</div>}
                      </td>
                      <td style={{ padding:'0.5rem 0.7rem', fontSize:'0.78rem', color:'#2563EB', fontWeight:600 }}>
                        {(p.vehicle_make||p.brand)||'—'}{p.vehicle_model?' '+p.vehicle_model:''}
                        {p.vehicle_year && <div style={{ fontSize:'0.65rem', color:'#6B7280' }}>{p.vehicle_year}</div>}
                      </td>
                      <td style={{ padding:'0.5rem 0.7rem', color:C.muted, fontSize:'0.78rem' }}>{p.seller_company?.substring(0,18)}</td>
                      <td style={{ padding:'0.5rem 0.7rem', fontWeight:700, color:'#DC2626' }}>{fmt(p.price)} MAD</td>
                      <td style={{ padding:'0.5rem 0.7rem' }}>
                        <span style={{ background:'#F0FDF4', color:'#059669', fontSize:'0.7rem', fontWeight:600, padding:'0.1rem 0.45rem', borderRadius:100 }}>
                          {cond[p.condition]||p.condition}
                        </span>
                      </td>
                      <td style={{ padding:'0.5rem 0.7rem', textAlign:'center', color:C.muted }}>{p.views_count||0}</td>
                      <td style={{ padding:'0.5rem 0.7rem' }}>
                        <span style={{ background:(STATUS_COLOR[p.status]||'#888')+'22', color:STATUS_COLOR[p.status]||'#888', padding:'0.1rem 0.45rem', borderRadius:100, fontSize:'0.7rem', fontWeight:600 }}>
                          {STATUS_FR[p.status]||p.status}
                        </span>
                      </td>
                      <td style={{ padding:'0.5rem 0.7rem' }}>
                        <div style={{ display:'flex', gap:'0.3rem', flexWrap:'wrap' }}>
                          {p.status === 'active' && (
                            <button onClick={() => moderateProduct.mutate({ id:p.id, action:'suspend' })}
                              style={{ background:'#FEE2E2', color:'#DC2626', border:'1px solid #FECACA', padding:'0.2rem 0.55rem', borderRadius:100, fontSize:'0.68rem', cursor:'pointer', fontWeight:600 }}>
                              Retirer
                            </button>
                          )}
                          {p.status !== 'active' && (
                            <button onClick={() => moderateProduct.mutate({ id:p.id, action:'approve' })}
                              style={{ background:'#ECFDF5', color:'#059669', border:'1px solid #A7F3D0', padding:'0.2rem 0.55rem', borderRadius:100, fontSize:'0.68rem', cursor:'pointer', fontWeight:600 }}>
                              Activer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          TAB : COMMANDES
      ════════════════════════════════════ */}
      {activeTab === 'orders' && (
        <div>
          {/* Header + filtres */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.2rem', flexWrap:'wrap', gap:'0.8rem' }}>
            <h3 style={h3}>🛒 Gestion des commandes ({allOrders.length})</h3>
            <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
              {[['','Toutes'],['pending','En attente'],['confirmed','Confirmées'],['shipped','Expédiées'],['delivered','Livrées'],['cancelled','Annulées'],['disputed','Litiges']].map(([v,l]) => (
                <button key={v} onClick={() => setOrderFilter(v)}
                  style={{ padding:'0.32rem 0.8rem', borderRadius:100, border:'1px solid '+(orderFilter===v?C.forest:C.mid), background:orderFilter===v?C.forest:'transparent', color:orderFilter===v?C.cream:C.muted, fontSize:'0.78rem', cursor:'pointer', fontWeight:orderFilter===v?600:400, fontFamily:"'DM Sans',sans-serif" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Stats bar */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'0.7rem', marginBottom:'1.2rem' }}>
            {[
              ['⏳', 'En attente',  allOrders.filter(o=>o.status==='pending').length,   C.orange],
              ['🚛', 'Expédiées',  allOrders.filter(o=>o.status==='shipped').length,   C.leaf],
              ['✅', 'Livrées',    allOrders.filter(o=>o.status==='delivered').length,  C.eco],
              ['❌', 'Annulées',   allOrders.filter(o=>o.status==='cancelled').length,  C.urgent],
              ['🔒', 'Escrow',     allOrders.filter(o=>o.payment_status==='escrowed').length, C.orange],
            ].map(([ic,lb,v,col]) => (
              <div key={lb} style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:12, padding:'0.8rem 1rem', display:'flex', alignItems:'center', gap:'0.6rem' }}>
                <span style={{ fontSize:'1.1rem' }}>{ic}</span>
                <div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:col, lineHeight:1 }}>{v}</div>
                  <div style={{ fontSize:'0.68rem', color:C.muted }}>{lb}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Liste commandes */}
          <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem' }}>
            {allOrders.filter(o => !orderFilter || o.status===orderFilter).map(o => {
              const sc = STATUS_COLOR[o.status]||'#888';
              const sl = STATUS_FR[o.status]||o.status;
              const isSelected = selectedOrder?.id === o.id;
              return (
                <div key={o.id} style={{ background:C.white, border:'1.5px solid '+(isSelected?C.leaf:C.mid), borderRadius:14, overflow:'hidden', transition:'border-color 0.2s' }}>
                  {/* Row principal */}
                  <div style={{ padding:'0.9rem 1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.6rem', cursor:'pointer' }}
                    onClick={() => setSelectedOrder(isSelected ? null : o)}>
                    <div style={{ display:'flex', gap:'1rem', alignItems:'center' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:sc, flexShrink:0 }}/>
                      <div>
                        <div style={{ fontFamily:'monospace', fontSize:'0.8rem', color:C.muted }}>{o.order_number}</div>
                        <div style={{ fontWeight:600, color:C.forest, fontSize:'0.88rem' }}>
                          {o.product_title?.substring(0,40)}
                        </div>
                        <div style={{ fontSize:'0.75rem', color:C.muted, marginTop:1 }}>
                          {o.buyer_company} → {o.seller_company} · {new Date(o.created_at).toLocaleDateString('fr-MA')}
                        </div>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.8rem' }}>
                      <span style={{ background:sc+'22', color:sc, padding:'0.2rem 0.7rem', borderRadius:100, fontSize:'0.72rem', fontWeight:700 }}>{sl}</span>
                      {o.payment_status === 'escrowed' && (
                        <span style={{ background:C.orange+'22', color:C.orange, padding:'0.2rem 0.6rem', borderRadius:100, fontSize:'0.7rem', fontWeight:600 }}>🔒 Escrow</span>
                      )}
                      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.15rem', fontWeight:700, color:C.forest }}>{fmt(o.final_price)} MAD</span>
                      <span style={{ fontSize:'0.75rem', color:C.muted }}>{isSelected?'▲':'▼'}</span>
                    </div>
                  </div>

                  {/* Panel actions étendu */}
                  {isSelected && (
                    <div style={{ borderTop:'1px solid '+C.mid, padding:'1rem 1.2rem', background:C.cream }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.6rem', marginBottom:'1rem', fontSize:'0.78rem' }}>
                        {[
                          ['🛒 Acheteur', o.buyer_company],
                          ['🏭 Vendeur',  o.seller_company],
                          ['📦 Produit',  o.product_title],
                          ['💰 Montant',  fmt(o.final_price)+' MAD'],
                          ['🚚 Livraison', o.delivery_type==='eco'?'🌿 Éco':'⚡ Urgente'],
                          ['🔒 Escrow',   o.payment_status||'—'],
                        ].map(([k,v]) => (
                          <div key={k} style={{ background:C.white, borderRadius:8, padding:'0.5rem 0.8rem' }}>
                            <span style={{ color:C.muted }}>{k} : </span>
                            <span style={{ color:C.forest, fontWeight:600 }}>{v}</span>
                          </div>
                        ))}
                      </div>

                      {/* Actions statut */}
                      <div style={{ marginBottom:'0.8rem' }}>
                        <div style={{ fontSize:'0.72rem', fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>Changer le statut</div>
                        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                          {[['confirmed','✅ Confirmer'],['shipped','🚛 Marquer expédiée'],['delivered','📬 Confirmer livraison'],['cancelled','❌ Annuler']].map(([s,l]) => (
                            s !== o.status && (
                              <button key={s} onClick={() => window.confirm('Changer statut vers "'+l+'" ?') && updateOrderMutation.mutate({ id:o.id, status:s })}
                                style={{ padding:'0.38rem 0.9rem', borderRadius:100, border:'1px solid '+C.mid, background:s==='cancelled'?'#FDECEA':C.white, color:s==='cancelled'?C.urgent:C.forest, fontSize:'0.78rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                                {l}
                              </button>
                            )
                          ))}
                        </div>
                      </div>

                      {/* Actions escrow */}
                      {(o.payment_status === 'escrowed' || o.payment_status === 'disputed') && (
                        <div>
                          <div style={{ fontSize:'0.72rem', fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.5rem' }}>Libérer l'escrow</div>
                          <div style={{ display:'flex', gap:'0.6rem' }}>
                            <button onClick={() => window.confirm('Libérer le paiement au vendeur ?') && releaseEscrowMutation.mutate({ id:o.id, decision:'seller' })}
                              style={{ padding:'0.45rem 1.1rem', borderRadius:100, background:C.eco, color:'#fff', border:'none', fontSize:'0.82rem', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                              💚 Libérer au vendeur
                            </button>
                            <button onClick={() => window.confirm('Rembourser acheteur ?') && releaseEscrowMutation.mutate({ id:o.id, decision:'buyer' })}
                              style={{ padding:'0.45rem 1.1rem', borderRadius:100, background:'#FDECEA', color:C.urgent, border:'1px solid '+C.urgent+'44', fontSize:'0.82rem', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                              🔴 Rembourser acheteur
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {allOrders.filter(o => !orderFilter || o.status===orderFilter).length === 0 && (
              <Empty icon="🛒" msg="Aucune commande pour ce filtre"/>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          TAB : LITIGES
      ════════════════════════════════════ */}
      {activeTab === 'disputes' && (
        <div style={{ background:C.white, border:'1px solid '+(C.mid)+'', borderRadius:18, padding:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1.2rem' }}>
            <h3 style={h3}>⚖️ Litiges ({disputes.length}) — <span style={{color:C.urgent}}>{openDisputes.length} ouverts</span></h3>
            <Link to="/admin/litiges" style={{ fontSize:'0.82rem', color:C.leaf, textDecoration:'none' }}>Page complète →</Link>
          </div>
          {disputes.length === 0 ? (
            <Empty icon="⚖️" msg="Aucun litige enregistré" />
          ) : (
            <div style={{ maxHeight:600, overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.8rem' }}>
              {disputes.map(d => (
                <div key={d.id} style={{ background:d.status==='open'?'#FDECEA':C.beige, border:'1px solid '+(d.status==='open'?C.urgent:C.mid)+'', borderRadius:14, padding:'1rem 1.2rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem' }}>
                    <div style={{ fontWeight:700, color:C.forest, fontSize:'0.9rem' }}>Litige #{d.id?.substring(0,8)}</div>
                    <span style={{ background:(d.status==='open'?C.urgent:C.eco)+'22', color:d.status==='open'?C.urgent:C.eco, padding:'0.15rem 0.6rem', borderRadius:100, fontSize:'0.72rem', fontWeight:600 }}>
                      {d.status==='open'?'Ouvert':'Résolu'}
                    </span>
                  </div>
                  <div style={{ fontSize:'0.82rem', color:C.muted, marginBottom:'0.4rem' }}>
                    Commande: <strong>{d.order_number}</strong> • {d.buyer_company} vs {d.seller_company}
                  </div>
                  <div style={{ fontSize:'0.82rem', color:C.forest }}>{d.reason}</div>
                  <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:'0.4rem' }}>{new Date(d.created_at).toLocaleDateString('fr-MA')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════ TAB : QUALIFICATIONS ════ */}
      {activeTab === 'qualifications' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
            <h2 style={h3}>🏭 Qualifications Vendeurs</h2>
            <div style={{ fontSize:'0.85rem', color:C.muted }}>{qualifs.length} dossier(s) total · {pendingQualifs.length} en attente</div>
          </div>
          {qualifs.length === 0 ? <Empty icon="🏭" msg="Aucune qualification soumise"/> : (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {qualifs.map(q => {
                const stColor = q.status==='approved'?C.eco:q.status==='rejected'?C.urgent:q.status==='under_review'?C.blue:C.orange;
                const stLabel = q.status==='approved'?'✅ Approuvée':q.status==='rejected'?'❌ Refusée':q.status==='under_review'?'🔵 En revue':'⏳ En attente';
                return (
                  <div key={q.id} style={{ background:C.white, border:'1.5px solid '+(q.status==='pending'||q.status==='under_review'?C.orange:C.mid), borderRadius:16, overflow:'hidden' }}>
                    {/* Header */}
                    <div style={{ padding:'1rem 1.5rem', borderBottom:'1px solid '+C.mid, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem' }}>
                      <div>
                        <div style={{ fontWeight:700, color:C.forest, fontSize:'0.95rem' }}>{q.company_name}</div>
                        <div style={{ fontSize:'0.78rem', color:C.muted, marginTop:'0.2rem' }}>{q.email} · {q.city} · {q.sector}</div>
                        <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:'0.1rem' }}>
                          Soumis le {q.submitted_at ? new Date(q.submitted_at).toLocaleDateString('fr-MA') : '—'}
                        </div>
                      </div>
                      <span style={{ background:stColor+'22', color:stColor, borderRadius:100, padding:'0.3rem 0.9rem', fontSize:'0.8rem', fontWeight:700 }}>{stLabel}</span>
                    </div>

                    {/* Infos dossier */}
                    <div style={{ padding:'1rem 1.5rem', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.8rem' }}>
                      {[
                        ['Secteur', q.sector||'—'],
                        ['RC / Patente', q.rc_number||'—'],
                        ['Téléphone', q.phone||'—'],
                        ['Adresse', q.address||'—'],
                        ['Capital', q.capital ? q.capital+' MAD' : '—'],
                        ['Effectif', q.employees||'—'],
                      ].map(([k,v]) => (
                        <div key={k} style={{ fontSize:'0.82rem' }}>
                          <span style={{ color:C.muted }}>{k} : </span>
                          <span style={{ color:C.forest, fontWeight:500 }}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Description activité */}
                    {q.business_description && (
                      <div style={{ padding:'0 1.5rem 1rem' }}>
                        <div style={{ fontSize:'0.72rem', color:C.muted, fontWeight:600, marginBottom:'0.3rem' }}>DESCRIPTION ACTIVITÉ</div>
                        <p style={{ fontSize:'0.85rem', color:C.forest, lineHeight:1.6, margin:0 }}>{q.business_description}</p>
                      </div>
                    )}

                    {/* Notes de refus existantes */}
                    {q.review_notes && (
                      <div style={{ padding:'0.7rem 1.5rem', background:'#FDECEA', borderTop:'1px solid '+C.mid }}>
                        <div style={{ fontSize:'0.78rem', color:C.urgent }}>📝 Notes : {q.review_notes}</div>
                      </div>
                    )}

                    {/* Actions (si en attente) */}
                    {(q.status === 'pending' || q.status === 'under_review') && (
                      <QualifActions qualif={q} qc={qc}/>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>

      {/* ════ TAB : STOCKAGE ════ */}
      {activeTab === 'stockage' && (
        <StorageAdmin />
      )}

      {/* ════ TAB : EXPÉDITIONS REVEX ════ */}
      {activeTab === 'expeditions' && (
        <ExpeditionsREVEX />
      )}

      {/* ════ TAB : INVENTAIRES ════ */}
      {activeTab === 'inventaires' && (
        <DemandesInventaire />
      )}

      {/* ════ TAB : URGENCES ════ */}
      {activeTab === 'urgences' && (
        <DemandesUrgentes />
      )}

    </div>
  );
}

// ── Composant actions qualification ──────────────────────────
function QualifActions({ qualif, qc }) {
  const [notes, setNotes] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);

  const resolveMutation = useMutation(
    ({ status }) => api.put('/admin/qualifications/'+qualif.seller_id, { status, review_notes: notes }),
    {
      onSuccess: (_, { status }) => {
        toast.success(status === 'approved' ? '✅ Vendeur qualifié !' : '❌ Qualification refusée');
        qc.invalidateQueries('admin-qualifications');
        qc.invalidateQueries('admin-users-all');
        setShowForm(false);
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur')
    }
  );

  return (
    <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid #D9CEBC', background:'#F6F1E7' }}>
      {!showForm ? (
        <div style={{ display:'flex', gap:'0.7rem' }}>
          <button onClick={() => resolveMutation.mutate({ status:'approved' })}
            disabled={resolveMutation.isLoading}
            style={{ background:'#27AE60', color:'#fff', border:'none', padding:'0.6rem 1.5rem', borderRadius:100, fontWeight:700, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            ✅ Approuver
          </button>
          <button onClick={() => setShowForm(true)}
            style={{ background:'transparent', color:'#C0392B', border:'1.5px solid #C0392B', padding:'0.6rem 1.2rem', borderRadius:100, fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            ❌ Refuser
          </button>
          <button onClick={() => resolveMutation.mutate({ status:'under_review' })}
            style={{ background:'transparent', color:'#2980B9', border:'1.5px solid #AED6F1', padding:'0.6rem 1.2rem', borderRadius:100, fontSize:'0.82rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            🔍 Mettre en revue
          </button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#C0392B', marginBottom:'0.5rem' }}>Motif du refus (communiqué au vendeur) *</div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Ex: Dossier incomplet — merci de fournir votre RC et certificat de patente..."
            style={{ width:'100%', padding:'0.65rem', border:'1.5px solid #D9CEBC', borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", resize:'vertical', boxSizing:'border-box', marginBottom:'0.7rem' }}/>
          <div style={{ display:'flex', gap:'0.6rem' }}>
            <button onClick={() => resolveMutation.mutate({ status:'rejected' })} disabled={!notes.trim()||resolveMutation.isLoading}
              style={{ background:'#C0392B', color:'#fff', border:'none', padding:'0.6rem 1.4rem', borderRadius:100, fontWeight:700, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              {resolveMutation.isLoading ? '⏳...' : '❌ Confirmer le refus'}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ background:'transparent', color:'#5C5C50', border:'1px solid #D9CEBC', padding:'0.6rem 1rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Composant Stockage Admin (branchement API réel) ───────────
function StorageAdmin() {
  const C = {
    forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
    cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
    white:'#FDFAF4', muted:'#5C5C50',
    eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
  };

  const qc = useQueryClient();
  const [activeSubTab, setActiveSubTab] = React.useState('demandes');
  const [filterStatus,  setFilterStatus] = React.useState('');
  const [search,        setSearch]       = React.useState('');
  const [openId,        setOpenId]       = React.useState(null);
  const [rejectId,      setRejectId]     = React.useState(null);
  const [rejectNote,    setRejectNote]   = React.useState('');
  const [whModal,       setWhModal]      = React.useState(null); // null | 'add' | warehouse object
  const [whForm,        setWhForm]       = React.useState({});
  const [settings, setSettings] = React.useState({
    tarifBase:15, tarifReception:200, tarifPhotos:150, tarifCertif:100,
    tarifInventaire:200, tarifPicking:50, commissionStockage:3,
    delaiReponse:24, alerteSeuil:80,
    conditionsGenerales:'Stock accepté : PDR industriels certifiables grade A à D. Poids max par article : 500kg. Matières dangereuses exclues.',
  });

  // ── Chargement des demandes depuis l'API ──────────────────────
  const { data: reqData, isLoading: loadingReq, refetch: refetchReq } = useQuery(
    ['admin-storage-requests', filterStatus, search],
    () => {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (search)       params.set('search', search);
      return api.get('/storage?' + params.toString()).then(r => r.data);
    },
    { staleTime: 15000, keepPreviousData: true }
  );
  const requests = reqData?.requests || [];

  // ── Mutation changement de statut ─────────────────────────────
  const statusMutation = useMutation(
    ({ id, status, adminNotes, warehouseId }) =>
      api.put('/storage/' + id + '/status', { status, adminNotes, warehouseId }),
    {
      onSuccess: (res, vars) => {
        qc.invalidateQueries(['admin-storage-requests']);
        toast.success('✅ Statut mis à jour : ' + (STATUS_CFG[vars.status]?.label || vars.status));
        setOpenId(null);
        setRejectId(null);
        setRejectNote('');
        // ── Synchroniser la capacité entrepôt ──────────────────
        const req = requests.find(r => r.id === vars.id);
        if (req) {
          const vol = Number(req.estimated_vol || 0);
          if (vars.status === 'active') {
            // Stock entrant → augmenter capacité occupée
            // Synchroniser via API réelle
            const targetWH = warehouses.find(w => w.id === (vars.warehouseId || req.warehouse_id) || w.status === 'actif');
            if (targetWH) {
              updateVolumeWHMutation.mutate({ id: targetWH.id, delta: vol });
            }
            // Générer bon de chargement
            generateBonChargement({
              requestId: req.id,
              companyName: req.seller_company || req.company_name,
              contactName: req.contact_name,
              contactPhone: req.contact_phone,
              city: req.city,
              warehouseName: warehouses.find(w => w.id === (vars.warehouseId || req.warehouse_id) || w.status === 'actif')?.name || 'Entrepôt REVEX',
              warehouseCity: warehouses.find(w => w.id === (vars.warehouseId || req.warehouse_id) || w.status === 'actif')?.city || 'Casablanca',
              deliveryMode: req.delivery_mode,
              deliveryDate: req.delivery_date || req.start_date,
              estimatedVol: req.estimated_vol,
              wantPhotos: req.want_photos,
              wantCertif: req.want_certif,
              wantInventory: req.want_inventory,
            });
          }
          if (vars.status === 'completed') {
            // Stock sortant → libérer la capacité
            // Libérer volume via API réelle
            const targetWH2 = warehouses.find(w => w.id === req.warehouse_id || w.status === 'actif');
            if (targetWH2) {
              updateVolumeWHMutation.mutate({ id: targetWH2.id, delta: -vol });
            }
          }
        }
      },
      onError: err => toast.error(err.response?.data?.error || 'Erreur mise à jour'),
    }
  );

  // ── Bon de dépôt ──────────────────────────────────────────────
  const bonDepotMutation = useMutation(
    (id) => api.post('/storage/' + id + '/bon-depot'),
    {
      onSuccess: (res) => {
        const d = res.data;
        toast.success('📄 Bon de dépôt généré : ' + d.bonNumber);
        // Ouvre une fenêtre d'impression du bon
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(buildBonDepotHtml(d));
          win.document.close();
          win.onload = () => win.print();
        }
      },
      onError: err => toast.error(err.response?.data?.error || 'Erreur génération bon'),
    }
  );

  // ── Facture mensuelle ─────────────────────────────────────────
  const factureMutation = useMutation(
    (id) => api.post('/storage/' + id + '/facture'),
    {
      onSuccess: (res) => {
        const d = res.data;
        toast.success('🧾 Facture émise : ' + d.factureNumber + ' — ' + Number(d.amount||0).toLocaleString('fr-MA') + ' MAD');
        // Génère et ouvre le PDF de la facture
        const r = d.request || {};
        generateInvoicePdf({
          type: 'storage',
          requestId: r.id,
          companyName: r.seller_company || r.company_name,
          contactName: r.contact_name,
          city: r.city,
          estimatedVol: r.estimated_vol,
          storageType: r.storage_type,
          month: new Date().toLocaleDateString('fr-MA', { month: 'long', year: 'numeric' }),
          wantPhotos: r.want_photos,
          wantCertif: r.want_certif,
          wantInventory: r.want_inventory,
          wantPicking: r.want_picking,
          tarifBase: 15, tarifPhotos: 150, tarifCertif: 100,
          tarifInventaire: 200, tarifPicking: 50,
          nbExpeditions: 0,
        });
      },
      onError: err => toast.error(err.response?.data?.error || 'Erreur génération facture'),
    }
  );

  const STATUS_CFG = {
    pending:   { label:'⏳ En attente',   color:C.orange, bg:'#FEF5E7' },
    confirmed: { label:'✅ Confirmée',    color:C.blue,   bg:'#EBF5FB' },
    active:    { label:'🟢 En cours',     color:C.eco,    bg:'#E8F8EE' },
    completed: { label:'🔵 Terminée',     color:'#8B5CF6',bg:'#F3E8FF' },
    rejected:  { label:'❌ Refusée',      color:C.urgent, bg:'#FDECEA' },
  };

  // ── Entrepôts depuis API réelle ─────────────────────────────
  const { data: whData, refetch: refetchWH } = useQuery(
    'admin-warehouses',
    () => api.get('/warehouses').then(r => r.data),
    { staleTime: 30000 }
  );
  const warehouses = whData?.warehouses || [];

  // Mutations entrepôts
  const createWHMutation = useMutation(
    (data) => api.post('/warehouses', data),
    {
      onSuccess: (res) => {
        qc.invalidateQueries('admin-warehouses');
        toast.success('✅ Entrepôt ' + res.data.warehouse.name + ' créé.');
        setWhModal(null);
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Erreur création entrepôt'),
    }
  );

  const updateWHMutation = useMutation(
    ({ id, data }) => api.put('/warehouses/' + id, data),
    {
      onSuccess: () => {
        qc.invalidateQueries('admin-warehouses');
        toast.success('✅ Entrepôt mis à jour.');
        setWhModal(null);
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Erreur mise à jour'),
    }
  );

  const updateVolumeWHMutation = useMutation(
    ({ id, used, delta }) => api.patch('/warehouses/' + id + '/volume', { used, delta }),
    {
      onSuccess: (res) => {
        qc.invalidateQueries('admin-warehouses');
        toast.success('📊 Volume mis à jour : ' + Number(res.data.warehouse.used).toFixed(1) + ' m³');
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Erreur volume'),
    }
  );

  const updateStatusWHMutation = useMutation(
    ({ id, status }) => api.patch('/warehouses/' + id + '/status', { status }),
    {
      onSuccess: (res) => {
        qc.invalidateQueries('admin-warehouses');
        toast.info('Statut → ' + res.data.warehouse.status);
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Erreur statut'),
    }
  );

  const deleteWHMutation = useMutation(
    (id) => api.delete('/warehouses/' + id),
    {
      onSuccess: () => {
        qc.invalidateQueries('admin-warehouses');
        toast.success('🗑️ Entrepôt supprimé.');
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Erreur suppression'),
    }
  );

  // KPIs calculés depuis données réelles
  const kpis = {
    total:   requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    active:  requests.filter(r => r.status === 'active').length,
    revenue: requests.filter(r => ['active','completed'].includes(r.status))
               .reduce((s,r) => s + Number(r.estimated_revenue||0), 0),
    vol:     requests.filter(r => r.status === 'active')
               .reduce((s,r) => s + Number(r.estimated_vol||0), 0),
  };

  const setg = (k,v) => setSettings(prev => ({ ...prev, [k]:v }));

  const SUB_TABS = [
    { id:'demandes',  label:'Demandes (' + requests.length + ')' },
    { id:'entrepots', label:'Entrepôts (' + warehouses.length + ')' },
    { id:'tarifs',    label:'⚙️ Tarifs & Règles' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', color:C.forest, marginBottom:'0.2rem' }}>
            🏢 Gestion du Stockage REVEX
          </h2>
          <p style={{ fontSize:'0.82rem', color:C.muted }}>Gérez les demandes, entrepôts, tarifs et conditions de stockage</p>
        </div>
        <button onClick={() => refetchReq()}
          style={{ background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.5rem 1.1rem', borderRadius:100, fontSize:'0.8rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          🔄 Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'0.8rem', marginBottom:'1.5rem' }}>
        {[
          { icon:'📋', label:'Total demandes',  value:kpis.total,                                   color:C.forest },
          { icon:'⏳', label:'En attente',       value:kpis.pending,                                 color:C.orange },
          { icon:'🟢', label:'Stocks actifs',   value:kpis.active,                                  color:C.eco    },
          { icon:'📐', label:'Volume stocké',   value:kpis.vol.toFixed(1) + ' m³',                  color:C.blue   },
          { icon:'💰', label:'Revenus/mois',    value:kpis.revenue.toLocaleString('fr-MA') + ' MAD',color:'#8B5CF6' },
        ].map(k => (
          <div key={k.label} style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:14, padding:'1rem', textAlign:'center' }}>
            <div style={{ fontSize:'1.3rem', marginBottom:'0.3rem' }}>{k.icon}</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', fontWeight:700, color:k.color, lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:'0.68rem', color:C.muted, marginTop:'0.25rem' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{ display:'flex', gap:'0.3rem', borderBottom:'2px solid '+C.mid, marginBottom:'1.5rem' }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setActiveSubTab(t.id)}
            style={{ padding:'0.6rem 1.2rem', border:'none', background:'transparent', cursor:'pointer', fontSize:'0.85rem', fontWeight:activeSubTab===t.id?700:400, color:activeSubTab===t.id?C.forest:C.muted, borderBottom:activeSubTab===t.id?'3px solid '+C.leaf:'3px solid transparent', fontFamily:"'DM Sans',sans-serif" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ SUB-TAB : DEMANDES ══ */}
      {activeSubTab === 'demandes' && (
        <div>
          {/* Filtres */}
          <div style={{ display:'flex', gap:'0.7rem', marginBottom:'1rem', flexWrap:'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Entreprise, ville, N° demande..."
              style={{ flex:1, minWidth:200, padding:'0.5rem 1rem', border:'1.5px solid '+C.mid, borderRadius:100, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream }}/>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding:'0.5rem 0.9rem', border:'1px solid '+C.mid, borderRadius:100, fontSize:'0.82rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, cursor:'pointer' }}>
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {/* Loading */}
          {loadingReq && (
            <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}>
              <div style={{ fontSize:'2rem', marginBottom:'0.5rem', opacity:0.3 }}>🏢</div>
              Chargement des demandes...
            </div>
          )}

          {/* Vide */}
          {!loadingReq && requests.length === 0 && (
            <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem', opacity:0.3 }}>📭</div>
              {filterStatus || search ? 'Aucune demande pour ces filtres' : 'Aucune demande de stockage reçue'}
            </div>
          )}

          {/* Liste */}
          {!loadingReq && requests.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {requests.map(req => {
                const st    = STATUS_CFG[req.status] || STATUS_CFG.pending;
                const isOpen = openId === req.id;
                const days  = Math.floor((Date.now() - new Date(req.created_at).getTime()) / (1000*60*60*24));
                const isActing = statusMutation.isLoading && statusMutation.variables?.id === req.id;

                return (
                  <div key={req.id} style={{ background:C.white, border:'1.5px solid '+(req.status==='pending'?C.orange:C.mid), borderRadius:18, overflow:'hidden', boxShadow:'0 2px 10px rgba(30,61,15,0.05)', transition:'box-shadow 0.2s' }}>

                    {/* Card header */}
                    <div style={{ padding:'1rem 1.5rem', borderBottom:'1px solid '+C.beige, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem' }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.25rem', flexWrap:'wrap' }}>
                          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:C.forest }}>
                            {req.seller_company || req.company_name}
                          </span>
                          <span style={{ fontFamily:'monospace', fontSize:'0.7rem', color:C.muted, background:C.beige, padding:'0.1rem 0.5rem', borderRadius:6 }}>
                            {req.id?.substring(0,8).toUpperCase()}
                          </span>
                          {req.status === 'pending' && (
                            <span style={{ background:'#FEF3C7', color:'#92400E', fontSize:'0.63rem', fontWeight:700, padding:'0.1rem 0.45rem', borderRadius:100 }}>NOUVEAU</span>
                          )}
                        </div>
                        <div style={{ fontSize:'0.78rem', color:C.muted }}>
                          👤 {req.contact_name} · 📞 {req.contact_phone}
                          {req.contact_email && ' · ' + req.contact_email}
                        </div>
                        <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:2 }}>
                          📍 {req.city} · 📅 Il y a {days}j
                          {req.start_date && ' · Dépôt souhaité : ' + new Date(req.start_date).toLocaleDateString('fr-MA')}
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.7rem', flexWrap:'wrap' }}>
                        <span style={{ background:st.bg, color:st.color, padding:'0.3rem 0.9rem', borderRadius:100, fontSize:'0.8rem', fontWeight:700 }}>
                          {st.label}
                        </span>
                        <button onClick={() => setOpenId(isOpen ? null : req.id)}
                          style={{ background:C.beige, color:C.forest, border:'none', padding:'0.35rem 0.9rem', borderRadius:100, fontSize:'0.78rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                          {isOpen ? '▲ Réduire' : '▼ Détails'}
                        </button>
                      </div>
                    </div>

                    {/* Résumé rapide */}
                    <div style={{ padding:'0.6rem 1.5rem', background:C.cream, display:'flex', gap:'1.5rem', flexWrap:'wrap', fontSize:'0.78rem', color:C.muted, alignItems:'center' }}>
                      <span>📦 {Array.isArray(req.selected_product_ids) ? req.selected_product_ids.length : (req.selected_product_ids ? JSON.parse(req.selected_product_ids||'[]').length : '?')} article(s)</span>
                      <span>📐 ~{req.estimated_vol || '?'} m³</span>
                      <span>🚛 {req.delivery_mode === 'self' ? 'Dépôt direct' : req.delivery_mode === 'revex' ? 'Collecte REVEX' : 'Transporteur'}</span>
                      <span>📅 {req.storage_type === 'court' ? 'Court terme' : req.storage_type === 'long' ? 'Long terme' : 'Indéfini'}</span>
                      <div style={{ display:'flex', gap:'0.4rem' }}>
                        {req.want_photos    && <span title="Photos">📸</span>}
                        {req.want_certif    && <span title="Certification">📜</span>}
                        {req.want_inventory && <span title="Inventaire">📊</span>}
                        {req.want_picking   && <span title="Picking">📦</span>}
                      </div>
                      {req.estimated_revenue && (
                        <span style={{ marginLeft:'auto', color:C.eco, fontWeight:700, fontSize:'0.85rem' }}>
                          💰 ~{Number(req.estimated_revenue).toLocaleString('fr-MA')} MAD/mois
                        </span>
                      )}
                    </div>

                    {/* Détails dépliants */}
                    {isOpen && (
                      <div style={{ padding:'1.2rem 1.5rem', borderTop:'1px solid '+C.beige }}>

                        {/* Grille infos */}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.6rem', marginBottom:'1rem' }}>
                          {[
                            ['📧 Email', req.contact_email || '—'],
                            ['🏭 Entreprise', req.seller_company || req.company_name],
                            ['📍 Ville', req.city],
                            ['📅 Type stockage', req.storage_type === 'court' ? 'Court terme (1-3 mois)' : req.storage_type === 'long' ? 'Long terme (3-12 mois)' : 'Indéfini (jusqu\'à vente)'],
                            ['🚛 Mode livraison', req.delivery_mode === 'self' ? 'Dépôt direct' : req.delivery_mode === 'revex' ? 'Collecte REVEX' : 'Transporteur partenaire'],
                            ['📐 Volume estimé', (req.estimated_vol || '—') + ' m³'],
                          ].map(([k,v]) => (
                            <div key={k} style={{ background:C.beige, borderRadius:8, padding:'0.55rem 0.8rem' }}>
                              <div style={{ fontSize:'0.67rem', color:C.muted, marginBottom:2 }}>{k}</div>
                              <div style={{ fontSize:'0.82rem', fontWeight:600, color:C.forest }}>{v}</div>
                            </div>
                          ))}
                        </div>

                        {/* Articles non publiés */}
                        {req.custom_items && (
                          <div style={{ background:'#F6F1E7', border:'1px solid '+C.mid, borderRadius:8, padding:'0.7rem 1rem', marginBottom:'1rem', fontSize:'0.82rem', color:C.forest }}>
                            <strong>Articles supplémentaires :</strong> {req.custom_items}
                          </div>
                        )}

                        {/* Notes livraison */}
                        {req.delivery_notes && (
                          <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:8, padding:'0.6rem 1rem', marginBottom:'1rem', fontSize:'0.82rem', color:'#1D4ED8' }}>
                            📝 Instructions livraison : {req.delivery_notes}
                          </div>
                        )}

                        {/* Notes admin existantes */}
                        {req.admin_notes && (
                          <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:8, padding:'0.6rem 1rem', marginBottom:'1rem', fontSize:'0.82rem', color:'#92400E' }}>
                            💬 Note admin : {req.admin_notes}
                          </div>
                        )}

                        {/* Revenu estimé */}
                        <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', borderRadius:12, padding:'0.9rem 1.2rem', marginBottom:'1rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem' }}>
                          <div>
                            <div style={{ fontSize:'0.7rem', color:'rgba(246,241,231,0.55)' }}>Revenu mensuel estimé</div>
                            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:700, color:'#F6F1E7' }}>
                              {Number(req.estimated_revenue||0).toLocaleString('fr-MA')} MAD/mois
                            </div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontSize:'0.7rem', color:'rgba(246,241,231,0.55)' }}>Commission vente</div>
                            <div style={{ fontSize:'1.1rem', fontWeight:700, color:'#6EE7B7' }}>3%</div>
                          </div>
                        </div>

                        {/* ── ACTIONS PAR STATUT ── */}

                        {/* PENDING → Confirmer ou Refuser */}
                        {req.status === 'pending' && (
                          <div>
                            {rejectId === req.id ? (
                              <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:12, padding:'1rem', marginBottom:'0.7rem' }}>
                                <div style={{ fontSize:'0.8rem', fontWeight:700, color:C.urgent, marginBottom:'0.5rem' }}>Motif du refus (communiqué au vendeur) *</div>
                                <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={2}
                                  placeholder="Ex: Capacité entrepôt insuffisante, articles non conformes..."
                                  style={{ width:'100%', padding:'0.6rem', border:'1.5px solid #FECACA', borderRadius:10, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", resize:'vertical', boxSizing:'border-box', outline:'none', marginBottom:'0.6rem' }}/>
                                <div style={{ display:'flex', gap:'0.6rem' }}>
                                  <button onClick={() => statusMutation.mutate({ id:req.id, status:'rejected', adminNotes:rejectNote })}
                                    disabled={!rejectNote.trim() || isActing}
                                    style={{ background:C.urgent, color:'#fff', border:'none', padding:'0.6rem 1.3rem', borderRadius:100, fontWeight:700, fontSize:'0.85rem', cursor:!rejectNote.trim()||isActing?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", opacity:!rejectNote.trim()?0.5:1 }}>
                                    {isActing ? '⏳...' : '❌ Confirmer le refus'}
                                  </button>
                                  <button onClick={() => { setRejectId(null); setRejectNote(''); }}
                                    style={{ background:'transparent', color:C.muted, border:'1px solid '+C.mid, padding:'0.6rem 1rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display:'flex', gap:'0.7rem', flexWrap:'wrap' }}>
                                <button onClick={() => statusMutation.mutate({ id:req.id, status:'confirmed' })} disabled={isActing}
                                  style={{ background:C.eco, color:'#fff', border:'none', padding:'0.65rem 1.5rem', borderRadius:100, fontWeight:700, fontSize:'0.88rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", opacity:isActing?0.6:1 }}>
                                  {isActing ? '⏳...' : '✅ Confirmer la demande'}
                                </button>
                                <button onClick={() => setRejectId(req.id)}
                                  style={{ background:'#FEF2F2', color:C.urgent, border:'1px solid #FECACA', padding:'0.65rem 1.2rem', borderRadius:100, fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                                  ❌ Refuser
                                </button>
                                <button onClick={() => { window.open('tel:'+req.contact_phone); toast.info('Appel vers '+req.contact_phone); }}
                                  style={{ background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.65rem 1.2rem', borderRadius:100, fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                                  📞 Appeler le vendeur
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* CONFIRMED → Activer + Bon de dépôt */}
                        {req.status === 'confirmed' && (
                          <div style={{ display:'flex', gap:'0.7rem', flexWrap:'wrap' }}>
                            <button onClick={() => statusMutation.mutate({ id:req.id, status:'active' })} disabled={isActing}
                              style={{ background:C.forest, color:C.cream, border:'none', padding:'0.65rem 1.5rem', borderRadius:100, fontWeight:700, fontSize:'0.88rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", opacity:isActing?0.6:1 }}>
                              {isActing ? '⏳...' : '🟢 Stock reçu — Marquer actif'}
                            </button>
                            <button onClick={() => bonDepotMutation.mutate(req.id)} disabled={bonDepotMutation.isLoading}
                              style={{ background:'#EFF6FF', color:C.blue, border:'1px solid #BFDBFE', padding:'0.65rem 1.2rem', borderRadius:100, fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                              📄 Générer bon de dépôt
                            </button>
                          </div>
                        )}

                        {/* ACTIVE → Terminer + Facture + Inventaire */}
                        {req.status === 'active' && (
                          <div style={{ display:'flex', gap:'0.7rem', flexWrap:'wrap' }}>
                            <button onClick={() => statusMutation.mutate({ id:req.id, status:'completed' })} disabled={isActing}
                              style={{ background:'#8B5CF6', color:'#fff', border:'none', padding:'0.65rem 1.5rem', borderRadius:100, fontWeight:700, fontSize:'0.88rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", opacity:isActing?0.6:1 }}>
                              {isActing ? '⏳...' : '🔵 Stock sorti — Terminer'}
                            </button>
                            <button onClick={() => factureMutation.mutate(req.id)} disabled={factureMutation.isLoading}
                              style={{ background:'#ECFDF5', color:C.eco, border:'1px solid #A7F3D0', padding:'0.65rem 1.2rem', borderRadius:100, fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                              🧾 Émettre facture mensuelle
                            </button>
                            <button onClick={() => bonDepotMutation.mutate(req.id)} disabled={bonDepotMutation.isLoading}
                              style={{ background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.65rem 1.2rem', borderRadius:100, fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                              📄 Bon de dépôt
                            </button>
                          </div>
                        )}

                        {/* COMPLETED */}
                        {req.status === 'completed' && (
                          <div style={{ background:'#F3E8FF', border:'1px solid #DDD6FE', borderRadius:10, padding:'0.75rem 1rem', fontSize:'0.82rem', color:'#7C3AED' }}>
                            ✅ Prestation terminée · Stock sorti{req.completed_at ? ' le ' + new Date(req.completed_at).toLocaleDateString('fr-MA') : ''}
                          </div>
                        )}

                        {/* REJECTED */}
                        {req.status === 'rejected' && (
                          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'0.75rem 1rem', fontSize:'0.82rem', color:C.urgent }}>
                            ❌ Demande refusée{req.admin_notes ? ' — ' + req.admin_notes : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ SUB-TAB : ENTREPÔTS ══ */}
      {activeSubTab === 'entrepots' && (
        <div>
          {/* Header + bouton ajouter */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.2rem', flexWrap:'wrap', gap:'0.8rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.8rem' }}>
              <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', color:C.forest }}>
                📍 Entrepôts REVEX
              </h3>
              <button onClick={() => refetchWH()}
                style={{ background:'transparent', color:C.leaf, border:'1px solid '+C.mid, borderRadius:100, padding:'0.3rem 0.7rem', fontSize:'0.75rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                🔄
              </button>
            </div>
            <button onClick={() => {
                setWhForm({ name:'', city:'', address:'', capacity:200, used:0, status:'ouverture prévue', responsable:'', phone:'', surface:0, type:'Industriel', ouverture:'Lun-Sam 8h-17h', notes:'' });
                setWhModal('add');
              }}
              style={{ background:C.forest, color:C.cream, border:'none', padding:'0.6rem 1.3rem', borderRadius:100, fontSize:'0.82rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', gap:'0.5rem' }}>
              + Ajouter un entrepôt
            </button>
          </div>

          {/* Cartes entrepôts */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:'1rem' }}>
            {warehouses.map(wh => {
              const pct = wh.capacity > 0 ? Math.round((wh.used / wh.capacity) * 100) : 0;
              const bar = pct > 85 ? C.urgent : pct > 60 ? C.orange : C.eco;
              const isActif = wh.status === 'actif';
              return (
                <div key={wh.id} style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, overflow:'hidden', boxShadow:'0 2px 12px rgba(30,61,15,0.06)', transition:'box-shadow 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow='0 6px 24px rgba(30,61,15,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow='0 2px 12px rgba(30,61,15,0.06)'}>

                  {/* Header carte — cliquable */}
                  <Link to={'/admin/entrepot/'+wh.id}
                    style={{ display:'block', textDecoration:'none', background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', padding:'1rem 1.2rem', position:'relative', cursor:'pointer', transition:'opacity 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity='0.88'}
                    onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:'#F6F1E7', marginBottom:2 }}>
                          🏭 {wh.name}
                        </div>
                        <div style={{ fontSize:'0.72rem', color:'rgba(246,241,231,0.55)' }}>
                          📍 {wh.city} · {wh.id} · {wh.type}
                        </div>
                        <div style={{ fontSize:'0.65rem', color:'rgba(126,168,106,0.7)', marginTop:3 }}>
                          👆 Cliquer pour gérer l'entrepôt
                        </div>
                      </div>
                      <span style={{ background:isActif?'rgba(39,174,96,0.3)':'rgba(230,126,34,0.3)', color:isActif?'#6EE7B7':'#FCD34D', fontSize:'0.68rem', fontWeight:700, padding:'0.18rem 0.65rem', borderRadius:100, flexShrink:0 }}>
                        {wh.status.toUpperCase()}
                      </span>
                    </div>
                  </Link>

                  {/* Corps */}
                  <div style={{ padding:'1rem 1.2rem' }}>
                    {/* Capacité */}
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.4rem', fontSize:'0.82rem' }}>
                      <span style={{ color:C.muted }}>Capacité utilisée</span>
                      <span style={{ fontWeight:700, color:bar }}>{wh.used} / {wh.capacity} m³ ({pct}%)</span>
                    </div>
                    <div style={{ background:C.beige, borderRadius:100, height:8, overflow:'hidden', marginBottom:'0.85rem' }}>
                      <div style={{ width:pct+'%', height:'100%', background:bar, borderRadius:100, transition:'width 0.5s ease' }}/>
                    </div>

                    {/* Stats */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.4rem', marginBottom:'0.85rem' }}>
                      {[['Libre',(wh.capacity-wh.used)+' m³',C.eco],['Occupé',wh.used+' m³',C.orange],['Surface',wh.surface+' m²',C.forest]].map(([l,v,c]) => (
                        <div key={l} style={{ background:C.cream, borderRadius:8, padding:'0.4rem', textAlign:'center' }}>
                          <div style={{ fontSize:'0.62rem', color:C.muted }}>{l}</div>
                          <div style={{ fontSize:'0.8rem', fontWeight:700, color:c }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Infos responsable */}
                    <div style={{ fontSize:'0.75rem', color:C.muted, marginBottom:'0.85rem', lineHeight:1.6 }}>
                      {wh.responsable !== '—' && <div>👤 {wh.responsable} · 📞 {wh.phone}</div>}
                      <div>🕐 {wh.ouverture}</div>
                      {wh.notes && <div style={{ color:C.forest, fontStyle:'italic' }}>ℹ️ {wh.notes}</div>}
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                      <button onClick={() => { setWhForm({ ...wh }); setWhModal(wh); }}
                        style={{ flex:1, background:C.beige, color:C.forest, border:'none', padding:'0.42rem 0.7rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                        ✏️ Modifier
                      </button>
                      <button onClick={() => {
                          const newUsed = prompt('Volume occupé actuel (m³) :', wh.used);
                          if (newUsed !== null && !isNaN(newUsed)) {
                            updateVolumeWHMutation.mutate({ id: wh.id, used: Math.min(Number(newUsed), Number(wh.capacity)) });
                          }
                        }} disabled={updateVolumeWHMutation.isLoading}
                        style={{ background:'#EFF6FF', color:C.blue, border:'1px solid #BFDBFE', padding:'0.42rem 0.7rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                        📊 Volume
                      </button>
                      <button onClick={() => {
                          const next = wh.status === 'actif' ? 'inactif' : wh.status === 'inactif' ? 'maintenance' : 'actif';
                          updateStatusWHMutation.mutate({ id: wh.id, status: next });
                        }}
                        style={{ background: isActif?'#FEF5E7':'#ECFDF5', color:isActif?C.orange:C.eco, border:'1px solid '+(isActif?'#FDE68A':'#A7F3D0'), padding:'0.42rem 0.7rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                        {isActif ? '⏸️ Suspendre' : '▶️ Activer'}
                      </button>
                      <button onClick={() => {
                          if (window.confirm('Supprimer l\'entrepôt ' + wh.name + ' ?')) {
                            deleteWHMutation.mutate(wh.id);
                          }
                        }}
                        style={{ background:'#FEF2F2', color:C.urgent, border:'1px solid #FECACA', padding:'0.42rem 0.7rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer' }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Carte ajout rapide */}
            <div onClick={() => {
                setWhForm({ name:'', city:'', address:'', capacity:200, used:0, status:'ouverture prévue', responsable:'', phone:'', surface:0, type:'Industriel', ouverture:'Lun-Sam 8h-17h', notes:'' });
                setWhModal('add');
              }}
              style={{ background:C.cream, border:'2px dashed '+C.mid, borderRadius:18, padding:'2rem', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'0.7rem', cursor:'pointer', minHeight:200, transition:'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=C.leaf; e.currentTarget.style.background=C.beige; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=C.mid; e.currentTarget.style.background=C.cream; }}>
              <div style={{ width:48, height:48, borderRadius:'50%', background:C.beige, border:'2px solid '+C.mid, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem' }}>+</div>
              <div style={{ fontWeight:600, fontSize:'0.88rem', color:C.muted }}>Ajouter un entrepôt</div>
              <div style={{ fontSize:'0.75rem', color:C.muted, textAlign:'center' }}>Casablanca · El Jadida · Kénitra · Tanger...</div>
            </div>
          </div>

          {/* Barre résumé globale */}
          <div style={{ marginTop:'1.2rem', background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', borderRadius:14, padding:'1rem 1.5rem', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem' }}>
            {[
              ['Entrepôts actifs', warehouses.filter(w=>w.status==='actif').length + ' / ' + warehouses.length, '#F6F1E7'],
              ['Capacité totale',  warehouses.reduce((s,w)=>s+w.capacity,0)+' m³', '#93C5FD'],
              ['Volume stocké',    warehouses.reduce((s,w)=>s+w.used,0)+' m³', '#FCD34D'],
              ['Taux occupation',  warehouses.reduce((s,w)=>s+w.capacity,0)>0 ? Math.round(warehouses.reduce((s,w)=>s+w.used,0)/warehouses.reduce((s,w)=>s+w.capacity,0)*100)+'%' : '0%', '#6EE7B7'],
            ].map(([l,v,c]) => (
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.8rem', fontWeight:700, color:c }}>{v}</div>
                <div style={{ fontSize:'0.72rem', color:'rgba(246,241,231,0.5)', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* ── MODAL AJOUT / ÉDITION ENTREPÔT ── */}
          {whModal && (
            <div onClick={() => setWhModal(null)}
              style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', overflowY:'auto' }}>
              <div onClick={e => e.stopPropagation()}
                style={{ background:'#F6F1E7', borderRadius:24, maxWidth:560, width:'100%', overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,0.22)', margin:'auto', maxHeight:'95vh', display:'flex', flexDirection:'column' }}>

                {/* Header modal */}
                <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', padding:'1.3rem 1.8rem', flexShrink:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.25rem', fontWeight:700, color:'#F6F1E7' }}>
                        {whModal === 'add' ? '+ Nouvel entrepôt' : '✏️ Modifier — ' + whForm.name}
                      </div>
                      <div style={{ fontSize:'0.72rem', color:'rgba(246,241,231,0.55)', marginTop:2 }}>
                        Entrepôts industriels REVEX · Réseau national
                      </div>
                    </div>
                    <button onClick={() => setWhModal(null)}
                      style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', color:'#F6F1E7', fontSize:'0.85rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      ✕
                    </button>
                  </div>
                </div>

                {/* Formulaire */}
                <div style={{ overflowY:'auto', flex:1, padding:'1.5rem 1.8rem' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.85rem' }}>

                    {[
                      { key:'name',        label:'Nom de l\'entrepôt *',     placeholder:'Entrepôt Ain Sebaâ',       full:true  },
                      { key:'city',        label:'Ville *',                  placeholder:'Casablanca'                            },
                      { key:'address',     label:'Adresse complète',         placeholder:'Zone Industrielle...',     full:true  },
                      { key:'responsable', label:'Responsable',              placeholder:'Prénom Nom'                            },
                      { key:'phone',       label:'Téléphone',                placeholder:'+212 6XX XXX XXX'                      },
                      { key:'ouverture',   label:'Horaires d\'ouverture',    placeholder:'Lun-Sam 8h-17h'                        },
                    ].map(f => (
                      <div key={f.key} style={{ gridColumn: f.full ? '1 / -1' : 'auto' }}>
                        <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#1E3D0F', display:'block', marginBottom:'0.3rem' }}>{f.label}</label>
                        <input value={whForm[f.key]||''} onChange={e => setWhForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                          style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid #D9CEBC', borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:'#FDFAF4', boxSizing:'border-box' }}/>
                      </div>
                    ))}

                    {/* Type */}
                    <div>
                      <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#1E3D0F', display:'block', marginBottom:'0.3rem' }}>Type</label>
                      <select value={whForm.type||'Industriel'} onChange={e => setWhForm(p => ({ ...p, type: e.target.value }))}
                        style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid #D9CEBC', borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:'#FDFAF4' }}>
                        {['Industriel','Polyvalent','Frigorifique','Sécurisé','Extérieur'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>

                    {/* Statut */}
                    <div>
                      <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#1E3D0F', display:'block', marginBottom:'0.3rem' }}>Statut</label>
                      <select value={whForm.status||'actif'} onChange={e => setWhForm(p => ({ ...p, status: e.target.value }))}
                        style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid #D9CEBC', borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:'#FDFAF4' }}>
                        {['actif','inactif','maintenance','ouverture prévue'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Capacité */}
                    <div>
                      <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#1E3D0F', display:'block', marginBottom:'0.3rem' }}>Capacité (m³) *</label>
                      <input type="number" value={whForm.capacity||''} onChange={e => setWhForm(p => ({ ...p, capacity: Number(e.target.value) }))} placeholder="500"
                        style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid #D9CEBC', borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:'#FDFAF4', boxSizing:'border-box' }}/>
                    </div>

                    {/* Surface */}
                    <div>
                      <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#1E3D0F', display:'block', marginBottom:'0.3rem' }}>Surface (m²)</label>
                      <input type="number" value={whForm.surface||''} onChange={e => setWhForm(p => ({ ...p, surface: Number(e.target.value) }))} placeholder="800"
                        style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid #D9CEBC', borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:'#FDFAF4', boxSizing:'border-box' }}/>
                    </div>

                    {/* Volume occupé */}
                    <div>
                      <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#1E3D0F', display:'block', marginBottom:'0.3rem' }}>Volume occupé actuel (m³)</label>
                      <input type="number" value={whForm.used||0} onChange={e => setWhForm(p => ({ ...p, used: Math.min(Number(e.target.value), p.capacity||9999) }))} placeholder="0"
                        style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid #D9CEBC', borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:'#FDFAF4', boxSizing:'border-box' }}/>
                    </div>

                    {/* Notes */}
                    <div style={{ gridColumn:'1 / -1' }}>
                      <label style={{ fontSize:'0.75rem', fontWeight:600, color:'#1E3D0F', display:'block', marginBottom:'0.3rem' }}>Notes & équipements</label>
                      <textarea value={whForm.notes||''} onChange={e => setWhForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                        placeholder="Ex: Pont roulant 5T · Rampe de chargement · Accès camions 40T..."
                        style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid #D9CEBC', borderRadius:10, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none', resize:'vertical', background:'#FDFAF4', boxSizing:'border-box' }}/>
                    </div>
                  </div>

                  {/* Preview capacité */}
                  {whForm.capacity > 0 && (
                    <div style={{ marginTop:'1rem', background:'#fff', border:'1px solid #D9CEBC', borderRadius:12, padding:'0.9rem 1rem' }}>
                      <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#1E3D0F', marginBottom:'0.5rem' }}>📊 Prévisualisation capacité</div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', color:'#5C5C50', marginBottom:'0.3rem' }}>
                        <span>{whForm.used||0} m³ occupés</span>
                        <span style={{ fontWeight:700, color: Math.round(((whForm.used||0)/whForm.capacity)*100) > 80 ? '#C0392B' : '#27AE60' }}>
                          {Math.round(((whForm.used||0)/whForm.capacity)*100)}%
                        </span>
                      </div>
                      <div style={{ background:'#EDE6D3', borderRadius:100, height:8, overflow:'hidden' }}>
                        <div style={{ width:Math.min(100, Math.round(((whForm.used||0)/whForm.capacity)*100))+'%', height:'100%', background: Math.round(((whForm.used||0)/whForm.capacity)*100) > 80 ? '#C0392B' : '#27AE60', borderRadius:100 }}/>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer modal */}
                <div style={{ padding:'1rem 1.8rem', borderTop:'1px solid #D9CEBC', display:'flex', gap:'0.7rem', justifyContent:'flex-end', flexShrink:0, background:'#fff' }}>
                  <button onClick={() => setWhModal(null)}
                    style={{ background:'transparent', color:'#5C5C50', border:'1.5px solid #D9CEBC', padding:'0.7rem 1.4rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    Annuler
                  </button>
                  <button onClick={() => {
                      if (!whForm.name || !whForm.city || !whForm.capacity) { toast.error('Nom, ville et capacité obligatoires'); return; }
                      if (whModal === 'add') {
                        createWHMutation.mutate(whForm);
                      } else {
                        updateWHMutation.mutate({ id: whModal.id, data: whForm });
                      }
                    }}
                    style={{ background:'#1E3D0F', color:'#F6F1E7', border:'none', padding:'0.7rem 1.8rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    {whModal === 'add' ? '+ Créer l\'entrepôt' : '💾 Sauvegarder'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ SUB-TAB : TARIFS & RÈGLES ══ */}
      {activeSubTab === 'tarifs' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
            <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, overflow:'hidden' }}>
              <div style={{ background:C.forest, padding:'0.9rem 1.2rem' }}>
                <div style={{ fontWeight:700, fontSize:'0.9rem', color:C.cream }}>💰 Grille Tarifaire</div>
              </div>
              <div style={{ padding:'1.2rem' }}>
                {[
                  {key:'tarifBase',          label:'Stockage (MAD/m³/mois)', icon:'🏭'},
                  {key:'tarifReception',     label:'Réception & inventaire (MAD)', icon:'📥'},
                  {key:'tarifPhotos',        label:'Photos professionnelles (MAD)', icon:'📸'},
                  {key:'tarifCertif',        label:'Certification REVEX (MAD)', icon:'📜'},
                  {key:'tarifInventaire',    label:'Inventaire numérique (MAD)', icon:'📊'},
                  {key:'tarifPicking',       label:'Préparation commande (MAD/exp.)', icon:'📦'},
                  {key:'commissionStockage', label:'Commission vente stockage (%)', icon:'💸'},
                ].map(f => (
                  <div key={f.key} style={{ display:'flex', alignItems:'center', gap:'0.7rem', marginBottom:'0.7rem' }}>
                    <span style={{ fontSize:'1rem', width:22, flexShrink:0 }}>{f.icon}</span>
                    <label style={{ flex:1, fontSize:'0.8rem', color:C.muted }}>{f.label}</label>
                    <input type="number" value={settings[f.key]} onChange={e => setg(f.key, Number(e.target.value))}
                      style={{ width:80, padding:'0.4rem 0.6rem', border:'1.5px solid '+C.mid, borderRadius:8, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', textAlign:'right' }}/>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, overflow:'hidden' }}>
                <div style={{ background:C.leaf, padding:'0.9rem 1.2rem' }}>
                  <div style={{ fontWeight:700, fontSize:'0.9rem', color:'#fff' }}>⚙️ Paramètres</div>
                </div>
                <div style={{ padding:'1.2rem' }}>
                  {[
                    {key:'delaiReponse', label:'Délai réponse (heures)', icon:'⏱️'},
                    {key:'alerteSeuil',  label:'Alerte occupation (%)',  icon:'🔔'},
                  ].map(f => (
                    <div key={f.key} style={{ display:'flex', alignItems:'center', gap:'0.7rem', marginBottom:'0.7rem' }}>
                      <span style={{ fontSize:'1rem' }}>{f.icon}</span>
                      <label style={{ flex:1, fontSize:'0.8rem', color:C.muted }}>{f.label}</label>
                      <input type="number" value={settings[f.key]} onChange={e => setg(f.key, Number(e.target.value))}
                        style={{ width:80, padding:'0.4rem 0.6rem', border:'1.5px solid '+C.mid, borderRadius:8, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', textAlign:'right' }}/>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, overflow:'hidden' }}>
                <div style={{ background:C.blue, padding:'0.9rem 1.2rem' }}>
                  <div style={{ fontWeight:700, fontSize:'0.9rem', color:'#fff' }}>📋 Conditions de stockage</div>
                </div>
                <div style={{ padding:'1.2rem' }}>
                  <textarea value={settings.conditionsGenerales} onChange={e => setg('conditionsGenerales', e.target.value)} rows={5}
                    style={{ width:'100%', padding:'0.65rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.8rem', fontFamily:"'DM Sans',sans-serif", outline:'none', resize:'vertical', boxSizing:'border-box' }}/>
                </div>
              </div>

              <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, overflow:'hidden' }}>
                <div style={{ background:C.orange, padding:'0.9rem 1.2rem' }}>
                  <div style={{ fontWeight:700, fontSize:'0.9rem', color:'#fff' }}>📦 Types acceptés</div>
                </div>
                <div style={{ padding:'1rem 1.2rem' }}>
                  {['PDR mécaniques (pompes, vannes, moteurs)','Équipements électriques & électroniques','Outillage industriel','Pièces pneumatiques & hydrauliques','Consommables industriels'].map((item,i,arr) => (
                    <div key={item} style={{ display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.35rem 0', borderBottom:i<arr.length-1?'1px solid '+C.beige:'none', fontSize:'0.82rem', color:C.forest }}>
                      <span style={{ color:C.eco }}>✓</span>{item}
                    </div>
                  ))}
                  <div style={{ marginTop:'0.6rem', fontSize:'0.75rem', color:C.urgent, fontWeight:600 }}>
                    ❌ Exclus : matières dangereuses, articles {'>'} 2m, produits périssables
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop:'1.5rem', display:'flex', justifyContent:'flex-end' }}>
            <button onClick={() => toast.success('✅ Paramètres de stockage sauvegardés !')}
              style={{ background:C.forest, color:C.cream, border:'none', padding:'0.8rem 2rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              💾 Sauvegarder les paramètres
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HTML Bon de dépôt ─────────────────────────────────────────
function buildBonDepotHtml(data) {
  const { bonNumber, date, request: r } = data;
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Bon de Dépôt ' + bonNumber + '</title>' +
    '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;background:#f0ece3;padding:24px;display:flex;flex-direction:column;align-items:center}' +
    '.doc{background:#fff;width:210mm;max-width:750px;border-radius:8px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.15)}' +
    '.hdr{background:linear-gradient(135deg,#1E3D0F,#2D5A1B);padding:24px 36px}' +
    '.logo{font-size:28px;font-weight:700;color:#F6F1E7;letter-spacing:3px;margin-bottom:6px}' +
    '.h1{font-size:16px;color:#F6F1E7;margin-bottom:2px}.sub{font-size:10px;color:rgba(246,241,231,0.5);font-family:Calibri,sans-serif}' +
    '.body{padding:24px 36px}.num{font-family:Consolas,monospace;font-size:13px;font-weight:700;color:#1E3D0F;letter-spacing:2px}' +
    '.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0}' +
    '.cell{background:#F6F1E7;border-radius:8px;padding:10px 12px;border:1px solid #EDE6D3}' +
    '.lbl{font-size:8px;color:#8C8C7A;text-transform:uppercase;letter-spacing:0.8px;font-family:Calibri,sans-serif;margin-bottom:2px}' +
    '.val{font-size:12px;font-weight:600;color:#1E3D0F}' +
    '.sig{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:20px;padding-top:16px;border-top:1px solid #EDE6D3}' +
    '.sline{border-bottom:1.5px solid #1E3D0F;width:80%;margin:24px 0 4px}.slabel{font-size:9px;color:#8C8C7A;font-family:Calibri,sans-serif}' +
    '.ftr{background:#1E3D0F;padding:10px 36px;display:flex;justify-content:space-between;align-items:center}' +
    '.ftr-t{font-size:9px;color:rgba(246,241,231,0.55);font-family:Calibri,sans-serif}.ftr-l{font-size:12px;font-weight:700;color:rgba(246,241,231,0.8);letter-spacing:3px}' +
    '.print-btn{margin-top:16px;padding:10px 28px;background:#1E3D0F;color:#F6F1E7;border:none;border-radius:100px;font-size:12px;font-weight:600;cursor:pointer;font-family:Calibri,sans-serif}' +
    '@media print{body{background:#fff;padding:0}.doc{box-shadow:none;border-radius:0}.print-btn{display:none}}</style></head><body>' +
    '<div class="doc"><div class="hdr"><div class="logo">REVEX</div><div class="h1">BON DE DÉPÔT ENTREPÔT</div><div class="sub">Marketplace B2B PDR Certifiée · Maroc · revex.ma</div></div>' +
    '<div class="body">' +
    '<div style="background:#F6F1E7;border:1px solid #D9CEBC;border-radius:8px;padding:11px 16px;display:flex;justify-content:space-between;margin-bottom:20px">' +
    '<div><div style="font-size:9px;color:#8C8C7A;text-transform:uppercase;letter-spacing:1px;font-family:Calibri,sans-serif;margin-bottom:2px">Numéro de Bon</div><div class="num">' + bonNumber + '</div></div>' +
    '<div style="font-size:10px;color:#8C8C7A;font-family:Calibri,sans-serif;text-align:right">Émis le<br/><strong>' + date + '</strong></div></div>' +
    '<div class="grid">' +
    '<div class="cell"><div class="lbl">Entreprise</div><div class="val">' + (r.seller_company||r.company_name||'—') + '</div></div>' +
    '<div class="cell"><div class="lbl">Contact</div><div class="val">' + (r.contact_name||'—') + '</div></div>' +
    '<div class="cell"><div class="lbl">Téléphone</div><div class="val">' + (r.contact_phone||'—') + '</div></div>' +
    '<div class="cell"><div class="lbl">Ville d\'origine</div><div class="val">' + (r.city||'—') + '</div></div>' +
    '<div class="cell"><div class="lbl">Volume estimé</div><div class="val">' + (r.estimated_vol||'—') + ' m³</div></div>' +
    '<div class="cell"><div class="lbl">Mode livraison</div><div class="val">' + (r.delivery_mode==='self'?'Dépôt direct':r.delivery_mode==='revex'?'Collecte REVEX':'Transporteur') + '</div></div>' +
    '</div>' +
    '<div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:11px;color:#065F46;font-family:Calibri,sans-serif">' +
    '✓ Articles reçus, comptés et enregistrés dans le système REVEX · Grade attribué après inspection' +
    '</div>' +
    '<div class="sig"><div><div style="font-size:10px;font-weight:700;color:#1E3D0F;font-family:Calibri,sans-serif">Signature du déposant</div><div style="font-size:10px;color:#5C5C50;font-family:Calibri,sans-serif;margin-top:4px">' + (r.seller_company||'—') + '</div><div class="sline"></div><div class="slabel">Signature et cachet</div></div>' +
    '<div><div style="font-size:10px;font-weight:700;color:#1E3D0F;font-family:Calibri,sans-serif">Signature REVEX</div><div style="font-size:10px;color:#5C5C50;font-family:Calibri,sans-serif;margin-top:4px">Roamers Community SARL</div><div class="sline"></div><div class="slabel">Responsable entrepôt</div></div></div>' +
    '</div><div class="ftr"><div class="ftr-t">Bon ' + bonNumber + ' · REVEX · revex.ma · Conservation 5 ans</div><div class="ftr-l">REVEX</div></div></div>' +
    '<button class="print-btn" onclick="window.print()">🖨️ Imprimer / PDF</button>' +
    '</body></html>';
}

// ── Composant Expéditions REVEX ───────────────────────────────
// Gère les commandes dont l'article est stocké dans un entrepôt REVEX
function ExpeditionsREVEX() {
  const C = {
    forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
    cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
    white:'#FDFAF4', muted:'#5C5C50',
    eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
  };
  const qc = useQueryClient();
  const [search, setSearch]       = React.useState('');
  const [filterStatus, setFilter] = React.useState('confirmed');
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const [trackingNum,   setTrackingNum]   = React.useState('');

  // Charger toutes les commandes confirmées/expédiées
  const { data: ordersData, isLoading, refetch } = useQuery(
    ['admin-revex-expeditions', filterStatus],
    () => api.get('/admin/orders?status=' + filterStatus + '&revex_stored=true').then(r => r.data)
          .catch(() => api.get('/admin/orders').then(r => r.data)),
    { staleTime: 15000, keepPreviousData: true }
  );
  const allOrders = ordersData?.orders || [];

  // Vérifier lesquelles sont en entrepôt REVEX
  const [revexOrders, setRevexOrders] = React.useState([]);
  const [checking, setChecking]       = React.useState(false);

  React.useEffect(() => {
    if (!allOrders.length) return;
    setChecking(true);
    const toCheck = allOrders.filter(o => ['confirmed','shipped'].includes(o.status) && o.product_id);
    Promise.all(
      toCheck.map(o =>
        api.get('/warehouses/check-product/' + o.product_id)
          .then(r => r.data?.warehouse ? { ...o, warehouse: r.data.warehouse, warehouseArticle: r.data.article } : null)
          .catch(() => null)
      )
    ).then(results => {
      setRevexOrders(results.filter(Boolean));
      setChecking(false);
    });
  }, [allOrders.length, filterStatus]);

  const filtered = revexOrders.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return o.order_number?.toLowerCase().includes(s) ||
           o.product_title?.toLowerCase().includes(s) ||
           o.buyer_company?.toLowerCase().includes(s);
  });

  // Mutation expédition
  const shipMutation = useMutation(
    ({ orderId, trackingRef }) =>
      api.put('/orders/' + orderId + '/status', { status: 'shipped', tracking_ref: trackingRef }),
    {
      onSuccess: () => {
        qc.invalidateQueries(['admin-revex-expeditions']);
        toast.success('🚛 Commande marquée comme expédiée depuis l\'entrepôt REVEX !');
        setSelectedOrder(null);
        setTrackingNum('');
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur expédition'),
    }
  );

  const fmt = n => Number(n||0).toLocaleString('fr-MA');

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', color:C.forest, marginBottom:'0.2rem' }}>
            🚛 Expéditions REVEX
          </h2>
          <p style={{ fontSize:'0.82rem', color:C.muted }}>
            Commandes dont l'article est stocké dans un entrepôt REVEX — vous gérez l'expédition à la place du vendeur
          </p>
        </div>
        <button onClick={() => refetch()}
          style={{ background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.5rem 1.1rem', borderRadius:100, fontSize:'0.8rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          🔄 Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.8rem', marginBottom:'1.5rem' }}>
        {[
          { icon:'⏳', label:'À expédier',      value:revexOrders.filter(o=>o.status==='confirmed').length, color:C.orange },
          { icon:'🚛', label:'Expédiées',        value:revexOrders.filter(o=>o.status==='shipped').length,  color:C.blue   },
          { icon:'🏢', label:'Entrepôts actifs', value:[...new Set(revexOrders.map(o=>o.warehouse?.id))].filter(Boolean).length, color:C.eco },
          { icon:'💰', label:'Valeur totale',    value:fmt(revexOrders.reduce((s,o)=>s+Number(o.final_price||0),0))+' MAD', color:'#8B5CF6' },
        ].map(k => (
          <div key={k.label} style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:14, padding:'1rem', textAlign:'center' }}>
            <div style={{ fontSize:'1.3rem', marginBottom:'0.3rem' }}>{k.icon}</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', fontWeight:700, color:k.color, lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:'0.68rem', color:C.muted, marginTop:'0.25rem' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display:'flex', gap:'0.7rem', marginBottom:'1.2rem', flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 N° commande, produit, acheteur..."
          style={{ flex:1, minWidth:200, padding:'0.5rem 1rem', border:'1.5px solid '+C.mid, borderRadius:100, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream }}/>
        <div style={{ display:'flex', gap:'0.4rem' }}>
          {[['confirmed','⏳ À expédier'],['shipped','🚛 Expédiées'],['','Toutes']].map(([s,l]) => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ background:filterStatus===s?C.forest:C.white, color:filterStatus===s?C.cream:C.muted, border:'1px solid '+(filterStatus===s?C.forest:C.mid), padding:'0.45rem 1rem', borderRadius:100, fontSize:'0.8rem', cursor:'pointer', fontWeight:filterStatus===s?700:400, fontFamily:"'DM Sans',sans-serif" }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Bannieres info */}
      <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:14, padding:'0.9rem 1.2rem', marginBottom:'1.2rem', display:'flex', gap:'0.7rem', alignItems:'flex-start', fontSize:'0.82rem', color:'#1D4ED8' }}>
        <span style={{ fontSize:'1.1rem', flexShrink:0 }}>ℹ️</span>
        <div>
          <strong>Rôle REVEX :</strong> Ces commandes ont été passées sur des articles stockés dans vos entrepôts.
          Le vendeur a été notifié que vous prenez en charge l'expédition.
          Une fois l'article expédié, cliquez "Marquer comme expédiée" pour notifier l'acheteur et déclencher le suivi.
        </div>
      </div>

      {/* Loading */}
      {(isLoading || checking) && (
        <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}>
          <div style={{ fontSize:'1.5rem', marginBottom:'0.5rem', opacity:0.4 }}>🔍</div>
          Vérification des entrepôts en cours...
        </div>
      )}

      {/* Vide */}
      {!isLoading && !checking && filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'4rem', background:C.white, borderRadius:18, border:'1px solid '+C.mid, color:C.muted }}>
          <div style={{ fontSize:'3rem', marginBottom:'0.5rem', opacity:0.2 }}>📭</div>
          <div style={{ fontWeight:600, marginBottom:'0.3rem' }}>Aucune expédition REVEX en cours</div>
          <div style={{ fontSize:'0.82rem' }}>Les commandes sur articles stockés chez REVEX apparaîtront ici.</div>
        </div>
      )}

      {/* Liste */}
      {!isLoading && !checking && filtered.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {filtered.map(order => {
            const isConfirmed = order.status === 'confirmed';
            const isOpen = selectedOrder?.id === order.id;

            return (
              <div key={order.id} style={{ background:C.white, border:'2px solid '+(isConfirmed?C.orange:C.mid), borderRadius:18, overflow:'hidden', boxShadow:'0 2px 10px rgba(30,61,15,0.06)' }}>

                {/* Header */}
                <div style={{ padding:'1rem 1.5rem', background:isConfirmed?'#FFFBEB':C.cream, borderBottom:'1px solid '+C.beige, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:3 }}>
                      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', fontWeight:700, color:C.forest }}>
                        {order.order_number}
                      </span>
                      {isConfirmed && (
                        <span style={{ background:'#FEF3C7', color:'#92400E', fontSize:'0.65rem', fontWeight:700, padding:'0.1rem 0.5rem', borderRadius:100 }}>
                          À EXPÉDIER
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:'0.78rem', color:C.muted }}>
                      🛒 {order.buyer_company} · 📅 {new Date(order.created_at).toLocaleDateString('fr-MA')}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.7rem' }}>
                    <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:C.leaf }}>
                      {fmt(order.final_price)} MAD
                    </span>
                    <button onClick={() => setSelectedOrder(isOpen ? null : order)}
                      style={{ background:C.beige, color:C.forest, border:'none', padding:'0.35rem 0.9rem', borderRadius:100, fontSize:'0.78rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                      {isOpen ? '▲ Réduire' : '▼ Détails'}
                    </button>
                  </div>
                </div>

                {/* Résumé rapide */}
                <div style={{ padding:'0.65rem 1.5rem', display:'flex', gap:'1.5rem', flexWrap:'wrap', fontSize:'0.78rem', color:C.muted, alignItems:'center' }}>
                  <span>📦 {order.product_title?.substring(0,35)}</span>
                  <span>🏭 Vendeur : {order.seller_company}</span>
                  <span style={{ color:C.blue, fontWeight:600 }}>🏢 {order.warehouse?.name} · {order.warehouse?.city}</span>
                  <span>📐 Zone : {order.warehouseArticle?.zone || '—'} / {order.warehouseArticle?.shelf || '—'}</span>
                </div>

                {/* Détails */}
                {isOpen && (
                  <div style={{ padding:'1.2rem 1.5rem', borderTop:'1px solid '+C.beige }}>

                    {/* Grid infos */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.6rem', marginBottom:'1rem' }}>
                      {[
                        ['📦 Produit',          order.product_title?.substring(0,35)],
                        ['📏 Référence',         order.reference || '—'],
                        ['⭐ Grade',             'Grade '+(order.quality_grade||'—')],
                        ['📊 Quantité',          (order.quantity||1)+' '+(order.unit||'u.')],
                        ['🚛 Mode livraison',    order.delivery_type==='eco'?'🌿 Retour à vide':'⚡ Urgente'],
                        ['💰 Prix total',        fmt(order.final_price)+' MAD'],
                      ].map(([k,v]) => (
                        <div key={k} style={{ background:C.beige, borderRadius:8, padding:'0.55rem 0.8rem' }}>
                          <div style={{ fontSize:'0.67rem', color:C.muted, marginBottom:2 }}>{k}</div>
                          <div style={{ fontSize:'0.82rem', fontWeight:600, color:C.forest }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Info entrepôt */}
                    <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', borderRadius:14, padding:'1rem 1.2rem', marginBottom:'1rem', display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'0.6rem' }}>
                      {[
                        ['🏢 Entrepôt',   order.warehouse?.name,  '#F6F1E7'],
                        ['📍 Ville',      order.warehouse?.city,  'rgba(246,241,231,0.7)'],
                        ['📌 Zone',       (order.warehouseArticle?.zone||'—')+' / '+(order.warehouseArticle?.shelf||'—'), '#FCD34D'],
                        ['👤 Responsable',order.warehouse?.responsable||'—', '#6EE7B7'],
                      ].map(([l,v,c]) => (
                        <div key={l}>
                          <div style={{ fontSize:'0.65rem', color:'rgba(246,241,231,0.45)', marginBottom:2 }}>{l}</div>
                          <div style={{ fontSize:'0.82rem', fontWeight:600, color:c }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Acheteur */}
                    <div style={{ background:C.beige, borderRadius:10, padding:'0.7rem 0.9rem', marginBottom:'1rem', display:'flex', gap:'1.5rem', fontSize:'0.8rem', flexWrap:'wrap' }}>
                      <span style={{ color:C.muted }}>🛒 Acheteur :</span>
                      <span style={{ fontWeight:600, color:C.forest }}>{order.buyer_company}</span>
                      <span style={{ color:C.muted }}>📍 {order.buyer_city||'—'}</span>
                      {order.buyer_phone && <span style={{ color:C.muted }}>📞 {order.buyer_phone}</span>}
                    </div>

                    {/* ACTION EXPÉDITION */}
                    {isConfirmed && (
                      <div style={{ background:'#F0FDF4', border:'1.5px solid #A7F3D0', borderRadius:14, padding:'1rem 1.2rem' }}>
                        <div style={{ fontWeight:700, fontSize:'0.9rem', color:'#065F46', marginBottom:'0.7rem' }}>
                          🚛 Expédier depuis l'entrepôt {order.warehouse?.name}
                        </div>
                        <div style={{ display:'flex', gap:'0.7rem', alignItems:'flex-end', flexWrap:'wrap' }}>
                          <div style={{ flex:1, minWidth:200 }}>
                            <label style={{ fontSize:'0.72rem', color:'#047857', display:'block', marginBottom:'0.3rem' }}>
                              N° de suivi (optionnel)
                            </label>
                            <input
                              value={trackingNum}
                              onChange={e => setTrackingNum(e.target.value)}
                              placeholder="Ex: REVEX-TRK-2025-0001"
                              style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid #A7F3D0', borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' }}
                            />
                          </div>
                          <button
                            onClick={() => {
                              if (window.confirm('Confirmer l\'expédition de la commande '+order.order_number+' depuis '+order.warehouse?.name+' ?')) {
                                shipMutation.mutate({ orderId: order.id, trackingRef: trackingNum });
                              }
                            }}
                            disabled={shipMutation.isLoading}
                            style={{ background:C.eco, color:'#fff', border:'none', padding:'0.7rem 1.5rem', borderRadius:100, fontWeight:700, fontSize:'0.88rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap' }}>
                            {shipMutation.isLoading ? '⏳...' : '🚛 Marquer comme expédiée'}
                          </button>
                          <a href={'tel:'+order.warehouse?.phone}
                            style={{ background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.7rem 1.1rem', borderRadius:100, fontSize:'0.82rem', textDecoration:'none', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap' }}>
                            📞 Appeler entrepôt
                          </a>
                        </div>
                        <div style={{ marginTop:'0.6rem', fontSize:'0.72rem', color:'#047857' }}>
                          ✅ L'acheteur et le vendeur seront automatiquement notifiés · L'escrow reste bloqué jusqu'à confirmation de réception
                        </div>
                      </div>
                    )}

                    {order.status === 'shipped' && (
                      <div style={{ background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:12, padding:'0.8rem 1rem', fontSize:'0.82rem', color:'#065F46' }}>
                        ✅ Expédié depuis {order.warehouse?.name} · En attente de confirmation de réception par l'acheteur · Escrow bloqué
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Composant Demandes d'Inventaire ──────────────────────────
function DemandesInventaire() {
  const C = {
    forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
    cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
    white:'#FDFAF4', muted:'#5C5C50',
    eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
  };
  const qc = useQueryClient();
  const [filterType,   setFilterType]   = React.useState('inventory');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [search,       setSearch]       = React.useState('');
  const [openId,       setOpenId]       = React.useState(null);
  const [noteModal,    setNoteModal]    = React.useState(null);
  const [adminNote,    setAdminNote]    = React.useState('');

  // ── Chargement des demandes depuis API ──────────────────────
  const { data, isLoading, refetch } = useQuery(
    ['admin-services', filterType, filterStatus],
    () => api.get('/services/admin').then(r => r.data),
    { staleTime: 20000 }
  );

  const allServices = data?.services || [];

  // Filtrage local
  const services = allServices.filter(s => {
    if (filterType && s.type !== filterType) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (s.company_name||'').toLowerCase().includes(q) ||
             (s.contact_name||'').toLowerCase().includes(q) ||
             (s.city||'').toLowerCase().includes(q);
    }
    return true;
  });

  // ── Mutation statut ─────────────────────────────────────────
  const statusMutation = useMutation(
    ({ id, status }) => api.put('/services/' + id + '/status', { status }),
    {
      onSuccess: (_, { status }) => {
        qc.invalidateQueries(['admin-services']);
        toast.success('✅ Statut mis à jour : ' + status);
        setOpenId(null);
        setNoteModal(null);
        setAdminNote('');
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur'),
    }
  );

  const ST = {
    pending:    { label:'⏳ En attente',     color:C.orange, bg:'#FEF5E7' },
    confirmed:  { label:'✅ Confirmée',      color:C.blue,   bg:'#EBF5FB' },
    scheduled:  { label:'📅 Planifiée',      color:'#8B5CF6',bg:'#F3E8FF' },
    in_progress:{ label:'🔄 En cours',       color:C.eco,    bg:'#E8F8EE' },
    completed:  { label:'🏁 Terminée',       color:'#059669',bg:'#ECFDF5' },
    cancelled:  { label:'❌ Annulée',        color:C.urgent, bg:'#FDECEA' },
  };

  const invStats = {
    total:    allServices.filter(s => s.type==='inventory').length,
    pending:  allServices.filter(s => s.type==='inventory' && s.status==='pending').length,
    planned:  allServices.filter(s => s.type==='inventory' && s.status==='scheduled').length,
    done:     allServices.filter(s => s.type==='inventory' && s.status==='completed').length,
    storage:  allServices.filter(s => s.type==='storage').length,
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('fr-MA', { day:'2-digit', month:'long', year:'numeric' }) : '—';

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', color:C.forest, marginBottom:'0.2rem' }}>
            🔍 Demandes de Services REVEX
          </h2>
          <p style={{ fontSize:'0.82rem', color:C.muted }}>
            Inventaires physiques & stockages demandés par les clients
          </p>
        </div>
        <button onClick={() => refetch()}
          style={{ background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.5rem 1.1rem', borderRadius:100, fontSize:'0.8rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          🔄 Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'0.75rem', marginBottom:'1.5rem' }}>
        {[
          { icon:'🔍', label:'Inventaires total',   value:invStats.total,   color:C.forest },
          { icon:'⏳', label:'En attente',           value:invStats.pending, color:C.orange },
          { icon:'📅', label:'Planifiées',           value:invStats.planned, color:'#8B5CF6'},
          { icon:'🏁', label:'Terminées',            value:invStats.done,    color:C.eco    },
          { icon:'📦', label:'Stockages',            value:invStats.storage, color:C.blue   },
        ].map(k => (
          <div key={k.label} style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:14, padding:'0.9rem', textAlign:'center' }}>
            <div style={{ fontSize:'1.2rem', marginBottom:'0.3rem' }}>{k.icon}</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', fontWeight:700, color:k.color, lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:'0.65rem', color:C.muted, marginTop:'0.2rem' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display:'flex', gap:'0.6rem', marginBottom:'1rem', flexWrap:'wrap', alignItems:'center' }}>
        {/* Type */}
        <div style={{ display:'flex', gap:'0.3rem' }}>
          {[['inventory','🔍 Inventaires'],['storage','📦 Stockages'],['','Tous']].map(([v,l]) => (
            <button key={v} onClick={() => setFilterType(v)}
              style={{ background:filterType===v?C.forest:C.white, color:filterType===v?C.cream:C.muted, border:'1px solid '+(filterType===v?C.forest:C.mid), padding:'0.4rem 0.9rem', borderRadius:100, fontSize:'0.8rem', cursor:'pointer', fontWeight:filterType===v?700:400, fontFamily:"'DM Sans',sans-serif" }}>
              {l}
            </button>
          ))}
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Entreprise, contact, ville..."
          style={{ flex:1, minWidth:180, padding:'0.45rem 0.9rem', border:'1.5px solid '+C.mid, borderRadius:100, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream }}/>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding:'0.45rem 0.8rem', border:'1px solid '+C.mid, borderRadius:100, fontSize:'0.82rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, cursor:'pointer' }}>
          <option value="">Tous les statuts</option>
          {Object.entries(ST).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Alerte : en attente */}
      {invStats.pending > 0 && (
        <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:12, padding:'0.8rem 1.2rem', marginBottom:'1rem', display:'flex', gap:'0.7rem', alignItems:'center', fontSize:'0.82rem', color:'#92400E' }}>
          <span style={{ fontSize:'1.1rem' }}>⚠️</span>
          <strong>{invStats.pending} demande{invStats.pending > 1 ? 's' : ''} en attente</strong> de confirmation — répondre sous 24h
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}>
          <div style={{ fontSize:'2rem', opacity:0.3, marginBottom:'0.5rem' }}>🔍</div>
          Chargement...
        </div>
      )}

      {/* Vide */}
      {!isLoading && services.length === 0 && (
        <div style={{ textAlign:'center', padding:'4rem', background:C.white, borderRadius:18, border:'1px solid '+C.mid, color:C.muted }}>
          <div style={{ fontSize:'3rem', opacity:0.15, marginBottom:'0.5rem' }}>📭</div>
          <div style={{ fontWeight:600, marginBottom:'0.3rem' }}>Aucune demande</div>
          <div style={{ fontSize:'0.82rem' }}>Les demandes d'inventaire et de stockage apparaîtront ici.</div>
        </div>
      )}

      {/* Liste des demandes */}
      {!isLoading && services.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {services.map(s => {
            const st     = ST[s.status] || ST.pending;
            const isOpen = openId === s.id;
            const isInv  = s.type === 'inventory';
            const accent = isInv ? '#8B5CF6' : C.blue;
            const accentBg = isInv ? '#F3E8FF' : '#EBF5FB';
            const days   = Math.floor((Date.now() - new Date(s.created_at).getTime()) / (1000*60*60*24));

            return (
              <div key={s.id} style={{ background:C.white, border:'2px solid '+(s.status==='pending'?C.orange:C.mid), borderRadius:18, overflow:'hidden', boxShadow:'0 2px 10px rgba(30,61,15,0.05)' }}>

                {/* Header */}
                <div style={{ padding:'1rem 1.5rem', background:s.status==='pending'?'#FFFBEB':C.cream, borderBottom:'1px solid '+C.beige, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:3 }}>
                      <span style={{ background:accentBg, color:accent, fontSize:'0.68rem', fontWeight:700, padding:'0.15rem 0.6rem', borderRadius:100 }}>
                        {isInv ? '🔍 INVENTAIRE' : '📦 STOCKAGE'}
                      </span>
                      {s.status === 'pending' && (
                        <span style={{ background:'#FEF3C7', color:'#92400E', fontSize:'0.65rem', fontWeight:700, padding:'0.1rem 0.5rem', borderRadius:100 }}>
                          NOUVEAU
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', fontWeight:700, color:C.forest }}>
                      {s.company_name || '—'}
                    </div>
                    <div style={{ fontSize:'0.75rem', color:C.muted }}>
                      👤 {s.contact_name || '—'} · 📍 {s.city || '—'} · 📅 Il y a {days}j
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.7rem' }}>
                    <span style={{ background:st.bg, color:st.color, padding:'0.28rem 0.85rem', borderRadius:100, fontSize:'0.78rem', fontWeight:700 }}>
                      {st.label}
                    </span>
                    <button onClick={() => setOpenId(isOpen ? null : s.id)}
                      style={{ background:C.beige, color:C.forest, border:'none', padding:'0.32rem 0.85rem', borderRadius:100, fontSize:'0.78rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                      {isOpen ? '▲' : '▼ Détails'}
                    </button>
                  </div>
                </div>

                {/* Résumé rapide */}
                <div style={{ padding:'0.55rem 1.5rem', display:'flex', gap:'1.5rem', flexWrap:'wrap', fontSize:'0.75rem', color:C.muted }}>
                  {s.phone && <span>📞 {s.phone}</span>}
                  {s.scheduled_date && <span>📅 Date souhaitée : {fmt(s.scheduled_date)}</span>}
                  {isInv && s.nb_references_est && <span>📊 ~{s.nb_references_est} références</span>}
                  {isInv && s.inventory_type && <span>🔧 Type : {s.inventory_type}</span>}
                  {isInv && s.nb_staff_needed && <span>👷 Staff demandé : {s.nb_staff_needed} pers.</span>}
                  {!isInv && s.stock_type && <span>📦 Stock : {s.stock_type}</span>}
                  {!isInv && s.duration_months && <span>⏱ Durée : {s.duration_months} mois</span>}
                  {!isInv && s.surface_m2 && <span>📐 Surface : {s.surface_m2} m²</span>}
                </div>

                {/* Détails */}
                {isOpen && (
                  <div style={{ padding:'1.2rem 1.5rem', borderTop:'1px solid '+C.beige }}>

                    {/* Grille infos */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.6rem', marginBottom:'1rem' }}>
                      {[
                        ['🏢 Entreprise',   s.company_name||'—'],
                        ['👤 Contact',      s.contact_name||'—'],
                        ['📞 Téléphone',    s.phone||'—'],
                        ['📧 Email',        s.email||'—'],
                        ['📍 Ville',        s.city||'—'],
                        ['📅 Soumis le',    fmt(s.created_at)],
                        ...(isInv ? [
                          ['📊 Nb références est.', s.nb_references_est ? s.nb_references_est+' réf.' : '—'],
                          ['🔧 Type inventaire',    s.inventory_type||'—'],
                          ['👷 Staff nécessaire',   s.nb_staff_needed ? s.nb_staff_needed+' pers.' : '2 pers.'],
                          ['🚪 Accès site',         s.site_access||'—'],
                          ['📅 Date souhaitée',     fmt(s.scheduled_date)],
                          ['⏱ Durée estimée',       '1-3 jours selon volume'],
                        ] : [
                          ['📦 Type de stock',   s.stock_type||'—'],
                          ['⚖️ Tonnage estimé',  s.quantity_tons ? s.quantity_tons+' T' : '—'],
                          ['⏱ Durée stockage',   s.duration_months ? s.duration_months+' mois' : '—'],
                          ['📐 Surface requise', s.surface_m2 ? s.surface_m2+' m²' : '—'],
                          ['📅 Date souhaitée',  fmt(s.scheduled_date)],
                          ['💰 Budget indicatif','—'],
                        ]),
                      ].map(([k,v]) => (
                        <div key={k} style={{ background:C.beige, borderRadius:8, padding:'0.5rem 0.75rem' }}>
                          <div style={{ fontSize:'0.65rem', color:C.muted, marginBottom:2 }}>{k}</div>
                          <div style={{ fontSize:'0.82rem', fontWeight:600, color:C.forest }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Notes client */}
                    {s.notes && (
                      <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'0.7rem 1rem', marginBottom:'1rem', fontSize:'0.82rem', color:'#1D4ED8' }}>
                        <strong>📝 Notes client :</strong> {s.notes}
                      </div>
                    )}

                    {/* Adresse */}
                    {s.address && (
                      <div style={{ background:C.beige, borderRadius:10, padding:'0.7rem 1rem', marginBottom:'1rem', fontSize:'0.82rem', color:C.forest }}>
                        📍 <strong>Adresse :</strong> {s.address}
                      </div>
                    )}

                    {/* ── ACTIONS SELON STATUT ── */}
                    <div style={{ marginTop:'0.5rem' }}>

                      {/* EN ATTENTE → Confirmer ou Annuler */}
                      {s.status === 'pending' && (
                        <div style={{ display:'flex', gap:'0.7rem', flexWrap:'wrap' }}>
                          <button onClick={() => statusMutation.mutate({ id:s.id, status:'confirmed' })}
                            disabled={statusMutation.isLoading}
                            style={{ background:C.eco, color:'#fff', border:'none', padding:'0.65rem 1.5rem', borderRadius:100, fontWeight:700, fontSize:'0.88rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                            ✅ Confirmer la demande
                          </button>
                          <button onClick={() => { window.open('tel:'+s.phone); }}
                            style={{ background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.65rem 1.2rem', borderRadius:100, fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                            📞 Appeler le client
                          </button>
                          <button onClick={() => statusMutation.mutate({ id:s.id, status:'cancelled' })}
                            style={{ background:'#FEF2F2', color:C.urgent, border:'1px solid #FECACA', padding:'0.65rem 1.2rem', borderRadius:100, fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                            ❌ Annuler
                          </button>
                        </div>
                      )}

                      {/* CONFIRMÉE → Planifier */}
                      {s.status === 'confirmed' && (
                        <div>
                          {noteModal === s.id ? (
                            <div style={{ background:'#F0FDF4', border:'1.5px solid #A7F3D0', borderRadius:14, padding:'1rem' }}>
                              <div style={{ fontSize:'0.82rem', fontWeight:700, color:'#065F46', marginBottom:'0.5rem' }}>
                                📅 Confirmer la date de planification
                              </div>
                              <input
                                type="date"
                                value={adminNote}
                                onChange={e => setAdminNote(e.target.value)}
                                style={{ width:'100%', padding:'0.6rem', border:'1.5px solid #A7F3D0', borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', marginBottom:'0.6rem', boxSizing:'border-box' }}
                              />
                              <div style={{ display:'flex', gap:'0.6rem' }}>
                                <button onClick={() => statusMutation.mutate({ id:s.id, status:'scheduled' })}
                                  disabled={statusMutation.isLoading}
                                  style={{ background:C.eco, color:'#fff', border:'none', padding:'0.6rem 1.3rem', borderRadius:100, fontWeight:700, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                                  📅 Planifier
                                </button>
                                <button onClick={() => { setNoteModal(null); setAdminNote(''); }}
                                  style={{ background:'transparent', color:C.muted, border:'1px solid '+C.mid, padding:'0.6rem 1rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display:'flex', gap:'0.7rem', flexWrap:'wrap' }}>
                              <button onClick={() => setNoteModal(s.id)}
                                style={{ background:'#8B5CF6', color:'#fff', border:'none', padding:'0.65rem 1.5rem', borderRadius:100, fontWeight:700, fontSize:'0.88rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                                📅 Planifier la date
                              </button>
                              <button onClick={() => statusMutation.mutate({ id:s.id, status:'in_progress' })}
                                disabled={statusMutation.isLoading}
                                style={{ background:C.forest, color:C.cream, border:'none', padding:'0.65rem 1.3rem', borderRadius:100, fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                                🔄 Démarrer directement
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* PLANIFIÉE → Démarrer */}
                      {s.status === 'scheduled' && (
                        <div style={{ display:'flex', gap:'0.7rem', flexWrap:'wrap', alignItems:'center' }}>
                          <div style={{ background:'#F3E8FF', border:'1px solid #DDD6FE', borderRadius:10, padding:'0.6rem 1rem', fontSize:'0.82rem', color:'#7C3AED' }}>
                            📅 Planifié{s.scheduled_date ? ' le '+fmt(s.scheduled_date) : ''}
                          </div>
                          <button onClick={() => statusMutation.mutate({ id:s.id, status:'in_progress' })}
                            disabled={statusMutation.isLoading}
                            style={{ background:C.forest, color:C.cream, border:'none', padding:'0.65rem 1.5rem', borderRadius:100, fontWeight:700, fontSize:'0.88rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                            🔄 Marquer en cours
                          </button>
                        </div>
                      )}

                      {/* EN COURS → Terminer */}
                      {s.status === 'in_progress' && (
                        <div style={{ display:'flex', gap:'0.7rem', flexWrap:'wrap' }}>
                          <button onClick={() => statusMutation.mutate({ id:s.id, status:'completed' })}
                            disabled={statusMutation.isLoading}
                            style={{ background:C.eco, color:'#fff', border:'none', padding:'0.65rem 1.5rem', borderRadius:100, fontWeight:700, fontSize:'0.88rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                            🏁 Marquer terminée
                          </button>
                        </div>
                      )}

                      {/* TERMINÉE */}
                      {s.status === 'completed' && (
                        <div style={{ background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:10, padding:'0.8rem 1rem', fontSize:'0.82rem', color:'#065F46' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.6rem' }}>
                            <span>🏁</span>
                            <span>Service terminé — Facture et rapport disponibles</span>
                          </div>
                          <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
                            <button
                              onClick={() => generateInvoicePdf({
                                type: 'inventory',
                                requestId: s.id,
                                companyName: s.company_name,
                                contactName: s.contact_name,
                                city: s.city,
                                inventoryType: s.inventory_type,
                                nbReferences: s.nb_references_est,
                                nbStaff: s.nb_staff_needed,
                                scheduledDate: s.scheduled_date,
                                createdAt: s.created_at,
                              })}
                              style={{ background:C.eco, color:'#fff', border:'none', padding:'0.45rem 1rem', borderRadius:100, fontSize:'0.78rem', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                              🧾 Émettre la facture
                            </button>
                            <button
                              onClick={() => toast.info('📧 Rapport envoyé à '+(s.email||s.company_name))}
                              style={{ background:'#D1FAE5', color:'#065F46', border:'1px solid #A7F3D0', padding:'0.45rem 1rem', borderRadius:100, fontSize:'0.78rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                              📧 Envoyer rapport client
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ANNULÉE */}
                      {s.status === 'cancelled' && (
                        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'0.7rem 1rem', fontSize:'0.82rem', color:C.urgent }}>
                          ❌ Demande annulée
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Composant Demandes Urgentes (Admin) ──────────────────────
function DemandesUrgentes() {
  const C = {
    forest:'#1E3D0F', cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
    white:'#FDFAF4', muted:'#5C5C50',
    eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9',
  };
  const qc = useQueryClient();
  const [search, setSearch] = React.useState('');

  const { data, isLoading, refetch } = useQuery(
    'admin-urgent-requests',
    () => api.get('/analysis/urgent').then(r => r.data).catch(() => ({ requests:[] })),
    { staleTime: 20000, refetchInterval: 60000 }
  );

  const allRequests = data?.requests || [];
  const requests = allRequests.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.part_description||'').toLowerCase().includes(q)
      || (r.part_reference||'').toLowerCase().includes(q)
      || (r.location_city||'').toLowerCase().includes(q)
      || (r.buyer_company||'').toLowerCase().includes(q);
  });

  const URGENCY = {
    critical: { label:'🔴 Critique', color:C.urgent, bg:'#FDECEA' },
    high:     { label:'🟠 Haute',    color:C.orange, bg:'#FEF5E7' },
    medium:   { label:'🟡 Moyenne',  color:'#D4A017',bg:'#FFFBEB' },
  };

  const stats = {
    total:    allRequests.length,
    open:     allRequests.filter(r => r.status === 'open').length,
    critical: allRequests.filter(r => r.urgency_level === 'critical').length,
    done:     allRequests.filter(r => r.status === 'fulfilled').length,
  };

  const fmt = n => Number(n||0).toLocaleString('fr-MA');
  const fmtDate = d => new Date(d).toLocaleDateString('fr-MA', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });

  const contactMutation = useMutation(
    ({ buyer_id, message }) => api.post('/messages/send', { recipient_id: buyer_id, content: message }),
    { onSuccess: () => toast.success('💬 Message envoyé à l\'acheteur') }
  );

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', color:C.forest, marginBottom:'0.2rem' }}>
            ⚡ Demandes PDR Urgentes
          </h2>
          <p style={{ fontSize:'0.82rem', color:C.muted }}>
            Toutes les demandes urgentes soumises par les acheteurs
          </p>
        </div>
        <button onClick={() => refetch()}
          style={{ background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.5rem 1.1rem', borderRadius:100, fontSize:'0.8rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          🔄 Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.75rem', marginBottom:'1.5rem' }}>
        {[
          { icon:'⚡', label:'Total demandes', value:stats.total,    color:C.forest },
          { icon:'📡', label:'En recherche',   value:stats.open,     color:C.orange },
          { icon:'🔴', label:'Critiques',      value:stats.critical, color:C.urgent },
          { icon:'✅', label:'Satisfaites',    value:stats.done,     color:C.eco    },
        ].map(k => (
          <div key={k.label} style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:14, padding:'0.9rem', textAlign:'center' }}>
            <div style={{ fontSize:'1.2rem', marginBottom:'0.3rem' }}>{k.icon}</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', fontWeight:700, color:k.color, lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:'0.65rem', color:C.muted, marginTop:'0.2rem' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Alerte critique */}
      {stats.critical > 0 && allRequests.some(r => r.urgency_level==='critical' && r.status==='open') && (
        <div style={{ background:'#FDECEA', border:'1px solid #FECACA', borderRadius:12, padding:'0.85rem 1.2rem', marginBottom:'1.2rem', display:'flex', gap:'0.7rem', alignItems:'center', fontSize:'0.82rem', color:C.urgent }}>
          <span style={{ fontSize:'1.2rem' }}>🚨</span>
          <strong>{stats.critical} demande(s) CRITIQUE(S)</strong> en attente — Arrêt de production possible — Traiter en priorité
        </div>
      )}

      {/* Recherche */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Rechercher par pièce, référence, ville, acheteur..."
        style={{ width:'100%', padding:'0.55rem 1rem', border:'1.5px solid '+C.mid, borderRadius:100, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, boxSizing:'border-box', marginBottom:'1.2rem' }}/>

      {isLoading && (
        <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}>Chargement...</div>
      )}

      {!isLoading && requests.length === 0 && (
        <div style={{ textAlign:'center', padding:'4rem', background:C.white, borderRadius:18, border:'1px solid '+C.mid, color:C.muted }}>
          <div style={{ fontSize:'3rem', opacity:0.15, marginBottom:'0.5rem' }}>⚡</div>
          <div style={{ fontWeight:600, marginBottom:'0.3rem' }}>Aucune demande urgente</div>
        </div>
      )}

      {!isLoading && requests.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.9rem' }}>
          {requests.map(r => {
            const urg = URGENCY[r.urgency_level] || URGENCY.high;
            const isExpired = new Date(r.expires_at) < new Date();
            const isCritOpen = r.urgency_level === 'critical' && r.status === 'open';
            const age = Math.floor((Date.now() - new Date(r.created_at).getTime()) / (1000*60*60));

            return (
              <div key={r.id} style={{ background:C.white, border:'2px solid '+(isCritOpen?C.urgent:r.status==='fulfilled'?C.eco:C.mid), borderRadius:16, overflow:'hidden' }}>

                {/* Header */}
                <div style={{ padding:'0.85rem 1.4rem', background:isCritOpen?'#FFF5F5':r.status==='fulfilled'?'#F0FDF4':C.white, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.7rem' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:3 }}>
                      <span style={{ background:urg.bg, color:urg.color, fontSize:'0.68rem', fontWeight:700, padding:'0.1rem 0.5rem', borderRadius:100 }}>
                        {urg.label}
                      </span>
                      {isExpired && <span style={{ background:C.beige, color:C.muted, fontSize:'0.65rem', fontWeight:700, padding:'0.1rem 0.45rem', borderRadius:100 }}>EXPIRÉE</span>}
                      {isCritOpen && age <= 2 && <span style={{ background:C.urgent, color:'#fff', fontSize:'0.65rem', fontWeight:700, padding:'0.1rem 0.45rem', borderRadius:100, animation:'pulse 1s infinite' }}>NOUVEAU</span>}
                    </div>
                    <div style={{ fontWeight:700, color:C.forest, fontSize:'0.95rem', marginBottom:3 }}>
                      {r.part_description?.substring(0,80)}{r.part_description?.length > 80 ? '...' : ''}
                    </div>
                    <div style={{ fontSize:'0.72rem', color:C.muted }}>
                      🏭 {r.buyer_company || '—'}
                      {r.part_reference && ' · 🔖 '+r.part_reference}
                      {' · 📍 '+r.location_city}
                      {' · ⏱ max '+r.max_delivery_hours+'h'}
                      {r.max_budget && ' · 💰 max '+fmt(r.max_budget)+' MAD'}
                      {' · '+fmtDate(r.created_at)}
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', alignItems:'center' }}>
                    {/* Contacter l'acheteur */}
                    <button onClick={() => contactMutation.mutate({
                        buyer_id: r.buyer_id,
                        message: '[ADMIN REVEX] Bonjour, nous avons bien reçu votre demande urgente pour : ' + r.part_description + '. Nous cherchons activement chez nos vendeurs partenaires.'
                      })}
                      style={{ background:C.blue+'22', color:C.blue, border:'1px solid '+C.blue+'44', padding:'0.3rem 0.75rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                      💬 Contacter acheteur
                    </button>

                    {/* Chercher dans catalogue */}
                    <a href={'/catalogue?search='+encodeURIComponent(r.part_reference || r.part_description?.split(' ').slice(0,3).join(' '))}
                      target="_blank" rel="noopener noreferrer"
                      style={{ background:C.eco+'22', color:C.eco, border:'1px solid '+C.eco+'44', padding:'0.3rem 0.75rem', borderRadius:100, fontSize:'0.75rem', fontWeight:600, textDecoration:'none' }}>
                      🔍 Chercher
                    </a>

                    {/* Statut */}
                    <span style={{
                      background: r.status==='fulfilled'?C.eco+'22':r.status==='open'?urg.bg:C.beige,
                      color: r.status==='fulfilled'?C.eco:r.status==='open'?urg.color:C.muted,
                      padding:'0.28rem 0.8rem', borderRadius:100, fontSize:'0.75rem', fontWeight:700
                    }}>
                      {r.status==='fulfilled'?'✅ Satisfaite':r.status==='open'?'📡 En recherche':r.status==='expired'?'⏰ Expirée':'🔄 '+r.status}
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
