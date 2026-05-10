import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, LayoutGrid, Zap, List, Clock, Share2, ClipboardPaste, Search, X } from 'lucide-react';
import { Emote, TabType } from '../types';

interface EmotePanelProps {
  onLogout: () => void;
}

export default function EmotePanel({ onLogout }: EmotePanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>(0);
  const [teamCode, setTeamCode] = useState(() => localStorage.getItem('pro_team_code') || '');
  const [uids, setUids] = useState<string[]>(() => {
    const saved = localStorage.getItem('pro_uids');
    return saved ? JSON.parse(saved) : ['', '', '', ''];
  });
  const [isSetup, setIsSetup] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [emotesData, setEmotesData] = useState<Record<string, Emote[]>>({ evo: [], all: [], rear: [] });
  const [apiUrl, setApiUrl] = useState('https://ob53-emote-api-jd1f.onrender.com/join');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    localStorage.setItem('pro_team_code', teamCode);
  }, [teamCode]);

  useEffect(() => {
    localStorage.setItem('pro_uids', JSON.stringify(uids));
  }, [uids]);

  useEffect(() => {
    const fetchEmotes = async () => {
      try {
        const res = await fetch('/api/emotes');
        const data = await res.json();
        if (data.success) {
          setEmotesData(data.emotes);
          if (data.settings?.targetApiUrl) {
            setApiUrl(data.settings.targetApiUrl);
          }
        }
      } catch (e) {
        console.error("Failed to load emotes");
      }
    };
    fetchEmotes();
  }, []);

  const dataSets = useMemo(() => {
    // Return them EXACTLY as they are returned from API, 
    // no filtering out Evo items from All list if the admin wants them there!
    return [emotesData.evo || [], emotesData.all || [], emotesData.rear || []];
  }, [emotesData]);

  const filteredEmotes = useMemo(() => {
    const list = dataSets[activeTab];
    if (!searchQuery.trim()) return list;
    return list.filter(e => 
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.id.includes(searchQuery)
    );
  }, [activeTab, searchQuery, dataSets]);

  const handleTrigger = (emoteId: string) => {
    const [u1, u2, u3, u4] = uids.map(u => u || '0');
    
    let baseUrl = apiUrl;
    const hasParams = baseUrl.includes('?');
    const separator = hasParams ? '&' : '?';
    const params = `tc=${teamCode}&uid1=${u1}&uid2=${u2}&uid3=${u3}&uid4=${u4}&uid5=0&uid6=0&emote_id=${emoteId}`;
    
    // Check if the template already has the placeholders, this is simple fallback 
    let finalUrl = "";
    if (baseUrl.includes('{teamCode}')) {
      finalUrl = baseUrl
        .replace('{teamCode}', teamCode)
        .replace('{uid1}', u1).replace('{uid2}', u2).replace('{uid3}', u3).replace('{uid4}', u4)
        .replace('{emoteId}', emoteId);
    } else {
      finalUrl = `${baseUrl}${separator}${params}`;
    }

    fetch(finalUrl, { mode: 'no-cors' })
      .then(() => showToast("✅ SEND"))
      .catch(() => showToast("✅ SEND"));
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handlePasteTC = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) setTeamCode(text.trim());
      }
    } catch {
      // Fail silently or could show a toast. Browser blocks clipboard access in iframe.
    }
  };

  const handlePasteUID = async (index: number) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const newUids = [...uids];
          newUids[index] = text.trim();
          setUids(newUids);
        }
      }
    } catch {
    }
  };

  if (!isSetup) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center pt-[10vh] px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm space-y-6 bg-[#0a0c10] border border-[#1f232b] p-6 rounded-[2rem] shadow-2xl"
        >
          <div className="text-center">
            <h1 className="text-xl font-black text-[#3be05e] uppercase tracking-[0.2em] italic drop-shadow-[0_0_15px_rgba(59,224,94,0.3)]">Lobby Login</h1>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-[0.2em]">Team Code</label>
              <div className="relative">
                <input 
                  type="text"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value)}
                  placeholder="000000"
                  className="w-full bg-[#11141b] border border-[#1f232b] rounded-2xl p-4 text-white font-mono text-lg focus:border-[#ffb400] transition-all outline-none"
                />
                <button 
                  onClick={handlePasteTC}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/5 text-[#ffb400] rounded-xl active:scale-90 transition-transform hover:bg-[#ffb400]/10"
                >
                  <ClipboardPaste size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {uids.map((uid, i) => (
                <div key={i} className="space-y-1.5">
                   <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-[0.2em]">UID {i+1}</label>
                   <div className="relative">
                    <input 
                      type="text"
                      value={uid}
                      onChange={(e) => {
                        const newUids = [...uids];
                        newUids[i] = e.target.value;
                        setUids(newUids);
                      }}
                      placeholder="UID"
                      className="w-full bg-[#11141b] border border-[#1f232b] rounded-2xl p-3 pr-8 text-white font-mono focus:border-[#ffb400] transition-all outline-none text-[11px]"
                    />
                    <button 
                      onClick={() => handlePasteUID(i)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-white/5 text-[#ffb400] rounded-lg active:scale-90 transition-transform hover:bg-[#ffb400]/10"
                    >
                      <ClipboardPaste size={12} />
                    </button> //
                   </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={() => {
              if (teamCode && uids.some(u => u)) setIsSetup(true);
              else alert("Enter Team Code and at least one UID!");
            }}
            className="w-full bg-[#ffb400] text-black font-black py-4 rounded-2xl uppercase tracking-[0.2em] italic active:scale-95 shadow-[0_0_15px_rgba(255,180,0,0.2)] transition-all text-sm mt-2"
          >
            Access Panel
          </button>

          <button 
            onClick={onLogout}
            className="w-full text-red-500/50 text-[9px] font-black uppercase tracking-[0.3em] hover:text-red-500 transition-colors"
          >
            Disconnect
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 py-8 flex items-center justify-between border-b border-[#1f232b] bg-gradient-to-b from-[#0a0c10] to-black relative">
        <AnimatePresence mode="wait">
          {!isSearching ? (
            <motion.div 
              key="info"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col"
            >
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Archive</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-[#3be05e] animate-pulse" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Session: {teamCode}</span>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="search"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex items-center gap-3"
            >
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH EMOTE..."
                  className="w-full bg-[#11141b] border border-[#1f232b] rounded-2xl py-3 pl-12 pr-4 text-white text-xs font-black uppercase tracking-widest outline-none focus:border-[#3be05e]/50"
                />
              </div>
              <button 
                onClick={() => { setIsSearching(false); setSearchQuery(''); }}
                className="p-3 text-gray-500"
              >
                <X size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          {!isSearching && (
             <button 
              onClick={() => setIsSearching(true)}
              className="p-4 bg-[#11141b] text-white/50 rounded-2xl border border-[#1f232b] active:scale-90 transition-all"
            >
              <Search size={22} />
            </button>
          )}
          <button 
            onClick={() => setIsSetup(false)}
            className="p-4 bg-[#11141b] text-[#3be05e] rounded-2xl border border-[#1f232b] active:scale-90 transition-all shadow-xl"
          >
            <LayoutGrid size={24} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-8 py-5 gap-3 bg-black">
        <TabButton active={activeTab === 0} onClick={() => setActiveTab(0)} icon={<Zap size={14}/>} label="Evo" />
        <TabButton active={activeTab === 1} onClick={() => setActiveTab(1)} icon={<List size={14}/>} label="All" />
        <TabButton active={activeTab === 2} onClick={() => setActiveTab(2)} icon={<Clock size={14}/>} label="Rear" />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-8 pb-32 scroll-smooth">
        <motion.div 
          key={activeTab + searchQuery}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4"
        >
          {filteredEmotes.length > 0 ? (
            filteredEmotes.map((item, i) => (
              <EmoteCard 
                key={item.id} 
                emote={item} 
                index={i} 
                tab={activeTab}
                onClick={() => handleTrigger(item.id)} 
              />
            ))
          ) : (
            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
              <Search size={40} className="text-gray-800" />
              <p className="text-gray-600 font-black uppercase text-xs tracking-widest">No Emotes Found</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-[#3be05e] text-black px-10 py-4 rounded-full font-black uppercase text-sm shadow-[0_0_30px_rgba(59,224,94,0.4)] z-50 italic tracking-widest"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest italic transition-all border ${
        active 
          ? 'bg-[#ffb400] text-black border-[#ffb400] shadow-[0_0_15px_rgba(255,180,0,0.3)]' 
          : 'bg-[#1a1e26] text-gray-500 border-[#2a2e38] opacity-60'
      }`}
    >
      <span className="text-[11px]">{label}</span>
    </button>
  );
}

function EmoteCard({ emote, index, tab, onClick }: { key?: React.Key; emote: Emote; index: number; tab: number; onClick: () => void }) {
  const colors = ["#3be05e", "#3bb3ff", "#ffb400"];
  const color = tab === 0 ? colors[0] : (index % 5 === 0 ? colors[2] : (index % 3 === 0 ? colors[0] : colors[1]));

  return (
    <motion.div 
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="relative aspect-square bg-gradient-to-tr from-[#0a0c11] to-[#1a1e26] rounded-3xl border border-[#1f232b] flex items-center justify-center group overflow-hidden shadow-lg"
      style={{ borderBottom: `4px solid ${color}` }}
    >
      {/* Dynamic Background Glow */}
      <div className="absolute inset-0 opacity-[0.05] group-active:opacity-[0.15] transition-opacity" 
           style={{ background: `radial-gradient(circle at center, ${color} 0%, transparent 85%)` }} />

      <img 
        src={`emotes/${emote.id}.png`} 
        alt={emote.name}
        className="w-full h-full object-contain z-10 transition-transform duration-300 group-active:scale-110"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emote.name)}&backgroundColor=a8d1ff,fba0a9,fccb92,ffd460,a6e4d0,c0d3f8&textColor=000000`;
        }}
      />

      {/* Clean Name Label */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-2 left-0 w-full z-20 px-2 pointer-events-none">
        <p className="text-[8px] font-black text-center text-white uppercase tracking-wider truncate drop-shadow-[0_2px_2px_rgba(0,0,0,1)] [text-shadow:_0_1px_3px_rgb(0_0_0_/_100%),_0_1px_1px_rgb(0_0_0_/_100%)]">
          {emote.name}
        </p>
      </div>

      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full opacity-50" style={{ backgroundColor: color }} />
    </motion.div>
  );
}
