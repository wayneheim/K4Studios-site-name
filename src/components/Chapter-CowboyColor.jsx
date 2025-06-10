// Full updated ScrollFlipGallery component with fixed reserved height for expandable block

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid } from "lucide-react";
import './ScrollFlipZoomStyles.css';

const galleryData = [
  {
    title: "Chapter 1: The Old Hand",
    story: "Weathered by time, the grit of this cowboy runs deeper than the lines on his face. He's the kind who speaks with a glance and earns respect without asking. Every wrinkle carries a story of storms weathered and trails conquered. In his silence lives a lifetime of Western legend.",
    description: "Painterly Western cowboy portrait by Wayne Heim. A classic scene that echoes a lifetime of hard work and determination, ideal for collectors of Western art prints and rustic wall decor.",
    image: "https://photos.smugmug.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-44jcjTQ/1/XL/Cowboy%20portrait-XL.jpg"
  },
  {
    title: "Chapter 2: Eyes of the Plains",
    story: "He doesn't speak much, but the wind listens. His gaze holds the weight of the land—wide, open, and quietly fierce. There’s a steadiness in him that rivals the mountains and a patience honed by horizon after horizon. He is the West, watching and waiting.",
    description: "Painterly cowboy portrait by Wayne Heim captured in golden hour light. Perfect for Western-themed interior design and rustic wall galleries.",
    image: "https://photos.smugmug.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-fM9qmKW/1/XL/Cowboy%20photography%20_DSF8979-Enhanced-NR-Edit-Edit-XL.jpg"
  },
  {
    title: "Chapter 3: Dust & Grit",
    story: "The trail’s never clean, and neither are his stories. Dust clings to his coat like the memories he can't shake. His boots echo with the sound of campfire tales and rough laughter. There’s grit in his grin, and a lifetime in his shadow.",
    description: "Fine art Western photograph by Wayne Heim. Wind-swept energy and grit in painterly tones. Suitable for collectors of rustic cowboy artwork.",
    image: "https://photos.smugmug.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-PM4d3g3/1/XL/Cowboy%20portrait%203-XL.jpg"
  },
  {
    title: "Chapter 4: Trail Worn",
    story: "He’s walked more miles than a horse can count. His boots know the shape of the land better than most men know their homes. The ache in his bones isn't pain—it’s memory. Time has etched its mark on his shoulders, but the fire still burns behind his eyes.",
    description: "Painterly cowboy portrait with timeless Western style. A soulful addition to your cowboy art print collection.",
    image: "https://photos.smugmug.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-fCG2nm8/1/XL/Cowboy%20portrait%204-XL.jpg"
  },
  {
    title: "Chapter 5: Waiting on the Wind",
    story: "He watches the horizon like it owes him something. There’s a storm in his stillness and a promise in his patience. You can hear the past rustle in his coat and the future whisper through the dust. The West lives in the quiet spaces he occupies.",
    description: "Western cowboy fine art by Wayne Heim. Evocative skies meet solitude in this painterly portrait, perfect for rustic home accents.",
    image: "https://photos.smugmug.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-ML9dbMj/1/XL/Cowboy%20portrait%205-XL.jpg"
  },
  {
    title: "Chapter 6: The Widowmaker’s Wife",
    story: "She’s seen the cost of the West. And she stayed. Her strength doesn’t shout—it simmers. In her eyes is the quiet endurance of someone who’s buried dreams and kept walking. This land is hard, but she’s harder still.",
    description: "Painterly cowgirl portrait by Wayne Heim. A quiet strength rendered in soft brush tones, honoring Western women and the stories they carry.",
    image: "https://photos.smugmug.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-8VPQmkW/1/XL/Cowgirl%20portrait%20wife-XL.jpg"
  },
  {
    title: "Chapter 7: Bitter Water",
    story: "Dust on his boots, fire in his eyes. He’s tasted defeat and spit it out like bad whiskey. There’s a burn in his belly and a blaze in his stare—this man’s story wasn’t written, it was branded. And every scar earned its place.",
    description: "Western art portrait by Wayne Heim. Bold tones and tension fill this dramatic, painterly moment in time.",
    image: "https://photos.smugmug.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-dNgct6r/1/XL/Cowboy%20portrait%206-XL.jpg"
  },
  {
    title: "Chapter 8: Long Shadows",
    story: "When the sun falls low, every cowboy becomes a myth. The light bends, the colors soften, and the stories feel truer somehow. His silhouette could be anyone—and everyone—who’s ever lived for the land and died with the dust. The West remembers.",
    description: "Painterly Western cowboy silhouette art by Wayne Heim. A haunting and elegant addition to your rustic or Americana wall decor.",
    image: "https://photos.smugmug.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-mLPgSpC/1/XL/Cowboy%20portrait%207-XL.jpg"
  }
];

export default function ScrollFlipGallery() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState("flip");
  const [isZoomed, setIsZoomed] = useState(false);
  const [showArrowHint, setShowArrowHint] = useState(false);
  const startX = useRef(null);
  const prevIndex = useRef(currentIndex);

  useEffect(() => {
    if (!localStorage.getItem("scrollFlipIntroSeen")) {
      setShowArrowHint(true);
      setTimeout(() => {
        setShowArrowHint(false);
        localStorage.setItem("scrollFlipIntroSeen", "true");
      }, 3000);
    }
  }, []);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (startX.current !== null) {
      const endX = e.changedTouches[0].clientX;
      const deltaX = endX - startX.current;
      if (deltaX > 50) {
        setCurrentIndex((i) => { setIsExpanded(false); return Math.max(i - 1, 0); });
      } else if (deltaX < -50) {
        setCurrentIndex((i) => { setIsExpanded(false); return Math.min(i + 1, galleryData.length - 1); });
      }
      startX.current = null;
    }
  };

  const direction = currentIndex > prevIndex.current ? 1 : -1;
  prevIndex.current = currentIndex;

  return (
    <div
      className="min-h-screen bg-white text-black font-serif px-5 py-8 overflow-hidden"
      style={{ fontFamily: 'Glegoo, serif' }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Glegoo:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />

      <div className="relative max-w-6xl mx-auto">
        {/* Flip View */}
        {viewMode === "flip" && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: direction > 0 ? 150 : -150 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -150 : 150 }}
              transition={{ duration: 0.6, ease: [0.45, 0, 0.55, 1] }}
              className="grid md:grid-cols-2 gap-6 md:gap-12 items-center"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="flex flex-col items-center w-full">
  <div className="aspect-[4/5] border-2 border-gray-400 rounded-lg flex items-center justify-center text-gray-500 cursor-pointer overflow-hidden relative w-full">
    <img
  src={galleryData[currentIndex].image}
  alt={galleryData[currentIndex].title}
  className="object-cover w-full h-full cursor-zoom-in"
  onClick={() => setIsZoomed(true)}
/>
  </div>

  <div className="flex flex-col items-center justify-center mt-4 pt-4 border-t border-gray-300 space-y-2 w-full">
    <div className="flex items-center gap-4">
  <div className="text-sm text-black font-medium">
    {`Chapter ${currentIndex + 1} – ${galleryData.length}`}
  </div>
  <form
    onSubmit={(e) => {
      e.preventDefault();
      const input = e.target.elements.chapterNum.value;
      const num = parseInt(input, 10);
      if (!isNaN(num) && num >= 1 && num <= galleryData.length) {
        setIsExpanded(false);
        setCurrentIndex(num - 1);
      }
    }}
    className="flex items-center gap-2 text-sm"
  >
    <input
      type="number"
      id="chapterNum"
      name="chapterNum"
      min="1"
      max={galleryData.length}
      placeholder="Jump to #"
      className="w-24 border border-gray-300 rounded px-2 py-1 text-center"
    />
    <button type="submit" className="bg-gray-100 px-2 py-1 rounded shadow hover:bg-gray-200">
      Go
    </button>
  </form>
</div>
    
  </div>
</div>

{isZoomed && (
  <div
    className="fixed inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50"
    onClick={() => setIsZoomed(false)}
  >
    <div className="zoom-mat-container">
      <img
        src={galleryData[currentIndex].image}
        alt={galleryData[currentIndex].title}
        className="max-w-3xl max-h-[85vh] block"
      />
    </div>
  </div>
)}


<div className="w-full md:pl-8">
                <div className="flex justify-center my-4">
                  <div className="flex items-center justify-center gap-3 my-6 text-[#7a6a58]">
                    <div className="h-px w-20 bg-[#7a6a58]" />
                    <div className="w-3 h-3 rotate-45 bg-[#7a6a58]" />
                    <div className="h-px w-20 bg-[#7a6a58]" />
                  </div>
                </div>
                <h2 className="text-xl md:text-3xl mb-2 text-center">{galleryData[currentIndex].title}</h2>
                <p className="italic text-base md:text-lg mb-4 leading-relaxed text-left">{galleryData[currentIndex].story}</p>
                <div className="text-sm text-gray-600 mb-6 text-center group">
                  <button
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-1 no-underline hover:no-underline focus:no-underline"
                  >
                    <span className={`inline-block transform transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                      ▶
                    </span>
                    More about this image
                  </button>
                  <div className="relative min-h-[6rem] mt-4 mx-auto text-left w-10/12 max-w-lg px-4">
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key={`desc-${currentIndex}`}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
                          className="absolute left-0 top-0 w-full text-left"
                        >
                          <p className="pb-2">{galleryData[currentIndex].description}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="flex justify-center my-4">
                  <div className="flex items-center justify-center gap-3 my-6 text-[#7a6a58]">
                    <div className="h-px w-20 bg-[#7a6a58]" />
                    <div className="w-3 h-3 rotate-45 bg-[#7a6a58]" />
                    <div className="h-px w-20 bg-[#7a6a58]" />
                  </div>
                </div>
                <div className="flex justify-center items-center gap-4 pt-4">
                  <button onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))} className="bg-gray-100 px-3 py-1 rounded shadow hover:bg-gray-200">&lt;</button>
                  <button onClick={() => setViewMode("grid")} className="bg-gray-100 p-2 rounded shadow hover:bg-gray-200"><Grid /></button>
                  <button onClick={() => setCurrentIndex((i) => Math.min(i + 1, galleryData.length - 1))} className={`bg-gray-100 px-3 py-1 rounded shadow hover:bg-gray-200 ${showArrowHint ? "animate-pulse text-yellow-500" : "text-black"}`}>&gt;</button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Grid View */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 max-w-6xl mx-auto mt-12">
            {galleryData.map((entry, index) => (
              <div key={index} className="border border-gray-300 rounded p-2 sm:p-3 cursor-pointer hover:shadow-md" onClick={() => { setCurrentIndex(index); setIsExpanded(false); setViewMode("flip"); }}>
                <div className="aspect-[4/5] bg-gray-100 flex items-center justify-center mb-2 sm:mb-3 text-gray-500 overflow-hidden">
                  <img src={entry.image} alt={entry.title} className="object-cover w-full h-full" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold mb-1">{entry.title}</h3>
                <p className="text-xs sm:text-sm italic">{entry.story}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
