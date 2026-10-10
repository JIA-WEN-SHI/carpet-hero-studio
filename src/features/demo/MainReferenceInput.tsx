import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";

export function MainReferenceInput({ url, name, images, onChange }: {
  url: string; name: string; images: { url: string; label: string }[];
  onChange(url: string, name: string): void;
}) {
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const readerRef = useRef<FileReader>();
  const requestRef = useRef(0);
  useEffect(() => () => { requestRef.current += 1; readerRef.current?.abort(); }, []);

  const upload = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("请上传 JPG、PNG 或 WebP 格式的主图。"); return; }
    if (!file.size || file.size > 3 * 1024 * 1024) { setError("演示主图需为非空图片，大小不超过 3 MB。"); return; }
    const request = ++requestRef.current;
    readerRef.current?.abort();
    const reader = new FileReader();
    readerRef.current = reader;
    setError(""); setReading(true);
    const fail = () => { if (request === requestRef.current) { setError("这张图片无法读取，请重新选择一张有效主图。"); setReading(false); } };
    reader.onerror = fail;
    reader.onload = () => {
      if (request !== requestRef.current) return;
      if (typeof reader.result !== "string") { fail(); return; }
      const imageUrl = reader.result;
      const preview = new window.Image();
      preview.onerror = fail;
      preview.onload = () => {
        if (request !== requestRef.current) return;
        onChange(imageUrl, file.name); setReading(false);
      };
      preview.src = imageUrl;
    };
    reader.readAsDataURL(file);
  };

  return <section className="panel">
    <div className="panel-title"><div><h2>运营选品案例</h2><p>第一步：上传原主图，参考它的构图、地毯角度与场景布局</p></div><span className="tag green">参考主图</span></div>
    <div className="demo-main-reference"><img src={url} alt="当前上传或选中的参考主图" /><span className="tag">{name}</span></div>
    <label className="demo-main-upload"><Upload size={19} /><strong>{reading ? "正在读取主图…" : "上传 / 更换参考主图"}</strong><span>JPG、PNG、WebP · 最大 3 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" aria-label="上传参考主图" disabled={reading} onChange={(event) => { upload(event.target.files?.[0]); event.target.value = ""; }} /></label>
    {error && <p className="demo-upload-error" role="alert">{error}</p>}
    <p className="muted">选择深色主图，后续只出深色场景；选择浅色主图，后续只出浅色场景。每种风格六张，每次三张，重新生成换另一组。第二步的自有 SKU 不变。当前为预制演示，自行上传继承当前风格，不会自动识别或实时重绘。</p>
    <div className="section-heading"><strong>两套主图 · 选择一张开始</strong><span>深色 / 浅色</span></div>
    <div className="demo-source-gallery demo-main-options">{images.map((image) => <div key={image.url} className={url === image.url ? "selected" : ""}><a href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={image.label} loading="lazy" /></a><button disabled={reading} aria-pressed={url === image.url} onClick={() => { setError(""); onChange(image.url, image.label); }}>使用{image.label}</button></div>)}</div>
  </section>;
}
