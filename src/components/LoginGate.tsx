import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Key, ExternalLink, Smartphone, AlertCircle, ClipboardPaste, Settings } from 'lucide-react';

interface LoginGateProps {
  onLoginSuccess: (token: string) => void;
  onAdminOpen: () => void;
}

export default function LoginGate({ onLoginSuccess, onAdminOpen }: LoginGateProps) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const holdTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Generate or retrieve Device ID
    let id = localStorage.getItem('pro_emote_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 11) + Date.now();
      localStorage.setItem('pro_emote_device_id', id);
    }
    setDeviceId(id);

    // Pre-fill last used key
    const savedKey = localStorage.getItem('pro_last_key');
    if (savedKey) setKey(savedKey);
  }, []);

  const handlePaste = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const entry = text.toUpperCase().trim();
          setKey(entry);
          localStorage.setItem('pro_last_key', entry);
        }
      }
    } catch (err) {
      // browser blocks clipboard
    }
  };

  const cancelHold = () => {
    if (holdTimeout.current) {
      clearTimeout(holdTimeout.current);
      holdTimeout.current = null;
    }
  };

  const startHold = () => {
    holdTimeout.current = setTimeout(() => {
      setShowAdminLogin(true);
    }, 10000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setLoading(true);
    setError(null);
    localStorage.setItem('pro_last_key', key.trim());

    try {
      const response = await fetch('/api/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, deviceId }),
      });

      const data = await response.json();

      if (data.success) {
        onLoginSuccess(data.token);
      } else {
        setError(data.message || 'Invalid Key');
      }
    } catch (err) {
      setError('Connection Error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey === "Ankit,ankush.1490") {
      sessionStorage.setItem('adminKey', adminKey);
      onAdminOpen();
    } else {
      setError("Unauthorized access.");
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050505] flex items-start pt-[15vh] justify-center p-4">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-[#3be05e]/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-[#3bb3ff]/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-sm bg-[#0a0c10] border border-[#1f232b] rounded-[2rem] p-6 shadow-2xl relative z-10"
      >
        {showAdminLogin && (
          <button 
            onClick={() => setShowAdminLogin(false)}
            className="absolute top-6 right-6 text-gray-500 hover:text-[#3be05e] transition-colors text-xs font-black uppercase tracking-widest flex items-center gap-1"
          >
            Go Back
          </button>
        )}

        <div className="flex flex-col items-center text-center mb-6 mt-2 select-none" style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>
          <motion.div 
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            onContextMenu={(e) => { e.preventDefault(); return false; }}
            style={{ touchAction: 'none' }}
            animate={{ 
              boxShadow: ["0 0 0px #3be05e", "0 0 20px rgba(59,224,94,0.3)", "0 0 0px #3be05e"] 
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-16 h-16 bg-gradient-to-br from-[#3be05e]/20 to-black rounded-2xl flex items-center justify-center mb-4 border border-[#3be05e]/30 rotate-12 select-none cursor-pointer"
          >
            {showAdminLogin ? <Settings className="w-8 h-8 text-[#3be05e] -rotate-12 pointer-events-none" /> : <Shield className="w-8 h-8 text-[#3be05e] -rotate-12 pointer-events-none" />}
          </motion.div>
          <h2 className="text-2xl font-black text-white tracking-[.2em] uppercase mb-1 italic pointer-events-none">
            {showAdminLogin ? "Admin Portal" : "Security"}
          </h2>
          <p className="text-[#3be05e] font-mono text-[9px] tracking-[.3em] uppercase opacity-70 pointer-events-none">
            {showAdminLogin ? "Authorized Access Only" : "Device Bound Protocol v4.0"}
          </p>
        </div>

        {showAdminLogin ? (
          <form onSubmit={handleAdminVerify} className="space-y-4">
             <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[.2em] flex items-center gap-2 ml-2">
                <Key size={12} className="text-[#3be05e]" /> Admin Key
              </label>
              <input 
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="ENTER ADMIN KEY"
                className="w-full bg-[#11141b] border border-[#1f232b] rounded-2xl py-4 px-5 text-white font-mono focus:border-[#3be05e] transition-all outline-none"
                required
              />
            </div>
            
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-wider"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              className="w-full bg-[#3be05e] text-black font-black py-4 rounded-2xl shadow-[0_0_15px_rgba(59,224,94,0.3)] hover:shadow-[#3be05e]/40 transition-all active:scale-[0.98] mt-2 text-sm uppercase tracking-[0.2em]"
            >
              Access Portal
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[.2em] flex items-center gap-2 ml-2">
                <Key size={12} className="text-[#3be05e]" /> License Key
              </label>
              <div className="relative group">
                <input 
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase().trim())}
                  placeholder="ENTER KEY"
                  className="w-full bg-[#11141b] border border-[#1f232b] rounded-2xl py-4 pl-5 pr-14 text-white font-mono focus:border-[#3be05e] transition-all outline-none group-hover:border-gray-700"
                  required
                />
                <button 
                  type="button"
                  onClick={handlePaste}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-white/5 text-gray-400 rounded-xl hover:bg-[#3be05e]/10 hover:text-[#3be05e] transition-all active:scale-90"
                >
                  <ClipboardPaste size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#11141b] border border-[#1f232b] p-3 rounded-xl text-[9px] text-gray-500 font-mono">
              <Smartphone size={14} className="text-[#3bb3ff]" />
              <span className="truncate">HWID: {deviceId}</span>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-wider"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-3 pt-2">
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#3be05e] text-black font-black py-4 rounded-2xl shadow-[0_0_15px_rgba(59,224,94,0.3)] hover:shadow-[#3be05e]/40 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm uppercase tracking-[0.2em] italic"
              >
                {loading ? "Decrypting..." : "Connect Server"}
              </button>

              <a 
                href="https://t.me/ankitraj444" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full bg-[#11141b] text-gray-400 border border-[#1f232b] font-bold py-3 rounded-2xl flex items-center justify-center gap-2 uppercase tracking-widest hover:text-[#3bb3ff] hover:bg-[#3bb3ff]/5 transition-all text-[9px]"
              >
                <ExternalLink size={12} className="text-[#3bb3ff]" /> Get Secret Key
              </a>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
