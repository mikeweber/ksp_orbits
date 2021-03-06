(function(namespace, helpers) {
  namespace.PlanetRenderer = (function() {
    var klass = function PlanetRenderer(canvas, body, color, min_radius) {
      this.init(canvas)
      this.body       = body
      this.color      = color
      this.min_radius = min_radius
    }

    klass.prototype = Object.create(namespace.SceneRenderer.prototype)
    klass.prototype.constructor = klass

    klass.prototype.render = function(t) {
      this.renderBody(t)
      this.renderShadow(t)
      this.renderName(t)
    }

    klass.prototype.renderBody = function(t) {
      var ctx           = this.context,
          world_coords  = this.body.getCoordinates(t),
          coords        = this.convertWorldToCanvas(world_coords, t),
          planet_radius = this.getRadiusForRendering(),
          soi_radius    = this.getSOIRadiusForRendering()
      this.renderBreadcrumbs(t)
      this.renderFilledCircle(coords, planet_radius, { fill_style: this.color })
      if (soi_radius && soi_radius > planet_radius) {
        this.renderCircle(coords, soi_radius, { stroke_style: '#FFFFFF', line_width: 1 })
      }
    }

    klass.prototype.renderShadow = function(t) {
      if (!this.body.hasShadow()) return

      var context   = this.getContext(),
          coords    = this.convertWorldToCanvas(this.body.getCoordinates(t), t),
          radius    = this.getRadiusForRendering(),
          sun_angle = this.body.sunAngle(),
          start     = sun_angle.minus(Math.PI / 2),
          end       = sun_angle.plus(Math.PI / 2)
      context.save()
      context.beginPath()
      context.arc(coords.x, coords.y, radius, start, end)
      context.shadowBlur    = 20
      context.shadowOffsetX = 0
      context.shadowOffsetY = 0
      context.fillStyle     = 'rgba(0, 0, 0, 0.6)'
      context.shadowColor   = '#000000'
      context.fill()
      context.restore()
    }

    klass.prototype.renderName = function(t) {
      if (this.getZoom().lt(700) && !this.body.parentIsSun()) return

      var context = this.getContext(),
          coords  = this.convertWorldToCanvas(this.body.getCoordinates(t), t)
      context.save()
      context.textAlign     = 'center'
      context.textBaseline  = 'top'
      context.shadowColor   = '#000000'
      context.shadowOffsetX = 1
      context.shadowOffsetY = 1
      context.shadowBlur    = 1
      this.print(this.body.name, coords.x, coords.y)
      context.restore()
    }

    klass.prototype.getRadiusForRendering = function() {
      return Math.max(this.scaleWorldToCanvasX(this.body.radius), this.min_radius)
    }

    klass.prototype.getSOIRadiusForRendering = function() {
      if (!this.body.soi) return 0
      return this.scaleWorldToCanvasX(this.body.soi)
    }

    klass.prototype.renderBreadcrumbs = function(t) {
      var ctx = this.getContext()
      for (var i = this.body.breadcrumbs.length; i--; ) {
        var el     = this.body.breadcrumbs[i],
            coords = this.convertLocalToCanvas(el.parent, el.pos, t),
            color  = helpers.shadeRGBColor(this.color, -(this.body.breadcrumbs.length - i) * 0.005)
        coords.x = coords.x.toNumber()
        coords.y = coords.y.toNumber()

        this.renderFilledCircle(coords, 1, { fill_style: color })
      }
    }

    return klass
  })()
})(FlightPlanner.View, FlightPlanner.Helper.Helper)
