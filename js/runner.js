window.FlightStatus = (function($) {
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
      .append(this.makeTitle('Distance from Kerbin'))
      .append(this.getPanelFor('kerbin_distance'))
      .append(this.makeTitle('Distance from Duna'))
      .append(this.getPanelFor('duna_distance'))
      .append(this.makeTitle('Velocity'))
      .append(this.getPanelFor('vel'))
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

    this.updateStat('launch_date', ship.getLaunchTime())
    this.updateStat('mission_time', ship.getMissionTime(t))
    this.updateStat('kerbin_distance', window.CelestialObject.calcObjectDistance(ship, this.sim.getPlanet('Kerbin')))
    this.updateStat('duna_distance', window.CelestialObject.calcObjectDistance(ship, this.sim.getPlanet('Duna')))
    this.updateStat('vel', ship.getVelocity())
    this.updateStat('prograde', ship.getPrograde())
    this.updateStat('heading', ship.getHeading())
    this.updateStat('message', this.getMessage())

    this.last_run = now
  }

  klass.prototype.makeTitle = function(title) {
    return $('<dt>').html(title)
  }

  klass.prototype.updateStat = function(panel_id, stat) {
    this.getPanelFor(panel_id).html(stat.toString())
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
})(jQuery)

var sun       = new window.Sun(1.1723328e18, 2.616e8),
    kerbin    = new window.Planet('Kerbin', sun, 6e5,   '#7777FF', 3.5316e12,    9284.5, 13599840256, { r: 13599840256, phi: -Math.PI }, 0,    Math.PI / 2, 8.4159286e7),
    duna      = new window.Planet('Duna',   sun, 3.2e5, '#FF3333', 3.0136321e11, 7915,   20726155264, { r: 19669121365, phi: -Math.PI }, 0.05, Math.PI / 2, 4.7921949e7),
    plan      = new window.FlightPlan('ship1', 1.8872e7).scheduleLaunchFromPlanet(
      kerbin,
      sun,
      0.31 * Math.PI,
      {
        throttle:  1,
        max_accel: 0.2,
        target:    duna
      }
    ),
    size      = 2.3e10,
    world     = { width: size, height: size },
    canvas    = { width: 500, height: 500 },
    renderer  = new window.Renderer(document.getElementById('flightplan'), world, canvas),
    t         = 1.88719e7,
    s         = new window.Simulator(t, [sun, duna, kerbin], 100),
    stat      = new window.FlightStatus(s, 3, 'Launching from Kerbin')

$('#status').append(stat.getPanel())
plan.addObserver(stat)
plan.addManeuver(function(t, ship) { return t.greaterThan(1.9069e7) }, Math.PI, 1).done(function(observers) {
  for (var i = observers.length; i--; ) {
    observers[i].setMessage('Decelerating on approach to Duna')
  }
})
plan.addManeuver(function(t, ship) { return ship.getTarget().inSoi(ship) }, 0, 0).done(function(observers) {
  for (var i = observers.length; i--; ) {
    observers[i].setMessage('Near destination; shutting off engines')
  }
})
s.track(kerbin)
renderer.zoomTo(1)
s.registerShipLaunch(plan)
s.run(renderer)

;(function startListeners($, sim, renderer) {
  $('#pause').on(      'click', function() { sim.togglePaused(renderer) })
  $('#zoom_in').on(    'click', renderer.zoomIn.bind(renderer))
  $('#zoom_out').on(   'click', renderer.zoomOut.bind(renderer))
  $('#faster').on(     'click', sim.faster.bind(sim))
  $('#slower').on(     'click', sim.slower.bind(sim))
  $('#prev_target').on('click', sim.trackPrev.bind(sim))
  $('#next_target').on('click', sim.trackNext.bind(sim))
  $(window).on('keyup', function(e) {
    var key = e.keyCode ? e.keyCode : e.which

    if (key === 27 || key === 32) {
      // esc
      sim.togglePaused(renderer)
    } else if (key === 187) {
      // +
      renderer.zoomIn()
    } else if (key === 189) {
      // -
      renderer.zoomOut()
    } else if (key === 190) {
      // >
      sim.faster()
    } else if (key === 188) {
      // <
      sim.slower()
    } else if (key === 221) {
      // [
      sim.trackNext()
    } else if (key === 219) {
      // ]
      sim.trackPrev()
    }
  })
})(jQuery, s, renderer)
