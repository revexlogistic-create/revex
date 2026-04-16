// src/pages/admin/Users.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';
import api from '../../api/axios';
const C = {forest:'#1E3D0F',leaf:'#4A7C2F',cream:'#F6F1E7',beige:'#EDE6D3',beigemid:'#D9CEBC',white:'#FDFAF4',muted:'#5C5C50',eco:'#27AE60',urgent:'#C0392B'};
export default function AdminUsers() {
  const qc = useQueryClient();
  const [search,setSearch]=useState(''); const [roleFilter,setRoleFilter]=useState(''); const [statusFilter,setStatusFilter]=useState('');
  const { data } = useQuery(['admin-users',search,roleFilter,statusFilter],()=>api.get(`/admin/users?search=${search}&role=${roleFilter}&status=${statusFilter}`).then(r=>r.data));
  const statusMut = useMutation(({id,status})=>api.put(`/admin/users/${id}/status`,{status}),{onSuccess:(_,v)=>{toast.success(`Utilisateur ${v.status}`);qc.invalidateQueries('admin-users');}});
  const qualMut = useMutation(({id,status,notes})=>api.put(`/admin/qualifications/${id}`,{status,review_notes:notes}),{onSuccess:()=>{toast.success('Qualification mise à jour');qc.invalidateQueries('admin-users');}});
  const roleColors={buyer:'#2980B9',seller:C.leaf,distributor:'#E67E22',admin:C.urgent};
  const statusColors={active:C.eco,pending:'#E67E22',suspended:C.urgent};
  return (
    <div style={{maxWidth:1180,margin:'0 auto',padding:'2.5rem 2rem'}}>
      <h1 style={{fontFamily:"'Cormorant Garamond', serif",fontSize:'2rem',color:C.forest,marginBottom:'1.5rem'}}>👥 Gestion des utilisateurs</h1>
      <div style={{display:'flex',gap:'0.8rem',marginBottom:'1.5rem',flexWrap:'wrap',background:C.white,padding:'1rem',borderRadius:14,border:`1px solid ${C.beigemid}`}}>
        <input placeholder="🔍 Rechercher société, email..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,flex:1,minWidth:220}}/>
        <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} style={inp}><option value="">Tous rôles</option><option value="buyer">Acheteur</option><option value="seller">Vendeur</option><option value="distributor">Distributeur</option></select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={inp}><option value="">Tous statuts</option><option value="active">Actif</option><option value="pending">En attente</option><option value="suspended">Suspendu</option></select>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>
        {(data?.users||[]).map(u=>(
          <div key={u.id} style={{background:C.white,border:`1px solid ${C.beigemid}`,borderRadius:14,padding:'1.2rem 1.5rem',display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontWeight:600,color:C.forest,fontSize:'0.95rem'}}>{u.company_name}</div>
              <div style={{fontSize:'0.78rem',color:C.muted}}>{u.email} • {u.city||'N/A'} • {u.sector||'N/A'}</div>
            </div>
            <div style={{display:'flex',gap:'0.5rem',alignItems:'center',flexWrap:'wrap'}}>
              <span style={{background:(roleColors[u.role]||'#888')+'22',color:roleColors[u.role]||'#888',padding:'0.2rem 0.6rem',borderRadius:100,fontSize:'0.72rem',fontWeight:600}}>{u.role}</span>
              <span style={{background:(statusColors[u.status]||'#888')+'22',color:statusColors[u.status]||'#888',padding:'0.2rem 0.6rem',borderRadius:100,fontSize:'0.72rem',fontWeight:600}}>{u.status}</span>
              {u.ice_number && <span style={{fontSize:'0.72rem',color:C.muted}}>ICE: {u.ice_number}</span>}
              <span style={{fontSize:'0.72rem',color:C.muted}}>⭐ {Number(u.rating||0).toFixed(1)}</span>
            </div>
            <div style={{display:'flex',gap:'0.4rem'}}>
              {u.status==='pending' && <button onClick={()=>statusMut.mutate({id:u.id,status:'active'})} style={{background:C.eco,color:'#fff',border:'none',padding:'0.4rem 0.9rem',borderRadius:100,fontSize:'0.75rem',cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>✅ Activer</button>}
              {u.status==='active' && <button onClick={()=>statusMut.mutate({id:u.id,status:'suspended'})} style={{background:C.urgent,color:'#fff',border:'none',padding:'0.4rem 0.9rem',borderRadius:100,fontSize:'0.75rem',cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>🚫 Suspendre</button>}
              {u.status==='suspended' && <button onClick={()=>statusMut.mutate({id:u.id,status:'active'})} style={{background:'#E67E22',color:'#fff',border:'none',padding:'0.4rem 0.9rem',borderRadius:100,fontSize:'0.75rem',cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>↩ Réactiver</button>}
              {u.role==='seller' && u.status==='pending' && <button onClick={()=>{const notes=window.prompt('Notes de qualification:','');qualMut.mutate({id:u.id,status:'approved',notes});}} style={{background:C.leaf,color:'#fff',border:'none',padding:'0.4rem 0.9rem',borderRadius:100,fontSize:'0.75rem',cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>📋 Qualifier</button>}
            </div>
          </div>
        ))}
        {data?.users?.length===0 && <div style={{textAlign:'center',padding:'3rem',color:C.muted}}>Aucun utilisateur trouvé</div>}
      </div>
      <div style={{marginTop:'1rem',fontSize:'0.82rem',color:C.muted}}>Total : {data?.total||0} utilisateurs</div>
    </div>
  );
}
const inp={padding:'0.6rem 1rem',border:`1.5px solid #D9CEBC`,borderRadius:100,fontSize:'0.88rem',fontFamily:"'DM Sans',sans-serif",outline:'none'};
