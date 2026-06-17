"use client";

import { useEffect, useRef, useState } from "react";
import type { BoundingBox, ScanViewport } from "@/lib/scanner/types";
import { calculateEvidenceCrop } from "@/lib/scanner/evidence-crop";

export function IssueEvidenceImage({
  src,
  alt,
  boundingBox,
  viewport,
}: {
  src: string;
  alt: string;
  boundingBox: unknown;
  viewport: unknown;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const box = readBoundingBox(boundingBox);
  const scanViewport = readViewport(viewport);
  const crop = imageSize ? calculateEvidenceCrop(imageSize, box, scanViewport) : null;

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
    }
  }, [src]);

  return (
    <div className="min-w-0 max-w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt={crop ? "" : alt}
        aria-hidden={crop ? true : undefined}
        onLoad={(event) => {
          const image = event.currentTarget;
          setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
        }}
        className={crop ? "sr-only" : "block h-auto max-h-[520px] max-w-full rounded-md"}
      />
      {crop && imageSize && (
        <svg
          role="img"
          aria-label={alt}
          viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`}
          className="block h-auto max-h-[520px] max-w-full rounded-md"
          style={{
            width: `${Math.min(Math.ceil(crop.width), 720)}px`,
            aspectRatio: `${crop.width} / ${crop.height}`,
          }}
        >
          <image href={src} width={imageSize.width} height={imageSize.height} />
        </svg>
      )}
    </div>
  );
}

function readBoundingBox(value: unknown): BoundingBox | null {
  if (!value || typeof value !== "object") return null;
  const box = value as Record<string, unknown>;
  if (![box.x, box.y, box.width, box.height].every((part) => typeof part === "number")) {
    return null;
  }
  return box as unknown as BoundingBox;
}

function readViewport(value: unknown): Pick<ScanViewport, "width" | "height"> | null {
  if (!value || typeof value !== "object") return null;
  const viewport = value as Record<string, unknown>;
  if (typeof viewport.width !== "number" || typeof viewport.height !== "number") return null;
  return { width: viewport.width, height: viewport.height };
}
