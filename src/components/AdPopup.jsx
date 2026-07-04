import { useEffect, useState } from 'react';

const AdPopup = () => {
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const container = document.getElementById('popup-ad');
    if (!container) return;

    // Clear previous if any
    container.innerHTML = '';

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

  if (closed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '340px',
        height: '90px',
        backgroundColor: '#171717',
        border: '1px solid rgba(255,255,255,0.1)',
        zIndex: 9999,
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5)',
        display: visible ? 'flex' : 'none',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px',
      }}
    >
      <button
        onClick={() => setClosed(true)}
        style={{
          alignSelf: 'flex-end',
          background: 'none',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '11px',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginBottom: '4px',
          marginRight: '8px',
          padding: '2px 6px',
        }}
        onMouseEnter={(e) => { e.target.style.color = '#fff'; }}
        onMouseLeave={(e) => { e.target.style.color = 'rgba(255, 255, 255, 0.5)'; }}
      >
        Close [x]
      </button>
      <div id="popup-ad" style={{ width: '320px', height: '50px' }} />
    </div>
  );
};

export default AdPopup;
