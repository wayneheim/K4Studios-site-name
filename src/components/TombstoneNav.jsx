export default function TombstoneNav({ items = [], title, subtitle }) {
  const gridClass = `tile-grid${items.length === 2 ? ' two-tiles' : ''}`;

  return (
    <section className="tombstone-nav">
      {title && <h2 className="western-title">{title}</h2>}
      {subtitle && <p className="subhead">{subtitle}</p>}

      <div className="tombstone-divider" />

      <div className={gridClass}>
        {items.map((item, index) => (
          <a key={item.title} href={item.href} className="tile">
            <div
              className="tombstone-card tombstone-animate"
              style={{ animationDelay: `${1.05 + index * 0.1}s` }}
            >
              <img
                src={item.thumb}
                alt={item.title}
                loading="eager"
                decoding="async"
                className="tombstone-img"
                width="150"
                height="171"
              />
            </div>
            <p
              className="tombstone-title fade-in-up pop-effect"
              style={{
                animationDelay: `${1.27 + index * 0.2}s, ${2.8 + index * 0.42}s`,
              }}
            >
              {item.title}
            </p>
          </a>
        ))}
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          .tombstone-nav {
            padding-top: 0.25rem;
            padding-bottom: 1rem;
          }
          .tile {
            width: 100px;
            height: 160px;
          }
          .tombstone-card {
            width: 100px;
            height: 114px;
          }
          .tombstone-title {
            font-size: 0.75rem;
          }
        }

        .tombstone-title {
          font-family: 'Glegoo', serif;
          font-size: 0.85rem;
          font-weight: 800;
          color: #3e2c1c;
          text-align: center;
          margin-top: 0.5rem;
          min-height: 1.2em; /* Reserve space to prevent CLS */
        }

        .fade-in-up {
          opacity: 1;
        }

        .fade-in-up.pop-effect {
          opacity: 1;
        }

        @keyframes fadeSlideUp {
          from {
            opacity: 1;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes pop-highlight {
          0% {
            transform: scale(1);
          }
          30% {
            transform: scale(1);
          }
          60% {
            transform: scale(1);
          }
          100% {
            transform: scale(1);
          }
        }

        .tombstone-nav {
          text-align: center;
          padding: 2rem 1rem;
          font-family: 'Glegoo', serif;
        }

        .tombstone-nav h2 {
          font-size: 1.8rem;
          color: #3e2c1c;
          margin-bottom: 0.3rem;
        }

        .tombstone-nav .subhead {
          font-size: 1rem;
          color: #555;
          margin-bottom: 2rem;
        }

        .tile-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .tile-grid.two-tiles {
          max-width: 450px;
        }

        .tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          width: 150px;
          height: 220px; /* Explicit height to prevent CLS */
          margin: 0 auto;
          transition: transform 0.3s ease;
          will-change: transform;
        }

        .tile:hover .tombstone-card {
          box-shadow:
            0 6px 16px rgba(0, 0, 0, 0.2),
            0 0 0 2px rgba(189, 162, 124, 0.3);
          transform: scale(1.01);
        }

        .tombstone-card {
          width: 150px;
          height: 171px; /* Explicit height matches image dimensions */
          border-radius: 0% 0% 25% 25% / 0% 0% 20% 20%;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #bda27c;
          box-shadow:
            inset 0 -1px 1px rgba(255, 255, 255, 0.6),
            inset 0 1px 2px rgba(0, 0, 0, 0.08),
            0 8px 20px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          contain: layout style;
          will-change: transform, box-shadow;
          backface-visibility: hidden;
        }

        .tombstone-divider {
          width: 100%;
          max-width: 780px;
          height: 3px;
          background-color: rgb(167, 154, 142);
          margin: 0.25rem auto 1.5rem;
          opacity: 0.85;
        }

        .tombstone-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 15%;
          /* Prevent image load from causing layout shift */
          content-visibility: auto;
        }

        .tile p {
          margin-top: 0.5rem;
          font-size: 0.85rem;
          font-weight: 800;
          color: #3e2c1c;
          text-align: center;
        }

        @media (min-width: 768px) {
          .tile-grid {
            gap: 2rem;
          }
        }

        .tombstone-animate {
          opacity: 1;
          animation-name: dropIn;
          animation-duration: 0.8s;
          animation-fill-mode: forwards;
          animation-timing-function: ease-out;
        }

        @keyframes dropIn {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 1;
          }
        }

        .tile-grid .tile {
          transition: transform 0.4s ease-out, filter 0.4s ease-out;
        }

        
   @media (hover: hover) and (pointer: fine) {
    .tile-grid:hover .tile {
      transform: scale(0.9);
      filter: grayscale(100%) brightness(0.68);
    }

    .tile-grid:hover .tile:hover {
      transform: scale(1.05);
      filter: none;
      z-index: 1;
    }
  }


        
      `}</style>
    </section>
  );
}
