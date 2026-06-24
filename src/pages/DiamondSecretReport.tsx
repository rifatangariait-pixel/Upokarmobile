import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Lock, Printer, Download, Search, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

import { ErrorBoundary } from '../components/ErrorBoundary';

function DiamondSecretReportContent() {
  const { phones, currentUser, addAuditLog, isLoading } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [modelFilter, setModelFilter] = useState<string>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (isAdmin) {
      addAuditLog?.('Viewed Diamond Secret Report');
    }
  }, [isAdmin, addAuditLog]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
        <p className="text-muted-foreground text-lg">তথ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
        <AlertTriangle className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-muted-foreground">আপনার এই রিপোর্ট দেখার অনুমতি নেই</p>
      </div>
    );
  }

  // Filter used (Diamond) phones
  const diamondPhones = phones?.filter(p => (p.stockType || 'NEW') === 'USED') || [];

  // Compute calculated data
  const reportData = diamondPhones.map(phone => {
    const buyingPrice = Number(phone.purchasePrice || 0);
    const officeSellingPrice = Number(phone.sellingPrice || 0);
    const customerSellingPrice = Number(phone.customerSellingPrice || 0);
    const repairCost = Number(phone.repairCost || 0);

    const officeProfit = officeSellingPrice - buyingPrice;
    const customerProfit = customerSellingPrice - officeSellingPrice;
    const totalProfit = customerSellingPrice - buyingPrice - repairCost;

    return {
       phoneId: phone.id,
       brand: phone.brand,
       model: phone.model,
       imei: phone.imei1,
       purchaseDate: phone.purchaseDate,
       buyingPrice,
       officeSellingPrice,
       customerSellingPrice,
       repairCost,
       officeProfit,
       customerProfit,
       totalProfit,
       conditionGrade: phone.conditionGrade || 'N/A',
       status: phone.status,
    };
  });

  // Apply Filters
  let filteredData = reportData;

  if (statusFilter !== 'ALL') {
    filteredData = filteredData.filter(d => d.status === statusFilter);
  }
  if (brandFilter !== 'ALL') {
    filteredData = filteredData.filter(d => d.brand === brandFilter);
  }
  if (modelFilter !== 'ALL') {
    filteredData = filteredData.filter(d => d.model === modelFilter);
  }
  if (gradeFilter !== 'ALL') {
    filteredData = filteredData.filter(d => d.conditionGrade === gradeFilter);
  }

  if (dateFrom) {
    filteredData = filteredData.filter(d => d.purchaseDate >= dateFrom);
  }
  if (dateTo) {
    filteredData = filteredData.filter(d => d.purchaseDate <= dateTo);
  }

  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    filteredData = filteredData.filter(d => 
      (d.brand || '').toLowerCase().includes(q) || 
      (d.model || '').toLowerCase().includes(q) || 
      (d.imei || '').toLowerCase().includes(q) ||
      (d.conditionGrade || '').toLowerCase().includes(q)
    );
  }

  // Summaries
  const totalDiamondStock = filteredData.length;
  const totalAvailable = filteredData.filter(d => d.status === 'Available').length;
  const totalSold = filteredData.filter(d => d.status === 'Sold').length;

  const totalBuyingAmount = filteredData.reduce((sum, d) => sum + d.buyingPrice, 0);
  // As per common sense, if taking total office sale across all (even expected)
  const totalOfficeSaleAmount = filteredData.reduce((sum, d) => sum + d.officeSellingPrice, 0);
  const totalCustomerSaleAmount = filteredData.reduce((sum, d) => sum + d.customerSellingPrice, 0);
  
  const totalOverallProfit = filteredData.reduce((sum, d) => sum + d.totalProfit, 0);
  const averageProfitPerPhone = filteredData.length > 0 ? (totalOverallProfit / filteredData.length) : 0;

  const uniqueBrands = Array.from(new Set(reportData.map(d => d.brand))).filter(Boolean);
  const uniqueModels = Array.from(new Set(reportData.map(d => d.model))).filter(Boolean);
  const uniqueGrades = Array.from(new Set(reportData.map(d => d.conditionGrade))).filter(Boolean);

  const handleClearFilters = () => {
    setSearchTerm(''); setStatusFilter('ALL'); setBrandFilter('ALL'); setModelFilter('ALL'); setGradeFilter('ALL'); setDateFrom(''); setDateTo('');
  };

  const hasFilters = searchTerm || statusFilter !== 'ALL' || brandFilter !== 'ALL' || modelFilter !== 'ALL' || gradeFilter !== 'ALL' || dateFrom || dateTo;
  let maxProfitPhone = null;
  let minProfitPhone = null;
  
  if (filteredData.length > 0) {
    const sortedByProfit = [...filteredData].sort((a, b) => b.totalProfit - a.totalProfit);
    maxProfitPhone = sortedByProfit[0];
    minProfitPhone = sortedByProfit[sortedByProfit.length - 1];
  }

  const brandSales: Record<string, number> = {};
  const brandProfits: Record<string, number> = {};
  
  filteredData.forEach(d => {
    if (d.status === 'Sold') {
      brandSales[d.brand] = (brandSales[d.brand] || 0) + 1;
    }
    brandProfits[d.brand] = (brandProfits[d.brand] || 0) + d.totalProfit;
  });

  const bestSellingBrandEntry = Object.entries(brandSales).sort((a, b) => b[1] - a[1])[0];
  const mostProfitableBrandEntry = Object.entries(brandProfits).sort((a, b) => b[1] - a[1])[0];
  
  const bestSellingBrand = bestSellingBrandEntry ? bestSellingBrandEntry[0] : 'N/A';
  const mostProfitableBrand = mostProfitableBrandEntry ? mostProfitableBrandEntry[0] : 'N/A';

  const handleExportExcel = () => {
    const exportData = filteredData.map(d => ({
      Brand: d.brand,
      Model: d.model,
      IMEI: d.imei,
      'Date': safeFormatDate(d.purchaseDate),
      'Buying Price': d.buyingPrice,
      'Office Selling Price': d.officeSellingPrice,
      'Customer Selling Price': d.customerSellingPrice,
      'Repair Cost': d.repairCost,
      'Office Profit': d.officeProfit,
      'Customer Profit': d.customerProfit,
      'Total Profit': d.totalProfit,
      'Condition Grade': d.conditionGrade,
      Status: d.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Diamond Secret Report");
    XLSX.writeFile(wb, "Diamond_Secret_Report.xlsx");
    toast.success("Excel exported successfully");
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print the report.');
      return;
    }

    const printUser = currentUser?.fullName || currentUser?.username || 'Admin';
    const currentPrintDateTime = format(new Date(), 'dd/MM/yyyy hh:mm a');

    const generateRows = () => filteredData.map(d => `
      <tr>
        <td>${d.brand}</td>
        <td>${d.model}</td>
        <td style="font-family: monospace;">${d.imei}</td>
        <td style="color: #991b1b;">৳${d.buyingPrice.toLocaleString()}</td>
        <td style="color: #854d0e;">৳${d.officeSellingPrice.toLocaleString()}</td>
        <td style="color: #166534;">৳${d.customerSellingPrice.toLocaleString()}</td>
        <td style="color: #eab308;">৳${d.repairCost.toLocaleString()}</td>
        <td>৳${d.officeProfit.toLocaleString()}</td>
        <td>৳${d.customerProfit.toLocaleString()}</td>
        <td style="font-weight: bold; color: ${d.totalProfit > 0 ? '#166534' : 'inherit'}">৳${d.totalProfit.toLocaleString()}</td>
        <td>${d.conditionGrade}</td>
        <td>${d.status}</td>
        <td>${safeFormatDate(d.purchaseDate)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Diamond Secret Report</title>
          <style>
            @page { size: A4 landscape; margin: 15mm; }
            body { font-family: sans-serif; margin: 0; padding: 0; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .report-container { width: 100%; max-width: 297mm; min-height: 100vh; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; margin: 0 auto; position: relative;}
            .report-content { flex: 1; }
            .report-footer { margin-top: auto; page-break-inside: avoid; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; text-align: center; }
            th, td { border: 1px solid #666; padding: 6px; }
            th { background-color: #7f1d1d; color: #fff; font-weight: bold; text-align: center; font-size: 11px; }
            
            .header-box { text-align: center; margin-bottom: 20px; font-size: 16px; font-weight: bold; }
            .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; color: rgba(220, 38, 38, 0.05); z-index: -1; pointer-events: none; font-weight: bold; text-align: center; line-height: 1.2; }
            
            .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
            .summary-card { border: 1px solid #7f1d1d; background-color: #fef2f2; padding: 10px; text-align: center; border-radius: 4px; }
            .summary-title { font-size: 11px; color: #7f1d1d; font-weight: bold; margin-bottom: 5px; }
            .summary-val { font-size: 16px; font-weight: bold; color: #991b1b; }

            .analytics-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 20px; border-top: 1px dashed #7f1d1d; padding-top: 15px;}
            .analytics-item { font-size: 11px; text-align: center; }
            .analytics-item span { display: block; font-weight: bold; font-size: 13px; color: #991b1b; margin-top: 4px; }

            .print-info { text-align: center; font-size: 12px; color: #666; border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; padding: 10px 0; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="watermark">CONFIDENTIAL<br/>ADMIN ONLY</div>
          <div class="report-container">
            <div class="report-content">
              <div class="header-box">
                ================================<br/><br/>
                ডায়মন্ড ফোন গোপন রিপোর্ট<br/><br/>
                শুধুমাত্র প্রশাসনিক ব্যবহারের জন্য<br/><br/>
                CONFIDENTIAL<br/><br/>
                ================================
              </div>

              <div class="summary-grid">
                <div class="summary-card"><div class="summary-title">মোট ডায়মন্ড ফোন (স্টক)</div><div class="summary-val">${totalDiamondStock || '০'}</div></div>
                <div class="summary-card"><div class="summary-title">মোট স্টকে আছে</div><div class="summary-val">${totalAvailable || '০'}</div></div>
                <div class="summary-card"><div class="summary-title">মোট বিক্রিত</div><div class="summary-val">${totalSold || '০'}</div></div>
                <div class="summary-card"><div class="summary-title">মোট ক্রয়মূল্য</div><div class="summary-val">৳${(totalBuyingAmount || 0).toLocaleString()}</div></div>
                <div class="summary-card"><div class="summary-title">মোট অফিস বিক্রয়</div><div class="summary-val">৳${(totalOfficeSaleAmount || 0).toLocaleString()}</div></div>
                <div class="summary-card"><div class="summary-title">মোট গ্রাহক বিক্রয়</div><div class="summary-val">৳${(totalCustomerSaleAmount || 0).toLocaleString()}</div></div>
                <div class="summary-card"><div class="summary-title">মোট লাভ</div><div class="summary-val">৳${(totalOverallProfit || 0).toLocaleString()}</div></div>
                <div class="summary-card"><div class="summary-title">গড় লাভ প্রতি ফোন</div><div class="summary-val">৳${Math.round(averageProfitPerPhone || 0).toLocaleString()}</div></div>
              </div>

              <div class="analytics-grid">
                 <div class="analytics-item">সবচেয়ে বেশি লাভের ফোন:<span>${maxProfitPhone ? maxProfitPhone.brand + ' ' + maxProfitPhone.model : 'N/A'}</span></div>
                 <div class="analytics-item">সবচেয়ে কম লাভের ফোন:<span>${minProfitPhone ? minProfitPhone.brand + ' ' + minProfitPhone.model : 'N/A'}</span></div>
                 <div class="analytics-item">সবচেয়ে বেশি বিক্রিত ব্র্যান্ড:<span>${bestSellingBrand || 'N/A'}</span></div>
                 <div class="analytics-item">সবচেয়ে লাভজনক ব্র্যান্ড:<span>${mostProfitableBrand || 'N/A'}</span></div>
                 <div class="analytics-item">গড় লাভ:<span>৳${Math.round(averageProfitPerPhone || 0).toLocaleString()}</span></div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Model</th>
                    <th>IMEI</th>
                    <th>Buying Price</th>
                    <th>Office Sale</th>
                    <th>Customer Sale</th>
                    <th>Repair Cost</th>
                    <th>Office Profit</th>
                    <th>Customer Profit</th>
                    <th>Total Profit</th>
                    <th>Grade</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredData.length === 0 ? '<tr><td colspan="13" style="padding: 20px;">কোনো তথ্য পাওয়া যায়নি</td></tr>' : generateRows()}
                </tbody>
              </table>
            </div>

            <div class="report-footer">
              <div class="print-info">
                 প্রিন্ট করেছেন: ${printUser || 'System Admin'}<br/>
                 তারিখ: ${currentPrintDateTime || 'N/A'}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { setTimeout(() => { printWindow.print(); }, 1000); };
  };

  const handleExportPdf = () => {
    toast.info("For best layout, use Print Report -> Save as PDF.");
    handlePrint();
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-5 overflow-hidden">
         <div className="text-[150px] font-bold text-red-600 rotate-[-30deg] uppercase leading-none text-center">
            CONFIDENTIAL<br/><span className="text-[80px]">ADMIN ONLY</span>
         </div>
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-red-200 pb-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-red-800 flex items-center gap-3">
            <Lock className="w-8 h-8 text-red-600" />
            Diamond Secret Report
          </h2>
          <p className="text-red-600 font-medium mt-1">⚠ শুধুমাত্র প্রশাসনিক ব্যবহারের জন্য - Confidential</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 border-red-200 text-red-700 hover:bg-red-50" onClick={handleExportExcel}>
            <Download className="w-4 h-4" /> Excel Export
          </Button>
          <Button variant="outline" className="gap-2 border-red-200 text-red-700 hover:bg-red-50" onClick={handleExportPdf}>
            <Download className="w-4 h-4" /> PDF Export
          </Button>
          <Button className="gap-2 bg-red-700 hover:bg-red-800 text-white" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Print Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="relative z-10 grid gap-4 grid-cols-2 md:grid-cols-4 mb-2">
        <Card className="bg-red-50 border-red-200 shadow-sm">
          <CardHeader className="p-3 pb-0"><CardTitle className="text-[11px] uppercase text-red-800 font-bold">মোট ডায়মন্ড ফোন</CardTitle></CardHeader>
          <CardContent className="p-3 pt-1"><div className="text-2xl font-bold text-red-900">{totalDiamondStock}</div></CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200 shadow-sm">
          <CardHeader className="p-3 pb-0"><CardTitle className="text-[11px] uppercase text-red-800 font-bold">মোট স্টকে আছে</CardTitle></CardHeader>
          <CardContent className="p-3 pt-1"><div className="text-2xl font-bold text-red-900">{totalAvailable}</div></CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200 shadow-sm">
          <CardHeader className="p-3 pb-0"><CardTitle className="text-[11px] uppercase text-red-800 font-bold">মোট বিক্রিত</CardTitle></CardHeader>
          <CardContent className="p-3 pt-1"><div className="text-2xl font-bold text-red-900">{totalSold}</div></CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200 shadow-sm">
          <CardHeader className="p-3 pb-0"><CardTitle className="text-[11px] uppercase text-red-800 font-bold">মোট ক্রয়মূল্য</CardTitle></CardHeader>
          <CardContent className="p-3 pt-1"><div className="text-2xl font-bold text-red-900">৳{totalBuyingAmount.toLocaleString()}</div></CardContent>
        </Card>
        
        <Card className="bg-orange-50 border-orange-200 shadow-sm">
          <CardHeader className="p-3 pb-0"><CardTitle className="text-[11px] uppercase text-orange-800 font-bold">মোট অফিস বিক্রয়</CardTitle></CardHeader>
          <CardContent className="p-3 pt-1"><div className="text-2xl font-bold text-orange-900">৳{totalOfficeSaleAmount.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200 shadow-sm">
          <CardHeader className="p-3 pb-0"><CardTitle className="text-[11px] uppercase text-green-800 font-bold">মোট গ্রাহক বিক্রয়</CardTitle></CardHeader>
          <CardContent className="p-3 pt-1"><div className="text-2xl font-bold text-green-900">৳{totalCustomerSaleAmount.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200 shadow-sm">
          <CardHeader className="p-3 pb-0"><CardTitle className="text-[11px] uppercase text-emerald-800 font-bold">মোট লাভ</CardTitle></CardHeader>
          <CardContent className="p-3 pt-1"><div className="text-2xl font-bold text-emerald-900">৳{totalOverallProfit.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200 shadow-sm">
          <CardHeader className="p-3 pb-0"><CardTitle className="text-[11px] uppercase text-blue-800 font-bold">গড় লাভ প্রতি ফোন</CardTitle></CardHeader>
          <CardContent className="p-3 pt-1"><div className="text-2xl font-bold text-blue-900">৳{Math.round(averageProfitPerPhone).toLocaleString()}</div></CardContent>
        </Card>
      </div>

      {/* Analytics Section */}
      <div className="relative z-10 grid gap-4 grid-cols-2 md:grid-cols-5 mb-6 bg-red-900 text-white rounded-lg p-4 shadow-sm">
        <div><div className="text-red-200 text-xs">সবচেয়ে বেশি লাভের ফোন:</div><div className="font-bold text-sm">{maxProfitPhone ? maxProfitPhone.brand + ' ' + maxProfitPhone.model : 'N/A'}</div></div>
        <div><div className="text-red-200 text-xs">সবচেয়ে কম লাভের ফোন:</div><div className="font-bold text-sm">{minProfitPhone ? minProfitPhone.brand + ' ' + minProfitPhone.model : 'N/A'}</div></div>
        <div><div className="text-red-200 text-xs">সবচেয়ে বেশি বিক্রিত ব্র্যান্ড:</div><div className="font-bold text-sm">{bestSellingBrand}</div></div>
        <div><div className="text-red-200 text-xs">সবচেয়ে লাভজনক ব্র্যান্ড:</div><div className="font-bold text-sm">{mostProfitableBrand}</div></div>
        <div><div className="text-red-200 text-xs">গড় লাভ:</div><div className="font-bold text-sm">৳{Math.round(averageProfitPerPhone).toLocaleString()}</div></div>
      </div>

      {/* Filters */}
      <div className="relative z-10 flex flex-wrap gap-4 items-end bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium mb-1 block">Search Brand/Model/IMEI/Grade</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Search..." 
              className="pl-8 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Brand</label>
          <select 
            className="flex h-9 w-[120px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Model</label>
          <select 
            className="flex h-9 w-[120px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Status</label>
          <select 
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="Available">Available</option>
            <option value="Sold">Sold</option>
            <option value="Reserved">Reserved</option>
            <option value="Returned">Returned</option>
            <option value="Damaged">Damaged</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Grade</label>
          <select 
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
          >
            <option value="ALL">All Grades</option>
            {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">From Date</label>
          <Input type="date" className="h-9 w-[130px] bg-background" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">To Date</label>
          <Input type="date" className="h-9 w-[130px] bg-background" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        {hasFilters && (
          <Button variant="ghost" onClick={handleClearFilters} className="h-9">
            Clear
          </Button>
        )}
      </div>

      {/* Report Table */}
      <div className="relative z-10 bg-white rounded-lg shadow-sm border border-red-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] text-left">
            <thead>
              <tr className="bg-red-900 text-red-50 border-b border-red-800 whitespace-nowrap">
                <th className="py-2 px-3 font-semibold">Brand & Model</th>
                <th className="py-2 px-3 font-semibold">IMEI</th>
                <th className="py-2 px-3 font-semibold">Buying Price</th>
                <th className="py-2 px-3 font-semibold">Office Sell</th>
                <th className="py-2 px-3 font-semibold">Customer Sell</th>
                <th className="py-2 px-3 font-semibold">Repair Cost</th>
                <th className="py-2 px-3 font-semibold">Office Profit</th>
                <th className="py-2 px-3 font-semibold">Customer Profit</th>
                <th className="py-2 px-3 font-semibold">Total Profit</th>
                <th className="py-2 px-3 font-semibold">Grade</th>
                <th className="py-2 px-3 font-semibold">Status</th>
                <th className="py-2 px-3 font-semibold">Added Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-muted-foreground border-b border-red-100">
                    কোনো ডায়মন্ড ফোন তথ্য পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredData.map((d, i) => (
                  <tr key={i} className="hover:bg-red-50/50 transition-colors whitespace-nowrap">
                    <td className="py-2 px-3 font-medium">{d.brand} {d.model}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{d.imei}</td>
                    <td className="py-2 px-3 text-red-700 bg-red-50/30">৳{d.buyingPrice.toLocaleString()}</td>
                    <td className="py-2 px-3 text-orange-700 bg-orange-50/30">৳{d.officeSellingPrice.toLocaleString()}</td>
                    <td className="py-2 px-3 text-green-700 bg-green-50/30">৳{d.customerSellingPrice.toLocaleString()}</td>
                    <td className="py-2 px-3 text-yellow-700 bg-yellow-50/30">৳{d.repairCost.toLocaleString()}</td>
                    <td className="py-2 px-3">৳{d.officeProfit.toLocaleString()}</td>
                    <td className="py-2 px-3">৳{d.customerProfit.toLocaleString()}</td>
                    <td className="py-2 px-3 font-bold text-emerald-700 bg-emerald-50/30">৳{d.totalProfit.toLocaleString()}</td>
                    <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded bg-gray-100 text-xs font-semibold">{d.conditionGrade}</span></td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border
                        ${d.status === 'Sold' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                        ${d.status === 'Available' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                        ${d.status === 'Damaged' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                        ${d.status === 'Reserved' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                        ${d.status === 'Returned' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                      `}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{safeFormatDate(d.purchaseDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function DiamondSecretReport() {
  return (
    <ErrorBoundary 
      fallback={
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
          <AlertTriangle className="w-16 h-16 text-red-500" />
          <h2 className="text-2xl font-bold text-red-600">ডায়মন্ড রিপোর্ট লোড করতে সমস্যা হয়েছে</h2>
          <p className="text-muted-foreground">অনুগ্রহ করে পুনরায় চেষ্টা করুন</p>
        </div>
      }
    >
      <DiamondSecretReportContent />
    </ErrorBoundary>
  );
}

const safeFormatDate = (dateStr: string, formatStr: string = 'dd/MM/yyyy') => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, formatStr);
  } catch (e) {
    return 'N/A';
  }
};
