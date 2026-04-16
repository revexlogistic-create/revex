// src/pages/seller/InventaireRequest.jsx
// Page demande d'inventaire physique REVEX pour le vendeur

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { generateInvoicePdf } from '../../utils/generateInvoice';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9',
};

const fmt = d => d ? new Date(d).toLocaleDateString('fr-MA', { day:'2-digit', month:'long', year:'numeric' }) : '—';

const STATUS_CONFIG = {
  pending:     { label:'⏳ En attente',       color:C.orange, bg:'#FEF5E7', step:1 },
  confirmed:   { label:'✅ Confirmée',         color:C.blue,   bg:'#EBF5FB', step:2 },
  scheduled:   { label:'📅 Planifiée',         color:'#8B5CF6',bg:'#F3E8FF', step:3 },
  in_progress: { label:'🔄 En cours',          color:C.eco,    bg:'#E8F8EE', step:4 },
  completed:   { label:'🏁 Terminé',           color:'#059669',bg:'#ECFDF5', step:5 },
  cancelled:   { label:'❌ Annulée',           color:C.urgent, bg:'#FDECEA', step:0 },
};

const INVENTORY_TYPES = [
  'Inventaire général annuel',
  'Inventaire tournant (partiel)',
  'Inventaire de prise en charge',
  'Inventaire avant cession / fusion',
  'Audit stock PDR critique',
  'Inventaire pour assurance',
];

const TARIFS = {
  base:     800,   // par jour de staff
  staff:    400,   // par personne supplémentaire
  rapport:  300,   // rapport numérique
  certif:   200,   // certificat REVEX
  photos:   150,   // photos professionnelles
};

function calcDevis(form) {
  const refs = Number(form.nb_references_est || 100);
  const days = refs <= 100 ? 1 : refs <= 500 ? 2 : refs <= 1500 ? 3 : Math.ceil(refs / 500);
  const staff = Number(form.nb_staff_needed || 2);
  const base   = days * TARIFS.base;
  const supStaff = Math.max(0, staff - 1) * TARIFS.staff * days;
  const opts   = (form.wantRapport ? TARIFS.rapport : 0)
               + (form.wantCertif  ? TARIFS.certif  : 0)
               + (form.wantPhotos  ? TARIFS.photos   : 0);
  const ht   = base + supStaff + opts;
  const tva  = Math.round(ht * 0.2);
  return { days, staff, base, supStaff, opts, ht, tva, ttc: ht + tva };
}

export default function InventaireRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    company_name:     user?.company_name || '',
    contact_name:     user?.contact_name || '',
    phone:            user?.phone || '',
    address:          '',
    city:             user?.city || '',
    inventory_type:   INVENTORY_TYPES[0],
    nb_references_est:100,
    nb_staff_needed:  2,
    site_access:      '',
    scheduled_date:   '',
    notes:            '',
    wantRapport:      true,
    wantCertif:       true,
    wantPhotos:       false,
  });

  const setf = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const devis = calcDevis(form);

  // ── Mes demandes existantes ──────────────────────────────────
  const { data, isLoading } = useQuery(
    'my-inventaire-requests',
    () => api.get('/services/me').then(r => r.data),
    { staleTime: 30000 }
  );
  const requests = (data?.services || []).filter(s => s.type === 'inventory');

  // ── Mutation création ────────────────────────────────────────
  const createMutation = useMutation(
    (payload) => api.post('/services', payload),
    {
      onSuccess: () => {
        qc.invalidateQueries('my-inventaire-requests');
        toast.success('✅ Demande d\'inventaire envoyée ! Notre équipe vous contacte sous 24h.');
        setShowForm(false);
        setForm(f => ({ ...f, notes:'', scheduled_date:'', address:'' }));
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur lors de l\'envoi'),
    }
  );

  const handleSubmit = () => {
    if (!form.phone || !form.city) {
      toast.error('Téléphone et ville sont obligatoires');
      return;
    }
    createMutation.mutate({
      type:             'inventory',
      company_name:     form.company_name,
      contact_name:     form.contact_name,
      phone:            form.phone,
      address:          form.address,
      city:             form.city,
      inventory_type:   form.inventory_type,
      nb_references_est:Number(form.nb_references_est),
      nb_staff_needed:  Number(form.nb_staff_needed),
      site_access:      form.site_access,
      scheduled_date:   form.scheduled_date || null,
      notes:            form.notes,
    });
  };

  return (
    <div style={{ background:C.cream, minHeight:'100vh' }}>

      {/* ── HERO ── */}
      <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', padding:'2rem 2rem 1.5rem', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', border:'1.5px solid rgba(126,168,106,0.12)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <Link to="/seller/stock"
                style={{ color:'rgba(246,241,231,0.5)', fontSize:'0.78rem', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'0.4rem', marginBottom:'0.8rem' }}>
                ← Retour à mon stock
              </Link>
              <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.2rem', fontWeight:700, color:'#F6F1E7', margin:0, lineHeight:1.1 }}>
                🔍 Inventaire Physique REVEX
              </h1>
              <p style={{ color:'rgba(246,241,231,0.6)', fontSize:'0.88rem', marginTop:'0.4rem' }}>
                Notre équipe se déplace chez vous pour inventorier, identifier et certifier vos PDR
              </p>
            </div>
            <button onClick={() => setShowForm(!showForm)}
              style={{ background:'#F6F1E7', color:'#1E3D0F', border:'none', padding:'0.8rem 1.8rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap' }}>
              {showForm ? '✕ Fermer' : '+ Nouvelle demande'}
            </button>
          </div>

          {/* KPIs hero */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.7rem', marginTop:'1.5rem' }}>
            {[
              { icon:'📋', label:'Mes demandes',  value:requests.length,                                      color:'#F6F1E7' },
              { icon:'⏳', label:'En attente',    value:requests.filter(r=>r.status==='pending').length,       color:'#FCD34D' },
              { icon:'🔄', label:'En cours',      value:requests.filter(r=>r.status==='in_progress').length,   color:'#6EE7B7' },
              { icon:'🏁', label:'Terminés',      value:requests.filter(r=>r.status==='completed').length,     color:'#93C5FD' },
            ].map(k => (
              <div key={k.label} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'0.8rem', textAlign:'center' }}>
                <div style={{ fontSize:'1.1rem', marginBottom:'0.25rem' }}>{k.icon}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:k.color }}>{k.value}</div>
                <div style={{ fontSize:'0.65rem', color:'rgba(246,241,231,0.5)', marginTop:2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'2rem 2rem 4rem' }}>

        {/* ── FORMULAIRE DE DEMANDE ── */}
        {showForm && (
          <div style={{ background:C.white, border:'1.5px solid '+C.leaf, borderRadius:20, overflow:'hidden', marginBottom:'2rem', boxShadow:'0 4px 20px rgba(30,61,15,0.08)' }}>
            <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', padding:'1.2rem 1.8rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:700, color:'#F6F1E7' }}>
                  📋 Nouvelle demande d'inventaire
                </div>
                <div style={{ fontSize:'0.72rem', color:'rgba(246,241,231,0.55)', marginTop:2 }}>
                  Service REVEX · Déplacement terrain · Rapport numérique
                </div>
              </div>
              <button onClick={() => setShowForm(false)}
                style={{ background:'rgba(255,255,255,0.12)', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', color:'#F6F1E7', fontSize:'0.9rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
                ✕
              </button>
            </div>

            <div style={{ padding:'1.8rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem' }}>

              {/* Colonne gauche — Infos */}
              <div>
                <div style={{ fontWeight:700, color:C.forest, fontSize:'0.9rem', marginBottom:'1rem', paddingBottom:'0.5rem', borderBottom:'1px solid '+C.beige }}>
                  👤 Informations de contact
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {[
                    { key:'company_name', label:'Entreprise *',    placeholder:'IMACID SA', type:'text'   },
                    { key:'contact_name', label:'Nom du contact *', placeholder:'Mohamed Alami', type:'text' },
                    { key:'phone',        label:'Téléphone *',      placeholder:'+212 6XX XXX XXX', type:'tel' },
                    { key:'address',      label:'Adresse du site',  placeholder:'Zone industrielle...', type:'text' },
                    { key:'city',         label:'Ville *',          placeholder:'Casablanca', type:'text'  },
                    { key:'site_access',  label:'Accès site',       placeholder:'Portique, badge, RDV préalable...', type:'text' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize:'0.72rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.25rem' }}>{f.label}</label>
                      <input type={f.type} value={form[f.key]} onChange={e => setf(f.key, e.target.value)} placeholder={f.placeholder}
                        style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' }}/>
                    </div>
                  ))}
                </div>
              </div>

              {/* Colonne droite — Inventaire */}
              <div>
                <div style={{ fontWeight:700, color:C.forest, fontSize:'0.9rem', marginBottom:'1rem', paddingBottom:'0.5rem', borderBottom:'1px solid '+C.beige }}>
                  🔍 Détails de l'inventaire
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>

                  {/* Type inventaire */}
                  <div>
                    <label style={{ fontSize:'0.72rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.25rem' }}>Type d'inventaire *</label>
                    <select value={form.inventory_type} onChange={e => setf('inventory_type', e.target.value)}
                      style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none' }}>
                      {INVENTORY_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Nb références */}
                  <div>
                    <label style={{ fontSize:'0.72rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.25rem' }}>
                      Nombre de références estimé
                    </label>
                    <input type="number" value={form.nb_references_est} onChange={e => setf('nb_references_est', e.target.value)} placeholder="100"
                      style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' }}/>
                    <div style={{ fontSize:'0.68rem', color:C.muted, marginTop:3 }}>
                      Durée estimée : {devis.days} jour{devis.days > 1 ? 's' : ''} · {devis.staff} agent{devis.staff > 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Nb staff */}
                  <div>
                    <label style={{ fontSize:'0.72rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.25rem' }}>Nombre d'agents souhaité</label>
                    <select value={form.nb_staff_needed} onChange={e => setf('nb_staff_needed', Number(e.target.value))}
                      style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none' }}>
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} agent{n>1?'s':''}</option>)}
                    </select>
                  </div>

                  {/* Date souhaitée */}
                  <div>
                    <label style={{ fontSize:'0.72rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.25rem' }}>Date souhaitée</label>
                    <input type="date" value={form.scheduled_date} onChange={e => setf('scheduled_date', e.target.value)}
                      min={new Date(Date.now()+3*86400000).toISOString().split('T')[0]}
                      style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' }}/>
                  </div>

                  {/* Options */}
                  <div>
                    <label style={{ fontSize:'0.72rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.5rem' }}>Services inclus</label>
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                      {[
                        { key:'wantRapport', label:'📊 Rapport numérique REVEX', price:'+'+TARIFS.rapport+' MAD' },
                        { key:'wantCertif',  label:'📜 Certificat de conformité',  price:'+'+TARIFS.certif+' MAD'  },
                        { key:'wantPhotos',  label:'📸 Photos professionnelles',   price:'+'+TARIFS.photos+' MAD'  },
                      ].map(opt => (
                        <label key={opt.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.7rem', background:form[opt.key]?'#E8F8EE':C.beige, border:'1px solid '+(form[opt.key]?C.eco:C.mid), borderRadius:10, padding:'0.5rem 0.8rem', cursor:'pointer', transition:'all 0.15s' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                            <input type="checkbox" checked={form[opt.key]} onChange={e => setf(opt.key, e.target.checked)} style={{ cursor:'pointer', accentColor:C.eco }}/>
                            <span style={{ fontSize:'0.82rem', color:C.forest }}>{opt.label}</span>
                          </div>
                          <span style={{ fontSize:'0.75rem', fontWeight:700, color:form[opt.key]?C.eco:C.muted }}>{opt.price}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label style={{ fontSize:'0.72rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.25rem' }}>Notes / Instructions</label>
                    <textarea value={form.notes} onChange={e => setf('notes', e.target.value)} rows={3}
                      placeholder="Types de pièces, emplacement du stock, contraintes d'accès, équipements de protection..."
                      style={{ width:'100%', padding:'0.6rem 0.85rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.83rem', fontFamily:"'DM Sans',sans-serif", outline:'none', resize:'vertical', boxSizing:'border-box' }}/>
                  </div>
                </div>
              </div>
            </div>

            {/* ── DEVIS ESTIMATIF ── */}
            <div style={{ margin:'0 1.8rem 1.8rem', background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', borderRadius:14, padding:'1.2rem 1.5rem' }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:'#F6F1E7', marginBottom:'0.8rem' }}>
                💰 Devis estimatif
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.6rem', marginBottom:'1rem' }}>
                {[
                  { label:'Durée', value:devis.days+'j · '+devis.staff+' agents', color:'#F6F1E7' },
                  { label:'Base opération', value:devis.base.toLocaleString('fr-MA')+' MAD', color:'#FCD34D' },
                  { label:'Options', value:devis.opts>0?'+'+devis.opts.toLocaleString('fr-MA')+' MAD':'Inclus', color:'#93C5FD' },
                  { label:'Total TTC', value:devis.ttc.toLocaleString('fr-MA')+' MAD', color:'#6EE7B7' },
                ].map(k => (
                  <div key={k.label} style={{ background:'rgba(255,255,255,0.08)', borderRadius:10, padding:'0.65rem 0.8rem', textAlign:'center' }}>
                    <div style={{ fontSize:'0.65rem', color:'rgba(246,241,231,0.45)', marginBottom:3 }}>{k.label}</div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:k.color }}>{k.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:'0.72rem', color:'rgba(246,241,231,0.45)' }}>
                * Devis indicatif · Prix confirmé après validation de la demande · TVA 20% incluse
              </div>
            </div>

            {/* Submit */}
            <div style={{ padding:'0 1.8rem 1.8rem', display:'flex', gap:'0.7rem' }}>
              <button onClick={handleSubmit} disabled={createMutation.isLoading || !form.phone || !form.city}
                style={{ background:C.forest, color:C.cream, border:'none', padding:'0.8rem 2rem', borderRadius:100, fontWeight:700, fontSize:'0.9rem', cursor:createMutation.isLoading?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", opacity:(!form.phone||!form.city)?0.5:1 }}>
                {createMutation.isLoading ? '⏳ Envoi...' : '📤 Envoyer la demande'}
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ background:'transparent', color:C.muted, border:'1.5px solid '+C.mid, padding:'0.8rem 1.5rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                Annuler
              </button>
              <div style={{ marginLeft:'auto', fontSize:'0.75rem', color:C.muted, alignSelf:'center' }}>
                Notre équipe vous contacte sous 24h pour confirmer la date
              </div>
            </div>
          </div>
        )}

        {/* ── MES DEMANDES ── */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.2rem' }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', color:C.forest, margin:0 }}>
              📋 Mes demandes d'inventaire
            </h2>
            {requests.length === 0 && !showForm && (
              <button onClick={() => setShowForm(true)}
                style={{ background:C.forest, color:C.cream, border:'none', padding:'0.6rem 1.3rem', borderRadius:100, fontWeight:700, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                + Première demande
              </button>
            )}
          </div>

          {isLoading && (
            <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}>Chargement...</div>
          )}

          {!isLoading && requests.length === 0 && (
            <div style={{ textAlign:'center', padding:'4rem', background:C.white, borderRadius:18, border:'2px dashed '+C.mid, color:C.muted }}>
              <div style={{ fontSize:'4rem', opacity:0.15, marginBottom:'0.7rem' }}>🔍</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', color:C.forest, marginBottom:'0.4rem' }}>
                Aucune demande d'inventaire
              </div>
              <div style={{ fontSize:'0.85rem', marginBottom:'1.2rem' }}>
                Faites inventorier votre stock par l'équipe REVEX et obtenez un rapport certifié.
              </div>
              <button onClick={() => setShowForm(true)}
                style={{ background:C.forest, color:C.cream, border:'none', padding:'0.7rem 1.8rem', borderRadius:100, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                + Créer une demande
              </button>
            </div>
          )}

          {!isLoading && requests.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {requests.map(r => {
                const st = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                return (
                  <div key={r.id} style={{ background:C.white, border:'1.5px solid '+(r.status==='pending'?C.orange:r.status==='completed'?C.eco:C.mid), borderRadius:18, overflow:'hidden', boxShadow:'0 2px 8px rgba(30,61,15,0.05)' }}>

                    {/* Header */}
                    <div style={{ padding:'1rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem' }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:3 }}>
                          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', fontWeight:700, color:C.forest }}>
                            {r.inventory_type || 'Inventaire physique'}
                          </span>
                          <span style={{ fontFamily:'monospace', fontSize:'0.68rem', color:C.muted, background:C.beige, padding:'0.1rem 0.45rem', borderRadius:5 }}>
                            {r.id?.substring(0,8).toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize:'0.75rem', color:C.muted }}>
                          📍 {r.city} · 📅 Soumis le {fmt(r.created_at)}
                          {r.scheduled_date && ' · 🗓 Planifié le '+fmt(r.scheduled_date)}
                        </div>
                      </div>
                      <span style={{ background:st.bg, color:st.color, padding:'0.28rem 0.85rem', borderRadius:100, fontSize:'0.8rem', fontWeight:700 }}>
                        {st.label}
                      </span>
                    </div>

                    {/* Détails */}
                    <div style={{ padding:'0.5rem 1.5rem', background:C.cream, borderTop:'1px solid '+C.beige, display:'flex', gap:'1.5rem', flexWrap:'wrap', fontSize:'0.75rem', color:C.muted }}>
                      {r.nb_references_est && <span>📊 ~{r.nb_references_est} références</span>}
                      {r.nb_staff_needed && <span>👷 {r.nb_staff_needed} agents</span>}
                      {r.site_access && <span>🚪 Accès : {r.site_access}</span>}
                    </div>

                    {/* Progression */}
                    <div style={{ padding:'0.75rem 1.5rem', borderTop:'1px solid '+C.beige }}>
                      <div style={{ display:'flex', gap:'0', alignItems:'center', marginBottom:'0.5rem' }}>
                        {['pending','confirmed','scheduled','in_progress','completed'].map((step, i) => {
                          const stepNum = i + 1;
                          const curStep = STATUS_CONFIG[r.status]?.step || 1;
                          const done    = curStep > stepNum;
                          const active  = curStep === stepNum;
                          const labels  = ['Soumise','Confirmée','Planifiée','En cours','Terminée'];
                          return (
                            <React.Fragment key={step}>
                              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                                <div style={{ width:22, height:22, borderRadius:'50%', background:done?C.eco:active?C.blue:C.beige, border:'2px solid '+(done?C.eco:active?C.blue:C.mid), display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', color:done||active?'#fff':C.muted, fontWeight:700, transition:'all 0.3s' }}>
                                  {done ? '✓' : stepNum}
                                </div>
                                <div style={{ fontSize:'0.6rem', color:active?C.blue:done?C.eco:C.muted, fontWeight:active||done?700:400, whiteSpace:'nowrap' }}>
                                  {labels[i]}
                                </div>
                              </div>
                              {i < 4 && <div style={{ flex:1, height:2, background:done?C.eco:C.beige, margin:'0 2px', marginBottom:18, transition:'background 0.3s' }}/>}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Facture si terminé */}
                    {r.status === 'completed' && (
                      <div style={{ padding:'0.8rem 1.5rem', background:'#ECFDF5', borderTop:'1px solid #A7F3D0', display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
                        <div style={{ fontSize:'0.82rem', color:'#065F46', flex:1 }}>
                          🏁 Inventaire terminé — Rapport disponible
                        </div>
                        <button
                          onClick={() => generateInvoicePdf({
                            type: 'inventory',
                            requestId: r.id,
                            companyName: r.company_name,
                            contactName: r.contact_name,
                            city: r.city,
                            inventoryType: r.inventory_type,
                            nbReferences: r.nb_references_est,
                            nbStaff: r.nb_staff_needed,
                            scheduledDate: r.scheduled_date,
                            createdAt: r.created_at,
                          })}
                          style={{ background:C.eco, color:'#fff', border:'none', padding:'0.5rem 1.1rem', borderRadius:100, fontSize:'0.78rem', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          🧾 Télécharger ma facture
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
