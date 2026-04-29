import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, Trash2, Download, FileText, Upload } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import DataIngestion from '../components/DataIngestion';
import { toast } from 'sonner';

const DataSources = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // dataset to confirm deletion

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch all datasets on mount
  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/datasets/', { headers });
      setDatasets(response.data);
    } catch (err) {
      toast.error('Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDatasets(); }, []);

  // Delete handler
  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/datasets/${id}`, { headers });
      toast.success('Dataset deleted');
      fetchDatasets(); // refresh list
    } catch (err) {
      toast.error('Delete failed');
    }
    setDeleteTarget(null);
  };

  // Download handlers
  const downloadOriginal = async (item) => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/datasets/${item.id}/download`,
        { headers, responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', item.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Download started');
    } catch (err) {
      toast.error('Download failed');
    }
  };

  const downloadCleaned = async (item) => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/datasets/${item.id}/download/cleaned`,
        { headers, responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cleaned_${item.filename}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Cleaned file downloaded');
    } catch (err) {
      toast.error('Download failed');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">
      <Sidebar />
      <main className="flex-1 p-8 space-y-8">
        <header>
          <h1 className="text-3xl font-black">Data Sources</h1>
          <p className="text-slate-400 mt-1">Manage your uploaded datasets.</p>
        </header>

        {/* Upload Section */}
        <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Upload size={20} className="text-indigo-400" /> Ingest New Data
          </h2>
          <DataIngestion onUploadSuccess={fetchDatasets} />
        </section>

        {/* Dataset Table */}
        <section className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Database size={20} className="text-indigo-400" /> Your Data Streams
            </h2>
          </div>
          {loading ? (
            <p className="text-center py-10 text-slate-500">Loading...</p>
          ) : datasets.length === 0 ? (
            <p className="text-center py-10 text-slate-500">No datasets uploaded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50 text-slate-400 uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="px-6 py-3 text-left">File Name</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-center">Rows</th>
                  <th className="px-6 py-3 text-center">Size</th>
                  <th className="px-6 py-3 text-left">Uploaded</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {datasets.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{item.filename}</td>
                    <td className="px-6 py-4 text-indigo-400 uppercase">{item.file_typ}</td>
                    <td className="px-6 py-4 text-center font-mono">
                      {item.summary_stats?.row_count ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-center font-mono">
                      {item.summary_stats?.file_size_kb ?? '—'} KB
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Download Original */}
                        <button
                          onClick={() => downloadOriginal(item)}
                          className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                          title="Download original file"
                        >
                          <Download size={16} />
                        </button>
                        {/* Download Cleaned */}
                        <button
                          onClick={() => downloadCleaned(item)}
                          className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                          title="Download cleaned file"
                        >
                          <FileText size={16} />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                          title="Delete dataset"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-white mb-2">Confirm Deletion</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to delete <strong className="text-white">{deleteTarget.filename}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteTarget.id)}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DataSources;