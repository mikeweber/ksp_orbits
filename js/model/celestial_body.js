/* global Decimal FlightPlanner */

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
      this.last_breadcrumb  = new Decimal(-1000)
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
          phi  = this.getArgumentOfPeriapsis().minus(Math.atan2(one.minus(e.toPower(2)).times(S), C.minus(e))),
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

    klass.prototype.setTarget = function(target) {
      this.target = target
    }

    klass.prototype.getTarget = function() {
      return this.target
    }

    klass.prototype.getHeadingX = function(t) {
      return new Decimal(Math.cos(this.getHeading(t)))
    }

    klass.prototype.getHeadingY = function(t) {
      return new Decimal(Math.sin(this.getHeading(t)))
    }

    klass.prototype.getCartesianProgradeX = function(t) {
      return new Decimal(Math.cos(this.getCartesianPrograde(t)))
    }

    klass.prototype.getCartesianProgradeY = function(t) {
      return new Decimal(Math.sin(this.getCartesianPrograde(t)))
    }

    klass.prototype.getCartesianAngleFromBody = function(t, parent) {
      var body_pos   = this.getCoordinates(t),
          parent_pos = parent.getCoordinates(t)

      return helpers.clampRadians(new Decimal(Math.atan2(body_pos.y.minus(parent_pos.y), body_pos.x.minus(parent_pos.x))))
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
      if (t.minus(this.last_breadcrumb).toNumber() < this.breadcrumb_delta) return

      var parent = this.getKerbinOrParent()
      var pos = this.pos
      if (parent !== this.getParent()) {
        pos = this.convertPositionToDifferentOrigin(parent, t)
      }
      this.breadcrumbs.push({ parent: parent, pos: Object.create(pos) })
      this.last_breadcrumb = t
      if (this.trail_length >=0 && this.breadcrumbs.length >= this.trail_length) {
        this.breadcrumbs.shift()
      }
    }

    klass.prototype.convertPositionToDifferentOrigin = function(origin, t) {
      var origin_coords = origin.getCoordinates(t)
      var my_coords = this.getCoordinates(t)
      return this.convertCoordsToPosition({ x: new Decimal(my_coords.x - origin_coords.x), y: new Decimal(my_coords.y - origin_coords.y) })
    }

    klass.prototype.getKerbinOrParent = function() {
      return getKerbin(this.getParent()) || this.parent
    }

    function getKerbin(parent) {
      if (!parent || parent.name === 'Kerbol') return null

      if (parent.name === 'Kerbin') {
        return parent
      } else {
        return getKerbin(parent.getParent())
      }
    }

    klass.prototype.convertCoordsToPosition = function(coords) {
      var distance = coords.x.toPower(2).plus(coords.y.toPower(2)).sqrt(),
          phi      = new Decimal(Math.atan2(coords.y, coords.x))

      return { 'r': distance, phi: phi }
    }

    // assumes a common parent body
    klass.prototype.getPhaseAngle = function(other_body, t) {
      return helpers.clampRadians(other_body.getCartesianAngle(t).minus(this.getCartesianAngle(t)))
    }

    // Return the sun to parent to ship angle
    klass.prototype.getAngle = function(other_body, t) {
      var other_position  = other_body.getCoordinates(t)
      var body_position   = this.getCoordinates(t)
      var kerbol_angle    = Math.atan2(other_position.y.times(-1).toNumber(), other_position.x.times(-1).toNumber())
      var body_angle      = Math.atan2(body_position.y.minus(other_position.y).toNumber(), body_position.x.minus(other_position.x).toNumber())

      return helpers.clampRadians(body_angle - kerbol_angle)
    }

    klass.prototype.getRadius = function() {
      return this.radius
    }

    klass.prototype.getMissionTime = function(t) {
      if (!this.launch_time) return

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
