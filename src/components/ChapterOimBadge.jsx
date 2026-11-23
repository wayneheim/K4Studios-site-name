import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleX } from 'lucide-react';
import contentClassificationRegistry from '../data/contentClassificationRegistry.json';
import { isOimImage } from '../utils/contentReview.mjs';
import { oimParagraphs } from '../data/oimCopy.js';
import { trackOimOpen } from '../utils/analytics';
import './ChapterOimBadge.css';

function OimInfoPopup({ onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="chapter-oim-popup"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key !== 'Tab') return;
        const controls = dialogRef.current.querySelectorAll('button, a[href]');
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
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
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
    >
      <button type="button" className="chapter-oim-popup-close" aria-label="Close OIM-1 information" onClick={onClose}>
        <CircleX size={24} aria-hidden="true" />
      </button>
      <h2 id={titleId} className="chapter-oim-popup-heading">
        <img src="/images/OIM-1-web.webp" alt="OIM-1" width={95} height={94} />
      </h2>
      <div id={descriptionId} className="chapter-oim-popup-copy">
        {oimParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
      <footer className="chapter-oim-popup-footer">
        <a href="/Other/One-Image-Movie">Learn more about One-Image Movies</a>
      </footer>
    </dialog>,
    document.body,
  );
}

// Use the same curated classification as the chapter badge in every view.
export function OimBadge({ imageId, placement = 'inline' }) {
  if (!isOimImage(imageId, null, contentClassificationRegistry)) return null;
  return <ChapterOimBadge key={imageId} imageId={imageId} placement={placement} />;
}

export default function ChapterOimBadge({ placement = 'chapter', imageId = null }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={placement === 'chapter' ? 'chapter-oim-badge' : `oim-badge-inline${placement === 'zoom' ? ' oim-badge-zoom' : placement === 'index' ? ' oim-badge-index' : ''}`}
        title="About OIM-1"
        aria-label="About OIM-1"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          if (isOpen) return;
          setIsOpen(true);
          trackOimOpen(imageId);
        }}
      >
        <img src="/images/OIM-1-web.webp" alt="OIM-1" width={95} height={94} />
      </button>
      {isOpen && <OimInfoPopup onClose={() => setIsOpen(false)} />}
    </>
  );
}
