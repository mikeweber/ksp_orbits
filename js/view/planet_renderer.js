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

    klass.prototype.render = function() {
      var ctx           = this.context,
          world_coords  = this.body.getCoordinates(),
          coords        = this.convertWorldToCanvas(world_coords),
          planet_radius = this.getRadiusForRendering(),
          soi_radius    = this.getSOIRadiusForRendering()
      this.renderBreadcrumbs()
      this.renderFilledCircle(coords, planet_radius, { fill_style: this.color })
      if (soi_radius && soi_radius > planet_radius) {
        this.renderCircle(coords, soi_radius, { stroke_style: '#FFFFFF', line_width: 1 })
      }
      this.renderName()
    }

    klass.prototype.renderName = function() {
      if (this.getZoom().lt(700) && !this.body.parentIsSun()) return

      var context = this.getContext(),
          coords  = this.convertWorldToCanvas(this.body.getCoordinates())
      context.textAlign     = 'center'
      context.textBaseline  = 'top'
      context.shadowColor   = '#000000'
      context.shadowOffsetX = 1
      context.shadowOffsetY = 1
      context.shadowBlur    = 1
      this.print(this.body.name, coords.x, coords.y)
    }

    klass.prototype.getRadiusForRendering = function() {
      return Math.max(this.scaleWorldToCanvasX(this.body.radius), this.min_radius)
    }

    klass.prototype.getSOIRadiusForRendering = function() {
      if (!this.body.soi) return 0
      return this.scaleWorldToCanvasX(this.body.soi)
    }

    klass.prototype.renderBreadcrumbs = function() {
      var ctx = this.getContext()
      for (var i = this.body.breadcrumbs.length; i--; ) {
        var el     = this.body.breadcrumbs[i],
            coords = this.convertLocalToCanvas(el.parent, el.pos),
            color  = helpers.shadeRGBColor(this.color, -(this.body.breadcrumbs.length - i) * 0.005)
        this.renderFilledCircle(coords, 1, { fill_style: color })
      }
    }

    return klass
  })()
})(FlightPlanner.View, FlightPlanner.Helper.Helper)
