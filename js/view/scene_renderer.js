(function(namespace) {
  'use strict'

  namespace.SceneRenderer = (function() {
    var klass = function SceneRenderer(canvas) {
      this.init(canvas, canvas)
    }

    klass.prototype.render = function() {
      throw('This function must be redefined by a child object')
    }

    klass.prototype.init = function(canvas) {
      this.setCanvas(canvas)
    }

    klass.prototype.setParentRenderer = function(parent, canvas) {
      this.parent_renderer = parent
      this.setCanvas(parent, canvas)
      this.initCanvas(this.canvas)
    }

    // Get either the parent's context, or use the context of the
    // canvas passed in on init. Don't allow the context to be changed.
    klass.prototype.setCanvas = function(renderer, canvas) {
      if (!renderer || this.canvas) return

      this.context = renderer.getContext('2d')
      this.canvas  = canvas || renderer
    }

    klass.prototype.renderEllipse = function(coords, a, e, pe, style) {
      this.renderCircle(coords, a, style)
    }

    klass.prototype.renderCircle = function(coords, radius, style) {
      var context = startCircle(this.getContext(), coords, radius)
      context.strokeStyle = style.stroke_style
      context.lineWidth   = style.line_width
      context.stroke()
    }

    klass.prototype.renderFilledCircle = function(coords, radius, style) {
      var context = startCircle(this.getContext(), coords, radius)
      context.fillStyle = style.fill_style
      context.fill()
    }

    klass.prototype.clear = function() {
      this.getContext().clearRect(0, 0, this.getCanvasWidth(), this.getCanvasHeight())
    }

    function startCircle(context, coords, radius) {
      context.beginPath()
      context.arc(coords.x, coords.y, radius, 0, 2 * Math.PI)
      return context
    }

    klass.prototype.getContext = function() {
      return this.context
    }

    return klass
  })()
})(FlightPlanner.View)
