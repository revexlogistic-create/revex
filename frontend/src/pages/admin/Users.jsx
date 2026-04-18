// src/pages/admin/Users.jsx — Qualification vendeurs
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';

const C = {
  deep:'#0F2318', forest:'#1A3C2E', sage:'#4A9065',
  nardo:'#4A4E5A', steel:'#7A8090', ghost:'#E8ECEB',
  cream:'#F4F6F4', white:'#FAFBFA', eco:'#27AE60',
  urgent:'#C0392B', amber:'#E8C866', blue:'#2563EB',
};

const SCORE_CRITERIA = [
  { key:'company_name', label:'Nom société',    points:15 },
  { key:'contact_name', label:'Nom contact',    points:10 },
  { key:'phone',        label:'Téléphone',      points:15 },
  { key:'city',         label:'Ville',          points:10 },
  { key:'ice_number',   label:'ICE',            points:20 },
  { key:'rc_number',    label:'RC',             points:15 },
  { key:'sector',       label:'Secteur',        points:15 },
];

function getScore(user) {
  return SCORE_CRITERIA.reduce(function(s, c) {
    return s + (user[c.key] ? c.points : 0);
  }, 0);
}

function ScoreBadge({ score }) {
  var color = score >= 80 ? C.eco : score >= 50 ? C.amber : C.urgent;
  var label = score >= 80 ? 'Complet' : score >= 50 ? 'Partiel' : 'Incomplet';
  return (
    <span style={{ background:color+'22', color:color, borderRadius:100, padding:'0.2rem 0.7rem', fontSize:'0.75rem', fontWeight:700 }}>
      {score}% · {label}
    </span>
  );
}

export default function AdminUsers() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery(
    ['admin-users', tab],
    function() { 
      var status = (tab === 'all' || tab === 'qualifications') ? '' : tab;
      return api.get('/admin/users?status=' + status + '&role=seller').then(function(r) { return r.data; }); 
    }
  );

  const { data: qualifData } = useQuery(
    'admin-qualifications',
    function() { return api.get('/admin/qualifications').then(function(r) { return r.data; }); }
  );

  var qualifications = (qualifData && qualifData.qualifications) || [];
  var pendingQualifs = qualifications.filter(function(q) { return q.status === 'pending' || q.status === 'in_review'; });

  // Qualifier le dossier (pending → qualified)
  const qualifyMutation = useMutation(
    function(p) { return api.put('/admin/qualifications/' + p.sellerId, { status: p.status, review_notes: p.notes }); },
    {
      onSuccess: function() {
        toast.success('✅ Dossier traité !');
        qc.invalidateQueries('admin-qualifications');
        qc.invalidateQueries('admin-users');
      }
    }
  );

  // Activer l'accès complet (qualified → active)
  const approveMutation = useMutation(
    function(userId) { return api.put('/admin/users/' + userId + '/activate-full'); },
    {
      onSuccess: function() {
        toast.success('🟢 Accès complet activé !');
        qc.invalidateQueries('admin-users');
        setSelected(null);
      }
    }
  );

  const rejectMutation = useMutation(
    function(p) { return api.put('/admin/users/' + p.userId + '/status', { status:'suspended', reason: p.reason }); },
    {
      onSuccess: function() {
        toast.success('❌ Vendeur rejeté');
        qc.invalidateQueries('admin-users');
        setSelected(null);
        setShowReject(false);
        setRejectReason('');
      }
    }
  );

  var users = (data && data.users) || [];
  var filtered = users.filter(function(u) {
    if (!search) return true;
    return (u.email + u.company_name + u.contact_name).toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'2rem', fontFamily:"'DM Sans',sans-serif", background:C.cream, minHeight:'100vh' }}>

      <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2rem', color:C.deep, marginBottom:'0.3rem' }}>
        Qualification des vendeurs
      </h1>
      <p style={{ color:C.steel, fontSize:'0.85rem', marginBottom:'1.5rem' }}>
        Vérifiez les dossiers et approuvez ou rejetez les demandes d'accès vendeur.
      </p>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.2rem', flexWrap:'wrap' }}>
        {[
          ['pending',      '⏳ En attente'],
          ['under_review', '🔍 En révision'],
          ['qualified',    '✅ Qualifiés'],
          ['active',       '🟢 Actifs'],
          ['suspended',    '❌ Rejetés'],
          ['all',          '📋 Tous'],
          ['qualifications','📋 Dossiers ('+pendingQualifs.length+')'],
        ].map(function(t) {
          return (
            <button key={t[0]} onClick={function() { setTab(t[0]); }}
              style={{ padding:'0.4rem 1rem', borderRadius:100, border:'1px solid '+(tab===t[0]?C.forest:C.ghost), background:tab===t[0]?C.forest:C.white, color:tab===t[0]?C.cream:C.nardo, fontSize:'0.82rem', fontWeight:tab===t[0]?700:400, cursor:'pointer' }}>
              {t[1]}
            </button>
          );
        })}
        <input value={search} onChange={function(e){ setSearch(e.target.value); }}
          placeholder="Rechercher..."
          style={{ marginLeft:'auto', padding:'0.4rem 0.9rem', border:'1px solid '+C.ghost, borderRadius:100, fontSize:'0.82rem', outline:'none', background:C.white, color:C.deep }}/>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:'0.8rem', marginBottom:'1.5rem' }}>
        {[
          ['⏳', 'En attente',  users.filter(function(u){ return u.status==='pending'; }).length,      C.amber],
          ['🔍', 'En révision', users.filter(function(u){ return u.status==='under_review'; }).length, C.blue],
          ['✅', 'Qualifiés',   users.filter(function(u){ return u.status==='qualified'; }).length,    C.eco],
          ['🟢', 'Actifs',      users.filter(function(u){ return u.status==='active'; }).length,       C.forest],
          ['❌', 'Rejetés',     users.filter(function(u){ return u.status==='suspended'; }).length,    C.urgent],
        ].map(function(s) {
          return (
            <div key={s[1]} style={{ background:C.white, border:'1px solid '+C.ghost, borderRadius:14, padding:'1rem', textAlign:'center' }}>
              <div style={{ fontSize:'1.5rem' }}>{s[0]}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', fontWeight:700, color:s[3] }}>{s[2]}</div>
              <div style={{ fontSize:'0.72rem', color:C.steel }}>{s[1]}</div>
            </div>
          );
        })}
      </div>

      {/* Qualifications tab */}
      {tab === 'qualifications' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem' }}>
          {qualifications.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem', background:C.white, borderRadius:16, border:'1px solid '+C.ghost, color:C.steel }}>
              Aucune demande de qualification
            </div>
          ) : qualifications.map(function(q) {
            return (
              <div key={q.id} style={{ background:C.white, border:'1px solid '+C.ghost, borderRadius:16, padding:'1.2rem 1.5rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem' }}>
                  <div>
                    <div style={{ fontWeight:700, color:C.deep }}>{q.company_name}</div>
                    <div style={{ fontSize:'0.78rem', color:C.steel, marginTop:2 }}>{q.email} · {q.city}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.7rem' }}>
                    <span style={{ background:q.status==='approved'?C.eco+'22':q.status==='rejected'?C.urgent+'22':C.amber+'22', color:q.status==='approved'?C.eco:q.status==='rejected'?C.urgent:C.amber, borderRadius:100, padding:'0.2rem 0.7rem', fontSize:'0.75rem', fontWeight:700 }}>
                      {q.status==='approved'?'✅ Approuvé':q.status==='rejected'?'❌ Rejeté':q.status==='in_review'?'🔍 En révision':'⏳ En attente'}
                    </span>
                    {(q.status === 'pending' || q.status === 'in_review') && (
                      <div style={{ display:'flex', gap:'0.5rem' }}>
                        <button onClick={function() { qualifyMutation.mutate({ sellerId: q.seller_id, status: 'approved' }); }}
                          style={{ background:C.eco, color:'#fff', border:'none', borderRadius:100, padding:'0.4rem 0.9rem', fontSize:'0.78rem', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          ✅ Approuver dossier
                        </button>
                        <button onClick={function() { qualifyMutation.mutate({ sellerId: q.seller_id, status: 'rejected', notes: 'Dossier incomplet' }); }}
                          style={{ background:C.urgent, color:'#fff', border:'none', borderRadius:100, padding:'0.4rem 0.9rem', fontSize:'0.78rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          ❌ Rejeter
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {/* Documents uploadés */}
                <div style={{ marginTop:'0.8rem' }}>
                  <div style={{ fontSize:'0.72rem', color:C.steel, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.5rem' }}>
                    Documents soumis
                  </div>
                  <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'0.7rem' }}>
                    {[
                      { label:'RC', url: q.rc_document_url },
                      { label:'ICE', url: q.ice_document_url },
                      { label:'Identité', url: q.identity_document_url },
                    ].map(function(doc) {
                      return doc.url ? (
                        <a key={doc.label} href={doc.url} target="_blank" rel="noreferrer"
                          style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE', borderRadius:8, padding:'0.35rem 0.8rem', fontSize:'0.78rem', fontWeight:600, textDecoration:'none' }}>
                          📄 {doc.label}
                        </a>
                      ) : (
                        <span key={doc.label} style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', background:C.ghost, color:C.steel, borderRadius:8, padding:'0.35rem 0.8rem', fontSize:'0.78rem' }}>
                          ❌ {doc.label} manquant
                        </span>
                      );
                    })}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:'0.4rem' }}>
                    {[
                      ['Classification', q.stock_classification],
                      ['Criticité', q.stock_criticality],
                      ['Rotation', q.stock_rotation],
                      ['Conformité', q.compliance_signed ? '✅ Signé' : '❌ Non signé'],
                    ].map(function(kv) {
                      return (
                        <div key={kv[0]} style={{ background:C.ghost, borderRadius:8, padding:'0.4rem 0.7rem', fontSize:'0.75rem' }}>
                          <span style={{ color:C.steel }}>{kv[0]}: </span>
                          <span style={{ color:kv[1]?C.deep:C.urgent, fontWeight:600 }}>{kv[1]||'—'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      {tab !== 'qualifications' && (isLoading ? (
        <div style={{ textAlign:'center', padding:'3rem', color:C.steel }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'3rem', background:C.white, borderRadius:16, border:'1px solid '+C.ghost, color:C.steel }}>
          Aucun utilisateur trouvé
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem' }}>
          {filtered.map(function(u) {
            var score = getScore(u);
            return (
              <div key={u.id}
                style={{ background:C.white, border:'1px solid '+(selected && selected.id===u.id ? C.sage : C.ghost), borderRadius:16, padding:'1.2rem 1.5rem', cursor:'pointer', transition:'border-color 0.15s' }}
                onClick={function() { setSelected(u); }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                    <div style={{ width:42, height:42, borderRadius:'50%', background:'linear-gradient(135deg,'+C.forest+','+C.sage+')', display:'flex', alignItems:'center', justifyContent:'center', color:C.white, fontWeight:700, fontSize:'1rem', flexShrink:0 }}>
                      {(u.company_name||'?').substring(0,1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <div style={{ fontWeight:700, color:C.deep, fontSize:'0.92rem' }}>{u.company_name || '—'}</div>
                      {qualifications.find(function(q){ return q.seller_id === u.id; }) && (
                        <span style={{ background:'#EFF6FF', color:'#1D4ED8', borderRadius:100, padding:'0.1rem 0.5rem', fontSize:'0.68rem', fontWeight:700 }}>
                          📋 Dossier soumis
                        </span>
                      )}
                    </div>
                      <div style={{ fontSize:'0.78rem', color:C.steel, marginTop:2 }}>{u.email} · {u.role}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.8rem', flexWrap:'wrap' }}>
                    <ScoreBadge score={score} />
                    <span style={{ background: u.status==='active'?C.eco+'22':u.status==='suspended'?C.urgent+'22':C.amber+'22', color:u.status==='active'?C.eco:u.status==='suspended'?C.urgent:C.amber, borderRadius:100, padding:'0.2rem 0.7rem', fontSize:'0.75rem', fontWeight:700 }}>
                      {u.status==='active'?'🟢 Actif':u.status==='qualified'?'✅ Qualifié':u.status==='under_review'?'🔍 En révision':u.status==='suspended'?'❌ Rejeté':'⏳ En attente'}
                    </span>
                    <span style={{ fontSize:'0.72rem', color:C.steel }}>{new Date(u.created_at).toLocaleDateString('fr-MA')}</span>
                  </div>
                </div>

                {/* Dossier détaillé */}
                {selected && selected.id === u.id && (
                  <div style={{ marginTop:'1.2rem', borderTop:'1px solid '+C.ghost, paddingTop:'1.2rem' }}>

                    {/* Score détaillé */}
                    <div style={{ background:C.cream, borderRadius:12, padding:'1rem', marginBottom:'1rem' }}>
                      <div style={{ fontWeight:700, fontSize:'0.82rem', color:C.deep, marginBottom:'0.8rem' }}>
                        📊 Score de qualification — {score}/100
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:'0.5rem' }}>
                        {SCORE_CRITERIA.map(function(cr) {
                          var ok = !!u[cr.key];
                          return (
                            <div key={cr.key} style={{ background:ok?C.eco+'15':C.urgent+'10', borderRadius:8, padding:'0.5rem 0.7rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <span style={{ fontSize:'0.75rem', color:C.nardo }}>{cr.label}</span>
                              <span style={{ fontSize:'0.75rem', fontWeight:700, color:ok?C.eco:C.urgent }}>{ok?'+'+cr.points:'0'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Infos complètes */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem', marginBottom:'1rem' }}>
                      {[
                        ['Contact', u.contact_name],
                        ['Téléphone', u.phone],
                        ['Ville', u.city],
                        ['Secteur', u.sector],
                        ['ICE', u.ice_number],
                        ['RC', u.rc_number],
                        ['Région', u.region],
                        ['Inscription', new Date(u.created_at).toLocaleDateString('fr-MA')],
                      ].map(function(kv) {
                        return (
                          <div key={kv[0]} style={{ background:C.ghost, borderRadius:8, padding:'0.5rem 0.8rem' }}>
                            <div style={{ fontSize:'0.68rem', color:C.steel, textTransform:'uppercase', letterSpacing:'0.06em' }}>{kv[0]}</div>
                            <div style={{ fontSize:'0.82rem', color:kv[1]?C.deep:C.urgent, fontWeight:kv[1]?600:400 }}>{kv[1]||'Non renseigné'}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    {u.status === 'pending' && (
                      <div style={{ display:'flex', gap:'0.7rem', flexWrap:'wrap' }}>
                        <button onClick={function(e){ e.stopPropagation(); approveMutation.mutate(u.id); }}
                          disabled={approveMutation.isLoading}
                          style={{ background:C.eco, color:'#fff', border:'none', borderRadius:100, padding:'0.65rem 1.5rem', fontWeight:700, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          ✅ Approuver l'accès
                        </button>
                        <button onClick={function(e){ e.stopPropagation(); setShowReject(true); }}
                          style={{ background:C.urgent, color:'#fff', border:'none', borderRadius:100, padding:'0.65rem 1.2rem', fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          ❌ Rejeter
                        </button>
                        <button onClick={function(e){ e.stopPropagation(); setSelected(null); }}
                          style={{ background:'transparent', color:C.steel, border:'1.5px solid '+C.ghost, borderRadius:100, padding:'0.65rem 1rem', fontSize:'0.82rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          Fermer
                        </button>
                      </div>
                    )}
                    {u.status === 'qualified' && (
                      <div style={{ display:'flex', gap:'0.7rem', flexWrap:'wrap' }}>
                        <button onClick={function(e){ e.stopPropagation(); approveMutation.mutate(u.id); }}
                          disabled={approveMutation.isLoading}
                          style={{ background:C.forest, color:'#fff', border:'none', borderRadius:100, padding:'0.65rem 1.5rem', fontWeight:700, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          🟢 Activer l'accès complet
                        </button>
                        <button onClick={function(e){ e.stopPropagation(); setShowReject(true); }}
                          style={{ background:C.urgent+'22', color:C.urgent, border:'1px solid '+C.urgent+'44', borderRadius:100, padding:'0.65rem 1.1rem', fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          ❌ Rejeter
                        </button>
                        <button onClick={function(e){ e.stopPropagation(); setSelected(null); }}
                          style={{ background:'transparent', color:C.steel, border:'1.5px solid '+C.ghost, borderRadius:100, padding:'0.55rem 1rem', fontSize:'0.82rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          Fermer
                        </button>
                      </div>
                    )}
                    {u.status === 'active' && (
                      <div style={{ display:'flex', gap:'0.7rem' }}>
                        <button onClick={function(e){ e.stopPropagation(); setShowReject(true); }}
                          style={{ background:C.urgent+'22', color:C.urgent, border:'1px solid '+C.urgent+'44', borderRadius:100, padding:'0.55rem 1.1rem', fontWeight:600, fontSize:'0.82rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          Suspendre
                        </button>
                        <button onClick={function(e){ e.stopPropagation(); setSelected(null); }}
                          style={{ background:'transparent', color:C.steel, border:'1.5px solid '+C.ghost, borderRadius:100, padding:'0.55rem 1rem', fontSize:'0.82rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                          Fermer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Modal rejet */}
      {showReject && selected && (
        <div onClick={function() { setShowReject(false); }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.5rem' }}>
          <div onClick={function(e){ e.stopPropagation(); }}
            style={{ background:C.white, borderRadius:20, padding:'2rem', maxWidth:420, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', color:C.deep, marginBottom:'1rem' }}>
              Rejeter la demande
            </h2>
            <p style={{ color:C.steel, fontSize:'0.85rem', marginBottom:'1rem' }}>
              {selected.company_name} · {selected.email}
            </p>
            <textarea value={rejectReason} onChange={function(e){ setRejectReason(e.target.value); }}
              placeholder="Raison du rejet (optionnel)..."
              rows={3}
              style={{ width:'100%', padding:'0.7rem', border:'1.5px solid '+C.ghost, borderRadius:10, fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif", resize:'none', boxSizing:'border-box', marginBottom:'1rem', outline:'none' }}/>
            <div style={{ display:'flex', gap:'0.7rem' }}>
              <button onClick={function() { setShowReject(false); }}
                style={{ flex:1, background:'transparent', color:C.steel, border:'1.5px solid '+C.ghost, borderRadius:100, padding:'0.7rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                Annuler
              </button>
              <button onClick={function() { rejectMutation.mutate({ userId:selected.id, reason:rejectReason }); }}
                disabled={rejectMutation.isLoading}
                style={{ flex:2, background:C.urgent, color:'#fff', border:'none', borderRadius:100, padding:'0.7rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontWeight:700 }}>
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
