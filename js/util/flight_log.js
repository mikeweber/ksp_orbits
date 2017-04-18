/* global FlightPlanner */
(function(namespace, helpers, makeObservable) {
  'use strict'

  namespace.FlightLog = (function() {
    var klass = function FlightLog() {
      this.events = []
    }

    klass.prototype.logShipTelemetry = function(ship, t, msg) {
      this.execute('log', msg + ' : ' + shipMessage(ship, t))
    }

    klass.prototype.log = function(msg) {
      this.events.push(msg)
    }

    klass.prototype.log_append = function(msg) {
      this.events.push(msg)
    }

    klass.prototype.dump = function() {
      var result = ''
      for (var i = this.events.length; i--; ) {
        result += this.events[i] + '\n'
      }
      return result
    }

    klass.prototype.getLatestMessage = function() {
      if (this.events.length === 0) return ''

      return this.events[this.events.length - 1]
    }

    function shipMessage(ship, t) {
      return timestamp(ship, t) + ' - ' + shipTelemetry(ship, t)
    }

    function timestamp(ship, t) {
      return '[(MET: ' + t + ') (t+' + ship.getMissionTime(t) + '): ' + ship.name + ']'
    }

    function shipTelemetry(ship, t) {
      return '(' + ship.getParent().name + ', ' + ship.getRadius() + ', ' + ship.getVelocity() + ', { r: ' + ship.getDistanceFromParent(t) + ', phi: ' + ship.pos.phi + ' }, ' + ship.getCartesianAngle(t) + ', ' + ship.getHeading(t) + ', ' + ship.isHeadingAbsolute() + ')'
    }

    makeObservable.bind(this)(klass)

    return klass
  })()
})(FlightPlanner.Util, FlightPlanner.Helper, FlightPlanner.Helper.makeObservable)
