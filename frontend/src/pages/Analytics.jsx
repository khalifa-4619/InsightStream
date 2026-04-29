import React, { useState, useEffect } from 'react';
import {
  Wand2, BarChart3, BrainCircuit, Terminal,
  Search, ShieldCheck, Database, Layout,
  ArrowRight, CheckCircle2, AlertCircle, FileText,
} from 'lucide-react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import DistributionChart from '../components/DistributionChart';
import GlobalInsightCard from '../components/GlobalInsight';
import domtoimage from 'dom-to-image-more';
import { toast } from "sonner"
import { scale, transform } from 'framer-motion';

const Analytics = () => {
  const [datasets, setDatasets] = useState([]);
  const [selectedDs, setSelectedDs] = useState(null);
  const [activeTab, setActiveTab] = useState('laundry');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [correlationData, setCorrelationData] = useState(null);
  const [globalInsights, setGlobalInsights] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  
  // Track if recommendations have been applied
  const [recommendationsApplied, setRecommendationsApplied] = useState(false);

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

  // Reset everything when selecting a new dataset
  useEffect(() => {
    console.log('🔄 Dataset changed, resetting all states');
    setRecommendationsApplied(false);
    setAnalysisResult(null);
    setGlobalInsights(null);
    setRecommendations([]);
    setCorrelationData(null);
  }, [selectedDs]);

  // Backend Integration
  const runOperation = async (taskType, payload = {}) => {
    if (!selectedDs) return;

    console.log(`🚀 Starting operation: ${taskType}`, { payload });
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("No token found");
        return;
      }

      const response = await axios.post(
        `http://127.0.0.1:8000/api/process/${selectedDs.id}?task=${taskType}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log(`✅ Response received for ${taskType}:`, response.data);

      if (taskType === 'clean') {
        setSelectedDs({
          ...selectedDs,
          summary_stats: {
            ...selectedDs.summary_stats,
            missing_values: response.data.nulls_remaining,
            preview: response.data.preview
          }
        });
        toast.success("System Refined: Missing values handled and data normalized.");
        
      } else if (taskType === 'univariate') {
        console.log('📊 Setting univariate data and insights');
        setAnalysisResult({
          univariate: response.data.univariate,
        });
        setGlobalInsights(response.data?.global_insights || null);
        const recs = response.data?.global_insights?.recommendations || [];
        console.log('💡 Recommendations found:', recs.length);
        setRecommendations(recs);
        setCorrelationData(null);
        toast.success("Analysis complete");
        
      } else if (taskType === 'bivariate') {
        console.log('🔗 Setting correlation data');
        setAnalysisResult(null);
        setCorrelationData(response.data);
        
      } else if (taskType === "apply_recommendations") {
          console.log('🎯 Apply recommendations response:', response.data);
          toast.success("Recommendations applied successfully 🎯");

          // Update the analysis result with data from the response
          if (response.data.univariate) {
            setAnalysisResult({
              univariate: response.data.univariate,
            });
          }
          
          // Update global insights with new health score
          if (response.data.global_insights) {
            setGlobalInsights(response.data.global_insights);
            
            const newScore = response.data.global_insights.data_quality_score || 0;
            const remainingRecs = response.data.global_insights.recommendations || [];
            const remainingIssues = response.data.global_insights.top_issues || [];
            
            console.log('📊 New Score:', newScore);
            console.log('📊 Remaining recommendations:', remainingRecs.length);
            
            // ✨ Auto-disable logic: Score > 80% OR no more critical issues
            if (newScore >= 80 || remainingRecs.length === 0 || 
                !remainingIssues.some(issue => issue.type === 'critical')) {
              setRecommendationsApplied(true);
              setRecommendations([]);
              toast.success("Data quality is now optimal! 🎉");
            } else {
              // Still have work to do
              setRecommendationsApplied(false);
              setRecommendations(remainingRecs);
              toast.info(`Score: ${newScore}%. More improvements available.`);
            }
          } else {
            setRecommendationsApplied(true);
            setRecommendations([]);
          }
          
          // Clear any correlation data
          setCorrelationData(null);
          
          console.log('✅ UI state updated with fresh data from backend');
        }
    } catch (err) {
      console.error("Engine Failure:", err);
      console.error("Error details:", err.response?.data);
      toast.error("Check terminal: Processor encountered an error.");
    } finally {
      setLoading(false);
      console.log('🏁 Operation completed');
    }
  };
  const exportReport = async () => {
    const element = document.getElementById('eda-report-area');
    if (!element) return;
    try {
      const dataUrl = await domtoimage.toPng(element, {
        backgroundColor: '#0f172a',
        quality: 1,
        width: element.scrollWidth * 2,
        height: element.scrollHeight * 2,
        style: {
          transform: 'scale(2)',
          transformOrigin: 'top left',
          width: element.scrollWidth + 'px',
          height: element.scrollHeight + 'px',
        },
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `insightstream-report-${Date.now()}.png`;
      link.click();
      toast.success('Report downloaded');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed')
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
                  className={`w-full p-4 rounded-xl border text-left transition-all group ${selectedDs?.id === ds.id
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
                    <div className="space-y-6 animate-in fade-in duration-500" id="eda-report-area">
                      <div className="flex justify-between items-end">
                        <div>
                          <h3 className="text-xl font-bold">Visual Analysis Engine</h3>
                          <p className="text-slate-400 text-sm">Automated statistical distribution for numerical features.</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); runOperation('univariate'); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${analysisResult
                              ? 'bg-indigo-600 text-white'
                              : 'border border-slate-700 text-slate-300'
                              }`}
                          >
                            {loading ? "..." : "Distributions"}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); runOperation('bivariate'); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${correlationData
                              ? 'bg-indigo-600 text-white'
                              : 'border border-slate-700 text-slate-300'
                              }`}
                          >
                            {loading ? "..." : "Correlations"}
                          </button>
                            {/* Export Report button – visible when there's something to export */}
                            {(analysisResult || correlationData) && (
                              <button
                                onClick={exportReport}
                                className="px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all"
                              >
                                Export Report
                              </button>
                            )}
                        </div>
                      </div>

                      {analysisResult ? (
                        <div className="space-y-6">
                          {/* 1. Global Intelligence Header (The Scorecard) */}
                          <GlobalInsightCard data={globalInsights} />
                          
                          {/* Show button only if there are recommendations AND they haven't been applied */}
                          {recommendations.length > 0 && !recommendationsApplied && (
                            <div className="flex justify-end">
                              <button
                                onClick={() =>
                                  runOperation("apply_recommendations", {
                                    recommendations: recommendations,
                                  })
                                }
                                disabled={loading}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                              >
                                {loading ? "Applying..." : "Apply AI Recommendations"}
                              </button>
                            </div>
                          )}

                          {/* Show success message when recommendations are applied */}
                          {recommendationsApplied && (
                            <div className="flex justify-end">
                              <div className="px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-2">
                                <CheckCircle2 size={14} />
                                Data optimized successfully
                              </div>
                            </div>
                          )}

                          {/* 2. Grid of Distribution Charts with Smart Badges */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-100">
                            {analysisResult?.univariate && typeof analysisResult.univariate === "object" && Object.entries(analysisResult.univariate).map(([colName, colData]) => (
                              <div key={colName} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl relative group">

                                {/* Smart Insight Badges */}
                                {Array.isArray(colData.insights) && colData.insights.length > 0 && (
                                  <div className="absolute top-4 right-4 flex gap-1.5 z-10">
                                    {colData.insights.map((ins, index) => (
                                      <div
                                        key={index}
                                        title={ins.text}
                                        className={`w-2.5 h-2.5 rounded-full cursor-help ${ins.type === 'critical' ? 'bg-red-500 animate-pulse' :
                                          ins.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-400'
                                          }`}
                                      />
                                    ))}
                                  </div>
                                )}

                                <DistributionChart
                                  title={colName}
                                  data={colData.histogram}
                                />

                                {/* Stats Summary */}
                                <div className="mt-4 pt-4 border-t border-slate-800/50 grid grid-cols-2 gap-4 text-[10px] font-mono">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500 uppercase">Mean</span>
                                    <span className="text-indigo-400">{colData.summary?.mean != null ? colData.summary.mean.toFixed(2) : "--"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500 uppercase">Median</span>
                                    <span className="text-indigo-400">{colData.summary?.median}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        !correlationData && (
                          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-3xl">
                            <BarChart3 size={48} className="text-slate-700 mb-4" />
                            <p className="text-slate-500">Click "Distributions" to process the logs.</p>
                          </div>
                        )
                      )}

                      {correlationData && (
                    <div className="mt-0 space-y-4 animate-in slide-in-from-bottom duration-700">
                      <h3 className="text-lg font-bold text-slate-200">Feature Correlation Matrix</h3>

                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 overflow-x-auto">
                        <div
                          className="grid gap-1"
                          style={{
                            gridTemplateColumns: `80px repeat(${correlationData?.columns?.length}, minmax(60px, 1fr))`
                          }}
                        >
                          <div className="w-[80px]"></div>
                          {Array.isArray(correlationData?.columns) && correlationData.columns.map(col => (
                            <div key={col} className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter text-center pb-2">
                              {col}
                            </div>
                          ))}

                          {correlationData.columns.map((rowName, rowIndex) => (
                            <React.Fragment key={rowName}>
                              <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center pr-2">
                                {rowName}
                              </div>

                              {correlationData.matrix
                                .filter(cell => cell.x === rowName)
                                .map((cell, cellIndex) => {
                                  const opacity = Math.abs(cell.value);
                                  const bgColor = cell.value > 0
                                    ? `rgba(99, 102, 241, ${opacity})`
                                    : `rgba(239, 68, 68, ${opacity})`;

                                  return (
                                    <div
                                      key={cellIndex}
                                      className="aspect-square flex items-center justify-center rounded-sm transition-all hover:scale-110 hover:z-10 cursor-help"
                                      style={{ backgroundColor: bgColor }}
                                      title={`${cell.x} vs ${cell.y}: ${cell.value}`}
                                    >
                                      <span className={`text-[10px] font-bold ${opacity > 0.5 ? 'text-white' : 'text-slate-400'}`}>
                                        {cell.value.toFixed(2)}
                                      </span>
                                    </div>
                                  );
                                })}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
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