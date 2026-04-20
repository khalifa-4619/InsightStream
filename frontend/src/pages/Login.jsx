import React, { useState } from 'react';
import { Lock, Mail, ArrowRight } from 'lucide-react'; // Icons for a pro look
import axios from 'axios'

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    //Use URLSearchParams to format the data correctly for OAuth2
    const formData = new URLSearchParams();
    formData.append('username', email); //Must be 'username' for OAuth2
    formData.append('password', password);
    try {
      const response = await axios.post('http://127.0.0.1:8000/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      // If successful, we get a JWT Token back
      const token = response.data.access_token
      localStorage.setItem('token', token); //saved it to remain logged in
      
      alert("Success! Token acquired.");

    } catch (error) {
      console.error("Login failed", error);
      alert("Check your backend, is it running?");
    }
  };

  return (
    // 'min-h-screen' makes it fill the whole window
    // 'bg-slate-50' is a soft, professional gray background
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      
      {/* The Login Card */}
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">InsightStream</h1>
            <p className="text-slate-500 mt-2">Transforming raw logs into actionable intelligence.</p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="email" 
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="khalifa@engineer.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="password" 
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all transform active:scale-95"
            >
              Enter Workspace <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;