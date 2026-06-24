import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { ReservationRequest, Phone } from '../types';
import { toast } from 'sonner';

const getPhoneSellingPrice = (phone: Phone | undefined): number => {
  if (!phone) return 0;
  if (phone.stockType === 'USED' || phone.stockType === 'DIAMOND') {
    return phone.customerSellingPrice || 0;
  }
  return phone.sellingPrice || 0;
};


export function PublicPhones() {
  const { phones, addReservation } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc'>('price-asc');
  const [selectedPhone, setSelectedPhone] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    customerName: '',
    mobile: '',
    address: '',
    notes: '',
  });

  const availablePhones = phones.filter(p => p.status === 'Available');

  const term = String(searchTerm || '').toLowerCase();
  const filteredPhones = availablePhones.filter(p => 
    String(p.brand || '').toLowerCase().includes(term) ||
    String(p.model || '').toLowerCase().includes(term)
  ).sort((a, b) => {
    if (sortBy === 'price-asc') return getPhoneSellingPrice(a) - getPhoneSellingPrice(b);
    if (sortBy === 'price-desc') return getPhoneSellingPrice(b) - getPhoneSellingPrice(a);
    return 0;
  });

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhone) return;

    try {
      const reservation: ReservationRequest = {
        id: crypto.randomUUID(),
        customerName: formData.customerName,
        mobile: formData.mobile,
        address: formData.address,
        notes: formData.notes,
        productId: selectedPhone.id,
        imei: selectedPhone.imei1,
        phoneModel: `${selectedPhone.brand} ${selectedPhone.model}`,
        requestDate: new Date().toISOString(),
        status: 'Pending'
      };

      await addReservation(reservation);
      toast.success('Reservation request submitted successfully!');
      setSelectedPhone(null);
      setFormData({ customerName: '', mobile: '', address: '', notes: '' });
    } catch (error) {
      toast.error('Failed to submit reservation');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <div className="w-full bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10 px-6 max-w-7xl mx-auto border-b">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-wider">উপকার</h1>
          <p className="text-[10px] text-muted-foreground leading-tight sm:text-xs">আঙ্গারিয়া ক্ষুদ্র ব্যবসায়ী সমবায় সমিতির অঙ্গসংগঠন</p>
        </div>
        <Button variant="outline" onClick={() => window.location.href = '/'}>Staff Login</Button>
      </div>
      
      <div className="max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search by brand or model..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>

        {filteredPhones.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground bg-white rounded-lg border">
            No phones currently available matching your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPhones.map((phone, idx) => (
              <Card key={`${phone.id}-${idx}`} className="overflow-hidden flex flex-col">
                <div className="aspect-[4/3] bg-muted/30 flex items-center justify-center p-6 border-b">
                  <div className="w-16 h-24 bg-primary/10 rounded-lg flex items-center justify-center">
                     <span className="text-xs text-primary font-medium tracking-wider uppercase rotate-90">{phone.brand}</span>
                  </div>
                </div>
                <CardContent className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{phone.brand} {phone.model}</h3>
                    <div className="text-sm text-muted-foreground space-y-1 mt-2">
                       <p>RAM: {phone.ram}</p>
                       <p>Storage: {phone.storage}</p>
                       <p>Color: {phone.color}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div className="flex justify-between items-center">
                       <div className="text-lg font-bold text-primary">৳{getPhoneSellingPrice(phone).toLocaleString()}</div>
                       <div className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">Available</div>
                    </div>
                    <Button className="w-full" onClick={() => setSelectedPhone(phone)}>Reserve Phone</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!selectedPhone} onClose={() => setSelectedPhone(null)} title="Reserve Phone">
        {selectedPhone && (
          <form className="space-y-4" onSubmit={handleReserve}>
            <div className="bg-muted/50 p-4 rounded-lg mb-4">
              <h4 className="font-medium">{selectedPhone.brand} {selectedPhone.model}</h4>
              <p className="text-sm text-muted-foreground">Price: ৳{getPhoneSellingPrice(selectedPhone).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Name</label>
              <Input required placeholder="Enter full name" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mobile Number</label>
              <Input required type="tel" placeholder="e.g. 01700000000" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input required placeholder="Enter your address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Notes (Optional)</label>
              <Input placeholder="Any special requests?" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSelectedPhone(null)}>Cancel</Button>
              <Button type="submit">Submit Reservation</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
