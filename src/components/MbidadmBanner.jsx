import React, { useEffect, useRef, useState } from 'react';

const MbidadmBanner = () => {
  const containerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any previous elements inside the container to prevent duplicates
    containerRef.current.innerHTML = '';

    // Create the banner container element
    const adPlaceholder = document.createElement('div');
    adPlaceholder.setAttribute('data-banner-id', '2024253');
    containerRef.current.appendChild(adPlaceholder);

    // Create the script element to initialize/run the ad
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://js.mbidadm.com/static/scripts.js?cb=${Date.now()}`;
    script.setAttribute('data-admpid', '446919');

    // Append script to container to run it in the context of the placeholder
    containerRef.current.appendChild(script);

    // Periodic check to verify if ad content or iframe has loaded inside the placeholder
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (containerRef.current) {
        const iframe = containerRef.current.querySelector('iframe');
        const placeholder = containerRef.current.querySelector('[data-banner-id]');
        const hasContent = placeholder && (placeholder.children.length > 0 || placeholder.innerHTML.trim() !== '');

        if (iframe || hasContent) {
          setLoaded(true);
          clearInterval(interval);
        }
      }

      // Stop checking after 6 seconds (12 attempts)
      if (attempts > 12) {
        clearInterval(interval);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      // Cleanup script and elements when component unmounts
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div 
      className="w-full flex-col items-center justify-center my-6 px-4"
      style={{ display: loaded ? 'flex' : 'none' }}
    >
      {/* Sleek, premium wrapper to hold the ad banner with proper spacing */}
      <div 
        className="relative flex flex-col items-center justify-center p-2 rounded-2xl bg-neutral-900/40 border border-white/5 shadow-2xl transition-all duration-300 hover:border-white/10"
        style={{ minWidth: '320px', minHeight: '110px' }}
      >
        {/* Tiny placeholder/tag indicator */}
        <span className="absolute top-1 right-3 text-[9px] font-semibold tracking-wider text-gray-500/60 uppercase pointer-events-none">
          Advertisement
        </span>
        
        {/* The actual ad container targeted by ref */}
        <div 
          ref={containerRef} 
          className="w-full flex justify-center items-center overflow-hidden rounded-xl"
        />
      </div>
    </div>
  );
};

export default MbidadmBanner;
