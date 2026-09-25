import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProductionInput, Accessory } from '../types';

/**
 * Format BLK prefix for filename and header
 * Example: '1025' -> 'BLK-1025', 'BLK-1025' -> 'BLK-1025'
 */
export const formatBlkPrefix = (rawBlk?: string, inputs?: ProductionInput[]): string => {
  let blk = (rawBlk || '').trim();

  // If blk is generic or 'all', check if all inputs belong to a single BLK
  if ((!blk || blk === 'all' || blk === 'All BLK' || blk === 'All BLK / Styles' || blk.toLowerCase() === 'all') && inputs && inputs.length > 0) {
    const firstBlk = inputs[0].blkNumber?.trim();
    if (firstBlk && inputs.every((i) => (i.blkNumber?.trim() || '') === firstBlk)) {
      blk = firstBlk;
    }
  }

  if (!blk || blk.toLowerCase().includes('all')) {
    return 'BLK-ALL';
  }

  // Sanitize and ensure 'BLK-' prefix
  const cleanNumber = blk.replace(/^BLK[-_\s]*/i, '').replace(/[/\\?%*:|"<>]/g, '-').trim();
  return cleanNumber ? `BLK-${cleanNumber}` : 'BLK-ALL';
};

/**
 * Downloads a high-quality, professional Production & Cutting Report PDF
 */
export const downloadProductionReportPdf = ({
  title = 'TASS GARMENT PRODUCTION REPORT',
  inputs,
  sizeTotals = {},
  totalPieces = 0,
  dateRange = 'All Time',
  blkFilter = 'All BLK',
}: {
  title?: string;
  inputs: ProductionInput[];
  sizeTotals?: Record<string, number>;
  totalPieces?: number;
  dateRange?: string;
  blkFilter?: string;
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const blkTag = formatBlkPrefix(blkFilter, inputs);

  // 1. Header Banner (Deep Orange)
  doc.setFillColor(234, 88, 12); // Orange-600
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(`TASS GARMENT PRODUCTION - [${blkTag}]`, 14, 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 16);

  const printDateStr = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Generated: ${printDateStr}`, pageWidth - 14, 16, { align: 'right' });

  // 2. Summary & Scope Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 26, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Filter Scope:', 18, 33);
  doc.text('Total Production Qty:', pageWidth / 2 + 10, 33);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Style/BLK: ${blkTag}  |  Period: ${dateRange}`, 18, 41);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 88, 12);
  doc.setFontSize(12);
  doc.text(`${totalPieces.toLocaleString()} pcs (${inputs.length} entries)`, pageWidth / 2 + 10, 41);

  // 3. Size Breakdown Matrix Table
  let currentY = 52;
  const sizeEntries = Object.entries(sizeTotals);
  if (sizeEntries.length > 0) {
    const sizeHead = sizeEntries.map(([s]) => s);
    const sizeBody = [sizeEntries.map(([, q]) => `${q.toLocaleString()}`)];

    autoTable(doc, {
      startY: currentY,
      head: [sizeHead],
      body: sizeBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59], // Slate-800
        textColor: [251, 191, 36], // Amber-400
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 9,
        fontStyle: 'bold',
        textColor: [16, 185, 129], // Emerald-500
        halign: 'center',
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // 4. Detailed Inputs Table
  const tableRows = inputs.map((item, idx) => {
    const sizesStr = Object.entries(item.sizes || {})
      .map(([s, q]) => `${s}:${q}`)
      .join(', ');

    return [
      (idx + 1).toString(),
      item.date || '-',
      item.blkNumber ? formatBlkPrefix(item.blkNumber) : '-',
      item.buyerName || '-',
      item.color || '-',
      item.srNumber || '-',
      item.lineNo || '-',
      sizesStr || '-',
      `${(Number(item.totalQty) || 0).toLocaleString()}`,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Date', 'Style / BLK', 'Buyer', 'Color', 'SR NO', 'Line', 'Size Breakdown', 'Total Qty']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [234, 88, 12], // Orange-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 26, fontStyle: 'bold' },
      3: { cellWidth: 24 },
      4: { cellWidth: 20 },
      5: { cellWidth: 16 },
      6: { cellWidth: 14 },
      7: { cellWidth: 'auto' },
      8: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    foot: [
      ['', '', '', '', '', '', '', 'Grand Total:', `${totalPieces.toLocaleString()} pcs`],
    ],
    footStyles: {
      fillColor: [15, 23, 42],
      textColor: [251, 191, 36],
      fontStyle: 'bold',
      halign: 'right',
      fontSize: 9,
    },
  });

  // 5. Signatures at the bottom of the last page
  const finalY = (doc as any).lastAutoTable.finalY || 200;
  const signatureY = Math.min(finalY + 16, 270);

  if (signatureY < 275) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');

    const colWidth = (pageWidth - 28) / 3;
    doc.line(18, signatureY, 18 + colWidth - 10, signatureY);
    doc.text('Input Operator Signature', 18, signatureY + 4);

    doc.line(18 + colWidth, signatureY, 18 + colWidth * 2 - 10, signatureY);
    doc.text('Floor Supervisor Signature', 18 + colWidth, signatureY + 4);

    doc.line(18 + colWidth * 2, signatureY, 18 + colWidth * 3 - 10, signatureY);
    doc.text('Production Manager / Admin', 18 + colWidth * 2, signatureY + 4);
  }

  // Trigger Download with BLK - Name format
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${blkTag}_Production_Report_${dateStr}.pdf`;
  doc.save(filename);
};

/**
 * Downloads a Daily Production Delivery Challan PDF
 */
export const downloadChallanPdf = ({
  blkNo,
  buyerName = 'N/A',
  color = 'Mixed',
  items,
  totalPcs = 0,
}: {
  blkNo: string;
  buyerName?: string;
  color?: string;
  items: ProductionInput[];
  totalPcs: number;
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const blkTag = formatBlkPrefix(blkNo, items);

  // Top Deep Orange Banner
  doc.setFillColor(234, 88, 12);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TASS GARMENT PRODUCTION', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`DELIVERY CHALLAN & CUTTING REPORT - [${blkTag}]`, 14, 18);

  const printDateStr = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Date: ${printDateStr}`, pageWidth - 14, 18, { align: 'right' });

  // Metadata Card
  doc.setFillColor(254, 243, 199); // Amber-100
  doc.setDrawColor(245, 158, 11); // Amber-500
  doc.roundedRect(14, 28, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setTextColor(180, 83, 9); // Amber-700
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('STYLE / BLK NO:', 18, 35);
  doc.text('BUYER:', pageWidth / 2 - 20, 35);
  doc.text('COLOR:', pageWidth - 60, 35);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(blkTag, 18, 43);
  doc.text(buyerName || 'N/A', pageWidth / 2 - 20, 43);
  doc.text(color || 'N/A', pageWidth - 60, 43);

  // Table
  const tableRows = items.map((item, idx) => {
    const sizesStr = Object.entries(item.sizes || {})
      .map(([s, q]) => `${s}: ${q}`)
      .join(' | ');

    return [
      (idx + 1).toString(),
      item.date || '-',
      item.srNumber || 'SR-01',
      item.lineNo || 'Line-01',
      sizesStr || '-',
      `${(Number(item.totalQty) || 0).toLocaleString()} pcs`,
    ];
  });

  autoTable(doc, {
    startY: 56,
    head: [['#', 'Date', 'SR NO / Cutting No', 'Line / Bundle', 'Size Breakdown (Pcs)', 'Total Qty']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [234, 88, 12],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 32, fontStyle: 'bold' },
      3: { cellWidth: 26 },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    foot: [
      ['', '', '', '', 'Total Challan Quantity:', `${totalPcs.toLocaleString()} pcs`],
    ],
    footStyles: {
      fillColor: [15, 23, 42],
      textColor: [251, 191, 36],
      fontStyle: 'bold',
      halign: 'right',
      fontSize: 9,
    },
  });

  // Signatures
  const finalY = (doc as any).lastAutoTable.finalY || 160;
  const signatureY = Math.min(finalY + 20, 270);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');

  const colWidth = (pageWidth - 28) / 3;
  doc.line(18, signatureY, 18 + colWidth - 10, signatureY);
  doc.text('Prepared By (Operator)', 18, signatureY + 4);

  doc.line(18 + colWidth, signatureY, 18 + colWidth * 2 - 10, signatureY);
  doc.text('Checked By (Supervisor)', 18 + colWidth, signatureY + 4);

  doc.line(18 + colWidth * 2, signatureY, 18 + colWidth * 3 - 10, signatureY);
  doc.text('Authorized By (Manager)', 18 + colWidth * 2, signatureY + 4);

  // Trigger Download with BLK - Name format
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${blkTag}_Challan_${dateStr}.pdf`;
  doc.save(filename);
};

/**
 * Downloads Store Accessories Inventory PDF
 */
export const downloadAccessoriesReportPdf = ({
  accessories,
}: {
  accessories: Accessory[];
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(16, 185, 129); // Emerald-500
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TASS ACCESSORIES STORE REPORT', 14, 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Current Inventory & Stock Balance', 14, 16);

  const printDateStr = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Generated: ${printDateStr}`, pageWidth - 14, 16, { align: 'right' });

  const tableRows = accessories.map((acc, idx) => {
    const isLow = acc.currentStock <= acc.minAlertStock;
    return [
      (idx + 1).toString(),
      acc.code || '-',
      acc.name,
      acc.category,
      acc.spec || '-',
      `${acc.currentStock.toLocaleString()} ${acc.unit}`,
      isLow ? 'LOW STOCK' : 'AVAILABLE',
    ];
  });

  autoTable(doc, {
    startY: 28,
    head: [['#', 'Item Code', 'Item Name', 'Category', 'Specification', 'Current Stock', 'Status']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 40, fontStyle: 'bold' },
      3: { cellWidth: 25 },
      4: { cellWidth: 35 },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 24, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `TASS_Accessories_Store_Report_${dateStr}.pdf`;
  doc.save(filename);
};
