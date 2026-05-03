import React, { useState, useEffect } from 'react';

// ----- ICONS ----- (for a professional UI)
import {
  Wand2, BarChart3, BrainCircuit, Terminal,
  Search, ShieldCheck, Database, Layout,
  ArrowRight, CheckCircle2, AlertCircle, FileText,
  ChevronLeft, ChevronRight, PieChart, GitCompare, Info
} from 'lucide-react';

// ----- DATA FETCHING -----
import axios from 'axios';

// ----- CUSTOM COMPONENTS -----
import Sidebar from '../components/Sidebar';
import DistributionChart from '../components/DistributionChart';
import GlobalInsightCard from '../components/GlobalInsight';
import ErrorBoundary from '../components/ErrorBoundary';
import { AnalyticsSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

// ----- REPORT EXPORT -----
import domtoimage from 'dom-to-image-more';   // Captures DOM elements to PNG (handles modern CSS)
import { jsPDF } from 'jspdf';                // Creates multi‑page PDF documents

// ----- NOTIFICATIONS -----
import { toast } from "sonner";

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
const CHARTS_PER_PAGE = 4; // Number of distribution charts per page (pagination)

const Analytics = () => {
  // =================================================================
  // STATE VARIABLES – each holds a specific piece of UI data
  // =================================================================
  const [datasets, setDatasets] = useState([]);                 // list of all user datasets
  const [selectedDs, setSelectedDs] = useState(null);           // currently selected dataset
  const [activeTab, setActiveTab] = useState('laundry');        // main tab: 'laundry' or 'eda'
  const [edaSubTab, setEdaSubTab] = useState('distribution');   // EDA sub‑tab: distribution | proportion | relationship
  const [loading, setLoading] = useState(false);                // true while waiting for API
  const [analysisResult, setAnalysisResult] = useState(null);   // { univariate: { col: { summary, histogram, insights } } }
  const [categoricalData, setCategoricalData] = useState(null); // categorical breakdown for Proportions tab
  const [correlationData, setCorrelationData] = useState(null); // correlation matrix + insights
  const [globalInsights, setGlobalInsights] = useState(null);   // data quality score, top issues, recommendations
  const [recommendations, setRecommendations] = useState([]);   // actionable cleaning steps
  const [recommendationsApplied, setRecommendationsApplied] = useState(false); // whether AI recs were applied
  const [chartPage, setChartPage] = useState(0);                // current page index for distribution charts
  const [exporting, setExporting] = useState(false);            // temporary mode that renders all charts for PDF capture

  // =================================================================
  // INITIAL DATA FETCH
  // =================================================================
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
  }, []); // runs once when component mounts

  // =================================================================
  // RESET ANALYSIS WHEN DATASET CHANGES
  // =================================================================
  useEffect(() => {
    // Clear all previous analysis data to avoid showing stale charts
    setRecommendationsApplied(false);
    setAnalysisResult(null);
    setCategoricalData(null);
    setGlobalInsights(null);
    setRecommendations([]);
    setCorrelationData(null);
    setChartPage(0);       // reset pagination to first page
    setExporting(false);   // ensure normal view is restored
  }, [selectedDs]); // triggers only when selectedDs changes

  // =================================================================
  // CORE BACKEND COMMUNICATION HANDLER
  //   Handles ALL api calls: clean, univariate, bivariate, apply
  // =================================================================
  const runOperation = async (taskType, payload = {}) => {
    if (!selectedDs) return;

    setLoading(true);   // show loading indicator / disable buttons

    try {
      const token = localStorage.getItem('token');
      if (!token) return; // no token → cannot authenticate

      // POST request to FastAPI endpoint
      const response = await axios.post(
        `http://127.0.0.1:8000/api/process/${selectedDs.id}?task=${taskType}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ---------------------------------------------------------
      // TASK: clean
      // ---------------------------------------------------------
      if (taskType === 'clean') {
        // Update the dataset object's summary_stats to reflect cleaned state
        setSelectedDs(prev => ({
          ...prev,
          summary_stats: {
            ...prev.summary_stats,
            missing_values: response.data.nulls_remaining,
            preview: response.data.preview
          }
        }));
        toast.success("System Refined: Missing values handled and data normalized.");
      }

      // ---------------------------------------------------------
      // TASK: univariate
      // ---------------------------------------------------------
      else if (taskType === 'univariate') {
        // Store numeric column analysis and categorical breakdowns
        setAnalysisResult({ univariate: response.data.univariate });
        setCategoricalData(response.data.categorical || null);
        setGlobalInsights(response.data?.global_insights || null);
        const recs = response.data?.global_insights?.recommendations || [];
        setRecommendations(recs);
        setCorrelationData(null); // clear old correlation data
        setChartPage(0);          // always start at page 1
        toast.success("Analysis complete");
      }

      // ---------------------------------------------------------
      // TASK: bivariate
      // ---------------------------------------------------------
      else if (taskType === 'bivariate') {
        setAnalysisResult(null);              // hide univariate charts
        setCorrelationData(response.data);    // store matrix + column names
        toast.success("Correlation matrix ready");
      }

      // ---------------------------------------------------------
      // TASK: apply_recommendations
      // ---------------------------------------------------------
      else if (taskType === "apply_recommendations") {
        toast.success("Recommendations applied successfully 🎯");

        // The backend returns updated univariate and insights after cleaning
        if (response.data.univariate) {
          setAnalysisResult({ univariate: response.data.univariate });
        }
        if (response.data.global_insights) {
          setGlobalInsights(response.data.global_insights);
          const newScore = response.data.global_insights.data_quality_score || 0;
          const remainingRecs = response.data.global_insights.recommendations || [];
          const remainingIssues = response.data.global_insights.top_issues || [];

          // Auto‑disable the "Apply" button when data is healthy enough
          if (newScore >= 80 || remainingRecs.length === 0 ||
              !remainingIssues.some(issue => issue.type === 'critical')) {
            setRecommendationsApplied(true);
            setRecommendations([]);
            toast.success("Data quality is now optimal! 🎉");
          } else {
            // Keep the button visible for further cleaning rounds
            setRecommendationsApplied(false);
            setRecommendations(remainingRecs);
            toast.info(`Score: ${newScore}%. More improvements available.`);
          }
        } else {
          // Fallback if no insights returned
          setRecommendationsApplied(true);
          setRecommendations([]);
        }
        setCorrelationData(null); // reset correlations
        setChartPage(0);
      }
    } catch (err) {
      console.error("Engine Failure:", err);
      toast.error("Check terminal: Processor encountered an error.");
    } finally {
      setLoading(false);
    }
  };

  // =================================================================
  // PDF EXPORT – uses a temporary "exporting" state to render ALL charts
  // =================================================================
  const exportReport = async () => {
    if (exporting) return; // prevent double clicks

    // Step 1: Switch to export mode → renders all charts without pagination
    setExporting(true);
    // Wait for React to re‑render with the full list (300 ms is generally enough)
    await new Promise(resolve => setTimeout(resolve, 300));

    const element = document.getElementById('eda-report-area');
    if (!element) {
      setExporting(false);
      return;
    }

    try {
      // Step 2: Capture the entire DOM element as a high‑resolution PNG
      const dataUrl = await domtoimage.toPng(element, {
        backgroundColor: '#0f172a',   // match dark theme
        quality: 1,
        width: element.scrollWidth * 2,   // 2x for retina clarity
        height: element.scrollHeight * 2,
        style: {
          transform: 'scale(2)',
          transformOrigin: 'top left',
          width: element.scrollWidth + 'px',
          height: element.scrollHeight + 'px',
        },
      });

      // Step 3: Create PDF (A4 portrait), optionally paginate if image is taller
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

      if (imgHeight <= pageHeight) {
        // Fits on a single page
        pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidth, imgHeight);
      } else {
        // Multi‑page: slide the image up for each new page
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(dataUrl, 'PNG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(dataUrl, 'PNG', 0, position, pageWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }
      pdf.save(`insightstream-report-${Date.now()}.pdf`);
      toast.success('PDF report downloaded');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed');
    } finally {
      // Step 4: Restore normal paginated view
      setExporting(false);
    }
  };

  // =================================================================
  // DERIVED DATA: pagination logic for distribution charts
  // =================================================================
  const univariateEntries = analysisResult?.univariate
    ? Object.entries(analysisResult.univariate) // [[colName, colData], ...]
    : [];
  const totalPages = Math.ceil(univariateEntries.length / CHARTS_PER_PAGE);
  const paginatedEntries = univariateEntries.slice(
    chartPage * CHARTS_PER_PAGE,
    (chartPage + 1) * CHARTS_PER_PAGE
  );

  // =================================================================
  // RENDER UI
  // =================================================================
  return (
    <ErrorBoundary> {/* Crash protection for the whole page */}
      <div className="flex min-h-screen bg-slate-900 text-slate-100">
        <Sidebar />
        <main className="flex-1 p-8">
          {/* Page header */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-2 text-indigo-400">
              <Layout size={18} />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Engineering Suite</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">Analytics Laboratory</h1>
            <p className="text-slate-400 mt-1">Select a data stream to begin refining intelligence.</p>
          </header>

          <div className="grid grid-cols-12 gap-8">
            {/* ========== LEFT COLUMN – dataset selector ========== */}
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

            {/* ========== RIGHT COLUMN – workspace ========== */}
            <div className="col-span-12 lg:col-span-9">
              {!selectedDs ? (
                /* Empty state when no dataset selected */
                <div className="h-[60vh] rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center">
                  <Database size={40} className="text-slate-600 mb-4" />
                  <h2 className="text-xl font-bold text-slate-300">No Stream Selected</h2>
                  <p className="text-slate-500 text-sm mt-2">Please select a dataset to begin.</p>
                </div>
              ) : (
                <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden min-h-[70vh] flex flex-col">
                  {/* --- Main Tabs: Laundry vs EDA --- */}
                  <div className="flex border-b border-slate-800">
                    <button onClick={() => setActiveTab('laundry')}
                      className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider ${activeTab === 'laundry' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500'}`}>
                      <Wand2 size={16} className="inline mr-2"/> Data Laundry
                    </button>
                    <button onClick={() => setActiveTab('eda')}
                      className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider ${activeTab === 'eda' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500'}`}>
                      <BarChart3 size={16} className="inline mr-2"/> EDA Engine
                    </button>
                    <button className="flex-1 py-4 text-xs font-bold text-slate-700 cursor-not-allowed">
                      <BrainCircuit size={16} className="inline mr-2"/> ML Models
                    </button>
                  </div>

                  <div className="p-8 flex-1">
                    {/* ---------- DATA LAUNDRY TAB ---------- */}
                    {activeTab === 'laundry' && (
                      <div className="space-y-8">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-bold">Sanitization Suite</h3>
                            <p className="text-slate-400 text-sm">Prepare your raw logs for statistical modeling.</p>
                          </div>
                          <button onClick={() => runOperation('clean')} disabled={loading}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                            {loading ? "Processing..." : "Run Global Cleanse"} <ArrowRight size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800/50 transition-colors cursor-pointer group">
                            <h4 className="font-bold text-slate-200">Handle Missing Values</h4>
                            <p className="text-xs text-slate-500">Automatically fill nulls using Mean/Median or drop empty rows.</p>
                          </div>
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800/50 transition-colors cursor-pointer group">
                            <h4 className="font-bold text-slate-200">Outlier Suppression</h4>
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

                    {/* ---------- EDA ENGINE ---------- */}
                    {activeTab === 'eda' && (
                      <div id="eda-report-area" className="space-y-6 animate-in fade-in duration-500">
                        {/* Top controls: operations + export */}
                        <div className="flex justify-between items-end">
                          <div>
                            <h3 className="text-xl font-bold">Visual Analysis Engine</h3>
                            <p className="text-slate-400 text-sm">Explore distributions, proportions & relationships.</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => runOperation('univariate')}
                              className={`px-4 py-2 rounded-lg text-sm font-bold ${analysisResult ? 'bg-indigo-600 text-white' : 'border border-slate-700 text-slate-300'}`}>
                              {loading ? "..." : "Distributions"}
                            </button>
                            <button onClick={() => runOperation('bivariate')}
                              className={`px-4 py-2 rounded-lg text-sm font-bold ${correlationData ? 'bg-indigo-600 text-white' : 'border border-slate-700 text-slate-300'}`}>
                              {loading ? "..." : "Correlations"}
                            </button>
                            {/* Export button visible only when there is data to export, and not already exporting */}
                            {(analysisResult || correlationData) && !exporting && (
                              <button onClick={exportReport}
                                className="px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold">
                                Export Report
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Loading skeleton while waiting for first data */}
                        {loading && !analysisResult && !correlationData ? (
                          <AnalyticsSkeleton />
                        ) : (analysisResult || categoricalData || correlationData) ? (
                          <>
                            {/* --- EDA Sub‑tabs: Distribution / Proportion / Relationship --- */}
                            <div className="flex gap-4 border-b border-slate-800 pb-2">
                              <button onClick={() => setEdaSubTab('distribution')}
                                className={`text-xs font-bold uppercase tracking-wider pb-2 ${edaSubTab === 'distribution' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500'}`}>
                                <BarChart3 size={14} className="inline mr-1"/> Distribution
                              </button>
                              <button onClick={() => setEdaSubTab('proportion')}
                                className={`text-xs font-bold uppercase tracking-wider pb-2 ${edaSubTab === 'proportion' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500'}`}>
                                <PieChart size={14} className="inline mr-1"/> Proportion
                              </button>
                              <button onClick={() => setEdaSubTab('relationship')}
                                className={`text-xs font-bold uppercase tracking-wider pb-2 ${edaSubTab === 'relationship' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500'}`}>
                                <GitCompare size={14} className="inline mr-1"/> Relationship
                              </button>
                            </div>

                            {/* Global health score & critical findings */}
                            <GlobalInsightCard data={globalInsights} />

                            {/* AI Recommendation button (hidden during export to avoid layout shift) */}
                            {!exporting && recommendations.length > 0 && !recommendationsApplied && (
                              <div className="flex justify-end">
                                <button onClick={() => runOperation("apply_recommendations", { recommendations })}
                                  disabled={loading}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                                  {loading ? "Applying..." : "Apply AI Recommendations"}
                                </button>
                              </div>
                            )}
                            {recommendationsApplied && !exporting && (
                              <div className="flex justify-end">
                                <div className="px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-2">
                                  <CheckCircle2 size={14}/> Data optimized successfully
                                </div>
                              </div>
                            )}

                            {/* ===== DISTRIBUTION TAB ===== */}
                            {edaSubTab === 'distribution' && (
                              <div className="space-y-6">
                                {exporting ? (
                                  // Export mode: render ALL charts at once (no pagination)
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {univariateEntries.map(([colName, colData]) => (
                                      <div key={colName} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col">
                                        <DistributionChart title={colName} data={colData.histogram} />
                                        {/* Insight badges with full text */}
                                        {colData.insights && colData.insights.length > 0 && (
                                          <div className="mt-3 space-y-1">
                                            {colData.insights.map((ins, idx) => (
                                              <div key={idx} className={`text-[11px] px-3 py-1 rounded-full border ${ins.type === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-400' : ins.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
                                                {ins.text}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : paginatedEntries.length > 0 ? (
                                  <>
                                    {/* Paginated view – only current page charts */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {paginatedEntries.map(([colName, colData]) => (
                                        <div key={colName} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col">
                                          <DistributionChart title={colName} data={colData.histogram} />
                                          {colData.insights && colData.insights.length > 0 && (
                                            <div className="mt-3 space-y-1">
                                              {colData.insights.map((ins, idx) => (
                                                <div key={idx} className={`text-[11px] px-3 py-1 rounded-full border ${ins.type === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-400' : ins.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
                                                  {ins.text}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    {/* Pagination controls – prev / page info / next */}
                                    {totalPages > 1 && (
                                      <div className="flex justify-center items-center gap-3 mt-4">
                                        <button onClick={() => setChartPage(p => p - 1)} disabled={chartPage === 0}
                                          className="p-2 bg-slate-800 rounded-lg disabled:opacity-50"><ChevronLeft size={16}/></button>
                                        <span className="text-sm text-slate-400">Page {chartPage + 1} of {totalPages}</span>
                                        <button onClick={() => setChartPage(p => p + 1)} disabled={chartPage + 1 >= totalPages}
                                          className="p-2 bg-slate-800 rounded-lg disabled:opacity-50"><ChevronRight size={16}/></button>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <EmptyState icon={BarChart3} title="No numeric columns" description="Run Distributions first." />
                                )}
                              </div>
                            )}

                            {/* ===== PROPORTION TAB ===== */}
                            {edaSubTab === 'proportion' && (
                              <div className="space-y-6">
                                {categoricalData && Object.keys(categoricalData).length > 0 ? (
                                  Object.entries(categoricalData).map(([col, data]) => (
                                    <div key={col} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                                      <h4 className="text-sm font-bold text-slate-200 mb-3">{col} <span className="text-xs text-slate-500">({data.unique_values} unique values)</span></h4>
                                      <div className="space-y-2">
                                        {data.breakdown.map((item, i) => (
                                          <div key={i} className="flex items-center gap-3">
                                            <span className="w-20 text-xs text-slate-400 truncate" title={item.value}>{item.value}</span>
                                            <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
                                              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${item.percentage}%` }}></div>
                                            </div>
                                            <span className="text-xs text-slate-400 w-16 text-right">{item.percentage}%</span>
                                            <span className="text-xs text-slate-500 w-12">({item.count})</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <EmptyState icon={PieChart} title="No categorical columns" description="This dataset contains only numeric columns." />
                                )}
                              </div>
                            )}

                            {/* ===== RELATIONSHIP TAB ===== */}
                            {edaSubTab === 'relationship' && (
                              <div className="space-y-6">
                                {correlationData && correlationData.columns && correlationData.columns.length >= 2 ? (
                                  <>
                                    {/* Full correlation matrix – always visible */}
                                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 overflow-x-auto">
                                      <h4 className="text-sm font-bold text-slate-200 mb-4">Correlation Matrix</h4>
                                      <div
                                        className="grid gap-1"
                                        style={{
                                          gridTemplateColumns: `80px repeat(${correlationData.columns.length}, minmax(60px, 1fr))`
                                        }}
                                      >
                                        <div className="w-[80px]"></div>
                                        {correlationData.columns.map(col => (
                                          <div key={col} className="text-[10px] font-bold text-slate-500 uppercase text-center pb-2">{col}</div>
                                        ))}
                                        {correlationData.columns.map((rowName, rowIndex) => (
                                          <React.Fragment key={rowName}>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center pr-2">{rowName}</div>
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
                                                    className="aspect-square flex items-center justify-center rounded-sm transition-all hover:scale-110 cursor-help"
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

                                    {/* Key relationships text summary */}
                                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                                      <h4 className="text-sm font-bold text-slate-200">Key Relationships (|r| ≥ 0.5)</h4>
                                      {correlationData.matrix
                                        .filter(cell => cell.x !== cell.y && Math.abs(cell.value) >= 0.5)
                                        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
                                        .slice(0, 8)
                                        .map((cell, i) => {
                                          const direction = cell.value > 0 ? 'positive' : 'negative';
                                          const strength = Math.abs(cell.value) >= 0.8 ? 'strong' : 'moderate';
                                          return (
                                            <div key={i} className="flex items-center gap-3 text-sm">
                                              <span className="text-slate-400">{cell.x}</span>
                                              <span className={`px-2 py-0.5 rounded text-xs font-mono ${cell.value > 0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {cell.value.toFixed(2)}
                                              </span>
                                              <span className="text-slate-400">{cell.y}</span>
                                              <span className="text-xs text-slate-500">({strength} {direction})</span>
                                            </div>
                                          );
                                        })}
                                      {correlationData.matrix.filter(cell => cell.x !== cell.y && Math.abs(cell.value) >= 0.5).length === 0 && (
                                        <p className="text-slate-500 text-sm">No correlations above 0.5 found.</p>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <EmptyState icon={GitCompare} title="Run Correlations first" description="Click 'Correlations' to see relationships." />
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          /* Fallback when no analysis has been run yet */
                          <EmptyState icon={BarChart3} title="Run Analysis" description="Click 'Distributions' or 'Correlations' to start." />
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
    </ErrorBoundary>
  );
};

export default Analytics;