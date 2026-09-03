import React, { useState, useMemo } from 'react';
import { usePosStore } from '../store/posStore';
import { User } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/Switch';
import { Badge } from '../components/ui/badge';
import { Modal } from '../components/ui/modal';
import { Edit, Trash2, Shield, User as UserIcon, Lock, Unlock, Plus } from 'lucide-react';
import { useToast } from '../components/ui/use-toast';

export default function UsersPage() {
  const { users, addUser, updateUser, deleteUser } = usePosStore();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({});
  const [isEdit, setIsEdit] = useState(false);

  const duplicatePinUsers = useMemo(() => {
    const pinCounts = new Map<string, number>();
    users.forEach(u => {
      if (u.pin) {
        pinCounts.set(String(u.pin), (pinCounts.get(String(u.pin)) || 0) + 1);
      }
    });
    const dupes = new Set<string>();
    users.forEach(u => {
      if (u.pin && (pinCounts.get(String(u.pin)) || 0) > 1) {
        dupes.add(u.id);
      }
    });
    return dupes;
  }, [users]);

  const handleOpenAdd = () => {
    setCurrentUser({
      name: '',
      pin: '',
      role: 'cashier',
      isActive: true
    });
    setIsEdit(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setCurrentUser({ ...user });
    setIsEdit(true);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!currentUser.name || !currentUser.pin) {
      toast("Name and PIN are required.", 'error');
      return;
    }

    // Check if PIN is already taken
    const isPinTaken = users.some(u => u.pin === currentUser.pin && u.id !== currentUser.id);
    if (isPinTaken) {
      toast("This PIN is already assigned to another user.", 'error');
      return;
    }

    if (isEdit && currentUser.id) {
      updateUser(currentUser.id, currentUser);
      toast("User updated successfully");
    } else {
      const newUser: User = {
        id: `USR${Date.now()}`,
        name: currentUser.name,
        pin: currentUser.pin,
        role: currentUser.role as 'admin' | 'manager' | 'cashier',
        isActive: currentUser.isActive ?? true,
        createdAt: new Date().toISOString()
      };
      addUser(newUser);
      toast("User created successfully");
    }
    setIsModalOpen(false);
  };

  const toggleStatus = (user: User) => {
    updateUser(user.id, { isActive: user.isActive === false });
    const msg = user.isActive === false ? "User enabled" : "User disabled";
    toast(msg, user.isActive === false ? 'success' : 'info');
  };

  const handleDelete = (user: User) => {
    if (confirm(`Are you sure you want to delete ${user.name}?`)) {
      deleteUser(user.id);
      toast("User deleted", 'info');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="text-slate-500">Manage access and roles for your staff.</p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         {/* Stats Cards? Maybe later */}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">PIN</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors ${duplicatePinUsers.has(user.id) ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                        {user.name.charAt(0)}
                      </div>
                      {user.name}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500 flex flex-col gap-1 items-start">
                      <span>****</span>
                      {duplicatePinUsers.has(user.id) && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium border border-red-200">
                          Duplicate PIN
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.isActive !== false ? 'success' : 'destructive'}>
                        {user.isActive !== false ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(user)} title="Edit">
                        <Edit className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleStatus(user)} title={user.isActive !== false ? "Disable" : "Enable"}>
                        {user.isActive !== false ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4 text-emerald-500" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(user)} title="Delete">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEdit ? "Edit User" : "Create New User"}
        description="Fill in the details below."
      >
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <Input
              value={currentUser.name || ''}
              onChange={e => setCurrentUser({...currentUser, name: e.target.value})}
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">PIN Code</label>
            <Input
              type="password"
              maxLength={4}
              value={currentUser.pin || ''}
              onChange={e => setCurrentUser({...currentUser, pin: e.target.value})}
              placeholder="4-digit PIN"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <select
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
              value={currentUser.role}
              onChange={e => setCurrentUser({...currentUser, role: e.target.value as any})}
            >
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {isEdit && (
             <div className="flex items-center space-x-2 pt-2">
                <Switch 
                  id="isActive" 
                  checked={currentUser.isActive !== false}
                  onCheckedChange={(checked) => setCurrentUser({...currentUser, isActive: checked})}
                />
                <label htmlFor="isActiveCheck" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Active Account
                </label>
             </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

