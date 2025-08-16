import React, { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { backendUrl } from "../utils/api";
import axios from "axios";


const Profile = () => {
    const { userData, setUserData, setIsLoggedIn, } = useContext(AppContext);
  const [newName, setNewName] = useState(userData?.name || "");
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  const saveName = async () => {
    if (!newName.trim()) return toast.error("Name cannot be empty");

    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.put(`${backendUrl}/api/user/update-name`, {
        newName: newName.trim(),
      });

      if (data.success) {
        toast.success("Name updated successfully!");
        setUserData((prev) => ({ ...prev, name: newName.trim() }));
        setEditing(false);
      } else {
        toast.error(data.message || "Failed to update name");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Server error");
    }
  };

  /* Logout */
  const handlelogout = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(`${backendUrl}/api/auth/logout`);
      if (data.success) {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userData");
        setIsLoggedIn(false);
        setUserData(null);
        navigate("/login");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const resendEmailVerification = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(
        `${backendUrl}/api/auth/send-verify-otp`,
        { email: userData?.email }
      );
      if (data.success) {
        toast.success("Verification email sent");
        navigate("/verify-account");  // 🔥 Navigate to your EmailVerify page
      } else {
        toast.error(data.message || "Failed to send verification email");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };
  
  
  
  return (
    <div className="min-h-screen bg-white text-white py-12">
      <div className="max-w-md mx-auto bg-black shadow-lg p-6 rounded">
        <h1 className="text-2xl font-semibold mb-6">Your Profile</h1>
  
{/* Email Field */}
<div className="mb-4">
  <label className="text-sm font-medium flex items-center gap-2">
    <img
      src="/email.png"
      alt="Email"
      className="w-4 h-4 bg-white p-1 rounded"
      style={{ objectFit: 'contain' }}
    />
    Email:
  </label>
  <div className="text-gray-200 border px-3 py-2 rounded bg-gray-800 flex items-center justify-between">
    <span>{userData?.email}</span>
    {userData?.isAccountVerified && (
      <div className="flex items-center gap-1">
        <span className="text-green-400 text-xs">Verified</span>
        <img
          src="/check.png"
          alt="Verified"
          className="w-5 h-5"
          title="Email verified"
        />
      </div>
    )}
  </div>
</div>

{/* Email Verification Reminder */}
{!userData?.isAccountVerified && (
  <div className="mb-4">
    <label className="text-sm font-medium flex items-center gap-2">
      <img src="/warning.png" alt="Verify" className="w-4 h-4" />
      Email not verified:
    </label>
    <div className="mt-1 border bg-gray-800 px-3 py-2 rounded text-yellow-300 flex items-center justify-between">
      <span>Click to resend verification email</span>
      <button
        onClick={resendEmailVerification}
        className="text-yellow-400 underline text-sm"
      >
        Resend
      </button>
    </div>
  </div>
)}

  
        {/* Username Field */}
        <div className="mb-4">
          <label className="text-sm font-medium flex items-center gap-2">
            <img
              src="/id-card.png"
              alt="Username"
              className="w-4 h-4 bg-white p-1 rounded"
              style={{ objectFit: 'contain' }}
            />
            Username:
          </label>
          {editing ? (
            <>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="border px-3 py-2 rounded w-full mt-1 bg-white text-black"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    saveName(newName);
                    setEditing(false);
                  }}
                  className="bg-blue-600 text-white px-4 py-1 rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setNewName(userData?.name || "");
                  }}
                  className="bg-gray-300 text-black px-4 py-1 rounded"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between border px-3 py-2 rounded mt-1 bg-gray-800">
              <span>{userData?.name}</span>
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-blue-400"
              >
                ✏️ Edit
              </button>
            </div>
          )}
        </div>
  
        {/* Members Section */}
        <div className="mb-4">
          <label className="text-sm font-medium flex items-center gap-2">
            <img
              src="/skill.png"
              alt="Members"
              className="w-4 h-4 bg-white p-1 rounded"
              style={{ objectFit: 'contain' }}
            />
            Members Area:
          </label>
          <div className="mt-1 border bg-gray-800 px-3 py-2 rounded text-gray-400">
            <button
              onClick={() =>
                toast.info("Only verified members can access this. Email us to join.")
              }
              className="text-red-400 underline text-sm"
            >
              🚫 Access Blocked – Become a member to view
            </button>
          </div>
        </div>
  
        {/* Want to become a member */}
        <div className="mb-6">
          <label className="text-sm font-medium">Want to become a member?</label>
          <div className="mt-1">
            <a
              href="mailto:Anchormovies.proton.me"
              className="text-blue-400 underline text-sm"
            >
              Send us an email
            </a>
          </div>
        </div>
  
        {/* Logout Button */}
        <button
          onClick={handlelogout}
          className="bg-red-600 text-white px-4 py-2 rounded w-full"
        >
          Logout
        </button>
      </div>
    </div>
  );
  
};

export default Profile;