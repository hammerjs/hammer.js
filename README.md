# Experimental

How would HammerJS look in modern times? Browsers have kept on developing and things aren't as hard as they used to be. How would I approach some problems with my current experience?

This is an experimental implementation of HammerJS and will probably never release. But feel free to use, or not.

## Usage

```js
const hammer = new Hammer(myElement, {
  // These are the default options...
  supportedPointerTypes: ['touch', 'pen'], // you can add 'mouse' here too.
  touchBehavior: {
    preventScrollX: true,
    preventScrollY: true,
    preventZoom: true,
    preventSelect: true,
    preventContextMenu: true,
  },
});
hammer.register(
  new Hammer.Tap({
    onTap(ev) {
      console.log(ev);
    },
  })
);
```

Same goes for other recognizers that you can find in the `/src/recognizers` directory.
