"use client";

import { useRef, useState } from "react";
import { GIFEncoder, applyPalette, quantize } from "gifenc";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const VIDEO_TYPES = ["video/mp4"];

type Status = "idle" | "working" | "done" | "error";

type Settings = {
  maxWidth: number;
  fps: number;
  maxSeconds: number;
  colors: number;
  loop: boolean;
  stillDelay: number;
};

const PRESETS: { id: string; label: string; hint: string; settings: Settings }[] = [
  {
    id: "compact",
    label: "Compact",
    hint: "Small file",
    settings: { maxWidth: 240, fps: 8, maxSeconds: 4, colors: 64, loop: true, stillDelay: 100 },
  },
  {
    id: "balanced",
    label: "Balanced",
    hint: "Default",
    settings: { maxWidth: 480, fps: 10, maxSeconds: 6, colors: 128, loop: true, stillDelay: 100 },
  },
  {
    id: "smooth",
    label: "Smooth",
    hint: "Higher fps",
    settings: { maxWidth: 480, fps: 15, maxSeconds: 8, colors: 128, loop: true, stillDelay: 80 },
  },
  {
    id: "quality",
    label: "Quality",
    hint: "Larger, sharper",
    settings: { maxWidth: 720, fps: 12, maxSeconds: 10, colors: 256, loop: true, stillDelay: 100 },
  },
];

const DEFAULT_PRESET = "balanced";

export function GifConverter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [presetId, setPresetId] = useState(DEFAULT_PRESET);
  const [settings, setSettings] = useState<Settings>(PRESETS.find((p) => p.id === DEFAULT_PRESET)!.settings);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("converted.gif");

  function applyPreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    setSettings(preset.settings);
  }

  function patchSettings(patch: Partial<Settings>) {
    setPresetId("custom");
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  function pickFile(next: File) {
    setFile(next);
    setStatus("idle");
    setMessage("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }

  async function convert() {
    if (!file) {
      setStatus("error");
      setMessage("Choose a file first.");
      return;
    }
    previewUrl && URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStatus("working");
    setMessage("Converting on this device…");
    try {
      const blob = IMAGE_TYPES.includes(file.type)
        ? await imageToGif(file, settings)
        : VIDEO_TYPES.includes(file.type)
          ? await videoToGif(file, settings)
          : null;
      if (!blob) {
        setStatus("error");
        setMessage("Only PNG, JPEG, and MP4 are supported.");
        return;
      }
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setFileName(`${stripExt(file.name)}.gif`);
      setStatus("done");
      setMessage("Done.");
    } catch {
      setStatus("error");
      setMessage("Could not convert the file.");
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div
        className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const next = e.dataTransfer.files[0];
          if (next) pickFile(next);
        }}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Drop a file here or choose one</p>
        <button
          type="button"
          className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          onClick={() => inputRef.current?.click()}
        >
          Choose file
        </button>
        {file && <p className="mt-3 text-xs text-zinc-500">{file.name}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,video/mp4"
          className="hidden"
          onChange={(e) => {
            const next = e.target.files?.[0];
            if (next) pickFile(next);
            e.target.value = "";
          }}
        />
      </div>

      <div>
        <p className="text-sm font-medium">Presets</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                presetId === preset.id
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              }`}
            >
              {preset.label}
              <span className="ml-1 text-xs opacity-70">{preset.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Max width (px)"
          value={settings.maxWidth}
          min={80}
          max={1280}
          onChange={(maxWidth) => patchSettings({ maxWidth })}
        />
        <NumberField
          label="FPS (video)"
          value={settings.fps}
          min={2}
          max={24}
          onChange={(fps) => patchSettings({ fps })}
        />
        <NumberField
          label="Max duration (s)"
          value={settings.maxSeconds}
          min={1}
          max={20}
          onChange={(maxSeconds) => patchSettings({ maxSeconds })}
        />
        <NumberField
          label="Colors"
          value={settings.colors}
          min={16}
          max={256}
          onChange={(colors) => patchSettings({ colors })}
        />
        <NumberField
          label="Still delay (ms)"
          value={settings.stillDelay}
          min={20}
          max={2000}
          onChange={(stillDelay) => patchSettings({ stillDelay })}
        />
        <label className="flex items-end gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.loop}
            onChange={(e) => patchSettings({ loop: e.target.checked })}
            className="size-4"
          />
          Loop forever
        </label>
      </div>

      <button
        type="button"
        onClick={() => void convert()}
        disabled={!file || status === "working"}
        className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:disabled:hover:bg-zinc-900"
      >
        {status === "working" ? "Converting…" : "Convert"}
      </button>

      {status === "working" && <p className="text-sm text-zinc-500">{message}</p>}
      {status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}
      {status === "done" && <p className="text-sm text-zinc-500">{message}</p>}

      {previewUrl && (
        <div className="space-y-4">
          <img src={previewUrl} alt="GIF preview" className="max-h-80 max-w-full rounded-md border border-zinc-200 dark:border-zinc-800" />
          <a
            href={previewUrl}
            download={fileName}
            className="inline-block rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            Download GIF
          </a>
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))));
        }}
        className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}

function stripExt(name: string) {
  return name.replace(/\.[^.]+$/, "") || "converted";
}

function fitSize(width: number, height: number, maxWidth: number) {
  const scale = Math.min(1, maxWidth / width);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function encodeGif(frames: ImageData[], delay: number, colors: number, loop: boolean) {
  const gif = GIFEncoder();
  const maxColors = Math.min(256, Math.max(2, colors));
  frames.forEach((frame, i) => {
    const palette = quantize(frame.data, maxColors);
    const index = applyPalette(frame.data, palette);
    gif.writeFrame(index, frame.width, frame.height, {
      palette,
      delay,
      repeat: i === 0 ? (loop ? 0 : -1) : undefined,
    });
  });
  gif.finish();
  return new Blob([gif.bytes() as BlobPart], { type: "image/gif" });
}

async function imageToGif(file: File, settings: Settings) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitSize(bitmap.width, bitmap.height, settings.maxWidth);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return encodeGif([ctx.getImageData(0, 0, width, height)], settings.stillDelay / 10, settings.colors, settings.loop);
}

async function videoToGif(file: File, settings: Settings) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("video"));
  });

  const duration = Math.min(video.duration || 1, settings.maxSeconds);
  const { width, height } = fitSize(video.videoWidth, video.videoHeight, settings.maxWidth);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas");

  const fps = Math.max(1, settings.fps);
  const frameCount = Math.max(1, Math.round(duration * fps));
  const frames: ImageData[] = [];

  for (let i = 0; i < frameCount; i++) {
    const t = (i / frameCount) * duration;
    await seek(video, t);
    ctx.drawImage(video, 0, 0, width, height);
    frames.push(ctx.getImageData(0, 0, width, height));
  }

  URL.revokeObjectURL(url);
  video.removeAttribute("src");
  video.load();
  return encodeGif(frames, Math.round(100 / fps), settings.colors, settings.loop);
}

function seek(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}
