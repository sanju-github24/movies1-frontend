import { useEffect } from 'react';

const AdPopup = () => {
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

    // Load invoke.js
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = 'https://www.highperformanceformat.com/0499e19f79be5f961a2b1a7d599740dc/invoke.js';
    invokeScript.async = true;
    document.getElementById('popup-ad')?.appendChild(invokeScript);
  }, []);

  return (
    <div
      id="popup-ad"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '300px',
        height: '250px',
        zIndex: 9999,
        backgroundColor: '#fff',
        boxShadow: '0 0 10px rgba(0,0,0,0.3)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  );
};

export default AdPopup;

