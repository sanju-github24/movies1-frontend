import React, { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import AdminLayout from "../components/AdminLayout";

const AdminMembers = () => {
  const [requests, setRequests] = useState([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    fetchRequests();
    fetchMembers();

    const subscription = supabase
      .channel("membership_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "membership_applications" },
        () => {
          fetchRequests();
          fetchMembers();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("membership_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching requests:", error);
    else setRequests(data || []);
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("membership_applications")
      .select("user_id, name, email, status, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: true });

    if (error) console.error("Error fetching members:", error);
    else setMembers(data || []);
  };

  const updateStatus = async (email, status) => {
    if (!email) return console.error("Cannot update: email is missing");
  
    const { data, error } = await supabase
      .from("membership_applications")
      .update({ status })
      .eq("email", email);  // ✅ use email instead of user_id
  
    if (error) console.error("Error updating status:", error);
    else {
      console.log("Update success:", data);
      fetchRequests();
      fetchMembers();
    }
  };
  

  return (
    <AdminLayout>
      <h2 className="text-2xl font-semibold mb-6">Membership Applications</h2>

      {requests.length === 0 ? (
        <p className="text-gray-400">No applications yet.</p>
      ) : (
        <div className="space-y-4 mb-8">
          {requests.map((req) => (
            <div
              key={req.user_id}
              className="bg-gray-900 p-4 rounded-lg flex justify-between items-center border border-gray-800"
            >
              <div>
                <h3 className="font-semibold text-lg">{req.name}</h3>
                <p className="text-sm text-gray-400">{req.email}</p>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    req.status === "approved"
                      ? "bg-green-600 text-white"
                      : req.status === "rejected"
                      ? "bg-red-600 text-white"
                      : "bg-yellow-600 text-black"
                  }`}
                >
                  {req.status}
                </span>
              </div>

              {req.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(req.email, "approved")} // ✅ fix here
                    className="bg-green-600 px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(req.email, "rejected")} // ✅ fix here
                    className="bg-red-600 px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="text-2xl font-semibold mb-4">Approved Members</h2>
      {members.length === 0 ? (
        <p className="text-gray-400">No members yet.</p>
      ) : (
        <div className="space-y-4">
          {members.map((member) => (
            <div
              key={member.user_id}
              className="bg-gray-800 p-4 rounded-lg flex justify-between items-center border border-gray-700"
            >
              <div>
                <h3 className="font-semibold text-lg">{member.name}</h3>
                <p className="text-sm text-gray-400">{member.email}</p>
              </div>
              <span className="text-sm text-gray-300">
                Joined: {new Date(member.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminMembers;
