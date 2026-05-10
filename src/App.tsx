/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import LoginGate from './components/LoginGate';
import EmotePanel from './components/EmotePanel';
import AdminPanel from './components/AdminPanel';
import { AuthState } from './types';

export default function App() {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    loading: true,
  });
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('pro_emote_token');
    if (token) {
      verifyToken(token);
    } else {
      setAuth(a => ({ ...a, loading: false }));
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/check-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (data.success) {
        setAuth({ isAuthenticated: true, token, loading: false });
      } else {
        localStorage.removeItem('pro_emote_token');
        setAuth({ isAuthenticated: false, token: null, loading: false });
      }
    } catch (e) {
      setAuth(a => ({ ...a, loading: false }));
    }
  };

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem('pro_emote_token', token);
    setAuth({ isAuthenticated: true, token, loading: false });
  };

  const handleLogout = () => {
    localStorage.removeItem('pro_emote_token');
    setAuth({ isAuthenticated: false, token: null, loading: false });
  };

  if (auth.loading) {
    return (
      <div className="fixed inset-0 bg-[#000000] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#3be05e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="antialiased font-sans bg-black text-white selection:bg-[#3be05e]/30">
      {showAdmin ? (
        <AdminPanel onClose={() => setShowAdmin(false)} />
      ) : auth.isAuthenticated ? (
        <EmotePanel onLogout={handleLogout} />
      ) : (
        <LoginGate 
          onLoginSuccess={handleLoginSuccess}
          onAdminOpen={() => setShowAdmin(true)}
        />
      )}
    </div>
  );
}

