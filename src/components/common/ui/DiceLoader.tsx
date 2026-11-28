"use client";

import { useEffect, useRef } from "react";

const FACES: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0, 90],
  [0, 180],
  [0, -90],
  [90, 0],
  [-90, 0],
];

const PIPS: ReadonlyArray<ReadonlyArray<number>> = [
  [4],
  [0, 8],
  [0, 4, 8],
  [0, 2, 6, 8],
  [0, 2, 4, 6, 8],
  [0, 2, 3, 5, 6, 8],
];

const DURATION_MS = 1100;
const PAUSE_MS = 450;
const EASING = "cubic-bezier(.3,.1,.3,1)";

const mod360 = (value: number) => ((value % 360) + 360) % 360;
const pose = (x: number, y: number) => `rotateX(-20deg) rotateX(${x}deg) rotateY(${y}deg)`;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const useDiceRoll = () => {
  const dieRef = useRef<HTMLDivElement>(null);
  const hopRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const die = dieRef.current;
    const hop = hopRef.current;
    const shadow = shadowRef.current;
    if (!die || !hop || !shadow) return;
    if (typeof die.animate !== "function" || prefersReducedMotion()) return;

    let x = 0;
    let y = 0;
    let last = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running: Animation[] = [];

    const roll = () => {
      running.forEach((animation) => animation.cancel());
      const next = (last + 1 + Math.floor(Math.random() * (FACES.length - 1))) % FACES.length;
      const [targetX, targetY] = FACES[next];
      const nextX = x + mod360(targetX - x) + 360 * (1 + Math.floor(Math.random() * 2));
      const nextY = y + mod360(targetY - y) + 360 * (1 + Math.floor(Math.random() * 2));
      const timing = { duration: DURATION_MS, fill: "forwards" as const };
      running = [
        die.animate([{ transform: pose(x, y) }, { transform: pose(nextX, nextY) }], { ...timing, easing: EASING }),
        hop.animate(
          [{ transform: "translateY(18px)" }, { transform: "translateY(0)", offset: 0.4 }, { transform: "translateY(18px)" }],
          { ...timing, easing: "ease-in-out" },
        ),
        shadow.animate(
          [
            { transform: "scale(1)", opacity: 0.9 },
            { transform: "scale(.6)", opacity: 0.4, offset: 0.4 },
            { transform: "scale(1)", opacity: 0.9 },
          ],
          { ...timing, easing: "ease-in-out" },
        ),
      ];
      x = nextX;
      y = nextY;
      last = next;
      timer = setTimeout(roll, DURATION_MS + PAUSE_MS);
    };

    roll();

    return () => {
      if (timer !== undefined) clearTimeout(timer);
      running.forEach((animation) => animation.cancel());
    };
  }, []);

  return { dieRef, hopRef, shadowRef };
};

const DiceLoader: React.FC = () => {
  const { dieRef, hopRef, shadowRef } = useDiceRoll();

  return (
    <div className="dice-loader" aria-hidden="true">
      <div ref={hopRef} className="dice-hop">
        <div ref={dieRef} className="dice">
          {PIPS.map((pips, index) => (
            <div key={index} className={`dice-face dice-face-${index + 1}`} data-dice-face>
              {Array.from({ length: 9 }, (_, cell) =>
                pips.includes(cell) ? <i key={cell} data-pip /> : <span key={cell} />,
              )}
            </div>
          ))}
        </div>
      </div>
      <div ref={shadowRef} className="dice-shadow" />
    </div>
  );
};

export { DiceLoader };
