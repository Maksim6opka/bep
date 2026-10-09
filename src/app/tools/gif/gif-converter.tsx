"use client";

import { useRef, useState } from "react";
import { GIFEncoder, applyPalette, quantize } from "gifenc";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const VIDEO_TYPES = ["video/mp4"];
const MAX_WIDTH = 480;
const VIDEO_FPS = 8;
const MAX_VIDEO_SECONDS = 6;

type Status = "idle" | "working" | "done" | "error";

export function GifConverter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("converted.gif");

  async function onFile(file: File) {
    previewUrl && URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStatus("working");
    setMessage("Converting…");
    try {
      const blob = IMAGE_TYPES.includes(file.type)
        ? await imageToGif(file)
        : VIDEO_TYPES.includes(file.type)
          ? await videoToGif(file)
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
          const file = e.dataTransfer.files[0];
          if (file) void onFile(file);
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
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,video/mp4"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {status === "working" && <p className="text-sm text-zinc-500">{message}</p>}
      {status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}

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

function stripExt(name: string) {
  return name.replace(/\.[^.]+$/, "") || "converted";
}

function fitSize(width: number, height: number) {
  const scale = Math.min(1, MAX_WIDTH / width);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function encodeGif(frames: ImageData[], delay: number) {
  const gif = GIFEncoder();
  frames.forEach((frame, i) => {
    const palette = quantize(frame.data, 256);
    const index = applyPalette(frame.data, palette);
    gif.writeFrame(index, frame.width, frame.height, {
      palette,
      delay,
      repeat: i === 0 ? 0 : undefined,
    });
  });
  gif.finish();
  return new Blob([gif.bytes() as BlobPart], { type: "image/gif" });
}

async function imageToGif(file: File) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return encodeGif([ctx.getImageData(0, 0, width, height)], 100);
}

async function videoToGif(file: File) {
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

  const duration = Math.min(video.duration || 1, MAX_VIDEO_SECONDS);
  const { width, height } = fitSize(video.videoWidth, video.videoHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas");

  const frameCount = Math.max(1, Math.round(duration * VIDEO_FPS));
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
  return encodeGif(frames, Math.round(100 / VIDEO_FPS));
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
