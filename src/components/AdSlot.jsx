import { useEffect } from 'react';

const AdSlot = () => {
  useEffect(() => {
    const container = document.getElementById('ad-slot');
    if (!container) return;

    // Clear previous scripts if any (to avoid duplicate inserts)
    container.innerHTML = '';

    // Ad #1: Direct script from URL (tracker-style)
    const script1 = document.createElement('script');
    script1.src = 'https://www.profitableratecpm.com/bhtv863quq?key=54798d6c5809f66d5ff99817e8595b91';
    script1.async = true;
    script1.type = 'text/javascript';
    container.appendChild(script1);

    // Ad #2: JS script file (external banner)
    const script2 = document.createElement('script');
    script2.src = 'https://pl27059556.profitableratecpm.com/49/13/17/4913176845b7ad7495287a13b263e654.js';
    script2.async = true;
    script2.type = 'text/javascript';
    container.appendChild(script2);

    // Note: No iframe ad here, since you removed it
  }, []);

  return (
    <div id="ad-slot" style={{ textAlign: 'center', margin: '20px 0' }} />
  );
};

export default AdSlot;
