/* global FlightPlanner Decimal Object */

(function(namespace, helpers, calculator) {
  'use strict'

  namespace.Planet = (function() {
    var klass = function Planet(name, radius, mu,    semimajor_axis, anomaly, arg_of_pe, e, soi) {
      this.setMotionCalculator(calculator)
      var pos = { r: semimajor_axis, phi: anomaly }
      this.initializeParameters(name, radius, mu, 0, semimajor_axis, pos, arg_of_pe, e, Math.PI / 2)
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

    return klass
  })()
})(FlightPlanner.Model, FlightPlanner.Helper.Helper, FlightPlanner.Model.MomentumBody)
