function t(t,e,i,s){var o,n=arguments.length,r=n<3?e:null===s?s=Object.getOwnPropertyDescriptor(e,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(t,e,i,s);else for(var a=t.length-1;a>=0;a--)(o=t[a])&&(r=(n<3?o(r):n>3?o(e,i,r):o(e,i))||r);return n>3&&r&&Object.defineProperty(e,i,r),r}"function"==typeof SuppressedError&&SuppressedError;const e=globalThis,i=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s=Symbol(),o=new WeakMap;let n=class{constructor(t,e,i){if(this._$cssResult$=!0,i!==s)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(i&&void 0===t){const i=void 0!==e&&1===e.length;i&&(t=o.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&o.set(e,t))}return t}toString(){return this.cssText}};const r=(t,...e)=>{const i=1===t.length?t[0]:e.reduce((e,i,s)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[s+1],t[0]);return new n(i,t,s)},a=i?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return(t=>new n("string"==typeof t?t:t+"",void 0,s))(e)})(t):t,{is:c,defineProperty:d,getOwnPropertyDescriptor:l,getOwnPropertyNames:h,getOwnPropertySymbols:p,getPrototypeOf:u}=Object,_=globalThis,m=_.trustedTypes,g=m?m.emptyScript:"",f=_.reactiveElementPolyfillSupport,v=(t,e)=>t,y={toAttribute(t,e){switch(e){case Boolean:t=t?g:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},$=(t,e)=>!c(t,e),b={attribute:!0,type:String,converter:y,reflect:!1,useDefault:!1,hasChanged:$};Symbol.metadata??=Symbol("metadata"),_.litPropertyMetadata??=new WeakMap;let x=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=b){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const i=Symbol(),s=this.getPropertyDescriptor(t,i,e);void 0!==s&&d(this.prototype,t,s)}}static getPropertyDescriptor(t,e,i){const{get:s,set:o}=l(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:s,set(e){const n=s?.call(this);o?.call(this,e),this.requestUpdate(t,n,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??b}static _$Ei(){if(this.hasOwnProperty(v("elementProperties")))return;const t=u(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(v("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(v("properties"))){const t=this.properties,e=[...h(t),...p(t)];for(const i of e)this.createProperty(i,t[i])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const i=this._$Eu(t,e);void 0!==i&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const t of i)e.unshift(a(t))}else void 0!==t&&e.push(a(t));return e}static _$Eu(t,e){const i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,s)=>{if(i)t.adoptedStyleSheets=s.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const i of s){const s=document.createElement("style"),o=e.litNonce;void 0!==o&&s.setAttribute("nonce",o),s.textContent=i.cssText,t.appendChild(s)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){const i=this.constructor.elementProperties.get(t),s=this.constructor._$Eu(t,i);if(void 0!==s&&!0===i.reflect){const o=(void 0!==i.converter?.toAttribute?i.converter:y).toAttribute(e,i.type);this._$Em=t,null==o?this.removeAttribute(s):this.setAttribute(s,o),this._$Em=null}}_$AK(t,e){const i=this.constructor,s=i._$Eh.get(t);if(void 0!==s&&this._$Em!==s){const t=i.getPropertyOptions(s),o="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:y;this._$Em=s;const n=o.fromAttribute(e,t.type);this[s]=n??this._$Ej?.get(s)??n,this._$Em=null}}requestUpdate(t,e,i,s=!1,o){if(void 0!==t){const n=this.constructor;if(!1===s&&(o=this[t]),i??=n.getPropertyOptions(t),!((i.hasChanged??$)(o,e)||i.useDefault&&i.reflect&&o===this._$Ej?.get(t)&&!this.hasAttribute(n._$Eu(t,i))))return;this.C(t,e,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:s,wrapped:o},n){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??e??this[t]),!0!==o||void 0!==n)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),!0===s&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,i]of t){const{wrapped:t}=i,s=this[e];!0!==t||this._$AL.has(e)||void 0===s||this.C(e,void 0,i,s)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};x.elementStyles=[],x.shadowRootOptions={mode:"open"},x[v("elementProperties")]=new Map,x[v("finalized")]=new Map,f?.({ReactiveElement:x}),(_.reactiveElementVersions??=[]).push("2.1.2");const w=globalThis,A=t=>t,E=w.trustedTypes,C=E?E.createPolicy("lit-html",{createHTML:t=>t}):void 0,S="$lit$",k=`lit$${Math.random().toFixed(9).slice(2)}$`,T="?"+k,P=`<${T}>`,H=document,O=()=>H.createComment(""),D=t=>null===t||"object"!=typeof t&&"function"!=typeof t,U=Array.isArray,M="[ \t\n\f\r]",N=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,L=/-->/g,R=/>/g,j=RegExp(`>|${M}(?:([^\\s"'>=/]+)(${M}*=${M}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),z=/'/g,I=/"/g,B=/^(?:script|style|textarea|title)$/i,W=(t=>(e,...i)=>({_$litType$:t,strings:e,values:i}))(1),q=Symbol.for("lit-noChange"),F=Symbol.for("lit-nothing"),V=new WeakMap,J=H.createTreeWalker(H,129);function K(t,e){if(!U(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==C?C.createHTML(e):e}const Y=(t,e)=>{const i=t.length-1,s=[];let o,n=2===e?"<svg>":3===e?"<math>":"",r=N;for(let e=0;e<i;e++){const i=t[e];let a,c,d=-1,l=0;for(;l<i.length&&(r.lastIndex=l,c=r.exec(i),null!==c);)l=r.lastIndex,r===N?"!--"===c[1]?r=L:void 0!==c[1]?r=R:void 0!==c[2]?(B.test(c[2])&&(o=RegExp("</"+c[2],"g")),r=j):void 0!==c[3]&&(r=j):r===j?">"===c[0]?(r=o??N,d=-1):void 0===c[1]?d=-2:(d=r.lastIndex-c[2].length,a=c[1],r=void 0===c[3]?j:'"'===c[3]?I:z):r===I||r===z?r=j:r===L||r===R?r=N:(r=j,o=void 0);const h=r===j&&t[e+1].startsWith("/>")?" ":"";n+=r===N?i+P:d>=0?(s.push(a),i.slice(0,d)+S+i.slice(d)+k+h):i+k+(-2===d?e:h)}return[K(t,n+(t[i]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),s]};class X{constructor({strings:t,_$litType$:e},i){let s;this.parts=[];let o=0,n=0;const r=t.length-1,a=this.parts,[c,d]=Y(t,e);if(this.el=X.createElement(c,i),J.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(s=J.nextNode())&&a.length<r;){if(1===s.nodeType){if(s.hasAttributes())for(const t of s.getAttributeNames())if(t.endsWith(S)){const e=d[n++],i=s.getAttribute(t).split(k),r=/([.?@])?(.*)/.exec(e);a.push({type:1,index:o,name:r[2],strings:i,ctor:"."===r[1]?et:"?"===r[1]?it:"@"===r[1]?st:tt}),s.removeAttribute(t)}else t.startsWith(k)&&(a.push({type:6,index:o}),s.removeAttribute(t));if(B.test(s.tagName)){const t=s.textContent.split(k),e=t.length-1;if(e>0){s.textContent=E?E.emptyScript:"";for(let i=0;i<e;i++)s.append(t[i],O()),J.nextNode(),a.push({type:2,index:++o});s.append(t[e],O())}}}else if(8===s.nodeType)if(s.data===T)a.push({type:2,index:o});else{let t=-1;for(;-1!==(t=s.data.indexOf(k,t+1));)a.push({type:7,index:o}),t+=k.length-1}o++}}static createElement(t,e){const i=H.createElement("template");return i.innerHTML=t,i}}function Z(t,e,i=t,s){if(e===q)return e;let o=void 0!==s?i._$Co?.[s]:i._$Cl;const n=D(e)?void 0:e._$litDirective$;return o?.constructor!==n&&(o?._$AO?.(!1),void 0===n?o=void 0:(o=new n(t),o._$AT(t,i,s)),void 0!==s?(i._$Co??=[])[s]=o:i._$Cl=o),void 0!==o&&(e=Z(t,o._$AS(t,e.values),o,s)),e}class G{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,s=(t?.creationScope??H).importNode(e,!0);J.currentNode=s;let o=J.nextNode(),n=0,r=0,a=i[0];for(;void 0!==a;){if(n===a.index){let e;2===a.type?e=new Q(o,o.nextSibling,this,t):1===a.type?e=new a.ctor(o,a.name,a.strings,this,t):6===a.type&&(e=new ot(o,this,t)),this._$AV.push(e),a=i[++r]}n!==a?.index&&(o=J.nextNode(),n++)}return J.currentNode=H,s}p(t){let e=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class Q{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,s){this.type=2,this._$AH=F,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Z(this,t,e),D(t)?t===F||null==t||""===t?(this._$AH!==F&&this._$AR(),this._$AH=F):t!==this._$AH&&t!==q&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>U(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==F&&D(this._$AH)?this._$AA.nextSibling.data=t:this.T(H.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:i}=t,s="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=X.createElement(K(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===s)this._$AH.p(e);else{const t=new G(s,this),i=t.u(this.options);t.p(e),this.T(i),this._$AH=t}}_$AC(t){let e=V.get(t.strings);return void 0===e&&V.set(t.strings,e=new X(t)),e}k(t){U(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,s=0;for(const o of t)s===e.length?e.push(i=new Q(this.O(O()),this.O(O()),this,this.options)):i=e[s],i._$AI(o),s++;s<e.length&&(this._$AR(i&&i._$AB.nextSibling,s),e.length=s)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=A(t).nextSibling;A(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,s,o){this.type=1,this._$AH=F,this._$AN=void 0,this.element=t,this.name=e,this._$AM=s,this.options=o,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=F}_$AI(t,e=this,i,s){const o=this.strings;let n=!1;if(void 0===o)t=Z(this,t,e,0),n=!D(t)||t!==this._$AH&&t!==q,n&&(this._$AH=t);else{const s=t;let r,a;for(t=o[0],r=0;r<o.length-1;r++)a=Z(this,s[i+r],e,r),a===q&&(a=this._$AH[r]),n||=!D(a)||a!==this._$AH[r],a===F?t=F:t!==F&&(t+=(a??"")+o[r+1]),this._$AH[r]=a}n&&!s&&this.j(t)}j(t){t===F?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===F?void 0:t}}class it extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==F)}}class st extends tt{constructor(t,e,i,s,o){super(t,e,i,s,o),this.type=5}_$AI(t,e=this){if((t=Z(this,t,e,0)??F)===q)return;const i=this._$AH,s=t===F&&i!==F||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,o=t!==F&&(i===F||s);s&&this.element.removeEventListener(this.name,this,i),o&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class ot{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){Z(this,t)}}const nt=w.litHtmlPolyfillSupport;nt?.(X,Q),(w.litHtmlVersions??=[]).push("3.3.2");const rt=globalThis;let at=class extends x{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,i)=>{const s=i?.renderBefore??e;let o=s._$litPart$;if(void 0===o){const t=i?.renderBefore??null;s._$litPart$=o=new Q(e.insertBefore(O(),t),t,void 0,i??{})}return o._$AI(t),o})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return q}};at._$litElement$=!0,at.finalized=!0,rt.litElementHydrateSupport?.({LitElement:at});const ct=rt.litElementPolyfillSupport;ct?.({LitElement:at}),(rt.litElementVersions??=[]).push("4.2.2");const dt={attribute:!0,type:String,converter:y,reflect:!1,hasChanged:$},lt=(t=dt,e,i)=>{const{kind:s,metadata:o}=i;let n=globalThis.litPropertyMetadata.get(o);if(void 0===n&&globalThis.litPropertyMetadata.set(o,n=new Map),"setter"===s&&((t=Object.create(t)).wrapped=!0),n.set(i.name,t),"accessor"===s){const{name:s}=i;return{set(i){const o=e.get.call(this);e.set.call(this,i),this.requestUpdate(s,o,t,!0,i)},init(e){return void 0!==e&&this.C(s,void 0,t,e),e}}}if("setter"===s){const{name:s}=i;return function(i){const o=this[s];e.call(this,i),this.requestUpdate(s,o,t,!0,i)}}throw Error("Unsupported decorator location: "+s)};function ht(t){return(e,i)=>"object"==typeof i?lt(t,e,i):((t,e,i)=>{const s=e.hasOwnProperty(i);return e.constructor.createProperty(i,t),s?Object.getOwnPropertyDescriptor(e,i):void 0})(t,e,i)}function pt(t){return ht({...t,state:!0,attribute:!1})}function ut(t,e){customElements.get(t)||customElements.define(t,e)}const _t=(t,e,i,s)=>{s=s||{},i=null==i?{}:i;const o=new Event(e,{bubbles:void 0===s.bubbles||s.bubbles,cancelable:Boolean(s.cancelable),composed:void 0===s.composed||s.composed});return o.detail=i,t.dispatchEvent(o),o},mt=["blue","red","amber","green","orange","cyan","purple","pink"],gt=new Set(["primary","accent","red","pink","purple","deep-purple","indigo","blue","light-blue","cyan","teal","green","light-green","lime","yellow","amber","orange","deep-orange","brown","light-grey","grey","dark-grey","blue-grey","black","white"]);function ft(t){return gt.has(t)?`var(--${t}-color)`:t}const vt={overdue:0,due:1,pending:2,completed:3};const yt=36e5,$t=864e5;function bt(t){const e=Math.abs(t);if(e<yt){const t=Math.max(1,Math.round(e/6e4));return`${t} minute${1!==t?"s":""}`}if(e<$t){const t=Math.round(e/yt);return`${t} hour${1!==t?"s":""}`}const i=Math.round(e/$t);return`${i} day${1!==i?"s":""}`}const xt={overdue:"Overdue",due:"Due",pending:"Upcoming",completed:"Completed"};function wt(t){return void 0!==t&&"none"!==t.action}class At{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,i){this._$Ct=t,this._$AM=e,this._$Ci=i}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}const Et="ontouchstart"in window||navigator.maxTouchPoints>0;class Ct extends HTMLElement{constructor(){super(...arguments),this.holdTime=500,this.held=!1,this.cancelled=!1}connectedCallback(){Object.assign(this.style,{position:"fixed",width:Et?"100px":"50px",height:Et?"100px":"50px",transform:"translate(-50%, -50%) scale(0)",pointerEvents:"none",zIndex:"999",background:"var(--primary-color)",display:null,opacity:"0.2",borderRadius:"50%",transition:"transform 180ms ease-in-out"}),["touchcancel","mouseout","mouseup","touchmove","mousewheel","wheel","scroll"].forEach(t=>{document.addEventListener(t,()=>{this.cancelled=!0,this.timer&&(this._stopAnimation(),clearTimeout(this.timer),this.timer=void 0)},{passive:!0})})}bind(t,e={}){t.actionHandler&&JSON.stringify(e)===JSON.stringify(t.actionHandler.options)||(t.actionHandler?(t.removeEventListener("touchstart",t.actionHandler.start),t.removeEventListener("touchend",t.actionHandler.end),t.removeEventListener("touchcancel",t.actionHandler.end),t.removeEventListener("mousedown",t.actionHandler.start),t.removeEventListener("click",t.actionHandler.end),t.removeEventListener("keydown",t.actionHandler.handleKeyDown)):t.addEventListener("contextmenu",t=>{const e=t||window.event;return e.preventDefault&&e.preventDefault(),e.stopPropagation&&e.stopPropagation(),!1}),t.actionHandler={options:e},e.disabled||(t.actionHandler.start=t=>{let i,s;this.cancelled=!1,t.touches?(i=t.touches[0].clientX,s=t.touches[0].clientY):(i=t.clientX,s=t.clientY),e.hasHold&&(this.held=!1,this.timer=window.setTimeout(()=>{this._startAnimation(i,s),this.held=!0},this.holdTime))},t.actionHandler.end=t=>{if("touchcancel"===t.type||"touchend"===t.type&&this.cancelled)return;const i=t.target;t.cancelable&&t.preventDefault(),e.hasHold&&(clearTimeout(this.timer),this._stopAnimation(),this.timer=void 0),e.hasHold&&this.held?_t(i,"action",{action:"hold"}):e.hasDoubleClick?"click"===t.type&&t.detail<2||!this.dblClickTimeout?this.dblClickTimeout=window.setTimeout(()=>{this.dblClickTimeout=void 0,_t(i,"action",{action:"tap"})},250):(clearTimeout(this.dblClickTimeout),this.dblClickTimeout=void 0,_t(i,"action",{action:"double_tap"})):_t(i,"action",{action:"tap"})},t.actionHandler.handleKeyDown=t=>{["Enter"," "].includes(t.key)&&t.currentTarget.actionHandler.end(t)},t.addEventListener("touchstart",t.actionHandler.start,{passive:!0}),t.addEventListener("touchend",t.actionHandler.end),t.addEventListener("touchcancel",t.actionHandler.end),t.addEventListener("mousedown",t.actionHandler.start,{passive:!0}),t.addEventListener("click",t.actionHandler.end),t.addEventListener("keydown",t.actionHandler.handleKeyDown)))}_startAnimation(t,e){Object.assign(this.style,{left:`${t}px`,top:`${e}px`,transform:"translate(-50%, -50%) scale(1)"})}_stopAnimation(){Object.assign(this.style,{left:null,top:null,transform:"translate(-50%, -50%) scale(0)"})}}const St=(t,e)=>{const i=(()=>{const t=document.body;if(t.querySelector("action-handler"))return t.querySelector("action-handler");customElements.get("action-handler")||customElements.define("action-handler",Ct);const e=document.createElement("action-handler");return t.appendChild(e),e})();i&&i.bind(t,e)},kt=(t=>(...e)=>({_$litDirective$:t,values:e}))(class extends At{update(t,[e]){return St(t.element,e),q}render(t){}}),Tt={overdue:"✗",due:"●",pending:"○",completed:"✓"};class Pt extends at{render(){const t=new Date;this.hass;const e=function(t,e){switch(t.status){case"overdue":if(t.next_due){const i="object"==typeof t.schedule&&null!==t.schedule?Number(t.schedule.grace_period_mins??0):0,s=new Date(t.next_due).getTime()+6e4*i,o=e.getTime()-s;return o>0?`Overdue by ${bt(o)}`:"Overdue"}return"Overdue";case"due":return"Due";case"pending":if(t.next_due){const i=new Date(t.next_due).getTime()-e.getTime();return i>0?`in ${bt(i)}`:"Pending"}return"Pending";case"completed":return""}}(this.item,t);return W`
      <div
        class="card"
        style="border-left: 5px solid ${ft(this.item.source_color)}"
      >
        <div
          class="row"
          ${kt({hasHold:wt(this.holdAction),hasDoubleClick:wt(this.doubleTapAction)})}
          @action=${this._handleAction}
        >
          <span class="status-indicator">${Tt[this.item.status]}</span>
          <span class="name">${this.item.chore_name}</span>
          <span class="time">${e}</span>
        </div>
      </div>
    `}_handleAction(t){let e;switch(t.detail.action){case"tap":e=this.tapAction;break;case"hold":e=this.holdAction;break;case"double_tap":e=this.doubleTapAction}!async function(t,e,i,s){if(i&&"none"!==i.action)switch(i.action){case"details":_t(t,"chore-detail",{item:s});break;case"complete":try{await e.callWS({type:"call_service",domain:"chore_calendar",service:"complete_item",service_data:{entity_id:s.source_entity,item:s.uid}}),_t(t,"chore-completed",{item:s})}catch(t){console.error("chore-calendar-card: failed to complete chore",t)}break;default:_t(t,"hass-action",{config:{entity:s.source_entity,tap_action:i,hold_action:i,double_tap_action:i},action:"tap"})}}(this,this.hass,e,this.item)}connectedCallback(){super.connectedCallback(),this._syncStatusAttribute()}updated(){this._syncStatusAttribute()}_syncStatusAttribute(){this.setAttribute("status",this.item.status)}}Pt.styles=r`
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
  `,t([ht({attribute:!1})],Pt.prototype,"hass",void 0),t([ht({attribute:!1})],Pt.prototype,"item",void 0),t([ht({attribute:!1})],Pt.prototype,"tapAction",void 0),t([ht({attribute:!1})],Pt.prototype,"holdAction",void 0),t([ht({attribute:!1})],Pt.prototype,"doubleTapAction",void 0),ut("chore-row",Pt);class Ht extends at{constructor(){super(...arguments),this.open=!1,this._loading=!1}render(){if(!this.item)return F;const t="completed"===this.item.status;return W`
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
        ${t?F:W`
              <div slot="footer" class="footer">
                <ha-button
                  ?disabled=${this._loading}
                  @click=${this._onComplete}
                >
                  ${this._loading?"Completing...":"Complete"}
                </ha-button>
              </div>
            `}
      </ha-dialog>
    `}_renderDetails(){const{item:t}=this;if(!t)return F;const e=this.hass?.language??"en",i=new Date;return W`
      ${this._renderListRow()}

      <div class="schedule">
        <ha-icon icon="mdi:calendar-clock"></ha-icon>
        <div class="info">${function(t){if("string"==typeof t)return t;if("time"in t){const e=String(t.time??""),i=t.active_days;return i&&i.length>0&&i.length<7?`${i.join(", ")} at ${e}`:`Daily at ${e}`}if("interval_mins"in t){const e=Number(t.interval_mins);if(e>=1440&&e%1440==0){const t=e/1440;return`Every ${t} day${1!==t?"s":""}`}if(e>=60&&e%60==0){const t=e/60;return`Every ${t} hour${1!==t?"s":""}`}return`Every ${e} minute${1!==e?"s":""}`}return JSON.stringify(t)}(t.schedule)}</div>
      </div>

      ${t.assigned_to.length>0?W`
            <div class="assigned">
              <ha-icon icon=${t.assigned_to.length>1?"mdi:account-multiple":"mdi:account"}></ha-icon>
              <div class="info">
                ${t.assigned_to.map(t=>this._resolveEntityName(t)).join(", ")}
              </div>
            </div>
          `:F}

      ${t.trigger_entity?W`
            <div class="trigger">
              <ha-icon icon="mdi:nfc-tap"></ha-icon>
              <div class="info">${this._resolveEntityName(t.trigger_entity)}</div>
            </div>
          `:F}

      ${t.last_completed?W`
            <div class="last-completed">
              <ha-icon icon="mdi:check-circle-outline"></ha-icon>
              <div class="info">
                ${function(t,e,i){const s=new Date(t),o=Math.floor((e.getTime()-s.getTime())/$t);return 0===o?new Intl.DateTimeFormat(i,{hour:"numeric",minute:"2-digit"}).format(s):1===o?"Yesterday":o<7?new Intl.DateTimeFormat(i,{weekday:"long"}).format(s):new Intl.DateTimeFormat(i,{month:"short",day:"numeric"}).format(s)}(t.last_completed,i,e)}${t.last_completed_by?` by ${this._resolveEntityName(t.last_completed_by)}`:""}
              </div>
            </div>
          `:F}
    `}_renderListRow(){const t=this.item?.source_entity;if(!t)return F;const e=this.hass?.states?.[t],i=e?.attributes?.friendly_name??t;return W`
      <div class="calendar">
        <ha-state-icon
          .hass=${this.hass}
          .stateObj=${e}
        ></ha-state-icon>
        <div class="info">${i}</div>
      </div>
    `}async _onComplete(){if(this.item&&!this._loading){this._loading=!0;try{await this.hass.callWS({type:"call_service",domain:"chore_calendar",service:"complete_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid}}),this.dispatchEvent(new CustomEvent("chore-completed",{detail:{item:this.item},bubbles:!0,composed:!0}))}catch(t){console.error("chore-detail-dialog: failed to complete chore",t)}finally{this._loading=!1}}}_resolveEntityName(t){const e=this.hass?.states?.[t];return e?.attributes?.friendly_name??t}_onClosed(){this.dispatchEvent(new CustomEvent("detail-dialog-closed",{bubbles:!0,composed:!0}))}}Ht.styles=r`
    ha-dialog {
      --mdc-dialog-max-width: 400px;
      --mdc-dialog-min-width: 320px;
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

    .footer {
      display: flex;
      justify-content: flex-end;
      padding: 16px;
      border-top: 1px solid var(--divider-color);
    }
  `,t([ht({attribute:!1})],Ht.prototype,"hass",void 0),t([ht({attribute:!1})],Ht.prototype,"item",void 0),t([ht({type:Boolean})],Ht.prototype,"open",void 0),t([pt()],Ht.prototype,"_loading",void 0),ut("chore-detail-dialog",Ht);const Ot=[{name:"title",selector:{text:{}}},{name:"hide_completed",selector:{boolean:{}},default:!1},{name:"hide_pending",selector:{boolean:{}},default:!1},{name:"hide_section_headers",selector:{boolean:{}},default:!1},{name:"hide_card_background",selector:{boolean:{}},default:!1},{name:"completed_limit",selector:{number:{min:0,max:50,step:1,mode:"box"}},default:3},{name:"update_interval",selector:{number:{min:10,max:600,step:10,mode:"box"}},default:60}],Dt=[{value:"details",label:"Chore Details"},{value:"complete",label:"Complete Chore"},{value:"more-info",label:"More Info"},{value:"navigate",label:"Navigate"},{value:"url",label:"URL"},{value:"call-service",label:"Call Service"},{value:"none",label:"None"}],Ut=[{name:"tap_action",selector:{select:{options:Dt,mode:"dropdown"}},default:"details"},{name:"hold_action",selector:{select:{options:Dt,mode:"dropdown"}},default:"none"},{name:"double_tap_action",selector:{select:{options:Dt,mode:"dropdown"}},default:"none"}],Mt=[{name:"exclude",selector:{select:{multiple:!0,options:[{value:"overdue",label:"Overdue"},{value:"due",label:"Due"},{value:"pending",label:"Pending"},{value:"completed",label:"Completed"}]}}}],Nt={title:"Title",hide_completed:"Hide completed section",hide_pending:"Hide pending section",hide_section_headers:"Hide section headings",hide_card_background:"Hide card background",completed_limit:"Completed chores limit",update_interval:"Update interval (seconds)",tap_action:"Tap action",hold_action:"Hold action",double_tap_action:"Double-tap action",exclude:"Exclude statuses"};function Lt(t){return"string"==typeof t?{entity:t}:{...t}}class Rt extends at{constructor(){super(...arguments),this._expandedEntities=new Set,this._computeLabel=t=>Nt[t.name]??t.name}setConfig(t){this._config={...t}}render(){if(!this.hass||!this._config)return W``;const t=(this._config.entities??[]).map(Lt);return W`
      <div class="entities-header">
        <span>Entities</span>
      </div>
      ${t.map((t,e)=>{const i=(s=t.entity)?(s.split(".").pop()??s).replace(/_/g," ").replace(/\b\w/g,t=>t.toUpperCase()):"New entity";var s;const o=t.color??"",n=this._expandedEntities.has(e);return W`
          <ha-expansion-panel
            .expanded=${n}
            @expanded-changed=${t=>this._toggleExpanded(t,e)}
          >
            <div class="entity-header" slot="header">
              <span
                class="entity-color-dot"
                style="background-color: ${o?ft(o):"var(--primary-color)"}"
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
                .schema=${Mt}
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
      ${0===t.length?W`<button class="add-btn" @click=${this._addEntity}>
            + Add entity
          </button>`:W`<button class="add-btn" @click=${this._addEntity}>
            + Add another entity
          </button>`}

      <div class="divider"></div>

      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${Ot}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._optionsChanged}
      ></ha-form>

      <div class="divider"></div>

      <ha-form
        .hass=${this.hass}
        .data=${this._actionsFormData()}
        .schema=${Ut}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._actionsChanged}
      ></ha-form>
    `}_dispatch(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}_toggleExpanded(t,e){const i=t.detail.expanded,s=new Set(this._expandedEntities);i?s.add(e):s.delete(e),this._expandedEntities=s}_entityChanged(t,e){t.stopPropagation();const i=(this._config.entities??[]).map(Lt);i[e]={...i[e],entity:t.detail.value.entity},this._config={...this._config,entities:i},this._dispatch()}_colorChanged(t,e){t.stopPropagation();const i=t.detail.value?.color,s=(this._config.entities??[]).map(Lt);s[e]={...s[e],color:i||void 0},this._config={...this._config,entities:s},this._dispatch()}_excludeChanged(t,e){t.stopPropagation();const i=t.detail.value.exclude??[],s=(this._config.entities??[]).map(Lt);s[e]={...s[e],exclude:i},this._config={...this._config,entities:s},this._dispatch()}_removeEntity(t){const e=(this._config.entities??[]).map(Lt).filter((e,i)=>i!==t),i=new Set;for(const e of this._expandedEntities)e<t?i.add(e):e>t&&i.add(e-1);this._expandedEntities=i,this._config={...this._config,entities:e},this._dispatch()}_addEntity(){const t=[...(this._config.entities??[]).map(Lt),{entity:""}],e=t.length-1,i=new Set(this._expandedEntities);i.add(e),this._expandedEntities=i,this._config={...this._config,entities:t},this._dispatch()}_actionToString(t){return t?.action??""}_actionsFormData(){return{tap_action:this._actionToString(this._config.tap_action),hold_action:this._actionToString(this._config.hold_action),double_tap_action:this._actionToString(this._config.double_tap_action)}}_actionsChanged(t){if(t.stopPropagation(),!this._config||!this.hass)return;const e=t.detail.value,i=t=>t?{action:t}:void 0;this._config={...this._config,tap_action:i(e.tap_action),hold_action:i(e.hold_action),double_tap_action:i(e.double_tap_action)},this._dispatch()}_optionsChanged(t){t.stopPropagation(),this._config&&this.hass&&(this._config={...t.detail.value,entities:this._config.entities,tap_action:this._config.tap_action,hold_action:this._config.hold_action,double_tap_action:this._config.double_tap_action},this._dispatch())}}Rt.styles=r`
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
  `,t([ht({attribute:!1})],Rt.prototype,"hass",void 0),t([pt()],Rt.prototype,"_config",void 0),t([pt()],Rt.prototype,"_expandedEntities",void 0),ut("chore-calendar-card-editor",Rt);console.info("%c CHORE-CALENDAR-CARD %c v0.3.0 ","color: white; background: #4CAF50; font-weight: 700;","color: #4CAF50; background: white; font-weight: 700;");const jt=["overdue","due","pending","completed"];class zt extends at{constructor(){super(...arguments),this._items=[],this._loading=!0,this._dialogOpen=!1,this._entityConfigs=[],this._connected=!1}static getConfigElement(){return document.createElement("chore-calendar-card-editor")}static getStubConfig(){return{entities:[]}}setConfig(t){if(!t.entities||0===t.entities.length)return this._configError="Please define at least one entity",void(this._config=t);this._configError=void 0,this._config=t,this._entityConfigs=t.entities.map((t,e)=>function(t,e){const i="string"==typeof t?{entity:t}:t;return{...i,color:i.color??mt[e%mt.length]}}(t,e)),t.hide_card_background?this.setAttribute("no-card-background",""):this.removeAttribute("no-card-background")}getCardSize(){return Math.max(3,this._items.length+1)}connectedCallback(){super.connectedCallback(),this._connected=!0,this._startPolling(),this._subscribeEvents()}disconnectedCallback(){super.disconnectedCallback(),this._connected=!1,this._stopPolling(),this._unsubscribeEvents()}updated(t){t.has("hass")&&this.hass&&this._loading&&this._refreshData()}async _refreshData(){var t;if(this.hass&&this._config)try{const e=[],i=this._entityConfigs.map(async t=>{const i=await this.hass.callWS({type:"call_service",domain:"chore_calendar",service:"get_items",service_data:{entity_id:t.entity},return_response:!0}),s=i.response?.items??[],o=t.exclude??[];for(const i of s)o.includes(i.status)||e.push({...i,source_entity:t.entity,source_color:t.color})});await Promise.all(i),this._items=(t=e,[...t].sort((t,e)=>{const i=vt[t.status]-vt[e.status];if(0!==i)return i;if("completed"===t.status){const i=t.last_completed?new Date(t.last_completed).getTime():0;return(e.last_completed?new Date(e.last_completed).getTime():0)-i}return(t.next_due?new Date(t.next_due).getTime():1/0)-(e.next_due?new Date(e.next_due).getTime():1/0)}))}catch(t){console.error("chore-calendar-card: failed to fetch items",t)}finally{this._loading=!1}}_startPolling(){this._stopPolling();const t=1e3*(this._config?.update_interval??60);this._refreshTimer=setInterval(()=>{this._connected&&this._refreshData()},t)}_stopPolling(){void 0!==this._refreshTimer&&(clearInterval(this._refreshTimer),this._refreshTimer=void 0)}async _subscribeEvents(){if(this.hass?.connection)try{const t=new Set(this._entityConfigs.map(t=>t.entity));this._eventUnsub=await this.hass.connection.subscribeEvents(e=>{e.data?.entity_id&&t.has(e.data.entity_id)&&this._refreshData()},"state_changed")}catch{}}_unsubscribeEvents(){this._eventUnsub?.(),this._eventUnsub=void 0}render(){if(!this._config)return F;if(this._configError)return W`
        <ha-card>
          <div class="empty">${this._configError}</div>
        </ha-card>
      `;const t=this._config.title;return W`
      <ha-card
        @chore-detail=${this._onChoreDetail}
        @chore-completed=${this._onChoreCompleted}
      >
        ${t?W`
              <div class="header">
                <span class="title">${t}</span>
              </div>
            `:F}
        ${this._loading?W`<div class="loading">Loading...</div>`:this._renderSections()}
      </ha-card>
      <chore-detail-dialog
        .hass=${this.hass}
        .item=${this._dialogItem}
        .open=${this._dialogOpen}
        @detail-dialog-closed=${this._onDialogClosed}
        @chore-completed=${this._onChoreCompleted}
      ></chore-detail-dialog>
    `}_renderSections(){if(0===this._items.length)return W`<div class="empty">No chores to show</div>`;const t=function(t){const e=new Map;for(const i of t){let t=e.get(i.status);t||(t=[],e.set(i.status,t)),t.push(i)}return e}(this._items),e=!!this._config.hide_pending,i=!!this._config.hide_completed,s=this._config.completed_limit??3,o=!!this._config.hide_section_headers;return W`
      ${jt.map(n=>{const r=t.get(n);if(!r||0===r.length)return F;if("pending"===n&&e)return F;if("completed"===n&&i)return F;const a="completed"===n&&s>0&&r.length>s?r.slice(0,s):r;return W`
          ${o?F:W`<div class="section-header ${n}">
                ${xt[n]}
              </div>`}
          ${a.map(t=>W`
              <chore-row
                .hass=${this.hass}
                .item=${t}
                .tapAction=${this._config.tap_action??{action:"details"}}
                .holdAction=${this._config.hold_action??{action:"none"}}
                .doubleTapAction=${this._config.double_tap_action??{action:"none"}}
              ></chore-row>
            `)}
        `})}
    `}_onChoreDetail(t){this._dialogItem=t.detail.item,this._dialogOpen=!0}_onDialogClosed(){this._dialogOpen=!1}_onChoreCompleted(){this._dialogOpen=!1,this._refreshData()}}zt.styles=r`
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

    .loading {
      padding: 32px 0;
      text-align: center;
      color: var(--secondary-text-color);
      font-size: 14px;
    }

`,t([ht({attribute:!1})],zt.prototype,"hass",void 0),t([pt()],zt.prototype,"_config",void 0),t([pt()],zt.prototype,"_configError",void 0),t([pt()],zt.prototype,"_items",void 0),t([pt()],zt.prototype,"_loading",void 0),t([pt()],zt.prototype,"_dialogItem",void 0),t([pt()],zt.prototype,"_dialogOpen",void 0),ut("chore-calendar-card",zt),window.customCards=window.customCards||[],window.customCards.push({type:"chore-calendar-card",name:"Chore Calendar",description:"Timeline view of chores from Chore Calendar lists",preview:!0});export{zt as ChoreCalendarCard};
