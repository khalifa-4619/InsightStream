import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Activity, Database, BarChart3, Terminal, LogOut } from 'lucide-react';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation(); // This tells us the current URL

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    // Helper function to set styles based on current path
    const getLinkStyle = (path) => {
        const isActive = location.pathname === path;
        return `flex items-center gap-3 p-3 rounded-lg transition-all font-semibold border ${
            isActive 
            ? 'bg-indigo-900/30 text-indigo-400 border-indigo-500/20' 
            : 'text-slate-400 hover:bg-slate-900 hover:text-white border-transparent'
        }`;
    };

    return (
        <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col sticky top-0 h-screen shrink-0">
            <div className="p-6">
                <h2 className="text-xl font-black text-indigo-400 tracking-tighter uppercase italic">InsightStream</h2>
            </div>

            <nav className="flex-1 px-4 space-y-2 text-sm">
                <Link to="/dashboard" className={getLinkStyle('/dashboard')}>
                    <Activity size={18} /> Live Streams
                </Link>
                
                <Link to="/data-sources" className={getLinkStyle('/data-sources')}>
                    <Database size={18} /> Data Sources
                </Link>

                <Link to="/analytics" className={getLinkStyle('/analytics')}>
                    <BarChart3 size={18} /> Analytics Models
                </Link>
                
                <a href="#" className="flex items-center gap-3 p-3 text-slate-400 hover:bg-slate-900 hover:text-white rounded-lg transition-all">
                    <Terminal size={18} /> Logs Terminal
                </a>
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button onClick={handleLogout} className="flex items-center gap-3 p-3 text-slate-500 hover:text-red-400 w-full transition-colors">
                    <LogOut size={18} /> Exit System
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;