/* global FlightPlanner jQuery */

(function(namespace, $) {
  'use strict'

  namespace.Debugger = (function($) {
    var klass = function Debugger(body_name) {
      this.name = body_name
    }

    klass.prototype.debug = function(sim) {
      for (var i = sim.bodies.length; i--; ) {
        var body = sim.bodies[i]
        if (this.name === body.name) {
          debugData(body.pos.r,   'r')
          debugData(body.pos.phi.times(180).dividedBy('' + Math.PI), 'phi')
          debugData(body.v,       'vel')
          debugData(body.getPrograde().times(180).dividedBy('' + Math.PI), 'prograde')
          debugData(body.getHeading().times(180).dividedBy('' + Math.PI), 'heading')
          var kd = window.CelestialObject.calcObjectDistance(sim.getPlanet('Kerbin'), body),
              dd = window.CelestialObject.calcObjectDistance(sim.getPlanet('Duna'), body)
          debugData(kd, 'kdist')
          debugData(dd, 'ddist')
        }
      }
    }


    function debugData(data, id) {
      $('#' + id).html(data)
    }

    return klass
  })()
})(FlightPlanner.Helper, jQuery)
