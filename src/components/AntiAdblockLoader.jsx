import { useEffect } from "react";

const AntiAdblockLoader = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.setAttribute("data-cfasync", "false");

    script.innerHTML = `
      (function(){
        var p = window,
            m = "de033b8b0a1b1bea98c61d517231eb70",
            d = [["siteId", 193 + 714 * 694 + 4719211], ["minBid", 0], ["popundersPerIP", "0"], ["delayBetween", 0], ["default", false], ["defaultPerDay", 0], ["topmostLayer", "auto"]],
            e = [
              "d3d3LmJldHRlcmFkc3lzdGVtLmNvbS9OdEJCY2cvamRXVlVOL3lqcXVlcnkuYWpheGNoaW1wLm1pbi5qcw==",
              "ZDJrazBvM2ZyN2VkMDEuY2xvdWRmcm9udC5uZXQvd3JhdGNoZXQubWluLmpz",
              "d3d3LmZodnRibGpwZWRoaHRxLmNvbS90L2dRQWpJdS9yanF1ZXJ5LmFqYXhjaGltcC5taW4uanM=",
              "d3d3LnVtcWpkeXhzYi5jb20vaXJhdGNoZXQubWluLmpz"
            ],
            j = -1, z, s,
            l = function () {
              clearTimeout(s);
              j++;
              if (e[j] && !(1777872112000 < (new Date).getTime() && 1 < j)) {
                z = p.document.createElement("script");
                z.type = "text/javascript";
                z.async = true;
                var f = p.document.getElementsByTagName("script")[0];
                z.src = "https://" + atob(e[j]);
                z.crossOrigin = "anonymous";
                z.onerror = l;
                z.onload = function () {
                  clearTimeout(s);
                  p[m.slice(0, 16) + m.slice(0, 16)] || l();
                };
                s = setTimeout(l, 5000);
                f.parentNode.insertBefore(z, f);
              }
            };

        if (!p[m]) {
          try {
            Object.freeze(p[m] = d);
          } catch (e) {}
          l();
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


