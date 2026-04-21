import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle2 } from 'lucide-react';

const DataIngestion = () => {
  const [file, setFile] = useState(null);

  const onDrop = useCallback(acceptedFiles => {
    // For now, we just take the first file
    setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/plain': ['.log'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-2xl p-12 transition-all cursor-pointer flex flex-col items-center justify-center
          ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`}
      >
        <input {...getInputProps()} />
        
        <div className="bg-slate-800 p-4 rounded-full mb-4 text-indigo-400">
          <Upload size={32} />
        </div>
        
        <h3 className="text-xl font-semibold mb-2">Drop your data stream here</h3>
        <p className="text-slate-400 text-sm text-center">
          Support for .csv, .xlsx, .json, and .log files (Max 10MB)
        </p>
      </div>

      {file && (
        <div className="mt-6 bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <File className="text-indigo-400" />
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setFile(null)}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400"
            >
              <X size={18} />
            </button>
            <button className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
              <CheckCircle2 size={16} /> Process Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataIngestion;