import React, { useState, useContext } from "react";
import { supabase } from "../utils/supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { 
  Mail, Lock, UserPlus, LogIn, KeyRound, 
  ArrowLeft, ShieldCheck, AlertCircle, Loader2,
  CheckCircle2, Eye, EyeOff, User, ChevronRight
} from "lucide-react";

const AuthPage = () => {
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContext);

  // UI States
  const [authMode, setAuthMode] = useState("login"); // login | signup | reset
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showPassword, setShowPassword] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (message.text) setMessage({ type: "", text: "" }); 
  };

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      if (authMode === "signup") {
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match");
        }
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
            }
          }
        });
        if (error) throw error;
        setMessage({ type: "success", text: "Check your email for the confirmation link!" });
      } 
      
      else if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        navigate("/"); 
      } 
      
      else if (authMode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/update-password`,
        });
        if (error) throw error;
        setMessage({ type: "success", text: "Password reset link sent to your email!" });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-blue-500/30 flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* 🎬 DYNAMIC CINEMATIC BACKGROUND */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.8)), url('/the_netflix_login_background__canada__2024___by_logofeveryt_dh0w8qv-pre.jpg')`,
        }}
      >
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </div>

      {/* Auth Container */}
      <div className="relative z-10 w-full max-w-[440px] animate-in fade-in zoom-in duration-500">
        
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-10">
          <Link to="/" className="mb-6 hover:scale-105 transition-transform">
            <img src="/logo_39.png" className="h-10" alt="logo" />
          </Link>
          <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black tracking-[0.3em] bg-blue-900/60 px-4 py-1.5 rounded-full border border-blue-500/20 uppercase backdrop-blur-sm">
            <ShieldCheck size={14} /> Global Secure Auth
          </div>
        </div>

        {/* Glassy Card */}
        <div className="bg-blue-900/40 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl">
          
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2 text-white">
              {authMode === "login" && "Welcome Back"}
              {authMode === "signup" && "Create Account"}
              {authMode === "reset" && "Reset Password"}
            </h2>
            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">
              {authMode === "login" && "Access your premium watchlist"}
              {authMode === "signup" && "Join our cinematic community"}
              {authMode === "reset" && "Enter email to recover access"}
            </p>
          </div>

          {/* Feedback Messages */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 border ${
              message.type === "error" ? "bg-red-500/20 border-red-500/40 text-red-100" : "bg-green-500/20 border-green-500/40 text-green-100"
            }`}>
              {message.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <p className="text-[11px] font-black uppercase tracking-tight leading-relaxed">{message.text}</p>
            </div>
          )}

          <form onSubmit={handleAuthAction} className="space-y-5">
            {/* Name Input (Sign Up Only) */}
            {authMode === "signup" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-blue-200 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-white transition-colors" size={18} />
                  <input 
                    type="text"
                    name="name"
                    required
                    placeholder="John Doe"
                    className="w-full bg-white/10 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all text-white placeholder-blue-200"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-blue-200 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="email"
                  name="email"
                  required
                  placeholder="name@example.com"
                  className="w-full bg-white/10 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all text-white placeholder-blue-200"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Password Input (Hidden for Reset mode) */}
            {authMode !== "reset" && (
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black text-blue-200 uppercase tracking-widest ml-1">Password</label>
                  {authMode === "login" && (
                    <button type="button" onClick={() => setAuthMode("reset")} className="text-[10px] font-black text-blue-300 uppercase hover:text-white transition">Forgot?</button>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-white transition-colors" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-white/10 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all text-white placeholder-blue-200"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password (Signup only) */}
            {authMode === "signup" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-blue-200 uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-white transition-colors" size={18} />
                  <input 
                    type="password"
                    name="confirmPassword"
                    required
                    placeholder="••••••••"
                    className="w-full bg-white/10 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all text-white placeholder-blue-200"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button 
              disabled={loading}
              className="w-full bg-black text-white hover:bg-white hover:text-black font-black rounded-2xl py-4 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl disabled:opacity-50 disabled:scale-100 text-xs uppercase tracking-[0.2em] mt-4"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {authMode === "login" && <LogIn size={18} />}
                  {authMode === "signup" && <UserPlus size={18} />}
                  {authMode === "reset" && <KeyRound size={18} />}
                  {authMode === "login" ? "Sign In" : authMode === "signup" ? "Create Account" : "Send Reset Link"}
                </>
              )}
            </button>
          </form>

          {/* Switch Modes & Continue without Login */}
          <div className="mt-10 text-center space-y-6">
            {authMode === "login" ? (
              <p className="text-[11px] font-bold text-blue-100 uppercase tracking-widest">
                New to the platform?{" "}
                <button onClick={() => setAuthMode("signup")} className="text-blue-300 hover:underline">Register Now</button>
              </p>
            ) : (
              <button 
                onClick={() => setAuthMode("login")} 
                className="flex items-center justify-center gap-2 text-[11px] font-black text-blue-200 uppercase tracking-widest hover:text-white transition-colors mx-auto"
              >
                <ArrowLeft size={14} /> Back to Login
              </button>
            )}

            {/* --- NEW: CONTINUE WITHOUT LOGIN BUTTON --- */}
            <div className="pt-4 border-t border-white/10">
              <button 
                onClick={() => navigate("/")}
                className="group flex items-center justify-center gap-2 text-[11px] font-black text-gray-300 uppercase tracking-[0.2em] hover:text-white transition-all mx-auto"
              >
                Continue without login
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <p className="text-center mt-8 text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">
          © 1ANCHORMOVIES Secure Auth System v2.0
        </p>
      </div>
    </div>
  );
};

export default AuthPage;