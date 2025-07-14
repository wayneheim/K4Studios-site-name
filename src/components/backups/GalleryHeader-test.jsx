import React from "react";

export default function GalleryHeader() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Glegoo&display=swap');

        body {
          font-family: 'Glegoo', serif;
          margin: 0;
          padding-top: 1.5rem;
          background: #fdfcf9;
          color: #2c2c2c;
        }

        header {
          position: relative;
          z-index: 2;
          overflow: visible;
        }

        .nav-bar {
          display: flex;
          justify-content: flex-end;
          padding: 0;
          border-bottom: none;
          background: transparent;
          position: relative;
          z-index: 0;
          overflow: visible;
          gap: 0;
        }

        .nav-bar a {
          position: relative;
          text-decoration: none;
          color: #333;
          border: 1px solid #bbb;
          padding: 0.1rem 0.6rem;
          font-size: 0.9rem;
          margin: 0;
          background: #fff;
          display: inline-block;
        }

        .nav-bar a:hover {
          background-color: #f7f6f1;
        }

        .nav-bar a::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          height: 2px;
          width: 0%;
          background: linear-gradient(to right, #a0522d 60%, rgba(160, 82, 45, 0));
          transition: width 0.4s ease;
        }

        .nav-bar a:hover::after {
          width: 100%;
        }

        .menu-panel {
          position: absolute;
          top: 100%;
          left: 0;
          background: #fff;
          border: 1px solid #ccc;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: none;
          z-index: 9999;
          min-width: 220px;
          margin-top: -1px;
          transform: translateX(0);
        }

        .menu-panel a {
          display: block;
          padding: 0.5rem 1rem;
          color: #222;
          text-decoration: none;
          border-bottom: 1px solid #eee;
          font-size: 0.9rem;
        }

        .menu-panel a:hover {
          background-color: #f1efe9;
        }
      `}</style>

      <header>
        <div className="nav-bar">
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => {
              document.querySelector('.painterly-menu').style.display = 'block';
            }}
            onMouseLeave={() => {
              setTimeout(() => {
                if (!document.querySelector('.painterly-menu')?.matches(':hover')) {
                  document.querySelector('.painterly-menu').style.display = 'none';
                }
              }, 150);
            }}
          >
            <a href="#">Painterly</a>
            <div className="menu-panel painterly-menu">
              <a href="#">Facing History</a>
              <a href="#">Landscapes</a>
              <a href="#">Transportation</a>
              <a href="#">Miscellaneous</a>
              <a href="#">Engrained Series</a>
            </div>
          </div>

          <a href="#">Traditional</a>
          <a href="#">Bio</a>
          <a href="#">Contact</a>

          <div
            style={{ position: "relative" }}
            onMouseEnter={() => {
              document.querySelector('.other-menu').style.display = 'block';
            }}
            onMouseLeave={() => {
              setTimeout(() => {
                if (!document.querySelector('.other-menu')?.matches(':hover')) {
                  document.querySelector('.other-menu').style.display = 'none';
                }
              }, 150);
            }}
          >
            <a href="#">Other</a>
            <div className="menu-panel other-menu" style={{ right: 0, left: 'auto' }}>
              <a href="#">News & Awards</a>
              <a href="#">Print Options</a>
              <a href="#">Photo Shoots</a>
              <a href="#">K4 Select Series</a>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
