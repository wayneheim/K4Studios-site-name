export default function DropdownTest() {
  return (
    <>
      <style>{`
        .test-container {
          margin: 200px;
          position: relative;
          display: inline-block;
        }

        .test-trigger {
          background: #a0522d;
          color: white;
          padding: 10px 20px;
          font-size: 16px;
          cursor: pointer;
          border-radius: 4px;
          user-select: none;
        }

        .test-dropdown {
          position: absolute;
          top: 40px;
          left: 0;
          background: red;
          border: 1px solid #ccc;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
          padding: 10px;
          display: none;
          z-index: 99999;
        }

        .test-dropdown a {
          display: block;
          text-decoration: none;
          color: #222;
          padding: 5px 10px;
        }

        .test-dropdown a:hover {
          background: #eee;
        }
      `}</style>

      <div
        className="test-container"
        onMouseEnter={() => {
          document.querySelector(".test-dropdown").style.display = "block";
        }}
        onMouseLeave={() => {
          setTimeout(() => {
            if (!document.querySelector(".test-dropdown")?.matches(":hover")) {
              document.querySelector(".test-dropdown").style.display = "none";
            }
          }, 150);
        }}
      >
        <div className="test-trigger">Test Dropdown</div>
        <div className="test-dropdown">
          <a href="#">Item 1</a>
          <a href="#">Item 2</a>
          <a href="#">Item 3</a>
        </div>
      </div>
    </>
  );
}
