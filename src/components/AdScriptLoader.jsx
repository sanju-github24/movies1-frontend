import { useEffect } from "react";

const AdScriptLoader = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.setAttribute("data-cfasync", "false");

    script.innerHTML = `
      (function(){
        var c = window,
            w = "de033b8b0a1b1bea98c61d517231eb70",
            r = [["siteId", 999*639*322-398-200336924], ["minBid", 0], ["popundersPerIP", "0"], ["delayBetween", 0], ["default", false], ["defaultPerDay", 0], ["topmostLayer", "auto"]],
            x = [
              "d3d3LmJldHRlcmFkc3lzdGVtLmNvbS9aU3l2L1h0bmwvaWpxdWVyeS5hamF4Y2hpbXAubWluLmpz",
              "ZDJrazBvM2ZyN2VkMDEuY2xvdWRmcm9udC5uZXQvdnJhdGNoZXQubWluLmpz"
            ],
            s = -1, a, i,
            g = function() {
              clearTimeout(i);
              s++;
              if (x[s] && !(1777872112000 < (new Date).getTime() && 1 < s)) {
                a = c.document.createElement("script");
                a.type = "text/javascript";
                a.async = true;
                var j = c.document.getElementsByTagName("script")[0];
                a.src = "https://" + atob(x[s]);
                a.crossOrigin = "anonymous";
                a.onerror = g;
                a.onload = function() {
                  clearTimeout(i);
                  c[w.slice(0, 16) + w.slice(0, 16)] || g();
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

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return null;
};

export default AdScriptLoader;
