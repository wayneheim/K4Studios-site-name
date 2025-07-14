// src/components/FAQAccordion.jsx
import React from "react";

export default function FAQAccordion({ items }) {
  return (
    <section className="faq">
      <h2>Frequently Asked Questions</h2>
      {items.map((item, idx) => (
        <details key={idx} className="faq-item">
          <summary dangerouslySetInnerHTML={{ __html: `<b>${item.q}</b>` }} />
          <div
            className="faq-content"
            dangerouslySetInnerHTML={{ __html: item.a }}
          />
        </details>
      ))}

      <style jsx>{`

      /* ─── FAQ Truncation System ─────────────────────────── */
.more-toggle {                   /* hide the real checkbox   */
  display: none;
}

/* the box that expands / collapses */
.truncate-container {
  max-height: 380px;            /* how much of the FAQ shows by default */
  overflow: hidden;
  position: relative;
  transition: max-height 1.15s ease;
}
  

/* fade-out curtain */
.truncate-container::after {
  content: "";
  position: absolute;
  z-index: 0;    
  left: 0;
  right: 0;
  bottom: 0;
  height: 60px;                 /* height of the fade      */
  background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, #fff 100%);
  pointer-events: none;
}

/* when the checkbox is checked → reveal */
.more-toggle:checked + .truncate-container {
  max-height: 1400px;           /* essentially “auto”       */
  transition-delay: 0s;
}

.more-toggle:checked + .truncate-container::after {
  display: none;                /* remove the fade-out      */
  opaity: 1;
  transition-delay: 0s;
   transform 0.9s ease-in-out;
  }

/* clickable label text */
.more-toggle-label::before {
  content: "Show More FAQ’s";
  display: block;
  text-align: center;
  font-family: "Glegoo", serif;
  font-size: 1rem;
  font-weight: 700;
  color: #928176ff;
  padding: 1rem 0;
  cursor: pointer;
}

/* swap text when open */
.more-toggle:checked + .truncate-container + .more-toggle-label::before {
  content: "Show Less";
}
        .faq {
          font-family: "Glegoo", Georgia, "Times New Roman", Times, serif;
          color: rgb(99, 98, 98);
          font-size: 0.85rem;
          line-height: 1.5;
          background-color: #fff;
           border: 1px solid #eee6db;
          border-radius: 12px;
           box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);
          padding: 1.75rem;
          margin: 4rem auto;
          max-width: 900px;
          position: relative;
          z-index: 10;
        }

        .faq * {
          font-family: inherit;
        }

        .faq h2 {
          font-size: 1.25rem;
          font-weight: 500;
             color: rgba(139, 129, 120, 1) !important;
          text-align: center;
          border-bottom: 1.5px solid #d1cec8ff;
          padding-bottom: 0.75rem;
          margin-bottom: 1rem;
          margin-top: -.7rem;
        }

        .faq-item {
          overflow: hidden;
          transition: all 0.4s ease-in-out;
        }

        .faq-content {
          max-height: 0;
          opacity: 0;
          color: rgba(95, 82, 76, 1);
          transform: translateY(-8px);
          overflow: hidden;
          transition:
            max-height 0.8s ease-in-out,
            opacity 0.6s ease-in-out,
            transform 0.6s ease-in-out;
        }

        .faq-item[open] .faq-content {
          max-height: 1000px;
          opacity: 1;
          transform: translateY(0);
         
        }

        .faq details {
        margin-top: -1.5rem;
          padding-top: .5rem;
          padding-left: 1.25rem;
          padding-right: 1.25rem;
          margin-bottom: 1.5rem;
          border-bottom: 1.5px solid #d1cec8ff;
          padding-bottom: 1rem;
        }

        .faq details:hover {
          background-color: #f0ede9ff;
              }

        .faq summary {
          scroll-margin-top: 100px;
          font-weight: 300;
          font-size: 1rem;
          color: rgba(172, 162, 151, 1);
          margin-top: .5rem;
          margin-bottom: 0.25rem;
          list-style: none;
          display: block;
          cursor: pointer;
        }

        .faq summary:hover {
          color: rgba(95, 82, 76, 1);
        }

        .faq p {
          font-size: 1rem;
          color: rgba(95, 82, 76, 1);
          margin-top: 0.5rem;
          padding-left: 1.5rem;
        }

        .faq ul {
          list-style-type: disc;
          padding-left: 90px;
          margin-top: 0.75rem;
          margin-bottom: 1rem;
          color: rgb(85, 72, 62);
          font-size: 1rem;
        }

        .faq li {
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }

        @media screen and (max-width: 768px) {
          .faq {
            padding: 1.25rem;
          }

          .faq li {
          margin-left: -1.5rem;
          font-size: .82rem;
          line-height: 1.25;
        }

          .faq h2 {
            font-size: 1.40rem;
            font-weight: 900;
             color: rgb(124, 98, 78) !important;
          }

          .faq summary {
            font-size: .9rem;
          }

          .faq details {
          font-size: .8rem;
          color: rgb(95, 81, 70);
          margin-top: -1.5rem;
          padding-top: .5rem;
          padding-right: 1.5rem;
          padding-left: 1.5rem;
        }
        }
      `}</style>
    </section>
  );
}
