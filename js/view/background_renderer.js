(function(namespace) {
  'use strict'

  namespace.BackgroundRenderer = (function() {
    var klass = function BackgroundRenderer(canvas) {
      this.init(canvas)
      this.rendered = false
    }

    klass.prototype = Object.create(namespace.SceneRenderer.prototype)
    klass.prototype.constructor = klass

    klass.prototype.render = function() {
      if (this.rendered) return

      this.rendered = true
      var context = this.getContext()
      context.beginPath()
      context.rect(0, 0, this.getCanvasWidth(), this.getCanvasHeight())
      context.fillStyle = '#000000'
      context.fill()
    }

    klass.prototype.clear = function() {}

    return klass
  })()
})(FlightPlanner.View)
