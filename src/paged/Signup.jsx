// pages/Signup.jsx
import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) alert(error.message);
    else {
      alert("Signup successful! Check your email.");
      setSuccess(true);
    }
  };

  return (
    <div className="p-4 max-w-sm mx-auto mt-20 text-white">
      <h1 className="text-xl mb-4 font-semibold">Signup</h1>
      <form onSubmit={handleSignup} className="space-y-3">
        <input type="email" className="w-full p-2 rounded bg-gray-800" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
        <input type="password" className="w-full p-2 rounded bg-gray-800" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="bg-green-600 px-4 py-2 rounded">Signup</button>
      </form>
    </div>
  );
};

export default Signup;
