// src/components/Notification.jsx
import React from "react";

const Notification = ({ notification, show, onClose }) => {
  if (!show || !notification) return null;

  return (
    <div className="absolute top-10 right-0 bg-white text-black rounded shadow-md z-50 w-64 p-2">
      <h3 className="text-sm font-semibold mb-2 border-b pb-1">Notifications</h3>
      <p className="text-sm px-2 py-1">{notification}</p>
    </div>
  );
};

export default Notification;
