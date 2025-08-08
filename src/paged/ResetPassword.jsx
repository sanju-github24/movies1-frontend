import React, { useContext, useState, useRef } from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { toast } from 'react-toastify'
import axios from 'axios'
import { Helmet } from 'react-helmet'

const ResetPassword = () => {
  const { backendUrl } = useContext(AppContext)
  axios.defaults.withCredentials = true
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [isOtpSubmited, setIsOtpSubmited] = useState(false)

  const inputRefs = useRef([])

  const handleInput = (e, index) => {
    if (e.target.value.length > 0 && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1].focus()
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
      inputRefs.current[index - 1].focus()
    }
  }

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text')
    const pasteArray = paste.split('').slice(0, 6)
    pasteArray.forEach((char, index) => {
      if (inputRefs.current[index]) {
        inputRefs.current[index].value = char
      }
    })
  }

  const onSubmitEmail = async (e) => {
    e.preventDefault()
    try {
      const { data } = await axios.post(backendUrl + '/api/auth/send-reset-otp', { email })
      data.success ? toast.success(data.message) : toast.error(data.message)
      data.success && setIsEmailSent(true)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const onSubmitOTP = async (e) => {
    e.preventDefault()
    const otpArray = inputRefs.current.map(e => e.value)
    setOtp(otpArray.join(''))
    setIsOtpSubmited(true)
  }

  const onSubmitNewPassword = async (e) => {
    e.preventDefault()
    try {
      const { data } = await axios.post(backendUrl + '/api/auth/reset-password', {
        email, otp, newPassword
      })
      data.success ? toast.success(data.message) : toast.error(data.message)
      data.success && navigate('/login')
    } catch (error) {
      toast.error(error.message)
    }
  }

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

        {/* Step 2: OTP Verification */}
        {!isOtpSubmited && isEmailSent && (
          <form
            onSubmit={onSubmitOTP}
            className="relative z-10 bg-blue-900/40 backdrop-blur-md p-8 sm:p-10 rounded-2xl shadow-xl w-full max-w-md border border-white/10 text-white"
          >
            <h1 className="text-3xl font-bold text-center mb-4">Enter OTP</h1>
            <p className="text-center mb-6 text-blue-100">Enter the 6-digit code sent to your email.</p>

            <div className="flex justify-between mb-6" onPaste={handlePaste}>
              {Array(6).fill(0).map((_, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  required
                  className="w-10 h-12 bg-[#333A5C] text-white text-center text-xl rounded-md"
                  ref={el => inputRefs.current[index] = el}
                  onInput={(e) => handleInput(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                />
              ))}
            </div>

            <button className="w-full py-2.5 rounded-full bg-black text-white font-semibold hover:bg-white hover:text-black transition duration-200">Verify OTP</button>
          </form>
        )}

        {/* Step 3: Set New Password */}
        {isOtpSubmited && isEmailSent && (
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
  )
}

export default ResetPassword
