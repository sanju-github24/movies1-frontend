import React, { useContext, useState, useEffect, useCallback } from "react";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import axios from "axios";
// import { backendUrl } from "../utils/api"; // ⬅️ You may remove this import now

// Assuming Lucide React is installed
import { 
  User, 
  Mail, 
  Edit3, 
  CheckCircle, 
  AlertTriangle, 
  LogOut, 
  Loader2, 
  Award,
  Clock 
} from "lucide-react"; 

// --- Helper Components for Status Display (No changes needed here) ---

const StatusBadge = ({ type, text, Icon }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${
    type === 'verified' ? 'bg-green-600/20 text-green-400 border border-green-600' :
    type === 'warning' ? 'bg-yellow-600/20 text-yellow-300 border border-yellow-600' :
    'bg-gray-600/20 text-gray-300 border border-gray-600'
  }`}>
    <Icon className="w-3.5 h-3.5" />
    {text}
  </span>
);

const MembershipBadge = ({ status }) => {
  const statusMap = {
    approved: { text: "Approved", color: "bg-blue-600", Icon: Award },
    pending: { text: "Pending", color: "bg-yellow-600", Icon: Clock },
    none: { text: "None", color: "bg-gray-600", Icon: Award },
    // Add 'rejected' if applicable
  };
  const { text, color, Icon } = statusMap[status] || statusMap.none;

  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg ${color} text-white font-medium`}>
      <Icon className="w-5 h-5" />
      <span>Status: {text}</span>
    </div>
  );
};


// --- Main Profile Component ---

const Profile = () => {
  const { userData, setUserData, setIsLoggedIn, backendUrl } = useContext(AppContext);
  const [newName, setNewName] = useState(userData?.name || "");
  const [editing, setEditing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState(userData?.membershipStatus || "none");
  const navigate = useNavigate();

  // Helper variables for JSX readability
  const isVerified = userData?.isAccountVerified;
  const userEmail = userData?.email;

  /* Save Name */
  const saveName = async () => {
    if (!newName.trim()) return toast.error("Name cannot be empty");
    try {
      axios.defaults.withCredentials = true;
      // 🎯 Using backendUrl for the absolute path
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
  const handleLogout = async () => {
    try {
      axios.defaults.withCredentials = true;
      
      // 🎯 Using backendUrl for the absolute path
      await axios.post(`${backendUrl}/api/auth/logout`);
      toast.info("Backend session cleared.");
      
    } catch (error) {
      // This is where the CORS block happens on the successful 200 response.
      console.error("Backend logout failed (CORS/Cookie likely):", error.response?.data || error.message);
      toast.warn("Server logout failed, but clearing local session.");
    }

    try {
      // 2. Attempt Logout from Supabase
      await supabase.auth.signOut(); 
    } catch (error) {
       console.error("Supabase logout failed:", error.message);
    }
    
    // 3. Client-side cleanup and navigation (MUST run)
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userData");
    localStorage.removeItem("token"); 
    setIsLoggedIn(false);
    setUserData(null);
    
    toast.success("You have been logged out.");
    navigate("/login");
  };

  /* Resend Verification Email */
  const resendEmailVerification = async () => {
    try {
      axios.defaults.withCredentials = true;
      // 🎯 Using backendUrl for the absolute path
      const { data } = await axios.post(
        `${backendUrl}/api/auth/send-verify-otp`,
        { email: userEmail }
      );
      if (data.success) {
        toast.success("Verification email sent! Check your inbox.");
        navigate("/verify-account");
      } else {
        toast.error(data.message || "Failed to send verification email");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  /* Apply for Membership */
  const applyForMembership = async () => {
    if (membershipStatus !== "none") return;

    // 🚫 Restriction for a specific email
    if (userEmail === "sanjusanjay0444@gmail.com") {
      return toast.error("❌ You are not allowed to apply for membership.");
    }

    setIsApplying(true);
    try {
      const { error } = await supabase.from("membership_applications").insert([
        {
          email: userEmail,
          name: userData?.name,
          status: "pending",
        },
      ]);

      if (error) throw error;

      toast.success("🎉 Your membership request has been sent! Await admin approval.");
      setMembershipStatus("pending");
      setUserData((prev) => ({ ...prev, membershipStatus: "pending" }));
    } catch (error) {
      toast.error(error.message || "Failed to apply");
    } finally {
      setIsApplying(false);
    }
  };

  /* Fetch latest membership status on mount (using useCallback for optimization) */
  const fetchMembershipStatus = useCallback(async () => {
    if (!userEmail) return;
    try {
      const { data, error } = await supabase
        .from("membership_applications")
        .select("status")
        .eq("email", userEmail)
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
  }, [userEmail, setUserData]);
  
  useEffect(() => {
    fetchMembershipStatus();
  }, [fetchMembershipStatus]);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto bg-gray-800 shadow-2xl p-6 sm:p-10 rounded-xl border border-gray-700">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-blue-400 border-b border-gray-700 pb-4">
          Personal Profile
        </h1>
  
        {/* Email Section */}
        <section className="mb-6 p-4 rounded-lg bg-gray-700/50">
          <label className="text-sm font-semibold flex items-center gap-2 mb-2 text-gray-400">
            <Mail className="w-5 h-5 text-blue-400" />
            Email Address
          </label>
          <div className="flex items-center justify-between gap-4 border-b border-gray-600 pb-2">
            <span className="truncate text-gray-100 font-medium">{userEmail}</span>
            {isVerified ? (
              <StatusBadge type="verified" text="Verified" Icon={CheckCircle} />
            ) : (
              <StatusBadge type="warning" text="Unverified" Icon={AlertTriangle} />
            )}
          </div>

          {/* Verification Call to Action */}
          {!isVerified && (
            <div className="mt-3 flex justify-between items-center text-sm p-3 rounded-lg bg-yellow-900/40 border border-yellow-500/50">
              <p className="text-yellow-300">
                Please verify your email to ensure account security.
              </p>
              <button
                onClick={resendEmailVerification}
                className="text-yellow-400 hover:text-yellow-200 font-medium whitespace-nowrap"
              >
                Resend Link
              </button>
            </div>
          )}
        </section>
        
        <hr className="border-gray-700 my-6" />

        {/* Username Section */}
        <section className="mb-6 p-4 rounded-lg bg-gray-700/50">
          <label className="text-sm font-semibold flex items-center gap-2 mb-3 text-gray-400">
            <User className="w-5 h-5 text-blue-400" />
            Username
          </label>
          {editing ? (
            <>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="border-2 border-blue-500 px-4 py-2 rounded-lg w-full mt-1 bg-white text-gray-900 text-base focus:ring-blue-500 focus:border-blue-500 transition"
              />
              <div className="flex gap-3 mt-3">
                <button
                  onClick={saveName}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex-1 font-semibold transition"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setNewName(userData?.name || "");
                  }}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg flex-1 font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700 border border-gray-600">
              <span className="text-lg font-medium text-white truncate">{userData?.name}</span>
              <button 
                onClick={() => setEditing(true)} 
                className="text-blue-400 hover:text-blue-300 transition flex items-center gap-1.5"
                title="Edit Username"
              >
                <Edit3 className="w-4 h-4" /> Edit
              </button>
            </div>
          )}
        </section>
        
        <hr className="border-gray-700 my-6" />

        {/* Membership Section */}
        <section className="mb-8 p-4 rounded-lg bg-gray-700/50">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-gray-400">
            <Award className="w-5 h-5 text-blue-400" />
            Membership Status
          </h3>
          
          <MembershipBadge status={membershipStatus} />

          <div className="mt-4">
            <button
              onClick={applyForMembership}
              disabled={membershipStatus !== "none" || isApplying}
              className={`px-4 py-3 rounded-lg w-full font-semibold transition flex items-center justify-center gap-2 ${
                membershipStatus === "approved"
                  ? "bg-blue-600 cursor-not-allowed text-white"
                  : membershipStatus === "pending"
                  ? "bg-gray-600 cursor-not-allowed text-white"
                  : "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30"
              }`}
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> 
                  Submitting Application...
                </>
              ) : membershipStatus === "approved" ? (
                <>✅ Membership Approved</>
              ) : membershipStatus === "pending" ? (
                <>⏳ Application Pending</>
              ) : (
                <>Apply for Membership</>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Membership allows access to exclusive content and features.
            </p>
          </div>
        </section>
  
        {/* Logout */}
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg w-full font-semibold flex items-center justify-center gap-2 mt-6 shadow-xl shadow-red-500/30 transition"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;