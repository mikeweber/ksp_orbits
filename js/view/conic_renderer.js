(function(namespace) {
  'use strict'

  namespace.ConicRenderer = (function() {
    var klass = function ConicRenderer(canvas, body) {
      this.init(canvas)
      this.body = body
    }

    klass.prototype = Object.create(namespace.SceneRenderer.prototype)
    klass.prototype.constructor = klass

    klass.prototype.render = function(t) {
      var e      = this.body.getEccentricity(),
          coords = this.convertWorldToCanvas(this.body.getParentCoordinates(t), t),
          a      = this.scaleWorldToCanvasY(this.body.getSemiMajorAxis()),
          style  = this.getStyle()

      if (!this.body.parentIsSun() && this.getZoom().lt(200)) return

      if (e >= 0 && e < 1) {
        // this.renderVisibleEllipseSegments(coords, a, e, this.body.getArgumentOfPeriapsis(t), style)
        this.renderEllipseWithLineSegments(coords, a, e, this.body.getArgumentOfPeriapsis(t), style)
      } else if (e === 1) {
        var pe = this.scaleWorldToCanvasY(this.body.getPeriapsis())
        this.renderParabola(coords, pe, this.body.getArgumentOfPeriapsis(t), style)
      } else {
        // var pe = this.scaleWorldToCanvasY(this.body.getPeriapsis())
        // this.renderHyperbola(coords, a, e, pe, this.body.getArgumentOfPeriapsis(t), style)
      }
    }

    klass.prototype.getStyle = function() {
      return { stroke_style: '#32CD32', line_width: 1 }
    }

    return klass
  })()
})(FlightPlanner.View)
