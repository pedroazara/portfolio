import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Skill } from "../types";
import { Language } from "../lib/translations";
import { getCategoryAccent } from "../lib/skillAccents";
import { getSkillIcon } from "../lib/skillIcons";

export interface NetworkCategory {
  id: string;
  name: string;
  nameEn?: string;
  icon?: string;
}

interface SkillsNetworkProps {
  categories: NetworkCategory[];
  skills: Skill[];
  language: Language;
}

/** Distance from the category bubble to its linked skill dots, scaled by how many there are. */
const radiusFor = (count: number) => Math.max(100, Math.min(190, 80 + count * 14));

/** Deterministic pseudo-random in [0, 1) — same layout every render, no reshuffling on hover. */
function seeded(n: number): number {
  let t = n + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

interface NodeProps {
  category: NetworkCategory;
  index: number;
  catSkills: Skill[];
  language: Language;
  isOpen: boolean;
  isDimmed: boolean;
  onOpen: () => void;
  onToggle: (e: React.MouseEvent) => void;
  onClose: () => void;
}

function CategoryNode({ category, index, catSkills, language, isOpen, isDimmed, onOpen, onToggle, onClose }: NodeProps) {
  const accent = getCategoryAccent(index);
  const Icon = getSkillIcon(category.icon);
  const name = language === "en" && category.nameEn ? category.nameEn : category.name;
  const n = catSkills.length;
  const radius = radiusFor(n);

  // Skill dots ring the bubble but skip a wedge at the bottom, where the
  // category's own label sits — evenly slotted (so nothing collides), with
  // a small fixed jitter per slot so the ring doesn't look too mechanical.
  const BOTTOM_GAP = Math.PI / 2.2;
  const usableArc = Math.PI * 2 - BOTTOM_GAP;
  const arcStart = Math.PI / 2 + BOTTOM_GAP / 2;
  const points = useMemo(() => {
    const slotWidth = usableArc / Math.max(n, 1);
    return catSkills.map((_, i) => {
      const slotCenter = arcStart + (i + 0.5) * slotWidth;
      const angle = slotCenter + (seeded(index * 131 + i * 7 + 3) - 0.5) * slotWidth * 0.6;
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, radius]);

  return (
    <div
      className="flex flex-col items-center cursor-pointer select-none"
      style={{ position: "relative", zIndex: isOpen ? 40 : 1 }}
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
      onClick={onToggle}
    >
      <div className="relative h-16 w-16 sm:h-20 sm:w-20">
        {/* Connecting lines to each skill bubble */}
        {n > 0 && (
          <svg
            width={440}
            height={440}
            viewBox="-220 -220 440 440"
            className="pointer-events-none absolute left-1/2 top-1/2 overflow-visible"
            style={{ translate: "-50% -50%" }}
          >
            <AnimatePresence>
              {isOpen &&
                points.map((p, i) => (
                  <motion.line
                    key={catSkills[i].id}
                    x1={0}
                    y1={0}
                    x2={p.x}
                    y2={p.y}
                    stroke={accent.line}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.45 }}
                    exit={{ pathLength: 0, opacity: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.035, ease: "easeOut" }}
                  />
                ))}
            </AnimatePresence>
          </svg>
        )}

        {/* Orbiting skill bubbles — name only, no ratings on this slide. */}
        <AnimatePresence>
          {isOpen &&
            catSkills.map((skill, i) => {
              const p = points[i];
              const skillName = language === "en" && skill.nameEn ? skill.nameEn : skill.name;
              return (
                <motion.div
                  key={skill.id}
                  className="absolute left-1/2 top-1/2 z-10"
                  style={{ translate: "-50% -50%" }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
                  animate={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
                  exit={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: i * 0.035 }}
                >
                  <div
                    className={`rounded-full border bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-3 py-1.5 shadow-md whitespace-nowrap ${accent.text}`}
                    style={{ borderColor: "currentColor" }}
                  >
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">{skillName}</span>
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>

        {/* The category bubble itself */}
        <motion.div
          animate={{ scale: isOpen ? 1.08 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className={`relative flex h-full w-full items-center justify-center rounded-full ${accent.bg} ${accent.text} shadow-sm ring-2 transition-[opacity,box-shadow] duration-300 ${
            isOpen ? `ring-4 ${accent.ring} shadow-lg` : "ring-transparent"
          } ${isDimmed ? "opacity-40" : "opacity-100"}`}
        >
          <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
        </motion.div>
      </div>

      <span
        className={`mt-2.5 max-w-[104px] text-center text-xs font-bold text-slate-600 dark:text-slate-300 font-sans transition-opacity duration-300 ${
          isDimmed ? "opacity-40" : "opacity-100"
        }`}
      >
        {name}
      </span>
    </div>
  );
}

export default function SkillsNetwork({ categories, skills, language }: SkillsNetworkProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tap outside on touch devices closes whatever bubble is open.
  useEffect(() => {
    if (!openId) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenId(null);
      }
    };
    document.addEventListener("click", handleOutside);
    return () => document.removeEventListener("click", handleOutside);
  }, [openId]);

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-wrap content-center items-center justify-center gap-x-16 gap-y-24 px-4 py-8 sm:gap-x-24"
    >
      {categories.map((cat, idx) => {
        const catSkills = skills.filter((s) => s.category === cat.name);
        const isOpen = openId === cat.id;
        return (
          <CategoryNode
            key={cat.id}
            category={cat}
            index={idx}
            catSkills={catSkills}
            language={language}
            isOpen={isOpen}
            isDimmed={openId !== null && !isOpen}
            onOpen={() => setOpenId(cat.id)}
            onClose={() => setOpenId((cur) => (cur === cat.id ? null : cur))}
            onToggle={(e) => {
              e.stopPropagation();
              setOpenId((cur) => (cur === cat.id ? null : cat.id));
            }}
          />
        );
      })}
    </div>
  );
}
