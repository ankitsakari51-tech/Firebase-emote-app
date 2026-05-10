import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, Image as ImageIcon, LogOut, Trash2, Plus, Copy, MoreVertical, Edit2, CheckCircle2, ChevronRight, PlaySquare, Settings, ArrowRightLeft } from 'lucide-react';

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'keys' | 'settings' | 'evo' | 'all' | 'rear'>('keys');
  const [appSettings, setAppSettings] = useState({ targetApiUrl: 'https://ob53-emote-api-jd1f.onrender.com/join' });
  const [keys, setKeys] = useState<Record<string, any>>({});
  const [emotes, setEmotes] = useState<Record<string, any>>({ evo: [], all: [], rear: [] });
  
  // Key state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDays, setNewKeyDays] = useState(7);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Emote Modal Options
  const [selectedEmote, setSelectedEmote] = useState<{ id: string, name: string, slot: string } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ id: '', name: '', image: '' });
  
  // Context Menu state
  const [menuEmote, setMenuEmote] = useState<any>(null);
  
  const holdTimeout = useRef<NodeJS.Timeout | null>(null);

  const adminKey = typeof window !== 'undefined' ? sessionStorage.getItem('adminKey') : null;

  useEffect(() => {
    fetchKeys();
    fetchEmotes();
  }, []);

  const fetchKeys = async () => {
    const res = await fetch('/api/admin/keys', { headers: { 'x-admin-key': adminKey || '' } });
    const data = await res.json();
    if (data.success) setKeys(data.keys);
  };

  const fetchEmotes = async () => {
    const res = await fetch('/api/emotes');
    const data = await res.json();
    if (data.success) {
      setEmotes(data.emotes);
      if (data.settings) {
         setAppSettings(prev => ({ ...prev, ...data.settings }));
      }
    }
  };

  const saveSettings = async () => {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey || '' },
      body: JSON.stringify(appSettings)
    });
    const data = await res.json();
    if (data.success) alert("Settings saved!");
  };

  const createKey = async () => {
    if (!newKeyName) return;
    const res = await fetch('/api/admin/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey || '' },
      body: JSON.stringify({ keyName: newKeyName, days: newKeyDays })
    });
    const data = await res.json();
    if (data.success) {
      setKeys(data.keys);
      setNewKeyName('');
    }
  };

  const deleteKey = async (k: string) => {
    const res = await fetch(`/api/admin/keys/${k}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey || '' }
    });
    const data = await res.json();
    if (data.success) setKeys(data.keys);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(text);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      alert('Use Ctrl+C or long press to copy: ' + text);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addEmote = async () => {
    if (!editData.id || !editData.name) return;
    const res = await fetch('/api/admin/emotes/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey || '' },
      body: JSON.stringify({ id: editData.id, name: editData.name, slot: activeTab === 'keys' ? 'all' : activeTab, image: editData.image })
    });
    const data = await res.json();
    if (data.success) {
      setEmotes(data.emotes);
      setEditData({ id: '', name: '', image: '' });
      setEditMode(false);
    }
  };

  const updateEmote = async () => {
    if (!editData.id || !editData.name || !selectedEmote) return;
    const res = await fetch('/api/admin/emotes/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey || '' },
      body: JSON.stringify({ slot: selectedEmote.slot, oldId: selectedEmote.id, newId: editData.id, newName: editData.name, image: editData.image })
    });
    const data = await res.json();
    if (data.success) {
      setEmotes(data.emotes);
      setMenuEmote(null);
      setEditMode(false);
      setSelectedEmote(null);
    }
  };

  const deleteEmote = async (slot: string, id: string) => {
    const res = await fetch(`/api/admin/emotes/${slot}/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey || '' }
    });
    const data = await res.json();
    if (data.success) {
      setEmotes(data.emotes);
      setMenuEmote(null);
    }
  };

  const copyEmoteToSlot = async (slot: string, id: string, name: string, toSlot: string) => {
    const res = await fetch('/api/admin/emotes/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey || '' },
      body: JSON.stringify({ id, name, toSlot })
    });
    const data = await res.json();
    if (data.success) {
      setEmotes(data.emotes);
      setMenuEmote(null);
    }
  };

  const moveToSlot = async (slot: string, id: string, toSlot: string) => {
    const res = await fetch('/api/admin/emotes/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey || '' },
      body: JSON.stringify({ id, fromSlot: slot, toSlot })
    });
    const data = await res.json();
    if (data.success) {
      setEmotes(data.emotes);
      setMenuEmote(null);
    }
  };

  const handlePointerDown = (e: any, item: any, slot: string) => {
    holdTimeout.current = setTimeout(() => {
      setMenuEmote({ ...item, slot });
    }, 500);
  };

  const handlePointerUp = () => {
    if (holdTimeout.current) {
      clearTimeout(holdTimeout.current);
      holdTimeout.current = null;
    }
  };

  const handlePointerLeave = () => {
    if (holdTimeout.current) {
      clearTimeout(holdTimeout.current);
      holdTimeout.current = null;
    }
  };

  const tabs = [
    { id: 'keys', label: 'Key Manager' },
    { id: 'settings', label: 'API Settings' },
    { id: 'evo', label: `Evo (${emotes.evo?.length || 0})` },
    { id: 'all', label: `All (${emotes.all?.length || 0})` },
    { id: 'rear', label: `Rear (${emotes.rear?.length || 0})` }
  ] as const;

  return (
    <div className="fixed inset-0 bg-[#050505] flex flex-col p-4 sm:p-8 z-50 overflow-y-auto w-full selection:bg-[#3be05e]/20">
      <div className="max-w-6xl mx-auto w-full space-y-6 mt-6 md:mt-10 mb-20">
        <div className="flex items-center justify-between bg-gradient-to-r from-[#0a0c11] to-[#12161f] border border-[#1f232b] p-6 rounded-3xl shadow-2xl">
          <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#3be05e] to-[#3bb3ff] uppercase tracking-widest flex items-center gap-3">
            <Settings size={28} className="text-[#3be05e]" /> Admin Center
          </h1>
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 active:scale-95 transition-all text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.1)]"
          >
            <LogOut size={16} /> Exit
          </button>
        </div>

        <div className="flex bg-[#0a0c10] border border-[#1f232b] p-2 rounded-3xl overflow-x-auto snap-x hide-scrollbar">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[120px] snap-center flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id ? 'bg-[#3be05e] text-black shadow-[0_0_20px_rgba(59,224,94,0.3)]' : 'bg-transparent text-gray-500 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'keys' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-[#0a0c10] border border-[#1f232b] p-6 rounded-3xl space-y-4 h-fit">
              <h2 className="text-white font-black uppercase tracking-widest border-b border-[#1f232b] pb-4 flex items-center gap-2">
                <Plus size={18} className="text-[#3bb3ff]" /> Create Key
              </h2>
              <input 
                type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value.toUpperCase())}
                placeholder="KEY NAME (e.g. VIP-123)"
                className="w-full bg-[#11141b] border border-[#1f232b] p-4 rounded-2xl text-white font-mono text-sm outline-none focus:border-[#3be05e]"
              />
              <select 
                value={newKeyDays} onChange={(e) => setNewKeyDays(Number(e.target.value))}
                className="w-full bg-[#11141b] border border-[#1f232b] p-4 rounded-2xl text-white font-mono text-sm outline-none focus:border-[#3be05e]"
              >
                <option value={7}>7 Days</option>
                <option value={15}>15 Days</option>
                <option value={30}>1 Month</option>
                <option value={60}>2 Months</option>
                <option value={0}>Lifetime</option>
              </select>
              <button onClick={createKey} className="w-full bg-[#3bb3ff] text-black font-black py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,179,255,0.3)]">
                Generate Secure Key
              </button>
            </div>
            <div className="md:col-span-2 bg-[#0a0c10] border border-[#1f232b] p-6 rounded-3xl flex flex-col">
              <h2 className="text-white font-black uppercase tracking-widest border-b border-[#1f232b] pb-4 mb-4 flex items-center gap-2">
                <Key size={18} className="text-[#ffb400]" /> Active License Keys
              </h2>
              <div className="space-y-3 flex-1 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {Object.keys(keys).map(k => (
                  <div key={k} className="flex items-center justify-between bg-[#11141b] border border-[#1f232b] p-4 rounded-2xl group hover:border-[#3be05e]/50 transition-colors">
                    <div className="flex-1">
                      <div className="text-[#3be05e] font-mono font-bold text-lg tracking-wider flex items-center gap-3">
                        {k}
                        <button 
                          onClick={() => handleCopy(k)} 
                          className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-xl active:scale-90 transition-all ml-2"
                          title="Copy Key"
                        >
                          {copiedKey === k ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
                        </button>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono tracking-widest mt-1.5 flex items-center gap-2">
                        <span className="bg-white/5 px-2 py-0.5 rounded">
                          {keys[k].expiresAt ? `Exp: ${new Date(keys[k].expiresAt).toLocaleDateString()}` : 'Lifetime'}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${keys[k].boundDeviceId ? 'bg-orange-500/10 text-orange-400' : 'bg-[#3bb3ff]/10 text-[#3bb3ff]'}`}>
                          {keys[k].boundDeviceId ? `Bound: ${keys[k].boundDeviceId.slice(0,8)}...` : 'Unused'}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => deleteKey(k)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 active:scale-90 transition-all opacity-50 group-hover:opacity-100">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {Object.keys(keys).length === 0 && (
                   <div className="py-20 text-center text-gray-600 font-black uppercase text-xs tracking-widest">No keys generated</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0a0c10] border border-[#1f232b] p-6 rounded-3xl space-y-6">
            <h2 className="text-white font-black uppercase tracking-widest border-b border-[#1f232b] pb-4 flex items-center gap-2">
               <Settings size={18} className="text-[#3bb3ff]" /> API Configuration
            </h2>
            
            <div className="space-y-4">
               <div>
                  <label className="text-xs text-gray-500 uppercase font-black tracking-widest ml-2 mb-1 block">Target API URL</label>
                  <input 
                    type="text" value={appSettings.targetApiUrl} onChange={(e) => setAppSettings({ ...appSettings, targetApiUrl: e.target.value })}
                    className="w-full bg-[#11141b] border border-[#1f232b] p-4 rounded-2xl text-white font-mono text-sm outline-none focus:border-[#3be05e]"
                  />
                  <p className="text-[10px] text-gray-400 mt-2 ml-2">Appended with: <span className="font-mono text-[#3bb3ff]">?tc=...&uid1=...&uid2=...&uid3=...&uid4=...&uid5=0&uid6=0&emote_id=...</span> (Or use {`{teamCode}`}, {`{uid1}`}, {`{emoteId}`} etc in URL)</p>
               </div>
               
               <button onClick={saveSettings} className="bg-[#3be05e] text-black font-black py-4 px-8 rounded-2xl active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,224,94,0.3)] w-full md:w-auto">
                 Save Settings
               </button>
            </div>

            <div className="mt-8 pt-6 border-t border-[#1f232b] space-y-4">
              <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">Expected API Request Format</h3>
              <div className="bg-[#11141b] p-4 rounded-2xl relative border border-[#1f232b]">
                <button onClick={() => handleCopy('?tc={TeamCode}&uid1={UID1}&uid2={UID2}&uid3={UID3}&uid4={UID4}&uid5={UID5}&uid6={UID6}&emote_id={EmoteID}')} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white bg-white/5 rounded-xl active:scale-90 transition-all">
                  <Copy size={16} />
                </button>
                <pre className="text-[#3bb3ff] text-[10px] sm:text-xs overflow-x-auto pb-4 custom-scrollbar">
{`GET /join?tc=123456&uid1=1000&uid2=1001&uid3=1002&...&emote_id=909000000`}
                </pre>
              </div>

              <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2 mt-6">Expected API Response Format</h3>
              <div className="bg-[#11141b] p-4 rounded-2xl relative border border-[#1f232b]">
                <button onClick={() => handleCopy('{\n  "success": true,\n  "message": "Emote Sent"\n}')} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white bg-white/5 rounded-xl active:scale-90 transition-all">
                  <Copy size={16} />
                </button>
                <pre className="text-[#3bb3ff] text-[10px] sm:text-xs overflow-x-auto pb-4 custom-scrollbar">
{`{
  "success": true,   // Or any format (App ignores response body in 'no-cors' mode)
  "message": "Sent"
}`}
                </pre>
              </div>
            </div>
          </motion.div>
        )}

        {(activeTab === 'evo' || activeTab === 'all' || activeTab === 'rear') && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl text-white font-black uppercase tracking-widest flex items-center gap-2">
                <PlaySquare className="text-[#3be05e]" size={20} /> {activeTab} EMOTES
              </h2>
              <button 
                onClick={() => { setEditData({ id: '', name: '', image: '' }); setEditMode(true); setSelectedEmote(null); }}
                className="bg-[#3be05e] text-black font-black uppercase px-4 sm:px-6 py-3 rounded-xl text-[10px] sm:text-xs tracking-widest hover:shadow-[0_0_20px_rgba(59,224,94,0.3)] transition-all active:scale-95"
              >
                + Add Emote
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
              {emotes[activeTab]?.map((e: any) => (
                <div 
                  key={e.id} 
                  onPointerDown={(ev) => handlePointerDown(ev, e, activeTab)}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerLeave}
                  onContextMenu={(ev) => { ev.preventDefault(); return false; }}
                  className="group relative bg-[#11141b] border border-[#1f232b] rounded-2xl flex flex-col items-center justify-center p-3 hover:border-gray-600 transition-colors cursor-pointer aspect-square shadow-lg select-none"
                  style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                >
                  <img 
                    src={`/emotes/${e.id}.png`} 
                    alt={e.name}
                    className="w-10 h-10 object-contain mb-2 pointer-events-none"
                    onError={(img) => {
                      (img.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(e.name)}&backgroundColor=a8d1ff,fba0a9,fccb92,ffd460,a6e4d0,c0d3f8&textColor=000000`;
                    }}
                  />
                  <span className="text-[8px] sm:text-[9px] text-white font-black uppercase tracking-wider w-full text-center truncate drop-shadow-md pb-1 pointer-events-none">{e.name}</span>
                  <span className="text-[7.5px] text-gray-500 font-mono w-full text-center truncate pointer-events-none"># {e.id}</span>
                </div>
              ))}
              {(!emotes[activeTab] || emotes[activeTab].length === 0) && (
                <div className="col-span-full py-32 text-center text-gray-600 font-black uppercase tracking-widest">No emotes found</div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {editMode && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0c10] border border-[#1f232b] p-6 rounded-3xl w-full max-w-md shadow-2xl relative"
            >
              <h2 className="text-white font-black uppercase tracking-widest border-b border-[#1f232b] pb-4 mb-6 text-xl">
                {selectedEmote ? 'Edit Emote' : `Add to ${activeTab.toUpperCase()}`}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-2 mb-1 block">Emote Name</label>
                  <input 
                    type="text" value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})}
                    placeholder="E.g. LOL EMOTE"
                    className="w-full bg-[#11141b] border border-[#1f232b] p-4 rounded-2xl text-white font-mono text-sm outline-none focus:border-[#3be05e]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-2 mb-1 block">Emote ID</label>
                  <input 
                    type="text" value={editData.id} onChange={(e) => setEditData({...editData, id: e.target.value})}
                    placeholder="E.g. 909000000"
                    className="w-full bg-[#11141b] border border-[#1f232b] p-4 rounded-2xl text-white font-mono text-sm outline-none focus:border-[#3be05e]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-2 mb-1 block">Custom Thumbnail PNG (Optional)</label>
                  <div className="flex items-center gap-3 bg-[#11141b] border border-[#1f232b] pl-3 p-1.5 rounded-2xl">
                    {(editData.image || selectedEmote) && (
                      <img src={editData.image || `/emotes/${editData.id}.png`} className="w-10 h-10 object-contain bg-black/50 rounded-xl" onError={(e) => (e.target as any).style.display='none'} />
                    )}
                    <input 
                      type="file" accept="image/png,image/jpeg" onChange={handleImageUpload}
                      className="flex-1 text-white font-mono text-xs w-full overflow-hidden file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#3be05e]/20 file:text-[#3be05e] hover:file:bg-[#3be05e]/30 cursor-pointer"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => { setEditMode(false); setSelectedEmote(null); }}
                    className="flex-1 bg-[#11141b] text-gray-400 font-black py-4 rounded-2xl hover:text-white transition-all text-sm uppercase tracking-widest border border-[#1f232b]"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={selectedEmote ? updateEmote : addEmote} 
                    className="flex-1 bg-[#3be05e] text-black font-black py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase tracking-widest shadow-[0_0_15px_rgba(59,224,94,0.3)]"
                  >
                    {selectedEmote ? 'Save' : 'Add'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuEmote && (
          <div className="fixed inset-0 bg-black/70 z-[200] flex justify-center items-end sm:items-center">
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="bg-[#0a0c10] border-t sm:border border-[#1f232b] w-full max-w-md sm:rounded-3xl rounded-t-3xl pt-2 pb-8 px-4 sm:p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]"
            >
              <div className="w-12 h-1.5 bg-[#1f232b] rounded-full mx-auto mb-6 sm:hidden" />
              <div className="flex items-center gap-4 mb-6 pl-2">
                <img src={`/emotes/${menuEmote.id}.png`} className="w-14 h-14 bg-[#11141b] border border-[#1f232b] rounded-xl object-contain" onError={(img) => { (img.target as any).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(menuEmote.name)}&backgroundColor=a8d1ff,fba0a9,fccb92,ffd460,a6e4d0,c0d3f8&textColor=000000` }} />
                <div>
                  <h3 className="text-white font-black uppercase text-lg leading-tight tracking-widest">{menuEmote.name}</h3>
                  <p className="text-gray-500 font-mono text-xs"># {menuEmote.id}</p>
                </div>
              </div>

              <div className="space-y-2">
                <button onClick={() => { setEditData({ id: menuEmote.id, name: menuEmote.name, image: '' }); setSelectedEmote(menuEmote); setEditMode(true); setMenuEmote(null); }} className="w-full flex items-center justify-between p-4 bg-[#11141b] hover:bg-[#1a1e26] border border-[#1f232b] rounded-2xl transition-colors">
                  <span className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3"><Edit2 size={16} className="text-[#3bb3ff]" /> Edit Emote</span>
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
                
                {['evo', 'all', 'rear'].map(s => {
                  if (s === menuEmote.slot) return null;
                  return (
                    <button key={s} onClick={() => copyEmoteToSlot(menuEmote.slot, menuEmote.id, menuEmote.name, s)} className="w-full flex items-center justify-between p-4 bg-[#11141b] hover:bg-[#1a1e26] border border-[#1f232b] rounded-2xl transition-colors">
                      <span className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3"><Copy size={16} className="text-[#ffb400]" /> Copy to {s.toUpperCase()}</span>
                      <ChevronRight size={16} className="text-gray-600" />
                    </button>
                  );
                })}

                {['evo', 'all', 'rear'].map(s => {
                  if (s === menuEmote.slot) return null;
                  return (
                    <button key={s} onClick={() => moveToSlot(menuEmote.slot, menuEmote.id, s)} className="w-full flex items-center justify-between p-4 bg-[#11141b] hover:bg-[#1a1e26] border border-[#1f232b] rounded-2xl transition-colors">
                      <span className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3"><ArrowRightLeft size={16} className="text-[#3be05e]" /> Move to {s.toUpperCase()}</span>
                      <ChevronRight size={16} className="text-gray-600" />
                    </button>
                  );
                })}

                <button onClick={() => deleteEmote(menuEmote.slot, menuEmote.id)} className="w-full flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-2xl transition-colors mt-4">
                  <span className="text-sm font-black text-red-500 uppercase tracking-widest flex items-center gap-3"><Trash2 size={16} /> Delete from {menuEmote.slot.toUpperCase()}</span>
                </button>
              </div>

              <button onClick={() => setMenuEmote(null)} className="w-full mt-4 p-4 text-gray-500 hover:text-white uppercase font-black text-xs tracking-[0.2em] transition-colors">
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
