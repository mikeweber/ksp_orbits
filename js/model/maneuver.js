/* global FlightPlanner */

(function(namespace, $) {
  'use strict'

  namespace.Maneuver = (function() {
    var klass = function Maneuver(ship, condition, status_tracker, heading, absolute_heading, throttle) {
      this.ship           = ship
      this.condition      = condition
      this.status_tracker = status_tracker
      this.heading        = heading
      this.absolute       = absolute_heading
      this.throttle       = throttle
      this.deferred       = $.Deferred()
    }

    klass.prototype.run = function(t) {
      if (!this.isReady(t, this.ship)) return false

      this.ship.setHeading(this.heading, this.absolute)
      this.ship.setThrottle(this.throttle)
      this.alertCourseChange(t)
      return true
    }

    klass.prototype.isReady = function(t) {
      return this.condition(t, this.ship)
    }

    klass.prototype.alertCourseChange = function(t) {
      this.getDeferred().resolve(this.status_tracker, this.ship, t)
    }

    klass.prototype.getDeferred = function() {
      return this.deferred
    }

    return klass
  })()
})(FlightPlanner.Model, jQuery)
