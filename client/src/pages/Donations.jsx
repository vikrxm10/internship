import { useState, useEffect, useContext, useRef } from 'react';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { 
  Leaf, Plus, Clock, MapPin, CheckCircle, AlertCircle, 
  X, Check, ChevronRight, Ban
} from 'lucide-react';

const Donations = () => {
  const { user } = useContext(AuthContext);
  const [donations, setDonations] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filtered donations based on status selection
  const filteredDonations = donations.filter((d) => {
    if (statusFilter === 'ALL') return true;
    return d.status === statusFilter;
  });

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [foodItemId, setFoodItemId] = useState('');
  const [quantityToDonate, setQuantityToDonate] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupLat, setPickupLat] = useState('40.7128'); // default NY
  const [pickupLng, setPickupLng] = useState('-74.0060');
  const [scheduledAt, setScheduledAt] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDataRef = useRef(null);
  useEffect(() => {
    const impl = async () => {
      try {
        const [donRes, invRes] = await Promise.all([
          API.get('/donations'),
          API.get('/inventory')
        ]);
        setDonations(donRes.data);
        setInventory(invRes.data.filter(item => item.currentStock > 0));
      } catch (error) {
        console.error('Error fetching donations data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDataRef.current = impl;
    impl();
  }, []);

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!foodItemId || !pickupLocation || !pickupLat || !pickupLng || !scheduledAt) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const qty = quantityToDonate ? parseFloat(quantityToDonate) : null;
    const selectedInvItem = inventory.find(item => item.foodItemId === foodItemId);

    if (qty && selectedInvItem && qty > selectedInvItem.currentStock) {
      setFormError(`Insufficient stock in inventory. Max stock: ${selectedInvItem.currentStock} ${selectedInvItem.foodItem.unit}`);
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/donations', {
        foodItemId,
        quantityToDonate: qty,
        pickupLocation,
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        scheduledAt
      });

      // Clear Form & Refresh
      setFoodItemId('');
      setQuantityToDonate('');
      setPickupLocation('');
      setPickupLat('40.7128');
      setPickupLng('-74.0060');
      setScheduledAt('');
      setShowForm(false);
      fetchDataRef.current?.();
    } catch (error) {
      setFormError(error.response?.data?.message || 'Error scheduling donation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await API.put(`/donations/${id}/status`, { status });
      fetchDataRef.current?.();
    } catch (error) {
      alert(error.response?.data?.message || `Error updating donation to ${status}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 border-amber-250 text-amber-800';
      case 'ACCEPTED': return 'bg-blue-100 border-blue-250 text-blue-800';
      case 'COMPLETED': return 'bg-emerald-100 border-emerald-250 text-emerald-800';
      case 'CANCELLED': return 'bg-rose-150 border-rose-250 text-rose-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusStep = (status) => {
    switch (status) {
      case 'PENDING': return 1;
      case 'ACCEPTED': return 2;
      case 'COMPLETED': return 3;
      default: return 0;
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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Leaf className="h-8 w-8 text-emerald-600" />
            <span>Donations Tracker</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Allocate surplus ingredients to help support local food initiatives.</p>
        </div>
        {user.role === 'RESTAURANT' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 self-start sm:self-auto"
          >
            <Plus className="h-5 w-5" />
            <span>Schedule Donation</span>
          </button>
        )}
      </div>

      {/* Schedule Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Schedule Food Donation</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleScheduleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {formError && (
              <div className="col-span-full bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-sm font-semibold flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700">Food Item</label>
              <select
                value={foodItemId}
                onChange={(e) => setFoodItemId(e.target.value)}
                required
                className="mt-1.5 block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              >
                <option value="">-- Choose Stock Item --</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.foodItemId}>
                    {item.foodItem.name} ({item.currentStock} {item.foodItem.unit} available)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Quantity to Donate (Optional)</label>
              <input
                type="number"
                step="any"
                value={quantityToDonate}
                onChange={(e) => setQuantityToDonate(e.target.value)}
                className="mt-1.5 block w-full px-3.5 py-2 border border-slate-300 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="Leave blank for entire stock"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Pickup Date & Time</label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1.5 block w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700">Pickup Address / Location Details</label>
              <input
                type="text"
                required
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="mt-1.5 block w-full px-3.5 py-2 border border-slate-300 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="Eco Café, 120 Pike St, Seattle, WA"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Latitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={pickupLat}
                  onChange={(e) => setPickupLat(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Longitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={pickupLng}
                  onChange={(e) => setPickupLng(e.target.value)}
                  className="mt-1.5 block w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
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
                {submitting ? 'Scheduling...' : 'Post Donation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Donations List Container */}
      <div className="space-y-6">
        {/* Filters */}
        {donations.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pb-2">
            {[
              { label: 'All', value: 'ALL' },
              { label: 'Pending', value: 'PENDING' },
              { label: 'Accepted', value: 'ACCEPTED' },
              { label: 'Completed', value: 'COMPLETED' },
              { label: 'Cancelled', value: 'CANCELLED' }
            ].map((tab) => {
              const isActive = statusFilter === tab.value;
              const count = tab.value === 'ALL' 
                ? donations.length 
                : donations.filter(d => d.status === tab.value).length;
              
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border flex items-center space-x-2 ${
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${
                    isActive ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {donations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center text-slate-400 font-semibold">
            No donations logged.
          </div>
        ) : filteredDonations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center text-slate-400 font-semibold">
            No {statusFilter.toLowerCase()} donations found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredDonations.map((d) => {
              const currentStep = getStatusStep(d.status);
              return (
                <div key={d.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col lg:flex-row justify-between gap-6 hover:shadow-md transition-shadow">
                  {/* Donation Info */}
                  <div className="space-y-3.5 flex-grow">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-bold text-slate-900">{d.foodItem.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(d.status)}`}>
                        {d.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                      <div>
                        <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Quantity</span>
                        <span className="text-sm font-semibold text-slate-800">{d.foodItem.quantity} {d.foodItem.unit}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Scheduled Pickup</span>
                        <span className="text-sm font-semibold text-slate-800 flex items-center space-x-1">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>{new Date(d.scheduledAt).toLocaleString()}</span>
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Pickup Location</span>
                        <span className="text-sm font-semibold text-slate-800 flex items-center space-x-1 max-w-xs truncate" title={d.pickupLocation}>
                          <MapPin className="h-4 w-4 text-emerald-500" />
                          <span>{d.pickupLocation}</span>
                        </span>
                      </div>
                    </div>

                    {/* Parties involved */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                      <div>
                        Donor:{' '}
                        <span className="text-slate-800 font-semibold">
                          {user.role === 'RESTAURANT' ? 'You' : d.donor?.name || 'Unknown'}
                        </span>
                      </div>
                      {d.recipient && (
                        <div>
                          Claimed by:{' '}
                          <span className="text-slate-800 font-semibold">
                            {d.recipientId === user.id ? 'You (NGO)' : d.recipient?.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Timeline */}
                  {d.status !== 'CANCELLED' && (
                    <div className="flex items-center space-x-2 self-center bg-slate-50 border border-slate-150 p-4 rounded-2xl">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${currentStep >= 1 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600'}`}>
                          {currentStep > 1 ? <Check className="h-4 w-4" /> : '1'}
                        </div>
                        <span className="text-xs font-bold text-slate-500 ml-1.5">Pending</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${currentStep >= 2 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600'}`}>
                          {currentStep > 2 ? <Check className="h-4 w-4" /> : '2'}
                        </div>
                        <span className="text-xs font-bold text-slate-500 ml-1.5">Accepted</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${currentStep >= 3 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600'}`}>
                          3
                        </div>
                        <span className="text-xs font-bold text-slate-500 ml-1.5">Completed</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex lg:flex-col items-stretch justify-center gap-2 lg:w-44 border-l border-slate-100 pl-0 lg:pl-6">
                    {user.role === 'NGO' && d.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus(d.id, 'ACCEPTED')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-2 px-4 rounded-xl flex items-center justify-center space-x-1 transition-all"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Accept Food</span>
                      </button>
                    )}

                    {user.role === 'NGO' && d.status === 'ACCEPTED' && d.recipientId === user.id && (
                      <button
                        onClick={() => handleUpdateStatus(d.id, 'COMPLETED')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-2 px-4 rounded-xl flex items-center justify-center space-x-1 transition-all"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Mark Picked Up</span>
                      </button>
                    )}

                    {/* Restaurant cancel option */}
                    {d.status !== 'COMPLETED' && d.status !== 'CANCELLED' && (d.donorId === user.id || user.role === 'ADMIN') && (
                      <button
                        onClick={() => handleUpdateStatus(d.id, 'CANCELLED')}
                        className="border border-rose-300 text-rose-700 font-bold text-sm py-2 px-4 rounded-xl hover:bg-rose-50 flex items-center justify-center space-x-1 transition-all"
                      >
                        <Ban className="h-4 w-4" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Donations;
