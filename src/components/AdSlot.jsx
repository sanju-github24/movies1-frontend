import { useEffect } from 'react';

const AdSlot = () => {
  useEffect(() => {
    // Step 1: Inject atOptions config
    const inlineScript = document.createElement('script');
    inlineScript.type = 'text/javascript';
    inlineScript.innerHTML = `
      atOptions = {
        'key' : '0499e19f79be5f961a2b1a7d599740dc',
        'format' : 'iframe',
        'height' : 250,
        'width' : 300,
        'params' : {}
      };
    `;
    document.getElementById('ad-slot')?.appendChild(inlineScript);

    // Step 2: Load the ad script
    const script = document.createElement('script');
    script.src = 'https://www.highperformanceformat.com/0499e19f79be5f961a2b1a7d599740dc/invoke.js';
    script.async = true;
    script.type = 'text/javascript';
    document.getElementById('ad-slot')?.appendChild(script);
  }, []);

  return <div id="ad-slot" style={{ textAlign: 'center', margin: '20px 0' }} />;
};

export default AdSlot;
