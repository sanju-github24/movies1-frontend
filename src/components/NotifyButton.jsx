/* "Tell me when something new lands."
 *
 * The one audience that does not depend on a ranking algorithm: someone who
 * asked to hear from us gets a notification on every upload. Deliberately not
 * a pop-up on arrival — a permission prompt shown to a stranger is refused and
 * cannot be asked again in that browser, which spends the chance for nothing.
 * It is a button, shown once the visitor is already here and interested.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";

const API = import.meta.env.VITE_BACKEND_URL || "https://movies1-backend.onrender.com";

const urlBase64ToUint8Array = (base64) => {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const supported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator &&
  "PushManager" in window && "Notification" in window;

const NotifyButton = ({ className = "" }) => {
  const [state, setState] = useState("idle");   // idle | busy | on | unsupported | denied

  useEffect(() => {
    if (!supported()) return setState("unsupported");
    if (Notification.permission === "denied") return setState("denied");
    // Already subscribed on this device? Then say so rather than asking again.
    navigator.serviceWorker.getRegistration("/push-sw.js")
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => { if (sub) setState("on"); })
      .catch(() => { /* nothing subscribed yet */ });
  }, []);

  const subscribe = useCallback(async () => {
    setState("busy");
    try {
      const { enabled, key } = await fetch(`${API}/api/push/key`).then((r) => r.json());
      if (!enabled || !key) throw new Error("notifications are not configured yet");

      const reg = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,                        // required by Chrome
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const res = await fetch(`${API}/api/push/subscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error("could not save the subscription");
      setState("on");
    } catch (e) {
      console.warn("[notify]", e.message);
      setState(Notification.permission === "denied" ? "denied" : "idle");
    }
  }, []);

  if (state === "unsupported") return null;

  const label = {
    on: "You'll be notified",
    busy: "Just a moment…",
    denied: "Notifications blocked",
    idle: "Notify me of new uploads",
  }[state];

  return (
    <button
      type="button"
      onClick={state === "idle" ? subscribe : undefined}
      disabled={state !== "idle"}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase
        tracking-widest transition border ${
          state === "on"
            ? "bg-green-600/15 border-green-500/40 text-green-300 cursor-default"
            : state === "denied"
            ? "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-500 border-blue-500 text-white"
        } ${className}`}
    >
      {state === "busy" ? <Loader2 size={14} className="animate-spin" />
        : state === "on" ? <BellRing size={14} /> : <Bell size={14} />}
      {label}
    </button>
  );
};

export default NotifyButton;
