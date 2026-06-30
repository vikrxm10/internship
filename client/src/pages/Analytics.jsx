import { useState, useEffect } from 'react';
import API from '../api/axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { BarChart2, TrendingUp, CheckCircle2, ShieldAlert, PieChart as PieIcon } from 'lucide-react';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

const Analytics = () => {
  const [wasteSummary, setWasteSummary] = useState({ categories: [], weeklyTrend: [] });
  const [donationStats, setDonationStats] = useState({ total: 0, counts: {}, completionRate: 0 });
  const [topWasted, setTopWasted] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [wasteRes, donRes, topRes] = await Promise.all([
          API.get('/analytics/waste-summary'),
          API.get('/analytics/donation-stats'),
          API.get('/analytics/top-wasted')
        ]);
        setWasteSummary(wasteRes.data);
        setDonationStats(donRes.data);
        setTopWasted(topRes.data);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

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
          <BarChart2 className="h-8 w-8 text-emerald-600" />
          <span>System Analytics</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">Review aggregated waste levels, categories distribution, and donation milestones.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Rescue Completion Rate</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{donationStats.completionRate}%</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Total System Donations</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{donationStats.total} times</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <TrendingUp className="h-8 w-8" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Active Collections</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">
              {(donationStats.counts?.ACCEPTED || 0) + (donationStats.counts?.PENDING || 0)} cases
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <ShieldAlert className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Trend Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <BarChart2 className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">Weekly Waste Trend</h3>
          </div>
          <div className="h-80 w-full">
            {wasteSummary.weeklyTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium">No waste data logged in the last 7 days.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wasteSummary.weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                  <Bar dataKey="quantity" name="Waste Quantity" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Waste Categories Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <PieIcon className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">Waste by Food Category</h3>
          </div>
          <div className="h-80 w-full flex flex-col sm:flex-row items-center justify-center">
            {wasteSummary.categories.length === 0 ? (
              <div className="text-slate-400 font-medium">No category waste data recorded yet.</div>
            ) : (
              <>
                <div className="h-64 w-64 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={wasteSummary.categories}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="totalWasted"
                        nameKey="category"
                      >
                        {wasteSummary.categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col space-y-2 mt-4 sm:mt-0 sm:ml-6 font-semibold text-sm text-slate-700">
                  {wasteSummary.categories.map((entry, index) => (
                    <div key={entry.category} className="flex items-center space-x-2">
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      <span>{entry.category}: {entry.totalWasted.toFixed(1)} units</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Top Discarded Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <span>Top 5 Discarded Food Items</span>
        </h3>
        {topWasted.length === 0 ? (
          <p className="text-slate-400 text-sm font-medium">No waste reports recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr>
                  <th className="text-left py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Food Item Name</th>
                  <th className="text-right py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Total Discarded Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topWasted.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 text-sm font-bold text-slate-800">{item.name}</td>
                    <td className="py-3 text-right text-sm font-bold text-rose-600">
                      {item.quantity.toFixed(1)} units
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

export default Analytics;
