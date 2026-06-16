import { EMISale, Collection } from '../types';

export function getBusinessIds(emiSales: EMISale[]) {
  const sorted = [...emiSales].sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime());
  const map = new Map<string, { saleId: string, receiptId: string }>();
  
  sorted.forEach((sale, i) => {
    const defaultId = (i + 1).toString().padStart(6, '0');
    map.set(sale.id, {
      saleId: sale.saleId || `ANG-EMI-${defaultId}`,
      receiptId: sale.receiptId || `ANG-RCP-${defaultId}`
    });
  });
  
  return map;
}

export function generateNextEmiIds(emiSales: EMISale[]) {
  let maxEmi = 0;
  let maxRcp = 0;

  emiSales.forEach((s) => {
    if (s.saleId) {
      const match = s.saleId.match(/ANG-EMI-(\d+)/);
      if (match) maxEmi = Math.max(maxEmi, parseInt(match[1], 10));
    }
    if (s.receiptId) {
      const match = s.receiptId.match(/ANG-RCP-(\d+)/);
      if (match) maxRcp = Math.max(maxRcp, parseInt(match[1], 10));
    }
  });

  // Calculate fallbacks (in case some old records exist without custom IDs)
  // Default to max existing number, or overall length + 1
  let nextEmiNum = Math.max(maxEmi, emiSales.length) + 1;
  let nextRcpNum = Math.max(maxRcp, emiSales.length) + 1;

  return {
    saleId: `ANG-EMI-${nextEmiNum.toString().padStart(6, '0')}`,
    receiptId: `ANG-RCP-${nextRcpNum.toString().padStart(6, '0')}`
  };
}

export function getCollectionReceiptId(col: Collection, collections: Collection[]) {
  // Try mapping col UUID to an index to generate receipt id
  const sorted = [...collections].sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
  const idx = sorted.findIndex(c => c.id === col.id);
  const defaultId = (idx >= 0 ? idx + 1 : collections.length + 1).toString().padStart(6, '0');
  return `ANG-PAY-${defaultId}`; // Different format for collection receipts
}
