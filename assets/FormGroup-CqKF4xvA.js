import{a4 as i,a5 as m,a6 as d,r as f,a7 as w,br as C,bs as F,j as x,a8 as y,a9 as G,aa as M}from"./index-ekZLYKIs.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=i("CloudUpload",[["path",{d:"M12 13v8",key:"1l5pq0"}],["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242",key:"1pljnt"}],["path",{d:"m8 17 4-4 4 4",key:"1quai1"}]]);function U(o){return m("MuiFormGroup",o)}d("MuiFormGroup",["root","row","error"]);const h=o=>{const{classes:r,row:s,error:t}=o;return M({root:["root",s&&"row",t&&"error"]},U,r)},v=y("div",{name:"MuiFormGroup",slot:"Root",overridesResolver:(o,r)=>{const{ownerState:s}=o;return[r.root,s.row&&r.row]}})({display:"flex",flexDirection:"column",flexWrap:"wrap",variants:[{props:{row:!0},style:{flexDirection:"row"}}]}),g=f.forwardRef(function(r,s){const t=w({props:r,name:"MuiFormGroup"}),{className:e,row:n=!1,...l}=t,p=C(),u=F({props:t,muiFormControl:p,states:["error"]}),a={...t,row:n,error:u.error},c=h(a);return x.jsx(v,{className:G(c.root,e),ownerState:a,ref:s,...l})});export{j as C,g as F};
