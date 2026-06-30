import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  Leaf, Mail, Shield, Heart, Globe, 
  BarChart2, Package, ClipboardList, MapPin 
} from 'lucide-react';

const Footer = () => {
  const { user } = useContext(AuthContext);

  // Hide footer on public routes (Login/Register)
  if (!user) return null;

  const currentYear = new Date().getFullYear();

  // Navigation Links matching user role
  const footerLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: BarChart2, roles: ['ADMIN', 'RESTAURANT', 'NGO'] },
    { name: 'Inventory', path: '/inventory', icon: Package, roles: ['ADMIN', 'RESTAURANT'] },
    { name: 'Waste Log', path: '/waste-log', icon: ClipboardList, roles: ['ADMIN', 'RESTAURANT'] },
    { name: 'Donations', path: '/donations', icon: Leaf, roles: ['ADMIN', 'RESTAURANT', 'NGO'] },
    { name: 'Map Tracker', path: '/map', icon: MapPin, roles: ['ADMIN', 'RESTAURANT', 'NGO'] },
    { name: 'Analytics', path: '/analytics', icon: BarChart2, roles: ['ADMIN', 'RESTAURANT', 'NGO'] },
  ];

  const filteredLinks = footerLinks.filter(link => link.roles.includes(user.role));

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto shadow-inner">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-100">
          
          {/* Brand & Mission Column */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center space-x-2 text-emerald-600">
              <Leaf className="h-7 w-7 stroke-[2.5]" />
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                Wast<span className="text-emerald-500">Management</span>
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed max-w-md">
              Connecting restaurants, vendors, and community kitchens to prevent food waste, support local initiatives, and protect our environment. Saving food is saving the planet.
            </p>
            
            {/* Impact Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100/60">
              <Heart className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
              <span>Rescuing Food & Minimizing Waste</span>
            </div>
          </div>

          {/* Platform Quick Links Column */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Quick Navigation
            </h4>
            <ul className="space-y-2">
              {filteredLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.path}>
                    <Link 
                      to={link.path}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{link.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Support & Resources Column */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Platform & Support
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a 
                  href="mailto:support@wastemanagement.org" 
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Support Center</span>
                </a>
              </li>
              <li>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 cursor-default">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Secured JWT Protection</span>
                </div>
              </li>
              <li>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 cursor-default">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Neon Serverless Database</span>
                </div>
              </li>
            </ul>
            
            {/* Social Icons */}
            <div className="flex items-center space-x-3.5 pt-2">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noreferrer"
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="GitHub Repository"
              >
                <Globe className="h-4.5 w-4.5" />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 text-xs font-semibold text-slate-400">
          <p>© {currentYear} WastManagement. All rights reserved.</p>
          <div className="flex items-center space-x-4 mt-2 sm:mt-0">
            <span className="hover:text-slate-600 cursor-pointer">Terms of Service</span>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
            <span className="hover:text-slate-600 cursor-pointer">Privacy Policy</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
