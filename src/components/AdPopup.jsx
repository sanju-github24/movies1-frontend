import { useEffect, useState } from 'react';

const AdPopup = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = document.getElementById('popup-ad');
    if (!container) return;

    // Inject atOptions config
    const configScript = document.createElement('script');
    configScript.type = 'text/javascript';
    configScript.innerHTML = `
      atOptions = {
        'key': '85fe82714eca5a16a481b62abd45f8bf',
        'format': 'iframe',
        'height': 50,
        'width': 320,
        'params': {}
      };
    `;
    container.appendChild(configScript);

    // Inject ad script
    const adScript = document.createElement('script');
    adScript.type = 'text/javascript';
    adScript.src = 'https://www.highperformanceformat.com/85fe82714eca5a16a481b62abd45f8bf/invoke.js';
    adScript.async = true;
    container.appendChild(adScript);

    // Show popup when iframe loads
    const interval = setInterval(() => {
      const iframe = container.querySelector('iframe');
      if (iframe) {
        setVisible(true);
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '320px',
        height: '50px',
        backgroundColor: '#fff',
        zIndex: 9999,
        borderRadius: '8px',
        boxShadow: '0 0 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div id="popup-ad" style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default AdPopup;
