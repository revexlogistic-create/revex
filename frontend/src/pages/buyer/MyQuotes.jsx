// src/pages/buyer/MyQuotes.jsx
import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
const C = { forest:'#1E3D0F',leaf:'#4A7C2F',cream:'#F6F1E7',beige:'#EDE6D3',beigemid:'#D9CEBC',white:'#FDFAF4',muted:'#5C5C50',eco:'#27AE60',urgent:'#C0392B' };
export default function MyQuotes() {
  const { data } = useQuery('quotes-buyer', () => api.get('/quotes?role_as=buyer').then(r => r.data));
  const qsc = { pending:'#E67E22', accepted:C.eco, rejected:C.urgent, expired:'#7F8C8D' };
  return (
    <div style={{maxWidth:860,margin:'0 auto',padding:'2.5rem 2rem'}}>
      <h1 style={{fontFamily:"'Cormorant Garamond', serif",fontSize:'2rem',color:C.forest,marginBottom:'1.5rem'}}>Mes devis envoyés</h1>
      {(data?.quotes||[]).map(q => (
        <div key={q.id} style={{background:C.white,border:`1px solid ${C.beigemid}`,borderRadius:16,padding:'1.5rem',marginBottom:'1rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.8rem'}}>
            <div>
              <Link to={`/produit/${q.product_id}`} style={{fontWeight:600,color:C.forest,textDecoration:'none',fontSize:'0.95rem'}}>{q.product_title}</Link>
              <div style={{fontSize:'0.8rem',color:C.muted,marginTop:'0.2rem'}}>Vendeur: {q.seller_company} • {new Date(q.created_at).toLocaleDateString('fr-MA')}</div>
            </div>
            <div style={{background:(qsc[q.status]||'#888')+'22',color:qsc[q.status]||'#888',padding:'0.3rem 0.8rem',borderRadius:100,fontSize:'0.78rem',fontWeight:600}}>{q.status}</div>
          </div>
          <div style={{background:C.beige,borderRadius:10,padding:'0.8rem',fontSize:'0.85rem',color:C.muted,marginBottom:'0.8rem'}}>
            Qté: {q.quantity} • {q.proposed_price ? `Prix proposé: ${Number(q.proposed_price).toLocaleString()} MAD` : 'Au prix catalogue'} • {q.message}
          </div>
          {q.seller_response && (
            <div style={{background:'#E8F8EE',border:'1px solid #a8dfc0',borderRadius:10,padding:'0.8rem',fontSize:'0.85rem',color:'#145A32'}}>
              <strong>Réponse vendeur :</strong> {q.seller_response}
              {q.counter_price && <> — Contre-offre : <strong>{Number(q.counter_price).toLocaleString()} MAD</strong></>}
            </div>
          )}
        </div>
      ))}
      {data?.quotes?.length === 0 && <div style={{textAlign:'center',padding:'4rem',color:C.muted}}>Aucun devis envoyé</div>}
    </div>
  );
}
