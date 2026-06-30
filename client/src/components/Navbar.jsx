import { useContext, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import { 
  Menu, X, LogOut, User, Leaf, BarChart2, MapPin, 
  ClipboardList, Package, Shield, Bell, CheckCircle, 
  AlertCircle, Info, Trash2
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchNotifications();
      // Poll every 15 seconds for real-time notifications
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await API.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await API.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return 'yesterday';
    return `${diffDays}d ago`;
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'SUCCESS':
        return CheckCircle;
      case 'WARNING':
        return AlertCircle;
      case 'DONATION':
        return Leaf;
      case 'INFO':
      default:
        return Info;
    }
  };

  const getNotifColors = (type) => {
    switch (type) {
      case 'SUCCESS':
        return { bg: 'bg-green-50 text-green-600', text: 'text-green-600' };
      case 'WARNING':
        return { bg: 'bg-rose-50 text-rose-600', text: 'text-rose-600' };
      case 'DONATION':
        return { bg: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600' };
      case 'INFO':
      default:
        return { bg: 'bg-blue-50 text-blue-600', text: 'text-blue-600' };
    }
  };

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // Set up navigation links based on role
  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: BarChart2, roles: ['ADMIN', 'RESTAURANT', 'NGO'] },
    { name: 'Inventory', path: '/inventory', icon: Package, roles: ['ADMIN', 'RESTAURANT'] },
    { name: 'Waste Log', path: '/waste-log', icon: ClipboardList, roles: ['ADMIN', 'RESTAURANT'] },
    { name: 'Donations', path: '/donations', icon: Leaf, roles: ['ADMIN', 'RESTAURANT', 'NGO'] },
    { name: 'Map', path: '/map', icon: MapPin, roles: ['ADMIN', 'RESTAURANT', 'NGO'] },
    { name: 'Analytics', path: '/analytics', icon: BarChart2, roles: ['ADMIN', 'RESTAURANT', 'NGO'] },
    { name: 'Admin Panel', path: '/admin', icon: Shield, roles: ['ADMIN'] },
  ];

  const filteredLinks = navLinks.filter(link => link.roles.includes(user.role));

  const roleColors = {
    ADMIN: 'bg-rose-100 text-rose-800 border-rose-200',
    RESTAURANT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    NGO: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2 text-emerald-600">
              <Leaf className="h-8 w-8 stroke-[2.5]" />
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                Food<span className="text-emerald-500">Management</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-4">
            {filteredLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive(link.path)
                      ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100/50'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>

          {/* User Profile & Logout */}
          <div className="hidden md:flex items-center space-x-4">
            
            {/* Notification Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) fetchNotifications();
                }}
                className="relative p-2 rounded-full text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-all duration-250 cursor-pointer"
                title="Notifications"
              >
                <Bell className="h-5.5 w-5.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 block h-4.5 w-4.5 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center border-2 border-white ring-2 ring-rose-500/25">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-45" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 animate-fade-in">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50/75">
                      <span className="text-sm font-extrabold text-slate-800">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length > 0 ? (
                        notifications.map((n) => {
                          const IconComponent = getNotifIcon(n.type);
                          const colors = getNotifColors(n.type);
                          return (
                            <div
                              key={n.id}
                              className={`flex items-start gap-3 p-3.5 transition-colors relative ${n.isRead ? 'bg-white hover:bg-slate-50/30' : 'bg-emerald-50/15 hover:bg-emerald-50/25'}`}
                            >
                              <div className={`p-1.5 rounded-lg shrink-0 ${colors.bg}`}>
                                <IconComponent className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0" onClick={() => !n.isRead && handleMarkAsRead(n.id)}>
                                <div className="flex justify-between items-start gap-1">
                                  <p className={`text-xs text-slate-900 leading-snug ${n.isRead ? 'font-medium' : 'font-bold'}`}>
                                    {n.title}
                                  </p>
                                  {!n.isRead && (
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0 mt-0.5" />
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                  {n.message}
                                </p>
                                <span className="text-[9px] text-slate-400 font-bold mt-1 block">
                                  {formatTimeAgo(n.createdAt)}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteNotification(n.id)}
                                className="text-slate-300 hover:text-rose-600 transition-colors p-1 shrink-0 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-12 text-center text-slate-400 text-xs font-bold">
                          No notifications yet.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200"></div>

            <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800">{user.name}</span>
                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${roleColors[user.role]}`}>
                  {user.role}
                </span>
              </div>
              <div className="bg-slate-100 p-2 rounded-full border border-slate-200">
                <User className="h-4 w-4 text-slate-600" />
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center space-x-2.5 md:hidden">
            {/* Mobile Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) fetchNotifications();
                }}
                className="relative p-2 rounded-full text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-all duration-250 cursor-pointer"
                title="Notifications"
              >
                <Bell className="h-5.5 w-5.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 block h-4.5 w-4.5 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-45" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-[-50px] mt-3 w-76 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 animate-fade-in">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/75">
                      <span className="text-sm font-extrabold text-slate-800">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                        >
                          Mark all
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length > 0 ? (
                        notifications.map((n) => {
                          const IconComponent = getNotifIcon(n.type);
                          const colors = getNotifColors(n.type);
                          return (
                            <div
                              key={n.id}
                              className={`flex items-start gap-2.5 p-3 transition-colors relative ${n.isRead ? 'bg-white hover:bg-slate-50/30' : 'bg-emerald-50/15 hover:bg-emerald-50/25'}`}
                            >
                              <div className={`p-1 rounded-lg shrink-0 ${colors.bg}`}>
                                <IconComponent className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex-1 min-w-0" onClick={() => !n.isRead && handleMarkAsRead(n.id)}>
                                <div className="flex justify-between items-start gap-1">
                                  <p className={`text-xs text-slate-900 leading-snug truncate ${n.isRead ? 'font-medium' : 'font-bold'}`}>
                                    {n.title}
                                  </p>
                                  {!n.isRead && (
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-0.5" />
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                                  {n.message}
                                </p>
                                <span className="text-[8px] text-slate-400 font-bold mt-1 block">
                                  {formatTimeAgo(n.createdAt)}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteNotification(n.id)}
                                className="text-slate-300 hover:text-rose-600 transition-colors p-1 shrink-0 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-8 text-center text-slate-400 text-xs font-bold">
                          No notifications yet.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-50 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-2 pt-2 pb-4 space-y-1 shadow-inner">
          {filteredLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-semibold ${
                  isActive(link.path)
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{link.name}</span>
              </Link>
            );
          })}
          
          {/* Mobile Profile & Logout */}
          <div className="pt-4 pb-2 border-t border-slate-100 mt-2 px-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-slate-100 p-2 rounded-full border border-slate-200">
                <User className="h-5 w-5 text-slate-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">{user.name}</span>
                <span className={`text-[10px] uppercase font-bold self-start px-2 py-0.5 rounded-full border ${roleColors[user.role]}`}>
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 p-2 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="h-5 w-5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
