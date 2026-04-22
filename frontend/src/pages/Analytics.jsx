import React, { useState, useEffect } from 'react';
import { 
  Wand2, BarChart3, BrainCircuit, Terminal, 
  Search, ShieldCheck, Database, Layout, 
  ArrowRight, CheckCircle2, AlertCircle, FileText
} from 'lucide-react';
import axios from 'axios';
import Sidebar from '../components/Sidebar'; // Assuming you've extracted your Sidebar

const Analytics = () => {
  const [datasets, setDatasets] = useState([]);
  const [selectedDs, setSelectedDs] = useState(null);
  const [activeTab, setActiveTab] = useState('laundry'); // laundry, eda, ml
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://127.0.0.1:8000/datasets/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDatasets(response.data);
      } catch (err) {
        console.error("Fetch failed", err);
      }
    };
    fetchDatasets();
  }, []);

  // Backend Integration
  const runOperation = async (taskType) => {
  if (!selectedDs) return;
  
  setLoading(true);
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `http://127.0.0.1:8000/api/process/${selectedDs.id}?task=${taskType}`,
      {}, // Empty body because we use query params
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // If we just cleaned the data, update the UI stats!
    if (taskType === 'clean') {
      setSelectedDs({
        ...selectedDs,
        summary_stats: {
          ...selectedDs.summary_stats,
          missing_values: response.data.nulls_remaining, // Should be 0 now!
          preview: response.data.preview
        }
      });
      alert("System Refined: Missing values handled and data normalized.");
    }
    
    // For EDA, you would store this in a different state to show charts
    console.log("Analysis Result:", response.data);

  } catch (err) {
    console.error("Engine Failure:", err);
    alert("Check terminal: Processor encountered an error.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2 text-indigo-400">
            <Layout size={18} />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Engineering Suite</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Analytics Laboratory</h1>
          <p className="text-slate-400 mt-1">Select a data stream to begin refining intelligence.</p>
        </header>

        <div className="grid grid-cols-12 gap-8">
          
          {/* --- LEFT: DATASET SELECTOR --- */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Source Streams</h3>
              <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 font-mono">{datasets.length}</span>
            </div>
            
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              {datasets.map((ds) => (
                <button
                  key={ds.id}
                  onClick={() => setSelectedDs(ds)}
                  className={`w-full p-4 rounded-xl border text-left transition-all group ${
                    selectedDs?.id === ds.id 
                    ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedDs?.id === ds.id ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <FileText size={16} />
                    </div>
                    <div className="overflow-hidden">
                      <p className={`text-sm font-bold truncate ${selectedDs?.id === ds.id ? 'text-white' : 'text-slate-300'}`}>
                        {ds.filename}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">{ds.summary_stats?.row_count} rows</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* --- RIGHT: THE LABORATORY WORKSPACE --- */}
          <div className="col-span-12 lg:col-span-9">
            {!selectedDs ? (
              <div className="h-[60vh] rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-center p-8 bg-slate-900/40">
                <div className="p-4 bg-slate-800/50 rounded-full mb-4">
                  <Database size={40} className="text-slate-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-300">No Stream Selected</h2>
                <p className="text-slate-500 text-sm mt-2 max-w-xs">
                  Please select a dataset from the left panel to begin processing and modeling.
                </p>
              </div>
            ) : (
              <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden min-h-[70vh] flex flex-col">
                
                {/* Lab Navigation */}
                <div className="flex border-b border-slate-800 bg-slate-950/50">
                  <button 
                    onClick={() => setActiveTab('laundry')}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'laundry' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Wand2 size={16} /> Data Laundry
                  </button>
                  <button 
                    onClick={() => setActiveTab('eda')}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'eda' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <BarChart3 size={16} /> EDA Engine
                  </button>
                  <button 
                    className="flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider text-slate-700 cursor-not-allowed group relative"
                  >
                    <BrainCircuit size={16} /> ML Models
                    <span className="absolute top-2 right-4 text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">PREMIUM</span>
                  </button>
                </div>

                {/* Lab Workspace Content */}
                <div className="p-8 flex-1">
                  
                  {/* DATA LAUNDRY VIEW */}
                  {activeTab === 'laundry' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold">Sanitization Suite</h3>
                          <p className="text-slate-400 text-sm">Prepare your raw logs for statistical modeling.</p>
                        </div>
                        <button 
                          onClick={() => runOperation('clean')}
                          disabled={loading}
                          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                          {loading ? "Processing..." : "Run Global Cleanse"} <ArrowRight size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800/50 transition-colors cursor-pointer group">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-slate-200">Handle Missing Values</h4>
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-all">
                              <ShieldCheck size={14} />
                            </div>
                          </div>
                          <p className="text-xs text-slate-500">Automatically fill nulls using Mean/Median or drop empty rows.</p>
                        </div>
                        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800/50 transition-colors cursor-pointer group">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-slate-200">Outlier Suppression</h4>
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-all">
                              <AlertCircle size={14} />
                            </div>
                          </div>
                          <p className="text-xs text-slate-500">Identify and isolate data points that skew statistical results.</p>
                        </div>
                      </div>

                      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Terminal size={14} /> Processing Log
                        </h4>
                        <div className="font-mono text-[11px] space-y-1 text-slate-400">
                          <p className="text-emerald-500">READY: System initialized for {selectedDs.filename}</p>
                          <p>{'>'} Analysis pending user instruction...</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* EDA ENGINE VIEW */}
                  {activeTab === 'eda' && (
                    <div className="flex flex-col items-center justify-center h-full py-20 animate-in fade-in duration-500 text-center">
                       <BarChart3 size={48} className="text-indigo-500/20 mb-4" />
                       <h3 className="text-lg font-bold">Visual Analysis Engine</h3>
                       <button 
                            onClick={() => runOperation('univariate')}
                            className="mt-6 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all"
                        >
                            Run Statistical Analysis <ArrowRight size={18} />
                        </button>

                        <p className="text-slate-500 text-sm max-w-sm mt-4">
                            This will generate univariate and bivariate trends for {selectedDs.filename}.
                        </p>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default Analytics;