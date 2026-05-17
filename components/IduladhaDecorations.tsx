"use client"

// ─── Idul Adha decorative overlay ───────────────────────────────────────────
// Only rendered when theme === "idul-adha".
// Contains: crescent moon + stars (top-right), a relaxed goat (bottom-right),
// and 5 floating ketupat (diamond shapes) scattered around the edges.

export default function IduladhaDecorations() {
  return (
    <>
      <style>{`
        @keyframes eid-moon-glow {
          0%,100% { filter: drop-shadow(0 0 12px #d4920a88) drop-shadow(0 0 32px #d4920a44); }
          50%      { filter: drop-shadow(0 0 24px #d4920acc) drop-shadow(0 0 56px #d4920a66); }
        }
        @keyframes eid-star-twinkle {
          0%,100% { opacity: 0.7; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.35); }
        }
        @keyframes eid-ketupat-float {
          0%,100% { transform: translateY(0) rotate(45deg); }
          50%      { transform: translateY(-14px) rotate(45deg); }
        }
        @keyframes eid-goat-breathe {
          0%,100% { transform: scaleY(1); }
          50%      { transform: scaleY(1.025); }
        }
        @keyframes eid-goat-tail {
          0%,100% { transform: rotate(-8deg); }
          50%      { transform: rotate(12deg); }
        }
        @keyframes eid-goat-ear {
          0%,100% { transform: rotate(0deg); }
          30%      { transform: rotate(-12deg); }
          60%      { transform: rotate(6deg); }
        }
        @keyframes eid-blink {
          0%,92%,100% { transform: scaleY(1); }
          95%         { transform: scaleY(0.08); }
        }
      `}</style>

      {/* ── Crescent moon + stars ── top-right corner */}
      <div style={{
        position: "fixed", top: 24, right: 28,
        zIndex: 40, pointerEvents: "none",
        animation: "eid-moon-glow 4s ease-in-out infinite",
      }}>
        <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
          {/* Moon crescent */}
          <path
            d="M72 20 A30 30 0 1 0 72 76 A22 22 0 1 1 72 20Z"
            fill="#d4920a"
            opacity="0.92"
          />
          {/* Star 1 — large */}
          <g transform="translate(20,18)" style={{ animation: "eid-star-twinkle 2.1s ease-in-out infinite" }}>
            <polygon points="6,0 7.5,4.5 12,4.5 8.5,7 9.8,12 6,9 2.2,12 3.5,7 0,4.5 4.5,4.5"
              fill="#e8b84b" opacity="0.9" />
          </g>
          {/* Star 2 — small */}
          <g transform="translate(10,50)" style={{ animation: "eid-star-twinkle 2.8s ease-in-out infinite 0.5s" }}>
            <polygon points="4,0 5,3 8,3 5.5,4.8 6.5,8 4,6 1.5,8 2.5,4.8 0,3 3,3"
              fill="#e8b84b" opacity="0.75" />
          </g>
          {/* Star 3 — tiny */}
          <g transform="translate(35,8)" style={{ animation: "eid-star-twinkle 1.7s ease-in-out infinite 1.1s" }}>
            <polygon points="3,0 3.8,2.2 6,2.2 4.2,3.6 5,6 3,4.5 1,6 1.8,3.6 0,2.2 2.2,2.2"
              fill="#f5cc70" opacity="0.8" />
          </g>
          {/* Star 4 */}
          <g transform="translate(3,30)" style={{ animation: "eid-star-twinkle 3.2s ease-in-out infinite 0.3s" }}>
            <polygon points="3,0 3.8,2.2 6,2.2 4.2,3.6 5,6 3,4.5 1,6 1.8,3.6 0,2.2 2.2,2.2"
              fill="#e8b84b" opacity="0.65" />
          </g>
        </svg>
      </div>

      {/* ── Floating ketupat (rice cakes) ── */}
      {([
        { top: "12%",   left: "2%",   size: 32, delay: "0s",   dur: "3.8s", opacity: 0.55 },
        { top: "35%",   left: "1%",   size: 22, delay: "0.8s", dur: "4.5s", opacity: 0.45 },
        { top: "60%",   right: "2%",  size: 28, delay: "1.4s", dur: "3.2s", opacity: 0.50 },
        { top: "20%",   right: "5%",  size: 18, delay: "0.3s", dur: "5.0s", opacity: 0.40 },
        { bottom: "18%",left: "3%",   size: 24, delay: "2.0s", dur: "4.2s", opacity: 0.48 },
      ] as { top?: string; left?: string; right?: string; bottom?: string; size: number; delay: string; dur: string; opacity: number }[]).map((k, i) => (
        <div
          key={i}
          style={{
            position: "fixed",
            top: k.top, left: k.left, right: k.right, bottom: k.bottom,
            zIndex: 35, pointerEvents: "none",
            width: k.size, height: k.size,
            animation: `eid-ketupat-float ${k.dur} ease-in-out infinite`,
            animationDelay: k.delay,
          }}
        >
          <svg width={k.size} height={k.size} viewBox="0 0 32 32" fill="none">
            <polygon
              points="16,2 30,16 16,30 2,16"
              fill="#d4920a"
              opacity={k.opacity}
              stroke="#e8b84b"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />
            <line x1="16" y1="2"  x2="16" y2="30" stroke="#e8b84b" strokeWidth="1"   strokeOpacity="0.4" />
            <line x1="2"  y1="16" x2="30" y2="16" stroke="#e8b84b" strokeWidth="1"   strokeOpacity="0.4" />
            <line x1="7"  y1="7"  x2="25" y2="25" stroke="#e8b84b" strokeWidth="0.8" strokeOpacity="0.25" />
            <line x1="25" y1="7"  x2="7"  y2="25" stroke="#e8b84b" strokeWidth="0.8" strokeOpacity="0.25" />
          </svg>
        </div>
      ))}

      {/* ── Relaxed goat (santai) ── bottom-right */}
      <div style={{
        position: "fixed", bottom: 0, right: 16,
        zIndex: 38, pointerEvents: "none",
        animation: "eid-goat-breathe 3.5s ease-in-out infinite",
        transformOrigin: "bottom center",
      }}>
        <svg width="160" height="172" viewBox="0 0 160 172" fill="none">

          {/* ── Flower garland collar ── */}
          <g opacity="0.9">
            <path d="M38 110 Q50 120 65 118 Q80 115 95 118 Q110 120 120 112"
              stroke="#5a8a2a" strokeWidth="2" fill="none" strokeDasharray="3 2" />
            {[
              { cx: 42, cy: 116, c: "#e84393" },
              { cx: 56, cy: 121, c: "#f59e0b" },
              { cx: 70, cy: 118, c: "#ec4899" },
              { cx: 84, cy: 120, c: "#f97316" },
              { cx: 98, cy: 118, c: "#e84393" },
              { cx: 112, cy: 114, c: "#f59e0b" },
            ].map((fl, i) => (
              <g key={i}>
                {[0, 60, 120, 180, 240, 300].map(a => (
                  <ellipse key={a}
                    cx={fl.cx + 3.5 * Math.cos(a * Math.PI / 180)}
                    cy={fl.cy + 3.5 * Math.sin(a * Math.PI / 180)}
                    rx="2.2" ry="1.5"
                    transform={`rotate(${a} ${fl.cx} ${fl.cy})`}
                    fill={fl.c} opacity="0.9"
                  />
                ))}
                <circle cx={fl.cx} cy={fl.cy} r="1.8" fill="#fef3c7" />
              </g>
            ))}
          </g>

          {/* ── Body ── */}
          <ellipse cx="79" cy="120" rx="42" ry="28"
            fill="#e8dcc8" stroke="#c8b89a" strokeWidth="1.2" />

          {/* ── Legs (tucked under, sitting) ── */}
          <rect x="50" y="140" width="10" height="22" rx="5" fill="#ddd0b8" stroke="#c0aa90" strokeWidth="1" />
          <rect x="66" y="142" width="10" height="20" rx="5" fill="#ddd0b8" stroke="#c0aa90" strokeWidth="1" />
          <rect x="90" y="140" width="10" height="22" rx="5" fill="#d4c8b0" stroke="#bca888" strokeWidth="1" />
          <rect x="104" y="138" width="10" height="24" rx="5" fill="#d4c8b0" stroke="#bca888" strokeWidth="1" />

          {/* ── Hooves ── */}
          <ellipse cx="55"  cy="162" rx="6" ry="3" fill="#5c4a2a" />
          <ellipse cx="71"  cy="162" rx="6" ry="3" fill="#5c4a2a" />
          <ellipse cx="95"  cy="162" rx="6" ry="3" fill="#5c4a2a" />
          <ellipse cx="109" cy="162" rx="6" ry="3" fill="#5c4a2a" />

          {/* ── Tail (wagging) ── */}
          <g style={{ animation: "eid-goat-tail 1.8s ease-in-out infinite", transformOrigin: "122px 112px" }}>
            <path d="M120 112 Q132 104 128 96 Q126 90 130 86"
              stroke="#c8b89a" strokeWidth="5" strokeLinecap="round" fill="none" />
            <circle cx="130" cy="85" r="5" fill="#e8dcc8" />
          </g>

          {/* ── Neck ── */}
          <ellipse cx="54" cy="104" rx="14" ry="18" fill="#e8dcc8" stroke="#c8b89a" strokeWidth="1" />

          {/* ── Head ── */}
          <ellipse cx="44" cy="82" rx="22" ry="18" fill="#f0e6d2" stroke="#c8b89a" strokeWidth="1.2" />

          {/* ── Snout ── */}
          <ellipse cx="26" cy="86" rx="11" ry="8" fill="#f5d5c0" stroke="#d4b8a0" strokeWidth="1" />
          <ellipse cx="22" cy="87" rx="2"  ry="1.5" fill="#c49080" />
          <ellipse cx="29" cy="87" rx="2"  ry="1.5" fill="#c49080" />
          {/* Happy mouth */}
          <path d="M21 91 Q25 95 31 91" stroke="#c49080" strokeWidth="1.5" strokeLinecap="round" fill="none" />

          {/* ── Eyes (blink) ── */}
          <g style={{ animation: "eid-blink 4s ease-in-out infinite", transformOrigin: "36px 80px" }}>
            <ellipse cx="36" cy="80" rx="4"   ry="4.5" fill="#4a3520" />
            <ellipse cx="37.2" cy="78.5" rx="1.4" ry="1.4" fill="white" opacity="0.7" />
          </g>
          <g style={{ animation: "eid-blink 4s ease-in-out infinite 2.1s", transformOrigin: "50px 79px" }}>
            <ellipse cx="50" cy="79" rx="3.5" ry="4" fill="#4a3520" />
            <ellipse cx="51.2" cy="77.5" rx="1.2" ry="1.2" fill="white" opacity="0.7" />
          </g>

          {/* ── Ears (wiggle) ── */}
          <g style={{ animation: "eid-goat-ear 3s ease-in-out infinite", transformOrigin: "32px 72px" }}>
            <ellipse cx="28" cy="68" rx="7" ry="12" transform="rotate(-25 28 68)"
              fill="#f0d5c0" stroke="#c8b0a0" strokeWidth="1" />
            <ellipse cx="28" cy="68" rx="4" ry="8"  transform="rotate(-25 28 68)"
              fill="#f5c0b0" opacity="0.6" />
          </g>
          <g style={{ animation: "eid-goat-ear 3s ease-in-out infinite 1.5s", transformOrigin: "56px 71px" }}>
            <ellipse cx="58" cy="68" rx="7" ry="11" transform="rotate(20 58 68)"
              fill="#f0d5c0" stroke="#c8b0a0" strokeWidth="1" />
            <ellipse cx="58" cy="68" rx="4" ry="7"  transform="rotate(20 58 68)"
              fill="#f5c0b0" opacity="0.6" />
          </g>

          {/* ── Horns (small cute) ── */}
          <path d="M38 68 Q34 56 38 50 Q42 56 40 66Z" fill="#c8a060" stroke="#a07840" strokeWidth="0.8" />
          <path d="M52 66 Q54 54 58 50 Q60 57 56 65Z" fill="#c8a060" stroke="#a07840" strokeWidth="0.8" />

          {/* ── Beard tuft ── */}
          <path d="M24 92 Q22 100 26 104 Q28 100 24 92Z" fill="#e8d8c0" stroke="#c8b0a0" strokeWidth="0.8" />

          {/* ── Wool bumps on body ── */}
          {[
            { cx: 62, cy: 108 }, { cx: 76, cy: 103 }, { cx: 90, cy: 106 },
            { cx: 104, cy: 110 }, { cx: 70, cy: 116 }, { cx: 86, cy: 118 },
            { cx: 98, cy: 116 }, { cx: 60, cy: 118 },
          ].map((w, i) => (
            <circle key={i} cx={w.cx} cy={w.cy} r="5" fill="white" opacity="0.28" />
          ))}
        </svg>
      </div>
    </>
  )
}
