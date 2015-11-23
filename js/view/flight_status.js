/* global FlightPlanner */
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
        .append(this.makeTitle('SOI'))
        .append(this.getPanelFor('soi'))
        .append(this.makeTitle('Distance from Kerbin'))
        .append(this.getPanelFor('kerbin_distance'))
        .append(this.makeTitle('Distance from Duna'))
        .append(this.getPanelFor('duna_distance'))
        .append(this.makeTitle('Velocity'))
        .append(this.getPanelFor('vel'))
        .append(this.makeTitle('Throttle'))
        .append(this.getPanelFor('throttle'))
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
        .append(this.makeTitle('Prograde'))
        .append(this.getPanelFor('prograde'))
        .append(this.makeTitle('Heading'))
        .append(this.getPanelFor('heading'))
        .append(this.makeTitle('Status'))
        .append(this.getPanelFor('message'))
    }

    klass.prototype.updateStatus = function(t, ship) {
      var now = new Date()
      if (now - this.last_run < this.refresh_interval) return

      this.updateStat('launch_date', helpers.convertTimeToDate(ship.getLaunchTime()), ship.getLaunchTime())
      this.updateStat('mission_time', helpers.convertTimeToDate(ship.getMissionTime(t)), ship.getMissionTime(t))
      this.updateStat('soi', ship.getParent().name)
      this.updateStat('kerbin_distance', helpers.calcObjectDistance(ship, this.sim.getPlanet('Kerbin')).dividedBy(1000).round() + 'km')
      this.updateStat('duna_distance', helpers.calcObjectDistance(ship, this.sim.getPlanet('Duna')).dividedBy(1000).round() + 'km')
      this.updateStat('vel', helpers.roundTo(ship.getVelocity(), 1) + 'm/s')
      this.updateStat('throttle', helpers.roundTo(new Decimal(ship.getThrottle()), 1))
      this.updateStat('prograde', helpers.radianToDegrees(ship.getPrograde()).round())
      this.updateStat('r', ship.pos.r.round().dividedBy(1000) + 'km')
      this.updateStat('phi', helpers.radianToDegrees(ship.pos.phi).round())
      this.updateStat('heading', helpers.radianToDegrees(ship.heading).round() + ' (' + (ship.use_absolute_heading ? 'abs' : 'rel') + ')')
      this.updateStat('message', this.getMessage())
      var params = ship.calcOrbitalParams()
      this.updateStat('ap', params.ap.round().dividedBy(1000) + 'km')
      this.updateStat('pe', params.pe.round().dividedBy(1000) + 'km')
      this.updateStat('gamma', '' + helpers.radianToDegrees(ship.pos.phi.minus(ship.getPrograde())).round())
      this.updateStat('ecc', helpers.roundTo(ship.getEccentricity(), 4))

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
