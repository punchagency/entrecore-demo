"use client";

import Image from "next/image";
import { Zap } from "lucide-react";
import type { CSSProperties } from "react";
import { App } from "@/app/(protected)/coreos/types";

interface HubApp {
  app: App;
  isCrawling: boolean;
  progress: number;
}

interface ConnectorHubOrbProps {
  apps: HubApp[];
}

const SIZE = 260;
const CENTER = SIZE / 2;
const NODE_RADIUS = 98;
const ICON_SIZE = 46;
const BOOT_STAGGER = 0.12; // seconds between each node's boot-in animation

function getNodePosition(index: number, count: number) {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CENTER + NODE_RADIUS * Math.cos(angle),
    y: CENTER + NODE_RADIUS * Math.sin(angle),
  };
}

export function ConnectorHubOrb({ apps }: ConnectorHubOrbProps) {
  if (apps.length === 0) return null;

  const syncingCount = apps.filter((a) => a.isCrawling).length;
  const isActive = syncingCount > 0;

  return (
    <div className="relative w-full mb-6 rounded-[2rem] border border-white/60 bg-white/50 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="absolute top-[-30%] right-[-5%] w-[35%] h-[160%] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row items-center gap-6 lg:gap-10 px-6 sm:px-10 py-8">
        {/* Data-flow hub */}
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="absolute inset-0 pointer-events-none"
          >
            {apps.map(({ app, isCrawling }, index) => {
              const { x, y } = getNodePosition(index, apps.length);
              const length = Math.hypot(x - CENTER, y - CENTER);
              const delay = index * BOOT_STAGGER;
              return (
                <g key={app.id}>
                  <line
                    x1={x}
                    y1={y}
                    x2={CENTER}
                    y2={CENTER}
                    stroke={isCrawling ? "#3b82f6" : "#cbd5e1"}
                    strokeWidth={isCrawling ? 1.75 : 1.25}
                    strokeOpacity={isCrawling ? 0.6 : 0.5}
                    strokeDasharray={length}
                    className="hub-line-boot"
                    style={
                      {
                        animationDelay: `${delay}s`,
                        "--hub-line-length": length,
                      } as CSSProperties
                    }
                  />

                  {/* Continuous current: subtle flowing dashes on every connected line, once booted in */}
                  <line
                    x1={x}
                    y1={y}
                    x2={CENTER}
                    y2={CENTER}
                    stroke={isCrawling ? "#2563eb" : "#60a5fa"}
                    strokeWidth={isCrawling ? 2.5 : 2}
                    strokeOpacity={isCrawling ? 0.95 : 0.7}
                    strokeDasharray="6 10"
                    strokeLinecap="round"
                    className="hub-line-current"
                    style={
                      {
                        animationDelay: `${delay + 0.6}s`,
                        "--current-duration": isCrawling ? "0.9s" : "2.4s",
                      } as CSSProperties
                    }
                  />

                  {/* One-shot boot pulse: energy travels center -> icon on first load */}
                  <circle r={3.5} fill="#3b82f6">
                    <animateMotion
                      path={`M ${CENTER},${CENTER} L ${x},${y}`}
                      begin={`${delay}s`}
                      dur="0.55s"
                      fill="freeze"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      keyTimes="0;0.15;0.7;1"
                      begin={`${delay}s`}
                      dur="0.55s"
                      fill="freeze"
                    />
                  </circle>

                  {/* Continuous sync flow: icon -> center, only while actively crawling */}
                  {isCrawling && (
                    <circle r={3} fill="#3b82f6" opacity={0.9}>
                      <animateMotion
                        path={`M ${x},${y} L ${CENTER},${CENTER}`}
                        begin={`${delay + 0.6}s`}
                        dur="1.1s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Center hub */}
          <div
            className="absolute flex items-center justify-center"
            style={{ left: CENTER, top: CENTER, transform: "translate(-50%, -50%)" }}
          >
            <div
              className={`relative w-14 h-14 rounded-full bg-white/85 backdrop-blur-md border border-white flex items-center justify-center transition-shadow duration-700 z-10 ${
                isActive
                  ? "shadow-[0_0_0_7px_rgba(59,130,246,0.12),0_0_30px_rgba(59,130,246,0.35)]"
                  : "shadow-[0_0_0_5px_rgba(59,130,246,0.06),0_0_20px_rgba(59,130,246,0.15)]"
              }`}
            >
              <Zap
                className={`h-6 w-6 transition-colors duration-700 ${isActive ? "text-blue-600" : "text-indigo-500"}`}
                strokeWidth={2.25}
                fill="currentColor"
                fillOpacity={0.12}
              />
              {isActive && <span className="absolute inset-0 rounded-full bg-blue-400/20 hub-pulse" />}
              <span className="absolute inset-0 rounded-full bg-blue-400/30 hub-boot-pulse" />
            </div>
          </div>

          {/* Icon nodes */}
          {apps.map(({ app, isCrawling, progress }, index) => {
            const { x, y } = getNodePosition(index, apps.length);
            const delay = index * BOOT_STAGGER + 0.35;
            return (
              <div
                key={app.id}
                title={isCrawling ? `${app.name} — syncing ${progress}%` : `${app.name} — connected`}
                className="absolute flex items-center justify-center hub-icon-boot"
                style={{
                  left: x,
                  top: y,
                  width: ICON_SIZE,
                  height: ICON_SIZE,
                  transform: "translate(-50%, -50%)",
                  animationDelay: `${delay}s`,
                }}
              >
                <div
                  className={`relative w-full h-full rounded-2xl bg-white/90 border flex items-center justify-center shadow-sm transition-all duration-500 ${
                    isCrawling ? "border-blue-300 shadow-blue-200/50" : "border-white/70"
                  }`}
                >
                  <Image
                    src={app.imagePath}
                    alt={`${app.name} logo`}
                    width={22}
                    height={22}
                    className="object-contain"
                  />
                  {isCrawling && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white animate-pulse" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Copy + live stats */}
        <div className="flex-1 text-center lg:text-left">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">
            {isActive ? "Data is on the move" : "Your data, connected"}
          </h2>
          <p className="mt-1 text-sm text-gray-500 font-medium max-w-md mx-auto lg:mx-0">
            {isActive
              ? `${syncingCount} connector${syncingCount === 1 ? "" : "s"} syncing right now — crawl, profile, and load into your workspace.`
              : "Connect, crawl, profile, and sync your data sources — all without leaving this page."}
          </p>
        </div>

        <div className="flex items-center gap-6 sm:gap-8 shrink-0">
          <div className="text-center">
            <div className="text-2xl font-black text-gray-900 tabular-nums">{apps.length}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Connected</div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <div
              className={`text-2xl font-black tabular-nums ${isActive ? "text-blue-600" : "text-gray-300"}`}
            >
              {syncingCount}
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Syncing</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hub-pulse {
          animation: connectors-orb-pulse 1.8s ease-out infinite;
        }
        .hub-boot-pulse {
          animation: connectors-orb-pulse 0.9s ease-out 1;
          animation-fill-mode: forwards;
        }
        .hub-line-boot {
          stroke-dashoffset: 0;
          opacity: 0;
          animation: connectors-line-draw 0.6s ease-out forwards;
        }
        .hub-line-current {
          opacity: 0;
          animation:
            connectors-line-current-fade-in 0.4s ease-out forwards,
            connectors-line-current-flow var(--current-duration, 3s) linear infinite;
        }
        .hub-icon-boot {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.4);
          animation: connectors-icon-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes connectors-orb-pulse {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          100% {
            transform: scale(1.9);
            opacity: 0;
          }
        }
        @keyframes connectors-line-draw {
          from {
            stroke-dashoffset: var(--hub-line-length, 0);
            opacity: 0;
          }
          to {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
        @keyframes connectors-line-current-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes connectors-line-current-flow {
          from {
            stroke-dashoffset: 32;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes connectors-icon-pop {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.4);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
