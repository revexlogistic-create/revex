// src/utils/generateLogisticsDoc.js
// Génère tous les documents logistiques REVEX
// Types : bonChargement | bonDechargement | bonSortie | bonLivraison | bonCommande

function fmt(n) {
  return Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtQty(n) {
  return Number(n || 0).toLocaleString('fr-MA');
}
function now() {
  return new Date().toLocaleString('fr-MA', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function docDate() {
  return new Date().toLocaleDateString('fr-MA', { day:'2-digit', month:'long', year:'numeric' });
}
function docNum(prefix, ref) {
  const d = new Date();
  const yymm = d.getFullYear().toString().slice(-2) + String(d.getMonth()+1).padStart(2,'0');
  const r = (ref||'').replace(/-/g,'').substring(0,6).toUpperCase();
  return prefix + '-' + yymm + '-' + r;
}

// ── Styles CSS communs ────────────────────────────────────────
function commonStyles(accentColor) {
  return `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Georgia,serif;background:#f0ece3;padding:24px;display:flex;flex-direction:column;align-items:center}
  .doc{background:#fff;width:210mm;max-width:760px;border-radius:8px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.15)}
  .hdr{background:linear-gradient(135deg,#1E3D0F,#2D5A1B);padding:24px 36px 18px;position:relative;overflow:hidden}
  .hdr::after{content:'';position:absolute;top:-25px;right:-25px;width:110px;height:110px;border-radius:50%;border:1.5px solid rgba(126,168,106,0.15)}
  .logo{font-size:28px;font-weight:700;color:#F6F1E7;letter-spacing:3px;margin-bottom:8px}
  .doc-type{display:inline-block;background:${accentColor}33;border:1px solid ${accentColor}66;border-radius:100px;padding:3px 14px;font-size:9px;color:${accentColor};font-weight:700;letter-spacing:1.5px;text-transform:uppercase;font-family:Calibri,sans-serif;margin-bottom:6px}
  .hdr h1{font-size:20px;color:#F6F1E7;font-weight:700;margin-bottom:2px}
  .hdr p{font-size:10px;color:rgba(246,241,231,0.5);font-family:Calibri,sans-serif}
  .body{padding:24px 36px}
  .num-bar{background:#F6F1E7;border:1px solid #D9CEBC;border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
  .num{font-family:Consolas,monospace;font-size:14px;font-weight:700;color:#1E3D0F;letter-spacing:2px}
  .sec-title{font-size:9px;color:#8C8C7A;text-transform:uppercase;letter-spacing:1px;font-family:Calibri,sans-serif;margin-bottom:4px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px}
  .cell{background:#F6F1E7;border-radius:8px;padding:9px 12px;border:1px solid #EDE6D3}
  .cell .lbl{font-size:8px;color:#8C8C7A;text-transform:uppercase;letter-spacing:0.8px;font-family:Calibri,sans-serif;margin-bottom:2px}
  .cell .val{font-size:12px;font-weight:600;color:#1E3D0F}
  .accent-bar{background:${accentColor}11;border-left:3px solid ${accentColor};border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:16px;font-size:10px;color:#1E3D0F;font-family:Calibri,sans-serif;line-height:1.6}
  .table-wrap{border:1px solid #D9CEBC;border-radius:10px;overflow:hidden;margin-bottom:16px}
  .th{background:#1E3D0F;color:#F6F1E7;padding:7px 10px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Calibri,sans-serif}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:18px;padding-top:14px;border-top:1px solid #EDE6D3}
  .sig-box .role{font-size:9px;font-weight:700;color:#1E3D0F;font-family:Calibri,sans-serif;margin-bottom:3px}
  .sig-box .sname{font-size:10px;color:#5C5C50;font-family:Calibri,sans-serif}
  .sig-line{border-bottom:1.5px solid #1E3D0F;margin:22px 0 3px}
  .sig-label{font-size:8px;color:#8C8C7A;font-family:Calibri,sans-serif}
  .doc-ftr{background:#1E3D0F;padding:9px 36px;display:flex;justify-content:space-between;align-items:center}
  .dft-t{font-size:8.5px;color:rgba(246,241,231,0.5);font-family:Calibri,sans-serif}
  .dft-l{font-size:12px;font-weight:700;color:rgba(246,241,231,0.8);letter-spacing:3px}
  .print-btn{margin-top:14px;padding:9px 26px;background:#1E3D0F;color:#F6F1E7;border:none;border-radius:100px;font-size:12px;font-weight:600;cursor:pointer;font-family:Calibri,sans-serif}
  @media print{body{background:#fff;padding:0}.doc{box-shadow:none;border-radius:0}.print-btn{display:none}}
  `;
}

function openDoc(html) {
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.onload = () => win.focus(); }
}

function wrapDoc(styles, body, docNum, docTitle) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>${docTitle}</title><style>${styles}</style></head><body>${body}<button class="print-btn" onclick="window.print()">🖨️ Imprimer / PDF</button></body></html>`;
}

// ════════════════════════════════════════════════════════════════
// 1. BON DE CHARGEMENT — stock entrant entrepôt
// ════════════════════════════════════════════════════════════════
export function generateBonChargement(data) {
  const { requestId, companyName, contactName, contactPhone, city, warehouseName, warehouseCity,
    deliveryMode, deliveryDate, estimatedVol, items, wantPhotos, wantCertif, wantInventory } = data;

  const num = docNum('REVEX-BC', requestId);
  const styles = commonStyles('#2563EB');
  const itemsRows = (items || [{ desc: 'Articles PDR industriels', ref: '—', qty: '—', poids: '—' }])
    .map((it, i) => `<tr style="background:${i%2===0?'#fff':'#F6F1E7'}">
      <td style="padding:7px 10px;font-size:11px;color:#1E3D0F;border-bottom:1px solid #EDE6D3">${it.desc}</td>
      <td style="padding:7px 10px;font-size:11px;color:#5C5C50;text-align:center;border-bottom:1px solid #EDE6D3;font-family:Consolas,monospace">${it.ref||'—'}</td>
      <td style="padding:7px 10px;font-size:11px;color:#1E3D0F;text-align:center;border-bottom:1px solid #EDE6D3">${it.qty||'—'}</td>
      <td style="padding:7px 10px;font-size:11px;color:#5C5C50;text-align:center;border-bottom:1px solid #EDE6D3">${it.poids||'—'}</td>
      <td style="padding:7px 10px;font-size:11px;color:#5C5C50;text-align:center;border-bottom:1px solid #EDE6D3">${it.volume||'—'}</td>
      <td style="padding:7px 10px;font-size:11px;text-align:center;border-bottom:1px solid #EDE6D3"><span style="font-size:14px">${it.etat||'⬜'}</span></td>
    </tr>`).join('');

  const body = `
  <div class="doc">
    <div class="hdr">
      <div class="logo">REVEX</div>
      <div class="doc-type">BON DE CHARGEMENT</div>
      <h1>Bon de Chargement — Entrée Entrepôt</h1>
      <p>Document obligatoire pour toute réception de stock · Conservation 5 ans</p>
    </div>
    <div class="body">
      <div class="num-bar">
        <div><div class="sec-title">N° de Bon</div><div class="num">${num}</div></div>
        <div style="text-align:right;font-size:10px;color:#8C8C7A;font-family:Calibri,sans-serif">
          Date : <strong>${docDate()}</strong><br/>Heure : <strong>${new Date().toLocaleTimeString('fr-MA', {hour:'2-digit',minute:'2-digit'})}</strong>
        </div>
      </div>

      <div class="grid2">
        <div class="cell"><div class="lbl">🏭 Expéditeur</div><div class="val">${companyName||'—'}</div></div>
        <div class="cell"><div class="lbl">🏢 Entrepôt destinataire</div><div class="val">${warehouseName||'Entrepôt REVEX'} · ${warehouseCity||'—'}</div></div>
        <div class="cell"><div class="lbl">👤 Contact</div><div class="val">${contactName||'—'} · ${contactPhone||'—'}</div></div>
        <div class="cell"><div class="lbl">📍 Ville d'origine</div><div class="val">${city||'—'}</div></div>
        <div class="cell"><div class="lbl">🚛 Mode d'acheminement</div><div class="val">${deliveryMode==='self'?'Dépôt direct':deliveryMode==='revex'?'Collecte REVEX':'Transporteur partenaire'}</div></div>
        <div class="cell"><div class="lbl">📅 Date de dépôt prévue</div><div class="val">${deliveryDate ? new Date(deliveryDate).toLocaleDateString('fr-MA') : 'À définir'}</div></div>
      </div>

      <div class="table-wrap">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th class="th" style="text-align:left;width:30%">Désignation</th>
            <th class="th" style="text-align:center;width:15%">Référence</th>
            <th class="th" style="text-align:center;width:10%">Qté</th>
            <th class="th" style="text-align:center;width:12%">Poids (kg)</th>
            <th class="th" style="text-align:center;width:13%">Volume (m³)</th>
            <th class="th" style="text-align:center;width:10%">État reçu</th>
          </tr></thead>
          <tbody>${itemsRows}</tbody>
        </table>
      </div>

      <div class="grid3">
        <div class="cell"><div class="lbl">Volume total estimé</div><div class="val">${estimatedVol||'—'} m³</div></div>
        <div class="cell"><div class="lbl">Services à effectuer</div><div class="val" style="font-size:10px">${[wantPhotos?'📸 Photos':'',wantCertif?'📜 Certif':'',wantInventory?'📊 Inventaire':''].filter(Boolean).join(' · ')||'—'}</div></div>
        <div class="cell"><div class="lbl">Emplacement entrepôt</div><div class="val">Zone : _______</div></div>
      </div>

      <div class="accent-bar">
        ✅ Contrôle à réception : état général · intégrité emballage · conformité référence · étiquetage PDR
      </div>

      <div class="sig-grid">
        <div class="sig-box"><div class="role">Transporteur / Déposant</div><div class="sname">${companyName||'—'}</div><div class="sig-line"></div><div class="sig-label">Signature</div></div>
        <div class="sig-box"><div class="role">Responsable Entrepôt REVEX</div><div class="sname">${warehouseName||'Entrepôt REVEX'}</div><div class="sig-line"></div><div class="sig-label">Signature & cachet</div></div>
        <div class="sig-box"><div class="role">Contrôle Qualité</div><div class="sname">Inspecteur REVEX</div><div class="sig-line"></div><div class="sig-label">Signature & tampon</div></div>
      </div>
    </div>
    <div class="doc-ftr">
      <div class="dft-t">${num} · REVEX · revex.ma · Chargement entrant</div>
      <div class="dft-l">REVEX</div>
    </div>
  </div>`;

  openDoc(wrapDoc(styles, body, num, 'Bon de Chargement ' + num));
}

// ════════════════════════════════════════════════════════════════
// 2. BON DE DÉCHARGEMENT — stock sortant entrepôt (vendu)
// ════════════════════════════════════════════════════════════════
export function generateBonDechargement(data) {
  const { orderId, orderNumber, productTitle, reference, grade, quantity, unit,
    buyerCompany, buyerCity, sellerCompany, warehouseName, deliveryType, finalPrice } = data;

  const num = docNum('REVEX-BD', orderId || orderNumber);
  const styles = commonStyles('#DC2626');

  const body = `
  <div class="doc">
    <div class="hdr">
      <div class="logo">REVEX</div>
      <div class="doc-type" style="background:#DC262622;border-color:#DC262644;color:#FCA5A5">BON DE DÉCHARGEMENT</div>
      <h1>Bon de Déchargement — Sortie Entrepôt</h1>
      <p>Suite à vente — Ordre de sortie définitif du stock REVEX</p>
    </div>
    <div class="body">
      <div class="num-bar">
        <div><div class="sec-title">N° de Bon</div><div class="num">${num}</div></div>
        <div style="text-align:right;font-size:10px;color:#8C8C7A;font-family:Calibri,sans-serif">
          Commande : <strong>${orderNumber||'—'}</strong><br/>Date : <strong>${docDate()}</strong>
        </div>
      </div>

      <div class="grid2">
        <div class="cell"><div class="lbl">🏢 Entrepôt d'origine</div><div class="val">${warehouseName||'Entrepôt REVEX'}</div></div>
        <div class="cell"><div class="lbl">🛒 Destinataire (Acheteur)</div><div class="val">${buyerCompany||'—'} · ${buyerCity||'—'}</div></div>
        <div class="cell"><div class="lbl">🏭 Propriétaire initial</div><div class="val">${sellerCompany||'—'}</div></div>
        <div class="cell"><div class="lbl">🚛 Mode de livraison</div><div class="val">${deliveryType==='eco'?'🌿 Retour à vide REVEX':'⚡ Livraison urgente'}</div></div>
      </div>

      <div class="table-wrap">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th class="th" style="text-align:left;width:35%">Désignation</th>
            <th class="th" style="text-align:center;width:18%">Référence</th>
            <th class="th" style="text-align:center;width:10%">Grade</th>
            <th class="th" style="text-align:center;width:12%">Quantité</th>
            <th class="th" style="text-align:right;width:15%">Valeur</th>
            <th class="th" style="text-align:center;width:10%">Contrôle</th>
          </tr></thead>
          <tbody>
            <tr>
              <td style="padding:9px 10px;font-size:11px;color:#1E3D0F;border-bottom:1px solid #EDE6D3"><strong>${productTitle||'—'}</strong></td>
              <td style="padding:9px 10px;font-size:11px;color:#5C5C50;text-align:center;font-family:Consolas,monospace;border-bottom:1px solid #EDE6D3">${reference||'—'}</td>
              <td style="padding:9px 10px;font-size:11px;text-align:center;border-bottom:1px solid #EDE6D3"><span style="background:#2563EB22;color:#2563EB;border-radius:100px;padding:2px 8px;font-weight:700">Grade ${grade||'—'}</span></td>
              <td style="padding:9px 10px;font-size:11px;font-weight:700;color:#1E3D0F;text-align:center;border-bottom:1px solid #EDE6D3">${quantity||1} ${unit||'u.'}</td>
              <td style="padding:9px 10px;font-size:12px;font-weight:700;color:#1E3D0F;text-align:right;border-bottom:1px solid #EDE6D3">${fmt(finalPrice)} MAD</td>
              <td style="padding:9px 10px;text-align:center;border-bottom:1px solid #EDE6D3"><span style="font-size:16px">⬜</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="accent-bar" style="border-color:#DC2626;background:#FEF2F2">
        ⚠️ Ce bon autorise la sortie définitive du stock. Vérifier l'identité du transporteur et la conformité du colis avant remise.
      </div>

      <div class="sig-grid">
        <div class="sig-box"><div class="role">Responsable Entrepôt REVEX</div><div class="sname">${warehouseName||'—'}</div><div class="sig-line"></div><div class="sig-label">Autorisé par</div></div>
        <div class="sig-box"><div class="role">Transporteur / Livreur</div><div class="sname">À compléter</div><div class="sig-line"></div><div class="sig-label">Signature & CIN</div></div>
        <div class="sig-box"><div class="role">Confirmation sortie</div><div class="sname">Heure : ____:____</div><div class="sig-line"></div><div class="sig-label">Cachet entrepôt</div></div>
      </div>
    </div>
    <div class="doc-ftr">
      <div class="dft-t">${num} · REVEX · Sortie autorisée · ${orderNumber||'—'}</div>
      <div class="dft-l">REVEX</div>
    </div>
  </div>`;

  openDoc(wrapDoc(styles, body, num, 'Bon de Déchargement ' + num));
}

// ════════════════════════════════════════════════════════════════
// 3. BON DE SORTIE — sortie de stock suite à vente
// ════════════════════════════════════════════════════════════════
export function generateBonSortie(data) {
  const { orderId, orderNumber, productTitle, reference, grade, quantity, unit,
    buyerCompany, buyerCity, sellerCompany, finalPrice, createdAt } = data;

  const num = docNum('REVEX-BS', orderId || orderNumber);
  const styles = commonStyles('#8B5CF6');

  const body = `
  <div class="doc">
    <div class="hdr">
      <div class="logo">REVEX</div>
      <div class="doc-type" style="background:#8B5CF622;border-color:#8B5CF644;color:#C4B5FD">BON DE SORTIE STOCK</div>
      <h1>Bon de Sortie de Stock</h1>
      <p>Transfert de propriété suite à vente · Transaction certifiée REVEX</p>
    </div>
    <div class="body">
      <div class="num-bar">
        <div><div class="sec-title">N° de Bon de Sortie</div><div class="num">${num}</div></div>
        <div style="text-align:right;font-size:10px;color:#8C8C7A;font-family:Calibri,sans-serif">
          Commande : <strong>${orderNumber||'—'}</strong><br/>Date vente : <strong>${createdAt ? new Date(createdAt).toLocaleDateString('fr-MA') : docDate()}</strong>
        </div>
      </div>

      <div class="grid2">
        <div class="cell"><div class="lbl">🏭 Cédant (Vendeur)</div><div class="val">${sellerCompany||'—'}</div></div>
        <div class="cell"><div class="lbl">🛒 Cessionnaire (Acheteur)</div><div class="val">${buyerCompany||'—'} · ${buyerCity||'—'}</div></div>
      </div>

      <div style="background:#F6F1E7;border:1px solid #D9CEBC;border-radius:10px;overflow:hidden;margin-bottom:16px">
        <div style="background:#8B5CF6;padding:7px 14px"><span style="font-size:9px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.8px;font-family:Calibri,sans-serif">📦 Article transféré</span></div>
        <div style="padding:14px 16px;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:12px">
          <div><div class="sec-title">Désignation</div><div style="font-size:13px;font-weight:700;color:#1E3D0F">${productTitle||'—'}</div><div style="font-size:10px;color:#5C5C50;font-family:Consolas,monospace;margin-top:2px">Réf : ${reference||'—'}</div></div>
          <div><div class="sec-title">Grade REVEX</div><div style="font-size:14px;font-weight:700;color:#2563EB">Grade ${grade||'—'}</div></div>
          <div><div class="sec-title">Quantité</div><div style="font-size:14px;font-weight:700;color:#1E3D0F">${quantity||1} ${unit||'u.'}</div></div>
          <div><div class="sec-title">Valeur cession</div><div style="font-size:14px;font-weight:700;color:#8B5CF6">${fmt(finalPrice)} MAD</div></div>
        </div>
      </div>

      <div class="grid3">
        <div class="cell"><div class="lbl">Paiement</div><div class="val">✅ Escrow libéré</div></div>
        <div class="cell"><div class="lbl">Certificat traçabilité</div><div class="val">📜 Émis</div></div>
        <div class="cell"><div class="lbl">Transfert de propriété</div><div class="val">✅ Effectif</div></div>
      </div>

      <div class="accent-bar" style="border-color:#8B5CF6;background:#F5F3FF">
        Ce bon de sortie atteste le transfert définitif de propriété de la pièce référencée ci-dessus, du Vendeur vers l'Acheteur, via la plateforme REVEX. Il fait suite à la confirmation de réception et à la libération du paiement escrow.
      </div>

      <div class="sig-grid">
        <div class="sig-box"><div class="role">Vendeur cédant</div><div class="sname">${sellerCompany||'—'}</div><div class="sig-line"></div><div class="sig-label">Signature</div></div>
        <div class="sig-box"><div class="role">Plateforme REVEX</div><div class="sname">Roamers Community SARL</div><div class="sig-line"></div><div class="sig-label">Cachet REVEX</div></div>
        <div class="sig-box"><div class="role">Acheteur cessionnaire</div><div class="sname">${buyerCompany||'—'}</div><div class="sig-line"></div><div class="sig-label">Confirmation réception</div></div>
      </div>
    </div>
    <div class="doc-ftr">
      <div class="dft-t">${num} · REVEX · Bon de sortie · ${orderNumber||'—'}</div>
      <div class="dft-l">REVEX</div>
    </div>
  </div>`;

  openDoc(wrapDoc(styles, body, num, 'Bon de Sortie ' + num));
}

// ════════════════════════════════════════════════════════════════
// 4. BON DE LIVRAISON — toutes livraisons REVEX
// ════════════════════════════════════════════════════════════════
export function generateBonLivraison(data) {
  const { orderId, orderNumber, productTitle, reference, grade, quantity, unit,
    buyerCompany, buyerAddress, buyerCity, buyerPhone,
    sellerCompany, sellerCity, carrierCompany, carrierPhone,
    deliveryType, deliveryDate, trackingRef, finalPrice } = data;

  const num = docNum('REVEX-BL', orderId || orderNumber);
  const styles = commonStyles('#059669');

  const body = `
  <div class="doc">
    <div class="hdr">
      <div class="logo">REVEX</div>
      <div class="doc-type" style="background:#05966922;border-color:#05966944;color:#6EE7B7">BON DE LIVRAISON</div>
      <h1>Bon de Livraison</h1>
      <p>${deliveryType==='eco'?'Livraison Retour à Vide REVEX · Éco-responsable':'Livraison Express · Urgente'} · À conserver par l'acheteur</p>
    </div>
    <div class="body">
      <div class="num-bar">
        <div><div class="sec-title">N° de Livraison</div><div class="num">${num}</div></div>
        <div style="text-align:right;font-size:10px;color:#8C8C7A;font-family:Calibri,sans-serif">
          Commande : <strong>${orderNumber||'—'}</strong><br/>
          ${trackingRef ? 'Tracking : <strong style="font-family:Consolas,monospace">'+trackingRef+'</strong><br/>' : ''}
          Date livraison : <strong>${deliveryDate ? new Date(deliveryDate).toLocaleDateString('fr-MA') : '___/___/______'}</strong>
        </div>
      </div>

      <div class="grid2">
        <div class="cell"><div class="lbl">📤 Expéditeur</div><div class="val">${sellerCompany||'—'}<br/><span style="font-size:10px;font-weight:400;color:#5C5C50">${sellerCity||'—'}</span></div></div>
        <div class="cell"><div class="lbl">📥 Destinataire</div><div class="val">${buyerCompany||'—'}<br/><span style="font-size:10px;font-weight:400;color:#5C5C50">${buyerAddress||buyerCity||'—'}</span></div></div>
        <div class="cell"><div class="lbl">🚛 Transporteur</div><div class="val">${carrierCompany||'REVEX Logistics'} · ${carrierPhone||'—'}</div></div>
        <div class="cell"><div class="lbl">📞 Tel destinataire</div><div class="val">${buyerPhone||'—'}</div></div>
      </div>

      <div class="table-wrap">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th class="th" style="text-align:left;width:35%">Colis / Article</th>
            <th class="th" style="text-align:center;width:18%">Référence</th>
            <th class="th" style="text-align:center;width:10%">Grade</th>
            <th class="th" style="text-align:center;width:12%">Qté</th>
            <th class="th" style="text-align:center;width:12%">État livraison</th>
            <th class="th" style="text-align:center;width:13%">Conforme</th>
          </tr></thead>
          <tbody>
            <tr>
              <td style="padding:9px 10px;font-size:11px;color:#1E3D0F;border-bottom:1px solid #EDE6D3"><strong>${productTitle||'—'}</strong></td>
              <td style="padding:9px 10px;font-size:11px;text-align:center;font-family:Consolas,monospace;color:#5C5C50;border-bottom:1px solid #EDE6D3">${reference||'—'}</td>
              <td style="padding:9px 10px;font-size:11px;text-align:center;border-bottom:1px solid #EDE6D3"><span style="background:#2563EB22;color:#2563EB;border-radius:100px;padding:2px 7px;font-weight:700">Grade ${grade||'—'}</span></td>
              <td style="padding:9px 10px;font-size:12px;font-weight:700;color:#1E3D0F;text-align:center;border-bottom:1px solid #EDE6D3">${quantity||1} ${unit||'u.'}</td>
              <td style="padding:9px 10px;text-align:center;border-bottom:1px solid #EDE6D3"><span style="font-size:14px">⬜</span></td>
              <td style="padding:9px 10px;text-align:center;border-bottom:1px solid #EDE6D3">☐ Oui &nbsp; ☐ Non</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid3">
        <div class="cell"><div class="lbl">Valeur déclarée</div><div class="val">${fmt(finalPrice)} MAD</div></div>
        <div class="cell"><div class="lbl">Mode livraison</div><div class="val">${deliveryType==='eco'?'🌿 Retour à vide':'⚡ Urgente'}</div></div>
        <div class="cell"><div class="lbl">Heure de livraison</div><div class="val">____:____</div></div>
      </div>

      <div class="accent-bar" style="border-color:#059669;background:#ECFDF5">
        📋 Instructions : Vérifier l'intégrité du colis à réception. Toute réserve doit être notée sur ce bon. En cas de non-conformité, contacter REVEX sous 24h : support@revex.ma
      </div>

      <div style="background:#F6F1E7;border:1px solid #D9CEBC;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:10px;color:#5C5C50;font-family:Calibri,sans-serif">
        <strong style="color:#1E3D0F">Réserves / Observations :</strong><br/><br/>
        _______________________________________________________________________________<br/><br/>
        _______________________________________________________________________________
      </div>

      <div class="sig-grid">
        <div class="sig-box"><div class="role">Transporteur</div><div class="sname">${carrierCompany||'—'}</div><div class="sig-line"></div><div class="sig-label">Signature</div></div>
        <div class="sig-box"><div class="role">Destinataire</div><div class="sname">${buyerCompany||'—'}</div><div class="sig-line"></div><div class="sig-label">Nom & Signature</div></div>
        <div class="sig-box"><div class="role">Date & Heure effective</div><div class="sname">____ / ____ / ________</div><div class="sig-line"></div><div class="sig-label">Cachet destinataire</div></div>
      </div>
    </div>
    <div class="doc-ftr">
      <div class="dft-t">${num} · REVEX · Bon de livraison · ${orderNumber||'—'}</div>
      <div class="dft-l">REVEX</div>
    </div>
  </div>`;

  openDoc(wrapDoc(styles, body, num, 'Bon de Livraison ' + num));
}

// ════════════════════════════════════════════════════════════════
// 5. BON DE COMMANDE — achat PDR via REVEX
// ════════════════════════════════════════════════════════════════
export function generateBonCommande(data) {
  const { orderId, orderNumber, productTitle, reference, grade, quantity, unit,
    unitPrice, finalPrice, deliveryPrice, deliveryType,
    buyerCompany, buyerCity, buyerIce,
    sellerCompany, sellerCity,
    createdAt, notes } = data;

  const num = docNum('REVEX-BC', orderId || orderNumber);
  const total = Number(finalPrice||0) + Number(deliveryPrice||0);
  const styles = commonStyles('#D97706');

  const body = `
  <div class="doc">
    <div class="hdr">
      <div class="logo">REVEX</div>
      <div class="doc-type" style="background:#D9770622;border-color:#D9770644;color:#FDE68A">BON DE COMMANDE</div>
      <h1>Bon de Commande</h1>
      <p>Achat PDR industriel certifié REVEX · Document contractuel</p>
    </div>
    <div class="body">
      <div class="num-bar">
        <div><div class="sec-title">N° de Commande</div><div class="num">${orderNumber||num}</div></div>
        <div style="text-align:right;font-size:10px;color:#8C8C7A;font-family:Calibri,sans-serif">
          Date : <strong>${createdAt ? new Date(createdAt).toLocaleDateString('fr-MA') : docDate()}</strong><br/>
          Bon : <strong style="font-family:Consolas,monospace">${num}</strong>
        </div>
      </div>

      <div class="grid2">
        <div class="cell" style="border-left:3px solid #D97706">
          <div class="lbl">🛒 Acheteur (Donneur d'ordre)</div>
          <div class="val">${buyerCompany||'—'}</div>
          <div style="font-size:10px;color:#5C5C50;font-family:Calibri,sans-serif;margin-top:3px">${buyerCity||'—'}${buyerIce?' · ICE : '+buyerIce:''}</div>
        </div>
        <div class="cell" style="border-left:3px solid #2563EB">
          <div class="lbl">🏭 Fournisseur (Vendeur)</div>
          <div class="val">${sellerCompany||'—'}</div>
          <div style="font-size:10px;color:#5C5C50;font-family:Calibri,sans-serif;margin-top:3px">${sellerCity||'—'} · Via plateforme REVEX</div>
        </div>
      </div>

      <div class="table-wrap">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th class="th" style="text-align:left;width:32%">Désignation</th>
            <th class="th" style="text-align:center;width:16%">Référence</th>
            <th class="th" style="text-align:center;width:10%">Grade</th>
            <th class="th" style="text-align:center;width:10%">Qté</th>
            <th class="th" style="text-align:right;width:14%">P.U HT</th>
            <th class="th" style="text-align:right;width:13%">Total HT</th>
          </tr></thead>
          <tbody>
            <tr style="background:#fff">
              <td style="padding:9px 10px;font-size:11px;color:#1E3D0F;border-bottom:1px solid #EDE6D3"><strong>${productTitle||'—'}</strong></td>
              <td style="padding:9px 10px;font-size:11px;text-align:center;font-family:Consolas,monospace;color:#5C5C50;border-bottom:1px solid #EDE6D3">${reference||'—'}</td>
              <td style="padding:9px 10px;font-size:11px;text-align:center;border-bottom:1px solid #EDE6D3"><span style="background:#2563EB22;color:#2563EB;border-radius:100px;padding:2px 7px;font-weight:700">Grade ${grade||'—'}</span></td>
              <td style="padding:9px 10px;font-size:12px;font-weight:700;text-align:center;border-bottom:1px solid #EDE6D3">${quantity||1} ${unit||'u.'}</td>
              <td style="padding:9px 10px;font-size:11px;text-align:right;border-bottom:1px solid #EDE6D3">${fmt(unitPrice)} MAD</td>
              <td style="padding:9px 10px;font-size:12px;font-weight:700;color:#1E3D0F;text-align:right;border-bottom:1px solid #EDE6D3">${fmt(finalPrice)} MAD</td>
            </tr>
            <tr style="background:#F6F1E7">
              <td colspan="5" style="padding:8px 10px;font-size:11px;color:#5C5C50;font-style:italic;border-bottom:1px solid #EDE6D3">${deliveryType==='eco'?'🌿 Livraison retour à vide REVEX':'⚡ Livraison urgente'}</td>
              <td style="padding:8px 10px;font-size:11px;text-align:right;border-bottom:1px solid #EDE6D3">${fmt(deliveryPrice)} MAD</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
        <div style="width:260px">
          <div style="display:flex;justify-content:space-between;padding:6px 12px;font-size:11px;font-family:Calibri,sans-serif">
            <span style="color:#5C5C50">Total HT</span>
            <span style="font-weight:600;color:#1E3D0F">${fmt(total)} MAD</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 12px;font-size:11px;font-family:Calibri,sans-serif">
            <span style="color:#5C5C50">TVA (20%)</span>
            <span style="font-weight:600;color:#1E3D0F">${fmt(total * 0.2)} MAD</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 12px;background:#1E3D0F;border-radius:8px;margin-top:4px">
            <span style="color:rgba(246,241,231,0.7);font-family:Calibri,sans-serif;font-weight:700">TOTAL TTC</span>
            <span style="font-weight:700;color:#F6F1E7;font-family:Georgia,serif;font-size:14px">${fmt(total * 1.2)} MAD</span>
          </div>
        </div>
      </div>

      <div class="grid3">
        <div class="cell"><div class="lbl">Mode paiement</div><div class="val">🔒 Escrow REVEX</div></div>
        <div class="cell"><div class="lbl">Délai livraison</div><div class="val">${deliveryType==='eco'?'48-96h':'24-48h'}</div></div>
        <div class="cell"><div class="lbl">Certification</div><div class="val">📜 Grade ${grade||'—'} certifié</div></div>
      </div>

      ${notes ? '<div class="accent-bar" style="border-color:#D97706;background:#FFFBEB"><strong>Notes acheteur :</strong> '+notes+'</div>' : ''}

      <div class="sig-grid">
        <div class="sig-box"><div class="role">Acheteur (Donneur d'ordre)</div><div class="sname">${buyerCompany||'—'}</div><div class="sig-line"></div><div class="sig-label">Signature & cachet</div></div>
        <div class="sig-box"><div class="role">Plateforme REVEX</div><div class="sname">Roamers Community SARL</div><div class="sig-line"></div><div class="sig-label">Validation commande</div></div>
        <div class="sig-box"><div class="role">Vendeur (Fournisseur)</div><div class="sname">${sellerCompany||'—'}</div><div class="sig-line"></div><div class="sig-label">Acceptation</div></div>
      </div>
    </div>
    <div class="doc-ftr">
      <div class="dft-t">${num} · REVEX · Bon de commande · ${orderNumber||'—'} · Conservation 5 ans</div>
      <div class="dft-l">REVEX</div>
    </div>
  </div>`;

  openDoc(wrapDoc(styles, body, num, 'Bon de Commande ' + num));
}
