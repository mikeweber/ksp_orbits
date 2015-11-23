/* global Decimal FlightPlanner */

(function(namespace, helpers) {
  'use strict'

  namespace.CelestialBody = (function() {
    var klass = function CelestialBody() {}

    klass.prototype.initializeParameters = function(name, parent, radius, color, mu, v, semimajor_axis, pos, e, prograde) {
      this.name     = name
      this.parent   = parent
      if (this.parent) this.parent.registerChildBody(this)
      this.radius   = new Decimal(radius)
      this.color    = color
      this.mu       = new Decimal(mu)
      this.v        = new Decimal(v)
      this.a        = new Decimal(semimajor_axis)
      this.pos      = { 'r': new Decimal(pos.r), phi: new Decimal('' + pos.phi) }
      this.m        = this.pos.phi
      this.e        = new Decimal(e)
      this.prograde = new Decimal('' + prograde)
      this.last_breadcrumb  = 0
      this.breadcrumb_delta = WEEK
      this.trail_length     = 75
      this.breadcrumbs      = []
      this.bodies_in_soi    = []
      this.soi_observers    = []
    }

    klass.prototype.parentIsSun = function() {
      return this.parent.name === 'Kerbol'
    }

    klass.prototype.registerChildBody = function(body) {
      this.bodies_in_soi.push(body)
    }

    klass.prototype.getOrbitalPeriod = function() {
      return this.getSemiMajorAxis().toPower(3).dividedBy(this.mu).sqrt().times('' + (2 * Math.PI))
    }

    klass.prototype.getSemiMajorAxis = function() {
      // TODO: figure this out
      return new Decimal(1000)
    }

    klass.prototype.setTime = function(t) {
      this.launch_time = new Decimal(t)
      this.t = new Decimal(t)
    }

    klass.prototype.getLaunchTime = function() {
      return this.launch_time
    }

    klass.prototype.getHeadingX = function() {
      return new Decimal('' + Math.cos(this.getHeading()))
    }

    klass.prototype.getHeadingY = function() {
      return new Decimal('' + Math.sin(this.getHeading()))
    }

    klass.prototype.getHeading = function() {
      return this.getPrograde()
    }

    klass.prototype.getProgradeX = function() {
      return new Decimal('' + Math.cos(this.getPrograde()))
    }

    klass.prototype.getProgradeY = function() {
      return new Decimal('' + Math.sin(this.getPrograde()))
    }

    klass.prototype.getPrograde = function() {
      return this.prograde
    }

    klass.prototype.getLocalCoordinates = function() {
      return helpers.posToCoordinates(this.pos)
    }

    klass.prototype.getCoordinates = function() {
      var coords = this.getLocalCoordinates(),
          parent = this.parent.getCoordinates()
      return { x: coords.x.plus(parent.x), y: coords.y.plus(parent.y) }
    }

    klass.prototype.getGravityWellX = function() {
      return new Decimal('' + Math.cos(this.pos.phi))
    }

    klass.prototype.getGravityWellY = function() {
      return new Decimal('' + Math.sin(this.pos.phi))
    }

    klass.prototype.render = function(renderer) {
      var ctx           = renderer.context,
          world_coords  = this.getCoordinates(),
          coords        = renderer.convertWorldToCanvas(world_coords),
          planet_radius = this.getRadiusForRendering(renderer),
          soi_radius    = this.getSOIRadiusForRendering(renderer)

      ctx.beginPath()
      ctx.arc(coords.x, coords.y, planet_radius, 0, 2 * Math.PI)
      ctx.fillStyle = this.color
      ctx.fill()
      if (soi_radius && soi_radius > planet_radius) {
        ctx.beginPath()
        ctx.arc(coords.x, coords.y, soi_radius, 0, 2 * Math.PI)
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 1
        ctx.stroke()
      }
      this.renderName(renderer, coords)
    }

    klass.prototype.renderName = function(renderer, coords) {
      if (renderer.getZoom().lt(700) && !this.parentIsSun()) return

      renderer.context.textAlign = 'center'
      renderer.context.textBaseline = 'top'
      renderer.context.shadowColor = '#000000'
      renderer.context.shadowOffsetX = 1
      renderer.context.shadowOffsetY = 1
      renderer.context.shadowBlur = 1
      renderer.print(this.name, coords.x, coords.y)
    }

    klass.prototype.getSOIRadiusForRendering = function(renderer) {
      if (!this.soi) return 0
      return renderer.scaleWorldToCanvasX(this.soi)
    }

    klass.prototype.dropBreadcrumb = function(t) {
      if (t - this.last_breadcrumb < this.breadcrumb_delta) return

      this.breadcrumbs.push({ parent: this.parent, pos: Object.create(this.pos) })
      this.last_breadcrumb = t
      if (this.trail_length >=0 && this.breadcrumbs.length >= this.trail_length) {
        this.breadcrumbs.shift()
      }
    }

    klass.prototype.renderBreadcrumbs = function(renderer) {
      var ctx = renderer.context
      for (var i = this.breadcrumbs.length; i--; ) {
        var el     = this.breadcrumbs[i],
            coords = renderer.convertLocalToCanvas(el.parent, el.pos)
        ctx.beginPath()
        ctx.arc(coords.x, coords.y, 1, 0, 2 * Math.PI)
        var color = helpers.shadeRGBColor(this.color, -(this.breadcrumbs.length - i) * 0.005)
        ctx.fillStyle = color
        ctx.fill()
      }
    }

    klass.prototype.getRadiusForRendering = function(renderer) {
      return Math.max(renderer.scaleWorldToCanvasX(this.radius), 4)
    }

    klass.prototype.getRadius = function() {
      return this.radius
    }

    klass.prototype.getVelocity = function() {
      return this.v
    }

    klass.prototype.getMissionTime = function(t) {
      return t.minus(this.launch_time)
    }

    klass.prototype.registerFlightPlan = function() {}

    klass.prototype.registerSOIChangeObserver = function(observer) {
      this.soi_observers.push(observer)
    }

    klass.prototype.runManeuvers = function(t) {
      if (this.plan) {
        this.plan.activateManeuvers(t)
      }
    }

    klass.prototype.getParent = function() {
      return this.parent
    }

    klass.prototype.getBodiesInSOI = function() {
      return this.bodies_in_soi
    }

    return klass
  })()
})(FlightPlanner.Model, FlightPlanner.Helper.Helper)
