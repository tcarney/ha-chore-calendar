function t(t,e,s,i){var o,n=arguments.length,r=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(t,e,s,i);else for(var a=t.length-1;a>=0;a--)(o=t[a])&&(r=(n<3?o(r):n>3?o(e,s,r):o(e,s))||r);return n>3&&r&&Object.defineProperty(e,s,r),r}"function"==typeof SuppressedError&&SuppressedError;const e=globalThis,s=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,i=Symbol(),o=new WeakMap;let n=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==i)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(s&&void 0===t){const s=void 0!==e&&1===e.length;s&&(t=o.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&o.set(e,t))}return t}toString(){return this.cssText}};const r=(t,...e)=>{const s=1===t.length?t[0]:e.reduce((e,s,i)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[i+1],t[0]);return new n(s,t,i)},a=s?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return(t=>new n("string"==typeof t?t:t+"",void 0,i))(e)})(t):t,{is:l,defineProperty:c,getOwnPropertyDescriptor:h,getOwnPropertyNames:d,getOwnPropertySymbols:p,getPrototypeOf:u}=Object,_=globalThis,f=_.trustedTypes,g=f?f.emptyScript:"",m=_.reactiveElementPolyfillSupport,v=(t,e)=>t,$={toAttribute(t,e){switch(e){case Boolean:t=t?g:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let s=t;switch(e){case Boolean:s=null!==t;break;case Number:s=null===t?null:Number(t);break;case Object:case Array:try{s=JSON.parse(t)}catch(t){s=null}}return s}},y=(t,e)=>!l(t,e),b={attribute:!0,type:String,converter:$,reflect:!1,useDefault:!1,hasChanged:y};Symbol.metadata??=Symbol("metadata"),_.litPropertyMetadata??=new WeakMap;let x=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=b){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const s=Symbol(),i=this.getPropertyDescriptor(t,s,e);void 0!==i&&c(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){const{get:i,set:o}=h(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:i,set(e){const n=i?.call(this);o?.call(this,e),this.requestUpdate(t,n,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??b}static _$Ei(){if(this.hasOwnProperty(v("elementProperties")))return;const t=u(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(v("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(v("properties"))){const t=this.properties,e=[...d(t),...p(t)];for(const s of e)this.createProperty(s,t[s])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,s]of e)this.elementProperties.set(t,s)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const s=this._$Eu(t,e);void 0!==s&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const t of s)e.unshift(a(t))}else void 0!==t&&e.push(a(t));return e}static _$Eu(t,e){const s=e.attribute;return!1===s?void 0:"string"==typeof s?s:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,i)=>{if(s)t.adoptedStyleSheets=i.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const s of i){const i=document.createElement("style"),o=e.litNonce;void 0!==o&&i.setAttribute("nonce",o),i.textContent=s.cssText,t.appendChild(i)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){const s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(void 0!==i&&!0===s.reflect){const o=(void 0!==s.converter?.toAttribute?s.converter:$).toAttribute(e,s.type);this._$Em=t,null==o?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(t,e){const s=this.constructor,i=s._$Eh.get(t);if(void 0!==i&&this._$Em!==i){const t=s.getPropertyOptions(i),o="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:$;this._$Em=i;const n=o.fromAttribute(e,t.type);this[i]=n??this._$Ej?.get(i)??n,this._$Em=null}}requestUpdate(t,e,s,i=!1,o){if(void 0!==t){const n=this.constructor;if(!1===i&&(o=this[t]),s??=n.getPropertyOptions(t),!((s.hasChanged??y)(o,e)||s.useDefault&&s.reflect&&o===this._$Ej?.get(t)&&!this.hasAttribute(n._$Eu(t,s))))return;this.C(t,e,s)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:o},n){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??e??this[t]),!0!==o||void 0!==n)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),!0===i&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,s]of t){const{wrapped:t}=s,i=this[e];!0!==t||this._$AL.has(e)||void 0===i||this.C(e,void 0,s,i)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};x.elementStyles=[],x.shadowRootOptions={mode:"open"},x[v("elementProperties")]=new Map,x[v("finalized")]=new Map,m?.({ReactiveElement:x}),(_.reactiveElementVersions??=[]).push("2.1.2");const A=globalThis,w=t=>t,E=A.trustedTypes,C=E?E.createPolicy("lit-html",{createHTML:t=>t}):void 0,S="$lit$",P=`lit$${Math.random().toFixed(9).slice(2)}$`,k="?"+P,T=`<${k}>`,O=document,U=()=>O.createComment(""),M=t=>null===t||"object"!=typeof t&&"function"!=typeof t,R=Array.isArray,D="[ \t\n\f\r]",N=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,H=/-->/g,z=/>/g,j=RegExp(`>|${D}(?:([^\\s"'>=/]+)(${D}*=${D}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),L=/'/g,B=/"/g,I=/^(?:script|style|textarea|title)$/i,F=(t=>(e,...s)=>({_$litType$:t,strings:e,values:s}))(1),W=Symbol.for("lit-noChange"),q=Symbol.for("lit-nothing"),V=new WeakMap,J=O.createTreeWalker(O,129);function K(t,e){if(!R(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==C?C.createHTML(e):e}const Z=(t,e)=>{const s=t.length-1,i=[];let o,n=2===e?"<svg>":3===e?"<math>":"",r=N;for(let e=0;e<s;e++){const s=t[e];let a,l,c=-1,h=0;for(;h<s.length&&(r.lastIndex=h,l=r.exec(s),null!==l);)h=r.lastIndex,r===N?"!--"===l[1]?r=H:void 0!==l[1]?r=z:void 0!==l[2]?(I.test(l[2])&&(o=RegExp("</"+l[2],"g")),r=j):void 0!==l[3]&&(r=j):r===j?">"===l[0]?(r=o??N,c=-1):void 0===l[1]?c=-2:(c=r.lastIndex-l[2].length,a=l[1],r=void 0===l[3]?j:'"'===l[3]?B:L):r===B||r===L?r=j:r===H||r===z?r=N:(r=j,o=void 0);const d=r===j&&t[e+1].startsWith("/>")?" ":"";n+=r===N?s+T:c>=0?(i.push(a),s.slice(0,c)+S+s.slice(c)+P+d):s+P+(-2===c?e:d)}return[K(t,n+(t[s]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),i]};class G{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let o=0,n=0;const r=t.length-1,a=this.parts,[l,c]=Z(t,e);if(this.el=G.createElement(l,s),J.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(i=J.nextNode())&&a.length<r;){if(1===i.nodeType){if(i.hasAttributes())for(const t of i.getAttributeNames())if(t.endsWith(S)){const e=c[n++],s=i.getAttribute(t).split(P),r=/([.?@])?(.*)/.exec(e);a.push({type:1,index:o,name:r[2],strings:s,ctor:"."===r[1]?et:"?"===r[1]?st:"@"===r[1]?it:tt}),i.removeAttribute(t)}else t.startsWith(P)&&(a.push({type:6,index:o}),i.removeAttribute(t));if(I.test(i.tagName)){const t=i.textContent.split(P),e=t.length-1;if(e>0){i.textContent=E?E.emptyScript:"";for(let s=0;s<e;s++)i.append(t[s],U()),J.nextNode(),a.push({type:2,index:++o});i.append(t[e],U())}}}else if(8===i.nodeType)if(i.data===k)a.push({type:2,index:o});else{let t=-1;for(;-1!==(t=i.data.indexOf(P,t+1));)a.push({type:7,index:o}),t+=P.length-1}o++}}static createElement(t,e){const s=O.createElement("template");return s.innerHTML=t,s}}function Q(t,e,s=t,i){if(e===W)return e;let o=void 0!==i?s._$Co?.[i]:s._$Cl;const n=M(e)?void 0:e._$litDirective$;return o?.constructor!==n&&(o?._$AO?.(!1),void 0===n?o=void 0:(o=new n(t),o._$AT(t,s,i)),void 0!==i?(s._$Co??=[])[i]=o:s._$Cl=o),void 0!==o&&(e=Q(t,o._$AS(t,e.values),o,i)),e}class X{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:s}=this._$AD,i=(t?.creationScope??O).importNode(e,!0);J.currentNode=i;let o=J.nextNode(),n=0,r=0,a=s[0];for(;void 0!==a;){if(n===a.index){let e;2===a.type?e=new Y(o,o.nextSibling,this,t):1===a.type?e=new a.ctor(o,a.name,a.strings,this,t):6===a.type&&(e=new ot(o,this,t)),this._$AV.push(e),a=s[++r]}n!==a?.index&&(o=J.nextNode(),n++)}return J.currentNode=O,i}p(t){let e=0;for(const s of this._$AV)void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}}class Y{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=q,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Q(this,t,e),M(t)?t===q||null==t||""===t?(this._$AH!==q&&this._$AR(),this._$AH=q):t!==this._$AH&&t!==W&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>R(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==q&&M(this._$AH)?this._$AA.nextSibling.data=t:this.T(O.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:s}=t,i="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=G.createElement(K(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(e);else{const t=new X(i,this),s=t.u(this.options);t.p(e),this.T(s),this._$AH=t}}_$AC(t){let e=V.get(t.strings);return void 0===e&&V.set(t.strings,e=new G(t)),e}k(t){R(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let s,i=0;for(const o of t)i===e.length?e.push(s=new Y(this.O(U()),this.O(U()),this,this.options)):s=e[i],s._$AI(o),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=w(t).nextSibling;w(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,o){this.type=1,this._$AH=q,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=o,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=q}_$AI(t,e=this,s,i){const o=this.strings;let n=!1;if(void 0===o)t=Q(this,t,e,0),n=!M(t)||t!==this._$AH&&t!==W,n&&(this._$AH=t);else{const i=t;let r,a;for(t=o[0],r=0;r<o.length-1;r++)a=Q(this,i[s+r],e,r),a===W&&(a=this._$AH[r]),n||=!M(a)||a!==this._$AH[r],a===q?t=q:t!==q&&(t+=(a??"")+o[r+1]),this._$AH[r]=a}n&&!i&&this.j(t)}j(t){t===q?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===q?void 0:t}}class st extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==q)}}class it extends tt{constructor(t,e,s,i,o){super(t,e,s,i,o),this.type=5}_$AI(t,e=this){if((t=Q(this,t,e,0)??q)===W)return;const s=this._$AH,i=t===q&&s!==q||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,o=t!==q&&(s===q||i);i&&this.element.removeEventListener(this.name,this,s),o&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class ot{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){Q(this,t)}}const nt=A.litHtmlPolyfillSupport;nt?.(G,Y),(A.litHtmlVersions??=[]).push("3.3.2");const rt=globalThis;class at extends x{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,s)=>{const i=s?.renderBefore??e;let o=i._$litPart$;if(void 0===o){const t=s?.renderBefore??null;i._$litPart$=o=new Y(e.insertBefore(U(),t),t,void 0,s??{})}return o._$AI(t),o})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return W}}at._$litElement$=!0,at.finalized=!0,rt.litElementHydrateSupport?.({LitElement:at});const lt=rt.litElementPolyfillSupport;lt?.({LitElement:at}),(rt.litElementVersions??=[]).push("4.2.2");const ct=at.prototype,ht=ct.createRenderRoot;ct.createRenderRoot=function(){try{return ht.call(this)}catch{const t=this.attachShadow(this.constructor.shadowRootOptions),e=this.constructor.elementStyles;if(e&&e.length>0)for(const s of e){const e=document.createElement("style");e.textContent="string"==typeof s?s:s.cssRules?Array.from(s.cssRules).map(t=>t.cssText).join("\n"):s.cssText??"",t.appendChild(e)}return t}};const dt=t=>(e,s)=>{void 0!==s?s.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},pt={attribute:!0,type:String,converter:$,reflect:!1,hasChanged:y},ut=(t=pt,e,s)=>{const{kind:i,metadata:o}=s;let n=globalThis.litPropertyMetadata.get(o);if(void 0===n&&globalThis.litPropertyMetadata.set(o,n=new Map),"setter"===i&&((t=Object.create(t)).wrapped=!0),n.set(s.name,t),"accessor"===i){const{name:i}=s;return{set(s){const o=e.get.call(this);e.set.call(this,s),this.requestUpdate(i,o,t,!0,s)},init(e){return void 0!==e&&this.C(i,void 0,t,e),e}}}if("setter"===i){const{name:i}=s;return function(s){const o=this[i];e.call(this,s),this.requestUpdate(i,o,t,!0,s)}}throw Error("Unsupported decorator location: "+i)};function _t(t){return(e,s)=>"object"==typeof s?ut(t,e,s):((t,e,s)=>{const i=e.hasOwnProperty(s);return e.constructor.createProperty(s,t),i?Object.getOwnPropertyDescriptor(e,s):void 0})(t,e,s)}function ft(t){return _t({...t,state:!0,attribute:!1})}const gt=["#4285F4","#EA4335","#FBBC04","#34A853","#FF6D01","#46BDC6","#7B1FA2","#C2185B"];const mt={overdue:0,due:1,pending:2,completed:3};const vt=36e5,$t=864e5;function yt(t){const e=Math.abs(t);if(e<vt){const t=Math.max(1,Math.round(e/6e4));return`${t} minute${1!==t?"s":""}`}if(e<$t){const t=Math.round(e/vt);return`${t} hour${1!==t?"s":""}`}const s=Math.round(e/$t);return`${s} day${1!==s?"s":""}`}const bt={overdue:"Overdue",due:"Due",pending:"Upcoming",completed:"Completed"},xt={overdue:"✗",due:"●",pending:"○",completed:"✓"};let At=class extends at{constructor(){super(...arguments),this._expanded=!1}render(){const t=new Date;this.hass;const e=function(t,e){switch(t.status){case"overdue":return t.next_due?`Overdue by ${yt(e.getTime()-new Date(t.next_due).getTime())}`:"Overdue";case"due":return"Due";case"pending":if(t.next_due){const s=new Date(t.next_due).getTime()-e.getTime();return s>0?`in ${yt(s)}`:"Pending"}return"Pending";case"completed":return""}}(this.item,t);return F`
      <div
        class="card"
        style="border-left: 5px solid ${this.item.source_color}"
      >
        <div class="row" @click=${this._toggle}>
          <span class="status-indicator">${xt[this.item.status]}</span>
          <span class="name">${this.item.chore_name}</span>
          <span class="time">${e}</span>
        </div>
        ${this._expanded?this._renderDetails():q}
      </div>
    `}_renderDetails(){const{item:t}=this;return F`
      <div class="details">
        <span class="label">Schedule</span>
        <span class="value">${function(t){if("string"==typeof t)return t;if("time"in t){const e=String(t.time??""),s=t.active_days;return s&&s.length>0&&s.length<7?`${s.join(", ")} at ${e}`:`Daily at ${e}`}if("interval_mins"in t){const e=Number(t.interval_mins);if(e>=1440&&e%1440==0){const t=e/1440;return`Every ${t} day${1!==t?"s":""}`}if(e>=60&&e%60==0){const t=e/60;return`Every ${t} hour${1!==t?"s":""}`}return`Every ${e} minute${1!==e?"s":""}`}return JSON.stringify(t)}(t.schedule)}</span>

        ${t.assigned_to.length>0?F`
              <span class="label">Assigned</span>
              <span class="value">${t.assigned_to.map(t=>this._resolveEntityName(t)).join(", ")}</span>
            `:q}
        ${t.trigger_entity?F`
              <span class="label">Trigger</span>
              <span class="value">${t.trigger_entity}</span>
            `:q}
        ${t.last_completed?F`
              <span class="label">Last done</span>
              <span class="value">
                ${new Date(t.last_completed).toLocaleString(this.hass?.language??"en")}
                ${t.last_completed_by?`by ${this._resolveEntityName(t.last_completed_by)}`:""}
              </span>
            `:q}
      </div>
    `}_resolveEntityName(t){const e=this.hass?.states?.[t];return e?.attributes?.friendly_name??t}_toggle(){this._expanded=!this._expanded}connectedCallback(){super.connectedCallback(),this._syncStatusAttribute()}updated(){this._syncStatusAttribute()}_syncStatusAttribute(){this.setAttribute("status",this.item.status)}};At.styles=r`
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

    .details {
      padding: 0 16px 12px 38px;
      font-size: 12px;
      color: var(--secondary-text-color);
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 12px;
    }

    .details .label {
      opacity: 0.7;
    }

    .details .value {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,t([_t({attribute:!1})],At.prototype,"hass",void 0),t([_t({attribute:!1})],At.prototype,"item",void 0),t([ft()],At.prototype,"_expanded",void 0),At=t([dt("chore-row")],At);const wt=[{value:"all",label:"All"},{value:"active",label:"Active"},{value:"overdue",label:"Overdue"},{value:"due",label:"Due"},{value:"pending",label:"Pending"},{value:"completed",label:"Completed"}];let Et=class extends at{constructor(){super(...arguments),this.value="active"}render(){return F`
      <select .value=${this.value} @change=${this._onChange}>
        ${wt.map(t=>F`<option
              value=${t.value}
              ?selected=${t.value===this.value}
            >
              ${t.label}
            </option>`)}
      </select>
    `}_onChange(t){const e=t.target;this.value=e.value,this.dispatchEvent(new CustomEvent("filter-changed",{detail:{value:this.value},bubbles:!0,composed:!0}))}};Et.styles=r`
    :host {
      display: inline-block;
    }

    select {
      background: transparent;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 12px;
      color: var(--primary-text-color);
      cursor: pointer;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      padding-right: 20px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23727272'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 6px center;
    }

    select:focus {
      border-color: var(--primary-color);
    }
  `,t([_t()],Et.prototype,"value",void 0),Et=t([dt("status-filter")],Et);const Ct=[{name:"title",selector:{text:{}}},{name:"show_header",selector:{boolean:{}},default:!0},{name:"show_completed",selector:{boolean:{}},default:!0},{name:"hide_filter",selector:{boolean:{}},default:!1},{name:"hide_sections",selector:{boolean:{}},default:!1},{name:"default_filter",selector:{select:{options:[{value:"active",label:"Active"},{value:"all",label:"All"},{value:"overdue",label:"Overdue"},{value:"due",label:"Due"},{value:"pending",label:"Pending"},{value:"completed",label:"Completed"}],mode:"dropdown"}},default:"active"},{name:"no_card_background",selector:{boolean:{}},default:!1},{name:"completed_limit",selector:{number:{min:0,max:50,step:1,mode:"box"}},default:3},{name:"update_interval",selector:{number:{min:10,max:600,step:10,mode:"box"}},default:60}],St={title:"Title",show_header:"Show header",show_completed:"Show completed section",hide_filter:"Hide status filter",hide_sections:"Hide section headings",default_filter:"Default filter",no_card_background:"Transparent card background",completed_limit:"Completed chores limit",update_interval:"Update interval (seconds)"};function Pt(t){return"string"==typeof t?{entity:t}:{...t}}let kt=class extends at{constructor(){super(...arguments),this._computeLabel=t=>St[t.name]??t.name}setConfig(t){this._config={...t}}render(){if(!this.hass||!this._config)return F``;const t=(this._config.entities??[]).map(Pt);return F`
      <div class="entities-header">
        <span>Entities</span>
      </div>
      ${t.map((t,e)=>F`
          <div class="entity-row">
            <ha-form
              class="entity-picker"
              .hass=${this.hass}
              .data=${{entity:t.entity}}
              .schema=${[{name:"entity",selector:{entity:{domain:"calendar",integration:"chore_calendar"}}}]}
              .computeLabel=${()=>""}
              @value-changed=${t=>this._entityChanged(t,e)}
            ></ha-form>
            <input
              type="color"
              class="color-input"
              .value=${t.color??"#4285F4"}
              title="List color"
              @input=${t=>this._colorChanged(t,e)}
            />
            <button
              class="remove-btn"
              title="Remove"
              @click=${()=>this._removeEntity(e)}
            >
              ✕
            </button>
          </div>
        `)}
      ${0===t.length?F`<button class="add-btn" @click=${this._addEntity}>
            + Add entity
          </button>`:F`<button class="add-btn" @click=${this._addEntity}>
            + Add another entity
          </button>`}

      <div class="divider"></div>

      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${Ct}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._optionsChanged}
      ></ha-form>
    `}_dispatch(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}_entityChanged(t,e){t.stopPropagation();const s=(this._config.entities??[]).map(Pt);s[e]={...s[e],entity:t.detail.value.entity},this._config={...this._config,entities:s},this._dispatch()}_colorChanged(t,e){const s=t.target.value,i=(this._config.entities??[]).map(Pt);i[e]={...i[e],color:s},this._config={...this._config,entities:i},this._dispatch()}_removeEntity(t){const e=(this._config.entities??[]).map(Pt).filter((e,s)=>s!==t);this._config={...this._config,entities:e},this._dispatch()}_addEntity(){const t=[...(this._config.entities??[]).map(Pt),{entity:""}];this._config={...this._config,entities:t},this._dispatch()}_optionsChanged(t){t.stopPropagation(),this._config&&this.hass&&(this._config={...t.detail.value,entities:this._config.entities},this._dispatch())}};kt.styles=r`
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

    .entity-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
    }

    .entity-picker {
      flex: 1;
      min-width: 0;
    }

    .color-input {
      width: 36px;
      height: 36px;
      padding: 2px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      flex-shrink: 0;
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
  `,t([_t({attribute:!1})],kt.prototype,"hass",void 0),t([ft()],kt.prototype,"_config",void 0),kt=t([dt("chore-calendar-card-editor")],kt);const Tt=["overdue","due","pending","completed"];let Ot=class extends at{constructor(){super(...arguments),this._items=[],this._filter="active",this._showAllCompleted=!1,this._loading=!0,this._entityConfigs=[],this._connected=!1}static getConfigElement(){return document.createElement("chore-calendar-card-editor")}static getStubConfig(){return{entities:[]}}setConfig(t){if(!t.entities||0===t.entities.length)throw new Error("Please define at least one entity");this._config=t,this._entityConfigs=t.entities.map((t,e)=>function(t,e){const s="string"==typeof t?{entity:t}:t;return{...s,color:s.color??gt[e%gt.length]}}(t,e)),this._filter=t.default_filter??"active",t.hide_filter&&!t.default_filter&&(this._filter="all"),t.no_card_background?this.setAttribute("no-card-background",""):this.removeAttribute("no-card-background")}getCardSize(){return Math.max(3,this._items.length+1)}connectedCallback(){super.connectedCallback(),this._connected=!0,this._startPolling(),this._subscribeEvents()}disconnectedCallback(){super.disconnectedCallback(),this._connected=!1,this._stopPolling(),this._unsubscribeEvents()}updated(t){t.has("hass")&&this.hass&&this._loading&&this._refreshData()}async _refreshData(){var t;if(this.hass&&this._config)try{const e=[],s=this._entityConfigs.map(async t=>{const s=await this.hass.callWS({type:"call_service",domain:"chore_calendar",service:"get_items",service_data:{entity_id:t.entity},return_response:!0}),i=s.response?.items??[];for(const s of i)e.push({...s,source_entity:t.entity,source_color:t.color})});await Promise.all(s),this._items=(t=e,[...t].sort((t,e)=>{const s=mt[t.status]-mt[e.status];if(0!==s)return s;if("completed"===t.status){const s=t.last_completed?new Date(t.last_completed).getTime():0;return(e.last_completed?new Date(e.last_completed).getTime():0)-s}return(t.next_due?new Date(t.next_due).getTime():1/0)-(e.next_due?new Date(e.next_due).getTime():1/0)}))}catch(t){console.error("chore-calendar-card: failed to fetch items",t)}finally{this._loading=!1}}_startPolling(){this._stopPolling();const t=1e3*(this._config?.update_interval??60);this._refreshTimer=setInterval(()=>{this._connected&&this._refreshData()},t)}_stopPolling(){void 0!==this._refreshTimer&&(clearInterval(this._refreshTimer),this._refreshTimer=void 0)}async _subscribeEvents(){if(this.hass?.connection)try{this._eventUnsub=await this.hass.connection.subscribeEvents(()=>this._refreshData(),"chore_calendar_status_changed")}catch{}}_unsubscribeEvents(){this._eventUnsub?.(),this._eventUnsub=void 0}_getFilteredItems(){return"all"===this._filter?this._items:"active"===this._filter?this._items.filter(t=>"completed"!==t.status):this._items.filter(t=>t.status===this._filter)}_onFilterChanged(t){this._filter=t.detail.value,this._showAllCompleted=!1}render(){if(!this._config)return q;const t=!1!==this._config.show_header,e=!0===this._config.hide_filter;return F`
      <ha-card>
        ${t?F`
              <div class="header">
                <span class="title"
                  >${this._config.title??"Chores"}</span
                >
                ${e?q:F`
                      <status-filter
                        .value=${this._filter}
                        @filter-changed=${this._onFilterChanged}
                      ></status-filter>
                    `}
              </div>
            `:q}
        ${this._loading?F`<div class="loading">Loading...</div>`:this._renderSections()}
      </ha-card>
    `}_renderSections(){const t=this._getFilteredItems();if(0===t.length)return F`<div class="empty">No chores to show</div>`;const e=function(t){const e=new Map;for(const s of t){let t=e.get(s.status);t||(t=[],e.set(s.status,t)),t.push(s)}return e}(t),s=!1!==this._config.show_completed,i=this._config.completed_limit??3,o=!0===this._config.hide_sections;return F`
      ${Tt.map(t=>{const n=e.get(t);if(!n||0===n.length)return q;if("completed"===t&&!s)return q;const r="completed"===t&&!this._showAllCompleted&&n.length>i?n.slice(0,i):n,a=n.length-r.length;return F`
          ${o?q:F`<div class="section-header ${t}">
                ${bt[t]}
              </div>`}
          ${r.map(t=>F`
              <chore-row
                .hass=${this.hass}
                .item=${t}
              ></chore-row>
            `)}
          ${a>0?F`
                <button class="show-more" @click=${this._showMore}>
                  Show ${a} more
                </button>
              `:q}
        `})}
    `}_showMore(){this._showAllCompleted=!0}};Ot.styles=r`
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

    .show-more {
      padding: 4px 0 8px 27px;
      font-size: 12px;
      color: var(--primary-color);
      cursor: pointer;
      background: none;
      border: none;
      font-family: inherit;
    }

    .show-more:hover {
      text-decoration: underline;
    }

  `,t([_t({attribute:!1})],Ot.prototype,"hass",void 0),t([ft()],Ot.prototype,"_config",void 0),t([ft()],Ot.prototype,"_items",void 0),t([ft()],Ot.prototype,"_filter",void 0),t([ft()],Ot.prototype,"_showAllCompleted",void 0),t([ft()],Ot.prototype,"_loading",void 0),Ot=t([dt("chore-calendar-card")],Ot),window.customCards=window.customCards||[],window.customCards.push({type:"chore-calendar-card",name:"Chore Calendar",description:"Timeline view of chores from Chore Calendar lists",preview:!0});export{Ot as ChoreCalendarCard};
