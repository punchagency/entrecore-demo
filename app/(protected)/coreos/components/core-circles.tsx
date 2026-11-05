"use client";
import { useMediaQuery } from "usehooks-ts";
import { middleDots, innerDots, whiteCircleDots, outerDots } from "../utils";

interface CoreCirclesProps {
  showSidePanel: boolean;
  isAnimationPaused: boolean;
  children: React.ReactNode;
}

export const CoreCircles = ({ showSidePanel, isAnimationPaused, children }: CoreCirclesProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <div className="relative w-full h-full mx-auto flex items-center justify-center">
      {/* Outer Circle */}
      <div
        className="absolute rounded-full border-[2px] border-blue-400/40 opacity-100 origin-center circle-border outer-circle transition-all duration-700 ease-in-out"
        style={{
          width: showSidePanel && isDesktop
            ? "min(42vw, min(calc(100vh - 15rem), 480px))"
            : "min(72vw, min(calc(100vh - 15rem), 560px))",
          height: showSidePanel && isDesktop
            ? "min(42vw, min(calc(100vh - 15rem), 480px))"
            : "min(72vw, min(calc(100vh - 15rem), 560px))",
          animation: isAnimationPaused ? "none" : "spin-outer 180s linear infinite",
        }}
      >
        <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-2 h-2 md:w-3 md:h-3 rounded-full bg-primary opacity-80"></div>
        <div className="absolute top-[25%] right-[15%] w-2 h-2 md:w-3 md:h-3 rounded-full bg-primary opacity-80"></div>
        <div className="absolute bottom-[20%] left-[20%] w-2 h-2 md:w-3 md:h-3 rounded-full bg-primary opacity-80"></div>

        {outerDots.map((dot, index) => (
          <div
            key={`outer-${index}`}
            className="absolute rounded-full bg-primary"
            style={{
              left: dot.x,
              top: dot.y,
              width: `${Math.max(2, dot.size * 0.8)}px`,
              height: `${Math.max(2, dot.size * 0.8)}px`,
              opacity: dot.opacity * 0.8,
              transform: "translate(-50%, -50%)",
              filter: index % 4 === 0 ? "blur(1px)" : "none",
            }}
          />
        ))}
      </div>

      {/* Middle Circle */}
      <div
        className="absolute rounded-full border-[2px] border-blue-400/60 opacity-100 origin-center circle-border middle-circle transition-all duration-700 ease-in-out"
        style={{
          width: showSidePanel && isDesktop
            ? "min(32vw, min(calc(100vh - 15rem), 370px))"
            : "min(56vw, min(calc(100vh - 15rem) * 0.76, 430px))",
          height: showSidePanel && isDesktop
            ? "min(32vw, min(calc(100vh - 15rem), 370px))"
            : "min(56vw, min(calc(100vh - 15rem) * 0.76, 430px))",
          animation: isAnimationPaused ? "none" : "spin-inner 140s linear infinite",
          background: "rgba(59, 130, 246, 0.08)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      >
        {middleDots.map((dot, index) => (
          <div
            key={`middle-${index}`}
            className="absolute rounded-full bg-primary"
            style={{
              left: dot.x,
              top: dot.y,
              width: `${Math.max(2, dot.size * 0.9)}px`,
              height: `${Math.max(2, dot.size * 0.9)}px`,
              opacity: dot.opacity * 1.1,
              transform: "translate(-50%, -50%)",
              filter: index % 3 === 0 ? "blur(1.5px)" : "none",
            }}
          />
        ))}
      </div>

      {/* White Inner Circle */}
      <div
        className="absolute rounded-full origin-center white-circle transition-all duration-700 ease-in-out"
        style={{
          width: showSidePanel && isDesktop
            ? "min(22vw, min(calc(100vh - 15rem), 270px))"
            : "min(40vw, min(calc(100vh - 15rem) * 0.53, 310px))",
          height: showSidePanel && isDesktop
            ? "min(22vw, min(calc(100vh - 15rem), 270px))"
            : "min(40vw, min(calc(100vh - 15rem) * 0.53, 310px))",
          background: "rgba(255, 255, 255, 0.65)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 0 80px rgba(59, 130, 246, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.8)",
          position: "relative",
        }}
      >
        {innerDots.map((dot, index) => (
          <div
            key={`inner-${index}`}
            className="absolute rounded-full bg-blue-600 z-10"
            style={{
              left: dot.x,
              top: dot.y,
              width: `${Math.max(1.5, dot.size * 0.8)}px`,
              height: `${Math.max(1.5, dot.size * 0.8)}px`,
              opacity: dot.opacity * 1.2,
              transform: "translate(-50%, -50%)",
              filter: index % 3 === 0 ? "blur(2px)" : "none",
            }}
          />
        ))}

        {whiteCircleDots.map((dot, index) => (
          <div
            key={`edge-${index}`}
            className="absolute rounded-full bg-primary z-10"
            style={{
              left: dot.x,
              top: dot.y,
              width: `${Math.max(1.5, dot.size * 0.8)}px`,
              height: `${Math.max(1.5, dot.size * 0.8)}px`,
              opacity: dot.opacity,
              transform: "translate(-50%, -50%)",
              filter: index % 2 === 0 ? "blur(2px)" : "none",
            }}
          />
        ))}
      </div>

      {/* Content goes here - moved out of inner circle for full-workspace access */}
      {children}

      <style jsx global>{`
        .circle-border {
          border-style: dashed;
          border-spacing: 12px;
          --border-spacing: 12px;
          border-dash-offset: 16px;
        }

        .outer-circle {
          box-shadow: 0 0 60px rgba(59, 130, 246, 0.1), inset 0 0 30px rgba(59, 130, 246, 0.05);
        }

        .middle-circle {
          box-shadow: 0 0 40px rgba(59, 130, 246, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.2);
        }

        .white-circle {
          position: relative;
          border: 2px solid rgba(255, 255, 255, 1);
          isolation: isolate;
        }

        .white-circle::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: transparent;
          z-index: -1;
        }

        .white-circle::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 1);
          z-index: 1;
        }

        @keyframes spin-outer {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }

        @keyframes spin-inner {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes spin-white {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};
