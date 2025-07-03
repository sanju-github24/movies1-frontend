// components/PopAdsScript.jsx
import { useEffect } from 'react';

const PopAdsScript = () => {
  useEffect(() => {
    fetch('/api/popads-script')
      .then(res => res.text())
      .then(jsCode => {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.setAttribute('data-cfasync', 'false');
        script.innerHTML = jsCode;
        document.body.appendChild(script);
      })
      .catch(err => {
        console.error('Failed to inject PopAds script:', err.message);
      });
  }, []);

  return null;
};

export default PopAdsScript;
