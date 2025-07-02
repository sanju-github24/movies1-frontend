import { useEffect } from 'react';

const AdSlot = () => {
  useEffect(() => {
    const adScripts = [
      "https://www.profitableratecpm.com/bhtv863quq?key=54798d6c5809f66d5ff99817e8595b91",
      "//pl27059556.profitableratecpm.com/49/13/17/4913176845b7ad7495287a13b263e654.js"
    ];

    adScripts.forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.type = "text/javascript";
      document.getElementById('ad-slot')?.appendChild(script);
    });
  }, []);

  return (
    <div id="ad-slot" style={{ textAlign: 'center', margin: '20px 0' }} />
  );
};

export default AdSlot;
