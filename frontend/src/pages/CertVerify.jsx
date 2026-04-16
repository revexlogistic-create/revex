// src/pages/CertVerify.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../api/axios';

const C = {forest:'#1E3D0F',leaf:'#4A7C2F',cream:'#F6F1E7',beige:'#EDE6D3',beigemid:'#D9CEBC',white:'#FDFAF4',muted:'#5C5C50',eco:'#27AE60',urgent:'#C0392B'};

export default function CertVerify() {
  const { hash } = useParams();
  const { data, isLoading } = useQuery(['cert', hash], () => api.get(`/analysis/certificates/verify/${hash}`).then(r => r.data));
  if (isLoading) return <div style={{textAlign:'center',padding:'4rem',color:C.muted}}>Vérification en cours...</div>;
  return (
    <div style={{maxWidth:640,margin:'4rem auto',padding:'2rem'}}>
      <div style={{background:data?.valid?'#E8F8EE':'#FDECEA',border:`2px solid ${data?.valid?C.eco:C.urgent}`,borderRadius:24,padding:'2.5rem',textAlign:'center'}}>
        <div style={{fontSize:'3.5rem',marginBottom:'1rem'}}>{data?.valid?'✅':'❌'}</div>
        <h1 style={{fontFamily:"'Cormorant Garamond', serif",fontSize:'1.8rem',fontWeight:700,color:C.forest,marginBottom:'0.5rem'}}>
          {data?.valid?'Certificat REVEX Valide':'Certificat Invalide'}
        </h1>
        {data?.valid && data.certificate && (
          <div style={{textAlign:'left',marginTop:'1.5rem',background:C.white,borderRadius:16,padding:'1.5rem',border:`1px solid ${C.beigemid}`}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.8rem'}}>
              {[['Référence','certificate_ref'],['Produit','product_title'],['Référence pièce','product_reference'],['Grade qualité','quality_grade'],['État','condition'],['Vendeur','seller_company'],['Date émission','issued_at'],['Valable jusqu\'au','expires_at']].map(([l,k])=>(
                <div key={k} style={{background:C.beige,borderRadius:10,padding:'0.7rem 1rem'}}>
                  <div style={{fontSize:'0.7rem',color:C.muted,textTransform:'uppercase',letterSpacing:'0.05em'}}>{l}</div>
                  <div style={{fontSize:'0.88rem',fontWeight:500,color:C.forest}}>{k.includes('_at')&&data.certificate[k]?new Date(data.certificate[k]).toLocaleDateString('fr-MA'):data.certificate[k]||'—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!data?.valid && <p style={{color:C.urgent,marginTop:'1rem'}}>Ce certificat n'a pas pu être vérifié dans notre base de données.</p>}
      </div>
    </div>
  );
}
