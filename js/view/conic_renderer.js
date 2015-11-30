(function(namespace) {
  'use strict'

  namespace.ConicRenderer = (function() {
    var klass = function ConicRenderer(canvas, body) {
      this.init(canvas)
      this.body = body
    }

    klass.prototype = Object.create(namespace.SceneRenderer.prototype)
    klass.prototype.constructor = klass

    klass.prototype.render = function() {
      var e      = this.body.getEccentricity(),
          coords = this.convertWorldToCanvas(this.body.getParentCoordinates()),
          a      = this.scaleWorldToCanvasX(this.body.getSemiMajorAxis()),
          style  = this.getStyle()

      if (!this.body.parentIsSun() && this.getZoom().lt(200)) return

      // if (e == 0) {
      //   this.renderCircle(coords, a, style)
      // } else if (e > 0 && e < 1) {
        this.renderEllipse(coords, a, e, this.body.getArgumentOfPeriapsis(), style)
      // }
    }

    klass.prototype.getStyle = function() {
      return { stroke_style: '#32CD32', line_width: 1 }
    }

    return klass
  })()
})(FlightPlanner.View)
