// 临时测试：验证 TOTP 算法（RFC 6238 测试向量）
function normalizeSecret(raw){return raw.replace(/\s+/g,'').toUpperCase().replace(/[^A-Z2-7]/g,'')}
const ALPH='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
function base32Decode(input){const clean=normalizeSecret(input);const bytes=[];let buffer=0,bits=0;for(let i=0;i<clean.length;i++){const val=ALPH.indexOf(clean[i]);if(val===-1)continue;buffer=(buffer<<5)|val;bits+=5;if(bits>=8){bits-=8;bytes.push((buffer>>bits)&0xff)}}return bytes}
function rotl(n,s){return(n<<s)|(n>>>(32-s))}
function sha1(msg){const H=[0x67452301,0xefcdab89,0x98badcfe,0x10325476,0xc3d2e1f0];const ml=msg.length*8;const p=msg.slice();p.push(0x80);while(p.length%64!==56)p.push(0);const hi=Math.floor(ml/0x100000000),lo=ml>>>0;p.push((hi>>>24)&0xff,(hi>>>16)&0xff,(hi>>>8)&0xff,hi&0xff,(lo>>>24)&0xff,(lo>>>16)&0xff,(lo>>>8)&0xff,lo&0xff);for(let i=0;i<p.length;i+=64){const w=new Array(80);for(let t=0;t<16;t++){w[t]=((p[i+t*4]<<24)|(p[i+t*4+1]<<16)|(p[i+t*4+2]<<8)|p[i+t*4+3])>>>0}for(let t=16;t<80;t++){w[t]=rotl(w[t-3]^w[t-8]^w[t-14]^w[t-16],1)}let[a,b,c,d,e]=H;for(let t=0;t<80;t++){let f,k;if(t<20){f=(b&c)|(~b&d);k=0x5a827999}else if(t<40){f=b^c^d;k=0x6ed9eba1}else if(t<60){f=(b&c)|(b&d)|(c&d);k=0x8f1bbcdc}else{f=b^c^d;k=0xca62c1d6}const temp=(rotl(a,5)+f+e+k+w[t])>>>0;e=d;d=c;c=rotl(b,30);b=a;a=temp}H[0]=(H[0]+a)>>>0;H[1]=(H[1]+b)>>>0;H[2]=(H[2]+c)>>>0;H[3]=(H[3]+d)>>>0;H[4]=(H[4]+e)>>>0}const o=[];for(let i=0;i<5;i++){o.push((H[i]>>>24)&0xff,(H[i]>>>16)&0xff,(H[i]>>>8)&0xff,H[i]&0xff)}return o}
function hmacSha1(key,message){let kb=key;if(kb.length>64)kb=sha1(kb);const pk=kb.slice();while(pk.length<64)pk.push(0);const o=k=pk.map(b=>b^0x5c),i2=pk.map(b=>b^0x36);return sha1(o.concat(sha1(i2.concat(message))))}
function counterToBytes(c){const b=[];for(let i=7;i>=0;i--){b[i]=Math.floor(c/Math.pow(2,8*(7-i)))&0xff}return b}
function generateTotp(secret,time,digits,period){const k=base32Decode(secret);const c=Math.floor(time/1000/period);const m=counterToBytes(c);const h=hmacSha1(k,m);const off=h[h.length-1]&0x0f;const bin=((h[off]&0x7f)<<24)|((h[off+1]&0xff)<<16)|((h[off+2]&0xff)<<8)|(h[off+3]&0xff);const otp=bin%Math.pow(10,digits);return otp.toString().padStart(digits,'0')}
const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
const cases=[[59,'287082'],[1111111109,'081804'],[1111111111,'050471'],[1234567890,'005924'],[2000000000,'279037']]
let ok=true
for(const[t,exp] of cases){const got=generateTotp(secret,t*1000,6,30);const pass=got===exp;if(!pass)ok=false;console.log(`T=${t} expected=${exp} got=${got} ${pass?'PASS':'FAIL'}`)}
console.log(ok?'ALL PASS':'SOME FAIL')
