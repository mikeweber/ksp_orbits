(function(namespace, makeObservable) {
  namespace.Player = (function() {
    var klass = function Player(sim, renderer) {
      this.sim      = sim
      this.renderer = renderer
      this.track    = function(obj_name) {
        var obj = this.getBody(obj_name)
        if (!obj) {
          console.error('Could not find "' + obj_name + '"')
          return
        }

        this.track(obj)
      }.bind(this.sim)
      this.run           = function() { this.sim.run(this.renderer) }.bind(this)
      this.togglePaused  = sim.togglePaused.bind(sim)
      this.zoomTo        = renderer.zoomTo.bind(renderer)
      this.zoomIn        = renderer.zoomIn.bind(renderer)
      this.zoomOut       = renderer.zoomOut.bind(renderer)
      this.smoothZoomIn  = renderer.smoothZoomIn.bind(renderer)
      this.smoothZoomOut = renderer.smoothZoomOut.bind(renderer)
      this.speedUp       = sim.faster.bind(sim)
      this.slowDown      = sim.slower.bind(sim)
      this.trackNext     = sim.trackNext.bind(sim)
      this.trackPrev     = sim.trackPrev.bind(sim)
    }

    makeObservable(klass)

    return klass
  })()
})(FlightPlanner.Controller, FlightPlanner.Helper.makeObservable)
