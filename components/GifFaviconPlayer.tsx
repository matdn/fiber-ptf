"use client";

import { useEffect } from "react";

function getOrCreateLink(id: string, rel: string) {
  let link = document.getElementById(id) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = rel;
    link.type = "image/png";
    document.head.appendChild(link);
  }

  return link;
}

export default function GifFaviconPlayer() {
  useEffect(() => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const iconLink = getOrCreateLink("gif-favicon-icon", "icon");
    const shortcutLink = getOrCreateLink("gif-favicon-shortcut", "shortcut icon");

    const img = new Image();
    img.src = "/turningM.gif";

    const render = () => {
      if (!(img.complete && img.naturalWidth > 0)) return;

      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      const url = canvas.toDataURL("image/png");
      iconLink.href = url;
      shortcutLink.href = url;
    };

    const interval = window.setInterval(render, 80);
    render();

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
