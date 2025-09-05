import React, { useContext, useState, useEffect } from "react";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import axios from "axios";
import { backendUrl } from "../utils/api";

const Profile = () => {
  const { userData, setUserData, setIsLoggedIn } = useContext(AppContext);
  const [newName, setNewName] = useState(userData?.name || "");
  const [editing, setEditing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState(userData?.membershipStatus || "none");
  const navigate = useNavigate();

  /* ✅ Save Name */
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

  /* ✅ Logout */
  const handleLogout = async () => {
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

  /* ✅ Resend Verification Email */
  const resendEmailVerification = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(
        `${backendUrl}/api/auth/send-verify-otp`,
        { email: userData?.email }
      );
      if (data.success) {
        toast.success("Verification email sent");
        navigate("/verify-account");
      } else {
        toast.error(data.message || "Failed to send verification email");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  /* ✅ Apply for Membership */
  const applyForMembership = async () => {
    if (membershipStatus !== "none") return;

    // 🚫 Restriction for a specific email
    if (userData?.email === "sanjusanjay0444@gmail.com") {
      return toast.error("❌ You are not allowed to apply for membership.");
    }

    setIsApplying(true);
    try {
      const { error } = await supabase.from("membership_applications").insert([
        {
          email: userData?.email,
          name: userData?.name,
          status: "pending",
        },
      ]);

      if (error) throw error;

      toast.success("🎉 Your membership request has been sent!");
      setMembershipStatus("pending");
      setUserData((prev) => ({ ...prev, membershipStatus: "pending" }));
    } catch (error) {
      toast.error(error.message || "Failed to apply");
    } finally {
      setIsApplying(false);
    }
  };

  /* ✅ Fetch latest membership status on mount */
  useEffect(() => {
    const fetchMembershipStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("membership_applications")
          .select("status")
          .eq("email", userData?.email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
  
        if (error) throw error;
  
        if (data?.status) {
          setMembershipStatus(data.status);
          setUserData((prev) => ({ ...prev, membershipStatus: data.status }));
        }
      } catch (err) {
        console.error("Failed to fetch membership status:", err.message);
      }
    };
  
    if (userData?.email) fetchMembershipStatus();
  }, [userData?.email]);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white py-8 px-4 sm:px-6">
      <div className="max-w-md mx-auto bg-black shadow-lg p-6 sm:p-8 rounded-lg">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6 text-center">Your Profile</h1>
  
        {/* Email */}
        <div className="mb-4">
          <label className="text-sm font-medium flex items-center gap-2">
            <img src="/email.png" alt="Email" className="w-4 h-4 bg-white p-1 rounded" />
            Email:
          </label>
          <div className="text-gray-200 border px-3 py-2 rounded bg-gray-800 flex items-center justify-between">
            <span className="truncate">{userData?.email}</span>
            {userData?.isAccountVerified && (
              <div className="flex items-center gap-1">
                <span className="text-green-400 text-xs">Verified</span>
                <img src="/check.png" alt="Verified" className="w-4 h-4" title="Email verified" />
              </div>
            )}
          </div>
        </div>
  
        {/* Email Verification */}
        {!userData?.isAccountVerified && (
          <div className="mb-4">
            <label className="text-sm font-medium flex items-center gap-2">
              <img src="/warning.png" alt="Verify" className="w-4 h-4" />
              Email not verified:
            </label>
            <div className="mt-1 border bg-gray-800 px-3 py-2 rounded text-yellow-300 flex items-center justify-between text-sm">
              <span className="truncate">Click to resend verification email</span>
              <button
                onClick={resendEmailVerification}
                className="text-yellow-400 underline text-xs sm:text-sm"
              >
                Resend
              </button>
            </div>
          </div>
        )}
  
        {/* Username */}
        <div className="mb-4">
          <label className="text-sm font-medium flex items-center gap-2">
            <img src="/id-card.png" alt="Username" className="w-4 h-4 bg-white p-1 rounded" />
            Username:
          </label>
          {editing ? (
            <>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="border px-3 py-2 rounded w-full mt-1 bg-white text-black text-sm sm:text-base"
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                <button
                  onClick={saveName}
                  className="bg-blue-600 text-white px-4 py-1 rounded w-full sm:w-auto text-sm sm:text-base"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setNewName(userData?.name || "");
                  }}
                  className="bg-gray-300 text-black px-4 py-1 rounded w-full sm:w-auto text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between border px-3 py-2 rounded mt-1 bg-gray-800 text-sm sm:text-base">
              <span className="truncate">{userData?.name}</span>
              <button onClick={() => setEditing(true)} className="text-sm sm:text-base text-blue-400">
                ✏️ Edit
              </button>
            </div>
          )}
        </div>
  
        {/* Membership */}
        <div className="mb-6">
          <label className="text-sm font-medium flex items-center gap-2">
            <img src="/skill.png" alt="Membership" className="w-4 h-4 bg-white p-1 rounded" />
            Membership:
          </label>
          <div className="mt-2">
            <button
              onClick={applyForMembership}
              disabled={membershipStatus !== "none" || isApplying}
              className={`px-4 py-2 rounded w-full text-sm sm:text-base ${
                membershipStatus === "approved"
                  ? "bg-blue-600 cursor-not-allowed"
                  : membershipStatus === "pending"
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              } text-white`}
            >
              {membershipStatus === "approved"
                ? "✅ Approved – Enjoy your membership"
                : membershipStatus === "pending"
                ? "⏳ Pending – Await admin approval"
                : isApplying
                ? "Applying..."
                : "Apply for Membership"}
            </button>
          </div>
        </div>
  
        {/* Logout */}
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded w-full text-sm sm:text-base"
        >
          Logout
        </button>
      </div>
    </div>
  );
  
};

export default Profile;
