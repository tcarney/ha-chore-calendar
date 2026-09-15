function e(e,t,i,o){var n,s=arguments.length,a=s<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,i,o);else for(var r=e.length-1;r>=0;r--)(n=e[r])&&(a=(s<3?n(a):s>3?n(t,i,a):n(t,i))||a);return s>3&&a&&Object.defineProperty(t,i,a),a}"function"==typeof SuppressedError&&SuppressedError;const t=globalThis,i=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,o=Symbol(),n=new WeakMap;let s=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==o)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(i&&void 0===e){const i=void 0!==t&&1===t.length;i&&(e=n.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&n.set(t,e))}return e}toString(){return this.cssText}};const a=(e,...t)=>{const i=1===e.length?e[0]:t.reduce((t,i,o)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+e[o+1],e[0]);return new s(i,e,o)},r=i?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const i of e.cssRules)t+=i.cssText;return(e=>new s("string"==typeof e?e:e+"",void 0,o))(t)})(e):e,{is:l,defineProperty:d,getOwnPropertyDescriptor:c,getOwnPropertyNames:h,getOwnPropertySymbols:p,getPrototypeOf:u}=Object,m=globalThis,_=m.trustedTypes,g=_?_.emptyScript:"",y=m.reactiveElementPolyfillSupport,f=(e,t)=>e,v={toAttribute(e,t){switch(t){case Boolean:e=e?g:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=null!==e;break;case Number:i=null===e?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch(e){i=null}}return i}},b=(e,t)=>!l(e,t),$={attribute:!0,type:String,converter:v,reflect:!1,useDefault:!1,hasChanged:b};Symbol.metadata??=Symbol("metadata"),m.litPropertyMetadata??=new WeakMap;let w=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=$){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),o=this.getPropertyDescriptor(e,i,t);void 0!==o&&d(this.prototype,e,o)}}static getPropertyDescriptor(e,t,i){const{get:o,set:n}=c(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:o,set(t){const s=o?.call(this);n?.call(this,t),this.requestUpdate(e,s,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??$}static _$Ei(){if(this.hasOwnProperty(f("elementProperties")))return;const e=u(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(f("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(f("properties"))){const e=this.properties,t=[...h(e),...p(e)];for(const i of t)this.createProperty(i,e[i])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,i]of t)this.elementProperties.set(e,i)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const i=this._$Eu(e,t);void 0!==i&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const e of i)t.unshift(r(e))}else void 0!==e&&t.push(r(e));return t}static _$Eu(e,t){const i=t.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,o)=>{if(i)e.adoptedStyleSheets=o.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const i of o){const o=document.createElement("style"),n=t.litNonce;void 0!==n&&o.setAttribute("nonce",n),o.textContent=i.cssText,e.appendChild(o)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){const i=this.constructor.elementProperties.get(e),o=this.constructor._$Eu(e,i);if(void 0!==o&&!0===i.reflect){const n=(void 0!==i.converter?.toAttribute?i.converter:v).toAttribute(t,i.type);this._$Em=e,null==n?this.removeAttribute(o):this.setAttribute(o,n),this._$Em=null}}_$AK(e,t){const i=this.constructor,o=i._$Eh.get(e);if(void 0!==o&&this._$Em!==o){const e=i.getPropertyOptions(o),n="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:v;this._$Em=o;const s=n.fromAttribute(t,e.type);this[o]=s??this._$Ej?.get(o)??s,this._$Em=null}}requestUpdate(e,t,i,o=!1,n){if(void 0!==e){const s=this.constructor;if(!1===o&&(n=this[e]),i??=s.getPropertyOptions(e),!((i.hasChanged??b)(n,t)||i.useDefault&&i.reflect&&n===this._$Ej?.get(e)&&!this.hasAttribute(s._$Eu(e,i))))return;this.C(e,t,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:o,wrapped:n},s){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,s??t??this[e]),!0!==n||void 0!==s)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),!0===o&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,i]of e){const{wrapped:e}=i,o=this[t];!0!==e||this._$AL.has(t)||void 0===o||this.C(t,void 0,i,o)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};w.elementStyles=[],w.shadowRootOptions={mode:"open"},w[f("elementProperties")]=new Map,w[f("finalized")]=new Map,y?.({ReactiveElement:w}),(m.reactiveElementVersions??=[]).push("2.1.2");const x=globalThis,A=e=>e,S=x.trustedTypes,C=S?S.createPolicy("lit-html",{createHTML:e=>e}):void 0,E="$lit$",k=`lit$${Math.random().toFixed(9).slice(2)}$`,D="?"+k,T=`<${D}>`,P=document,O=()=>P.createComment(""),N=e=>null===e||"object"!=typeof e&&"function"!=typeof e,U=Array.isArray,H="[ \t\n\f\r]",M=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,L=/-->/g,R=/>/g,I=RegExp(`>|${H}(?:([^\\s"'>=/]+)(${H}*=${H}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),j=/'/g,z=/"/g,q=/^(?:script|style|textarea|title)$/i,F=(e=>(t,...i)=>({_$litType$:e,strings:t,values:i}))(1),W=Symbol.for("lit-noChange"),B=Symbol.for("lit-nothing"),V=new WeakMap,J=P.createTreeWalker(P,129);function Y(e,t){if(!U(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==C?C.createHTML(t):t}const K=(e,t)=>{const i=e.length-1,o=[];let n,s=2===t?"<svg>":3===t?"<math>":"",a=M;for(let t=0;t<i;t++){const i=e[t];let r,l,d=-1,c=0;for(;c<i.length&&(a.lastIndex=c,l=a.exec(i),null!==l);)c=a.lastIndex,a===M?"!--"===l[1]?a=L:void 0!==l[1]?a=R:void 0!==l[2]?(q.test(l[2])&&(n=RegExp("</"+l[2],"g")),a=I):void 0!==l[3]&&(a=I):a===I?">"===l[0]?(a=n??M,d=-1):void 0===l[1]?d=-2:(d=a.lastIndex-l[2].length,r=l[1],a=void 0===l[3]?I:'"'===l[3]?z:j):a===z||a===j?a=I:a===L||a===R?a=M:(a=I,n=void 0);const h=a===I&&e[t+1].startsWith("/>")?" ":"";s+=a===M?i+T:d>=0?(o.push(r),i.slice(0,d)+E+i.slice(d)+k+h):i+k+(-2===d?t:h)}return[Y(e,s+(e[i]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),o]};class Z{constructor({strings:e,_$litType$:t},i){let o;this.parts=[];let n=0,s=0;const a=e.length-1,r=this.parts,[l,d]=K(e,t);if(this.el=Z.createElement(l,i),J.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(o=J.nextNode())&&r.length<a;){if(1===o.nodeType){if(o.hasAttributes())for(const e of o.getAttributeNames())if(e.endsWith(E)){const t=d[s++],i=o.getAttribute(e).split(k),a=/([.?@])?(.*)/.exec(t);r.push({type:1,index:n,name:a[2],strings:i,ctor:"."===a[1]?te:"?"===a[1]?ie:"@"===a[1]?oe:ee}),o.removeAttribute(e)}else e.startsWith(k)&&(r.push({type:6,index:n}),o.removeAttribute(e));if(q.test(o.tagName)){const e=o.textContent.split(k),t=e.length-1;if(t>0){o.textContent=S?S.emptyScript:"";for(let i=0;i<t;i++)o.append(e[i],O()),J.nextNode(),r.push({type:2,index:++n});o.append(e[t],O())}}}else if(8===o.nodeType)if(o.data===D)r.push({type:2,index:n});else{let e=-1;for(;-1!==(e=o.data.indexOf(k,e+1));)r.push({type:7,index:n}),e+=k.length-1}n++}}static createElement(e,t){const i=P.createElement("template");return i.innerHTML=e,i}}function X(e,t,i=e,o){if(t===W)return t;let n=void 0!==o?i._$Co?.[o]:i._$Cl;const s=N(t)?void 0:t._$litDirective$;return n?.constructor!==s&&(n?._$AO?.(!1),void 0===s?n=void 0:(n=new s(e),n._$AT(e,i,o)),void 0!==o?(i._$Co??=[])[o]=n:i._$Cl=n),void 0!==n&&(t=X(e,n._$AS(e,t.values),n,o)),t}class G{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:i}=this._$AD,o=(e?.creationScope??P).importNode(t,!0);J.currentNode=o;let n=J.nextNode(),s=0,a=0,r=i[0];for(;void 0!==r;){if(s===r.index){let t;2===r.type?t=new Q(n,n.nextSibling,this,e):1===r.type?t=new r.ctor(n,r.name,r.strings,this,e):6===r.type&&(t=new ne(n,this,e)),this._$AV.push(t),r=i[++a]}s!==r?.index&&(n=J.nextNode(),s++)}return J.currentNode=P,o}p(e){let t=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}}class Q{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,i,o){this.type=2,this._$AH=B,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=o,this._$Cv=o?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=X(this,e,t),N(e)?e===B||null==e||""===e?(this._$AH!==B&&this._$AR(),this._$AH=B):e!==this._$AH&&e!==W&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>U(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==B&&N(this._$AH)?this._$AA.nextSibling.data=e:this.T(P.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:i}=e,o="number"==typeof i?this._$AC(e):(void 0===i.el&&(i.el=Z.createElement(Y(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===o)this._$AH.p(t);else{const e=new G(o,this),i=e.u(this.options);e.p(t),this.T(i),this._$AH=e}}_$AC(e){let t=V.get(e.strings);return void 0===t&&V.set(e.strings,t=new Z(e)),t}k(e){U(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let i,o=0;for(const n of e)o===t.length?t.push(i=new Q(this.O(O()),this.O(O()),this,this.options)):i=t[o],i._$AI(n),o++;o<t.length&&(this._$AR(i&&i._$AB.nextSibling,o),t.length=o)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=A(e).nextSibling;A(e).remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class ee{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,o,n){this.type=1,this._$AH=B,this._$AN=void 0,this.element=e,this.name=t,this._$AM=o,this.options=n,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=B}_$AI(e,t=this,i,o){const n=this.strings;let s=!1;if(void 0===n)e=X(this,e,t,0),s=!N(e)||e!==this._$AH&&e!==W,s&&(this._$AH=e);else{const o=e;let a,r;for(e=n[0],a=0;a<n.length-1;a++)r=X(this,o[i+a],t,a),r===W&&(r=this._$AH[a]),s||=!N(r)||r!==this._$AH[a],r===B?e=B:e!==B&&(e+=(r??"")+n[a+1]),this._$AH[a]=r}s&&!o&&this.j(e)}j(e){e===B?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class te extends ee{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===B?void 0:e}}class ie extends ee{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==B)}}class oe extends ee{constructor(e,t,i,o,n){super(e,t,i,o,n),this.type=5}_$AI(e,t=this){if((e=X(this,e,t,0)??B)===W)return;const i=this._$AH,o=e===B&&i!==B||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,n=e!==B&&(i===B||o);o&&this.element.removeEventListener(this.name,this,i),n&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class ne{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){X(this,e)}}const se=x.litHtmlPolyfillSupport;se?.(Z,Q),(x.litHtmlVersions??=[]).push("3.3.2");const ae=globalThis;let re=class extends w{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,i)=>{const o=i?.renderBefore??t;let n=o._$litPart$;if(void 0===n){const e=i?.renderBefore??null;o._$litPart$=n=new Q(t.insertBefore(O(),e),e,void 0,i??{})}return n._$AI(e),n})(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return W}};re._$litElement$=!0,re.finalized=!0,ae.litElementHydrateSupport?.({LitElement:re});const le=ae.litElementPolyfillSupport;le?.({LitElement:re}),(ae.litElementVersions??=[]).push("4.2.2");const de={attribute:!0,type:String,converter:v,reflect:!1,hasChanged:b},ce=(e=de,t,i)=>{const{kind:o,metadata:n}=i;let s=globalThis.litPropertyMetadata.get(n);if(void 0===s&&globalThis.litPropertyMetadata.set(n,s=new Map),"setter"===o&&((e=Object.create(e)).wrapped=!0),s.set(i.name,e),"accessor"===o){const{name:o}=i;return{set(i){const n=t.get.call(this);t.set.call(this,i),this.requestUpdate(o,n,e,!0,i)},init(t){return void 0!==t&&this.C(o,void 0,e,t),t}}}if("setter"===o){const{name:o}=i;return function(i){const n=this[o];t.call(this,i),this.requestUpdate(o,n,e,!0,i)}}throw Error("Unsupported decorator location: "+o)};function he(e){return(t,i)=>"object"==typeof i?ce(e,t,i):((e,t,i)=>{const o=t.hasOwnProperty(i);return t.constructor.createProperty(i,e),o?Object.getOwnPropertyDescriptor(t,i):void 0})(e,t,i)}function pe(e){return he({...e,state:!0,attribute:!1})}function ue(e,t){customElements.get(e)||customElements.define(e,t)}const me=(e,t,i,o)=>{o=o||{},i=null==i?{}:i;const n=new Event(t,{bubbles:void 0===o.bubbles||o.bubbles,cancelable:Boolean(o.cancelable),composed:void 0===o.composed||o.composed});return n.detail=i,e.dispatchEvent(n),n},_e=["blue","red","amber","green","orange","cyan","purple","pink"],ge=new Set(["primary","accent","red","pink","purple","deep-purple","indigo","blue","light-blue","cyan","teal","green","light-green","lime","yellow","amber","orange","deep-orange","brown","light-grey","grey","dark-grey","blue-grey","black","white"]);function ye(e){return ge.has(e)?`var(--${e}-color)`:e}const fe={overdue:0,due:1,pending:2,completed:3};const ve=6e4,be=36e5,$e=864e5;function we(e){if(!e)return null;const t=(e.days??0)*$e+(e.hours??0)*be+(e.minutes??0)*ve+1e3*(e.seconds??0);return t>0?t:null}function xe(e){const t=Math.abs(e);if(t<be){const e=Math.max(1,Math.round(t/ve));return`${e} minute${1!==e?"s":""}`}if(t<$e){const e=Math.round(t/be);return`${e} hour${1!==e?"s":""}`}const i=Math.round(t/$e);return`${i} day${1!==i?"s":""}`}function Ae(e){const t=e=>String(e).padStart(2,"0");return`${e.getFullYear()}-${t(e.getMonth()+1)}-${t(e.getDate())} ${t(e.getHours())}:${t(e.getMinutes())}:${t(e.getSeconds())}`}function Se(e){const t=String(e??"").trim();if(!t)return;const i=new Date(t.replace(" ","T"));return Number.isNaN(i.getTime())?void 0:i.toISOString()}function Ce(e,t,i){const o=new Date(e);return new Intl.DateTimeFormat(i,{month:"short",day:"numeric",...o.getFullYear()!==t.getFullYear()?{year:"numeric"}:{}}).format(o)}const Ee=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function ke(e){const t=Array.isArray(e)?e.map(Number).filter(e=>e>=1&&e<=12):[],i=new Set(t);if(0===i.size||i.size>=12)return"";const o=e=>(e-1+12)%12+1,n=[...i].filter(e=>!i.has(o(e-1)));if(1===n.length&&i.size>1){let e=n[0];for(;i.has(o(e+1));)e=o(e+1);return`${Ee[n[0]-1]}–${Ee[e-1]}`}return[...i].sort((e,t)=>e-t).map(e=>Ee[e-1]).join(", ")}function De(e,t=!1){return new Intl.DateTimeFormat(void 0,{month:"short",day:"numeric",year:"numeric",...t?{timeZone:"UTC"}:{}}).format(e)}function Te(e,t){let i=e?`, until ${e}`:"";const o=Number(t??0);return o>0&&(i+=`, ${o} time${1!==o?"s":""}`),i}const Pe={mon:"Monday",tue:"Tuesday",wed:"Wednesday",thu:"Thursday",fri:"Friday",sat:"Saturday",sun:"Sunday"},Oe={1:"first",2:"second",3:"third",4:"fourth",5:"fifth",[-1]:"last",[-2]:"second-to-last",[-3]:"third-to-last"};function Ne(e){return Array.isArray(e)?e.map(Number):null!=e?[Number(e)]:[]}function Ue(e){return(Array.isArray(e)?e:null!=e?[e]:[]).map(e=>{const t=/^([+-]?\d+)?([a-z]{3})$/.exec(String(e).toLowerCase());return t?{ordinal:t[1]?Number(t[1]):null,code:t[2]}:{ordinal:null,code:String(e)}})}function He(e){return Oe[e]??(e>0?Me(e):`${Me(-e)}-to-last`)}function Me(e){const t=e%100;return`${e}${t>=11&&t<=13?"th":["th","st","nd","rd"][e%10]??"th"}`}function Le(e,t){const i=e=>Pe[e]??e;return t.length?`${t.map(He).join(", ")} ${e.map(e=>i(e.code)).join(", ")}`:e.some(e=>null!=e.ordinal)?e.map(e=>null!=e.ordinal?`${He(e.ordinal)} ${i(e.code)}`:i(e.code)).join(", "):e.map(e=>i(e.code)).join(", ")}function Re(e,t){const i=function(e){const t=e.split(":").map(Number);if(t.length<2||t.some(Number.isNaN))return e;const i=new Date;return i.setHours(t[0],t[1],0,0),new Intl.DateTimeFormat(void 0,{hour:"numeric",minute:"2-digit"}).format(i)}(String(t??""));if(!e?.frequency)return`${String(t??"")}`.trim()?`At ${i}`:"";const o=e.frequency,n=Number(e.interval??1),s=Ue(e.byday),a=Ne(e.bysetpos),r=Ne(e.bymonthday),l=Ne(e.bymonth);let d;if("daily"===o)d=1===n?"Daily":`Every ${n} days`;else if("weekly"===o)if(1===n&&7===new Set(s.map(e=>e.code)).size)d="Daily";else if(s.length){const e=s.map(e=>Pe[e.code]??e.code).join(", ");d=1===n?e:`Every ${n} weeks on ${e}`}else d=1===n?"Weekly":`Every ${n} weeks`;else if("monthly"===o){const e=1===n?"Monthly":`Every ${n} months`;if(s.length){const t=Le(s,a);d=1===n?(c=t).charAt(0).toUpperCase()+c.slice(1):`${e} on the ${t}`}else d=r.length?`${e} on the ${r.map(e=>-1===e?"last day":Me(e)).join(", ")}`:e}else if("yearly"===o){let e=1===n?"Annually":`Every ${n} years`;l.length&&(e+=` in ${l.map(e=>Ee[e-1]).join(", ")}`),s.length?e+=` on the ${Le(s,a)}`:r.length&&(e+=` on the ${r.map(e=>-1===e?"last day":Me(e)).join(", ")}`),d=e}else d=o;var c;let h="";if("yearly"!==o){const e=ke(l);e&&(h+=`, ${e}`)}return h+=Te(e.until?De(new Date(String(e.until))):"",e.count),`${d} at ${i}${h}`}const Ie={minutely:"minute",hourly:"hour",daily:"day",weekly:"week",monthly:"month",yearly:"year"};function je(e,t){if("string"==typeof e)return e;if("rrule"in e)return Re(t,e.time);if("freq"in e)return function(e){const t=Ie[String(e.freq)]??String(e.freq),i=Number(e.interval??1);let o=1===i?`Every ${t}`:`Every ${i} ${t}s`;const n=ke(e.bymonth);return n&&(o+=`, ${n}`),o+Te(e.until?De(new Date(String(e.until))):"",e.count)}(e);if("due_datetime"in e){const t=e.due_datetime;if(!t)return"Unscheduled";const i=new Date(t);return`${new Intl.DateTimeFormat(void 0,{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(i)}`}return JSON.stringify(e)}const ze={overdue:"Overdue",due:"Due",pending:"Upcoming",completed:"Completed"};function qe(e){return void 0!==e&&"none"!==e.action}const Fe=e=>(...t)=>({_$litDirective$:e,values:t});class We{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,i){this._$Ct=e,this._$AM=t,this._$Ci=i}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}}const Be="ontouchstart"in window||navigator.maxTouchPoints>0;class Ve extends HTMLElement{constructor(){super(...arguments),this.holdTime=500,this.held=!1,this.cancelled=!1}connectedCallback(){Object.assign(this.style,{position:"fixed",width:Be?"100px":"50px",height:Be?"100px":"50px",transform:"translate(-50%, -50%) scale(0)",pointerEvents:"none",zIndex:"999",background:"var(--primary-color)",display:null,opacity:"0.2",borderRadius:"50%",transition:"transform 180ms ease-in-out"}),["touchcancel","mouseout","mouseup","touchmove","mousewheel","wheel","scroll"].forEach(e=>{document.addEventListener(e,()=>{this.cancelled=!0,this.timer&&(this._stopAnimation(),clearTimeout(this.timer),this.timer=void 0)},{passive:!0})})}bind(e,t={}){e.actionHandler&&JSON.stringify(t)===JSON.stringify(e.actionHandler.options)||(e.actionHandler?(e.removeEventListener("touchstart",e.actionHandler.start),e.removeEventListener("touchend",e.actionHandler.end),e.removeEventListener("touchcancel",e.actionHandler.end),e.removeEventListener("mousedown",e.actionHandler.start),e.removeEventListener("click",e.actionHandler.end),e.removeEventListener("keydown",e.actionHandler.handleKeyDown)):e.addEventListener("contextmenu",e=>{const t=e||window.event;return t.preventDefault&&t.preventDefault(),t.stopPropagation&&t.stopPropagation(),!1}),e.actionHandler={options:t},t.disabled||(e.actionHandler.start=e=>{let i,o;this.cancelled=!1,e.touches?(i=e.touches[0].clientX,o=e.touches[0].clientY):(i=e.clientX,o=e.clientY),t.hasHold&&(this.held=!1,this.timer=window.setTimeout(()=>{this._startAnimation(i,o),this.held=!0},this.holdTime))},e.actionHandler.end=e=>{if("touchcancel"===e.type||"touchend"===e.type&&this.cancelled)return;const i=e.target;e.cancelable&&e.preventDefault(),t.hasHold&&(clearTimeout(this.timer),this._stopAnimation(),this.timer=void 0),t.hasHold&&this.held?me(i,"action",{action:"hold"}):t.hasDoubleClick?"click"===e.type&&e.detail<2||!this.dblClickTimeout?this.dblClickTimeout=window.setTimeout(()=>{this.dblClickTimeout=void 0,me(i,"action",{action:"tap"})},250):(clearTimeout(this.dblClickTimeout),this.dblClickTimeout=void 0,me(i,"action",{action:"double_tap"})):me(i,"action",{action:"tap"})},e.actionHandler.handleKeyDown=e=>{["Enter"," "].includes(e.key)&&e.currentTarget.actionHandler.end(e)},e.addEventListener("touchstart",e.actionHandler.start,{passive:!0}),e.addEventListener("touchend",e.actionHandler.end),e.addEventListener("touchcancel",e.actionHandler.end),e.addEventListener("mousedown",e.actionHandler.start,{passive:!0}),e.addEventListener("click",e.actionHandler.end),e.addEventListener("keydown",e.actionHandler.handleKeyDown)))}_startAnimation(e,t){Object.assign(this.style,{left:`${e}px`,top:`${t}px`,transform:"translate(-50%, -50%) scale(1)"})}_stopAnimation(){Object.assign(this.style,{left:null,top:null,transform:"translate(-50%, -50%) scale(0)"})}}const Je=(e,t)=>{const i=(()=>{const e=document.body;if(e.querySelector("action-handler"))return e.querySelector("action-handler");customElements.get("action-handler")||customElements.define("action-handler",Ve);const t=document.createElement("action-handler");return e.appendChild(t),t})();i&&i.bind(e,t)},Ye=Fe(class extends We{update(e,[t]){return Je(e.element,t),W}render(e){}}),Ke={overdue:"✗",due:"●",pending:"○",completed:"✓"};class Ze extends re{render(){const e=new Date,t=function(e,t){switch(e.status){case"overdue":if(e.next_due){const i="object"==typeof e.schedule&&null!==e.schedule?Number(e.schedule.grace_period_mins??0):0,o=new Date(e.next_due).getTime()+i*ve,n=t.getTime()-o;return n>0?`Overdue by ${xe(n)}`:"Overdue"}return"Overdue";case"due":return"Due";case"pending":if(e.next_due){const i=new Date(e.next_due).getTime()-t.getTime();return i>0?`in ${xe(i)}`:"Pending"}return"Pending";case"completed":return""}}(this.item,e);return F`
      <div
        class="chore"
        part="chore"
        style="--border-color: ${ye(this.item.source_color)}"
        ${Ye({hasHold:qe(this.holdAction),hasDoubleClick:qe(this.doubleTapAction)})}
        @action=${this._handleAction}
      >
        <span class="status-indicator">${Ke[this.item.status]}</span>
        <span class="name">${this.item.chore_name}</span>
        ${this._renderAssignees()}
        <span class="time">${t}</span>
      </div>
    `}_renderAssignees(){const e=this.item.assigned_to??[];return 0===e.length?B:F`
      <span class="assignees" part="assignees">
        ${e.map(e=>{const t=this.hass?.states?.[e],i=t?.attributes?.friendly_name??e.split(".").pop()??e,o=t?.attributes?.entity_picture,n=t?.attributes?.icon;return o?F`<span class="avatar" title=${i} style="background-image: url('${o}')"></span>`:n?F`
              <span class="icon" title=${i}>
                <ha-icon .icon=${n}></ha-icon>
              </span>
            `:F`<span class="avatar initial" title=${i}>${i.charAt(0).toUpperCase()}</span>`})}
      </span>
    `}_handleAction(e){let t;switch(e.detail.action){case"tap":t=this.tapAction;break;case"hold":t=this.holdAction;break;case"double_tap":t=this.doubleTapAction}!async function(e,t,i,o){if(i&&"none"!==i.action)switch(i.action){case"details":me(e,"chore-detail",{item:o});break;case"edit":me(e,"chore-edit",{item:o});break;case"complete":try{await t.callWS({type:"call_service",domain:"chore_calendar",service:"complete_item",service_data:{entity_id:o.source_entity,item:o.uid}}),me(e,"chore-completed",{item:o})}catch(e){console.error("chore-calendar-card: failed to complete chore",e)}break;default:me(e,"hass-action",{config:{entity:o.source_entity,tap_action:i,hold_action:i,double_tap_action:i},action:"tap"})}}(this,this.hass,t,this.item)}connectedCallback(){super.connectedCallback(),this._syncStatusAttribute()}updated(){this._syncStatusAttribute()}_syncStatusAttribute(){this.setAttribute("status",this.item.status)}}Ze.styles=a`
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

    .assignees {
      display: flex;
      flex-shrink: 0;
      align-items: center;
    }

    .assignees .avatar {
      box-sizing: border-box;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background-size: cover;
      background-position: center;
      /* Card-background ring separates overlapping avatars in a stack. */
      border: 2px solid var(--card-background-color, var(--ha-card-background, white));
    }

    .assignees .avatar + .avatar {
      margin-left: -7px;
    }

    .assignees .initial {
      display: flex;
      align-items: center;
      justify-content: center;
      /* --border-color is the row's list color, set inline on .chore. */
      background: var(--border-color, var(--primary-color, #03a9f4));
      color: var(--text-primary-color, white);
      font-size: 10px;
      font-weight: 500;
      line-height: 1;
    }

    /* Icon fallback: bare icon, no photo-style disc. */
    .assignees .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      color: var(--border-color, var(--primary-color, #03a9f4));
      --mdc-icon-size: 18px;
    }

    .assignees .icon ha-icon {
      display: flex;
      line-height: 0;
    }

    :host([status="completed"]) .chore {
      opacity: 0.6;
    }

    :host([status="overdue"]) .time {
      color: var(--error-color, #db4437);
    }
  `,e([he({attribute:!1})],Ze.prototype,"hass",void 0),e([he({attribute:!1})],Ze.prototype,"item",void 0),e([he({attribute:!1})],Ze.prototype,"tapAction",void 0),e([he({attribute:!1})],Ze.prototype,"holdAction",void 0),e([he({attribute:!1})],Ze.prototype,"doubleTapAction",void 0),ue("chore-row",Ze);const Xe=Fe(class extends We{update(e,[t]){return function(e,t){if(e._holdAction)return void(e._holdAction.options=t);const i={options:t,fired:!1};e._holdAction=i;const o=()=>{void 0!==i.timer&&(clearTimeout(i.timer),i.timer=void 0)};e.addEventListener("pointerdown",e=>{!i.options.disabled&&e.isPrimary&&0===e.button&&(i.fired=!1,o(),i.timer=window.setTimeout(()=>{i.timer=void 0,i.fired=!0,i.options.hold()},500))});for(const t of["pointerup","pointercancel","pointerleave"])e.addEventListener(t,o);e.addEventListener("touchend",e=>{i.fired&&e.cancelable&&e.preventDefault()}),e.addEventListener("click",e=>{if(!i.options.disabled)return i.fired?(i.fired=!1,e.preventDefault(),void e.stopPropagation()):void i.options.tap()}),e.addEventListener("contextmenu",e=>e.preventDefault())}(e.element,t),W}render(e){}}),Ge="chore_calendar";class Qe extends re{constructor(){super(...arguments),this.open=!1,this.allowUncomplete=!1,this.allowEdit=!0,this._loading=!1}render(){if(!this.item)return B;const e="completed"===this.item.status,t=!e||this.allowUncomplete&&!!this.item.last_completed,i=this.allowEdit||t;return F`
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
                  ${e?t?F`
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
                          title="Tap to skip to the next occurrence, hold to pick a date"
                          ${Xe({tap:()=>this._onSkip(),hold:()=>this._openSkipDialog(),disabled:this._loading})}
                        >
                          ${this._loading?"Skipping...":"Skip"}
                        </ha-button>
                        <ha-button
                          ?disabled=${this._loading}
                          title="Tap to complete now, hold to set time and person"
                          ${Xe({tap:()=>this._onComplete(),hold:()=>this._openCompleteDialog(),disabled:this._loading})}
                        >
                          ${this._loading?"Completing...":"Complete"}
                        </ha-button>
                      `}
                </span>
              </div>
            `:B}
      </ha-dialog>
    `}_renderDetails(){const{item:e}=this;if(!e)return B;const t=this.hass?.language??"en",i=new Date;return F`
      ${this._renderListRow()}

      <div class="schedule">
        <ha-icon icon="mdi:calendar-clock"></ha-icon>
        <div class="info">${je(e.schedule,e.selector)}</div>
      </div>

      ${e.assigned_to.length>0?F`
            <div class="assigned">
              <ha-icon icon=${e.assigned_to.length>1?"mdi:account-multiple":"mdi:account"}></ha-icon>
              <div class="info">
                ${e.assigned_to.map(e=>this._resolveEntityName(e)).join(", ")}
              </div>
            </div>
          `:B}

      ${e.trigger_entity?F`
            <div class="trigger">
              <ha-icon icon="mdi:nfc-tap"></ha-icon>
              <div class="info">${this._resolveEntityName(e.trigger_entity)}</div>
            </div>
          `:B}

      ${e.missed_count>0?F`
            <div class="missed">
              <ha-icon icon="mdi:calendar-alert"></ha-icon>
              <div class="info">${this._formatMissed(e,i,t)}</div>
            </div>
            ${e.upcoming_due?F`
                  <div class="upcoming">
                    <ha-icon icon="mdi:calendar-arrow-right"></ha-icon>
                    <div class="info">
                      ${function(e,t){if(!e.upcoming_due)return"Upcoming";const i="object"==typeof e.schedule&&null!==e.schedule?e.schedule:{},o=Number(i.pending_period_mins??0),n=new Date(e.upcoming_due).getTime();return t.getTime()<n-o*ve?"Upcoming":t.getTime()<n?"Pending":"Due"}(e,i)}: ${Ce(e.upcoming_due,i,t)}
                    </div>
                  </div>
                `:B}
          `:B}

      ${e.last_completed?F`
            <div class="last-completed">
              <ha-icon icon="mdi:check-circle-outline"></ha-icon>
              <div class="info">
                ${function(e,t,i){const o=new Date(e),n=Math.floor((t.getTime()-o.getTime())/$e);return 0===n?new Intl.DateTimeFormat(i,{hour:"numeric",minute:"2-digit"}).format(o):1===n?"Yesterday":n<7?new Intl.DateTimeFormat(i,{weekday:"long"}).format(o):new Intl.DateTimeFormat(i,{month:"short",day:"numeric"}).format(o)}(e.last_completed,i,t)}${e.last_completed_by?` by ${this._resolveEntityName(e.last_completed_by)}`:""}
              </div>
            </div>
          `:B}

      ${e.description?F`<div class="description">${e.description}</div>`:B}
    `}_formatMissed(e,t,i){const o=e.missed_occurrences.map(e=>Ce(e,t,i)),n=e.missed_count>o.length?"…, ":"";return`${e.missed_count} missed: ${n}${o.join(", ")}`}_renderListRow(){const e=this.item?.source_entity;if(!e)return B;const t=this.hass?.states?.[e],i=t?.attributes?.friendly_name??e;return F`
      <div class="calendar">
        <ha-state-icon
          .hass=${this.hass}
          .stateObj=${t}
        ></ha-state-icon>
        <div class="info">${i}</div>
      </div>
    `}_openCompleteDialog(){this.item&&me(this,"chore-complete-details",{item:this.item})}async _onComplete(){if(this.item&&!this._loading){this._loading=!0;try{await this.hass.callWS({type:"call_service",domain:Ge,service:"complete_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid}}),this.dispatchEvent(new CustomEvent("chore-completed",{detail:{item:this.item},bubbles:!0,composed:!0}))}catch(e){console.error("chore-detail-dialog: failed to complete chore",e)}finally{this._loading=!1}}}_openSkipDialog(){this.item&&me(this,"chore-skip-details",{item:this.item})}async _onSkip(){if(this.item&&!this._loading){this._loading=!0;try{await this.hass.callWS({type:"call_service",domain:Ge,service:"skip_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid}}),this.dispatchEvent(new CustomEvent("chore-skipped",{detail:{item:this.item},bubbles:!0,composed:!0}))}catch(e){console.error("chore-detail-dialog: failed to skip chore",e)}finally{this._loading=!1}}}async _onUncomplete(){if(this.item&&!this._loading){this._loading=!0;try{await this.hass.callWS({type:"call_service",domain:Ge,service:"uncomplete_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid}}),this.dispatchEvent(new CustomEvent("chore-uncompleted",{detail:{item:this.item},bubbles:!0,composed:!0}))}catch(e){console.error("chore-detail-dialog: failed to uncomplete chore",e)}finally{this._loading=!1}}}_resolveEntityName(e){const t=this.hass?.states?.[e];return t?.attributes?.friendly_name??e}_onEdit(){this.item&&this.dispatchEvent(new CustomEvent("chore-edit",{detail:{item:this.item},bubbles:!0,composed:!0}))}_onClosed(){this.dispatchEvent(new CustomEvent("detail-dialog-closed",{bubbles:!0,composed:!0}))}}Qe.styles=a`
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

    /* The missed list is the one row allowed to wrap: clipping it would hide
       the most recent entries. */
    .content > div.missed .info {
      white-space: normal;
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
  `,e([he({attribute:!1})],Qe.prototype,"hass",void 0),e([he({attribute:!1})],Qe.prototype,"item",void 0),e([he({type:Boolean})],Qe.prototype,"open",void 0),e([he({type:Boolean,attribute:"allow-uncomplete"})],Qe.prototype,"allowUncomplete",void 0),e([he({type:Boolean,attribute:"allow-edit"})],Qe.prototype,"allowEdit",void 0),e([pe()],Qe.prototype,"_loading",void 0),ue("chore-detail-dialog",Qe);const et="08:00:00",tt=a`
  /* Date + time laid out like HA's calendar event editor, down to the label
     typography and the growing date field with a content-sized time field
     16px after it. Raw ha-date-input / ha-time-input rather than an ha-form
     datetime selector, whose reserved label and helper space throws the row
     out of line. */
  .datetime-label {
    margin: 10px 0 2px;
    font-size: var(--ha-font-size-s, 12px);
    font-weight: var(--ha-font-weight-medium, 500);
    color: var(--input-label-ink-color, rgba(0, 0, 0, 0.6));
  }
  .datetime-row {
    display: flex;
    justify-content: space-between;
    margin: 0 0 8px;
  }
  .datetime-row .datetime-date {
    flex-grow: 1;
    min-width: 0;
  }
  .datetime-row .datetime-time {
    margin-left: 16px;
    margin-inline-start: 16px;
    margin-inline-end: initial;
  }
  /* Off-screen ha-form whose selectors force-register ha-date-input and
     ha-time-input, which HA only lazy-loads when a matching selector is
     rendered by an ha-form. */
  .picker-loader {
    display: none;
  }
`,it=[{name:"_t",selector:{time:{}}},{name:"_d",selector:{date:{}}}];function ot(e){const{label:t,value:i,locale:o,onDate:n,onTime:s}=e;return F`
    <div class="datetime-label">${t}</div>
    <div class="datetime-row">
      <ha-date-input
        class="datetime-date"
        .locale=${o}
        .value=${i.slice(0,10)}
        @value-changed=${n}
      ></ha-date-input>
      <ha-time-input
        class="datetime-time"
        .locale=${o}
        .value=${i?i.slice(11,19)||et:""}
        .enableSecond=${!1}
        @value-changed=${s}
      ></ha-time-input>
    </div>
  `}function nt(e,t){return`${t} ${String(e??"").slice(11,19)||et}`}function st(e,t){const i=5===t.length?`${t}:00`:t;return`${String(e??"").slice(0,10)||Ae(new Date).slice(0,10)} ${i}`}const at="chore_calendar",rt=[{value:"daily",label:"Daily"},{value:"weekly",label:"Weekly"},{value:"monthly",label:"Monthly"},{value:"yearly",label:"Yearly"}],lt=new Set(rt.map(e=>e.value)),dt=[{value:"minutely",label:"Minutely"},{value:"hourly",label:"Hourly"},{value:"daily",label:"Daily"},{value:"weekly",label:"Weekly"},{value:"monthly",label:"Monthly"},{value:"yearly",label:"Yearly"}],ct=["sun","mon","tue","wed","thu","fri","sat"],ht=["mon","tue","wed","thu","fri","sat","sun"].map(e=>({value:e,label:Pe[e]})),pt=["January","February","March","April","May","June","July","August","September","October","November","December"].map((e,t)=>({value:String(t+1),label:e})),ut={daily:"days",weekly:"weeks",monthly:"months"},mt={minutely:"minutes",hourly:"hours",daily:"days",weekly:"weeks",monthly:"months",yearly:"years"},_t={target_entity:"List",chore_name:"Name",description:"Description",chore_type:"Type",dtstart:"Start",byday:"Repeat on",monthly_mode:"Repeat monthly",bymonth:"Only in months",due_datetime:"Due",until:"Until (end date)",count:"Or after N times",persist:"Keep when finished",pending_period:"Pending period",grace_period:"Grace period",trigger_entity:"Trigger tag",assigned_to:"Assigned to"};class gt extends re{constructor(){super(...arguments),this.open=!1,this.targets=[],this._data={},this._loading=!1,this._confirmDelete=!1,this._computeLabel=e=>"frequency"===e.name?"scheduled"===this._data.chore_type?"Repeat":"Frequency":"interval"===e.name?"scheduled"===this._data.chore_type?"Repeat every":"Repeat after":_t[e.name]??e.name}willUpdate(e){if(e.has("open")||e.has("item")){const e=this.open?this.item?.uid??"create":void 0;e&&e!==this._seededFor&&(this._seededFor=e,this._data=this.item?this._dataFromItem(this.item):this._defaults(),this._error=void 0,this._confirmDelete=!1),this.open||(this._seededFor=void 0)}}_defaults(){return{chore_type:"scheduled",frequency:"daily",interval:1,dtstart:this._todayStart(),persist:!1,...this.targets.length>1?{}:{target_entity:this.defaultTarget}}}_todayStart(){const e=new Date;return e.setHours(8,0,0,0),Ae(e)}_parseDate(e){if(!e)return null;const t=new Date(String(e).replace(" ","T"));return Number.isNaN(t.getTime())?null:t}_datePart(e){return String(e??"").slice(0,10)}_daysInMonth(e){return new Date(e.getFullYear(),e.getMonth()+1,0).getDate()}_monthlySetpos(e){return e.getDate()+7>this._daysInMonth(e)?-1:Math.ceil(e.getDate()/7)}_monthlyOptions(){const e=this._parseDate(this._data.dtstart)??new Date,t=e.getDate(),i=this._monthlySetpos(e);return[{value:"monthday",label:`Monthly on the ${Me(t)}`},{value:"weekday",label:`Monthly on the ${He(i)} ${Pe[ct[e.getDay()]]}`}]}_dataFromItem(e){const t=e.selector??{},i="object"==typeof e.schedule&&e.schedule||{},o={chore_name:e.chore_name,description:e.description??"",chore_type:e.chore_type,trigger_entity:e.trigger_entity??void 0,assigned_to:e.assigned_to,target_entity:e.source_entity,persist:t.persist??!1,pending_period:this._minsToDuration(i.pending_period_mins),grace_period:this._minsToDuration(i.grace_period_mins)};if("oneshot"===e.chore_type)o.due_datetime=t.due_datetime??void 0;else if("interval"===e.chore_type)o.frequency=t.frequency??"daily",o.interval=t.interval??1,o.bymonth=(t.bymonth??[]).map(String),o.until=t.until?String(t.until).slice(0,10):void 0,o.count=t.count;else{o.frequency=t.frequency??"daily",o.interval=t.interval??1,o.dtstart=t.dtstart?String(t.dtstart).replace("T"," ").slice(0,19):this._todayStart();const e=Ue(t.byday);o.byday=e.map(e=>e.code);const i=e.some(e=>null!=e.ordinal);o.monthly_mode=t.bymonthday?.length?"monthday":t.bysetpos?.length||i?"weekday":"monthday",o.until=t.until?String(t.until).slice(0,10):void 0,o.count=t.count,o.__snap={byday:t.byday??[],bysetpos:t.bysetpos??[],bymonthday:t.bymonthday??[],bymonth:t.bymonth??[]},o.__dtstart0=o.dtstart,o.__mode0=o.monthly_mode}return o}_minsToDuration(e){const t=Number(e??0);if(t)return{days:Math.floor(t/1440),hours:Math.floor(t%1440/60),minutes:t%60,seconds:0}}_topSchema(){const e=[];return!this.item&&this.targets.length>1&&e.push({name:"target_entity",required:!0,selector:{select:{mode:"dropdown",options:this.targets}}}),e.push({name:"chore_name",required:!0,selector:{text:{}}}),e.push({name:"description",selector:{text:{multiline:!0}}}),e.push({name:"chore_type",required:!0,selector:{select:{mode:"dropdown",options:[{value:"scheduled",label:"Scheduled"},{value:"interval",label:"Interval"},{value:"oneshot",label:"One-time"}]}}}),e}_recurrenceSchema(){const e=String(this._data.chore_type??"scheduled");return"scheduled"===e?this._scheduledSchema():"interval"===e?this._intervalSchema():[]}_tailSchema(){const e=[];return"oneshot"!==String(this._data.chore_type??"scheduled")&&e.push({name:"count",selector:{number:{min:1,mode:"box"}}}),e.push({name:"persist",selector:{boolean:{}}}),e.push({name:"pending_period",selector:{duration:{}}}),e.push({name:"grace_period",selector:{duration:{}}}),e.push({name:"trigger_entity",selector:{entity:{filter:{domain:"tag"}}}}),e.push({name:"assigned_to",selector:{entity:{multiple:!0,filter:{domain:"person"}}}}),e}_scheduledSchema(){const e=String(this._data.frequency??"daily"),t=[{name:"frequency",required:!0,selector:{select:{mode:"dropdown",options:rt}}}];return"yearly"!==e&&t.push({name:"interval",selector:{number:{min:1,mode:"box",unit_of_measurement:ut[e]??"days"}}}),"weekly"===e&&t.push({name:"byday",selector:{select:{multiple:!0,mode:"list",options:ht}}}),"monthly"===e&&t.push({name:"monthly_mode",selector:{select:{mode:"dropdown",options:this._monthlyOptions()}}}),t}_intervalSchema(){const e=String(this._data.frequency??"daily");return[{name:"frequency",required:!0,selector:{select:{mode:"dropdown",options:dt}}},{name:"interval",selector:{number:{min:1,mode:"box",unit_of_measurement:mt[e]??"days"}}},{name:"bymonth",selector:{select:{multiple:!0,mode:"dropdown",options:pt}}}]}render(){if(!this.open)return B;const e=!!this.item;return F`
      <ha-dialog .open=${this.open} @closed=${this._onClosed}>
        <ha-icon-button slot="headerNavigationIcon" data-dialog="close" class="header_button">
          <ha-icon icon="mdi:close"></ha-icon>
        </ha-icon-button>
        <span slot="headerTitle">${e?"Edit chore":"New chore"}</span>
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
            .schema=${this._recurrenceSchema()}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._onValueChanged}
          ></ha-form>
          ${"oneshot"!==this._data.chore_type?this._renderUntilRow():B}
          <ha-form
            .hass=${this.hass}
            .data=${this._data}
            .schema=${this._tailSchema()}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._onValueChanged}
          ></ha-form>
          <ha-form class="picker-loader" .hass=${this.hass} .schema=${it} .data=${{}}></ha-form>
        </div>
        <div slot="footer" class="footer">
          <span>
            ${e?this._confirmDelete?F`<ha-button class="delete" ?disabled=${this._loading} @click=${this._onDelete}>Confirm delete</ha-button>`:F`<ha-button class="delete" appearance="plain" @click=${()=>this._confirmDelete=!0}>Delete</ha-button>`:B}
          </span>
          <ha-button ?disabled=${this._loading} @click=${this._onSubmit}>
            ${this._loading?"Saving...":e?"Save":"Create"}
          </ha-button>
        </div>
      </ha-dialog>
    `}_renderDateTimeRow(e,t){return ot({label:t,value:String(this._data[e]??("dtstart"===e?this._todayStart():"")),locale:this.hass.locale,onDate:t=>this._onDatePart(e,t),onTime:t=>this._onTimePart(e,t)})}_renderUntilRow(){const e=String(this._data.until??"");return F`
      <div class="until-row">
        <ha-date-input
          class="until-date"
          .locale=${this.hass.locale}
          .label=${_t.until}
          .value=${e}
          .canClear=${!0}
          @value-changed=${this._onUntilChanged}
        ></ha-date-input>
        ${e?F`
              <ha-icon-button class="until-clear" title="Clear end date" @click=${this._onUntilClear}>
                <ha-icon icon="mdi:close"></ha-icon>
              </ha-icon-button>
            `:B}
      </div>
    `}_onUntilChanged(e){this._data={...this._data,until:e.detail.value||void 0}}_onUntilClear(){this._data={...this._data,until:void 0}}_onDatePart(e,t){const i=t.detail.value;i&&(this._data={...this._data,[e]:nt(this._data[e],i)})}_onTimePart(e,t){const i=t.detail.value;i&&(this._data={...this._data,[e]:st(this._data[e],i)})}_onValueChanged(e){const t=this._data,i={...e.detail.value};if("scheduled"!==i.chore_type||i.chore_type===t.chore_type||lt.has(String(i.frequency))||(i.frequency="daily"),"scheduled"!==i.chore_type||i.dtstart||(i.dtstart=this._todayStart()),"scheduled"===i.chore_type&&i.frequency!==t.frequency){if(!("weekly"!==i.frequency||Array.isArray(i.byday)&&i.byday.length)){const e=this._parseDate(i.dtstart)??new Date;i.byday=[ct[e.getDay()]]}"monthly"!==i.frequency||i.monthly_mode||(i.monthly_mode="monthday")}"oneshot"!==i.chore_type||i.chore_type===t.chore_type||i.due_datetime||(i.due_datetime=this._todayStart()),this._data=i}_buildPayload(){const e=this._data,t=String(e.chore_type??"scheduled"),i={chore_name:String(e.chore_name??"").trim(),description:String(e.description??"")};if(this.item?i.trigger_entity=e.trigger_entity??"":e.trigger_entity&&(i.trigger_entity=e.trigger_entity),i.assigned_to=Array.isArray(e.assigned_to)?e.assigned_to:[],this.item?(i.pending_period=e.pending_period??{},i.grace_period=e.grace_period??{}):(e.pending_period&&(i.pending_period=e.pending_period),e.grace_period&&(i.grace_period=e.grace_period)),"oneshot"===t)i.oneshot={due_datetime:e.due_datetime??null,persist:!!e.persist};else if("interval"===t){const t={frequency:e.frequency,persist:!!e.persist};t.interval=Number(e.interval??1),Array.isArray(e.bymonth)&&e.bymonth.length&&(t.bymonth=e.bymonth),this._applyLifecycle(t,e),i.interval=t}else i.scheduled=this._buildScheduledSelector(e);return i}_buildScheduledSelector(e){const t=String(e.frequency??"daily"),i={frequency:t,persist:!!e.persist};e.dtstart&&(i.dtstart=String(e.dtstart)),i.interval=Number(e.interval??1);const o=e.__snap??{},n=e=>Array.isArray(o[e])?o[e]:[];if("weekly"===t)Array.isArray(e.byday)&&e.byday.length&&(i.byday=e.byday);else if("monthly"===t){const t=this._datePart(e.dtstart)!==this._datePart(e.__dtstart0)||e.monthly_mode!==e.__mode0,o=n("byday"),s=n("bysetpos"),a=n("bymonthday");if(!t&&(o.length||s.length||a.length))"weekday"===e.monthly_mode?(o.length&&(i.byday=o),s.length&&(i.bysetpos=s)):a.length&&(i.bymonthday=a);else{const t=this._parseDate(e.dtstart)??new Date;"weekday"===e.monthly_mode?(i.byday=[ct[t.getDay()]],i.bysetpos=[this._monthlySetpos(t)]):i.bymonthday=[t.getDate()]}}else"yearly"===t&&(n("byday").length&&(i.byday=n("byday")),n("bysetpos").length&&(i.bysetpos=n("bysetpos")),n("bymonthday").length&&(i.bymonthday=n("bymonthday")));return n("bymonth").length&&(i.bymonth=n("bymonth")),this._applyLifecycle(i,e),i}_applyLifecycle(e,t){t.until?e.until=t.until:t.count&&(e.count=Number(t.count))}_validate(){const e=this._data;if(!String(e.chore_name??"").trim())return"Name is required.";return"oneshot"!==String(e.chore_type??"scheduled")&&e.until&&e.count?"Set either an end date or a count, not both.":!this.item&&this.targets.length>1&&!e.target_entity?"Choose a list.":null}_target(){return this._data.target_entity??this.defaultTarget??this.item?.source_entity}async _onSubmit(){if(this._loading)return;const e=this._validate();if(e)return void(this._error=e);const t=this._target();if(t){this._loading=!0,this._error=void 0;try{const e=this._buildPayload(),i=!!this.item;await this.hass.callWS({type:"call_service",domain:at,service:i?"update_item":"create_item",service_data:{entity_id:t,...i?{item:this.item.uid}:{},...e}}),this.dispatchEvent(new CustomEvent("chore-saved",{bubbles:!0,composed:!0})),this.open=!1}catch(e){this._error=e instanceof Error?e.message:String(e),console.error("chore-edit-dialog: save failed",e)}finally{this._loading=!1}}else this._error="No target list available."}async _onDelete(){if(!this._loading&&this.item){this._loading=!0,this._error=void 0;try{await this.hass.callWS({type:"call_service",domain:at,service:"delete_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid}}),this.dispatchEvent(new CustomEvent("chore-saved",{bubbles:!0,composed:!0})),this.open=!1}catch(e){this._error=e instanceof Error?e.message:String(e),console.error("chore-edit-dialog: delete failed",e)}finally{this._loading=!1}}}_onClosed(){this.open=!1,this.dispatchEvent(new CustomEvent("edit-dialog-closed",{bubbles:!0,composed:!0}))}}gt.styles=a`
    ${tt}
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
    /* Until (end date): matches ha-form's 24px row rhythm; the clear button
       only renders while a date is set. */
    .until-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 24px 0;
    }
    .until-row .until-date {
      flex: 1;
      min-width: 0;
    }
    .until-row .until-clear {
      color: var(--secondary-text-color);
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
  `,e([he({attribute:!1})],gt.prototype,"hass",void 0),e([he({type:Boolean})],gt.prototype,"open",void 0),e([he({attribute:!1})],gt.prototype,"item",void 0),e([he({attribute:!1})],gt.prototype,"targets",void 0),e([he({attribute:!1})],gt.prototype,"defaultTarget",void 0),e([pe()],gt.prototype,"_data",void 0),e([pe()],gt.prototype,"_error",void 0),e([pe()],gt.prototype,"_loading",void 0),e([pe()],gt.prototype,"_confirmDelete",void 0),ue("chore-edit-dialog",gt);const yt=[{name:"completed_by",selector:{entity:{filter:{domain:"person"}}}}],ft={completed_by:"Completed by:"};class vt extends re{constructor(){super(...arguments),this.open=!1,this._data={},this._loading=!1,this._computeLabel=e=>ft[e.name]??e.name,this._onDatePart=e=>{const t=e.detail.value;t&&(this._data={...this._data,completed_at:nt(this._data.completed_at,t)})},this._onTimePart=e=>{const t=e.detail.value;t&&(this._data={...this._data,completed_at:st(this._data.completed_at,t)})}}willUpdate(e){if(e.has("open")||e.has("item")){const e=this.open?this.item?.uid:void 0;e&&e!==this._seededFor&&(this._seededFor=e,this._data=this._defaults(),this._error=void 0),this.open||(this._seededFor=void 0)}}_defaults(){const e=this.item?.assigned_to??[];return{completed_at:Ae(new Date),...1===e.length?{completed_by:e[0]}:{}}}render(){return this.item?F`
      <ha-dialog .open=${this.open} @closed=${this._onClosed}>
        <ha-icon-button slot="headerNavigationIcon" data-dialog="close" class="header_button">
          <ha-icon icon="mdi:close"></ha-icon>
        </ha-icon-button>
        <span slot="headerTitle">Complete ${this.item.chore_name}</span>
        <div class="content">
          ${this._error?F`<ha-alert alert-type="error">${this._error}</ha-alert>`:B}
          ${ot({label:"Completed at:",value:String(this._data.completed_at??""),locale:this.hass.locale,onDate:this._onDatePart,onTime:this._onTimePart})}
          <ha-form
            .hass=${this.hass}
            .data=${this._data}
            .schema=${yt}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._onValueChanged}
          ></ha-form>
          <ha-form class="picker-loader" .hass=${this.hass} .schema=${it} .data=${{}}></ha-form>
        </div>
        <div slot="footer" class="footer">
          <ha-button variant="neutral" appearance="plain" ?disabled=${this._loading} @click=${this._onCancel}>
            Cancel
          </ha-button>
          <ha-button ?disabled=${this._loading} @click=${this._onSubmit}>
            ${this._loading?"Completing...":"Complete"}
          </ha-button>
        </div>
      </ha-dialog>
    `:B}_onValueChanged(e){this._data={...this._data,...e.detail.value}}async _onSubmit(){if(this.item&&!this._loading){this._loading=!0,this._error=void 0;try{const e=Se(this._data.completed_at),t=String(this._data.completed_by??"").trim();await this.hass.callWS({type:"call_service",domain:"chore_calendar",service:"complete_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid,...e?{completed_at:e}:{},...t?{completed_by:t}:{}}}),this.dispatchEvent(new CustomEvent("chore-completed",{detail:{item:this.item},bubbles:!0,composed:!0})),this.open=!1}catch(e){this._error=e instanceof Error?e.message:String(e),console.error("chore-complete-dialog: failed to complete chore",e)}finally{this._loading=!1}}}_onCancel(){this.open=!1,this._onClosed()}_onClosed(){this.dispatchEvent(new CustomEvent("complete-dialog-closed",{bubbles:!0,composed:!0}))}}vt.styles=a`
    ${tt}
    ha-dialog {
      --ha-dialog-max-width: 400px;
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
    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px;
      border-top: 1px solid var(--divider-color);
    }
  `,e([he({attribute:!1})],vt.prototype,"hass",void 0),e([he({attribute:!1})],vt.prototype,"item",void 0),e([he({type:Boolean})],vt.prototype,"open",void 0),e([pe()],vt.prototype,"_data",void 0),e([pe()],vt.prototype,"_error",void 0),e([pe()],vt.prototype,"_loading",void 0),ue("chore-complete-dialog",vt);class bt extends re{constructor(){super(...arguments),this.open=!1,this._until="",this._loading=!1,this._onDatePart=e=>{const t=e.detail.value;t&&(this._until=nt(this._until,t))},this._onTimePart=e=>{const t=e.detail.value;t&&(this._until=st(this._until,t))}}willUpdate(e){if(e.has("open")||e.has("item")){const e=this.open?this.item?.uid:void 0;e&&e!==this._seededFor&&(this._seededFor=e,this._until=this._defaultUntil(),this._error=void 0),this.open||(this._seededFor=void 0)}}_defaultUntil(){const e=this.item?.next_due?new Date(this.item.next_due):null;return Ae(e&&!Number.isNaN(e.getTime())?e:new Date)}render(){return this.item?F`
      <ha-dialog .open=${this.open} @closed=${this._onClosed}>
        <ha-icon-button slot="headerNavigationIcon" data-dialog="close" class="header_button">
          <ha-icon icon="mdi:close"></ha-icon>
        </ha-icon-button>
        <span slot="headerTitle">Skip ${this.item.chore_name}</span>
        <div class="content">
          ${this._error?F`<ha-alert alert-type="error">${this._error}</ha-alert>`:B}
          ${ot({label:"Skip until:",value:this._until,locale:this.hass.locale,onDate:this._onDatePart,onTime:this._onTimePart})}
          <ha-form class="picker-loader" .hass=${this.hass} .schema=${it} .data=${{}}></ha-form>
        </div>
        <div slot="footer" class="footer">
          <ha-button variant="neutral" appearance="plain" ?disabled=${this._loading} @click=${this._onCancel}>
            Cancel
          </ha-button>
          <ha-button ?disabled=${this._loading} @click=${this._onSubmit}>
            ${this._loading?"Skipping...":"Skip"}
          </ha-button>
        </div>
      </ha-dialog>
    `:B}async _onSubmit(){if(this.item&&!this._loading){this._loading=!0,this._error=void 0;try{const e=Se(this._until);await this.hass.callWS({type:"call_service",domain:"chore_calendar",service:"skip_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid,...e?{until:e}:{}}}),this.dispatchEvent(new CustomEvent("chore-skipped",{detail:{item:this.item},bubbles:!0,composed:!0})),this.open=!1}catch(e){this._error=e instanceof Error?e.message:String(e),console.error("chore-skip-dialog: failed to skip chore",e)}finally{this._loading=!1}}}_onCancel(){this.open=!1,this._onClosed()}_onClosed(){this.dispatchEvent(new CustomEvent("skip-dialog-closed",{bubbles:!0,composed:!0}))}}bt.styles=a`
    ${tt}
    ha-dialog {
      --ha-dialog-max-width: 400px;
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
    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px;
      border-top: 1px solid var(--divider-color);
    }
  `,e([he({attribute:!1})],bt.prototype,"hass",void 0),e([he({attribute:!1})],bt.prototype,"item",void 0),e([he({type:Boolean})],bt.prototype,"open",void 0),e([pe()],bt.prototype,"_until",void 0),e([pe()],bt.prototype,"_error",void 0),e([pe()],bt.prototype,"_loading",void 0),ue("chore-skip-dialog",bt);const $t=[{name:"title",selector:{text:{}}}],wt=[{key:"hide_completed",label:"Hide completed section"},{key:"hide_section_headers",label:"Hide section headings"},{key:"hide_card_background",label:"Hide card background"},{key:"allow_uncomplete",label:"Allow uncomplete"},{key:"hide_add_button",label:"Hide add button"},{key:"hide_edit_button",label:"Hide edit button"},{key:"hide_show_all",label:"Hide show-all toggle"}],xt=[{name:"update_interval",selector:{number:{min:10,max:600,step:10,mode:"box"}},default:60}],At=[{key:"due_date_period",label:"Due-date period"},{key:"completed_period",label:"Completed period"}],St=[{value:"details",label:"Chore Details"},{value:"edit",label:"Edit Chore"},{value:"complete",label:"Complete Chore"},{value:"more-info",label:"More Info"},{value:"navigate",label:"Navigate"},{value:"url",label:"URL"},{value:"call-service",label:"Call Service"},{value:"none",label:"None"}],Ct=[{name:"tap_action",selector:{select:{options:St,mode:"dropdown"}},default:"details"},{name:"hold_action",selector:{select:{options:St,mode:"dropdown"}},default:"none"},{name:"double_tap_action",selector:{select:{options:St,mode:"dropdown"}},default:"none"}],Et=[{name:"exclude",selector:{select:{multiple:!0,options:[{value:"overdue",label:"Overdue"},{value:"due",label:"Due"},{value:"pending",label:"Pending"},{value:"completed",label:"Completed"}]}}}],kt={title:"Title",hide_completed:"Hide completed section",hide_section_headers:"Hide section headings",hide_card_background:"Hide card background",allow_uncomplete:"Allow uncomplete",hide_add_button:"Hide add button",hide_edit_button:"Hide edit button",hide_show_all:"Hide show-all toggle",update_interval:"Update interval (seconds)",tap_action:"Tap action",hold_action:"Hold action",double_tap_action:"Double-tap action",exclude:"Exclude statuses"};function Dt(e){return"string"==typeof e?{entity:e}:{...e}}class Tt extends re{constructor(){super(...arguments),this._expandedEntities=new Set,this._computeLabel=e=>kt[e.name]??e.name}setConfig(e){this._config={...e}}render(){if(!this.hass||!this._config)return F``;const e=(this._config.entities??[]).map(Dt);return F`
      <div class="entities-header">
        <span>Entities</span>
      </div>
      ${e.map((e,t)=>{const i=(o=e.entity)?(o.split(".").pop()??o).replace(/_/g," ").replace(/\b\w/g,e=>e.toUpperCase()):"New entity";var o;const n=e.color??"",s=this._expandedEntities.has(t);return F`
          <ha-expansion-panel
            .expanded=${s}
            @expanded-changed=${e=>this._toggleExpanded(e,t)}
          >
            <div class="entity-header" slot="header">
              <span
                class="entity-color-dot"
                style="background-color: ${n?ye(n):"var(--primary-color)"}"
              ></span>
              <span class="entity-name">${i}</span>
            </div>
            <div class="entity-content">
              <ha-form
                class="entity-picker"
                .hass=${this.hass}
                .data=${{entity:e.entity}}
                .schema=${[{name:"entity",selector:{entity:{domain:"calendar",integration:"chore_calendar"}}}]}
                .computeLabel=${()=>""}
                @value-changed=${e=>this._entityChanged(e,t)}
              ></ha-form>
              <ha-form
                .hass=${this.hass}
                .data=${{color:e.color??""}}
                .schema=${[{name:"color",selector:{ui_color:{}}}]}
                .computeLabel=${()=>"List color"}
                @value-changed=${e=>this._colorChanged(e,t)}
              ></ha-form>
              <ha-form
                .hass=${this.hass}
                .data=${{exclude:e.exclude??[]}}
                .schema=${Et}
                .computeLabel=${this._computeLabel}
                @value-changed=${e=>this._excludeChanged(e,t)}
              ></ha-form>
              <button
                class="remove-btn"
                title="Remove entity"
                @click=${()=>this._removeEntity(t)}
                style="align-self: flex-end"
              >
                ✕ Remove
              </button>
            </div>
          </ha-expansion-panel>
        `})}
      ${0===e.length?F`<button class="add-btn" @click=${this._addEntity}>
            + Add entity
          </button>`:F`<button class="add-btn" @click=${this._addEntity}>
            + Add another entity
          </button>`}

      <div class="divider"></div>

      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${$t}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._optionsChanged}
      ></ha-form>

      <div class="toggles">
        ${wt.map(e=>F`
            <ha-formfield alignEnd spaceBetween .label=${e.label}>
              <ha-switch
                .checked=${!!this._config[e.key]}
                @change=${t=>this._toggleChanged(e.key,t)}
              ></ha-switch>
            </ha-formfield>
          `)}
      </div>

      <div class="period-group">
        ${At.map(e=>this._renderPeriodRow(e.key,e.label))}
      </div>

      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${xt}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._optionsChanged}
      ></ha-form>

      <div class="divider"></div>

      <ha-form
        .hass=${this.hass}
        .data=${this._actionsFormData()}
        .schema=${Ct}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._actionsChanged}
      ></ha-form>
    `}_dispatch(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}_toggleExpanded(e,t){const i=e.detail.expanded,o=new Set(this._expandedEntities);i?o.add(t):o.delete(t),this._expandedEntities=o}_entityChanged(e,t){e.stopPropagation();const i=(this._config.entities??[]).map(Dt);i[t]={...i[t],entity:e.detail.value.entity},this._config={...this._config,entities:i},this._dispatch()}_colorChanged(e,t){e.stopPropagation();const i=e.detail.value?.color,o=(this._config.entities??[]).map(Dt);o[t]={...o[t],color:i||void 0},this._config={...this._config,entities:o},this._dispatch()}_excludeChanged(e,t){e.stopPropagation();const i=e.detail.value.exclude??[],o=(this._config.entities??[]).map(Dt);o[t]={...o[t],exclude:i},this._config={...this._config,entities:o},this._dispatch()}_removeEntity(e){const t=(this._config.entities??[]).map(Dt).filter((t,i)=>i!==e),i=new Set;for(const t of this._expandedEntities)t<e?i.add(t):t>e&&i.add(t-1);this._expandedEntities=i,this._config={...this._config,entities:t},this._dispatch()}_addEntity(){const e=[...(this._config.entities??[]).map(Dt),{entity:""}],t=e.length-1,i=new Set(this._expandedEntities);i.add(t),this._expandedEntities=i,this._config={...this._config,entities:e},this._dispatch()}_actionToString(e){return e?.action??""}_actionsFormData(){return{tap_action:this._actionToString(this._config.tap_action)||"details",hold_action:this._actionToString(this._config.hold_action)||"none",double_tap_action:this._actionToString(this._config.double_tap_action)||"none"}}_actionsChanged(e){if(e.stopPropagation(),!this._config||!this.hass)return;const t=e.detail.value,i=e=>e?{action:e}:void 0;this._config={...this._config,tap_action:i(t.tap_action),hold_action:i(t.hold_action),double_tap_action:i(t.double_tap_action)},this._dispatch()}_renderPeriodRow(e,t){const i=this._config[e]??{},o=!(!i.days&&!i.hours),n=o?String(i.days??0):"",s=o?String(i.hours??0):"";return F`
      <div class="period-row">
        <span class="period-label">${t}</span>
        <div class="period-inputs">
          <ha-input
            appearance="outlined"
            type="number"
            min="0"
            max="365"
            placeholder="days"
            .value=${n}
            @change=${t=>this._setPeriod(e,"days",t.target.value)}
          ></ha-input>
          <ha-input
            appearance="outlined"
            type="number"
            min="0"
            max="23"
            placeholder="hours"
            .value=${s}
            @change=${t=>this._setPeriod(e,"hours",t.target.value)}
          ></ha-input>
        </div>
      </div>
    `}_setPeriod(e,t,i){if(!this._config)return;const o=Math.max(0,Math.floor(Number(i)||0)),n={...this._config[e]??{},[t]:o};n.days||delete n.days,n.hours||delete n.hours;const s=Object.keys(n).length>0;this._config={...this._config,[e]:s?n:void 0},this._dispatch()}_toggleChanged(e,t){if(!this._config)return;const i=t.target.checked;this._config={...this._config,[e]:i},this._dispatch()}_optionsChanged(e){e.stopPropagation(),this._config&&this.hass&&(this._config={...this._config,...e.detail.value},this._dispatch())}}Tt.styles=a`
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
  `,e([he({attribute:!1})],Tt.prototype,"hass",void 0),e([pe()],Tt.prototype,"_config",void 0),e([pe()],Tt.prototype,"_expandedEntities",void 0),ue("chore-calendar-card-editor",Tt);console.info("%c CHORE-CALENDAR-CARD %c v0.12.2 ","color: white; background: #4CAF50; font-weight: 700;","color: #4CAF50; background: white; font-weight: 700;");const Pt=["overdue","due","pending","completed"];class Ot extends re{constructor(){super(...arguments),this._items=[],this._loading=!0,this._dialogOpen=!1,this._editOpen=!1,this._completeOpen=!1,this._skipOpen=!1,this._showAll=!1,this._hiddenCount=0,this._allItems=[],this._entityConfigs=[],this._connected=!1}static getConfigElement(){return document.createElement("chore-calendar-card-editor")}static getStubConfig(){return{entities:[]}}setConfig(e){if(!e.entities||0===e.entities.length)return this._configError="Please define at least one entity",void(this._config=e);this._configError=void 0,this._config=e,this._entityConfigs=e.entities.map((e,t)=>function(e,t){const i="string"==typeof e?{entity:e}:e;return{...i,color:i.color??_e[t%_e.length]}}(e,t)),this._allItems.length&&this._applyFilters(),e.hide_card_background?this.setAttribute("no-card-background",""):this.removeAttribute("no-card-background")}getCardSize(){return Math.max(3,this._items.length+1)}connectedCallback(){super.connectedCallback(),this._connected=!0,this._startPolling(),this._subscribeEvents()}disconnectedCallback(){super.disconnectedCallback(),this._connected=!1,this._stopPolling(),this._unsubscribeEvents()}updated(e){e.has("hass")&&this.hass&&this._loading&&this._refreshData()}async _refreshData(){if(this.hass&&this._config)try{const e=[],t=this._entityConfigs.map(async t=>{const i=await this.hass.callWS({type:"call_service",domain:"chore_calendar",service:"get_items",service_data:{entity_id:t.entity},return_response:!0}),o=i.response?.items??[],n=i.response?.completed_cleared_at?new Date(i.response.completed_cleared_at).getTime():null,s=t.exclude??[];for(const i of o)s.includes(i.status)||null!==n&&"completed"===i.status&&i.last_completed&&new Date(i.last_completed).getTime()<n||e.push({...i,source_entity:t.entity,source_color:t.color})});await Promise.all(t),this._allItems=e,this._applyFilters()}catch(e){console.error("chore-calendar-card: failed to fetch items",e)}finally{this._loading=!1}}get _showAllActive(){return this._showAll&&!this._config.hide_show_all}_applyFilters(){const e=we(this._config.due_date_period),t=we(this._config.completed_period),i=function(e,t,i,o){if(null===t&&null===i)return e;const n=o.getTime();return e.filter(e=>{if(null!==i&&"completed"===e.status&&e.last_completed&&n-new Date(e.last_completed).getTime()>i)return!1;if(null!==t&&"pending"===e.status){if(!e.next_due)return!1;if(new Date(e.next_due).getTime()-n>t)return!1}return!0})}(this._allItems,e,t,new Date),o=this._config.hide_completed?i.filter(e=>"completed"!==e.status).length:i.length;var n;this._hiddenCount=this._allItems.length-o,this._items=(n=this._showAllActive?this._allItems:i,[...n].sort((e,t)=>{const i=fe[e.status]-fe[t.status];if(0!==i)return i;if("completed"===e.status){const i=e.last_completed?new Date(e.last_completed).getTime():0;return(t.last_completed?new Date(t.last_completed).getTime():0)-i}return(e.next_due?new Date(e.next_due).getTime():1/0)-(t.next_due?new Date(t.next_due).getTime():1/0)}))}_toggleShowAll(){this._showAll=!this._showAll,this._applyFilters()}_startPolling(){this._stopPolling();const e=1e3*(this._config?.update_interval??60);this._refreshTimer=setInterval(()=>{this._connected&&this._refreshData()},e)}_stopPolling(){void 0!==this._refreshTimer&&(clearInterval(this._refreshTimer),this._refreshTimer=void 0)}async _subscribeEvents(){if(this.hass?.connection)try{const e=new Set(this._entityConfigs.map(e=>e.entity));this._eventUnsub=await this.hass.connection.subscribeEvents(t=>{t.data?.entity_id&&e.has(t.data.entity_id)&&this._refreshData()},"state_changed")}catch{}}_unsubscribeEvents(){this._eventUnsub?.(),this._eventUnsub=void 0}render(){if(!this._config)return B;if(this._configError)return F`
        <ha-card>
          <div class="empty">${this._configError}</div>
        </ha-card>
      `;const e=this._config.title,t=!this._config.hide_add_button;return F`
      <ha-card
        @chore-detail=${this._onChoreDetail}
        @chore-edit=${this._onChoreEdit}
        @chore-completed=${this._onChoreCompleted}
      >
        ${e||t?F`
              <div class="header" part="header">
                ${e?F`<span class="title" part="title">${e}</span>`:F`<span></span>`}
                ${t?F`
                      <ha-icon-button class="add" part="add-button" title="Add chore" @click=${this._onAddChore}>
                        <ha-icon icon="mdi:plus"></ha-icon>
                      </ha-icon-button>
                    `:B}
              </div>
            `:B}
        ${this._loading?F`<div class="loading">Loading...</div>`:F`${this._renderSections()}${this._renderShowAllToggle()}`}
      </ha-card>
      <chore-detail-dialog
        .hass=${this.hass}
        .item=${this._dialogItem}
        .open=${this._dialogOpen}
        .allowUncomplete=${!!this._config.allow_uncomplete}
        .allowEdit=${!this._config.hide_edit_button}
        @detail-dialog-closed=${this._onDialogClosed}
        @chore-edit=${this._onChoreEdit}
        @chore-complete-details=${this._onChoreCompleteDetails}
        @chore-skip-details=${this._onChoreSkipDetails}
        @chore-completed=${this._onChoreCompleted}
        @chore-uncompleted=${this._onChoreCompleted}
        @chore-skipped=${this._onChoreCompleted}
      ></chore-detail-dialog>
      <chore-complete-dialog
        .hass=${this.hass}
        .item=${this._completeItem}
        .open=${this._completeOpen}
        @complete-dialog-closed=${this._onCompleteClosed}
        @chore-completed=${this._onChoreCompleted}
      ></chore-complete-dialog>
      <chore-skip-dialog
        .hass=${this.hass}
        .item=${this._skipItem}
        .open=${this._skipOpen}
        @skip-dialog-closed=${this._onSkipClosed}
        @chore-skipped=${this._onChoreCompleted}
      ></chore-skip-dialog>
      <chore-edit-dialog
        .hass=${this.hass}
        .item=${this._editItem}
        .open=${this._editOpen}
        .targets=${this._targetOptions()}
        .defaultTarget=${this._entityConfigs[0]?.entity}
        @edit-dialog-closed=${this._onEditClosed}
        @chore-saved=${this._onChoreSaved}
      ></chore-edit-dialog>
    `}_renderSections(){const e=function(e){const t=new Map;for(const i of e){let e=t.get(i.status);e||(e=[],t.set(i.status,e)),e.push(i)}return t}(this._items),t=!!this._config.hide_completed&&!this._showAllActive,i=!!this._config.hide_section_headers,o=Pt.filter(i=>{const o=e.get(i);return!(!o||0===o.length)&&("completed"!==i||!t)});return 0===o.length?F`
        <div class="placeholder">
          <div class="placeholder-card">
            <div class="placeholder-row">No chores</div>
          </div>
        </div>
      `:F`
      ${o.map(t=>{const o=e.get(t);return F`
          ${i?B:F`<div class="section-header ${t}" part="section-header section-header-${t}">
                ${ze[t]}
              </div>`}
          ${o.map(e=>F`
              <chore-row
                .hass=${this.hass}
                .item=${e}
                .tapAction=${this._config.tap_action??{action:"details"}}
                .holdAction=${this._config.hold_action??{action:"none"}}
                .doubleTapAction=${this._config.double_tap_action??{action:"none"}}
              ></chore-row>
            `)}
        `})}
    `}_renderShowAllToggle(){return 0===this._hiddenCount||this._config.hide_show_all?B:F`
      <button class="show-all" part="show-all" @click=${this._toggleShowAll}>
        <ha-icon icon=${this._showAll?"mdi:chevron-up":"mdi:chevron-down"}></ha-icon>
        ${this._showAll?"Show fewer":`Show all (${this._hiddenCount} more)`}
      </button>
    `}_onChoreDetail(e){this._dialogItem=e.detail.item,this._dialogOpen=!0}_onDialogClosed(){this._dialogOpen=!1}_onChoreCompleted(){this._dialogOpen=!1,this._completeOpen=!1,this._skipOpen=!1,this._refreshData()}_onChoreCompleteDetails(e){this._dialogOpen=!1,this._completeItem=e.detail.item,this._completeOpen=!0}_onCompleteClosed(){this._completeOpen=!1}_onChoreSkipDetails(e){this._dialogOpen=!1,this._skipItem=e.detail.item,this._skipOpen=!0}_onSkipClosed(){this._skipOpen=!1}_onAddChore(){this._editItem=void 0,this._editOpen=!0}_onChoreEdit(e){this._dialogOpen=!1,this._editItem=e.detail.item,this._editOpen=!0}_onEditClosed(){this._editOpen=!1}_onChoreSaved(){this._editOpen=!1,this._refreshData()}_targetOptions(){return this._entityConfigs.map(e=>({value:e.entity,label:this.hass?.states?.[e.entity]?.attributes?.friendly_name??e.entity}))}}Ot.styles=a`
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

    .show-all {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      width: 100%;
      margin-top: 4px;
      padding: 6px 0;
      border: none;
      background: none;
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      color: var(--secondary-text-color);
    }

    .show-all:hover {
      color: var(--primary-text-color);
    }

    .show-all ha-icon {
      --mdc-icon-size: 18px;
    }

`,e([he({attribute:!1})],Ot.prototype,"hass",void 0),e([pe()],Ot.prototype,"_config",void 0),e([pe()],Ot.prototype,"_configError",void 0),e([pe()],Ot.prototype,"_items",void 0),e([pe()],Ot.prototype,"_loading",void 0),e([pe()],Ot.prototype,"_dialogItem",void 0),e([pe()],Ot.prototype,"_dialogOpen",void 0),e([pe()],Ot.prototype,"_editItem",void 0),e([pe()],Ot.prototype,"_editOpen",void 0),e([pe()],Ot.prototype,"_completeItem",void 0),e([pe()],Ot.prototype,"_completeOpen",void 0),e([pe()],Ot.prototype,"_skipItem",void 0),e([pe()],Ot.prototype,"_skipOpen",void 0),e([pe()],Ot.prototype,"_showAll",void 0),e([pe()],Ot.prototype,"_hiddenCount",void 0),ue("chore-calendar-card",Ot),window.customCards=window.customCards||[],window.customCards.push({type:"chore-calendar-card",name:"Chore Calendar",description:"Timeline view of chores from Chore Calendar lists",preview:!0});export{Ot as ChoreCalendarCard};
