import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { GenerationResultView } from "../scene-generation/types";
import { filterCompletedHeroImages, toCompletedHeroImages } from "./completed-results";

interface CompletedGalleryProps {
  results: GenerationResultView[];
  loading: boolean;
  error?: string;
  onRetry: () => void;
}

export function CompletedGallery({ results, loading, error, onRetry }: CompletedGalleryProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const items = useMemo(() => toCompletedHeroImages(results), [results]);
  const filtered = useMemo(() => filterCompletedHeroImages(items, query), [items, query]);
  const selected = items.find((item) => item.id === selectedId);

  return (
    <main className="page standard-page">
      <div className="page-heading">
        <div><h2>已完成首图</h2><p>生成成功、可以交付运营的商品第一张图</p></div>
        <div className="search-box"><Search size={17} /><input aria-label="搜索已完成商品" placeholder="搜索已完成商品" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      </div>
      <div className="filter-bar"><button type="button" className="active">全部</button></div>
      {loading && <div className="completed-state">正在加载已完成首图</div>}
      {!loading && error && <div className="completed-state error-callout"><span>{error}</span><button type="button" onClick={onRetry}>重新加载</button></div>}
      {!loading && !error && filtered.length === 0 && <div className="completed-state">暂无已完成首图</div>}
      {!loading && !error && filtered.length > 0 && (
        <div className="completed-grid">
          {filtered.map((item) => (
            <article className="completed-card" key={item.id}>
              <button type="button" className="completed-card-open" aria-label={`查看 ${item.title} 详情`} onClick={() => setSelectedId(item.id)}>
                <img src={item.imageUrl} alt={item.title} />
                <div><span className="status 已完成">已通过</span><h3>{item.title}</h3><p>{item.subtitle}</p></div>
              </button>
              <footer><span>已保存</span><a href={item.imageUrl} target="_blank" rel="noreferrer">下载</a></footer>
            </article>
          ))}
        </div>
      )}
      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelectedId(undefined)}>
          <aside className="detail-drawer" role="dialog" aria-modal="true" aria-label={`${selected.title} 详情`} onClick={(event) => event.stopPropagation()}>
            <div className="panel-title"><div><h2>首图交付</h2><p>Supabase 中保存的最终结果</p></div><button type="button" className="icon-button" aria-label="关闭详情" onClick={() => setSelectedId(undefined)}>×</button></div>
            <img src={selected.imageUrl} alt={selected.title} className="drawer-image" />
            <h3>{selected.title}</h3>
            <div className="tags"><span className="tag green">已通过</span></div>
            <a className="button primary wide" href={selected.imageUrl} target="_blank" rel="noreferrer">下载最终首图</a>
          </aside>
        </div>
      )}
    </main>
  );
}
