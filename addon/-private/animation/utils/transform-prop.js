// Determine Vendor Prefix
export const VENDORS = ['Webkit', 'Moz', 'ms'];

let transformProp = 'transform';

if (! ('transform' in document.body.style)) {
  for (let i = 0; i < VENDORS.length; i++) {
    let prop = `${VENDORS[i]}Transform`;

    if (prop in document.body.style) {
      transformProp = prop;
      break;
    }
  }
}

export default transformProp;
