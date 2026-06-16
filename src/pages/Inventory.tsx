import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useStore } from '../store/useStore';
import { Plus, Search, Filter, Download, Trash, Edit, History, Eye, Settings2 } from 'lucide-react';
import { Phone, PhoneStatus, StockMovement } from '../types';
import { Modal } from '../components/ui/Modal';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export function Inventory() {
  const { phones, addPhone, updatePhone, deletePhone, changePhoneStatus, stockMovements, isLoading, currentUser, customers } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PhoneStatus | 'All'>('All');
  
  const canManageInventory = currentUser?.role === 'Admin' || currentUser?.role === 'InventoryManager';
  const canDelete = currentUser?.role === 'Admin';
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPhone, setEditingPhone] = useState<Phone | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Phone>>({
    brand: '', model: '', imei1: '', imei2: '', ram: '', storage: '', color: '',
    purchasePrice: 0, sellingPrice: 0, supplier: '', warranty: '1 Year', purchaseDate: new Date().toISOString().split('T')[0], status: 'Available'
  });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const filteredPhones = phones.filter(p => {
    const matchesSearch = p.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.imei1.includes(searchTerm);
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExport = () => {
    if (filteredPhones.length === 0) {
      toast.error('No data to export');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(filteredPhones);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "Inventory_Export.xlsx");
    toast.success("Inventory exported successfully!");
  };

  const openForm = (phone?: Phone) => {
    if (phone) {
      setEditingPhone(phone);
      setFormData(phone);
    } else {
      setEditingPhone(null);
      setFormData({
        brand: '', model: '', imei1: '', imei2: '', ram: '', storage: '', color: '',
        purchasePrice: 0, sellingPrice: 0, supplier: '', warranty: '1 Year', purchaseDate: new Date().toISOString().split('T')[0], status: 'Available'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand || !formData.model || !formData.imei1) {
      toast.error('Brand, Model, and IMEI 1 are required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingPhone) {
        await updatePhone(editingPhone.id, formData);
        toast.success('Phone updated successfully');
      } else {
        await addPhone({ ...formData, id: crypto.randomUUID() } as Phone);
        toast.success('Phone added successfully');
      }
      setIsModalOpen(false);
    } catch (error: any) {
      // Error handled by store, but we can catch failure here if we re-throw,
      // currently store handles alert, but we can rely on it.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this phone?')) {
      await deletePhone(id);
      toast.success('Phone deleted successfully');
    }
  };

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusActionPhoneId, setStatusActionPhoneId] = useState<string | null>(null);
  const [statusActionNewStatus, setStatusActionNewStatus] = useState<PhoneStatus | null>(null);
  const [statusActionNote, setStatusActionNote] = useState('');
  const [statusActionCustomerId, setStatusActionCustomerId] = useState('');
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);

  const handleStatusChangeClick = (id: string, newStatus: PhoneStatus) => {
    if (newStatus === 'Reserved' || newStatus === 'Sold' || newStatus === 'Returned') {
      setStatusActionPhoneId(id);
      setStatusActionNewStatus(newStatus);
      setStatusActionCustomerId('');
      setStatusActionNote('');
      setIsStatusModalOpen(true);
    } else {
      const note = prompt(`Enter note for changing status to ${newStatus} (Optional):`);
      if (note !== null) {
        toast.info('Updating status...');
        changePhoneStatus(id, newStatus, note).then(() => {
          toast.success(`Status changed to ${newStatus}`);
        });
      }
    }
  };

  const handleStatusModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusActionPhoneId || !statusActionNewStatus) return;
    
    // For Sold/Returned we might require customer, for Reserved we require customer
    if (!statusActionCustomerId) {
      toast.error('Please select a customer.');
      return;
    }

    const customer = customers.find(c => c.id === statusActionCustomerId);
    
    setIsStatusSubmitting(true);
    try {
      await changePhoneStatus(
        statusActionPhoneId, 
        statusActionNewStatus, 
        statusActionNote, 
        statusActionCustomerId, 
        customer?.fullName || ''
      );
      toast.success(`Status successfully changed to ${statusActionNewStatus}`);
      setIsStatusModalOpen(false);
    } catch (error) {
      // Store handles alert
    } finally {
      setIsStatusSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">স্টক ম্যানেজমেন্ট (Inventory)</h2>
          <p className="text-muted-foreground w-full">Track individual phones, IMEI, stock status.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setIsHistoryModalOpen(true)}>
             <History className="w-4 h-4" /> Status History
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </Button>
          {canManageInventory && (
            <Button className="gap-2" onClick={() => openForm()}>
              <Plus className="w-4 h-4" /> Add Phone
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search brand, model, IMEI..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select 
                className="h-9 px-3 rounded-md border border-input bg-transparent text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="All">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Reserved">Reserved</option>
                <option value="Sold">Sold</option>
                <option value="Returned">Returned</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Brand & Model</th>
                  <th className="px-4 py-3 font-medium">IMEI 1</th>
                  <th className="px-4 py-3 font-medium">Specs</th>
                  <th className="px-4 py-3 font-medium text-right">Price (Buy/Sell)</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium">Reserved/Sold For</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading && phones.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading from Google Sheets...</td></tr>
                ) : filteredPhones.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No Inventory Found.
                    </td>
                  </tr>
                ) : (
                  filteredPhones.map((phone, idx) => (
                    <tr key={`${phone.id}-${idx}`} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{phone.brand}</div>
                        <div className="text-muted-foreground text-xs">{phone.model}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{phone.imei1}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-muted-foreground">{phone.ram} RAM / {phone.storage}</div>
                        <div className="text-xs">{phone.color}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-xs text-muted-foreground line-through">৳{Number(phone.purchasePrice).toLocaleString()}</div>
                        <div className="font-medium text-primary">৳{Number(phone.sellingPrice).toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">{phone.supplier}</td>
                      <td className="px-4 py-3 text-xs">
                        {phone.status === 'Reserved' && phone.reservedForCustomerName && `Reserved For: ${phone.reservedForCustomerName}`}
                        {phone.status === 'Sold' && phone.soldToCustomerName && `Sold To: ${phone.soldToCustomerName}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                          ${phone.status === 'Available' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : ''}
                          ${phone.status === 'Sold' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' : ''}
                          ${phone.status === 'Reserved' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}
                          ${phone.status === 'Returned' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' : ''}
                          ${phone.status === 'Damaged' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : ''}
                        `}>
                          {phone.status}
                          {phone.status === 'Reserved' && phone.reservedForCustomerName && ` (${phone.reservedForCustomerName})`}
                          {phone.status === 'Sold' && phone.soldToCustomerName && ` (${phone.soldToCustomerName})`}
                          {phone.status === 'Returned' && phone.soldToCustomerName && ` (${phone.soldToCustomerName})`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canManageInventory && (
                            <Button variant="ghost" size="icon" onClick={() => openForm(phone)} title="Edit"><Edit className="w-4 h-4" /></Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(phone.id)} className="text-destructive" title="Delete"><Trash className="w-4 h-4" /></Button>
                          )}
                          {canManageInventory && (
                            <select 
                               className="text-xs border border-input rounded-md h-8 bg-transparent"
                               value={phone.status}
                               onChange={(e) => handleStatusChangeClick(phone.id, e.target.value as PhoneStatus)}
                            >
                               <option value="" disabled hidden>Change</option>
                               <option value="Available">Available</option>
                               <option value="Reserved">Reserved</option>
                               <option value="Sold">Sold</option>
                               <option value="Returned">Returned</option>
                               <option value="Damaged">Damaged</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPhone ? "Edit Phone" : "Add Phone"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Brand</label>
              <Input required value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="e.g. Samsung" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Input required value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder="e.g. Galaxy S24" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">IMEI 1</label>
              <Input required value={formData.imei1} onChange={e => setFormData({ ...formData, imei1: e.target.value })} placeholder="15 digit IMEI" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">IMEI 2 (Optional)</label>
              <Input value={formData.imei2} onChange={e => setFormData({ ...formData, imei2: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">RAM</label>
              <Input value={formData.ram} onChange={e => setFormData({ ...formData, ram: e.target.value })} placeholder="e.g. 8GB" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Storage</label>
              <Input value={formData.storage} onChange={e => setFormData({ ...formData, storage: e.target.value })} placeholder="e.g. 128GB" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <Input value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} placeholder="e.g. Black" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier</label>
              <Input value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Purchase Price</label>
              <Input type="number" required value={formData.purchasePrice || ''} onChange={e => setFormData({ ...formData, purchasePrice: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Selling Price</label>
              <Input type="number" required value={formData.sellingPrice || ''} onChange={e => setFormData({ ...formData, sellingPrice: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={formData.status} 
                onChange={e => {
                  const newStatus = e.target.value as PhoneStatus;
                  const updates: Partial<Phone> = { status: newStatus };
                  if (newStatus === 'Available' || newStatus === 'Returned' || newStatus === 'Damaged') {
                    updates.reservedForCustomerId = '';
                    updates.reservedForCustomerName = '';
                    updates.soldToCustomerId = '';
                    updates.soldToCustomerName = '';
                  }
                  setFormData({ ...formData, ...updates });
                }}
              >
                <option value="Available">Available</option>
                <option value="Reserved">Reserved</option>
                <option value="Sold">Sold</option>
                <option value="Returned">Returned</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>
            {(formData.status === 'Reserved' || formData.status === 'Sold') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {formData.status === 'Reserved' ? 'Reserved For Customer' : 'Sold To Customer'}
                </label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={formData.status === 'Reserved' ? formData.reservedForCustomerId || '' : formData.soldToCustomerId || ''}
                  onChange={(e) => {
                    const custId = e.target.value;
                    const cust = customers.find(c => c.id === custId);
                    if (formData.status === 'Reserved') {
                       setFormData({ ...formData, reservedForCustomerId: custId, reservedForCustomerName: cust?.fullName, soldToCustomerId: '', soldToCustomerName: '' });
                    } else {
                       setFormData({ ...formData, soldToCustomerId: custId, soldToCustomerName: cust?.fullName, reservedForCustomerId: '', reservedForCustomerName: '' });
                    }
                  }}
                  required
                >
                  <option value="" disabled hidden>Select Customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.fullName} - {c.mobile}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Purchase Date</label>
              <Input type="date" value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Phone'}</Button>
          </div>
         </form>
      </Modal>

      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Status History Audit Trail">
        <div className="max-h-[60vh] overflow-auto">
          {stockMovements.length === 0 ? (
            <p className="p-4 text-center text-muted-foreground text-sm">No status changes recorded yet.</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">IMEI 1</th>
                  <th className="px-4 py-3 font-medium">Old Status</th>
                  <th className="px-4 py-3 font-medium">New Status</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y relative">
                {stockMovements.map((m, idx) => (
                  <tr key={`${m.id || 'm'}-${idx}`} className="hover:bg-muted/50">
                    <td className="px-4 py-3 whitespace-nowrap">{m.changedAt ? format(new Date(m.changedAt), 'dd MMM yyyy, HH:mm') : 'N/A'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{m.imei1}</td>
                    <td className="px-4 py-3">{m.oldStatus || '-'}</td>
                    <td className="px-4 py-3">{m.newStatus}</td>
                    <td className="px-4 py-3">{m.customerName || '-'}</td>
                    <td className="px-4 py-3">{m.changedBy}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>Close</Button>
        </div>
      </Modal>

      <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title={`Change Status to ${statusActionNewStatus}`}>
        <form onSubmit={handleStatusModalSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Customer (Required)</label>
            <select 
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={statusActionCustomerId}
              onChange={e => setStatusActionCustomerId(e.target.value)}
              required
            >
              <option value="" disabled hidden>Select a Customer...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.fullName} - {c.mobile}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Note (Optional)</label>
            <Input value={statusActionNote} onChange={e => setStatusActionNote(e.target.value)} placeholder={`Reason for changing to ${statusActionNewStatus}...`} />
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsStatusModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isStatusSubmitting}>{isStatusSubmitting ? 'Updating...' : 'Confirm Update'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
