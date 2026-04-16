// src/pages/admin/WarehouseDetail.jsx — Page de gestion entrepôt REVEX
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { generateBonChargement, generateBonDechargement } from '../../utils/generateLogisticsDoc';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
};

const fmt  = n => Number(n||0).toLocaleString('fr-MA');
const fmtD = d => d ? new Date(d).toLocaleDateString('fr-MA', { day:'2-digit', month:'long', year:'numeric' }) : '—';

export default function WarehouseDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode,  setEditMode]  = useState(false);
  const [form,      setForm]      = useState({});

  // ── Chargement de l'entrepôt ─────────────────────────────────
  const { data: whData, isLoading } = useQuery(
    ['warehouse', id],
    () => api.get('/warehouses/' + id).then(r => r.data),
    { onSuccess: d => { if (!editMode) setForm(d.warehouse); } }
  );
  const wh = whData?.warehouse || {};

  // ── Demandes de stockage liées ────────────────────────────────
  const { data: reqData } = useQuery(
    ['warehouse-requests', id],
    () => api.get('/storage?warehouse_id=' + id).then(r => r.data),
    { retry: false }
  );
  const requests = reqData?.requests || [];

  // ── Articles stockés ─────────────────────────────────────────
  const [artSearch, setArtSearch] = useState('');
  const [artFilter, setArtFilter] = useState('');
  const [showAddArt, setShowAddArt] = useState(false);
  const [artForm, setArtForm] = useState({ title:'', reference:'', category:'', quality_grade:'', quantity:1, unit:'u.', unit_price:'', weight_kg:'', volume_m3:'', zone:'', shelf:'', seller_company:'', condition_notes:'' });

  const { data: artData, refetch: refetchArt } = useQuery(
    ['warehouse-articles', id, artFilter, artSearch],
    () => {
      const p = new URLSearchParams();
      if (artFilter) p.set('status', artFilter);
      if (artSearch) p.set('search', artSearch);
      return api.get('/warehouses/' + id + '/articles?' + p.toString()).then(r => r.data);
    },
    { staleTime: 20000 }
  );
  const articles   = artData?.articles || [];
  const artStats   = artData?.stats || {};

  // ── Mutations ─────────────────────────────────────────────────
  const updateMutation = useMutation(
    (data) => api.put('/warehouses/' + id, data),
    {
      onSuccess: () => {
        qc.invalidateQueries(['warehouse', id]);
        qc.invalidateQueries('admin-warehouses');
        toast.success('✅ Entrepôt mis à jour.');
        setEditMode(false);
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur mise à jour'),
    }
  );

  const volumeMutation = useMutation(
    ({ used, delta }) => api.patch('/warehouses/' + id + '/volume', { used, delta }),
    {
      onSuccess: (res) => {
        qc.invalidateQueries(['warehouse', id]);
        qc.invalidateQueries('admin-warehouses');
        toast.success('📊 Volume mis à jour : ' + Number(res.data.warehouse.used).toFixed(1) + ' m³');
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur volume'),
    }
  );

  const statusMutation = useMutation(
    (status) => api.patch('/warehouses/' + id + '/status', { status }),
    {
      onSuccess: (res) => {
        qc.invalidateQueries(['warehouse', id]);
        qc.invalidateQueries('admin-warehouses');
        toast.info('Statut → ' + res.data.warehouse.status);
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur statut'),
    }
  );

  const deleteMutation = useMutation(
    () => api.delete('/warehouses/' + id),
    {
      onSuccess: () => {
        qc.invalidateQueries('admin-warehouses');
        toast.success('🗑️ Entrepôt supprimé.');
        navigate('/admin');
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur suppression'),
    }
  );

  const addArtMutation = useMutation(
    (data) => api.post('/warehouses/' + id + '/articles', data),
    {
      onSuccess: () => {
        qc.invalidateQueries(['warehouse-articles', id]);
        qc.invalidateQueries(['warehouse', id]);
        toast.success('Article ajouté avec succès.');
        setShowAddArt(false);
        setArtForm({ title:'', reference:'', category:'', quality_grade:'', quantity:1, unit:'u.', unit_price:'', weight_kg:'', volume_m3:'', zone:'', shelf:'', seller_company:'', condition_notes:'' });
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur ajout article'),
    }
  );

  const updateArtMutation = useMutation(
    ({ artId, data }) => api.put('/warehouses/' + id + '/articles/' + artId, data),
    {
      onSuccess: () => {
        qc.invalidateQueries(['warehouse-articles', id]);
        toast.success('Article mis à jour.');
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur'),
    }
  );

  const deleteArtMutation = useMutation(
    (artId) => api.delete('/warehouses/' + id + '/articles/' + artId),
    {
      onSuccess: () => {
        qc.invalidateQueries(['warehouse-articles', id]);
        qc.invalidateQueries(['warehouse', id]);
        toast.success('Article retiré.');
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur suppression'),
    }
  );

  const importFromReqMutation = useMutation(
    (requestId) => api.post('/warehouses/' + id + '/articles/from-request/' + requestId),
    {
      onSuccess: (res) => {
        qc.invalidateQueries(['warehouse-articles', id]);
        qc.invalidateQueries(['warehouse', id]);
        toast.success(res.data.message);
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur import'),
    }
  );

  const setf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  if (isLoading) return (
    <div style={{ background:C.cream, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:C.muted, fontSize:'0.9rem' }}>Chargement de l'entrepôt...</div>
    </div>
  );

  const pct     = wh.capacity > 0 ? Math.round((Number(wh.used||0) / Number(wh.capacity)) * 100) : 0;
  const barColor = pct > 85 ? C.urgent : pct > 60 ? C.orange : C.eco;
  const isActif  = wh.status === 'actif';

  const TABS = [
    { id:'overview', label:'Vue d\'ensemble' },
    { id:'stocks',   label:'Stocks & Capacité' },
    { id:'demandes', label:'Demandes (' + requests.length + ')' },
    { id:'articles', label:'📦 Articles stockés' },
    { id:'config',   label:'⚙️ Configuration' },
  ];

  const STATUTS = ['actif','inactif','maintenance','ouverture prévue'];
  const TYPES   = ['Industriel','Polyvalent','Frigorifique','Sécurisé','Extérieur'];

  const reqStats = {
    pending:   requests.filter(r => r.status === 'pending').length,
    confirmed: requests.filter(r => r.status === 'confirmed').length,
    active:    requests.filter(r => r.status === 'active').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  return (
    <div style={{ background:'#F6F1E7', minHeight:'100vh' }}>

      {/* ── HERO ── */}
      <div style={{ background:'linear-gradient(135deg,#1E3D0F 0%,#2D5A1B 55%,#1E3D0F 100%)', padding:'2rem 2rem 0', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:220, height:220, borderRadius:'50%', border:'1.5px solid rgba(126,168,106,0.15)', pointerEvents:'none' }}/>

        {/* Breadcrumb */}
        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', marginBottom:'1.2rem', fontSize:'0.8rem' }}>
          <Link to="/admin" style={{ color:'rgba(246,241,231,0.55)', textDecoration:'none' }}>⚙️ Admin</Link>
          <span style={{ color:'rgba(246,241,231,0.3)' }}>›</span>
          <Link to="/admin" style={{ color:'rgba(246,241,231,0.55)', textDecoration:'none' }}>Stockage</Link>
          <span style={{ color:'rgba(246,241,231,0.3)' }}>›</span>
          <span style={{ color:'#F6F1E7', fontWeight:600 }}>{wh.name}</span>
        </div>

        {/* Titre */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem', marginBottom:'1.5rem' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.7rem', marginBottom:'0.4rem' }}>
              <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2rem', fontWeight:700, color:'#F6F1E7', margin:0 }}>
                🏭 {wh.name}
              </h1>
              <span style={{ background:isActif?'rgba(39,174,96,0.3)':'rgba(230,126,34,0.3)', color:isActif?'#6EE7B7':'#FCD34D', fontSize:'0.72rem', fontWeight:700, padding:'0.2rem 0.7rem', borderRadius:100 }}>
                {(wh.status||'').toUpperCase()}
              </span>
            </div>
            <div style={{ color:'rgba(246,241,231,0.6)', fontSize:'0.88rem' }}>
              📍 {wh.address || wh.city} · {wh.id} · {wh.type}
            </div>
          </div>

          {/* Actions rapides */}
          <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
            <button onClick={() => setEditMode(!editMode)}
              style={{ background:editMode?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.1)', color:'#F6F1E7', border:'1px solid rgba(255,255,255,0.2)', padding:'0.6rem 1.2rem', borderRadius:100, fontSize:'0.82rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
              {editMode ? '✕ Annuler' : '✏️ Modifier'}
            </button>
            <button
              onClick={() => {
                const next = wh.status === 'actif' ? 'inactif' : 'actif';
                statusMutation.mutate(next);
              }}
              style={{ background: isActif?'rgba(220,38,38,0.2)':'rgba(39,174,96,0.2)', color:isActif?'#FCA5A5':'#6EE7B7', border:'1px solid '+(isActif?'rgba(220,38,38,0.3)':'rgba(39,174,96,0.3)'), padding:'0.6rem 1.2rem', borderRadius:100, fontSize:'0.82rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
              {isActif ? '⏸️ Suspendre' : '▶️ Activer'}
            </button>
          </div>
        </div>

        {/* KPIs hero */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'0.7rem', marginBottom:'0' }}>
          {[
            { icon:'📐', label:'Capacité',      value:fmt(wh.capacity)+' m³', color:'#F6F1E7' },
            { icon:'📦', label:'Volume stocké', value:fmt(wh.used)+' m³',     color:'#FCD34D' },
            { icon:'✅', label:'Volume libre',  value:fmt(Number(wh.capacity||0)-Number(wh.used||0))+' m³', color:'#6EE7B7' },
            { icon:'📊', label:'Occupation',    value:pct+'%',                color: pct>85?'#FCA5A5':pct>60?'#FDE68A':'#6EE7B7' },
            { icon:'🏢', label:'Surface',       value:fmt(wh.surface)+' m²',  color:'#93C5FD' },
          ].map(k => (
            <div key={k.label} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, padding:'0.85rem', textAlign:'center' }}>
              <div style={{ fontSize:'1.1rem', marginBottom:'0.3rem' }}>{k.icon}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:k.color, lineHeight:1 }}>{k.value}</div>
              <div style={{ fontSize:'0.65rem', color:'rgba(246,241,231,0.5)', marginTop:'0.2rem' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'0.3rem', marginTop:'1.2rem' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ padding:'0.6rem 1.2rem', border:'none', background:'transparent', cursor:'pointer', fontSize:'0.85rem', fontWeight:activeTab===t.id?700:400, color:activeTab===t.id?'#F6F1E7':'rgba(246,241,231,0.5)', borderBottom:activeTab===t.id?'3px solid #7EA86A':'3px solid transparent', fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENU ── */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'2rem 2rem 4rem' }}>

        {/* ═══════════ TAB : VUE D'ENSEMBLE ═══════════ */}
        {activeTab === 'overview' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>

            {/* Infos générales */}
            <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, overflow:'hidden', boxShadow:'0 2px 12px rgba(30,61,15,0.06)' }}>
              <div style={{ background:C.forest, padding:'0.9rem 1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:700, fontSize:'0.9rem', color:C.cream }}>📋 Informations générales</span>
              </div>
              <div style={{ padding:'1.2rem' }}>
                {[
                  ['🏭 Nom', wh.name],
                  ['📍 Ville', wh.city],
                  ['🗺️ Adresse', wh.address || '—'],
                  ['🔧 Type', wh.type || '—'],
                  ['🕐 Horaires', wh.ouverture || '—'],
                  ['👤 Responsable', wh.responsable || '—'],
                  ['📞 Téléphone', wh.phone || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'0.55rem 0', borderBottom:'1px solid '+C.beige, fontSize:'0.85rem', gap:'1rem' }}>
                    <span style={{ color:C.muted, flexShrink:0 }}>{k}</span>
                    <span style={{ color:C.forest, fontWeight:500, textAlign:'right' }}>{v}</span>
                  </div>
                ))}
                {wh.notes && (
                  <div style={{ marginTop:'0.8rem', background:C.cream, borderRadius:8, padding:'0.7rem 0.9rem', fontSize:'0.82rem', color:C.muted, fontStyle:'italic' }}>
                    ℹ️ {wh.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Capacité + demandes actives */}
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {/* Jauge capacité */}
              <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, overflow:'hidden', boxShadow:'0 2px 12px rgba(30,61,15,0.06)' }}>
                <div style={{ background:C.leaf, padding:'0.9rem 1.2rem' }}>
                  <span style={{ fontWeight:700, fontSize:'0.9rem', color:'#fff' }}>📊 Capacité en temps réel</span>
                </div>
                <div style={{ padding:'1.2rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem', fontSize:'0.85rem' }}>
                    <span style={{ color:C.muted }}>Volume occupé</span>
                    <span style={{ fontWeight:700, color:barColor }}>{fmt(wh.used)} / {fmt(wh.capacity)} m³ ({pct}%)</span>
                  </div>
                  <div style={{ background:C.beige, borderRadius:100, height:14, overflow:'hidden', marginBottom:'1rem', position:'relative' }}>
                    <div style={{ width:pct+'%', height:'100%', background:'linear-gradient(90deg,'+C.forest+','+barColor+')', borderRadius:100, transition:'width 0.6s ease' }}/>
                    <div style={{ position:'absolute', top:0, left:0, right:0, bottom:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:700, color:pct>40?'#fff':C.forest }}>
                      {pct}%
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.5rem' }}>
                    {[
                      ['Libre',   (Number(wh.capacity||0)-Number(wh.used||0)).toFixed(1)+' m³', C.eco],
                      ['Occupé',  Number(wh.used||0).toFixed(1)+' m³', C.orange],
                      ['Surface', fmt(wh.surface)+' m²', C.blue],
                    ].map(([l,v,c]) => (
                      <div key={l} style={{ background:C.cream, borderRadius:8, padding:'0.5rem', textAlign:'center' }}>
                        <div style={{ fontSize:'0.65rem', color:C.muted }}>{l}</div>
                        <div style={{ fontSize:'0.88rem', fontWeight:700, color:c }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Mise à jour rapide du volume */}
                  <div style={{ marginTop:'1rem', display:'flex', gap:'0.5rem', alignItems:'center' }}>
                    <input
                      type="number"
                      defaultValue={wh.used}
                      id="volumeInput"
                      placeholder="Volume occupé"
                      style={{ flex:1, padding:'0.5rem 0.7rem', border:'1.5px solid '+C.mid, borderRadius:8, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none' }}
                    />
                    <button
                      onClick={() => {
                        const val = document.getElementById('volumeInput').value;
                        if (!isNaN(val)) volumeMutation.mutate({ used: Number(val) });
                      }}
                      disabled={volumeMutation.isLoading}
                      style={{ background:C.leaf, color:'#fff', border:'none', borderRadius:8, padding:'0.5rem 0.9rem', fontSize:'0.8rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap' }}>
                      📊 Mettre à jour
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats demandes */}
              <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, overflow:'hidden', boxShadow:'0 2px 12px rgba(30,61,15,0.06)' }}>
                <div style={{ background:C.blue, padding:'0.9rem 1.2rem' }}>
                  <span style={{ fontWeight:700, fontSize:'0.9rem', color:'#fff' }}>🏢 Demandes de stockage</span>
                </div>
                <div style={{ padding:'1rem 1.2rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
                  {[
                    ['⏳ En attente', reqStats.pending,   C.orange],
                    ['✅ Confirmées', reqStats.confirmed, C.blue],
                    ['🟢 Actives',    reqStats.active,    C.eco],
                    ['🔵 Terminées',  reqStats.completed, '#8B5CF6'],
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ background:C.cream, borderRadius:10, padding:'0.6rem 0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:'0.78rem', color:C.muted }}>{l}</span>
                      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:c }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alertes */}
              {pct > 85 && (
                <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:14, padding:'1rem', display:'flex', gap:'0.8rem' }}>
                  <span style={{ fontSize:'1.3rem' }}>🔴</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'0.88rem', color:C.urgent, marginBottom:3 }}>Alerte saturation</div>
                    <div style={{ fontSize:'0.78rem', color:'#991B1B' }}>L'entrepôt est à {pct}% de sa capacité. Envisagez d'augmenter la capacité ou de transférer du stock.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ TAB : STOCKS & CAPACITÉ ═══════════ */}
        {activeTab === 'stocks' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem', marginBottom:'1.5rem' }}>
              {[
                { icon:'📦', label:'Stock total estimé', value:fmt(wh.used)+' m³', sub:'Volume actuellement stocké', color:C.orange },
                { icon:'✅', label:'Capacité disponible', value:fmt(Number(wh.capacity||0)-Number(wh.used||0))+' m³', sub:'Prêt à recevoir du stock', color:C.eco },
                { icon:'💰', label:'Revenu mensuel estimé', value:fmt(Math.round(Number(wh.used||0)*15))+' MAD', sub:'À 15 MAD/m³/mois', color:'#8B5CF6' },
              ].map(k => (
                <div key={k.label} style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:16, padding:'1.2rem', boxShadow:'0 2px 10px rgba(30,61,15,0.05)' }}>
                  <div style={{ fontSize:'1.5rem', marginBottom:'0.5rem' }}>{k.icon}</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', fontWeight:700, color:k.color }}>{k.value}</div>
                  <div style={{ fontWeight:600, fontSize:'0.85rem', color:C.forest, marginBottom:2 }}>{k.label}</div>
                  <div style={{ fontSize:'0.75rem', color:C.muted }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Jauge détaillée */}
            <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, padding:'1.5rem', marginBottom:'1.5rem', boxShadow:'0 2px 10px rgba(30,61,15,0.05)' }}>
              <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:C.forest, marginBottom:'1.2rem' }}>
                📊 Visualisation de la capacité
              </h3>
              <div style={{ background:C.beige, borderRadius:12, height:40, overflow:'hidden', marginBottom:'0.8rem', position:'relative' }}>
                <div style={{ position:'absolute', left:0, top:0, height:'100%', width:pct+'%', background:'linear-gradient(90deg,#1E3D0F,'+barColor+')', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:'0.5rem' }}>
                  {pct > 10 && <span style={{ color:'#fff', fontSize:'0.82rem', fontWeight:700 }}>{pct}%</span>}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.5rem', fontSize:'0.8rem', color:C.muted, textAlign:'center' }}>
                <div>0 m³</div>
                <div>{fmt(Number(wh.capacity)*0.25)} m³ (25%)</div>
                <div>{fmt(Number(wh.capacity)*0.5)} m³ (50%)</div>
                <div>{fmt(wh.capacity)} m³ (100%)</div>
              </div>
            </div>

            {/* Modifier le volume */}
            <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, padding:'1.5rem', boxShadow:'0 2px 10px rgba(30,61,15,0.05)' }}>
              <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', color:C.forest, marginBottom:'1rem' }}>
                🔧 Gestion manuelle du volume
              </h3>
              <div style={{ display:'flex', gap:'0.8rem', flexWrap:'wrap', alignItems:'flex-end' }}>
                {[
                  { label:'Définir le volume occupé', btn:'Appliquer', action: (v) => volumeMutation.mutate({ used: Number(v) }), placeholder:'Ex: 350' },
                ].map(f => (
                  <div key={f.label} style={{ flex:1, minWidth:200 }}>
                    <label style={{ fontSize:'0.75rem', color:C.muted, display:'block', marginBottom:'0.3rem' }}>{f.label}</label>
                    <div style={{ display:'flex', gap:'0.4rem' }}>
                      <input
                        id={'vol-'+f.label}
                        type="number"
                        placeholder={f.placeholder}
                        defaultValue={wh.used}
                        style={{ flex:1, padding:'0.6rem 0.8rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none' }}
                      />
                      <button
                        onClick={() => {
                          const val = document.getElementById('vol-'+f.label).value;
                          if (!isNaN(val) && val !== '') f.action(val);
                        }}
                        disabled={volumeMutation.isLoading}
                        style={{ background:C.forest, color:C.cream, border:'none', borderRadius:10, padding:'0.6rem 1rem', fontSize:'0.8rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                        {volumeMutation.isLoading ? '⏳' : f.btn}
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ flex:1, minWidth:200 }}>
                  <label style={{ fontSize:'0.75rem', color:C.muted, display:'block', marginBottom:'0.3rem' }}>Ajout / Retrait relatif (delta)</label>
                  <div style={{ display:'flex', gap:'0.4rem' }}>
                    <input id="delta-vol" type="number" placeholder="Ex: +5 ou -3"
                      style={{ flex:1, padding:'0.6rem 0.8rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none' }}/>
                    <button onClick={() => {
                        const val = document.getElementById('delta-vol').value;
                        if (!isNaN(val) && val !== '') volumeMutation.mutate({ delta: Number(val) });
                      }}
                      disabled={volumeMutation.isLoading}
                      style={{ background:C.leaf, color:'#fff', border:'none', borderRadius:10, padding:'0.6rem 1rem', fontSize:'0.8rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                      ± Appliquer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ TAB : DEMANDES ═══════════ */}
        {activeTab === 'demandes' && (
          <div>
            <div style={{ marginBottom:'1rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', color:C.forest }}>
                Demandes liées à {wh.name}
              </h3>
              <Link to="/admin" style={{ fontSize:'0.82rem', color:C.leaf, textDecoration:'none', fontWeight:600 }}>
                ← Voir toutes les demandes
              </Link>
            </div>

            {requests.length === 0 ? (
              <div style={{ textAlign:'center', padding:'4rem', background:C.white, borderRadius:18, border:'1px solid '+C.mid, color:C.muted }}>
                <div style={{ fontSize:'3rem', opacity:0.2, marginBottom:'0.5rem' }}>📭</div>
                Aucune demande de stockage liée à cet entrepôt
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem' }}>
                {requests.map(req => {
                  const ST = {
                    pending:   { label:'⏳ En attente', color:C.orange, bg:'#FEF5E7' },
                    confirmed: { label:'✅ Confirmée',  color:C.blue,   bg:'#EBF5FB' },
                    active:    { label:'🟢 Active',     color:C.eco,    bg:'#E8F8EE' },
                    completed: { label:'🔵 Terminée',   color:'#8B5CF6',bg:'#F3E8FF' },
                    rejected:  { label:'❌ Refusée',    color:C.urgent, bg:'#FDECEA' },
                  };
                  const st = ST[req.status] || ST.pending;
                  return (
                    <div key={req.id} style={{ background:C.white, border:'1.5px solid '+(req.status==='pending'?C.orange:C.mid), borderRadius:16, padding:'1rem 1.2rem', boxShadow:'0 2px 8px rgba(30,61,15,0.05)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.6rem' }}>
                        <div>
                          <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:3 }}>
                            <span style={{ fontWeight:700, color:C.forest, fontSize:'0.95rem' }}>{req.seller_company || req.company_name}</span>
                            <span style={{ fontFamily:'monospace', fontSize:'0.7rem', color:C.muted, background:C.beige, padding:'0.1rem 0.45rem', borderRadius:5 }}>
                              {req.id?.substring(0,8).toUpperCase()}
                            </span>
                          </div>
                          <div style={{ fontSize:'0.78rem', color:C.muted }}>
                            👤 {req.contact_name} · 📍 {req.city} · 📐 {req.estimated_vol||'?'} m³
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:'0.6rem', alignItems:'center' }}>
                          <span style={{ background:st.bg, color:st.color, padding:'0.25rem 0.8rem', borderRadius:100, fontSize:'0.75rem', fontWeight:700 }}>
                            {st.label}
                          </span>
                          {req.estimated_revenue && (
                            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1rem', fontWeight:700, color:C.leaf }}>
                              {Number(req.estimated_revenue).toLocaleString('fr-MA')} MAD/mois
                            </span>
                          )}
                        </div>
                      </div>
                      {req.status === 'active' && (
                        <div style={{ marginTop:'0.7rem', display:'flex', gap:'0.5rem' }}>
                          <button onClick={() => generateBonChargement({ requestId:req.id, companyName:req.seller_company||req.company_name, contactName:req.contact_name, contactPhone:req.contact_phone, city:req.city, warehouseName:wh.name, warehouseCity:wh.city, deliveryMode:req.delivery_mode, estimatedVol:req.estimated_vol, wantPhotos:req.want_photos, wantCertif:req.want_certif, wantInventory:req.want_inventory })}
                            style={{ background:'#EFF6FF', color:C.blue, border:'1px solid #BFDBFE', padding:'0.35rem 0.8rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                            📦 Bon de chargement
                          </button>
                          <button onClick={() => generateBonDechargement({ requestId:req.id, orderId:req.id, companyName:req.seller_company||req.company_name, warehouseName:wh.name })}
                            style={{ background:'#FEF2F2', color:C.urgent, border:'1px solid #FECACA', padding:'0.35rem 0.8rem', borderRadius:100, fontSize:'0.75rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                            📤 Bon de déchargement
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {/* ═══════════ TAB : ARTICLES STOCKÉS ═══════════ */}
        {activeTab === 'articles' && (
          <div>
            {/* Header + KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.75rem', marginBottom:'1.2rem' }}>
              {[
                { icon:'📦', label:'Total articles',    value:artStats.total||0,                                            color:C.forest },
                { icon:'✅', label:'En stock',          value:artStats.en_stock||0,                                         color:C.eco    },
                { icon:'🔒', label:'Réservés',          value:artStats.reserve||0,                                          color:C.blue   },
                { icon:'💰', label:'Valeur estimée',    value:Number(artStats.total_val||0).toLocaleString('fr-MA')+' MAD', color:'#8B5CF6'},
              ].map(k => (
                <div key={k.label} style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:14, padding:'0.9rem', textAlign:'center', boxShadow:'0 2px 8px rgba(30,61,15,0.05)' }}>
                  <div style={{ fontSize:'1.2rem', marginBottom:'0.3rem' }}>{k.icon}</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', fontWeight:700, color:k.color, lineHeight:1 }}>{k.value}</div>
                  <div style={{ fontSize:'0.68rem', color:C.muted, marginTop:'0.2rem' }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Barre d'outils */}
            <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:14, padding:'0.8rem 1rem', marginBottom:'1rem', display:'flex', gap:'0.6rem', flexWrap:'wrap', alignItems:'center', boxShadow:'0 2px 8px rgba(30,61,15,0.05)' }}>
              <input value={artSearch} onChange={e => setArtSearch(e.target.value)}
                placeholder="🔍 Désignation, référence, catégorie..."
                style={{ flex:1, minWidth:180, padding:'0.45rem 0.9rem', border:'1.5px solid '+C.mid, borderRadius:100, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream }}/>
              <select value={artFilter} onChange={e => setArtFilter(e.target.value)}
                style={{ padding:'0.45rem 0.8rem', border:'1px solid '+C.mid, borderRadius:100, fontSize:'0.82rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.cream, cursor:'pointer' }}>
                <option value="">Tous les statuts</option>
                <option value="en_stock">✅ En stock</option>
                <option value="reserve">🔒 Réservé</option>
                <option value="expedie">🚛 Expédié</option>
                <option value="sorti">📤 Sorti</option>
              </select>
              <button onClick={() => refetchArt()}
                style={{ background:C.beige, color:C.forest, border:'1px solid '+C.mid, padding:'0.45rem 0.8rem', borderRadius:100, fontSize:'0.8rem', cursor:'pointer' }}>
                🔄
              </button>

              {/* Import depuis demande active */}
              {requests.filter(r => r.status === 'active').length > 0 && (
                <select onChange={e => { if (e.target.value) importFromReqMutation.mutate(e.target.value); e.target.value=''; }}
                  disabled={importFromReqMutation.isLoading}
                  style={{ padding:'0.45rem 0.8rem', border:'1.5px solid '+C.leaf, borderRadius:100, fontSize:'0.8rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:'#ECFDF5', color:C.eco, cursor:'pointer' }}>
                  <option value="">📥 Importer depuis demande...</option>
                  {requests.filter(r => r.status === 'active').map(r => (
                    <option key={r.id} value={r.id}>
                      {r.seller_company || r.company_name} — {r.estimated_vol||'?'} m³
                    </option>
                  ))}
                </select>
              )}

              <button onClick={() => setShowAddArt(!showAddArt)}
                style={{ background:C.forest, color:C.cream, border:'none', padding:'0.45rem 1.1rem', borderRadius:100, fontSize:'0.82rem', cursor:'pointer', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                + Ajouter un article
              </button>
            </div>

            {/* Formulaire ajout rapide */}
            {showAddArt && (
              <div style={{ background:C.white, border:'1.5px solid '+C.leaf, borderRadius:16, padding:'1.2rem', marginBottom:'1rem', boxShadow:'0 4px 16px rgba(30,61,15,0.08)' }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:C.forest, marginBottom:'1rem' }}>
                  📦 Ajouter un article dans l'entrepôt
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'0.7rem', marginBottom:'0.7rem' }}>
                  {[
                    { key:'title',           label:'Désignation *',    placeholder:'Pompe centrifuge GRUNDFOS',         full:true },
                    { key:'reference',       label:'Référence',        placeholder:'REF-001'                                    },
                    { key:'category',        label:'Catégorie',        placeholder:'Pompes'                                     },
                    { key:'quality_grade',   label:'Grade',            placeholder:'A'                                          },
                  ].map(f => (
                    <div key={f.key} style={{ gridColumn:f.full?'1/-1':'auto' }}>
                      <label style={{ fontSize:'0.72rem', color:C.muted, display:'block', marginBottom:'0.25rem' }}>{f.label}</label>
                      <input value={artForm[f.key]} onChange={e => setArtForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        style={{ width:'100%', padding:'0.5rem 0.7rem', border:'1.5px solid '+C.mid, borderRadius:8, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' }}/>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr 1fr', gap:'0.6rem', marginBottom:'0.7rem' }}>
                  {[
                    { key:'quantity',    label:'Quantité',     type:'number', placeholder:'1'      },
                    { key:'unit',        label:'Unité',        type:'text',   placeholder:'u.'     },
                    { key:'unit_price',  label:'Prix unit. MAD',type:'number',placeholder:'5000'   },
                    { key:'weight_kg',   label:'Poids (kg)',   type:'number', placeholder:'12.5'   },
                    { key:'volume_m3',   label:'Volume (m³)',  type:'number', placeholder:'0.05'   },
                    { key:'zone',        label:'Zone/Allée',   type:'text',   placeholder:'Zone A' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize:'0.72rem', color:C.muted, display:'block', marginBottom:'0.25rem' }}>{f.label}</label>
                      <input type={f.type} value={artForm[f.key]} onChange={e => setArtForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        style={{ width:'100%', padding:'0.5rem 0.7rem', border:'1.5px solid '+C.mid, borderRadius:8, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' }}/>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem', marginBottom:'0.85rem' }}>
                  <div>
                    <label style={{ fontSize:'0.72rem', color:C.muted, display:'block', marginBottom:'0.25rem' }}>Entreprise propriétaire</label>
                    <input value={artForm.seller_company} onChange={e => setArtForm(p => ({ ...p, seller_company: e.target.value }))}
                      placeholder="IMACID SA"
                      style={{ width:'100%', padding:'0.5rem 0.7rem', border:'1.5px solid '+C.mid, borderRadius:8, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:'0.72rem', color:C.muted, display:'block', marginBottom:'0.25rem' }}>Observations / État</label>
                    <input value={artForm.condition_notes} onChange={e => setArtForm(p => ({ ...p, condition_notes: e.target.value }))}
                      placeholder="Légères traces d'utilisation..."
                      style={{ width:'100%', padding:'0.5rem 0.7rem', border:'1.5px solid '+C.mid, borderRadius:8, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' }}/>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'0.6rem' }}>
                  <button onClick={() => addArtMutation.mutate({ ...artForm, warehouse_id: id })}
                    disabled={!artForm.title || addArtMutation.isLoading}
                    style={{ background:C.forest, color:C.cream, border:'none', padding:'0.65rem 1.5rem', borderRadius:100, fontWeight:700, fontSize:'0.88rem', cursor:!artForm.title?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", opacity:!artForm.title?0.5:1 }}>
                    {addArtMutation.isLoading ? '⏳ Ajout...' : '+ Confirmer ajout'}
                  </button>
                  <button onClick={() => setShowAddArt(false)}
                    style={{ background:'transparent', color:C.muted, border:'1.5px solid '+C.mid, padding:'0.65rem 1.2rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Liste des articles */}
            {articles.length === 0 ? (
              <div style={{ textAlign:'center', padding:'4rem', background:C.white, borderRadius:18, border:'1px solid '+C.mid, color:C.muted }}>
                <div style={{ fontSize:'3.5rem', opacity:0.15, marginBottom:'0.5rem' }}>📭</div>
                <div style={{ fontWeight:600, marginBottom:'0.4rem' }}>Aucun article stocké</div>
                <div style={{ fontSize:'0.82rem' }}>Ajoutez des articles manuellement ou importez depuis une demande de stockage active.</div>
              </div>
            ) : (
              <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, overflow:'hidden', boxShadow:'0 2px 10px rgba(30,61,15,0.05)' }}>
                {/* En-tête tableau */}
                <div style={{ display:'grid', gridTemplateColumns:'2.5fr 1fr 0.8fr 0.8fr 0.8fr 1fr 1.2fr', gap:'0.4rem', padding:'0.7rem 1rem', background:C.beige, borderBottom:'1px solid '+C.mid, fontSize:'0.68rem', fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.04em', alignItems:'center' }}>
                  <div>Désignation</div>
                  <div>Grade</div>
                  <div>Qté</div>
                  <div>Volume</div>
                  <div>Valeur</div>
                  <div>Statut</div>
                  <div>Actions</div>
                </div>

                {articles.map((art, i) => {
                  const STATUS_ART = {
                    en_stock: { label:'✅ En stock',   color:C.eco,    bg:'#E8F8EE' },
                    reserve:  { label:'🔒 Réservé',    color:C.blue,   bg:'#EBF5FB' },
                    expedie:  { label:'🚛 Expédié',    color:C.orange, bg:'#FEF5E7' },
                    sorti:    { label:'📤 Sorti',      color:'#8B5CF6',bg:'#F3E8FF' },
                    perdu:    { label:'❓ Perdu',      color:C.urgent, bg:'#FDECEA' },
                  };
                  const st = STATUS_ART[art.status] || STATUS_ART.en_stock;
                  const GRADE_C = {'A+':C.eco,'A':C.blue,'B':C.orange,'C':C.urgent,'D':'#7F8C8D'};
                  const gc = GRADE_C[art.quality_grade];
                  const val = Number(art.unit_price||0) * Number(art.quantity||0);

                  return (
                    <div key={art.id}
                      style={{ display:'grid', gridTemplateColumns:'2.5fr 1fr 0.8fr 0.8fr 0.8fr 1fr 1.2fr', gap:'0.4rem', padding:'0.7rem 1rem', borderBottom:'1px solid '+C.beige, alignItems:'center', background:i%2===0?C.white:C.cream }}>

                      {/* Désignation */}
                      <div>
                        <div style={{ fontWeight:600, color:C.forest, fontSize:'0.85rem', lineHeight:1.3 }}>
                          {art.title?.substring(0,42)}{art.title?.length>42?'...':''}
                        </div>
                        <div style={{ fontSize:'0.7rem', color:C.muted, marginTop:1 }}>
                          {art.reference && <span style={{ fontFamily:'monospace' }}>Réf: {art.reference}</span>}
                          {art.seller_company && <span> · 🏭 {art.seller_company}</span>}
                          {(art.zone || art.shelf) && <span> · 📍 {[art.zone, art.shelf].filter(Boolean).join(' / ')}</span>}
                        </div>
                        {art.condition_notes && (
                          <div style={{ fontSize:'0.68rem', color:C.muted, fontStyle:'italic', marginTop:1 }}>{art.condition_notes.substring(0,60)}</div>
                        )}
                      </div>

                      {/* Grade */}
                      <div>
                        {gc ? (
                          <span style={{ background:gc+'22', color:gc, padding:'0.15rem 0.55rem', borderRadius:100, fontSize:'0.72rem', fontWeight:700 }}>
                            Grade {art.quality_grade}
                          </span>
                        ) : <span style={{ color:C.muted, fontSize:'0.75rem' }}>—</span>}
                      </div>

                      {/* Quantité */}
                      <div style={{ fontWeight:700, color:C.forest, fontSize:'0.88rem' }}>
                        {art.quantity}<span style={{ fontSize:'0.7rem', fontWeight:400, color:C.muted }}> {art.unit}</span>
                      </div>

                      {/* Volume */}
                      <div style={{ fontSize:'0.82rem', color:C.muted }}>
                        {art.volume_m3 ? Number(art.volume_m3).toFixed(3)+' m³' : '—'}
                      </div>

                      {/* Valeur */}
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, color:C.leaf, fontSize:'0.9rem' }}>
                        {val > 0 ? Number(val).toLocaleString('fr-MA')+' MAD' : '—'}
                      </div>

                      {/* Statut */}
                      <div>
                        <select value={art.status}
                          onChange={e => updateArtMutation.mutate({ artId: art.id, data: { status: e.target.value, sortie_date: ['sorti','expedie'].includes(e.target.value) ? new Date().toISOString().split('T')[0] : null } })}
                          style={{ background:st.bg, color:st.color, border:'none', borderRadius:100, padding:'0.2rem 0.6rem', fontSize:'0.72rem', fontWeight:700, cursor:'pointer', outline:'none', fontFamily:"'DM Sans',sans-serif" }}>
                          <option value="en_stock">✅ En stock</option>
                          <option value="reserve">🔒 Réservé</option>
                          <option value="expedie">🚛 Expédié</option>
                          <option value="sorti">📤 Sorti</option>
                          <option value="perdu">❓ Perdu</option>
                        </select>
                      </div>

                      {/* Actions */}
                      <div style={{ display:'flex', gap:'0.3rem' }}>
                        <button
                          onClick={() => {
                            const newZone = prompt('Zone / Allée :', art.zone || '');
                            const newShelf = prompt('Étagère :', art.shelf || '');
                            if (newZone !== null || newShelf !== null) {
                              updateArtMutation.mutate({ artId: art.id, data: { zone: newZone||art.zone, shelf: newShelf||art.shelf } });
                            }
                          }}
                          style={{ background:C.beige, color:C.forest, border:'none', padding:'0.3rem 0.55rem', borderRadius:100, fontSize:'0.72rem', cursor:'pointer' }}
                          title="Modifier emplacement">
                          📍
                        </button>
                        <button
                          onClick={() => {
                            const newQty = prompt('Quantité :', art.quantity);
                            if (newQty !== null && !isNaN(newQty)) {
                              updateArtMutation.mutate({ artId: art.id, data: { quantity: Number(newQty) } });
                            }
                          }}
                          style={{ background:'#EFF6FF', color:C.blue, border:'none', padding:'0.3rem 0.55rem', borderRadius:100, fontSize:'0.72rem', cursor:'pointer' }}
                          title="Modifier quantité">
                          ✏️
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Retirer "' + art.title?.substring(0,30) + '" de l\'entrepôt ?')) {
                              deleteArtMutation.mutate(art.id);
                            }
                          }}
                          style={{ background:'#FEF2F2', color:C.urgent, border:'none', padding:'0.3rem 0.55rem', borderRadius:100, fontSize:'0.72rem', cursor:'pointer' }}
                          title="Retirer">
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Footer totaux */}
                <div style={{ display:'grid', gridTemplateColumns:'2.5fr 1fr 0.8fr 0.8fr 0.8fr 1fr 1.2fr', gap:'0.4rem', padding:'0.7rem 1rem', background:C.forest, fontSize:'0.8rem', fontWeight:700, alignItems:'center' }}>
                  <div style={{ color:C.cream }}>{articles.length} article(s)</div>
                  <div></div>
                  <div style={{ color:C.cream }}>{articles.reduce((s,a) => s+Number(a.quantity||0),0)} unités</div>
                  <div style={{ color:'#FCD34D' }}>{Number(artStats.total_vol||0).toFixed(2)} m³</div>
                  <div style={{ color:'#6EE7B7', fontFamily:"'Cormorant Garamond',serif", fontSize:'0.95rem' }}>{Number(artStats.total_val||0).toLocaleString('fr-MA')} MAD</div>
                  <div></div>
                  <div></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ TAB : CONFIGURATION ═══════════ */}
        {activeTab === 'config' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>

            {/* Formulaire d'édition */}
            <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, overflow:'hidden', boxShadow:'0 2px 10px rgba(30,61,15,0.05)' }}>
              <div style={{ background:C.forest, padding:'0.9rem 1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:700, fontSize:'0.9rem', color:C.cream }}>✏️ Modifier l'entrepôt</span>
                {!editMode && (
                  <button onClick={() => setEditMode(true)}
                    style={{ background:'rgba(255,255,255,0.15)', color:C.cream, border:'none', borderRadius:100, padding:'0.3rem 0.8rem', fontSize:'0.75rem', cursor:'pointer' }}>
                    Modifier
                  </button>
                )}
              </div>
              <div style={{ padding:'1.2rem' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {[
                    { key:'name',        label:'Nom *',          type:'text',   placeholder:'Entrepôt Ain Sebaâ' },
                    { key:'city',        label:'Ville *',         type:'text',   placeholder:'Casablanca' },
                    { key:'address',     label:'Adresse',         type:'text',   placeholder:'Zone industrielle...' },
                    { key:'responsable', label:'Responsable',     type:'text',   placeholder:'Prénom Nom' },
                    { key:'phone',       label:'Téléphone',       type:'text',   placeholder:'+212 6XX XXX XXX' },
                    { key:'ouverture',   label:'Horaires',        type:'text',   placeholder:'Lun-Sam 8h-17h' },
                    { key:'capacity',    label:'Capacité (m³) *', type:'number', placeholder:'500' },
                    { key:'surface',     label:'Surface (m²)',    type:'number', placeholder:'800' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize:'0.72rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.25rem' }}>{f.label}</label>
                      <input
                        type={f.type}
                        value={form[f.key] || ''}
                        onChange={e => setf(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        disabled={!editMode}
                        style={{ width:'100%', padding:'0.55rem 0.8rem', border:'1.5px solid '+(editMode?C.mid:'#EDE6D3'), borderRadius:8, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:editMode?C.white:C.cream, boxSizing:'border-box', color:editMode?C.forest:C.muted }}
                      />
                    </div>
                  ))}

                  <div>
                    <label style={{ fontSize:'0.72rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.25rem' }}>Type</label>
                    <select value={form.type||'Industriel'} onChange={e => setf('type', e.target.value)} disabled={!editMode}
                      style={{ width:'100%', padding:'0.55rem 0.8rem', border:'1.5px solid '+(editMode?C.mid:'#EDE6D3'), borderRadius:8, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:editMode?C.white:C.cream, color:editMode?C.forest:C.muted }}>
                      {TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize:'0.72rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.25rem' }}>Statut</label>
                    <select value={form.status||'actif'} onChange={e => setf('status', e.target.value)} disabled={!editMode}
                      style={{ width:'100%', padding:'0.55rem 0.8rem', border:'1.5px solid '+(editMode?C.mid:'#EDE6D3'), borderRadius:8, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:editMode?C.white:C.cream, color:editMode?C.forest:C.muted }}>
                      {STATUTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize:'0.72rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.25rem' }}>Notes & équipements</label>
                    <textarea value={form.notes||''} onChange={e => setf('notes', e.target.value)} disabled={!editMode} rows={3}
                      placeholder="Pont roulant, rampe chargement..."
                      style={{ width:'100%', padding:'0.55rem 0.8rem', border:'1.5px solid '+(editMode?C.mid:'#EDE6D3'), borderRadius:8, fontSize:'0.82rem', fontFamily:"'DM Sans',sans-serif", outline:'none', resize:'vertical', background:editMode?C.white:C.cream, color:editMode?C.forest:C.muted, boxSizing:'border-box' }}/>
                  </div>

                  {editMode && (
                    <div style={{ display:'flex', gap:'0.6rem', marginTop:'0.3rem' }}>
                      <button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isLoading}
                        style={{ flex:1, background:C.forest, color:C.cream, border:'none', padding:'0.75rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                        {updateMutation.isLoading ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
                      </button>
                      <button onClick={() => { setEditMode(false); setForm(wh); }}
                        style={{ background:'transparent', color:C.muted, border:'1.5px solid '+C.mid, padding:'0.75rem 1.2rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Zone danger + dates */}
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {/* Dernière mise à jour */}
              <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, overflow:'hidden' }}>
                <div style={{ background:C.blue, padding:'0.9rem 1.2rem' }}>
                  <span style={{ fontWeight:700, fontSize:'0.9rem', color:'#fff' }}>📅 Historique</span>
                </div>
                <div style={{ padding:'1rem 1.2rem' }}>
                  {[
                    ['📅 Créé le', fmtD(wh.created_at)],
                    ['🔄 Dernière modif.', fmtD(wh.updated_at)],
                    ['🆔 Identifiant', wh.id],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0', borderBottom:'1px solid '+C.beige, fontSize:'0.83rem' }}>
                      <span style={{ color:C.muted }}>{k}</span>
                      <span style={{ fontWeight:600, color:C.forest, fontFamily:'monospace' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Zone danger */}
              <div style={{ background:'#FEF2F2', border:'1.5px solid #FECACA', borderRadius:18, overflow:'hidden' }}>
                <div style={{ background:C.urgent, padding:'0.9rem 1.2rem' }}>
                  <span style={{ fontWeight:700, fontSize:'0.9rem', color:'#fff' }}>⚠️ Zone de danger</span>
                </div>
                <div style={{ padding:'1.2rem' }}>
                  <div style={{ marginBottom:'0.8rem', fontSize:'0.82rem', color:'#991B1B', lineHeight:1.6 }}>
                    La suppression est définitive. Elle sera bloquée si des demandes actives sont liées à cet entrepôt.
                  </div>
                  <button onClick={() => {
                      if (window.confirm('Supprimer définitivement l\'entrepôt "' + wh.name + '" ? Cette action est irréversible.')) {
                        deleteMutation.mutate();
                      }
                    }}
                    disabled={deleteMutation.isLoading}
                    style={{ width:'100%', background:'#FEF2F2', color:C.urgent, border:'2px solid '+C.urgent, padding:'0.7rem', borderRadius:100, fontWeight:700, fontSize:'0.88rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                    🗑️ Supprimer cet entrepôt
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
