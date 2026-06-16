import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from 'sonner';
import { User, UserRole } from '../types';
import { Modal } from '../components/ui/Modal';
import { Edit, Trash, Plus } from 'lucide-react';

export function Users() {
  const { users, currentUser } = useStore();
  const [localUsers, setLocalUsers] = useState<User[]>(users);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({
    username: '', role: 'SalesOfficer', fullName: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  if (currentUser?.role !== 'Admin') {
    return <div className="p-8 text-center text-muted-foreground">Access Denied. Admins only.</div>;
  }

  const handleOpenForm = (user?: User) => {
    if (user) {
      setFormData(user);
      setEditingId(user.id);
    } else {
      setFormData({ username: '', role: 'SalesOfficer', fullName: '' });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setLocalUsers(prev => prev.map(u => u.id === editingId ? { ...formData, id: editingId } as User : u));
      toast.success('User updated.');
    } else {
      setLocalUsers(prev => [...prev, { ...formData, id: crypto.randomUUID() } as User]);
      toast.success('User added.');
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete ${name}?`)) {
      setLocalUsers(prev => prev.filter(u => u.id !== id));
      toast.success('User deleted.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage staff access and roles.</p>
        </div>
        <Button onClick={() => handleOpenForm()} className="gap-2">
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {localUsers.map((user, idx) => (
                <tr key={`${user.id}-${idx}`} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{user.fullName}</td>
                  <td className="px-4 py-3">{user.username}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenForm(user)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(user.id, user.fullName)}><Trash className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit User' : 'Add User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <Input required value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} placeholder="e.g. John Doe" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <Input required value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} placeholder="e.g. johnd" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <select 
              className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={formData.role} 
              onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
            >
              <option value="Admin">Admin</option>
              <option value="SalesOfficer">Sales Officer</option>
              <option value="InventoryManager">Inventory Manager</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save User</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
