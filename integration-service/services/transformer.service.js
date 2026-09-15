/**
 * Transformer Service
 * Mengonversi struktur respons dari External Inventory System ke format
 * yang 100% kompatibel dengan Approval-Management-System (AMS),
 * khususnya TransactionTemplatePdfService.php dan DummyTransactionService.php.
 */

/**
 * Format tanggal ke format YYYY-MM-DD
 */
function formatDate(dateInput) {
  if (!dateInput) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toISOString().split('T')[0];
  } catch {
    return String(dateInput);
  }
}

/**
 * Format tanggal ke format d/m/Y H:i:s
 */
function formatPrintDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return new Date().toLocaleDateString('id-ID');
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Transform data Purchase Order dari External System ke standar AMS
 */
export function transformPurchaseOrder(po) {
  const orderDate = formatDate(po.order_date);
  const items = (po.items || []).map((item) => {
    const qty = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || 0);
    const lineAmount = Number(item.subtotal || (qty * unitPrice));
    return {
      delDate: orderDate,
      name: item.item_name || item.item_code || 'Barang Logistik',
      unit: (item.unit || 'Unit').toUpperCase(),
      qty: qty,
      price: unitPrice,
      amount: lineAmount,
    };
  });

  const subtotal = Number(po.subtotal || items.reduce((acc, it) => acc + it.amount, 0));
  const tax = Number(po.tax || 0);
  const total = Number(po.total || (subtotal + tax));
  const vendorName = po.vendor?.name || (typeof po.vendor === 'string' ? po.vendor : 'Vendor Terdaftar');
  const vendorPhone = po.vendor?.phone || '-';
  const companyName = po.company?.name || 'Head Office';
  const companyAddress = po.company?.address ? ` (${po.company.address})` : '';

  return {
    kode: po.po_number,
    nomor_dokumen: po.po_number,
    judul: po.description || `Purchase Order ${po.po_number} - ${vendorName}`,
    nominal: total,
    tanggal: orderDate,
    print_date: formatPrintDate(po.order_date),
    tipe: 'PO',
    ref_no: po.purchase_request?.pr_number || (typeof po.purchase_request === 'string' ? po.purchase_request : '-'),
    vendor: vendorName,
    phone: vendorPhone,
    deliver_to: `${companyName}${companyAddress}`,
    notes: po.description || 'Pengadaan material & inventaris via External Inventory System',
    deskripsi: po.description || `Purchase Order resmi ${po.po_number} diterbitkan untuk rekanan ${vendorName}.`,
    items: items,
    totals: {
      subtotal: subtotal,
      discount: 0,
      dppLainnya: Math.round(subtotal * 0.917),
      ppn: tax,
      transport: 0,
      total: total,
    },
    approvers: ['NNR', 'P.A.M.'],
    app_date: orderDate,
    source: 'external-inventory-system',
    status: po.status || 'issued',
    raw_id: po.id,
  };
}

/**
 * Transform data Purchase Request dari External System ke standar AMS
 */
export function transformPurchaseRequest(pr) {
  const requestDate = formatDate(pr.request_date);
  const items = (pr.items || []).map((item) => ({
    kode: item.item_code || 'BRG',
    nama: item.item_name || item.description || 'Barang Inventaris',
    satuan: item.unit || 'Unit',
    qty: Number(item.quantity || 0),
    keterangan: item.description || `Kebutuhan ${pr.department || 'Operasional'}`,
  }));

  // Hitung total estimasi jika ada harga item
  let nominal = Number(pr.total_estimated || 0);
  if (!nominal && pr.items) {
    nominal = pr.items.reduce((sum, it) => {
      const q = Number(it.quantity || 0);
      const p = Number(it.estimated_price || it.unit_price || 0);
      return sum + (q * p);
    }, 0);
  }

  const requester = pr.requester_name || 'Staff';
  const dept = pr.department || 'Divisi Terkait';
  const companyName = pr.company?.name || 'Head Office';

  return {
    kode: pr.pr_number,
    nomor_dokumen: pr.pr_number,
    judul: pr.description || `Purchase Request ${pr.pr_number} - ${dept}`,
    nominal: nominal,
    tanggal: requestDate,
    print_date: formatPrintDate(pr.request_date),
    tipe: 'PR',
    no_ref: pr.pr_number,
    gudang: dept,
    entity: companyName,
    del_date: requestDate,
    deskripsi: pr.description || `Permintaan pembelian (Purchase Request) diajukan oleh ${requester} dari departemen ${dept}.`,
    items: items,
    approver1: 'AGM',
    approver2: 'M.M',
    app_date: requestDate,
    source: 'external-inventory-system',
    status: pr.status || 'approved',
    raw_id: pr.id,
  };
}
