(function(namespace) {
  namespace.SimDetails = (function() {
    var klass = function SimDetails(canvas, player) {
      this.init(canvas)
      this.player = player
    }

    klass.prototype = Object.create(namespace.SceneRenderer.prototype)
    klass.prototype.constructor = klass

    klass.prototype.render = function() {
      var context = this.getContext()
      context.textAlign = 'start'
      context.textBaseline = 'bottom'
      this.print('Zoom: ' + this.parent_renderer.zoom.round(), 5, 10)
      this.print('Warp: ' + this.player.sim.tick_size, 5, 20)
      this.print(this.player.sim.getKerbalDate(), 5, 30)
      this.print('T+' + this.player.sim.t, 5, 40)
      this.print('Focused on ' + this.parent_renderer.getTrackingName(), 5, 50)
    }

    return klass
  })()
})(FlightPlanner.View)
