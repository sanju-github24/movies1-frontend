import { useEffect } from 'react';

const AdPopup = () => {
  useEffect(() => {
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
