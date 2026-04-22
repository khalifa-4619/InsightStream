import React, { useState, useEffect } from 'react';
import { 
  Activity, Database, BarChart3, Terminal, 
  X, FileText, ChevronRight, LogOut 
} from 'lucide-react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import DataIngestion from '../components/DataIngestion';
import Sidebar from '../components/Sidebar';

const Dashboard = () => {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const navigate = useNavigate();

  const fetchDatasets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://127.0.0.1:8000/datasets/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDatasets(response.data);
    } catch (err) {
      console.error("Failed to fetch datasets", err);
    }
  };

  useEffect(() => { fetchDatasets(); }, []);


  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100 relative"> 
     <Sidebar />
      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
            <p className="text-slate-400">Monitoring real-time intelligence streams.</p>
          </div>
        </header>

        <div className="bg-slate-800/20 border-2 border-dashed border-slate-800 rounded-3xl p-8 mb-12">
          <DataIngestion onUploadSuccess={fetchDatasets}/>
        </div>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-200">
              <Database className="text-indigo-400" size={20} /> Active Data Sources
              <span className="ml-4 text-[10px] font-mono bg-slate-800 px-2 py-1 rounded text-slate-500">{datasets.length} Objects Synced</span>
            </h2>
          </div>

          {datasets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {datasets.map((ds) => (
                <div key={ds.id} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl hover:border-indigo-500/50 transition-all group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                      <FileText size={20} />
                    </div>
                    <span className="text-[10px] uppercase font-black bg-slate-800 text-slate-400 px-2 py-1 rounded">
                      {ds.file_typ || 'CSV'}
                    </span>
                  </div>
                  <h3 className="font-bold truncate text-slate-100 mb-1">{ds.filename}</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {ds.summary_stats?.row_count || 0} rows detected
                  </p>
                  <button 
                    onClick={() => setSelectedDataset(ds)}
                    className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white text-xs font-bold rounded-lg transition-all border border-indigo-500/20"
                  >
                    OPEN ANALYSIS
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800">
              <p className="text-slate-500 italic">No data streams connected yet.</p>
            </div>
          )}
        </section>
      </main>

      {/* --- ANALYSIS DETAIL DRAWER --- */}
      {selectedDataset && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedDataset(null)} />
          <div className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedDataset.filename}</h2>
                <p className="text-indigo-400 text-sm font-mono tracking-wider">Engine: Analysis v1.0</p>
              </div>
              <button onClick={() => setSelectedDataset(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
               <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 text-center">
                  <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Rows</p>
                  <p className="text-xl font-mono">{selectedDataset.summary_stats.row_count}</p>
               </div>
               <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 text-center">
                  <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Columns</p>
                  <p className="text-xl font-mono">{selectedDataset.summary_stats.column_count}</p>
               </div>
               <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 text-center">
                  <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Weight</p>
                  <p className="text-xl font-mono">{selectedDataset.summary_stats.file_size_kb} KB</p>
               </div>
            </div>

            {/* Schema Mapping */}
            <div className="mb-8">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Terminal size={14} /> Schema Mapping
              </h3>
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-900/50 text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Key Name</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Missing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 font-mono">
                    {Object.entries(selectedDataset.summary_stats.data_types).map(([col, type]) => (
                      <tr key={col} className="hover:bg-slate-800/20">
                        <td className="px-4 py-3 text-slate-300">{col}</td>
                        <td className="px-4 py-3 text-indigo-400 italic">{type}</td>
                        <td className="px-4 py-3 text-right text-orange-400">{selectedDataset.summary_stats.missing_values[col]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* JSON Stream View */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText size={14} /> Data Stream Preview
              </h3>
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                <pre className="text-[10px] text-slate-400 leading-relaxed font-mono whitespace-pre-wrap">
                  {JSON.stringify(selectedDataset.summary_stats.preview, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;