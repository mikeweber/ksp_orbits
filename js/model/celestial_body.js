/* global Decimal FlightPlanner */
var last = {};

(function(namespace, helpers, makeObservable, calculators) {
  'use strict'

  namespace.CelestialBody = (function() {
    var klass = function CelestialBody() {}

    klass.prototype.initializeParameters = function(name, radius, mu, v, semimajor_axis, pos, e, prograde) {
      this.name             = name
      this.radius           = new Decimal(radius)
      this.mu               = new Decimal(mu)
      this.v                = new Decimal(v)
      this.a                = new Decimal(semimajor_axis)
      this.pos              = { r: new Decimal(pos.r), phi: new Decimal(pos.phi) }
      this.m                = new Decimal(this.pos.phi)
      this.e                = new Decimal(e)
      this.prograde         = new Decimal(prograde)
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

    klass.prototype.sunAngle = function() {
      var pos = this.getCoordinates()
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

    klass.prototype.getArgumentOfPeriapsis = function(t) {
      return this.pos.phi.plus(this.getTrueAnomaly(t))
    }

    klass.prototype.getTrueAnomaly = function(t) {
      var one   = new Decimal(1),
          a     = this.getSemiMajorAxis(),
          e     = this.getEccentricity(),
          r     = this.pos.r,
          m     = this.getClampedMeanAnomaly(t),
          theta = Math.acos(a.times(one.minus(e.times(e))).minus(r).dividedBy(e.times(r)))

      if (m > Math.PI) theta = -theta

      return theta
    }

    klass.prototype.getEccentricAnomaly = function(M, e, guess, tries) {
      if (typeof e === 'undefined') e = this.getEccentricity()
      if (typeof guess === 'undefined') guess = M
      if (typeof tries === 'undefined') tries = 1

      var anom = guess.minus(guess.minus(M.plus(e.times(Math.sin(guess)))).dividedBy(new Decimal(1).minus(e.times(Math.cos(guess)))))
      if (tries > 30 || anom.minus(guess).abs().lt(0.0001)) {
        return anom
      } else {
        return this.getEccentricAnomaly(M, e, anom, tries + 1)
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
      return clampRadians(this.getMeanAnomaly(t))
    }

    klass.prototype.getMeanMotion = function() {
      return this.getSystemMu().dividedBy(this.getSemiMajorAxis().toPower(3)).sqrt()
    }

    klass.prototype.getInitMeanAnomaly = function() {
      return this.m
    }

    klass.prototype.getSystemMu = function() {
      return this.mu.plus(this.getParentMu())
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

    klass.prototype.getProgradeX = function(t) {
      return new Decimal(Math.cos(this.getPrograde(t)))
    }

    klass.prototype.getProgradeY = function(t) {
      return new Decimal(Math.sin(this.getPrograde(t)))
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

    klass.prototype.getParentCoordinates = function() {
      return this.getParent().getCoordinates()
    }

    klass.prototype.isInSOI = function(ship) {
      return detectIntersection(ship.getCoordinates(), this.getCoordinates(), this.soi, this.inner_soi_bb)
    }

    klass.prototype.isColliding = function(ship) {
      return detectIntersection(ship.getCoordinates(), this.getCoordinates(), this.getRadius(), this.radius_inner_bb)
    }

    klass.prototype.getDistanceFromParent = function() {
      return this.pos.r
    }

    function clampRadians(n) {
      return ((n % Math.PI2) + Math.PI2) % Math.PI2
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
