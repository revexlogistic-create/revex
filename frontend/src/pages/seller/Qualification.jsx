// src/pages/seller/Qualification.jsx — Étapes 1-3 du processus REVEX
import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

const C = { forest: '#1E3D0F', leaf: '#4A7C2F', sage: '#7EA86A', cream: '#F6F1E7', beige: '#EDE6D3', beigemid: '#D9CEBC', white: '#FDFAF4', muted: '#5C5C50', eco: '#27AE60' };

export default function Qualification() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    rc_document_url: '', ice_document_url: '', identity_document_url: '',
    stock_classification: '', stock_criticality: '', stock_rotation: '',
    compliance_signed: false, quality_signed: false
  });

  const { data: qualData } = useQuery('my-qualification', () =>
    api.get('/analysis/seller-qualification').then(r => r.data)
  );
  const qual = qualData?.qualification;

  const mutation = useMutation(
    (data) => api.post('/analysis/seller-qualification', data),
    { onSuccess: () => { toast.success('✅ Dossier soumis ! Vérification sous 48h.'); }, onError: (e) => toast.error(e.response?.data?.error || 'Erreur') }
  );

  const uploadMutation = useMutation(
    ({ file, type }) => { const fd = new FormData(); fd.append('document', file); return api.post(`/upload/document?type=qualification`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); }
  );

  const handleFileUpload = async (field, file) => {
    const res = await uploadMutation.mutateAsync({ file, type: 'qualification' });
    setForm(f => ({ ...f, [field]: res.data.url }));
    toast.success('Document uploadé');
  };

  const steps = [
    { num: 1, label: 'Vérification juridique', icon: '🏢' },
    { num: 2, label: 'Classification du stock', icon: '📊' },
    { num: 3, label: 'Engagements', icon: '📋' },
  ];

  const statusColors = { pending: '#E67E22', in_review: '#2980B9', approved: C.eco, rejected: '#C0392B' };
  const statusLabels = { pending: 'Non soumis', in_review: 'En cours de vérification', approved: '✅ Approuvé', rejected: '❌ Refusé' };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 2rem' }}>
      {/* En-tête */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2.2rem', color: C.forest, marginBottom: '0.5rem' }}>Qualification Vendeur</h1>
        <p style={{ color: C.muted, fontSize: '0.95rem', lineHeight: 1.6 }}>
          Pour vendre sur REVEX, votre entreprise doit être qualifiée. Ce processus en 3 étapes garantit la confiance de nos acheteurs et valorise votre stock.
        </p>
      </div>

      {/* Statut actuel */}
      {qual && (
        <div style={{ background: C.beige, borderRadius: 16, padding: '1.2rem 1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${C.beigemid}` }}>
          <div>
            <div style={{ fontWeight: 600, color: C.forest }}>Statut de votre qualification</div>
            <div style={{ fontSize: '0.85rem', color: C.muted, marginTop: '0.2rem' }}>Soumis le {new Date(qual.created_at).toLocaleDateString('fr-MA')}</div>
          </div>
          <div style={{ background: statusColors[qual.status] + '22', color: statusColors[qual.status], padding: '0.4rem 1rem', borderRadius: 100, fontWeight: 600, fontSize: '0.88rem' }}>
            {statusLabels[qual.status] || qual.status}
          </div>
        </div>
      )}

      {/* Stepper */}
      <div style={{ display: 'flex', marginBottom: '2.5rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 20, left: '12%', right: '12%', height: 2, background: C.beigemid, zIndex: 0 }} />
        {steps.map(s => (
          <div key={s.num} onClick={() => setStep(s.num)} style={{ flex: 1, textAlign: 'center', cursor: 'pointer', position: 'relative', zIndex: 1 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: step >= s.num ? C.forest : C.white, border: `2px solid ${step >= s.num ? C.forest : C.beigemid}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem', fontSize: '1.1rem' }}>
              {step > s.num ? <span style={{ color: '#fff', fontSize: '0.85rem' }}>✓</span> : <span>{s.icon}</span>}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: step === s.num ? 600 : 400, color: step === s.num ? C.forest : C.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ÉTAPE 1 : Vérification juridique */}
      {step === 1 && (
        <div style={card}>
          <h2 style={cardTitle}>🏢 Étape 1 — Vérification juridique</h2>
          <p style={cardDesc}>Uploadez les documents officiels de votre entreprise pour vérification par notre équipe.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {[
              { field: 'rc_document_url', label: 'Registre de Commerce (RC)', required: true },
              { field: 'ice_document_url', label: 'Identifiant Commun de l\'Entreprise (ICE)', required: true },
              { field: 'identity_document_url', label: 'Pièce d\'identité du représentant légal', required: true },
            ].map(doc => (
              <div key={doc.field}>
                <label style={labelSt}>{doc.label} {doc.required && '*'}</label>
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                  <input type="file" accept=".pdf,.jpg,.png" onChange={e => e.target.files[0] && handleFileUpload(doc.field, e.target.files[0])} style={{ display: 'none' }} id={doc.field} />
                  <label htmlFor={doc.field} style={{ ...actionBtn, display: 'inline-flex', cursor: 'pointer', padding: '0.6rem 1.2rem' }}>
                    📎 Choisir un fichier
                  </label>
                  {form[doc.field] && <span style={{ color: C.eco, fontSize: '0.85rem' }}>✓ Document uploadé</span>}
                  {!form[doc.field] && qual?.[doc.field] && <span style={{ color: C.eco, fontSize: '0.85rem' }}>✓ Déjà soumis</span>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button onClick={() => setStep(2)} style={primaryBtn}>Étape suivante →</button>
          </div>
        </div>
      )}

      {/* ÉTAPE 2 : Classification du stock */}
      {step === 2 && (
        <div style={card}>
          <h2 style={cardTitle}>📊 Étape 2 — Classification de votre stock</h2>
          <p style={cardDesc}>Aidez-nous à comprendre la nature de votre stock pour mieux le valoriser sur la plateforme.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={labelSt}>Type de stock principal *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                {[['spare_parts', '🔧 Pièces de rechange PDR'], ['equipment', '⚙️ Équipements industriels'], ['raw_material', '🏗️ Matières premières'], ['consumable', '📦 Consommables']].map(([v, l]) => (
                  <div key={v} onClick={() => setForm(f => ({ ...f, stock_classification: v }))} style={{ ...selectCard, borderColor: form.stock_classification === v ? C.leaf : C.beigemid, background: form.stock_classification === v ? '#E8F8EE' : C.cream }}>
                    <span style={{ fontSize: '1.3rem' }}>{l.split(' ')[0]}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: form.stock_classification === v ? 600 : 400 }}>{l.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={labelSt}>Criticité du stock</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                {[['critical', '🔴 Critique'], ['standard', '🟡 Standard'], ['low', '🟢 Faible']].map(([v, l]) => (
                  <div key={v} onClick={() => setForm(f => ({ ...f, stock_criticality: v }))} style={{ ...selectCard, borderColor: form.stock_criticality === v ? C.leaf : C.beigemid, background: form.stock_criticality === v ? '#E8F8EE' : C.cream, justifyContent: 'center' }}>
                    {l}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={labelSt}>Rotation du stock</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                {[['fast', '⚡ Rapide (< 3 mois)'], ['medium', '📅 Moyen (3-12 mois)'], ['slow', '🐢 Lent (1-3 ans)'], ['dormant', '💤 Dormant (> 3 ans)']].map(([v, l]) => (
                  <div key={v} onClick={() => setForm(f => ({ ...f, stock_rotation: v }))} style={{ ...selectCard, borderColor: form.stock_rotation === v ? C.leaf : C.beigemid, background: form.stock_rotation === v ? '#E8F8EE' : C.cream }}>
                    <span style={{ fontSize: '1.1rem' }}>{l.split(' ')[0]}</span>
                    <span style={{ fontSize: '0.82rem' }}>{l.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
            <button onClick={() => setStep(1)} style={secondaryBtn}>← Retour</button>
            <button onClick={() => setStep(3)} style={primaryBtn}>Étape suivante →</button>
          </div>
        </div>
      )}

      {/* ÉTAPE 3 : Engagements */}
      {step === 3 && (
        <div style={card}>
          <h2 style={cardTitle}>📋 Étape 3 — Engagements de conformité</h2>
          <p style={cardDesc}>En signant ces engagements, vous vous conformez aux standards qualité REVEX et garantissez la fiabilité de vos offres.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { field: 'compliance_signed', title: 'Engagement de conformité légale', desc: 'Je certifie que toutes les pièces proposées sont légalement disponibles à la vente, exementes de tout litige juridique ou financier, et conformes aux réglementations marocaines en vigueur.' },
              { field: 'quality_signed', title: 'Charte qualité REVEX', desc: 'Je m\'engage à décrire fidèlement l\'état réel de chaque pièce, fournir les fiches techniques disponibles, respecter le classement qualité A+ à D, et accepter la procédure de litige REVEX.' },
            ].map(eng => (
              <div key={eng.field} onClick={() => setForm(f => ({ ...f, [eng.field]: !f[eng.field] }))}
                style={{ background: form[eng.field] ? '#E8F8EE' : C.cream, border: `2px solid ${form[eng.field] ? C.eco : C.beigemid}`, borderRadius: 14, padding: '1.2rem', cursor: 'pointer', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: 4, border: `2px solid ${form[eng.field] ? C.eco : C.beigemid}`, background: form[eng.field] ? C.eco : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  {form[eng.field] && <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: C.forest, fontSize: '0.9rem', marginBottom: '0.3rem' }}>{eng.title}</div>
                  <div style={{ fontSize: '0.8rem', color: C.muted, lineHeight: 1.5 }}>{eng.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(2)} style={secondaryBtn}>← Retour</button>
            <button onClick={() => mutation.mutate(form)} disabled={!form.compliance_signed || !form.quality_signed || mutation.isLoading} style={{ ...primaryBtn, opacity: (!form.compliance_signed || !form.quality_signed) ? 0.5 : 1 }}>
              {mutation.isLoading ? 'Envoi...' : '✅ Soumettre le dossier'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const card = { background: '#FDFAF4', border: '1px solid #D9CEBC', borderRadius: 20, padding: '2rem' };
const cardTitle = { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontWeight: 700, color: '#1E3D0F', marginBottom: '0.5rem' };
const cardDesc = { fontSize: '0.88rem', color: '#5C5C50', marginBottom: '1.5rem', lineHeight: 1.6 };
const labelSt = { fontSize: '0.82rem', fontWeight: 600, color: '#1E3D0F', display: 'block', marginBottom: '0.5rem' };
const actionBtn = { background: '#EDE6D3', color: '#1E3D0F', border: '1px solid #D9CEBC', borderRadius: 100, fontSize: '0.85rem', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" };
const primaryBtn = { background: '#1E3D0F', color: '#F6F1E7', border: 'none', padding: '0.85rem 2rem', borderRadius: 100, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" };
const secondaryBtn = { background: 'transparent', color: '#1E3D0F', border: '1.5px solid #D9CEBC', padding: '0.85rem 2rem', borderRadius: 100, fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" };
const selectCard = { display: 'flex', alignItems: 'center', gap: 8, padding: '0.8rem 1rem', border: '1.5px solid', borderRadius: 12, cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.15s' };
