import React from "react";

export default function GalleryInfo() {
  return (
    <>
<style>{`
  body {
    font-family: 'Glegoo', serif;
  }

.intro-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: nowrap;           /* <— prevent stacking */
  max-width: 1000px;
  margin: 2rem auto 3rem;
  padding-left: 185px;
  padding-right: 1rem;
  position: relative;
}

  .intro-text {
  flex: 1;
  margin-right: 2rem;
}

  .intro-text h2 {
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
  }

  .intro-text h3 {
    font-size: 1rem;
    color: #777;
    margin-top: 0;
    margin-bottom: 0.75rem;
  }

  .intro-text p {
    font-size: 0.95rem;
    line-height: 1.5;
    margin-bottom: 0.75rem;
  }

  .intro-text a {
    font-weight: bold;
    font-size: 0.85rem;
    color: #5a5a5a;
  }

  .intro-text details {
    font-size: 0.9rem;
    transition: all 0.3s ease;
  }

  .intro-text summary {
    list-style: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: bold;
    color: #5a5a5a;
  }

  .intro-text summary span {
    display: inline-block;
    transition: transform 0.4s ease;
    font-size: 0.7rem;
  }

  .intro-text details[open] summary span {
    transform: rotate(90deg);
  }

  .intro-text details p {
    margin-top: 0.5rem;
    font-size: 0.95rem;
    line-height: 1.5;
    animation: fadeSlideDown 0.6s ease forwards;
  }

  @keyframes fadeSlideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

 .intro-image {
  flex-shrink: 0;
  width: 220px;
  text-align: center;
}

 .intro-image img {
  display: block;
  max-width: 100%;
  width: 200px;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border: 3px solid #ffffff;
  box-shadow: 0 0 0 3px #aaa9a7;
  border-radius: 3px;
}

  .intro-image figcaption {
    font-size: 0.8rem;
    color: #555;
    margin-top: 0.4rem;
  }

  .explore-section {
    text-align: center;
    font-size: 1.75rem;
    font-weight: bold;
    margin-bottom: 2rem;
  }

  .divider {
    width: 200px;
    margin: 1rem auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #888;
  }

  .divider span {
    font-size: 2.2rem;
    transition: text-shadow 0.3s ease;
  }

  .explore-section:hover .divider span {
    color: #000;
    text-shadow:
      0 0 8px rgba(255, 100, 0, 0.8),
      0 0 14px rgba(255, 100, 0, 0.7),
      0 0 22px rgba(255, 100, 0, 0.6);
  }

  .explore-section:hover > span {
    animation: arrowGlow 1.4s ease-in-out infinite;
  }

  @keyframes arrowGlow {
    0% {
      text-shadow: 0 0 2px rgba(255, 100, 0, 0.8);
    }
    50% {
      text-shadow: 0 0 10px rgba(255, 100, 0, 0.7);
    }
    100% {
      text-shadow: 0 0 2px rgba(255, 100, 0, 0.6);
    }
  }
    @media (max-width: 900px) {
  .intro-wrapper {
    flex-direction: column;
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .intro-image {
    align-self: center;
  }
}
`}</style>

<section className="intro-wrapper">
  <div className="intro-text">
    <h2>Cowboy Art Prints by Wayne Heim - Authentic Western Fine Art Photography in Color</h2>
    <h3>Capturing the Spirit of the American West</h3>
    <p>Discover a painterly take on cowboy photography that brings the color and grit of the frontier to life. Wayne Heim's Western art prints are more than portraits — they are vivid stories etched in sun, shadow, and dust.</p>
    <details>
      <summary>
        <span className="arrow-icon">▶</span> More…
      </summary>
     <p style={{ marginTop: "0.5rem", fontSize: "0.95rem", lineHeight: "1.5" }}>
        These black and white and color cowboy photographs are captured with the soul of the American West in mind - no studio backdrops, no Hollywood tropes. Just real cowboys, historic reenactors, and the spirit of wide-open spaces. Printed using painterly techniques, these works blend the realism of photography with the brushlike textures of illustration.
      </p>
    </details>
  </div>
  <div className="intro-image">
    <figure>
      <img src="https://photos.smugmug.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-44jcjTQ/3/MgTD8rSCgsDJVpFJp8MMrqrC5fFZGT7qHBHjvjbGR/XL/cowboy%20art%20_O1H0384-Edit-2-Edit-2-Edit-2-XL.jpg" alt="Portrait preview" />
      <figcaption>"The Old Hand"</figcaption>
    </figure>
  </div>
</section>

<div className="explore-section explore-button" role="button" tabIndex="0">
  Explore the Gallery <span style={{ fontSize: "1.8rem", verticalAlign: "middle" }}>→</span>
  <div className="divider"><span style={{ fontSize: "1.5rem" }}>{'◆'}</span></div>
</div>
    </>
  );
}