// src/pages/admin/Disputes.jsx — Gestion des litiges optimisée
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
};

const fmt = n => Number(n||0).toLocaleString('fr-MA');

const STATUS_CONFIG = {
  open:            { label:'🔴 Ouvert',     color:C.urgent, bg:'#FDECEA', priority:1 },
  under_review:    { label:'🟠 En revue',   color:C.orange, bg:'#FEF5E7', priority:2 },
  resolved_buyer:  { label:'✅ Résolu (A)', color:C.eco,    bg:'#E8F8EE', priority:4 },
  resolved_seller: { label:'✅ Résolu (V)', color:C.eco,    bg:'#E8F8EE', priority:4 },
  closed:          { label:'⬜ Fermé',      color:C.muted,  bg:C.beige,   priority:5 },
};

const REASON_LABELS = {
  not_received:'📭 Non reçu', not_as_described:'❌ Non conforme',
  damaged:'💥 Endommagé', wrong_item:'🔄 Mauvais article',
  quantity_issue:'⚖️ Qté incorrecte', quality_issue:'⭐ Qualité insuffisante',
  payment_issue:'💳 Paiement', other:'📋 Autre',
};

const parseJSON = v => { try { return typeof v==='string'?JSON.parse(v):v||[]; } catch { return []; } };

function SLABadge({ createdAt }) {
  const h = (new Date()-new Date(createdAt))/3600000;
  const color = h<24?C.eco:h<48?C.orange:C.urgent;
  return <span style={{ background:color+'22', color, borderRadius:100, padding:'0.15rem 0.5rem', fontSize:'0.7rem', fontWeight:700 }}>⏱ {h<24?Math.round(h)+'h':Math.round(h/24)+'j'}</span>;
}

export default function AdminDisputes() {
  const qc = useQueryClient();
  const [selected, setSelected]     = useState(null);
  const [decision, setDecision]     = useState('');
  const [resolution, setResolution] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [lightbox, setLightbox]     = useState(null);

  const { data } = useQuery(
    ['disputes-admin', filterStatus],
    () => api.get('/admin/disputes'+(filterStatus?'?status='+filterStatus:'')).then(r=>r.data),
    { refetchInterval:15000 }
  );

  const disputes = (data?.disputes||[]).sort((a,b)=>{
    const pa=STATUS_CONFIG[a.status]?.priority||3, pb=STATUS_CONFIG[b.status]?.priority||3;
    return pa-pb || new Date(a.created_at)-new Date(b.created_at);
  });

  const resolveMutation = useMutation(
    ({id,...body})=>api.put('/admin/disputes/'+id+'/resolve',body),
    {
      onSuccess:()=>{ toast.success('✅ Litige résolu — escrow mis à jour'); qc.invalidateQueries('disputes-admin'); setSelected(null); setDecision(''); setResolution(''); setAdminNotes(''); },
      onError:e=>toast.error(e.response?.data?.error||'Erreur')
    }
  );

  const open=disputes.filter(d=>d.status==='open').length;
  const review=disputes.filter(d=>d.status==='under_review').length;
  const resolved=disputes.filter(d=>['resolved_buyer','resolved_seller'].includes(d.status)).length;
  const urgent48=disputes.filter(d=>['open','under_review'].includes(d.status)&&(new Date()-new Date(d.created_at))/3600000>48).length;

  return (
    <div style={{maxWidth:1280,margin:'0 auto',padding:'2.5rem 2rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'2rem',flexWrap:'wrap',gap:'1rem'}}>
        <div>
          <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'2.2rem',color:C.forest,marginBottom:'0.2rem'}}>⚖️ Gestion des Litiges</h1>
          <p style={{color:C.muted,fontSize:'0.88rem'}}>Arbitrage · Escrow · Résolution</p>
        </div>
        {urgent48>0&&<div style={{background:'#FDECEA',border:'1.5px solid '+C.urgent,borderRadius:12,padding:'0.7rem 1.2rem',fontSize:'0.85rem',color:C.urgent,fontWeight:700}}>🚨 {urgent48} litige(s) en attente +48h</div>}
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'2rem'}}>
        {[
          {icon:'🔴',label:'Ouverts',    value:open,     color:C.urgent, filter:'open'},
          {icon:'🟠',label:'En revue',  value:review,   color:C.orange, filter:'under_review'},
          {icon:'✅',label:'Résolus',   value:resolved, color:C.eco,    filter:'resolved_buyer'},
          {icon:'🚨',label:'Urgents',   value:urgent48, color:C.urgent, filter:''},
        ].map(k=>(
          <div key={k.label} onClick={()=>setFilterStatus(f=>f===k.filter?'':k.filter)}
            style={{background:filterStatus===k.filter?k.color+'15':C.white,border:'2px solid '+(filterStatus===k.filter?k.color:C.mid),borderRadius:14,padding:'1.2rem',cursor:'pointer',transition:'all 0.15s',textAlign:'center'}}>
            <div style={{fontSize:'1.6rem',marginBottom:'0.4rem'}}>{k.icon}</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.8rem',fontWeight:700,color:k.color,lineHeight:1}}>{k.value}</div>
            <div style={{fontSize:'0.72rem',color:C.muted,marginTop:'0.3rem'}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem',flexWrap:'wrap'}}>
        <button onClick={()=>setFilterStatus('')}
          style={{padding:'0.4rem 1rem',borderRadius:100,border:'1.5px solid '+(filterStatus===''?C.forest:C.mid),background:filterStatus===''?C.forest:'transparent',color:filterStatus===''?C.cream:C.muted,fontSize:'0.82rem',cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>
          Tous ({disputes.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([status,cfg])=>{
          const count=disputes.filter(d=>d.status===status).length;
          if(!count) return null;
          return <button key={status} onClick={()=>setFilterStatus(s=>s===status?'':status)}
            style={{padding:'0.4rem 1rem',borderRadius:100,border:'1.5px solid '+(filterStatus===status?cfg.color:C.mid),background:filterStatus===status?cfg.bg:'transparent',color:filterStatus===status?cfg.color:C.muted,fontSize:'0.82rem',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:filterStatus===status?700:400}}>
            {cfg.label} ({count})
          </button>;
        })}
      </div>

      {/* Liste */}
      {disputes.length===0?(
        <div style={{textAlign:'center',padding:'4rem',background:C.white,borderRadius:18,border:'1px solid '+C.mid,color:C.muted}}>
          <div style={{fontSize:'3rem',marginBottom:'1rem',opacity:0.3}}>⚖️</div>
          <p>Aucun litige {filterStatus?'avec ce statut':'en cours'} ✅</p>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          {disputes.map(d=>{
            const st=STATUS_CONFIG[d.status]||STATUS_CONFIG.open;
            const isOpen=['open','under_review'].includes(d.status);
            const hours=(new Date()-new Date(d.created_at))/3600000;
            const evidence=parseJSON(d.evidence_urls);
            const sellerEvidence=parseJSON(d.seller_evidence_urls);

            return (
              <div key={d.id} style={{background:C.white,border:'1.5px solid '+(hours>48&&isOpen?C.urgent:isOpen?C.orange:C.mid),borderRadius:18,overflow:'hidden'}}>

                {/* Header */}
                <div style={{padding:'1.2rem 1.5rem',borderBottom:'1px solid '+C.mid,display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'0.8rem',background:hours>48&&isOpen?'#FDECEA22':'transparent'}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.3rem',flexWrap:'wrap'}}>
                      <span style={{fontWeight:700,color:C.forest}}>{d.order_number}</span>
                      <span style={{background:st.bg,color:st.color,borderRadius:100,padding:'0.15rem 0.6rem',fontSize:'0.72rem',fontWeight:700}}>{st.label}</span>
                      {REASON_LABELS[d.reason]&&<span style={{background:C.beige,color:C.muted,borderRadius:100,padding:'0.15rem 0.6rem',fontSize:'0.72rem'}}>{REASON_LABELS[d.reason]}</span>}
                      <SLABadge createdAt={d.created_at}/>
                    </div>
                    <div style={{fontSize:'0.82rem',color:C.muted}}>{d.product_title?.substring(0,55)}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.3rem',fontWeight:700,color:C.urgent}}>{fmt(d.final_price)} MAD</div>
                    <div style={{fontSize:'0.7rem',color:C.muted}}>Escrow bloqué</div>
                  </div>
                </div>

                {/* Parties */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',borderBottom:'1px solid '+C.mid}}>
                  <div style={{padding:'0.8rem 1.5rem',borderRight:'1px solid '+C.mid}}>
                    <div style={{fontSize:'0.68rem',color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'0.2rem'}}>🛒 Acheteur</div>
                    <div style={{fontWeight:600,color:C.forest,fontSize:'0.85rem'}}>{d.buyer_company}</div>
                    <div style={{fontSize:'0.72rem',color:C.muted}}>{d.buyer_email}</div>
                  </div>
                  <div style={{padding:'0.8rem 1.5rem'}}>
                    <div style={{fontSize:'0.68rem',color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'0.2rem'}}>🏭 Vendeur</div>
                    <div style={{fontWeight:600,color:C.forest,fontSize:'0.85rem'}}>{d.seller_company}</div>
                    <div style={{fontSize:'0.72rem',color:C.muted}}>{d.seller_email}</div>
                  </div>
                </div>

                {/* Réclamation acheteur */}
                <div style={{padding:'1rem 1.5rem',borderBottom:'1px solid '+C.beige}}>
                  <div style={{fontSize:'0.7rem',color:C.muted,fontWeight:600,textTransform:'uppercase',marginBottom:'0.4rem'}}>📋 Réclamation</div>
                  <p style={{fontSize:'0.85rem',color:C.forest,lineHeight:1.7,margin:0}}>{d.description}</p>
                  {evidence.length>0&&(
                    <div style={{display:'flex',gap:'0.4rem',marginTop:'0.7rem',flexWrap:'wrap',alignItems:'center'}}>
                      {evidence.map((img,i)=>(
                        <div key={i} onClick={()=>setLightbox(img)}
                          style={{width:60,height:46,borderRadius:8,overflow:'hidden',border:'1px solid '+C.mid,cursor:'zoom-in'}}>
                          <img src={img} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                        </div>
                      ))}
                      <span style={{fontSize:'0.7rem',color:C.muted}}>{evidence.length} preuve(s)</span>
                    </div>
                  )}
                </div>

                {/* Réponse vendeur */}
                {d.seller_response?(
                  <div style={{padding:'1rem 1.5rem',borderBottom:'1px solid '+C.beige,background:'#EBF5FB44'}}>
                    <div style={{fontSize:'0.7rem',color:'#2980B9',fontWeight:600,textTransform:'uppercase',marginBottom:'0.4rem'}}>💬 Réponse vendeur</div>
                    <p style={{fontSize:'0.85rem',color:C.forest,lineHeight:1.7,margin:0}}>{d.seller_response}</p>
                    {sellerEvidence.length>0&&(
                      <div style={{display:'flex',gap:'0.4rem',marginTop:'0.6rem',flexWrap:'wrap'}}>
                        {sellerEvidence.map((img,i)=>(
                          <div key={i} onClick={()=>setLightbox(img)}
                            style={{width:60,height:46,borderRadius:8,overflow:'hidden',border:'1px solid '+C.mid,cursor:'zoom-in'}}>
                            <img src={img} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ):isOpen?(
                  <div style={{padding:'0.6rem 1.5rem',borderBottom:'1px solid '+C.beige,background:'#FEF5E7',fontSize:'0.78rem',color:'#784212'}}>
                    ⏳ Vendeur pas encore répondu
                  </div>
                ):null}

                {/* Résolution */}
                {d.resolution&&(
                  <div style={{padding:'0.9rem 1.5rem',background:'#E8F8EE',borderBottom:'1px solid #a8dfc0'}}>
                    <div style={{fontSize:'0.7rem',color:C.eco,fontWeight:700,marginBottom:'0.3rem'}}>✅ DÉCISION REVEX</div>
                    <p style={{fontSize:'0.85rem',color:'#145A32',margin:0}}>{d.resolution}</p>
                  </div>
                )}

                {/* Arbitrage */}
                {isOpen&&(
                  <div style={{padding:'1.2rem 1.5rem'}}>
                    {selected===d.id?(
                      <div style={{background:C.beige,borderRadius:14,padding:'1.5rem'}}>
                        <h4 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'1.2rem',color:C.forest,marginBottom:'1.2rem'}}>⚖️ Décision d'arbitrage</h4>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.8rem',marginBottom:'1.2rem'}}>
                          {[
                            ['buyer','🛒 Acheteur','Remboursement — escrow retourné',C.blue],
                            ['seller','🏭 Vendeur','Paiement libéré au vendeur',C.eco],
                          ].map(([v,l,sub,color])=>(
                            <div key={v} onClick={()=>setDecision(v)}
                              style={{border:'2.5px solid '+(decision===v?color:C.mid),borderRadius:12,padding:'1rem',cursor:'pointer',background:decision===v?color+'12':C.white,transition:'all 0.15s'}}>
                              <div style={{fontWeight:700,color:decision===v?color:C.forest,fontSize:'0.9rem',marginBottom:'0.2rem'}}>{l}</div>
                              <div style={{fontSize:'0.75rem',color:C.muted}}>{sub}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{marginBottom:'0.8rem'}}>
                          <label style={{fontSize:'0.78rem',fontWeight:600,color:C.forest,display:'block',marginBottom:'0.3rem'}}>Résolution communiquée aux parties *</label>
                          <textarea value={resolution} onChange={e=>setResolution(e.target.value)}
                            placeholder="Décision motivée visible par les deux parties..."
                            rows={3} style={{width:'100%',padding:'0.7rem',border:'1.5px solid '+C.mid,borderRadius:10,fontFamily:"'DM Sans',sans-serif",fontSize:'0.88rem',boxSizing:'border-box',resize:'vertical'}}/>
                        </div>
                        <div style={{marginBottom:'1.2rem'}}>
                          <label style={{fontSize:'0.78rem',fontWeight:600,color:'#7D6608',display:'block',marginBottom:'0.3rem'}}>📝 Notes internes (non visibles)</label>
                          <textarea value={adminNotes} onChange={e=>setAdminNotes(e.target.value)}
                            placeholder="Éléments d'analyse, historique, contexte..."
                            rows={2} style={{width:'100%',padding:'0.7rem',border:'1.5px solid #F0B27A',borderRadius:10,fontFamily:"'DM Sans',sans-serif",fontSize:'0.85rem',background:'#FFFDE7',boxSizing:'border-box',resize:'vertical'}}/>
                        </div>
                        <div style={{display:'flex',gap:'0.8rem'}}>
                          <button onClick={()=>resolveMutation.mutate({id:d.id,decision,resolution,admin_notes:adminNotes})}
                            disabled={!decision||resolution.length<10||resolveMutation.isLoading}
                            style={{background:!decision||resolution.length<10?C.mid:C.forest,color:C.cream,border:'none',padding:'0.75rem 2rem',borderRadius:100,fontWeight:700,cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>
                            {resolveMutation.isLoading?'⏳ Traitement...':'✅ Confirmer la décision'}
                          </button>
                          <button onClick={()=>setSelected(null)}
                            style={{background:'transparent',color:C.muted,border:'1px solid '+C.mid,padding:'0.75rem 1.2rem',borderRadius:100,cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>
                            Annuler
                          </button>
                        </div>
                      </div>
                    ):(
                      <button onClick={()=>{setSelected(d.id);setDecision('');setResolution('');setAdminNotes('');}}
                        style={{background:C.urgent,color:'#fff',border:'none',padding:'0.65rem 1.5rem',borderRadius:100,fontWeight:600,fontSize:'0.88rem',cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>
                        ⚖️ Arbitrer ce litige
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox&&(
        <div onClick={()=>setLightbox(null)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:800,display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem',cursor:'zoom-out'}}>
          <img src={lightbox} alt="Preuve" style={{maxWidth:'90vw',maxHeight:'85vh',borderRadius:12}}/>
          <button onClick={()=>setLightbox(null)}
            style={{position:'fixed',top:16,right:16,background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'50%',width:40,height:40,color:'#fff',fontSize:'1.2rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
