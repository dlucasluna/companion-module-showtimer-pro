"use client";

import { Eraser } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string | null;
}

/** Canvas signature pad (mouse, pen, touch). Exports a trimmed PNG data URL. */
export const SignaturePad = forwardRef<SignaturePadHandle, { onChange?: (empty: boolean) => void }>(function SignaturePad({ onChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "#111114";
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const markDrawn = () => {
    if (empty) {
      setEmpty(false);
      onChange?.(false);
    }
  };

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      setEmpty(true);
      onChange?.(true);
    },
    isEmpty: () => empty,
    toDataURL: () => (empty ? null : (canvasRef.current?.toDataURL("image/png") ?? null)),
  }));

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        aria-label="Área de assinatura. Desenhe a sua assinatura."
        role="img"
        className="h-40 w-full touch-none rounded-2xl bg-white"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drawing.current = true;
          last.current = point(event);
        }}
        onPointerMove={(event) => {
          if (!drawing.current || !last.current) return;
          const ctx = canvasRef.current?.getContext("2d");
          if (!ctx) return;
          const next = point(event);
          ctx.beginPath();
          ctx.moveTo(last.current.x, last.current.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
          last.current = next;
          markDrawn();
        }}
        onPointerUp={() => {
          drawing.current = false;
          last.current = null;
        }}
        onPointerLeave={() => {
          drawing.current = false;
          last.current = null;
        }}
      />
      {empty && <span className="pointer-events-none absolute inset-0 grid place-items-center text-small text-zinc-400">Assine aqui</span>}
      <div className="pointer-events-none absolute inset-x-6 bottom-8 h-px bg-zinc-300" />
      <button
        type="button"
        onClick={() => {
          const canvas = canvasRef.current;
          canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
          setEmpty(true);
          onChange?.(true);
        }}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-micro font-medium text-zinc-600 hover:bg-zinc-200"
      >
        <Eraser className="size-3" /> Limpar
      </button>
    </div>
  );
});
