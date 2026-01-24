import React, { useContext, useState, useEffect } from "react";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { 
  User, 
  Mail, 
  Edit3, 
  LogOut, 
  Loader2, 
  ShieldCheck,
  Calendar,
  ArrowLeft,
  Save,
  X,
  UserCircle,
  CheckCircle2,
  Languages,
  Check,
  Sun,
  Moon
} from "lucide-react"; 

const Profile = () => {
  const { setUserData, setIsLoggedIn } = useContext(AppContext); 
  const [session, setSession] = useState(null);
  const [newName, setNewName] = useState("");
  const [selectedLangs, setSelectedLangs] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 🌓 Theme State (Defaults to Dark)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") !== "light";
  });

  // Updated language list (Bengali and Marathi removed)
  const availableLanguages = [
    "Hindi", "English", "Kannada", "Tamil", "Telugu", "Malayalam"
  ];

  // 🔐 Initial Auth Fetch
  useEffect(() => {
    const getSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      if (currentSession?.user?.user_metadata) {
        const metadata = currentSession.user.user_metadata;
        setNewName(metadata.full_name || currentSession.user.email.split('@')[0]);
        setSelectedLangs(metadata.languages || []);
      }
    };
    getSession();
  }, []);

  const navigate = useNavigate();

  // 🌓 Toggle Theme Logic
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
    if (newMode) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
  };

  const toggleLanguage = (lang) => {
    setSelectedLangs(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  /* Save Name & Languages to Supabase Metadata */
  const saveProfile = async () => {
    if (!newName.trim()) return toast.error("Name cannot be empty");
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { 
          full_name: newName.trim(),
          languages: selectedLangs
        }
      });

      if (error) throw error;

      toast.success("Profile updated successfully!");
      setSession(prev => ({ ...prev, user: data.user }));
      setEditing(false);
    } catch (err) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  /* Logout Flow */
  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      localStorage.clear(); 
      setIsLoggedIn(false);
      setUserData(null);
      toast.success("Logged out from secure session");
      navigate("/login1");
    } catch (error) {
      toast.error("Logout failed");
    } finally {
      setLoading(false);
    }
  };

  if (!session) return (
    <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className={`min-h-screen font-sans selection:bg-blue-500/30 flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'}`}>
      
      {/* 🎬 CINEMATIC BACKDROP */}
      <div className="absolute inset-0 z-0">
        <div className={`absolute inset-0 bg-[url('https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=2070')] bg-cover bg-center transition-opacity duration-700 ${isDarkMode ? 'opacity-10' : 'opacity-5'}`} />
        <div className={`absolute inset-0 transition-colors duration-700 ${isDarkMode ? 'bg-gradient-to-b from-blue-600/10 via-transparent to-gray-950' : 'bg-gradient-to-b from-blue-400/10 via-transparent to-gray-100'}`} />
        <div className="absolute inset-0 backdrop-blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[550px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className={`p-3 rounded-full transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-gray-400' : 'bg-black/5 hover:bg-black/10 text-gray-600'}`}>
            <ArrowLeft size={20} />
          </button>
          
          <img src="/logo_39.png" className="h-8" alt="logo" />

          {/* 🌓 THEME TOGGLE BUTTON */}
          <button 
            onClick={toggleTheme} 
            className={`p-3 rounded-full transition-all shadow-xl flex items-center justify-center ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-white text-blue-600 hover:bg-gray-100 border border-gray-200'}`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* Profile Card */}
        <div className={`backdrop-blur-2xl border transition-all duration-500 rounded-[3rem] p-8 md:p-10 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.3)] ${isDarkMode ? 'bg-gray-900/40 border-white/10' : 'bg-white/70 border-black/5'}`}>
          
          {/* User Avatar Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 p-1 shadow-2xl">
              <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                {newName ? (
                  <span className={`text-3xl font-black italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {newName[0].toUpperCase()}
                  </span>
                ) : (
                  <UserCircle size={50} className="text-gray-400" />
                )}
              </div>
            </div>
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tighter italic">{newName || "Explorer"}</h2>
            <div className="flex items-center gap-2 text-blue-500 text-[10px] font-black tracking-[0.2em] uppercase mt-1">
              <ShieldCheck size={12} /> Verified Account
            </div>
          </div>

          <div className="space-y-6">
            
            {/* Display Name Section */}
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-[0.2em] ml-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Your Name</label>
              <div className={`flex items-center gap-4 border p-4 rounded-2xl transition-all ${editing ? 'border-blue-500 ring-4 ring-blue-500/10' : (isDarkMode ? 'bg-black/40 border-white/5' : 'bg-gray-50 border-black/5')}`}>
                <User size={18} className={editing ? 'text-blue-500' : 'text-gray-400'} />
                <input 
                  type="text" 
                  value={newName}
                  onFocus={() => setEditing(true)}
                  onChange={(e) => setNewName(e.target.value)}
                  className={`bg-transparent border-none outline-none text-sm font-bold w-full ${isDarkMode ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                  placeholder="Enter your name"
                />
              </div>
            </div>

            {/* Language Interests Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 ml-2">
                <Languages size={14} className="text-blue-500" />
                <label className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Preferred Languages</label>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableLanguages.map(lang => {
                  const isActive = selectedLangs.includes(lang);
                  return (
                    <button
                      key={lang}
                      onClick={() => toggleLanguage(lang)}
                      className={`py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border flex items-center justify-center gap-2 ${
                        isActive 
                        ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" 
                        : (isDarkMode ? "bg-black/20 border-white/5 text-gray-500 hover:border-white/20" : "bg-gray-50 border-black/5 text-gray-400 hover:bg-gray-100")
                      }`}
                    >
                      {isActive && <Check size={10} />}
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email (Locked) */}
            <div className="space-y-2 opacity-60">
              <label className={`text-[10px] font-black uppercase tracking-[0.2em] ml-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Email Address</label>
              <div className={`flex items-center gap-4 border p-4 rounded-2xl ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-black/5'}`}>
                <Mail size={18} className="text-gray-400" />
                <span className={`text-sm font-medium truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{session.user.email}</span>
                <CheckCircle2 size={14} className="ml-auto text-green-600" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 space-y-3">
              <button 
                onClick={saveProfile}
                disabled={loading}
                className={`w-full font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-xl uppercase text-xs tracking-widest ${isDarkMode ? 'bg-white text-black hover:bg-blue-600 hover:text-white' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Save Preferences</>}
              </button>

              <button 
                onClick={handleLogout}
                className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all text-xs font-black uppercase tracking-widest border ${isDarkMode ? 'bg-red-600/10 hover:bg-red-600 text-red-500 border-red-500/10' : 'bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border-red-100'}`}
              >
                <LogOut size={18} /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;