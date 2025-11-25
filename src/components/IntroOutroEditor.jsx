import { useState, useEffect } from "react";

export default function IntroOutroEditor({ mode = "intro", showMeta = {}, onSave, onCancel }) {
  const isIntro = mode === "intro";
  const title = isIntro ? "Edit Intro Slide" : "Edit Outro Slide";

  // Define pieces in display order (can be reordered via drag)
  const introPieces = [
    { key: "introText", label: "Opening Text", stageKey: "introTextStage", showKey: "showIntroText", textKey: "introText", defaultText: "K4 Studios presents the Fine Art Photography of Wayne Heim." },
    { key: "showTitle", label: "Title of Show", stageKey: "showTitleStage", showKey: "showShowTitle", textKey: "showTitle", defaultText: "", placeholder: "Outlaws and Bandits" },
    { key: "tagline", label: "Tagline", stageKey: "taglineStage", showKey: "showTagline", textKey: "tagline", defaultText: "Embrace the Past... Live the Story.", placeholder: "Embrace the Past... Live the Story." },
  ];

  const [data, setData] = useState({
    introText: "",
    showTitle: "",
    tagline: "",
    closingText: "",
    cta: "",
    displayUrl: "",
    // Intro stage mapping (1-3): which stage each element appears on
    introTextStage: 1,
    showTitleStage: 2,
    taglineStage: 3,
    // Show/hide toggles for intro elements
    showIntroText: true,
    showShowTitle: true,
    showTagline: true,
    // Drag-and-drop reordering
    introPieceOrder: ["introText", "showTitle", "tagline"],
  });

  const [draggedPiece, setDraggedPiece] = useState(null);

  useEffect(() => {
    if (isIntro && showMeta?.introMeta) {
      const saved = showMeta.introMeta;
      setData((p) => ({
        ...p,
        ...saved,
        introPieceOrder: saved.introPieceOrder || ["introText", "showTitle", "tagline"],
      }));
    }
    if (!isIntro && showMeta?.outroMeta) setData((p) => ({ ...p, ...showMeta.outroMeta }));
  }, [showMeta, isIntro]);

  const handleSave = () => onSave({ data });

  const computedUrl =
    data.displayUrl ||
    `https://www.k4studios.com/pictureshow/${(data.showTitle || showMeta.showTitle || "unknown")
      .toLowerCase()
      .replace(/\s+/g, "-")}`;

  // Drag-and-drop handlers
  const handleDragStart = (e, pieceKey) => {
    setDraggedPiece(pieceKey);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetPieceKey) => {
    e.preventDefault();
    if (!draggedPiece || draggedPiece === targetPieceKey) {
      setDraggedPiece(null);
      return;
    }

    setData((p) => {
      const order = [...p.introPieceOrder];
      const draggedIdx = order.indexOf(draggedPiece);
      const targetIdx = order.indexOf(targetPieceKey);

      if (draggedIdx === -1 || targetIdx === -1) return p;

      // Remove dragged item and insert at new position
      order.splice(draggedIdx, 1);
      order.splice(targetIdx, 0, draggedPiece);

      return { ...p, introPieceOrder: order };
    });

    setDraggedPiece(null);
  };

  const handleDragEnd = () => {
    setDraggedPiece(null);
  };

  const orderedPieces = isIntro
    ? (data.introPieceOrder || ["introText", "showTitle", "tagline"]).map((key) =>
        introPieces.find((p) => p.key === key)
      )
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
      style={{ fontFamily: "'Glegoo', serif" }}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 w-[540px] max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>

        {isIntro ? (
          <>
            <div className="mb-3 text-xs text-gray-500 pb-2">
              💡 Drag pieces to reorder them in the animation sequence
            </div>
            {orderedPieces.map((piece) => (
              <div
                key={piece.key}
                draggable
                onDragStart={(e) => handleDragStart(e, piece.key)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, piece.key)}
                onDragEnd={handleDragEnd}
                className={`mb-3 p-3 rounded-md border-2 cursor-move transition-all ${
                  draggedPiece === piece.key
                    ? "border-blue-500 bg-blue-50 opacity-60"
                    : draggedPiece
                    ? "border-gray-200 bg-gray-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="flex gap-2 items-baseline mb-1">
                  <span className="text-xs font-medium text-gray-500 select-none">⋮⋮</span>
                  <label className="text-xs font-medium text-gray-700 w-12">
                    Stage
                  </label>
                  <label className="text-xs font-medium text-gray-700 flex-1">
                    {piece.label}
                  </label>
                  <label className="text-xs font-medium text-gray-700 w-12">
                    Show
                  </label>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="w-6"></span>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    value={data[piece.stageKey] ?? (piece.key === "introText" ? 1 : piece.key === "showTitle" ? 2 : 3)}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        [piece.stageKey]: Math.max(1, Math.min(3, parseInt(e.target.value) || 1)),
                      }))
                    }
                    className="border rounded-md w-12 px-2 py-1 text-sm text-center"
                  />
                  {piece.textKey === "introText" || piece.textKey === "tagline" ? (
                    <textarea
                      value={data[piece.textKey] || piece.defaultText}
                      onChange={(e) => setData((p) => ({ ...p, [piece.textKey]: e.target.value }))}
                      rows={2}
                      className="border rounded-md flex-1 px-2 py-1 text-sm"
                    />
                  ) : (
                    <input
                      type="text"
                      value={data[piece.textKey] || ""}
                      onChange={(e) => setData((p) => ({ ...p, [piece.textKey]: e.target.value }))}
                      placeholder={piece.placeholder}
                      className="border rounded-md flex-1 px-2 py-1 text-sm"
                    />
                  )}
                  <input
                    type="checkbox"
                    checked={data[piece.showKey] ?? true}
                    onChange={(e) => setData((p) => ({ ...p, [piece.showKey]: e.target.checked }))}
                    className="mt-2 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Closing Statement
            </label>
            <textarea
              value={data.closingText || "Every image is another notch in the belt, keeping history alive."}
              onChange={(e) => setData((p) => ({ ...p, closingText: e.target.value }))}
              rows={3}
              className="border rounded-md w-full px-2 py-1 text-sm mb-3"
            />
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Call to Action (CTA)
            </label>
            <input
              type="text"
              value={data.cta || "Visit k4studios.com to explore more Picture Shows."}
              onChange={(e) => setData((p) => ({ ...p, cta: e.target.value }))}
              placeholder="Visit k4studios.com to explore more Picture Shows."
              className="border rounded-md w-full px-2 py-1 text-sm mb-3"
            />
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Display URL (shown on outro slide)
            </label>
            <input
              type="text"
              value={data.displayUrl || computedUrl}
              onChange={(e) => setData((p) => ({ ...p, displayUrl: e.target.value }))}
              placeholder={computedUrl}
              className="border rounded-md w-full px-2 py-1 text-sm mb-1"
            />
            <div className="text-[11px] text-gray-500 mb-2">
              The outro slide will also show:
              <div className="mt-1 text-blue-700 text-xs">{computedUrl}</div>
              <div className="mt-1 text-gray-500">
                (K4 Studios logo and © Wayne Heim footer added automatically.)
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm rounded-md border bg-gray-100 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm rounded-md border bg-blue-600 text-white hover:bg-blue-700"
          >
            Save {isIntro ? "Intro" : "Outro"}
          </button>
        </div>
      </div>
    </div>
  );
}
