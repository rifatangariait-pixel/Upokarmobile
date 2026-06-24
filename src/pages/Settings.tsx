import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { GoogleSheetsService } from '../services/GoogleSheetsService';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';

export function Settings() {
  const { currentUser } = useStore();
  const [shopName, setShopName] = useState('উপকার');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.role !== 'Admin') return;
    const fetchSettings = async () => {
      try {
        const data = await GoogleSheetsService.getAll('Settings');
        if (data && data.length > 0) {
          const s = data[0];
          setSettingsId(s.id);
          setShopName(s.shopName || '');
          setAddress(s.address || '');
          setPhone(s.phone || '');
        }
      } catch (err) {
        console.error('Error fetching settings target:', err);
      }
    };
    fetchSettings();
  }, [currentUser]);

  if (currentUser?.role !== 'Admin') {
    return <div className="p-8 text-center text-muted-foreground">Access Denied. Admins only.</div>;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const updates = { shopName, address, phone };
    try {
      if (settingsId) {
        await GoogleSheetsService.update('Settings', settingsId, updates);
      } else {
        const res = await GoogleSheetsService.create('Settings', { id: 'sys-settings', ...updates });
        setSettingsId(res.id || 'sys-settings');
      }
      toast.success('Settings saved successfully!');
    } catch (err: any) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      toast.info('Initiating database backup...');
      const res = await GoogleSheetsService.backupDatabase();
      toast.success(`Backup successful: ${res.backupName}`);
    } catch (err: any) {
      toast.error('Backup failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
          <p className="text-muted-foreground w-full">Manage application preferences and database.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <p className="text-sm text-muted-foreground">This information will appear on receipts.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Shop Name</label>
              <Input value={shopName} onChange={e => setShopName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Support Phone</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Settings'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Auto-Backup</CardTitle>
          <p className="text-sm text-muted-foreground">Creates a copy of your Google Sheet instantly.</p>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleBackup}>Create Backup Now</Button>
        </CardContent>
      </Card>
    </div>
  );
}
