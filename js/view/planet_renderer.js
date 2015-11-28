(function(namespace) {
  namespace.PlanetRenderer = (function() {
    var klass = function PlanetRenderer() {}

    klass.prototype.setParentRenderer = function(parent) {
      this.parent_renderer = parent
      this.context = this.parent_renderer.getContext()
    }

    klass.prototype.render = function(body) {
      var ctx           = this.context,
          world_coords  = body.getCoordinates(),
          coords        = this.convertWorldToCanvas(world_coords),
          planet_radius = body.getRadiusForRendering(this.parent_renderer),
          soi_radius    = body.getSOIRadiusForRendering(this.parent_renderer)

      ctx.beginPath()
      ctx.arc(coords.x, coords.y, planet_radius, 0, 2 * Math.PI)
      ctx.fillStyle = body.color
      ctx.fill()
      if (soi_radius && soi_radius > planet_radius) {
        ctx.beginPath()
        ctx.arc(coords.x, coords.y, soi_radius, 0, 2 * Math.PI)
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 1
        ctx.stroke()
      }
      body.renderName(this.parent_renderer, coords)
    }

    klass.prototype.convertWorldToCanvas  = function(coords) {
      return this.parent_renderer.convertWorldToCanvas(coords)
    }

    return klass
  })()
})(FlightPlanner.View)
