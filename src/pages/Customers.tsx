import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useStore } from '../store/useStore';
import { Plus, Search, UserCheck, AlertCircle, Edit, Trash } from 'lucide-react';
import { Customer } from '../types';
import { Modal } from '../components/ui/Modal';
import { toast } from 'sonner';

export function Customers() {
  const { customers, addCustomer, updateCustomer, deleteCustomer, isLoading, currentUser } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (currentUser?.role !== 'Admin' && currentUser?.role !== 'SalesOfficer') {
    return <div className="p-8 text-center text-muted-foreground">Access Denied.</div>;
  }

  const canDelete = currentUser?.role === 'Admin';

  const [formData, setFormData] = useState<Partial<Customer>>({
    fullName: '', fatherName: '', motherName: '', nidObject: '', mobile: '', alternateMobile: '', address: '', occupation: '', monthlyIncome: 0, riskRating: 'Medium Risk'
  });

  const term = String(searchTerm || '').toLowerCase();
  const filteredCustomers = customers.filter(c => 
    String(c.fullName || '').toLowerCase().includes(term) ||
    String(c.mobile || '').includes(searchTerm) ||
    String(c.nidObject || '').includes(searchTerm)
  );

  const openForm = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({
        fullName: '', fatherName: '', motherName: '', nidObject: '', mobile: '', alternateMobile: '', address: '', occupation: '', monthlyIncome: 0, riskRating: 'Medium Risk'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.mobile || !formData.nidObject) {
      toast.error('Name, Mobile, and NID are required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
        toast.success('Customer updated successfully');
      } else {
        await addCustomer({ ...formData, id: crypto.randomUUID() } as Customer);
        toast.success('Customer added successfully');
      }
      setIsModalOpen(false);
    } catch (error: any) {
      // Store handles alert
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete customer ${name}?`)) {
      await deleteCustomer(id);
      toast.success('Customer deleted successfully');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">কাস্টমার প্রোফাইল (Customers)</h2>
          <p className="text-muted-foreground w-full">Manage customer details, guarantor info, and risk ratings.</p>
        </div>
        <Button className="gap-2" onClick={() => openForm()}>
          <Plus className="w-4 h-4" /> Add Customer
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, mobile, NID..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading && customers.length === 0 && (
              <div className="col-span-3 text-center py-8 text-muted-foreground">Loading from Google Sheets...</div>
            )}
            {!isLoading && filteredCustomers.length === 0 && (
              <div className="col-span-3 text-center py-8 text-muted-foreground">No customers found.</div>
            )}
            
            {filteredCustomers.map((customer, idx) => (
              <Card key={`${customer.id}-${idx}`} className="overflow-hidden relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7 bg-white/80 dark:bg-black/50" onClick={() => openForm(customer)}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  {canDelete && (
                     <Button variant="outline" size="icon" className="h-7 w-7 bg-white/80 dark:bg-black/50 text-destructive" onClick={() => handleDelete(customer.id, customer.fullName)}>
                       <Trash className="w-3.5 h-3.5" />
                     </Button>
                  )}
                </div>
                <div className="p-4 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                    {customer.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0 pr-12">
                    <h3 className="font-semibold text-lg truncate">{customer.fullName}</h3>
                    <p className="text-sm text-muted-foreground truncate">{customer.mobile}</p>
                    <div className="mt-2 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">NID:</span>
                        <span className="font-medium">{customer.nidObject}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ID:</span>
                        <span className="font-medium">{customer.id}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`px-4 py-2 text-xs font-medium flex items-center gap-1.5 justify-center border-t
                  ${customer.riskRating === 'Low Risk' ? 'bg-green-50 text-green-700 dark:bg-green-900/30' : 
                    customer.riskRating === 'Medium Risk' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30' : 
                    'bg-red-50 text-red-700 dark:bg-red-900/30'}
                `}>
                  {customer.riskRating === 'Low Risk' ? <UserCheck className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {customer.riskRating}
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCustomer ? "Edit Customer" : "Add Customer"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">NID</label>
              <Input required value={formData.nidObject} onChange={e => setFormData({ ...formData, nidObject: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mobile</label>
              <Input required value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Alternate Mobile</label>
              <Input value={formData.alternateMobile} onChange={e => setFormData({ ...formData, alternateMobile: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Father's Name</label>
              <Input value={formData.fatherName} onChange={e => setFormData({ ...formData, fatherName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mother's Name</label>
              <Input value={formData.motherName} onChange={e => setFormData({ ...formData, motherName: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Occupation</label>
              <Input value={formData.occupation} onChange={e => setFormData({ ...formData, occupation: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Monthly Income</label>
              <Input type="number" value={formData.monthlyIncome || ''} onChange={e => setFormData({ ...formData, monthlyIncome: Number(e.target.value) })} />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Risk Rating</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={formData.riskRating} onChange={e => setFormData({ ...formData, riskRating: e.target.value as any })}
              >
                <option value="Low Risk">Low Risk</option>
                <option value="Medium Risk">Medium Risk</option>
                <option value="High Risk">High Risk</option>
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Customer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
