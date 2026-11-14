import { useEffect, useRef, useState } from "react";

const MAX_PHOTOS = 6;
const MAX_VIDEOS = 2;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const actionStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minHeight: 38,
  padding: "0 12px",
  border: "1px solid rgba(201,170,108,.35)",
  borderRadius: 999,
  background: "#171819",
  color: "#f6f3ec",
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

export function WeddingMediaUploadControls({ onChange, showPhotos = true }) {
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [musicUrl, setMusicUrl] = useState("");
  const [message, setMessage] = useState("");
  const urlsRef = useRef(new Set());

  useEffect(() => () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current.clear();
  }, []);

  const createAsset = (file, type) => {
    const url = URL.createObjectURL(file);
    urlsRef.current.add(url);
    return { src: url, name: file.name, type };
  };

  const handlePhotos = (event) => {
    const files = Array.from(event.target.files || []);
    const valid = files.filter((file) =>
      ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
      file.size <= MAX_PHOTO_BYTES
    );
    const remaining = Math.max(0, MAX_PHOTOS - photos.length);
    const accepted = valid.slice(0, remaining);
    if (accepted.length !== files.length) {
      setMessage("Some photos were skipped. Use JPG, PNG or WebP files up to 10 MB each, with a maximum of 6.");
    } else {
      setMessage("");
    }
    const next = [...photos, ...accepted.map((file) => createAsset(file, "image"))];
    setPhotos(next);
    onChange?.({ photos: next, videos, musicUrl });
    event.target.value = "";
  };

  const handleVideos = (event) => {
    const files = Array.from(event.target.files || []);
    const valid = files.filter((file) =>
      ["video/mp4", "video/webm"].includes(file.type) &&
      file.size <= MAX_VIDEO_BYTES
    );
    const remaining = Math.max(0, MAX_VIDEOS - videos.length);
    const accepted = valid.slice(0, remaining);
    if (accepted.length !== files.length) {
      setMessage("Some videos were skipped. Use MP4 or WebM files up to 50 MB each, with a maximum of 2.");
    } else {
      setMessage("");
    }
    const next = [...videos, ...accepted.map((file) => createAsset(file, "video"))];
    setVideos(next);
    onChange?.({ photos, videos: next, musicUrl });
    event.target.value = "";
  };

  const handleMusic = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      event.target.value = "";
      return;
    }
    if (musicUrl) {
      URL.revokeObjectURL(musicUrl);
      urlsRef.current.delete(musicUrl);
    }
    const nextUrl = URL.createObjectURL(file);
    urlsRef.current.add(nextUrl);
    setMusicUrl(nextUrl);
    onChange?.({ photos, videos, musicUrl: nextUrl });
    event.target.value = "";
  };

  const removeAsset = (asset, type) => {
    URL.revokeObjectURL(asset.src);
    urlsRef.current.delete(asset.src);
    if (type === "image") {
      const next = photos.filter((item) => item.src !== asset.src);
      setPhotos(next);
      onChange?.({ photos: next, videos, musicUrl });
    } else {
      const next = videos.filter((item) => item.src !== asset.src);
      setVideos(next);
      onChange?.({ photos, videos: next, musicUrl });
    }
  };

  const removeMusic = () => {
    if (musicUrl) {
      URL.revokeObjectURL(musicUrl);
      urlsRef.current.delete(musicUrl);
    }
    setMusicUrl("");
    onChange?.({ photos, videos, musicUrl: "" });
  };

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 22 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
        {showPhotos && (
          <label style={actionStyle}>
            <span aria-hidden="true">▧</span>
            Add photos
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotos} hidden />
          </label>
        )}
        <label style={actionStyle}>
          <span aria-hidden="true">▶</span>
          Add videos
          <input type="file" accept="video/mp4,video/webm" multiple onChange={handleVideos} hidden />
        </label>
        <label style={actionStyle}>
          <span aria-hidden="true">♫</span>
          {musicUrl ? "Replace music" : "Add music"}
          <input type="file" accept="audio/*" onChange={handleMusic} hidden />
        </label>
      </div>
      {message && <p role="alert" style={{ margin: 0, color: "#e5a19a", fontSize: 11 }}>{message}</p>}
      <div style={{ color: "#8f8a82", fontSize: 11, lineHeight: 1.6 }}>
        {showPhotos ? "Photos: JPG, PNG or WebP · up to 6 · 10 MB each. " : ""}
        Videos: MP4 or WebM · up to 2 · 50 MB each. Music: audio files.
      </div>
      {(photos.length > 0 || videos.length > 0 || musicUrl) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {photos.map((asset) => (
            <button key={asset.src} type="button" onClick={() => removeAsset(asset, "image")} style={{ ...actionStyle, minHeight: 30, padding: "0 9px", fontSize: 10 }}>
              ▧ {asset.name} ×
            </button>
          ))}
          {videos.map((asset) => (
            <button key={asset.src} type="button" onClick={() => removeAsset(asset, "video")} style={{ ...actionStyle, minHeight: 30, padding: "0 9px", fontSize: 10 }}>
              ▶ {asset.name} ×
            </button>
          ))}
          {musicUrl && (
            <button type="button" onClick={removeMusic} style={{ ...actionStyle, minHeight: 30, padding: "0 9px", fontSize: 10 }}>
              ♫ Music added ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
