import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Printer, Smartphone, Gem } from 'lucide-react';
import { format } from 'date-fns';

export function DailyReport() {
  const { phones, emiSales, stockMovements, currentUser, customers } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [stockTypeFilter, setStockTypeFilter] = useState<'ALL' | 'NEW' | 'USED'>('ALL');

  const formatDate = (date: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB');
  };

  const formattedSelectedDate = formatDate(selectedDate);
  
  const getDailyStats = (type: 'NEW' | 'USED') => {
    const typePhones = phones.filter(p => (p.stockType || 'NEW') === type);
    const available = typePhones.filter(p => p.status === 'Available').length;
    const added = typePhones.filter(p => formatDate(p.purchaseDate) === formattedSelectedDate).length;
    
    const sold = emiSales.filter(s => formatDate(s.saleDate) === formattedSelectedDate && typePhones.some(ph => ph.id === s.phoneId)).length;
    
    const returned = stockMovements.filter(m => m.newStatus === 'Returned' && formatDate(m.changedAt) === formattedSelectedDate && typePhones.some(ph => ph.id === m.productId)).length;
    
    const damaged = stockMovements.filter(m => m.newStatus === 'Damaged' && formatDate(m.changedAt) === formattedSelectedDate && typePhones.some(ph => ph.id === m.productId)).length;

    let profit = 0;
    emiSales.filter(s => formatDate(s.saleDate) === formattedSelectedDate).forEach(s => {
       const p = typePhones.find(ph => ph.id === s.phoneId);
       if(p) {
         let currentProfit = p.sellingPrice - p.purchasePrice;
         if (type === 'USED' && p.repairCost) currentProfit -= p.repairCost;
         profit += currentProfit;
       }
    });

    return { available, added, sold, returned, damaged, profit };
  };

  const newStats = getDailyStats('NEW');
  const diamondStats = getDailyStats('USED');

  // Filtered List computations
  const filteredPhones = phones.filter(p => stockTypeFilter === 'ALL' || (p.stockType || 'NEW') === stockTypeFilter);

  const addedTodayList = filteredPhones.filter(p => formatDate(p.purchaseDate) === formattedSelectedDate);
  
  const soldTodayList = emiSales.filter(s => formatDate(s.saleDate) === formattedSelectedDate)
    .filter(s => {
       const p = phones.find(ph => ph.id === s.phoneId);
       return p && (stockTypeFilter === 'ALL' || (p.stockType || 'NEW') === stockTypeFilter);
    })
    .map(s => {
      const phone = phones.find(p => p.id === s.phoneId);
      const customer = customers.find(c => c.id === s.customerId);
      return {
         ...phone,
         customerName: customer?.fullName || '-',
         mobile: customer?.mobile || '-',
         saleDate: s.saleDate
      };
    });

  const returnedTodayList = stockMovements
    .filter(m => m.newStatus === 'Returned' && formatDate(m.changedAt) === formattedSelectedDate)
    .filter(m => {
       const p = phones.find(ph => ph.id === m.productId);
       return p && (stockTypeFilter === 'ALL' || (p.stockType || 'NEW') === stockTypeFilter);
    })
    .map(m => {
      const phone = phones.find(p => p.id === m.productId);
      return {
        ...phone,
        imei1: phone?.imei1 || m.imei1 || '-',
        returnDate: m.changedAt
      };
    });

  const damagedTodayList = stockMovements
    .filter(m => m.newStatus === 'Damaged' && formatDate(m.changedAt) === formattedSelectedDate)
    .filter(m => {
       const p = phones.find(ph => ph.id === m.productId);
       return p && (stockTypeFilter === 'ALL' || (p.stockType || 'NEW') === stockTypeFilter);
    })
    .map(m => {
      const phone = phones.find(p => p.id === m.productId);
      return {
        ...phone,
        imei1: phone?.imei1 || m.imei1 || '-',
        damageDate: m.changedAt
      };
    });

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the report.');
      return;
    }

    const reportDate = format(new Date(selectedDate), 'dd/MM/yyyy');
    const printUser = currentUser?.fullName || currentUser?.username || 'Admin';
    const currentPrintDate = new Date().toLocaleDateString('en-GB');
    const currentPrintTime = new Date().toLocaleTimeString('en-GB');

    const generateTableRows = (items: any[], type: 'added' | 'sold' | 'returned' | 'damaged') => {
       if(items.length === 0) return `<tr><td colspan="7" style="padding: 12px; color: #666;">কোনো তথ্য নেই</td></tr>`;
       return items.map(item => `
        <tr>
          <td>${item.brand || '-'}</td>
          <td>${item.model || '-'}</td>
          <td>${item.imei1 || '-'}</td>
          <td>${(item.stockType || 'NEW') === 'NEW' ? 'নতুন ফোন' : 'ডায়মন্ড ফোন'} ${(item.stockType || 'NEW') === 'USED' ? `(গ্রেড: ${item.conditionGrade || 'A'})` : ''}</td>
          ${type === 'added' ? `<td>${(item.stockType || 'NEW') === 'USED' ? 'Confidential' : `৳${Number(item.purchasePrice || 0).toLocaleString()}`}</td><td>${format(new Date(item.purchaseDate || new Date()), 'dd/MM/yyyy')}</td>` : ''}
          ${type === 'sold' ? `<td>${item.customerName} (${item.mobile})</td><td>${format(new Date(item.saleDate), 'dd/MM/yyyy')}</td>` : ''}
          ${type === 'returned' ? `<td>${(item.stockType || 'NEW') === 'USED' ? 'Confidential' : `৳${Number(item.sellingPrice || 0).toLocaleString()}`}</td><td>${format(new Date(item.returnDate), 'dd/MM/yyyy')}</td>` : ''}
          ${type === 'damaged' ? `<td>${(item.stockType || 'NEW') === 'USED' ? 'Confidential' : `৳${Number(item.purchasePrice || 0).toLocaleString()}`}</td><td>${format(new Date(item.damageDate), 'dd/MM/yyyy')}</td>` : ''}
        </tr>
      `).join('');
    };

    const currentPrintDateTime = format(new Date(), 'dd/MM/yyyy hh:mm a');

    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Report - উপকার</title>
          <style>
            @media print {
              @page { size: A4; margin: 15mm; }
              body { visibility: visible !important; display: block !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .report-container { min-height: 297mm; }
            }
            body { font-family: sans-serif; margin: 0; padding: 0; color: #000; }
            .report-container { min-height: 100vh; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; max-width: 1000px; margin: 0 auto; }
            .report-content { flex: 1; }
            .report-footer { margin-top: auto; page-break-inside: avoid; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; text-align: center; font-size: 13px; }
            th, td { border: 1px solid #333; padding: 6px; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .summary-box { border: 2px dashed #000; padding: 16px; margin-bottom: 20px; font-size: 14px; line-height: 1.6; }
            h1 { font-size: 32px; margin: 0 0 8px 0; color: #2563eb; text-align: center;}
            h2 { font-size: 20px; margin: 16px 0 8px 0; color: #1d4ed8; text-align: center;}
            h3 { font-size: 16px; margin: 24px 0 10px 0; text-align: left; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
            .report-header { text-align: center; margin-bottom: 20px; font-size: 16px; font-weight: bold; }
            .signature-area { display: flex; justify-content: space-between; padding: 0 40px; margin-top: 50px; }
            .signature-block { text-align: center; }
            .signature-line { width: 200px; border-top: 1px solid #000; margin-bottom: 5px; }
            .print-info { text-align: center; font-size: 12px; color: #666; border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; padding: 10px 0; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="report-content">
              <h1>উপকার</h1>
              <div class="report-header">
                ================================<br/><br/>
                দৈনিক স্টক ও কার্যক্রম রিপোর্ট<br/><br/>
                রিপোর্ট তারিখ: ${reportDate}<br/><br/>
                ================================
              </div>

              <div class="summary-box">
                 <div style="display: flex; justify-content: space-around;">
                   <div>
                      <strong>স্টক সারসংক্ষেপ:</strong><br/>
                      মোট স্টক: ${newStats.available + diamondStats.available}<br/>
                      নতুন ফোন স্টক: ${newStats.available}<br/>
                      ডায়মন্ড ফোন স্টক: ${diamondStats.available}<br/>
                   </div>
                   <div>
                      <strong>আজকের বিক্রয়:</strong><br/>
                      মোট বিক্রয়: ${newStats.sold + diamondStats.sold}<br/>
                      নতুন ফোন বিক্রয়: ${newStats.sold}<br/>
                      ডায়মন্ড ফোন বিক্রয়: ${diamondStats.sold}<br/>
                   </div>
                 </div>
              </div>

              <h3>আজ স্টকে যুক্ত হওয়া ফোনসমূহ</h3>
              <table>
                <thead><tr><th>ব্র্যান্ড</th><th>মডেল</th><th>IMEI</th><th>ফোনের ধরন</th><th>ক্রয়মূল্য</th><th>তারিখ</th></tr></thead>
                <tbody>${generateTableRows(addedTodayList, 'added')}</tbody>
              </table>

              <h3>আজকের বিক্রিত ফোনসমূহ</h3>
              <table>
                <thead><tr><th>ব্র্যান্ড</th><th>মডেল</th><th>IMEI</th><th>ফোনের ধরন</th><th>গ্রাহক</th><th>তারিখ</th></tr></thead>
                <tbody>${generateTableRows(soldTodayList, 'sold')}</tbody>
              </table>

              <h3>আজ রিটার্ন হওয়া ফোনসমূহ</h3>
              <table>
                <thead><tr><th>ব্র্যান্ড</th><th>মডেল</th><th>IMEI</th><th>ফোনের ধরন</th><th>বিক্রয়মূল্য (পূর্বের)</th><th>তারিখ</th></tr></thead>
                <tbody>${generateTableRows(returnedTodayList, 'returned')}</tbody>
              </table>

              <h3>আজ ড্যামেজ হওয়া ফোনসমূহ</h3>
              <table>
                <thead><tr><th>ব্র্যান্ড</th><th>মডেল</th><th>IMEI</th><th>ফোনের ধরন</th><th>ক্রয়মূল্য নষ্ট</th><th>তারিখ</th></tr></thead>
                <tbody>${generateTableRows(damagedTodayList, 'damaged')}</tbody>
              </table>
            </div>

            <div class="report-footer">
              <div class="signature-area">
                <div class="signature-block">
                  <div class="signature-line"></div>
                  <div style="font-weight: bold;">প্রস্তুতকারীর স্বাক্ষর</div>
                </div>
                <div class="signature-block">
                  <div class="signature-line"></div>
                  <div style="font-weight: bold;">অনুমোদনকারীর স্বাক্ষর</div>
                </div>
              </div>

              <div class="print-info">
                 প্রিন্ট করেছেন: ${printUser}<br/>
                 তারিখ: ${currentPrintDateTime}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.onload = () => { setTimeout(() => { printWindow.print(); }, 1000); };
  };

  const getPhoneTypeBadge = (stockType: string | undefined) => {
    if ((stockType || 'NEW') === 'NEW') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">New Phone</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200"><Gem className="w-3 h-3" /> Diamond Phone</span>;
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">ডেইলি স্টক ও কার্যক্রম রিপোর্ট</h2>
          <p className="text-muted-foreground">প্রতিদিনের ইনভেন্টরি মুভমেন্ট এবং সেলস রিপোর্ট</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <select 
            className="h-9 px-3 rounded-md border border-input bg-background"
            value={stockTypeFilter}
            onChange={(e) => setStockTypeFilter(e.target.value as any)}
          >
            <option value="ALL">All Phones</option>
            <option value="NEW">New Phones</option>
            <option value="USED">Diamond Phones</option>
          </select>
          <Input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Print Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="border rounded-md p-4 bg-white shadow-sm flex items-center justify-between">
           <div>
             <div className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Smartphone className="w-4 h-4"/> New Phone Stock</div>
             <div className="text-2xl font-bold text-green-600 mt-1">{newStats.available}</div>
           </div>
        </div>
        <div className="border rounded-md p-4 bg-purple-50 shadow-sm flex items-center justify-between border-purple-200">
           <div>
             <div className="text-sm font-medium text-purple-700 flex items-center gap-2"><Gem className="w-4 h-4"/> Diamond Phone Stock</div>
             <div className="text-2xl font-bold text-purple-600 mt-1">{diamondStats.available}</div>
           </div>
        </div>
        <div className="border rounded-md p-4 bg-white shadow-sm flex items-center justify-between">
           <div>
             <div className="text-sm font-medium text-muted-foreground">Today Added</div>
             <div className="text-2xl font-bold text-indigo-600 mt-1">{newStats.added + diamondStats.added}</div>
             <div className="text-xs text-muted-foreground mt-1">New: {newStats.added} | Diamond: {diamondStats.added}</div>
           </div>
        </div>
        <div className="border rounded-md p-4 bg-white shadow-sm flex items-center justify-between">
           <div>
             <div className="text-sm font-medium text-muted-foreground">Sold Today</div>
             <div className="text-2xl font-bold text-blue-600 mt-1">{newStats.sold + diamondStats.sold}</div>
             <div className="text-xs text-muted-foreground mt-1">New: {newStats.sold} | Diamond: {diamondStats.sold}</div>
           </div>
        </div>
        <div className="border rounded-md p-4 bg-white shadow-sm flex items-center justify-between">
           <div>
             <div className="text-sm font-medium text-muted-foreground">Returned Today</div>
             <div className="text-2xl font-bold text-orange-600 mt-1">{newStats.returned + diamondStats.returned}</div>
             <div className="text-xs text-muted-foreground mt-1">New: {newStats.returned} | Diamond: {diamondStats.returned}</div>
           </div>
        </div>
        <div className="border rounded-md p-4 bg-white shadow-sm flex items-center justify-between">
           <div>
             <div className="text-sm font-medium text-muted-foreground">Damaged Today</div>
             <div className="text-2xl font-bold text-red-600 mt-1">{newStats.damaged + diamondStats.damaged}</div>
             <div className="text-xs text-muted-foreground mt-1">New: {newStats.damaged} | Diamond: {diamondStats.damaged}</div>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
         <div className="p-4 border-b bg-muted/50">
           <h3 className="text-lg font-semibold">আজকের সকল কার্যক্রম</h3>
         </div>
         <div className="p-0">
         
         {/* Added Phones */}
         <div className="p-4 border-b">
           <h4 className="font-medium mb-3 text-indigo-700">আজ স্টকে যুক্ত হওয়া ফোনসমূহ</h4>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left border-collapse">
               <thead>
                 <tr className="bg-muted text-muted-foreground">
                   <th className="py-2 px-3 border-b">ব্র্যান্ড</th>
                   <th className="py-2 px-3 border-b">মডেল</th>
                   <th className="py-2 px-3 border-b">IMEI</th>
                   <th className="py-2 px-3 border-b">Phone Type</th>
                   <th className="py-2 px-3 border-b">Condition</th>
                   <th className="py-2 px-3 border-b">Buy Price</th>
                 </tr>
               </thead>
               <tbody>
                 {addedTodayList.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-muted-foreground border-b">No records</td></tr>}
                 {addedTodayList.map((p, i) => (
                   <tr key={i} className="hover:bg-muted/50">
                     <td className="py-2 px-3 border-b">{p.brand}</td>
                     <td className="py-2 px-3 border-b">{p.model}</td>
                     <td className="py-2 px-3 border-b text-xs font-mono">{p.imei1}</td>
                     <td className="py-2 px-3 border-b">{getPhoneTypeBadge(p.stockType)}</td>
                     <td className="py-2 px-3 border-b text-xs">{(p.stockType||'NEW') === 'USED' ? p.conditionGrade||'N/A' : '-'}</td>
                     <td className="py-2 px-3 border-b">৳{Number(p.purchasePrice).toLocaleString()}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>

         {/* Sold Phones */}
         <div className="p-4 border-b">
           <h4 className="font-medium mb-3 text-blue-700">আজকের বিক্রিত ফোনসমূহ</h4>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left border-collapse">
               <thead>
                 <tr className="bg-muted text-muted-foreground">
                   <th className="py-2 px-3 border-b">ব্র্যান্ড</th>
                   <th className="py-2 px-3 border-b">মডেল</th>
                   <th className="py-2 px-3 border-b">IMEI</th>
                   <th className="py-2 px-3 border-b">Phone Type</th>
                   <th className="py-2 px-3 border-b">গ্রাহক</th>
                 </tr>
               </thead>
               <tbody>
                 {soldTodayList.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground border-b">No records</td></tr>}
                 {soldTodayList.map((p: any, i) => (
                   <tr key={i} className="hover:bg-muted/50">
                     <td className="py-2 px-3 border-b">{p.brand}</td>
                     <td className="py-2 px-3 border-b">{p.model}</td>
                     <td className="py-2 px-3 border-b text-xs font-mono">{p.imei1}</td>
                     <td className="py-2 px-3 border-b">{getPhoneTypeBadge(p.stockType)}</td>
                     <td className="py-2 px-3 border-b">{p.customerName}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>

         {/* Returned Phones */}
         <div className="p-4 border-b">
           <h4 className="font-medium mb-3 text-orange-700">আজ রিটার্ন হওয়া ফোনসমূহ</h4>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left border-collapse">
               <thead>
                 <tr className="bg-muted text-muted-foreground">
                   <th className="py-2 px-3 border-b">ব্র্যান্ড</th>
                   <th className="py-2 px-3 border-b">মডেল</th>
                   <th className="py-2 px-3 border-b">IMEI</th>
                   <th className="py-2 px-3 border-b">Phone Type</th>
                 </tr>
               </thead>
               <tbody>
                 {returnedTodayList.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground border-b">No records</td></tr>}
                 {returnedTodayList.map((p: any, i) => (
                   <tr key={i} className="hover:bg-muted/50">
                     <td className="py-2 px-3 border-b">{p.brand}</td>
                     <td className="py-2 px-3 border-b">{p.model}</td>
                     <td className="py-2 px-3 border-b text-xs font-mono">{p.imei1}</td>
                     <td className="py-2 px-3 border-b">{getPhoneTypeBadge(p.stockType)}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>

         {/* Damaged Phones */}
         <div className="p-4">
           <h4 className="font-medium mb-3 text-red-700">আজ ড্যামেজ হওয়া ফোনসমূহ</h4>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left border-collapse">
               <thead>
                 <tr className="bg-muted text-muted-foreground">
                   <th className="py-2 px-3 border-b">ব্র্যান্ড</th>
                   <th className="py-2 px-3 border-b">মডেল</th>
                   <th className="py-2 px-3 border-b">IMEI</th>
                   <th className="py-2 px-3 border-b">Phone Type</th>
                 </tr>
               </thead>
               <tbody>
                 {damagedTodayList.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground border-b">No records</td></tr>}
                 {damagedTodayList.map((p: any, i) => (
                   <tr key={i} className="hover:bg-muted/50">
                     <td className="py-2 px-3 border-b">{p.brand}</td>
                     <td className="py-2 px-3 border-b">{p.model}</td>
                     <td className="py-2 px-3 border-b text-xs font-mono">{p.imei1}</td>
                     <td className="py-2 px-3 border-b">{getPhoneTypeBadge(p.stockType)}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>

         </div>
      </div>
      
      {/* 💎 আজকের Diamond Phone কার্যক্রম */}
      {(stockTypeFilter === 'ALL' || stockTypeFilter === 'USED') && (
      <div className="bg-purple-50 rounded-lg shadow-sm border border-purple-200 overflow-hidden">
         <div className="p-4 border-b border-purple-200 bg-purple-100/50">
           <h3 className="text-lg font-semibold text-purple-800 flex items-center gap-2"><Gem className="w-5 h-5"/> আজকের Diamond Phone কার্যক্রম</h3>
         </div>
         <div className="p-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-3 rounded shadow-sm border border-purple-100 text-center">
                 <div className="text-xs text-purple-600 font-medium">Added Today</div>
                 <div className="text-xl font-bold text-purple-900">{diamondStats.added}</div>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-purple-100 text-center">
                 <div className="text-xs text-purple-600 font-medium">Sold Today</div>
                 <div className="text-xl font-bold text-purple-900">{diamondStats.sold}</div>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-purple-100 text-center">
                 <div className="text-xs text-purple-600 font-medium">Returned Today</div>
                 <div className="text-xl font-bold text-purple-900">{diamondStats.returned}</div>
              </div>
              <div className="bg-white p-3 rounded shadow-sm border border-purple-100 text-center">
                 <div className="text-xs text-purple-600 font-medium">Damaged Today</div>
                 <div className="text-xl font-bold text-purple-900">{diamondStats.damaged}</div>
              </div>
            </div>

            <div className="overflow-x-auto bg-white rounded border border-purple-100">
             <table className="w-full text-sm text-left border-collapse">
               <thead>
                 <tr className="bg-purple-100/50 text-purple-800">
                   <th className="py-2 px-3 border-b border-purple-100">Brand</th>
                   <th className="py-2 px-3 border-b border-purple-100">Model</th>
                   <th className="py-2 px-3 border-b border-purple-100">IMEI</th>
                   <th className="py-2 px-3 border-b border-purple-100">Grade</th>
                   <th className="py-2 px-3 border-b border-purple-100">Buy Price</th>
                   <th className="py-2 px-3 border-b border-purple-100">Sell Price</th>
                   <th className="py-2 px-3 border-b border-purple-100">Status</th>
                 </tr>
               </thead>
               <tbody>
                 {[...addedTodayList, ...soldTodayList, ...returnedTodayList, ...damagedTodayList].filter(p => (p.stockType||'NEW') === 'USED').length === 0 && (
                   <tr><td colSpan={7} className="py-4 text-center text-purple-400 border-b border-purple-100">No Diamond Phone activity today</td></tr>
                 )}
                 {Array.from(new Set([...addedTodayList, ...soldTodayList, ...returnedTodayList, ...damagedTodayList].filter(p => (p.stockType||'NEW') === 'USED').map(p => p.id)))
                   .map(id => {
                     const p = phones.find(ph => ph.id === id);
                     if(!p) return null;
                     return (
                       <tr key={p.id} className="hover:bg-purple-50/50">
                         <td className="py-2 px-3 border-b border-purple-100">{p.brand}</td>
                         <td className="py-2 px-3 border-b border-purple-100">{p.model}</td>
                         <td className="py-2 px-3 border-b border-purple-100 text-xs font-mono">{p.imei1}</td>
                         <td className="py-2 px-3 border-b border-purple-100">{p.conditionGrade || 'A'}</td>
                         <td className="py-2 px-3 border-b border-purple-100">Confidential</td>
                         <td className="py-2 px-3 border-b border-purple-100 text-purple-700 font-medium">Confidential</td>
                         <td className="py-2 px-3 border-b border-purple-100">
                           <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">{p.status}</span>
                         </td>
                       </tr>
                     );
                   })}
               </tbody>
             </table>
            </div>
         </div>
      </div>
      )}

    </div>
  );
}
