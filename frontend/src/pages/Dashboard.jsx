import React from 'react';
import { 
  Activity, 
  Database, 
  BarChart3, 
  Terminal, 
  Settings, 
  LogOut, 
  Zap 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataIngestion from '../components/DataIngestion';

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };
  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100"> {/* Dark theme for high-end data feel */}
      
      {/* Sidebar: The Control Panel */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-black text-indigo-400 tracking-tighter uppercase italic">InsightStream</h2>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 text-sm">
          <a href="#" className="flex items-center gap-3 p-3 bg-indigo-900/30 text-indigo-400 rounded-lg font-semibold border border-indigo-500/20">
            <Activity size={18} /> Live Streams
          </a>
          <a href="#" className="flex items-center gap-3 p-3 text-slate-400 hover:bg-slate-900 hover:text-white rounded-lg transition-all">
            <Database size={18} /> Data Sources
          </a>
          <a href="#" className="flex items-center gap-3 p-3 text-slate-400 hover:bg-slate-900 hover:text-white rounded-lg transition-all">
            <BarChart3 size={18} /> Analytics Models
          </a>
          <a href="#" className="flex items-center gap-3 p-3 text-slate-400 hover:bg-slate-900 hover:text-white rounded-lg transition-all">
            <Terminal size={18} /> Logs Terminal
          </a>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
           onClick={handleLogout}
           className="flex items-center gap-3 p-3 text-slate-500 hover:text-red-400 w-full transition-colors">
            <LogOut size={18} /> Exit System
          </button>
        </div>
      </aside>

      {/* Main Analysis Engine Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
            <p className="text-slate-400">Monitoring real-time intelligence streams.</p>
          </div>
          <div className="flex gap-4">
            <button className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all">
              <Zap size={16} /> New Analysis
            </button>
          </div>
        </header>

        {/* Real-Time Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">Processed Events</p>
            <p className="text-2xl font-mono">1,240,582</p>
          </div>
          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">Anomaly Score</p>
            <p className="text-2xl font-mono text-emerald-400">0.02%</p>
          </div>
          {/* More metrics... */}
        </div>

        {/* Empty State / Placeholder for Data Visualizations */}
        <div className="border-2 border-dashed border-slate-800 rounded-3xl h-64 flex items-center justify-center text-slate-600">
          <DataIngestion />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;