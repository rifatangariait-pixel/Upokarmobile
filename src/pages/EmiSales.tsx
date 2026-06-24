import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useStore } from '../store/useStore';
import { Plus, Search, FileText, Printer, Download } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { Modal } from '../components/ui/Modal';
import { toast } from 'sonner';
import { EMISale, StockType, Phone } from '../types';
import { useReactToPrint } from 'react-to-print';
import { jsPDF } from 'jspdf';
import { getBusinessIds, generateNextEmiIds } from '../utils/businessIds';

const getPhoneSellingPrice = (phone: Phone | undefined): number => {
  if (!phone) return 0;
  if (phone.stockType === 'USED' || phone.stockType === 'DIAMOND') {
    return phone.customerSellingPrice || 0;
  }
  return phone.sellingPrice || 0;
};


export function EmiSales({ stockType }: { stockType: StockType }) {
  const { emiSales, customers, phones, addEmiSale, changePhoneStatus, isLoading, currentUser } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (currentUser?.role !== 'Admin' && currentUser?.role !== 'SalesOfficer') {
    return <div className="p-8 text-center text-muted-foreground">Access Denied.</div>;
  }
  
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<EMISale | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<EMISale>>({
    customerId: '', phoneId: '', downPayment: undefined, emiMonths: 6, interestRate: 0, saleDate: new Date().toISOString().split('T')[0]
  });

  const availablePhones = phones.filter(p => p.status === 'Available' && (p.stockType || 'NEW') === stockType);

  const selectedPhone = phones.find(p => p.id === formData.phoneId);

  // Auto-calculation
  useEffect(() => {
    if (selectedPhone && formData.emiMonths) {
      const price = getPhoneSellingPrice(selectedPhone);
      const dp = Number(formData.downPayment || 0);
      const principal = price - dp;
      const interest = (principal * (formData.interestRate || 0)) / 100;
      const totalInstallmentAmount = principal + interest;
      const monthlyInstallment = formData.emiMonths > 0 ? (totalInstallmentAmount / formData.emiMonths) : 0;
      
      setFormData(prev => ({
        ...prev,
        totalPrice: price,
        totalInterest: interest,
        totalInstallmentAmount,
        monthlyInstallment: Math.ceil(monthlyInstallment)
      }));
    }
  }, [formData.phoneId, formData.downPayment, formData.emiMonths, formData.interestRate, selectedPhone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.phoneId) {
      toast.error('Customer and Phone must be selected.');
      return;
    }

    setIsSubmitting(true);
    try {
      const dp = Number(formData.downPayment || 0);
      const nextIds = generateNextEmiIds(emiSales);

      const sale: EMISale = {
        ...(formData as EMISale),
        downPayment: dp,
        id: crypto.randomUUID(), // Local optimistic ID
        saleId: nextIds.saleId,
        receiptId: nextIds.receiptId,
        nextDueDate: addMonths(new Date(formData.saleDate!), 1).toISOString(),
        paidInstallments: 0,
        status: 'Active'
      };
      
      await addEmiSale(sale);
      
      const customer = customers.find(c => c.id === formData.customerId);
      if (customer) {
        await changePhoneStatus(formData.phoneId, 'Sold', 'Sold via EMI', customer.id, customer.fullName);
      } else {
        await changePhoneStatus(formData.phoneId, 'Sold', 'Sold via EMI');
      }

      toast.success('EMI Sale created successfully!');
      setIsModalOpen(false);
      
      setFormData({
        customerId: '', phoneId: '', downPayment: undefined, emiMonths: 6, interestRate: 0, saleDate: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      // Store handles alert
    } finally {
      setIsSubmitting(false);
    }
  };

  const businessIds = React.useMemo(() => getBusinessIds(emiSales), [emiSales]);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: selectedReceipt ? `Receipt_${businessIds.get(selectedReceipt.id)?.receiptId || 'EMI'}` : 'Receipt',
  });

  const handleDownloadPDF = async () => {
    if (!selectedReceipt) {
      toast.error('Receipt data not available');
      return;
    }
    
    try {
      const bId = businessIds.get(selectedReceipt.id)?.receiptId || 'Receipt';
      const cust = customers.find(c => c.id === selectedReceipt.customerId);
      const ph = phones.find(p => p.id === selectedReceipt.phoneId);
      
      const principalAmount = selectedReceipt.totalInstallmentAmount - (selectedReceipt.totalInterest || 0);
      const sellingPrice = principalAmount + (selectedReceipt.downPayment || 0);
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('ANGARIA SMALL BUSINESS CO-SOCIETY', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text('Mobile EMI & Inventory System', 105, 27, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('আঙ্গারিয়া ক্ষুদ্র ব্যবসায়ী সমবায় সমিতির অঙ্গসংগঠন', 105, 33, { align: 'center' });
      
      // Receipt Title
      doc.setFont('helvetica', 'bold');
      doc.rect(75, 40, 60, 8);
      doc.text('MOBILE EMI SALES RECEIPT', 105, 45, { align: 'center' });
      
      // Info grids (Left: Receipt, Right: Customer)
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Receipt Information', 15, 60);
      doc.text('Customer Information', 120, 60);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Receipt No: ${bId}`, 15, 67);
      doc.text(`Sale ID: ${businessIds.get(selectedReceipt.id)?.saleId}`, 15, 73);
      doc.text(`Issue Date: ${selectedReceipt.saleDate ? new Date(selectedReceipt.saleDate).toLocaleDateString() : ''}`, 15, 79);
      
      doc.text(`Name: ${cust?.fullName || 'N/A'}`, 120, 67);
      doc.text(`Mobile: ${cust?.mobile || 'N/A'}`, 120, 73);
      
      // Product Info
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Product Information', 15, 90);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(15, 92, 195, 92);
      doc.setLineDashPattern([], 0);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Brand & Model: ${ph?.brand || ''} ${ph?.model || ''}`, 15, 98);
      doc.text(`IMEI: ${ph?.imei1 || ''}`, 120, 98);
      
      // Financial Summary
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Financial Summary', 15, 110);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(15, 112, 195, 112);
      doc.setLineDashPattern([], 0);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      let y = 118;
      doc.text('Selling Price', 15, y);
      doc.text(`BDT ${sellingPrice.toLocaleString()}`, 195, y, { align: 'right' });
      
      y += 6;
      doc.text('Down Payment', 15, y);
      doc.text(`BDT ${(selectedReceipt.downPayment || 0).toLocaleString()}`, 195, y, { align: 'right' });
      
      y += 6;
      doc.text('Principal Amount', 15, y);
      doc.text(`BDT ${principalAmount.toLocaleString()}`, 195, y, { align: 'right' });
      
      y += 6;
      doc.text('Interest Rate', 15, y);
      doc.text(`${selectedReceipt.interestRate || 0}%`, 195, y, { align: 'right' });
      
      y += 6;
      doc.setTextColor(100, 100, 100);
      doc.text('Total Interest', 15, y);
      doc.text(`BDT ${(selectedReceipt.totalInterest || 0).toLocaleString()}`, 195, y, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      
      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.line(15, y - 4, 195, y - 4);
      doc.text('Total EMI Amount', 15, y);
      doc.text(`BDT ${selectedReceipt.totalInstallmentAmount.toLocaleString()}`, 195, y, { align: 'right' });
      
      // Payment Plan
      y += 15;
      doc.setFillColor(245, 245, 245);
      doc.rect(15, y, 180, 20, 'F');
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Payment Plan (${selectedReceipt.emiMonths} Months)`, 20, y + 12);
      
      doc.text('Monthly Installment:', 120, y + 12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 200);
      doc.text(`BDT ${(selectedReceipt.monthlyInstallment || 0).toLocaleString()}`, 190, y + 12, { align: 'right' });
      
      y += 40;
      
      // Auto page break check (in case we modify layout later, though it easily fits A4)
      if (y > 250) {
         doc.addPage();
         y = 40;
      }
      
      // Signatures
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      doc.line(15, y, 65, y);
      doc.text('Customer Signature', 40, y + 5, { align: 'center' });
      
      doc.line(80, y, 130, y);
      doc.text('Manager Signature', 105, y + 5, { align: 'center' });
      
      doc.line(145, y, 195, y);
      doc.text('Authorized Signature', 170, y + 5, { align: 'center' });
      
      // Footer
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(15, pageHeight - 20, 195, pageHeight - 20);
      doc.setLineDashPattern([], 0);
      
      doc.text('Generated By: উপকার', 15, pageHeight - 15);
      doc.text(`Print Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 195, pageHeight - 15, { align: 'right' });
      
      // Save
      doc.save(`${bId}.pdf`);
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('Failed to generate PDF', error);
      toast.error(error instanceof Error ? error.message : 'PDF generation failed');
    }
  };

  const filteredSales = emiSales.filter(s => {
    const ids = businessIds.get(s.id);
    const cust = customers.find(c => c.id === s.customerId);
    const ph = phones.find(p => p.id === s.phoneId);
    
    if ((ph?.stockType || 'NEW') !== stockType) return false;
    
    const term = String(searchTerm || '').toLowerCase();
    
    return String(s.id || '').toLowerCase().includes(term) ||
      String(ids?.saleId || '').toLowerCase().includes(term) ||
      String(ids?.receiptId || '').toLowerCase().includes(term) ||
      String(cust?.fullName || '').toLowerCase().includes(term) ||
      String(cust?.mobile || '').includes(searchTerm) ||
      String(ph?.imei1 || '').includes(searchTerm);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">ইএমআই বিক্রি ({stockType === 'NEW' ? 'New' : 'Diamond'} Phone)</h2>
          <p className="text-muted-foreground w-full">Create and manage EMI agreements and installments.</p>
        </div>
        <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" /> New EMI Sale
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex relative w-full sm:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Sale ID, Customer..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Sale ID</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Phone Details</th>
                  <th className="px-4 py-3 font-medium">Financials</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading && emiSales.length === 0 ? (
                   <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading from Google Sheets...</td></tr>
                ) : filteredSales.length === 0 ? (
                   <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No EMI Sales found.</td></tr>
                ) : (
                  filteredSales.map((sale, idx) => {
                    const customer = customers.find(c => c.id === sale.customerId);
                    const phone = phones.find(p => p.id === sale.phoneId);
                    const progressPct = sale.emiMonths > 0 ? Math.round((sale.paidInstallments / sale.emiMonths) * 100) : 0;
                    const displayId = businessIds.get(sale.id)?.saleId;

                    return (
                      <tr key={`${sale.id}-${idx}`} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-primary">{displayId}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{customer?.fullName || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{customer?.mobile}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border
                            ${(phone?.stockType || 'NEW') === 'NEW' 
                              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300' 
                              : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300'
                            }`}
                          >
                            {(phone?.stockType || 'NEW') === 'NEW' ? 'New Phone' : 'Diamond Phone'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-foreground">{phone?.brand} {phone?.model}</div>
                          <div className="text-xs text-muted-foreground">IMEI: {phone?.imei1}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs">Total: <span className="font-medium">৳{(sale.totalInstallmentAmount || 0).toLocaleString()}</span></div>
                          <div className="text-xs text-muted-foreground">Monthly: ৳{(sale.monthlyInstallment || 0).toLocaleString()}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden w-24">
                              <div className="h-full bg-primary" style={{ width: `${progressPct}%` }} />
                            </div>
                            <span className="text-xs font-medium">{sale.paidInstallments}/{sale.emiMonths}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Next: {format(new Date(sale.nextDueDate), 'dd/MM/yyyy')}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                            ${sale.status === 'Active' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}
                            ${sale.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : ''}
                            ${sale.status === 'Defaulted' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : ''}
                          `}>
                            {sale.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" className="gap-2" onClick={() => { setSelectedReceipt(sale); setReceiptModalOpen(true); }}>
                            <FileText className="w-4 h-4" /> Receipt
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New EMI Sale">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <label className="text-sm font-medium">Select Customer</label>
              <select required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={formData.customerId} onChange={e => setFormData({ ...formData, customerId: e.target.value })}
              >
                <option value="">-- Select Customer --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.fullName} - {c.mobile}</option>)}
              </select>
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <label className="text-sm font-medium">Select Phone</label>
              <select required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={formData.phoneId} onChange={e => setFormData({ ...formData, phoneId: e.target.value })}
              >
                <option value="">-- Select Available Phone --</option>
                {availablePhones.map(p => <option key={p.id} value={p.id}>{p.brand} {p.model} - IMEI: {p.imei1}</option>)}
              </select>
            </div>
            
            <div className="space-y-2 col-span-2 bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-sm font-medium">
                <span>Phone Selling Price:</span>
                <span className="text-primary text-lg">৳{getPhoneSellingPrice(selectedPhone).toLocaleString()}</span>
              </div>
              {selectedPhone && (
                <div className="text-xs text-muted-foreground mt-1 text-right font-medium text-emerald-600 dark:text-emerald-400">
                  Selected Selling Price Source: {(selectedPhone.stockType === 'USED' || selectedPhone.stockType === 'DIAMOND') ? 'Customer Selling Price' : 'Regular Selling Price'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Down Payment (৳) (Optional)</label>
              <Input type="number" value={formData.downPayment === undefined || formData.downPayment === null ? '' : formData.downPayment} onChange={e => setFormData({ ...formData, downPayment: e.target.value === '' ? undefined : Number(e.target.value) })} />
              {selectedPhone && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {[0, 10, 20, 30, 50].map(pct => (
                    <Button 
                      key={pct} 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-6 px-2"
                      onClick={() => setFormData({ ...formData, downPayment: Math.round(getPhoneSellingPrice(selectedPhone) * (pct / 100)) })}
                    >
                      {pct}%
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">EMI Months</label>
              <Input required type="number" value={formData.emiMonths || ''} onChange={e => setFormData({ ...formData, emiMonths: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Interest Rate (%) (Optional)</label>
              <Input type="number" value={formData.interestRate === undefined || formData.interestRate === null ? '' : formData.interestRate} onChange={e => setFormData({ ...formData, interestRate: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sale Date</label>
              <Input required type="date" value={formData.saleDate} onChange={e => setFormData({ ...formData, saleDate: e.target.value })} />
            </div>
            
            {(selectedPhone && formData.emiMonths) && (
              <div className="col-span-2 bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Principal Amount:</span>
                  <span>৳{((getPhoneSellingPrice(selectedPhone) - Number(formData.downPayment || 0)) || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Interest:</span>
                  <span>৳{(formData.totalInterest || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total EMI Amount:</span>
                  <span>৳{(formData.totalInstallmentAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-primary border-t pt-2 mt-2">
                  <span>Monthly Installment:</span>
                  <span>৳{(formData.monthlyInstallment || 0).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Processing...' : 'Confirm Sale'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={receiptModalOpen} onClose={() => setReceiptModalOpen(false)} title="EMI Sale Receipt">
        {selectedReceipt ? (() => {
          const cust = customers.find(c => c.id === selectedReceipt.customerId);
          const ph = phones.find(p => p.id === selectedReceipt.phoneId);
          const principalAmount = selectedReceipt.totalInstallmentAmount - (selectedReceipt.totalInterest || 0);
          const sellingPrice = principalAmount + (selectedReceipt.downPayment || 0);

          return (
            <div className="space-y-6">
              <div id="printable-receipt" ref={receiptRef} className="bg-white text-black p-6 rounded-lg border">
                <div className="text-center border-b pb-4 mb-4">
                  <h2 className="text-xl font-bold tracking-wider text-primary">উপকার</h2>
                  <p className="text-sm font-medium text-gray-700 mt-1">আঙ্গারিয়া ক্ষুদ্র ব্যবসায়ী সমবায় সমিতির অঙ্গসংগঠন</p>
                  <div className="mt-4 text-sm font-semibold text-gray-800 uppercase tracking-widest border max-w-max mx-auto px-4 py-1 rounded bg-gray-50">Mobile EMI Sales Receipt</div>
                </div>
                
                <div className="grid grid-cols-2 text-sm gap-4 mb-6">
                  <div>
                    <div className="text-gray-500 text-xs uppercase tracking-wide">Receipt Information</div>
                    <div className="mt-1 font-medium">Receipt No: {businessIds.get(selectedReceipt.id)?.receiptId}</div>
                    <div>Sale ID: {businessIds.get(selectedReceipt.id)?.saleId}</div>
                    <div>Issue Date: {format(new Date(selectedReceipt.saleDate), 'dd/MM/yyyy')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500 text-xs uppercase tracking-wide">Customer Information</div>
                    <div className="mt-1 font-medium">{cust?.fullName || 'N/A'}</div>
                    <div>Mobile: {cust?.mobile || 'N/A'}</div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-gray-500 text-xs uppercase tracking-wide border-b pb-1 mb-2">Product Information</div>
                  <div className="grid grid-cols-2 text-sm">
                    <div>Brand & Model: <span className="font-medium">{ph?.brand} {ph?.model}</span></div>
                    <div className="text-right">IMEI: <span className="font-mono">{ph?.imei1}</span></div>
                  </div>
                </div>

                <div>
                  <div className="text-gray-500 text-xs uppercase tracking-wide border-b pb-1 mb-2">Financial Summary</div>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr><td className="py-1">Selling Price</td><td className="py-1 text-right">৳{sellingPrice.toLocaleString()}</td></tr>
                      <tr><td className="py-1">Down Payment</td><td className="py-1 text-right">৳{(selectedReceipt.downPayment || 0).toLocaleString()}</td></tr>
                      <tr><td className="py-1">Principal Amount</td><td className="py-1 text-right">৳{principalAmount.toLocaleString()}</td></tr>
                      <tr><td className="py-1">Interest Rate</td><td className="py-1 text-right">{selectedReceipt.interestRate || 0}%</td></tr>
                      <tr><td className="py-1 text-gray-500">Total Interest</td><td className="py-1 text-right text-gray-500">৳{(selectedReceipt.totalInterest || 0).toLocaleString()}</td></tr>
                      <tr className="border-t font-semibold">
                        <td className="py-2 mt-1">Total EMI Amount</td><td className="py-2 mt-1 text-right">৳{selectedReceipt.totalInstallmentAmount.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 pt-4 border-t flex justify-between items-center bg-gray-50 p-3 rounded-md">
                   <div className="text-xs text-gray-500 uppercase">Payment Plan ({selectedReceipt.emiMonths} Months)</div>
                   <div className="text-right">
                      <div className="text-sm">Monthly Installment</div>
                      <div className="text-xl font-bold text-blue-600">৳{(selectedReceipt.monthlyInstallment || 0).toLocaleString()}</div>
                   </div>
                </div>

                <div className="mt-12 pt-16 grid grid-cols-3 gap-4 text-center text-sm font-medium">
                  <div>
                    <div className="border-t border-black pt-1 px-2 inline-block">Customer Signature</div>
                  </div>
                  <div>
                    <div className="border-t border-black pt-1 px-2 inline-block">Manager Signature</div>
                  </div>
                  <div>
                    <div className="border-t border-black pt-1 px-2 inline-block">Authorized Signature</div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t flex justify-between text-xs text-gray-400">
                  <p>Generated By: উপকার</p>
                  <p>Print Date: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 print-hidden">
                <Button type="button" variant="outline" onClick={handlePrint} className="gap-2">
                  <Printer className="w-4 h-4" /> Print
                </Button>
                <Button type="button" onClick={handleDownloadPDF} className="gap-2">
                  <Download className="w-4 h-4" /> Download PDF
                </Button>
              </div>
            </div>
          );
        })() : (
          <div className="p-6 text-center text-red-500">Sale record not found.</div>
        )}
      </Modal>
    </div>
  );
}
