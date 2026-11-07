import React, { useMemo } from "react";
import qrcode from "../utils/qrcodeGenerator";

/* A QR code drawn as one SVG path, so it is sharp at any size and needs no
   canvas. Error correction is "H" so the logo can sit over the middle. */
export default function QrCode({ value, logo, className = "" }) {
    const { n, d } = useMemo(() => {
        const q = qrcode(0, "H");
        q.addData(value);
        q.make();
        const n = q.getModuleCount();
        let d = "";
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
        return { n, d };
    }, [value]);

    const box = n * 0.2;                     // the logo covers ~4% of the area; "H" recovers up to 30%
    const at = (n - box) / 2;
    return (
        <svg viewBox={`0 0 ${n} ${n}`} className={className} shapeRendering="crispEdges" role="img" aria-label="QR code to sign in">
            <rect width={n} height={n} fill="#fff" />
            <path d={d} fill="#000" />
            {logo && (
                <>
                    <rect x={at - 0.6} y={at - 0.6} width={box + 1.2} height={box + 1.2} rx={box * 0.28} fill="#fff" />
                    <rect x={at} y={at} width={box} height={box} rx={box * 0.24} fill="#000" />
                    <image href={logo} x={at + box * 0.16} y={at + box * 0.16} width={box * 0.68} height={box * 0.68} preserveAspectRatio="xMidYMid meet" />
                </>
            )}
        </svg>
    );
}