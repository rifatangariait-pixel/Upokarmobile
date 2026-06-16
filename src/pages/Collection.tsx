import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useStore } from '../store/useStore';
import { Plus, Search, CheckCircle2, AlertTriangle, MessageSquare, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '../components/ui/Modal';
import { toast } from 'sonner';
import { Collection as CollectionType, EMISale } from '../types';

import { getBusinessIds, getCollectionReceiptId } from '../utils/businessIds';

export function Collection() {
  const { emiSales, customers, collections, addCollection, isLoading, currentUser } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  const businessIds = React.useMemo(() => getBusinessIds(emiSales), [emiSales]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSale, setSelectedSale] = useState<EMISale | null>(null);

  if (currentUser?.role !== 'Admin' && currentUser?.role !== 'SalesOfficer') {
    return <div className="p-8 text-center text-muted-foreground">Access Denied.</div>;
  }

  const [formData, setFormData] = useState<Partial<CollectionType>>({
    amountPaid: 0, 
    paymentDate: new Date().toISOString().split('T')[0],
    paymentType: 'Monthly Installment',
    paymentMethod: 'Cash'
  });

  // Active sales sorted by upcoming due date
  const activeSales = emiSales
    .filter(s => s.status === 'Active')
    .filter(s => {
      const cust = customers.find(c => c.id === s.customerId);
      const bId = businessIds.get(s.id);
      return s.id.includes(searchTerm) || bId?.saleId.toLowerCase().includes(searchTerm.toLowerCase()) || (cust && cust.fullName.toLowerCase().includes(searchTerm.toLowerCase()));
    })
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

  const openForm = (sale?: EMISale) => {
    if (sale) {
      setSelectedSale(sale);
      setFormData({
        emiSaleId: sale.id,
        amountPaid: sale.monthlyInstallment,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentType: 'Monthly Installment',
        paymentMethod: 'Cash',
        remarks: ''
      });
      setIsModalOpen(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || !formData.amountPaid) return;

    setIsSubmitting(true);
    try {
      const collectionItem: CollectionType = {
        ...(formData as CollectionType),
        id: crypto.randomUUID()
      };
      await addCollection(collectionItem);
      toast.success('Collection recorded successfully!');
      setIsModalOpen(false);
    } catch (error) {
      // Store handles alert
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = (collectionId: string) => {
    const col = collections.find(c => c.id === collectionId);
    if (!col) return;
    const sale = emiSales.find(s => s.id === col.emiSaleId);
    const customer = customers.find(c => c.id === sale?.customerId);
    
    // Quick and dirty printable window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - Angaria ERP</title>
            <style>
              body { font-family: sans-serif; padding: 40px; margin: 0 auto; max-width: 600px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
              .details { margin-bottom: 20px; }
              .details div { margin-bottom: 8px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header" style="text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 20px; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 24px; text-transform: uppercase;">Angaria Small Business Co-Society</h1>
              <h3 style="margin: 5px 0; font-size: 16px; color: #444;">Mobile EMI & Inventory System</h3>
              <p style="margin: 5px 0; font-size: 14px; color: #666;">Address: Angaria, Shariatpur</p>
              <h2 style="margin: 15px 0 0 0; font-size: 18px; text-transform: uppercase; border: 1px solid #ccc; display: inline-block; padding: 5px 15px; background: #f9f9f9;">Payment Receipt</h2>
            </div>
            <div class="details">
              <div><strong>Receipt No:</strong> ${getCollectionReceiptId(col, collections)}</div>
              <div><strong>Date:</strong> ${format(new Date(col.paymentDate), 'dd/MM/yyyy')}</div>
              <div><strong>Customer Name:</strong> ${customer?.fullName || 'N/A'}</div>
              <div><strong>Sale ID:</strong> ${sale ? businessIds.get(sale.id)?.saleId : col.emiSaleId}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Payment Method</th>
                  <th>Amount (৳)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${col.paymentType}</td>
                  <td>${col.paymentMethod}</td>
                  <td>${Number(col.amountPaid).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            <div class="footer">
              <p>Thank you for your payment!</p>
            </div>
            <script>
              window.onload = () => { window.print(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">কালেকশন এবং রিমাইন্ডার (Collection Tracker)</h2>
          <p className="text-muted-foreground w-full">Track monthly installments, send reminders, collect payments.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader className="py-4 border-b">
            <div className="flex justify-between items-center">
              <CardTitle>Upcoming & Overdue Deliverables</CardTitle>
              <div className="relative w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search Sale/Customer..." className="pl-8 h-9 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[600px] overflow-auto">
              {isLoading && activeSales.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading from Google Sheets...</div>
              ) : activeSales.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No active sales found.</div>
              ) : activeSales.map((sale, idx) => {
                const customer = customers.find(c => c.id === sale.customerId);
                const dueDate = new Date(sale.nextDueDate);
                const isOverdue = dueDate < new Date();

                return (
                  <div key={`${sale.id}-${idx}`} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-full ${isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                        {isOverdue ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{customer?.fullName} <span className="text-muted-foreground text-xs font-normal">({businessIds.get(sale.id)?.saleId || sale.id})</span></h4>
                        <div className="text-sm text-muted-foreground">Due: {format(dueDate, 'dd/MM/yyyy')} • ৳{sale.monthlyInstallment.toLocaleString()}</div>
                        {isOverdue && <div className="text-xs text-destructive font-medium mt-1">Overdue by {Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))} days</div>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline" className="gap-2 w-full justify-start text-xs h-8" onClick={() => window.open(`https://wa.me/${customer?.mobile}?text=Hello ${customer?.fullName}, your installment of ৳${sale.monthlyInstallment} is due on ${format(dueDate, 'dd/MM/yyyy')}. Please pay in time.`, '_blank')}>
                        <MessageSquare className="w-3 h-3" /> Send Reminder SMS
                      </Button>
                      <Button size="sm" className="gap-2 w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => openForm(sale)}>
                        Collect ৳{sale.monthlyInstallment.toLocaleString()}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4 border-b">
            <CardTitle>Recent Collections</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {isLoading && collections.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
              ) : collections.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No recent collections today.</div>
              ) : (
                collections.slice(0, 10).map((col, idx) => {
                  const sale = emiSales.find(s => s.id === col.emiSaleId);
                  return (
                  <div key={`${col.id}-${idx}`} className="p-4 flex justify-between items-center group">
                    <div>
                      <div className="font-medium text-sm">Sale: {sale ? businessIds.get(sale.id)?.saleId : col.emiSaleId}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(col.paymentDate), 'dd/MM/yyyy')}</div>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="font-bold text-emerald-600">+৳{Number(col.amountPaid).toLocaleString()}</span>
                       <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handlePrintReceipt(col.id)} title="Print Receipt">
                         <Printer className="w-3 h-3" />
                       </Button>
                    </div>
                  </div>
                )})
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Payment">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sale ID / Account</label>
              <Input disabled value={formData.emiSaleId || ''} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount Received (৳)</label>
              <Input required type="number" value={formData.amountPaid || ''} onChange={e => setFormData({ ...formData, amountPaid: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Type</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={formData.paymentType} onChange={e => setFormData({ ...formData, paymentType: e.target.value as any })}
              >
                <option value="Monthly Installment">Monthly Installment</option>
                <option value="Down Payment">Down Payment</option>
                <option value="Late Fee">Late Fee</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              >
                <option value="Cash">Cash</option>
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Date</label>
              <Input required type="date" value={formData.paymentDate} onChange={e => setFormData({ ...formData, paymentDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks (Optional)</label>
              <Input value={formData.remarks || ''} onChange={e => setFormData({ ...formData, remarks: e.target.value })} />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Recording...' : 'Confirm Receipt'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
