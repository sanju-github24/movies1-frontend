import React, { useContext, useState, useRef } from 'react';
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import { Helmet } from 'react-helmet';

const ResetPassword = () => {
  const { backendUrl } = useContext(AppContext);
  axios.defaults.withCredentials = true;
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [accessToken, setAccessToken] = useState(''); // RENAMED from otp
  const [isTokenSubmited, setIsTokenSubmited] = useState(false); // RENAMED from isOtpSubmited

  const inputRefs = useRef([]);

  // --- Input Handlers (Modified for Access Token) ---
  const handleInput = (e, index) => {
    // Note: Supabase Access Tokens are long JWTs, not 6-digit OTPs. 
    // We keep the 6-digit input for UI consistency, but advise user to paste the whole token if possible.
    if (e.target.value.length > 0 && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text');
    // Paste the full token if possible, or at least the first 6 characters
    const pasteArray = paste.split(''); 
    
    // Clear the current inputs and fill with the pasted content
    inputRefs.current.forEach(input => input.value = '');
    
    pasteArray.forEach((char, index) => {
      if (inputRefs.current[index]) {
        inputRefs.current[index].value = char;
      }
    });

    // Store the full pasted token (this is the most important part)
    setAccessToken(paste);
    e.preventDefault();
  };
  // --------------------------------------------------

  // --- Step 1: Submit Email ---
  const onSubmitEmail = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(backendUrl + '/api/auth/send-reset-otp', { email });
      
      // CRITICAL: The message tells the user to check their email for the LINK.
      if (data.success) {
        toast.success(data.message);
        // We move to the token input step, simulating the user having checked their email.
        setIsEmailSent(true); 
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to send reset email.';
      toast.error(errorMessage);
    }
  };

  // --- Step 2: Submit Access Token (Was OTP) ---
  const onSubmitToken = (e) => {
    e.preventDefault();
    
    // If user pasted the whole token (best case), use that.
    let tokenValue = accessToken; 

    if (!tokenValue) {
        // If user manually typed/pasted short content into 6 fields, use that.
        // NOTE: This will likely fail since Supabase tokens are long JWTs.
        const tokenArray = inputRefs.current.map(e => e.value);
        tokenValue = tokenArray.join('');
        setAccessToken(tokenValue);
    }
    
    if (tokenValue.length < 10) { // Simple check for a very short token
        toast.error('Please enter the full access token received in your email link.');
        return;
    }
    
    // Now move to the final step
    setIsTokenSubmited(true);
    toast.info('Access token accepted. Enter your new password.');
  };

  // --- Step 3: Set New Password ---
  const onSubmitNewPassword = async (e) => {
    e.preventDefault();
    
    // CRITICAL FIX: Send accessToken instead of otp, aligning with backend expectation
    try {
      const { data } = await axios.post(backendUrl + '/api/auth/reset-password', {
        accessToken, // Use the stored token
        newPassword
      });
      
      data.success ? toast.success(data.message) : toast.error(data.message);
      data.success && navigate('/login');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to reset password.';
      toast.error(errorMessage);
    }
  };

  return (
    <>
      <Helmet>
        <title>Reset Password | 1AnchorMovies</title>
        <meta name="description" content="Reset your password to access 1AnchorMovies" />
        <link rel="canonical" href="https://www.1anchormovies.live/reset-password" />
      </Helmet>

      <div
        className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.8)), url('/bg.png')"
        }}
      >
        <div className="absolute inset-0 backdrop-blur-[2px]" />
       

        {/* Step 1: Email Input */}
        {!isEmailSent && (
          <form
            onSubmit={onSubmitEmail}
            className="relative z-10 bg-blue-900/40 backdrop-blur-md p-8 sm:p-10 rounded-2xl shadow-xl w-full max-w-md border border-white/10 text-white"
          >
            <h1 className="text-3xl font-bold text-center mb-4">Reset Password</h1>
            <p className="text-center mb-6 text-blue-100">Enter your registered email address.</p>
            <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]">
              <img src={assets.mail_icon} alt="mail" className="w-3 h-3" />
              <input
                type="email"
                placeholder="Email id"
                className="bg-transparent outline-none text-white w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button className="w-full py-2.5 rounded-full bg-black text-white font-semibold hover:bg-white hover:text-black transition duration-200">Submit</button>
          </form>
        )}

        {/* Step 2: Access Token Input (Simulating OTP for existing UI) */}
        {!isTokenSubmited && isEmailSent && (
          <form
            onSubmit={onSubmitToken} // Use the new handler
            className="relative z-10 bg-blue-900/40 backdrop-blur-md p-8 sm:p-10 rounded-2xl shadow-xl w-full max-w-md border border-white/10 text-white"
          >
            <h1 className="text-3xl font-bold text-center mb-4">Enter Access Token</h1>
            <p className="text-center mb-6 text-blue-100">
                A reset link was sent to your email. Click the link and copy the **access token** from the URL to paste here.
            </p>

            <div className="flex justify-between mb-6" onPaste={handlePaste}>
              {Array(6).fill(0).map((_, index) => (
                <input
                  key={index}
                  type="text"
                  // Keep maxLength="1" for visual, but advise user to paste the long token
                  maxLength="1" 
                  required
                  className="w-10 h-12 bg-[#333A5C] text-white text-center text-xl rounded-md"
                  ref={el => inputRefs.current[index] = el}
                  onInput={(e) => handleInput(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                />
              ))}
            </div>
            <p className="text-red-300 text-xs mb-4">
                **Note:** You must paste the full token from the reset link for this to work.
            </p>

            <button className="w-full py-2.5 rounded-full bg-black text-white font-semibold hover:bg-white hover:text-black transition duration-200">Confirm Token</button>
          </form>
        )}

        {/* Step 3: Set New Password */}
        {isTokenSubmited && isEmailSent && (
          <form
            onSubmit={onSubmitNewPassword}
            className="relative z-10 bg-blue-900/40 backdrop-blur-md p-8 sm:p-10 rounded-2xl shadow-xl w-full max-w-md border border-white/10 text-white"
          >
            <h1 className="text-3xl font-bold text-center mb-4">Set New Password</h1>
            <p className="text-center mb-6 text-blue-100">Enter your new password below.</p>

            <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]">
              <img src={assets.lock_icon} alt="lock" className="w-3 h-3" />
              <input
                type="password"
                placeholder="New password"
                className="bg-transparent outline-none text-white w-full"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <button className="w-full py-2.5 rounded-full bg-black text-white font-semibold hover:bg-white hover:text-black transition duration-200">Reset Password</button>
          </form>
        )}
      </div>
    </>
  );
};

export default ResetPassword;