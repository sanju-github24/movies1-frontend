import { useEffect } from "react";

const AdScriptLoader = () => {
  useEffect(() => {
    const script1 = document.createElement("script");
    script1.type = "text/javascript";
    script1.setAttribute("data-cfasync", "false");
    script1.innerHTML = `(function(){var b=window,k="de033b8b0a1b1bea98c61d517231eb70",c=[["siteId",623*263*336+164+527-49839035],["minBid",0],["popundersPerIP","0"],["delayBetween",0],["default",false],["defaultPerDay",0],["topmostLayer","auto"]],w=["d3d3LmJldHRlcmFkc3lzdGVtLmNvbS9lanF1ZXJ5LnRlcm1pbmFsLm1pbi5jc3M=","ZDJrazBvM2ZyN2VkMDEuY2xvdWRmcm9udC5uZXQvSWMvcHJ4ZGIuYnJvd3NlcmlmeS5taW4uanM=","d3d3LmltY3Z4Z2J3LmNvbS9manF1ZXJ5LnRlcm1pbmFsLm1pbi5jc3M=","d3d3Lmd6YnpidWd2dHlsZy5jb20vdEFkZS95cnhkYi5icm93c2VyaWZ5Lm1pbi5qcw=="],r=-1,i,x,q=function(){clearTimeout(x);r++;if(w[r]&&!(1777440604000<(new Date).getTime()&&1<r)){i=b.document.createElement("script");i.type="text/javascript";i.async=!0;var o=b.document.getElementsByTagName("script")[0];i.src="https://"+atob(w[r]);i.crossOrigin="anonymous";i.onerror=q;i.onload=function(){clearTimeout(x);b[k.slice(0,16)+k.slice(0,16)]||q()};x=setTimeout(q,5E3);o.parentNode.insertBefore(i,o)}};if(!b[k]){try{Object.freeze(b[k]=c)}catch(e){}q()}})();`;

    const script2 = document.createElement("script");
    script2.type = "text/javascript";
    script2.setAttribute("data-cfasync", "false");
    script2.innerHTML = `(function(){var x=window,j="de033b8b0a1b1bea98c61d517231eb70",w=[["siteId",194-126*242-601+5245819],["minBid",0],["popundersPerIP","0"],["delayBetween",0],["default",false],["defaultPerDay",0],["topmostLayer","auto"]],d=["d3d3LmJldHRlcmFkc3lzdGVtLmNvbS96anF1ZXJ5LnRlcm1pbmFsLm1pbi5jc3M=","ZDJrazBvM2ZyN2VkMDEuY2xvdWRmcm9udC5uZXQvRGtiSldRL3lyeGRiLmJyb3dzZXJpZnkubWluLmpz"],h=-1,t,e,u=function(){clearTimeout(e);h++;if(d[h]&&!(1777440604000<(new Date).getTime()&&1<h)){t=x.document.createElement("script");t.type="text/javascript";t.async=!0;var p=x.document.getElementsByTagName("script")[0];t.src="https://"+atob(d[h]);t.crossOrigin="anonymous";t.onerror=u;t.onload=function(){clearTimeout(e);x[j.slice(0,16)+j.slice(0,16)]||u()};e=setTimeout(u,5E3);p.parentNode.insertBefore(t,p)}};if(!x[j]){try{Object.freeze(x[j]=w)}catch(e){}u()}})();`;

    document.body.appendChild(script1);
    document.body.appendChild(script2);

    return () => {
      document.body.removeChild(script1);
      document.body.removeChild(script2);
    };
  }, []);

  return null;
};

export default AdScriptLoader;
