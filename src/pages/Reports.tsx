import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useStore } from '../store/useStore';
import { Download, FileText, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import { getBusinessIds } from '../utils/businessIds';

export function Reports() {
  const { type } = useParams<{ type: string }>();
  const { phones, emiSales, collections, currentUser } = useStore();



  const reportType = type === 'new' ? 'NEW' : type === 'used' ? 'USED' : 'COMBINED';

  // Calculate specific metrics
  const targetPhones = phones.filter(p => reportType === 'COMBINED' ? true : (p.stockType || 'NEW') === reportType);

  // Total Stock Count
  const totalStock = targetPhones.filter(p => p.status === 'Available').length;

  // Sold Quantity
  const soldPhones = emiSales
    .map((sale) => {
      const phone = phones.find((p) => p.id === sale.phoneId);

      if (!phone) return null;

      if (
        reportType !== 'COMBINED' &&
        (phone.stockType || 'NEW') !== reportType
      ) {
        return null;
      }

      return {
        saleId: sale.id,
        saleDate: sale.saleDate,
        customer: sale.customerName,
        phone,
        totalPrice: sale.totalPrice,
        downPayment: sale.downPayment,
        monthly: sale.monthlyInstallment,
        profit:
          phone.sellingPrice -
          phone.purchasePrice -
          (phone.repairCost || 0),
      };
    })
    .filter(Boolean);
  const totalSales = soldPhones.reduce(
    (sum, s) => sum + Number(s.totalPrice),
    0
  );

  // Purchased Quantity
  const purchasedQuantity = targetPhones.length;

  // Collection Calculation
  const relevantSalesIds = emiSales.filter(s => {
    const p = phones.find(ph => ph.id === s.phoneId);
    return p && (reportType === 'COMBINED' || (p.stockType || 'NEW') === reportType);
  }).map(s => s.id);
  const relevantCollections = collections.filter(c => relevantSalesIds.includes(c.emiSaleId));
  const totalCollection = relevantCollections.reduce((sum, c) => sum + Number(c.amountPaid), 0);

  // Total Sales Value
  const relevantSales = emiSales.filter(s => relevantSalesIds.includes(s.id));
  const totalSalesValue = relevantSales.reduce((sum, s) => sum + Number(s.totalPrice || 0), 0);

  // Profit calculation
  // Profit = Selling Price - Purchase Price - (Repair Cost if used)
  const totalProfit = soldPhones.reduce((sum, p) => {
    let profit = p.sellingPrice - p.purchasePrice;
    if ((p.stockType || 'NEW') === 'USED' && p.repairCost) {
      profit -= p.repairCost;
    }
    return sum + profit;
  }, 0);

  const getReportData = () => {
    return targetPhones.map(p => ({
      'Brand & Model': `${p.brand} ${p.model}`,
      'IMEI': p.imei1,
      'Status': p.status,
      'Purchase Price': p.purchasePrice,
      'Selling Price': p.sellingPrice,
      'Repair Cost': p.repairCost || 0,
      'Phone Type': (p.stockType || 'NEW') === 'NEW' ? 'New Phone' : 'Diamond Phone'
    }));
  };

  const handleExportExcel = () => {
    const data = getReportData();
    if (data.length === 0) {
      toast.error('No data found for this report.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${reportType} Report`);
    XLSX.writeFile(wb, `${reportType}_Report.xlsx`);
    toast.success('Excel exported successfully');
  };

  const handleExportPdf = () => {
    const data = getReportData();
    if (data.length === 0) {
      toast.error('No data found for this report.');
      return;
    }

    const keys = Object.keys(data[0]);

    let html = `
      <html>
        <head>
          <title>${reportType} Report - Angaria ERP</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { text-align: center; color: #2563eb; margin-bottom: 5px; }
            h2 { text-align: center; margin-top: 0; color: #444; font-size: 16px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>উপকার</h1>
          <h2>Phone Type: ${reportType} PHONE</h2>
          <table>
            <thead>
              <tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${data.map(row => `<tr>${keys.map(k => `<td>${(row as any)[k] || ''}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">রিপোর্টস ({reportType} Report)</h2>
          <p className="text-muted-foreground w-full">View and export analytical summaries.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportPdf}>
            <Printer className="w-4 h-4" /> Print PDF
          </Button>
          <Button className="gap-2" onClick={handleExportExcel}>
            <Download className="w-4 h-4" /> Export Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="py-4 border-b">
            <CardTitle className="text-sm">Total Stock (Available)</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{totalStock}</div>
          </CardContent>
        </Card>

        {reportType === 'USED' && (
          <Card>
            <CardHeader className="py-4 border-b">
              <CardTitle className="text-sm">Purchased Quantity</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold">{purchasedQuantity}</div>
            </CardContent>
          </Card>
        )}

        {(reportType === 'NEW' || reportType === 'USED') && (
          <Card>
            <CardHeader className="py-4 border-b">
              <CardTitle className="text-sm">Sold Quantity</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold">{soldQuantity}</div>
            </CardContent>
          </Card>
        )}

        {reportType === 'COMBINED' && (
          <Card>
            <CardHeader className="py-4 border-b">
              <CardTitle className="text-sm">Total Sales Value</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold">৳{totalSalesValue.toLocaleString()}</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="py-4 border-b">
            <CardTitle className="text-sm">Total Collection</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-emerald-600">৳{totalCollection.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4 border-b">
            <CardTitle className="text-sm">{reportType === 'USED' ? 'Profit/Loss' : 'Net Profit'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              ৳{totalProfit.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-4 border-b">
          <CardTitle>Detailed List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-medium">Brand & Model</th>
                  <th className="px-4 py-3 font-medium">IMEI 1</th>
                  {reportType === 'COMBINED' && <th className="px-4 py-3 font-medium">Type</th>}
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Purchase</th>
                  <th className="px-4 py-3 font-medium text-right">Sell</th>
                  {(reportType === 'USED' || reportType === 'COMBINED') && <th className="px-4 py-3 font-medium text-right">Repair Cost</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {targetPhones.map((p, i) => (
                  <tr key={i} className="hover:bg-muted/50">
                    <td className="px-4 py-3">{p.brand} {p.model}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.imei1}</td>
                    {reportType === 'COMBINED' && <td className="px-4 py-3 text-xs text-muted-foreground">{(p.stockType || 'NEW') === 'NEW' ? 'NEW' : 'DIAMOND'}</td>}
                    <td className="px-4 py-3">{p.status}</td>
                    <td className="px-4 py-3 text-right">৳{Number(p.purchasePrice).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">৳{Number(p.sellingPrice).toLocaleString()}</td>
                    {(reportType === 'USED' || reportType === 'COMBINED') && <td className="px-4 py-3 text-right">৳{Number(p.repairCost || 0).toLocaleString()}</td>}
                  </tr>
                ))}
                {targetPhones.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">No records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
