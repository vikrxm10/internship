import { useState, useEffect, useContext, useRef } from 'react';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Shield, User, Trash2, Mail, MapPin, AlertCircle } from 'lucide-react';

const Admin = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsersRef = useRef(null);

  useEffect(() => {
    const impl = async () => {
      try {
        const res = await API.get('/admin/users');
        setUsers(res.data);
      } catch (error) {
        console.error('Error fetching admin user list:', error);
        setError('Failed to fetch user accounts.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsersRef.current = impl;
    impl();
  }, []);

  const handleChangeRole = async (userId, currentRole) => {
    const roles = ['RESTAURANT', 'NGO', 'ADMIN'];
    const newRole = window.prompt(`Change role for user? Enter one of: ${roles.join(', ')}`, currentRole);
    
    if (!newRole) return;
    const cleanRole = newRole.trim().toUpperCase();

    if (!roles.includes(cleanRole)) {
      alert('Invalid role specified.');
      return;
    }

    try {
      await API.put(`/admin/users/${userId}/role`, { role: cleanRole });
      fetchUsersRef.current?.();
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating user role.');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (userId === currentUser.id) {
      alert('You cannot delete your own admin account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete user "${userName}"? This will also purge their linked inventory, waste logs, and donations.`)) {
      return;
    }

    try {
      await API.delete(`/admin/users/${userId}`);
      fetchUsersRef.current?.();
    } catch (error) {
      alert(error.response?.data?.message || 'Error deleting user.');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN': return 'bg-rose-100 border-rose-200 text-rose-800';
      case 'RESTAURANT': return 'bg-emerald-100 border-emerald-200 text-emerald-800';
      case 'NGO': return 'bg-indigo-100 border-indigo-200 text-indigo-800';
      default: return 'bg-slate-100 border-slate-200 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
          <Shield className="h-8 w-8 text-emerald-600" />
          <span>Admin Controls</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage system authentication directories, roles, and administrative data.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center space-x-2 text-sm font-semibold">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-extrabold text-lg text-slate-950">System Users Directory</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-150">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="text-left py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="text-left py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                <th className="text-left py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
                <th className="text-left py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Location</th>
                <th className="text-left py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Registered At</th>
                <th className="text-right py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4.5 px-6 text-sm font-bold text-slate-900">
                    <span className="flex items-center space-x-2">
                      <User className="h-4.5 w-4.5 text-slate-400" />
                      <span>{u.name}</span>
                      {u.id === currentUser.id && (
                        <span className="text-[10px] font-extrabold bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-md">
                          You
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-4.5 px-6 text-sm text-slate-600 font-semibold">
                    <span className="flex items-center space-x-1.5">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span>{u.email}</span>
                    </span>
                  </td>
                  <td className="py-4.5 px-6 text-sm">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRoleBadge(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-4.5 px-6 text-sm text-slate-500 font-medium">
                    <span className="flex items-center space-x-1.5 max-w-xs truncate" title={u.location}>
                      <MapPin className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span>{u.location}</span>
                    </span>
                  </td>
                  <td className="py-4.5 px-6 text-sm text-slate-400 font-medium">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4.5 px-6 text-right text-sm font-semibold">
                    <div className="flex justify-end items-center space-x-2">
                      <button
                        onClick={() => handleChangeRole(u.id, u.role)}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-transparent hover:border-emerald-100 transition-all text-xs"
                      >
                        Adjust Role
                      </button>
                      {u.id !== currentUser.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-xl transition-all"
                          title="Purge user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Admin;
