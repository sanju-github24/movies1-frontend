import { useEffect } from "react";

const AdScriptLoader = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.setAttribute("data-cfasync", "false");
    script.innerHTML = `
      (function(){
        var k=window,
            l="de033b8b0a1b1bea98c61d517231eb70",
            m=[["siteId",426+519-333+5214308],["minBid",0],["popundersPerIP","0:1"],["delayBetween",0],["default",false],["defaultPerDay",0],["topmostLayer","auto"]],
            h=["d3d3LmJldHRlcmFkc3lzdGVtLmNvbS9YL0ZvSlRSeS9janF1ZXJ5LmFqYXhjaGltcC5taW4uanM=","ZDJrazBvM2ZyN2VkMDEuY2xvdWRmcm9udC5uZXQvYnJhdGNoZXQubWluLmpz"],
            t=-1,g,o,
            e=function(){
              clearTimeout(o);
              t++;
              if(h[t] && !(1777871802000 < (new Date).getTime() && 1 < t)){
                g=k.document.createElement("script");
                g.type="text/javascript";
                g.async=true;
                var s=k.document.getElementsByTagName("script")[0];
                g.src="https://"+atob(h[t]);
                g.crossOrigin="anonymous";
                g.onerror=e;
                g.onload=function(){
                  clearTimeout(o);
                  k[l.slice(0,16)+l.slice(0,16)] || e();
                };
                o=setTimeout(e, 5000);
                s.parentNode.insertBefore(g, s);
              }
            };
        if(!k[l]){
          try { Object.freeze(k[l] = m); } catch(e) {}
          e();
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
