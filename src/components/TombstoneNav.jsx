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
                loading="lazy"
                className="tombstone-img"
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
            transform: scale(0.87);
            transform-origin: top center;
            padding-top: 0.25rem;
            margin-bottom: -4.5rem;
            margin-top: -5pt;
          }
        }

        .tombstone-title {
          font-family: 'Glegoo', serif;
          font-size: 0.85rem;
          font-weight: 800;
          color: #3e2c1c;
          text-align: center;
          margin-top: 0.5rem;
        }

        .fade-in-up {
          opacity: 0;
          transform: translateY(-20px);
          animation-name: fadeSlideUp;
          animation-duration: 0.9s;
          animation-timing-function: ease;
          animation-fill-mode: forwards;
          animation-delay: 0.6s;
        }

        .fade-in-up.pop-effect {
          animation-name: fadeSlideUp, pop-highlight;
          animation-duration: 0.9s, 0.7s;
          animation-timing-function: ease, ease;
          animation-fill-mode: forwards, forwards;
          animation-delay: 0.6s, 1.8s;
        }

        @keyframes fadeSlideUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pop-highlight {
          0% {
            transform: scale(1);
          }
          30% {
            transform: scale(1.15);
          }
          60% {
            transform: scale(0.95);
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
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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
          width: 100%;
          max-width: 150px;
          margin: 0 auto;
          transition: transform 0.3s ease;
        }

        .tile:hover .tombstone-card {
          box-shadow:
            0 6px 16px rgba(0, 0, 0, 0.2),
            0 0 0 2px rgba(189, 162, 124, 0.3);
          transform: scale(1.01);
        }

        .tombstone-card {
          aspect-ratio: 3.5 / 4;
          border-radius: 0% 0% 25% 25% / 0% 0% 20% 20%;
          overflow: hidden;
          background: #fdfcf9;
          border: 1px solid #bda27c;
          box-shadow:
            inset 0 -1px 1px rgba(255, 255, 255, 0.6),
            inset 0 1px 2px rgba(0, 0, 0, 0.08),
            0 8px 20px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 250px;
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
          opacity: 0;
          animation-name: dropIn;
          animation-duration: 0.8s;
          animation-fill-mode: forwards;
          animation-timing-function: ease-out;
        }

        @keyframes dropIn {
          0% {
            opacity: 0;
            transform: translateY(-40px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
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
