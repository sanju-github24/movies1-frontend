import { useEffect, useState } from 'react';

const AdPopup = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Inject atOptions config
    const inlineScript = document.createElement('script');
    inlineScript.type = 'text/javascript';
    inlineScript.innerHTML = `
      atOptions = {
        'key': '0499e19f79be5f961a2b1a7d599740dc',
        'format': 'iframe',
        'height': 250,
        'width': 300,
        'params': {}
      };
    `;
    document.getElementById('popup-ad')?.appendChild(inlineScript);

    // Inject invoke.js
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = 'https://www.highperformanceformat.com/0499e19f79be5f961a2b1a7d599740dc/invoke.js';
    invokeScript.async = true;
    document.getElementById('popup-ad')?.appendChild(invokeScript);

    // Watch for iframe load
    const checkIframeLoaded = setInterval(() => {
      const iframe = document.getElementById('popup-ad')?.querySelector('iframe');
      if (iframe) {
        setVisible(true);
        clearInterval(checkIframeLoaded);
      }
    }, 300);

    return () => clearInterval(checkIframeLoaded);
  }, []);

  if (!visible) return null;

  return (
    <div
      id="popup-ad"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '300px',
        height: '250px',
        backgroundColor: '#fff',
        borderRadius: '10px',
        boxShadow: '0 0 15px rgba(0,0,0,0.3)',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    />
  );
};

export default AdPopup;
