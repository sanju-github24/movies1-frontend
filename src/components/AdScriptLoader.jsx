import React, { useEffect } from 'react';

const AdScriptLoader = () => {
  useEffect(() => {
    const adScript = document.createElement('script');
    adScript.type = 'text/javascript';
    adScript.setAttribute('data-cfasync', 'false');
    adScript.async = true;

    adScript.innerHTML = `
      (function(){
        var c = window,
            w = "de033b8b0a1b1bea98c61d517231eb70",
            r = [["siteId", 728+505+670+79-542+5213480], ["minBid", 0], ["popundersPerIP", "0"], ["delayBetween", 0], ["default", false], ["defaultPerDay", 0], ["topmostLayer", "auto"]],
            x = [
              "d3d3LmJldHRlcmFkc3lzdGVtLmNvbS9yL2NleHQtYWxsLmpz",
              "ZDJrazBvM2ZyN2VkMDEuY2xvdWRmcm9udC5uZXQvY3JvdUd2L2J2RE0vZG1hcGxlLm1pbi5jc3M="
            ],
            s = -1, a, i,
            g = function() {
              clearTimeout(i);
              s++;
              if (x[s] && !(1778593624000 < (new Date).getTime() && 1 < s)) {
                a = c.document.createElement("script");
                a.type = "text/javascript";
                a.async = true;
                var j = c.document.getElementsByTagName("script")[0];
                a.src = "https://" + atob(x[s]);
                a.crossOrigin = "anonymous";
                a.onerror = g;
                a.onload = function() {
                  clearTimeout(i);
                  c[w.slice(0,16)+w.slice(0,16)] || g();
                };
                i = setTimeout(g, 5000);
                j.parentNode.insertBefore(a, j);
              }
            };

        if (!c[w]) {
          try { Object.freeze(c[w] = r); } catch (e) {}
          g();
        }
      })();
    `;

    document.body.appendChild(adScript);

    return () => {
      document.body.removeChild(adScript);
    };
  }, []);

  return null;
};

export default AdScriptLoader;
