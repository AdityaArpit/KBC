import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { User, Shield, CheckCircle, AlertCircle, Building, Mail, Hash, Loader2 } from 'lucide-react';
import { AccommodationType, PersonType } from '../../shared/types.ts';

export const ProfilePage: React.FC = () => {
  const { profile, user, role, updateProfile, signInWithGoogle } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [personType, setPersonType] = useState<PersonType>(profile?.personType || 'STUDENT');
  const [accommodationType, setAccommodationType] = useState<AccommodationType>(
    profile?.accommodationType || 'DAY_SCHOLAR'
  );
  const [hostelName, setHostelName] = useState(profile?.hostelName || '');
  const [hostelEmail, setHostelEmail] = useState(profile?.hostelEmail || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPersonType(profile.personType || 'STUDENT');
      setAccommodationType(profile.accommodationType || 'DAY_SCHOLAR');
      setHostelName(profile.hostelName || '');
      setHostelEmail(profile.hostelEmail || '');
    }
  }, [profile]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-md bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
          <User className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Sign-In Required</h2>
          <p className="text-xs text-slate-600">Please sign in with your verified @kiit.ac.in Google account to manage your campus profile.</p>
          <button
            onClick={signInWithGoogle}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
          >
            KIIT Sign-In
          </button>
        </div>
      </div>
    );
  }

  // Derive read-only rollNumber for student
  const derivedRollNumber =
    personType === 'STUDENT' ? profile.email.split('@')[0] : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);

      if (accommodationType === 'HOSTEL' && (!hostelName.trim() || !hostelEmail.trim())) {
        throw new Error('Hostel name and hostel superintendent email are required for hostellers.');
      }

      await updateProfile({
        displayName,
        personType,
        accommodationType,
        hostelName: accommodationType === 'HOSTEL' ? hostelName : null,
        hostelEmail: accommodationType === 'HOSTEL' ? hostelEmail : null,
      });

      setMessage({ text: 'KIIT User Profile updated successfully!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Verified Campus Profile</h1>
          <p className="text-xs text-slate-500 mt-1">
            Student identity, hostel verification, and event registration credentials
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
          
          {/* Identity Snapshot Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'K'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{profile.displayName}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-800">
                    {profile.role}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-mono">{profile.email}</p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">KIIT Verification</span>
              <span className="text-xs font-semibold text-emerald-700 flex items-center sm:justify-end gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Email Verified Domain
              </span>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
              message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Edit Form */}
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Display Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name (Verified Google Name)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              {/* Person Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  University Affiliation
                </label>
                <select
                  value={personType}
                  onChange={(e) => setPersonType(e.target.value as PersonType)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="STUDENT">STUDENT</option>
                  <option value="FACULTY">FACULTY</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              {/* Roll Number (Read-Only) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                  <span>Student Roll Number</span>
                  <span className="text-[10px] text-emerald-700 font-semibold lowercase">read-only from @kiit.ac.in</span>
                </label>
                <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  {derivedRollNumber || 'N/A (Non-student affiliation)'}
                </div>
              </div>

              {/* Accommodation Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Accommodation Status
                </label>
                <select
                  value={accommodationType}
                  onChange={(e) => setAccommodationType(e.target.value as AccommodationType)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="HOSTEL">HOSTEL</option>
                  <option value="DAY_SCHOLAR">DAY_SCHOLAR</option>
                </select>
              </div>
            </div>

            {/* Hostel Details Section (Conditional on HOSTEL) */}
            {accommodationType === 'HOSTEL' ? (
              <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Building className="w-4 h-4 text-amber-600" />
                  Hostel Information (Confidential & Private)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hostel Name / Number</label>
                    <input
                      type="text"
                      value={hostelName}
                      onChange={(e) => setHostelName(e.target.value)}
                      placeholder="e.g. King Palace 7, Queen Castle 3"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hostel Official Email</label>
                    <input
                      type="email"
                      value={hostelEmail}
                      onChange={(e) => setHostelEmail(e.target.value)}
                      placeholder="superintendent.kp7@kiit.ac.in"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      required
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                Hostel Information: <strong className="text-slate-800">N/A (Day Scholar)</strong>
              </div>
            )}

            {/* Submit Bar */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Profile Information
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
