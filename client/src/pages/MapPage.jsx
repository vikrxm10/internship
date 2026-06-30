import { useState, useEffect, useContext, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { MapPin, Info, Calendar, User, Package, CheckCircle } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Vite leaflet icon resolution issues
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const MapPage = () => {
  const { user } = useContext(AuthContext);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAvailableDonationsRef = useRef(null);
  useEffect(() => {
    const impl = async () => {
      try {
        const res = await API.get('/donations/available');
        setDonations(res.data);
      } catch (error) {
        console.error('Error fetching available donations for map:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAvailableDonationsRef.current = impl;
    impl();
  }, []);

  const handleAcceptDonation = async (id) => {
    try {
      await API.put(`/donations/${id}/status`, { status: 'ACCEPTED' });
      alert('Donation claimed successfully!');
      fetchAvailableDonationsRef.current?.();
    } catch (error) {
      alert(error.response?.data?.message || 'Error claiming donation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Default coordinates to center map (e.g. New York)
  const defaultCenter = [40.7128, -74.0060];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
          <MapPin className="h-8 w-8 text-emerald-600" />
          <span>Donation Pickup Map</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore geolocated pins showing current food donations pending rescue.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar directory */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 max-h-[450px] overflow-y-auto">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Available Food</h3>
          {donations.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium">No donations currently available.</p>
          ) : (
            <div className="space-y-3">
              {donations.map((d) => (
                <div key={d.id} className="p-3 border border-slate-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50/20 transition-all text-xs space-y-1">
                  <h4 className="font-bold text-slate-800">{d.foodItem.name}</h4>
                  <p className="text-slate-500">Qty: {d.foodItem.quantity} {d.foodItem.unit}</p>
                  <p className="text-slate-500 font-semibold">{d.donor?.name}</p>
                  <p className="text-slate-400 truncate">{d.pickupLocation}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="lg:col-span-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <MapContainer 
            center={donations.length > 0 ? [donations[0].pickupLat, donations[0].pickupLng] : defaultCenter} 
            zoom={12} 
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {donations.map((d) => (
              <Marker key={d.id} position={[d.pickupLat, d.pickupLng]}>
                <Popup>
                  <div className="p-1 space-y-2 text-slate-800" style={{ minWidth: '180px' }}>
                    <div className="font-bold text-base border-b border-slate-100 pb-1 text-slate-900 flex items-center space-x-1.5">
                      <Package className="h-4 w-4 text-emerald-600" />
                      <span>{d.foodItem.name}</span>
                    </div>
                    
                    <div className="text-xs space-y-1.5 font-medium text-slate-600">
                      <p className="flex items-center space-x-1.5">
                        <Info className="h-3.5 w-3.5 text-slate-400" />
                        <span>Quantity: <b>{d.foodItem.quantity} {d.foodItem.unit}</b></span>
                      </p>
                      <p className="flex items-center space-x-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>Donor: {d.donor?.name}</span>
                      </p>
                      <p className="flex items-center space-x-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>Date: {new Date(d.scheduledAt).toLocaleDateString()}</span>
                      </p>
                      <p className="flex items-start space-x-1.5">
                        <MapPin className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="leading-tight">{d.pickupLocation}</span>
                      </p>
                    </div>

                    {user.role === 'NGO' && (
                      <button
                        onClick={() => handleAcceptDonation(d.id)}
                        className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center space-x-1 transition-all"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Claim Donation</span>
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
