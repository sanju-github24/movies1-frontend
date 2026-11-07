import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, ShieldAlert, CheckCircle2, MonitorSmartphone, XCircle } from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { backendUrl } from "../utils/api";

/* The other half of "Scan to sign in": a phone that is already signed in
   opens the QR's link here and says yes or no to the browser that showed it.
   (Backend: routes/qrLoginRoutes.js.) */

const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function QrApprove() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const code = params.get("c") || "";
    // loading | needs-login | ready | approving | done | denied | expired | error
    const [state, setState] = useState("loading");
    const [info, setInfo] = useState(null);       // { device, email, expiresIn }
    const [left, setLeft] = useState(0);
    const until = useRef(0);

    const token = async () => (await supabase.auth.getSession()).data.session?.access_token || "";
    const call = async (path, method = "GET") => {
        const t = await token();
        return fetch(`${backendUrl}/api/qr-login/${encodeURIComponent(code)}/${path}`, { method, headers: { Authorization: `Bearer ${t}` } });
    };

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!code) { setState("expired"); return; }
            if (!(await token())) { if (alive) setState("needs-login"); return; }
            try {
                const r = await call("info");
                if (!alive) return;
                if (r.status === 401) { setState("needs-login"); return; }
                if (r.status === 404) { setState("expired"); return; }
                if (!r.ok) throw new Error(String(r.status));
                const d = await r.json();
                until.current = Date.now() + d.expiresIn * 1000;
                setInfo(d); setState("ready");
            } catch { if (alive) setState("error"); }
        })();
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    // The code lasts two minutes; show what is left, and stop offering Approve when it is gone.
    useEffect(() => {
        if (state !== "ready") return undefined;
        const t = setInterval(() => {
            const s = Math.max(0, Math.ceil((until.current - Date.now()) / 1000));
            setLeft(s);
            if (s <= 0) setState("expired");
        }, 500);
        return () => clearInterval(t);
    }, [state]);

    const approve = async () => {
        setState("approving");
        try {
            const r = await call("approve", "POST");
            if (r.status === 404) { setState("expired"); return; }
            if (!r.ok) throw new Error(String(r.status));
            setState("done");
        } catch { setState("error"); }
    };
    const deny = async () => { try { await call("deny", "POST"); } catch { /* nothing to undo */ } setState("denied"); };

    const signIn = () => navigate(`/auth?next=${encodeURIComponent(`/qr-approve?c=${code}`)}`);

    const card = {
        loading: null,
        "needs-login": { icon: <ShieldAlert className="w-10 h-10 text-amber-300" />, title: "Sign in on this phone first", body: "To approve another device, this phone has to be signed in to AnchorMovies.", action: <button onClick={signIn} className="btn-main">Sign in</button> },
        expired: { icon: <XCircle className="w-10 h-10 text-white/60" />, title: "This code has expired", body: "Go back to the other screen — it shows a fresh code every two minutes.", action: <Link to="/" className="btn-main">Back to AnchorMovies</Link> },
        error: { icon: <XCircle className="w-10 h-10 text-red-300" />, title: "Something went wrong", body: "We couldn't reach the server. Try scanning the code again.", action: <Link to="/" className="btn-main">Back to AnchorMovies</Link> },
        done: { icon: <CheckCircle2 className="w-10 h-10 text-emerald-300" />, title: "You’re approved", body: "The other device is signing in now. You can close this page.", action: <Link to="/" className="btn-main">Done</Link> },
        denied: { icon: <XCircle className="w-10 h-10 text-white/60" />, title: "Sign-in refused", body: "Nothing was shared with that device.", action: <Link to="/" className="btn-main">Done</Link> },
    }[state];

    return (
        <div className="min-h-dvh bg-black text-white flex items-center justify-center px-5 py-10">
            <Helmet><title>Approve sign-in | AnchorMovies</title></Helmet>
            <style>{`.btn-main{display:flex;align-items:center;justify-content:center;width:100%;height:56px;border-radius:16px;background:#fff;color:#000;font-weight:700;font-size:17px}`}</style>
            <div className="w-full max-w-[420px] rounded-3xl bg-[#0b0b0b] ring-1 ring-white/10 p-7 sm:p-9 text-center">
                <Link to="/" className="inline-block mb-6"><img src="/logo_39.png" alt="AnchorMovies" className="h-9 mx-auto" /></Link>

                {(state === "loading" || state === "approving") && <Loader2 className="w-9 h-9 mx-auto animate-spin text-white/70" />}

                {card && (
                    <div className="flex flex-col items-center">
                        {card.icon}
                        <h1 className="mt-5 text-2xl font-bold tracking-tight">{card.title}</h1>
                        <p className="mt-2 text-white/55 leading-relaxed">{card.body}</p>
                        <div className="mt-7 w-full">{card.action}</div>
                    </div>
                )}

                {state === "ready" && info && (
                    <div className="flex flex-col items-center">
                        <MonitorSmartphone className="w-10 h-10 text-sky-300" />
                        <h1 className="mt-5 text-2xl font-bold tracking-tight">Sign in on another device?</h1>
                        <p className="mt-3 text-white/55 leading-relaxed">
                            <span className="text-white font-semibold">{info.device}</span> is asking to sign in as <span className="text-white font-semibold break-all">{info.email}</span>.
                        </p>
                        <p className="mt-4 rounded-xl bg-amber-400/10 ring-1 ring-amber-400/25 px-4 py-3 text-sm text-amber-100/90 leading-relaxed">
                            Only approve if you just opened AnchorMovies on that device and scanned this code yourself.
                        </p>
                        <p className="mt-4 text-xs text-white/40 tabular-nums">Expires in {clock(left)}</p>
                        <button onClick={approve} className="btn-main mt-5">Approve</button>
                        <button onClick={deny} className="mt-3 h-12 w-full rounded-2xl text-white/70 hover:bg-white/5 font-semibold">Not me — refuse</button>
                    </div>
                )}
            </div>
        </div>
    );
}