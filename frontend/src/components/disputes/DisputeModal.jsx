// src/components/disputes/DisputeModal.jsx
import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
};

const REASONS = [
  { id:'not_received',       icon:'📭', label:'Commande non reçue',       desc:'Le colis n\'est jamais arrivé' },
  { id:'not_as_described',   icon:'❌', label:'Non conforme à l\'annonce', desc:'Le produit ne correspond pas à la description' },
  { id:'damaged',            icon:'💥', label:'Produit endommagé',         desc:'Le produit est arrivé abîmé ou cassé' },
  { id:'wrong_item',         icon:'🔄', label:'Mauvais article reçu',      desc:'Ce n\'est pas le bon produit' },
  { id:'quantity_issue',     icon:'⚖️', label:'Quantité incorrecte',       desc:'Moins d\'articles que commandé' },
  { id:'quality_issue',      icon:'⭐', label:'Qualité insuffisante',      desc:'Qualité bien en dessous du grade annoncé' },
  { id:'payment_issue',      icon:'💳', label:'Problème de paiement',      desc:'Paiement prélevé mais commande non confirmée' },
  { id:'other',              icon:'📋', label:'Autre motif',               desc:'Autre problème non listé ci-dessus' },
];

const lbl = { fontSize:'0.8rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.3rem' };
const inp = { width:'100%', padding:'0.7rem 0.9rem', border:'1.5px solid '+C.mid, borderRadius:10, fontSize:'0.88rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' };

export default function DisputeModal({ order, onClose }) {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [step, setStep]           = useState(1); // 1:motif | 2:détails | 3:preuves
  const [reason, setReason]       = useState('');
  const [description, setDescription] = useState('');
  const [evidences, setEvidences] = useState([]); // base64 images

  const openMutation = useMutation(
    (payload) => api.post('/disputes', payload),
    {
      onSuccess: () => {
        toast.success('⚖️ Litige ouvert — Notre équipe vous contactera sous 24h.');
        qc.invalidateQueries('buyer-orders-all');
        qc.invalidateQueries('my-disputes');
        onClose();
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur ouverture litige')
    }
  );

  const handlePhoto = (e) => {
    const files = Array.from(e.target.files).slice(0, 5 - evidences.length);
    files.forEach(file => {
      if (file.size > 4 * 1024 * 1024) { toast.warning('Photo trop grande (max 4 Mo)'); return; }
      const reader = new FileReader();
      reader.onload = ev => setEvidences(prev => [...prev, ev.target.result]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSubmit = () => {
    if (!reason)      return toast.error('Sélectionnez un motif');
    if (!description.trim() || description.length < 20)
      return toast.error('Décrivez le problème (min 20 caractères)');
    openMutation.mutate({
      order_id: order.id,
      reason,
      description: description.trim(),
      evidence_urls: evidences
    });
  };

  const selectedReason = REASONS.find(r => r.id === reason);
  const fmt = n => Number(n||0).toLocaleString('fr-MA');

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', overflowY:'auto' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:C.white, borderRadius:24, maxWidth:580, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,0.25)', maxHeight:'92vh', overflowY:'auto', margin:'auto' }}>

        {/* ── EN-TÊTE ── */}
        <div style={{ background:C.urgent, borderRadius:'24px 24px 0 0', padding:'1.5rem 2rem', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', color:'#fff', marginBottom:'0.2rem' }}>
              ⚖️ Ouvrir un litige
            </h2>
            <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.8)' }}>
              Commande {order.order_number} · {order.product_title?.substring(0,35)}
            </div>
          </div>
          <button onClick={onClose}
            style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', color:'#fff', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
            ✕
          </button>
        </div>

        <div style={{ padding:'2rem' }}>

          {/* Stepper */}
          <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:'2rem' }}>
            {[['1','Motif'],['2','Détails'],['3','Preuves']].map(([n, label], i) => (
              <React.Fragment key={n}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:step>i+1?C.eco:step===i+1?C.urgent:C.beige, color:step>=i+1?'#fff':C.muted, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', fontWeight:700, transition:'all 0.2s' }}>
                    {step>i+1?'✓':n}
                  </div>
                  <div style={{ fontSize:'0.68rem', color:step===i+1?C.urgent:C.muted, fontWeight:step===i+1?700:400 }}>{label}</div>
                </div>
                {i<2 && <div style={{ flex:1, height:2, background:step>i+1?C.eco:C.mid, margin:'0 0.4rem', marginBottom:18, transition:'all 0.3s' }}/>}
              </React.Fragment>
            ))}
          </div>

          {/* Récap commande */}
          <div style={{ background:C.beige, borderRadius:12, padding:'0.9rem 1.1rem', marginBottom:'1.5rem', display:'flex', gap:'1.2rem', alignItems:'center' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, color:C.forest, fontSize:'0.88rem' }}>{order.product_title?.substring(0,45)}</div>
              <div style={{ fontSize:'0.75rem', color:C.muted, marginTop:'0.2rem' }}>Vendeur : {order.seller_company} · Date : {new Date(order.created_at).toLocaleDateString('fr-MA')}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:C.urgent }}>{fmt(order.final_price)} MAD</div>
              <div style={{ fontSize:'0.7rem', color:C.muted }}>Montant bloqué escrow</div>
            </div>
          </div>

          {/* ══ ÉTAPE 1 : MOTIF ══ */}
          {step === 1 && (
            <div>
              <p style={{ fontSize:'0.88rem', color:C.muted, marginBottom:'1.2rem' }}>Sélectionnez le motif de votre litige :</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem' }}>
                {REASONS.map(r => (
                  <div key={r.id} onClick={() => setReason(r.id)}
                    style={{ border:'2px solid '+(reason===r.id?C.urgent:C.mid), borderRadius:12, padding:'0.9rem', cursor:'pointer', background:reason===r.id?'#FDECEA':C.cream, transition:'all 0.15s' }}>
                    <div style={{ display:'flex', gap:'0.6rem', alignItems:'flex-start' }}>
                      <span style={{ fontSize:'1.3rem', flexShrink:0 }}>{r.icon}</span>
                      <div>
                        <div style={{ fontWeight:600, fontSize:'0.85rem', color:C.forest }}>{r.label}</div>
                        <div style={{ fontSize:'0.72rem', color:C.muted, marginTop:'0.1rem' }}>{r.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ ÉTAPE 2 : DESCRIPTION ══ */}
          {step === 2 && (
            <div>
              <div style={{ background:'#FEF5E7', border:'1px solid #F0B27A', borderRadius:12, padding:'0.8rem 1rem', marginBottom:'1.2rem', fontSize:'0.82rem', color:'#784212' }}>
                {selectedReason?.icon} Motif : <strong>{selectedReason?.label}</strong>
              </div>
              <div style={{ marginBottom:'1rem' }}>
                <label style={lbl}>Description détaillée du problème * <span style={{ color:C.muted, fontWeight:400 }}>(min 20 caractères)</span></label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5}
                  placeholder="Décrivez précisément le problème : date de réception, état constaté, écart avec l'annonce, tentatives de résolution amiable déjà effectuées..."
                  style={{ ...inp, resize:'vertical' }}/>
                <div style={{ fontSize:'0.72rem', color:description.length<20?C.urgent:C.eco, marginTop:'0.3rem', textAlign:'right' }}>
                  {description.length} caractères {description.length<20?'(minimum 20)':'✓'}
                </div>
              </div>
              <div style={{ background:'#E8F8EE', borderRadius:10, padding:'0.8rem 1rem', fontSize:'0.78rem', color:'#145A32', lineHeight:1.6 }}>
                💡 <strong>Conseil :</strong> Mentionnez les échanges déjà faits avec le vendeur. Une description complète accélère la résolution.
              </div>
            </div>
          )}

          {/* ══ ÉTAPE 3 : PREUVES ══ */}
          {step === 3 && (
            <div>
              <p style={{ fontSize:'0.88rem', color:C.muted, marginBottom:'1rem' }}>
                Ajoutez des photos ou captures d'écran comme preuves. <span style={{ color:C.forest, fontWeight:600 }}>Fortement recommandé</span> pour une résolution rapide.
              </p>

              {/* Zone upload */}
              <div onClick={() => evidences.length < 5 && fileRef.current?.click()}
                style={{ border:'2px dashed '+(evidences.length>=5?C.mid:C.orange), borderRadius:14, padding:'1.5rem', textAlign:'center', cursor:evidences.length>=5?'not-allowed':'pointer', background:'#FEF5E7', marginBottom:'1rem', transition:'border-color 0.2s' }}
                onMouseEnter={e=>evidences.length<5&&(e.currentTarget.style.borderColor=C.urgent)}
                onMouseLeave={e=>evidences.length<5&&(e.currentTarget.style.borderColor=C.orange)}>
                <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>📎</div>
                <div style={{ fontSize:'0.88rem', fontWeight:600, color:C.forest }}>
                  {evidences.length >= 5 ? '5 preuves maximum atteint' : 'Cliquez pour ajouter des preuves'}
                </div>
                <div style={{ fontSize:'0.75rem', color:C.muted, marginTop:'0.2rem' }}>
                  Photos, captures d'écran · JPG, PNG · Max 4 Mo · {5-evidences.length} restante(s)
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handlePhoto}/>
              </div>

              {/* Prévisualisation */}
              {evidences.length > 0 && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'0.5rem', marginBottom:'1rem' }}>
                  {evidences.map((ev, i) => (
                    <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:10, overflow:'hidden', border:'2px solid '+C.eco }}>
                      <img src={ev} alt={'Preuve '+(i+1)} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      <button onClick={() => setEvidences(prev => prev.filter((_,j)=>j!==i))}
                        style={{ position:'absolute', top:2, right:2, background:'rgba(192,57,43,0.85)', color:'#fff', border:'none', borderRadius:'50%', width:18, height:18, cursor:'pointer', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background:C.beige, borderRadius:12, padding:'1rem', fontSize:'0.78rem', color:C.muted, lineHeight:1.7 }}>
                <div style={{ fontWeight:700, color:C.forest, marginBottom:'0.4rem' }}>ℹ️ Ce qui se passe ensuite</div>
                🔍 L'équipe REVEX examine le dossier (sous 24-48h)<br/>
                💬 Le vendeur peut répondre et soumettre ses preuves<br/>
                ⚖️ REVEX arbitre et décide de la libération de l'escrow<br/>
                📩 Vous serez notifié à chaque étape
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'1.8rem', paddingTop:'1.2rem', borderTop:'1px solid '+C.mid }}>
            <button onClick={() => step>1 ? setStep(s=>s-1) : onClose()}
              style={{ background:'transparent', color:C.muted, border:'1px solid '+C.mid, padding:'0.75rem 1.5rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              {step > 1 ? '← Retour' : 'Annuler'}
            </button>

            {step < 3 ? (
              <button
                disabled={(step===1&&!reason)||(step===2&&description.length<20)}
                onClick={() => setStep(s=>s+1)}
                style={{ background:(step===1&&!reason)||(step===2&&description.length<20)?C.mid:C.urgent, color:'#fff', border:'none', padding:'0.75rem 2rem', borderRadius:100, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                Suivant →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={openMutation.isLoading}
                style={{ background:openMutation.isLoading?C.mid:C.urgent, color:'#fff', border:'none', padding:'0.75rem 2rem', borderRadius:100, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                {openMutation.isLoading ? '⏳ Envoi...' : '⚖️ Ouvrir le litige'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
