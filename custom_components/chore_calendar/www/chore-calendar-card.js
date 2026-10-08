function e(e,t,i,o){var n,s=arguments.length,a=s<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,i,o);else for(var r=e.length-1;r>=0;r--)(n=e[r])&&(a=(s<3?n(a):s>3?n(t,i,a):n(t,i))||a);return s>3&&a&&Object.defineProperty(t,i,a),a}"function"==typeof SuppressedError&&SuppressedError;const t=globalThis,i=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,o=Symbol(),n=new WeakMap;let s=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==o)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(i&&void 0===e){const i=void 0!==t&&1===t.length;i&&(e=n.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&n.set(t,e))}return e}toString(){return this.cssText}};const a=(e,...t)=>{const i=1===e.length?e[0]:t.reduce((t,i,o)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+e[o+1],e[0]);return new s(i,e,o)},r=i?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const i of e.cssRules)t+=i.cssText;return(e=>new s("string"==typeof e?e:e+"",void 0,o))(t)})(e):e,{is:d,defineProperty:l,getOwnPropertyDescriptor:c,getOwnPropertyNames:h,getOwnPropertySymbols:p,getPrototypeOf:u}=Object,_=globalThis,m=_.trustedTypes,g=m?m.emptyScript:"",y=_.reactiveElementPolyfillSupport,f=(e,t)=>e,v={toAttribute(e,t){switch(t){case Boolean:e=e?g:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=null!==e;break;case Number:i=null===e?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch(e){i=null}}return i}},b=(e,t)=>!d(e,t),$={attribute:!0,type:String,converter:v,reflect:!1,useDefault:!1,hasChanged:b};Symbol.metadata??=Symbol("metadata"),_.litPropertyMetadata??=new WeakMap;let w=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=$){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),o=this.getPropertyDescriptor(e,i,t);void 0!==o&&l(this.prototype,e,o)}}static getPropertyDescriptor(e,t,i){const{get:o,set:n}=c(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:o,set(t){const s=o?.call(this);n?.call(this,t),this.requestUpdate(e,s,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??$}static _$Ei(){if(this.hasOwnProperty(f("elementProperties")))return;const e=u(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(f("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(f("properties"))){const e=this.properties,t=[...h(e),...p(e)];for(const i of t)this.createProperty(i,e[i])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,i]of t)this.elementProperties.set(e,i)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const i=this._$Eu(e,t);void 0!==i&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const e of i)t.unshift(r(e))}else void 0!==e&&t.push(r(e));return t}static _$Eu(e,t){const i=t.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,o)=>{if(i)e.adoptedStyleSheets=o.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const i of o){const o=document.createElement("style"),n=t.litNonce;void 0!==n&&o.setAttribute("nonce",n),o.textContent=i.cssText,e.appendChild(o)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){const i=this.constructor.elementProperties.get(e),o=this.constructor._$Eu(e,i);if(void 0!==o&&!0===i.reflect){const n=(void 0!==i.converter?.toAttribute?i.converter:v).toAttribute(t,i.type);this._$Em=e,null==n?this.removeAttribute(o):this.setAttribute(o,n),this._$Em=null}}_$AK(e,t){const i=this.constructor,o=i._$Eh.get(e);if(void 0!==o&&this._$Em!==o){const e=i.getPropertyOptions(o),n="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:v;this._$Em=o;const s=n.fromAttribute(t,e.type);this[o]=s??this._$Ej?.get(o)??s,this._$Em=null}}requestUpdate(e,t,i,o=!1,n){if(void 0!==e){const s=this.constructor;if(!1===o&&(n=this[e]),i??=s.getPropertyOptions(e),!((i.hasChanged??b)(n,t)||i.useDefault&&i.reflect&&n===this._$Ej?.get(e)&&!this.hasAttribute(s._$Eu(e,i))))return;this.C(e,t,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:o,wrapped:n},s){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,s??t??this[e]),!0!==n||void 0!==s)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),!0===o&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,i]of e){const{wrapped:e}=i,o=this[t];!0!==e||this._$AL.has(t)||void 0===o||this.C(t,void 0,i,o)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};w.elementStyles=[],w.shadowRootOptions={mode:"open"},w[f("elementProperties")]=new Map,w[f("finalized")]=new Map,y?.({ReactiveElement:w}),(_.reactiveElementVersions??=[]).push("2.1.2");const x=globalThis,k=e=>e,C=x.trustedTypes,S=C?C.createPolicy("lit-html",{createHTML:e=>e}):void 0,A="$lit$",E=`lit$${Math.random().toFixed(9).slice(2)}$`,D="?"+E,T=`<${D}>`,O=document,P=()=>O.createComment(""),N=e=>null===e||"object"!=typeof e&&"function"!=typeof e,U=Array.isArray,M="[ \t\n\f\r]",H=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,I=/-->/g,q=/>/g,z=RegExp(`>|${M}(?:([^\\s"'>=/]+)(${M}*=${M}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),L=/'/g,R=/"/g,j=/^(?:script|style|textarea|title)$/i,F=(e=>(t,...i)=>({_$litType$:e,strings:t,values:i}))(1),B=Symbol.for("lit-noChange"),W=Symbol.for("lit-nothing"),V=new WeakMap,Y=O.createTreeWalker(O,129);function K(e,t){if(!U(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==S?S.createHTML(t):t}const J=(e,t)=>{const i=e.length-1,o=[];let n,s=2===t?"<svg>":3===t?"<math>":"",a=H;for(let t=0;t<i;t++){const i=e[t];let r,d,l=-1,c=0;for(;c<i.length&&(a.lastIndex=c,d=a.exec(i),null!==d);)c=a.lastIndex,a===H?"!--"===d[1]?a=I:void 0!==d[1]?a=q:void 0!==d[2]?(j.test(d[2])&&(n=RegExp("</"+d[2],"g")),a=z):void 0!==d[3]&&(a=z):a===z?">"===d[0]?(a=n??H,l=-1):void 0===d[1]?l=-2:(l=a.lastIndex-d[2].length,r=d[1],a=void 0===d[3]?z:'"'===d[3]?R:L):a===R||a===L?a=z:a===I||a===q?a=H:(a=z,n=void 0);const h=a===z&&e[t+1].startsWith("/>")?" ":"";s+=a===H?i+T:l>=0?(o.push(r),i.slice(0,l)+A+i.slice(l)+E+h):i+E+(-2===l?t:h)}return[K(e,s+(e[i]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),o]};class G{constructor({strings:e,_$litType$:t},i){let o;this.parts=[];let n=0,s=0;const a=e.length-1,r=this.parts,[d,l]=J(e,t);if(this.el=G.createElement(d,i),Y.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(o=Y.nextNode())&&r.length<a;){if(1===o.nodeType){if(o.hasAttributes())for(const e of o.getAttributeNames())if(e.endsWith(A)){const t=l[s++],i=o.getAttribute(e).split(E),a=/([.?@])?(.*)/.exec(t);r.push({type:1,index:n,name:a[2],strings:i,ctor:"."===a[1]?te:"?"===a[1]?ie:"@"===a[1]?oe:ee}),o.removeAttribute(e)}else e.startsWith(E)&&(r.push({type:6,index:n}),o.removeAttribute(e));if(j.test(o.tagName)){const e=o.textContent.split(E),t=e.length-1;if(t>0){o.textContent=C?C.emptyScript:"";for(let i=0;i<t;i++)o.append(e[i],P()),Y.nextNode(),r.push({type:2,index:++n});o.append(e[t],P())}}}else if(8===o.nodeType)if(o.data===D)r.push({type:2,index:n});else{let e=-1;for(;-1!==(e=o.data.indexOf(E,e+1));)r.push({type:7,index:n}),e+=E.length-1}n++}}static createElement(e,t){const i=O.createElement("template");return i.innerHTML=e,i}}function X(e,t,i=e,o){if(t===B)return t;let n=void 0!==o?i._$Co?.[o]:i._$Cl;const s=N(t)?void 0:t._$litDirective$;return n?.constructor!==s&&(n?._$AO?.(!1),void 0===s?n=void 0:(n=new s(e),n._$AT(e,i,o)),void 0!==o?(i._$Co??=[])[o]=n:i._$Cl=n),void 0!==n&&(t=X(e,n._$AS(e,t.values),n,o)),t}class Z{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:i}=this._$AD,o=(e?.creationScope??O).importNode(t,!0);Y.currentNode=o;let n=Y.nextNode(),s=0,a=0,r=i[0];for(;void 0!==r;){if(s===r.index){let t;2===r.type?t=new Q(n,n.nextSibling,this,e):1===r.type?t=new r.ctor(n,r.name,r.strings,this,e):6===r.type&&(t=new ne(n,this,e)),this._$AV.push(t),r=i[++a]}s!==r?.index&&(n=Y.nextNode(),s++)}return Y.currentNode=O,o}p(e){let t=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}}class Q{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,i,o){this.type=2,this._$AH=W,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=o,this._$Cv=o?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=X(this,e,t),N(e)?e===W||null==e||""===e?(this._$AH!==W&&this._$AR(),this._$AH=W):e!==this._$AH&&e!==B&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>U(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==W&&N(this._$AH)?this._$AA.nextSibling.data=e:this.T(O.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:i}=e,o="number"==typeof i?this._$AC(e):(void 0===i.el&&(i.el=G.createElement(K(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===o)this._$AH.p(t);else{const e=new Z(o,this),i=e.u(this.options);e.p(t),this.T(i),this._$AH=e}}_$AC(e){let t=V.get(e.strings);return void 0===t&&V.set(e.strings,t=new G(e)),t}k(e){U(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let i,o=0;for(const n of e)o===t.length?t.push(i=new Q(this.O(P()),this.O(P()),this,this.options)):i=t[o],i._$AI(n),o++;o<t.length&&(this._$AR(i&&i._$AB.nextSibling,o),t.length=o)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=k(e).nextSibling;k(e).remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class ee{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,o,n){this.type=1,this._$AH=W,this._$AN=void 0,this.element=e,this.name=t,this._$AM=o,this.options=n,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=W}_$AI(e,t=this,i,o){const n=this.strings;let s=!1;if(void 0===n)e=X(this,e,t,0),s=!N(e)||e!==this._$AH&&e!==B,s&&(this._$AH=e);else{const o=e;let a,r;for(e=n[0],a=0;a<n.length-1;a++)r=X(this,o[i+a],t,a),r===B&&(r=this._$AH[a]),s||=!N(r)||r!==this._$AH[a],r===W?e=W:e!==W&&(e+=(r??"")+n[a+1]),this._$AH[a]=r}s&&!o&&this.j(e)}j(e){e===W?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class te extends ee{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===W?void 0:e}}class ie extends ee{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==W)}}class oe extends ee{constructor(e,t,i,o,n){super(e,t,i,o,n),this.type=5}_$AI(e,t=this){if((e=X(this,e,t,0)??W)===B)return;const i=this._$AH,o=e===W&&i!==W||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,n=e!==W&&(i===W||o);o&&this.element.removeEventListener(this.name,this,i),n&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class ne{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){X(this,e)}}const se=x.litHtmlPolyfillSupport;se?.(G,Q),(x.litHtmlVersions??=[]).push("3.3.2");const ae=globalThis;let re=class extends w{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,i)=>{const o=i?.renderBefore??t;let n=o._$litPart$;if(void 0===n){const e=i?.renderBefore??null;o._$litPart$=n=new Q(t.insertBefore(P(),e),e,void 0,i??{})}return n._$AI(e),n})(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return B}};re._$litElement$=!0,re.finalized=!0,ae.litElementHydrateSupport?.({LitElement:re});const de=ae.litElementPolyfillSupport;de?.({LitElement:re}),(ae.litElementVersions??=[]).push("4.2.2");const le={attribute:!0,type:String,converter:v,reflect:!1,hasChanged:b},ce=(e=le,t,i)=>{const{kind:o,metadata:n}=i;let s=globalThis.litPropertyMetadata.get(n);if(void 0===s&&globalThis.litPropertyMetadata.set(n,s=new Map),"setter"===o&&((e=Object.create(e)).wrapped=!0),s.set(i.name,e),"accessor"===o){const{name:o}=i;return{set(i){const n=t.get.call(this);t.set.call(this,i),this.requestUpdate(o,n,e,!0,i)},init(t){return void 0!==t&&this.C(o,void 0,e,t),t}}}if("setter"===o){const{name:o}=i;return function(i){const n=this[o];t.call(this,i),this.requestUpdate(o,n,e,!0,i)}}throw Error("Unsupported decorator location: "+o)};function he(e){return(t,i)=>"object"==typeof i?ce(e,t,i):((e,t,i)=>{const o=t.hasOwnProperty(i);return t.constructor.createProperty(i,e),o?Object.getOwnPropertyDescriptor(t,i):void 0})(e,t,i)}function pe(e){return he({...e,state:!0,attribute:!1})}function ue(e,t){customElements.get(e)||customElements.define(e,t)}const _e=(e,t,i,o)=>{o=o||{},i=null==i?{}:i;const n=new Event(t,{bubbles:void 0===o.bubbles||o.bubbles,cancelable:Boolean(o.cancelable),composed:void 0===o.composed||o.composed});return n.detail=i,e.dispatchEvent(n),n};const me={en:{card:{error:{no_entity:"Please define at least one entity"},button:{add_chore:"Add chore",edit:"Edit",skip:"Skip",skipping:"Skipping...",complete:"Complete",completing:"Completing...",uncomplete:"Uncomplete",uncompleting:"Uncompleting...",cancel:"Cancel"},state:{loading:"Loading...",no_chores:"No chores"},show_all:{fewer:"Show fewer",more_one:"Show all ({count} more)",more_other:"Show all ({count} more)"},section:{overdue:"Overdue",due:"Due",pending:"Upcoming",completed:"Completed"},status:{overdue:"Overdue",due:"Due",pending:"Pending",completed:"Completed"},upcoming:{upcoming:"Upcoming",pending:"Pending",due:"Due"},time:{overdue_by:"Overdue by {duration}",in:"in {duration}",today:"Today {time}",yesterday:"Yesterday {time}"},detail:{done:"Done {time}",last_done:"Last done: {time}",missed:"{count} missed: {dates}",missed_ellipsis:"…, ",upcoming:"{label}: {date}",tag:"Tag: {name}",skip_tooltip:"Tap to skip to the next occurrence, hold to pick a date",complete_tooltip:"Tap to complete now, hold to set time and person",due_in:"Due in {duration}"},complete:{title:"Complete {name}",completed_at:"Completed at:",completed_by:"Completed by:"},skip:{title:"Skip {name}",until:"Skip until:"},freq:{daily:"Daily",every_n_days:"Every {n} days",weekly:"Weekly",every_n_weeks:"Every {n} weeks",every_n_weeks_on:"Every {n} weeks on {days}",monthly:"Monthly",every_n_months:"Every {n} months",annually:"Annually",every_n_years:"Every {n} years"},interval:{every_minutely:"Every minute",every_n_minutely:"Every {n} minutes",every_hourly:"Every hour",every_n_hourly:"Every {n} hours",every_daily:"Every day",every_n_daily:"Every {n} days",every_weekly:"Every week",every_n_weekly:"Every {n} weeks",every_monthly:"Every month",every_n_monthly:"Every {n} months",every_yearly:"Every year",every_n_yearly:"Every {n} years"},schedule:{at:"At {time}",at_time:"{base} at {time}",on_the:"{lead} on the {phrase}",yearly_in_months:"{base} in {months}",yearly_on:"{base} on the {phrase}",last_day:"last day",with_season:"{text}, {window}",with_until:"{text}, until {date}",with_times_one:"{text}, {count} time",with_times_other:"{text}, {count} times",unscheduled:"Unscheduled"},position:{1:"first",2:"second",3:"third",4:"fourth",5:"fifth","-1":"last","-2":"second-to-last","-3":"third-to-last",nth_to_last:"{ordinal}-to-last"},ordinal:{one:"{n}st",two:"{n}nd",few:"{n}rd",other:"{n}th"},edit:{title_new:"New chore",title_edit:"Edit chore",delete:"Delete",confirm_delete:"Confirm delete",save:"Save",create:"Create",saving:"Saving...",clear_end_date:"Clear end date",start_row:"Start:",due_row:"Due:",repeat:"Repeat",frequency:"Frequency",repeat_every:"Repeat every",repeat_after:"Repeat after",monthly_on_day:"Monthly on the {ordinal}",monthly_on_weekday:"Monthly on the {position} {weekday}",field:{list:"List",name:"Name",description:"Description",type:"Type",start:"Start",repeat_on:"Repeat on",repeat_monthly:"Repeat monthly",only_in_months:"Only in months",due:"Due",until:"Until (end date)",count:"Or after N times",keep:"Keep when finished",pending_period:"Pending period",grace_period:"Grace period",trigger:"Trigger tag",assigned_to:"Assigned to"},type:{scheduled:"Scheduled",interval:"Interval",oneshot:"One-time"},freq:{minutely:"Minutely",hourly:"Hourly",daily:"Daily",weekly:"Weekly",monthly:"Monthly",yearly:"Yearly"},unit:{minutes:"minutes",hours:"hours",days:"days",weeks:"weeks",months:"months",years:"years"},err:{name_required:"Name is required.",until_and_count:"Set either an end date or a count, not both.",choose_list:"Choose a list.",no_target:"No target list available."}}},editor:{section:{entities:"Entities"},entity:{new_name:"New entity"},button:{remove_entity:"Remove",remove_entity_title:"Remove entity",add_entity:"Add entity",add_another_entity:"Add another entity"},field:{title:"Title",color:"List color",update_interval:"Update interval (seconds)",tap_action:"Tap action",hold_action:"Hold action",double_tap_action:"Double-tap action",exclude:"Exclude statuses",due_date_period:"Due-date period",completed_period:"Completed period"},option:{hide_completed:"Hide completed section",hide_section_headers:"Hide section headings",hide_card_background:"Hide card background",allow_uncomplete:"Allow uncomplete",hide_add_button:"Hide add button",hide_edit_button:"Hide edit button",hide_show_all:"Hide show-all toggle"},action:{details:"Chore Details",edit:"Edit Chore",complete:"Complete Chore",more_info:"More Info",navigate:"Navigate",url:"URL",call_service:"Call Service",none:"None"},placeholder:{days:"days",hours:"hours"}}},it:{card:{error:{no_entity:"Definisci almeno un'entità"},button:{add_chore:"Aggiungi faccenda",edit:"Modifica",skip:"Salta",skipping:"Salto...",complete:"Completa",completing:"Completamento...",uncomplete:"Annulla completamento",uncompleting:"Annullamento...",cancel:"Annulla"},state:{loading:"Caricamento...",no_chores:"Nessuna faccenda"},show_all:{fewer:"Mostra meno",more_one:"Mostra tutte (altra {count})",more_many:"Mostra tutte (altre {count})",more_other:"Mostra tutte (altre {count})"},section:{overdue:"In ritardo",due:"Da fare",pending:"In arrivo",completed:"Completate"},status:{overdue:"In ritardo",due:"Da fare",pending:"In attesa",completed:"Completata"},upcoming:{upcoming:"In arrivo",pending:"In attesa",due:"Da fare"},time:{overdue_by:"In ritardo di {duration}",in:"tra {duration}",today:"Oggi {time}",yesterday:"Ieri {time}"},detail:{done:"Fatto {time}",last_done:"Ultima volta: {time}",missed:"{count} mancate: {dates}",missed_ellipsis:"…, ",upcoming:"{label}: {date}",tag:"Tag: {name}",skip_tooltip:"Tocca per saltare alla prossima ricorrenza, tieni premuto per scegliere una data",complete_tooltip:"Tocca per completare ora, tieni premuto per impostare ora e persona",due_in:"Da fare tra {duration}"},complete:{title:"Completa {name}",completed_at:"Completata alle:",completed_by:"Completata da:"},skip:{title:"Salta {name}",until:"Salta fino a:"},freq:{daily:"Giornaliera",every_n_days:"Ogni {n} giorni",weekly:"Settimanale",every_n_weeks:"Ogni {n} settimane",every_n_weeks_on:"Ogni {n} settimane il {days}",monthly:"Mensile",every_n_months:"Ogni {n} mesi",annually:"Annuale",every_n_years:"Ogni {n} anni"},interval:{every_minutely:"Ogni minuto",every_n_minutely:"Ogni {n} minuti",every_hourly:"Ogni ora",every_n_hourly:"Ogni {n} ore",every_daily:"Ogni giorno",every_n_daily:"Ogni {n} giorni",every_weekly:"Ogni settimana",every_n_weekly:"Ogni {n} settimane",every_monthly:"Ogni mese",every_n_monthly:"Ogni {n} mesi",every_yearly:"Ogni anno",every_n_yearly:"Ogni {n} anni"},schedule:{at:"Alle {time}",at_time:"{base} alle {time}",on_the:"{lead}: {phrase}",yearly_in_months:"{base} in {months}",yearly_on:"{base}: {phrase}",last_day:"ultimo giorno",with_season:"{text}, {window}",with_until:"{text}, fine: {date}",with_times_one:"{text}, {count} volta",with_times_many:"{text}, {count} volte",with_times_other:"{text}, {count} volte",unscheduled:"Non programmata"},position:{1:"primo",2:"secondo",3:"terzo",4:"quarto",5:"quinto","-1":"ultimo","-2":"penultimo","-3":"terzultimo",nth_to_last:"{ordinal} dal fondo"},ordinal:{many:"{n}°",other:"{n}°"},edit:{title_new:"Nuova faccenda",title_edit:"Modifica faccenda",delete:"Elimina",confirm_delete:"Conferma eliminazione",save:"Salva",create:"Crea",saving:"Salvataggio...",clear_end_date:"Cancella data di fine",start_row:"Inizio:",due_row:"Scadenza:",repeat:"Ripeti",frequency:"Frequenza",repeat_every:"Ripeti ogni",repeat_after:"Ripeti dopo",monthly_on_day:"Mensile: {ordinal}",monthly_on_weekday:"Mensile: {position} {weekday}",field:{list:"Lista",name:"Nome",description:"Descrizione",type:"Tipo",start:"Inizio",repeat_on:"Ripeti nei giorni",repeat_monthly:"Ripeti mensilmente",only_in_months:"Solo nei mesi",due:"Scadenza",until:"Fino a (data di fine)",count:"O dopo N volte",keep:"Mantieni al termine",pending_period:"Periodo di attesa",grace_period:"Periodo di tolleranza",trigger:"Tag di attivazione",assigned_to:"Assegnata a"},type:{scheduled:"Programmata",interval:"A intervallo",oneshot:"Singola"},freq:{minutely:"Al minuto",hourly:"Oraria",daily:"Giornaliera",weekly:"Settimanale",monthly:"Mensile",yearly:"Annuale"},unit:{minutes:"minuti",hours:"ore",days:"giorni",weeks:"settimane",months:"mesi",years:"anni"},err:{name_required:"Il nome è obbligatorio.",until_and_count:"Imposta una data di fine oppure un conteggio, non entrambi.",choose_list:"Scegli una lista.",no_target:"Nessuna lista di destinazione disponibile."}}},editor:{section:{entities:"Entità"},entity:{new_name:"Nuova entità"},button:{remove_entity:"Rimuovi",remove_entity_title:"Rimuovi entità",add_entity:"Aggiungi entità",add_another_entity:"Aggiungi un'altra entità"},field:{title:"Titolo",color:"Colore lista",update_interval:"Intervallo di aggiornamento (secondi)",tap_action:"Azione tocco",hold_action:"Azione pressione",double_tap_action:"Azione doppio tocco",exclude:"Escludi stati",due_date_period:"Periodo di scadenza",completed_period:"Periodo completati"},option:{hide_completed:"Nascondi sezione completate",hide_section_headers:"Nascondi intestazioni di sezione",hide_card_background:"Nascondi sfondo scheda",allow_uncomplete:"Permetti annullamento",hide_add_button:"Nascondi pulsante aggiungi",hide_edit_button:"Nascondi pulsante modifica",hide_show_all:"Nascondi pulsante mostra tutte"},action:{details:"Dettagli faccenda",edit:"Modifica faccenda",complete:"Completa faccenda",more_info:"Maggiori info",navigate:"Naviga",url:"URL",call_service:"Chiama servizio",none:"Nessuna"},placeholder:{days:"giorni",hours:"ore"}}}};function ge(e){return e?.locale?.language||e?.language||"en"}function ye(e,t){const i=t.split(".").reduce((e,t)=>e&&"object"==typeof e?e[t]:void 0,e);return"string"==typeof i?i:void 0}function fe(e,t){return t?e.replace(/\{(\w+)\}/g,(e,i)=>null!=t[i]?String(t[i]):`{${i}}`):e}function ve(e,t,i){const o=ge(e),n=[o,o.split("-")[0],"en"];let s;for(const e of n)if(s=ye(me[e],t),null!=s)break;return null==s&&(s=ye(me.en,t)??t),fe(s,i)}function be(e,t){const i=ge(e);for(const e of new Set([i,i.split("-")[0]])){const i=ye(me[e],t);if(null!=i)return i}}function $e(e,t,i,o,n){const s={count:i,...n??{}},a=new Intl.PluralRules(ge(e),{type:o}).select(i),r="ordinal"===o?`${t}.${a}`:`${t}_${a}`,d="ordinal"===o?`${t}.other`:`${t}_other`;return fe(be(e,r)??be(e,d)??ye(me.en,r)??ye(me.en,d)??r,s)}function we(e,t,i,o){return $e(e,t,i,"cardinal",o)}function xe(e,t){const i=e?.localize?.(`component.chore_calendar.entity.sensor.chore_status.state.${t}`);return i&&""!==i?i:ve(e,`card.status.${t}`)}const ke=["blue","red","amber","green","orange","cyan","purple","pink"],Ce=new Set(["primary","accent","red","pink","purple","deep-purple","indigo","blue","light-blue","cyan","teal","green","light-green","lime","yellow","amber","orange","deep-orange","brown","light-grey","grey","dark-grey","blue-grey","black","white"]);function Se(e){return Ce.has(e)?`var(--${e}-color)`:e}const Ae={overdue:0,due:1,pending:2,completed:3};const Ee=6e4,De=36e5,Te=864e5;function Oe(e){if(!e)return null;const t=(e.days??0)*Te+(e.hours??0)*De+(e.minutes??0)*Ee+1e3*(e.seconds??0);return t>0?t:null}const Pe={sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6};function Ne(e,t,i="long"){const o=Pe[t];return null==o?t:new Intl.DateTimeFormat(ge(e),{weekday:i}).format(new Date(2021,7,1+o))}function Ue(e,t,i="short"){return new Intl.DateTimeFormat(ge(e),{month:i}).format(new Date(2e3,t-1,1))}function Me(e,t){const i=Math.abs(e);let o,n;return i<De?(o=Math.max(1,Math.round(i/Ee)),n="minute"):i<Te?(o=Math.round(i/De),n="hour"):(o=Math.round(i/Te),n="day"),new Intl.NumberFormat(ge(t),{style:"unit",unit:n,unitDisplay:"long"}).format(o)}function He(e){const t=e=>String(e).padStart(2,"0");return`${e.getFullYear()}-${t(e.getMonth()+1)}-${t(e.getDate())} ${t(e.getHours())}:${t(e.getMinutes())}:${t(e.getSeconds())}`}function Ie(e){const t=String(e??"").trim();if(!t)return;const i=new Date(t.replace(" ","T"));return Number.isNaN(i.getTime())?void 0:i.toISOString()}function qe(e){const t=e?.locale?.time_format;if("12"===t)return!0;if("24"===t)return!1;const i="system"===t?void 0:ge(e);return new Intl.DateTimeFormat(i,{hour:"numeric"}).resolvedOptions().hour12??!1}function ze(e){return new Date(e.getFullYear(),e.getMonth(),e.getDate()).getTime()}function Le(e,t,i){const o=ge(i),n=new Date(e),s=Math.round((ze(t)-ze(n))/Te);if(0===s||1===s){return ve(i,0===s?"card.time.today":"card.time.yesterday",{time:new Intl.DateTimeFormat(o,{hour:"numeric",minute:"2-digit",hour12:qe(i)}).format(n)})}return s<7?new Intl.DateTimeFormat(o,{weekday:"long"}).format(n):new Intl.DateTimeFormat(o,{month:"short",day:"numeric"}).format(n)}function Re(e,t,i){const o=new Date(e);return new Intl.DateTimeFormat(ge(i),{month:"short",day:"numeric",...o.getFullYear()!==t.getFullYear()?{year:"numeric"}:{}}).format(o)}function je(e,t,i){if(!e.upcoming_due)return ve(i,"card.upcoming.upcoming");const o="object"==typeof e.schedule&&null!==e.schedule?e.schedule:{},n=Number(o.pending_period_mins??0),s=new Date(e.upcoming_due).getTime();return t.getTime()<s-n*Ee?ve(i,"card.upcoming.upcoming"):t.getTime()<s?ve(i,"card.upcoming.pending"):ve(i,"card.upcoming.due")}function Fe(e,t,i){switch(e.status){case"overdue":if(e.next_due){const o="object"==typeof e.schedule&&null!==e.schedule?Number(e.schedule.grace_period_mins??0):0,n=new Date(e.next_due).getTime()+o*Ee,s=t.getTime()-n;return s>0?ve(i,"card.time.overdue_by",{duration:Me(s,i)}):xe(i,"overdue")}return xe(i,"overdue");case"due":return xe(i,"due");case"pending":if(e.next_due){const o=new Date(e.next_due).getTime()-t.getTime();return o>0?ve(i,"card.time.in",{duration:Me(o,i)}):xe(i,"pending")}return xe(i,"pending");case"completed":return""}}function Be(e,t){const i=Array.isArray(e)?e.map(Number).filter(e=>e>=1&&e<=12):[],o=new Set(i);if(0===o.size||o.size>=12)return"";const n=e=>(e-1+12)%12+1,s=[...o].filter(e=>!o.has(n(e-1)));if(1===s.length&&o.size>1){let e=s[0];for(;o.has(n(e+1));)e=n(e+1);return`${Ue(t,s[0],"short")}–${Ue(t,e,"short")}`}return[...o].sort((e,t)=>e-t).map(e=>Ue(t,e,"short")).join(", ")}function We(e,t,i=!1){return new Intl.DateTimeFormat(ge(t),{month:"short",day:"numeric",year:"numeric",...i?{timeZone:"UTC"}:{}}).format(e)}function Ve(e,t,i,o,n){t&&(e=ve(n,"card.schedule.with_season",{text:e,window:t})),i&&(e=ve(n,"card.schedule.with_until",{text:e,date:i}));const s=Number(o??0);return s>0?we(n,"card.schedule.with_times",s,{text:e}):e}function Ye(e){return Array.isArray(e)?e.map(Number):null!=e?[Number(e)]:[]}function Ke(e){return(Array.isArray(e)?e:null!=e?[e]:[]).map(e=>{const t=/^([+-]?\d+)?([a-z]{3})$/.exec(String(e).toLowerCase());return t?{ordinal:t[1]?Number(t[1]):null,code:t[2]}:{ordinal:null,code:String(e)}})}function Je(e,t){const i=`card.position.${e}`,o=ve(t,i);return o!==i?o:e>0?Ge(e,t):ve(t,"card.position.nth_to_last",{ordinal:Ge(-e,t)})}function Ge(e,t){return function(e,t,i,o){return $e(e,t,i,"ordinal",o)}(t,"card.ordinal",e,{n:e})}function Xe(e,t,i){const o=e=>Ne(i,e);return t.length?`${t.map(e=>Je(e,i)).join(", ")} ${e.map(e=>o(e.code)).join(", ")}`:e.some(e=>null!=e.ordinal)?e.map(e=>null!=e.ordinal?`${Je(e.ordinal,i)} ${o(e.code)}`:o(e.code)).join(", "):e.map(e=>o(e.code)).join(", ")}function Ze(e,t,i){const o=function(e,t){const i=e.split(":").map(Number);if(i.length<2||i.some(Number.isNaN))return e;const o=new Date;return o.setHours(i[0],i[1],0,0),new Intl.DateTimeFormat(ge(t),{hour:"numeric",minute:"2-digit",hour12:qe(t)}).format(o)}(String(t??""),i);if(!e?.frequency)return`${String(t??"")}`.trim()?ve(i,"card.schedule.at",{time:o}):"";const n=e.frequency,s=Number(e.interval??1),a=Ke(e.byday),r=Ye(e.bysetpos),d=Ye(e.bymonthday),l=Ye(e.bymonth),c=e=>e.map(e=>-1===e?ve(i,"card.schedule.last_day"):Ge(e,i)).join(", ");let h;if("daily"===n)h=1===s?ve(i,"card.freq.daily"):ve(i,"card.freq.every_n_days",{n:s});else if("weekly"===n)if(1===s&&7===new Set(a.map(e=>e.code)).size)h=ve(i,"card.freq.daily");else if(a.length){const e=a.map(e=>Ne(i,e.code)).join(", ");h=1===s?e:ve(i,"card.freq.every_n_weeks_on",{n:s,days:e})}else h=1===s?ve(i,"card.freq.weekly"):ve(i,"card.freq.every_n_weeks",{n:s});else if("monthly"===n){const e=1===s?ve(i,"card.freq.monthly"):ve(i,"card.freq.every_n_months",{n:s});if(a.length){const t=Xe(a,r,i);h=1===s?(p=t).charAt(0).toUpperCase()+p.slice(1):ve(i,"card.schedule.on_the",{lead:e,phrase:t})}else if(d.length){const t=c(d);h=ve(i,"card.schedule.on_the",{lead:e,phrase:t})}else h=e}else if("yearly"===n){let e=1===s?ve(i,"card.freq.annually"):ve(i,"card.freq.every_n_years",{n:s});if(l.length){const t=l.map(e=>Ue(i,e,"short")).join(", ");e=ve(i,"card.schedule.yearly_in_months",{base:e,months:t})}a.length?e=ve(i,"card.schedule.yearly_on",{base:e,phrase:Xe(a,r,i)}):d.length&&(e=ve(i,"card.schedule.yearly_on",{base:e,phrase:c(d)})),h=e}else h=n;var p;const u="yearly"!==n?Be(l,i):"",_=e.until?We(new Date(String(e.until)),i):"";return Ve(ve(i,"card.schedule.at_time",{base:h,time:o}),u,_,e.count,i)}function Qe(e,t,i){if("string"==typeof e)return e;if("rrule"in e)return Ze(t,e.time,i);if("freq"in e)return function(e,t){const i=String(e.freq),o=Number(e.interval??1);return Ve(1===o?ve(t,`card.interval.every_${i}`):ve(t,`card.interval.every_n_${i}`,{n:o}),Be(e.bymonth,t),e.until?We(new Date(String(e.until)),t):"",e.count,t)}(e,i);if("due_datetime"in e){const t=e.due_datetime;if(!t)return ve(i,"card.schedule.unscheduled");const o=new Date(t);return`${new Intl.DateTimeFormat(ge(i),{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:qe(i)}).format(o)}`}return JSON.stringify(e)}function et(e){return void 0!==e&&"none"!==e.action}class tt extends re{constructor(){super(...arguments),this.assignedTo=[]}render(){return 0===this.assignedTo.length?W:this.assignedTo.map(e=>{const t=this.hass?.states?.[e],i=t?.attributes?.friendly_name??e.split(".").pop()??e,o=t?.attributes?.entity_picture,n=t?.attributes?.icon;return o?F`<span class="avatar" title=${i} style="background-image: url('${o}')"></span>`:n?F`
          <span class="icon" title=${i}>
            <ha-icon .icon=${n}></ha-icon>
          </span>
        `:F`<span class="avatar initial" title=${i}>${i.charAt(0).toUpperCase()}</span>`})}}tt.styles=a`
    :host {
      display: flex;
      flex-shrink: 0;
      align-items: center;
    }

    .avatar {
      box-sizing: border-box;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background-size: cover;
      background-position: center;
      /* Card-background ring separates overlapping avatars in a stack. */
      border: 2px solid var(--card-background-color, var(--ha-card-background, white));
    }

    .avatar + .avatar {
      margin-left: -7px;
    }

    .initial {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--border-color, var(--primary-color, #03a9f4));
      color: var(--text-primary-color, white);
      font-size: 10px;
      font-weight: 500;
      line-height: 1;
    }

    /* Icon fallback: bare icon, no photo-style disc. */
    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      color: var(--border-color, var(--primary-color, #03a9f4));
      --mdc-icon-size: 18px;
    }

    .icon ha-icon {
      display: flex;
      line-height: 0;
    }
  `,e([he({attribute:!1})],tt.prototype,"hass",void 0),e([he({attribute:!1})],tt.prototype,"assignedTo",void 0),ue("chore-assignees",tt);const it=e=>(...t)=>({_$litDirective$:e,values:t});class ot{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,i){this._$Ct=e,this._$AM=t,this._$Ci=i}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}}const nt="ontouchstart"in window||navigator.maxTouchPoints>0;class st extends HTMLElement{constructor(){super(...arguments),this.holdTime=500,this.held=!1,this.cancelled=!1}connectedCallback(){Object.assign(this.style,{position:"fixed",width:nt?"100px":"50px",height:nt?"100px":"50px",transform:"translate(-50%, -50%) scale(0)",pointerEvents:"none",zIndex:"999",background:"var(--primary-color)",display:null,opacity:"0.2",borderRadius:"50%",transition:"transform 180ms ease-in-out"}),["touchcancel","mouseout","mouseup","touchmove","mousewheel","wheel","scroll"].forEach(e=>{document.addEventListener(e,()=>{this.cancelled=!0,this.timer&&(this._stopAnimation(),clearTimeout(this.timer),this.timer=void 0)},{passive:!0})})}bind(e,t={}){e.actionHandler&&JSON.stringify(t)===JSON.stringify(e.actionHandler.options)||(e.actionHandler?(e.removeEventListener("touchstart",e.actionHandler.start),e.removeEventListener("touchend",e.actionHandler.end),e.removeEventListener("touchcancel",e.actionHandler.end),e.removeEventListener("mousedown",e.actionHandler.start),e.removeEventListener("click",e.actionHandler.end),e.removeEventListener("keydown",e.actionHandler.handleKeyDown)):e.addEventListener("contextmenu",e=>{const t=e||window.event;return t.preventDefault&&t.preventDefault(),t.stopPropagation&&t.stopPropagation(),!1}),e.actionHandler={options:t},t.disabled||(e.actionHandler.start=e=>{let i,o;this.cancelled=!1,e.touches?(i=e.touches[0].clientX,o=e.touches[0].clientY):(i=e.clientX,o=e.clientY),t.hasHold&&(this.held=!1,this.timer=window.setTimeout(()=>{this._startAnimation(i,o),this.held=!0},this.holdTime))},e.actionHandler.end=e=>{if("touchcancel"===e.type||"touchend"===e.type&&this.cancelled)return;const i=e.target;e.cancelable&&e.preventDefault(),t.hasHold&&(clearTimeout(this.timer),this._stopAnimation(),this.timer=void 0),t.hasHold&&this.held?_e(i,"action",{action:"hold"}):t.hasDoubleClick?"click"===e.type&&e.detail<2||!this.dblClickTimeout?this.dblClickTimeout=window.setTimeout(()=>{this.dblClickTimeout=void 0,_e(i,"action",{action:"tap"})},250):(clearTimeout(this.dblClickTimeout),this.dblClickTimeout=void 0,_e(i,"action",{action:"double_tap"})):_e(i,"action",{action:"tap"})},e.actionHandler.handleKeyDown=e=>{["Enter"," "].includes(e.key)&&e.currentTarget.actionHandler.end(e)},e.addEventListener("touchstart",e.actionHandler.start,{passive:!0}),e.addEventListener("touchend",e.actionHandler.end),e.addEventListener("touchcancel",e.actionHandler.end),e.addEventListener("mousedown",e.actionHandler.start,{passive:!0}),e.addEventListener("click",e.actionHandler.end),e.addEventListener("keydown",e.actionHandler.handleKeyDown)))}_startAnimation(e,t){Object.assign(this.style,{left:`${e}px`,top:`${t}px`,transform:"translate(-50%, -50%) scale(1)"})}_stopAnimation(){Object.assign(this.style,{left:null,top:null,transform:"translate(-50%, -50%) scale(0)"})}}const at=(e,t)=>{const i=(()=>{const e=document.body;if(e.querySelector("action-handler"))return e.querySelector("action-handler");customElements.get("action-handler")||customElements.define("action-handler",st);const t=document.createElement("action-handler");return e.appendChild(t),t})();i&&i.bind(e,t)},rt=it(class extends ot{update(e,[t]){return at(e.element,t),B}render(e){}}),dt={overdue:"✗",due:"●",pending:"○",completed:"✓"};class lt extends re{render(){const e=new Date,t=Fe(this.item,e,this.hass);return F`
      <div
        class="chore"
        part="chore"
        style="--border-color: ${Se(this.item.source_color)}"
        ${rt({hasHold:et(this.holdAction),hasDoubleClick:et(this.doubleTapAction)})}
        @action=${this._handleAction}
      >
        <span class="status-indicator">${dt[this.item.status]}</span>
        <span class="name">${this.item.chore_name}</span>
        ${this.item.assigned_to.length>0?F`<chore-assignees part="assignees" .hass=${this.hass} .assignedTo=${this.item.assigned_to}></chore-assignees>`:W}
        <span class="time">${t}</span>
      </div>
    `}_handleAction(e){let t;switch(e.detail.action){case"tap":t=this.tapAction;break;case"hold":t=this.holdAction;break;case"double_tap":t=this.doubleTapAction}!async function(e,t,i,o){if(i&&"none"!==i.action)switch(i.action){case"details":_e(e,"chore-detail",{item:o});break;case"edit":_e(e,"chore-edit",{item:o});break;case"complete":try{await t.callWS({type:"call_service",domain:"chore_calendar",service:"complete_item",service_data:{entity_id:o.source_entity,item:o.uid}}),_e(e,"chore-completed",{item:o})}catch(e){console.error("chore-calendar-card: failed to complete chore",e)}break;default:_e(e,"hass-action",{config:{entity:o.source_entity,tap_action:i,hold_action:i,double_tap_action:i},action:"tap"})}}(this,this.hass,t,this.item)}connectedCallback(){super.connectedCallback(),this._syncStatusAttribute()}updated(){this._syncStatusAttribute()}_syncStatusAttribute(){this.setAttribute("status",this.item.status)}}lt.styles=a`
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
  `,e([he({attribute:!1})],lt.prototype,"hass",void 0),e([he({attribute:!1})],lt.prototype,"item",void 0),e([he({attribute:!1})],lt.prototype,"tapAction",void 0),e([he({attribute:!1})],lt.prototype,"holdAction",void 0),e([he({attribute:!1})],lt.prototype,"doubleTapAction",void 0),ue("chore-row",lt);const ct=it(class extends ot{update(e,[t]){return function(e,t){if(e._holdAction)return void(e._holdAction.options=t);const i={options:t,fired:!1};e._holdAction=i;const o=()=>{void 0!==i.timer&&(clearTimeout(i.timer),i.timer=void 0)};e.addEventListener("pointerdown",e=>{!i.options.disabled&&e.isPrimary&&0===e.button&&(i.fired=!1,o(),i.timer=window.setTimeout(()=>{i.timer=void 0,i.fired=!0,i.options.hold()},500))});for(const t of["pointerup","pointercancel","pointerleave"])e.addEventListener(t,o);e.addEventListener("touchend",e=>{i.fired&&e.cancelable&&e.preventDefault()}),e.addEventListener("click",e=>{if(!i.options.disabled)return i.fired?(i.fired=!1,e.preventDefault(),void e.stopPropagation()):void i.options.tap()}),e.addEventListener("contextmenu",e=>e.preventDefault())}(e.element,t),B}render(e){}}),ht={overdue:"✗",due:"●",pending:"○",completed:"✓"},pt="chore_calendar";class ut extends re{constructor(){super(...arguments),this.open=!1,this.allowUncomplete=!1,this.allowEdit=!0,this._loading=!1}render(){if(!this.item)return W;const e="completed"===this.item.status,t=!e||this.allowUncomplete&&!!this.item.last_completed,i=this.allowEdit||t;return F`
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
        <span slot="headerTitle" part="title">${this.item.chore_name}</span>
        <div class="content" part="content">
          ${this._renderDetails()}
        </div>
        ${i?F`
              <div slot="footer" class="footer" part="footer">
                ${this.allowEdit?F`
                      <ha-button variant="neutral" appearance="plain" @click=${this._onEdit}>
                        ${ve(this.hass,"card.button.edit")}
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
                            ${this._loading?ve(this.hass,"card.button.uncompleting"):ve(this.hass,"card.button.uncomplete")}
                          </ha-button>
                        `:W:F`
                        <ha-button
                          variant="neutral"
                          appearance="plain"
                          ?disabled=${this._loading}
                          title=${ve(this.hass,"card.detail.skip_tooltip")}
                          ${ct({tap:()=>this._onSkip(),hold:()=>this._openSkipDialog(),disabled:this._loading})}
                        >
                          ${this._loading?ve(this.hass,"card.button.skipping"):ve(this.hass,"card.button.skip")}
                        </ha-button>
                        <ha-button
                          ?disabled=${this._loading}
                          title=${ve(this.hass,"card.detail.complete_tooltip")}
                          ${ct({tap:()=>this._onComplete(),hold:()=>this._openCompleteDialog(),disabled:this._loading})}
                        >
                          ${this._loading?ve(this.hass,"card.button.completing"):ve(this.hass,"card.button.complete")}
                        </ha-button>
                      `}
                </span>
              </div>
            `:W}
      </ha-dialog>
    `}_renderDetails(){const{item:e}=this;if(!e)return W;const t=new Date;return F`
      ${this._renderStatus(e,t)}

      <div class="meta" part="meta">
        ${this._renderListRow()}

        <div class="schedule" part="schedule">
          <ha-icon icon="mdi:calendar-clock"></ha-icon>
          <div class="info">${Qe(e.schedule,e.selector,this.hass)}</div>
          ${e.assigned_to.length>0?F`
                <chore-assignees
                  part="assignees"
                  style="--border-color: ${Se(e.source_color)}"
                  .hass=${this.hass}
                  .assignedTo=${e.assigned_to}
                ></chore-assignees>
              `:W}
        </div>

        ${e.trigger_entity?F`
              <div class="context" part="trigger">
                <span>${ve(this.hass,"card.detail.tag",{name:this._resolveEntityName(e.trigger_entity)})}</span>
              </div>
            `:W}
      </div>

      ${e.description?F`<div class="description" part="description">${e.description}</div>`:W}
    `}_renderStatus(e,t){const i="completed"===e.status&&!!e.last_completed,o=Fe(e,t,this.hass),n=i?ve(this.hass,"card.detail.done",{time:Le(e.last_completed,t,this.hass)}):function(e,t){return"pending"===e.status&&!!e.next_due&&new Date(e.next_due).getTime()>t.getTime()}(e,t)?function(e,t,i){return ve(i,"card.detail.due_in",{duration:Me(new Date(e.next_due).getTime()-t.getTime(),i)})}(e,t,this.hass):o;return F`
      <div class="status ${e.status}" part="status status-${e.status}">
        <span class="glyph">${ht[e.status]}</span>
        <div class="lines">
          <div class="headline" part="status-text">
            <span>${n}</span>
            ${i?this._renderCompletedBy(e):W}
          </div>
          ${e.last_completed&&!i?F`
                <div class="context" part="last-completed">
                  <span>${ve(this.hass,"card.detail.last_done",{time:Le(e.last_completed,t,this.hass)})}</span>
                  ${this._renderCompletedBy(e)}
                </div>
              `:W}
          ${e.missed_count>1?F`
                <div class="context" part="missed">
                  <span>${this._formatMissed(e,t)}</span>
                </div>
              `:W}
          ${e.missed_count>0&&e.upcoming_due?F`
                <div class="context" part="upcoming">
                  <span>${ve(this.hass,"card.detail.upcoming",{label:je(e,t,this.hass),date:Re(e.upcoming_due,t,this.hass)})}</span>
                </div>
              `:W}
        </div>
      </div>
    `}_formatMissed(e,t){const i=e.missed_occurrences.map(e=>Re(e,t,this.hass)),o=e.missed_count>i.length?ve(this.hass,"card.detail.missed_ellipsis"):"";return ve(this.hass,"card.detail.missed",{count:e.missed_count,dates:`${o}${i.join(", ")}`})}_renderCompletedBy(e){return e.last_completed_by?F`
      <chore-assignees
        part="completed-by"
        style="--border-color: ${Se(e.source_color)}"
        .hass=${this.hass}
        .assignedTo=${[e.last_completed_by]}
      ></chore-assignees>
    `:W}_renderListRow(){const e=this.item?.source_entity;if(!e)return W;const t=this.hass?.states?.[e],i=t?.attributes?.friendly_name??e;return F`
      <div class="list" part="list">
        <ha-state-icon .hass=${this.hass} .stateObj=${t}></ha-state-icon>
        <div class="info">${i}</div>
      </div>
    `}_openCompleteDialog(){this.item&&_e(this,"chore-complete-details",{item:this.item})}async _onComplete(){if(this.item&&!this._loading){this._loading=!0;try{await this.hass.callWS({type:"call_service",domain:pt,service:"complete_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid}}),this.dispatchEvent(new CustomEvent("chore-completed",{detail:{item:this.item},bubbles:!0,composed:!0}))}catch(e){console.error("chore-detail-dialog: failed to complete chore",e)}finally{this._loading=!1}}}_openSkipDialog(){this.item&&_e(this,"chore-skip-details",{item:this.item})}async _onSkip(){if(this.item&&!this._loading){this._loading=!0;try{await this.hass.callWS({type:"call_service",domain:pt,service:"skip_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid}}),this.dispatchEvent(new CustomEvent("chore-skipped",{detail:{item:this.item},bubbles:!0,composed:!0}))}catch(e){console.error("chore-detail-dialog: failed to skip chore",e)}finally{this._loading=!1}}}async _onUncomplete(){if(this.item&&!this._loading){this._loading=!0;try{await this.hass.callWS({type:"call_service",domain:pt,service:"uncomplete_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid}}),this.dispatchEvent(new CustomEvent("chore-uncompleted",{detail:{item:this.item},bubbles:!0,composed:!0}))}catch(e){console.error("chore-detail-dialog: failed to uncomplete chore",e)}finally{this._loading=!1}}}_resolveEntityName(e){const t=this.hass?.states?.[e];return t?.attributes?.friendly_name??e}_onEdit(){this.item&&this.dispatchEvent(new CustomEvent("chore-edit",{detail:{item:this.item},bubbles:!0,composed:!0}))}_onClosed(){this.dispatchEvent(new CustomEvent("detail-dialog-closed",{bubbles:!0,composed:!0}))}}ut.styles=a`
    ha-dialog {
      --ha-dialog-max-width: 400px;
      /* The header bar pads 8px and centers a 24px glyph in a 48px close
         button, so the X sits 20px in. Match that so the row icons line up. */
      --dialog-content-padding: 0 20px 16px;
    }

    .header_button {
      color: var(--secondary-text-color);
    }

    .content {
      padding: 0;
    }

    /* Status block: what is happening now, in the status color, with the
       missed and upcoming context beneath it for overdue chores. */
    .status {
      display: flex;
      gap: 12px;
      padding: 8px 0 12px;
      font-size: 15px;
      font-weight: 500;
    }

    .status .glyph {
      flex-shrink: 0;
      width: 20px;
      text-align: center;
      line-height: 21px;
    }

    .status .lines {
      flex: 1;
      min-width: 0;
    }

    .status .headline {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Context lines: secondary detail beneath a primary row, in the status
       block and the metadata alike. */
    .context {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      font-size: 13px;
      font-weight: 400;
      color: var(--secondary-text-color);
    }

    .context > span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status.overdue {
      color: var(--error-color);
    }

    .status.due {
      color: var(--warning-color);
    }

    .status.pending {
      color: var(--secondary-text-color);
    }

    .status.completed {
      color: var(--success-color);
    }

    /* Metadata rows: icon plus value, muted. */
    .meta > div {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 0;
    }

    .meta ha-icon,
    .meta ha-state-icon {
      flex-shrink: 0;
      color: var(--secondary-text-color);
      --mdc-icon-size: 20px;
      --ha-icon-display: inline-flex;
    }

    /* Metadata context lines indent to the text column (20px icon + 12px gap). */
    .meta .context {
      margin: -2px 0 6px 32px;
    }

    .meta .info {
      flex: 1;
      min-width: 0;
      font-size: 14px;
      color: var(--secondary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* The schedule text shrinks to its content so the assignee avatars
       follow it inline instead of being pushed to the far edge. */
    .meta .schedule .info,
    .meta .last-completed .info {
      flex: 0 1 auto;
    }

    /* Free-text description: the last details block, set off by spacing
       alone (a divider would double up with the footer border). */
    .description {
      margin-top: 12px;
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
  `,e([he({attribute:!1})],ut.prototype,"hass",void 0),e([he({attribute:!1})],ut.prototype,"item",void 0),e([he({type:Boolean})],ut.prototype,"open",void 0),e([he({type:Boolean,attribute:"allow-uncomplete"})],ut.prototype,"allowUncomplete",void 0),e([he({type:Boolean,attribute:"allow-edit"})],ut.prototype,"allowEdit",void 0),e([pe()],ut.prototype,"_loading",void 0),ue("chore-detail-dialog",ut);const _t="08:00:00",mt=a`
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
`,gt=[{name:"_t",selector:{time:{}}},{name:"_d",selector:{date:{}}}];function yt(e){const{label:t,value:i,locale:o,canClear:n=!1,onDate:s,onTime:a}=e;return F`
    <div class="datetime-label">${t}</div>
    <div class="datetime-row">
      <ha-date-input
        class="datetime-date"
        .locale=${o}
        .value=${i.slice(0,10)}
        .canClear=${n}
        @value-changed=${s}
      ></ha-date-input>
      <ha-time-input
        class="datetime-time"
        .locale=${o}
        .value=${i?i.slice(11,19)||_t:""}
        .enableSecond=${!1}
        @value-changed=${a}
      ></ha-time-input>
    </div>
  `}function ft(e,t){return`${t} ${String(e??"").slice(11,19)||_t}`}function vt(e,t){const i=5===t.length?`${t}:00`:t;return`${String(e??"").slice(0,10)||He(new Date).slice(0,10)} ${i}`}const bt="chore_calendar",$t=new Set(["daily","weekly","monthly","yearly"]),wt=["daily","weekly","monthly","yearly"],xt=["minutely","hourly","daily","weekly","monthly","yearly"],kt=["sun","mon","tue","wed","thu","fri","sat"],Ct=["mon","tue","wed","thu","fri","sat","sun"],St={target_entity:"list",chore_name:"name",description:"description",chore_type:"type",dtstart:"start",byday:"repeat_on",monthly_mode:"repeat_monthly",bymonth:"only_in_months",due_datetime:"due",until:"until",count:"count",persist:"keep",pending_period:"pending_period",grace_period:"grace_period",trigger_entity:"trigger",assigned_to:"assigned_to"},At={daily:"days",weekly:"weeks",monthly:"months"},Et={minutely:"minutes",hourly:"hours",daily:"days",weekly:"weeks",monthly:"months",yearly:"years"};class Dt extends re{constructor(){super(...arguments),this.open=!1,this.targets=[],this._data={},this._loading=!1,this._confirmDelete=!1,this._computeLabel=e=>{if("frequency"===e.name)return ve(this.hass,"scheduled"===this._data.chore_type?"card.edit.repeat":"card.edit.frequency");if("interval"===e.name)return ve(this.hass,"scheduled"===this._data.chore_type?"card.edit.repeat_every":"card.edit.repeat_after");const t=St[e.name];return t?ve(this.hass,`card.edit.field.${t}`):e.name}}willUpdate(e){if(e.has("open")||e.has("item")){const e=this.open?this.item?.uid??"create":void 0;e&&e!==this._seededFor&&(this._seededFor=e,this._data=this.item?this._dataFromItem(this.item):this._defaults(),this._error=void 0,this._confirmDelete=!1),this.open||(this._seededFor=void 0)}}_defaults(){return{chore_type:"scheduled",frequency:"daily",interval:1,dtstart:this._todayStart(),persist:!1,...this.targets.length>1?{}:{target_entity:this.defaultTarget}}}_todayStart(){const e=new Date;return e.setHours(8,0,0,0),He(e)}_parseDate(e){if(!e)return null;const t=new Date(String(e).replace(" ","T"));return Number.isNaN(t.getTime())?null:t}_datePart(e){return String(e??"").slice(0,10)}_daysInMonth(e){return new Date(e.getFullYear(),e.getMonth()+1,0).getDate()}_monthlySetpos(e){return e.getDate()+7>this._daysInMonth(e)?-1:Math.ceil(e.getDate()/7)}_monthlyOptions(){const e=this._parseDate(this._data.dtstart)??new Date,t=e.getDate(),i=this._monthlySetpos(e);return[{value:"monthday",label:ve(this.hass,"card.edit.monthly_on_day",{ordinal:Ge(t,this.hass)})},{value:"weekday",label:ve(this.hass,"card.edit.monthly_on_weekday",{position:Je(i,this.hass),weekday:Ne(this.hass,kt[e.getDay()])})}]}_dataFromItem(e){const t=e.selector??{},i="object"==typeof e.schedule&&e.schedule||{},o={chore_name:e.chore_name,description:e.description??"",chore_type:e.chore_type,trigger_entity:e.trigger_entity??void 0,assigned_to:e.assigned_to,target_entity:e.source_entity,persist:t.persist??!1,pending_period:this._minsToDuration(i.pending_period_mins),grace_period:this._minsToDuration(i.grace_period_mins)};if("oneshot"===e.chore_type)o.due_datetime=t.due_datetime??void 0;else if("interval"===e.chore_type)o.frequency=t.frequency??"daily",o.interval=t.interval??1,o.bymonth=(t.bymonth??[]).map(String),o.until=t.until?String(t.until).slice(0,10):void 0,o.count=t.count;else{o.frequency=t.frequency??"daily",o.interval=t.interval??1,o.dtstart=t.dtstart?String(t.dtstart).replace("T"," ").slice(0,19):this._todayStart();const e=Ke(t.byday);o.byday=e.map(e=>e.code);const i=e.some(e=>null!=e.ordinal);o.monthly_mode=t.bymonthday?.length?"monthday":t.bysetpos?.length||i?"weekday":"monthday",o.until=t.until?String(t.until).slice(0,10):void 0,o.count=t.count,o.__snap={byday:t.byday??[],bysetpos:t.bysetpos??[],bymonthday:t.bymonthday??[],bymonth:t.bymonth??[]},o.__dtstart0=o.dtstart,o.__mode0=o.monthly_mode}return o}_minsToDuration(e){const t=Number(e??0);if(t)return{days:Math.floor(t/1440),hours:Math.floor(t%1440/60),minutes:t%60,seconds:0}}get _scheduledFreqs(){return wt.map(e=>({value:e,label:ve(this.hass,`card.edit.freq.${e}`)}))}get _intervalFreqs(){return xt.map(e=>({value:e,label:ve(this.hass,`card.edit.freq.${e}`)}))}get _weekdayOptions(){return Ct.map(e=>({value:e,label:Ne(this.hass,e)}))}get _monthOptions(){return Array.from({length:12},(e,t)=>({value:String(t+1),label:Ue(this.hass,t+1,"long")}))}_scheduledUnit(e){return ve(this.hass,`card.edit.unit.${At[e]??"days"}`)}_intervalUnit(e){return ve(this.hass,`card.edit.unit.${Et[e]??"days"}`)}_topSchema(){const e=[];return!this.item&&this.targets.length>1&&e.push({name:"target_entity",required:!0,selector:{select:{mode:"dropdown",options:this.targets}}}),e.push({name:"chore_name",required:!0,selector:{text:{}}}),e.push({name:"description",selector:{text:{multiline:!0}}}),e.push({name:"chore_type",required:!0,selector:{select:{mode:"dropdown",options:[{value:"scheduled",label:ve(this.hass,"card.edit.type.scheduled")},{value:"interval",label:ve(this.hass,"card.edit.type.interval")},{value:"oneshot",label:ve(this.hass,"card.edit.type.oneshot")}]}}}),e}_recurrenceSchema(){const e=String(this._data.chore_type??"scheduled");return"scheduled"===e?this._scheduledSchema():"interval"===e?this._intervalSchema():[]}_tailSchema(){const e=[];return"oneshot"!==String(this._data.chore_type??"scheduled")&&e.push({name:"count",selector:{number:{min:1,mode:"box"}}}),e.push({name:"persist",selector:{boolean:{}}}),e.push({name:"pending_period",selector:{duration:{}}}),e.push({name:"grace_period",selector:{duration:{}}}),e.push({name:"trigger_entity",selector:{entity:{filter:{domain:"tag"}}}}),e.push({name:"assigned_to",selector:{entity:{multiple:!0,filter:{domain:"person"}}}}),e}_scheduledSchema(){const e=String(this._data.frequency??"daily"),t=[{name:"frequency",required:!0,selector:{select:{mode:"dropdown",options:this._scheduledFreqs}}}];return"yearly"!==e&&t.push({name:"interval",selector:{number:{min:1,mode:"box",unit_of_measurement:this._scheduledUnit(e)}}}),"weekly"===e&&t.push({name:"byday",selector:{select:{multiple:!0,mode:"list",options:this._weekdayOptions}}}),"monthly"===e&&t.push({name:"monthly_mode",selector:{select:{mode:"dropdown",options:this._monthlyOptions()}}}),t}_intervalSchema(){const e=String(this._data.frequency??"daily");return[{name:"frequency",required:!0,selector:{select:{mode:"dropdown",options:this._intervalFreqs}}},{name:"interval",selector:{number:{min:1,mode:"box",unit_of_measurement:this._intervalUnit(e)}}},{name:"bymonth",selector:{select:{multiple:!0,mode:"dropdown",options:this._monthOptions}}}]}render(){if(!this.open)return W;const e=!!this.item;return F`
      <ha-dialog .open=${this.open} @closed=${this._onClosed}>
        <ha-icon-button slot="headerNavigationIcon" data-dialog="close" class="header_button">
          <ha-icon icon="mdi:close"></ha-icon>
        </ha-icon-button>
        <span slot="headerTitle">${ve(this.hass,e?"card.edit.title_edit":"card.edit.title_new")}</span>
        <div class="content">
          ${this._error?F`<ha-alert alert-type="error">${this._error}</ha-alert>`:W}
          <ha-form
            .hass=${this.hass}
            .data=${this._data}
            .schema=${this._topSchema()}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._onValueChanged}
          ></ha-form>
          ${"scheduled"===this._data.chore_type?this._renderDateTimeRow("dtstart",ve(this.hass,"card.edit.start_row")):"oneshot"===this._data.chore_type?this._renderDateTimeRow("due_datetime",ve(this.hass,"card.edit.due_row")):W}
          <ha-form
            .hass=${this.hass}
            .data=${this._data}
            .schema=${this._recurrenceSchema()}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._onValueChanged}
          ></ha-form>
          ${"oneshot"!==this._data.chore_type?this._renderUntilRow():W}
          <ha-form
            .hass=${this.hass}
            .data=${this._data}
            .schema=${this._tailSchema()}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._onValueChanged}
          ></ha-form>
          <ha-form class="picker-loader" .hass=${this.hass} .schema=${gt} .data=${{}}></ha-form>
        </div>
        <div slot="footer" class="footer">
          <span>
            ${e?this._confirmDelete?F`<ha-button class="delete" ?disabled=${this._loading} @click=${this._onDelete}>${ve(this.hass,"card.edit.confirm_delete")}</ha-button>`:F`<ha-button class="delete" appearance="plain" @click=${()=>this._confirmDelete=!0}>${ve(this.hass,"card.edit.delete")}</ha-button>`:W}
          </span>
          <ha-button ?disabled=${this._loading} @click=${this._onSubmit}>
            ${this._loading?ve(this.hass,"card.edit.saving"):ve(this.hass,e?"card.edit.save":"card.edit.create")}
          </ha-button>
        </div>
      </ha-dialog>
    `}_renderDateTimeRow(e,t){return yt({label:t,value:String(this._data[e]??("dtstart"===e?this._todayStart():"")),locale:this.hass.locale,canClear:"due_datetime"===e,onDate:t=>this._onDatePart(e,t),onTime:t=>this._onTimePart(e,t)})}_renderUntilRow(){const e=String(this._data.until??"");return F`
      <div class="until-row">
        <ha-date-input
          class="until-date"
          .locale=${this.hass.locale}
          .label=${ve(this.hass,"card.edit.field.until")}
          .value=${e}
          .canClear=${!0}
          @value-changed=${this._onUntilChanged}
        ></ha-date-input>
        ${e?F`
              <ha-icon-button class="until-clear" title=${ve(this.hass,"card.edit.clear_end_date")} @click=${this._onUntilClear}>
                <ha-icon icon="mdi:close"></ha-icon>
              </ha-icon-button>
            `:W}
      </div>
    `}_onUntilChanged(e){this._data={...this._data,until:e.detail.value||void 0}}_onUntilClear(){this._data={...this._data,until:void 0}}_onDatePart(e,t){const i=t.detail.value;i?this._data={...this._data,[e]:ft(this._data[e],i)}:"due_datetime"===e&&(this._data={...this._data,due_datetime:void 0})}_onTimePart(e,t){const i=t.detail.value;i&&(this._data={...this._data,[e]:vt(this._data[e],i)})}_onValueChanged(e){const t=this._data,i={...e.detail.value};if("scheduled"!==i.chore_type||i.chore_type===t.chore_type||$t.has(String(i.frequency))||(i.frequency="daily"),"scheduled"!==i.chore_type||i.dtstart||(i.dtstart=this._todayStart()),"scheduled"===i.chore_type&&i.frequency!==t.frequency){if(!("weekly"!==i.frequency||Array.isArray(i.byday)&&i.byday.length)){const e=this._parseDate(i.dtstart)??new Date;i.byday=[kt[e.getDay()]]}"monthly"!==i.frequency||i.monthly_mode||(i.monthly_mode="monthday")}this._data=i}_buildPayload(){const e=this._data,t=String(e.chore_type??"scheduled"),i={chore_name:String(e.chore_name??"").trim(),description:String(e.description??"")};if(this.item?i.trigger_entity=e.trigger_entity??"":e.trigger_entity&&(i.trigger_entity=e.trigger_entity),i.assigned_to=Array.isArray(e.assigned_to)?e.assigned_to:[],this.item?(i.pending_period=e.pending_period??{},i.grace_period=e.grace_period??{}):(e.pending_period&&(i.pending_period=e.pending_period),e.grace_period&&(i.grace_period=e.grace_period)),"oneshot"===t)i.oneshot={due_datetime:e.due_datetime??null,persist:!!e.persist};else if("interval"===t){const t={frequency:e.frequency,persist:!!e.persist};t.interval=Number(e.interval??1),Array.isArray(e.bymonth)&&e.bymonth.length&&(t.bymonth=e.bymonth),this._applyLifecycle(t,e),i.interval=t}else i.scheduled=this._buildScheduledSelector(e);return i}_buildScheduledSelector(e){const t=String(e.frequency??"daily"),i={frequency:t,persist:!!e.persist};e.dtstart&&(i.dtstart=String(e.dtstart)),i.interval=Number(e.interval??1);const o=e.__snap??{},n=e=>Array.isArray(o[e])?o[e]:[];if("weekly"===t)Array.isArray(e.byday)&&e.byday.length&&(i.byday=e.byday);else if("monthly"===t){const t=this._datePart(e.dtstart)!==this._datePart(e.__dtstart0)||e.monthly_mode!==e.__mode0,o=n("byday"),s=n("bysetpos"),a=n("bymonthday");if(!t&&(o.length||s.length||a.length))"weekday"===e.monthly_mode?(o.length&&(i.byday=o),s.length&&(i.bysetpos=s)):a.length&&(i.bymonthday=a);else{const t=this._parseDate(e.dtstart)??new Date;"weekday"===e.monthly_mode?(i.byday=[kt[t.getDay()]],i.bysetpos=[this._monthlySetpos(t)]):i.bymonthday=[t.getDate()]}}else"yearly"===t&&(n("byday").length&&(i.byday=n("byday")),n("bysetpos").length&&(i.bysetpos=n("bysetpos")),n("bymonthday").length&&(i.bymonthday=n("bymonthday")));return n("bymonth").length&&(i.bymonth=n("bymonth")),this._applyLifecycle(i,e),i}_applyLifecycle(e,t){t.until?e.until=t.until:t.count&&(e.count=Number(t.count))}_validate(){const e=this._data;if(!String(e.chore_name??"").trim())return ve(this.hass,"card.edit.err.name_required");return"oneshot"!==String(e.chore_type??"scheduled")&&e.until&&e.count?ve(this.hass,"card.edit.err.until_and_count"):!this.item&&this.targets.length>1&&!e.target_entity?ve(this.hass,"card.edit.err.choose_list"):null}_target(){return this._data.target_entity??this.defaultTarget??this.item?.source_entity}async _onSubmit(){if(this._loading)return;const e=this._validate();if(e)return void(this._error=e);const t=this._target();if(t){this._loading=!0,this._error=void 0;try{const e=this._buildPayload(),i=!!this.item;await this.hass.callWS({type:"call_service",domain:bt,service:i?"update_item":"create_item",service_data:{entity_id:t,...i?{item:this.item.uid}:{},...e}}),this.dispatchEvent(new CustomEvent("chore-saved",{bubbles:!0,composed:!0})),this.open=!1}catch(e){this._error=e instanceof Error?e.message:String(e),console.error("chore-edit-dialog: save failed",e)}finally{this._loading=!1}}else this._error=ve(this.hass,"card.edit.err.no_target")}async _onDelete(){if(!this._loading&&this.item){this._loading=!0,this._error=void 0;try{await this.hass.callWS({type:"call_service",domain:bt,service:"delete_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid}}),this.dispatchEvent(new CustomEvent("chore-saved",{bubbles:!0,composed:!0})),this.open=!1}catch(e){this._error=e instanceof Error?e.message:String(e),console.error("chore-edit-dialog: delete failed",e)}finally{this._loading=!1}}}_onClosed(){this.open=!1,this.dispatchEvent(new CustomEvent("edit-dialog-closed",{bubbles:!0,composed:!0}))}}Dt.styles=a`
    ${mt}
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
  `,e([he({attribute:!1})],Dt.prototype,"hass",void 0),e([he({type:Boolean})],Dt.prototype,"open",void 0),e([he({attribute:!1})],Dt.prototype,"item",void 0),e([he({attribute:!1})],Dt.prototype,"targets",void 0),e([he({attribute:!1})],Dt.prototype,"defaultTarget",void 0),e([pe()],Dt.prototype,"_data",void 0),e([pe()],Dt.prototype,"_error",void 0),e([pe()],Dt.prototype,"_loading",void 0),e([pe()],Dt.prototype,"_confirmDelete",void 0),ue("chore-edit-dialog",Dt);const Tt=[{name:"completed_by",selector:{entity:{filter:{domain:"person"}}}}];class Ot extends re{constructor(){super(...arguments),this.open=!1,this._data={},this._loading=!1,this._computeLabel=e=>"completed_by"===e.name?ve(this.hass,"card.complete.completed_by"):e.name,this._onDatePart=e=>{const t=e.detail.value;t&&(this._data={...this._data,completed_at:ft(this._data.completed_at,t)})},this._onTimePart=e=>{const t=e.detail.value;t&&(this._data={...this._data,completed_at:vt(this._data.completed_at,t)})}}willUpdate(e){if(e.has("open")||e.has("item")){const e=this.open?this.item?.uid:void 0;e&&e!==this._seededFor&&(this._seededFor=e,this._data=this._defaults(),this._error=void 0),this.open||(this._seededFor=void 0)}}_defaults(){const e=this.item?.assigned_to??[];return{completed_at:He(new Date),...1===e.length?{completed_by:e[0]}:{}}}render(){return this.item?F`
      <ha-dialog .open=${this.open} @closed=${this._onClosed}>
        <ha-icon-button slot="headerNavigationIcon" data-dialog="close" class="header_button">
          <ha-icon icon="mdi:close"></ha-icon>
        </ha-icon-button>
        <span slot="headerTitle">${ve(this.hass,"card.complete.title",{name:this.item.chore_name})}</span>
        <div class="content">
          ${this._error?F`<ha-alert alert-type="error">${this._error}</ha-alert>`:W}
          ${yt({label:ve(this.hass,"card.complete.completed_at"),value:String(this._data.completed_at??""),locale:this.hass.locale,onDate:this._onDatePart,onTime:this._onTimePart})}
          <ha-form
            .hass=${this.hass}
            .data=${this._data}
            .schema=${Tt}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._onValueChanged}
          ></ha-form>
          <ha-form class="picker-loader" .hass=${this.hass} .schema=${gt} .data=${{}}></ha-form>
        </div>
        <div slot="footer" class="footer">
          <ha-button variant="neutral" appearance="plain" ?disabled=${this._loading} @click=${this._onCancel}>
            ${ve(this.hass,"card.button.cancel")}
          </ha-button>
          <ha-button ?disabled=${this._loading} @click=${this._onSubmit}>
            ${this._loading?ve(this.hass,"card.button.completing"):ve(this.hass,"card.button.complete")}
          </ha-button>
        </div>
      </ha-dialog>
    `:W}_onValueChanged(e){this._data={...this._data,...e.detail.value}}async _onSubmit(){if(this.item&&!this._loading){this._loading=!0,this._error=void 0;try{const e=Ie(this._data.completed_at),t=String(this._data.completed_by??"").trim();await this.hass.callWS({type:"call_service",domain:"chore_calendar",service:"complete_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid,...e?{completed_at:e}:{},...t?{completed_by:t}:{}}}),this.dispatchEvent(new CustomEvent("chore-completed",{detail:{item:this.item},bubbles:!0,composed:!0})),this.open=!1}catch(e){this._error=e instanceof Error?e.message:String(e),console.error("chore-complete-dialog: failed to complete chore",e)}finally{this._loading=!1}}}_onCancel(){this.open=!1,this._onClosed()}_onClosed(){this.dispatchEvent(new CustomEvent("complete-dialog-closed",{bubbles:!0,composed:!0}))}}Ot.styles=a`
    ${mt}
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
  `,e([he({attribute:!1})],Ot.prototype,"hass",void 0),e([he({attribute:!1})],Ot.prototype,"item",void 0),e([he({type:Boolean})],Ot.prototype,"open",void 0),e([pe()],Ot.prototype,"_data",void 0),e([pe()],Ot.prototype,"_error",void 0),e([pe()],Ot.prototype,"_loading",void 0),ue("chore-complete-dialog",Ot);class Pt extends re{constructor(){super(...arguments),this.open=!1,this._until="",this._loading=!1,this._onDatePart=e=>{const t=e.detail.value;t&&(this._until=ft(this._until,t))},this._onTimePart=e=>{const t=e.detail.value;t&&(this._until=vt(this._until,t))}}willUpdate(e){if(e.has("open")||e.has("item")){const e=this.open?this.item?.uid:void 0;e&&e!==this._seededFor&&(this._seededFor=e,this._until=this._defaultUntil(),this._error=void 0),this.open||(this._seededFor=void 0)}}_defaultUntil(){const e=this.item?.next_due?new Date(this.item.next_due):null;return He(e&&!Number.isNaN(e.getTime())?e:new Date)}render(){return this.item?F`
      <ha-dialog .open=${this.open} @closed=${this._onClosed}>
        <ha-icon-button slot="headerNavigationIcon" data-dialog="close" class="header_button">
          <ha-icon icon="mdi:close"></ha-icon>
        </ha-icon-button>
        <span slot="headerTitle">${ve(this.hass,"card.skip.title",{name:this.item.chore_name})}</span>
        <div class="content">
          ${this._error?F`<ha-alert alert-type="error">${this._error}</ha-alert>`:W}
          ${yt({label:ve(this.hass,"card.skip.until"),value:this._until,locale:this.hass.locale,onDate:this._onDatePart,onTime:this._onTimePart})}
          <ha-form class="picker-loader" .hass=${this.hass} .schema=${gt} .data=${{}}></ha-form>
        </div>
        <div slot="footer" class="footer">
          <ha-button variant="neutral" appearance="plain" ?disabled=${this._loading} @click=${this._onCancel}>
            ${ve(this.hass,"card.button.cancel")}
          </ha-button>
          <ha-button ?disabled=${this._loading} @click=${this._onSubmit}>
            ${this._loading?ve(this.hass,"card.button.skipping"):ve(this.hass,"card.button.skip")}
          </ha-button>
        </div>
      </ha-dialog>
    `:W}async _onSubmit(){if(this.item&&!this._loading){this._loading=!0,this._error=void 0;try{const e=Ie(this._until);await this.hass.callWS({type:"call_service",domain:"chore_calendar",service:"skip_item",service_data:{entity_id:this.item.source_entity,item:this.item.uid,...e?{until:e}:{}}}),this.dispatchEvent(new CustomEvent("chore-skipped",{detail:{item:this.item},bubbles:!0,composed:!0})),this.open=!1}catch(e){this._error=e instanceof Error?e.message:String(e),console.error("chore-skip-dialog: failed to skip chore",e)}finally{this._loading=!1}}}_onCancel(){this.open=!1,this._onClosed()}_onClosed(){this.dispatchEvent(new CustomEvent("skip-dialog-closed",{bubbles:!0,composed:!0}))}}Pt.styles=a`
    ${mt}
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
  `,e([he({attribute:!1})],Pt.prototype,"hass",void 0),e([he({attribute:!1})],Pt.prototype,"item",void 0),e([he({type:Boolean})],Pt.prototype,"open",void 0),e([pe()],Pt.prototype,"_until",void 0),e([pe()],Pt.prototype,"_error",void 0),e([pe()],Pt.prototype,"_loading",void 0),ue("chore-skip-dialog",Pt);const Nt=[{name:"title",selector:{text:{}}}],Ut=["hide_completed","hide_section_headers","hide_card_background","allow_uncomplete","hide_add_button","hide_edit_button","hide_show_all"],Mt=[{name:"update_interval",selector:{number:{min:10,max:600,step:10,mode:"box"}},default:60}],Ht=["due_date_period","completed_period"],It=["details","edit","complete","more-info","navigate","url","call-service","none"],qt={details:"details",edit:"edit",complete:"complete","more-info":"more_info",navigate:"navigate",url:"url","call-service":"call_service",none:"none"},zt=["overdue","due","pending","completed"],Lt={title:"editor.field.title",update_interval:"editor.field.update_interval",tap_action:"editor.field.tap_action",hold_action:"editor.field.hold_action",double_tap_action:"editor.field.double_tap_action",exclude:"editor.field.exclude",hide_completed:"editor.option.hide_completed",hide_section_headers:"editor.option.hide_section_headers",hide_card_background:"editor.option.hide_card_background",allow_uncomplete:"editor.option.allow_uncomplete",hide_add_button:"editor.option.hide_add_button",hide_edit_button:"editor.option.hide_edit_button",hide_show_all:"editor.option.hide_show_all"};function Rt(e){return"string"==typeof e?{entity:e}:{...e}}class jt extends re{constructor(){super(...arguments),this._expandedEntities=new Set,this._computeLabel=e=>{const t=Lt[e.name];return t?ve(this.hass,t):e.name}}setConfig(e){this._config={...e}}get _actionsSchema(){const e=It.map(e=>({value:e,label:ve(this.hass,`editor.action.${qt[e]}`)}));return[{name:"tap_action",selector:{select:{options:e,mode:"dropdown"}},default:"details"},{name:"hold_action",selector:{select:{options:e,mode:"dropdown"}},default:"none"},{name:"double_tap_action",selector:{select:{options:e,mode:"dropdown"}},default:"none"}]}get _excludeSchema(){return[{name:"exclude",selector:{select:{multiple:!0,options:zt.map(e=>({value:e,label:xe(this.hass,e)}))}}}]}render(){if(!this.hass||!this._config)return F``;const e=(this._config.entities??[]).map(Rt);return F`
      <div class="entities-header">
        <span>${ve(this.hass,"editor.section.entities")}</span>
      </div>
      ${e.map((e,t)=>{const i=((o=e.entity)?(o.split(".").pop()??o).replace(/_/g," ").replace(/\b\w/g,e=>e.toUpperCase()):"")||ve(this.hass,"editor.entity.new_name");var o;const n=e.color??"",s=this._expandedEntities.has(t);return F`
          <ha-expansion-panel
            .expanded=${s}
            @expanded-changed=${e=>this._toggleExpanded(e,t)}
          >
            <div class="entity-header" slot="header">
              <span
                class="entity-color-dot"
                style="background-color: ${n?Se(n):"var(--primary-color)"}"
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
                .computeLabel=${()=>ve(this.hass,"editor.field.color")}
                @value-changed=${e=>this._colorChanged(e,t)}
              ></ha-form>
              <ha-form
                .hass=${this.hass}
                .data=${{exclude:e.exclude??[]}}
                .schema=${this._excludeSchema}
                .computeLabel=${this._computeLabel}
                @value-changed=${e=>this._excludeChanged(e,t)}
              ></ha-form>
              <button
                class="remove-btn"
                title=${ve(this.hass,"editor.button.remove_entity_title")}
                @click=${()=>this._removeEntity(t)}
                style="align-self: flex-end"
              >
                ✕ ${ve(this.hass,"editor.button.remove_entity")}
              </button>
            </div>
          </ha-expansion-panel>
        `})}
      ${0===e.length?F`<button class="add-btn" @click=${this._addEntity}>
            + ${ve(this.hass,"editor.button.add_entity")}
          </button>`:F`<button class="add-btn" @click=${this._addEntity}>
            + ${ve(this.hass,"editor.button.add_another_entity")}
          </button>`}

      <div class="divider"></div>

      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${Nt}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._optionsChanged}
      ></ha-form>

      <div class="toggles">
        ${Ut.map(e=>F`
            <ha-formfield alignEnd spaceBetween .label=${ve(this.hass,Lt[e])}>
              <ha-switch
                .checked=${!!this._config[e]}
                @change=${t=>this._toggleChanged(e,t)}
              ></ha-switch>
            </ha-formfield>
          `)}
      </div>

      <div class="period-group">
        ${Ht.map(e=>this._renderPeriodRow(e,ve(this.hass,`editor.field.${e}`)))}
      </div>

      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${Mt}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._optionsChanged}
      ></ha-form>

      <div class="divider"></div>

      <ha-form
        .hass=${this.hass}
        .data=${this._actionsFormData()}
        .schema=${this._actionsSchema}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._actionsChanged}
      ></ha-form>
    `}_dispatch(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}_toggleExpanded(e,t){const i=e.detail.expanded,o=new Set(this._expandedEntities);i?o.add(t):o.delete(t),this._expandedEntities=o}_entityChanged(e,t){e.stopPropagation();const i=(this._config.entities??[]).map(Rt);i[t]={...i[t],entity:e.detail.value.entity},this._config={...this._config,entities:i},this._dispatch()}_colorChanged(e,t){e.stopPropagation();const i=e.detail.value?.color,o=(this._config.entities??[]).map(Rt);o[t]={...o[t],color:i||void 0},this._config={...this._config,entities:o},this._dispatch()}_excludeChanged(e,t){e.stopPropagation();const i=e.detail.value.exclude??[],o=(this._config.entities??[]).map(Rt);o[t]={...o[t],exclude:i},this._config={...this._config,entities:o},this._dispatch()}_removeEntity(e){const t=(this._config.entities??[]).map(Rt).filter((t,i)=>i!==e),i=new Set;for(const t of this._expandedEntities)t<e?i.add(t):t>e&&i.add(t-1);this._expandedEntities=i,this._config={...this._config,entities:t},this._dispatch()}_addEntity(){const e=[...(this._config.entities??[]).map(Rt),{entity:""}],t=e.length-1,i=new Set(this._expandedEntities);i.add(t),this._expandedEntities=i,this._config={...this._config,entities:e},this._dispatch()}_actionToString(e){return e?.action??""}_actionsFormData(){return{tap_action:this._actionToString(this._config.tap_action)||"details",hold_action:this._actionToString(this._config.hold_action)||"none",double_tap_action:this._actionToString(this._config.double_tap_action)||"none"}}_actionsChanged(e){if(e.stopPropagation(),!this._config||!this.hass)return;const t=e.detail.value,i=e=>e?{action:e}:void 0;this._config={...this._config,tap_action:i(t.tap_action),hold_action:i(t.hold_action),double_tap_action:i(t.double_tap_action)},this._dispatch()}_renderPeriodRow(e,t){const i=this._config[e]??{},o=!(!i.days&&!i.hours),n=o?String(i.days??0):"",s=o?String(i.hours??0):"";return F`
      <div class="period-row">
        <span class="period-label">${t}</span>
        <div class="period-inputs">
          <ha-input
            appearance="outlined"
            type="number"
            min="0"
            max="365"
            placeholder=${ve(this.hass,"editor.placeholder.days")}
            .value=${n}
            @change=${t=>this._setPeriod(e,"days",t.target.value)}
          ></ha-input>
          <ha-input
            appearance="outlined"
            type="number"
            min="0"
            max="23"
            placeholder=${ve(this.hass,"editor.placeholder.hours")}
            .value=${s}
            @change=${t=>this._setPeriod(e,"hours",t.target.value)}
          ></ha-input>
        </div>
      </div>
    `}_setPeriod(e,t,i){if(!this._config)return;const o=Math.max(0,Math.floor(Number(i)||0)),n={...this._config[e]??{},[t]:o};n.days||delete n.days,n.hours||delete n.hours;const s=Object.keys(n).length>0;this._config={...this._config,[e]:s?n:void 0},this._dispatch()}_toggleChanged(e,t){if(!this._config)return;const i=t.target.checked;this._config={...this._config,[e]:i},this._dispatch()}_optionsChanged(e){e.stopPropagation(),this._config&&this.hass&&(this._config={...this._config,...e.detail.value},this._dispatch())}}jt.styles=a`
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
  `,e([he({attribute:!1})],jt.prototype,"hass",void 0),e([pe()],jt.prototype,"_config",void 0),e([pe()],jt.prototype,"_expandedEntities",void 0),ue("chore-calendar-card-editor",jt);console.info("%c CHORE-CALENDAR-CARD %c v0.12.2 ","color: white; background: #4CAF50; font-weight: 700;","color: #4CAF50; background: white; font-weight: 700;");const Ft=["overdue","due","pending","completed"];class Bt extends re{constructor(){super(...arguments),this._items=[],this._loading=!0,this._dialogOpen=!1,this._editOpen=!1,this._completeOpen=!1,this._skipOpen=!1,this._showAll=!1,this._hiddenCount=0,this._allItems=[],this._entityConfigs=[],this._connected=!1}static getConfigElement(){return document.createElement("chore-calendar-card-editor")}static getStubConfig(){return{entities:[]}}setConfig(e){if(!e.entities||0===e.entities.length)return this._configError="card.error.no_entity",void(this._config=e);this._configError=void 0,this._config=e,this._entityConfigs=e.entities.map((e,t)=>function(e,t){const i="string"==typeof e?{entity:e}:e;return{...i,color:i.color??ke[t%ke.length]}}(e,t)),this._allItems.length&&this._applyFilters(),e.hide_card_background?this.setAttribute("no-card-background",""):this.removeAttribute("no-card-background")}getCardSize(){return Math.max(3,this._items.length+1)}connectedCallback(){super.connectedCallback(),this._connected=!0,this._startPolling(),this._subscribeEvents()}disconnectedCallback(){super.disconnectedCallback(),this._connected=!1,this._stopPolling(),this._unsubscribeEvents()}updated(e){e.has("hass")&&this.hass&&this._loading&&this._refreshData()}async _refreshData(){if(this.hass&&this._config)try{const e=[],t=this._entityConfigs.map(async t=>{const i=await this.hass.callWS({type:"call_service",domain:"chore_calendar",service:"get_items",service_data:{entity_id:t.entity},return_response:!0}),o=i.response?.items??[],n=i.response?.completed_cleared_at?new Date(i.response.completed_cleared_at).getTime():null,s=t.exclude??[];for(const i of o)s.includes(i.status)||null!==n&&"completed"===i.status&&i.last_completed&&new Date(i.last_completed).getTime()<n||e.push({...i,source_entity:t.entity,source_color:t.color})});await Promise.all(t),this._allItems=e,this._applyFilters()}catch(e){console.error("chore-calendar-card: failed to fetch items",e)}finally{this._loading=!1}}get _showAllActive(){return this._showAll&&!this._config.hide_show_all}_applyFilters(){const e=Oe(this._config.due_date_period),t=Oe(this._config.completed_period),i=function(e,t,i,o){if(null===t&&null===i)return e;const n=o.getTime();return e.filter(e=>{if(null!==i&&"completed"===e.status&&e.last_completed&&n-new Date(e.last_completed).getTime()>i)return!1;if(null!==t&&"pending"===e.status){if(!e.next_due)return!1;if(new Date(e.next_due).getTime()-n>t)return!1}return!0})}(this._allItems,e,t,new Date),o=this._config.hide_completed?i.filter(e=>"completed"!==e.status).length:i.length;var n;this._hiddenCount=this._allItems.length-o,this._items=(n=this._showAllActive?this._allItems:i,[...n].sort((e,t)=>{const i=Ae[e.status]-Ae[t.status];if(0!==i)return i;if("completed"===e.status){const i=e.last_completed?new Date(e.last_completed).getTime():0;return(t.last_completed?new Date(t.last_completed).getTime():0)-i}return(e.next_due?new Date(e.next_due).getTime():1/0)-(t.next_due?new Date(t.next_due).getTime():1/0)}))}_toggleShowAll(){this._showAll=!this._showAll,this._applyFilters()}_startPolling(){this._stopPolling();const e=1e3*(this._config?.update_interval??60);this._refreshTimer=setInterval(()=>{this._connected&&this._refreshData()},e)}_stopPolling(){void 0!==this._refreshTimer&&(clearInterval(this._refreshTimer),this._refreshTimer=void 0)}async _subscribeEvents(){if(this.hass?.connection)try{const e=new Set(this._entityConfigs.map(e=>e.entity));this._eventUnsub=await this.hass.connection.subscribeEvents(t=>{t.data?.entity_id&&e.has(t.data.entity_id)&&this._refreshData()},"state_changed")}catch{}}_unsubscribeEvents(){this._eventUnsub?.(),this._eventUnsub=void 0}render(){if(!this._config)return W;if(this._configError)return F`
        <ha-card>
          <div class="empty">${ve(this.hass,this._configError)}</div>
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
                      <ha-icon-button class="add" part="add-button" title=${ve(this.hass,"card.button.add_chore")} @click=${this._onAddChore}>
                        <ha-icon icon="mdi:plus"></ha-icon>
                      </ha-icon-button>
                    `:W}
              </div>
            `:W}
        ${this._loading?F`<div class="loading">${ve(this.hass,"card.state.loading")}</div>`:F`${this._renderSections()}${this._renderShowAllToggle()}`}
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
    `}_renderSections(){const e=function(e){const t=new Map;for(const i of e){let e=t.get(i.status);e||(e=[],t.set(i.status,e)),e.push(i)}return t}(this._items),t=!!this._config.hide_completed&&!this._showAllActive,i=!!this._config.hide_section_headers,o=Ft.filter(i=>{const o=e.get(i);return!(!o||0===o.length)&&("completed"!==i||!t)});return 0===o.length?F`
        <div class="placeholder">
          <div class="placeholder-card">
            <div class="placeholder-row">${ve(this.hass,"card.state.no_chores")}</div>
          </div>
        </div>
      `:F`
      ${o.map(t=>{const o=e.get(t);return F`
          ${i?W:F`<div class="section-header ${t}" part="section-header section-header-${t}">
                ${function(e,t){return ve(t,`card.section.${e}`)}(t,this.hass)}
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
    `}_renderShowAllToggle(){return 0===this._hiddenCount||this._config.hide_show_all?W:F`
      <button class="show-all" part="show-all" @click=${this._toggleShowAll}>
        <ha-icon icon=${this._showAll?"mdi:chevron-up":"mdi:chevron-down"}></ha-icon>
        ${this._showAll?ve(this.hass,"card.show_all.fewer"):we(this.hass,"card.show_all.more",this._hiddenCount)}
      </button>
    `}_onChoreDetail(e){this._dialogItem=e.detail.item,this._dialogOpen=!0}_onDialogClosed(){this._dialogOpen=!1}_onChoreCompleted(){this._dialogOpen=!1,this._completeOpen=!1,this._skipOpen=!1,this._refreshData()}_onChoreCompleteDetails(e){this._dialogOpen=!1,this._completeItem=e.detail.item,this._completeOpen=!0}_onCompleteClosed(){this._completeOpen=!1}_onChoreSkipDetails(e){this._dialogOpen=!1,this._skipItem=e.detail.item,this._skipOpen=!0}_onSkipClosed(){this._skipOpen=!1}_onAddChore(){this._editItem=void 0,this._editOpen=!0}_onChoreEdit(e){this._dialogOpen=!1,this._editItem=e.detail.item,this._editOpen=!0}_onEditClosed(){this._editOpen=!1}_onChoreSaved(){this._editOpen=!1,this._refreshData()}_targetOptions(){return this._entityConfigs.map(e=>({value:e.entity,label:this.hass?.states?.[e.entity]?.attributes?.friendly_name??e.entity}))}}Bt.styles=a`
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

`,e([he({attribute:!1})],Bt.prototype,"hass",void 0),e([pe()],Bt.prototype,"_config",void 0),e([pe()],Bt.prototype,"_configError",void 0),e([pe()],Bt.prototype,"_items",void 0),e([pe()],Bt.prototype,"_loading",void 0),e([pe()],Bt.prototype,"_dialogItem",void 0),e([pe()],Bt.prototype,"_dialogOpen",void 0),e([pe()],Bt.prototype,"_editItem",void 0),e([pe()],Bt.prototype,"_editOpen",void 0),e([pe()],Bt.prototype,"_completeItem",void 0),e([pe()],Bt.prototype,"_completeOpen",void 0),e([pe()],Bt.prototype,"_skipItem",void 0),e([pe()],Bt.prototype,"_skipOpen",void 0),e([pe()],Bt.prototype,"_showAll",void 0),e([pe()],Bt.prototype,"_hiddenCount",void 0),ue("chore-calendar-card",Bt),window.customCards=window.customCards||[],window.customCards.push({type:"chore-calendar-card",name:"Chore Calendar",description:"Timeline view of chores from Chore Calendar lists",preview:!0});export{Bt as ChoreCalendarCard};
