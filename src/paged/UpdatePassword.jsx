import React, { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";

const UpdatePassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) navigate("/login");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <form onSubmit={handleUpdate} className="bg-gray-900 border border-white/10 p-10 rounded-[2.5rem] w-full max-w-md space-y-6">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Create New Password</h2>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="password" 
            placeholder="New Password" 
            required
            className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 text-white outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button disabled={loading} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" /> : "Update Password"}
        </button>
      </form>
    </div>
  );
};

export default UpdatePassword;