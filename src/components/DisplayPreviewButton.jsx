import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getDisplayPreview } from '../data/pricing/displayPreviews.js';
import { trackEvent } from '../utils/analytics';
import './DisplayPreviewButton.css';

function DisplayPreview({ preview, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const captionId = useId();
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="display-preview-dialog"
      aria-labelledby={titleId}
      aria-describedby={captionId}
      onKeyDown={(event) => {
        event.stopPropagation();
        // This dialog has one control. Keep Tab on it instead of moving into browser chrome.
        if (event.key === 'Tab') {
          event.preventDefault();
          dialogRef.current.querySelector('button')?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}
    >
      <header className="display-preview-header">
        <h2 id={titleId}>Display Preview</h2>
        <button type="button" className="display-preview-close" aria-label="Close display preview" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      <p id={captionId} className="display-preview-caption">{preview.caption}</p>
      {imageFailed ? (
        <p className="display-preview-unavailable" role="status">This display preview is temporarily unavailable.</p>
      ) : (
        <img className="display-preview-image" src={preview.image} alt={preview.alt || 'A sample print displayed in a mat and frame'} onError={() => setImageFailed(true)} />
      )}
    </dialog>,
    document.body,
  );
}

export default function DisplayPreviewButton({ size, imageId, source }) {
  const [isOpen, setIsOpen] = useState(false);
  const preview = getDisplayPreview(size);
  if (!preview) return null;

  return (
    <>
      <button
        type="button"
        className="display-preview-button"
        aria-label={`See on Wall for ${preview.size} prints`}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(true);
          const sizeKey = preview.size.replace(/\s/g, '');
          const origin = ['zoom', 'pricing', 'order'].includes(source) ? source : null;
          trackEvent('wall_preview_open', {
            imageId,
            sourceLayer: origin ? `wall_preview_size_${sizeKey}_${origin}_v2` : `wall_preview_size_${sizeKey}_v1`,
            trigger: `see_on_wall_${sizeKey}${origin ? `_${origin}` : ''}`,
          });
        }}
      >
        See on Wall
      </button>
      {isOpen && <DisplayPreview preview={preview} onClose={() => setIsOpen(false)} />}
    </>
  );
}
