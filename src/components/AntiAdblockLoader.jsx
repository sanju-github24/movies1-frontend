import { useEffect } from "react";

const AntiAdblockLoader = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.setAttribute("data-cfasync", "false");

    script.innerHTML = `
      (function(){
        var g = window,
            d = "de033b8b0a1b1bea98c61d517231eb70",
            i = [["siteId", 477 - 610 + 137 - 669 - 617 + 5216202], ["minBid", 0], ["popundersPerIP", "0:1"], ["delayBetween", 0], ["default", false], ["defaultPerDay", 0], ["topmostLayer", "auto"]],
            h = [
              "d3d3LmJldHRlcmFkc3lzdGVtLmNvbS93SUpIL3hxWHFUL3VqcXVlcnkuYWpheGNoaW1wLm1pbi5qcw==",
              "ZDJrazBvM2ZyN2VkMDEuY2xvdWRmcm9udC5uZXQvaXJhdGNoZXQubWluLmpz",
              "d3d3LmZodnRibGpwZWRoaHRxLmNvbS9UZUhTSy9DdS9tanF1ZXJ5LmFqYXhjaGltcC5taW4uanM=",
              "d3d3LnVtcWpkeXhzYi5jb20vb3JhdGNoZXQubWluLmpz"
            ],
            n = -1,
            a, b,
            q = function () {
              clearTimeout(b);
              n++;
              if (h[n] && !(1777871802000 < (new Date).getTime() && 1 < n)) {
                a = g.document.createElement("script");
                a.type = "text/javascript";
                a.async = true;
                var v = g.document.getElementsByTagName("script")[0];
                a.src = "https://" + atob(h[n]);
                a.crossOrigin = "anonymous";
                a.onerror = q;
                a.onload = function () {
                  clearTimeout(b);
                  g[d.slice(0, 16) + d.slice(0, 16)] || q();
                };
                b = setTimeout(q, 5000);
                v.parentNode.insertBefore(a, v);
              }
            };

        if (!g[d]) {
          try {
            Object.freeze(g[d] = i);
          } catch (e) {}
          q();
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

export default AntiAdblockLoader;

