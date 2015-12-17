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

    klass.prototype.renderVisibleEllipseSegments = function(coords, a, e, pe, style) {
      var context   = this.getContext(),
          one       = new Decimal(1),
          offcenter = a.times(e),
          center    = { x: offcenter.times(-1), y: new Decimal(0) },
          b         = a.toPower(2).times(one.minus(e.toPower(2))).sqrt(),
          k         = 0.552284749831,
          nodes     = []

      context.save()
      context.translate(coords.x, coords.y)
      context.beginPath()
      context.rotate(pe)
      context.moveTo(center.x.plus(a), center.y)
      var curve1 = [
            center.x.plus(a),           center.y,
            center.x.plus(a),           center.y.plus(b.times(k)),
            center.x.plus(a.times(k)),  center.y.plus(b),
            center.x,                   center.y.plus(b)
          ],
          curve2 = [
            center.x,                   center.y.plus(b),
            center.x.minus(a.times(k)), center.y.plus(b),
            center.x.minus(a),          center.y.plus(b.times(k)),
            center.x.minus(a),          center.y
          ],
          curve3 = [
            center.x.minus(a),          center.y,
            center.x.minus(a),          center.y.minus(b.times(k)),
            center.x.minus(a.times(k)), center.y.minus(b),
            center.x,                   center.y.minus(b)
          ],
          curve4 = [
            center.x,                   center.y.minus(b),
            center.x.plus(a.times(k)),  center.y.minus(b),
            center.x.plus(a),           center.y.minus(b.times(k)),
            center.x.plus(a),           center.y
          ],
          curves = [curve1, curve2, curve3, curve4]

      for (var i = 0; i < curves.length; i++) {
        var split_curves = splitCurve(curves[i]),
            sixteenths   = splitCurve(split_curves[0]).concat(splitCurve(split_curves[1])),
            thirty2nds   = splitCurve(sixteenths[0]).concat(splitCurve(sixteenths[1])).concat(splitCurve(sixteenths[2]).concat(splitCurve(sixteenths[3])))

        for (var j = 0; j < thirty2nds.length; j++) {
          drawCurve(this.getContext(), thirty2nds[j], style)
        }
      }

      function splitCurve(curve) {
        var fs = [
          function p1_1(p1, p2, p3, p4) { return p1 },
          function p2_1(p1, p2, p3, p4) { return p1.plus(p2).dividedBy(2) },
          function p3_1(p1, p2, p3, p4) { return p1.plus(p2.times(2)).plus(p3).dividedBy(4) },
          function p4_1(p1, p2, p3, p4) { return p1.plus(p2.times(3)).plus(p3.times(3)).plus(p4).dividedBy(8) },
          function p1_2(p1, p2, p3, p4) { return p1.plus(p2.times(3)).plus(p3.times(3)).plus(p4).dividedBy(8) },
          function p2_2(p1, p2, p3, p4) { return p2.plus(p3.times(2)).plus(p4).dividedBy(4) },
          function p3_2(p1, p2, p3, p4) { return p3.plus(p4).dividedBy(2) },
          function p4_2(p1, p2, p3, p4) { return p4 }
        ]

        var curves = []
        for (var i = 0; i < fs.length; i++) {
          for (var j = 0; j < 2; j++) {
            curves.push(fs[i](curve[j], curve[j + 2], curve[j + 4], curve[j + 6]))
          }
        }

        return [curves.slice(0, 8), curves.slice(8, 16)]
      }
      function drawCurve(context, curve, style, debug_mode) {
        context.beginPath()
        context.moveTo.apply(context, curve.slice(0, 2))
        context.bezierCurveTo.apply(context, curve.slice(2, 8))
        context.strokeStyle = style.stroke_style
        context.lineWidth   = style.line_width
        context.stroke()
        context.closePath()

        if (debug_mode) {
          context.save()
          context.beginPath()
          context.lineWidth = 2
          context.setLineDash([10, 10])
          context.strokeStyle = '#DDDDDD'
          context.moveTo.apply(context, curve.slice(0, 2))
          context.lineTo.apply(context, curve.slice(2, 4))
          context.lineTo.apply(context, curve.slice(4, 6))
          context.lineTo.apply(context, curve.slice(6, 8))
          context.stroke()
          context.closePath()
          context.restore()

          context.save()
          context.fillStyle = '#FFFFFF'
          context.beginPath()
          context.arc(curve[0], curve[1], 2, 0, 2 * Math.PI)
          context.fill()
          context.closePath()
          context.beginPath()
          context.arc(curve[2], curve[3], 2, 0, 2 * Math.PI)
          context.fill()
          context.closePath()
          context.beginPath()
          context.arc(curve[4], curve[5], 2, 0, 2 * Math.PI)
          context.fill()
          context.closePath()
          context.beginPath()
          context.arc(curve[6], curve[7], 2, 0, 2 * Math.PI)
          context.fill()
          context.closePath()
          context.restore()
        }
      }
      // context.bezierCurveTo(
      //   center.x.plus(a),           center.y.plus(b.times(k)),
      //   center.x.plus(a.times(k)),  center.y.plus(b),
      //   center.x,                   center.y.plus(b)
      // )
      // context.bezierCurveTo(
      //   center.x.minus(a.times(k)), center.y.plus(b),
      //   center.x.minus(a),          center.y.plus(b.times(k)),
      //   center.x.minus(a),          center.y
      // )
      // context.bezierCurveTo(
      //   center.x.minus(a),          center.y.minus(b.times(k)),
      //   center.x.minus(a.times(k)), center.y.minus(b),
      //   center.x,                   center.y.minus(b)
      // )
      // context.bezierCurveTo(
      //   center.x.plus(a.times(k)),  center.y.minus(b),
      //   center.x.plus(a),           center.y.minus(b.times(k)),
      //   center.x.plus(a),           center.y
      // )
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
