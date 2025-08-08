import React, { useContext, useEffect, useRef } from "react";
import { assets } from "../assets/assets";
import { AppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { Helmet } from "react-helmet";

const EmailVerify = () => {
  const { backendUrl, isLoggedin, userData, getUserData } = useContext(AppContext);
  const navigate = useNavigate();
  const inputRefs = useRef([]);

  useEffect(() => {
    isLoggedin && userData && userData.isAccountVerified && navigate("/");
  }, [isLoggedin, userData]);

  const handleInput = (e, index) => {
    if (e.target.value.length > 0 && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && e.target.value === "" && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData("text");
    const pasteArray = paste.split("").slice(0, 6);
    pasteArray.forEach((char, index) => {
      if (inputRefs.current[index]) {
        inputRefs.current[index].value = char;
      }
    });
  };

  const onSumbitHandler = async (e) => {
    e.preventDefault();
    try {
      const otpArray = inputRefs.current.map((e) => e.value);
      const otp = otpArray.join("");
      const { data } = await axios.post(
        backendUrl + "/api/auth/verify-account",
        { otp },
        { withCredentials: true }
      );
      if (data.success) {
        toast.success(data.message);
        getUserData();
        navigate("/");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  return (
    <>
      <Helmet>
        <title>Email Verify | 1AnchorMovies</title>
        <meta
          name="description"
          content="Verify your email to access 1AnchorMovies and start downloading the latest movies."
        />
        <link rel="canonical" href="https://www.1anchormovies.live/verify-email" />
      </Helmet>

      <div
        className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.8)), url('/bg.png')",
        }}
      >
        <div className="absolute inset-0 backdrop-blur-[2px]" />

        <form
          onSubmit={onSumbitHandler}
          className="relative z-10 bg-blue-900/40 backdrop-blur-md p-8 sm:p-10 rounded-2xl shadow-xl w-full max-w-md border border-white/10 text-white"
        >
          <h1 className="text-3xl font-bold text-center mb-4">Email Verification</h1>
          <p className="text-center mb-6 text-blue-100">
            Enter the 6-digit OTP sent to your email
          </p>

          <div className="flex justify-between mb-6" onPaste={handlePaste}>
            {Array(6)
              .fill(0)
              .map((_, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  required
                  ref={(el) => (inputRefs.current[index] = el)}
                  className="w-10 h-12 bg-[#333A5C] text-white text-center text-xl rounded-md"
                  onInput={(e) => handleInput(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                />
              ))}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-full bg-black text-white font-semibold hover:bg-white hover:text-black transition duration-200"
          >
            Verify Email
          </button>
        </form>
      </div>
    </>
  );
};

export default EmailVerify;