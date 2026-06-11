"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, FocusEvent, MouseEvent, TouchEvent } from "react";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

function isPrefetchable(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("/api/") && !href.includes("#");
}

export function PrefetchLink({ href, onFocus, onMouseEnter, onTouchStart, prefetch, ...props }: Props) {
  const router = useRouter();

  function warmRoute() {
    if (isPrefetchable(href)) router.prefetch(href);
  }

  return (
    <Link
      {...props}
      href={href as LinkProps["href"]}
      prefetch={prefetch ?? true}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        warmRoute();
        onFocus?.(event);
      }}
      onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
        warmRoute();
        onMouseEnter?.(event);
      }}
      onTouchStart={(event: TouchEvent<HTMLAnchorElement>) => {
        warmRoute();
        onTouchStart?.(event);
      }}
    />
  );
}
