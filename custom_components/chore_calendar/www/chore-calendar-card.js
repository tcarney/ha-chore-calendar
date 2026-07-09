function t(t,e,i,o){var n,s=arguments.length,a=s<3?e:null===o?o=Object.getOwnPropertyDescriptor(e,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,i,o);else for(var r=t.length-1;r>=0;r--)(n=t[r])&&(a=(s<3?n(a):s>3?n(e,i,a):n(e,i))||a);return s>3&&a&&Object.defineProperty(e,i,a),a}"function"==typeof SuppressedError&&SuppressedError;const e=globalThis,i=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,o=Symbol(),n=new WeakMap;let s=class{constructor(t,e,i){if(this._$cssResult$=!0,i!==o)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(i&&void 0===t){const i=void 0!==e&&1===e.length;i&&(t=n.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&n.set(e,t))}return t}toString(){return this.cssText}};const a=(t,...e)=>{const i=1===t.length?t[0]:e.reduce((e,i,o)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[o+1],t[0]);return new s(i,t,o)},r=i?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return(t=>new s("string"==typeof t?t:t+"",void 0,o))(e)})(t):t,{is:l,defineProperty:d,getOwnPropertyDescriptor:c,getOwnPropertyNames:h,getOwnPropertySymbols:p,getPrototypeOf:u}=Object,m=globalThis,_=m.trustedTypes,y=_?_.emptyScript:"",g=m.reactiveElementPolyfillSupport,f=(t,e)=>t,v={toAttribute(t,e){switch(e){case Boolean:t=t?y:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},b=(t,e)=>!l(t,e),$={attribute:!0,type:String,converter:v,reflect:!1,useDefault:!1,hasChanged:b};Symbol.metadata??=Symbol("metadata"),m.litPropertyMetadata??=new WeakMap;let w=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=$){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const i=Symbol(),o=this.getPropertyDescriptor(t,i,e);void 0!==o&&d(this.prototype,t,o)}}static getPropertyDescriptor(t,e,i){const{get:o,set:n}=c(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:o,set(e){const s=o?.call(this);n?.call(this,e),this.requestUpdate(t,s,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??$}static _$Ei(){if(this.hasOwnProperty(f("elementProperties")))return;const t=u(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(f("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(f("properties"))){const t=this.properties,e=[...h(t),...p(t)];for(const i of e)this.createProperty(i,t[i])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const i=this._$Eu(t,e);void 0!==i&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const t of i)e.unshift(r(t))}else void 0!==t&&e.push(r(t));return e}static _$Eu(t,e){const i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,o)=>{if(i)t.adoptedStyleSheets=o.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const i of o){const o=document.createElement("style"),n=e.litNonce;void 0!==n&&o.setAttribute("nonce",n),o.textContent=i.cssText,t.appendChild(o)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){const i=this.constructor.elementProperties.get(t),o=this.constructor._$Eu(t,i);if(void 0!==o&&!0===i.reflect){const n=(void 0!==i.converter?.toAttribute?i.converter:v).toAttribute(e,i.type);this._$Em=t,null==n?this.removeAttribute(o):this.setAttribute(o,n),this._$Em=null}}_$AK(t,e){const i=this.constructor,o=i._$Eh.get(t);if(void 0!==o&&this._$Em!==o){const t=i.getPropertyOptions(o),n="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:v;this._$Em=o;const s=n.fromAttribute(e,t.type);this[o]=s??this._$Ej?.get(o)??s,this._$Em=null}}requestUpdate(t,e,i,o=!1,n){if(void 0!==t){const s=this.constructor;if(!1===o&&(n=this[t]),i??=s.getPropertyOptions(t),!((i.hasChanged??b)(n,e)||i.useDefault&&i.reflect&&n===this._$Ej?.get(t)&&!this.hasAttribute(s._$Eu(t,i))))return;this.C(t,e,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:o,wrapped:n},s){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,s??e??this[t]),!0!==n||void 0!==s)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),!0===o&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,i]of t){const{wrapped:t}=i,o=this[e];!0!==t||this._$AL.has(e)||void 0===o||this.C(e,void 0,i,o)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};w.elementStyles=[],w.shadowRootOptions={mode:"open"},w[f("elementProperties")]=new Map,w[f("finalized")]=new Map,g?.({ReactiveElement:w}),(m.reactiveElementVersions??=[]).push("2.1.2");const x=globalThis,A=t=>t,S=x.trustedTypes,E=S?S.createPolicy("lit-html",{createHTML:t=>t}):void 0,C="$lit$",k=`lit$${Math.random().toFixed(9).slice(2)}$`,D="?"+k,T=`<${D}>`,P=document,O=()=>P.createComment(""),H=t=>null===t||"object"!=typeof t&&"function"!=typeof t,N=Array.isArray,M="[ \t\n\f\r]",U=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,L=/-->/g,R=/>/g,j=RegExp(`>|${M}(?:([^\\s"'>=/]+)(${M}*=${M}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),q=/'/g,z=/"/g,I=/^(?:script|style|textarea|title)$/i,F=(t=>(e,...i)=>({_$litType$:t,strings:e,values:i}))(1),W=Symbol.for("lit-noChange"),B=Symbol.for("lit-nothing"),J=new WeakMap,V=P.createTreeWalker(P,129);function Y(t,e){if(!N(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==E?E.createHTML(e):e}const K=(t,e)=>{const i=t.length-1,o=[];let n,s=2===e?"<svg>":3===e?"<math>":"",a=U;for(let e=0;e<i;e++){const i=t[e];let r,l,d=-1,c=0;for(;c<i.length&&(a.lastIndex=c,l=a.exec(i),null!==l);)c=a.lastIndex,a===U?"!--"===l[1]?a=L:void 0!==l[1]?a=R:void 0!==l[2]?(I.test(l[2])&&(n=RegExp("</"+l[2],"g")),a=j):void 0!==l[3]&&(a=j):a===j?">"===l[0]?(a=n??U,d=-1):void 0===l[1]?d=-2:(d=a.lastIndex-l[2].length,r=l[1],a=void 0===l[3]?j:'"'===l[3]?z:q):a===z||a===q?a=j:a===L||a===R?a=U:(a=j,n=void 0);const h=a===j&&t[e+1].startsWith("/>")?" ":"";s+=a===U?i+T:d>=0?(o.push(r),i.slice(0,d)+C+i.slice(d)+k+h):i+k+(-2===d?e:h)}return[Y(t,s+(t[i]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),o]};class Z{constructor({strings:t,_$litType$:e},i){let o;this.parts=[];let n=0,s=0;const a=t.length-1,r=this.parts,[l,d]=K(t,e);if(this.el=Z.createElement(l,i),V.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(o=V.nextNode())&&r.length<a;){if(1===o.nodeType){if(o.hasAttributes())for(const t of o.getAttributeNames())if(t.endsWith(C)){const e=d[s++],i=o.getAttribute(t).split(k),a=/([.?@])?(.*)/.exec(e);r.push({type:1,index:n,name:a[2],strings:i,ctor:"."===a[1]?et:"?"===a[1]?it:"@"===a[1]?ot:tt}),o.removeAttribute(t)}else t.startsWith(k)&&(r.push({type:6,index:n}),o.removeAttribute(t));if(I.test(o.tagName)){const t=o.textContent.split(k),e=t.length-1;if(e>0){o.textContent=S?S.emptyScript:"";for(let i=0;i<e;i++)o.append(t[i],O()),V.nextNode(),r.push({type:2,index:++n});o.append(t[e],O())}}}else if(8===o.nodeType)if(o.data===D)r.push({type:2,index:n});else{let t=-1;for(;-1!==(t=o.data.indexOf(k,t+1));)r.push({type:7,index:n}),t+=k.length-1}n++}}static createElement(t,e){const i=P.createElement("template");return i.innerHTML=t,i}}function X(t,e,i=t,o){if(e===W)return e;let n=void 0!==o?i._$Co?.[o]:i._$Cl;const s=H(e)?void 0:e._$litDirective$;return n?.constructor!==s&&(n?._$AO?.(!1),void 0===s?n=void 0:(n=new s(t),n._$AT(t,i,o)),void 0!==o?(i._$Co??=[])[o]=n:i._$Cl=n),void 0!==n&&(e=X(t,n._$AS(t,e.values),n,o)),e}class G{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,o=(t?.creationScope??P).importNode(e,!0);V.currentNode=o;let n=V.nextNode(),s=0,a=0,r=i[0];for(;void 0!==r;){if(s===r.index){let e;2===r.type?e=new Q(n,n.nextSibling,this,t):1===r.type?e=new r.ctor(n,r.name,r.strings,this,t):6===r.type&&(e=new nt(n,this,t)),this._$AV.push(e),r=i[++a]}s!==r?.index&&(n=V.nextNode(),s++)}return V.currentNode=P,o}p(t){let e=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class Q{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,o){this.type=2,this._$AH=B,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=o,this._$Cv=o?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=X(this,t,e),H(t)?t===B||null==t||""===t?(this._$AH!==B&&this._$AR(),this._$AH=B):t!==this._$AH&&t!==W&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>N(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==B&&H(this._$AH)?this._$AA.nextSibling.data=t:this.T(P.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:i}=t,o="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=Z.createElement(Y(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===o)this._$AH.p(e);else{const t=new G(o,this),i=t.u(this.options);t.p(e),this.T(i),this._$AH=t}}_$AC(t){let e=J.get(t.strings);return void 0===e&&J.set(t.strings,e=new Z(t)),e}k(t){N(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,o=0;for(const n of t)o===e.length?e.push(i=new Q(this.O(O()),this.O(O()),this,this.options)):i=e[o],i._$AI(n),o++;o<e.length&&(this._$AR(i&&i._$AB.nextSibling,o),e.length=o)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=A(t).nextSibling;A(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,o,n){this.type=1,this._$AH=B,this._$AN=void 0,this.element=t,this.name=e,this._$AM=o,this.options=n,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=B}_$AI(t,e=this,i,o){const n=this.strings;let s=!1;if(void 0===n)t=X(this,t,e,0),s=!H(t)||t!==this._$AH&&t!==W,s&&(this._$AH=t);else{const o=t;let a,r;for(t=n[0],a=0;a<n.length-1;a++)r=X(this,o[i+a],e,a),r===W&&(r=this._$AH[a]),s||=!H(r)||r!==this._$AH[a],r===B?t=B:t!==B&&(t+=(r??"")+n[a+1]),this._$AH[a]=r}s&&!o&&this.j(t)}j(t){t===B?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===B?void 0:t}}class it extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==B)}}class ot extends tt{constructor(t,e,i,o,n){super(t,e,i,o,n),this.type=5}_$AI(t,e=this){if((t=X(this,t,e,0)??B)===W)return;const i=this._$AH,o=t===B&&i!==B||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,n=t!==B&&(i===B||o);o&&this.element.removeEventListener(this.name,this,i),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class nt{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){X(this,t)}}const st=x.litHtmlPolyfillSupport;st?.(Z,Q),(x.litHtmlVersions??=[]).push("3.3.2");const at=globalThis;let rt=class extends w{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,i)=>{const o=i?.renderBefore??e;let n=o._$litPart$;if(void 0===n){const t=i?.renderBefore??null;o._$litPart$=n=new Q(e.insertBefore(O(),t),t,void 0,i??{})}return n._$AI(t),n})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return W}};rt._$litElement$=!0,rt.finalized=!0,at.litElementHydrateSupport?.({LitElement:rt});const lt=at.litElementPolyfillSupport;lt?.({LitElement:rt}),(at.litElementVersions??=[]).push("4.2.2");const dt={attribute:!0,type:String,converter:v,reflect:!1,hasChanged:b},ct=(t=dt,e,i)=>{const{kind:o,metadata:n}=i;let s=globalThis.litPropertyMetadata.get(n);if(void 0===s&&globalThis.litPropertyMetadata.set(n,s=new Map),"setter"===o&&((t=Object.create(t)).wrapped=!0),s.set(i.name,t),"accessor"===o){const{name:o}=i;return{set(i){const n=e.get.call(this);e.set.call(this,i),this.requestUpdate(o,n,t,!0,i)},init(e){return void 0!==e&&this.C(o,void 0,t,e),e}}}if("setter"===o){const{name:o}=i;return function(i){const n=this[o];e.call(this,i),this.requestUpdate(o,n,t,!0,i)}}throw Error("Unsupported decorator location: "+o)};function ht(t){return(e,i)=>"object"==typeof i?ct(t,e,i):((t,e,i)=>{const o=e.hasOwnProperty(i);return e.constructor.createProperty(i,t),o?Object.getOwnPropertyDescriptor(e,i):void 0})(t,e,i)}function pt(t){return ht({...t,state:!0,attribute:!1})}function ut(t,e){customElements.get(t)||customElements.define(t,e)}const mt=(t,e,i,o)=>{o=o||{},i=null==i?{}:i;const n=new Event(e,{bubbles:void 0===o.bubbles||o.bubbles,cancelable:Boolean(o.cancelable),composed:void 0===o.composed||o.composed});return n.detail=i,t.dispatchEvent(n),n},_t=["blue","red","amber","green","orange","cyan","purple","pink"],yt=new Set(["primary","accent","red","pink","purple","deep-purple","indigo","blue","light-blue","cyan","teal","green","light-green","lime","yellow","amber","orange","deep-orange","brown","light-grey","grey","dark-grey","blue-grey","black","white"]);function gt(t){return yt.has(t)?`var(--${t}-color)`:t}const ft={overdue:0,due:1,pending:2,completed:3};const vt=6e4,bt=36e5,$t=864e5;function wt(t){if(!t)return null;const e=(t.days??0)*$t+(t.hours??0)*bt+(t.minutes??0)*vt+1e3*(t.seconds??0);return e>0?e:null}function xt(t){const e=Math.abs(t);if(e<bt){const t=Math.max(1,Math.round(e/vt));return`${t} minute${1!==t?"s":""}`}if(e<$t){const t=Math.round(e/bt);return`${t} hour${1!==t?"s":""}`}const i=Math.round(e/$t);return`${i} day${1!==i?"s":""}`}const At=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function St(t){const e=Array.isArray(t)?t.map(Number).filter(t=>t>=1&&t<=12):[],i=new Set(e);if(0===i.size||i.size>=12)return"";const o=t=>(t-1+12)%12+1,n=[...i].filter(t=>!i.has(o(t-1)));if(1===n.length&&i.size>1){let t=n[0];for(;i.has(o(t+1));)t=o(t+1);return`${At[n[0]-1]}–${At[t-1]}`}return[...i].sort((t,e)=>t-e).map(t=>At[t-1]).join(", ")}function Et(t,e=!1){return new Intl.DateTimeFormat(void 0,{month:"short",day:"numeric",year:"numeric",...e?{timeZone:"UTC"}:{}}).format(t)}function Ct(t,e){let i=t?`, until ${t}`:"";const o=Number(e??0);return o>0&&(i+=`, ${o} time${1!==o?"s":""}`),i}const kt={mon:"Monday",tue:"Tuesday",wed:"Wednesday",thu:"Thursday",fri:"Friday",sat:"Saturday",sun:"Sunday"},Dt={1:"first",2:"second",3:"third",4:"fourth",5:"fifth",[-1]:"last",[-2]:"second-to-last",[-3]:"third-to-last"};function Tt(t){return Array.isArray(t)?t.map(Number):null!=t?[Number(t)]:[]}function Pt(t){return(Array.isArray(t)?t:null!=t?[t]:[]).map(t=>{const e=/^([+-]?\d+)?([a-z]{3})$/.exec(String(t).toLowerCase());return e?{ordinal:e[1]?Number(e[1]):null,code:e[2]}:{ordinal:null,code:String(t)}})}function Ot(t){return Dt[t]??(t>0?Ht(t):`${Ht(-t)}-to-last`)}function Ht(t){const e=t%100;return`${t}${e>=11&&e<=13?"th":["th","st","nd","rd"][t%10]??"th"}`}function Nt(t,e){const i=t=>kt[t]??t;return e.length?`${e.map(Ot).join(", ")} ${t.map(t=>i(t.code)).join(", ")}`:t.some(t=>null!=t.ordinal)?t.map(t=>null!=t.ordinal?`${Ot(t.ordinal)} ${i(t.code)}`:i(t.code)).join(", "):t.map(t=>i(t.code)).join(", ")}function Mt(t,e){const i=function(t){const e=t.split(":").map(Number);if(e.length<2||e.some(Number.isNaN))return t;const i=new Date;return i.setHours(e[0],e[1],0,0),new Intl.DateTimeFormat(void 0,{hour:"numeric",minute:"2-digit"}).format(i)}(String(e??""));if(!t?.frequency)return`${String(e??"")}`.trim()?`At ${i}`:"";const o=t.frequency,n=Number(t.interval??1),s=Pt(t.byday),a=Tt(t.bysetpos),r=Tt(t.bymonthday),l=Tt(t.bymonth);let d;if("daily"===o)d=1===n?"Daily":`Every ${n} days`;else if("weekly"===o)if(1===n&&7===new Set(s.map(t=>t.code)).size)d="Daily";else if(s.length){const t=s.map(t=>kt[t.code]??t.code).join(", ");d=1===n?t:`Every ${n} weeks on ${t}`}else d=1===n?"Weekly":`Every ${n} weeks`;else if("monthly"===o){const t=1===n?"Monthly":`Every ${n} months`;if(s.length){const e=Nt(s,a);d=1===n?(c=e).charAt(0).toUpperCase()+c.slice(1):`${t} on the ${e}`}else d=r.length?`${t} on the ${r.map(t=>-1===t?"last day":Ht(t)).join(", ")}`:t}else if("yearly"===o){let t=1===n?"Annually":`Every ${n} years`;l.length&&(t+=` in ${l.map(t=>At[t-1]).join(", ")}`),s.length?t+=` on the ${Nt(s,a)}`:r.length&&(t+=` on the ${r.map(t=>-1===t?"last day":Ht(t)).join(", ")}`),d=t}else d=o;var c;let h="";if("yearly"!==o){const t=St(l);t&&(h+=`, ${t}`)}return h+=Ct(t.until?Et(new Date(String(t.until))):"",t.count),`${d} at ${i}${h}`}const Ut={minutely:"minute",hourly:"hour",daily:"day",weekly:"week",monthly:"month",yearly:"year"};function Lt(t,e){if("string"==typeof t)return t;if("rrule"in t)return Mt(e,t.time);if("freq"in t)return function(t){const e=Ut[String(t.freq)]??String(t.freq),i=Number(t.interval??1);let o=1===i?`Every ${e}`:`Every ${i} ${e}s`;const n=St(t.bymonth);return n&&(o+=`, ${n}`),o+Ct(t.until?Et(new Date(String(t.until))):"",t.count)}(t);if("due_datetime"in t){const e=t.due_datetime;if(!e)return"Unscheduled";const i=new Date(e);return`${new Intl.DateTimeFormat(void 0,{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(i)}`}return JSON.stringify(t)}const Rt={overdue:"Overdue",due:"Due",pending:"Upcoming",completed:"Completed"};function jt(t){return void 0!==t&&"none"!==t.action}class qt{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,i){this._$Ct=t,this._$AM=e,this._$Ci=i}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}const zt="ontouchstart"in window||navigator.maxTouchPoints>0;class It extends HTMLElement{constructor(){super(...arguments),this.holdTime=500,this.held=!1,this.cancelled=!1}connectedCallback(){Object.assign(this.style,{position:"fixed",width:zt?"100px":"50px",height:zt?"100px":"50px",transform:"translate(-50%, -50%) scale(0)",pointerEvents:"none",zIndex:"999",background:"var(--primary-color)",display:null,opacity:"0.2",borderRadius:"50%",transition:"transform 180ms ease-in-out"}),["touchcancel","mouseout","mouseup","touchmove","mousewheel","wheel","scroll"].forEach(t=>{document.addEventListener(t,()=>{this.cancelled=!0,this.timer&&(this._stopAnimation(),clearTimeout(this.timer),this.timer=void 0)},{passive:!0})})}bind(t,e={}){t.actionHandler&&JSON.stringify(e)===JSON.stringify(t.actionHandler.options)||(t.actionHandler?(t.removeEventListener("touchstart",t.actionHandler.start),t.removeEventListener("touchend",t.actionHandler.end),t.removeEventListener("touchcancel",t.actionHandler.end),t.removeEventListener("mousedown",t.actionHandler.start),t.removeEventListener("click",t.actionHandler.end),t.removeEventListener("keydown",t.actionHandler.handleKeyDown)):t.addEventListener("contextmenu",t=>{const e=t||window.event;return e.preventDefault&&e.preventDefault(),e.stopPropagation&&e.stopPropagation(),!1}),t.actionHandler={options:e},e.disabled||(t.actionHandler.start=t=>{let i,o;this.cancelled=!1,t.touches?(i=t.touches[0].clientX,o=t.touches[0].clientY):(i=t.clientX,o=t.clientY),e.hasHold&&(this.held=!1,this.timer=window.setTimeout(()=>{this._startAnimation(i,o),this.held=!0},this.holdTime))},t.actionHandler.end=t=>{if("touchcancel"===t.type||"touchend"===t.type&&this.cancelled)return;const i=t.target;t.cancelable&&t.preventDefault(),e.hasHold&&(clearTimeout(this.timer),this._stopAnimation(),this.timer=void 0),e.hasHold&&this.held?mt(i,"action",{action:"hold"}):e.hasDoubleClick?"click"===t.type&&t.detail<2||!this.dblClickTimeout?this.dblClickTimeout=window.setTimeout(()=>{this.dblClickTimeout=void 0,mt(i,"action",{action:"tap"})},250):(clearTimeout(this.dblClickTimeout),this.dblClickTimeout=void 0,mt(i,"action",{action:"double_tap"})):mt(i,"action",{action:"tap"})},t.actionHandler.handleKeyDown=t=>{["Enter"," "].includes(t.key)&&t.currentTarget.actionHandler.end(t)},t.addEventListener("touchstart",t.actionHandler.start,{passive:!0}),t.addEventListener("touchend",t.actionHandler.end),t.addEventListener("touchcancel",t.actionHandler.end),t.addEventListener("mousedown",t.actionHandler.start,{passive:!0}),t.addEventListener("click",t.actionHandler.end),t.addEventListener("keydown",t.actionHandler.handleKeyDown)))}_startAnimation(t,e){Object.assign(this.style,{left:`${t}px`,top:`${e}px`,transform:"translate(-50%, -50%) scale(1)"})}_stopAnimation(){Object.assign(this.style,{left:null,top:null,transform:"translate(-50%, -50%) scale(0)"})}}const Ft=(t,e)=>{const i=(()=>{const t=document.body;if(t.querySelector("action-handler"))return t.querySelector("action-handler");customElements.get("action-handler")||customElements.define("action-handler",It);const e=document.createElement("action-handler");return t.appendChild(e),e})();i&&i.bind(t,e)},Wt=(t=>(...e)=>({_$litDirective$:t,values:e}))(class extends qt{update(t,[e]){return Ft(t.element,e),W}render(t){}}),Bt={overdue:"✗",due:"●",pending:"○",completed:"✓"};class Jt extends rt{render(){const t=new Date,e=function(t,e){switch(t.status){case"overdue":if(t.next_due){const i="object"==typeof t.schedule&&null!==t.schedule?Number(t.schedule.grace_period_mins??0):0,o=new Date(t.next_due).getTime()+i*vt,n=e.getTime()-o;return n>0?`Overdue by ${xt(n)}`:"Overdue"}return"Overdue";case"due":return"Due";case"pending":if(t.next_due){const i=new Date(t.next_due).getTime()-e.getTime();return i>0?`in ${xt(i)}`:"Pending"}return"Pending";case"completed":return""}}(this.item,t);return F`
      <div
        class="chore"
        style="--border-color: ${gt(this.item.source_color)}"
        ${Wt({hasHold:jt(this.holdAction),hasDoubleClick:jt(this.doubleTapAction)})}
        @action=${this._handleAction}
      >
        <span class="status-indicator">${Bt[this.item.status]}</span>
        <span class="name">${this.item.chore_name}</span>
        <span class="time">${e}</span>
      </div>
    `}_handleAction(t){let e;switch(t.detail.action){case"tap":e=this.tapAction;break;case"hold":e=this.holdAction;break;case"double_tap":e=this.doubleTapAction}!async function(t,e,i,o){if(i&&"none"!==i.action)switch(i.action){case"details":mt(t,"chore-detail",{item:o});break;case"edit":mt(t,"chore-edit",{item:o});break;case"complete":try{await e.callWS({type:"call_service",domain:"chore_calendar",service:"complete_item",service_data:{entity_id:o.source_entity,item:o.uid}}),mt(t,"chore-completed",{item:o})}catch(t){console.error("chore-calendar-card: failed to complete chore",t)}break;default:mt(t,"hass-action",{config:{entity:o.source_entity,tap_action:i,hold_action:i,double_tap_action:i},action:"tap"})}}(this,this.hass,e,this.item)}connectedCallback(){super.connectedCallback(),this._syncStatusAttribute()}updated(){this._syncStatusAttribute()}_syncStatusAttribute(){this.setAttribute("status",this.item.status)}}Jt.styles=a`
    :host {
      display: block;
      margin-bottom: 5px;
    }

    .chore {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 0;
      padding: 10px;
      cursor: pointer;
      background: var(--card-background-color, var(--ha-card-background, white));
      border-left: 5px solid var(--border-color, var(--divider-color, rgba(0, 0, 0, 0.12)));
      border-radius: 0 5px 5px 0;
      overflow: hidden;
      transition: background-color 0.15s ease;
    }

    .chore:hover {
      background-color: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
    }

    .status-indicator {
      flex-shrink: 0;
      width: 16px;
      text-align: center;
      font-size: 14px;
      line-height: 1;
    }

    .name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 14px;
      color: var(--primary-text-color);
    }

    .time {
      flex-shrink: 0;
      font-size: 12px;
      color: var(--secondary-text-color);
      white-space: nowrap;
    }

    :host([status="completed"]) .chore {
      opacity: 0.6;
    }

    :host([status="overdue"]) .time {
      color: var(--error-color, #db4437);
    }
  `,t([ht({attribute:!1})],Jt.prototype,"hass",void 0),t([ht({attribute:!1})],Jt.prototype,"item",void 0),t([ht({attribute:!1})],Jt.prototype,"tapAction",void 0),t([ht({attribute:!1})],Jt.prototype,"holdAction",void 0),t([ht({attribute:!1})],Jt.prototype,"doubleTapAction",void 0),ut("chore-row",Jt);const Vt="chore_calendar";class Yt extends rt{constructor(){super(...arguments),this.open=!1,this.allowUncomplete=!1,this.allowEdit=!0,this._loading=!1}render(){if(!this.item)return B;const t="completed"===this.item.status,e=!t||this.allowUncomplete&&!!this.item.last_completed,i=this.allowEdit||e;return F`
      <ha-dialog
        .open=${this.open}
        @closed=${this._onClosed}
      >
        <ha-icon-button
          slot="headerNavigationIcon"
          data-dialog="close"
          class="header_button"
        >
          <ha-icon icon="mdi:close"></ha-icon>
        </ha-icon-button>
        <span slot="headerTitle">${this.item.chore_name}</span>
        <div class="content">
          ${this._renderDetails()}
        </div>
        ${i?F`
              <div slot="footer" class="footer">
                ${this.allowEdit?F`
                      <ha-button variant="neutral" appearance="plain" @click=${this._onEdit}>
                        Edit
                      </ha-button>
                    `:F`<span></span>`}
                <span class="status-actions">
                  ${t?e?F`
                          <ha-button
                            variant="neutral"
                            appearance="plain"
                            ?disabled=${this._loading}
                            @click=${this._onUncomplete}
                          >
                            ${this._loading?"Uncompleting...":"Uncomplete"}
                          </ha-button>
                        `:B:F`
                        <ha-button
                          variant="neutral"
                          appearance="plain"
                          ?disabled=${this._loading}
                          @click=${this._onSkip}
                        >
                          ${this._loading?"Skipping...":"Skip"}
                        </ha-button>
                        <ha-button ?disabled=${this._loading} @click=${this._onComplete}>
                          ${this._loading?"Completing...":"Complete"}
                        </ha-button>
                      `}
                </span>
              </div>
            `:B}
      </ha-dialog>
    `}_renderDetails(){const{item:t}=this;if(!t)return B;const e=this.hass?.language??"en",i=new Date;return F`
      ${this._renderListRow()}

      <div class="schedule">
        <ha-icon icon="mdi:calendar-clock"></ha-icon>
        <div class="info">${Lt(t.schedule,t.selector)}</div>
      </div>

      ${t.assigned_to.length>0?F`
            <div class="assigned">
              <ha-icon icon=${t.assigned_to.length>1?"mdi:account-multiple":"mdi:account"}></ha-icon>
              <div class="info">
                ${t.assigned_to.map(t=>this._resolveEntityName(t)).join(", ")}
              </div>
            </div>
          `:B}

      ${t.trigger_entity?F`
            <div class="trigger">
              <ha-icon icon="mdi:nfc-tap"></ha-icon>
              <div class="info">${this._resolveEntityName(t.trigger_entity)}</div>
            </div>
          `:B}

      ${t.last_completed?F`
            <div class="last-completed">
              <ha-icon icon="mdi:check-circle-outline"></ha-icon>
              <div class="info">
                ${function(t,e,i){const o=new Date(t),n=Math.floor((e.getTime()-o.getTime())/$t);return 0===n?new Intl.DateTimeFormat(i,{hour:"numeric",minute:"2-digit"}).format(o):1===n?"Yesterday":n<7?new Intl.DateTimeFormat(i,{weekday:"long"}).format(o):new Intl.DateTimeFormat(i,{month:"short",day:"numeric"}).format(o)}(t.last_completed,i,e)}${t.last_completed_by?` by ${this._resolveEntityName(t.last_completed_by)}`:""}
              </div>
            </div>
          `:B}

      ${t.description?F`<div class="description">${t.description}</div>`:B}
    `}_renderListRow(){const t=this.item?.source_entity;if(!t)return B;const e=this.hass?.states?.[t],i=e?.attributes?.friendly_name??t;return F`
      <div class="calendar">
        <ha-state-icon
          .hass=${this.hass}
          .stateObj=${e}
        ></ha-state-icon>
        <div class="info">${i}</div>
      </div>
    `}async _onComplete(){if(this.item&&!this._loading){this._loading=!0;try{await this.hass.callWS({type:"call_service",domain:Vt,service:"complete_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid}}),this.dispatchEvent(new CustomEvent("chore-completed",{detail:{item:this.item},bubbles:!0,composed:!0}))}catch(t){console.error("chore-detail-dialog: failed to complete chore",t)}finally{this._loading=!1}}}async _onSkip(){if(this.item&&!this._loading){this._loading=!0;try{await this.hass.callWS({type:"call_service",domain:Vt,service:"skip_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid}}),this.dispatchEvent(new CustomEvent("chore-skipped",{detail:{item:this.item},bubbles:!0,composed:!0}))}catch(t){console.error("chore-detail-dialog: failed to skip chore",t)}finally{this._loading=!1}}}async _onUncomplete(){if(this.item&&!this._loading){this._loading=!0;try{await this.hass.callWS({type:"call_service",domain:Vt,service:"uncomplete_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid}}),this.dispatchEvent(new CustomEvent("chore-uncompleted",{detail:{item:this.item},bubbles:!0,composed:!0}))}catch(t){console.error("chore-detail-dialog: failed to uncomplete chore",t)}finally{this._loading=!1}}}_resolveEntityName(t){const e=this.hass?.states?.[t];return e?.attributes?.friendly_name??t}_onEdit(){this.item&&this.dispatchEvent(new CustomEvent("chore-edit",{detail:{item:this.item},bubbles:!0,composed:!0}))}_onClosed(){this.dispatchEvent(new CustomEvent("detail-dialog-closed",{bubbles:!0,composed:!0}))}}Yt.styles=a`
    ha-dialog {
      --ha-dialog-max-width: 400px;
    }

    .header_button {
      color: var(--secondary-text-color);
    }

    .content {
      padding: 0 16px 16px;
    }

    .content > div {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }

    .content ha-icon,
    .content ha-state-icon {
      flex-shrink: 0;
      color: var(--secondary-text-color);
      --mdc-icon-size: 20px;
      --ha-icon-display: inline-flex;
    }

    .content .info {
      flex: 1;
      min-width: 0;
      font-size: 14px;
      color: var(--primary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Free-text description: the last details block, set off by spacing
       alone (a divider would double up with the footer border). */
    .content > div.description {
      display: block;
      margin-top: 16px;
      padding: 0;
      font-size: 14px;
      color: var(--primary-text-color);
      white-space: pre-line;
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 16px;
      border-top: 1px solid var(--divider-color);
    }

    .status-actions {
      display: flex;
      gap: 8px;
    }
  `,t([ht({attribute:!1})],Yt.prototype,"hass",void 0),t([ht({attribute:!1})],Yt.prototype,"item",void 0),t([ht({type:Boolean})],Yt.prototype,"open",void 0),t([ht({type:Boolean,attribute:"allow-uncomplete"})],Yt.prototype,"allowUncomplete",void 0),t([ht({type:Boolean,attribute:"allow-edit"})],Yt.prototype,"allowEdit",void 0),t([pt()],Yt.prototype,"_loading",void 0),ut("chore-detail-dialog",Yt);const Kt="chore_calendar",Zt=[{value:"daily",label:"Daily"},{value:"weekly",label:"Weekly"},{value:"monthly",label:"Monthly"},{value:"yearly",label:"Yearly"}],Xt=new Set(Zt.map(t=>t.value)),Gt=[{value:"minutely",label:"Minutely"},{value:"hourly",label:"Hourly"},{value:"daily",label:"Daily"},{value:"weekly",label:"Weekly"},{value:"monthly",label:"Monthly"},{value:"yearly",label:"Yearly"}],Qt=["sun","mon","tue","wed","thu","fri","sat"],te=["mon","tue","wed","thu","fri","sat","sun"].map(t=>({value:t,label:kt[t]})),ee=["January","February","March","April","May","June","July","August","September","October","November","December"].map((t,e)=>({value:String(e+1),label:t})),ie={daily:"days",weekly:"weeks",monthly:"months"},oe={minutely:"minutes",hourly:"hours",daily:"days",weekly:"weeks",monthly:"months",yearly:"years"},ne=[{name:"_t",selector:{time:{}}}],se={target_entity:"List",chore_name:"Name",description:"Description",chore_type:"Type",dtstart:"Start",byday:"Repeat on",monthly_mode:"Repeat monthly",bymonth:"Only in months",due_datetime:"Due",until:"Until (end date)",count:"Or after N times",persist:"Keep when finished",pending_period:"Pending period",grace_period:"Grace period",trigger_entity:"Trigger tag",assigned_to:"Assigned to"};class ae extends rt{constructor(){super(...arguments),this.open=!1,this.targets=[],this._data={},this._loading=!1,this._confirmDelete=!1,this._computeLabel=t=>"frequency"===t.name?"scheduled"===this._data.chore_type?"Repeat":"Frequency":"interval"===t.name?"scheduled"===this._data.chore_type?"Repeat every":"Repeat after":se[t.name]??t.name}willUpdate(t){if(t.has("open")||t.has("item")){const t=this.open?this.item?.uid??"create":void 0;t&&t!==this._seededFor&&(this._seededFor=t,this._data=this.item?this._dataFromItem(this.item):this._defaults(),this._error=void 0,this._confirmDelete=!1),this.open||(this._seededFor=void 0)}}_defaults(){return{chore_type:"scheduled",frequency:"daily",interval:1,dtstart:this._todayStart(),persist:!1,...this.targets.length>1?{}:{target_entity:this.defaultTarget}}}_todayStart(){const t=new Date,e=t=>String(t).padStart(2,"0");return`${t.getFullYear()}-${e(t.getMonth()+1)}-${e(t.getDate())} 08:00:00`}_parseDate(t){if(!t)return null;const e=new Date(String(t).replace(" ","T"));return Number.isNaN(e.getTime())?null:e}_datePart(t){return String(t??"").slice(0,10)}_daysInMonth(t){return new Date(t.getFullYear(),t.getMonth()+1,0).getDate()}_monthlySetpos(t){return t.getDate()+7>this._daysInMonth(t)?-1:Math.ceil(t.getDate()/7)}_monthlyOptions(){const t=this._parseDate(this._data.dtstart)??new Date,e=t.getDate(),i=this._monthlySetpos(t);return[{value:"monthday",label:`Monthly on the ${Ht(e)}`},{value:"weekday",label:`Monthly on the ${Ot(i)} ${kt[Qt[t.getDay()]]}`}]}_dataFromItem(t){const e=t.selector??{},i="object"==typeof t.schedule&&t.schedule||{},o={chore_name:t.chore_name,description:t.description??"",chore_type:t.chore_type,trigger_entity:t.trigger_entity??void 0,assigned_to:t.assigned_to,target_entity:t.source_entity,persist:e.persist??!1,pending_period:this._minsToDuration(i.pending_period_mins),grace_period:this._minsToDuration(i.grace_period_mins)};if("oneshot"===t.chore_type)o.due_datetime=e.due_datetime??void 0;else if("interval"===t.chore_type)o.frequency=e.frequency??"daily",o.interval=e.interval??1,o.bymonth=(e.bymonth??[]).map(String),o.until=e.until?String(e.until).slice(0,10):void 0,o.count=e.count;else{o.frequency=e.frequency??"daily",o.interval=e.interval??1,o.dtstart=e.dtstart?String(e.dtstart).replace("T"," ").slice(0,19):this._todayStart();const t=Pt(e.byday);o.byday=t.map(t=>t.code);const i=t.some(t=>null!=t.ordinal);o.monthly_mode=e.bymonthday?.length?"monthday":e.bysetpos?.length||i?"weekday":"monthday",o.until=e.until?String(e.until).slice(0,10):void 0,o.count=e.count,o.__snap={byday:e.byday??[],bysetpos:e.bysetpos??[],bymonthday:e.bymonthday??[],bymonth:e.bymonth??[]},o.__dtstart0=o.dtstart,o.__mode0=o.monthly_mode}return o}_minsToDuration(t){const e=Number(t??0);if(e)return{days:Math.floor(e/1440),hours:Math.floor(e%1440/60),minutes:e%60,seconds:0}}_topSchema(){const t=[];return!this.item&&this.targets.length>1&&t.push({name:"target_entity",required:!0,selector:{select:{mode:"dropdown",options:this.targets}}}),t.push({name:"chore_name",required:!0,selector:{text:{}}}),t.push({name:"description",selector:{text:{multiline:!0}}}),t.push({name:"chore_type",required:!0,selector:{select:{mode:"dropdown",options:[{value:"scheduled",label:"Scheduled"},{value:"interval",label:"Interval"},{value:"oneshot",label:"One-time"}]}}}),t}_bodySchema(){const t=String(this._data.chore_type??"scheduled"),e=[];return"scheduled"===t?e.push(...this._scheduledSchema()):"interval"===t?e.push(...this._intervalSchema()):e.push(...this._oneshotSchema()),e.push({name:"pending_period",selector:{duration:{}}}),e.push({name:"grace_period",selector:{duration:{}}}),e.push({name:"trigger_entity",selector:{entity:{filter:{domain:"tag"}}}}),e.push({name:"assigned_to",selector:{entity:{multiple:!0,filter:{domain:"person"}}}}),e}_scheduledSchema(){const t=String(this._data.frequency??"daily"),e=[{name:"frequency",required:!0,selector:{select:{mode:"dropdown",options:Zt}}}];return"yearly"!==t&&e.push({name:"interval",selector:{number:{min:1,mode:"box",unit_of_measurement:ie[t]??"days"}}}),"weekly"===t&&e.push({name:"byday",selector:{select:{multiple:!0,mode:"list",options:te}}}),"monthly"===t&&e.push({name:"monthly_mode",selector:{select:{mode:"dropdown",options:this._monthlyOptions()}}}),e.push(...this._lifecycleSchema()),e}_intervalSchema(){const t=String(this._data.frequency??"daily");return[{name:"frequency",required:!0,selector:{select:{mode:"dropdown",options:Gt}}},{name:"interval",selector:{number:{min:1,mode:"box",unit_of_measurement:oe[t]??"days"}}},{name:"bymonth",selector:{select:{multiple:!0,mode:"dropdown",options:ee}}},...this._lifecycleSchema()]}_oneshotSchema(){return[{name:"persist",selector:{boolean:{}}}]}_lifecycleSchema(){return[{name:"until",selector:{date:{}}},{name:"count",selector:{number:{min:1,mode:"box"}}},{name:"persist",selector:{boolean:{}}}]}render(){if(!this.open)return B;const t=!!this.item;return F`
      <ha-dialog .open=${this.open} @closed=${this._onClosed}>
        <ha-icon-button slot="headerNavigationIcon" data-dialog="close" class="header_button">
          <ha-icon icon="mdi:close"></ha-icon>
        </ha-icon-button>
        <span slot="headerTitle">${t?"Edit chore":"New chore"}</span>
        <div class="content">
          ${this._error?F`<ha-alert alert-type="error">${this._error}</ha-alert>`:B}
          <ha-form
            .hass=${this.hass}
            .data=${this._data}
            .schema=${this._topSchema()}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._onValueChanged}
          ></ha-form>
          ${"scheduled"===this._data.chore_type?this._renderDateTimeRow("dtstart","Start:"):"oneshot"===this._data.chore_type?this._renderDateTimeRow("due_datetime","Due:"):B}
          <ha-form
            .hass=${this.hass}
            .data=${this._data}
            .schema=${this._bodySchema()}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._onValueChanged}
          ></ha-form>
        </div>
        <div slot="footer" class="footer">
          <span>
            ${t?this._confirmDelete?F`<ha-button class="delete" ?disabled=${this._loading} @click=${this._onDelete}>Confirm delete</ha-button>`:F`<ha-button class="delete" appearance="plain" @click=${()=>this._confirmDelete=!0}>Delete</ha-button>`:B}
          </span>
          <ha-button ?disabled=${this._loading} @click=${this._onSubmit}>
            ${this._loading?"Saving...":t?"Save":"Create"}
          </ha-button>
        </div>
      </ha-dialog>
    `}_renderDateTimeRow(t,e){const i=String(this._data[t]??("dtstart"===t?this._todayStart():""));return F`
      <div class="start-label">${e}</div>
      <div class="start-row">
        <ha-date-input
          class="start-date"
          .locale=${this.hass.locale}
          .value=${i.slice(0,10)}
          .label=${" "}
          @value-changed=${e=>this._onDatePart(t,e)}
        ></ha-date-input>
        <ha-time-input
          class="start-time"
          .locale=${this.hass.locale}
          .value=${i?i.slice(11,19)||"08:00:00":""}
          .enableSecond=${!1}
          @value-changed=${e=>this._onTimePart(t,e)}
        ></ha-time-input>
      </div>
      <ha-form class="start-loader" .hass=${this.hass} .schema=${ne} .data=${{}}></ha-form>
    `}_onDatePart(t,e){const i=e.detail.value;if(!i)return;const o=String(this._data[t]??"").slice(11,19)||"08:00:00";this._data={...this._data,[t]:`${i} ${o}`}}_onTimePart(t,e){let i=e.detail.value;if(!i)return;5===i.length&&(i+=":00");const o=String(this._data[t]??"").slice(0,10)||this._todayStart().slice(0,10);this._data={...this._data,[t]:`${o} ${i}`}}_onValueChanged(t){const e=this._data,i={...t.detail.value};if("scheduled"!==i.chore_type||i.chore_type===e.chore_type||Xt.has(String(i.frequency))||(i.frequency="daily"),"scheduled"!==i.chore_type||i.dtstart||(i.dtstart=this._todayStart()),"scheduled"===i.chore_type&&i.frequency!==e.frequency){if(!("weekly"!==i.frequency||Array.isArray(i.byday)&&i.byday.length)){const t=this._parseDate(i.dtstart)??new Date;i.byday=[Qt[t.getDay()]]}"monthly"!==i.frequency||i.monthly_mode||(i.monthly_mode="monthday")}"oneshot"!==i.chore_type||i.chore_type===e.chore_type||i.due_datetime||(i.due_datetime=this._todayStart()),this._data=i}_buildPayload(){const t=this._data,e=String(t.chore_type??"scheduled"),i={chore_name:String(t.chore_name??"").trim(),description:String(t.description??"")};if(this.item?i.trigger_entity=t.trigger_entity??"":t.trigger_entity&&(i.trigger_entity=t.trigger_entity),i.assigned_to=Array.isArray(t.assigned_to)?t.assigned_to:[],this.item?(i.pending_period=t.pending_period??{},i.grace_period=t.grace_period??{}):(t.pending_period&&(i.pending_period=t.pending_period),t.grace_period&&(i.grace_period=t.grace_period)),"oneshot"===e)i.oneshot={due_datetime:t.due_datetime??null,persist:!!t.persist};else if("interval"===e){const e={frequency:t.frequency,persist:!!t.persist};e.interval=Number(t.interval??1),Array.isArray(t.bymonth)&&t.bymonth.length&&(e.bymonth=t.bymonth),this._applyLifecycle(e,t),i.interval=e}else i.scheduled=this._buildScheduledSelector(t);return i}_buildScheduledSelector(t){const e=String(t.frequency??"daily"),i={frequency:e,persist:!!t.persist};t.dtstart&&(i.dtstart=String(t.dtstart)),i.interval=Number(t.interval??1);const o=t.__snap??{},n=t=>Array.isArray(o[t])?o[t]:[];if("weekly"===e)Array.isArray(t.byday)&&t.byday.length&&(i.byday=t.byday);else if("monthly"===e){const e=this._datePart(t.dtstart)!==this._datePart(t.__dtstart0)||t.monthly_mode!==t.__mode0,o=n("byday"),s=n("bysetpos"),a=n("bymonthday");if(!e&&(o.length||s.length||a.length))"weekday"===t.monthly_mode?(o.length&&(i.byday=o),s.length&&(i.bysetpos=s)):a.length&&(i.bymonthday=a);else{const e=this._parseDate(t.dtstart)??new Date;"weekday"===t.monthly_mode?(i.byday=[Qt[e.getDay()]],i.bysetpos=[this._monthlySetpos(e)]):i.bymonthday=[e.getDate()]}}else"yearly"===e&&(n("byday").length&&(i.byday=n("byday")),n("bysetpos").length&&(i.bysetpos=n("bysetpos")),n("bymonthday").length&&(i.bymonthday=n("bymonthday")));return n("bymonth").length&&(i.bymonth=n("bymonth")),this._applyLifecycle(i,t),i}_applyLifecycle(t,e){e.until?t.until=e.until:e.count&&(t.count=Number(e.count))}_validate(){const t=this._data;if(!String(t.chore_name??"").trim())return"Name is required.";return"oneshot"!==String(t.chore_type??"scheduled")&&t.until&&t.count?"Set either an end date or a count, not both.":!this.item&&this.targets.length>1&&!t.target_entity?"Choose a list.":null}_target(){return this._data.target_entity??this.defaultTarget??this.item?.source_entity}async _onSubmit(){if(this._loading)return;const t=this._validate();if(t)return void(this._error=t);const e=this._target();if(e){this._loading=!0,this._error=void 0;try{const t=this._buildPayload(),i=!!this.item;await this.hass.callWS({type:"call_service",domain:Kt,service:i?"update_item":"create_item",service_data:{entity_id:e,...i?{item:this.item.uid}:{},...t}}),this.dispatchEvent(new CustomEvent("chore-saved",{bubbles:!0,composed:!0})),this.open=!1}catch(t){this._error=t instanceof Error?t.message:String(t),console.error("chore-edit-dialog: save failed",t)}finally{this._loading=!1}}else this._error="No target list available."}async _onDelete(){if(!this._loading&&this.item){this._loading=!0,this._error=void 0;try{await this.hass.callWS({type:"call_service",domain:Kt,service:"delete_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid}}),this.dispatchEvent(new CustomEvent("chore-saved",{bubbles:!0,composed:!0})),this.open=!1}catch(t){this._error=t instanceof Error?t.message:String(t),console.error("chore-edit-dialog: delete failed",t)}finally{this._loading=!1}}}_onClosed(){this.open=!1,this.dispatchEvent(new CustomEvent("edit-dialog-closed",{bubbles:!0,composed:!0}))}}ae.styles=a`
    ha-dialog {
      --ha-dialog-max-width: 460px;
    }
    .header_button {
      color: var(--secondary-text-color);
    }
    .content {
      padding: 8px 4px 0;
    }
    ha-alert {
      display: block;
      margin-bottom: 12px;
    }
    /* Start date + time, laid out like HA's calendar editor: a standalone
       "Start:" label above a row with a wider date field and a narrower time
       field. Raw ha-date-input / ha-time-input (not ha-form fields) so there's
       no reserved label/helper space to throw off the alignment. */
    .start-label {
      margin: 10px 0 2px;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--primary-text-color);
    }
    .start-row {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin: 0 0 8px;
    }
    .start-row .start-date {
      flex: 3;
      min-width: 0;
    }
    .start-row .start-time {
      flex: 2;
      min-width: 0;
    }
    /* Off-screen ha-form whose time selector force-registers ha-time-input,
       which HA only lazy-loads when a time selector is used. */
    .start-loader {
      display: none;
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 16px;
      border-top: 1px solid var(--divider-color);
    }
    .delete {
      --mdc-theme-primary: var(--error-color);
    }
  `,t([ht({attribute:!1})],ae.prototype,"hass",void 0),t([ht({type:Boolean})],ae.prototype,"open",void 0),t([ht({attribute:!1})],ae.prototype,"item",void 0),t([ht({attribute:!1})],ae.prototype,"targets",void 0),t([ht({attribute:!1})],ae.prototype,"defaultTarget",void 0),t([pt()],ae.prototype,"_data",void 0),t([pt()],ae.prototype,"_error",void 0),t([pt()],ae.prototype,"_loading",void 0),t([pt()],ae.prototype,"_confirmDelete",void 0),ut("chore-edit-dialog",ae);const re=[{name:"title",selector:{text:{}}}],le=[{key:"hide_completed",label:"Hide completed section"},{key:"hide_section_headers",label:"Hide section headings"},{key:"hide_card_background",label:"Hide card background"},{key:"allow_uncomplete",label:"Allow uncomplete"},{key:"hide_add_button",label:"Hide add button"},{key:"hide_edit_button",label:"Hide edit button"}],de=[{name:"update_interval",selector:{number:{min:10,max:600,step:10,mode:"box"}},default:60}],ce=[{key:"due_date_period",label:"Due-date period"},{key:"completed_period",label:"Completed period"}],he=[{value:"details",label:"Chore Details"},{value:"edit",label:"Edit Chore"},{value:"complete",label:"Complete Chore"},{value:"more-info",label:"More Info"},{value:"navigate",label:"Navigate"},{value:"url",label:"URL"},{value:"call-service",label:"Call Service"},{value:"none",label:"None"}],pe=[{name:"tap_action",selector:{select:{options:he,mode:"dropdown"}},default:"details"},{name:"hold_action",selector:{select:{options:he,mode:"dropdown"}},default:"none"},{name:"double_tap_action",selector:{select:{options:he,mode:"dropdown"}},default:"none"}],ue=[{name:"exclude",selector:{select:{multiple:!0,options:[{value:"overdue",label:"Overdue"},{value:"due",label:"Due"},{value:"pending",label:"Pending"},{value:"completed",label:"Completed"}]}}}],me={title:"Title",hide_completed:"Hide completed section",hide_section_headers:"Hide section headings",hide_card_background:"Hide card background",allow_uncomplete:"Allow uncomplete",hide_add_button:"Hide add button",hide_edit_button:"Hide edit button",update_interval:"Update interval (seconds)",tap_action:"Tap action",hold_action:"Hold action",double_tap_action:"Double-tap action",exclude:"Exclude statuses"};function _e(t){return"string"==typeof t?{entity:t}:{...t}}class ye extends rt{constructor(){super(...arguments),this._expandedEntities=new Set,this._computeLabel=t=>me[t.name]??t.name}setConfig(t){this._config={...t}}render(){if(!this.hass||!this._config)return F``;const t=(this._config.entities??[]).map(_e);return F`
      <div class="entities-header">
        <span>Entities</span>
      </div>
      ${t.map((t,e)=>{const i=(o=t.entity)?(o.split(".").pop()??o).replace(/_/g," ").replace(/\b\w/g,t=>t.toUpperCase()):"New entity";var o;const n=t.color??"",s=this._expandedEntities.has(e);return F`
          <ha-expansion-panel
            .expanded=${s}
            @expanded-changed=${t=>this._toggleExpanded(t,e)}
          >
            <div class="entity-header" slot="header">
              <span
                class="entity-color-dot"
                style="background-color: ${n?gt(n):"var(--primary-color)"}"
              ></span>
              <span class="entity-name">${i}</span>
            </div>
            <div class="entity-content">
              <ha-form
                class="entity-picker"
                .hass=${this.hass}
                .data=${{entity:t.entity}}
                .schema=${[{name:"entity",selector:{entity:{domain:"calendar",integration:"chore_calendar"}}}]}
                .computeLabel=${()=>""}
                @value-changed=${t=>this._entityChanged(t,e)}
              ></ha-form>
              <ha-form
                .hass=${this.hass}
                .data=${{color:t.color??""}}
                .schema=${[{name:"color",selector:{ui_color:{}}}]}
                .computeLabel=${()=>"List color"}
                @value-changed=${t=>this._colorChanged(t,e)}
              ></ha-form>
              <ha-form
                .hass=${this.hass}
                .data=${{exclude:t.exclude??[]}}
                .schema=${ue}
                .computeLabel=${this._computeLabel}
                @value-changed=${t=>this._excludeChanged(t,e)}
              ></ha-form>
              <button
                class="remove-btn"
                title="Remove entity"
                @click=${()=>this._removeEntity(e)}
                style="align-self: flex-end"
              >
                ✕ Remove
              </button>
            </div>
          </ha-expansion-panel>
        `})}
      ${0===t.length?F`<button class="add-btn" @click=${this._addEntity}>
            + Add entity
          </button>`:F`<button class="add-btn" @click=${this._addEntity}>
            + Add another entity
          </button>`}

      <div class="divider"></div>

      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${re}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._optionsChanged}
      ></ha-form>

      <div class="toggles">
        ${le.map(t=>F`
            <ha-formfield alignEnd spaceBetween .label=${t.label}>
              <ha-switch
                .checked=${!!this._config[t.key]}
                @change=${e=>this._toggleChanged(t.key,e)}
              ></ha-switch>
            </ha-formfield>
          `)}
      </div>

      <div class="period-group">
        ${ce.map(t=>this._renderPeriodRow(t.key,t.label))}
      </div>

      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${de}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._optionsChanged}
      ></ha-form>

      <div class="divider"></div>

      <ha-form
        .hass=${this.hass}
        .data=${this._actionsFormData()}
        .schema=${pe}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._actionsChanged}
      ></ha-form>
    `}_dispatch(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}_toggleExpanded(t,e){const i=t.detail.expanded,o=new Set(this._expandedEntities);i?o.add(e):o.delete(e),this._expandedEntities=o}_entityChanged(t,e){t.stopPropagation();const i=(this._config.entities??[]).map(_e);i[e]={...i[e],entity:t.detail.value.entity},this._config={...this._config,entities:i},this._dispatch()}_colorChanged(t,e){t.stopPropagation();const i=t.detail.value?.color,o=(this._config.entities??[]).map(_e);o[e]={...o[e],color:i||void 0},this._config={...this._config,entities:o},this._dispatch()}_excludeChanged(t,e){t.stopPropagation();const i=t.detail.value.exclude??[],o=(this._config.entities??[]).map(_e);o[e]={...o[e],exclude:i},this._config={...this._config,entities:o},this._dispatch()}_removeEntity(t){const e=(this._config.entities??[]).map(_e).filter((e,i)=>i!==t),i=new Set;for(const e of this._expandedEntities)e<t?i.add(e):e>t&&i.add(e-1);this._expandedEntities=i,this._config={...this._config,entities:e},this._dispatch()}_addEntity(){const t=[...(this._config.entities??[]).map(_e),{entity:""}],e=t.length-1,i=new Set(this._expandedEntities);i.add(e),this._expandedEntities=i,this._config={...this._config,entities:t},this._dispatch()}_actionToString(t){return t?.action??""}_actionsFormData(){return{tap_action:this._actionToString(this._config.tap_action)||"details",hold_action:this._actionToString(this._config.hold_action)||"none",double_tap_action:this._actionToString(this._config.double_tap_action)||"none"}}_actionsChanged(t){if(t.stopPropagation(),!this._config||!this.hass)return;const e=t.detail.value,i=t=>t?{action:t}:void 0;this._config={...this._config,tap_action:i(e.tap_action),hold_action:i(e.hold_action),double_tap_action:i(e.double_tap_action)},this._dispatch()}_renderPeriodRow(t,e){const i=this._config[t]??{},o=!(!i.days&&!i.hours),n=o?String(i.days??0):"",s=o?String(i.hours??0):"";return F`
      <div class="period-row">
        <span class="period-label">${e}</span>
        <div class="period-inputs">
          <ha-input
            appearance="outlined"
            type="number"
            min="0"
            max="365"
            placeholder="days"
            .value=${n}
            @change=${e=>this._setPeriod(t,"days",e.target.value)}
          ></ha-input>
          <ha-input
            appearance="outlined"
            type="number"
            min="0"
            max="23"
            placeholder="hours"
            .value=${s}
            @change=${e=>this._setPeriod(t,"hours",e.target.value)}
          ></ha-input>
        </div>
      </div>
    `}_setPeriod(t,e,i){if(!this._config)return;const o=Math.max(0,Math.floor(Number(i)||0)),n={...this._config[t]??{},[e]:o};n.days||delete n.days,n.hours||delete n.hours;const s=Object.keys(n).length>0;this._config={...this._config,[t]:s?n:void 0},this._dispatch()}_toggleChanged(t,e){if(!this._config)return;const i=e.target.checked;this._config={...this._config,[t]:i},this._dispatch()}_optionsChanged(t){t.stopPropagation(),this._config&&this.hass&&(this._config={...this._config,...t.detail.value},this._dispatch())}}ye.styles=a`
    .entities-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0 4px;
      font-size: 12px;
      font-weight: 500;
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    ha-expansion-panel {
      margin-bottom: 4px;
      --expansion-panel-summary-padding: 0 8px;
      --expansion-panel-content-padding: 0 8px 8px;
    }

    .entity-header {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    .entity-color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .entity-name {
      font-size: 14px;
      font-weight: 400;
      color: var(--primary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .entity-picker {
      min-width: 0;
    }

    .remove-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--secondary-text-color);
      padding: 4px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .remove-btn:hover {
      color: var(--error-color);
      background: var(--secondary-background-color);
    }

    .add-btn {
      width: 100%;
      padding: 8px;
      margin-top: 4px;
      background: none;
      border: 1px dashed var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: 8px;
      color: var(--primary-color);
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
    }

    .add-btn:hover {
      background: var(--secondary-background-color);
    }

    .divider {
      border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      margin: 12px 0;
    }

    .period-group {
      /* Matches ha-form's between-field rhythm so the bottom options form
         doesn't sit flush against the last period row. */
      margin-bottom: 16px;
    }

    .period-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }

    .period-label {
      flex: 1;
      font-size: 14px;
      color: var(--primary-text-color);
    }

    .period-inputs {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .period-inputs ha-input {
      width: 88px;
    }

    .toggles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
      column-gap: 16px;
      row-gap: 0;
      margin: 4px 0 16px;
    }

    .toggles ha-formfield {
      width: 100%;
      min-height: 40px;
    }
  `,t([ht({attribute:!1})],ye.prototype,"hass",void 0),t([pt()],ye.prototype,"_config",void 0),t([pt()],ye.prototype,"_expandedEntities",void 0),ut("chore-calendar-card-editor",ye);console.info("%c CHORE-CALENDAR-CARD %c v0.12.0 ","color: white; background: #4CAF50; font-weight: 700;","color: #4CAF50; background: white; font-weight: 700;");const ge=["overdue","due","pending","completed"];class fe extends rt{constructor(){super(...arguments),this._items=[],this._loading=!0,this._dialogOpen=!1,this._editOpen=!1,this._entityConfigs=[],this._connected=!1}static getConfigElement(){return document.createElement("chore-calendar-card-editor")}static getStubConfig(){return{entities:[]}}setConfig(t){if(!t.entities||0===t.entities.length)return this._configError="Please define at least one entity",void(this._config=t);this._configError=void 0,this._config=t,this._entityConfigs=t.entities.map((t,e)=>function(t,e){const i="string"==typeof t?{entity:t}:t;return{...i,color:i.color??_t[e%_t.length]}}(t,e)),t.hide_card_background?this.setAttribute("no-card-background",""):this.removeAttribute("no-card-background")}getCardSize(){return Math.max(3,this._items.length+1)}connectedCallback(){super.connectedCallback(),this._connected=!0,this._startPolling(),this._subscribeEvents()}disconnectedCallback(){super.disconnectedCallback(),this._connected=!1,this._stopPolling(),this._unsubscribeEvents()}updated(t){t.has("hass")&&this.hass&&this._loading&&this._refreshData()}async _refreshData(){var t;if(this.hass&&this._config)try{const e=[],i=this._entityConfigs.map(async t=>{const i=await this.hass.callWS({type:"call_service",domain:"chore_calendar",service:"get_items",service_data:{entity_id:t.entity},return_response:!0}),o=i.response?.items??[],n=i.response?.completed_cleared_at?new Date(i.response.completed_cleared_at).getTime():null,s=t.exclude??[];for(const i of o)s.includes(i.status)||null!==n&&"completed"===i.status&&i.last_completed&&new Date(i.last_completed).getTime()<n||e.push({...i,source_entity:t.entity,source_color:t.color})});await Promise.all(i);const o=wt(this._config.due_date_period),n=wt(this._config.completed_period),s=function(t,e,i,o){if(null===e&&null===i)return t;const n=o.getTime();return t.filter(t=>{if(null!==i&&"completed"===t.status&&t.last_completed&&n-new Date(t.last_completed).getTime()>i)return!1;if(null!==e&&"pending"===t.status){if(!t.next_due)return!1;if(new Date(t.next_due).getTime()-n>e)return!1}return!0})}(e,o,n,new Date);this._items=(t=s,[...t].sort((t,e)=>{const i=ft[t.status]-ft[e.status];if(0!==i)return i;if("completed"===t.status){const i=t.last_completed?new Date(t.last_completed).getTime():0;return(e.last_completed?new Date(e.last_completed).getTime():0)-i}return(t.next_due?new Date(t.next_due).getTime():1/0)-(e.next_due?new Date(e.next_due).getTime():1/0)}))}catch(t){console.error("chore-calendar-card: failed to fetch items",t)}finally{this._loading=!1}}_startPolling(){this._stopPolling();const t=1e3*(this._config?.update_interval??60);this._refreshTimer=setInterval(()=>{this._connected&&this._refreshData()},t)}_stopPolling(){void 0!==this._refreshTimer&&(clearInterval(this._refreshTimer),this._refreshTimer=void 0)}async _subscribeEvents(){if(this.hass?.connection)try{const t=new Set(this._entityConfigs.map(t=>t.entity));this._eventUnsub=await this.hass.connection.subscribeEvents(e=>{e.data?.entity_id&&t.has(e.data.entity_id)&&this._refreshData()},"state_changed")}catch{}}_unsubscribeEvents(){this._eventUnsub?.(),this._eventUnsub=void 0}render(){if(!this._config)return B;if(this._configError)return F`
        <ha-card>
          <div class="empty">${this._configError}</div>
        </ha-card>
      `;const t=this._config.title,e=!this._config.hide_add_button;return F`
      <ha-card
        @chore-detail=${this._onChoreDetail}
        @chore-edit=${this._onChoreEdit}
        @chore-completed=${this._onChoreCompleted}
      >
        ${t||e?F`
              <div class="header" part="header">
                ${t?F`<span class="title" part="title">${t}</span>`:F`<span></span>`}
                ${e?F`
                      <ha-icon-button class="add" part="add-button" title="Add chore" @click=${this._onAddChore}>
                        <ha-icon icon="mdi:plus"></ha-icon>
                      </ha-icon-button>
                    `:B}
              </div>
            `:B}
        ${this._loading?F`<div class="loading">Loading...</div>`:this._renderSections()}
      </ha-card>
      <chore-detail-dialog
        .hass=${this.hass}
        .item=${this._dialogItem}
        .open=${this._dialogOpen}
        .allowUncomplete=${!!this._config.allow_uncomplete}
        .allowEdit=${!this._config.hide_edit_button}
        @detail-dialog-closed=${this._onDialogClosed}
        @chore-edit=${this._onChoreEdit}
        @chore-completed=${this._onChoreCompleted}
        @chore-uncompleted=${this._onChoreCompleted}
        @chore-skipped=${this._onChoreCompleted}
      ></chore-detail-dialog>
      <chore-edit-dialog
        .hass=${this.hass}
        .item=${this._editItem}
        .open=${this._editOpen}
        .targets=${this._targetOptions()}
        .defaultTarget=${this._entityConfigs[0]?.entity}
        @edit-dialog-closed=${this._onEditClosed}
        @chore-saved=${this._onChoreSaved}
      ></chore-edit-dialog>
    `}_renderSections(){const t=function(t){const e=new Map;for(const i of t){let t=e.get(i.status);t||(t=[],e.set(i.status,t)),t.push(i)}return e}(this._items),e=!!this._config.hide_completed,i=!!this._config.hide_section_headers,o=ge.filter(i=>{const o=t.get(i);return!(!o||0===o.length)&&("completed"!==i||!e)});return 0===o.length?F`
        <div class="placeholder">
          <div class="placeholder-card">
            <div class="placeholder-row">No chores</div>
          </div>
        </div>
      `:F`
      ${o.map(e=>{const o=t.get(e);return F`
          ${i?B:F`<div class="section-header ${e}" part="section-header section-header-${e}">
                ${Rt[e]}
              </div>`}
          ${o.map(t=>F`
              <chore-row
                .hass=${this.hass}
                .item=${t}
                .tapAction=${this._config.tap_action??{action:"details"}}
                .holdAction=${this._config.hold_action??{action:"none"}}
                .doubleTapAction=${this._config.double_tap_action??{action:"none"}}
              ></chore-row>
            `)}
        `})}
    `}_onChoreDetail(t){this._dialogItem=t.detail.item,this._dialogOpen=!0}_onDialogClosed(){this._dialogOpen=!1}_onChoreCompleted(){this._dialogOpen=!1,this._refreshData()}_onAddChore(){this._editItem=void 0,this._editOpen=!0}_onChoreEdit(t){this._dialogOpen=!1,this._editItem=t.detail.item,this._editOpen=!0}_onEditClosed(){this._editOpen=!1}_onChoreSaved(){this._editOpen=!1,this._refreshData()}_targetOptions(){return this._entityConfigs.map(t=>({value:t.entity,label:this.hass?.states?.[t.entity]?.attributes?.friendly_name??t.entity}))}}fe.styles=a`
    :host {
      display: block;
    }

    ha-card {
      overflow: hidden;
      padding: 16px;
    }

    :host([no-card-background]) ha-card {
      background: none;
      box-shadow: none;
      border: none;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0 8px;
    }

    .title {
      font-size: 16px;
      font-weight: 500;
      color: var(--primary-text-color);
    }

    .header .add {
      margin: -8px -8px -8px 0;
      color: var(--secondary-text-color);
    }

    .section-header {
      padding: 8px 0 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-header.overdue {
      color: var(--error-color, #db4437);
    }

    .section-header.due {
      color: var(--warning-color, #ff9800);
    }

    .section-header.pending {
      color: var(--secondary-text-color);
    }

    .section-header.completed {
      color: var(--secondary-text-color);
      opacity: 0.7;
    }

    .empty {
      padding: 32px 0;
      text-align: center;
      color: var(--secondary-text-color);
      font-size: 14px;
    }

    .placeholder {
      margin-bottom: 5px;
    }

    .placeholder-card {
      background: var(--card-background-color, var(--ha-card-background, white));
      border-radius: 0 5px 5px 0;
      border-left: 5px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      overflow: hidden;
    }

    .placeholder-row {
      display: flex;
      align-items: center;
      padding: 10px;
      gap: 12px;
      font-size: 14px;
      color: var(--secondary-text-color);
      font-style: italic;
    }

    .loading {
      padding: 32px 0;
      text-align: center;
      color: var(--secondary-text-color);
      font-size: 14px;
    }

`,t([ht({attribute:!1})],fe.prototype,"hass",void 0),t([pt()],fe.prototype,"_config",void 0),t([pt()],fe.prototype,"_configError",void 0),t([pt()],fe.prototype,"_items",void 0),t([pt()],fe.prototype,"_loading",void 0),t([pt()],fe.prototype,"_dialogItem",void 0),t([pt()],fe.prototype,"_dialogOpen",void 0),t([pt()],fe.prototype,"_editItem",void 0),t([pt()],fe.prototype,"_editOpen",void 0),ut("chore-calendar-card",fe),window.customCards=window.customCards||[],window.customCards.push({type:"chore-calendar-card",name:"Chore Calendar",description:"Timeline view of chores from Chore Calendar lists",preview:!0});export{fe as ChoreCalendarCard};
