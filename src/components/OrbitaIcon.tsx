import React from "react";

interface OrbitaIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function OrbitaIcon({ size = 44, color = "currentColor", className = "" }: OrbitaIconProps) {
  return (
    <span className={`orb-hover ${className}`} style={{ display: "inline-flex" }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      >
        <style>{`
          @keyframes nucleoPulsar{0%,100%{r:3.5px}50%{r:2.6px}}
          .orb-nivel2{opacity:0;transition:opacity .35s}
          .orb-jump{transition:transform .45s cubic-bezier(.34,1.56,.64,1)}
          .orb-e{transition:r .45s}
          .orb-nucleo{transition:r .35s}
          .orb-hover:hover .orb-nivel2, .group:hover .orb-nivel2{opacity:1}
          .orb-hover:hover .orb-jump, .group:hover .orb-jump{transform:scale(1.538)}
          .orb-hover:hover .orb-e, .group:hover .orb-e{r:1.43px}
          .orb-hover:hover .orb-nucleo, .group:hover .orb-nucleo{r:4.6px}
        `}</style>
        <g transform="rotate(-30 24 24)">
          <ellipse cx={24} cy={24} rx={13} ry={6} />
          <ellipse className="orb-nivel2" cx={24} cy={24} rx={20} ry={9.23} />
          <g className="orb-jump" style={{ transformOrigin: "24px 24px" }}>
            <circle className="orb-e" r={2.2} fill={color} stroke="none">
              <animateMotion
                dur="3.5s"
                repeatCount="indefinite"
                path="M11 24 a13 6 0 1 0 26 0 a13 6 0 1 0 -26 0"
              />
            </circle>
          </g>
        </g>
        <circle
          className="orb-nucleo"
          cx={24}
          cy={24}
          r={3.5}
          fill={color}
          stroke="none"
          style={{ animation: "nucleoPulsar 3.5s ease-in-out infinite" }}
        />
      </svg>
    </span>
  );
}

export default OrbitaIcon;
