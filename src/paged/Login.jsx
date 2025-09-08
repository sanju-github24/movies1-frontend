import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { assets } from '../assets/assets';
import { AppContext } from '../context/AppContext';
import { Helmet } from 'react-helmet';

const Login = () => {
  const navigate = useNavigate();
  const { backendUrl, setIsLoggedIn, setUserData, setIsAdmin } = useContext(AppContext);

  const [mode, setMode] = useState('Sign Up');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    axios.defaults.withCredentials = true;

    try {
      const endpoint = mode === 'Sign Up' ? 'register' : 'login';
      const url = `${backendUrl}/api/auth/${endpoint}`;
      const payload = mode === 'Sign Up' ? { name, email, password } : { email, password };

      const { data } = await axios.post(url, payload);

      if (data.success) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userData', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
      
        setIsLoggedIn(true);
        setUserData(data.user);
        setIsAdmin(data.user.email === 'sanjusanjay0444@gmail.com');
      
        // ✅ Toast notification for successful login
        toast.success(`Login successful! Welcome, ${data.user.name}`);
      
        navigate('/');
      } else {
        toast.error(data.message || 'Unknown error occurred.');
      }
      
    } catch (error) {
      console.error('Login/Register Error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login | 1AnchorMovies</title>
        <meta
          name="description"
          content="Login to 1AnchorMovies to browse, upload, or download the latest HD Kannada, Tamil, Telugu, and Malayalam movies."
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
                  required
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

            <p
              onClick={() => navigate('/reset-password')}
              className="text-indigo-200 hover:underline cursor-pointer text-xs sm:text-sm text-right"
            >
              Forgot Password?
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-black text-white font-semibold hover:bg-white hover:text-black transition duration-200 text-sm sm:text-base"
            >
              {loading ? 'Processing...' : mode}
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
