import { useEffect } from 'react';

const AdSlot = () => {
  useEffect(() => {
    const container = document.getElementById('ad-slot');
    if (!container) return;

    // Ad #1: Direct script from URL
    const script1 = document.createElement('script');
    script1.src = 'https://www.profitableratecpm.com/bhtv863quq?key=54798d6c5809f66d5ff99817e8595b91';
    script1.async = true;
    script1.type = 'text/javascript';
    container.appendChild(script1);

    // Ad #2: External JS script tag
    const script2 = document.createElement('script');
    script2.src = 'https://pl27059556.profitableratecpm.com/49/13/17/4913176845b7ad7495287a13b263e654.js';
    script2.async = true;
    script2.type = 'text/javascript';
    container.appendChild(script2);

    // Ad #3: iframe ad (atOptions + invoke.js)
    const atOptionsScript = document.createElement('script');
    atOptionsScript.type = 'text/javascript';
    atOptionsScript.innerHTML = `
      atOptions = {
        'key': '0499e19f79be5f961a2b1a7d599740dc',
        'format': 'iframe',
        'height': 250,
        'width': 300,
        'params': {}
      };
    `;
    container.appendChild(atOptionsScript);

    const invokeScript = document.createElement('script');
    invokeScript.src = 'https://www.highperformanceformat.com/0499e19f79be5f961a2b1a7d599740dc/invoke.js';
    invokeScript.async = true;
    invokeScript.type = 'text/javascript';
    container.appendChild(invokeScript);
  }, []);

  return (
    <div id="ad-slot" style={{ textAlign: 'center', margin: '20px 0' }} />
  );
};

export default AdSlot;

