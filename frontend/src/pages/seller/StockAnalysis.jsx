// src/pages/seller/StockAnalysis.jsx
// Analyse CCOM complète — Lit le vrai fichier Excel avec SheetJS
// Seuil stock dormant : 36 mois (3 ans)
import React, { useState, useRef } from 'react';
import { useMutation, useQuery } from 'react-query';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '../../api/axios';

const C = {
  forest:'#1E3D0F', leaf:'#4A7C2F', sage:'#7EA86A',
  cream:'#F6F1E7', beige:'#EDE6D3', mid:'#D9CEBC',
  white:'#FDFAF4', muted:'#5C5C50',
  eco:'#27AE60', urgent:'#C0392B', orange:'#E67E22', blue:'#2980B9'
};

const CLASSE_COLORS = {
  actif_strategique: '#27AE60',
  utile:             '#2980B9',
  lent:              '#E67E22',
  dormant_critique:  '#C0392B',
};

const CLASSE_ICONS = {
  actif_strategique: '🟢',
  utile:             '🔵',
  lent:              '🟠',
  dormant_critique:  '🔴',
};

// ── Lecture et normalisation du fichier Excel ──────────────────
function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb   = XLSX.read(data, { type: 'array', cellDates: true });

        // Chercher la feuille STOCK_CCOM en priorité, sinon la première
        const sheetName = wb.SheetNames.includes('STOCK_CCOM')
          ? 'STOCK_CCOM'
          : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

        // Convertir en JSON — header:1 pour avoir les en-têtes sur la 1ère ligne non vide
        const rows = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: '',
          blankrows: false,
        });

        if (rows.length < 2) {
          reject(new Error('Le fichier est vide ou ne contient pas de données'));
          return;
        }

        // Trouver la ligne d'en-tête (chercher "reference" ou "Reference")
        let headerRow = 0;
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
          const rowStr = rows[i].map(c => String(c).toLowerCase()).join(',');
          if (rowStr.includes('reference') || rowStr.includes('name') || rowStr.includes('article')) {
            headerRow = i;
            break;
          }
        }

        const headers = rows[headerRow].map(h => String(h).toLowerCase().trim().replace(/\s+/g, '_'));

        // Mapper les colonnes
        const colMap = {};
        const ALIASES = {
          reference:      ['reference', 'ref', 'article', 'code', 'code_article'],
          name:           ['name', 'nom', 'designation', 'désignation', 'libelle', 'libellé', 'article_name'],
          quantite:       ['quantite', 'quantité', 'qty', 'stock', 'qte', 'qté', 'quantity'],
          prix:           ['prix', 'price', 'pu', 'prix_unitaire', 'valeur_unitaire', 'cout_unitaire'],
          derniere_sortie:['derniere_sortie', 'dernière_sortie', 'last_exit', 'date_sortie', 'dernière sortie', 'date_derniere_sortie'],
          sorties_12mois: ['sorties_12mois', 'sorties_12_mois', 'freq', 'frequency', 'mouvements_12m', 'nb_sorties'],
          conso_annuelle: ['conso_annuelle', 'consommation_annuelle', 'annual_consumption', 'conso'],
          stock_moyen:    ['stock_moyen', 'average_stock', 'avg_stock'],
          criticite:      ['criticite', 'criticité', 'criticality', 'critique'],
          obsolescence:   ['obsolescence', 'obsolete', 'état_obsolescence'],
          condition:      ['condition', 'etat', 'état', 'state'],
        };

        headers.forEach((h, i) => {
          for (const [field, aliases] of Object.entries(ALIASES)) {
            if (aliases.some(a => h.includes(a))) {
              colMap[field] = i;
              break;
            }
          }
        });

        // Vérifier colonnes obligatoires
        if (colMap.reference === undefined || colMap.name === undefined) {
          reject(new Error(
            'Colonnes obligatoires manquantes.\n' +
            'Colonnes trouvées : '+(headers.join(', '))+'\n' +
            'Colonnes requises : reference, name (ou leurs équivalents)'
          ));
          return;
        }

        // Construire les articles
        const articles = [];
        for (let i = headerRow + 1; i < rows.length; i++) {
          const row = rows[i];
          const ref = String(row[colMap.reference] ?? '').trim();
          const name = String(row[colMap.name] ?? '').trim();

          if (!ref || !name) continue; // ignorer lignes vides

          // Parser la date dernière sortie
          let derniere_sortie = null;
          if (colMap.derniere_sortie !== undefined) {
            const raw = row[colMap.derniere_sortie];
            if (raw instanceof Date) {
              derniere_sortie = raw.toISOString().split('T')[0];
            } else if (raw) {
              const s = String(raw).trim();
              // Format JJ.MM.AAAA ou JJ/MM/AAAA
              const match1 = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
              // Format AAAA-MM-JJ
              const match2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
              if (match1) derniere_sortie = `${match1[3]}-${match1[2].padStart(2,'0')}-${match1[1].padStart(2,'0')}`;
              else if (match2) derniere_sortie = s.substring(0, 10);
            }
          }

          const parseNum = (val, def = 0) => {
            const n = parseFloat(String(val).replace(/[^\d.-]/g, ''));
            return isNaN(n) ? def : n;
          };

          articles.push({
            reference:       ref,
            name,
            quantite:        parseNum(colMap.quantite !== undefined ? row[colMap.quantite] : 1, 1),
            prix:            parseNum(colMap.prix !== undefined ? row[colMap.prix] : 0, 0),
            derniere_sortie,
            sorties_12mois:  parseNum(colMap.sorties_12mois !== undefined ? row[colMap.sorties_12mois] : 0, 0),
            conso_annuelle:  parseNum(colMap.conso_annuelle !== undefined ? row[colMap.conso_annuelle] : 0, 0),
            stock_moyen:     parseNum(colMap.stock_moyen !== undefined ? row[colMap.stock_moyen] : 0, 0),
            criticite:       colMap.criticite !== undefined ? String(row[colMap.criticite] ?? '').trim() : '',
            obsolescence:    colMap.obsolescence !== undefined ? String(row[colMap.obsolescence] ?? '').trim() : '',
            condition:       colMap.condition !== undefined ? String(row[colMap.condition] ?? '').trim() : '',
          });
        }

        if (articles.length === 0) {
          reject(new Error('Aucun article valide trouvé dans le fichier. Vérifiez que les colonnes "reference" et "name" sont présentes.'));
          return;
        }

        resolve({ articles, sheetName, totalRows: articles.length });
      } catch (err) {
        reject(new Error('Erreur de lecture du fichier : ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'));
    reader.readAsArrayBuffer(file);
  });
}

// ── Composant principal ───────────────────────────────────────
export default function StockAnalysis() {
  const navigate    = useNavigate();
  const fileRef     = useRef(null);
  const [result, setResult]         = useState(null);
  const [plan, setPlan]             = useState('free');
  const [activeTab, setActiveTab]   = useState('dormant');
  const [sortBy, setSortBy]         = useState('valeur');
  const [fileInfo, setFileInfo]     = useState(null);
  const [parsing, setParsing]       = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [stockingDormants, setStockingDormants] = useState(false);

  // ── Services : états modals ──────────────────────────────────
  const [showStorageModal,   setShowStorageModal]   = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [storageForm, setStorageForm] = useState({
    stock_type:'', quantity_tons:'', duration_months:'', surface_m2:'',
    conditions:{ temperature:false, humidity:false, security:false, hazardous:false },
    city:'', address:'', notes:''
  });
  const [inventoryForm, setInventoryForm] = useState({
    nb_references_est:'', site_access:'libre', inventory_type:'complet',
    scheduled_date:'', city:'', address:'', notes:''
  });
  const setSF = k => e => setStorageForm(f => ({ ...f, [k]: e.target.value }));
  const setIF = k => e => setInventoryForm(f => ({ ...f, [k]: e.target.value }));
  const toggleCond = k => setStorageForm(f => ({ ...f, conditions:{ ...f.conditions, [k]:!f.conditions[k] } }));

  const serviceMutation = useMutation(
    (payload) => api.post('/services', payload),
    {
      onSuccess: (res, payload) => {
        toast.success('✅ ' + res.data.message);
        if (payload.type === 'storage')   { setShowStorageModal(false);   setStorageForm({ stock_type:'', quantity_tons:'', duration_months:'', surface_m2:'', conditions:{ temperature:false, humidity:false, security:false, hazardous:false }, city:'', address:'', notes:'' }); }
        if (payload.type === 'inventory') { setShowInventoryModal(false); setInventoryForm({ nb_references_est:'', site_access:'libre', inventory_type:'complet', scheduled_date:'', city:'', address:'', notes:'' }); }
      },
      onError: e => toast.error(e.response?.data?.error || 'Erreur envoi demande')
    }
  );

  // ── Balance jetons ───────────────────────────────────────────
  const { data: tokenData } = useQuery('my-tokens', () => api.get('/tokens/me').then(r => r.data), { staleTime: 15000 });
  const tokenBalance = tokenData?.balance ?? 0;
  const COST_ANALYSIS   = tokenData?.costs?.stock_analysis   || 10;
  const COST_BULK       = tokenData?.costs?.bulk_publish      || 1;
  const COST_PUBLISH    = tokenData?.costs?.publish_product   || 5;

  // ── Mutation API ────────────────────────────────────────────
  const mutation = useMutation(
    (data) => api.post('/analysis/stock', data),
    {
      onSuccess: (res) => {
        setResult(res.data.result);
        toast.success('✅ Analyse CCOM terminée ! '+(res.data.result.total_refs)+' articles analysés.');
      },
      onError: (e) => toast.error(e.response?.data?.error || 'Erreur analyse')
    }
  );

  // ── Lecture du fichier ──────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      toast.error('Format non supporté. Utilisez .xlsx, .xls ou .csv');
      return;
    }
    setParsing(true);
    try {
      const { articles, sheetName, totalRows } = await parseExcelFile(file);
      setFileInfo({ name: file.name, rows: totalRows, articles, sheetName });
      toast.success('📂 '+(totalRows)+' articles chargés depuis "'+(sheetName)+'"');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setParsing(false);
    }
  };

  // ── Lancer l'analyse ────────────────────────────────────────
  const handleAnalyse = () => {
    if (plan === 'pro' && !fileInfo) {
      toast.error('Veuillez d\'abord importer votre fichier Excel');
      return;
    }
    mutation.mutate({
      plan,
      filename: fileInfo?.name || 'demo.xlsx',
      items: plan === 'pro' && fileInfo ? fileInfo.articles : undefined,
    });
  };

  const sortItems = (items) => {
    if (!items) return [];
    return [...items].sort((a, b) => {
      if (sortBy === 'valeur') return b.valeur_totale - a.valeur_totale;
      if (sortBy === 'age')    return b.age_mois - a.age_mois;
      if (sortBy === 'score')  return a.ccom_score - b.ccom_score;
      return 0;
    });
  };

  const ETAPES = [
    ['01','Cadrage','Périmètre & règles métier'],
    ['02','Extraction','ERP/GMAO + fiabilisation'],
    ['03','KPI','AGE · FREQ · ROTATION'],
    ['04','Criticité C','Critique→100 / Important→60 / Non→20'],
    ['05','Conso. C','Nulle→0 / Faible→30 / Élevée→100'],
    ['06','Valeur V','ABC : A→100 / B→60 / C→20'],
    ['07','Obsolescence O','Obsolète→0 / Risque→40 / OK→100'],
    ['08','Score CCOM','C×0.4 + C×0.3 + V×0.2 + O×0.1'],
    ['09','Stratégique','Criticité ≥ 80 → exclu dormant'],
    ['10','Dormant','AGE ≥ 36 mois + Conso faible'],
    ['11','Classification','>75 Actif / 50-75 Utile / <25 Dormant'],
    ['12','Décision','Maintien / Optimisation / Vente'],
  ];

  // ════════════════════════════════════════════════════════════
  // PAGE FORMULAIRE
  // ════════════════════════════════════════════════════════════
  if (!result) return (
    <>
    <div style={{ background:'#F6F1E7', minHeight:'100vh' }}>

    {/* ── HERO BANNER ── */}
    <div style={{ background:'linear-gradient(135deg,#1E3D0F 0%,#2D5A1B 55%,#1E3D0F 100%)', padding:'3rem 2rem 2.5rem', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', border:'1.5px solid rgba(126,168,106,0.2)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:-30, left:80, width:160, height:160, borderRadius:'50%', background:'rgba(74,124,47,0.07)', pointerEvents:'none' }}/>
      <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'1.5rem' }}>
        <div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(126,168,106,0.15)', border:'1px solid rgba(126,168,106,0.3)', borderRadius:100, padding:'0.3rem 0.9rem', marginBottom:'0.8rem' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#7EA86A', display:'inline-block' }}/>
            <span style={{ fontSize:'0.72rem', color:'#7EA86A', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>Méthode CCOM</span>
          </div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.6rem', fontWeight:700, color:'#F6F1E7', lineHeight:1.1, margin:'0 0 0.5rem' }}>
            🔬 Analyse Stock CCOM
          </h1>
          <p style={{ color:'rgba(246,241,231,0.65)', fontSize:'0.9rem', margin:0 }}>
            Processus 15 étapes · Seuil dormant 36 mois · Formule : C×0.4 + C×0.3 + V×0.2 + O×0.1
          </p>
        </div>
        <Link to="/tokens" style={{ display:'flex', alignItems:'center', gap:8, background:tokenBalance < COST_ANALYSIS ? 'rgba(192,57,43,0.9)' : 'rgba(39,174,96,0.9)', borderRadius:100, padding:'0.6rem 1.2rem', textDecoration:'none', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.15)' }}>
          <span style={{ fontSize:'1.1rem' }}>🪙</span>
          <div>
            <div style={{ fontSize:'0.88rem', fontWeight:700, color:'#fff', lineHeight:1 }}>{tokenBalance} jetons</div>
            <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.75)', marginTop:1 }}>{tokenBalance < COST_ANALYSIS ? 'Recharger →' : 'Solde suffisant'}</div>
          </div>
        </Link>
      </div>
    </div>

    <div style={{ maxWidth:1100, margin:'0 auto', padding:'2rem 2rem 4rem' }}>

      {/* ── Services REVEX ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'2rem' }}>
        {/* Stocker chez REVEX déplacé vers la fin de l'analyse */}
        <div style={{ background:'linear-gradient(135deg,#1A252F,#2C3E50)', borderRadius:16, padding:'1.3rem 1.5rem', opacity:0.45 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
            <div style={{ width:46, height:46, borderRadius:12, background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem', flexShrink:0 }}>🏢</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:'0.92rem', color:'#fff', marginBottom:'0.2rem' }}>Stocker chez REVEX</div>
              <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.6)', lineHeight:1.4 }}>Disponible après analyse — Stock dormant envoyé automatiquement</div>
            </div>
            <span style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.5)' }}>après analyse →</span>
          </div>
        </div>

        <button onClick={() => setShowInventoryModal(true)}
          style={{ background:'linear-gradient(135deg,#154360 0%,#1A5276 100%)', color:'#fff', border:'none', borderRadius:16, padding:'1.3rem 1.5rem', cursor:'pointer', textAlign:'left', fontFamily:"'DM Sans',sans-serif", boxShadow:'0 4px 20px rgba(21,67,96,0.35)', transition:'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 30px rgba(21,67,96,0.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 20px rgba(21,67,96,0.35)'; }}>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
            <div style={{ width:46, height:46, borderRadius:12, background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem', flexShrink:0 }}>🔍</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:'0.92rem', marginBottom:'0.2rem' }}>Service Inventaire Physique</div>
              <div style={{ fontSize:'0.75rem', opacity:0.7, lineHeight:1.4 }}>Notre staff sur votre site · Comptage · Rapport REVEX</div>
            </div>
            <span style={{ fontSize:'1.2rem', opacity:0.6 }}>→</span>
          </div>
        </button>
      </div>

      {/* Alerte si jetons insuffisants pour analyse pro */}
      {tokenBalance < COST_ANALYSIS && (
        <div style={{ background:'#FDECEA', border:'1.5px solid '+C.urgent, borderRadius:14, padding:'1rem 1.5rem', marginBottom:'1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.8rem' }}>
          <div>
            <div style={{ fontWeight:700, color:C.urgent, fontSize:'0.92rem' }}>🪙 Jetons insuffisants pour l'analyse réelle</div>
            <div style={{ fontSize:'0.8rem', color:C.urgent, opacity:0.8, marginTop:'0.2rem' }}>
              L'analyse de votre fichier coûte {COST_ANALYSIS} jetons. Vous en avez {tokenBalance}. La démo reste gratuite.
            </div>
          </div>
          <Link to="/tokens" style={{ background:C.urgent, color:'#fff', padding:'0.55rem 1.2rem', borderRadius:100, textDecoration:'none', fontSize:'0.82rem', fontWeight:700, whiteSpace:'nowrap' }}>
            Recharger →
          </Link>
        </div>
      )}

      {/* Processus visuel */}
      <div style={{ background:C.forest, borderRadius:20, padding:'1.8rem', marginBottom:'2rem' }}>
        <div style={{ color:C.sage, fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:'1rem' }}>
          Processus CCOM — 12 étapes analytiques
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'0.5rem' }}>
          {ETAPES.map(([num, label, desc]) => (
            <div key={num} style={{ background:'rgba(255,255,255,0.07)', borderRadius:10, padding:'0.7rem 0.5rem', textAlign:'center' }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', fontWeight:700, color:C.sage }}>{num}</div>
              <div style={{ fontSize:'0.68rem', fontWeight:700, color:C.cream, marginTop:'0.2rem' }}>{label}</div>
              <div style={{ fontSize:'0.6rem', color:'rgba(246,241,231,0.5)', marginTop:'0.2rem', lineHeight:1.3 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem' }}>
        {/* Panel gauche : upload */}
        <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:20, padding:'2rem' }}>
          <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', color:C.forest, marginBottom:'1.5rem' }}>
            Lancer l'analyse CCOM
          </h3>

          {/* Choix plan */}
          <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem', marginBottom:'1.5rem' }}>
            {[
              ['free', '🎯 Démo instantanée',       'Données exemple IMACID — résultat immédiat'],
              ['pro',  '📂 Votre fichier Excel',     'Importe ton fichier ERP/GMAO et analyse le vrai stock'],
            ].map(([v, title, desc]) => (
              <div key={v} onClick={() => { setPlan(v); if(v==='free') setFileInfo(null); }}
                style={{ border:'2px solid '+plan===v ? C.leaf : C.mid, borderRadius:14, padding:'1rem 1.2rem', cursor:'pointer', background:plan===v ? '#E8F8EE' : C.cream, display:'flex', alignItems:'center', gap:'0.8rem' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, color:C.forest, fontSize:'0.9rem' }}>{title}</div>
                  <div style={{ fontSize:'0.75rem', color:C.muted, marginTop:'0.2rem' }}>{desc}</div>
                </div>
                {plan===v && <span style={{ color:C.eco, fontWeight:700, fontSize:'1.1rem' }}>✓</span>}
              </div>
            ))}
          </div>

          {/* Zone upload fichier */}
          {plan === 'pro' && (
            <div style={{ marginBottom:'1.2rem' }}>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2.5px dashed '+(dragOver ? C.leaf : fileInfo ? C.eco : C.mid),
                  borderRadius: 14, padding:'2rem 1.5rem', textAlign:'center',
                  cursor:'pointer', transition:'all 0.2s',
                  background: dragOver ? '#E8F8EE' : fileInfo ? '#E8F8EE' : C.cream,
                }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display:'none' }}
                  onChange={e => handleFile(e.target.files[0])}
                />
                {parsing ? (
                  <>
                    <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>⏳</div>
                    <div style={{ color:C.muted, fontSize:'0.9rem' }}>Lecture du fichier en cours...</div>
                  </>
                ) : fileInfo ? (
                  <>
                    <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>✅</div>
                    <div style={{ fontWeight:700, color:C.eco, fontSize:'0.9rem' }}>{fileInfo.name}</div>
                    <div style={{ color:C.muted, fontSize:'0.8rem', marginTop:'0.3rem' }}>
                      {fileInfo.rows} articles chargés depuis "{fileInfo.sheetName}"
                    </div>
                    <div style={{ marginTop:'0.8rem' }}>
                      <span onClick={e => { e.stopPropagation(); setFileInfo(null); fileRef.current.value=''; }}
                        style={{ fontSize:'0.75rem', color:C.urgent, cursor:'pointer', textDecoration:'underline' }}>
                        Changer de fichier
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>📂</div>
                    <div style={{ fontWeight:600, color:C.forest, fontSize:'0.9rem' }}>Glisser le fichier ici</div>
                    <div style={{ color:C.muted, fontSize:'0.8rem', marginTop:'0.3rem' }}>ou cliquer pour parcourir</div>
                    <div style={{ color:C.muted, fontSize:'0.72rem', marginTop:'0.5rem', opacity:0.7 }}>
                      .xlsx · .xls · .csv (max 10 MB)
                    </div>
                  </>
                )}
              </div>

              {/* Info colonnes */}
              <div style={{ marginTop:'0.8rem', background:C.beige, borderRadius:10, padding:'0.8rem 1rem', fontSize:'0.75rem', color:C.muted, lineHeight:1.7 }}>
                <strong style={{ color:C.forest }}>Colonnes reconnues automatiquement :</strong><br/>
                reference · name · quantite · prix · derniere_sortie · sorties_12mois · conso_annuelle · criticite · obsolescence · condition
              </div>
            </div>
          )}

          {/* Bouton lancer */}
          <button onClick={handleAnalyse}
            disabled={mutation.isLoading || parsing || (plan==='pro' && !fileInfo) || (plan==='pro' && tokenBalance < COST_ANALYSIS)}
            style={{ width:'100%', background: (plan==='pro' && tokenBalance < COST_ANALYSIS) ? C.muted : C.forest, color:C.cream, border:'none', padding:'0.9rem', borderRadius:100, fontWeight:600, fontSize:'0.95rem', fontFamily:"'DM Sans',sans-serif", cursor: (mutation.isLoading || parsing || (plan==='pro' && !fileInfo)) ? 'not-allowed' : 'pointer', opacity: (mutation.isLoading || parsing || (plan==='pro' && !fileInfo)) ? 0.6 : 1 }}>
            {mutation.isLoading ? '⏳ Calcul CCOM en cours...'
              : plan==='pro' && tokenBalance < COST_ANALYSIS ? '🪙 Insuffisant (besoin '+(COST_ANALYSIS)+' jetons)'
              : plan==='pro' && !fileInfo ? '📂 Importez d\'abord votre fichier'
              : plan==='pro' ? '🚀 Lancer l\'analyse — 🪙 '+(COST_ANALYSIS)+' jetons'
              : '🚀 Lancer la démo gratuite'}
          </button>

          {/* Coût en jetons */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'0.5rem', fontSize:'0.78rem' }}>
            <span style={{ color:C.muted }}>
              {plan === 'free' ? '✅ Démo gratuite — 0 jeton' : '🪙 Coût : ' + COST_ANALYSIS + ' jetons — Solde : ' + tokenBalance}
            </span>
            {plan === 'pro' && tokenBalance < COST_ANALYSIS && (
              <Link to="/tokens" style={{ color:C.urgent, fontWeight:600, textDecoration:'none', fontSize:'0.78rem' }}>Recharger →</Link>
            )}
          </div>

          {/* Formule rappel */}
          <div style={{ marginTop:'1.2rem', background:C.beige, borderRadius:12, padding:'1rem', fontSize:'0.82rem', color:C.forest }}>
            <div style={{ fontWeight:700, marginBottom:'0.5rem' }}>📐 Formule CCOM (Étape 8) :</div>
            <div style={{ fontFamily:'monospace', lineHeight:2.2, background:C.white, padding:'0.7rem 1rem', borderRadius:8, fontSize:'0.78rem' }}>
              SCORE = (Criticité × <strong style={{color:C.urgent}}>0.4</strong>)
              + (Conso × <strong style={{color:C.orange}}>0.3</strong>)
              + (Valeur × <strong style={{color:C.blue}}>0.2</strong>)
              + (Obsolescence × <strong style={{color:C.muted}}>0.1</strong>)
            </div>
          </div>
        </div>

        {/* Panel droit : classification */}
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, padding:'1.5rem' }}>
            <h4 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', color:C.forest, marginBottom:'1rem' }}>
              Classification finale — Étape 11
            </h4>
            {[
              ['>75',   'Stock actif stratégique', '#27AE60', 'Maintien et sécurisation'],
              ['50–75', 'Stock utile',             '#2980B9', 'Optimisation du niveau'],
              ['25–50', 'Stock lent',              '#E67E22', 'Réduction progressive'],
              ['< 25',  'Stock dormant critique',  '#C0392B', '🏪 Vente marketplace REVEX'],
            ].map(([score, label, color, action]) => (
              <div key={score} style={{ display:'flex', alignItems:'center', gap:'0.8rem', marginBottom:'0.7rem', padding:'0.7rem', background:color+'15', borderRadius:10, border:'1px solid '+(color)+'33' }}>
                <div style={{ background:color, color:'#fff', borderRadius:8, padding:'0.2rem 0.6rem', fontSize:'0.78rem', fontWeight:700, flexShrink:0, minWidth:50, textAlign:'center' }}>{score}</div>
                <div>
                  <div style={{ fontWeight:600, fontSize:'0.85rem', color:C.forest }}>{label}</div>
                  <div style={{ fontSize:'0.72rem', color:C.muted }}>{action}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background:'#FEF5E7', border:'1px solid #F0B27A', borderRadius:14, padding:'1.2rem' }}>
            <div style={{ fontWeight:700, color:'#784212', marginBottom:'0.4rem' }}>
              ⏱ Seuil dormant : <span style={{color:C.urgent}}>36 mois (3 ans)</span>
            </div>
            <div style={{ fontSize:'0.8rem', color:'#A04000', lineHeight:1.7 }}>
              Conditions cumulatives (Étape 10) :<br/>
              ✓ AGE ≥ <strong>36 mois</strong> sans sortie<br/>
              ✓ Score consommation ≤ 30<br/>
              ✓ Score criticité &lt; 80
            </div>
          </div>

          <div style={{ background:'#E8F8EE', border:'1px solid #a8dfc0', borderRadius:14, padding:'1rem', fontSize:'0.8rem', color:'#145A32', lineHeight:1.6 }}>
            🔒 <strong>Étape 9 :</strong> Criticité ≥ 80 → <strong>stock stratégique</strong>, exclu du dormant même si AGE ≥ 36 mois.
          </div>

          {/* Aperçu données chargées */}
          {fileInfo && (
            <div style={{ background:C.beige, border:'1px solid '+C.mid, borderRadius:14, padding:'1.2rem' }}>
              <div style={{ fontWeight:700, color:C.forest, marginBottom:'0.8rem', fontSize:'0.88rem' }}>
                📊 Aperçu des données chargées
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginBottom:'0.8rem' }}>
                {[
                  ['Total articles',   fileInfo.rows],
                  ['Feuille lue',      fileInfo.sheetName],
                  ['Avec prix',        fileInfo.articles.filter(a => a.prix > 0).length],
                  ['Avec date sortie', fileInfo.articles.filter(a => a.derniere_sortie).length],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{ background:C.white, borderRadius:8, padding:'0.6rem 0.8rem' }}>
                    <div style={{ fontSize:'0.68rem', color:C.muted }}>{lbl}</div>
                    <div style={{ fontWeight:700, color:C.forest, fontSize:'0.9rem' }}>{val}</div>
                  </div>
                ))}
              </div>
              {/* 3 premières lignes */}
              <div style={{ fontSize:'0.7rem', color:C.muted, fontFamily:'monospace', background:C.white, borderRadius:8, padding:'0.5rem 0.7rem', maxHeight:80, overflowY:'auto' }}>
                {fileInfo.articles.slice(0,3).map((a,i) => (
                  <div key={i}>{a.reference} | {a.name.substring(0,30)} | {a.quantite} | {a.prix} MAD</div>
                ))}
                {fileInfo.articles.length > 3 && <div style={{opacity:0.6}}>... et {fileInfo.articles.length - 3} autres</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>{/* close padding wrapper */}

    {/* ── MODALS ── */}
    {showStorageModal && (
      <div onClick={() => setShowStorageModal(false)}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', overflowY:'auto' }}>
        <div onClick={e => e.stopPropagation()}
          style={{ background:'#FDFAF4', borderRadius:24, padding:'2rem', maxWidth:560, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.8rem', marginBottom:'0.5rem' }}>
            <span style={{ fontSize:'2rem' }}>🏢</span>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', color:'#1E3D0F' }}>Stocker chez nous</h2>
          </div>
          <p style={{ fontSize:'0.85rem', color:'#5C5C50', marginBottom:'1.5rem', lineHeight:1.6 }}>
            Remplissez ce formulaire pour nous décrire votre stock. Notre équipe vous contactera sous 24h.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem' }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={sLbl}>Type de stock *</label>
              <select value={storageForm.stock_type} onChange={setSF('stock_type')} style={sInp}>
                <option value="">Sélectionner...</option>
                {['Ferraille / Métaux','Équipements industriels','Pièces de rechange (PDR)','Produits chimiques','Matériaux de construction','Électronique / Câblage','Autre'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={sLbl}>Quantité (tonnes)</label>
              <input type="number" value={storageForm.quantity_tons} onChange={setSF('quantity_tons')} placeholder="Ex: 5" style={sInp} min="0" step="0.5"/>
            </div>
            <div>
              <label style={sLbl}>Durée (mois)</label>
              <input type="number" value={storageForm.duration_months} onChange={setSF('duration_months')} placeholder="Ex: 6" style={sInp} min="1"/>
            </div>
            <div>
              <label style={sLbl}>Surface nécessaire (m²)</label>
              <input type="number" value={storageForm.surface_m2} onChange={setSF('surface_m2')} placeholder="Ex: 50" style={sInp} min="0"/>
            </div>
            <div>
              <label style={sLbl}>Ville souhaitée</label>
              <input value={storageForm.city} onChange={setSF('city')} placeholder="Ex: Jorf Lasfar" style={sInp}/>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={sLbl}>Conditions de stockage requises</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
                {[['temperature','🌡️ Contrôle température'],['humidity','💧 Contrôle humidité'],['security','🔒 Sécurité renforcée'],['hazardous','⚠️ Matières dangereuses']].map(([key, label]) => (
                  <div key={key} onClick={() => toggleCond(key)}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'0.6rem 0.8rem', border:'1.5px solid '+(storageForm.conditions[key]?'#2C3E50':'#D9CEBC'), borderRadius:10, cursor:'pointer', background:storageForm.conditions[key]?'#2C3E5015':'#F6F1E7' }}>
                    <div style={{ width:18, height:18, borderRadius:4, border:'2px solid '+(storageForm.conditions[key]?'#2C3E50':'#D9CEBC'), background:storageForm.conditions[key]?'#2C3E50':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {storageForm.conditions[key] && <span style={{ color:'#fff', fontSize:11 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:'0.82rem', color:'#1E3D0F' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={sLbl}>Adresse du stock actuel</label>
              <input value={storageForm.address} onChange={setSF('address')} placeholder="Ex: Zone industrielle Jorf Lasfar, Bât. 12" style={sInp}/>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={sLbl}>Notes / Informations complémentaires</label>
              <textarea value={storageForm.notes} onChange={setSF('notes')} rows={3} placeholder="Précisez toute contrainte particulière..." style={{ ...sInp, resize:'vertical' }}/>
            </div>
          </div>
          <div style={{ display:'flex', gap:'0.8rem', marginTop:'1.5rem' }}>
            <button onClick={() => serviceMutation.mutate({ type:'storage', ...storageForm })}
              disabled={!storageForm.stock_type || serviceMutation.isLoading}
              style={{ flex:1, background:!storageForm.stock_type?'#D9CEBC':'#2C3E50', color:'#fff', border:'none', padding:'0.9rem', borderRadius:100, fontWeight:700, cursor:!storageForm.stock_type?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              {serviceMutation.isLoading ? '⏳ Envoi...' : '📋 Envoyer la demande'}
            </button>
            <button onClick={() => setShowStorageModal(false)}
              style={{ background:'transparent', color:'#5C5C50', border:'1px solid #D9CEBC', padding:'0.9rem 1.2rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              Annuler
            </button>
          </div>
        </div>
      </div>
    )}

    {showInventoryModal && (
      <div onClick={() => setShowInventoryModal(false)}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', overflowY:'auto' }}>
        <div onClick={e => e.stopPropagation()}
          style={{ background:'#FDFAF4', borderRadius:24, padding:'2rem', maxWidth:540, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.8rem', marginBottom:'0.5rem' }}>
            <span style={{ fontSize:'2rem' }}>🔍</span>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', color:'#1E3D0F' }}>Commander un Inventaire Physique</h2>
          </div>
          <p style={{ fontSize:'0.85rem', color:'#5C5C50', marginBottom:'1.5rem', lineHeight:1.6 }}>
            Notre équipe se déplace sur votre site : comptage, étiquetage et rapport REVEX détaillé.
          </p>
          <div style={{ background:'#EBF5FB', border:'1px solid #AED6F1', borderRadius:12, padding:'0.8rem 1rem', marginBottom:'1.2rem', fontSize:'0.82rem', color:'#1A5276' }}>
            👥 Techniciens certifiés REVEX · Matériel fourni · Rapport CCOM inclus
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem' }}>
            <div>
              <label style={sLbl}>Date souhaitée *</label>
              <input type="date" value={inventoryForm.scheduled_date} onChange={setIF('scheduled_date')} style={sInp} min={new Date().toISOString().split('T')[0]}/>
            </div>
            <div>
              <label style={sLbl}>Nb références estimé</label>
              <input type="number" value={inventoryForm.nb_references_est} onChange={setIF('nb_references_est')} placeholder="Ex: 500" style={sInp} min="0"/>
            </div>
            <div>
              <label style={sLbl}>Type d'inventaire</label>
              <select value={inventoryForm.inventory_type} onChange={setIF('inventory_type')} style={sInp}>
                <option value="complet">Inventaire complet</option>
                <option value="partiel">Inventaire partiel</option>
                <option value="PDR_uniquement">PDR uniquement</option>
                <option value="dormant_uniquement">Stock dormant uniquement</option>
              </select>
            </div>
            <div>
              <label style={sLbl}>Accès au site</label>
              <select value={inventoryForm.site_access} onChange={setIF('site_access')} style={sInp}>
                <option value="libre">Accès libre</option>
                <option value="badge">Badge requis</option>
                <option value="accompagnement">Accompagnement obligatoire</option>
              </select>
            </div>
            <div>
              <label style={sLbl}>Ville</label>
              <input value={inventoryForm.city} onChange={setIF('city')} placeholder="Ex: El Jadida" style={sInp}/>
            </div>
            <div>
              <label style={sLbl}>Adresse exacte</label>
              <input value={inventoryForm.address} onChange={setIF('address')} placeholder="Ex: Zone ind. Jorf Lasfar" style={sInp}/>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={sLbl}>Notes / Conditions d'accès</label>
              <textarea value={inventoryForm.notes} onChange={setIF('notes')} rows={3}
                placeholder="Ex: Contacter M. Alami avant passage, port EPI obligatoire..."
                style={{ ...sInp, resize:'vertical' }}/>
            </div>
          </div>
          <div style={{ background:'#FEF5E7', border:'1px solid #F0B27A', borderRadius:10, padding:'0.7rem 1rem', marginTop:'1rem', fontSize:'0.78rem', color:'#784212' }}>
            ⚠️ Confirmation et devis envoyés sous 24h après réception.
          </div>
          <div style={{ display:'flex', gap:'0.8rem', marginTop:'1.2rem' }}>
            <button onClick={() => serviceMutation.mutate({ type:'inventory', ...inventoryForm })}
              disabled={!inventoryForm.scheduled_date || serviceMutation.isLoading}
              style={{ flex:1, background:!inventoryForm.scheduled_date?'#D9CEBC':'#1A5276', color:'#fff', border:'none', padding:'0.9rem', borderRadius:100, fontWeight:700, cursor:!inventoryForm.scheduled_date?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              {serviceMutation.isLoading ? '⏳ Envoi...' : "📅 Commander l'inventaire"}
            </button>
            <button onClick={() => setShowInventoryModal(false)}
              style={{ background:'transparent', color:'#5C5C50', border:'1px solid #D9CEBC', padding:'0.9rem 1.2rem', borderRadius:100, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              Annuler
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );

  // ════════════════════════════════════════════════════════════
  // PUBLICATION EN MASSE — Dormants critiques → Marketplace
  // ════════════════════════════════════════════════════════════

  const handlePublishDormants = async () => {
    // Filtrer uniquement les dormants critiques (Score CCOM < 25)
    const tousItems    = result?.tous_articles || result?.dormant_items || [];
    const dormants     = result?.dormant_items || [];
    const critiques    = dormants.filter(item =>
      item.classe === 'dormant_critique' || item.ccom_score < 25
    );

    if (critiques.length === 0) {
      toast.info('Aucun article de classe "Dormant Critique" (Score < 25) à publier');
      return;
    }

    const valeurTotale = critiques.reduce((s, i) => s + Number(i.valeur_totale||0), 0);

    const confirmed = window.confirm(
      'Publier sur la marketplace REVEX :\n\n' +
      '📦 '+(critiques.length)+' article(s) — Classe : Dormant Critique (Score < 25)\n' +
      '💰 Valeur totale : '+(Number(valeurTotale).toLocaleString('fr-MA'))+' MAD\n\n' +
      '✅ Prix : issu de l\'analyse CCOM\n' +
      '✅ Statut : Actif immédiatement\n' +
      '🔄 Si l\'article existe déjà → la quantité sera ajoutée\n\n' +
      'Confirmer la publication ?'
    );
    if (!confirmed) return;

    setPublishing(true);
    try {
      const res = await api.post('/products/bulk-publish', { items: dormants });
      const { created, updated, skipped, errors } = res.data;

      if (created > 0 || updated > 0) {
        toast.success(
          '🎉 '+(created)+' article(s) créés, '+(updated)+' mis à jour (quantité ajoutée) !'
        );
      }
      if (skipped > 0) {
        toast.info('⏭ '+(skipped)+' article(s) ignorés');
      }
      if (errors && errors.length > 0) {
        toast.error('⚠️ '+(errors.length)+' erreur(s)');
        console.error('Erreurs publication:', errors);
      }

      if (created > 0 || updated > 0) {
        setTimeout(() => navigate('/seller/produits'), 1500);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de la publication');
    } finally {
      setPublishing(false);
    }
  };
  // ════════════════════════════════════════════════════════════
  // ── Stocker le stock dormant chez REVEX ─────────────────────
  const handleStockerDormants = async () => {
    const dormants = result?.dormant_items || [];
    const critiques = dormants.filter(i => i.classe === 'dormant_critique' || i.ccom_score < 25);

    if (critiques.length === 0) {
      toast.info('Aucun article dormant critique à stocker');
      return;
    }

    const valeurTotale = critiques.reduce((s, i) => s + Number(i.valeur_totale || 0), 0);
    const volEst = Math.max(0.5, Math.round(critiques.length * 0.08 * 10) / 10);

    const confirmed = window.confirm(
      'Envoyer une demande de stockage chez REVEX ?\n\n' +
      '📦 ' + critiques.length + ' article(s) dormants critiques\n' +
      '💰 Valeur totale : ' + Number(valeurTotale).toLocaleString('fr-MA') + ' MAD\n' +
      '📐 Volume estimé : ~' + volEst + ' m³\n\n' +
      'REVEX stockera ces articles et les mettra automatiquement en vente sur la marketplace.\n\n' +
      'Confirmer ?'
    );
    if (!confirmed) return;

    setStockingDormants(true);
    try {
      const itemsList = critiques.slice(0, 10).map(i => (i.designation || i.description || i.reference || 'Article PDR').substring(0, 60)).join(', ');

      // Fallbacks robustes pour les champs obligatoires
      const cName   = (user?.contact_name || user?.full_name || user?.email || 'Responsable stock').substring(0, 100);
      const cPhone  = user?.phone || user?.contact_phone || '+212 600 000 000';
      const cCity   = user?.city || 'Maroc';
      const cCo     = user?.company_name || user?.email || 'Entreprise';

      await api.post('/storage', {
        contactName:        cName,
        companyName:        cCo,
        contactPhone:       cPhone,
        contactEmail:       user?.email || '',
        city:               cCity,
        storageType:        'long',
        selectedProductIds: [],
        customItems:        critiques.length + ' articles dormants critiques (Score < 25) : ' + itemsList,
        estimatedVol:       volEst,
        estimatedQty:       critiques.length,
        wantPhotos:         true,
        wantCertif:         true,
        wantInventory:      true,
        wantPicking:        false,
        deliveryMode:       'self',
        deliveryNotes:      'Stock issu analyse CCOM — Valeur : ' + Math.round(valeurTotale) + ' MAD — ' + critiques.length + ' references dormantes',
      });

      toast.success(
        '🏢 Demande de stockage envoyée ! ' + critiques.length + ' articles dormants vers les entrepôts REVEX. Notre équipe vous contacte sous 24h.'
      );
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la demande de stockage');
    } finally {
      setStockingDormants(false);
    }
  };

  const exportExcel = () => {
    try {
      if (!result) { toast.error('Aucun résultat à exporter'); return; }
      const wb   = XLSX.utils.book_new();
      const date = new Date().toLocaleDateString('fr-MA').replace(/\//g, '-');

      const makeSheet = (headers, rows) => {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = headers.map(h => ({ wch: Math.max(String(h).length + 4, 12) }));
        return ws;
      };

      // ── Feuille 1 : Résumé ────────────────────────────────
      const wsResume = XLSX.utils.aoa_to_sheet([
        ['REVEX — RAPPORT ANALYSE CCOM'],
        ['Date : '+(new Date().toLocaleDateString('fr-MA'))+'  |  Seuil dormant : 36 mois (3 ans)'],
        [],
        ['INDICATEURS GLOBAUX', 'Valeur'],
        ['Total références analysées',      result.total_refs],
        ['Stock dormant (≥ 36 mois)',       result.dormant_count],
        ['Taux de stock dormant',           result.dormant_percentage + '%'],
        ['Capital valorisable (MAD)',       result.dormant_value || 0],
        ['Gain potentiel estimé (MAD)',     result.kpis?.gain_potentiel || 0],
        ['Taux obsolescence',              result.kpis?.taux_obsolescence || '0%'],
        [],
        ['SEGMENTATION CCOM', 'Nb articles', 'Action'],
        ['Actif Stratégique (Score > 75)', result.segmentation?.actif_strategique || 0, 'Maintien sécurisation'],
        ['Stock Utile (Score 50–75)',       result.segmentation?.utile || 0,             'Optimisation niveau'],
        ['Stock Lent (Score 25–50)',        result.segmentation?.lent || 0,              'Réduction progressive'],
        ['Stock Dormant Critique (< 25)',   result.segmentation?.dormant_critique || 0,  'Vente marketplace REVEX'],
        [],
        ['FORMULE CCOM'],
        ['Score = (Criticité × 0.4) + (Consommation × 0.3) + (Valeur × 0.2) + (Obsolescence × 0.1)'],
      ]);
      wsResume['!cols'] = [{wch:45},{wch:22},{wch:35}];
      XLSX.utils.book_append_sheet(wb, wsResume, 'Résumé');

      // ── Feuille 2 : Stock Dormant COMPLET ─────────────────
      const dormantRows = (result.dormant_items || [])
        .sort((a,b) => b.valeur_totale - a.valeur_totale)
        .map(item => [
          String(item.reference),
          String(item.name),
          Number(item.quantite || 0),
          Number(item.prix_unitaire || 0),
          Number(item.valeur_totale || 0),
          Number(item.age_mois || 0),
          String(item.dormant_ans || ''),
          Number(item.ccom_score || 0),
          String(item.classe_label || ''),
          Number(item.score_criticite || 0),
          Number(item.score_consommation || 0),
          Number(item.score_valeur || 0),
          Number(item.score_obsolescence || 0),
          String(item.decision || ''),
          'Publier sur Marketplace REVEX'
        ]);
      XLSX.utils.book_append_sheet(wb, makeSheet([
        'Référence','Désignation','Quantité','Prix unitaire (MAD)',
        'Valeur totale (MAD)','Âge (mois)','Âge (ans)',
        'Score CCOM','Classe','Score Criticité',
        'Score Consommation','Score Valeur','Score Obsolescence',
        'Décision','Action recommandée'
      ], dormantRows), 'Stock Dormant');

      // ── Feuille 3 : Stock Stratégique COMPLET ─────────────
      const straRows = (result.strategique_items || []).map(item => [
        String(item.reference), String(item.name),
        Number(item.quantite||0), Number(item.prix_unitaire||0),
        Number(item.valeur_totale||0), Number(item.ccom_score||0),
        Number(item.score_criticite||0), 'Maintien et sécurisation'
      ]);
      XLSX.utils.book_append_sheet(wb, makeSheet([
        'Référence','Désignation','Quantité','Prix unitaire (MAD)',
        'Valeur totale (MAD)','Score CCOM','Score Criticité','Décision'
      ], straRows), 'Stock Stratégique');

      // ── Feuille 4 : Plan d'action COMPLET (tous articles) ─
      const planRows = (result.tous_articles || [])
        .sort((a,b) => a.ccom_score - b.ccom_score)
        .map(item => [
          String(item.reference), String(item.name),
          Number(item.quantite||0), Number(item.prix_unitaire||0),
          Number(item.valeur_totale||0), Number(item.age_mois||0),
          Number(item.ccom_score||0), String(item.classe_label||''),
          Number(item.score_criticite||0), Number(item.score_consommation||0),
          Number(item.score_valeur||0), Number(item.score_obsolescence||0),
          item.est_dormant ? 'OUI' : 'NON',
          item.est_strategique ? 'OUI' : 'NON',
          String(item.decision||'')
        ]);
      XLSX.utils.book_append_sheet(wb, makeSheet([
        'Référence','Désignation','Quantité','Prix unitaire (MAD)',
        'Valeur totale (MAD)','Âge (mois)','Score CCOM','Classe CCOM',
        'Score Criticité','Score Consommation','Score Valeur','Score Obsolescence',
        'Est Dormant ?','Est Stratégique ?','Décision'
      ], planRows), 'Plan Action Complet');

      XLSX.writeFile(wb, 'REVEX_Rapport_CCOM_'+(date)+'.xlsx');
      toast.success('📊 Excel exporté — '+(result.tous_articles?.length||0)+' articles dans 4 feuilles !');
    } catch(e) {
      toast.error('Erreur export Excel : ' + e.message);
      console.error(e);
    }
  };

  // ════════════════════════════════════════════════════════════
  // EXPORT PDF — Tous les articles, 3 pages
  // ════════════════════════════════════════════════════════════
  const exportPDF = () => {
    if (!result) { toast.error('Aucun résultat à exporter'); return; }

    const date    = new Date().toLocaleDateString('fr-MA');
    const dormant = (result.dormant_items || []).sort((a,b) => b.valeur_totale - a.valeur_totale);
    const tous    = (result.tous_articles || []).sort((a,b) => a.ccom_score - b.ccom_score);

    const mkRow = (item, i, colorFn) => `
      <tr style="background:${i%2===0?'#fff':'#f9f6ef'}">
        <td style="font-family:monospace;font-size:9px">${item.reference}</td>
        <td style="font-size:10px">${String(item.name).substring(0,55)}</td>
        <td style="text-align:center">${item.quantite}</td>
        <td style="text-align:right">${Number(item.valeur_totale||0).toLocaleString()} MAD</td>
        <td style="text-align:center;color:${item.age_mois>=36?'#C0392B':'#E67E22'};font-weight:700">${item.age_mois}m</td>
        <td style="text-align:center;font-weight:700;color:${item.classe_color||'#888'}">${item.ccom_score}</td>
        <td style="font-size:9px;color:#C0392B;font-weight:600">${item.decision}</td>
      </tr>`;

    const mkRowTous = (item, i) => `
      <tr style="background:${i%2===0?'#fff':'#f9f6ef'}">
        <td style="font-family:monospace;font-size:9px">${item.reference}</td>
        <td style="font-size:10px">${String(item.name).substring(0,50)}</td>
        <td style="text-align:center">${item.quantite}</td>
        <td style="text-align:right">${Number(item.valeur_totale||0).toLocaleString()} MAD</td>
        <td style="text-align:center;font-weight:700;color:${item.classe_color||'#888'}">${item.ccom_score}</td>
        <td style="text-align:center">
          <span style="background:${item.est_dormant?'#FDECEA':item.est_strategique?'#E8F8EE':'#F6F1E7'};color:${item.est_dormant?'#C0392B':item.est_strategique?'#27AE60':'#666'};padding:1px 5px;border-radius:3px;font-size:8px;font-weight:700">
            ${item.est_dormant?'DORMANT':item.est_strategique?'STRATÉGIQUE':item.classe_label||''}
          </span>
        </td>
        <td style="font-size:9px;color:#555">${item.decision}</td>
      </tr>`;

    const html = `<!DOCTYPE html><html lang="fr"><head>
      <meta charset="UTF-8"/>
      <title>Rapport CCOM REVEX — ${date}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        *  { box-sizing:border-box; }
        body { font-family:Arial,sans-serif; font-size:10px; color:#1A1A18; margin:0; }
        h2 { font-size:12px; color:#1E3D0F; margin:12px 0 6px; border-bottom:2px solid #4A7C2F; padding-bottom:3px; page-break-after:avoid; }
        .header { display:flex; justify-content:space-between; margin-bottom:10px; padding-bottom:8px; border-bottom:3px solid #1E3D0F; }
        .logo { font-size:20px; font-weight:700; color:#1E3D0F; }
        .logo span { color:#4A7C2F; }
        .meta { font-size:9px; color:#666; text-align:right; line-height:1.6; }
        .formule { background:#1E3D0F; color:white; padding:6px 12px; border-radius:4px; font-size:9px; margin:6px 0; text-align:center; }
        .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-bottom:10px; }
        .kpi  { background:#F6F1E7; border-left:3px solid #4A7C2F; padding:5px 8px; border-radius:3px; }
        .kv   { font-size:15px; font-weight:700; color:#1E3D0F; }
        .kl   { font-size:8px; color:#666; margin-top:1px; }
        .seg  { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-bottom:10px; }
        .sc   { padding:6px; border-radius:4px; text-align:center; }
        .sv   { font-size:18px; font-weight:700; }
        .sl   { font-size:8px; margin-top:2px; }
        table { width:100%; border-collapse:collapse; font-size:9px; margin-bottom:4px; }
        th    { background:#1E3D0F; color:white; padding:4px 6px; text-align:left; font-size:8px; }
        td    { padding:3px 6px; border-bottom:1px solid #EDE6D3; vertical-align:middle; }
        .pb   { page-break-before:always; }
        .footer { margin-top:10px; padding-top:6px; border-top:1px solid #D9CEBC; font-size:8px; color:#999; display:flex; justify-content:space-between; }
      </style>
    </head><body>

    <!-- PAGE 1 : RÉSUMÉ -->
    <div class="header">
      <div>
        <div class="logo">RE<span>VEX</span> — Rapport Analyse CCOM</div>
        <div style="font-size:9px;color:#666;margin-top:2px">Processus linéaire 15 étapes • Méthode MANSOUR AMINE • Seuil dormant : 36 mois</div>
      </div>
      <div class="meta">Date : <strong>${date}</strong><br/>Total analysés : <strong>${result.total_refs}</strong><br/>Dormants : <strong style="color:#C0392B">${result.dormant_count}</strong></div>
    </div>
    <div class="formule">FORMULE CCOM : Score = (Criticité × 0.4) + (Consommation × 0.3) + (Valeur × 0.2) + (Obsolescence × 0.1)</div>
    <div class="kpis">
      <div class="kpi"><div class="kv">${result.total_refs}</div><div class="kl">Références analysées</div></div>
      <div class="kpi" style="border-color:#C0392B"><div class="kv" style="color:#C0392B">${result.dormant_count}</div><div class="kl">Stock dormant (≥ 36 mois)</div></div>
      <div class="kpi" style="border-color:#27AE60"><div class="kv" style="color:#27AE60">${Number(result.dormant_value||0).toLocaleString()} MAD</div><div class="kl">Capital valorisable</div></div>
      <div class="kpi" style="border-color:#E67E22"><div class="kv" style="color:#E67E22">${result.dormant_percentage}%</div><div class="kl">Taux stock dormant</div></div>
    </div>
    <h2>Segmentation CCOM — Étape 11</h2>
    <div class="seg">
      <div class="sc" style="background:#E8F8EE"><div class="sv" style="color:#27AE60">${result.segmentation?.actif_strategique||0}</div><div class="sl">🟢 Actif Stratégique (>75)</div></div>
      <div class="sc" style="background:#EBF5FB"><div class="sv" style="color:#2980B9">${result.segmentation?.utile||0}</div><div class="sl">🔵 Stock Utile (50-75)</div></div>
      <div class="sc" style="background:#FEF5E7"><div class="sv" style="color:#E67E22">${result.segmentation?.lent||0}</div><div class="sl">🟠 Stock Lent (25-50)</div></div>
      <div class="sc" style="background:#FDECEA"><div class="sv" style="color:#C0392B">${result.segmentation?.dormant_critique||0}</div><div class="sl">🔴 Dormant Critique (<25)</div></div>
    </div>

    <!-- PAGE 2 : STOCK DORMANT COMPLET -->
    <div class="pb"></div>
    <h2>Stock Dormant — ${dormant.length} articles — Plan valorisation (Étape 14)</h2>
    <table>
      <thead><tr><th>Référence</th><th>Désignation</th><th>Qté</th><th>Valeur (MAD)</th><th>Âge</th><th>Score CCOM</th><th>Action</th></tr></thead>
      <tbody>${dormant.map((item,i) => mkRow(item,i)).join('')}</tbody>
    </table>

    <!-- PAGE 3 : PLAN D'ACTION COMPLET -->
    <div class="pb"></div>
    <h2>Plan d'Action Complet — ${tous.length} articles — Étape 12</h2>
    <table>
      <thead><tr><th>Référence</th><th>Désignation</th><th>Qté</th><th>Valeur (MAD)</th><th>Score CCOM</th><th>Classe</th><th>Décision</th></tr></thead>
      <tbody>${tous.map((item,i) => mkRowTous(item,i)).join('')}</tbody>
    </table>

    <div class="footer">
      <span>REVEX — Marketplace B2B Stock Dormant Industriel Maroc</span>
      <span>Rapport généré le ${date} • Méthode CCOM • Seuil : 36 mois (3 ans)</span>
    </div>
    </body></html>`;

    const win = window.open('', '_blank', 'width=1200,height=900');
    if (!win) { toast.error('Popup bloqué ! Autorisez les popups pour ce site dans Chrome.'); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
    toast.success('📄 PDF ouvert — '+(dormant.length)+' dormants + '+(tous.length)+' articles complets !');
  };

  // ════════════════════════════════════════════════════════════
  // PAGE RÉSULTATS CCOM
  // ════════════════════════════════════════════════════════════
  const { segmentation={}, kpis={}, dormant_items=[], strategique_items=[], lent_items=[], tous_articles=[] } = result;
  const tabItems = { dormant:dormant_items, strategique:strategique_items, lent:lent_items, tous:tous_articles };

  return (
    <div style={{ background:'#F6F1E7', minHeight:'100vh' }}>

    {/* ── HERO RÉSULTATS ── */}
    <div style={{ background:'linear-gradient(135deg,#1E3D0F 0%,#2D5A1B 55%,#1E3D0F 100%)', padding:'2.5rem 2rem', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', border:'1.5px solid rgba(126,168,106,0.15)', pointerEvents:'none' }}/>
      <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(39,174,96,0.2)', border:'1px solid rgba(39,174,96,0.4)', borderRadius:100, padding:'0.28rem 0.8rem', marginBottom:'0.7rem' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#7EA86A', display:'inline-block' }}/>
            <span style={{ fontSize:'0.7rem', color:'#7EA86A', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>Analyse terminée</span>
          </div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2.4rem', fontWeight:700, color:'#F6F1E7', lineHeight:1.1, margin:'0 0 0.4rem' }}>
            Résultats — Analyse CCOM
          </h1>
          <p style={{ color:'rgba(246,241,231,0.65)', fontSize:'0.88rem', margin:0 }}>
            {result.total_refs} articles · Seuil 36 mois · {new Date(result.date_analyse).toLocaleDateString('fr-MA')} ·
            <span style={{ color:'#7EA86A', fontWeight:600 }}> {result.dormant_percentage}% dormant détecté</span>
          </p>
        </div>
        <button onClick={() => { setResult(null); setFileInfo(null); }}
          style={{ background:'rgba(255,255,255,0.12)', backdropFilter:'blur(8px)', color:'#F6F1E7', border:'1px solid rgba(255,255,255,0.2)', padding:'0.7rem 1.6rem', borderRadius:100, cursor:'pointer', fontSize:'0.88rem', fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
          🔄 Nouvelle analyse
        </button>
      </div>
    </div>

    <div style={{ maxWidth:1100, margin:'0 auto', padding:'2rem 2rem 4rem' }}>

      {/* ── KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'2rem' }}>
        {[
          ['📦', 'Références analysées',  result.total_refs,                                         '#1E3D0F', '#E8F0E9'],
          ['🔴', 'Stock dormant (≥3 ans)', result.dormant_count,                                     '#C0392B', '#FDECEA'],
          ['💰', 'Capital valorisable',    Number(result.dormant_value||0).toLocaleString()+' MAD',   '#27AE60', '#E8F8EE'],
          ['📈', 'Gain potentiel (65%)',   Number(kpis.gain_potentiel||0).toLocaleString()+' MAD',    '#E67E22', '#FEF5E7'],
        ].map(([icon, label, val, color, bg]) => (
          <div key={label} style={{ background:'#fff', borderRadius:18, padding:'1.5rem', border:'1px solid rgba(30,61,15,0.08)', boxShadow:'0 2px 12px rgba(30,61,15,0.06)' }}>
            <div style={{ width:40, height:40, borderRadius:12, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', marginBottom:'0.7rem' }}>{icon}</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.7rem', fontWeight:700, color, lineHeight:1 }}>{val}</div>
            <div style={{ fontSize:'0.73rem', color:'#9CA3AF', marginTop:'0.4rem', fontWeight:500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Segmentation */}
      <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, padding:'1.8rem', marginBottom:'2rem' }}>
        <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', color:C.forest, marginBottom:'1.2rem' }}>
          Étape 11 — Segmentation CCOM
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.8rem' }}>
          {[
            ['actif_strategique', 'Actif Stratégique', segmentation.actif_strategique||0, '>75'],
            ['utile',            'Stock Utile',        segmentation.utile||0,             '50–75'],
            ['lent',             'Stock Lent',         segmentation.lent||0,              '25–50'],
            ['dormant_critique', 'Dormant Critique',   segmentation.dormant_critique||0,  '<25'],
          ].map(([cls, label, count, range]) => (
            <div key={cls} style={{ background:(CLASSE_COLORS[cls]||'#888')+'18', border:'2px solid '+((CLASSE_COLORS[cls]||'#888'))+'44', borderRadius:14, padding:'1.2rem', textAlign:'center' }}>
              <div style={{ fontSize:'1.4rem', marginBottom:'0.3rem' }}>{CLASSE_ICONS[cls]||'⬜'}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'2rem', fontWeight:700, color:CLASSE_COLORS[cls]||'#888' }}>{count}</div>
              <div style={{ fontSize:'0.72rem', fontWeight:600, color:C.forest, marginTop:'0.2rem' }}>{label}</div>
              <div style={{ fontSize:'0.65rem', color:C.muted }}>Score {range}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard KPI Étape 15 */}
      <div style={{ background:C.forest, borderRadius:18, padding:'1.5rem', marginBottom:'2rem', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem' }}>
        {[
          ['Taux stock dormant',   kpis.taux_dormant||'0%',                                          C.sage  ],
          ['Valeur immobilisée',   Number(kpis.valeur_immobilisee||0).toLocaleString() + ' MAD',      C.orange],
          ['Taux obsolescence',    kpis.taux_obsolescence||'0%',                                      C.urgent],
          ['Gain potentiel (65%)', Number(kpis.gain_potentiel||0).toLocaleString() + ' MAD',          C.eco   ],
        ].map(([label, val, color]) => (
          <div key={label} style={{ textAlign:'center' }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.4rem', fontWeight:700, color }}>{val}</div>
            <div style={{ fontSize:'0.7rem', color:'rgba(246,241,231,0.6)', marginTop:'0.2rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Onglets + tri */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem', flexWrap:'wrap', alignItems:'center' }}>
        {[
          ['dormant',     '🔴 Dormants ('+(dormant_items.length)+')'],
          ['strategique', '🟢 Stratégiques ('+(strategique_items.length)+')'],
          ['lent',        '🟠 Lents ('+(lent_items.length)+')'],
          ['tous',        '📋 Tous ('+(tous_articles.length)+')'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ padding:'0.45rem 1.1rem', borderRadius:100, border:'1.5px solid '+activeTab===id ? C.forest : C.mid, background:activeTab===id ? C.forest : C.white, color:activeTab===id ? C.cream : C.muted, fontSize:'0.83rem', fontWeight:activeTab===id?600:400, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            {label}
          </button>
        ))}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ marginLeft:'auto', padding:'0.45rem 0.9rem', border:'1px solid '+C.mid, borderRadius:100, fontSize:'0.82rem', fontFamily:"'DM Sans',sans-serif", outline:'none', background:C.white, cursor:'pointer' }}>
          <option value="valeur">Trier par valeur</option>
          <option value="age">Trier par âge</option>
          <option value="score">Trier par score CCOM</option>
        </select>
      </div>

      {/* Tableau résultats */}
      <div style={{ background:C.white, border:'1px solid '+C.mid, borderRadius:18, overflow:'hidden', marginBottom:'2rem' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 0.7fr 0.7fr 0.6fr 0.6fr 0.9fr 1.2fr', padding:'0.8rem 1.2rem', background:C.beige, borderBottom:'1px solid '+C.mid, fontSize:'0.7rem', fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em', gap:'0.5rem' }}>
          <div>Article / Référence</div><div>Âge</div><div>CCOM</div><div>Crit.</div><div>Conso.</div><div>Valeur</div><div>Décision</div>
        </div>
        <div style={{ maxHeight:500, overflowY:'auto' }}>
          {sortItems(tabItems[activeTab]).map((item, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 0.7fr 0.7fr 0.6fr 0.6fr 0.9fr 1.2fr', padding:'0.8rem 1.2rem', borderBottom:'1px solid '+C.beige, alignItems:'center', background:i%2===0?C.white:C.cream, gap:'0.5rem' }}>
              <div>
                <div style={{ fontWeight:500, fontSize:'0.86rem', color:C.forest }}>{String(item.name).substring(0,44)}{String(item.name).length>44?'...':''}</div>
                <div style={{ fontSize:'0.7rem', color:C.muted, marginTop:'0.1rem' }}>Réf:{item.reference} • Qté:{item.quantite}</div>
              </div>
              <div style={{ fontSize:'0.8rem', color:item.age_mois>=36?C.urgent:item.age_mois>=24?C.orange:C.muted, fontWeight:item.age_mois>=36?700:400 }}>
                {item.dormant_ans}a<br/><span style={{fontSize:'0.62rem',opacity:0.7}}>{item.age_mois}m</span>
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:'0.88rem', color:item.classe_color }}>{item.ccom_score}</div>
                <div style={{ background:C.mid, borderRadius:100, height:4, marginTop:'0.2rem' }}>
                  <div style={{ background:item.classe_color, width:item.ccom_score+'%', height:'100%', borderRadius:100 }}/>
                </div>
              </div>
              <div style={{ textAlign:'center' }}>
                <span style={{ background:item.score_criticite===100?'#FDECEA':item.score_criticite===60?'#FEF5E7':C.beige, color:item.score_criticite===100?C.urgent:item.score_criticite===60?C.orange:C.eco, padding:'0.12rem 0.4rem', borderRadius:100, fontSize:'0.7rem', fontWeight:700 }}>
                  {item.score_criticite}
                </span>
              </div>
              <div style={{ textAlign:'center' }}>
                <span style={{ background:item.score_consommation===0?'#FDECEA':item.score_consommation<=30?'#FEF5E7':'#E8F8EE', color:item.score_consommation===0?C.urgent:item.score_consommation<=30?C.orange:C.eco, padding:'0.12rem 0.4rem', borderRadius:100, fontSize:'0.7rem', fontWeight:700 }}>
                  {item.score_consommation}
                </span>
              </div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:'0.9rem', color:C.leaf }}>
                {Number(item.valeur_totale).toLocaleString()} MAD
              </div>
              <div style={{ fontSize:'0.72rem', color:item.est_dormant?C.urgent:item.est_strategique?C.eco:C.muted, fontWeight:600, lineHeight:1.3 }}>
                {item.decision}
              </div>
            </div>
          ))}
          {tabItems[activeTab].length === 0 && (
            <div style={{ textAlign:'center', padding:'3rem', color:C.muted, fontSize:'0.88rem' }}>
              Aucun article dans cette catégorie
            </div>
          )}
        </div>
      </div>

      {/* Actions Étape 14 */}
      <div style={{ background:C.beige, border:'1px solid '+C.mid, borderRadius:18, padding:'1.8rem' }}>
        <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', color:C.forest, marginBottom:'1rem' }}>
          Étape 14 — Actions opérationnelles
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1.2rem' }}>
          {[
            { icon:'🏪', label: publishing ? 'Publication...' : 'Publier dormants critiques (' + (result.dormant_items||[]).filter(i=>i.classe==='dormant_critique'||i.ccom_score<25).length + ') — 🪙 ' + ((result.dormant_items||[]).filter(i=>i.classe==='dormant_critique'||i.ccom_score<25).length * COST_BULK), desc:'Publie Score < 25 • Solde : ' + tokenBalance + ' jetons', color:publishing?C.muted:C.leaf, fn: handlePublishDormants },
            { icon:'📊', label:'Exporter Excel (.xlsx)', desc:'Plan d\'action complet — 4 feuilles détaillées',             color:C.blue,   fn:exportExcel },
            { icon:'📄', label:'Exporter PDF',           desc:'Rapport imprimable A4 paysage',                              color:'#8E44AD', fn:exportPDF  },
            { icon:'🔄', label:'Nouvelle analyse',       desc:'Analyser un autre fichier de stock',                         color:C.orange, fn:() => { setResult(null); setFileInfo(null); } },
          ].map(a => (
            <button key={a.label} onClick={a.fn}
              style={{ background:a.color, color:'#fff', border:'none', borderRadius:16, padding:'1.2rem', cursor:'pointer', textAlign:'left', fontFamily:"'DM Sans',sans-serif" }}
              onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity='1'}>
              <div style={{ fontSize:'1.8rem', marginBottom:'0.4rem' }}>{a.icon}</div>
              <div style={{ fontWeight:700, fontSize:'0.88rem', marginBottom:'0.2rem' }}>{a.label}</div>
              <div style={{ fontSize:'0.73rem', opacity:0.85, lineHeight:1.4 }}>{a.desc}</div>
            </button>
          ))}
        </div>

        {/* ── Services REVEX ── */}

        <div style={{ background:'#E8F8EE', border:'1px solid #a8dfc0', borderRadius:12, padding:'0.9rem 1.2rem', fontSize:'0.82rem', color:'#145A32', marginBottom:'1.2rem' }}>
          ✅ <strong>Étape 13 — Validation multi-acteurs :</strong> Faire valider par <strong>Maintenance</strong> (criticité), <strong>Supply Chain</strong> (stock/rotation) et <strong>Finance</strong> (impact financier) avant exécution.
        </div>

        {/* ── CTA STOCKER DORMANTS CHEZ REVEX ── */}
        {((result.dormant_items||[]).filter(i => i.classe==='dormant_critique' || i.ccom_score < 25).length > 0) && (
          <div style={{ background:'linear-gradient(135deg,#1E3D0F,#2D5A1B)', borderRadius:20, padding:'1.8rem 2rem', overflow:'hidden', position:'relative' }}>
            <div style={{ position:'absolute', top:-30, right:-30, width:160, height:160, borderRadius:'50%', border:'1.5px solid rgba(126,168,106,0.15)', pointerEvents:'none' }}/>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1.5rem' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.7rem', marginBottom:'0.5rem' }}>
                  <span style={{ fontSize:'1.8rem' }}>🏢</span>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:700, color:'#F6F1E7' }}>
                    Stocker votre stock dormant chez REVEX
                  </div>
                </div>
                <div style={{ color:'rgba(246,241,231,0.65)', fontSize:'0.88rem', lineHeight:1.6, maxWidth:520 }}>
                  Votre analyse révèle{' '}
                  <strong style={{ color:'#FCD34D' }}>
                    {(result.dormant_items||[]).filter(i => i.classe==='dormant_critique' || i.ccom_score < 25).length} articles dormants critiques
                  </strong>{' '}
                  d'une valeur de{' '}
                  <strong style={{ color:'#6EE7B7' }}>
                    {(result.dormant_items||[]).filter(i=>i.classe==='dormant_critique'||i.ccom_score<25).reduce((s,i)=>s+Number(i.valeur_totale||0),0).toLocaleString('fr-MA')} MAD
                  </strong>.
                  REVEX les stocke, les certifie Grade A+ à D, et les met en vente automatiquement sur la marketplace.
                </div>

                {/* 3 avantages */}
                <div style={{ display:'flex', gap:'1.2rem', marginTop:'0.9rem', flexWrap:'wrap' }}>
                  {[
                    ['📦', 'Stockage sécurisé'],
                    ['📜', 'Certification REVEX'],
                    ['💰', 'Mise en vente auto'],
                    ['🚛', 'Transport pris en charge'],
                  ].map(([ic, lb]) => (
                    <div key={lb} style={{ display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.78rem', color:'rgba(246,241,231,0.7)' }}>
                      <span>{ic}</span><span>{lb}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bouton principal */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.6rem', flexShrink:0 }}>
                <button
                  onClick={handleStockerDormants}
                  disabled={stockingDormants}
                  style={{ background:stockingDormants?'rgba(255,255,255,0.2)':'#F6F1E7', color:stockingDormants?'rgba(255,255,255,0.6)':'#1E3D0F', border:'none', borderRadius:100, padding:'1rem 2.2rem', fontWeight:700, fontSize:'1rem', cursor:stockingDormants?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", boxShadow:'0 4px 20px rgba(0,0,0,0.2)', transition:'all 0.2s', whiteSpace:'nowrap' }}>
                  {stockingDormants ? '⏳ Envoi en cours...' : '🏢 Stocker chez REVEX →'}
                </button>
                <div style={{ fontSize:'0.72rem', color:'rgba(246,241,231,0.45)', textAlign:'center' }}>
                  Demande envoyée automatiquement · Réponse sous 24h
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
    </div>
  );
}

// ── Styles services modals ────────────────────────────────────
const sLbl = { fontSize:'0.78rem', fontWeight:600, color:'#1E3D0F', display:'block', marginBottom:'0.3rem' };
const sInp = { width:'100%', padding:'0.65rem 0.9rem', border:'1.5px solid #D9CEBC', borderRadius:10, fontSize:'0.88rem', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' };
