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

    klass.prototype.renderVisibleEllipseSegments = function(coords, a, e, pe, style) {
      var context   = this.getContext(),
          offcenter = a.times(e),
          center    = { x: offcenter.times(-1).plus(coords.x), y: coords.y },
          b         = a.toPower(2).times(Decimal.ONE.minus(e.toPower(2))).sqrt(),
          // source: http://stackoverflow.com/questions/1734745/how-to-create-circle-with-b%C3%A9zier-curves
          // A 4 pointed bezier curve uses a handle distance of 4*(sqrt(2)-1)/3 = 0.552284749831)
          k         = 0.552284749831,
          nodes     = []

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
          curves = [curve1, curve2, curve3, curve4],
          rotated_curves = []
      for (var i = 0; i < curves.length; i++) {
        var curve         = curves[i],
            rotated_curve = []
        for (var j = 0; j < curve.length; j = j + 2) {
          var pt      = { x: curve[j], y: curve[j + 1] },
              rotated = rotate(pt, coords, pe)

          rotated_curve.push(rotated.x)
          rotated_curve.push(rotated.y)
        }

        rotated_curves.push(rotated_curve)
      }

      this.renderFilledCircle({ x: rotated_curves[0], y: rotated_curves[1] }, 2, { fill_style: '#FFFFFF' })
      context.save()
      for (var i = 0; i < rotated_curves.length; i++) {
        drawCurve(this.getContext(), rotated_curves[i], style)
      }
      context.restore()
    }

    klass.prototype.renderHyperbola = function(parent_coords, a, e, pe, pe_arg, style) {
      var context   = this.getContext(),
          offcenter = a.times(e).times(-1),
          delta     = new Decimal(2).times(Math.asin(Decimal.ONE.dividedBy(e))),
          center    = { x: offcenter.plus(parent_coords.x), y: parent_coords.y },
          b         = a.times(-1).dividedBy(Math.tan(delta) / 2)

      context.save()
      context.strokeStyle = style.stroke_style
      context.lineWidth   = style.line_width
      var start_y = new Decimal(context.canvas.height).minus(center.y)
      var start_x = solveHyperbolaForX(start_y, a, b)
      // if (start_x.lt(0) || start_x.gt(context.canvas.width)) {
      //   start_x = center.x.times(-1)
      //   start_y = solveHyperbolaForY(start_x, a, b)
      // }
      var start_point = rotate({ x: start_x.plus(center.x), y: start_y }, parent_coords, pe_arg)
      var end_point
      this.renderFilledCircle(start_point, 5, { fill_style: '#FF0' })
      context.moveTo(start_point.x, start_point.y)
      var end_y = context.canvas.height
      for (var y = start_y; y.lt(end_y); y = y.plus(10)) {
        var x       = solveHyperbolaForX(y, a, b)
        var p       = { x: x.plus(center.x), y: y.plus(center.y) }
        var prime   = rotate(p, parent_coords, pe_arg)
        end_point = prime
        context.lineTo(prime.x, prime.y)
      }
      context.stroke()
      context.restore()

      this.renderFilledCircle(end_point, 5, { fill_style: '#0F0' })
      console.log({ x: '' + start_point.x, y: '' + start_point.y }, { x: '' + end_point.x, y: '' + end_point.y })
      this.renderFilledCircle(rotate({ x: solveHyperbolaForX(new Decimal(0), a, b).plus(center.x), y: center.y }, parent_coords, pe_arg), 5, { fill_style: '#F00' })
    }

    function solveHyperbolaForX(y, a, b) {
      return a.times(a).times(y.times(y).dividedBy(b.times(b)).plus(1)).sqrt().times(-1)
    }

    function solveHyperbolaForY(x, a, b) {
      return b.times(b).times(Decimal.ONE.minus(x.times(x).dividedBy(a.times(a)))).sqrt().times(-1)
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
        context.restore()
        context.save()
        context.beginPath()
        context.arc(curve[6], curve[7], 4, 0, 2 * Math.PI)
        context.fill()
        context.closePath()
        context.restore()
      }
    }

    function rotate(p, origin, theta) {
      if (isNaN(theta)) return p
      var x = p.x.minus(origin.x).times(Math.cos(theta)).minus(p.y.minus(origin.y).times(Math.sin(theta))).plus(origin.x),
          y = origin.x.minus(p.x).times(Math.sin(theta)).plus(origin.y.minus(p.y).times(Math.cos(theta))).plus(origin.y)

      return { x: x, y: y }
    }

    klass.prototype.print = function(text, x, y) {
      var context = this.getContext()
      context.save()
      context.fillStyle = '#FFF'
      context.shadowColor = '#000'
      context.shadowOffsetX = 1
      context.shadowOffsetY = 1
      context.shadowBlur = 1
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
