import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, TerminalSquare, Terminal, History, Database, LineChart, Settings, Bell, Search, LogOut, Bookmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },

  { icon: TerminalSquare, label: 'SQL Generator', path: '/generator' },
  { icon: Terminal, label: 'SQL Terminal', path: '/terminal' },
  { icon: History, label: 'Query History', path: '/history' },
  { icon: Bookmark, label: 'Saved Queries', path: '/saved-queries' },

];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Successfully logged out!');
    navigate('/auth/login');
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0 transition-all duration-300 z-20">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20 mr-3">
            S
          </div>
          <span className="text-lg font-bold tracking-tight">QueryGen AI</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <Settings className="w-5 h-5 mr-3 shrink-0" />
            Settings
          </NavLink>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center text-sm text-muted-foreground">
            {/* Placeholder for Breadcrumbs or Dynamic Title */}
            <span>Overview</span>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
            </button>
            <div className="flex items-center space-x-3">
              {user?.picture ? (
                <img src={user.picture} alt="Profile" className="w-8 h-8 rounded-full border border-border" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-medium">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
              <span className="text-sm font-medium hidden md:block">{user?.name || 'User'}</span>
            </div>
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className={`flex-1 overflow-y-auto ${location.pathname === '/terminal' ? 'p-0' : 'p-8'}`}>
          <div className={`w-full h-full ${location.pathname === '/terminal' ? '' : 'max-w-7xl mx-auto'}`}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Log Out"
        message="Are you sure you want to log out? You will need to sign in again to access your dashboard."
        confirmText="Log Out"
        cancelText="Cancel"
      />
    </div>
  );
}
