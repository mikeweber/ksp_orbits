/* global FlightPlanner Decimal Object */

(function(namespace, calculator){
  'use strict'

  namespace.Sun = (function() {
    var zero = new Decimal(0)
    var klass = function Sun(mu, radius) {
      this.setMotionCalculator(calculator)
      this.initializeParameters('Kerbol', radius, mu, 0, 0, { 'r': 0, phi: 0 }, 0, 0, 0)
    }

    klass.prototype = Object.create(namespace.CelestialBody.prototype)
    klass.prototype.constructor = klass

    klass.prototype.step              = function() {}
    klass.prototype.dropBreadcrumb    = function() {}
    klass.prototype.renderBreadcrumbs = function() {}
    klass.prototype.getOrbitalPeriod  = function() {}
    klass.prototype.isInSOI           = function() { return true }
    klass.prototype.getParent         = function() { return this }
    klass.prototype.getCoordinates    = function() { return { x: zero, y: zero } }
    klass.prototype.parentIsSun       = function() { return true }
    klass.prototype.getSun            = function() { return this }
    klass.prototype.hasShadow         = function() { return false }
    klass.prototype.getPeriapsis      = function() { return zero }
    klass.prototype.getApoapsis       = function() { return zero }
    klass.prototype.getEccentricity   = function() { return zero }
    klass.prototype.getMeanMotion     = function() { return zero }
    klass.prototype.getParentMu       = function() { return zero }

    return klass
  })()
})(FlightPlanner.Model, FlightPlanner.Model.MomentumBody)
