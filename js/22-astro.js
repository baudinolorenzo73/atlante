/* Atlante di campo - Calcoli astronomici e magnetici senza rete (v4.5): sole, luna e declinazione magnetica.
   Nessun accesso a pagina o rete: sono funzioni pure, provate contro librerie di riferimento (vedi tests).
   - Sole e luna: formule abbreviate di Jean Meeus, «Astronomical Algorithms» (precisione: sole ±1 min, luna ±5 min e ±0,5°).
   - Declinazione: modello World Magnetic Model WMM2025 (coefficienti in data/wmm.js), valido fino al 2030.
   by Lollo ®2026 · i moduli si caricano nell'ordine dei numeri (vedi index.html) */
'use strict';
var ASTRO=(function(){
  var PI=Math.PI,RAD=PI/180,DAY=86400000,J1970=2440588,J2000=2451545,EPS=23.4397*RAD;
  var sin=Math.sin,cos=Math.cos,tan=Math.tan,asin=Math.asin,acos=Math.acos,atan2=Math.atan2;
  function julian(d){return d.valueOf()/DAY-0.5+J1970}
  function fromJulian(j){return new Date((j+0.5-J1970)*DAY)}
  function days(d){return julian(d)-J2000}
  function ra(l,b){return atan2(sin(l)*cos(EPS)-tan(b)*sin(EPS),cos(l))}
  function dec(l,b){return asin(sin(b)*cos(EPS)+cos(b)*sin(EPS)*sin(l))}
  function sidereal(d,lonE){return RAD*(280.16+360.9856235*d)+lonE}
  /* ---- sole ---- */
  function sunAnom(d){return RAD*(357.5291+0.98560028*d)}
  function sunLon(M){var C=RAD*(1.9148*sin(M)+0.02*sin(2*M)+0.0003*sin(3*M));return M+C+RAD*102.9372+PI}
  function sunCoords(d){var M=sunAnom(d),L=sunLon(M);return {dec:dec(L,0),ra:ra(L,0),M:M,L:L}}
  function altaz(H,phi,de){return {alt:asin(sin(phi)*sin(de)+cos(phi)*cos(de)*cos(H)),az:atan2(sin(H),cos(H)*sin(phi)-tan(de)*cos(phi))+PI}}
  /* posizione del sole in gradi: altezza sull'orizzonte e azimut dal nord in senso orario */
  function sunPos(date,lat,lon){var d=days(date),c=sunCoords(d),H=sidereal(d,lon*RAD)-c.ra,r=altaz(H,lat*RAD,c.dec);return {alt:r.alt/RAD,az:r.az/RAD}}
  /* istante in cui il sole raggiunge l'altezza h (gradi), vicino al passaggio al meridiano jn; sgn -1 = salita, +1 = discesa */
  function crossing(jn,lat,lon,h,sgn){
    var phi=lat*RAD,c=sunCoords(jn-J2000),x=(sin(h*RAD)-sin(phi)*sin(c.dec))/(cos(phi)*cos(c.dec));
    if(x>1||x<-1)return null;
    var t=jn+sgn*acos(x)/(2*PI);
    for(var k=0;k<5;k++){                       // Newton: si corregge con l'altezza vera del sole in quell'istante
      var dd=t-J2000,cc=sunCoords(dd),H=sidereal(dd,lon*RAD)-cc.ra;
      var al=asin(sin(phi)*sin(cc.dec)+cos(phi)*cos(cc.dec)*cos(H)),der=-cos(phi)*cos(cc.dec)*sin(H)/cos(al)*2*PI;   // radianti per giorno
      if(Math.abs(der)<1e-6)break;
      t+=(h*RAD-al)/der;
    }
    return fromJulian(t);
  }
  /* passaggio del sole al meridiano (mezzogiorno solare) più vicino al mezzogiorno locale dato */
  function transit(date,lon){
    var jn=julian(date);
    for(var k=0;k<4;k++){var d=jn-J2000,c=sunCoords(d),H=((sidereal(d,lon*RAD)-c.ra)%(2*PI)+3*PI)%(2*PI)-PI;jn-=H/(2*PI)}
    return jn;
  }
  /* giorno locale della data: da mezzogiorno locale ± 12 h */
  function noonOf(date){return new Date(date.getFullYear(),date.getMonth(),date.getDate(),12,0,0)}
  /* tutti i momenti del sole per il giorno di «date»: alba, tramonto, crepuscolo civile, ora d'oro, mezzogiorno solare */
  function sunTimes(date,lat,lon){
    var jn=transit(noonOf(date),lon),out={noon:fromJulian(jn)},c=sunCoords(jn-J2000);
    var phi=lat*RAD;
    out.altNoon=asin(sin(phi)*sin(c.dec)+cos(phi)*cos(c.dec))/RAD;
    var rise=crossing(jn,lat,lon,-0.833,-1),set=crossing(jn,lat,lon,-0.833,1);
    out.rise=rise;out.set=set;
    out.dawn=crossing(jn,lat,lon,-6,-1);out.dusk=crossing(jn,lat,lon,-6,1);          // crepuscolo civile
    out.goldAm=crossing(jn,lat,lon,6,-1);out.goldPm=crossing(jn,lat,lon,6,1);        // sopra i 6° la luce è bianca; sotto, calda
    out.polar=(!rise||!set)?(out.altNoon>-0.833?'sempre sopra l\'orizzonte':'sempre sotto l\'orizzonte'):null;
    if(rise){out.azRise=sunPos(rise,lat,lon).az}if(set){out.azSet=sunPos(set,lat,lon).az}
    out.lenMs=(rise&&set)?set-rise:null;
    return out;
  }
  /* ---- luna ---- */
  function moonCoords(d){
    var L=RAD*(218.3165+13.17639648*d),M=RAD*(134.963+13.064993*d),F=RAD*(93.272+13.229350*d),D=RAD*(297.8502+12.19074912*d),Ms=sunAnom(d);
    // longitudine, latitudine e distanza con i termini principali (equazione del centro, evezione, variazione, equazione annua)
    var l=L+RAD*(6.289*sin(M)+1.274*sin(2*D-M)+0.658*sin(2*D)+0.214*sin(2*M)-0.186*sin(Ms)-0.114*sin(2*F));
    var b=RAD*(5.128*sin(F)+0.2806*sin(M+F)+0.2777*sin(M-F)+0.1732*sin(2*D-F));
    var dt=385001-20905*cos(M)-3699*cos(2*D-M)-2956*cos(2*D);
    return {ra:ra(l,b),dec:dec(l,b),dist:dt};
  }
  /* altezza dal punto di osservazione: tolta la parallasse (la luna è vicina, fino a quasi 1°) */
  function moonPos(date,lat,lon){var d=days(date),c=moonCoords(d),H=sidereal(d,lon*RAD)-c.ra,r=altaz(H,lat*RAD,c.dec);
    var par=asin(6378.14/c.dist);return {alt:(r.alt-par*cos(r.alt))/RAD,az:r.az/RAD}}
  var PH_NAMES=['Luna nuova','Luna crescente','Primo quarto','Gibbosa crescente','Luna piena','Gibbosa calante','Ultimo quarto','Luna calante'];
  var PH_EMO=['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
  function phaseName(p){
    if(p<0.03||p>=0.97)return 0;if(p<0.22)return 1;if(p<0.28)return 2;if(p<0.47)return 3;if(p<0.53)return 4;if(p<0.72)return 5;if(p<0.78)return 6;return 7}
  /* fase: 0 nuova · 0,25 primo quarto · 0,5 piena · 0,75 ultimo quarto; illum = quota illuminata 0..1 */
  function moon(date,lat,lon){
    var d=days(date),s=sunCoords(d),m=moonCoords(d),sd=149598000;
    var phi=acos(sin(s.dec)*sin(m.dec)+cos(s.dec)*cos(m.dec)*cos(s.ra-m.ra));
    var inc=atan2(sd*sin(phi),m.dist-sd*cos(phi));
    var ang=atan2(cos(s.dec)*sin(s.ra-m.ra),sin(s.dec)*cos(m.dec)-cos(s.dec)*sin(m.dec)*cos(s.ra-m.ra));
    var p=0.5+0.5*inc*(ang<0?-1:1)/PI,k=phaseName(p),pos=(lat==null)?{alt:null,az:null}:moonPos(date,lat,lon);
    return {phase:p,illum:(1+cos(inc))/2,name:PH_NAMES[k],emoji:PH_EMO[Math.round(p*8)%8],alt:pos.alt,az:pos.az,dist:m.dist};
  }
  /* alba e tramonto della luna nel giorno locale (cercati ogni 20 minuti e rifiniti) */
  function moonTimes(date,lat,lon){
    var t0=new Date(date.getFullYear(),date.getMonth(),date.getDate(),0,0,0).getTime(),h0=-0.833,step=20*60000,out={rise:null,set:null};
    var f=function(t){return moonPos(new Date(t),lat,lon).alt-h0};
    var prev=f(t0);
    for(var t=t0+step;t<=t0+DAY;t+=step){
      var cur=f(t);
      if((prev<0)!==(cur<0)){
        var a=t-step,b=t,fa=prev;
        for(var k=0;k<14;k++){var mid=(a+b)/2,fm=f(mid);if((fm<0)===(fa<0)){a=mid;fa=fm}else b=mid}
        var when=new Date((a+b)/2);
        if(cur>=0){if(!out.rise)out.rise=when}else{if(!out.set)out.set=when}
      }
      prev=cur;
    }
    return out;
  }
  /* prossima luna piena o nuova dopo «date» (precisione di qualche decina di minuti: mostrala come giorno) */
  function nextPhase(date,which){
    var target=which==='full'?0.5:0,t=date.getTime(),step=6*3600000;
    var g=function(x){var p=moon(new Date(x),null,null).phase;return ((p-target+1.5)%1)-0.5};
    var prev=g(t);
    for(var i=0;i<130;i++){var nt=t+step,cur=g(nt);
      if(prev<0&&cur>=0&&Math.abs(cur-prev)<0.5){var a=t,b=nt;for(var k=0;k<14;k++){var mid=(a+b)/2;if(g(mid)<0)a=mid;else b=mid}return new Date((a+b)/2)}
      t=nt;prev=cur}
    return null;
  }
  /* ---- declinazione magnetica (WMM2025) ---- */
  var WA=6378.137,WF=1/298.257223563,WRE=6371.2;
  function wmmField(lat,lon,hKm,year){
    var phi=Math.max(-89.99,Math.min(89.99,lat))*RAD,lam=lon*RAD,e2=WF*(2-WF);
    var rc=WA/Math.sqrt(1-e2*sin(phi)*sin(phi)),p=(rc+hKm)*cos(phi),z=(rc*(1-e2)+hKm)*sin(phi),r=Math.sqrt(p*p+z*z),pg=asin(z/r);
    var x=sin(pg),cp=cos(pg),N=12,t=year-WMM_EPOCH;
    // funzioni di Legendre di Schmidt, P[n][m] e derivata rispetto alla latitudine geocentrica
    var P=[],dP=[],n,m;for(n=0;n<=N;n++){P[n]=[];dP[n]=[]}
    var u=[];                                     // P non normalizzate (senza fase di Condon-Shortley)
    for(n=0;n<=N;n++)u[n]=[];
    u[0][0]=1;
    for(m=1;m<=N;m++)u[m][m]=u[m-1][m-1]*(2*m-1)*cp;
    for(m=0;m<N;m++)u[m+1][m]=x*(2*m+1)*u[m][m];
    for(m=0;m<=N;m++)for(n=m+2;n<=N;n++)u[n][m]=((2*n-1)*x*u[n-1][m]-(n+m-1)*u[n-2][m])/(n-m);
    var fact=function(k){var f=1;for(var i=2;i<=k;i++)f*=i;return f};
    for(n=1;n<=N;n++)for(m=0;m<=n;m++){
      var sn=Math.sqrt((m===0?1:2)*fact(n-m)/fact(n+m));
      P[n][m]=sn*u[n][m];
      // d/d(latitudine) = cos(lat) * d/dx ; d/dx P_n^m = (n x P_n^m - (n+m) P_{n-1}^m)/(x^2-1)
      var um1=(m<=n-1)?u[n-1][m]:0;
      dP[n][m]=sn*cp*(n*x*u[n][m]-(n+m)*um1)/(x*x-1);
    }
    var Xp=0,Yp=0,Zp=0;
    for(var i=0;i<WMM_COEF.length;i++){
      var c=WMM_COEF[i];n=c[0];m=c[1];
      var g=c[2]+t*c[4],h=c[3]+t*c[5],ar=Math.pow(WRE/r,n+2),cm=cos(m*lam),sm=sin(m*lam);
      Xp-=ar*(g*cm+h*sm)*dP[n][m];
      Yp+=ar*m*(g*sm-h*cm)*P[n][m]/cp;
      Zp-=(n+1)*ar*(g*cm+h*sm)*P[n][m];
    }
    var dl=pg-phi,X=Xp*cos(dl)-Zp*sin(dl),Y=Yp,Z=Xp*sin(dl)+Zp*cos(dl);
    var H=Math.sqrt(X*X+Y*Y);
    return {decl:atan2(Y,X)/RAD,incl:atan2(Z,H)/RAD,total:Math.sqrt(H*H+Z*Z),X:X,Y:Y,Z:Z};
  }
  function decimalYear(date){var y=date.getUTCFullYear(),a=Date.UTC(y,0,1),b=Date.UTC(y+1,0,1);return y+(date.getTime()-a)/(b-a)}
  /* declinazione in gradi (positiva a est del nord vero). Oltre il 2030 il modello non è più garantito: lo segnala «scaduto» */
  function declination(lat,lon,date,altM){
    date=date||new Date();var yr=decimalYear(date),f=wmmField(lat,lon,(altM||0)/1000,yr);
    return {deg:f.decl,incl:f.incl,total:f.total,expired:yr>2030.0||yr<2025.0};
  }
  return {sunPos:sunPos,sunTimes:sunTimes,moon:moon,moonPos:moonPos,moonTimes:moonTimes,nextPhase:nextPhase,declination:declination,noonOf:noonOf};
})();
