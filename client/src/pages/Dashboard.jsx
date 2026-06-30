import { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import { 
  Package, AlertTriangle, Leaf, Calendar, 
  CheckCircle, ShieldAlert, ArrowRight, ShieldCheck, ClipboardList, Trash2, BarChart2
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    inventoryCount: 0,
    lowStockCount: 0,
    expiringCount: 0,
    wasteCount: 0,
    wasteTotalQty: 0,
    activeDonations: [],
    availableDonations: [],
    ngoAcceptedDonations: [],
    donationCompletionRate: 0,
    adminStats: { users: 0, donations: 0, logs: 0 }
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        if (user.role === 'RESTAURANT') {
          // Fetch inventory, alerts, donations, waste
          const [invRes, alertRes, donRes, wasteRes] = await Promise.all([
            API.get('/inventory'),
            API.get('/inventory/alerts'),
            API.get('/donations'),
            API.get('/waste')
          ]);

          const totalWasted = wasteRes.data.reduce((sum, item) => sum + item.quantityWasted, 0);

          setStats(prev => ({
            ...prev,
            inventoryCount: invRes.data.length,
            lowStockCount: alertRes.data.lowStock.length,
            expiringCount: alertRes.data.expiringSoon.length,
            wasteCount: wasteRes.data.length,
            wasteTotalQty: totalWasted,
            activeDonations: donRes.data.filter(d => d.status === 'PENDING' || d.status === 'ACCEPTED')
          }));
        } else if (user.role === 'NGO') {
          // Fetch available donations, accepted donations, stats
          const [availRes, donRes, statsRes] = await Promise.all([
            API.get('/donations/available'),
            API.get('/donations'),
            API.get('/analytics/donation-stats')
          ]);

          setStats(prev => ({
            ...prev,
            availableDonations: availRes.data,
            ngoAcceptedDonations: donRes.data.filter(d => d.recipientId === user.id && d.status === 'ACCEPTED'),
            donationCompletionRate: statsRes.data.completionRate
          }));
        } else if (user.role === 'ADMIN') {
          // Fetch admin counts
          const [usersRes, donRes, logsRes, statsRes] = await Promise.all([
            API.get('/admin/users'),
            API.get('/donations'),
            API.get('/waste'),
            API.get('/analytics/donation-stats')
          ]);

          const totalWasted = logsRes.data.reduce((sum, item) => sum + item.quantityWasted, 0);

          setStats(prev => ({
            ...prev,
            adminStats: {
              users: usersRes.data.length,
              donations: donRes.data.length,
              logs: logsRes.data.length
            },
            wasteTotalQty: totalWasted,
            donationCompletionRate: statsRes.data.completionRate,
            activeDonations: donRes.data.filter(d => d.status === 'PENDING' || d.status === 'ACCEPTED')
          }));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const handleAcceptDonation = async (id) => {
    try {
      await API.put(`/donations/${id}/status`, { status: 'ACCEPTED' });
      // Refresh available donations
      const [availRes, donRes] = await Promise.all([
        API.get('/donations/available'),
        API.get('/donations')
      ]);
      setStats(prev => ({
        ...prev,
        availableDonations: availRes.data,
        ngoAcceptedDonations: donRes.data.filter(d => d.recipientId === user.id && d.status === 'ACCEPTED')
      }));
    } catch (error) {
      alert(error.response?.data?.message || 'Error accepting donation');
    }
  };

  const handleCompleteDonation = async (id) => {
    try {
      await API.put(`/donations/${id}/status`, { status: 'COMPLETED' });
      // Refresh
      const donRes = await API.get('/donations');
      setStats(prev => ({
        ...prev,
        ngoAcceptedDonations: donRes.data.filter(d => d.recipientId === user.id && d.status === 'ACCEPTED')
      }));
    } catch (error) {
      alert(error.response?.data?.message || 'Error completing donation');
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full filter blur-3xl opacity-20 translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Hello, {user.name}!</h1>
            <p className="text-emerald-100 mt-2 font-medium">
              Role: <span className="uppercase tracking-wider font-extrabold text-sm border border-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full ml-1">{user.role}</span>
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-2xl flex items-center space-x-3 self-start md:self-auto">
            <Calendar className="h-5 w-5 text-emerald-300" />
            <span className="text-sm font-semibold">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* RESTAURANT DASHBOARD */}
      {user.role === 'RESTAURANT' && (
        <div className="space-y-8">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Inventory Items</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.inventoryCount}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.lowStockCount}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Expiring in 3 Days</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.expiringCount}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Total Waste Logged</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.wasteTotalQty.toFixed(1)} units</p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Active Donations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link to="/inventory" className="flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl text-sm font-semibold text-slate-700 transition-colors border border-transparent hover:border-emerald-100">
                    <span className="flex items-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span>Manage Inventory</span>
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/waste-log" className="flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl text-sm font-semibold text-slate-700 transition-colors border border-transparent hover:border-emerald-100">
                    <span className="flex items-center space-x-2">
                      <ClipboardList className="h-4 w-4" />
                      <span>Log Food Waste</span>
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/donations" className="flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl text-sm font-semibold text-slate-700 transition-colors border border-transparent hover:border-emerald-100">
                    <span className="flex items-center space-x-2">
                      <Leaf className="h-4 w-4" />
                      <span>Schedule Donation</span>
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Active Donations */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">Active Donations</h3>
                <Link to="/donations" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">View All</Link>
              </div>

              {stats.activeDonations.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 text-slate-500 rounded-xl p-8 text-center text-sm font-medium">
                  No active donations currently. Use "Schedule Donation" to list surplus food.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead>
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Food Item</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Quantity</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Pickup Location</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Scheduled At</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.activeDonations.slice(0, 4).map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 text-sm font-semibold text-slate-800">{d.foodItem.name}</td>
                          <td className="py-3 px-4 text-sm text-slate-600">{d.foodItem.quantity} {d.foodItem.unit}</td>
                          <td className="py-3 px-4 text-sm text-slate-500 max-w-xs truncate">{d.pickupLocation}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">{new Date(d.scheduledAt).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              d.status === 'PENDING' ? 'bg-amber-100 border-amber-200 text-amber-800' : 'bg-blue-100 border-blue-200 text-blue-800'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NGO DASHBOARD */}
      {user.role === 'NGO' && (
        <div className="space-y-8">
          {/* NGO stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Leaf className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Available Donations</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.availableDonations.length}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">My Claimed Pickups</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.ngoAcceptedDonations.length}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Rescue Success Rate</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.donationCompletionRate}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* NGO Accepted Donations (Claimed Pickups) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                <span>My Active Pickups</span>
              </h3>

              {stats.ngoAcceptedDonations.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 text-slate-500 rounded-xl p-8 text-center text-sm font-medium">
                  You have no pending collections. Claim available donations on the right!
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.ngoAcceptedDonations.map((d) => (
                    <div key={d.id} className="p-4 border border-blue-100 bg-blue-50/20 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div>
                        <h4 className="font-bold text-slate-950">{d.foodItem.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">Quantity: {d.foodItem.quantity} {d.foodItem.unit}</p>
                        <p className="text-xs text-slate-500 mt-1">Donor: {d.donor?.name}</p>
                        <p className="text-xs text-slate-500 mt-1">Address: {d.pickupLocation}</p>
                      </div>
                      <button
                        onClick={() => handleCompleteDonation(d.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all self-start sm:self-auto"
                      >
                        Mark Completed
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* NGO Available Feed */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                  <span>Available Surplus Food</span>
                </h3>
                <Link to="/map" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">Map View</Link>
              </div>

              {stats.availableDonations.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 text-slate-500 rounded-xl p-8 text-center text-sm font-medium">
                  No surplus food available right now. Check back soon!
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.availableDonations.slice(0, 5).map((d) => (
                    <div key={d.id} className="p-4 border border-slate-100 hover:border-emerald-100 hover:bg-slate-50/50 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-all">
                      <div>
                        <h4 className="font-bold text-slate-900">{d.foodItem.name}</h4>
                        <p className="text-xs text-slate-600 mt-0.5">Quantity: <span className="font-semibold">{d.foodItem.quantity} {d.foodItem.unit}</span></p>
                        <p className="text-xs text-slate-500 mt-1">Donor: {d.donor?.name}</p>
                        <p className="text-xs text-slate-500">Location: {d.pickupLocation}</p>
                      </div>
                      <button
                        onClick={() => handleAcceptDonation(d.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all self-start sm:self-auto"
                      >
                        Claim / Collect
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN DASHBOARD */}
      {user.role === 'ADMIN' && (
        <div className="space-y-8">
          {/* Admin Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Registered Users</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.adminStats.users}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Leaf className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Total Donations</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.adminStats.donations}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Total Waste Logs</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.adminStats.logs}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Donation Complete %</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.donationCompletionRate}%</p>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts & Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Admin Shortcuts</h3>
              <div className="space-y-3">
                <Link to="/admin" className="flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl text-sm font-semibold text-slate-700 transition-colors border border-transparent hover:border-emerald-100">
                  <span className="flex items-center space-x-2">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Manage User Access</span>
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/analytics" className="flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl text-sm font-semibold text-slate-700 transition-colors border border-transparent hover:border-emerald-100">
                  <span className="flex items-center space-x-2">
                    <BarChart2 className="h-4 w-4" />
                    <span>System Analytics</span>
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-2">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Active System Donations</h3>
              {stats.activeDonations.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 text-slate-500 rounded-xl p-8 text-center text-sm font-medium">
                  No active donations inside the system currently.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead>
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Food</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Qty</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Donor</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Recipient</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.activeDonations.slice(0, 5).map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 text-sm font-semibold text-slate-800">{d.foodItem.name}</td>
                          <td className="py-3 px-4 text-sm text-slate-600">{d.foodItem.quantity} {d.foodItem.unit}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">{d.donor?.name || 'Unknown'}</td>
                          <td className="py-3 px-4 text-sm text-slate-500">{d.recipient?.name || 'None'}</td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              d.status === 'PENDING' ? 'bg-amber-100 border-amber-200 text-amber-800' : 'bg-blue-100 border-blue-200 text-blue-800'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
