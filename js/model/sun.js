/* global FlightPlanner Decimal Object */

(function(namespace){
  'use strict'

  namespace.Sun = (function() {
    var klass = function Sun(mu, radius) {
      this.initializeParameters('Kerbol', radius, mu, 0, 0, { 'r': 0, phi: 0 }, 0, 0, 0)
      this.coordinates = { x: new Decimal(0), y: new Decimal(0) }
    }

    klass.prototype = Object.create(namespace.CelestialBody.prototype)
    klass.prototype.constructor = klass

    klass.prototype.step              = function() {}
    klass.prototype.dropBreadcrumb    = function() {}
    klass.prototype.renderBreadcrumbs = function() {}
    klass.prototype.getOrbitalPeriod  = function() {}
    klass.prototype.isInSOI           = function() { return true }
    klass.prototype.getParent         = function() { return this }
    klass.prototype.getCoordinates    = function() { return this.coordinates }
    klass.prototype.parentIsSun       = function() { return true }
    klass.prototype.getSun            = function() { return this }
    klass.prototype.hasShadow         = function() { return false }

    return klass
  })()
})(FlightPlanner.Model)
