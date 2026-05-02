import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { User, Mail, Camera, Save, Shield } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { toast } from 'sonner';
import { CardSkeleton } from '../components/Skeleton';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/users/me', { headers });
      setUser(res.data);
      setName(res.data.name);
    } catch (err) {
      toast.error('Failed to load profile');
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSaveName = async () => {
    try {
      const res = await axios.put('http://127.0.0.1:8000/users/me', { name }, { headers });
      setUser(res.data);
      setEditing(false);
      toast.success('Name updated');
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handlePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://127.0.0.1:8000/users/me/picture', formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      setUser(res.data);
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    }
  };

  const getPictureUrl = (path) => {
    if (!path) return null;
    return `http://127.0.0.1:8000/uploads/${path}`;
  };

  if (!user) return <div className="flex min-h-screen bg-slate-900"><Sidebar /><main className="flex-1 p-8"><CardSkeleton /></main></div>;

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">
      <Sidebar />
      <main className="flex-1 p-8 space-y-8">
        <header>
          <h1 className="text-3xl font-black">User Profile</h1>
          <p className="text-slate-400 mt-1">Manage your personal information.</p>
        </header>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden">
              {user.profile_picture ? (
                <img src={getPictureUrl(user.profile_picture)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-slate-500" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current.click()}
              className="absolute bottom-0 right-0 bg-indigo-600 p-1.5 rounded-full text-white hover:bg-indigo-500 transition-colors"
            >
              <Camera size={16} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePictureUpload} className="hidden" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <p className="text-slate-400 flex items-center gap-2 mt-1"><Mail size={14} /> {user.email}</p>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <Shield size={12} /> {user.is_premium ? 'Premium User' : 'Free Tier'}
            </p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">Display Name</h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!editing}
              className={`bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white flex-1 outline-none focus:ring-2 focus:ring-indigo-500 ${!editing && 'opacity-70'}`}
            />
            {editing ? (
              <button onClick={handleSaveName} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-2">
                <Save size={16} /> Save
              </button>
            ) : (
              <button onClick={() => setEditing(true)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                Edit
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;