import { useEffect, useMemo, useState } from "react";

import tile1 from "@/assets/tile-1.jpg";
import tile2 from "@/assets/tile-2.jpg";
import tile3 from "@/assets/tile-3.jpg";
import tile4 from "@/assets/tile-4.jpg";
import tile5 from "@/assets/tile-5.jpg";
import tile6 from "@/assets/tile-6.jpg";

const SOURCES = [tile1, tile2, tile3, tile4, tile5, tile6];

type Pixel = {
  key: string;
  left: number;
  top: number;
  src: string;
  delay: number;
  fromX: number;
  fromY: number;
  rotate: number;
};

/** Deterministic pseudo-random so SSR and hydration agree. */
function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function buildPixels(resolution: number): Pixel[] {
  const pixels: Pixel[] = [];
  const center = (resolution - 1) / 2;
  const radius = resolution / 2;
  let i = 0;

  for (let row = 0; row < resolution; row++) {
    for (let col = 0; col < resolution; col++) {
      const dx = (col - center) / radius;
      const dy = (row - center) / radius;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) continue;

      const r = rand(i++);
      pixels.push({
        key: `${row}-${col}`,
        left: (col / resolution) * 100,
        top: (row / resolution) * 100,
        src: SOURCES[Math.floor(r * SOURCES.length) % SOURCES.length],
        // wave outward from the centre, with a touch of scatter
        delay: dist * 900 + r * 320,
        fromX: (dx * 340 + (r - 0.5) * 160).toFixed(1) as unknown as number,
        fromY: (dy * 340 + (rand(i + 99) - 0.5) * 160).toFixed(1) as unknown as number,
        rotate: (r - 0.5) * 90,
      });
    }
  }
  return pixels;
}

export function PixelCircle({ resolution = 46 }: { resolution?: number }) {
  const pixels = useMemo(() => buildPixels(resolution), [resolution]);
  const [cycle, setCycle] = useState(0);
  const [assembled, setAssembled] = useState(false);

  useEffect(() => {
    setAssembled(false);
    const id = window.setTimeout(() => setAssembled(true), 60);
    return () => window.clearTimeout(id);
  }, [cycle]);

  const cellSize = 100 / resolution;

  return (
    <div className="mosaic-stage">
      <div key={cycle} className="mosaic-circle" data-assembled={assembled}>
        {pixels.map((p) => (
          <span
            key={p.key}
            className="mosaic-pixel"
            style={
              {
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: `${cellSize}%`,
                height: `${cellSize}%`,
                backgroundImage: `url(${p.src})`,
                transitionDelay: `${Math.round(p.delay)}ms`,
                "--from-x": `${p.fromX}px`,
                "--from-y": `${p.fromY}px`,
                "--from-rotate": `${p.rotate.toFixed(1)}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <button type="button" className="mosaic-replay" onClick={() => setCycle((c) => c + 1)}>
        Replay assembly
      </button>
    </div>
  );
}
