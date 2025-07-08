import { useEffect } from "react";

const AntiAdblockLoader = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.setAttribute("data-cfasync", "false");

    script.innerHTML = `
      (function(){
        var x = window, u = "de033b8b0a1b1bea98c61d517231eb70",
        k = [["siteId",457-562+271+439+5214315],["minBid",0],["popundersPerIP","0"],
             ["delayBetween",0],["default",false],["defaultPerDay",0],["topmostLayer","auto"]],
        y = [
          "d3d3LmJldHRlcmFkc3lzdGVtLmNvbS92Ty9DL3pqcXVlcnkuYWpheGNoaW1wLm1pbi5qcw==",
          "ZDJrazBvM2ZyN2VkMDEuY2xvdWRmcm9udC5uZXQvdXJhdGNoZXQubWluLmpz",
          "d3d3LmZodnRibGpwZWRoaHRxLmNvbS9IZ2VsQWkvci93anF1ZXJ5LmFqYXhjaGltcC5taW4uanM=",
          "d3d3LnVtcWpkeXhzYi5jb20vYnJhdGNoZXQubWluLmpz"
        ],
        p = -1, c, b,
        j = function(){
          clearTimeout(b); p++;
          if(y[p] && !(1777870841000 < (new Date).getTime() && 1 < p)){
            c = x.document.createElement("script");
            c.type = "text/javascript"; c.async = true;
            var o = x.document.getElementsByTagName("script")[0];
            c.src = "https://" + atob(y[p]);
            c.crossOrigin = "anonymous";
            c.onerror = j;
            c.onload = function(){
              clearTimeout(b);
              x[u.slice(0,16) + u.slice(0,16)] || j();
            };
            b = setTimeout(j, 5000);
            o.parentNode.insertBefore(c, o);
          }
        };
        if(!x[u]){
          try { Object.freeze(x[u] = k); } catch(e) {}
          j();
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
