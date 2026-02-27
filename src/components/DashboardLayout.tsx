import React from 'react';
import { 
  BarChart3, 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Search, 
  Bell, 
  Menu,
  ChevronRight,
  Briefcase,
  FileText,
  Code,
  MessageSquare,
  Brain // Added Brain icon for Aptitude Test
} from 'lucide-react';
import { useAuthStore } from '../store/useStore';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  // Added Aptitude Test to the student navigation array
  const studentNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Mock Marathon', path: '/mock-marathon', icon: Briefcase },
    { name: 'Resume Analyzer', path: '/resume', icon: FileText },
    { name: 'Aptitude Test', path: '/aptitude', icon: Brain }, // <-- Added Here
    { name: 'Coding Lab', path: '/coding', icon: Code },
    { name: 'HR Interview', path: '/hr', icon: MessageSquare },
  ];

  const adminNav = [
    { name: 'Overview', path: '/admin', icon: BarChart3 },
    { name: 'Student Analytics', path: '/admin/students', icon: Users },
    { name: 'CMS', path: '/admin/cms', icon: Settings },
  ];

  const navItems = user?.role === 'admin' ? adminNav : studentNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white border-r border-zinc-200 flex flex-col sticky top-0 h-screen z-30"
      >
        <div className="p-6 flex items-center justify-between">
          <div className={cn("flex items-center gap-3", !isSidebarOpen && "hidden")}>
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">I</span>
            </div>
            <span className="font-bold text-xl tracking-tight">IntervAI</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group",
                  isActive 
                    ? "bg-emerald-50 text-emerald-700" 
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-emerald-600" : "group-hover:text-zinc-900")} />
                {isSidebarOpen && <span className="font-medium">{item.name}</span>}
                {isActive && isSidebarOpen && (
                  <motion.div 
                    layoutId="active-nav"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-zinc-100">
          <button 
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-all",
              !isSidebarOpen && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-white border-b border-zinc-200 px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search tests, companies, or students..." 
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 text-zinc-500 hover:bg-zinc-100 rounded-full transition-all">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-px bg-zinc-200" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-zinc-900">{user?.name}</p>
                <p className="text-xs text-zinc-500 capitalize">{user?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border-2 border-white shadow-sm">
                {user?.name?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}