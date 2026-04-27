import React from "react";
import { AlertTriangle, CheckCircle, Lightbulb, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const GlobalInsightCard = ({ data }) => {
  // ✅ Hard guard
  if (!data) return null;

  // ✅ Safe destructuring
  const {
    data_quality_score = 0,
    top_issues = [],
    recommendations = []
  } = data || {};

  const getScoreColor = (score) => {
    if (score > 80) return 'text-green-500';
    if (score > 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatAction = (action) => {
    if (!action) return "";
    return action.replaceAll("_", " ");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full">

      {/* SCORE */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center"
      >
        <Activity className="text-indigo-400 mb-2" size={32} />
        <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">
          Data Health Score
        </h3>

        <div className={`text-5xl font-bold mt-2 ${getScoreColor(data_quality_score)}`}>
          {data_quality_score}%
        </div>
      </motion.div>

      {/* TOP ISSUES */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl md:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="text-amber-500" size={20} />
          <h3 className="text-white font-semibold text-lg">Critical Findings</h3>
        </div>

        <div className="space-y-3">
          {top_issues.length === 0 ? (
            <p className="text-slate-500 text-sm">No major issues detected 🎉</p>
          ) : (
            top_issues.map((issue, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border-l-4 border-amber-500"
              >
                <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded text-xs font-bold uppercase mt-0.5">
                  {issue.column || "General"}
                </span>
                <p className="text-slate-300 text-sm">{issue.text}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RECOMMENDATIONS */}
      <div className="bg-indigo-900/20 border border-indigo-500/30 p-6 rounded-2xl md:col-span-3">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="text-indigo-400" size={20} />
          <h3 className="text-white font-semibold text-lg">
            Recommended Engineering Actions
          </h3>
        </div>

        <div className="flex flex-wrap gap-3">
          {recommendations.length === 0 ? (
            <p className="text-slate-500 text-sm">No recommendations</p>
          ) : (
            recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-2 rounded-full text-sm flex items-center gap-2 hover:bg-indigo-500/20 transition-all"
                title={`${rec.action} on ${rec.column}`}
              >
                <CheckCircle size={14} />

                <span className="font-mono text-indigo-400">
                  {formatAction(rec.action)}
                </span>

                {rec.column && (
                  <span className="text-slate-400">
                    ({rec.column})
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalInsightCard;