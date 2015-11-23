/* global FlightPlanner */

(function(namespace, $) {
  'use strict'

  namespace.Maneuver = (function() {
    var klass = function Maneuver(ship, condition, heading, absolute_heading, throttle) {
      this.ship        = ship
      this.condition   = condition
      this.heading     = heading
      this.absolute    = absolute_heading
      this.throttle    = throttle
      this.deferred    = $.Deferred()
    }

    klass.prototype.activate = function(t) {
      if (!this.ready(t, this.ship)) return false

      this.ship.setHeading(this.heading, this.absolute)
      this.ship.setThrottle(this.throttle)
      this.alertCourseChange(t)
      return true
    }

    klass.prototype.ready = function(t) {
      return this.condition(t, this.ship)
    }

    klass.prototype.alertCourseChange = function(t) {
      this.getDeferred().resolve(this.ship.getObservers(), this.ship, t)
    }

    klass.prototype.getDeferred = function() {
      return this.deferred
    }

    return klass
  })()
})(FlightPlanner.Model, jQuery)
