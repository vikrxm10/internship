import { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import { 
  ClipboardList, Plus, Trash2, Calendar, 
  AlertCircle, X, SlidersHorizontal
} from 'lucide-react';

const WasteLog = () => {
  const [logs, setLogs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [foodItemId, setFoodItemId] = useState('');
  const [quantityWasted, setQuantityWasted] = useState('');
  const [reason, setReason] = useState('Expired');

  const fetchDataRef = useRef(null);
  useEffect(() => {
    const impl = async () => {
      try {
        // Build filter queries
        const params = {};
        if (categoryFilter) params.category = categoryFilter;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const [logsRes, invRes] = await Promise.all([
          API.get('/waste', { params }),
          API.get('/inventory')
        ]);

        setLogs(logsRes.data);
        // Only show items with current stock > 0 in the waste log select dropdown
        setInventory(invRes.data.filter(item => item.currentStock > 0));
      } catch (error) {
        console.error('Error fetching waste data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDataRef.current = impl;
    impl();
  }, [categoryFilter, startDate, endDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!foodItemId || !quantityWasted || !reason) {
      setFormError('Please fill in all fields.');
      return;
    }

    const qty = parseFloat(quantityWasted);
    const selectedInvItem = inventory.find(item => item.foodItemId === foodItemId);

    if (selectedInvItem && qty > selectedInvItem.currentStock) {
      setFormError(`Insufficient stock. Maximum available: ${selectedInvItem.currentStock} ${selectedInvItem.foodItem.unit}`);
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/waste', {
        foodItemId,
        quantityWasted: qty,
        reason
      });

      // Clear Form & Refresh
      setFoodItemId('');
      setQuantityWasted('');
      setReason('Expired');
      setShowForm(false);
      fetchDataRef.current?.();
    } catch (error) {
      setFormError(error.response?.data?.message || 'Error saving waste log.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this log? The deleted waste quantity will be restored to your inventory.')) {
      return;
    }

    try {
      await API.delete(`/waste/${id}`);
      fetchDataRef.current?.();
    } catch (error) {
      alert(error.response?.data?.message || 'Error deleting log.');
    }
  };

  const clearFilters = () => {
    setCategoryFilter('');
    setStartDate('');
    setEndDate('');
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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <ClipboardList className="h-8 w-8 text-emerald-600" />
            <span>Waste Logs</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Audit and record discarded items to evaluate kitchen efficiency.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 self-start sm:self-auto"
        >
          <Plus className="h-5 w-5" />
          <span>Log Food Waste</span>
        </button>
      </div>

      {/* Log Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Record Food Waste</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {formError && (
              <div className="col-span-full bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-sm font-semibold flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700">Select Food Item</label>
              <select
                value={foodItemId}
                onChange={(e) => setFoodItemId(e.target.value)}
                required
                className="mt-1.5 block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              >
                <option value="">-- Choose Food from Stock --</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.foodItemId}>
                    {item.foodItem.name} ({item.currentStock} {item.foodItem.unit} available)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Quantity Wasted</label>
              <input
                type="number"
                step="any"
                required
                value={quantityWasted}
                onChange={(e) => setQuantityWasted(e.target.value)}
                className="mt-1.5 block w-full px-3.5 py-2 border border-slate-300 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Reason for Waste</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="mt-1.5 block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              >
                <option value="Expired">Expired</option>
                <option value="Spoiled">Spoiled / Ruined</option>
                <option value="Overproduced">Overprepared / Surplus</option>
                <option value="Damaged">Damaged Packaging</option>
                <option value="Customer Leftovers">Customer Leftovers</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="col-span-full flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Record Log'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Toggleable Filters bar */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-sm font-bold text-slate-700 hover:text-slate-900 self-start p-2 border border-slate-300 rounded-xl bg-white shadow-sm hover:bg-slate-50"
          >
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            <span>Filters</span>
            {(categoryFilter || startDate || endDate) && (
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            )}
          </button>

          {(categoryFilter || startDate || endDate) && (
            <button
              onClick={clearFilters}
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center space-x-1"
            >
              <span>Clear active filters</span>
            </button>
          )}
        </div>

        {/* Filter Drawer */}
        {showFilters && (
          <div className="p-5 bg-slate-50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-sm focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="Produce">Produce</option>
                <option value="Bakery">Bakery</option>
                <option value="Dairy">Dairy</option>
                <option value="Meat">Meat</option>
                <option value="Meals">Prepared Meals</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Data Table */}
        {logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">
            No waste logs matching current filters found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-150">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className="text-left py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Food Item</th>
                  <th className="text-left py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="text-left py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Quantity Discarded</th>
                  <th className="text-left py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Reason</th>
                  <th className="text-left py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Logged Date</th>
                  <th className="text-right py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4.5 px-6 text-sm font-bold text-slate-900">{log.foodItem.name}</td>
                    <td className="py-4.5 px-6 text-sm text-slate-600 font-semibold">{log.foodItem.category}</td>
                    <td className="py-4.5 px-6 text-sm text-slate-800 font-bold">
                      {log.quantityWasted} {log.foodItem.unit}
                    </td>
                    <td className="py-4.5 px-6 text-sm">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        log.reason === 'Expired' 
                          ? 'bg-rose-100 border-rose-200 text-rose-800' 
                          : log.reason === 'Spoiled' 
                          ? 'bg-red-100 border-red-200 text-red-800' 
                          : 'bg-slate-100 border-slate-200 text-slate-800'
                      }`}>
                        {log.reason}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-sm text-slate-500 font-medium">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{new Date(log.loggedAt).toLocaleString()}</span>
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-right text-sm font-semibold">
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="text-rose-600 hover:text-rose-700 p-2 hover:bg-rose-50 rounded-xl inline-flex items-center space-x-1"
                        title="Delete waste log"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Revert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WasteLog;
