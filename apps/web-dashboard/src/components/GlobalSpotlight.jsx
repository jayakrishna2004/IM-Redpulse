import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const DEFAULT_RADIUS = 350;
const DEFAULT_COLOR = '255, 26, 60'; // RedPulse Red

export default function GlobalSpotlight({ 
  radius = DEFAULT_RADIUS, 
  color = DEFAULT_COLOR,
  enabled = true 
}) {
  const spotlightRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    // Create the spotlight DOM element
    const spotlight = document.createElement('div');
    spotlight.className = 'global-system-spotlight';
    spotlight.style.cssText = `
      position: fixed;
      width: ${radius * 2.5}px;
      height: ${radius * 2.5}px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${color}, 0.12) 0%,
        rgba(${color}, 0.06) 15%,
        rgba(${color}, 0.03) 25%,
        rgba(${color}, 0.01) 40%,
        transparent 70%
      );
      z-index: 9999;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: plus-lighter;
      will-change: transform, opacity;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const handleMouseMove = (e) => {
      if (!spotlightRef.current) return;

      // Update spotlight position
      gsap.to(spotlightRef.current, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.15,
        ease: 'power2.out',
        opacity: 1
      });

      // Find all cards with spotlight interaction enabled
      const cards = document.querySelectorAll('.spotlight-card');
      
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate distance from mouse to card center
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        const dist = Math.hypot(mouseX - centerX, mouseY - centerY);
        const maxDist = Math.max(rect.width, rect.height) * 1.5;
        
        if (dist < maxDist + radius) {
          // Calculate relative position within the card for the glow effect
          const relX = ((mouseX - rect.left) / rect.width) * 100;
          const relY = ((mouseY - rect.top) / rect.height) * 100;
          
          // Calculate intensity based on distance
          const intensity = Math.max(0, 1 - (dist / (maxDist + radius)));
          
          card.style.setProperty('--glow-x', `${relX}%`);
          card.style.setProperty('--glow-y', `${relY}%`);
          card.style.setProperty('--glow-intensity', intensity.toFixed(2));
          card.style.setProperty('--glow-radius', `${radius}px`);
          card.style.setProperty('--glow-color', color);
        } else {
          card.style.setProperty('--glow-intensity', '0');
        }
      });
    };

    const handleMouseLeave = () => {
      if (spotlightRef.current) {
        gsap.to(spotlightRef.current, { opacity: 0, duration: 0.5 });
      }
      document.querySelectorAll('.spotlight-card').forEach(card => {
        card.style.setProperty('--glow-intensity', '0');
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      spotlight.remove();
    };
  }, [radius, color, enabled]);

  return null;
}
