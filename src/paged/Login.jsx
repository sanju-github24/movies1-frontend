import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { assets } from '../assets/assets';
import { AppContext } from '../context/AppContext';

const Login = () => {
  const navigate = useNavigate();
  const { backendUrl, setIsLoggedIn, getUserData,setUserData} = useContext(AppContext);

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
  
      console.log(`➡️ Submitting to ${url}`, payload);
  
      const { data } = await axios.post(url, payload);
      console.log('✅ Response:', data);
  
      if (data.success) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userData', JSON.stringify(data.user));
        localStorage.setItem('token', data.token); // ✅ save token if using auth headers
      
        setIsLoggedIn(true);
        setUserData(data.user); // ✅ correctly set user context
        setIsAdmin(data.user.email === "sanjusanjay0444@gmail.com"); // ✅ admin check if needed
      
        navigate('/');
      }
      
       else {
        toast.error(data.message || 'Unknown error occurred.');
      }
    } catch (error) {
      console.error('❌ Login/Register Error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-200 to-purple-400 px-4">
      <img
        onClick={() => navigate('/')}
        src={assets.logo}
        alt="Logo"
        className="absolute left-5 sm:left-20 top-5 sm:w-32 cursor-pointer"
      />

      <div className="bg-slate-900 p-10 rounded-2xl shadow-xl w-full sm:w-96 text-indigo-300 text-sm">
        <h2 className="text-3xl font-semibold text-white text-center mb-3">
          {mode === 'Sign Up' ? 'Create Account' : 'Login'}
        </h2>
        <p className="text-center mb-6">
          {mode === 'Sign Up' ? 'Create your account' : 'Login to your account'}
        </p>

        <form onSubmit={onSubmitHandler}>
          {mode === 'Sign Up' && (
            <div className="flex items-center gap-3 w-full rounded-full px-5 py-2.5 mb-4 bg-[#333A5C]">
              <img src={assets.person_icon} alt="Name icon" />
              <input
                onChange={(e) => setName(e.target.value)}
                value={name}
                className="bg-transparent outline-none w-full"
                type="text"
                placeholder="Full Name"
                required
              />
            </div>
          )}

          <div className="flex items-center gap-3 w-full rounded-full px-5 py-2.5 mb-4 bg-[#333A5C]">
            <img src={assets.mail_icon} alt="Mail icon" />
            <input
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              className="bg-transparent outline-none w-full"
              type="email"
              placeholder="Email"
              required
            />
          </div>

          <div className="flex items-center gap-3 w-full rounded-full px-5 py-2.5 mb-4 bg-[#333A5C]">
            <img src={assets.lock_icon} alt="Lock icon" />
            <input
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              className="bg-transparent outline-none w-full"
              type="password"
              placeholder="Password"
              required
            />
          </div>

          <p
            onClick={() => navigate('/reset-password')}
            className="mb-4 text-indigo-400 hover:underline cursor-pointer"
          >
            Forgot Password?
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-900 text-white font-medium hover:opacity-90 transition-opacity"
          >
            {loading ? 'Processing...' : mode}
          </button>
        </form>

        <p className="text-gray-400 text-center text-xs mt-4">
          {mode === 'Sign Up' ? 'Already have an account? ' : "Don't have an account? "}
          <span
            onClick={() => setMode(mode === 'Sign Up' ? 'Login' : 'Sign Up')}
            className="text-blue-400 cursor-pointer underline"
          >
            {mode === 'Sign Up' ? 'Login here' : 'Sign up'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
