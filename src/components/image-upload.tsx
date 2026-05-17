"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X, Loader2 } from "lucide-react";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
  max?: number;
  className?: string;
};

export function ImageUpload({ value, onChange, onUploadingChange, max = 4, className = "" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function setUploadingState(val: boolean) {
    setUploading(val);
    onUploadingChange?.(val);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = max - value.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploadingState(true);
    const uploaded: string[] = [];
    for (const file of toUpload) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        uploaded.push(url);
      }
    }
    onChange([...value, ...uploaded]);
    setUploadingState(false);
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {value.map((url) => (
        <div key={url} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border group">
          <Image src={url} alt="upload" fill className="object-cover" sizes="96px" />
          <button
            type="button"
            onClick={() => remove(url)}
            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={12} />
          </button>
        </div>
      ))}

      {value.length < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <ImagePlus size={20} />
              <span className="text-xs">Add photo</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
