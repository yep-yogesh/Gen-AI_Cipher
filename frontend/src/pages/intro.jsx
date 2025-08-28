import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Intro() {
  const [revealed, setRevealed] = useState(false);
  const [tick, setTick] = useState(0);
  const [blobs, setBlobs] = useState([]);
  const navigate = useNavigate();

  const C_PATTERN = [
    [0, 1, 1],
    [1, 0, 0],
    [0, 1, 1],
  ];

  const COLORS = ["#56D364", "#2EA043", "#196C2E", "#033A16"];

  useEffect(() => {
    const initialBlobs = Array.from({ length: 20 }).map((_, i) => {
      const size = Math.floor(Math.random() * 150) + 150;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        id: i,
        size,
        color,
        top: Math.random() * 80 + 10,
        left: Math.random() * 80 + 10,
        dx: (Math.random() - 0.5) * 10,
        dy: (Math.random() - 0.5) * 10,
      };
    });
    setBlobs(initialBlobs);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlobs((prev) =>
        prev.map((blob) => {
          let dx = blob.dx + (Math.random() - 0.5) * 100;
          let dy = blob.dy + (Math.random() - 0.5) * 100;
          dx = Math.max(-10, Math.min(10, dx));
          dy = Math.max(-10, Math.min(10, dy));
          let newTop = blob.top + dy;
          let newLeft = blob.left + dx;
          if (newTop < 0 || newTop > 90) {
            dy = -dy;
            newTop = Math.max(0, Math.min(90, newTop));
          }
          if (newLeft < 0 || newLeft > 90) {
            dx = -dx;
            newLeft = Math.max(0, Math.min(90, newLeft));
          }
          return { ...blob, top: newTop, left: newLeft, dx, dy };
        })
      );
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!revealed) {
      const blinkInterval = setInterval(() => {
        setTick((t) => t + 1);
      }, 300);
      const revealTimeout = setTimeout(() => {
        setRevealed(true);
        clearInterval(blinkInterval);
        setTimeout(() => navigate("/ai"), 2000);
      }, 5000);
      return () => {
        clearInterval(blinkInterval);
        clearTimeout(revealTimeout);
      };
    }
  }, [revealed, navigate]);

  return (
    <div className="relative flex flex-col items-center justify-center h-screen bg-black overflow-hidden font-silkscreen">
      {blobs.map((blob) => (
        <div
          key={blob.id}
          className="absolute rounded-full opacity-30 blur-3xl"
          style={{
            width: blob.size,
            height: blob.size,
            backgroundColor: blob.color,
            top: `${blob.top}%`,
            left: `${blob.left}%`,
            transition: "top 1s linear, left 1s linear",
          }}
        />
      ))}
      <div className="flex flex-col items-center z-10 gap-4">
        <div className="grid grid-cols-3 gap-2">
          {C_PATTERN.flat().map((cell, i) => {
            let bgColor;
            if (revealed) {
              bgColor = cell === 1 ? "#56D364" : "#033A16";
            } else {
              const randomIndex = Math.floor(Math.random() * COLORS.length);
              bgColor = COLORS[randomIndex];
            }
            return (
              <div
                key={i}
                className="w-16 h-16 rounded-xl transition-colors duration-300"
                style={{ backgroundColor: bgColor }}
              />
            );
          })}
        </div>
        {revealed && (
          <div className="flex gap-4 text-4xl text-green-400 tracking-widest">
            {"CIPHER".split("").map((letter, idx) => (
              <span
                key={idx}
                className="opacity-0 animate-fade-in"
                style={{ animationDelay: `${idx * 200}ms` }}
              >
                {letter}
              </span>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s forwards;
        }
      `}</style>
    </div>
  );
}
