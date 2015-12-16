/* global Decimal FlightPlanner */

(function(namespace, helpers, makeObservable) {
  'use strict'

  namespace.CelestialBody = (function() {
    var klass = function CelestialBody() {}

    klass.prototype.initializeParameters = function(name, radius, mu, v, semimajor_axis, pos, e, prograde) {
      this.name     = name
      this.radius   = new Decimal(radius)
      this.mu       = new Decimal(mu)
      this.v        = new Decimal(v)
      this.a        = new Decimal(semimajor_axis)
      this.pos      = { r: new Decimal(pos.r), phi: new Decimal('' + pos.phi) }
      this.m        = new Decimal('' + this.pos.phi)
      this.e        = new Decimal(e)
      this.prograde = new Decimal('' + prograde)
      this.last_breadcrumb  = 0
      this.breadcrumb_delta = WEEK
      this.trail_length     = 0
      this.breadcrumbs      = []
      this.bodies_in_soi    = []
    }

    klass.prototype.hasShadow = function() { return true }

    klass.prototype.sunAngle = function() {
      var pos = this.getCoordinates()
      return new Decimal('' + Math.atan2(pos.y, pos.x))
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
      return this.getSemiMajorAxis().toPower(3).dividedBy(this.getSystemMu()).sqrt().times('' + (2 * Math.PI))
    }

    klass.prototype.getSemiMajorAxis = function() {
      var orbital_params = this.calcOrbitalParams()
      return orbital_params.pe.plus(orbital_params.ap).dividedBy(2)
    }

    klass.prototype.calcOrbitalParams = function() {
      // Equation 4.26 from http://www.braeunig.us/space/orbmech.htm
      var C   = this.parent.mu.times(2).dividedBy(this.pos.r.times(this.getVelocity().toPower(2))),
          tmp = C.toPower(2).minus(
            new Decimal(1).minus(C).times(4).times(
              new Decimal('' + Math.sin(this.getGamma())).toPower(2).times(-1)
            )
          ).sqrt(),
          den = new Decimal(1).minus(C).times(2),
          r1  = C.times(-1).plus(tmp).dividedBy(den).times(this.pos.r),
          r2  = C.times(-1).minus(tmp).dividedBy(den).times(this.pos.r),
          ap  = new Decimal('' + Math.max(r1, r2)),
          pe  = new Decimal('' + Math.min(r1, r2))

      return { ap: ap, pe: pe }
    }

    klass.prototype.getArgumentOfPeriapsis = function() {
      var theta = this.getTrueAnomaly(),
          pro   = this.getPrograde(),
          phi   = this.pos.phi,
          diff  = phi.minus(pro).plus('' + Math.PI).mod('' + 2 * Math.PI).minus('' + Math.PI),
          qrt   = new Decimal('' + Math.PI / 2)

      if (-qrt <=  diff && diff <= qrt) theta = -theta

      return this.pos.phi.minus('' + theta)
    }

    klass.prototype.getTrueAnomaly = function() {
      var one   = new Decimal(1),
          a     = this.getSemiMajorAxis(),
          e     = this.getEccentricity(),
          r     = this.pos.r,
          theta = Math.acos(a.times(one.minus(e.times(e))).minus(r).dividedBy(e.times(r)))

      return theta
    }

    klass.prototype.getEccentricAnomaly = function(M, e, guess, tries) {
      if (typeof e === 'undefined') e = this.getEccentricity()
      if (typeof guess === 'undefined') guess = M
      if (typeof tries === 'undefined') tries = 1

      var anom = guess.minus(guess.minus(M.plus(e.times('' + Math.sin(guess)))).dividedBy(new Decimal(1).minus(e.times('' + Math.cos(guess)))))
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
          S    = new Decimal('' + Math.sin(-M)),
          C    = new Decimal('' + Math.cos(-M)),
          phi  = new Decimal('' + Math.atan2(one.minus(e.toPower(2)).times(S), C.minus(e))),
          r    = a.times(one.minus(e.toPower(2)).dividedBy(one.plus(e.times('' + Math.cos(phi)))))

      return { r: r, phi: phi }
    }

    klass.prototype.getMeanAnomaly = function(t) {
      return this.getInitMeanAnomaly().plus(this.getMeanMotion().times(t))
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

    klass.prototype.getVelocity = function() {
      return this.v
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

    klass.prototype.getEccentricity = function() {
      // Equation 4.27 from http://www.braeunig.us/space/orbmech.htm
      var p1 = this.pos.r.times(this.getVelocity().toPower(2)).dividedBy(this.parent.mu).minus(1).toPower(2),
          p2 = new Decimal('' + Math.sin(this.getGamma())).toPower(2),
          p3 = new Decimal('' + Math.cos(this.getGamma())).toPower(2)

      return p1.times(p2).plus(p3).sqrt()
    }

    klass.prototype.getGamma = function() {
      return this.getPrograde().minus(this.pos.phi)
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
})(FlightPlanner.Model, FlightPlanner.Helper.Helper, FlightPlanner.Helper.makeObservable)
