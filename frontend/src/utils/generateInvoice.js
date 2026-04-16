// src/utils/generateInvoice.js
// Génère des factures professionnelles REVEX (PDF via impression)
// Supporte 2 types : 'order' (achat PDR) et 'storage' (stockage chez REVEX)

const TVA_RATE = 0.20; // 20% TVA Maroc

// ── Utilitaires ───────────────────────────────────────────────
function fmt(n) {
  return Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function invoiceNumber(prefix, id) {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const ref = (id || '').toString().replace(/-/g, '').substring(0, 6).toUpperCase();
  return prefix + '-' + yy + mm + '-' + ref;
}

function dateStr(d) {
  return new Date(d || Date.now()).toLocaleDateString('fr-MA', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
}

function dueDateStr() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toLocaleDateString('fr-MA', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ── Fonction principale ───────────────────────────────────────
export function generateInvoicePdf(data) {
  const { type } = data; // 'order' | 'storage'
  if (type === 'order') {
    _renderInvoice(_buildOrderInvoice(data));
  } else if (type === 'storage') {
    _renderInvoice(_buildStorageInvoice(data));
  } else if (type === 'inventory') {
    _renderInvoice(_buildInventoryInvoice(data));
  }
}

// ── Facture Achat PDR ─────────────────────────────────────────
function _buildOrderInvoice(data) {
  const {
    orderNumber, productTitle, reference, grade,
    quantity, unit, unitPrice, totalPrice, deliveryPrice, deliveryType,
    sellerCompany, sellerCity, sellerIce,
    buyerCompany, buyerCity, buyerIce,
    createdAt, issuedTo, // 'buyer' | 'seller'
  } = data;

  const ht        = Number(totalPrice || 0);
  const delivery  = Number(deliveryPrice || 0);
  const commission = Math.round(ht * 0.06 * 100) / 100; // 6% REVEX
  const baseHT    = issuedTo === 'seller' ? ht - commission : ht + delivery;
  const tva       = Math.round(baseHT * TVA_RATE * 100) / 100;
  const ttc       = Math.round((baseHT + tva) * 100) / 100;
  const facNum    = invoiceNumber('REVEX-FAC', orderNumber);

  const lines = issuedTo === 'seller'
    ? [
        { desc: productTitle, ref: reference, grade, qty: quantity, unit: unit || 'u.', pu: Number(unitPrice || 0), total: ht },
        { desc: 'Commission plateforme REVEX (6%)', ref: '—', grade: '—', qty: 1, unit: 'forfait', pu: -commission, total: -commission, isDeduction: true },
      ]
    : [
        { desc: productTitle, ref: reference, grade, qty: quantity, unit: unit || 'u.', pu: Number(unitPrice || 0), total: ht },
        { desc: deliveryType === 'eco' ? 'Livraison retour à vide REVEX' : 'Livraison urgente', ref: '—', grade: '—', qty: 1, unit: 'forfait', pu: delivery, total: delivery },
      ];

  return {
    facNum,
    title: issuedTo === 'seller' ? 'FACTURE VENDEUR' : 'FACTURE ACHETEUR',
    subtitle: 'Transaction PDR · Commande ' + orderNumber,
    emittedTo: issuedTo === 'seller'
      ? { label: 'Vendeur', name: sellerCompany, city: sellerCity, ice: sellerIce }
      : { label: 'Acheteur', name: buyerCompany, city: buyerCity, ice: buyerIce },
    emittedFrom: { name: 'Roamers Community SARL (REVEX)', city: 'Casablanca', ice: 'ICE REVEX', rc: 'RC REVEX' },
    date: dateStr(createdAt),
    dueDate: dueDateStr(),
    lines,
    baseHT, tva, ttc,
    notes: issuedTo === 'seller'
      ? 'Paiement libéré depuis l\'escrow REVEX après confirmation de réception par l\'acheteur.'
      : 'Paiement sécurisé par escrow REVEX. Pièce certifiée Grade ' + (grade || '—') + ' — traçabilité garantie.',
    badgeColor: '#1D4ED8',
  };
}

// ── Facture Stockage ──────────────────────────────────────────
function _buildStorageInvoice(data) {
  const {
    requestId, companyName, contactName, city,
    estimatedVol, storageType, month,
    wantPhotos, wantCertif, wantInventory, wantPicking,
    tarifBase, tarifPhotos, tarifCertif, tarifInventaire, tarifPicking,
    nbExpeditions,
  } = data;

  const TB   = Number(tarifBase || 15);
  const vol  = Number(estimatedVol || 1);
  const mois = month || new Date().toLocaleDateString('fr-MA', { month: 'long', year: 'numeric' });
  const facNum = invoiceNumber('REVEX-STOC', requestId);

  const lines = [
    {
      desc: 'Stockage PDR industriel — ' + mois,
      ref: storageType === 'court' ? 'Court terme' : storageType === 'long' ? 'Long terme' : 'Indéfini',
      qty: vol, unit: 'm³/mois',
      pu: TB,
      total: Math.round(vol * TB * 100) / 100,
    },
  ];

  if (wantPhotos)    lines.push({ desc: 'Photos professionnelles à l\'entrée', ref: 'service', qty: 1, unit: 'forfait', pu: Number(tarifPhotos || 150), total: Number(tarifPhotos || 150) });
  if (wantCertif)    lines.push({ desc: 'Certification qualité REVEX (A+ → D)', ref: 'service', qty: 1, unit: 'forfait', pu: Number(tarifCertif || 100), total: Number(tarifCertif || 100) });
  if (wantInventory) lines.push({ desc: 'Inventaire numérique & suivi dashboard', ref: 'service', qty: 1, unit: 'forfait', pu: Number(tarifInventaire || 200), total: Number(tarifInventaire || 200) });
  if (wantPicking && nbExpeditions > 0) {
    lines.push({
      desc: 'Préparation commandes & expéditions',
      ref: 'picking',
      qty: nbExpeditions || 1, unit: 'expédition',
      pu: Number(tarifPicking || 50),
      total: (nbExpeditions || 1) * Number(tarifPicking || 50),
    });
  }

  const baseHT = lines.reduce((s, l) => s + l.total, 0);
  const tva    = Math.round(baseHT * TVA_RATE * 100) / 100;
  const ttc    = Math.round((baseHT + tva) * 100) / 100;

  return {
    facNum,
    title: 'FACTURE STOCKAGE',
    subtitle: 'Services d\'entrepôt REVEX · ' + mois,
    emittedTo: { label: 'Client', name: companyName, city, ice: null, contact: contactName },
    emittedFrom: { name: 'Roamers Community SARL (REVEX)', city: 'Casablanca', ice: 'ICE REVEX', rc: 'RC REVEX' },
    date: dateStr(null),
    dueDate: dueDateStr(),
    lines,
    baseHT, tva, ttc,
    notes: 'Facturation mensuelle pour services de stockage industriel PDR. Commission de vente réduite à 3% sur toute transaction générée depuis l\'entrepôt REVEX durant cette période.',
    badgeColor: '#059669',
  };
}


// ── Facture Inventaire Physique ───────────────────────────────
function _buildInventoryInvoice(data) {
  const {
    requestId, companyName, contactName, city,
    inventoryType, nbReferences, nbStaff,
    scheduledDate, createdAt,
  } = data;

  const refs   = Number(nbReferences || 100);
  const staff  = Number(nbStaff || 2);
  const days   = refs <= 100 ? 1 : refs <= 500 ? 2 : refs <= 1500 ? 3 : Math.ceil(refs / 500);
  const base   = days * 800;
  const supStaff = Math.max(0, staff - 1) * 400 * days;
  const rapport  = 300;
  const certif   = 200;
  const baseHT   = base + supStaff + rapport + certif;
  const tva      = Math.round(baseHT * 0.20);
  const ttc      = baseHT + tva;

  const facNum = invoiceNumber('REVEX-INV', requestId);
  const mois   = scheduledDate
    ? new Date(scheduledDate).toLocaleDateString('fr-MA', { month:'long', year:'numeric' })
    : dateStr(createdAt);

  const lines = [
    { desc:'Inventaire physique PDR — '+days+' jour'+(days>1?'s':'')+' terrain', ref:'ops', qty:days, unit:'jour', pu:800, total:base },
    { desc:'Agents supplémentaires × '+(staff-1)+' pers. × '+days+'j', ref:'staff', qty:Math.max(0,staff-1)*days, unit:'agent/j', pu:400, total:supStaff },
    { desc:'Rapport numérique REVEX (base de données + export Excel)', ref:'rapport', qty:1, unit:'forfait', pu:rapport, total:rapport },
    { desc:'Certificat de conformité REVEX', ref:'certif', qty:1, unit:'forfait', pu:certif, total:certif },
  ].filter(l => l.total > 0);

  return {
    facNum,
    title: 'FACTURE INVENTAIRE',
    subtitle: 'Service Inventaire Physique PDR · ' + mois,
    emittedTo: { label:'Client', name:companyName, city, contact:contactName, ice:null },
    emittedFrom: { name:'Roamers Community SARL (REVEX)', city:'Casablanca', ice:'ICE REVEX', rc:'RC REVEX' },
    date: dateStr(null),
    dueDate: dueDateStr(),
    lines,
    baseHT, tva, ttc,
    notes: 'Service réalisé sur site client. Ce document fait foi pour la comptabilité. Le rapport numerique inventaire est transmis séparément. Conservation 5 ans (prescription commerciale).',
    badgeColor: '#8B5CF6',
  };
}

// ── Rendu HTML de la facture ──────────────────────────────────
function _renderInvoice(inv) {
  const linesHtml = inv.lines.map((l, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#F6F1E7'}">
      <td style="padding:8px 12px;font-size:11px;color:#1E3D0F;border-bottom:1px solid #EDE6D3">
        <strong>${l.desc}</strong>
        ${l.ref && l.ref !== '—' ? '<br/><span style="font-size:9px;color:#8C8C7A;font-family:Consolas,monospace">Réf : ' + l.ref + '</span>' : ''}
        ${l.grade && l.grade !== '—' ? '<br/><span style="font-size:9px;color:#2563EB;font-weight:700">Grade ' + l.grade + '</span>' : ''}
      </td>
      <td style="padding:8px 12px;font-size:11px;color:#5C5C50;text-align:center;border-bottom:1px solid #EDE6D3">${l.qty}</td>
      <td style="padding:8px 12px;font-size:11px;color:#5C5C50;text-align:center;border-bottom:1px solid #EDE6D3">${l.unit}</td>
      <td style="padding:8px 12px;font-size:11px;color:#1E3D0F;text-align:right;border-bottom:1px solid #EDE6D3;white-space:nowrap">${fmt(l.pu)} MAD</td>
      <td style="padding:8px 12px;font-size:12px;font-weight:700;color:${l.isDeduction ? '#DC2626' : '#1E3D0F'};text-align:right;border-bottom:1px solid #EDE6D3;white-space:nowrap">${l.isDeduction ? '−' : ''}${fmt(Math.abs(l.total))} MAD</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"/>
<title>Facture ${inv.facNum}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Georgia,serif;background:#f0ece3;padding:28px;display:flex;flex-direction:column;align-items:center}
.doc{background:#fff;width:210mm;max-width:780px;border-radius:8px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.15)}
.hdr{background:linear-gradient(135deg,#1E3D0F 0%,#2D5A1B 60%,#1E3D0F 100%);padding:28px 36px 22px;position:relative;overflow:hidden}
.hdr::after{content:'';position:absolute;top:-30px;right:-30px;width:140px;height:140px;border-radius:50%;border:1.5px solid rgba(126,168,106,0.15)}
.hdr::before{content:'';position:absolute;bottom:-20px;left:60px;width:90px;height:90px;border-radius:50%;background:rgba(74,124,47,0.07)}
.logo-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
.logo{font-size:32px;font-weight:700;color:#F6F1E7;letter-spacing:3px}
.fac-badge{background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:8px 14px;text-align:right}
.fac-label{font-size:9px;color:rgba(246,241,231,0.5);text-transform:uppercase;letter-spacing:1.5px;font-family:Calibri,sans-serif;margin-bottom:3px}
.fac-num{font-family:Consolas,monospace;font-size:14px;font-weight:700;color:#F6F1E7;letter-spacing:2px}
.hdr h1{font-size:22px;color:#F6F1E7;font-weight:700;margin-bottom:3px}
.hdr p{font-size:11px;color:rgba(246,241,231,0.5);font-family:Calibri,sans-serif}
.body{padding:28px 36px}
/* Parties */
.parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
.party{border:1px solid #D9CEBC;border-radius:10px;padding:14px 16px}
.party-role{font-size:9px;color:#8C8C7A;text-transform:uppercase;letter-spacing:0.8px;font-family:Calibri,sans-serif;margin-bottom:6px;display:flex;align-items:center;gap:5px}
.party-name{font-size:15px;font-weight:700;color:#1E3D0F;margin-bottom:3px}
.party-info{font-size:10px;color:#5C5C50;font-family:Calibri,sans-serif;line-height:1.7}
/* Dates */
.dates-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:24px}
.date-cell{background:#F6F1E7;border-radius:8px;padding:10px 12px;border:1px solid #EDE6D3}
.date-lbl{font-size:8px;color:#8C8C7A;text-transform:uppercase;letter-spacing:0.8px;font-family:Calibri,sans-serif;margin-bottom:3px}
.date-val{font-size:12px;font-weight:600;color:#1E3D0F}
/* Table */
.table-wrap{border:1px solid #D9CEBC;border-radius:10px;overflow:hidden;margin-bottom:20px}
.th{background:#1E3D0F;color:#F6F1E7;padding:8px 12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Calibri,sans-serif}
/* Totaux */
.totaux{display:flex;justify-content:flex-end;margin-bottom:24px}
.totaux-box{width:280px}
.tot-row{display:flex;justify-content:space-between;padding:6px 12px;font-size:11px;font-family:Calibri,sans-serif}
.tot-label{color:#5C5C50}
.tot-value{color:#1E3D0F;font-weight:600}
.tot-ttc{background:#1E3D0F;border-radius:8px;margin-top:4px}
.tot-ttc .tot-label{color:rgba(246,241,231,0.7)}
.tot-ttc .tot-value{color:#F6F1E7;font-size:14px;font-family:Georgia,serif;font-weight:700}
/* Notes */
.notes{background:#F6F1E7;border-radius:10px;padding:12px 16px;margin-bottom:20px;border-left:3px solid #1E3D0F}
.notes-lbl{font-size:9px;color:#8C8C7A;text-transform:uppercase;letter-spacing:0.8px;font-family:Calibri,sans-serif;margin-bottom:4px}
.notes-txt{font-size:10px;color:#5C5C50;font-family:Calibri,sans-serif;line-height:1.7}
/* Pied */
.footer-info{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
.fi{border:1px solid #EDE6D3;border-radius:8px;padding:9px 12px;text-align:center}
.fi-icon{font-size:16px;margin-bottom:4px}
.fi-txt{font-size:9px;color:#5C5C50;font-family:Calibri,sans-serif;line-height:1.5}
/* Footer doc */
.doc-ftr{background:#1E3D0F;padding:10px 36px;display:flex;justify-content:space-between;align-items:center}
.dft-t{font-size:9px;color:rgba(246,241,231,0.5);font-family:Calibri,sans-serif}
.dft-l{font-size:13px;font-weight:700;color:rgba(246,241,231,0.8);letter-spacing:3px}
.print-btn{margin-top:16px;padding:10px 28px;background:#1E3D0F;color:#F6F1E7;border:none;border-radius:100px;font-size:12px;font-weight:600;cursor:pointer;font-family:Calibri,sans-serif;transition:background 0.2s}
.print-btn:hover{background:#2D5A1B}
@media print{body{background:#fff;padding:0}.doc{box-shadow:none;border-radius:0}.print-btn{display:none}}
</style></head>
<body>
<div class="doc">

  <!-- Header -->
  <div class="hdr">
    <div class="logo-row">
      <div>
        <div class="logo">REVEX</div>
        <h1>${inv.title}</h1>
        <p>${inv.subtitle}</p>
      </div>
      <div class="fac-badge">
        <div class="fac-label">Numéro de facture</div>
        <div class="fac-num">${inv.facNum}</div>
      </div>
    </div>
  </div>

  <div class="body">

    <!-- Parties -->
    <div class="parties">
      <div class="party">
        <div class="party-role">📤 Émetteur</div>
        <div class="party-name">${inv.emittedFrom.name}</div>
        <div class="party-info">
          📍 ${inv.emittedFrom.city}<br/>
          🌐 revex.ma · contact@revex.ma<br/>
          Roamers Community SARL
        </div>
      </div>
      <div class="party">
        <div class="party-role">${inv.emittedTo.label === 'Acheteur' ? '🛒' : inv.emittedTo.label === 'Vendeur' ? '🏭' : '🏢'} ${inv.emittedTo.label}</div>
        <div class="party-name">${inv.emittedTo.name || '—'}</div>
        <div class="party-info">
          📍 ${inv.emittedTo.city || '—'}<br/>
          ${inv.emittedTo.ice ? 'ICE : ' + inv.emittedTo.ice + '<br/>' : ''}
          ${inv.emittedTo.contact ? '👤 ' + inv.emittedTo.contact : ''}
        </div>
      </div>
    </div>

    <!-- Dates -->
    <div class="dates-row">
      <div class="date-cell">
        <div class="date-lbl">📅 Date d'émission</div>
        <div class="date-val">${inv.date}</div>
      </div>
      <div class="date-cell">
        <div class="date-lbl">⏳ Échéance</div>
        <div class="date-val">${inv.dueDate}</div>
      </div>
      <div class="date-cell">
        <div class="date-lbl">🔒 Mode paiement</div>
        <div class="date-val">Virement / Escrow MAD</div>
      </div>
    </div>

    <!-- Tableau des lignes -->
    <div class="table-wrap">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th class="th" style="text-align:left;width:45%">Désignation</th>
            <th class="th" style="text-align:center;width:8%">Qté</th>
            <th class="th" style="text-align:center;width:10%">Unité</th>
            <th class="th" style="text-align:right;width:15%">P.U HT</th>
            <th class="th" style="text-align:right;width:15%">Total HT</th>
          </tr>
        </thead>
        <tbody>${linesHtml}</tbody>
      </table>
    </div>

    <!-- Totaux -->
    <div class="totaux">
      <div class="totaux-box">
        <div class="tot-row">
          <span class="tot-label">Sous-total HT</span>
          <span class="tot-value">${fmt(inv.baseHT)} MAD</span>
        </div>
        <div class="tot-row">
          <span class="tot-label">TVA (20%)</span>
          <span class="tot-value">${fmt(inv.tva)} MAD</span>
        </div>
        <div class="tot-row tot-ttc">
          <span class="tot-label" style="font-weight:700">TOTAL TTC</span>
          <span class="tot-value">${fmt(inv.ttc)} MAD</span>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div class="notes">
      <div class="notes-lbl">ℹ️ Conditions & informations</div>
      <div class="notes-txt">${inv.notes}</div>
    </div>

    <!-- Garanties footer -->
    <div class="footer-info">
      <div class="fi"><div class="fi-icon">🔒</div><div class="fi-txt">Paiement escrow sécurisé en MAD via plateforme REVEX</div></div>
      <div class="fi"><div class="fi-icon">📜</div><div class="fi-txt">Facture légalement opposable — Conservation obligatoire 5 ans</div></div>
      <div class="fi"><div class="fi-icon">⚖️</div><div class="fi-txt">Litige : support@revex.ma · Arbitrage sous 72h ouvrables</div></div>
    </div>

  </div>

  <div class="doc-ftr">
    <div class="dft-t">Facture ${inv.facNum} · REVEX · revex.ma · RC : Casablanca · Maroc</div>
    <div class="dft-l">REVEX</div>
  </div>
</div>

<button class="print-btn" onclick="window.print()">🖨️ Imprimer / Sauvegarder en PDF</button>
</body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); };
  }
}
