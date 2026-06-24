import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from 'sonner';
import { User, UserRole, AppPermission } from '../types';
import { Modal } from '../components/ui/Modal';
import { Edit, Trash, Plus, Eye, EyeOff, Shield } from 'lucide-react';
import { ALL_PERMISSIONS, ROLE_DEFAULT_PERMISSIONS, hasPermission } from '../utils/permissions';
import { format } from 'date-fns';
import bcrypt from 'bcryptjs';

export function Users() {
  const { users, currentUser, addUser, updateUser, deleteUser } = useStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<User> & { confirmPassword?: string }>({
    username: '', role: 'SalesOfficer', fullName: '', password: '', confirmPassword: '', is_active: true, custom_permissions: []
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const handleOpenForm = (user?: User) => {
    if (user) {
      setFormData({
        ...user,
        password: '',
        confirmPassword: '',
        custom_permissions: user.custom_permissions || []
      });
      setEditingId(user.id);
    } else {
      setFormData({ 
        username: '', role: 'SalesOfficer', fullName: '', password: '', confirmPassword: '', is_active: true, custom_permissions: [] 
      });
      setEditingId(null);
    }
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsModalOpen(true);
  };

  const handlePermissionToggle = (perm: AppPermission) => {
    setFormData(prev => {
      const current = prev.custom_permissions || [];
      if (current.includes(perm)) {
        return { ...prev, custom_permissions: current.filter(p => p !== perm) };
      } else {
        return { ...prev, custom_permissions: [...current, perm] };
      }
    });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.username) {
      toast.error('Full Name and Username are required.');
      return;
    }

    if (!editingId && (!formData.password || !formData.confirmPassword)) {
      toast.error('Password is required for new users.');
      return;
    }

    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match.');
        return;
      }
    }

    // Check unique username
    const usernameExists = users.some(u => u.username === formData.username && u.id !== editingId);
    if (usernameExists) {
      toast.error('Username already exists.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const updates: Partial<User> = {
          fullName: formData.fullName,
          username: formData.username,
          role: formData.role as UserRole,
          is_active: formData.is_active,
          custom_permissions: formData.custom_permissions,
          updated_at: new Date().toISOString()
        };
        if (formData.password) {
          updates.password_hash = await bcrypt.hash(formData.password, 10);
        }
        console.log("Updating user in DB", updates);
        await updateUser(editingId, updates);
        console.log("User updated successfully");
        toast.success('User updated.');
      } else {
        const passwordHash = await bcrypt.hash(formData.password!, 10);
        const newUser: User = {
          id: crypto.randomUUID(),
          fullName: formData.fullName,
          username: formData.username,
          password_hash: passwordHash,
          role: formData.role as UserRole,
          is_active: formData.is_active,
          custom_permissions: formData.custom_permissions,
          created_at: new Date().toISOString(),
          created_by: currentUser.id
        };
        console.log("Creating new user in DB", newUser);
        await addUser(newUser);
        console.log("User added successfully");
        toast.success('User added.');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving user:", err);
      toast.error(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === currentUser.id) {
      toast.error("You cannot delete yourself.");
      return;
    }
    if (confirm(`Delete ${name}?`)) {
      try {
        await deleteUser(id);
        toast.success('User deleted.');
      } catch (err: any) {
        toast.error(err.message || 'An error occurred while deleting.');
      }
    }
  };

  const roles: UserRole[] = ['Admin', 'Manager', 'SalesOfficer', 'InventoryManager', 'Accountant', 'Viewer'];

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Full Name</th>
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last Login</th>
                  <th className="px-4 py-3 font-medium">Permissions</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user, idx) => {
                  const permCount = user.role === 'Admin' ? 'All' : (user.custom_permissions?.length || ROLE_DEFAULT_PERMISSIONS[user.role]?.length || 0);
                  return (
                  <tr key={`${user.id}-${idx}`} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{user.fullName}</td>
                    <td className="px-4 py-3">{user.username}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {user.last_login ? format(new Date(user.last_login), 'dd MMM yyyy, HH:mm') : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Shield className="w-3 h-3" />
                        {permCount} Access
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenForm(user)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(user.id, user.fullName)}><Trash className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit User' : 'Add User'}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></label>
              <Input required value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} placeholder="e.g. John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Username <span className="text-destructive">*</span></label>
              <Input required value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} placeholder="e.g. johnd" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Password {editingId && <span className="text-xs text-muted-foreground font-normal">(Leave blank to keep current)</span>}</label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="Password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <Input type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} placeholder="Confirm Password" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.role} 
                onChange={(e) => setFormData({...formData, role: e.target.value as UserRole, custom_permissions: []})}
              >
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-2 flex flex-col justify-center">
              <label className="text-sm font-medium mb-2">Status</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.is_active !== false} 
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                />
                <span className="text-sm">{formData.is_active !== false ? 'Active (Can login)' : 'Inactive (Blocked)'}</span>
              </label>
            </div>
          </div>

          {formData.role !== 'Admin' && (
            <div className="space-y-3 pt-4 border-t mt-4">
              <div>
                <h4 className="text-sm font-medium">Custom Access Permissions</h4>
                <p className="text-xs text-muted-foreground">Select permissions to override default role access. Admin has all access by default.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/30 p-4 rounded-lg border">
                {ALL_PERMISSIONS.map(perm => {
                  const isChecked = formData.custom_permissions?.includes(perm) || (!formData.custom_permissions?.length && ROLE_DEFAULT_PERMISSIONS[formData.role as UserRole]?.includes(perm));
                  return (
                    <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 -m-1 rounded">
                      <input 
                        type="checkbox" 
                        checked={isChecked || false}
                        onChange={() => handlePermissionToggle(perm)}
                        className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                      />
                      {perm}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save User'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
