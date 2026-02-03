/**
 * LogoStatic.jsx
 * 
 * CRITICAL: This component has NO props, NO hooks, NO client logic.
 * It exists outside all animated/stateful containers.
 * The logo renders once in SSR and is NEVER re-evaluated.
 */
export default function LogoStatic() {
  return (
    <a href="/" className="logo-static">
      <img src="/images/K4Logo-web.webp" alt="K4 Studios" className="logo-img" />
      <style jsx>{`
        .logo-static {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          z-index: 200;
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
          pointer-events: auto;
        }
        .logo-static .logo-img {
          width: 80px;
          height: auto;
          display: block;
        }
        @media (max-width: 768px) {
          .logo-static {
            left: 50%;
            top: 8px;
            transform: translateX(-50%);
          }
          .logo-static .logo-img {
            width: 60px;
          }
        }
      `}</style>
    </a>
  );
}
