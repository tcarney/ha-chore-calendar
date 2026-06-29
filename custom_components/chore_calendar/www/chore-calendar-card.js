var t=function(e,n){return t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var n in e)Object.prototype.hasOwnProperty.call(e,n)&&(t[n]=e[n])},t(e,n)};function e(e,n){if("function"!=typeof n&&null!==n)throw new TypeError("Class extends value "+String(n)+" is not a constructor or null");function i(){this.constructor=e}t(e,n),e.prototype=null===n?Object.create(n):(i.prototype=n.prototype,new i)}var n=function(){return n=Object.assign||function(t){for(var e,n=1,i=arguments.length;n<i;n++)for(var r in e=arguments[n])Object.prototype.hasOwnProperty.call(e,r)&&(t[r]=e[r]);return t},n.apply(this,arguments)};function i(t,e,n,i){var r,o=arguments.length,s=o<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,n):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)s=Reflect.decorate(t,e,n,i);else for(var a=t.length-1;a>=0;a--)(r=t[a])&&(s=(o<3?r(s):o>3?r(e,n,s):r(e,n))||s);return o>3&&s&&Object.defineProperty(e,n,s),s}function r(t,e,n){if(n||2===arguments.length)for(var i,r=0,o=e.length;r<o;r++)!i&&r in e||(i||(i=Array.prototype.slice.call(e,0,r)),i[r]=e[r]);return t.concat(i||Array.prototype.slice.call(e))}"function"==typeof SuppressedError&&SuppressedError;const o=globalThis,s=o.ShadowRoot&&(void 0===o.ShadyCSS||o.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,a=Symbol(),c=new WeakMap;let h=class{constructor(t,e,n){if(this._$cssResult$=!0,n!==a)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(s&&void 0===t){const n=void 0!==e&&1===e.length;n&&(t=c.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),n&&c.set(e,t))}return t}toString(){return this.cssText}};const d=(t,...e)=>{const n=1===t.length?t[0]:e.reduce((e,n,i)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(n)+t[i+1],t[0]);return new h(n,t,a)},l=s?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const n of t.cssRules)e+=n.cssText;return(t=>new h("string"==typeof t?t:t+"",void 0,a))(e)})(t):t,{is:u,defineProperty:p,getOwnPropertyDescriptor:y,getOwnPropertyNames:f,getOwnPropertySymbols:m,getPrototypeOf:b}=Object,g=globalThis,v=g.trustedTypes,_=v?v.emptyScript:"",w=g.reactiveElementPolyfillSupport,k=(t,e)=>t,E={toAttribute(t,e){switch(e){case Boolean:t=t?_:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let n=t;switch(e){case Boolean:n=null!==t;break;case Number:n=null===t?null:Number(t);break;case Object:case Array:try{n=JSON.parse(t)}catch(t){n=null}}return n}},x=(t,e)=>!u(t,e),$={attribute:!0,type:String,converter:E,reflect:!1,useDefault:!1,hasChanged:x};Symbol.metadata??=Symbol("metadata"),g.litPropertyMetadata??=new WeakMap;let T=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=$){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const n=Symbol(),i=this.getPropertyDescriptor(t,n,e);void 0!==i&&p(this.prototype,t,i)}}static getPropertyDescriptor(t,e,n){const{get:i,set:r}=y(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:i,set(e){const o=i?.call(this);r?.call(this,e),this.requestUpdate(t,o,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??$}static _$Ei(){if(this.hasOwnProperty(k("elementProperties")))return;const t=b(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(k("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(k("properties"))){const t=this.properties,e=[...f(t),...m(t)];for(const n of e)this.createProperty(n,t[n])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,n]of e)this.elementProperties.set(t,n)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const n=this._$Eu(t,e);void 0!==n&&this._$Eh.set(n,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const n=new Set(t.flat(1/0).reverse());for(const t of n)e.unshift(l(t))}else void 0!==t&&e.push(l(t));return e}static _$Eu(t,e){const n=e.attribute;return!1===n?void 0:"string"==typeof n?n:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const n of e.keys())this.hasOwnProperty(n)&&(t.set(n,this[n]),delete this[n]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,e)=>{if(s)t.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const n of e){const e=document.createElement("style"),i=o.litNonce;void 0!==i&&e.setAttribute("nonce",i),e.textContent=n.cssText,t.appendChild(e)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,n){this._$AK(t,n)}_$ET(t,e){const n=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,n);if(void 0!==i&&!0===n.reflect){const r=(void 0!==n.converter?.toAttribute?n.converter:E).toAttribute(e,n.type);this._$Em=t,null==r?this.removeAttribute(i):this.setAttribute(i,r),this._$Em=null}}_$AK(t,e){const n=this.constructor,i=n._$Eh.get(t);if(void 0!==i&&this._$Em!==i){const t=n.getPropertyOptions(i),r="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:E;this._$Em=i;const o=r.fromAttribute(e,t.type);this[i]=o??this._$Ej?.get(i)??o,this._$Em=null}}requestUpdate(t,e,n,i=!1,r){if(void 0!==t){const o=this.constructor;if(!1===i&&(r=this[t]),n??=o.getPropertyOptions(t),!((n.hasChanged??x)(r,e)||n.useDefault&&n.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,n))))return;this.C(t,e,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:n,reflect:i,wrapped:r},o){n&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),!0!==r||void 0!==o)||(this._$AL.has(t)||(this.hasUpdated||n||(e=void 0),this._$AL.set(t,e)),!0===i&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,n]of t){const{wrapped:t}=n,i=this[e];!0!==t||this._$AL.has(e)||void 0===i||this.C(e,void 0,n,i)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};T.elementStyles=[],T.shadowRootOptions={mode:"open"},T[k("elementProperties")]=new Map,T[k("finalized")]=new Map,w?.({ReactiveElement:T}),(g.reactiveElementVersions??=[]).push("2.1.2");const A=globalThis,S=t=>t,C=A.trustedTypes,D=C?C.createPolicy("lit-html",{createHTML:t=>t}):void 0,O="$lit$",U=`lit$${Math.random().toFixed(9).slice(2)}$`,L="?"+U,M=`<${L}>`,N=document,R=()=>N.createComment(""),Y=t=>null===t||"object"!=typeof t&&"function"!=typeof t,H=Array.isArray,P="[ \t\n\f\r]",I=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,j=/-->/g,W=/>/g,z=RegExp(`>|${P}(?:([^\\s"'>=/]+)(${P}*=${P}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),q=/'/g,F=/"/g,B=/^(?:script|style|textarea|title)$/i,K=(t=>(e,...n)=>({_$litType$:t,strings:e,values:n}))(1),Z=Symbol.for("lit-noChange"),J=Symbol.for("lit-nothing"),V=new WeakMap,X=N.createTreeWalker(N,129);function Q(t,e){if(!H(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==D?D.createHTML(e):e}const G=(t,e)=>{const n=t.length-1,i=[];let r,o=2===e?"<svg>":3===e?"<math>":"",s=I;for(let e=0;e<n;e++){const n=t[e];let a,c,h=-1,d=0;for(;d<n.length&&(s.lastIndex=d,c=s.exec(n),null!==c);)d=s.lastIndex,s===I?"!--"===c[1]?s=j:void 0!==c[1]?s=W:void 0!==c[2]?(B.test(c[2])&&(r=RegExp("</"+c[2],"g")),s=z):void 0!==c[3]&&(s=z):s===z?">"===c[0]?(s=r??I,h=-1):void 0===c[1]?h=-2:(h=s.lastIndex-c[2].length,a=c[1],s=void 0===c[3]?z:'"'===c[3]?F:q):s===F||s===q?s=z:s===j||s===W?s=I:(s=z,r=void 0);const l=s===z&&t[e+1].startsWith("/>")?" ":"";o+=s===I?n+M:h>=0?(i.push(a),n.slice(0,h)+O+n.slice(h)+U+l):n+U+(-2===h?e:l)}return[Q(t,o+(t[n]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),i]};class tt{constructor({strings:t,_$litType$:e},n){let i;this.parts=[];let r=0,o=0;const s=t.length-1,a=this.parts,[c,h]=G(t,e);if(this.el=tt.createElement(c,n),X.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(i=X.nextNode())&&a.length<s;){if(1===i.nodeType){if(i.hasAttributes())for(const t of i.getAttributeNames())if(t.endsWith(O)){const e=h[o++],n=i.getAttribute(t).split(U),s=/([.?@])?(.*)/.exec(e);a.push({type:1,index:r,name:s[2],strings:n,ctor:"."===s[1]?ot:"?"===s[1]?st:"@"===s[1]?at:rt}),i.removeAttribute(t)}else t.startsWith(U)&&(a.push({type:6,index:r}),i.removeAttribute(t));if(B.test(i.tagName)){const t=i.textContent.split(U),e=t.length-1;if(e>0){i.textContent=C?C.emptyScript:"";for(let n=0;n<e;n++)i.append(t[n],R()),X.nextNode(),a.push({type:2,index:++r});i.append(t[e],R())}}}else if(8===i.nodeType)if(i.data===L)a.push({type:2,index:r});else{let t=-1;for(;-1!==(t=i.data.indexOf(U,t+1));)a.push({type:7,index:r}),t+=U.length-1}r++}}static createElement(t,e){const n=N.createElement("template");return n.innerHTML=t,n}}function et(t,e,n=t,i){if(e===Z)return e;let r=void 0!==i?n._$Co?.[i]:n._$Cl;const o=Y(e)?void 0:e._$litDirective$;return r?.constructor!==o&&(r?._$AO?.(!1),void 0===o?r=void 0:(r=new o(t),r._$AT(t,n,i)),void 0!==i?(n._$Co??=[])[i]=r:n._$Cl=r),void 0!==r&&(e=et(t,r._$AS(t,e.values),r,i)),e}class nt{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:n}=this._$AD,i=(t?.creationScope??N).importNode(e,!0);X.currentNode=i;let r=X.nextNode(),o=0,s=0,a=n[0];for(;void 0!==a;){if(o===a.index){let e;2===a.type?e=new it(r,r.nextSibling,this,t):1===a.type?e=new a.ctor(r,a.name,a.strings,this,t):6===a.type&&(e=new ct(r,this,t)),this._$AV.push(e),a=n[++s]}o!==a?.index&&(r=X.nextNode(),o++)}return X.currentNode=N,i}p(t){let e=0;for(const n of this._$AV)void 0!==n&&(void 0!==n.strings?(n._$AI(t,n,e),e+=n.strings.length-2):n._$AI(t[e])),e++}}class it{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,n,i){this.type=2,this._$AH=J,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=n,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=et(this,t,e),Y(t)?t===J||null==t||""===t?(this._$AH!==J&&this._$AR(),this._$AH=J):t!==this._$AH&&t!==Z&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>H(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==J&&Y(this._$AH)?this._$AA.nextSibling.data=t:this.T(N.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:n}=t,i="number"==typeof n?this._$AC(t):(void 0===n.el&&(n.el=tt.createElement(Q(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===i)this._$AH.p(e);else{const t=new nt(i,this),n=t.u(this.options);t.p(e),this.T(n),this._$AH=t}}_$AC(t){let e=V.get(t.strings);return void 0===e&&V.set(t.strings,e=new tt(t)),e}k(t){H(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let n,i=0;for(const r of t)i===e.length?e.push(n=new it(this.O(R()),this.O(R()),this,this.options)):n=e[i],n._$AI(r),i++;i<e.length&&(this._$AR(n&&n._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=S(t).nextSibling;S(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class rt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,n,i,r){this.type=1,this._$AH=J,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=r,n.length>2||""!==n[0]||""!==n[1]?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=J}_$AI(t,e=this,n,i){const r=this.strings;let o=!1;if(void 0===r)t=et(this,t,e,0),o=!Y(t)||t!==this._$AH&&t!==Z,o&&(this._$AH=t);else{const i=t;let s,a;for(t=r[0],s=0;s<r.length-1;s++)a=et(this,i[n+s],e,s),a===Z&&(a=this._$AH[s]),o||=!Y(a)||a!==this._$AH[s],a===J?t=J:t!==J&&(t+=(a??"")+r[s+1]),this._$AH[s]=a}o&&!i&&this.j(t)}j(t){t===J?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class ot extends rt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===J?void 0:t}}class st extends rt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==J)}}class at extends rt{constructor(t,e,n,i,r){super(t,e,n,i,r),this.type=5}_$AI(t,e=this){if((t=et(this,t,e,0)??J)===Z)return;const n=this._$AH,i=t===J&&n!==J||t.capture!==n.capture||t.once!==n.once||t.passive!==n.passive,r=t!==J&&(n===J||i);i&&this.element.removeEventListener(this.name,this,n),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class ct{constructor(t,e,n){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(t){et(this,t)}}const ht=A.litHtmlPolyfillSupport;ht?.(tt,it),(A.litHtmlVersions??=[]).push("3.3.2");const dt=globalThis;let lt=class extends T{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,n)=>{const i=n?.renderBefore??e;let r=i._$litPart$;if(void 0===r){const t=n?.renderBefore??null;i._$litPart$=r=new it(e.insertBefore(R(),t),t,void 0,n??{})}return r._$AI(t),r})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return Z}};lt._$litElement$=!0,lt.finalized=!0,dt.litElementHydrateSupport?.({LitElement:lt});const ut=dt.litElementPolyfillSupport;ut?.({LitElement:lt}),(dt.litElementVersions??=[]).push("4.2.2");const pt={attribute:!0,type:String,converter:E,reflect:!1,hasChanged:x},yt=(t=pt,e,n)=>{const{kind:i,metadata:r}=n;let o=globalThis.litPropertyMetadata.get(r);if(void 0===o&&globalThis.litPropertyMetadata.set(r,o=new Map),"setter"===i&&((t=Object.create(t)).wrapped=!0),o.set(n.name,t),"accessor"===i){const{name:i}=n;return{set(n){const r=e.get.call(this);e.set.call(this,n),this.requestUpdate(i,r,t,!0,n)},init(e){return void 0!==e&&this.C(i,void 0,t,e),e}}}if("setter"===i){const{name:i}=n;return function(n){const r=this[i];e.call(this,n),this.requestUpdate(i,r,t,!0,n)}}throw Error("Unsupported decorator location: "+i)};function ft(t){return(e,n)=>"object"==typeof n?yt(t,e,n):((t,e,n)=>{const i=e.hasOwnProperty(n);return e.constructor.createProperty(n,t),i?Object.getOwnPropertyDescriptor(e,n):void 0})(t,e,n)}function mt(t){return ft({...t,state:!0,attribute:!1})}function bt(t,e){customElements.get(t)||customElements.define(t,e)}var gt=["MO","TU","WE","TH","FR","SA","SU"],vt=function(){function t(t,e){if(0===e)throw new Error("Can't create weekday with n == 0");this.weekday=t,this.n=e}return t.fromStr=function(e){return new t(gt.indexOf(e))},t.prototype.nth=function(e){return this.n===e?this:new t(this.weekday,e)},t.prototype.equals=function(t){return this.weekday===t.weekday&&this.n===t.n},t.prototype.toString=function(){var t=gt[this.weekday];return this.n&&(t=(this.n>0?"+":"")+String(this.n)+t),t},t.prototype.getJsWeekday=function(){return 6===this.weekday?0:this.weekday+1},t}(),_t=function(t){return null!=t},wt=function(t){return"number"==typeof t},kt=function(t){return"string"==typeof t&&gt.includes(t)},Et=Array.isArray,xt=function(t,e){void 0===e&&(e=t),1===arguments.length&&(e=t,t=0);for(var n=[],i=t;i<e;i++)n.push(i);return n},$t=function(t,e){var n=0,i=[];if(Et(t))for(;n<e;n++)i[n]=[].concat(t);else for(;n<e;n++)i[n]=t;return i},Tt=function(t){return Et(t)?t:[t]};function At(t,e,n){void 0===n&&(n=" ");var i=String(t);return e|=0,i.length>e?String(i):((e-=i.length)>n.length&&(n+=$t(n,e/n.length)),n.slice(0,e)+String(i))}var St,Ct=function(t,e){var n=t%e;return n*e<0?n+e:n},Dt=function(t,e){return{div:Math.floor(t/e),mod:Ct(t,e)}},Ot=function(t){return!_t(t)||0===t.length},Ut=function(t){return!Ot(t)},Lt=function(t,e){return Ut(t)&&-1!==t.indexOf(e)},Mt=function(t,e,n,i,r,o){return void 0===i&&(i=0),void 0===r&&(r=0),void 0===o&&(o=0),new Date(Date.UTC(t,e-1,n,i,r,o))},Nt=[31,28,31,30,31,30,31,31,30,31,30,31],Rt=864e5,Yt=Mt(1970,1,1),Ht=[6,0,1,2,3,4,5],Pt=function(t){return t%4==0&&t%100!=0||t%400==0},It=function(t){return t instanceof Date},jt=function(t){return It(t)&&!isNaN(t.getTime())},Wt=function(t){return e=Yt,n=t.getTime()-e.getTime(),Math.round(n/Rt);var e,n},zt=function(t){return new Date(Yt.getTime()+t*Rt)},qt=function(t){var e=t.getUTCMonth();return 1===e&&Pt(t.getUTCFullYear())?29:Nt[e]},Ft=function(t){return Ht[t.getUTCDay()]},Bt=function(t,e){var n=Mt(t,e+1,1);return[Ft(n),qt(n)]},Kt=function(t,e){return e=e||t,new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate(),e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds()))},Zt=function(t){return new Date(t.getTime())},Jt=function(t){for(var e=[],n=0;n<t.length;n++)e.push(Zt(t[n]));return e},Vt=function(t){t.sort(function(t,e){return t.getTime()-e.getTime()})},Xt=function(t,e){void 0===e&&(e=!0);var n=new Date(t);return[At(n.getUTCFullYear().toString(),4,"0"),At(n.getUTCMonth()+1,2,"0"),At(n.getUTCDate(),2,"0"),"T",At(n.getUTCHours(),2,"0"),At(n.getUTCMinutes(),2,"0"),At(n.getUTCSeconds(),2,"0"),e?"Z":""].join("")},Qt=function(t){var e=/^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})Z?)?$/.exec(t);if(!e)throw new Error("Invalid UNTIL value: ".concat(t));return new Date(Date.UTC(parseInt(e[1],10),parseInt(e[2],10)-1,parseInt(e[3],10),parseInt(e[5],10)||0,parseInt(e[6],10)||0,parseInt(e[7],10)||0))},Gt=function(t,e){return t.toLocaleString("sv-SE",{timeZone:e}).replace(" ","T")+"Z"},te=function(){function t(t,e){this.minDate=null,this.maxDate=null,this._result=[],this.total=0,this.method=t,this.args=e,"between"===t?(this.maxDate=e.inc?e.before:new Date(e.before.getTime()-1),this.minDate=e.inc?e.after:new Date(e.after.getTime()+1)):"before"===t?this.maxDate=e.inc?e.dt:new Date(e.dt.getTime()-1):"after"===t&&(this.minDate=e.inc?e.dt:new Date(e.dt.getTime()+1))}return t.prototype.accept=function(t){++this.total;var e=this.minDate&&t<this.minDate,n=this.maxDate&&t>this.maxDate;if("between"===this.method){if(e)return!0;if(n)return!1}else if("before"===this.method){if(n)return!1}else if("after"===this.method)return!!e||(this.add(t),!1);return this.add(t)},t.prototype.add=function(t){return this._result.push(t),!0},t.prototype.getValue=function(){var t=this._result;switch(this.method){case"all":case"between":return t;default:return t.length?t[t.length-1]:null}},t.prototype.clone=function(){return new t(this.method,this.args)},t}(),ee=function(t){function n(e,n,i){var r=t.call(this,e,n)||this;return r.iterator=i,r}return e(n,t),n.prototype.add=function(t){return!!this.iterator(t,this._result.length)&&(this._result.push(t),!0)},n}(te),ne={dayNames:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],monthNames:["January","February","March","April","May","June","July","August","September","October","November","December"],tokens:{SKIP:/^[ \r\n\t]+|^\.$/,number:/^[1-9][0-9]*/,numberAsText:/^(one|two|three)/i,every:/^every/i,"day(s)":/^days?/i,"weekday(s)":/^weekdays?/i,"week(s)":/^weeks?/i,"hour(s)":/^hours?/i,"minute(s)":/^minutes?/i,"month(s)":/^months?/i,"year(s)":/^years?/i,on:/^(on|in)/i,at:/^(at)/i,the:/^the/i,first:/^first/i,second:/^second/i,third:/^third/i,nth:/^([1-9][0-9]*)(\.|th|nd|rd|st)/i,last:/^last/i,for:/^for/i,"time(s)":/^times?/i,until:/^(un)?til/i,monday:/^mo(n(day)?)?/i,tuesday:/^tu(e(s(day)?)?)?/i,wednesday:/^we(d(n(esday)?)?)?/i,thursday:/^th(u(r(sday)?)?)?/i,friday:/^fr(i(day)?)?/i,saturday:/^sa(t(urday)?)?/i,sunday:/^su(n(day)?)?/i,january:/^jan(uary)?/i,february:/^feb(ruary)?/i,march:/^mar(ch)?/i,april:/^apr(il)?/i,may:/^may/i,june:/^june?/i,july:/^july?/i,august:/^aug(ust)?/i,september:/^sep(t(ember)?)?/i,october:/^oct(ober)?/i,november:/^nov(ember)?/i,december:/^dec(ember)?/i,comma:/^(,\s*|(and|or)\s*)+/i}},ie=function(t,e){return-1!==t.indexOf(e)},re=function(t){return t.toString()},oe=function(t,e,n){return"".concat(e," ").concat(n,", ").concat(t)},se=function(){function t(t,e,n,i){if(void 0===e&&(e=re),void 0===n&&(n=ne),void 0===i&&(i=oe),this.text=[],this.language=n||ne,this.gettext=e,this.dateFormatter=i,this.rrule=t,this.options=t.options,this.origOptions=t.origOptions,this.origOptions.bymonthday){var r=[].concat(this.options.bymonthday),o=[].concat(this.options.bynmonthday);r.sort(function(t,e){return t-e}),o.sort(function(t,e){return e-t}),this.bymonthday=r.concat(o),this.bymonthday.length||(this.bymonthday=null)}if(_t(this.origOptions.byweekday)){var s=Et(this.origOptions.byweekday)?this.origOptions.byweekday:[this.origOptions.byweekday],a=String(s);this.byweekday={allWeeks:s.filter(function(t){return!t.n}),someWeeks:s.filter(function(t){return Boolean(t.n)}),isWeekdays:-1!==a.indexOf("MO")&&-1!==a.indexOf("TU")&&-1!==a.indexOf("WE")&&-1!==a.indexOf("TH")&&-1!==a.indexOf("FR")&&-1===a.indexOf("SA")&&-1===a.indexOf("SU"),isEveryDay:-1!==a.indexOf("MO")&&-1!==a.indexOf("TU")&&-1!==a.indexOf("WE")&&-1!==a.indexOf("TH")&&-1!==a.indexOf("FR")&&-1!==a.indexOf("SA")&&-1!==a.indexOf("SU")};var c=function(t,e){return t.weekday-e.weekday};this.byweekday.allWeeks.sort(c),this.byweekday.someWeeks.sort(c),this.byweekday.allWeeks.length||(this.byweekday.allWeeks=null),this.byweekday.someWeeks.length||(this.byweekday.someWeeks=null)}else this.byweekday=null}return t.isFullyConvertible=function(e){if(!(e.options.freq in t.IMPLEMENTED))return!1;if(e.origOptions.until&&e.origOptions.count)return!1;for(var n in e.origOptions){if(ie(["dtstart","tzid","wkst","freq"],n))return!0;if(!ie(t.IMPLEMENTED[e.options.freq],n))return!1}return!0},t.prototype.isFullyConvertible=function(){return t.isFullyConvertible(this.rrule)},t.prototype.toString=function(){var e=this.gettext;if(!(this.options.freq in t.IMPLEMENTED))return e("RRule error: Unable to fully convert this rrule to text");if(this.text=[e("every")],this[en.FREQUENCIES[this.options.freq]](),this.options.until){this.add(e("until"));var n=this.options.until;this.add(this.dateFormatter(n.getUTCFullYear(),this.language.monthNames[n.getUTCMonth()],n.getUTCDate()))}else this.options.count&&this.add(e("for")).add(this.options.count.toString()).add(this.plural(this.options.count)?e("times"):e("time"));return this.isFullyConvertible()||this.add(e("(~ approximate)")),this.text.join("")},t.prototype.HOURLY=function(){var t=this.gettext;1!==this.options.interval&&this.add(this.options.interval.toString()),this.add(this.plural(this.options.interval)?t("hours"):t("hour"))},t.prototype.MINUTELY=function(){var t=this.gettext;1!==this.options.interval&&this.add(this.options.interval.toString()),this.add(this.plural(this.options.interval)?t("minutes"):t("minute"))},t.prototype.DAILY=function(){var t=this.gettext;1!==this.options.interval&&this.add(this.options.interval.toString()),this.byweekday&&this.byweekday.isWeekdays?this.add(this.plural(this.options.interval)?t("weekdays"):t("weekday")):this.add(this.plural(this.options.interval)?t("days"):t("day")),this.origOptions.bymonth&&(this.add(t("in")),this._bymonth()),this.bymonthday?this._bymonthday():this.byweekday?this._byweekday():this.origOptions.byhour&&this._byhour()},t.prototype.WEEKLY=function(){var t=this.gettext;1!==this.options.interval&&this.add(this.options.interval.toString()).add(this.plural(this.options.interval)?t("weeks"):t("week")),this.byweekday&&this.byweekday.isWeekdays?1===this.options.interval?this.add(this.plural(this.options.interval)?t("weekdays"):t("weekday")):this.add(t("on")).add(t("weekdays")):this.byweekday&&this.byweekday.isEveryDay?this.add(this.plural(this.options.interval)?t("days"):t("day")):(1===this.options.interval&&this.add(t("week")),this.origOptions.bymonth&&(this.add(t("in")),this._bymonth()),this.bymonthday?this._bymonthday():this.byweekday&&this._byweekday(),this.origOptions.byhour&&this._byhour())},t.prototype.MONTHLY=function(){var t=this.gettext;this.origOptions.bymonth?(1!==this.options.interval&&(this.add(this.options.interval.toString()).add(t("months")),this.plural(this.options.interval)&&this.add(t("in"))),this._bymonth()):(1!==this.options.interval&&this.add(this.options.interval.toString()),this.add(this.plural(this.options.interval)?t("months"):t("month"))),this.bymonthday?this._bymonthday():this.byweekday&&this.byweekday.isWeekdays?this.add(t("on")).add(t("weekdays")):this.byweekday&&this._byweekday()},t.prototype.YEARLY=function(){var t=this.gettext;this.origOptions.bymonth?(1!==this.options.interval&&(this.add(this.options.interval.toString()),this.add(t("years"))),this._bymonth()):(1!==this.options.interval&&this.add(this.options.interval.toString()),this.add(this.plural(this.options.interval)?t("years"):t("year"))),this.bymonthday?this._bymonthday():this.byweekday&&this._byweekday(),this.options.byyearday&&this.add(t("on the")).add(this.list(this.options.byyearday,this.nth,t("and"))).add(t("day")),this.options.byweekno&&this.add(t("in")).add(this.plural(this.options.byweekno.length)?t("weeks"):t("week")).add(this.list(this.options.byweekno,void 0,t("and")))},t.prototype._bymonthday=function(){var t=this.gettext;this.byweekday&&this.byweekday.allWeeks?this.add(t("on")).add(this.list(this.byweekday.allWeeks,this.weekdaytext,t("or"))).add(t("the")).add(this.list(this.bymonthday,this.nth,t("or"))):this.add(t("on the")).add(this.list(this.bymonthday,this.nth,t("and")))},t.prototype._byweekday=function(){var t=this.gettext;this.byweekday.allWeeks&&!this.byweekday.isWeekdays&&this.add(t("on")).add(this.list(this.byweekday.allWeeks,this.weekdaytext)),this.byweekday.someWeeks&&(this.byweekday.allWeeks&&this.add(t("and")),this.add(t("on the")).add(this.list(this.byweekday.someWeeks,this.weekdaytext,t("and"))))},t.prototype._byhour=function(){var t=this.gettext;this.add(t("at")).add(this.list(this.origOptions.byhour,void 0,t("and")))},t.prototype._bymonth=function(){this.add(this.list(this.options.bymonth,this.monthtext,this.gettext("and")))},t.prototype.nth=function(t){var e;t=parseInt(t.toString(),10);var n=this.gettext;if(-1===t)return n("last");var i=Math.abs(t);switch(i){case 1:case 21:case 31:e=i+n("st");break;case 2:case 22:e=i+n("nd");break;case 3:case 23:e=i+n("rd");break;default:e=i+n("th")}return t<0?e+" "+n("last"):e},t.prototype.monthtext=function(t){return this.language.monthNames[t-1]},t.prototype.weekdaytext=function(t){var e=wt(t)?(t+1)%7:t.getJsWeekday();return(t.n?this.nth(t.n)+" ":"")+this.language.dayNames[e]},t.prototype.plural=function(t){return t%100!=1},t.prototype.add=function(t){return this.text.push(" "),this.text.push(t),this},t.prototype.list=function(t,e,n,i){var r=this;void 0===i&&(i=","),Et(t)||(t=[t]);e=e||function(t){return t.toString()};var o=function(t){return e&&e.call(r,t)};return n?function(t,e,n){for(var i="",r=0;r<t.length;r++)0!==r&&(r===t.length-1?i+=" "+n+" ":i+=e+" "),i+=t[r];return i}(t.map(o),i,n):t.map(o).join(i+" ")},t}(),ae=function(){function t(t){this.done=!0,this.rules=t}return t.prototype.start=function(t){return this.text=t,this.done=!1,this.nextSymbol()},t.prototype.isDone=function(){return this.done&&null===this.symbol},t.prototype.nextSymbol=function(){var t,e;this.symbol=null,this.value=null;do{if(this.done)return!1;for(var n in t=null,this.rules){var i=this.rules[n].exec(this.text);i&&(null===t||i[0].length>t[0].length)&&(t=i,e=n)}if(null!=t&&(this.text=this.text.substr(t[0].length),""===this.text&&(this.done=!0)),null==t)return this.done=!0,this.symbol=null,void(this.value=null)}while("SKIP"===e);return this.symbol=e,this.value=t,!0},t.prototype.accept=function(t){if(this.symbol===t){if(this.value){var e=this.value;return this.nextSymbol(),e}return this.nextSymbol(),!0}return!1},t.prototype.acceptNumber=function(){return this.accept("number")},t.prototype.expect=function(t){if(this.accept(t))return!0;throw new Error("expected "+t+" but found "+this.symbol)},t}();function ce(t,e){void 0===e&&(e=ne);var n={},i=new ae(e.tokens);return i.start(t)?(function(){i.expect("every");var t=i.acceptNumber();t&&(n.interval=parseInt(t[0],10));if(i.isDone())throw new Error("Unexpected end");switch(i.symbol){case"day(s)":n.freq=en.DAILY,i.nextSymbol()&&(o(),h());break;case"weekday(s)":n.freq=en.WEEKLY,n.byweekday=[en.MO,en.TU,en.WE,en.TH,en.FR],i.nextSymbol(),o(),h();break;case"week(s)":n.freq=en.WEEKLY,i.nextSymbol()&&(r(),o(),h());break;case"hour(s)":n.freq=en.HOURLY,i.nextSymbol()&&(r(),h());break;case"minute(s)":n.freq=en.MINUTELY,i.nextSymbol()&&(r(),h());break;case"month(s)":n.freq=en.MONTHLY,i.nextSymbol()&&(r(),h());break;case"year(s)":n.freq=en.YEARLY,i.nextSymbol()&&(r(),h());break;case"monday":case"tuesday":case"wednesday":case"thursday":case"friday":case"saturday":case"sunday":n.freq=en.WEEKLY;var e=i.symbol.substr(0,2).toUpperCase();if(n.byweekday=[en[e]],!i.nextSymbol())return;for(;i.accept("comma");){if(i.isDone())throw new Error("Unexpected end");var d=a();if(!d)throw new Error("Unexpected symbol "+i.symbol+", expected weekday");n.byweekday.push(en[d]),i.nextSymbol()}o(),function(){i.accept("on"),i.accept("the");var t=c();if(!t)return;n.bymonthday=[t],i.nextSymbol();for(;i.accept("comma");){if(!(t=c()))throw new Error("Unexpected symbol "+i.symbol+"; expected monthday");n.bymonthday.push(t),i.nextSymbol()}}(),h();break;case"january":case"february":case"march":case"april":case"may":case"june":case"july":case"august":case"september":case"october":case"november":case"december":if(n.freq=en.YEARLY,n.bymonth=[s()],!i.nextSymbol())return;for(;i.accept("comma");){if(i.isDone())throw new Error("Unexpected end");var l=s();if(!l)throw new Error("Unexpected symbol "+i.symbol+", expected month");n.bymonth.push(l),i.nextSymbol()}r(),h();break;default:throw new Error("Unknown symbol")}}(),n):null;function r(){var t=i.accept("on"),e=i.accept("the");if(t||e)do{var r=c(),o=a(),h=s();if(r)o?(i.nextSymbol(),n.byweekday||(n.byweekday=[]),n.byweekday.push(en[o].nth(r))):(n.bymonthday||(n.bymonthday=[]),n.bymonthday.push(r),i.accept("day(s)"));else if(o)i.nextSymbol(),n.byweekday||(n.byweekday=[]),n.byweekday.push(en[o]);else if("weekday(s)"===i.symbol)i.nextSymbol(),n.byweekday||(n.byweekday=[en.MO,en.TU,en.WE,en.TH,en.FR]);else if("week(s)"===i.symbol){i.nextSymbol();var d=i.acceptNumber();if(!d)throw new Error("Unexpected symbol "+i.symbol+", expected week number");for(n.byweekno=[parseInt(d[0],10)];i.accept("comma");){if(!(d=i.acceptNumber()))throw new Error("Unexpected symbol "+i.symbol+"; expected monthday");n.byweekno.push(parseInt(d[0],10))}}else{if(!h)return;i.nextSymbol(),n.bymonth||(n.bymonth=[]),n.bymonth.push(h)}}while(i.accept("comma")||i.accept("the")||i.accept("on"))}function o(){if(i.accept("at"))do{var t=i.acceptNumber();if(!t)throw new Error("Unexpected symbol "+i.symbol+", expected hour");for(n.byhour=[parseInt(t[0],10)];i.accept("comma");){if(!(t=i.acceptNumber()))throw new Error("Unexpected symbol "+i.symbol+"; expected hour");n.byhour.push(parseInt(t[0],10))}}while(i.accept("comma")||i.accept("at"))}function s(){switch(i.symbol){case"january":return 1;case"february":return 2;case"march":return 3;case"april":return 4;case"may":return 5;case"june":return 6;case"july":return 7;case"august":return 8;case"september":return 9;case"october":return 10;case"november":return 11;case"december":return 12;default:return!1}}function a(){switch(i.symbol){case"monday":case"tuesday":case"wednesday":case"thursday":case"friday":case"saturday":case"sunday":return i.symbol.substr(0,2).toUpperCase();default:return!1}}function c(){switch(i.symbol){case"last":return i.nextSymbol(),-1;case"first":return i.nextSymbol(),1;case"second":return i.nextSymbol(),i.accept("last")?-2:2;case"third":return i.nextSymbol(),i.accept("last")?-3:3;case"nth":var t=parseInt(i.value[1],10);if(t<-366||t>366)throw new Error("Nth out of range: "+t);return i.nextSymbol(),i.accept("last")?-t:t;default:return!1}}function h(){if("until"===i.symbol){var t=Date.parse(i.text);if(!t)throw new Error("Cannot parse until date:"+i.text);n.until=new Date(t)}else i.accept("for")&&(n.count=parseInt(i.value[0],10),i.expect("number"))}}function he(t){return t<St.HOURLY}!function(t){t[t.YEARLY=0]="YEARLY",t[t.MONTHLY=1]="MONTHLY",t[t.WEEKLY=2]="WEEKLY",t[t.DAILY=3]="DAILY",t[t.HOURLY=4]="HOURLY",t[t.MINUTELY=5]="MINUTELY",t[t.SECONDLY=6]="SECONDLY"}(St||(St={}));var de=function(t,e){return void 0===e&&(e=ne),new en(ce(t,e)||void 0)},le=["count","until","interval","byweekday","bymonthday","bymonth"];se.IMPLEMENTED=[],se.IMPLEMENTED[St.HOURLY]=le,se.IMPLEMENTED[St.MINUTELY]=le,se.IMPLEMENTED[St.DAILY]=["byhour"].concat(le),se.IMPLEMENTED[St.WEEKLY]=le,se.IMPLEMENTED[St.MONTHLY]=le,se.IMPLEMENTED[St.YEARLY]=["byweekno","byyearday"].concat(le);var ue=se.isFullyConvertible,pe=function(){function t(t,e,n,i){this.hour=t,this.minute=e,this.second=n,this.millisecond=i||0}return t.prototype.getHours=function(){return this.hour},t.prototype.getMinutes=function(){return this.minute},t.prototype.getSeconds=function(){return this.second},t.prototype.getMilliseconds=function(){return this.millisecond},t.prototype.getTime=function(){return 1e3*(60*this.hour*60+60*this.minute+this.second)+this.millisecond},t}(),ye=function(t){function n(e,n,i,r,o,s,a){var c=t.call(this,r,o,s,a)||this;return c.year=e,c.month=n,c.day=i,c}return e(n,t),n.fromDate=function(t){return new this(t.getUTCFullYear(),t.getUTCMonth()+1,t.getUTCDate(),t.getUTCHours(),t.getUTCMinutes(),t.getUTCSeconds(),t.valueOf()%1e3)},n.prototype.getWeekday=function(){return Ft(new Date(this.getTime()))},n.prototype.getTime=function(){return new Date(Date.UTC(this.year,this.month-1,this.day,this.hour,this.minute,this.second,this.millisecond)).getTime()},n.prototype.getDay=function(){return this.day},n.prototype.getMonth=function(){return this.month},n.prototype.getYear=function(){return this.year},n.prototype.addYears=function(t){this.year+=t},n.prototype.addMonths=function(t){if(this.month+=t,this.month>12){var e=Math.floor(this.month/12),n=Ct(this.month,12);this.month=n,this.year+=e,0===this.month&&(this.month=12,--this.year)}},n.prototype.addWeekly=function(t,e){e>this.getWeekday()?this.day+=-(this.getWeekday()+1+(6-e))+7*t:this.day+=-(this.getWeekday()-e)+7*t,this.fixDay()},n.prototype.addDaily=function(t){this.day+=t,this.fixDay()},n.prototype.addHours=function(t,e,n){for(e&&(this.hour+=Math.floor((23-this.hour)/t)*t);;){this.hour+=t;var i=Dt(this.hour,24),r=i.div,o=i.mod;if(r&&(this.hour=o,this.addDaily(r)),Ot(n)||Lt(n,this.hour))break}},n.prototype.addMinutes=function(t,e,n,i){for(e&&(this.minute+=Math.floor((1439-(60*this.hour+this.minute))/t)*t);;){this.minute+=t;var r=Dt(this.minute,60),o=r.div,s=r.mod;if(o&&(this.minute=s,this.addHours(o,!1,n)),(Ot(n)||Lt(n,this.hour))&&(Ot(i)||Lt(i,this.minute)))break}},n.prototype.addSeconds=function(t,e,n,i,r){for(e&&(this.second+=Math.floor((86399-(3600*this.hour+60*this.minute+this.second))/t)*t);;){this.second+=t;var o=Dt(this.second,60),s=o.div,a=o.mod;if(s&&(this.second=a,this.addMinutes(s,!1,n,i)),(Ot(n)||Lt(n,this.hour))&&(Ot(i)||Lt(i,this.minute))&&(Ot(r)||Lt(r,this.second)))break}},n.prototype.fixDay=function(){if(!(this.day<=28)){var t=Bt(this.year,this.month-1)[1];if(!(this.day<=t))for(;this.day>t;){if(this.day-=t,++this.month,13===this.month&&(this.month=1,++this.year,this.year>9999))return;t=Bt(this.year,this.month-1)[1]}}},n.prototype.add=function(t,e){var n=t.freq,i=t.interval,r=t.wkst,o=t.byhour,s=t.byminute,a=t.bysecond;switch(n){case St.YEARLY:return this.addYears(i);case St.MONTHLY:return this.addMonths(i);case St.WEEKLY:return this.addWeekly(i,r);case St.DAILY:return this.addDaily(i);case St.HOURLY:return this.addHours(i,e,o);case St.MINUTELY:return this.addMinutes(i,e,o,s);case St.SECONDLY:return this.addSeconds(i,e,o,s,a)}},n}(pe);function fe(t){for(var e=[],i=0,r=Object.keys(t);i<r.length;i++){var o=r[i];Lt(tn,o)||e.push(o),It(t[o])&&!jt(t[o])&&e.push(o)}if(e.length)throw new Error("Invalid options: "+e.join(", "));return n({},t)}function me(t){var e=n(n({},Ge),fe(t));if(_t(e.byeaster)&&(e.freq=en.YEARLY),!_t(e.freq)||!en.FREQUENCIES[e.freq])throw new Error("Invalid frequency: ".concat(e.freq," ").concat(t.freq));if(e.dtstart||(e.dtstart=new Date((new Date).setMilliseconds(0))),_t(e.wkst)?wt(e.wkst)||(e.wkst=e.wkst.weekday):e.wkst=en.MO.weekday,_t(e.bysetpos)){wt(e.bysetpos)&&(e.bysetpos=[e.bysetpos]);for(var i=0;i<e.bysetpos.length;i++){if(0===(s=e.bysetpos[i])||!(s>=-366&&s<=366))throw new Error("bysetpos must be between 1 and 366, or between -366 and -1")}}if(!(Boolean(e.byweekno)||Ut(e.byweekno)||Ut(e.byyearday)||Boolean(e.bymonthday)||Ut(e.bymonthday)||_t(e.byweekday)||_t(e.byeaster)))switch(e.freq){case en.YEARLY:e.bymonth||(e.bymonth=e.dtstart.getUTCMonth()+1),e.bymonthday=e.dtstart.getUTCDate();break;case en.MONTHLY:e.bymonthday=e.dtstart.getUTCDate();break;case en.WEEKLY:e.byweekday=[Ft(e.dtstart)]}if(_t(e.bymonth)&&!Et(e.bymonth)&&(e.bymonth=[e.bymonth]),_t(e.byyearday)&&!Et(e.byyearday)&&wt(e.byyearday)&&(e.byyearday=[e.byyearday]),_t(e.bymonthday))if(Et(e.bymonthday)){var r=[],o=[];for(i=0;i<e.bymonthday.length;i++){var s;(s=e.bymonthday[i])>0?r.push(s):s<0&&o.push(s)}e.bymonthday=r,e.bynmonthday=o}else e.bymonthday<0?(e.bynmonthday=[e.bymonthday],e.bymonthday=[]):(e.bynmonthday=[],e.bymonthday=[e.bymonthday]);else e.bymonthday=[],e.bynmonthday=[];if(_t(e.byweekno)&&!Et(e.byweekno)&&(e.byweekno=[e.byweekno]),_t(e.byweekday))if(wt(e.byweekday))e.byweekday=[e.byweekday],e.bynweekday=null;else if(kt(e.byweekday))e.byweekday=[vt.fromStr(e.byweekday).weekday],e.bynweekday=null;else if(e.byweekday instanceof vt)!e.byweekday.n||e.freq>en.MONTHLY?(e.byweekday=[e.byweekday.weekday],e.bynweekday=null):(e.bynweekday=[[e.byweekday.weekday,e.byweekday.n]],e.byweekday=null);else{var a=[],c=[];for(i=0;i<e.byweekday.length;i++){var h=e.byweekday[i];wt(h)?a.push(h):kt(h)?a.push(vt.fromStr(h).weekday):!h.n||e.freq>en.MONTHLY?a.push(h.weekday):c.push([h.weekday,h.n])}e.byweekday=Ut(a)?a:null,e.bynweekday=Ut(c)?c:null}else e.bynweekday=null;return _t(e.byhour)?wt(e.byhour)&&(e.byhour=[e.byhour]):e.byhour=e.freq<en.HOURLY?[e.dtstart.getUTCHours()]:null,_t(e.byminute)?wt(e.byminute)&&(e.byminute=[e.byminute]):e.byminute=e.freq<en.MINUTELY?[e.dtstart.getUTCMinutes()]:null,_t(e.bysecond)?wt(e.bysecond)&&(e.bysecond=[e.bysecond]):e.bysecond=e.freq<en.SECONDLY?[e.dtstart.getUTCSeconds()]:null,{parsedOptions:e}}function be(t){var e=t.split("\n").map(ve).filter(function(t){return null!==t});return n(n({},e[0]),e[1])}function ge(t){var e={},n=/DTSTART(?:;TZID=([^:=]+?))?(?::|=)([^;\s]+)/i.exec(t);if(!n)return e;var i=n[1],r=n[2];return i&&(e.tzid=i),e.dtstart=Qt(r),e}function ve(t){if(!(t=t.replace(/^\s+|\s+$/,"")).length)return null;var e=/^([A-Z]+?)[:;]/.exec(t.toUpperCase());if(!e)return _e(t);var n=e[1];switch(n.toUpperCase()){case"RRULE":case"EXRULE":return _e(t);case"DTSTART":return ge(t);default:throw new Error("Unsupported RFC prop ".concat(n," in ").concat(t))}}function _e(t){var e=ge(t.replace(/^RRULE:/i,""));return t.replace(/^(?:RRULE|EXRULE):/i,"").split(";").forEach(function(n){var i=n.split("="),r=i[0],o=i[1];switch(r.toUpperCase()){case"FREQ":e.freq=St[o.toUpperCase()];break;case"WKST":e.wkst=Qe[o.toUpperCase()];break;case"COUNT":case"INTERVAL":case"BYSETPOS":case"BYMONTH":case"BYMONTHDAY":case"BYYEARDAY":case"BYWEEKNO":case"BYHOUR":case"BYMINUTE":case"BYSECOND":var s=function(t){if(-1!==t.indexOf(",")){return t.split(",").map(we)}return we(t)}(o),a=r.toLowerCase();e[a]=s;break;case"BYWEEKDAY":case"BYDAY":e.byweekday=function(t){var e=t.split(",");return e.map(function(t){if(2===t.length)return Qe[t];var e=t.match(/^([+-]?\d{1,2})([A-Z]{2})$/);if(!e||e.length<3)throw new SyntaxError("Invalid weekday string: ".concat(t));var n=Number(e[1]),i=e[2],r=Qe[i].weekday;return new vt(r,n)})}(o);break;case"DTSTART":case"TZID":var c=ge(t);e.tzid=c.tzid,e.dtstart=c.dtstart;break;case"UNTIL":e.until=Qt(o);break;case"BYEASTER":e.byeaster=Number(o);break;default:throw new Error("Unknown RRULE property '"+r+"'")}}),e}function we(t){return/^[+-]?\d+$/.test(t)?Number(t):t}var ke=function(){function t(t,e){if(isNaN(t.getTime()))throw new RangeError("Invalid date passed to DateWithZone");this.date=t,this.tzid=e}return Object.defineProperty(t.prototype,"isUTC",{get:function(){return!this.tzid||"UTC"===this.tzid.toUpperCase()},enumerable:!1,configurable:!0}),t.prototype.toString=function(){var t=Xt(this.date.getTime(),this.isUTC);return this.isUTC?":".concat(t):";TZID=".concat(this.tzid,":").concat(t)},t.prototype.getTime=function(){return this.date.getTime()},t.prototype.rezonedDate=function(){return this.isUTC?this.date:(t=this.date,e=this.tzid,n=Intl.DateTimeFormat().resolvedOptions().timeZone,i=new Date(Gt(t,n)),r=new Date(Gt(t,null!=e?e:"UTC")).getTime()-i.getTime(),new Date(t.getTime()-r));var t,e,n,i,r},t}();function Ee(t){for(var e=[],n="",i=Object.keys(t),r=Object.keys(Ge),o=0;o<i.length;o++)if("tzid"!==i[o]&&Lt(r,i[o])){var s=i[o].toUpperCase(),a=t[i[o]],c="";if(_t(a)&&(!Et(a)||a.length)){switch(s){case"FREQ":c=en.FREQUENCIES[t.freq];break;case"WKST":c=wt(a)?new vt(a).toString():a.toString();break;case"BYWEEKDAY":s="BYDAY",c=Tt(a).map(function(t){return t instanceof vt?t:Et(t)?new vt(t[0],t[1]):new vt(t)}).toString();break;case"DTSTART":n=xe(a,t.tzid);break;case"UNTIL":c=Xt(a,!t.tzid);break;default:if(Et(a)){for(var h=[],d=0;d<a.length;d++)h[d]=String(a[d]);c=h.toString()}else c=String(a)}c&&e.push([s,c])}}var l=e.map(function(t){var e=t[0],n=t[1];return"".concat(e,"=").concat(n.toString())}).join(";"),u="";return""!==l&&(u="RRULE:".concat(l)),[n,u].filter(function(t){return!!t}).join("\n")}function xe(t,e){return t?"DTSTART"+new ke(new Date(t),e).toString():""}function $e(t,e){return Array.isArray(t)?!!Array.isArray(e)&&(t.length===e.length&&t.every(function(t,n){return t.getTime()===e[n].getTime()})):t instanceof Date?e instanceof Date&&t.getTime()===e.getTime():t===e}var Te=function(){function t(){this.all=!1,this.before=[],this.after=[],this.between=[]}return t.prototype._cacheAdd=function(t,e,n){e&&(e=e instanceof Date?Zt(e):Jt(e)),"all"===t?this.all=e:(n._value=e,this[t].push(n))},t.prototype._cacheGet=function(t,e){var n=!1,i=e?Object.keys(e):[],r=function(t){for(var n=0;n<i.length;n++){var r=i[n];if(!$e(e[r],t[r]))return!0}return!1},o=this[t];if("all"===t)n=this.all;else if(Et(o))for(var s=0;s<o.length;s++){var a=o[s];if(!i.length||!r(a)){n=a._value;break}}if(!n&&this.all){var c=new te(t,e);for(s=0;s<this.all.length&&c.accept(this.all[s]);s++);n=c.getValue(),this._cacheAdd(t,n,e)}return Et(n)?Jt(n):n instanceof Date?Zt(n):n},t}(),Ae=r(r(r(r(r(r(r(r(r(r(r(r(r([],$t(1,31),!0),$t(2,28),!0),$t(3,31),!0),$t(4,30),!0),$t(5,31),!0),$t(6,30),!0),$t(7,31),!0),$t(8,31),!0),$t(9,30),!0),$t(10,31),!0),$t(11,30),!0),$t(12,31),!0),$t(1,7),!0),Se=r(r(r(r(r(r(r(r(r(r(r(r(r([],$t(1,31),!0),$t(2,29),!0),$t(3,31),!0),$t(4,30),!0),$t(5,31),!0),$t(6,30),!0),$t(7,31),!0),$t(8,31),!0),$t(9,30),!0),$t(10,31),!0),$t(11,30),!0),$t(12,31),!0),$t(1,7),!0),Ce=xt(1,29),De=xt(1,30),Oe=xt(1,31),Ue=xt(1,32),Le=r(r(r(r(r(r(r(r(r(r(r(r(r([],Ue,!0),De,!0),Ue,!0),Oe,!0),Ue,!0),Oe,!0),Ue,!0),Ue,!0),Oe,!0),Ue,!0),Oe,!0),Ue,!0),Ue.slice(0,7),!0),Me=r(r(r(r(r(r(r(r(r(r(r(r(r([],Ue,!0),Ce,!0),Ue,!0),Oe,!0),Ue,!0),Oe,!0),Ue,!0),Ue,!0),Oe,!0),Ue,!0),Oe,!0),Ue,!0),Ue.slice(0,7),!0),Ne=xt(-28,0),Re=xt(-29,0),Ye=xt(-30,0),He=xt(-31,0),Pe=r(r(r(r(r(r(r(r(r(r(r(r(r([],He,!0),Re,!0),He,!0),Ye,!0),He,!0),Ye,!0),He,!0),He,!0),Ye,!0),He,!0),Ye,!0),He,!0),He.slice(0,7),!0),Ie=r(r(r(r(r(r(r(r(r(r(r(r(r([],He,!0),Ne,!0),He,!0),Ye,!0),He,!0),Ye,!0),He,!0),He,!0),Ye,!0),He,!0),Ye,!0),He,!0),He.slice(0,7),!0),je=[0,31,60,91,121,152,182,213,244,274,305,335,366],We=[0,31,59,90,120,151,181,212,243,273,304,334,365],ze=function(){for(var t=[],e=0;e<55;e++)t=t.concat(xt(7));return t}();function qe(t,e){var i,r,o=Mt(t,1,1),s=Pt(t)?366:365,a=Pt(t+1)?366:365,c=Wt(o),h=Ft(o),d=n(n({yearlen:s,nextyearlen:a,yearordinal:c,yearweekday:h},function(t){var e=Pt(t)?366:365,n=Mt(t,1,1),i=Ft(n);if(365===e)return{mmask:Ae,mdaymask:Me,nmdaymask:Ie,wdaymask:ze.slice(i),mrange:We};return{mmask:Se,mdaymask:Le,nmdaymask:Pe,wdaymask:ze.slice(i),mrange:je}}(t)),{wnomask:null});if(Ot(e.byweekno))return d;d.wnomask=$t(0,s+7);var l=i=Ct(7-h+e.wkst,7);l>=4?(l=0,r=d.yearlen+Ct(h-e.wkst,7)):r=s-l;for(var u=Math.floor(r/7),p=Ct(r,7),y=Math.floor(u+p/4),f=0;f<e.byweekno.length;f++){var m=e.byweekno[f];if(m<0&&(m+=y+1),m>0&&m<=y){var b=void 0;m>1?(b=l+7*(m-1),l!==i&&(b-=7-i)):b=l;for(var g=0;g<7&&(d.wnomask[b]=1,b++,d.wdaymask[b]!==e.wkst);g++);}}if(Lt(e.byweekno,1)){b=l+7*y;if(l!==i&&(b-=7-i),b<s)for(f=0;f<7&&(d.wnomask[b]=1,b+=1,d.wdaymask[b]!==e.wkst);f++);}if(l){var v=void 0;if(Lt(e.byweekno,-1))v=-1;else{var _=Ft(Mt(t-1,1,1)),w=Ct(7-_.valueOf()+e.wkst,7),k=Pt(t-1)?366:365,E=void 0;w>=4?(w=0,E=k+Ct(_-e.wkst,7)):E=s-l,v=Math.floor(52+Ct(E,7)/4)}if(Lt(e.byweekno,v))for(b=0;b<l;b++)d.wnomask[b]=1}return d}var Fe=function(){function t(t){this.options=t}return t.prototype.rebuild=function(t,e){var n=this.options;if(t!==this.lastyear&&(this.yearinfo=qe(t,n)),Ut(n.bynweekday)&&(e!==this.lastmonth||t!==this.lastyear)){var i=this.yearinfo,r=i.yearlen,o=i.mrange,s=i.wdaymask;this.monthinfo=function(t,e,n,i,r,o){var s={lastyear:t,lastmonth:e,nwdaymask:[]},a=[];if(o.freq===en.YEARLY)if(Ot(o.bymonth))a=[[0,n]];else for(var c=0;c<o.bymonth.length;c++)e=o.bymonth[c],a.push(i.slice(e-1,e+1));else o.freq===en.MONTHLY&&(a=[i.slice(e-1,e+1)]);if(Ot(a))return s;for(s.nwdaymask=$t(0,n),c=0;c<a.length;c++)for(var h=a[c],d=h[0],l=h[1]-1,u=0;u<o.bynweekday.length;u++){var p=void 0,y=o.bynweekday[u],f=y[0],m=y[1];m<0?(p=l+7*(m+1),p-=Ct(r[p]-f,7)):(p=d+7*(m-1),p+=Ct(7-r[p]+f,7)),d<=p&&p<=l&&(s.nwdaymask[p]=1)}return s}(t,e,r,o,s,n)}_t(n.byeaster)&&(this.eastermask=function(t,e){void 0===e&&(e=0);var n=t%19,i=Math.floor(t/100),r=t%100,o=Math.floor(i/4),s=i%4,a=Math.floor((i+8)/25),c=Math.floor((i-a+1)/3),h=Math.floor(19*n+i-o-c+15)%30,d=Math.floor(r/4),l=r%4,u=Math.floor(32+2*s+2*d-h-l)%7,p=Math.floor((n+11*h+22*u)/451),y=Math.floor((h+u-7*p+114)/31),f=(h+u-7*p+114)%31+1,m=Date.UTC(t,y-1,f+e),b=Date.UTC(t,0,1);return[Math.ceil((m-b)/864e5)]}(t,n.byeaster))},Object.defineProperty(t.prototype,"lastyear",{get:function(){return this.monthinfo?this.monthinfo.lastyear:null},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"lastmonth",{get:function(){return this.monthinfo?this.monthinfo.lastmonth:null},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"yearlen",{get:function(){return this.yearinfo.yearlen},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"yearordinal",{get:function(){return this.yearinfo.yearordinal},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"mrange",{get:function(){return this.yearinfo.mrange},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"wdaymask",{get:function(){return this.yearinfo.wdaymask},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"mmask",{get:function(){return this.yearinfo.mmask},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"wnomask",{get:function(){return this.yearinfo.wnomask},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"nwdaymask",{get:function(){return this.monthinfo?this.monthinfo.nwdaymask:[]},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"nextyearlen",{get:function(){return this.yearinfo.nextyearlen},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"mdaymask",{get:function(){return this.yearinfo.mdaymask},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"nmdaymask",{get:function(){return this.yearinfo.nmdaymask},enumerable:!1,configurable:!0}),t.prototype.ydayset=function(){return[xt(this.yearlen),0,this.yearlen]},t.prototype.mdayset=function(t,e){for(var n=this.mrange[e-1],i=this.mrange[e],r=$t(null,this.yearlen),o=n;o<i;o++)r[o]=o;return[r,n,i]},t.prototype.wdayset=function(t,e,n){for(var i=$t(null,this.yearlen+7),r=Wt(Mt(t,e,n))-this.yearordinal,o=r,s=0;s<7&&(i[r]=r,++r,this.wdaymask[r]!==this.options.wkst);s++);return[i,o,r]},t.prototype.ddayset=function(t,e,n){var i=$t(null,this.yearlen),r=Wt(Mt(t,e,n))-this.yearordinal;return i[r]=r,[i,r,r+1]},t.prototype.htimeset=function(t,e,n,i){var r=this,o=[];return this.options.byminute.forEach(function(e){o=o.concat(r.mtimeset(t,e,n,i))}),Vt(o),o},t.prototype.mtimeset=function(t,e,n,i){var r=this.options.bysecond.map(function(n){return new pe(t,e,n,i)});return Vt(r),r},t.prototype.stimeset=function(t,e,n,i){return[new pe(t,e,n,i)]},t.prototype.getdayset=function(t){switch(t){case St.YEARLY:return this.ydayset.bind(this);case St.MONTHLY:return this.mdayset.bind(this);case St.WEEKLY:return this.wdayset.bind(this);case St.DAILY:default:return this.ddayset.bind(this)}},t.prototype.gettimeset=function(t){switch(t){case St.HOURLY:return this.htimeset.bind(this);case St.MINUTELY:return this.mtimeset.bind(this);case St.SECONDLY:return this.stimeset.bind(this)}},t}();function Be(t,e,n,i,r,o){for(var s=[],a=0;a<t.length;a++){var c=void 0,h=void 0,d=t[a];d<0?(c=Math.floor(d/e.length),h=Ct(d,e.length)):(c=Math.floor((d-1)/e.length),h=Ct(d-1,e.length));for(var l=[],u=n;u<i;u++){var p=o[u];_t(p)&&l.push(p)}var y=void 0;y=c<0?l.slice(c)[0]:l[c];var f=e[h],m=zt(r.yearordinal+y),b=Kt(m,f);Lt(s,b)||s.push(b)}return Vt(s),s}function Ke(t,e){var n=e.dtstart,i=e.freq,r=e.interval,o=e.until,s=e.bysetpos,a=e.count;if(0===a||0===r)return Ve(t);var c=ye.fromDate(n),h=new Fe(e);h.rebuild(c.year,c.month);for(var d=function(t,e,n){var i=n.freq,r=n.byhour,o=n.byminute,s=n.bysecond;if(he(i))return function(t){var e=t.dtstart.getTime()%1e3;if(!he(t.freq))return[];var n=[];return t.byhour.forEach(function(i){t.byminute.forEach(function(r){t.bysecond.forEach(function(t){n.push(new pe(i,r,t,e))})})}),n}(n);if(i>=en.HOURLY&&Ut(r)&&!Lt(r,e.hour)||i>=en.MINUTELY&&Ut(o)&&!Lt(o,e.minute)||i>=en.SECONDLY&&Ut(s)&&!Lt(s,e.second))return[];return t.gettimeset(i)(e.hour,e.minute,e.second,e.millisecond)}(h,c,e);;){var l=h.getdayset(i)(c.year,c.month,c.day),u=l[0],p=l[1],y=l[2],f=Xe(u,p,y,h,e);if(Ut(s))for(var m=Be(s,d,p,y,h,u),b=0;b<m.length;b++){var g=m[b];if(o&&g>o)return Ve(t);if(g>=n){var v=Je(g,e);if(!t.accept(v))return Ve(t);if(a&&! --a)return Ve(t)}}else for(b=p;b<y;b++){var _=u[b];if(_t(_))for(var w=zt(h.yearordinal+_),k=0;k<d.length;k++){var E=d[k];g=Kt(w,E);if(o&&g>o)return Ve(t);if(g>=n){v=Je(g,e);if(!t.accept(v))return Ve(t);if(a&&! --a)return Ve(t)}}}if(0===e.interval)return Ve(t);if(c.add(e,f),c.year>9999)return Ve(t);he(i)||(d=h.gettimeset(i)(c.hour,c.minute,c.second,0)),h.rebuild(c.year,c.month)}}function Ze(t,e,n){var i=n.bymonth,r=n.byweekno,o=n.byweekday,s=n.byeaster,a=n.bymonthday,c=n.bynmonthday,h=n.byyearday;return Ut(i)&&!Lt(i,t.mmask[e])||Ut(r)&&!t.wnomask[e]||Ut(o)&&!Lt(o,t.wdaymask[e])||Ut(t.nwdaymask)&&!t.nwdaymask[e]||null!==s&&!Lt(t.eastermask,e)||(Ut(a)||Ut(c))&&!Lt(a,t.mdaymask[e])&&!Lt(c,t.nmdaymask[e])||Ut(h)&&(e<t.yearlen&&!Lt(h,e+1)&&!Lt(h,-t.yearlen+e)||e>=t.yearlen&&!Lt(h,e+1-t.yearlen)&&!Lt(h,-t.nextyearlen+e-t.yearlen))}function Je(t,e){return new ke(t,e.tzid).rezonedDate()}function Ve(t){return t.getValue()}function Xe(t,e,n,i,r){for(var o=!1,s=e;s<n;s++){var a=t[s];(o=Ze(i,a,r))&&(t[a]=null)}return o}var Qe={MO:new vt(0),TU:new vt(1),WE:new vt(2),TH:new vt(3),FR:new vt(4),SA:new vt(5),SU:new vt(6)},Ge={freq:St.YEARLY,dtstart:null,interval:1,wkst:Qe.MO,count:null,until:null,tzid:null,bysetpos:null,bymonth:null,bymonthday:null,bynmonthday:null,byyearday:null,byweekno:null,byweekday:null,bynweekday:null,byhour:null,byminute:null,bysecond:null,byeaster:null},tn=Object.keys(Ge),en=function(){function t(t,e){void 0===t&&(t={}),void 0===e&&(e=!1),this._cache=e?null:new Te,this.origOptions=fe(t);var n=me(t).parsedOptions;this.options=n}return t.parseText=function(t,e){return ce(t,e)},t.fromText=function(t,e){return de(t,e)},t.fromString=function(e){return new t(t.parseString(e)||void 0)},t.prototype._iter=function(t){return Ke(t,this.options)},t.prototype._cacheGet=function(t,e){return!!this._cache&&this._cache._cacheGet(t,e)},t.prototype._cacheAdd=function(t,e,n){if(this._cache)return this._cache._cacheAdd(t,e,n)},t.prototype.all=function(t){if(t)return this._iter(new ee("all",{},t));var e=this._cacheGet("all");return!1===e&&(e=this._iter(new te("all",{})),this._cacheAdd("all",e)),e},t.prototype.between=function(t,e,n,i){if(void 0===n&&(n=!1),!jt(t)||!jt(e))throw new Error("Invalid date passed in to RRule.between");var r={before:e,after:t,inc:n};if(i)return this._iter(new ee("between",r,i));var o=this._cacheGet("between",r);return!1===o&&(o=this._iter(new te("between",r)),this._cacheAdd("between",o,r)),o},t.prototype.before=function(t,e){if(void 0===e&&(e=!1),!jt(t))throw new Error("Invalid date passed in to RRule.before");var n={dt:t,inc:e},i=this._cacheGet("before",n);return!1===i&&(i=this._iter(new te("before",n)),this._cacheAdd("before",i,n)),i},t.prototype.after=function(t,e){if(void 0===e&&(e=!1),!jt(t))throw new Error("Invalid date passed in to RRule.after");var n={dt:t,inc:e},i=this._cacheGet("after",n);return!1===i&&(i=this._iter(new te("after",n)),this._cacheAdd("after",i,n)),i},t.prototype.count=function(){return this.all().length},t.prototype.toString=function(){return Ee(this.origOptions)},t.prototype.toText=function(t,e,n){return function(t,e,n,i){return new se(t,e,n,i).toString()}(this,t,e,n)},t.prototype.isFullyConvertibleToText=function(){return ue(this)},t.prototype.clone=function(){return new t(this.origOptions)},t.FREQUENCIES=["YEARLY","MONTHLY","WEEKLY","DAILY","HOURLY","MINUTELY","SECONDLY"],t.YEARLY=St.YEARLY,t.MONTHLY=St.MONTHLY,t.WEEKLY=St.WEEKLY,t.DAILY=St.DAILY,t.HOURLY=St.HOURLY,t.MINUTELY=St.MINUTELY,t.SECONDLY=St.SECONDLY,t.MO=Qe.MO,t.TU=Qe.TU,t.WE=Qe.WE,t.TH=Qe.TH,t.FR=Qe.FR,t.SA=Qe.SA,t.SU=Qe.SU,t.parseString=be,t.optionsToString=Ee,t}();var nn={dtstart:null,cache:!1,unfold:!1,forceset:!1,compatible:!1,tzid:null};function rn(t,e){var n=[],i=[],r=[],o=[],s=ge(t),a=s.dtstart,c=s.tzid,h=function(t,e){void 0===e&&(e=!1);if(t=t&&t.trim(),!t)throw new Error("Invalid empty string");if(!e)return t.split(/\s/);var n=t.split("\n"),i=0;for(;i<n.length;){var r=n[i]=n[i].replace(/\s+$/g,"");r?i>0&&" "===r[0]?(n[i-1]+=r.slice(1),n.splice(i,1)):i+=1:n.splice(i,1)}return n}(t,e.unfold);return h.forEach(function(t){var e;if(t){var s=function(t){var e=function(t){if(-1===t.indexOf(":"))return{name:"RRULE",value:t};var e=(r=t,o=":",s=1,a=r.split(o),s?a.slice(0,s).concat([a.slice(s).join(o)]):a),n=e[0],i=e[1];var r,o,s,a;return{name:n,value:i}}(t),n=e.name,i=e.value,r=n.split(";");if(!r)throw new Error("empty property name");return{name:r[0].toUpperCase(),parms:r.slice(1),value:i}}(t),a=s.name,h=s.parms,d=s.value;switch(a.toUpperCase()){case"RRULE":if(h.length)throw new Error("unsupported RRULE parm: ".concat(h.join(",")));n.push(be(t));break;case"RDATE":var l=(null!==(e=/RDATE(?:;TZID=([^:=]+))?/i.exec(t))&&void 0!==e?e:[])[1];l&&!c&&(c=l),i=i.concat(an(d,h));break;case"EXRULE":if(h.length)throw new Error("unsupported EXRULE parm: ".concat(h.join(",")));r.push(be(d));break;case"EXDATE":o=o.concat(an(d,h));break;case"DTSTART":break;default:throw new Error("unsupported property: "+a)}}}),{dtstart:a,tzid:c,rrulevals:n,rdatevals:i,exrulevals:r,exdatevals:o}}function on(t,e){return void 0===e&&(e={}),function(t,e){var n=rn(t,e),i=n.rrulevals,r=n.rdatevals,o=n.exrulevals,s=n.exdatevals,a=n.dtstart,c=n.tzid,h=!1===e.cache;if(e.compatible&&(e.forceset=!0,e.unfold=!0),e.forceset||i.length>1||r.length||o.length||s.length){var d=new hn(h);return d.dtstart(a),d.tzid(c||void 0),i.forEach(function(t){d.rrule(new en(sn(t,a,c),h))}),r.forEach(function(t){d.rdate(t)}),o.forEach(function(t){d.exrule(new en(sn(t,a,c),h))}),s.forEach(function(t){d.exdate(t)}),e.compatible&&e.dtstart&&d.rdate(a),d}var l=i[0]||{};return new en(sn(l,l.dtstart||e.dtstart||a,l.tzid||e.tzid||c),h)}(t,function(t){var e=[],i=Object.keys(t),r=Object.keys(nn);if(i.forEach(function(t){Lt(r,t)||e.push(t)}),e.length)throw new Error("Invalid options: "+e.join(", "));return n(n({},nn),t)}(e))}function sn(t,e,i){return n(n({},t),{dtstart:e,tzid:i})}function an(t,e){return function(t){t.forEach(function(t){if(!/(VALUE=DATE(-TIME)?)|(TZID=)/.test(t))throw new Error("unsupported RDATE/EXDATE parm: "+t)})}(e),t.split(",").map(function(t){return Qt(t)})}function cn(t){var e=this;return function(n){if(void 0!==n&&(e["_".concat(t)]=n),void 0!==e["_".concat(t)])return e["_".concat(t)];for(var i=0;i<e._rrule.length;i++){var r=e._rrule[i].origOptions[t];if(r)return r}}}var hn=function(t){function n(e){void 0===e&&(e=!1);var n=t.call(this,{},e)||this;return n.dtstart=cn.apply(n,["dtstart"]),n.tzid=cn.apply(n,["tzid"]),n._rrule=[],n._rdate=[],n._exrule=[],n._exdate=[],n}return e(n,t),n.prototype._iter=function(t){return function(t,e,n,i,r,o){var s={},a=t.accept;function c(t,e){n.forEach(function(n){n.between(t,e,!0).forEach(function(t){s[Number(t)]=!0})})}r.forEach(function(t){var e=new ke(t,o).rezonedDate();s[Number(e)]=!0}),t.accept=function(t){var e=Number(t);return isNaN(e)?a.call(this,t):!(!s[e]&&(c(new Date(e-1),new Date(e+1)),!s[e]))||(s[e]=!0,a.call(this,t))},"between"===t.method&&(c(t.args.after,t.args.before),t.accept=function(t){var e=Number(t);return!!s[e]||(s[e]=!0,a.call(this,t))});for(var h=0;h<i.length;h++){var d=new ke(i[h],o).rezonedDate();if(!t.accept(new Date(d.getTime())))break}e.forEach(function(e){Ke(t,e.options)});var l=t._result;switch(Vt(l),t.method){case"all":case"between":return l;case"before":return l.length&&l[l.length-1]||null;default:return l.length&&l[0]||null}}(t,this._rrule,this._exrule,this._rdate,this._exdate,this.tzid())},n.prototype.rrule=function(t){dn(t,this._rrule)},n.prototype.exrule=function(t){dn(t,this._exrule)},n.prototype.rdate=function(t){ln(t,this._rdate)},n.prototype.exdate=function(t){ln(t,this._exdate)},n.prototype.rrules=function(){return this._rrule.map(function(t){return on(t.toString())})},n.prototype.exrules=function(){return this._exrule.map(function(t){return on(t.toString())})},n.prototype.rdates=function(){return this._rdate.map(function(t){return new Date(t.getTime())})},n.prototype.exdates=function(){return this._exdate.map(function(t){return new Date(t.getTime())})},n.prototype.valueOf=function(){var t=[];return!this._rrule.length&&this._dtstart&&(t=t.concat(Ee({dtstart:this._dtstart}))),this._rrule.forEach(function(e){t=t.concat(e.toString().split("\n"))}),this._exrule.forEach(function(e){t=t.concat(e.toString().split("\n").map(function(t){return t.replace(/^RRULE:/,"EXRULE:")}).filter(function(t){return!/^DTSTART/.test(t)}))}),this._rdate.length&&t.push(un("RDATE",this._rdate,this.tzid())),this._exdate.length&&t.push(un("EXDATE",this._exdate,this.tzid())),t},n.prototype.toString=function(){return this.valueOf().join("\n")},n.prototype.clone=function(){var t=new n(!!this._cache);return this._rrule.forEach(function(e){return t.rrule(e.clone())}),this._exrule.forEach(function(e){return t.exrule(e.clone())}),this._rdate.forEach(function(e){return t.rdate(new Date(e.getTime()))}),this._exdate.forEach(function(e){return t.exdate(new Date(e.getTime()))}),t},n}(en);function dn(t,e){if(!(t instanceof en))throw new TypeError(String(t)+" is not RRule instance");Lt(e.map(String),String(t))||e.push(t)}function ln(t,e){if(!(t instanceof Date))throw new TypeError(String(t)+" is not Date instance");Lt(e.map(Number),Number(t))||(e.push(t),Vt(e))}function un(t,e,n){var i=!n||"UTC"===n.toUpperCase(),r=i?"".concat(t,":"):"".concat(t,";TZID=").concat(n,":"),o=e.map(function(t){return Xt(t.valueOf(),i)}).join(",");return"".concat(r).concat(o)}const pn=(t,e,n,i)=>{i=i||{},n=null==n?{}:n;const r=new Event(e,{bubbles:void 0===i.bubbles||i.bubbles,cancelable:Boolean(i.cancelable),composed:void 0===i.composed||i.composed});return r.detail=n,t.dispatchEvent(r),r},yn=["blue","red","amber","green","orange","cyan","purple","pink"],fn=new Set(["primary","accent","red","pink","purple","deep-purple","indigo","blue","light-blue","cyan","teal","green","light-green","lime","yellow","amber","orange","deep-orange","brown","light-grey","grey","dark-grey","blue-grey","black","white"]);function mn(t){return fn.has(t)?`var(--${t}-color)`:t}const bn={overdue:0,due:1,pending:2,completed:3};const gn=6e4,vn=36e5,_n=864e5;function wn(t){if(!t)return null;const e=(t.days??0)*_n+(t.hours??0)*vn+(t.minutes??0)*gn+1e3*(t.seconds??0);return e>0?e:null}function kn(t){const e=Math.abs(t);if(e<vn){const t=Math.max(1,Math.round(e/gn));return`${t} minute${1!==t?"s":""}`}if(e<_n){const t=Math.round(e/vn);return`${t} hour${1!==t?"s":""}`}const n=Math.round(e/_n);return`${n} day${1!==n?"s":""}`}const En=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function xn(t,e=!1){return new Intl.DateTimeFormat(void 0,{month:"short",day:"numeric",year:"numeric",...e?{timeZone:"UTC"}:{}}).format(t)}function $n(t,e){let n=t?`, until ${t}`:"";const i=Number(e??0);return i>0&&(n+=`, ${i} time${1!==i?"s":""}`),n}function Tn(t){const e=String(t.rrule??""),n=function(t){const e=t.split(":").map(Number);if(e.length<2||e.some(Number.isNaN))return t;const n=new Date;return n.setHours(e[0],e[1],0,0),new Intl.DateTimeFormat(void 0,{hour:"numeric",minute:"2-digit"}).format(n)}(String(t.time??""));if("FREQ=DAILY"===e)return`Daily at ${n}`;if(/^FREQ=WEEKLY;BYDAY=[A-Z,]+$/.test(e)){const e=t.active_days??[];return e.length>0&&e.length<7?`${e.join(", ")} at ${n}`:`Daily at ${n}`}try{const t={...en.fromString(`RRULE:${e}`).origOptions},i=Array.isArray(t.bysetpos)?t.bysetpos:null!=t.bysetpos?[t.bysetpos]:[];if(1===i.length&&t.byweekday){const e=Array.isArray(t.byweekday)?t.byweekday:[t.byweekday];t.byweekday=e.map(t=>t instanceof vt?new vt(t.weekday,i[0]):"number"==typeof t?new vt(t,i[0]):t),delete t.bysetpos}const{until:r,count:o}=t;delete t.until,delete t.count;const s=new en(t);if(!s.isFullyConvertibleToText())return`${e} at ${n}`;const a=s.toText();return`${a.charAt(0).toUpperCase()}${a.slice(1)} at ${n}`+$n(r?xn(r,!0):"",o)}catch{return e}}const An={minutely:"minute",hourly:"hour",daily:"day",weekly:"week",monthly:"month",yearly:"year"};function Sn(t){const e=An[String(t.freq)]??String(t.freq),n=Number(t.interval??1);let i=1===n?`Every ${e}`:`Every ${n} ${e}s`;const r=function(t){const e=Array.isArray(t)?t.map(Number).filter(t=>t>=1&&t<=12):[],n=new Set(e);if(0===n.size||n.size>=12)return"";const i=t=>(t-1+12)%12+1,r=[...n].filter(t=>!n.has(i(t-1)));if(1===r.length&&n.size>1){let t=r[0];for(;n.has(i(t+1));)t=i(t+1);return`${En[r[0]-1]}–${En[t-1]}`}return[...n].sort((t,e)=>t-e).map(t=>En[t-1]).join(", ")}(t.bymonth);r&&(i+=`, ${r}`);return i+$n(t.until?xn(new Date(String(t.until))):"",t.count)}const Cn={overdue:"Overdue",due:"Due",pending:"Upcoming",completed:"Completed"};function Dn(t){return void 0!==t&&"none"!==t.action}class On{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,n){this._$Ct=t,this._$AM=e,this._$Ci=n}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}const Un="ontouchstart"in window||navigator.maxTouchPoints>0;class Ln extends HTMLElement{constructor(){super(...arguments),this.holdTime=500,this.held=!1,this.cancelled=!1}connectedCallback(){Object.assign(this.style,{position:"fixed",width:Un?"100px":"50px",height:Un?"100px":"50px",transform:"translate(-50%, -50%) scale(0)",pointerEvents:"none",zIndex:"999",background:"var(--primary-color)",display:null,opacity:"0.2",borderRadius:"50%",transition:"transform 180ms ease-in-out"}),["touchcancel","mouseout","mouseup","touchmove","mousewheel","wheel","scroll"].forEach(t=>{document.addEventListener(t,()=>{this.cancelled=!0,this.timer&&(this._stopAnimation(),clearTimeout(this.timer),this.timer=void 0)},{passive:!0})})}bind(t,e={}){t.actionHandler&&JSON.stringify(e)===JSON.stringify(t.actionHandler.options)||(t.actionHandler?(t.removeEventListener("touchstart",t.actionHandler.start),t.removeEventListener("touchend",t.actionHandler.end),t.removeEventListener("touchcancel",t.actionHandler.end),t.removeEventListener("mousedown",t.actionHandler.start),t.removeEventListener("click",t.actionHandler.end),t.removeEventListener("keydown",t.actionHandler.handleKeyDown)):t.addEventListener("contextmenu",t=>{const e=t||window.event;return e.preventDefault&&e.preventDefault(),e.stopPropagation&&e.stopPropagation(),!1}),t.actionHandler={options:e},e.disabled||(t.actionHandler.start=t=>{let n,i;this.cancelled=!1,t.touches?(n=t.touches[0].clientX,i=t.touches[0].clientY):(n=t.clientX,i=t.clientY),e.hasHold&&(this.held=!1,this.timer=window.setTimeout(()=>{this._startAnimation(n,i),this.held=!0},this.holdTime))},t.actionHandler.end=t=>{if("touchcancel"===t.type||"touchend"===t.type&&this.cancelled)return;const n=t.target;t.cancelable&&t.preventDefault(),e.hasHold&&(clearTimeout(this.timer),this._stopAnimation(),this.timer=void 0),e.hasHold&&this.held?pn(n,"action",{action:"hold"}):e.hasDoubleClick?"click"===t.type&&t.detail<2||!this.dblClickTimeout?this.dblClickTimeout=window.setTimeout(()=>{this.dblClickTimeout=void 0,pn(n,"action",{action:"tap"})},250):(clearTimeout(this.dblClickTimeout),this.dblClickTimeout=void 0,pn(n,"action",{action:"double_tap"})):pn(n,"action",{action:"tap"})},t.actionHandler.handleKeyDown=t=>{["Enter"," "].includes(t.key)&&t.currentTarget.actionHandler.end(t)},t.addEventListener("touchstart",t.actionHandler.start,{passive:!0}),t.addEventListener("touchend",t.actionHandler.end),t.addEventListener("touchcancel",t.actionHandler.end),t.addEventListener("mousedown",t.actionHandler.start,{passive:!0}),t.addEventListener("click",t.actionHandler.end),t.addEventListener("keydown",t.actionHandler.handleKeyDown)))}_startAnimation(t,e){Object.assign(this.style,{left:`${t}px`,top:`${e}px`,transform:"translate(-50%, -50%) scale(1)"})}_stopAnimation(){Object.assign(this.style,{left:null,top:null,transform:"translate(-50%, -50%) scale(0)"})}}const Mn=(t,e)=>{const n=(()=>{const t=document.body;if(t.querySelector("action-handler"))return t.querySelector("action-handler");customElements.get("action-handler")||customElements.define("action-handler",Ln);const e=document.createElement("action-handler");return t.appendChild(e),e})();n&&n.bind(t,e)},Nn=(t=>(...e)=>({_$litDirective$:t,values:e}))(class extends On{update(t,[e]){return Mn(t.element,e),Z}render(t){}}),Rn={overdue:"✗",due:"●",pending:"○",completed:"✓"};class Yn extends lt{render(){const t=new Date,e=function(t,e){switch(t.status){case"overdue":if(t.next_due){const n="object"==typeof t.schedule&&null!==t.schedule?Number(t.schedule.grace_period_mins??0):0,i=new Date(t.next_due).getTime()+n*gn,r=e.getTime()-i;return r>0?`Overdue by ${kn(r)}`:"Overdue"}return"Overdue";case"due":return"Due";case"pending":if(t.next_due){const n=new Date(t.next_due).getTime()-e.getTime();return n>0?`in ${kn(n)}`:"Pending"}return"Pending";case"completed":return""}}(this.item,t);return K`
      <div
        class="card"
        style="border-left: 5px solid ${mn(this.item.source_color)}"
      >
        <div
          class="row"
          ${Nn({hasHold:Dn(this.holdAction),hasDoubleClick:Dn(this.doubleTapAction)})}
          @action=${this._handleAction}
        >
          <span class="status-indicator">${Rn[this.item.status]}</span>
          <span class="name">${this.item.chore_name}</span>
          <span class="time">${e}</span>
        </div>
      </div>
    `}_handleAction(t){let e;switch(t.detail.action){case"tap":e=this.tapAction;break;case"hold":e=this.holdAction;break;case"double_tap":e=this.doubleTapAction}!async function(t,e,n,i){if(n&&"none"!==n.action)switch(n.action){case"details":pn(t,"chore-detail",{item:i});break;case"complete":try{await e.callWS({type:"call_service",domain:"chore_calendar",service:"complete_item",service_data:{entity_id:i.source_entity,item:i.uid}}),pn(t,"chore-completed",{item:i})}catch(t){console.error("chore-calendar-card: failed to complete chore",t)}break;default:pn(t,"hass-action",{config:{entity:i.source_entity,tap_action:n,hold_action:n,double_tap_action:n},action:"tap"})}}(this,this.hass,e,this.item)}connectedCallback(){super.connectedCallback(),this._syncStatusAttribute()}updated(){this._syncStatusAttribute()}_syncStatusAttribute(){this.setAttribute("status",this.item.status)}}Yn.styles=d`
    :host {
      display: block;
      margin-bottom: 5px;
    }

    .card {
      background: var(--card-background-color, var(--ha-card-background, white));
      border-radius: 0 5px 5px 0;
      overflow: hidden;
    }

    .row {
      display: flex;
      align-items: center;
      padding: 10px;
      cursor: pointer;
      transition: background-color 0.15s ease;
      gap: 12px;
      min-height: 0;
    }

    .row:hover {
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

    :host([status="completed"]) .card {
      opacity: 0.6;
    }

    :host([status="overdue"]) .time {
      color: var(--error-color, #db4437);
    }
  `,i([ft({attribute:!1})],Yn.prototype,"hass",void 0),i([ft({attribute:!1})],Yn.prototype,"item",void 0),i([ft({attribute:!1})],Yn.prototype,"tapAction",void 0),i([ft({attribute:!1})],Yn.prototype,"holdAction",void 0),i([ft({attribute:!1})],Yn.prototype,"doubleTapAction",void 0),bt("chore-row",Yn);const Hn="chore_calendar";class Pn extends lt{constructor(){super(...arguments),this.open=!1,this.allowUncomplete=!1,this._loading=!1}render(){if(!this.item)return J;const t="completed"===this.item.status;return K`
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
        ${t?this.allowUncomplete&&this.item?.last_completed?K`
                <div slot="footer" class="footer">
                  <ha-button
                    variant="neutral"
                    appearance="plain"
                    ?disabled=${this._loading}
                    @click=${this._onUncomplete}
                  >
                    ${this._loading?"Uncompleting...":"Uncomplete"}
                  </ha-button>
                </div>
              `:J:K`
              <div slot="footer" class="footer">
                <ha-button
                  variant="neutral"
                  appearance="plain"
                  ?disabled=${this._loading}
                  @click=${this._onSkip}
                >
                  ${this._loading?"Skipping...":"Skip"}
                </ha-button>
                <ha-button
                  ?disabled=${this._loading}
                  @click=${this._onComplete}
                >
                  ${this._loading?"Completing...":"Complete"}
                </ha-button>
              </div>
            `}
      </ha-dialog>
    `}_renderDetails(){const{item:t}=this;if(!t)return J;const e=this.hass?.language??"en",n=new Date;return K`
      ${this._renderListRow()}

      <div class="schedule">
        <ha-icon icon="mdi:calendar-clock"></ha-icon>
        <div class="info">${function(t){if("string"==typeof t)return t;if("rrule"in t)return Tn(t);if("freq"in t)return Sn(t);if("due_datetime"in t){const e=t.due_datetime;if(!e)return"Unscheduled";const n=new Date(e);return`${new Intl.DateTimeFormat(void 0,{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(n)}`}return JSON.stringify(t)}(t.schedule)}</div>
      </div>

      ${t.assigned_to.length>0?K`
            <div class="assigned">
              <ha-icon icon=${t.assigned_to.length>1?"mdi:account-multiple":"mdi:account"}></ha-icon>
              <div class="info">
                ${t.assigned_to.map(t=>this._resolveEntityName(t)).join(", ")}
              </div>
            </div>
          `:J}

      ${t.trigger_entity?K`
            <div class="trigger">
              <ha-icon icon="mdi:nfc-tap"></ha-icon>
              <div class="info">${this._resolveEntityName(t.trigger_entity)}</div>
            </div>
          `:J}

      ${t.last_completed?K`
            <div class="last-completed">
              <ha-icon icon="mdi:check-circle-outline"></ha-icon>
              <div class="info">
                ${function(t,e,n){const i=new Date(t),r=Math.floor((e.getTime()-i.getTime())/_n);return 0===r?new Intl.DateTimeFormat(n,{hour:"numeric",minute:"2-digit"}).format(i):1===r?"Yesterday":r<7?new Intl.DateTimeFormat(n,{weekday:"long"}).format(i):new Intl.DateTimeFormat(n,{month:"short",day:"numeric"}).format(i)}(t.last_completed,n,e)}${t.last_completed_by?` by ${this._resolveEntityName(t.last_completed_by)}`:""}
              </div>
            </div>
          `:J}

      ${t.description?K`<div class="description">${t.description}</div>`:J}
    `}_renderListRow(){const t=this.item?.source_entity;if(!t)return J;const e=this.hass?.states?.[t],n=e?.attributes?.friendly_name??t;return K`
      <div class="calendar">
        <ha-state-icon
          .hass=${this.hass}
          .stateObj=${e}
        ></ha-state-icon>
        <div class="info">${n}</div>
      </div>
    `}async _onComplete(){if(this.item&&!this._loading){this._loading=!0;try{await this.hass.callWS({type:"call_service",domain:Hn,service:"complete_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid}}),this.dispatchEvent(new CustomEvent("chore-completed",{detail:{item:this.item},bubbles:!0,composed:!0}))}catch(t){console.error("chore-detail-dialog: failed to complete chore",t)}finally{this._loading=!1}}}async _onSkip(){if(this.item&&!this._loading){this._loading=!0;try{await this.hass.callWS({type:"call_service",domain:Hn,service:"skip_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid}}),this.dispatchEvent(new CustomEvent("chore-skipped",{detail:{item:this.item},bubbles:!0,composed:!0}))}catch(t){console.error("chore-detail-dialog: failed to skip chore",t)}finally{this._loading=!1}}}async _onUncomplete(){if(this.item&&!this._loading){this._loading=!0;try{await this.hass.callWS({type:"call_service",domain:Hn,service:"uncomplete_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid}}),this.dispatchEvent(new CustomEvent("chore-uncompleted",{detail:{item:this.item},bubbles:!0,composed:!0}))}catch(t){console.error("chore-detail-dialog: failed to uncomplete chore",t)}finally{this._loading=!1}}}_resolveEntityName(t){const e=this.hass?.states?.[t];return e?.attributes?.friendly_name??t}_onClosed(){this.dispatchEvent(new CustomEvent("detail-dialog-closed",{bubbles:!0,composed:!0}))}}Pn.styles=d`
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
      justify-content: flex-end;
      gap: 8px;
      padding: 16px;
      border-top: 1px solid var(--divider-color);
    }
  `,i([ft({attribute:!1})],Pn.prototype,"hass",void 0),i([ft({attribute:!1})],Pn.prototype,"item",void 0),i([ft({type:Boolean})],Pn.prototype,"open",void 0),i([ft({type:Boolean,attribute:"allow-uncomplete"})],Pn.prototype,"allowUncomplete",void 0),i([mt()],Pn.prototype,"_loading",void 0),bt("chore-detail-dialog",Pn);const In=[{name:"title",selector:{text:{}}},{name:"hide_completed",selector:{boolean:{}},default:!1},{name:"hide_section_headers",selector:{boolean:{}},default:!1},{name:"hide_card_background",selector:{boolean:{}},default:!1},{name:"allow_uncomplete",selector:{boolean:{}},default:!1}],jn=[{name:"update_interval",selector:{number:{min:10,max:600,step:10,mode:"box"}},default:60}],Wn=[{key:"due_date_period",label:"Due-date period"},{key:"completed_period",label:"Completed period"}],zn=[{value:"details",label:"Chore Details"},{value:"complete",label:"Complete Chore"},{value:"more-info",label:"More Info"},{value:"navigate",label:"Navigate"},{value:"url",label:"URL"},{value:"call-service",label:"Call Service"},{value:"none",label:"None"}],qn=[{name:"tap_action",selector:{select:{options:zn,mode:"dropdown"}},default:"details"},{name:"hold_action",selector:{select:{options:zn,mode:"dropdown"}},default:"none"},{name:"double_tap_action",selector:{select:{options:zn,mode:"dropdown"}},default:"none"}],Fn=[{name:"exclude",selector:{select:{multiple:!0,options:[{value:"overdue",label:"Overdue"},{value:"due",label:"Due"},{value:"pending",label:"Pending"},{value:"completed",label:"Completed"}]}}}],Bn={title:"Title",hide_completed:"Hide completed section",hide_section_headers:"Hide section headings",hide_card_background:"Hide card background",allow_uncomplete:"Allow uncomplete",update_interval:"Update interval (seconds)",tap_action:"Tap action",hold_action:"Hold action",double_tap_action:"Double-tap action",exclude:"Exclude statuses"};function Kn(t){return"string"==typeof t?{entity:t}:{...t}}class Zn extends lt{constructor(){super(...arguments),this._expandedEntities=new Set,this._computeLabel=t=>Bn[t.name]??t.name}setConfig(t){this._config={...t}}render(){if(!this.hass||!this._config)return K``;const t=(this._config.entities??[]).map(Kn);return K`
      <div class="entities-header">
        <span>Entities</span>
      </div>
      ${t.map((t,e)=>{const n=(i=t.entity)?(i.split(".").pop()??i).replace(/_/g," ").replace(/\b\w/g,t=>t.toUpperCase()):"New entity";var i;const r=t.color??"",o=this._expandedEntities.has(e);return K`
          <ha-expansion-panel
            .expanded=${o}
            @expanded-changed=${t=>this._toggleExpanded(t,e)}
          >
            <div class="entity-header" slot="header">
              <span
                class="entity-color-dot"
                style="background-color: ${r?mn(r):"var(--primary-color)"}"
              ></span>
              <span class="entity-name">${n}</span>
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
                .schema=${Fn}
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
      ${0===t.length?K`<button class="add-btn" @click=${this._addEntity}>
            + Add entity
          </button>`:K`<button class="add-btn" @click=${this._addEntity}>
            + Add another entity
          </button>`}

      <div class="divider"></div>

      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${In}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._optionsChanged}
      ></ha-form>

      <div class="period-group">
        ${Wn.map(t=>this._renderPeriodRow(t.key,t.label))}
      </div>

      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${jn}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._optionsChanged}
      ></ha-form>

      <div class="divider"></div>

      <ha-form
        .hass=${this.hass}
        .data=${this._actionsFormData()}
        .schema=${qn}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._actionsChanged}
      ></ha-form>
    `}_dispatch(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}_toggleExpanded(t,e){const n=t.detail.expanded,i=new Set(this._expandedEntities);n?i.add(e):i.delete(e),this._expandedEntities=i}_entityChanged(t,e){t.stopPropagation();const n=(this._config.entities??[]).map(Kn);n[e]={...n[e],entity:t.detail.value.entity},this._config={...this._config,entities:n},this._dispatch()}_colorChanged(t,e){t.stopPropagation();const n=t.detail.value?.color,i=(this._config.entities??[]).map(Kn);i[e]={...i[e],color:n||void 0},this._config={...this._config,entities:i},this._dispatch()}_excludeChanged(t,e){t.stopPropagation();const n=t.detail.value.exclude??[],i=(this._config.entities??[]).map(Kn);i[e]={...i[e],exclude:n},this._config={...this._config,entities:i},this._dispatch()}_removeEntity(t){const e=(this._config.entities??[]).map(Kn).filter((e,n)=>n!==t),n=new Set;for(const e of this._expandedEntities)e<t?n.add(e):e>t&&n.add(e-1);this._expandedEntities=n,this._config={...this._config,entities:e},this._dispatch()}_addEntity(){const t=[...(this._config.entities??[]).map(Kn),{entity:""}],e=t.length-1,n=new Set(this._expandedEntities);n.add(e),this._expandedEntities=n,this._config={...this._config,entities:t},this._dispatch()}_actionToString(t){return t?.action??""}_actionsFormData(){return{tap_action:this._actionToString(this._config.tap_action),hold_action:this._actionToString(this._config.hold_action),double_tap_action:this._actionToString(this._config.double_tap_action)}}_actionsChanged(t){if(t.stopPropagation(),!this._config||!this.hass)return;const e=t.detail.value,n=t=>t?{action:t}:void 0;this._config={...this._config,tap_action:n(e.tap_action),hold_action:n(e.hold_action),double_tap_action:n(e.double_tap_action)},this._dispatch()}_renderPeriodRow(t,e){const n=this._config[t]??{},i=!(!n.days&&!n.hours),r=i?String(n.days??0):"",o=i?String(n.hours??0):"";return K`
      <div class="period-row">
        <span class="period-label">${e}</span>
        <div class="period-inputs">
          <ha-input
            appearance="outlined"
            type="number"
            min="0"
            max="365"
            placeholder="days"
            .value=${r}
            @change=${e=>this._setPeriod(t,"days",e.target.value)}
          ></ha-input>
          <ha-input
            appearance="outlined"
            type="number"
            min="0"
            max="23"
            placeholder="hours"
            .value=${o}
            @change=${e=>this._setPeriod(t,"hours",e.target.value)}
          ></ha-input>
        </div>
      </div>
    `}_setPeriod(t,e,n){if(!this._config)return;const i=Math.max(0,Math.floor(Number(n)||0)),r={...this._config[t]??{},[e]:i};r.days||delete r.days,r.hours||delete r.hours;const o=Object.keys(r).length>0;this._config={...this._config,[t]:o?r:void 0},this._dispatch()}_optionsChanged(t){t.stopPropagation(),this._config&&this.hass&&(this._config={...this._config,...t.detail.value},this._dispatch())}}Zn.styles=d`
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
  `,i([ft({attribute:!1})],Zn.prototype,"hass",void 0),i([mt()],Zn.prototype,"_config",void 0),i([mt()],Zn.prototype,"_expandedEntities",void 0),bt("chore-calendar-card-editor",Zn);console.info("%c CHORE-CALENDAR-CARD %c v0.10.1 ","color: white; background: #4CAF50; font-weight: 700;","color: #4CAF50; background: white; font-weight: 700;");const Jn=["overdue","due","pending","completed"];class Vn extends lt{constructor(){super(...arguments),this._items=[],this._loading=!0,this._dialogOpen=!1,this._entityConfigs=[],this._connected=!1}static getConfigElement(){return document.createElement("chore-calendar-card-editor")}static getStubConfig(){return{entities:[]}}setConfig(t){if(!t.entities||0===t.entities.length)return this._configError="Please define at least one entity",void(this._config=t);this._configError=void 0,this._config=t,this._entityConfigs=t.entities.map((t,e)=>function(t,e){const n="string"==typeof t?{entity:t}:t;return{...n,color:n.color??yn[e%yn.length]}}(t,e)),t.hide_card_background?this.setAttribute("no-card-background",""):this.removeAttribute("no-card-background")}getCardSize(){return Math.max(3,this._items.length+1)}connectedCallback(){super.connectedCallback(),this._connected=!0,this._startPolling(),this._subscribeEvents()}disconnectedCallback(){super.disconnectedCallback(),this._connected=!1,this._stopPolling(),this._unsubscribeEvents()}updated(t){t.has("hass")&&this.hass&&this._loading&&this._refreshData()}async _refreshData(){var t;if(this.hass&&this._config)try{const e=[],n=this._entityConfigs.map(async t=>{const n=await this.hass.callWS({type:"call_service",domain:"chore_calendar",service:"get_items",service_data:{entity_id:t.entity},return_response:!0}),i=n.response?.items??[],r=n.response?.completed_cleared_at?new Date(n.response.completed_cleared_at).getTime():null,o=t.exclude??[];for(const n of i)o.includes(n.status)||null!==r&&"completed"===n.status&&n.last_completed&&new Date(n.last_completed).getTime()<r||e.push({...n,source_entity:t.entity,source_color:t.color})});await Promise.all(n);const i=wn(this._config.due_date_period),r=wn(this._config.completed_period),o=function(t,e,n,i){if(null===e&&null===n)return t;const r=i.getTime();return t.filter(t=>{if(null!==n&&"completed"===t.status&&t.last_completed&&r-new Date(t.last_completed).getTime()>n)return!1;if(null!==e&&"pending"===t.status){if(!t.next_due)return!1;if(new Date(t.next_due).getTime()-r>e)return!1}return!0})}(e,i,r,new Date);this._items=(t=o,[...t].sort((t,e)=>{const n=bn[t.status]-bn[e.status];if(0!==n)return n;if("completed"===t.status){const n=t.last_completed?new Date(t.last_completed).getTime():0;return(e.last_completed?new Date(e.last_completed).getTime():0)-n}return(t.next_due?new Date(t.next_due).getTime():1/0)-(e.next_due?new Date(e.next_due).getTime():1/0)}))}catch(t){console.error("chore-calendar-card: failed to fetch items",t)}finally{this._loading=!1}}_startPolling(){this._stopPolling();const t=1e3*(this._config?.update_interval??60);this._refreshTimer=setInterval(()=>{this._connected&&this._refreshData()},t)}_stopPolling(){void 0!==this._refreshTimer&&(clearInterval(this._refreshTimer),this._refreshTimer=void 0)}async _subscribeEvents(){if(this.hass?.connection)try{const t=new Set(this._entityConfigs.map(t=>t.entity));this._eventUnsub=await this.hass.connection.subscribeEvents(e=>{e.data?.entity_id&&t.has(e.data.entity_id)&&this._refreshData()},"state_changed")}catch{}}_unsubscribeEvents(){this._eventUnsub?.(),this._eventUnsub=void 0}render(){if(!this._config)return J;if(this._configError)return K`
        <ha-card>
          <div class="empty">${this._configError}</div>
        </ha-card>
      `;const t=this._config.title;return K`
      <ha-card
        @chore-detail=${this._onChoreDetail}
        @chore-completed=${this._onChoreCompleted}
      >
        ${t?K`
              <div class="header">
                <span class="title">${t}</span>
              </div>
            `:J}
        ${this._loading?K`<div class="loading">Loading...</div>`:this._renderSections()}
      </ha-card>
      <chore-detail-dialog
        .hass=${this.hass}
        .item=${this._dialogItem}
        .open=${this._dialogOpen}
        .allowUncomplete=${!!this._config.allow_uncomplete}
        @detail-dialog-closed=${this._onDialogClosed}
        @chore-completed=${this._onChoreCompleted}
        @chore-uncompleted=${this._onChoreCompleted}
        @chore-skipped=${this._onChoreCompleted}
      ></chore-detail-dialog>
    `}_renderSections(){const t=function(t){const e=new Map;for(const n of t){let t=e.get(n.status);t||(t=[],e.set(n.status,t)),t.push(n)}return e}(this._items),e=!!this._config.hide_completed,n=!!this._config.hide_section_headers,i=Jn.filter(n=>{const i=t.get(n);return!(!i||0===i.length)&&("completed"!==n||!e)});return 0===i.length?K`
        <div class="placeholder">
          <div class="placeholder-card">
            <div class="placeholder-row">No chores</div>
          </div>
        </div>
      `:K`
      ${i.map(e=>{const i=t.get(e);return K`
          ${n?J:K`<div class="section-header ${e}">
                ${Cn[e]}
              </div>`}
          ${i.map(t=>K`
              <chore-row
                .hass=${this.hass}
                .item=${t}
                .tapAction=${this._config.tap_action??{action:"details"}}
                .holdAction=${this._config.hold_action??{action:"none"}}
                .doubleTapAction=${this._config.double_tap_action??{action:"none"}}
              ></chore-row>
            `)}
        `})}
    `}_onChoreDetail(t){this._dialogItem=t.detail.item,this._dialogOpen=!0}_onDialogClosed(){this._dialogOpen=!1}_onChoreCompleted(){this._dialogOpen=!1,this._refreshData()}}Vn.styles=d`
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

`,i([ft({attribute:!1})],Vn.prototype,"hass",void 0),i([mt()],Vn.prototype,"_config",void 0),i([mt()],Vn.prototype,"_configError",void 0),i([mt()],Vn.prototype,"_items",void 0),i([mt()],Vn.prototype,"_loading",void 0),i([mt()],Vn.prototype,"_dialogItem",void 0),i([mt()],Vn.prototype,"_dialogOpen",void 0),bt("chore-calendar-card",Vn),window.customCards=window.customCards||[],window.customCards.push({type:"chore-calendar-card",name:"Chore Calendar",description:"Timeline view of chores from Chore Calendar lists",preview:!0});export{Vn as ChoreCalendarCard};
