import React from "react";

interface WaveIconProps {
  size?: number;
  color?: string;
}

export function Orbita({ size = 32, color = "#ffffff" }: WaveIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="3 9 42 30"
      fill="none"
      stroke={color}
      strokeWidth={2.8}
      strokeLinecap="round"
    >
      <style>{`@keyframes nucleoPulsar{0%,100%{r:4px}50%{r:2.8px}}`}</style>
      <g transform="rotate(-30 24 24)">
        <ellipse cx={24} cy={24} rx={20} ry={9} />
        <circle r={2.5} fill={color} stroke="none">
          <animateMotion
            dur="3.5s"
            repeatCount="indefinite"
            path="M4 24 a20 9 0 1 0 40 0 a20 9 0 1 0 -40 0"
          />
        </circle>
      </g>
      <circle
        cx={24}
        cy={24}
        r={4}
        fill={color}
        stroke="none"
        style={{ animation: "nucleoPulsar 3.5s ease-in-out infinite" }}
      />
    </svg>
  );
}

export function OndaFluindo({ size = 32, color = "#ffffff" }: WaveIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
    >
      <style>{`@keyframes fluir{to{stroke-dashoffset:-71.4}}`}</style>
      <circle cx={24} cy={24} r={21} />
      <path
        d="M8 24 C 12 24, 12 14, 17 14 S 22 34, 27 34 S 32 24, 36 24 L 40 24"
        strokeDasharray="4 3.14"
        style={{ animation: "fluir 1.6s linear infinite" }}
      />
    </svg>
  );
}

export function OndaDesenhando({ size = 32, color = "#ffffff" }: WaveIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
    >
      <style>{`@keyframes desenhar{0%{stroke-dashoffset:72}45%{stroke-dashoffset:0}70%{stroke-dashoffset:0}100%{stroke-dashoffset:-72}}`}</style>
      <circle cx={24} cy={24} r={21} />
      <path
        d="M8 24 C 12 24, 12 14, 17 14 S 22 34, 27 34 S 32 24, 36 24 L 40 24"
        strokeDasharray={72}
        style={{ animation: "desenhar 3.2s ease-in-out infinite" }}
      />
    </svg>
  );
}
