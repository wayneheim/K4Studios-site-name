// src/components/FAQAccordion.jsx
import React from "react";
import "../styles/faq-accordion.css";

// NOTE: FAQPage structured data is injected at the page level, not here.
// This component only renders the FAQ UI accordion.
export default function FAQAccordion({ items, compact = false, showHeading = true }) {
  return (
    <>
    <section className={`faq${compact ? " faq--compact" : ""}`}>
      {showHeading && <h2>Frequently Asked Questions</h2>}
      {items.map((item, idx) => (
        <details key={idx} className="faq-item">
          <summary dangerouslySetInnerHTML={{ __html: `<b>${item.q}</b>` }} />
          <div
            className="faq-content"
            dangerouslySetInnerHTML={{ __html: Array.isArray(item.a) ? item.a.join('') : item.a }}
          />
        </details>
      ))}
    </section>

    </>
  );
}
