/* global FlightPlanner jQuery */
(function(namespace, helpers, $) {
  'use strict'

  namespace.FlightStatus = (function() {
    var klass = function FlightStatus(sim, refresh_interval, initial_message) {
      this.sim              = sim
      this.refresh_interval = refresh_interval * 1000
      this.setMessage(initial_message)
      this.panels           = {}
      this.panel            = this.initPanel()
      this.last_run = new Date()
    }

    klass.prototype.getPanel = function() {
      return this.panel
    }

    klass.prototype.initPanel = function() {
      return $('<dl>')
        .append(this.makeTitle('Launch Date'))
        .append(this.getPanelFor('launch_date'))
        .append(this.makeTitle('T+'))
        .append(this.getPanelFor('mission_time'))
        .append(this.makeTitle('Status'))
        .append(this.getPanelFor('message'))
        .append(this.makeTitle('Velocity'))
        .append(this.getPanelFor('vel'))
        .append(this.makeTitle('Throttle'))
        .append(this.getPanelFor('throttle'))
        .append(this.makeTitle('Fuel Consumed'))
        .append(this.getPanelFor('fuel'))
        .append(this.makeTitle('Altitude'))
        .append(this.getPanelFor('r'))
        .append(this.makeTitle('Phi'))
        .append(this.getPanelFor('phi'))
        .append(this.makeTitle('Ap'))
        .append(this.getPanelFor('ap'))
        .append(this.makeTitle('Pe'))
        .append(this.getPanelFor('pe'))
        .append(this.makeTitle('Eccentricity'))
        .append(this.getPanelFor('ecc'))
        .append(this.makeTitle('Zenith angle'))
        .append(this.getPanelFor('gamma'))
        .append(this.makeTitle('Flight path angle'))
        .append(this.getPanelFor('flight_path'))
        .append(this.makeTitle('True Anomaly'))
        .append(this.getPanelFor('true_anom'))
        .append(this.makeTitle('Prograde'))
        .append(this.getPanelFor('prograde'))
        .append(this.makeTitle('Heading'))
        .append(this.getPanelFor('heading'))
        .append(this.makeTitle('Phase Angle'))
        .append(this.getPanelFor('phase'))
    }

    klass.prototype.updateStatus = function(t, ship) {
      var now = new Date()
      if (now - this.last_run < this.refresh_interval) return

      this.updateStat('launch_date', helpers.convertTimeToDate(ship.getLaunchTime()), ship.getLaunchTime())
      this.updateStat('mission_time', helpers.convertTimeToDate(ship.getMissionTime(t)), ship.getMissionTime(t))
      this.updateStat('soi', ship.getParent().name)
      this.updateStat('kerbin_distance', helpers.calcObjectDistance(ship, this.sim.getBody('Kerbin'), t).dividedBy(1000).round() + 'km')
      this.updateStat('duna_distance', helpers.calcObjectDistance(ship, this.sim.getBody('Duna'), t).dividedBy(1000).round() + 'km')
      this.updateStat('vel', helpers.roundTo(ship.getVelocity(), 1) + 'm/s')
      this.updateStat('throttle', helpers.roundTo(new Decimal(ship.getThrottle()), 1))
      this.updateStat('fuel', helpers.roundTo(new Decimal(ship.getConsumedFuel()), 1) + 'kg')
      this.updateStat('prograde', helpers.radianToDegrees(ship.getCartesianPrograde()).round())
      this.updateStat('r', ship.getDistanceFromParent(t).round().dividedBy(1000) + 'km')
      this.updateStat('phi', helpers.radianToDegrees(ship.getCartesianAngle()).round())
      this.updateStat('heading', helpers.radianToDegrees(ship.getHeading(t)).round() + ' (' + (ship.use_absolute_heading ? 'abs' : 'rel') + ')')
      this.updateStat('message', this.getMessage())
      this.updateStat('ap', ship.getApoapsis().round().dividedBy(1000) + 'km')
      this.updateStat('pe', ship.getPeriapsis().round().dividedBy(1000) + 'km')
      this.updateStat('gamma', helpers.radianToDegrees(ship.getZenithAngle()).round())
      this.updateStat('true_anom', helpers.radianToDegrees(ship.getTrueAnomaly(t)).round())
      this.updateStat('flight_path', helpers.radianToDegrees(ship.getFlightPathAngle(t)).round())
      this.updateStat('ecc', helpers.roundTo(ship.getEccentricity(), 4))
      if (ship.getTarget()) {
        this.updateStat('phase', helpers.roundTo(helpers.radianToDegrees(ship.getPhaseAngle(ship.getTarget(), t)), 2) + ' (' + ship.getTarget().name + ')')
      }

      this.last_run = now
    }

    klass.prototype.makeTitle = function(title) {
      return $('<dt>').html(title)
    }

    klass.prototype.updateStat = function(panel_id, stat, title) {
      this.getPanelFor(panel_id).html('' + stat)
      this.getPanelFor(panel_id).prop('title', title)
    }

    klass.prototype.getPanelFor = function(panel_id) {
      if (!this.panels[panel_id]) this.panels[panel_id] = this.makeDefinition()

      return this.panels[panel_id]
    }

    klass.prototype.getMissionTimePanel = function() {
    }

    klass.prototype.makeDefinition = function() {
      return $('<dd>')
    }

    klass.prototype.setMessage = function(message) {
      this.message = message
    }

    klass.prototype.getMessage = function() {
      return this.message
    }

    return klass
  })()
})(FlightPlanner.View, FlightPlanner.Helper.Helper, jQuery)
