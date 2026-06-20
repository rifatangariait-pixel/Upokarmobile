import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useStore } from '../store/useStore';
import { Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

type ReportType = 'All Stock' | 'Available Stock' | 'Reserved Stock' | 'Sold Stock' | 'Returned Stock' | 'Damaged Stock' | 'Customer' | 'EMI' | 'Collection' | 'Daily Operations';

import { getBusinessIds } from '../utils/businessIds';

export function Reports() {
  const { phones, customers, emiSales, collections, stockMovements, currentUser } = useStore();
  const [selectedReport, setSelectedReport] = useState<ReportType>('All Stock');

  const businessIds = React.useMemo(() => getBusinessIds(emiSales), [emiSales]);

  if (currentUser?.role !== 'Admin') {
    return <div className="p-8 text-center text-muted-foreground">Access Denied. Admins only.</div>;
  }

  const getReportData = () => {
    switch(selectedReport) {
      case 'All Stock':
        return phones.map(p => ({
          ID: p.id, Brand: p.brand, Model: p.model, IMEI1: p.imei1,
          'Purchase Price': p.purchasePrice, 'Selling Price': p.sellingPrice,
          Status: p.status, Date: p.purchaseDate
        }));
      case 'Available Stock':
      case 'Returned Stock':
      case 'Damaged Stock':
        return phones.filter(p => `${p.status} Stock` === selectedReport).map(p => ({
          ID: p.id, Brand: p.brand, Model: p.model, IMEI1: p.imei1,
          'Purchase Price': p.purchasePrice, 'Selling Price': p.sellingPrice,
          Status: p.status, Date: p.purchaseDate
        }));
      case 'Reserved Stock':
        return phones.filter(p => p.status === 'Reserved').map(p => {
          const move = (stockMovements || []).find(m => m.productId === p.id && m.newStatus === 'Reserved');
          return {
            Brand: p.brand, Model: p.model, IMEI1: p.imei1,
            'Reserved Customer': p.reservedForCustomerName || '-',
            'Reserved Date': move?.changedAt ? new Date(move.changedAt).toLocaleDateString() : p.purchaseDate
          };
        });
      case 'Sold Stock':
        return phones.filter(p => p.status === 'Sold').map(p => {
          const move = (stockMovements || []).find(m => m.productId === p.id && m.newStatus === 'Sold');
          return {
            Brand: p.brand, Model: p.model, IMEI1: p.imei1,
            'Customer': p.soldToCustomerName || '-',
            'Sale Date': move?.changedAt ? new Date(move.changedAt).toLocaleDateString() : '-'
          };
        });
      case 'Customer':
        return customers.map(c => ({
          ID: c.id, Name: c.fullName, Mobile: c.mobile, NID: c.nidObject,
          Address: c.address, 'Risk Rating': c.riskRating
        }));
      case 'EMI':
        return emiSales.map(s => {
          const cust = customers.find(c => c.id === s.customerId);
          return {
            'Sale ID': businessIds.get(s.id)?.saleId || s.id, Customer: cust?.fullName, 'Date': s.saleDate ? new Date(s.saleDate).toLocaleDateString('en-GB') : '-',
            Total: s.totalInstallmentAmount, Monthly: s.monthlyInstallment,
            'Paid Terms': `${s.paidInstallments}/${s.emiMonths}`, Status: s.status
          };
        });
        case 'Daily Operations':
  return stockMovements.map(m => {
    const phone = phones.find(p => p.id === m.productId);

    return {
      Date: new Date(m.changedAt).toLocaleDateString('en-GB'),
      Time: new Date(m.changedAt).toLocaleTimeString('en-GB'),

      Activity: m.newStatus,

      Brand: phone?.brand || '',
      Model: phone?.model || '',

      IMEI1: phone?.imei1 || '',
      IMEI2: phone?.imei2 || '',

      Customer: m.customerName || '-',

      PreviousStatus: m.oldStatus,
      CurrentStatus: m.newStatus,

      Staff: m.changedBy,
      Note: m.note || '-'
    };
  });
      case 'Collection':
        return collections.map(c => {
          const sale = emiSales.find(s => s.id === c.emiSaleId);
          return {
            ID: c.id, 'Sale ID': sale ? businessIds.get(sale.id)?.saleId : c.emiSaleId, Amount: c.amountPaid,
            Date: c.paymentDate ? new Date(c.paymentDate).toLocaleDateString('en-GB') : '-', Type: c.paymentType, Method: c.paymentMethod
          };
        });
    }
  };

  const handleExportExcel = () => {
    const data = getReportData();
    if (data.length === 0) {
      toast.error('No data found for this report.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedReport);
    XLSX.writeFile(wb, `${selectedReport}_Report.xlsx`);
    toast.success('Excel exported successfully');
  };

  const handleExportPdf = () => {
    alert('PDF Clicked');
  console.log('PDF Clicked');
    const data = getReportData();
    if (data.length === 0) {
      toast.error('No data found for this report.');
      return;
    }

    const keys = Object.keys(data[0]);
    
    if (selectedReport === 'Daily Operations') {

  const today = new Date().toLocaleDateString('en-GB');

  const sold = stockMovements.filter(
    m =>
      m.newStatus === 'Sold' &&
      new Date(m.changedAt).toLocaleDateString('en-GB') === today
  );

  const reserved = stockMovements.filter(
    m =>
      m.newStatus === 'Reserved' &&
      new Date(m.changedAt).toLocaleDateString('en-GB') === today
  );

  const returned = stockMovements.filter(
    m =>
      m.newStatus === 'Returned' &&
      new Date(m.changedAt).toLocaleDateString('en-GB') === today
  );

  const damaged = stockMovements.filter(
    m =>
      m.newStatus === 'Damaged' &&
      new Date(m.changedAt).toLocaleDateString('en-GB') === today
  );

  const available = phones.filter(
    p => p.status === 'Available'
  );

  const soldPhones = sold.map(m => {

    const phone = phones.find(
      p => p.id === m.productId
    );

    const sale = emiSales.find(
      s => s.phoneId === m.productId
    );

    const customer = customers.find(
      c => c.id === sale?.customerId
    );

    return {
      brand: phone?.brand || '',
      model: phone?.model || '',
      imei1: phone?.imei1 || '',
      imei2: phone?.imei2 || '',
      customerName:
        customer?.fullName ||
        m.customerName ||
        '-',
      customerMobile:
        customer?.mobile || '-',
      saleDate:
        new Date(m.changedAt)
          .toLocaleDateString('en-GB')
    };

  });
  let reportHtml = `
  <html>
  <head>
    <title>Daily Operations Report</title>

    <style>
      body{
        font-family: Arial;
        padding:30px;
      }

      h1,h2,h3{
        margin:0;
      }

      .header{
        text-align:center;
        margin-bottom:25px;
      }

      .cards{
        display:flex;
        gap:15px;
        margin-bottom:25px;
      }

      .card{
        flex:1;
        border:1px solid #ddd;
        padding:15px;
        border-radius:8px;
        text-align:center;
      }

      table{
        width:100%;
        border-collapse:collapse;
        margin-top:10px;
        margin-bottom:25px;
      }

      th,td{
        border:1px solid #ddd;
        padding:8px;
        font-size:12px;
      }

      th{
        background:#f3f4f6;
      }

      .signatures{
        display:flex;
        justify-content:space-between;
        margin-top:60px;
      }
    </style>
  </head>

  <body>

  <div class="header">

  <h1 style="font-size:40px;color:#0f172a;margin-bottom:5px;">
    উপকার
  </h1>

  <h3 style="margin:0;color:#475569;">
    আঙ্গারিয়া ক্ষুদ্র ব্যবসায়ী সমবায় সমিতির অঙ্গসংগঠন
  </h3>

  <hr style="margin:15px 0">

  <h2 style="color:#1e40af;">
    দৈনিক স্টক ও কার্যক্রম রিপোর্ট
  </h2>

  <p>
    রিপোর্ট তারিখ:
    ${new Date().toLocaleDateString('en-GB')}
  </p>

</div>

  <div class="cards">

    <div class="card">
      <h3>${available.length}</h3>
      <p>স্টকে আছে</p>
    </div>

    <div class="card">
      <h3>${reserved.length}</h3>
      <p>রিজার্ভ</p>
    </div>

    <div class="card">
      <h3>${sold.length}</h3>
      <p>বিক্রিত</p>
    </div>

    <div class="card">
      <h3>${returned.length}</h3>
      <p>রিটার্ন</p>
    </div>

    <div class="card">
      <h3>${damaged.length}</h3>
      <p>ড্যামেজ</p>
    </div>

  </div>

   <h2>বিক্রিত ফোনসমূহ</h2>

<table>
<tr>
<th>ব্র্যান্ড</th>
<th>মডেল</th>
<th>IMEI-1</th>
<th>IMEI-2</th>
<th>গ্রাহক</th>
<th>মোবাইল</th>
<th>বিক্রির তারিখ</th>
</tr>

${soldPhones.map(phone => `
<tr>
<td>${phone.brand}</td>
<td>${phone.model}</td>
<td>${phone.imei1}</td>
<td>${phone.imei2 || '-'}</td>
<td>${phone.customerName}</td>
<td>${phone.customerMobile}</td>
<td>${phone.saleDate}</td>
</tr>
`).join('')}

</table>

  <h2>স্টকে থাকা ফোনসমূহ</h2>

<table>
<tr>
<th>ব্র্যান্ড</th>
<th>মডেল</th>
<th>IMEI-1</th>
<th>IMEI-2</th>
</tr>

${available.map(phone => `
<tr>
<td>${phone.brand}</td>
<td>${phone.model}</td>
<td>${phone.imei1}</td>
<td>${phone.imei2 || '-'}</td>
</tr>
`).join('')}

</table>
<h2>রিটার্নকৃত ফোনসমূহ</h2>

<table>
<tr>
<th>ব্র্যান্ড</th>
<th>মডেল</th>
<th>IMEI-1</th>
<th>IMEI-2</th>
</tr>

${returned.map(item => {

const phone = phones.find(
  p => p.id === item.productId
);

return `
<tr>
<td>${phone?.brand || ''}</td>
<td>${phone?.model || ''}</td>
<td>${phone?.imei1 || ''}</td>
<td>${phone?.imei2 || '-'}</td>
</tr>
`;

}).join('')}
</table>
<h2>ড্যামেজ ফোনসমূহ</h2>

<table>
<tr>
<th>ব্র্যান্ড</th>
<th>মডেল</th>
<th>IMEI-1</th>
<th>IMEI-2</th>
</tr>

${damaged.map(item => {

const phone = phones.find(
  p => p.id === item.productId
);

return `
<tr>
<td>${phone?.brand || ''}</td>
<td>${phone?.model || ''}</td>
<td>${phone?.imei1 || ''}</td>
<td>${phone?.imei2 || '-'}</td>
</tr>
`;

}).join('')}

</table>

  <div class="signatures">

    <div>
      ___________________
      <br>
      Prepared By
    </div>

    <div>
      ___________________
      <br>
      Checked By
    </div>

    <div>
      ___________________
      <br>
      Approved By
    </div>

  </div>

  <script>
    window.onload = () => window.print();
  </script>

  </body>
  </html>
  `;

 const w = window.open('', '_blank');

if (!w) {
  toast.error('Popup blocked by browser');
  return;
}

w.document.open();
w.document.write(reportHtml);
w.document.close();

  return;
}
    let html = `
      <html>
        <head>
          <title>${selectedReport} Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Angaria ERP - ${selectedReport} Report</h1>
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

    const w = window.open(
  '',
  '_blank',
  'width=1200,height=800'
);

if (!w) {
  toast.error('Popup blocked by browser');
  return;
}

w.document.open();
w.document.write(html);
w.document.close();
}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground w-full">Generate business reports and export data.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-4">
            {(['All Stock', 'Available Stock', 'Reserved Stock', 'Sold Stock', 'Returned Stock', 'Damaged Stock', 'Customer', 'EMI', 'Collection', 'Daily Operations'] as ReportType[]).map(type => (
              <Button 
                key={type} 
                variant={selectedReport === type ? 'default' : 'outline'}
                onClick={() => setSelectedReport(type)}
              >
                {type} Report
              </Button>
            ))}
          </div>

          <div className="bg-muted/50 p-6 rounded-lg flex flex-col items-center justify-center gap-4 border border-dashed">
            <div className="text-center space-y-1">
              <h3 className="font-semibold">{selectedReport} Report Ready</h3>
              <p className="text-sm text-muted-foreground">Contains {getReportData().length} records</p>
            </div>
            <div className="flex gap-4">
              <Button onClick={handleExportExcel} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Download className="w-4 h-4" /> Export Excel
              </Button>
              <Button onClick={() => alert('Test')} className="gap-2" variant="outline">
                <FileText className="w-4 h-4" /> Export PDF (Print)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
