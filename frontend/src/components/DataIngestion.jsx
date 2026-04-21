import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle2, Loader2 } from 'lucide-react';
import axios from 'axios';

const DataIngestion = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(acceptedFiles => {
    setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/plain': ['.log', '.txt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const handleProcessData = async () => {
    if (!file) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://127.0.0.1:8000/datasets/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` 
        }
      });

      // Reset local state
      setFile(null);
      
      // TRIGGER THE REFRESH IN DASHBOARD
      if (onUploadSuccess) onUploadSuccess();
      
    } catch (error) {
      console.error("Upload failed", error);
      alert(error.response?.data?.detail || "Error processing data stream.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-2xl p-10 transition-all cursor-pointer flex flex-col items-center justify-center
          ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-900/20 hover:border-slate-600'}`}
      >
        <input {...getInputProps()} />
        
        <div className={`p-4 rounded-full mb-4 ${isDragActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-indigo-400'}`}>
          <Upload size={28} />
        </div>
        
        <h3 className="text-lg font-semibold mb-1">Push Data to Stream</h3>
        <p className="text-slate-500 text-xs text-center px-4">
          Drag & drop CSV, Excel, JSON, or Logs here
        </p>
      </div>

      {file && (
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400">
              <File size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200 truncate max-w-[200px]">{file.name}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isUploading && (
              <button 
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
              >
                <X size={18} />
              </button>
            )}
            
            <button 
              onClick={handleProcessData}
              disabled={isUploading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
            >
              {isUploading ? (
                <><Loader2 size={14} className="animate-spin" /> Analyzing...</>
              ) : (
                <><CheckCircle2 size={14} /> Process Data</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataIngestion;