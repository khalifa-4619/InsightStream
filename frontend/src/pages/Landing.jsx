// frontend/src/pages/Landing.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ArrowRight } from 'lucide-react';

const Landing = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center p-8 text-center text-white">
    <div className="max-w-2xl">
      <h1 className="text-5xl font-black mb-4">InsightStream</h1>
      <p className="text-xl text-slate-300 mb-8">
        Upload, clean, analyze, and export your data – all in one place.
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          to="/login"
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors flex items-center gap-2"
        >
          Sign In <ArrowRight size={18} />
        </Link>
        <Link
          to="/signup"
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
        >
          Create Account
        </Link>
      </div>
    </div>
  </div>
);

export default Landing;