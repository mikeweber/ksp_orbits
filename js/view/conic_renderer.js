(function(namespace) {
  'use strict'

  namespace.ConicRenderer = (function() {
    var klass = function ConicRenderer() {}

    klass.prototype.setParentRenderer = function(parent) {
      this.parent_renderer = parent
      this.context = this.parent_renderer.getContext()
    }

    klass.prototype.render = function(body) {
      var e, coords, a

      e      = body.getEccentricity()
      coords = this.convertWorldToCanvas(body.getParentCoordinates())
      a      = this.scaleWorldToCanvasX(body.getSemiMajorAxis())

      if (e == 0) {
        this.renderCircle(coords, a)
      } else if (e > 0 && e < 1) {
        this.renderEllipse(coords, a, e, body.getArgumentOfPeriapsis())
      }
    }

    klass.prototype.renderEllipse = function(coords, a, e, pe) {
      this.renderCircle(coords, a)
    }

    klass.prototype.renderCircle = function(coords, a) {
      this.context.beginPath()
      this.context.arc(coords.x, coords.y, a, 0, 2 * Math.PI)
      this.context.strokeStyle = '#32CD32'
      this.context.lineWidth = 1
      this.context.stroke()
    }

    klass.prototype.convertWorldToCanvas = function(coords) {
      return this.parent_renderer.convertWorldToCanvas(coords)
    }

    klass.prototype.scaleWorldToCanvasX = function(point) {
      return this.parent_renderer.scaleWorldToCanvasX(point)
    }

    return klass
  })()
})(FlightPlanner.View)
