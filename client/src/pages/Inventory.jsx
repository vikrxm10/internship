import { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import { 
  Package, Plus, Search, AlertCircle, Edit,
  Calendar, Check, X, ShieldAlert, AlertTriangle
} from 'lucide-react';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState({ lowStock: [], expiringSoon: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editStock, setEditStock] = useState('');
  const [editMinStockAlert, setEditMinStockAlert] = useState('');
  
  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Produce');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [expiryDate, setExpiryDate] = useState('');
  const [minStockAlert, setMinStockAlert] = useState('5');
  const [formError, setFormError] = useState('');

  const fetchInventoryRef = useRef(null);
  useEffect(() => {
    const impl = async () => {
      try {
        const [invRes, alertRes] = await Promise.all([
          API.get('/inventory'),
          API.get('/inventory/alerts')
        ]);
        setInventory(invRes.data);
        setAlerts(alertRes.data);
      } catch (error) {
        console.error('Error fetching inventory:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInventoryRef.current = impl;
    impl();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name || !category || !quantity || !unit || !expiryDate) {
      setFormError('Please fill in all fields.');
      return;
    }

    try {
      await API.post('/inventory', {
        name,
        category,
        quantity: parseFloat(quantity),
        unit,
        expiryDate,
        minStockAlert: parseFloat(minStockAlert)
      });

      // Clear Form
      setName('');
      setCategory('Produce');
      setQuantity('');
      setUnit('kg');
      setExpiryDate('');
      setMinStockAlert('5');
      setShowAddForm(false);
      
      // Refresh
      fetchInventoryRef.current?.();
    } catch (error) {
      setFormError(error.response?.data?.message || 'Error adding item.');
    }
  };

  const handleUpdateStock = async (e, invId) => {
    e.preventDefault();
    try {
      await API.put(`/inventory/${invId}`, {
        currentStock: parseFloat(editStock),
        minStockAlert: parseFloat(editMinStockAlert)
      });
      setEditingItem(null);
      fetchInventoryRef.current?.();
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating item.');
    }
  };

  const startEdit = (item) => {
    setEditingItem(item.id);
    setEditStock(item.currentStock);
    setEditMinStockAlert(item.minStockAlert);
  };

  const filteredInventory = inventory.filter(item => 
    item.foodItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.foodItem.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Package className="h-8 w-8 text-emerald-600" />
            <span>Food Inventory</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Track surplus foods and manage stock levels.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 self-start sm:self-auto"
        >
          <Plus className="h-5 w-5" />
          <span>Add Food Item</span>
        </button>
      </div>

      {/* Expiry and Stock Banners */}
      {(alerts.lowStock.length > 0 || alerts.expiringSoon.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {alerts.lowStock.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-5 flex items-start space-x-3.5 shadow-sm">
              <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-base">Low Stock Alert</h4>
                <p className="text-sm text-amber-800 mt-1">The following items are running low:</p>
                <ul className="list-disc list-inside mt-2 text-sm text-amber-850 font-medium space-y-1">
                  {alerts.lowStock.map(item => (
                    <li key={item.id}>
                      {item.foodItem.name} (<span className="font-bold">{item.currentStock} {item.foodItem.unit}</span> left)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {alerts.expiringSoon.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-5 flex items-start space-x-3.5 shadow-sm">
              <ShieldAlert className="h-6 w-6 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-base">Expiry Alert</h4>
                <p className="text-sm text-rose-800 mt-1">Items expiring within 3 days:</p>
                <ul className="list-disc list-inside mt-2 text-sm text-rose-850 font-medium space-y-1">
                  {alerts.expiringSoon.map(item => (
                    <li key={item.id}>
                      {item.foodItem.name} (expires: <span className="font-bold">{new Date(item.foodItem.expiryDate).toLocaleDateString()}</span>)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Item Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Add New Food Item</h3>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {formError && (
              <div className="col-span-full bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-sm font-semibold flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700">Food Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 block w-full px-3.5 py-2 border border-slate-300 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="Fresh Organic Carrots"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              >
                <option value="Produce">Produce (Fruit/Veg)</option>
                <option value="Bakery">Bakery</option>
                <option value="Dairy">Dairy</option>
                <option value="Meat">Meat & Poultry</option>
                <option value="Meals">Prepared Meals</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Expiry Date</label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="mt-1.5 block w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Initial Quantity</label>
              <input
                type="number"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1.5 block w-full px-3.5 py-2 border border-slate-300 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="20"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Unit</label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-1.5 block w-full px-3.5 py-2 border border-slate-300 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="kg, lbs, portions"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Min. Stock Alert Level</label>
              <input
                type="number"
                step="any"
                required
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
                className="mt-1.5 block w-full px-3.5 py-2 border border-slate-300 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="5"
              />
            </div>

            <div className="col-span-full flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="border border-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors shadow-sm"
              >
                Save Food
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Search Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center">
          <div className="relative rounded-xl max-w-md w-full shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              placeholder="Search inventory by name or category..."
            />
          </div>
        </div>

        {/* Data Table */}
        {filteredInventory.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">
            {searchTerm ? 'No matching food items found.' : 'Your inventory is currently empty.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-150">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className="text-left py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Food Name</th>
                  <th className="text-left py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="text-left py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Stock Level</th>
                  <th className="text-left py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Min. Alert</th>
                  <th className="text-left py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Expiry Date</th>
                  <th className="text-right py-3.5 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((item) => {
                  const isEditing = editingItem === item.id;
                  const isLow = item.currentStock <= item.minStockAlert;
                  const daysToExpiry = Math.ceil((new Date(item.foodItem.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                  const isExpiring = daysToExpiry <= 3;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4.5 px-6 text-sm font-bold text-slate-900">
                        <div>
                          <span>{item.foodItem.name}</span>
                          {isLow && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 border border-amber-200 text-amber-800">
                              Low
                            </span>
                          )}
                          {isExpiring && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 border border-rose-200 text-rose-800">
                              {daysToExpiry <= 0 ? 'Expired' : `${daysToExpiry}d left`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4.5 px-6 text-sm text-slate-600 font-semibold">{item.foodItem.category}</td>
                      <td className="py-4.5 px-6 text-sm">
                        {isEditing ? (
                          <input
                            type="number"
                            step="any"
                            value={editStock}
                            onChange={(e) => setEditStock(e.target.value)}
                            className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        ) : (
                          <span className={`font-semibold ${isLow ? 'text-amber-600 font-bold' : 'text-slate-800'}`}>
                            {item.currentStock} {item.foodItem.unit}
                          </span>
                        )}
                      </td>
                      <td className="py-4.5 px-6 text-sm">
                        {isEditing ? (
                          <input
                            type="number"
                            step="any"
                            value={editMinStockAlert}
                            onChange={(e) => setEditMinStockAlert(e.target.value)}
                            className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        ) : (
                          <span className="text-slate-500">{item.minStockAlert} {item.foodItem.unit}</span>
                        )}
                      </td>
                      <td className="py-4.5 px-6 text-sm text-slate-500 font-medium">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span>{new Date(item.foodItem.expiryDate).toLocaleDateString()}</span>
                        </span>
                      </td>
                      <td className="py-4.5 px-6 text-right text-sm font-semibold">
                        {isEditing ? (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={(e) => handleUpdateStock(e, item.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              title="Save"
                            >
                              <Check className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setEditingItem(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg"
                              title="Cancel"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            className="text-emerald-600 hover:text-emerald-700 p-1.5 hover:bg-slate-100 rounded-xl inline-flex items-center space-x-1"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit Stock</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
