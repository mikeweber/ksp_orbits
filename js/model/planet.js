/* global FlightPlanner Decimal Object */

(function(namespace, helpers) {
  'use strict'

  namespace.Planet = (function() {
    var klass = function Planet(name, radius, mu,    semimajor_axis, anomaly, e, soi) {
      var pos = { r: semimajor_axis, phi: anomaly }
      this.initializeParameters(name, radius, mu, 0, semimajor_axis, pos, e, Math.PI / 2)
      this.soi             = new Decimal(soi)
      this.inner_soi_bb    = this.soi.toPower(2).dividedBy(2).sqrt()
      this.radius_inner_bb = this.getRadius().toPower(2).dividedBy(2).sqrt()
    }

    klass.prototype = Object.create(namespace.CelestialBody.prototype)
    klass.prototype.constructor = klass

    klass.prototype.step = function(t, dt) {
      this.pos = this.getPositionAtTime(t)
      this.dropBreadcrumb(t)
    }

    klass.prototype.getVelocity = function(t) {
      return this.getSystemMu().times(new Decimal(2).dividedBy(this.getDistanceFromParent()).minus(new Decimal(1).dividedBy(this.getSemiMajorAxis()))).sqrt()
    }

    klass.prototype.getDistanceFromParent = function() {
      return this.pos.r
    }

    klass.prototype.getEccentricity = function() {
      return this.e
    }

    klass.prototype.calcOrbitalParams = function() {
      var ae = this.e.times(this.getSemiMajorAxis()),
          pe = this.getSemiMajorAxis().minus(ae),
          ap = this.getSemiMajorAxis().plus(ae)

      return { pe: pe, ap: ap }
    }

    klass.prototype.getSemiMajorAxis = function() {
      return this.a
    }

    klass.prototype.getPrograde = function() {
      return this.pos.phi.minus(this.getZenithAngle())
    }

    klass.prototype.getZenithAngle = function() {
      var C  = this.getSystemMu().times(2).dividedBy(this.pos.r.times(this.getVelocity().toPower(2))),
          pe = this.calcOrbitalParams().pe

      return Math.asin(pe.dividedBy(this.pos.r).toPower(2).times(1 - C).plus(pe.dividedBy(this.pos.r).times(C)))
    }

    return klass
  })()
})(FlightPlanner.Model, FlightPlanner.Helper.Helper)
