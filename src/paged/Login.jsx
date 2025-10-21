import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { assets } from '../assets/assets';
import { AppContext } from '../context/AppContext';
import { Helmet } from 'react-helmet';
import { Loader2 } from 'lucide-react'; // Import Loader icon for better UX

const Login = () => {
  const navigate = useNavigate();
  // We keep backendUrl in context but will use a relative path for local development
  const { backendUrl, setIsLoggedIn, setUserData, setIsAdmin } = useContext(AppContext); 

  const [mode, setMode] = useState('Sign Up');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Ensure credentials are sent with every request
    axios.defaults.withCredentials = true;

    try {
      const endpoint = mode === 'Sign Up' ? 'register' : 'login';
      
      // 🚀 CRITICAL FIX: Use a relative path to enable the Vite proxy.
      // The path starts with '/api' which Vite intercepts and forwards to http://localhost:4000
      const url = `/api/auth/${endpoint}`; 
      
      const payload = mode === 'Sign Up' ? { name, email, password } : { email, password };

      const { data } = await axios.post(url, payload);

      if (data.success) {
        
        // --- Success Logic ---
        if (mode === 'Sign Up') {
          toast.success(`🎉 Registration successful! Please check your email to verify your account.`);
          
          // Clear form fields
          setName('');
          setEmail('');
          setPassword('');
          
          // Switch to Login mode and optionally guide them to a verification page
          setMode('Login');
          navigate('/verify-account'); // Redirect to a page that tells them to verify
          
        } else { // Login Success
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('userData', JSON.stringify(data.user));
          localStorage.setItem('token', data.token); 
        
          setIsLoggedIn(true);
          setUserData(data.user);
          
          // Security Note: Hardcoding admin email is functional but role-based authorization is recommended
          setIsAdmin(data.user.email === 'sanjusanjay0444@gmail.com');
        
          toast.success(`✅ Login successful! Welcome back, ${data.user.name || data.user.email}`);
        
          navigate('/');
        }
        
      } else {
        // Backend returns success: false with a message
        toast.error(data.message || 'Unknown error occurred.');
      }
      
    } catch (error) {
      // Network/Server error
      console.error('Login/Register Error:', error.response?.data || error.message);
      
      // Use the message from the backend response, or a generic error message
      const errorMessage = error.response?.data?.message || 'Something went wrong. Please check your connection.';
      toast.error(errorMessage);
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{mode === 'Sign Up' ? 'Sign Up' : 'Login'} | 1AnchorMovies</title>
        <meta
          name="description"
          content="Login or create your account on 1AnchorMovies to browse, upload, or download the latest HD movies."
        />
        <link rel="canonical" href="https://www.1anchormovies.live/login" />
      </Helmet>

      {/* Background */}
      <div
        className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center px-4 sm:px-0"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.8)), url('/background_banner.jpg')`,
        }}
      >
        <div className="absolute inset-0 backdrop-blur-[2px]" />

        {/* Glassy Card */}
        <div className="relative z-10 bg-blue-900/40 backdrop-blur-md p-6 sm:p-10 rounded-2xl shadow-xl w-full max-w-md border border-white/10 text-white">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
            {mode === 'Sign Up' ? 'Create Account' : 'Login'}
          </h2>
          <p className="text-center mb-6 text-blue-100 text-sm sm:text-base">
            {mode === 'Sign Up' ? 'Create your account' : 'Login to your account'}
          </p>

          <form onSubmit={onSubmitHandler} className="flex flex-col gap-4">
            {mode === 'Sign Up' && (
              <div className="flex items-center bg-white/10 px-4 py-2.5 rounded-full w-full">
                <img src={assets.person_icon} alt="Name icon" className="mr-3 w-5" />
                <input
                  onChange={(e) => setName(e.target.value)}
                  value={name}
                  type="text"
                  placeholder="Full Name"
                  required={mode === 'Sign Up'} // Only required for Sign Up
                  className="w-full bg-transparent text-white placeholder-blue-200 outline-none text-sm sm:text-base"
                />
              </div>
            )}

            <div className="flex items-center bg-white/10 px-4 py-2.5 rounded-full w-full">
              <img src={assets.mail_icon} alt="Mail icon" className="mr-3 w-5" />
              <input
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                type="email"
                placeholder="Email"
                required
                className="w-full bg-transparent text-white placeholder-blue-200 outline-none text-sm sm:text-base"
              />
            </div>

            <div className="flex items-center bg-white/10 px-4 py-2.5 rounded-full w-full">
              <img src={assets.lock_icon} alt="Lock icon" className="mr-3 w-5" />
              <input
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                type="password"
                placeholder="Password"
                required
                className="w-full bg-transparent text-white placeholder-blue-200 outline-none text-sm sm:text-base"
              />
            </div>

            {mode === 'Login' && (
                <p
                    onClick={() => navigate('/reset-password')}
                    className="text-indigo-200 hover:underline cursor-pointer text-xs sm:text-sm text-right"
                >
                    Forgot Password?
                </p>
            )}


            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-black text-white font-semibold hover:bg-white hover:text-black transition duration-200 text-sm sm:text-base flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                mode
              )}
            </button>
          </form>

          <p className="text-blue-100 text-center text-xs sm:text-sm mt-5">
            {mode === 'Sign Up' ? 'Already have an account? ' : "Don't have an account? "}
            <span
              onClick={() => setMode(mode === 'Sign Up' ? 'Login' : 'Sign Up')}
              className="text-blue-300 cursor-pointer underline"
            >
              {mode === 'Sign Up' ? 'Login here' : 'Sign up'}
            </span>
          </p>

          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/')}
              className="text-xs sm:text-sm text-gray-200 hover:underline"
            >
              Continue without login →
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;