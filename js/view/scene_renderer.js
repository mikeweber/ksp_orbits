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
      var context   = this.getContext(),
          one       = new Decimal(1),
          offcenter = a.times(e),
          center    = { x: offcenter.times(-1), y: new Decimal(0) },
          b         = a.toPower(2).times(one.minus(e.toPower(2))).sqrt(),
          // source: http://stackoverflow.com/questions/1734745/how-to-create-circle-with-b%C3%A9zier-curves
          // A 4 pointed bezier curve uses a handle distance of 4*(sqrt(2)-1)/3 = 0.552284749831)
          k         = 0.552284749831

      context.save()
      context.translate(coords.x, coords.y)
      context.beginPath()
      context.rotate(pe)
      context.moveTo(center.x.plus(a), center.y)
      context.bezierCurveTo(
        center.x.plus(a),           center.y.plus(b.times(k)),
        center.x.plus(a.times(k)),  center.y.plus(b),
        center.x,                   center.y.plus(b)
      )
      context.bezierCurveTo(
        center.x.minus(a.times(k)), center.y.plus(b),
        center.x.minus(a),          center.y.plus(b.times(k)),
        center.x.minus(a),          center.y
      )
      context.bezierCurveTo(
        center.x.minus(a),          center.y.minus(b.times(k)),
        center.x.minus(a.times(k)), center.y.minus(b),
        center.x,                   center.y.minus(b)
      )
      context.bezierCurveTo(
        center.x.plus(a.times(k)),  center.y.minus(b),
        center.x.plus(a),           center.y.minus(b.times(k)),
        center.x.plus(a),           center.y
      )
      context.strokeStyle = style.stroke_style
      context.lineWidth   = style.line_width
      context.stroke()
      context.restore()
    }

    klass.prototype.print = function(text, x, y) {
      var context = this.getContext()
      context.save()
      context.fillStyle = '#FFF'
      context.fillText(text, x, y)
      context.restore()
    }

    klass.prototype.renderCircle = function(coords, radius, style) {
      var context = this.getContext()
      context.save()
      startCircle(context, coords, radius)
      context.strokeStyle = style.stroke_style
      context.lineWidth   = style.line_width
      context.stroke()
      context.restore()
    }

    klass.prototype.renderFilledCircle = function(coords, radius, style) {
      var context = this.getContext()
      context.save()
      startCircle(context, coords, radius)
      context.fillStyle = style.fill_style
      context.fill()
      context.restore()
    }

    klass.prototype.clear = function() {
      this.getContext().clearRect(0, 0, this.getCanvasWidth().toNumber(), this.getCanvasHeight().toNumber())
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
