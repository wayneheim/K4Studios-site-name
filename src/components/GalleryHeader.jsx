import React, { useEffect } from "react";

export default function GalleryHeader() {


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Glegoo&display=swap');

        body {
          font-family: 'Glegoo', serif;
          margin: 0;
          padding-top: 0.5rem;
          background:rgb(255, 255, 255);
          color: #2c2c2c;
        }

        header {
          position: relative;
          z-index: 2;
          overflow: visible;
        }

        .nav-bar:hover {
  z-index: 5;
}

.nav-bar {
  display: flex;
  justify-content: flex-end;
  padding: 0;
   margin-top: 6px;
  border-bottom: none;
  background: transparent;
  position: relative;
  z-index: 1; /* LOWER than gallery-bar */
  overflow: visible;
}

       .nav-bar a,
.nav-bar > .nav-item > a {
  display: inline-block;
  padding: 0.1rem 0.6rem;
  font-size: 0.9rem;
  margin: 0;
  text-decoration: none;
  background: #fff;
  border: 1px solid #bbb;
  border-right: none;
  color: #333;
  vertical-align: middle;
  line-height: 1.6; /* ensure consistency */
  box-sizing: border-box;
  transform: translateY(30px);
  opacity: 0;
  animation: slideIn 0.5s forwards;
  z-index: 1;
}


        .nav-bar a:nth-child(1) { animation-delay: 0.1s; }
        .nav-bar a:nth-child(2) { animation-delay: 0.2s; }
        .nav-bar a:nth-child(3) { animation-delay: 0.3s; }
        .nav-bar a:nth-child(4) { animation-delay: 0.4s; }
        .nav-bar a:nth-child(5) { animation-delay: 0.5s; }

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

        @keyframes slideIn {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .nav-bar a:last-child {
          border-right: 1px solid #bbb;
        }

        .menu-panel {
          position: absolute;
          top: 30px;
          right: 305px;
          background: #fff;
          border: 1px solid #ccc;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: none;
          z-index: 1000;
          min-width: 220px;
        }

        


.menu-panel a {
  display: block;
  padding: 0.4rem 0.6rem;
  color: #222;
  text-decoration: none;
  font-family: 'Glegoo', serif;
  font-size: 0.9rem;
  border: 1px solid #bbb;
  background: #fff;
  margin: 0;
  line-height: 1.4;
  position: relative;
  
}


        .menu-panel a:hover {
          background-color: #f1efe9;
        }

        .menu-panel a::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          height: 2px;
          width: 0%;
          background: linear-gradient(to right, #a0522d 60%, rgba(160, 82, 45, 0));
          transition: width 0.4s ease;
        }
        .menu-panel a:hover::after {
          width: 100%;
        }

        .gallery-bar {
  background-color: #2c211c;
  background-image: repeating-linear-gradient(to bottom, #605854 0px, #605854 2px, #2c211c 2px, #2c211c 6px);
  position: relative;
  height: 70px;
  display: flex;
  align-items: center;
  padding-left: 180px;
  z-index: 10; /* HIGHER than nav-bar */
}

        .breadcrumbs {
          background: #281d18;
          color: #fff;
          font-size: 1.5rem;
          font-weight: bold;
          padding: 0.5rem 2rem;
          position: relative;
          z-index: 3;
          margin-left: -140px;
          padding-left: 145px;
        }

        .logo-box {
          width: 90px;
          height: 90px;
          background: #000;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: bold;
          border: 4px solid #fff;
          position: absolute;
          top: -12px;
          left: 40px;
          z-index: 9999;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
        }

        .color-toggle {
          font-size: 0.7rem;
          color: #444;
          text-align: center;
          margin-top: 4px;
          position: absolute;
          top: 120px;
          left: 30px;
          width: 90px;
        }
          
      `}</style>

     <header>
  <div className="nav-bar">
    <div className="nav-item has-dropdown">
      <a href="#" className="nav-link">Painterly</a>
      <div className="menu-panel painterly-menu" style={{ zIndex: 999999 }}>
        <a href="#">Facing History</a>
        <a href="#">Landscapes</a>
        <a href="#">Transportation</a>
        <a href="#">Miscellaneous</a>
        <a href="#">Engrained Series</a>
      </div>
    </div>

    <a href="#" className="nav-link">Traditional</a>
     <div className="nav-item has-dropdown">
      <a href="#" className="nav-link">Other</a>
      <div className="menu-panel other-menu" style={{ zIndex: 999999, right: 125, left: 'auto' }}>
        <a href="#">News & Awards</a>
        <a href="#">Print Options</a>
        <a href="#">Photo Shoots</a>
        <a href="#">K4 Select Series</a>
      </div>
    <a href="#" className="nav-link">Bio</a>
    <a href="#" className="nav-link">Contact</a>
    </div>
  </div>

  <div className="gallery-bar" style={{ position: 'relative', zIndex: 1 }}>
    <div className="logo-box p-1">
  <img
    src="/Public/images/K4Logo-web.jpg"
    alt="K4 Studios Logo"
    style={{
      width: "100%",
      height: "100%",
      objectFit: "contain",
      filter: "grayscale(100%)",
      opacity: 0.85,
    }}
  />
</div>
    <div className="breadcrumbs">Facing History: Western Art: Color Photos</div>
  </div>

<div className="ml-11 mt-4 text-xs text-neutral-600 space-x-1">
  <span>|</span>
  <a
    href="/Facing-History/Western-Cowboy-Portraits/Color"
    className="hover:text-black hover:underline transition"
  >
    <strong>Color</strong>
  </a>
  <span>|</span>
  <a
    href="/Facing-History/Western-Cowboy-Portraits/Black-White"
    className="hover:text-black hover:underline transition"
  >
    B/W
  </a>
  <span>|</span>
</div>


  <script dangerouslySetInnerHTML={{
    __html: `
      document.querySelectorAll('.has-dropdown').forEach(item => {
        const menu = item.querySelector('.menu-panel');
        item.addEventListener('mouseenter', () => {
          menu.style.display = 'block';
        });
        item.addEventListener('mouseleave', () => {
          setTimeout(() => {
            if (!menu.matches(':hover')) {
              menu.style.display = 'none';
            }
          }, 150);
        });
      });
    `
  }} />
</header>
    </>
  );
}
