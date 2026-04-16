// src/pages/distributor/Dashboard.jsx — Dashboard Distributeur-Transporteur
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

const fmt = n => Number(n||0).toLocaleString('fr-MA');

const BOOKING_STATUS = {
  pending:   { label:'⏳ En attente',     color:C.orange },
  confirmed: { label:'✅ Confirmé',        color:C.eco    },
  picked_up: { label:'📦 Pris en charge', color:C.blue   },
  delivered: { label:'✅ Livré',           color:C.eco    },
  cancelled: { label:'❌ Annulé',          color:C.urgent },
};

const TRANSPORT_STATUS = {
  available:  { label:'🟢 Disponible', color:C.eco,    bg:'#E8F8EE' },
  booked:     { label:'🔵 Réservé',    color:C.blue,   bg:'#EBF5FB' },
  cancelled:  { label:'❌ Annulé',     color:C.urgent, bg:'#FDECEA' },
};

const EMPTY_FORM = {
  departure_city:'', departure_region:'', arrival_city:'', arrival_region:'',
  departure_date:'', vehicle_type:'Porteur (1-10T)',
  capacity_tons:'', volume_m3:'', price_per_kg:'', notes:'', contact_phone:''
};

const VEHICLES = [
  'Fourgon (< 1T)','Porteur (1-5T)','Porteur (5-10T)',
  'Semi-remorque (10-20T)','Semi-remorque (> 20T)','Camion frigorifique','Plateau bâché'
];

export default function DistributorDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('transport');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Trajets transport ────────────────────────────────────────
  const { data: trajetsData, isLoading: loadT } = useQuery(
    'dist-transports',
    () => api.get('/transport').then(r => r.data),
    { refetchInterval: 30000 }
  );

  // ── Réservations (en tant que transporteur) ──────────────────
  const { data: bookingsData, isLoading: loadB } = useQuery(
    'dist-bookings',
    () => api.get('/transport/bookings').then(r => r.data),
    { refetchInterval: 15000 }
  );

  // ── Produits publiés ─────────────────────────────────────────
  const { data: productsData } = useQuery(
    'dist-products',
    () => api.get('/products/me').then(r => r.data),
    { refetchInterval: 60000 }
  );

  // ── Commandes vendeur ────────────────────────────────────────
  const { data: ordersData } = useQuery(
    'dist-orders',
    () => api.get('/orders?role_as=seller').then(r => r.data),
    { refetchInterval: 30000 }
  );

  // ── Achats (en tant qu'acheteur) ─────────────────────────────
  const { data: purchasesData } = useQuery(
    'dist-purchases',
    () => api.get('/orders?role_as=buyer').then(r => r.data),
    { refetchInterval: 30000 }
  );

  const trajets   = trajetsData?.transports  || [];
  const bookings  = bookingsData?.bookings   || [];
  const products  = productsData?.products   || [];
  const orders    = ordersData?.orders       || [];
  const purchases = purchasesData?.orders    || [];

  // ── Mes trajets (filtrer par carrier_id) ─────────────────────
  const myTrajets = trajets.filter(t => t.carrier_id === user?.id ||
    (trajetsData?.my_transports && true)
  );

  // ── KPIs globaux ─────────────────────────────────────────────
  const caTransport = bookings.filter(b => b.status==='delivered' && b.carrier_id===user?.id)
    .reduce((s,b) => s + Number(b.booking_price||0), 0);
  const caVente = orders.filter(o => o.status==='delivered')
    .reduce((s,o) => s + Number(o.final_price||0), 0);
  const pendingBookings = bookings.filter(b => b.status==='pending' && b.carrier_id===user?.id).length;
  const pendingOrders   = orders.filter(o => o.status==='pending').length;

  // ── Mutations ────────────────────────────────────────────────
  const publishMutation = useMutation(
    (data) => api.post('/transport', data),
    {
      onSuccess: () => {
        toast.success('🚛 Trajet publié !');
        setShowForm(false);
        setForm(EMPTY_FORM);
        qc.invalidateQueries('dist-transports');
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur')
    }
  );

  const cancelTrajetMutation = useMutation(
    (id) => api.delete('/transport/'+(id)+''),
    {
      onSuccess: () => { toast.success('Trajet annulé'); qc.invalidateQueries('dist-transports'); }
    }
  );

  const confirmBookingMutation = useMutation(
    (id) => api.put('/transport/bookings/'+(id)+'/confirm'),
    {
      onSuccess: () => { toast.success('✅ Prise en charge confirmée !'); qc.invalidateQueries('dist-bookings'); }
    }
  );

  const handlePublish = () => {
    if (!form.departure_city || !form.arrival_city || !form.departure_date)
      return toast.error('Départ, arrivée et date obligatoires');
    publishMutation.mutate(form);
  };

  const TABS = [
    { id:'transport',     label:'🚛 Mes trajets ('+(myTrajets.length)+')' },
    { id:'reservations',  label:'📦 Réservations ('+(bookings.length)+')' },
    { id:'ventes',        label:'🏭 Ventes PDR ('+(orders.length)+')' },
    { id:'achats',        label:'🛒 Mes achats ('+(purchases.length)+')' },
  ];

  return (
    <div style={{ background:C.cream, minHeight:'100vh' }}>
    <div className="page-pad" style={{ maxWidth:1280, margin:'0 auto', padding:'2rem clamp(1rem,4vw,2rem) 4rem' }}>

      {/* ── EN-TÊTE ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.2rem', color:C.forest, marginBottom:'0.2rem' }}>
            🔄 Dashboard Distributeur
          </h1>
          <p style={{ color:C.muted, fontSize:'0.9rem' }}>
            {user?.company_name} • {user?.city} •
            <span style={{ color:C.blue, fontWeight:600, marginLeft:4 }}>Distributeur & Transporteur</span>
          </p>
        </div>
        <div style={{ display:'flex', gap:'0.7rem', flexWrap:'wrap' }}>
          <button onClick={() => setShowForm(s => !s)}
            style={{ background:showForm?C.beige:C.eco, color:showForm?C.muted:'#fff', border:'none', padding:'0.65rem 1.4rem', borderRadius:100, fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            {showForm ? '✕ Annuler' : '🚛 Déclarer un trajet'}
          </button>
          <Link to="/seller/publier" style={btnLnk(C.forest, C.cream)}>+ Publier un PDR</Link>
        </div>
      </div>

      {/* ── KPIs PRINCIPAUX ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1.5rem' }}>
        {[
          { icon:'🚛', label:'Trajets actifs',     value: myTrajets.filter(t=>t.status==='available').length, sub:(myTrajets.length)+' total',           color:C.eco   },
          { icon:'💰', label:'CA Transport',        value:(fmt(caTransport))+' MAD',                           sub:(bookings.filter(b=>b.status==='delivered').length)+' livraisons',  color:C.leaf  },
          { icon:'📦', label:'CA Vente PDR',        value:(fmt(caVente))+' MAD',                               sub:(orders.filter(o=>o.status==='delivered').length)+' commandes',     color:C.blue  },
          { icon:'⚠️', label:'Actions requises',    value: pendingBookings + pendingOrders,                    sub:(pendingBookings)+' transport · ${pendingOrders} ventes',           color:C.orange},
        ].map(k => (
          <div key={k.label} style={{ background:C.white, border:'1px solid '+(C.mid), borderRadius:16, padding:'1.4rem' }}>
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
          { label:'Produits publiés',   value:(products.filter(p=>p.status==='active').length)+' actifs',   color:C.leaf   },
          { label:'Réservations trans', value:(pendingBookings)+' en attente',                              color:C.orange },
          { label:'Commandes PDR',      value:(pendingOrders)+' à confirmer',                               color:C.urgent },
          { label:'Total achats',       value:(purchases.length)+' commandes',                              color:C.muted  },
        ].map(k => (
          <div key={k.label} style={{ background:C.beige, border:'1px solid '+(C.mid), borderRadius:12, padding:'0.9rem 1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:'0.77rem', color:C.muted }}>{k.label}</div>
            <div style={{ fontWeight:700, color:k.color, fontSize:'0.9rem' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── FORMULAIRE DÉCLARER TRAJET ── */}
      {showForm && (
        <div style={{ background:C.white, border:'1.5px solid '+(C.eco)+'', borderRadius:20, padding:'2rem', marginBottom:'2rem' }}>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', color:C.forest, marginBottom:'1.5rem' }}>
            🚛 Déclarer un retour à vide
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.9rem' }}>
            {[
              [set('departure_city'),   form.departure_city,   'Ville départ *',   'Ex: Casablanca',    false],
              [set('arrival_city'),     form.arrival_city,     'Ville arrivée *',  'Ex: Marrakech',     false],
              [set('departure_region'), form.departure_region, 'Région départ',    'Grand Casablanca',  false],
              [set('arrival_region'),   form.arrival_region,   'Région arrivée',   'Marrakech-Safi',    false],
              [set('capacity_tons'),    form.capacity_tons,    'Capacité (T)',      'Ex: 12',            true ],
              [set('volume_m3'),        form.volume_m3,        'Volume (m³)',       'Ex: 45',            true ],
              [set('price_per_kg'),     form.price_per_kg,     'Tarif (MAD/kg)',    'Ex: 0.18',          true ],
              [set('contact_phone'),    form.contact_phone,    'Téléphone',         '06 XX XX XX XX',    false],
            ].map(([onChange, value, label, placeholder, isNum]) => (
              <div key={label}>
                <label style={lbl}>{label}</label>
                <input type={isNum?'number':'text'} value={value} onChange={onChange} placeholder={placeholder} style={inp} />
              </div>
            ))}
            <div>
              <label style={lbl}>Date départ *</label>
              <input type="date" value={form.departure_date} onChange={set('departure_date')} style={inp} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label style={lbl}>Type véhicule</label>
              <select value={form.vehicle_type} onChange={set('vehicle_type')} style={inp}>
                {VEHICLES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={lbl}>Notes / Conditions</label>
              <textarea value={form.notes} onChange={set('notes')} rows={2}
                placeholder="Marchandises sèches uniquement, disponible dès 8h..."
                style={{ ...inp, resize:'vertical' }} />
            </div>
          </div>
          <div style={{ display:'flex', gap:'0.8rem', marginTop:'1.2rem' }}>
            <button onClick={handlePublish} disabled={publishMutation.isLoading}
              style={{ background:C.eco, color:'#fff', border:'none', padding:'0.85rem 2.5rem', borderRadius:100, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", opacity:publishMutation.isLoading?0.7:1 }}>
              {publishMutation.isLoading ? '⏳ Publication...' : '✅ Publier le trajet'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              style={{ background:'transparent', color:C.muted, border:'1px solid '+(C.mid), padding:'0.85rem 1.5rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── ALERTES ── */}
      {(pendingBookings > 0 || pendingOrders > 0) && (
        <div style={{ display:'grid', gridTemplateColumns:pendingBookings>0&&pendingOrders>0?'1fr 1fr':'1fr', gap:'1rem', marginBottom:'2rem' }}>
          {pendingBookings > 0 && (
            <div style={{ background:'#FEF5E7', border:'1.5px solid '+(C.orange)+'', borderRadius:14, padding:'1rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700, color:'#784212' }}>⚠️ {pendingBookings} réservation(s) transport à confirmer</div>
                <div style={{ fontSize:'0.8rem', color:'#A04000', marginTop:'0.2rem' }}>Des expéditeurs attendent votre confirmation.</div>
              </div>
              <button onClick={() => setActiveTab('reservations')}
                style={{ background:C.orange, color:'#fff', border:'none', padding:'0.5rem 1.1rem', borderRadius:100, fontSize:'0.8rem', fontWeight:700, cursor:'pointer' }}>
                Voir →
              </button>
            </div>
          )}
          {pendingOrders > 0 && (
            <div style={{ background:'#FDECEA', border:'1.5px solid '+(C.urgent)+'', borderRadius:14, padding:'1rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700, color:C.urgent }}>🛒 {pendingOrders} commande(s) PDR à confirmer</div>
                <div style={{ fontSize:'0.8rem', color:C.urgent, opacity:0.8, marginTop:'0.2rem' }}>Confirmez rapidement pour sécuriser le paiement.</div>
              </div>
              <Link to="/seller/commandes"
                style={{ background:C.urgent, color:'#fff', border:'none', padding:'0.5rem 1.1rem', borderRadius:100, fontSize:'0.8rem', fontWeight:700, textDecoration:'none' }}>
                Gérer →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── TABS ── */}
      <div className='tabs-scroll' style={{ display:'flex', gap:'0.3rem', marginBottom:'1.5rem', borderBottom:'2px solid '+(C.mid)+'', overflowX:'auto' }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ padding:'0.65rem 1.2rem', border:'none', background:'transparent', cursor:'pointer', fontSize:'0.85rem', fontWeight:activeTab===id?700:400, color:activeTab===id?C.forest:C.muted, borderBottom:activeTab===id?'3px solid '+(C.leaf)+'':'3px solid transparent', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ════ TAB : TRANSPORT ════ */}
      {activeTab === 'transport' && (
        <div>
          {loadT ? <Loading/> : myTrajets.length === 0 ? (
            <Empty icon="🚛" msg="Aucun trajet publié" action={null}>
              <button onClick={() => setShowForm(true)}
                style={{ marginTop:'1rem', background:C.forest, color:C.cream, border:'none', padding:'0.7rem 1.8rem', borderRadius:100, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                Déclarer mon premier trajet
              </button>
            </Empty>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {myTrajets.map(t => {
                const st = TRANSPORT_STATUS[t.status] || TRANSPORT_STATUS.available;
                return (
                  <div key={t.id} style={{ background:C.white, border:'1.5px solid '+(t.status==='available'?C.eco+'44':C.mid)+'', borderRadius:18, padding:'1.5rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem', marginBottom:'0.8rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'1.5rem' }}>
                        <div>
                          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:700, color:C.forest }}>{t.departure_city}</div>
                          <div style={{ fontSize:'0.72rem', color:C.muted }}>{t.departure_region||''}</div>
                        </div>
                        <div style={{ fontSize:'1.8rem', color:C.sage }}>→</div>
                        <div>
                          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:700, color:C.forest }}>{t.arrival_city}</div>
                          <div style={{ fontSize:'0.72rem', color:C.muted }}>{t.arrival_region||''}</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:'0.6rem', alignItems:'center' }}>
                        <span style={{ background:st.bg, color:st.color, padding:'0.3rem 0.8rem', borderRadius:100, fontSize:'0.78rem', fontWeight:700 }}>{st.label}</span>
                        {t.status === 'available' && (
                          <button onClick={() => window.confirm('Annuler ce trajet ?') && cancelTrajetMutation.mutate(t.id)}
                            style={{ background:'#FDECEA', color:C.urgent, border:'none', padding:'0.3rem 0.8rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer', fontWeight:600 }}>
                            ✕ Annuler
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap', fontSize:'0.82rem', color:C.muted }}>
                      <span>📅 {new Date(t.departure_date).toLocaleDateString('fr-MA', { day:'2-digit', month:'long', year:'numeric' })}</span>
                      <span>🚛 {t.vehicle_type}</span>
                      {t.capacity_tons && <span>⚖️ {t.capacity_tons}T</span>}
                      {t.price_per_kg && <span style={{ color:C.leaf, fontWeight:700 }}>💰 {t.price_per_kg} MAD/kg</span>}
                    </div>
                    {t.notes && <div style={{ fontSize:'0.75rem', color:C.muted, marginTop:'0.5rem', fontStyle:'italic' }}>📝 {t.notes}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════ TAB : RÉSERVATIONS ════ */}
      {activeTab === 'reservations' && (
        <div>
          {loadB ? <Loading/> : bookings.length === 0 ? (
            <Empty icon="📦" msg="Aucune réservation reçue pour l'instant" />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem' }}>
              {bookings.map(b => {
                const bst = BOOKING_STATUS[b.status] || { label:b.status, color:C.muted };
                const isMyBooking = b.carrier_id === user?.id;
                return (
                  <div key={b.id} style={{ background:C.white, border:'1.5px solid '+(b.status==='pending'&&isMyBooking?C.orange+'55':C.mid)+'', borderRadius:16, padding:'1.3rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.7rem', flexWrap:'wrap', gap:'0.6rem' }}>
                      <div>
                        <div style={{ fontWeight:700, color:C.forest, fontSize:'0.92rem' }}>{b.order_number}</div>
                        <div style={{ fontSize:'0.78rem', color:C.muted, marginTop:'0.1rem' }}>
                          📍 {b.pickup_city} → {b.delivery_city}
                        </div>
                        <div style={{ fontSize:'0.75rem', color:C.muted, marginTop:'0.1rem' }}>{b.product_title?.substring(0,50)}</div>
                      </div>
                      <span style={{ background:bst.color+'22', color:bst.color, padding:'0.25rem 0.7rem', borderRadius:100, fontSize:'0.78rem', fontWeight:700 }}>{bst.label}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.6rem' }}>
                      <div style={{ fontSize:'0.8rem', color:C.muted, display:'flex', gap:'1.2rem', flexWrap:'wrap' }}>
                        <span>🏭 {b.seller_company}</span>
                        <span>🛒 {b.buyer_company}</span>
                        {b.booking_price > 0 && <span style={{ color:C.leaf, fontWeight:700 }}>💰 {fmt(b.booking_price)} MAD</span>}
                        <span>📅 {new Date(b.created_at).toLocaleDateString('fr-MA')}</span>
                      </div>
                      {b.status === 'pending' && isMyBooking && (
                        <button onClick={() => confirmBookingMutation.mutate(b.id)}
                          style={{ background:C.eco, color:'#fff', border:'none', padding:'0.5rem 1.2rem', borderRadius:100, fontSize:'0.8rem', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          ✅ Confirmer la prise en charge
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════ TAB : VENTES PDR ════ */}
      {activeTab === 'ventes' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <div style={{ fontSize:'0.85rem', color:C.muted }}>{orders.length} commande(s) reçue(s)</div>
            <Link to="/seller/commandes" style={{ fontSize:'0.82rem', color:C.leaf, textDecoration:'none', fontWeight:600 }}>Gérer tout →</Link>
          </div>
          {orders.length === 0 ? (
            <Empty icon="📦" msg="Aucune commande PDR reçue" action={{ to:'/seller/produits', label:'Voir mes produits' }} />
          ) : (
            <div style={{ background:C.white, border:'1px solid '+(C.mid), borderRadius:18, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 0.7fr 0.8fr 0.8fr', padding:'0.7rem 1.2rem', background:C.beige, borderBottom:'1px solid '+(C.mid)+'', fontSize:'0.72rem', fontWeight:700, color:C.muted, textTransform:'uppercase', gap:'0.5rem' }}>
                <div>Produit</div><div>Acheteur</div><div>Quantité</div><div>Montant</div><div>Statut</div>
              </div>
              {orders.map((o, i) => (
                <div key={o.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 0.7fr 0.8fr 0.8fr', padding:'0.7rem 1.2rem', borderBottom:'1px solid '+(C.beige)+'', background:i%2===0?C.white:C.cream, fontSize:'0.84rem', alignItems:'center', gap:'0.5rem' }}>
                  <div style={{ color:C.forest, fontWeight:500 }}>{o.product_title?.substring(0,35)}</div>
                  <div style={{ color:C.muted }}>{o.buyer_company?.substring(0,20)}</div>
                  <div style={{ textAlign:'center', color:C.muted }}>{o.quantity}</div>
                  <div style={{ fontWeight:700, color:C.leaf }}>{fmt(o.final_price)} MAD</div>
                  <div>
                    <span style={{ background:['delivered'].includes(o.status)?'#E8F8EE':['pending'].includes(o.status)?'#FEF5E7':'#EBF5FB', color:['delivered'].includes(o.status)?C.eco:['pending'].includes(o.status)?C.orange:C.blue, padding:'0.18rem 0.55rem', borderRadius:100, fontSize:'0.72rem', fontWeight:600 }}>
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════ TAB : ACHATS ════ */}
      {activeTab === 'achats' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <div style={{ fontSize:'0.85rem', color:C.muted }}>{purchases.length} achat(s) effectué(s)</div>
            <Link to="/buyer/commandes" style={{ fontSize:'0.82rem', color:C.leaf, textDecoration:'none', fontWeight:600 }}>Voir tout →</Link>
          </div>
          {purchases.length === 0 ? (
            <Empty icon="🛒" msg="Aucun achat effectué" action={{ to:'/catalogue', label:'Parcourir le catalogue' }} />
          ) : (
            <div style={{ background:C.white, border:'1px solid '+(C.mid), borderRadius:18, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 0.8fr 0.8fr', padding:'0.7rem 1.2rem', background:C.beige, borderBottom:'1px solid '+(C.mid)+'', fontSize:'0.72rem', fontWeight:700, color:C.muted, textTransform:'uppercase', gap:'0.5rem' }}>
                <div>Produit</div><div>Vendeur</div><div>Montant</div><div>Statut</div>
              </div>
              {purchases.map((o, i) => (
                <div key={o.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 0.8fr 0.8fr', padding:'0.7rem 1.2rem', borderBottom:'1px solid '+(C.beige)+'', background:i%2===0?C.white:C.cream, fontSize:'0.84rem', alignItems:'center', gap:'0.5rem' }}>
                  <div style={{ color:C.forest, fontWeight:500 }}>{o.product_title?.substring(0,35)}</div>
                  <div style={{ color:C.muted }}>{o.seller_company?.substring(0,20)}</div>
                  <div style={{ fontWeight:700, color:C.leaf }}>{fmt(o.final_price)} MAD</div>
                  <div>
                    <span style={{ background:'#E8F8EE', color:C.eco, padding:'0.18rem 0.55rem', borderRadius:100, fontSize:'0.72rem', fontWeight:600 }}>
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ACTIONS RAPIDES ── */}
      <div style={{ marginTop:'2.5rem', background:C.forest, borderRadius:18, padding:'1.8rem' }}>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', color:C.cream, marginBottom:'1.2rem' }}>
          Actions rapides
        </h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(200px,100%),1fr))', gap:'0.7rem' }}>
          {[
            { to:'/seller/publier',    icon:'➕', label:'Publier un PDR',        desc:'Nouvelle annonce' },
            { to:'/seller/produits',   icon:'📦', label:'Mes produits',          desc:(products.filter(p=>p.status==='active').length)+' actifs' },
            { to:'/seller/analyse',    icon:'🔬', label:'Analyser mon stock',    desc:'Méthode CCOM' },
            { to:'/catalogue',         icon:'🛒', label:'Acheter des PDR',       desc:'Parcourir le catalogue' },
            { to:'/transport',         icon:'🗺', label:'Trajets disponibles',   desc:'Marketplace transport' },
            { to:'/messages',          icon:'💬', label:'Messages',              desc:'Conversations B2B' },
          ].map(a => (
            <Link key={a.to} to={a.to}
              style={{ display:'flex', gap:'0.7rem', alignItems:'center', background:'rgba(255,255,255,0.07)', borderRadius:12, padding:'0.8rem 1rem', textDecoration:'none', transition:'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(74,124,47,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.07)'}>
              <span style={{ fontSize:'1.3rem' }}>{a.icon}</span>
              <div>
                <div style={{ fontSize:'0.84rem', fontWeight:600, color:C.cream }}>{a.label}</div>
                <div style={{ fontSize:'0.72rem', color:'rgba(246,241,231,0.55)' }}>{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────
const Loading = () => (
  <div style={{ textAlign:'center', padding:'3rem', color:'#5C5C50', fontSize:'0.85rem' }}>Chargement...</div>
);

const Empty = ({ icon, msg, action, children }) => (
  <div style={{ textAlign:'center', padding:'4rem', color:'#5C5C50', background:'#FDFAF4', borderRadius:18, border:'1px solid #D9CEBC' }}>
    <div style={{ fontSize:'2.5rem', marginBottom:'0.8rem', opacity:0.3 }}>{icon}</div>
    <p style={{ fontSize:'0.9rem' }}>{msg}</p>
    {action && <Link to={action.to} style={{ display:'inline-block', marginTop:'1rem', background:'#1E3D0F', color:'#F6F1E7', padding:'0.6rem 1.5rem', borderRadius:100, textDecoration:'none', fontWeight:600, fontSize:'0.85rem' }}>{action.label}</Link>}
    {children}
  </div>
);

const btnLnk = (bg, color, border) => ({
  background:bg, color, textDecoration:'none', padding:'0.65rem 1.4rem',
  borderRadius:100, fontWeight:600, fontSize:'0.85rem',
  border:border?'1px solid '+(border)+'':'none', fontFamily:"'DM Sans',sans-serif"
});

const lbl = { fontSize:'0.78rem', fontWeight:600, color:'#1E3D0F', display:'block', marginBottom:'0.3rem' };
const inp = { width:'100%', padding:'0.65rem 0.9rem', border:'1.5px solid #D9CEBC', borderRadius:10, fontSize:'0.88rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' };
