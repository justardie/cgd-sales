"use client"

// ─── Idul Adha decorative overlay ───────────────────────────────────────────
// Starbucks-green / warm-gold palette — minimalist, exclusive.
// Elements: elegant crescent moon (top-right), scattered diamond stars,
// 4 floating ketupat outlines, and a relaxed goat (bottom-LEFT).

export default function IduladhaDecorations() {
  return (
    <>
      <style>{`
        @keyframes eid-moon-pulse {
          0%,100% { opacity: 0.90; filter: drop-shadow(0 0 10px rgba(184,146,85,0.50)); }
          50%      { opacity: 1.00; filter: drop-shadow(0 0 22px rgba(184,146,85,0.75)) drop-shadow(0 0 40px rgba(184,146,85,0.30)); }
        }
        @keyframes eid-star-fade {
          0%,100% { opacity: 0.30; }
          50%      { opacity: 0.80; }
        }
        @keyframes eid-ketupat-float {
          0%,100% { transform: translateY(0px) rotate(45deg); }
          50%      { transform: translateY(-10px) rotate(45deg); }
        }
        @keyframes eid-goat-breathe {
          0%,100% { transform: scaleY(1.000); }
          50%      { transform: scaleY(1.018); }
        }
        @keyframes eid-tail-wag {
          0%,100% { transform: rotate(-6deg); }
          50%      { transform: rotate(10deg); }
        }
        @keyframes eid-ear-twitch {
          0%,70%,100% { transform: rotate(0deg); }
          80%          { transform: rotate(-10deg); }
          90%          { transform: rotate(5deg); }
        }
        @keyframes eid-blink {
          0%,90%,100% { transform: scaleY(1); }
          95%         { transform: scaleY(0.06); }
        }
      `}</style>

      {/* ── Crescent moon — top-right, flat geometric, muted gold ── */}
      <div style={{
        position: "fixed", top: 20, right: 24,
        zIndex: 40, pointerEvents: "none",
        animation: "eid-moon-pulse 5s ease-in-out infinite",
      }}>
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
          {/* Clean geometric crescent */}
          <path
            d="M64 18 A26 26 0 1 0 64 68 A19 19 0 1 1 64 18Z"
            fill="#B89255"
            opacity="0.88"
          />
        </svg>
      </div>

      {/* ── Scattered diamond stars — 4-pointed, minimalist ── */}
      {([
        { x: 18,  y: 22,  s: 7,  delay: "0s",    dur: "2.8s" },
        { x: 38,  y: 12,  s: 5,  delay: "0.6s",  dur: "3.5s" },
        { x: 10,  y: 48,  s: 4,  delay: "1.2s",  dur: "2.2s" },
        { x: 55,  y: 28,  s: 6,  delay: "0.3s",  dur: "4.0s" },
        { x: 30,  y: 38,  s: 3,  delay: "1.8s",  dur: "3.1s" },
        { x: 14,  y: 68,  s: 5,  delay: "0.9s",  dur: "2.6s" },
      ] as { x: number; y: number; s: number; delay: string; dur: string }[]).map((st, i) => (
        <div key={i} style={{
          position: "fixed",
          top: st.y, right: st.x,
          zIndex: 39, pointerEvents: "none",
          animation: `eid-star-fade ${st.dur} ease-in-out infinite`,
          animationDelay: st.delay,
        }}>
          {/* 4-pointed diamond star */}
          <svg width={st.s * 2} height={st.s * 2} viewBox="0 0 14 14" fill="none">
            <path
              d="M7 0 L8.2 5.8 L14 7 L8.2 8.2 L7 14 L5.8 8.2 L0 7 L5.8 5.8 Z"
              fill="#CBA268"
              opacity="0.75"
            />
          </svg>
        </div>
      ))}

      {/* ── Floating ketupat — outline only, minimal ── */}
      {([
        { top: "14%",   left: "2.5%", size: 28, delay: "0s",   dur: "4.2s", op: 0.35 },
        { top: "38%",   left: "1.5%", size: 20, delay: "1.0s", dur: "5.0s", op: 0.28 },
        { top: "62%",   right: "2%",  size: 24, delay: "0.5s", dur: "3.8s", op: 0.32 },
        { bottom: "20%",left: "3%",   size: 18, delay: "1.8s", dur: "4.6s", op: 0.26 },
      ] as { top?: string; left?: string; right?: string; bottom?: string; size: number; delay: string; dur: string; op: number }[]).map((k, i) => (
        <div key={i} style={{
          position: "fixed",
          top: k.top, left: k.left, right: k.right, bottom: k.bottom,
          zIndex: 35, pointerEvents: "none",
          width: k.size, height: k.size,
          animation: `eid-ketupat-float ${k.dur} ease-in-out infinite`,
          animationDelay: k.delay,
        }}>
          <svg width={k.size} height={k.size} viewBox="0 0 28 28" fill="none">
            {/* Outline only — clean and minimal */}
            <polygon
              points="14,1 27,14 14,27 1,14"
              fill="none"
              stroke="#B89255"
              strokeWidth="1.4"
              opacity={k.op}
            />
            {/* Inner diamond */}
            <polygon
              points="14,6 22,14 14,22 6,14"
              fill="none"
              stroke="#B89255"
              strokeWidth="0.8"
              opacity={k.op * 0.6}
            />
          </svg>
        </div>
      ))}

      {/* ── Relaxed goat — bottom-LEFT ── */}
      <div style={{
        position: "fixed", bottom: 0, left: 88, /* offset right of sidebar */
        zIndex: 38, pointerEvents: "none",
        animation: "eid-goat-breathe 4s ease-in-out infinite",
        transformOrigin: "bottom center",
      }}>
        <svg width="148" height="158" viewBox="0 0 148 158" fill="none">

          {/* ── Flower garland collar ── */}
          <g opacity="0.85">
            <path d="M28 108 Q42 118 58 116 Q73 113 88 116 Q103 118 114 110"
              stroke="#3a6830" strokeWidth="1.8" fill="none" strokeDasharray="3 2" />
            {[
              { cx: 33,  cy: 114, c: "#c084fc" },
              { cx: 48,  cy: 119, c: "#fbbf24" },
              { cx: 63,  cy: 116, c: "#f472b6" },
              { cx: 78,  cy: 118, c: "#fb923c" },
              { cx: 93,  cy: 116, c: "#c084fc" },
              { cx: 107, cy: 112, c: "#fbbf24" },
            ].map((fl, i) => (
              <g key={i}>
                {[0, 72, 144, 216, 288].map(a => (
                  <ellipse key={a}
                    cx={fl.cx + 3.2 * Math.cos(a * Math.PI / 180)}
                    cy={fl.cy + 3.2 * Math.sin(a * Math.PI / 180)}
                    rx="2" ry="1.4"
                    transform={`rotate(${a} ${fl.cx} ${fl.cy})`}
                    fill={fl.c}
                    opacity="0.85"
                  />
                ))}
                <circle cx={fl.cx} cy={fl.cy} r="1.6" fill="#fef3c7" />
              </g>
            ))}
          </g>

          {/* ── Body ── */}
          <ellipse cx="72" cy="118" rx="40" ry="26"
            fill="#D8CEBA" stroke="#BCA898" strokeWidth="1.1" />

          {/* ── Wool texture ── */}
          {[
            {cx:56,cy:106},{cx:70,cy:101},{cx:84,cy:104},
            {cx:98,cy:108},{cx:64,cy:114},{cx:80,cy:116},
            {cx:92,cy:114},{cx:54,cy:116},
          ].map((w,i) => (
            <circle key={i} cx={w.cx} cy={w.cy} r="4.5" fill="white" opacity="0.22" />
          ))}

          {/* ── Legs (sitting, tucked) ── */}
          <rect x="44" y="137" width="9"  height="19" rx="4.5" fill="#CEC0A8" stroke="#B4A090" strokeWidth="1" />
          <rect x="59" y="139" width="9"  height="17" rx="4.5" fill="#CEC0A8" stroke="#B4A090" strokeWidth="1" />
          <rect x="83" y="137" width="9"  height="19" rx="4.5" fill="#C4B6A0" stroke="#AA9880" strokeWidth="1" />
          <rect x="97" y="135" width="9"  height="21" rx="4.5" fill="#C4B6A0" stroke="#AA9880" strokeWidth="1" />

          {/* ── Hooves ── */}
          <ellipse cx="48"  cy="156" rx="5.5" ry="2.8" fill="#4A3820" />
          <ellipse cx="63"  cy="156" rx="5.5" ry="2.8" fill="#4A3820" />
          <ellipse cx="87"  cy="156" rx="5.5" ry="2.8" fill="#4A3820" />
          <ellipse cx="101" cy="156" rx="5.5" ry="2.8" fill="#4A3820" />

          {/* ── Tail ── */}
          <g style={{ animation:"eid-tail-wag 2s ease-in-out infinite", transformOrigin:"112px 110px" }}>
            <path d="M110 110 Q122 102 118 94 Q116 88 120 84"
              stroke="#BCA898" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <circle cx="120" cy="83" r="4.5" fill="#D8CEBA" />
          </g>

          {/* ── Neck ── */}
          <ellipse cx="46" cy="103" rx="13" ry="17" fill="#DDD0BC" stroke="#BCA898" strokeWidth="1" />

          {/* ── Head ── */}
          <ellipse cx="36" cy="80" rx="21" ry="17" fill="#EAE0CC" stroke="#BCA898" strokeWidth="1.1" />

          {/* ── Snout ── */}
          <ellipse cx="18" cy="84" rx="10.5" ry="7.5" fill="#F0C8B0" stroke="#D0A890" strokeWidth="0.9" />
          <ellipse cx="14" cy="85" rx="2"    ry="1.5"  fill="#B88878" />
          <ellipse cx="21" cy="85" rx="2"    ry="1.5"  fill="#B88878" />
          {/* Gentle smile */}
          <path d="M13 89 Q17.5 93.5 24 89" stroke="#B88878" strokeWidth="1.4"
            strokeLinecap="round" fill="none" />

          {/* ── Eyes ── */}
          <g style={{ animation:"eid-blink 5s ease-in-out infinite", transformOrigin:"28px 78px" }}>
            <ellipse cx="28" cy="78" rx="3.8" ry="4.2" fill="#3C2C18" />
            <ellipse cx="29.2" cy="76.5" rx="1.3" ry="1.3" fill="white" opacity="0.65" />
          </g>
          <g style={{ animation:"eid-blink 5s ease-in-out infinite 2.4s", transformOrigin:"42px 77px" }}>
            <ellipse cx="42" cy="77" rx="3.2" ry="3.8" fill="#3C2C18" />
            <ellipse cx="43.2" cy="75.6" rx="1.1" ry="1.1" fill="white" opacity="0.65" />
          </g>

          {/* ── Ears ── */}
          <g style={{ animation:"eid-ear-twitch 4s ease-in-out infinite", transformOrigin:"24px 70px" }}>
            <ellipse cx="20" cy="66" rx="6.5" ry="11.5" transform="rotate(-22 20 66)"
              fill="#EAD4BC" stroke="#C4A898" strokeWidth="0.9" />
            <ellipse cx="20" cy="66" rx="3.8" ry="7.5" transform="rotate(-22 20 66)"
              fill="#F0B8A8" opacity="0.55" />
          </g>
          <g style={{ animation:"eid-ear-twitch 4s ease-in-out infinite 2s", transformOrigin:"50px 69px" }}>
            <ellipse cx="50" cy="66" rx="6.5" ry="10.5" transform="rotate(18 50 66)"
              fill="#EAD4BC" stroke="#C4A898" strokeWidth="0.9" />
            <ellipse cx="50" cy="66" rx="3.8" ry="7"  transform="rotate(18 50 66)"
              fill="#F0B8A8" opacity="0.55" />
          </g>

          {/* ── Horns ── */}
          <path d="M30 66 Q26 55 30 49 Q34 55 32 64Z" fill="#C09858" stroke="#987840" strokeWidth="0.7" />
          <path d="M44 64 Q46 53 50 49 Q52 56 48 63Z" fill="#C09858" stroke="#987840" strokeWidth="0.7" />

          {/* ── Beard ── */}
          <path d="M16 90 Q14 98 18 102 Q20 98 16 90Z" fill="#E0D0B8" stroke="#C4B098" strokeWidth="0.7" />
        </svg>
      </div>
    </>
  )
}
