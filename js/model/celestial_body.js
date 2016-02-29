/* global Decimal FlightPlanner */
var last = {};

(function(namespace, helpers, makeObservable, calculators) {
  'use strict'

  namespace.CelestialBody = (function() {
    var klass = function CelestialBody() {}

    klass.prototype.initializeParameters = function(name, radius, mu, v, semimajor_axis, pos, arg_of_pe, e, prograde) {
      this.name             = name
      this.radius           = new Decimal(radius)
      this.mu               = new Decimal(mu)
      this.v                = new Decimal(v)
      this.a                = new Decimal(semimajor_axis)
      this.pos              = { r: new Decimal(pos.r), phi: new Decimal(pos.phi) }
      this.setInitMeanAnomaly(this.pos.phi)
      this.setArgumentOfPeriapsis(arg_of_pe)
      this.e                = new Decimal(e)
      this.setCartesianPrograde(prograde)
      this.last_breadcrumb  = 0
      this.breadcrumb_delta = WEEK
      this.trail_length     = 0
      this.breadcrumbs      = []
      this.bodies_in_soi    = []
    }

    klass.prototype.setMotionCalculator = function(calc) {
      for (var x in calc) {
        if (calc.hasOwnProperty(x)) {
          this[x] = calc[x]
        }
      }
    }

    klass.prototype.setCartesianPrograde = function(prograde) {
      this.prograde = new Decimal(prograde)
    }

    klass.prototype.getPeriapsis = function() {
      var a  = this.getSemiMajorAxis(),
          ae = this.getEccentricity().times(a)

      return a.minus(ae)
    }

    klass.prototype.getApoapsis = function() {
      var a  = this.getSemiMajorAxis(),
          ae = this.getEccentricity().times(a)

      return a.plus(ae)
    }

    klass.prototype.hasShadow = function() { return true }

    klass.prototype.sunAngle = function(t) {
      var pos = this.getCoordinates(t)
      return new Decimal(Math.atan2(pos.y, pos.x))
    }

    klass.prototype.addChild = function(child) {
      this.registerChildBody(child)
      child.setParent(this)
    }

    klass.prototype.setParent = function(parent) {
      this.parent = parent
    }

    klass.prototype.parentIsSun = function() {
      return this.parent.name === 'Kerbol'
    }

    klass.prototype.registerChildBody = function(body) {
      this.bodies_in_soi.push(body)
    }

    klass.prototype.getOrbitalPeriod = function() {
      return this.getSemiMajorAxis().toPower(3).dividedBy(this.getSystemMu()).sqrt().times((2 * Math.PI))
    }

    klass.prototype.timeToPeriapsis = function(t) {
      if (this.getEccentricity().gt(1)) {
        return this.getSemiMajorAxis().toPower(3).times(-1).dividedBy(this.getSystemMu()).sqrt().times(this.getMeanAnomaly(t))
      } else {
        return this.getMeanAnomaly(t).times(this.getOrbitalPeriod()).dividedBy(Math.TAU)
      }
    }

    klass.prototype.timeToApoapsis = function(t) {
      if (this.getEccentricity().gt(1)) {
        return new Decimal()
      } else {
        return this.getOrbitalPeriod().times(((Math.PI - this.getMeanAnomaly(t)) / Math.TAU) % 1)
      }
    }

    klass.prototype.getPositionAtTime = function(t) {
      var one  = new Decimal(1),
          M    = this.getMeanAnomaly(t),
          a    = this.getSemiMajorAxis(),
          e    = this.getEccentricity(),
          S    = new Decimal(Math.sin(-M)),
          C    = new Decimal(Math.cos(-M)),
          phi  = new Decimal(Math.atan2(one.minus(e.toPower(2)).times(S), C.minus(e))),
          r    = a.times(one.minus(e.toPower(2)).dividedBy(one.plus(e.times(Math.cos(phi)))))

      return { r: r, phi: phi }
    }

    klass.prototype.getClampedMeanAnomaly = function(t) {
      return helpers.clampRadians(this.getMeanAnomaly(t))
    }

    klass.prototype.getMeanMotion = function() {
      // Use the absolute value of the semi-major axis so the mean motion equation
      // continues to work for hyperbolic orbits
      return this.getSystemMu().dividedBy(this.getSemiMajorAxis().abs().toPower(3)).sqrt()
    }

    klass.prototype.getInitMeanAnomaly = function() {
      return this.m
    }

    klass.prototype.setInitMeanAnomaly = function(m) {
      this.m = helpers.clampRadians(m)
    }

    klass.prototype.setArgumentOfPeriapsis = function(pe) {
      this.arg_of_pe = new Decimal(pe)
    }

    klass.prototype.getSystemMu = function() {
      return this.getParentMu()
    }

    klass.prototype.getParentMu = function() {
      return this.parent.mu
    }

    klass.prototype.setTime = function(t) {
      this.launch_time = new Decimal(t)
      this.t = new Decimal(t)
    }

    klass.prototype.setLaunchTime = function(time) {
      this.launch_time = time
    }

    klass.prototype.getLaunchTime = function() {
      return this.launch_time
    }

    klass.prototype.getHeadingX = function() {
      return new Decimal(Math.cos(this.getHeading()))
    }

    klass.prototype.getHeadingY = function() {
      return new Decimal(Math.sin(this.getHeading()))
    }

    klass.prototype.getCartesianProgradeX = function(t) {
      return new Decimal(Math.cos(this.getCartesianPrograde(t)))
    }

    klass.prototype.getCartesianProgradeY = function(t) {
      return new Decimal(Math.sin(this.getCartesianPrograde(t)))
    }

    klass.prototype.getCoordinates = function(t) {
      var coords = this.getLocalCoordinates(t),
          parent = this.parent.getCoordinates(t)
      return { x: coords.x.plus(parent.x), y: coords.y.plus(parent.y) }
    }

    klass.prototype.getLocalCoordinates = function(t) {
      return helpers.posToCoordinates({ r: this.pos.r, phi: this.getCartesianAngle(t) })
    }

    klass.prototype.getGravityWellX = function() {
      return new Decimal(Math.cos(this.pos.phi))
    }

    klass.prototype.getGravityWellY = function() {
      return new Decimal(Math.sin(this.pos.phi))
    }

    klass.prototype.dropBreadcrumb = function(t) {
      if (t - this.last_breadcrumb < this.breadcrumb_delta) return

      this.breadcrumbs.push({ parent: this.parent, pos: Object.create(this.pos) })
      this.last_breadcrumb = t
      if (this.trail_length >=0 && this.breadcrumbs.length >= this.trail_length) {
        this.breadcrumbs.shift()
      }
    }

    klass.prototype.getRadius = function() {
      return this.radius
    }

    klass.prototype.getMissionTime = function(t) {
      return t.minus(this.launch_time)
    }

    klass.prototype.getParent = function() {
      return this.parent
    }

    klass.prototype.getBodiesInSOI = function() {
      return this.bodies_in_soi
    }

    klass.prototype.getParentCoordinates = function(t) {
      return this.getParent().getCoordinates(t)
    }

    klass.prototype.isInSOI = function(ship, t) {
      return detectIntersection(ship.getCoordinates(t), this.getCoordinates(t), this.getSOI(), this.inner_soi_bb)
    }

    klass.prototype.getSOI = function() {
      return this.soi
    }

    klass.prototype.isColliding = function(ship, t) {
      return detectIntersection(ship.getCoordinates(t), this.getCoordinates(t), this.getRadius(), this.radius_inner_bb)
    }

    function detectIntersection(obj1_coords, obj2_coords, outerbb, innerbb) {
      var dist_x = obj1_coords.x.minus(obj2_coords.x).abs(),
          dist_y = obj1_coords.y.minus(obj2_coords.y).abs()

      // Optimized detection;
      // SOI intersection not possible when dist in x or y axis is larger than the radius
      if (dist_x.gt(outerbb) || dist_y.gt(outerbb)) return false
      // If the ship is within the inner bounding box (the largest square that can fit in the SOI),
      // then it is definitely within the SOI
      if (dist_x.lt(innerbb) && dist_y.lt(innerbb)) return true
      // Finally fall through and check the edge case by looking at the distance between the ships
      return helpers.calcCoordDistance(obj1_coords, obj2_coords).lessThan(outerbb)
    }

    makeObservable.bind(this)(klass)

    return klass
  })()
})(FlightPlanner.Model, FlightPlanner.Helper.Helper, FlightPlanner.Helper.makeObservable, { momentum: FlightPlanner.Model.MomentumBody, acceleration: FlightPlanner.Model.AcceleratingBody })
