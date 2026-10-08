import { RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { savePromptVersion } from "./api";

export function PromptEditor({
  templateId,
  text,
  dirty,
  onEdit,
  onReset,
}: {
  templateId?: string;
  text: string;
  dirty: boolean;
  onEdit(value: string): void;
  onReset(): void;
}) {
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!templateId) return;
    setSaving(true);
    setMessage(undefined);
    try {
      const version = await savePromptVersion(templateId, text);
      setMessage(`已保存为模板 v${version.versionNumber}`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "模板保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="prompt-editor">
      <div className="prompt-editor-heading">
        <strong>生成提示词</strong>
        {dirty && <span>已手动修改</span>}
      </div>
      <textarea value={text} onChange={(event) => onEdit(event.target.value)} rows={9} />
      <div className="prompt-editor-actions">
        <button type="button" className="text-button" onClick={onReset}>
          <RotateCcw size={15} /> 恢复默认模板
        </button>
        <button type="button" className="text-button" disabled={!templateId || saving} onClick={() => { void save(); }}>
          <Save size={15} /> {saving ? "保存中" : "另存为模板"}
        </button>
      </div>
      {message && <small className="prompt-editor-message">{message}</small>}
    </div>
  );
}
