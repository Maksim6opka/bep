"use client";

import React, { useState, useCallback } from "react";

interface FloatingBep {
  text: string;
  top: string;
  left: string;
  size: string;
  animation: string;
  duration: string;
  delay: string;
  className?: string;
  badge?: boolean;
}

const STATIC_BEPS: FloatingBep[] = [
  // Величезні фонові написи-водяні знаки
  {
    text: "bep",
    top: "8%",
    left: "5%",
    size: "text-7xl sm:text-9xl font-black",
    animation: "float-1",
    duration: "24s",
    delay: "-3s",
    className: "opacity-[0.04] dark:opacity-[0.06] select-none pointer-events-none",
  },
  {
    text: "BEEP",
    top: "60%",
    left: "70%",
    size: "text-7xl sm:text-9xl font-black",
    animation: "float-2",
    duration: "28s",
    delay: "-9s",
    className: "opacity-[0.04] dark:opacity-[0.06] select-none pointer-events-none",
  },

  // Середні та яскраві плаваючі елементи
  {
    text: "bep :3",
    top: "14%",
    left: "78%",
    size: "text-lg sm:text-2xl font-bold",
    animation: "float-2",
    duration: "13s",
    delay: "-2s",
    className: "text-pink-500/25 dark:text-pink-400/30 rotate-6",
    badge: true,
  },
  {
    text: "bep!",
    top: "22%",
    left: "18%",
    size: "text-xl sm:text-3xl font-extrabold",
    animation: "float-3",
    duration: "15s",
    delay: "-7s",
    className: "text-purple-500/30 dark:text-purple-400/35 -rotate-12",
  },
  {
    text: "bep bep",
    top: "38%",
    left: "82%",
    size: "text-base sm:text-xl font-semibold",
    animation: "float-1",
    duration: "17s",
    delay: "-5s",
    className: "text-indigo-500/25 dark:text-indigo-400/30 rotate-3",
    badge: true,
  },
  {
    text: "BEEP",
    top: "45%",
    left: "8%",
    size: "text-2xl sm:text-4xl font-black tracking-widest",
    animation: "float-4",
    duration: "19s",
    delay: "-11s",
    className: "text-amber-500/25 dark:text-amber-400/30 rotate-12",
  },
  {
    text: "bep~",
    top: "68%",
    left: "22%",
    size: "text-lg sm:text-2xl font-mono font-medium",
    animation: "float-2",
    duration: "14s",
    delay: "-8s",
    className: "text-cyan-500/25 dark:text-cyan-400/30 -rotate-6",
    badge: true,
  },
  {
    text: "^bep^",
    top: "78%",
    left: "75%",
    size: "text-xl sm:text-3xl font-bold",
    animation: "float-3",
    duration: "16s",
    delay: "-4s",
    className: "text-emerald-500/25 dark:text-emerald-400/30 rotate-8",
  },
  {
    text: "bep bop",
    top: "84%",
    left: "42%",
    size: "text-sm sm:text-lg font-mono font-semibold",
    animation: "float-1",
    duration: "12s",
    delay: "-6s",
    className: "text-rose-500/25 dark:text-rose-400/30 -rotate-3",
    badge: true,
  },
  {
    text: "bep?",
    top: "10%",
    left: "48%",
    size: "text-lg sm:text-2xl font-bold",
    animation: "float-4",
    duration: "18s",
    delay: "-1s",
    className: "text-violet-500/25 dark:text-violet-400/30 rotate-6",
  },
  {
    text: "✨ bep ✨",
    top: "56%",
    left: "30%",
    size: "text-xs sm:text-sm font-bold",
    animation: "float-2",
    duration: "11s",
    delay: "-10s",
    className: "text-yellow-500/30 dark:text-yellow-300/35",
    badge: true,
  },
  {
    text: "beep beep!",
    top: "28%",
    left: "62%",
    size: "text-sm sm:text-base font-medium",
    animation: "float-3",
    duration: "14s",
    delay: "-12s",
    className: "text-blue-500/25 dark:text-blue-400/30 -rotate-8",
  },
  {
    text: "bep <3",
    top: "88%",
    left: "12%",
    size: "text-base sm:text-xl font-bold",
    animation: "float-4",
    duration: "15s",
    delay: "-3s",
    className: "text-pink-500/25 dark:text-pink-400/30 rotate-12",
  },
];

interface ClickParticle {
  id: number;
  x: number;
  y: number;
  text: string;
  rot: number;
  dx: number;
  color: string;
}

const CLICK_PHRASES = [
  "bep!",
  "BEEP!",
  "bep :3",
  "bep~",
  "✨ bep ✨",
  "boop!",
  "bep bop",
  "bep <3",
];

const CLICK_COLORS = [
  "text-pink-500 dark:text-pink-400",
  "text-purple-500 dark:text-purple-400",
  "text-indigo-500 dark:text-indigo-400",
  "text-cyan-500 dark:text-cyan-400",
  "text-amber-500 dark:text-amber-400",
  "text-emerald-500 dark:text-emerald-400",
  "text-rose-500 dark:text-rose-400",
];

export function BepBackground() {
  const [clickParticles, setClickParticles] = useState<ClickParticle[]>([]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Не спавнити, якщо клікнули на інтерактивне посилання або кнопку
    const target = e.target as HTMLElement | null;
    if (target?.closest("a, button")) {
      return;
    }

    const id = Date.now() + Math.random();
    const phrase = CLICK_PHRASES[Math.floor(Math.random() * CLICK_PHRASES.length)];
    const color = CLICK_COLORS[Math.floor(Math.random() * CLICK_COLORS.length)];
    const rot = (Math.random() - 0.5) * 36;
    const dx = (Math.random() - 0.5) * 60;

    const newParticle: ClickParticle = {
      id,
      x: e.clientX,
      y: e.clientY,
      text: phrase,
      rot,
      dx,
      color,
    };

    setClickParticles((prev) => [...prev.slice(-15), newParticle]);

    setTimeout(() => {
      setClickParticles((prev) => prev.filter((p) => p.id !== id));
    }, 950);
  }, []);

  return (
    <div
      onPointerDown={handlePointerDown}
      className="fixed inset-0 overflow-hidden pointer-events-auto select-none"
      aria-hidden="true"
    >
      {/* Статичні плаваючі bep по всьому фону */}
      {STATIC_BEPS.map((item, index) => (
        <div
          key={index}
          style={{
            top: item.top,
            left: item.left,
            animation: `${item.animation} ${item.duration} ease-in-out infinite`,
            animationDelay: item.delay,
          }}
          className={`absolute pointer-events-none transition-transform ${item.size} ${item.className || ""}`}
        >
          {item.badge ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-current/30 bg-current/5 backdrop-blur-[1px]">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {item.text}
            </span>
          ) : (
            item.text
          )}
        </div>
      ))}

      {/* Інтерактивні вибухи bep при кліку в будь-яке місце фону */}
      {clickParticles.map((particle) => (
        <span
          key={particle.id}
          style={
            {
              left: particle.x,
              top: particle.y,
              "--rot": `${particle.rot}deg`,
              "--dx": `${particle.dx}px`,
              animation: "bep-pop-float 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
            } as React.CSSProperties
          }
          className={`absolute pointer-events-none font-extrabold text-2xl sm:text-3xl drop-shadow-md z-30 ${particle.color}`}
        >
          {particle.text}
        </span>
      ))}
    </div>
  );
}

export function InteractiveTitle() {
  const [wiggling, setWiggling] = useState(false);
  const [bursts, setBursts] = useState<{ id: number; angle: number; dist: number; text: string }[]>([]);

  const handleTitleClick = () => {
    setWiggling(false);
    requestAnimationFrame(() => {
      setWiggling(true);
    });

    const burstWords = ["bep!", "beep!", "bep :3", "bep~", "boop!", "bep bop"];
    const newBursts = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + i,
      angle: (i * 60 * Math.PI) / 180,
      dist: 60 + Math.random() * 30,
      text: burstWords[i % burstWords.length],
    }));

    setBursts(newBursts);
    setTimeout(() => {
      setBursts([]);
    }, 800);
  };

  return (
    <div className="relative inline-block select-none pointer-events-auto">
      <h1
        onClick={handleTitleClick}
        onAnimationEnd={() => setWiggling(false)}
        className={`text-4xl sm:text-5xl font-black leading-10 tracking-tight text-black dark:text-zinc-50 cursor-pointer select-none transition-transform ${
          wiggling ? "animate-bep-wiggle" : "hover:scale-125 active:scale-95"
        }`}
        title="bep!"
      >
        bep
      </h1>
      {bursts.map((b) => (
        <span
          key={b.id}
          style={
            {
              left: "50%",
              top: "50%",
              "--burst-x": `${Math.cos(b.angle) * b.dist}px`,
              "--burst-y": `${Math.sin(b.angle) * b.dist}px`,
              animation: "bep-burst 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            } as React.CSSProperties
          }
          className="absolute pointer-events-none text-sm font-bold text-pink-500 dark:text-pink-400 drop-shadow select-none z-30 whitespace-nowrap"
        >
          {b.text}
        </span>
      ))}
    </div>
  );
}
