// src/pages/Messages.jsx — Messagerie B2B REVEX (corrigée)
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50', eco:'#27AE60', blue:'#2980B9'
};

export default function Messages() {
  const { user }  = useAuth();
  const { id }    = useParams();
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const endRef    = useRef(null);
  const inputRef  = useRef(null);

  const [activeConv, setActiveConv]       = useState(id || null);
  const [msg, setMsg]                     = useState('');
  const [recipientId, setRecipientId]     = useState(null);
  const [showNewMsg, setShowNewMsg]       = useState(false);
  const [newMsgEmail, setNewMsgEmail]     = useState('');
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 769);
  useEffect(function() { var h = function() { setIsMobile(window.innerWidth < 769); }; window.addEventListener('resize', h); return function() { window.removeEventListener('resize', h); }; }, []);
  const [newMsgText, setNewMsgText]       = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const [selectedUser, setSelectedUser]   = useState(null); // utilisateur sélectionné pour nouveau message

  // ── Conversations ────────────────────────────────────────────
  const { data: convData, isLoading: convLoading } = useQuery(
    'conversations',
    () => api.get('/messages/conversations').then(r => r.data),
    { refetchInterval: 5000 }
  );

  // ── Messages actifs ──────────────────────────────────────────
  const { data: msgsData, isLoading: msgsLoading } = useQuery(
    ['messages', activeConv],
    () => api.get(`/messages/conversations/${activeConv}`).then(r => r.data),
    {
      enabled: !!activeConv,
      refetchInterval: 3000,
      onSuccess: (data) => {
        if (data?.conversation && user) {
          const conv = data.conversation;
          const other = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
          setRecipientId(other);
        }
      }
    }
  );

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgsData?.messages?.length]);
  useEffect(() => { if (activeConv) inputRef.current?.focus(); }, [activeConv]);

  // ── Sélectionner une conversation ────────────────────────────
  const selectConv = (conv) => {
    setActiveConv(conv.id);
    setMsg('');
    setRecipientId(conv.other_id);
    navigate(`/messages/${conv.id}`);
  };

  // ── Envoyer message ──────────────────────────────────────────
  const sendMutation = useMutation(
    (content) => {
      if (!recipientId) throw new Error('Destinataire introuvable');
      return api.post('/messages/send', {
        recipient_id: recipientId,
        product_id:   msgsData?.conversation?.product_id || null,
        content,
        type: 'text'
      });
    },
    {
      onSuccess: () => {
        setMsg('');
        qc.invalidateQueries(['messages', activeConv]);
        qc.invalidateQueries('conversations');
      },
      onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur envoi')
    }
  );

  // ── Rechercher un utilisateur pour nouveau message ────────────
  const searchUser = async (term) => {
    setSelectedUser(null); // réinitialiser la sélection quand on retape
    if (!term || term.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      // Utiliser l'endpoint public /users/search (accessible à tous)
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(term)}`);
      setSearchResults(data.users || []);
    } catch {
      setSearchResults([]);
    } finally { setSearching(false); }
  };

  // ── Démarrer nouvelle conversation ───────────────────────────
  const startNewConv = useMutation(
    ({ recipient_id, content }) => api.post('/messages/send', { recipient_id, content }),
    {
      onSuccess: (res) => {
        toast.success('✅ Message envoyé !');
        setShowNewMsg(false);
        setNewMsgEmail('');
        setNewMsgText('');
        setSearchResults([]);
        qc.invalidateQueries('conversations');
        setActiveConv(res.data.conversation_id);
        navigate(`/messages/${res.data.conversation_id}`);
      },
      onError: (e) => toast.error(e.response?.data?.error || 'Erreur')
    }
  );

  const handleSend = () => {
    const content = msg.trim();
    if (!content || !recipientId) return;
    sendMutation.mutate(content);
  };

  const activeConvInfo = (convData?.conversations || []).find(c => c.id === activeConv);

  return (
    <div style={{ display:'flex', height:'calc(100vh - 130px)', background:C.cream, overflow:'hidden', width:'100%', maxWidth:'100vw', position:'relative', minHeight:0 }}>

      {/* ── SIDEBAR ── */}
      <div style={{ width: isMobile ? '100%' : 300, minWidth: isMobile ? '100%' : 300, maxWidth: isMobile ? '100%' : 300, background:C.white, borderRight: isMobile ? 'none' : '1px solid '+C.mid, display: isMobile && activeConv ? 'none' : 'flex', flexDirection:'column', flexShrink:0, overflow:'hidden' }}>

        {/* Header + bouton nouveau */}
        <div style={{ padding:'1rem 1.2rem', borderBottom:'1px solid '+C.mid, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', fontWeight:700, color:C.forest }}>
            💬 Messages
          </div>
          <button
            onClick={() => setShowNewMsg(true)}
            style={{ background:C.forest, color:C.cream, border:'none', borderRadius:100, padding:'0.35rem 0.9rem', fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}
            title="Nouveau message"
          >
            + Nouveau
          </button>
        </div>

        {/* Liste conversations */}
        <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', minHeight:0 }}>
          {convLoading && <div style={{ padding:'2rem', textAlign:'center', color:C.muted, fontSize:'0.85rem' }}>Chargement...</div>}

          {!convLoading && (convData?.conversations || []).length === 0 && (
            <div style={{ padding:'2rem', textAlign:'center' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'0.8rem', opacity:0.3 }}>💬</div>
              <p style={{ color:C.muted, fontSize:'0.82rem', lineHeight:1.7 }}>
                Aucune conversation.<br/>
                Cliquez <strong style={{cursor:'pointer',color:C.leaf}} onClick={() => setShowNewMsg(true)}>+ Nouveau</strong> pour écrire,<br/>
                ou contactez un vendeur depuis une annonce.
              </p>
            </div>
          )}

          {(convData?.conversations || []).map(conv => {
            const isActive  = activeConv === conv.id;
            const hasUnread = parseInt(conv.unread_count) > 0;
            return (
              <div key={conv.id} onClick={() => selectConv(conv)}
                style={{ padding:'0.9rem 1.2rem', cursor:'pointer', background:isActive ? C.beige : 'transparent', borderBottom:'1px solid '+(C.beige)+'', borderLeft:'3px solid '+(isActive ? C.leaf : 'transparent'), transition:'background 0.15s' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem', marginBottom:'0.2rem' }}>
                  <div style={{ fontWeight: hasUnread ? 700 : 500, fontSize:'0.88rem', color:C.forest }}>{conv.other_company || 'Entreprise'}</div>
                  {hasUnread && <span style={{ background:C.eco, color:'#fff', borderRadius:'50%', minWidth:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:700, padding:'0 3px' }}>{conv.unread_count}</span>}
                </div>
                <div style={{ fontSize:'0.73rem', color: hasUnread ? C.forest : C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight: hasUnread ? 500 : 400 }}>
                  {conv.last_message || '...'}
                </div>
                {conv.product_title && (
                  <div style={{ fontSize:'0.67rem', color:C.leaf, marginTop:'0.15rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    📦 {conv.product_title}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ZONE CHAT ── */}
      <div style={{ flex:1, width: isMobile ? '100%' : 'auto', display: isMobile && !activeConv ? 'none' : 'flex', flexDirection:'column', minWidth:0, overflow:'hidden', minHeight:0 }}>
        {activeConv ? (
          <>
            {/* Header */}
            <div style={{ padding:'0.8rem 1rem', background:C.white, borderBottom:'1px solid '+C.mid, display:'flex', alignItems:'center', gap:'0.6rem', flexShrink:0 }}>
              {isMobile && (
                <button onClick={() => setActiveConv(null)}
                  style={{ background:C.beige, border:'none', borderRadius:'50%', width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'1rem', color:C.forest, flexShrink:0 }}>
                  ←
                </button>
              )}
              <div>
                <div style={{ fontWeight:600, color:C.forest, fontSize:'0.95rem' }}>{activeConvInfo?.other_company || 'Conversation'}</div>
                {activeConvInfo?.product_title && <div style={{ fontSize:'0.73rem', color:C.muted, marginTop:'0.1rem' }}>📦 {activeConvInfo.product_title}</div>}
              </div>
              {!recipientId && <div style={{ marginLeft:'auto', fontSize:'0.72rem', color:C.muted }}>⏳ Chargement...</div>}
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'1.5rem', display:'flex', flexDirection:'column', gap:'0.8rem', minHeight:0 }}>
              {msgsLoading && <div style={{ textAlign:'center', color:C.muted, fontSize:'0.85rem', padding:'2rem' }}>Chargement...</div>}
              {!msgsLoading && (msgsData?.messages || []).length === 0 && (
                <div style={{ textAlign:'center', color:C.muted, fontSize:'0.85rem', padding:'2rem' }}>Commencez la conversation !</div>
              )}
              {(msgsData?.messages || []).map(m => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div key={m.id} style={{ display:'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    {!isMe && (
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', maxWidth:'70%', gap:2 }}>
                        <div style={{ fontSize:'0.68rem', color:C.muted, marginLeft:'0.5rem' }}>{m.sender_company}</div>
                        <div style={{ background:C.white, color:C.forest, borderRadius:'18px 18px 18px 4px', padding:'0.7rem 1rem', border:'1px solid '+(C.mid), fontSize:'0.88rem', lineHeight:1.5 }}>
                          {m.content}
                          <div style={{ fontSize:'0.62rem', opacity:0.5, marginTop:'0.3rem' }}>{new Date(m.created_at).toLocaleTimeString('fr-MA',{hour:'2-digit',minute:'2-digit'})}</div>
                        </div>
                      </div>
                    )}
                    {isMe && (
                      <div style={{ maxWidth:'70%' }}>
                        <div style={{ background:C.forest, color:C.cream, borderRadius:'18px 18px 4px 18px', padding:'0.7rem 1rem', fontSize:'0.88rem', lineHeight:1.5 }}>
                          {m.content}
                          <div style={{ fontSize:'0.62rem', opacity:0.55, marginTop:'0.3rem', textAlign:'right' }}>{new Date(m.created_at).toLocaleTimeString('fr-MA',{hour:'2-digit',minute:'2-digit'})} ✓</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {/* Saisie */}
            <div style={{ padding:'1rem', background:C.white, borderTop:'1px solid '+C.mid, display:'flex', gap:'0.8rem', alignItems:'flex-end', flexShrink:0 }}>
              <textarea ref={inputRef} value={msg} onChange={e => setMsg(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Écrire un message... (Entrée pour envoyer)"
                rows={1} disabled={!recipientId || sendMutation.isLoading}
                style={{ flex:1, padding:'0.75rem 1rem', border:'1.5px solid '+(C.mid), borderRadius:14, outline:'none', fontSize:'0.9rem', fontFamily:"'DM Sans',sans-serif", resize:'none', maxHeight:100, overflowY:'auto', lineHeight:1.5 }}
              />
              <button onClick={handleSend} disabled={!msg.trim() || !recipientId || sendMutation.isLoading}
                style={{ background: (!msg.trim() || !recipientId) ? C.mid : C.forest, color:C.cream, border:'none', borderRadius:12, padding:'0.75rem 1.3rem', cursor:(!msg.trim()||!recipientId)?'not-allowed':'pointer', fontWeight:700, fontSize:'1rem', fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>
                {sendMutation.isLoading ? '...' : '➤'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ textAlign:'center', maxWidth:360 }}>
              <div style={{ fontSize:'4rem', marginBottom:'1rem', opacity:0.3 }}>💬</div>
              <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', color:C.forest, marginBottom:'0.8rem' }}>Vos messages B2B</h3>
              <p style={{ color:C.muted, fontSize:'0.88rem', lineHeight:1.7, marginBottom:'1.5rem' }}>
                Sélectionnez une conversation ou démarrez-en une nouvelle.
              </p>
              <button onClick={() => setShowNewMsg(true)}
                style={{ background:C.forest, color:C.cream, border:'none', borderRadius:100, padding:'0.85rem 2rem', fontWeight:600, fontSize:'0.9rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                ✉️ Nouveau message
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL NOUVEAU MESSAGE ── */}
      {showNewMsg && (
        <div onClick={() => setShowNewMsg(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:C.white, borderRadius:20, padding:'2rem', width:'90%', maxWidth:480, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', color:C.forest, marginBottom:'0.3rem' }}>✉️ Nouveau message</h2>
            <p style={{ color:C.muted, fontSize:'0.85rem', marginBottom:'1.5rem' }}>Recherchez une entreprise par nom ou email</p>

            {/* Recherche */}
            <div style={{ marginBottom:'1rem' }}>
              <label style={{ fontSize:'0.8rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.4rem' }}>Destinataire *</label>

              {/* Si un utilisateur est sélectionné, afficher badge */}
              {selectedUser ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.7rem 1rem', border:'1.5px solid '+(C.leaf), borderRadius:10, background:'#E8F8EE' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:'0.9rem', color:C.forest }}>{selectedUser.company_name}</div>
                    <div style={{ fontSize:'0.75rem', color:C.muted }}>{selectedUser.email} • {selectedUser.role}</div>
                  </div>
                  <button onClick={() => { setSelectedUser(null); setNewMsgEmail(''); setSearchResults([]); }}
                    style={{ background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:'1.1rem', padding:'0.2rem 0.4rem', borderRadius:6 }}>✕</button>
                </div>
              ) : (
                <>
                  <input value={newMsgEmail}
                    onChange={e => { setNewMsgEmail(e.target.value); searchUser(e.target.value); }}
                    placeholder="Nom de l'entreprise ou email..."
                    autoFocus
                    style={{ width:'100%', padding:'0.75rem 1rem', border:'1.5px solid '+(C.mid), borderRadius:10, fontSize:'0.9rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' }} />

                  {searching && <div style={{ fontSize:'0.78rem', color:C.muted, padding:'0.4rem 0.2rem' }}>🔍 Recherche en cours...</div>}
                  {!searching && newMsgEmail.length >= 2 && searchResults.length === 0 && (
                    <div style={{ fontSize:'0.78rem', color:C.muted, padding:'0.4rem 0.2rem' }}>Aucun utilisateur trouvé</div>
                  )}

                  {searchResults.length > 0 && (
                    <div style={{ border:'1px solid '+(C.mid), borderRadius:10, marginTop:4, overflow:'hidden', maxHeight:200, overflowY:'auto', boxShadow:'0 4px 16px rgba(0,0,0,0.08)' }}>
                      {searchResults.map(u => (
                        <div key={u.id}
                          onClick={() => { setSelectedUser(u); setNewMsgEmail(u.company_name); setSearchResults([]); }}
                          style={{ padding:'0.75rem 1rem', cursor:'pointer', borderBottom:'1px solid '+(C.beige)+'', background:C.white, transition:'background 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.background = C.beige}
                          onMouseLeave={e => e.currentTarget.style.background = C.white}>
                          <div style={{ fontWeight:600, fontSize:'0.88rem', color:C.forest }}>{u.company_name}</div>
                          <div style={{ fontSize:'0.73rem', color:C.muted, marginTop:'0.1rem' }}>{u.email} • {u.city || ''} • {u.role}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Message */}
            <div style={{ marginBottom:'1.5rem' }}>
              <label style={{ fontSize:'0.8rem', fontWeight:600, color:C.forest, display:'block', marginBottom:'0.4rem' }}>Message *</label>
              <textarea value={newMsgText} onChange={e => setNewMsgText(e.target.value)}
                placeholder="Bonjour, je souhaite vous contacter concernant..."
                rows={4}
                style={{ width:'100%', padding:'0.75rem 1rem', border:'1.5px solid '+(C.mid), borderRadius:10, fontSize:'0.9rem', fontFamily:"'DM Sans',sans-serif", outline:'none', resize:'vertical', boxSizing:'border-box' }} />
            </div>

            <div style={{ display:'flex', gap:'0.8rem' }}>
              <button
                disabled={!newMsgText.trim() || !selectedUser || startNewConv.isLoading}
                onClick={() => {
                  if (!selectedUser) { toast.error('Sélectionnez un destinataire dans la liste'); return; }
                  startNewConv.mutate({ recipient_id: selectedUser.id, content: newMsgText.trim() });
                }}
                style={{ flex:1, background:(!newMsgText.trim()||!selectedUser)?C.mid:C.forest, color:C.cream, border:'none', borderRadius:100, padding:'0.85rem', fontWeight:600, cursor:(!newMsgText.trim()||!selectedUser)?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", transition:'background 0.2s' }}>
                {startNewConv.isLoading ? '⏳ Envoi...' : '✉️ Envoyer'}
              </button>
              <button onClick={() => { setShowNewMsg(false); setSearchResults([]); setNewMsgEmail(''); setNewMsgText(''); setSelectedUser(null); }}
                style={{ background:'transparent', color:C.muted, border:'1px solid '+(C.mid), borderRadius:100, padding:'0.85rem 1.5rem', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
