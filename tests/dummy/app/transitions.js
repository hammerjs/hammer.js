export default function() {

  // debug all
  this.transition = this.transition.bind(this, this.debug());

  /*
   * Initial Render
   *
   *
   */
  // Rule 1
  this.transition(
    this.onInitialRender(),
    this.use('fade', { duration: 500 })
  );

  // Rule 2
  this.transition(
    this.fromRoute('items.index'),
    this.use('to-left', { duration: 350 }),
    this.reverse('to-right', { duration: 350 })
  );

}
