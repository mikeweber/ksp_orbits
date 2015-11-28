/* global FlightPlanner Decimal Object */

(function(namespace, helpers) {
  'use strict'

  namespace.Planet = (function() {
    var klass = function Planet(name, parent, radius, color, mu,    semimajor_axis, anomoly, e, soi) {
      var pos = { r: semimajor_axis, phi: anomoly }
      this.initializeParameters(name, parent, radius, color, mu, 0, semimajor_axis, pos, e, Math.PI / 2)
      this.soi             = new Decimal(soi)
      this.inner_soi_bb    = this.soi.toPower(2).dividedBy(2).sqrt()
      this.radius_inner_bb = this.getRadius().toPower(2).dividedBy(2).sqrt()
      this.trail_length    = Math.floor(this.getOrbitalPeriod() / WEEK)
      if (this.getOrbitalPeriod().lt(WEEK * 4)) {
        this.breadcrumb_delta
      }
    }

    klass.prototype = Object.create(namespace.CelestialBody.prototype)
    klass.prototype.constructor = klass

    klass.prototype.step = function(t, dt) {
      var one  = new Decimal(1),
          M    = this.getMeanAnomoly(t),
          e    = this.getEccentricity(),
          anom = M.plus(e.times(2).times('' + Math.sin(M))).plus(new Decimal(1.25).times(e.toPower(2)).times('' + Math.sin(M.times(2)))),
          S    = new Decimal('' + Math.sin(-M)),
          C    = new Decimal('' + Math.cos(-M)),
          phi  = new Decimal('' + Math.atan2(one.minus(e.toPower(2)).times(S), C.minus(e))),
          r    = this.a.times(one.minus(e.toPower(2)).dividedBy(one.plus(e.times('' + Math.cos(anom)))))
      this.pos = { r: r, phi: phi }
      this.dropBreadcrumb(t)
    }

    klass.prototype.getSemiMajorAxis = function() {
      return this.a
    }

    klass.prototype.getPrograde = function() {
      return this.pos.phi.minus('' + Math.PI / 2)
    }

    klass.prototype.getVelocity = function(t) {
      return this.parent.mu.plus(this.mu).times(new Decimal(2).dividedBy(this.getDistanceFromParent()).minus(new Decimal(1).dividedBy(this.getSemiMajorAxis()))).sqrt()
    }

    klass.prototype.getDistanceFromParent = function() {
      return this.pos.r
    }

    klass.prototype.getEccentricity = function() {
      return this.e
    }

    klass.prototype.getMeanAnomoly = function(t) {
      return this.mu.plus(this.parent.mu).dividedBy(this.a.toPower(3)).sqrt().times(t).plus(this.m)
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

    return klass
  })()
})(FlightPlanner.Model, FlightPlanner.Helper.Helper)
