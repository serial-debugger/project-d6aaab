import { useEffect, useRef, useState } from "react";

import tile1 from "@/assets/tile-1.jpg";
import tile2 from "@/assets/tile-2.jpg";
import tile3 from "@/assets/tile-3.jpg";
import tile4 from "@/assets/tile-4.jpg";
import tile5 from "@/assets/tile-5.jpg";
import tile6 from "@/assets/tile-6.jpg";

const SOURCES = [tile1, tile2, tile3, tile4, tile5, tile6];
const RESOLUTION = 46;
const DURATION = 900; // per-pixel travel time
const STAGES = 6; // visible build stages
const STAGE_GAP = 520; // time between stage kick-offs
const JITTER = 260; // in-stage stagger

type Cell = {
  col: number;
  row: number;
  img: number;
  stage: number;
  delay: number;
  fromX: number;
  fromY: number;
};

function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function buildCells(): Cell[] {
  const cells: Cell[] = [];
  const center = (RESOLUTION - 1) / 2;
  const radius = RESOLUTION / 2;
  let i = 0;

  for (let row = 0; row < RESOLUTION; row++) {
    for (let col = 0; col < RESOLUTION; col++) {
      const dx = (col - center) / radius;
      const dy = (row - center) / radius;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) continue;
      const r = rand(i);
      const r2 = rand(i + 977);
      i++;
      // Stage 0 is the coarse core, later stages fill outward rings — the disc
      // therefore grows in clearly readable steps instead of one blur.
      const stage = Math.min(STAGES - 1, Math.floor(dist * STAGES));
      cells.push({
        col,
        row,
        img: Math.floor(r * SOURCES.length) % SOURCES.length,
        stage,
        delay: stage * STAGE_GAP + r * JITTER,
        fromX: dx * 0.85 + (r - 0.5) * 0.45,
        fromY: dy * 0.85 + (r2 - 0.5) * 0.45,
      });
    }
  }
  // Draw order by stage keeps the active slice contiguous.
  return cells.sort((a, b) => a.delay - b.delay);
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function PixelCircle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cellsRef = useRef<Cell[]>([]);
  const [settled, setSettled] = useState(false);
  const [stage, setStage] = useState(0);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    if (cellsRef.current.length === 0) cellsRef.current = buildCells();
    const cells = cellsRef.current;

    let frame = 0;
    let cancelled = false;
    setSettled(false);
    setStage(0);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const run = (tiles: HTMLCanvasElement[], size: number, dpr: number) => {
      const cell = size / RESOLUTION;
      const total = (STAGES - 1) * STAGE_GAP + JITTER + DURATION;
      const start = performance.now();

      // Cells that have finished are baked once into this layer, so the
      // per-frame cost stays proportional to the few thousand *moving*
      // pixels rather than the whole disc.
      const base = document.createElement("canvas");
      base.width = canvas.width;
      base.height = canvas.height;
      const baseCtx = base.getContext("2d")!;
      baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      baseCtx.imageSmoothingEnabled = false;

      let head = 0; // first cell not yet baked
      let lastStage = -1;

      const draw = (now: number) => {
        if (cancelled) return;
        const elapsed = reduced ? total : now - start;

        // Bake everything that has landed, in order.
        while (head < cells.length) {
          const c = cells[head]!;
          if (elapsed - c.delay < DURATION) break;
          baseCtx.drawImage(tiles[c.img]!, c.col * cell, c.row * cell, cell, cell);
          head++;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(base, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        for (let n = head; n < cells.length; n++) {
          const c = cells[n]!;
          const t = Math.min(1, (elapsed - c.delay) / DURATION);
          if (t <= 0) break; // sorted by delay — nothing later has started
          const e = easeOut(t);
          const x = c.col * cell + c.fromX * size * (1 - e);
          const y = c.row * cell + c.fromY * size * (1 - e);
          const s = cell * (0.25 + 0.75 * e);
          const inset = (cell - s) / 2;
          ctx.globalAlpha = Math.min(1, t * 2.2);
          ctx.drawImage(tiles[c.img]!, x + inset, y + inset, s, s);
        }
        ctx.globalAlpha = 1;

        const current = Math.min(STAGES, Math.floor(elapsed / STAGE_GAP) + 1);
        if (current !== lastStage) {
          lastStage = current;
          setStage(current);
        }

        if (elapsed < total) {
          frame = requestAnimationFrame(draw);
        } else {
          setStage(STAGES);
          setSettled(true);
        }
      };
      frame = requestAnimationFrame(draw);
    };

    const setup = async () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = canvas.clientWidth;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      const cellPx = Math.max(2, Math.ceil((size / RESOLUTION) * dpr));

      // Pre-scale every source image once into a tiny offscreen tile, so each
      // frame only blits already-pixel-sized bitmaps.
      const tiles = await Promise.all(
        SOURCES.map(
          (src) =>
            new Promise<HTMLCanvasElement>((resolve) => {
              const img = new Image();
              img.decoding = "async";
              img.onload = () => {
                const off = document.createElement("canvas");
                off.width = cellPx;
                off.height = cellPx;
                off.getContext("2d")?.drawImage(img, 0, 0, cellPx, cellPx);
                resolve(off);
              };
              img.onerror = () => resolve(document.createElement("canvas"));
              img.src = src;
            }),
        ),
      );
      if (cancelled) return;
      ctx.imageSmoothingEnabled = false;
      run(tiles, size, dpr);
    };

    void setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [runId]);

  return (
    <div className="mosaic-stage">
      <div className="mosaic-frame" data-settled={settled}>
        <canvas ref={canvasRef} className="mosaic-canvas" aria-label="A circle formed from hundreds of tiny images" role="img" />
      </div>

      <div className="mosaic-progress" aria-hidden="true">
        {Array.from({ length: STAGES }, (_, i) => (
          <span key={i} data-done={i < stage} />
        ))}
      </div>

      <button type="button" className="mosaic-replay" onClick={() => setRunId((n) => n + 1)}>
        {settled ? "Replay assembly" : `Stage ${Math.min(stage, STAGES)} / ${STAGES}`}
      </button>
    </div>
  );
}
