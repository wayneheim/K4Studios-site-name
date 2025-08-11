import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color.mjs";

export default function ChapterCivilWarColorWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color"
      titleBase="Civil War Portraits – Color"
      sectionKey="/Facing-History/Civil-War-Color"
      swipeHintKey="Painterly-Civil-War-Color"
      {...props}
    />
  );
}
                        >
                          <img
                            src={galleryData[currentIndex].src}
                            alt={galleryData[currentIndex].title}
                            className="chapter-image-mobile border-2 border-gray-400 rounded-lg"
                            style={
                              isMobile
                                ? {
                                    cursor: "zoom-in",
                                    width: "auto",
                                    height: "auto",
                                    objectFit: "contain",
                                    maxHeight: "65vh",
                                  }
                                : {
                                    cursor: "zoom-in",
                                    width: "auto",
                                    height: "auto",
                                    objectFit: "contain",
                                    maxHeight: "70vh",
                                    background: "#f7f7f7",
                                  }
                            }
                            onClick={() => {
                              if (!isLandscapeMobile) setIsZoomed(true);
                            }}
                            data-zoom-btn
                          />
                        </div>

                        {/* Collector Notes (desktop) */}
                        {!isMobile && galleryData[currentIndex].notes && (
                          <div className="hidden md:flex flex-col items-start relative">
                            <button
                              onClick={() => setShowNotes((prev) => !prev)}
                              aria-label="View Collector Notes"
                              title={showNotes ? "Hide Collector Notes" : "View Collector Notes"}
                              className="ml-0 mt-1 w-6 h-8 border border-gray-300 bg-white text-gray-400 rounded-md shadow hover:bg-gray-200 transition relative z-30"
                              style={{ boxShadow: "0 2px 6px rgba(80,60,30,0.10)" }}
                            >
                              {showNotes ? (
                                <span className="text-lg leading-none">✕</span>
                              ) : (
                                <>
                                  <span className="absolute left-2 top-[2px] text-[12px] text-red-600 font-semibold">
                                    *
                                  </span>
                                  <Notebook className="w-6 h-6 stroke-[1.75]" />
                                </>
                              )}
                            </button>
                            <AnimatePresence>
                              {showNotes && (
                                <motion.div
                                  key="collector-notes-desktop"
                                  initial={{ opacity: 0, x: -32 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -32 }}
                                  transition={{ duration: 0.38, ease: [0.33, 1, 0.68, 1] }}
                                  className="absolute -left-3 top-11 z-50 w-96 border border-gray-300 rounded shadow-2xl p-5 text-sm text-gray-800"
                                  style={{
                                    backgroundColor: "#9fa692",
                                    border: "1px solid rgb(109, 111, 114)",
                                    minWidth: "260px",
                                    maxWidth: "90vw",
                                    marginLeft: "16px",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                                    <strong
                                      style={{
                                        color: "#fff",
                                        textShadow: "0 1px 2px #444",
                                        fontWeight: "bold",
                                        marginRight: "0.75em",
                                        fontSize: "1em",
                                      }}
                                    >
                                      Collector Notes:
                                    </strong>
                                    <span
                                      style={{
                                        flex: 1,
                                        marginTop: "4px",
                                        height: "2px",
                                        marginLeft: "0.5em",
                                        borderRadius: "2px",
                                        background: "linear-gradient(to right, #fff 65%, rgba(255,255,255,0))",
                                        filter: "drop-shadow(0 1px 2px #444)",
                                      }}
                                    />
                                  </div>
                                  {galleryData[currentIndex].notes.split("\n\n").map((para, idx) => (
                                    <p key={idx} className="mb-3 last:mb-0">
                                      {para}
                                    </p>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>

                      {/* Right Arrow (mobile) */}
                      <button
                        onClick={() => {
                          setIsExpanded(false);
                          setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1));
                        }}
                        aria-label="Next Chapter"
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-gray-400 bg-gray-100 rounded-md shadow px-2 py-1 text-xl md:hidden"
                        style={{
                          minWidth: 28,
                          minHeight: 28,
                          fontSize: "1.2rem",
                          display: isMobile ? "block" : "none",
                          opacity: showArrows ? 0.8 : 0,
                          transition: "opacity 0.5s ease",
                          pointerEvents: showArrows ? "auto" : "none",
                        }}
                        tabIndex={isMobile ? 0 : -1}
                        data-next-btn
                      >
                        ❯
                      </button>
                    </div>

                    {/* Unified Nav Row */}
                    <div
                      className="flex items-center justify-center ml-[0.1rem] gap-0.5 md:gap-4 mt-1 mb-1 max-w-[370px] mx-auto border border-gray-200 bg-white rounded-md shadow-sm px-1.5 py-1.5"
                      style={!isMobile && galleryData[currentIndex].notes ? { marginRight: "92px" } : {}}
                    >
                      {/* Menu */}
                      <button
                        className="px-1 py-.5 border border-gray-200 hover:bg-gray-100 bg-white text-gray-400 text-lg rounded shadow-sm transition-colors duration-150 hover:text-gray-600 focus:text-gray-500 hover:border-gray-300 focus:border-gray-300"
                        aria-label="Show Menu"
                        title="Show Menu"
                        style={{ minWidth: 32, minHeight: 32, fontWeight: 400 }}
                        onClick={() => setShowMiniMenu(true)}
                        data-menu-btn
                      >
                        ☰
                      </button>

                      {/* Notes (mobile) */}
                      {galleryData[currentIndex].notes && isMobile && (
                        <button
                          onClick={() => setShowNotes((prev) => !prev)}
                          aria-label="View Collector Notes"
                          title={showNotes ? "Hide Collector Notes" : "View Collector Notes"}
                          className="inline-flex items-center text-gray-400 hover:bg-gray-200 justify-center w-7 h-7 relative border border-gray-200 bg-white rounded shadow"
                        >
                          {showNotes ? (
                            <span className="text-lg leading-none">✕</span>
                          ) : (
                            <>
                              <span className="absolute left-2 top-[2px] text-[12px] text-red-600 font-semibold">*</span>
                              <Notebook className="w-5 h-5 stroke-[1.75]" />
                            </>
                          )}
                        </button>
                      )}

                      {/* Gallery count */}
                      <div
                        className="text-sm text-gray-400 font-medium flex items-center whitespace-nowrap"
                        style={{ letterSpacing: "-0.075em" }}
                        data-count
                      >
                        {`${currentIndex + 1} – ${galleryData.length}`}
                      </div>

                      {/* Grid icon (mobile) */}
                      <button
                        onClick={() => setViewMode((prev) => (prev === "flip" ? "grid" : "flip"))}
                        aria-label="View Grid Mode"
                        title="View Grid Mode"
                        className="bg-gray-100 rounded p-1 shadow hover:bg-gray-200 flex items-center justify-center md:hidden"
                        style={{ minWidth: 32, minHeight: 32 }}
                        data-grid-btn
                      >
                        <Grid className="w-5 h-5" style={{ stroke: "#84766d" }} />
                      </button>

                      {/* Jump form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const num = parseInt(e.target.elements.chapterNum.value, 10);
                          if (!isNaN(num) && num >= 1 && num <= galleryData.length) {
                            setIsExpanded(false);
                            setCurrentIndex(num - 1);
                          }
                        }}
                        className="flex items-center gap-2 text-xs"
                        style={{ minWidth: 50 }}
                        data-jump-form
                      >
                        <input
                          type="number"
                          id="chapterNum"
                          name="chapterNum"
                          min="1"
                          max={galleryData.length}
                          placeholder="#"
                          className="w-16 border border-gray-200 rounded px-1 py-1 text-center"
                          style={{ fontSize: "1.0em" }}
                        />
                        <button
                          type="submit"
                          className="bg-gray-000 px-1.5 py-1 text-gray-400 border border-gray-300 rounded shadow hover:text-gray-500 hover:bg-gray-100"
                        >
                          Go
                        </button>
                      </form>

                      {/* Cart */}
                      <a
                        data-cart-btn
                        href={galleryData[currentIndex].buyLink || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Click to order prints"
                        className="inline-flex items-center gap-2 rounded px-2 py-1.5 text-xs font-semibold shadow transition"
                        style={{ backgroundColor: "#bbb6b1", color: "#ffffff" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#76807b")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#bbb6b1")}
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </a>

                      {/* ❤️ Like Button (toolbar) */}
                      <div className="inline-flex items-center px-2" data-like-btn>
                        <LikeButton imageId={galleryData[currentIndex].id} pageTitle={galleryData[currentIndex].title} />
                      </div>

                      {/* Exit */}
                      <button
                        className="group relative inline-block px-1 py-[0.15rem] border border-gray-200 bg-white text-gray-400 text-xs rounded-full shadow-sm transition-colors duration-200 hover:bg-gray-800 hover:text-gray-200 hover:border-gray-400 focus:text-gray-200 focus:border-gray-400"
                        aria-label="Exit Chapter View"
                        title="Exit"
                        style={{ fontWeight: 400, minHeight: 32, minWidth: 30 }}
                        onClick={() =>
                          (window.location.href =
                            "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color")
                        }
                        data-exit-btn
                      >
                        <span className="block relative h-[1em]">
                          <span className="absolute inset-0 flex items-center justify-center text-md transition-all duration-200 ease-in-out opacity-100 translate-y-0 group-hover:opacity-0 group-hover:-translate-y-1">
                            X
                          </span>
                          <span className="absolute inset-0 flex items-center justify-center transition-all duration-200 ease-in-out opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0">
                            Exit
                          </span>
                        </span>
                      </button>
                    </div>

                    {!showStoryShow && (
                      <button
                        onClick={() => setShowStoryShow(true)}
                        aria-label="Play K4 Slideshow"
                        title="Play K4 Story Show"
                        className="group my-3 inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white border border-gray-300 shadow-sm transition-colors"
                        style={{ letterSpacing: ".02em" }}
                        data-slideshow-btn
                      >
                        <span className="inline-flex items-center justify-center w-4 h-4 text-gray-300 group-hover:text-red-700 transition-colors">
                          ▶
                        </span>
                        <span className="text-sm font-medium text-gray-300 group-hover:text-gray-400 transition-colors">
                          Play Show
                        </span>
                      </button>
                    )}

                    {/* Collector Notes Panel (mobile) */}
                    {galleryData[currentIndex].notes && isMobile && (
                      <AnimatePresence>
                        {showNotes && (
                          <motion.div
                            key="collector-notes-mobile"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                            className="w-full mx-auto mt-2 mb-[6px] border border-gray-300 rounded shadow p-4 text-sm text-gray-800 text-left"
