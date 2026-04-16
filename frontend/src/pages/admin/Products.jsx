// src/pages/admin/Products.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../api/axios';
const C = {forest:'#1E3D0F',leaf:'#4A7C2F',cream:'#F6F1E7',beige:'#EDE6D3',beigemid:'#D9CEBC',white:'#FDFAF4',muted:'#5C5C50',eco:'#27AE60',urgent:'#C0392B'};
export default function AdminProducts() {
  const qc = useQueryClient();
  const [search,setSearch]=useState(''); const [statusFilter,setStatusFilter]=useState('active');
  const { data } = useQuery(['admin-products',search,statusFilter],()=>api.get(`/admin/products?search=${search}&status=${statusFilter}`).then(r=>r.data));
  const archiveMut = useMutation(id=>api.delete(`/products/${id}`),{onSuccess:()=>{toast.success('Produit archivé');qc.invalidateQueries('admin-products');}});
  const activateMut = useMutation(id=>api.put(`/products/${id}`,{status:'active'}),{onSuccess:()=>{toast.success('Produit activé');qc.invalidateQueries('admin-products');}});
  const gradeColors={'A+':C.eco,A:'#2980B9',B:'#E67E22',C:C.urgent,D:'#7F8C8D'};
  const statusBadge={active:[C.eco,'Actif'],draft:[C.muted,'Brouillon'],sold:['#2980B9','Vendu'],archived:['#7F8C8D','Archivé']};
  return (
    <div style={{maxWidth:1180,margin:'0 auto',padding:'2.5rem 2rem'}}>
      <h1 style={{fontFamily:"'Cormorant Garamond', serif",fontSize:'2rem',color:C.forest,marginBottom:'1.5rem'}}>📦 Gestion des produits</h1>
      <div style={{display:'flex',gap:'0.8rem',marginBottom:'1.5rem',flexWrap:'wrap',background:C.white,padding:'1rem',borderRadius:14,border:`1px solid ${C.beigemid}`}}>
        <input placeholder="🔍 Rechercher un produit..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,padding:'0.6rem 1rem',border:`1.5px solid ${C.beigemid}`,borderRadius:100,fontSize:'0.88rem',fontFamily:"'DM Sans',sans-serif",outline:'none'}}/>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:'0.6rem 1rem',border:`1.5px solid ${C.beigemid}`,borderRadius:100,fontSize:'0.88rem',fontFamily:"'DM Sans',sans-serif",outline:'none'}}>
          <option value="all">Tous statuts</option><option value="active">Actifs</option><option value="draft">Brouillons</option><option value="sold">Vendus</option><option value="archived">Archivés</option>
        </select>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>
        {(data?.products||[]).map(p=>{
          const imgs=Array.isArray(p.images)?p.images:[];
          const [sc,sl]=statusBadge[p.status]||[C.muted,p.status];
          return (
            <div key={p.id} style={{background:C.white,border:`1px solid ${C.beigemid}`,borderRadius:14,padding:'1rem 1.5rem',display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
              <div style={{width:56,height:56,background:C.beige,borderRadius:8,overflow:'hidden',flexShrink:0}}>
                {imgs[0]?<img src={imgs[0]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.3rem',opacity:0.3}}>📦</div>}
              </div>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontWeight:600,color:C.forest,fontSize:'0.9rem'}}>{p.title?.substring(0,50)}</div>
                <div style={{fontSize:'0.75rem',color:C.muted,marginTop:'0.2rem'}}>{p.seller_company} • {p.category_name} • 👁 {p.views_count}</div>
              </div>
              <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
                {p.quality_grade && <span style={{background:(gradeColors[p.quality_grade]||'#888')+'22',color:gradeColors[p.quality_grade]||'#888',fontSize:'0.7rem',fontWeight:700,padding:'0.15rem 0.5rem',borderRadius:100}}>Grade {p.quality_grade}</span>}
                <span style={{background:sc+'22',color:sc,fontSize:'0.7rem',fontWeight:600,padding:'0.15rem 0.5rem',borderRadius:100}}>{sl}</span>
                <span style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:700,color:C.leaf,fontSize:'1rem'}}>{Number(p.price).toLocaleString()} MAD</span>
              </div>
              <div style={{display:'flex',gap:'0.4rem'}}>
                <Link to={`/produit/${p.slug}`} target="_blank" style={{background:C.beige,color:C.forest,padding:'0.4rem 0.8rem',borderRadius:100,fontSize:'0.75rem',textDecoration:'none'}}>👁 Voir</Link>
                {p.status==='draft' && <button onClick={()=>activateMut.mutate(p.id)} style={{background:C.eco,color:'#fff',border:'none',padding:'0.4rem 0.8rem',borderRadius:100,fontSize:'0.75rem',cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>✅ Activer</button>}
                {p.status!=='archived' && <button onClick={()=>window.confirm('Archiver ce produit ?')&&archiveMut.mutate(p.id)} style={{background:'#FDECEA',color:C.urgent,border:'none',padding:'0.4rem 0.8rem',borderRadius:100,fontSize:'0.75rem',cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>🗑 Archiver</button>}
              </div>
            </div>
          );
        })}
        {data?.products?.length===0 && <div style={{textAlign:'center',padding:'3rem',color:C.muted}}>Aucun produit trouvé</div>}
      </div>
      <div style={{marginTop:'1rem',fontSize:'0.82rem',color:C.muted}}>Total : {data?.total||0} produits</div>
    </div>
  );
}
