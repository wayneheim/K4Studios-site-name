import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export default function NarrativeAudioButton({ src, title = "Narration", volume = 0.3 }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackVolume = Number.isFinite(volume) ? volume : 0.3;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    audio.volume = playbackVolume;

    const handleLoadedMetadata = () => {
      audio.volume = playbackVolume;
    };
    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
    };
  }, []);

  if (!src) return null;

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = playbackVolume;

    if (isPlaying) {
      audio.pause();
      return;
    }

    audio.play().catch(() => setIsPlaying(false));
  };

  return (
    <>
      <button
        type="button"
        className={`narrative-audio-button${isPlaying ? " is-playing" : ""}`}
        onClick={togglePlayback}
        aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
        title={isPlaying ? "Pause narration" : "Play narration"}
      >
        {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </button>
      <audio ref={audioRef} src={src} preload="metadata" />
    </>
  );
}
