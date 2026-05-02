import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Terminal, XCircle, AlertTriangle, Info } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useWebSocket } from 'react-use-websocket/src/lib/use-websocket';
import { toast } from 'sonner';
import ErrorBoundary from '../components/ErrorBoundary';
import { SkeletonBox } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const WS_URL = 'ws://127.0.0.1:8000/ws/logs';

const LogsTerminal = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('ALL'); // ALL, INFO, WARNING, ERROR
  const [loading, setLoading] = useState(true);
  const logsEndRef = useRef(null);
  const token = localStorage.getItem('token');

  // Fetch historical logs
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await axios.get('http://127.0.0.1:8000/logs/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLogs(res.data.reverse()); // newest at bottom
      } catch (err) {
        toast.error('Failed to load logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // WebSocket for live logs
  const { lastMessage } = useWebSocket(
    `${WS_URL}?token=${token}`,
    {
      onOpen: () => console.log('WS connected'),
      onError: () => toast.error('WebSocket error'),
      shouldReconnect: () => true,
    }
  );

  // Append new log message when received
  useEffect(() => {
    if (lastMessage) {
      const newLog = JSON.parse(lastMessage.data);
      setLogs(prev => [...prev, newLog]);
    }
  }, [lastMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Filter logs
  const filteredLogs = filter === 'ALL' ? logs : logs.filter(l => l.level === filter);

  const getLevelIcon = (level) => {
    if (level === 'ERROR') return <XCircle size={14} className="text-red-400" />;
    if (level === 'WARNING') return <AlertTriangle size={14} className="text-amber-400" />;
    return <Info size={14} className="text-green-400" />;
  };

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-slate-900 text-slate-100">
        <Sidebar />
        <main className="flex-1 p-8 flex flex-col">
          <header className="mb-6">
            <h1 className="text-3xl font-black tracking-tight">Logs Terminal</h1>
            <p className="text-slate-400 mt-1">Real‑time audit trail and system events.</p>
          </header>

          {/* Filter buttons */}
          <div className="flex gap-3 mb-4">
            {['ALL', 'INFO', 'WARNING', 'ERROR'].map(level => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`px-3 py-1 rounded-full text-xs font-mono border transition-colors ${
                  filter === level
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Terminal window */}
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-y-auto font-mono text-sm leading-relaxed">
            {loading ? (
              <div className="space-y-2">
                {[...Array(12)].map((_, i) => (
                  <SkeletonBox key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <EmptyState
                icon={Terminal}
                title="No logs yet"
                description="Perform some actions to see events appear here."
              />
            ) : (
              filteredLogs.map((log, i) => (
                <div key={log.id || i} className="flex items-start gap-2 mb-1">
                  <span className="text-slate-500 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="shrink-0">{getLevelIcon(log.level)}</span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default LogsTerminal;