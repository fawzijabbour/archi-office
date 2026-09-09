const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];

function getExt(name) {
  return (name || "").split(".").pop().toLowerCase();
}

function FileBadge({ ext, small }) {
  const size = small ? "w-7 h-7 text-[9px]" : "w-10 h-10 text-[10px]";
  return (
    <div className={`shrink-0 ${size} rounded-md border border-navy-600/40 flex items-center justify-center font-mono uppercase text-cyan-400/80 bg-navy-950`}>
      {ext ? ext.slice(0, 4) : "?"}
    </div>
  );
}

// Renders images inline, embeds PDFs, and falls back to a download card
// for formats browsers can't display (DWG, RVT, SKP, etc.).
export function FilePreviewLarge({ url, name, label }) {
  const ext = getExt(name || url);

  if (IMAGE_EXTS.includes(ext)) {
    return <img src={url} alt={label || name || "Main plan"} className="max-w-full border border-navy-600/30 rounded-md" />;
  }

  if (ext === "pdf") {
    return (
      <div className="border border-navy-600/30 rounded-md overflow-hidden" style={{ height: 480 }}>
        <iframe src={url} title={label || name} className="w-full h-full" style={{ border: "none" }} />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 border border-navy-600/30 rounded-md p-4 hover:border-cyan-400/50 transition-colors max-w-sm"
    >
      <FileBadge ext={ext} />
      <div className="min-w-0">
        <div className="text-sm text-cyan-300 truncate">{label || name}</div>
        <div className="text-xs text-cyan-300/50">Preview not available — click to open</div>
      </div>
    </a>
  );
}

export function FileRow({ url, name }) {
  const ext = getExt(name);
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-cyan-300/80 hover:text-cyan-400 transition-colors">
      <FileBadge ext={ext} small />
      <span className="font-mono text-xs truncate">{name}</span>
    </a>
  );
}
